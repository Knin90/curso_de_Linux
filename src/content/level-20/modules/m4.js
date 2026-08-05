const content = `
## Módulo 4 — Caché de proxy: proxy_cache y configuración avanzada

### 🎯 Objetivos de aprendizaje

* Configurar una zona de caché de proxy con \`proxy_cache_path\`.
* Definir qué respuestas se cachean y por cuánto tiempo.
* Usar \`proxy_cache_bypass\` y \`proxy_no_cache\` para control granular.
* Servir contenido cacheado cuando el backend está caído.

### ❓ El problema real

Tu API devuelve un listado de productos que cambia cada 5 minutos pero recibe 500 peticiones por segundo. Sin caché, esas 500 req/s golpean el backend directamente. Con caché de proxy, nginx sirve la respuesta desde memoria o disco y el backend recibe solo 1 petición cada 5 minutos para ese endpoint. La reducción de carga es de 99.99%. La caché de proxy es una de las herramientas de optimización más poderosas disponibles.

### 📖 Configurar la zona de caché

La directiva \`proxy_cache_path\` va en el bloque \`http\` (fuera de \`server\`):

\`\`\`nginx
# /etc/nginx/nginx.conf → bloque http

http {
    # path:       directorio donde se guardan los archivos de caché
    # levels:     estructura de subdirectorios (1:2 = dos niveles de dirs)
    # keys_zone:  nombre y tamaño del espacio en RAM para índice de claves
    # max_size:   límite total en disco
    # inactive:   eliminar entradas no accedidas en este tiempo
    # use_temp_path=off: escribir directamente al path final (más eficiente)

    proxy_cache_path /var/cache/nginx
        levels=1:2
        keys_zone=mi_cache:10m
        max_size=1g
        inactive=60m
        use_temp_path=off;
}
\`\`\`

\`\`\`bash
# Crear el directorio y darle permisos a nginx
sudo mkdir -p /var/cache/nginx
sudo chown nginx:nginx /var/cache/nginx
\`\`\`

### 📖 Activar caché en un location

\`\`\`nginx
server {
    listen 80;
    server_name api.ejemplo.com;

    location /api/ {
        proxy_pass  http://mi_app;

        # Activar la zona de caché definida arriba
        proxy_cache mi_cache;

        # Clave de caché: qué identifica una entrada única
        proxy_cache_key "\$scheme\$request_method\$host\$request_uri";

        # Cachear respuestas 200 por 5 minutos, 404 por 1 minuto
        proxy_cache_valid 200 5m;
        proxy_cache_valid 404 1m;

        # Añadir header para saber si la respuesta viene de caché
        add_header X-Cache-Status \$upstream_cache_status;
    }
}
\`\`\`

El header \`X-Cache-Status\` puede tener estos valores:
\`\`\`text
HIT       → servido desde caché
MISS      → no estaba en caché, se consultó el backend
EXPIRED   → estaba en caché pero expiró, se consultó el backend
BYPASS    → caché omitida por proxy_cache_bypass
STALE     → se sirvió una versión antigua (backend caído)
UPDATING  → se está actualizando en background
\`\`\`

### 📖 Control granular: bypass y no-cache

\`\`\`nginx
location /api/ {
    proxy_pass  http://mi_app;
    proxy_cache mi_cache;
    proxy_cache_valid 200 5m;

    # No usar caché si el cliente envía Cookie o el header Cache-Control: no-cache
    proxy_cache_bypass \$cookie_nocache \$http_pragma \$http_authorization;

    # No guardar en caché si hay cookie de sesión autenticada
    proxy_no_cache \$cookie_session_id;
}
\`\`\`

\`proxy_cache_bypass\`: si cualquiera de las variables no es vacía/cero, nginx va al backend y NO sirve desde caché (pero sí guarda el resultado).

\`proxy_no_cache\`: si cualquiera de las variables no es vacía/cero, nginx no guarda la respuesta en caché.

### 📖 Stale cache: servir contenido antiguo si el backend cae

\`\`\`nginx
location /api/ {
    proxy_pass  http://mi_app;
    proxy_cache mi_cache;
    proxy_cache_valid 200 5m;

    # Si el backend está caído o responde lento, servir la versión antigua
    proxy_cache_use_stale error timeout updating http_502 http_503 http_504;

    # Mientras se actualiza la caché en background, servir la versión antigua
    proxy_cache_background_update on;

    # Solo un worker actualiza la caché a la vez (evita el "thundering herd")
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;
}
\`\`\`

\`proxy_cache_lock\` es crítico: cuando una entrada de caché expira y llegan 100 peticiones simultáneas, sin este parámetro las 100 irían al backend al mismo tiempo. Con \`proxy_cache_lock on\`, solo una pasa; las demás esperan a que llegue la respuesta y se lleven el resultado cacheado.

### 📖 Inspeccionar y limpiar la caché

\`\`\`bash
# Ver el espacio usado por la caché
du -sh /var/cache/nginx/

# Listar archivos de caché
find /var/cache/nginx/ -type f | head -20

# Limpiar toda la caché (reinicio o eliminación manual)
sudo find /var/cache/nginx/ -type f -delete

# Con nginx Plus: purge por URL
# curl -X PURGE http://api.ejemplo.com/api/productos
\`\`\`

Para purge selectivo en nginx open source, existe el módulo \`ngx_cache_purge\` (disponible en muchos repos).

### 📋 Lo que debes recordar

* \`keys_zone=nombre:10m\` reserva 10 MB de RAM para el índice — suficiente para ~80.000 entradas.
* El header \`X-Cache-Status\` es imprescindible para depurar si la caché está funcionando.
* \`proxy_cache_lock\` previene el "thundering herd" cuando múltiples peticiones simultáneas buscan una entrada expirada.
* \`proxy_cache_use_stale\` convierte la caché en un mecanismo de resiliencia cuando el backend cae.

### 🧪 Autoevaluación

1. ¿Qué diferencia hay entre \`proxy_cache_bypass\` y \`proxy_no_cache\`?
2. ¿Qué problema previene \`proxy_cache_lock\` y cómo lo soluciona?
3. Un usuario autenticado con cookie de sesión no debe recibir contenido cacheado de otro usuario. ¿Qué directiva usarías y cómo?

---

1. \`proxy_cache_bypass\` controla si nginx sirve desde caché: si la condición se cumple, nginx va al backend (pero puede guardar la respuesta). \`proxy_no_cache\` controla si nginx guarda la respuesta: si la condición se cumple, la respuesta del backend no se almacena en caché. Se pueden usar juntos: \`proxy_cache_bypass\` para no servir desde caché a usuarios autenticados, y \`proxy_no_cache\` para no almacenar sus respuestas privadas.
2. El "thundering herd": cuando una entrada de caché expira y muchas peticiones llegan al mismo tiempo, todas detectan el MISS y van al backend simultáneamente. Con 1000 peticiones/segundo y una expiración, esto puede generar un pico de carga que tumba el backend. \`proxy_cache_lock\` hace que solo la primera petición vaya al backend; las demás esperan. Cuando llega la respuesta, se cachea y todas las peticiones en espera la reciben del caché.
3. Usar \`proxy_no_cache \$cookie_sessionid\` donde \`\$cookie_sessionid\` es el nombre de la cookie de sesión. Si la cookie existe (usuario autenticado), la respuesta no se cachea. Adicionalmente, \`proxy_cache_bypass \$cookie_sessionid\` para que tampoco se sirva desde caché a usuarios autenticados. Esto garantiza que las respuestas personalizadas no se almacenen ni se sirvan a otros usuarios.
`

export default content
