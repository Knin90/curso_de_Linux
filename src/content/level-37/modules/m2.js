const content = `
## Módulo 2 — Sistema no responde o carga alta: diagnóstico paso a paso

### 🎯 Objetivos de aprendizaje

* Interpretar correctamente el load average y su relación con los núcleos de CPU disponibles.
* Usar \`top\`/\`htop\` para distinguir entre carga por CPU, por I/O y por procesos zombis.
* Identificar procesos huérfanos y zombis, y entender por qué unos son inofensivos y otros no.
* Diagnosticar un sistema que no responde a SSH sin acceso a consola física.
* Aplicar una secuencia de comandos rápida para "carga alta" antes de escalar el incidente.

### ❓ El problema real

Una alerta de monitoreo indica "load average: 45.2" en un servidor de 4 núcleos. El equipo de guardia entra en pánico y reinicia el servidor sin investigar. Al reiniciar, se pierden las trazas de qué proceso causaba la carga, y el problema reaparece dos horas después porque la causa (un proceso en estado D esperando I/O de un disco con fallos SMART) sigue ahí. Un load average alto no siempre significa "CPU saturada": puede significar procesos esperando disco, red, o incluso un montón de procesos zombis mal cosechados. Diagnosticar correctamente antes de reaccionar evita reinicios inútiles y pérdida de evidencia.

### 📖 Interpretar el load average correctamente

\`uptime\` y \`/proc/loadavg\` muestran tres números: promedio de 1, 5 y 15 minutos de procesos en estado "runnable" (ejecutándose o esperando CPU) más procesos en estado "uninterruptible sleep" (esperando I/O).

\`\`\`bash
uptime
# 14:32:10 up 12 days,  3:14,  2 users,  load average: 8.21, 6.45, 4.02

nproc
# 4   ← número de núcleos lógicos disponibles
\`\`\`

El load average se interpreta relativo al número de núcleos, no en términos absolutos.

\`\`\`text
LOAD AVG / NÚCLEOS      INTERPRETACIÓN
─────────────────────────────────────────────────
< 1.0 por núcleo        Sistema con margen, sin saturación
≈ 1.0 por núcleo         Sistema al límite de su capacidad de CPU
> 1.0 por núcleo         Procesos en cola esperando CPU o I/O

# Ejemplo: load average 8.21 en un sistema de 4 núcleos
# 8.21 / 4 = 2.05  → el sistema está sobrecargado ~2x su capacidad
\`\`\`

La tendencia entre los tres valores (1, 5, 15 min) también informa: si el valor de 1 minuto es mucho más bajo que el de 15, la carga ya está bajando; si es mucho más alto, la carga está en aumento.

### 📖 Distinguir carga por CPU vs. carga por I/O

El load average incluye tanto procesos esperando CPU (estado \`R\`) como procesos esperando I/O sin poder ser interrumpidos (estado \`D\`). Confundir ambos lleva a diagnósticos equivocados.

\`\`\`bash
# top: la columna %CPU y el estado (columna S) distinguen el tipo de carga
top
# %Cpu(s):  85.2 us,  3.1 sy,  0.0 ni,  8.4 id,  3.0 wa,  0.0 hi,  0.3 si
#            ^usuario  ^sistema           ^idle   ^wait I/O

# us alto  → procesos consumiendo CPU real (cálculo, procesamiento)
# sy alto  → el kernel está haciendo mucho trabajo (syscalls, context switches)
# wa alto  → CPU esperando a que termine I/O de disco (disco lento o saturado)
# id alto  → CPU ociosa a pesar del load alto → sospechar procesos en estado D
\`\`\`

\`\`\`bash
# Listar procesos en estado D (uninterruptible sleep, esperando I/O)
ps aux | awk '$8 ~ /D/ {print}'

# Si hay muchos procesos en D, la causa probable es:
# - Disco con fallos (revisar: smartctl -a /dev/sda)
# - NFS remoto no disponible
# - Disco saturado de I/O (revisar: iostat -x 1)
\`\`\`

### 📖 Procesos zombis y huérfanos: cuándo importan

\`\`\`bash
# Listar procesos zombis (estado Z)
ps aux | awk '$8 ~ /Z/ {print}'
# o
ps -eo pid,ppid,state,cmd | grep -w Z
\`\`\`

\`\`\`text
TIPO       DEFINICIÓN                                    ¿PROBLEMA?
─────────────────────────────────────────────────────────────────────────────
Zombi (Z)   Proceso terminado cuyo padre no leyó su      Un par de zombis: no.
            código de salida (wait()); solo consume       Miles de zombis: agotan
            una entrada en la tabla de procesos, 0 CPU     la tabla de PIDs (ver
            y 0 memoria real.                              /proc/sys/kernel/pid_max)

Huérfano    Proceso cuyo padre murió antes que él;         No, es normal: init/systemd
            el kernel lo reasigna a PID 1 (init/systemd)   lo adopta y lo gestiona.
\`\`\`

Un zombi no se puede "matar" con \`kill -9\` porque ya está muerto; el problema es el proceso padre que no está haciendo \`wait()\`. La solución real es identificar y corregir (o reiniciar) el proceso padre.

\`\`\`bash
# Encontrar el padre de un proceso zombi
ps -o ppid= -p <PID_ZOMBI>
# Si el padre está mal programado y acumula zombis indefinidamente,
# la corrección de fondo es en el código de la aplicación, no en el sistema.
\`\`\`

### 📖 Diagnóstico cuando el sistema no responde ni a SSH

Cuando ni siquiera SSH responde, el sistema puede estar tan saturado que no puede aceptar nuevas conexiones, aunque los procesos existentes sigan corriendo.

\`\`\`bash
# Si tienes acceso a consola serie/IPMI/hipervisor:
# Magic SysRq (si está habilitado) para diagnóstico de emergencia sin reiniciar
echo t > /proc/sysrq-trigger   # vuelca el estado de todas las tareas al log del kernel
echo w > /proc/sysrq-trigger   # vuelca tareas en estado D (bloqueadas)

# Si solo hay acceso remoto intermitente, priorizar comandos baratos y rápidos:
uptime                          # el más liviano posible
cat /proc/loadavg               # lectura directa sin forkear procesos nuevos

# Evitar comandos pesados (top interactivo, htop) en un sistema ya saturado:
# usar variantes de una sola pasada
top -bn1 | head -20
\`\`\`

### 📖 Secuencia rápida recomendada ante "carga alta"

\`\`\`bash
uptime                              # 1. confirmar el load average y su tendencia
nproc                               # 2. contexto: núcleos disponibles
top -bn1 -o %CPU | head -15         # 3. ¿qué procesos consumen más CPU?
ps aux | awk '$8 ~ /D|Z/'           # 4. ¿hay procesos en D (I/O) o Z (zombis)?
vmstat 1 5                          # 5. tendencia de CPU/memoria/IO en 5 segundos
iostat -x 1 3                       # 6. si hay wa alto: ¿qué disco está saturado?
\`\`\`

### 📋 Lo que debes recordar

* El load average se interpreta dividido entre el número de núcleos (\`nproc\`), no como número absoluto.
* Load alto con CPU idle alto (columna \`id\` en top) apunta a procesos en estado D esperando I/O, no a saturación de CPU.
* Los procesos zombis (Z) no consumen recursos reales; el problema real está en el proceso padre que no hace \`wait()\`.
* Los procesos huérfanos son normales: systemd/init los adopta automáticamente.
* Ante un sistema casi sin respuesta, usar comandos baratos (\`uptime\`, \`top -bn1\`) en vez de herramientas interactivas pesadas.
* Nunca reiniciar como primer paso: destruye la evidencia necesaria para encontrar la causa raíz.

### 🧪 Autoevaluación

1. Un servidor de 8 núcleos reporta load average 6.0. ¿Está sobrecargado?
2. \`top\` muestra CPU idle al 70% pero el load average es de 12 en un sistema de 4 núcleos. ¿Qué se debe investigar?
3. ¿Por qué no se puede eliminar un proceso zombi con \`kill -9\`?

---

1. No necesariamente. 6.0 / 8 núcleos = 0.75 por núcleo, lo cual está por debajo del límite de saturación (1.0). El sistema tiene margen todavía, aunque conviene observar la tendencia.
2. Se debe investigar procesos en estado D (uninterruptible sleep) esperando I/O, típicamente con \`ps aux | awk '$8 ~ /D/'\`, \`iostat -x 1\` para ver saturación de disco, o \`smartctl\` para descartar fallos de hardware, ya que el load alto con CPU idle indica que los procesos están bloqueados esperando recursos distintos a la CPU.
3. Porque un proceso zombi ya terminó su ejecución; no hay proceso vivo al cual enviarle una señal. Lo único que queda es su entrada en la tabla de procesos con el código de salida pendiente de ser leído por el proceso padre mediante \`wait()\`. La solución es corregir o reiniciar el proceso padre, no el zombi.
`

export default content
