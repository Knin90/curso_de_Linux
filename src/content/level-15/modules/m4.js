const content = `
## Módulo 4 — chage y políticas de contraseñas: caducidad y envejecimiento

### 🎯 Objetivos de aprendizaje

* Leer y modificar la política de caducidad de contraseñas con \`chage\`.
* Entender cada campo de /etc/shadow relacionado con aging y cómo interactúan.
* Configurar /etc/login.defs para establecer políticas globales de contraseñas.
* Implementar forzado de cambio de contraseña en el primer login de nuevas cuentas.

### ❓ El problema real

El auditor de seguridad detecta que hay cuentas activas con contraseñas que no se han cambiado en 3 años, cuentas de ex-empleados que siguen activas, y contraseñas de cuentas de servicio que nunca expiran. La empresa necesita implementar una política: contraseñas de usuario expiran cada 90 días con 14 días de advertencia, las cuentas de servicio nunca expiran pero sí deben documentarse, y cualquier cuenta inactiva más de 30 días se bloquea automáticamente.

### 📖 chage: gestión de caducidad

\`chage\` (change age) modifica y muestra los campos de aging en /etc/shadow sin necesidad de editar el archivo directamente.

\`\`\`bash
# Ver la política actual de un usuario
chage -l maria
# Last password change                               : Jan 15, 2024
# Password expires                                   : Apr 15, 2024
# Password inactive                                  : May 15, 2024
# Account expires                                    : never
# Minimum number of days between password change     : 1
# Maximum number of days between password change     : 90
# Number of days of warning before password expires  : 14

# Ver en formato de shadow (días desde epoch)
chage -l maria  # formato legible
\`\`\`

### 📖 Opciones de chage: referencia completa

\`\`\`bash
# -M: máximo de días antes de requerir cambio
chage -M 90 maria        # contraseña expira cada 90 días

# -m: mínimo de días entre cambios (evitar que usuarios reutilicen inmediatamente)
chage -m 1 maria         # debe esperar al menos 1 día para volver a cambiar

# -W: días de advertencia antes de expirar
chage -W 14 maria        # avisar 14 días antes de que expire

# -I: días de gracia después de expirar (inactive period)
# Si la contraseña expiró hace más de N días, la cuenta se bloquea
chage -I 30 maria        # 30 días de gracia tras expirar

# -E: fecha de expiración absoluta de la cuenta (no de la contraseña)
chage -E 2024-12-31 maria         # cuenta expira el 31 dic 2024
chage -E -1 maria                 # cuenta nunca expira (quitar expiración)
chage -E "\$(date -d '+180 days' +%Y-%m-%d)" contratista   # 6 meses desde hoy

# -d: cambiar la fecha del último cambio de contraseña
chage -d 0 maria         # forzar cambio en el próximo login (día 0 = epoch)
chage -d "" maria        # equivalente en algunos sistemas

# Modo interactivo
chage maria              # pregunta cada campo en orden
\`\`\`

### 📖 Forzar cambio en el primer login

\`\`\`bash
# Método 1: chage -d 0 (establece lastchange a epoch, la contraseña está "vencida desde siempre")
useradd -m -s /bin/bash nuevo_empleado
passwd nuevo_empleado         # establecer contraseña inicial
chage -d 0 nuevo_empleado     # forzar cambio en el próximo login

# Verificar
chage -l nuevo_empleado | grep "Password expires"
# Password expires: password must be changed

# Método 2: passwd -e (expire, equivalente a chage -d 0)
passwd -e nuevo_empleado

# Qué ocurre en el login:
# 1. El usuario introduce su contraseña temporal → autenticación OK
# 2. PAM detecta que la contraseña está expirada
# 3. El sistema obliga al usuario a introducir una nueva contraseña antes de continuar
# 4. Solo después del cambio exitoso se abre la sesión

# Para cuentas de servicio: usar contraseñas que NUNCA expiren
chage -M -1 svcpostgres   # -1 = nunca expira (equivalente a 99999)
chage -E -1 svcpostgres   # cuenta sin expiración
chage -I -1 svcpostgres   # sin período de inactividad
\`\`\`

### 📖 /etc/login.defs: política global de contraseñas

\`/etc/login.defs\` establece los valores por defecto que se aplican cuando se crea un usuario nuevo. No afecta usuarios ya existentes.

\`\`\`text
# /etc/login.defs — valores relevantes para password aging

# Días máximos de validez de contraseña para usuarios nuevos
PASS_MAX_DAYS   90

# Días mínimos entre cambios
PASS_MIN_DAYS   1

# Días de advertencia antes de expirar
PASS_WARN_AGE   14

# Longitud mínima de contraseña (también controlado por PAM en sistemas modernos)
PASS_MIN_LEN    12

# Algoritmo de hash para contraseñas nuevas
ENCRYPT_METHOD  SHA512
SHA_CRYPT_MIN_ROUNDS 65536
SHA_CRYPT_MAX_ROUNDS 65536

# Rango de UIDs para usuarios normales
UID_MIN   1000
UID_MAX   60000

# Rango de UIDs para cuentas de sistema
SYS_UID_MIN   201
SYS_UID_MAX   999

# Crear directorio home automáticamente
CREATE_HOME     yes

# Umask por defecto para directorios home
UMASK   077

# Días hasta que una cuenta expirada se bloquea automáticamente
INACTIVE        30
\`\`\`

\`\`\`bash
# Aplicar política global a todos los usuarios existentes con un script
#!/usr/bin/env bash
# Aplicar política de contraseñas a todos los usuarios reales (UID >= 1000)
while IFS=: read -r user _ uid _; do
    if [ "\$uid" -ge 1000 ] && [ "\$uid" -ne 65534 ]; then  # excluir nobody
        chage -M 90 -m 1 -W 14 -I 30 "\$user"
        echo "Política aplicada a: \$user"
    fi
done < /etc/passwd
\`\`\`

### 📖 Expiración de cuentas vs expiración de contraseñas

Es crucial distinguir estos dos conceptos distintos:

\`\`\`text
CONCEPTO                CAMPO SHADOW     CHAGE FLAG   DESCRIPCIÓN
────────────────────────────────────────────────────────────────────────────
Expiración contraseña   campo 5 (max)   -M           Cada N días el usuario DEBE cambiar su contraseña
Inactividad             campo 7          -I           Si la contraseña expiró hace N días, la cuenta se BLOQUEA
Expiración cuenta       campo 8          -E           Fecha absoluta — la cuenta deja de funcionar

Expiración contraseña: el usuario puede seguir trabajando, solo debe cambiar la contraseña
Inactividad + expiración: si no cambia la contraseña en el período de gracia, la cuenta se bloquea
Expiración cuenta: la cuenta deja de funcionar completamente en esa fecha, sin importar la contraseña
\`\`\`

\`\`\`bash
# Ejemplo práctico — contratista con acceso por 6 meses:
useradd -m -s /bin/bash contratista01
passwd contratista01
chage -M 90 -W 14 -I 14 \
      -E "\$(date -d '+180 days' +%Y-%m-%d)" \
      contratista01

# La cuenta:
# - Requiere cambio de contraseña cada 90 días
# - Avisa 14 días antes
# - Se bloquea si no cambia en 14 días de gracia
# - Se elimina el acceso automáticamente en 6 meses (independientemente de la contraseña)
\`\`\`

### 📖 Auditoría de políticas de contraseñas

\`\`\`bash
# Ver el estado de todos los usuarios de un vistazo
for user in \$(awk -F: '\$3 >= 1000 && \$3 != 65534 {print \$1}' /etc/passwd); do
    echo "=== \$user ==="
    chage -l "\$user" | grep -E "expires|inactive"
done

# Encontrar usuarios cuya contraseña ya expiró
#!/usr/bin/env bash
TODAY=\$(date +%s)
while IFS=: read -r user _ _ lastchg _ max _; do
    if [ -n "\$max" ] && [ "\$max" -gt 0 ] && [ -n "\$lastchg" ] && [ "\$lastchg" -gt 0 ]; then
        expire_epoch=\$(( (lastchg + max) * 86400 ))
        if [ "\$TODAY" -gt "\$expire_epoch" ]; then
            echo "CONTRASEÑA EXPIRADA: \$user (expiró hace \$(( (TODAY - expire_epoch) / 86400 )) días)"
        fi
    fi
done < /etc/shadow

# Encontrar cuentas sin expiración configurada (riesgo de cumplimiento)
awk -F: '\$5 == "" || \$5 == 99999 {print "Sin expiración: " \$1}' /etc/shadow

# Cuentas con contraseñas que nunca cambiaron (lastchg == 0 o muy antiguo)
awk -F: '\$3 >= 1000 && \$3 != 65534 {print \$1}' /etc/passwd | while read user; do
    lastchg=\$(chage -l "\$user" | awk -F: '/Last password change/ {print \$2}')
    echo "\$user: último cambio = \$lastchg"
done
\`\`\`

### 📖 Desbloqueo de cuentas bloqueadas por inactividad

\`\`\`bash
# Una cuenta se bloquea por inactividad cuando:
# campo inactive (días) + campo max (días desde lastchg) < días actuales

# Verificar por qué una cuenta está bloqueada
chage -l carlos
# Password inactive: Feb 28, 2024  ← si hoy es después de esta fecha, cuenta bloqueada

# Desbloquear y restablecer política
passwd -u carlos              # desbloquear si fue bloqueada con passwd -l
chage -d "\$(date +%Y-%m-%d)" carlos   # restablecer fecha de último cambio a hoy
chage -M 90 -W 14 -I 30 carlos        # reaplicar política

# Forzar que el usuario cambie la contraseña al reactivar la cuenta
chage -d 0 carlos
\`\`\`

### 📋 Lo que debes recordar

* \`chage -d 0 usuario\` fuerza el cambio de contraseña en el próximo login — es el método correcto para nuevas cuentas y reactivaciones.
* Los valores en /etc/login.defs solo se aplican a usuarios creados después del cambio — los existentes mantienen sus valores actuales y necesitan actualización con un script.
* La expiración de cuenta (\`-E\`) y la expiración de contraseña (\`-M\`) son mecanismos distintos: la primera bloquea la cuenta absolutamente, la segunda solo requiere cambio de contraseña.
* \`chage -M -1\` deshabilita la expiración de contraseña — apropiado para cuentas de servicio que usan llave SSH, pero debe documentarse como excepción de política.

### 🧪 Autoevaluación

1. Un usuario tiene \`PASS_MAX_DAYS: 90\` y \`Password inactive: 30\`. La contraseña expiró hace 35 días. ¿Puede el usuario hacer login? ¿Qué mensaje recibe?
2. Creas una cuenta de contratista y ejecutas \`chage -E 2024-06-30\`. ¿Qué ocurre exactamente el 1 de julio? ¿Puede el usuario cambiar su contraseña para recuperar acceso?
3. ¿Cuál es la diferencia entre \`passwd -l usuario\` y que una contraseña expire por inactividad? ¿Cuál bloquea también el acceso por llave SSH?

---

1. No puede hacer login. Con 30 días de inactividad, la cuenta se bloqueó automáticamente 30 días después de que expiró la contraseña. El usuario ve un mensaje como "Your account has expired; please contact your system administrator". No se le ofrece la posibilidad de cambiar la contraseña.
2. El 1 de julio, el sistema rechaza el login con un mensaje de cuenta expirada. No importa si la contraseña es válida o no. El usuario NO puede cambiar la contraseña para recuperar acceso — la expiración de cuenta es absoluta y solo un administrador puede reactivarla con \`chage -E -1 usuario\` o \`chage -E nueva_fecha\`.
3. \`passwd -l\` añade \`!\` al inicio del hash en /etc/shadow — esto bloquea autenticación con contraseña pero NO bloquea acceso por llave SSH (sshd puede estar configurado para no usar PAM o para permitir claves aunque la contraseña esté bloqueada). La expiración por inactividad es detectada por PAM (pam_unix) y bloquea todos los métodos de login que pasan por PAM. Para bloquear también SSH con llaves, necesitas \`usermod -s /usr/sbin/nologin usuario\` o usar \`account required pam_unix.so\` en el stack PAM de sshd.
`

export default content
