const content = `
## Módulo 3 — Health checks y manejo de backends caídos

### 🎯 Objetivos de aprendizaje

* Configurar health checks pasivos en nginx open source.
* Entender health checks activos disponibles en nginx Plus.
* Manejar errores de backend con \`proxy_next_upstream\`.
* Simular y observar el comportamiento ante caídas de backend.

### ❓ El problema real

Uno de tus tres backends cae a las 3 AM. nginx sigue enviándole tráfico durante 30 segundos mientras los usuarios ven errores 502. Luego nginx lo marca como caído y deja de enviarlo. ¿Cuánto tiempo tarda en detectar la caída? ¿Cuántos usuarios reciben errores? ¿Cuándo vuelve a intentar usar ese backend? Estas preguntas tienen respuestas configurables y entenderlas es crítico para alta disponibilidad.

### 📖 Health checks pasivos (nginx open source)

nginx open source detecta backends caídos de forma pasiva: marca un servidor como no disponible cuando acumula suficientes fallos consecutivos.

\`\`\`nginx
upstream mi_app {
    server backend1:3000 max_fails=3 fail_timeout=30s;
    server backend2:3000 max_fails=3 fail_timeout=30s;
    server backend3:3000 max_fails=3 fail_timeout=30s;
}
\`\`\`

**Cómo funciona:**
- Si un backend falla \`max_fails\` veces en \`fail_timeout\` segundos → se marca como inactivo.
- Permanece inactivo durante \`fail_timeout\` segundos.
- Tras ese período, nginx envía una petición de prueba. Si responde, vuelve al pool.

\`\`\`text
Ejemplo: max_fails=3, fail_timeout=30s

t=0s   → fallo 1 en backend2
t=10s  → fallo 2 en backend2
t=20s  → fallo 3 en backend2 → MARCADO COMO INACTIVO por 30s
t=50s  → nginx intenta backend2 con una petición real
t=50s  → backend2 responde OK → VUELVE AL POOL activo
\`\`\`

### 📖 proxy_next_upstream: reintentar en otro backend

Cuando un backend falla, \`proxy_next_upstream\` define qué errores hacen que nginx reintente en otro servidor:

\`\`\`nginx
location / {
    proxy_pass http://mi_app;

    # Reintentar en otro backend ante estos errores:
    proxy_next_upstream error timeout http_502 http_503 http_504;

    # Máximo 2 reintentos (evita probar todos los backends)
    proxy_next_upstream_tries 2;

    # Tiempo máximo total para todos los reintentos
    proxy_next_upstream_timeout 10s;
}
\`\`\`

**Valores posibles para \`proxy_next_upstream\`:**
\`\`\`text
error       error de conexión o lectura con el backend
timeout     timeout al conectar o leer del backend
invalid_header  el backend devolvió una respuesta inválida
http_500    error 500 del backend
http_502    error 502 (mala respuesta del backend)
http_503    servicio no disponible
http_504    gateway timeout
non_idempotent  PELIGRO: permite reintentar POST (por defecto solo GET/HEAD)
off         deshabilitar completamente los reintentos
\`\`\`

**Precaución con \`non_idempotent\`:** reintentar una petición POST puede causar acciones duplicadas (doble compra, doble registro). Usar solo con backends idempotentes.

### 📖 Página de error personalizada para backends caídos

\`\`\`nginx
server {
    listen 80;
    server_name app.ejemplo.com;

    location / {
        proxy_pass http://mi_app;
        proxy_next_upstream error timeout http_502 http_503;

        # Si todos los backends fallan, mostrar página de mantenimiento
        error_page 502 503 504 /mantenimiento.html;
    }

    # Servir la página de error desde nginx directamente
    location = /mantenimiento.html {
        root /var/www/errores;
        internal;
    }
}
\`\`\`

### 📖 Simular y verificar el comportamiento

\`\`\`bash
# Verificar el estado actual del upstream (requiere nginx status module)
# Añadir en nginx.conf:
server {
    listen 8080;
    allow 127.0.0.1;
    deny all;
    location /nginx_status {
        stub_status;
    }
}

curl http://127.0.0.1:8080/nginx_status
\`\`\`

\`\`\`text
Active connections: 4
server accepts handled requests
 1234 1234 5678
Reading: 0 Writing: 1 Waiting: 3
\`\`\`

\`\`\`bash
# Simular caída de un backend
sudo systemctl stop mi-app-instancia-2

# Ver en el log de nginx los errores y el failover
sudo tail -f /var/log/nginx/error.log

# Logs esperados:
# connect() failed (111: Connection refused) while connecting to upstream
# upstream: "http://backend2:3000/", usando siguiente upstream
\`\`\`

### 📖 Health checks activos (nginx Plus / OpenResty)

nginx open source solo tiene health checks pasivos. Para health checks activos (nginx hace peticiones periódicas de prueba sin esperar tráfico real), se necesita nginx Plus o módulos adicionales:

\`\`\`nginx
# Solo nginx Plus
upstream mi_app {
    server backend1:3000;
    server backend2:3000;

    # Health check activo cada 5 segundos
}

location / {
    proxy_pass http://mi_app;
    health_check interval=5s fails=3 passes=2 uri=/health;
}
\`\`\`

En nginx open source, la alternativa es usar un script externo (curl periódico + marcado manual) o cambiar a OpenResty/Tengine que incluyen módulos de health check activo.

### 📋 Lo que debes recordar

* \`max_fails=3 fail_timeout=30s\` es la configuración pasiva: 3 fallos en 30 segundos → inactivo por 30 segundos.
* \`proxy_next_upstream\` solo reintenta métodos idempotentes (GET, HEAD) por defecto — correcto para evitar duplicados.
* Siempre definir una página de error \`502/503\` para dar feedback al usuario cuando todos los backends caen.
* Los health checks activos requieren nginx Plus; en open source los checks son pasivos (basados en tráfico real).

### 🧪 Autoevaluación

1. Con \`max_fails=5 fail_timeout=60s\`, ¿cuánto tiempo puede estar un backend caído antes de que nginx deje de enviarle tráfico?
2. ¿Por qué \`proxy_next_upstream non_idempotent\` es peligroso para una API de pagos?
3. ¿Cómo sirve nginx una página de mantenimiento cuando todos los backends están caídos?

---

1. Hasta 60 segundos en el peor caso: si los 5 fallos se distribuyen en el inicio de la ventana de 60 segundos, el backend se marca al llegar el quinto fallo. Pero si los fallos están espaciados, pueden pasar hasta 60 segundos de tráfico fallido antes de alcanzar \`max_fails\`. Con \`max_fails=5\`, el sexto intento en la misma ventana ya lo encontrará marcado como inactivo.
2. Si el backend de pagos procesa la petición pero la respuesta de vuelta falla (timeout de red), nginx con \`non_idempotent\` reintentaría la misma petición POST en otro backend. El resultado sería un doble cobro: la primera instancia procesó el pago pero nginx no recibió confirmación y lo intentó de nuevo en la segunda instancia. Los métodos POST no son idempotentes por definición — ejecutarlos dos veces puede tener efectos diferentes a ejecutarlos una vez.
3. Mediante \`error_page 502 503 504 /mantenimiento.html\` combinado con un \`location = /mantenimiento.html { internal; }\` que sirve el archivo desde el filesystem de nginx directamente, sin pasar por el upstream. La directiva \`internal\` impide acceder a esa URL directamente desde el exterior.
`

export default content
