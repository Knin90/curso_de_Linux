const content = `
## Módulo 3 — ss y netstat: estado de conexiones y sockets

### 🎯 Objetivos de aprendizaje

* Usar \`ss\` para listar conexiones TCP/UDP activas con filtros precisos.
* Interpretar los estados TCP y entender su significado operativo.
* Aplicar filtros de \`ss\` por puerto, IP, estado y proceso.
* Leer \`/proc/net/tcp\` y decodificar su formato hexadecimal.
* Entender por qué \`ss\` reemplaza a \`netstat\` y cuándo cada uno aplica.

### ❓ El problema real

Un servidor de API tiene CPU alta y tiempos de respuesta lentos. El proceso sigue corriendo. Los logs no muestran errores obvios. Un colega sugiere que "puede ser un problema de red". ¿Cómo verificas si hay miles de conexiones en TIME_WAIT acumuladas? ¿Si el puerto 443 tiene demasiados CLOSE_WAIT? ¿Si algún proceso inesperado está escuchando en un puerto que no debería? Con \`ss\` tienes respuestas en segundos.

### 📖 ss vs netstat: por qué migrar

\`netstat\` viene del paquete \`net-tools\`, que ya no tiene mantenimiento activo. \`ss\` (socket statistics) usa el kernel interface \`NETLINK_INET_DIAG\` — una interfaz directa al kernel que es más rápida y completa:

\`\`\`text
Característica       netstat              ss
─────────────────────────────────────────────────────
Fuente de datos      /proc/net/tcp (lento) NETLINK_INET_DIAG (directo)
Velocidad            Lento en muchas conex Rápido con miles de conexiones
Filtros              Limitados             Expresivos (src/dst/port/state)
Info de proceso      Requiere -p (lento)   Integrado con -p
Disponibilidad       Puede no estar        Siempre en iproute2
Sockets Unix         Básico                Detallado
\`\`\`

\`\`\`bash
# En sistemas modernos, instalar net-tools puede no estar disponible
# ss siempre está disponible (parte de iproute2)
which ss       # /usr/sbin/ss o /bin/ss
which netstat  # puede no existir
\`\`\`

### 📖 Uso básico de ss

\`\`\`bash
# Opciones principales
# -t  TCP
# -u  UDP
# -l  solo sockets en LISTEN
# -n  no resolver nombres (más rápido, más preciso)
# -p  mostrar el proceso dueño del socket
# -e  mostrar información extendida
# -s  resumen estadístico
# -4  solo IPv4
# -6  solo IPv6

# Todos los sockets TCP en LISTEN (sin resolver nombres)
ss -tlnp

# Todos los sockets TCP y UDP activos con proceso
ss -tunp

# Solo conexiones establecidas
ss -tn state established

# Resumen estadístico del sistema
ss -s
\`\`\`

\`\`\`text
# Salida de ss -tlnp
State   Recv-Q Send-Q  Local Address:Port   Peer Address:Port  Process
LISTEN  0      128     0.0.0.0:22           0.0.0.0:*          users:(("sshd",pid=1234,fd=3))
LISTEN  0      511     0.0.0.0:80           0.0.0.0:*          users:(("nginx",pid=5678,fd=6))
LISTEN  0      128     127.0.0.1:5432       0.0.0.0:*          users:(("postgres",pid=910,fd=5))
LISTEN  0      128     0.0.0.0:443          0.0.0.0:*          users:(("nginx",pid=5678,fd=7))
\`\`\`

Campos críticos:
- **Recv-Q**: bytes en el buffer de recepción del socket que la aplicación aún no leyó. En LISTEN, número de conexiones completas esperando \`accept()\`.
- **Send-Q**: bytes en el buffer de envío que el kernel no ha podido enviar aún. Alto Send-Q indica que el cliente no está leyendo (backpressure).
- En un socket LISTEN: **Recv-Q > 0** indica que el proceso no está haciendo \`accept()\` lo suficientemente rápido — el backlog se está llenando.

### 📖 Estados TCP y su significado operativo

TCP tiene 11 estados. En producción, estos son los que importan:

\`\`\`text
Estado          Significado
────────────────────────────────────────────────────────────────
LISTEN          Esperando conexiones entrantes (servidor)
SYN_SENT        Cliente envió SYN, esperando SYN-ACK
SYN_RECV        Servidor recibió SYN, enviando SYN-ACK (half-open)
ESTABLISHED     Conexión activa, datos fluyendo
FIN_WAIT1       Iniciamos cierre, enviamos FIN
FIN_WAIT2       Recibimos ACK de nuestro FIN, esperando FIN del otro
TIME_WAIT       Esperando 2*MSL (2 min) antes de liberar el puerto
CLOSE_WAIT      El otro extremo cerró, nosotros aún no cerramos
LAST_ACK        Enviamos FIN, esperando ACK final
CLOSING         Ambos cerrando simultáneamente
CLOSED          Conexión terminada completamente
\`\`\`

**Los estados problemáticos en producción:**

\`\`\`bash
# Ver conteo de conexiones por estado
ss -tn | awk 'NR>1 {print \$1}' | sort | uniq -c | sort -rn
\`\`\`

\`\`\`text
Problema frecuente: miles de TIME_WAIT
─────────────────────────────────────────────────────────
- Normal: TIME_WAIT dura 2*MSL (normalmente 60 segundos en Linux)
- Causa: El servidor cierra conexiones (HTTP sin keep-alive, microservicios)
- Impacto: Agotamiento de puertos efímeros si el servidor hace muchas conexiones salientes
- Solución: Habilitar SO_REUSEADDR, ajustar net.ipv4.tcp_tw_reuse=1

Problema frecuente: CLOSE_WAIT que no se van
─────────────────────────────────────────────────────────
- Causa: Bug en la aplicación — recibe FIN del cliente pero NUNCA cierra el socket
- Impacto: File descriptors agotados, conexiones zombis acumuladas
- Diagnóstico: ss -tnp state close-wait
- Solución: Arreglar el bug en la aplicación (el kernel no puede cerrar por ti)
\`\`\`

### 📖 Filtros de ss

Los filtros son la parte más poderosa de \`ss\`. Usan una sintaxis propia:

\`\`\`bash
# Conexiones a un puerto de destino específico
ss -tn dst :443

# Conexiones desde una IP específica
ss -tn src 10.0.0.5

# Conexiones a una IP:puerto específico
ss -tn dst 192.168.1.100:5432

# Conexiones en un rango de puertos de destino
ss -tn dport \\> :1024 and dport \\< :65535

# Conexiones de un proceso específico (por PID)
ss -tp | grep "pid=1234"

# Solo ESTABLISHED en el puerto 80
ss -tn state established '( dport = :80 or sport = :80 )'

# Sockets con Recv-Q no vacío (backlog acumulado)
ss -tn | awk 'NR>1 && \$2 > 0'

# Conexiones a postgres desde hosts remotos
ss -tnp state established dst :5432

# Contar conexiones por IP de origen al puerto 80
ss -tn state established dport :80 | awk 'NR>1 {print \$5}' | cut -d: -f1 | sort | uniq -c | sort -rn
\`\`\`

### 📖 ss -s: resumen estadístico del sistema

\`\`\`bash
ss -s
\`\`\`

\`\`\`text
Total: 847
TCP:   823 (estab 412, closed 24, orphaned 0, timewait 387)

Transport Total     IP        IPv6
RAW       1         0         1
UDP       8         6         2
TCP       799       610       189
INET      808       616       192
FRAG      0         0         0
\`\`\`

Esto es el "termómetro" rápido del sistema de red:
- **timewait 387**: 387 conexiones en TIME_WAIT. Si este número sube a decenas de miles, hay un problema de agotamiento de puertos potencial.
- **orphaned**: sockets TCP que no tienen proceso dueño — el proceso murió sin cerrar el socket. Deberían ser 0 normalmente.
- **closed**: sockets en proceso de cierre activo.

### 📖 /proc/net/tcp: leer la tabla de sockets directamente

\`/proc/net/tcp\` es el origen de datos que usaba \`netstat\`. Es útil cuando \`ss\` no está disponible o quieres scripting directo:

\`\`\`bash
cat /proc/net/tcp
\`\`\`

\`\`\`text
  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 00000000:0016 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 12345 1 ...
   1: 0F02000A:1F90 0502000A:C47F 01 00000000:00000000 00:00000000 00000000  1000        0 23456 1 ...
\`\`\`

El formato es hexadecimal, big-endian invertido (little-endian por octeto):

\`\`\`bash
# Decodificar local_address: 0F02000A:1F90
# 0F02000A → bytes: 0F 02 00 0A → invertido: 0A 00 02 0F = 10.0.2.15
# :1F90 → 0x1F90 = 8080 en decimal

# Script para decodificar /proc/net/tcp
awk 'NR>1 {
  split(\$2, a, ":");
  port = strtonum("0x" a[2]);
  n = split(a[1], b, "");
  ip = strtonum("0x" substr(a[1],7,2)) "." strtonum("0x" substr(a[1],5,2)) "." strtonum("0x" substr(a[1],3,2)) "." strtonum("0x" substr(a[1],1,2));
  printf "%s:%d state=%s\\n", ip, port, \$4;
}' /proc/net/tcp
\`\`\`

Estados en \`/proc/net/tcp\` (campo \`st\`):
\`\`\`text
01 = ESTABLISHED    06 = TIME_WAIT
02 = SYN_SENT       07 = CLOSE
03 = SYN_RECV       08 = CLOSE_WAIT
04 = FIN_WAIT1      09 = LAST_ACK
05 = FIN_WAIT2      0A = LISTEN
\`\`\`

### 📖 Casos prácticos de diagnóstico

**Caso 1: ¿Quién está escuchando en el puerto 8080?**

\`\`\`bash
ss -tlnp sport :8080
# o para ver el proceso también con root
sudo ss -tlnp sport :8080
\`\`\`

**Caso 2: ¿Cuántas conexiones tiene el proceso nginx?**

\`\`\`bash
# Obtener PID de nginx primero
pgrep -f nginx

# Ver sus conexiones
ss -tp | grep "pid=\$(pgrep -f 'nginx: master')"

# Contar conexiones ESTABLISHED de nginx al puerto 443
ss -tnp state established sport :443 | wc -l
\`\`\`

**Caso 3: Detectar CLOSE_WAIT acumulado**

\`\`\`bash
# Ver todos los CLOSE_WAIT
ss -tnp state close-wait

# Si hay muchos y todos del mismo proceso → bug en la app
ss -tnp state close-wait | awk '{print \$NF}' | grep -oP 'pid=\\d+' | sort | uniq -c | sort -rn
\`\`\`

**Caso 4: Monitoreo de conexiones en tiempo real**

\`\`\`bash
# Actualizar cada segundo
watch -n 1 'ss -s'

# Ver conteo de conexiones por estado en tiempo real
watch -n 1 'ss -tn | tail -n +2 | awk "{print \$1}" | sort | uniq -c | sort -rn'
\`\`\`

### 📋 Lo que debes recordar

* \`ss -tlnp\` es el comando de referencia para ver qué está escuchando y qué proceso lo posee.
* Recv-Q > 0 en un socket LISTEN significa que el proceso no hace \`accept()\` lo suficientemente rápido — el backlog se llena y las conexiones entrantes comenzarán a ser rechazadas.
* CLOSE_WAIT que no desaparece es siempre un bug en la aplicación — el kernel no puede cerrar el socket por ti.
* TIME_WAIT es normal pero puede causar agotamiento de puertos efímeros en servicios de alta frecuencia de conexiones.
* \`/proc/net/tcp\` usa hexadecimal little-endian por octeto — estado \`0A\` = LISTEN, \`01\` = ESTABLISHED.
* \`ss -s\` da el resumen global en milisegundos — úsalo como "termómetro" rápido antes de ir al detalle.

### 🧪 Autoevaluación

1. Un servidor web tiene 50.000 conexiones en TIME_WAIT. ¿Cuándo esto es un problema real y cuándo es simplemente el comportamiento esperado de TCP? ¿Qué sysctl permite reusar puertos en TIME_WAIT para nuevas conexiones salientes?
2. \`ss -tlnp\` muestra un socket en LISTEN con Recv-Q = 45. ¿Qué significa esto operacionalmente y cuál es el riesgo si el número sigue creciendo?
3. ¿Cómo se decodifica la dirección local \`0101007F:0035\` del archivo \`/proc/net/tcp\` a una dirección IP:puerto legible?

---

1. TIME_WAIT es un problema real cuando: (a) el servidor hace muchas conexiones salientes (como un proxy o microservicio) y los puertos efímeros se agotan (el rango es ~28.000 por defecto); (b) en ese caso, nuevas conexiones salientes fallan con "Cannot assign requested address". Cuando el servidor solo recibe conexiones entrantes, TIME_WAIT en puertos altos no agota nada. El sysctl que permite reusar puertos en TIME_WAIT para conexiones salientes es \`net.ipv4.tcp_tw_reuse=1\` (solo aplica a conexiones iniciadas por el servidor, no a las entrantes).
2. Recv-Q = 45 en un socket LISTEN significa que hay 45 conexiones completas (con el three-way handshake terminado) que están esperando en la cola de accept backlog porque el proceso no ha llamado \`accept()\` aún. El riesgo: cuando la cola se llena (el límite es el valor de \`listen(fd, backlog)\`, típicamente 128 o 511 en nginx), el kernel empezará a rechazar nuevas conexiones con RST o silenciosamente — el cliente verá "Connection refused" o timeout.
3. \`0101007F\` se decodifica así: dividir en bytes de a 2 hex → \`01\`, \`01\`, \`00\`, \`7F\`. Estos están en little-endian (invertidos): \`7F\`, \`00\`, \`01\`, \`01\` = \`127.0.0.1\` (localhost). El puerto \`0035\` en hex = 53 en decimal. Resultado: \`127.0.0.1:53\` — el resolver local (DNS).
`

export default content
