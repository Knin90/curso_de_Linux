const content = `
## Módulo 2 — Prioridades: nice, renice y el scheduler de Linux

### 🎯 Objetivos de aprendizaje

* Entender la diferencia entre prioridad de proceso y valor nice.
* Lanzar y re-priorizar procesos con nice y renice.
* Comprender cómo el CFS (Completely Fair Scheduler) distribuye CPU.
* Usar chrt para procesos con tiempo real (RT scheduling).

### ❓ El problema real

Tienes un servidor con un proceso de backup que usa el 100% de CPU durante horas, dejando lenta tu aplicación principal. No quieres matar el backup, pero tampoco quieres que degrada la experiencia de los usuarios. La solución es ajustar la prioridad del backup para que el scheduler de Linux le dé menos CPU cuando hay trabajo más importante que hacer.

### 📖 El valor nice y la prioridad

\`\`\`text
VALOR NICE    PRIORIDAD EFECTIVA    QUIÉN PUEDE USARLO
────────────────────────────────────────────────────────
-20           más alta              solo root
-19 a -1      alta                  solo root (bajar nice)
  0           normal (por defecto)  cualquier usuario
  1 a 19      baja                  cualquier usuario
 19           más baja              cualquier usuario

Relación:  prioridad_efectiva = 20 + valor_nice
           nice -20 → prioridad 0 (más alta)
           nice   0 → prioridad 20 (normal)
           nice  19 → prioridad 39 (más baja)
\`\`\`

Un proceso con nice alto (19) aún obtiene CPU, pero solo cuando no hay nadie más que quiera usarla. Es CPU "oportunista": perfecta para tareas en background.

### 📖 Comandos nice y renice

\`\`\`bash
# nice — lanzar un proceso con valor nice específico
nice -n 19 ./backup.sh              # lanzar con prioridad mínima
nice -n 10 make -j8                 # compilación con prioridad reducida
nice -n -5 /usr/local/bin/servidor  # prioridad alta (requiere root)

# Sin argumento, nice incrementa en 10 (de 0 a 10)
nice ./script.sh

# renice — cambiar la prioridad de un proceso en ejecución
renice -n 19 -p 1234               # cambiar PID 1234 a nice 19
renice -n 19 -p 1234 5678          # varios PIDs
renice -n 5 -u deploy              # todos los procesos del usuario deploy
renice -n 19 -g 1001               # todos los procesos del grupo GID 1001

# Ver el nice de los procesos
ps -eo pid,ni,pri,cmd --sort=ni | head -20
top   # columna NI muestra el valor nice, PR muestra prioridad efectiva
\`\`\`

### 📖 Cómo leer la columna PR en top

\`\`\`text
top — tasks: 245 total

  PID USER  PR  NI    VIRT    RES  %CPU  COMMAND
 1234 root  20   0   12.3g  1.2g  45.2  postgres
 5678 www   20   0  512.0m 128.0m  20.1  node
 9012 root  39  19   89.0m  12.0m   0.1  backup.sh   ← nice 19
  100 root  rt   0    0     0       0.0  migration   ← RT scheduling
   -2 root  rt   -    0     0       0.0  [watchdog]  ← kernel RT thread
\`\`\`

\`\`\`text
PR = 20 + NI  para procesos normales (SCHED_OTHER)
PR = "rt"     para procesos de tiempo real (SCHED_FIFO, SCHED_RR)
\`\`\`

### 📖 El Completely Fair Scheduler (CFS)

El CFS es el scheduler por defecto de Linux desde la versión 2.6.23. Su objetivo es dar a cada proceso una porción "justa" de CPU proporcional a su peso.

\`\`\`text
CÓMO FUNCIONA EL CFS:

1. Cada proceso tiene un "virtual runtime" (vruntime) — tiempo de CPU consumido,
   ponderado por su peso (peso determinado por el valor nice).

2. El CFS siempre ejecuta el proceso con menor vruntime.

3. El peso se calcula así:
   nice  0 → peso 1024 (normal)
   nice  5 → peso  335 (3x menos CPU que nice 0)
   nice 10 → peso  110 (9x menos CPU que nice 0)
   nice 19 → peso   15 (68x menos CPU que nice 0)
   nice -5 → peso 3121 (3x más CPU que nice 0)

4. Con dos procesos, nice 0 y nice 19:
   - Si solo están ellos dos, el backup (nice 19) puede usar ~1.5% del tiempo
   - En práctica, si la app (nice 0) quiere CPU, el backup casi no recibe nada
\`\`\`

### 📖 Scheduling de tiempo real con chrt

Para procesos que necesitan respuesta garantizada (audio, control industrial, networking de baja latencia):

\`\`\`bash
# Ver el scheduler actual de un proceso
chrt -p 1234

# SCHED_FIFO: tiempo real, prioridad fija (1-99, 99 = más alta)
# El proceso corre hasta que se bloquea o cede voluntariamente
sudo chrt -f -p 50 1234          # cambiar proceso existente
sudo chrt -f 50 ./mi-programa    # lanzar nuevo proceso

# SCHED_RR: round-robin de tiempo real con quantum de tiempo
sudo chrt -r -p 50 1234

# SCHED_BATCH: optimizado para lotes (batch), no interactivo
sudo chrt -b -p 0 1234

# SCHED_IDLE: prioridad más baja posible (por debajo de nice 19)
sudo chrt -i -p 0 1234

# Ver info completa
chrt -p 1234
# output:
# pid 1234's current scheduling policy: SCHED_OTHER
# pid 1234's current scheduling priority: 0
\`\`\`

**Advertencia:** SCHED_FIFO con prioridad alta puede hacer que el sistema no responda si el proceso entra en bucle infinito. Usarlo solo cuando sea necesario.

### 📖 Patrón práctico: background jobs sin impacto

\`\`\`bash
#!/usr/bin/env bash
# Wrapper para ejecutar tareas pesadas sin impactar el sistema

NICE_LEVEL=\${NICE_LEVEL:-19}
IO_CLASS=\${IO_CLASS:-3}   # ionice: 0=none,1=RT,2=best-effort,3=idle

# Reducir prioridad de CPU e I/O
exec nice -n "\$NICE_LEVEL" ionice -c "\$IO_CLASS" "\$@"
\`\`\`

\`\`\`bash
# Uso
./low-priority-wrapper.sh rsync -avz /data/ backup:/data/

# O directamente
nice -n 19 ionice -c 3 rsync -avz /data/ backup:/data/
\`\`\`

### 📋 Lo que debes recordar

* nice va de -20 (mayor prioridad) a 19 (menor). Solo root puede usar valores negativos.
* \`renice -n 19 -p PID\` cambia la prioridad de un proceso en ejecución sin reiniciarlo.
* El CFS hace que nice 19 sea casi invisible cuando hay procesos nice 0 compitiendo.
* Para I/O también existe \`ionice\`: combínalo con nice para backups que no impacten el sistema.

### 🧪 Autoevaluación

1. Un proceso con nice -20 y otro con nice 19 compiten por CPU. ¿Aproximadamente cuánta CPU recibe cada uno?
2. ¿Qué diferencia hay entre SCHED_FIFO y SCHED_RR en tiempo real?
3. ¿Cómo lanzarías un proceso de compilación largo que no afecte la respuesta del servidor web?

---

1. El proceso nice -20 tiene peso ~88761 y el nice 19 tiene peso ~15. La proporción es ~5917:1. En práctica, el proceso nice -20 recibe casi toda la CPU, dejando migajas al nice 19. La fórmula exacta: CPU_share = weight / total_weight.
2. SCHED_FIFO: el proceso corre hasta que se bloquea voluntariamente o aparece uno de mayor prioridad. No hay preempción por tiempo. SCHED_RR: igual pero con quantum de tiempo — si agota su quantum, va al final de la cola de procesos con la misma prioridad. SCHED_RR es más justo entre procesos de la misma prioridad RT.
3. \`nice -n 19 ionice -c 3 make -j4\`. nice 19 para CPU, ionice clase 3 (idle) para I/O de disco. Así el compilador solo usa CPU y disco cuando el servidor web no los necesita.
`

export default content
