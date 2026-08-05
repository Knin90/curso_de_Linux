const content = `
## Módulo 5 — cgroups v2: control de recursos del sistema

### 🎯 Objetivos de aprendizaje

* Entender qué son los cgroups y por qué existen.
* Navegar la jerarquía de cgroups v2 en /sys/fs/cgroup.
* Limitar CPU, memoria e I/O de procesos con cgroups.
* Comprender cómo systemd usa cgroups internamente.

### ❓ El problema real

Tienes un servidor que aloja múltiples aplicaciones. Una de ellas — un proceso de generación de reportes — a veces consume toda la RAM disponible y el kernel comienza a matar otros procesos por OOM (Out of Memory). Con cgroups puedes imponer un límite duro de memoria a ese proceso: si supera 2GB, el kernel lo mata a él y no a tu base de datos.

### 📖 ¿Qué son los cgroups?

Los control groups (cgroups) son una característica del kernel que permite organizar procesos en grupos jerárquicos y aplicar políticas de recursos a cada grupo.

\`\`\`text
SIN CGROUPS:                    CON CGROUPS:
────────────                    ────────────
Sistema                         Sistema
├── Proceso A (50% CPU)         ├── grupo "web"     (max 40% CPU)
├── Proceso B (40% CPU)         │   ├── nginx
├── Proceso C (9% CPU)          │   └── node
└── Proceso D (1% CPU)          ├── grupo "db"      (max 50% CPU)
                                │   └── postgres
Cualquier proceso puede         └── grupo "batch"   (max 10% CPU)
consumir todo el sistema.           └── generador-reportes
\`\`\`

cgroups v2 (unified hierarchy) es la versión actual, activa por defecto en distribuciones modernas (RHEL 9+, Ubuntu 22.04+).

### 📖 La jerarquía en /sys/fs/cgroup

\`\`\`bash
# Ver la jerarquía de cgroups del sistema (systemd la gestiona)
ls /sys/fs/cgroup/
# cgroup.controllers  cgroup.max.descendants  memory.pressure  system.slice
# cgroup.events       cgroup.procs            misc.capacity    user.slice
# cgroup.freeze       cgroup.stat             ...

# Ver el árbol completo
systemd-cgls | head -40

# Ver a qué cgroup pertenece un proceso
cat /proc/1234/cgroup
# 0::/system.slice/nginx.service

# Ver el cgroup del proceso actual
cat /proc/\$\$/cgroup
# 0::/user.slice/user-1000.slice/session-3.scope
\`\`\`

\`\`\`bash
# Ver todos los controladores disponibles
cat /sys/fs/cgroup/cgroup.controllers
# cpuset cpu io memory hugetlb pids rdma misc
\`\`\`

### 📖 Crear y usar un cgroup v2 manualmente

\`\`\`bash
# Crear un cgroup
sudo mkdir /sys/fs/cgroup/mi-app

# Habilitar controladores en el cgroup hijo
echo "+cpu +memory +io" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Configurar límite de memoria: 512 MB máximo
echo "536870912" | sudo tee /sys/fs/cgroup/mi-app/memory.max
# 536870912 bytes = 512 MB

# Configurar límite de CPU: 50% de un core (50000 de 100000 microsegundos)
echo "50000 100000" | sudo tee /sys/fs/cgroup/mi-app/cpu.max
#        ^        ^
#    quota    period (microsegundos)

# Mover un proceso al cgroup
echo 1234 | sudo tee /sys/fs/cgroup/mi-app/cgroup.procs

# Ejecutar un proceso directamente en el cgroup
sudo systemd-run --scope -p MemoryMax=512M -p CPUQuota=50% ./mi-proceso
\`\`\`

### 📖 Archivos de control importantes

\`\`\`bash
# MEMORIA
cat /sys/fs/cgroup/mi-app/memory.max      # límite duro (OOM killer actúa aquí)
cat /sys/fs/cgroup/mi-app/memory.high     # límite suave (throttling, sin OOM)
cat /sys/fs/cgroup/mi-app/memory.current  # uso actual
cat /sys/fs/cgroup/mi-app/memory.stat     # estadísticas detalladas

# CPU
cat /sys/fs/cgroup/mi-app/cpu.max         # quota period (50000 100000 = 50%)
cat /sys/fs/cgroup/mi-app/cpu.weight      # peso relativo (1-10000, default 100)
cat /sys/fs/cgroup/mi-app/cpu.stat        # estadísticas de CPU

# I/O (necesita identificar el dispositivo)
ls -la /dev/sda   # encontrar MAJOR:MINOR del disco
# brw-rw---- 1 root disk 8, 0 ...  → 8:0

echo "8:0 rbps=52428800 wbps=52428800" | sudo tee /sys/fs/cgroup/mi-app/io.max
#                 ^               ^
#          50MB/s lectura   50MB/s escritura

cat /sys/fs/cgroup/mi-app/io.stat    # estadísticas de I/O

# PIDS (límite de procesos/threads)
echo "50" | sudo tee /sys/fs/cgroup/mi-app/pids.max
cat /sys/fs/cgroup/mi-app/pids.current
\`\`\`

### 📖 cgroups a través de systemd (la forma correcta en producción)

En producción, la forma recomendada es usar systemd en lugar de manipular /sys/fs/cgroup directamente:

\`\`\`bash
# En el archivo .service
sudo systemctl edit mi-app

# Agregar:
[Service]
MemoryMax=2G           # límite duro de memoria
MemoryHigh=1.5G        # límite suave (empezar a throttlear aquí)
CPUQuota=150%          # 150% = hasta 1.5 cores
CPUWeight=100          # peso relativo (default 100)
IOWeight=100           # peso de I/O relativo
IOReadBandwidthMax=/dev/sda 100M    # 100 MB/s lectura
IOWriteBandwidthMax=/dev/sda 50M    # 50 MB/s escritura
TasksMax=512           # máximo de procesos/threads

sudo systemctl daemon-reload
sudo systemctl restart mi-app
\`\`\`

\`\`\`bash
# Ver los límites actuales de un servicio
systemctl status mi-app
# ● mi-app.service
#    Memory: 1.2G (max: 2.0G, high: 1.5G)
#    CPU: 45.2%

# Ver estadísticas de cgroup de un servicio
systemd-cgtop | head -20
\`\`\`

### 📖 Diagnóstico de OOM killer

Cuando el kernel mata procesos por falta de memoria, deja rastros:

\`\`\`bash
# Ver eventos OOM en el kernel log
dmesg | grep -i "oom\|killed process" | tail -20

# Con journalctl
journalctl -k | grep -i "oom\|killed process"

# Output típico:
# kernel: mi-app[12345] is being killed
# kernel: Out of memory: Kill process 12345 (mi-app) score 987 or sacrifice child
# kernel: Killed process 12345 (mi-app) total-vm:2097152kB, anon-rss:1048576kB
\`\`\`

\`\`\`bash
# Desactivar OOM killer para un proceso crítico (¡peligroso!)
echo -17 | sudo tee /proc/1234/oom_adj     # legacy
echo -1000 | sudo tee /proc/1234/oom_score_adj  # moderno (-1000 = nunca matar)

# Hacer que el OOM killer prefiera matar este proceso antes que otros
echo 1000 | sudo tee /proc/1234/oom_score_adj  # (1000 = matar primero)
\`\`\`

### 📋 Lo que debes recordar

* cgroups v2 es el mecanismo del kernel para aislar recursos entre grupos de procesos.
* En producción, usa systemd (MemoryMax, CPUQuota, etc.) en lugar de manipular /sys/fs/cgroup directamente.
* memory.max es el límite duro — superarlo activa el OOM killer dentro del cgroup.
* memory.high es el límite suave — el proceso se throttlea pero no muere; útil para dar advertencia temprana.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre memory.max y memory.high en cgroups v2?
2. ¿Por qué es mejor configurar los límites de cgroups a través de systemd en lugar de escribir directamente en /sys/fs/cgroup?
3. Tu servicio de reportes tiene CPUQuota=50%. Tienes un servidor de 4 cores. ¿Cuántos cores puede usar como máximo ese servicio?

---

1. memory.high es el límite suave: cuando el uso de memoria supera este valor, el kernel empieza a reclamar memoria agresivamente (swapping, throttling), pero el proceso sigue vivo. memory.max es el límite duro: superarlo activa el OOM killer dentro del cgroup, matando procesos del grupo. El patrón recomendado es poner memory.high un 25% por debajo de memory.max para tener advertencia antes de la muerte.
2. Systemd se encarga de: (1) persistir los límites entre reinicios del servicio, (2) reconstruir el cgroup si se destruye, (3) limpiar el cgroup al parar el servicio, (4) integrar las métricas en journald y systemctl status. Escribir en /sys/fs/cgroup directamente es volátil: los cambios se pierden al reiniciar o al reinicar el servicio.
3. CPUQuota=50% significa 50% de un core, no del total del sistema. Con 4 cores, el servicio puede usar máximo 0.5 cores. Para usar 2 cores completos habría que poner CPUQuota=200%.
`

export default content
