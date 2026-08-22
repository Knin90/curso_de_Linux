const content = `
## Módulo 8 — Proyecto real: onboarding de usuarios para TechCorp

### 🎯 Objetivos de aprendizaje
* Integrar grupos, usuarios, sudo, políticas de contraseña, cuotas, PAM y límites del sistema en un flujo de incorporación real
* Automatizar la creación de usuarios de forma reproducible y segura
* Verificar cada configuración con herramientas estándar del sistema
* Entender cómo estas capas de seguridad se complementan entre sí en entornos de producción

### ❓ El problema real

La empresa **TechCorp** está incorporando tres nuevos desarrolladores. El equipo de operaciones debe:

- Crear grupos departamentales con GIDs fijos (para consistencia entre servidores)
- Crear los usuarios con directorios home apropiados
- Configurar acceso sudo granular por rol
- Aplicar política de contraseñas corporativa (90 días, aviso 14 días)
- Asignar cuotas de disco para el grupo de desarrollo
- Proteger las cuentas contra ataques de fuerza bruta con PAM
- Configurar límites del sistema para aplicaciones de producción

Si alguno de estos pasos se omite, el sistema queda expuesto o el desarrollador no puede trabajar correctamente.

### 📖 Estructura del proyecto

\`\`\`
onboarding-techcorp/
├── sudoers.d/techcorp
├── security/faillock.conf
├── security/limits.conf
└── verify.sh
\`\`\`

### 📖 Paso 1 — Crear grupos departamentales

Crear grupos con GIDs explícitos garantiza consistencia en sistemas NFS o LDAP donde el UID/GID debe coincidir entre servidores.

\`\`\`bash
# Crear grupos con GIDs fijos
sudo groupadd --gid 2100 dev
sudo groupadd --gid 2101 ops
sudo groupadd --gid 2102 qa

# Verificar que se crearon correctamente
getent group dev ops qa
\`\`\`

**Salida esperada:**
\`\`\`
dev:x:2100:
ops:x:2101:
qa:x:2102:
\`\`\`

### 📖 Paso 2 — Crear usuarios y asignar grupos

\`\`\`bash
# Crear tres desarrolladores
# -m crea el directorio home, -g grupo primario, -G grupos secundarios
sudo useradd -m -g dev -G qa -s /bin/bash -c "Ana García" ana.garcia
sudo useradd -m -g dev -G qa -s /bin/bash -c "Luis Pérez" luis.perez
sudo useradd -m -g dev -s /bin/bash -c "María López" maria.lopez

# Establecer contraseñas iniciales (en producción usar un gestor de contraseñas)
echo "ana.garcia:TempPass123!" | sudo chpasswd
echo "luis.perez:TempPass123!" | sudo chpasswd
echo "maria.lopez:TempPass123!" | sudo chpasswd

# Verificar creación
getent passwd ana.garcia luis.perez maria.lopez
\`\`\`

**Salida esperada:**
\`\`\`
ana.garcia:x:1001:2100:Ana García:/home/ana.garcia:/bin/bash
luis.perez:x:1002:2100:Luis Pérez:/home/luis.perez:/bin/bash
maria.lopez:x:1003:2100:María López:/home/maria.lopez:/bin/bash
\`\`\`

\`\`\`bash
# Verificar membresía de grupos
id ana.garcia
# uid=1001(ana.garcia) gid=2100(dev) groups=2100(dev),2102(qa)

id luis.perez
# uid=1002(luis.perez) gid=2100(dev) groups=2100(dev),2102(qa)
\`\`\`

### 📖 Paso 3 — Configurar sudo con aliases

El archivo sudoers permite configuración granular. Se usan aliases para mayor mantenibilidad.

\`\`\`bash
sudo visudo -f /etc/sudoers.d/techcorp
\`\`\`

Contenido del archivo:
\`\`\`
# /etc/sudoers.d/techcorp — Política de sudo de TechCorp
# Aliases de comandos permitidos para desarrolladores
Cmnd_Alias DEV_CMDS = /usr/bin/git, /usr/bin/npm

# Alias de usuarios por rol
User_Alias DEVELOPERS = ana.garcia, luis.perez, maria.lopez
User_Alias OPS_TEAM = carlos.ops, diana.ops

# Reglas de acceso
# Desarrolladores: solo comandos específicos, sin contraseña
DEVELOPERS ALL=(root) NOPASSWD: DEV_CMDS

# Ops: acceso total
OPS_TEAM ALL=(ALL:ALL) ALL
\`\`\`

\`\`\`bash
# Verificar sintaxis del archivo sudoers
sudo visudo -c -f /etc/sudoers.d/techcorp
# >>> /etc/sudoers.d/techcorp: parsed OK

# Verificar permisos del archivo (debe ser 440)
sudo chmod 440 /etc/sudoers.d/techcorp

# Verificar qué puede hacer un desarrollador
sudo -l -U ana.garcia
\`\`\`

**Salida esperada de sudo -l:**
\`\`\`
Matching Defaults entries for ana.garcia on server:
    env_reset, mail_badpass

User ana.garcia may run the following commands on server:
    (root) NOPASSWD: /usr/bin/git, /usr/bin/npm
\`\`\`

### 📖 Paso 4 — Política de contraseñas con chage

\`\`\`bash
# Aplicar política a todos los desarrolladores
for user in ana.garcia luis.perez maria.lopez; do
    sudo chage \
        --maxdays 90 \
        --warndays 14 \
        --lastday 0 \
        \$user
    echo "Política aplicada a: \$user"
done
\`\`\`

El flag \`--lastday 0\` establece la última fecha de cambio al epoch (01/01/1970), lo que **fuerza el cambio de contraseña en el primer inicio de sesión**.

\`\`\`bash
# Verificar política de un usuario
sudo chage -l ana.garcia
\`\`\`

**Salida esperada:**
\`\`\`
Last password change                                    : Jan 01, 1970
Password expires                                        : Apr 01, 1970
Password inactive                                       : never
Account expires                                         : never
Minimum number of days between password change          : 0
Maximum number of days between password change          : 90
Number of days of warning before password expires       : 14
\`\`\`

### 📖 Paso 5 — Cuotas de disco para el grupo dev

\`\`\`bash
# 1. Habilitar cuotas en /etc/fstab (editar la partición donde están los homes)
# Añadir 'usrquota,grpquota' a las opciones de montaje
# Ejemplo: /dev/sda2 /home ext4 defaults,usrquota,grpquota 0 2

# 2. Remontar la partición para activar cuotas
sudo mount -o remount /home

# 3. Crear los archivos de base de datos de cuotas
sudo quotacheck -cug /home

# 4. Activar cuotas
sudo quotaon /home

# 5. Establecer cuota para el grupo dev
# Soft: 5GB (advertencia), Hard: 6GB (límite absoluto)
# Valores en kilobytes: 5GB = 5242880K, 6GB = 6291456K
sudo setquota -g dev 5242880 6291456 0 0 /home

# 6. Verificar cuotas del grupo
sudo repquota -g /home
\`\`\`

**Salida esperada de repquota:**
\`\`\`
*** Report for group quotas on device /dev/sda2
Block grace time: 7days; Inode grace time: 7days
                        Block limits                File limits
Group           used    soft    hard  grace    used  soft  hard  grace
----------------------------------------------------------------------
dev       --      48 5242880 6291456              12     0     0
\`\`\`

\`\`\`bash
# Verificar cuota de un usuario específico
quota -s -u ana.garcia
\`\`\`

**Salida esperada:**
\`\`\`
Disk quotas for user ana.garcia (uid 1001):
     Filesystem   space   quota   limit   grace   files   quota   limit   grace
      /dev/sda2     16K      0K      0K               4       0       0
\`\`\`

### 📖 Paso 6 — Bloqueo de cuentas con PAM (pam_faillock)

pam_faillock bloquea una cuenta temporalmente tras varios intentos fallidos de autenticación.

\`\`\`bash
# Editar la configuración de pam_faillock
sudo nano /etc/security/faillock.conf
\`\`\`

Contenido:
\`\`\`
# Bloquear después de 5 intentos fallidos
deny = 5

# Tiempo de bloqueo: 1800 segundos = 30 minutos
unlock_time = 1800

# Ventana de tiempo para contar fallos (15 minutos)
fail_interval = 900

# Registrar intentos exitosos también
audit

# Mostrar información de la cuenta bloqueada
silent = no
\`\`\`

\`\`\`bash
# Verificar que pam_faillock esté configurado en PAM
# En sistemas modernos (RHEL/Fedora):
sudo grep -r "faillock" /etc/pam.d/system-auth /etc/pam.d/password-auth

# En Ubuntu/Debian, el módulo puede requerir configuración en:
# /etc/pam.d/common-auth
\`\`\`

**Salida esperada (RHEL/Fedora):**
\`\`\`
/etc/pam.d/system-auth:auth        required      pam_faillock.so preauth
/etc/pam.d/system-auth:auth        required      pam_faillock.so authfail
/etc/pam.d/system-auth:account     required      pam_faillock.so
\`\`\`

\`\`\`bash
# Ver estado de bloqueo de un usuario (tras intentos fallidos simulados)
sudo faillock --user ana.garcia
\`\`\`

**Salida esperada (sin intentos fallidos):**
\`\`\`
ana.garcia:
When                Type  Source                                           Valid
\`\`\`

**Salida esperada (cuenta bloqueada):**
\`\`\`
ana.garcia:
When                Type  Source                                           Valid
2024-03-15 14:23:01 RHOST 192.168.1.50                                    V
2024-03-15 14:23:05 RHOST 192.168.1.50                                    V
2024-03-15 14:23:09 RHOST 192.168.1.50                                    V
2024-03-15 14:23:12 RHOST 192.168.1.50                                    V
2024-03-15 14:23:15 RHOST 192.168.1.50                                    V
\`\`\`

\`\`\`bash
# Desbloquear manualmente si es necesario
sudo faillock --user ana.garcia --reset
\`\`\`

### 📖 Paso 7 — Límites del sistema con limits.conf

Para aplicaciones de producción que manejan muchas conexiones simultáneas, el límite de archivos abiertos por defecto (1024) es insuficiente.

\`\`\`bash
sudo nano /etc/security/limits.conf
\`\`\`

Añadir al final del archivo:
\`\`\`
# TechCorp — límites para usuarios de aplicación
# Formato: <dominio> <tipo> <ítem> <valor>

# Desarrolladores: límite alto de archivos abiertos
@dev    soft    nofile    65536
@dev    hard    nofile    65536

# Todos los usuarios de la aplicación (ejemplo para usuario de servicio)
appuser soft    nofile    65536
appuser hard    nofile    65536

# Límite de procesos concurrentes
@dev    soft    nproc     2048
@dev    hard    nproc     4096
\`\`\`

\`\`\`bash
# Verificar límites actuales de un usuario (debe hacer sesión nueva para aplicar)
# Iniciar sesión como el usuario y ejecutar:
su - ana.garcia -c "ulimit -n"
# 65536

su - ana.garcia -c "ulimit -u"
# 2048
\`\`\`

### 📖 Paso 8 — Verificación completa del sistema

\`\`\`bash
# ── Verificar usuarios y grupos ──────────────────────────────────
echo "=== Usuarios creados ==="
getent passwd ana.garcia luis.perez maria.lopez

echo "=== Grupos departamentales ==="
getent group dev ops qa

echo "=== Membresía de grupos ==="
for user in ana.garcia luis.perez maria.lopez; do
    echo -n "\$user: "
    id \$user
done
\`\`\`

\`\`\`bash
# ── Verificar sudo ───────────────────────────────────────────────
echo "=== Permisos sudo de ana.garcia ==="
sudo -l -U ana.garcia

echo "=== Validación del archivo sudoers ==="
sudo visudo -c -f /etc/sudoers.d/techcorp
\`\`\`

\`\`\`bash
# ── Verificar política de contraseñas ───────────────────────────
echo "=== Política de contraseñas ==="
for user in ana.garcia luis.perez maria.lopez; do
    echo "--- \$user ---"
    sudo chage -l \$user | grep -E "expires|warning|change"
done
\`\`\`

\`\`\`bash
# ── Verificar cuotas ────────────────────────────────────────────
echo "=== Cuotas de disco ==="
quota -s -u ana.garcia
sudo repquota -g /home | grep dev
\`\`\`

\`\`\`bash
# ── Verificar PAM faillock ───────────────────────────────────────
echo "=== Estado de bloqueo de cuentas ==="
for user in ana.garcia luis.perez maria.lopez; do
    echo "--- \$user ---"
    sudo faillock --user \$user
done
\`\`\`

\`\`\`bash
# ── Verificar límites del sistema ───────────────────────────────
echo "=== Límites de archivos abiertos ==="
su - ana.garcia -c "ulimit -a" | grep "open files"
\`\`\`

### 📖 Troubleshooting común

**Problema: Las cuotas no se aplican**
\`\`\`bash
# Verificar que quotaon esté activo
sudo quotaon -p /home
# /home: group quotas turned on
# /home: user quotas turned on
\`\`\`

**Problema: El cambio de contraseña forzado no funciona**
\`\`\`bash
# Verificar que lastday sea 0
sudo chage -l ana.garcia | grep "Last password"
# Last password change: Jan 01, 1970
\`\`\`

**Problema: Los límites de limits.conf no se aplican**
\`\`\`bash
# Verificar que PAM cargue pam_limits.so
grep pam_limits /etc/pam.d/system-auth
# session     required      pam_limits.so
\`\`\`

### 📋 Lo que debes recordar
* Los GIDs fijos son esenciales en entornos con NFS o autenticación centralizada (LDAP/AD)
* \`chage --lastday 0\` es la forma más sencilla de forzar cambio de contraseña en primer login
* Los aliases en sudoers hacen la política mantenible: cambiar un alias actualiza todos los usuarios
* Las cuotas requieren que el sistema de archivos esté montado con \`usrquota\` o \`grpquota\`
* pam_faillock protege contra ataques de fuerza bruta sin necesidad de software adicional
* Los límites de limits.conf solo se aplican en sesiones nuevas; las sesiones existentes no se ven afectadas
* Siempre verifica con \`visudo -c\` antes de cerrar sesión tras modificar sudoers

### 🧪 Autoevaluación
1. ¿Qué opción de \`useradd\` establece el grupo primario y cuál establece los grupos secundarios?
2. ¿Qué comando verifica los permisos sudo de un usuario sin iniciar sesión como él?
3. ¿Qué efecto tiene \`chage --lastday 0\` sobre una cuenta de usuario?

---

1. \`-g\` establece el grupo primario; \`-G\` establece los grupos secundarios (suplementarios)
2. \`sudo -l -U <usuario>\` muestra los permisos sudo de cualquier usuario desde una cuenta con privilegios
3. Establece la fecha del último cambio de contraseña al 1 de enero de 1970, lo que hace que el sistema considere la contraseña como expirada y obligue al usuario a cambiarla en su próximo inicio de sesión
`

export default content
