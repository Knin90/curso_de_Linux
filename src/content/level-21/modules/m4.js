const content = `
## Módulo 4 — Permisos de archivos: SUID, SGID, sticky bit y auditoría

### 🎯 Objetivos de aprendizaje
* Comprender qué hacen SUID, SGID y sticky bit en archivos y directorios
* Distinguir binarios SUID legítimos de sospechosos o peligrosos
* Encontrar archivos world-writable que representan riesgo de escalada
* Aplicar umask restrictiva para servicios y configurar archivos inmutables
* Construir un proceso de auditoría periódica de permisos especiales

---

### ❓ El problema real

Un atacante obtiene ejecución de código como el usuario www-data en un servidor comprometido. Explora el sistema y encuentra un binario custom con SUID root que el equipo de desarrollo instaló meses atrás para evitar reescribir una tarea de administración. Ese binario tiene una vulnerabilidad trivial de buffer overflow. En menos de un minuto, el atacante tiene una shell como root. El vector no fue la aplicación web — fue un permiso especial que nadie auditó.

---

### 📖 El bit SUID (Set User ID)

Cuando un archivo ejecutable tiene el bit SUID activado, se ejecuta con los privilegios del propietario del archivo, no del usuario que lo invoca.

\`\`\`bash
# Ejemplo: passwd tiene SUID de root
ls -la /usr/bin/passwd
# -rwsr-xr-x 1 root root 59976 Mar 22 10:45 /usr/bin/passwd
#    ^
#    's' en lugar de 'x' para el propietario = SUID activo

# Un usuario normal ejecuta passwd → el proceso corre como root
# Esto permite modificar /etc/shadow (solo escribible por root)
\`\`\`

El SUID es legítimo en binarios del sistema donde la elevación temporal es necesaria. Es peligroso en cualquier otro lugar.

**Encontrar todos los binarios SUID del sistema:**

\`\`\`bash
# Buscar archivos con SUID activo
find / -perm -4000 -type f 2>/dev/null

# Más información: propietario, grupo, fecha
find / -perm -4000 -type f -ls 2>/dev/null

# Solo en particiones locales (excluir /proc, /sys, NFS)
find / -xdev -perm -4000 -type f -ls 2>/dev/null
\`\`\`

**Binarios SUID legítimos en una instalación estándar:**

\`\`\`bash
# Lista típica en Ubuntu/Debian — estos son esperados
/usr/bin/passwd          # cambiar contraseña
/usr/bin/sudo            # elevar privilegios con autenticación
/usr/bin/su              # cambiar de usuario
/usr/bin/newgrp          # cambiar grupo activo
/usr/bin/gpasswd         # gestionar grupos
/usr/bin/chsh            # cambiar shell de login
/usr/bin/chfn            # cambiar info del usuario
/usr/bin/pkexec          # elevación PolicyKit (revisar CVE-2021-4034)
/usr/lib/openssh/ssh-keysign    # firma de host keys
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
\`\`\`

**Señales de alerta — binarios SUID que nunca deberían existir:**

\`\`\`bash
# Intérpretes con SUID = escalada de privilegios trivial
/usr/bin/python3  # con SUID → python3 -c 'import os; os.setuid(0); os.system("/bin/sh")'
/usr/bin/perl     # con SUID → perl -e 'exec "/bin/sh";'
/usr/bin/bash     # con SUID → bash -p (shell como root)
/usr/bin/find     # con SUID → find . -exec /bin/sh \;
/usr/bin/vim      # con SUID → :!/bin/sh
/usr/bin/nmap     # con SUID → nmap --interactive; !sh
/tmp/cualquier_cosa  # SUID en /tmp es ataque en progreso
\`\`\`

**Eliminar SUID de un binario:**

\`\`\`bash
# Remover bit SUID
chmod u-s /ruta/al/binario

# Verificar
ls -la /ruta/al/binario
# El 's' debe haberse convertido en 'x' (o desaparecer)

# Ejemplo: si python3 tuviera SUID (nunca debe tenerlo)
chmod u-s /usr/bin/python3
\`\`\`

---

### 📖 El bit SGID (Set Group ID)

En archivos ejecutables: el proceso corre con el GID del grupo propietario del archivo.
En directorios: los archivos creados dentro heredan el grupo del directorio (en lugar del grupo primario del usuario que los crea).

\`\`\`bash
# Encontrar archivos/directorios con SGID
find / -perm -2000 -type f -ls 2>/dev/null  # archivos SGID
find / -perm -2000 -type d -ls 2>/dev/null  # directorios SGID

# Ejemplo legítimo: wall, write, ssh-agent
ls -la /usr/bin/wall
# -rwxr-sr-x 1 root tty 18472 ...
#        ^
#        's' en la posición de grupo = SGID

# Directorios SGID son legítimos en directorios compartidos de equipo
# /srv/project-data (grupo=developers, SGID)
# Cualquier archivo creado aquí pertenece al grupo developers
\`\`\`

---

### 📖 El sticky bit

En directorios: solo el propietario del archivo (o root) puede eliminar archivos, aunque otros tengan permiso de escritura en el directorio.

\`\`\`bash
# El ejemplo clásico: /tmp
ls -la /
# drwxrwxrwt  ... tmp
#          ^
#          't' = sticky bit activo (todos pueden escribir, nadie puede borrar archivos ajenos)

# Sin sticky bit en /tmp:
# Usuario A crea /tmp/datos_importantes.txt
# Usuario B puede eliminarlo (tiene permisos de escritura en /tmp)
# Con sticky bit: solo el propietario o root puede eliminar el archivo

# Verificar sticky bit
find / -perm -1000 -type d 2>/dev/null

# Aplicar sticky bit a un directorio compartido
chmod +t /srv/shared-uploads
ls -la /srv/ | grep shared-uploads
# drwxrwxrwt ... shared-uploads
\`\`\`

---

### 📖 Archivos world-writable: riesgo de escalada

Un archivo world-writable (cualquier usuario puede escribirlo) es un vector de escalada si el propietario es root o si el archivo es ejecutado por un proceso privilegiado.

\`\`\`bash
# Encontrar archivos world-writable (excluir /proc y /sys)
find / -xdev -perm -0002 -type f 2>/dev/null

# Directorios world-writable sin sticky bit (peligroso)
find / -xdev -perm -0002 -type d ! -perm -1000 2>/dev/null

# Verificar /tmp y /var/tmp tienen sticky bit
stat /tmp | grep "Access:"
# Access: (1777/drwxrwxrwt)  → 1777 es correcto (world-write + sticky)

# Corregir si /tmp no tiene sticky bit
chmod 1777 /tmp
chmod 1777 /var/tmp
\`\`\`

**Archivos world-writable que siempre son sospechosos:**

\`\`\`bash
# Scripts cron world-writable → cualquier usuario puede modificar lo que ejecuta root
find /etc/cron* /var/spool/cron -perm -0002 2>/dev/null

# Archivos de configuración world-writable
find /etc -perm -0002 -type f 2>/dev/null

# Binarios world-writable
find /usr/bin /usr/sbin /bin /sbin -perm -0002 2>/dev/null
\`\`\`

---

### 📖 umask para servicios y daemons

umask define los permisos que se sustraen al crear nuevos archivos y directorios. Una umask restrictiva evita que los archivos creados por un servicio sean legibles por otros usuarios.

\`\`\`bash
# umask 022 (valor por defecto en muchos sistemas):
# archivos nuevos: 666 - 022 = 644 (rw-r--r--)
# directorios nuevos: 777 - 022 = 755 (rwxr-xr-x)

# umask 027 (recomendado para servicios):
# archivos nuevos: 666 - 027 = 640 (rw-r-----)
# directorios nuevos: 777 - 027 = 750 (rwxr-x---)

# umask 077 (máxima restricción):
# archivos nuevos: 666 - 077 = 600 (rw-------)
# directorios nuevos: 777 - 077 = 700 (rwx------)
\`\`\`

**Configurar umask para un servicio systemd:**

\`\`\`bash
# En el unit file del servicio:
# /etc/systemd/system/myapp.service
[Service]
User=myapp
Group=myapp
UMask=0027
# o alternativamente:
# UMask=0077

# Aplicar cambios
systemctl daemon-reload
systemctl restart myapp

# Verificar umask del proceso
cat /proc/\$(pgrep myapp)/status | grep -i umask
\`\`\`

---

### 📖 Archivos inmutables con chattr

Para archivos críticos de configuración que nunca deberían cambiar (excepto mantenimiento deliberado), el atributo inmutable previene modificaciones incluso por root.

\`\`\`bash
# Hacer un archivo inmutable
chattr +i /etc/passwd
chattr +i /etc/shadow
chattr +i /etc/sudoers

# Verificar atributos
lsattr /etc/passwd
# ----i---------e-- /etc/passwd
#     ^
#     i = immutable

# Intentar modificar un archivo inmutable (incluso como root) → falla
echo "test" >> /etc/passwd
# -bash: /etc/passwd: Operation not permitted

# Remover atributo inmutable (para actualizaciones legítimas)
chattr -i /etc/passwd
# Hacer el cambio necesario
# Volver a proteger
chattr +i /etc/passwd

# Hacer un directorio completo inmutable (recursivo)
chattr -R +i /etc/ssh/

# Ver todos los archivos inmutables en un directorio
lsattr /etc/ | grep "^....i"
\`\`\`

**Precaución**: los archivos inmutables interfieren con actualizaciones del sistema (apt upgrade). Proteger solo archivos que realmente no deben cambiar sin intervención manual.

---

### 📖 Script de auditoría de permisos

\`\`\`bash
#!/bin/bash
# /usr/local/bin/permissions-audit.sh

REPORT="/var/log/permissions-audit-\$(date +%Y%m%d).txt"

{
echo "=============================="
echo " AUDITORÍA DE PERMISOS ESPECIALES"
echo " \$(date)"
echo "=============================="

echo ""
echo "--- BINARIOS SUID ---"
find / -xdev -perm -4000 -type f -ls 2>/dev/null | sort -k11

echo ""
echo "--- BINARIOS SGID ---"
find / -xdev -perm -2000 -type f -ls 2>/dev/null | sort -k11

echo ""
echo "--- ARCHIVOS WORLD-WRITABLE (excl. /proc /sys /dev) ---"
find / -xdev -perm -0002 -type f 2>/dev/null | grep -v '^/proc\|^/sys\|^/dev'

echo ""
echo "--- DIRECTORIOS WORLD-WRITABLE SIN STICKY BIT ---"
find / -xdev -perm -0002 -type d ! -perm -1000 2>/dev/null | grep -v '^/proc\|^/sys'

echo ""
echo "--- ARCHIVOS SIN PROPIETARIO (huerfanos) ---"
find / -xdev -nouser -o -nogroup 2>/dev/null | grep -v '^/proc\|^/sys'

} > "\$REPORT"

echo "Auditoría de permisos guardada en \$REPORT"
\`\`\`

\`\`\`bash
chmod +x /usr/local/bin/permissions-audit.sh

# Guardar baseline inicial
/usr/local/bin/permissions-audit.sh
cp /var/log/permissions-audit-\$(date +%Y%m%d).txt /root/permissions-baseline.txt

# Detección de cambios (ejecutar semanalmente)
diff /root/permissions-baseline.txt /var/log/permissions-audit-\$(date +%Y%m%d).txt
\`\`\`

---

### 📋 Lo que debes recordar
* SUID en ejecutables = corre como el propietario. Legítimo en herramientas del sistema, peligroso en cualquier otra cosa
* Intérpretes (python, bash, perl, vim) con SUID = escalada trivial a root
* El sticky bit en directorios compartidos previene que usuarios borren archivos de otros
* Los archivos world-writable sin justificación son candidatos a ser vectores de escalada
* \`chattr +i\` hace un archivo inmodificable incluso para root; usar con precaución en archivos de configuración críticos

---

### 🧪 Autoevaluación

1. Encuentras \`/usr/local/bin/backup.sh\` con permisos \`-rwsr-xr-x\` propietario root. El script no está en la lista de SUID del sistema baseline. ¿Qué haces?
2. Un directorio \`/var/www/uploads\` es escribible por www-data y por el grupo developers. Quieres que ambos puedan crear archivos pero ninguno pueda eliminar los archivos del otro. ¿Qué permiso aplicas?
3. ¿Por qué \`chattr +i /etc/sudoers\` puede ser problemático en ciertos escenarios?

---

1. Investigar inmediatamente: quién lo instaló y cuándo (git log, package manager, auth.log). Si no tiene justificación clara, remover el SUID con \`chmod u-s /usr/local/bin/backup.sh\` y notificar al equipo. Un SUID no documentado en /usr/local es señal de compromiso o mala práctica.
2. Aplicar el sticky bit: \`chmod +t /var/www/uploads\`. Los permisos de escritura permiten crear; el sticky bit asegura que solo el propietario o root puede eliminar cada archivo.
3. Si necesitas modificar sudoers (agregar un usuario, cambiar permisos), primero debes hacer \`chattr -i /etc/sudoers\`. Si olvidas este paso, visudo fallará silenciosamente o con error confuso. También puede romper actualizaciones de paquetes que modifiquen sudoers (ej. la instalación de sudo mismo).
`

export default content
