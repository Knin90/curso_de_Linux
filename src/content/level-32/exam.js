const exam = [
  // Módulo 1 — Conceptos de HA: SLA, RTO, RPO y Single Points of Failure
  {
    q: '¿Qué significa RTO en el contexto de alta disponibilidad?',
    options: [
      'El tiempo máximo aceptable para restaurar el servicio tras un fallo',
      'La cantidad máxima de datos que se pueden perder',
      'El porcentaje de tiempo que el sistema está disponible',
      'El número de réplicas necesarias para garantizar HA',
    ],
    correct: 0,
  },
  {
    q: '¿Qué significa RPO en el contexto de alta disponibilidad?',
    options: [
      'El tiempo máximo para restaurar el servicio',
      'La cantidad máxima de datos que se pueden perder tras un fallo',
      'El porcentaje de disponibilidad anual del sistema',
      'El tiempo de vida de una sesión de usuario',
    ],
    correct: 1,
  },
  {
    q: 'Un SLA del 99.9% (3 nueves) permite aproximadamente cuánto downtime al mes?',
    options: [
      'Unas 8.76 horas',
      'Unos 5 minutos',
      'Unos 43 minutos',
      'Unos 3.65 días',
    ],
    correct: 2,
  },
  {
    q: '¿Qué es un Single Point of Failure (SPOF)?',
    options: [
      'Un servidor que recibe más tráfico que los demás',
      'El nodo con mayor prioridad en un cluster VRRP',
      'El componente que ejecuta los health checks',
      'Cualquier componente cuyo fallo hace caer todo el sistema',
    ],
    correct: 3,
  },
  {
    q: 'En una estrategia active-passive, ¿qué caracteriza al nodo pasivo?',
    options: [
      'Recibe la mitad del tráfico junto al nodo activo',
      'Ejecuta los health checks de todos los demás nodos',
      'Está en standby y no recibe tráfico hasta que ocurre un failover',
      'Es el nodo con la IP virtual asignada permanentemente',
    ],
    correct: 2,
  },
  {
    q: '¿Cuál de las siguientes estrategias de recuperación ofrece el RTO y RPO más bajos, según el módulo?',
    options: [
      'Backup a disco',
      'Active-active',
      'Backup + standby',
      'Replicación asíncrona',
    ],
    correct: 1,
  },

  // Módulo 2 — HAProxy: arquitectura y configuración básica
  {
    q: '¿Cuál es la diferencia principal entre "frontend" y "backend" en HAProxy?',
    options: [
      'El frontend gestiona SSL y el backend gestiona HTTP puro',
      'El frontend es para tráfico interno y el backend para tráfico externo',
      'El frontend escucha las conexiones entrantes y el backend es el pool de servidores reales',
      'El frontend define pesos y el backend define algoritmos de balanceo',
    ],
    correct: 2,
  },
  {
    q: '¿Qué secciones combina "listen" en HAProxy?',
    options: [
      'global y defaults',
      'stats y health checks',
      'VRRP y keepalived',
      'frontend y backend en una sola definición',
    ],
    correct: 3,
  },
  {
    q: '¿Qué comando se debe ejecutar antes de recargar la configuración de HAProxy en producción?',
    options: [
      'haproxy -c -f /etc/haproxy/haproxy.cfg',
      'systemctl restart haproxy',
      'haproxy -k reload',
      'systemctl daemon-reload',
    ],
    correct: 0,
  },
  {
    q: '¿Qué diferencia hay entre `systemctl reload` y `systemctl restart` en HAProxy?',
    options: [
      'restart valida la sintaxis, reload no',
      'reload solo actualiza los certificados SSL',
      'restart solo afecta al frontend, reload afecta a todo',
      'reload no corta conexiones activas, restart sí',
    ],
    correct: 3,
  },
  {
    q: '¿Para qué sirve la opción `option forwardfor` en HAProxy?',
    options: [
      'Redirige automáticamente el tráfico HTTP a HTTPS',
      'Habilita el modo TCP en lugar de HTTP',
      'Añade el header X-Forwarded-For con la IP real del cliente al backend',
      'Permite reenviar tráfico entre dos backends distintos',
    ],
    correct: 2,
  },
  {
    q: '¿En qué formato debe combinarse el certificado SSL para usarlo en HAProxy?',
    options: [
      'Certificado en formato .crt y clave en formato .der por separado',
      'Certificado cifrado con GPG',
      'Certificado en formato PKCS12 (.pfx)',
      'Certificado y clave privada en un único archivo PEM',
    ],
    correct: 3,
  },

  // Módulo 3 — HAProxy: algoritmos de balanceo y health checks
  {
    q: '¿Qué algoritmo de balanceo es más adecuado para conexiones largas como WebSockets?',
    options: [
      'leastconn',
      'roundrobin',
      'uri',
      'static-rr',
    ],
    correct: 0,
  },
  {
    q: '¿Qué algoritmo de balanceo es ideal para mantener consistencia de contenido en una caché web?',
    options: [
      'leastconn',
      'uri',
      'random',
      'source',
    ],
    correct: 1,
  },
  {
    q: 'En un health check, ¿qué indica el parámetro `rise 2`?',
    options: [
      'El servidor se revisa cada 2 segundos',
      'Se necesitan 2 checks fallidos para marcarlo como DOWN',
      'Se necesitan 2 checks OK consecutivos para marcar el servidor como UP',
      'El servidor tiene 2 veces más peso que los demás',
    ],
    correct: 2,
  },
  {
    q: 'En un health check, ¿qué indica el parámetro `fall 3`?',
    options: [
      'El intervalo entre checks es de 3 segundos',
      'Se necesitan 3 checks OK para marcarlo como UP',
      'El servidor recibe 3 veces menos tráfico',
      'Se necesitan 3 checks fallidos consecutivos para marcar el servidor como DOWN',
    ],
    correct: 3,
  },
  {
    q: '¿Qué permite hacer el parámetro `weight` en la definición de un servidor?',
    options: [
      'Enviar más o menos tráfico proporcional a un servidor sin cambiar el algoritmo',
      'Definir cuántos health checks debe pasar antes de recibir tráfico',
      'Establecer el tiempo máximo de espera de una conexión',
      'Indicar si el servidor es backup o principal',
    ],
    correct: 0,
  },
  {
    q: '¿Qué hace la directiva `server web4 ... backup` en un backend de HAProxy?',
    options: [
      'web4 recibe tráfico duplicado como respaldo de logs',
      'web4 se usa exclusivamente para health checks',
      'web4 solo recibe tráfico si todos los demás servidores caen',
      'web4 recibe siempre la mitad del tráfico total',
    ],
    correct: 2,
  },
  {
    q: '¿Qué permite hacer una ACL como `acl is_api path_beg /api/` en HAProxy?',
    options: [
      'Bloquear peticiones que no usen HTTPS',
      'Definir el algoritmo de balanceo para ese backend',
      'Enrutar peticiones a un backend distinto según el path de la URL',
      'Configurar el health check de un servidor específico',
    ],
    correct: 2,
  },

  // Módulo 4 — keepalived y VRRP: failover de IP virtual
  {
    q: '¿Qué protocolo implementa keepalived para gestionar la IP virtual?',
    options: [
      'VRRP (Virtual Router Redundancy Protocol)',
      'BGP (Border Gateway Protocol)',
      'STP (Spanning Tree Protocol)',
      'OSPF (Open Shortest Path First)',
    ],
    correct: 0,
  },
  {
    q: 'En VRRP, ¿qué nodo tiene asignada la IP virtual en un momento dado?',
    options: [
      'Todos los nodos BACKUP simultáneamente',
      'Solo el nodo MASTER',
      'El nodo con menor prioridad',
      'Ningún nodo, la VIP es solo para DNS',
    ],
    correct: 1,
  },
  {
    q: '¿Qué debe coincidir obligatoriamente entre el nodo MASTER y el nodo BACKUP en su configuración de keepalived?',
    options: [
      'El valor de priority',
      'El estado (state)',
      'El virtual_router_id',
      'El router_id',
    ],
    correct: 2,
  },
  {
    q: '¿Qué hace el `vrrp_script` con `weight -2` cuando el script falla?',
    options: [
      'Suma 2 a la prioridad del nodo BACKUP',
      'Detiene keepalived inmediatamente',
      'Reinicia el servicio HAProxy automáticamente',
      'Resta 2 a la prioridad del nodo, favoreciendo el failover',
    ],
    correct: 3,
  },
  {
    q: '¿Qué es el "preemption" en keepalived?',
    options: [
      'El comportamiento por defecto donde el MASTER original recupera la VIP al restaurarse',
      'El proceso de autenticación entre nodos VRRP',
      'La verificación periódica del estado de HAProxy',
      'El mecanismo que impide que dos nodos compitan por la VIP',
    ],
    correct: 0,
  },
  {
    q: 'Si keepalived cae en el MASTER pero HAProxy sigue corriendo, ¿qué ocurre sin un vrrp_script de tracking?',
    options: [
      'No pasa nada porque HAProxy sigue activo',
      'El BACKUP asume la VIP aunque HAProxy en el MASTER siga sano',
      'El MASTER recupera automáticamente keepalived',
      'La VIP queda sin asignar hasta reiniciar ambos nodos',
    ],
    correct: 1,
  },
  {
    q: '¿Qué mensaje envía keepalived a la red al convertirse en MASTER para actualizar las tablas ARP?',
    options: [
      'Un paquete ICMP echo request',
      'Un broadcast DHCP',
      'Una notificación SNMP trap',
      'Un gratuitous ARP',
    ],
    correct: 3,
  },

  // Módulo 5 — Sesiones distribuidas y sticky sessions
  {
    q: '¿Qué problema resuelven las sticky sessions en un cluster con balanceo de carga?',
    options: [
      'Que las peticiones de un mismo usuario lleguen siempre al servidor que tiene su sesión en memoria',
      'Que los servidores compartan la misma configuración de red',
      'Que el tráfico se distribuya de forma perfectamente equitativa',
      'Que los health checks se ejecuten con mayor frecuencia',
    ],
    correct: 0,
  },
  {
    q: 'En la directiva `cookie SERVERID insert indirect ...` de HAProxy, ¿qué hace la opción `indirect`?',
    options: [
      'Cifra el contenido de la cookie con la clave SSL',
      'Evita que la cookie se reenvíe al servidor backend, la gestiona HAProxy',
      'Hace que la cookie se comparta entre todos los backends',
      'Convierte la sesión en persistente durante 24 horas',
    ],
    correct: 1,
  },
  {
    q: '¿Qué hace `option redispatch` en un backend de HAProxy?',
    options: [
      'Duplica cada petición a dos servidores distintos',
      'Elimina la cookie de sesión al detectar un error',
      'Reasigna la petición a otro servidor si el servidor sticky del cliente está caído',
      'Fuerza a usar siempre el algoritmo roundrobin',
    ],
    correct: 2,
  },
  {
    q: '¿Cuál es la principal ventaja de usar Redis como store de sesiones distribuidas?',
    options: [
      'Elimina la necesidad de usar HTTPS',
      'Reduce a cero la latencia de las peticiones',
      'Permite prescindir completamente del load balancer',
      'Cualquier servidor puede atender cualquier petición sin depender de sesión local',
    ],
    correct: 3,
  },
  {
    q: 'Según el módulo, ¿cuál es una desventaja de usar Redis para sesiones distribuidas?',
    options: [
      'Redis se convierte en un nuevo punto único de fallo (SPOF)',
      'No es compatible con ningún framework web moderno',
      'Obliga a desactivar los health checks en HAProxy',
      'Impide usar cookies en la aplicación',
    ],
    correct: 0,
  },
  {
    q: '¿En qué escenario tiene más sentido usar sticky sessions en lugar de Redis, según el módulo?',
    options: [
      'Cuando se necesita escalar a decenas de servidores',
      'Cuando la aplicación legacy no puede modificarse y el número de servidores es pequeño y estable',
      'Cuando se requiere failover transparente sin pérdida de sesión',
      'Cuando el presupuesto permite montar infraestructura adicional sin límite',
    ],
    correct: 1,
  },

  // Módulo 6 — Monitoreo de un cluster HA: métricas y alertas
  {
    q: '¿Dónde expone HAProxy sus métricas en formato CSV?',
    options: [
      'En la página de estadísticas, en la ruta /stats;csv',
      'En el archivo /var/log/haproxy-metrics.csv',
      'Solo a través del exporter de Prometheus',
      'En el socket de administración exclusivamente en formato JSON',
    ],
    correct: 0,
  },
  {
    q: '¿Qué comando permite ver el estado detallado de todos los servidores vía el socket de administración?',
    options: [
      'echo "status all" | socat stdio /run/haproxy/admin.sock',
      'echo "show servers state" | socat stdio /run/haproxy/admin.sock',
      'haproxy --show-state',
      'systemctl status haproxy --all',
    ],
    correct: 1,
  },
  {
    q: '¿Qué herramienta se usa para exponer las métricas de HAProxy a Prometheus?',
    options: [
      'node_exporter',
      'blackbox_exporter',
      'haproxy_exporter',
      'cadvisor',
    ],
    correct: 2,
  },
  {
    q: '¿Qué indica la métrica `haproxy_backend_up == 0`?',
    options: [
      'Que el backend está recibiendo el tráfico máximo permitido',
      'Que un solo servidor del backend está en mantenimiento',
      'Que el health check está deshabilitado en ese backend',
      'Que todos los servidores de ese backend están caídos',
    ],
    correct: 3,
  },
  {
    q: '¿Por qué se alerta con severidad "warning" cuando un servidor individual cae, en lugar de esperar a que caiga todo el backend?',
    options: [
      'Porque permite actuar preventivamente antes de que el cluster pierda toda su capacidad',
      'Porque un servidor individual siempre se recupera solo en segundos',
      'Porque las alertas críticas solo se activan en horario laboral',
      'Porque HAProxy no puede detectar la caída de todo un backend',
    ],
    correct: 0,
  },
  {
    q: '¿Cómo se detecta "flapping" en keepalived según el módulo?',
    options: [
      'Revisando el uso de CPU del proceso keepalived',
      'Contando las transiciones a MASTER STATE en los logs en un periodo de tiempo',
      'Comparando el hash de la configuración entre nodos',
      'Midiendo la latencia de red entre los servidores backend',
    ],
    correct: 1,
  },

  // Módulo 7 — Disaster recovery: procedimientos y testing
  {
    q: '¿Cuál es la diferencia principal entre HA y DR según el módulo?',
    options: [
      'HA es manual y DR es siempre automático',
      'HA solo aplica a bases de datos y DR a servidores web',
      'HA protege contra fallos de componente; DR protege contra la pérdida total del sitio',
      'HA y DR son términos equivalentes en la práctica',
    ],
    correct: 2,
  },
  {
    q: '¿Qué es un "tabletop exercise" en el contexto de testing de DR?',
    options: [
      'Una restauración completa en una región secundaria',
      'Una simulación automatizada ejecutada en producción',
      'Un test de carga sobre el balanceador principal',
      'Una revisión en equipo del runbook sin ejecutar nada real',
    ],
    correct: 3,
  },
  {
    q: '¿Qué diferencia hay entre un "partial test" y un "full DR test"?',
    options: [
      'El partial test restaura un componente no crítico en staging; el full DR test restaura todo en una región secundaria',
      'El partial test se hace en producción y el full test en un entorno aislado sin datos reales',
      'El partial test es trimestral y el full test es continuo',
      'No hay diferencia real, son sinónimos del mismo procedimiento',
    ],
    correct: 0,
  },
  {
    q: 'Según el módulo, ¿por qué un backup sin restore verificado no cuenta como un backup válido?',
    options: [
      'Porque los backups nunca deben almacenarse fuera del datacenter principal',
      'Porque no se puede confirmar que el backup es utilizable hasta que se restaura con éxito',
      'Porque el backup se invalida automáticamente después de 24 horas',
      'Porque restaurar sin verificar viola las políticas de RTO',
    ],
    correct: 1,
  },
  {
    q: 'En un runbook de DR, ¿qué elemento es indispensable según el módulo?',
    options: [
      'Una lista de proveedores de nube alternativos',
      'Un contrato de SLA firmado con el cliente',
      'Procedimientos paso a paso con comandos exactos y criterios de éxito',
      'El código fuente completo de la aplicación',
    ],
    correct: 2,
  },
  {
    q: '¿Qué debe incluir la estrategia de backup de configuración y secrets, además de los datos?',
    options: [
      'Solo el backup de las bases de datos, la configuración se puede reconstruir manualmente',
      'Una copia sin cifrar accesible a todo el equipo',
      'Backups exclusivamente en el mismo servidor de producción',
      'Cifrado de secretos (por ejemplo con git-crypt o Ansible Vault) y backup de archivos de configuración',
    ],
    correct: 3,
  },

  // Módulo 8 — Proyecto real: cluster HA completo con HAProxy y keepalived
  {
    q: 'En el proyecto del módulo, ¿por qué la configuración de HAProxy es idéntica en lb1 y lb2?',
    options: [
      'Porque keepalived, no HAProxy, decide cuál nodo atiende el tráfico real mediante la VIP',
      'Porque HAProxy no permite configuraciones distintas entre nodos',
      'Porque ambos nodos reciben tráfico simultáneamente en todo momento',
      'Porque la configuración se sincroniza automáticamente vía VRRP',
    ],
    correct: 0,
  },
  {
    q: 'En el ejemplo del proyecto, con `weight -30` en el vrrp_script y prioridad base 100, ¿qué ocurre si HAProxy cae en lb1?',
    options: [
      'La prioridad de lb1 sube a 130 para forzar el failback',
      'La prioridad de lb1 baja a 70, menor que la de lb2 (90), y lb2 toma la VIP',
      'lb1 mantiene la VIP porque el script no afecta a keepalived',
      'keepalived se reinicia automáticamente en lb1 sin cambiar de estado',
    ],
    correct: 1,
  },
  {
    q: 'Según el proyecto, ¿cuánto tarda aproximadamente el failover completo de la VIP entre lb1 y lb2?',
    options: [
      'Alrededor de 30 segundos',
      'Aproximadamente 5 minutos',
      'Menos de 2 segundos',
      'Depende exclusivamente del DNS TTL, unos 10 minutos',
    ],
    correct: 2,
  },
  {
    q: 'En la configuración del proyecto, ¿cuántos health checks fallidos consecutivos se necesitan para marcar un backend como DOWN?',
    options: [
      '1 fallo (fall 1)',
      '5 fallos (fall 5)',
      '2 fallos (fall 2)',
      '3 fallos (fall 3)',
    ],
    correct: 3,
  },
  {
    q: '¿Qué balanceador atiende el tráfico real de los clientes en el proyecto en un momento dado?',
    options: [
      'Solo el nodo que tiene asignada la VIP (el MASTER de keepalived)',
      'Ambos balanceadores simultáneamente, en modo active-active',
      'El balanceador con menor carga de CPU en ese instante',
      'El primero que responda a un ping ICMP del cliente',
    ],
    correct: 0,
  },
  {
    q: '¿Qué comando se usa en el proyecto para deshabilitar temporalmente un servidor backend sin recargar la configuración completa?',
    options: [
      'systemctl stop haproxy',
      'echo "disable server nginx_backends/backend1" | socat stdio /run/haproxy/admin.sock',
      'haproxy -c -f /etc/haproxy/haproxy.cfg --disable backend1',
      'sudo dnf remove haproxy',
    ],
    correct: 1,
  },
]

export default exam
