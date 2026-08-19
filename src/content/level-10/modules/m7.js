const content = `
## Módulo 7 — Logging y diagnóstico de tráfico bloqueado

### 🎯 Objetivos de aprendizaje

* Usar el target LOG de iptables para registrar tráfico específico.
* Leer y filtrar logs de firewall en journalctl y dmesg.
* Usar tcpdump para captura de paquetes en tiempo real.
* Diagnosticar si un problema de conectividad es el firewall o la aplicación.

### ❓ El problema real

El cliente reporta que "el servicio no responde". Tienes dos hipótesis: (A) el firewall está bloqueando el tráfico, o (B) la aplicación no está escuchando o ha fallado. Sin herramientas de diagnóstico, adivinas y pierdes tiempo. Con logging y las herramientas correctas, el diagnóstico tarda menos de 2 minutos.

### 📖 El target LOG en iptables

LOG es especial: no termina el procesamiento del paquete — solo lo registra y continúa evaluando las siguientes reglas. Siempre debe ir seguido de una regla DROP o ACCEPT:

\`\`\`bash
# Registrar TODO el tráfico bloqueado (útil para diagnóstico inicial)
iptables -A INPUT -j LOG --log-prefix "FIREWALL-DROP: " --log-level 4

# Registrar intentos de conexión a un puerto específico
iptables -A INPUT -p tcp --dport 3306 -j LOG --log-prefix "MYSQL-ATTEMPT: "
iptables -A INPUT -p tcp --dport 3306 -j DROP

# Registrar tráfico desde una IP específica
iptables -A INPUT -s 203.0.113.0/24 -j LOG --log-prefix "SUSPICIOUS: "

# Patrón recomendado: LOG antes de DROP
iptables -I INPUT -j LOG --log-prefix "INPUT-DROP: " --log-level 4
iptables -A INPUT -j DROP
\`\`\`

Niveles de log (\`--log-level\`):
\`\`\`text
0 = emerg    1 = alert    2 = crit    3 = err
4 = warning  5 = notice   6 = info    7 = debug
\`\`\`

En producción usa nivel **4 (warning)** o **6 (info)** — el nivel 7 es demasiado verboso.

### 📖 Ver los logs del firewall

\`\`\`bash
# Los logs de iptables van al kernel log — accesibles via journalctl o dmesg

# Ver logs del kernel relacionados con el firewall
journalctl -k | grep "FIREWALL-DROP"

# Seguimiento en tiempo real
journalctl -k -f | grep "INPUT-DROP"

# Con dmesg
dmesg | grep "FIREWALL-DROP"
dmesg -w | grep "INPUT-DROP"   # -w = follow, como tail -f

# En sistemas con rsyslog, los logs también van a /var/log/kern.log
grep "INPUT-DROP" /var/log/kern.log
\`\`\`

Ejemplo de línea de log:
\`\`\`text
Aug 04 15:32:01 servidor kernel: FIREWALL-DROP: IN=eth0 OUT= MAC=aa:bb:cc:dd:ee:ff:... SRC=203.0.113.5 DST=10.0.0.1 LEN=60 TOS=0x00 PREC=0x00 TTL=50 ID=54321 DF PROTO=TCP SPT=54100 DPT=3306 WINDOW=65535 RES=0x00 SYN URGP=0
\`\`\`

Campos clave para diagnóstico:
\`\`\`text
IN=eth0          Interfaz de entrada
SRC=203.0.113.5  IP de origen
DST=10.0.0.1     IP de destino
PROTO=TCP        Protocolo
SPT=54100        Puerto de origen
DPT=3306         Puerto de destino (puerto bloqueado)
SYN              Es un paquete de inicio de conexión
\`\`\`

### 📖 Logging con ufw

\`\`\`bash
# Activar logging en ufw
ufw logging on          # nivel low: solo paquetes bloqueados anómalos
ufw logging medium      # paquetes bloqueados + algunas conexiones nuevas
ufw logging high        # todo, incluyendo paquetes permitidos
ufw logging full        # máximo nivel

# Ver logs de ufw
journalctl -f | grep UFW
grep UFW /var/log/ufw.log   # si rsyslog está configurado
\`\`\`

Formato de log de ufw:
\`\`\`text
[UFW BLOCK] IN=eth0 OUT= SRC=203.0.113.5 DST=10.0.0.1 ... PROTO=TCP DPT=3306
\`\`\`

### 📖 tcpdump: captura de paquetes en tiempo real

tcpdump captura paquetes reales en la interfaz de red — fundamental para confirmar si los paquetes están llegando al servidor:

\`\`\`bash
# Capturar todo el tráfico en eth0
tcpdump -i eth0

# Capturar solo tráfico en un puerto específico
tcpdump -i eth0 port 80

# Capturar tráfico de una IP específica
tcpdump -i eth0 src 203.0.113.5

# Capturar intentos de conexión SSH (paquetes SYN)
tcpdump -i eth0 'tcp port 22 and tcp[tcpflags] & tcp-syn != 0'

# Capturar y mostrar en formato legible (sin resolver DNS, sin truncar)
tcpdump -i eth0 -n -v port 443

# Guardar captura en archivo para análisis posterior
tcpdump -i eth0 -w /tmp/captura.pcap

# Leer archivo de captura
tcpdump -r /tmp/captura.pcap
\`\`\`

> tcpdump captura **antes** de que iptables procese el paquete en INPUT. Si tcpdump ve el paquete pero la aplicación no lo recibe, el problema está en el firewall.

### 📖 conntrack: ver conexiones activas

\`\`\`bash
# Instalar conntrack tools
apt install conntrack

# Ver todas las conexiones rastreadas
conntrack -L

# Filtrar por protocolo
conntrack -L -p tcp

# Filtrar por estado
conntrack -L --state ESTABLISHED

# Ver en tiempo real (eventos de conntrack)
conntrack -E

# Eliminar una conexión específica (forzar cierre)
conntrack -D -s 203.0.113.5

# Via /proc (sin herramienta conntrack)
cat /proc/net/nf_conntrack
\`\`\`

Ejemplo de salida de \`conntrack -L\`:
\`\`\`text
tcp      6 86399 ESTABLISHED src=10.0.0.2 dst=10.0.0.1 sport=54321 dport=22 [UNREPLIED] src=10.0.0.1 dst=10.0.0.2 sport=22 dport=54321 mark=0 use=1
\`\`\`

### 📖 Árbol de diagnóstico: ¿firewall o aplicación?

\`\`\`diagram
{"type":"flow-stack","layers":[{"name":"¿La app escucha localmente?","meta":"ss -tlnp | grep :80"},{"name":"¿Funciona localmente?","meta":"curl -s http://localhost:80 ó nc -zv localhost 80"},{"name":"¿Los paquetes llegan al servidor?","meta":"tcpdump -i eth0 -n port 80"},{"name":"¿El firewall está bloqueando?","meta":"iptables -L INPUT -v -n + LOG temporal","focal":true}],"edges":[{"label":"App escucha"},{"label":"Funciona local"},{"label":"Paquetes llegan","accent":true}],"sidePanel":{"title":"RESULTADO","lines":["Sin paquetes (tcpdump): problema de red externa o routing","Hay paquetes pero no logs: problema en mangle/PREROUTING/DNAT","Hay logs de DROP: firewall bloquea, añadir regla ACCEPT","Hay logs de ACCEPT pero no funciona: problema de la aplicación"]}}
\`\`\`

### 📋 Lo que debes recordar

* LOG no detiene el paquete — siempre sigue otra regla (DROP/ACCEPT).
* tcpdump ve los paquetes antes de que iptables los procese — si tcpdump los ve pero la app no los recibe, el problema es el firewall.
* El árbol de diagnóstico: aplicación escucha → funciona local → paquetes llegan → firewall bloquea.
* Los contadores de iptables (\`-v\`) son fundamentales: una regla DROP con hits crecientes es el culpable.

### 🧪 Autoevaluación

1. Tienes una regla \`LOG\` pero no aparecen logs cuando el tráfico llega. ¿Qué compruebas primero?
2. tcpdump muestra paquetes SYN llegando al puerto 80, pero la aplicación no responde y no hay logs de firewall para ese puerto. ¿Qué puede estar pasando?
3. ¿Por qué es importante que la regla LOG venga ANTES de la regla DROP en la cadena?

---

1. Comprobar que la **regla LOG está antes de la regla DROP** (\`iptables -L -n --line-numbers\`). Si LOG está después de DROP, los paquetes son descartados antes de llegar a la regla LOG.
2. Si hay paquetes SYN llegando pero no hay logs de DROP y la app no responde, el problema puede ser: (a) la aplicación está escuchando en \`127.0.0.1\` en vez de \`0.0.0.0\` (solo acepta conexiones locales), (b) la aplicación está saturada, o (c) hay una regla ACCEPT que permite el paquete pero la app lo rechaza internamente.
3. Porque las reglas se evalúan **en orden secuencial** y la primera que hace match gana. Si DROP está primero, el paquete es descartado sin pasar por LOG. Si LOG está primero (no detiene el paquete), el paquete se registra y luego DROP lo descarta.
`

export default content
