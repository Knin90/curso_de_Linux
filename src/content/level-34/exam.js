export default [
  {
    "q": "¿Por qué Redis puede servir 100.000+ operaciones por segundo siendo single-threaded?",
    "options": [
      "Porque opera en RAM, usa I/O multiplexing con epoll/kqueue y elimina lock contention y context switches",
      "Porque distribuye internamente los comandos entre varios hilos ocultos",
      "Porque comprime automáticamente todos los valores antes de procesarlos",
      "Porque delega el procesamiento de comandos al sistema operativo"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué estructura de datos es más eficiente para representar un objeto de usuario con 15 campos que se leen/actualizan individualmente?",
    "options": [
      "String, porque permite operaciones atómicas sobre cualquier campo",
      "Hash, porque HGET/HSET operan sobre campos individuales sin serializar el objeto completo",
      "Set, porque garantiza unicidad de cada campo del objeto",
      "Sorted Set, porque ordena los campos por score automáticamente"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuál es la diferencia principal entre KEYS y SCAN en producción?",
    "options": [
      "KEYS y SCAN son equivalentes en rendimiento, solo cambia la sintaxis",
      "SCAN requiere reiniciar el servidor para funcionar correctamente",
      "KEYS bloquea el event loop haciendo un full scan; SCAN itera incrementalmente con un cursor sin bloquear",
      "KEYS solo funciona sobre claves con TTL configurado"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué mecanismo del sistema operativo usa Redis para monitorear miles de conexiones concurrentes con una sola llamada al sistema?",
    "options": [
      "Un pool de hilos gestionado por el kernel",
      "Interrupciones de hardware dedicadas por conexión",
      "Un scheduler round-robin implementado en espacio de usuario",
      "epoll (Linux) o kqueue (BSD/macOS)"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué tipo de dato de Redis es ideal para implementar un ranking de jugadores ordenado por puntaje?",
    "options": [
      "Sorted Set (ZSet), porque mantiene orden por score con O(log N) en inserción y búsqueda",
      "List, porque preserva el orden de inserción exacto",
      "Hash, porque permite acceso directo por campo",
      "HyperLogLog, porque cuenta elementos únicos eficientemente"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué estructura usa solo 12 KB de memoria para estimar la cardinalidad de un conjunto con un error máximo de 0.81%?",
    "options": [
      "Sorted Set",
      "HyperLogLog",
      "Bitmap estándar",
      "Set con hashing consistente"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué técnica del sistema operativo hace que el fork de BGSAVE sea casi instantáneo incluso con datasets grandes?",
    "options": [
      "Compresión LZF aplicada antes del fork",
      "Un segundo hilo que replica la memoria en paralelo",
      "Copy-on-Write (CoW): las páginas de memoria solo se copian cuando el padre o el hijo las modifican",
      "Paginación swap que mueve los datos a disco temporalmente"
    ],
    "correct": 2
  },
  {
    "q": "¿Cuál es la pérdida máxima de datos esperada con `appendfsync everysec`?",
    "options": [
      "Ningún dato se pierde bajo ninguna circunstancia",
      "Hasta el último snapshot RDB, que puede ser minutos u horas",
      "Todos los datos desde el último reinicio del servidor",
      "Aproximadamente 1 segundo de escrituras"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué hace BGREWRITEAOF?",
    "options": [
      "Compacta el AOF generando el conjunto mínimo de comandos para reproducir el estado actual",
      "Convierte el AOF en un archivo RDB definitivo",
      "Elimina el AOF y desactiva la persistencia por escritura",
      "Fuerza un fsync inmediato de todas las escrituras pendientes"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué combinación de persistencia es más adecuada para carritos de compra con valor comercial directo?",
    "options": [
      "Solo RDB con snapshots cada 24 horas",
      "AOF con appendfsync everysec + RDB habilitado + modo híbrido",
      "Desactivar toda persistencia porque los datos son temporales",
      "Solo AOF con appendfsync no, para máximo rendimiento"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué comando repara un archivo AOF truncado tras un crash?",
    "options": [
      "redis-cli BGREWRITEAOF --repair",
      "redis-check-rdb --fix appendonly.aof",
      "redis-check-aof --fix /var/lib/redis/appendonly.aof",
      "redis-cli CONFIG SET aof-repair yes"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué activa el modo de persistencia híbrido en Redis?",
    "options": [
      "appendfsync hybrid en redis.conf",
      "rdbcompression yes junto con save \"\"",
      "maxmemory-policy noeviction",
      "aof-use-rdb-preamble yes, que combina un snapshot RDB inicial con comandos incrementales AOF"
    ],
    "correct": 3
  },
  {
    "q": "¿Cuál es la diferencia entre cache-aside y read-through en cuanto a quién gestiona el cache miss?",
    "options": [
      "En cache-aside la aplicación gestiona el miss consultando la BD; en read-through la capa de caché lo hace transparentemente",
      "Son estrategias idénticas con distinto nombre",
      "En read-through la aplicación siempre debe invalidar manualmente",
      "Cache-aside no permite usar TTL en las claves cacheadas"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué patrón de caché es más apropiado para un contador de visitas donde perder 5 segundos de datos es aceptable?",
    "options": [
      "Write-through, porque garantiza consistencia inmediata",
      "Write-behind (write-back), porque escribe en caché instantáneamente y sincroniza con la BD de forma asíncrona",
      "Cache-aside, porque evita cualquier pérdida de datos",
      "Read-through, porque delega la escritura a la base de datos"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué es el cache stampede (dog-pile effect)?",
    "options": [
      "Cuando el caché se llena y empieza a evictar claves aleatoriamente",
      "Cuando dos procesos escriben la misma clave con valores distintos",
      "Cuando una clave popular expira y muchos clientes detectan el MISS simultáneamente, saturando la base de datos con queries idénticos",
      "Cuando el TTL de una clave se configura en 0 segundos por error"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué comando de Redis se usa como mutex para coordinar el acceso durante un cache stampede?",
    "options": [
      "GETSET lock:clave 1",
      "MULTI seguido de EXEC sin WATCH",
      "EXPIRE lock:clave 0",
      "SET lock:clave 1 EX 10 NX"
    ],
    "correct": 3
  },
  {
    "q": "¿Cuál es la principal desventaja de write-through frente a cache-aside?",
    "options": [
      "Mayor latencia de escritura porque hay que esperar confirmación de BD y caché a la vez",
      "No permite usar TTL en ninguna clave",
      "Es incompatible con bases de datos relacionales",
      "No puede usarse junto con Redis Sentinel"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué convención de nomenclatura de claves es la recomendada en Redis?",
    "options": [
      "Usar solo UUIDs sin ningún prefijo descriptivo",
      "namespace:entidad:id[:campo], por ejemplo user:1234:profile",
      "Concatenar todos los campos en una sola clave separada por espacios",
      "Usar rutas estilo filesystem con barras, como user/1234/profile"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué estrategia de invalidación borra explícitamente la clave del caché cuando la BD se actualiza?",
    "options": [
      "Invalidación por TTL únicamente",
      "Cache warming programado",
      "Invalidación event-driven (explícita)",
      "Read-through automático"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué ocurre por defecto cuando Redis alcanza `maxmemory` sin política de evicción configurada?",
    "options": [
      "Evicta automáticamente las claves menos usadas con LRU",
      "Comprime todos los valores existentes para liberar espacio",
      "Rechaza nuevas conexiones de clientes hasta liberar memoria",
      "Retorna error OOM en escrituras porque la política por defecto es noeviction"
    ],
    "correct": 3
  },
  {
    "q": "¿Cuál es la política de evicción más adecuada para una caché de propósito general?",
    "options": [
      "allkeys-lru",
      "noeviction",
      "volatile-ttl",
      "allkeys-random"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué política de evicción protege los datos de sesión sin TTL mientras evicta datos de catálogo con TTL?",
    "options": [
      "allkeys-lru, porque evicta cualquier clave del keyspace",
      "volatile-lru, porque solo evicta claves que tienen TTL configurado",
      "noeviction, porque nunca evicta ninguna clave",
      "allkeys-lfu, porque prioriza frecuencia sobre TTL"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué parámetro controla la precisión del LRU aproximado de Redis?",
    "options": [
      "lru-decay-factor",
      "hash-max-listpack-entries",
      "maxmemory-samples",
      "active-defrag-threshold-lower"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué significa un `mem_fragmentation_ratio` de 1.8?",
    "options": [
      "Redis está usando el 180% del maxmemory configurado",
      "El 80% de las claves están próximas a expirar",
      "La replicación tiene un lag de 1.8 segundos",
      "El OS asignó 1.8× más memoria de la que Redis usa efectivamente, indicando fragmentación significativa"
    ],
    "correct": 3
  },
  {
    "q": "¿Por qué usar Hash en lugar de claves String separadas para un objeto pequeño ahorra memoria?",
    "options": [
      "Porque Redis usa encoding compacto (listpack) para hashes con pocos campos, evitando el overhead de múltiples claves",
      "Porque los Hash no requieren almacenarse en RAM",
      "Porque los Hash se comprimen automáticamente con LZF",
      "Porque los Hash no tienen límite de memoria configurable"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué ocurre con los mensajes de Pub/Sub publicados mientras un suscriptor está desconectado?",
    "options": [
      "Se almacenan hasta que el suscriptor reconecta",
      "Se pierden permanentemente porque Pub/Sub no tiene persistencia",
      "Se reenvían automáticamente por Redis Streams",
      "Se guardan en un log de auditoría accesible con XRANGE"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué comando confirma que un consumidor de un grupo procesó exitosamente un mensaje de un Stream?",
    "options": [
      "XDEL",
      "XTRIM",
      "XACK",
      "PUBLISH"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué un script Lua es más seguro que una secuencia de comandos individuales para implementar compare-and-swap?",
    "options": [
      "Porque Lua se ejecuta más rápido que los comandos nativos de Redis",
      "Porque los scripts Lua se replican automáticamente a todas las réplicas",
      "Porque Lua evita el uso de estructuras de datos en memoria",
      "Porque Redis ejecuta el script de forma atómica, sin que otro cliente pueda interrumpirlo entre operaciones"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué hace WATCH en una transacción MULTI/EXEC?",
    "options": [
      "Implementa optimistic locking: la transacción aborta si la clave observada fue modificada entre WATCH y EXEC",
      "Bloquea la clave de forma exclusiva hasta que termine EXEC",
      "Convierte la transacción en asíncrona",
      "Registra la transacción en un log persistente adicional"
    ],
    "correct": 0
  },
  {
    "q": "¿Cuánta memoria usa HyperLogLog para estimar la cardinalidad, sin importar el tamaño real del conjunto?",
    "options": [
      "1 byte por cada elemento agregado",
      "Siempre 12 KB",
      "Depende linealmente del número de elementos únicos",
      "8 MB por cada millón de elementos"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué comando de Redis permite reasignar un mensaje pendiente de un consumidor caído a otro consumidor del grupo?",
    "options": [
      "XGROUP CREATE",
      "XPENDING",
      "XCLAIM",
      "PSUBSCRIBE"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué se despliega Redis Sentinel en número impar de nodos, típicamente 3?",
    "options": [
      "Porque Redis Sentinel no soporta números pares por límite técnico",
      "Para distribuir los datos entre más nodos y escalar horizontalmente",
      "Porque cada Sentinel debe monitorear una base de datos distinta",
      "Para alcanzar quorum y tolerar la caída de un Sentinel sin perder la capacidad de decidir el failover"
    ],
    "correct": 3
  },
  {
    "q": "¿Cuál es la diferencia entre SDOWN y ODOWN en Redis Sentinel?",
    "options": [
      "SDOWN es el juicio subjetivo de un único Sentinel; ODOWN requiere que al menos quorum Sentinels confirmen el fallo",
      "SDOWN ocurre solo en réplicas y ODOWN solo en el master",
      "Son sinónimos usados indistintamente en los logs de Sentinel",
      "ODOWN se declara antes que SDOWN en el ciclo de failover"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué criterio usa el Sentinel líder para seleccionar la réplica que será promovida a master?",
    "options": [
      "La réplica con menor tiempo de actividad (uptime)",
      "Menor slave-priority, mayor replication offset, y como desempate el ID lexicográficamente menor",
      "La primera réplica que responda al ping del líder",
      "La réplica que tenga la IP numéricamente más baja"
    ],
    "correct": 1
  },
  {
    "q": "¿Por qué es un error hardcodear la IP del master Redis en la configuración de la aplicación al usar Sentinel?",
    "options": [
      "Porque Sentinel prohíbe técnicamente las conexiones directas al master",
      "Porque las IPs de los masters cambian cada 24 horas por rotación automática",
      "Porque tras un failover esa IP deja de ser válida y la aplicación debe reconectarse a través de Sentinel para descubrir el nuevo master",
      "Porque hardcodear una IP reduce la seguridad del canal de replicación"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué limitación tiene Redis Sentinel respecto a la escala del sistema?",
    "options": [
      "No soporta más de una réplica por master",
      "No puede ejecutar failover si hay más de un Sentinel",
      "Requiere reiniciar todos los nodos tras cada failover",
      "Provee alta disponibilidad para un master único, pero no distribuye datos ni escala horizontalmente"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué configuración de sentinel.conf define el tiempo sin respuesta para declarar SDOWN?",
    "options": [
      "sentinel down-after-milliseconds",
      "sentinel failover-timeout",
      "sentinel parallel-syncs",
      "sentinel monitor"
    ],
    "correct": 0
  },
  {
    "q": "¿Cuántos hash slots utiliza Redis Cluster para distribuir el espacio de claves?",
    "options": [
      "1.024",
      "16.384",
      "65.536",
      "8.192"
    ],
    "correct": 1
  },
  {
    "q": "¿Para qué sirven los hash tags como {1001} en una clave de Redis Cluster?",
    "options": [
      "Cifrar el contenido de la clave automáticamente",
      "Indicar el TTL de la clave en segundos",
      "Forzar que claves relacionadas caigan en el mismo slot, habilitando operaciones multi-clave como MGET",
      "Seleccionar la base de datos lógica dentro del cluster"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué diferencia hay entre una redirección MOVED y una ASK en Redis Cluster?",
    "options": [
      "MOVED ocurre solo en réplicas y ASK solo en masters",
      "ASK es permanente y MOVED es temporal",
      "Son equivalentes y ambas requieren reiniciar el cliente",
      "MOVED es una redirección permanente; ASK es temporal durante una migración de slot en progreso"
    ],
    "correct": 3
  },
  {
    "q": "¿Por qué Redis Cluster no soporta SELECT para múltiples bases de datos?",
    "options": [
      "Porque soportar múltiples DBs multiplicaría los 16.384 slots por cada base, haciendo impracticable la coordinación",
      "Porque SELECT fue eliminado del protocolo RESP en Redis 7",
      "Porque cada nodo del cluster ya usa una base de datos distinta por defecto",
      "Porque SELECT solo está disponible en modo Sentinel"
    ],
    "correct": 0
  },
  {
    "q": "¿Cuántos masters mínimo se requieren en Redis Cluster para poder realizar failover?",
    "options": [
      "1",
      "3",
      "2",
      "6"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuál es la ventaja principal de Redis Cluster frente a Redis Sentinel?",
    "options": [
      "Es más simple de operar que Sentinel",
      "Soporta más bases de datos lógicas que Sentinel",
      "Permite escala horizontal distribuyendo los datos entre múltiples masters, además de alta disponibilidad",
      "Elimina la necesidad de réplicas para tener alta disponibilidad"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué el patrón cache-aside en producción debe tratar a Redis como opcional?",
    "options": [
      "Porque Redis no puede usarse junto con PostgreSQL en el mismo proyecto",
      "Porque las escrituras a Redis siempre deben ser síncronas con la BD",
      "Porque Redis no soporta TTL en entornos de producción",
      "Porque si Redis falla, la aplicación debe seguir funcionando consultando la base de datos directamente (degradación elegante)"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué problema introduce usar `KEYS product:*` para invalidar caché en producción con millones de claves?",
    "options": [
      "Bloquea el event loop de Redis durante toda la búsqueda, afectando a todos los clientes conectados",
      "Genera un error de sintaxis en Redis 7.x",
      "Elimina accidentalmente todas las claves que no coinciden con el patrón",
      "Requiere reiniciar el servidor Redis después de ejecutarse"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué configuración minimiza la ventana de pérdida de datos tras un failover, aceptando un trade-off de disponibilidad?",
    "options": [
      "maxmemory-policy allkeys-lru",
      "min-replicas-to-write junto con min-replicas-max-lag",
      "appendfsync no",
      "cluster-node-timeout"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué valor de hit rate se considera saludable para justificar una capa de caché en producción?",
    "options": [
      "Menor al 20%",
      "Exactamente 50%",
      "Mayor al 80%",
      "No importa el hit rate mientras el TTL sea corto"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué hace `redis-cli --scan --pattern \"product:*\"` a diferencia de KEYS con el mismo patrón?",
    "options": [
      "Ejecuta la búsqueda en un hilo separado dedicado",
      "Devuelve los resultados ya ordenados alfabéticamente",
      "Solo funciona en instancias con Redis Cluster habilitado",
      "Itera el keyspace de forma incremental usando un cursor, sin bloquear el servidor"
    ],
    "correct": 3
  },
  {
    "q": "¿Por qué se recomienda \"warm-up\" del caché al iniciar la aplicación?",
    "options": [
      "Para precargar los datos más populares antes de recibir tráfico y evitar una ráfaga de cache misses (cold start)",
      "Para forzar la expiración de todas las claves antiguas",
      "Para verificar que el servidor Redis tiene autenticación configurada",
      "Para reducir el uso de CPU del proceso Redis en reposo"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué configuración de producción evita exponer el servidor Redis directamente a internet?",
    "options": [
      "appendfsync everysec",
      "bind en la interfaz interna (ej. 127.0.0.1 y la IP privada) junto con requirepass",
      "maxmemory-policy noeviction",
      "cluster-enabled yes"
    ],
    "correct": 1
  }
]
