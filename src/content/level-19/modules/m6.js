const content = `
## Módulo 6 — Compresión, caché de cliente y optimización de rendimiento

### 🎯 Objetivos de aprendizaje

* Configurar gzip con los parámetros correctos para producción.
* Implementar caché de cliente con \`expires\` y \`Cache-Control\` por tipo de recurso.
* Entender ETag y las respuestas 304 Not Modified.
* Usar \`open_file_cache\` y \`keepalive\` para reducir overhead en alto tráfico.

### ❓ El problema real

Tu sitio transfiere 2.5 MB de JavaScript por visita. Con gzip habilitado correctamente, eso baja a 700 KB: el usuario carga el sitio en la mitad del tiempo, y tu ancho de banda se reduce un 72%. Además, sin control de caché en el navegador, cada recarga vuelve a descargar todos los recursos aunque no hayan cambiado. Estas dos configuraciones —compresión y caché— son las de mayor impacto en rendimiento percibido por el usuario.

### 📖 gzip: compresión en tránsito

nginx puede comprimir las respuestas antes de enviarlas si el cliente indica soporte mediante el header \`Accept-Encoding: gzip\`:

\`\`\`nginx
http {
    # Activar compresión gzip
    gzip on;

    # Nivel de compresión: 1 (más rápido, menos compresión) a 9 (más lento, más compresión)
    # Para producción: 4-6 es el punto óptimo (compresión 70-80%, CPU razonable)
    gzip_comp_level 5;

    # No comprimir respuestas más pequeñas que este umbral (en bytes)
    # Comprimir 100 bytes cuesta más CPU de lo que ahorra
    gzip_min_length 256;

    # Tipos MIME que se comprimen
    # text/html se comprime siempre si gzip on (incluso sin listarlo)
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/x-javascript
        application/json
        application/xml
        application/xml+rss
        application/atom+xml
        image/svg+xml
        font/truetype
        font/opentype
        application/vnd.ms-fontobject;

    # Agregar Vary: Accept-Encoding al response
    # Necesario para que proxies y CDNs cacheen correctamente
    # ambas versiones (comprimida y sin comprimir)
    gzip_vary on;

    # Comprimir respuestas de backends proxy (útil si nginx actúa como proxy)
    # off: no comprimir proxied responses
    # any: comprimir siempre
    # expired, no-cache, no-store, private: comprimir según directivas de caché
    gzip_proxied any;

    # Deshabilitar gzip para IE6 (ya irrelevante en 2024, pero por completitud)
    gzip_disable "msie6";
}
\`\`\`

### 📖 Qué NO comprimir con gzip

\`\`\`nginx
# NO comprimir imágenes: ya están comprimidas internamente
# JPEG, PNG, GIF, WebP tienen compresión propia
# Comprimir con gzip añade CPU sin reducir el tamaño (puede incluso aumentarlo)

# NO comprimir video y audio por la misma razón

# NO comprimir archivos ya comprimidos (.zip, .gz, .br, .pdf)

# La configuración correcta lista SOLO los tipos que se benefician:
# - Texto (HTML, CSS, JS, JSON, XML, SVG)
# - Fuentes sin comprimir (TTF, OTF, EOT)
# - Todo lo demás: excluir de gzip_types
\`\`\`

### 📖 Verificar que gzip funciona

\`\`\`bash
# El header Accept-Encoding activa la compresión en el servidor
curl -H "Accept-Encoding: gzip" -I https://empresa.com/static/app.js
# Debe mostrar: Content-Encoding: gzip

# Ver la diferencia de tamaño
curl -H "Accept-Encoding: gzip" -o /dev/null -s -w "Comprimido: %{size_download} bytes\\n" https://empresa.com/static/app.js
curl -o /dev/null -s -w "Sin comprimir: %{size_download} bytes\\n" https://empresa.com/static/app.js

# Descomprimir manualmente para verificar el contenido
curl -H "Accept-Encoding: gzip" -s https://empresa.com/ | gunzip | head -20
\`\`\`

### 📖 Caché de cliente: expires y Cache-Control

El navegador cachea recursos para no descargarlos en cada visita. nginx controla esto con dos cabeceras:
- \`Expires\`: fecha absoluta de expiración (legacy HTTP/1.0)
- \`Cache-Control\`: directivas de caché (HTTP/1.1, preferido)

\`\`\`nginx
# Estrategia completa de caché por tipo de recurso

# Assets con hash en nombre: caché permanente (el hash cambia con cada deploy)
location ~* \\.(?:js|css)\$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    # immutable: indica que el recurso nunca cambiará en esta URL
    # El navegador no hace If-None-Match ni If-Modified-Since
}

# Imágenes y fuentes: caché larga
location ~* \\.(?:jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot)\$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
}

# HTML: sin caché (siempre actualizado, referencia los assets con hash)
location ~* \\.html\$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}

# API endpoints: sin caché o caché muy corta
location /api/ {
    add_header Cache-Control "no-store";
    # O para respuestas que pueden cachearse brevemente:
    # add_header Cache-Control "private, max-age=60";
}
\`\`\`

### 📖 ETag y respuestas 304 Not Modified

nginx activa \`ETag\` por defecto. Un ETag es un hash del contenido del archivo. En peticiones subsiguientes, el navegador envía el ETag en \`If-None-Match\` y nginx devuelve 304 si el archivo no ha cambiado (sin transferir el cuerpo):

\`\`\`nginx
# ETag está ON por defecto en nginx
# Para desactivarlo (raro, evitar):
# etag off;

# Verificar que ETag funciona:
# curl -I https://empresa.com/logo.png
# → ETag: "65a3b2c4-1a2b"

# Segunda petición con el ETag:
# curl -H 'If-None-Match: "65a3b2c4-1a2b"' -I https://empresa.com/logo.png
# → HTTP/1.1 304 Not Modified  (sin cuerpo, ahorra ancho de banda)
\`\`\`

\`\`\`bash
# Verificar ETag y 304 en producción
ETAG=$(curl -sI https://empresa.com/static/logo.png | grep ETag | awk '{print \$2}' | tr -d '\\r')
echo "ETag: \$ETAG"
curl -H "If-None-Match: \$ETAG" -sI https://empresa.com/static/logo.png | head -3
\`\`\`

### 📖 keepalive: reutilización de conexiones TCP

Abrir una conexión TCP (SYN, SYN-ACK, ACK) para cada recurso es costoso. \`keepalive_timeout\` mantiene la conexión abierta para reutilizarla en múltiples requests:

\`\`\`nginx
http {
    # Tiempo que nginx mantiene una conexión keep-alive abierta
    # después de que el cliente deja de enviar requests
    keepalive_timeout 65;

    # Máximo de requests por conexión keep-alive
    # Previene que una conexión se mantenga indefinidamente
    keepalive_requests 1000;

    # Para proxies upstream (nginx como proxy inverso)
    upstream backend {
        server 127.0.0.1:8000;
        keepalive 32;  # conexiones keep-alive al upstream
    }
}
\`\`\`

### 📖 open_file_cache en sitios de alto tráfico

Cuando nginx sirve muchos archivos pequeños, el overhead de \`open()\`, \`stat()\` y \`close()\` por cada request puede ser significativo. \`open_file_cache\` mantiene file descriptors abiertos y metadatos en memoria:

\`\`\`nginx
http {
    # Mantener hasta 2000 file descriptors abiertos
    # Cerrar los inactivos tras 20 segundos
    open_file_cache max=2000 inactive=20s;

    # Revalidar la caché con el filesystem cada 30 segundos
    # (si el archivo cambió en disco, lo detecta en max 30s)
    open_file_cache_valid 30s;

    # Cachear un archivo solo si fue accedido al menos 2 veces
    # Evita cachear archivos accedidos una sola vez (temporales, uploads)
    open_file_cache_min_uses 2;

    # También cachear errores: si /favicon.ico no existe, no repetir
    # el stat() fallido en cada request; cachear el "no existe"
    open_file_cache_errors on;
}
\`\`\`

### 📖 Configuración completa de optimización

\`\`\`nginx
# /etc/nginx/conf.d/performance.conf
# Incluir en el contexto http

# Compresión
gzip on;
gzip_comp_level 5;
gzip_min_length 256;
gzip_vary on;
gzip_proxied any;
gzip_types
    text/plain text/css text/xml text/javascript
    application/javascript application/json application/xml
    application/rss+xml image/svg+xml
    font/truetype font/opentype application/vnd.ms-fontobject;

# Transferencia de archivos
sendfile on;
tcp_nopush on;
tcp_nodelay on;

# Keepalive
keepalive_timeout 65;
keepalive_requests 1000;

# File descriptor cache
open_file_cache max=2000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;

# Tamaño de buffers para headers y body
client_header_buffer_size 1k;
large_client_header_buffers 4 8k;
client_body_buffer_size 128k;
client_max_body_size 10m;

# Timeouts
client_header_timeout 60s;
client_body_timeout 60s;
send_timeout 60s;
\`\`\`

### 📖 Medir el impacto de la optimización

\`\`\`bash
# Tiempo de carga sin gzip vs con gzip (campo time_total)
curl -o /dev/null -s -w "Sin gzip: %{time_total}s, size: %{size_download}B\\n" \\
  https://empresa.com/static/app.js

curl -H "Accept-Encoding: gzip" -o /dev/null -s -w "Con gzip: %{time_total}s, size: %{size_download}B\\n" \\
  https://empresa.com/static/app.js

# Ver headers de caché de una respuesta
curl -sI https://empresa.com/static/css/styles.css | grep -iE "(cache|etag|expires|vary)"

# Verificar que la segunda petición devuelve 304
curl -sI https://empresa.com/static/logo.png        # primera petición
# guarda el ETag del output, luego:
curl -H 'If-None-Match: "el-etag-obtenido"' -sI https://empresa.com/static/logo.png

# Benchmark simple con ApacheBench
ab -n 1000 -c 50 https://empresa.com/
\`\`\`

### 📋 Lo que debes recordar

* \`gzip_comp_level 5\` + \`gzip_min_length 256\` es el punto óptimo para la mayoría de sitios: buena compresión sin matar la CPU.
* No comprimir imágenes ni archivos ya comprimidos: es CPU desperdiciada sin reducción de tamaño.
* La estrategia de caché correcta es: assets con hash = 1 año inmutable, imágenes = 30 días, HTML = no-cache.
* \`gzip_vary on\` es obligatorio cuando hay proxies o CDNs: sin él, el proxy puede servir la versión comprimida a un cliente que no acepta gzip.
* ETag + 304 es el mecanismo de revalidación: el archivo se transfiere solo si cambió.

### 🧪 Autoevaluación

1. Tienes \`gzip on\` y \`gzip_types text/css\`. Un cliente envía \`Accept-Encoding: gzip\` y pide una imagen PNG. ¿La comprime nginx? ¿Y si pide el CSS?
2. ¿Por qué es un error configurar \`Cache-Control: max-age=31536000\` en \`index.html\` aunque los assets sí puedan tener ese valor?
3. ¿Qué hace exactamente \`gzip_vary on\` y qué problema resuelve?

---

1. No comprime la imagen PNG: PNG no está en \`gzip_types\` y además las imágenes ya tienen compresión interna. Sí comprime el CSS: \`text/css\` está en \`gzip_types\` y el cliente indica soporte con \`Accept-Encoding: gzip\`. Nota: \`text/html\` siempre se comprime si \`gzip on\` aunque no esté en \`gzip_types\`.
2. \`index.html\` referencia assets por su nombre (que incluye el hash del contenido). Si cacheas \`index.html\` por 1 año y se hace un nuevo deploy con nuevos hashes de assets, el usuario seguirá viendo el \`index.html\` viejo durante 1 año, que referencia assets que ya no existen en el servidor. El resultado es un sitio roto. \`index.html\` debe estar siempre actualizado (\`no-cache\`) para que apunte a los assets con sus hashes correctos.
3. \`gzip_vary on\` agrega el header \`Vary: Accept-Encoding\` a las respuestas comprimidas. Sin él, un proxy intermedio o CDN podría cachear la versión comprimida y servirla a clientes que no enviaron \`Accept-Encoding: gzip\`, resultando en contenido ilegible (bytes comprimidos enviados a un cliente que no puede descomprimirlos). Con \`Vary: Accept-Encoding\`, el proxy entiende que debe cachear dos variantes del recurso: una comprimida y otra sin comprimir.
`

export default content
