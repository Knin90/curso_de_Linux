export default [
  // Módulo 1 — ¿Cómo llega el software a tu servidor? Arquitectura general (6)
  { q: '¿Cuál es el problema principal que resuelve un gestor de paquetes?', options: ['Cifrar el tráfico de red', 'Aumentar la velocidad del disco', 'Resolver automáticamente las dependencias de software', 'Compilar el kernel'], correct: 2 },
  { q: '¿Cuál es el flujo correcto de instalación de un paquete?', options: ['Base de datos → repositorio → instalación', 'Repositorio → índice → descarga → verificación GPG → instalación → base de datos', 'Descarga → repositorio → base de datos → verificación', 'Instalación → descarga → verificación → repositorio'], correct: 1 },
  { q: '¿Qué diferencia hay entre un gestor de alto nivel y uno de bajo nivel?', options: ['El de bajo nivel gestiona repositorios remotos', 'El de alto nivel solo funciona sin conexión a internet', 'El de alto nivel resuelve dependencias y repositorios; el de bajo nivel extrae e instala archivos', 'No hay diferencia real'], correct: 2 },
  { q: '¿Qué gestor de bajo nivel usa la familia Debian?', options: ['DPKG', 'RPM', 'DNF', 'YUM'], correct: 0 },
  { q: '¿Qué gestor de alto nivel usa la familia Red Hat (RHEL/Fedora)?', options: ['APT', 'DNF', 'DEB', 'DPKG'], correct: 1 },
  { q: 'Según la jerarquía de capas del módulo 1, ¿qué llama APT para hacer el trabajo real de instalar?', options: ['A DPKG', 'Al sistema de archivos', 'A DNF', 'Al kernel directamente'], correct: 0 },

  // Módulo 2 — ¿Qué es realmente un paquete? Contenido y dependencias (6)
  { q: '¿Qué es realmente un archivo .deb o .rpm?', options: ['Solo el código fuente del programa', 'Un enlace simbólico al repositorio', 'Un archivo comprimido que contiene ejecutables, configuración, scripts y metadatos', 'Un ejecutable único sin metadatos'], correct: 2 },
  { q: '¿Qué información contiene el bloque "control" de un paquete?', options: ['Metadatos como nombre, versión, arquitectura y dependencias', 'Los logs del sistema', 'El historial de commits', 'La clave privada del desarrollador'], correct: 0 },
  { q: '¿Qué es el "Dependency Hell"?', options: ['Un comando de APT', 'Un error de red al descargar paquetes', 'El caos de instalar dependencias manualmente cuando entran en conflicto versiones incompatibles', 'Un tipo de malware'], correct: 2 },
  { q: '¿Qué comando responde "a qué paquete pertenece este archivo" en Debian/Ubuntu?', options: ['dpkg -L', 'apt show', 'dpkg -S', 'dpkg -l'], correct: 2 },
  { q: '¿Qué comando lista todos los archivos instalados por un paquete en RHEL/Fedora?', options: ['rpm -qf', 'rpm -ql', 'rpm -qi', 'rpm -qR'], correct: 1 },
  { q: '¿Cuándo se ejecutan los scripts "postinst" de un paquete?', options: ['Después de instalar el paquete', 'Antes de descargar el paquete', 'Solo al eliminar el paquete', 'Nunca se ejecutan automáticamente'], correct: 0 },

  // Módulo 3 — Repositorios y verificación GPG (7)
  { q: '¿Qué descarga exactamente el comando "apt update"?', options: ['Actualiza todo el sistema operativo', 'Solo los índices de qué paquetes existen y en qué versión', 'Elimina paquetes obsoletos', 'Los paquetes completos con sus binarios'], correct: 1 },
  { q: '¿Para qué sirve la verificación GPG en la instalación de paquetes?', options: ['Para comprimir el paquete', 'Para acelerar la descarga', 'Para traducir la documentación', 'Para confirmar que el paquete no fue manipulado desde el repositorio'], correct: 3 },
  { q: '¿Dónde se ubican los repositorios adicionales en Debian/Ubuntu?', options: ['/etc/apt/sources.list.d/', '/etc/yum.repos.d/', '/var/lib/dpkg/', '/usr/share/doc/'], correct: 0 },
  { q: '¿Dónde se ubican los archivos de repositorio en RHEL/Fedora?', options: ['/etc/apt/sources.list.d/', '/var/cache/dnf/', '/etc/yum.repos.d/', '/usr/share/keyrings/'], correct: 2 },
  { q: '¿Por qué se considera obsoleto el comando "apt-key add"?', options: ['Porque añade la clave a un keyring global que afecta a todos los repositorios', 'Porque solo funciona con paquetes .rpm', 'Porque requiere conexión a internet', 'Porque ya no existe en ningún sistema'], correct: 0 },
  { q: '¿Cuál es el método moderno recomendado para añadir un repositorio externo en APT?', options: ['Usar apt-key add directamente', 'Usar una clave en /usr/share/keyrings/ referenciada con signed-by=', 'Deshabilitar la verificación GPG', 'Copiar el .deb manualmente sin firmar'], correct: 1 },
  { q: 'Si la firma GPG de un repositorio no coincide, ¿qué hace APT?', options: ['Reinicia el servidor automáticamente', 'Cancela la instalación y no modifica el sistema', 'Instala el paquete de todas formas con una advertencia', 'Ignora el error silenciosamente'], correct: 1 },

  // Módulo 4 — APT y DPKG: el sistema de paquetes Debian/Ubuntu (7)
  { q: '¿Cuál es la diferencia entre "apt upgrade" y "apt full-upgrade"?', options: ['No hay diferencia', '"upgrade" siempre elimina paquetes', '"full-upgrade" puede eliminar paquetes para resolver conflictos, "upgrade" nunca elimina', '"full-upgrade" solo actualiza el kernel'], correct: 2 },
  { q: '¿Qué diferencia hay entre "apt remove" y "apt purge"?', options: ['"apt purge" también elimina los archivos de configuración', 'Son exactamente iguales', '"apt remove" elimina archivos de configuración y "purge" no', '"apt purge" no elimina el binario'], correct: 0 },
  { q: '¿Qué comando repara dependencias rotas tras usar "dpkg -i" con un .deb local?', options: ['sudo apt clean', 'sudo apt install -f', 'sudo dpkg --configure', 'sudo apt autoremove'], correct: 1 },
  { q: '¿Qué hace "sudo apt autoremove"?', options: ['Actualiza todos los paquetes', 'Descarga los índices de repositorios', 'Elimina dependencias huérfanas que ya no son necesarias', 'Reinstala el sistema completo'], correct: 2 },
  { q: '¿Por qué es importante ejecutar "apt update" antes de "apt upgrade"?', options: ['Porque sin actualizar los índices se pueden instalar versiones desactualizadas', 'Porque "apt update" instala software nuevo', 'Porque "apt upgrade" borra la caché', 'No es necesario, son independientes'], correct: 0 },
  { q: '¿Qué comando lista todos los paquetes instalados en un sistema Debian/Ubuntu?', options: ['dpkg -L', 'dpkg -l', 'apt depends', 'apt policy'], correct: 1 },
  { q: '¿Qué información muestra "apt policy nginx"?', options: ['El repositorio de origen y la versión candidata/instalada', 'Los archivos que instaló el paquete', 'Los scripts postinst del paquete', 'Solo si el paquete está instalado o no'], correct: 0 },

  // Módulo 5 — DNF y RPM: el sistema de paquetes Fedora/RHEL (6)
  { q: '¿Qué gestor de bajo nivel usa RHEL/Fedora bajo DNF?', options: ['DPKG', 'RPM', 'YUM', 'APT'], correct: 1 },
  { q: '¿Qué ventaja tiene DNF frente a APT según el módulo 5?', options: ['DNF no puede instalar paquetes locales', 'DNF no soporta repositorios externos', 'DNF tiene historial de transacciones que permite deshacer operaciones', 'DNF no gestiona dependencias'], correct: 2 },
  { q: '¿Qué comando permite deshacer la transacción número 5 en DNF?', options: ['dnf history info 5', 'dnf remove 5', 'dnf rollback 5', 'dnf history undo 5'], correct: 3 },
  { q: '¿Qué hace el comando "rpm -qf /usr/sbin/nginx"?', options: ['Muestra a qué paquete pertenece ese archivo', 'Instala el paquete nginx', 'Lista todos los archivos de nginx', 'Verifica la integridad de nginx'], correct: 0 },
  { q: '¿Qué verifica el comando "rpm -V nginx" que "rpm -qi nginx" no hace?', options: ['La versión instalada', 'Las dependencias del paquete', 'La integridad de los archivos instalados comparando checksums', 'El repositorio de origen'], correct: 2 },
  { q: '¿Cuál es el equivalente en DNF de "apt search"?', options: ['dnf info', 'dnf search', 'dnf repolist', 'dnf provides'], correct: 1 },

  // Módulo 6 — La base de datos local de paquetes (6)
  { q: '¿Dónde vive la base de datos de paquetes en Debian/Ubuntu?', options: ['/var/lib/rpm/', '/etc/apt/', '/usr/share/dpkg/', '/var/lib/dpkg/'], correct: 3 },
  { q: '¿Dónde vive la base de datos de paquetes en RHEL/Fedora modernos?', options: ['/var/lib/dpkg/', '/etc/yum.repos.d/', '/var/cache/apt/', '/var/lib/rpm/'], correct: 3 },
  { q: '¿Qué significa "ii" al inicio de una línea en la salida de "dpkg -l"?', options: ['El paquete está roto', 'El paquete está pendiente de eliminar', 'El paquete está correctamente instalado y configurado', 'El paquete es una dependencia huérfana'], correct: 2 },
  { q: 'Si APT falla con "Could not get lock", ¿cuál es el primer paso correcto?', options: ['Eliminar el archivo de lock inmediatamente', 'Reinstalar APT desde cero', 'Verificar con lsof si hay un proceso legítimo usando el lock', 'Reiniciar el servidor sin más'], correct: 2 },
  { q: '¿Qué comando termina configuraciones interrumpidas en Debian tras un corte de energía?', options: ['sudo apt clean', 'sudo apt autoremove', 'sudo dpkg -l', 'sudo dpkg --configure -a'], correct: 3 },
  { q: '¿Qué comando reconstruye la base de datos RPM si está corrupta?', options: ['sudo rpm --rebuilddb', 'rpm --verifydb', 'dnf clean all', 'rpm -qa'], correct: 0 },

  // Módulo 7 — Actualizaciones, limpieza y mantenimiento (6)
  { q: '¿Cómo se evita que un paquete se actualice automáticamente en Debian/Ubuntu?', options: ['sudo apt purge nginx', 'sudo apt autoremove nginx', 'sudo apt clean nginx', 'sudo apt-mark hold nginx'], correct: 3 },
  { q: '¿Cuál es la diferencia entre "apt clean" y "apt autoclean"?', options: ['"apt clean" elimina toda la caché; "apt autoclean" solo las versiones antiguas', 'Son idénticos', '"apt autoclean" elimina toda la caché', '"apt clean" no borra nada'], correct: 0 },
  { q: '¿Qué comando aplica solo actualizaciones de seguridad en RHEL/Fedora?', options: ['dnf upgrade', 'dnf autoremove', 'dnf history undo', 'dnf upgrade --security'], correct: 3 },
  { q: '¿Por qué es importante ejecutar "apt autoremove" periódicamente?', options: ['Porque instala software nuevo', 'Porque repara la base de datos de paquetes', 'Porque elimina dependencias huérfanas que acumulan espacio y ruido en auditorías', 'Porque actualiza el kernel'], correct: 2 },
  { q: '¿Qué comando muestra el historial completo de transacciones en DNF?', options: ['dnf repolist', 'dnf history', 'dnf check-update', 'dnf clean all'], correct: 1 },
  { q: '¿Qué comando lista los paquetes que un usuario instaló manualmente (no como dependencia) en Debian?', options: ['apt-mark showauto', 'apt-mark hold', 'apt-mark showhold', 'apt-mark showmanual'], correct: 3 },

  // Módulo 8 — Proyecto real: despliegue verificado de nginx en un servidor nuevo (6)
  { q: '¿Por qué el proyecto exige instalar nginx desde su repositorio oficial y no desde el de la distro?', options: ['Porque el de la distro no existe', 'Porque el repositorio oficial es gratuito y el otro no', 'Porque la distro no permite instalar nginx', 'Porque el repositorio de la distro suele traer una versión más antigua'], correct: 3 },
  { q: '¿Qué comando confirma de qué repositorio se instaló un paquete en Debian/Ubuntu?', options: ['apt depends nginx', 'dpkg -L nginx', 'apt show nginx', 'apt policy nginx'], correct: 3 },
  { q: 'Si "apt policy nginx" muestra un origen distinto de nginx.org, ¿qué se hizo mal?', options: ['Se ejecutó apt update dos veces', 'Se instaló con dpkg -i', 'Se usó sudo en exceso', 'Se ejecutó apt install sin registrar antes el repositorio oficial correctamente'], correct: 3 },
  { q: '¿Qué pasos incluye el proyecto para dejar el sistema limpio tras instalar nginx?', options: ['apt autoremove y apt clean/autoclean', 'Solo reiniciar el servicio', 'Formatear el disco', 'Desinstalar y reinstalar nginx'], correct: 0 },
  { q: '¿Qué archivo se usa como evidencia de lo realmente ejecutado en el servidor?', options: ['/etc/nginx/nginx.conf', '/etc/hosts', '/var/lib/dpkg/available', '/var/log/apt/history.log'], correct: 3 },
  { q: '¿Qué verifica el paso de registrar la clave GPG antes de instalar desde el repositorio de nginx.org?', options: ['Que el servidor tiene suficiente espacio en disco', 'Que la red tiene buena velocidad', 'Que el usuario tiene permisos de sudo', 'Que el paquete descargado no fue manipulado'], correct: 3 },
]
