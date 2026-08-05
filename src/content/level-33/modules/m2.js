const content = `
## Módulo 2 — Instalación y configuración: postgresql.conf y pg_hba.conf

### 🎯 Objetivos de aprendizaje

* Instalar PostgreSQL en Ubuntu/Debian desde el repositorio oficial de PGDG.
* Configurar los parámetros críticos de postgresql.conf para un servidor de producción.
* Entender el modelo de autenticación de pg_hba.conf y los métodos disponibles.
* Gestionar el servicio con pg_ctlcluster y systemctl.

### ❓ El problema real

La instalación por defecto de PostgreSQL está diseñada para correr en cualquier hardware, incluyendo una Raspberry Pi con 512 MB de RAM. En producción, eso significa \`shared_buffers = 128MB\` en un servidor con 64 GB de RAM — el 0.2% del recurso disponible. Al mismo tiempo, \`max_connections = 100\` puede ser demasiado alto si se considera el overhead real por conexión, o insuficiente si la aplicación no usa connection pooling. Y los defaults de logging registran casi nada, dejando al DBA ciego ante consultas lentas.

Ajustar correctamente la configuración antes del primer deploy es más fácil que hacerlo bajo presión con datos en producción.

### 📖 Instalación desde PGDG

Los repositorios de distribución suelen incluir versiones antiguas de PostgreSQL. La fuente correcta para producción es el repositorio oficial de PGDG (PostgreSQL Global Development Group):

\`\`\`bash
# Ubuntu 22.04 / Debian 12 — instalar PostgreSQL 16
sudo apt install -y curl ca-certificates gnupg

# Añadir clave GPG y repositorio PGDG
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \\
  sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] \\
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | \\
  sudo tee /etc/apt/sources.list.d/pgdg.list

sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16

# Verificar instalación
pg_lsclusters
\`\`\`

\`pg_lsclusters\` muestra todos los clusters PostgreSQL del sistema:

\`\`\`text
Ver Cluster Port Status Owner    Data directory              Log file
16  main    5432 online postgres /var/lib/postgresql/16/main /var/log/postgresql/postgresql-16-main.log
\`\`\`

Un cluster es una instancia de PostgreSQL con su propio PGDATA, puerto, y configuración. Es posible tener múltiples versiones y clusters en el mismo servidor.

### 📖 postgresql.conf: parámetros críticos para producción

El archivo vive en \`/etc/postgresql/16/main/postgresql.conf\` en sistemas Debian/Ubuntu. Cada parámetro modificado con \`ALTER SYSTEM\` se escribe en \`postgresql.auto.conf\`, que tiene prioridad sobre \`postgresql.conf\`.

**Conexiones y memoria**

\`\`\`ini
# Número máximo de conexiones de cliente
# Con PgBouncer en modo transaction pooling, 100-200 es suficiente
# Sin connection pooler, ajustar según carga real
max_connections = 200

# Pool de memoria compartida para páginas de datos
# Regla: 25% de la RAM del servidor
shared_buffers = 4GB            # Servidor con 16 GB RAM

# Cuánta caché total puede asumir el planificador
# (shared_buffers + OS page cache estimado)
# Regla: 75% de la RAM — NO asigna memoria, solo informa al planificador
effective_cache_size = 12GB

# Memoria por operación de sort/hash por backend
# CUIDADO: puede multiplicarse por el número de operaciones en una query
# Ejemplo: query con 5 hash joins = 5 × work_mem por backend
work_mem = 64MB

# Memoria para operaciones de mantenimiento: CREATE INDEX, VACUUM, etc.
maintenance_work_mem = 512MB
\`\`\`

**WAL y checkpoints**

\`\`\`ini
# Nivel de WAL — 'replica' es el mínimo para replicación streaming
wal_level = replica

# Tamaño del buffer WAL en memoria antes de flushearlo al disco
wal_buffers = 64MB

# Máximo tamaño de WAL generado entre checkpoints
# Más grande = checkpoints menos frecuentes = menos I/O pero más WAL a replay en crash
max_wal_size = 2GB
min_wal_size = 512MB

# El checkpointer distribuye sus escrituras a lo largo del N% del intervalo
# 0.9 = distribuir en el 90% del tiempo — reduce picos de I/O
checkpoint_completion_target = 0.9
checkpoint_timeout = 10min
\`\`\`

**Logging para producción**

\`\`\`ini
# Registrar todas las consultas que tarden más de N ms (1000 = 1 segundo)
log_min_duration_statement = 1000

# Registrar conexiones y desconexiones de clientes
log_connections = on
log_disconnections = on

# Formato del prefijo de cada línea de log
# %t=timestamp, %u=usuario, %d=database, %r=cliente, %p=pid, %x=transaction ID
log_line_prefix = '%t [%p]: user=%u,db=%d,app=%a,client=%r '

# Registrar declaraciones DDL (CREATE, DROP, ALTER)
log_statement = 'ddl'

# Registrar esperas de locks que excedan N ms
log_lock_waits = on
deadlock_timeout = 1s

# Destino del log
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
\`\`\`

**Autovacuum** (no desactivar nunca en producción)

\`\`\`ini
autovacuum = on
autovacuum_max_workers = 4              # Máximo 3-5 según carga
autovacuum_naptime = 30s               # Chequeo cada 30 segundos
autovacuum_vacuum_scale_factor = 0.01  # Vacuum cuando 1% de filas sean dead tuples
autovacuum_analyze_scale_factor = 0.005
autovacuum_vacuum_cost_delay = 2ms     # Throttle para reducir impacto en I/O
\`\`\`

Aplicar cambios que requieren reload (sin reiniciar):

\`\`\`bash
# Reload desde el SO
sudo systemctl reload postgresql@16-main

# O desde dentro de psql (requiere superuser)
SELECT pg_reload_conf();

# Ver si el parámetro requiere restart o solo reload
SELECT name, setting, unit, context
FROM pg_settings
WHERE name IN ('shared_buffers', 'work_mem', 'log_min_duration_statement');
\`\`\`

\`context = 'postmaster'\` requiere restart. \`context = 'sighup'\` solo requiere reload.

### 📖 pg_hba.conf: autenticación de clientes

\`pg_hba.conf\` (Host-Based Authentication) controla quién puede conectarse, desde dónde, y con qué método de autenticación. Se lee de arriba hacia abajo; la primera regla que coincide se aplica.

\`\`\`text
# FORMATO: type  database  user  address  method [options]

# Conexiones locales (socket Unix) — el usuario postgres puede conectarse sin contraseña
local   all             postgres                                peer

# Conexiones locales del usuario de la aplicación con contraseña
local   myapp           appuser                                 scram-sha-256

# Conexiones TCP desde localhost
host    all             all             127.0.0.1/32            scram-sha-256

# Conexiones TCP desde la red interna de la aplicación
host    myapp           appuser         10.10.0.0/24            scram-sha-256

# Réplicas (se verá en el módulo de replicación)
host    replication     replicator      10.10.0.0/24            scram-sha-256

# Denegar todo lo demás (implícito — no es necesario agregarlo explícitamente)
\`\`\`

**Métodos de autenticación**:

\`\`\`text
METHOD          DESCRIPCIÓN
───────────────────────────────────────────────────────────────────────────────
trust           Sin contraseña — NUNCA en producción sobre TCP
peer            Verifica que el usuario de SO coincida con el usuario PG (solo local)
ident           Similar a peer pero sobre TCP usando un ident server externo
md5             Hash MD5 de la contraseña — inseguro, evitar en sistemas nuevos
scram-sha-256   Autenticación SCRAM — seguro, default recomendado desde PG 14
cert            Certificado TLS del cliente — máxima seguridad
reject          Rechaza explícitamente la conexión
\`\`\`

Para conexiones remotas en producción, \`scram-sha-256\` sobre \`hostssl\` (solo TLS):

\`\`\`text
# Solo aceptar conexiones TLS desde la red de la aplicación
hostssl  myapp  appuser  10.10.0.0/24  scram-sha-256
\`\`\`

Después de modificar \`pg_hba.conf\`, recargar sin reiniciar:

\`\`\`bash
sudo systemctl reload postgresql@16-main
# o
sudo -u postgres pg_ctlcluster 16 main reload
\`\`\`

### 📖 pg_ctlcluster y gestión del servicio

En sistemas Debian/Ubuntu, el wrapper \`pg_ctlcluster\` gestiona clusters individuales:

\`\`\`bash
# Estado del cluster
pg_lsclusters

# Iniciar/detener/reiniciar cluster específico
sudo pg_ctlcluster 16 main start
sudo pg_ctlcluster 16 main stop
sudo pg_ctlcluster 16 main restart
sudo pg_ctlcluster 16 main reload       # Solo recarga configuración

# Mediante systemd (equivalente)
sudo systemctl start postgresql@16-main
sudo systemctl stop postgresql@16-main
sudo systemctl restart postgresql@16-main
sudo systemctl status postgresql@16-main

# Crear un segundo cluster en el mismo servidor (ej: para staging)
sudo pg_createcluster 16 staging --port 5433
sudo pg_ctlcluster 16 staging start
\`\`\`

### 📖 Verificar configuración activa desde psql

\`\`\`sql
-- Ver configuración actual con valores y fuentes
SELECT name, setting, unit, source, sourcefile, sourceline
FROM pg_settings
WHERE source != 'default'
ORDER BY name;

-- Ver parámetros críticos de memoria
SELECT
  name,
  setting,
  unit,
  pg_size_pretty(setting::bigint * CASE unit WHEN '8kB' THEN 8192 WHEN 'kB' THEN 1024 ELSE 1 END) AS size
FROM pg_settings
WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'effective_cache_size', 'wal_buffers');

-- Modificar parámetro con ALTER SYSTEM (persiste en postgresql.auto.conf)
ALTER SYSTEM SET work_mem = '128MB';
SELECT pg_reload_conf();

-- Verificar el cambio
SHOW work_mem;
\`\`\`

### 📋 Lo que debes recordar

* Instalar PostgreSQL siempre desde el repositorio PGDG, no el paquete de la distro.
* \`shared_buffers = 25% RAM\`, \`effective_cache_size = 75% RAM\`, \`work_mem\` con cuidado (se multiplica por operaciones y conexiones).
* \`log_min_duration_statement = 1000\` en producción para capturar slow queries.
* \`pg_hba.conf\` se lee de arriba hacia abajo — la primera regla que coincide gana.
* En producción sobre TCP, usar \`scram-sha-256\` y preferiblemente \`hostssl\`.
* \`context = 'postmaster'\` en pg_settings significa que el parámetro requiere restart completo.

### 🧪 Autoevaluación

1. Un servidor tiene 32 GB de RAM. ¿Cuáles serían los valores correctos para \`shared_buffers\` y \`effective_cache_size\`?
2. ¿Cuál es la diferencia entre \`pg reload\` y \`pg restart\` en términos de impacto en producción?
3. En pg_hba.conf existe la línea \`host all all 0.0.0.0/0 trust\`. ¿Por qué es un riesgo crítico de seguridad?

---

1. \`shared_buffers = 8GB\` (25% de 32 GB) y \`effective_cache_size = 24GB\` (75% de 32 GB). Effective_cache_size no asigna memoria — solo informa al planificador.
2. Reload (\`pg_reload_conf()\` o \`SIGHUP\`) recarga pg_hba.conf, postgresql.conf (parámetros con context=sighup) sin desconectar clientes. Restart desconecta todos los clientes activos — inaceptable en producción sin ventana de mantenimiento.
3. Permite conexiones desde cualquier dirección IP (0.0.0.0/0) sin contraseña (trust). Cualquier proceso en la red que pueda alcanzar el puerto 5432 obtiene acceso total. En internet público, el servidor quedaría comprometido en minutos.
`

export default content
