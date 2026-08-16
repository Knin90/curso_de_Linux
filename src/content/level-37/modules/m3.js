const content = `
## Módulo 3 — Uso de CPU y memoria: identificar y resolver cuellos de botella

### 🎯 Objetivos de aprendizaje

* Leer la salida de \`vmstat\` y \`free\` para diagnosticar presión de memoria real.
* Entender la diferencia entre memoria "used", "available", "cached" y "buffers".
* Explicar cómo funciona el OOM killer y cómo interpretar sus mensajes en los logs.
* Diagnosticar swapping excesivo y su impacto en el rendimiento.
* Identificar procesos individuales responsables de consumo excesivo de CPU o memoria.

### ❓ El problema real

Un servidor de aplicaciones empieza a responder lento de forma intermitente. \`free -h\` muestra "available: 200Mi" de 16GB totales, lo que parece alarmante. El administrador entra en pánico y aumenta la RAM del servidor sin investigar más. El problema persiste: horas después, el kernel mata el proceso de la base de datos con el OOM killer, causando una caída total. La causa real era un memory leak en un proceso worker que crecía sin límite hasta agotar toda la memoria disponible, no una falta de capacidad. Aumentar RAM sin diagnosticar solo retrasa el problema.

### 📖 free -h: qué significa realmente cada columna

\`\`\`bash
free -h
#               total        used        free      shared  buff/cache   available
# Mem:           15Gi       4.2Gi       200Mi       120Mi        11Gi        10Gi
# Swap:         2.0Gi       512Mi       1.5Gi
\`\`\`

\`\`\`text
COLUMNA        SIGNIFICADO
─────────────────────────────────────────────────────────────────────────────
used            Memoria activamente usada por procesos (no cuenta caché)
free            Memoria completamente sin usar (normalmente baja, y ESTÁ BIEN)
buff/cache      Memoria usada por el kernel para cachear archivos y buffers
                de bloque; se libera automáticamente si una app la necesita
available       ESTIMACIÓN de memoria disponible para nuevas apps sin
                generar swap, incluyendo la parte reclamable de buff/cache
\`\`\`

El error más común es alarmarse por "free" bajo. Linux usa memoria libre para cachear archivos porque memoria sin usar es memoria desperdiciada; esa caché se libera instantáneamente cuando una aplicación la necesita. La columna que realmente importa es \`available\`.

\`\`\`bash
# Regla práctica: si "available" es bajo (cercano a 0) y hay swapping activo,
# ahí sí hay presión de memoria real.
free -h | awk '/Mem:/ {print "Available:", $7}'
\`\`\`

### 📖 vmstat: tendencia en tiempo real

\`\`\`bash
vmstat 1 5
# procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
#  r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
#  2  0  524288 204800 102400 8912000    0    0    45   120 1200 2400 60 15 20  5  0
\`\`\`

\`\`\`text
COLUMNA   SIGNIFICADO
─────────────────────────────────────────────────────────────────────
r          procesos en cola esperando CPU (runnable)
b          procesos bloqueados en I/O (uninterruptible)
swpd       memoria total en swap
si / so    swap-in / swap-out por segundo — si estos NO son 0 de forma
           sostenida, el sistema está haciendo swapping activo (mala señal)
us / sy    % CPU en modo usuario / modo sistema (kernel)
wa         % CPU esperando I/O
\`\`\`

Un \`si\`/\`so\` distinto de cero de forma puntual es normal (el kernel gestiona memoria dinámicamente). Un \`si\`/\`so\` sostenido y alto indica que el sistema no tiene suficiente RAM para su carga de trabajo actual y está intercambiando páginas activamente con disco, lo cual es orden de magnitud más lento que la RAM.

### 📖 Identificar el proceso responsable

\`\`\`bash
# Top procesos por memoria residente (RSS)
ps aux --sort=-%mem | head -10

# Top procesos por CPU
ps aux --sort=-%cpu | head -10

# Memoria real de un proceso específico, desglosada
cat /proc/<PID>/status | grep -E 'VmRSS|VmSwap|VmSize'
# VmRSS   → memoria física realmente usada (lo que importa)
# VmSwap  → cuánta memoria de este proceso está en swap
# VmSize  → memoria virtual reservada (puede ser mucho mayor que la real)

# smem para una vista más precisa (descuenta memoria compartida entre procesos)
smem -tk
\`\`\`

### 📖 El OOM killer: cómo funciona y cómo leerlo

Cuando el sistema se queda sin memoria física y sin swap disponible, el kernel invoca al Out-Of-Memory killer, que elige un proceso para terminar y así liberar memoria antes de que el sistema completo colapse.

\`\`\`bash
# Buscar eventos de OOM en los logs
journalctl -k | grep -i "out of memory"
dmesg -T | grep -i "killed process"

# Salida típica:
# Out of memory: Killed process 4821 (mysqld) total-vm:8123456kB,
#   anon-rss:6291456kB, file-rss:0kB, shmem-rss:0kB, UID:112
\`\`\`

El kernel elige la víctima usando un puntaje \`oom_score\` (0-1000): procesos que consumen más memoria y tienen menor prioridad reciben puntajes más altos y son los primeros candidatos.

\`\`\`bash
# Ver el oom_score de un proceso
cat /proc/<PID>/oom_score

# Proteger un proceso crítico de ser elegido por el OOM killer
# (oom_score_adj va de -1000 a 1000; -1000 = nunca elegible)
echo -500 > /proc/<PID>/oom_score_adj
\`\`\`

Un evento de OOM killer NO es la causa raíz: es la consecuencia de que algo consumió más memoria de la disponible. Investigar qué proceso creció y por qué (memory leak, carga inesperada, configuración de límites incorrecta) es el verdadero diagnóstico.

### 📖 Cuellos de botella de CPU: cuándo escalar vs. optimizar

\`\`\`bash
# ¿Un solo proceso satura un núcleo, o la carga está distribuida?
top -bn1 -o %CPU | head -5

# ¿El proceso está limitado por un solo hilo (un núcleo al 100%,
# resto ocioso) o usa múltiples hilos correctamente?
ps -eLf | grep <PID> | wc -l    # número de hilos del proceso

# pidstat para desglose histórico por proceso
pidstat -u 1 5
\`\`\`

Si un proceso satura un solo núcleo mientras los demás están ociosos, el problema no se resuelve agregando más núcleos (el proceso no los puede usar); requiere optimización del código o paralelización.

### 📋 Lo que debes recordar

* "free" bajo en \`free -h\` no es preocupante por sí solo; lo que importa es la columna \`available\`.
* \`buff/cache\` es memoria reclamable automáticamente por el kernel, no memoria "perdida".
* \`si\`/\`so\` sostenidos y distintos de cero en \`vmstat\` indican swapping activo real, señal de presión de memoria.
* El OOM killer es una consecuencia, no una causa raíz: hay que investigar qué proceso agotó la memoria y por qué.
* Un proceso limitado a un solo núcleo no se beneficia de agregar más CPUs; requiere optimización o paralelización.
* \`ps aux --sort=-%mem\` y \`--sort=-%cpu\` son los comandos más rápidos para identificar al responsable.

### 🧪 Autoevaluación

1. \`free -h\` muestra "free: 300Mi" pero "available: 9Gi" en un sistema de 16GB. ¿Hay un problema de memoria?
2. En \`vmstat 1 5\` las columnas \`si\` y \`so\` muestran valores altos y sostenidos en cada línea. ¿Qué indica esto?
3. El log muestra "Out of memory: Killed process (mysqld)". ¿Es esto la causa raíz del incidente?

---

1. No. "free" bajo es esperado y normal en Linux porque el kernel usa la memoria libre como caché de archivos. La columna relevante es "available" (9Gi), que indica que hay amplio margen de memoria reclamable disponible para nuevas aplicaciones.
2. Indica swapping activo y sostenido: el sistema está intercambiando páginas de memoria con el disco de forma constante porque no tiene suficiente RAM física para su carga de trabajo actual. Esto degrada gravemente el rendimiento porque el disco es órdenes de magnitud más lento que la RAM.
3. No. El OOM killer es una consecuencia del sistema quedándose sin memoria, no la causa raíz. La causa raíz es la razón por la que la memoria se agotó (memory leak en la aplicación, carga inesperada, límites de memoria mal configurados) y requiere investigación adicional más allá del propio evento de OOM.
`

export default content
