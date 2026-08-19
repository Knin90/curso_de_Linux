const content = `
## Módulo 6 — Alertas automáticas: logwatch y fail2ban

### 🎯 Objetivos de aprendizaje

* Configurar logwatch para recibir resúmenes diarios del sistema.
* Entender cómo fail2ban detecta y bloquea ataques automáticamente.
* Crear jails personalizadas en fail2ban para proteger servicios propios.
* Diagnosticar y gestionar bans activos en fail2ban.

### ❓ El problema real

Tienes 5 servidores en producción. Nadie los mira activamente. Un servidor recibe 10.000 intentos de login SSH por día — nadie lo sabe porque nadie lee los logs. Otro servidor tiene un disco llenándose lentamente — tampoco hay alarma. Dos herramientas resuelven esto: **logwatch** te envía un resumen diario por email, **fail2ban** detecta patrones de ataque en los logs y bloquea IPs automáticamente.

### 📖 logwatch: resúmenes automáticos de logs

logwatch analiza los logs del sistema diariamente y envía un resumen por email.

\`\`\`bash
# Instalar
sudo apt install logwatch            # Debian/Ubuntu
sudo dnf install logwatch            # RHEL/Fedora

# Ejecutar manualmente para ver el output
sudo logwatch --output stdout --format text --range today

# Con detalle alto
sudo logwatch --output stdout --detail high --range yesterday
\`\`\`

**Configuración:** \`/etc/logwatch/conf/logwatch.conf\` (o crear \`/etc/logwatch/conf/override.conf\`):

\`\`\`ini
# /etc/logwatch/conf/override.conf
MailTo = admin@empresa.com
MailFrom = logwatch@servidor01.empresa.com
Detail = Med          # Low | Med | High
Range = Yesterday     # All | Today | Yesterday
Format = text         # text | html
\`\`\`

logwatch instala un cron job en \`/etc/cron.daily/00logwatch\` que se ejecuta automáticamente cada noche.

**Servicios que logwatch analiza por defecto:**
- SSH (logins exitosos y fallidos)
- sudo (escaladas de privilegios)
- httpd/nginx
- postfix/sendmail
- kernel (errores del sistema)
- cron
- disk space

### 📖 fail2ban: bloqueo automático de ataques

fail2ban monitorea archivos de log y bloquea IPs que muestran comportamiento malicioso (múltiples fallos de autenticación, escaneos, etc.).

\`\`\`diagram
{"type":"nested","container":{"title":"fail2ban","meta":"Jail = log + filtro + acción + thresholds"},"items":[{"name":"Lee logs","meta":"/var/log/auth.log, /var/log/nginx/error.log, etc.","icon":"log"},{"name":"Detecta patrón","meta":"filtro / regex de ataque","icon":"search"},{"name":"Ban IP","meta":"iptables / nftables DROP","icon":"firewall","focal":true}],"external":[{"name":"Logs del sistema","icon":"log","side":"left"},{"name":"iptables / nftables","icon":"firewall","side":"right"}]}
\`\`\`

\`\`\`bash
# Instalar
sudo apt install fail2ban

# Estado del servicio
sudo systemctl status fail2ban

# Ver todas las jails activas
sudo fail2ban-client status

# Estado detallado de una jail
sudo fail2ban-client status sshd
\`\`\`

### 📖 Conceptos de fail2ban

\`\`\`text
JAIL      — conjunto de reglas para un servicio específico
            Ej: [sshd], [nginx-http-auth], [postfix]

FILTER    — expresión regular que detecta el patrón de ataque
            en el archivo de log

ACTION    — qué hacer cuando se detecta el ataque
            Ej: bloquear con iptables, enviar email

maxretry  — número de fallos antes de banear
findtime  — ventana de tiempo para contar fallos (segundos)
bantime   — duración del ban (segundos; -1 = permanente)
\`\`\`

### 📖 Configuración de fail2ban

**Nunca editar \`/etc/fail2ban/jail.conf\`** — se sobreescribe al actualizar. Crear overrides en \`/etc/fail2ban/jail.local\`:

\`\`\`ini
# /etc/fail2ban/jail.local

[DEFAULT]
bantime  = 3600        # ban de 1 hora
findtime = 600         # ventana de 10 minutos
maxretry = 5           # 5 fallos = ban

# Nunca banear estas IPs (tu IP de gestión)
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24

# Acción de ban (iptables por defecto)
banaction = iptables-multiport


[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s
backend  = %(sshd_backend)s
maxretry = 3           # SSH es más sensible: solo 3 intentos


[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log


[nginx-limit-req]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 10
\`\`\`

Aplicar cambios:

\`\`\`bash
sudo systemctl reload fail2ban
# o
sudo fail2ban-client reload
\`\`\`

### 📖 Gestión de bans

\`\`\`bash
# Ver IPs baneadas en sshd
sudo fail2ban-client status sshd

# Banear manualmente una IP
sudo fail2ban-client set sshd banip 1.2.3.4

# Desbanear una IP
sudo fail2ban-client set sshd unbanip 1.2.3.4

# Ver log de fail2ban
sudo tail -f /var/log/fail2ban.log

# Probar si un filtro detecta correctamente un log
sudo fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf
\`\`\`

### 📖 Jail personalizada para una aplicación propia

Si tu aplicación escribe logs con líneas como:
\`\`\`
2024-01-15 14:23:01 ERROR Login failed for user 'admin' from 45.77.123.45
\`\`\`

\`\`\`bash
# 1. Crear el filtro
sudo nano /etc/fail2ban/filter.d/mi-app.conf
\`\`\`

\`\`\`ini
[Definition]
failregex = ERROR Login failed for user .+ from <HOST>
ignoreregex =
\`\`\`

\`\`\`bash
# 2. Crear la jail
sudo nano /etc/fail2ban/jail.d/mi-app.conf
\`\`\`

\`\`\`ini
[mi-app]
enabled  = true
port     = 8080
logpath  = /var/log/mi-app/app.log
filter   = mi-app
maxretry = 5
bantime  = 7200
\`\`\`

\`\`\`bash
# 3. Probar el filtro
sudo fail2ban-regex /var/log/mi-app/app.log /etc/fail2ban/filter.d/mi-app.conf

# 4. Recargar
sudo fail2ban-client reload
sudo fail2ban-client status mi-app
\`\`\`

### 📋 Lo que debes recordar

* Nunca editar \`jail.conf\` — siempre usar \`jail.local\` o archivos en \`jail.d/\`.
* Siempre agregar tu IP a \`ignoreip\` antes de activar fail2ban en SSH — si te bloqueas a ti mismo necesitarás acceso físico o consola.
* \`fail2ban-regex\` es tu mejor aliado para verificar que el filtro funciona antes de activarlo en producción.
* logwatch complementa a fail2ban: uno bloquea en tiempo real, el otro te da la visión histórica.

### 🧪 Autoevaluación

1. ¿Por qué es peligroso activar fail2ban en SSH sin configurar \`ignoreip\`?
2. ¿Qué herramienta usas para probar que un filtro de fail2ban detecta correctamente los eventos en un archivo de log?
3. fail2ban baneó tu propia IP por error. ¿Cómo la desbaneas sin reiniciar el servicio?

---

1. Porque si cometes un error de tipeo o pruebas tu propia autenticación varias veces, **fail2ban baneará tu propia IP** y perderás acceso SSH al servidor. Necesitarías acceso físico, consola de emergencia (como KVM, iDRAC, o el panel de tu proveedor cloud) para entrar.
2. \`sudo fail2ban-regex <archivo-de-log> <ruta-al-filtro>\` — ejecuta la expresión regular del filtro contra el log real y muestra cuántas líneas coinciden. Esencial antes de activar cualquier filtro personalizado.
3. \`sudo fail2ban-client set <jail> unbanip <IP>\` — desbanea la IP en esa jail inmediatamente, sin reiniciar fail2ban ni perder ningún otro ban activo.
`

export default content
