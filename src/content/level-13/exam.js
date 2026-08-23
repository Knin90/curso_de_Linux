const exam = [
  // Módulo 1 — cron: sintaxis, tipos y entorno de ejecución
  {
    q: '¿Qué campo de una expresión cron representa las horas?',
    options: ['hora', 'minuto', 'día del mes', 'mes'],
    correct: 0,
  },
  {
    q: '¿Qué significa el operador "*/15" en un campo de cron?',
    options: ['Rango de 15 unidades', 'Paso: se ejecuta cada 15 unidades', 'Lista separada por 15', 'Exactamente el minuto 15'],
    correct: 1,
  },
  {
    q: '¿Qué expresión cron ejecuta un comando cada lunes a las 9:00 AM?',
    options: ['9 0 * * 1', '0 9 1 * *', '0 9 * * 1', '* 9 * * 1'],
    correct: 2,
  },
  {
    q: '¿Cuál es el PATH mínimo típico que usa cron por defecto?',
    options: ['/usr/local/bin:/usr/bin', '/bin:/sbin:/usr/bin', 'todo el PATH del usuario que crea el job', '/usr/bin:/bin'],
    correct: 3,
  },
  {
    q: '¿Qué atajo de cron ejecuta una tarea al arrancar el sistema?',
    options: ['@reboot', '@daily', '@hourly', '@monthly'],
    correct: 0,
  },
  {
    q: '¿Qué diferencia tiene /etc/crontab respecto a un crontab de usuario?',
    options: ['Usa una sintaxis completamente distinta', 'Tiene un campo adicional para especificar el usuario', 'No admite atajos como @daily', 'Se ejecuta solo una vez al iniciar'],
    correct: 1,
  },
  {
    q: '¿Por qué "python3 script.py" puede fallar en cron aunque funcione en la terminal?',
    options: ['Cron no permite ejecutar scripts en Python', 'Cron siempre ejecuta como un usuario distinto', 'El PATH de cron es mínimo y puede no incluir la ruta de python3', 'Python3 requiere variables gráficas'],
    correct: 2,
  },

  // Módulo 2 — crontab: gestión de trabajos por usuario y sistema
  {
    q: '¿Qué comando elimina TODO el crontab del usuario actual sin pedir confirmación?',
    options: ['crontab -e', 'crontab -l', 'crontab -edit', 'crontab -r'],
    correct: 3,
  },
  {
    q: '¿Por qué los scripts en /etc/cron.daily/ no deben tener extensión .sh?',
    options: ['Porque run-parts ignora archivos con extensión', 'Porque cron no reconoce extensiones de archivo', 'Porque systemd los bloquea automáticamente', 'Porque Debian lo prohíbe por política'],
    correct: 0,
  },
  {
    q: '¿Qué archivo, si existe, define una lista blanca de usuarios que pueden usar cron?',
    options: ['/etc/cron.deny', '/etc/cron.allow', '/etc/crontab', '/etc/cron.d/allow'],
    correct: 1,
  },
  {
    q: '¿Cómo se evita el mensaje "No MTA installed" al producir output un cron job?',
    options: ['Instalando postfix obligatoriamente', 'Cambiando el crontab de usuario a root', 'Redirigiendo la salida a un archivo o definiendo MAILTO=""', 'Eliminando el job del crontab'],
    correct: 2,
  },
  {
    q: '¿Qué diferencia principal tiene /etc/cron.d/ frente a los crontabs de usuario?',
    options: ['No admite comandos con argumentos', 'Solo puede usarse una vez', 'Requiere reiniciar el sistema para aplicarse', 'Incluye un campo adicional para especificar el usuario que ejecuta el comando'],
    correct: 3,
  },
  {
    q: '¿Qué comando permite editar el crontab de otro usuario como root?',
    options: ['crontab -e -u <usuario>', 'crontab --edit <usuario>', 'sudo crontab <usuario>', 'crontab -user <usuario>'],
    correct: 0,
  },
  {
    q: '¿Dónde se consultan los logs de ejecución de cron en Debian/Ubuntu?',
    options: ['Solo en /etc/cron.d/log', 'En /var/log/syslog o con journalctl -u cron', 'No se registran logs de cron', 'En /etc/crontab'],
    correct: 1,
  },

  // Módulo 3 — Variables de entorno y depuración en cron
  {
    q: '¿Qué shell usa cron por defecto para ejecutar los comandos?',
    options: ['/bin/bash', '/bin/zsh', '/bin/sh', 'El shell configurado en /etc/passwd'],
    correct: 2,
  },
  {
    q: 'Según el módulo, ¿por qué un script con arrays de Bash puede fallar en cron aunque tenga el shebang #!/bin/bash?',
    options: ['Los arrays no existen en Linux', 'Cron no permite scripts de más de 100 líneas', 'El script necesita permisos de root', 'Cron usa SHELL=/bin/sh por defecto, que puede no soportar arrays de Bash'],
    correct: 3,
  },
  {
    q: '¿Qué comando simula el entorno mínimo de cron durante depuración?',
    options: ['env -i PATH=/usr/bin:/bin bash script.sh', 'bash --login script.sh', 'sudo -i bash script.sh', 'cron --debug script.sh'],
    correct: 0,
  },
  {
    q: '¿Qué riesgo tiene usar "> /dev/null 2>&1" en un cron job de producción?',
    options: ['Ralentiza el sistema notablemente', 'Se pierde toda la información de error, sin registro en ningún log', 'Aumenta el uso de memoria', 'Impide que el job se ejecute'],
    correct: 1,
  },
  {
    q: '¿Qué variable de entorno define a quién se envían los emails de output de un cron job?',
    options: ['LOGNAME', 'HOME', 'MAILTO', 'SHELL'],
    correct: 2,
  },
  {
    q: '¿Cuál es el primer lugar recomendado para verificar si cron intentó ejecutar un job?',
    options: ['El archivo /etc/anacrontab', 'El historial de bash', 'El archivo /etc/passwd', 'grep CRON /var/log/syslog'],
    correct: 3,
  },

  // Módulo 4 — anacron: tareas para sistemas que no corren 24/7
  {
    q: '¿Cuál es la principal limitación de cron que resuelve anacron?',
    options: ['Cron no tiene memoria: si el sistema está apagado, la tarea se pierde', 'Cron no admite rangos de fechas', 'Cron no puede ejecutar scripts en Python', 'Cron requiere permisos root siempre'],
    correct: 0,
  },
  {
    q: '¿Dónde guarda anacron el registro de la última ejecución de cada tarea?',
    options: ['/etc/anacrontab', '/var/spool/anacron/', '/var/log/anacron.log', '/etc/cron.d/anacron'],
    correct: 1,
  },
  {
    q: '¿Qué representa el campo "delay" en /etc/anacrontab?',
    options: ['Los días entre ejecuciones', 'El tiempo máximo de ejecución permitido', 'Los minutos a esperar tras el arranque antes de ejecutar', 'La prioridad del proceso'],
    correct: 2,
  },
  {
    q: '¿Cuál es la granularidad mínima que admite anacron?',
    options: ['Minutos', 'Segundos', 'Horas', 'Días'],
    correct: 3,
  },
  {
    q: 'En Ubuntu/Debian, cuando anacron está instalado, ¿quién ejecuta /etc/cron.daily?',
    options: ['anacron, garantizando la ejecución aunque el sistema haya estado apagado', 'Siempre cron directamente', 'systemd exclusivamente', 'Ningún proceso; debe ejecutarse manualmente'],
    correct: 0,
  },
  {
    q: '¿En qué escenario es más apropiado usar anacron en lugar de cron?',
    options: ['Un servidor VPS que corre 24/7 con tareas cada 5 minutos', 'Una laptop que se apaga por las noches y necesita ejecutar tareas diarias igual', 'Un job que debe ejecutarse exactamente a las 2:00 AM', 'Un healthcheck cada minuto'],
    correct: 1,
  },

  // Módulo 5 — systemd timers: la alternativa moderna a cron
  {
    q: '¿Qué dos archivos componen un systemd timer?',
    options: ['.cron y .job', '.service y .target', '.timer y .service', '.timer y .socket'],
    correct: 2,
  },
  {
    q: '¿Qué opción del archivo .timer hace que una tarea perdida se ejecute al próximo arranque?',
    options: ['OnBootSec', 'RandomizedDelaySec', 'OnUnitActiveSec', 'Persistent=true'],
    correct: 3,
  },
  {
    q: '¿Qué comando muestra todos los timers activos junto con su próxima ejecución?',
    options: ['systemctl list-timers --all', 'systemctl list-units', 'journalctl -u timers', 'systemctl status timers.target'],
    correct: 0,
  },
  {
    q: '¿Cómo se ejecuta manualmente el servicio asociado a un timer sin afectar su horario?',
    options: ['systemctl restart timer', 'systemctl start <nombre>.service', 'systemctl enable <nombre>.timer', 'systemctl daemon-reload'],
    correct: 1,
  },
  {
    q: '¿Qué expresión OnCalendar ejecuta una tarea cada 15 minutos?',
    options: ['OnBootSec=15min', '*/15 * * * *', '*-*-* *:0/15:00', '*-*-15 00:00:00'],
    correct: 2,
  },
  {
    q: '¿Cuál es una ventaja de systemd timers sobre cron para depuración?',
    options: ['No requieren archivos de configuración', 'Ejecutan comandos más rápido que cron', 'No necesitan permisos de root', 'El historial y output quedan integrados automáticamente en journald'],
    correct: 3,
  },

  // Módulo 6 — at y batch: tareas únicas programadas
  {
    q: '¿Cuál es la diferencia fundamental entre "at" y "cron"?',
    options: ['at ejecuta una tarea una sola vez; cron repite según un calendario', 'at es más rápido en ejecutarse', 'at solo funciona como root', 'cron no admite tiempo relativo'],
    correct: 0,
  },
  {
    q: '¿Qué comando lista los trabajos pendientes en la cola de at?',
    options: ['atrm', 'atq', 'at -c', 'batch -l'],
    correct: 1,
  },
  {
    q: '¿Cómo se elimina un trabajo específico de la cola de at?',
    options: ['at -r <num>', 'crontab -r <num>', 'atrm <num>', 'at -x <num>'],
    correct: 2,
  },
  {
    q: '¿Qué condición dispara la ejecución de un job programado con "batch"?',
    options: ['Una hora exacta especificada por el usuario', 'Cuando el sistema arranca', 'Nunca se ejecuta automáticamente', 'Cuando el load average cae por debajo del umbral configurado'],
    correct: 3,
  },
  {
    q: 'A diferencia de cron, ¿qué entorno hereda un job programado con "at"?',
    options: ['El entorno del shell en el momento de programarlo', 'Un entorno vacío', 'El entorno mínimo fijo de cron', 'El entorno de systemd'],
    correct: 0,
  },
  {
    q: '¿Qué comando programa el reinicio de nginx dentro de 30 minutos?',
    options: ['systemctl restart nginx --delay 30', 'echo "systemctl restart nginx" | at now + 30 minutes', 'crontab -e nginx +30', 'batch nginx 30m'],
    correct: 1,
  },

  // Módulo 7 — Patrones de automatización: locks, logs y notificaciones
  {
    q: '¿Qué comando permite adquirir un lock exclusivo y evitar ejecuciones simultáneas de un cron job?',
    options: ['timeout', 'trap', 'flock -n', 'nice'],
    correct: 2,
  },
  {
    q: '¿Por qué se usa "exit 0" en lugar de "exit 1" cuando un job encuentra el lock ya tomado?',
    options: ['Porque exit 1 detiene cron permanentemente', 'Porque exit 0 libera memoria automáticamente', 'Porque flock lo requiere obligatoriamente', 'Porque no es un error: es el comportamiento esperado de la protección funcionando'],
    correct: 3,
  },
  {
    q: '¿Qué código de salida retorna "timeout" cuando el proceso excede el tiempo límite?',
    options: ['124', '0', '1', '255'],
    correct: 0,
  },
  {
    q: 'En el método de lock con archivo PID, ¿cómo se verifica si el proceso registrado sigue activo?',
    options: ['Con ps aux | grep', 'Con kill -0 "$PID"', 'Leyendo /proc/version', 'Con flock -n'],
    correct: 1,
  },
  {
    q: '¿Qué patrón garantiza que las notificaciones o limpieza se ejecuten sin importar cómo termine el script?',
    options: ['set -x', 'exec 9>lock', 'trap ... EXIT', 'PID=$$'],
    correct: 2,
  },
  {
    q: '¿Para qué sirve un script "wrapper" reutilizable en cron jobs?',
    options: ['Para reemplazar completamente a cron', 'Para ejecutar jobs más rápido', 'Para eliminar la necesidad de logs', 'Para centralizar lock, timeout, logging y alertas y evitar duplicación'],
    correct: 3,
  },

  // Módulo 8 — Proyecto real: sistema de automatización para un servidor de producción
  {
    q: 'Según el proyecto del módulo 8, ¿qué herramienta es más adecuada para un health check cada 5 minutos con dependencias de servicio y logs integrados?',
    options: ['systemd timer', 'cron', 'anacron', 'at'],
    correct: 0,
  },
  {
    q: '¿Qué se recomienda hacer primero antes de agregar cualquier tarea nueva a un servidor heredado?',
    options: ['systemctl daemon-reload', 'Ejecutar un script de auditoría que inventaríe todas las tareas programadas existentes', 'crontab -r', 'Eliminar todos los jobs de at con atrm'],
    correct: 1,
  },
  {
    q: 'En el plan de automatización del proyecto, ¿qué herramienta se eligió para el backup de PostgreSQL y por qué?',
    options: ['systemd, porque necesita dependencias de red', 'at, porque es una tarea única', 'cron, porque la hora exacta a las 2am importa', 'anacron, porque el sistema se apaga por la noche'],
    correct: 2,
  },
  {
    q: '¿Qué riesgo corre "backup-db.sh" si tarda más de 24 horas y no usa flock?',
    options: ['Se detiene automáticamente al llegar la medianoche', 'systemd bloquea la segunda ejecución', 'No hay ningún riesgo relevante', 'Cron lanzaría una segunda instancia compitiendo por I/O, arriesgando un backup corrupto'],
    correct: 3,
  },
  {
    q: '¿Qué comando muestra los fallos recientes de un servicio systemd en las últimas 24 horas?',
    options: ['journalctl -u <servicio> --since "24 hours ago" -p err', 'systemctl list-timers', 'crontab -l', 'atq'],
    correct: 0,
  },
  {
    q: '¿Por qué se recomienda instalar el backup con lock en /etc/cron.d/ en vez de directamente en el crontab de un usuario?',
    options: ['Porque cron.d no permite locks', 'Porque permite especificar el usuario de ejecución y es más fácil de auditar/versionar como archivo de sistema', 'Porque cron.d se ejecuta más rápido', 'Porque root no puede usar crontab -e'],
    correct: 1,
  },
]

export default exam
