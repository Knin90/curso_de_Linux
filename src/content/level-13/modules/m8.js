const content = `
## Módulo 8 — Proyecto real: sistema de automatización para un servidor de producción

### 🎯 Objetivos de aprendizaje

* Diseñar un sistema de automatización completo combinando cron, systemd timers y at según el caso de uso correcto.
* Implementar monitoreo de los propios jobs de automatización, no solo de la aplicación.
* Auditar y limpiar un servidor con tareas heredadas y desorganizadas.

### ❓ El problema real

Heredaste la administración de un servidor con nginx, una aplicación Node.js y PostgreSQL. Nadie documentó qué tareas automáticas existen: hay crontabs de al menos dos usuarios, archivos sueltos en \`/etc/cron.d/\`, y sospechas de que algún backup lleva semanas fallando en silencio. Antes de agregar nada nuevo, necesitas auditar todo lo que ya corre, diseñar un plan de automatización con la herramienta correcta para cada tarea, y dejar un mecanismo para saber si un job deja de ejecutarse.

### 📖 Estructura del proyecto

\`\`\`
automatizacion-produccion/
├── audit-cron.sh
├── cron.d/
│   └── app-backups
├── systemd/
│   ├── healthcheck.service
│   └── healthcheck.timer
├── healthcheck.sh
└── check-jobs.sh
\`\`\`

### 📖 audit-cron.sh — inventario completo de tareas programadas

\`\`\`bash
#!/usr/bin/env bash
# audit-cron.sh — inventario completo de tareas programadas

echo "========================================"
echo " AUDITORÍA DE TAREAS PROGRAMADAS"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

echo ""
echo "--- Crontab del usuario actual ---"
crontab -l 2>/dev/null || echo "(vacío)"

echo ""
echo "--- Crontab de root ---"
sudo crontab -l 2>/dev/null || echo "(vacío o sin permiso)"

echo ""
echo "--- /etc/crontab ---"
cat /etc/crontab 2>/dev/null

echo ""
echo "--- /etc/cron.d/ ---"
ls /etc/cron.d/ 2>/dev/null && for f in /etc/cron.d/*; do
    echo ""; echo ">> $f:"; cat "$f"
done

echo ""
echo "--- /etc/cron.daily/ ---"
ls /etc/cron.daily/

echo ""
echo "--- /etc/cron.weekly/ ---"
ls /etc/cron.weekly/

echo ""
echo "--- systemd timers activos ---"
systemctl list-timers --all

echo ""
echo "--- Trabajos at pendientes ---"
atq 2>/dev/null || echo "(atd no disponible)"
\`\`\`

### 📖 Plan de automatización — qué herramienta para cada tarea

\`\`\`text
TAREA                    HERRAMIENTA  FRECUENCIA    JUSTIFICACIÓN
────────────────────────────────────────────────────────────────────────
Backup PostgreSQL        cron         Diario 2am    Hora exacta importa
Backup archivos app      cron         Diario 2:30am Después del DB backup
Rotación de logs nginx   cron.daily   Diaria        Integrado con logrotate
Health check app         systemd      Cada 5min     Logs integrados, deps
Renovación cert SSL      cron.d       Semanal       Instalado por certbot
Limpieza /tmp            anacron      Cada 2 días   Sistema que puede reiniciar
Reporte semanal          systemd      Lunes 9am     Necesita env variables
Restart nocturno nginx   at           Una vez       Ventana de mantenimiento
\`\`\`

### 📖 cron.d/app-backups — backup con lock y sin solapamiento

\`\`\`text
# /etc/cron.d/app-backups
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

# Backup PostgreSQL
0 2 * * * postgres  flock -n /var/lock/backup-db.lock /usr/local/bin/backup-db.sh >> /var/log/backup-db.log 2>&1

# Backup archivos (30min después del DB para no solapar I/O)
30 2 * * * root  flock -n /var/lock/backup-files.lock /usr/local/bin/backup-files.sh >> /var/log/backup-files.log 2>&1
\`\`\`

### 📖 systemd/healthcheck.service y healthcheck.timer

\`\`\`ini
# /etc/systemd/system/healthcheck.service
[Unit]
Description=Health check de la aplicación
After=network.target

[Service]
Type=oneshot
User=nobody
ExecStart=/usr/local/bin/healthcheck.sh
StandardOutput=journal
StandardError=journal
\`\`\`

\`\`\`ini
# /etc/systemd/system/healthcheck.timer
[Unit]
Description=Health check cada 5 minutos

[Timer]
OnCalendar=*:0/5
Persistent=false

[Install]
WantedBy=timers.target
\`\`\`

### 📖 healthcheck.sh — verificación con alerta tras fallos consecutivos

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_URL="\${SLACK_WEBHOOK:-}"
ALERT_FILE="/var/run/healthcheck-alert.flag"
THRESHOLD_FAIL=3   # alertar después de N fallos consecutivos

check_failed=false

# Verificar nginx
if ! curl -sf --max-time 5 http://localhost/health > /dev/null 2>&1; then
    echo "FALLO: nginx no responde"
    check_failed=true
fi

# Verificar PostgreSQL
if ! pg_isready -q -h localhost -p 5432; then
    echo "FALLO: PostgreSQL no disponible"
    check_failed=true
fi

# Verificar espacio en disco
DISK_USE=$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
if [ "$DISK_USE" -gt 85 ]; then
    echo "ALERTA: Disco al \${DISK_USE}%"
    check_failed=true
fi

if $check_failed; then
    # Contar fallos consecutivos
    FAIL_COUNT=$(cat "$ALERT_FILE" 2>/dev/null || echo 0)
    FAIL_COUNT=$(( FAIL_COUNT + 1 ))
    echo "$FAIL_COUNT" > "$ALERT_FILE"

    if [ "$FAIL_COUNT" -ge "$THRESHOLD_FAIL" ] && [ -n "$WEBHOOK_URL" ]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \":red_circle: [$(hostname)] Health check fallido $FAIL_COUNT veces consecutivas\"}" \
            > /dev/null 2>&1 || true
    fi
    exit 1
else
    # Reset contador de fallos
    rm -f "$ALERT_FILE"
fi
\`\`\`

### 📖 check-jobs.sh — monitorear el propio sistema de automatización

\`\`\`bash
#!/usr/bin/env bash
# check-jobs.sh — verificar que los jobs corren cuando deben

echo "=== Estado de automatización: $(date) ==="
echo ""

echo "--- Últimos backups ---"
for log in /var/log/backup-db.log /var/log/backup-files.log; do
    if [ -f "$log" ]; then
        LAST=$(tail -1 "$log")
        MTIME=$(stat -c "%y" "$log" | cut -d. -f1)
        echo "$(basename $log): última actividad $MTIME"
    fi
done

echo ""
echo "--- Timers systemd ---"
systemctl list-timers healthcheck.timer backup.timer 2>/dev/null

echo ""
echo "--- Fallos recientes en jobs ---"
journalctl -u healthcheck.service --since "24 hours ago" -p err -q 2>/dev/null | wc -l | xargs echo "Errores healthcheck (24h):"
journalctl -u backup.service --since "24 hours ago" -p err -q 2>/dev/null | wc -l | xargs echo "Errores backup (24h):"

echo ""
echo "--- Locks activos ---"
lsof /var/lock/*.lock 2>/dev/null | grep -v COMMAND || echo "(ninguno)"
\`\`\`

### 📖 Secuencia de ejecución

**Paso 1: auditar antes de tocar nada**

\`\`\`bash
chmod +x audit-cron.sh
./audit-cron.sh > /tmp/auditoria-$(date +%Y%m%d).txt
less /tmp/auditoria-$(date +%Y%m%d).txt
\`\`\`

Encuentras un backup en \`/etc/cron.d/\` sin \`flock\`, apuntando a un script que ya no existe — la causa del "backup fallando en silencio".

**Paso 2: instalar el backup con lock**

\`\`\`bash
sudo cp cron.d/app-backups /etc/cron.d/app-backups
sudo chmod 644 /etc/cron.d/app-backups
\`\`\`

**Paso 3: instalar el health check como systemd timer**

\`\`\`bash
sudo cp healthcheck.sh /usr/local/bin/healthcheck.sh
sudo chmod +x /usr/local/bin/healthcheck.sh
sudo cp systemd/healthcheck.service /etc/systemd/system/healthcheck.service
sudo cp systemd/healthcheck.timer /etc/systemd/system/healthcheck.timer
sudo systemctl daemon-reload
sudo systemctl enable --now healthcheck.timer
systemctl list-timers healthcheck.timer
\`\`\`

Salida esperada:

\`\`\`
NEXT                        LEFT      LAST  PASSED  UNIT                ACTIVATES
Tue 2024-05-14 09:05:00 UTC 3min left n/a   n/a      healthcheck.timer   healthcheck.service
\`\`\`

**Paso 4: verificar que todo corre cuando debe**

\`\`\`bash
chmod +x check-jobs.sh
./check-jobs.sh
\`\`\`

\`\`\`
=== Estado de automatización: Tue May 14 09:10:02 UTC 2024 ===

--- Últimos backups ---
backup-db.log: última actividad 2024-05-14 02:00:03
backup-files.log: última actividad 2024-05-14 02:30:05

--- Timers systemd ---
NEXT                        LEFT      LAST                         PASSED    UNIT
Tue 2024-05-14 09:15:00 UTC 4min left Tue 2024-05-14 09:10:00 UTC  2s ago    healthcheck.timer

--- Fallos recientes en jobs ---
Errores healthcheck (24h): 0
Errores backup (24h): 0

--- Locks activos ---
(ninguno)
\`\`\`

### 📋 Lo que debes recordar

* \`flock -n\` en el propio cron previene que dos instancias del mismo job corran a la vez si una se cuelga.
* Un job programado sin logging ni notificación de fallo puede llevar semanas fallando "en silencio" — como el que encontraste en la auditoría.
* systemd timers son preferibles a cron cuando el job necesita dependencias de servicio (\`After=\`) o logs integrados en \`journalctl\`.
* Monitorear la automatización requiere verificar la última ejecución, no solo que el timer/cron exista.
* Auditar antes de automatizar: nunca agregues un job nuevo sin saber qué ya está corriendo.

### 🧪 Autoevaluación

1. \`check-jobs.sh\` muestra que \`backup-db.log\` no tiene actividad desde hace 3 días, pero el cron sigue en \`/etc/cron.d/app-backups\`. ¿Qué dos comandos usarías primero para diagnosticar por qué dejó de correr?
2. ¿Por qué el health check se implementó como systemd timer en lugar de una entrada de cron?
3. El script \`backup-db.sh\` no usa \`flock\`. Si tarda más de 24 horas en completarse un día (por ejemplo, una base de datos muy grande), ¿qué puede pasar al día siguiente a las 2am?

---

1. \`journalctl -u healthcheck.service --since "3 days ago"\` (o revisar directamente \`grep CRON /var/log/syslog\`) para ver si cron intentó ejecutarlo, y \`sudo crontab -l\` / \`cat /etc/cron.d/app-backups\` para confirmar que la ruta del script y el usuario configurado (\`postgres\`) siguen siendo correctos.
2. Porque necesita \`After=network.target\` para no ejecutarse antes de que la red esté lista, y porque sus fallos quedan integrados en \`journalctl -u healthcheck.service\`, lo que unifica logs de aplicación y de automatización en un solo lugar — cron por sí solo no ofrece ninguna de las dos cosas.
3. Sin \`flock\`, cron lanzaría una segunda instancia de \`backup-db.sh\` mientras la primera sigue corriendo: dos \`pg_dump\` simultáneos compitiendo por I/O, el riesgo de un backup corrupto a medio escribir, y consumo doble de recursos justo cuando el sistema ya está bajo carga.
`

export default content
