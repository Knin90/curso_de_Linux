const content = `
## Módulo 1 — Proxy inverso con nginx: proxy_pass y configuración básica

### 🎯 Objetivos de aprendizaje

* Entender qué es un proxy inverso y por qué nginx es ideal para este rol.
* Configurar \`proxy_pass\` para redirigir peticiones a un backend.
* Establecer los timeouts y buffers básicos de proxy.
* Diferenciar entre proxy HTTP y proxy a socket Unix.

### ❓ El problema real

Tienes una aplicación Node.js corriendo en el puerto 3000. Quieres que sea accesible en el puerto 80/443, que nginx maneje la compresión, el SSL y el rate limiting, y que tu app solo se ocupe de la lógica de negocio. Sin un proxy inverso, cada app necesita gestionar SSL, compresión y seguridad por sí misma — una arquitectura frágil y repetitiva. nginx como proxy inverso centraliza esa responsabilidad.

### 📖 ¿Qué es un proxy inverso?

En un proxy directo, el cliente sabe que está usando un proxy para llegar a internet. En un proxy inverso, el cliente habla con nginx sin saber que hay un backend detrás:

\`\`\`text
Sin proxy:
  Cliente ──→ App (puerto 3000) directamente

Con proxy inverso:
  Cliente ──→ nginx (puerto 80/443) ──→ App (puerto 3000, local)
              └── SSL, gzip, rate limit, logs
\`\`\`

nginx recibe la petición, la reenvía al backend, recibe la respuesta y la devuelve al cliente. El backend nunca está expuesto directamente.

### 📖 Configuración básica con proxy_pass

\`\`\`nginx
# /etc/nginx/sites-available/mi-app
server {
    listen 80;
    server_name app.ejemplo.com;

    location / {
        proxy_pass http://localhost:3000;
    }
}
\`\`\`

\`\`\`bash
sudo nginx -t && sudo systemctl reload nginx
\`\`\`

Eso es lo mínimo. Pero sin headers adicionales, el backend no sabe la IP real del cliente ni el host original. La configuración completa mínima es:

\`\`\`nginx
server {
    listen 80;
    server_name app.ejemplo.com;

    location / {
        proxy_pass          http://localhost:3000;

        # Pasar headers importantes al backend
        proxy_set_header    Host              \$host;
        proxy_set_header    X-Real-IP         \$remote_addr;
        proxy_set_header    X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
    }
}
\`\`\`

### 📖 proxy_pass con y sin trailing slash

La presencia o ausencia de \`/\` al final de \`proxy_pass\` cambia cómo nginx reescribe la URL:

\`\`\`nginx
# Sin slash: pasa la URI completa incluyendo el prefijo
location /api {
    proxy_pass http://localhost:3000;
    # GET /api/users → backend recibe /api/users
}

# Con slash: elimina el prefijo del location
location /api/ {
    proxy_pass http://localhost:3000/;
    # GET /api/users → backend recibe /users
}

# Con path en proxy_pass: añade ese path
location /api/ {
    proxy_pass http://localhost:3000/v2/;
    # GET /api/users → backend recibe /v2/users
}
\`\`\`

Este comportamiento confunde a muchos. La regla: si \`proxy_pass\` tiene URI (cualquier cosa después del host), nginx sustituye la parte del \`location\` por esa URI.

### 📖 Proxy a socket Unix

Para mayor rendimiento en comunicación local, muchas apps exponen un socket Unix en lugar de un puerto TCP:

\`\`\`nginx
# Proxy a socket Unix (gunicorn, php-fpm, etc.)
location / {
    proxy_pass http://unix:/run/gunicorn.sock;
}

# Con nombre de upstream (forma recomendada)
upstream django_app {
    server unix:/run/gunicorn.sock;
}

server {
    location / {
        proxy_pass http://django_app;
    }
}
\`\`\`

### 📖 Timeouts y buffers de proxy

\`\`\`nginx
location / {
    proxy_pass http://localhost:3000;

    # Tiempo para establecer conexión con el backend
    proxy_connect_timeout   10s;

    # Tiempo esperando la respuesta del backend (header)
    proxy_read_timeout      60s;

    # Tiempo para enviar la petición al backend
    proxy_send_timeout      60s;

    # Buffers: tamaño y número de buffers para la respuesta
    proxy_buffers           8 16k;
    proxy_buffer_size       32k;

    # Si la respuesta cabe en este buffer, no se escribe a disco
    proxy_busy_buffers_size 64k;
}
\`\`\`

Para APIs con respuestas rápidas, los valores por defecto son suficientes. Para backends lentos (reportes, exportaciones), aumentar \`proxy_read_timeout\`.

### 📋 Lo que debes recordar

* \`proxy_pass\` con slash final en la URL elimina el prefijo del location; sin slash lo preserva.
* Siempre incluir \`proxy_set_header Host \$host\` para que el backend sepa el dominio solicitado.
* Los sockets Unix son más rápidos que TCP local para comunicación entre nginx y la app.
* \`proxy_read_timeout\` es el tiempo que nginx espera al backend — ajustar para backends lentos.

### 🧪 Autoevaluación

1. ¿Qué petición recibe el backend si la configuración es \`location /app/ { proxy_pass http://localhost:8080/; }\` y el cliente pide \`GET /app/users\`?
2. ¿Por qué es importante el header \`X-Forwarded-For\` en un proxy inverso?
3. ¿Cuándo conviene usar un socket Unix en lugar de TCP para \`proxy_pass\`?

---

1. El backend recibe \`GET /users\`. Cuando \`proxy_pass\` tiene URI (el \`/\` final cuenta como URI), nginx reemplaza el prefijo del \`location\` (\`/app/\`) por la URI del \`proxy_pass\` (\`/\`), resultando en \`/users\`.
2. Sin \`X-Forwarded-For\`, el backend solo ve la IP de nginx (127.0.0.1) como origen de la petición. No puede implementar rate limiting por IP, geolocalización, auditoría de seguridad ni personalización por región. Este header preserva la IP real del cliente a través del proxy.
3. Cuando nginx y la aplicación están en el mismo servidor. Los sockets Unix evitan el overhead del stack TCP/IP (no hay empaquetado, checksums, handshake). La diferencia es apreciable en aplicaciones de alta concurrencia con muchas peticiones cortas.
`

export default content
