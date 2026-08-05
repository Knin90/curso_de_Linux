const content = `
## Módulo 4 — BorgBackup: deduplicación, cifrado e incrementales eficientes

### 🎯 Objetivos de aprendizaje
* Entender qué es la deduplicación a nivel de chunks y por qué cambia la economía de los backups
* Inicializar repositorios Borg locales y remotos con cifrado apropiado
* Crear, listar, extraer y montar archives de Borg
* Implementar políticas de retención con \`borg prune\`
* Verificar la integridad del repositorio y operar Borg de forma segura en scripts

### ❓ El problema real
Tienes 10 servidores de aplicación con configuraciones similares. Cada uno hace backup completo de \`/etc\` y \`/var/www\` diariamente. El 80% de esos archivos son idénticos entre servidores y entre días. Estás pagando por almacenar la misma información decenas de veces. Con tar, cada backup ocupa el espacio completo. BorgBackup elimina ese desperdicio: sólo almacena cada chunk único una vez.

### 📖 ¿Por qué BorgBackup?

BorgBackup resuelve los problemas que tar no puede:

| Característica | tar | BorgBackup |
|----------------|-----|------------|
| Deduplicación | No | Sí (chunks SHA-256) |
| Cifrado | No | Sí (AES-256 + HMAC) |
| Incrementales eficientes | Manual y frágil | Automático y robusto |
| Montaje de archives | No | Sí (FUSE) |
| Verificación de integridad | Básica | Completa |
| Compresión adaptativa | No | Sí |

**Deduplicación a nivel de chunk:** Borg divide cada archivo en bloques de tamaño variable (chunks), calcula el hash SHA-256 de cada chunk, y sólo almacena los chunks que no existen ya en el repositorio. Resultado: un backup "completo" diario ocupa casi lo mismo que un incremental, porque sólo los chunks modificados son nuevos.

### 📖 Instalación

\`\`\`bash
# Debian/Ubuntu
apt install borgbackup

# RHEL/Fedora
dnf install borgbackup

# pip (siempre última versión)
pip install borgbackup

# Verificar instalación
borg --version
\`\`\`

### 📖 Inicializar repositorio

El repositorio es el almacén de todos los archives. Debe inicializarse una vez antes de crear el primer archive.

**Repositorio local:**
\`\`\`bash
borg init --encryption=repokey /mnt/backup/myrepo
\`\`\`

**Repositorio remoto (via SSH):**
\`\`\`bash
borg init --encryption=repokey-blake2 user@backup-server:/backups/myrepo
\`\`\`

Borg pedirá una passphrase. Esta passphrase es **crítica** — sin ella, los datos cifrados son irrecuperables. Documéntala y guárdala en múltiples lugares seguros.

**Modos de cifrado:**

| Modo | Dónde se guarda la clave | Recomendado para |
|------|--------------------------|-----------------|
| \`repokey\` | Dentro del repositorio | Repositorio en tu propio servidor confiable |
| \`repokey-blake2\` | Dentro del repositorio | Igual que repokey pero más rápido (BLAKE2) |
| \`keyfile\` | En \`~/.config/borg/keys/\` | Repositorio en servidor de terceros (untrusted) |
| \`none\` | Sin cifrado | Sólo si el almacenamiento ya está cifrado |

**Diferencia clave entre repokey y keyfile:** con \`repokey\`, si pierdes el cliente pero tienes el repositorio y la passphrase, puedes recuperar todo. Con \`keyfile\`, debes tener también el archivo de clave del cliente — úsalo cuando el servidor de backup no es de confianza.

### 📖 Crear archives

\`\`\`bash
borg create \
    --stats \
    --progress \
    --compression lz4 \
    --exclude /home/*/.cache \
    --exclude '*.pyc' \
    --exclude /proc \
    --exclude /sys \
    /mnt/backup/myrepo::archive-{now:%Y-%m-%dT%H:%M} \
    /home /etc /var/www
\`\`\`

**Descomponiendo el comando:**
- \`--stats\`: muestra estadísticas al finalizar (tamaño, deduplicación, tiempo)
- \`--progress\`: muestra progreso en tiempo real (omitir en scripts/cron)
- \`--compression lz4\`: compresión rápida (excelente para backups frecuentes)
- \`::archive-{now:%Y-%m-%dT%H:%M}\`: nombre del archive con timestamp automático
- El repositorio y el archive se separan con \`::\`

**Opciones de compresión:**

| Opción | Velocidad | Ratio | Uso |
|--------|-----------|-------|-----|
| \`lz4\` | Muy rápida | Bajo | Backups frecuentes, datos grandes |
| \`zstd\` | Rápida | Bueno | Balance general recomendado |
| \`zlib,6\` | Moderada | Mejor | Archivos de largo plazo |
| \`lzma,6\` | Lenta | Excelente | Archivado, raramente se accede |

### 📖 Listar repositorios y archives

\`\`\`bash
# Ver todos los archives en el repositorio
borg list /mnt/backup/myrepo

# Salida típica:
# archive-2024-01-13T03:00        Sun, 2024-01-13 03:00:01 [abc123...]
# archive-2024-01-14T03:00        Mon, 2024-01-14 03:00:02 [def456...]
# archive-2024-01-15T03:00        Tue, 2024-01-15 03:00:01 [ghi789...]

# Ver contenido de un archive específico
borg list /mnt/backup/myrepo::archive-2024-01-15T03:00

# Filtrar por patrón
borg list /mnt/backup/myrepo::archive-2024-01-15T03:00 home/user/
\`\`\`

### 📖 Extraer archives

\`\`\`bash
# Extraer directorio específico (path relativo, sin / inicial)
borg extract /mnt/backup/myrepo::archive-2024-01-15T03:00 \
    home/user/documents/

# Extraer archivo único
borg extract /mnt/backup/myrepo::archive-2024-01-15T03:00 \
    home/user/.bashrc

# Extraer al directorio actual (crea la estructura de directorios)
# Para restaurar a la ubicación original, ejecutar desde /
cd / && borg extract /mnt/backup/myrepo::archive-2024-01-15T03:00
\`\`\`

**Importante:** los paths en borg son **relativos** (sin \`/\` inicial). \`home/user/documents/\` no \`/home/user/documents/\`.

### 📖 Montar archives (navegación interactiva)

Borg puede montar un archive como un sistema de archivos FUSE, permitiendo navegar y copiar archivos individualmente sin extraer todo:

\`\`\`bash
# Crear punto de montaje
mkdir /mnt/restore

# Montar archive
borg mount /mnt/backup/myrepo::archive-2024-01-15T03:00 /mnt/restore

# Navegar y restaurar archivos específicos
ls /mnt/restore/home/user/
cp /mnt/restore/home/user/important-file.txt /home/user/

# Desmontar cuando termines
borg umount /mnt/restore
\`\`\`

**Requisito:** el paquete \`libfuse\` o \`fuse3\` debe estar instalado. En servidores headless, puede que no esté instalado por defecto.

### 📖 Política de retención con prune

\`borg prune\` elimina archives que ya no cumplen la política de retención, liberando espacio. La deduplicación significa que los chunks compartidos sólo se eliminan cuando ya ningún archive los referencia.

\`\`\`bash
borg prune \
    --keep-daily=7 \
    --keep-weekly=4 \
    --keep-monthly=6 \
    --keep-yearly=2 \
    --dry-run \
    /mnt/backup/myrepo
\`\`\`

**Siempre usa \`--dry-run\` primero** para ver qué archives serán eliminados antes de ejecutar el prune real.

**Interpretación de la política:**
- \`--keep-daily=7\`: mantener el último archive de cada uno de los últimos 7 días
- \`--keep-weekly=4\`: mantener el último archive de cada una de las últimas 4 semanas
- \`--keep-monthly=6\`: mantener el último archive de cada uno de los últimos 6 meses
- \`--keep-yearly=2\`: mantener el último archive de cada uno de los últimos 2 años

Un archive puede satisfacer múltiples categorías (el archive del lunes de la semana pasada puede ser el "weekly" y el "daily").

### 📖 Verificar integridad del repositorio

\`\`\`bash
# Verificar integridad completa (chunks y manifesto)
borg check /mnt/backup/myrepo

# Verificar un archive específico
borg check /mnt/backup/myrepo::archive-2024-01-15T03:00

# Info detallada de un archive
borg info /mnt/backup/myrepo::archive-2024-01-15T03:00
\`\`\`

La salida de \`borg info\` muestra el ratio de deduplicación:
\`\`\`
Original size: 50.23 GB
Compressed size: 12.45 GB
Deduplicated size: 2.34 GB     # <-- lo que realmente ocupa en disco
\`\`\`

Un ratio de deduplicación de 20:1 es común en backups diarios de sistemas con pocos cambios.

### 📖 Uso en scripts (autenticación no interactiva)

Para usar Borg en cron o systemd sin intervención manual:

\`\`\`bash
# Establecer passphrase via variable de entorno
export BORG_PASSPHRASE='tu-passphrase-aqui'

# O leer desde archivo (más seguro que hardcodear)
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)

# Si borg está en ruta no estándar en el servidor remoto
export BORG_REMOTE_PATH=/usr/local/bin/borg
\`\`\`

**Seguridad del archivo de passphrase:**
\`\`\`bash
# El archivo debe ser legible sólo por root
chmod 600 /root/.borg-passphrase
chown root:root /root/.borg-passphrase
\`\`\`

### 📖 Compact (liberar espacio real)

Desde Borg 1.2+, \`prune\` no libera el espacio inmediatamente. Debes ejecutar \`compact\`:

\`\`\`bash
borg prune --keep-daily=7 --keep-weekly=4 /mnt/backup/myrepo
borg compact /mnt/backup/myrepo
\`\`\`

Añade \`compact\` después de cada \`prune\` en tus scripts de backup.

### 📋 Lo que debes recordar
* El repositorio se inicializa una sola vez con \`borg init\`; los archives se crean dentro del repositorio con \`::\`
* La passphrase es irrecuperable si se pierde — documéntala fuera del servidor
* Usa \`repokey\` para servidores propios, \`keyfile\` para repositorios en terceros no confiables
* Los paths en \`borg extract\` son relativos (sin \`/\` inicial)
* \`borg prune\` define la retención; \`borg compact\` libera el espacio en disco
* \`BORG_PASSPHRASE\` en variable de entorno es el mecanismo estándar para scripts
* \`borg check\` verifica integridad; \`borg info\` muestra el ratio de deduplicación real

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre los modos de cifrado \`repokey\` y \`keyfile\`? ¿Cuándo elegirías cada uno?
2. Tienes el archive \`archive-2024-01-15T03:00\` y necesitas restaurar sólo el archivo \`/home/user/project/main.py\`. ¿Cuál es el comando exacto?
3. Después de ejecutar \`borg prune --keep-daily=7 /mnt/backup/myrepo\`, el espacio en disco no se libera inmediatamente. ¿Por qué? ¿Qué comando debes ejecutar adicionalmente?

---

1. Con \`repokey\` la clave de cifrado se almacena dentro del repositorio (protegida por la passphrase). Con \`keyfile\` se almacena en el cliente (\`~/.config/borg/keys/\`). Elige \`repokey\` cuando el servidor de backup es de confianza (si pierdes el cliente pero tienes el repo, puedes recuperar todo). Elige \`keyfile\` cuando el servidor de backup no es de confianza (el servidor sólo tiene datos cifrados, la clave permanece en tu cliente).
2. \`borg extract /mnt/backup/myrepo::archive-2024-01-15T03:00 home/user/project/main.py\` — el path es relativo, sin \`/\` inicial.
3. Porque \`prune\` sólo marca los archives como eliminados pero no elimina físicamente los chunks huérfanos. \`borg compact /mnt/backup/myrepo\` es el comando que libera el espacio real en disco eliminando los chunks que ya no referencia ningún archive.
`

export default content
