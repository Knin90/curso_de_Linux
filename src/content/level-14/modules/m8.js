const content = `
## Módulo 8 — Proyecto real: incidente de procesos en un servidor de producción

### 🎯 Objetivos de aprendizaje

* Aplicar en un escenario real todas las técnicas de gestión de procesos del nivel 14.
* Diagnosticar y resolver memory leaks, procesos runaway y procesos zombie.
* Configurar límites de recursos con rlimits y cgroups v2.
* Generar reportes de rendimiento con pidstat.
* Construir un script de apagado graceful con señales.

### ❓ El problema real

Son las 2:00 AM. Tu servidor de producción está respondiendo lento. El equipo de monitoreo reporta que la memoria disponible cayó de 16 GB a 200 MB en las últimas 3 horas, la CPU de un proceso está al 100% sostenido, y hay varios procesos zombie acumulándose. Tienes que diagnosticar y resolver cada problema sin reiniciar el servidor ni interrumpir el servicio principal.

### 📖 Estructura del proyecto

\`\`\`
diagnostico-procesos/
├── check-memory.sh
├── check-cpu.sh
├── cleanup-zombies.sh
├── cgroup-limit.sh
├── performance-report.sh
└── graceful-shutdown.sh
\`\`\`

Cada script documenta una técnica de diagnóstico que se ejecuta en orden durante el incidente, de la más general (memoria) a la más específica (apagado controlado).

### 📖 Escenario 1: Proceso con memory leak

**Contexto:** Un proceso Java de procesamiento de reportes lleva horas corriendo y consumiendo memoria progresivamente.

**Paso 1: Identificar el proceso sospechoso**

\`\`\`bash
# Vista general de consumo de memoria (ordenado por RSS)
ps aux --sort=-%mem | head -20
\`\`\`

\`\`\`text
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
jenkins  14823  2.1 45.3 8945120 7421804 ?   Sl   02:00 103:21 java -jar report-gen.jar
www-data  1204  0.8  3.1  892040  512300 ?   S    Jan10  24:12 nginx: worker process
mysql     2301  1.2  8.4 2048000 1376000 ?   Sl   Jan10 312:00 /usr/sbin/mysqld
\`\`\`

**Paso 2: Inspeccionar /proc/PID/status para detalles de memoria**

\`\`\`bash
PID=14823
cat /proc/\${PID}/status | grep -E "VmRSS|VmSize|VmSwap|VmPeak|Threads"
\`\`\`

\`\`\`text
VmPeak:  9234512 kB    # pico histórico de memoria virtual
VmSize:  8945120 kB    # memoria virtual actual
VmRSS:   7421804 kB    # memoria física (RAM) en uso ← el problema
VmSwap:   823400 kB    # usando swap activamente
Threads:       48
\`\`\`

**Paso 3: Revisar mapas de memoria con pmap**

\`\`\`bash
pmap -x \${PID} | sort -k3 -n -r | head -20
\`\`\`

\`\`\`text
Address           Kbytes     RSS   Dirty Mode  Mapping
00007f8a20000000 4096000 3891200 3891200 rw---   [ anon ]   ← heap enorme
00007f8a60000000 2048000 2048000 2048000 rw---   [ anon ]
00007f8a80000000  524288  524288       0 r-x-- report-gen.jar (mapped)
\`\`\`

**Paso 4: Aplicar rlimit para limitar memoria futura**

\`\`\`bash
# Ver límites actuales del proceso
cat /proc/\${PID}/limits
\`\`\`

\`\`\`text
Limit                     Soft Limit           Hard Limit           Units
Max address space         unlimited            unlimited            bytes
Max resident set          unlimited            unlimited            bytes
\`\`\`

\`\`\`bash
# Establecer límite de memoria virtual con prlimit (sin reiniciar el proceso)
prlimit --pid \${PID} --as=8G:8G

# Verificar que el límite se aplicó
cat /proc/\${PID}/limits | grep "address space"
\`\`\`

\`\`\`text
Max address space      8589934592           8589934592           bytes
\`\`\`

**Paso 5: Si el proceso supera el límite, terminará con SIGKILL automático. Reiniciarlo con límites desde el inicio:**

\`\`\`bash
# En el script de arranque del servicio
ulimit -v $((8 * 1024 * 1024))   # 8 GB de espacio virtual
ulimit -m $((6 * 1024 * 1024))   # 6 GB de RSS
exec java -jar report-gen.jar
\`\`\`

### 📖 Escenario 2: Proceso runaway en CPU

**Contexto:** Un proceso de conversión de video está consumiendo el 100% de un núcleo durante horas.

**Paso 1: Identificar con top y confirmar**

\`\`\`bash
# Vista interactiva — presiona 1 para ver núcleos individuales
top

# O en modo batch para scripting
top -b -n 1 | head -20
\`\`\`

\`\`\`text
PID    USER    PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
28441  ffmpeg  20   0  824320  98304  16384 R 100.0   0.6   4:32:11 ffmpeg
\`\`\`

**Paso 2: Bajar la prioridad con renice**

\`\`\`bash
# Renice al valor más bajo de prioridad (19 = less favored)
renice -n 19 -p 28441

# Verificar
ps -o pid,ni,pri,comm -p 28441
\`\`\`

\`\`\`text
  PID  NI PRI COMMAND
28441  19   0 ffmpeg
\`\`\`

**Paso 3: Investigar qué hace el proceso con strace**

\`\`\`bash
# Adjuntarse al proceso en ejecución (muestra syscalls en tiempo real)
strace -p 28441 -c -e trace=all 2>&1 &
STRACE_PID=\$!
sleep 10
kill \${STRACE_PID}
\`\`\`

\`\`\`text
% time     seconds  usecs/call     calls    errors syscall
──────── ─────────── ─────────── ───────── ───────── ──────────
 89.23    52.341281          52    993847           read
  6.12     3.591203          36     99841           write
  3.44     2.018772          40     50442           mmap
  1.21     0.710341          28     25016           munmap
\`\`\`

El proceso está en un loop de read/write — procesamiento legítimo pero sin límite de CPU.

**Paso 4: Limitar CPU con taskset (pinning a un núcleo)**

\`\`\`bash
# Verificar núcleos disponibles
nproc   # ej: 8

# Confinar ffmpeg al núcleo 7 (el menos cargado)
taskset -cp 7 28441

# Verificar
taskset -cp 28441
\`\`\`

\`\`\`text
pid 28441's current affinity list: 7
\`\`\`

### 📖 Escenario 3: Procesos zombie

**Contexto:** ps aux muestra varios procesos en estado Z (zombie).

**Paso 1: Identificar zombies**

\`\`\`bash
ps aux | awk '\$8 == "Z" {print}'
\`\`\`

\`\`\`text
USER       PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
www-data 31204  0.0  0.0   0   0  ?  Z    04:12 0:00 [php-fpm] <defunct>
www-data 31287  0.0  0.0   0   0  ?  Z    04:13 0:00 [php-fpm] <defunct>
www-data 31301  0.0  0.0   0   0  ?  Z    04:13 0:00 [php-fpm] <defunct>
\`\`\`

**Paso 2: Encontrar el proceso padre (PPID)**

\`\`\`bash
ps -o pid,ppid,stat,comm -p 31204 31287 31301
\`\`\`

\`\`\`text
  PID  PPID STAT COMMAND
31204  9823    Z php-fpm: pool www
31287  9823    Z php-fpm: pool www
31301  9823    Z php-fpm: pool www
\`\`\`

\`\`\`bash
# Ver el proceso padre
ps -p 9823 -o pid,ppid,stat,comm
\`\`\`

\`\`\`text
  PID  PPID STAT COMMAND
 9823     1   Ss  php-fpm: master
\`\`\`

**Paso 3: Enviar SIGCHLD al padre para que haga wait()**

\`\`\`bash
kill -SIGCHLD 9823

# Verificar que los zombies desaparecieron
ps aux | awk '\$8 == "Z"'
\`\`\`

\`\`\`text
(sin salida — zombies eliminados)
\`\`\`

**¿Por qué persisten los zombies?**

Un proceso zombie no consume CPU ni memoria significativa — solo una entrada en la tabla de procesos. Persiste porque el padre no ha llamado a wait() o waitpid() para recoger el código de salida del hijo. Si el padre ignora SIGCHLD, los zombies permanecen hasta que el padre termine, momento en el cual init (PID 1) los adopta y los limpia inmediatamente.

\`\`\`bash
# Si el padre no responde a SIGCHLD y acumula zombies continuamente,
# hay un bug en el código del padre — considera reiniciar el servicio padre:
systemctl restart php8.1-fpm
\`\`\`

### 📖 Escenario 4: Cgroups v2 — límite de memoria a un grupo de procesos

**Contexto:** Quieres que todos los procesos del servicio de reportes nunca excedan 2 GB de RAM en conjunto.

**Paso 1: Verificar que cgroup v2 está activo**

\`\`\`bash
mount | grep cgroup2
\`\`\`

\`\`\`text
cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime)
\`\`\`

**Paso 2: Crear el cgroup**

\`\`\`bash
mkdir /sys/fs/cgroup/report-service
\`\`\`

**Paso 3: Configurar límite de memoria**

\`\`\`bash
# Límite máximo de RAM (2 GB)
echo "2147483648" > /sys/fs/cgroup/report-service/memory.max

# Límite de swap adicional (0 = sin swap para este grupo)
echo "0" > /sys/fs/cgroup/report-service/memory.swap.max

# Verificar
cat /sys/fs/cgroup/report-service/memory.max
\`\`\`

\`\`\`text
2147483648
\`\`\`

**Paso 4: Agregar el proceso al cgroup**

\`\`\`bash
echo 14823 > /sys/fs/cgroup/report-service/cgroup.procs

# Verificar
cat /sys/fs/cgroup/report-service/cgroup.procs
\`\`\`

\`\`\`text
14823
\`\`\`

**Paso 5: Monitorear uso de memoria del cgroup**

\`\`\`bash
watch -n 2 'cat /sys/fs/cgroup/report-service/memory.current'
\`\`\`

\`\`\`text
# En bytes — cada 2 segundos
1843200000
1891328000
2012774400
# Cuando supere memory.max, el OOM killer terminará el proceso
\`\`\`

### 📖 Escenario 5: Reporte de rendimiento con pidstat

**Paso 1: Generar reporte de CPU y memoria cada 5 segundos durante 1 minuto**

\`\`\`bash
pidstat -u -r -d -p ALL 5 12 > /var/log/process-report-\$(date +%Y%m%d-%H%M).txt
\`\`\`

\`\`\`text
Linux 5.15.0-91-generic (prod-srv-01)  04/15/2024  _x86_64_  (8 CPU)

05:00:00 AM   UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
05:00:05 AM  1001     14823   85.20    2.40    0.00    0.40   87.60     3  java
05:00:05 AM     0      2301    1.20    0.60    0.00    0.20    1.80     1  mysqld

05:00:00 AM   UID       PID  minflt/s  majflt/s     VSZ     RSS   %MEM  Command
05:00:05 AM  1001     14823    842.40      0.20 8945120 7421804  45.32  java
\`\`\`

**Paso 2: Reporte de I/O por proceso**

\`\`\`bash
pidstat -d -p 14823 5 6
\`\`\`

\`\`\`text
05:00:10 AM   UID       PID   kB_rd/s   kB_wr/s kB_ccwr/s iodelay  Command
05:00:15 AM  1001     14823    4096.00    512.00      0.00      12  java
05:00:20 AM  1001     14823    8192.00   1024.00      0.00       8  java
\`\`\`

### 📖 Escenario 6: Script de apagado graceful

\`\`\`bash
#!/bin/bash
# graceful-shutdown.sh — apagado ordenado de servicios en producción

set -euo pipefail

SHUTDOWN_TIMEOUT=30    # segundos para esperar el apagado graceful
LOG="/var/log/graceful-shutdown.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] \$*" | tee -a "\${LOG}"; }

shutdown_service() {
    local name="\$1"
    local pid="\$2"

    log "Iniciando apagado de \${name} (PID \${pid})"

    # 1. SIGTERM — pide al proceso que termine con elegancia
    kill -SIGTERM "\${pid}"

    # 2. Esperar hasta SHUTDOWN_TIMEOUT segundos
    local elapsed=0
    while kill -0 "\${pid}" 2>/dev/null; do
        sleep 1
        elapsed=\$((elapsed + 1))
        if [[ \${elapsed} -ge \${SHUTDOWN_TIMEOUT} ]]; then
            log "ADVERTENCIA: \${name} no terminó en \${SHUTDOWN_TIMEOUT}s — enviando SIGKILL"
            kill -SIGKILL "\${pid}"
            sleep 2
            break
        fi
        log "Esperando a \${name}... \${elapsed}s"
    done

    if kill -0 "\${pid}" 2>/dev/null; then
        log "ERROR: No se pudo terminar \${name} (PID \${pid})"
        return 1
    else
        log "OK: \${name} terminado correctamente en \${elapsed}s"
    fi
}

# Leer PIDs de los servicios a apagar
APP_PID=\$(systemctl show -p MainPID --value app-server.service)
WORKER_PID=\$(systemctl show -p MainPID --value report-worker.service)

log "=== Inicio de apagado graceful ==="

# Apagar en orden: primero workers, luego el servidor principal
shutdown_service "report-worker" "\${WORKER_PID}"
shutdown_service "app-server"    "\${APP_PID}"

log "=== Apagado completado ==="
\`\`\`

\`\`\`bash
# Ejecutar el script
chmod +x graceful-shutdown.sh
sudo ./graceful-shutdown.sh
\`\`\`

\`\`\`text
[2024-04-15 05:05:00] === Inicio de apagado graceful ===
[2024-04-15 05:05:00] Iniciando apagado de report-worker (PID 31850)
[2024-04-15 05:05:01] Esperando a report-worker... 1s
[2024-04-15 05:05:02] Esperando a report-worker... 2s
[2024-04-15 05:05:04] OK: report-worker terminado correctamente en 4s
[2024-04-15 05:05:04] Iniciando apagado de app-server (PID 14823)
[2024-04-15 05:05:34] ADVERTENCIA: app-server no terminó en 30s — enviando SIGKILL
[2024-04-15 05:05:36] OK: app-server terminado correctamente en 32s
[2024-04-15 05:05:36] === Apagado completado ===
\`\`\`

### 📋 Lo que debes recordar

* **/proc/PID/status** es la fuente primaria para diagnosticar memoria: VmRSS es el uso real de RAM.
* **pmap -x** muestra los mapas de memoria individuales — útil para localizar el heap desbocado.
* **prlimit** aplica límites de recursos a procesos en ejecución sin reiniciarlos.
* **renice +19** reduce la prioridad de CPU sin detener el proceso — primera respuesta a un runaway.
* **strace -p PID -c** adjunta al proceso y muestra un resumen de syscalls — diagnostica loops infinitos.
* **SIGCHLD al padre** es la forma correcta de limpiar zombies sin matar el padre.
* **cgroups v2** aplica límites al grupo completo de procesos — más robusto que rlimits individuales.
* **pidstat** es superior a top para reportes históricos con timestamps y métricas por proceso.
* **SIGTERM → esperar → SIGKILL** es el patrón universal de apagado graceful.

### 🧪 Autoevaluación

1. Tienes un proceso en Z (zombie). El padre tiene PID 9823. ¿Qué comando envías primero y por qué ese en lugar de matar directamente el zombie?
2. Un proceso consume 95% de CPU. Ejecutas \`renice -n 19 -p PID\`. ¿El proceso seguirá usando CPU? ¿Qué cambió exactamente?
3. Configuraste \`memory.max\` en 2 GB en cgroups v2 para un proceso. El proceso intenta alocar 500 MB más. ¿Qué le sucede al proceso?

---

1. Envías \`kill -SIGCHLD 9823\` al padre para que llame a wait() y limpie la entrada zombie. No puedes matar directamente un zombie — ya está muerto; solo el padre puede recoger su código de salida.
2. Sí, seguirá usando CPU, pero con la prioridad más baja (nice 19). El scheduler del kernel lo favorecerá menos frente a otros procesos. Con carga alta del sistema lo limitará significativamente; con CPU ociosa seguirá corriendo al 100% de ese núcleo.
3. El OOM killer del kernel termina el proceso con SIGKILL. El cgroup aplica el límite de forma estricta — cuando el proceso supera \`memory.max\`, el kernel lo mata inmediatamente.
`

export default content
