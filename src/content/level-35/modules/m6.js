const content = `
## Módulo 6 — Recording rules y optimización de Prometheus

### 🎯 Objetivos de aprendizaje

* Entender cuándo y por qué usar recording rules.
* Escribir recording rules que precomputan consultas costosas.
* Configurar retención diferenciada con remote storage o federación.
* Aplicar buenas prácticas de cardinalidad y rendimiento.

### ❓ El problema real

Tu dashboard de Grafana tarda 8 segundos en cargar. Cada panel ejecuta una consulta PromQL compleja sobre millones de series temporales históricas. Con 50 usuarios abriendo el dashboard a la vez, Prometheus se convierte en el cuello de botella de toda la plataforma. Las recording rules resuelven esto: precomputan las consultas costosas en intervalos regulares y guardan el resultado como una nueva métrica simple que se puede consultar al instante.

### 📖 Qué son las recording rules

Una recording rule evalúa una expresión PromQL periódicamente y guarda el resultado como una nueva serie temporal:

\`\`\`yaml
# /etc/prometheus/rules/recording.yml
groups:
  - name: node_recording
    interval: 60s   # evaluar cada minuto
    rules:

      # Precomputar CPU usage para dashboards (consulta frecuente)
      - record: instance:node_cpu_usage:rate5m
        expr: |
          100 - (
            avg by (instance) (
              rate(node_cpu_seconds_total{mode="idle"}[5m])
            ) * 100
          )

      # Precomputar uso de memoria
      - record: instance:node_memory_usage:ratio
        expr: |
          1 - (
            node_memory_MemAvailable_bytes
            /
            node_memory_MemTotal_bytes
          )

      # Precomputar requests por segundo por job
      - record: job:http_requests:rate5m
        expr: |
          sum by (job) (
            rate(http_requests_total[5m])
          )

      # Precomputar error rate
      - record: job:http_errors:rate5m_ratio
        expr: |
          sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum by (job) (rate(http_requests_total[5m]))
\`\`\`

Convención de nombres: \`<nivel_agregación>:<métrica>:<operación>\`

\`\`\`bash
promtool check rules /etc/prometheus/rules/recording.yml
curl -X POST http://localhost:9090/-/reload
\`\`\`

Ahora en dashboards y alertas se usan las métricas precomputadas:

\`\`\`promql
# En lugar de la consulta compleja:
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Usar la recording rule (instantánea):
instance:node_cpu_usage:rate5m
\`\`\`

### 📖 Cuándo usar recording rules

\`\`\`text
USA recording rules cuando:
  ✓ La consulta tarda >1s en responder
  ✓ La consulta se usa en múltiples dashboards o alertas
  ✓ Necesitas calcular sobre ventanas de tiempo largas (1h, 6h, 24h)
  ✓ La consulta implica alta cardinalidad (millones de series)
  ✓ Necesitas histórico de un valor agregado

NO uses recording rules para:
  ✗ Consultas ad-hoc de debugging (son de un solo uso)
  ✗ Métricas con cardinalidad muy baja (ya son rápidas)
  ✗ Valores que cambian con filtros dinámicos (variables de Grafana)
\`\`\`

### 📖 El problema de cardinalidad

La cardinalidad es el número total de series únicas en Prometheus. Cada combinación única de labels crea una nueva serie:

\`\`\`text
http_requests_total{method="GET", status="200", handler="/api/users"}  → 1 serie
http_requests_total{method="POST", status="200", handler="/api/users"} → 1 serie
... con 10 métodos × 10 status × 1000 handlers = 100,000 series
\`\`\`

**Antipatrones de alta cardinalidad:**

\`\`\`text
# MAL: usar userId como label → millones de series
http_requests_total{user_id="12345"}

# MAL: usar IP del cliente como label
http_requests_total{client_ip="1.2.3.4"}

# MAL: usar timestamps en labels
cache_hits_total{timestamp="2024-01-15T10:30:00"}

# BIEN: agrupar en buckets o usar solo labels de baja cardinalidad
http_requests_total{endpoint="/api/users", method="GET", status="200"}
\`\`\`

\`\`\`bash
# Ver las métricas con mayor cardinalidad
curl -s http://localhost:9090/api/v1/label/__name__/values | \
  python3 -c "
import json, sys, subprocess
names = json.load(sys.stdin)['data']
for name in sorted(names)[:20]:
    print(name)
"

# Contar series totales
curl -s 'http://localhost:9090/api/v1/query?query=count({__name__!=\"\"})' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['result'][0]['value'][1])"
\`\`\`

### 📖 Optimización de scrape

\`\`\`yaml
# Ajustar scrape_interval por job según necesidad real
scrape_configs:
  # Infraestructura crítica: cada 15s
  - job_name: 'node'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9100']

  # Base de datos: cada 30s es suficiente
  - job_name: 'postgresql'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:9187']

  # Servicios de baja prioridad: cada 60s
  - job_name: 'batch_jobs'
    scrape_interval: 60s
    static_configs:
      - targets: ['localhost:9200']

  # Filtrar métricas costosas que no usas
  - job_name: 'node_filtered'
    static_configs:
      - targets: ['app-01:9100']
    metric_relabel_configs:
      # Descartar métricas de filesystems temporales
      - source_labels: [__name__, mountpoint]
        regex: 'node_filesystem.*;/dev/shm|/run'
        action: drop
\`\`\`

### 📖 Configuración de almacenamiento y retención

\`\`\`bash
# Ajustar retención y tamaño máximo de almacenamiento
/usr/local/bin/prometheus \
  --storage.tsdb.retention.time=90d \
  --storage.tsdb.retention.size=50GB \
  --storage.tsdb.path=/var/lib/prometheus

# Ver uso actual de almacenamiento
du -sh /var/lib/prometheus/
ls -la /var/lib/prometheus/

# Compactar manualmente (normalmente automático)
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot
\`\`\`

Para retención a largo plazo, la solución recomendada es Thanos o Cortex, o simplemente exportar a un sistema de almacenamiento externo con remote_write:

\`\`\`yaml
remote_write:
  - url: "https://prometheus-remote.empresa.com/api/v1/write"
    queue_config:
      capacity: 10000
      max_shards: 200
\`\`\`

### 📋 Lo que debes recordar

* La convención de nombres para recording rules es \`nivel:métrica:operación\`.
* Nunca usar valores de alta cardinalidad (user_id, IP, timestamp) como labels.
* \`metric_relabel_configs\` permite descartar métricas no deseadas en el scrape para reducir cardinalidad.
* Las recording rules se consultan igual que cualquier otra métrica — son series temporales normales.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`relabel_configs\` y \`metric_relabel_configs\`?
2. ¿Por qué usar \`user_id\` como label en Prometheus es un antipatrón?
3. Escribe una recording rule que precompute el P99 de latencia por handler.

---

1. \`relabel_configs\` se aplica a los targets antes de hacer el scrape — manipula los labels del target en sí (como \`__address__\`, \`instance\`, \`job\`). Se usa para renombrar instancias, filtrar qué targets scrapeear, o extraer información de la dirección. \`metric_relabel_configs\` se aplica a cada muestra individual después del scrape — se usa para descartar métricas específicas, renombrar nombres de métricas, o filtrar series por labels.
2. Porque crea una serie temporal por cada usuario único. Con 1 millón de usuarios, eso son 1 millón de series para esa sola métrica. Prometheus mantiene todo el índice en memoria RAM para búsquedas rápidas, y 1M de series por métrica consume gigabytes de RAM y hace que las consultas sean extremadamente lentas. Los labels deben tener baja cardinalidad — idealmente menos de 1000 valores únicos.
3. \`record: handler:http_request_duration_p99:rate5m\` con expr: \`histogram_quantile(0.99, sum by (le, handler) (rate(http_request_duration_seconds_bucket[5m])))\`. Nota importante: para que \`histogram_quantile\` funcione en una recording rule, se debe incluir \`le\` en el \`by\` clause porque los buckets del histograma necesitan ese label para calcular el percentil.
`

export default content
