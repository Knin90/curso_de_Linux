const content = `
## Módulo 8 — Laboratorio integrado: sistema de automatización completo

### 🎯 Objetivos de aprendizaje

* Diseñar un sistema de automatización completo para un servidor de producción.
* Combinar cron, systemd timers y at según el caso de uso correcto.
* Implementar monitoreo de los propios jobs de automatización.
* Auditar y limpiar un sistema con jobs heredados y desorganizados.

### 📖 El escenario

Servidor web de producción con:
- nginx + aplicación Node.js
- PostgreSQL
- Necesidades de backup, monitoreo, mantenimiento y reporting

Objetivo: diseñar el sistema de automatización completo.

### 📖 Paso 1: auditar los jobs existentes

Antes de añadir nada nuevo, auditar el estado actual:

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

### 📖 Paso 2: diseño del sistema de automatización

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

### 📖 Paso 3: implementar los jobs principales

**Backup con lock y notificación:**

\`\`\`bash
sudo nano /etc/cron.d/app-backups
\`\`\`

\`\`\`text
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

# Backup PostgreSQL
0 2 * * * postgres  flock -n /var/lock/backup-db.lock /usr/local/bin/backup-db.sh >> /var/log/backup-db.log 2>&1

# Backup archivos (30min después del DB para no solapar I/O)
30 2 * * * root  flock -n /var/lock/backup-files.lock /usr/local/bin/backup-files.sh >> /var/log/backup-files.log 2>&1
\`\`\`

**Health check como systemd timer:**

\`\`\`bash
sudo tee /etc/systemd/system/healthcheck.service << 'EOF'
[Unit]
Description=Health check de la aplicación
After=network.target

[Service]
Type=oneshot
User=nobody
ExecStart=/usr/local/bin/healthcheck.sh
StandardOutput=journal
StandardError=journal
EOF

sudo tee /etc/systemd/system/healthcheck.timer << 'EOF'
[Unit]
Description=Health check cada 5 minutos

[Timer]
OnCalendar=*:0/5
Persistent=false

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now healthcheck.timer
\`\`\`

### 📖 Paso 4: script de healthcheck completo

\`\`\`bash
sudo tee /usr/local/bin/healthcheck.sh << 'SCRIPT'
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
SCRIPT
chmod +x /usr/local/bin/healthcheck.sh
\`\`\`

### 📖 Paso 5: monitorear el sistema de automatización

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

### 📖 Checklist de producción

\`\`\`text
ANTES DE PONER EN PRODUCCIÓN UN JOB PROGRAMADO:

□ ¿Tiene lock? (para prevenir ejecuciones simultáneas)
□ ¿Tiene timeout? (para prevenir que se cuelgue)
□ ¿Tiene logging? (para poder auditar qué pasó)
□ ¿Tiene notificación de fallo? (para enterarte si falla)
□ ¿Es idempotente? (¿qué pasa si corre dos veces seguidas?)
□ ¿Qué pasa si falla a mitad? ¿deja el sistema en estado inconsistente?
□ ¿El usuario bajo el que corre tiene los permisos necesarios?
□ ¿Se probó la ejecución manual antes de activar en cron?
□ ¿Está documentado en el README o wiki del sistema?
□ ¿Hay monitoreo de que el job se ejecuta con la frecuencia esperada?
\`\`\`

### 🧪 Ejercicio de cierre

Implementa en tu servidor el sistema completo:

1. Instalar el script de auditoría y ejecutarlo
2. Crear \`/etc/cron.d/lab-backup\` con un backup simulado (\`echo "backup OK" >> /tmp/backup.log\`) que corra cada minuto y use flock
3. Crear el systemd timer de healthcheck con el script básico (verificar nginx y disco)
4. Ejecutar \`watch -n 5 'tail -5 /tmp/backup.log'\` y verificar que el backup corre cada minuto
5. Verificar con \`journalctl -u healthcheck.service -f\` que el timer funciona
6. Comprobar que no hay dos instancias simultáneas del backup

Este ejercicio consolida: cron con lock, systemd timer con journald, y monitoreo de los propios jobs de automatización.
`

export default content
