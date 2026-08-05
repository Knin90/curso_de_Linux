const content = `
## Módulo 2 — ip: gestión de interfaces, direcciones y enlaces

### 🎯 Objetivos de aprendizaje

* Dominar los subcomandos de \`ip\` para gestionar interfaces, direcciones y estadísticas.
* Crear interfaces virtuales (veth, dummy, bridge) para laboratorios y troubleshooting.
* Entender la diferencia entre NetworkManager, systemd-networkd y configuración manual.
* Configurar persistencia de red con Netplan (Ubuntu) y /etc/sysconfig (RHEL/CentOS).
* Interpretar estadísticas de interfaz para detectar problemas de rendimiento.

### ❓ El problema real

Un servidor de producción tiene tres interfaces de red: una para tráfico público, una para la red interna de base de datos, y una para el acceso de gestión. Después de un mantenimiento, la interfaz de la red interna no tiene IP. Las conexiones a la base de datos fallan. \`ping\` a la IP de base de datos no responde. ¿La interfaz está down? ¿La IP no está asignada? ¿La ruta no existe? Con \`ip\` puedes responder cada una de estas preguntas en segundos.

### 📖 La familia de comandos ip

\`ip\` es el reemplazo moderno de \`ifconfig\`, \`route\` y \`arp\`. Viene de \`iproute2\` y habla directamente con el kernel via netlink sockets. La estructura es:

\`\`\`bash
ip [opciones] OBJETO COMANDO [argumentos]
\`\`\`

Objetos principales:
- \`link\`     — interfaces de red (L2)
- \`addr\`     — direcciones IP (L3)
- \`route\`    — tabla de rutas (L3)
- \`neigh\`    — tabla ARP / NDP (L2/L3)
- \`rule\`     — policy routing
- \`netns\`    — network namespaces

### 📖 ip addr: gestión de direcciones IP

\`\`\`bash
# Ver todas las interfaces con sus IPs
ip addr show
ip a    # forma abreviada

# Ver solo una interfaz
ip addr show dev eth0

# Agregar una dirección IP a una interfaz
ip addr add 192.168.1.100/24 dev eth0

# Agregar una IP secundaria (alias)
ip addr add 10.0.0.5/8 dev eth0 label eth0:vpn

# Eliminar una dirección IP
ip addr del 192.168.1.100/24 dev eth0

# Eliminar todas las IPs de una interfaz
ip addr flush dev eth0
\`\`\`

\`\`\`text
# Salida de ip addr show eth0
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 52:54:00:ab:cd:ef brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.10/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86234sec preferred_lft 86234sec
    inet6 fe80::5054:ff:feab:cdef/64 scope link
       valid_lft forever preferred_lft forever
\`\`\`

Campos importantes:
- \`scope global\`: dirección enrutable globalmente (normal para producción).
- \`scope link\`: solo válida en el segmento local (como las link-local IPv6 \`fe80::\`).
- \`dynamic\`: asignada por DHCP; tiene tiempos de vida (valid/preferred_lft).
- Los flags \`UP,LOWER_UP\`: la interfaz está administrativamente activa y tiene señal física.

### 📖 ip link: gestión del estado de interfaces

\`\`\`bash
# Ver todas las interfaces (sin IPs, solo estado L2)
ip link show

# Activar una interfaz
ip link set eth0 up

# Desactivar una interfaz
ip link set eth0 down

# Cambiar el MTU
ip link set eth0 mtu 9000

# Cambiar el nombre de una interfaz
ip link set eth0 name eth-public

# Cambiar la dirección MAC
ip link set eth0 address 52:54:00:11:22:33

# Ver estadísticas detalladas de RX/TX
ip -s link show eth0

# Ver estadísticas en formato numérico sin resolución de nombres
ip -s -n link show eth0
\`\`\`

Las estadísticas de \`ip -s link\`:

\`\`\`text
RX: bytes  packets  errors  dropped missed  mcast
    9823441  72341    0       12      3       0
TX: bytes  packets  errors  dropped carrier collsns
    4521882  41203    0       0       0       0
\`\`\`

- **dropped RX = 12**: el kernel descartó paquetes después de recibirlos (ring buffer lleno, regla de firewall temprana, o checksum incorrecto).
- **missed RX = 3**: la NIC descartó paquetes porque el ring buffer estaba completamente lleno — la aplicación no está consumiendo lo suficientemente rápido.
- **carrier TX**: pérdidas de portadora en transmisión — señal física inestable.

### 📖 Crear interfaces virtuales

\`\`\`bash
# Crear un par veth (virtual Ethernet) — usado en contenedores y namespaces
ip link add veth0 type veth peer name veth1
ip link set veth0 up
ip link set veth1 up
ip addr add 10.1.0.1/30 dev veth0
ip addr add 10.1.0.2/30 dev veth1

# Crear una interfaz dummy (para testing, IPs estables sin hardware)
ip link add dummy0 type dummy
ip link set dummy0 up
ip addr add 192.0.2.1/32 dev dummy0

# Crear un bridge (switch virtual)
ip link add br0 type bridge
ip link set br0 up
ip link set eth1 master br0    # añadir eth1 al bridge
ip link set eth2 master br0    # añadir eth2 al bridge
ip addr add 10.10.0.1/24 dev br0

# Eliminar una interfaz virtual
ip link del veth0    # borra el par completo veth0+veth1
ip link del dummy0
ip link del br0
\`\`\`

Los pares veth son la base de la red de contenedores Docker y Kubernetes: un extremo vive en el namespace del contenedor, el otro en el namespace del host.

### 📖 NetworkManager vs systemd-networkd vs ip manual

En producción, rara vez se usa \`ip\` solo — hay un daemon que gestiona la configuración de red:

\`\`\`text
Herramienta          Cuándo se usa                  Config files
──────────────────────────────────────────────────────────────────
NetworkManager       Desktops, laptops, RHEL/CentOS  /etc/NetworkManager/
systemd-networkd     Servidores Ubuntu/Debian         /etc/systemd/network/
Netplan              Ubuntu 18.04+                    /etc/netplan/
ip (manual)          Scripts, troubleshooting, CI     No persiste (perdido al reiniciar)
\`\`\`

**Verificar cuál está activo:**

\`\`\`bash
systemctl status NetworkManager
systemctl status systemd-networkd
systemctl status networking    # Debian clásico
\`\`\`

**nmcli (NetworkManager CLI):**

\`\`\`bash
# Ver conexiones configuradas
nmcli connection show

# Ver dispositivos y su estado
nmcli device status

# Activar una conexión
nmcli connection up "Wired connection 1"

# Crear una conexión estática
nmcli connection add type ethernet ifname eth0 con-name eth0-static \\
  ipv4.addresses 192.168.1.100/24 \\
  ipv4.gateway 192.168.1.1 \\
  ipv4.dns "8.8.8.8 8.8.4.4" \\
  ipv4.method manual

# Modificar una conexión existente
nmcli connection modify eth0-static ipv4.addresses 192.168.1.200/24
nmcli connection up eth0-static
\`\`\`

### 📖 Configuración persistente con Netplan (Ubuntu)

Netplan usa archivos YAML en \`/etc/netplan/\`. Los cambios son persistentes entre reinicios:

\`\`\`bash
# Ver configuración actual
cat /etc/netplan/01-netcfg.yaml
\`\`\`

\`\`\`yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd    # o NetworkManager
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 192.168.1.10/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
    eth1:
      dhcp4: yes
\`\`\`

\`\`\`bash
# Validar la configuración antes de aplicar
netplan generate

# Aplicar la configuración (con opción de revertir si algo falla)
netplan try --timeout 30

# Aplicar sin ventana de revert (producción, con precaución)
netplan apply
\`\`\`

### 📖 Configuración persistente en RHEL/CentOS/Rocky

\`\`\`bash
# Los archivos están en /etc/sysconfig/network-scripts/
cat /etc/sysconfig/network-scripts/ifcfg-eth0
\`\`\`

\`\`\`text
# /etc/sysconfig/network-scripts/ifcfg-eth0
TYPE=Ethernet
BOOTPROTO=none
NAME=eth0
DEVICE=eth0
ONBOOT=yes
IPADDR=192.168.1.10
PREFIX=24
GATEWAY=192.168.1.1
DNS1=8.8.8.8
DNS2=1.1.1.1
\`\`\`

\`\`\`bash
# Aplicar sin reiniciar
nmcli connection reload
nmcli connection up eth0
\`\`\`

### 📖 Workflow de diagnóstico con ip

Cuando una interfaz no tiene conectividad, la secuencia con \`ip\`:

\`\`\`bash
# 1. ¿La interfaz existe y está UP?
ip link show eth1
# Buscar: UP,LOWER_UP (ambos flags necesarios)
# LOWER_UP ausente = problema físico (cable, switch port)

# 2. ¿Tiene IP asignada?
ip addr show eth1
# Si no hay línea 'inet' → falta dirección IP

# 3. ¿Hay ruta para el destino?
ip route get 10.0.0.5
# Si devuelve 'RTNETLINK answers: Network is unreachable' → falta ruta

# 4. ¿Hay estadísticas de error?
ip -s link show eth1
# Revisar dropped, missed, errors
\`\`\`

### 📋 Lo que debes recordar

* \`ip addr add/del\` agrega y quita IPs; \`ip link set up/down\` activa/desactiva interfaces. Ningún cambio persiste sin un gestor de red o editar los archivos de configuración.
* Las interfaces veth son pares: crear una crea ambas; borrar una borra ambas.
* \`ip -s link show\` revela dropped y missed en RX — missed indica que la aplicación no consume los paquetes lo suficientemente rápido (problema de rendimiento de la app o del kernel buffer).
* En Ubuntu usa Netplan + \`netplan apply\`; en RHEL/CentOS usa archivos \`ifcfg-*\` con nmcli.
* Siempre verifica \`ip link show\` (UP + LOWER_UP), \`ip addr show\` (inet presente) e \`ip route get <destino>\` antes de escalar el problema.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre el flag \`UP\` y el flag \`LOWER_UP\` en la salida de \`ip link show\`, y qué indica la ausencia de \`LOWER_UP\` en una interfaz que está en \`UP\`?
2. Tienes un servidor con tres interfaces: \`eth0\` (pública), \`eth1\` (red interna DB), \`eth2\` (gestión). Después de un reinicio, \`eth1\` no tiene IP. ¿Qué secuencia de comandos ejecutas para diagnosticar el problema y cuál sería la diferencia entre "la interfaz está down" vs "no tiene IP asignada" vs "la IP existe pero no hay ruta"?
3. ¿Por qué \`ip link add veth0 type veth peer name veth1\` crea dos interfaces en lugar de una, y cuál es el caso de uso principal de este tipo de interfaz en sistemas modernos?

---

1. \`UP\` significa que la interfaz está administrativamente activa (el administrador la activó con \`ip link set up\`). \`LOWER_UP\` significa que hay señal física en el enlace (el cable está conectado y el switch remoto está respondiendo). Si \`LOWER_UP\` está ausente pero \`UP\` está presente, la interfaz está activa administrativamente pero sin señal física — problema de cable, puerto del switch apagado, o transceiver defectuoso. No hay solución de software para esto.
2. Secuencia: (1) \`ip link show eth1\` — si no aparece \`LOWER_UP\` hay problema físico; (2) \`ip addr show eth1\` — si no hay línea \`inet\`, la IP no está asignada (DHCP no respondió o la config estática no se cargó); (3) \`ip route get 10.0.0.DB_IP\` — si la IP existe pero la ruta no, el gateway de la red interna no está configurado. La diferencia visible: "interface down" = no hay \`LOWER_UP\` en ip link; "sin IP" = no hay línea \`inet\` en ip addr; "sin ruta" = ip route get devuelve "Network is unreachable".
3. Los veth son tubos virtuales: cualquier paquete que entra por un extremo sale por el otro. Se crean en pares porque su función es conectar dos entidades — en contenedores y Kubernetes, un extremo (\`veth0\`) queda en el namespace de red del host conectado al bridge, y el otro extremo (\`eth0\` renombrado) queda dentro del namespace de red del contenedor, dándole conectividad de red aislada pero comunicada con el host.
`

export default content
