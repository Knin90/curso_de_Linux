const exam = [
  // Módulo 1 — MAC vs DAC
  {
    q: '¿Qué diferencia fundamental existe entre DAC y MAC?',
    options: [
      'DAC es controlado por el propietario del recurso; MAC es impuesto por el kernel según la política del administrador, sin que el propietario pueda modificarla',
      'DAC es más moderno que MAC',
      'MAC solo aplica a archivos, DAC a procesos',
      'No hay diferencia, son sinónimos',
    ],
    correct: 0,
  },
  {
    q: 'Según el modelo Bell-LaPadula, ¿qué regla evita que información clasificada fluya hacia niveles inferiores?',
    options: ['No write up', 'No write down', 'No read down', 'No execute up'],
    correct: 1,
  },
  {
    q: '¿Cuál es la limitación crítica de DAC mencionada respecto a la escalada de privilegios?',
    options: [
      'Es demasiado lento',
      'No soporta ACLs',
      'Si un proceso escala privilegios a root, DAC no lo detiene',
      'Solo funciona en sistemas de archivos ext4',
    ],
    correct: 2,
  },
  {
    q: '¿Cuál de los siguientes NO es un mecanismo de DAC?',
    options: ['chmod', 'chown', 'setfacl (ACL POSIX)', 'Política de tipo SELinux (Type Enforcement)'],
    correct: 3,
  },
  {
    q: '¿Qué caracteriza a SELinux frente a AppArmor?',
    options: [
      'Usa etiquetas en inodos (contextos), más robusto ante renombrado de archivos',
      'Usa únicamente rutas de archivos',
      'No requiere política, es automático',
      'Solo funciona en Ubuntu',
    ],
    correct: 0,
  },
  {
    q: '¿Qué es seccomp según lo descrito en el módulo?',
    options: [
      'Un reemplazo completo de SELinux',
      'Un filtro de syscalls que complementa SELinux/AppArmor, no los reemplaza',
      'Una distribución Linux',
      'Un tipo de contexto SELinux',
    ],
    correct: 1,
  },

  // Módulo 2 — SELinux: modos, contextos y política targeted
  {
    q: '¿Qué hace el modo permissive de SELinux?',
    options: [
      'Deniega y registra violaciones',
      'Desactiva completamente SELinux',
      'Solo registra violaciones sin denegar el acceso',
      'Requiere reboot para activarse',
    ],
    correct: 2,
  },
  {
    q: '¿Cuál es el formato del contexto SELinux?',
    options: [
      'tipo:rol:usuario:nivel',
      'clase:permiso:dominio:nivel',
      'host:usuario:grupo:tipo',
      'user:role:type:level',
    ],
    correct: 3,
  },
  {
    q: '¿Qué comando muestra el contexto SELinux de archivos?',
    options: ['ls -Z', 'ps -Z', 'id -Z', 'getenforce'],
    correct: 0,
  },
  {
    q: '¿Qué campo del contexto SELinux gobierna principalmente la política targeted?',
    options: ['user', 'type', 'level', 'role'],
    correct: 1,
  },
  {
    q: '¿Qué comando activa de forma permanente un boolean SELinux?',
    options: [
      'setsebool httpd_can_connect_db on',
      'getsebool -a',
      'setsebool -P httpd_can_connect_db on',
      'semanage boolean -d httpd_can_connect_db',
    ],
    correct: 2,
  },
  {
    q: 'En producción, ¿qué se recomienda para diagnosticar problemas de SELinux sin comprometer la seguridad?',
    options: [
      'SELINUX=disabled permanente',
      'Desinstalar SELinux',
      'Ignorar los AVC denials',
      'Usar setenforce 0 (permissive) temporalmente, nunca disabled',
    ],
    correct: 3,
  },

  // Módulo 3 — Gestión de contextos: chcon, restorecon, semanage
  {
    q: '¿Qué hace chcon?',
    options: [
      'Cambia el contexto SELinux del inodo de forma temporal, revertible con restorecon',
      'Registra una regla permanente en la base de datos de política',
      'Cambia el modo enforcing/permissive',
      'Elimina un boolean',
    ],
    correct: 0,
  },
  {
    q: '¿Qué comando aplica el contexto correcto según la base de datos registrada con semanage fcontext?',
    options: ['chcon -R', 'restorecon -Rv', 'setenforce 1', 'getsebool -a'],
    correct: 1,
  },
  {
    q: 'Para hacer permanente un cambio de contexto en /srv/web, ¿qué comando ejecutarías primero?',
    options: [
      'restorecon -Rv /srv/web',
      'chcon -t httpd_sys_content_t /srv/web',
      "semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'",
      'setsebool -P httpd_can_network_connect on',
    ],
    correct: 2,
  },
  {
    q: '¿Por qué chcon en /srv/web seguido de restorecon en /srv/web revierte el cambio?',
    options: [
      'restorecon siempre falla',
      'chcon no modifica el inodo',
      'semanage está deshabilitado',
      'restorecon aplica el contexto de la base de datos de política, que no tenía registrada la ruta, revirtiendo al contexto por defecto',
    ],
    correct: 3,
  },
  {
    q: '¿Qué comando agrega el puerto 3000 al tipo http_port_t?',
    options: [
      'semanage port -a -t http_port_t -p tcp 3000',
      'chcon -t http_port_t 3000',
      'restorecon -p 3000',
      'setsebool -P http_port_t 3000',
    ],
    correct: 0,
  },
  {
    q: '¿Qué comando lista los módulos de política SELinux instalados?',
    options: ['semanage fcontext -l', 'semanage module -l', 'semanage port -l', 'semanage login -l'],
    correct: 1,
  },

  // Módulo 4 — Diagnóstico: audit2why, audit2allow
  {
    q: 'En un mensaje AVC, ¿qué representa el campo scontext?',
    options: [
      'El contexto del recurso objetivo',
      'La clase del objeto',
      'El contexto del proceso que intenta el acceso (sujeto)',
      'El modo enforcing/permissive',
    ],
    correct: 2,
  },
  {
    q: '¿Qué comando filtra denials AVC recientes del log de auditoría?',
    options: ['getsebool -a', 'semanage fcontext -l', 'restorecon -Rv', 'ausearch -m avc -ts recent'],
    correct: 3,
  },
  {
    q: '¿Qué hace audit2why?',
    options: [
      'Traduce un mensaje AVC crudo en una explicación legible con posible solución',
      'Genera un módulo de política compilado',
      'Cambia el modo de SELinux',
      'Lista los booleans activos',
    ],
    correct: 0,
  },
  {
    q: '¿Qué genera el comando audit2allow -M nombre?',
    options: [
      'Un reporte de auditoría en texto plano',
      'Un módulo de política (.te y .pp) que permite el acceso previamente denegado',
      'Un cambio permanente de contexto',
      'Una regla de firewall',
    ],
    correct: 1,
  },
  {
    q: '¿Qué se debe hacer antes de instalar un módulo generado por audit2allow?',
    options: [
      'Ejecutar setenforce 0 primero',
      'Reiniciar el servidor',
      'Revisar el archivo .te para asegurar que solo permite lo mínimo necesario',
      'Eliminar el log de auditoría',
    ],
    correct: 2,
  },
  {
    q: 'Un AVC muestra denied { name_connect } con tcontext=mysqld_port_t para el dominio httpd_t. ¿Cuál es la solución correcta?',
    options: [
      'restorecon -Rv /var/lib/mysql',
      'semanage fcontext -a -t mysqld_db_t',
      'audit2allow -M mysql_fix',
      'setsebool -P httpd_can_connect_db on',
    ],
    correct: 3,
  },

  // Módulo 5 — AppArmor: perfiles, modos y herramientas
  {
    q: '¿En qué basa AppArmor sus reglas de confinamiento, a diferencia de SELinux?',
    options: [
      'Rutas de archivo (path-based), no etiquetas de inodo',
      'Etiquetas de inodo (label-based)',
      'Direcciones IP',
      'UID del proceso',
    ],
    correct: 0,
  },
  {
    q: '¿Qué comando muestra el estado general de AppArmor?',
    options: ['getenforce', 'aa-status', 'semanage fcontext -l', 'ausearch -m avc'],
    correct: 1,
  },
  {
    q: '¿Dónde se ubican los perfiles principales de AppArmor?',
    options: [
      '/etc/selinux/targeted/',
      '/var/log/apparmor/',
      '/etc/apparmor.d/',
      '/usr/share/apparmor/profiles/',
    ],
    correct: 2,
  },
  {
    q: "En sintaxis de perfiles AppArmor, ¿qué significa el modo de ejecución 'ix'?",
    options: [
      'Ejecutar sin restricciones',
      'Transicionar a otro perfil',
      'Usar un subperfil (hat)',
      'Heredar el perfil del proceso padre (inherit)',
    ],
    correct: 3,
  },
  {
    q: '¿Cuál es la diferencia principal entre el modo enforce y complain en AppArmor?',
    options: [
      'Enforce deniega activamente; complain solo registra sin bloquear',
      'Enforce solo registra; complain deniega',
      'No hay diferencia funcional',
      'Complain requiere reboot',
    ],
    correct: 0,
  },
  {
    q: '¿Por qué AppArmor es más vulnerable que SELinux ante el renombrado de archivos?',
    options: [
      'Porque AppArmor no tiene logs',
      'Porque aplica reglas según la ruta actual del archivo, y si se renombra fuera del path protegido, la regla ya no aplica',
      'Porque AppArmor no soporta wildcards',
      'Porque AppArmor requiere recompilar el kernel',
    ],
    correct: 1,
  },

  // Módulo 6 — aa-genprof y aa-logprof
  {
    q: '¿Qué hace aa-genprof?',
    options: [
      'Solo lista los perfiles cargados',
      'Cambia un perfil de enforce a complain',
      'Crea un perfil nuevo interactivamente, ejecutando la app y generando reglas basadas en el uso',
      'Elimina un perfil existente',
    ],
    correct: 2,
  },
  {
    q: '¿Para qué se usa principalmente aa-logprof?',
    options: [
      'Para crear el primer perfil de una aplicación',
      'Para desinstalar AppArmor',
      'Para verificar la sintaxis de un perfil',
      'Para refinar perfiles existentes procesando eventos del log en modo complain',
    ],
    correct: 3,
  },
  {
    q: 'En aa-genprof, ¿qué opción usarías si un subproceso ejecutable ya tiene su propio perfil AppArmor?',
    options: [
      '(P)rofile — transicionar al perfil propio del ejecutable',
      '(I)nherit — heredar el perfil actual',
      '(U)nconfined — sin restricciones',
      '(D)eny — denegar la ejecución',
    ],
    correct: 0,
  },
  {
    q: '¿Qué representa un hat profile (subperfil) en AppArmor?',
    options: [
      'Un perfil global para todo el sistema',
      'Un contexto de permisos distinto para un subproceso dentro del mismo programa',
      'Un backup automático del perfil principal',
      'Un perfil deshabilitado',
    ],
    correct: 1,
  },
  {
    q: '¿Qué comando recarga un perfil AppArmor modificado sin reiniciar todo el servicio?',
    options: [
      'aa-status -r',
      'systemctl restart apparmor',
      'apparmor_parser -r /etc/apparmor.d/<perfil>',
      'aa-disable <perfil>',
    ],
    correct: 2,
  },
  {
    q: '¿Qué abstraction se incluiría en casi cualquier perfil para dar acceso a librerías del sistema y /proc básico?',
    options: [
      '<abstractions/python>',
      '<abstractions/ssl_keys>',
      '<abstractions/nameservice>',
      '<abstractions/base>',
    ],
    correct: 3,
  },

  // Módulo 7 — Confinamiento en producción
  {
    q: 'nginx sirve desde /srv/web con contexto var_t incorrecto. ¿Cuál es el primer paso correcto para diagnosticar?',
    options: [
      'Revisar ls -Z /srv/web y comparar con el contexto esperado httpd_sys_content_t',
      'Ejecutar SELINUX=disabled',
      'Reinstalar nginx',
      'Cambiar el puerto de escucha',
    ],
    correct: 0,
  },
  {
    q: '¿Qué booleano se necesita para que nginx actúe como proxy inverso hacia un backend en localhost:3000?',
    options: ['httpd_can_sendmail', 'httpd_can_network_connect', 'httpd_use_nfs', 'httpd_read_user_content'],
    correct: 1,
  },
  {
    q: 'Para que sshd escuche en el puerto 2222 bajo SELinux, ¿qué comando es necesario?',
    options: [
      'setsebool -P ssh_port_t on',
      'chcon -t ssh_port_t 2222',
      'semanage port -a -t ssh_port_t -p tcp 2222',
      'restorecon -Rv /etc/ssh',
    ],
    correct: 2,
  },
  {
    q: '¿Qué diferencia hay entre las opciones de montaje :z y :Z en Docker con SELinux?',
    options: [
      ':z es para AppArmor, :Z es para SELinux',
      'No hay diferencia real',
      ':Z permite compartir entre contenedores, :z es exclusivo',
      ':z reetiqueta como compartido (container_file_t), :Z como privado y exclusivo del contenedor',
    ],
    correct: 3,
  },
  {
    q: '¿Qué riesgo tiene usar :Z al montar /home/usuario en un contenedor?',
    options: [
      'El contexto del host queda modificado permanentemente, pudiendo causar problemas de acceso tras eliminar el contenedor',
      'El contenedor no podrá iniciar',
      'Se desactiva SELinux automáticamente',
      'El volumen se monta como solo lectura',
    ],
    correct: 0,
  },
  {
    q: '¿Qué comando permite ver el contexto SELinux de un proceso de contenedor en ejecución?',
    options: [
      'docker inspect --selinux',
      'ps -eZ | grep <proceso del contenedor>',
      'semanage login -l',
      'aa-status | grep docker',
    ],
    correct: 1,
  },
  {
    q: 'Si nginx necesita servir desde /srv/web bajo AppArmor y el perfil no lo contempla, ¿qué se debe hacer?',
    options: [
      'Ejecutar aa-disable en el perfil de nginx',
      'Cambiar el propietario del archivo a root',
      "Añadir la regla '/srv/web/** r,' al perfil y recargar con apparmor_parser -r",
      'Reiniciar el sistema completo',
    ],
    correct: 2,
  },

  // Módulo 8 — Proyecto real: MAC completo en producción
  {
    q: 'En el laboratorio, ¿qué tres tipos de problemas SELinux bloqueaban a nginx sirviendo desde /opt/webroot en el puerto 8443?',
    options: [
      'Solo el contexto de archivos',
      'Solo el puerto',
      'Solo el boolean de red',
      'Contexto de archivos incorrecto, puerto no registrado y boolean de red desactivado',
    ],
    correct: 3,
  },
  {
    q: '¿Qué ocurre si se omite restorecon -Rv después de semanage fcontext -a en el laboratorio?',
    options: [
      'Los archivos existentes mantienen su contexto incorrecto porque semanage solo registra la regla, no la aplica',
      'SELinux aplica el cambio automáticamente sin restorecon',
      'El sistema se reinicia solo',
      'El puerto queda bloqueado permanentemente',
    ],
    correct: 0,
  },
  {
    q: '¿Por qué se pone nginx en modo complain antes de usar aa-logprof en el laboratorio de Ubuntu?',
    options: [
      'Porque complain es más rápido que enforce',
      'Para que nginx acceda a los recursos sin bloqueo mientras se registran los accesos para generar reglas',
      'Porque aa-logprof solo funciona en modo enforce',
      'Porque complain desactiva por completo AppArmor',
    ],
    correct: 1,
  },
  {
    q: '¿Qué efecto tiene ejecutar setsebool httpd_can_network_connect on SIN la opción -P?',
    options: [
      'El cambio es permanente y sobrevive reboots',
      'No tiene ningún efecto',
      'El cambio es efectivo solo en la sesión actual y se pierde al reiniciar o recargar la política',
      'Desactiva SELinux completamente',
    ],
    correct: 2,
  },
  {
    q: 'En el laboratorio, ¿qué comando confirma que el puerto 8443 quedó registrado correctamente como http_port_t?',
    options: ['getenforce', 'aa-status | grep 8443', 'ls -Z /opt/webroot', 'semanage port -l | grep 8443'],
    correct: 3,
  },
  {
    q: 'Después de usar aa-logprof, ¿qué comando se usa para recargar el perfil de nginx con las nuevas reglas?',
    options: [
      'apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx',
      'aa-genprof /usr/sbin/nginx',
      'setenforce 1',
      'semodule -i nginx.pp',
    ],
    correct: 0,
  },
  {
    q: 'Según la comparativa del proyecto, ¿qué actividad cumple en AppArmor el rol equivalente a audit2why en SELinux?',
    options: [
      'semanage fcontext',
      'leer directamente los mensajes DENIED en /var/log/kern.log',
      'restorecon',
      'getsebool',
    ],
    correct: 1,
  },
]

export default exam
