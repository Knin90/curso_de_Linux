const content = `
## Módulo 7 — Diagnóstico de procesos: pmap, pidstat y perf básico

### 🎯 Objetivos de aprendizaje

* Analizar el mapa de memoria de un proceso con pmap.
* Monitorear CPU, I/O y memoria por proceso con pidstat.
* Usar perf para identificar hotspots de CPU sin instrumentar el código.
* Combinar herramientas para diagnosticar problemas de rendimiento reales.

### ❓ El problema real

Tu aplicación tiene alta latencia intermitente. top muestra alta CPU pero no distingue qué función dentro del proceso la consume. strace es demasiado invasivo para producción. perf permite hacer profiling en producción con overhead mínimo (<5%), sin modificar ni reiniciar el proceso.

### 📖 pmap: mapa de memoria de un proceso

\`\`\`bash
# Vista básica
pmap 1234

# Output:
# 1234:   /usr/bin/python3 servidor.py
# Address           Kbytes     RSS   Dirty Mode  Mapping
# 0000563d4a000000     584     584       0 r---- python3.10
# 0000563d4a092000    3736    3736       0 r-x-- python3.10   ← código
# 0000563d4a45e000    1052     820       0 r---- python3.10   ← datos R/O
# 0000563d4a562000     296     296     296 rw--- python3.10   ← datos R/W
# 0000563d4b000000   51200   48320   48320 rw---   [ anon ]  ← heap
# 00007f8a20000000    4096    1024    1024 rw---   [ anon ]  ← stack thread
# ...
# 00007f8a30000000   10240    8192       0 r---- libc.so.6
# ---------------- ------- ------- -------
# total            512000  128000   65536   ← total virtual, RSS, dirty

# Vista extendida con device, inode
pmap -x 1234

# Formato: dirección, kbytes, RSS, dirty, modo, mapping
# RSS = memoria física realmente usada
# Dirty = páginas modificadas (no comparten con otros procesos)
\`\`\`

\`\`\`bash
# Encontrar qué librerías consume más memoria
pmap -x 1234 | sort -k3 -rn | head -20

# Ver solo el heap y anón (memoria del proceso sin archivos)
pmap 1234 | grep anon

# Comparar memoria de dos instancias del mismo proceso
for pid in $(pgrep node); do
    echo "PID \$pid:"
    pmap \$pid | tail -1
done
\`\`\`

### 📖 pidstat: métricas por proceso en tiempo real

pidstat (del paquete sysstat) reporta estadísticas de CPU, memoria, I/O y threads por proceso:

\`\`\`bash
# Instalar si no está disponible
sudo apt install sysstat   # Debian/Ubuntu
sudo dnf install sysstat   # RHEL/Fedora

# CPU por proceso cada 2 segundos
pidstat 2

# Output:
# 10:30:01  UID  PID  %usr %system %guest %wait  %CPU  CPU  Command
# 10:30:03 1000 1234  12.5     3.2    0.0   0.5  15.7    2  node
# 10:30:03    0 5678   0.5     8.7    0.0   0.1   9.2    0  nginx

# Solo procesos específicos
pidstat -p 1234,5678 2

# I/O por proceso (bytes leídos/escritos por segundo)
pidstat -d 2
# Output:
# PID  kB_rd/s  kB_wr/s  kB_ccwr/s  iodelay  Command
# 1234   512.0   128.0        0.0        5    postgres

# Memoria por proceso
pidstat -r 2
# Output:
# PID  minflt/s  majflt/s  VSZ    RSS   %MEM  Command
# 1234    10.5      0.0   512000 128000  3.14  node

# Threads de un proceso
pidstat -t -p 1234 2

# Todo junto: CPU + memoria + I/O
pidstat -urd -p 1234 2

# Monitorear durante 60 segundos y guardar
pidstat -urd 2 30 > /tmp/pidstat-report.txt
\`\`\`

### 📖 perf básico: profiling sin instrumentación

perf es la herramienta de profiling del kernel de Linux. Funciona con hardware performance counters.

\`\`\`bash
# Instalar
sudo apt install linux-tools-common linux-tools-generic  # Ubuntu
sudo dnf install perf                                     # Fedora/RHEL

# stat: conteo de eventos de hardware para un comando
perf stat ls /etc

# Output:
# Performance counter stats for 'ls /etc':
#        0.89 msec task-clock                  # 0.682 CPUs utilized
#           2      context-switches            # 2.245 K/sec
#           0      cpu-migrations
#         236      page-faults
#     2,847,392    cycles                      # 3.200 GHz
#     3,152,841    instructions                # 1.11  insn per cycle
#       623,420    branches
#         8,453    branch-misses               # 1.36% of all branches
#       0.001303 seconds time elapsed

# stat sobre un proceso ya en ejecución
perf stat -p 1234 sleep 10   # medir durante 10 segundos

# record: grabar un perfil de CPU (muestreo)
sudo perf record -g -p 1234 sleep 30   # grabar 30 segundos del PID 1234
sudo perf record -g ./mi-programa      # grabar un comando completo

# report: ver el perfil grabado
sudo perf report

# Output (interactivo o texto):
# Overhead  Command  Shared Object      Symbol
#   34.12%  node     node               [.] v8::internal::Heap::CollectGarbage
#   21.45%  node     libssl.so.3        [.] EVP_DigestUpdate
#   15.32%  node     node               [.] v8::internal::JSFunction::Run
\`\`\`

\`\`\`bash
# top: como top pero por función
sudo perf top -p 1234

# Eventos específicos de hardware
perf list   # ver todos los eventos disponibles

# Medir cache misses (importante para rendimiento)
sudo perf stat -e cache-references,cache-misses,instructions -p 1234 sleep 5

# Flame graph (requiere FlameGraph de Brendan Gregg)
sudo perf record -g -F 99 -p 1234 sleep 30
sudo perf script | ./FlameGraph/stackcollapse-perf.pl | ./FlameGraph/flamegraph.pl > flame.svg
\`\`\`

### 📖 Combinar herramientas: flujo de diagnóstico

\`\`\`text
SÍNTOMA: Alta latencia en la aplicación
          │
          ▼
     top / htop
     ¿Cuál proceso usa más CPU/memoria?
          │
     PID identificado
          │
          ├─── Alta CPU ──────────────────► perf top -p PID
          │                                 ¿qué función consume más?
          │
          ├─── Alta memoria ──────────────► pmap -x PID
          │                                 ¿qué segmento crece?
          │
          ├─── Alta I/O ──────────────────► pidstat -d 2
          │                                 ¿cuánto lee/escribe por segundo?
          │
          └─── Todo parece normal ────────► pidstat -urd -p PID 2
                                            buscar %wait elevado (I/O wait)
\`\`\`

\`\`\`bash
#!/usr/bin/env bash
# quick-diagnose.sh — diagnóstico rápido de un proceso

PID=\${1:?Usage: \$0 PID}
DURATION=\${2:-10}

echo "=== DIAGNÓSTICO PROCESO \$PID ==="
echo ""

echo "--- Info básica ---"
cat /proc/"\$PID"/status | grep -E "Name|State|VmRSS|VmSize|Threads"

echo ""
echo "--- Límites ---"
cat /proc/"\$PID"/limits | grep -E "open files|processes"

echo ""
echo "--- FDs abiertos ---"
fd_count=$(ls /proc/"\$PID"/fd 2>/dev/null | wc -l)
echo "Descriptores de archivo: \$fd_count"

echo ""
echo "--- Top conexiones de red ---"
ss -tp | grep "pid=\$PID"

echo ""
echo "--- pidstat durante \${DURATION}s ---"
pidstat -urd -p "\$PID" 2 $(( DURATION / 2 ))

echo ""
echo "--- Memoria por segmento (top 10) ---"
pmap -x "\$PID" | sort -k3 -rn | head -10
\`\`\`

### 📋 Lo que debes recordar

* pmap muestra la distribución de memoria virtual y física (RSS) por segmento/librería.
* pidstat monitorea CPU, I/O y memoria por proceso con overhead mínimo.
* perf stat mide eventos de hardware; perf record + report identifica hotspots de CPU.
* El flujo es: top para identificar → pidstat para confirmar → perf para profundizar.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre lo que muestra pmap y lo que muestra /proc/PID/status sobre memoria?
2. Tu proceso tiene alto %wait en pidstat -u. ¿Qué indica esto y qué herramienta usarías para confirmar?
3. ¿Por qué perf es preferible a strace para profiling en producción?

---

1. /proc/PID/status da números totales (VmRSS = total de memoria física del proceso). pmap desglosa ese total por región de memoria: qué porción viene del ejecutable, del heap, del stack, de cada librería .so. pmap es esencial para entender por qué VmRSS es tan alto — te dice exactamente qué librería o qué región de heap lo causa.
2. %wait en pidstat indica el porcentaje de tiempo que el proceso pasa esperando I/O (CPU en espera de disco). Se confirma con \`pidstat -d 2\` para ver kB/s de lectura y escritura, y con \`iotop\` para ver en tiempo real qué proceso está haciendo más I/O. También útil: \`/proc/PID/io\` para ver bytes leídos del disco real vs. caché.
3. strace intercepta cada syscall usando ptrace, lo que puede reducir el rendimiento del proceso hasta en un 50-100x — inaceptable en producción. perf usa hardware performance counters del procesador con muestreo estadístico, típicamente <5% de overhead. Además, perf trabaja a nivel de función (símbolos), no de syscall individual, dando una vista más útil de los hotspots.
`

export default content
