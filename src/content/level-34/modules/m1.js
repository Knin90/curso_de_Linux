const content = `
## Módulo 1 — Arquitectura Redis: single-thread, event loop y estructuras de datos

### 🎯 Objetivos de aprendizaje
* Entender por qué Redis es single-threaded y cómo eso le permite ser tan rápido
* Conocer el event loop de Redis y cómo procesa miles de conexiones concurrentes
* Dominar las estructuras de datos nativas y cuándo usar cada una
* Manejar TTLs, naming conventions y comandos de diagnóstico

### ❓ El problema real

Tu equipo acaba de migrar la API de perfil de usuario a Redis como caché. En las primeras horas todo va bien, pero el DBA pregunta: "¿Por qué usamos Redis si es single-threaded? ¿No sería más rápido algo multihilo?" El líder técnico espera que tú expliques la arquitectura con argumentos sólidos y datos reales del servidor.

### 📖 Por qué single-threaded no significa lento

Redis procesa comandos en un único hilo. Esto suena como una limitación, pero en la práctica es una fortaleza por dos razones:

**1. I/O multiplexing con epoll/kqueue**

Redis no bloquea esperando que un cliente envíe datos. Usa \`epoll\` (Linux) o \`kqueue\` (BSD/macOS) para monitorear miles de file descriptors simultáneamente con una sola llamada al sistema. Cuando un socket tiene datos listos, el event loop lo recoge y procesa el comando. No hay hilos bloqueados, no hay context switches.

**2. Operaciones en memoria, sin lock contention**

Todos los datos viven en RAM. Leer o escribir una clave es una operación de nanosegundos. Al no tener múltiples hilos accediendo a las mismas estructuras, no hay mutexes, no hay deadlocks, no hay el overhead de sincronización que destruye el rendimiento en sistemas multihilo con alta contención.

El resultado: Redis puede servir 100.000+ operaciones por segundo en hardware commodity.

> A partir de Redis 6.0 se agregaron I/O threads para paralelizar la lectura/escritura de red, pero el procesamiento de comandos sigue siendo single-threaded. Redis 7.x mantiene este modelo.

### 📖 El event loop en detalle

El ciclo de vida de una petición en Redis:

\`\`\`
1. epoll_wait() detecta que el socket del cliente tiene datos
2. Redis lee el comando completo del buffer del socket
3. El parser RESP descodifica el comando
4. El command dispatcher busca la función handler
5. El handler ejecuta la operación sobre la estructura de datos en RAM
6. La respuesta se escribe en el output buffer del cliente
7. epoll monitorea el socket para el siguiente write
\`\`\`

Todo ocurre en el mismo hilo, en orden estricto. Por eso los comandos de Redis son atómicos por definición: nunca hay dos comandos ejecutándose a la vez.

### 📖 Estructuras de datos

#### String

El tipo más básico. Puede contener texto, números o datos binarios (hasta 512 MB).

\`\`\`bash
# SET con opciones
redis-cli SET user:1001:name "Ana García" EX 3600 NX
# EX = expire en segundos, NX = solo si no existe

redis-cli GET user:1001:name

# Incremento atómico — útil para contadores
redis-cli SET page:views:home 0
redis-cli INCR page:views:home
redis-cli INCRBY page:views:home 5
redis-cli GET page:views:home

# Almacenar JSON serializado
redis-cli SET user:1001:profile '{"name":"Ana","plan":"pro","created":1700000000}'
redis-cli GET user:1001:profile
\`\`\`

#### Hash

Ideal para representar objetos con múltiples campos. Más eficiente en memoria que múltiples claves String cuando el objeto tiene menos de 128 campos.

\`\`\`bash
redis-cli HSET user:1001 name "Ana García" email "ana@ejemplo.com" plan "pro" logins 42

# Leer un campo
redis-cli HGET user:1001 email

# Leer todos los campos
redis-cli HGETALL user:1001

# Incrementar campo numérico
redis-cli HINCRBY user:1001 logins 1

# Verificar si un campo existe
redis-cli HEXISTS user:1001 plan

# Eliminar un campo
redis-cli HDEL user:1001 plan
\`\`\`

#### List

Lista enlazada doblemente. Inserciones O(1) en ambos extremos. Acceso por índice O(N). Útil para colas, historial de actividad, feeds.

\`\`\`bash
# Push desde la izquierda (head)
redis-cli LPUSH notifications:user:1001 "Nuevo mensaje de Juan" "Tu pedido fue enviado"

# Push desde la derecha (tail)
redis-cli RPUSH queue:emails "welcome:ana@ejemplo.com" "invoice:ana@ejemplo.com"

# Leer sin eliminar
redis-cli LRANGE notifications:user:1001 0 -1   # todos los elementos
redis-cli LRANGE notifications:user:1001 0 4    # primeros 5

# Pop (elimina y retorna)
redis-cli LPOP queue:emails
redis-cli RPOP queue:emails

# Longitud
redis-cli LLEN notifications:user:1001

# Bloqueo — espera hasta que haya datos (útil para workers)
redis-cli BLPOP queue:emails 5   # timeout 5 segundos
\`\`\`

#### Set

Colección de strings únicos sin orden. Operaciones de conjunto O(1) para agregar/verificar/eliminar. Útil para tags, relaciones, presencia en tiempo real.

\`\`\`bash
redis-cli SADD product:1:tags "electronics" "sale" "featured"
redis-cli SADD product:2:tags "electronics" "new"

# Verificar membresía
redis-cli SISMEMBER product:1:tags "sale"

# Todos los miembros
redis-cli SMEMBERS product:1:tags

# Operaciones de conjunto
redis-cli SINTER product:1:tags product:2:tags   # intersección
redis-cli SUNION product:1:tags product:2:tags   # unión
redis-cli SDIFF product:1:tags product:2:tags    # diferencia

# Usuarios activos en los últimos 5 minutos
redis-cli SADD active:users:$(date +%s) "user:1001" "user:1002"
redis-cli SCARD active:users:$(date +%s)   # cardinalidad
\`\`\`

#### Sorted Set (ZSet)

Set con score numérico. Mantiene orden por score. O(log N) para inserción y búsqueda. El tipo más versátil: rankings, leaderboards, índices con rango.

\`\`\`bash
# Agregar con score
redis-cli ZADD leaderboard 9850 "player:alice" 7200 "player:bob" 12000 "player:carol"

# Rango por posición (ascendente)
redis-cli ZRANGE leaderboard 0 -1 WITHSCORES

# Rango descendente (top N)
redis-cli ZREVRANGE leaderboard 0 2 WITHSCORES

# Rango por score
redis-cli ZRANGEBYSCORE leaderboard 5000 10000 WITHSCORES

# Posición de un miembro
redis-cli ZRANK leaderboard "player:alice"      # posición ascendente
redis-cli ZREVRANK leaderboard "player:alice"   # posición descendente

# Incrementar score
redis-cli ZINCRBY leaderboard 500 "player:bob"
\`\`\`

#### HyperLogLog

Estructura probabilística para contar elementos únicos con error máximo de 0.81%. Usa solo 12 KB de memoria independientemente de la cantidad de elementos.

\`\`\`bash
# Agregar elementos (no los almacena, solo actualiza el estimador)
redis-cli PFADD unique:visitors:2024-01-15 "user:1001" "user:1002" "user:1003"
redis-cli PFADD unique:visitors:2024-01-16 "user:1001" "user:1004"

# Contar aproximado
redis-cli PFCOUNT unique:visitors:2024-01-15

# Merge de múltiples HyperLogLogs
redis-cli PFMERGE unique:visitors:week unique:visitors:2024-01-15 unique:visitors:2024-01-16
redis-cli PFCOUNT unique:visitors:week
\`\`\`

#### Geospatial

Almacena coordenadas y permite queries por radio o bounding box. Internamente usa Sorted Sets con el geohash como score.

\`\`\`bash
redis-cli GEOADD stores:madrid -3.7038 40.4168 "tienda:centro" -3.6895 40.4530 "tienda:norte"

# Distancia entre dos puntos
redis-cli GEODIST stores:madrid "tienda:centro" "tienda:norte" km

# Tiendas en radio de 5 km desde una posición
redis-cli GEOSEARCH stores:madrid FROMMEMBER "tienda:centro" BYRADIUS 5 km ASC
\`\`\`

### 📖 TTL: expiración de claves

\`\`\`bash
# Establecer TTL al crear la clave
redis-cli SET session:abc123 "user:1001" EX 1800   # 1800 segundos = 30 min

# Agregar TTL a clave existente
redis-cli SET config:feature_flags '{"dark_mode":true}'
redis-cli EXPIRE config:feature_flags 300   # 5 minutos

# TTL en milisegundos
redis-cli PEXPIRE config:feature_flags 300000

# Consultar TTL restante
redis-cli TTL session:abc123      # en segundos (-1 = no expira, -2 = no existe)
redis-cli PTTL session:abc123     # en milisegundos

# Eliminar el TTL (hacer la clave persistente)
redis-cli PERSIST session:abc123

# Verificar si la clave existe
redis-cli EXISTS session:abc123   # 1 = existe, 0 = no existe

# Tipo de la clave
redis-cli TYPE session:abc123
\`\`\`

### 📖 Naming conventions

Una convención consistente evita colisiones y facilita el mantenimiento:

\`\`\`
# Patrón recomendado: resource:id:field
user:1001:profile
user:1001:sessions
product:5432:inventory

# Con namespacing por aplicación
api:cache:user:1001
api:cache:product:5432

# Separadores alternativos (Redis no impone ninguno)
user#1001#name   # hash
user/1001/name   # slash (evitar — puede confundir con rutas)

# Evitar claves demasiado largas — cada carácter extra es memoria
# Mal:
application_users_profile_data_for_user_id_1001
# Bien:
usr:1001:profile
\`\`\`

### 📖 Comandos de diagnóstico

\`\`\`bash
# Información completa del servidor
redis-cli INFO all

# Secciones específicas
redis-cli INFO server      # versión, modo, OS, uptime
redis-cli INFO memory      # uso de RAM, fragmentation ratio
redis-cli INFO stats       # ops/sec, hits/misses, conexiones
redis-cli INFO clients     # clientes conectados, blocked
redis-cli INFO replication # rol, replicas conectadas

# Campos clave de INFO memory
# used_memory_human: RAM usada por los datos
# used_memory_rss_human: RAM reservada por el OS para el proceso
# mem_fragmentation_ratio: RSS / used_memory (ideal ~1.0-1.5)

# Campos clave de INFO stats
# total_commands_processed: total desde inicio
# instantaneous_ops_per_sec: throughput actual
# keyspace_hits / keyspace_misses: para calcular hit ratio
# evicted_keys: claves eliminadas por maxmemory

# Número total de claves por base de datos
redis-cli INFO keyspace

# Benchmark básico
redis-benchmark -h 127.0.0.1 -p 6379 -n 100000 -q
# -n = número de peticiones, -q = output resumido

# Benchmark de comandos específicos
redis-benchmark -h 127.0.0.1 -p 6379 -t set,get -n 100000 -q

# Benchmark con pipeling (simula clientes reales)
redis-benchmark -h 127.0.0.1 -p 6379 -n 100000 -P 16 -q

# Monitorear comandos en tiempo real (cuidado en producción — alto overhead)
redis-cli MONITOR

# Claves que coinciden con un patrón (nunca en producción con KEYS — bloquea)
redis-cli SCAN 0 MATCH "user:*" COUNT 100   # iterativo, no bloqueante
\`\`\`

### 📋 Lo que debes recordar
* Redis es single-threaded para el procesamiento de comandos — esto elimina lock contention y context switches, no es una limitación sino una decisión de diseño
* El I/O multiplexing con epoll permite manejar miles de conexiones sin hilos adicionales
* String, Hash, List, Set, ZSet son las estructuras core; HyperLogLog y Geospatial son especializadas
* Los comandos de Redis son atómicos por diseño — nunca se ejecutan dos a la vez
* Usa SCAN en lugar de KEYS en producción — KEYS bloquea el server hasta completar
* El naming convention \`resource:id:field\` es la convención más común y recomendada
* \`INFO memory\` y \`INFO stats\` son tus herramientas de diagnóstico diarias

### 🧪 Autoevaluación
1. ¿Por qué Redis puede manejar 100k+ ops/sec siendo single-threaded?
2. Tienes que almacenar un objeto de usuario con 15 campos y leer/actualizar campos individuales frecuentemente. ¿String o Hash? ¿Por qué?
3. ¿Cuál es la diferencia entre KEYS y SCAN y por qué nunca deberías usar KEYS en producción?

---

1. Porque las operaciones están en RAM (nanosegundos), usa I/O multiplexing para manejar miles de conexiones sin bloqueos, y elimina el overhead de context switches y lock contention que degradan sistemas multihilo.
2. Hash. Con String tendrías que serializar/deserializar el objeto completo para actualizar un campo. Con Hash, HGET/HSET operan sobre campos individuales directamente. Además, Redis optimiza Hashes pequeños (< 128 campos) en memoria usando ziplist/listpack.
3. KEYS hace un full scan de todas las claves y bloquea el event loop hasta completar — en una base de datos con millones de claves esto puede tomar segundos, dejando el servidor sin responder. SCAN itera incrementalmente, devolviendo un cursor que avanza en cada llamada, sin bloquear entre iteraciones.
`

export default content
