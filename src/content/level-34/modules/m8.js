const content = `
## Módulo 8 — Proyecto real: Redis como capa de caché para aplicación web

### 🎯 Objetivos de aprendizaje
* Instalar y configurar Redis con parámetros de producción: límite de memoria, política de evicción, autenticación
* Implementar el patrón cache-aside en Python para cachear consultas de base de datos
* Desplegar Redis Sentinel con 3 Sentinels, 1 master y 2 réplicas para alta disponibilidad
* Conectar la aplicación a través de Sentinel y verificar el failover automático
* Monitorear Redis en tiempo real y aplicar una estrategia de invalidación de caché

### ❓ El problema real

Tu API de catálogo de productos consulta PostgreSQL en cada request. Con 500 req/s y queries de 40ms cada una, la base de datos está al límite. El 80% de los requests son lecturas del mismo conjunto de ~10.000 productos activos. Redis puede servir esas lecturas en menos de 1ms, reduciendo la carga en PostgreSQL a una fracción. En este laboratorio construyes esa capa de caché de principio a fin, con alta disponibilidad incluida.

### 📖 Paso 1: Instalar y configurar Redis para producción

\`\`\`bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y redis-server

# RHEL/Fedora
sudo dnf install -y redis

# Verificar versión instalada
redis-server --version
# Redis server v=7.2.4
\`\`\`

**Configuración de producción en /etc/redis/redis.conf:**
\`\`\`bash
# Escuchar solo en la interfaz interna (no exponer a internet)
bind 127.0.0.1 192.168.1.10

# Puerto estándar
port 6379

# Límite de memoria: reserva 20% del RAM del servidor para el SO
maxmemory 12gb

# Política de evicción: cuando se alcanza maxmemory, eliminar las claves
# menos recientemente usadas (LRU) de TODO el keyspace
# Otras opciones: volatile-lru (solo claves con TTL), allkeys-lfu (frecuencia)
maxmemory-policy allkeys-lru

# Autenticación (usa una password larga y aleatoria)
requirepass "xK9#mP2$vL8nQ4wR7tY1"

# Durabilidad: AOF para recuperación ante reinicio
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec    # fsync cada segundo (balance entre durabilidad y performance)

# Desactivar RDB snapshots si usas AOF (evitar doble escritura)
save ""

# Timeouts de conexión
timeout 300           # desconectar clientes inactivos después de 5 min
tcp-keepalive 60

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
\`\`\`

\`\`\`bash
# Aplicar configuración
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Verificar configuración activa
redis-cli -a "xK9#mP2$vL8nQ4wR7tY1" CONFIG GET maxmemory
redis-cli -a "xK9#mP2$vL8nQ4wR7tY1" CONFIG GET maxmemory-policy
\`\`\`

### 📖 Paso 2: Implementar cache-aside en Python

El patrón cache-aside (también llamado lazy loading) es el más común para cachear resultados de base de datos: primero busca en Redis, si no está consulta la DB y guarda el resultado en Redis con un TTL.

\`\`\`python
# cache_layer.py
import json
import hashlib
import redis
import psycopg2
from functools import wraps

# Conexión a Redis (conexión directa al master, antes de agregar Sentinel)
redis_client = redis.Redis(
    host='192.168.1.10',
    port=6379,
    password='xK9#mP2$vL8nQ4wR7tY1',
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
    retry_on_timeout=True,
)

def get_product(product_id: int) -> dict | None:
    """
    Implementación del patrón cache-aside.
    1. Buscar en Redis
    2. Si no está (cache miss), consultar PostgreSQL
    3. Guardar resultado en Redis con TTL
    """
    cache_key = f"product:{product_id}"

    # Paso 1: intentar obtener de Redis
    try:
        cached = redis_client.get(cache_key)
        if cached is not None:
            # Cache HIT: deserializar y retornar
            return json.loads(cached)
    except redis.RedisError as e:
        # Si Redis falla, la app sigue funcionando (degraded mode)
        print(f"[WARN] Redis unavailable: {e}. Falling back to DB.")

    # Paso 2: Cache MISS — consultar la base de datos
    product = query_db_for_product(product_id)

    if product is None:
        return None

    # Paso 3: guardar en Redis con TTL de 5 minutos
    # Si Redis falla aquí, simplemente no cacheamos (no es fatal)
    try:
        redis_client.setex(
            name=cache_key,
            time=300,           # TTL: 300 segundos = 5 minutos
            value=json.dumps(product),
        )
    except redis.RedisError as e:
        print(f"[WARN] Could not cache product {product_id}: {e}")

    return product


def invalidate_product(product_id: int) -> None:
    """Invalidar caché cuando el producto se actualiza en la DB."""
    cache_key = f"product:{product_id}"
    redis_client.delete(cache_key)


def query_db_for_product(product_id: int) -> dict | None:
    """Consulta real a PostgreSQL."""
    conn = psycopg2.connect("postgresql://app_user:pass@db.local/catalog")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, price, stock, category_id FROM products WHERE id = %s",
            (product_id,)
        )
        row = cur.fetchone()
    conn.close()

    if row is None:
        return None
    return {
        "id": row[0],
        "name": row[1],
        "price": float(row[2]),
        "stock": row[3],
        "category_id": row[4],
    }
\`\`\`

**Cachear listas de productos con cache key basado en parámetros:**
\`\`\`python
def get_products_by_category(category_id: int, page: int = 1, page_size: int = 20) -> list:
    # Generar una clave que incluya todos los parámetros que afectan el resultado
    cache_key = f"products:category:{category_id}:page:{page}:size:{page_size}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    products = query_db_for_category(category_id, page, page_size)

    # TTL más corto para listas (cambian más frecuentemente que datos individuales)
    redis_client.setex(cache_key, 60, json.dumps(products))
    return products


def invalidate_category_cache(category_id: int) -> None:
    """
    Invalidar todas las páginas de una categoría.
    SCAN es preferible a KEYS en producción (no bloquea el servidor).
    """
    pattern = f"products:category:{category_id}:*"
    cursor = 0
    while True:
        cursor, keys = redis_client.scan(cursor, match=pattern, count=100)
        if keys:
            redis_client.delete(*keys)
        if cursor == 0:
            break
\`\`\`

### 📖 Paso 3: Configurar Redis Sentinel para alta disponibilidad

**Topología:** 1 master (192.168.1.10:6379), 2 réplicas (192.168.1.11:6379, 192.168.1.12:6379), 3 Sentinels en puertos 26379 de cada uno de los tres servidores.

**redis.conf para las réplicas:**
\`\`\`bash
# En 192.168.1.11 y 192.168.1.12
port 6379
bind 127.0.0.1 192.168.1.11   # (o .12 según el nodo)
replicaof 192.168.1.10 6379
masterauth "xK9#mP2$vL8nQ4wR7tY1"
requirepass "xK9#mP2$vL8nQ4wR7tY1"
replica-read-only yes
appendonly yes
appendfsync everysec
\`\`\`

**sentinel.conf (idéntico en los 3 servidores salvo \`bind\`):**
\`\`\`bash
port 26379
bind 192.168.1.10   # dirección del propio servidor Sentinel
daemonize yes
logfile /var/log/redis/sentinel.log

# Monitorear el master; quorum = 2 (mayoría de 3 Sentinels)
sentinel monitor mymaster 192.168.1.10 6379 2

# Autenticación de las instancias Redis monitoreadas
sentinel auth-pass mymaster "xK9#mP2$vL8nQ4wR7tY1"

# Tiempo sin respuesta para declarar SDOWN
sentinel down-after-milliseconds mymaster 5000

# Máximo 1 réplica sincronizando simultáneamente durante failover
sentinel parallel-syncs mymaster 1

# Tiempo máximo para completar el failover
sentinel failover-timeout mymaster 30000

# Notificación via script cuando ocurre un evento (opcional)
# sentinel notification-script mymaster /opt/redis/notify.sh
\`\`\`

\`\`\`bash
# Iniciar Sentinel en los 3 servidores
sudo redis-sentinel /etc/redis/sentinel.conf

# Verificar que Sentinel detectó master y réplicas
redis-cli -p 26379 SENTINEL masters
redis-cli -p 26379 SENTINEL replicas mymaster
redis-cli -p 26379 SENTINEL sentinels mymaster
\`\`\`

### 📖 Paso 4: Conectar la aplicación a través de Sentinel

\`\`\`python
# cache_layer_ha.py — versión con alta disponibilidad via Sentinel
from redis.sentinel import Sentinel

sentinel = Sentinel(
    sentinels=[
        ('192.168.1.10', 26379),
        ('192.168.1.11', 26379),
        ('192.168.1.12', 26379),
    ],
    socket_timeout=0.5,
    socket_connect_timeout=1.0,
    password='xK9#mP2$vL8nQ4wR7tY1',
    sentinel_kwargs={},   # si los Sentinels no tienen password propio
)

# Conexión de escritura: siempre al master actual
master = sentinel.master_for(
    'mymaster',
    socket_timeout=0.5,
    decode_responses=True,
)

# Conexión de lectura: distribuye entre réplicas disponibles
replica = sentinel.slave_for(
    'mymaster',
    socket_timeout=0.5,
    decode_responses=True,
)

def get_product_ha(product_id: int) -> dict | None:
    cache_key = f"product:{product_id}"

    try:
        # Lecturas van a las réplicas (menor carga en el master)
        cached = replica.get(cache_key)
        if cached is not None:
            return json.loads(cached)
    except Exception as e:
        print(f"[WARN] Redis replica read failed: {e}")

    product = query_db_for_product(product_id)
    if product is None:
        return None

    try:
        # Escrituras siempre al master
        master.setex(cache_key, 300, json.dumps(product))
    except Exception as e:
        print(f"[WARN] Redis master write failed: {e}")

    return product
\`\`\`

### 📖 Paso 5: Simular failover y verificar recuperación automática

\`\`\`bash
# En una terminal: monitorear el log de Sentinel en tiempo real
tail -f /var/log/redis/sentinel.log

# En otra terminal: verificar el master actual
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
# 1) "192.168.1.10"
# 2) "6379"

# Simular fallo del master (SHUTDOWN simula un crash limpio)
redis-cli -h 192.168.1.10 -p 6379 -a "xK9#mP2$vL8nQ4wR7tY1" SHUTDOWN NOSAVE
# Para simular un fallo de red más realista:
# sudo iptables -A INPUT -p tcp --dport 6379 -j DROP   (en el servidor master)

# Observar en el log de Sentinel (ocurre en ~5-10 segundos):
# +sdown master mymaster 192.168.1.10 6379
# +odown master mymaster 192.168.1.10 6379 #quorum 2/2
# +try-failover master mymaster 192.168.1.10 6379
# +elected-leader master mymaster 192.168.1.10 6379
# +promoted-slave slave 192.168.1.11:6379 192.168.1.11 6379 @ mymaster
# +failover-end master mymaster 192.168.1.10 6379
# +switch-master mymaster 192.168.1.10 6379 192.168.1.11 6379

# Verificar nuevo master
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
# 1) "192.168.1.11"    ← promovido automáticamente
# 2) "6379"

# La aplicación continúa funcionando sin intervención manual
\`\`\`

### 📖 Paso 6: Monitorear Redis en producción

\`\`\`bash
# Estadísticas generales del servidor
redis-cli -h 192.168.1.10 -p 6379 -a "pass" INFO stats | grep -E "keyspace_hits|keyspace_misses|instantaneous_ops_per_sec"
# keyspace_hits:182943        ← lecturas que encontraron la clave en caché
# keyspace_misses:3421        ← lecturas que no encontraron la clave (cache miss)
# instantaneous_ops_per_sec:4892

# Calcular hit rate (debe ser > 85% para un caché efectivo)
# hit_rate = hits / (hits + misses) = 182943 / (182943 + 3421) = 98.2%

# Estado de memoria
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"
# used_memory_human:8.43G
# maxmemory_human:12.00G
# mem_fragmentation_ratio:1.12   ← < 1.5 es saludable

# Estado de replicación
redis-cli INFO replication
# role:master
# connected_slaves:2
# slave0:ip=192.168.1.11,port=6379,state=online,offset=1234567,lag=0
# slave1:ip=192.168.1.12,port=6379,state=online,offset=1234567,lag=0

# Ver comandos en tiempo real (CUIDADO: muy verbose, usar solo en debug puntual)
redis-cli -h 192.168.1.10 MONITOR
# 1722862800.123456 [0 192.168.1.5:54321] "GET" "product:4521"
# 1722862800.123789 [0 192.168.1.5:54322] "SETEX" "product:9001" "300" "{...}"

# Claves con TTL a punto de expirar (sample de 100 claves)
redis-cli -h 192.168.1.10 DEBUG SLEEP 0   # verificar que el servidor responde
redis-cli --scan --pattern "product:*" | head -20 | xargs -I{} redis-cli TTL {}

# Latencia en tiempo real
redis-cli --latency -h 192.168.1.10 -p 6379
# min: 0, max: 1, avg: 0.12 (1692 samples)

# Slowlog: ver los comandos más lentos (> 10ms por defecto)
redis-cli SLOWLOG GET 10
redis-cli SLOWLOG RESET   # limpiar después de revisar
\`\`\`

### 📖 Paso 7: Estrategia de invalidación de caché

Hay tres estrategias principales. Elige según la tolerancia a datos stale de tu aplicación:

**TTL-based (tiempo de vida fijo):** simple, eventual consistency garantizada.
\`\`\`python
# La clave expira automáticamente; el siguiente request consulta la DB
redis_client.setex("product:1001", 300, json.dumps(data))
# Ventaja: simple. Desventaja: hasta 5 min de datos desactualizados.
\`\`\`

**Write-through (invalidar en cada escritura):** consistencia inmediata.
\`\`\`python
def update_product(product_id: int, data: dict) -> None:
    # 1. Actualizar en la base de datos
    update_in_db(product_id, data)

    # 2. Invalidar la entrada en caché inmediatamente
    master.delete(f"product:{product_id}")

    # 3. Opcional: pre-calentar el caché con el nuevo valor
    master.setex(f"product:{product_id}", 300, json.dumps(data))
\`\`\`

**Event-driven (invalidación por eventos):** desacoplado, escalable.
\`\`\`python
# Al publicar un evento de actualización, todos los servicios invalidan su caché
redis_client.publish("product:updates", json.dumps({"id": product_id, "action": "updated"}))

# En el servicio que tiene la caché:
pubsub = redis_client.pubsub()
pubsub.subscribe("product:updates")

for message in pubsub.listen():
    if message["type"] == "message":
        event = json.loads(message["data"])
        redis_client.delete(f"product:{event['id']}")
\`\`\`

**Warm-up del caché al iniciar la aplicación:**
\`\`\`bash
# Precargar los 1000 productos más populares antes de recibir tráfico
python -c "
import json
from cache_layer_ha import master, query_db_for_product

top_products = get_top_products_from_db(limit=1000)
pipe = master.pipeline()
for product in top_products:
    pipe.setex(f'product:{product[\"id\"]}', 300, json.dumps(product))
pipe.execute()
print(f'Warmed up {len(top_products)} products in cache')
"
\`\`\`

### 📋 Lo que debes recordar
* En producción siempre configura \`maxmemory\` y \`maxmemory-policy\`; sin ellos Redis puede consumir toda la RAM del servidor
* El patrón cache-aside debe tratar Redis como opcional: si falla, la app sigue funcionando consultando la DB directamente
* Usa \`redis-cli SCAN\` en lugar de \`KEYS\` para buscar patrones en producción; KEYS bloquea el servidor durante la búsqueda
* El hit rate de caché debe ser > 80% para justificar la capa de caché; monitorea \`keyspace_hits\` y \`keyspace_misses\`
* \`redis-cli MONITOR\` es una herramienta de debug puntual, no de monitoreo continuo: captura todos los comandos y degrada el rendimiento

### 🧪 Autoevaluación
1. Tu caché tiene un hit rate del 45%. ¿Qué ajustes harías para mejorarlo, y cómo diagnosticarías qué claves se están perdiendo más frecuentemente?
2. La aplicación usa \`KEYS product:*\` para invalidar el caché de una categoría. En producción con 2 millones de claves, ¿qué problema introduce esto y cómo lo corregirías?
3. Después del failover, el nuevo master tiene datos replicados hasta el offset del último write antes del fallo. ¿Qué configuración de Redis minimiza la ventana de pérdida de datos, y cuál es el trade-off?

---

1. Un hit rate de 45% sugiere TTLs demasiado cortos, claves con alta cardinalidad (ej. cachear por \`user_id\` cuando los usuarios raramente repiten la misma query), o un caché sin warm-up. Diagnóstico: usar \`redis-cli MONITOR\` durante 30 segundos y analizar qué patrones de claves generan más misses; también revisar \`DEBUG OBJECT <key>\` para ver el LRU clock y detectar claves que expiran antes de ser reutilizadas. Corrección: aumentar TTL para datos poco cambiantes, agregar warm-up al arrancar, y revisar la estrategia de cache key para reducir cardinalidad innecesaria.
2. \`KEYS product:*\` bloquea el event loop de Redis durante toda la búsqueda — con 2 millones de claves puede tardar cientos de milisegundos, haciendo que todos los clientes esperen. La corrección es usar \`SCAN\` con cursor: itera el keyspace en batches de 100-500 claves, sin bloquear entre iteraciones. Ejemplo: \`cursor, keys = redis_client.scan(cursor, match="product:*", count=100)\` en un loop hasta que \`cursor == 0\`.
3. La configuración \`min-replicas-to-write 1\` y \`min-replicas-max-lag 5\` hace que el master rechace escrituras si no tiene al menos 1 réplica con lag < 5 segundos. Esto garantiza que cada write confirmado ya fue replicado, eliminando prácticamente la pérdida de datos. El trade-off: si ambas réplicas caen o pierden conectividad, el master deja de aceptar escrituras hasta que se restaure la replicación, priorizando consistencia sobre disponibilidad.
`

export default content
