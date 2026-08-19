const content = `
## Módulo 1 — Arquitectura Prometheus: pull model, TSDB y componentes

### 🎯 Objetivos de aprendizaje

* Entender el modelo pull de Prometheus y sus ventajas frente al modelo push.
* Conocer los componentes del ecosistema Prometheus y sus responsabilidades.
* Comprender la base de datos de series temporales (TSDB) interna de Prometheus.
* Instalar y configurar Prometheus desde cero.

### ❓ El problema real

Tu aplicación está en producción y no sabes qué está pasando dentro de ella. Los usuarios reportan lentitud intermitente pero tus logs no muestran errores. Sin métricas de latencia, uso de CPU, memoria, y throughput, operas a ciegas. Prometheus resuelve esto con un modelo simple: los targets exponen métricas en HTTP, Prometheus las recoge periódicamente, y puedes consultarlas en cualquier momento.

El modelo pull tiene una ventaja enorme: si un servicio muere, Prometheus lo detecta inmediatamente porque el scrape falla. Con modelo push, un servicio muerto simplemente deja de enviar datos — y quizás nadie lo nota.

### 📖 Componentes del ecosistema

\`\`\`diagram
{"type":"nested","container":{"title":"PROMETHEUS","meta":"servidor"},"items":[{"name":"Service Discovery","icon":"search"},{"name":"Scrape Engine","icon":"sync","focal":true},{"name":"TSDB (storage)","icon":"database"},{"name":"HTTP API / Query Engine","icon":"server"},{"name":"Alerting Rules + Alertmanager","icon":"alert"}],"external":[{"name":"Targets","meta":"node_exporter, app_service, postgres_exp…","icon":"network","side":"left"}]}
\`\`\`

**Componentes principales:**

| Componente | Función |
|---|---|
| Prometheus Server | Scrape, TSDB, evaluación de alertas, API |
| Exporters | Adaptadores que exponen métricas de terceros |
| Alertmanager | Recibe alertas y las enruta (email, Slack, PagerDuty) |
| Grafana | Visualización de dashboards (consume la API de Prometheus) |
| Pushgateway | Para jobs batch de corta duración (caso excepcional) |

### 📖 La base de datos de series temporales (TSDB)

Prometheus almacena datos como series temporales. Cada serie es la combinación única de un nombre de métrica y un conjunto de labels:

\`\`\`text
http_requests_total{method="GET",  status="200", handler="/api/users"}
http_requests_total{method="POST", status="500", handler="/api/orders"}
node_cpu_seconds_total{cpu="0", mode="idle"}
node_cpu_seconds_total{cpu="0", mode="user"}
\`\`\`

**Cómo funciona el almacenamiento:**

\`\`\`diagram
{"type":"tree","root":{"name":"data/","meta":"directorio de almacenamiento TSDB"},"children":[{"name":"01BX3PK5P50AH.../","meta":"bloque de 2 horas (inmutable)","children":[{"name":"chunks/","meta":"Gorilla compression"},{"name":"index","meta":"índice invertido de labels"},{"name":"meta.json","meta":"metadatos del bloque"}]},{"name":"01BX3PK6M40ZZ.../","meta":"otro bloque de 2 horas"},{"name":"wal/","meta":"Write-Ahead Log, datos recientes"},{"name":"lock","meta":"archivo de bloqueo"}]}
\`\`\`

**Retención:** por defecto 15 días. Configurable con \`--storage.tsdb.retention.time\`.

### 📖 Instalación y configuración básica

\`\`\`bash
# Descargar Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.51.0/prometheus-2.51.0.linux-amd64.tar.gz
tar xvf prometheus-2.51.0.linux-amd64.tar.gz
sudo mv prometheus-2.51.0.linux-amd64 /opt/prometheus

# Crear usuario de sistema
sudo useradd --no-create-home --shell /bin/false prometheus

# Crear directorios
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo cp /opt/prometheus/prometheus /usr/local/bin/
sudo cp /opt/prometheus/promtool   /usr/local/bin/
sudo cp -r /opt/prometheus/consoles /opt/prometheus/console_libraries /etc/prometheus/
sudo chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus
\`\`\`

Configuración mínima \`/etc/prometheus/prometheus.yml\`:

\`\`\`yaml
global:
  scrape_interval: 15s       # cada cuánto recoger métricas
  evaluation_interval: 15s   # cada cuánto evaluar reglas de alerta

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - '/etc/prometheus/rules/*.yml'

scrape_configs:
  # Prometheus se monitorea a sí mismo
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Sistema operativo
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
        labels:
          env: 'production'
          server: 'web-01'
\`\`\`

Servicio systemd \`/etc/systemd/system/prometheus.service\`:

\`\`\`ini
[Unit]
Description=Prometheus Monitoring
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --storage.tsdb.retention.time=30d \
  --web.console.templates=/etc/prometheus/consoles \
  --web.console.libraries=/etc/prometheus/console_libraries \
  --web.listen-address=0.0.0.0:9090 \
  --web.enable-lifecycle
Restart=always

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl enable --now prometheus
sudo systemctl status prometheus

# Validar configuración sin reiniciar
promtool check config /etc/prometheus/prometheus.yml
\`\`\`

### 📖 La API de lifecycle y recarga en caliente

\`\`\`bash
# Recargar configuración sin downtime (requiere --web.enable-lifecycle)
curl -X POST http://localhost:9090/-/reload

# Verificar que Prometheus está vivo
curl http://localhost:9090/-/healthy

# Ver targets y su estado
curl http://localhost:9090/api/v1/targets | python3 -m json.tool
\`\`\`

### 📖 Tipos de métricas

Prometheus tiene 4 tipos de métricas:

\`\`\`text
COUNTER   — solo sube (o se reinicia a 0). Ej: requests totales, errores.
GAUGE     — sube y baja. Ej: temperatura, uso de memoria, conexiones activas.
HISTOGRAM — distribuye observaciones en buckets. Ej: latencia de requests.
SUMMARY   — igual que histogram pero calcula percentiles en el cliente.
\`\`\`

\`\`\`text
# HELP http_requests_total The total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="post",code="200"} 1027 1395066363000

# HELP node_memory_MemAvailable_bytes Available memory in bytes.
# TYPE node_memory_MemAvailable_bytes gauge
node_memory_MemAvailable_bytes 8.34e+09

# HELP http_request_duration_seconds A histogram of request durations.
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.005"} 24054
http_request_duration_seconds_bucket{le="0.01"}  33444
http_request_duration_seconds_bucket{le="0.025"} 100392
http_request_duration_seconds_bucket{le="+Inf"}  144320
http_request_duration_seconds_sum   53423
http_request_duration_seconds_count 144320
\`\`\`

### 📋 Lo que debes recordar

* Prometheus usa modelo pull: él consulta a los targets, no al revés.
* Las métricas son series temporales identificadas por nombre + labels.
* La TSDB almacena datos en bloques de 2 horas; los datos recientes están en el WAL.
* \`promtool check config\` valida la configuración antes de aplicarla.

### 🧪 Autoevaluación

1. ¿Por qué el modelo pull de Prometheus detecta automáticamente cuando un servicio muere?
2. ¿Cuál es la diferencia entre un Counter y un Gauge?
3. ¿Para qué sirve el \`--web.enable-lifecycle\` flag?

---

1. Porque Prometheus intenta hacer un HTTP GET al endpoint \`/metrics\` del target en cada intervalo de scrape. Si el servicio está muerto, la conexión falla — Prometheus lo marca como \`down\` inmediatamente. Con modelo push, un servicio muerto simplemente deja de enviar y nadie puede distinguirlo de un servicio que no tiene eventos que reportar.
2. Un Counter solo puede incrementarse (o resetearse a 0 si el proceso reinicia). Representa acumulaciones: total de requests, total de errores, bytes enviados. Un Gauge puede subir y bajar libremente: representa el estado actual — temperatura, memoria disponible, conexiones activas.
3. Habilita un endpoint HTTP \`/-/reload\` que permite recargar la configuración de Prometheus sin reiniciar el proceso. Esto es crucial en producción para aplicar cambios en \`prometheus.yml\` o en las reglas sin interrumpir la recolección de métricas.
`

export default content
