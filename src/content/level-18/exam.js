export default [
  // Módulo 1 — Protocolo DNS: jerarquía, resolución recursiva e iterativa (6)
  { q: '¿Qué componente de la jerarquía DNS conoce qué servidores son autoritativos para cada TLD?', options: ['Los root name servers', 'El resolver recursivo', '/etc/resolv.conf', 'El registrador del dominio'], correct: 0 },
  { q: '¿Qué flag del mensaje DNS indica que una respuesta proviene del servidor autoritativo de la zona?', options: ['RD', 'RA', 'AA', 'TC'], correct: 2 },
  { q: 'En resolución iterativa, ¿quién realiza todas las consultas a los distintos niveles de la jerarquía?', options: ['El servidor autoritativo', 'El registrador del TLD', 'El cliente final', 'El resolver recursivo'], correct: 3 },
  { q: '¿Qué controla el TTL de un registro DNS?', options: ['Cuánto tiempo un resolver puede cachear la respuesta', 'El puerto usado para la consulta', 'El tamaño máximo del mensaje DNS', 'El algoritmo de firma DNSSEC'], correct: 0 },
  { q: '¿En qué campo del registro SOA se basa la caché negativa (NXDOMAIN)?', options: ['Serial', 'Refresh', 'Expire', 'Minimum TTL'], correct: 3 },
  { q: '¿Qué protocolo de transporte usa DNS cuando la respuesta supera el límite de UDP o se realiza una transferencia de zona?', options: ['TCP', 'SCTP', 'UDP con fragmentación', 'ICMP'], correct: 0 },

  // Módulo 2 — Tipos de registros DNS (7)
  { q: '¿Por qué no se puede colocar un registro CNAME en el apex de un dominio?', options: ['Porque CNAME solo admite IPv6', 'Porque el apex siempre necesita registros NS y SOA, y CNAME no puede coexistir con otros registros', 'Porque el apex no admite TTL personalizado', 'Porque los navegadores lo bloquean por seguridad'], correct: 1 },
  { q: 'Según RFC 2181, ¿a qué debe apuntar siempre un registro MX?', options: ['A un registro TXT', 'A un registro SRV', 'A un registro CNAME', 'A un registro A o AAAA directo'], correct: 3 },
  { q: 'En un registro MX, ¿qué significa que su valor de prioridad sea menor?', options: ['Que está deshabilitado', 'Que requiere DNSSEC', 'Que tiene menor prioridad de entrega', 'Que tiene mayor prioridad de entrega'], correct: 3 },
  { q: '¿Qué mecanismo SPF rechaza como fallo duro cualquier IP no listada en la política?', options: ['-all', '+all', '?all', '~all'], correct: 0 },
  { q: '¿Qué formato tiene un registro SRV?', options: ['prioridad puerto peso destino', 'destino puerto prioridad peso', 'prioridad peso puerto destino', 'peso prioridad destino puerto'], correct: 2 },
  { q: '¿Quién controla habitualmente el registro PTR de una dirección IP pública?', options: ['El dueño del dominio', 'El proveedor del bloque IP (ISP o proveedor cloud)', 'El servidor autoritativo del TLD', 'El navegador del cliente'], correct: 1 },
  { q: '¿Qué debe incrementarse en el registro SOA cada vez que se modifica una zona?', options: ['El Refresh', 'El Expire', 'El Serial', 'El Minimum TTL'], correct: 2 },

  // Módulo 3 — dig, nslookup y host (7)
  { q: '¿Qué opción de dig muestra la resolución iterativa completa desde los root servers?', options: ['+norec', '+multi', '+short', '+trace'], correct: 3 },
  { q: '¿Qué significa la ausencia del flag "aa" en la salida de dig?', options: ['Que hubo un error de red', 'Que se usó TCP en vez de UDP', 'Que el dominio no existe', 'Que la respuesta viene de caché o de un resolver, no del autoritativo'], correct: 3 },
  { q: '¿Qué comando de dig realiza una consulta inversa automáticamente a partir de una IP?', options: ['dig -x', 'dig +short', 'dig -t PTR', 'dig +trace'], correct: 0 },
  { q: '¿Qué código de estado devuelve dig cuando el nombre consultado no existe?', options: ['SERVFAIL', 'REFUSED', 'NXDOMAIN', 'NOERROR'], correct: 2 },
  { q: '¿Qué opción de dig muestra solo la respuesta sin comentarios adicionales, útil para scripts?', options: ['+multi', '+short', '+dnssec', '+cd'], correct: 1 },
  { q: '¿Qué herramienta produce la salida más concisa y legible para humanos entre dig, nslookup y host?', options: ['dig', 'nslookup', 'host', 'resolvectl'], correct: 2 },
  { q: '¿Qué indica que un servidor responda REFUSED a una petición AXFR?', options: ['Que la zona no existe', 'Que la transferencia de zona está correctamente bloqueada', 'Que hay un error de configuración crítico', 'Que el servidor está caído'], correct: 1 },

  // Módulo 4 — systemd-resolved (6)
  { q: '¿En qué dirección y puerto escucha el stub resolver de systemd-resolved?', options: ['0.0.0.0:53', '::1:53', '127.0.0.1:53', '127.0.0.53:53'], correct: 3 },
  { q: '¿Qué comando vacía la caché DNS local gestionada por systemd-resolved?', options: ['resolvectl flush-caches', 'systemctl restart resolv.conf', 'dig +cd', 'resolvectl status --flush'], correct: 0 },
  { q: 'En un archivo .network, ¿qué indica el prefijo "~" en la directiva Domains?', options: ['Que se habilita DNSSEC para ese dominio', 'Que el dominio usa TCP en vez de UDP', 'Que el dominio se excluye de la resolución', 'Que es un routing domain: se usa ese DNS solo para ese dominio, sin añadirlo como sufijo de búsqueda'], correct: 3 },
  { q: '¿Qué archivo contiene la configuración principal de systemd-resolved con directivas como DNS y FallbackDNS?', options: ['/etc/resolv.conf', '/etc/nsswitch.conf', '/etc/systemd/resolved.conf', '/run/systemd/resolve/resolv.conf'], correct: 2 },
  { q: '¿Qué comando muestra el estado global y por interfaz de la resolución DNS gestionada por resolved?', options: ['resolvectl status', 'dig +trace', 'systemctl show resolved', 'journalctl -k'], correct: 0 },
  { q: '¿Qué diferencia hay entre /run/systemd/resolve/stub-resolv.conf y /run/systemd/resolve/resolv.conf?', options: ['El primero apunta al stub local de resolved; el segundo lista directamente los servidores DNS upstream', 'El primero es para IPv4 y el segundo para IPv6', 'El primero requiere DNSSEC y el segundo no', 'No hay diferencia, son idénticos'], correct: 0 },

  // Módulo 5 — Servidor DNS autoritativo con bind9 (7)
  { q: '¿Qué comando valida la sintaxis de un archivo de zona antes de recargar bind9?', options: ['rndc status', 'dig +trace', 'named-checkconf', 'named-checkzone'], correct: 3 },
  { q: '¿Qué comando de rndc recarga las zonas sin reiniciar el proceso named?', options: ['rndc reload', 'rndc flush', 'rndc freeze', 'rndc stats'], correct: 0 },
  { q: '¿Qué directiva de named.conf.options limita quién puede solicitar recursión al servidor?', options: ['allow-query', 'allow-transfer', 'allow-recursion', 'forwarders'], correct: 2 },
  { q: '¿Qué directiva de zona controla qué servidores pueden solicitar una transferencia AXFR?', options: ['also-notify', 'listen-on', 'allow-recursion', 'allow-transfer'], correct: 3 },
  { q: '¿Qué ocurre si se modifica una zona pero no se incrementa el serial antes de recargar?', options: ['bind9 rechaza la recarga por completo', 'Los servidores secundarios no detectarán el cambio y seguirán sirviendo la versión antigua', 'Se genera un error de sintaxis automáticamente', 'El TTL se reinicia a cero'], correct: 1 },
  { q: 'En un archivo de zona con $ORIGIN empresa.com., ¿a qué FQDN resuelve el nombre relativo "tienda"?', options: ['tienda.', 'tienda.com.', 'tienda.empresa.com.', 'empresa.tienda.com.'], correct: 2 },
  { q: '¿Cuál es el riesgo de configurar allow-recursion { any; }; en un servidor autoritativo público?', options: ['Puede usarse para ataques de amplificación DNS (DDoS)', 'Impide las transferencias de zona', 'Desactiva DNSSEC automáticamente', 'Reduce el rendimiento del servidor'], correct: 0 },

  // Módulo 6 — Servidor DNS recursivo con unbound (6)
  { q: '¿Cuál es el caso de uso típico recomendado para unbound frente a bind9?', options: ['Gestionar transferencias de zona AXFR', 'Firmar zonas con DNSSEC manualmente', 'Ser autoritativo para una zona propia', 'Actuar como resolver recursivo con caché'], correct: 3 },
  { q: '¿Qué directiva de unbound.conf mejora la latencia percibida renovando entradas de caché antes de que expiren?', options: ['cache-max-ttl', 'prefetch', 'harden-referral-path', 'qname-minimisation'], correct: 1 },
  { q: '¿Qué tipo de local-zone en unbound hace que solo responda con los datos definidos y devuelva NXDOMAIN para lo no definido?', options: ['transparent', 'redirect', 'static', 'nodefault'], correct: 2 },
  { q: '¿Qué comando recarga la configuración de unbound sin tiempo de inactividad?', options: ['unbound-control reload', 'unbound-control flush_zone .', 'systemctl restart unbound', 'unbound-checkconf'], correct: 0 },
  { q: '¿Qué mejora de privacidad implementa qname-minimisation en unbound?', options: ['Envía a cada servidor NS solo la parte del nombre que necesita, según RFC 7816', 'Oculta la IP del cliente final', 'Bloquea automáticamente dominios de publicidad', 'Cifra todas las consultas con TLS'], correct: 0 },
  { q: 'Si unbound-control stats muestra cachehits=100 y queries=1000, ¿cuál es el cache hit rate?', options: ['100%', '50%', '10%', '90%'], correct: 2 },

  // Módulo 7 — DNSSEC (7)
  { q: '¿Qué ataque histórico motivó principalmente el diseño de DNSSEC?', options: ['El robo de credenciales por phishing', 'La fuga de datos por transferencias de zona abiertas', 'Ataque de denegación de servicio distribuido', 'El ataque de envenenamiento de caché descubierto por Dan Kaminsky'], correct: 3 },
  { q: '¿Qué tipo de clave DNSSEC firma el propio conjunto de registros DNSKEY y tiene una vida útil más larga?', options: ['ZSK (flag 256)', 'KSK (flag 257)', 'TSIG', 'RRSIG'], correct: 1 },
  { q: '¿Qué registro publicado en la zona padre enlaza la cadena de confianza con el KSK de la zona hija?', options: ['NS', 'DS', 'NSEC3', 'CAA'], correct: 1 },
  { q: '¿Qué flag en la respuesta de dig indica que la validación DNSSEC fue exitosa?', options: ['aa', 'rd', 'ad', 'tc'], correct: 2 },
  { q: '¿Qué opción de dig deshabilita la validación DNSSEC para ver la respuesta sin autenticar?', options: ['+dnssec', '+cd', '+trace', '+multi'], correct: 1 },
  { q: '¿Qué ventaja tiene NSEC3 sobre NSEC en una zona firmada?', options: ['Dificulta la enumeración de nombres de la zona mediante hashes', 'Elimina la necesidad de RRSIG', 'Reduce el tamaño del archivo de zona a la mitad', 'Permite firmas más rápidas'], correct: 0 },
  { q: '¿Qué comando de bind9 genera un par de claves DNSSEC para una zona?', options: ['dnssec-signzone', 'named-checkzone', 'dnssec-keygen', 'rndc signing'], correct: 2 },

  // Módulo 8 — Proyecto real: diagnóstico DNS en producción (4)
  { q: '¿Cómo se determina si un problema de resolución DNS es de propagación/caché o de configuración de zona?', options: ['Reiniciando el servidor DNS del cliente', 'Comparando la respuesta del servidor autoritativo con la de un resolver público como 8.8.8.8', 'Revisando únicamente los logs de journald', 'Aumentando el TTL de todos los registros'], correct: 1 },
  { q: 'Antes de una migración de IP, ¿qué acción se recomienda hacer con el TTL de los registros afectados y con cuánta antelación?', options: ['Aumentarlo a 24 horas, justo antes de migrar', 'Reducirlo a un valor bajo (p. ej. 300s) con antelación igual al TTL actual', 'Eliminarlo, ya que no es relevante', 'Cambiarlo solo después de completar la migración'], correct: 1 },
  { q: 'En el escenario de api.corp.internal que no resuelve en las laptops mientras sí resuelve en servidores, ¿cuál es la causa raíz típica?', options: ['El registro A del servicio interno está mal configurado', 'systemd-resolved en las laptops usa el DNS del ISP para todos los dominios, sin enrutar .internal al DNS corporativo', 'El firewall bloquea el puerto 53 en las laptops', 'El servidor interno tiene DNSSEC mal configurado'], correct: 1 },
  { q: '¿Qué comando recarga una única zona en bind9 sin interrumpir el servicio del resto de zonas?', options: ['systemctl restart named', 'rndc reload nombre-de-zona', 'named-checkzone -reload', 'resolvectl flush-caches'], correct: 1 },
]
