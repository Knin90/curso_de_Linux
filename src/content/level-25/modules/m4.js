const content = `
## Módulo 4 — Análisis de logs: correlación y detección de anomalías

### 🎯 Objetivos de aprendizaje

* Identificar los logs más relevantes para la detección de intrusiones en Linux.
* Extraer patrones de ataque SSH desde \`/var/log/auth.log\` y \`/var/log/secure\`.
* Usar \`journalctl\`, \`last\`, \`lastb\` y \`utmpdump\` para análisis de sesiones.
* Detectar actividad sospechosa de sudo y cron en los logs.
* Configurar logging centralizado con rsyslog para consolidar logs de múltiples servidores.

### ❓ El problema real

Un analista revisa los logs del servidor a las 9 AM y descubre que alguien se conectó por SSH a las 3 AM, ejecutó varios comandos con sudo y cerró sesión. ¿Era un administrador haciendo mantenimiento o un atacante? Sin contexto de correlación — quién se conectó, desde dónde, qué comandos ejecutó, cuánto tiempo duró la sesión — es imposible determinarlo. El análisis de logs no es leer líneas aisladas: es correlacionar eventos en el tiempo para reconstruir lo que ocurrió.

### 📖 Mapa de logs relevantes para seguridad

\`\`\`text
LOG                         CONTENIDO                         SISTEMA
─────────────────────────────────────────────────────────────────────────────
/var/log/auth.log           Auth, SSH, sudo, su               Debian/Ubuntu
/var/log/secure             Auth, SSH, sudo, su               RHEL/CentOS/Fedora
/var/log/syslog             Mensajes generales del sistema    Debian/Ubuntu
/var/log/messages           Mensajes generales del sistema    RHEL/CentOS
/var/log/kern.log           Mensajes del kernel               Debian/Ubuntu
/var/log/audit/audit.log    Auditoría del kernel (auditd)     Ambos
/var/log/wtmp               Historial de logins (binario)     Ambos (comando: last)
/var/log/btmp               Intentos fallidos (binario)       Ambos (comando: lastb)
/var/log/lastlog            Último login por usuario (bin.)   Ambos (comando: lastlog)
/var/log/cron               Actividad de cron                 RHEL/CentOS
/var/log/nginx/             Access y error logs de nginx      Si está instalado
/var/log/apache2/           Access y error logs de Apache     Si está instalado
\`\`\`

### 📖 Análisis de SSH: intentos de brute force

\`\`\`bash
# Ver intentos fallidos de SSH en tiempo real
tail -f /var/log/auth.log | grep "Failed password"

# Ejemplo de líneas de ataque:
# Jan 15 03:12:45 server sshd[1234]: Failed password for root from 185.220.101.1 port 54321 ssh2
# Jan 15 03:12:46 server sshd[1235]: Failed password for root from 185.220.101.1 port 54322 ssh2
# Jan 15 03:12:47 server sshd[1236]: Failed password for invalid user admin from 185.220.101.1 port 54323 ssh2

# Contar intentos por IP (Top 10 atacantes)
grep "Failed password" /var/log/auth.log | \
  grep -oP 'from \K[0-9.]+' | \
  sort | uniq -c | sort -rn | head -10

# Ejemplo de salida:
#   8423 185.220.101.1
#   6721 45.83.64.1
#   4102 193.32.162.1

# Usuarios más atacados
grep "Failed password" /var/log/auth.log | \
  grep -oP 'for (invalid user )?\K\w+' | \
  sort | uniq -c | sort -rn | head -10

# Logins exitosos (señal de alerta si el horario es inusual)
grep "Accepted password\|Accepted publickey" /var/log/auth.log

# Ejemplo de login exitoso:
# Jan 15 03:47:23 server sshd[2341]: Accepted password for deploy from 185.220.101.1 port 54400 ssh2

# Con journalctl (sistemas con systemd)
journalctl -u ssh --since "2024-01-15 00:00:00" --until "2024-01-15 06:00:00"
journalctl -u sshd -p warning --since "yesterday"
\`\`\`

### 📖 Historial de sesiones con last y lastb

\`\`\`bash
# Últimas sesiones exitosas (lee /var/log/wtmp)
last -n 20

# Salida típica:
# usuario  pts/0   192.168.1.100   Mon Jan 15 03:47 - 04:23  (00:35)
# root     pts/1   185.220.101.1   Mon Jan 15 03:47 - 04:23  (00:35)  ← SOSPECHOSO
# deploy   pts/0   10.0.1.5        Mon Jan 15 09:00   still logged in

# Últimas sesiones fallidas (lee /var/log/btmp) — requiere root
lastb -n 20

# Salida típica:
# root     ssh:notty  185.220.101.1   Mon Jan 15 03:12 - 03:12  (00:00)
# root     ssh:notty  185.220.101.1   Mon Jan 15 03:12 - 03:12  (00:00)
# admin    ssh:notty  185.220.101.1   Mon Jan 15 03:12 - 03:12  (00:00)

# Contar intentos fallidos por IP en btmp
lastb | awk '{print \$3}' | sort | uniq -c | sort -rn | head -10

# Último login de cada usuario
lastlog

# Salida típica:
# Username         Port     From             Latest
# root             pts/1    185.220.101.1    Mon Jan 15 03:47:23 +0000 2024  ← verificar
# deploy           pts/0    10.0.1.5         Mon Jan 15 09:00:15 +0000 2024

# Inspeccionar wtmp/btmp en detalle (formato legible)
utmpdump /var/log/wtmp | tail -20
utmpdump /var/log/btmp | grep "185.220.101.1"
\`\`\`

### 📖 Detectar actividad sospechosa de sudo

\`\`\`bash
# Todo uso de sudo queda registrado en auth.log
grep sudo /var/log/auth.log | tail -30

# Ejemplo de líneas de sudo:
# Jan 15 03:49:12 server sudo: deploy: TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
# Jan 15 03:50:01 server sudo: deploy: TTY=pts/0 ; PWD=/root ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow

# Señales de alerta en sudo:
# 1. COMMAND=/bin/bash (shell interactivo como root)
# 2. Comandos ejecutados en horas inusuales
# 3. Usuario que normalmente no usa sudo
# 4. COMMAND=/usr/bin/cat /etc/shadow (acceso a hashes de contraseñas)

# Filtrar solo los comandos ejecutados con sudo
grep "sudo:" /var/log/auth.log | grep "COMMAND=" | \
  awk -F'COMMAND=' '{print \$2}' | sort | uniq -c | sort -rn

# Intentos fallidos de sudo (contraseña incorrecta o no autorizado)
grep "sudo:" /var/log/auth.log | grep -i "incorrect password\|not in sudoers"
\`\`\`

### 📖 Detectar cambios en crontabs

\`\`\`bash
# En sistemas con auditd (ver nivel 23): buscar escrituras en archivos de cron
ausearch -f /etc/cron.d -f /var/spool/cron --start today

# Sin auditd: monitorear con inotifywait
inotifywait -m -r /etc/cron.d /var/spool/cron -e create -e modify 2>/dev/null &

# Ver todos los crontabs del sistema
# Cron del sistema:
cat /etc/crontab
ls -la /etc/cron.d/
ls -la /etc/cron.hourly/ /etc/cron.daily/ /etc/cron.weekly/ /etc/cron.monthly/

# Crontabs de usuarios
for user in \$(cut -f1 -d: /etc/passwd); do
    CRON=\$(crontab -u "\$user" -l 2>/dev/null)
    if [ -n "\$CRON" ]; then
        echo "=== Crontab de \$user ==="
        echo "\$CRON"
    fi
done

# Buscar crontabs sospechosos (reverse shells, descargas)
grep -r "bash -i\|/dev/tcp\|curl\|wget\|nc " /etc/cron* /var/spool/cron/ 2>/dev/null
\`\`\`

### 📖 Análisis de logs web con GoAccess

\`\`\`bash
# Instalar GoAccess
apt install goaccess   # Debian/Ubuntu
dnf install goaccess   # RHEL/Fedora

# Análisis en tiempo real del log de nginx
goaccess /var/log/nginx/access.log --log-format=COMBINED -o /var/www/html/report.html

# Analizar en terminal (modo interactivo)
goaccess /var/log/nginx/access.log --log-format=COMBINED

# Detectar patrones de ataque en logs web
# - Códigos 4xx excesivos (escaneo de directorios)
# - User-agents de scanners (sqlmap, nikto, nmap)
# - Peticiones a archivos sensibles (.env, .git, wp-config.php)

grep -E '"(GET|POST) .*\.(env|git|bak|sql|conf)' /var/log/nginx/access.log
grep -E '"status": "4[0-9]{2}"' /var/log/nginx/access.log | \
  awk '{print \$1}' | sort | uniq -c | sort -rn | head -10

# IPs con más errores 404 (posible escaneo)
awk '\$9 == 404 {print \$1}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -10
\`\`\`

### 📖 Logging centralizado con rsyslog

\`\`\`bash
# Servidor central de logs (recibe logs de múltiples hosts)
# /etc/rsyslog.conf en el servidor central

# Habilitar recepción UDP (puerto 514) y TCP
module(load="imudp")
input(type="imudp" port="514")
module(load="imtcp")
input(type="imtcp" port="514")

# Organizar logs por host
\$template RemoteLogs,"/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log"
*.* ?RemoteLogs

# En cada cliente (host a monitorear):
# /etc/rsyslog.conf o /etc/rsyslog.d/99-remote.conf
# Enviar todos los logs al servidor central por TCP
*.* @@logserver.empresa.com:514

# Reiniciar rsyslog
systemctl restart rsyslog

# Verificar que el servidor recibe logs
tail -f /var/log/remote/web-server-01/sshd.log
\`\`\`

### 📋 Lo que debes recordar

* En Debian/Ubuntu: \`/var/log/auth.log\`; en RHEL/CentOS: \`/var/log/secure\`.
* \`last\` (logins exitosos) y \`lastb\` (intentos fallidos) son las primeras herramientas a revisar.
* Un login exitoso de root desde una IP externa en horas inusuales es señal crítica.
* Todo comando ejecutado con sudo queda registrado con el timestamp exacto.
* El logging centralizado garantiza que los atacantes no puedan borrar sus huellas en un servidor comprometido.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`last\` y \`lastb\`, y qué archivos leen respectivamente?
2. Un login exitoso aparece en auth.log: \`Accepted password for deploy from 185.220.101.1\`. ¿Qué otros logs revisarías inmediatamente para determinar si es un compromiso?
3. ¿Por qué el logging centralizado es crítico para la respuesta a incidentes?

---

1. \`last\` muestra el historial de logins exitosos y lee \`/var/log/wtmp\`. \`lastb\` muestra los intentos de login fallidos y lee \`/var/log/btmp\`. Ambos archivos son binarios; no se pueden leer directamente con \`cat\`.
2. Revisar inmediatamente: (a) \`lastb\` para ver si hubo intentos fallidos previos desde esa IP (brute force exitoso), (b) \`journalctl -u ssh\` para ver toda la sesión SSH, (c) \`grep "deploy" /var/log/auth.log | grep sudo\` para ver qué comandos ejecutó con privilegios, (d) bash history del usuario deploy (\`~deploy/.bash_history\`), (e) \`ss -tnp\` para conexiones activas si la sesión sigue abierta.
3. Porque cuando un atacante compromete un sistema, uno de sus primeros objetivos es borrar sus huellas eliminando o modificando los logs locales. Con logging centralizado, los logs ya fueron enviados al servidor central antes de que el atacante pudiera borrarlos. El servidor central, al que el atacante probablemente no tiene acceso, conserva la evidencia intacta.
`

export default content
