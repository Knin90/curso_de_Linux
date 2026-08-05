const content = `
## Módulo 7 — Confinamiento de servicios en producción: nginx, sshd, contenedores

### 🎯 Objetivos de aprendizaje

* Configurar nginx bajo SELinux: dominios, etiquetas de contexto y booleanos relevantes.
* Resolver errores AVC comunes en nginx (rutas no estándar, puertos personalizados, proxy inverso).
* Ajustar SELinux para sshd con puerto no estándar.
* Aplicar el perfil AppArmor de nginx y extenderlo para rutas propias.
* Entender cómo Docker y Podman interactúan con SELinux mediante las opciones \`:z\`, \`:Z\` y \`--security-opt\`.

### ❓ El problema real

Tu equipo despliega nginx sirviendo contenido desde \`/srv/web\` en el puerto 8443, con un proxy inverso hacia un backend en \`localhost:3000\`. SSH está configurado en el puerto 2222. En un servidor con SELinux enforcing, nginx no puede leer los archivos, no puede abrir el puerto y no puede conectar al backend. Los contenedores Docker tampoco acceden a los volúmenes montados. Todo falla en silencio o con errores 502/403 que parecen de permisos de sistema de archivos, pero no lo son.

### 📖 nginx con SELinux: dominio y etiquetas de contenido

Cuando nginx se ejecuta bajo SELinux, opera en el dominio \`httpd_t\`. Este dominio tiene permisos definidos por la política estándar: puede leer archivos con contexto \`httpd_sys_content_t\`, escribir logs con \`httpd_log_t\`, y acceder a puertos definidos como \`http_port_t\`.

El problema surge cuando nginx sirve desde rutas no estándar. El directorio \`/var/www/html\` tiene el contexto correcto por defecto, pero \`/srv/web\` o \`/opt/static\` no.

\`\`\`bash
# Ver el contexto de una ruta estándar
ls -Z /var/www/html
# system_u:object_r:httpd_sys_content_t:s0 /var/www/html

# Ver el contexto de una ruta personalizada
ls -Z /srv/web
# unconfined_u:object_r:var_t:s0 /srv/web
# ← contexto incorrecto: httpd_t no tiene permiso de lectura sobre var_t
\`\`\`

El dominio \`httpd_t\` solo puede leer archivos con contextos como:

| Contexto | Uso |
|---|---|
| \`httpd_sys_content_t\` | Contenido estático de solo lectura |
| \`httpd_sys_rw_content_t\` | Contenido que nginx también escribe |
| \`httpd_sys_script_exec_t\` | Scripts CGI ejecutables |
| \`httpd_log_t\` | Archivos de log de nginx |

### 📖 Corregir el contexto de /srv/web

La solución no es \`chcon\` (temporal, se pierde con \`restorecon\`). Se usa \`semanage fcontext\` para registrar la regla de forma permanente:

\`\`\`bash
# Añadir regla permanente de contexto
semanage fcontext -a -t httpd_sys_content_t "/srv/web(/.*)?"

# Aplicar la regla a los archivos existentes
restorecon -Rv /srv/web
# Relabeled /srv/web from var_t to httpd_sys_content_t
# Relabeled /srv/web/index.html from var_t to httpd_sys_content_t

# Verificar
ls -Z /srv/web/index.html
# unconfined_u:object_r:httpd_sys_content_t:s0 /srv/web/index.html
\`\`\`

A partir de aquí, nginx puede leer el contenido y sirve el sitio correctamente.

### 📖 nginx en puerto no estándar

Si nginx escucha en el puerto 8443, SELinux bloqueará el bind. Los puertos permitidos para \`httpd_t\` están registrados como tipo \`http_port_t\`:

\`\`\`bash
# Ver puertos actuales de http_port_t
semanage port -l | grep http_port_t
# http_port_t    tcp    80, 443, 488, 8008, 8009, 8443, 8080

# Si el puerto no está listado, añadirlo:
semanage port -a -t http_port_t -p tcp 8443

# Verificar
semanage port -l | grep 8443
# http_port_t    tcp    ..., 8443
\`\`\`

Nota: si el puerto ya existe asignado a otro tipo, usar \`-m\` (modify) en lugar de \`-a\` (add):

\`\`\`bash
semanage port -m -t http_port_t -p tcp 8443
\`\`\`

### 📖 nginx como proxy inverso: httpd_can_network_connect

Cuando nginx actúa como proxy inverso (por ejemplo, hacia \`localhost:3000\`), el dominio \`httpd_t\` necesita permiso para iniciar conexiones TCP salientes. Esto está controlado por un booleano SELinux que por defecto está desactivado:

\`\`\`bash
# Ver estado del booleano
getsebool httpd_can_network_connect
# httpd_can_network_connect --> off

# Activar de forma permanente (-P persiste tras reboot)
setsebool -P httpd_can_network_connect on

# Verificar
getsebool httpd_can_network_connect
# httpd_can_network_connect --> on
\`\`\`

Booleanos relacionados con nginx/Apache:

| Booleano | Función |
|---|---|
| \`httpd_can_network_connect\` | Permite conexiones TCP salientes (proxy inverso) |
| \`httpd_can_network_connect_db\` | Permite conectar a bases de datos en red |
| \`httpd_can_sendmail\` | Permite enviar correo desde scripts web |
| \`httpd_use_nfs\` | Permite leer contenido desde NFS |
| \`httpd_read_user_content\` | Permite leer desde directorios de usuario |

### 📖 sshd con SELinux: puerto personalizado

SSH opera en el dominio \`sshd_t\`. Los puertos permitidos para SSH tienen el tipo \`ssh_port_t\`. Si cambias el puerto a 2222, sshd no podrá iniciar:

\`\`\`bash
# Error en /var/log/audit/audit.log:
# type=AVC msg=audit(...): avc: denied { name_bind } for
#   pid=1234 comm="sshd" src=2222 scontext=system_u:system_r:sshd_t:s0-s0:c0.c1023
#   tcontext=system_u:object_r:unreserved_port_t:s0 tclass=tcp_socket

# Solución: registrar el puerto como ssh_port_t
semanage port -a -t ssh_port_t -p tcp 2222

# Verificar
semanage port -l | grep ssh_port_t
# ssh_port_t    tcp    22, 2222
\`\`\`

Recuerda también actualizar el firewall:

\`\`\`bash
firewall-cmd --permanent --add-port=2222/tcp
firewall-cmd --reload
\`\`\`

### 📖 Servicios systemd con contexto SELinux personalizado

Si tienes un binario propio que actúa como servicio, necesita un contexto de archivo ejecutable apropiado. Si el binario no tiene un tipo de dominio asociado en la política, SELinux lo ejecutará en el dominio genérico \`initrc_t\` o lo bloqueará.

Puedes especificar el contexto en el unit file de systemd como una medida temporal de diagnóstico:

\`\`\`ini
[Service]
# En /etc/systemd/system/myapp.service
SELinuxContext=system_u:system_r:httpd_t:s0
ExecStart=/opt/myapp/server
\`\`\`

La solución correcta a largo plazo es crear un módulo de política personalizado con \`audit2allow\`:

\`\`\`bash
# Generar política desde los AVC del log
grep myapp /var/log/audit/audit.log | audit2allow -M myapp_policy
semodule -i myapp_policy.pp
\`\`\`

### 📖 Docker y Podman con SELinux: :z y :Z

Al montar volúmenes en contenedores, SELinux bloquea el acceso porque los archivos del host tienen un contexto diferente al esperado por el contenedor (\`container_t\` o \`svirt_lxc_net_t\`).

Las opciones de montaje \`:z\` y \`:Z\` instruyen al motor de contenedores a reetiquear los archivos:

\`\`\`bash
# :z — reetiqueta el directorio como compartido entre contenedores
docker run -v /srv/data:/data:z nginx

# :Z — reetiqueta el directorio como privado para este contenedor
docker run -v /srv/data:/data:Z nginx
\`\`\`

Diferencia clave:

| Opción | Contexto resultante | Compartible |
|---|---|---|
| \`:z\` | \`container_file_t\` (shared) | Sí, entre múltiples contenedores |
| \`:Z\` | \`svirt_sandbox_file_t\` (private) | No, exclusivo para este contenedor |

**Advertencia**: \`:Z\` modifica el contexto del directorio del host de forma permanente. Si montas \`/home/usuario\` con \`:Z\` y luego eliminas el contenedor, el directorio queda con el contexto del contenedor y el sistema puede tener problemas de acceso.

Para un control más granular, \`--security-opt\` permite especificar el tipo de label directamente:

\`\`\`bash
# Deshabilitar el confinamiento SELinux para un contenedor (solo en dev)
docker run --security-opt label=disable nginx

# Especificar un tipo de dominio explícito
docker run --security-opt label=type:container_t nginx

# Verificar el contexto del proceso del contenedor
ps -eZ | grep nginx
# system_u:system_r:container_t:s0:c123,c456 nginx
\`\`\`

### 📖 AppArmor: perfil de nginx en Ubuntu/Debian

En sistemas con AppArmor, nginx viene con un perfil incluido en \`/etc/apparmor.d/usr.sbin.nginx\`. Veamos su estructura básica:

\`\`\`bash
# Ver el perfil actual
cat /etc/apparmor.d/usr.sbin.nginx

# Fragmento típico:
# /usr/sbin/nginx {
#   #include <abstractions/base>
#   #include <abstractions/nameservice>
#
#   capability net_bind_service,
#   capability setuid,
#   capability setgid,
#
#   /var/log/nginx/*.log  w,
#   /var/www/html/**  r,
#   /etc/nginx/**  r,
#   /run/nginx.pid  rw,
# }

# Ver estado de nginx en AppArmor
aa-status | grep nginx
# /usr/sbin/nginx (enforce)
\`\`\`

Si nginx necesita servir desde \`/srv/web\`, el perfil no tiene esa ruta. Hay que añadirla:

\`\`\`bash
# Editar el perfil
nano /etc/apparmor.d/usr.sbin.nginx

# Añadir dentro del bloque {}:
#   /srv/web/**  r,

# Recargar el perfil sin reiniciar AppArmor completo
apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

# Verificar que sigue en enforce
aa-status | grep nginx
# /usr/sbin/nginx (enforce)
\`\`\`

### 📖 Diagnosticar denegaciones: audit.log y audit2why

Cuando algo falla silenciosamente, el primer lugar a revisar es \`/var/log/audit/audit.log\` (SELinux) o \`/var/log/kern.log\` (AppArmor).

\`\`\`bash
# SELinux: ver últimas denegaciones AVC
grep AVC /var/log/audit/audit.log | tail -5

# Explicar por qué fue denegado y qué faltó
grep AVC /var/log/audit/audit.log | audit2why
# type=AVC msg=audit(...): avc: denied { read } for
#   pid=5678 comm="nginx" name="index.html"
#   scontext=system_u:system_r:httpd_t:s0
#   tcontext=unconfined_u:object_r:var_t:s0
#   tclass=file
#
# Was caused by:
#   Missing type enforcement (TE) allow rule.
#   You can use audit2allow to generate a loadable module to allow this access.

# AppArmor: ver denegaciones en tiempo real
grep DENIED /var/log/kern.log | tail -5
# kernel: [12345.6789] audit: type=1400 audit(...)
#   apparmor="DENIED" operation="open" profile="/usr/sbin/nginx"
#   name="/srv/web/index.html" pid=1234 comm="nginx"
#   requested_mask="r" denied_mask="r" fsuid=33 ouid=0
\`\`\`

La diferencia entre un problema de permisos POSIX y un problema de MAC es exacta: si \`ls -la\` muestra que el proceso tiene permisos pero sigue fallando, es SELinux o AppArmor.

### 📋 Lo que debes recordar

* El dominio de nginx en SELinux es \`httpd_t\`. Los archivos que sirve deben tener contexto \`httpd_sys_content_t\`.
* \`semanage fcontext -a -t <tipo> "<ruta>(/.*)?" && restorecon -Rv <ruta>\` es el patrón correcto para reetiquetado permanente.
* Los puertos no estándar requieren \`semanage port -a -t http_port_t -p tcp <puerto>\`.
* El proxy inverso requiere el booleano \`httpd_can_network_connect on\`.
* SSH en puerto alternativo requiere \`semanage port -a -t ssh_port_t -p tcp <puerto>\`.
* \`:z\` reetiqueta para acceso compartido; \`:Z\` reetiqueta para acceso exclusivo del contenedor.
* \`audit2why\` explica el motivo real de una denegación SELinux.
* AppArmor: editar el perfil en \`/etc/apparmor.d/\` y recargar con \`apparmor_parser -r\`.

### 🧪 Autoevaluación

1. nginx sirve desde \`/opt/web\` y devuelve 403, pero los permisos POSIX son correctos. ¿Cuál es la causa probable y cuál es el comando exacto para diagnosticarla?
2. ¿Cuál es la diferencia entre \`:z\` y \`:Z\` al montar un volumen en Docker con SELinux activo? ¿Cuándo usarías cada uno?
3. Un servidor tiene nginx como proxy inverso hacia \`localhost:4000\`. Devuelve 502. SELinux está en enforcing. ¿Qué booleano hay que activar y con qué comando?

---

1. La causa probable es un contexto SELinux incorrecto en \`/opt/web\`. Diagnóstico: \`grep AVC /var/log/audit/audit.log | audit2why\`. Solución: \`semanage fcontext -a -t httpd_sys_content_t "/opt/web(/.*)?" && restorecon -Rv /opt/web\`.
2. \`:z\` reetiqueta el directorio del host como \`container_file_t\` (compartido), permitiendo que múltiples contenedores accedan. \`:Z\` reetiqueta como privado (\`svirt_sandbox_file_t\`), solo accesible por ese contenedor. Usar \`:z\` cuando varios contenedores necesitan el mismo volumen; \`:Z\` cuando el acceso debe ser exclusivo.
3. El booleano \`httpd_can_network_connect\` está desactivado por defecto. Activarlo: \`setsebool -P httpd_can_network_connect on\`.
`

export default content
