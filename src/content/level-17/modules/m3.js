const content = `
## Módulo 3 — VLANs en Linux: configuración y casos de uso

### 🎯 Objetivos de aprendizaje

* Entender qué es una VLAN y cómo funciona el tagging 802.1Q.
* Crear interfaces VLAN en Linux con \`ip link\` y con systemd-networkd.
* Configurar trunks para manejar múltiples VLANs en una sola interfaz.
* Identificar y resolver problemas comunes de configuración VLAN.

### ❓ El problema real

Tienes un servidor con una sola interfaz física que necesita conectarse a tres redes distintas: producción, staging y gestión. Agregar tres tarjetas de red no es práctico ni económico. Con VLANs puedes crear tres interfaces virtuales sobre una sola física y aislar completamente el tráfico de cada red.

### 📖 VLANs y el estándar 802.1Q

Una VLAN (Virtual LAN) segmenta una red física en múltiples redes lógicas. El estándar IEEE 802.1Q define cómo se etiquetan los frames Ethernet:

\`\`\`text
Frame Ethernet normal:
┌────────────┬────────────┬──────┬─────────────────┬─────┐
│  DST MAC   │  SRC MAC   │ Type │     Payload     │ FCS │
│  (6 bytes) │  (6 bytes) │  2B  │  (46-1500 B)   │ 4B  │
└────────────┴────────────┴──────┴─────────────────┴─────┘

Frame 802.1Q (con tag VLAN):
┌────────────┬────────────┬──────┬──────┬──────┴─────────────────┬─────┐
│  DST MAC   │  SRC MAC   │ 0x81 │ TCI  │ Type │     Payload     │ FCS │
│  (6 bytes) │  (6 bytes) │  00  │  2B  │  2B  │  (46-1500 B)   │ 4B  │
└────────────┴────────────┴──────┴──────┴──────┴─────────────────┴─────┘
                                  │
                          TCI: 3 bits PCP + 1 bit DEI + 12 bits VLAN ID
                          VLAN ID: 1-4094 (0 y 4095 reservados)
\`\`\`

**Tipos de puertos en un switch:**
- **Access port**: conecta dispositivos finales, un solo VLAN, sin tag
- **Trunk port**: conecta switches/servidores, múltiples VLANs, con tag 802.1Q

El servidor Linux se conecta a un trunk port del switch.

### 📖 Crear interfaces VLAN con ip link

\`\`\`bash
# Verificar que el módulo 8021q esté cargado
lsmod | grep 8021q
# Si no aparece:
sudo modprobe 8021q

# Cargar el módulo automáticamente al arrancar
echo "8021q" | sudo tee /etc/modules-load.d/8021q.conf

# Crear una interfaz VLAN (eth0.100 para VLAN 100)
sudo ip link add link eth0 name eth0.100 type vlan id 100

# Asignar IP a la interfaz VLAN
sudo ip addr add 192.168.100.1/24 dev eth0.100

# Activar la interfaz
sudo ip link set eth0.100 up

# Verificar
ip link show eth0.100
ip addr show eth0.100
\`\`\`

\`\`\`bash
# Crear múltiples VLANs sobre la misma interfaz física
sudo ip link add link eth0 name eth0.10  type vlan id 10
sudo ip link add link eth0 name eth0.20  type vlan id 20
sudo ip link add link eth0 name eth0.100 type vlan id 100

sudo ip addr add 10.10.0.1/24    dev eth0.10
sudo ip addr add 10.20.0.1/24    dev eth0.20
sudo ip addr add 192.168.100.1/24 dev eth0.100

sudo ip link set eth0.10  up
sudo ip link set eth0.20  up
sudo ip link set eth0.100 up

# Ver todas las VLANs configuradas
ip link show type vlan
\`\`\`

### 📖 VLANs persistentes con systemd-networkd

\`\`\`ini
# /etc/systemd/network/10-eth0.network — interfaz física (trunk)
[Match]
Name=eth0

[Network]
VLAN=vlan10
VLAN=vlan20
VLAN=vlan100
\`\`\`

\`\`\`ini
# /etc/systemd/network/20-vlan10.netdev — definir la interfaz virtual
[NetDev]
Name=vlan10
Kind=vlan

[VLAN]
Id=10
\`\`\`

\`\`\`ini
# /etc/systemd/network/20-vlan10.network — configurar la interfaz virtual
[Match]
Name=vlan10

[Network]
Address=10.10.0.1/24
Gateway=10.10.0.254
\`\`\`

\`\`\`bash
# Repetir para vlan20 y vlan100, luego aplicar
sudo systemctl restart systemd-networkd
networkctl status vlan10
\`\`\`

### 📖 Diagnóstico de VLANs

\`\`\`bash
# Verificar que la interfaz física está en modo promiscuo (necesario para trunk)
ip link show eth0 | grep PROMISC

# Ver estadísticas de tráfico por VLAN
ip -s link show eth0.100

# Capturar tráfico VLAN con tcpdump
tcpdump -i eth0 -e vlan              # todos los frames 802.1Q
tcpdump -i eth0 vlan 100            # solo VLAN 100
tcpdump -i eth0.100                  # tráfico ya destagueado de VLAN 100

# Verificar configuración del switch (si tienes acceso)
# El puerto del switch debe estar en modo trunk con las VLANs permitidas

# Problema común: MTU
# Los frames 802.1Q añaden 4 bytes al frame. Si el switch/NIC no maneja
# jumbo frames, puede haber problemas con MTU de 1500.
ip link set eth0 mtu 1504            # aumentar MTU en la interfaz física
\`\`\`

### 📋 Lo que debes recordar

* 802.1Q añade 4 bytes al frame Ethernet con el VLAN ID (12 bits, valores 1-4094).
* La interfaz física conectada a un trunk del switch debe estar activa pero sin IP — las IPs van en las sub-interfaces VLAN.
* El módulo \`8021q\` del kernel debe estar cargado para que funcionen las VLANs.
* El puerto del switch debe ser trunk y permitir explícitamente cada VLAN ID configurada en el servidor.

### 🧪 Autoevaluación

1. ¿Qué tipo de puerto del switch necesitas para conectar un servidor Linux con múltiples VLANs?
2. Creas \`eth0.50\` pero no hay conectividad. El módulo \`8021q\` está cargado. ¿Qué deberías verificar en el switch?
3. ¿Por qué la interfaz física \`eth0\` generalmente no tiene IP cuando se usan VLANs?

---

1. Un puerto trunk (también llamado tagged port). Un puerto access solo permite una VLAN sin etiqueta, no puede transportar tráfico de múltiples VLANs etiquetadas.
2. Que el puerto del switch tiene configurada la VLAN 50 como permitida en el trunk. Si el switch no permite la VLAN 50 en ese trunk port, los frames con tag VLAN 50 se descartan.
3. Porque la interfaz física actúa como transportador (trunk) de múltiples VLANs. Si le pones una IP, el tráfico sin VLAN tag (native VLAN) se mezclaría con el tráfico de gestión. La práctica correcta es que cada VLAN tenga su propia sub-interfaz con su IP, manteniendo el aislamiento lógico.
`

export default content
