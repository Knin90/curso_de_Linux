const content = `
## Módulo 2 — Gestión de parches en Linux: apt/dnf security updates

### 🎯 Objetivos de aprendizaje

* Aplicar solo actualizaciones de seguridad en sistemas Debian/Ubuntu y RHEL/Fedora.
* Identificar qué parches están pendientes antes de aplicarlos.
* Manejar kernels y actualizaciones que requieren reinicio.
* Entender el concepto de "backporting" que usan las distribuciones.

### ❓ El problema real

En producción no puedes simplemente ejecutar \`apt upgrade\` y rezar. Necesitas saber exactamente qué cambia, si requiere reinicio, si rompe compatibilidad, y cómo volver atrás si algo falla. La gestión de parches es un proceso, no un comando.

### 📖 Backporting: por qué las versiones "antiguas" pueden estar parcheadas

Las distribuciones enterprise (Debian, Ubuntu LTS, RHEL) no actualizan a la última versión del software — eso rompería compatibilidad. En cambio, aplican "backports": toman solo el fix de seguridad y lo aplican a la versión anterior.

\`\`\`bash
# OpenSSL en Ubuntu 22.04 puede ser 3.0.2 con patches de vulnerabilidades
# descubiertas en versiones posteriores como 3.1.x, 3.2.x
# El changelog muestra los CVEs parcheados:
apt-get changelog openssl | head -50

# Verificar la versión de un paquete y sus CVEs parcheados:
apt-cache show openssl | grep -E "Version|CVE"
# Version: 3.0.2-0ubuntu1.15
# La parte "0ubuntu1.15" indica 15 revisiones de Ubuntu, cada una con parches

# Ver el historial de seguridad de un paquete Ubuntu
ubuntu-security-status --unavailable 2>/dev/null || \
  apt-get dist-upgrade --simulate 2>&1 | grep -i security
\`\`\`

### 📖 Identificar actualizaciones de seguridad pendientes

\`\`\`bash
# Ubuntu/Debian: solo actualizaciones de seguridad
apt-get update
apt-get --just-print upgrade 2>&1 | grep -i security
apt-get -s upgrade               # simulate: qué cambiaría

# Ver solo upgrades de seguridad disponibles
apt-get upgrade -s 2>&1 | grep "^Inst" | grep -i security

# Herramienta específica de Ubuntu
ubuntu-security-status
# Salida:
# 47 packages can be updated.
# 12 updates are security updates.

# Listar CVEs que afectan al sistema (requiere ubuntu-advantage-tools)
pro security-status --format json 2>/dev/null | python3 -m json.tool

# RHEL/CentOS/Fedora
dnf updateinfo list security
dnf updateinfo list --security
dnf updateinfo summary
# Salida:
# Updates Information Summary: available
#   3 Security notice(s)
#     2 Important Security notice(s)
#     1 Moderate Security notice(s)

# Ver detalles de cada advisory
dnf updateinfo info CVE-2023-XXXX
dnf updateinfo list --cve CVE-2023-XXXX
\`\`\`

### 📖 Aplicar solo actualizaciones de seguridad

\`\`\`bash
# ── Debian / Ubuntu ──────────────────────────────────────────
# Solo paquetes de repositorios de seguridad
apt-get upgrade -y --with-new-pkgs \
  -o Dir::Etc::SourceList=/dev/null \
  -o Dir::Etc::SourceParts=/dev/null \
  -o APT::Get::List-Cleanup=0

# Forma más simple: usar unattended-upgrades manualmente
unattended-upgrades --dry-run --debug 2>&1 | head -30
unattended-upgrades -v   # aplicar con verbose

# Actualizar solo paquetes específicos por CVE
apt-get install --only-upgrade openssl libssl3

# ── RHEL / CentOS / Fedora ───────────────────────────────────
# Solo security updates
dnf update --security -y
dnf upgrade --security -y

# Solo actualizaciones críticas
dnf update --sec-severity=Critical -y

# Actualizar por CVE específico
dnf update --cve CVE-2023-44487 -y

# Actualizar por advisory específico
dnf update --advisory RHSA-2023:5363 -y
\`\`\`

### 📖 Gestión de kernels y reinicios

El kernel no puede "actualizarse en caliente" para todos los cambios. Tras instalar un kernel nuevo:

\`\`\`bash
# Ver kernels instalados
dpkg -l "linux-image-*" | grep "^ii"
# o en RHEL:
rpm -q kernel

# Ver qué kernel corre actualmente
uname -r   # ej: 6.5.0-21-generic

# Ver qué kernel se usará tras reinicio
ls /boot/vmlinuz* | sort -V | tail -1

# Verificar si hay servicios que necesitan reinicio (Debian/Ubuntu)
needrestart -r a     # -r a = restart automático de servicios si es seguro
needrestart -b       # batch mode, no interactivo

# Ver qué necesita reinicio
needrestart -l

# En RHEL: tracer o needs-restarting
needs-restarting -r      # requiere reinicio del sistema?
needs-restarting -s      # servicios que necesitan reinicio

# Kpatch (RHEL) y livepatch (Ubuntu): parches de kernel sin reinicio
# Solo para kernels soportados y parches específicos
canonical-livepatch status     # Ubuntu
kpatch list                    # RHEL

# Programar reinicio en hora de baja actividad
sudo shutdown -r 03:00 "Reinicio programado: parche de seguridad kernel"
sudo shutdown -c    # cancelar si es necesario
\`\`\`

### 📖 Rollback de parches

\`\`\`bash
# ── Debian / Ubuntu ──────────────────────────────────────────
# Ver historial de apt
cat /var/log/apt/history.log | tail -50
grep "Upgrade:" /var/log/apt/history.log | tail -5

# Hacer downgrade a versión anterior
apt-get install openssl=3.0.2-0ubuntu1.14  # versión específica anterior

# Ver versiones disponibles
apt-cache policy openssl

# Pin para evitar upgrade automático
echo "openssl hold" | dpkg --set-selections
dpkg --get-selections | grep hold  # verificar

# ── RHEL ─────────────────────────────────────────────────────
# Ver historial de dnf
dnf history
dnf history info 42     # detalles de transacción 42

# Deshacer una transacción
dnf history undo 42

# Downgrade a versión anterior
dnf downgrade openssl
\`\`\`

### 📋 Lo que debes recordar

* Backporting significa que la versión del paquete puede parecer "vieja" pero contiene fixes de seguridad — verifica el changelog, no solo el número de versión.
* \`needrestart\` (Debian) y \`needs-restarting\` (RHEL) identifican servicios y kernels que requieren reinicio tras un parche.
* En producción, siempre usa \`--dry-run\` o \`-s\` (simulate) antes de aplicar parches.
* Guarda el historial: \`/var/log/apt/history.log\` y \`dnf history\` son tu registro de auditoría.

### 🧪 Autoevaluación

1. Ubuntu tiene instalado OpenSSL 3.0.2, pero CVE-2023-XXXX fue parcheado en 3.0.8. ¿Cómo sabes si Ubuntu 22.04 está protegido?
2. Después de aplicar un parche al kernel, \`uname -r\` sigue mostrando la versión antigua. ¿Por qué y qué debes hacer?
3. ¿Cómo aplicas solo el parche para CVE-2023-44487 en un sistema RHEL/CentOS?

---

1. Verifica el changelog del paquete: \`apt-get changelog openssl\`. Ubuntu hace backporting del fix a la versión 3.0.2 que incluye en la distribución. Si el changelog menciona CVE-2023-XXXX, el sistema está protegido aunque el número de versión sea diferente. También puedes consultar el Ubuntu Security Notice correspondiente en security.ubuntu.com.
2. El kernel nuevo está instalado en \`/boot\` pero el sistema sigue corriendo el kernel anterior que se cargó al arrancar. \`uname -r\` muestra el kernel en ejecución. Para usar el nuevo kernel debes reiniciar: \`sudo reboot\`. Tras el reinicio, \`uname -r\` mostrará la nueva versión.
3. Con DNF: \`dnf update --cve CVE-2023-44487 -y\`. DNF buscará el advisory que contiene ese CVE y aplicará solo los paquetes afectados. Puedes usar \`--dry-run\` primero para ver qué se aplicaría: \`dnf update --cve CVE-2023-44487 --dry-run\`.
`

export default content
