const content = `
## Módulo 4 — Archivos estáticos: root, alias, autoindex y optimización

### 🎯 Objetivos de aprendizaje

* Entender la diferencia crítica entre \`root\` y \`alias\` y cuándo usar cada uno.
* Configurar \`sendfile\`, \`tcp_nopush\` y \`tcp_nodelay\` para servir archivos eficientemente.
* Usar \`open_file_cache\` para reducir syscalls en sitios de alto tráfico.
* Servir SPAs correctamente con \`try_files\` y controlar headers de caché.

### ❓ El problema real

Tienes un servidor nginx sirviendo archivos estáticos de un build de React y una API. Los archivos JavaScript pesan 2 MB y se cargan lentamente. Además, el log de errores muestra miles de \`open() failed (2: No such file or directory)\` porque la ruta de root y alias no está bien configurada. Estos dos problemas (rendimiento y path mapping incorrecto) son los más comunes al configurar estáticos en nginx.

### 📖 root vs alias: la diferencia que más confunde

Esta es la distinción más importante del módulo. Los dos se confunden constantemente y el error es silencioso: nginx sirve archivos del lugar equivocado o devuelve 404.

**\`root\`**: la URI se appenda al path de root.

\`\`\`nginx
location /static/ {
    root /var/www/miapp;
}
# Request: GET /static/css/main.css
# Archivo buscado: /var/www/miapp + /static/css/main.css
#                = /var/www/miapp/static/css/main.css
#
# La URI /static/ se AGREGA al root.
\`\`\`

**\`alias\`**: el prefijo del location se sustituye por el path de alias.

\`\`\`nginx
location /static/ {
    alias /var/www/miapp/assets/;
}
# Request: GET /static/css/main.css
# Archivo buscado: /var/www/miapp/assets/ + css/main.css
#                = /var/www/miapp/assets/css/main.css
#
# El prefijo /static/ se REEMPLAZA por el alias.
# Nota: alias debe terminar en / si el location termina en /
\`\`\`

\`\`\`text
Cuándo usar cada uno:

root → cuando la estructura de directorios replica la URI
  URI: /static/css/  →  disco: /var/www/app/static/css/  ✓ usa root

alias → cuando el path en disco NO sigue la URI
  URI: /assets/       →  disco: /data/build/dist/         ✓ usa alias
  URI: /v2/docs/      →  disco: /opt/docs/latest/         ✓ usa alias
\`\`\`

### 📖 Error clásico con alias y regex

\`\`\`nginx
# ⚠️ INCORRECTO: alias con regex requiere captura manual
location ~ ^/static/(.*)$ {
    alias /var/www/assets/\$1;   # usa el grupo capturado
}

# ✅ CORRECTO con prefix location (sin regex)
location /static/ {
    alias /var/www/assets/;
}

# ✅ CORRECTO con regex + captura
location ~ ^/static/(.*) {
    alias /var/www/assets/\$1;
}
\`\`\`

Cuando usas \`alias\` con un location de prefijo (no regex), nginx automáticamente reemplaza el prefijo. Con regex, debes capturar y usar \`\$1\` explícitamente.

### 📖 La directiva index

\`index\` define qué archivo buscar cuando la URI apunta a un directorio:

\`\`\`nginx
# Un solo archivo index
index index.html;

# Lista de fallbacks (nginx prueba en orden)
index index.html index.htm index.php;

# En el contexto http (aplica globalmente), server o location
http {
    index index.html;

    server {
        server_name app.empresa.com;
        root /var/www/app;

        location / {
            index index.html;
            # Si /about/ existe como directorio con index.html,
            # nginx sirve /about/index.html
        }
    }
}
\`\`\`

### 📖 autoindex: listar directorios

\`\`\`nginx
# DESHABILITADO por defecto (correcto para producción)
autoindex off;

# Solo activar en directorios de descarga explícitos
location /downloads/ {
    autoindex on;
    autoindex_exact_size off;   # mostrar tamaños en KB/MB en lugar de bytes
    autoindex_localtime on;     # usar hora local en lugar de UTC
    root /var/www;
}
\`\`\`

**Nunca** habilitar \`autoindex on\` en el server block general o en \`/\`. Expone la estructura de archivos del servidor.

### 📖 sendfile, tcp_nopush y tcp_nodelay

Estas tres directivas trabajan juntas para optimizar la transferencia de archivos:

\`\`\`nginx
http {
    # sendfile: usa la syscall sendfile() del kernel en lugar de
    # leer el archivo a userspace y luego escribir al socket.
    # Evita dos copias de datos en memoria. Siempre ON en producción.
    sendfile on;

    # tcp_nopush: acumula datos antes de enviarlos (usa TCP_CORK).
    # Requiere sendfile on. Envía la cabecera HTTP y el inicio del
    # archivo en un solo paquete TCP. Reduce el número de paquetes.
    tcp_nopush on;

    # tcp_nodelay: desactiva el algoritmo Nagle para conexiones keepalive.
    # Envía datos inmediatamente sin esperar a acumular más.
    # Útil para latencia baja en conexiones keepalive.
    tcp_nodelay on;

    # En la práctica: tcp_nopush y tcp_nodelay parecen contradictorios,
    # pero nginx los gestiona correctamente: usa tcp_nopush durante la
    # transferencia del archivo y tcp_nodelay para el último chunk.
}
\`\`\`

### 📖 open_file_cache: reducir syscalls en alto tráfico

En sitios de alto tráfico, nginx hace miles de syscalls \`open()\`, \`stat()\` y \`fstat()\` para verificar que los archivos existen antes de servirlos. \`open_file_cache\` guarda en memoria los file descriptors y metadatos:

\`\`\`nginx
http {
    # Cachear hasta 1000 file descriptors abiertos
    # Cerrar los no usados en más de 20 segundos
    open_file_cache max=1000 inactive=20s;

    # Revalidar la caché cada 30 segundos
    open_file_cache_valid 30s;

    # Cachear un archivo solo si fue accedido al menos 2 veces
    open_file_cache_min_uses 2;

    # Cachear también los errores (archivo no encontrado)
    # Evita repetir stat() de archivos que no existen
    open_file_cache_errors on;
}
\`\`\`

### 📖 Expires y Cache-Control para archivos estáticos

\`\`\`nginx
# Arquivos con hash en nombre (bundle.a1b2c3d4.js): caché inmutable de 1 año
location ~* \\.(js|css)\$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;  # no loggear estos recursos, reducir ruido en logs
}

# Imágenes: caché de 30 días
location ~* \\.(jpg|jpeg|png|gif|svg|webp|ico)\$ {
    expires 30d;
    add_header Cache-Control "public";
}

# Fuentes: caché de 1 año + CORS para fuentes web
location ~* \\.(woff|woff2|ttf|eot)\$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Access-Control-Allow-Origin "*";
}

# HTML: sin caché (siempre actualizado)
location ~* \\.html\$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
\`\`\`

### 📖 Servir una SPA (Single Page Application)

Las SPAs (React, Vue, Angular) requieren que cualquier URL válida del router del cliente devuelva \`index.html\`. nginx no conoce las rutas del frontend, así que usa \`try_files\` como fallback:

\`\`\`nginx
server {
    listen 80;
    server_name app.empresa.com;
    root /var/www/app/dist;
    index index.html;

    # Archivos estáticos con caché (el build tool incluye hash en el nombre)
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Catch-all: sirve index.html para cualquier ruta del SPA router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Bloquear archivos sensibles del build (si hubiera alguno)
    location ~ /\\.(env|git) {
        return 403;
    }
}
\`\`\`

\`try_files \$uri \$uri/ /index.html\` funciona así:
1. Intenta servir el archivo exacto (\`\$uri\`): \`/logo.png\` → sirve \`/dist/logo.png\`.
2. Intenta servir como directorio con index (\`\$uri/\`): \`/docs/\` → busca \`/dist/docs/index.html\`.
3. Si ninguno existe, sirve \`/index.html\` → el router del SPA maneja la ruta.

### 📖 Verificar la configuración de estáticos

\`\`\`bash
# Probar que un archivo estático se sirve correctamente
curl -I http://app.empresa.com/static/css/main.css

# Verificar headers de caché
curl -v http://app.empresa.com/static/js/bundle.js 2>&1 | grep -E "(< HTTP|< Cache|< Expires|< Content)"

# Comprobar que la SPA sirve index.html para rutas del frontend
curl -I http://app.empresa.com/dashboard/settings
# Debe devolver 200 con Content-Type: text/html

# Ver qué archivo sirve nginx para una URL
curl -v http://app.empresa.com/about 2>&1 | grep "< "

# Verificar ETag y soporte de 304
curl -I http://app.empresa.com/logo.png
# Guarda el ETag: valor
curl -H 'If-None-Match: "valor"' -I http://app.empresa.com/logo.png
# Debe devolver 304 Not Modified
\`\`\`

### 📋 Lo que debes recordar

* \`root\` appenda la URI al path; \`alias\` reemplaza el prefijo del location. Confundirlos da 404 silenciosos.
* \`sendfile on\` + \`tcp_nopush on\` es la combinación óptima para transferir archivos grandes: cero copias en userspace, menos paquetes TCP.
* \`open_file_cache\` elimina el overhead de \`stat()\` y \`open()\` repetidos en archivos populares.
* Las SPAs necesitan \`try_files \$uri \$uri/ /index.html\` para que el router del cliente funcione en rutas directas o refreshes.

### 🧪 Autoevaluación

1. Tienes \`location /media/ { alias /data/uploads/; }\`. ¿Qué archivo busca nginx para \`GET /media/2024/foto.jpg\`?
2. ¿Por qué \`expires 1y; add_header Cache-Control "public, immutable"\` es seguro para archivos JS con hash en el nombre pero peligroso para \`index.html\`?
3. ¿Qué diferencia hay entre \`sendfile on\` y \`tcp_nopush on\`? ¿Pueden usarse uno sin el otro?

---

1. nginx reemplaza \`/media/\` por \`/data/uploads/\` y appenda el resto: busca \`/data/uploads/2024/foto.jpg\`.
2. Los archivos JS con hash en el nombre (\`bundle.a1b2c3d4.js\`) cambian de nombre con cada deploy: el hash nuevo genera una URL nueva, así que la versión antigua puede cachearse para siempre sin riesgo de obsolescencia. \`index.html\` nunca cambia de nombre y es el punto de entrada que referencia los nuevos bundles: si se cachea, los usuarios siguen cargando el JS viejo porque el navegador no pide el \`index.html\` actualizado.
3. \`sendfile on\` activa la syscall \`sendfile()\` del kernel que transfiere datos del archivo directamente al socket sin pasar por userspace (cero copias). \`tcp_nopush on\` (TCP_CORK) acumula datos antes de enviar para reducir el número de paquetes TCP, incluyendo los headers HTTP en el mismo paquete que el inicio del cuerpo. \`tcp_nopush\` requiere \`sendfile on\`: sin sendfile, tcp_nopush no tiene efecto porque el mecanismo de buffer del kernel que usa TCP_CORK solo aplica a transferencias vía sendfile.
`

export default content
