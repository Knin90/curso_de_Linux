const content = `
## Módulo 8 — Laboratorio: sistema de auditoría de producción completo

### 🎯 Objetivos de aprendizaje

* Construir un sistema de auditoría completo desde cero.
* Integrar reglas de identidad, privilegios, binarios y cumplimiento.
* Configurar alertas automáticas y reportes periódicos.
* Validar que el sistema funciona correctamente con pruebas reales.

### ❓ El problema real

Este laboratorio simula la implementación de auditd en un servidor de producción nuevo. El objetivo es tener un sistema funcional al final: reglas persistentes, alertas configuradas, reportes automatizados, y evidencia de que todo funciona.

### 📖 Paso 1: Instalar y verificar auditd

\`\`\`bash
# Verificar instalación
rpm -q audit || sudo dnf install -y audit

# Verificar que el servicio está activo
sudo systemctl enable --now auditd
sudo systemctl status auditd

# Ver estado del subsistema
sudo auditctl -s

# Ver reglas por defecto (normalmente vacío o solo algunas básicas)
sudo auditctl -l
\`\`\`

### 📖 Paso 2: Crear el conjunto de reglas de producción

\`\`\`bash
# Limpiar reglas existentes primero
sudo auditctl -D

# Crear estructura de archivos de reglas
sudo mkdir -p /etc/audit/rules.d/

# Archivo 00: configuración base
sudo tee /etc/audit/rules.d/00-base.rules << 'EOF'
## Base configuration
# Tamaño del backlog del kernel
-b 8192
# Modo de fallo: 1=printk, 2=panic
-f 1
EOF

# Archivo 10: identidad
sudo tee /etc/audit/rules.d/10-identity.rules << 'EOF'
## Identity and authentication files
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/security/opasswd -p wa -k identity
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers
-w /etc/pam.d/ -p wa -k pam-config
-w /etc/ssh/sshd_config -p wa -k sshd-config
-w /root/.ssh/ -p wa -k ssh-keys
EOF

# Archivo 20: escalada de privilegios
sudo tee /etc/audit/rules.d/20-privilege.rules << 'EOF'
## Privilege escalation detection
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -F auid!=4294967295 -k priv-exec
-a always,exit -F arch=b32 -S execve -F euid=0 -F auid>=1000 -F auid!=4294967295 -k priv-exec
-a always,exit -F arch=b64 -S setuid -S setgid -S setreuid -S setregid -k id-change
-a always,exit -F arch=b32 -S setuid -S setgid -S setreuid -S setregid -k id-change
-a always,exit -F arch=b64 -S ptrace -k ptrace
-w /usr/bin/sudo -p x -k sudo-exec
-w /usr/bin/su -p x -k su-exec
EOF

# Archivo 30: modificaciones del sistema
sudo tee /etc/audit/rules.d/30-system.rules << 'EOF'
## System modification
-w /bin/ -p wa -k bin-modification
-w /sbin/ -p wa -k bin-modification
-w /usr/bin/ -p wa -k bin-modification
-w /usr/sbin/ -p wa -k bin-modification
-w /etc/crontab -p wa -k cron-modification
-w /etc/cron.d/ -p wa -k cron-modification
-a always,exit -F arch=b64 -S init_module -S finit_module -S delete_module -k kernel-modules
-a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time-change
-w /etc/localtime -p wa -k time-change
EOF

# Archivo 40: sesiones y red
sudo tee /etc/audit/rules.d/40-sessions.rules << 'EOF'
## Sessions and network
-w /var/run/utmp -p wa -k session
-w /var/log/wtmp -p wa -k session
-w /var/log/btmp -p wa -k session
-a always,exit -F arch=b64 -S creat -S open -S openat -F exit=-EACCES -k access-denied
-a always,exit -F arch=b64 -S creat -S open -S openat -F exit=-EPERM -k access-denied
EOF

# Archivo 99: inmutable (cargar AL FINAL)
sudo tee /etc/audit/rules.d/99-finalize.rules << 'EOF'
## Lock audit configuration
-e 2
EOF

# Cargar todas las reglas
sudo augenrules --load

# Verificar
sudo auditctl -l | head -30
echo "Total de reglas: $(sudo auditctl -l | wc -l)"
\`\`\`

### 📖 Paso 3: Validar que las reglas funcionan

\`\`\`bash
# Test 1: modificar /etc/passwd (simulado)
sudo touch /etc/passwd   # solo actualiza atime — dispara la regla -p a
sudo ausearch -k identity --start recent -i | tail -20

# Test 2: ejecutar sudo
sudo ls /root
sudo ausearch -k sudo-exec --start recent -i | tail -10

# Test 3: acceso denegado
cat /etc/shadow   # debería fallar si no eres root
sudo ausearch -k access-denied --start recent -i | tail -10

# Test 4: modificación en /usr/bin (simulado como root)
sudo touch /usr/bin/.test-audit && sudo rm /usr/bin/.test-audit
sudo ausearch -k bin-modification --start recent -i | tail -10

echo "Todas las pruebas completadas — revisar salidas arriba"
\`\`\`

### 📖 Paso 4: Configurar reporte diario automático

\`\`\`bash
sudo tee /usr/local/bin/audit-daily-report.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail

REPORT="/var/reports/audit/$(date +%Y%m%d).txt"
mkdir -p "$(dirname "\$REPORT")"

{
    echo "=== REPORTE DIARIO DE AUDITORÍA: $(date) ==="
    echo "=== SERVIDOR: $(hostname) ==="
    echo ""

    echo "--- RESUMEN ---"
    aureport --start yesterday --end today 2>/dev/null || true

    echo ""
    echo "--- LOGINS FALLIDOS ---"
    aureport --failed --login --start yesterday --end today 2>/dev/null || true

    echo ""
    echo "--- EJECUCIONES PRIVILEGIADAS (priv-exec) ---"
    ausearch -k priv-exec --start yesterday -i 2>/dev/null | \
        grep -E "(time->|exe=|auid=)" | head -30 || true

    echo ""
    echo "--- CAMBIOS EN ARCHIVOS DE IDENTIDAD ---"
    ausearch -k identity --start yesterday -i 2>/dev/null | \
        grep -E "(time->|name=|auid=)" | head -20 || true

    echo ""
    echo "--- ANOMALÍAS ---"
    aureport --anomaly --start yesterday --end today 2>/dev/null || true

} > "\$REPORT"

chmod 600 "\$REPORT"
echo "Reporte generado: \$REPORT"
SCRIPT

sudo chmod +x /usr/local/bin/audit-daily-report.sh

# Crontab
echo "0 6 * * * root /usr/local/bin/audit-daily-report.sh" | \
    sudo tee /etc/cron.d/audit-report
\`\`\`

### 📖 Paso 5: Verificación final del sistema

\`\`\`bash
# Checklist de verificación
echo "=== CHECKLIST DE AUDITORÍA ==="

echo -n "1. auditd activo: "
systemctl is-active auditd

echo -n "2. Reglas cargadas: "
sudo auditctl -l | wc -l

echo -n "3. Modo inmutable: "
sudo auditctl -s | grep "^enabled" | awk '{print ($2==2 ? "SÍ (-e 2)" : "NO")}'

echo -n "4. Log de auditoría existe: "
ls -lh /var/log/audit/audit.log | awk '{print \$5}'

echo -n "5. Reglas en rules.d: "
ls /etc/audit/rules.d/*.rules | wc -l

echo "6. Reportes en /var/reports/audit/:"
ls /var/reports/audit/ 2>/dev/null || echo "  (ninguno aún)"

echo ""
echo "Sistema de auditoría configurado correctamente."
\`\`\`

### 📋 Lo que debes recordar

* El orden de los archivos en \`rules.d/\` importa: \`99-finalize.rules\` con \`-e 2\` SIEMPRE al final.
* Probar cada regla después de cargarla — una regla silenciosa que nunca dispara no sirve.
* Los reportes automatizados transforman auditd de herramienta reactiva a sistema de monitoreo proactivo.
* Guardar los reportes con permisos \`600\` — contienen información sensible de actividad del sistema.

### 🧪 Autoevaluación

1. ¿Por qué el archivo \`99-finalize.rules\` debe ser el último en cargarse?
2. En el test de validación, ¿qué evento buscas para confirmar que la regla de \`/etc/passwd\` funciona?
3. Si \`auditctl -s\` muestra \`enabled 2\`, ¿qué significa y cómo puedes modificar las reglas?

---

1. Porque contiene \`-e 2\` que pone el subsistema en modo inmutable. Si se cargara antes que las demás reglas, ninguna de las reglas siguientes podría añadirse sin reiniciar. El orden alfabético/numérico de los archivos garantiza que todas las reglas funcionales se carguen primero.
2. Buscar \`sudo ausearch -k identity --start recent -i\` y verificar que aparece un evento con \`name=/etc/passwd\` y el \`type=PATH\` correspondiente. El \`auid\` debe mostrar el usuario que ejecutó el \`touch\`.
3. \`enabled 2\` significa modo inmutable: ningún proceso puede cambiar las reglas en tiempo de ejecución, ni siquiera root. Para modificar las reglas hay que reiniciar el sistema, lo que hará que se carguen los archivos actualizados de \`/etc/audit/rules.d/\`. Esta es una protección deliberada en producción.
`

export default content
