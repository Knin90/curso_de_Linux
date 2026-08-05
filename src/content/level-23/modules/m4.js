const content = `
## Módulo 4 — aureport: reportes automáticos del sistema de auditoría

### 🎯 Objetivos de aprendizaje

* Generar reportes estadísticos de actividad de auditoría con aureport.
* Identificar los reportes más útiles para operaciones y seguridad.
* Detectar anomalías rápidamente con reportes de fallos y accesos.
* Automatizar reportes periódicos con cron.

### ❓ El problema real

El equipo de seguridad necesita un resumen diario: cuántos logins fallidos hubo, qué comandos privilegiados se ejecutaron, qué archivos se modificaron. Leer \`audit.log\` línea a línea es inviable. \`aureport\` convierte el log en tablas resumidas que puedes leer en segundos, enviar por email, o exportar para cumplimiento normativo.

### 📖 Resumen general del sistema

\`\`\`bash
# Reporte global — estadísticas de todo el log
sudo aureport

# Ejemplo de salida:
\`\`\`

\`\`\`text
Summary Report
======================
Range of time in logs: 01/10/2024 00:00:01.000 - 01/15/2024 23:59:58.000
Selected time for report: 01/10/2024 00:00:01 - 01/15/2024 23:59:58.000
Number of changes in configuration: 4
Number of changes to accounts, groups, or roles: 2
Number of logins: 47
Number of failed logins: 3
Number of authentications: 156
Number of failed authentications: 8
Number of users: 5
Number of terminals: 12
Number of host names: 7
Number of executables: 89
Number of commands: 1024
Number of files: 234
Number of AVC's: 0
Number of MAC events: 0
Number of failed syscalls: 23
Number of anomaly events: 0
Number of responses to anomaly events: 0
Number of crypto events: 42
Number of integrity events: 0
Number of key auth events: 0
Number of process IDs: 456
Number of events: 8921
\`\`\`

### 📖 Reportes de autenticación y acceso

\`\`\`bash
# Logins al sistema
sudo aureport --login

# Logins fallidos
sudo aureport --failed --login

# Autenticaciones (sudo, su, etc.)
sudo aureport --auth

# Autenticaciones fallidas
sudo aureport --failed --auth

# Filtrar por rango de tiempo
sudo aureport --login --start today

# Actividad de usuarios
sudo aureport --user
sudo aureport --user --summary   # top usuarios por actividad
\`\`\`

\`\`\`text
# Ejemplo: aureport --login
Login Report
============================================
# date time auid host term exe success event
============================================
1. 01/15/2024 08:01:23 alice 192.168.1.10 ssh /usr/sbin/sshd yes 145
2. 01/15/2024 09:14:52 bob 192.168.1.15 ssh /usr/sbin/sshd yes 287
3. 01/15/2024 10:33:01 unknown 10.0.0.50 ssh /usr/sbin/sshd no  412
4. 01/15/2024 11:45:18 root console pts0 /usr/bin/login yes 523
\`\`\`

### 📖 Reportes de comandos y ejecutables

\`\`\`bash
# Comandos ejecutados (requiere regla -k exec-commands)
sudo aureport --cmd

# Resumen de ejecutables más usados
sudo aureport --exe
sudo aureport --exe --summary

# Comandos privilegiados (sudo, su)
sudo aureport --comm

# Reportes de procesos
sudo aureport --pid
\`\`\`

### 📖 Reportes de archivos y cambios

\`\`\`bash
# Archivos accedidos/modificados
sudo aureport --file
sudo aureport --file --summary    # los más accedidos

# Cambios de configuración del sistema
sudo aureport --config

# Cambios en cuentas de usuario y grupos
sudo aureport --acct

# Cambios en cuentas específicos
sudo aureport --user-acct
\`\`\`

### 📖 Reportes de anomalías y fallos

\`\`\`bash
# Anomalías detectadas
sudo aureport --anomaly

# Syscalls fallidas
sudo aureport --failed

# Intentos de acceso denegado
sudo aureport --denied

# Eventos AVC (SELinux/AppArmor)
sudo aureport --avc

# Eventos de integridad (IMA/auditd integrity)
sudo aureport --integrity
\`\`\`

### 📖 Automatizar reportes diarios

\`\`\`bash
# Script de reporte diario: /usr/local/bin/audit-daily-report.sh
#!/bin/bash

REPORT_DIR="/var/reports/audit"
DATE=$(date +%Y%m%d)
MAILTO="security@empresa.com"

mkdir -p "\$REPORT_DIR"

{
    echo "=== REPORTE DE AUDITORÍA: $(date) ==="
    echo ""
    echo "--- RESUMEN GENERAL ---"
    aureport --start yesterday --end today

    echo ""
    echo "--- LOGINS FALLIDOS ---"
    aureport --failed --login --start yesterday --end today

    echo ""
    echo "--- AUTENTICACIONES FALLIDAS ---"
    aureport --failed --auth --start yesterday --end today

    echo ""
    echo "--- CAMBIOS EN CUENTAS ---"
    aureport --acct --start yesterday --end today

    echo ""
    echo "--- TOP 10 EJECUTABLES ---"
    aureport --exe --summary --start yesterday --end today | head -15

    echo ""
    echo "--- ANOMALÍAS ---"
    aureport --anomaly --start yesterday --end today

} > "\$REPORT_DIR/audit-\$DATE.txt"

# Enviar por email si hay eventos notables
FAILED_LOGINS=$(aureport --failed --login --start yesterday --end today 2>/dev/null | grep -c "^[0-9]")
if [ "\$FAILED_LOGINS" -gt 5 ]; then
    mail -s "[ALERTA] \$FAILED_LOGINS logins fallidos en $(hostname)" "\$MAILTO" \
        < "\$REPORT_DIR/audit-\$DATE.txt"
fi
\`\`\`

\`\`\`bash
# Crontab: enviar reporte cada mañana a las 7:00
0 7 * * * root /usr/local/bin/audit-daily-report.sh
\`\`\`

### 📋 Lo que debes recordar

* \`aureport\` sin argumentos da el resumen más rápido de la actividad total del log.
* \`--summary\` con cualquier reporte muestra estadísticas agregadas (top-N).
* Combinar \`--failed\` con cualquier reporte es la forma más rápida de detectar actividad anómala.
* \`--start today\` y \`--start yesterday\` son los filtros de tiempo más usados en operaciones diarias.

### 🧪 Autoevaluación

1. ¿Cómo obtendrías el top 5 de ejecutables más usados en las últimas 24 horas?
2. ¿Qué reporte usarías para ver si alguien creó o eliminó una cuenta de usuario?
3. ¿Cuál es la diferencia entre \`aureport --auth\` y \`aureport --login\`?

---

1. \`sudo aureport --exe --summary --start yesterday --end today | head -10\`. El \`--summary\` agrupa por ejecutable y ordena por frecuencia; \`head -10\` toma las primeras líneas (header + top 5 aproximadamente).
2. \`sudo aureport --acct\` muestra cambios en cuentas. Para más detalle, \`sudo aureport --user-acct\` o buscar con \`sudo ausearch -m ADD_USER -m DEL_USER -m ADD_GROUP -m DEL_GROUP -i --start yesterday\`.
3. \`--login\` reporta eventos de inicio de sesión completos al sistema (SSH, consola, PAM login). \`--auth\` reporta autenticaciones individuales que incluyen también \`sudo\`, \`su\`, y cualquier proceso que use PAM para verificar credenciales — un conjunto más amplio.
`

export default content
