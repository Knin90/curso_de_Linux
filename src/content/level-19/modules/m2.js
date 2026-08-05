const content = `
## Módulo 2 — Server blocks y virtual hosting: múltiples sitios en un servidor

### 🎯 Objetivos de aprendizaje

* Configurar múltiples virtual hosts en una sola IP usando server blocks.
* Entender cómo nginx selecciona el server block correcto para cada petición.
* Usar \`server_name\` con coincidencias exactas, wildcards y regex.
* Implementar el patrón sites-available/sites-enabled correctamente.

### ❓ El problema real

Tienes un VPS con una sola IP pública y necesitas servir tres sitios: \`empresa.com\`, \`tienda.empresa.com\` y \`api.empresa.com\`. Con Apache usabas VirtualHost. En nginx el equivalente es el server block, pero el mecanismo de selección tiene matices importantes que, si los ignoras, todos los dominios acabarán respondiendo con el contenido del sitio equivocado.

### 📖 El server block

Cada sitio web en nginx se define dentro de un bloque \`server {}\`. nginx puede tener tantos server blocks como necesites, todos dentro del contexto \`http {}\`:

\`\`\`nginx
http {
    server {
        listen 80;
        server_name empresa.com www.empresa.com;
        root /var/www/empresa;
        index index.html;
    }

    server {
        listen 80;
        server_name tienda.empresa.com;
        root /var/www/tienda;
        index index.html;
    }

    server {
        listen 80;
        server_name api.empresa.com;
        root /var/www/api;
    }
}
\`\`\`

### 📖 Cómo nginx selecciona el server block

nginx aplica este algoritmo para cada petición entrante:

\`\`\`text
1. Coincidencia por IP:puerto (directiva listen)
   → Si no hay coincidencia exacta de IP, usa el server block con listen en 0.0.0.0:puerto

2. Coincidencia por nombre de host (cabecera Host: del request HTTP)
   La prioridad dentro de server_name:
   a) Nombre exacto:          server_name ejemplo.com;
   b) Wildcard al inicio:     server_name *.ejemplo.com;
   c) Wildcard al final:      server_name ejemplo.*;
   d) Regex:                  server_name ~^(www\.)?ejemplo\.com$;
   e) Default server:         server { listen 80 default_server; }

3. Si ningún server_name coincide → usa el default_server
\`\`\`

### 📖 La directiva listen

\`\`\`nginx
# Escuchar en todas las interfaces, puerto 80
listen 80;

# Escuchar en una IP específica
listen 192.168.1.100:80;

# Escuchar en IPv6
listen [::]:80;

# Escuchar en IPv4 e IPv6 simultáneamente (con ipv6only=off)
listen [::]:80 ipv6only=off;

# Marcar como servidor por defecto (recibe requests sin Host: coincidente)
listen 80 default_server;

# Para SSL/TLS
listen 443 ssl;
listen 443 ssl http2;     # con HTTP/2

# Backlog: tamaño de la cola de conexiones pendientes
listen 80 backlog=1024;
\`\`\`

**Regla importante:** si tienes múltiples server blocks sin \`default_server\`, nginx usa el primero en el archivo de configuración como default. Siempre define el default explícitamente.

### 📖 La directiva server_name

\`\`\`nginx
# Nombre exacto (máxima prioridad)
server_name ejemplo.com;

# Múltiples nombres exactos
server_name ejemplo.com www.ejemplo.com mail.ejemplo.com;

# Wildcard al inicio del nombre (segundo nivel de prioridad)
server_name *.ejemplo.com;
# Coincide: sub.ejemplo.com, tienda.ejemplo.com
# NO coincide: ejemplo.com, sub.sub.ejemplo.com

# Wildcard al final
server_name ejemplo.*;
# Coincide: ejemplo.com, ejemplo.org, ejemplo.net

# Regex (empieza con ~)
server_name ~^(www\.)?ejemplo\.com$;
# Coincide: ejemplo.com y www.ejemplo.com

# Capturar partes del nombre para usar más adelante
server_name ~^(?P<sub>.+)\.empresa\.com$;
# $sub captura el subdominio: si llega "api.empresa.com", $sub = "api"

# Aceptar cualquier nombre (no recomendado en producción)
server_name _;
\`\`\`

### 📖 El default_server y el servidor catch-all

\`\`\`nginx
# Este server block recibe todo lo que no coincide con ningún otro
server {
    listen 80 default_server;
    server_name _;

    # Opción 1: devolver 444 (nginx cierra la conexión sin respuesta)
    return 444;

    # Opción 2: redirigir a un sitio principal
    # return 301 https://empresa.com;

    # Opción 3: mostrar una página genérica
    # root /var/www/default;
}
\`\`\`

El código 444 es una extensión de nginx: cierra la conexión TCP sin enviar respuesta HTTP. Es útil para rechazar scanners y bots que atacan por IP en lugar de por nombre de dominio.

### 📖 SNI: múltiples dominios HTTPS en una sola IP

Server Name Indication (SNI) permite que nginx sirva diferentes certificados SSL según el dominio solicitado, todo desde la misma IP y puerto 443. Los clientes modernos (todos los navegadores actuales) envían el nombre del host en el handshake TLS antes de que se establezca la sesión cifrada:

\`\`\`nginx
server {
    listen 443 ssl;
    server_name empresa.com www.empresa.com;
    ssl_certificate     /etc/letsencrypt/live/empresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/empresa.com/privkey.pem;
    root /var/www/empresa;
}

server {
    listen 443 ssl;
    server_name tienda.empresa.com;
    ssl_certificate     /etc/letsencrypt/live/tienda.empresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tienda.empresa.com/privkey.pem;
    root /var/www/tienda;
}
\`\`\`

nginx selecciona el certificado correcto basándose en el campo SNI del handshake TLS. Sin SNI (clientes muy antiguos), recibirían el certificado del default_server.

### 📖 Patrón sites-available / sites-enabled

El patrón de Debian/Ubuntu organiza la configuración de virtual hosts en dos directorios:

\`\`\`bash
# sites-available: todos los virtual hosts definidos (activos o no)
/etc/nginx/sites-available/
├── empresa.com
├── tienda.empresa.com
└── default

# sites-enabled: symlinks a los activos
/etc/nginx/sites-enabled/
├── empresa.com -> ../sites-available/empresa.com
└── default -> ../sites-available/default

# nginx.conf incluye sites-enabled:
# include /etc/nginx/sites-enabled/*;
\`\`\`

\`\`\`bash
# Habilitar un virtual host
ln -s /etc/nginx/sites-available/empresa.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Deshabilitar un virtual host (sin borrar la configuración)
rm /etc/nginx/sites-enabled/empresa.com
nginx -t && systemctl reload nginx

# Equivalente a nginx_ensite / nginx_dissite en algunos sistemas
# En sistemas sin esa utilidad, el symlink manual es suficiente
\`\`\`

### 📖 Configuración completa de un virtual host

\`\`\`nginx
# /etc/nginx/sites-available/empresa.com

server {
    listen 80;
    listen [::]:80;
    server_name empresa.com www.empresa.com;

    # Logs separados por dominio
    access_log /var/log/nginx/empresa.com.access.log;
    error_log  /var/log/nginx/empresa.com.error.log warn;

    root /var/www/empresa.com/public;
    index index.html index.htm;

    location / {
        try_files \$uri \$uri/ =404;
    }

    # Denegar acceso a archivos ocultos (.git, .env, etc.)
    location ~ /\. {
        deny all;
    }
}
\`\`\`

### 📖 Múltiples IPs: binding selectivo

En servidores con múltiples IPs (multihomed), puedes vincular cada virtual host a una IP específica:

\`\`\`nginx
# Servidor con IPs: 203.0.113.10 y 203.0.113.20

server {
    listen 203.0.113.10:80;
    server_name empresa-a.com;
    root /var/www/empresa-a;
}

server {
    listen 203.0.113.20:80;
    server_name empresa-b.com;
    root /var/www/empresa-b;
}
\`\`\`

Esto es diferente al virtual hosting por nombre: aquí la selección inicial es por IP, no por cabecera Host.

### 📋 Lo que debes recordar

* nginx selecciona el server block primero por IP:puerto, luego por \`server_name\` con esta prioridad: exacto > wildcard inicio > wildcard final > regex > default_server.
* Siempre define un \`default_server\` explícito que devuelva 444 para requests sin Host coincidente.
* SNI permite múltiples certificados SSL en una sola IP/puerto; solo requiere que los clientes soporten TLS 1.0+ (todos los modernos lo hacen).
* El patrón sites-available/sites-enabled separa definición de activación: usa symlinks, nunca copias.

### 🧪 Autoevaluación

1. Tienes dos server blocks en el mismo puerto 80, ambos sin \`default_server\`. Llega una petición con \`Host: desconocido.com\`. ¿Qué server block la recibe?
2. ¿Qué diferencia hay entre \`server_name *.empresa.com\` y \`server_name ~^.+\\.empresa\\.com$\`?
3. ¿Por qué \`return 444\` en el default_server es mejor práctica que mostrar una página de error?

---

1. La recibe el primer server block en el archivo de configuración (orden de aparición). Por eso es crítico definir siempre un \`default_server\` explícito con comportamiento conocido, en lugar de depender del orden de carga.
2. \`*.empresa.com\` (wildcard) solo coincide con un nivel de subdominio: \`sub.empresa.com\` sí, pero \`a.b.empresa.com\` no. La regex \`~^.+\.empresa\.com$\` puede ajustarse para cualquier patrón, incluyendo múltiples niveles. Además, la regex tiene menor prioridad que el wildcard si ambos coinciden.
3. Con \`return 444\` nginx cierra la conexión TCP sin enviar ninguna respuesta HTTP. Los scanners y bots que atacan por IP directamente no obtienen información del servidor (versión, páginas de error, etc.) y el conexión se cierra inmediatamente, consumiendo mínimos recursos. Una página de error, aunque sea genérica, confirma que hay un servidor HTTP escuchando y puede revelar la versión de nginx.
`

export default content
