const content = `
## Módulo 2 — fail2ban: detección y bloqueo automático de ataques

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura de fail2ban: jails, filtros y acciones.
* Configurar el jail SSH con parámetros adecuados para producción.
* Crear jails y filtros personalizados para aplicaciones web.
* Gestionar IPs baneadas: listar, banear y desbanear manualmente.
* Probar filtros con \`fail2ban-regex\` antes de aplicarlos en producción.

### ❓ El problema real

Los logs de SSH muestran miles de intentos de login fallidos desde IPs de todo el mundo. Cada intento es una línea en \`/var/log/auth.log\`, pero ninguna acción automática los detiene. Si el atacante prueba suficientes contraseñas, tarde o temprano acierta. fail2ban convierte los logs de aplicación en una defensa activa: detecta patrones de ataque y bloquea las IPs ofensoras en tiempo real mediante el firewall del sistema.

### 📖 Arquitectura de fail2ban

\`\`\`diagram
{"type":"nested","container":{"title":"FAIL2BAN"},"items":[{"name":"JAIL","meta":"logpath, bantime, findtime, maxretry","icon":"lock"},{"name":"FILTER","meta":"failregex, ignoreregex (en filter.d)","icon":"search"},{"name":"ACTION","meta":"iptables, ufw, firewalld, sendmail","icon":"firewall"}],"external":[{"name":"Logs","meta":"auth.log, nginx/access.log, apache2/access.log…","icon":"log","side":"left"}]}
\`\`\`

**Componentes clave:**
- **Jail**: configuración de un servicio a proteger (qué log leer, thresholds, acción)
- **Filter**: expresiones regulares que identifican intentos fallidos en los logs
- **Action**: qué hacer cuando se supera el threshold (bloquear IP con iptables, notificar)

### 📖 Archivos de configuración

\`\`\`text
/etc/fail2ban/
├── fail2ban.conf        # Configuración global del daemon
├── jail.conf            # Jails predeterminadas (NO modificar directamente)
├── jail.local           # Overrides locales (SIEMPRE editar aquí)
├── filter.d/            # Definiciones de filtros (regex patterns)
│   ├── sshd.conf        # Filtro para SSH
│   ├── nginx-http-auth.conf
│   └── ...
└── action.d/            # Definiciones de acciones
    ├── iptables.conf
    ├── ufw.conf
    └── ...
\`\`\`

**Regla fundamental**: nunca editar \`jail.conf\`. Crear siempre \`jail.local\` con los overrides. Así las actualizaciones de paquetes no sobreescriben la configuración local.

### 📖 Configuración del jail SSH

\`\`\`ini
# /etc/fail2ban/jail.local

[DEFAULT]
# Tiempo de baneo en segundos (86400 = 24 horas)
bantime  = 86400

# Ventana de tiempo para contar intentos fallidos (10 minutos)
findtime = 600

# Número máximo de intentos antes de banear
maxretry = 5

# IPs que nunca se banean (localhost, red interna)
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24

# Acción por defecto (con notificación de IP de destino)
banaction = iptables-multiport

[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s
backend  = %(sshd_backend)s
maxretry = 3
bantime  = 3600
\`\`\`

**Parámetros críticos explicados:**

\`\`\`text
PARÁMETRO    DESCRIPCIÓN                              RECOMENDACIÓN PRODUCCIÓN
──────────────────────────────────────────────────────────────────────────────
bantime      Duración del baneo                       86400 (24h) o -1 (permanente)
findtime     Ventana de tiempo para contar intentos   600 (10 minutos)
maxretry     Intentos permitidos en findtime          3-5 para SSH
ignoreip     IPs exentas de baneo                    Siempre incluir IPs de administración
banaction    Mecanismo de bloqueo                     Según firewall del sistema
\`\`\`

### 📖 Gestión de fail2ban-client

\`\`\`bash
# Estado general
fail2ban-client status

# Estado de un jail específico
fail2ban-client status sshd

# Salida típica de "status sshd":
# Status for the jail: sshd
# |- Filter
# |  |- Currently failed: 2
# |  |- Total failed:     847
# |  \`- File list:       /var/log/auth.log
# \`- Actions
#    |- Currently banned: 3
#    |- Total banned:     89
#    \`- Banned IP list:   45.33.32.156 198.20.69.74 162.142.125.0

# Desbanear una IP manualmente
fail2ban-client set sshd unbanip 45.33.32.156

# Banear una IP manualmente
fail2ban-client set sshd banip 10.0.0.99

# Recargar configuración sin reiniciar
fail2ban-client reload

# Recargar un jail específico
fail2ban-client reload sshd

# Ver log de fail2ban
journalctl -u fail2ban -f
tail -f /var/log/fail2ban.log
\`\`\`

### 📖 Jail personalizado para nginx (flood de 404)

Proteger nginx contra escaneos de directorios y flood de peticiones erróneas:

\`\`\`bash
# Crear filtro personalizado
# /etc/fail2ban/filter.d/nginx-404.conf
cat > /etc/fail2ban/filter.d/nginx-404.conf << 'EOF'
[Definition]
failregex = ^<HOST> -.*"(GET|POST|HEAD).*" 404
ignoreregex =
EOF

# Agregar jail en jail.local
cat >> /etc/fail2ban/jail.local << 'EOF'

[nginx-404]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 20
findtime = 60
bantime  = 3600
filter   = nginx-404
EOF

# Recargar
fail2ban-client reload
\`\`\`

### 📖 Filtro para fallos de autenticación en aplicación web

\`\`\`bash
# Supongamos que la app escribe logs así:
# 2024-01-15 14:23:45 [WARN] Login failed for user 'admin' from 192.168.1.100
# /etc/fail2ban/filter.d/webapp-auth.conf

cat > /etc/fail2ban/filter.d/webapp-auth.conf << 'EOF'
[INCLUDES]
before = common.conf

[Definition]
_daemon = webapp

failregex = ^%(__prefix_line)s\[WARN\] Login failed for user '.*' from <HOST>\s*$
ignoreregex =
EOF

# Jail correspondiente en jail.local
cat >> /etc/fail2ban/jail.local << 'EOF'

[webapp-auth]
enabled  = true
port     = http,https
logpath  = /var/log/webapp/application.log
maxretry = 10
findtime = 300
bantime  = 7200
filter   = webapp-auth
EOF
\`\`\`

### 📖 Probar filtros con fail2ban-regex

Antes de activar un filtro en producción, verificar que las regex capturan correctamente las líneas de log:

\`\`\`bash
# Sintaxis: fail2ban-regex <logfile|log-line> <filter-file|regex>

# Probar contra el log real
fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf

# Salida esperada:
# Running tests
# =============
# Use   failregex filter file : sshd, basedir: /etc/fail2ban
# Use         log file : /var/log/auth.log
#
# Results
# =======
# Failregex: 847 total
#    Lines: 12453 total
#
# Ignore:   0 total

# Probar con una línea de log específica
fail2ban-regex "Jan 15 14:23:45 server sshd[1234]: Failed password for root from 10.0.0.1 port 54321 ssh2" \
  /etc/fail2ban/filter.d/sshd.conf

# Probar filtro personalizado
fail2ban-regex /var/log/nginx/access.log /etc/fail2ban/filter.d/nginx-404.conf
\`\`\`

### 📖 fail2ban con ufw y firewalld

\`\`\`ini
# Para sistemas con ufw (Ubuntu/Debian)
# /etc/fail2ban/jail.local
[DEFAULT]
banaction = ufw
banaction_allports = ufw

# Para sistemas con firewalld (RHEL/CentOS/Fedora)
[DEFAULT]
banaction = firewallcmd-ipset
\`\`\`

\`\`\`bash
# Verificar que el baneo se aplicó en iptables
iptables -L f2b-sshd -n --line-numbers

# Con ufw
ufw status numbered | grep DENY

# Con firewalld
firewall-cmd --list-rich-rules | grep fail2ban
\`\`\`

### 📋 Lo que debes recordar

* Siempre editar \`jail.local\`, nunca \`jail.conf\`.
* Los 3 parámetros críticos: \`bantime\` (duración), \`findtime\` (ventana), \`maxretry\` (umbral).
* \`fail2ban-client status sshd\` muestra IPs baneadas actuales y estadísticas.
* Probar filtros con \`fail2ban-regex\` antes de activarlos.
* Incluir siempre las IPs de administración en \`ignoreip\` para no auto-banearse.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`bantime = 3600\` y \`bantime = -1\`?
2. Un usuario legítimo fue baneado por error. ¿Qué comando usas para desbanearle?
3. ¿Por qué es importante ejecutar \`fail2ban-regex\` antes de activar un filtro personalizado?

---

1. \`bantime = 3600\` banea la IP por 3600 segundos (1 hora); pasado ese tiempo se desbloquea automáticamente. \`bantime = -1\` aplica un baneo permanente: la IP permanece bloqueada indefinidamente hasta desbanearla manualmente.
2. \`fail2ban-client set sshd unbanip <IP>\`. Es necesario conocer el jail donde fue baneada; usar \`fail2ban-client status sshd\` para confirmar la IP baneada primero.
3. Para verificar que la regex captura correctamente las líneas de log del servicio. Un filtro mal escrito puede no capturar ningún intento fallido (dejando el servicio desprotegido) o capturar líneas incorrectas (causando falsos positivos y baneos de usuarios legítimos).
`

export default content
