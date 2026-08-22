const content = `
## Módulo 8 — Proyecto real: arquitectura de proxy inverso completa para producción

### 🎯 Objetivos de aprendizaje

* Integrar todos los conceptos del nivel en una configuración de producción.
* Construir una arquitectura con tres backends, caché, WebSocket y SSL.
* Depurar problemas comunes de proxy inverso.
* Verificar el funcionamiento con herramientas de diagnóstico.

### ❓ El problema real

Es hora de construir la configuración completa. La arquitectura objetivo: tres instancias de una API Node.js, nginx como proxy inverso con SSL, caché para endpoints de solo lectura, soporte WebSocket para notificaciones, y headers de seguridad correctos. Esta es la configuración que usarías en producción real.

### 📖 Estructura del proyecto (arquitectura objetivo)

\`\`\`diagram
{"type":"tree","root":{"name":"nginx","meta":"HTTPS :443 · SSL termination, cache, headers, rate limiting","icon":"gateway","focal":true},"children":[{"name":"backend1:3001","meta":"Node.js API","edgeLabel":"HTTP interno","icon":"server"},{"name":"backend2:3002","meta":"Node.js API","icon":"server"},{"name":"backend3:3003","meta":"Node.js API — backup","icon":"server","standby":true}]}
\`\`\`

### 📖 Paso 1: Preparar la estructura de directorios

\`\`\`bash
sudo mkdir -p /etc/nginx/{conf.d,sites-available,sites-enabled,certs}
sudo mkdir -p /var/cache/nginx
sudo mkdir -p /var/www/errores

# Página de error personalizada
sudo tee /var/www/errores/503.html << 'EOF'
<!DOCTYPE html>
<html>
<body>
  <h1>Servicio temporalmente no disponible</h1>
  <p>Estamos trabajando en ello. Inténtalo de nuevo en unos minutos.</p>
</body>
</html>
EOF
\`\`\`

### 📖 Paso 2: Configuración de nginx.conf principal

\`\`\`nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging con información de caché y upstream
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" cache=\$upstream_cache_status '
                    'upstream=\$upstream_addr time=\$upstream_response_time';

    access_log /var/log/nginx/access.log main;

    # Optimizaciones
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    server_tokens off;

    # Zona de caché de proxy
    proxy_cache_path /var/cache/nginx
        levels=1:2
        keys_zone=api_cache:20m
        max_size=2g
        inactive=30m
        use_temp_path=off;

    # Módulo real_ip para obtener IP real del cliente
    real_ip_header    X-Forwarded-For;
    real_ip_recursive on;
    set_real_ip_from  10.0.0.0/8;

    # Map para WebSocket
    map \$http_upgrade \$connection_upgrade {
        default upgrade;
        ''      close;
    }

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
\`\`\`

### 📖 Paso 3: Upstream y virtual host

\`\`\`nginx
# /etc/nginx/conf.d/upstream.conf
upstream api_backends {
    least_conn;

    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3003 backup;

    keepalive 32;
}
\`\`\`

\`\`\`nginx
# /etc/nginx/sites-available/mi-api
server {
    listen 80;
    server_name api.ejemplo.com;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name api.ejemplo.com;
    http2 on;

    ssl_certificate     /etc/letsencrypt/live/api.ejemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.ejemplo.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Headers de seguridad globales
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Errores cuando todos los backends caen
    error_page 502 503 504 /503.html;
    location = /503.html { root /var/www/errores; internal; }

    # ── API endpoints (con caché) ─────────────────────────────────────
    location /api/v1/productos {
        proxy_pass http://api_backends;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_cache            api_cache;
        proxy_cache_key        "\$request_method\$host\$request_uri";
        proxy_cache_valid      200 5m;
        proxy_cache_use_stale  error timeout http_502 http_503;
        proxy_cache_lock       on;
        add_header             X-Cache-Status \$upstream_cache_status;

        proxy_next_upstream error timeout http_502 http_503;
    }

    # ── WebSocket ─────────────────────────────────────────────────────
    location /ws {
        proxy_pass http://api_backends;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host       \$host;
        proxy_set_header X-Real-IP  \$remote_addr;

        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
        proxy_cache         off;
    }

    # ── API general (sin caché) ───────────────────────────────────────
    location /api/ {
        proxy_pass http://api_backends;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Internal-Token  "";

        proxy_next_upstream    error timeout http_502 http_503;
        proxy_connect_timeout  5s;
        proxy_read_timeout     30s;
    }
}
\`\`\`

### 📖 Paso 4: Activar y verificar

\`\`\`bash
# Activar el sitio
sudo ln -s /etc/nginx/sites-available/mi-api /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Aplicar cambios
sudo systemctl reload nginx

# Verificar caché
curl -I https://api.ejemplo.com/api/v1/productos
# Buscar: X-Cache-Status: MISS (primera vez)
curl -I https://api.ejemplo.com/api/v1/productos
# Buscar: X-Cache-Status: HIT (segunda vez)

# Verificar WebSocket
wscat -c wss://api.ejemplo.com/ws

# Verificar headers de seguridad
curl -I https://api.ejemplo.com/api/ | grep -i "strict\|frame\|cache"

# Ver logs en tiempo real
sudo tail -f /var/log/nginx/access.log
\`\`\`

### 📋 Lo que debes recordar

* El orden de los \`location\` importa: los más específicos deben ir antes de los más generales.
* \`proxy_http_version 1.1\` y \`proxy_set_header Connection ""\` son necesarios para \`keepalive\` en upstream.
* Separar endpoints cacheables de los no cacheables en \`location\` bloques distintos da control granular.
* El log format con \`\$upstream_cache_status\` y \`\$upstream_response_time\` es imprescindible para depurar rendimiento.

### 🧪 Autoevaluación

1. ¿Por qué el \`location /api/v1/productos\` debe ir ANTES de \`location /api/\` en la configuración?
2. ¿Qué pasaría si se omite \`proxy_cache off\` en el \`location /ws\`?
3. ¿Cómo verificarías que el failover al servidor backup está funcionando correctamente?

---

1. nginx usa el prefijo más largo que coincida con la URL. \`/api/v1/productos\` es más específico que \`/api/\` — si se pusiera después, cuando llegue una petición a \`/api/v1/productos\`, nginx ya habría encontrado la coincidencia con \`/api/\` y usaría esa configuración (sin caché). Los \`location\` de prefijo más largo tienen prioridad independientemente del orden, pero en la práctica es buena práctica ordenarlos de más específico a más general para que la configuración sea legible y predecible.
2. nginx intentaría cachear las respuestas WebSocket. En el mejor caso fallaría silenciosamente porque una respuesta de upgrade no es un contenido HTTP estático. En el peor caso, podría cachear el handshake inicial (HTTP 101) y servírselo a otros clientes, corrompiendo el protocolo WebSocket para ellos. Siempre deshabilitar caché explícitamente en endpoints WebSocket y SSE.
3. Detener los dos backends primarios (\`kill\` el proceso o \`systemctl stop\`) y hacer peticiones a la API. Verificar en el log de nginx que \`upstream_addr\` apunta al backend de backup (puerto 3003). También se puede ver en el log de errores que nginx detectó los fallos de los backends primarios. Luego reiniciar los backends primarios y verificar que nginx vuelve a usarlos (el backup deja de aparecer en los logs tras el \`fail_timeout\`).
`

export default content
