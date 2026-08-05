const content = `
## Módulo 3 — Anatomía de un proceso: /proc/PID y estructura interna

### 🎯 Objetivos de aprendizaje

* Navegar el filesystem virtual /proc para inspeccionar procesos en ejecución.
* Leer e interpretar los archivos clave de /proc/PID.
* Entender el espacio de memoria de un proceso y sus segmentos.
* Usar /proc para diagnóstico sin herramientas externas.

### ❓ El problema real

Tu aplicación está usando más memoria de la esperada y quieres saber exactamente qué mapeos de memoria tiene, qué archivos tiene abiertos, y cuántos descriptores de archivo consume. Todo esto está disponible en /proc — sin instalar nada — si sabes dónde mirar.

### 📖 El filesystem /proc

/proc es un filesystem virtual (pseudo-filesystem) montado en RAM por el kernel. No existe en disco. Cada directorio /proc/PID corresponde a un proceso en ejecución y desaparece cuando el proceso muere.

\`\`\`bash
ls /proc/
# 1  2  3 ... (PIDs de procesos)  también: cpuinfo, meminfo, version, net/, etc.

ls /proc/\$\$/    # \$\$ es el PID del shell actual
# attr/     cmdline  environ  fd/      maps      net/     stat     wchan
# cgroup    comm     exe      fdinfo/  mem       ns/      statm
# cmdline   cwd      status   io       mountinfo pagemap  task/
\`\`\`

### 📖 Archivos clave de /proc/PID

\`\`\`bash
# cmdline — línea de comando completa (separada por \0)
cat /proc/1234/cmdline | tr '\0' ' '
# /usr/sbin/nginx -g daemon off;

# comm — nombre del proceso (solo el ejecutable, 15 chars)
cat /proc/1234/comm
# nginx

# exe — enlace simbólico al ejecutable
readlink /proc/1234/exe
# /usr/sbin/nginx

# cwd — directorio de trabajo actual
readlink /proc/1234/cwd
# /var/www/html

# environ — variables de entorno (separadas por \0)
cat /proc/1234/environ | tr '\0' '\n' | grep PATH
# PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin

# status — resumen legible del estado del proceso
cat /proc/1234/status
\`\`\`

\`\`\`text
Name:   nginx
State:  S (sleeping)
Tgid:   1234
Pid:    1234
PPid:   1    ← PID del proceso padre
TracerPid: 0
Uid:    33 33 33 33    ← real, effective, saved, filesystem UID
Gid:    33 33 33 33
VmPeak:    524288 kB   ← pico de memoria virtual
VmSize:    512000 kB   ← memoria virtual actual
VmRSS:      32768 kB   ← memoria física residente (la que importa)
VmSwap:         0 kB
Threads:        4      ← número de threads
\`\`\`

### 📖 Descriptores de archivo: /proc/PID/fd

\`\`\`bash
# Ver todos los archivos abiertos por un proceso
ls -la /proc/1234/fd/
# lrwxrwxrwx 1 www-data www-data 64 Jan 15 10:00 0 -> /dev/null
# lrwxrwxrwx 1 www-data www-data 64 Jan 15 10:00 1 -> /dev/null
# lrwxrwxrwx 1 www-data www-data 64 Jan 15 10:00 2 -> /var/log/nginx/error.log
# lrwxrwxrwx 1 www-data www-data 64 Jan 15 10:00 3 -> socket:[98765]
# lrwxrwxrwx 1 www-data www-data 64 Jan 15 10:00 4 -> /var/log/nginx/access.log

# Contar descriptores de archivo abiertos
ls /proc/1234/fd | wc -l

# El límite máximo de FDs del proceso
cat /proc/1234/limits | grep "open files"
# Max open files   65536   65536   files

# Archivos borrados pero aún abiertos (común en logs)
ls -la /proc/1234/fd/ | grep deleted
\`\`\`

### 📖 Mapa de memoria: /proc/PID/maps

\`\`\`bash
cat /proc/1234/maps
\`\`\`

\`\`\`text
DIRECCIÓN_INICIO-FIN      PERMISOS  OFFSET  DEV   INODE  RUTA
────────────────────────────────────────────────────────────────────────
55a3f2000000-55a3f2800000  r--p  00000000  08:01  12345  /usr/sbin/nginx
55a3f2800000-55a3f3200000  r-xp  00800000  08:01  12345  /usr/sbin/nginx  ← código
55a3f3200000-55a3f3400000  r--p  01200000  08:01  12345  /usr/sbin/nginx  ← read-only data
55a3f3600000-55a3f3800000  rw-p  01400000  08:01  12345  /usr/sbin/nginx  ← data/bss
55a3f4000000-55a3f5000000  rw-p  00000000  00:00      0  [heap]
7f8a20000000-7f8a21000000  rw-p  00000000  00:00      0  [stack]
7f8a21000000-7f8a22000000  r--p  00000000  08:01  56789  /lib/libc.so.6
\`\`\`

\`\`\`text
PERMISOS:
  r = lectura    w = escritura    x = ejecución
  p = privado (copy-on-write)    s = compartido (shared)
\`\`\`

### 📖 Estadísticas de I/O: /proc/PID/io

\`\`\`bash
cat /proc/1234/io
\`\`\`

\`\`\`text
rchar: 1073741824     ← bytes leídos (incluyendo caché)
wchar: 536870912      ← bytes escritos (incluyendo caché)
syscr: 524288         ← llamadas read()
syscw: 262144         ← llamadas write()
read_bytes: 268435456  ← bytes leídos del disco real
write_bytes: 134217728  ← bytes escritos al disco real
cancelled_write_bytes: 0
\`\`\`

\`\`\`bash
# Script para monitorear I/O de un proceso
watch_io() {
    local pid=\$1
    local prev_read=0
    local prev_write=0

    while kill -0 "\$pid" 2>/dev/null; do
        local read_bytes
        read_bytes=$(awk '/read_bytes/ {print \$2}' /proc/"\$pid"/io 2>/dev/null)
        local write_bytes
        write_bytes=$(awk '/write_bytes/ {print \$2}' /proc/"\$pid"/io 2>/dev/null)

        local read_rate=$(( (read_bytes - prev_read) / 1024 ))
        local write_rate=$(( (write_bytes - prev_write) / 1024 ))
        echo "PID \$pid | Read: \${read_rate} KB/s | Write: \${write_rate} KB/s"

        prev_read=\$read_bytes
        prev_write=\$write_bytes
        sleep 1
    done
}
\`\`\`

### 📖 /proc/PID/stat para métricas de CPU

\`\`\`bash
# stat contiene todo sobre el proceso en un solo línea (compleja)
cat /proc/1234/stat

# Campos relevantes (posición en la línea):
# 1=pid  2=comm  3=state  4=ppid  14=utime  15=stime  24=nice

# Script para calcular uso de CPU de un proceso
cpu_usage() {
    local pid=\$1
    local prev_total=0
    local prev_proc=0

    while kill -0 "\$pid" 2>/dev/null; do
        local stat
        stat=$(cat /proc/"\$pid"/stat 2>/dev/null)
        local utime
        utime=$(echo "\$stat" | awk '{print \$14}')
        local stime
        stime=$(echo "\$stat" | awk '{print \$15}')
        local proc_total=$(( utime + stime ))

        local cpu_total
        cpu_total=$(awk '/^cpu / {total=0; for(i=2;i<=8;i++) total+=\$i; print total}' /proc/stat)

        local proc_diff=$(( proc_total - prev_proc ))
        local total_diff=$(( cpu_total - prev_total ))

        if [ "\$total_diff" -gt 0 ]; then
            awk "BEGIN {printf \"CPU: %.1f%%\\n\", \$proc_diff * 100 / \$total_diff}"
        fi

        prev_proc=\$proc_total
        prev_total=\$cpu_total
        sleep 1
    done
}
\`\`\`

### 📋 Lo que debes recordar

* /proc/PID/fd/ muestra todos los descriptores de archivo: conexiones, logs, pipes, sockets.
* /proc/PID/status tiene un resumen legible con memoria, UID, threads y estado.
* /proc/PID/maps muestra el espacio de memoria virtual: código, heap, stack, librerías.
* /proc/PID/io tiene I/O real vs. I/O de caché — útil para diagnosticar uso de disco.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre VmSize y VmRSS en /proc/PID/status?
2. Un proceso tiene 3 entradas en /proc/PID/fd/ que apuntan a archivos con "(deleted)". ¿Qué significa y qué consecuencia tiene?
3. ¿Cómo averiguas exactamente qué librerías .so tiene cargadas un proceso sin usar lsof?

---

1. VmSize es el tamaño total del espacio de memoria virtual — incluye memoria mapeada pero no necesariamente en RAM (puede estar en swap o ni siquiera usada). VmRSS (Resident Set Size) es la memoria física real que el proceso ocupa en RAM en este momento. VmRSS es el número que importa para saber si el sistema se queda sin RAM.
2. El archivo fue borrado del filesystem (alguien ejecutó rm) pero el proceso todavía lo tiene abierto, por lo que el inode persiste y el espacio en disco no se libera. Esto es común con logs: si haces \`rm /var/log/app.log\` mientras el proceso escribe, el archivo desaparece del directorio pero sigue creciendo. El espacio solo se libera cuando el proceso cierra el descriptor (o muere). Solución: truncar en lugar de borrar, o reabrir el fd.
3. \`cat /proc/PID/maps | grep '\.so'\` — el archivo maps muestra todos los mapeos de memoria incluyendo las librerías compartidas cargadas, con sus rutas completas.
`

export default content
