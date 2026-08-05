const content = `
## Módulo 6 — journalctl: logs y auditoría centralizada

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura del journal de systemd y sus ventajas sobre logs en archivos de texto.
* Filtrar logs por servicio, tiempo, prioridad y proceso.
* Gestionar el espacio en disco del journal.

### 📖 journald: el sistema de logs centralizado

Antes de systemd, cada aplicación escribía sus logs en archivos de texto dispersos:

\`\`\`text
  Antes (SysVinit):
  /var/log/nginx/error.log
  /var/log/mysql/error.log
  /var/log/syslog
  /var/log/auth.log
  /var/log/kern.log
  /var/log/messages
  ... cada uno con formato diferente

  Con systemd (journald):
  Todo en un journal binario estructurado → /var/log/journal/
  Una sola herramienta para consultar todo: journalctl
  Metadatos enriquecidos: PID, UID, unidad, boot ID, prioridad...
\`\`\`

### 💻 Consultas esenciales con journalctl

\`\`\`bash
# Ver todos los logs (del más antiguo al más reciente)
journalctl

# Ver en tiempo real (como tail -f)
journalctl -f

# Ver logs de un servicio específico
journalctl -u nginx
journalctl -u sshd

# Logs de un servicio en tiempo real
journalctl -u nginx -f

# Ver solo los últimos N líneas
journalctl -u nginx -n 50

# Logs del arranque actual
journalctl -b

# Logs del arranque anterior (útil tras un crash)
journalctl -b -1

# Logs de los últimos 3 arranques
journalctl --list-boots
\`\`\`

### 💻 Filtros por tiempo

\`\`\`bash
# Logs desde hoy
journalctl --since today

# Logs de las últimas 2 horas
journalctl --since "2 hours ago"

# Logs de un rango específico
journalctl --since "2026-08-04 10:00" --until "2026-08-04 14:00"

# Logs de ayer
journalctl --since yesterday --until today

# Combinar con servicio
journalctl -u nginx --since today
\`\`\`

### 💻 Filtros por prioridad (severidad)

\`\`\`bash
# Solo errores y superiores (err, crit, alert, emerg)
journalctl -p err

# Solo advertencias y superiores
journalctl -p warning

# Errores de hoy en todo el sistema
journalctl -p err --since today
\`\`\`

| Nivel | Número | Significado |
| --- | --- | --- |
| \`emerg\` | 0 | Sistema inusable |
| \`alert\` | 1 | Acción inmediata requerida |
| \`crit\` | 2 | Condición crítica |
| \`err\` | 3 | Error |
| \`warning\` | 4 | Advertencia |
| \`notice\` | 5 | Normal pero significativo |
| \`info\` | 6 | Informativo |
| \`debug\` | 7 | Depuración |

### 💻 Filtros avanzados

\`\`\`bash
# Logs de un PID específico
journalctl _PID=890

# Logs de un usuario específico (por UID)
journalctl _UID=1001

# Logs de un ejecutable específico
journalctl /usr/sbin/nginx

# Logs del kernel
journalctl -k

# Buscar texto en los logs
journalctl -u nginx -g "error"
journalctl -u nginx --grep="error"

# Ver logs en formato JSON (para procesamiento automatizado)
journalctl -u nginx -o json | head -5

# Ver logs con output detallado
journalctl -u nginx -o verbose
\`\`\`

### 💻 Gestión del espacio del journal

\`\`\`bash
# Ver cuánto espacio ocupa el journal
journalctl --disk-usage

# Eliminar logs más antiguos de 7 días
sudo journalctl --vacuum-time=7d

# Eliminar logs hasta dejar solo 500MB
sudo journalctl --vacuum-size=500M

# Eliminar logs de boots anteriores (conservar solo el actual)
sudo journalctl --vacuum-files=1

# Configurar límites permanentes en /etc/systemd/journald.conf
# SystemMaxUse=500M
# MaxRetentionSec=7day
sudo systemctl restart systemd-journald
\`\`\`

### 💻 Exportar logs para análisis o tickets de soporte

\`\`\`bash
# Exportar logs de nginx de las últimas 24h a un archivo de texto
journalctl -u nginx --since "24 hours ago" > /tmp/nginx-logs.txt

# Exportar en formato JSON para análisis con jq
journalctl -u nginx --since today -o json > /tmp/nginx-logs.json

# Ver las últimas 100 líneas con timestamp completo
journalctl -u nginx -n 100 --output=short-precise
\`\`\`

### 📋 Lo que debes recordar

* \`journalctl -u servicio -f\` — monitoreo en tiempo real de un servicio (úsalo mientras haces cambios).
* \`journalctl -b -1\` — logs del arranque anterior, clave para diagnosticar crashes.
* \`journalctl -p err --since today\` — auditoría rápida de errores del día.
* \`journalctl --disk-usage\` + \`--vacuum-time\` para gestionar espacio en servidores con disco limitado.

### 🧪 Autoevaluación rápida

1. ¿Qué ventaja tiene \`journalctl -b -1\` sobre revisar \`/var/log/syslog\`?
2. ¿Cómo verías en tiempo real los logs de nginx mientras recargas su configuración?
3. El journal ocupa 4GB. ¿Qué comando usarías para reducirlo a un máximo de 1GB?

---

1. \`journalctl -b -1\` muestra los logs del **arranque anterior** — incluyendo mensajes del kernel y de systemd que ocurrieron antes de que los servicios de logging externos estuvieran activos. \`/var/log/syslog\` puede no tener los mensajes previos al crash.
2. \`journalctl -u nginx -f\` en una terminal mientras ejecutas \`systemctl reload nginx\` en otra.
3. \`sudo journalctl --vacuum-size=1G\`
`
export default content
