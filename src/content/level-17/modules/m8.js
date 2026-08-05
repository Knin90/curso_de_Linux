const content = `
## Módulo 8 — Laboratorio: red compleja con múltiples interfaces

### 🎯 Objetivos de aprendizaje

* Construir una topología de red compleja sobre un solo servidor.
* Integrar VLANs, namespaces, bridges y policy routing en un escenario único.
* Verificar conectividad y diagnosticar fallos en una red multi-capa.
* Documentar y limpiar la configuración de red creada.

### ❓ El problema real

Este laboratorio simula el entorno de red de un servidor de producción moderno: múltiples VLANs para segregar tráfico, namespaces que simulan contenedores, policy routing para separar tráfico de gestión del de aplicaciones. Al completarlo, habrás aplicado todos los conceptos del nivel en un escenario realista.

### 📖 Topología del laboratorio

\`\`\`text
Topología objetivo:

  ┌─────────────────────────────────────────────────────┐
  │                   HOST (servidor)                   │
  │                                                     │
  │  eth0 (trunk)                                       │
  │   ├── eth0.10  (10.10.0.1/24)  VLAN Producción      │
  │   └── eth0.20  (10.20.0.1/24)  VLAN Gestión         │
  │                                                     │
  │  br-prod (bridge)                                   │
  │   ├── eth0.10 (puerto)                              │
  │   ├── veth-app0 → ns-app0 (10.10.0.10/24)          │
  │   └── veth-app1 → ns-app1 (10.10.0.11/24)          │
  │                                                     │
  │  Policy routing:                                    │
  │   - tráfico desde 10.20.0.0/24 → tabla mgmt        │
  │   - tráfico desde 10.10.0.0/24 → tabla prod        │
  └─────────────────────────────────────────────────────┘
\`\`\`

### 📖 Fase 1: VLANs y bridge de producción

\`\`\`bash
#!/bin/bash
# lab17-setup.sh — Parte 1: VLANs

set -e

echo "=== Fase 1: Módulo 8021q y VLANs ==="
modprobe 8021q

# Crear VLANs sobre eth0
ip link add link eth0 name eth0.10 type vlan id 10
ip link add link eth0 name eth0.20 type vlan id 20

ip addr add 10.20.0.1/24 dev eth0.20    # VLAN gestión: IP directa en el host
ip link set eth0.10 up
ip link set eth0.20 up
ip link set eth0 up

echo "=== Fase 2: Bridge de producción ==="
ip link add name br-prod type bridge
ip link set eth0.10 master br-prod      # eth0.10 es un puerto del bridge
ip addr add 10.10.0.1/24 dev br-prod    # IP del bridge para la VLAN prod
ip link set br-prod up

echo "VLANs y bridge creados:"
ip link show type vlan
ip link show type bridge
\`\`\`

### 📖 Fase 2: Namespaces conectados al bridge

\`\`\`bash
echo "=== Fase 3: Namespaces de aplicación ==="

for i in 0 1; do
  # Crear namespace
  ip netns add ns-app\${i}

  # Crear veth pair
  ip link add veth-host\${i} type veth peer name veth-ns\${i}

  # Mover un extremo al namespace
  ip link set veth-ns\${i} netns ns-app\${i}

  # Conectar el extremo del host al bridge
  ip link set veth-host\${i} master br-prod
  ip link set veth-host\${i} up

  # Configurar el namespace
  ip netns exec ns-app\${i} ip addr add 10.10.0.1\${i}/24 dev veth-ns\${i}
  ip netns exec ns-app\${i} ip link set veth-ns\${i} up
  ip netns exec ns-app\${i} ip link set lo up
  ip netns exec ns-app\${i} ip route add default via 10.10.0.1

  echo "ns-app\${i} configurado: 10.10.0.1\${i}/24"
done

# Verificar conectividad entre namespaces
echo "=== Test: ns-app0 → ns-app1 ==="
ip netns exec ns-app0 ping -c 2 -W 1 10.10.0.11 && echo "OK" || echo "FALLO"
echo "=== Test: host → ns-app0 ==="
ping -c 2 -W 1 10.10.0.10 && echo "OK" || echo "FALLO"
\`\`\`

### 📖 Fase 3: Policy routing para separar tráfico

\`\`\`bash
echo "=== Fase 4: Policy routing ==="

# Agregar tablas al registro
grep -q "200 prod" /etc/iproute2/rt_tables || echo "200 prod" >> /etc/iproute2/rt_tables
grep -q "201 mgmt" /etc/iproute2/rt_tables || echo "201 mgmt" >> /etc/iproute2/rt_tables

# Tabla prod: tráfico de producción
ip route add 10.10.0.0/24 dev br-prod table prod
ip route add default via 10.10.0.254 table prod 2>/dev/null || true

# Tabla mgmt: tráfico de gestión
ip route add 10.20.0.0/24 dev eth0.20 table mgmt

# Reglas de selección de tabla por origen
ip rule add from 10.10.0.0/24 table prod priority 100
ip rule add from 10.20.0.0/24 table mgmt priority 101

# Verificar reglas
ip rule list

# Verificar tablas
ip route show table prod
ip route show table mgmt

echo "=== Diagnóstico completo ==="
echo "Ruta para tráfico de producción:"
ip route get 10.10.0.10 from 10.10.0.1

echo "Ruta para tráfico de gestión:"
ip route get 8.8.8.8 from 10.20.0.1
\`\`\`

### 📖 Fase 4: Verificación y limpieza

\`\`\`bash
# Script de verificación
echo "=== Verificación del laboratorio ==="

# 1. Interfaces
echo "-- Interfaces VLAN:"
ip link show type vlan | grep -E "eth0\.(10|20)"

echo "-- Bridge:"
bridge link show br-prod 2>/dev/null

echo "-- Namespaces:"
ip netns list

# 2. Conectividad
echo "-- Conectividad ns-app0 → ns-app1:"
ip netns exec ns-app0 ping -c 1 -W 1 10.10.0.11 >/dev/null 2>&1 && echo "OK" || echo "FALLO"

echo "-- Conectividad host → ns-app1:"
ping -c 1 -W 1 10.10.0.11 >/dev/null 2>&1 && echo "OK" || echo "FALLO"

# Script de limpieza
cleanup() {
  echo "=== Limpieza del laboratorio ==="
  ip netns del ns-app0 2>/dev/null; ip netns del ns-app1 2>/dev/null
  ip rule del priority 100 2>/dev/null; ip rule del priority 101 2>/dev/null
  ip link del br-prod 2>/dev/null
  ip link del eth0.10 2>/dev/null; ip link del eth0.20 2>/dev/null
  sed -i '/^200 prod/d; /^201 mgmt/d' /etc/iproute2/rt_tables
  echo "Limpieza completada"
}
# Para limpiar: sudo bash -c "$(declare -f cleanup); cleanup"
\`\`\`

### 📋 Lo que debes recordar

* Un laboratorio de red complejo se construye en capas: interfaces físicas → VLANs → bridges → namespaces → routing.
* Los bridges conectan dominios de nivel 2; el routing (ip_forward + rutas) conecta dominios de nivel 3.
* Siempre tener un script de limpieza antes de aplicar cambios complejos de red — especialmente si trabajas en un servidor remoto.
* La secuencia de verificación: interfaces up → IPs asignadas → rutas presentes → ping → telnet/nc al puerto.

### 🧪 Autoevaluación

1. En la topología del laboratorio, ¿qué elemento permite que ns-app0 y ns-app1 se comuniquen sin pasar por el routing del host?
2. Si el ping de ns-app0 a ns-app1 falla, ¿cuál es el primer comando de diagnóstico?
3. ¿Por qué en la Fase 2 se necesita \`ip route add default via 10.10.0.1\` dentro de cada namespace?

---

1. El bridge \`br-prod\`. Un bridge opera en nivel 2 (Ethernet): cuando ns-app0 envía un frame a ns-app1, el bridge lo reenvía directamente basándose en la MAC address, sin consultar tablas de routing IP del host. Es exactamente el comportamiento de un switch.
2. \`ip netns exec ns-app0 ip route show\` para verificar que el namespace tiene la ruta default configurada, y \`bridge link show br-prod\` para verificar que los veth-host0 y veth-host1 están conectados al bridge como puertos. Si la ruta o los puertos faltan, ahí está el problema antes de pensar en firewalls o configuraciones más complejas.
3. Porque cada namespace tiene su propia tabla de routing completamente vacía al crearse. Sin una ruta default, el namespace solo sabe alcanzar su red local (10.10.0.0/24 — automáticamente por la IP asignada) pero no tiene camino para destinos fuera de esa red. La ruta default via 10.10.0.1 (la IP del bridge en el host) hace que el host actúe como gateway para el namespace.
`

export default content
