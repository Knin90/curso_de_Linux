const content = `
## Módulo 3 — Variables de entorno y depuración en cron

### 🎯 Objetivos de aprendizaje

* Configurar correctamente el entorno de ejecución en cron.
* Depurar cron jobs que fallan silenciosamente.
* Capturar y gestionar el output de cron jobs.
* Verificar que un cron job se ejecutó correctamente.

### ❓ El problema real

Tienes un cron job que no funciona. No hay mensajes de error. El script funciona perfecto manualmente. ¿Cómo depuras algo que se ejecuta en un entorno invisible, sin terminal, con un PATH diferente? Este módulo da el proceso sistemático para diagnosticar cron jobs.

### 📖 Variables de entorno en cron

\`\`\`text
Variables predefinidas que cron establece automáticamente:

SHELL=/bin/sh        ← sh, NO bash (importante para scripts Bash)
PATH=/usr/bin:/bin   ← PATH mínimo
LOGNAME=usuario      ← nombre del usuario
HOME=/home/usuario   ← directorio home del usuario
MAILTO=usuario       ← destinatario de emails de output
\`\`\`

**Definir variables en el crontab:**

\`\`\`text
# Crontab con entorno correcto
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin
MAILTO=ops@empresa.com
HOME=/var/www/app

# Variable de la aplicación
ENVIRONMENT=production
DATABASE_URL=postgres://user:pass@localhost/db

# Jobs
0 2 * * * /usr/local/bin/backup.sh
\`\`\`

Las variables aplican a todos los jobs definidos después de ellas en el crontab.

### 📖 El truco de depuración: simular el entorno de cron

\`\`\`bash
# Método 1: ejecutar con el entorno mínimo de cron
env -i HOME="$HOME" LOGNAME="$USER" PATH=/usr/bin:/bin SHELL=/bin/sh bash -c "/tu/script.sh"

# Método 2: usar su para cambiar al usuario de cron
sudo su -s /bin/sh www-data -c "/usr/local/bin/mi-script.sh"

# Método 3: crear un wrapper que capture todo el entorno
cat > /tmp/debug-cron.sh << 'EOF'
#!/bin/sh
echo "=== ENTORNO ===" > /tmp/cron-debug.log
env >> /tmp/cron-debug.log
echo "=== PWD ===" >> /tmp/cron-debug.log
pwd >> /tmp/cron-debug.log
echo "=== EJECUCIÓN ===" >> /tmp/cron-debug.log
/tu/script.sh >> /tmp/cron-debug.log 2>&1
echo "=== EXIT CODE: $? ===" >> /tmp/cron-debug.log
EOF
chmod +x /tmp/debug-cron.sh

# Instalar temporalmente en cron
* * * * * /tmp/debug-cron.sh
\`\`\`

### 📖 Capturar output correctamente

\`\`\`bash
# 1. Redirigir todo a archivo de log
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# 2. Log con fecha (para distinguir ejecuciones)
0 2 * * * echo "$(date): iniciando" >> /var/log/backup.log; /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# 3. Descartar output completamente (peligroso: no sabrás si falla)
0 2 * * * /usr/local/bin/backup.sh > /dev/null 2>&1

# 4. Solo capturar errores
0 2 * * * /usr/local/bin/backup.sh > /dev/null

# 5. Usar logger para enviar al syslog (visible en journalctl)
0 2 * * * /usr/local/bin/backup.sh 2>&1 | logger -t "backup-cron"
\`\`\`

**Verificar en syslog que el job se ejecutó:**

\`\`\`bash
# El job aparece en syslog cuando cron lo lanza
grep "backup" /var/log/syslog | tail -5
journalctl -u cron | grep "backup" | tail -5
\`\`\`

### 📖 Proceso de depuración paso a paso

\`\`\`text
CRON JOB FALLA SILENCIOSAMENTE

Paso 1: Verificar que cron está corriendo
  systemctl status cron    (Debian/Ubuntu)
  systemctl status crond   (RHEL/Fedora)

Paso 2: Verificar que el job se ejecuta
  grep CRON /var/log/syslog | grep "mi-script"
  journalctl -u cron -b | grep "mi-script"

Paso 3: Verificar que el script existe y es ejecutable
  ls -la /ruta/al/script.sh
  # debe tener x en permisos

Paso 4: Capturar output temporal
  * * * * * /ruta/script.sh >> /tmp/debug.log 2>&1
  # esperar ejecución, revisar /tmp/debug.log

Paso 5: Simular entorno de cron manualmente
  env -i HOME=/home/usuario PATH=/usr/bin:/bin bash /ruta/script.sh
  # ¿funciona? si no: PATH issue o variable de entorno faltante

Paso 6: Revisar permisos de archivos que toca el script
  # El script puede correr como www-data, no como tú
  # ¿tiene permiso de escritura en /var/log/mi-app/?
\`\`\`

### 📖 Problemas comunes y soluciones

\`\`\`text
PROBLEMA                          SOLUCIÓN
──────────────────────────────────────────────────────────────
"command not found"               Usar ruta absoluta o definir PATH
Script funciona manual, falla     Agregar set -x al inicio y revisar log
en cron
Output va a email y no al log     Agregar 2>&1 al final del comando
Job no aparece en syslog          Verificar que el crontab tiene buena sintaxis
                                  (sin caracteres especiales, línea final con \\n)
Cron corre script pero falla      El script usa #!/bin/bash pero cron usa /bin/sh
                                  Asegurarse que SHELL=/bin/bash en el crontab
Archivos temporales de raíces     Los archivos creados pertenecen al usuario del
en lugar de del usuario correcto  job; verificar con qué usuario corre
\`\`\`

### 📖 Notificación por email

Cuando \`MAILTO\` está configurado y hay un MTA (sendmail/postfix/msmtp):

\`\`\`text
# Enviar output solo a este email
MAILTO=ops@empresa.com

# No enviar emails (silencioso)
MAILTO=""

# Enviar a múltiples destinatarios
MAILTO="ops@empresa.com,dev@empresa.com"
\`\`\`

Configurar \`msmtp\` como relay a Gmail/SMTP externo es la solución más simple para servidores que necesitan email sin postfix completo:

\`\`\`bash
sudo apt install msmtp msmtp-mta

# /etc/msmtprc
account default
host smtp.gmail.com
port 587
tls on
auth on
user tu@gmail.com
password tu-app-password
from tu@gmail.com
\`\`\`

### 📋 Lo que debes recordar

* El error más común de cron: script usa \`#!/bin/bash\` pero \`SHELL=/bin/sh\` en el crontab. Solución: definir \`SHELL=/bin/bash\` explícitamente.
* Siempre redirigir a log con \`>> /var/log/mi-job.log 2>&1\` — nunca dejar output sin capturar.
* \`grep CRON /var/log/syslog\` es el primer lugar a mirar cuando un cron job no parece ejecutarse.
* \`env -i PATH=/usr/bin:/bin bash /tu/script.sh\` simula el entorno mínimo de cron para depuración rápida.

### 🧪 Autoevaluación

1. Tu script comienza con \`#!/bin/bash\` y usa arrays de Bash. Funciona en terminal pero falla en cron. ¿Por qué?
2. ¿Cómo verificas que cron ejecutó tu job exactamente a las 2:00 AM de ayer?
3. ¿Cuál es el riesgo de \`> /dev/null 2>&1\` en un cron job de producción?

---

1. Porque cron por defecto usa \`SHELL=/bin/sh\`, y \`/bin/sh\` puede ser \`dash\` u otro shell POSIX que no soporta arrays de Bash ni otras extensiones específicas. Solución: agregar \`SHELL=/bin/bash\` al crontab antes del job.
2. \`grep "CRON" /var/log/syslog | grep "02:00"\` o \`journalctl -u cron --since "yesterday 01:59" --until "yesterday 02:01"\`. El syslog registra cuándo cron lanzó el job, no si tuvo éxito — también revisar el archivo de log del script si tiene uno.
3. Se pierde TODA la información de error. Si el script falla, no hay ninguna evidencia — ni en syslog, ni en email, ni en ningún log. El job falla silenciosamente y no te enteras hasta que el problema se hace visible por otra vía. En producción, siempre capturar al menos los errores.
`

export default content
