const content = `
## Módulo 7 — Monitoreo de aplicaciones: métricas custom y client libraries

### 🎯 Objetivos de aprendizaje
* Distinguir entre métricas de infraestructura y métricas de negocio
* Conocer los cuatro tipos de métricas de Prometheus y cuándo usar cada uno
* Instrumentar una aplicación Python y una aplicación Node.js con sus clientes oficiales
* Aplicar convenciones de nomenclatura y evitar el problema de alta cardinalidad en labels
* Configurar recording rules para acelerar dashboards de uso frecuente

---

### ❓ El problema real

Tu stack de Prometheus monitorea CPU, memoria y disco de tus servidores. Todo verde.
Sin embargo, los usuarios reportan que la aplicación va lenta y que algunas operaciones
fallan. Las métricas de infraestructura no te dicen si el endpoint /checkout está tardando
3 segundos, cuántos pedidos se están procesando por minuto, o cuántos errores 500 está
retornando la API.

Para responder esas preguntas necesitas instrumentar tu propia aplicación con métricas custom.

---

### 📖 Los cuatro tipos de métricas de Prometheus

**Counter — monotonically increasing**

Solo puede incrementar (o reiniciarse a cero al reiniciar el proceso).
Úsalo para contar eventos: peticiones, errores, bytes transferidos.
Para obtener la tasa de cambio siempre usa \`rate()\`.

\`\`\`
http_requests_total         # total de peticiones desde inicio
http_errors_total           # total de errores 5xx
payments_processed_total    # total de pagos procesados
\`\`\`

Nunca leas un counter directamente en un dashboard — siempre usa \`rate(metric[5m])\`.

**Gauge — puede subir y bajar**

Representa un valor que fluctúa: conexiones activas, temperatura, uso de memoria.
Se lee directamente sin \`rate()\`.

\`\`\`
active_connections          # conexiones TCP actuales
queue_size_bytes            # tamaño actual de la cola de trabajo
cache_hit_ratio             # ratio de aciertos de caché (0.0–1.0)
\`\`\`

**Histogram — distribución de observaciones en buckets**

Mide la distribución de valores continuos: duración de requests, tamaño de respuestas.
Prometheus crea automáticamente tres series: \`_bucket\`, \`_sum\`, \`_count\`.
Usa \`histogram_quantile()\` para calcular percentiles (p50, p95, p99).

\`\`\`
request_duration_seconds_bucket{le="0.1"}   # requests < 100ms
request_duration_seconds_bucket{le="0.5"}   # requests < 500ms
request_duration_seconds_bucket{le="1.0"}   # requests < 1s
request_duration_seconds_bucket{le="+Inf"}  # todos los requests (= _count)
request_duration_seconds_sum                # suma de todas las duraciones
request_duration_seconds_count              # número total de requests
\`\`\`

**Summary — cuantiles calculados en el cliente**

Similar al histogram pero los cuantiles se calculan en la aplicación, no en Prometheus.
Ventaja: no requiere \`histogram_quantile()\`. Desventaja: no se pueden agregar entre instancias.
Para sistemas distribuidos, prefiere siempre Histogram sobre Summary.

---

### 📖 Instrumentación en Python (prometheus_client)

**Instalación:**
\`\`\`bash
pip install prometheus-client
\`\`\`

**Counter:**
\`\`\`python
from prometheus_client import Counter

http_requests = Counter(
    'http_requests_total',
    'Total de peticiones HTTP',
    ['method', 'status']
)

# Uso en el handler
http_requests.labels(method='GET', status='200').inc()
http_requests.labels(method='POST', status='500').inc()
\`\`\`

**Gauge:**
\`\`\`python
from prometheus_client import Gauge

active_connections = Gauge(
    'active_connections',
    'Número de conexiones activas'
)

active_connections.set(42)   # establecer valor
active_connections.inc()     # incrementar en 1
active_connections.dec()     # decrementar en 1
active_connections.inc(5)    # incrementar en N
\`\`\`

**Histogram:**
\`\`\`python
from prometheus_client import Histogram

request_duration = Histogram(
    'request_duration_seconds',
    'Duración de requests HTTP',
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# Uso manual
request_duration.observe(0.34)

# O con context manager (mide automáticamente)
with request_duration.time():
    result = process_request()
\`\`\`

**Exponer las métricas (servidor HTTP standalone):**
\`\`\`python
from prometheus_client import start_http_server

if __name__ == '__main__':
    start_http_server(8000)   # métricas en http://localhost:8000/metrics
    while True:
        time.sleep(1)
\`\`\`

**Exponer las métricas en Flask/Django (WSGI):**
\`\`\`python
from prometheus_client import make_wsgi_app
from werkzeug.middleware.dispatcher import DispatcherMiddleware

app = Flask(__name__)
app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    '/metrics': make_wsgi_app()
})
\`\`\`

---

### 📖 Instrumentación en Node.js (prom-client)

**Instalación:**
\`\`\`bash
npm install prom-client
\`\`\`

**Configuración del registro y métricas por defecto:**
\`\`\`js
const client = require('prom-client')
const register = new client.Registry()

// Métricas por defecto de Node.js (heap, GC, event loop lag)
client.collectDefaultMetrics({ register })
\`\`\`

**Counter:**
\`\`\`js
const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total de peticiones HTTP',
    labelNames: ['method', 'status_code'],
    registers: [register]
})

// Uso en middleware Express
app.use((req, res, next) => {
    res.on('finish', () => {
        httpRequestsTotal.labels(req.method, String(res.statusCode)).inc()
    })
    next()
})
\`\`\`

**Histogram:**
\`\`\`js
const requestDuration = new client.Histogram({
    name: 'request_duration_seconds',
    help: 'Duración de requests HTTP en segundos',
    labelNames: ['method', 'route'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register]
})

// Medir duración
app.use((req, res, next) => {
    const end = requestDuration.startTimer()
    res.on('finish', () => {
        end({ method: req.method, route: req.route?.path || 'unknown' })
    })
    next()
})
\`\`\`

**Endpoint /metrics en Express:**
\`\`\`js
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
})
\`\`\`

---

### 📖 Convenciones de nomenclatura

El formato estándar es:

\`\`\`
namespace_subsystem_name_unit
\`\`\`

| Componente | Descripción | Ejemplo |
|---|---|---|
| namespace | nombre de la aplicación o empresa | myapp, acme |
| subsystem | componente o servicio | http, db, queue |
| name | qué se mide | requests, duration, errors |
| unit | unidad de medida (solo para Gauge/Histogram) | seconds, bytes, total |

**Ejemplos correctos:**
\`\`\`
myapp_http_requests_total           # counter
myapp_http_request_duration_seconds # histogram
myapp_db_connections_active         # gauge
myapp_queue_messages_total          # counter
\`\`\`

**Reglas adicionales:**
- Los counters deben terminar en \`_total\`
- Los histograms y summaries no incluyen unidad en el nombre base (se agrega en los sufijos \`_bucket\`, \`_sum\`, \`_count\`)
- Nunca incluir el tipo de métrica en el nombre (\`request_counter\` es incorrecto)

---

### 📖 Alta cardinalidad en labels: el principal error

Los labels multiplican las series de tiempo almacenadas. Alta cardinalidad destruye el rendimiento de Prometheus.

**Labels de baja cardinalidad (correcto):**
\`\`\`
method          → GET, POST, PUT, DELETE         (4 valores)
status_code     → 200, 201, 400, 404, 500        (~10 valores)
endpoint        → /login, /checkout, /api/users  (~20 valores)
region          → us-east, eu-west, ap-south     (~5 valores)
\`\`\`

**Labels de alta cardinalidad (NUNCA usar):**
\`\`\`
user_id         → millones de valores únicos
request_id      → único por petición
url             → incluye parámetros de query (infinito)
ip_address      → miles de clientes distintos
\`\`\`

Si tienes 1M de usuarios y usas \`user_id\` como label, Prometheus creará 1M de series
de tiempo para cada métrica. El sistema colapsará.

---

### 📖 Recording rules: dashboards rápidos

Las recording rules pre-computan expresiones PromQL costosas y guardan el resultado
como una nueva métrica. Los dashboards leen la métrica pre-computada en lugar de
recalcular sobre datos históricos en cada carga.

**Ejemplo de recording rule en prometheus.yml:**
\`\`\`yaml
rule_files:
  - "rules/recording-rules.yml"
\`\`\`

**rules/recording-rules.yml:**
\`\`\`yaml
groups:
  - name: http_recording_rules
    interval: 30s
    rules:
      - record: job:http_requests:rate5m
        expr: rate(http_requests_total[5m])

      - record: job:http_errors:rate5m
        expr: rate(http_requests_total{status_code=~"5.."}[5m])

      - record: job:http_request_duration:p95
        expr: histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))
\`\`\`

El dashboard consulta \`job:http_requests:rate5m\` en lugar de recomputar
\`rate(http_requests_total[5m])\` sobre millones de puntos históricos.

---

### 📖 Métricas de JVM y Go (exporters específicos)

**JVM con jmx_exporter:**
\`\`\`bash
# Descargar como Java agent
java -javaagent:jmx_prometheus_javaagent.jar=8080:config.yml -jar myapp.jar
\`\`\`

Expone automáticamente: heap usado, GC pausas, threads activos, class loading.

**Go con promhttp:**
\`\`\`go
import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

http.Handle("/metrics", promhttp.Handler())
http.ListenAndServe(":8080", nil)
\`\`\`

Go expone automáticamente: goroutines, heap, GC, memoria del runtime.

---

### 📋 Lo que debes recordar
* Counter solo crece — usa siempre \`rate()\` en dashboards, nunca el valor raw
* Histogram permite calcular percentiles (p95, p99) con \`histogram_quantile()\` en el servidor
* Summary calcula cuantiles en el cliente — no se puede agregar entre instancias
* Los labels de alta cardinalidad (user_id, URL completa) destruyen el rendimiento de Prometheus
* Las recording rules pre-computan queries costosas para acelerar dashboards

### 🧪 Autoevaluación
1. Tienes una métrica \`http_requests_total\` con label \`user_id\`. Tu aplicación tiene 500,000 usuarios activos. ¿Cuál es el problema y cómo lo resolverías?
2. ¿Cuándo usarías un Gauge en lugar de un Counter? Da un ejemplo concreto de cada tipo para un sistema de colas de mensajes.
3. La expresión \`histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))\` se evalúa en cada carga del dashboard y tarda 8 segundos. ¿Cómo lo optimizas?

---

1. Con 500,000 valores distintos de user_id, Prometheus crearía 500,000 series de tiempo solo para esa métrica. Con múltiples métricas, el almacenamiento y la ingesta colapsan. La solución es eliminar el label user_id de las métricas de Prometheus — si necesitas analizar comportamiento por usuario, esos datos van a un sistema analítico (ClickHouse, BigQuery), no a Prometheus. En Prometheus solo se incluyen labels de baja cardinalidad como status_code, method o endpoint.
2. Counter para cosas que solo aumentan: mensajes encolados en total desde el inicio. Gauge para el estado actual que fluctúa: mensajes pendientes en la cola en este momento. Ejemplo: \`queue_messages_total\` (counter, mide throughput con rate()) y \`queue_messages_pending\` (gauge, mide profundidad actual de la cola).
3. Creas una recording rule que pre-computa la expresión cada 30 segundos y la guarda como \`job:request_duration:p95_5m\`. El dashboard consulta esa métrica pre-computada en lugar de recalcular la expresión completa, reduciendo el tiempo de carga de 8 segundos a milisegundos.
`

export default content
