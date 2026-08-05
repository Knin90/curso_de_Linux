const content = `
## Módulo 6 — Auditoría de llamadas al sistema y escalada de privilegios

### 🎯 Objetivos de aprendizaje

* Auditar syscalls críticas: execve, open, connect, ptrace.
* Detectar intentos de escalada de privilegios con auditd.
* Monitorear uso de capacidades Linux (capabilities).
* Identificar técnicas de evasión y cómo contrarrestarlas.

### ❓ El problema real

Un proceso legítimo de un servidor web fue comprometido mediante una vulnerabilidad de inyección. El atacante ejecutó una shell reversa, exploró el sistema y eventualmente escaló a root usando una vulnerabilidad local. Sin auditoría de syscalls, todo esto ocurrió sin dejar rastro en los logs de aplicación. Con las reglas correctas, cada paso del atacante habría generado un evento.

### 📖 Syscalls críticas de seguridad

\`\`\`text
SYSCALL         NÚMERO (x86_64)   RELEVANCIA DE SEGURIDAD
──────────────────────────────────────────────────────────────────
execve          59                ejecutar cualquier programa
execveat        322               ejecutar desde descriptor de archivo
open/openat     2/257             abrir archivos
connect         42                conexiones de red salientes
bind            49                escuchar en puertos
ptrace          101               depuración/inyección de procesos
setuid/setgid   105/106           cambio de identidad
setreuid        113               cambio de UID real/efectivo
chmod/fchmod    90/91             cambio de permisos
chown/fchown    92/93             cambio de propietario
mount           165               montar sistemas de archivos
unshare         272               crear namespaces
init_module     175               cargar módulo del kernel
finit_module    313               cargar módulo del kernel (v2)
delete_module   176               descargar módulo del kernel
create_module   174               crear módulo del kernel
\`\`\`

### 📖 Reglas para detección de escalada de privilegios

\`\`\`bash
# Crear /etc/audit/rules.d/30-privilege-escalation.rules

# Ejecución de comandos por usuarios no privilegiados
-a always,exit -F arch=b64 -S execve -F auid>=1000 -F auid!=4294967295 -k user-exec
-a always,exit -F arch=b32 -S execve -F auid>=1000 -F auid!=4294967295 -k user-exec

# Ejecución con uid efectivo root (escalada exitosa)
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -k priv-exec
-a always,exit -F arch=b32 -S execve -F euid=0 -F auid>=1000 -k priv-exec

# Cambios de UID/GID (sudo, su, setuid binaries)
-a always,exit -F arch=b64 -S setuid -S setgid -S setreuid -S setregid -k id-change
-a always,exit -F arch=b32 -S setuid -S setgid -S setreuid -S setregid -k id-change

# Uso de ptrace (inyección en procesos — técnica de escalada)
-a always,exit -F arch=b64 -S ptrace -F a0!=0 -k ptrace
-a always,exit -F arch=b32 -S ptrace -F a0!=0 -k ptrace

# Carga de módulos del kernel (rootkits)
-a always,exit -F arch=b64 -S init_module -S finit_module -S delete_module -k kernel-modules
-a always,exit -F arch=b32 -S init_module -S finit_module -S delete_module -k kernel-modules
\`\`\`

### 📖 Reglas para binarios con setuid/setgid

\`\`\`bash
# Encontrar todos los binarios con setuid en el sistema
sudo find / -xdev -perm -4000 -type f 2>/dev/null

# Crear reglas específicas para los más peligrosos
-w /usr/bin/sudo -p x -k sudo-exec
-w /usr/bin/su -p x -k su-exec
-w /usr/bin/newgrp -p x -k newgrp-exec
-w /usr/bin/chsh -p x -k chsh-exec
-w /usr/bin/passwd -p x -k passwd-exec
-w /usr/bin/pkexec -p x -k pkexec-exec
-w /usr/bin/gpasswd -p x -k gpasswd-exec

# Detectar uso de pkexec (CVE-2021-4034 Polkit)
-w /usr/bin/pkexec -p rwxa -k pkexec-polkit
\`\`\`

### 📖 Detectar técnicas de evasión comunes

\`\`\`bash
# Técnica 1: ejecución desde memoria (fileless malware)
# El proceso ejecuta código sin tocar disco — memfd_create + execve
-a always,exit -F arch=b64 -S memfd_create -k memfd
-a always,exit -F arch=b64 -S execveat -k exec-nofile

# Técnica 2: conexiones de red desde procesos inesperados
-a always,exit -F arch=b64 -S connect -F auid>=1000 -k network-connect
-a always,exit -F arch=b64 -S bind -k network-bind

# Técnica 3: uso de /proc para leer memoria de otros procesos
-w /proc/ -p r -k proc-access   # MUY ruidoso — solo para debugging
# Mejor: monitorear acceso a /proc/<pid>/mem y /proc/<pid>/maps
-a always,exit -F arch=b64 -S open -F path=/proc -F a1&01 -k proc-mem-access

# Técnica 4: creación de archivos en directorios temporales
-a always,exit -F arch=b64 -S open -S creat -F dir=/tmp -F success=1 -k tmp-files
-a always,exit -F arch=b64 -S open -S creat -F dir=/dev/shm -F success=1 -k shm-files
\`\`\`

### 📖 Investigar una escalada de privilegios

\`\`\`bash
# Paso 1: ver si hubo ejecuciones con euid=0 por usuarios normales
sudo ausearch -k priv-exec --start today -i

# Paso 2: ver la cadena de eventos del proceso sospechoso
sudo ausearch -p <PID_SOSPECHOSO> -i

# Paso 3: buscar uso de ptrace
sudo ausearch -k ptrace --start today -i

# Paso 4: ver cambios de UID
sudo ausearch -k id-change --start today -i | grep "uid=0"

# Paso 5: reconstruir la línea de tiempo completa de un usuario
sudo ausearch -ul alice --start "01/15/2024 08:00:00" -i | \
    grep -E "^(time|type=SYSCALL|exe=|key=)" | head -50
\`\`\`

### 📖 Tabla de interpretación de eventos execve

\`\`\`text
TIPO EVENTO     auid    uid     euid    INTERPRETACIÓN
──────────────────────────────────────────────────────────────────
execve normal   1000    1000    1000    usuario ejecuta comando
sudo exec       1000    1000    0       sudo elevó privilegios
su exec         1000    0       0       su a root exitoso
setuid binary   1000    1000    0       binario SUID ejecutado
cron job        -1      0       0       job de cron (auid=-1 = sin login)
servicio        -1      33      33      daemon www-data sin login interactivo
\`\`\`

### 📋 Lo que debes recordar

* \`euid=0\` con \`auid>=1000\` es la firma de escalada de privilegios exitosa.
* \`auid=4294967295\` (que es -1 en unsigned) significa proceso sin login interactivo — excluirlo en reglas evita ruido de daemons.
* \`ptrace\` legítimo solo lo usan debuggers (gdb, strace) — un proceso de red usándolo es señal de alarma.
* Las reglas de syscall son de alto volumen: ser selectivo con los filtros \`-F\` es esencial para no saturar el log.

### 🧪 Autoevaluación

1. ¿Qué indica un evento execve con \`auid=1000\` y \`euid=0\`?
2. ¿Por qué hay que incluir tanto \`arch=b64\` como \`arch=b32\` en las reglas de syscall?
3. ¿Cómo distinguirías en el log entre "usuario ejecutó sudo" y "binario SUID ejecutado por usuario"?

---

1. Indica que el usuario con UID de auditoría 1000 (el usuario que inició la sesión) ejecutó un comando que corrió con UID efectivo 0 (root). Esto es la firma de una escalada de privilegios exitosa — ya sea via \`sudo\`, un binario SUID, o una explotación.
2. Los sistemas de 64 bits pueden ejecutar tanto binarios de 64 bits (que usan la tabla de syscalls de 64 bits) como binarios de 32 bits (que usan una tabla diferente con números distintos). Sin la regla \`arch=b32\`, un atacante con un exploit compilado para 32 bits evade todas las reglas de syscall de 64 bits.
3. En el evento de \`sudo\`: el \`comm\` y \`exe\` mostrarán \`sudo\`, y habrá un evento \`USER_CMD\` asociado. En el caso de un binario SUID: el \`exe\` mostrará el binario específico (\`/usr/bin/passwd\`, etc.) sin ningún evento \`USER_CMD\` previo. La clave (\`key\`) también diferenciará: \`-k sudo-exec\` vs \`-k priv-exec\`.
`

export default content
