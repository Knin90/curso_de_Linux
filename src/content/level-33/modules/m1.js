const content = `
## Módulo 1 — Arquitectura PostgreSQL: procesos, WAL, MVCC y shared buffers

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura de procesos de PostgreSQL y el rol de cada proceso background.
* Comprender qué es el WAL y por qué es la base de durabilidad y replicación.
* Explicar MVCC y cómo permite lecturas sin bloqueos en producción.
* Interpretar métricas de shared_buffers y pg_stat_bgwriter para detectar presión de memoria.

### ❓ El problema real

El DBA junior acaba de habilitar una consulta analítica que escanea 200 millones de filas en producción. Cinco minutos después, el monitoreo muestra que la latencia de escritura se disparó de 2 ms a 800 ms. No hubo deadlocks, no hubo errores — pero la aplicación está lenta. ¿Por qué?

Sin entender cómo PostgreSQL gestiona su memoria (shared_buffers), cómo los checkpoints bloquean I/O, y cómo MVCC acumula dead tuples que eventualmente fragmentan los índices, no es posible diagnosticar este tipo de problema. La arquitectura interna de PostgreSQL no es trivia académica: es la herramienta de diagnóstico más poderosa que tiene un DBA.

### 📖 El proceso postmaster y la arquitectura multi-proceso

PostgreSQL usa un modelo multi-proceso (no multi-hilo). Cuando el servicio arranca, el proceso inicial se llama **postmaster**. Su única responsabilidad es escuchar conexiones entrantes y hacer fork de un proceso backend por cada cliente que se conecta.

\`\`\`text
PROCESO                 PID     DESCRIPCIÓN
────────────────────────────────────────────────────────────────────
postgres: postmaster    1234    Proceso principal — escucha en :5432
postgres: bgwriter      1235    Escribe dirty pages al disco
postgres: checkpointer  1236    Ejecuta checkpoints periódicos
postgres: walwriter     1237    Flushea WAL buffers al disco
postgres: autovacuum    1238    Vacuum automático de tablas
postgres: stats coll.   1239    Recopila estadísticas de acceso
postgres: backend       1401    Proceso de sesión del cliente "app"
postgres: backend       1402    Proceso de sesión del cliente "web"
\`\`\`

Cada backend es un proceso independiente con su propio espacio de memoria local (work_mem, etc.) que además accede a la memoria compartida (shared_buffers). Esta arquitectura tiene una consecuencia crítica: **max_connections** es un límite real, no solo un número de configuración. Cada backend consume entre 5 y 10 MB de RAM solo para estructuras internas. 300 conexiones = hasta 3 GB de RAM solo en overhead de procesos.

\`\`\`bash
# Ver todos los procesos PostgreSQL en producción
ps aux | grep postgres | grep -v grep

# Ver conexiones activas desde dentro de psql
SELECT pid, usename, application_name, client_addr, state, query_start, state_change
FROM pg_stat_activity
WHERE datname = 'myapp'
ORDER BY query_start;
\`\`\`

### 📖 Procesos background y su rol en producción

**bgwriter (Background Writer)**
Su trabajo es tomar dirty pages (páginas modificadas en shared_buffers) y escribirlas al disco de forma proactiva, antes de que un checkpoint las necesite. Esto suaviza los picos de I/O. Si bgwriter no avanza lo suficiente, los backends tienen que escribir ellos mismos, aumentando la latencia de cada operación de escritura.

\`\`\`sql
-- Monitorear actividad de bgwriter
SELECT
  buffers_checkpoint,   -- páginas escritas durante checkpoints
  buffers_clean,        -- páginas escritas por bgwriter proactivamente
  buffers_backend,      -- páginas escritas directamente por backends (malo)
  buffers_alloc,        -- buffers nuevos asignados
  checkpoints_timed,    -- checkpoints por tiempo (normal)
  checkpoints_req       -- checkpoints forzados (señal de presión)
FROM pg_stat_bgwriter;
\`\`\`

Si \`buffers_backend\` es alto en proporción a \`buffers_clean\`, bgwriter no está haciendo su trabajo a tiempo. Parámetros relevantes: \`bgwriter_delay\`, \`bgwriter_lru_maxpages\`, \`bgwriter_lru_multiplier\`.

**checkpointer**
Un checkpoint es el momento en que PostgreSQL garantiza que todos los dirty buffers han sido escritos al disco y el WAL hasta ese punto es redundante. Los checkpoints ocurren cada \`checkpoint_timeout\` segundos (default: 5 minutos) o cuando el WAL alcanza \`max_wal_size\`. Los checkpoints son la fuente de picos de I/O más común en producción.

\`\`\`text
checkpoint_completion_target = 0.9   # Distribuir I/O en el 90% del intervalo
checkpoint_timeout = 5min            # Máximo tiempo entre checkpoints
max_wal_size = 1GB                   # Máximo WAL acumulado antes de forzar checkpoint
\`\`\`

**walwriter**
Flushea los WAL buffers en memoria (\`wal_buffers\`) al archivo WAL en disco. Esto ocurre cada \`wal_writer_delay\` (default: 200ms) o cuando un commit lo exige. En sistemas con muchas escrituras, \`wal_buffers = 64MB\` reduce la contención.

**autovacuum**
Esencial para MVCC (ver siguiente sección). Ejecuta VACUUM en segundo plano para limpiar dead tuples. Sin autovacuum funcionando correctamente, las tablas crecen indefinidamente aunque se borren filas, los índices se fragmentan, y las consultas se degradan. Monitoreo:

\`\`\`sql
-- Tablas con mayor acumulación de dead tuples
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
\`\`\`

### 📖 shared_buffers: la memoria caché de PostgreSQL

\`shared_buffers\` es el pool de memoria compartida donde PostgreSQL cachea las páginas de datos (bloques de 8 KB). Es la memoria más importante que se puede configurar.

\`\`\`text
Regla de producción:
  shared_buffers = 25% de la RAM total del servidor

  Servidor 16 GB → shared_buffers = 4GB
  Servidor 32 GB → shared_buffers = 8GB
  Servidor 64 GB → shared_buffers = 16GB  (máximo práctico ~16-32 GB)
\`\`\`

El sistema operativo también tiene su propia caché (page cache). PostgreSQL depende de ambas capas. \`effective_cache_size\` no asigna memoria — solo le dice al planificador cuánta memoria total (shared_buffers + OS page cache) puede asumir que está disponible para caching. Este valor influye en si el planificador elige index scans vs sequential scans.

\`\`\`sql
-- Ver estado actual del buffer cache
SELECT
  count(*) AS total_buffers,
  count(*) FILTER (WHERE isdirty) AS dirty_buffers,
  round(100.0 * count(*) FILTER (WHERE isdirty) / count(*), 2) AS dirty_pct
FROM pg_buffercache;

-- Requiere extensión pg_buffercache
CREATE EXTENSION IF NOT EXISTS pg_buffercache;
\`\`\`

### 📖 WAL: Write-Ahead Log

El WAL (Write-Ahead Log) es el mecanismo de durabilidad de PostgreSQL. La regla fundamental es: **ningún dato modificado se considera commiteado hasta que su registro WAL haya sido escrito (flusheado) al disco**.

¿Por qué? Escribir al WAL es secuencial y barato. Modificar las páginas de datos en shared_buffers y forzar su escritura al disco en cada commit sería extremadamente costoso. El WAL permite que PostgreSQL confirme transacciones rápidamente (solo escribe al log secuencial) y escriba los datos reales al disco de forma asíncrona más tarde. Si el servidor crashea, PostgreSQL replay el WAL desde el último checkpoint para recuperar el estado consistente.

\`\`\`text
FLUJO DE UNA TRANSACCIÓN DE ESCRITURA:
  1. BEGIN → se inicia la transacción
  2. UPDATE → la página se modifica en shared_buffers (dirty page)
  3. WAL record → el cambio se registra en wal_buffers
  4. COMMIT → walwriter flushea wal_buffers al archivo WAL en disco
  5. El cliente recibe confirmación de éxito
  6. Más tarde: bgwriter/checkpointer escribe la página al disco

  Si el server crashea entre el paso 4 y el 6:
  → PostgreSQL replay el WAL al arrancar y reconstruye el estado
\`\`\`

**wal_level** controla cuánta información se incluye en el WAL:

\`\`\`text
wal_level = minimal    # Solo lo necesario para crash recovery (no sirve para replicación)
wal_level = replica    # Incluye info para streaming replication (default moderno)
wal_level = logical    # Incluye info para logical decoding/replication
\`\`\`

Para cualquier setup de producción con réplicas, \`wal_level = replica\` es el mínimo.

### 📖 MVCC: Multi-Version Concurrency Control

MVCC es la razón por la que PostgreSQL puede servir lecturas concurrentes sin bloquear a los escritores, y escrituras sin bloquear a los lectores. El precio es la acumulación de dead tuples.

**Cómo funciona**: cuando un UPDATE ocurre, PostgreSQL no modifica la fila en su lugar. En su lugar, **crea una nueva versión de la fila** y marca la versión anterior como expirada. La versión antigua no se borra inmediatamente — puede estar siendo leída por transacciones que la vieron antes del UPDATE.

\`\`\`text
FILA ORIGINAL (xmin=100, xmax=0):
  id=1, nombre='Alice', salary=50000

DESPUÉS DE UPDATE (UPDATE SET salary=60000):
  id=1, nombre='Alice', salary=50000  (xmin=100, xmax=150)  ← dead tuple
  id=1, nombre='Alice', salary=60000  (xmin=150, xmax=0)    ← versión actual

  xmin: transaction ID que insertó la fila
  xmax: transaction ID que la expiró (o 0 si sigue activa)

Transacción 140 (snapshot anterior al UPDATE):
  → Ve salary=50000 (xmax=150 > su snapshot → esa versión no existe para ella)

Transacción 160 (snapshot posterior al UPDATE):
  → Ve salary=60000
\`\`\`

Cada transacción tiene un **snapshot** que define qué versiones de filas puede ver. Esto elimina la necesidad de bloqueos para lecturas — cada transacción lee su versión del mundo sin interferir con otras.

**El problema: dead tuples y VACUUM**

Las versiones antiguas de filas (dead tuples) ocupan espacio en disco y en los índices. VACUUM limpia estas filas. Sin VACUUM, las tablas con muchos UPDATEs/DELETEs crecen indefinidamente (table bloat) aunque el número de filas activas sea pequeño.

\`\`\`sql
-- Ver bloat estimado en tablas
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  n_dead_tup,
  n_live_tup,
  round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
\`\`\`

### 📖 Estructura de directorios en disco

\`\`\`text
/var/lib/postgresql/16/main/       ← PGDATA — directorio raíz del cluster
├── base/                          ← Un subdirectorio por cada base de datos (OID)
│   ├── 1/                         ← template1
│   ├── 16384/                     ← myapp (OID asignado al crear la DB)
│   │   ├── 2619                   ← Archivo de una tabla (OID de pg_statistic)
│   │   └── 16389                  ← Archivo de tabla de usuario
├── global/                        ← Catálogos globales (pg_database, pg_roles)
├── pg_wal/                        ← Archivos WAL (segmentos de 16 MB por defecto)
│   ├── 000000010000000000000001
│   └── 000000010000000000000002
├── pg_xact/                       ← Estado de transacciones (commit/abort)
├── pg_hba.conf                    ← Autenticación de clientes
├── postgresql.conf                ← Configuración principal
├── postgresql.auto.conf           ← Parámetros modificados con ALTER SYSTEM
└── PG_VERSION                     ← Versión del cluster
\`\`\`

Nunca modificar archivos dentro de \`base/\` manualmente. El único acceso correcto es a través de PostgreSQL.

### 📋 Lo que debes recordar

* El postmaster hace fork de un backend por cada conexión — \`max_connections\` tiene coste real de RAM.
* \`buffers_backend\` alto en \`pg_stat_bgwriter\` indica que bgwriter no da abasto.
* \`shared_buffers = 25% RAM\` es el punto de partida; \`effective_cache_size = 75% RAM\`.
* WAL garantiza durabilidad: el commit solo es firme cuando el registro WAL está en disco.
* MVCC crea dead tuples en cada UPDATE/DELETE — autovacuum es obligatorio, no opcional.
* \`pg_stat_activity\` y \`pg_stat_user_tables\` son las vistas de diagnóstico principales.

### 🧪 Autoevaluación

1. ¿Qué proceso de PostgreSQL es responsable de escribir dirty pages al disco de forma proactiva entre checkpoints?
2. ¿Por qué un UPDATE en PostgreSQL crea dos versiones de la fila en lugar de modificarla in-place?
3. ¿Qué indica un valor alto de \`buffers_backend\` en pg_stat_bgwriter?

---

1. El proceso **bgwriter** (Background Writer) escribe dirty pages proactivamente. Si no lo hace a tiempo, los backends deben escribir ellos mismos, aumentando la latencia de escritura.
2. MVCC requiere que las transacciones vean un snapshot consistente de los datos. Modificar in-place haría invisible la versión anterior para las transacciones que la necesitan. La versión antigua permanece hasta que VACUUM confirma que ninguna transacción activa la necesita.
3. Indica que el bgwriter no está limpiando dirty pages con suficiente frecuencia y los procesos de sesión (backends) tienen que hacerlo ellos mismos, lo que introduce latencia en las consultas de los clientes.
`

export default content
