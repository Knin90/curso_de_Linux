const content = `
## Módulo 3 — Gestión de contextos SELinux: chcon, restorecon y semanage

### 🎯 Objetivos de aprendizaje

* Distinguir entre cambios de contexto temporales y permanentes.
* Usar \`chcon\` para cambios rápidos de diagnóstico.
* Usar \`restorecon\` para restaurar contextos desde la base de datos de política.
* Usar \`semanage fcontext\` para definir contextos permanentes fuera del árbol estándar.
* Gestionar puertos SELinux con \`semanage port\`.

### ❓ El problema real

Migras el DocumentRoot de nginx de \`/var/www/html\` a \`/srv/web/miapp\`. nginx falla con permission denied aunque los permisos Unix son correctos (www-data puede leer). El problema: los archivos en \`/srv/web/miapp\` tienen contexto \`default_t\`, no \`httpd_sys_content_t\`. SELinux rechaza el acceso aunque DAC lo permitiría. Necesitas asignar el contexto correcto de forma permanente, no solo hasta el próximo \`restorecon\`.

### 📖 La base de datos de contextos de archivos

SELinux mantiene una base de datos de reglas que mapea rutas (expresiones regulares) a contextos. Esta base de datos es la "verdad" sobre qué contexto debería tener cada archivo.

\`\`\`bash
# Ver la base de datos de contextos de archivos
semanage fcontext -l | head -30
# SELinux fcontext      type               Context
# /                     directory          system_u:object_r:root_t:s0
# /.*                   all files          system_u:object_r:default_t:s0
# /var/www(/.*)?        all files          system_u:object_r:httpd_sys_content_t:s0
# /etc/nginx(/.*)?      all files          system_u:object_r:httpd_config_t:s0
# /var/log/nginx(/.*)?  all files          system_u:object_r:httpd_log_t:s0

# Buscar regla para una ruta específica
semanage fcontext -l | grep '/var/www'
# /var/www(/.*)?    all files    system_u:object_r:httpd_sys_content_t:s0

# Archivos de política en disco
ls /etc/selinux/targeted/contexts/files/
# file_contexts        file_contexts.bin  file_contexts.homedirs
# file_contexts.local  file_contexts.subs_dist
\`\`\`

### 📖 chcon: cambio temporal de contexto

\`chcon\` modifica el contexto almacenado en el inodo del archivo. El cambio es **temporal**: \`restorecon\` o un relabeling del filesystem lo revertirá al contexto de la base de datos.

\`\`\`bash
# Sintaxis básica
chcon -t <tipo> <archivo>
chcon -u <usuario_selinux> <archivo>
chcon -r <rol> <archivo>

# Caso práctico: archivo HTML sin contexto httpd
ls -Z /srv/web/index.html
# unconfined_u:object_r:default_t:s0 /srv/web/index.html

# Asignar tipo httpd_sys_content_t
chcon -t httpd_sys_content_t /srv/web/index.html

ls -Z /srv/web/index.html
# unconfined_u:object_r:httpd_sys_content_t:s0 /srv/web/index.html

# Copiar contexto de un archivo de referencia
chcon --reference=/var/www/html/index.html /srv/web/index.html

# Cambio recursivo (-R) en un directorio completo
chcon -R -t httpd_sys_content_t /srv/web/miapp/

# Verificar
ls -lZ /srv/web/miapp/
\`\`\`

**Cuándo usar chcon**: pruebas rápidas para verificar si el contexto es el problema. En producción, siempre seguir con \`semanage fcontext\` + \`restorecon\`.

### 📖 restorecon: restaurar contextos desde la política

\`restorecon\` lee la base de datos de \`semanage fcontext\` y aplica el contexto correcto a los archivos. Si no existe una regla para la ruta, aplica el contexto por defecto.

\`\`\`bash
# Restaurar contexto de un archivo
restorecon /etc/nginx/nginx.conf

# Restaurar recursivamente (-R) con verbose (-v)
restorecon -Rv /var/www/html/

# Salida esperada:
# Relabeled /var/www/html/index.html from default_t to httpd_sys_content_t
# Relabeled /var/www/html/app.php from default_t to httpd_sys_content_t

# Modo dry-run (-n): muestra qué haría sin hacer nada
restorecon -Rvn /srv/web/

# Forzar relabeling aunque el contexto parezca correcto (-F)
restorecon -RFv /var/www/html/

# Relabeling completo del filesystem (requiere reboot, para reactivar SELinux tras disabled)
touch /.autorelabel
reboot
# Al arrancar, SELinux relabela todo el filesystem
\`\`\`

**Flujo típico de diagnóstico:**

\`\`\`bash
# 1. Detectar problema (denial en log)
# 2. Verificar contexto actual
ls -Z /srv/web/miapp/index.html
# unconfined_u:object_r:default_t:s0

# 3. Probar con chcon (temporal)
chcon -t httpd_sys_content_t /srv/web/miapp/index.html
# ¿Funciona ahora? → el contexto era el problema

# 4. Hacer el cambio permanente con semanage + restorecon
semanage fcontext -a -t httpd_sys_content_t '/srv/web/miapp(/.*)?'
restorecon -Rv /srv/web/miapp/

# 5. Verificar que el contexto es correcto y persiste
ls -Z /srv/web/miapp/
\`\`\`

### 📖 semanage fcontext: contextos permanentes

\`semanage fcontext\` agrega reglas a la base de datos de política local. Estas reglas sobreviven actualizaciones de política y relabeling del filesystem.

\`\`\`bash
# Agregar regla de contexto (-a = add)
semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'

# La expresión regular sigue la sintaxis de Python re:
# /srv/web(/.*)?  → /srv/web y todo su contenido recursivo

# Modificar una regla existente (-m = modify)
semanage fcontext -m -t httpd_sys_rw_content_t '/srv/web/uploads(/.*)?'

# Eliminar una regla (-d = delete)
semanage fcontext -d '/srv/web(/.*)?'

# Ver solo reglas locales (las que has agregado tú)
semanage fcontext -l -C

# Ejemplo completo: DocumentRoot personalizado
semanage fcontext -a -t httpd_sys_content_t '/opt/webapp/public(/.*)?'
semanage fcontext -a -t httpd_log_t '/opt/webapp/logs(/.*)?'
semanage fcontext -a -t httpd_config_t '/opt/webapp/config(/.*)?'
restorecon -Rv /opt/webapp/

# Ejemplo: directorio writable por httpd (uploads)
semanage fcontext -a -t httpd_sys_rw_content_t '/opt/webapp/public/uploads(/.*)?'
restorecon -Rv /opt/webapp/public/uploads/
\`\`\`

**Tipos de contexto httpd comunes:**

\`\`\`text
httpd_sys_content_t      → contenido estático (solo lectura para httpd)
httpd_sys_rw_content_t   → contenido que httpd puede escribir (uploads)
httpd_sys_script_exec_t  → scripts CGI ejecutables
httpd_config_t           → archivos de configuración
httpd_log_t              → archivos de log
httpd_cache_t            → archivos de caché
httpd_var_run_t          → sockets y PID files en /run
\`\`\`

### 📖 semanage port: gestión de puertos

SELinux también controla qué puertos puede escuchar/conectar cada dominio. Si nginx escucha en un puerto no estándar, SELinux lo bloqueará.

\`\`\`bash
# Ver puertos definidos para un tipo
semanage port -l | grep http
# http_cache_port_t    tcp   8080, 8118, 8123, 10001-10010
# http_port_t          tcp   80, 81, 443, 488, 8008, 8009, 8443, 9000

# nginx quiere escuchar en puerto 8080 → ya está en http_cache_port_t
# nginx quiere escuchar en puerto 3000 → NO está definido

# Agregar puerto 3000 al tipo http_port_t
semanage port -a -t http_port_t -p tcp 3000

# Verificar
semanage port -l | grep http_port_t
# http_port_t    tcp   80, 81, 443, 488, 3000, 8008, 8009, 8443, 9000

# Modificar puerto existente (cambiar tipo)
semanage port -m -t http_port_t -p tcp 8080

# Eliminar regla de puerto
semanage port -d -t http_port_t -p tcp 3000

# Otros tipos de puerto útiles
semanage port -l | grep ssh
# ssh_port_t    tcp   22
# Para SSH en puerto alternativo:
semanage port -a -t ssh_port_t -p tcp 2222

semanage port -l | grep mysql
# mysqld_port_t    tcp   1186, 3306, 63132-63164
\`\`\`

### 📖 Otros objetos gestionados por semanage

\`\`\`bash
# Gestión de módulos de política
semanage module -l          # listar módulos
semanage module -a local    # agregar módulo compilado

# Gestión de interfaces de red
semanage interface -l       # listar interfaces con etiqueta SELinux

# Gestión de nodos (hosts con etiqueta)
semanage node -l

# Gestión de usuarios SELinux ↔ usuarios Linux
semanage login -l
# Login Name    SELinux User    MLS/MCS Range    Service
# __default__   unconfined_u    s0-s0:c0.c1023   *
# root          unconfined_u    s0-s0:c0.c1023   *

# Mapear usuario Linux a usuario SELinux confinado
semanage login -a -s user_u miusuario
semanage login -l | grep miusuario
\`\`\`

### 📋 Lo que debes recordar

* \`chcon\` es temporal: \`restorecon\` lo revierte. Úsalo solo para diagnóstico.
* \`semanage fcontext -a\` + \`restorecon -Rv\` es el flujo correcto para cambios permanentes.
* La base de datos de semanage sobrevive actualizaciones de política y relabeling.
* Para DocumentRoot fuera de /var/www: \`semanage fcontext -a -t httpd_sys_content_t '/ruta(/.*)?'\`
* Para puertos no estándar: \`semanage port -a -t http_port_t -p tcp <puerto>\`
* Tipos clave: \`httpd_sys_content_t\` (solo lectura), \`httpd_sys_rw_content_t\` (lectura-escritura para uploads).

### 🧪 Autoevaluación

1. nginx sirve archivos desde \`/data/sitio\`. Los archivos tienen contexto \`default_t\`. ¿Qué dos comandos necesitas ejecutar para corregirlo permanentemente?
2. Ejecutas \`chcon -t httpd_sys_content_t /data/sitio/index.html\` y funciona. Luego ejecutas \`restorecon /data/sitio/index.html\` y vuelve a fallar. ¿Por qué?
3. nginx quiere escuchar en el puerto 8888. ¿Qué comando SELinux necesitas ejecutar?

---

1. \`semanage fcontext -a -t httpd_sys_content_t '/data/sitio(/.*)?'\` y luego \`restorecon -Rv /data/sitio/\`. El primer comando registra la regla en la base de datos; el segundo aplica el contexto a los archivos existentes.
2. Porque \`restorecon\` aplica el contexto de la base de datos de política, que no tiene ninguna regla para \`/data/sitio\`. Al no encontrar regla, aplica el contexto por defecto (\`default_t\`). \`chcon\` modificó el inodo pero no la base de datos.
3. \`semanage port -a -t http_port_t -p tcp 8888\`. Esto registra el puerto 8888 como puerto válido para el dominio httpd_t.
`

export default content
