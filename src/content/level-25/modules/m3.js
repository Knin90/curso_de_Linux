const content = `
## Módulo 3 — AIDE: monitoreo de integridad de archivos del sistema

### 🎯 Objetivos de aprendizaje

* Entender el propósito de un sistema de detección de intrusiones basado en host (HIDS).
* Instalar y configurar AIDE para monitorear directorios críticos del sistema.
* Inicializar la base de datos de referencia y ejecutar verificaciones periódicas.
* Interpretar los reportes de AIDE para distinguir cambios legítimos de compromisos.
* Automatizar AIDE con cron y configurar alertas sobre cambios detectados.

### ❓ El problema real

Un atacante con acceso root modifica \`/bin/ls\` para ocultar sus archivos maliciosos (rootkit). Ejecutas \`ls\` y no ves nada sospechoso porque el binario está comprometido. Los logs de acceso no muestran nada porque el rootkit los filtra. ¿Cómo detectar que un binario del sistema fue modificado? AIDE (Advanced Intrusion Detection Environment) toma una fotografía criptográfica del sistema en un momento conocido-bueno y la compara posteriormente para detectar cualquier cambio.

### 📖 Qué es AIDE y cómo funciona

AIDE es un reemplazo libre de Tripwire. Funciona en tres pasos:

\`\`\`text
PASO 1 — INIT: Crear base de datos de referencia
  aide --init
  → Lee todos los archivos configurados
  → Calcula hashes (SHA256, SHA512, MD5)
  → Almacena metadatos (permisos, propietario, tamaño, timestamps)
  → Guarda todo en /var/lib/aide/aide.db.new

PASO 2 — GUARDAR: Copiar la base de datos a lugar seguro
  cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
  → La DB de referencia debe guardarse en medio de solo lectura (USB, NFS externo)
  → Si el atacante modifica la DB, los resultados son inútiles

PASO 3 — CHECK: Comparar estado actual contra referencia
  aide --check
  → Lee el estado actual del sistema
  → Compara contra aide.db
  → Reporta archivos añadidos, eliminados o modificados
\`\`\`

### 📖 Instalación

\`\`\`bash
# Debian/Ubuntu
apt install aide aide-common

# RHEL/CentOS/Fedora
dnf install aide
# o
yum install aide

# Verificar instalación
aide --version
\`\`\`

### 📖 Configuración: /etc/aide/aide.conf

La configuración define qué directorios monitorear y qué atributos verificar:

\`\`\`text
# /etc/aide/aide.conf (fragmento anotado)

# Directorios de base de datos
database=file:/var/lib/aide/aide.db
database_out=file:/var/lib/aide/aide.db.new

# Definición de grupos de atributos a verificar
# p=permisos, i=inode, n=número de links, u=usuario, g=grupo
# s=tamaño, m=mtime, c=ctime, a=atime
# SHA256=hash SHA256, SHA512=hash SHA512
FIPSR = p+i+n+u+g+s+m+c+acl+selinux+xattrs+sha256
NORMAL = p+i+n+u+g+s+m+c+sha256

# Binarios críticos: verificar TODO incluyendo hash
/bin        FIPSR
/sbin       FIPSR
/usr/bin    FIPSR
/usr/sbin   FIPSR
/usr/lib    FIPSR
/usr/lib64  FIPSR

# Configuración: verificar pero no atime (se actualiza al leer)
/etc        NORMAL

# Bootloader y kernel
/boot       FIPSR

# Excluir directorios volátiles (cambian con frecuencia)
!/var/log
!/var/run
!/var/cache
!/var/spool
!/proc
!/sys
!/dev
!/tmp
!/run

# Excluir archivos específicos que cambian legítimamente
!/etc/mtab
!/etc/adjtime
!/etc/resolv.conf
\`\`\`

### 📖 Inicialización de la base de datos

\`\`\`bash
# Paso 1: Inicializar (puede tardar varios minutos)
aide --init
# o en sistemas Debian con wrapper:
aideinit

# Paso 2: Verificar que se creó la DB
ls -la /var/lib/aide/
# -rw------- 1 root root 8.2M Jan 15 10:00 aide.db.new

# Paso 3: Activar la DB de referencia
cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# IMPORTANTE: Guardar copia en medio externo
# (una DB comprometida hace inútil AIDE)
scp /var/lib/aide/aide.db backup-server:/secure/aide/hostname.db
\`\`\`

### 📖 Ejecutar verificaciones

\`\`\`bash
# Verificación completa
aide --check

# Salida típica (sistema limpio):
# AIDE found NO differences between database and filesystem.

# Salida con cambios detectados:
# AIDE found differences between database and filesystem!
#
# Summary:
#   Total number of entries:      45823
#   Added entries:                2
#   Removed entries:              0
#   Changed entries:              3
#
# ---------------------------------------------------
# Added entries:
# ---------------------------------------------------
# f   /tmp/.hidden_backdoor
# f   /etc/cron.d/system-update
#
# ---------------------------------------------------
# Changed entries:
# ---------------------------------------------------
# f   /bin/ls
# f   /usr/bin/who
# f   /etc/passwd
#
# Detailed information about changes:
# ---------------------------------------------------
# File: /bin/ls
#   SHA256   : oldHash != newHash
#   Mtime    : 2024-01-01T00:00:00 != 2024-01-15T14:23:00
#   Size     : 142144 != 148992

# Actualizar la DB después de cambios legítimos (ej: actualización de paquetes)
aide --update
cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
\`\`\`

### 📖 Automatizar con cron y alertar sobre cambios

\`\`\`bash
# Script de verificación con alerta por email
# /usr/local/bin/aide-check.sh
cat > /usr/local/bin/aide-check.sh << 'SCRIPT'
#!/bin/bash

REPORT=/tmp/aide-report-\$(date +%Y%m%d-%H%M%S).txt
ADMIN="admin@empresa.com"

# Ejecutar verificación
aide --check > "\$REPORT" 2>&1
EXIT_CODE=\$?

# EXIT_CODE: 0=sin cambios, 1=diferencias encontradas, 2+=error
if [ \$EXIT_CODE -eq 1 ]; then
    # Cambios detectados: enviar alerta
    mail -s "[ALERTA SEGURIDAD] AIDE detectó cambios en \$(hostname)" \
         "\$ADMIN" < "\$REPORT"

    # También escribir en syslog
    logger -p auth.warning "AIDE: cambios detectados en el sistema de archivos"
elif [ \$EXIT_CODE -gt 1 ]; then
    # Error al ejecutar AIDE
    mail -s "[ERROR] AIDE falló en \$(hostname)" "\$ADMIN" < "\$REPORT"
fi

# Mantener últimos 30 reportes
find /tmp -name "aide-report-*.txt" -mtime +30 -delete
SCRIPT

chmod 700 /usr/local/bin/aide-check.sh

# Agregar a cron (ejecutar a las 2:30 AM diariamente)
echo "30 2 * * * root /usr/local/bin/aide-check.sh" > /etc/cron.d/aide
\`\`\`

### 📖 Directorios críticos a monitorear

\`\`\`text
DIRECTORIO          RAZÓN DE MONITOREO
────────────────────────────────────────────────────────────────────
/bin, /sbin         Binarios del sistema: compromiso = rootkit
/usr/bin, /usr/sbin Binarios de usuario y sistema
/usr/lib*           Librerías: sustitución captura credenciales (libpam)
/etc                Configuración: backdoors en sshd_config, passwd, sudoers
/boot               Bootloader y kernel: rootkit de boot
/root               Directorio home de root: claves SSH, scripts
/usr/local/bin      Binarios instalados manualmente

DIRECTORIOS A EXCLUIR (cambian constantemente)
────────────────────────────────────────────────────────────────────
/var/log            Logs: crecen continuamente
/var/run, /run      PIDs y sockets: cambian con cada proceso
/var/cache          Caches: cambian con operaciones normales
/proc, /sys         Pseudofilesystems: estado del kernel en tiempo real
/tmp                Temporal: debe monitorearse diferente (detectar añadidos)
\`\`\`

### 📋 Lo que debes recordar

* AIDE toma una fotografía criptográfica del sistema; cualquier diferencia posterior es detectable.
* La base de datos de referencia debe guardarse en medio externo de solo lectura.
* Excluir directorios volátiles (\`/var/log\`, \`/tmp\`, \`/proc\`) reduce el ruido en los reportes.
* Después de actualizaciones de paquetes legítimas: ejecutar \`aide --update\` y renovar la DB.
* Un cambio en \`/bin\`, \`/sbin\` o librerías de sistema es señal crítica de compromiso.

### 🧪 Autoevaluación

1. ¿Por qué es crítico guardar la base de datos de AIDE en un medio externo de solo lectura?
2. AIDE reporta cambios en \`/usr/lib/x86_64-linux-gnu/libpam.so.0\`. ¿Por qué es esto especialmente preocupante?
3. ¿Qué comando se usa después de instalar actualizaciones legítimas del sistema para evitar falsas alarmas futuras?

---

1. Porque si un atacante con acceso root puede modificar la DB de AIDE en el mismo sistema, puede actualizar los hashes de los archivos comprometidos y AIDE no detectará ninguna diferencia. La DB en medio externo (USB de solo lectura, servidor NFS con permisos restringidos) garantiza que la referencia no puede ser manipulada.
2. libpam.so es la librería de autenticación PAM (Pluggable Authentication Modules). Si está modificada, el atacante puede haber implantado un backdoor que acepta una contraseña maestra para cualquier usuario, o que captura todas las contraseñas ingresadas en el sistema y las exfiltra.
3. \`aide --update\` seguido de \`cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db\`. Esto recalcula los hashes del estado actual del sistema y lo convierte en la nueva referencia, incorporando los cambios legítimos de las actualizaciones.
`

export default content
