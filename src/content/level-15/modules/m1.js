const content = `
## Módulo 1 — sudoers avanzado: aliases, NOPASSWD, restricciones y sudoreplay

### 🎯 Objetivos de aprendizaje

* Entender la sintaxis completa de /etc/sudoers y editar con visudo de forma segura.
* Definir User_Alias, Cmnd_Alias y Host_Alias para políticas escalables.
* Aplicar NOPASSWD, PASSWD y Defaults de forma precisa y auditada.
* Usar sudoreplay para auditar sesiones sudo en entornos de producción.

### ❓ El problema real

En una empresa con 40 administradores y 200 servidores, otorgar acceso root irrestricto viola el principio de mínimo privilegio y hace imposible auditar quién ejecutó qué. Necesitas que el equipo de DBA pueda reiniciar PostgreSQL pero no tocar el firewall, que el equipo de redes configure iptables pero no acceda a bases de datos, y que todo quede registrado para cumplimiento regulatorio (PCI-DSS, SOC2). sudoers bien diseñado resuelve exactamente esto.

### 📖 Anatomía de /etc/sudoers

Nunca edites /etc/sudoers directamente. Siempre usa \`visudo\`, que valida la sintaxis antes de guardar y evita bloquear el acceso sudo si hay un error.

\`\`\`bash
visudo                          # edita /etc/sudoers
visudo -f /etc/sudoers.d/dbas   # edita un archivo específico en sudoers.d
visudo -c                       # solo valida sintaxis, no edita
\`\`\`

La sintaxis de una regla sudo es:

\`\`\`text
WHO  WHERE = (AS_WHOM)  WHAT

Ejemplos:
juan        ALL = (ALL)   ALL
%admins     ALL = (ALL)   ALL
deploy      web01 = (www-data) /usr/bin/systemctl restart nginx
\`\`\`

Campos:
- **WHO**: usuario (juan) o grupo (%admins). El % indica grupo.
- **WHERE**: host o ALL. Relevante en entornos con sudoers compartido por NFS.
- **(AS_WHOM)**: usuario/grupo al que se puede suplantar. (ALL:ALL) incluye usuarios y grupos.
- **WHAT**: comandos permitidos, con ruta absoluta siempre.

### 📖 Aliases: escalabilidad en políticas

Los aliases evitan repetición y hacen las políticas mantenibles cuando hay múltiples usuarios, hosts y comandos.

\`\`\`text
# /etc/sudoers — sección de aliases

# User_Alias: agrupar usuarios
User_Alias  DBA_TEAM    = maria, carlos, ana
User_Alias  NET_TEAM    = pedro, luis
User_Alias  APP_TEAM    = deploy, capistrano
User_Alias  SYSADMINS   = %wheel, %sudo

# Host_Alias: agrupar servidores
Host_Alias  DB_SERVERS  = db01, db02, db03
Host_Alias  WEB_SERVERS = web01, web02, lb01
Host_Alias  ALL_PROD    = DB_SERVERS, WEB_SERVERS

# Cmnd_Alias: agrupar comandos
Cmnd_Alias  DB_CMDS     = /usr/bin/systemctl restart postgresql, \
                           /usr/bin/systemctl stop postgresql, \
                           /usr/bin/systemctl start postgresql, \
                           /usr/bin/pg_dump, \
                           /usr/bin/psql
Cmnd_Alias  NET_CMDS    = /sbin/iptables, /sbin/ip, /usr/sbin/tcpdump
Cmnd_Alias  APP_CMDS    = /usr/bin/systemctl restart nginx, \
                           /usr/bin/systemctl reload nginx, \
                           /usr/bin/systemctl restart gunicorn
Cmnd_Alias  DANGEROUS   = /bin/bash, /bin/sh, /usr/bin/vim, /bin/su

# Aplicar políticas
DBA_TEAM    DB_SERVERS  = (postgres) DB_CMDS
NET_TEAM    ALL_PROD    = (root)     NET_CMDS
APP_TEAM    WEB_SERVERS = (www-data) APP_CMDS
SYSADMINS   ALL         = (ALL:ALL)  ALL, !DANGEROUS
\`\`\`

El \`!\` niega un alias. \`ALL, !DANGEROUS\` permite todo excepto los comandos peligrosos listados.

**Advertencia**: la negación con \`!\` tiene limitaciones. Un usuario con acceso a \`/bin/bash\` puede ejecutar cualquier cosa. Un usuario con acceso a editores de texto (\`vim\`, \`nano\`) puede editar /etc/sudoers y escalar privilegios.

### 📖 Defaults: comportamiento global y por usuario

\`\`\`text
# /etc/sudoers — sección Defaults

# Configuración global
Defaults    env_reset                    # limpiar variables de entorno al ejecutar sudo
Defaults    mail_badpass                 # enviar email si la contraseña es incorrecta
Defaults    secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Defaults    logfile="/var/log/sudo.log"  # log adicional de comandos sudo
Defaults    log_input, log_output        # grabar sesiones (para sudoreplay)
Defaults    iolog_dir="/var/log/sudo-io" # directorio de grabación de sesiones
Defaults    timestamp_timeout=15         # minutos antes de pedir contraseña de nuevo (0 = siempre)
Defaults    passwd_tries=3              # intentos antes de fallar

# Defaults por usuario/grupo
Defaults:DBA_TEAM  !requiretty          # permitir sudo sin TTY (necesario para scripts)
Defaults:deploy    env_keep += "RAILS_ENV NODE_ENV"  # preservar variables específicas
Defaults:SYSADMINS timestamp_timeout=30

# Defaults por comando
Defaults!/usr/bin/pg_dump  !authenticate  # pg_dump sin contraseña
\`\`\`

### 📖 NOPASSWD y PASSWD: control de autenticación

\`\`\`text
# NOPASSWD: no pedir contraseña para comandos específicos
# Útil para: scripts de deploy, monitoring, reinicio de servicios automatizado

# Solo para comandos de monitoring (sin contraseña)
nagios      ALL = NOPASSWD: /usr/lib/nagios/plugins/*, /usr/bin/systemctl status *

# Deploy puede reiniciar la app sin contraseña
deploy      WEB_SERVERS = NOPASSWD: /usr/bin/systemctl restart myapp

# Sysadmin: NOPASSWD para la mayoría, PASSWD para comandos peligrosos
%wheel      ALL = NOPASSWD: ALL, PASSWD: /bin/bash, /bin/su, /usr/bin/passwd

# Combinación: sin contraseña para operaciones, con contraseña para cambios críticos
DBA_TEAM    DB_SERVERS = NOPASSWD: /usr/bin/systemctl status postgresql, \
                         PASSWD: /usr/bin/systemctl stop postgresql
\`\`\`

### 📖 sudoedit: edición segura de archivos

\`\`\`bash
# sudoedit permite editar archivos como otro usuario SIN dar acceso a un editor completo
# Internamente: copia el archivo a /tmp, abre el editor del usuario, y copia de vuelta

# En sudoers:
deploy  ALL = sudoedit /etc/nginx/sites-available/*, /etc/myapp/config.yml

# Uso:
sudoedit /etc/nginx/sites-available/mysite.conf

# Ventaja: el usuario no obtiene un shell como root a través del editor
# Si tuvieras: deploy ALL = (root) /usr/bin/vim /etc/nginx/...
# El usuario podría hacer :! bash dentro de vim y obtener un shell root
\`\`\`

### 📖 sudoreplay: auditoría de sesiones

Cuando \`log_output\` está habilitado en Defaults, sudo graba todas las sesiones. \`sudoreplay\` permite reproducirlas.

\`\`\`bash
# Ver qué sesiones están grabadas
sudoreplay -l

# Reproducir una sesión específica por TSID (Time Stamp ID)
sudoreplay /var/log/sudo-io/00/00/01

# Listar sesiones de un usuario específico
sudoreplay -l user=maria

# Listar sesiones de un comando específico
sudoreplay -l command=/usr/bin/psql

# Listar sesiones en un rango de tiempo
sudoreplay -l fromdate=2024-01-01 todate=2024-01-31

# Reproducir a velocidad diferente
sudoreplay -s 2.0 /var/log/sudo-io/00/00/01  # doble velocidad
sudoreplay -s 0.5 /var/log/sudo-io/00/00/01  # mitad de velocidad

# Ver solo los comandos sin reproducir (para auditoría rápida)
sudoreplay -l user=carlos command=/bin/bash
\`\`\`

\`\`\`text
# Formato del log en /var/log/sudo.log:
Jan 15 14:32:01 : maria : TTY=pts/1 ; PWD=/home/maria ; USER=postgres ; COMMAND=/usr/bin/psql -U postgres -d produccion
Jan 15 14:35:12 : carlos : TTY=pts/2 ; PWD=/root ; USER=root ; COMMAND=/bin/bash
\`\`\`

### 📖 Directorio /etc/sudoers.d/

En lugar de un sudoers monolítico, distribuye políticas en archivos separados:

\`\`\`bash
# Estructura recomendada
ls /etc/sudoers.d/
# 10-sysadmins
# 20-dba-team
# 30-net-team
# 40-app-deploy
# 50-monitoring
# 90-emergency-access

# Incluir el directorio en /etc/sudoers (ya incluido por defecto en la mayoría de distros):
# @includedir /etc/sudoers.d

# Crear un archivo nuevo y editarlo con visudo
visudo -f /etc/sudoers.d/20-dba-team

# Los archivos deben tener permisos 0440
chmod 0440 /etc/sudoers.d/20-dba-team

# Validar todos los archivos
visudo -c
\`\`\`

### 📋 Lo que debes recordar

* Siempre usa \`visudo\` para editar sudoers — nunca directamente con un editor, ya que un error de sintaxis bloquea todo acceso sudo.
* Los aliases (User_Alias, Cmnd_Alias, Host_Alias) son esenciales para políticas mantenibles en entornos con múltiples usuarios.
* \`log_output\` en Defaults habilita la grabación de sesiones que \`sudoreplay\` puede reproducir para auditoría.
* \`sudoedit\` es más seguro que dar acceso sudo a un editor de texto, porque el editor corre con los privilegios del usuario, no de root.

### 🧪 Autoevaluación

1. ¿Por qué \`%wheel ALL = ALL, !DANGEROUS\` no es una restricción de seguridad efectiva si \`DANGEROUS\` incluye \`/bin/bash\` pero no \`/usr/bin/python3\`?
2. Un script de monitoreo de Nagios necesita ejecutar \`/usr/lib/nagios/plugins/check_disk\` como root sin contraseña. ¿Cómo configuras esto de forma segura?
3. ¿Qué Defaults debes activar para que \`sudoreplay\` pueda reproducir sesiones completas, y dónde se almacenan las grabaciones?

---

1. La negación \`!DANGEROUS\` solo bloquea los comandos listados explícitamente. Si Python no está en la lista, el usuario puede ejecutar \`sudo python3 -c "import os; os.system('/bin/bash')"\` y obtener un shell root. La negación en sudoers no es una barrera de seguridad robusta — el diseño correcto es allowlisting (solo permitir lo que se necesita, negar todo lo demás por defecto).
2. En /etc/sudoers.d/50-monitoring: \`nagios ALL = NOPASSWD: /usr/lib/nagios/plugins/check_disk\`. Usa la ruta absoluta completa y especifica exactamente el binario. Si necesitas múltiples plugins: \`Cmnd_Alias NAGIOS_PLUGINS = /usr/lib/nagios/plugins/check_disk, /usr/lib/nagios/plugins/check_load\` y luego \`nagios ALL = NOPASSWD: NAGIOS_PLUGINS\`.
3. Debes activar \`Defaults log_input, log_output\` y opcionalmente \`Defaults iolog_dir="/var/log/sudo-io"\`. Las grabaciones se almacenan en ese directorio organizadas por TSID (un identificador de sesión). También es recomendable \`Defaults logfile="/var/log/sudo.log"\` para el log de texto plano con metadatos.
`

export default content
