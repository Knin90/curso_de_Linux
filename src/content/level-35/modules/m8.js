const content = `
## Módulo 8 — Laboratorio: stack de monitoreo completo Prometheus/Grafana

### 🎯 Objetivos de aprendizaje
* Instalar y configurar Prometheus con scrape targets y rule files
* Desplegar node_exporter en un servidor monitorizado y verificar la ingesta de datos
* Configurar Alertmanager con rutas de notificación a Slack
* Crear alertas operacionales reales (instancia caída, CPU alta, disco casi lleno)
* Instalar Grafana, conectarla a Prometheus e importar y crear dashboards
* Simular una alerta de CPU y verificar el flujo completo hasta la notificación

---

### ❓ El problema real

Tienes servidores en producción sin observabilidad. Cuando algo falla, te enteras
porque un usuario llama. Este laboratorio construye el stack completo:
Prometheus recolecta, Alertmanager notifica y Grafana visualiza.
Al final, una alerta de CPU disparada por una carga simulada llegará a Slack en menos de 15 minutos.

---

### 📖 Paso 1: instalación de Prometheus

**Crear usuario del sistema:**
\`\`\`bash
useradd --system --no-create-home --shell /bin/false prometheus
\`\`\`

**Descargar y descomprimir (ajustar versión según https://prometheus.io/download/):**
\`\`\`bash
PROM_VERSION="2.51.2"
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v\${PROM_VERSION}/prometheus-\${PROM_VERSION}.linux-amd64.tar.gz
tar xzf prometheus-\${PROM_VERSION}.linux-amd64.tar.gz
\`\`\`

**Instalar binarios y directorios:**
\`\`\`bash
mv prometheus-\${PROM_VERSION}.linux-amd64/prometheus /usr/local/bin/
mv prometheus-\${PROM_VERSION}.linux-amd64/promtool /usr/local/bin/
mkdir -p /etc/prometheus /var/lib/prometheus
mv prometheus-\${PROM_VERSION}.linux-amd64/consoles /etc/prometheus/
mv prometheus-\${PROM_VERSION}.linux-amd64/console_libraries /etc/prometheus/
chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus
\`\`\`

**Configuración /etc/prometheus/prometheus.yml:**
\`\`\`yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['server-ip:9100']
\`\`\`

**Unidad systemd /etc/systemd/system/prometheus.service:**
\`\`\`ini
[Unit]
Description=Prometheus
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \\
  --config.file /etc/prometheus/prometheus.yml \\
  --storage.tsdb.path /var/lib/prometheus \\
  --storage.tsdb.retention.time=30d \\
  --web.listen-address=0.0.0.0:9090

Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
\`\`\`

**Activar y verificar:**
\`\`\`bash
systemctl daemon-reload
systemctl enable --now prometheus
systemctl status prometheus

# Verificar que expone métricas
curl -s http://localhost:9090/metrics | head -5
\`\`\`

---

### 📖 Paso 2: instalación de node_exporter en el servidor monitorizado

**En el servidor que quieres monitorizar (server-ip):**
\`\`\`bash
NODE_VERSION="1.8.0"
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v\${NODE_VERSION}/node_exporter-\${NODE_VERSION}.linux-amd64.tar.gz
tar xzf node_exporter-\${NODE_VERSION}.linux-amd64.tar.gz
mv node_exporter-\${NODE_VERSION}.linux-amd64/node_exporter /usr/local/bin/
useradd --system --no-create-home --shell /bin/false node_exporter
\`\`\`

**Unidad systemd /etc/systemd/system/node_exporter.service:**
\`\`\`ini
[Unit]
Description=Node Exporter
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter --web.listen-address=:9100

Restart=on-failure

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
systemctl daemon-reload
systemctl enable --now node_exporter
curl -s http://localhost:9100/metrics | grep node_cpu | head -3
\`\`\`

**Verificar en Prometheus UI que el target aparece como UP:**
\`\`\`
http://prometheus-ip:9090/targets
# Verificar: up{job="node", instance="server-ip:9100"} == 1
\`\`\`

---

### 📖 Paso 3: instalación de Alertmanager

**Descargar e instalar:**
\`\`\`bash
AM_VERSION="0.27.0"
cd /tmp
wget https://github.com/prometheus/alertmanager/releases/download/v\${AM_VERSION}/alertmanager-\${AM_VERSION}.linux-amd64.tar.gz
tar xzf alertmanager-\${AM_VERSION}.linux-amd64.tar.gz
mv alertmanager-\${AM_VERSION}.linux-amd64/alertmanager /usr/local/bin/
mv alertmanager-\${AM_VERSION}.linux-amd64/amtool /usr/local/bin/
mkdir -p /etc/alertmanager /var/lib/alertmanager
useradd --system --no-create-home --shell /bin/false alertmanager
\`\`\`

**Configuración /etc/alertmanager/alertmanager.yml:**
\`\`\`yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/TU_WEBHOOK_URL'
        channel: '#alertas-infra'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
\`\`\`

**Unidad systemd /etc/systemd/system/alertmanager.service:**
\`\`\`ini
[Unit]
Description=Alertmanager
After=network-online.target

[Service]
User=alertmanager
Group=alertmanager
Type=simple
ExecStart=/usr/local/bin/alertmanager \\
  --config.file /etc/alertmanager/alertmanager.yml \\
  --storage.path /var/lib/alertmanager \\
  --web.listen-address=0.0.0.0:9093

Restart=on-failure

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
systemctl daemon-reload
systemctl enable --now alertmanager
curl -s http://localhost:9093/api/v1/status | python3 -m json.tool
\`\`\`

---

### 📖 Paso 4: reglas de alerta

**Crear directorio de rules:**
\`\`\`bash
mkdir -p /etc/prometheus/rules
chown prometheus:prometheus /etc/prometheus/rules
\`\`\`

**Archivo /etc/prometheus/rules/node-alerts.yml:**
\`\`\`yaml
groups:
  - name: node-alerts
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Instancia {{ \$labels.instance }} no responde"
          description: "{{ \$labels.instance }} del job {{ \$labels.job }} ha estado caída más de 5 minutos."

      - alert: HighCPUUsage
        expr: >
          100 - (avg by(instance)(
            rate(node_cpu_seconds_total{mode="idle"}[5m])
          ) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU alta en {{ \$labels.instance }}"
          description: "CPU en {{ \$labels.instance }} supera el 80% durante más de 10 minutos. Valor actual: {{ \$value | printf '%.1f' }}%"

      - alert: DiskAlmostFull
        expr: >
          (node_filesystem_avail_bytes{fstype!="tmpfs"}
           / node_filesystem_size_bytes) * 100 < 20
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disco casi lleno en {{ \$labels.instance }}"
          description: "Sistema de archivos {{ \$labels.mountpoint }} en {{ \$labels.instance }} tiene menos del 20% de espacio libre."

      - alert: HighMemoryUsage
        expr: >
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Memoria crítica en {{ \$labels.instance }}"
          description: "Uso de memoria en {{ \$labels.instance }} supera el 90%. Valor actual: {{ \$value | printf '%.1f' }}%"
\`\`\`

**Validar la sintaxis de las reglas:**
\`\`\`bash
promtool check rules /etc/prometheus/rules/node-alerts.yml
# Debe mostrar: SUCCESS
\`\`\`

**Recargar Prometheus sin reiniciar:**
\`\`\`bash
systemctl reload prometheus
# O via API:
curl -X POST http://localhost:9090/-/reload
\`\`\`

**Verificar en la UI de Prometheus:**
\`\`\`
http://prometheus-ip:9090/rules
# Todas las reglas deben aparecer en estado "inactive"
\`\`\`

---

### 📖 Paso 5: instalación y configuración de Grafana

**Instalar desde el repositorio oficial:**
\`\`\`bash
apt-get install -y apt-transport-https software-properties-common
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | tee /usr/share/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list
apt-get update
apt-get install grafana -y
systemctl enable --now grafana-server
\`\`\`

**Acceder a Grafana:** http://grafana-ip:3000 (usuario: admin, contraseña inicial: admin)

**Agregar datasource Prometheus:**
1. Configuration → Data Sources → Add data source
2. Seleccionar Prometheus
3. URL: http://localhost:9090
4. Hacer clic en "Save & Test" → debe mostrar "Data source is working"

**Importar dashboard Node Exporter Full (ID 1860):**
1. Dashboards → Import
2. Ingresar ID: 1860
3. Seleccionar el datasource Prometheus creado
4. Import

**Crear un panel custom: uso de CPU como gauge:**
1. Dashboards → New → Add visualization
2. Datasource: Prometheus
3. Query:
\`\`\`
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
\`\`\`
4. Visualization: Gauge
5. Thresholds: verde < 60, amarillo < 80, rojo ≥ 80
6. Título: "CPU Usage %"

---

### 📖 Paso 6: simular una alerta y verificar el flujo completo

**Instalar stress en el servidor monitorizado:**
\`\`\`bash
apt-get install stress -y
\`\`\`

**Generar carga de CPU durante 2 minutos:**
\`\`\`bash
stress --cpu 4 --timeout 120
\`\`\`

**Monitorear en tiempo real en Prometheus:**
\`\`\`
http://prometheus-ip:9090/graph

Query para ver la CPU:
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)
\`\`\`

**Verificar que la alerta se dispara:**
\`\`\`
http://prometheus-ip:9090/alerts
# HighCPUUsage debe pasar de Inactive → Pending → Firing
# (Pending = condición cumplida; Firing = cumplida durante el 'for: 10m')
\`\`\`

**Verificar en Alertmanager:**
\`\`\`
http://prometheus-ip:9093
# La alerta HighCPUUsage debe aparecer en la lista de alertas activas
\`\`\`

---

### 📖 PromQL de referencia para este lab

\`\`\`
# CPU usage %
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage %
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage % (excluir tmpfs)
(1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes)) * 100

# Network receive (bytes/s)
rate(node_network_receive_bytes_total{device!="lo"}[5m])

# Network transmit (bytes/s)
rate(node_network_transmit_bytes_total{device!="lo"}[5m])

# Load average (1 min)
node_load1

# Instancias caídas
up == 0
\`\`\`

---

### 📋 Lo que debes recordar
* prometheus.yml define scrape targets, reglas y la dirección de Alertmanager en tres secciones separadas
* node_exporter expone métricas del sistema operativo en el puerto 9100
* Las alertas pasan por tres estados: Inactive → Pending (condición cumplida) → Firing (tras el período \`for:\`)
* promtool check rules valida la sintaxis de los rule files antes de recargar Prometheus
* Grafana se conecta a Prometheus como datasource y permite importar dashboards de la comunidad por ID

### 🧪 Autoevaluación
1. Configuras la alerta HighCPUUsage con \`for: 10m\`. A los 3 minutos de CPU al 90%, ¿cuál es el estado de la alerta en Prometheus y por qué?
2. ¿Por qué la alerta InstanceDown usa \`up == 0\` y no \`up != 1\`? ¿Podría haber diferencia?
3. Tienes Prometheus corriendo pero el dashboard de Grafana muestra "No data". ¿Cuáles son los primeros tres lugares que verificarías?

---

1. La alerta está en estado Pending. La condición se cumple (CPU > 80%), pero Prometheus espera que se cumpla de forma continua durante el tiempo definido en \`for:\` (10 minutos) antes de pasar a Firing y enviar la notificación a Alertmanager. Esto evita falsos positivos por picos de CPU cortos.
2. En la práctica son equivalentes para el scrape de Prometheus, ya que \`up\` solo toma valores 0 (fallo) o 1 (éxito). Sin embargo, \`up == 0\` es semánticamente más preciso y explícito. Con \`up != 1\` podrías en teoría capturar valores distintos de 0 y 1 si el exporter retornara otro valor por error, aunque en la implementación estándar de Prometheus eso no ocurre.
3. Primero verificar que el datasource en Grafana apunta a la URL correcta de Prometheus y muestra "Data source is working" en la prueba de conexión. Segundo, ir a Prometheus UI (/targets) y confirmar que el job del que toman datos los paneles aparece en estado UP. Tercero, ejecutar la misma query del panel directamente en el Explore de Prometheus para verificar que devuelve datos — si falla ahí, el problema es la query, no Grafana.
`

export default content
