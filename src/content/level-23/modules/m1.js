const content = `
## Módulo 1 — auditd: arquitectura y componentes del sistema de auditoría

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura del subsistema de auditoría de Linux.
* Identificar los componentes principales: kernel, auditd, ausearch, aureport.
* Instalar y arrancar auditd correctamente.
* Leer el log de auditoría en crudo y entender su estructura.

### ❓ El problema real

Un servidor fue comprometido. Los atacantes borraron su rastro eliminando entradas de \`/var/log/auth.log\`. ¿Cómo saber qué comandos ejecutaron, qué archivos tocaron, qué cuentas modificaron? Sin auditd activo, la respuesta es: no puedes saberlo. El sistema de auditoría de Linux opera a nivel de kernel, antes de que cualquier proceso de usuario pueda manipular los logs. Es la única fuente de verdad forense en un sistema Linux.

### 📖 Arquitectura del subsistema de auditoría

\`\`\`diagram
{"type":"nested","container":{"title":"Espacio de kernel","meta":"Intercepta syscalls antes de espacio de usuario"},"items":[{"name":"Syscalls","meta":"open, write, execve…","icon":"terminal"},{"name":"Audit Subsystem (kauditd)","meta":"Genera registros y envía por netlink socket","icon":"chip"}],"external":[{"name":"auditd","meta":"daemon, /var/log/audit/audit.log","icon":"server","side":"right"},{"name":"ausearch","meta":"búsqueda","icon":"search","side":"right"},{"name":"aureport","meta":"reportes resumidos","icon":"file","side":"right"},{"name":"auditctl","meta":"reglas","icon":"terminal","side":"right"},{"name":"audispd/plugins","meta":"syslog, prelude…","icon":"sync","side":"right"}]}
\`\`\`

### 📖 Componentes principales

\`\`\`diagram
{"type":"table-like","title":"Componentes principales","rows":[{"key":"kauditd","value":"Módulo del kernel que captura eventos"},{"key":"auditd","value":"Daemon de usuario que recibe y escribe eventos"},{"key":"auditctl","value":"Herramienta para gestionar reglas en tiempo real"},{"key":"/etc/audit/","value":"Directorio de configuración principal"},{"key":"audit.rules","value":"Reglas de auditoría permanentes"},{"key":"audit.log","value":"Log principal de eventos"},{"key":"ausearch","value":"Búsqueda en audit.log con filtros"},{"key":"aureport","value":"Reportes estadísticas de audit.log"},{"key":"audispd","value":"Dispatcher: reenvía eventos a plugins externos"}]}
\`\`\`

### 📖 Instalación y arranque

\`\`\`bash
# Fedora/RHEL/CentOS — auditd viene preinstalado
rpm -q audit
systemctl status auditd

# Debian/Ubuntu
sudo apt install auditd audispd-plugins

# Arrancar y habilitar
sudo systemctl enable --now auditd

# Verificar estado
sudo systemctl status auditd
sudo auditctl -s       # estado del subsistema del kernel
\`\`\`

\`\`\`text
# Salida de auditctl -s
enabled 1
failure 1
pid 1234
rate_limit 0
backlog_limit 8192
lost 0
backlog 0
backlog_wait_time 15000
loginuid_immutable 0 unlocked
\`\`\`

### 📖 Configuración principal: /etc/audit/auditd.conf

\`\`\`bash
# Parámetros clave en /etc/audit/auditd.conf
log_file = /var/log/audit/audit.log
log_format = ENRICHED          # incluye nombres de usuario, grupos
max_log_file = 100             # MB por archivo de log
max_log_file_action = ROTATE   # qué hacer al llegar al límite
num_logs = 10                  # cuántos archivos rotar
space_left = 75                # MB libres antes de avisar
space_left_action = SYSLOG     # acción cuando el espacio es bajo
admin_space_left = 50          # MB críticos
admin_space_left_action = SUSPEND  # suspender auditoría si crítico
disk_full_action = SUSPEND
\`\`\`

\`\`\`bash
# Aplicar cambios de configuración
sudo systemctl reload auditd
# o con la señal HUP
sudo kill -HUP $(pidof auditd)
\`\`\`

### 📖 Anatomía de un registro de audit.log

\`\`\`text
type=SYSCALL msg=audit(1704067200.123:456): arch=c000003e syscall=2 success=yes exit=3 a0=7f3a1b2c3d40 a1=0 a2=1b6 a3=0 items=1 ppid=1234 pid=5678 auid=1000 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=pts0 ses=3 comm="cat" exe="/usr/bin/cat" subj=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023 key="access-sensitive"

type=CWD msg=audit(1704067200.123:456): cwd="/root"

type=PATH msg=audit(1704067200.123:456): item=0 name="/etc/shadow" inode=131073 dev=fd:00 mode=0100000 ouid=0 ogid=42 rdev=00:00 obj=system_u:object_r:shadow_t:s0 nametype=NORMAL cap_fp=0 cap_fi=0 cap_fe=0 cap_fver=0
\`\`\`

\`\`\`text
CAMPO           SIGNIFICADO
────────────────────────────────────────────────────
type=SYSCALL    tipo de registro (SYSCALL, PATH, CWD, USER_AUTH…)
msg=audit(...)  timestamp Unix y número de secuencia
syscall=2       número de llamada al sistema (2 = open)
success=yes     si la llamada tuvo éxito
auid=1000       UID de auditoría (usuario que hizo login original)
uid=0           UID efectivo al momento del evento
pid=5678        PID del proceso
comm="cat"      nombre del comando
exe="/usr/bin/cat" ruta absoluta del ejecutable
key="..."       etiqueta de la regla que disparó el evento
\`\`\`

### 📖 Primeros pasos: verificar que funciona

\`\`\`bash
# Ver las últimas líneas del log de auditoría
sudo tail -f /var/log/audit/audit.log

# Generar un evento de prueba
sudo touch /etc/test-audit-$$

# Buscar ese evento
sudo ausearch -f /etc/test-audit-*

# Limpiar
sudo rm /etc/test-audit-*
\`\`\`

### 📋 Lo que debes recordar

* auditd opera a nivel kernel — no puede ser silenciado por procesos de usuario aunque sean root.
* El campo \`auid\` (audit UID) mantiene la identidad del usuario original incluso tras \`sudo\` o \`su\`.
* El archivo de configuración principal es \`/etc/audit/auditd.conf\`; las reglas van en \`/etc/audit/rules.d/\`.
* Sin reglas activas, auditd solo captura eventos de login/logout — hay que agregar reglas para monitorear archivos y syscalls.

### 🧪 Autoevaluación

1. ¿Por qué el campo \`auid\` es más confiable que \`uid\` para identificar al actor de un evento?
2. ¿Qué sucede si el disco donde está \`/var/log/audit/\` se llena y \`disk_full_action = SUSPEND\`?
3. ¿Cuál es la diferencia entre \`auditctl\` y editar archivos en \`/etc/audit/rules.d/\`?

---

1. \`uid\` puede cambiar durante la sesión (con \`sudo\`, \`su\` o \`setuid\`). \`auid\` se establece en el momento del login y permanece asociado a todos los procesos descendientes, incluso si escalan privilegios. Es el identificador de la persona real detrás del teclado.
2. auditd suspende la escritura de nuevos eventos hasta que se libere espacio. Esto protege la integridad del log — es preferible perder eventos nuevos a corromper el log existente o continuar sin registrar en disco.
3. \`auditctl\` modifica las reglas del kernel en tiempo real pero no persiste entre reinicios. Los archivos en \`/etc/audit/rules.d/\` son cargados al arrancar por \`augenrules\` y sobreviven reinicios. En producción se usan ambos: \`rules.d/\` para persistencia y \`auditctl\` para debugging temporal.
`

export default content
