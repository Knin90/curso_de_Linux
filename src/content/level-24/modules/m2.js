const content = `
## Módulo 2 — SELinux: modos, contextos y política targeted

### 🎯 Objetivos de aprendizaje

* Distinguir los tres modos de SELinux y sus implicaciones operacionales.
* Leer e interpretar contextos SELinux en archivos, procesos y usuarios.
* Entender la política targeted y cómo protege dominios específicos.
* Gestionar booleans SELinux para ajustar comportamiento sin recompilar política.

### ❓ El problema real

Instalas un servicio nuevo en producción. Funciona perfectamente en tu entorno de desarrollo (sin SELinux activo). Lo despliegas en producción (RHEL con SELinux enforcing) y el servicio arranca pero no puede acceder a sus propios archivos de configuración. Sin entender SELinux, el impulso natural es ejecutar \`setenforce 0\` o añadir \`SELINUX=disabled\` en la configuración. Eso elimina una capa crítica de seguridad. La solución correcta es diagnosticar el contexto incorrecto y corregirlo —sin tocar el modo enforcing.

### 📖 Los tres modos de SELinux

\`\`\`text
enforcing   → Política activa: deniega y registra violaciones
permissive  → Solo registra: no deniega nada (diagnóstico)
disabled    → SELinux completamente desactivado (requiere reboot para reactivar)
\`\`\`

\`\`\`bash
# Ver modo actual
getenforce
# Salida: Enforcing | Permissive | Disabled

# Estado detallado
sestatus
# SELinux status:                 enabled
# SELinuxfs mount:                /sys/fs/selinux
# SELinux mount point:            /sys/fs/selinux
# Loaded policy name:             targeted
# Current mode:                   enforcing
# Mode from config file:          enforcing
# Policy MLS status:              enabled
# Policy deny_unknown status:     allowed
# Memory protection checking:     actual (secure)
# Max kernel policy version:      33

# Cambiar modo en tiempo real (no persiste tras reboot)
setenforce 0   # → permissive (para diagnóstico)
setenforce 1   # → enforcing  (restaurar protección)

# Verificar
getenforce
\`\`\`

**Configuración persistente** — \`/etc/selinux/config\`:

\`\`\`bash
cat /etc/selinux/config
# # This file controls the state of SELinux on the system.
# # SELINUX= can take one of these three values:
# #     enforcing  - SELinux security policy is enforced.
# #     permissive - SELinux prints warnings instead of enforcing.
# #     disabled   - No SELinux policy is loaded.
# SELINUX=enforcing
#
# # SELINUXTYPE= can take one of these three values:
# #     targeted - Targeted processes are protected,
# #     minimum  - Modification of targeted policy.
# #     mls      - Multi Level Security protection.
# SELINUXTYPE=targeted
\`\`\`

\`\`\`bash
# Cambiar a permissive de forma permanente (requiere reboot)
sed -i 's/^SELINUX=.*/SELINUX=permissive/' /etc/selinux/config

# NUNCA hacer esto en producción sin justificación documentada:
# SELINUX=disabled  → requiere reboot y relabeling completo del filesystem para reactivar
\`\`\`

**Regla operacional**: en producción siempre enforcing. Para diagnóstico, usar permissive temporalmente con \`setenforce 0\` —nunca disabled.

### 📖 Formato del contexto SELinux

El contexto SELinux es una etiqueta de 4 campos separados por \`:\`:

\`\`\`text
user:role:type:level

Ejemplo: system_u:object_r:httpd_sys_content_t:s0

  user    → system_u   (usuario SELinux, no usuario Unix)
  role    → object_r   (rol: object_r para archivos, system_r para procesos)
  type    → httpd_sys_content_t  (el campo más importante en política targeted)
  level   → s0         (nivel MLS/MCS, s0 = sin clasificación especial)
\`\`\`

El campo **type** es el núcleo de la política targeted. Las reglas de SELinux se expresan como:
\`\`\`text
allow <dominio_proceso> <tipo_recurso>:<clase> { <permisos> };

Ejemplo:
allow httpd_t httpd_sys_content_t:file { read getattr open };
\`\`\`

### 📖 Ver contextos en el sistema

\`\`\`bash
# Contextos de archivos
ls -Z /var/www/html/
# system_u:object_r:httpd_sys_content_t:s0 index.html
# system_u:object_r:httpd_sys_content_t:s0 app.php

ls -Z /etc/
# system_u:object_r:etc_t:s0              hosts
# system_u:object_r:shadow_t:s0           shadow
# system_u:object_r:passwd_file_t:s0      passwd
# system_u:object_r:sshd_config_t:s0      ssh/

ls -Z /var/log/
# system_u:object_r:var_log_t:s0          messages
# system_u:object_r:audit_log_t:s0        audit/

# Contextos de procesos
ps -Z
# LABEL                               PID TTY          TIME CMD
# system_u:system_r:init_t:s0          1 ?        00:00:01 systemd
# system_u:system_r:httpd_t:s0      1234 ?        00:00:00 nginx
# system_u:system_r:sshd_t:s0       2345 ?        00:00:00 sshd

ps -Zaux | grep nginx
# system_u:system_r:httpd_t:s0      1234 ...  nginx: master process

# Contexto del usuario actual
id -Z
# unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023
# (usuario sin confinar — típico en sesiones interactivas)

# Contexto de un archivo específico
ls -Z /etc/nginx/nginx.conf
# system_u:object_r:httpd_config_t:s0 /etc/nginx/nginx.conf
\`\`\`

### 📖 La política targeted

La política targeted es la predeterminada en RHEL/CentOS/Fedora. Confina un subconjunto de demonios de alto riesgo (los más expuestos a Internet) y deja el resto "sin confinar" (unconfined_t).

\`\`\`text
Dominios confinados por política targeted (ejemplos):
  httpd_t     → Apache/nginx
  sshd_t      → OpenSSH daemon
  mysqld_t    → MySQL/MariaDB
  postgresql_t → PostgreSQL
  named_t     → BIND DNS
  postfix_t   → Postfix MTA
  dhcpd_t     → DHCP daemon
  ftpd_t      → vsftpd/ProFTP

Usuarios interactivos (admin, root):
  unconfined_u:unconfined_r:unconfined_t → sin restricciones MAC
  (root sigue siendo poderoso bajo política targeted)

Para confinamiento total de usuarios: política strict o MLS
\`\`\`

\`\`\`bash
# Ver todos los dominios confinados activos
ps -eZ | grep -v unconfined | awk '{print \$1}' | sort -u

# Política MLS/MCS (Multi-Level Security) — más restrictiva
# SELINUXTYPE=mls en /etc/selinux/config
# Requiere etiquetado explícito de sensibilidad en cada archivo
\`\`\`

### 📖 Booleans SELinux

Los booleans son interruptores que modifican el comportamiento de la política sin recompilarla. Permiten habilitar/deshabilitar comportamientos opcionales de dominios confinados.

\`\`\`bash
# Listar todos los booleans
getsebool -a
# abrt_anon_write --> off
# abrt_handle_event --> off
# allow_ftpd_full_access --> off
# allow_httpd_anon_write --> off
# httpd_can_connect_db --> off
# httpd_can_network_connect --> off
# httpd_can_sendmail --> off
# httpd_enable_cgi --> on
# httpd_use_nfs --> off
# ...

# Buscar booleans relevantes para un servicio
getsebool -a | grep httpd
getsebool -a | grep ftp

# Ver valor de un boolean específico
getsebool httpd_can_network_connect
# httpd_can_network_connect --> off

# Cambiar boolean temporalmente (no persiste)
setsebool httpd_can_connect_db on

# Cambiar boolean de forma permanente (-P = persistent)
setsebool -P httpd_can_connect_db on

# Verificar
getsebool httpd_can_connect_db
# httpd_can_connect_db --> on

# Gestión con semanage (más completo)
semanage boolean -l | grep httpd_can_connect_db
# httpd_can_connect_db     (on   ,   on)  Allow httpd to connect to databases
\`\`\`

**Casos de uso comunes de booleans:**

\`\`\`bash
# Permitir que nginx/Apache haga proxy (conecte a backends)
setsebool -P httpd_can_network_connect on

# Permitir que httpd conecte a base de datos
setsebool -P httpd_can_connect_db on

# Permitir que httpd lea archivos home (útil para ~user/public_html)
setsebool -P httpd_read_user_content on

# Permitir que FTP tenga acceso completo al filesystem
setsebool -P allow_ftpd_full_access on

# Permitir que SSH use PAM con home dirs no estándar
setsebool -P use_nfs_home_dirs on
\`\`\`

### 📋 Lo que debes recordar

* Tres modos: enforcing (activo), permissive (solo log), disabled (apagado, requiere reboot para reactivar).
* Nunca usar \`disabled\` en producción. Para diagnóstico: \`setenforce 0\` (temporal, permissive).
* Formato de contexto: \`user:role:type:level\`. El campo **type** es el que gobierna la política targeted.
* Comandos de inspección: \`ls -Z\` (archivos), \`ps -Z\` (procesos), \`id -Z\` (usuario actual).
* La política targeted confina demonios de alto riesgo; usuarios interactivos son unconfined_t.
* Booleans: ajustan política sin recompilar. \`getsebool -a\`, \`setsebool -P\` (persistente).

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`setenforce 0\` y \`SELINUX=disabled\` en /etc/selinux/config?
2. Un proceso nginx tiene contexto \`system_u:system_r:httpd_t:s0\`. ¿Qué campo determina qué puede y no puede hacer según la política targeted?
3. nginx necesita conectarse a un backend PHP-FPM en otro servidor. ¿Qué boolean debes activar?

---

1. \`setenforce 0\` cambia el modo a permissive en tiempo real, sin reboot, y es reversible con \`setenforce 1\`. SELINUX=disabled apaga SELinux completamente y requiere reboot para reactivarlo, además de un relabeling completo del filesystem.
2. El campo \`type\`: \`httpd_t\`. Las reglas de la política definen qué tipos de recursos puede acceder el dominio httpd_t y con qué permisos.
3. \`setsebool -P httpd_can_network_connect on\`. Sin este boolean, la política targeted bloquea conexiones de red salientes desde httpd_t hacia otros servidores.
`

export default content
