const content = `
## Módulo 2 — rsync: backup local, remoto y sincronización eficiente

### 🎯 Objetivos de aprendizaje

* Dominar las opciones esenciales de rsync para backup de producción.
* Implementar backups incrementales con hardlinks usando --link-dest.
* Configurar rsync sobre SSH para backups remotos seguros.
* Escribir un script de backup completo con logging y manejo de errores.
* Entender los exit codes de rsync para monitoreo confiable.

### ❓ El problema real

Tienes 50 GB de datos de aplicación. Copiarlos completos cada noche tarda 3 horas y consume 350 GB de almacenamiento en una semana. Tu ventana de mantenimiento es de 30 minutos. rsync resuelve ambos problemas: transfiere solo los cambios (delta), puede hacer backups incrementales con hardlinks que no repiten datos idénticos entre snapshots, y opera de forma eficiente sobre SSH.

### 📖 Opciones fundamentales de rsync

\`\`\`bash
rsync -avz origen/ destino/
\`\`\`

Cada flag importa:
- **-a (--archive)**: equivale a -rlptgoD. Preserva permisos, timestamps, propietarios, grupos, dispositivos especiales, y copia recursivamente. En producción siempre usas -a.
- **-v (--verbose)**: muestra cada archivo transferido. En scripts usa --quiet o redirige a log.
- **-z (--compress)**: comprime datos en tránsito. Útil sobre red lenta o WAN. Innecesario en LAN rápida (CPU overhead supera el ahorro).
- **-h (--human-readable)**: tamaños en KB/MB/GB en lugar de bytes.

**La barra al final del origen importa mucho:**

\`\`\`bash
# CON barra: copia el CONTENIDO de /data/ dentro de /backup/
rsync -av /data/ /backup/
# Resultado: /backup/archivo.txt

# SIN barra: copia el DIRECTORIO /data/ dentro de /backup/
rsync -av /data /backup/
# Resultado: /backup/data/archivo.txt
\`\`\`

Esta diferencia ha causado innumerables problemas en producción. Estandariza en una convención y síguela.

### 📖 Opciones de backup esenciales

**--delete**: elimina del destino los archivos que ya no existen en el origen.

\`\`\`bash
rsync -av --delete /data/ /backup/
\`\`\`

Sin --delete, los archivos borrados en origen se acumulan en el backup. Con --delete, el backup es un espejo exacto del origen. Úsalo en backups de tipo mirror; no en backups históricos donde quieres conservar versiones anteriores.

**--exclude**: excluye archivos o directorios del backup.

\`\`\`bash
rsync -av \
  --exclude='*.tmp' \
  --exclude='*.log' \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='__pycache__/' \
  /data/ /backup/
\`\`\`

Para múltiples exclusiones complejas, usa un archivo:

\`\`\`bash
# /etc/backup/excludes.txt
*.tmp
*.log
.git/
node_modules/
__pycache__/
/proc/
/sys/
/dev/
/run/
/tmp/

rsync -av --exclude-from=/etc/backup/excludes.txt /data/ /backup/
\`\`\`

**--backup y --backup-dir**: en lugar de sobrescribir, mueve versiones anteriores a un directorio.

\`\`\`bash
rsync -av \
  --backup \
  --backup-dir=/backup/versiones-anteriores \
  /data/ /backup/actual/
\`\`\`

### 📖 Backups incrementales con --link-dest

Esta es la técnica más importante de rsync para backups eficientes. Crea snapshots diarios donde los archivos sin cambios son hardlinks al snapshot anterior, no copias. El resultado: cada snapshot parece completo pero solo ocupa espacio por los archivos nuevos o modificados.

\`\`\`bash
#!/bin/bash
# backup-incremental.sh

ORIGEN="/data/"
DESTINO="/backup/snapshots"
FECHA=\$(date +%Y-%m-%d)
ULTIMO="\${DESTINO}/ultimo"

rsync -avz \
  --delete \
  --link-dest="\${ULTIMO}" \
  "\${ORIGEN}" \
  "\${DESTINO}/\${FECHA}/"

# Actualizar el enlace simbólico al último snapshot
rm -f "\${ULTIMO}"
ln -s "\${DESTINO}/\${FECHA}" "\${ULTIMO}"
\`\`\`

Estructura resultante en disco:

\`\`\`text
/backup/snapshots/
├── 2025-01-01/   (snapshot completo: 10 GB en disco)
├── 2025-01-02/   (solo archivos nuevos/modificados; el resto son hardlinks)
├── 2025-01-03/   (ídem)
├── 2025-01-04/   (ídem)
└── ultimo -> 2025-01-04/  (enlace simbólico)
\`\`\`

Cada directorio contiene todos los archivos visibles (parecen copias completas), pero en disco solo se almacena el espacio de los archivos únicos. Borrar un snapshot antiguo libera solo los bloques que no comparte con otros.

### 📖 rsync sobre SSH para backups remotos

\`\`\`bash
# Backup local → servidor remoto
rsync -avz -e ssh /data/ usuario@backup-server:/backup/datos/

# Backup servidor remoto → local
rsync -avz -e ssh usuario@backup-server:/datos-remotos/ /backup/remoto/

# Con clave SSH específica y puerto no estándar
rsync -avz \
  -e "ssh -i /root/.ssh/backup_key -p 2222" \
  /data/ \
  backup-user@192.168.1.100:/backup/prod/
\`\`\`

**Configurar SSH sin contraseña para backups automatizados:**

\`\`\`bash
# En el servidor de backup (origen del rsync)
ssh-keygen -t ed25519 -f /root/.ssh/backup_key -N ""

# Copiar la clave pública al servidor de destino
ssh-copy-id -i /root/.ssh/backup_key.pub backup-user@backup-server

# Probar que funciona sin contraseña
ssh -i /root/.ssh/backup_key backup-user@backup-server "echo OK"
\`\`\`

**Restringir la clave SSH solo a rsync (authorized_keys con command):**

\`\`\`bash
# En /home/backup-user/.ssh/authorized_keys del servidor destino:
command="rsync --server --sender -avz . /backup/",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA... backup@prod-server
\`\`\`

Esto limita la clave a solo ejecutar rsync en modo receptor — no puede usarse para shell interactivo.

### 📖 Opciones de red y progreso

\`\`\`bash
# Mostrar progreso archivo por archivo
rsync -avz --progress /data/ destino/

# Mostrar progreso total de la transferencia
rsync -avz --info=progress2 /data/ destino/

# Limitar uso de ancho de banda (en KB/s)
rsync -avz --bwlimit=5000 /data/ usuario@remoto:/backup/  # máximo 5 MB/s

# Continuar transferencia interrumpida
rsync -avz --partial --progress /data/ usuario@remoto:/backup/
# --partial conserva archivos parcialmente transferidos para reanudar
\`\`\`

### 📖 Dry run: verificar antes de ejecutar

Siempre usa --dry-run antes de ejecutar rsync con --delete en producción por primera vez:

\`\`\`bash
rsync -avzn --delete /data/ /backup/
# -n es alias de --dry-run
# Muestra qué haría pero no modifica nada
\`\`\`

### 📖 Exit codes de rsync

rsync devuelve códigos de salida distintos que permiten monitoreo preciso:

\`\`\`text
0   — Éxito completo
1   — Error de sintaxis en los argumentos
2   — Error de incompatibilidad de protocolo
10  — Error de I/O durante la transferencia
11  — Error de espacio en disco o cuota excedida
12  — Error en el protocolo de datos rsync
23  — Transferencia parcial: algunos archivos fallaron (continúa)
24  — Transferencia parcial: archivos fuente desaparecieron durante copia
25  — Límite de borrado (-max-delete) alcanzado
30  — Timeout esperando datos del socket
\`\`\`

El código 23 es común y aceptable en algunos contextos (archivos en uso por la aplicación). El código 24 ocurre cuando copias directorios con archivos que cambian activamente. Ambos se deben loguear como warnings, no como errores fatales.

### 📖 Script de backup completo con logging

\`\`\`bash
#!/bin/bash
# /usr/local/bin/backup-rsync.sh

set -euo pipefail

# Configuración
ORIGEN="/var/app/data/"
DESTINO_BASE="/backup/snapshots"
LOG_FILE="/var/log/backup/rsync-\$(date +%Y-%m-%d).log"
LOCK_FILE="/var/run/backup-rsync.lock"
RETENER_DIAS=14
SSH_KEY="/root/.ssh/backup_key"
REMOTO_USER="backup"
REMOTO_HOST="192.168.1.50"
REMOTO_DEST="/backup/prod/"

# Función de logging
log() {
  echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$*" | tee -a "\${LOG_FILE}"
}

# Verificar que no hay otra instancia corriendo
if [ -f "\${LOCK_FILE}" ]; then
  PID=\$(cat "\${LOCK_FILE}")
  if kill -0 "\${PID}" 2>/dev/null; then
    log "ERROR: Backup ya en ejecución (PID \${PID}). Saliendo."
    exit 1
  else
    log "WARNING: Lock file huérfano encontrado. Limpiando."
    rm -f "\${LOCK_FILE}"
  fi
fi

echo \$\$ > "\${LOCK_FILE}"
trap 'rm -f "\${LOCK_FILE}"; log "Backup interrumpido."' EXIT INT TERM

# Crear directorio de logs si no existe
mkdir -p "\$(dirname "\${LOG_FILE}")"

FECHA=\$(date +%Y-%m-%d_%H-%M-%S)
SNAPSHOT_DIR="\${DESTINO_BASE}/\${FECHA}"
ULTIMO_LINK="\${DESTINO_BASE}/ultimo"

log "=== Iniciando backup rsync ==="
log "Origen: \${ORIGEN}"
log "Destino: \${SNAPSHOT_DIR}"

# Backup local con hardlinks incrementales
RSYNC_OPTS=(
  -avz
  --delete
  --exclude='*.tmp'
  --exclude='*.log'
  --exclude='*.pid'
  --stats
)

if [ -d "\${ULTIMO_LINK}" ]; then
  RSYNC_OPTS+=(--link-dest="\${ULTIMO_LINK}")
  log "Modo incremental (referencia: \${ULTIMO_LINK})"
else
  log "Modo completo (primer backup)"
fi

# Ejecutar rsync local
rsync "\${RSYNC_OPTS[@]}" "\${ORIGEN}" "\${SNAPSHOT_DIR}/" >> "\${LOG_FILE}" 2>&1
RSYNC_EXIT=\$?

if [ \$RSYNC_EXIT -eq 0 ] || [ \$RSYNC_EXIT -eq 24 ]; then
  log "Backup local completado (exit: \${RSYNC_EXIT})"
  rm -f "\${ULTIMO_LINK}"
  ln -s "\${SNAPSHOT_DIR}" "\${ULTIMO_LINK}"
else
  log "ERROR: rsync local falló con código \${RSYNC_EXIT}"
  exit \${RSYNC_EXIT}
fi

# Backup remoto (offsite)
log "Iniciando sincronización remota..."
rsync -avz \
  -e "ssh -i \${SSH_KEY} -o StrictHostKeyChecking=yes" \
  --delete \
  --bwlimit=10000 \
  "\${ORIGEN}" \
  "\${REMOTO_USER}@\${REMOTO_HOST}:\${REMOTO_DEST}" >> "\${LOG_FILE}" 2>&1
REMOTE_EXIT=\$?

if [ \$REMOTE_EXIT -eq 0 ]; then
  log "Backup remoto completado."
else
  log "WARNING: Backup remoto falló (exit: \${REMOTE_EXIT}). Backup local OK."
fi

# Limpiar snapshots antiguos
log "Limpiando snapshots con más de \${RETENER_DIAS} días..."
find "\${DESTINO_BASE}" \
  -maxdepth 1 \
  -type d \
  -name "????-??-??_??-??-??" \
  -mtime +\${RETENER_DIAS} \
  -exec rm -rf {} + >> "\${LOG_FILE}" 2>&1

log "=== Backup completado ==="
rm -f "\${LOCK_FILE}"
trap - EXIT
\`\`\`

### 📖 rsync vs cp: por qué rsync es superior para backups

\`\`\`text
Escenario: 50 GB de datos, 200 MB de cambios diarios

cp -r /data/ /backup/:
  - Siempre copia los 50 GB completos
  - 2+ horas diarias
  - 350 GB de almacenamiento por semana

rsync -av --link-dest /data/ /backup/snapshot/:
  - Primera vez: copia 50 GB completos
  - Días siguientes: transfiere solo 200 MB de cambios
  - 8-10 minutos diarios tras el primer backup
  - ~51-52 GB de almacenamiento por semana (hardlinks)
\`\`\`

### 📋 Lo que debes recordar

* -avz es la combinación base para backups: archive + verbose + compress.
* La barra al final del origen define si copias el directorio o su contenido.
* --link-dest permite snapshots diarios que parecen completos pero usan espacio solo por los cambios.
* rsync sobre SSH con clave sin passphrase es el estándar para backups remotos automatizados.
* Usa --dry-run siempre antes de un primer rsync con --delete en producción.
* El lock file evita que dos instancias del script corran simultáneamente y corrompan el backup.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`rsync -av /data/ /backup/\` y \`rsync -av /data /backup/\`? ¿Cuál produce \`/backup/data/archivo.txt\`?

2. Tienes snapshots diarios de los últimos 10 días usando --link-dest. Si quieres ver el contenido del snapshot del 5 de enero, ¿cómo accedes a él? ¿Puedes borrarlo de forma segura sin afectar otros snapshots?

3. El script de backup falla con exit code 23. ¿Debes tratar esto como error crítico o como warning? ¿Por qué?

---

1. Con barra (\`/data/\`): copia el contenido de data dentro de /backup/, resultado: /backup/archivo.txt. Sin barra (\`/data\`): copia el directorio data dentro de /backup/, resultado: /backup/data/archivo.txt. La versión SIN barra produce /backup/data/archivo.txt.

2. El snapshot está en \`/backup/snapshots/2025-01-05/\` y puedes navegar directamente como cualquier directorio. Puedes borrarlo con \`rm -rf /backup/snapshots/2025-01-05/\` de forma segura: los hardlinks en otros snapshots que apuntan a los mismos bloques de disco seguirán funcionando. El sistema de archivos solo libera los bloques que no comparte con ningún otro snapshot.

3. Exit code 23 es un warning, no un error crítico. Significa que algunos archivos fallaron en copiarse pero rsync continuó. Esto es normal cuando la aplicación tiene archivos temporales en uso, sockets, o archivos que cambian durante la copia. Se debe loguear y alertar si ocurre de forma consistente, pero no se debe tratar como fallo fatal del backup.
`

export default content
