const content = `
## Módulo 4 — Disco lleno e inodos agotados: diagnóstico y remediación

### 🎯 Objetivos de aprendizaje

* Diagnosticar espacio en disco agotado con \`df\` y localizar los archivos responsables con \`du\`.
* Entender qué son los inodos y por qué un disco puede estar "lleno" sin estar lleno en bytes.
* Encontrar archivos grandes y directorios que crecen sin control.
* Reconocer y corregir logs sin rotar como causa recurrente de disco lleno.
* Diagnosticar el caso especial de espacio ocupado por archivos borrados pero aún abiertos por un proceso.

### ❓ El problema real

Una aplicación empieza a fallar con errores de escritura. \`df -h\` muestra 40% de uso en la partición raíz, así que el equipo descarta "disco lleno" como causa. Pero la aplicación sigue sin poder crear archivos nuevos. La causa real: los inodos están agotados al 100%, aunque el espacio en bytes esté disponible. Un sistema de archivos con millones de archivos pequeños (por ejemplo, una cola de emails o sesiones de PHP sin limpiar) puede agotar la tabla de inodos mucho antes que el espacio físico. Sin revisar \`df -i\`, este escenario es indiagnosticable con las herramientas equivocadas.

### 📖 df -h: espacio en disco por partición

\`\`\`bash
df -h
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   48G  0.5G  99% /
# /dev/sda2       200G  120G   70G  63% /var
# tmpfs           7.8G     0  7.8G   0% /dev/shm
\`\`\`

\`Use%\` cercano a 100% en cualquier partición montada es la señal de alerta directa. Es importante revisar cada punto de montaje: un disco raíz al 40% no ayuda si \`/var\` (donde suelen vivir logs y bases de datos) está al 99% en una partición separada.

### 📖 du: localizar qué directorio consume el espacio

\`\`\`bash
# Tamaño de los subdirectorios de primer nivel, ordenado descendente
du -h --max-depth=1 /var | sort -rh | head -10

# Bajar un nivel en el directorio sospechoso
du -h --max-depth=1 /var/log | sort -rh | head -10

# Archivos individuales más grandes en todo el sistema
find / -xdev -type f -size +100M -exec ls -lh {} \\; 2>/dev/null | sort -k5 -rh | head -20
\`\`\`

\`-xdev\` en \`find\` evita cruzar a otros sistemas de archivos montados (como NFS o discos separados), lo cual acelera la búsqueda y evita resultados de particiones que no son la que está llena.

### 📖 El caso especial: archivos borrados pero aún abiertos

Un archivo borrado con \`rm\` mientras un proceso lo tiene abierto NO libera el espacio en disco hasta que el proceso cierra el descriptor de archivo. Esto es una causa común y confusa de "el disco está lleno pero \`du\` no encuentra archivos grandes".

\`\`\`bash
# lsof detecta archivos borrados que siguen ocupando espacio
lsof +L1
# COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NLINK    NODE NAME
# nginx    1821 www-data 8w  REG  8,1   5368709120   0   123456 /var/log/nginx/access.log (deleted)

# La columna NLINK en 0 confirma que el archivo está borrado del sistema
# de archivos pero su espacio sigue reservado mientras el FD siga abierto.

# Solución: NO se puede recuperar el espacio borrando de nuevo (ya está borrado).
# Se debe truncar el descriptor abierto o reiniciar el proceso que lo mantiene:
: > /proc/1821/fd/8              # trunca el contenido sin cerrar el FD
# o, más común en producción:
systemctl reload nginx           # fuerza reapertura de los file descriptors de log
\`\`\`

Este escenario es típico con logs de aplicaciones que se borran manualmente ("rm access.log" para liberar espacio) sin usar \`logrotate\`, en vez de truncarlos o reiniciar el proceso que los escribe.

### 📖 Inodos agotados: el disco "lleno" sin estar lleno

Cada archivo y directorio consume un inodo, independientemente de su tamaño en bytes. Un sistema de archivos formateado con una cantidad fija de inodos puede agotarlos mucho antes que el espacio físico, especialmente con cargas de trabajo de muchos archivos pequeños.

\`\`\`bash
df -i
# Filesystem      Inodes  IUsed   IFree IUse% Mounted on
# /dev/sda1      3276800 3276800      0  100% /

# Encontrar qué directorio tiene más archivos (consumidores de inodos)
for dir in /var/*/; do
  echo "$dir: $(find "$dir" -xdev | wc -l)"
done | sort -t: -k2 -rn | head -10
\`\`\`

\`\`\`text
CAUSAS TÍPICAS DE AGOTAMIENTO DE INODOS
─────────────────────────────────────────────────────────────────────────────
Colas de correo sin procesar        /var/spool/postfix con miles de mensajes
Sesiones de PHP sin garbage collect  /var/lib/php/sessions acumulando archivos
Caché de aplicación sin límite       miles de archivos pequeños en /tmp o cache/
Backups incrementales mal purgados   millones de hardlinks de versiones antiguas
\`\`\`

La única solución real a inodos agotados es reducir la cantidad de archivos (borrar, comprimir en archivos únicos tipo tar) o, si el sistema de archivos lo permite, reformatear con más inodos reservados (ext4 permite ajustar el ratio bytes-per-inode al formatear, no después).

### 📖 Log rotation roto: la causa más común en producción

\`logrotate\` es el mecanismo estándar para evitar que los logs crezcan sin límite. Cuando está mal configurado o falla silenciosamente, los logs crecen hasta llenar el disco.

\`\`\`bash
# Verificar el estado de logrotate y su última ejecución
cat /var/lib/logrotate/status | head -20

# Ejecutar logrotate manualmente en modo debug (sin aplicar cambios)
logrotate -d /etc/logrotate.conf

# Forzar rotación inmediata (aplica cambios)
logrotate -f /etc/logrotate.conf

# Revisar la configuración específica de un servicio
cat /etc/logrotate.d/nginx
# /var/log/nginx/*.log {
#     daily
#     rotate 14
#     compress
#     delaycompress
#     missingok
#     notifempty
#     postrotate
#         systemctl reload nginx > /dev/null 2>&1 || true
#     endscript
# }
\`\`\`

Un error común: si falta la directiva \`postrotate\` con el reload del servicio, el proceso sigue escribiendo al inodo del archivo rotado (ahora renombrado o borrado) en vez del archivo nuevo, reproduciendo el problema de "archivo borrado pero abierto" descrito arriba.

### 📋 Lo que debes recordar

* \`df -h\` muestra espacio en bytes; \`df -i\` muestra inodos — ambos deben revisarse, son problemas independientes.
* \`du -h --max-depth=1 | sort -rh\` es la forma más rápida de localizar qué directorio consume el espacio.
* Un archivo borrado con un proceso que lo mantiene abierto no libera espacio hasta que se cierra el descriptor (\`lsof +L1\` lo detecta).
* Inodos agotados suelen venir de cargas de muchos archivos pequeños (colas de correo, sesiones, caché) más que de archivos grandes.
* La causa raíz más común de disco lleno en producción es logrotate mal configurado o sin el \`postrotate\` que recarga el servicio.
* Revisar todas las particiones montadas por separado: un disco raíz con espacio libre no descarta que \`/var\` esté lleno.

### 🧪 Autoevaluación

1. \`df -h\` muestra 40% de uso pero la aplicación no puede crear archivos nuevos. ¿Qué se debe revisar?
2. Se borró un archivo de log de 5GB con \`rm\` pero \`df -h\` sigue mostrando el disco lleno. ¿Por qué y cómo se soluciona?
3. ¿Qué directiva de logrotate evita que un servicio siga escribiendo al archivo de log ya rotado?

---

1. Se debe revisar \`df -i\` para verificar si los inodos están agotados. Un sistema de archivos puede tener espacio libre en bytes pero cero inodos disponibles si hay una gran cantidad de archivos pequeños (colas, sesiones, caché sin limpiar), lo cual impide crear archivos nuevos aunque haya espacio físico.
2. Porque un proceso sigue teniendo el archivo abierto (file descriptor activo) a pesar de haber sido borrado del sistema de archivos; el espacio no se libera hasta que el proceso cierra ese descriptor. Se detecta con \`lsof +L1\` y se soluciona truncando el descriptor abierto o reiniciando/recargando el proceso que lo mantiene abierto.
3. La directiva \`postrotate\` (con el comando de reload del servicio dentro, por ejemplo \`systemctl reload nginx\`) fuerza al servicio a reabrir sus descriptores de archivo apuntando al nuevo archivo de log tras la rotación, en vez de seguir escribiendo al inodo del archivo antiguo ya renombrado o comprimido.
`

export default content
