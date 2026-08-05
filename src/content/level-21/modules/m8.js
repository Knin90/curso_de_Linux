const content = `
## Módulo 8 — Laboratorio: hardening completo de un servidor

### 🎯 Objetivos de aprendizaje
* Ejecutar un ciclo completo de hardening sobre Ubuntu 22.04 desde cero
* Medir el estado inicial con Lynis y establecer una línea base
* Aplicar controles de kernel, servicios, SUID, SSH, PAM y banners
* Verificar cada control aplicado antes de continuar
* Demostrar mejora cuantificable del hardening index en la auditoría final

### ❓ El problema real
Recibes un servidor Ubuntu 22.04 recién instalado que va a pasar a producción en 72 horas. El equipo de seguridad exige un hardening index mínimo de 70% en Lynis antes del go-live. El servidor tiene el índice por defecto: 58%. Tienes que llegar al objetivo sin romper la aplicación que correrá sobre él.

### 📖 Preparación del entorno

**Requisitos:**
- Ubuntu 22.04 LTS (fresh install o VM)
- Acceso root o sudo
- Conexión a internet para instalar herramientas

**Instalar herramientas necesarias:**
\`\`\`bash
apt update && apt install -y lynis auditd libpam-pwquality ufw git
\`\`\`

**Crear directorio de trabajo:**
\`\`\`bash
mkdir -p /root/hardening-lab
cd /root/hardening-lab
\`\`\`

### 📖 Fase 0 — Auditoría inicial (pre-hardening)

Antes de tocar nada, documentamos el estado actual como línea base.

\`\`\`bash
# Ejecutar auditoría inicial
lynis audit system --report-file /root/hardening-lab/lynis-before.dat 2>&1 | \
  tee /root/hardening-lab/lynis-before.log

# Extraer el hardening index inicial
grep "^hardening_index=" /root/hardening-lab/lynis-before.dat
# Resultado típico en servidor recién instalado:
# hardening_index=58
\`\`\`

**Salida esperada (pre-hardening):**
\`\`\`
Hardening index : 58 [###########         ]
Tests performed : 247

Warnings (5):
  - SSH: AllowTcpForwarding is enabled [SSH-7408]
  - SSH: X11Forwarding is enabled [SSH-7408]
  - No firewall detected [FIRE-4512]
  - Found no password for single user mode [AUTH-9308]
  - Core dumps not restricted [KRNL-5820]

Suggestions (35):
  - Install libpam-pwquality [AUTH-9262]
  - Set password aging controls [AUTH-9286]
  - Disable Avahi daemon [BOOT-5180]
  - Consider disabling IPv6 [NET-6501]
  [... 31 más]
\`\`\`

Anotamos los 5 warnings: son nuestra prioridad absoluta.

### 📖 Paso 1 — Kernel hardening (sysctl)

Los parámetros sysctl son el cambio de mayor impacto con menor riesgo.

\`\`\`bash
cat > /etc/sysctl.d/99-hardening.conf << 'EOF'
# Red — protección contra ataques de red
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1

# IPv6 — deshabilitar si no se usa
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# Kernel — hardening de memoria y acceso
kernel.randomize_va_space = 2
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.sysrq = 0
kernel.core_uses_pid = 1
fs.suid_dumpable = 0

# Core dumps — deshabilitar
fs.suid_dumpable = 0
EOF
\`\`\`

**Aplicar y verificar:**
\`\`\`bash
# Aplicar todos los parámetros
sysctl --system

# Verificar parámetros críticos
sysctl net.ipv4.tcp_syncookies
# net.ipv4.tcp_syncookies = 1

sysctl kernel.randomize_va_space
# kernel.randomize_va_space = 2

sysctl kernel.dmesg_restrict
# kernel.dmesg_restrict = 1
\`\`\`

### 📖 Paso 2 — Auditoría y deshabilitación de servicios

\`\`\`bash
# Ver todos los servicios activos
systemctl list-units --type=service --state=active

# Servicios a deshabilitar en un servidor típico:
UNNECESSARY_SERVICES=(
    avahi-daemon    # mDNS/Bonjour, innecesario en servidores
    cups            # sistema de impresión
    bluetooth       # bluetooth (si no es hardware físico)
    rpcbind         # NFS RPC, innecesario si no hay NFS
    snapd           # snap package manager (opcional)
)

for svc in "\${UNNECESSARY_SERVICES[@]}"; do
    if systemctl is-active --quiet "\$svc" 2>/dev/null; then
        systemctl disable --now "\$svc"
        echo "Deshabilitado: \$svc"
    else
        echo "No activo: \$svc (OK)"
    fi
done
\`\`\`

**Verificación:**
\`\`\`bash
systemctl is-active avahi-daemon
# inactive

systemctl is-enabled avahi-daemon
# disabled
\`\`\`

### 📖 Paso 3 — Auditoría de binarios SUID

Los binarios SUID ejecutan con privilegios del propietario (normalmente root), independientemente de quién los invoque.

\`\`\`bash
# Listar todos los binarios SUID del sistema
find / -perm -4000 -type f 2>/dev/null | sort | tee /root/hardening-lab/suid-list.txt
\`\`\`

**Salida típica:**
\`\`\`
/usr/bin/at
/usr/bin/chfn
/usr/bin/chsh
/usr/bin/fusermount3
/usr/bin/gpasswd
/usr/bin/mount
/usr/bin/newgrp
/usr/bin/passwd
/usr/bin/su
/usr/bin/sudo
/usr/bin/umount
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/openssh/ssh-keysign
/usr/sbin/pam_extrausers_chkpwd
/usr/sbin/unix_chkpwd
\`\`\`

**Remover SUID de binarios no esenciales:**
\`\`\`bash
# Binarios cuyo SUID rara vez es necesario en servidores
REMOVE_SUID=(
    /usr/bin/at        # programador de tareas one-shot
    /usr/bin/chfn      # cambiar información GECOS
    /usr/bin/chsh      # cambiar shell de usuario
)

for bin in "\${REMOVE_SUID[@]}"; do
    if [ -f "\$bin" ]; then
        chmod u-s "\$bin"
        echo "SUID removido: \$bin"
    fi
done

# Verificar
ls -la /usr/bin/at
# -rwxr-xr-x 1 root root ... /usr/bin/at  (sin 's' en permisos)
\`\`\`

**Nota:** Nunca remover SUID de \`sudo\`, \`su\`, \`passwd\`, \`mount\`, \`umount\`. Romperían el sistema.

### 📖 Paso 4 — SSH hardening

\`\`\`bash
# Backup de la configuración actual
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Aplicar configuración segura
cat > /etc/ssh/sshd_config.d/99-hardening.conf << 'EOF'
# Autenticación
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
LoginGraceTime 30
PermitEmptyPasswords no

# Funcionalidades innecesarias
AllowTcpForwarding no
X11Forwarding no
PermitUserEnvironment no
AllowAgentForwarding no
GatewayPorts no

# Protocolos y algoritmos
Protocol 2
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

# Timeouts
ClientAliveInterval 300
ClientAliveCountMax 2

# Logging
LogLevel VERBOSE
\`\`\`
EOF
\`\`\`

**Verificar configuración antes de reiniciar:**
\`\`\`bash
# Verificar sintaxis (NO recarga el servicio)
sshd -t && echo "Configuración válida"

# Inspeccionar valores efectivos
sshd -T | grep -E "permitrootlogin|passwordauthentication|maxauthtries|allowtcpforwarding|x11forwarding"
# permitrootlogin no
# passwordauthentication no
# maxauthtries 3
# allowtcpforwarding no
# x11forwarding no

# Recargar solo si la verificación fue exitosa
systemctl reload sshd
echo "SSH recargado correctamente"
\`\`\`

**IMPORTANTE:** Antes de cerrar tu sesión SSH actual, abre otra terminal y verifica que puedes conectarte con clave SSH. Si perdiste acceso, usa la consola del hypervisor.

### 📖 Paso 5 — PAM: políticas de contraseñas y bloqueo

\`\`\`bash
# Configurar requisitos de complejidad de contraseñas
cat > /etc/security/pwquality.conf << 'EOF'
# Longitud mínima
minlen = 14

# Requerir al menos 1 mayúscula
ucredit = -1

# Requerir al menos 1 minúscula
lcredit = -1

# Requerir al menos 1 dígito
dcredit = -1

# Requerir al menos 1 carácter especial
ocredit = -1

# Penalizar secuencias y repeticiones
maxsequence = 3
maxrepeat = 3

# No permitir que la nueva contraseña contenga el username
gecoscheck = 1
\`\`\`
EOF
\`\`\`

**Configurar bloqueo de cuentas por intentos fallidos:**
\`\`\`bash
# Agregar pam_faillock a la autenticación
# En Ubuntu 22.04, editar /etc/pam.d/common-auth
# Agregar ANTES de la línea pam_unix.so:

# /etc/pam.d/common-auth debe contener:
# auth required pam_faillock.so preauth
# auth [success=1 default=ignore] pam_unix.so nullok
# auth requisite pam_deny.so
# auth required pam_faillock.so authfail
# auth optional pam_cap.so

# Configurar faillock
cat > /etc/security/faillock.conf << 'EOF'
# Bloquear después de 5 intentos fallidos
deny = 5

# Tiempo de bloqueo: 900 segundos (15 minutos)
unlock_time = 900

# Ventana de tiempo para contar intentos fallidos
fail_interval = 900
\`\`\`
EOF

# Verificar
faillock --user testuser
\`\`\`

**Configurar envejecimiento de contraseñas:**
\`\`\`bash
# Para nuevos usuarios (modifica /etc/login.defs)
sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   90/' /etc/login.defs
sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   1/' /etc/login.defs
sed -i 's/^PASS_WARN_AGE.*/PASS_WARN_AGE   14/' /etc/login.defs

# Para usuarios existentes
chage --maxdays 90 --mindays 1 --warndays 14 ubuntu

# Verificar
chage -l ubuntu
\`\`\`

### 📖 Paso 6 — Banner legal

\`\`\`bash
# Crear banner con advertencia legal
cat > /etc/issue.net << 'EOF'
***************************************************************************
                           AVISO LEGAL

Este sistema es de acceso restringido. Solo usuarios autorizados pueden
acceder a este sistema. Todo acceso no autorizado está prohibido y será
investigado y reportado a las autoridades competentes.

Al acceder a este sistema, usted acepta que sus actividades pueden ser
monitoreadas y registradas.
***************************************************************************
EOF

# Activar banner en SSH
echo "Banner /etc/issue.net" >> /etc/ssh/sshd_config.d/99-hardening.conf

# Banner para login local
cp /etc/issue.net /etc/issue

# Recargar SSH
systemctl reload sshd

# Verificar que el banner está configurado
sshd -T | grep banner
# banner /etc/issue.net
\`\`\`

### 📖 Paso 7 — Firewall básico

\`\`\`bash
# Habilitar UFW con política por defecto restrictiva
ufw default deny incoming
ufw default allow outgoing

# Permitir solo SSH (ajustar según necesidades de la aplicación)
ufw allow 22/tcp comment 'SSH'

# Si el servidor corre aplicación web:
# ufw allow 443/tcp comment 'HTTPS'
# ufw allow 80/tcp comment 'HTTP'

# Habilitar el firewall
ufw --force enable

# Verificar estado
ufw status verbose
\`\`\`

### 📖 Fase Final — Auditoría post-hardening

\`\`\`bash
# Ejecutar Lynis nuevamente
lynis audit system --report-file /root/hardening-lab/lynis-after.dat 2>&1 | \
  tee /root/hardening-lab/lynis-after.log

# Comparar hardening index
echo "=== Comparación de hardening index ==="
echo -n "Antes:  "
grep "^hardening_index=" /root/hardening-lab/lynis-before.dat | cut -d= -f2

echo -n "Después: "
grep "^hardening_index=" /root/hardening-lab/lynis-after.dat | cut -d= -f2
\`\`\`

**Salida esperada (post-hardening):**
\`\`\`
=== Comparación de hardening index ===
Antes:   58
Después: 74

Hardening index : 74 [##############      ]
Tests performed : 247

Warnings (1):
  - No time synchronization daemon found [TIME-3104]

Suggestions (18):
  - Install a time synchronization daemon (NTP) [TIME-3104]
  [... 17 más]
\`\`\`

**Mejora lograda: +16 puntos (de 58% a 74%)**

**Comparar warnings resueltos:**
\`\`\`bash
# Warnings antes
grep "^warning\[]" /root/hardening-lab/lynis-before.dat | wc -l

# Warnings después
grep "^warning\[]" /root/hardening-lab/lynis-after.dat | wc -l

# Ver qué warnings quedan pendientes
grep "^warning\[]" /root/hardening-lab/lynis-after.dat
\`\`\`

### 📖 Resumen de cambios aplicados

| Control | Archivo modificado | Verificación |
|---------|-------------------|--------------|
| Kernel sysctl | /etc/sysctl.d/99-hardening.conf | sysctl -a |
| Servicios deshabilitados | systemd | systemctl is-active |
| SUID removidos | permisos de binarios | ls -la |
| SSH hardening | /etc/ssh/sshd_config.d/99-hardening.conf | sshd -T |
| PAM pwquality | /etc/security/pwquality.conf | passwd (prueba) |
| PAM faillock | /etc/security/faillock.conf | faillock |
| Banner legal | /etc/issue.net | conexión SSH |
| Firewall UFW | ufw rules | ufw status |

**Commit del estado final:**
\`\`\`bash
cd /etc
git add sysctl.d/99-hardening.conf \
        ssh/sshd_config.d/99-hardening.conf \
        security/pwquality.conf \
        security/faillock.conf \
        issue.net issue \
        login.defs
git commit -m "feat: apply CIS L1 hardening - index 58 -> 74"
\`\`\`

### 📋 Lo que debes recordar
* Siempre medir antes de cambiar: el hardening index inicial es tu línea base
* El orden importa: sysctl y SSH primero (bajo riesgo, alto impacto), PAM después
* Verificar cada paso antes de continuar, especialmente SSH (riesgo de lockout)
* Nunca remover SUID de sudo, su, passwd, mount — romperían el sistema
* El objetivo no es llegar al 100% sino superar el umbral requerido sin romper servicios
* Documentar todo en git: cada cambio debe ser trazable y reversible

### 🧪 Autoevaluación
1. ¿Por qué es crítico verificar con \`sshd -t\` antes de recargar el servicio SSH, y qué comando usas para abrir una segunda sesión de prueba antes de cerrar la actual?
2. Después de aplicar \`libpam-pwquality\`, un usuario se queja de que no puede cambiar su contraseña. ¿Cuál es el primer parámetro de \`/etc/security/pwquality.conf\` que revisas y por qué?
3. El hardening index subió de 58 a 74 pero el equipo de seguridad exige 80%. Basándote en los warnings y suggestions restantes del reporte Lynis, ¿qué tres controles adicionales aplicarías para ganar los 6 puntos restantes?

---

1. \`sshd -t\` valida la sintaxis de configuración sin recargar el servicio; si hay un error de sintaxis y ya recargaste, SSH falla y pierdes acceso remoto. Para protegerse: abrir una segunda terminal SSH antes de recargar. Si la nueva conexión funciona con la nueva config, la sesión actual ya no importa. Si falla, la sesión actual sigue activa para revertir.
2. El primer parámetro a revisar es \`minlen\`. Si está en 14 y la contraseña del usuario es corta, el cambio fallará silenciosamente o con un mensaje genérico. También revisar \`ucredit\`, \`lcredit\`, \`dcredit\` y \`ocredit\`: si todos son -1, la contraseña debe tener mayúscula, minúscula, número y símbolo. El error más común es que el usuario intenta una contraseña que no cumple la complejidad.
3. Tres controles con mayor impacto en el índice: (1) instalar y configurar NTP/chrony (resuelve TIME-3104, warning activo); (2) configurar auditd con reglas básicas del CIS (varios tests de auditoría fallan sin auditd activo); (3) configurar la política de sudo para requerir contraseña y establecer un timeout corto (SUDO-3220). Estos tres típicamente suman 6-10 puntos en el índice Lynis.
`

export default content
