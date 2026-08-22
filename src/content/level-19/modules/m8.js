const content = `
## Módulo 8 — Proyecto real: servidor web nginx de producción completo

### 🎯 Objetivos de aprendizaje
* Instalar y habilitar nginx como servicio systemd en Ubuntu y Rocky Linux
* Crear tres virtual hosts con propósitos distintos (estático, PHP-FPM, API)
* Configurar HTTPS con certificados autofirmados y redireccionamiento HTTP→HTTPS
* Aplicar compresión gzip, cabeceras de seguridad y logs por dominio
* Validar la configuración completa con pruebas funcionales y de carga

### ❓ El problema real
Tu equipo necesita desplegar tres servicios bajo el mismo servidor:
un sitio estático con assets de larga duración, una aplicación PHP y una API
REST con rate limiting. Cada uno tiene dominios distintos, debe servir HTTPS,
y el equipo de seguridad exige cabeceras HTTP estrictas. Este proyecto
construye esa infraestructura desde cero, paso a paso.

### 📖 Estructura del proyecto

\`\`\`
/etc/nginx/
├── nginx.conf              ← configuración principal
├── conf.d/
│   ├── static.conf         ← static.empresa.com
│   ├── app.conf            ← app.empresa.com (PHP-FPM)
│   └── api.conf            ← api.empresa.com (rate limiting)
├── ssl/                    ← certificados autofirmados
/var/www/{static,app,api}/  ← raíces de cada sitio
/var/log/nginx/             ← logs por dominio
\`\`\`

### 📖 Paso 1 — Instalación y servicio systemd

**Ubuntu / Debian:**
\`\`\`bash
sudo apt update && sudo apt install -y nginx
sudo systemctl enable --now nginx
sudo systemctl status nginx
\`\`\`

**Rocky Linux / AlmaLinux / RHEL:**
\`\`\`bash
sudo dnf install -y nginx
sudo systemctl enable --now nginx
sudo firewall-cmd --permanent --add-service=http --add-service=https
sudo firewall-cmd --reload
\`\`\`

**Verificar instalación:**
\`\`\`bash
nginx -v                    # versión instalada
sudo nginx -t               # test de configuración
curl -I http://localhost    # debe responder 200 con Server: nginx
\`\`\`

**Estructura de directorios que usaremos:**
\`\`\`
/etc/nginx/
├── nginx.conf              ← configuración principal
├── conf.d/                 ← virtual hosts (incluidos desde nginx.conf)
│   ├── static.conf
│   ├── app.conf
│   └── api.conf
/var/www/
├── static/                 ← raíz del sitio estático
├── app/                    ← raíz de la aplicación PHP
└── api/                    ← raíz de la API (si aplica)
/etc/nginx/ssl/             ← certificados autofirmados
/var/log/nginx/             ← logs por dominio
\`\`\`

Crear directorios:
\`\`\`bash
sudo mkdir -p /var/www/{static,app,api}
sudo mkdir -p /etc/nginx/ssl
sudo mkdir -p /var/log/nginx
\`\`\`

### 📖 Paso 2 — Generar certificados autofirmados

\`\`\`bash
# Certificado para static.empresa.com
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
    -keyout /etc/nginx/ssl/static.empresa.com.key \\
    -out    /etc/nginx/ssl/static.empresa.com.crt \\
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Empresa/CN=static.empresa.com"

# Certificado para app.empresa.com
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
    -keyout /etc/nginx/ssl/app.empresa.com.key \\
    -out    /etc/nginx/ssl/app.empresa.com.crt \\
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Empresa/CN=app.empresa.com"

# Certificado para api.empresa.com
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
    -keyout /etc/nginx/ssl/api.empresa.com.key \\
    -out    /etc/nginx/ssl/api.empresa.com.crt \\
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Empresa/CN=api.empresa.com"

# Permisos correctos
sudo chmod 600 /etc/nginx/ssl/*.key
sudo chmod 644 /etc/nginx/ssl/*.crt
\`\`\`

### 📖 Paso 3 — Configuración principal: nginx.conf

\`\`\`nginx
# /etc/nginx/nginx.conf
user nginx;                        # www-data en Ubuntu
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Formato de log estándar
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent"';

    sendfile        on;
    tcp_nopush      on;
    keepalive_timeout 65;
    server_tokens off;             # No exponer versión de nginx

    # ── Compresión gzip ──────────────────────────────────────────
    gzip on;
    gzip_min_length 256;
    gzip_comp_level 5;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;
    gzip_vary on;
    gzip_proxied any;

    # ── Zonas de rate limiting ───────────────────────────────────
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;

    # Incluir virtual hosts
    include /etc/nginx/conf.d/*.conf;
}
\`\`\`

### 📖 Paso 4 — Virtual host 1: static.empresa.com

Sirve contenido estático con caché agresiva y sin índices de directorio.

\`\`\`nginx
# /etc/nginx/conf.d/static.conf

# Redirección HTTP → HTTPS
server {
    listen 80;
    server_name static.empresa.com;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name static.empresa.com;
    root /var/www/static;
    index index.html;

    # Certificado TLS
    ssl_certificate     /etc/nginx/ssl/static.empresa.com.crt;
    ssl_certificate_key /etc/nginx/ssl/static.empresa.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Logs propios de este dominio
    access_log /var/log/nginx/static.access.log main;
    error_log  /var/log/nginx/static.error.log warn;

    # Cabeceras de seguridad
    add_header X-Frame-Options "SAMEORIGIN"           always;
    add_header X-Content-Type-Options "nosniff"       always;
    add_header X-XSS-Protection "1; mode=block"       always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Sin índices de directorio
    autoindex off;

    # Assets estáticos: caché de 1 año
    location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;            # No registrar accesos a assets
    }

    # HTML: sin caché (siempre fresco)
    location ~* \\.html\$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Páginas de error personalizadas
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    location = /404.html { root /var/www/static; internal; }
    location = /50x.html { root /var/www/static; internal; }
}
\`\`\`

Crear contenido de prueba:
\`\`\`bash
echo "<h1>Sitio Estático</h1>" | sudo tee /var/www/static/index.html
echo "<h1>404 - No encontrado</h1>" | sudo tee /var/www/static/404.html
echo "<h1>Error del servidor</h1>" | sudo tee /var/www/static/50x.html
\`\`\`

### 📖 Paso 5 — Virtual host 2: app.empresa.com (PHP-FPM)

\`\`\`nginx
# /etc/nginx/conf.d/app.conf

server {
    listen 80;
    server_name app.empresa.com;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name app.empresa.com;
    root /var/www/app;
    index index.php index.html;

    ssl_certificate     /etc/nginx/ssl/app.empresa.com.crt;
    ssl_certificate_key /etc/nginx/ssl/app.empresa.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/app.access.log main;
    error_log  /var/log/nginx/app.error.log warn;

    add_header X-Frame-Options "SAMEORIGIN"           always;
    add_header X-Content-Type-Options "nosniff"       always;
    add_header X-XSS-Protection "1; mode=block"       always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Pasar archivos .php a PHP-FPM
    location ~ \\.php\$ {
        try_files \$uri =404;             # Evitar ejecución de archivos inexistentes
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;

        # Timeouts para PHP
        fastcgi_connect_timeout 5s;
        fastcgi_read_timeout    30s;
        fastcgi_send_timeout    30s;
    }

    # Intentar archivo, directorio o 404
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    # Bloquear acceso a archivos ocultos y sensibles
    location ~ /\\. {
        deny all;
        return 404;
    }
    location ~* \\.(env|log|sh|sql)\$ {
        deny all;
        return 404;
    }

    error_page 404 /404.php;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html { root /usr/share/nginx/html; internal; }
}
\`\`\`

Verificar que PHP-FPM esté activo:
\`\`\`bash
sudo systemctl status php8.1-fpm
ls -la /run/php/php8.1-fpm.sock   # debe existir el socket

# Crear index.php de prueba
echo "<?php phpinfo();" | sudo tee /var/www/app/index.php
\`\`\`

### 📖 Paso 6 — Virtual host 3: api.empresa.com (Rate-limited API)

\`\`\`nginx
# /etc/nginx/conf.d/api.conf

server {
    listen 80;
    server_name api.empresa.com;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name api.empresa.com;

    ssl_certificate     /etc/nginx/ssl/api.empresa.com.crt;
    ssl_certificate_key /etc/nginx/ssl/api.empresa.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/api.access.log main;
    error_log  /var/log/nginx/api.error.log warn;

    add_header X-Frame-Options "DENY"                 always;
    add_header X-Content-Type-Options "nosniff"       always;
    add_header X-XSS-Protection "1; mode=block"       always;
    add_header Referrer-Policy "no-referrer"          always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Cabecera informativa de rate limiting
    add_header X-RateLimit-Policy "30r/s burst=60" always;

    location / {
        # Rate limiting: 30 req/s, burst de 60, procesamiento inmediato
        limit_req zone=api burst=60 nodelay;
        limit_req_status 429;
        limit_req_log_level warn;

        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;

        # Timeouts del proxy
        proxy_connect_timeout 5s;
        proxy_read_timeout    30s;
        proxy_send_timeout    30s;
    }

    # Endpoint de salud: sin rate limiting
    location /health {
        access_log off;
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }

    error_page 429 /429.json;
    location = /429.json {
        internal;
        return 429 '{"error":"Too Many Requests","retry_after":1}';
        add_header Content-Type application/json always;
    }
    error_page 502 503 504 /50x.json;
    location = /50x.json {
        internal;
        return 503 '{"error":"Service Unavailable"}';
        add_header Content-Type application/json always;
    }
}
\`\`\`

### 📖 Paso 7 — Validación y recarga

\`\`\`bash
# 1. Test de sintaxis (siempre antes de recargar)
sudo nginx -t

# Salida esperada:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# 2. Recargar sin cortar conexiones activas
sudo systemctl reload nginx

# 3. Verificar que los tres virtual hosts responden
curl -Ik https://static.empresa.com
curl -Ik https://app.empresa.com
curl -Ik https://api.empresa.com/health

# La bandera -k acepta certificados autofirmados
# La bandera -I muestra solo cabeceras
\`\`\`

Mapear los dominios en /etc/hosts para pruebas locales:
\`\`\`bash
echo "127.0.0.1 static.empresa.com app.empresa.com api.empresa.com" \\
    | sudo tee -a /etc/hosts
\`\`\`

### 📖 Paso 8 — Verificar redirección HTTP→HTTPS

\`\`\`bash
# Debe responder 301 y Location: https://...
curl -I http://static.empresa.com
# HTTP/1.1 301 Moved Permanently
# Location: https://static.empresa.com/

curl -I http://app.empresa.com
# HTTP/1.1 301 Moved Permanently

curl -I http://api.empresa.com
# HTTP/1.1 301 Moved Permanently
\`\`\`

### 📖 Paso 9 — Verificar gzip y cabeceras de seguridad

\`\`\`bash
# Verificar compresión gzip
curl -H "Accept-Encoding: gzip" -Ik https://static.empresa.com/ \\
    | grep -i "content-encoding"
# Content-Encoding: gzip

# Verificar cabeceras de seguridad
curl -Ik https://static.empresa.com/ | grep -E "X-Frame|X-Content|X-XSS|Referrer|Strict"
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Strict-Transport-Security: max-age=31536000; includeSubDomains

# Verificar que server_tokens off funciona
curl -Ik https://static.empresa.com/ | grep Server
# Server: nginx   ← sin versión expuesta
\`\`\`

### 📖 Paso 10 — Verificar rate limiting en la API

\`\`\`bash
# Disparar 20 solicitudes rápidas y ver los códigos HTTP
for i in \$(seq 1 20); do
    code=\$(curl -sk -o /dev/null -w "%{http_code}" https://api.empresa.com/endpoint)
    echo "Solicitud \$i: \$code"
done

# Las primeras ~61 (60 burst + 1 tasa) deben ser 200 o 502 (backend no existe)
# Las que superen el burst deben recibir 429

# Verificar en log de errores
sudo tail -20 /var/log/nginx/api.error.log | grep limit
# [warn] ... limiting requests, excess: X.XXX by zone "api"
\`\`\`

### 📖 Diagnóstico rápido de problemas comunes

\`\`\`bash
# nginx no inicia: revisar sintaxis y puerto en uso
sudo nginx -t
sudo ss -tlnp | grep :80
sudo ss -tlnp | grep :443

# Ver logs de error en tiempo real
sudo journalctl -fu nginx
sudo tail -f /var/log/nginx/error.log

# Permisos de archivos web (nginx no puede leer el contenido)
ls -la /var/www/static/
sudo chown -R nginx:nginx /var/www/   # Rocky/AlmaLinux
sudo chown -R www-data:www-data /var/www/  # Ubuntu

# Socket de PHP-FPM no existe
sudo systemctl start php8.1-fpm
ls /run/php/

# SELinux bloqueando nginx (Rocky/RHEL)
sudo setsebool -P httpd_can_network_connect 1
sudo restorecon -Rv /var/www/
\`\`\`

### 📋 Lo que debes recordar
* Siempre ejecuta \`sudo nginx -t\` antes de \`systemctl reload nginx\`
* El bloque de redirección 301 va en un \`server\` separado que escucha en puerto 80
* \`fastcgi_param SCRIPT_FILENAME\` es obligatorio para que PHP-FPM encuentre el archivo
* \`server_tokens off\` oculta la versión de nginx en la cabecera \`Server\`
* Los logs por dominio facilitan el diagnóstico cuando hay múltiples virtual hosts
* En Rocky/RHEL, SELinux puede bloquear conexiones de red del worker de nginx

### 🧪 Autoevaluación
1. ¿Por qué se necesita \`try_files \$uri =404\` en el bloque \`location ~ \\.php\$\`? ¿Qué vulnerabilidad previene?
2. El endpoint \`/health\` en api.empresa.com está fuera del bloque que aplica \`limit_req\`. ¿Qué ocurriría si estuviera dentro, y por qué es mejor fuera?
3. ¿Por qué \`systemctl reload nginx\` es preferible a \`systemctl restart nginx\` en producción?

---

1. Sin \`try_files \$uri =404\`, nginx podría pasar a PHP-FPM rutas que no corresponden a archivos reales en disco. Esto permite el ataque de ejecución de PHP arbitrario: si se sube un archivo con código PHP con extensión de imagen y nginx lo pasa a PHP-FPM, se ejecuta. \`try_files\` verifica que el archivo exista antes de pasarlo al backend.
2. Si \`/health\` estuviera dentro del bloque con \`limit_req\`, los sistemas de monitoreo que consultan el endpoint continuamente consumirían cuota de la zona "api" y podrían recibir 429. Al estar en una \`location\` separada sin \`limit_req\`, el endpoint de salud siempre responde independientemente del tráfico de la API.
3. \`reload\` envía la señal SIGHUP a nginx, que recarga la configuración sin interrumpir las conexiones activas — los workers existentes terminan sus solicitudes en curso antes de cerrarse. \`restart\` detiene y vuelve a iniciar el proceso completo, cortando todas las conexiones activas y causando una breve interrupción del servicio.
`

export default content
