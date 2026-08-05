const content = `
## Módulo 6 — Replicación streaming: primario y réplicas de lectura

### 🎯 Objetivos de aprendizaje
* Entender cómo funciona la replicación streaming basada en WAL
* Distinguir replicación síncrona y asíncrona, y elegir la apropiada para cada caso
* Configurar un primario y una réplica desde cero con \`pg_basebackup\`
* Monitorear el lag de replicación y detectar problemas antes de que impacten en producción
* Distribuir carga de lectura entre el primario y las réplicas

### ❓ El problema real
Tu base de datos primaria está al límite de CPU. El 70% de las consultas son
SELECT de reportes y dashboards. Podría haber una réplica de lectura que absorbiera
esa carga, pero nunca has configurado replicación en PostgreSQL y te preocupa la
complejidad. ¿Cómo funciona por dentro y cómo se configura de forma segura?

### 📖 Cómo funciona la replicación streaming

PostgreSQL registra cada cambio en el WAL (Write-Ahead Log): un diario secuencial
de operaciones. La replicación streaming envía bloques WAL del primario a la réplica
en tiempo real, antes incluso de que el primario confirme las transacciones al cliente
(en modo asíncrono) o al mismo tiempo (en modo síncrono).

Flujo simplificado:
\`\`\`
Aplicación → PRIMARY (escribe WAL) → WAL sender → [red] → WAL receiver → REPLICA
                                                                         (aplica WAL)
\`\`\`

La réplica está en "hot standby": acepta conexiones de lectura mientras aplica WAL.
Si el primario falla, la réplica puede promoverse a primario.

### 📖 Síncrono vs asíncrono

**Asíncrono (por defecto):**
- El primario confirma al cliente tan pronto como escribe el WAL localmente.
- La réplica recibe y aplica el WAL con un pequeño retraso (usualmente < 100 ms).
- Mayor rendimiento; riesgo de perder las últimas transacciones si el primario falla
  antes de que la réplica las consuma.
- Adecuado para réplicas de lectura y entornos donde se tolera algo de lag.

**Síncrono:**
- El primario espera la confirmación de al menos una réplica antes de responder
  al cliente.
- Sin pérdida de datos garantizada.
- Añade latencia a cada COMMIT (la latencia de red entre primario y réplica).
- Adecuado cuando la durabilidad es crítica (sistemas financieros, auditoría).

\`\`\`
# postgresql.conf del primario — modo síncrono
synchronous_commit = on
synchronous_standby_names = 'replica1'   # nombre en primary_conninfo de la réplica
\`\`\`

### 📖 Paso 1 — Configurar el primario

\`\`\`
# /etc/postgresql/15/main/postgresql.conf

wal_level = replica            # mínimo necesario para replicación
max_wal_senders = 5            # conexiones simultáneas de replicación
wal_keep_size = 1GB            # conservar WAL para réplicas con algo de lag
hot_standby = on               # permitir SELECT en réplicas

# Logging de replicación (opcional pero útil)
log_replication_commands = on
\`\`\`

\`\`\`
# /etc/postgresql/15/main/pg_hba.conf
# Permitir al usuario replicator conectarse desde la IP de la réplica
host  replication  replicator  192.168.1.101/32  scram-sha-256
\`\`\`

\`\`\`sql
-- Crear el usuario de replicación
CREATE USER replicator REPLICATION LOGIN PASSWORD 'replica-secret-password';
\`\`\`

Recarga la configuración sin reiniciar:
\`\`\`bash
pg_ctlcluster 15 main reload
# o
psql -U postgres -c "SELECT pg_reload_conf();"
\`\`\`

### 📖 Paso 2 — Inicializar la réplica con pg_basebackup

\`pg_basebackup\` copia el directorio de datos del primario y configura automáticamente
la réplica. Ejecuta esto en el servidor de la réplica:

\`\`\`bash
# Detener cualquier instancia existente en la réplica
pg_ctlcluster 15 main stop

# Eliminar el directorio de datos vacío que creó el instalador
rm -rf /var/lib/postgresql/15/main/*

# Clonar el primario
pg_basebackup \
  -h 192.168.1.100 \           # IP del primario
  -U replicator \
  -D /var/lib/postgresql/15/main \
  -P \                         # mostrar progreso
  -R \                         # crear standby.signal y primary_conninfo automáticamente
  -Xs                          # transmitir WAL durante la copia (no dejar brecha)

# La bandera -R genera:
#   standby.signal          (archivo vacío que indica que es réplica)
#   postgresql.auto.conf    (contiene primary_conninfo con host, user, password)
\`\`\`

Contenido típico de \`postgresql.auto.conf\` generado por \`-R\`:
\`\`\`
primary_conninfo = 'host=192.168.1.100 port=5432 user=replicator password=replica-secret-password'
\`\`\`

Arrancar la réplica:
\`\`\`bash
pg_ctlcluster 15 main start
\`\`\`

### 📖 Paso 3 — Verificar que la replicación funciona

**En el primario:**
\`\`\`sql
SELECT
  application_name,
  client_addr,
  state,           -- startup | catchup | streaming
  sent_lsn,        -- LSN enviado al réplica
  write_lsn,       -- LSN escrito en disco de la réplica
  flush_lsn,       -- LSN volcado (fsync) en la réplica
  replay_lsn,      -- LSN aplicado en la réplica
  write_lag,       -- retraso en escritura
  flush_lag,       -- retraso en flush
  replay_lag,      -- retraso en aplicación (el más importante)
  sync_state       -- async | sync | potential
FROM pg_stat_replication;
\`\`\`

Salida esperada cuando todo va bien:
\`\`\`
application_name | state     | replay_lag | sync_state
replica1         | streaming | 00:00:00.1 | async
\`\`\`

**En la réplica:**
\`\`\`sql
-- ¿Es esta instancia una réplica?
SELECT pg_is_in_recovery();   -- debe devolver: true

-- Estado del receptor WAL
SELECT
  status,
  receive_start_lsn,
  received_lsn,
  last_msg_send_time,
  last_msg_receipt_time,
  latency_ms
FROM pg_stat_wal_receiver;
\`\`\`

### 📖 Medir el lag en bytes y tiempo

\`\`\`sql
-- Lag en bytes (en el primario)
SELECT
  application_name,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- Si lag_bytes crece continuamente → la réplica no puede seguir el ritmo de escritura
-- Causas: red lenta, réplica sobrecargada, consultas largas bloqueando la aplicación del WAL
\`\`\`

### 📖 Distribuir carga de lectura

El objetivo principal de una réplica hot standby es absorber SELECT de reportes,
dashboards y consultas analíticas, liberando el primario para las escrituras.

Estrategias de distribución:
1. **Driver de la aplicación**: librerías como \`psycopg\` (Python), \`pgx\` (Go) o
   \`jdbc\` soportan configuración de host de lectura/escritura separados.
2. **PgBouncer con dos pools**: un pool apunta al primario (read-write), otro a
   la réplica (read-only). La aplicación elige según la operación.
3. **PgPool-II**: proxy con balanceo automático de lectura entre múltiples réplicas.
4. **DNS / Load Balancer**: two endpoints: \`db-primary.internal\` y \`db-replica.internal\`.

Ejemplo con psycopg3 (Python):
\`\`\`python
import psycopg

# Escrituras → primario
write_conn = psycopg.connect("host=db-primary.internal dbname=myapp user=appuser")

# Lecturas pesadas → réplica
read_conn = psycopg.connect("host=db-replica.internal dbname=myapp user=appuser")
\`\`\`

**Importante:** las réplicas pueden tener lag. No envíes a la réplica lecturas que
necesiten ver datos escritos hace menos de unos pocos cientos de milisegundos
(por ejemplo, leer el registro que acabas de insertar). Para eso usa el primario.

### 📖 Slots de replicación

Un slot de replicación garantiza que el primario no descarte el WAL que la réplica
aún no ha consumido.

\`\`\`sql
-- Crear slot físico
SELECT pg_create_physical_replication_slot('replica1_slot');

-- Ver slots y su lag
SELECT slot_name, active, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots;
\`\`\`

**Riesgo:** si la réplica se desconecta por mucho tiempo, el primario acumula WAL
indefinidamente hasta llenar el disco. Monitorea el lag de los slots con alertas.

Configuración más segura:
\`\`\`
# postgresql.conf — limitar WAL retenido sin slot
wal_keep_size = 1GB      # retener 1 GB sin slots
# Con slot, el primario retiene hasta que la réplica consuma
\`\`\`

### 📖 Promover una réplica (failover planeado)

Si necesitas hacer mantenimiento en el primario y quieres que la réplica tome el
control:

\`\`\`sql
-- En la réplica (PostgreSQL 12+)
SELECT pg_promote();
-- La réplica deja de ser standby y empieza a aceptar escrituras

-- Verificar que ya no es réplica:
SELECT pg_is_in_recovery();   -- debe devolver: false
\`\`\`

Para failover automático en caso de fallo del primario, usa herramientas como
\`Patroni\` (basado en etcd/Consul) o \`repmgr\`.

### 📋 Lo que debes recordar
* La replicación streaming envía WAL del primario a la réplica en tiempo real
* Asíncrono da más rendimiento; síncrono garantiza cero pérdida de datos a costa de latencia
* \`pg_basebackup -R\` crea la réplica y la configura automáticamente
* \`pg_stat_replication\` en el primario es tu panel de control de la replicación
* La réplica acepta solo SELECT (hot standby); úsala para descargar lecturas pesadas
* Los slots de replicación evitan que el primario descarte WAL necesario, pero pueden llenar el disco si la réplica se queda atrás
* \`pg_promote()\` convierte la réplica en primario para failover planeado

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre \`wal_level = minimal\` y \`wal_level = replica\`? ¿Por qué importa para la replicación?
2. Ves que \`replay_lag\` en \`pg_stat_replication\` está creciendo continuamente. ¿Qué causas posibles investigarías?
3. ¿Por qué es peligroso enviar a la réplica la lectura inmediata después de una escritura en el primario?

---

1. \`wal_level = minimal\` escribe solo lo necesario para recuperación ante fallos; no incluye suficiente información para replicación. \`wal_level = replica\` (o \`logical\`) añade datos extra al WAL que permiten a las réplicas reproducir los cambios. Sin \`replica\`, \`max_wal_senders\` no puede establecer conexiones de replicación funcionales.
2. Causas posibles: la réplica tiene menos CPU/disco que el primario y no puede aplicar WAL al ritmo que llega; hay consultas largas en la réplica que bloquean la aplicación del WAL (hot standby conflict); la red entre primario y réplica es lenta o con pérdida de paquetes; o el primario está bajo una carga de escritura inusualmente alta (batch, migración). Investigaría: \`pg_stat_activity\` en la réplica buscando consultas bloqueantes, métricas de red, y carga de I/O en la réplica.
3. Porque la réplica asíncrona puede estar algunos milisegundos (o más) por detrás del primario. Si escribes un registro en el primario y de inmediato lo lees desde la réplica, la réplica puede no haberlo recibido todavía y la lectura devolverá vacío o datos desactualizados. Para lecturas que deben ver datos recién escritos, hay que usar siempre el primario.
`

export default content
