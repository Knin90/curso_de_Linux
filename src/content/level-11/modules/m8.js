const content = `
## Módulo 8 — Laboratorio integrado: sistema de monitoreo end-to-end

### 🎯 Objetivos de aprendizaje

* Configurar un stack completo de monitoreo: logs persistentes, fail2ban activo, alertas por email.
* Diagnosticar problemas reales combinando journalctl, ss, lsof y strace.
* Crear un script de health check del sistema.
* Construir un dashboard básico de estado en terminal.

### 📖 Escenario del laboratorio

Servidor de producción con:
- nginx sirviendo una aplicación web
- PostgreSQL como base de datos
- SSH para administración
- Firewall con iptables (Nivel 10)

Objetivo: sistema de monitoreo completo que detecte problemas antes de que los usuarios los reporten.

### 📖 Paso 1: logs persistentes y estructurados

\`\`\`bash
# 1.1 Habilitar persistencia de journald
sudo mkdir -p /var/log/journal
sudo chown root:systemd-journal /var/log/journal
sudo chmod 2755 /var/log/journal
sudo systemctl restart systemd-journald

# Verificar
journalctl --disk-usage

# 1.2 Configurar journald
sudo nano /etc/systemd/journald.conf
\`\`\`

\`\`\`ini
[Journal]
Storage=persistent
SystemMaxUse=2G
SystemKeepFree=500M
MaxRetentionSec=30days
RateLimitInterval=30s
RateLimitBurst=1000
\`\`\`

\`\`\`bash
sudo systemctl restart systemd-journald

# 1.3 Verificar rsyslog divide logs por servicio
ls /var/log/ | grep -E "nginx|postgres|auth|syslog"
\`\`\`

### 📖 Paso 2: fail2ban con múltiples jails

\`\`\`bash
sudo apt install fail2ban

# Crear configuración unificada
sudo nano /etc/fail2ban/jail.local
\`\`\`

\`\`\`ini
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8 ::1
# Cambiar por tu IP de administración:
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

\`\`\`bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status
\`\`\`

### 📖 Paso 3: logwatch para resúmenes diarios

\`\`\`bash
sudo apt install logwatch mailutils

# Probar el resumen
sudo logwatch --output stdout --format text --range today --detail med

# Configurar email
sudo nano /etc/logwatch/conf/override.conf
\`\`\`

\`\`\`ini
MailTo = tu@email.com
Detail = Med
Range = Yesterday
\`\`\`

\`\`\`bash
# Verificar que el cron diario existe
ls /etc/cron.daily/00logwatch
\`\`\`

### 📖 Paso 4: script de health check

\`\`\`bash
sudo nano /usr/local/bin/health-check.sh
\`\`\`

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

\`\`\`bash
sudo chmod +x /usr/local/bin/health-check.sh

# Ejecutar
health-check.sh
\`\`\`

### 📖 Paso 5: casos de diagnóstico combinado

**Caso A: nginx no inicia tras cambio de configuración**

\`\`\`bash
# 1. Ver el error exacto del servicio
journalctl -u nginx -b -p err -n 20

# 2. Validar configuración de nginx
nginx -t

# 3. Si el error es "bind: address already in use"
ss -tlnp | grep :80
lsof -i :80
# → matar o reiniciar el proceso que tiene el puerto ocupado
\`\`\`

**Caso B: disco lleno pero du no explica por qué**

\`\`\`bash
# 1. Ver uso real de disco
df -h /

# 2. Buscar archivos grandes en /var/log
find /var/log -size +100M -ls

# 3. Buscar archivos borrados pero con file descriptors abiertos
sudo lsof | grep "(deleted)" | awk '{print $1, $2, $7}' | sort -k3 -rn | head

# 4. Reiniciar el proceso identificado
sudo systemctl restart <servicio>
\`\`\`

**Caso C: servicio tarda mucho en responder**

\`\`\`bash
# 1. Ver si hay I/O wait alto
vmstat 2 5 | awk '{print $16}'   # columna wa

# 2. Identificar procesos con I/O
iostat -x 2 3

# 3. Ver qué archivos lee/escribe el proceso lento
sudo lsof -p <PID> | grep REG

# 4. Trazar syscalls de I/O
sudo strace -p <PID> -e trace=read,write,pread,pwrite -c
\`\`\`

### 📖 Paso 6: cron para health check automático

\`\`\`bash
# Ejecutar health check cada 15 minutos y guardar en log
sudo crontab -e
\`\`\`

\`\`\`text
*/15 * * * * /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1
\`\`\`

\`\`\`bash
# Rotar el log del health check
sudo nano /etc/logrotate.d/health-check
\`\`\`

\`\`\`text
/var/log/health-check.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
\`\`\`

### 📋 Lo que debes recordar

* El flujo de diagnóstico es siempre: **journal → ss → lsof → strace** (de general a específico).
* Un disco lleno sin archivos grandes casi siempre es un proceso con un archivo borrado abierto — \`lsof | grep deleted\`.
* fail2ban sin \`ignoreip\` configurado con tu IP de administración es una trampa para bloquearte a ti mismo.
* Un script de health check ejecutado por cron crea un historial que ayuda a correlacionar cuándo empezó un problema.

### 🧪 Ejercicio de cierre

Configura en tu servidor (real o VM) el stack completo del laboratorio:

1. Habilitar logs persistentes de journald
2. Activar fail2ban con jail de sshd (maxretry=3)
3. Crear el script health-check.sh y ejecutarlo
4. Simular un "disco lleno" creando un archivo grande con \`dd if=/dev/zero of=/tmp/big bs=1M count=500\`, luego borrarlo y verificar que \`lsof\` lo detecta
5. Verificar que \`ss -tlnp\` muestra todos los servicios en escucha

Este ejercicio integra el 80% de las habilidades de este nivel en un flujo de trabajo real.
`

export default content
