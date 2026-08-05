const content = `
## Módulo 3 — Location blocks: regex, prioridad y configuración avanzada

### 🎯 Objetivos de aprendizaje

* Dominar los cinco tipos de location match y su orden de prioridad.
* Usar \`try_files\` para aplicaciones web modernas y SPAs.
* Implementar \`return\`, \`rewrite\` y named locations correctamente.
* Entender cuándo usar \`internal\` y cómo encadenar locations.

### ❓ El problema real

Tu aplicación tiene rutas como \`/api/v1/users\`, \`/static/\`, \`/admin/\` y archivos PHP. Necesitas que \`/api/\` vaya al backend, \`/static/\` sirva archivos directamente, \`/admin/\` requiera autenticación básica y los archivos \`.php\` pasen por PHP-FPM. Con un solo location \`/\` no puedes hacer eso. Los location blocks son el sistema de routing de nginx: entenderlos a fondo es no-negociable.

### 📖 Los cinco tipos de location match

\`\`\`nginx
# 1. Prefijo normal (prefix match)
location /api/ { }
# Coincide con cualquier URI que empiece por /api/
# Ejemplos: /api/users, /api/v1/data, /api/

# 2. Coincidencia exacta (=)
location = /favicon.ico { }
# Solo coincide con exactamente /favicon.ico
# Es el tipo más rápido: nginx para de buscar al encontrarlo

# 3. Regex sensible a mayúsculas (~)
location ~ \\.php\$ { }
# Coincide con URIs que terminan en .php
# ~ activa modo regex, sensible a mayúsculas

# 4. Regex insensible a mayúsculas (~*)
location ~* \\.(jpg|jpeg|png|gif|ico|css|js)\$ { }
# Coincide con extensiones de imagen/CSS/JS en cualquier capitalización

# 5. Prefijo no-regex (^~)
location ^~ /static/ { }
# Igual que el prefijo normal, pero si coincide, nginx NO busca regex
# Útil cuando quieres evitar que una regex más específica tome el control
\`\`\`

### 📖 El algoritmo de prioridad (crítico)

nginx NO aplica el primer location que coincide. El orden de evaluación es fijo:

\`\`\`text
Paso 1: Buscar coincidencia exacta (=)
        Si encuentra → usa ese location, STOP

Paso 2: Buscar el prefijo más largo entre todos los prefix match
        - Si el prefijo más largo tiene ^~ → usa ese location, STOP
        - Si no tiene ^~ → guarda ese prefijo como "candidato"

Paso 3: Evaluar los regex (~ y ~*) en orden de aparición en el archivo
        - Si un regex coincide → usa ese location, STOP

Paso 4: Si ningún regex coincidió → usa el "candidato" del paso 2
\`\`\`

\`\`\`nginx
# Ejemplo para entender el orden:
location = /index.html {
    # Prioridad 1: exacto. Solo /index.html exacto.
}

location ^~ /static/ {
    # Prioridad 2 (si es el prefijo más largo): si coincide, bloquea regex.
    # /static/img/logo.png → entra aquí, NO evalúa regex de imágenes abajo.
}

location ~* \\.(png|jpg|gif)\$ {
    # Regex: /fotos/logo.png → llegaría aquí si no hay ^~ más largo antes.
}

location /api/ {
    # Prefijo normal: candidato si no hay regex que coincida.
}

location / {
    # Prefijo más corto posible: catch-all de último recurso.
}
\`\`\`

### 📖 try_files: el router interno de nginx

\`try_files\` intenta servir una lista de paths en orden. Si ninguno existe, ejecuta la última opción (que puede ser un código de error o una redirección interna):

\`\`\`nginx
# Caso básico: intentar el archivo, luego el directorio, luego 404
location / {
    try_files \$uri \$uri/ =404;
}
# Para /about: intenta /var/www/about (archivo), luego /var/www/about/ (directorio
# con index.html), luego devuelve 404

# Caso SPA (Single Page Application): React, Vue, Angular
location / {
    try_files \$uri \$uri/ /index.html;
}
# Si /app/dashboard no existe como archivo/directorio,
# sirve /index.html y deja que el router del frontend maneje la ruta

# Caso PHP: probar el archivo, si no existe pasar a PHP-FPM
location / {
    try_files \$uri \$uri/ /index.php?\$query_string;
}

location ~ \\.php\$ {
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
    include fastcgi_params;
}

# try_files con named location
location / {
    try_files \$uri \$uri/ @backend;
}

location @backend {
    proxy_pass http://127.0.0.1:3000;
}
\`\`\`

### 📖 Named locations (@)

Los named locations son locations internos que no pueden recibir peticiones externas directamente. Solo se accede a ellos mediante \`try_files\`, \`error_page\` o \`rewrite ... last\`:

\`\`\`nginx
# Named location para fallback a un proxy
location / {
    try_files \$uri @node_app;
}

location @node_app {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
}

# Named location para páginas de error personalizadas
error_page 404 @not_found;
error_page 500 502 503 504 @server_error;

location @not_found {
    root /var/www/errors;
    rewrite ^ /404.html break;
}

location @server_error {
    root /var/www/errors;
    rewrite ^ /50x.html break;
}
\`\`\`

### 📖 La directiva return

\`return\` termina el procesamiento y envía una respuesta. Es más eficiente que \`rewrite\` para redirecciones simples:

\`\`\`nginx
# Redirección permanente (301)
location /blog/ {
    return 301 https://nuevo-blog.empresa.com\$request_uri;
}

# Redirección temporal (302)
location /mantenimiento {
    return 302 /pagina-mantenimiento.html;
}

# Respuesta con cuerpo de texto plano
location /health {
    return 200 "OK\\n";
    add_header Content-Type text/plain;
}

# Cerrar conexión sin respuesta
location /xmlrpc.php {
    return 444;
}

# Bloquear con 403
location ~ /\\.(git|env|htaccess) {
    return 403;
}
\`\`\`

### 📖 La directiva rewrite

\`rewrite\` modifica la URI y puede redirigir o hacer un loop interno:

\`\`\`nginx
# Sintaxis: rewrite <regex> <reemplazo> [flag];
# Flags: last, break, redirect (302), permanent (301)

# Eliminar trailing slash excepto en raíz
rewrite ^/(.*)/\$ /\$1 permanent;

# Reescribir /productos/123 a /index.php?id=123
rewrite ^/productos/(\\d+)\$ /index.php?id=\$1 last;

# Redirect de www a non-www (mejor hacerlo con server_name separado)
server {
    server_name www.empresa.com;
    return 301 https://empresa.com\$request_uri;
}

# Diferencia entre last y break:
# last:  reescribe la URI y reinicia la búsqueda de location (nuevo ciclo)
# break: reescribe la URI y sirve el archivo en el location actual, sin reiniciar

location /legacy/ {
    rewrite ^/legacy/(.*)$ /new/\$1 last;
    # Con 'last': nginx busca un location que coincida con /new/...
    # Con 'break': nginx busca el archivo /new/... en el root actual
}
\`\`\`

### 📖 La directiva internal

\`internal\` hace que un location solo sea accesible desde dentro de nginx, no desde peticiones externas:

\`\`\`nginx
# Este location solo puede llamarse desde error_page o X-Accel-Redirect
location /internal-files/ {
    internal;
    root /var/data/protected;
}

# Uso con X-Accel-Redirect (descarga de archivos protegidos)
# El backend devuelve X-Accel-Redirect: /internal-files/documento.pdf
# nginx intercepta la cabecera y sirve el archivo directamente
\`\`\`

### 📖 Regex capture groups y variables

\`\`\`nginx
# Capturar partes de la URI con grupos de regex
location ~ ^/users/(\\d+)/profile\$ {
    # \$1 contiene el ID del usuario
    proxy_pass http://backend/api/user/\$1;
}

# Múltiples grupos
location ~ ^/([a-z]+)/(\\d+)\$ {
    # \$1 = recurso (ej: "posts"), \$2 = ID (ej: "42")
    return 200 "recurso=\$1, id=\$2\\n";
    add_header Content-Type text/plain;
}

# Variables de nginx útiles en location blocks
# \$uri           URI actual (sin query string), puede modificarse
# \$request_uri   URI original tal como llegó del cliente (con query string)
# \$args          query string completo
# \$query_string  igual que \$args
# \$host          cabecera Host del request
# \$remote_addr   IP del cliente
# \$request_method  GET, POST, etc.
\`\`\`

### 📖 Ejemplo real: aplicación con múltiples concerns

\`\`\`nginx
server {
    listen 80;
    server_name app.empresa.com;
    root /var/www/app/public;

    # 1. Bloquear archivos sensibles (exacto o regex, máxima prioridad)
    location ~ /\\.(env|git|svn|htaccess|htpasswd) {
        return 403;
    }

    # 2. Archivos estáticos con caché agresiva (^~ evita evaluación de más regex)
    location ^~ /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # 3. API: pasar al backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # 4. PHP-FPM para archivos .php
    location ~ \\.php\$ {
        try_files \$uri =404;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    # 5. Catch-all: SPA frontend
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
\`\`\`

### 📋 Lo que debes recordar

* El orden de evaluación es fijo: exacto (=) → prefijo más largo con ^~ → regex en orden de archivo → prefijo más largo sin ^~.
* \`try_files\` es la herramienta principal para routing interno: archivos estáticos, SPAs, y fallback a PHP/proxy.
* Los named locations (@nombre) son internos: solo accesibles desde \`try_files\` o \`error_page\`.
* \`return\` es más eficiente que \`rewrite\` para redirecciones. Usa \`return 301\` para permanentes y \`return 302\` para temporales.
* Los grupos de captura regex (\$1, \$2, ...) permiten reescribir URIs dinámicamente.

### 🧪 Autoevaluación

1. Tienes \`location /api/ {}\` y \`location ~ /api/v2 {}\`. Llega \`GET /api/v2/users\`. ¿Cuál location responde?
2. ¿Cuál es la diferencia entre \`rewrite ... last\` y \`rewrite ... break\`?
3. ¿Por qué poner \`try_files \$uri =404\` dentro del location \`~ \\.php\$\` antes de pasarlo a PHP-FPM?

---

1. La regex \`~ /api/v2\`. El prefijo \`/api/\` es el candidato del paso 2, pero como no tiene \`^~\`, nginx continúa evaluando regex. La regex \`~ /api/v2\` coincide con \`/api/v2/users\` y tiene mayor prioridad que el prefijo sin \`^~\`.
2. Con \`last\`, nginx reescribe la URI y reinicia el proceso de búsqueda de location desde cero (puede entrar en un nuevo location distinto). Con \`break\`, nginx reescribe la URI pero continúa procesando en el location actual, buscando el archivo directamente sin buscar otro location. \`last\` es para encadenar rewrites a diferentes locations; \`break\` es para servir el archivo reescrito en el root del location actual.
3. Sin \`try_files \$uri =404\`, un atacante podría pasar \`/inexistente.php\` y PHP-FPM intentaría ejecutarlo. Si hay un archivo \`.php\` arbitrario cargado (upload vulnerability), esto permitiría ejecución remota de código. \`try_files \$uri =404\` verifica que el archivo .php realmente exista en disco antes de pasarlo a PHP-FPM.
`

export default content
