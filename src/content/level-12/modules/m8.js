const content = `
## Módulo 8 — Proyecto real: kit de scripts de producción para un equipo pequeño

### 🎯 Objetivos de aprendizaje

* Integrar variables, control de flujo, funciones, manejo de errores y procesamiento de texto en scripts completos.
* Aplicar el patrón de script de producción: shebang, \`set -euo pipefail\`, logging, \`trap\`, validación.
* Construir un script de backup, un script de deployment con rollback y un analizador de logs con \`awk\`.

### ❓ El problema real

Eres la única persona con conocimientos de Linux en una startup de 6 personas. La aplicación corre en un solo servidor con nginx, Node.js y PostgreSQL, y hasta ahora los backups y despliegues se hacían "a mano" copiando comandos de un documento. Necesitas dejar tres scripts robustos —backup, deploy y análisis de logs— que cualquier compañero pueda ejecutar sin romper nada, con logging, manejo de errores y rollback automático si algo falla.

### 📖 Estructura del proyecto

\`\`\`
scripts-produccion/
├── backup.sh
├── deploy.sh
├── analyze-logs.sh
└── CHECKLIST.md
\`\`\`

### 📖 backup.sh — backup automatizado con rotación

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# ─── Configuración ────────────────────────────────────────────────
readonly SCRIPT_NAME="\$(basename "$0")"
readonly BACKUP_DIR="/var/backups/app"
readonly SOURCE_DIR="/var/www/app"
readonly DB_NAME="produccion"
readonly RETENTION_DAYS=30
readonly LOG_FILE="/var/log/backup.log"

# ─── Logging ──────────────────────────────────────────────────────
log() {
    local level="$1"; shift
    printf '[%s] [%s] %s\\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$level" "$*" | tee -a "$LOG_FILE" >&2
}
log_info()  { log "INFO " "$@"; }
log_error() { log "ERROR" "$@"; }
die()       { log_error "$@"; exit 1; }

# ─── Cleanup ──────────────────────────────────────────────────────
TMP_DIR=""
cleanup() {
    [[ -n "$TMP_DIR" ]] && rm -rf "$TMP_DIR"
    log_info "Cleanup completado"
}
trap cleanup EXIT

# ─── Validaciones ─────────────────────────────────────────────────
[[ -d "$SOURCE_DIR" ]] || die "Directorio fuente no existe: $SOURCE_DIR"
command -v pg_dump &>/dev/null || die "pg_dump no encontrado"
mkdir -p "$BACKUP_DIR"

# ─── Backup ───────────────────────────────────────────────────────
FECHA=$(date '+%Y%m%d_%H%M%S')
TMP_DIR=$(mktemp -d /tmp/backup-XXXXXX)

log_info "Iniciando backup: $FECHA"

# 1. Backup de base de datos
log_info "Exportando base de datos: $DB_NAME"
pg_dump "$DB_NAME" | gzip > "$TMP_DIR/db.sql.gz" || die "pg_dump falló"

# 2. Backup de archivos
log_info "Comprimiendo archivos: $SOURCE_DIR"
tar -czf "$TMP_DIR/files.tar.gz" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")" \
    || die "tar falló"

# 3. Empaquetar todo
BACKUP_FILE="$BACKUP_DIR/backup-\${FECHA}.tar.gz"
tar -czf "$BACKUP_FILE" -C "$TMP_DIR" . || die "Empaquetado final falló"
log_info "Backup creado: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# 4. Rotación: eliminar backups más antiguos que RETENTION_DAYS
log_info "Rotando backups con más de $RETENTION_DAYS días"
find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
BACKUPS_RESTANTES=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" | wc -l)
log_info "Backups restantes: $BACKUPS_RESTANTES"

log_info "Backup completado exitosamente"
\`\`\`

### 📖 deploy.sh — deployment con rollback automático

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

readonly DEPLOY_DIR="/var/www/app"
readonly RELEASES_DIR="/var/www/releases"
readonly SHARED_DIR="/var/www/shared"
readonly APP_SERVICE="mi-app"
readonly LOG_FILE="/var/log/deploy.log"
readonly MAX_RELEASES=5

log() { printf '[%s] %s\\n' "$(date '+%H:%M:%S')" "$*" | tee -a "$LOG_FILE"; }
die() { log "ERROR: $@"; exit 1; }

VERSION="\${1:-}"
[[ -n "$VERSION" ]] || die "Uso: $0 <versión>"

RELEASE_DIR="$RELEASES_DIR/$VERSION"
ROLLBACK_TARGET=""

# Determinar release anterior para rollback
ROLLBACK_TARGET=$(readlink -f "$DEPLOY_DIR" 2>/dev/null || echo "")

rollback() {
    if [[ -n "$ROLLBACK_TARGET" && -d "$ROLLBACK_TARGET" ]]; then
        log "ROLLBACK: restaurando $ROLLBACK_TARGET"
        ln -sfn "$ROLLBACK_TARGET" "$DEPLOY_DIR"
        systemctl restart "$APP_SERVICE" || true
        log "Rollback completado"
    else
        log "Sin versión anterior para rollback"
    fi
}
trap 'rollback' ERR

log "Desplegando versión: $VERSION"

# 1. Crear directorio del release
mkdir -p "$RELEASE_DIR"

# 2. Descargar/copiar la aplicación
log "Descargando artefactos..."
aws s3 cp "s3://mi-bucket/releases/$VERSION.tar.gz" /tmp/ || die "Descarga falló"
tar -xzf "/tmp/$VERSION.tar.gz" -C "$RELEASE_DIR"

# 3. Enlazar directorios compartidos (uploads, logs)
ln -sfn "$SHARED_DIR/uploads" "$RELEASE_DIR/public/uploads"
ln -sfn "$SHARED_DIR/logs" "$RELEASE_DIR/log"

# 4. Instalar dependencias
log "Instalando dependencias..."
cd "$RELEASE_DIR"
npm ci --production 2>&1 | tee -a "$LOG_FILE"

# 5. Migraciones de base de datos
log "Ejecutando migraciones..."
node_modules/.bin/migrate up 2>&1 | tee -a "$LOG_FILE"

# 6. Atomic swap: cambiar symlink
log "Activando nuevo release..."
ln -sfn "$RELEASE_DIR" "$DEPLOY_DIR"
systemctl restart "$APP_SERVICE"

# 7. Healthcheck
sleep 3
curl -sf http://localhost:3000/health || die "Healthcheck falló"

# 8. Limpiar releases viejos
log "Limpiando releases antiguos..."
ls -t "$RELEASES_DIR" | tail -n +$(( MAX_RELEASES + 1 )) | xargs -I{} rm -rf "$RELEASES_DIR/{}"

log "Deployment de $VERSION completado exitosamente"
\`\`\`

### 📖 analyze-logs.sh — analizador de logs con reporte

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="\${1:-/var/log/nginx/access.log}"
TOP_N="\${2:-10}"

[[ -f "$LOG_FILE" ]] || { echo "Archivo no encontrado: $LOG_FILE" >&2; exit 1; }

echo "=========================================="
echo " Análisis: $LOG_FILE"
echo " Generado: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Total de requests
TOTAL=$(wc -l < "$LOG_FILE")
echo ""
echo "Total de requests: $TOTAL"

# Distribución de códigos HTTP
echo ""
echo "--- Códigos HTTP ---"
awk '{print $9}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10 | \
    awk '{printf "  %6d  %s\\n", $1, $2}'

# Top IPs
echo ""
echo "--- Top $TOP_N IPs ---"
awk '{print $1}' "$LOG_FILE" | sort | uniq -c | sort -rn | head "$TOP_N" | \
    awk '{printf "  %6d  %s\\n", $1, $2}'

# Top rutas solicitadas
echo ""
echo "--- Top $TOP_N rutas ---"
awk '{print $7}' "$LOG_FILE" | cut -d? -f1 | sort | uniq -c | sort -rn | head "$TOP_N" | \
    awk '{printf "  %6d  %s\\n", $1, $2}'

# Tráfico total
echo ""
awk '$10 ~ /^[0-9]+$/ {bytes += $10} END {
    printf "Tráfico total: %.2f MB\\n", bytes/1024/1024
}' "$LOG_FILE"

# Errores 5xx
ERRORES=$(awk '$9 ~ /^5/ {count++} END {print count+0}' "$LOG_FILE")
echo "Errores 5xx: $ERRORES"

echo ""
echo "=========================================="
\`\`\`

### 📖 CHECKLIST.md — patrón de script de producción

\`\`\`text
ANTES de poner un script en producción:

□ #!/usr/bin/env bash
□ set -euo pipefail
□ trap cleanup EXIT  (si crea archivos temporales)
□ Validar argumentos y dependencias al inicio
□ Usar "local" en todas las variables de funciones
□ Entrecomillar todas las variables: "$var"
□ Mensajes de error a stderr: echo "..." >&2
□ Exit codes significativos (0=ok, 1=error, 2=usage)
□ Logging con timestamp a un archivo de log
□ Probar con bash -x para verificar expansiones
□ Probar el caso de fallo (¿qué pasa si falla a mitad?)
□ ¿Es idempotente? ¿Se puede ejecutar dos veces sin daño?
\`\`\`

### 📖 Secuencia de ejecución

**Paso 1: preparar el directorio y dar permisos de ejecución**

\`\`\`bash
mkdir -p scripts-produccion && cd scripts-produccion
chmod +x backup.sh deploy.sh analyze-logs.sh
\`\`\`

**Paso 2: ejecutar el backup y confirmar la rotación**

\`\`\`bash
sudo ./backup.sh
ls -lh /var/backups/app/
\`\`\`

Salida esperada (fragmento del log):

\`\`\`
[2024-05-01 02:00:01] [INFO ] Iniciando backup: 20240501_020001
[2024-05-01 02:00:03] [INFO ] Exportando base de datos: produccion
[2024-05-01 02:00:05] [INFO ] Comprimiendo archivos: /var/www/app
[2024-05-01 02:00:12] [INFO ] Backup creado: /var/backups/app/backup-20240501_020001.tar.gz (48M)
[2024-05-01 02:00:12] [INFO ] Rotando backups con más de 30 días
[2024-05-01 02:00:12] [INFO ] Backup completado exitosamente
\`\`\`

**Paso 3: desplegar una nueva versión**

\`\`\`bash
sudo ./deploy.sh v1.4.2
\`\`\`

Si el \`healthcheck\` falla, el \`trap 'rollback' ERR\` restaura automáticamente el symlink anterior y reinicia el servicio — no se requiere intervención manual.

**Paso 4: analizar el tráfico del día**

\`\`\`bash
sudo ./analyze-logs.sh /var/log/nginx/access.log 5
\`\`\`

\`\`\`
==========================================
 Análisis: /var/log/nginx/access.log
 Generado: 2024-05-01 09:12:03
==========================================

Total de requests: 48213

--- Códigos HTTP ---
   45012  200
    2104  304
     820  404
     277  500

--- Top 5 IPs ---
    3210  190.15.22.4
    2894  201.88.14.9
...
Errores 5xx: 277
\`\`\`

Los 277 errores 5xx encontrados por \`analyze-logs.sh\` son la señal para revisar \`journalctl -u mi-app --since today -p err\` antes de que un cliente abra un ticket de soporte.

### 📋 Lo que debes recordar

* \`set -euo pipefail\` + \`trap cleanup EXIT\` es la base de cualquier script que toque producción.
* \`trap 'rollback' ERR\` convierte un fallo a mitad de despliegue en una recuperación automática, no en un servidor roto.
* Las variables siempre entre comillas (\`"$var"\`) evitan errores de word-splitting con espacios o rutas vacías.
* \`awk\` es la herramienta correcta para agregaciones sobre texto estructurado (top IPs, códigos HTTP, tráfico total) sin escribir un script completo.
* Un script de producción se prueba simulando el fallo, no solo el camino feliz.

### 🧪 Autoevaluación

1. En \`deploy.sh\`, ¿qué garantiza que un \`healthcheck\` fallido revierta automáticamente al release anterior, y qué línea del script lo activa?
2. \`backup.sh\` usa \`trap cleanup EXIT\` en lugar de llamar a \`cleanup\` al final del script. ¿Qué ventaja tiene esto si \`pg_dump\` falla a mitad de la ejecución?
3. ¿Por qué \`analyze-logs.sh\` usa \`awk '{print $9}'\` para extraer el código HTTP en lugar de \`grep\`?

---

1. La línea \`trap 'rollback' ERR\` combinada con \`set -euo pipefail\`: cualquier comando que falle (incluido el \`curl -sf .../health || die\`) dispara \`ERR\`, lo que ejecuta \`rollback()\` y restaura el symlink guardado en \`ROLLBACK_TARGET\` antes de salir.
2. \`trap cleanup EXIT\` se ejecuta siempre que el script termina, sea por éxito, por \`die\` o por una señal — así el directorio temporal (\`TMP_DIR\`) se borra incluso si \`pg_dump\` falla a mitad, sin dejar archivos huérfanos en \`/tmp\`.
3. Los logs de nginx en formato combinado tienen el código HTTP como un campo posicional fijo (columna 9); \`awk '{print $9}'\` lo extrae de forma exacta y rápida, mientras que \`grep\` solo podría buscar patrones de texto y sería más frágil ante variaciones en la línea.
`

export default content
