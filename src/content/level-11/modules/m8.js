const content = `
## Módulo 8 — Proyecto real: stack de monitoreo para un servidor de producción

### 🎯 Objetivos de aprendizaje

* Configurar un stack completo de observabilidad: logs persistentes, fail2ban activo, resúmenes automáticos y alertas.
* Diagnosticar problemas reales combinando \`journalctl\`, \`ss\`, \`lsof\` y \`strace\`.
* Construir y programar un script de health check del sistema.
* Dejar el stack verificable con comandos concretos, no solo "instalado".

### ❓ El problema real

Trabajas en el equipo de operaciones de una tienda online. El servidor de producción corre nginx, una aplicación Node.js y PostgreSQL. La semana pasada el sitio estuvo caído 40 minutos antes de que alguien lo notara — nadie estaba mirando logs ni recibiendo alertas. Tu tarea es dejar un sistema de monitoreo que detecte problemas antes de que los usuarios los reporten: logs que sobrevivan a un reinicio, bloqueo automático de intentos de fuerza bruta, un resumen diario legible, y un script de salud que corra solo cada 15 minutos.

### 📖 Estructura del proyecto

\`\`\`
monitoreo-produccion/
├── journald.conf
├── fail2ban/
│   └── jail.local
├── logwatch/
│   └── override.conf
├── health-check.sh
├── cron.d/health-check
└── logrotate.d/health-check
\`\`\`

### 📖 journald.conf — logs persistentes y estructurados

Por defecto journald guarda los logs en memoria y se pierden al reiniciar. Este archivo los hace persistentes en disco con límites razonables.

\`\`\`ini
# /etc/systemd/journald.conf
[Journal]
Storage=persistent
SystemMaxUse=2G
SystemKeepFree=500M
MaxRetentionSec=30days
RateLimitInterval=30s
RateLimitBurst=1000
\`\`\`

\`\`\`bash
sudo mkdir -p /var/log/journal
sudo chown root:systemd-journal /var/log/journal
sudo chmod 2755 /var/log/journal
sudo systemctl restart systemd-journald
\`\`\`

### 📖 fail2ban/jail.local — bloqueo automático de intentos maliciosos

\`\`\`ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8 ::1
# Reemplazar con la IP de administración real antes de activar:
# ignoreip = 127.0.0.1/8 ::1 TU.IP.AQUI

[sshd]
enabled  = true
maxretry = 3
bantime  = 86400     # 24 horas para SSH

[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log

[nginx-botsearch]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 2
\`\`\`

### 📖 logwatch/override.conf — resumen diario legible

\`\`\`ini
# /etc/logwatch/conf/override.conf
MailTo = ops@tienda.example
Detail = Med
Range = Yesterday
\`\`\`

### 📖 health-check.sh — snapshot del estado del sistema

\`\`\`bash
#!/bin/bash
# health-check.sh — snapshot del estado del sistema

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

ok()   { echo -e "  \${GREEN}[OK]\${NC}    $1"; }
warn() { echo -e "  \${YELLOW}[WARN]\${NC}  $1"; }
fail() { echo -e "  \${RED}[FAIL]\${NC}  $1"; }

echo "============================================"
echo " Health Check — $(hostname) — $(date '+%Y-%m-%d %H:%M')"
echo "============================================"
echo ""

# CPU Load
CPUS=$(nproc)
LOAD=$(awk '{print $1}' /proc/loadavg)
LOAD_INT=\${LOAD%.*}
if [ "$LOAD_INT" -lt "$CPUS" ]; then
    ok "CPU load: $LOAD (\${CPUS} CPUs)"
else
    warn "CPU load alto: $LOAD (\${CPUS} CPUs)"
fi

# Memoria disponible
AVAIL=$(awk '/MemAvailable/ {printf "%d", $2/1024}' /proc/meminfo)
TOTAL=$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo)
PCT=$(( AVAIL * 100 / TOTAL ))
if [ "$PCT" -gt 20 ]; then
    ok "Memoria disponible: \${AVAIL}MB / \${TOTAL}MB (\${PCT}% libre)"
else
    warn "Memoria baja: \${AVAIL}MB disponibles (\${PCT}% libre)"
fi

# Disco /
DISK_USE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USE" -lt 80 ]; then
    ok "Disco /: \${DISK_USE}% usado"
elif [ "$DISK_USE" -lt 90 ]; then
    warn "Disco /: \${DISK_USE}% usado"
else
    fail "Disco / CRITICO: \${DISK_USE}% usado"
fi

# Servicios críticos
echo ""
echo "Servicios:"
for svc in nginx postgresql sshd fail2ban; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
        ok "$svc activo"
    else
        fail "$svc INACTIVO"
    fi
done

# Conexiones activas
echo ""
echo "Red:"
ESTAB=$(ss -tn state established | wc -l)
LISTEN=$(ss -tln | wc -l)
ok "Conexiones establecidas: $((ESTAB-1))"
ok "Puertos en escucha: $((LISTEN-1))"

# fail2ban bans activos
if command -v fail2ban-client &>/dev/null; then
    BANS=$(fail2ban-client status sshd 2>/dev/null | grep "Banned IP" | awk '{print $NF}')
    if [ "$BANS" -gt 0 ]; then
        warn "fail2ban: $BANS IPs baneadas en sshd"
    else
        ok "fail2ban: sin bans activos en sshd"
    fi
fi

# Errores recientes en journal
ERRORS=$(journalctl -p err -b --since "1 hour ago" --no-pager -q 2>/dev/null | wc -l)
echo ""
if [ "$ERRORS" -eq 0 ]; then
    ok "Journal: sin errores en la última hora"
else
    warn "Journal: $ERRORS errores en la última hora"
    echo "  Ejecuta: journalctl -b -p err --since '1 hour ago'"
fi

echo ""
echo "============================================"
\`\`\`

### 📖 cron.d/health-check y logrotate.d/health-check — programación y rotación

\`\`\`text
# /etc/cron.d/health-check
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
*/15 * * * * root  /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1
\`\`\`

\`\`\`text
# /etc/logrotate.d/health-check
/var/log/health-check.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
\`\`\`

### 📖 Secuencia de ejecución

**Paso 1: activar logs persistentes**

\`\`\`bash
sudo cp journald.conf /etc/systemd/journald.conf
sudo mkdir -p /var/log/journal
sudo chown root:systemd-journal /var/log/journal
sudo chmod 2755 /var/log/journal
sudo systemctl restart systemd-journald
journalctl --disk-usage
\`\`\`

Salida esperada:

\`\`\`
Archived and active journals take up 24.0M in the file system.
\`\`\`

**Paso 2: instalar fail2ban**

\`\`\`bash
sudo apt install fail2ban
sudo cp fail2ban/jail.local /etc/fail2ban/jail.local
sudo systemctl enable --now fail2ban
sudo fail2ban-client status
\`\`\`

\`\`\`
Status
|- Number of jail:      3
\`- Jail list:   nginx-botsearch, nginx-http-auth, sshd
\`\`\`

**Paso 3: instalar logwatch y probar el resumen**

\`\`\`bash
sudo apt install logwatch mailutils
sudo cp logwatch/override.conf /etc/logwatch/conf/override.conf
sudo logwatch --output stdout --format text --range today --detail med
ls /etc/cron.daily/00logwatch
\`\`\`

**Paso 4: instalar y programar el health check**

\`\`\`bash
sudo cp health-check.sh /usr/local/bin/health-check.sh
sudo chmod +x /usr/local/bin/health-check.sh
sudo cp cron.d/health-check /etc/cron.d/health-check
sudo cp logrotate.d/health-check /etc/logrotate.d/health-check
health-check.sh
\`\`\`

**Paso 5: diagnosticar dos incidentes con el flujo journal → ss → lsof**

nginx no arranca tras un cambio de configuración:

\`\`\`bash
journalctl -u nginx -b -p err -n 20
nginx -t
ss -tlnp | grep :80
lsof -i :80
\`\`\`

El disco se llena pero \`du\` no explica por qué:

\`\`\`bash
df -h /
find /var/log -size +100M -ls
sudo lsof | grep "(deleted)" | awk '{print $1, $2, $7}' | sort -k3 -rn | head
\`\`\`

En ambos casos, un archivo borrado con un descriptor todavía abierto (\`lsof ... (deleted)\`) es la causa más común de espacio "fantasma" que \`du\` no reporta.

### 📋 Lo que debes recordar

* El flujo de diagnóstico es siempre: **journal → ss → lsof → strace** (de general a específico).
* Un disco lleno sin archivos grandes casi siempre es un proceso con un archivo borrado abierto — \`lsof | grep deleted\`.
* fail2ban sin \`ignoreip\` configurado con tu IP de administración es una trampa para bloquearte a ti mismo.
* \`Storage=persistent\` en journald es lo único que garantiza que los logs sobrevivan a un reinicio.
* Un health check ejecutado por cron crea un historial que ayuda a correlacionar cuándo empezó un problema.

### 🧪 Autoevaluación

1. El servidor se reinició por una actualización del kernel y \`journalctl -b -1\` no muestra nada del arranque anterior. ¿Qué configuración falta y dónde se corrige?
2. \`du -sh /var/log\` muestra 2GB, pero \`df -h /\` reporta el disco al 95%. ¿Qué comando usarías para encontrar la causa real y qué estás buscando exactamente?
3. Configuraste fail2ban con \`maxretry = 3\` en el jail \`sshd\` pero olvidaste agregar tu propia IP a \`ignoreip\`. ¿Qué puede pasar y cómo lo revertirías sin acceso SSH?

---

1. Falta \`Storage=persistent\` en \`/etc/systemd/journald.conf\` (por defecto es \`auto\`, que solo persiste si \`/var/log/journal\` ya existe). Se corrige creando el directorio con los permisos correctos y reiniciando \`systemd-journald\`.
2. \`sudo lsof | grep "(deleted)"\` — se busca un proceso que mantiene abierto un archivo ya borrado; el espacio no se libera hasta que el proceso cierra el descriptor o se reinicia, aunque el archivo ya no aparezca al hacer \`du\`.
3. Tras 3 intentos fallidos tu propia IP quedaría baneada 24 horas por el jail \`sshd\`. Sin acceso SSH, se revierte desde la consola física o la consola web del proveedor (fuera de banda) ejecutando \`fail2ban-client set sshd unbanip TU.IP\`, o editando \`jail.local\` para agregar la IP a \`ignoreip\` y reiniciando fail2ban.
`

export default content
