const content = `
## Módulo 8 — Proyecto real: dashboard de operaciones resiliente a caídas de red

### 🎯 Objetivos de aprendizaje

* Construir una consola de monitorización multipanel usando \`tmux\`.
* Verificar que las tareas dentro de \`tmux\` sobreviven a una desconexión de red.
* Dejar el dashboard como un script reproducible, no como pasos manuales que se olvidan.

### ❓ El problema real

El equipo de operaciones de una pequeña empresa monitorea un servidor crítico conectándose por SSH desde una oficina con conexión inestable. Cada vez que la VPN cae, pierden la sesión y con ella cualquier proceso que estuvieran observando en primer plano. Te piden construir un dashboard de tres paneles (sistema, red, logs) que arranque con un solo comando y, sobre todo, que demuestre que sobrevive a un corte de conexión — antes de confiar en él durante un incidente real.

### 📖 Estructura del proyecto

\`\`\`
ops-dashboard-tmux/
├── iniciar-dashboard.sh
└── prueba-resiliencia.sh
\`\`\`

### 📖 iniciar-dashboard.sh — arranca el dashboard de 3 paneles

\`\`\`bash
#!/bin/bash
# Uso: ./iniciar-dashboard.sh
# Crea la sesión "Dashboard" con 3 paneles:
#   izquierda (50%):        monitor de sistema (top)
#   arriba-derecha (25%):   monitor de red (ping)
#   abajo-derecha (25%):    logs en vivo (tail -f)
set -euo pipefail

SESSION="Dashboard"

tmux new-session -d -s "\$SESSION" -n main

# Panel izquierdo: monitor de sistema
tmux send-keys -t "\$SESSION":main "top" C-m

# Dividir verticalmente y quedarnos con el panel derecho
tmux split-window -h -t "\$SESSION":main
tmux send-keys -t "\$SESSION":main.1 "ping 8.8.8.8" C-m

# Dividir el panel derecho horizontalmente
tmux split-window -v -t "\$SESSION":main.1
tmux send-keys -t "\$SESSION":main.2 "tail -f /var/log/syslog" C-m

# Adjuntar a la sesión
tmux attach -t "\$SESSION"
\`\`\`

### 📖 prueba-resiliencia.sh — valida que el dashboard sobrevive a un corte

\`\`\`bash
#!/bin/bash
# Se ejecuta DENTRO de una sesión tmux aparte, llamada "prueba_fuego".
# Simula el trabajo que no debe perderse si la red cae.
set -euo pipefail

tmux new-session -d -s prueba_fuego \\
  "while true; do date >> /tmp/contador.log; sleep 1; done"

echo "Sesión 'prueba_fuego' lanzada en segundo plano."
echo "Cierra ahora la terminal (o la conexión SSH) y reconéctate para verificar."
\`\`\`

### 📖 Secuencia de ejecución

1. Conéctate al servidor por SSH y ejecuta \`./iniciar-dashboard.sh\`.

Salida esperada (tres paneles activos dentro de la sesión \`Dashboard\`):

\`\`\`
top - 14:32:01 up 3 days,  2:10,  1 user,  load average: 0.08, 0.05, 0.01
...
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=115 time=12.4 ms
...
Jan 12 14:32:00 srv-web-01 systemd[1]: Started Session.
\`\`\`

2. Desacóplate sin cerrar nada: \`Ctrl + b\` seguido de \`d\`.
3. En una terminal separada ejecuta \`./prueba-resiliencia.sh\` para lanzar la sesión \`prueba_fuego\`.
4. **Simula la caída:** cierra la ventana de la terminal (o corta la VPN) sin ejecutar \`tmux kill-session\`.
5. Abre una terminal nueva, reconéctate por SSH y verifica que el contador sigue creciendo:

\`\`\`bash
ls -lh /tmp/contador.log
\`\`\`

\`\`\`
-rw-r--r-- 1 ops ops 4.2K Jan 12 14:35 /tmp/contador.log
\`\`\`

6. Recupera el control visual de ambas sesiones:

\`\`\`bash
tmux ls
tmux attach -t Dashboard
\`\`\`

\`\`\`
Dashboard: 1 windows (created ...)
prueba_fuego: 1 windows (created ...)
\`\`\`

7. Verifica que el bucle de \`prueba_fuego\` sigue imprimiendo en pantalla, ciérralo con \`Ctrl + C\` dentro del panel y termina la sesión con \`exit\`.

### 📋 Lo que debes recordar

* **Persistencia real:** los procesos dentro de \`tmux\` sobreviven a la desconexión violenta del cliente SSH porque corren en el servidor \`tmux\`, no en tu terminal local.
* **Organización espacial:** los paneles divididos dan visión global de la salud del servidor sin depender de múltiples ventanas.
* Automatizar el arranque del dashboard con un script evita reconstruir la disposición de paneles a mano cada vez que hay un incidente.

### 🧪 Autoevaluación

1. Si cierras la ventana de tu emulador de terminal mientras la sesión \`Dashboard\` está abierta, ¿se pierde el trabajo que corría dentro?
2. ¿Qué comando lista, desde la shell, cuántas sesiones de \`tmux\` siguen vivas en el servidor?
3. ¿Cómo recuperas el control visual de la sesión \`Dashboard\` después de un corte de red?

---

1. **No se pierde.** El servidor de \`tmux\` mantiene viva la sesión y sus procesos en la memoria RAM del servidor, independientemente de que el cliente SSH se desconecte.
2. El comando \`tmux ls\`.
3. Ejecutando \`tmux attach -t Dashboard\` desde una nueva conexión al servidor.
`

export default content
