const content = `
## Módulo 5 — Bridges y interfaces virtuales

### 🎯 Objetivos de aprendizaje

* Entender qué es un bridge Linux y cómo funciona a nivel Ethernet.
* Crear y configurar bridges con \`ip link\` y \`brctl\`.
* Conectar máquinas virtuales al bridge para acceso a red física.
* Crear interfaces virtuales: dummy, veth pairs y macvlan.

### ❓ El problema real

Necesitas que las VMs de KVM/QEMU tengan acceso directo a la red física del servidor, como si fueran equipos más en el switch. Sin un bridge, las VMs solo pueden hacer NAT a través del host — no pueden recibir conexiones entrantes ni tener su propia IP de la red corporativa.

### 📖 Linux bridge: un switch software

Un bridge Linux es un switch de nivel 2 implementado en software. Aprende direcciones MAC, reenvía frames y puede conectar interfaces físicas, VMs, contenedores y redes virtuales.

\`\`\`diagram
{"type":"tree","root":{"name":"Red física","meta":"switch","icon":"network"},"children":[{"name":"eth0","meta":"interfaz física del servidor","icon":"network","children":[{"name":"br0","meta":"bridge","icon":"network","children":[{"name":"vnet0","meta":"VM1"},{"name":"vnet1","meta":"VM2"},{"name":"vnet2","meta":"VM3"}]}]}]}
\`\`\`

Las VMs obtienen IPs de la misma red que el servidor físico.

### 📖 Crear un bridge para VMs

\`\`\`bash
# Método moderno con ip link
# 1. Crear el bridge
sudo ip link add name br0 type bridge

# 2. Agregar la interfaz física como puerto del bridge
# PRIMERO quitar la IP de eth0 (el bridge la tendrá)
sudo ip addr flush dev eth0
sudo ip link set eth0 master br0

# 3. Asignar IP al bridge (no a eth0)
sudo ip addr add 192.168.1.100/24 dev br0
sudo ip route add default via 192.168.1.1

# 4. Activar
sudo ip link set br0 up

# 5. Ver el estado del bridge
ip link show type bridge
bridge link show    # muestra los puertos del bridge
\`\`\`

\`\`\`bash
# Ver la tabla MAC del bridge (como un switch)
bridge fdb show br br0

# Salida:
# 52:54:00:12:34:56 dev vnet0 master br0
# 00:11:22:33:44:55 dev eth0 master br0 permanent
\`\`\`

**Bridge persistente con systemd-networkd:**

\`\`\`ini
# /etc/systemd/network/10-br0.netdev
[NetDev]
Name=br0
Kind=bridge
\`\`\`

\`\`\`ini
# /etc/systemd/network/10-br0.network
[Match]
Name=br0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
\`\`\`

\`\`\`ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
Bridge=br0
\`\`\`

### 📖 Interfaz dummy: loopback adicional

Una interfaz dummy es como loopback pero configurable — útil para pruebas, anunciar IPs con BGP o crear endpoints estables.

\`\`\`bash
# Crear interfaz dummy
sudo ip link add dummy0 type dummy
sudo ip addr add 10.200.0.1/32 dev dummy0
sudo ip link set dummy0 up

# Caso de uso: IP estable para servicios aunque cambien las interfaces físicas
ip addr show dummy0
\`\`\`

### 📖 veth pairs: túneles entre namespaces

Los veth pairs son interfaces virtuales en pareja — lo que entra por una sale por la otra. Fundamentales para contenedores y namespaces de red.

\`\`\`text
namespace A          namespace B (o host)
  [veth0] ←────────────→ [veth1]
\`\`\`

\`\`\`bash
# Crear un par veth
sudo ip link add veth0 type veth peer name veth1

# Verificar: aparecen los dos extremos
ip link show type veth

# Asignar IPs a cada extremo
sudo ip addr add 192.168.50.1/24 dev veth0
sudo ip addr add 192.168.50.2/24 dev veth1
sudo ip link set veth0 up
sudo ip link set veth1 up

# Probar conectividad
ping -c 1 192.168.50.2 -I veth0

# Los veth pairs también se pueden conectar a bridges y namespaces
sudo ip link set veth1 master br0
\`\`\`

### 📖 macvlan: múltiples MACs sobre una interfaz

\`\`\`bash
# macvlan permite crear interfaces con MAC propias sobre eth0
# Útil para contenedores que necesitan IP directa en la red física sin bridge completo
sudo ip link add macvlan0 link eth0 type macvlan mode bridge
sudo ip addr add 192.168.1.200/24 dev macvlan0
sudo ip link set macvlan0 up

# Modos de macvlan:
# bridge:  las macvlan pueden comunicarse entre sí y con la red externa
# vepa:    todo el tráfico sale al switch (hairpin off en el switch)
# private: no hay comunicación entre macvlan del mismo padre
# passthru: una sola macvlan, para VM con acceso exclusivo al NIC físico
\`\`\`

### 📋 Lo que debes recordar

* Un bridge Linux actúa como switch de nivel 2: aprende MACs y reenvía frames. Las VMs conectadas al bridge tienen acceso directo a la red física.
* La IP va en el bridge (\`br0\`), no en la interfaz física que se convierte en puerto del bridge.
* Los veth pairs son fundamentales para contenedores: un extremo dentro del namespace/contenedor, el otro en el host o en un bridge.
* macvlan permite múltiples IPs/MACs sobre una interfaz física sin bridge completo.

### 🧪 Autoevaluación

1. Creas un bridge y agregas eth0 como puerto, pero pierdes conectividad SSH. ¿Por qué y cómo lo solucionas?
2. ¿Cuál es la diferencia funcional entre un bridge y un veth pair?
3. ¿Para qué sirve una interfaz dummy?

---

1. Porque al agregar eth0 al bridge, quitaste la IP de eth0 (el bridge la necesita para sí mismo). La solución: antes de agregar eth0 al bridge, hacer \`ip addr flush dev eth0\` y luego asignar la IP directamente a \`br0\`. La IP y el gateway deben estar en el bridge, no en la interfaz física que es ahora puerto del bridge.
2. Un bridge es un switch software con múltiples puertos que reenvía frames basándose en MAC addresses — puede conectar N interfaces. Un veth pair es simplemente un tubo de dos extremos: lo que entra por un extremo sale por el otro, siempre conectando exactamente dos puntos. Los veth pairs se usan típicamente para conectar un namespace de red con el host o con un bridge.
3. Una interfaz dummy es como una loopback adicional configurable. Sus usos principales: IP estables para servicios que no deben atarse a una interfaz física específica, endpoints para anunciar con BGP/OSPF, testing de configuraciones de red, y simular interfaces sin hardware físico.
`

export default content
