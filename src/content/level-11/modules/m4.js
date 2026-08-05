const content = `
## Módulo 4 — Monitoreo de recursos: top, htop, vmstat e iostat

### 🎯 Objetivos de aprendizaje

* Interpretar la salida de top y htop para diagnosticar problemas de CPU y memoria.
* Usar vmstat para detectar presión de memoria y actividad de swap.
* Diagnosticar cuellos de botella de I/O con iostat.
* Identificar los comandos correctos para cada tipo de problema de rendimiento.

### ❓ El problema real

El servidor va lento. Los usuarios se quejan. ¿Es la CPU? ¿La memoria? ¿El disco? ¿La red? Cada recurso tiene su herramienta. Lanzar \`top\` y mirar un número alto sin entender qué significa lleva a diagnósticos incorrectos y "soluciones" que no resuelven nada. Este módulo te da el mapa: qué herramienta usar, qué número mirar y qué significa.

### 📖 top: vista general del sistema

\`\`\`bash
top
\`\`\`

\`\`\`text
top - 14:23:05 up 12 days,  3:45,  2 users,  load average: 0.52, 0.48, 0.51
Tasks: 187 total,   1 running, 186 sleeping,   0 stopped,   0 zombie
%Cpu(s):  5.2 us,  1.1 sy,  0.0 ni, 93.2 id,  0.3 wa,  0.0 hi,  0.2 si,  0.0 st
MiB Mem :   7823.7 total,   1204.3 free,   4312.8 used,   2306.6 buff/cache
MiB Swap:   2048.0 total,   1891.2 free,    156.8 used.   3118.9 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 1234 www-data  20   0  512m   128m    12m S   8.3   1.6   2:31.22 nginx
 5678 postgres  20   0    2.1g  512m    64m S   3.2   6.4  12:44.01 postgres
\`\`\`

**Línea de carga (load average):** 3 números = últimos 1, 5 y 15 minutos. En un sistema con 4 CPUs, carga 4.0 = 100% ocupado, carga >4.0 = hay procesos esperando CPU.

**Campos de CPU:**
\`\`\`text
us  — user space (tu código)
sy  — system (kernel)
wa  — iowait: CPU esperando I/O de disco ← problema de disco
hi  — hardware interrupts
si  — software interrupts
st  — steal time (en VMs: CPU robada por el hypervisor)
\`\`\`

**Memoria:**
\`\`\`text
buff/cache  — usado por el kernel como caché de disco (RECLAIMABLE)
avail Mem   — memoria disponible real (incluye lo que el kernel puede liberar)
\`\`\`

Un servidor con 500MB "free" pero 6GB de "buff/cache" tiene plenty de memoria. El número que importa es **avail Mem**.

**Comandos interactivos en top:**
\`\`\`text
k      — kill un proceso (te pide el PID)
r      — renice (cambiar prioridad)
M      — ordenar por memoria
P      — ordenar por CPU
u      — filtrar por usuario
1      — ver CPUs individuales
q      — salir
\`\`\`

### 📖 htop: top visual y moderno

\`\`\`bash
sudo apt install htop    # si no está instalado
htop
\`\`\`

Ventajas sobre top:
- Barras de CPU y memoria en tiempo real
- Árbol de procesos (F5)
- Navegación con flechas, kill sin escribir PID
- Búsqueda incremental (F3)
- Filtros (F4)

**Flags útiles:**

\`\`\`bash
htop -u nginx          # solo procesos del usuario nginx
htop -p 1234,5678      # solo esos PIDs
htop -d 10             # actualizar cada 1 segundo (defecto: 1.5s; -d en décimas)
\`\`\`

### 📖 vmstat: memoria, swap y actividad del sistema

\`\`\`bash
# Snapshot actual
vmstat

# Actualizar cada 2 segundos, 10 veces
vmstat 2 10
\`\`\`

\`\`\`text
procs ─────── memory ───────────── swap ──── io ─── system ──── cpu ─────
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa
 1  0    156  1204   342  1964     0    0     2    18  420  890  5  1 93  1
\`\`\`

**Columnas críticas:**

\`\`\`text
r    — procesos en cola de ejecución (>nCPUs = saturación de CPU)
b    — procesos bloqueados en I/O

si   — swap in (MB/s): memoria leyéndose desde swap
so   — swap out (MB/s): memoria escribiéndose a swap
      ← si si/so > 0 constantemente: PROBLEMA DE MEMORIA

bi   — bloques leídos de disco por segundo
bo   — bloques escritos a disco por segundo

wa   — % CPU en iowait ← si >20% hay cuello de botella de I/O
\`\`\`

### 📖 iostat: diagnóstico de I/O de disco

\`\`\`bash
sudo apt install sysstat    # incluye iostat, sar, mpstat

# Resumen de I/O
iostat

# Actualizar cada 2 segundos (columnas de disco en kB/s)
iostat -x 2

# Solo el dispositivo sda
iostat -x sda 2
\`\`\`

\`\`\`text
Device     r/s     w/s  rkB/s  wkB/s  await  %util
sda       12.3    45.6   156    892    2.4    23.1
nvme0n1   89.2   120.4  1240   3892    0.8     8.3
\`\`\`

**Columnas críticas con \`-x\`:**

\`\`\`text
r/s, w/s     — lecturas/escrituras por segundo
rkB/s, wkB/s — throughput en kB/s
await        — tiempo promedio de espera por operación (ms)
              ← >20ms en HDD es normal, >5ms en SSD es señal de problema
%util        — % de tiempo que el dispositivo está ocupado
              ← >80% = saturación de disco
\`\`\`

### 📖 Árbol de diagnóstico de rendimiento

\`\`\`text
EL SERVIDOR VA LENTO
        │
        ▼
¿load average > nCPUs?
├── SÍ ──▶ top/htop: ¿qué proceso consume CPU?
│              ├── us alto: código de aplicación
│              ├── sy alto: demasiadas llamadas al sistema
│              └── wa alto: esperando disco → ir a iostat
│
└── NO ──▶ ¿memoria disponible baja o swap activo?
               ├── SÍ (vmstat si/so > 0) ──▶ problema de memoria
               │      ├── ¿proceso con RES enorme? → leak o config
               │      └── ¿muchos procesos? → ajustar pool size
               │
               └── NO ──▶ iostat: ¿%util alto o await alto?
                              ├── SÍ ──▶ cuello de botella de disco
                              └── NO ──▶ problema de red o aplicación
\`\`\`

### 📋 Lo que debes recordar

* **load average** se interpreta relativo al número de CPUs: carga 2.0 en 4 CPUs = 50%, en 1 CPU = 200%.
* **buff/cache** es memoria reciclable. El número real disponible es **avail Mem** en top.
* **iowait** en top/vmstat + **%util** alto en iostat = cuello de botella de disco.
* **vmstat si/so > 0** constante = el sistema está paginando a disco = necesitas más RAM.

### 🧪 Autoevaluación

1. top muestra load average 6.2 en un servidor de 4 CPUs y \`wa\` = 18%. ¿Cuál es el diagnóstico probable?
2. vmstat muestra \`si=45 so=23\` constantemente. ¿Qué significa y qué problema indica?
3. ¿Qué columna de iostat indica que el disco está saturado?

---

1. El servidor está **sobrecargado**: load 6.2 > 4 CPUs significa que hay 2.2 CPUs worth de procesos esperando. El \`wa\` = 18% indica que parte de la carga es I/O — los procesos están bloqueados esperando disco. Diagnóstico: cuello de botella de I/O que satura también la cola de CPU.
2. \`si\` = swap in (45 páginas/s leyéndose desde swap) y \`so\` = swap out (23 páginas/s escribiéndose a swap). Indica que el sistema tiene **presión de memoria**: está moviendo activamente páginas entre RAM y disco swap, lo que degrada el rendimiento significativamente.
3. **\`%util\`** — cuando supera el 80-90% de forma sostenida, el dispositivo está saturado. También hay que revisar \`await\`: tiempos altos con \`%util\` bajo pueden indicar problemas de latencia del hardware.
`

export default content
