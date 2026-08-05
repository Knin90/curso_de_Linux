const content = `
## Módulo 4 — Bonding y teaming: alta disponibilidad de red

### 🎯 Objetivos de aprendizaje

* Entender los modos de bonding y cuándo usar cada uno.
* Configurar bonding con modo active-backup y LACP (802.3ad).
* Conocer la diferencia entre bonding y teaming.
* Verificar el estado del bond y simular fallos.

### ❓ El problema real

Tu servidor de base de datos tiene una sola interfaz de red. Si el cable falla, el NIC falla, o el puerto del switch falla, el servidor queda completamente inaccesible hasta que alguien lo repare físicamente. Con bonding, puedes tener dos interfaces físicas actuando como una sola: si una falla, la otra toma el tráfico sin interrupción.

### 📖 Bonding: conceptos fundamentales

El bonding de Linux combina múltiples interfaces físicas en una interfaz lógica (\`bond0\`). Las interfaces físicas se llaman **esclavos** (slaves).

\`\`\`text
                    bond0 (IP: 192.168.1.100/24)
                   /                    \\
               eth0                    eth1
               (activo)               (backup)
                 │                      │
            Puerto 1               Puerto 2
           Switch A               Switch A/B
\`\`\`

**Los modos más importantes:**

\`\`\`text
MODO  NOMBRE          DESCRIPCIÓN
──────────────────────────────────────────────────────────────────────
0     balance-rr      Round-robin: envía paquetes alternando por cada esclavo.
                      Requiere soporte del switch (EtherChannel/LAG). Aumenta
                      throughput total, pero puede causar reordenación de paquetes.

1     active-backup   Un esclavo activo, el resto en standby. Failover automático.
                      No requiere configuración especial en el switch. El más usado
                      para alta disponibilidad.

2     balance-xor     Selecciona esclavo según hash de MAC src/dst. Misma interfaz
                      siempre para el mismo par de hosts. Requiere EtherChannel.

4     802.3ad (LACP)  Link Aggregation Control Protocol. El switch y el servidor
                      negocian el LAG dinámicamente. Aumenta throughput y tiene
                      failover. Requiere switch con soporte LACP.

5     balance-tlb     Adaptive Transmit Load Balancing. No requiere switch especial.
                      TX se distribuye según carga; RX llega siempre por el activo.

6     balance-alb     Adaptive Load Balancing. Como tlb pero también distribuye RX
                      usando ARP negotiation. No requiere switch especial.
\`\`\`

### 📖 Configurar bond en modo active-backup

**Con NetworkManager:**

\`\`\`bash
# 1. Crear la interfaz bond
nmcli connection add type bond \\
  con-name bond0 \\
  ifname bond0 \\
  bond.options "mode=active-backup,miimon=100"

# 2. Asignar IP al bond
nmcli connection modify bond0 \\
  ipv4.addresses "192.168.1.100/24" \\
  ipv4.gateway "192.168.1.1" \\
  ipv4.method manual

# 3. Agregar esclavos al bond
nmcli connection add type ethernet \\
  con-name bond0-eth0 \\
  ifname eth0 \\
  master bond0

nmcli connection add type ethernet \\
  con-name bond0-eth1 \\
  ifname eth1 \\
  master bond0

# 4. Activar
nmcli connection up bond0
nmcli connection up bond0-eth0
nmcli connection up bond0-eth1
\`\`\`

**Con systemd-networkd:**

\`\`\`ini
# /etc/systemd/network/10-bond0.netdev
[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=active-backup
MIIMonitorSec=100ms
UpDelaySec=200ms
DownDelaySec=200ms
\`\`\`

\`\`\`ini
# /etc/systemd/network/10-bond0.network
[Match]
Name=bond0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
\`\`\`

\`\`\`ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
Bond=bond0
\`\`\`

\`\`\`ini
# /etc/systemd/network/20-eth1.network
[Match]
Name=eth1

[Network]
Bond=bond0
\`\`\`

### 📖 Configurar LACP (802.3ad)

LACP requiere configuración tanto en Linux como en el switch.

\`\`\`bash
# NetworkManager con LACP
nmcli connection add type bond \\
  con-name bond0 \\
  ifname bond0 \\
  bond.options "mode=802.3ad,lacp_rate=fast,miimon=100,xmit_hash_policy=layer3+4"

# xmit_hash_policy=layer3+4 distribuye carga usando IP+puerto (mejor para TCP)
\`\`\`

### 📖 Monitorear el bond

\`\`\`bash
# Estado detallado del bond
cat /proc/net/bonding/bond0

# Salida típica de active-backup:
# Bonding Mode: fault-tolerance (active-backup)
# Primary Slave: None
# Currently Active Slave: eth0
# MII Status: up
# MII Polling Interval (ms): 100
#
# Slave Interface: eth0
#   MII Status: up
#   Speed: 1000 Mbps
#   Duplex: full
#   Link Failure Count: 0
#
# Slave Interface: eth1
#   MII Status: up
#   Speed: 1000 Mbps
#   Link Failure Count: 0

# Simular fallo del esclavo activo
sudo ip link set eth0 down
cat /proc/net/bonding/bond0  # debe mostrar eth1 como activo ahora

# Restaurar
sudo ip link set eth0 up
\`\`\`

### 📋 Lo que debes recordar

* **active-backup** es el modo más seguro y más fácil de configurar — no requiere ningún cambio en el switch.
* **802.3ad (LACP)** requiere configuración en el switch pero ofrece tanto failover como aumento de throughput.
* \`miimon=100\` activa la detección de fallos de link cada 100ms — siempre incluirlo.
* \`cat /proc/net/bonding/bond0\` es la herramienta de diagnóstico principal del bond.

### 🧪 Autoevaluación

1. ¿Qué modo de bonding usarías si el switch no soporta EtherChannel/LACP pero necesitas failover automático?
2. ¿Qué parámetro controla con qué frecuencia el bond verifica si los esclavos siguen activos?
3. Configuras bond0 en modo 802.3ad pero no hay tráfico. ¿Qué verificarías primero?

---

1. Modo 1 (active-backup). No requiere ninguna configuración en el switch — un esclavo está activo y el otro en standby puro. Al detectar un fallo de link, conmuta automáticamente al esclavo de respaldo.
2. El parámetro \`miimon\`, expresado en milisegundos. \`miimon=100\` significa que el bond verifica el estado de los links cada 100ms. Sin este parámetro, el bond no detecta fallos automáticamente.
3. La configuración del switch. LACP necesita que el switch tenga configurado un port-channel/LAG con LACP activo para esos dos puertos. Si el switch no negocia LACP, el bond nunca levantará. Verificar con \`cat /proc/net/bonding/bond0\` si los esclavos tienen estado "up" y si el LACP está negociado.
`

export default content
