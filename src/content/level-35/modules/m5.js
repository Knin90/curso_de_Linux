const content = `
## Módulo 5 — Grafana: dashboards, datasources y paneles

### 🎯 Objetivos de aprendizaje

* Instalar Grafana y conectarlo a Prometheus como datasource.
* Crear dashboards con paneles de distintos tipos: time series, gauge, stat, table.
* Usar variables de template para dashboards dinámicos.
* Importar dashboards de la comunidad y organizarlos por carpetas.

### ❓ El problema real

La interfaz web de Prometheus es funcional pero no está diseñada para dashboards operativos. No puedes poner 12 gráficas en pantalla simultáneamente, no tiene variables de template para filtrar por servidor o entorno, y los gráficos son básicos. Grafana resuelve todo esto: toma los datos de Prometheus (u otras fuentes) y los convierte en dashboards ejecutivos, operativos y de debugging.

### 📖 Instalación de Grafana

\`\`\`bash
# Agregar repositorio oficial
sudo apt-get install -y apt-transport-https software-properties-common
wget -q -O - https://apt.grafana.com/gpg.key | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/grafana.gpg
echo "deb [signed-by=/etc/apt/trusted.gpg.d/grafana.gpg] https://apt.grafana.com stable main" \
  | sudo tee /etc/apt/sources.list.d/grafana.list

sudo apt-get update
sudo apt-get install -y grafana

sudo systemctl enable --now grafana-server
# Interfaz web en http://localhost:3000
# Usuario inicial: admin / admin (cambiarlo en primer login)
\`\`\`

Configuración básica en \`/etc/grafana/grafana.ini\`:

\`\`\`ini
[server]
http_port = 3000
domain = grafana.empresa.com

[security]
admin_user = admin
# admin_password se configura en el primer login

[auth.anonymous]
# Para dashboards públicos de solo lectura:
enabled = false

[smtp]
enabled = true
host = smtp.gmail.com:587
user = alertas@empresa.com
password = app-password
from_address = alertas@empresa.com
\`\`\`

### 📖 Configurar Prometheus como datasource

Desde la interfaz web: **Connections → Data sources → Add data source → Prometheus**

O vía API (útil para infraestructura como código):

\`\`\`bash
curl -X POST http://admin:admin@localhost:3000/api/datasources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://localhost:9090",
    "access": "proxy",
    "isDefault": true,
    "jsonData": {
      "timeInterval": "15s"
    }
  }'
\`\`\`

O con provisioning (recomendado para equipos):

\`\`\`yaml
# /etc/grafana/provisioning/datasources/prometheus.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://localhost:9090
    isDefault: true
    access: proxy
    jsonData:
      timeInterval: '15s'
      queryTimeout: '60s'
\`\`\`

### 📖 Tipos de paneles más útiles

\`\`\`text
Time series  → evolución temporal de métricas (el más usado)
Stat         → un único valor destacado: "99.9% uptime"
Gauge        → valor actual con rango visual: nivel de CPU
Bar chart    → comparación entre instancias en un momento dado
Table        → tabla con múltiples columnas y filas
Heatmap      → distribución de histogramas a lo largo del tiempo
Logs         → para datasources de logs (Loki)
\`\`\`

Configuración de un panel Time series típico:

\`\`\`text
Consulta (Query):
  sum by (instance) (rate(http_requests_total[5m]))

Legend:
  \{{ instance }}

Axes:
  Unit: requests/s

Thresholds:
  Base: green
  500 req/s: yellow
  1000 req/s: red
\`\`\`

### 📖 Variables de template para dashboards dinámicos

Las variables convierten un dashboard estático en uno reutilizable para múltiples entornos o servidores.

**Ejemplo: variable \`instance\` poblada desde Prometheus:**

\`\`\`text
Tipo: Query
Datasource: Prometheus
Query: label_values(node_uname_info, instance)
Refresh: On dashboard load
Multi-value: sí
Include All: sí
\`\`\`

Usar la variable en consultas:

\`\`\`promql
# Con variable $instance seleccionada desde el dropdown
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle", instance=~"\$instance"}[5m])) * 100)

# Con variable $env para separar producción de staging
rate(http_requests_total{env="\$env"}[5m])
\`\`\`

### 📖 Importar dashboards de la comunidad

Grafana tiene miles de dashboards en grafana.com/grafana/dashboards. Los más útiles:

\`\`\`text
ID 1860  — Node Exporter Full (el dashboard estándar para servidores Linux)
ID 9614  — NGINX Exporter
ID 9628  — PostgreSQL Database
ID 763   — Redis Dashboard
ID 3662  — Prometheus 2.0 Stats (monitorear al propio Prometheus)
\`\`\`

\`\`\`bash
# Importar via API
curl -X POST http://admin:admin@localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d '{"dashboardId": 1860, "overwrite": true, "inputs": [{"name": "DS_PROMETHEUS", "type": "datasource", "pluginId": "prometheus", "value": "Prometheus"}]}'
\`\`\`

### 📖 Provisioning de dashboards como código

\`\`\`yaml
# /etc/grafana/provisioning/dashboards/default.yml
apiVersion: 1
providers:
  - name: 'default'
    orgId: 1
    folder: 'Infrastructure'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
\`\`\`

\`\`\`bash
# Guardar dashboard JSON para control de versiones
mkdir -p /var/lib/grafana/dashboards

# Exportar un dashboard existente via API
curl -s http://admin:admin@localhost:3000/api/dashboards/uid/DASHBOARD_UID \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['dashboard'], indent=2))" \
  > /var/lib/grafana/dashboards/node-exporter.json
\`\`\`

Con este setup, los dashboards están en Git, se despliegan automáticamente y los cambios son rastreables.

### 📋 Lo que debes recordar

* El dashboard ID 1860 (Node Exporter Full) cubre el 90% de las necesidades de monitoreo de servidores Linux.
* Las variables de template (\`\$instance\`, \`\$env\`) convierten un dashboard en reutilizable para toda la infraestructura.
* El provisioning via YAML en \`/etc/grafana/provisioning/\` permite versionar datasources y dashboards en Git.
* \`access: proxy\` en el datasource significa que Grafana hace las consultas al backend — el navegador del usuario no necesita acceso directo a Prometheus.

### 🧪 Autoevaluación

1. ¿Qué ventaja tiene usar provisioning de dashboards frente a crearlos desde la UI?
2. ¿Para qué se usa el tipo de panel "Stat" en Grafana?
3. ¿Cómo filtras un panel de Grafana para que muestre solo datos de un servidor específico?

---

1. El provisioning almacena los dashboards como archivos JSON en el sistema de archivos (y por tanto en Git). Esto significa que los dashboards son reproducibles, versionados, revisables en pull requests, y se restauran automáticamente si se reconstruye el servidor de Grafana. Con dashboards creados manualmente desde la UI, si el servidor se pierde, los dashboards también se pierden.
2. El panel "Stat" muestra un único valor numérico de forma prominente, generalmente con color de fondo que cambia según umbrales. Es ideal para valores de estado: uptime %, requests por segundo actuales, número de instancias vivas. En un dashboard ejecutivo, una fila de paneles Stat da una vista rápida del estado general sin necesidad de interpretar gráficos.
3. Usando variables de template. Creas una variable \`\$instance\` de tipo Query con \`label_values(up, instance)\`, que popula un dropdown con todos los valores del label instance. Luego en la consulta del panel usas \`{instance=~"\$instance"}\` para que el filtro del dropdown se aplique dinámicamente.
`

export default content
