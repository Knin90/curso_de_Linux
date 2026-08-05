const content = `
## Módulo 4 — Alerting: alertmanager, reglas y notificaciones

### 🎯 Objetivos de aprendizaje

* Definir reglas de alerta en Prometheus con umbrales prácticos.
* Instalar y configurar Alertmanager para enrutar notificaciones.
* Configurar notificaciones a Slack, email y PagerDuty.
* Entender silencing, inhibición y agrupación de alertas.

### ❓ El problema real

Sin alertas, el monitoreo es solo un dashboard que nadie mira. El objetivo real es que cuando algo crítico ocurre a las 3 AM, alguien reciba una notificación accionable — no 50 alertas ruidosas que entrenen a tu equipo a ignorarlas. Alertmanager existe precisamente para resolver la diferencia entre "detectar un problema" y "notificar a la persona correcta, una sola vez, con contexto suficiente".

### 📖 Reglas de alerta en Prometheus

Las reglas se definen en archivos YAML referenciados desde \`prometheus.yml\`:

\`\`\`yaml
# /etc/prometheus/rules/node.yml
groups:
  - name: node_alerts
    interval: 60s   # evaluar cada 60s (override del global)
    rules:

      - alert: HostHighCpuLoad
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m         # debe cumplirse 5 minutos continuos antes de disparar
        labels:
          severity: warning
        annotations:
          summary: "CPU alta en \{{ \$labels.instance }}"
          description: "CPU al \{{ \$value | humanize }}% en los últimos 5 minutos."

      - alert: HostOutOfMemory
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Memoria crítica en \{{ \$labels.instance }}"
          description: "Memoria usada al \{{ \$value | humanize }}%."

      - alert: HostDiskWillFillIn4Hours
        expr: predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4 * 3600) < 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disco se llenará en <4h en \{{ \$labels.instance }}"
          description: "Proyección: el disco / se llenará en menos de 4 horas."

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Servicio caído: \{{ \$labels.job }} en \{{ \$labels.instance }}"
\`\`\`

\`\`\`bash
# Validar reglas antes de aplicar
promtool check rules /etc/prometheus/rules/node.yml

# Recargar Prometheus
curl -X POST http://localhost:9090/-/reload
\`\`\`

**Estados de una alerta:**
\`\`\`text
INACTIVE  → la expresión no se cumple
PENDING   → la expresión se cumple pero no ha pasado el tiempo "for"
FIRING    → la expresión se cumple y pasó el tiempo "for" → se envía a Alertmanager
\`\`\`

### 📖 Instalación de Alertmanager

\`\`\`bash
wget https://github.com/prometheus/alertmanager/releases/download/v0.27.0/alertmanager-0.27.0.linux-amd64.tar.gz
tar xvf alertmanager-0.27.0.linux-amd64.tar.gz
sudo mv alertmanager-0.27.0.linux-amd64/alertmanager /usr/local/bin/
sudo mv alertmanager-0.27.0.linux-amd64/amtool      /usr/local/bin/
sudo mkdir -p /etc/alertmanager /var/lib/alertmanager
sudo useradd --no-create-home --shell /bin/false alertmanager
sudo chown -R alertmanager:alertmanager /etc/alertmanager /var/lib/alertmanager
\`\`\`

### 📖 Configuración de Alertmanager

\`\`\`yaml
# /etc/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alertas@empresa.com'
  smtp_auth_username: 'alertas@empresa.com'
  smtp_auth_password: 'app-password-aqui'
  slack_api_url: 'https://hooks.slack.com/services/T.../B.../xxx'

route:
  # Agrupar alertas del mismo job para evitar flood
  group_by: ['alertname', 'job']
  group_wait: 30s        # esperar 30s para agrupar más alertas del mismo grupo
  group_interval: 5m     # intervalo entre notificaciones del mismo grupo
  repeat_interval: 4h    # reintentar si sigue activa después de 4h
  receiver: 'slack-ops'  # receptor por defecto

  routes:
    # Alertas críticas: también notificar por email Y llamar PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true   # continúa a otras rutas también

    - match:
        severity: critical
      receiver: 'email-ops'

receivers:
  - name: 'slack-ops'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        title: '\{{ if .Firing }}🔥\{{ else }}✅\{{ end }} \{{ .GroupLabels.alertname }}'
        text: '\{{ range .Alerts }}\{{ .Annotations.description }}\n\{{ end }}'

  - name: 'email-ops'
    email_configs:
      - to: 'ops@empresa.com'
        send_resolved: true

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'your-pagerduty-integration-key'
        send_resolved: true

inhibit_rules:
  # Si un nodo está caído (crítico), silenciar sus alertas de warning
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['instance']
\`\`\`

### 📖 Servicio systemd de Alertmanager

\`\`\`ini
# /etc/systemd/system/alertmanager.service
[Unit]
Description=Alertmanager
After=network.target

[Service]
User=alertmanager
Group=alertmanager
Type=simple
ExecStart=/usr/local/bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/var/lib/alertmanager \
  --web.listen-address=0.0.0.0:9093
Restart=always

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
sudo systemctl enable --now alertmanager

# Verificar configuración
amtool check-config /etc/alertmanager/alertmanager.yml

# Ver alertas activas
amtool alert query --alertmanager.url=http://localhost:9093

# Silenciar una alerta durante 2 horas (durante un mantenimiento)
amtool silence add --alertmanager.url=http://localhost:9093 \
  --duration=2h \
  --comment="Mantenimiento programado" \
  alertname="HostHighCpuLoad" instance="web-01:9100"

# Ver silencios activos
amtool silence query --alertmanager.url=http://localhost:9093
\`\`\`

### 📖 Reglas de alerta para aplicaciones web

\`\`\`yaml
# /etc/prometheus/rules/app.yml
groups:
  - name: application_alerts
    rules:

      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate >5% en producción"
          description: "Error rate actual: \{{ \$value | humanizePercentage }}"

      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.99,
            sum by (le, handler) (rate(http_request_duration_seconds_bucket[5m]))
          ) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 de latencia >2s en \{{ \$labels.handler }}"
          description: "P99 = \{{ \$value | humanizeDuration }}"
\`\`\`

### 📋 Lo que debes recordar

* El campo \`for\` evita alertas falsas por spikes momentáneos — siempre úsalo.
* \`inhibit_rules\` evita el flood: si el nodo está caído, no necesitas todas sus alertas hijas.
* \`amtool silence add\` es tu mejor amigo durante mantenimientos programados.
* \`continue: true\` en una ruta permite que la alerta llegue a múltiples receptores.

### 🧪 Autoevaluación

1. ¿Qué diferencia hay entre \`group_wait\` y \`group_interval\` en Alertmanager?
2. ¿Para qué sirven las \`inhibit_rules\`?
3. Una alerta tiene \`for: 5m\`. La condición se cumple durante 3 minutos y luego desaparece. ¿Se envía la notificación?

---

1. \`group_wait\` (30s) es el tiempo que Alertmanager espera antes de enviar la primera notificación de un grupo, para acumular otras alertas que puedan llegar y enviarlas juntas. \`group_interval\` (5m) es el tiempo entre notificaciones subsiguientes del mismo grupo — si el grupo ya tiene alertas y llegan nuevas, espera este intervalo antes de enviar de nuevo.
2. Las \`inhibit_rules\` suprimen automáticamente alertas de menor severidad cuando ya existe una alerta de mayor severidad con el mismo contexto. Ejemplo clásico: si un servidor completo está \`DOWN\` (crítico), no tiene sentido recibir también las alertas de \`CPU alta\`, \`memoria alta\`, etc. de ese mismo servidor. La inhibición silencia las alertas hijas automáticamente.
3. No. La alerta nunca llega a estado \`FIRING\` porque el campo \`for: 5m\` requiere que la condición sea verdadera de forma continua durante 5 minutos. Después de 3 minutos, la alerta vuelve a \`INACTIVE\` (o \`PENDING\` si la condición reaparece). Solo cuando acumula 5 minutos continuos en \`PENDING\` pasa a \`FIRING\` y se envía la notificación.
`

export default content
