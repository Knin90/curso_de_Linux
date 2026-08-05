const content = `
## Módulo 5 — tcpdump: captura y análisis de tráfico de red

### 🎯 Objetivos de aprendizaje

* Capturar tráfico con \`tcpdump\` usando filtros BPF precisos.
* Leer la salida de tcpdump e interpretar headers TCP, UDP e ICMP.
* Guardar capturas en formato PCAP y analizarlas con filtros.
* Capturar headers HTTP, metadatos de TLS handshake y tráfico ARP.
* Aplicar tcpdump a escenarios reales: conexiones lentas, RSTs inesperados, errores DNS.

### ❓ El problema real

Las consultas a la base de datos PostgreSQL tardan 5 segundos esporádicamente. El DBA dice que las queries están bien. El desarrollador dice que la red está mal. El equipo de red dice que no ven nada raro. Nadie tiene evidencia. Con \`tcpdump\` puedes capturar exactamente lo que pasa en el wire entre la aplicación y la base de datos, ver los timestamps reales de cada paquete, identificar si el retardo está en el network o en el tiempo de procesamiento de Postgres.

### 📖 Estructura básica de tcpdump

\`\`\`bash
tcpdump [opciones] [filtro BPF]
\`\`\`

Opciones más importantes:

\`\`\`bash
-i eth0       # interfaz a capturar (usar 'any' para todas)
-n            # no resolver nombres DNS (más rápido, más legible)
-nn           # no resolver nombres ni números de puerto a servicios
-v            # verbose: muestra más info del header IP
-vv           # muy verbose: decodes completos
-c 100        # capturar solo 100 paquetes y salir
-s 0          # capturar el paquete completo (default 262144 bytes, antes era 68)
-w archivo.pcap    # escribir a archivo PCAP en lugar de stdout
-r archivo.pcap    # leer desde archivo PCAP
-A            # mostrar payload en ASCII (útil para HTTP)
-X            # mostrar payload en hex + ASCII
-e            # mostrar headers Ethernet (MAC addresses)
-t            # no mostrar timestamp (más limpio para comparar)
-tttt         # timestamp en formato fecha/hora legible
\`\`\`

### 📖 Filtros BPF (Berkeley Packet Filter)

Los filtros BPF son la parte más poderosa. Se evalúan en el kernel, antes de enviar datos a userspace:

\`\`\`bash
# Por host (cualquier dirección: src o dst)
tcpdump -i eth0 -n host 192.168.1.5

# Solo tráfico originado desde una IP
tcpdump -i eth0 -n src host 192.168.1.5

# Solo tráfico destinado a una IP
tcpdump -i eth0 -n dst host 192.168.1.5

# Por puerto
tcpdump -i eth0 -n port 5432

# Solo tráfico TCP
tcpdump -i eth0 -n tcp

# Solo tráfico UDP
tcpdump -i eth0 -n udp

# Solo tráfico ICMP
tcpdump -i eth0 -n icmp

# Combinaciones con and, or, not
tcpdump -i eth0 -n host 192.168.1.5 and port 5432
tcpdump -i eth0 -n tcp port 80 or tcp port 443
tcpdump -i eth0 -n not port 22           # todo excepto SSH (para no capturar la propia sesión)
tcpdump -i eth0 -n 'port 80 or port 443'

# Por red
tcpdump -i eth0 -n net 192.168.1.0/24

# Combinaciones complejas
tcpdump -i eth0 -n 'host 10.0.0.5 and (port 5432 or port 6432)'

# Solo paquetes con el flag TCP RST
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-rst != 0'

# Solo paquetes con el flag SYN (conexiones nuevas)
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-syn != 0 and tcp[tcpflags] & tcp-ack == 0'

# Paquetes de más de 100 bytes (filtra handshakes pequeños)
tcpdump -i eth0 -n 'greater 100'
\`\`\`

### 📖 Leer la salida de tcpdump

\`\`\`text
# Formato de una línea TCP
timestamp  src_ip.src_port > dst_ip.dst_port: flags, seq, ack, win, options, length

# Ejemplo real
10:23:45.123456 IP 10.0.0.5.54321 > 192.168.1.10.5432: Flags [S], seq 1234567890, win 65535, options [mss 1460,sackOK,TS val 1234567 ecr 0,nop,wscale 7], length 0
10:23:45.124012 IP 192.168.1.10.5432 > 10.0.0.5.54321: Flags [S.], seq 987654321, ack 1234567891, win 28960, options [mss 1460,sackOK,TS val 9876543 ecr 1234567,nop,wscale 9], length 0
10:23:45.124089 IP 10.0.0.5.54321 > 192.168.1.10.5432: Flags [.], ack 987654322, win 512, length 0
\`\`\`

Flags TCP:
\`\`\`text
[S]   SYN      — inicio de conexión
[S.]  SYN-ACK  — respuesta al SYN
[.]   ACK      — confirmación (sin datos)
[P.]  PSH-ACK  — datos con push (la app quiere que el receptor los procese ya)
[F.]  FIN-ACK  — cierre de conexión
[R]   RST      — reset (cierre abrupto)
[R.]  RST-ACK  — reset con ack
\`\`\`

**El three-way handshake completo:**

\`\`\`text
t=0.000  cliente > servidor: [S]      seq=100,          length=0   ← SYN
t=0.012  servidor > cliente: [S.]     seq=200, ack=101, length=0   ← SYN-ACK
t=0.012  cliente > servidor: [.]      ack=201,          length=0   ← ACK
t=0.012  cliente > servidor: [P.]     ack=201, seq=101, length=23  ← primer mensaje
\`\`\`

La latencia de red = tiempo entre SYN y SYN-ACK (el RTT de un solo sentido × 2).

### 📖 Capturas prácticas en producción

**Capturar tráfico HTTP (headers en claro):**

\`\`\`bash
# Capturar HTTP y mostrar en ASCII
tcpdump -i eth0 -A -n 'tcp port 80' | grep -E 'GET|POST|HTTP|Host:|Content'

# Capturar solo las primeras 200 bytes de cada paquete (suficiente para headers)
tcpdump -i eth0 -s 200 -A -n 'tcp port 80'

# Guardar para análisis posterior con Wireshark
tcpdump -i eth0 -n -w /tmp/capture_http.pcap 'tcp port 80'
\`\`\`

**Capturar metadatos de TLS handshake (sin descifrar el contenido):**

\`\`\`bash
# El Client Hello de TLS es en claro y contiene SNI (hostname destino)
# TLS handshake records comienzan con byte 0x16 (22 decimal)
tcpdump -i eth0 -n -A 'tcp port 443 and (tcp[((tcp[12:1] & 0xf0) >> 2):1] = 0x16)'

# Más simple: capturar los primeros paquetes de cada conexión TLS
tcpdump -i eth0 -n -s 300 'tcp port 443 and (tcp[tcpflags] & tcp-syn != 0 or tcp[tcpflags] & tcp-ack != 0)'
\`\`\`

**Capturar tráfico ARP (diagnóstico de L2):**

\`\`\`bash
# ARP requests y replies
tcpdump -i eth0 -e arp

# Detectar ARP gratuitous (conflictos de IP)
tcpdump -i eth0 arp and 'arp[6:2] = 2'
\`\`\`

\`\`\`text
# Salida de ARP
10:23:45.100 ARP, Request who-has 192.168.1.10 tell 192.168.1.5, length 28
10:23:45.101 ARP, Reply 192.168.1.10 is-at 52:54:00:ab:cd:ef, length 28
\`\`\`

**Guardar y analizar capturas:**

\`\`\`bash
# Capturar a archivo (no bloquea la terminal con salida)
tcpdump -i eth0 -n -w /tmp/capture.pcap -c 10000 'host 10.0.0.5 and port 5432'

# Leer el archivo y filtrar después
tcpdump -r /tmp/capture.pcap -n 'tcp[tcpflags] & tcp-rst != 0'

# Leer y mostrar con timestamps legibles
tcpdump -r /tmp/capture.pcap -tttt -n

# Rotar capturas automáticamente cada 100MB o 60 segundos
tcpdump -i eth0 -n -w /tmp/capture_%Y%m%d_%H%M%S.pcap -G 60 -C 100 'not port 22'
\`\`\`

### 📖 Caso práctico: diagnosticar conexiones lentas a PostgreSQL

Escenario: las queries a PostgreSQL tardan 5 segundos esporádicamente. ¿Es la red o es la base de datos?

\`\`\`bash
# 1. Capturar tráfico al puerto 5432
tcpdump -i eth0 -n -tttt -w /tmp/pg_capture.pcap 'port 5432' &
TCPDUMP_PID=\$!

# 2. Reproducir el problema (dejar correr varios minutos)
# ... el DBA ejecuta sus queries lentas ...

# 3. Parar la captura
kill \$TCPDUMP_PID

# 4. Analizar: buscar gaps grandes entre paquetes
tcpdump -r /tmp/pg_capture.pcap -tttt -n 'port 5432' | awk '
{
  match(\$0, /([0-9:.]+) IP ([^ ]+) > ([^ ]+)/, arr);
  timestamp = arr[1];
  split(timestamp, t, "[: .]");
  current = t[1]*3600 + t[2]*60 + t[3] + t[4]/1000000;
  if (prev > 0 && current - prev > 1.0) {
    printf "GAP de %.3f segundos en: %s\\n", current - prev, \$0;
  }
  prev = current;
}
'
\`\`\`

**Interpretar los resultados:**

\`\`\`text
Caso A: El gap aparece ENTRE el PSH del cliente y el PSH del servidor
→ La query tardó en el servidor (tiempo de procesamiento Postgres)
→ El problema NO es la red

Caso B: El gap aparece ENTRE el PSH del cliente y el ACK del servidor
→ El servidor recibió la query (ACK rápido) pero tardó en responder
→ Puede ser red o Postgres

Caso C: El gap aparece ENTRE PSH del cliente y el ACK
→ El ACK del servidor llegó tarde (más de 200ms)
→ El problema ES la red (retransmisiones, congestión)
\`\`\`

### 📖 Detectar RSTs inesperados

Un RST inesperado cierra la conexión abruptamente. Causas: firewall timeout, proceso muerto, NAT table llena, keepalive timeout:

\`\`\`bash
# Capturar todos los RSTs
tcpdump -i eth0 -n -tttt 'tcp[tcpflags] & tcp-rst != 0'

# Guardar para análisis
tcpdump -i eth0 -n -w /tmp/rst_capture.pcap 'tcp[tcpflags] & tcp-rst != 0'

# Leer y ver el contexto (paquetes antes del RST)
# En Wireshark: filtro 'tcp.flags.reset == 1'
\`\`\`

\`\`\`text
# Patrón típico de RST por firewall timeout:
t=0.000  cliente > servidor: [P.]  data   length=1024   ← cliente envía datos
t=0.001  servidor > cliente: [.]   ack                  ← servidor confirma
... (silencio por varios minutos) ...
t=300.000 firewall > cliente: [R]                        ← firewall mató la conexión
\`\`\`

El RST viene de la IP del servidor pero no lo generó el servidor — fue el firewall. Solución: configurar TCP keepalive en la aplicación o aumentar el timeout del firewall.

### 📖 Captura sin interrumpir el tráfico: permisos y consideraciones

\`\`\`bash
# tcpdump requiere CAP_NET_ADMIN o root
sudo tcpdump -i eth0 -n -c 100

# Alternativa: dar permisos a un usuario específico (con cuidado)
# El grupo 'pcap' permite captura en algunas distribuciones
sudo setcap cap_net_raw,cap_net_admin=eip /usr/sbin/tcpdump

# En producción: limitar el tiempo y volumen de captura
sudo timeout 30 tcpdump -i eth0 -n -c 5000 -w /tmp/capture.pcap 'host 10.0.0.5'

# Nunca capturar en texto claro en discos compartidos (datos sensibles)
# Usar cifrado o capturar en /tmp con permisos restrictivos
chmod 600 /tmp/capture.pcap
\`\`\`

### 📋 Lo que debes recordar

* Los filtros BPF se evalúan en el kernel — son eficientes. Usar filtros específicos reduce el impacto en el sistema.
* Los flags TCP \`[S]\`, \`[S.]\`, \`[.]\` son el three-way handshake. El tiempo entre \`[S]\` y \`[S.]\` es el RTT de red.
* \`-w archivo.pcap\` guarda la captura para análisis posterior con Wireshark o tcpdump \`-r\`.
* Un RST recibido de la IP del servidor que no fue generado por el proceso servidor = firewall o middlebox en el camino.
* Para diagnosticar "¿es la red o es la app?", comparar el timestamp del request con el del response: si el ACK llega rápido pero la respuesta tarda, el problema está en la app. Si el ACK tarda, el problema está en la red.
* En producción, limitar siempre la captura con \`-c N\` o \`timeout\` para no saturar el disco.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`tcpdump -i eth0 host 10.0.0.5\` y \`tcpdump -i eth0 src host 10.0.0.5\`, y cuándo usarías cada uno?
2. Capturas tráfico a PostgreSQL y ves este patrón: cliente envía \`[P.]\` con la query a t=0.000, el servidor responde con \`[.]\` (ACK puro) a t=0.001, y finalmente envía \`[P.]\` con la respuesta a t=4.987. ¿Dónde está el retardo y cómo lo sabes?
3. ¿Por qué \`tcpdump -A -i eth0 port 443\` no muestra el contenido de las peticiones HTTPS, pero \`tcpdump -A -i eth0 port 80\` sí muestra las peticiones HTTP en texto legible?

---

1. \`host 10.0.0.5\` captura todo el tráfico donde esa IP aparece, ya sea como origen o destino — cualquier conversación que involucre a esa IP. \`src host 10.0.0.5\` captura solo los paquetes iniciados desde esa IP. Uso de \`host\`: cuando quieres ver toda la actividad de red de un servidor (diagnóstico completo). Uso de \`src host\`: cuando quieres ver solo lo que ese servidor genera, por ejemplo para auditar qué conexiones salientes está haciendo o si está enviando datos inesperados.
2. El retardo está en la base de datos (PostgreSQL), no en la red. La evidencia es el patrón: el servidor devolvió un ACK a t=0.001 (1 milisegundo) — esto demuestra que el paquete llegó a la NIC del servidor y fue reconocido por el kernel casi inmediatamente. El retardo de 4.986 segundos ocurre entre que el kernel recibió la query y que PostgreSQL generó la respuesta. Si el problema fuera la red, el ACK también habría tardado.
3. HTTPS cifra el contenido de la capa de aplicación usando TLS. \`tcpdump\` captura los bytes tal como viajan en el wire — en HTTPS, después del TLS handshake, todos los datos de la aplicación están cifrados con AES (u otro algoritmo). tcpdump ve bytes cifrados que no tiene manera de descifrar sin la clave privada. HTTP no tiene cifrado: los headers y el body viajan en texto plano, por eso \`-A\` los muestra directamente legibles.
`

export default content
