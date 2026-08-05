const content = `
## Módulo 4 — Diagnóstico SELinux: audit2why, audit2allow y resolución de denials

### 🎯 Objetivos de aprendizaje

* Leer y entender mensajes AVC en el log de auditoría.
* Usar \`ausearch\` para filtrar denials relevantes.
* Interpretar la salida de \`audit2why\` para entender la causa raíz.
* Usar \`audit2allow\` para generar y aplicar módulos de política personalizados.
* Reconocer los denials más comunes y sus soluciones estándar.

### ❓ El problema real

nginx está instalado, configurado correctamente, con permisos Unix en orden. Pero devuelve 403 Forbidden en producción. En el log de nginx: "Permission denied". El log del sistema dice: "type=AVC msg=audit(1234567890.123:456): avc: denied { read } for pid=1234 comm='nginx' name='index.html' dev='sda1' ino=123456 scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:user_home_t:s0 tclass=file permissive=0". Este mensaje AVC contiene toda la información para resolver el problema —si sabes leerlo.

### 📖 Anatomía de un mensaje AVC

AVC = Access Vector Cache. El kernel registra cada decisión de acceso denegada como un evento AVC.

\`\`\`text
type=AVC msg=audit(1703001234.567:789): avc: denied { read } for
  pid=1234
  comm="nginx"
  name="index.html"
  dev="sda1"
  ino=987654
  scontext=system_u:system_r:httpd_t:s0
  tcontext=unconfined_u:object_r:user_home_t:s0
  tclass=file
  permissive=0

Desglose:
  avc: denied        → acción denegada
  { read }           → permiso denegado (read, write, execute, open, getattr...)
  pid=1234           → PID del proceso que intentó el acceso
  comm="nginx"       → nombre del proceso
  name="index.html"  → nombre del archivo objetivo
  scontext=...httpd_t:s0   → contexto del SUJETO (proceso que accede)
  tcontext=...user_home_t:s0 → contexto del OBJETO (recurso al que accede)
  tclass=file        → clase del objeto (file, dir, socket, process, capability...)
  permissive=0       → 0=enforcing (denegado de verdad), 1=permissive (solo log)
\`\`\`

**Interpretación**: el proceso \`nginx\` (dominio \`httpd_t\`) intentó leer (\`{ read }\`) el archivo \`index.html\` con contexto \`user_home_t\`. No existe regla que permita \`httpd_t\` leer \`user_home_t:file\`.

### 📖 ausearch: buscar denials en el log

\`\`\`bash
# Buscar todos los denials AVC recientes
ausearch -m avc -ts recent
# -m avc = tipo de mensaje AVC
# -ts recent = últimos 10 minutos

# Denials de las últimas N horas
ausearch -m avc -ts today
ausearch -m avc -ts yesterday

# Denials por nombre de proceso
ausearch -m avc -c nginx
ausearch -m avc -c sshd

# Denials por PID
ausearch -m avc -p 1234

# Formato compacto y legible
ausearch -m avc -ts recent --format text

# Combinado: denials de httpd hoy
ausearch -m avc -ts today -c httpd | tail -50

# En sistemas con journald (alternativa)
journalctl -t setroubleshoot --since "1 hour ago"
\`\`\`

### 📖 audit2why: entender la causa raíz

\`audit2why\` traduce un mensaje AVC crudo a una explicación legible con posibles soluciones.

\`\`\`bash
# Analizar denials recientes
ausearch -m avc -ts recent | audit2why

# Salida típica:
# type=AVC msg=audit(1703001234.567:789): avc: denied { read } for pid=1234...
#
# Was caused by:
#   Missing type enforcement (TE) allow rule.
#
#   You can use audit2allow to generate a loadable module to allow this access.

# Otro ejemplo — boolean desactivado:
# Was caused by:
#   The boolean httpd_read_user_content was set incorrectly.
#   Description:
#   Allow httpd to read user content
#   Allow access by executing:
#   # setsebool -P httpd_read_user_content 1

# Otro ejemplo — contexto de archivo incorrecto:
# Was caused by:
#   Incorrect or missing type enforcement file context.
#   Fix:
#   semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'
#   restorecon -v /srv/web/index.html

# Analizar un archivo de audit completo
audit2why < /var/log/audit/audit.log | grep -A5 "Was caused"
\`\`\`

### 📖 sealert: diagnóstico asistido

\`sealert\` (parte de \`setroubleshoot\`) proporciona explicaciones más detalladas y accesibles.

\`\`\`bash
# Instalar setroubleshoot (si no está instalado)
dnf install -y setroubleshoot-server

# Analizar el log completo de auditoría
sealert -a /var/log/audit/audit.log

# Salida típica:
# SELinux is preventing nginx from read access on the file index.html.
#
# *****  Plugin restorecon (99.5 confidence) suggests ****
#
# If you want to fix the label.
# /srv/web/index.html default label should be httpd_sys_content_t.
# Then you can run restorecon.
#
# Do
# # /sbin/restorecon -v /srv/web/index.html
#
# *****  Plugin catchall (1.49 confidence) suggests ****
#
# If you believe that nginx should be allowed read access...
# Then you should report this as a bug.
# You can generate a local policy module to allow this access.
# Do
# allow this access for now by executing:
# # ausearch -c 'nginx' --raw | audit2allow -M mypol
# # semodule -X 300 -i mypol.pp

# Modo monitor en tiempo real
sealert -l "*"
\`\`\`

### 📖 audit2allow: generar módulos de política

Cuando no existe un boolean ni un contexto que resuelva el problema, \`audit2allow\` genera una regla de política personalizada.

\`\`\`bash
# Generar regla en texto (no la aplica)
ausearch -m avc -ts recent | audit2allow

# Salida:
# #============= httpd_t ==============
# allow httpd_t user_home_t:file { read getattr open };

# Generar módulo compilado (-M = module name)
ausearch -m avc -ts recent -c nginx | audit2allow -M nginx_custom

# Crea dos archivos:
# nginx_custom.te   → texto de la política (Type Enforcement)
# nginx_custom.pp   → módulo compilado (Policy Package)

# Ver el contenido .te generado
cat nginx_custom.te
# module nginx_custom 1.0;
#
# require {
#   type httpd_t;
#   type user_home_t;
#   class file { getattr open read };
# }
#
# #============= httpd_t ==============
# allow httpd_t user_home_t:file { getattr open read };

# Instalar el módulo
semodule -i nginx_custom.pp

# Verificar módulo instalado
semodule -l | grep nginx_custom
# nginx_custom  1.0

# Desinstalar módulo
semodule -r nginx_custom

# Generar desde archivo de audit específico
audit2allow -M mipolitica < /var/log/audit/audit.log
semodule -i mipolitica.pp
\`\`\`

**Importante**: \`audit2allow\` genera la política mínima para permitir lo que se denegó. Revisa siempre el \`.te\` antes de instalar —asegúrate de que no estás permitiendo más de lo necesario.

### 📖 Denials más comunes y soluciones

\`\`\`bash
# 1. httpd leyendo DocumentRoot fuera de /var/www
# denied { read } scontext=httpd_t tcontext=default_t tclass=file
# Solución:
semanage fcontext -a -t httpd_sys_content_t '/ruta/custom(/.*)?'
restorecon -Rv /ruta/custom/

# 2. httpd en puerto no estándar
# denied { name_bind } scontext=httpd_t tcontext=unreserved_port_t tclass=tcp_socket
# Solución:
semanage port -a -t http_port_t -p tcp 8888

# 3. httpd haciendo proxy/conexión saliente
# denied { name_connect } scontext=httpd_t tcontext=http_port_t tclass=tcp_socket
# Solución:
setsebool -P httpd_can_network_connect on

# 4. httpd conectando a base de datos
# denied { name_connect } scontext=httpd_t tcontext=mysqld_port_t
# Solución:
setsebool -P httpd_can_connect_db on

# 5. sshd en puerto no estándar
# denied { name_bind } scontext=sshd_t tcontext=unreserved_port_t
# Solución:
semanage port -a -t ssh_port_t -p tcp 2222

# 6. Archivo recién creado/copiado con contexto incorrecto
# denied { read } tcontext=unlabeled_t
# Solución: el archivo fue creado sin contexto (raro, normalmente por montajes)
restorecon -Rv /ruta/archivo

# 7. Script CGI no ejecutable por httpd
# denied { execute } scontext=httpd_t tcontext=httpd_sys_content_t tclass=file
# Solución: cambiar tipo para scripts
chcon -t httpd_sys_script_exec_t /var/www/cgi-bin/myscript.cgi
# O permanente:
semanage fcontext -a -t httpd_sys_script_exec_t '/var/www/cgi-bin(/.*)?'
restorecon -Rv /var/www/cgi-bin/
\`\`\`

### 📖 Estrategia de resolución de denials

\`\`\`text
Cuando SELinux bloquea algo:

1. NUNCA hacer setenforce 0 como solución permanente

2. Diagnóstico:
   ausearch -m avc -ts recent | audit2why
   → ¿Es un boolean? → setsebool -P <bool> on
   → ¿Es un contexto? → semanage fcontext + restorecon
   → ¿Es un puerto?   → semanage port -a
   → ¿Es una regla faltante? → audit2allow -M + semodule -i

3. Validar en permissive primero (setenforce 0), verificar que funciona,
   luego volver a enforcing (setenforce 1)

4. Si la solución fue audit2allow, revisar el .te generado:
   - ¿Permite solo lo mínimo necesario?
   - ¿No abre vectores de ataque nuevos?
   - Documentar el módulo personalizado en el control de versiones

5. Monitorear logs post-solución:
   ausearch -m avc -ts recent
\`\`\`

### 📋 Lo que debes recordar

* Un mensaje AVC contiene: operación denegada, proceso (scontext), recurso (tcontext) y clase.
* \`ausearch -m avc -ts recent\` filtra denials recientes del log de auditoría.
* \`audit2why\` explica la causa (boolean, contexto incorrecto, regla faltante) con solución sugerida.
* \`audit2allow -M nombre\` genera un módulo; \`semodule -i nombre.pp\` lo instala.
* Nunca instalar un módulo \`audit2allow\` sin revisar el \`.te\` — puede abrir brechas innecesarias.
* Orden de preferencia: boolean existente > corrección de contexto > módulo personalizado.

### 🧪 Autoevaluación

1. Un mensaje AVC muestra: \`denied { name_connect } scontext=httpd_t tcontext=mysqld_port_t\`. ¿Qué significa y cuál es la solución correcta?
2. ¿En qué situación usarías \`audit2allow\` en lugar de \`setsebool\` o \`semanage fcontext\`?
3. Generas un módulo con \`audit2allow -M mipol\`. ¿Qué debes verificar antes de ejecutar \`semodule -i mipol.pp\`?

---

1. El proceso httpd (nginx/Apache) intentó conectarse al puerto MySQL (\`mysqld_port_t\`) y SELinux lo bloqueó. La solución es \`setsebool -P httpd_can_connect_db on\`, que habilita el boolean predefinido para este caso de uso.
2. Cuando no existe ningún boolean ni corrección de contexto que resuelva el problema: el acceso es legítimo pero la política no lo contempla. Por ejemplo, una aplicación personalizada que necesita acceder a un recurso del sistema fuera de los patrones estándar de la política targeted.
3. Revisar el archivo \`mipol.te\` para asegurar que las reglas generadas solo permiten lo mínimo necesario y no abren vectores de ataque adicionales (por ejemplo, que no permita acceso a \`shadow_t\` o tipos sensibles que no eran parte del denial original).
`

export default content
