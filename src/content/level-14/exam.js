export default [
  // Módulo 1 — Señales (idx correct: 0,1,2,3,0,1)
  { q:"¿Qué señal es la única, junto con SIGSTOP, que un proceso nunca puede interceptar, ignorar ni bloquear?", options:["SIGKILL","SIGTERM","SIGHUP","SIGINT"], correct:0 },
  { q:"¿Cuál es el número de señal de SIGTERM, la señal por defecto de `kill`?", options:["9","15","1","2"], correct:1 },
  { q:"¿Qué hace `kill -0 PID`?", options:["Envía SIGTERM inmediatamente","Pausa el proceso sin matarlo","No envía ninguna señal real; solo comprueba si el proceso existe","Reinicia el proceso con prioridad 0"], correct:2 },
  { q:"¿Qué comando envía una señal a todos los procesos llamados `nginx` por nombre?", options:["kill nginx","top -p nginx","renice nginx","pkill nginx"], correct:3 },
  { q:"¿Qué señal se usa por convención para pedir a un servicio (nginx, sshd) que recargue su configuración?", options:["SIGHUP","SIGKILL","SIGSTOP","SIGQUIT"], correct:0 },
  { q:"En bash, ¿qué instrucción permite ejecutar una función de limpieza cuando el script recibe SIGTERM o SIGINT?", options:["signal cleanup SIGTERM","trap cleanup SIGTERM SIGINT","catch cleanup SIGTERM","on SIGTERM cleanup"], correct:1 },

  // Módulo 2 — Prioridades (idx: 2,3,0,1,2,3)
  { q:"¿Cuál es el protocolo correcto para terminar un proceso que no responde a SIGTERM?", options:["Enviar SIGKILL de inmediato sin esperar","Enviar SIGSTOP seguido de SIGCONT","Enviar SIGTERM, esperar un timeout razonable y solo entonces enviar SIGKILL","Reiniciar el sistema completo"], correct:2 },
  { q:"¿Qué valor de nice representa la prioridad más alta posible para un proceso?", options:["19","0","100","-20"], correct:3 },
  { q:"¿Quién puede asignar un valor nice negativo (mayor prioridad) a un proceso?", options:["Solo root","Cualquier usuario del sistema","Solo el propio proceso mediante fork","Ningún usuario, está deshabilitado"], correct:0 },
  { q:"Según la fórmula del scheduler, ¿cuál es la prioridad efectiva de un proceso con nice 0?", options:["0","20","10","39"], correct:1 },
  { q:"¿Qué comando cambia la prioridad de un proceso que ya está en ejecución, sin reiniciarlo?", options:["chrt","nice","renice","ulimit"], correct:2 },
  { q:"¿Qué política de scheduling en tiempo real usa un quantum de tiempo y coloca al proceso al final de la cola cuando lo agota?", options:["SCHED_BATCH","SCHED_FIFO","SCHED_OTHER","SCHED_RR"], correct:3 },

  // Módulo 3 — /proc (idx: 0,1,2,3,0,1)
  { q:"¿Qué scheduler es el que usa Linux por defecto desde la versión 2.6.23 para procesos normales?", options:["Completely Fair Scheduler (CFS)","SCHED_FIFO","SCHED_RR","SCHED_IDLE"], correct:0 },
  { q:"¿Qué archivo dentro de /proc/PID contiene la línea de comando completa con la que se lanzó el proceso?", options:["comm","cmdline","status","environ"], correct:1 },
  { q:"¿Qué diferencia hay entre VmSize y VmRSS en /proc/PID/status?", options:["Son sinónimos exactos del mismo valor","VmSize es solo para hilos; VmRSS es solo para el proceso principal","VmSize es memoria virtual total; VmRSS es la memoria física realmente residente en RAM","VmRSS siempre es mayor que VmSize"], correct:2 },
  { q:"¿Qué muestra el directorio /proc/PID/fd/?", options:["Los hilos activos del proceso","El historial de señales recibidas","La lista de librerías compiladas estáticamente","Los descriptores de archivo abiertos por el proceso"], correct:3 },
  { q:"En /proc/PID/maps, ¿qué representa una región marcada con la etiqueta [heap]?", options:["El área de memoria dinámica asignada en tiempo de ejecución","El código ejecutable del binario","Una librería compartida mapeada","La pila (stack) de un hilo"], correct:0 },
  { q:"¿Qué campo de /proc/PID/io representa los bytes realmente leídos del disco, sin contar caché?", options:["rchar","read_bytes","syscr","wchar"], correct:1 },

  // Módulo 4 — ulimits (idx: 2,3,0,1,2,3)
  { q:"¿Cómo se puede saber si un archivo abierto por un proceso fue eliminado del filesystem mientras seguía en uso?", options:["No es posible detectarlo sin reiniciar el proceso","Revisando /proc/PID/status en el campo State","Buscando la etiqueta (deleted) en el listado de /proc/PID/fd/","Con el comando renice -p PID"], correct:2 },
  { q:"¿Cuál es la diferencia entre un soft limit y un hard limit en ulimit?", options:["No hay diferencia práctica entre ambos","El soft limit es el techo máximo; el hard limit es el valor activo","El hard limit solo aplica a procesos de root","El soft limit es el valor activo; el hard limit es el techo máximo que puede alcanzar el soft limit"], correct:3 },
  { q:"¿Qué opción de `ulimit` controla el número máximo de descriptores de archivo abiertos por proceso?", options:["-n","-u","-s","-t"], correct:0 },
  { q:"¿Por qué configurar límites en /etc/security/limits.conf no afecta a un servicio iniciado por systemd?", options:["limits.conf está deprecado y no funciona en ningún caso","limits.conf solo aplica a sesiones que pasan por PAM (login, ssh, su); systemd no pasa por PAM al iniciar servicios","Porque systemd usa un formato binario incompatible","systemd ignora todos los archivos de configuración de PAM por diseño"], correct:1 },
  { q:"¿Qué directiva se usa dentro de un archivo `.service` de systemd para fijar el máximo de descriptores de archivo abiertos?", options:["MaxOpenFiles=","FileLimit=","LimitNOFILE=","ulimit -n"], correct:2 },
  { q:"¿Puede un proceso sin privilegios de root aumentar su propio soft limit hasta el valor del hard limit ya configurado?", options:["No, solo root puede modificar cualquier límite","Solo puede hacerlo si el proceso corre en un contenedor","Solo es posible reiniciando el proceso con systemctl","Sí, cualquier proceso puede subir su soft limit hasta el hard limit sin privilegios especiales"], correct:3 },

  // Módulo 5 — cgroups v2 (idx: 0,1,2,3,0,1)
  { q:"¿Qué archivo muestra el límite global de descriptores de archivo del sistema completo (no por proceso)?", options:["/proc/sys/fs/file-max","/proc/sys/kernel/pid_max","/proc/PID/limits","/etc/security/limits.conf"], correct:0 },
  { q:"¿Qué son los cgroups en el kernel de Linux?", options:["Un sistema de logs centralizados","Una característica que organiza procesos en grupos jerárquicos para aplicar políticas de recursos","Un reemplazo directo de /proc","Un tipo de señal para procesos agrupados"], correct:1 },
  { q:"¿Qué archivo de un cgroup v2 define el límite duro de memoria, cuyo exceso activa el OOM killer dentro del grupo?", options:["memory.high","memory.current","memory.max","memory.stat"], correct:2 },
  { q:"¿Qué diferencia hay entre memory.max y memory.high en cgroups v2?", options:["memory.max solo aplica a swap; memory.high aplica a RAM","Son idénticos, solo cambia el nombre por compatibilidad","memory.high mata el proceso; memory.max solo advierte","memory.high es el límite blando que throttlea sin matar; memory.max es el límite duro que activa el OOM killer"], correct:3 },
  { q:"En producción, ¿cuál es la forma recomendada de aplicar límites de cgroups a un servicio en lugar de escribir directamente en /sys/fs/cgroup?", options:["Usar systemd con directivas como MemoryMax y CPUQuota en el archivo .service","Editar manualmente el kernel","Usar únicamente ulimit en el shell interactivo","No es posible aplicar límites a servicios systemd"], correct:0 },
  { q:"Un servicio tiene `CPUQuota=50%` en un servidor de 4 núcleos. ¿Cuántos núcleos puede usar como máximo ese servicio?", options:["4 núcleos completos","0.5 núcleos (mitad de un core)","2 núcleos completos","50 núcleos virtuales"], correct:1 },

  // Módulo 6 — zombies, huérfanos (idx: 2,3,0,1,2,3,0)
  { q:"¿Qué estado de proceso corresponde a un proceso que ya terminó pero cuyo padre aún no ha llamado wait()?", options:["Sleeping (S)","Stopped (T)","Zombie (Z)","Disk sleep (D)"], correct:2 },
  { q:"¿Qué recursos consume un proceso zombie mientras existe?", options:["Todo el heap que tenía antes de morir","CPU y memoria significativos","Los mismos recursos que un proceso en ejecución normal","Solo una entrada en la tabla de procesos, sin CPU ni memoria activa"], correct:3 },
  { q:"¿Qué es un proceso huérfano?", options:["Un proceso cuyo padre terminó antes que él y fue readoptado por init/systemd (PID 1)","Un sinónimo exacto de proceso zombie","Un proceso que nunca tuvo padre","Un proceso sin PID asignado"], correct:0 },
  { q:"¿Cuál es la forma correcta de intentar limpiar procesos zombie sin matar al proceso padre?", options:["Cambiar el nice del zombie a 19","Enviar SIGCHLD al proceso padre para que llame a wait()","Ejecutar kill -9 directamente sobre el PID del zombie","Reiniciar el servidor completo"], correct:1 },
  { q:"¿Por qué `kill -9` no tiene ningún efecto sobre un proceso zombie?", options:["Porque hace falta ser root para matar zombies","Porque SIGKILL solo funciona con procesos en estado Running","Porque el zombie ya terminó su ejecución; solo queda su registro en la tabla de procesos, no hay proceso vivo al que matar","Porque los zombies bloquean todas las señales por diseño"], correct:2 },
  { q:"¿Qué herramienta mínima se usa en Docker como PID 1 (`--init`) para evitar la acumulación de zombies en contenedores?", options:["tini","systemd completo","chrt","pidstat"], correct:0 },

  // Módulo 7 — pmap/pidstat/perf (idx: 1,2,3,0,1,2)
  { q:"¿Qué muestra el comando `pmap -x PID`?", options:["Solo el uso de CPU del proceso","El mapa detallado de memoria del proceso, con RSS y dirty por cada región","Las señales pendientes del proceso","El árbol de procesos hijos"], correct:1 },
  { q:"¿Qué columna de `pmap -x` indica la memoria física realmente usada por cada región de memoria?", options:["Kbytes","Mode","RSS","Dirty"], correct:2 },
  { q:"¿Para qué sirve principalmente `pidstat -d 2`?", options:["Cambiar la prioridad de los procesos activos","Listar los descriptores de archivo abiertos","Mostrar el uso de CPU por hilo","Mostrar estadísticas de I/O (lectura/escritura en disco) por proceso cada 2 segundos"], correct:3 },
  { q:"¿Qué ventaja principal tiene `perf` sobre `strace` para hacer profiling de un proceso en producción?", options:["perf usa contadores de hardware con muestreo estadístico y overhead mucho menor (<5%) que strace","No hay diferencia de rendimiento entre ambos","strace siempre es más preciso que perf","perf requiere reiniciar el proceso y strace no"], correct:0 },
  { q:"¿Qué subcomando de `perf` permite grabar un perfil de CPU por muestreo durante un periodo de tiempo?", options:["perf stat","perf record","perf list","perf top -b"], correct:1 },
  { q:"¿Qué información aporta /proc/PID/status que pmap no desglosa directamente?", options:["Las señales pendientes de entrega","El historial de I/O del proceso","El total agregado de memoria física (VmRSS) del proceso completo","El detalle por librería y por región de memoria"], correct:2 },

  // Módulo 8 — Proyecto real (idx: 3,0,1,2,3,0,1,2)
  { q:"En un incidente de memory leak, ¿qué comando permite aplicar un límite de memoria virtual a un proceso ya en ejecución sin reiniciarlo?", options:["renice --as=8G","ulimit -v 8G (en otra terminal)","kill -MEMLIMIT PID","prlimit --pid PID --as=8G:8G"], correct:3 },
  { q:"Ante un proceso runaway que consume 100% de CPU en un servidor de 8 núcleos, ¿qué acción de primera respuesta reduce su impacto sin detenerlo?", options:["Bajar su prioridad con renice -n 19 -p PID","Ejecutar kill -9 inmediatamente","Aumentar su hard limit de CPU","Aplicar chrt -f 99 para darle tiempo real"], correct:0 },
  { q:"¿Qué comando confina un proceso a un núcleo de CPU específico para limitar su impacto en el resto del sistema?", options:["nice -n 19","taskset -cp NUCLEO PID","ionice -c 3","ulimit -u 1"], correct:1 },
  { q:"En el escenario de cgroups v2 del proyecto final, ¿qué le sucede exactamente a un proceso que supera memory.max?", options:["El proceso se pausa hasta liberar memoria manualmente","No sucede nada hasta que el administrador lo revisa","El OOM killer del kernel termina el proceso con SIGKILL dentro de ese cgroup","El kernel aplica swap forzado sin matar el proceso"], correct:2 },
  { q:"En el script de apagado graceful del proyecto final, ¿cuál es el orden correcto de señales aplicado a un servicio que no responde a tiempo?", options:["Enviar SIGKILL de inmediato, sin intentar SIGTERM","Enviar SIGSTOP y luego SIGCONT en bucle","Enviar SIGHUP repetidamente hasta que el proceso termine","Enviar SIGTERM, esperar un timeout definido y, si no termina, enviar SIGKILL"], correct:3 },
  { q:"¿Qué indica un valor alto de %wait en la salida de `pidstat -u` para un proceso?", options:["El proceso pasa buena parte del tiempo esperando operaciones de I/O","El proceso está usando mucha CPU de forma efectiva","El proceso tiene prioridad nice negativa","El proceso está en estado zombie"], correct:0 },
  { q:"¿Qué comando muestra los límites de recursos (soft y hard) efectivos que tiene un proceso ya en ejecución?", options:["ulimit -a","cat /proc/PID/limits","ps -o pid,ni,pri -p PID","chrt -p PID"], correct:1 },
  { q:"¿Qué mecanismo del kernel permite a un proceso no privilegiado como PID 1 (por ejemplo dentro de un contenedor) adoptar y limpiar procesos huérfanos de su subárbol?", options:["oom_score_adj","ulimit -u","child subreaper mediante prctl(PR_SET_CHILD_SUBREAPER)","cgroup.freeze"], correct:2 },
];
