const content = `
## Módulo 7 — Metodología de troubleshooting de red en producción

### 🎯 Objetivos de aprendizaje

* Aplicar la metodología OSI de abajo hacia arriba para diagnosticar fallos de red de forma sistemática.
* Verificar cada capa con herramientas específicas: \`ip link\`, \`ethtool\`, \`ip addr\`, \`ss\`, \`curl\`, \`dig\`.
* Identificar patrones de fallo recurrentes: conflictos de IP, MTU incorrecto, pérdida asimétrica, pérdida intermitente.
* Construir un script de diagnóstico que genere un informe estructurado del estado de red.
* Distinguir entre fallos de capa 3 (routing), capa 4 (puertos) y capa 7 (aplicación).

### ❓ El problema real

Son las 2 de la madrugada. Un cliente reporta que su aplicación web no responde. Tienes acceso SSH al servidor. ¿Por dónde empiezas? Sin una metodología clara, se pierde tiempo revisando logs de aplicación cuando el problema es una ruta mal configurada, o se reinicia nginx cuando el fallo es el cable de red. El modelo OSI, aplicado de forma pragmática, te permite llegar al origen del fallo en minutos.

### 📖 La metodología OSI de abajo hacia arriba

El principio central: **no saltes a capas superiores si la inferior no está confirmada**. Un problema de DNS (capa 7) que en realidad es un firewall bloqueando UDP 53 (capa 4) se diagnostica mal si empiezas por \`dig\` sin verificar primero conectividad IP.

\`\`\`text
Capa 7 — Aplicación    curl, wget, http clients
Capa 4 — Transporte    ss, nc, telnet, nmap
Capa 3 — Red           ip addr, ip route, ping, traceroute
Capa 2 — Enlace        ip link, arp, arping
Capa 1 — Física        ethtool, ip -s link
\`\`\`

### 📖 Capa 1 y 2: ¿existe la interfaz y tiene señal?

**Verificar estado de la interfaz:**

\`\`\`bash
ip link show
\`\`\`

\`\`\`text
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    link/ether 52:54:00:4a:3b:9c brd ff:ff:ff:ff:ff:ff
\`\`\`

Señales de alarma: \`state DOWN\`, ausencia de \`LOWER_UP\` (sin señal física), o la interfaz directamente no aparece.

**Velocidad, duplex y detección de enlace:**

\`\`\`bash
ethtool eth0
\`\`\`

\`\`\`text
Settings for eth0:
    Speed: 1000Mb/s
    Duplex: Full
    Link detected: yes
\`\`\`

\`Link detected: no\` indica fallo físico — cable, puerto del switch, o NIC. \`Speed: 10Mb/s\` cuando se esperan 1000 sugiere autonegociación fallida.

**Errores y descartes a nivel de interfaz:**

\`\`\`bash
ip -s link show eth0
\`\`\`

\`\`\`text
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    RX: bytes  packets  errors  dropped  overrun  mcast
    4823901    38291    0       12       0        0
    TX: bytes  packets  errors  dropped  carrier  collisions
    2918234    21045    0       0        0        0
\`\`\`

\`errors\` o \`dropped\` crecientes indican problemas de hardware o saturación. \`overrun\` indica que el buffer de la NIC se desborda — el kernel no procesa paquetes con suficiente velocidad.

### 📖 Capa 3: ¿tiene IP y puede llegar al gateway?

**Verificar asignación de IP:**

\`\`\`bash
ip addr show eth0
\`\`\`

\`\`\`text
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    inet 192.168.1.50/24 brd 192.168.1.255 scope global eth0
       valid_lft forever preferred_lft forever
\`\`\`

Sin \`inet\` — no hay IP asignada. Puede ser DHCP fallido o configuración estática ausente.

**Verificar tabla de rutas:**

\`\`\`bash
ip route show
\`\`\`

\`\`\`text
default via 192.168.1.1 dev eth0
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.50
\`\`\`

Sin ruta \`default\` — el servidor no puede llegar a IPs fuera de su subred. Causa frecuente de "funciona localmente pero no desde fuera".

**Verificar alcanzabilidad del gateway:**

\`\`\`bash
ping -c 4 192.168.1.1
\`\`\`

Si \`ping\` al gateway falla pero la interfaz está UP con IP asignada, el problema está en capa 2: ARP o VLAN incorrecta.

**Verificar resolución ARP del gateway:**

\`\`\`bash
arping -c 3 192.168.1.1
\`\`\`

\`\`\`text
ARPING 192.168.1.1 from 192.168.1.50 eth0
Unicast reply from 192.168.1.1 [aa:bb:cc:dd:ee:ff]  1.2ms
Unicast reply from 192.168.1.1 [aa:bb:cc:dd:ee:ff]  1.1ms
\`\`\`

Si aparecen dos MACs distintas respondiendo a la misma IP — conflicto de IP en la red.

### 📖 Capa 4: ¿escucha el servicio y está accesible el puerto?

**Verificar puertos en escucha:**

\`\`\`bash
ss -tlnp
\`\`\`

\`\`\`text
State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN  0       128     0.0.0.0:22         0.0.0.0:*          users:(("sshd",pid=1234))
LISTEN  0       511     127.0.0.1:80       0.0.0.0:*          users:(("nginx",pid=5678))
\`\`\`

Clave: \`127.0.0.1:80\` significa que nginx solo escucha en loopback — no es accesible externamente. Debe ser \`0.0.0.0:80\`.

**Probar conectividad TCP a un puerto específico:**

\`\`\`bash
nc -zv 192.168.1.100 80
\`\`\`

\`\`\`text
Connection to 192.168.1.100 80 port [tcp/http] succeeded!
\`\`\`

\`\`\`bash
nc -zv 192.168.1.100 443
\`\`\`

\`\`\`text
nc: connect to 192.168.1.100 port 443 (tcp) failed: Connection refused
\`\`\`

\`Connection refused\` — el puerto está cerrado (nadie escucha). \`Connection timed out\` — firewall descartando paquetes silenciosamente.

### 📖 Capa 7: ¿responde la aplicación correctamente?

**Inspeccionar respuesta HTTP completa:**

\`\`\`bash
curl -v http://192.168.1.100/
\`\`\`

\`\`\`text
* Connected to 192.168.1.100 port 80
> GET / HTTP/1.1
> Host: 192.168.1.100
< HTTP/1.1 502 Bad Gateway
< Server: nginx/1.24.0
\`\`\`

HTTP 502 indica que nginx recibe la conexión pero el backend (PHP-FPM, Node, etc.) no responde.

**Bypass de DNS para probar con IP directa:**

\`\`\`bash
curl --resolve mi-app.ejemplo.com:80:192.168.1.100 http://mi-app.ejemplo.com/
\`\`\`

Útil cuando el DNS aún no propagó o se sospecha que apunta a la IP incorrecta.

### 📖 DNS: comparar resolución local vs. pública

\`\`\`bash
# Resolución con el servidor DNS configurado en el sistema
dig +short api.ejemplo.com

# Resolución forzando DNS público de Google
dig @8.8.8.8 +short api.ejemplo.com
\`\`\`

Si los resultados difieren — el servidor DNS local tiene caché vieja o una entrada incorrecta. Si ambos fallan — el dominio no existe o expiró.

\`\`\`bash
nslookup api.ejemplo.com
\`\`\`

\`\`\`text
Server:     127.0.0.53
Address:    127.0.0.53#53

Name:   api.ejemplo.com
Address: 10.0.0.45
\`\`\`

\`Server: 127.0.0.53\` indica que systemd-resolved está activo como resolver local.

### 📖 Firewall: ¿las reglas locales bloquean el tráfico?

\`\`\`bash
# Ver reglas iptables con contadores de paquetes
iptables -L -n -v
\`\`\`

\`\`\`text
Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target  prot opt in  out  source      destination
    0     0 DROP    tcp  --  *   *    0.0.0.0/0   0.0.0.0/0   tcp dpt:80
\`\`\`

Un \`DROP\` con \`pkts\` incrementando confirma que los paquetes llegan pero el firewall los descarta.

\`\`\`bash
# Si el sistema usa ufw
ufw status verbose
\`\`\`

\`\`\`text
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     DENY IN     Anywhere
\`\`\`

### 📖 Escaneo de puertos con nmap

\`\`\`bash
# Verificar puertos específicos desde una máquina externa
nmap -p 22,80,443 192.168.1.100
\`\`\`

\`\`\`text
PORT    STATE    SERVICE
22/tcp  open     ssh
80/tcp  filtered http
443/tcp closed   https
\`\`\`

\`open\` — puerto accesible. \`filtered\` — firewall descartando (timeout). \`closed\` — puerto rechazado activamente (RST).

\`\`\`bash
# Detectar versión del servicio
nmap -sV -p 80,443 192.168.1.100
\`\`\`

\`\`\`text
PORT    STATE  SERVICE  VERSION
80/tcp  open   http     nginx 1.24.0
443/tcp open   ssl/http nginx 1.24.0
\`\`\`

### 📖 Patrones de fallo frecuentes

**Conflicto de IP — dos hosts con la misma dirección:**

\`\`\`bash
arping -D -c 3 192.168.1.50
\`\`\`

\`\`\`text
ARPING 192.168.1.50 from 0.0.0.0 eth0
Unicast reply from 192.168.1.50 [aa:bb:cc:11:22:33]  1.1ms
Sent 3 probes (1 broadcast(s))
Received 1 response(s)
\`\`\`

La flag \`-D\` (duplicate detection) envía desde 0.0.0.0. Cualquier respuesta indica duplicado.

**MTU incorrecto — paquetes grandes se descartan silenciosamente:**

\`\`\`bash
# Probar con paquete de 1400 bytes sin fragmentación
ping -M do -s 1400 192.168.1.1
\`\`\`

\`\`\`text
PING 192.168.1.1 (192.168.1.1) 1400(1428) bytes of data.
From 192.168.1.50 icmp_seq=1 Frag needed and DF set (mtu = 1400)
\`\`\`

El mensaje \`Frag needed\` revela el MTU real del camino. Síntoma clásico: SSH funciona, SCP falla; páginas pequeñas cargan, las grandes no.

**Routing asimétrico — ida y vuelta por rutas distintas:**

\`\`\`bash
traceroute 8.8.8.8
\`\`\`

\`\`\`text
 1  192.168.1.1   1.2ms
 2  10.0.0.1      5.4ms
 3  * * *
 4  203.0.113.1   22.1ms
\`\`\`

\`* * *\` en un salto intermedio puede indicar que el router descarta ICMP TTL exceeded — no necesariamente pérdida de paquetes TCP.

**Pérdida intermitente — usar mtr en lugar de ping:**

\`\`\`bash
mtr --report --report-cycles 100 8.8.8.8
\`\`\`

\`\`\`text
HOST: servidor                Loss%   Snt   Last   Avg  Best  Wrst
  1. 192.168.1.1              0.0%    100   1.2   1.3   1.1   2.1
  2. 10.0.0.1                 0.0%    100   5.1   5.2   4.9   6.3
  3. 203.0.113.5             15.0%    100  18.4  19.1  17.2  45.2
  4. 8.8.8.8                  0.0%    100  22.3  22.8  21.9  24.1
\`\`\`

Pérdida en salto 3 pero no en salto 4: el router intermedio deprioritiza ICMP. El destino final recibe correctamente.

### 📖 Script de diagnóstico automatizado

\`\`\`bash
#!/bin/bash
# net-health-check.sh — diagnóstico de red estructurado

GATEWAY=\$(ip route show default | awk '/default/ {print \$3}')
IFACE=\$(ip route show default | awk '/default/ {print \$5}')

echo "=== INFORME DE DIAGNÓSTICO DE RED ==="
echo "Fecha: \$(date)"
echo "Host:  \$(hostname)"
echo ""

echo "--- CAPA 1/2: Interfaz \$IFACE ---"
ip -s link show "\$IFACE" | awk '/RX:|TX:|errors/ {print}'

echo ""
echo "--- CAPA 3: Direccionamiento ---"
ip addr show "\$IFACE" | grep inet
echo "Gateway configurado: \$GATEWAY"
ping -c 2 -W 2 "\$GATEWAY" > /dev/null 2>&1 \
  && echo "Gateway: ALCANZABLE" \
  || echo "Gateway: INACCESIBLE"

echo ""
echo "--- DNS ---"
DNS_RESP=\$(dig +short +time=3 google.com 2>/dev/null)
[ -n "\$DNS_RESP" ] && echo "DNS: OK (\$DNS_RESP)" || echo "DNS: FALLO"

echo ""
echo "--- CAPA 4: Puertos en escucha ---"
ss -tlnp | awk 'NR>1 {printf "  %-25s %s\\n", \$4, \$6}'

echo ""
echo "--- FIREWALL ---"
FW_RULES=\$(iptables -L INPUT -n --line-numbers 2>/dev/null | grep -c DROP)
echo "Reglas DROP activas en INPUT: \$FW_RULES"

echo ""
echo "=== FIN DEL INFORME ==="
\`\`\`

\`\`\`bash
chmod +x net-health-check.sh
sudo ./net-health-check.sh
\`\`\`

\`\`\`text
=== INFORME DE DIAGNÓSTICO DE RED ===
Fecha: Mon Aug  4 02:14:33 UTC 2026
Host:  servidor-prod-01

--- CAPA 1/2: Interfaz eth0 ---
    RX: bytes  packets  errors  dropped  overrun  mcast
    TX: bytes  packets  errors  dropped  carrier  collisions

--- CAPA 3: Direccionamiento ---
    inet 192.168.1.50/24 brd 192.168.1.255 scope global eth0
Gateway configurado: 192.168.1.1
Gateway: ALCANZABLE

--- DNS ---
DNS: OK (142.250.80.46)

--- CAPA 4: Puertos en escucha ---
  0.0.0.0:22             users:(("sshd",pid=1234))
  127.0.0.1:80           users:(("nginx",pid=5678))

--- FIREWALL ---
Reglas DROP activas en INPUT: 0

=== FIN DEL INFORME ===
\`\`\`

El script revela de inmediato que nginx escucha solo en loopback — causa probable del fallo de acceso externo.

### 📋 Lo que debes recordar

* Siempre diagnostica de capa 1 hacia arriba: no asumas que la red funciona.
* \`ip link show\` + \`ethtool\` confirman capa física antes de cualquier otro paso.
* \`ss -tlnp\` revela si el servicio escucha en \`0.0.0.0\` o solo en \`127.0.0.1\`.
* \`Connection refused\` ≠ \`Connection timed out\`: el primero es puerto cerrado, el segundo es firewall.
* \`mtr --report\` es superior a \`ping\` para diagnosticar pérdida intermitente a lo largo del camino.
* Pérdida de ICMP en saltos intermedios no implica pérdida de TCP — verifica siempre con el protocolo real.
* \`arping -D\` detecta conflictos de IP; \`ping -M do -s 1400\` revela problemas de MTU.

### 🧪 Autoevaluación

1. \`ping\` al gateway funciona pero \`curl http://api.ejemplo.com\` falla con timeout. ¿Cuál es el siguiente paso y por qué?
2. \`ss -tlnp\` muestra \`127.0.0.1:443\` para tu servidor web. Un cliente externo reporta que no puede conectarse al puerto 443. ¿Cuál es la causa y cómo se corrige?
3. \`mtr --report\` muestra 20% de pérdida en el salto 4 (un router intermedio) pero 0% en el salto 5 (el destino). ¿Indica esto un problema real de conectividad? Justifica tu respuesta.

---

1. El siguiente paso es verificar DNS con \`dig +short api.ejemplo.com\` y comparar con \`dig @8.8.8.8 +short api.ejemplo.com\`. El gateway responde (capa 3 ok), entonces el problema está en capa 4 o superior: DNS incorrecto, firewall bloqueando el puerto, o el servicio no escucha externamente.
2. La causa es que el servidor escucha solo en la interfaz de loopback (\`127.0.0.1\`), no en todas las interfaces. La corrección es cambiar la directiva \`listen\` en la configuración del servidor web a \`listen 443 ssl;\` o \`listen 0.0.0.0:443 ssl;\` y recargar el servicio.
3. No indica un problema real de conectividad TCP. Los routers intermedios frecuentemente configuran QoS que deprioritiza o descarta ICMP (usado por mtr) para reducir carga de control. Si el destino final (salto 5) muestra 0% de pérdida, el tráfico TCP llega correctamente. Se debe verificar con \`nc -zv destino puerto\` o \`curl\` para confirmar conectividad real.
`

export default content
