const content = `
## Módulo 2 — PAM: autenticación modular y stack de módulos

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura de PAM y por qué reemplaza la autenticación hardcoded.
* Leer e interpretar un stack PAM: tipos de módulos, flags de control y orden.
* Configurar pam_faillock para bloqueo de cuentas tras intentos fallidos.
* Construir una política de autenticación real con múltiples módulos encadenados.

### ❓ El problema real

Después de un incidente de seguridad, el equipo de compliance exige: bloquear cuentas tras 5 intentos fallidos, prohibir el login de root por SSH, requerir autenticación de dos factores para administradores, y limitar horarios de acceso para cuentas de servicio. Sin PAM, cada uno de estos requisitos requeriría modificar el código fuente de sshd, login, su y otros programas. Con PAM, configuras un archivo de texto y todos los programas que usan PAM respetan la política.

### 📖 Arquitectura de PAM

PAM (Pluggable Authentication Modules) desacopla la lógica de autenticación de las aplicaciones. Cualquier programa puede delegar auth a PAM simplemente llamando las funciones de libpam.

\`\`\`text
APLICACIÓN          PAM                          MÓDULOS
──────────          ───                          ───────
sshd         →   /etc/pam.d/sshd      →    pam_unix.so   (contraseñas locales)
login        →   /etc/pam.d/login     →    pam_faillock.so (bloqueo)
su           →   /etc/pam.d/su        →    pam_wheel.so  (solo grupo wheel)
sudo         →   /etc/pam.d/sudo      →    pam_time.so   (horarios)
\`\`\`

Cada archivo en /etc/pam.d/ define el stack de módulos para esa aplicación.

### 📖 Tipos de módulos (facility types)

Un stack PAM tiene cuatro tipos de módulos, cada uno con su propósito:

\`\`\`text
TIPO        FUNCIÓN
────────────────────────────────────────────────────────────────────
auth        Autenticar al usuario: verificar contraseña, OTP, etc.
account     Verificar condiciones de la cuenta: expirada, horario, acceso permitido
password    Cambiar contraseña: verificar complejidad, actualizar hash
session     Configurar el entorno de sesión: montar home, ulimits, env vars
\`\`\`

Un solo módulo puede implementar múltiples tipos. Por ejemplo, pam_unix.so implementa auth, account, password y session.

### 📖 Flags de control: lógica del stack

El flag de control determina cómo el resultado de un módulo afecta al resultado total del stack:

\`\`\`text
FLAG        COMPORTAMIENTO AL FALLAR                COMPORTAMIENTO AL PASAR
──────────────────────────────────────────────────────────────────────────
required    Falla registrada, sigue ejecutando      Continúa
requisite   Falla inmediatamente, no continúa       Continúa
sufficient  Se ignora (solo si no hay fallo previo) Éxito inmediato, para aquí
optional    Se ignora                               Se ignora (a menos que sea el único)
\`\`\`

\`\`\`text
# Ejemplo de lógica:
auth required   pam_faillock.so    # Si falla: registra fallo pero continúa
auth requisite  pam_nologin.so     # Si falla: para inmediatamente (archivo /etc/nologin existe)
auth sufficient pam_unix.so        # Si pasa Y no hay fallos previos: auth exitosa
auth required   pam_ldap.so        # Si llegamos aquí, intentamos LDAP

Flujo cuando contraseña local es correcta:
1. pam_faillock: registra intento → OK (required, continúa)
2. pam_nologin: /etc/nologin no existe → OK (requisite, continúa)
3. pam_unix: contraseña correcta → PASS (sufficient, para aquí con éxito)
4. pam_ldap: NO SE EJECUTA (sufficient exitoso antes)

Flujo cuando contraseña es incorrecta:
1. pam_faillock: registra intento fallido → OK (required, continúa)
2. pam_nologin: OK (requisite, continúa)
3. pam_unix: contraseña incorrecta → FAIL (sufficient, NO para — sufficient solo para en éxito)
4. pam_ldap: intenta autenticación LDAP → FAIL
Resultado final: FALLO
\`\`\`

### 📖 Módulos esenciales

\`\`\`bash
# pam_unix.so — autenticación con /etc/shadow (módulo base)
auth    required    pam_unix.so shadow nullok try_first_pass
# shadow: usar /etc/shadow para hashes
# nullok: permitir contraseñas vacías (remover en producción)
# try_first_pass: usar contraseña ya introducida (no preguntar dos veces)

# pam_faillock.so — bloqueo tras intentos fallidos (reemplaza pam_tally2 en sistemas modernos)
auth    required    pam_faillock.so preauth silent audit deny=5 unlock_time=900
auth    required    pam_faillock.so authfail audit deny=5 unlock_time=900
account required    pam_faillock.so
# deny=5: bloquear tras 5 intentos fallidos
# unlock_time=900: desbloquear automáticamente después de 15 minutos
# audit: registrar en syslog

# Gestión manual de cuentas bloqueadas:
faillock --user juan                 # ver intentos fallidos
faillock --user juan --reset         # desbloquear manualmente

# pam_nologin.so — bloquear login si existe /etc/nologin
auth    requisite   pam_nologin.so
# Si /etc/nologin existe, solo root puede entrar. Útil para mantenimiento.
touch /etc/nologin    # bloquear logins no-root
rm /etc/nologin       # restaurar acceso

# pam_limits.so — aplicar ulimits de /etc/security/limits.conf
session required    pam_limits.so

# pam_time.so — restricciones de horario
account required    pam_time.so
# Configurar en /etc/security/time.conf:
# login;*;!svcaccount;Al0000-2359   (svcaccount solo puede entrar entre semana)

# pam_wheel.so — requerir membresía en grupo wheel para su
auth    required    pam_wheel.so use_uid
# Solo usuarios en el grupo wheel pueden ejecutar su

# pam_env.so — establecer variables de entorno
session required    pam_env.so readenv=1 envfile=/etc/environment
\`\`\`

### 📖 Stack PAM real para SSH en producción

\`\`\`text
# /etc/pam.d/sshd — stack endurecido para SSH en producción

# Deshabilitar root login a nivel PAM (complementario a sshd_config)
auth    requisite   pam_succeed_if.so uid >= 1000 quiet_success

# Bloqueo por intentos fallidos — ANTES de verificar contraseña
auth    required    pam_faillock.so preauth silent audit deny=5 unlock_time=900

# Verificar contraseña local
auth    [success=1 default=ignore]  pam_unix.so nullok
# Si falla pam_unix, registrar el fallo en faillock
auth    [default=die]               pam_faillock.so authfail audit

# Verificar cuenta no esté bloqueada, expirada, etc.
account required    pam_faillock.so
account required    pam_unix.so
account required    pam_nologin.so

# Gestión de contraseñas (para passwd over SSH)
password required   pam_unix.so obscure sha512 rounds=65536

# Sesión
session required    pam_limits.so
session required    pam_unix.so
session optional    pam_lastlog.so
\`\`\`

### 📖 /etc/security/limits.conf y pam_limits

\`\`\`text
# /etc/security/limits.conf
# dominio   tipo    item        valor
# ─────────────────────────────────────────────
*           soft    nofile      1024        # límite suave de archivos abiertos
*           hard    nofile      65536       # límite duro de archivos abiertos
@developers soft    nproc       200         # procesos máximos para el grupo developers
postgres    soft    nofile      65536
postgres    hard    nofile      65536
postgres    soft    nproc       4096
svcaccount  hard    maxlogins   1           # solo una sesión simultánea
\`\`\`

\`\`\`bash
# Verificar límites actuales de la sesión
ulimit -a

# Verificar límites de un proceso específico
cat /proc/\$(pgrep postgres | head -1)/limits
\`\`\`

### 📖 Depuración de PAM

\`\`\`bash
# Agregar debug a un módulo específico (solo para testing, nunca en producción)
auth    required    pam_unix.so debug

# Ver logs de PAM
journalctl -u sshd -f           # logs de sshd en tiempo real
grep -i pam /var/log/auth.log   # en sistemas con syslog
journalctl -t sshd | grep pam   # filtrar por sshd

# Probar una configuración PAM sin modificar la real
# Usar pamtester (paquete opcional)
pamtester sshd usuario authenticate

# Verificar que un módulo existe y es legible
ls -la /lib/security/pam_unix.so
ls -la /lib/x86_64-linux-gnu/security/  # ubicación en sistemas de 64 bits
\`\`\`

### 📋 Lo que debes recordar

* Los cuatro tipos de módulos PAM (auth, account, password, session) tienen responsabilidades distintas y se ejecutan en fases separadas.
* \`requisite\` es más estricto que \`required\`: falla inmediatamente sin ejecutar el resto del stack, lo que es más seguro para verificaciones críticas como \`pam_nologin\`.
* \`pam_faillock\` debe aparecer en el stack en dos posiciones: \`preauth\` (antes de la verificación) y \`authfail\` (después del fallo) para funcionar correctamente.
* Los cambios en /etc/pam.d/ tienen efecto inmediato sin reiniciar servicios — un error de configuración puede bloquear todos los logins del sistema.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia práctica entre \`required\` y \`requisite\` cuando pam_nologin.so falla? ¿Hay una diferencia de seguridad?
2. Un sistema tiene pam_faillock configurado con \`deny=3\`. Un atacante intenta 3 contraseñas incorrectas pero la cuenta se bloquea. ¿Cómo desbloqueas la cuenta sin cambiar la contraseña del usuario?
3. Explica por qué es peligroso probar cambios en /etc/pam.d/sshd mientras estás conectado por SSH, y cuál es el procedimiento seguro.

---

1. Con \`required\`, pam_nologin falla pero el stack continúa ejecutando los módulos siguientes — el usuario recibirá el mensaje de error solo al final. Con \`requisite\`, el stack se detiene inmediatamente y el usuario recibe el error de nologin sin ejecutar otros módulos. La diferencia de seguridad es menor (el resultado final es el mismo), pero \`requisite\` es más eficiente y no revela si la contraseña era correcta, lo que reduce la información disponible para atacantes.
2. \`faillock --user nombre_usuario --reset\`. Este comando limpia el contador de intentos fallidos sin afectar la contraseña. En sistemas con \`pam_tally2\` (más antiguo): \`pam_tally2 --user nombre_usuario --reset\`.
3. Si cometes un error en /etc/pam.d/sshd que rompe la autenticación, la sesión SSH actual seguirá activa (PAM solo valida en el momento del login), pero no podrás abrir nuevas sesiones. El procedimiento seguro: (1) abre una segunda sesión SSH como prueba antes de cerrar la actual, (2) trabaja con una sesión de respaldo por consola (iDRAC, KVM, consola en nube) disponible, (3) en entornos críticos, edita en staging primero.
`

export default content
