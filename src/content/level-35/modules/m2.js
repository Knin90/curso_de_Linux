const content = `
## Módulo 2 — Exporters: node_exporter, nginx, postgres, redis

### 🎯 Objetivos de aprendizaje

* Instalar y configurar node_exporter para métricas del sistema operativo.
* Usar exporters para nginx, PostgreSQL y Redis.
* Entender qué métricas expone cada exporter y cuáles son las más útiles.
* Configurar Prometheus para scrape múltiples exporters con labels descriptivos.

### ❓ El problema real

Prometheus sabe recoger métricas, pero nginx, PostgreSQL y Redis no hablan el formato de Prometheus de forma nativa. Los exporters son el puente: corren junto al servicio que monitorizan, leen sus estadísticas internas (por archivo, socket, API o protocolo propio) y las re-exponen en formato Prometheus en un puerto HTTP. Sin exporters, solo puedes monitorizar lo que tú mismo instrumentas.

### 📖 node_exporter — métricas del sistema operativo

node_exporter expone métricas de CPU, memoria, disco, red y más desde el sistema operativo Linux.

\`\`\`bash
# Instalar node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvf node_exporter-1.7.0.linux-amd64.tar.gz
sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter
\`\`\`

\`\`\`ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
  --collector.systemd \
  --collector.processes
Restart=always

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
sudo systemctl enable --now node_exporter
# Verificar: expone métricas en :9100/metrics
curl -s http://localhost:9100/metrics | head -40
\`\`\`

**Métricas clave de node_exporter:**

\`\`\`text
node_cpu_seconds_total{mode="idle|user|system|iowait"}  ← CPU por modo
node_memory_MemAvailable_bytes                           ← memoria disponible
node_memory_MemTotal_bytes                               ← memoria total
node_filesystem_avail_bytes{mountpoint="/"}              ← espacio en disco
node_disk_io_time_seconds_total{device="sda"}            ← I/O de disco
node_network_receive_bytes_total{device="eth0"}          ← bytes recibidos
node_load1, node_load5, node_load15                      ← carga del sistema
node_systemd_unit_state{name="nginx.service"}            ← estado de servicios
\`\`\`

### 📖 nginx_exporter — métricas del servidor web

nginx_exporter lee el endpoint \`stub_status\` de nginx.

\`\`\`nginx
# Habilitar stub_status en nginx.conf
server {
    listen 127.0.0.1:8080;
    location /stub_status {
        stub_status;
        allow 127.0.0.1;
        deny all;
    }
}
\`\`\`

\`\`\`bash
# Instalar nginx-prometheus-exporter
wget https://github.com/nginxinc/nginx-prometheus-exporter/releases/download/v0.11.0/nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz
tar xvf nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz
sudo mv nginx-prometheus-exporter /usr/local/bin/
\`\`\`

\`\`\`ini
# /etc/systemd/system/nginx_exporter.service
[Unit]
Description=NGINX Prometheus Exporter
After=network.target

[Service]
User=www-data
ExecStart=/usr/local/bin/nginx-prometheus-exporter \
  -nginx.scrape-uri=http://127.0.0.1:8080/stub_status
Restart=always

[Install]
WantedBy=multi-user.target
\`\`\`

**Métricas clave:**
\`\`\`text
nginx_connections_active    ← conexiones activas ahora
nginx_connections_waiting   ← conexiones en keep-alive
nginx_http_requests_total   ← requests totales (counter)
\`\`\`

### 📖 postgres_exporter — métricas de PostgreSQL

\`\`\`bash
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz
tar xvf postgres_exporter-0.15.0.linux-amd64.tar.gz
sudo mv postgres_exporter-0.15.0.linux-amd64/postgres_exporter /usr/local/bin/
\`\`\`

\`\`\`bash
# Crear usuario de monitoreo en PostgreSQL
sudo -u postgres psql -c "CREATE USER prometheus WITH PASSWORD 'secret' CONNECTION LIMIT 5;"
sudo -u postgres psql -c "GRANT pg_monitor TO prometheus;"
\`\`\`

\`\`\`bash
# /etc/default/postgres_exporter
DATA_SOURCE_NAME="postgresql://prometheus:secret@localhost:5432/postgres?sslmode=disable"
\`\`\`

\`\`\`ini
# /etc/systemd/system/postgres_exporter.service
[Unit]
Description=PostgreSQL Prometheus Exporter
After=postgresql.service

[Service]
User=postgres
EnvironmentFile=/etc/default/postgres_exporter
ExecStart=/usr/local/bin/postgres_exporter
Restart=always

[Install]
WantedBy=multi-user.target
\`\`\`

**Métricas clave:**
\`\`\`text
pg_up                                     ← postgres está vivo (0/1)
pg_database_size_bytes{datname="mydb"}    ← tamaño de la base de datos
pg_stat_activity_count{state="active"}   ← conexiones activas
pg_stat_bgwriter_buffers_clean_total      ← eficiencia del bgwriter
pg_locks_count{mode="ExclusiveLock"}      ← locks activos
\`\`\`

### 📖 redis_exporter — métricas de Redis

\`\`\`bash
wget https://github.com/oliver006/redis_exporter/releases/download/v1.58.0/redis_exporter-v1.58.0.linux-amd64.tar.gz
tar xvf redis_exporter-v1.58.0.linux-amd64.tar.gz
sudo mv redis_exporter-v1.58.0.linux-amd64/redis_exporter /usr/local/bin/
\`\`\`

\`\`\`ini
# /etc/systemd/system/redis_exporter.service
[Unit]
Description=Redis Prometheus Exporter
After=redis.service

[Service]
User=redis
ExecStart=/usr/local/bin/redis_exporter \
  --redis.addr=redis://localhost:6379
Restart=always

[Install]
WantedBy=multi-user.target
\`\`\`

**Métricas clave:**
\`\`\`text
redis_up                           ← redis está vivo
redis_connected_clients            ← clientes conectados
redis_memory_used_bytes            ← memoria usada por Redis
redis_keyspace_hits_total          ← hits en caché (counter)
redis_keyspace_misses_total        ← misses (counter)
redis_commands_processed_total     ← comandos procesados
redis_blocked_clients              ← clientes en BLPOP/BRPOP
\`\`\`

### 📖 Configurar Prometheus para múltiples exporters

\`\`\`yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['web-01:9100', 'db-01:9100', 'cache-01:9100']
        labels:
          env: 'production'
    relabel_configs:
      - source_labels: [__address__]
        regex: '([^:]+):.*'
        target_label: hostname
        replacement: '\${1}'

  - job_name: 'nginx'
    static_configs:
      - targets: ['web-01:9113']
        labels:
          env: 'production'
          role: 'web'

  - job_name: 'postgresql'
    static_configs:
      - targets: ['db-01:9187']
        labels:
          env: 'production'
          role: 'database'

  - job_name: 'redis'
    static_configs:
      - targets: ['cache-01:9121']
        labels:
          env: 'production'
          role: 'cache'
\`\`\`

\`\`\`bash
# Verificar que todos los targets están UP
curl -s http://localhost:9090/api/v1/targets | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data['data']['activeTargets']:
    print(t['labels']['job'], t['labels'].get('instance'), t['health'])
"
\`\`\`

### 📋 Lo que debes recordar

* node_exporter necesita el flag \`--collector.systemd\` para exponer el estado de servicios systemd.
* postgres_exporter necesita un usuario con rol \`pg_monitor\` — nunca usar el superusuario.
* nginx_exporter requiere habilitar \`stub_status\` en nginx primero.
* Los labels como \`env\`, \`role\`, y \`hostname\` en scrape_configs son fundamentales para filtrar en PromQL.

### 🧪 Autoevaluación

1. ¿Por qué nginx_exporter necesita que nginx tenga \`stub_status\` habilitado?
2. ¿Qué privilegios necesita el usuario de postgres para postgres_exporter?
3. ¿Cómo calculo el hit rate de Redis usando las métricas de redis_exporter?

---

1. Porque nginx no expone sus estadísticas internas por defecto. El módulo \`stub_status\` habilita un endpoint HTTP que muestra conexiones activas, requests totales y conexiones en distintos estados. nginx_exporter hace un GET a ese endpoint, parsea el texto plano y lo convierte a formato Prometheus. Sin \`stub_status\`, nginx_exporter no tiene datos que leer.
2. El rol \`pg_monitor\`, disponible desde PostgreSQL 10. Este rol de solo lectura da acceso a vistas de monitoreo del sistema (\`pg_stat_activity\`, \`pg_stat_bgwriter\`, etc.) sin permisos de superusuario. El comando es: \`GRANT pg_monitor TO prometheus;\`
3. Con la función \`rate()\` en PromQL: \`rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))\`. Esto da un valor entre 0 y 1 que representa el porcentaje de requests que se resuelven desde caché en los últimos 5 minutos.
`

export default content
