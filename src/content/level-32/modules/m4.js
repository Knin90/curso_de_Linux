const content = `
## Módulo 4 — keepalived y VRRP: failover de IP virtual

### 🎯 Objetivos de aprendizaje

* Entender VRRP y cómo keepalived lo implementa en Linux.
* Configurar una IP virtual (VIP) que migra entre dos nodos HAProxy.
* Entender los estados MASTER y BACKUP y las transiciones entre ellos.
* Usar scripts de tracking para failover basado en la salud de HAProxy.

### ❓ El problema real

Tienes dos instancias de HAProxy para eliminar el SPOF del load balancer. Pero ahora tienes un nuevo problema: ¿qué IP da el DNS a los clientes? Si das la IP de HAProxy-1 y este cae, los clientes están desconectados aunque HAProxy-2 esté sano. La solución es una IP virtual (VIP) que "flota" entre los dos nodos. keepalived implementa esto mediante VRRP.

### 📖 ¿Qué es VRRP?

VRRP (Virtual Router Redundancy Protocol) es un protocolo estándar (RFC 5798) que permite que un grupo de routers/hosts compartan una IP virtual. Solo un nodo tiene la IP en un momento dado (el MASTER). Si el MASTER falla, los nodos BACKUP compiten por tomar la IP.

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Estado normal","icon":"network","rows":["CLIENTES → DNS apunta a 10.0.1.10 (VIP)","MASTER: HAProxy-1 (10.0.1.1) — tiene la VIP asignada","BACKUP: HAProxy-2 (10.0.1.2) — escucha heartbeats VRRP"]},{"title":"Si HAProxy-1 cae","icon":"alert","rows":["HAProxy-2 detecta pérdida de heartbeats VRRP","HAProxy-2 asume la VIP 10.0.1.10","Los clientes siguen conectándose a 10.0.1.10 sin cambios"],"focal":true}],"vsLabel":"FAILOVER"}
\`\`\`

### 📖 Instalación de keepalived

\`\`\`bash
# Debian/Ubuntu
sudo apt install keepalived -y

# RHEL/Rocky
sudo dnf install keepalived -y

# Verificar versión
keepalived --version
\`\`\`

### 📖 Configuración del nodo MASTER (HAProxy-1)

\`\`\`text
# /etc/keepalived/keepalived.conf — nodo MASTER

global_defs {
    router_id HAPROXY_MASTER
    script_user root
    enable_script_security
}

# Script para verificar que HAProxy está vivo
vrrp_script chk_haproxy {
    script "killall -0 haproxy"   # devuelve 0 si haproxy corre
    interval 2                    # cada 2 segundos
    weight   -2                   # resta 2 al priority si falla
    fall     2                    # 2 fallos para marcar KO
    rise     2                    # 2 éxitos para marcar OK
}

vrrp_instance VI_1 {
    state MASTER                  # este nodo empieza como MASTER
    interface eth0                # interfaz de red a usar
    virtual_router_id 51          # ID del grupo VRRP (1-255, igual en todos los nodos)
    priority 101                  # prioridad más alta = MASTER preferido
    advert_int 1                  # intervalo de heartbeat en segundos

    authentication {
        auth_type PASS
        auth_pass s3cur3pass       # misma en todos los nodos del grupo
    }

    virtual_ipaddress {
        10.0.1.10/24 dev eth0 label eth0:1   # la VIP que se asigna
    }

    track_script {
        chk_haproxy               # monitorear HAProxy
    }

    # Notificaciones de cambio de estado
    notify_master "/etc/keepalived/notify.sh MASTER"
    notify_backup "/etc/keepalived/notify.sh BACKUP"
    notify_fault  "/etc/keepalived/notify.sh FAULT"
}
\`\`\`

### 📖 Configuración del nodo BACKUP (HAProxy-2)

\`\`\`text
# /etc/keepalived/keepalived.conf — nodo BACKUP
# Idéntico al MASTER excepto: state y priority

global_defs {
    router_id HAPROXY_BACKUP
    script_user root
    enable_script_security
}

vrrp_script chk_haproxy {
    script "killall -0 haproxy"
    interval 2
    weight   -2
    fall     2
    rise     2
}

vrrp_instance VI_1 {
    state BACKUP                  # ← diferencia: empieza como BACKUP
    interface eth0
    virtual_router_id 51          # ← mismo ID que el MASTER
    priority 100                  # ← diferencia: prioridad menor
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass s3cur3pass       # ← misma contraseña
    }

    virtual_ipaddress {
        10.0.1.10/24 dev eth0 label eth0:1   # ← misma VIP
    }

    track_script {
        chk_haproxy
    }

    notify_master "/etc/keepalived/notify.sh MASTER"
    notify_backup "/etc/keepalived/notify.sh BACKUP"
    notify_fault  "/etc/keepalived/notify.sh FAULT"
}
\`\`\`

### 📖 Script de notificación y verificación

\`\`\`bash
# /etc/keepalived/notify.sh
#!/bin/bash
STATE=\$1
HOSTNAME=$(hostname)
DATE=$(date '+%Y-%m-%d %H:%M:%S')

case \$STATE in
    MASTER)
        echo "[\$DATE] \$HOSTNAME: Asumiendo MASTER (VIP activa)" >> /var/log/keepalived-state.log
        # Opcional: enviar alerta a Slack/PagerDuty
        ;;
    BACKUP)
        echo "[\$DATE] \$HOSTNAME: Pasando a BACKUP" >> /var/log/keepalived-state.log
        ;;
    FAULT)
        echo "[\$DATE] \$HOSTNAME: FAULT detectado" >> /var/log/keepalived-state.log
        ;;
esac

chmod +x /etc/keepalived/notify.sh
\`\`\`

\`\`\`bash
# Iniciar y verificar keepalived
sudo systemctl enable keepalived
sudo systemctl start keepalived
sudo systemctl status keepalived

# Ver la VIP asignada (solo en el MASTER activo)
ip addr show eth0
# Debe mostrar: inet 10.0.1.10/24 scope global secondary eth0:1

# Ver logs de keepalived
journalctl -u keepalived -f

# Ver estado actual de VRRP
sudo journalctl -u keepalived | grep -E "MASTER|BACKUP|FAULT"
\`\`\`

### 📖 Simular failover y verificar

\`\`\`bash
# En HAProxy-1 (MASTER), simular fallo deteniendo HAProxy
sudo systemctl stop haproxy

# En HAProxy-2 (BACKUP), verificar que tomó la VIP
ip addr show eth0 | grep 10.0.1.10
# Debe aparecer la VIP en HAProxy-2

# Verificar log de transición
cat /var/log/keepalived-state.log

# Restaurar HAProxy-1 — debería volver a ser MASTER
sudo systemctl start haproxy
# Esperar ~4 segundos (2 intervalos)
ip addr show eth0 | grep 10.0.1.10
# La VIP vuelve a HAProxy-1 (mayor prioridad)
\`\`\`

### 📋 Lo que debes recordar

* VRRP asigna la VIP al nodo con mayor prioridad activa — si el MASTER cae, el BACKUP sube su prioridad efectiva y toma la IP.
* El \`virtual_router_id\` debe ser idéntico en todos los nodos del grupo (y único en la red).
* El \`weight -2\` del script: si haproxy no corre, la prioridad baja de 101 a 99, menos que el BACKUP (100), provocando el failover.
* keepalived hace preemption por defecto: cuando el MASTER original vuelve, recupera la VIP.

### 🧪 Autoevaluación

1. ¿Por qué el MASTER tiene \`priority 101\` y el BACKUP tiene \`priority 100\`?
2. ¿Qué pasa si keepalived cae en el MASTER pero HAProxy sigue corriendo?
3. ¿Qué es preemption y cuándo podría querer desactivarlo?

---

1. La diferencia de prioridad determina cuál nodo es el MASTER preferido. El nodo con mayor prioridad numérica gana la elección VRRP. Con 101 vs 100, el nodo MASTER siempre recupera la VIP cuando se restaura, siempre que su HAProxy esté activo. Si ambos tuviesen la misma prioridad, el primero en arrancar ganaría y no habría re-failover al restaurar el MASTER original.
2. Si keepalived cae en el MASTER, deja de enviar heartbeats VRRP. El nodo BACKUP detecta la ausencia de heartbeats y asume la VIP. Sin embargo, esto es un falso positivo — HAProxy en el MASTER sigue funcionando pero ya no recibe tráfico. Esta es una razón para usar el script \`chk_haproxy\`: keepalived monitorea HAProxy y hace failover basado en su estado real, no solo en el propio keepalived.
3. Preemption significa que cuando el MASTER original (mayor prioridad) se recupera, automáticamente retoma la VIP del BACKUP. Podría querer desactivarlo (\`nopreempt\`) en casos donde el failover hacia el BACKUP fue costoso (sesiones en progreso) y no quieres otro failback inmediato. Se añade \`nopreempt\` en la sección \`vrrp_instance\` del BACKUP para evitar que el MASTER original recupere la IP al volver.
`

export default content
