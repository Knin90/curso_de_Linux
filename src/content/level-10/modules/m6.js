const content = `
## Módulo 6 — NAT, reenvío de puertos y masquerading

### 🎯 Objetivos de aprendizaje

* Entender por qué existe NAT y el problema de las IPs privadas.
* Distinguir MASQUERADE, DNAT y SNAT y cuándo aplica cada uno.
* Configurar un gateway Linux con masquerading.
* Implementar reenvío de puertos (DNAT) para exponer servicios internos.

### ❓ El problema real

Tu empresa tiene 50 servidores en una red privada (192.168.0.0/24). Solo tienes una IP pública asignada por el ISP. Sin NAT, esos 50 servidores no pueden comunicarse con Internet. Con NAT, un único servidor Linux actúa como gateway y "presta" su IP pública para que toda la red privada pueda salir a Internet y recibir conexiones.

### 📖 Qué es NAT y por qué existe

NAT (Network Address Translation) es un mecanismo que modifica las direcciones IP (y/o puertos) en las cabeceras de los paquetes mientras atraviesan el firewall.

\`\`\`text
PROBLEMA:
  IPv4 tiene ~4.3 mil millones de direcciones.
  Actualmente hay ~17 mil millones de dispositivos conectados.
  No hay suficientes IPs públicas para todos.

SOLUCIÓN:
  RFC 1918 define rangos de IPs PRIVADAS (no enrutables en Internet):
    10.0.0.0/8        →  16,777,216 hosts
    172.16.0.0/12     →  1,048,576 hosts
    192.168.0.0/16    →  65,536 hosts

  NAT permite que múltiples dispositivos con IPs privadas compartan
  una sola IP pública para comunicarse con Internet.
\`\`\`

### 📖 Los tres tipos de NAT

\`\`\`diagram
{"type":"table-like","title":"Tipos de NAT","rows":[{"key":"MASQUERADE (SNAT dinámico)","value":"Modifica la IP de origen de paquetes salientes. Usa la IP de la interfaz de salida automáticamente. Ideal cuando la IP pública puede cambiar (DHCP). Uso: gateway/router para red interna."},{"key":"SNAT (Source NAT)","value":"Como MASQUERADE pero con IP de origen fija. Más eficiente que MASQUERADE. Uso: cuando la IP pública es estática."},{"key":"DNAT (Dest. NAT / Port forwarding)","value":"Modifica la IP/puerto de destino de paquetes entrantes. Redirige tráfico de IP pública a servidor interno. Uso: exponer un servidor interno al exterior."}]}
\`\`\`

### 📖 Flujo de MASQUERADE (gateway para red interna)

\`\`\`text
RED PRIVADA                    GATEWAY LINUX                  INTERNET
192.168.0.0/24                  eth0: 192.168.0.1
                                eth1: 203.0.113.5 (IP pública)

Servidor web interno (192.168.0.50) quiere acceder a google.com:

1. Paquete sale:
   SRC: 192.168.0.50:54321  →  DST: 142.250.80.46:443

2. MASQUERADE en POSTROUTING:
   SRC: 203.0.113.5:54321   →  DST: 142.250.80.46:443
   (Gateway reemplaza IP privada por su IP pública)

3. Google responde:
   SRC: 142.250.80.46:443   →  DST: 203.0.113.5:54321

4. conntrack sabe que 203.0.113.5:54321 corresponde a 192.168.0.50:54321
   SRC: 142.250.80.46:443   →  DST: 192.168.0.50:54321
   (Gateway reenvía la respuesta al servidor interno)
\`\`\`

### 📖 Habilitar IP forwarding

Antes de cualquier regla NAT, el kernel debe estar configurado para reenviar paquetes entre interfaces:

\`\`\`bash
# Verificar estado actual
cat /proc/sys/net/ipv4/ip_forward
# 0 = deshabilitado, 1 = habilitado

# Habilitar temporalmente (se pierde al reiniciar)
echo 1 > /proc/sys/net/ipv4/ip_forward

# Habilitar permanentemente
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p  # Aplicar sin reiniciar

# Para IPv6 también
echo "net.ipv6.conf.all.forwarding = 1" >> /etc/sysctl.conf
sysctl -p

# Verificar
sysctl net.ipv4.ip_forward
\`\`\`

### 📖 Configuración de MASQUERADE con iptables

\`\`\`bash
# Escenario: eth0 = red interna (192.168.0.0/24), eth1 = Internet (IP pública)

# 1. Habilitar IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# 2. Regla MASQUERADE en la tabla nat, cadena POSTROUTING
#    "Cuando un paquete sale por eth1, reemplaza la IP de origen con la IP de eth1"
iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE

# 3. Permitir el FORWARD de paquetes de la red interna hacia Internet
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT

# 4. Permitir el retorno de paquetes (conexiones ya establecidas)
iptables -A FORWARD -i eth1 -o eth0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Con SNAT (IP pública fija, más eficiente)
iptables -t nat -A POSTROUTING -o eth1 -j SNAT --to-source 203.0.113.5
\`\`\`

### 📖 Configuración de DNAT (port forwarding)

\`\`\`bash
# Escenario: exponer el servidor web interno (192.168.0.10:80)
# a través de la IP pública del gateway (203.0.113.5:80)

# 1. DNAT en PREROUTING: redirigir tráfico entrante al servidor interno
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 80 -j DNAT --to-destination 192.168.0.10:80

# 2. Permitir el FORWARD al servidor interno
iptables -A FORWARD -i eth1 -o eth0 -p tcp --dport 80 -d 192.168.0.10 -j ACCEPT

# Port forwarding a puerto diferente:
# Tráfico en puerto 2222 de la IP pública → SSH en 192.168.0.10:22
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 2222 -j DNAT --to-destination 192.168.0.10:22
iptables -A FORWARD -i eth1 -o eth0 -p tcp --dport 22 -d 192.168.0.10 -j ACCEPT
\`\`\`

\`\`\`text
DNAT — Flujo de paquetes:

Internet                      Gateway (203.0.113.5)         Servidor interno
    │                              │                         (192.168.0.10)
    │── TCP:80 ──────────────────▶│                              │
    │                              │ PREROUTING DNAT:             │
    │                              │ DST cambia a 192.168.0.10   │
    │                              │──────────── TCP:80 ─────────▶│
    │                              │                              │
    │                              │◀────────── respuesta ────────│
    │                              │ POSTROUTING MASQUERADE:      │
    │                              │ SRC cambia a 203.0.113.5    │
    │◀── respuesta ────────────────│                              │
\`\`\`

### 📖 Caso profesional: servidor en la nube como gateway

\`\`\`bash
# Configuración completa para un servidor cloud que actúa como gateway VPN/NAT
# para una red de oficina conectada via túnel

# Topología:
# - eth0: interfaz pública (Internet) - IP: 203.0.113.5
# - tun0: interfaz VPN/túnel a red interna - Red: 10.8.0.0/24

# Habilitar forwarding
sysctl -w net.ipv4.ip_forward=1

# Masquerade para la red VPN
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Permitir tráfico de la VPN hacia Internet
iptables -A FORWARD -i tun0 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o tun0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Ver las reglas NAT activas
iptables -t nat -L -v -n
\`\`\`

### 📋 Lo que debes recordar

* MASQUERADE va en POSTROUTING, tabla nat. Reemplaza la IP de origen de paquetes salientes.
* DNAT va en PREROUTING, tabla nat. Redirige tráfico entrante a un servidor interno.
* IP forwarding debe habilitarse en \`sysctl\` antes de que funcione cualquier NAT.
* Siempre necesitas reglas FORWARD en la tabla filter para permitir el tráfico después de DNAT.
* conntrack mantiene la tabla de traducciones para que las respuestas lleguen al origen correcto.

### 🧪 Autoevaluación

1. ¿En qué hook de Netfilter y en qué tabla se configura MASQUERADE?
2. Tienes DNAT configurado para redirigir el puerto 80 al servidor interno, pero el tráfico no llega. ¿Qué otra regla podría faltar?
3. ¿Cuál es la diferencia entre MASQUERADE y SNAT, y cuándo usarías cada uno?

---

1. En el hook **POSTROUTING** de la tabla **nat**: \`iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE\`. POSTROUTING se ejecuta después de que el routing ha decidido por qué interfaz saldrá el paquete.
2. La regla **FORWARD** en la tabla filter que permite el paquete después del DNAT: \`iptables -A FORWARD -i eth1 -o eth0 -p tcp --dport 80 -d 192.168.0.10 -j ACCEPT\`. Sin ella, el paquete es redirigido por DNAT pero luego bloqueado por la política DROP de FORWARD.
3. **MASQUERADE** consulta dinámicamente la IP de la interfaz de salida en cada paquete — es necesario cuando la IP pública puede cambiar (asignada por DHCP). **SNAT** usa una IP fija especificada en la regla — es más eficiente porque no hace esa consulta por cada paquete. Usa SNAT cuando la IP pública es estática.
`

export default content
