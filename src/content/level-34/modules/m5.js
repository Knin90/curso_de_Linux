const content = `
## Módulo 5 — Pub/Sub, streams y casos de uso avanzados

### 🎯 Objetivos de aprendizaje
* Implementar comunicación en tiempo real con Redis Pub/Sub y entender sus limitaciones
* Usar Redis Streams para mensajería confiable con grupos de consumidores
* Aplicar scripting Lua y transacciones para operaciones atómicas complejas
* Conocer HyperLogLog y datos geoespaciales como estructuras especializadas

### ❓ El problema real

Tu aplicación necesita notificar a los usuarios en tiempo real cuando un pedido cambia de estado. Empezas con Pub/Sub y funciona bien. Luego descubres que si un consumidor se desconecta 30 segundos, pierde todos los mensajes enviados durante ese tiempo. Necesitas un mecanismo confiable con historia y reintento: Redis Streams resuelve exactamente eso.

### 📖 Pub/Sub: mensajería en tiempo real

Pub/Sub es un modelo de mensajería donde los publicadores envían a un canal y los suscriptores reciben en tiempo real. Redis actúa de broker en memoria.

**Suscribirse a canales:**
\`\`\`bash
# Suscripción simple (bloqueante, espera mensajes)
redis-cli SUBSCRIBE orders:status

# Suscripción a múltiples canales
redis-cli SUBSCRIBE orders:status payments:events user:notifications

# Suscripción por patrón (glob)
redis-cli PSUBSCRIBE "orders:*"    # recibe de orders:status, orders:created, etc.
redis-cli PSUBSCRIBE "news.*"      # todos los canales que empiecen con news.

# Desuscribirse
UNSUBSCRIBE orders:status
PUNSUBSCRIBE "orders:*"
\`\`\`

**Publicar mensajes:**
\`\`\`bash
# Retorna el número de suscriptores que recibieron el mensaje
PUBLISH orders:status '{"order_id":5678,"status":"shipped","timestamp":1722862800}'
# (integer) 3   ← 3 suscriptores recibieron el mensaje

PUBLISH news.sports "Real Madrid ganó 3-0"
\`\`\`

**Inspeccionar el estado de Pub/Sub:**
\`\`\`bash
PUBSUB CHANNELS           # listar todos los canales activos
PUBSUB CHANNELS "orders:*"  # canales que coinciden con el patrón
PUBSUB NUMSUB orders:status  # número de suscriptores del canal
PUBSUB NUMPAT             # número de suscripciones por patrón activas
\`\`\`

**Limitaciones críticas de Pub/Sub:**
- **Sin persistencia**: si un suscriptor se desconecta, los mensajes enviados durante la ausencia se pierden permanentemente
- **Sin acknowledgment**: no hay forma de confirmar que un consumidor procesó el mensaje
- **Sin historial**: no puedes leer mensajes anteriores al momento de suscripción
- **Fire-and-forget**: publish retorna éxito aunque 0 suscriptores estén conectados

**Casos de uso apropiados:** notificaciones live (dashboards, chat), invalidación de caché distribuida entre instancias de la app, broadcasting de eventos donde perder algunos es aceptable.

### 📖 Redis Streams: mensajería confiable

Introducido en Redis 5.0, Streams combina log append-only con grupos de consumidores. Resuelve todas las limitaciones de Pub/Sub.

**Agregar mensajes al stream:**
\`\`\`bash
# ID auto-generado: timestamp_ms-secuencia
XADD mystream * event "order_created" order_id 5678 user_id 42
# Resultado: "1722862800123-0"

# ID explícito (útil para reproducibilidad)
XADD mystream 1722862800123-0 event "order_created" order_id 5678

# Limitar el tamaño del stream durante la escritura
XADD mystream MAXLEN ~1000 * event "page_view" url "/home"
# ~ = aproximado (más eficiente: usa MAXLEN exacto solo en puntos de bloque interno)
\`\`\`

**Leer mensajes:**
\`\`\`bash
XLEN mystream             # número total de mensajes

# Leer por rango de IDs
XRANGE mystream - +              # todos los mensajes (- = inicio, + = fin)
XRANGE mystream - + COUNT 10     # primeros 10 mensajes
XRANGE mystream 1722862800000-0 +  # desde timestamp específico

XREVRANGE mystream + - COUNT 5   # los 5 más recientes (orden inverso)

# Lectura bloqueante (espera nuevos mensajes)
XREAD COUNT 10 BLOCK 5000 STREAMS mystream \$
# \$ = solo mensajes nuevos desde ahora, 5000 = timeout en ms (0 = sin timeout)

# Leer desde un ID específico (útil para continuar desde donde se quedó)
XREAD COUNT 10 STREAMS mystream 1722862800123-0
\`\`\`

**Grupos de consumidores (consumer groups):**

Los grupos permiten distribuir mensajes entre múltiples consumidores con tracking de acknowledgment.

\`\`\`bash
# Crear grupo (empezar desde el inicio del stream)
XGROUP CREATE mystream mygroup 0 MKSTREAM

# Empezar solo con mensajes nuevos
XGROUP CREATE mystream mygroup \$

# Leer como parte de un grupo (> = solo mensajes no entregados aún)
XREADGROUP GROUP mygroup consumer1 COUNT 10 STREAMS mystream >

# Resultado: mensajes quedan en estado "pending" hasta acknowledgment
# Si consumer1 cae, los mensajes pending siguen en el grupo

# Acknowledger procesamiento exitoso
XACK mystream mygroup 1722862800123-0

# Ver mensajes pendientes (no acknowledgados)
XPENDING mystream mygroup - + 10
# Resultado: ID, consumidor, tiempo desde entrega, número de entregas

# Reasignar mensaje de consumidor caído a otro consumidor
XCLAIM mystream mygroup consumer2 60000 1722862800123-0
# 60000 = ms mínimo que el mensaje lleva pending antes de poder reclamarse

# Ver información del grupo
XINFO GROUPS mystream
XINFO CONSUMERS mystream mygroup
\`\`\`

**Gestión del tamaño del stream:**
\`\`\`bash
# Truncar a exactamente 1000 entradas (bloquea si el stream es grande)
XTRIM mystream MAXLEN 1000

# Truncar aproximadamente (recomendado en producción, más eficiente)
XTRIM mystream MAXLEN ~1000

# Borrar entrada específica
XDEL mystream 1722862800123-0
\`\`\`

**Pub/Sub vs Streams — tabla de decisión:**

| Aspecto | Pub/Sub | Streams |
|---|---|---|
| Persistencia | No | Sí |
| Historial | No | Sí |
| Acknowledgment | No | Sí (XACK) |
| Múltiples consumidores | Fan-out simultáneo | Distribución por grupo |
| Reintento ante fallo | Imposible | XPENDING + XCLAIM |
| Latencia | < 1 ms | < 2 ms |
| Casos de uso | Notificaciones live | Queue confiable, event sourcing |

### 📖 Scripting Lua: operaciones atómicas complejas

Redis ejecuta scripts Lua de forma atómica: durante la ejecución del script, ningún otro cliente puede modificar las claves involucradas.

\`\`\`bash
# Sintaxis: EVAL script num_keys [key1 key2...] [arg1 arg2...]
# KEYS[1], KEYS[2]... son las claves; ARGV[1], ARGV[2]... son los argumentos

# Ejemplo: GET + SET atómico (compare-and-swap)
EVAL "
  local current = redis.call('GET', KEYS[1])
  if current == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2])
    return 1
  end
  return 0
" 1 mykey expected_value new_value

# Ejemplo: incrementar solo si existe la clave
EVAL "
  if redis.call('EXISTS', KEYS[1]) == 1 then
    return redis.call('INCR', KEYS[1])
  end
  return nil
" 1 counter:daily

# Cargar script para reutilizar por SHA (evita reenviar el código cada vez)
SCRIPT LOAD "return redis.call('SET', KEYS[1], ARGV[1])"
# Resultado: "e0e1f9fabfa9d353e91b04d94b7af95e09ea75b4"

EVALSHA e0e1f9fabfa9d353e91b04d94b7af95e09ea75b4 1 mykey myvalue
\`\`\`

### 📖 Transacciones con MULTI/EXEC y WATCH

**MULTI/EXEC:** agrupa comandos en un bloque atómico, pero sin lógica condicional.

\`\`\`bash
MULTI
SET account:1:balance 500
SET account:2:balance 1500
EXEC
# Ambas escrituras se aplican atomicamente o ninguna (si EXEC falla)

# Descartar la transacción
MULTI
SET key1 val1
DISCARD   # cancela todo
\`\`\`

**WATCH para optimistic locking:**

\`\`\`bash
WATCH account:1:balance    # monitorear la clave

# Si nadie modifica account:1:balance entre WATCH y EXEC, la transacción procede
MULTI
  DECRBY account:1:balance 100
  INCRBY account:2:balance 100
EXEC
# Si alguien modificó account:1:balance mientras tanto: EXEC retorna nil (transacción abortada)
# El cliente debe reintentar el ciclo WATCH → MULTI → EXEC
\`\`\`

### 📖 HyperLogLog: cardinalidad aproximada

HyperLogLog responde "¿cuántos elementos únicos hay?" con ~0.81% de error y usando solo 12 KB de memoria, independientemente del tamaño del conjunto.

\`\`\`bash
PFADD visitors:2024-01-15 user:1001 user:1002 user:1003 user:1001  # duplicados ignorados
PFCOUNT visitors:2024-01-15
# (integer) 3   ← conteo aproximado de únicos

# Merge de múltiples HyperLogLogs
PFADD visitors:2024-01-16 user:1004 user:1005
PFMERGE visitors:week:3 visitors:2024-01-15 visitors:2024-01-16
PFCOUNT visitors:week:3
# (integer) 5   ← únicos en la semana
\`\`\`

Comparativa: contar 1 millón de usuarios únicos con un Set exacto requiere ~8 MB; con HyperLogLog, siempre 12 KB.

**Casos de uso:** conteo de visitantes únicos, unique events en analytics, cardinalidad de queries en bases de datos.

### 📖 Geoespacial: distancias y proximidad

Redis incluye un índice geoespacial basado en sorted sets con encoding geohash.

\`\`\`bash
# Agregar ubicaciones (longitud, latitud, nombre)
GEOADD locations 13.361389 38.115556 "Palermo"
GEOADD locations 15.087269 37.502669 "Catania"
GEOADD locations -3.703790 40.416775 "Madrid"

# Distancia entre dos puntos
GEODIST locations Palermo Catania km
# "166.2742"

# Ubicaciones dentro de un radio
GEOSEARCH locations FROMMEMBER Palermo BYRADIUS 200 km ASC
# Palermo, Catania (ordenados por distancia)

# Coordenadas de un punto
GEOPOS locations Palermo
# "13.36138933897018433", "38.11555639549629859"

# Geohash string (para compartir o indexar externamente)
GEOHASH locations Palermo
# "sqc8b59zny0"
\`\`\`

### 📋 Lo que debes recordar
* Pub/Sub es fire-and-forget: sin persistencia, sin acknowledgment, sin historial; ideal para notificaciones donde perder mensajes es aceptable
* Redis Streams resuelve las limitaciones de Pub/Sub con persistencia, grupos de consumidores y reintento mediante XPENDING + XCLAIM
* Los scripts Lua son atómicos: ningún cliente puede interrumpir su ejecución, lo que permite compare-and-swap y otras operaciones compuestas
* WATCH implementa optimistic locking: la transacción aborta si la clave observada fue modificada entre WATCH y EXEC
* HyperLogLog permite contar elementos únicos con 0.81% de error usando solo 12 KB, sin importar la cardinalidad real

### 🧪 Autoevaluación
1. Un consumidor de tu Pub/Sub channel se desconecta 2 minutos. ¿Qué ocurre con los mensajes publicados durante ese tiempo, y cómo solucionarías el problema con Streams?
2. ¿Por qué un script Lua en Redis es más seguro que una secuencia de comandos individuales para implementar compare-and-swap?
3. Tu sistema necesita contar visitantes únicos diarios en un sitio con 50 millones de usuarios. Compara el uso de un Set de Redis vs HyperLogLog en términos de memoria.

---

1. Los mensajes se pierden permanentemente; Pub/Sub no tiene persistencia. Con Streams: XADD al producir, XREADGROUP con un consumer group al consumir, y XACK al procesar exitosamente. Si el consumidor cae, los mensajes quedan en XPENDING y pueden reclamarse con XCLAIM cuando el consumidor vuelve o se reasignan a otro.
2. Los comandos individuales no son atómicos entre sí: entre GET y SET, otro cliente puede modificar la clave, causando una race condition. Un script Lua ejecuta todos sus redis.call() de forma atómica; Redis no atiende a ningún otro cliente durante la ejecución del script, eliminando la race condition.
3. Un Set exacto de 50 millones de user IDs (enteros de 8 bytes cada uno) requiere ~400 MB. HyperLogLog siempre usa 12 KB con ~0.81% de error (~405,000 usuarios de margen en 50M). Para analytics donde una imprecisión de < 1% es aceptable, HyperLogLog es la elección clara: 33,000× menos memoria.
`

export default content
