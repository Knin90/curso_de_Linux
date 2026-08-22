const content = `
## Módulo 8 — Proyecto real: sistema de backup completo con restauración verificada

### 🎯 Objetivos de aprendizaje
* Construir desde cero un sistema de backup completo con BorgBackup, PostgreSQL y configuración de aplicación
* Configurar autenticación SSH por clave para el servidor de backup remoto
* Automatizar con systemd timers: backup diario, verificación semanal de integridad, restore test mensual
* Implementar monitoreo de freshness que alerta cuando un backup supera las 25 horas
* Escribir y ejecutar un DR runbook para el escenario "servidor primario perdido"
* Simular un desastre real: borrar datos y restaurar verificando que la aplicación funciona

### ❓ El problema real

Has estudiado BorgBackup, cron, systemd, DR y restore testing por separado. Ahora es el momento de integrarlo todo en un sistema coherente de producción. Un sistema que no sólo hace backups, sino que verifica que funcionan, alerta cuando fallan, y tiene documentado exactamente qué hacer cuando el desastre ocurre.

Este laboratorio construye ese sistema paso a paso. Al terminar tendrás algo que puedes adaptar directamente a un servidor de producción real.

### 📖 Arquitectura del sistema que construiremos

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"app-server","icon":"server","rows":["/var/www/myapp/ — archivos de aplicación","/etc/myapp/ — configuración","PostgreSQL (myapp_db) — base de datos","/var/backups/postgres/ — dumps de PostgreSQL","backup-daily.sh (systemd timer, 3am)","backup-integrity.sh (domingos 1am)","backup-freshness.sh (cron, cada hora)","backup-restore-test.sh (1er día del mes)"],"focal":true},{"title":"backup-server","icon":"disk","rows":["/backups/app-server/ — repositorio Borg (cifrado)"]}],"vsLabel":"SSH + BorgBackup"}
\`\`\`

### 📖 Paso 1 — Configurar autenticación SSH para el repositorio remoto

En el servidor de aplicación (como root):

\`\`\`bash
# Generar par de claves SSH dedicado para backups
ssh-keygen -t ed25519 -f /root/.ssh/backup_ed25519 -C "backup@\$(hostname)" -N ""
# -N "": sin passphrase (la clave es sólo para el proceso de backup automatizado)

# Copiar la clave pública al servidor de backup
ssh-copy-id -i /root/.ssh/backup_ed25519.pub backup-user@backup-server

# Verificar que funciona
ssh -i /root/.ssh/backup_ed25519 backup-user@backup-server "echo SSH OK"

# Crear configuración SSH para no tener que especificar la clave en cada comando
cat >> /root/.ssh/config << 'EOF'
Host backup-server
    HostName backup-server.mycompany.com
    User backup-user
    IdentityFile /root/.ssh/backup_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF
chmod 600 /root/.ssh/config
\`\`\`

**En el servidor de backup** — restringir qué puede hacer esa clave SSH:

\`\`\`bash
# /home/backup-user/.ssh/authorized_keys
# Restringir a sólo comandos de borg (sin shell interactiva)
command="borg serve --restrict-to-path /backups/app-server",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA...tu-clave-publica...
\`\`\`

Inicializar el repositorio Borg remoto:

\`\`\`bash
# Guardar passphrase segura
openssl rand -base64 32 > /root/.borg-passphrase
chmod 600 /root/.borg-passphrase

# Exportar para el comando de init
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
export BORG_RSH="ssh -i /root/.ssh/backup_ed25519"

# Inicializar repositorio con cifrado repokey-blake2
borg init \
    --encryption=repokey-blake2 \
    backup-server:/backups/\$(hostname)

# ¡CRÍTICO! Exportar y guardar la clave del repositorio fuera del servidor
borg key export backup-server:/backups/\$(hostname) /root/.borg-key-export
# Guarda este archivo en un gestor de contraseñas o almacenamiento externo seguro
\`\`\`

### 📖 Paso 2 — Script de backup de producción

\`\`\`bash
#!/usr/bin/env bash
# /usr/local/bin/backup-daily.sh
set -euo pipefail

BORG_REPO="backup-server:/backups/\$(hostname)"
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
export BORG_RSH="ssh -i /root/.ssh/backup_ed25519"
LOGFILE=/var/log/backup/daily.log
ALERT_EMAIL="ops@mycompany.com"
PG_DUMP_DIR=/var/backups/postgres
ARCHIVE_NAME="\$(hostname)-daily-\$(date +%Y-%m-%dT%H:%M:%S)"

mkdir -p "\$PG_DUMP_DIR" /var/log/backup

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] \$*" | tee -a "\$LOGFILE"; }

alert_failure() {
    local msg="\$1"
    log "ERROR: \$msg"
    echo "Servidor: \$(hostname)
Hora: \$(date)
Error: \$msg
Log: \$(tail -20 \$LOGFILE)" | mail -s "BACKUP FAILED: \$(hostname)" "\$ALERT_EMAIL" 2>/dev/null || true
}

trap 'alert_failure "Fallo en línea \$LINENO (exit code: \$?)"' ERR

log "=== Backup iniciado: \$ARCHIVE_NAME ==="

# ── 1. Dump de PostgreSQL ─────────────────────────────────────────────────
log "Dump de PostgreSQL..."
DUMP_FILE="\$PG_DUMP_DIR/myapp_db-\$(date +%Y-%m-%d).dump"
pg_dump -U postgres -Fc myapp_db -f "\$DUMP_FILE"
log "Dump completado: \$(du -sh \$DUMP_FILE | cut -f1)"

# ── 2. Crear archive de Borg ──────────────────────────────────────────────
log "Creando archive Borg..."
borg create \
    --stats \
    --compression zstd \
    --exclude-caches \
    --exclude /var/www/myapp/storage/cache \
    --exclude /var/www/myapp/storage/logs \
    --exclude '*.pyc' \
    --exclude '*.tmp' \
    "\${BORG_REPO}::\${ARCHIVE_NAME}" \
    /var/www/myapp \
    /etc/myapp \
    /etc/nginx/sites-enabled \
    /etc/systemd/system/myapp.service \
    "\$PG_DUMP_DIR" \
    2>&1 | tee -a "\$LOGFILE"

# ── 3. Prune: política de retención ──────────────────────────────────────
log "Aplicando política de retención..."
borg prune \
    --keep-daily=7 \
    --keep-weekly=4 \
    --keep-monthly=6 \
    "\$BORG_REPO" \
    2>&1 | tee -a "\$LOGFILE"

# ── 4. Compact: liberar espacio ───────────────────────────────────────────
log "Compactando repositorio..."
borg compact "\$BORG_REPO" 2>&1 | tee -a "\$LOGFILE"

# ── 5. Limpiar dumps viejos de PostgreSQL (>30 días) ─────────────────────
find "\$PG_DUMP_DIR" -name "*.dump" -mtime +30 -delete
log "Dumps viejos eliminados"

log "=== Backup completado exitosamente ==="
\`\`\`

\`\`\`bash
chmod +x /usr/local/bin/backup-daily.sh
\`\`\`

### 📖 Paso 3 — Automatizar con systemd timers

**Service unit para backup diario:**

\`\`\`bash
# /etc/systemd/system/backup.service
[Unit]
Description=BorgBackup daily backup
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup-daily.sh
User=root
StandardOutput=journal
StandardError=journal
# Timeout generoso para repositorios grandes
TimeoutStartSec=2h
\`\`\`

**Timer unit para backup diario:**

\`\`\`bash
# /etc/systemd/system/backup.timer
[Unit]
Description=BorgBackup daily backup — 3am

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=yes
RandomizedDelaySec=10min

[Install]
WantedBy=timers.target
\`\`\`

**Service y timer para verificación semanal de integridad:**

\`\`\`bash
# /etc/systemd/system/backup-integrity.service
[Unit]
Description=BorgBackup integrity check

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup-integrity-check.sh
User=root
StandardOutput=journal
StandardError=journal
TimeoutStartSec=3h
\`\`\`

\`\`\`bash
# /etc/systemd/system/backup-integrity.timer
[Unit]
Description=BorgBackup integrity check — domingos 1am

[Timer]
OnCalendar=Sun *-*-* 01:00:00
Persistent=yes

[Install]
WantedBy=timers.target
\`\`\`

**Service y timer para restore test mensual:**

\`\`\`bash
# /etc/systemd/system/backup-restore-test.service
[Unit]
Description=BorgBackup monthly restore test

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup-restore-test.sh
User=root
StandardOutput=journal
StandardError=journal
TimeoutStartSec=1h
\`\`\`

\`\`\`bash
# /etc/systemd/system/backup-restore-test.timer
[Unit]
Description=BorgBackup monthly restore test — primer día del mes

[Timer]
# Primer día de cada mes a las 4am
OnCalendar=*-*-01 04:00:00
Persistent=yes

[Install]
WantedBy=timers.target
\`\`\`

**Activar todos los timers:**

\`\`\`bash
systemctl daemon-reload
systemctl enable --now backup.timer
systemctl enable --now backup-integrity.timer
systemctl enable --now backup-restore-test.timer

# Verificar
systemctl list-timers --all | grep backup
\`\`\`

### 📖 Paso 4 — Monitoreo de freshness (cron, cada hora)

\`\`\`bash
# /usr/local/bin/backup-freshness-check.sh
#!/usr/bin/env bash
set -euo pipefail

BORG_REPO="backup-server:/backups/\$(hostname)"
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
export BORG_RSH="ssh -i /root/.ssh/backup_ed25519"
MAX_AGE_HOURS=25
ALERT_EMAIL="ops@mycompany.com"

LAST_DATE=\$(borg list --last 1 --format="{time}" "\$BORG_REPO" 2>/dev/null || echo "")

if [[ -z "\$LAST_DATE" ]]; then
    echo "CRITICAL: No hay archives en el repositorio" | \
        mail -s "BACKUP MISSING: \$(hostname)" "\$ALERT_EMAIL"
    exit 2
fi

LAST_EPOCH=\$(date -d "\$LAST_DATE" +%s 2>/dev/null || date -j -f "%a, %Y-%m-%d %H:%M:%S" "\$LAST_DATE" +%s)
AGE_HOURS=\$(( ($(date +%s) - LAST_EPOCH) / 3600 ))

if [[ "\$AGE_HOURS" -gt "\$MAX_AGE_HOURS" ]]; then
    echo "CRITICAL: Último backup hace \${AGE_HOURS}h — supera el límite de \${MAX_AGE_HOURS}h" | \
        mail -s "BACKUP STALE (\${AGE_HOURS}h): \$(hostname)" "\$ALERT_EMAIL"
    exit 2
fi

echo "OK: Último backup hace \${AGE_HOURS}h"
\`\`\`

\`\`\`bash
chmod +x /usr/local/bin/backup-freshness-check.sh

# Agregar a crontab de root
crontab -e
# Añadir:
# 0 * * * * /usr/local/bin/backup-freshness-check.sh >> /var/log/backup/freshness.log 2>&1
\`\`\`

### 📖 Paso 5 — Script de comprobación de integridad

\`\`\`bash
#!/usr/bin/env bash
# /usr/local/bin/backup-integrity-check.sh
set -euo pipefail

BORG_REPO="backup-server:/backups/\$(hostname)"
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
export BORG_RSH="ssh -i /root/.ssh/backup_ed25519"
LOGFILE=/var/log/backup/integrity.log
ALERT_EMAIL="ops@mycompany.com"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] \$*" | tee -a "\$LOGFILE"; }
trap 'echo "INTEGRITY CHECK FAILED" | mail -s "BACKUP INTEGRITY FAILED: \$(hostname)" "\$ALERT_EMAIL"' ERR

log "=== Verificación de integridad: \$(date) ==="

LAST_ARCHIVE=\$(borg list --last 1 --short "\$BORG_REPO")
log "Verificando archive: \$LAST_ARCHIVE"

borg check --verify-data "\${BORG_REPO}::\${LAST_ARCHIVE}" 2>&1 | tee -a "\$LOGFILE"

log "=== Verificación completada: PASSED ==="
echo "Integrity check OK — \$(date)" | \
    mail -s "BACKUP INTEGRITY PASSED: \$(hostname)" "\$ALERT_EMAIL"
\`\`\`

### 📖 Paso 6 — Script de restore test mensual

\`\`\`bash
#!/usr/bin/env bash
# /usr/local/bin/backup-restore-test.sh
set -euo pipefail

BORG_REPO="backup-server:/backups/\$(hostname)"
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
export BORG_RSH="ssh -i /root/.ssh/backup_ed25519"
RESTORE_DIR=/var/lib/backup-restore-test
LOGFILE=/var/log/backup/restore-test.log
REPORT_EMAIL="ops@mycompany.com"
FAILED=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] \$*" | tee -a "\$LOGFILE"; }
pass() { log "  [PASS] \$1"; }
fail() { log "  [FAIL] \$1"; FAILED=1; }

cleanup() {
    log "Limpiando directorio de restore test..."
    rm -rf "\$RESTORE_DIR"
}
trap cleanup EXIT

log "=== RESTORE TEST MENSUAL: \$(date) ==="
mkdir -p "\$RESTORE_DIR"

# 1. Obtener último archive
LAST_ARCHIVE=\$(borg list --last 1 --short "\$BORG_REPO")
log "Archive a probar: \$LAST_ARCHIVE"

# 2. Restaurar archivos de aplicación a directorio aislado
log "Restaurando archivos de aplicación..."
cd "\$RESTORE_DIR"
borg extract "\${BORG_REPO}::\${LAST_ARCHIVE}" \
    var/www/myapp \
    etc/myapp \
    var/backups/postgres \
    2>&1 | tee -a "\$LOGFILE"

# 3. Verificar archivos críticos
log "Verificando presencia de archivos críticos..."
CRITICAL=(
    "\$RESTORE_DIR/var/www/myapp/index.php"
    "\$RESTORE_DIR/etc/myapp/config.yml"
    "\$RESTORE_DIR/var/www/myapp/.env"
)
for f in "\${CRITICAL[@]}"; do
    [[ -f "\$f" ]] && pass "Existe: \${f#\$RESTORE_DIR}" || fail "FALTA: \${f#\$RESTORE_DIR}"
done

# 4. Verificar dump de PostgreSQL
DUMP_FILE=\$(ls -t "\$RESTORE_DIR/var/backups/postgres/"*.dump 2>/dev/null | head -1)
if [[ -n "\$DUMP_FILE" ]]; then
    pass "Dump PostgreSQL encontrado: \$(basename \$DUMP_FILE)"

    # Restaurar en base de datos de prueba
    TEST_DB="restore_test_\$(date +%s)"
    log "Restaurando en base de datos temporal: \$TEST_DB"
    createdb -U postgres "\$TEST_DB" 2>&1 | tee -a "\$LOGFILE"
    pg_restore -U postgres -d "\$TEST_DB" "\$DUMP_FILE" 2>&1 | tee -a "\$LOGFILE"

    # Smoke test: verificar tablas y datos
    TABLE_COUNT=\$(psql -U postgres -d "\$TEST_DB" -tAc \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
    USERS_COUNT=\$(psql -U postgres -d "\$TEST_DB" -tAc "SELECT count(*) FROM users;" 2>/dev/null || echo "0")

    log "  Tablas: \$TABLE_COUNT | Usuarios: \$USERS_COUNT"
    [[ "\$TABLE_COUNT" -ge 5 ]] && pass "Tablas suficientes (\$TABLE_COUNT)" || fail "Pocas tablas: \$TABLE_COUNT"
    [[ "\$USERS_COUNT" -gt 0 ]] && pass "Tabla users con datos (\$USERS_COUNT registros)" || fail "Tabla users vacía"

    # Limpiar base de datos de prueba
    dropdb -U postgres "\$TEST_DB"
else
    fail "No se encontró dump de PostgreSQL en el archive"
fi

# 5. Reporte
log "=== RESULTADO DEL RESTORE TEST ==="
if [[ "\$FAILED" -eq 0 ]]; then
    log "PASSED — todos los checks superados"
    echo "Restore test PASSED \$(date)
Archive: \$LAST_ARCHIVE
Tablas DB: \$TABLE_COUNT | Usuarios: \$USERS_COUNT" | \
        mail -s "RESTORE TEST PASSED: \$(hostname)" "\$REPORT_EMAIL"
else
    log "FAILED — ver log completo en \$LOGFILE"
    cat "\$LOGFILE" | mail -s "RESTORE TEST FAILED: \$(hostname)" "\$REPORT_EMAIL"
    exit 1
fi
\`\`\`

### 📖 Paso 7 — DR Runbook: "Servidor primario perdido"

Guarda este archivo en Git (no en el mismo servidor — si el servidor cae, pierdes el runbook):

\`\`\`markdown
# DR RUNBOOK: Pérdida total del servidor de aplicación

Última prueba: _______ | Probado por: _______ | Resultado: _______

## Condición de activación
- SSH al servidor falla consistentemente
- O: proveedor cloud confirma que el nodo está muerto/irrecuperable
- O: evidencia de ransomware / compromiso total

## Responsable: _________________ | Backup: _________________
## ETA estimada: 45-90 minutos

## PASO 1 — Verificar que el fallo es real (5 min)
\`\`\`bash
ssh -i ~/.ssh/admin_key admin@app-server.prod "echo OK" || echo "SERVIDOR INACCESIBLE"
ping -c 5 [IP DEL SERVIDOR] || echo "SIN RESPUESTA"
\`\`\`
Si responde: el fallo puede ser de red o software — NO continuar sin confirmación del fallo.

## PASO 2 — Notificar (2 min)
- Anunciar en #incidents: "P1: app-server.prod inaccesible, iniciando DR"
- Paginar a: _________________
- Actualizar status page: https://status.mycompany.com → "Investigando"

## PASO 3 — Provisionar servidor nuevo (15 min)
\`\`\`bash
# Crear servidor con las mismas specs en el proveedor cloud
# [Instrucciones específicas del proveedor aquí]
# Registrar IP del nuevo servidor: ___________________
\`\`\`

## PASO 4 — Instalar dependencias (10 min)
\`\`\`bash
apt update && apt install -y borgbackup postgresql-client nginx php8.2-fpm
\`\`\`

## PASO 5 — Restaurar desde backup (15 min)
\`\`\`bash
export BORG_PASSPHRASE=[ver gestor de contraseñas: entrada "borg-backup-prod"]
export BORG_RSH="ssh -i /root/.ssh/backup_ed25519"

# Ver archives disponibles
borg list backup-server:/backups/app-server

# Restaurar el último archive (o el anterior a un incidente de corrupción)
cd / && borg extract backup-server:/backups/app-server::[NOMBRE-DEL-ARCHIVE]
\`\`\`

## PASO 6 — Restaurar base de datos (10 min)
\`\`\`bash
# El dump de PostgreSQL fue restaurado en /var/backups/postgres/ en el paso anterior
DUMP=\$(ls -t /var/backups/postgres/*.dump | head -1)
createdb -U postgres myapp_db
pg_restore -U postgres -d myapp_db "\$DUMP"
# Verificar:
psql -U postgres myapp_db -c "SELECT count(*) FROM users;"
\`\`\`

## PASO 7 — Actualizar DNS (5 min)
\`\`\`bash
# Apuntar app.mycompany.com a la IP del nuevo servidor
# [Instrucciones específicas del proveedor de DNS aquí]
# TTL anterior: _____ segundos — tiempo de propagación estimado: _____
\`\`\`

## PASO 8 — Verificar que la aplicación funciona
\`\`\`bash
systemctl start nginx php8.2-fpm myapp
curl -f https://app.mycompany.com/health
# Verificar login manual en: https://app.mycompany.com
\`\`\`

## PASO 9 — Comunicar resolución
- Actualizar #incidents: "P1 resuelto — app restaurada en [nuevo-servidor]"
- Actualizar status page: "Resuelto"
- Enviar resumen a: VP Producto, CTO

## Verificación final
- [ ] curl health check devuelve 200
- [ ] Login de prueba exitoso
- [ ] Sin errores en \`journalctl -u myapp -n 50\`
- [ ] Monitoreo muestra métricas normales

## Post-DR (dentro de 48h)
- [ ] Configurar SSH key de backup en el nuevo servidor
- [ ] Verificar que el backup del nuevo servidor funciona
- [ ] Agendar post-mortem blameless
\`\`\`
\`\`\`

### 📖 Paso 8 — Simular el desastre

Esta es la prueba definitiva. Ejecuta esto en un entorno de staging que puedas destruir y reconstruir:

\`\`\`bash
# ── PREPARACIÓN ─────────────────────────────────────────────────────────────

# 1. Hacer un backup manual y verificar que existe
/usr/local/bin/backup-daily.sh
borg list backup-server:/backups/\$(hostname) | tail -3

# 2. Anotar el estado actual de la aplicación
curl http://localhost/health > /tmp/pre-disaster-health.json
psql -U postgres myapp_db -c "SELECT count(*) FROM users;" > /tmp/pre-disaster-users.txt

# ── DESASTRE ─────────────────────────────────────────────────────────────────

# 3. Simular pérdida total de datos de aplicación
echo "=== SIMULANDO DESASTRE ==="
systemctl stop myapp nginx php8.2-fpm
rm -rf /var/www/myapp
rm -rf /etc/myapp
psql -U postgres -c "DROP DATABASE myapp_db;"
echo "=== DATOS ELIMINADOS — INICIANDO DR ==="

# ── RECUPERACIÓN (siguiendo el runbook) ─────────────────────────────────────

# 4. Restaurar desde backup
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
export BORG_RSH="ssh -i /root/.ssh/backup_ed25519"
LAST_ARCHIVE=\$(borg list --last 1 --short backup-server:/backups/\$(hostname))
echo "Restaurando archive: \$LAST_ARCHIVE"

cd / && borg extract "backup-server:/backups/\$(hostname)::\$LAST_ARCHIVE" \
    var/www/myapp \
    etc/myapp \
    var/backups/postgres

# 5. Restaurar base de datos
DUMP=\$(ls -t /var/backups/postgres/*.dump | head -1)
createdb -U postgres myapp_db
pg_restore -U postgres -d myapp_db "\$DUMP"

# 6. Verificar restauración
systemctl start myapp nginx php8.2-fpm
curl http://localhost/health

# ── VERIFICACIÓN ─────────────────────────────────────────────────────────────

# 7. Comparar estado pre y post desastre
POST_USERS=\$(psql -U postgres myapp_db -c "SELECT count(*) FROM users;" -tA)
PRE_USERS=\$(cat /tmp/pre-disaster-users.txt | grep -oE '[0-9]+')
echo "Usuarios pre-desastre: \$PRE_USERS | Post-restauración: \$POST_USERS"

if [[ "\$PRE_USERS" == "\$POST_USERS" ]]; then
    echo "=== DR DRILL PASSED: datos íntegros ==="
else
    echo "=== DR DRILL WARNING: diferencia en datos (pérdida esperada según RPO) ==="
fi
\`\`\`

**Qué medir durante el drill:**
- Tiempo total de recuperación (¿cumple el RTO?)
- Pérdida de datos: diferencia entre el último archive y el momento del desastre (¿cumple el RPO?)
- Pasos del runbook que fueron incorrectos o faltaron
- Tiempo perdido buscando información (passphrase, IPs, nombres de base de datos)

### 📖 Logrotate para todos los logs de backup

\`\`\`bash
# /etc/logrotate.d/backup
/var/log/backup/*.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 640 root adm
    postrotate
        # Opcional: notificar si el log rotado contenía errores
        grep -i "error\\|failed\\|FAIL" /var/log/backup/*.log.1 2>/dev/null | \
            mail -s "BACKUP LOG WARNINGS: \$(hostname)" ops@mycompany.com || true
    endscript
}
\`\`\`

### 📖 Estado final del sistema completo

\`\`\`bash
# Estado de todos los timers de backup
systemctl list-timers | grep backup

# Último backup exitoso
borg list backup-server:/backups/\$(hostname) | tail -5

# Logs recientes
journalctl -u backup.service -n 20
journalctl -u backup-integrity.service -n 20

# Freshness check manual
/usr/local/bin/backup-freshness-check.sh && echo "OK" || echo "ALERTA"

# Info del repositorio (ratio de deduplicación)
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
export BORG_RSH="ssh -i /root/.ssh/backup_ed25519"
borg info backup-server:/backups/\$(hostname)
\`\`\`

### 📋 Lo que debes recordar
* La clave SSH para backup debe ser dedicada y sin passphrase; el repositorio Borg usa su propia passphrase separada
* Exporta y guarda la clave de Borg (\`borg key export\`) fuera del servidor — si el servidor muere y el repositorio usa repokey, la necesitas
* Cuatro timers forman el sistema completo: backup diario, integridad semanal, freshness check horario, restore test mensual
* El DR runbook debe estar en Git (no en el servidor que puede fallar) y ser actualizado cada vez que cambie la infraestructura
* El DR drill mide RTO y RPO reales — si no has hecho un drill, no sabes si cumples tus objetivos
* Los dumps de PostgreSQL van DENTRO del archive de Borg — así tienes backup del filesystem Y de la base de datos en el mismo archive

### 🧪 Autoevaluación
1. El restore test mensual falla con "no se encontró dump de PostgreSQL". El backup de archivos funciona correctamente. ¿Cuáles son las dos causas más probables?
2. Después de un DR drill, el sistema funciona pero hay 500 usuarios menos que antes del desastre. El RPO objetivo era 4 horas y el backup corre cada 24 horas. ¿Qué conclusión sacas? ¿Qué cambio técnico implementarías?
3. ¿Por qué la clave SSH del servidor de backup no lleva passphrase, pero el repositorio Borg sí tiene passphrase? ¿No es una contradicción de seguridad?

---

1. Las dos causas más probables son: (a) el path del dump de PostgreSQL no coincide con el path que incluye el archive de Borg — el script de backup puede estar guardando los dumps en \`/var/backups/postgres/\` pero el \`borg create\` no incluye ese path en la lista de directorios a respaldar; (b) \`pg_dump\` está fallando silenciosamente antes del \`borg create\` — el script tiene \`set -e\` pero si pg_dump falla con un warning en lugar de un error, o si el directorio de destino no existe, el dump no se crea y Borg hace backup de un directorio vacío.
2. La conclusión es que hay una brecha entre el RPO objetivo (4 horas) y la arquitectura actual (backup cada 24 horas). 500 usuarios menos significa que el archive restaurado tenía ~24 horas de antigüedad, lo que es consistente con un backup diario. Para cumplir un RPO de 4 horas, el cambio técnico es ejecutar el backup cada 4 horas (4 archives al día) o usar replicación continua de PostgreSQL a un servidor secundario para el componente de base de datos, que es normalmente el más crítico.
3. No es contradicción, es defensa en capas con responsabilidades distintas. La clave SSH sin passphrase es necesaria para que el script de backup pueda conectarse al servidor remoto sin intervención humana a las 3am — si tuviera passphrase, el proceso automatizado no podría autenticarse. La passphrase de Borg cifra los datos en el repositorio: aunque alguien comprometa el servidor de backup y robe los archives, no puede leer los datos sin la passphrase. La clave SSH sin passphrase sólo da acceso a ejecutar comandos de Borg; la passphrase de Borg protege el contenido. Son dos capas independientes: autenticación de transporte (SSH) y cifrado de datos (Borg).
`

export default content
