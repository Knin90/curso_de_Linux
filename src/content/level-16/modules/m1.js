const content = `
## Módulo 1 — Stack de red de Linux: del kernel al socket

### 🎯 Objetivos de aprendizaje

* Mapear las capas OSI a componentes reales del kernel Linux.
* Entender el recorrido de un paquete desde la NIC hasta la aplicación.
* Conocer sk_buff, net_device y el rol de Netfilter en ese recorrido.
* Distinguir entre los tipos de socket (SOCK_STREAM, SOCK_DGRAM, SOCK_RAW).
* Usar ethtool e ip link para inspeccionar el estado físico de interfaces.

### ❓ El problema real

Un servicio de pagos empieza a fallar intermitentemente. El proceso está corriendo, el puerto está en LISTEN, pero algunas conexiones nunca llegan. El equipo sospecha del firewall, del balanceador, de la aplicación. Nadie sabe por dónde empezar porque nadie entiende qué pasa con un paquete TCP desde que entra por la tarjeta de red hasta que el proceso \`accept()\` lo recibe. Sin ese mapa mental, el diagnóstico es adivinar.

### 📖 El modelo OSI y su equivalente real en Linux

El modelo OSI tiene 7 capas. En Linux, cada capa corresponde a código concreto:

\`\`\`text
OSI Layer      Nombre             Componente Linux
─────────────────────────────────────────────────────────────
L7 Aplicación  Application        Proceso: nginx, postgres, curl
L6 Presentación Presentation      TLS: OpenSSL / kernel TLS (kTLS)
L5 Sesión      Session            Sockets POSIX (socket(), connect())
L4 Transporte  Transport          TCP / UDP en net/ipv4/tcp.c, udp.c
L3 Red         Network            IP en net/ipv4/ip_input.c, ip_output.c
L2 Enlace      Data Link          Controladores de NIC, bridges, VLANs
L1 Físico      Physical           Hardware: NIC, cable, señal eléctrica
\`\`\`

En la práctica, L5 y L6 están colapsadas en la librería del proceso (glibc + OpenSSL). El kernel maneja L2-L4. L7 es puro espacio de usuario.

### 📖 La estructura central: sk_buff

Todo paquete en el kernel Linux vive en una estructura llamada **sk_buff** (socket buffer). Es una estructura C definida en \`include/linux/skbuff.h\` que contiene:

- Punteros al inicio y fin de los datos del paquete.
- Metadatos: interfaz de entrada, marca de firewall, estado de conntrack.
- Punteros a las cabeceras L2, L3 y L4 (calculados según avanza por el stack).

\`\`\`text
sk_buff
┌─────────────────────────────────────────────────────┐
│  head   data   tail   end                           │
│  ┌──┐   ┌─────────────────────────┐   ┌──┐         │
│  │  │──▶│ ETH HDR | IP HDR | TCP  │──▶│  │         │
│  └──┘   │ HDR     | PAYLOAD      │   └──┘         │
│         └─────────────────────────┘                 │
│  dev: eth0   sk: socket del proceso receptor        │
│  mark: 0x0   nfct: estado conntrack                 │
└─────────────────────────────────────────────────────┘
\`\`\`

Cuando el kernel necesita "subir" o "bajar" una capa, no copia datos — ajusta el puntero \`data\` dentro del mismo buffer. Eso hace que el procesamiento de paquetes sea eficiente.

### 📖 net_device: la abstracción de interfaz de red

Cada interfaz de red (física o virtual) está representada por una estructura \`net_device\` en el kernel. Contiene:

- Nombre (\`eth0\`, \`lo\`, \`docker0\`).
- Dirección MAC y MTU.
- Colas de transmisión y recepción (TX/RX queues).
- Punteros a las funciones del driver (\`ndo_start_xmit\`, \`ndo_open\`).

Para ver las interfaces que el kernel tiene registradas:

\`\`\`bash
# Todas las interfaces con estado
ip link show

# Una sola interfaz con estadísticas
ip -s link show eth0

# Versión más detallada con driver info
ethtool eth0
\`\`\`

\`\`\`text
# Salida de ip -s link show eth0
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    link/ether 52:54:00:ab:cd:ef brd ff:ff:ff:ff:ff:ff
    RX: bytes  packets  errors  dropped missed  mcast
        9823441  72341    0       0       0       0
    TX: bytes  packets  errors  dropped carrier collsns
        4521882  41203    0       0       0       0
\`\`\`

Los campos importantes:
- **errors/dropped**: errores de hardware o ring buffer lleno.
- **missed**: paquetes perdidos porque el ring buffer estaba lleno cuando llegaron.
- **carrier**: pérdidas de portadora (cable desconectado intermitente).

### 📖 El recorrido de un paquete entrante

Este es el camino que sigue un paquete TCP cuando llega desde la red hasta que la aplicación lo lee:

\`\`\`text
  INTERNET
     │
     ▼
┌─────────────┐
│     NIC     │  Hardware recibe el frame Ethernet
│  (driver)   │  Driver hace DMA al ring buffer en RAM
└──────┬──────┘
       │ IRQ / NAPI polling
       ▼
┌─────────────┐
│  softirq    │  NET_RX_SOFTIRQ procesa el sk_buff
│  NET_RX     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  L2 / ETH   │  eth_type_trans() determina protocolo
│  processing │  Si no es para nosotros → DROP
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Netfilter: PREROUTING hook │  ← iptables/nftables puede actuar aquí
│  ip_rcv() → ip_rcv_finish() │    (DNAT, connection tracking)
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐
│  Routing    │  ip_route_input(): ¿es para nosotros o hay que forwardearlo?
│  decision   │
└──────┬──────┘
       │ Para nosotros (local delivery)
       ▼
┌─────────────────────────────┐
│  Netfilter: INPUT hook      │  ← iptables/nftables INPUT chain
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐
│  L4 / TCP   │  tcp_v4_rcv(): valida checksum, busca socket, encola
│  processing │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Socket     │  Datos en el receive buffer del socket
│  recv buffer│  La app llama read()/recv() y los consume
└─────────────┘
\`\`\`

Cada paso puede ser un punto de fallo. Dropped en L2 → MAC incorrecto o interfaz down. Dropped en Netfilter → regla de firewall. Dropped en TCP → puerto sin listener o backlog lleno.

### 📖 Tipos de socket

Las aplicaciones interactúan con la red a través de sockets. Los tipos principales:

\`\`\`text
SOCK_STREAM   TCP. Orientado a conexión, garantiza orden y entrega.
              Usa: HTTP, SSH, PostgreSQL, Redis, etc.

SOCK_DGRAM    UDP. Sin conexión, sin garantía de orden ni entrega.
              Usa: DNS (consultas), NTP, QUIC (encima de UDP), syslog.

SOCK_RAW      Acceso directo al paquete IP sin procesamiento L4.
              Usa: ping (ICMP), tcpdump, nmap (SYN scan).
              Requiere CAP_NET_RAW.
\`\`\`

Los sockets SOCK_RAW son los que usa \`ping\` para construir paquetes ICMP directamente. Si un usuario sin privilegios intenta usarlos, el kernel devuelve \`EPERM\`.

### 📖 Netfilter en el recorrido

Netfilter define 5 hooks donde el código puede inspeccionar o modificar paquetes:

\`\`\`text
NF_INET_PRE_ROUTING   → PREROUTING chain  (antes del routing)
NF_INET_LOCAL_IN      → INPUT chain       (paquetes para procesos locales)
NF_INET_FORWARD       → FORWARD chain     (paquetes en tránsito)
NF_INET_LOCAL_OUT     → OUTPUT chain      (paquetes generados localmente)
NF_INET_POST_ROUTING  → POSTROUTING chain (después del routing, antes de salir)
\`\`\`

Cada hook puede devolver: ACCEPT (continuar), DROP (descartar silenciosamente), REJECT (descartar con ICMP error), QUEUE (enviar a userspace).

### 📖 ethtool: inspección de la capa física

\`ethtool\` habla directamente con el driver de la NIC. Es la herramienta de diagnóstico para L1/L2:

\`\`\`bash
# Estado del enlace físico: velocidad, dúplex, autonegociación
ethtool eth0

# Estadísticas del driver (específicas del hardware)
ethtool -S eth0

# Ver si hay offloading habilitado (checksum, TSO, GRO)
ethtool -k eth0

# Ver parámetros del ring buffer (cuántos descriptores RX/TX)
ethtool -g eth0

# Forzar velocidad/dúplex (útil en switches mal configurados)
ethtool -s eth0 speed 1000 duplex full autoneg off
\`\`\`

\`\`\`text
# Salida típica de ethtool eth0
Settings for eth0:
    Speed: 1000Mb/s
    Duplex: Full
    Port: Twisted Pair
    Auto-negotiation: on
    Link detected: yes
\`\`\`

Si "Link detected: no", el problema es físico: cable, switch port, transceiver. No sigas diagnosticando L3/L4 hasta resolver L1.

### 📋 Lo que debes recordar

* El kernel Linux tiene una correspondencia directa con las capas OSI: el driver de NIC es L2, \`net/ipv4/\` es L3-L4, los sockets son L5, la app es L7.
* Todo paquete en tránsito existe como un \`sk_buff\` en memoria; el kernel manipula punteros, no copia datos.
* Netfilter tiene 5 hooks donde pueden actuar iptables/nftables; cada hook puede ACCEPT, DROP o REJECT.
* \`ip -s link show\` muestra errores, drops y missed a nivel de interfaz — el primer lugar donde mirar cuando hay pérdida de paquetes.
* \`ethtool\` es la herramienta de L1: si el link no está detected, no hay nada que diagnosticar en capas superiores.
* Los sockets SOCK_RAW requieren \`CAP_NET_RAW\` — herramientas como ping y tcpdump las necesitan.

### 🧪 Autoevaluación

1. ¿Qué estructura del kernel encapsula un paquete de red mientras está siendo procesado, y por qué no se copian datos al cambiar de capa?
2. Un servidor tiene \`nginx\` escuchando en el puerto 80, pero las conexiones entrantes son descartadas silenciosamente sin ningún mensaje de error al cliente. ¿En qué hook de Netfilter es más probable que esté el problema, y cómo lo verificarías?
3. ¿Qué diferencia práctica hay entre \`SOCK_STREAM\` y \`SOCK_DGRAM\`, y qué tipo de socket usa \`ping\`?

---

1. La estructura es \`sk_buff\`. No se copian datos porque el kernel solo ajusta el puntero \`data\` dentro del buffer para "revelar" u "ocultar" cabeceras de cada capa — el contenido permanece en el mismo espacio de memoria RAM asignado originalmente.
2. La respuesta silenciosa (sin ICMP error) apunta a un DROP, no a REJECT. El hook más probable es \`NF_INET_LOCAL_IN\` (INPUT chain). Se verificaría con \`iptables -L INPUT -v -n\` o \`nft list ruleset\` buscando reglas DROP; también con \`ip -s link show\` para descartar drops a nivel de interfaz, y revisando contadores con \`iptables -Z\` antes y después de intentar conectar.
3. \`SOCK_STREAM\` es TCP: orientado a conexión, garantiza orden y entrega, hay handshake previo. \`SOCK_DGRAM\` es UDP: sin conexión, sin garantía, menor overhead. \`ping\` usa \`SOCK_RAW\` para construir paquetes ICMP directamente sin pasar por la capa TCP/UDP.
`

export default content
