const content = `
## Módulo 7 — Patrones de automatización: locks, logs y notificaciones

### 🎯 Objetivos de aprendizaje

* Implementar locks para prevenir ejecuciones simultáneas de un job.
* Crear un sistema de logging consistente para tareas programadas.
* Enviar notificaciones cuando una tarea falla.
* Implementar timeouts para evitar que un job cuelgue indefinidamente.

### ❓ El problema real

Tu job de backup tarda 45 minutos. Cron lo lanza cada hora. Después de la segunda ejecución, hay dos instancias del script corriendo simultáneamente, compitiendo por los mismos archivos y corrompiendo el backup. O el job se cuelga por un problema de red y cron sigue lanzando instancias nuevas cada hora. Los locks resuelven esto.

### 📖 Locks: prevenir ejecuciones simultáneas

**Método 1: flock (la forma correcta)**

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/var/lock/mi-job.lock"

# flock: adquirir lock exclusivo o salir inmediatamente si ya está tomado
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "$(date): Otra instancia ya está corriendo, saliendo" >&2
    exit 0    # exit 0: no es un error, es comportamiento esperado
fi

# El lock se libera automáticamente cuando el proceso termina (fd 9 se cierra)
echo "$(date): Iniciando job"
# ... resto del script ...
echo "$(date): Job completado"
\`\`\`

**Método 2: flock en una línea (para crontabs)**

\`\`\`bash
# En el crontab: si no puede obtener el lock, simplemente sale
* * * * * flock -n /var/lock/mi-job.lock /usr/local/bin/mi-script.sh
\`\`\`

**Método 3: archivo PID (más portable)**

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

PIDFILE="/var/run/mi-job.pid"

# Verificar si ya corre una instancia
if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Ya corre con PID $PID, saliendo"
        exit 0
    else
        # PID file obsoleto (el proceso ya no existe)
        echo "Eliminando PID file obsoleto"
        rm -f "$PIDFILE"
    fi
fi

# Registrar nuestro PID
echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"' EXIT

echo "Corriendo con PID $$"
# ... resto del script ...
\`\`\`

### 📖 Timeouts: jobs que no terminan nunca

\`\`\`bash
# Ejecutar comando con timeout de 30 minutos
timeout 1800 /usr/local/bin/backup.sh

# Verificar el resultado
if [ $? -eq 124 ]; then
    echo "ERROR: El backup excedió el tiempo límite de 30 minutos" >&2
fi

# Con señal de kill si no responde al TERM
timeout --kill-after=60 1800 /usr/local/bin/backup.sh

# En crontab: timeout integrado
0 2 * * * timeout 3600 /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
\`\`\`

Para systemd timers, el timeout va en el .service:

\`\`\`ini
[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
TimeoutStartSec=3600    # abort if not done in 1 hour
\`\`\`

### 📖 Sistema de logging consistente

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# ─── Configuración de logging ─────────────────────────────
JOB_NAME="backup-diario"
LOG_DIR="/var/log/jobs"
LOG_FILE="$LOG_DIR/\${JOB_NAME}.log"
MAX_LOG_SIZE=$((50 * 1024 * 1024))    # 50MB

mkdir -p "$LOG_DIR"

# Rotar log si es muy grande
if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE")" -gt "$MAX_LOG_SIZE" ]; then
    mv "$LOG_FILE" "\${LOG_FILE}.\$(date +%Y%m%d)"
    gzip "\${LOG_FILE}.\$(date +%Y%m%d)" &
fi

# Función de logging con separador de sesión
log_session_start() {
    echo "" >> "$LOG_FILE"
    echo "════════════════════════════════════════" >> "$LOG_FILE"
    echo " INICIO: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
    echo " PID: $$  USER: $(whoami)" >> "$LOG_FILE"
    echo "════════════════════════════════════════" >> "$LOG_FILE"
}

log_session_end() {
    local code=$?
    echo "────────────────────────────────────────" >> "$LOG_FILE"
    echo " FIN: $(date '+%Y-%m-%d %H:%M:%S')  EXIT: $code" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

trap log_session_end EXIT
log_session_start

# Redirigir todo el output del script al log
exec >> "$LOG_FILE" 2>&1

echo "Iniciando $JOB_NAME"
# ... resto del script ...
\`\`\`

### 📖 Notificaciones de fallo

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# Enviar alerta si el job falla
NOTIFY_EMAIL="ops@empresa.com"
JOB_NAME="backup-diario"
HOSTNAME=$(hostname)

notify_failure() {
    local exit_code=$?
    local log_tail

    if [ $exit_code -ne 0 ]; then
        log_tail=$(tail -20 /var/log/jobs/backup-diario.log 2>/dev/null || echo "Log no disponible")

        # Opción 1: email con mail/sendmail
        {
            echo "Subject: [ALERTA] Job fallido: $JOB_NAME en $HOSTNAME"
            echo "To: $NOTIFY_EMAIL"
            echo ""
            echo "El job $JOB_NAME falló con código de salida: $exit_code"
            echo "Servidor: $HOSTNAME"
            echo "Hora: $(date '+%Y-%m-%d %H:%M:%S')"
            echo ""
            echo "Últimas líneas del log:"
            echo "$log_tail"
        } | sendmail -t 2>/dev/null || true

        # Opción 2: webhook (Slack, PagerDuty, etc.)
        if command -v curl &>/dev/null && [ -n "\${SLACK_WEBHOOK_URL:-}" ]; then
            curl -s -X POST "$SLACK_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"text\": \":red_circle: Job \\\`$JOB_NAME\\\` falló en $HOSTNAME (exit $exit_code)\"}" \
                > /dev/null 2>&1 || true
        fi
    fi
}
trap notify_failure EXIT

# ... resto del script ...
\`\`\`

### 📖 Script wrapper para cualquier cron job

\`\`\`bash
#!/usr/bin/env bash
# cron-wrapper.sh — envuelve cualquier script con lock, timeout, logging y alertas
# Uso: cron-wrapper.sh <nombre> <timeout_segundos> <comando> [args...]

set -euo pipefail

JOB_NAME="\${1:?nombre requerido}"
TIMEOUT="\${2:?timeout requerido}"
shift 2

LOG_FILE="/var/log/jobs/\${JOB_NAME}.log"
LOCK_FILE="/var/lock/\${JOB_NAME}.lock"

mkdir -p /var/log/jobs

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "\$(date): [$JOB_NAME] Ya corre otra instancia" >> "$LOG_FILE"
    exit 0
fi

{
    echo "=== \$(date): Inicio ==="
    timeout "$TIMEOUT" "$@"
    echo "=== \$(date): Éxito ==="
} >> "$LOG_FILE" 2>&1 || {
    echo "=== \$(date): FALLÓ con código $? ===" >> "$LOG_FILE"
    tail -10 "$LOG_FILE" | mail -s "ALERTA: $JOB_NAME falló" ops@empresa.com 2>/dev/null || true
    exit 1
}
\`\`\`

\`\`\`bash
# En el crontab:
0 2 * * * /usr/local/bin/cron-wrapper.sh backup-db 3600 /usr/local/bin/backup-db.sh
*/5 * * * * /usr/local/bin/cron-wrapper.sh healthcheck 60 /usr/local/bin/healthcheck.sh
\`\`\`

### 📋 Lo que debes recordar

* \`flock -n /var/lock/mi-job.lock comando\` es la forma más simple de prevenir ejecuciones simultáneas.
* \`timeout 3600 mi-script.sh\` previene que un job cuelgue y bloquee el sistema indefinidamente.
* El trap en \`EXIT\` para notificaciones y limpieza es el patrón más robusto — se ejecuta sin importar cómo salga el script.
* Un script wrapper reutilizable para cron jobs reduce la duplicación y garantiza consistencia.

### 🧪 Autoevaluación

1. ¿Qué pasa si usas archivo PID para el lock y el servidor se reinicia sin que el script termine limpiamente?
2. \`timeout\` retorna exit code 124. ¿Qué significa y cómo lo detectas en tu script?
3. ¿Por qué es mejor \`exit 0\` (en lugar de \`exit 1\`) cuando el lock ya está tomado?

---

1. El archivo PID queda con un PID antiguo. Al próximo reinicio, el PID probablemente no existe (o peor: pertenece a un proceso diferente). Por eso el código correcto revisa si el proceso con ese PID realmente existe con \`kill -0 "$PID"\` — si no existe, borra el PID file obsoleto y continúa.
2. Exit code 124 significa que el comando excedió el tiempo límite y fue terminado por \`timeout\`. Para detectarlo: \`timeout 3600 mi-script.sh; if [ $? -eq 124 ]; then echo "timeout"; fi\` — o con \`set -e\` activo, usar \`timeout 3600 mi-script.sh || [ $? -ne 124 ]\`.
3. Porque cuando el lock está tomado, el comportamiento esperado es que la segunda instancia simplemente se vaya — no es un error del sistema, es la protección funcionando correctamente. Con \`exit 1\`, cron podría interpretar el job como fallido y enviar alertas innecesarias.
`

export default content
