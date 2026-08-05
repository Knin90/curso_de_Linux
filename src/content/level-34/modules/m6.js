const content = `
## Módulo 6 — Redis Sentinel: alta disponibilidad y failover automático

### 🎯 Objetivos de aprendizaje
* Entender por qué un nodo Redis único representa un single point of failure y cómo Sentinel lo elimina
* Configurar un conjunto Sentinel con quorum para monitoreo y failover automático
* Comprender el proceso completo de failover: SDOWN → ODOWN → elección de líder → promoción de réplica
* Conectar aplicaciones a Redis a través de Sentinel en lugar de la dirección del master directamente
* Monitorear el estado de Sentinel y conocer sus limitaciones frente a Redis Cluster

### ❓ El problema real

Son las 3 AM. Tu nodo Redis principal falla: disco lleno, OOM killer, fallo de red. Tu aplicación empieza a retornar errores 500. El equipo de on-call tarda 15 minutos en despertar, otros 10 en diagnosticar, otros 5 en promover manualmente la réplica. Treinta minutos de caída para una base de datos en memoria que puede recuperarse en segundos.

Redis Sentinel existe precisamente para este escenario. Es un sistema de alta disponibilidad que monitorea tus instancias Redis, detecta fallos automáticamente, y promueve una réplica a master sin intervención humana. El failover ocurre en segundos, no en minutos.

La trampa más común es desplegar Sentinel como si fuera suficiente para escalar horizontalmente. No lo es: Sentinel provee HA para un master único. Si necesitas distribuir datos entre nodos para escalar throughput o memoria, eso es Redis Cluster (módulo 7).

### 📖 Arquitectura de Sentinel

Un despliegue típico consiste en un master, dos o más réplicas, y tres procesos Sentinel que observan todo el conjunto.

\`\`\`
        ┌─────────────┐
        │ Sentinel 1  │
        │  :26379     │
        └──────┬──────┘
               │ monitorea
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Master │ │Replica │ │Replica │
│ :6379  │ │ :6380  │ │ :6381  │
└────────┘ └────────┘ └────────┘
    ▲          ▲
    │ monitorea│
┌──────────────────┐
│   Sentinel 2     │   Sentinel 3
│    :26379        │    :26379
└──────────────────┘
\`\`\`

Los Sentinels se comunican entre sí y con las instancias Redis. Para declarar que el master está caído (ODOWN — Objectively Down) se necesita que al menos \`quorum\` Sentinels coincidan en el diagnóstico. Por eso siempre se despliegan en número impar: 3 Sentinels con quorum 2 toleran que 1 Sentinel falle sin perder la capacidad de decidir.

### 📖 Configuración de Sentinel

Cada Sentinel tiene su propio archivo de configuración. A diferencia de redis.conf, sentinel.conf es reescrito por el proceso en tiempo de ejecución para persistir el estado del cluster.

**sentinel.conf en cada nodo Sentinel:**
\`\`\`bash
# Nombre del grupo monitoreado, dirección del master actual, puerto, quorum
sentinel monitor mymaster 192.168.1.10 6379 2

# Tiempo en ms sin respuesta para considerar una instancia SDOWN (Subjectively Down)
sentinel down-after-milliseconds mymaster 5000

# Máximo de réplicas que pueden sincronizar en paralelo durante el failover
# 1 = conservador (menos impacto en tráfico de lectura durante sync)
sentinel parallel-syncs mymaster 1

# Tiempo máximo en ms para completar el failover antes de considerarlo fallido
sentinel failover-timeout mymaster 60000

# Puerto en el que escucha este proceso Sentinel (default 26379)
port 26379

# Correr como daemon
daemonize yes
logfile /var/log/redis/sentinel.log
\`\`\`

**redis.conf del master:**
\`\`\`bash
port 6379
bind 192.168.1.10
requirepass "tu_password_segura"

# Si el master pierde todas las réplicas, puede seguir sirviendo escrituras
# (alternativa: min-replicas-to-write 1 para rechazar escrituras sin réplica)
\`\`\`

**redis.conf de cada réplica:**
\`\`\`bash
port 6380
bind 192.168.1.11
replicaof 192.168.1.10 6379
masterauth "tu_password_segura"
requirepass "tu_password_segura"   # necesario porque las réplicas pueden ser promovidas
\`\`\`

**Iniciar los procesos:**
\`\`\`bash
# En cada nodo Sentinel (los tres)
redis-sentinel /etc/redis/sentinel.conf
# Equivalente:
redis-server /etc/redis/sentinel.conf --sentinel

# Verificar que Sentinel arrancó y detectó al master
redis-cli -p 26379 SENTINEL masters
\`\`\`

### 📖 El proceso de failover paso a paso

Cuando el master deja de responder, el proceso sigue estos estados:

**1. SDOWN (Subjectively Down):**
Un único Sentinel no recibe respuesta del master durante \`down-after-milliseconds\`. Marca el master como SDOWN localmente pero no actúa aún.

**2. ODOWN (Objectively Down):**
El Sentinel que detectó SDOWN pregunta a los otros Sentinels si ellos también ven al master caído. Cuando al menos \`quorum\` Sentinels confirman, el estado pasa a ODOWN. Ahora el cluster acepta que el master está genuinamente caído.

**3. Elección del líder Sentinel:**
Los Sentinels eligen entre ellos un líder que coordinará el failover, usando un algoritmo similar a Raft. El primero que obtenga votos de la mayoría simple de Sentinels (no solo quorum) gana.

**4. Selección de la nueva réplica:**
El Sentinel líder selecciona la mejor réplica usando estos criterios en orden: menor \`slave-priority\`, mayor \`replication offset\` (más datos replicados), ID lexicográficamente menor como desempate.

**5. Promoción y reconfiguración:**
\`\`\`
SLAVEOF NO ONE     → se envía a la réplica seleccionada (se convierte en master)
REPLICAOF nuevo_master → se envía a las réplicas restantes
Sentinel actualiza sentinel.conf con el nuevo master
\`\`\`

**6. Notificación a clientes:**
Los clientes conectados vía Sentinel reciben notificación del nuevo master a través del mecanismo de discovery. Los clientes conectados directamente al master antiguo deben reconectar.

### 📖 Monitorear Sentinel

\`\`\`bash
# Estado de todos los masters monitoreados
redis-cli -p 26379 SENTINEL masters

# Réplicas conocidas de un master específico
redis-cli -p 26379 SENTINEL slaves mymaster
# En Redis >= 5.0.1, el comando se renombró:
redis-cli -p 26379 SENTINEL replicas mymaster

# Estado de los otros Sentinels conocidos
redis-cli -p 26379 SENTINEL sentinels mymaster

# Obtener la dirección actual del master (útil para scripts)
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
# 1) "192.168.1.10"
# 2) "6379"

# Forzar un failover manual (útil para testing o mantenimiento)
redis-cli -p 26379 SENTINEL failover mymaster

# Revisar el log para ver eventos de failover
tail -f /var/log/redis/sentinel.log
\`\`\`

### 📖 Conectar la aplicación a través de Sentinel

El error clásico es hardcodear la IP del master en la configuración de la aplicación. Cuando Sentinel promueve una réplica, esa IP ya no es válida y la aplicación sigue intentando conectarse al nodo caído.

La solución es conectarse a través de Sentinel: el cliente pregunta a uno de los Sentinels cuál es el master actual, y se conecta a esa dirección.

**Python con redis-py:**
\`\`\`python
from redis.sentinel import Sentinel

# Lista de todos los Sentinels (el cliente intentará cada uno si falla)
sentinel = Sentinel(
    [
        ('sentinel1.ejemplo.com', 26379),
        ('sentinel2.ejemplo.com', 26379),
        ('sentinel3.ejemplo.com', 26379),
    ],
    socket_timeout=0.5,
    password='tu_password_segura',         # para las instancias Redis
    sentinel_kwargs={'password': None},    # si los Sentinels no tienen password
)

# master_for: conexión de escritura (siempre apunta al master actual)
master = sentinel.master_for('mymaster', socket_timeout=0.5)

# slave_for: conexión de lectura (distribuye entre réplicas disponibles)
replica = sentinel.slave_for('mymaster', socket_timeout=0.5)

master.set('clave', 'valor')
valor = replica.get('clave')
\`\`\`

**Node.js con ioredis:**
\`\`\`javascript
const Redis = require('ioredis');

const redis = new Redis({
  sentinels: [
    { host: 'sentinel1.ejemplo.com', port: 26379 },
    { host: 'sentinel2.ejemplo.com', port: 26379 },
    { host: 'sentinel3.ejemplo.com', port: 26379 },
  ],
  name: 'mymaster',        // nombre del grupo en sentinel.conf
  password: 'tu_password_segura',
  sentinelPassword: null,  // si los Sentinels no tienen autenticación
});

await redis.set('clave', 'valor');
const valor = await redis.get('clave');
\`\`\`

Ambas bibliotecas manejan automáticamente la reconexión al nuevo master después de un failover, sin cambios en el código de la aplicación.

### 📖 Limitaciones de Sentinel

Sentinel resuelve HA para un master único, pero tiene límites importantes:

- **Escrituras solo al master**: toda escritura va a un nodo. Si el throughput de escritura supera la capacidad de un servidor, Sentinel no ayuda.
- **Datos en un solo nodo**: el conjunto de datos completo debe caber en la memoria de un servidor.
- **Ventana de pérdida de datos**: entre el último write replicado y el momento del fallo, los datos en flight se pierden. \`min-replicas-to-write\` puede reducir esta ventana a costa de disponibilidad.
- **No hay balanceo de escrituras**: no importa cuántas réplicas tengas, solo el master acepta escrituras.

Si necesitas superar estas limitaciones, la respuesta es Redis Cluster.

### 📋 Lo que debes recordar
* Siempre despliega un número impar de Sentinels (mínimo 3) con quorum = (n/2)+1 para tolerar fallos sin perder capacidad de decisión
* El failover sigue el ciclo SDOWN → ODOWN → elección de líder → promoción de réplica → notificación a clientes
* Conecta siempre la aplicación a través de Sentinel, nunca hardcodees la IP del master
* \`sentinel parallel-syncs 1\` reduce el impacto en réplicas que sirven lecturas durante la resincronización
* Sentinel provee HA para un master único; para escalar horizontalmente se necesita Redis Cluster

### 🧪 Autoevaluación
1. Tienes 4 Sentinels con quorum 2. Uno de los servidores Sentinel pierde conectividad de red. ¿Puede el sistema seguir realizando un failover automático si el master falla? ¿Por qué?
2. ¿Qué diferencia hay entre SDOWN y ODOWN, y por qué esta distinción es fundamental para evitar split-brain?
3. Tu aplicación Python tiene hardcodeada la IP del master Redis. El Sentinel realiza un failover exitoso. ¿Qué ocurre con las conexiones activas y cómo deberías corregir la arquitectura?

---

1. Sí, puede. Con 4 Sentinels y 1 caído quedan 3 operativos. Quorum es 2, y la mayoría simple para elección de líder también es 2 (de 4 total, aunque uno no vote). Los 3 Sentinels restantes pueden alcanzar quorum y elegir un líder, por lo que el failover procede normalmente.
2. SDOWN es el juicio subjetivo de un único Sentinel que no recibe respuesta; puede ser un problema de red local, un falso positivo. ODOWN requiere que al menos \`quorum\` Sentinels independientes confirmen el fallo, eliminando los falsos positivos por particiones de red parciales. Esta distinción evita split-brain: sin ella, un Sentinel aislado podría promover una réplica mientras el master original sigue sirviendo, resultando en dos masters simultáneos.
3. Las conexiones activas al master antiguo fallan inmediatamente (conexión rechazada o timeout). Las nuevas conexiones también fallan porque apuntan a la IP incorrecta. La corrección es usar redis-py con \`Sentinel([...], ...)\` y \`sentinel.master_for('mymaster')\`: el cliente consulta a los Sentinels por la dirección del master actual y reconecta automáticamente después del failover.
`

export default content
