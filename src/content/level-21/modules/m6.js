const content = `
## Módulo 6 — PAM y políticas de autenticación robustas

### 🎯 Objetivos de aprendizaje
* Comprender la arquitectura de PAM y cómo los módulos se encadenan
* Configurar bloqueo de cuentas tras intentos fallidos con pam_faillock
* Establecer políticas de complejidad de contraseñas con pam_pwquality
* Prevenir la reutilización de contraseñas con pam_pwhistory
* Restringir acceso por horario con pam_time

---

### ❓ El problema real

Un servidor tiene acceso SSH correctamente protegido con claves. Pero el servidor también tiene servicios locales: usuarios que hacen \`su\`, scripts de administración con autenticación local, y una cuenta de servicio con contraseña débil que nunca se cambia. Un atacante con acceso local hace un ataque de diccionario contra \`su\` — sin límite de intentos. En cinco minutos, con una herramienta como hydra en modo local, adivina la contraseña. PAM es la capa que protege todos los mecanismos de autenticación del sistema, no solo SSH.

---

### 📖 Arquitectura de PAM

PAM (Pluggable Authentication Modules) es un framework que abstrae la autenticación del sistema. Cada servicio que necesita autenticación (login, ssh, su, sudo, passwd) tiene su propio archivo de configuración en \`/etc/pam.d/\`.

\`\`\`bash
# Ver configuración PAM de un servicio
cat /etc/pam.d/sshd
cat /etc/pam.d/login
cat /etc/pam.d/sudo
cat /etc/pam.d/common-auth    # Ubuntu/Debian: configuración compartida
\`\`\`

**Estructura de una línea PAM:**

\`\`\`
tipo_módulo  control  módulo.so  [argumentos]
\`\`\`

**Tipos de módulo:**
- \`auth\`: verifica identidad (contraseña, clave)
- \`account\`: verifica si la cuenta puede usarse (expiración, horario)
- \`password\`: gestiona el cambio de contraseña
- \`session\`: configura el entorno después del login

**Controles:**
- \`required\`: debe pasar; el fallo se reporta al final (sigue procesando)
- \`requisite\`: debe pasar; fallo detiene inmediatamente
- \`sufficient\`: si pasa, no necesita más módulos de ese tipo
- \`optional\`: el resultado no afecta el éxito/fallo general

\`\`\`bash
# Ejemplo de /etc/pam.d/common-auth (Ubuntu)
auth    [success=2 default=ignore]  pam_unix.so nullok
auth    [success=1 default=ignore]  pam_sss.so  use_first_pass
auth    requisite                   pam_deny.so
auth    required                    pam_permit.so
\`\`\`

---

### 📖 pam_faillock: bloqueo de cuenta tras intentos fallidos

pam_faillock registra los intentos de autenticación fallidos y bloquea la cuenta cuando se supera el umbral.

**En Ubuntu/Debian 22.04+ y Fedora/RHEL:**

\`\`\`bash
# Archivo de configuración principal
/etc/security/faillock.conf
\`\`\`

\`\`\`ini
# /etc/security/faillock.conf
# Número de fallos antes de bloquear
deny = 5

# Tiempo de observación (segundos): si N fallos ocurren en este tiempo
fail_interval = 900

# Tiempo de bloqueo (segundos): cuánto dura el bloqueo
# 900 = 15 minutos
unlock_time = 900

# También bloquear al usuario root
# (comentado por defecto para evitar lockout accidental)
# even_deny_root

# Registrar en syslog
audit

# Tiempo silencioso: no revelar si la cuenta está bloqueada
# (evita enumeración de cuentas)
silent
\`\`\`

**Activar en /etc/pam.d/common-auth (Ubuntu/Debian):**

\`\`\`bash
# Editar /etc/pam.d/common-auth
# Añadir ANTES de la línea pam_unix.so:

auth    required                    pam_faillock.so preauth silent audit
auth    [success=1 default=ignore]  pam_unix.so nullok
auth    [default=die]               pam_faillock.so authfail audit
auth    sufficient                  pam_faillock.so authsucc audit
\`\`\`

**En RHEL/Rocky/AlmaLinux 8+:**

\`\`\`bash
# El método recomendado en RHEL es authselect
authselect select sssd with-faillock --force
# O sin sssd:
authselect select minimal with-faillock --force

# Verificar que faillock está activo
authselect current
\`\`\`

**Gestionar cuentas bloqueadas:**

\`\`\`bash
# Ver estado de bloqueo de un usuario
faillock --user admin

# Salida esperada cuando está bloqueado:
# admin:
# When                Type  Source                                           Valid
# 2024-03-15 10:23:01 RHOST 192.168.1.50                                        V
# 2024-03-15 10:23:04 RHOST 192.168.1.50                                        V
# 2024-03-15 10:23:07 RHOST 192.168.1.50                                        V

# Desbloquear manualmente un usuario
faillock --user admin --reset

# Ver estado de todos los usuarios bloqueados
faillock
\`\`\`

---

### 📖 pam_pwquality: políticas de complejidad de contraseñas

pam_pwquality verifica que las contraseñas nuevas cumplan requisitos de complejidad.

\`\`\`bash
# Archivo de configuración
/etc/security/pwquality.conf
\`\`\`

\`\`\`ini
# /etc/security/pwquality.conf

# Longitud mínima
minlen = 14

# Créditos de complejidad (valores negativos = requeridos, no créditos)
# Valor negativo: cuántos caracteres de ese tipo son REQUERIDOS
# Valor positivo: cuántos caracteres de ese tipo reducen el requisito de minlen

# Al menos 1 mayúscula requerida
ucredit = -1

# Al menos 1 minúscula requerida
lcredit = -1

# Al menos 1 dígito requerido
dcredit = -1

# Al menos 1 carácter especial requerido
ocredit = -1

# Número máximo de caracteres del mismo tipo consecutivos
maxrepeat = 3

# Número máximo de caracteres de la misma clase consecutivos
maxclassrepeat = 4

# Verificar si la contraseña está en diccionario cracklib
dictcheck = 1

# Número mínimo de caracteres que deben diferir de la contraseña anterior
difok = 8

# Verificar contraseñas del usuario (nombre de usuario en la contraseña)
usercheck = 1

# Número de intentos antes de que passwd falle
retry = 3
\`\`\`

**Activar en /etc/pam.d/common-password:**

\`\`\`ini
# La línea de pam_pwquality debe estar ANTES de pam_unix en common-password
password    requisite                   pam_pwquality.so retry=3
password    [success=1 default=ignore]  pam_unix.so obscure use_authtok try_first_pass sha512
\`\`\`

**Probar la política:**

\`\`\`bash
# Intentar cambiar a una contraseña débil
passwd admin
# Nueva contraseña: password
# BAD PASSWORD: The password is too short
# BAD PASSWORD: The password fails the dictionary check

# Intentar con contraseña válida
# Nueva contraseña: Tr0ub4dor&3_secure
# Contraseña cambiada.
\`\`\`

---

### 📖 pam_pwhistory: prevenir reutilización de contraseñas

\`\`\`ini
# Añadir en /etc/pam.d/common-password ANTES de pam_unix
password    required    pam_pwhistory.so remember=12 use_authtok

# remember=12 → no puede reutilizar ninguna de las últimas 12 contraseñas
\`\`\`

\`\`\`bash
# El historial se guarda en:
/etc/security/opasswd

# Ver el historial (solo root)
cat /etc/security/opasswd
# admin:1001:5:\$6\$salt\$hash1,\$6\$salt\$hash2,...

# Configuración combinada correcta en common-password:
password    requisite                   pam_pwquality.so retry=3
password    required                    pam_pwhistory.so remember=12 use_authtok
password    [success=1 default=ignore]  pam_unix.so obscure use_authtok try_first_pass sha512
password    requisite                   pam_deny.so
password    required                    pam_permit.so
\`\`\`

---

### 📖 Expiración de contraseñas con chage

\`\`\`bash
# Ver política de expiración de un usuario
chage -l admin
# Last password change                          : Mar 01, 2024
# Password expires                              : Jun 01, 2024
# Password inactive                             : never
# Account expires                               : never
# Minimum number of days between password change: 1
# Maximum number of days between password change: 90
# Number of days of warning before password expires: 14

# Configurar política de expiración
chage -M 90 admin   # contraseña expira en 90 días
chage -m 1 admin    # mínimo 1 día entre cambios (evitar saltar historial)
chage -W 14 admin   # advertir 14 días antes de expiración
chage -I 30 admin   # deshabilitar cuenta 30 días después de expiración

# Configurar expiración por defecto para nuevos usuarios
# En /etc/login.defs:
# PASS_MAX_DAYS   90
# PASS_MIN_DAYS   1
# PASS_WARN_AGE   14

# Forzar cambio de contraseña en próximo login
chage -d 0 admin

# Verificar todas las cuentas con contraseña que nunca expira
awk -F: '\$3 >= 1000 {print \$1}' /etc/passwd | while read user; do
    max=\$(chage -l "\$user" 2>/dev/null | grep "Maximum" | awk '{print \$NF}')
    echo "\$user: max_days=\$max"
done
\`\`\`

---

### 📖 pam_time: restricciones de horario

\`\`\`bash
# Archivo de configuración
/etc/security/time.conf
\`\`\`

\`\`\`ini
# /etc/security/time.conf
# Formato: servicios;ttys;usuarios;tiempos
# Tiempos: Al=todos los días, Wk=días laborables, Wd=fin de semana
# Formato de hora: HHmm-HHmm

# Permitir login solo en horario laboral para usuarios normales
# (no aplica a root)
login;*;!root;Al0800-1800

# Permitir su solo en horario extendido
su;*;admins;Al0700-2200

# Sintaxis completa de días:
# Mo Tu We Th Fr Sa Su
# Wk (lun-vie), Wd (sáb-dom), Al (todos)
\`\`\`

\`\`\`bash
# Activar en /etc/pam.d/login (o el servicio que corresponda)
account    required    pam_time.so
\`\`\`

---

### 📖 Verificar la configuración PAM

\`\`\`bash
# Ver la cadena completa de un servicio
cat /etc/pam.d/common-auth
cat /etc/pam.d/common-password
cat /etc/pam.d/common-account

# Probar autenticación (sin hacer login real)
# pam_tester no está disponible en todos los sistemas
# La mejor prueba es usar un usuario de test

# Verificar que pwquality funciona
passwd testuser
# Intentar contraseñas que deben fallar

# Verificar que faillock funciona
# Intentar N veces con contraseña incorrecta, luego verificar
faillock --user testuser

# Ver logs de PAM (Ubuntu)
journalctl -u systemd-logind -f
# O en /var/log/auth.log
tail -f /var/log/auth.log | grep -E "pam|authentication"
\`\`\`

**Archivo de configuración final consolidado:**

\`\`\`bash
# Verificar que common-auth, common-password y common-account
# tengan la configuración correcta después de todos los cambios

grep -n "pam_faillock\|pam_pwquality\|pam_pwhistory" \\
    /etc/pam.d/common-auth \\
    /etc/pam.d/common-password \\
    /etc/pam.d/common-account
\`\`\`

---

### 📋 Lo que debes recordar
* PAM protege todos los mecanismos de autenticación del sistema, no solo SSH
* pam_faillock bloquea cuentas tras N intentos fallidos; configurar en faillock.conf
* pam_pwquality verifica complejidad; valores negativos en ucredit/lcredit/dcredit/ocredit = requeridos
* pam_pwhistory previene reutilización; el historial se guarda en /etc/security/opasswd
* El orden de los módulos en los archivos de /etc/pam.d/ importa — un error puede dejar el sistema sin autenticación

---

### 🧪 Autoevaluación

1. Configuras pam_faillock con deny=5 y unlock_time=900. Un usuario legítimo se bloquea a sí mismo equivocándose 5 veces. ¿Cuánto tiempo espera para que se desbloquee automáticamente, y cómo puedes desbloquearlo inmediatamente?
2. En pam_pwquality, ¿cuál es la diferencia entre \`dcredit = 1\` y \`dcredit = -1\`?
3. Tienes common-password con pam_pwhistory después de pam_unix. ¿Qué problema tiene este orden?

---

1. Espera 900 segundos (15 minutos) para desbloquearse automáticamente. Desbloqueo inmediato: \`faillock --user nombreusuario --reset\`.
2. \`dcredit = 1\` significa que hasta 1 dígito "da crédito" (reduce el requisito de longitud mínima). \`dcredit = -1\` significa que al menos 1 dígito es obligatorio, sin importar la longitud total. Los valores negativos son requerimientos; los positivos son créditos que reducen minlen.
3. pam_pwhistory debe ir ANTES de pam_unix. Si pam_unix cambia la contraseña primero y luego pam_pwhistory la rechaza, la contraseña ya fue cambiada en /etc/shadow y el historial no se actualizó correctamente. El orden correcto: primero pwquality, luego pwhistory, luego unix.
`

export default content
