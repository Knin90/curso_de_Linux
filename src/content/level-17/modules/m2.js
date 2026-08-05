const content = `
## Módulo 2 — Rutas estáticas y rutas por políticas (policy routing)

### 🎯 Objetivos de aprendizaje

* Configurar rutas estáticas persistentes con NetworkManager y systemd-networkd.
* Entender qué es el policy routing y cuándo es necesario.
* Crear tablas de routing adicionales y reglas de selección.
* Resolver el problema clásico de multihoming (múltiples ISP).

### ❓ El problema real

Un servidor tiene dos interfaces: \`eth0\` conectada a internet vía ISP1 y \`eth1\` conectada a internet vía ISP2. Quieres que el tráfico de la aplicación web use ISP1, y las conexiones de gestión SSH usen ISP2. Con una sola tabla de routing es imposible — necesitas policy routing.

### 📖 Rutas estáticas persistentes

Las rutas definidas con \`ip route add\` desaparecen al reiniciar. La persistencia depende del gestor de red.

**Con NetworkManager (Ubuntu/Fedora/RHEL moderno):**

\`\`\`bash
# Agregar ruta estática a una conexión existente
nmcli connection modify "eth0" +ipv4.routes "10.20.0.0/16 192.168.1.254"

# Múltiples rutas
nmcli connection modify "eth0" \\
  +ipv4.routes "10.20.0.0/16 192.168.1.254" \\
  +ipv4.routes "172.16.0.0/12 192.168.1.253"

# Ver rutas configuradas en una conexión
nmcli connection show "eth0" | grep routes

# Aplicar cambios sin reiniciar
nmcli connection up "eth0"
\`\`\`

**Con systemd-networkd:**

\`\`\`ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8

[Route]
Destination=10.20.0.0/16
Gateway=192.168.1.254

[Route]
Destination=172.16.0.0/12
Gateway=192.168.1.253
Metric=200
\`\`\`

\`\`\`bash
sudo systemctl restart systemd-networkd
\`\`\`

### 📖 Policy routing: el concepto

El routing normal usa una sola tabla y solo mira el destino del paquete. Policy routing permite elegir la tabla de routing basándose en:
- IP origen del paquete
- IP destino
- Interfaz de entrada
- Marca (fwmark) del paquete
- TOS/DSCP

\`\`\`text
Arquitectura de policy routing:

Paquete entrante
      │
      ▼
┌─────────────┐
│ Reglas ip   │  ← ip rule list  (se evalúan en orden de prioridad)
│ (ip rules)  │
└─────┬───────┘
      │ La primera regla que coincide selecciona la tabla
      ▼
┌─────────────┐
│  Tabla N    │  ← ip route show table N
│  de routing │
└─────┬───────┘
      │ Lookup en esa tabla (LPM normal)
      ▼
   Gateway / interfaz de salida
\`\`\`

### 📖 Tablas de routing adicionales

\`\`\`bash
# Ver reglas actuales (lista de selección de tablas)
ip rule list
# 0:      from all lookup local       ← tabla local (loopback, broadcast)
# 32766:  from all lookup main        ← tabla principal (la normal)
# 32767:  from all lookup default     ← tabla vacía de fallback

# Los números son prioridades: MENOR número = se evalúa PRIMERO

# Nombres de tablas reservados (en /etc/iproute2/rt_tables)
cat /etc/iproute2/rt_tables
# 255 local
# 254 main
# 253 default
# 0   unspec
\`\`\`

\`\`\`bash
# Agregar un nombre para una tabla personalizada
echo "100 isp1" | sudo tee -a /etc/iproute2/rt_tables
echo "101 isp2" | sudo tee -a /etc/iproute2/rt_tables
\`\`\`

### 📖 Caso real: servidor con dos ISP

\`\`\`text
eth0: 203.0.113.10/24  gateway ISP1: 203.0.113.1   (tráfico web)
eth1: 198.51.100.20/24 gateway ISP2: 198.51.100.1  (gestión SSH)
\`\`\`

\`\`\`bash
# 1. Crear tablas para cada ISP (ya agregado en rt_tables)
# 100 isp1
# 101 isp2

# 2. Poblar tabla isp1: todo sale por ISP1
ip route add default via 203.0.113.1 dev eth0 table isp1
ip route add 203.0.113.0/24 dev eth0 scope link table isp1

# 3. Poblar tabla isp2: todo sale por ISP2
ip route add default via 198.51.100.1 dev eth1 table isp2
ip route add 198.51.100.0/24 dev eth1 scope link table isp2

# 4. Reglas: origen → tabla
# Tráfico originado en eth0 usa tabla isp1
ip rule add from 203.0.113.10 table isp1 priority 100
# Tráfico originado en eth1 usa tabla isp2
ip rule add from 198.51.100.20 table isp2 priority 101

# 5. Verificar
ip rule list
ip route show table isp1
ip route show table isp2

# 6. Probar
ip route get 8.8.8.8 from 203.0.113.10
ip route get 8.8.8.8 from 198.51.100.20
\`\`\`

### 📖 Policy routing con fwmark (para iptables/nftables)

\`\`\`bash
# Marcar tráfico con iptables y enrutarlo a tabla específica
# Marcar paquetes al puerto 8080 con marca 1
iptables -t mangle -A OUTPUT -p tcp --dport 8080 -j MARK --set-mark 1

# Regla: paquetes con marca 1 → tabla isp1
ip rule add fwmark 1 table isp1 priority 200

# Verificar marcas aplicadas
iptables -t mangle -L OUTPUT -v
\`\`\`

### 📋 Lo que debes recordar

* Las rutas estáticas se persisten en NetworkManager con \`nmcli connection modify\` o en archivos \`.network\` de systemd-networkd.
* Policy routing usa reglas (\`ip rule\`) para seleccionar tablas de routing según origen, destino o marca.
* Las reglas se evalúan en orden de prioridad: número menor = mayor prioridad.
* El caso de uso más común de policy routing es multihoming: múltiples ISP con tráfico separado.

### 🧪 Autoevaluación

1. ¿Por qué el routing normal (una tabla) no puede resolver el caso de dos ISP con tráfico separado?
2. ¿Qué comando muestra las reglas de selección de tablas de routing?
3. Agregas \`ip rule add from 10.0.0.5 table isp2 priority 50\` y \`ip rule add from 10.0.0.5 table isp1 priority 200\`. ¿Qué tabla usa el tráfico desde 10.0.0.5?

---

1. Porque el routing normal solo mira el destino del paquete, no el origen. Si hay un paquete a 8.8.8.8, la tabla solo tiene una ruta default y siempre sale por el mismo gateway, sin importar si el paquete lo originó la aplicación web o la conexión SSH.
2. \`ip rule list\` (o \`ip rule show\`). Muestra todas las reglas con su prioridad y la acción (tabla a usar).
3. Usa la tabla \`isp2\` porque tiene prioridad 50, que es menor que 200. Las reglas se evalúan de menor a mayor número de prioridad — la primera que coincide gana.
`

export default content
