const content = `
## Módulo 3 — rsyslog: configuración, filtros y reenvío remoto

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura de rsyslog: inputs, filtros y outputs.
* Leer y escribir reglas de filtrado con selectores y propiedades.
* Configurar reenvío de logs a un servidor centralizado por TCP/TLS.
* Rotar logs correctamente con logrotate.

### ❓ El problema real

Gestionas 20 servidores. Cuando uno falla, tienes que conectarte por SSH a ese servidor específico, encontrar el log correcto entre decenas de archivos y buscar el error. Un servidor de logs centralizado cambia esto: todos los logs de todos los servidores llegan a un solo lugar. También resuelve otro problema: si el servidor que falla pierde acceso a disco, sus logs locales desaparecen. Los logs remotos sobreviven.

### 📖 Arquitectura de rsyslog

\`\`\`text
┌─────────────────────────────────────────────────────┐
│                    rsyslog                          │
│                                                     │
│  INPUTS          FILTROS/RULES       OUTPUTS        │
│  ────────        ──────────────      ──────────     │
│  imuxsock  ───▶  selector            omfile         │
│  imjournal ───▶  facility.severity   omfwd (red)    │
│  imtcp     ───▶  property-based      ommysql        │
│  imudp     ───▶  script (rainerscript) omrelp       │
│  imfile    ───▶                      omelasticsearch │
└─────────────────────────────────────────────────────┘
\`\`\`

rsyslog usa un lenguaje de configuración con dos sintaxis:
- **Legado** (compatible con syslog.conf): \`facility.severity /ruta/archivo\`
- **RainerScript** (moderno): bloques \`if/then\`, \`action()\`, más expresivo

### 📖 Archivos de configuración

\`\`\`text
/etc/rsyslog.conf          — configuración principal
/etc/rsyslog.d/*.conf      — archivos incluidos (orden alfabético)
\`\`\`

Ver la configuración activa:

\`\`\`bash
# Verificar sintaxis sin reiniciar
rsyslogd -N1

# Ver la versión
rsyslogd -v
\`\`\`

### 📖 Reglas básicas: selectores

\`\`\`bash
# /etc/rsyslog.conf — ejemplos de reglas

# Todos los errores del kernel al archivo kern.log
kern.err                    /var/log/kern.log

# Todos los mensajes de auth (y más graves) a auth.log
auth,authpriv.*             /var/log/auth.log

# Todo excepto debug y info a syslog
*.info;mail.none;authpriv.none;cron.none    /var/log/messages

# Mensajes de cron a cron.log
cron.*                      /var/log/cron.log

# Enviar TODOS los logs por UDP a servidor remoto
*.*                         @192.168.1.100:514

# TCP (más confiable que UDP)
*.*                         @@192.168.1.100:514
\`\`\`

La diferencia crítica: \`@\` = UDP, \`@@\` = TCP.

### 📖 Filtros por propiedad (RainerScript)

Los filtros de propiedad son más potentes que los selectores — pueden filtrar por el contenido del mensaje:

\`\`\`bash
# Si el mensaje contiene "error", guardar en archivo separado
:msg, contains, "error"     /var/log/errores-custom.log

# Si el programa es sshd
:programname, isequal, "sshd"   /var/log/ssh.log

# Si la IP de origen es de un rango específico (reenvío remoto)
:fromhost-ip, startswith, "192.168."   /var/log/red-interna.log

# Descartar mensajes de un proceso ruidoso
:programname, isequal, "named"   stop
\`\`\`

Operadores disponibles: \`contains\`, \`isequal\`, \`startswith\`, \`regex\`, \`ereregex\`.

### 📖 Configurar reenvío TLS a servidor centralizado

**En el cliente** (cada servidor que envía logs):

\`\`\`bash
# Instalar módulo TLS
sudo apt install rsyslog-gnutls     # Debian/Ubuntu
sudo dnf install rsyslog-gnutls     # RHEL/Fedora

# /etc/rsyslog.d/50-remote.conf
\`\`\`

\`\`\`text
# Cargar módulo TLS
module(load="imtls")

# Configurar conexión TLS
action(type="omfwd"
       target="logs.empresa.com"
       port="6514"
       protocol="tcp"
       StreamDriver="gtls"
       StreamDriverMode="1"
       StreamDriverAuthMode="x509/name"
       StreamDriverPermittedPeers="logs.empresa.com")
\`\`\`

**En el servidor** (receptor centralizado):

\`\`\`text
# /etc/rsyslog.d/00-receiver.conf

# Módulo de recepción TLS
module(load="imtls"
       StreamDriver.Name="gtls"
       StreamDriver.Mode="1"
       StreamDriver.Authmode="x509/name")

input(type="imtls"
      port="6514"
      ruleset="remote")

# Template para separar logs por host de origen
template(name="RemoteHost" type="string"
         string="/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log")

ruleset(name="remote") {
    action(type="omfile" DynaFile="RemoteHost")
}
\`\`\`

### 📖 logrotate: rotar logs para evitar discos llenos

\`\`\`bash
# Configuración por defecto
cat /etc/logrotate.conf

# Configuraciones por aplicación
ls /etc/logrotate.d/

# Forzar rotación manualmente (para testing)
sudo logrotate -f /etc/logrotate.d/nginx

# Simular sin ejecutar
sudo logrotate -d /etc/logrotate.conf
\`\`\`

Ejemplo de configuración para un log personalizado:

\`\`\`text
# /etc/logrotate.d/mi-app
/var/log/mi-app/*.log {
    daily           # rotar diariamente
    missingok       # no error si el archivo no existe
    rotate 14       # mantener 14 rotaciones
    compress        # comprimir con gzip
    delaycompress   # comprimir la rotación anterior, no la actual
    notifempty      # no rotar si está vacío
    sharedscripts   # ejecutar postrotate una sola vez
    postrotate
        systemctl reload mi-app 2>/dev/null || true
    endscript
}
\`\`\`

### 📋 Lo que debes recordar

* \`@@\` en rsyslog = TCP (usa esto en producción, no UDP que puede perder paquetes).
* Los filtros de propiedad (\`:msg, contains\`) son más potentes que los selectores de facility.
* Siempre verificar la sintaxis con \`rsyslogd -N1\` antes de reiniciar.
* logrotate + \`postrotate\` con \`systemctl reload\` es el patrón estándar para que el proceso abra el nuevo archivo de log tras la rotación.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`@servidor:514\` y \`@@servidor:514\` en rsyslog?
2. Quieres descartar todos los logs del proceso \`named\` para no llenar el disco. ¿Qué regla usas?
3. ¿Por qué logrotate necesita el \`postrotate\` con \`reload\` del servicio?

---

1. \`@\` usa **UDP** (sin confirmación de entrega, puede perder paquetes). \`@@\` usa **TCP** (con confirmación, más confiable). En producción siempre usa \`@@\`.
2. \`:programname, isequal, "named"   stop\` — la directiva \`stop\` descarta el mensaje y detiene su procesamiento.
3. Porque los procesos como nginx o rsyslog mantienen abierto el file descriptor del archivo de log original. Después de la rotación (que crea un nuevo archivo), el proceso sigue escribiendo en el inode antiguo (ya renombrado). El \`reload\` cierra y reabre el archivo, apuntando ahora al nuevo.
`

export default content
