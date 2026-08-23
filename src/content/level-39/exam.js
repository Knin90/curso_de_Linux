const exam = [
  // Módulo 1 — Fundamentos I: filesystem, shell, procesos, usuarios y permisos
  {
    q: 'Un script falla con "Permission denied" aunque el archivo existe y el usuario es el propietario (ls -l muestra -rw-r--r--). ¿Cuál es el comando correcto para solucionarlo sin otorgar más permisos de los necesarios?',
    options: [
      'chmod u+x deploy.sh (dar permiso de ejecución solo al propietario)',
      'chmod 777 deploy.sh (dar permisos totales a todos)',
      'chown root deploy.sh (cambiar el propietario a root)',
      'chmod -R 755 /home/ana (aplicar permisos recursivamente a todo el home)',
    ],
    correct: 0,
  },
  {
    q: 'Un usuario reporta que "cd /mnt/backup" funciona pero "ls" dentro de esa carpeta devuelve "Permission denied" en algunos subdirectorios. ¿Cuál es la causa?',
    options: [
      'El disco está lleno y no puede leer los directorios',
      'Falta el permiso de ejecución (x) en esos subdirectorios, necesario para listar o acceder a su contenido aunque exista permiso de lectura (r)',
      'El usuario no es miembro del grupo propietario del directorio padre',
      'El filesystem está montado en modo solo lectura',
    ],
    correct: 1,
  },
  {
    q: 'Dado el comando `echo "hola" | grep "chau" ; echo "salida: $?"`, ¿cuál es la salida exacta esperada?',
    options: [
      'Imprime "hola" y "salida: 0"',
      'Imprime un error de sintaxis y no continúa',
      'No imprime nada del grep y muestra "salida: 1" (grep no encontró coincidencia)',
      'Imprime "chau" y "salida: 0"',
    ],
    correct: 2,
  },
  {
    q: 'Un pipeline de tres comandos falla silenciosamente en el segundo paso pero el script continúa como si nada hubiera pasado. ¿Qué opción de bash corrige esto?',
    options: [
      'Agregar set -e al final del script',
      'Reemplazar los pipes por punto y coma (;)',
      'Usar && entre cada comando del pipe en vez de |',
      'Agregar set -o pipefail, que propaga el código de salida de cualquier comando del pipe que falle, no solo el último',
    ],
    correct: 3,
  },
  {
    q: 'Un directorio compartido /srv/proyectos necesita que todos los archivos nuevos hereden el grupo "devs" automáticamente, sin chgrp manual. ¿Qué mecanismo aplica?',
    options: [
      'Aplicar el bit SGID al directorio con chmod g+s /srv/proyectos',
      'Aplicar el sticky bit con chmod +t /srv/proyectos',
      'Agregar todos los usuarios al grupo devs con usermod',
      'Cambiar el propietario del directorio a devs con chown',
    ],
    correct: 0,
  },
  {
    q: 'Un directorio compartido usado por múltiples usuarios para archivos temporales debe evitar que un usuario borre archivos de otro. ¿Qué bit especial aplica?',
    options: [
      'El bit SUID, aplicado con chmod u+s',
      'El sticky bit, aplicado con chmod +t',
      'El bit SGID, aplicado con chmod g+s',
      'Permisos de solo lectura para todos los usuarios (chmod 444)',
    ],
    correct: 1,
  },

  // Módulo 2 — Fundamentos II: redes y almacenamiento
  {
    q: 'Un servidor no puede alcanzar google.com pero sí responde a "ping 8.8.8.8" ("Temporary failure in name resolution"). ¿Qué capa falla y qué se revisa primero?',
    options: [
      'Falla la capa de enlace; se revisa el cable de red',
      'Falla el firewall; se revisa iptables',
      'Falla la resolución DNS; se revisa /etc/resolv.conf o la configuración de systemd-resolved',
      'Falla el routing; se revisa ip route show',
    ],
    correct: 2,
  },
  {
    q: 'Un servicio web no responde desde otra máquina pero "curl localhost:8080" funciona en el propio servidor, y ss muestra LISTEN en 127.0.0.1:8080. ¿Cuál es la causa?',
    options: [
      'El firewall bloquea el puerto 8080 completamente',
      'El DNS no resuelve el nombre del servidor',
      'El servicio no está corriendo realmente',
      'El servicio está enlazado (bind) solo a loopback (127.0.0.1) en vez de 0.0.0.0, por lo que no acepta conexiones externas',
    ],
    correct: 3,
  },
  {
    q: '"iptables -L -n" muestra vacío para el puerto 443 pero nginx escucha ahí y el tráfico sigue bloqueado. ¿Qué se debe verificar?',
    options: [
      'Que otra herramienta como nftables, firewalld o ufw esté gestionando las reglas en vez de (o además de) iptables',
      'Que el certificado TLS de nginx no esté expirado',
      'Que el DNS resuelva correctamente el dominio',
      'Que el disco no esté lleno',
    ],
    correct: 0,
  },
  {
    q: 'Un enlace SSH se corta constantemente tras minutos de inactividad. ¿Qué directiva del lado servidor lo corrige?',
    options: [
      'ServerAliveInterval en sshd_config',
      'ClientAliveInterval y ClientAliveCountMax en sshd_config',
      'PermitRootLogin en sshd_config',
      'AllowTcpForwarding en sshd_config',
    ],
    correct: 1,
  },
  {
    q: '"df -h" muestra una partición al 100% pero "du -sh /*" no suma ese total. ¿Cuál es la causa más probable?',
    options: [
      'Un error de corrupción en el filesystem que exagera el porcentaje de uso',
      'El comando du está mal instalado y calcula incorrectamente',
      'Archivos borrados pero mantenidos abiertos por un proceso, cuyo espacio no se libera hasta que el proceso cierra el descriptor',
      'La partición tiene un límite de cuota de usuario mal configurado',
    ],
    correct: 2,
  },
  {
    q: 'Se necesita ampliar una partición LVM sin espacio, y el volume group tiene espacio libre disponible. ¿Cuál es la secuencia correcta?',
    options: [
      'vgextend directamente sobre la partición sin tocar el volumen lógico',
      'pvcreate seguido de mkfs para recrear el filesystem',
      'fsck seguido de reboot para forzar el recálculo del tamaño',
      'lvextend para ampliar el volumen lógico, seguido de resize2fs o xfs_growfs según el filesystem',
    ],
    correct: 3,
  },
  {
    q: 'Se necesita verificar errores de un filesystem sin desmontarlo en producción. ¿Por qué fsck no puede correr directamente y qué alternativa existe?',
    options: [
      'fsck no puede correr sobre un filesystem montado en lectura-escritura; la alternativa es montarlo en modo solo lectura o programar fsck en el próximo reinicio con tune2fs -c',
      'fsck sí puede correr normalmente en cualquier momento sin restricciones',
      'Hay que formatear la partición primero y luego correr fsck',
      'Hay que detener todos los servicios del sistema antes de correr fsck, sin desmontar nada',
    ],
    correct: 0,
  },

  // Módulo 3 — Administración I: systemd, SSH y gestión de paquetes
  {
    q: '"systemctl status" muestra un servicio "failed" con "203/EXEC". ¿Qué significa ese código?',
    options: [
      'El servicio se quedó sin memoria disponible',
      'El binario especificado en ExecStart no existe o no tiene permiso de ejecución',
      'El servicio tardó demasiado en iniciar y fue cancelado por timeout',
      'Hay un conflicto de puerto con otro servicio',
    ],
    correct: 1,
  },
  {
    q: 'Un servicio funciona con "systemctl start" pero no arranca tras reiniciar el servidor. ¿Qué falta?',
    options: [
      'Aumentar el RestartSec en la unidad',
      'Cambiar el target por defecto de systemd',
      'Ejecutar systemctl enable (o enable --now) para que el servicio persista al reiniciar',
      'Reinstalar el paquete del servicio',
    ],
    correct: 2,
  },
  {
    q: 'Un servicio necesita que la red esté completamente disponible, no solo la interfaz "up". ¿Qué target de systemd usa?',
    options: [
      'network.target únicamente',
      'multi-user.target',
      'basic.target',
      'network-online.target, combinado con After= y Wants=',
    ],
    correct: 3,
  },
  {
    q: 'Se necesita endurecer SSH deshabilitando login por contraseña y como root, sin cortar el acceso del equipo. ¿Cuál es el orden correcto?',
    options: [
      'Agregar la clave pública primero, probarla, y solo después deshabilitar PasswordAuthentication y PermitRootLogin',
      'Deshabilitar PasswordAuthentication primero y luego agregar la clave pública',
      'Deshabilitar PermitRootLogin y PasswordAuthentication al mismo tiempo sin verificar antes',
      'Reiniciar el servicio SSH primero y luego hacer cualquier cambio de configuración',
    ],
    correct: 0,
  },
  {
    q: 'SSH falla con "Permissions 0644 for id_rsa are too open". ¿Cuál es el comando de corrección?',
    options: [
      'chmod 644 ~/.ssh/id_rsa',
      'chmod 600 ~/.ssh/id_rsa',
      'chown root ~/.ssh/id_rsa',
      'chmod 777 ~/.ssh/id_rsa',
    ],
    correct: 1,
  },
  {
    q: '"apt install" falla por dependencias rotas (libssl-dev requiere una versión distinta de libssl3 a la instalada). ¿Cuál es la secuencia de diagnóstico y reparación?',
    options: [
      'Reinstalar el sistema operativo completo',
      'Forzar la instalación con dpkg --force-all',
      'Ejecutar apt --fix-broken install y revisar si hay repositorios mixtos con versiones incompatibles',
      'Desinstalar libssl3 manualmente sin verificar dependencias',
    ],
    correct: 2,
  },
  {
    q: 'Un repositorio yum/dnf reporta firma GPG inválida al actualizar. ¿Cuál es el riesgo de desactivar gpgcheck en vez de importar la clave correcta?',
    options: [
      'Solo genera un mensaje de advertencia adicional sin ningún riesgo real',
      'Ralentiza las futuras actualizaciones del sistema',
      'Bloquea la instalación de cualquier paquete hasta corregirlo',
      'Permite instalar paquetes maliciosos o alterados sin advertencia, ejecutando código arbitrario con privilegios de root',
    ],
    correct: 3,
  },

  // Módulo 4 — Administración II: logs, LVM/RAID, firewall y SELinux/AppArmor
  {
    q: 'dmesg muestra "Out of memory: Killed process (java)". ¿Qué explica este síntoma?',
    options: [
      'El OOM killer del kernel terminó el proceso por falta de memoria del sistema, no es un bug de la aplicación',
      'La aplicación tiene un bug de programación que causó su propio cierre',
      'El disco está lleno y eso provocó el cierre del proceso',
      'El proceso fue detenido manualmente por un administrador',
    ],
    correct: 0,
  },
  {
    q: '/proc/mdstat muestra "[3/2] [_UU]" en un RAID 5. ¿Qué indica esta salida?',
    options: [
      'Los 3 discos están sincronizados correctamente sin problemas',
      'Falta un disco: solo 2 de 3 discos están activos, el RAID está degradado',
      'El RAID está reconstruyéndose al 66% de progreso',
      'Hay un error de checksum en el superbloque, no relacionado con discos faltantes',
    ],
    correct: 1,
  },
  {
    q: 'Un RAID 1 con dos discos fue reemplazado por error con un disco más pequeño. ¿Por qué no puede reconstruirse?',
    options: [
      'El controlador RAID necesita ser reiniciado manualmente',
      'Los discos deben tener la misma marca para funcionar en RAID 1',
      'El nuevo disco no tiene capacidad suficiente para igualar al disco original, condición necesaria para la reconstrucción',
      'El sistema operativo no reconoce discos de diferente tamaño en absoluto',
    ],
    correct: 2,
  },
  {
    q: 'SELinux bloquea el acceso de nginx a un puerto no estándar (8443) con "denied name_connect". ¿Cuál es la respuesta correcta (no setenforce 0)?',
    options: [
      'setenforce 0 para desactivar temporalmente SELinux',
      'Reiniciar el servicio nginx varias veces hasta que funcione',
      'Cambiar el puerto de nginx a 80 para evitar el problema',
      'semanage port -a -t http_port_t -p tcp 8443, para etiquetar el puerto en la política de SELinux',
    ],
    correct: 3,
  },
  {
    q: 'AppArmor bloquea a una aplicación de leer un archivo en una ruta no estándar. ¿Cuál es el flujo correcto?',
    options: [
      'Poner el perfil en modo complain, revisar con aa-logprof, ajustar el perfil y volver a modo enforce',
      'Deshabilitar AppArmor globalmente hasta resolver el problema de raíz',
      'Cambiar la ruta del archivo de configuración a /tmp',
      'Reinstalar el paquete de la aplicación afectada',
    ],
    correct: 0,
  },
  {
    q: 'Se sospecha que un atacante borró evidencia de sus acciones en los logs locales. ¿Cuál es la mitigación correcta?',
    options: [
      'Aumentar la retención de logs locales a 90 días',
      'Enviar los logs a un servidor remoto (syslog centralizado) para que no puedan alterarse localmente',
      'Deshabilitar el acceso root al servidor completamente',
      'Cifrar los logs locales con una contraseña',
    ],
    correct: 1,
  },
  {
    q: 'Un desarrollador pide desactivar el firewall en staging con datos sensibles "para probar más rápido". ¿Cuál es la respuesta correcta?',
    options: [
      'Aceptarlo porque staging no es producción y el riesgo es bajo',
      'Desactivarlo solo por unas horas sin documentarlo',
      'Rechazarlo y ofrecer una regla temporal específica y auditada, revertida después de la prueba',
      'Desactivarlo pero solo si el desarrollador firma una autorización verbal',
    ],
    correct: 2,
  },

  // Módulo 5 — Troubleshooting I: fallos de servicio y de red
  {
    q: 'systemctl status muestra "active (running)" pero el health check falla con "Connection refused", y los logs muestran "heap out of memory" con reinicios repetidos. ¿Cuál es la causa raíz?',
    options: [
      'El firewall bloquea las conexiones al puerto 3000',
      'El DNS no resuelve correctamente localhost',
      'El certificado TLS del servicio expiró',
      'El proceso entra en un crash loop por falta de memoria (OOM); systemd lo reinicia constantemente y en el instante de la consulta aparece "running" aunque no responde',
    ],
    correct: 3,
  },
  {
    q: 'mtr muestra 38% de pérdida de paquetes concentrada solo en el último salto (el destino), con 0% en los saltos intermedios. ¿Qué indica este patrón?',
    options: [
      'El problema está en el host o interfaz destino, no en la red de tránsito intermedia',
      'El problema está en el gateway del primer salto',
      'El problema está en el core switch de la red',
      'El problema es genérico de internet y no se puede aislar',
    ],
    correct: 0,
  },
  {
    q: 'Un certificado TLS expiró y llegó a producción sin alerta previa. ¿Qué control preventivo se debe diseñar?',
    options: [
      'Revisar manualmente la fecha de expiración cada semana',
      'Monitoreo de expiración con alertas escalonadas (30/15/7 días) y renovación automática, por ejemplo con certbot',
      'Aumentar la duración de validez del certificado a 10 años',
      'Configurar el navegador para ignorar certificados expirados',
    ],
    correct: 1,
  },
  {
    q: 'psql rechaza conexiones con "too many connections for role app", y ss muestra 187 conexiones abiertas. ¿Qué evidencia adicional se necesita para diferenciar un límite mal dimensionado de un connection leak?',
    options: [
      'Solo la versión de PostgreSQL instalada',
      'El espacio libre en disco del servidor de base de datos',
      'Histórico de conexiones a lo largo del día y revisión del pool de conexiones de la aplicación',
      'El uso de CPU del servidor en el momento del incidente',
    ],
    correct: 2,
  },
  {
    q: 'dig api.internal devuelve la IP antigua tras una migración de servicio. ¿Qué explica este síntoma y qué se puede hacer en vez de solo esperar?',
    options: [
      'El servidor DNS está caído completamente',
      'El firewall bloquea las consultas DNS',
      'La nueva IP tiene un error de configuración de red',
      'El TTL de DNS aún no expiró en la caché; se puede hacer flush de la caché local y verificar el TTL configurado antes de la migración',
    ],
    correct: 3,
  },
  {
    q: 'En el criterio de aprobación de Troubleshooting I, ¿qué distingue una respuesta "Sólida" de una "Aceptable" en el método de diagnóstico?',
    options: [
      'Seguir explícitamente síntoma → hipótesis → verificación → causa raíz, en vez de verificar hipótesis de forma desordenada',
      'Responder más rápido que el resto del equipo',
      'Usar más comandos de diagnóstico sin importar la relevancia',
      'Citar la documentación oficial de cada herramienta usada',
    ],
    correct: 0,
  },

  // Módulo 6 — Troubleshooting II: arranque, disco lleno y rendimiento
  {
    q: 'El sistema se detiene en "grub rescue>" con el mensaje "unknown filesystem". ¿Cuál es la causa más probable?',
    options: [
      'Un virus infectó el sector de arranque',
      'Una partición o tabla de particiones dañada, o un cambio en el identificador del disco de arranque',
      'La memoria RAM está fallando',
      'El procesador se sobrecalentó durante el arranque',
    ],
    correct: 1,
  },
  {
    q: 'El sistema cae a shell de emergencia con "Failed to mount /data". ¿Cuál es la causa típica y qué archivo se revisa?',
    options: [
      'El kernel está corrupto y debe reinstalarse',
      'La BIOS/UEFI perdió la configuración de arranque',
      'Una entrada en /etc/fstab apunta a un disco/UUID que ya no existe; se edita /etc/fstab antes de reintentar el arranque',
      'El disco físico se desconectó completamente y no aparece en el sistema',
    ],
    correct: 2,
  },
  {
    q: 'df reporta espacio disponible pero un proceso no puede crear archivos nuevos con "No space left on device". ¿Cuál es la causa alternativa y cómo se confirma?',
    options: [
      'El filesystem está corrupto y necesita fsck inmediato',
      'El proceso no tiene permisos suficientes en el directorio',
      'La cuota de disco del usuario se alcanzó',
      'Los inodos se agotaron; se confirma con df -i',
    ],
    correct: 3,
  },
  {
    q: 'top muestra 45% en "wa" (I/O wait) con lentitud generalizada del servidor. ¿Qué indica y qué comando se corre a continuación?',
    options: [
      'Indica un cuello de botella en disco, no en CPU; el siguiente paso es iostat -x 1 o iotop',
      'Indica un cuello de botella en la red; el siguiente paso es correr mtr',
      'Indica falta de memoria RAM; el siguiente paso es correr free -h',
      'Indica un proceso zombie; el siguiente paso es correr ps aux',
    ],
    correct: 0,
  },
  {
    q: 'free -h muestra poca memoria "free" pero buff/cache es alto y "available" también es alto. ¿Por qué no es un problema?',
    options: [
      'Porque el sistema tiene swap suficiente para compensar',
      'Linux usa la memoria libre para cachear páginas de disco (buff/cache), que se libera automáticamente cuando una aplicación la necesita; available refleja la memoria realmente utilizable',
      'Porque el kernel ignora la memoria cacheada en sus cálculos',
      'Porque los procesos zombie no cuentan como memoria usada',
    ],
    correct: 1,
  },
  {
    q: 'El disco se llenó por WAL de una base de datos con crecimiento descontrolado. ¿Por qué es peligroso borrar los archivos WAL directamente?',
    options: [
      'Solo genera un mensaje de advertencia sin ningún efecto real',
      'Ralentiza la base de datos pero sin riesgo de corrupción',
      'Puede corromper la base de datos o romper la replicación, ya que contienen transacciones pendientes de aplicar o necesarias para recuperación',
      'Libera espacio pero requiere reiniciar el servicio después',
    ],
    correct: 2,
  },

  // Módulo 7 — Automatización: Bash, cron y systemd timers
  {
    q: 'El script de backup por cron no usa "set -euo pipefail". ¿Qué consecuencia real tuvo esta ausencia cuando tar falló?',
    options: [
      'El script se detiene inmediatamente sin borrar nada',
      'El script reintenta el tar automáticamente hasta 3 veces',
      'El script envía una alerta por email pero continúa normalmente',
      'El script sigue ejecutando el find que borra backups antiguos, dejando el sistema sin ningún backup válido reciente ni antiguo',
    ],
    correct: 3,
  },
  {
    q: '¿Por qué "find $BACKUP_DIR -mtime +7 -exec rm {} \\;" sin -type f ni filtro de nombre es peligroso?',
    options: [
      'Puede borrar directorios u otros archivos que no son backups, ya que no restringe por tipo ni por patrón de nombre',
      'Es únicamente un problema de rendimiento, no de seguridad',
      'Falla siempre con un error de sintaxis y no borra nada',
      'Solo afecta a archivos con permisos de ejecución',
    ],
    correct: 0,
  },
  {
    q: 'Se necesita una tarea cada 15 minutos con catch-up si el servidor estuvo apagado en el horario programado. ¿Por qué cron no lo soporta nativamente y qué lo resuelve?',
    options: [
      'Cron sí lo soporta nativamente con la opción --catch-up',
      'Cron solo dispara en el instante programado y no recuerda ejecuciones perdidas; un systemd timer con Persistent=true sí ejecuta la tarea pendiente al volver a estar disponible',
      'Solo se resuelve escribiendo un script que verifique manualmente la última ejecución cada minuto',
      'systemd timers no pueden ejecutarse cada 15 minutos, solo diariamente',
    ],
    correct: 1,
  },
  {
    q: 'Un cron job de sincronización a veces tarda más de 5 minutos pero corre cada 5 minutos, generando ejecuciones superpuestas. ¿Qué herramienta evita esto?',
    options: [
      'nice, para bajar la prioridad del proceso',
      'nohup, para que el proceso siga corriendo tras cerrar la sesión',
      'flock, usado como lock file para evitar ejecuciones concurrentes del mismo job',
      'cron -single, una opción nativa de cron para exclusión mutua',
    ],
    correct: 2,
  },
  {
    q: 'En "flock -n /tmp/sync.lock script.sh", ¿qué hace específicamente la opción -n?',
    options: [
      'Hace que el lock se libere automáticamente después de n segundos',
      'Indica el número máximo de reintentos antes de fallar',
      'Activa el modo verboso para depurar el bloqueo',
      'Hace que, si el lock ya está tomado, el nuevo proceso termine inmediatamente en vez de esperar a que se libere (non-blocking)',
    ],
    correct: 3,
  },
  {
    q: 'Se pide automatizar la rotación de una clave API sin exponerla en logs. ¿Cuál de los siguientes es un requisito no funcional correcto para ese script?',
    options: [
      'Aplicar permisos restrictivos sobre el archivo que contiene la clave nueva y nunca loguear el valor de la clave',
      'Imprimir la clave en el log de debug para poder verificarla manualmente',
      'Guardar la clave en un archivo con permisos 644 para que cualquier proceso pueda leerla',
      'Ejecutar el script como root sin restricción de permisos sobre el archivo de la clave',
    ],
    correct: 0,
  },

  // Módulo 8 — Caso real: examen final integrador y criterio de certificación
  {
    q: 'nginx está "active (running)" pero el sitio no responde desde afuera; "curl -I http://localhost:80" da "502 Bad Gateway". ¿Qué indica esto?',
    options: [
      'El problema es un certificado TLS expirado en nginx',
      'El problema no es nginx en sí, sino su dependencia (el backend), que está caído y por eso nginx no puede completar la respuesta',
      'El problema es que el firewall bloquea el puerto 80 completamente',
      'El problema es que el DNS externo no resuelve el dominio',
    ],
    correct: 1,
  },
  {
    q: 'El log del backend muestra "cannot write to /var/lib/app/uploads: No space left on device" y "df -h /var" muestra 100% de uso. ¿Cuál es el siguiente paso correcto antes de borrar nada?',
    options: [
      'Borrar inmediatamente los archivos más grandes de /var/log sin revisar su contenido',
      'Reiniciar el servidor completo para liberar espacio temporal',
      'Identificar qué está consumiendo el espacio con du -xh --max-depth=2 /var, en vez de borrar archivos a ciegas',
      'Formatear la partición /var y restaurar desde backup',
    ],
    correct: 2,
  },
  {
    q: 'El hallazgo final revela que /opt/scripts/cleanup-uploads.sh nunca tuvo permiso de ejecución desde su despliegue. ¿Cuál es la causa raíz completa del incidente?',
    options: [
      'El disco físico del servidor falló y necesitó reemplazo',
      'Un ataque externo saturó el servidor con tráfico malicioso',
      'El servicio nginx tenía una configuración de caché corrupta',
      'El script de limpieza nunca tuvo permiso de ejecución, por lo que cron falló silenciosamente cada noche durante más de un mes, permitiendo que /var se llenara y provocara la caída en cascada del backend y del sitio',
    ],
    correct: 3,
  },
  {
    q: 'Según el criterio de aprobación final del curso, ¿qué nivel de certificación corresponde a alguien que resuelve todo correctamente pero desactivó el firewall "para probar más rápido" en un módulo anterior?',
    options: [
      'No certificado, porque desactivar el firewall como atajo es un fallo eliminatorio de seguridad, sin importar el puntaje en el resto',
      'Certificado — Profesional, porque el resto del desempeño fue sólido',
      'Certificado — Junior, con una nota de advertencia en el registro',
      'Certificado — Profesional, pero con revisión adicional en seis meses',
    ],
    correct: 0,
  },
  {
    q: 'Según el checklist final del curso, ¿qué distingue un diagnóstico completo de uno incompleto ante un incidente?',
    options: [
      'Un diagnóstico completo se basa únicamente en resolver el síntoma más visible lo más rápido posible',
      'Un diagnóstico completo distingue el síntoma superficial de la causa raíz que lo generó, y documenta corrección inmediata y corrección de fondo por separado',
      'Un diagnóstico completo requiere siempre reiniciar el servicio afectado como primer paso',
      'Un diagnóstico completo no necesita evidencia si el administrador tiene experiencia suficiente',
    ],
    correct: 1,
  },
]

export default exam
