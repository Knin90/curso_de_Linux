export default [
  // Módulo 1 — Arquitectura de logs: syslog, journald y rsyslog (6)
  { q: 'Un proceso escribe a stderr en un sistema con systemd. ¿Qué componente lo captura primero?', options: ['systemd-journald', 'rsyslog', 'logrotate', 'fail2ban'], correct: 0 },
  { q: '¿Qué representa el campo "facility" en un mensaje syslog?', options: ['La severidad del mensaje', 'El subsistema que genera el mensaje (kern, auth, daemon, etc.)', 'La fecha de creación del mensaje', 'El nombre del archivo de log destino'], correct: 1 },
  { q: '¿Qué selector syslog captura mensajes del kernel con severidad crítica o mayor?', options: ['kern.debug', 'auth.crit', 'kern.crit', '*.err'], correct: 2 },
  { q: '¿Por qué los logs de journald pueden desaparecer tras reiniciar el sistema?', options: ['Porque rsyslog los elimina automáticamente', 'Porque logrotate los borra cada noche', 'Porque journald no tiene permisos de escritura en disco', 'Porque por defecto se almacenan en /run/log/journal, un tmpfs en RAM'], correct: 3 },
  { q: '¿Cuál es el archivo típico donde Debian/Ubuntu registra la autenticación (ssh, sudo, login)?', options: ['/var/log/auth.log', '/var/log/messages', '/var/log/cron.log', '/var/log/dmesg'], correct: 0 },
  { q: '¿Qué comando hace persistentes los logs de journald entre reinicios?', options: ['journalctl --vacuum-time=2weeks', 'sudo mkdir -p /var/log/journal && sudo systemd-tmpfiles --create --prefix /var/log/journal', 'sudo systemctl disable rsyslog', 'sudo logrotate -f /etc/logrotate.conf'], correct: 1 },

  // Módulo 2 — journalctl: consultas avanzadas y filtrado (6)
  { q: '¿Qué comando muestra únicamente los logs del arranque actual?', options: ['journalctl -f', 'journalctl -k', 'journalctl -b', 'journalctl --list-boots'], correct: 2 },
  { q: '¿Cómo se filtran los logs de journalctl con severidad de error o mayor?', options: ['journalctl -u err', 'journalctl -o err', 'journalctl -f err', 'journalctl -p err'], correct: 3 },
  { q: '¿Qué flag de journalctl filtra por una unidad systemd específica, como nginx?', options: ['journalctl -u nginx', 'journalctl -p nginx', 'journalctl -b nginx', 'journalctl _EXE=nginx'], correct: 0 },
  { q: '¿Qué comando muestra los logs de journald en formato JSON legible?', options: ['journalctl -o cat', 'journalctl -o json-pretty', 'journalctl --output=short-full', 'journalctl -k'], correct: 1 },
  { q: '¿Cómo se filtran los logs de journald por PID de un proceso específico?', options: ['journalctl -u 1234', 'journalctl -p 1234', 'journalctl _PID=1234', 'journalctl --since 1234'], correct: 2 },
  { q: '¿Qué comando reduce el journal a un máximo de 500MB sin reiniciar el servicio?', options: ['sudo journalctl --disk-usage=500M', 'sudo journalctl -p 500M', 'sudo journalctl --list-boots=500M', 'sudo journalctl --vacuum-size=500M'], correct: 3 },

  // Módulo 3 — rsyslog: configuración, filtros y reenvío remoto (6)
  { q: '¿Qué diferencia hay entre `@servidor:514` y `@@servidor:514` en una regla de rsyslog?', options: ['@ usa UDP y @@ usa TCP', '@ usa TCP y @@ usa UDP', 'No hay diferencia funcional', '@@ solo funciona con IPv6'], correct: 0 },
  { q: '¿Qué directorio contiene los archivos de configuración incluidos por rsyslog además del archivo principal?', options: ['/etc/logrotate.d/', '/etc/rsyslog.d/', '/etc/fail2ban/', '/var/log/rsyslog/'], correct: 1 },
  { q: '¿Qué comando verifica la sintaxis de la configuración de rsyslog sin reiniciar el servicio?', options: ['systemctl status rsyslog', 'journalctl -u rsyslog', 'rsyslogd -N1', 'rsyslogd --test'], correct: 2 },
  { q: 'Quieres descartar todos los logs de un proceso ruidoso llamado "named". ¿Qué regla de rsyslog usarías?', options: ['kern.none /dev/null', 'auth.* stop', '*.* @@named:514', ':programname, isequal, "named"   stop'], correct: 3 },
  { q: '¿Por qué logrotate suele incluir un `postrotate` con `systemctl reload` del servicio?', options: ['Porque el proceso mantiene abierto el file descriptor del log original y necesita reabrirlo tras la rotación', 'Porque logrotate no puede renombrar archivos por sí solo', 'Porque el reload comprime automáticamente los logs', 'Porque es un requisito obligatorio de systemd'], correct: 0 },
  { q: '¿Qué operador de filtro por propiedad en rsyslog verifica si el mensaje contiene un texto específico?', options: ['startswith', 'contains', 'isequal', 'ereregex'], correct: 1 },

  // Módulo 4 — Monitoreo de recursos: top, htop, vmstat e iostat (7)
  { q: 'Un servidor de 4 CPUs muestra en top load average 6.2 y `wa` alto. ¿Cuál es el diagnóstico más probable?', options: ['Fuga de memoria sin relación con el disco', 'El sistema está subutilizado', 'Sobrecarga con cuello de botella de I/O de disco', 'Problema exclusivo de red'], correct: 2 },
  { q: 'En top, ¿qué campo de memoria indica realmente cuánta memoria libre puede usar el sistema?', options: ['free', 'buff/cache', 'swap total', 'avail Mem'], correct: 3 },
  { q: 'En vmstat, ¿qué indican valores constantes de `si` y `so` mayores a 0?', options: ['El sistema está paginando activamente a swap: presión de memoria', 'El disco está saturado de lecturas', 'La red está congestionada', 'La CPU está en modo ahorro de energía'], correct: 0 },
  { q: '¿Qué columna de `iostat -x` indica que un disco está saturado cuando supera el 80-90%?', options: ['await', '%util', 'r/s', 'rkB/s'], correct: 1 },
  { q: 'En top, ¿qué campo de CPU indica tiempo esperando I/O de disco?', options: ['us', 'sy', 'wa', 'ni'], correct: 2 },
  { q: '¿Qué tecla de htop permite ver el árbol de procesos?', options: ['F3', 'F4', 'F9', 'F5'], correct: 3 },
  { q: '¿Qué significa una carga (load average) de 4.0 en un servidor con 4 CPUs?', options: ['El sistema está 100% ocupado sin procesos esperando', 'El sistema está subutilizado al 25%', 'El sistema está sobrecargado al doble de su capacidad', 'Es un valor de error, imposible en la práctica'], correct: 0 },

  // Módulo 5 — El sistema de archivos /proc y /sys (6)
  { q: '¿Qué son /proc y /sys?', options: ['Directorios comunes con archivos guardados en disco', 'Sistemas de archivos virtuales generados dinámicamente por el kernel', 'Bases de datos SQL usadas por systemd', 'Particiones físicas reservadas para logs'], correct: 1 },
  { q: '¿Qué enfoque hace persistente un cambio de parámetro del kernel entre reinicios?', options: ['echo 1 > /proc/sys/net/ipv4/ip_forward', 'cat /proc/sys/net/ipv4/ip_forward', 'sysctl -w net.ipv4.ip_forward=1 seguido de guardarlo en /etc/sysctl.d/', 'journalctl -k net.ipv4.ip_forward'], correct: 2 },
  { q: '¿Dónde se colocan los archivos de configuración de sysctl para que sobrevivan a un reinicio?', options: ['/proc/sys/', '/var/log/sysctl/', '/etc/logrotate.d/', '/etc/sysctl.d/'], correct: 3 },
  { q: '¿Qué archivo indica si un disco es SSD (0) o HDD (1)?', options: ['/sys/block/<disco>/queue/rotational', '/proc/diskstats', '/proc/meminfo', '/sys/class/thermal/thermal_zone0/temp'], correct: 0 },
  { q: '¿Qué comando lista todos los parámetros del kernel disponibles vía sysctl?', options: ['sysctl -w', 'sysctl -a', 'sysctl -p', 'sysctl --list-boots'], correct: 1 },
  { q: 'Un servicio nginx falla con "too many open files". ¿Qué parámetro del kernel conviene revisar primero?', options: ['vm.swappiness', 'net.core.somaxconn', 'fs.file-max', 'net.ipv4.tcp_syncookies'], correct: 2 },

  // Módulo 6 — Alertas automáticas: logwatch y fail2ban (6)
  { q: '¿Qué hace logwatch?', options: ['Bloquea IPs automáticamente tras varios fallos de login', 'Reemplaza a journald como sistema de logging', 'Rota archivos de log comprimiéndolos', 'Analiza logs del sistema y envía un resumen periódico por email'], correct: 3 },
  { q: 'En fail2ban, ¿qué representa el parámetro `maxretry`?', options: ['El número de fallos antes de banear una IP', 'El tiempo de duración del ban', 'La ventana de tiempo para contar fallos', 'El puerto que se protege'], correct: 0 },
  { q: '¿Por qué es importante configurar `ignoreip` antes de activar fail2ban en el servicio SSH?', options: ['Para mejorar el rendimiento de fail2ban', 'Para evitar bloquearse a uno mismo con la propia IP de administración', 'Porque es obligatorio para que arranque el servicio', 'Para reducir el tamaño de los logs de fail2ban'], correct: 1 },
  { q: '¿Dónde se deben crear los overrides de configuración de fail2ban en lugar de editar jail.conf?', options: ['/etc/logwatch/conf/', '/etc/rsyslog.d/', '/etc/fail2ban/jail.local o archivos en jail.d/', '/proc/sys/fail2ban/'], correct: 2 },
  { q: '¿Qué comando permite probar si un filtro de fail2ban detecta correctamente los eventos de un log real?', options: ['fail2ban-client status', 'fail2ban-client reload', 'logwatch --range today', 'fail2ban-regex <log> <filtro>'], correct: 3 },
  { q: 'fail2ban baneó por error tu propia IP. ¿Cómo la desbaneas sin reiniciar el servicio?', options: ['sudo fail2ban-client set <jail> unbanip <IP>', 'sudo systemctl restart fail2ban', 'sudo logwatch --unban <IP>', 'sudo rm /etc/fail2ban/jail.local'], correct: 0 },

  // Módulo 7 — Observabilidad avanzada: strace, lsof y ss (6)
  { q: '¿Qué hace strace?', options: ['Lista los archivos abiertos por un proceso', 'Intercepta y registra las llamadas al sistema (syscalls) de un proceso', 'Muestra estadísticas de sockets de red', 'Rota logs automáticamente'], correct: 1 },
  { q: '¿Qué comando de strace filtra únicamente las llamadas de red, útil para diagnosticar "connection refused"?', options: ['strace -e trace=file', 'strace -c', 'strace -e trace=network', 'strace -T'], correct: 2 },
  { q: '`df -h` muestra el disco al 99% pero `du -sh /*` no explica ese espacio. ¿Qué comando ayuda a encontrar la causa?', options: ['sudo strace -f df', 'ss -tlnp', 'journalctl --disk-usage', 'sudo lsof | grep "(deleted)"'], correct: 3 },
  { q: '¿Qué comando muestra qué proceso está escuchando en el puerto 3000?', options: ['ss -tlnp | grep :3000', 'strace -p 3000', 'lsof --port 3000 -k', 'journalctl -u 3000'], correct: 0 },
  { q: '¿Qué significa el flag `-l` en `ss -tlnp`?', options: ['Local: solo direcciones locales', 'Listening: sockets en escucha', 'Log: activa el registro de eventos', 'Live: actualización en tiempo real'], correct: 1 },
  { q: '¿Por qué ss es más rápido que netstat en sistemas con miles de conexiones?', options: ['Porque usa menos colores en la salida', 'Porque no muestra los procesos dueños del socket', 'Porque lee directamente del kernel (netlink) en vez de parsear /proc/net/tcp', 'Porque solo soporta IPv6'], correct: 2 },

  // Módulo 8 — Proyecto real: stack de monitoreo para un servidor de producción (7)
  { q: '¿Qué parámetro de journald.conf garantiza que los logs sobrevivan a un reinicio?', options: ['SystemMaxUse=2G', 'RateLimitBurst=1000', 'MaxRetentionSec=30days', 'Storage=persistent'], correct: 3 },
  { q: 'En el flujo de diagnóstico recomendado en el proyecto, ¿cuál es el orden de general a específico?', options: ['journal → ss → lsof → strace', 'lsof → journal → strace → ss', 'ss → strace → journal → lsof', 'strace → lsof → ss → journal'], correct: 0 },
  { q: '¿Qué script del proyecto se ejecuta cada 15 minutos vía cron para verificar el estado del sistema?', options: ['jail.local', 'health-check.sh', 'override.conf', 'journald.conf'], correct: 1 },
  { q: 'El servidor se reinició y `journalctl -b -1` no muestra nada del arranque anterior. ¿Qué falta configurar?', options: ['fail2ban con ignoreip', 'ss -tlnp en el health check', 'Storage=persistent en journald.conf', 'logrotate con compress'], correct: 2 },
  { q: '`du -sh /var/log` muestra 2GB pero `df -h /` reporta el disco casi lleno. ¿Qué se busca con lsof en este caso?', options: ['Conexiones TCP establecidas', 'Servicios inactivos en systemd', 'Reglas de fail2ban activas', 'Procesos con archivos borrados que mantienen el espacio ocupado'], correct: 3 },
  { q: 'Te bloqueaste a ti mismo con fail2ban en sshd y no tienes acceso SSH. ¿Cómo lo revertirías?', options: ['Desde consola física o del proveedor, ejecutando fail2ban-client set sshd unbanip <IP>', 'Esperando a que expire el bantime sin poder hacer nada más', 'Reinstalando fail2ban completamente', 'Editando /etc/hosts para cambiar la IP del servidor'], correct: 0 },
  { q: '¿Qué archivo del proyecto define la rotación semanal del log generado por el health check?', options: ['cron.d/health-check', 'logrotate.d/health-check', 'jail.local', 'journald.conf'], correct: 1 },
]
