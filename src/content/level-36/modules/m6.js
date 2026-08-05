const content = `
## Módulo 6 — Testing de restauración: el paso crítico que todos omiten

### 🎯 Objetivos de aprendizaje
* Entender por qué las estrategias de backup fallan silenciosamente y cómo detectarlo
* Definir qué significa "verificar" un backup: checksums, integridad del repositorio y restauración funcional
* Diseñar un calendario de pruebas: verificaciones diarias, semanales y mensuales
* Escribir un script de restore test automatizado que corra en entorno aislado
* Verificar backups de bases de datos PostgreSQL restaurando y ejecutando smoke tests
* Documentar los resultados de las pruebas de restauración

### ❓ El problema real

Era el 15 de marzo. El servidor de base de datos de producción tuvo un fallo de disco. El equipo fue al repositorio de Borg con calma, porque "los backups corren todos los días". El último archive era del 10 de diciembre — tres meses atrás.

La investigación reveló lo sucedido: en diciembre el equipo había cambiado la passphrase del repositorio y actualizado el script... pero olvidaron actualizar el archivo \`/root/.borg-passphrase\` en el servidor de backup. Desde entonces, \`borg create\` fallaba con "passphrase incorrect". El cron job capturaba el error pero \`MAILTO\` apuntaba a una cuenta de correo desactivada. Nadie notó nada en tres meses porque nadie había intentado restaurar.

Este escenario se repite en equipos de todos los tamaños. La lección no es "hay que tener más cuidado". La lección es: **un backup que nunca se prueba no existe**.

### 📖 Qué significa realmente "verificar" un backup

Hay cuatro niveles de verificación, y la mayoría de los equipos sólo hace el primero:

| Nivel | Qué verifica | Detecta |
|-------|-------------|---------|
| 1. Monitoreo de ejecución | ¿El job de backup corrió? | Fallos de scheduling, errores de script |
| 2. Integridad del repositorio | ¿Los chunks de Borg están íntegros? | Corrupción de datos en el repositorio |
| 3. Restauración de archivos | ¿Se pueden extraer los archivos? | Corrupción lógica, problemas de permisos |
| 4. Funcionalidad de aplicación | ¿La app arranca con los datos restaurados? | Datos incompletos, dependencias rotas |

El nivel 4 es el único que garantiza recuperación real. Los niveles 1-3 son necesarios pero no suficientes.

### 📖 Verificación de integridad con borg check

\`borg check\` verifica que la estructura del repositorio y los datos almacenados son consistentes:

\`\`\`bash
# Verificar sólo el repositorio (rápido — verifica el índice y manifesto)
borg check /mnt/backup/myrepo

# Verificar datos reales de todos los archives (lento pero completo)
borg check --verify-data /mnt/backup/myrepo

# Verificar un archive específico
borg check /mnt/backup/myrepo::hostname-daily-2024-01-15T03:00:00

# Script de verificación semanal
#!/usr/bin/env bash
# /usr/local/bin/backup-integrity-check.sh
set -euo pipefail

BORG_REPO="user@backup-server:/backups/\$(hostname)"
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
LOGFILE=/var/log/backup/integrity.log

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] \$*" | tee -a "\$LOGFILE"; }

log "=== Iniciando verificación de integridad ==="

# Verificar el último archive
LAST_ARCHIVE=\$(borg list --last 1 --short "\$BORG_REPO")
log "Último archive: \$LAST_ARCHIVE"

borg check --verify-data "\${BORG_REPO}::\${LAST_ARCHIVE}" 2>&1 | tee -a "\$LOGFILE"

log "=== Verificación completada ==="
\`\`\`

### 📖 Monitoreo del timestamp del último backup

La forma más simple y efectiva de detectar backups fallidos: verificar cuándo fue el último archive exitoso.

\`\`\`bash
#!/usr/bin/env bash
# /usr/local/bin/backup-freshness-check.sh
# Alerta si el último backup tiene más de 25 horas de antigüedad

BORG_REPO="user@backup-server:/backups/\$(hostname)"
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
MAX_AGE_HOURS=25
ALERT_EMAIL="ops@mycompany.com"

# Obtener timestamp del último archive
LAST_ARCHIVE_DATE=\$(borg list --last 1 --format="{time}" "\$BORG_REPO" 2>/dev/null)

if [[ -z "\$LAST_ARCHIVE_DATE" ]]; then
    echo "CRITICAL: No se encontraron archives en el repositorio" | \
        mail -s "BACKUP MISSING: \$(hostname)" "\$ALERT_EMAIL"
    exit 2
fi

# Convertir a epoch y calcular antigüedad
LAST_EPOCH=\$(date -d "\$LAST_ARCHIVE_DATE" +%s)
NOW_EPOCH=\$(date +%s)
AGE_HOURS=\$(( (NOW_EPOCH - LAST_EPOCH) / 3600 ))

if [[ "\$AGE_HOURS" -gt "\$MAX_AGE_HOURS" ]]; then
    echo "CRITICAL: Último backup hace \${AGE_HOURS}h (máximo: \${MAX_AGE_HOURS}h)" | \
        mail -s "BACKUP STALE: \$(hostname)" "\$ALERT_EMAIL"
    exit 2
fi

echo "OK: Último backup hace \${AGE_HOURS}h"
exit 0
\`\`\`

Programa este check con cron cada hora. Es el detector de fallos más rápido que puedes tener.

### 📖 Script de restore test automatizado

La prueba definitiva: restaurar a un directorio temporal y verificar que los datos son correctos.

\`\`\`bash
#!/usr/bin/env bash
# /usr/local/bin/backup-restore-test.sh
# Restauración de prueba mensual a entorno aislado

set -euo pipefail

BORG_REPO="user@backup-server:/backups/\$(hostname)"
export BORG_PASSPHRASE=\$(cat /root/.borg-passphrase)
RESTORE_DIR=/tmp/backup-restore-test-\$(date +%Y%m%d)
LOGFILE=/var/log/backup/restore-test.log
REPORT_EMAIL="ops@mycompany.com"
FAILED=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] \$*" | tee -a "\$LOGFILE"; }
fail() { log "FAIL: \$1"; FAILED=1; }
pass() { log "PASS: \$1"; }

log "=== RESTORE TEST: \$(date) ==="

# 1. Crear directorio de restauración aislado
mkdir -p "\$RESTORE_DIR"
trap "rm -rf '\$RESTORE_DIR'; log 'Directorio temporal eliminado'" EXIT

# 2. Obtener último archive
LAST_ARCHIVE=\$(borg list --last 1 --short "\$BORG_REPO")
log "Archive a probar: \$LAST_ARCHIVE"

# 3. Restaurar archivos críticos
log "Restaurando /etc y /var/www..."
cd "\$RESTORE_DIR"
borg extract "\${BORG_REPO}::\${LAST_ARCHIVE}" etc var/www 2>&1 | tee -a "\$LOGFILE"

# 4. Verificar existencia de archivos críticos
CRITICAL_FILES=(
    "\$RESTORE_DIR/etc/passwd"
    "\$RESTORE_DIR/etc/hosts"
    "\$RESTORE_DIR/var/www/myapp/index.php"
    "\$RESTORE_DIR/var/www/myapp/.env"
)
for f in "\${CRITICAL_FILES[@]}"; do
    if [[ -f "\$f" ]]; then
        pass "Existe: \$f"
    else
        fail "FALTA: \$f"
    fi
done

# 5. Verificar checksums de archivos conocidos
# Guarda checksums de referencia en /root/backup-checksums.txt durante el setup
if [[ -f /root/backup-checksums.txt ]]; then
    while IFS= read -r line; do
        expected_hash=\$(echo "\$line" | awk '{print \$1}')
        relative_path=\$(echo "\$line" | awk '{print \$2}')
        restored_file="\$RESTORE_DIR/\$relative_path"
        if [[ -f "\$restored_file" ]]; then
            actual_hash=\$(sha256sum "\$restored_file" | awk '{print \$1}')
            if [[ "\$expected_hash" == "\$actual_hash" ]]; then
                pass "Checksum OK: \$relative_path"
            else
                fail "Checksum MISMATCH: \$relative_path"
            fi
        fi
    done < /root/backup-checksums.txt
fi

# 6. Reporte final
if [[ "\$FAILED" -eq 0 ]]; then
    log "=== RESTORE TEST PASSED ==="
    echo "Restore test OK — \$(date)" | \
        mail -s "BACKUP RESTORE TEST PASSED: \$(hostname)" "\$REPORT_EMAIL"
else
    log "=== RESTORE TEST FAILED ==="
    cat "\$LOGFILE" | \
        mail -s "BACKUP RESTORE TEST FAILED: \$(hostname)" "\$REPORT_EMAIL"
    exit 1
fi
\`\`\`

### 📖 Testing de restauración de bases de datos

Restaurar archivos es sólo la mitad. Para bases de datos, debes verificar que los datos son funcionales.

\`\`\`bash
#!/usr/bin/env bash
# Prueba de restauración de PostgreSQL
# Asume que el backup de la DB está en /var/backups/postgres/

set -euo pipefail

DUMP_FILE=/var/backups/postgres/mydb-\$(date +%Y-%m-%d).dump
TEST_DB="restore_test_\$(date +%s)"
APP_USER=myapp

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] \$*"; }

log "Restaurando \$DUMP_FILE en base de datos de prueba \$TEST_DB..."

# 1. Crear base de datos temporal de prueba
psql -U postgres -c "CREATE DATABASE \$TEST_DB;"

# 2. Restaurar el dump
pg_restore -U postgres -d "\$TEST_DB" "\$DUMP_FILE"

# 3. Smoke tests básicos: verificar tablas y conteos
log "Verificando integridad de datos..."
TABLE_COUNT=\$(psql -U postgres -d "\$TEST_DB" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
log "Tablas encontradas: \$TABLE_COUNT"

if [[ "\$TABLE_COUNT" -lt 5 ]]; then
    log "ERROR: Se esperaban al menos 5 tablas, encontradas: \$TABLE_COUNT"
    psql -U postgres -c "DROP DATABASE \$TEST_DB;"
    exit 1
fi

# Verificar que las tablas críticas tienen datos
USERS_COUNT=\$(psql -U postgres -d "\$TEST_DB" -tAc "SELECT count(*) FROM users;")
log "Registros en users: \$USERS_COUNT"

if [[ "\$USERS_COUNT" -eq 0 ]]; then
    log "ERROR: La tabla users está vacía — restauración inválida"
    psql -U postgres -c "DROP DATABASE \$TEST_DB;"
    exit 1
fi

# 4. Limpiar
psql -U postgres -c "DROP DATABASE \$TEST_DB;"
log "Restore test de PostgreSQL: PASSED (\$USERS_COUNT usuarios, \$TABLE_COUNT tablas)"
\`\`\`

### 📖 Calendario de pruebas recomendado

| Frecuencia | Prueba | Método |
|-----------|--------|--------|
| Cada hora | Freshness check: ¿el último backup tiene < 25h? | Script automatizado + alerta |
| Diario | Verificar exit code del backup job | Monitoreo de systemd/cron |
| Semanal | \`borg check --verify-data\` del último archive | Systemd timer |
| Mensual | Restore test completo a entorno aislado | Script automatizado |
| Anual | Restore completo de servidor desde cero | Ejercicio manual del equipo |

### 📖 El principio de chaos engineering aplicado a backups

Netflix popularizó el concepto de Chaos Monkey: matar servicios aleatoriamente en producción para asegurarse de que el sistema sobrevive. Aplicado a backups:

Programa una vez al año un "Disaster Recovery Drill" donde el equipo:
1. Toma un servidor de staging
2. Borra todo su contenido (\`rm -rf /var/www /etc/myapp /var/lib/postgresql\`)
3. Restaura desde el último backup
4. Verifica que la aplicación funciona

Sin hacer esto al menos anualmente, no sabes si tu DR plan funciona hasta que lo necesitas de verdad.

### 📋 Lo que debes recordar
* Un backup que nunca se ha restaurado no existe — la verificación de restauración es obligatoria, no opcional
* \`borg check --verify-data\` verifica integridad de datos real, no sólo el índice del repositorio
* El freshness check (timestamp del último backup) es el detector de fallos más simple y efectivo
* Siempre restaura a un directorio aislado, nunca sobre los datos de producción durante las pruebas
* Para bases de datos, verifica tanto la restauración del dump como que las tablas tienen los datos esperados
* Documenta cada restore test: fecha, qué se probó, quién lo hizo, resultado

### 🧪 Autoevaluación
1. \`borg check /mnt/backup/myrepo\` devuelve "OK". ¿Eso garantiza que puedes restaurar tus datos correctamente? ¿Por qué sí o por qué no?
2. Tu backup de PostgreSQL restaura sin errores con \`pg_restore\`. ¿Es eso suficiente para confirmar que el backup es válido? ¿Qué pasos adicionales harías?
3. ¿Cuál es la diferencia entre un freshness check y una verificación de integridad? ¿Pueden ambos pasar mientras el backup está corrupto?

---

1. No. \`borg check\` sin \`--verify-data\` sólo verifica el índice y la estructura del manifesto, no el contenido real de los chunks. Incluso con \`--verify-data\`, borg verifica que los chunks no están corrompidos, pero no que los archivos dentro sean funcionalmente correctos o completos. El único test definitivo es intentar restaurar y verificar que la aplicación funciona.
2. No es suficiente. \`pg_restore\` exitoso sólo significa que el formato del dump es válido y que las tablas se crearon. Debes verificar adicionalmente: (a) que las tablas críticas existen y tienen el número esperado de registros, (b) que las constraints de integridad referencial son consistentes, y (c) idealmente que la aplicación arranca y puede consultar la base de datos restaurada.
3. El freshness check verifica que el job de backup corrió recientemente (basado en el timestamp del archive). La verificación de integridad verifica que los datos almacenados no están corrompidos. Sí, ambos pueden pasar mientras el backup está corrupto lógicamente: el job corrió (\`borg create\` exitoso), los chunks están íntegros, pero los archivos dentro del archive no son los correctos (p.ej. se está haciendo backup del directorio equivocado, o la base de datos se respalda mientras está en un estado inconsistente).
`

export default content
