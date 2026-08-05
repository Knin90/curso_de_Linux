const content = `
## Módulo 6 — /proc/net e internals del stack TCP/IP

### 🎯 Objetivos de aprendizaje

* Leer e interpretar los archivos más importantes de \`/proc/net/\`.
* Decodificar el formato hexadecimal de \`/proc/net/tcp\` y \`/proc/net/route\`.
* Comprender y ajustar parámetros \`sysctl net.*\` críticos para producción.
* Entender qué configuran \`net.ipv4.tcp_*\` y \`net.core.*\`.
* Verificar el estado real del kernel directamente, sin herramientas de alto nivel.

### ❓ El problema real

Un servidor de alta carga empieza a rechazar conexiones bajo tráfico intenso. \`ss -s\` muestra miles de sockets. Los logs de nginx dicen "accept: Too many open files" pero \`ulimit -n\` parece suficiente. El kernel está descartando conexiones pero nadie sabe en qué punto. \`/proc/net/\` y \`sysctl\` son la forma de ver exactamente qué parámetros del kernel están limitando el sistema y ajustarlos en tiempo real.

### 📖 El filesystem /proc/net/

\`/proc/net/\` es una ventana directa al estado de red del kernel. Los archivos no existen en disco — el kernel los genera al leerlos:

\`\`\`bash
ls /proc/net/
\`\`\`

\`\`\`text
arp         dev         if_inet6    ipv6_route  route       tcp         udp6
dev_mcast   fib_trie    ip6_flowlabel netlink    rpc/        tcp6        unix
\`\`\`

Los más importantes:

\`\`\`text
/proc/net/dev       Estadísticas de todas las interfaces (RX/TX bytes, errors, drops)
/proc/net/tcp       Sockets TCP IPv4 activos (formato hex)
/proc/net/tcp6      Sockets TCP IPv6 activos
/proc/net/udp       Sockets UDP IPv4 activos
/proc/net/route     Tabla de routing IPv4 (formato hex)
/proc/net/arp       Tabla ARP actual
/proc/net/if_inet6  Interfaces con dirección IPv6
/proc/net/sockstat  Resumen de sockets por protocolo
/proc/net/snmp      Contadores MIB-II del stack TCP/IP
/proc/net/netstat   Estadísticas extendidas de TCP
\`\`\`

### 📖 /proc/net/dev: estadísticas de interfaces

\`\`\`bash
cat /proc/net/dev
\`\`\`

\`\`\`text
Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 1234567    9876    0    0    0     0          0         0   1234567    9876    0    0    0     0       0          0
  eth0: 98234512  712341    0   12    0     0          0         0  45218823  412034    0    0    0     0       0          0
\`\`\`

\`\`\`bash
# Script para ver estadísticas legibles con diferencia en el tiempo
while true; do
  prev_rx=\$(awk '/eth0/{print \$2}' /proc/net/dev)
  prev_tx=\$(awk '/eth0/{print \$10}' /proc/net/dev)
  sleep 1
  curr_rx=\$(awk '/eth0/{print \$2}' /proc/net/dev)
  curr_tx=\$(awk '/eth0/{print \$10}' /proc/net/dev)
  echo "RX: \$(( (curr_rx - prev_rx) / 1024 )) KB/s   TX: \$(( (curr_tx - prev_tx) / 1024 )) KB/s"
done
\`\`\`

### 📖 /proc/net/tcp: tabla de sockets en detalle

\`\`\`bash
cat /proc/net/tcp
\`\`\`

\`\`\`text
  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 00000000:0016 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 12345 1 ...
   1: 0F02000A:1F90 0502000A:C47F 01 00000000:00000028 00:00000000 00000000  1000        0 23456 1 ...
\`\`\`

Decodificación campo por campo:

\`\`\`text
local_address = IP_HEX:PUERTO_HEX (little-endian por octeto)
  00000000 → 0.0.0.0 (cualquier interfaz)
  0F02000A → 0A:00:02:0F → 10.0.2.15
  :0016    → 0x16 = 22 (SSH)
  :1F90    → 0x1F90 = 8080

rem_address  = igual que local_address pero del peer remoto
  00000000:0000 → 0.0.0.0:0 (LISTEN, sin peer)

st = estado en hex
  0A = LISTEN, 01 = ESTABLISHED, 06 = TIME_WAIT, 08 = CLOSE_WAIT

tx_queue:rx_queue = bytes en las colas de envío y recepción
  00000000:00000028 → tx=0 bytes, rx=40 bytes esperando en el buffer

uid = UID del proceso dueño del socket
  0 = root, 1000 = usuario normal

inode = número de inode del socket (para cruzar con /proc/PID/fd/)
\`\`\`

\`\`\`bash
# Script completo de decodificación de /proc/net/tcp
awk 'NR > 1 {
  # Decodificar IP local (little-endian hex)
  hex_ip = substr(\$2, 1, 8)
  split("", parts)
  parts[1] = strtonum("0x" substr(hex_ip, 7, 2))
  parts[2] = strtonum("0x" substr(hex_ip, 5, 2))
  parts[3] = strtonum("0x" substr(hex_ip, 3, 2))
  parts[4] = strtonum("0x" substr(hex_ip, 1, 2))
  local_ip = parts[1] "." parts[2] "." parts[3] "." parts[4]
  local_port = strtonum("0x" substr(\$2, 10, 4))

  # Estado
  states["01"] = "ESTABLISHED"
  states["02"] = "SYN_SENT"
  states["03"] = "SYN_RECV"
  states["04"] = "FIN_WAIT1"
  states["05"] = "FIN_WAIT2"
  states["06"] = "TIME_WAIT"
  states["08"] = "CLOSE_WAIT"
  states["09"] = "LAST_ACK"
  states["0A"] = "LISTEN"

  state = states[\$4]
  if (state == "") state = "UNKNOWN(" \$4 ")"

  printf "%s:%d  %s\\n", local_ip, local_port, state
}' /proc/net/tcp
\`\`\`

### 📖 /proc/net/route: tabla de routing

\`\`\`bash
cat /proc/net/route
\`\`\`

\`\`\`text
Iface   Destination Gateway  Flags  RefCnt Use Metric Mask    MTU  Window IRTT
eth0    00000000    0101A8C0  0003   0      0   100    00000000  0   0      0
eth0    0001A8C0    00000000  0001   0      0   100    00FFFFFF  0   0      0
lo      0000007F    00000000  0001   0      0   0      000000FF  0   0      0
\`\`\`

Decodificación:
\`\`\`text
Destination = 00000000 → 0.0.0.0 (ruta default)
Gateway     = 0101A8C0 → C0:A8:01:01 → 192.168.1.1 (gateway)
Flags:
  0001 = U (route is Up)
  0002 = G (uses Gateway)
  0003 = U+G (up y usa gateway) → ruta default
  0001 = U solo → red directamente conectada
Mask = 00000000 → 0.0.0.0 (máscara de la ruta default)
      00FFFFFF → FF:FF:FF:00 → 255.255.255.0 = /24
\`\`\`

\`\`\`bash
# Más fácil: usar ip route (que lee esto internamente)
ip route show
ip route get 8.8.8.8    # qué interfaz y gateway usaría para llegar a 8.8.8.8
\`\`\`

### 📖 /proc/net/sockstat: resumen de sockets

\`\`\`bash
cat /proc/net/sockstat
\`\`\`

\`\`\`text
sockets: used 847
TCP: inuse 799 orphan 0 tw 387 alloc 812 mem 152
UDP: inuse 8 mem 5
UDPLITE: inuse 0
RAW: inuse 1
FRAG: inuse 0 memory 0
\`\`\`

- **orphan**: sockets TCP sin proceso dueño — el proceso murió sin cerrar. Deberían ser 0.
- **tw**: sockets en TIME_WAIT.
- **mem**: páginas de memoria usadas por sockets TCP (1 página = 4096 bytes).

Si \`mem\` sube mucho, el kernel está usando mucha memoria para buffers de socket.

### 📖 sysctl net.*: parámetros del stack de red

\`sysctl\` lee y escribe parámetros del kernel en tiempo real. Los de red están bajo \`net.\`:

\`\`\`bash
# Ver todos los parámetros de red
sysctl -a 2>/dev/null | grep '^net\.' | wc -l   # suelen ser 300+

# Ver un parámetro específico
sysctl net.ipv4.tcp_max_syn_backlog

# Cambiar en tiempo real (no persiste al reiniciar)
sysctl -w net.ipv4.tcp_max_syn_backlog=4096

# Persistir: editar /etc/sysctl.conf o crear archivo en /etc/sysctl.d/
echo 'net.ipv4.tcp_max_syn_backlog = 4096' >> /etc/sysctl.d/99-network.conf
sysctl -p /etc/sysctl.d/99-network.conf
\`\`\`

### 📖 Parámetros TCP/IP críticos para producción

**Control de conexiones y backlog:**

\`\`\`bash
# Tamaño del backlog SYN (half-open connections durante el handshake)
# Default: 128 o 256. Para servidores de alto tráfico: 4096-65536
sysctl net.ipv4.tcp_max_syn_backlog

# Tamaño máximo del backlog total de accept() del kernel
# El bind() y listen() del proceso tienen su propio límite, pero este es el del kernel
sysctl net.core.somaxconn
# Aumentar: sysctl -w net.core.somaxconn=65535

# Protección contra SYN flood (activa cuando backlog está lleno)
# SYN cookies permiten responder sin guardar estado hasta recibir el ACK
sysctl net.ipv4.tcp_syncookies
# Debe ser 1 en producción
\`\`\`

**Control de TIME_WAIT:**

\`\`\`bash
# Número máximo de sockets en TIME_WAIT
sysctl net.ipv4.tcp_max_tw_buckets
# Si se supera este límite, el kernel destruye sockets TIME_WAIT prematuramente

# Permitir reusar sockets TIME_WAIT para nuevas conexiones salientes
sysctl net.ipv4.tcp_tw_reuse
# Poner a 1 en servidores que hacen muchas conexiones salientes (proxies, microservicios)
# NUNCA confundir con tcp_tw_recycle (deprecado y peligroso con NAT)
\`\`\`

**Buffers de red:**

\`\`\`bash
# Tamaño del buffer de recepción del socket (bytes)
# min, default, max
sysctl net.ipv4.tcp_rmem
# Ejemplo: 4096 87380 6291456

# Tamaño del buffer de envío del socket
sysctl net.ipv4.tcp_wmem
# Ejemplo: 4096 16384 4194304

# Buffers globales del kernel (no por socket)
sysctl net.core.rmem_max    # máximo buffer RX que una app puede pedir con SO_RCVBUF
sysctl net.core.wmem_max    # máximo buffer TX

# Para redes de alto throughput (10Gbps, latencia alta)
# Aumentar a 256MB
sysctl -w net.core.rmem_max=268435456
sysctl -w net.core.wmem_max=268435456
sysctl -w net.ipv4.tcp_rmem="4096 87380 268435456"
sysctl -w net.ipv4.tcp_wmem="4096 65536 268435456"
\`\`\`

**Keepalive TCP:**

\`\`\`bash
# Tiempo de inactividad antes de enviar el primer keepalive
sysctl net.ipv4.tcp_keepalive_time
# Default: 7200 segundos (2 horas) — muy largo para detectar peers caídos

# Intervalo entre keepalives
sysctl net.ipv4.tcp_keepalive_intvl
# Default: 75 segundos

# Número de keepalives fallidos antes de cerrar la conexión
sysctl net.ipv4.tcp_keepalive_probes
# Default: 9

# Para detectar peers caídos rápidamente (ej: detrás de un NAT con timeout corto)
sysctl -w net.ipv4.tcp_keepalive_time=60
sysctl -w net.ipv4.tcp_keepalive_intvl=10
sysctl -w net.ipv4.tcp_keepalive_probes=5
# Total: 60 + (10 * 5) = 110 segundos para detectar un peer caído
\`\`\`

**Parámetros de red del núcleo:**

\`\`\`bash
# Tamaño del backlog de recepción del kernel (cola antes de procesar)
sysctl net.core.netdev_max_backlog
# Default: 1000. Aumentar a 5000-10000 bajo alta carga

# Habilitar IP forwarding (necesario para routers y contenedores)
sysctl net.ipv4.ip_forward
# 0 = deshabilitado (host normal), 1 = habilitado (router, Docker, K8s)
sysctl -w net.ipv4.ip_forward=1

# Rango de puertos efímeros (para conexiones salientes)
sysctl net.ipv4.ip_local_port_range
# Default: 32768 60999 (28.231 puertos disponibles)
# Aumentar si se agotan en alta frecuencia de conexiones:
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
\`\`\`

### 📖 Perfil de sysctl para servidor de producción

\`\`\`bash
# /etc/sysctl.d/99-production-network.conf
# Optimizaciones de red para servidor de producción de alta carga

# Conexiones entrantes
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_syncookies = 1

# Buffers de socket (TCP)
net.core.rmem_max = 268435456
net.core.wmem_max = 268435456
net.ipv4.tcp_rmem = 4096 87380 268435456
net.ipv4.tcp_wmem = 4096 65536 268435456

# TIME_WAIT
net.ipv4.tcp_max_tw_buckets = 2000000
net.ipv4.tcp_tw_reuse = 1

# Keepalive (detectar peers caídos en 2 minutos)
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6

# Backlog del kernel
net.core.netdev_max_backlog = 5000

# Puertos efímeros
net.ipv4.ip_local_port_range = 10240 65535
\`\`\`

\`\`\`bash
# Aplicar
sysctl -p /etc/sysctl.d/99-production-network.conf

# Verificar que se aplicaron
sysctl net.core.somaxconn net.ipv4.tcp_max_syn_backlog
\`\`\`

### 📋 Lo que debes recordar

* \`/proc/net/\` es lectura en tiempo real del estado del kernel — ningún proceso puede ocultarte información aquí.
* Los valores en \`/proc/net/tcp\` y \`/proc/net/route\` están en hexadecimal little-endian por octeto — necesitas decodificarlos manualmente o usar \`ss\`/\`ip route\` que lo hacen por ti.
* \`net.core.somaxconn\` limita el backlog de accept() — si es más bajo que el backlog del listen() de la app, el kernel lo recorta silenciosamente.
* \`tcp_tw_reuse=1\` es seguro; \`tcp_tw_recycle\` fue deprecado y eliminado del kernel por causar problemas con NAT.
* Los buffers TCP (\`tcp_rmem\`, \`tcp_wmem\`) tienen tres valores: mínimo, default, máximo. El kernel ajusta dinámicamente dentro de ese rango.
* Cambios con \`sysctl -w\` son inmediatos pero no persisten — persistir en \`/etc/sysctl.d/\`.

### 🧪 Autoevaluación

1. \`/proc/net/sockstat\` muestra \`TCP: inuse 12000 orphan 847\`. ¿Qué significa un valor alto de \`orphan\` y qué lo causa típicamente?
2. Un servidor web bajo carga rechaza conexiones con "Connection refused". \`ss -tlnp\` muestra que nginx está en LISTEN. \`dmesg\` muestra "TCP: request_sock_TCP: Possible SYN flooding". ¿Qué sysctl verificarías y cómo lo ajustarías?
3. ¿Por qué el parámetro \`net.ipv4.tcp_tw_recycle\` fue eliminado del kernel Linux 4.12+ y qué problema causaba en redes con NAT?

---

1. \`orphan 847\` significa que hay 847 sockets TCP que no tienen proceso dueño (el proceso que los creó terminó sin cerrar el socket). El kernel mantiene estos sockets en memoria hasta que el protocolo TCP concluye naturalmente (FIN o timeout). Causas típicas: procesos que reciben una señal SIGKILL (no tienen oportunidad de cerrar sockets), bugs en la aplicación que no llama close() antes de exit(), o procesos matados con kill -9. Un número alto de orphans consume memoria del kernel y puede agotar el límite de \`net.ipv4.tcp_max_orphans\`.
2. El mensaje indica SYN flood o backlog lleno. Los sysctl a verificar y ajustar: (1) \`net.ipv4.tcp_max_syn_backlog\` — aumentar a 4096 o 65535 para absorber más SYNs simultáneos; (2) \`net.core.somaxconn\` — debe ser igual o mayor que el backlog en \`listen()\` de nginx (configurado como \`listen 80 backlog=511;\`); (3) \`net.ipv4.tcp_syncookies\` — verificar que esté en 1 para activar SYN cookies cuando el backlog está lleno. Si somaxconn < backlog del listen(), el kernel lo recorta silenciosamente y hay menos espacio del esperado.
3. \`tcp_tw_recycle\` causaba que el kernel rechazara paquetes de conexiones legítimas cuando detrás de un NAT había múltiples clientes con timestamps distintos. El mecanismo: cuando tcp_tw_recycle está activo, el kernel guarda el timestamp del último paquete de cada IP remota y rechaza paquetes con timestamp menor (como protección anti-spoof de secuencia). Con NAT, múltiples clientes comparten la misma IP pública pero tienen relojes distintos — sus timestamps no son monótonamente crecientes desde la perspectiva del servidor. El kernel los rechaza silenciosamente, causando drops aparentemente aleatorios difíciles de diagnosticar. Fue eliminado en Linux 4.12 porque no tiene uso legítimo que tcp_tw_reuse no cubra de forma más segura.
`

export default content
