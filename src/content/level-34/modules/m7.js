const content = `
## Módulo 7 — Redis Cluster: sharding horizontal y distribución de datos

### 🎯 Objetivos de aprendizaje
* Comprender el modelo de hash slots y cómo Redis Cluster distribuye datos entre nodos
* Configurar un cluster de producción con réplicas usando redis-cli
* Usar hash tags para garantizar que claves relacionadas residan en el mismo slot
* Manejar las redirecciones MOVED y ASK desde las bibliotecas cliente
* Decidir cuándo usar Redis Cluster versus Redis Sentinel según los requisitos de escala y disponibilidad

### ❓ El problema real

Tu plataforma de e-commerce almacena sesiones de usuario, carrito, y catálogo de productos en Redis. Empiezas con 16 GB de RAM en el servidor Redis. Dieciocho meses después, el dataset creció a 40 GB y los picos de tráfico del Black Friday llevan la CPU a 95%. Agregar más RAM al servidor tiene un límite físico y económico. Necesitas distribuir la carga entre múltiples servidores.

Redis Cluster resuelve exactamente esto: distribuye los datos automáticamente entre N masters, cada uno responsable de una fracción del espacio de claves. Si un master falla, su réplica se promueve automáticamente. Obtienes tanto escala horizontal como alta disponibilidad en un mismo sistema.

### 📖 Hash slots: el modelo de distribución

Redis Cluster divide el espacio de claves en 16.384 slots. Cada clave pertenece a exactamente un slot, calculado con:

\`\`\`
slot = CRC16(clave) % 16384
\`\`\`

En un cluster de 3 masters, los slots se distribuyen así por defecto:
- Master 1: slots 0–5460
- Master 2: slots 5461–10922
- Master 3: slots 10923–16383

Cada master es el único que puede escribir en sus slots. Sus réplicas pueden servir lecturas (con \`READONLY\`).

**Verificar a qué slot pertenece una clave:**
\`\`\`bash
redis-cli CLUSTER KEYSLOT user:1001
# (integer) 4921   → este nodo es responsable de slots 0-5460: OK

redis-cli CLUSTER KEYSLOT product:5678
# (integer) 11234  → este slot pertenece al tercer master

redis-cli CLUSTER KEYSLOT session:abc123
# (integer) 9432
\`\`\`

### 📖 Hash tags: colocar claves relacionadas en el mismo slot

El problema con el hashing por defecto es que \`user:1001\`, \`cart:1001\`, y \`session:1001\` pueden terminar en slots distintos. Esto hace imposible usar operaciones multi-clave como \`MGET\`, \`MSET\`, o transacciones \`MULTI/EXEC\` con esas claves juntas.

La solución son los **hash tags**: si la clave contiene \`{...}\`, solo el texto dentro de las llaves se usa para calcular el slot.

\`\`\`bash
# Todas estas claves comparten el slot de "1001"
redis-cli CLUSTER KEYSLOT "{1001}.user"
# (integer) 4977
redis-cli CLUSTER KEYSLOT "{1001}.cart"
# (integer) 4977
redis-cli CLUSTER KEYSLOT "{1001}.sessions"
# (integer) 4977

# Ahora MGET funciona porque todas están en el mismo slot
MGET {1001}.user {1001}.cart {1001}.sessions

# Sin hash tags, esto fallaría con CROSSSLOT error:
MGET user:1001 cart:1001 session:1001
# Error: CROSSSLOT Keys in request don't hash to the same slot
\`\`\`

**Convenciones de naming recomendadas:**
\`\`\`bash
# Agrupar por entidad (usuario, pedido, sesión)
{user:1001}.profile
{user:1001}.preferences
{user:1001}.recent_orders

# Agrupar por tenant en SaaS
{tenant:acme}.config
{tenant:acme}.users
{tenant:acme}.billing

# Agrupar por partición lógica en time-series
{metrics:2024-01-15}.cpu
{metrics:2024-01-15}.mem
{metrics:2024-01-15}.net
\`\`\`

### 📖 Configurar Redis Cluster

**redis.conf para cada nodo (master o réplica):**
\`\`\`bash
port 6379
cluster-enabled yes
cluster-config-file nodes.conf      # archivo que Redis gestiona automáticamente
cluster-node-timeout 5000           # ms antes de considerar un nodo caído
cluster-announce-ip 192.168.1.10    # IP que anuncia a otros nodos (importante detrás de NAT)
appendonly yes                      # recomendado para durabilidad en cluster

# Autenticación (misma password en todos los nodos)
requirepass "cluster_password_segura"
masterauth "cluster_password_segura"
\`\`\`

**Iniciar los 6 nodos (3 masters + 3 réplicas):**
\`\`\`bash
# En cada servidor, arrancar Redis con su configuración
redis-server /etc/redis/cluster.conf

# Verificar que arrancó en modo cluster
redis-cli -p 6379 CLUSTER INFO | grep cluster_enabled
# cluster_enabled:1
\`\`\`

**Crear el cluster con redis-cli:**
\`\`\`bash
# --cluster-replicas 1 = una réplica por cada master
# Los primeros N/2 IPs son masters, el resto réplicas (N = total nodos)
redis-cli --cluster create \\
  192.168.1.10:6379 \\
  192.168.1.11:6379 \\
  192.168.1.12:6379 \\
  192.168.1.13:6379 \\
  192.168.1.14:6379 \\
  192.168.1.15:6379 \\
  --cluster-replicas 1 \\
  -a cluster_password_segura

# redis-cli muestra el plan de distribución de slots y pide confirmación:
# Master[0] -> Slots 0 - 5460
# Master[1] -> Slots 5461 - 10922
# Master[2] -> Slots 10923 - 16383
# Adding replica 192.168.1.13:6379 to 192.168.1.10:6379
# ...
# Can I set the above configuration? (type 'yes' to accept): yes
\`\`\`

### 📖 Inspeccionar el estado del cluster

\`\`\`bash
# Estado general del cluster
redis-cli -c -h 192.168.1.10 -p 6379 CLUSTER INFO
# cluster_state:ok
# cluster_slots_assigned:16384
# cluster_known_nodes:6
# cluster_size:3
# cluster_stats_messages_ping_sent:12345

# Ver todos los nodos, roles, y rangos de slots
redis-cli -c -h 192.168.1.10 -p 6379 CLUSTER NODES
# <id> 192.168.1.10:6379@16379 master - 0 1722862800000 1 connected 0-5460
# <id> 192.168.1.13:6379@16379 slave <id_master> 0 1722862800000 1 connected

# Estadísticas de uso por slot (útil para detectar distribución desigual)
redis-cli -c -h 192.168.1.10 -p 6379 CLUSTER SLOTS

# Modo cluster-aware (-c): redirige automáticamente al nodo correcto
redis-cli -c -h 192.168.1.10 -p 6379
> SET product:9999 "laptop"
# -> Redirected to slot [12679] located at 192.168.1.12:6379
# OK
\`\`\`

### 📖 Resharding: mover slots entre nodos

Cuando agregas un nuevo master al cluster, necesitas migrar slots hacia él para equilibrar la carga.

\`\`\`bash
# Agregar un nuevo nodo master al cluster
redis-cli --cluster add-node \\
  192.168.1.16:6379 \\       # nuevo nodo
  192.168.1.10:6379 \\       # nodo existente del cluster
  -a cluster_password_segura

# Redistribuir slots al nuevo nodo
redis-cli --cluster reshard 192.168.1.10:6379 \\
  -a cluster_password_segura
# Pregunta interactiva:
# How many slots do you want to move (from 1 to 16384)? 1365
# What is the receiving node ID? <ID del nuevo nodo>
# Source node #1: all   (toma slots de todos los masters existentes uniformemente)

# Verificar distribución final
redis-cli --cluster check 192.168.1.10:6379 -a cluster_password_segura

# Agregar réplica al nuevo master
redis-cli --cluster add-node \\
  192.168.1.17:6379 \\       # nueva réplica
  192.168.1.10:6379 \\       # nodo del cluster
  --cluster-slave \\
  --cluster-master-id <ID del nuevo master> \\
  -a cluster_password_segura
\`\`\`

### 📖 Redirecciones MOVED y ASK

Cuando un cliente envía un comando a un nodo que no es responsable del slot de la clave, recibe una redirección:

\`\`\`bash
# Sin modo cluster-aware (-c), redis-cli muestra la redirección:
redis-cli -h 192.168.1.10 -p 6379 GET product:9999
# (error) MOVED 12679 192.168.1.12:6379
# El número es el slot; la IP:puerto es el nodo correcto

# MOVED: redirección permanente (clave vive en ese nodo definitivamente)
# ASK: redirección temporal durante una migración de slot en progreso
\`\`\`

Las bibliotecas cliente modernas manejan esto automáticamente:

**Python con redis-py (cluster mode):**
\`\`\`python
from redis.cluster import RedisCluster

rc = RedisCluster(
    startup_nodes=[
        {"host": "192.168.1.10", "port": 6379},
        {"host": "192.168.1.11", "port": 6379},
    ],
    decode_responses=True,
    password="cluster_password_segura",
    skip_full_coverage_check=False,  # verificar que todos los slots están asignados
)

rc.set("{user:1001}.profile", '{"name":"Ana","plan":"pro"}')
rc.set("{user:1001}.cart", '["item_42","item_99"]')

# MGET funciona porque ambas claves tienen el mismo hash tag
valores = rc.mget("{user:1001}.profile", "{user:1001}.cart")
\`\`\`

**Node.js con ioredis (cluster mode):**
\`\`\`javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: '192.168.1.10', port: 6379 },
  { host: '192.168.1.11', port: 6379 },
  { host: '192.168.1.12', port: 6379 },
], {
  redisOptions: { password: 'cluster_password_segura' },
  scaleReads: 'slave',    // distribuir lecturas entre réplicas
});

await cluster.set('{user:1001}.session', 'token_xyz', 'EX', 3600);
const session = await cluster.get('{user:1001}.session');
\`\`\`

### 📖 Limitaciones de Redis Cluster

**Operaciones multi-clave:** \`MGET\`, \`MSET\`, \`SUNION\`, \`SINTERSTORE\` y otras solo funcionan si todas las claves involucradas pertenecen al mismo slot. Usa hash tags o rediseña las operaciones.

**Transacciones limitadas:** \`MULTI/EXEC\` solo puede incluir claves del mismo slot.

**Bases de datos múltiples:** Cluster solo soporta la base de datos 0. \`SELECT 1\` no funciona.

**Lua scripts:** el script solo puede acceder a claves del mismo slot; debe declarar todas las claves en el array \`KEYS[]\` para que el cluster pueda enrutarlo.

### 📖 Sentinel vs Cluster: tabla de decisión

| Criterio | Redis Sentinel | Redis Cluster |
|---|---|---|
| Alta disponibilidad | Sí (failover automático) | Sí (failover automático) |
| Escala horizontal | No | Sí |
| Datos en múltiples nodos | No | Sí |
| MGET/MSET entre nodos | Sí | Solo con hash tags |
| SELECT (múltiples DBs) | Sí | No (solo DB 0) |
| Complejidad operacional | Media | Alta |
| Caso de uso ideal | Dataset < 1 nodo, necesitas HA | Dataset > 1 nodo o throughput alto |

### 📋 Lo que debes recordar
* Redis Cluster usa 16.384 hash slots distribuidos entre masters; cada clave pertenece a un slot calculado por CRC16
* Los hash tags \`{...}\` fuerzan que claves relacionadas caigan en el mismo slot, habilitando MGET y transacciones
* El cluster requiere mínimo 3 masters para poder realizar failover; con réplicas, al menos 6 nodos en producción
* MOVED es una redirección permanente; ASK es temporal durante migraciones — las bibliotecas modernas las manejan automáticamente
* Usa Sentinel cuando el dataset cabe en un nodo pero necesitas HA; usa Cluster cuando necesitas escala horizontal

### 🧪 Autoevaluación
1. Tienes las claves \`order:9001\`, \`payment:9001\`, y \`shipment:9001\`. Un colega propone usar \`MGET\` en un cluster. ¿Funcionará? ¿Cómo lo corregirías sin cambiar la lógica de la aplicación?
2. Un cliente envía \`GET producto:5000\` al master 1 (slots 0–5460), pero esa clave está en el slot 11200 (master 3). ¿Qué responde el cluster y cómo lo maneja redis-py automáticamente?
3. ¿Por qué Redis Cluster no soporta SELECT para múltiples bases de datos, y qué convención de naming usarías para reemplazar esa funcionalidad?

---

1. No funcionará. Las tres claves probablemente caen en slots distintos, causando un error CROSSSLOT. La corrección es renombrar las claves usando hash tags: \`{9001}.order\`, \`{9001}.payment\`, \`{9001}.shipment\`. El texto dentro de \`{}\` es "9001" para las tres, por lo que CRC16("9001") % 16384 da el mismo slot para todas. Ahora \`MGET {9001}.order {9001}.payment {9001}.shipment\` funciona correctamente.
2. El master 1 retorna \`(error) MOVED 11200 192.168.1.12:6379\`. El error incluye el número de slot y la dirección del nodo responsable. redis-py en modo cluster intercepta esta respuesta, actualiza su tabla interna de slot→nodo, y reenvía el comando directamente al master 3 de forma transparente. La aplicación no ve el error; recibe el valor de la clave como si no hubiera redireccionamiento.
3. En Cluster, cada slot debe asignarse a exactamente un nodo; soportar múltiples bases de datos requeriría multiplicar los 16.384 slots por el número de DBs, lo que haría el protocolo de coordinación impracticable. El reemplazo es usar prefijos en las claves: en lugar de \`SELECT 1; SET config global\`, se usa \`SET db1:config global\` en DB 0. En entornos multi-tenant se combina con hash tags: \`{tenant:acme}:config\`, \`{tenant:acme}:users\`.
`

export default content
