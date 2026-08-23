const exam = [
  // Módulo 1 — Stack de red de Linux: del kernel al socket
  {
    q: '¿Qué estructura del kernel encapsula un paquete de red mientras es procesado en el stack?',
    options: ['sk_buff', 'ifreq', 'net_device', 'proto_ops'],
    correct: 0,
  },
  {
    q: '¿Qué estructura del kernel representa una interfaz de red (física o virtual)?',
    options: ['sk_buff', 'net_device', 'socket', 'sk_buff_head'],
    correct: 1,
  },
  {
    q: '¿En qué hook de Netfilter se procesan los paquetes destinados a procesos locales?',
    options: ['PREROUTING', 'FORWARD', 'INPUT', 'POSTROUTING'],
    correct: 2,
  },
  {
    q: '¿Qué tipo de socket usa ping para construir paquetes ICMP directamente?',
    options: ['SOCK_STREAM', 'SOCK_DGRAM', 'SOCK_SEQPACKET', 'SOCK_RAW'],
    correct: 3,
  },
  {
    q: '¿Qué herramienta inspecciona el estado de la capa física (velocidad, dúplex, link detected)?',
    options: ['ethtool', 'ip route', 'ss', 'tcpdump'],
    correct: 0,
  },
  {
    q: 'En la salida de "ip -s link show", ¿qué indica el campo "missed" en RX?',
    options: [
      'El firewall descartó el paquete',
      'El ring buffer estaba lleno cuando llegaron los paquetes',
      'El checksum era inválido',
      'Se perdió la señal de portadora',
    ],
    correct: 1,
  },

  // Módulo 2 — ip: gestión de interfaces, direcciones y enlaces
  {
    q: '¿Qué comando agrega una dirección IP a la interfaz eth0?',
    options: [
      'ip link set eth0 up',
      'ip route add eth0 192.168.1.100/24',
      'ip addr add 192.168.1.100/24 dev eth0',
      'ip neigh add 192.168.1.100 dev eth0',
    ],
    correct: 2,
  },
  {
    q: '¿Qué ocurre al ejecutar "ip link add veth0 type veth peer name veth1"?',
    options: [
      'Solo se crea veth0',
      'Ambas interfaces obtienen la misma MAC',
      'Una interfaz actúa como bridge',
      'Se crean dos interfaces enlazadas, como un túnel virtual',
    ],
    correct: 3,
  },
  {
    q: '¿Qué combinación de flags en "ip link show" indica que la interfaz está administrativamente activa y con señal física?',
    options: ['UP,LOWER_UP', 'UP solamente', 'LOWER_UP solamente', 'BROADCAST,MULTICAST'],
    correct: 0,
  },
  {
    q: 'En Ubuntu, ¿con qué herramienta se gestiona normalmente la configuración de red persistente?',
    options: [
      'Archivos ifcfg en /etc/sysconfig',
      'Archivos YAML de Netplan en /etc/netplan',
      'Solo con nmcli',
      'Directamente con comandos ip',
    ],
    correct: 1,
  },
  {
    q: '¿Cuál es el reemplazo moderno de ifconfig, route y arp?',
    options: ['ethtool', 'nmcli', 'ip (iproute2)', 'ss'],
    correct: 2,
  },
  {
    q: 'Si "ip addr show eth1" no muestra ninguna línea "inet", ¿qué significa?',
    options: [
      'La interfaz está físicamente caída',
      'No hay ruta hacia el destino',
      'La dirección MAC es inválida',
      'No se ha asignado ninguna dirección IP',
    ],
    correct: 3,
  },

  // Módulo 3 — ss y netstat: estado de conexiones y sockets
  {
    q: '¿Qué interfaz del kernel usa ss en lugar de leer /proc/net/tcp?',
    options: ['NETLINK_INET_DIAG', 'Polling constante de procfs', 'Sockets BPF', 'ioctl SIOCGIFCONF'],
    correct: 0,
  },
  {
    q: 'En la salida de "ss -tlnp" para un socket LISTEN, ¿qué significa Recv-Q > 0?',
    options: [
      'Bytes en buffer de envío pendientes',
      'Conexiones completas esperando ser aceptadas con accept()',
      'Retransmisiones pendientes',
      'El socket está en TIME_WAIT',
    ],
    correct: 1,
  },
  {
    q: 'Una conexión TCP donde el otro extremo cerró pero nosotros aún no llamamos close() está en qué estado?',
    options: ['TIME_WAIT', 'FIN_WAIT1', 'CLOSE_WAIT', 'LAST_ACK'],
    correct: 2,
  },
  {
    q: '¿Qué sysctl permite reutilizar sockets en TIME_WAIT para nuevas conexiones salientes?',
    options: [
      'net.ipv4.tcp_max_tw_buckets',
      'net.ipv4.tcp_tw_recycle',
      'net.ipv4.tcp_syncookies',
      'net.ipv4.tcp_tw_reuse',
    ],
    correct: 3,
  },
  {
    q: 'En /proc/net/tcp, ¿qué valor hexadecimal del campo "st" representa LISTEN?',
    options: ['0A', '01', '06', '08'],
    correct: 0,
  },
  {
    q: '¿Qué comando da un resumen global rápido del conteo de sockets por estado?',
    options: ['ss -tlnp', 'ss -s', 'ss -tn state established', 'cat /proc/net/tcp'],
    correct: 1,
  },
  {
    q: 'Sockets en CLOSE_WAIT que se acumulan indefinidamente suelen indicar qué?',
    options: [
      'Comportamiento normal bajo carga',
      'Un firewall descartando paquetes',
      'Un bug en la aplicación que no llama a close()',
      'Agotamiento de puertos efímeros',
    ],
    correct: 2,
  },

  // Módulo 4 — ping, traceroute y mtr: diagnóstico de conectividad
  {
    q: '¿Qué combinación de opciones de ping ayuda a detectar un problema de MTU en el camino?',
    options: ['-c 4 -i 0.2', '-f -c 10000', '-v -c 4', '-s 1472 -M do'],
    correct: 3,
  },
  {
    q: '¿Qué significa el ICMP tipo 3 código 4?',
    options: [
      'Fragmentación necesaria pero el bit DF está activado',
      'Red destino inalcanzable',
      'Puerto destino inalcanzable',
      'Tiempo excedido en tránsito',
    ],
    correct: 0,
  },
  {
    q: 'En traceroute, si un salto muestra "* * *" pero los saltos posteriores responden con normalidad, esto indica típicamente qué?',
    options: [
      'Una falla real de routing',
      'Ese router no responde a ICMP pero sigue reenviando el tráfico',
      'El destino es inalcanzable',
      'Un conflicto de IP duplicada',
    ],
    correct: 1,
  },
  {
    q: 'En mtr, ¿cómo se distingue una pérdida real de paquetes de un simple rate limiting de ICMP en un salto intermedio?',
    options: [
      'La pérdida real siempre muestra 100%',
      'El rate limiting nunca aparece antes del salto 3',
      'La pérdida real persiste hasta el salto de destino final',
      'El rate limiting solo ocurre con traceroute UDP',
    ],
    correct: 2,
  },
  {
    q: '¿Por qué es importante ejecutar mtr en ambas direcciones entre dos hosts?',
    options: [
      'mtr no soporta IPv6 en una sola dirección',
      'El ICMP es unidireccional por diseño',
      'TCP requiere mtr bidireccional para funcionar',
      'El routing en Internet suele ser asimétrico',
    ],
    correct: 3,
  },
  {
    q: '¿Qué indica un valor alto de "mdev" en el resumen estadístico de ping?',
    options: [
      'Alto jitter (variabilidad de la latencia)',
      'Latencia promedio alta',
      'Pérdida de paquetes',
      'Discrepancia de MTU',
    ],
    correct: 0,
  },

  // Módulo 5 — tcpdump: captura y análisis de tráfico de red
  {
    q: '¿Dónde se evalúan los filtros BPF de tcpdump para ser eficientes?',
    options: [
      'En espacio de usuario después de capturar',
      'En el kernel, antes de entregar los datos a userspace',
      'Solo en el firmware de la NIC',
      'En el proceso tcpdump después de escribir a disco',
    ],
    correct: 1,
  },
  {
    q: '¿Qué representa la combinación de flags [S.] en la salida de tcpdump?',
    options: ['Un ACK puro', 'Un FIN con ACK', 'Una respuesta SYN-ACK', 'Un reset con ACK'],
    correct: 2,
  },
  {
    q: '¿Por qué "tcpdump -A" no puede mostrar el contenido del tráfico HTTPS en el puerto 443?',
    options: [
      'tcpdump no soporta puertos TCP mayores a 1024',
      'HTTPS usa UDP, que tcpdump filtra distinto',
      '-A solo funciona en el puerto 80',
      'Los datos de la aplicación están cifrados por TLS',
    ],
    correct: 3,
  },
  {
    q: '¿Qué evidencia sugiere que un RST proviene de un firewall y no del proceso servidor real?',
    options: [
      'El RST llega tras un silencio prolongado, sin FIN previo de la aplicación servidora',
      'El RST tiene el flag SYN activado',
      'El RST se origina desde otra subred',
      'El RST tiene número de secuencia cero',
    ],
    correct: 0,
  },
  {
    q: '¿En qué formato guarda tcpdump las capturas con "-w" para analizarlas después con Wireshark?',
    options: ['JSON', 'PCAP', 'CSV', 'syslog'],
    correct: 1,
  },
  {
    q: '¿Qué filtro de tcpdump captura solo paquetes con el flag TCP RST activado?',
    options: [
      'tcp[tcpflags] & tcp-syn != 0',
      'host 192.168.1.5 and tcp',
      'tcp[tcpflags] & tcp-rst != 0',
      'port 443 and tcp',
    ],
    correct: 2,
  },

  // Módulo 6 — /proc/net e internals del stack TCP/IP
  {
    q: '¿Qué archivo de /proc/net muestra los sockets TCP IPv4 con direcciones y estados codificados en hexadecimal?',
    options: ['/proc/net/dev', '/proc/net/route', '/proc/net/arp', '/proc/net/tcp'],
    correct: 3,
  },
  {
    q: '¿Qué indica un socket "orphan" en /proc/net/sockstat?',
    options: [
      'Un socket TCP sin proceso dueño',
      'Un socket atascado permanentemente en LISTEN',
      'Un socket que usa UDP en lugar de TCP',
      'Un socket con checksum inválido',
    ],
    correct: 0,
  },
  {
    q: '¿Qué sysctl limita el backlog total de accept() del kernel, independiente del backlog de listen() de la aplicación?',
    options: [
      'net.ipv4.tcp_max_syn_backlog',
      'net.core.somaxconn',
      'net.ipv4.tcp_fin_timeout',
      'net.core.netdev_max_backlog',
    ],
    correct: 1,
  },
  {
    q: '¿Por qué se eliminó net.ipv4.tcp_tw_recycle del kernel Linux?',
    options: [
      'Fue reemplazado completamente por IPv6',
      'Duplicaba el uso de memoria bajo carga',
      'Causaba conexiones descartadas detrás de NAT por su verificación de timestamps',
      'Era incompatible con SYN cookies',
    ],
    correct: 2,
  },
  {
    q: 'Los tres valores de net.ipv4.tcp_rmem representan qué?',
    options: [
      'Lectura, escritura y buffer máximo para UDP',
      'Intervalos mínimo, default y máximo de keepalive',
      'Tamaños de backlog para SYN, accept y netdev',
      'Tamaños mínimo, default y máximo del buffer de recepción TCP',
    ],
    correct: 3,
  },
  {
    q: 'En /proc/net/tcp, ¿en qué formato están codificadas las direcciones IP?',
    options: [
      'Hexadecimal, little-endian por octeto',
      'Cadenas codificadas en base64',
      'Notación decimal con puntos',
      'Hexadecimal big-endian sin reordenar',
    ],
    correct: 0,
  },

  // Módulo 7 — Metodología de troubleshooting de red en producción
  {
    q: '¿Qué enfoque recomienda la metodología de troubleshooting basada en OSI?',
    options: [
      'Empezar por la capa de aplicación y bajar',
      'Confirmar las capas inferiores antes de subir a las superiores',
      'Revisar todas las capas simultáneamente con una sola herramienta',
      'Omitir la verificación de capa física en máquinas virtuales',
    ],
    correct: 1,
  },
  {
    q: '¿Qué comando revela errores y descartes de RX/TX a nivel de interfaz?',
    options: ['ss -tlnp', 'ip route show', 'ip -s link show', 'dig +short'],
    correct: 2,
  },
  {
    q: 'Si el ping al gateway falla pero la interfaz está UP con una IP válida, ¿dónde está el problema más probablemente?',
    options: [
      'En la resolución DNS',
      'En la capa de aplicación',
      'En la tabla de rutas',
      'En capa 2 — resolución ARP o VLAN mal configurada',
    ],
    correct: 3,
  },
  {
    q: '¿Qué diferencia hay entre "Connection refused" y "Connection timed out" al usar nc -zv?',
    options: [
      'Refused = puerto cerrado/sin listener; timed out = firewall descartando paquetes silenciosamente',
      'Refused = firewall activo; timed out = puerto cerrado',
      'Ambos indican el mismo problema de DNS',
      'Refused solo ocurre con UDP; timed out solo con TCP',
    ],
    correct: 0,
  },
  {
    q: 'Un escaneo de nmap muestra un puerto como "filtered". ¿Qué significa?',
    options: [
      'El puerto rechaza activamente las conexiones con RST',
      'Un firewall está descartando los paquetes silenciosamente (sin respuesta)',
      'El puerto está abierto y aceptando conexiones',
      'El servicio se cayó',
    ],
    correct: 1,
  },
  {
    q: '¿Para qué se usa "arping -D" (detección de duplicados)?',
    options: [
      'Para detectar discrepancias de MTU',
      'Para detectar envenenamiento de caché DNS',
      'Para detectar conflictos de IP duplicada en la red',
      'Para detectar routing asimétrico',
    ],
    correct: 2,
  },
  {
    q: '¿Por qué conviene comparar la resolución DNS local con la de un servidor público como 8.8.8.8?',
    options: [
      'El DNS público nunca resuelve dominios internos',
      'Los resolvers locales nunca cachean nada',
      'dig no puede consultar servidores públicos directamente',
      'Para detectar caché desactualizada o registros mal configurados en el resolver local',
    ],
    correct: 3,
  },

  // Módulo 8 — Proyecto real: diagnóstico completo de problemas de red en producción
  {
    q: 'Que nginx escuche en 127.0.0.1:80 en lugar de 0.0.0.0:80 provoca qué síntoma?',
    options: [
      'curl local funciona pero las conexiones externas son rechazadas',
      'El DNS deja de resolver el dominio',
      'Las conexiones a PostgreSQL se cortan intermitentemente',
      'Errores de MTU en transferencias grandes',
    ],
    correct: 0,
  },
  {
    q: 'Cuando /etc/resolv.conf es un symlink gestionado por systemd-resolved, ¿dónde se debe cambiar el DNS de forma persistente?',
    options: [
      'Directamente en /etc/resolv.conf',
      'En /etc/systemd/resolved.conf, sección [Resolve]',
      'En /etc/nsswitch.conf',
      'En /etc/hosts',
    ],
    correct: 1,
  },
  {
    q: 'mtr muestra 15% de pérdida en un salto intermedio pero 0% en el destino final. ¿Cuál es la interpretación correcta?',
    options: [
      'El router intermedio está perdiendo tráfico real de la aplicación',
      'El servidor destino está mal configurado',
      'El router intermedio deprioriza/descarta ICMP por QoS, pero el tráfico real pasa sin problema',
      'Hay un conflicto de IP duplicada en ese salto',
    ],
    correct: 2,
  },
  {
    q: '¿Por qué un tcp_keepalive_time excesivo (como el default de 7200s) puede causar desconexiones "intermitentes" reportadas por la aplicación?',
    options: [
      'Los paquetes de keepalive son bloqueados por SELinux',
      'El keepalive TCP requiere privilegios root para funcionar',
      'El kernel deshabilita el keepalive automáticamente tras 2 horas',
      'Un firewall con timeout de sesión más corto cierra la conexión antes de que el keepalive del SO actúe',
    ],
    correct: 3,
  },
  {
    q: 'Para confirmar si la conectividad TCP real a un puerto de base de datos es estable (en lugar de confiar en herramientas basadas en ICMP), ¿qué comando conviene usar?',
    options: ['nc -zv host puerto, repetido varias veces', 'ping -f host', 'traceroute -I host', 'arping -D host'],
    correct: 0,
  },
  {
    q: 'En el caso de troubleshooting de nginx, ¿cuál fue la causa raíz exacta de la falla de acceso externo?',
    options: [
      'Una regla DROP de firewall en el puerto 80',
      'La directiva listen estaba vinculada explícitamente a 127.0.0.1 en lugar de 0.0.0.0',
      'nginx no estaba corriendo',
      'El registro DNS apuntaba a la IP incorrecta',
    ],
    correct: 1,
  },
]

export default exam
