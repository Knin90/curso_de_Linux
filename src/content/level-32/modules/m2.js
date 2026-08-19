const content = `
## Módulo 2 — HAProxy: arquitectura y configuración básica

### 🎯 Objetivos de aprendizaje

* Entender los componentes principales de HAProxy: frontend, backend y listen.
* Instalar y configurar HAProxy para balancear tráfico HTTP/HTTPS.
* Leer y escribir la configuración de HAProxy con criterio.
* Usar la página de estadísticas integrada para inspeccionar el estado del cluster.

### ❓ El problema real

Tienes 3 servidores web corriendo la misma aplicación. Sin un load balancer, necesitas elegir a cuál conectar a los usuarios, o dar los 3 IPs y esperar que el DNS round-robin funcione bien (spoiler: no funciona bien). HAProxy resuelve esto de forma fiable, con health checks, estadísticas detalladas y control preciso sobre cómo se distribuye el tráfico. Es el load balancer más usado en producción Linux.

### 📖 Arquitectura de HAProxy

\`\`\`diagram
{"type":"nested","container":{"title":"HAProxy","meta":"frontend: escucha conexiones entrantes · backend: pool de servidores reales · listen: combinación de ambos (atajo)"},"items":[{"name":"frontend","meta":":80 / :443","icon":"gateway"},{"name":"backend","meta":"web1:8080 · web2:8080 · web3:8080","icon":"server","focal":true}],"external":[{"name":"Cliente","icon":"user","side":"left"}]}
\`\`\`

HAProxy opera en dos modos:
- **TCP mode**: transparente, pasa bytes sin inspeccionar (capa 4)
- **HTTP mode**: entiende HTTP, puede inspeccionar headers, URLs, cookies (capa 7)

### 📖 Instalación

\`\`\`bash
# Debian/Ubuntu
sudo apt update && sudo apt install haproxy -y
haproxy -v
# HAProxy version 2.8.x

# RHEL/Rocky/AlmaLinux
sudo dnf install haproxy -y

# Verificar que está corriendo
sudo systemctl status haproxy
sudo systemctl enable haproxy
\`\`\`

### 📖 Estructura del archivo de configuración

\`\`\`text
/etc/haproxy/haproxy.cfg — archivo principal

SECCIONES:
  global    — parámetros del proceso (logging, usuario, límites)
  defaults  — valores por defecto para todos los frontends/backends
  frontend  — puntos de entrada (uno o más)
  backend   — pools de servidores (uno o más)
  listen    — combinación frontend+backend (atajos)
\`\`\`

### 📖 Configuración básica completa

\`\`\`text
# /etc/haproxy/haproxy.cfg

global
    log         /dev/log local0
    log         /dev/log local1 notice
    chroot      /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user        haproxy
    group       haproxy
    daemon

    # SSL/TLS
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5s
    timeout client  50s
    timeout server  50s
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 503 /etc/haproxy/errors/503.http

#─── Frontend HTTP ─────────────────────────────────────────────
frontend http_front
    bind *:80
    # Redirigir HTTP → HTTPS
    redirect scheme https code 301 if !{ ssl_fc }

#─── Frontend HTTPS ────────────────────────────────────────────
frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/mi-app.pem
    default_backend web_servers

    # Añadir header X-Forwarded-For para que los backends vean la IP real
    option forwardfor
    http-request set-header X-Forwarded-Proto https

#─── Backend ───────────────────────────────────────────────────
backend web_servers
    balance roundrobin
    option httpchk GET /health HTTP/1.1\\r\\nHost:\\ mi-app.com

    server web1 10.0.1.11:8080 check inter 2s rise 2 fall 3
    server web2 10.0.1.12:8080 check inter 2s rise 2 fall 3
    server web3 10.0.1.13:8080 check inter 2s rise 2 fall 3

#─── Página de estadísticas ────────────────────────────────────
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats realm HAProxy\\ Statistics
    stats auth admin:password_seguro
    stats refresh 5s
    stats show-legends
    stats show-node
\`\`\`

### 📖 Validar y recargar la configuración

\`\`\`bash
# Siempre validar ANTES de recargar
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
# Configuration file is valid

# Recargar sin cortar conexiones activas (graceful reload)
sudo systemctl reload haproxy

# Ver el estado
sudo systemctl status haproxy

# Socket de administración — comandos en caliente
echo "show info" | sudo socat stdio /run/haproxy/admin.sock
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock
echo "show servers state" | sudo socat stdio /run/haproxy/admin.sock
\`\`\`

### 📖 Certificado SSL combinado (PEM)

HAProxy requiere el certificado y la clave privada en un único archivo PEM:

\`\`\`bash
# Combinar certificado + clave en un solo archivo
sudo cat /etc/ssl/certs/mi-app.crt /etc/ssl/private/mi-app.key \
  > /etc/haproxy/certs/mi-app.pem
sudo chmod 600 /etc/haproxy/certs/mi-app.pem

# Con Let's Encrypt (certbot)
sudo cat /etc/letsencrypt/live/mi-app.com/fullchain.pem \
         /etc/letsencrypt/live/mi-app.com/privkey.pem \
  > /etc/haproxy/certs/mi-app.pem
\`\`\`

### 📋 Lo que debes recordar

* HAProxy se configura en 4 secciones: \`global\`, \`defaults\`, \`frontend\`, \`backend\`.
* Siempre validar con \`haproxy -c -f\` antes de recargar para evitar interrupciones de servicio.
* \`systemctl reload haproxy\` hace un graceful reload — no corta conexiones activas.
* La página de stats en \`/stats\` es invaluable para depurar problemas en producción.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre el modo TCP y el modo HTTP en HAProxy?
2. ¿Por qué es necesario usar \`systemctl reload\` en lugar de \`restart\` en producción?
3. ¿Qué hace la opción \`forwardfor\` y por qué es importante para los backends?

---

1. En modo TCP (capa 4), HAProxy reenvía los bytes sin inspeccionarlos — útil para cualquier protocolo (MySQL, Redis, etc.) pero sin capacidad de tomar decisiones basadas en el contenido HTTP. En modo HTTP (capa 7), HAProxy entiende el protocolo HTTP completo: puede leer headers, URLs y cookies, lo que permite balanceo más inteligente, manipulación de headers, y ACLs basadas en el contenido.
2. \`restart\` mata el proceso HAProxy y lo reinicia, cortando todas las conexiones activas en ese momento. \`reload\` realiza un "graceful reload": el proceso nuevo empieza a aceptar conexiones mientras el proceso viejo termina de servir las conexiones existentes. En producción con usuarios activos, \`restart\` causa downtime; \`reload\` es transparente.
3. \`option forwardfor\` añade el header \`X-Forwarded-For\` con la IP real del cliente a cada petición que HAProxy reenvía al backend. Sin esta opción, los servidores backend solo verían la IP de HAProxy como origen, perdiendo la IP real del usuario — crítico para logging, geolocalización, rate limiting y seguridad.
`

export default content
