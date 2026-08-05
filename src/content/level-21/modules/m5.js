const content = `
## Módulo 5 — SSH hardening: configuración segura de producción

### 🎯 Objetivos de aprendizaje
* Deshabilitar autenticación por contraseña y root login en SSH
* Restringir acceso por usuario, grupo y opciones de sesión
* Configurar algoritmos modernos de cifrado, MAC y kex
* Añadir un banner de advertencia legal antes del login
* Verificar la configuración activa con sshd -T sin reiniciar el servicio

---

### ❓ El problema real

Un servidor de producción recibe 3.000 intentos de login por SSH cada hora provenientes de bots automatizados. El servidor tiene PermitRootLogin yes y PasswordAuthentication yes — configuración por defecto de muchas distribuciones. Un atacante necesita solo adivinar la contraseña de root. Con contraseñas como "admin123", "password", "server2024", el tiempo promedio de compromiso es horas, no meses. Además, el servidor usa cifrados antiguos (3DES, RC4) negociados automáticamente por compatibilidad con clientes obsoletos.

---

### 📖 Estructura de sshd_config

La configuración del servidor SSH vive en \`/etc/ssh/sshd_config\`. En sistemas modernos con drop-in support, también en \`/etc/ssh/sshd_config.d/\`.

\`\`\`bash
# Ubicación principal
/etc/ssh/sshd_config

# Drop-ins (Ubuntu 22.04+, Debian 12+)
/etc/ssh/sshd_config.d/*.conf

# Verificar configuración activa sin reiniciar (incluye defaults del compilador)
sshd -T

# Verificar sintaxis antes de reiniciar (evitar quedarse sin acceso)
sshd -t

# Reiniciar solo si la prueba de sintaxis pasa
sshd -t && systemctl restart sshd
\`\`\`

**Buena práctica**: hacer todos los cambios en un drop-in, no tocar el archivo principal:

\`\`\`bash
# Crear archivo de hardening
/etc/ssh/sshd_config.d/99-hardening.conf
\`\`\`

Esto facilita actualizaciones del sistema (el archivo principal puede actualizarse sin tocar tu configuración) y hace el diff de cambios más claro.

---

### 📖 Autenticación: deshabilitar contraseñas, habilitar claves

\`\`\`ini
# /etc/ssh/sshd_config.d/99-hardening.conf

# ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────
# Deshabilitar login con contraseña (requerido antes de activar esto:
# asegurarse de que tu clave pública está en authorized_keys)
PasswordAuthentication no

# Deshabilitar passwords vacías
PermitEmptyPasswords no

# Autenticación por clave pública (debe estar explícitamente habilitada)
PubkeyAuthentication yes

# Deshabilitar otros métodos de autenticación
ChallengeResponseAuthentication no
KerberosAuthentication no
GSSAPIAuthentication no

# Deshabilitar autenticación basada en host (~/.rhosts, /etc/hosts.equiv)
HostbasedAuthentication no
IgnoreRhosts yes
\`\`\`

**Antes de deshabilitar PasswordAuthentication, verificar que la clave funciona:**

\`\`\`bash
# En tu máquina local: copiar clave pública al servidor
ssh-copy-id -i ~/.ssh/id_ed25519.pub usuario@servidor

# O manualmente en el servidor:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA... tu@maquina" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Probar que la autenticación por clave funciona ANTES de deshabilitar passwords
ssh -i ~/.ssh/id_ed25519 usuario@servidor

# Solo cuando confirmas que funciona:
# PasswordAuthentication no → sshd -t && systemctl restart sshd
\`\`\`

---

### 📖 Acceso de root y control de usuarios

\`\`\`ini
# ─── ACCESO ROOT ──────────────────────────────────────────────────────────────
# Nunca permitir login directo como root por SSH
# Usar: ssh usuario@servidor → sudo/su si necesitas root
PermitRootLogin no

# Alternativa más permisiva si necesitas ejecutar comandos como root sin sudo:
# PermitRootLogin forced-commands-only
# (permite root solo para comandos específicos en authorized_keys)

# ─── CONTROL DE USUARIOS ──────────────────────────────────────────────────────
# Permitir solo usuarios específicos (lista separada por espacios)
# Solo una de estas directivas: AllowUsers O AllowGroups (no ambas)
AllowUsers deploy admin backup

# O por grupo (más fácil de mantener en equipos grandes)
# AllowGroups sshusers admins

# Si usas AllowUsers/AllowGroups, todos los demás quedan denegados automáticamente
\`\`\`

\`\`\`bash
# Crear grupo de acceso SSH y asignar usuarios
groupadd sshusers
usermod -aG sshusers deploy
usermod -aG sshusers admin

# Verificar membresía
id deploy
# uid=1001(deploy) gid=1001(deploy) groups=1001(deploy),1002(sshusers)
\`\`\`

---

### 📖 Puerto, timeouts y límites

\`\`\`ini
# ─── PUERTO ───────────────────────────────────────────────────────────────────
# Cambiar a puerto no estándar reduce ruido de bots automatizados
# No es seguridad real (security through obscurity), pero baja el nivel de ruido
# Elegir entre 1024-65535, que no esté en uso
Port 2222

# ─── TIMEOUTS Y LÍMITES ───────────────────────────────────────────────────────
# Tiempo máximo para completar el login (en segundos)
LoginGraceTime 30

# Máximo de intentos de autenticación por conexión
MaxAuthTries 3

# Número máximo de sesiones SSH simultáneas por conexión
MaxSessions 5

# Número máximo de conexiones pre-autenticación simultáneas
# Formato: start:rate:full (10 nuevas, 30% prob. rechazo, máx 60)
MaxStartups 10:30:60

# Keepalive: detectar clientes muertos
# El servidor envía un mensaje cada N segundos
ClientAliveInterval 300
# Si el cliente no responde después de N mensajes, cerrar la conexión
ClientAliveCountMax 2
# Con los valores anteriores: timeout = 300 * 2 = 600 segundos = 10 minutos
\`\`\`

---

### 📖 Algoritmos de cifrado modernos

\`\`\`ini
# ─── PROTOCOLO Y CIFRADO ──────────────────────────────────────────────────────
# Solo SSH protocolo 2 (protocolo 1 está roto desde 2001)
# En SSH modernos esto es el default y no necesita configurarse,
# pero vale la pena ser explícito:
# Protocol 2   # obsoleto en OpenSSH 7.6+, es siempre 2

# ─── ALGORITMOS DE INTERCAMBIO DE CLAVES (KexAlgorithms) ─────────────────────
# Solo algoritmos de curva elíptica modernos
# Eliminar: diffie-hellman-group14-sha1, diffie-hellman-group1-sha1
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256

# ─── CIFRADOS SIMÉTRICOS ─────────────────────────────────────────────────────
# Eliminar: 3des-cbc, aes128-cbc, arcfour*, blowfish-cbc
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

# ─── ALGORITMOS MAC ──────────────────────────────────────────────────────────
# Eliminar: hmac-md5*, hmac-sha1*, hmac-ripemd160
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,umac-128-etm@openssh.com

# ─── ALGORITMOS DE CLAVE DE HOST ─────────────────────────────────────────────
# Preferir ed25519 y ecdsa sobre rsa
HostKeyAlgorithms ssh-ed25519,ssh-ed25519-cert-v01@openssh.com,ecdsa-sha2-nistp521,ecdsa-sha2-nistp384,ecdsa-sha2-nistp256,rsa-sha2-512,rsa-sha2-256
\`\`\`

**Verificar qué algoritmos soporta tu versión de OpenSSH:**

\`\`\`bash
# Ver versión de OpenSSH
ssh -V

# Cifrados disponibles
ssh -Q cipher

# MACs disponibles
ssh -Q mac

# Algoritmos de kex
ssh -Q kex
\`\`\`

---

### 📖 Funcionalidades a deshabilitar

\`\`\`ini
# ─── FORWARDING Y TÚNELES ────────────────────────────────────────────────────
# Deshabilitar reenvío de display X11 (no tiene sentido en servidor headless)
X11Forwarding no

# Deshabilitar TCP forwarding (túneles SSH para saltarse firewalls)
# Habilitar solo si hay casos de uso legítimos documentados
AllowTcpForwarding no

# Deshabilitar agent forwarding (reenviado de claves SSH del cliente)
AllowAgentForwarding no

# Deshabilitar reenvío de puertos en modo streamlocal
AllowStreamLocalForwarding no

# ─── OTRAS OPCIONES ──────────────────────────────────────────────────────────
# Deshabilitar .rhosts y equivalentes
IgnoreUserKnownHosts no

# No leer ~/.ssh/environment (evitar manipulación de variables de entorno)
PermitUserEnvironment no

# Deshabilitar compresión (puede ser explotada antes de autenticación)
Compression no

# Imprimir el último login (información útil para detectar accesos no autorizados)
PrintLastLog yes
\`\`\`

---

### 📖 Banner de advertencia legal

\`\`\`bash
# Crear archivo de banner
cat > /etc/issue.net << 'EOF'
***************************************************************************
ACCESO RESTRINGIDO - SISTEMA PRIVADO
Este sistema es para uso exclusivo de usuarios autorizados.
Todo acceso es monitoreado y registrado.
El acceso no autorizado está prohibido y será perseguido legalmente.
***************************************************************************
EOF

# Permisos adecuados
chmod 644 /etc/issue.net
\`\`\`

\`\`\`ini
# Activar el banner en sshd_config
Banner /etc/issue.net
\`\`\`

El banner se muestra ANTES de la autenticación. En muchas jurisdicciones, el banner es requisito legal para perseguir accesos no autorizados (establece que el acceso es restringido).

---

### 📖 Verificación completa con sshd -T

\`\`\`bash
# Ver la configuración activa completa (incluyendo defaults)
sshd -T

# Verificar parámetros específicos después del hardening
sshd -T | grep -E "permitrootlogin|passwordauthentication|pubkeyauthentication"
# permitrootlogin no
# passwordauthentication no
# pubkeyauthentication yes

sshd -T | grep -E "x11forwarding|allowtcpforwarding|maxauthtries"
# x11forwarding no
# allowtcpforwarding no
# maxauthtries 3

sshd -T | grep -E "^port|logingracetime|clientalive"
# port 2222
# logingracetime 30
# clientaliveinterval 300
# clientalivecountmax 2

# Verificar los cifrados activos
sshd -T | grep -E "ciphers|macs|kexalgorithms"
\`\`\`

**Aplicar cambios de forma segura:**

\`\`\`bash
# 1. Verificar sintaxis
sshd -t
# Si no hay output: sintaxis correcta

# 2. Mantener la sesión actual abierta
# 3. Reiniciar sshd
systemctl restart sshd

# 4. Abrir UNA NUEVA sesión para verificar que puedes conectarte
# (no cerrar la sesión actual hasta confirmar)
ssh -p 2222 admin@servidor

# 5. Solo entonces cerrar la sesión original
\`\`\`

---

### 📋 Lo que debes recordar
* Nunca deshabilitar PasswordAuthentication sin verificar primero que la autenticación por clave funciona
* PermitRootLogin no es la directiva más impactante: ningún bot puede comprometer root directamente
* sshd -t valida sintaxis; sshd -T muestra la config activa (incluyendo defaults del compilador)
* Cambiar el puerto no es seguridad, pero reduce el ruido en logs significativamente
* Siempre mantener una sesión SSH abierta al reiniciar sshd, hasta confirmar que la nueva config funciona

---

### 🧪 Autoevaluación

1. Cambias Port a 2222 en sshd_config, ejecutas \`systemctl restart sshd\`, y pierdes acceso al servidor. ¿Qué salió mal y cómo lo hubieras prevenido?
2. ¿Por qué deshabilitar AllowTcpForwarding es importante en un servidor de producción, aunque el usuario tenga una clave SSH válida y acceso legítimo?
3. Un desarrollador necesita reenviar el agente SSH para hacer deploy desde el servidor a otro servidor sin copiar claves. ¿Qué directiva modificarías y qué riesgo introduces?

---

1. Si ufw estaba activo bloqueando el nuevo puerto, o si olvidaste hacer \`sshd -t\` antes de reiniciar y había un error de sintaxis, o si la sesión actual se cerró antes de verificar. La prevención: \`sshd -t\` antes de reiniciar, abrir una segunda sesión para probar antes de cerrar la primera, y si usas ufw: \`ufw allow 2222/tcp\` antes de cambiar el puerto.
2. Porque un usuario autenticado podría crear un túnel SSH para exponer servicios internos al exterior o para saltar a otros segmentos de red. AllowTcpForwarding no limita el daño si una cuenta de usuario es comprometida.
3. Habilitar \`AllowAgentForwarding yes\`. El riesgo es que si el servidor intermedio está comprometido, el atacante puede usar el agente reenviado para autenticarse en el servidor destino, robando efectivamente el acceso aunque nunca vea la clave privada.
`

export default content
