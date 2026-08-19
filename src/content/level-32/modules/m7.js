const content = `
## Módulo 7 — Disaster Recovery: procedimientos y testing

### 🎯 Objetivos de aprendizaje

* Distinguir entre HA (disponibilidad continua) y DR (recuperación ante desastre).
* Diseñar runbooks de recuperación claros y ejecutables bajo presión.
* Implementar y documentar procedimientos de backup y restore verificados.
* Entender por qué el DR no testado no existe: el principio de "chaos engineering" básico.

### ❓ El problema real

Un datacenter entero se inunda. Tus 3 servidores web y el cluster de base de datos están todos offline. Tienes backups en S3, pero nadie ha probado el proceso de restore nunca. En ese momento de pánico, con el CTO mirando por encima del hombro, ¿cuánto tiempo tardarás en recuperar el servicio? El DR no testado es teatro: te da la ilusión de seguridad sin la realidad.

### 📖 HA vs. DR: dos problemas distintos

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Alta Disponibilidad (HA)","icon":"sync","focal":true,"rows":["Protege contra: fallo de componente","Tiempo de recuperación: segundos","Transparente al usuario: sí","Automático: sí (keepalived, VRRP)","Radio del problema: un rack/servidor","Ejemplo: HAProxy failover con VIP"]},{"title":"Disaster Recovery (DR)","icon":"backup","rows":["Protege contra: pérdida total del site","Tiempo de recuperación: minutos/horas","Transparente al usuario: no siempre","Automático: manual o semi-automático","Radio del problema: datacenter/región","Ejemplo: restore en otra región AWS"]}]}
\`\`\`

*HA y DR son complementarios, no mutuamente excluyentes — un buen sistema tiene ambos.*

### 📖 Componentes de un plan de DR

\`\`\`text
1. INVENTARIO DE ACTIVOS
   - Lista de todos los componentes críticos
   - Dependencias entre ellos
   - Propietario de cada componente

2. RTO Y RPO POR COMPONENTE
   - Base de datos: RTO=30min, RPO=15min
   - Servidores web: RTO=15min, RPO=0 (stateless)
   - DNS: RTO=5min, RPO=0

3. ESTRATEGIA DE BACKUP
   - Qué se hace backup (datos, configuración, secrets)
   - Frecuencia (cada 15min, diario, semanal)
   - Destino (S3, sitio secundario, tape)
   - Retención (7 días, 30 días, 1 año)

4. RUNBOOKS DE RECUPERACIÓN
   - Procedimientos paso a paso
   - Comandos exactos a ejecutar
   - Criterios de éxito

5. TESTING SCHEDULE
   - Frecuencia de tests de DR
   - Tipo de test (tabletop, partial, full)
   - Responsables
\`\`\`

### 📖 Runbook de recuperación: ejemplo de base de datos

\`\`\`bash
#!/bin/bash
# RUNBOOK: Recuperar PostgreSQL desde backup S3
# Tiempo estimado: 20-30 minutos
# RTO objetivo: 30 minutos
# Prerequisitos: acceso a AWS S3, servidor de DB limpio disponible

set -euo pipefail
LOG="/var/log/dr-recovery-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee "\$LOG") 2>&1

echo "=== DR RECOVERY START: $(date) ==="

# PASO 1: Verificar conectividad a S3
echo "[1/6] Verificando acceso a S3..."
aws s3 ls s3://mi-empresa-backups/postgres/ | tail -5

# PASO 2: Identificar el backup más reciente
echo "[2/6] Identificando backup más reciente..."
LATEST_BACKUP=$(aws s3 ls s3://mi-empresa-backups/postgres/ \
  --recursive | sort | tail -1 | awk '{print \$4}')
echo "Backup a restaurar: \$LATEST_BACKUP"

# PASO 3: Descargar backup
echo "[3/6] Descargando backup (puede tardar varios minutos)..."
aws s3 cp "s3://mi-empresa-backups/postgres/\$LATEST_BACKUP" /tmp/restore.sql.gz

# PASO 4: Restaurar
echo "[4/6] Restaurando base de datos..."
sudo -u postgres createdb mi_app_db
gunzip -c /tmp/restore.sql.gz | sudo -u postgres psql mi_app_db

# PASO 5: Verificar integridad
echo "[5/6] Verificando integridad..."
sudo -u postgres psql mi_app_db -c "SELECT COUNT(*) FROM usuarios;"
sudo -u postgres psql mi_app_db -c "SELECT MAX(created_at) FROM transacciones;"

# PASO 6: Actualizar DNS y notificar
echo "[6/6] Actualizar DNS (manual):"
echo "  → Cambiar registro A de db.mi-empresa.com a $(hostname -I | awk '{print \$1}')"
echo "  → Notificar al equipo en #incidents"

echo "=== DR RECOVERY END: $(date) ==="
\`\`\`

### 📖 Testing de DR: tipos y frecuencia

\`\`\`text
TIPO DE TEST           DESCRIPCIÓN                           FRECUENCIA
────────────────────────────────────────────────────────────────────────
Tabletop exercise      Revisar el runbook en equipo,          Trimestral
                       identificar gaps sin ejecutar
Partial test           Restaurar un componente no crítico      Mensual
                       en entorno de staging
Full DR test           Restaurar TODO en región secundaria     Semestral
                       (sin afectar producción)
Chaos injection        Matar componentes aleatorios en         Continuo
                       producción (con safety nets)
\`\`\`

\`\`\`bash
# Test de restore automatizado (corre en CI/CD o cron)
#!/bin/bash
# Verifica que el backup más reciente se puede restaurar

set -e
DB_TEST="dr_test_$(date +%s)"

# Crear DB temporal
sudo -u postgres createdb \$DB_TEST

# Restaurar último backup
LATEST=$(aws s3 ls s3://backups/postgres/ --recursive | sort | tail -1 | awk '{print \$4}')
aws s3 cp "s3://backups/postgres/\$LATEST" /tmp/test.sql.gz
gunzip -c /tmp/test.sql.gz | sudo -u postgres psql \$DB_TEST

# Verificar integridad mínima
ROW_COUNT=$(sudo -u postgres psql \$DB_TEST -t -c "SELECT COUNT(*) FROM usuarios;")
if [ "\$ROW_COUNT" -gt 0 ]; then
    echo "DR TEST PASSED: \$ROW_COUNT usuarios en el backup"
else
    echo "DR TEST FAILED: tabla usuarios vacía"
    exit 1
fi

# Limpiar
sudo -u postgres dropdb \$DB_TEST
rm /tmp/test.sql.gz
\`\`\`

### 📖 Gestión de configuración y secrets

\`\`\`bash
# Los datos sin configuración no sirven de nada.
# Backup de configuración en git cifrado:

# Opción 1: git-crypt para archivos sensibles
git-crypt init
git-crypt add-gpg-user user@empresa.com
echo "config/secrets.yml filter=git-crypt diff=git-crypt" >> .gitattributes

# Opción 2: Ansible vault para secrets
ansible-vault encrypt_string 'mi_password_db' --name 'db_password'

# Opción 3: Backup de /etc en S3 (sin secrets, solo configuración)
tar czf /tmp/etc-backup-$(date +%Y%m%d).tar.gz \
  /etc/haproxy /etc/keepalived /etc/nginx /etc/systemd/system/mi-app.service
aws s3 cp /tmp/etc-backup-*.tar.gz s3://mi-empresa-backups/config/
\`\`\`

### 📋 Lo que debes recordar

* HA protege contra fallos de componente; DR protege contra pérdida total del sitio — son complementarios.
* Un runbook no testado es un runbook que fallará bajo presión — el testing periódico es obligatorio.
* El backup sin restore verificado no cuenta como backup: siempre automatizar la verificación de integridad.
* Los secrets y la configuración son tan críticos como los datos — necesitan su propia estrategia de backup.

### 🧪 Autoevaluación

1. ¿Por qué es insuficiente tener solo HA sin un plan de DR?
2. ¿Qué diferencia hay entre un "tabletop exercise" y un "full DR test"?
3. Tu empresa hace backups de la base de datos cada hora a S3, pero nunca ha probado el restore. ¿Qué problema concreto tiene esta situación?

---

1. HA protege contra fallos individuales dentro de un datacenter o región: un servidor cae, otro toma el tráfico. Pero si el datacenter completo se inunda, incendia, o hay una partición de red regional, todos los nodos del cluster HA quedan offline simultáneamente. El DR aborda ese escenario "catastrófico" donde la solución no es failover automático sino restaurar el servicio desde cero en otra ubicación.
2. Un tabletop exercise es una revisión en papel del runbook: el equipo se sienta juntos y "simula" ejecutar el plan, identificando gaps, dependencias faltantes y pasos ambiguos — sin ejecutar nada real. Tarda 1-2 horas y es bajo riesgo. Un full DR test ejecuta realmente el plan completo en un entorno paralelo: restaura toda la infraestructura en una región secundaria, verifica que funciona y mide el RTO real. Tarda horas y revela problemas que el tabletop no puede descubrir.
3. El problema es que no se sabe si el backup es válido hasta intentar restaurarlo. Los backups pueden corromperse silenciosamente (disco con errores, proceso interrumpido, cifrado mal aplicado), el proceso de restore puede tener dependencias no documentadas, o la versión de PostgreSQL del servidor de restore puede diferir. Sin pruebas periódicas de restore, se descubrirá que el backup no funciona exactamente en el momento de mayor presión, cuando ya es tarde.
`

export default content
