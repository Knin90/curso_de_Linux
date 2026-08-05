const content = `
## Módulo 3 — PromQL: consultas básicas y avanzadas

### 🎯 Objetivos de aprendizaje

* Leer y escribir consultas PromQL para métricas básicas.
* Usar funciones esenciales: \`rate()\`, \`irate()\`, \`increase()\`, \`sum()\`, \`avg()\`.
* Filtrar y agrupar series temporales con selectores y operadores de agregación.
* Construir consultas para casos de uso reales: latencia, saturación, errores.

### ❓ El problema real

Prometheus almacena miles de series temporales. Para extraer información útil — "¿cuántos requests por segundo tiene el endpoint /api?" o "¿qué porcentaje de CPU consume cada servidor?" — necesitas PromQL. Sin dominar la diferencia entre \`rate()\` e \`irate()\`, o entre \`sum by\` y \`sum without\`, tus consultas retornarán resultados incorrectos o incompletos.

### 📖 Selectores de series temporales

\`\`\`promql
# Selector básico: todas las series con este nombre
http_requests_total

# Con filtro por label (equality)
http_requests_total{job="api-server"}

# Múltiples filtros
http_requests_total{job="api-server", status="200"}

# Operadores de label matching:
# =   igual exacto
# !=  distinto
# =~  regex match
# !~  regex no match

http_requests_total{status=~"5.."}          # cualquier 5xx
http_requests_total{handler!="/healthz"}    # excluir healthcheck
http_requests_total{job=~"api|web"}         # api o web
\`\`\`

### 📖 Rangos de tiempo y funciones sobre counters

Los counters solo suben. Para calcular una tasa de cambio, necesitas un rango temporal:

\`\`\`promql
# Vector de rango: últimas 5 minutos de muestras para cada serie
http_requests_total[5m]

# rate(): tasa de cambio por segundo promediada en el rango
# SIEMPRE usar rate() con counters para gráficos suaves
rate(http_requests_total[5m])

# irate(): tasa instantánea (últimos 2 puntos del rango)
# Más reactivo, más ruidoso. Útil para alertas de spike
irate(http_requests_total[5m])

# increase(): incremento total en el período (no por segundo)
# útil para dashboards "requests en la última hora"
increase(http_requests_total[1h])
\`\`\`

**Regla práctica:** para gráficos de tendencia usa \`rate()\`. Para alertas de pico puntual usa \`irate()\`.

### 📖 Operadores de agregación

\`\`\`promql
# sum: total de requests por segundo en todos los jobs
sum(rate(http_requests_total[5m]))

# sum by: total agrupado por job
sum by (job) (rate(http_requests_total[5m]))

# sum without: total sin el label "instance" (agrupa todo lo demás)
sum without (instance) (rate(http_requests_total[5m]))

# avg: latencia promedio por handler
avg by (handler) (http_request_duration_seconds_sum / http_request_duration_seconds_count)

# max: pico de uso de CPU entre todos los nodos
max by (job) (rate(node_cpu_seconds_total{mode="user"}[5m]))

# topk: los 5 endpoints más lentos
topk(5, avg by (handler) (http_request_duration_seconds_sum / http_request_duration_seconds_count))

# count: número de instancias vivas de cada job
count by (job) (up == 1)
\`\`\`

### 📖 Aritmética y operaciones entre métricas

\`\`\`promql
# Porcentaje de CPU en uso (1 - idle)
1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))

# Porcentaje de memoria usada
1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

# Porcentaje de disco usado
1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})

# Error rate: proporción de 5xx sobre total
sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
sum(rate(http_requests_total[5m]))

# P99 de latencia (percentil 99 desde histogram)
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
\`\`\`

### 📖 Consultas para los 4 golden signals

Los 4 golden signals de SRE son Latencia, Tráfico, Errores y Saturación:

\`\`\`promql
# ── LATENCIA ────────────────────────────────────────────────────

# P50 (mediana) de latencia
histogram_quantile(0.50, sum by (le, handler) (rate(http_request_duration_seconds_bucket[5m])))

# P99 de latencia
histogram_quantile(0.99, sum by (le, handler) (rate(http_request_duration_seconds_bucket[5m])))

# ── TRÁFICO ─────────────────────────────────────────────────────

# Requests por segundo totales
sum(rate(http_requests_total[5m]))

# Requests por segundo por endpoint
sum by (handler) (rate(http_requests_total[5m]))

# ── ERRORES ─────────────────────────────────────────────────────

# Error rate global
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Tasa de errores absoluta (errores por segundo)
sum by (handler) (rate(http_requests_total{status=~"5.."}[5m]))

# ── SATURACIÓN ──────────────────────────────────────────────────

# CPU usage %
100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))

# Memoria usada %
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

# Conexiones de PostgreSQL (vs máximo configurado)
sum(pg_stat_activity_count) / pg_settings_max_connections
\`\`\`

### 📖 Funciones útiles adicionales

\`\`\`promql
# absent(): alerta si la métrica no existe (servicio muerto)
absent(up{job="api-server"})

# changes(): cuántas veces cambió el valor (reinicios de proceso)
changes(process_start_time_seconds[1h])

# delta(): diferencia entre primer y último valor de un gauge
delta(node_memory_MemFree_bytes[1h])

# predict_linear(): predicción lineal (¿cuándo se llenará el disco?)
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 4 * 3600)
# Retorna el espacio proyectado en 4 horas, con tendencia de las últimas 6h
# Si el valor < 0, el disco se llenará en menos de 4 horas

# time(): timestamp Unix actual (útil para calcular antigüedad)
time() - process_start_time_seconds   # uptime del proceso en segundos
\`\`\`

### 📋 Lo que debes recordar

* Usa \`rate()\` para graficar counters; \`irate()\` para alertas de pico.
* \`sum by (label)\` agrupa los resultados; \`sum without (label)\` descarta ese label y agrupa el resto.
* \`histogram_quantile(0.99, ...)\` calcula percentiles desde métricas de tipo histogram.
* \`predict_linear()\` es imprescindible para alertas proactivas de disco lleno.

### 🧪 Autoevaluación

1. ¿Por qué no tiene sentido hacer \`rate(node_memory_MemAvailable_bytes[5m])\`?
2. ¿Qué diferencia hay entre \`sum by (job)\` y \`sum without (instance)\`?
3. Escribe la consulta PromQL para calcular el P95 de latencia por handler.

---

1. Porque \`rate()\` está diseñada para counters: métricas que solo suben. \`node_memory_MemAvailable_bytes\` es un gauge que sube y baja. Para gauges se usa directamente el valor, o \`delta()\` para ver cambios, o \`avg_over_time()\` para promedios temporales.
2. \`sum by (job)\` conserva solo el label \`job\` en el resultado — todas las demás dimensiones se colapsan. \`sum without (instance)\` conserva todos los labels excepto \`instance\`. Si los labels son \`{job, instance, handler}\`, el resultado de \`by (job)\` tiene solo \`{job}\` y el de \`without (instance)\` tiene \`{job, handler}\`.
3. \`histogram_quantile(0.95, sum by (le, handler) (rate(http_request_duration_seconds_bucket[5m])))\` — se incluye \`le\` en el \`by\` porque \`histogram_quantile\` necesita las series de buckets organizadas por ese label para calcular el percentil.
`

export default content
