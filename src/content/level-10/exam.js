export default [
  // Módulo 1 — Arquitectura Netfilter: cómo filtra Linux el tráfico (6)
  { q: '¿Qué es Netfilter?', options: ['El framework del kernel Linux que intercepta paquetes de red', 'Un comando para listar reglas de firewall', 'Una distribución especializada en seguridad', 'Un servicio de systemd para DNS'], correct: 0 },
  { q: '¿Cuántos hooks principales tiene Netfilter?', options: ['3', '5', '4', '7'], correct: 1 },
  { q: 'Un paquete destinado a un proceso local (ej. nginx) atraviesa, en orden, los hooks:', options: ['OUTPUT y POSTROUTING', 'FORWARD únicamente', 'PREROUTING y luego INPUT', 'INPUT y luego PREROUTING'], correct: 2 },
  { q: '¿Qué hook se usa para tráfico que pasa a través del host sin ser su destino final?', options: ['INPUT', 'OUTPUT', 'PREROUTING', 'FORWARD'], correct: 3 },
  { q: '¿Qué diferencia a un firewall stateful de uno stateless?', options: ['El stateful usa conntrack para rastrear el estado de las conexiones', 'El stateless es siempre más rápido y seguro', 'El stateful no puede bloquear tráfico entrante', 'No hay diferencia práctica entre ambos'], correct: 0 },
  { q: '¿Qué relación tienen iptables, nftables y ufw con Netfilter?', options: ['Son alternativas independientes que no usan Netfilter', 'Son herramientas de espacio de usuario que escriben reglas en Netfilter', 'Netfilter es un plugin de ufw', 'Son módulos del kernel que reemplazan a Netfilter'], correct: 1 },

  // Módulo 2 — iptables: tablas, cadenas y políticas (6)
  { q: '¿Cuál es la tabla por defecto de iptables usada para aceptar o descartar paquetes?', options: ['nat', 'mangle', 'filter', 'raw'], correct: 2 },
  { q: '¿Qué tabla de iptables se usa para Network Address Translation?', options: ['filter', 'raw', 'mangle', 'nat'], correct: 3 },
  { q: '¿Qué cadena de la tabla filter gestiona el tráfico generado por el propio host?', options: ['OUTPUT', 'INPUT', 'FORWARD', 'PREROUTING'], correct: 0 },
  { q: 'En producción, ¿cuál es la política por defecto recomendada para la cadena INPUT?', options: ['ACCEPT', 'DROP', 'REJECT', 'LOG'], correct: 1 },
  { q: '¿Qué comando permite persistir las reglas de iptables para que sobrevivan a un reinicio?', options: ['iptables -L -v -n', 'nft list ruleset', 'iptables-save > /etc/iptables/rules.v4', 'ufw reload'], correct: 2 },
  { q: '¿Qué indica el flag `-v` en `iptables -L -v -n`?', options: ['Muestra la versión de iptables', 'Activa el modo de solo lectura', 'Elimina todas las reglas antes de listar', 'Muestra contadores de paquetes y bytes por regla'], correct: 3 },

  // Módulo 3 — Reglas iptables: sintaxis, targets y orden (7)
  { q: 'En una cadena de iptables, ¿qué regla se aplica a un paquete?', options: ['La primera regla que hace match', 'La última regla de la cadena', 'Una elegida al azar entre las que coinciden', 'Todas las reglas que coinciden, en orden'], correct: 0 },
  { q: '¿Qué diferencia hay entre los targets DROP y REJECT?', options: ['Son exactamente equivalentes', 'DROP descarta silenciosamente; REJECT envía una respuesta ICMP de error', 'REJECT solo funciona en la tabla nat', 'DROP nunca se puede usar en la cadena INPUT'], correct: 1 },
  { q: '¿Qué característica tiene el target LOG?', options: ['Termina el procesamiento del paquete inmediatamente', 'Solo puede usarse en la tabla nat', 'Registra el paquete pero no detiene su evaluación posterior', 'Reemplaza automáticamente a DROP'], correct: 2 },
  { q: 'Tienes las reglas en orden: (1) `-A INPUT -j DROP` y (2) `-A INPUT -p tcp --dport 80 -j ACCEPT`. ¿Funciona el acceso HTTP?', options: ['Sí, porque ACCEPT tiene prioridad sobre DROP', 'Depende del orden alfabético de los targets', 'Sí, pero solo para tráfico IPv6', 'No, porque la regla (1) descarta el tráfico antes de llegar a la (2)'], correct: 3 },
  { q: '¿Qué opción de iptables inserta una regla en una posición específica de la cadena?', options: ['-I', '-A', '-D', '-L'], correct: 0 },
  { q: '¿Por qué se recomienda establecer la política ACCEPT antes de hacer `iptables -F` en una sesión remota?', options: ['Porque -F elimina también las políticas por defecto', 'Para no quedar bloqueado si la política era DROP y las reglas de permiso desaparecen momentáneamente', 'Porque -F requiere política ACCEPT para ejecutarse', 'No es necesario, es solo una preferencia estética'], correct: 1 },
  { q: '¿Qué target permite volver a la cadena que llamó a la cadena actual?', options: ['ACCEPT', 'LOG', 'RETURN', 'DROP'], correct: 2 },

  // Módulo 4 — nftables: el sucesor moderno de iptables (7)
  { q: '¿Cuál es la principal ventaja de nftables frente a las cuatro herramientas separadas de iptables?', options: ['Elimina por completo la necesidad de un firewall', 'Solo funciona con IPv6', 'No requiere privilegios de administrador', 'Unifica todo en una sola herramienta con sintaxis consistente'], correct: 3 },
  { q: '¿Qué family de nftables permite manejar IPv4 e IPv6 en el mismo ruleset?', options: ['inet', 'ip', 'ip6', 'arp'], correct: 0 },
  { q: 'En nftables, ¿cómo se permiten los puertos 22, 80 y 443 en una sola regla?', options: ['Con tres reglas separadas obligatoriamente', 'Usando un set: `tcp dport { 22, 80, 443 } accept`', 'No es posible agrupar puertos en nftables', 'Usando la tabla mangle'], correct: 1 },
  { q: '¿Qué comando muestra todo el ruleset activo de nftables?', options: ['nft flush ruleset', 'nft add table', 'nft list ruleset', 'iptables -L'], correct: 2 },
  { q: '¿Qué comando añade dinámicamente una IP a un set de nftables sin recargar todo el ruleset?', options: ['nft flush ruleset', 'nft list tables', 'iptables -A INPUT -s IP -j DROP', 'nft add element inet firewall blocklist { IP }'], correct: 3 },
  { q: '¿Qué servicio debe habilitarse para que nftables cargue su configuración automáticamente al arrancar?', options: ['systemctl enable nftables', 'systemctl enable iptables-persistent', 'systemctl enable netfilter', 'systemctl enable ufw'], correct: 0 },
  { q: 'En sistemas modernos donde `iptables --version` muestra "(nf_tables)", ¿qué indica esto?', options: ['Que iptables está roto', 'Que iptables funciona como un wrapper sobre el backend nftables', 'Que nftables está deshabilitado', 'Que solo se puede usar IPv4'], correct: 1 },

  // Módulo 5 — ufw: gestión simplificada del firewall (6)
  { q: '¿Qué es ufw?', options: ['Un reemplazo del kernel para Netfilter', 'Una distribución de Linux orientada a firewalls', 'Un frontend de alto nivel que traduce comandos a reglas iptables/nftables', 'Un protocolo de red'], correct: 2 },
  { q: '¿Qué se debe hacer ANTES de ejecutar `ufw enable` en un servidor remoto?', options: ['Nada, se puede activar directamente', 'Reiniciar el servidor', 'Desinstalar iptables', 'Permitir el puerto SSH y configurar las políticas necesarias'], correct: 3 },
  { q: '¿Qué comando muestra las reglas de ufw con número de línea, útil para eliminarlas?', options: ['ufw status numbered', 'ufw status verbose', 'ufw app list', 'ufw reload'], correct: 0 },
  { q: '¿Qué diferencia hay entre `ufw deny from 1.2.3.4` y `ufw deny 80/tcp`?', options: ['Son exactamente lo mismo', 'La primera bloquea toda comunicación de esa IP; la segunda bloquea el puerto 80 para cualquier origen', 'La primera solo aplica a IPv6', 'ufw no permite bloquear por IP de origen'], correct: 1 },
  { q: '¿Qué son los perfiles de aplicación en ufw?', options: ['Cuentas de usuario del sistema', 'Copias de seguridad de las reglas', 'Definiciones predefinidas de puertos para aplicaciones conocidas, como "Nginx Full"', 'Un tipo de tabla de iptables'], correct: 2 },
  { q: '¿Por qué no se recomienda usar ufw e iptables directo simultáneamente en el mismo servidor?', options: ['Porque ufw no usa Netfilter', 'Porque son incompatibles a nivel de licencia', 'Porque ufw solo funciona en RHEL', 'Porque ambos escriben en las mismas cadenas y pueden interferirse entre sí'], correct: 3 },

  // Módulo 6 — NAT, reenvío de puertos y masquerading (6)
  { q: '¿Qué problema resuelve NAT en términos de direccionamiento IP?', options: ['Permite que múltiples dispositivos con IPs privadas compartan una IP pública', 'La falta de IPs privadas', 'Elimina la necesidad de DNS', 'Aumenta la velocidad de la red'], correct: 0 },
  { q: '¿En qué hook y tabla se configura típicamente MASQUERADE?', options: ['PREROUTING, tabla filter', 'POSTROUTING, tabla nat', 'INPUT, tabla mangle', 'OUTPUT, tabla raw'], correct: 1 },
  { q: '¿Qué tipo de NAT se usa para exponer un servidor interno hacia el exterior (port forwarding)?', options: ['MASQUERADE', 'SNAT', 'DNAT', 'ARPtables'], correct: 2 },
  { q: '¿Qué diferencia hay entre MASQUERADE y SNAT?', options: ['No hay ninguna diferencia', 'SNAT solo funciona con IPv6', 'MASQUERADE requiere una IP pública estática obligatoriamente', 'MASQUERADE consulta la IP de salida dinámicamente; SNAT usa una IP fija especificada'], correct: 3 },
  { q: '¿Qué parámetro del kernel debe habilitarse antes de que funcione cualquier regla NAT de reenvío?', options: ['net.ipv4.ip_forward = 1', 'net.ipv4.tcp_syncookies = 1', 'net.core.somaxconn = 1', 'net.ipv4.icmp_echo_ignore_all = 1'], correct: 0 },
  { q: 'Tienes DNAT configurado para redirigir el puerto 80, pero el tráfico sigue sin llegar al servidor interno. ¿Qué regla podría faltar?', options: ['Una regla LOG en la tabla raw', 'Una regla FORWARD que permita el tráfico ya redirigido', 'Una regla en la tabla mangle', 'Nada, DNAT no necesita reglas adicionales'], correct: 1 },

  // Módulo 7 — Logging y diagnóstico de tráfico bloqueado (6)
  { q: '¿Qué característica especial tiene el target LOG de iptables?', options: ['Termina el procesamiento del paquete como DROP', 'Solo funciona en la cadena OUTPUT', 'Registra el paquete pero no detiene su evaluación, por lo que debe ir seguido de otra regla', 'Bloquea automáticamente el tráfico registrado'], correct: 2 },
  { q: '¿Dónde se pueden consultar los logs generados por el target LOG de iptables?', options: ['Solo en /etc/iptables/rules.v4', 'En la base de datos de conntrack', 'En el historial de bash', 'En journalctl o dmesg (log del kernel)'], correct: 3 },
  { q: '¿Qué herramienta permite capturar paquetes reales en la interfaz de red para confirmar si llegan al servidor?', options: ['tcpdump', 'conntrack', 'iptables-save', 'ufw status'], correct: 0 },
  { q: 'Si `tcpdump` ve un paquete pero la aplicación nunca lo recibe, ¿dónde está probablemente el problema?', options: ['En el DNS', 'En el firewall, que está bloqueando el paquete después de que la interfaz lo recibe', 'En el proveedor de Internet', 'En la tarjeta de red'], correct: 1 },
  { q: '¿Qué comando permite ver las conexiones activas rastreadas por el kernel?', options: ['iptables -L', 'nft list ruleset', 'conntrack -L', 'ufw status verbose'], correct: 2 },
  { q: '¿Por qué es importante que la regla LOG esté ANTES de la regla DROP en la cadena?', options: ['No importa el orden, LOG siempre se ejecuta', 'Porque LOG requiere que DROP exista previamente', 'Porque LOG solo funciona después de un ACCEPT', 'Porque si DROP va primero, el paquete se descarta antes de llegar a la regla LOG'], correct: 3 },

  // Módulo 8 — Proyecto real: ruleset de producción (6)
  { q: 'En un script de firewall de producción, ¿por qué se establece política ACCEPT antes de hacer flush de las reglas existentes?', options: ['Para no perder el acceso remoto (ej. SSH) durante la transición si la política era DROP', 'Porque flush requiere política ACCEPT para ejecutarse', 'Es solo una convención sin efecto real', 'Porque ACCEPT es más rápido de aplicar'], correct: 0 },
  { q: 'Para restringir SSH solo a la red de administración `10.10.0.0/16`, ¿qué regla de iptables es correcta?', options: ['iptables -A INPUT -p tcp --dport 22 -j ACCEPT', 'iptables -A INPUT -p tcp --dport 22 -s 10.10.0.0/16 -j ACCEPT', 'iptables -A INPUT -p tcp --dport 22 -d 10.10.0.0/16 -j DROP', 'iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT'], correct: 1 },
  { q: 'Un servicio HTTPS "no responde" y `ss -tlnp` no muestra nada escuchando en el puerto 443. ¿Cuál es la causa más probable?', options: ['El firewall está bloqueando el puerto', 'DNS está mal configurado', 'El proceso del servidor web no está corriendo o no escucha en ese puerto', 'La IP pública cambió'], correct: 2 },
  { q: 'Si `ss -tlnp` y `curl` local funcionan bien, pero el cliente externo no puede conectar, ¿cuál es el siguiente paso de diagnóstico recomendado?', options: ['Reinstalar el sistema operativo', 'Cambiar el puerto de la aplicación', 'Desactivar por completo el firewall de forma permanente', 'Revisar si el firewall bloquea el tráfico externo (por ejemplo, con una regla LOG temporal)'], correct: 3 },
  { q: '¿Cuál es el equivalente en ufw de restringir SSH a una red específica, como se hace con `-s 10.10.0.0/16` en iptables?', options: ['ufw allow from 10.10.0.0/16 to any port 22 proto tcp', 'ufw allow 22/tcp', 'ufw deny 22/tcp', 'ufw default allow incoming'], correct: 0 },
  { q: '¿Cuál es el principio de seguridad que resume la estrategia del ruleset de producción del módulo 8?', options: ['Permitir todo y bloquear excepciones puntuales', 'Mínimo privilegio: todo bloqueado por defecto, solo lo necesario permitido explícitamente', 'Confiar en la seguridad por oscuridad únicamente', 'Deshabilitar el firewall en producción para evitar falsos positivos'], correct: 1 },
]
