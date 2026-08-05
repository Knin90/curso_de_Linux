const content = `
## Módulo 5 — Sesiones distribuidas y sticky sessions

### 🎯 Objetivos de aprendizaje

* Entender el problema de sesiones en entornos con múltiples servidores.
* Configurar sticky sessions con cookies en HAProxy.
* Implementar sesiones distribuidas con Redis como alternativa stateless.
* Evaluar los tradeoffs entre cada enfoque.

### ❓ El problema real

Un usuario inicia sesión en tu aplicación. HAProxy envía la primera petición al servidor web1, que crea la sesión PHP/Node/Rails en memoria local. La siguiente petición del mismo usuario llega a web2, que no tiene esa sesión: el usuario ve que fue deslogueado. Este problema afecta a cualquier aplicación que guarde estado en la memoria del proceso web, y es uno de los primeros problemas que aparecen al escalar horizontalmente.

### 📖 El problema de sesiones en detalle

\`\`\`text
Sin sticky sessions:
  Req 1 → web1 → crea session_id=abc123
  Req 2 → web2 → no encuentra session_id=abc123 → usuario deslogueado

Con sticky sessions:
  Req 1 → web1 → crea session_id=abc123
  Req 2 → HAProxy detecta cookie → envía a web1 → session encontrada

Con sesiones distribuidas (Redis):
  Req 1 → web1 → crea session_id=abc123 en Redis
  Req 2 → web2 → busca session_id=abc123 en Redis → session encontrada
  Cualquier servidor puede servir cualquier petición
\`\`\`

### 📖 Sticky sessions con cookies en HAProxy

HAProxy puede insertar una cookie para trackear a qué servidor fue asignado un cliente:

\`\`\`text
# /etc/haproxy/haproxy.cfg

backend web_servers
    balance roundrobin
    cookie SERVERID insert indirect nocache httponly secure

    server web1 10.0.1.11:8080 check cookie web1
    server web2 10.0.1.12:8080 check cookie web2
    server web3 10.0.1.13:8080 check cookie web3
\`\`\`

Opciones de la directiva \`cookie\`:

\`\`\`text
OPCIÓN       DESCRIPCIÓN
──────────────────────────────────────────────────────────────────────
insert       HAProxy inserta la cookie si no existe
indirect     No reenvía la cookie al backend (la gestiona HAProxy)
nocache      Añade Cache-Control para no cachear respuestas con cookie
httponly     Cookie no accesible desde JavaScript
secure       Cookie solo en HTTPS
preserve     Si el backend ya envía esta cookie, la usa en lugar de crear una
rewrite      Reescribe el valor de la cookie de sesión existente
\`\`\`

Flujo de sticky session:
\`\`\`text
1. Cliente → HAProxy (sin cookie SERVERID)
   HAProxy elige web1 por roundrobin
   HAProxy añade: Set-Cookie: SERVERID=web1; Path=/; HttpOnly; Secure

2. Cliente → HAProxy (con cookie SERVERID=web1)
   HAProxy lee la cookie y envía siempre a web1
   (no ejecuta el algoritmo de balanceo)
\`\`\`

### 📖 Problema de sticky sessions: servidor caído

\`\`\`text
Si web1 cae y un cliente tiene SERVERID=web1:
  → HAProxy detecta que web1 está DOWN por health check
  → Redirige al cliente a otro servidor disponible
  → La sesión se pierde (el nuevo servidor no tiene el estado)

Solución: configurar el behavior con on-server-error
\`\`\`

\`\`\`text
backend web_servers
    balance roundrobin
    cookie SERVERID insert indirect nocache httponly secure
    option redispatch        # si el servidor sticky cae, reasignar a otro
    retries 3

    server web1 10.0.1.11:8080 check cookie web1
    server web2 10.0.1.12:8080 check cookie web2
\`\`\`

### 📖 Solución real: sesiones distribuidas con Redis

La solución escalable es externalizar las sesiones a un store compartido:

\`\`\`bash
# Instalar Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server

# Configurar Redis para aceptar conexiones desde los web servers
sudo nano /etc/redis/redis.conf
\`\`\`

\`\`\`text
# /etc/redis/redis.conf
bind 0.0.0.0                # Escuchar en todas las interfaces (ajustar firewall)
requirepass tu_password_redis
maxmemory 512mb
maxmemory-policy allkeys-lru  # Evicción LRU cuando se llena
\`\`\`

Con sesiones en Redis, HAProxy no necesita sticky sessions — puede usar balance puro:

\`\`\`text
# HAProxy sin sticky sessions (stateless total)
backend web_servers
    balance leastconn
    option httpchk GET /health
    server web1 10.0.1.11:8080 check
    server web2 10.0.1.12:8080 check
    server web3 10.0.1.13:8080 check
\`\`\`

Cada framework tiene su adaptador de sesiones en Redis:

\`\`\`bash
# Node.js (Express + connect-redis)
npm install connect-redis redis express-session

# Python (Django)
pip install django-redis

# PHP (native session handler)
# En php.ini:
# session.save_handler = redis
# session.save_path = "tcp://10.0.1.50:6379?auth=tu_password"

# Ruby on Rails
# Gemfile: gem 'redis-session-store'
\`\`\`

### 📖 Comparativa de estrategias

\`\`\`text
ESTRATEGIA           PROS                    CONTRAS
────────────────────────────────────────────────────────────────────
Sticky sessions      Sin cambios en la app   Desbalance si caen servers
                     Simple de configurar    Sesión perdida si cae el server
                     Zero coste de infra     No escala bien a muchos nodes

Sesiones en Redis    Balanceo perfecto       Redis es un nuevo SPOF
                     Failover transparente   Latencia adicional (~1ms)
                     Escala horizontalmente  Cambios en la aplicación
                     Fácil de invalidar

JWT (stateless)      Sin servidor de sesión  Tokens no revocables fácilmente
                     Escala perfectamente    Tamaño de token en cada req
                     Sin state en ningún     Logout complicado
                     lado
\`\`\`

### 📋 Lo que debes recordar

* Sticky sessions resuelven el síntoma (sesión no encontrada) sin resolver el problema real (estado en memoria local del proceso).
* La cookie \`SERVERID\` la gestiona HAProxy, no la aplicación — el backend nunca la ve si usas \`indirect\`.
* Redis como session store es la solución estándar de producción — permite balanceo perfecto y failover transparente.
* Con sesiones en Redis, HAProxy puede usar \`leastconn\` o \`roundrobin\` sin restricciones.

### 🧪 Autoevaluación

1. ¿Por qué sticky sessions no son una solución escalable a largo plazo?
2. ¿Qué hace exactamente la opción \`redispatch\` en HAProxy?
3. ¿En qué escenario elegirías sticky sessions sobre sesiones en Redis?

---

1. Las sticky sessions crean desbalance de carga cuando algunos servidores acumulan más usuarios activos que otros. Además, si un servidor con muchos usuarios activos cae, todos esos usuarios pierden su sesión — es exactamente el problema de estado local que queríamos evitar. Y al escalar a 10-20 servidores, el desbalance se hace más pronunciado. Las sesiones distribuidas (Redis) eliminan el estado local y permiten balanceo perfecto.
2. \`option redispatch\` le indica a HAProxy que si un cliente tiene una sticky session hacia un servidor que está DOWN, en lugar de devolver un error 503, reintenta la petición en otro servidor disponible. Sin esta opción, el cliente recibiría un error hasta que el servidor original se recupere o la cookie expire. Con \`redispatch\`, el cliente continúa funcionando aunque pierda su sesión.
3. Sticky sessions son razonables cuando: la aplicación no puede modificarse para usar un session store externo (legacy code), el número de servidores es pequeño y estable (2-3 nodes), el presupuesto no permite Redis, o las sesiones son de corta duración y la pérdida ocasional es aceptable. En cualquier caso de escala real o alta disponibilidad estricta, Redis es la elección correcta.
`

export default content
