const content = `
## Módulo 7 — Backup y recuperación: pg_dump, pg_basebackup y PITR

### 🎯 Objetivos de aprendizaje
* Dominar \`pg_dump\` en sus distintos formatos y saber cuándo usar cada uno
* Restaurar bases de datos con \`pg_restore\` de forma eficiente, incluyendo restauración paralela
* Usar \`pg_dumpall\` para hacer backup de roles, tablespaces y globals del cluster
* Configurar \`pg_basebackup\` para backups físicos completos del directorio de datos
* Entender el WAL archiving y construir una estrategia de Point-in-Time Recovery (PITR)
* Diseñar una estrategia de backup en capas que combine backup lógico y físico

### ❓ El problema real

Son las 3 de la mañana y recibes una alerta: alguien ejecutó un \`DELETE FROM orders\`
sin cláusula \`WHERE\` en producción. La tabla tiene 2 millones de filas y el error se
cometió hace 47 minutos. ¿Tienes un backup de hace menos de una hora? ¿Puedes
restaurar la base de datos al estado exacto de 46 minutos antes del desastre?

Si no has configurado una estrategia de backup bien pensada, la respuesta es no.
Un \`pg_dump\` nocturno no te sirve: ya tiene las filas borradas porque el job corrió
después del error. Necesitas Point-in-Time Recovery: un backup base más el registro
continuo de cada cambio (WAL) para poder rebobinar a cualquier momento del pasado.

En este módulo construirás esa estrategia desde la teoría hasta los comandos exactos.

### 📖 pg_dump: backup lógico de una base de datos

\`pg_dump\` exporta el contenido de una base de datos en SQL u otros formatos.
Es el backup lógico estándar: portable, legible, independiente de la versión mayor
de PostgreSQL (dentro de lo razonable), y permite restaurar tablas individuales.

**Formatos disponibles:**

\`\`\`bash
# -Fp: Plain text (SQL puro). Legible pero no comprimido, no permite restauración paralela.
pg_dump -U postgres -Fp -f backup.sql myapp

# -Fc: Custom format. Binario comprimido, permite pg_restore con opciones avanzadas.
# Es el más recomendado para backups regulares.
pg_dump -U postgres -Fc -f backup.dump myapp

# -Fd: Directory format. Genera un directorio con un archivo por tabla.
# Permite restauración paralela con --jobs.
pg_dump -U postgres -Fd -f backup_dir/ myapp

# -Ft: Tar format. Similar a directory pero empaquetado en un archivo .tar.
pg_dump -U postgres -Ft -f backup.tar myapp
\`\`\`

**Flags útiles para backups selectivos:**

\`\`\`bash
# -t: solo una tabla específica
pg_dump -U postgres -Fc -t public.orders -f orders_only.dump myapp

# -s: solo el esquema (DDL), sin datos
pg_dump -U postgres -Fp -s -f schema_only.sql myapp

# -a: solo los datos (INSERT statements), sin DDL
pg_dump -U postgres -Fp -a -f data_only.sql myapp

# -n: solo un schema (namespace)
pg_dump -U postgres -Fc -n analytics -f analytics_schema.dump myapp

# Compresión explícita (-Z 0..9)
pg_dump -U postgres -Fc -Z 9 -f backup_maxcomp.dump myapp

# Excluir tablas grandes de logs que no necesitas respaldar
pg_dump -U postgres -Fc -T public.request_logs -T public.audit_events \
        -f myapp_without_logs.dump myapp
\`\`\`

**Variable de entorno para contraseña (nunca en la línea de comandos):**

\`\`\`bash
# ~/.pgpass o PGPASSWORD para scripts automatizados
export PGPASSWORD="mi-contrasena-segura"
pg_dump -U postgres -Fc -f backup.dump myapp
unset PGPASSWORD

# Mejor aún: usar archivo .pgpass
# Formato: hostname:port:database:username:password
echo "localhost:5432:myapp:postgres:mi-contrasena" >> ~/.pgpass
chmod 600 ~/.pgpass
\`\`\`

### 📖 pg_restore: restaurar backups en formato custom o directory

El formato plain (\`-Fp\`) se restaura con \`psql\`. Para custom y directory se usa \`pg_restore\`:

\`\`\`bash
# Restaurar un backup custom completo en una base de datos vacía
createdb -U postgres myapp_restored
pg_restore -U postgres -d myapp_restored backup.dump

# Restaurar solo una tabla específica
pg_restore -U postgres -d myapp_restored -t orders backup.dump

# Restaurar en paralelo con 4 workers (solo para formato directory -Fd)
pg_restore -U postgres -d myapp_restored --jobs=4 backup_dir/

# -c: limpiar (DROP) los objetos antes de crearlos (útil para restaurar sobre una DB existente)
pg_restore -U postgres -d myapp -c backup.dump

# --if-exists: no falla si el objeto a borrar no existe (combinar con -c)
pg_restore -U postgres -d myapp -c --if-exists backup.dump

# Ver el índice de contenidos sin restaurar nada
pg_restore --list backup.dump

# Restaurar solo ciertos objetos listados en un archivo de índice
pg_restore --list backup.dump > contents.txt
# Editar contents.txt para comentar lo que NO quieres restaurar
pg_restore -L contents.txt -d myapp_restored backup.dump
\`\`\`

**Restauración paralela: cuándo marca la diferencia**

Para bases de datos grandes (100 GB+), la restauración secuencial puede tomar horas.
Con formato directory y \`--jobs=N\`, cada worker restaura una tabla en paralelo:

\`\`\`bash
# Backup en formato directory
pg_dump -U postgres -Fd --jobs=4 -f /backup/myapp_dir/ myapp

# Restauración con 8 workers (ajusta según CPUs disponibles)
pg_restore -U postgres -d myapp_restored --jobs=8 /backup/myapp_dir/
\`\`\`

### 📖 pg_dumpall: backup de globals del cluster

\`pg_dump\` solo hace backup de una base de datos. Los roles (usuarios), tablespaces
y configuraciones del cluster son globals que \`pg_dump\` no incluye. Para eso existe
\`pg_dumpall\`:

\`\`\`bash
# Backup completo del cluster (todas las DBs + globals)
pg_dumpall -U postgres -f full_cluster_backup.sql

# Solo los globals: roles, tablespaces, configuraciones (sin datos de las DBs)
pg_dumpall -U postgres --globals-only -f globals.sql

# Solo los roles
pg_dumpall -U postgres --roles-only -f roles.sql

# Restaurar los globals en un nuevo cluster antes de restaurar las DBs
psql -U postgres -f globals.sql

# Script típico de backup nocturno completo
pg_dumpall -U postgres --globals-only -f /backup/globals_$(date +%Y%m%d).sql
for db in $(psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0','template1','postgres')"); do
    pg_dump -U postgres -Fc -f "/backup/\${db}_$(date +%Y%m%d).dump" "$db"
done
\`\`\`

### 📖 pg_basebackup: backup físico del directorio de datos

Mientras \`pg_dump\` exporta datos lógicamente (tabla por tabla), \`pg_basebackup\`
copia el directorio de datos a nivel de archivos, incluyendo todos los WAL necesarios
para que el backup sea consistente. Es la base del PITR.

\`\`\`bash
# Backup físico básico al directorio /backup/base
pg_basebackup -U replicator -h localhost -D /backup/base -P

# -Ft -z: empaquetar en tar comprimido (mejor para almacenamiento)
pg_basebackup -U replicator -h localhost \
  -D /backup/base \
  -Ft -z \          # tar + gzip
  -P \              # mostrar progreso
  -Xs               # transmitir WAL durante la copia (evita brecha en WAL)

# -R: generar standby.signal y primary_conninfo (si el backup es para réplica)
pg_basebackup -U replicator -h localhost \
  -D /backup/base \
  -Ft -z -P -Xs -R

# Verificar el contenido del backup
ls -lh /backup/base/
# base.tar.gz   → directorio de datos comprimido
# pg_wal.tar.gz → WAL necesarios para consistencia
\`\`\`

**Requisitos en postgresql.conf para que pg_basebackup funcione:**

\`\`\`
wal_level = replica        # mínimo para permitir backup físico + replicación
max_wal_senders = 3        # permite conexiones de replicación (una por pg_basebackup)
\`\`\`

**Requisito en pg_hba.conf:**

\`\`\`
# Permitir al usuario de replicación conectarse para backup
host  replication  replicator  127.0.0.1/32  scram-sha-256
\`\`\`

### 📖 WAL archiving: el registro continuo de cambios

El WAL (Write-Ahead Log) es el diario de todas las operaciones de PostgreSQL.
Para PITR necesitas guardar esos archivos WAL de forma continua entre backups base.

**Configurar el archivado en postgresql.conf:**

\`\`\`
# Habilitar archivado WAL
archive_mode = on

# Comando que PostgreSQL ejecuta para cada segmento WAL completado
# %p = ruta al archivo WAL en el servidor
# %f = nombre del archivo WAL
archive_command = 'cp %p /archive/wal/%f'

# Con rsync hacia servidor remoto (más robusto):
archive_command = 'rsync -a %p backup-server:/archive/wal/%f'

# Con verificación de integridad:
archive_command = 'test ! -f /archive/wal/%f && cp %p /archive/wal/%f'

# archive_command debe devolver 0 solo si el archivo fue copiado correctamente.
# Si devuelve distinto de 0, PostgreSQL reintenta indefinidamente.
\`\`\`

**Verificar que el archivado funciona:**

\`\`\`sql
-- Forzar un cambio de segmento WAL para disparar el archive_command
SELECT pg_switch_wal();

-- Ver el estado del archivado
SELECT
  archived_count,
  last_archived_wal,
  last_archived_time,
  failed_count,
  last_failed_wal,
  last_failed_time
FROM pg_stat_archiver;
\`\`\`

\`\`\`bash
# Verificar que los archivos WAL están llegando
ls -lt /archive/wal/ | head -20
\`\`\`

### 📖 PITR: Point-in-Time Recovery

Con un backup base + archivos WAL puedes restaurar la base de datos a cualquier
momento entre el backup base y el último WAL archivado. Así se usa:

**Paso 1: Restaurar el backup base**

\`\`\`bash
# Detener PostgreSQL
systemctl stop postgresql

# Limpiar el directorio de datos (¡cuidado!)
rm -rf /var/lib/postgresql/15/main/*

# Descomprimir el backup base
tar -xzf /backup/base/base.tar.gz -C /var/lib/postgresql/15/main/
tar -xzf /backup/base/pg_wal.tar.gz -C /var/lib/postgresql/15/main/pg_wal/

# Asegurar permisos correctos
chown -R postgres:postgres /var/lib/postgresql/15/main/
chmod 700 /var/lib/postgresql/15/main/
\`\`\`

**Paso 2: Configurar la recuperación (PostgreSQL 12+)**

En PostgreSQL 12 y versiones posteriores, \`recovery.conf\` fue eliminado.
La configuración de recuperación va directamente en \`postgresql.conf\`:

\`\`\`
# postgresql.conf — sección de recuperación

# Comando para obtener archivos WAL del archivo
restore_command = 'cp /archive/wal/%f %p'
# Con rsync desde servidor remoto:
# restore_command = 'rsync -a backup-server:/archive/wal/%f %p'

# Objetivo de recuperación: punto en el tiempo exacto
recovery_target_time = '2024-01-15 03:14:00'

# Qué hacer al llegar al objetivo:
# pause  → pausa y permite verificar antes de continuar (recomendado)
# promote → promueve inmediatamente a primario
# shutdown → se detiene (útil para scripts)
recovery_target_action = 'pause'

# Incluir o no la transacción que ocurrió exactamente en recovery_target_time
recovery_target_inclusive = true
\`\`\`

**Paso 3: Crear el archivo de señal de recuperación**

\`\`\`bash
# Este archivo vacío le indica a PostgreSQL que debe entrar en modo de recuperación
touch /var/lib/postgresql/15/main/recovery.signal
chown postgres:postgres /var/lib/postgresql/15/main/recovery.signal
\`\`\`

**Paso 4: Iniciar PostgreSQL y monitorear la recuperación**

\`\`\`bash
systemctl start postgresql

# Seguir el progreso en los logs
tail -f /var/log/postgresql/postgresql-15-main.log
\`\`\`

Salida esperada en los logs durante la recuperación:

\`\`\`
LOG:  starting point-in-time recovery to 2024-01-15 03:14:00+00
LOG:  restored log file "000000010000000000000001" from archive
LOG:  redo starts at 0/1000028
LOG:  consistent recovery state reached at 0/1000100
LOG:  recovery stopping before commit of transaction 1234, time 2024-01-15 03:14:05
LOG:  pausing at the end of recovery
HINT:  Execute pg_wal_replay_resume() to promote.
\`\`\`

**Paso 5: Verificar y promover**

\`\`\`sql
-- Verificar que los datos recuperados son correctos
SELECT COUNT(*) FROM orders;  -- deben estar las filas borradas por error

-- Si todo está bien, promover a primario (salir del modo recuperación)
SELECT pg_wal_replay_resume();

-- Verificar que ya no está en recuperación
SELECT pg_is_in_recovery();   -- debe devolver: false
\`\`\`

### 📖 Otras opciones de recovery_target

Además de \`recovery_target_time\`, PostgreSQL ofrece:

\`\`\`
# Recuperar hasta una transacción específica (por XID)
recovery_target_xid = '12345'

# Recuperar hasta un LSN específico (posición en el WAL)
recovery_target_lsn = '0/15D5C28'

# Recuperar hasta un "restore point" nombrado (creado previamente con pg_create_restore_point)
recovery_target_name = 'antes-de-migracion'

# Recuperar hasta el final del WAL disponible (para failover)
recovery_target = 'immediate'   # detiene al primer estado consistente
\`\`\`

Crear restore points en momentos clave:

\`\`\`sql
-- Antes de una migración o deploy riesgoso
SELECT pg_create_restore_point('antes-deploy-v2.1');
-- Devuelve el LSN: 0/15D5C28

-- Puedes usar ese nombre como recovery_target_name en caso de necesitar revertir
\`\`\`

### 📖 Estrategia de backup en producción

Un backup robusto combina ambas herramientas:

\`\`\`
Lunes 02:00 → pg_basebackup (backup base semanal)
              + pg_dumpall --globals-only (roles y configuraciones)

Martes–Domingo 02:00 → pg_dump -Fc (backup lógico diario de cada DB)

Continuo → archive_command archiva WAL cada ~16 MB o cada archive_timeout segundos

Resultado:
- RPO (pérdida máxima de datos): minutos (según archive_timeout)
- RTO (tiempo de recuperación): depende del tamaño de la DB y la cantidad de WAL
\`\`\`

\`\`\`bash
# archive_timeout: forzar switch de WAL aunque no esté lleno
# (útil en sistemas con pocas escrituras para no perder más de N segundos)
# En postgresql.conf:
# archive_timeout = 300   # archivar como máximo cada 5 minutos
\`\`\`

Script de backup diario para cron:

\`\`\`bash
#!/bin/bash
# /usr/local/bin/pg_backup_daily.sh
set -euo pipefail

BACKUP_DIR="/backup/pg"
DATE=$(date +%Y%m%d_%H%M%S)
PGUSER="postgres"

# Crear directorio
mkdir -p "\${BACKUP_DIR}/\${DATE}"

# Globals
pg_dumpall -U "\${PGUSER}" --globals-only \
  -f "\${BACKUP_DIR}/\${DATE}/globals.sql"

# Cada base de datos (excluyendo templates)
psql -U "\${PGUSER}" -t -c \
  "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres'" \
  | while read -r db; do
    [[ -z "$db" ]] && continue
    pg_dump -U "\${PGUSER}" -Fc \
      -f "\${BACKUP_DIR}/\${DATE}/\${db}.dump" \
      "\${db}"
done

# Eliminar backups más antiguos de 7 días
find "\${BACKUP_DIR}" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +

echo "Backup completado: \${BACKUP_DIR}/\${DATE}"
\`\`\`

\`\`\`
# Crontab: backup diario a las 02:30
30 2 * * * /usr/local/bin/pg_backup_daily.sh >> /var/log/pg_backup.log 2>&1
\`\`\`

### 📋 Lo que debes recordar
* \`pg_dump -Fc\` (custom format) es el mejor formato para backups regulares: comprimido y flexible
* \`pg_restore --jobs=N\` con formato directory (\`-Fd\`) acelera drásticamente la restauración de DBs grandes
* \`pg_dumpall --globals-only\` es imprescindible: sin él pierdes roles, tablespaces y configuraciones
* \`pg_basebackup -Xs -Ft -z\` crea un backup físico completo y consistente; es la base del PITR
* \`archive_mode = on\` + \`archive_command\` activa el archivado continuo de WAL
* En PostgreSQL 12+, no existe \`recovery.conf\`: la configuración va en \`postgresql.conf\` con \`recovery.signal\`
* \`recovery_target_time\` + \`recovery_target_action = 'pause'\` es la combinación más segura para PITR
* Una estrategia robusta combina backup lógico diario (pg_dump) y físico semanal (pg_basebackup) + WAL continuo

### 🧪 Autoevaluación
1. Tienes un backup en formato custom (\`-Fc\`) de 80 GB. La restauración completa tarda 3 horas de forma secuencial. ¿Qué cambio harías en el próximo backup y en la restauración para reducir ese tiempo?
2. Después de configurar \`archive_mode = on\` y \`archive_command\`, compruebas que \`failed_count\` en \`pg_stat_archiver\` sigue creciendo. ¿Cuáles son las causas más probables y cómo las investigarías?
3. ¿Por qué en PostgreSQL 12+ ya no existe \`recovery.conf\` y cómo le indica ahora PostgreSQL que debe entrar en modo de recuperación?

---

1. Para el próximo backup, usar formato directory (\`pg_dump -Fd\`) en lugar de custom. Al restaurar, usar \`pg_restore --jobs=N\` donde N es el número de CPUs disponibles. El formato directory permite restaurar tablas en paralelo porque cada tabla está en un archivo separado; el custom format es un stream secuencial que no puede paralelizarse. Con 8 workers, una restauración de 3 horas puede bajar a 30-45 minutos.
2. Causas probables: el directorio de destino (\`/archive/wal/\`) no existe o el usuario \`postgres\` no tiene permiso de escritura; el servidor remoto (si se usa \`rsync\` o \`scp\`) no es accesible desde el servidor de PostgreSQL; el disco de destino está lleno; el archivo WAL a copiar ya existe en el destino y el comando falla por eso (revisar si el \`archive_command\` usa \`test ! -f\`). Para investigar: revisar \`last_failed_wal\` en \`pg_stat_archiver\`, luego ejecutar manualmente el \`archive_command\` sustituyendo \`%p\` y \`%f\` con un archivo WAL real.
3. PostgreSQL 12 consolidó la configuración de recuperación en \`postgresql.conf\` para simplificar la gestión. El mecanismo de señal pasó a ser un archivo vacío llamado \`recovery.signal\` (o \`standby.signal\` para réplicas) en el directorio de datos. Al arrancar, PostgreSQL busca ese archivo: si existe, entra en modo de recuperación aplicando la configuración de \`postgresql.conf\`; si no existe, arranca normalmente. Esto eliminó la confusión de tener dos archivos de configuración separados.
`

export default content
