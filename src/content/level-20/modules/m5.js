const content = `
## Módulo 5 — WebSocket y conexiones de larga duración

### 🎯 Objetivos de aprendizaje

* Configurar nginx para hacer proxy de conexiones WebSocket.
* Entender por qué WebSocket requiere configuración especial.
* Gestionar timeouts para conexiones de larga duración.
* Configurar Server-Sent Events (SSE) y long polling.

### ❓ El problema real

Añades WebSocket a tu aplicación para notificaciones en tiempo real. En desarrollo funciona perfecto. En producción, detrás de nginx, las conexiones se cierran después de 60 segundos. Los usuarios pierden la conexión y tienen que reconectarse continuamente. El problema: nginx por defecto usa HTTP/1.0 para las peticiones al backend (sin keepalive) y cierra conexiones que parecen inactivas. WebSocket necesita que la conexión se mantenga abierta indefinidamente.

### 📖 Por qué WebSocket es especial

WebSocket comienza como una petición HTTP normal con un "upgrade":

\`\`\`text
Cliente → nginx:
GET /ws HTTP/1.1
Host: app.ejemplo.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

nginx → backend:
Debe reenviar los headers Upgrade y Connection tal como llegaron.
\`\`\`

Por defecto, nginx elimina los headers \`Upgrade\` y reemplaza \`Connection\` por \`close\`. Hay que configurarlo explícitamente.

### 📖 Configuración básica de WebSocket

\`\`\`nginx
# /etc/nginx/conf.d/websocket.conf

map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name app.ejemplo.com;

    # Peticiones HTTP normales
    location / {
        proxy_pass http://mi_app;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://mi_app;

        # Estos tres son los críticos para WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;

        # Headers estándar
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;

        # Timeouts para conexiones de larga duración
        proxy_read_timeout  3600s;   # 1 hora
        proxy_send_timeout  3600s;
    }
}
\`\`\`

El bloque \`map\` es elegante: si el cliente envía el header \`Upgrade\`, el valor de \`\$connection_upgrade\` es \`upgrade\`. Si no hay \`Upgrade\`, es \`close\`. Así el mismo \`location\` funciona para la fase de handshake y para la conexión establecida.

### 📖 Upstream WebSocket con load balancing

\`\`\`nginx
upstream ws_backends {
    # ip_hash es importante para WebSocket:
    # un cliente debe siempre ir al mismo backend durante su sesión
    ip_hash;

    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}

server {
    listen 80;
    server_name app.ejemplo.com;

    location /ws {
        proxy_pass http://ws_backends;

        proxy_http_version 1.1;
        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host       \$host;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;

        # No cachear WebSocket
        proxy_cache off;
    }
}
\`\`\`

\`ip_hash\` es importante aquí: una conexión WebSocket es de larga duración y debe mantenerse en el mismo backend durante toda su vida. Con round-robin, el handshake podría ir a un backend y los mensajes subsiguientes a otro.

### 📖 Server-Sent Events (SSE)

SSE es más simple que WebSocket: el cliente hace un GET normal y el servidor envía datos en streaming. La configuración especial:

\`\`\`nginx
location /events {
    proxy_pass http://mi_app;

    proxy_set_header Host            \$host;
    proxy_set_header X-Real-IP       \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;

    # SSE necesita streaming sin buffering
    proxy_buffering off;
    proxy_cache     off;

    # Content-Type que identifica SSE
    # El backend debe enviar: Content-Type: text/event-stream

    # Timeout largo para mantener la conexión
    proxy_read_timeout 3600s;

    # Deshabilitar compresión para SSE (no tiene sentido con streaming)
    gzip off;
}
\`\`\`

\`proxy_buffering off\` es crítico para SSE: con buffering activo, nginx acumula datos antes de enviarlos al cliente, destruyendo el tiempo real.

### 📖 Diagnóstico de problemas con WebSocket

\`\`\`bash
# Verificar que nginx pasa el header Upgrade correctamente
curl -v \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  http://app.ejemplo.com/ws

# Respuesta esperada: HTTP 101 Switching Protocols
# Si devuelve 400/502: nginx no está pasando los headers de upgrade

# Ver conexiones activas
ss -tnp | grep nginx

# Log de errores de nginx
sudo journalctl -u nginx -f
\`\`\`

### 📋 Lo que debes recordar

* WebSocket necesita tres directivas: \`proxy_http_version 1.1\`, \`proxy_set_header Upgrade\`, \`proxy_set_header Connection\`.
* El \`proxy_read_timeout\` por defecto es 60s — demasiado corto para WebSocket. Configurar 1 hora o más.
* Con load balancing y WebSocket usar \`ip_hash\` para mantener la afinidad de sesión durante toda la conexión.
* SSE requiere \`proxy_buffering off\` para que los eventos lleguen al cliente en tiempo real.

### 🧪 Autoevaluación

1. ¿Por qué una conexión WebSocket se cierra sola después de 60 segundos detrás de nginx sin configuración especial?
2. ¿Qué hace el bloque \`map \$http_upgrade \$connection_upgrade\` y por qué es mejor que hardcodear \`Connection: upgrade\`?
3. ¿Por qué \`proxy_buffering off\` es necesario para Server-Sent Events pero no para una API REST normal?

---

1. Porque \`proxy_read_timeout\` por defecto es 60 segundos. nginx espera datos del backend; si no llegan datos en 60 segundos (una WebSocket inactiva en espera de mensajes no envía datos constantemente), nginx cierra la conexión por timeout. Aumentar \`proxy_read_timeout\` a 3600s (1 hora) o más soluciona el problema.
2. El bloque \`map\` hace que \`\$connection_upgrade\` valga \`upgrade\` cuando el cliente envía el header \`Upgrade\` (inicio del handshake WebSocket) y \`close\` cuando no lo envía (petición HTTP normal). Si se hardcodeara \`Connection: upgrade\`, todas las peticiones HTTP normales recibirían ese header, lo que es incorrecto y puede causar problemas con ciertos clientes y backends.
3. Para una API REST, nginx acumula la respuesta completa y la envía de una vez al cliente — esto mejora el rendimiento al reducir el número de paquetes TCP. Para SSE, el backend envía fragmentos de datos a lo largo del tiempo (eventos). Si nginx los bufferiza, el cliente no los recibe hasta que el buffer se llena o se cierra la conexión, destruyendo el efecto de tiempo real. Con \`proxy_buffering off\`, cada fragmento se reenvía al cliente inmediatamente.
`

export default content
