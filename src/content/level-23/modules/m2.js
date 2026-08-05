const content = `
## Módulo 2 — Reglas de auditoría: auditctl y /etc/audit/rules.d/

### 🎯 Objetivos de aprendizaje

* Escribir reglas de auditoría para archivos, directorios y syscalls.
* Distinguir entre reglas de control, de sistema de archivos (watches) y de syscall.
* Hacer reglas permanentes con \`/etc/audit/rules.d/\`.
* Priorizar reglas y entender el orden de evaluación.

### ❓ El problema real

Un administrador nota que la contraseña de root fue cambiada, pero no sabe quién lo hizo ni desde dónde. Con auditd sin reglas configuradas, solo hay registros de login. Una sola regla bien colocada en \`/etc/passwd\` o \`/etc/shadow\` habría capturado el evento completo: usuario, PID, terminal y timestamp.

### 📖 Tipos de reglas de auditoría

\`\`\`text
TIPO            SINTAXIS            USO
──────────────────────────────────────────────────────────────
Control         auditctl -s/-b/-e   configurar el subsistema
Watch (filesystem) -w ruta -p perms monitorear archivos/dirs
Syscall         -a action,list -S   monitorear llamadas al sistema
\`\`\`

### 📖 Reglas de control del sistema

\`\`\`bash
# Ver estado actual del subsistema
sudo auditctl -s

# Establecer el tamaño del backlog (eventos en cola del kernel)
sudo auditctl -b 8192

# Habilitar/deshabilitar auditoría
sudo auditctl -e 1    # habilitar
sudo auditctl -e 0    # deshabilitar (temporal, para mantenimiento)
sudo auditctl -e 2    # bloquear (no se pueden cambiar reglas sin reiniciar)

# Ver reglas activas
sudo auditctl -l
\`\`\`

### 📖 Reglas de filesystem (watches)

\`\`\`bash
# Sintaxis: auditctl -w <ruta> -p <permisos> -k <clave>
# Permisos: r=read, w=write, x=execute, a=attribute change

# Monitorear escrituras en /etc/passwd
sudo auditctl -w /etc/passwd -p wa -k identity

# Monitorear /etc/sudoers (lectura y escritura)
sudo auditctl -w /etc/sudoers -p rwa -k sudoers-changes

# Monitorear directorio completo (recursivo para el dir, no subdirs)
sudo auditctl -w /etc/ssh/ -p wa -k sshd-config

# Monitorear ejecuciones en /bin
sudo auditctl -w /bin/ -p x -k binaries-exec

# Ver todas las reglas activas
sudo auditctl -l
\`\`\`

\`\`\`text
# Salida de auditctl -l
-w /etc/passwd -p wa -k identity
-w /etc/sudoers -p rwa -k sudoers-changes
-w /etc/ssh/ -p wa -k sshd-config
-w /bin/ -p x -k binaries-exec
\`\`\`

### 📖 Reglas de syscall

\`\`\`bash
# Sintaxis: auditctl -a <action>,<list> -S <syscall> [-F <campo>=<valor>] -k <clave>
# action: always (registrar siempre) | never (nunca registrar)
# list: task, exit, user, exclude

# Monitorear execve (ejecución de comandos) por usuarios no-root
sudo auditctl -a always,exit -F arch=b64 -S execve -F auid>=1000 -F auid!=4294967295 -k exec-commands

# Monitorear ejecuciones de comandos privilegiados
sudo auditctl -a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -k priv-escalation

# Monitorear cambios de identificador (su, sudo internamente)
sudo auditctl -a always,exit -F arch=b64 -S setuid -S setgid -k id-change

# Monitorear apertura de archivos por usuario específico
sudo auditctl -a always,exit -F arch=b64 -S open -F auid=1001 -k user-files

# arch=b64 para sistemas 64-bit; añadir también b32 para cubrir binarios 32-bit
sudo auditctl -a always,exit -F arch=b32 -S execve -F auid>=1000 -F auid!=4294967295 -k exec-commands
\`\`\`

### 📖 Hacer reglas permanentes: /etc/audit/rules.d/

Las reglas de \`auditctl\` se pierden al reiniciar. Para persistirlas:

\`\`\`bash
# Estructura recomendada de archivos en /etc/audit/rules.d/
ls /etc/audit/rules.d/
# 00-base.rules     — reglas de control del sistema
# 10-identity.rules — archivos de identidad (/etc/passwd, etc.)
# 20-privileged.rules — comandos con setuid/setgid
# 30-filesystem.rules — monitoreo de filesystem crítico
# 99-finalize.rules  — bloquear configuración al final

# Verificar y compilar las reglas
sudo augenrules --check   # mostrar si hay cambios pendientes
sudo augenrules --load    # compilar y cargar todas las reglas
\`\`\`

\`\`\`bash
# Contenido de /etc/audit/rules.d/10-identity.rules
# Monitoreo de archivos de identidad y autenticación

-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/security/opasswd -p wa -k identity

-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers
\`\`\`

\`\`\`bash
# Contenido de /etc/audit/rules.d/99-finalize.rules
# Bloquear cambios de reglas (requiere reinicio para modificar)
-e 2
\`\`\`

### 📖 Eliminar reglas y depuración

\`\`\`bash
# Eliminar una regla específica (misma sintaxis pero con -d en lugar de -a/-w)
sudo auditctl -d -w /etc/passwd -p wa -k identity

# Eliminar TODAS las reglas activas
sudo auditctl -D

# Recargar reglas desde archivos
sudo augenrules --load

# Ver el archivo compilado final
cat /etc/audit/audit.rules
\`\`\`

### 📋 Lo que debes recordar

* Las reglas de \`auditctl\` son temporales; las reglas en \`/etc/audit/rules.d/\` son permanentes tras \`augenrules --load\`.
* Siempre especificar \`arch=b64\` y \`arch=b32\` para syscalls en sistemas de 64 bits.
* La clave (\`-k\`) es crítica: permite buscar y agrupar eventos relacionados con \`ausearch -k\`.
* El archivo \`99-finalize.rules\` con \`-e 2\` bloquea cambios en producción — los atacantes no pueden desactivar la auditoría sin reiniciar.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`-w /etc/ssh/ -p wa\` y \`-w /etc/ssh/sshd_config -p wa\`?
2. ¿Por qué se usan dos reglas (\`arch=b64\` y \`arch=b32\`) para la misma syscall?
3. ¿Qué consecuencia tiene \`-e 2\` en el archivo \`99-finalize.rules\`?

---

1. La primera monitorea el directorio completo (cualquier archivo que cambie dentro de \`/etc/ssh/\`). La segunda monitorea solo ese archivo específico. Para seguridad, es mejor monitorear el directorio para capturar también archivos nuevos que se puedan crear ahí.
2. En sistemas de 64 bits, los binarios de 32 bits usan una tabla de syscalls diferente con números distintos. Sin la regla \`arch=b32\`, un atacante con un binario de 32 bits puede evadir las reglas de syscall. Ambas reglas son necesarias para cobertura completa.
3. Establece el subsistema de auditoría en modo inmutable: ningún proceso (ni root) puede añadir, modificar o eliminar reglas hasta el próximo reinicio. Es una medida de seguridad para evitar que un atacante con acceso root desactive la auditoría durante un ataque.
`

export default content
