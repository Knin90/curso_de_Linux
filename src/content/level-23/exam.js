const exam = [
  {
    q: "¿Por qué auditd es considerado la fuente de verdad forense en un sistema Linux comprometido?",
    options: [
      "Porque opera a nivel de kernel, antes de que procesos de usuario (incluso root) puedan manipular los registros",
      "Porque cifra automáticamente todos los archivos del sistema",
      "Porque reemplaza completamente a syslog",
      "Porque solo puede ser leído por el usuario root",
    ],
    correct: 0,
  },
  {
    q: "¿Qué campo del registro de auditoría identifica al usuario real que inició sesión, incluso después de usar sudo o su?",
    options: [
      "uid",
      "auid",
      "euid",
      "fsuid",
    ],
    correct: 1,
  },
  {
    q: "¿Qué comando muestra el estado del subsistema de auditoría del kernel (backlog, pérdidas, límites)?",
    options: [
      "auditctl -l",
      "ausearch -s",
      "auditctl -s",
      "aureport -s",
    ],
    correct: 2,
  },
  {
    q: "En /etc/audit/auditd.conf, ¿qué hace la opción `admin_space_left_action = SUSPEND`?",
    options: [
      "Suspende el servicio auditd al arrancar el sistema",
      "Envía un correo al administrador sin detener la auditoría",
      "Elimina automáticamente los logs más antiguos",
      "Suspende la auditoría cuando el espacio en disco llega a un nivel crítico, protegiendo la integridad del log",
    ],
    correct: 3,
  },
  {
    q: "¿Qué tipo de registro en audit.log contiene la ruta del archivo afectado por un evento?",
    options: [
      "type=PATH",
      "type=SYSCALL",
      "type=CWD",
      "type=USER_AUTH",
    ],
    correct: 0,
  },
  {
    q: "Sin reglas de auditoría configuradas, ¿qué eventos captura auditd por defecto?",
    options: [
      "Todas las llamadas al sistema execve",
      "Solo eventos de login/logout",
      "Todos los accesos a /etc",
      "Ninguno, hay que activarlo manualmente cada vez",
    ],
    correct: 1,
  },
  {
    q: "¿Cuál es la diferencia principal entre una regla creada con `auditctl` y una definida en `/etc/audit/rules.d/`?",
    options: [
      "No hay diferencia, ambas persisten igual",
      "Las de rules.d solo aplican a syscalls, nunca a archivos",
      "Las de auditctl son temporales; las de rules.d persisten tras reinicio al cargarse con augenrules",
      "auditctl solo funciona en modo debug",
    ],
    correct: 2,
  },
  {
    q: "¿Qué permisos representa la letra `a` en una regla de tipo watch (`-p`)?",
    options: [
      "append (solo escritura al final del archivo)",
      "admin (acceso administrativo)",
      "archive (archivado automático)",
      "attribute change (cambio de atributos, como permisos o propietario)",
    ],
    correct: 3,
  },
  {
    q: "¿Por qué las reglas de syscall suelen definirse dos veces, una con `arch=b64` y otra con `arch=b32`?",
    options: [
      "Para cubrir binarios de 32 bits, que usan una tabla de syscalls distinta a la de 64 bits",
      "Para duplicar los eventos y tener redundancia en el log",
      "Porque auditd requiere exactamente dos reglas por cada syscall",
      "Es un requisito obsoleto que ya no aplica en kernels modernos",
    ],
    correct: 0,
  },
  {
    q: "¿Qué comando compila y carga todas las reglas definidas en /etc/audit/rules.d/?",
    options: [
      "auditctl --compile",
      "ausearch --rules",
      "systemctl reload audit-rules",
      "augenrules --load",
    ],
    correct: 1,
  },
  {
    q: "¿Qué efecto tiene la línea `-e 2` en el archivo 99-finalize.rules?",
    options: [
      "Deshabilita temporalmente la auditoría para mantenimiento",
      "Duplica el backlog de eventos en el kernel",
      "Bloquea el subsistema de auditoría en modo inmutable, requiriendo reinicio para cambiar reglas",
      "Activa el modo verbose en los logs",
    ],
    correct: 2,
  },
  {
    q: "¿Para qué sirve la opción `-k` al crear una regla de auditoría?",
    options: [
      "Define el kernel objetivo de la regla",
      "Especifica el usuario que puede modificar la regla",
      "Indica el nivel de prioridad del evento",
      "Asigna una clave descriptiva que permite buscar y agrupar eventos relacionados con ausearch",
    ],
    correct: 3,
  },
  {
    q: "¿Cómo se eliminan todas las reglas de auditoría activas en el kernel?",
    options: [
      "auditctl -D",
      "auditctl --reset",
      "augenrules --clear",
      "ausearch -D",
    ],
    correct: 0,
  },
  {
    q: "¿Qué opción de ausearch traduce UIDs, números de syscall y timestamps a un formato legible?",
    options: [
      "-f",
      "-i",
      "-m",
      "-k",
    ],
    correct: 1,
  },
  {
    q: "¿Qué diferencia hay entre `ausearch -ua alice` y `ausearch -ul alice`?",
    options: [
      "Son exactamente lo mismo, solo cambia la sintaxis",
      "-ua busca por UID numérico y -ul por auid",
      "-ua busca por nombre en el campo auid; -ul busca por el nombre de login del usuario, siendo más robusto",
      "-ua solo funciona con root y -ul con usuarios normales",
    ],
    correct: 2,
  },
  {
    q: "¿Qué comando de ausearch busca eventos relacionados con la clave \"identity\"?",
    options: [
      "ausearch --tag identity",
      "ausearch -id identity",
      "ausearch -m identity",
      "ausearch -k identity",
    ],
    correct: 3,
  },
  {
    q: "¿Cómo se buscarían todos los eventos de auditoría registrados hoy?",
    options: [
      "ausearch --start today",
      "ausearch --date today",
      "ausearch -t today",
      "ausearch --range today",
    ],
    correct: 0,
  },
  {
    q: "¿Qué formato de salida de ausearch es más adecuado para procesamiento automático por un SIEM?",
    options: [
      "Formato crudo por defecto",
      "--format json",
      "-i con grep",
      "Formato CSV, el único soportado",
    ],
    correct: 1,
  },
  {
    q: "Un atacante ejecutó un binario desde /tmp. ¿Qué estrategia con ausearch ayuda a detectarlo?",
    options: [
      "ausearch --start yesterday sin filtros adicionales",
      "ausearch -m USER_LOGIN únicamente",
      "ausearch -k exec-commands -i seguido de un filtro por exe=/tmp",
      "ausearch -p 1 para buscar el proceso init",
    ],
    correct: 2,
  },
  {
    q: "¿Qué comando genera el resumen estadístico general de toda la actividad registrada en audit.log?",
    options: [
      "ausearch --summary",
      "auditctl --report",
      "aureport --raw",
      "aureport",
    ],
    correct: 3,
  },
  {
    q: "¿Qué hace la opción `--summary` combinada con cualquier reporte de aureport?",
    options: [
      "Genera estadísticas agregadas mostrando los elementos más frecuentes (top-N)",
      "Elimina los registros duplicados del log",
      "Convierte el reporte a formato JSON",
      "Envía el reporte automáticamente por correo",
    ],
    correct: 0,
  },
  {
    q: "¿Cuál es la forma más rápida de detectar actividad anómala combinando reportes de aureport?",
    options: [
      "aureport --user sin filtros",
      "Combinar --failed con cualquier tipo de reporte",
      "Ejecutar aureport sin argumentos cada hora",
      "aureport --exe únicamente",
    ],
    correct: 1,
  },
  {
    q: "¿Qué reporte de aureport se usaría para ver si se creó o eliminó una cuenta de usuario?",
    options: [
      "aureport --login",
      "aureport --file",
      "aureport --acct",
      "aureport --pid",
    ],
    correct: 2,
  },
  {
    q: "¿Cuál es la diferencia entre `aureport --auth` y `aureport --login`?",
    options: [
      "Son sinónimos exactos en versiones recientes de auditd",
      "--auth solo aplica a usuarios root",
      "--login requiere permisos especiales y --auth no",
      "--login solo reporta inicios de sesión completos; --auth incluye también sudo, su y cualquier verificación PAM",
    ],
    correct: 3,
  },
  {
    q: "¿Cómo se automatizaría el envío diario de un reporte de auditoría por correo?",
    options: [
      "Con un script que ejecute aureport y una entrada en crontab que lo dispare periódicamente",
      "Configurando auditd.conf con mail_report = yes",
      "ausearch lo hace automáticamente sin configuración adicional",
      "No es posible automatizar reportes de aureport",
    ],
    correct: 0,
  },
  {
    q: "¿Por qué es peligroso activar `-w /usr/bin/ -p x` en producción?",
    options: [
      "Porque bloquea la ejecución de todos los binarios",
      "Porque genera un volumen masivo de eventos, ya que cada comando ejecutado dispara un registro",
      "Porque requiere reiniciar el sistema cada vez",
      "Porque solo funciona en sistemas de 32 bits",
    ],
    correct: 1,
  },
  {
    q: "¿Qué directorio se recomienda monitorear para detectar persistencia mediante claves SSH añadidas por un atacante?",
    options: [
      "/etc/ssh/moduli",
      "/var/log/secure",
      "/root/.ssh/ y los home de usuarios",
      "/etc/hosts.allow",
    ],
    correct: 2,
  },
  {
    q: "¿Qué permisos (`-p`) son los más adecuados para monitorear modificaciones críticas en /etc/passwd?",
    options: [
      "r (solo lectura)",
      "x (solo ejecución)",
      "rx (lectura y ejecución)",
      "wa (escritura y cambio de atributos)",
    ],
    correct: 3,
  },
  {
    q: "¿Cuál de las siguientes NO es una técnica de persistencia común mencionada tras un compromiso del sistema?",
    options: [
      "Cambiar la zona horaria del sistema",
      "Añadir un usuario root falso en /etc/passwd",
      "Modificar /etc/sudoers para dar privilegios sin contraseña",
      "Reemplazar un binario del sistema por una versión troyanizada",
    ],
    correct: 0,
  },
  {
    q: "¿Qué combinación de herramientas ofrece doble cobertura para verificar integridad de archivos críticos?",
    options: [
      "Solo revisar manualmente los logs de systemd",
      "auditd combinado con checksums periódicos (por ejemplo con sha256sum o AIDE)",
      "Solo confiar en los permisos del sistema de archivos",
      "Deshabilitar auditd y usar únicamente cron",
    ],
    correct: 1,
  },
  {
    q: "¿Cómo se identificaría con auditd qué usuario modificó /etc/sudoers, incluso si usó sudo?",
    options: [
      "Revisando el campo uid, que nunca cambia",
      "Es imposible determinarlo con auditd",
      "Buscando con ausearch -k sudoers y revisando el campo auid del evento",
      "Solo se puede saber revisando /var/log/wtmp",
    ],
    correct: 2,
  },
  {
    q: "Según las categorías de archivos críticos del módulo, ¿en qué categoría se ubica /etc/crontab?",
    options: [
      "Identidad",
      "Autorización",
      "Boot y GRUB",
      "Cron y scheduled tasks",
    ],
    correct: 3,
  },
  {
    q: "¿Qué combinación de campos en un evento execve es la firma típica de una escalada de privilegios exitosa?",
    options: [
      "auid>=1000 y euid=0",
      "auid=-1 y uid=33",
      "ppid=1 y pid=1",
      "success=no y exit=-1",
    ],
    correct: 0,
  },
  {
    q: "¿Qué significa `auid=4294967295` en un registro de auditoría?",
    options: [
      "Un error de lectura en el log",
      "Que es -1 en unsigned: un proceso sin login interactivo, típico de daemons o cron",
      "Que el usuario tiene privilegios administrativos completos",
      "Que el evento fue generado por el kernel directamente",
    ],
    correct: 1,
  },
  {
    q: "¿Qué syscall se asocia comúnmente con técnicas de inyección o depuración de procesos y merece monitoreo especial?",
    options: [
      "read",
      "close",
      "ptrace",
      "getpid",
    ],
    correct: 2,
  },
  {
    q: "¿Qué técnica de evasión usa `memfd_create` junto con `execve` o `execveat`?",
    options: [
      "Ataques de fuerza bruta contra SSH",
      "Escaneo de puertos abiertos",
      "Modificación de la tabla de rutas de red",
      "Ejecución de código desde memoria sin tocar disco (fileless malware)",
    ],
    correct: 3,
  },
  {
    q: "¿Cómo se distingue en el log entre \"usuario ejecutó sudo\" y \"binario SUID ejecutado directamente\"?",
    options: [
      "El campo comm/exe muestra sudo con un evento USER_CMD asociado; el binario SUID muestra el ejecutable específico sin ese evento",
      "No hay forma de distinguirlos, generan el mismo evento",
      "Solo se distingue revisando el hash del binario",
      "El campo pid es diferente entre ambos casos siempre",
    ],
    correct: 0,
  },
  {
    q: "¿Por qué se recomienda ser selectivo con los filtros `-F` en reglas de syscall?",
    options: [
      "Porque auditd limita el número total de filtros a 3",
      "Porque las reglas de syscall son de alto volumen y sin filtros adecuados se satura el log",
      "Porque los filtros -F requieren licencia comercial",
      "Porque cada filtro reduce la seguridad del sistema",
    ],
    correct: 1,
  },
  {
    q: "¿Qué requisito de PCI-DSS exige monitorear el propio directorio de logs de auditoría?",
    options: [
      "Requisito 10.2.1",
      "Requisito 10.7",
      "Requisito 10.2.3",
      "Requisito 10.2.6",
    ],
    correct: 2,
  },
  {
    q: "¿Cuántos meses de retención de logs exige típicamente PCI-DSS (con parte online)?",
    options: [
      "3 meses en total",
      "6 meses en total",
      "24 meses obligatorios sin excepción",
      "12 meses, con al menos 3 meses disponibles online",
    ],
    correct: 3,
  },
  {
    q: "¿Qué opción de auditctl es requerida por PCI-DSS para proteger la integridad de la configuración de auditoría?",
    options: [
      "-e 2 (modo inmutable)",
      "-e 0",
      "-e 1",
      "-b 8192",
    ],
    correct: 0,
  },
  {
    q: "¿Qué detecta la regla CIS `-a always,exit -F exit=-EACCES -k access`?",
    options: [
      "Cambios exitosos de contraseña",
      "Intentos de acceso a archivos que fueron denegados por permisos, típico de reconocimiento",
      "Reinicios del servicio auditd",
      "Conexiones de red salientes exitosas",
    ],
    correct: 1,
  },
  {
    q: "¿Qué área cubre la sección CIS 4.1.4 del benchmark de Linux?",
    options: [
      "Cambios de fecha y hora del sistema",
      "Carga de módulos del kernel",
      "Modificaciones de usuarios y grupos (/etc/passwd, /etc/group, etc.)",
      "Sesiones de login históricas",
    ],
    correct: 2,
  },
  {
    q: "¿Cómo se puede demostrar a un auditor externo que los logs de auditoría no fueron modificados?",
    options: [
      "Mostrando únicamente la fecha de creación del archivo audit.log",
      "Basta con afirmarlo verbalmente sin evidencia",
      "Eliminando el log y generando uno nuevo antes de la auditoría",
      "Presentando eventos DAEMON_START/DAEMON_ROTATE/DAEMON_END junto con ausencia de escrituras no autorizadas, y checksums o envío a un SIEM externo",
    ],
    correct: 3,
  },
  {
    q: "¿Por qué el archivo 99-finalize.rules debe cargarse siempre al final?",
    options: [
      "Porque incluye -e 2, que bloquea cambios de reglas; si se cargara antes, las demás reglas no podrían añadirse sin reiniciar",
      "Porque contiene las reglas de menor prioridad",
      "Porque el nombre del archivo no importa, es solo convención estética",
      "Porque augenrules ignora los archivos cargados al final",
    ],
    correct: 0,
  },
  {
    q: "En el laboratorio, ¿qué evento se busca para confirmar que la regla sobre /etc/passwd funciona correctamente?",
    options: [
      "Un evento type=USER_LOGIN sin relación con el archivo",
      "Un evento con name=/etc/passwd y type=PATH, encontrado con ausearch -k identity",
      "Un mensaje en /var/log/syslog exclusivamente",
      "La ausencia total de eventos en el log",
    ],
    correct: 1,
  },
  {
    q: "Si `auditctl -s` muestra `enabled 2`, ¿qué significa y cómo se pueden modificar las reglas?",
    options: [
      "Significa que la auditoría está deshabilitada y basta con auditctl -e 1 para activarla",
      "Significa que hay un error de configuración y debe reinstalarse auditd",
      "Significa modo inmutable: ningún proceso, ni root, puede cambiar las reglas hasta reiniciar el sistema",
      "Significa que el backlog está lleno y se debe aumentar con -b",
    ],
    correct: 2,
  },
  {
    q: "¿Con qué permisos se recomienda guardar los reportes diarios de auditoría generados por el script?",
    options: [
      "777, para que cualquier usuario pueda leerlos",
      "644, permisos estándar de lectura pública",
      "No es necesario restringir permisos si el reporte está en /tmp",
      "600, ya que contienen información sensible de actividad del sistema",
    ],
    correct: 3,
  },
  {
    q: "¿Qué comando permite verificar cuántas reglas de auditoría están actualmente cargadas en el kernel?",
    options: [
      "auditctl -l | wc -l",
      "aureport --rules",
      "ausearch --count rules",
      "systemctl status auditd --rules",
    ],
    correct: 0,
  },
  {
    q: "Según la estructura recomendada del proyecto, ¿qué archivo contiene las reglas de escalada de privilegios (setuid, ptrace, execve con euid=0)?",
    options: [
      "00-base.rules",
      "20-privilege.rules",
      "10-identity.rules",
      "40-sessions.rules",
    ],
    correct: 1,
  },
]

export default exam
