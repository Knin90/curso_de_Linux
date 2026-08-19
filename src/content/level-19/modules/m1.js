const content = `
## Módulo 1 — Arquitectura nginx: master/worker, event loop y configuración base

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura master/worker de nginx y por qué escala mejor que Apache prefork.
* Comprender el event loop basado en epoll y su impacto en el rendimiento bajo concurrencia alta.
* Leer e interpretar la estructura de nginx.conf (bloques main, events, http, server, location).
* Usar \`nginx -t\`, \`nginx -s reload\` y el unit de systemd correctamente.

### ❓ El problema real

Tienes un servidor con 4 CPUs y 8 GB de RAM sirviendo un sitio de alto tráfico. Con Apache en modo prefork, a 500 conexiones simultáneas el servidor empieza a sudar: cada conexión ocupa un proceso, la memoria se agota, el swap entra en acción. Cambias a nginx y el mismo hardware maneja 10.000 conexiones simultáneas con uso de memoria estable. ¿Por qué? La arquitectura lo explica todo.

### 📖 Arquitectura master/worker

nginx corre con un proceso **master** y uno o más procesos **worker**. Esta separación es fundamental:

\`\`\`diagram
{"type":"tree","root":{"name":"Proceso Master","meta":"root · lee config, gestiona workers y señales","icon":"server"},"children":[{"name":"Worker 1","meta":"www-data · epoll","icon":"chip","edgeLabel":"fork()"},{"name":"Worker 2","meta":"www-data · epoll","icon":"chip"},{"name":"Worker 3","meta":"www-data · epoll","icon":"chip"},{"name":"Worker N","meta":"= nproc por defecto","icon":"chip"}]}
\`\`\`

El master no toca el tráfico: solo gestiona workers. Si un worker falla, el master lo reinicia. Los workers corren con usuario sin privilegios (típicamente \`www-data\` o \`nginx\`), lo que limita el impacto de una vulnerabilidad.

### 📖 El event loop y epoll

Cada worker usa un único hilo con un **event loop** que puede manejar miles de conexiones simultáneas. En Linux, nginx usa **epoll** como mecanismo de notificación de I/O:

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Apache (prefork)","icon":"server","rows":["1 proceso = 1 conexión","500 conexiones → 500 procesos","~500 MB solo en overhead de proceso"]},{"title":"nginx (event-driven)","icon":"chip","focal":true,"rows":["1 worker = N conexiones (miles)","500 conexiones → 4 workers","~4 MB de overhead de proceso","espera I/O sin bloquearse (epoll_wait)"]}]}
\`\`\`

El worker hace \`epoll_wait()\` para saber qué sockets tienen datos listos. Cuando llegan datos, procesa esa conexión, emite la respuesta, y vuelve al loop. Nunca bloquea esperando a que lleguen datos en una conexión específica.

\`\`\`bash
# Verificar que nginx usa epoll
strace -p $(pgrep -f 'nginx: worker') -e trace=epoll_wait 2>&1 | head -5
\`\`\`

### 📖 Estructura de nginx.conf

nginx.conf organiza la configuración en contextos jerárquicos. Cada directiva pertenece a exactamente un contexto:

\`\`\`nginx
# /etc/nginx/nginx.conf

# ── Contexto MAIN ──────────────────────────────────────────────
user www-data;
worker_processes auto;          # auto = número de CPUs
worker_rlimit_nofile 65535;     # límite de file descriptors por worker
pid /run/nginx.pid;
error_log /var/log/nginx/error.log warn;

# ── Contexto EVENTS ────────────────────────────────────────────
events {
    worker_connections 1024;    # conexiones simultáneas por worker
    use epoll;                  # Linux: epoll (default auto-detectado)
    multi_accept on;            # aceptar múltiples conexiones por evento
}

# ── Contexto HTTP ───────────────────────────────────────────────
http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Formato de log
    log_format main '\$remote_addr - \$remote_user [\$time_local] '
                    '"\$request" \$status \$body_bytes_sent '
                    '"\$http_referer" "\$http_user_agent"';

    access_log /var/log/nginx/access.log main;
    error_log  /var/log/nginx/error.log warn;

    sendfile    on;
    tcp_nopush  on;
    keepalive_timeout 65;

    # ── Contexto SERVER (virtual host) ─────────────────────────
    server {
        listen 80;
        server_name ejemplo.com www.ejemplo.com;
        root /var/www/ejemplo;

        # ── Contexto LOCATION ──────────────────────────────────
        location / {
            index index.html;
        }
    }

    # Incluir configs adicionales
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
\`\`\`

### 📖 Directivas clave del contexto main y events

\`\`\`nginx
# worker_processes: cuántos workers lanzar
worker_processes auto;       # recomendado: igual al número de CPUs
worker_processes 4;          # explícito

# worker_connections: conexiones simultáneas por worker
# Conexiones totales máximas = worker_processes × worker_connections
events {
    worker_connections 1024;
}
# Con 4 workers × 1024 = 4096 conexiones totales máximas

# worker_rlimit_nofile: file descriptors por worker
# Debe ser >= worker_connections * 2 (cada conexión usa 2 FDs)
worker_rlimit_nofile 4096;

# pid: dónde guarda el PID del master
pid /run/nginx.pid;

# error_log: nivel puede ser debug, info, notice, warn, error, crit
error_log /var/log/nginx/error.log warn;
\`\`\`

### 📖 La directiva include

\`include\` permite dividir la configuración en archivos separados. nginx la resuelve antes de parsear, como si copiara el contenido del archivo incluido:

\`\`\`nginx
# Incluir un archivo específico
include /etc/nginx/mime.types;

# Incluir múltiples archivos con glob
include /etc/nginx/conf.d/*.conf;
include /etc/nginx/sites-enabled/*;
\`\`\`

\`\`\`bash
# Estructura típica en Debian/Ubuntu
/etc/nginx/
├── nginx.conf              # configuración principal
├── mime.types              # mapping extensión → Content-Type
├── conf.d/                 # configs globales (upstream, maps, etc.)
│   └── gzip.conf
├── sites-available/        # configs de virtual hosts (deshabilitados o no)
│   ├── ejemplo.com
│   └── default
└── sites-enabled/          # symlinks a sites-available/
    └── ejemplo.com -> ../sites-available/ejemplo.com
\`\`\`

### 📖 Gestión del proceso: nginx -t, reload, stop

\`\`\`bash
# Validar la configuración sin recargar (SIEMPRE hacer esto antes de reload)
nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Validar y mostrar la config completa tal como nginx la ve
nginx -T

# Señales al proceso master via nginx -s
nginx -s reload    # recarga config sin cortar conexiones activas
nginx -s stop      # para inmediatamente (SIGTERM)
nginx -s quit      # espera a que terminen las conexiones activas (SIGQUIT)
nginx -s reopen    # reabre los archivos de log (útil con logrotate)

# Equivalentes via systemd (preferido en sistemas modernos)
systemctl reload nginx      # equivalente a nginx -s reload
systemctl stop nginx
systemctl restart nginx     # stop + start (corta conexiones)
systemctl status nginx

# Ver el PID del master
cat /run/nginx.pid

# Enviar señal directamente
kill -HUP $(cat /run/nginx.pid)    # equivale a reload
kill -QUIT $(cat /run/nginx.pid)   # equivale a quit
\`\`\`

### 📖 El unit de systemd para nginx

\`\`\`bash
# Ver el unit de nginx
systemctl cat nginx

# Contenido típico
# [Unit]
# Description=A high performance web server and a reverse proxy server
# After=network.target
#
# [Service]
# Type=forking
# PIDFile=/run/nginx.pid
# ExecStartPre=/usr/sbin/nginx -t -q -g 'daemon on; master_process on;'
# ExecStart=/usr/sbin/nginx -g 'daemon on; master_process on;'
# ExecReload=/usr/sbin/nginx -g 'daemon on; master_process on;' -s reload
# ExecStop=-/bin/kill -s QUIT \$MAINPID
# TimeoutStopSec=5
# KillMode=mixed
#
# [Install]
# WantedBy=multi-user.target

# Habilitar nginx al inicio del sistema
systemctl enable nginx

# Ver logs de nginx vía journald
journalctl -u nginx -f
journalctl -u nginx --since "1 hour ago"
\`\`\`

El \`ExecStartPre\` ejecuta \`nginx -t\` antes de iniciar: si la configuración tiene errores, systemd no arranca nginx y reporta el error. Esto previene que un reload con config rota tire el servidor.

### 📖 Diagnóstico inicial

\`\`\`bash
# Estado completo del servicio
systemctl status nginx

# Verificar qué puertos escucha nginx
ss -tlnp | grep nginx

# Ver workers activos
ps aux | grep nginx

# Verificar la configuración completa (incluye includes resueltos)
nginx -T 2>/dev/null | grep -v "^#" | grep -v "^$" | head -50

# Dónde está el binario y su versión
nginx -v
nginx -V    # con flags de compilación (módulos incluidos)
\`\`\`

### 📋 Lo que debes recordar

* nginx tiene un proceso master (root) y N workers (usuario sin privilegios). Solo los workers procesan tráfico.
* Cada worker usa un event loop con epoll: un worker maneja miles de conexiones sin crear procesos ni hilos adicionales.
* La fórmula de capacidad: \`worker_processes × worker_connections = conexiones simultáneas máximas\`.
* \`nginx -t\` valida la config antes de hacer cualquier cambio en producción. Sin excepción.
* \`nginx -s reload\` recarga la config sin cortar conexiones activas: el master crea nuevos workers con la nueva config y espera a que los viejos terminen.

### 🧪 Autoevaluación

1. Un servidor tiene 8 CPUs, \`worker_processes auto\` y \`worker_connections 512\`. ¿Cuántas conexiones simultáneas puede manejar nginx como máximo?
2. ¿Qué diferencia hay entre \`nginx -s stop\` y \`nginx -s quit\`?
3. Modificas nginx.conf y ejecutas \`systemctl restart nginx\`. ¿Qué riesgo tiene esto frente a \`systemctl reload nginx\`?

---

1. 8 workers × 512 conexiones = 4.096 conexiones simultáneas máximas. En la práctica, cada conexión a un backend de proxy usa 2 file descriptors, así que \`worker_rlimit_nofile\` debe ser al menos el doble.
2. \`nginx -s stop\` envía SIGTERM: el proceso termina inmediatamente, cortando todas las conexiones activas. \`nginx -s quit\` envía SIGQUIT: el proceso espera a que terminen todas las conexiones en curso antes de salir. En producción casi siempre se usa \`quit\` (o \`reload\`).
3. \`restart\` hace stop + start: hay un breve período donde nginx no está escuchando, lo que genera errores 502/connection refused para los clientes activos. \`reload\` es graceful: los workers viejos terminan sus conexiones mientras los nuevos ya empezaron a aceptar. En producción siempre se usa \`reload\` salvo que el restart sea estrictamente necesario (upgrade del binario, por ejemplo).
`

export default content
