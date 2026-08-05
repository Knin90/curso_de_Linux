const content = `
## Módulo 4 — Lynis: auditoría de seguridad automatizada del sistema

### 🎯 Objetivos de aprendizaje

* Instalar y ejecutar Lynis para auditoría de hardening del sistema.
* Interpretar el Hardening Index y los resultados por categoría.
* Priorizar y aplicar las recomendaciones de Lynis.
* Integrar Lynis en flujos de CI/CD y monitoreo periódico.

### ❓ El problema real

Tienes un sistema parcheado, pero ¿está configurado de forma segura? Los CVEs son solo una parte del riesgo — configuraciones incorrectas como SSH sin restricciones, permisos laxos en archivos críticos, o servicios innecesarios activos son igual de peligrosas. Lynis audita el hardening: lo que va más allá de los parches.

### 📖 Qué es Lynis y qué verifica

Lynis es una herramienta de auditoría de seguridad open source (CISOfy) que verifica:

\`\`\`text
CATEGORÍA                    VERIFICACIONES TÍPICAS
─────────────────────────────────────────────────────────────────────
Boot & services              Cargador de arranque, servicios innecesarios activos
Users & groups               Cuentas sin contraseña, UID 0 extra, grupos peligrosos
Authentication               PAM, políticas de contraseña, 2FA
SSH                          Configuración de sshd: root login, protocolos, ciphers
Filesystem                   Permisos de /tmp, /etc/passwd, /etc/shadow
Software: firewalls           Estado de iptables/nftables/ufw/firewalld
Kernel                       Parámetros sysctl de seguridad, módulos cargados
Memory & processes           ASLR, stack protection, core dumps
Cryptography                 Versión de SSL/TLS, certificados expirados
Logging & auditing           rsyslog, auditd, log rotation
\`\`\`

### 📖 Instalación y ejecución

\`\`\`bash
# Instalación desde repositorio (recomendado para actualizaciones)
# Ubuntu/Debian:
curl -fsSL https://packages.cisofy.com/keys/cisofy-software-public.key | \
  gpg --dearmor -o /usr/share/keyrings/cisofy-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cisofy-keyring.gpg] \
  https://packages.cisofy.com/community/lynis/deb/ stable main" | \
  tee /etc/apt/sources.list.d/cisofy-lynis.list
apt-get update && apt-get install lynis

# O directo desde GitHub (sin instalación):
git clone https://github.com/CISOfy/lynis
cd lynis

# Ejecutar auditoría completa del sistema
sudo lynis audit system

# Modo sin colores (para logs/CI)
sudo lynis audit system --no-colors

# Solo verificar una categoría
sudo lynis audit system --tests-category "authentication"
sudo lynis audit system --tests-category "networking"

# Ver categorías disponibles
lynis show categories

# Auditoría rápida (menos tests)
sudo lynis audit system --quick
\`\`\`

### 📖 Interpretar la salida de Lynis

\`\`\`text
Resultado de cada verificación:
  [OK]       ✓ Configuración correcta
  [WARNING]  ⚠ Problema de seguridad que debe corregirse
  [SUGGESTION] 💡 Mejora recomendada pero no crítica
  [FOUND]    ℹ Información encontrada (neutral)
  [NOT FOUND] Sin resultado (software no instalado, no aplica)

Al final del reporte:
─────────────────────────────────────
  Lynis security scan details:

  Hardening index : 67 [#############       ]
  Tests performed : 248
  Plugins enabled : 0

  Components:
  - Firewall               [V]
  - Malware scanner        [X]   ← no instalado
  - File integrity tool    [X]   ← no instalado (aide, tripwire)
  - Boot loader protection [V]

  Lynis Recommendations:
  * Configure minimum and maximum password age [AUTH-9230]
  * Disable SSH root login [SSH-7412]
  * Enable auditd for system auditing [ACCT-9628]
─────────────────────────────────────
\`\`\`

### 📖 Aplicar recomendaciones comunes

\`\`\`bash
# 1. Deshabilitar root login por SSH [SSH-7412]
sudo sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# 2. Configurar parámetros de contraseña [AUTH-9230]
sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   90/' /etc/login.defs
sudo sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   7/' /etc/login.defs
sudo sed -i 's/^PASS_WARN_AGE.*/PASS_WARN_AGE   14/' /etc/login.defs

# 3. Habilitar auditd [ACCT-9628]
sudo apt-get install -y auditd
sudo systemctl enable --now auditd

# 4. Parámetros sysctl de seguridad [KRNL-6000]
cat >> /etc/sysctl.d/99-security.conf << 'EOF'
# Deshabilitar IP forwarding (si no es router)
net.ipv4.ip_forward = 0
# Protección SYN flood
net.ipv4.tcp_syncookies = 1
# Ignorar ICMP broadcast
net.ipv4.icmp_echo_ignore_broadcasts = 1
# Deshabilitar source routing
net.ipv4.conf.all.accept_source_route = 0
# ASLR
kernel.randomize_va_space = 2
# Restricción de dmesg (evita info leakage)
kernel.dmesg_restrict = 1
EOF
sysctl -p /etc/sysctl.d/99-security.conf

# 5. Instalar herramienta de integridad de archivos [FINT-4350]
sudo apt-get install -y aide
sudo aideinit
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
# Verificar integridad
sudo aide --check

# Después de aplicar cambios: re-auditar para ver mejora
sudo lynis audit system | grep "Hardening index"
\`\`\`

### 📖 Lynis en CI/CD y monitoreo continuo

\`\`\`bash
# Guardar resultados en archivo para comparación
sudo lynis audit system --no-colors --log-file /var/log/lynis.log \
  --report-file /var/log/lynis-report.dat 2>&1 | tee /var/log/lynis-output.txt

# Script para alertar si el Hardening Index cae
cat > /usr/local/bin/lynis-check.sh << 'SCRIPT'
#!/bin/bash
MIN_SCORE=70
REPORT=/var/log/lynis-report.dat

sudo lynis audit system --no-colors \
  --report-file \${REPORT} \
  --quiet 2>/dev/null

SCORE=$(grep "^hardening_index=" \${REPORT} | cut -d= -f2)

if [ "\${SCORE}" -lt "\${MIN_SCORE}" ]; then
    echo "ALERTA: Hardening Index \${SCORE} < \${MIN_SCORE}"
    grep "^warning\\|^suggestion" \${REPORT} | head -20
    exit 1
fi
echo "OK: Hardening Index = \${SCORE}"
SCRIPT
chmod +x /usr/local/bin/lynis-check.sh

# Cron semanal
echo "0 3 * * 0 root /usr/local/bin/lynis-check.sh >> /var/log/lynis-cron.log 2>&1" \
  > /etc/cron.d/lynis-audit
\`\`\`

### 📋 Lo que debes recordar

* El Hardening Index de Lynis no es una puntuación de seguridad absoluta — es un indicador de configuración relativo al perfil del sistema.
* Las recomendaciones \`[SUGGESTION]\` son mejoras; los \`[WARNING]\` son problemas reales que deben resolverse.
* Lynis no escanea CVEs de software — para eso están OpenVAS/Trivy. Lynis verifica configuración y hardening.
* Ejecutar Lynis periódicamente permite detectar regresiones: configuraciones que se vuelven inseguras después de cambios en el sistema.

### 🧪 Autoevaluación

1. Lynis reporta \`[WARNING]\` en \`SSH-7412\` (root login por SSH habilitado). ¿Es esto un CVE? ¿Cómo lo corriges?
2. ¿Qué diferencia hay entre un resultado \`[WARNING]\` y uno \`[SUGGESTION]\` en Lynis?
3. Tu Hardening Index pasó de 72 a 58 después de instalar un nuevo paquete. ¿Cómo investigas qué causó la caída?

---

1. No es un CVE — es una configuración insegura, no una vulnerabilidad en el software. Se corrige editando \`/etc/ssh/sshd_config\`: establecer \`PermitRootLogin no\` y recargar SSH con \`systemctl reload sshd\`. Si necesitas acceso root, la práctica correcta es conectar como usuario normal y luego usar \`sudo\` o \`su -\`.
2. Un \`[WARNING]\` indica un problema de seguridad activo que expone el sistema a riesgo real y debe corregirse. Un \`[SUGGESTION]\` es una mejora de hardening que aumentaría la postura de seguridad pero cuya ausencia no representa un riesgo inmediato significativo. En términos de prioridad: primero corrige todos los warnings, luego evalúa las suggestions según el contexto de tu sistema.
3. Ejecuta \`lynis audit system --no-colors 2>&1 | tee /tmp/lynis-new.txt\` y compara con el reporte anterior usando \`diff\`. Busca los nuevos \`[WARNING]\` o \`[SUGGESTION]\` que no existían antes. El nuevo paquete puede haber instalado servicios adicionales, abierto puertos, o modificado configuraciones del sistema.
`

export default content
