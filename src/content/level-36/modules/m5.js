const content = `
## Módulo 5 — Automatización de backups con cron y systemd timers

### 🎯 Objetivos de aprendizaje
* Escribir un script de backup profesional con BorgBackup, logging y manejo de errores
* Programar backups con cron, incluyendo la sintaxis de tiempo y el manejo de variables de entorno
* Crear units de systemd (service + timer) como alternativa moderna a cron
* Entender las ventajas de \`persistent=yes\` en systemd timers para backups que se pierden
* Configurar alertas de fallo: email y webhooks desde el script de backup
* Rotar los logs de backup con logrotate

### ❓ El problema real

Son las 9 de la mañana del lunes y el servidor de producción acaba de fallar. Abres el repositorio de Borg para restaurar y descubres que el último archive es del viernes hace dos semanas. El backup manual que "ibas a automatizar pronto" nunca se automatizó. O peor: el cron job existe, pero lleva días fallando en silencio porque la variable \`PATH\` no incluye \`/usr/local/bin\` donde está instalado \`borg\`, y nadie configuró \`MAILTO\` para recibir los errores.

La automatización de backups tiene dos partes igual de importantes: que el backup se ejecute, y que alguien se entere cuando no lo hace.

### 📖 El script de backup

Antes de programar nada, necesitas un script robusto. Un script de backup profesional registra cada paso, devuelve exit codes correctos y envía una alerta cuando falla.

\`\`\`bash
#!/usr/bin/env bash
# /usr/local/bin/backup-daily.sh
# Backup diario con BorgBackup — producción

set -euo pipefail

# ── Configuración ────────────────────────────────────────────────────────────
BORG_REPO="user@backup-server:/backups/\$(hostname)"
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
export BORG_REMOTE_PATH=/usr/local/bin/borg

LOGFILE=/var/log/backup/daily.log
ALERT_EMAIL="ops@mycompany.com"
ARCHIVE_NAME="\$(hostname)-daily-\$(date +%Y-%m-%dT%H:%M:%S)"

# Directorios a incluir en el backup
BACKUP_PATHS=(
    /etc
    /home
    /var/www
    /var/lib/postgresql    # datos de PostgreSQL si no usas pg_dump separado
    /opt/myapp
)

# ── Funciones ────────────────────────────────────────────────────────────────
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] \$*" | tee -a "\$LOGFILE"
}

alert_failure() {
    local message="\$1"
    log "ERROR: \$message"
    # Email (requiere mailutils o msmtp configurado)
    echo "\$message" | mail -s "BACKUP FAILED: \$(hostname)" "\$ALERT_EMAIL" 2>/dev/null || true
    # Webhook alternativo (Slack, PagerDuty, etc.)
    # curl -s -X POST https://hooks.slack.com/services/XXX \
    #     -H 'Content-type: application/json' \
    #     --data "{\"text\":\"BACKUP FAILED on \$(hostname): \$message\"}" || true
}

# Captura cualquier error no manejado
trap 'alert_failure "Script failed at line \$LINENO with exit code \$?"' ERR

# ── Ejecución ────────────────────────────────────────────────────────────────
log "=== Iniciando backup: \$ARCHIVE_NAME ==="

# 1. Crear archive
log "Ejecutando borg create..."
borg create \
    --stats \
    --compression zstd \
    --exclude-caches \
    --exclude /home/*/.cache \
    --exclude /home/*/.local/share/Trash \
    --exclude '*.pyc' \
    --exclude '*.log' \
    "\${BORG_REPO}::\${ARCHIVE_NAME}" \
    "\${BACKUP_PATHS[@]}" \
    2>&1 | tee -a "\$LOGFILE"

log "borg create completado (exit code: \$?)"

# 2. Prune: aplicar política de retención
log "Ejecutando borg prune..."
borg prune \
    --keep-daily=7 \
    --keep-weekly=4 \
    --keep-monthly=6 \
    "\$BORG_REPO" \
    2>&1 | tee -a "\$LOGFILE"

# 3. Compact: liberar espacio real en disco
log "Ejecutando borg compact..."
borg compact "\$BORG_REPO" 2>&1 | tee -a "\$LOGFILE"

log "=== Backup completado exitosamente ==="
\`\`\`

**Puntos clave del script:**
- \`set -euo pipefail\`: el script falla inmediatamente ante cualquier error, variable no definida, o fallo en pipe
- \`trap ... ERR\`: captura cualquier fallo inesperado y envía alerta antes de salir
- Los logs van al archivo Y a stdout (útil cuando se ejecuta desde systemd, que captura stdout)
- El email de alerta usa \`|| true\` para no fallar si el correo no está configurado

### 📖 Programar con cron

\`\`\`bash
# Editar el crontab del usuario root
crontab -e

# Ver el crontab actual
crontab -l

# Sintaxis: minuto hora día-mes mes día-semana comando
# *    *    *        *   *            → cada minuto
# 0    2    *        *   *            → cada día a las 2:00am
# 0    2    *        *   0            → cada domingo a las 2:00am
# 0    */6  *        *   *            → cada 6 horas
\`\`\`

**Crontab de producción para backups:**

\`\`\`bash
# /etc/cron.d/backup  — mejor que crontab -e para sistemas de producción
# Porque es un archivo versionable y visible para todo el equipo

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=ops@mycompany.com

# Backup diario a las 2:00am
0 2 * * * root /usr/local/bin/backup-daily.sh

# Verificación de integridad los domingos a las 1:00am
0 1 * * 0  root /usr/local/bin/backup-integrity-check.sh
\`\`\`

**El problema más común con cron: el PATH.** Cron ejecuta con un PATH mínimo (\`/usr/bin:/bin\`). Si \`borg\` está en \`/usr/local/bin\`, el job fallará con "command not found". Soluciones:
1. Declarar \`PATH\` explícitamente en el crontab (como en el ejemplo de arriba)
2. Usar rutas absolutas en el script: \`/usr/local/bin/borg create ...\`

**\`MAILTO\`**: si está definido, cron envía la stdout/stderr de cada job a esa dirección. Si el job no produce output, no se envía email. Por eso el script redirige logs a stdout/stderr — para que cron los capture.

**\`/etc/cron.daily/\`**: cualquier script ejecutable en este directorio corre una vez al día (ejecutado por \`anacron\` en distribuciones de escritorio, o por cron directamente en servidores). Útil para tareas simples, pero sin control fino del horario.

### 📖 systemd timers: la alternativa moderna

Los systemd timers tienen ventajas sobre cron:
- **\`Persistent=yes\`**: si el sistema estaba apagado a la hora programada, ejecuta el job al encenderse (crucial para laptops y VMs que no corren 24/7)
- **Logging integrado**: stdout/stderr van a journald, accesibles con \`journalctl -u backup.service\`
- **Dependencias**: el service puede declarar \`After=network-online.target\` para esperar red
- **Control granular**: \`systemctl start/stop/status backup.service\` para ejecutar manualmente o ver estado

**Crear el service unit:**

\`\`\`bash
# /etc/systemd/system/backup.service
[Unit]
Description=BorgBackup daily backup
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup-daily.sh
User=root
# Captura stdout y stderr en journald
StandardOutput=journal
StandardError=journal
# Notificación de fallo via systemd
OnFailure=backup-failure-notify@%n.service
\`\`\`

**Crear el timer unit:**

\`\`\`bash
# /etc/systemd/system/backup.timer
[Unit]
Description=BorgBackup daily backup timer

[Timer]
# Ejecutar a las 3:00am todos los días
OnCalendar=*-*-* 03:00:00
# Si el sistema estaba apagado, ejecutar al encenderse
Persistent=yes
# Retraso aleatorio de hasta 5 minutos (evita avalancha si muchos servidores)
RandomizedDelaySec=5min

[Install]
WantedBy=timers.target
\`\`\`

**Timer para verificación semanal de integridad:**

\`\`\`bash
# /etc/systemd/system/backup-integrity.timer
[Timer]
# Todos los domingos a las 1:00am
OnCalendar=Sun *-*-* 01:00:00
Persistent=yes

[Install]
WantedBy=timers.target
\`\`\`

**Activar y verificar:**

\`\`\`bash
# Recargar definiciones de systemd
systemctl daemon-reload

# Habilitar e iniciar el timer
systemctl enable --now backup.timer
systemctl enable --now backup-integrity.timer

# Ver todos los timers activos y cuándo correrán
systemctl list-timers

# Salida típica:
# NEXT                         UNIT               ACTIVATES
# Tue 2024-01-16 03:00:00 UTC  backup.timer       backup.service
# Sun 2024-01-21 01:00:00 UTC  backup-integrity.timer

# Ejecutar el backup manualmente (útil para probar)
systemctl start backup.service

# Ver logs del último backup
journalctl -u backup.service -n 50
\`\`\`

### 📖 Sintaxis OnCalendar

| Expresión | Equivalente cron | Significado |
|-----------|-----------------|-------------|
| \`daily\` | \`0 0 * * *\` | Todos los días a medianoche |
| \`weekly\` | \`0 0 * * 0\` | Domingos a medianoche |
| \`*-*-* 03:00:00\` | \`0 3 * * *\` | Todos los días a las 3am |
| \`Sun *-*-* 02:00:00\` | \`0 2 * * 0\` | Domingos a las 2am |
| \`*-*-01 04:00:00\` | \`0 4 1 * *\` | Primer día del mes a las 4am |

\`\`\`bash
# Validar una expresión OnCalendar antes de usarla
systemd-analyze calendar "Sun *-*-* 02:00:00"
# Muestra: próximas 5 ejecuciones con fecha y hora exacta
\`\`\`

### 📖 Rotación de logs con logrotate

El archivo \`/var/log/backup/daily.log\` crecerá indefinidamente sin rotación:

\`\`\`bash
# /etc/logrotate.d/backup
/var/log/backup/*.log {
    weekly
    rotate 12        # mantener 12 semanas de logs
    compress         # comprimir con gzip
    delaycompress    # no comprimir el log de la semana anterior (aún puede escribirse)
    missingok        # no fallar si el archivo no existe
    notifempty       # no rotar si el archivo está vacío
    create 640 root adm
}
\`\`\`

\`\`\`bash
# Probar la configuración de logrotate sin ejecutarla
logrotate --debug /etc/logrotate.d/backup

# Forzar rotación manual
logrotate --force /etc/logrotate.d/backup
\`\`\`

### 📋 Lo que debes recordar
* Define \`PATH\` explícitamente en el crontab o usa rutas absolutas — el PATH de cron es mínimo
* \`MAILTO\` en crontab captura stderr/stdout del job y lo envía por email
* \`set -euo pipefail\` y \`trap ... ERR\` son obligatorios en scripts de backup de producción
* Los systemd timers con \`Persistent=yes\` ejecutan los jobs perdidos al reiniciar — crítico para backups
* \`systemctl list-timers\` muestra cuándo correrá cada timer; \`journalctl -u backup.service\` muestra logs
* \`borg prune\` define retención; \`borg compact\` libera el espacio real; ambos deben ir en el script
* Configura logrotate para los logs de backup — pueden crecer varios MB por día

### 🧪 Autoevaluación
1. Un cron job que ejecuta \`borg create\` falla con "borg: command not found". ¿Cuál es la causa más probable y cuáles son las dos formas de solucionarlo?
2. ¿Cuál es la diferencia entre un cron job y un systemd timer con \`Persistent=yes\` cuando el servidor está apagado a la hora programada del backup?
3. Tu script de backup tiene \`set -euo pipefail\` y \`trap 'alert_failure ...' ERR\`. El comando \`borg prune\` falla. ¿Qué sucede exactamente?

---

1. La causa es que cron ejecuta con un PATH mínimo (\`/usr/bin:/bin\`) y \`borg\` está instalado en \`/usr/local/bin\`, que no está incluido. Soluciones: (a) declarar \`PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\` al inicio del crontab o en \`/etc/cron.d/backup\`; (b) usar la ruta absoluta \`/usr/local/bin/borg create ...\` en el script.
2. Con cron, el job simplemente no se ejecuta y se pierde. Con un systemd timer con \`Persistent=yes\`, al arrancar el servidor systemd detecta que el timer debía haber corrido y ejecuta el service inmediatamente, garantizando que el backup ocurra aunque el servidor no estuviera encendido a la hora exacta.
3. \`set -e\` hace que el script termine inmediatamente cuando \`borg prune\` devuelve un exit code distinto de 0. El \`trap ... ERR\` captura ese evento antes de que el script salga y ejecuta la función \`alert_failure\`, que envía el email de alerta con el número de línea donde ocurrió el error. El script termina con exit code distinto de 0, lo que systemd o cron registra como fallo.
`

export default content
