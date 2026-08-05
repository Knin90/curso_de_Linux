const content = `
## Módulo 6 — Monitoreo de un cluster HA: métricas y alertas

### 🎯 Objetivos de aprendizaje

* Extraer métricas de HAProxy mediante la página de stats y el socket de administración.
* Identificar las métricas críticas para un cluster HA: errores, latencia y disponibilidad.
* Integrar HAProxy con Prometheus usando haproxy_exporter.
* Configurar alertas básicas para fallos de nodo y degradación de performance.

### ❓ El problema real

Tienes el cluster HA funcionando. ¿Pero cómo sabes si está sano? Un servidor puede estar marcado como DOWN durante horas sin que nadie lo note, hasta que cae un segundo servidor y el tráfico se concentra en uno solo que no puede aguantarlo. El monitoreo proactivo convierte un incidente catastrófico en una alerta que alguien resuelve antes de que los usuarios lo noten.

### 📖 Métricas de HAProxy via stats page

La página de estadísticas de HAProxy expone métricas en formato CSV en \`/stats;csv\`:

\`\`\`bash
# Obtener stats en CSV
curl -s http://admin:password@localhost:8404/stats;csv | head -5

# Formato: pxname,svname,qcur,qmax,scur,smax,slim,stot,bin,bout,...
# pxname = nombre del proxy (frontend/backend)
# svname = nombre del servidor (o FRONTEND/BACKEND)
# scur   = conexiones actuales
# stot   = total de conexiones desde el inicio
# bin    = bytes recibidos
# bout   = bytes enviados
# ereq   = errores de request
# status = UP, DOWN, MAINT, NOLB
\`\`\`

\`\`\`bash
# Script para extraer estado de servidores
#!/bin/bash
curl -s "http://admin:password@localhost:8404/stats;csv" | \
  grep -v "^#" | \
  awk -F',' '{
    if (\$18 != "FRONTEND" && \$18 != "BACKEND")
      printf "%-20s %-15s %s\\n", \$1, \$2, \$18
  }'
# web_servers        web1            UP
# web_servers        web2            UP
# web_servers        web3            DOWN
\`\`\`

### 📖 Socket de administración: comandos útiles

\`\`\`bash
# Estado detallado de todos los servidores
echo "show servers state" | sudo socat stdio /run/haproxy/admin.sock

# Estadísticas en tiempo real
watch -n2 'echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | cut -d, -f1,2,5,7,18'

# Información del proceso
echo "show info" | sudo socat stdio /run/haproxy/admin.sock | grep -E "Uptime|MaxConn|CurrConns|Run_queue"

# Ver sesiones activas
echo "show sess" | sudo socat stdio /run/haproxy/admin.sock | head -20

# Tabla de conexiones persistentes
echo "show table web_servers" | sudo socat stdio /run/haproxy/admin.sock
\`\`\`

### 📖 Integración con Prometheus

\`\`\`bash
# Instalar haproxy_exporter
wget https://github.com/prometheus/haproxy_exporter/releases/download/v0.15.0/haproxy_exporter-0.15.0.linux-amd64.tar.gz
tar xzf haproxy_exporter-0.15.0.linux-amd64.tar.gz
sudo mv haproxy_exporter-0.15.0.linux-amd64/haproxy_exporter /usr/local/bin/

# Crear servicio systemd
sudo tee /etc/systemd/system/haproxy_exporter.service > /dev/null << 'EOF'
[Unit]
Description=HAProxy Exporter for Prometheus
After=network.target

[Service]
Type=simple
User=prometheus
ExecStart=/usr/local/bin/haproxy_exporter \
  --haproxy.scrape-uri="unix:/run/haproxy/admin.sock" \
  --web.listen-address=":9101"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable haproxy_exporter
sudo systemctl start haproxy_exporter
\`\`\`

### 📖 Métricas clave a monitorear

\`\`\`text
MÉTRICA PROMETHEUS                          DESCRIPCIÓN
──────────────────────────────────────────────────────────────────────────
haproxy_backend_up                          1=backend UP, 0=DOWN
haproxy_server_up                           Estado de cada servidor
haproxy_backend_current_sessions            Sesiones activas por backend
haproxy_backend_connection_errors_total     Errores de conexión acumulados
haproxy_backend_response_errors_total       Errores HTTP 5xx desde backends
haproxy_backend_http_responses_total        Respuestas por código HTTP
haproxy_backend_queue_current               Peticiones en cola (indica saturación)
haproxy_frontend_bytes_in_total             Bytes recibidos (tráfico entrante)
haproxy_process_max_fds                     Límite de file descriptors del proceso
\`\`\`

### 📖 Reglas de alerta para Prometheus/Alertmanager

\`\`\`yaml
# /etc/prometheus/rules/haproxy.yml
groups:
  - name: haproxy_alerts
    rules:

      # Backend completamente caído
      - alert: HAProxyBackendDown
        expr: haproxy_backend_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "HAProxy backend {{ \$labels.backend }} está DOWN"
          description: "El backend {{ \$labels.backend }} lleva 1 minuto sin servidores UP."

      # Servidor individual caído
      - alert: HAProxyServerDown
        expr: haproxy_server_up == 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Servidor {{ \$labels.server }} caído en {{ \$labels.backend }}"

      # Alta tasa de errores 5xx
      - alert: HAProxyHighErrorRate
        expr: |
          rate(haproxy_backend_http_responses_total{code="5xx"}[5m]) /
          rate(haproxy_backend_http_responses_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Tasa de errores 5xx > 5% en backend {{ \$labels.backend }}"

      # Cola de peticiones creciendo (backends saturados)
      - alert: HAProxyQueueBuildup
        expr: haproxy_backend_queue_current > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Cola de {{ \$labels.backend }} tiene > 10 peticiones esperando"
\`\`\`

### 📖 Monitoreo de keepalived

\`\`\`bash
# Ver estado actual del VRRP
sudo journalctl -u keepalived --since "1 hour ago" | grep -E "MASTER|BACKUP|FAULT"

# Script de monitoreo de VIP
#!/bin/bash
VIP="10.0.1.10"
if ip addr show | grep -q "\$VIP"; then
    echo "MASTER: Este nodo tiene la VIP \$VIP"
else
    echo "BACKUP: Este nodo NO tiene la VIP"
fi

# Contar cuántas veces ha habido failover (indica inestabilidad)
grep -c "Entering MASTER STATE" /var/log/syslog
\`\`\`

### 📋 Lo que debes recordar

* La página de stats de HAProxy en formato CSV permite scraping sin agentes adicionales.
* \`show servers state\` via socket es la forma más rápida de ver el estado de todos los nodos en producción.
* La métrica más crítica: \`haproxy_backend_up == 0\` — cuando todos los servidores de un backend caen.
* Los failovers frecuentes de keepalived (flapping) indican inestabilidad en la red o en HAProxy — alertar sobre ellos.

### 🧪 Autoevaluación

1. ¿Qué indica la métrica \`haproxy_backend_queue_current > 0\`?
2. ¿Por qué alertar sobre un servidor individual DOWN (severity: warning) y no solo cuando todo el backend está DOWN (severity: critical)?
3. ¿Cómo detectarías que hay flapping en keepalived (el MASTER cambia frecuentemente)?

---

1. Indica que las peticiones entrantes están llegando más rápido de lo que los servidores del backend pueden procesarlas. HAProxy las está poniendo en cola. Si la cola crece sostenidamente, los backends están saturados. Esto precede típicamente a errores 503 (cuando la cola se llena) y es la señal de que se necesita más capacidad o que algo está degradando el rendimiento del backend.
2. Cuando un servidor individual cae, el cluster sigue funcionando con capacidad reducida. Es una advertencia (warning) porque es un problema que debe resolverse antes de que caiga otro servidor. Si esperas a que todo el backend esté DOWN para alertar, ya es demasiado tarde — los usuarios llevan tiempo viendo errores. La alerta temprana de servidor individual permite actuar preventivamente.
3. El flapping se detecta contando el número de transiciones MASTER en los logs de keepalived: \`grep -c "Entering MASTER STATE" /var/log/syslog\`. Más de 1-2 transiciones por hora indica un problema. En Prometheus, se puede crear una alerta con \`increase(keepalived_master_transitions_total[1h]) > 3\` usando el exporter de keepalived. También se puede revisar \`/var/log/keepalived-state.log\` si se configuraron los scripts \`notify_*\`.
`

export default content
