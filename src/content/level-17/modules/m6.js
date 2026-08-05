const content = `
## Módulo 6 — Namespaces de red: virtualización de red en Linux

### 🎯 Objetivos de aprendizaje

* Entender qué es un namespace de red y qué aísla.
* Crear y gestionar namespaces con \`ip netns\`.
* Conectar namespaces al host con veth pairs y bridges.
* Entender cómo Docker y Kubernetes usan namespaces de red.

### ❓ El problema real

Quieres probar una configuración de red compleja — dos routers, tres subnets y múltiples hosts — sin hardware físico ni VMs completas. Los namespaces de red de Linux permiten crear redes completamente aisladas en segundos, sobre un solo servidor. Entender esto explica cómo funcionan los contenedores Docker a nivel de red.

### 📖 Qué aisla un namespace de red

Un namespace de red (\`netns\`) es un contexto de red completamente independiente:

\`\`\`text
Lo que es independiente por namespace:
  ✓ Interfaces de red (eth0, lo, etc.)
  ✓ Tabla de routing
  ✓ Reglas iptables/nftables
  ✓ Conexiones de red (sockets)
  ✓ Tabla ARP
  ✓ Puertos de red (dos namespaces pueden usar el puerto 80)

Lo que es compartido:
  ✗ Procesos del sistema (a menos que también uses PID namespaces)
  ✗ Sistema de archivos
  ✗ Usuarios
\`\`\`

### 📖 Gestión básica de namespaces

\`\`\`bash
# Crear un namespace
sudo ip netns add red
sudo ip netns add blue

# Listar namespaces
ip netns list
# red
# blue

# Ejecutar un comando en un namespace
sudo ip netns exec red ip link show
# Solo ve "lo" — sin interfaces de red por defecto

# Ejecutar una shell en el namespace
sudo ip netns exec red bash
# Ahora estás dentro del namespace "red"
ip link show         # solo lo
ip route show        # tabla vacía
exit

# Eliminar un namespace
sudo ip netns del red
\`\`\`

### 📖 Conectar un namespace al host

\`\`\`bash
# Topología:
#  host          namespace "red"
#  veth-host ←──→ veth-red
#  10.0.0.1         10.0.0.2

# 1. Crear namespace
sudo ip netns add red

# 2. Crear veth pair
sudo ip link add veth-host type veth peer name veth-red

# 3. Mover un extremo al namespace
sudo ip link set veth-red netns red

# 4. Configurar el extremo del host
sudo ip addr add 10.0.0.1/24 dev veth-host
sudo ip link set veth-host up

# 5. Configurar el extremo dentro del namespace
sudo ip netns exec red ip addr add 10.0.0.2/24 dev veth-red
sudo ip netns exec red ip link set veth-red up
sudo ip netns exec red ip link set lo up

# 6. Probar conectividad
ping -c 2 10.0.0.2                          # host → namespace
sudo ip netns exec red ping -c 2 10.0.0.1   # namespace → host
\`\`\`

### 📖 Routing entre namespaces

\`\`\`bash
# Topología: ns1 → host (router) → ns2
# ns1: 10.1.0.2/24,  host: 10.1.0.1 y 10.2.0.1,  ns2: 10.2.0.2/24

sudo ip netns add ns1
sudo ip netns add ns2

# veth para ns1
sudo ip link add veth1-host type veth peer name veth1-ns
sudo ip link set veth1-ns netns ns1
sudo ip addr add 10.1.0.1/24 dev veth1-host
sudo ip link set veth1-host up
sudo ip netns exec ns1 ip addr add 10.1.0.2/24 dev veth1-ns
sudo ip netns exec ns1 ip link set veth1-ns up
sudo ip netns exec ns1 ip link set lo up

# veth para ns2
sudo ip link add veth2-host type veth peer name veth2-ns
sudo ip link set veth2-ns netns ns2
sudo ip addr add 10.2.0.1/24 dev veth2-host
sudo ip link set veth2-host up
sudo ip netns exec ns2 ip addr add 10.2.0.2/24 dev veth2-ns
sudo ip netns exec ns2 ip link set veth2-ns up
sudo ip netns exec ns2 ip link set lo up

# Habilitar IP forwarding en el host (para que enrute entre ns1 y ns2)
sudo sysctl -w net.ipv4.ip_forward=1

# Rutas default en los namespaces apuntando al host como gateway
sudo ip netns exec ns1 ip route add default via 10.1.0.1
sudo ip netns exec ns2 ip route add default via 10.2.0.1

# Probar: ns1 → ns2
sudo ip netns exec ns1 ping -c 2 10.2.0.2
\`\`\`

### 📖 Cómo Docker usa namespaces

\`\`\`bash
# Docker crea un netns por contenedor, pero los guarda en /var/run/docker/netns/
# no en /var/run/netns/ (donde los pone ip netns)

# Ver el namespace de red de un contenedor Docker
docker inspect <container_id> | grep -i sandbox

# Para usar ip netns con namespaces de Docker:
# 1. Encontrar el PID del contenedor
PID=$(docker inspect --format '{{.State.Pid}}' <container_id>)

# 2. Crear symlink para que ip netns lo vea
sudo ln -sfT /proc/\${PID}/ns/net /var/run/netns/<container_id>

# 3. Usar ip netns normalmente
ip netns exec <container_id> ip addr show

# Limpiar el symlink
sudo rm /var/run/netns/<container_id>
\`\`\`

### 📋 Lo que debes recordar

* Un namespace de red aísla completamente: interfaces, rutas, iptables y conexiones. Dos namespaces pueden usar el puerto 80 simultáneamente.
* \`ip netns exec <ns> <comando>\` ejecuta un comando en ese namespace. \`ip netns exec <ns> bash\` abre una shell completa dentro del namespace.
* Los veth pairs son el mecanismo estándar para conectar namespaces entre sí o con el host.
* Docker crea un namespace por contenedor. Los namespaces de Docker están en \`/var/run/docker/netns/\`, no en \`/var/run/netns/\`.

### 🧪 Autoevaluación

1. Ejecutas \`sudo ip netns exec mi-ns ip addr show\` y solo ves la interfaz \`lo\`. ¿Es esto normal o indica un problema?
2. Tienes dos namespaces y quieres que se comuniquen. ¿Qué necesitas crear?
3. ¿Por qué dos contenedores Docker pueden escuchar en el puerto 80 al mismo tiempo?

---

1. Es completamente normal. Un namespace recién creado solo tiene la interfaz loopback (\`lo\`) y está down por defecto. No tiene ninguna interfaz de red hasta que explícitamente se le asigna una (típicamente moviendo un extremo de un veth pair al namespace).
2. Un veth pair y un mecanismo de routing. El veth pair conecta físicamente los dos espacios de red; el routing (ya sea un bridge en el host o rutas estáticas con ip_forward activado) permite que los paquetes lleguen de un namespace al otro.
3. Porque cada contenedor Docker tiene su propio namespace de red. El puerto 80 es un recurso del namespace — dos namespaces distintos pueden cada uno tener un socket escuchando en el puerto 80 sin conflicto. El conflicto solo ocurriría si intentaras escuchar dos veces en el puerto 80 dentro del mismo namespace.
`

export default content
