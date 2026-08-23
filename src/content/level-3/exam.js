const exam = [
  // Módulo 1 — La arquitectura CLI: TTYs, Consolas Virtuales y PTYs
  {
    q: 'Al conectarte a un servidor con `ssh usuario@ip`, ¿qué tipo de dispositivo de terminal se te asigna?',
    options: ['/dev/pts/N (pseudoterminal)', '/dev/tty1 nativa', '/dev/console', '/dev/ttyS0 serie'],
    correct: 0,
  },
  {
    q: '¿Qué hace la combinación de teclas `Ctrl + Alt + F3` en un sistema Linux con entorno gráfico?',
    options: ['Cierra la sesión gráfica actual', 'Salta a la Consola Virtual número 3', 'Abre un nuevo pseudoterminal', 'Reinicia el demonio sshd'],
    correct: 1,
  },
  {
    q: '¿Qué comando muestra el nombre del dispositivo de terminal en el que estás trabajando actualmente?',
    options: ['who', 'w', 'tty', 'ps'],
    correct: 2,
  },
  {
    q: '¿Cuántas consolas virtuales nativas suele reservar Linux por defecto (tty1 a tty6)?',
    options: ['4', '8', '2', '6'],
    correct: 3,
  },
  {
    q: 'Si el entorno gráfico de un servidor se congela por completo, ¿qué acción NO implica apagar el equipo?',
    options: ['Saltar a una TTY nativa con Ctrl+Alt+F2 y matar el proceso colgado', 'Mantener presionado el botón de encendido', 'Desenchufar el cable de corriente', 'Forzar un corte de electricidad'],
    correct: 0,
  },
  {
    q: '¿Qué comando muestra los detalles (usuario, terminal, hora de login) de todas las sesiones conectadas?',
    options: ['tty', 'who -u', 'kill', 'chmod'],
    correct: 1,
  },

  // Módulo 2 — La Shell y Redirección de Descriptores (0, 1, 2)
  {
    q: '¿Qué número de descriptor de archivo (FD) representa la salida estándar (stdout)?',
    options: ['0', '2', '1', '3'],
    correct: 2,
  },
  {
    q: '¿Qué operador redirige la salida de errores (stderr, FD 2) a un archivo?',
    options: ['>', '|', '>>', '2>'],
    correct: 3,
  },
  {
    q: '¿Cuál es la diferencia entre usar el operador `>` y el operador `>>`?',
    options: ['`>` sobrescribe el archivo de destino; `>>` añade el contenido al final', 'Ambos sobrescriben el archivo de igual forma', '`>` añade al final; `>>` sobrescribe el archivo', 'Solo se pueden usar con stderr'],
    correct: 0,
  },
  {
    q: '¿Cómo descartas por completo los mensajes de error de un comando como `find /etc -name "*.conf"`?',
    options: ['Redirigiendo el FD 1 a /dev/null', 'Redirigiendo el FD 2 a /dev/null', 'Usando un pipe hacia /dev/null', 'Usando `>>` con /dev/null'],
    correct: 1,
  },
  {
    q: '¿Qué hace el operador pipe (`|`) al conectar dos comandos?',
    options: ['Guarda la salida del primer comando en un archivo', 'Combina stdout con stderr en un mismo flujo', 'Conecta el stdout del comando izquierdo con el stdin del comando derecho', 'Ejecuta ambos comandos en segundo plano'],
    correct: 2,
  },
  {
    q: '¿Qué comando permite ver una salida en pantalla y guardarla en un archivo al mismo tiempo?',
    options: ['grep', 'cut', 'xargs', 'tee'],
    correct: 3,
  },

  // Módulo 3 — Gestión de Procesos: Foreground, Background y Signal Control
  {
    q: '¿Qué combinación de teclas pausa un proceso en primer plano y devuelve el control al prompt de la shell?',
    options: ['Ctrl + Z', 'Ctrl + C', 'Ctrl + D', 'Ctrl + X'],
    correct: 0,
  },
  {
    q: 'Tienes un proceso pausado identificado como `[2]`. ¿Qué comando usas para que continúe corriendo en segundo plano?',
    options: ['fg %2', 'bg %2', 'jobs %2', 'kill %2'],
    correct: 1,
  },
  {
    q: '¿Qué señal reciben los procesos hijos de una shell cuando la terminal o la conexión SSH se cierra abruptamente?',
    options: ['SIGKILL', 'SIGTERM', 'SIGHUP', 'SIGSTOP'],
    correct: 2,
  },
  {
    q: '¿Qué instrucción lanza un proceso directamente en segundo plano al ejecutarlo?',
    options: ['jobs', 'fg', 'bg', 'sleep 300 &'],
    correct: 3,
  },
  {
    q: '¿Qué comando lista todos los trabajos (jobs) gestionados por la shell actual?',
    options: ['jobs -l', 'ps aux', 'who', 'top'],
    correct: 0,
  },
  {
    q: '¿Cómo inmunizas un proceso que ya está corriendo en background contra la señal SIGHUP?',
    options: ['kill -9 %1', 'disown -h %1', 'fg %1', 'bg %1'],
    correct: 1,
  },

  // Módulo 4 — Necesidad y Arquitectura de los Multiplexores (tmux)
  {
    q: 'Si la conexión SSH se interrumpe mientras trabajas dentro de una sesión de tmux, ¿qué ocurre con los scripts en ejecución?',
    options: ['Se detienen inmediatamente', 'Reciben SIGHUP y terminan', 'Continúan ejecutándose normalmente', 'Se pausan hasta que reconectas'],
    correct: 2,
  },
  {
    q: '¿Qué componente de tmux permanece en la memoria RAM gestionando las terminales virtuales aunque el cliente se desconecte?',
    options: ['El cliente tmux', 'El emulador de terminal gráfico', 'La shell bash', 'El servidor tmux'],
    correct: 3,
  },
  {
    q: '¿Cuál es la diferencia fundamental entre usar `nohup` y usar `tmux`?',
    options: ['`nohup` envía la salida a un archivo estático; `tmux` mantiene una terminal interactiva real a la que puedes reconectarte', 'Son exactamente equivalentes en funcionalidad', '`tmux` no sobrevive a la caída de la conexión SSH', '`nohup` permite dividir la pantalla en paneles'],
    correct: 0,
  },
  {
    q: '¿Qué modelo de arquitectura utiliza tmux internamente?',
    options: ['Peer-to-peer', 'Cliente-Servidor', 'Monolítico de un solo proceso', 'Basado en contenedores'],
    correct: 1,
  },
  {
    q: '¿Qué significa "detach" (desacoplarse) en el contexto de tmux?',
    options: ['Matar la sesión y todos sus procesos', 'Reiniciar el servidor de tmux', 'Desconectar la vista del cliente sin matar la sesión', 'Cerrar todos los paneles abiertos'],
    correct: 2,
  },
  {
    q: 'Según la comparativa del módulo, ¿qué capacidad NO ofrece el Job Control básico (`nohup`/`bg`) frente a un multiplexor?',
    options: ['Sobrevivir al cierre de la conexión SSH', 'Ejecutar el proceso en segundo plano', 'Mostrar el PID del proceso lanzado', 'Dividir la pantalla en paneles'],
    correct: 3,
  },

  // Módulo 5 — Dominio de tmux: Sesiones, Ventanas y Paneles
  {
    q: '¿Cuál es la combinación de teclas por defecto para la tecla prefijo en tmux?',
    options: ['Ctrl + b', 'Ctrl + a', 'Alt + t', 'Ctrl + t'],
    correct: 0,
  },
  {
    q: 'Tras presionar el prefijo, ¿qué tecla debes pulsar para desacoplarte de la sesión sin cerrarla?',
    options: ['x', 'd', 'c', 'z'],
    correct: 1,
  },
  {
    q: '¿Qué comando crea una nueva sesión de tmux con un nombre descriptivo?',
    options: ['tmux ls', 'tmux attach -t nombre', 'tmux new -s nombre', 'tmux kill-session -t nombre'],
    correct: 2,
  },
  {
    q: '¿Cuál es el orden jerárquico correcto de la estructura de tmux?',
    options: ['Ventanas > Sesiones > Paneles', 'Paneles > Ventanas > Sesiones', 'Paneles > Sesiones > Ventanas', 'Sesiones > Ventanas > Paneles'],
    correct: 3,
  },
  {
    q: 'Tras el prefijo, ¿qué tecla divide el panel actual verticalmente (izquierda / derecha)?',
    options: ['%', '"', 'z', 'x'],
    correct: 0,
  },
  {
    q: 'Tras el prefijo, ¿qué tecla hace zoom al panel actual, ocupando la pantalla completa temporalmente?',
    options: ['d', 'z', 'c', 'n'],
    correct: 1,
  },

  // Módulo 6 — Configuración Profesional de tmux (.tmux.conf)
  {
    q: '¿En qué archivo lee tmux su configuración de usuario al iniciar?',
    options: ['/etc/tmux.conf', '~/.bashrc', '~/.tmux.conf', '/etc/profile'],
    correct: 2,
  },
  {
    q: '¿Qué directiva de `.tmux.conf` habilita el clic y la rueda del ratón para hacer scroll y seleccionar paneles?',
    options: ['set -g base-index 1', 'set -g history-limit 50000', 'bind r source-file', 'set -g mouse on'],
    correct: 3,
  },
  {
    q: '¿Qué comando aplica los cambios de `.tmux.conf` sin necesidad de cerrar tmux?',
    options: ['tmux source-file ~/.tmux.conf', 'tmux kill-server', 'tmux new -s reload', 'tmux ls'],
    correct: 0,
  },
  {
    q: '¿Qué par de directivas remapea la tecla prefijo de `Ctrl+b` a `Ctrl+a`?',
    options: ['set -g mouse on', 'unbind C-b y set -g prefix C-a', 'setw -g pane-base-index 1', 'bind r source-file'],
    correct: 1,
  },
  {
    q: '¿Qué directiva hace que la numeración de ventanas y paneles empiece en 1 en lugar de 0?',
    options: ['set -g history-limit 50000', 'set -g mouse on', 'set -g base-index 1', 'unbind C-b'],
    correct: 2,
  },
  {
    q: '¿Qué logra aumentar el valor de `history-limit` en `.tmux.conf`?',
    options: ['Cambia la tecla prefijo', 'Activa el soporte de ratón', 'Renombra automáticamente la sesión', 'Aumenta el límite del historial de desplazamiento (scroll)'],
    correct: 3,
  },

  // Módulo 7 — Sesiones Colaborativas y Alternativas (screen)
  {
    q: '¿Qué parámetro de tmux permite especificar una ruta de socket personalizada para sesiones colaborativas?',
    options: ['-S', '-s', '-t', '-d'],
    correct: 0,
  },
  {
    q: 'Si no puedes instalar tmux en un servidor antiguo, ¿qué herramienta clásica realiza una función equivalente?',
    options: ['screenfetch', 'GNU Screen', 'byobu', 'xterm'],
    correct: 1,
  },
  {
    q: '¿Qué comando de `screen` permite acoplarse en modo espejo a una sesión que otro usuario está viendo?',
    options: ['screen -r', 'screen -ls', 'screen -x', 'screen -S'],
    correct: 2,
  },
  {
    q: '¿Cuál es la tecla prefijo por defecto en GNU Screen?',
    options: ['Ctrl + b', 'Ctrl + t', 'Alt + a', 'Ctrl + a'],
    correct: 3,
  },
  {
    q: '¿Qué comando de `screen` lista todas las sesiones activas?',
    options: ['screen -ls', 'screen -x', 'screen -r', 'screen -d'],
    correct: 0,
  },
  {
    q: 'Tras crear una sesión colaborativa con `tmux -S /tmp/sesion_compartida new -s soporte`, ¿qué paso adicional permite que otro usuario pueda conectarse a ella?',
    options: ['Reiniciar el servidor de tmux', 'Dar permisos al archivo de socket con chmod', 'Crear una nueva ventana en la sesión', 'Cambiar el prefijo a Ctrl+a'],
    correct: 1,
  },
  {
    q: '¿Qué comando de `screen` te reconecta a una sesión detached llamada "misesion"?',
    options: ['screen -ls misesion', 'screen -S misesion', 'screen -r misesion', 'screen -x -d misesion'],
    correct: 2,
  },

  // Módulo 8 — Proyecto real: dashboard de operaciones resiliente a caídas de red
  {
    q: '¿Qué combinación de flags crea una sesión de tmux desacoplada (en segundo plano) con nombre, ideal para scripts?',
    options: ['tmux attach -d', 'tmux ls -d', 'tmux kill-session -d', 'tmux new-session -d -s'],
    correct: 3,
  },
  {
    q: '¿Qué subcomando de tmux se usa dentro de un script para escribir y ejecutar comandos automáticamente en un panel?',
    options: ['tmux send-keys', 'tmux split-window', 'tmux attach', 'tmux new-session'],
    correct: 0,
  },
  {
    q: '¿Qué flag de `tmux split-window` divide la ventana horizontalmente, dejando los paneles lado a lado?',
    options: ['split-window -v', 'split-window -h', 'new-window', 'select-pane -L'],
    correct: 1,
  },
  {
    q: 'Si cierras la ventana de tu terminal mientras la sesión "Dashboard" sigue abierta, ¿qué ocurre con el trabajo que corría dentro?',
    options: ['Se pierde por completo', 'Se detiene hasta que reconectas', 'No se pierde: el servidor de tmux lo mantiene vivo en RAM', 'Se convierte en un proceso zombie'],
    correct: 2,
  },
  {
    q: '¿Qué comando, ejecutado desde la shell, lista cuántas sesiones de tmux siguen vivas en el servidor?',
    options: ['jobs -l', 'ps aux', 'who -u', 'tmux ls'],
    correct: 3,
  },
  {
    q: '¿Cómo recuperas el control visual de la sesión "Dashboard" después de un corte de red?',
    options: ['tmux attach -t Dashboard', 'tmux new -s Dashboard', 'tmux kill-session -t Dashboard', 'ssh Dashboard'],
    correct: 0,
  },
  {
    q: '¿Por qué conviene automatizar el arranque del dashboard con un script en lugar de pasos manuales?',
    options: ['Porque tmux no permite crear paneles a mano', 'Porque evita reconstruir la disposición de paneles a mano en cada incidente', 'Porque es un requisito obligatorio de tmux', 'Porque reduce el consumo de RAM del servidor'],
    correct: 1,
  },
]

export default exam
