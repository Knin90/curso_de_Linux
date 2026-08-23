const exam = [
  // Módulo 1 — Tablas de routing: ip route y decisiones de enrutamiento (6)
  {
    q: '¿Qué algoritmo usa el kernel de Linux para elegir entre varias rutas que coinciden con un destino?',
    options: ['Longest Prefix Match (la ruta más específica gana)', 'Round-robin entre rutas', 'La primera ruta agregada a la tabla', 'La ruta con el nombre de interfaz alfabéticamente menor'],
    correct: 0,
  },
  {
    q: 'La tabla tiene "10.0.0.0/8 via gw1" y "10.0.10.0/24 via gw2". ¿Por qué gateway sale un paquete a 10.0.10.5?',
    options: ['gw1, porque se agregó primero', 'Por ambos gateways en balanceo', 'gw2, porque /24 es más específico que /8', 'Ninguno, porque hay conflicto de rutas'],
    correct: 2,
  },
  {
    q: '¿Qué comando muestra exactamente qué ruta usará el kernel para llegar a una IP destino específica?',
    options: ['ip route show', 'ip addr show', 'ip route get <IP>', 'ip link show'],
    correct: 2,
  },
  {
    q: 'Cuando dos rutas tienen el mismo prefijo de red, ¿cuál gana?',
    options: ['La de menor métrica', 'La de mayor métrica', 'La configurada más recientemente', 'La que apunta a la interfaz con más tráfico'],
    correct: 0,
  },
  {
    q: '¿Qué ocurre con una ruta agregada con "ip route add" al reiniciar el servidor?',
    options: ['Se convierte automáticamente en ruta persistente', 'Se mueve a la tabla local', 'Desaparece, salvo que se configure en el gestor de red', 'Cambia su métrica a 0'],
    correct: 2,
  },
  {
    q: '¿Qué significa una ruta de tipo "blackhole" en la tabla de routing?',
    options: ['Redirige el tráfico a otra tabla', 'Responde siempre con ICMP prohibited', 'Descarta los paquetes silenciosamente sin avisar al origen', 'Es una ruta reservada para VPN'],
    correct: 2,
  },
  // Módulo 2 — Rutas estáticas y policy routing (7)
  {
    q: '¿Por qué el routing normal de una sola tabla no puede resolver el caso de dos ISP con tráfico separado por origen?',
    options: ['Porque solo mira el destino del paquete, no el origen', 'Porque el kernel limita a un solo gateway por sistema', 'Porque las tablas adicionales están deshabilitadas por defecto', 'Porque requiere IPv6 obligatoriamente'],
    correct: 0,
  },
  {
    q: '¿Qué comando persiste una ruta estática en una conexión gestionada por NetworkManager?',
    options: ['ip route add', 'ip route replace', 'nmcli connection modify "conexión" +ipv4.routes "..."', 'systemctl restart networking'],
    correct: 2,
  },
  {
    q: '¿Qué comando lista las reglas de selección de tablas de routing en policy routing?',
    options: ['ip route show table all', 'ip addr show', 'ip rule list', 'ip neigh show'],
    correct: 2,
  },
  {
    q: 'Se agregan las reglas "from 10.0.0.5 table isp2 priority 50" y "from 10.0.0.5 table isp1 priority 200". ¿Qué tabla se usa?',
    options: ['isp1, porque tiene mayor prioridad numérica', 'Ambas, en balanceo de carga', 'isp2, porque prioridad 50 es menor y se evalúa primero', 'Ninguna, hay conflicto y se descarta el paquete'],
    correct: 2,
  },
  {
    q: '¿Cuál es el caso de uso más común de policy routing en un servidor?',
    options: ['Cifrado de tráfico entre interfaces', 'Balanceo de carga de CPU', 'Aumentar la MTU automáticamente', 'Multihoming: separar tráfico entre múltiples ISP según origen'],
    correct: 3,
  },
  {
    q: '¿Qué archivo define los nombres reservados de tablas de routing en Linux?',
    options: ['/etc/hosts', '/etc/resolv.conf', '/etc/network/interfaces', '/etc/iproute2/rt_tables'],
    correct: 3,
  },
  {
    q: '¿Qué criterio, además del destino, puede usar una regla de policy routing (ip rule) para seleccionar una tabla?',
    options: ['El nombre de host configurado en /etc/hosts', 'El número de proceso que generó el paquete', 'La versión del kernel', 'La marca (fwmark) del paquete, IP origen o interfaz de entrada'],
    correct: 3,
  },
  // Módulo 3 — VLANs (6)
  {
    q: '¿Qué estándar define el etiquetado de VLANs en frames Ethernet?',
    options: ['802.1X', '802.11', '802.3ad', '802.1Q'],
    correct: 3,
  },
  {
    q: '¿Qué tipo de puerto de switch necesita un servidor Linux para manejar múltiples VLANs etiquetadas sobre una sola interfaz física?',
    options: ['Access port', 'Uplink port sin configuración', 'Mirror port', 'Trunk port'],
    correct: 3,
  },
  {
    q: '¿Qué comando crea una interfaz VLAN con ID 100 sobre eth0?',
    options: ['ip link add link eth0 name eth0.100 type vlan id 100', 'ip addr add vlan100 dev eth0', 'ip link set eth0 vlan 100', 'ip route add vlan 100 dev eth0'],
    correct: 0,
  },
  {
    q: '¿Qué módulo del kernel debe estar cargado para que funcionen las interfaces VLAN en Linux?',
    options: ['bonding', 'bridge', '8021q', 'veth'],
    correct: 2,
  },
  {
    q: '¿Por qué la interfaz física conectada a un trunk generalmente no lleva IP asignada directamente?',
    options: ['Porque el kernel lo prohíbe técnicamente', 'Porque afectaría la velocidad del enlace', 'Porque las interfaces trunk no soportan IPv4', 'Porque la IP debe estar en cada sub-interfaz VLAN para mantener el aislamiento'],
    correct: 3,
  },
  {
    q: '¿Cuántos bytes añade el etiquetado 802.1Q al frame Ethernet original?',
    options: ['2 bytes', '8 bytes', '12 bytes', '4 bytes'],
    correct: 3,
  },
  // Módulo 4 — Bonding y teaming (7)
  {
    q: '¿Qué modo de bonding es el más usado para alta disponibilidad sin requerir configuración especial en el switch?',
    options: ['balance-rr (modo 0)', 'balance-xor (modo 2)', '802.3ad LACP (modo 4)', 'active-backup (modo 1)'],
    correct: 3,
  },
  {
    q: '¿Qué parámetro de bonding controla la frecuencia de verificación del estado de los enlaces esclavos?',
    options: ['lacp_rate', 'xmit_hash_policy', 'miimon', 'primary'],
    correct: 2,
  },
  {
    q: '¿Qué modo de bonding requiere que el switch soporte LACP (Link Aggregation Control Protocol)?',
    options: ['active-backup (modo 1)', 'balance-tlb (modo 5)', 'balance-alb (modo 6)', '802.3ad (modo 4)'],
    correct: 3,
  },
  {
    q: '¿Qué archivo permite consultar el estado detallado de un bond, incluyendo el esclavo activo?',
    options: ['/proc/net/bonding/bond0', '/etc/network/bond0.conf', '/sys/class/net/bond0/state', '/var/log/bonding.log'],
    correct: 0,
  },
  {
    q: 'Se configura bond0 en modo 802.3ad pero no hay tráfico. ¿Qué debe verificarse primero?',
    options: ['Que el driver del NIC esté actualizado', 'Que la IP del bond esté en la misma subred que el gateway', 'Que el firewall permita tráfico ICMP', 'Que el switch tenga configurado un LAG/port-channel con LACP activo'],
    correct: 3,
  },
  {
    q: '¿Cómo se llaman las interfaces físicas que forman parte de un bond?',
    options: ['Maestros (masters)', 'Réplicas (replicas)', 'Puertos (ports)', 'Esclavos (slaves)'],
    correct: 3,
  },
  {
    q: '¿Qué diferencia principal hay entre balance-tlb y balance-alb?',
    options: ['balance-alb distribuye también RX usando ARP negotiation, tlb solo distribuye TX', 'balance-tlb requiere switch con LACP y balance-alb no', 'balance-alb no soporta failover y balance-tlb sí', 'No hay diferencia, son alias del mismo modo'],
    correct: 0,
  },
  // Módulo 5 — Bridges y interfaces virtuales (6)
  {
    q: 'Se crea un bridge y se agrega eth0 como puerto, pero se pierde la conectividad SSH. ¿Cuál es la causa más probable?',
    options: ['El bridge bloquea todo el tráfico SSH por defecto', 'El firewall se reinició automáticamente', 'El bridge requiere reiniciar el servidor para funcionar', 'La IP quedó en eth0 (que ahora es puerto) en lugar de asignarse al bridge'],
    correct: 3,
  },
  {
    q: '¿Cuál es la diferencia funcional entre un bridge y un veth pair?',
    options: ['El bridge conecta exactamente dos interfaces y el veth pair conecta N interfaces', 'El bridge es un switch software con múltiples puertos; el veth pair es un túnel de dos extremos', 'No hay diferencia, son el mismo mecanismo con nombres distintos', 'El veth pair opera en nivel 3 y el bridge en nivel 2'],
    correct: 1,
  },
  {
    q: '¿Para qué sirve principalmente una interfaz dummy?',
    options: ['Para aumentar el ancho de banda físico', 'Como IP estable para servicios, testing o anuncios BGP sin depender de hardware', 'Para cifrar el tráfico entre dos hosts', 'Para reemplazar la interfaz loopback del sistema'],
    correct: 1,
  },
  {
    q: '¿Qué comando muestra la tabla de direcciones MAC aprendidas por un bridge?',
    options: ['bridge fdb show br br0', 'ip addr show br0', 'ip neigh show dev br0', 'ss -l br0'],
    correct: 0,
  },
  {
    q: '¿Qué modo de macvlan permite comunicación entre las interfaces macvlan del mismo padre y con la red externa?',
    options: ['private', 'vepa', 'bridge', 'passthru'],
    correct: 2,
  },
  {
    q: '¿Cuál es el uso típico de un veth pair en el contexto de contenedores?',
    options: ['Conectar un namespace/contenedor con el host o con un bridge', 'Reemplazar la necesidad de direcciones IP', 'Sustituir al módulo 8021q para VLANs', 'Actuar como firewall entre dos redes'],
    correct: 0,
  },
  // Módulo 6 — Namespaces de red (6)
  {
    q: 'Al ejecutar "ip netns exec mi-ns ip addr show" en un namespace recién creado, solo aparece la interfaz lo. ¿Es esto normal?',
    options: ['No, indica que el namespace está corrupto', 'Sí, es normal: un namespace nuevo solo tiene loopback hasta que se le asigna otra interfaz', 'No, se debe reinstalar el paquete iproute2', 'Sí, pero solo si el kernel es anterior a la versión 4.0'],
    correct: 1,
  },
  {
    q: '¿Qué mecanismo se usa típicamente para conectar dos namespaces de red entre sí?',
    options: ['Un veth pair', 'Un cambio de hostname', 'Una tabla ARP compartida', 'Un archivo de sockets compartido'],
    correct: 0,
  },
  {
    q: '¿Por qué dos contenedores Docker pueden escuchar en el puerto 80 simultáneamente sin conflicto?',
    options: ['Porque Docker usa un proxy interno que reasigna puertos automáticamente', 'Porque cada contenedor tiene su propio namespace de red, y el puerto es un recurso por namespace', 'Porque el puerto 80 está reservado para múltiples procesos por diseño del kernel', 'Porque Docker no usa red real entre contenedores'],
    correct: 1,
  },
  {
    q: '¿Qué comando crea un nuevo namespace de red?',
    options: ['ip netns add <nombre>', 'ip link add netns <nombre>', 'ip addr add netns <nombre>', 'ip route add netns <nombre>'],
    correct: 0,
  },
  {
    q: '¿Qué elementos son independientes entre namespaces de red distintos?',
    options: ['Solo las interfaces de red', 'Interfaces, tabla de routing, reglas de firewall, sockets y tabla ARP', 'Solo el sistema de archivos', 'Solo los usuarios del sistema'],
    correct: 1,
  },
  {
    q: '¿Dónde almacena Docker los namespaces de red de sus contenedores, a diferencia de "ip netns"?',
    options: ['/var/run/netns/', '/var/run/docker/netns/', '/etc/docker/netns/', '/proc/docker/net/'],
    correct: 1,
  },
  // Módulo 7 — Diagnóstico avanzado de routing (6)
  {
    q: 'El ping a un host funciona pero "nc -zv" al puerto de la base de datos falla. ¿En qué capa está probablemente el problema?',
    options: ['En la capa de routing (capa 3)', 'En la capa de transporte/aplicación (firewall o servicio no escuchando)', 'En la capa física del cable', 'En la resolución DNS'],
    correct: 1,
  },
  {
    q: '¿Cuál es el orden correcto recomendado para diagnosticar un problema de conectividad de red?',
    options: ['traceroute → ping → nc → ip route get', 'ping → ip route get → traceroute → nc al puerto', 'nc al puerto → ping → ip route get → traceroute', 'ip route get → nc al puerto → ping → traceroute'],
    correct: 1,
  },
  {
    q: '¿Qué es el Reverse Path Filtering (RPF) y qué problema puede causar?',
    options: ['Un mecanismo de compresión de paquetes que reduce el throughput', 'Una verificación de seguridad que puede descartar paquetes legítimos si el routing es asimétrico', 'Un protocolo de enrutamiento dinámico alternativo a OSPF', 'Una función que solo aplica a tráfico IPv6'],
    correct: 1,
  },
  {
    q: '¿Qué valor de rp_filter representa el modo "loose", usado como compromiso en servidores con múltiples interfaces?',
    options: ['0', '1', '2', '3'],
    correct: 2,
  },
  {
    q: 'ip route get muestra que el tráfico va por eth0 pero debería ir por eth1 sin borrar la ruta existente. ¿Qué opción es válida?',
    options: ['Reiniciar el servicio de red completo', 'Cambiar la métrica de la ruta o agregar una ruta más específica por eth1', 'Deshabilitar eth0 físicamente', 'Modificar la tabla ARP manualmente'],
    correct: 1,
  },
  {
    q: '¿Qué herramienta genera un reporte de traceroute continuo con estadísticas de pérdida de paquetes por salto?',
    options: ['ss', 'nc', 'mtr --report', 'ip route get'],
    correct: 2,
  },
  // Módulo 8 — Proyecto real: red compleja (6)
  {
    q: 'En la topología del proyecto, ¿qué elemento permite que ns-app0 y ns-app1 se comuniquen sin pasar por el routing del host?',
    options: ['El bridge br-prod, que opera en nivel 2', 'La tabla de routing "prod"', 'El módulo 8021q', 'El servicio systemd-networkd'],
    correct: 0,
  },
  {
    q: 'Si el ping entre dos namespaces del proyecto falla, ¿cuál es un primer comando de diagnóstico razonable?',
    options: ['Reiniciar todo el servidor', 'Verificar la ruta default del namespace y los puertos del bridge con bridge link show', 'Eliminar y recrear todas las VLANs', 'Cambiar la MTU a 9000 en todas las interfaces'],
    correct: 1,
  },
  {
    q: '¿Por qué cada namespace del proyecto necesita una ruta default apuntando a la IP del bridge en el host?',
    options: ['Porque el namespace nace con la tabla de routing completamente vacía', 'Porque el kernel lo exige para namespaces con más de una interfaz', 'Porque sin ella el namespace no puede resolver DNS', 'Porque las VLANs requieren una ruta default explícita'],
    correct: 0,
  },
  {
    q: 'En la topología en capas del proyecto, ¿qué conectan los bridges y qué conecta el routing (ip_forward + rutas)?',
    options: ['Los bridges conectan dominios de nivel 3; el routing conecta dominios de nivel 2', 'Los bridges conectan dominios de nivel 2; el routing conecta dominios de nivel 3', 'Ambos operan exclusivamente en nivel 2', 'Ambos operan exclusivamente en nivel 3'],
    correct: 1,
  },
  {
    q: '¿Qué recomendación de buenas prácticas se destaca antes de aplicar cambios complejos de red en un servidor remoto?',
    options: ['Deshabilitar el firewall temporalmente', 'Tener siempre un script de limpieza preparado', 'Ejecutar los cambios exclusivamente desde la consola física del datacenter', 'Aumentar la métrica de todas las rutas a 1000'],
    correct: 1,
  },
  {
    q: '¿Qué separa el policy routing en la Fase 3 del proyecto entre el tráfico de producción y el de gestión?',
    options: ['Reglas ip rule que enrutan según la IP origen hacia tablas prod y mgmt distintas', 'Un firewall que bloquea puertos específicos', 'Dos interfaces físicas separadas sin relación con VLANs', 'El uso de DNS distinto para cada segmento'],
    correct: 0,
  },
]

export default exam
