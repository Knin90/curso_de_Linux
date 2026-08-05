const content = `
## Módulo 2 — crontab: gestión de trabajos por usuario y sistema

### 🎯 Objetivos de aprendizaje

* Crear, editar, listar y eliminar crontabs de usuario y sistema.
* Entender los directorios de cron del sistema (/etc/cron.d, cron.daily, etc.).
* Controlar qué usuarios pueden usar cron con allow/deny.
* Ver el log de ejecución de cron jobs.

### ❓ El problema real

Instalas un script de backup en cron. Tres meses después, el servidor tiene 12 cron jobs de 4 usuarios diferentes, algunos duplicados, algunos que nunca funcionaron. Sin un método de gestión claro, los cron jobs se acumulan, se solapan y nadie sabe cuáles están activos. Este módulo establece las prácticas correctas.

### 📖 Comandos básicos de crontab

\`\`\`bash
# Editar el crontab del usuario actual
crontab -e

# Listar el crontab del usuario actual
crontab -l

# Eliminar el crontab del usuario actual (¡sin confirmación!)
crontab -r

# Como root: gestionar crontab de otro usuario
crontab -e -u www-data    # editar el crontab de www-data
crontab -l -u postgres    # listar el crontab de postgres
crontab -r -u deploy      # eliminar el crontab de deploy
\`\`\`

### 📖 Crear un crontab completo

\`\`\`bash
crontab -e
\`\`\`

\`\`\`text
# Crontab de usuario: deploy
# Actualizado: 2024-01-15

# ─── Entorno ───────────────────────────────────────────────
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=ops@empresa.com
HOME=/home/deploy

# ─── Backups ───────────────────────────────────────────────
# Backup diario a las 2:00 AM
0 2 * * *   /usr/local/bin/backup-db.sh >> /var/log/backup.log 2>&1

# Backup semanal completo los domingos a las 3:00 AM
0 3 * * 0   /usr/local/bin/backup-full.sh >> /var/log/backup-full.log 2>&1

# ─── Mantenimiento ─────────────────────────────────────────
# Limpiar archivos temporales cada día a las 4:00 AM
0 4 * * *   find /tmp -name "*.tmp" -mtime +1 -delete

# Rotar logs cada semana
0 1 * * 0   /usr/local/bin/rotate-logs.sh

# ─── Monitoreo ─────────────────────────────────────────────
# Health check cada 5 minutos
*/5 * * * * /usr/local/bin/health-check.sh > /dev/null 2>&1
\`\`\`

### 📖 /etc/cron.d — para paquetes y admins

Los paquetes del sistema instalan sus crontabs en \`/etc/cron.d/\`. Cada archivo es un crontab con formato de \`/etc/crontab\` (incluye usuario):

\`\`\`bash
ls /etc/cron.d/
# certbot  php8.1  sysstat  logrotate

cat /etc/cron.d/sysstat
\`\`\`

\`\`\`text
# /etc/cron.d/sysstat — instalado por el paquete sysstat
5-55/10 * * * * root command -v debian-sa1 > /dev/null && debian-sa1 1 1
\`\`\`

Crear un crontab de sistema para tu aplicación:

\`\`\`bash
sudo nano /etc/cron.d/mi-app
\`\`\`

\`\`\`text
# /etc/cron.d/mi-app
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=ops@empresa.com

# Backup diario
0 2 * * *  root  /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Limpieza de sesiones expiradas
*/30 * * * *  www-data  /usr/local/bin/cleanup-sessions.sh
\`\`\`

\`\`\`bash
# Los permisos deben ser 0644 (no ejecutable)
sudo chmod 0644 /etc/cron.d/mi-app
\`\`\`

### 📖 /etc/cron.daily, weekly, monthly, hourly

Para scripts que solo necesitan "ejecutar una vez al día/semana/mes" sin hora específica, esta es la forma más simple:

\`\`\`bash
# Instalar script de backup como tarea diaria
sudo cp /usr/local/bin/backup.sh /etc/cron.daily/backup
sudo chmod 755 /etc/cron.daily/backup

# Verificar qué scripts están instalados
ls -la /etc/cron.daily/
ls -la /etc/cron.weekly/

# Ejecutar manualmente todos los cron.daily (para testing)
sudo run-parts /etc/cron.daily
# O ejecutar solo uno:
sudo run-parts --test /etc/cron.daily    # muestra qué se ejecutaría
sudo run-parts /etc/cron.daily --arg backup  # solo el script "backup"
\`\`\`

**Notas sobre /etc/cron.daily:**
- La hora exacta la controla \`/etc/crontab\` (normalmente entre 6:00 y 7:00 AM)
- Los scripts NO deben tener extensión (cron.daily ignora \`backup.sh\`, requiere \`backup\`)
- Deben ser ejecutables: \`chmod 755\`

### 📖 Control de acceso: allow y deny

\`\`\`bash
# /etc/cron.allow — lista blanca: SOLO estos usuarios pueden usar cron
# Si existe este archivo, solo los usuarios listados (uno por línea) pueden usar cron

# /etc/cron.deny — lista negra: estos usuarios NO pueden usar cron
# Si existe este archivo (y cron.allow no), todos excepto los listados pueden usar cron

# Lógica:
# cron.allow existe → solo usuarios en allow pueden usar cron
# cron.allow no existe, cron.deny existe → todos menos los de deny
# Ninguno existe → todos pueden (o solo root, depende de la distro)

# Ver si existe alguno
ls /etc/cron.allow /etc/cron.deny 2>/dev/null
\`\`\`

### 📖 Ver logs de ejecución de cron

\`\`\`bash
# Debian/Ubuntu: logs en syslog
grep CRON /var/log/syslog | tail -20

# Con journalctl
journalctl -u cron -b
journalctl -u cron --since "1 hour ago"

# RHEL/Fedora
journalctl -u crond -b

# Ver el log de un cron job específico (si redirige a archivo)
tail -f /var/log/backup.log
\`\`\`

Ejemplo de entrada en el log:

\`\`\`text
Jan 15 02:00:01 servidor CRON[12345]: (deploy) CMD (/usr/local/bin/backup-db.sh >> /var/log/backup.log 2>&1)
Jan 15 02:00:03 servidor CRON[12345]: (CRON) info (No MTA installed, discarding output)
\`\`\`

El mensaje "No MTA installed" aparece cuando el cron job produce output y no hay servidor de email configurado. Resolución: redirigir output a archivo (\`>> log 2>&1\`) o configurar \`MAILTO=""\` para silenciarlo.

### 📋 Lo que debes recordar

* Los scripts en \`/etc/cron.daily/\` no deben tener extensión \`.sh\` — \`run-parts\` los ignora.
* Siempre redirigir output (\`>> log 2>&1\`) para evitar el mensaje "No MTA installed".
* \`/etc/cron.d/\` es para crontabs de sistema con campo usuario; mejor que editar \`/etc/crontab\` directamente.
* \`crontab -r\` elimina TODO el crontab sin confirmar — si quieres limpiar un job, usa \`crontab -e\`.

### 🧪 Autoevaluación

1. ¿Por qué los scripts en \`/etc/cron.daily/\` no deben tener extensión \`.sh\`?
2. ¿Qué diferencia hay entre \`/etc/cron.d/mi-app\` y el crontab de usuario de root?
3. Tu cron job produce output pero no hay MTA instalado. ¿Cómo evitas el mensaje de advertencia?

---

1. Porque \`run-parts\` (el programa que ejecuta los scripts de los directorios cron) ignora archivos con extensión por defecto. Solo ejecuta archivos cuyos nombres consisten únicamente en letras, números, guiones y guiones bajos. Archivo \`backup\` se ejecuta; archivo \`backup.sh\` se ignora silenciosamente.
2. \`/etc/cron.d/mi-app\` incluye el campo usuario en cada línea (puede especificar distintos usuarios por job) y es gestionable como archivo de configuración del sistema (con control de versiones, permisos, etc.). El crontab de usuario de root es personal del usuario root y se edita con \`crontab -e\` — más difícil de auditar y gestionar en equipo.
3. Dos opciones: (1) redirigir toda la salida: \`comando >> /var/log/mi-job.log 2>&1\`, o (2) agregar \`MAILTO=""\` al inicio del crontab para silenciar todos los emails.
`

export default content
