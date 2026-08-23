export default [
  {
    "q": "¿Cuál es el orden correcto del framework de 8 pasos de troubleshooting presentado en el módulo?",
    "options": [
      "Recolectar información, identificar síntomas, formular hipótesis, verificar cada hipótesis, aislar la causa, aplicar la corrección, verificar la resolución, documentar",
      "Reiniciar el servicio, revisar logs, aplicar un parche, notificar al equipo",
      "Identificar la causa raíz, corregirla, reiniciar el sistema, cerrar el ticket",
      "Formular hipótesis, aplicar la corrección, recolectar información, documentar"
    ],
    "correct": 0
  },
  {
    "q": "¿Por qué no se debe actuar (reiniciar servicios, matar procesos) antes de recolectar información en un incidente?",
    "options": [
      "Porque reiniciar siempre requiere permisos de root que rara vez están disponibles",
      "Porque tocar el sistema antes de observarlo destruye evidencia valiosa para el diagnóstico",
      "Porque los reinicios tardan más tiempo que analizar los logs",
      "Porque systemd bloquea los reinicios manuales durante un incidente activo"
    ],
    "correct": 1
  },
  {
    "q": "Según el módulo, ¿qué diferencia a un síntoma de una causa raíz?",
    "options": [
      "El síntoma ocurre en producción y la causa raíz solo ocurre en entornos de prueba",
      "No hay diferencia real: son dos nombres para el mismo concepto",
      "El síntoma es el comportamiento observable anormal; la causa raíz es el origen real que, al corregirse, evita que el problema recurra",
      "El síntoma se documenta en el post-mortem y la causa raíz no"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué característica debe tener una buena hipótesis de troubleshooting según el módulo?",
    "options": [
      "Debe cubrir la mayor cantidad posible de causas al mismo tiempo",
      "Debe evitar mencionar comandos para no sesgar la investigación",
      "Debe basarse en la intuición del administrador con más experiencia",
      "Debe ser específica y verificable con un comando concreto"
    ],
    "correct": 3
  },
  {
    "q": "¿En qué orden se recomienda verificar las hipótesis de un incidente?",
    "options": [
      "De la más probable y barata de verificar a la menos probable y más costosa",
      "En orden alfabético de los comandos disponibles",
      "De la menos probable a la más probable, para descartar primero lo raro",
      "En el orden en que las reporten los distintos miembros del equipo"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué significa \"aislar por bisección de capas\" en el framework de troubleshooting?",
    "options": [
      "Dividir el equipo de guardia en dos grupos que investigan por separado",
      "Probar sistemáticamente cada capa del sistema (red, SO, servicio, aplicación, base de datos) para determinar en cuál está el problema",
      "Cortar la red en dos segmentos para aislar el tráfico sospechoso",
      "Ejecutar el mismo comando dos veces para confirmar el resultado"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué debe incluir como mínimo la documentación (post-mortem) de un incidente resuelto, según el módulo?",
    "options": [
      "Solo el nombre del administrador que resolvió el incidente y la hora de cierre",
      "Únicamente los comandos ejecutados, sin explicación del contexto",
      "Línea de tiempo, síntoma observado, causa raíz confirmada, corrección aplicada y acción preventiva",
      "El costo económico estimado del incidente y nada más"
    ],
    "correct": 2
  },
  {
    "q": "En un sistema de 4 núcleos con load average de 8.21, ¿cómo se interpreta correctamente ese valor?",
    "options": [
      "Un load average de 8.21 siempre es crítico sin importar el número de núcleos",
      "Se debe comparar directamente con el número de procesos activos en el sistema, no con los núcleos",
      "El load average solo es relevante si supera 100, sin importar los núcleos disponibles",
      "Dividiendo 8.21 entre 4 núcleos (≈2.05), lo cual indica que el sistema está sobrecargado aproximadamente el doble de su capacidad"
    ],
    "correct": 3
  },
  {
    "q": "En la salida de `top`, si el %CPU idle es alto pero el load average también es alto, ¿qué se debe sospechar?",
    "options": [
      "Que hay procesos en estado D (uninterruptible sleep) esperando I/O, no saturación real de CPU",
      "Que el comando `top` está reportando datos incorrectos y debe reiniciarse",
      "Que la memoria RAM del servidor es insuficiente para el kernel",
      "Que el sistema tiene demasiados núcleos deshabilitados en la BIOS"
    ],
    "correct": 0
  },
  {
    "q": "¿Por qué un proceso zombi no se puede eliminar con `kill -9`?",
    "options": [
      "Porque los procesos zombis están protegidos por el kernel contra señales externas",
      "Porque el proceso ya terminó su ejecución; solo queda su entrada en la tabla de procesos esperando que el padre haga wait()",
      "Porque `kill -9` solo funciona sobre procesos con más de 100MB de memoria residente",
      "Porque el proceso zombi sigue consumiendo CPU activamente y bloquea la señal"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué se debe hacer para resolver de fondo un problema de acumulación masiva de procesos zombis?",
    "options": [
      "Ejecutar `kill -9` repetidamente sobre cada proceso zombi hasta que desaparezcan",
      "Aumentar la memoria RAM disponible del servidor",
      "Identificar y corregir (o reiniciar) el proceso padre que no está haciendo wait() sobre sus hijos",
      "Desmontar y volver a montar el sistema de archivos raíz"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué diferencia hay entre un proceso huérfano y uno zombi según el módulo?",
    "options": [
      "Ambos son exactamente el mismo estado de proceso, solo con nombres distintos",
      "El huérfano siempre indica un ataque de seguridad; el zombi es inofensivo siempre",
      "El huérfano consume CPU activamente; el zombi nunca aparece en `ps aux`",
      "El huérfano es adoptado automáticamente por systemd/init y es normal; el zombi consume una entrada en la tabla de procesos y en gran cantidad puede agotar los PIDs disponibles"
    ],
    "correct": 3
  },
  {
    "q": "Cuando un sistema está tan saturado que ni siquiera responde a SSH, ¿qué tipo de comandos se recomienda usar?",
    "options": [
      "Comandos baratos y de una sola pasada, como `uptime` o `top -bn1`, evitando herramientas interactivas pesadas",
      "Herramientas interactivas completas como `htop` para tener la vista más detallada posible",
      "Reiniciar inmediatamente el servidor para liberar recursos",
      "Ejecutar `journalctl -f` en modo interactivo indefinido para capturar todo el flujo"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué revela `ps aux | awk '$8 ~ /D/'` en un diagnóstico de carga alta?",
    "options": [
      "Los procesos que están usando más memoria RAM en ese momento",
      "Los procesos en estado uninterruptible sleep, típicamente esperando I/O de disco o de un recurso remoto como NFS",
      "Los procesos que fueron recientemente reiniciados por systemd",
      "Los procesos huérfanos adoptados por PID 1"
    ],
    "correct": 1
  },
  {
    "q": "En la salida de `free -h`, ¿qué columna se debe observar realmente para saber si hay presión de memoria?",
    "options": [
      "\"free\", porque muestra la memoria completamente sin usar en cualquier momento",
      "\"shared\", porque indica cuánta memoria comparten los procesos entre sí",
      "\"available\", ya que estima la memoria disponible para nuevas aplicaciones sin generar swap, incluyendo la parte reclamable de buff/cache",
      "\"buff/cache\", porque es la memoria que el sistema nunca puede recuperar"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué un valor bajo en la columna \"free\" de `free -h` no es necesariamente un problema?",
    "options": [
      "Porque la columna \"free\" nunca refleja el estado real de la memoria del sistema",
      "Porque el valor de \"free\" solo aplica a sistemas con menos de 4GB de RAM",
      "Porque \"free\" bajo indica que el swap ya está completamente lleno",
      "Porque Linux usa la memoria libre para cachear archivos, y esa caché se libera automáticamente cuando una aplicación la necesita"
    ],
    "correct": 3
  },
  {
    "q": "En `vmstat 1 5`, ¿qué indica que las columnas `si` y `so` muestren valores altos y sostenidos en cada línea?",
    "options": [
      "Que el sistema está haciendo swapping activo y sostenido, señal real de presión de memoria",
      "Que el sistema está funcionando de forma óptima usando toda la RAM disponible",
      "Que el disco tiene sectores dañados que deben revisarse con smartctl",
      "Que hay demasiados procesos zombis acumulados en el sistema"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué representa exactamente la columna VmRSS al consultar `/proc/<PID>/status`?",
    "options": [
      "La memoria virtual máxima que el proceso podría llegar a reservar",
      "La memoria física realmente usada por ese proceso",
      "La cantidad de memoria de ese proceso que está actualmente en swap",
      "El número total de hilos que tiene abiertos el proceso"
    ],
    "correct": 1
  },
  {
    "q": "¿Por qué el OOM killer no debe considerarse la causa raíz de un incidente?",
    "options": [
      "Porque el OOM killer nunca elige correctamente al proceso responsable",
      "Porque el OOM killer solo se activa quince minutos después del incidente real",
      "Porque es la consecuencia de que algo consumió más memoria de la disponible; hay que investigar qué proceso creció y por qué",
      "Porque el OOM killer es un componente exclusivo del kernel de sistemas de 32 bits"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué determina qué proceso elige el OOM killer para terminar?",
    "options": [
      "El orden alfabético del nombre del proceso en la tabla de procesos",
      "El PID más bajo activo en el sistema en el momento del evento",
      "El tiempo que lleva corriendo el proceso, sin importar su consumo de memoria",
      "Un puntaje oom_score (0-1000): los procesos que consumen más memoria y tienen menor prioridad reciben puntajes más altos"
    ],
    "correct": 3
  },
  {
    "q": "Si un solo proceso satura un núcleo de CPU mientras los demás núcleos están ociosos, ¿cuál es la solución correcta según el módulo?",
    "options": [
      "Optimizar el código o paralelizar el proceso, ya que agregar más núcleos no ayuda si el proceso no puede usarlos",
      "Agregar más núcleos de CPU al servidor, ya que eso siempre resuelve el cuello de botella",
      "Aumentar la memoria swap disponible para compensar la carga de CPU",
      "Reiniciar el proceso periódicamente cada pocos minutos para evitar la saturación"
    ],
    "correct": 0
  },
  {
    "q": "`df -h` muestra 40% de uso en la partición raíz pero la aplicación no puede crear archivos nuevos. ¿Qué se debe revisar?",
    "options": [
      "El nivel de log configurado en la aplicación, ya que siempre es la causa de este síntoma",
      "`df -i`, para verificar si los inodos disponibles están agotados aunque el espacio en bytes esté libre",
      "La velocidad de lectura/escritura del disco con `hdparm`",
      "La configuración de la tarjeta de red, ya que puede afectar la escritura en disco remoto"
    ],
    "correct": 1
  },
  {
    "q": "Se borra un archivo de log de 5GB con `rm` pero `df -h` sigue mostrando el disco lleno. ¿Cuál es la causa más probable?",
    "options": [
      "El comando `rm` no eliminó realmente el archivo por un error de permisos",
      "El sistema de archivos necesita ser reformateado para liberar el espacio",
      "Un proceso sigue teniendo el archivo abierto (file descriptor activo), por lo que el espacio no se libera hasta que se cierre",
      "El archivo se movió automáticamente a una papelera del sistema operativo"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué comando permite detectar archivos borrados que un proceso sigue manteniendo abiertos y que aún ocupan espacio en disco?",
    "options": [
      "`du -h --max-depth=1`",
      "`df -i`",
      "`fsck -y /dev/sda1`",
      "`lsof +L1`"
    ],
    "correct": 3
  },
  {
    "q": "¿Cuáles son causas típicas de agotamiento de inodos mencionadas en el módulo?",
    "options": [
      "Colas de correo sin procesar, sesiones de PHP sin garbage collect y caché de aplicación sin límite",
      "Archivos de más de 1GB de tamaño individual almacenados en /var",
      "Un exceso de memoria swap configurada en el sistema",
      "Certificados TLS vencidos acumulados en /etc/ssl"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué directiva de logrotate evita que un servicio siga escribiendo al archivo de log ya rotado?",
    "options": [
      "`compress`, porque comprime el archivo antiguo automáticamente",
      "`postrotate`, con el comando de reload del servicio dentro (por ejemplo, `systemctl reload nginx`)",
      "`missingok`, porque ignora si el archivo de log no existe",
      "`notifempty`, porque evita rotar archivos vacíos"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué opción de `find` evita cruzar hacia otros sistemas de archivos montados al buscar archivos grandes?",
    "options": [
      "`-mount-only`",
      "`--no-cross`",
      "`-xdev`",
      "`-local`"
    ],
    "correct": 2
  },
  {
    "q": "En `systemctl status`, ¿qué campo indica la razón exacta del último fallo de un servicio (exit-code, signal, timeout, core-dump)?",
    "options": [
      "\"Loaded\"",
      "\"Main PID\"",
      "\"Process\"",
      "\"Result\""
    ],
    "correct": 3
  },
  {
    "q": "Un proceso termina con status=137/FAILURE. ¿Qué se debe investigar primero?",
    "options": [
      "Si el OOM killer terminó el proceso, ya que 137 = 128 + 9 corresponde a SIGKILL",
      "Si el binario del servicio tiene permisos de ejecución correctos",
      "Si el archivo de configuración tiene errores de sintaxis",
      "Si el servicio depende de una unidad que aún no ha arrancado"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué filtro de `journalctl` es más útil para aislar la causa de un fallo específico de una unidad en la última hora?",
    "options": [
      "`journalctl -b -1`",
      "`journalctl -u <unidad> --since \"1 hour ago\" --priority=err`",
      "`journalctl --failed`",
      "`journalctl -k --since \"1 hour ago\"`"
    ],
    "correct": 1
  },
  {
    "q": "Un servicio `myapp.service` falla y su configuración parece correcta. ¿Qué otro lugar se debe revisar antes de asumir un bug en la aplicación?",
    "options": [
      "El historial de commits del repositorio de la aplicación",
      "El manual del fabricante del hardware del servidor",
      "Las dependencias de la unidad (`Requires=`/`After=`), ya que puede fallar en cascada por otra unidad que no arrancó",
      "La configuración de zona horaria del sistema operativo"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué combinación de directivas en un unit file evita que un servicio entre en un bucle de reinicios infinito?",
    "options": [
      "`Restart=always` sin ninguna otra directiva adicional",
      "`ExecStop` combinado con `TimeoutStopSec`",
      "`WantedBy=multi-user.target` combinado con `Alias=`",
      "`Restart=on-failure` combinado con `StartLimitIntervalSec` y `StartLimitBurst`"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué comando se debe ejecutar siempre después de editar manualmente un unit file de systemd?",
    "options": [
      "`systemctl daemon-reload`",
      "`systemctl reset-failed`",
      "`systemctl mask`",
      "`journalctl --rotate`"
    ],
    "correct": 0
  },
  {
    "q": "Según la regla de aislamiento con ping, si el ping al gateway funciona pero el ping a un hostname externo falla, ¿qué se debe sospechar?",
    "options": [
      "Un problema físico en la tarjeta de red del servidor",
      "Un problema de DNS, no de conectividad de red",
      "Que el firewall del gateway está bloqueando todo el tráfico saliente",
      "Que el servidor DHCP no asignó una IP válida"
    ],
    "correct": 1
  },
  {
    "q": "Un cliente recibe \"Connection refused\" al intentar conectar a un servicio. ¿Qué indica esto según el módulo?",
    "options": [
      "Que hay un problema de enrutamiento entre el cliente y el servidor",
      "Que el firewall está descartando silenciosamente los paquetes",
      "Que la red sí funciona (es una respuesta activa RST del stack TCP/IP), pero nada escucha en ese puerto",
      "Que el DNS resolvió una dirección IP incorrecta"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué resultado de `dig` indica que el registro DNS simplemente nunca existió?",
    "options": [
      "SERVFAIL",
      "Timeout sin respuesta",
      "Respuesta con IP vieja por TTL",
      "NXDOMAIN"
    ],
    "correct": 3
  },
  {
    "q": "¿Para qué sirve especificar un servidor DNS concreto con `dig @8.8.8.8 dominio`?",
    "options": [
      "Para descartar el resolver local y comparar la resolución contra un servidor externo confiable",
      "Para forzar que la resolución use IPv6 en vez de IPv4",
      "Para aumentar la velocidad de resolución cacheando la respuesta localmente",
      "Para firmar la consulta DNS con DNSSEC automáticamente"
    ],
    "correct": 0
  },
  {
    "q": "`curl -v` muestra \"SSL certificate problem: certificate has expired\" después de conectar exitosamente al puerto 443. ¿Qué indica esto sobre las capas inferiores?",
    "options": [
      "Que hay un problema de enrutamiento que impide llegar al servidor",
      "Que la interfaz, el routing, el DNS y el puerto TCP funcionan correctamente; el problema está aislado en la capa de aplicación/TLS",
      "Que el DNS está devolviendo una IP incorrecta para ese hostname",
      "Que el puerto 443 no tiene ningún proceso escuchando"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué comando permite verificar qué está escuchando en un puerto específico en la máquina local?",
    "options": [
      "`dig api.interno.local +short`",
      "`ip route show`",
      "`ss -tlnp | grep :443`",
      "`traceroute -n 8.8.8.8`"
    ],
    "correct": 2
  },
  {
    "q": "El sistema muestra \"Give root password for maintenance\" al arrancar. ¿En qué etapa de la secuencia de arranque está el problema?",
    "options": [
      "En el firmware (BIOS/UEFI), antes de que arranque cualquier bootloader",
      "En GRUB, porque el bootloader está corrupto y no encuentra su configuración",
      "En el kernel, por un \"Kernel panic - not syncing\"",
      "En init/systemd (emergency target): systemd no pudo completar algún objetivo crítico, típicamente un montaje de /etc/fstab"
    ],
    "correct": 3
  },
  {
    "q": "¿Por qué nunca se debe ejecutar `fsck` sobre un sistema de archivos montado en lectura-escritura?",
    "options": [
      "Porque procesos activos pueden estar escribiendo al mismo tiempo que fsck corrige la estructura, causando más corrupción",
      "Porque `fsck` requiere que el sistema esté completamente apagado, no solo el disco",
      "Porque `fsck` consume demasiada CPU y ralentiza los servicios activos",
      "Porque `fsck` solo funciona en particiones formateadas con XFS"
    ],
    "correct": 0
  },
  {
    "q": "Desde el menú de GRUB, ¿qué combinación de teclas permite editar temporalmente los parámetros de arranque de una entrada?",
    "options": [
      "Presionar 'c' para abrir una consola de comandos de GRUB permanente",
      "Presionar 'e' sobre la entrada y luego Ctrl+X (o F10) para arrancar con los cambios",
      "Presionar Ctrl+Alt+Supr para reiniciar directamente con los nuevos parámetros",
      "Mantener presionada la tecla Shift durante todo el arranque"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuál es la diferencia entre `rescue.target` y `emergency.target` en systemd?",
    "options": [
      "rescue.target es exclusivo de sistemas UEFI y emergency.target de sistemas BIOS",
      "No hay diferencia funcional, solo cambia el mensaje mostrado en pantalla",
      "rescue.target monta los sistemas de archivos locales e inicia sshd y servicios básicos; emergency.target no monta nada automáticamente",
      "emergency.target requiere conexión a internet y rescue.target no"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué causa más común provoca que un sistema caiga en `emergency.target` tras un reinicio normal?",
    "options": [
      "Un exceso de memoria RAM instalada que systemd no puede direccionar",
      "Una actualización del kernel realizada hace más de seis meses",
      "Un certificado TLS vencido usado por el gestor de arranque",
      "Una entrada inválida en `/etc/fstab` (UUID inexistente, disco no disponible, typo en las opciones)"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué opción de montaje en `/etc/fstab` evita que la ausencia de un disco no crítico impida el arranque completo del sistema?",
    "options": [
      "`nofail`",
      "`noauto`",
      "`ro`",
      "`defaults`"
    ],
    "correct": 0
  },
  {
    "q": "En el caso de estudio del módulo, ¿cuáles fueron las tres causas encadenadas del incidente?",
    "options": [
      "Un ataque de denegación de servicio, un certificado TLS vencido y un fallo de hardware en el disco",
      "Nivel de log DEBUG mal configurado, ausencia de logrotate que provocó disco lleno, y saturación del pool de conexiones de la aplicación",
      "Un error de DNS, un firewall mal configurado y un reinicio accidental del servidor",
      "Una actualización fallida del kernel, un servicio zombi y una fuga de memoria en nginx"
    ],
    "correct": 1
  },
  {
    "q": "Después de liberar espacio en disco y reiniciar PostgreSQL, el health check seguía devolviendo 502. ¿Qué principio del framework explica por qué había que seguir investigando?",
    "options": [
      "El paso 1, \"recolectar información\", que indica que nunca se debió tocar el sistema",
      "El paso 3, \"formular hipótesis\", que exige generar una nueva hipótesis por cada reinicio realizado",
      "El paso 7, \"verificar la resolución\": no basta con aplicar una corrección, hay que confirmar que el síntoma original desapareció",
      "El paso 6, \"aplicar la corrección\", que obliga a aplicar siempre más de un cambio a la vez"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué en el caso de estudio se truncó el archivo `debug.log` con `: >` en vez de borrarlo con `rm`?",
    "options": [
      "Porque `rm` requiere permisos de root que no estaban disponibles en ese momento",
      "Porque truncar el archivo es más rápido que borrarlo en cualquier sistema de archivos",
      "Porque el archivo estaba comprimido y `rm` no puede eliminar archivos comprimidos",
      "Porque el proceso myapp lo tenía abierto activamente (confirmado con lsof); truncar libera el espacio sin perder el descriptor de archivo"
    ],
    "correct": 3
  },
  {
    "q": "En el post-mortem del incidente, ¿qué acción preventiva de detección temprana se agregó que antes no existía?",
    "options": [
      "Una alerta de monitoreo para `df -h` por encima del 85%, en vez de alertar solo sobre errores 5xx",
      "Una alerta que notifica cada vez que se reinicia cualquier servicio del sistema",
      "Un límite de conexiones concurrentes reducido a la mitad en nginx",
      "Una revisión manual diaria del contenido completo del disco por parte de un administrador"
    ],
    "correct": 0
  },
  {
    "q": "¿Por qué resolver únicamente la primera causa encontrada (disco lleno) no fue suficiente para cerrar el incidente del caso de estudio?",
    "options": [
      "Porque el disco se volvió a llenar automáticamente pocos segundos después de liberarlo",
      "Porque el pool de conexiones de la aplicación había quedado saturado como efecto secundario mientras la base de datos no podía escribir, y ese efecto sobrevivió a la corrección original",
      "Porque nginx necesitaba ser reinstalado por completo tras el incidente",
      "Porque el certificado TLS del servidor había expirado durante el mismo incidente"
    ],
    "correct": 1
  }
]
