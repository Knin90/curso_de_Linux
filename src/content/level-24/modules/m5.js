const content = `
## Módulo 5 — AppArmor: perfiles, modos y herramientas

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura de AppArmor y cómo difiere de SELinux.
* Leer e interpretar perfiles AppArmor existentes.
* Gestionar modos enforce/complain por perfil.
* Usar las herramientas de inspección del estado de AppArmor.
* Entender cómo AppArmor se integra con el kernel Linux.

### ❓ El problema real

Tu servidor Ubuntu ejecuta nginx y varios scripts Python. Un auditor de seguridad señala que aunque los procesos corren como usuarios sin privilegios, un proceso comprometido podría acceder a archivos de configuración de otros servicios, leer variables de entorno de otros procesos, o establecer conexiones de red arbitrarias. AppArmor está instalado pero los perfiles de tus aplicaciones personalizadas no existen —están en modo \`unconfined\`. Necesitas confinar cada aplicación sin romper su funcionamiento.

### 📖 Arquitectura de AppArmor

AppArmor opera como un módulo del kernel Linux Security Module (LSM). A diferencia de SELinux (que etiqueta inodos), AppArmor trabaja con rutas de archivo y nombres de programa.

\`\`\`diagram
{"type":"nested","container":{"title":"Kernel","meta":"El LSM hook intercepta la syscall antes de ejecutarla"},"items":[{"name":"Proceso (nginx)","icon":"server"},{"name":"LSM Hook (AppArmor)","meta":"¿Existe perfil para nginx? ¿La operación está permitida?","icon":"lock"}],"external":[{"name":"SÍ → allow","icon":"key","side":"right"},{"name":"NO → deny + log","icon":"alert","side":"right"}]}
\`\`\`

\`\`\`text
Diferencias clave con SELinux:
  AppArmor: basado en RUTAS de archivo (path-based)
  SELinux:  basado en ETIQUETAS de inodo (label-based)

Implicación: renombrar /etc/nginx/nginx.conf a /tmp/nginx.conf
  AppArmor: ahora se aplican las reglas de /tmp/*, no las de /etc/nginx/*
  SELinux:  el inodo conserva su etiqueta httpd_config_t sin importar la ruta
\`\`\`

### 📖 Estado y verificación de AppArmor

\`\`\`bash
# Estado general de AppArmor
apparmor_status
# apparmor module is loaded.
# 35 profiles are loaded.
# 35 profiles are in enforce mode.
#    /usr/bin/evince
#    /usr/bin/man
#    /usr/sbin/nginx
#    ...
# 0 profiles are in complain mode.
# 3 processes have profiles defined.
# 3 processes are in enforce mode.
#    /usr/sbin/nginx (1234)
#    /usr/sbin/sshd (5678)
# 0 processes are in complain mode.
# 0 processes are unconfined but have a profile defined.

# Alternativa: aa-status (más detallado)
aa-status

# Ver si AppArmor está activo en el kernel
cat /sys/kernel/security/apparmor/profiles | head -10
# /usr/sbin/nginx (enforce)
# /usr/sbin/sshd (enforce)
# /usr/lib/snapd/snap-confine (enforce)

# Versión del módulo
cat /sys/kernel/security/apparmor/revision

# AppArmor en el arranque
systemctl status apparmor
# ● apparmor.service - AppArmor initialization
#    Active: active (exited)
#    Status: "apparmor filesystem is not mounted."  ← si no está montado
#
#    Active: active (exited)
#    Status: "Profiles are loaded."  ← correcto
\`\`\`

### 📖 Ubicación y estructura de perfiles

\`\`\`bash
# Directorio de perfiles
ls /etc/apparmor.d/
# abstractions/    tunables/     usr.bin.man    usr.sbin.nginx
# cache/           disable/      usr.bin.evince usr.sbin.sshd
# local/           force-complain/

# Estructura de directorios:
# /etc/apparmor.d/            → perfiles principales
# /etc/apparmor.d/abstractions/ → bloques reutilizables (como funciones)
# /etc/apparmor.d/tunables/   → variables globales (homedirs, etc.)
# /etc/apparmor.d/local/      → personalizaciones locales (no sobrescritas por paquetes)
# /etc/apparmor.d/disable/    → symlinks a perfiles deshabilitados
# /etc/apparmor.d/force-complain/ → symlinks a perfiles en modo complain

# Ver un perfil de ejemplo
cat /etc/apparmor.d/usr.sbin.nginx
\`\`\`

### 📖 Anatomía de un perfil AppArmor

\`\`\`bash
# Ejemplo: perfil básico de nginx
cat /etc/apparmor.d/usr.sbin.nginx
\`\`\`

\`\`\`text
#include <tunables/global>

/usr/sbin/nginx {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  capability net_bind_service,    # bind a puertos < 1024
  capability setuid,              # cambiar UID (worker processes)
  capability setgid,              # cambiar GID

  # Archivos de configuración (solo lectura)
  /etc/nginx/**           r,
  /etc/ssl/certs/**       r,

  # Contenido web (lectura)
  /var/www/**             r,
  /srv/www/**             r,

  # Logs (escritura append)
  /var/log/nginx/*.log    w,

  # PID y sockets
  /run/nginx.pid          rw,
  /run/nginx/*.sock       rw,

  # Binarios necesarios
  /usr/sbin/nginx         mr,
  /usr/share/nginx/**     r,

  # Red (implícito para la mayoría de perfiles de servidor)
  network tcp,
  network udp,
}
\`\`\`

**Sintaxis de reglas de archivo:**

\`\`\`text
/ruta/archivo    modo    [→ ruta_destino]

Modos de archivo:
  r  → read (leer)
  w  → write (escribir, implica append)
  a  → append (solo agregar al final)
  x  → execute (ejecutar)
  m  → mmap (mapeo en memoria)
  l  → link (crear hard links)
  k  → lock (bloquear archivos)

Modos de ejecución (para x):
  ix → inherit (heredar perfil del padre, modo más común)
  cx → child (usar subperfil definido en el mismo archivo)
  px → profile (transicionar a otro perfil AppArmor)
  ux → unconfined (ejecutar sin restricciones — usar con cuidado)

Wildcards:
  *  → cualquier cosa excepto /
  ** → cualquier cosa incluyendo /

Ejemplos:
  /etc/nginx/**          r,    # leer todo en /etc/nginx/ recursivo
  /var/log/nginx/*.log   w,    # escribir en logs
  /usr/lib/nginx/**      mr,   # leer+mmap librerías
  /usr/bin/python3       ix,   # ejecutar python heredando perfil
\`\`\`

**Reglas de red y capabilities:**

\`\`\`text
# Capabilities POSIX
capability net_bind_service,  # bind a puertos privilegiados (<1024)
capability dac_override,      # ignorar permisos DAC (cuidado: muy permisivo)
capability sys_ptrace,        # trazar procesos (strace, gdb)
capability sys_chroot,        # llamar chroot()
capability setuid,            # cambiar UID
capability kill,              # enviar señales

# Reglas de red
network,                      # toda la red
network tcp,                  # solo TCP
network udp,                  # solo UDP
network inet,                 # solo IPv4
network inet6,                # solo IPv6
network inet stream,          # TCP IPv4 (forma completa)
network inet dgram,           # UDP IPv4
\`\`\`

### 📖 Gestión de modos por perfil

\`\`\`bash
# Poner perfil en modo enforce (aplicar política)
aa-enforce /etc/apparmor.d/usr.sbin.nginx
# Setting /usr/sbin/nginx to enforce mode.

# Poner perfil en modo complain (solo loggear)
aa-complain /etc/apparmor.d/usr.sbin.nginx
# Setting /usr/sbin/nginx to complain mode.

# Deshabilitar perfil completamente
aa-disable /etc/apparmor.d/usr.sbin.nginx
# Disabling /usr/sbin/nginx.

# Recargar un perfil modificado
apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

# Recargar todos los perfiles
systemctl reload apparmor
# o
apparmor_parser -r /etc/apparmor.d/*

# Verificar modo de un perfil específico
aa-status | grep nginx
# /usr/sbin/nginx (enforce)

# Ver denials en syslog
grep "apparmor" /var/log/syslog | tail -20
grep "DENIED" /var/log/kern.log | tail -20

# Ver denials con audit
ausearch -m apparmor --just-one
\`\`\`

### 📖 Abstractions: reutilización de reglas

Las abstractions son fragmentos reutilizables de política, similares a includes en programación.

\`\`\`bash
ls /etc/apparmor.d/abstractions/
# base          nameservice    ssl_keys    user-tmp
# fonts         python         X           ...

# Ejemplo: abstractions/base (incluido en casi todos los perfiles)
cat /etc/apparmor.d/abstractions/base
# # include para acceso mínimo necesario (librerías del sistema, /proc, etc.)
# /lib/x86_64-linux-gnu/**            mr,
# /usr/lib/x86_64-linux-gnu/**        mr,
# /proc/sys/kernel/ngroups_max        r,
# /dev/null                           rw,
# /dev/zero                           r,
# ...

# Usando abstractions en un perfil:
# #include <abstractions/base>          → acceso a libc, /proc básico
# #include <abstractions/nameservice>   → DNS, /etc/hosts, /etc/resolv.conf
# #include <abstractions/ssl_keys>      → certificados SSL
# #include <abstractions/python>        → intérprete Python y librerías

# Abstractions locales (para personalización sin tocar el paquete)
cat /etc/apparmor.d/local/usr.sbin.nginx
# # Reglas locales adicionales para nginx
# /opt/miapp/static/** r,
\`\`\`

### 📋 Lo que debes recordar

* AppArmor es path-based: las reglas se aplican por ruta de archivo, no por etiqueta de inodo.
* Dos modos por perfil: enforce (activo) y complain (solo log). Los procesos sin perfil están unconfined.
* Perfiles en \`/etc/apparmor.d/\`; personalizaciones locales en \`/etc/apparmor.d/local/\`.
* Comandos de gestión: \`aa-enforce\`, \`aa-complain\`, \`aa-disable\`, \`apparmor_parser -r\`.
* Abstractions son bloques reutilizables: \`#include <abstractions/base>\` es casi siempre necesario.
* Los denials aparecen en \`/var/log/syslog\` o \`/var/log/kern.log\` con la etiqueta \`apparmor\`.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre modo \`enforce\` y modo \`complain\` en AppArmor?
2. En un perfil AppArmor, ¿qué diferencia hay entre \`/var/log/nginx/*.log w,\` y \`/var/log/nginx/*.log a,\`?
3. ¿Por qué AppArmor es más vulnerable que SELinux a ataques que implican renombrar archivos?

---

1. En enforce, AppArmor deniega activamente las operaciones no permitidas por el perfil. En complain, solo registra (log) las violaciones sin denegarlas — el proceso puede hacer todo. Complain se usa para desarrollo de perfiles.
2. \`w\` (write) permite escritura completa incluyendo truncar el archivo. \`a\` (append) solo permite agregar al final, no truncar ni sobreescribir. Para logs, \`a\` es más seguro porque evita que un proceso comprometido borre el historial de logs.
3. Porque AppArmor aplica reglas basadas en la ruta del archivo en el momento del acceso. Si un atacante renombra \`/etc/nginx/nginx.conf\` a \`/tmp/nginx.conf\`, las reglas de \`/etc/nginx/**\` ya no aplican y el archivo puede quedar desprotegido. SELinux usa etiquetas en el inodo que se mantienen independientemente de la ruta.
`

export default content
