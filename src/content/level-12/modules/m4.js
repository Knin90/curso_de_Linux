const content = `
## Módulo 4 — Manejo de errores y scripts robustos

### 🎯 Objetivos de aprendizaje

* Implementar manejo de errores con traps y exit codes.
* Usar traps para limpieza automática de recursos temporales.
* Crear scripts idempotentes que puedan ejecutarse múltiples veces de forma segura.
* Aplicar técnicas de logging y debugging en scripts de producción.

### ❓ El problema real

Tu script de backup crea un archivo temporal, falla a mitad de ejecución y deja el archivo temporal en disco. La próxima vez que corre, falla porque el archivo ya existe. O peor: tu script de deployment falla a mitad del proceso y deja el servidor en un estado inconsistente sin ningún mensaje claro de qué salió mal. Los scripts robustos manejan los errores explícitamente, limpian tras de sí y siempre explican por qué fallaron.

### 📖 Exit codes: el lenguaje del éxito y el fracaso

\`\`\`bash
# Por convención:
# 0    = éxito
# 1    = error genérico
# 2    = mal uso (bad usage)
# 126  = el comando existe pero no es ejecutable
# 127  = comando no encontrado
# 128+ = señal fatal (128+señal: SIGTERM=143, SIGKILL=137)

# Verificar el exit code del último comando
ls /etc/passwd
echo $?         # 0

ls /no-existe
echo $?         # 2

# Salir con exit code específico
exit 0          # éxito
exit 1          # error genérico
exit 2          # mal uso del script
\`\`\`

### 📖 trap: ejecutar código al salir o recibir señales

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# Crear archivo temporal
TMP_FILE=$(mktemp /tmp/mi-script-XXXXXX)

# TRAP: se ejecuta cuando el script termina (éxito, error o señal)
cleanup() {
    local exit_code=$?
    rm -f "$TMP_FILE"
    if [[ $exit_code -ne 0 ]]; then
        echo "Script terminó con error (exit $exit_code)" >&2
    fi
}
trap cleanup EXIT

# También capturar señales específicas
trap 'echo "Interrumpido por el usuario"; exit 130' INT TERM

# Ahora, sin importar cómo termine el script,
# cleanup() se ejecutará y borrará el archivo temporal
echo "Trabajando..." > "$TMP_FILE"
# ... resto del script ...
\`\`\`

**Señales comunes para trap:**

\`\`\`text
EXIT    → al salir por cualquier causa (el más usado)
INT     → Ctrl+C (SIGINT)
TERM    → señal de terminación (kill, systemd stop)
ERR     → cuando un comando falla (alternativa a set -e)
HUP     → hangup (terminal cerrada)
\`\`\`

### 📖 Manejo explícito de errores

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# Función die: salir con mensaje de error
die() {
    echo "ERROR: $*" >&2
    exit 1
}

# Patrón: comando || die "mensaje"
mkdir -p /var/backups || die "No se pudo crear directorio de backups"
cp /etc/nginx/nginx.conf /var/backups/ || die "Backup de nginx.conf falló"

# Verificar condición con mensaje descriptivo
[[ -n "\${DATABASE_URL:-}" ]] || die "Variable DATABASE_URL no está definida"
[[ -f "\${CONFIG_FILE}" ]] || die "Config no encontrada: \${CONFIG_FILE}"

# Capturar el error pero continuar
if ! comando_opcional --arg; then
    echo "Advertencia: comando_opcional falló, continuando..." >&2
fi
\`\`\`

### 📖 Debugging: encontrar bugs en scripts

\`\`\`bash
# Ejecutar script con trace (muestra cada comando antes de ejecutarlo)
bash -x mi-script.sh

# Activar trace dentro del script
set -x      # iniciar trace
# ... código a debuggear ...
set +x      # detener trace

# Trace verboso: muestra expansiones
PS4='+ \${BASH_SOURCE}:\${LINENO}: '
set -x

# Dry-run: mostrar lo que haría sin ejecutar
DRY_RUN="\${DRY_RUN:-false}"

ejecutar() {
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY RUN] $*"
    else
        "$@"
    fi
}

ejecutar rm -rf /tmp/viejo
ejecutar systemctl restart nginx
\`\`\`

### 📖 Scripts idempotentes

Un script idempotente puede ejecutarse múltiples veces con el mismo resultado — fundamental para automation y CI/CD:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

USUARIO="deploy"
HOME_DIR="/home/$USUARIO"

# Idempotente: crear usuario solo si no existe
if ! id "$USUARIO" &>/dev/null; then
    useradd -m -d "$HOME_DIR" -s /bin/bash "$USUARIO"
    echo "Usuario $USUARIO creado"
else
    echo "Usuario $USUARIO ya existe, omitiendo"
fi

# Idempotente: crear directorio solo si no existe
if [[ ! -d "$HOME_DIR/.ssh" ]]; then
    mkdir -p "$HOME_DIR/.ssh"
    chmod 700 "$HOME_DIR/.ssh"
    chown "$USUARIO:$USUARIO" "$HOME_DIR/.ssh"
fi

# Idempotente: agregar entrada solo si no está presente
AUTHORIZED_KEY="ssh-ed25519 AAAA... deploy@ci"
if ! grep -qF "$AUTHORIZED_KEY" "$HOME_DIR/.ssh/authorized_keys" 2>/dev/null; then
    echo "$AUTHORIZED_KEY" >> "$HOME_DIR/.ssh/authorized_keys"
    echo "Clave SSH agregada"
fi
\`\`\`

### 📖 Logging estructurado en scripts

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# Variables de logging
LOG_FILE="/var/log/mi-script.log"
VERBOSE=false

log() {
    local level="$1"; shift
    local msg="$*"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    local line="[$ts] [$level] $msg"

    # Siempre al log file
    echo "$line" >> "$LOG_FILE"

    # A stderr si verbose o es error/warn
    if [[ "$VERBOSE" == true ]] || [[ "$level" =~ ^(ERROR|WARN)$ ]]; then
        echo "$line" >&2
    fi
}

log_info()  { log "INFO " "$@"; }
log_warn()  { log "WARN " "$@"; }
log_error() { log "ERROR" "$@"; }

# Trap con logging
on_exit() {
    local code=$?
    if [[ $code -ne 0 ]]; then
        log_error "Script terminó con código $code"
    else
        log_info "Script completado exitosamente"
    fi
}
trap on_exit EXIT

log_info "Iniciando proceso de backup"
# ... resto del script ...
\`\`\`

### 📋 Lo que debes recordar

* \`trap cleanup EXIT\` es obligatorio en cualquier script que cree archivos temporales o recursos.
* \`comando || die "mensaje descriptivo"\` es más informativo que dejar que \`set -e\` aborte sin contexto.
* Scripts idempotentes comprueban el estado antes de actuar — nunca asumen que el estado inicial es "limpio".
* \`bash -x script.sh\` es el primer recurso cuando un script falla y no sabes por qué.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`trap cleanup EXIT\` y \`trap cleanup ERR\`?
2. Tu script crea \`/tmp/backup-$$\` pero puede ser interrumpido con Ctrl+C. ¿Cómo garantizas que se limpie?
3. ¿Qué hace \`set -u\` y por qué es importante junto con \`\${var:-}\` como valor por defecto?

---

1. \`EXIT\` se dispara cuando el script termina **por cualquier causa** (éxito, error, señal manejada). \`ERR\` se dispara solo cuando un comando retorna un exit code distinto de 0 — similar a \`set -e\` pero como hook. Para limpieza de recursos, \`EXIT\` es superior porque cubre todos los casos incluyendo salidas normales.
2. \`trap 'rm -f "/tmp/backup-$$"' EXIT\` — el trap en EXIT garantiza la limpieza sin importar cómo termine el script: éxito, error o SIGINT (Ctrl+C genera exit code 130, que también dispara EXIT).
3. \`set -u\` hace que referenciar una variable no definida sea un error fatal (aborta el script). Esto previene bugs donde una variable mal escrita se expande a vacío y el comando se ejecuta de forma incorrecta. \`\${var:-}\` o \`\${var:-default}\` son la forma de indicar explícitamente "esta variable puede estar vacía y es intencional", desactivando el error de \`-u\` para ese caso específico.
`

export default content
