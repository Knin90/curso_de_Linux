const content = `
## Módulo 7 — CIS Benchmark: evaluación y remediación automatizada

### 🎯 Objetivos de aprendizaje
* Comprender el propósito y la estructura del CIS Benchmark para Linux
* Distinguir entre los perfiles Level 1 y Level 2
* Ejecutar auditorías con Lynis e interpretar el hardening index
* Usar OpenSCAP para evaluaciones basadas en SCAP content
* Priorizar y automatizar la remediación de controles CIS

### ❓ El problema real
Tu empresa acaba de pasar por una auditoría de seguridad externa. El equipo auditor entrega un informe de 80 páginas basado en CIS Benchmark Level 1. No sabes por dónde empezar, cuáles son críticos y cuáles apenas impactan la funcionalidad. ¿Cómo conviertes ese documento en acciones concretas y medibles?

### 📖 ¿Qué es CIS Benchmark?

CIS (Center for Internet Security) publica guías de configuración segura para sistemas operativos, aplicaciones y dispositivos de red. Son el estándar de facto en la industria para definir una línea base de seguridad.

**Propósito principal:**
- Reducir la superficie de ataque eliminando configuraciones inseguras por defecto
- Proveer una referencia auditable y reproducible
- Facilitar el cumplimiento normativo (PCI-DSS, HIPAA, ISO 27001)

Los benchmarks son gratuitos y descargables desde https://www.cisecurity.org/cis-benchmarks/

### 📖 Niveles de perfil: Level 1 vs Level 2

**Level 1 — Perfil básico recomendado**
- Aplica a la mayoría de entornos
- Impacto mínimo en la funcionalidad del sistema
- Controles con alta relación costo/beneficio
- Punto de partida para cualquier servidor en producción
- Ejemplo: deshabilitar el acceso root por SSH, configurar umask seguro

**Level 2 — Defensa en profundidad**
- Orientado a entornos de alta seguridad
- Puede afectar funcionalidades legítimas
- Requiere evaluación caso por caso
- Ejemplo: montar /tmp con noexec y nosuid, restringir el kernel con módulos específicos
- Se usa en entornos PCI, gubernamentales o con datos altamente sensibles

La elección del nivel depende del perfil de riesgo del sistema. Un servidor web público puede requerir L2; un servidor interno de desarrollo puede ser suficiente con L1.

### 📖 Estructura de un control CIS

Cada recomendación CIS sigue esta estructura:

\`\`\`
Sección: 5. Access, Authentication and Authorization
  Subsección: 5.2 Configure SSH Server
    Recomendación: 5.2.4 Ensure SSH access is limited
    Perfil: Level 1 - Server
    Descripción: Qué hace el control y por qué existe
    Rationale: Justificación técnica del riesgo
    Remediation: Comandos exactos para aplicar el control
    Audit: Cómo verificar que el control está activo
\`\`\`

**Secciones principales del CIS Benchmark para Linux (Ubuntu/RHEL):**

| Sección | Contenido |
|---------|-----------|
| 1. Filesystem | Particiones separadas, opciones de montaje, módulos deshabilitados |
| 2. Services | Servicios innecesarios a deshabilitar (avahi, cups, rpcbind) |
| 3. Network | Parámetros sysctl de red, firewall, IPv6 |
| 4. Logging | auditd, rsyslog, logrotate |
| 5. Access/Auth | SSH, PAM, sudo, contraseñas |
| 6. Maintenance | Integridad de archivos, permisos, SUID/SGID |

### 📖 Lynis: auditoría de seguridad local

Lynis es una herramienta de auditoría de seguridad open source que analiza el sistema local y produce un reporte con el hardening index actual.

**Instalación:**
\`\`\`bash
# Ubuntu/Debian
apt install lynis

# Desde el repositorio oficial (versión más reciente)
git clone https://github.com/CISlyd/lynis
cd lynis
\`\`\`

**Ejecución básica:**
\`\`\`bash
# Auditoría estándar del sistema
lynis audit system

# Modo pentesting (más agresivo, útil para auditoría ofensiva)
lynis audit system --pentest

# Guardar el reporte en un archivo
lynis audit system --report-file /tmp/lynis-report.dat
\`\`\`

**Interpretando el reporte de Lynis:**

El reporte se guarda en \`/var/log/lynis.log\` y \`/var/log/lynis-report.dat\`.

\`\`\`
Hardening index : 58 [###########         ]
Tests performed : 247
Plugins enabled : 0

[+] Warnings:
    - SSH: AllowTcpForwarding is enabled [SSH-7408]
    - Found some information disclosure in SMTP banner [MAIL-8818]

[+] Suggestions:
    - Set a password for single user mode [AUTH-9308]
    - Install libpam-pwquality [AUTH-9262]
    - Consider disabling IPv6 if not needed [NET-6501]
\`\`\`

**Secciones del reporte Lynis:**
- **System**: información básica del OS y kernel
- **Authentication**: usuarios, PAM, sudo, SSH
- **Shells**: shells disponibles y configuración
- **File systems**: opciones de montaje, inodes, cuotas
- **Storage**: dispositivos, controladores
- **USB**: dispositivos USB habilitados
- **NTP**: sincronización de tiempo
- **Logging**: auditd, rsyslog, log files
- **Insecure services**: telnet, rsh, rlogin, ftp
- **Banners**: mensajes de advertencia legal
- **Scheduled tasks**: cron, at, anacron
- **Kernel**: parámetros sysctl, módulos cargados
- **Memory and processes**: gestión de memoria, core dumps
- **Firewall**: iptables, nftables, ufw, firewalld
- **SSH**: configuración completa del servidor SSH
- **Databases**: MySQL, PostgreSQL (si están presentes)

**Filtrar solo warnings:**
\`\`\`bash
grep "^Warning" /var/log/lynis.log
grep "\!" /var/log/lynis-report.dat
\`\`\`

### 📖 OpenSCAP: evaluación basada en estándares SCAP

OpenSCAP implementa el protocolo SCAP (Security Content Automation Protocol) y permite evaluar el sistema contra perfiles predefinidos, incluyendo el CIS Benchmark.

**Instalación:**
\`\`\`bash
# Ubuntu
apt install openscap-scanner ssg-base ssg-debderived

# RHEL/CentOS
dnf install openscap-scanner scap-security-guide
\`\`\`

**SCAP content disponible:**
\`\`\`bash
# Ver perfiles disponibles para Ubuntu
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Ver perfiles disponibles para RHEL
oscap info /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
\`\`\`

**Ejecutar evaluación CIS Level 1:**
\`\`\`bash
oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
  --report /tmp/openscap-report.html \
  --results /tmp/openscap-results.xml \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
\`\`\`

**Generar reporte HTML legible:**
\`\`\`bash
# El reporte HTML ya se genera con --report en el comando anterior
# Para convertir resultados XML a HTML:
oscap xccdf generate report /tmp/openscap-results.xml > /tmp/report.html
\`\`\`

**Interpretar resultados OpenSCAP:**
- **pass**: control cumplido
- **fail**: control no cumplido (requiere remediación)
- **notapplicable**: no aplica a este sistema
- **error**: no se pudo evaluar (permisos, herramienta faltante)

### 📖 Priorizando la remediación

No todos los controles tienen el mismo esfuerzo ni el mismo impacto. Una estrategia efectiva sigue este orden:

**Fase 1 — Quick wins (bajo esfuerzo, alto impacto):**
\`\`\`bash
# Parámetros sysctl de red y kernel
sysctl -w net.ipv4.conf.all.rp_filter=1
sysctl -w net.ipv4.tcp_syncookies=1
sysctl -w kernel.randomize_va_space=2

# SSH básico
sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
\`\`\`

**Fase 2 — Esfuerzo medio:**
\`\`\`bash
# Remover servicios innecesarios
systemctl disable --now avahi-daemon cups bluetooth rpcbind

# Configurar PAM para contraseñas seguras
apt install libpam-pwquality

# Configurar auditd
apt install auditd && systemctl enable --now auditd
\`\`\`

**Fase 3 — Alto esfuerzo (requiere planificación):**
- Reparticionado del disco (requiere reinstalación o live CD)
- Migración a autenticación por clave SSH (coordinar con usuarios)
- Configuración de SELinux/AppArmor con políticas personalizadas

### 📖 Automatización de remediación con scripts

\`\`\`bash
#!/bin/bash
# hardening-apply.sh — Aplica controles CIS L1 básicos

set -euo pipefail
LOG="/var/log/hardening-\$(date +%Y%m%d).log"

log() { echo "[+] \$1" | tee -a "\$LOG"; }

# 1. Sysctl
log "Aplicando parámetros sysctl..."
cat > /etc/sysctl.d/99-hardening.conf << 'EOF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
kernel.randomize_va_space = 2
kernel.dmesg_restrict = 1
EOF
sysctl --system >> "\$LOG" 2>&1

# 2. Servicios
log "Deshabilitando servicios innecesarios..."
for svc in avahi-daemon cups bluetooth rpcbind; do
    if systemctl is-active --quiet "\$svc" 2>/dev/null; then
        systemctl disable --now "\$svc"
        log "  Deshabilitado: \$svc"
    fi
done

# 3. SSH
log "Endureciendo configuración SSH..."
sshd_cfg="/etc/ssh/sshd_config"
cp "\$sshd_cfg" "\${sshd_cfg}.bak"
declare -A SSH_OPTS=(
    ["PermitRootLogin"]="no"
    ["MaxAuthTries"]="3"
    ["AllowTcpForwarding"]="no"
    ["X11Forwarding"]="no"
)
for key in "\${!SSH_OPTS[@]}"; do
    sed -i "s/^#\\?\${key}.*\$/\${key} \${SSH_OPTS[\$key]}/" "\$sshd_cfg"
done
systemctl reload sshd

log "Hardening completado. Revisa \$LOG para detalles."
\`\`\`

### 📖 Seguimiento del progreso de hardening

\`\`\`bash
# Ejecución semanal de Lynis (agregar a cron)
# /etc/cron.weekly/lynis-audit
#!/bin/bash
DATE=\$(date +%Y-%m-%d)
lynis audit system --quiet --report-file "/var/log/lynis-\$DATE.dat"

# Extraer hardening index histórico
grep "^hardening_index=" /var/log/lynis-*.dat | \
  sed 's|.*lynis-||;s|\.dat:hardening_index=|: |'
\`\`\`

**Rastrear cambios con git:**
\`\`\`bash
cd /etc
git init
git add sysctl.d/ ssh/sshd_config pam.d/ security/
git commit -m "baseline: pre-hardening snapshot"

# Después de aplicar controles:
git add -A
git commit -m "feat: apply CIS L1 controls - round 1"
git log --oneline
\`\`\`

Mantener un historial en git de los archivos de configuración permite:
- Auditar qué cambió y cuándo
- Revertir configuraciones si algo se rompe
- Documentar el progreso para reportes de cumplimiento

### 📋 Lo que debes recordar
* CIS Level 1 es el punto de partida para cualquier servidor; Level 2 se evalúa según el perfil de riesgo
* Lynis produce un hardening index que permite medir progreso a lo largo del tiempo
* OpenSCAP es más formal y produce resultados exportables para auditorías
* La remediación se prioriza por: quick wins → esfuerzo medio → alto esfuerzo
* Automatizar con scripts idempotentes permite aplicar controles de forma repetible y verificable
* Rastrear /etc con git convierte el hardening en un proceso auditable y reversible

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia práctica entre un control CIS Level 1 y uno Level 2? Da un ejemplo de cada uno.
2. En el reporte de Lynis, ¿qué diferencia hay entre un "Warning" y una "Suggestion"? ¿Cuál tiene mayor urgencia?
3. Tienes 4 horas para mejorar el hardening index de un servidor de 55% a más de 70%. ¿Por qué categoría de controles empiezas y por qué?

---

1. Level 1 aplica a la mayoría de entornos con impacto mínimo en funcionalidad (ej: deshabilitar PermitRootLogin en SSH). Level 2 aplica en entornos de alta seguridad y puede afectar funcionalidades legítimas (ej: montar /tmp con noexec, que puede romper ciertos instaladores).
2. Un Warning indica una configuración detectada como insegura y confirma que existe el problema. Una Suggestion es una recomendación preventiva sin evidencia de configuración incorrecta. Los Warnings tienen mayor urgencia porque representan riesgo activo confirmado.
3. Se empieza por los quick wins: parámetros sysctl y configuración SSH. Son cambios de una sola línea, no requieren reinicio, tienen alto impacto en el índice y cero riesgo de romper servicios. En 4 horas se pueden aplicar decenas de estos controles, lo que típicamente sube el índice 10-15 puntos.
`

export default content
