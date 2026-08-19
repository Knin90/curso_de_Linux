const content = `
## Módulo 2 — Upstream y load balancing: algoritmos y configuración

### 🎯 Objetivos de aprendizaje

* Definir grupos \`upstream\` para gestionar múltiples backends.
* Aplicar los algoritmos de balanceo: round-robin, least_conn, ip_hash y hash.
* Configurar pesos y servidores de respaldo.
* Entender cuándo usar cada algoritmo.

### ❓ El problema real

Tu aplicación ha crecido y un solo servidor backend ya no aguanta la carga. Tienes tres instancias de la app corriendo en los puertos 3001, 3002 y 3003. Necesitas distribuir el tráfico entre ellas de forma inteligente: que ninguna se sature, que si una cae las demás absorban el tráfico, y que algunas instancias (con más recursos) reciban más peticiones. Eso es exactamente lo que resuelve el bloque \`upstream\` de nginx.

### 📖 El bloque upstream

\`\`\`nginx
# /etc/nginx/conf.d/upstream.conf

upstream mi_app {
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
    server 192.168.1.12:3000;
}

server {
    listen 80;
    server_name app.ejemplo.com;

    location / {
        proxy_pass http://mi_app;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
\`\`\`

### 📖 Algoritmos de balanceo

**Round-robin (por defecto):**

\`\`\`nginx
upstream mi_app {
    # Sin directiva: round-robin
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
\`\`\`

Distribuye las peticiones en orden cíclico: 1→2→3→1→2→3. Funciona bien cuando todas las instancias tienen los mismos recursos y las peticiones tienen duración similar.

**Least connections:**

\`\`\`nginx
upstream mi_app {
    least_conn;
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
\`\`\`

Envía cada nueva petición al backend con menos conexiones activas en ese momento. Ideal cuando las peticiones tienen tiempos de respuesta muy variables (algunas rápidas, algunas lentas).

**IP hash:**

\`\`\`nginx
upstream mi_app {
    ip_hash;
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
\`\`\`

La misma IP siempre va al mismo backend (salvo caída). Útil para aplicaciones con sesión en memoria (sin Redis/memcached) donde el usuario debe "pegarse" a un servidor.

**Hash personalizado:**

\`\`\`nginx
upstream mi_app {
    hash \$request_uri consistent;
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
\`\`\`

Permite basar el hash en cualquier variable nginx. \`consistent\` usa consistent hashing (minimiza redistribución cuando se añaden/eliminan servidores — ideal para caché distribuida).

### 📖 Pesos y servidores de respaldo

\`\`\`nginx
upstream mi_app {
    # weight: recibe proporcionalmente más tráfico
    server backend1:3000 weight=3;   # recibe 3/5 del tráfico
    server backend2:3000 weight=2;   # recibe 2/5 del tráfico

    # backup: solo recibe tráfico cuando todos los demás están caídos
    server backend3:3000 backup;

    # down: marcado manualmente como fuera de servicio
    server backend4:3000 down;
}
\`\`\`

Los pesos son relativos. Con \`weight=3\` y \`weight=2\`, de cada 5 peticiones, 3 van al primero y 2 al segundo.

### 📖 Parámetros de servidor en upstream

\`\`\`nginx
upstream mi_app {
    server backend1:3000
        weight=2
        max_fails=3          # fallos antes de marcar como inactivo
        fail_timeout=30s;    # tiempo en inactivo tras max_fails

    server backend2:3000
        max_fails=3
        fail_timeout=30s;

    # Conexiones keepalive con el backend (nginx → backend)
    keepalive 32;
}
\`\`\`

\`keepalive 32\` mantiene hasta 32 conexiones persistentes con los backends. Reduce el overhead de TCP handshake en backends con muchas peticiones. Requiere también:

\`\`\`nginx
location / {
    proxy_pass http://mi_app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";   # elimina el header Connection: close
}
\`\`\`

### 📖 Comparativa de algoritmos

\`\`\`diagram
{"type":"table-like","title":"Algoritmos de balanceo","rows":[{"key":"round-robin","value":"peticiones uniformes, backends iguales · sin afinidad de sesión"},{"key":"least_conn","value":"tiempos de respuesta variables · sin afinidad de sesión"},{"key":"ip_hash","value":"sesiones en memoria, sin Redis · afinidad por IP"},{"key":"hash uri","value":"caché por URL distribuida · afinidad por URI"},{"key":"random","value":"alta concurrencia, nginx 1.15+ · sin afinidad de sesión"}]}
\`\`\`

### 📋 Lo que debes recordar

* Sin directiva de balanceo, nginx usa round-robin — el más simple y suficiente para la mayoría de casos.
* \`least_conn\` es mejor que round-robin cuando las peticiones tienen duración variable.
* \`ip_hash\` resuelve la afinidad de sesión pero concentra tráfico si muchos usuarios vienen del mismo NAT.
* \`keepalive\` en upstream reduce overhead TCP — siempre activarlo junto con \`proxy_http_version 1.1\`.

### 🧪 Autoevaluación

1. Tienes tres backends: uno con 8 cores y dos con 4 cores. ¿Qué configuración de upstream usarías?
2. ¿Por qué \`ip_hash\` puede causar distribución desigual en entornos corporativos?
3. ¿Qué hace \`keepalive 32\` en un bloque upstream y qué header hay que eliminar para que funcione?

---

1. Round-robin con pesos: \`server backend1:3000 weight=2; server backend2:3000 weight=1; server backend3:3000 weight=1;\`. El servidor con más cores recibe el doble de tráfico. Alternativamente, \`least_conn\` si las peticiones son heterogéneas, ya que se ajusta dinámicamente a la capacidad real.
2. En entornos corporativos, muchos usuarios comparten la misma IP pública (NAT). Con \`ip_hash\`, todos esos usuarios siempre van al mismo backend, creando un punto de sobrecarga mientras otros backends están infrautilizados. La solución es usar \`hash \$cookie_sessionid\` o migrar a sesiones en Redis para poder usar round-robin.
3. \`keepalive 32\` instruye a nginx a mantener hasta 32 conexiones TCP persistentes (en estado keepalive) con los servidores del upstream. Esto evita el overhead de crear y cerrar una conexión TCP nueva por cada petición. Para que funcione, la petición debe ir con HTTP/1.1 (que soporta keepalive) y sin el header \`Connection: close\`, por eso se necesita \`proxy_http_version 1.1\` y \`proxy_set_header Connection ""\`.
`

export default content
