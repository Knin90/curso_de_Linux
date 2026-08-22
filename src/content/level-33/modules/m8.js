const content = `
## Módulo 8 — Proyecto real: PostgreSQL de producción completo

### 🎯 Objetivos de aprendizaje
* Instalar y configurar PostgreSQL con parámetros de memoria ajustados a producción
* Crear usuarios y bases de datos con los permisos mínimos necesarios
* Configurar replicación streaming desde cero (primario + réplica)
* Activar el archivado WAL para soporte completo de PITR
* Automatizar backups lógicos diarios con cron
* Monitorear el estado del servidor, la replicación y el archivado con vistas del sistema

### ❓ El problema real

Has estudiado cada pieza por separado: tuning de memoria, pg_hba.conf, replicación
streaming, archivado WAL, backups. Ahora tienes que unirlo todo en un despliegue real.

La empresa te entrega dos servidores frescos: \`db-primary\` (192.168.10.10) y
\`db-replica\` (192.168.10.11). El requisito es que al final del día tengas un servidor
PostgreSQL de producción con réplica de lectura activa, PITR configurado, y un backup
automático cada noche. Este laboratorio te lleva paso a paso hasta ese objetivo.

### 📖 Arquitectura del laboratorio

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"db-primary (192.168.10.10)","icon":"database","rows":["PostgreSQL 15 PRIMARY","Puerto: 5432","App user: appuser","App DB: myapp","Replication: replicator","archive_command → /backup/wal/, /backup/daily/"],"focal":true},{"title":"db-replica (192.168.10.11)","icon":"database","rows":["PostgreSQL 15 REPLICA","Puerto: 5432 (read-only)","hot standby: on","Recibe WAL vía streaming replication"]}],"vsLabel":"WAL streaming"}
\`\`\`

### 📖 Paso 1 — Instalar PostgreSQL en ambos servidores

Ejecuta esto en \`db-primary\` y \`db-replica\`:

\`\`\`bash
# Añadir repositorio oficial de PostgreSQL (Debian/Ubuntu)
apt-get install -y curl ca-certificates
install -d /usr/share/postgresql-common/pgdg
curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc

sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'

apt-get update
apt-get install -y postgresql-15

# Verificar que el servicio está activo
systemctl status postgresql
pg_lsclusters   # muestra todos los clusters instalados
\`\`\`

Crear los directorios de backup (solo en \`db-primary\`):

\`\`\`bash
mkdir -p /backup/wal /backup/daily
chown postgres:postgres /backup/wal /backup/daily
chmod 700 /backup/wal /backup/daily
\`\`\`

### 📖 Paso 2 — Configurar postgresql.conf (tuning de memoria)

Las reglas de oro para ajuste de memoria. Adapta los valores al RAM de tu servidor.
Ejemplo para un servidor con 16 GB de RAM dedicado a PostgreSQL:

\`\`\`bash
# Editar la configuración principal
nano /etc/postgresql/15/main/postgresql.conf
\`\`\`

\`\`\`
# ─── CONEXIONES ───────────────────────────────────────────────────────────────
max_connections = 100          # aumentar solo si hay razón concreta; cada conexión
                               # consume ~5-10 MB. Usar PgBouncer para más concurrencia.

# ─── MEMORIA ──────────────────────────────────────────────────────────────────
# shared_buffers: caché de páginas de PostgreSQL en RAM compartida.
# Regla: 25% del RAM del servidor.
shared_buffers = 4GB           # 25% de 16 GB

# effective_cache_size: estimación del caché total disponible (RAM + OS cache).
# No reserva memoria, solo informa al planificador para elegir mejores planes.
# Regla: 75% del RAM del servidor.
effective_cache_size = 12GB    # 75% de 16 GB

# work_mem: memoria por operación de sort/hash. Se multiplica por conexiones y por
# operaciones anidadas. Empieza conservador; aumenta si hay sorts en disco.
# Regla: RAM / max_connections / 2, o medir con EXPLAIN ANALYZE.
work_mem = 64MB

# maintenance_work_mem: para VACUUM, CREATE INDEX, ALTER TABLE, CLUSTER.
# Puede ser más generoso porque pocas operaciones corren a la vez.
maintenance_work_mem = 512MB

# ─── WAL Y CHECKPOINT ─────────────────────────────────────────────────────────
wal_level = replica            # necesario para replicación y PITR
max_wal_senders = 5            # réplicas + pg_basebackup simultáneos

# checkpoint_completion_target: distribuir escrituras de checkpoint en el tiempo.
# 0.9 = escribir durante el 90% del intervalo entre checkpoints (menos picos de I/O).
checkpoint_completion_target = 0.9

# wal_buffers: buffer en RAM para WAL antes de escribir al disco.
# -1 = automático (1/32 de shared_buffers, máx 64 MB). Normalmente suficiente.
wal_buffers = -1

# ─── PLANIFICADOR ─────────────────────────────────────────────────────────────
# random_page_cost: coste relativo de una lectura aleatoria de disco.
# En SSD, bajar a 1.1-1.5 para que el planificador prefiera index scans.
random_page_cost = 1.5         # para SSD; dejar en 4.0 para HDD

# ─── ARCHIVADO WAL (PITR) ─────────────────────────────────────────────────────
archive_mode = on
archive_command = 'test ! -f /backup/wal/%f && cp %p /backup/wal/%f'
archive_timeout = 300          # forzar switch WAL cada 5 min aunque no esté lleno

# ─── LOGGING ──────────────────────────────────────────────────────────────────
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB

log_min_duration_statement = 1000   # loguear queries que tarden más de 1 segundo
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0             # loguear todos los archivos temporales creados
\`\`\`

Aplicar los cambios (algunos requieren reinicio, otros solo reload):

\`\`\`bash
# Ver cuáles parámetros requieren reinicio
psql -U postgres -c "SELECT name, pending_restart FROM pg_settings WHERE pending_restart = true;"

# Reiniciar para aplicar shared_buffers, max_connections, etc.
systemctl restart postgresql

# Verificar que los cambios se aplicaron
psql -U postgres -c "SHOW shared_buffers; SHOW work_mem; SHOW max_connections;"
\`\`\`

### 📖 Paso 3 — Configurar pg_hba.conf

\`\`\`bash
nano /etc/postgresql/15/main/pg_hba.conf
\`\`\`

\`\`\`
# TYPE  DATABASE     USER          ADDRESS              METHOD

# Conexiones locales del superusuario (administración)
local   all          postgres                           peer

# Conexiones locales para aplicaciones (socket Unix)
local   all          appuser                            scram-sha-256

# Conexiones TCP desde la red interna
host    all          appuser       192.168.10.0/24      scram-sha-256

# Conexiones de replicación desde la réplica
host    replication  replicator    192.168.10.11/32     scram-sha-256

# Conexiones de administración desde red interna (con contraseña)
host    all          postgres      192.168.10.0/24      scram-sha-256
\`\`\`

\`\`\`bash
# Recargar sin reiniciar
systemctl reload postgresql
# o desde psql:
psql -U postgres -c "SELECT pg_reload_conf();"
\`\`\`

### 📖 Paso 4 — Crear el usuario y base de datos de la aplicación

\`\`\`sql
-- Conectarse como postgres
-- psql -U postgres

-- Usuario de replicación (para la réplica)
CREATE USER replicator
  REPLICATION
  LOGIN
  PASSWORD 'repl-strong-password-2024';

-- Usuario de la aplicación (mínimos privilegios)
CREATE USER appuser
  LOGIN
  PASSWORD 'app-strong-password-2024'
  CONNECTION LIMIT 50;   -- protección contra connection storms

-- Base de datos de la aplicación
CREATE DATABASE myapp
  OWNER appuser
  ENCODING 'UTF8'
  LC_COLLATE 'es_ES.UTF-8'
  LC_CTYPE 'es_ES.UTF-8'
  TEMPLATE template0;

-- Conectarse a myapp para configurar permisos
\c myapp

-- Esquema dedicado para la aplicación
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION appuser;

-- Asegurar que appuser no puede crear objetos en public
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO appuser;

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- análisis de queries
CREATE EXTENSION IF NOT EXISTS pgcrypto;             -- funciones criptográficas
\`\`\`

### 📖 Paso 5 — Crear tablas con índices apropiados

\`\`\`sql
-- Conectarse como appuser a myapp
-- psql -U appuser -d myapp

SET search_path = app, public;

-- Tabla de clientes
CREATE TABLE customers (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Tabla de pedidos
CREATE TABLE orders (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  BIGINT NOT NULL REFERENCES customers(id),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de líneas de pedido
CREATE TABLE order_items (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku         TEXT NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

-- Índices para las consultas más frecuentes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_customers_email ON customers(email);  -- ya lo crea UNIQUE, pero documentar
CREATE INDEX idx_customers_created_at ON customers(created_at DESC) WHERE is_active = true;

-- Tabla de auditoría con particionamiento por mes
CREATE TABLE audit_log (
  id          BIGSERIAL,
  table_name  TEXT NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  row_id      BIGINT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by  TEXT NOT NULL DEFAULT current_user
) PARTITION BY RANGE (changed_at);

-- Particiones para los próximos 3 meses
CREATE TABLE audit_log_2024_01 PARTITION OF audit_log
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE audit_log_2024_02 PARTITION OF audit_log
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE audit_log_2024_03 PARTITION OF audit_log
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Insertar datos de prueba
INSERT INTO customers (email, name) VALUES
  ('ana@example.com', 'Ana García'),
  ('luis@example.com', 'Luis Martínez'),
  ('maria@example.com', 'María López');

INSERT INTO orders (customer_id, status, total_amount) VALUES
  (1, 'delivered', 245.99),
  (1, 'processing', 89.50),
  (2, 'pending', 320.00);

INSERT INTO order_items (order_id, sku, quantity, unit_price) VALUES
  (1, 'PROD-001', 2, 99.99),
  (1, 'PROD-002', 1, 46.01),
  (2, 'PROD-003', 3, 29.83);

-- Verificar el estado de las tablas
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'app'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
\`\`\`

### 📖 Paso 6 — Configurar la réplica (streaming replication)

Todo lo anterior fue en \`db-primary\`. Ahora configura \`db-replica\`:

**En db-replica:**

\`\`\`bash
# Detener la instancia vacía que instaló el paquete
systemctl stop postgresql

# Vaciar el directorio de datos
rm -rf /var/lib/postgresql/15/main/*

# Clonar el primario usando pg_basebackup
# -R genera automáticamente standby.signal y primary_conninfo
sudo -u postgres pg_basebackup \
  -h 192.168.10.10 \
  -U replicator \
  -D /var/lib/postgresql/15/main \
  -P \
  -Xs \
  -R

# Verificar el contenido generado
cat /var/lib/postgresql/15/main/postgresql.auto.conf
# primary_conninfo = 'host=192.168.10.10 port=5432 user=replicator password=...'

ls /var/lib/postgresql/15/main/standby.signal
# El archivo existe → modo réplica activo

# Arrancar la réplica
systemctl start postgresql
\`\`\`

**Ajustar postgresql.conf en la réplica para hot standby:**

\`\`\`bash
nano /etc/postgresql/15/main/postgresql.conf
\`\`\`

\`\`\`
# Configuración específica de la réplica
hot_standby = on                  # permite SELECT en la réplica
hot_standby_feedback = on         # informa al primario de los XIDs activos en la réplica
                                  # (evita que el primario limpie filas que la réplica necesita)
max_standby_streaming_delay = 30s # tiempo máximo de espera antes de cancelar una query
                                  # que entra en conflicto con la aplicación de WAL

# La réplica hereda shared_buffers y work_mem del basebackup, ajustar si el hardware difiere
shared_buffers = 4GB
effective_cache_size = 12GB
\`\`\`

\`\`\`bash
systemctl restart postgresql
\`\`\`

**Verificar la replicación desde el primario:**

\`\`\`sql
-- En db-primary
SELECT
  application_name,
  client_addr,
  state,
  sent_lsn,
  replay_lsn,
  write_lag,
  flush_lag,
  replay_lag,
  sync_state
FROM pg_stat_replication;
\`\`\`

\`\`\`
 application_name │  client_addr   │   state   │ replay_lag │ sync_state
──────────────────┼────────────────┼───────────┼────────────┼───────────
 walreceiver      │ 192.168.10.11  │ streaming │ 00:00:00   │ async
\`\`\`

\`\`\`sql
-- En db-replica: confirmar que es réplica y recibe WAL
SELECT pg_is_in_recovery();     -- true

SELECT
  status,
  received_lsn,
  last_msg_send_time,
  last_msg_receipt_time
FROM pg_stat_wal_receiver;

-- Probar que la réplica tiene los datos del primario
SELECT COUNT(*) FROM app.orders;   -- debe devolver 3
\`\`\`

### 📖 Paso 7 — Verificar el archivado WAL

Vuelve al primario y confirma que el archivado está funcionando:

\`\`\`sql
-- Forzar un switch de WAL para activar el archive_command
SELECT pg_switch_wal();

-- Esperar unos segundos y verificar
SELECT
  archived_count,
  last_archived_wal,
  to_char(last_archived_time, 'YYYY-MM-DD HH24:MI:SS') AS last_archived,
  failed_count,
  last_failed_wal
FROM pg_stat_archiver;
\`\`\`

\`\`\`bash
# Verificar que los archivos WAL están llegando al directorio
ls -lth /backup/wal/ | head -10
# Deberías ver archivos con nombres como 000000010000000000000001
\`\`\`

### 📖 Paso 8 — Configurar el backup diario automático

\`\`\`bash
# Crear el script de backup
nano /usr/local/bin/pg_backup_daily.sh
\`\`\`

\`\`\`bash
#!/bin/bash
# /usr/local/bin/pg_backup_daily.sh
# Backup lógico diario de todas las bases de datos

set -euo pipefail

BACKUP_DIR="/backup/daily"
DATE=$(date +%Y%m%d_%H%M%S)
PGUSER="postgres"
RETENTION_DAYS=7

# Crear directorio para este backup
DEST="\${BACKUP_DIR}/\${DATE}"
mkdir -p "\${DEST}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup en \${DEST}"

# Backup de globals (roles, tablespaces)
pg_dumpall -U "\${PGUSER}" --globals-only \
  -f "\${DEST}/globals.sql"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Globals: OK"

# Backup de cada base de datos en formato custom
psql -U "\${PGUSER}" -t -A -c \
  "SELECT datname FROM pg_database
   WHERE datistemplate = false
     AND datname NOT IN ('postgres')" \
  | while read -r db; do
    [[ -z "$db" ]] && continue
    pg_dump -U "\${PGUSER}" -Fc \
      -f "\${DEST}/\${db}.dump" \
      "\${db}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] DB \${db}: OK ($(du -sh "\${DEST}/\${db}.dump" | cut -f1))"
done

# Eliminar backups anteriores al período de retención
find "\${BACKUP_DIR}" -maxdepth 1 -type d -mtime "+\${RETENTION_DAYS}" \
  -exec rm -rf {} + 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completado: \${DEST}"
\`\`\`

\`\`\`bash
chmod +x /usr/local/bin/pg_backup_daily.sh

# Probar el script manualmente
sudo -u postgres /usr/local/bin/pg_backup_daily.sh

# Verificar el resultado
ls -lh /backup/daily/
\`\`\`

Programar con cron:

\`\`\`bash
# Editar el crontab del usuario postgres
crontab -u postgres -e
\`\`\`

\`\`\`
# Backup lógico diario a las 02:30
30 2 * * * /usr/local/bin/pg_backup_daily.sh >> /var/log/pg_backup.log 2>&1
\`\`\`

Además, un backup físico semanal (base para PITR):

\`\`\`bash
nano /usr/local/bin/pg_basebackup_weekly.sh
\`\`\`

\`\`\`bash
#!/bin/bash
# /usr/local/bin/pg_basebackup_weekly.sh
set -euo pipefail

DEST="/backup/basebackup/$(date +%Y%m%d)"
mkdir -p "\${DEST}"

pg_basebackup \
  -U replicator \
  -h localhost \
  -D "\${DEST}" \
  -Ft -z \
  -P \
  -Xs

echo "Basebackup completado: \${DEST} ($(du -sh "\${DEST}" | cut -f1))"

# Conservar solo los últimos 4 basebackups (4 semanas)
ls -dt /backup/basebackup/*/ | tail -n +5 | xargs rm -rf 2>/dev/null || true
\`\`\`

\`\`\`bash
chmod +x /usr/local/bin/pg_basebackup_weekly.sh

# Añadir al crontab de postgres:
# Backup físico semanal los domingos a las 01:00
0 1 * * 0 /usr/local/bin/pg_basebackup_weekly.sh >> /var/log/pg_backup.log 2>&1
\`\`\`

### 📖 Paso 9 — Monitorear el estado de producción

Con todo configurado, estas son las vistas que monitoreas regularmente:

**Actividad actual:**

\`\`\`sql
-- Queries activas, cuánto llevan corriendo, qué están esperando
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  wait_event_type,
  wait_event,
  now() - query_start AS duration,
  left(query, 80) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
ORDER BY duration DESC NULLS LAST;
\`\`\`

**Queries lentas con pg_stat_statements:**

\`\`\`sql
-- Top 10 queries por tiempo total acumulado
SELECT
  round(total_exec_time::numeric, 2) AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  round(stddev_exec_time::numeric, 2) AS stddev_ms,
  left(query, 100) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
\`\`\`

**Salud del background writer (indica presión de I/O):**

\`\`\`sql
SELECT
  checkpoints_timed,         -- checkpoints por tiempo (normal)
  checkpoints_req,           -- checkpoints por WAL lleno (señal de presión: aumentar max_wal_size)
  checkpoint_write_time,
  checkpoint_sync_time,
  buffers_checkpoint,        -- páginas escritas en checkpoints
  buffers_clean,             -- páginas escritas por bgwriter
  maxwritten_clean,          -- veces que bgwriter se frenó por bgwriter_lru_maxpages (aumentarlo si > 0)
  buffers_backend,           -- páginas escritas directamente por backends (malo: significa que bgwriter va lento)
  stats_reset
FROM pg_stat_bgwriter;
\`\`\`

**Estado de la replicación (desde el primario):**

\`\`\`sql
SELECT
  application_name,
  client_addr,
  state,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes,
  write_lag,
  flush_lag,
  replay_lag,
  sync_state
FROM pg_stat_replication;

-- Alertar si lag_bytes > 100 MB
\`\`\`

**Estado del archivado WAL:**

\`\`\`sql
SELECT
  archived_count,
  last_archived_wal,
  last_archived_time,
  failed_count,
  last_failed_wal,
  last_failed_time
FROM pg_stat_archiver;

-- Si failed_count > 0, investigar inmediatamente
\`\`\`

**Tamaño de bases de datos y tablas:**

\`\`\`sql
-- Tamaño de cada base de datos
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
WHERE datistemplate = false
ORDER BY pg_database_size(datname) DESC;

-- Las 10 tablas más grandes en myapp
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'app'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
\`\`\`

**Tablas que necesitan VACUUM/ANALYZE urgente:**

\`\`\`sql
SELECT
  schemaname,
  relname,
  n_dead_tup,
  n_live_tup,
  round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
\`\`\`

### 📖 Estado final del sistema completo

\`\`\`bash
#!/bin/bash
# /usr/local/bin/pg_health_check.sh
# Ejecuta como: sudo -u postgres /usr/local/bin/pg_health_check.sh

echo "=== PostgreSQL Health Check ==="
echo ""

echo "--- Versión ---"
psql -U postgres -t -c "SELECT version();"

echo "--- Bases de datos ---"
psql -U postgres -c "\l+"

echo "--- Replicación ---"
psql -U postgres -c "SELECT application_name, state, replay_lag FROM pg_stat_replication;"

echo "--- Archivado WAL ---"
psql -U postgres -c "SELECT archived_count, last_archived_wal, failed_count FROM pg_stat_archiver;"

echo "--- Último backup ---"
ls -lt /backup/daily/ | head -3
ls -lt /backup/basebackup/ | head -3

echo "--- Conexiones activas ---"
psql -U postgres -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state ORDER BY count DESC;"

echo "=== Listo ==="
\`\`\`

\`\`\`bash
chmod +x /usr/local/bin/pg_health_check.sh
sudo -u postgres /usr/local/bin/pg_health_check.sh
\`\`\`

### 📋 Lo que debes recordar
* \`shared_buffers = 25% RAM\` y \`effective_cache_size = 75% RAM\` son el punto de partida para el tuning de memoria
* \`work_mem\` se multiplica por conexiones activas y por operación: empieza conservador y mide con \`EXPLAIN ANALYZE\`
* \`pg_hba.conf\` sigue el principio de mínimo privilegio: una línea por usuario, por red, y solo el método más seguro
* \`pg_basebackup -R -Xs\` crea la réplica y genera automáticamente \`standby.signal\` y \`primary_conninfo\`
* \`hot_standby_feedback = on\` en la réplica evita conflictos de WAL con queries largas de lectura
* \`archive_mode = on\` + \`archive_command\` habilita PITR: sin esto, el WAL se descarta tras los checkpoints
* El backup diario con \`pg_dump -Fc\` protege contra errores lógicos; el backup físico semanal con \`pg_basebackup\` protege contra corrupción y es la base de PITR
* \`pg_stat_replication\`, \`pg_stat_archiver\` y \`pg_stat_bgwriter\` son las tres vistas de monitoreo esenciales en producción

### 🧪 Autoevaluación
1. Tienes un servidor con 32 GB de RAM. ¿Qué valores exactos pondrías para \`shared_buffers\`, \`effective_cache_size\`, y \`maintenance_work_mem\`? ¿Por qué \`work_mem\` requiere más cuidado?
2. La réplica muestra \`replay_lag = 00:02:30\` y el valor sigue creciendo. ¿Qué tres hipótesis investigarías primero, y con qué comando o vista verificarías cada una?
3. Un colega propone configurar \`max_connections = 1000\` para "estar seguros". ¿Por qué es una mala idea y qué alternativa le propondrías?

---

1. Para 32 GB de RAM: \`shared_buffers = 8GB\` (25%), \`effective_cache_size = 24GB\` (75%), \`maintenance_work_mem = 1GB\` (generoso porque pocas operaciones de mantenimiento corren a la vez). \`work_mem\` requiere más cuidado porque se multiplica: con 100 conexiones y cada una haciendo una sort anidada en 3 niveles, podrías necesitar 100 × 3 × work_mem de RAM activa simultáneamente. Un valor de 64-128 MB es conservador pero seguro; para análisis pesado, usa \`SET work_mem = '1GB'\` solo en esa sesión.
2. Hipótesis 1: la réplica tiene I/O más lento que el primario y no puede aplicar WAL al ritmo que llega — verificar con \`pg_stat_wal_receiver\` (columna \`received_lsn\` vs \`last_msg_receipt_time\`) y métricas de I/O del sistema. Hipótesis 2: hay queries largas en la réplica que bloquean la aplicación del WAL (hot standby conflict) — verificar con \`pg_stat_activity\` en la réplica buscando \`wait_event_type = 'Recovery'\`. Hipótesis 3: la red entre primario y réplica está saturada o con alta latencia — verificar con \`pg_stat_replication\` en el primario mirando si \`sent_lsn\` y \`write_lsn\` divergen mucho, y con métricas de red del sistema.
3. Cada conexión en PostgreSQL es un proceso del SO que consume memoria (5-10 MB de base más \`work_mem\`) y añade overhead en cada operación global (locks, autovacuum, etc.). Con 1000 conexiones se podrían consumir 10 GB solo en sobrecarga de conexiones, dejando poca RAM para datos. La alternativa es PgBouncer en modo transaction pooling: permite que 1000 conexiones de clientes compartan un pool de 20-50 conexiones reales a PostgreSQL. Los clientes conectan a PgBouncer (prácticamente sin coste), y PgBouncer asigna conexiones reales solo durante la duración de cada transacción.
`

export default content
