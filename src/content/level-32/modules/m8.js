const content = `
## Módulo 8 — Laboratorio: cluster HA completo con HAProxy y keepalived

### 🎯 Objetivos de aprendizaje
* Configurar HAProxy como balanceador de carga con health checks y página de estadísticas
* Implementar alta disponibilidad de los propios balanceadores con keepalived y VRRP
* Probar failover automático a nivel de backend y a nivel de balanceador
* Monitorear el cluster con logs y comandos de diagnóstico en tiempo real

### ❓ El problema real

La arquitectura de producción de TechCorp tiene un punto único de fallo: un solo nginx sirviendo la aplicación. Tras el último incidente (el servidor cayó y la aplicación estuvo inaccesible 47 minutos), el equipo de infraestructura debe implementar:

- **Balanceo de carga** entre 3 servidores nginx backend
- **HA del propio balanceador**: si lb1 cae, lb2 debe asumir el tráfico en menos de 2 segundos
- **Una IP virtual única** (VIP) que los clientes siempre usan, independientemente de qué balanceador esté activo

**Infraestructura:**
| Host | IP | Rol |
|------|----|-----|
| lb1 | 192.168.1.11 | HAProxy MASTER |
| lb2 | 192.168.1.12 | HAProxy BACKUP |
| backend1 | 192.168.1.21 | nginx app server |
| backend2 | 192.168.1.22 | nginx app server |
| backend3 | 192.168.1.23 | nginx app server |
| VIP | 192.168.1.100 | IP virtual (flotante) |

### 📖 Paso 1 — Configurar HAProxy en ambos balanceadores

La configuración es **idéntica en lb1 y lb2**. HAProxy no necesita saber cuál es el MASTER; keepalived se encarga de eso.

\`\`\`bash
# En lb1 Y lb2 (misma configuración):
sudo nano /etc/haproxy/haproxy.cfg
\`\`\`

Archivo completo de configuración:
\`\`\`
#---------------------------------------------------------------------
# Configuración global
#---------------------------------------------------------------------
global
    log /dev/log    local0
    log /dev/log    local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # Performance
    maxconn 50000
    nbthread 4

#---------------------------------------------------------------------
# Configuración por defecto (heredada por frontends/backends)
#---------------------------------------------------------------------
defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor       except 127.0.0.0/8
    option  redispatch
    retries 3
    timeout connect  5s
    timeout client   30s
    timeout server   30s
    timeout http-request 10s
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http

#---------------------------------------------------------------------
# Frontend: punto de entrada del tráfico externo
#---------------------------------------------------------------------
frontend http_frontend
    bind *:80

    # Cabeceras para identificar el balanceador activo
    http-response add-header X-Load-Balancer lb1

    # ACL para redirigir métricas a stats
    acl is_stats path_beg /haproxy-stats
    use_backend stats_backend if is_stats

    default_backend nginx_backends

#---------------------------------------------------------------------
# Backend: pool de servidores de aplicación
#---------------------------------------------------------------------
backend nginx_backends
    balance roundrobin

    # Health check: cada 2s, necesita 2 respuestas OK para marcar UP,
    # 3 fallos para marcar DOWN
    option httpchk GET /health HTTP/1.1\\r\\nHost:\\ api.empresa.internal
    http-check expect status 200

    server backend1 192.168.1.21:80 check inter 2s rise 2 fall 3
    server backend2 192.168.1.22:80 check inter 2s rise 2 fall 3
    server backend3 192.168.1.23:80 check inter 2s rise 2 fall 3

#---------------------------------------------------------------------
# Página de estadísticas en :8080/stats
#---------------------------------------------------------------------
frontend stats_frontend
    bind *:8080
    stats enable
    stats uri /stats
    stats refresh 5s
    stats show-legends
    stats show-node
    stats auth admin:SecureStatsPass123
    stats admin if LOCALHOST

backend stats_backend
    stats enable
    stats uri /haproxy-stats
    stats refresh 5s
    stats auth admin:SecureStatsPass123
\`\`\`

\`\`\`bash
# Verificar sintaxis de la configuración
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
# Configuration file is valid

# Iniciar HAProxy en ambos nodos
sudo systemctl enable --now haproxy
sudo systemctl status haproxy | grep -E "Active:|Loaded:"
# Loaded: loaded (/lib/systemd/system/haproxy.service; enabled)
# Active: active (running) since...
\`\`\`

### 📖 Paso 2 — Configurar keepalived en lb1 (MASTER)

keepalived implementa el protocolo VRRP para gestionar la IP virtual. El nodo con mayor prioridad se convierte en MASTER y toma la VIP.

\`\`\`bash
# En lb1:
sudo nano /etc/keepalived/keepalived.conf
\`\`\`

\`\`\`
# /etc/keepalived/keepalived.conf — lb1 (MASTER)

global_defs {
    # Identificador único de este router VRRP
    router_id LB1
    script_user root
    enable_script_security
}

# Script para verificar que HAProxy está corriendo
# Si HAProxy cae en el MASTER, keepalived reduce su prioridad
# para que el BACKUP tome la VIP
vrrp_script check_haproxy {
    script "/usr/bin/systemctl is-active haproxy"
    interval 2    # Verificar cada 2 segundos
    weight -30    # Reducir prioridad en 30 si HAProxy cae
    fall 2        # Necesita 2 fallos para activar la penalización
    rise 2        # Necesita 2 éxitos para quitar la penalización
}

vrrp_instance VI_1 {
    state MASTER          # Este nodo empieza como MASTER
    interface eth0        # Interfaz de red donde se aplica la VIP
    virtual_router_id 51  # Debe ser el mismo en lb1 y lb2 (1-255)
    priority 100          # MASTER tiene mayor prioridad (lb2 tendrá 90)
    advert_int 1          # Intervalo de anuncios VRRP (segundos)

    # Autenticación entre pares VRRP (seguridad básica)
    authentication {
        auth_type PASS
        auth_pass VRRPSecret2024
    }

    # La IP virtual que se mueve entre nodos
    virtual_ipaddress {
        192.168.1.100/24 dev eth0 label eth0:vip
    }

    # Aplicar el script de verificación de HAProxy
    track_script {
        check_haproxy
    }

    # Scripts de notificación de cambio de estado
    notify_master "/etc/keepalived/notify.sh MASTER"
    notify_backup "/etc/keepalived/notify.sh BACKUP"
    notify_fault  "/etc/keepalived/notify.sh FAULT"
}
\`\`\`

\`\`\`bash
# Crear script de notificación
sudo tee /etc/keepalived/notify.sh > /dev/null <<'SCRIPT'
#!/bin/bash
STATE=\$1
DATE=\$(date '+%Y-%m-%d %H:%M:%S')
logger -t keepalived "lb1 transitioned to \${STATE} state at \${DATE}"
# Aquí se podría enviar un email, Slack, PagerDuty, etc.
SCRIPT
sudo chmod +x /etc/keepalived/notify.sh
\`\`\`

### 📖 Paso 3 — Configurar keepalived en lb2 (BACKUP)

\`\`\`bash
# En lb2:
sudo nano /etc/keepalived/keepalived.conf
\`\`\`

\`\`\`
# /etc/keepalived/keepalived.conf — lb2 (BACKUP)
# Diferencias respecto a lb1: state BACKUP, priority 90, router_id LB2

global_defs {
    router_id LB2
    script_user root
    enable_script_security
}

vrrp_script check_haproxy {
    script "/usr/bin/systemctl is-active haproxy"
    interval 2
    weight -30
    fall 2
    rise 2
}

vrrp_instance VI_1 {
    state BACKUP          # Este nodo empieza como BACKUP
    interface eth0
    virtual_router_id 51  # Mismo que lb1 — identifica el grupo VRRP
    priority 90           # Menor prioridad que lb1 (100)
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass VRRPSecret2024
    }

    virtual_ipaddress {
        192.168.1.100/24 dev eth0 label eth0:vip
    }

    track_script {
        check_haproxy
    }

    notify_master "/etc/keepalived/notify.sh MASTER"
    notify_backup "/etc/keepalived/notify.sh BACKUP"
    notify_fault  "/etc/keepalived/notify.sh FAULT"
}
\`\`\`

\`\`\`bash
# Iniciar keepalived en ambos nodos
sudo systemctl enable --now keepalived

# Verificar que la VIP está asignada a lb1 (el MASTER)
# En lb1:
ip addr show eth0 | grep -E "inet |eth0:vip"
\`\`\`

**Salida esperada en lb1:**
\`\`\`
    inet 192.168.1.11/24 brd 192.168.1.255 scope global eth0
    inet 192.168.1.100/24 scope global secondary eth0:vip
\`\`\`

**Salida esperada en lb2 (sin VIP):**
\`\`\`
    inet 192.168.1.12/24 brd 192.168.1.255 scope global eth0
\`\`\`

### 📖 Paso 4 — Probar el balanceo de carga

\`\`\`bash
# Enviar 9 peticiones consecutivas y observar el round-robin
for i in \$(seq 1 9); do
    curl -s http://192.168.1.100/ | grep -o "backend[0-9]"
done
\`\`\`

**Salida esperada (round-robin perfecto):**
\`\`\`
backend1
backend2
backend3
backend1
backend2
backend3
backend1
backend2
backend3
\`\`\`

\`\`\`bash
# Ver estadísticas en tiempo real via socket de administración
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | cut -d',' -f1,2,18,19 | column -t -s','

# Abrir la página de estadísticas en el navegador:
# http://192.168.1.100:8080/stats (usuario: admin, contraseña: SecureStatsPass123)
\`\`\`

### 📖 Paso 5 — Probar failover de backend

\`\`\`bash
# Simular caída del backend2
sudo systemctl stop nginx   # Ejecutar en backend2 (192.168.1.22)

# Desde un cliente, monitorear mientras el backend cae
# (en una terminal aparte)
watch -n1 'echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | grep backend | cut -d"," -f1,2,18,19'

# Enviar tráfico continuamente para observar la redistribución
for i in \$(seq 1 20); do
    curl -s http://192.168.1.100/ | grep -o "backend[0-9]"
    sleep 0.5
done
\`\`\`

**Salida esperada (backend2 marcado como DOWN):**
\`\`\`
backend1
backend3
backend1
backend3
backend1
backend3
\`\`\`

\`\`\`bash
# En la página de stats, backend2 aparece en rojo
# Verificar en los logs de HAProxy
sudo tail -20 /var/log/haproxy.log | grep -E "DOWN|UP"
\`\`\`

**Log esperado:**
\`\`\`
Mar 15 15:30:45 lb1 haproxy[1234]: Server nginx_backends/backend2 is DOWN, reason: Layer7 timeout, check duration: 3000ms. 2 active and 1 backup servers left. 0 sessions active, 0 requeued, 0 remaining in queue.
\`\`\`

\`\`\`bash
# Restaurar backend2 y verificar que vuelve a recibir tráfico automáticamente
sudo systemctl start nginx   # En backend2

# HAProxy lo detectará como UP tras 2 health checks exitosos (4 segundos)
sudo tail -5 /var/log/haproxy.log | grep UP
# Server nginx_backends/backend2 is UP, reason: Layer7 check passed
\`\`\`

### 📖 Paso 6 — Probar failover de keepalived (HA del balanceador)

Esta es la prueba más crítica: simular que el balanceador activo cae completamente.

\`\`\`bash
# En una terminal, hacer ping continuo a la VIP para medir el tiempo de corte
ping 192.168.1.100

# En otra terminal, enviar peticiones HTTP continuas
while true; do
    curl -s --max-time 2 http://192.168.1.100/ | grep -o "backend[0-9]" || echo "TIMEOUT"
    sleep 0.2
done

# Ahora, en lb1, detener keepalived
sudo systemctl stop keepalived   # En lb1
\`\`\`

**Observar en el ping:**
\`\`\`
64 bytes from 192.168.1.100: icmp_seq=45 ttl=64 time=0.412 ms
64 bytes from 192.168.1.100: icmp_seq=46 ttl=64 time=0.398 ms
Request timeout for icmp_seq 47           ← lb1 soltó la VIP
64 bytes from 192.168.1.100: icmp_seq=48 ttl=64 time=1.823 ms  ← lb2 tomó la VIP
64 bytes from 192.168.1.100: icmp_seq=49 ttl=64 time=0.445 ms
\`\`\`

El failover tarda menos de 2 segundos (el intervalo de anuncio VRRP es 1 segundo).

\`\`\`bash
# Verificar que la VIP ahora está en lb2
# En lb2:
ip addr show eth0 | grep 192.168.1.100
# inet 192.168.1.100/24 scope global secondary eth0:vip

# Ver el log de keepalived en lb2
sudo journalctl -u keepalived -n 20 --no-pager
\`\`\`

**Log de keepalived en lb2 durante el failover:**
\`\`\`
Mar 15 15:45:01 lb2 Keepalived_vrrp[5678]: VRRP_Instance(VI_1) Transition to MASTER STATE
Mar 15 15:45:01 lb2 Keepalived_vrrp[5678]: VRRP_Instance(VI_1) Entering MASTER STATE
Mar 15 15:45:01 lb2 Keepalived_vrrp[5678]: VRRP_Instance(VI_1) setting protocol VIPs.
Mar 15 15:45:01 lb2 Keepalived_vrrp[5678]: Sending gratuitous ARP on eth0 for 192.168.1.100
\`\`\`

El "gratuitous ARP" actualiza las tablas ARP de todos los dispositivos en la red LAN, dirigiendo el tráfico al nuevo MASTER inmediatamente.

\`\`\`bash
# Restaurar lb1 y verificar que recupera la VIP (preempt por prioridad mayor)
sudo systemctl start keepalived   # En lb1
sleep 3
ip addr show eth0 | grep 192.168.1.100   # En lb1, debe volver a tener la VIP
\`\`\`

### 📖 Paso 7 — Monitoreo del cluster

\`\`\`bash
# ── HAProxy ──────────────────────────────────────────────────────

# Logs en tiempo real
sudo tail -f /var/log/haproxy.log | grep -v "option dontlog"

# Estado completo via socket de administración
echo "show info" | sudo socat stdio /run/haproxy/admin.sock

# Estadísticas de backends (currconn, sessions/s, requests)
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | \
    grep -E "^nginx_backends" | cut -d',' -f1,2,4,7,18,19 | column -t -s','

# Habilitar/deshabilitar un servidor manualmente (drenaje graceful)
echo "disable server nginx_backends/backend1" | sudo socat stdio /run/haproxy/admin.sock
echo "enable server nginx_backends/backend1" | sudo socat stdio /run/haproxy/admin.sock
\`\`\`

\`\`\`bash
# ── keepalived ───────────────────────────────────────────────────

# Seguir eventos de failover en tiempo real
sudo journalctl -u keepalived -f

# Ver estado VRRP actual
sudo journalctl -u keepalived -n 50 --no-pager | grep -E "MASTER|BACKUP|FAULT"

# Verificar que el script de check está funcionando
sudo journalctl -u keepalived | grep check_haproxy
\`\`\`

\`\`\`bash
# ── Verificación de configuración ────────────────────────────────

# Validar configuración de HAProxy sin reiniciar
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
# Configuration file is valid

# Ver qué IP tiene la VIP en este momento
ip addr show | grep "192.168.1.100" && echo "Este nodo tiene la VIP" || echo "VIP en otro nodo"

# Prueba de carga rápida con ab (Apache Benchmark)
ab -n 1000 -c 50 http://192.168.1.100/health
# Requests per second: 3421.50 [#/sec] (mean)
# Time per request: 14.614 [ms] (mean)
\`\`\`

### 📋 Lo que debes recordar
* La configuración de HAProxy es **idéntica en ambos balanceadores** — keepalived decide cuál está activo, no HAProxy
* \`virtual_router_id\` debe coincidir en lb1 y lb2; identifica el grupo VRRP y debe ser único en la red
* El "gratuitous ARP" que envía keepalived al tomar la VIP actualiza las tablas ARP de la red en milisegundos, haciendo el failover casi imperceptible
* \`weight -30\` en el vrrp_script permite que HAProxy caído en el MASTER cause el failover: prioridad 100 - 30 = 70, menor que el BACKUP con 90
* El health check de HAProxy (\`check inter 2s rise 2 fall 3\`) espera: 3 fallos × 2s = 6s para marcar DOWN, 2 éxitos × 2s = 4s para marcar UP
* La página de stats de HAProxy (\`:8080/stats\`) es la herramienta de diagnóstico más rápida en incidentes

### 🧪 Autoevaluación
1. ¿Por qué la configuración de HAProxy es idéntica en lb1 y lb2, y qué componente decide cuál de los dos atiende el tráfico real?
2. ¿Qué sucede si HAProxy cae en lb1 pero keepalived sigue corriendo? ¿Seguirá lb1 teniendo la VIP?
3. ¿Para qué sirve el "gratuitous ARP" que envía keepalived al convertirse en MASTER?

---

1. HAProxy es stateless respecto al balanceo: ambos nodos están preparados para atender tráfico en todo momento. Es keepalived quien, mediante el protocolo VRRP, asigna la IP virtual (VIP) al nodo con mayor prioridad activa. Solo el nodo con la VIP recibe tráfico real de los clientes
2. No, lb1 perderá la VIP. El vrrp_script con \`weight -30\` reduce la prioridad de lb1 de 100 a 70, por debajo de lb2 (90). keepalived detecta el fallo del script en 2 ciclos (4 segundos) y lb2 se convierte en MASTER tomando la VIP
3. El gratuitous ARP es una trama ARP no solicitada que anuncia a todos los dispositivos de la red local que la dirección IP 192.168.1.100 ahora corresponde a la MAC de lb2. Esto actualiza inmediatamente las tablas ARP de switches y clientes, redirigiendo el tráfico al nuevo MASTER sin esperar que expiren las entradas ARP cacheadas
`

export default content
