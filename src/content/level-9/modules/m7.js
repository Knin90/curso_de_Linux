const content = `
## Módulo 7 — Hardening del servidor SSH: sshd_config

### 🎯 Objetivos de aprendizaje

* Aplicar las configuraciones críticas de seguridad en \`/etc/ssh/sshd_config\`.
* Validar la configuración con \`sshd -t\` antes de recargar.
* Recargar el servicio de forma segura sin perder la sesión actual.

### ❓ El problema real

Un servidor con SSH expuesto en el puerto 22 con contraseñas habilitadas recibe entre 1.000 y 10.000 intentos de fuerza bruta diarios. La solución no es ocultar el puerto — es eliminar los vectores de ataque: desactivar contraseñas y root.

### 📖 El archivo de configuración del servidor

\`\`\`bash
# Editar la configuración del daemon SSH
sudo nano /etc/ssh/sshd_config

# Validar sintaxis ANTES de recargar (imprescindible)
sudo sshd -t

# Recargar sin cortar sesiones activas
sudo systemctl reload sshd
\`\`\`

### 📖 Configuraciones críticas de seguridad

\`\`\`text
# ─── AUTENTICACIÓN ──────────────────────────────────────────────────
# Desactivar autenticación por contraseña (OBLIGATORIO en producción)
PasswordAuthentication no

# Activar autenticación por llave pública
PubkeyAuthentication yes

# ─── ACCESO ROOT ────────────────────────────────────────────────────
# Impedir que root inicie sesión directamente
# Si se necesita root, conectarse como usuario normal y hacer sudo
PermitRootLogin no

# ─── ALGORITMOS CRIPTOGRÁFICOS (solo los seguros) ───────────────────
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes256-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512

# ─── RESTRICCIONES ADICIONALES ──────────────────────────────────────
# Limitar usuarios que pueden conectarse por SSH
AllowUsers ubuntu postgres admin

# Tiempo máximo para autenticarse (en segundos)
LoginGraceTime 30

# Número máximo de intentos de autenticación por conexión
MaxAuthTries 3

# Desactivar reenvío de agente en el servidor (si no se necesita)
AllowAgentForwarding no

# Desactivar reenvío de puertos TCP (si no se necesita)
AllowTcpForwarding no

# ─── KEEPALIVE ──────────────────────────────────────────────────────
ClientAliveInterval 300
ClientAliveCountMax 2
\`\`\`

### 📖 Tabla de opciones críticas

| Directiva | Valor seguro | Riesgo si está mal |
| --- | --- | --- |
| \`PasswordAuthentication\` | \`no\` | Ataques de fuerza bruta efectivos |
| \`PermitRootLogin\` | \`no\` | Si root es comprometido, el servidor es del atacante |
| \`PubkeyAuthentication\` | \`yes\` | Sin esta opción, las llaves no funcionan |
| \`MaxAuthTries\` | \`3\` | Más intentos = más efectividad de brute force |
| \`LoginGraceTime\` | \`30\` | Ventana larga de autenticación favorece ataques |
| \`AllowUsers\` | Lista explícita | Un usuario comprometido puede dar acceso SSH |

### 💻 Workflow seguro para cambios en sshd_config

\`\`\`bash
# 1. Hacer backup SIEMPRE
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# 2. Editar
sudo nano /etc/ssh/sshd_config

# 3. Validar sintaxis (si hay error, lo muestra aquí, no al reiniciar)
sudo sshd -t
# Sin output = sin errores

# 4. Verificar que tienes OTRA sesión SSH abierta antes de recargar
# (seguro de emergencia si algo falla)

# 5. Recargar (NO restart si estás conectado remotamente)
sudo systemctl reload sshd

# 6. Desde la OTRA terminal, verificar que aún puedes conectarte
ssh servidor-lab

# 7. Si algo salió mal, revertir desde la sesión que sigue abierta
sudo cp /etc/ssh/sshd_config.bak /etc/ssh/sshd_config
sudo systemctl reload sshd
\`\`\`

### ⚠️ reload vs restart: la diferencia crítica

\`\`\`text
systemctl reload sshd
  → Recarga la configuración
  → Las sesiones SSH activas CONTINÚAN
  → Si la nueva config tiene errores, el servicio puede quedar
     en estado degradado pero las sesiones siguen

systemctl restart sshd
  → Mata el proceso sshd
  → CORTA todas las sesiones SSH activas
  → Si estás conectado remotamente, te quedas afuera
  → Si la config tiene errores, no levanta y pierdes acceso
\`\`\`

> **Regla de oro:** Si estás conectado por SSH, usa **siempre \`reload\`**. Nunca \`restart\`. Y siempre \`sshd -t\` antes.

### 📖 Verificar la configuración efectiva

Para auditar qué métodos de autenticación están activos:

\`\`\`bash
# Ver configuración efectiva del sshd (incluye defaults)
sudo sshd -T | grep -E "passwordauthentication|pubkeyauthentication|permitrootlogin"
\`\`\`

\`\`\`text
passwordauthentication no
pubkeyauthentication yes
permitrootlogin no
\`\`\`

### 📋 Lo que debes recordar

* **\`PasswordAuthentication no\` + \`PermitRootLogin no\` + \`PubkeyAuthentication yes\`** es la tríada mínima de hardening.
* **Siempre \`sshd -t\` antes de recargar.** Un error de sintaxis puede dejarte sin acceso.
* **\`reload\` nunca \`restart\`** cuando estás conectado por SSH.
* **Backup de sshd_config antes de editar**: si algo sale mal, puedes revertir desde tu sesión abierta.
* **\`sshd -T\`** muestra la configuración efectiva real (incluyendo defaults) — más confiable que leer el archivo.

### 🧪 Autoevaluación

1. Desactivas \`PasswordAuthentication\` pero te olvidas de verificar que tienes la llave pública instalada. ¿Qué ocurre?
2. ¿Por qué \`PermitRootLogin no\` es una medida de seguridad en sí misma, aunque tengas las contraseñas desactivadas?
3. Editas \`sshd_config\` con un error de sintaxis y ejecutas \`systemctl reload sshd\`. ¿Qué pasa?

---

1. No puedes entrar. Las contraseñas están desactivadas y la llave pública no está instalada. Necesitas acceso por consola física o de cloud para recuperar el acceso.
2. Reduce la superficie de ataque: incluso si hubiera alguna vulnerabilidad que permitiera autenticarse como root (por ejemplo, un zero-day), \`PermitRootLogin no\` añade una capa extra de defensa. Además, obliga a usar usuarios con sudo, lo que crea registros de auditoría.
3. Con \`reload\`, las sesiones activas continúan aunque la recarga falle. SSH seguirá funcionando con la configuración anterior. Tendrás tiempo de corregir el error. Con \`restart\`, perderías el acceso inmediatamente.
`

export default content
