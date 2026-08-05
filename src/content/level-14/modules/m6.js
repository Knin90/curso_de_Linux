const content = `
## Módulo 6 — Procesos zombie, huérfanos y gestión del ciclo de vida

### 🎯 Objetivos de aprendizaje

* Entender el ciclo de vida completo de un proceso en Linux.
* Distinguir procesos zombie de procesos huérfanos.
* Diagnosticar y resolver acumulación de zombies.
* Entender el rol de init/systemd como proceso 1 (subreaper).

### ❓ El problema real

Tu servidor acumula lentamente procesos en estado Z (zombie) en la salida de ps. Después de varios días hay cientos. No consumen CPU ni memoria, pero cada zombie ocupa una entrada en la tabla de procesos. Si se acumulan suficientes y alcanzas el límite de PIDs del sistema, no podrás crear nuevos procesos — ni siquiera conectarte por SSH para diagnosticar el problema.

### 📖 El ciclo de vida de un proceso

\`\`\`text
fork()           execve()          exit()         wait()
  │                │                  │              │
  ▼                ▼                  ▼              ▼
CREATED  →  RUNNING/SLEEPING  →  ZOMBIE  →  REAPED (desaparece)
           (R, S, D, T)           (Z)

Estados en ps/top:
  R  Running          — ejecutando o en cola del scheduler
  S  Sleeping         — esperando evento (interrumpible)
  D  Disk sleep       — esperando I/O (NO interrumpible — no responde a señales)
  T  Stopped          — pausado (SIGSTOP o debugger)
  Z  Zombie           — muerto, esperando que el padre llame wait()
  I  Idle             — thread del kernel inactivo
\`\`\`

### 📖 Qué es un proceso zombie

Cuando un proceso termina con \`exit()\`, no desaparece inmediatamente. El kernel mantiene su entrada en la tabla de procesos (con el código de salida, estadísticas de uso) esperando que el proceso padre llame \`wait()\` para recoger esa información.

\`\`\`text
PROCESO ZOMBIE:
- Ya no ejecuta código
- Ya no tiene memoria asignada
- Ya no tiene archivos abiertos
- SOLO ocupa: una entrada en la tabla de procesos con PID + código de salida

Cómo se crea un zombie:
  Padre hace fork() → crea hijo
  Hijo termina (exit) → queda en estado Z
  Padre nunca llama wait() → zombie permanente

Cómo se elimina:
  Padre llama wait()/waitpid() → zombie desaparece
  Padre muere → init (PID 1) adopta al zombie y llama wait()
\`\`\`

\`\`\`bash
# Encontrar zombies
ps aux | grep ' Z '
ps -eo pid,ppid,stat,cmd | awk '\$3 ~ /Z/ {print}'

# Output típico:
# PID   PPID  STAT  CMD
# 12345  1234   Z   [mi-app] <defunct>

# El padre del zombie:
ps -p 1234 -o pid,cmd
# 1234  /usr/bin/python3 servidor.py
\`\`\`

### 📖 Qué es un proceso huérfano

Un proceso huérfano es un proceso cuyo padre terminó antes que él. El kernel lo readopta asignándole PID 1 (init/systemd) como nuevo padre.

\`\`\`text
PROCESO HUÉRFANO:
  Padre corre → lanza hijo → padre termina → hijo queda huérfano
  → kernel cambia PPID del hijo a 1 (init/systemd)
  → init es responsable de hacer wait() cuando el huérfano termine
  → NO es un problema: init siempre recoge a sus hijos adoptados
\`\`\`

\`\`\`bash
# Un daemon típico se convierte en huérfano voluntariamente:
# 1. Fork → padre termina (shell recupera el control)
# 2. Hijo hace setsid() para crear nueva sesión
# 3. Hijo sigue corriendo como daemon con PPID=1

# Ejemplo: nohup crea un proceso que sobrevive al logout
nohup ./mi-script.sh &
# Cuando cierras la sesión, el proceso pasa a PPID=1
\`\`\`

### 📖 Diagnosticar y resolver zombies

\`\`\`bash
# Paso 1: encontrar zombies y sus padres
ps -eo pid,ppid,stat,comm | awk '\$3 ~ /Z/'

# Paso 2: identificar el padre
kill -CHLD PPID_DEL_ZOMBIE
# SIGCHLD puede despertar al padre para que llame wait()
# Funciona si el padre tiene handler de SIGCHLD pero no lo estaba procesando

# Paso 3: si el padre no recoge al zombie
# La única solución permanente es terminar el padre
# Cuando el padre muere, init adopta y recoge al zombie
kill -TERM PPID_DEL_ZOMBIE

# Paso 4: si el padre es crítico (no puedes matarlo), hay que arreglarlo
# El bug está en el código del padre — falta llamar wait() en el handler SIGCHLD
\`\`\`

\`\`\`c
// Código C que genera zombies (bug típico):
// pid_t child = fork();
// if (child == 0) { do_work(); exit(0); }
// // padre sigue sin llamar wait() → zombie

// Solución correcta en C:
// signal(SIGCHLD, SIG_IGN);  // decirle al kernel que descarte zombies automáticamente
// O:
// waitpid(-1, NULL, WNOHANG); // en un handler de SIGCHLD
\`\`\`

\`\`\`bash
# En bash: los backgrounded jobs se recogen automáticamente
# Pero si usas un subshell mal escrito:

# MAL (puede generar zombies si el padre no espera):
for i in 1 2 3; do
    ./proceso &
done
# No hay wait → posibles zombies si el script termina antes

# BIEN:
for i in 1 2 3; do
    ./proceso &
done
wait    # espera a todos los hijos antes de salir
\`\`\`

### 📖 Subreaper: gestión de ciclo de vida en contenedores

En Docker/contenedores, el proceso 1 es típicamente la aplicación, no init. Si esa aplicación no maneja SIGCHLD, acumula zombies:

\`\`\`bash
# En Dockerfile, usar un init apropiado como PID 1:
# ENTRYPOINT ["/usr/bin/tini", "--", "mi-app"]
# O:
docker run --init mi-imagen

# tini es un init mínimo que solo hace una cosa: recoger zombies
# /proc/sys/kernel/dumpable   y   prctl(PR_SET_CHILD_SUBREAPER)
# permiten designar un proceso no-1 como subreaper de su subárbol
\`\`\`

### 📖 Estado D: el zombie verdaderamente peligroso

El estado D (uninterruptible sleep) no es un zombie, pero puede ser más problemático:

\`\`\`bash
# Encontrar procesos en estado D
ps aux | awk '\$8 == "D" {print}'

# Estado D = proceso esperando I/O que no puede interrumpirse
# Causas comunes:
# - NFS mount que no responde
# - Disco con errores de hardware
# - Bug en un driver de kernel

# Los procesos D NO responden a SIGKILL — hay que resolver el problema subyacente
# (desmontar el NFS colgado, reparar el disco, reiniciar)

dmesg | tail -20   # buscar errores de hardware o I/O
\`\`\`

### 📋 Lo que debes recordar

* Un zombie NO consume RAM ni CPU — solo ocupa una entrada en la tabla de procesos.
* La solución correcta a los zombies es arreglar el padre para que llame \`wait()\`.
* Matar al padre es la solución de emergencia: init adoptará y recogerá a los zombies.
* Los procesos en estado D no responden a SIGKILL — son síntoma de un problema de hardware o kernel.

### 🧪 Autoevaluación

1. Tienes 500 zombies en el sistema. ¿Por qué no puedes eliminarlos con \`kill -9\`?
2. ¿Cuál es la diferencia entre un proceso zombie y un proceso en estado D?
3. Tu padre de procesos en Python lanza workers con subprocess. ¿Cómo evitas acumular zombies?

---

1. Los zombies ya están muertos — no tienen código en ejecución, por lo que SIGKILL no tiene efecto. La señal 9 mata procesos vivos, pero un zombie ya terminó; solo queda su registro en la tabla de procesos. Solo el padre llamando \`wait()\` o el padre mismo muriendo (para que init adopte y recoja) puede eliminarlos.
2. Un zombie (Z) es un proceso que ya terminó su ejecución y solo persiste como entrada en la tabla esperando que el padre llame \`wait()\`. No consume CPU ni RAM. Un proceso en estado D está vivo y ejecutando, pero bloqueado en una llamada al sistema de I/O que no puede interrumpirse (generalmente esperando hardware). Un proceso D consume recursos normales y no responde a señales hasta que la operación I/O complete o falle.
3. Dos opciones: (1) usar \`subprocess.Popen\` y llamar \`wait()\` o \`communicate()\` sobre cada proceso hijo antes de que el padre termine, o (2) registrar un handler de señal \`signal.signal(signal.SIGCHLD, signal.SIG_IGN)\` para decirle al kernel que descarte automáticamente a los hijos cuando terminen.
`

export default content
