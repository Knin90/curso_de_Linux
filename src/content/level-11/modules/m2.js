const content = `
## Módulo 2 — journalctl: consultas avanzadas y filtrado

### 🎯 Objetivos de aprendizaje

* Consultar logs del journal con filtros precisos por tiempo, unit y prioridad.
* Entender la diferencia entre logs volátiles y persistentes.
* Usar campos estructurados del journal para diagnóstico eficiente.
* Monitorear logs en tiempo real y exportar en formatos útiles.

### ❓ El problema real

Tu servidor tiene 200 servicios activos. Uno falla. Abrir \`/var/log/syslog\` con \`grep\` mezcla mensajes de nginx, postgres, ssh, cron y el kernel en una sola corriente de texto imposible de leer. journalctl resuelve esto: es una interfaz de consulta con filtros por servicio, tiempo, prioridad y campos estructurados. Saber usarla bien es la diferencia entre diagnóstico en segundos o minutos.

### 📖 Uso básico

\`\`\`bash
# Todos los logs (del más antiguo al más reciente)
journalctl

# Solo desde este arranque
journalctl -b

# Arranque anterior (-1), el de hace dos arranques (-2)
journalctl -b -1
journalctl -b -2

# Listar arranques disponibles
journalctl --list-boots

# Seguir en tiempo real (como tail -f)
journalctl -f

# Últimas N líneas
journalctl -n 50
\`\`\`

### 📖 Filtrar por tiempo

\`\`\`bash
# Desde una fecha/hora específica
journalctl --since "2024-01-15 08:00:00"

# Entre dos momentos
journalctl --since "2024-01-15 08:00:00" --until "2024-01-15 09:00:00"

# Últimas horas/minutos
journalctl --since "1 hour ago"
journalctl --since "30 minutes ago"
journalctl --since "yesterday"
journalctl --since "today"
\`\`\`

### 📖 Filtrar por unidad systemd

\`\`\`bash
# Logs de un servicio específico
journalctl -u nginx
journalctl -u sshd
journalctl -u postgresql

# Múltiples unidades
journalctl -u nginx -u postgresql

# Combinar con tiempo
journalctl -u sshd --since "1 hour ago"

# Solo este arranque para una unit
journalctl -u nginx -b
\`\`\`

### 📖 Filtrar por prioridad

\`\`\`bash
# Solo errores (err) y más grave
journalctl -p err

# Solo warnings y más grave
journalctl -p warning

# Rango de prioridad
journalctl -p err..crit

# Niveles disponibles (de más a menos grave):
# 0:emerg  1:alert  2:crit  3:err  4:warning  5:notice  6:info  7:debug
\`\`\`

El flag \`-p\` acepta el número o el nombre. \`-p 3\` equivale a \`-p err\`.

### 📖 Filtrar por campos estructurados

A diferencia de syslog de texto plano, journald almacena cada entrada como un registro estructurado con campos clave=valor. Puedes filtrar por cualquiera:

\`\`\`bash
# Por PID de proceso
journalctl _PID=1234

# Por ejecutable
journalctl _EXE=/usr/sbin/sshd

# Por usuario del sistema
journalctl _UID=1000

# Por hostname (útil en servidores centrales)
journalctl _HOSTNAME=webserver-01

# Por identificador de syslog (nombre del proceso)
journalctl SYSLOG_IDENTIFIER=sudo

# Ver todos los campos de una entrada
journalctl -o verbose -n 1

# Campos disponibles en una entrada
journalctl -o json-pretty -n 1 | head -40
\`\`\`

### 📖 Formatos de salida

\`\`\`bash
# Formato corto (defecto)
journalctl -u sshd -n 5

# Con timestamps completos
journalctl -u sshd -n 5 --output=short-full

# JSON (para procesamiento)
journalctl -u nginx -n 10 -o json

# JSON pretty (legible)
journalctl -u nginx -n 10 -o json-pretty

# Exportar para enviar a otro sistema
journalctl -u nginx --output=export > nginx-logs.export

# Solo el mensaje (útil con grep)
journalctl -u sshd -o cat | grep "Failed password"
\`\`\`

### 📖 Diagnóstico rápido de arranque

\`\`\`bash
# Errores del último arranque
journalctl -b -p err

# Tiempo que tomó cada servicio en arrancar
systemd-analyze blame

# Cuánto tardó el arranque completo
systemd-analyze

# Qué servicio está bloqueando el arranque
systemd-analyze critical-chain

# Logs del kernel solo (dmesg via journal)
journalctl -k
journalctl -k -b -1    # kernel del arranque anterior
\`\`\`

### 📖 Gestión del espacio en disco

\`\`\`bash
# Tamaño actual del journal
journalctl --disk-usage

# Limpiar entradas más antiguas que 2 semanas
sudo journalctl --vacuum-time=2weeks

# Reducir a máximo 500MB
sudo journalctl --vacuum-size=500M

# Mantener solo los últimos 3 arranques
sudo journalctl --vacuum-files=3
\`\`\`

Configuración permanente en \`/etc/systemd/journald.conf\`:

\`\`\`ini
[Journal]
SystemMaxUse=500M        # máximo espacio en /var/log/journal
SystemKeepFree=100M      # espacio libre mínimo a mantener
MaxRetentionSec=2weeks   # retención máxima
\`\`\`

### 📋 Lo que debes recordar

* \`journalctl -u <unit> -b -p err\` es el comando de diagnóstico rápido más útil.
* Los campos estructurados (_PID, _EXE, _UID) permiten filtrar con precisión quirúrgica.
* \`-o json-pretty\` es invaluable para entender qué metadatos guarda journald de cada entrada.
* El journal puede crecer sin límite: configura \`SystemMaxUse\` en journald.conf en producción.

### 🧪 Autoevaluación

1. ¿Cómo listarías solo los errores del servicio nginx de las últimas 2 horas?
2. ¿Qué flag usas para ver logs del arranque anterior al actual?
3. Tu journal ocupa 4GB. ¿Cómo lo reduces a máximo 1GB sin reiniciar?

---

1. \`journalctl -u nginx -p err --since "2 hours ago"\`
2. \`journalctl -b -1\` (el \`-1\` indica el arranque previo; \`--list-boots\` muestra todos los disponibles).
3. \`sudo journalctl --vacuum-size=1G\` — aplica inmediatamente eliminando las entradas más antiguas hasta alcanzar el límite.
`

export default content
