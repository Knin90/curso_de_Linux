const content = `
## Módulo 4 — Políticas de evicción y gestión de memoria

### 🎯 Objetivos de aprendizaje
* Configurar el límite de memoria de Redis y entender sus implicaciones
* Seleccionar la política de evicción correcta según el perfil de acceso de la aplicación
* Usar las herramientas de inspección de memoria para diagnosticar problemas
* Aplicar técnicas de optimización de memoria para reducir el footprint de Redis

### ❓ El problema real

Tu servidor Redis consume 3.8 GB en un host con 4 GB de RAM. El sistema operativo empieza a swappear. Redis, al operar sobre datos en swap, pasa de responder en < 1 ms a responder en 50–200 ms, anulando el beneficio del caché. Necesitas establecer un límite de memoria y decidir qué ocurre cuando ese límite se alcanza.

### 📖 Configurar maxmemory

El límite de memoria se establece en \`redis.conf\` o en tiempo de ejecución:

\`\`\`bash
# En redis.conf (requiere reinicio o CONFIG REWRITE)
maxmemory 2gb

# En tiempo de ejecución (sin reinicio)
redis-cli CONFIG SET maxmemory 2gb

# Verificar el límite actual
redis-cli CONFIG GET maxmemory
# Resultado: 2147483648 (bytes)

# Ver uso actual
redis-cli INFO memory | grep used_memory_human
# used_memory_human: 1.45G
\`\`\`

Cuando Redis alcanza el límite de \`maxmemory\`, el comportamiento depende de la política configurada en \`maxmemory-policy\`.

### 📖 Políticas de evicción

**noeviction** (por defecto)
\`\`\`bash
CONFIG SET maxmemory-policy noeviction
\`\`\`
Redis retorna un error OOM (Out Of Memory) en cualquier operación de escritura cuando el límite está lleno. Las lecturas siguen funcionando.
- Usar cuando los datos son críticos y no pueden perderse (Redis como base de datos primaria, no como caché)
- Nunca usar como caché si se espera que el volumen de datos supere el límite

**allkeys-lru**
\`\`\`bash
CONFIG SET maxmemory-policy allkeys-lru
\`\`\`
Evicta cualquier clave usando el algoritmo LRU (Least Recently Used): se elimina la clave que no se ha accedido hace más tiempo.
- **Mejor opción general para caché**: cachea automáticamente los datos más accedidos
- Las claves sin TTL también pueden ser evictadas

**volatile-lru**
\`\`\`bash
CONFIG SET maxmemory-policy volatile-lru
\`\`\`
Evicta solo claves que tienen TTL configurado, usando LRU. Las claves sin TTL son intocables.
- Útil cuando Redis mezcla datos persistentes (sin TTL) y datos de caché (con TTL)
- Si solo hay claves sin TTL, se comporta como noeviction

**allkeys-lfu** (Redis 4.0+)
\`\`\`bash
CONFIG SET maxmemory-policy allkeys-lfu
\`\`\`
Evicta cualquier clave usando LFU (Least Frequently Used): se elimina la clave accedida menos veces en el tiempo.
- Mejor que LRU cuando el patrón de acceso es sesgado (algunas claves son populares indefinidamente, otras se acceden en ráfagas cortas)
- LFU no castiga claves que fueron populares ayer pero no hoy (las "enfría" gradualmente)

**volatile-lfu**
\`\`\`bash
CONFIG SET maxmemory-policy volatile-lfu
\`\`\`
Igual que allkeys-lfu pero solo sobre claves con TTL.

**allkeys-random**
\`\`\`bash
CONFIG SET maxmemory-policy allkeys-random
\`\`\`
Evicta cualquier clave al azar. Rara vez es la opción correcta; solo tiene sentido cuando todas las claves tienen la misma probabilidad de acceso (lo cual es raro en producción).

**volatile-random**
\`\`\`bash
CONFIG SET maxmemory-policy volatile-random
\`\`\`
Evicta claves con TTL al azar.

**volatile-ttl**
\`\`\`bash
CONFIG SET maxmemory-policy volatile-ttl
\`\`\`
Evicta primero la clave con el TTL más corto (la que está más próxima a expirar). Útil cuando prefieres que el caché anticipe la expiración natural de las claves.

### 📖 LRU vs LFU: cuándo usar cada uno

| Criterio | LRU | LFU |
|---|---|---|
| Patrón de acceso | Recencia importa | Frecuencia importa |
| Workload típico | Sesiones, datos de usuario | Catálogos, configuraciones populares |
| Riesgo | Claves populares pero no recientes pueden evictarse | Claves nuevas con baja frecuencia inicial pueden evictarse prematuramente |
| Ajuste fino | lru-decay-factor | lfu-log-factor, lfu-decay-time |

**Importante:** Redis no implementa LRU exacto (requeriría una lista enlazada gigante). En cambio, usa **LRU aproximado**: muestrea N claves al azar (configurable con \`maxmemory-samples\`, default 5) y evicta la peor de la muestra. Con \`maxmemory-samples 10\` la aproximación es casi perfecta a costa de un poco más de CPU.

\`\`\`bash
CONFIG SET maxmemory-samples 10   # más preciso, más CPU
CONFIG SET lfu-log-factor 10       # sensibilidad del contador LFU (default 10)
CONFIG SET lfu-decay-time 1        # minutos para reducir el contador LFU
\`\`\`

### 📖 Inspección de memoria

**Vista general:**
\`\`\`bash
redis-cli INFO memory
\`\`\`
Campos clave:
\`\`\`
used_memory:1520054272        # bytes usados por estructuras de datos Redis
used_memory_human:1.42G       # versión legible
used_memory_rss:1789870080    # bytes asignados por el OS (incluye fragmentación)
used_memory_peak:1623244800   # máximo histórico
maxmemory:2147483648          # límite configurado
maxmemory_policy:allkeys-lru  # política activa
mem_fragmentation_ratio:1.18  # rss / used_memory (>1.5 = fragmentación significativa)
\`\`\`

**Memoria de una clave específica:**
\`\`\`bash
MEMORY USAGE user:1234:profile
# 312 (bytes, incluye overhead de Redis)

MEMORY USAGE mylist
# 4096 (bytes totales incluyendo elementos)
\`\`\`

**Codificación interna de una clave:**
\`\`\`bash
OBJECT ENCODING user:1234:profile
# "embstr"    (string ≤ 44 bytes)
# "raw"       (string > 44 bytes)
# "int"       (integer)
# "ziplist"   (hash/list/set pequeño, Redis < 7.0)
# "listpack"  (hash/list pequeño, Redis ≥ 7.0)
# "hashtable" (hash grande)
# "skiplist"  (sorted set grande)
# "quicklist" (lista grande)
\`\`\`

Las codificaciones compactas (ziplist, listpack, embstr, int) son mucho más eficientes en memoria que las codificaciones completas (hashtable, skiplist, raw).

**Tiempo de inactividad de una clave:**
\`\`\`bash
OBJECT IDLETIME user:1234:profile   # segundos desde el último acceso (con LRU)
OBJECT FREQ user:1234:profile       # contador de frecuencia (con LFU)
\`\`\`

### 📖 Optimización de memoria

**1. Usar hashes para objetos pequeños**

En lugar de almacenar cada campo de un usuario como clave separada:
\`\`\`bash
# Ineficiente: 3 claves, overhead por cada una
SET user:1234:name "Ana García"
SET user:1234:email "ana@example.com"
SET user:1234:age 28

# Eficiente: 1 hash, ziplist/listpack encoding si < 128 campos y < 64 bytes por valor
HSET user:1234 name "Ana García" email "ana@example.com" age 28
\`\`\`

Configurar los umbrales para mantener encoding compacto:
\`\`\`bash
# En redis.conf
hash-max-listpack-entries 128   # máximo de campos antes de convertir a hashtable
hash-max-listpack-value 64      # máximo de bytes por valor antes de convertir
\`\`\`

**2. Evitar valores muy grandes por clave**

Una clave con 10 MB de JSON serializado es un anti-patrón. Paginas en Redis, no sirves blobs. Si necesitas objetos grandes, divide en partes o usa otro almacenamiento.

**3. Nombres de clave cortos pero descriptivos**

\`\`\`bash
# Cada byte en el nombre de clave ocupa memoria y ancho de banda
user:1234:p     # vs user:1234:profile (ahorra 7 bytes × millones de claves = MB)
\`\`\`

**4. TTL en todas las claves de caché**

Sin TTL, una clave vive para siempre y solo se elimina por evicción activa. Siempre establece TTL en datos de caché.
\`\`\`bash
# Verificar claves sin TTL
redis-cli --scan --pattern '*' | xargs -I{} redis-cli TTL {}
# Las que retornan -1 son persistentes (sin TTL)
\`\`\`

**5. Gestión de fragmentación**

Cuando \`mem_fragmentation_ratio\` supera 1.5, Redis está desperdiciando memoria en fragmentación del allocator:
\`\`\`bash
# Compactar memoria activamente (Redis 4.0+, puede impactar latencia)
MEMORY PURGE

# Alternativa más invasiva: reinicio coordinado con réplica
# Ver también: CONFIG SET activedefrag yes (desfragmentación activa, Redis 4.0+)
CONFIG SET activedefrag yes
CONFIG SET active-defrag-ignore-bytes 100mb  # empezar si > 100MB fragmentado
CONFIG SET active-defrag-threshold-lower 10  # empezar si > 10% fragmentado
\`\`\`

**Resetear estadísticas:**
\`\`\`bash
CONFIG RESETSTAT   # resetea contadores INFO sin reiniciar Redis
\`\`\`

### 📋 Lo que debes recordar
* \`maxmemory\` sin política configurada usa \`noeviction\` por defecto: Redis dará error en escrituras cuando esté lleno
* \`allkeys-lru\` es la política más adecuada para una caché de propósito general
* \`allkeys-lfu\` supera a LRU cuando el acceso sigue una distribución de popularidad estable (algunos items son siempre más populares)
* \`mem_fragmentation_ratio\` > 1.5 indica fragmentación; considera \`MEMORY PURGE\` o desfragmentación activa
* Los hashes con pocos campos usan encoding compacto (listpack) que es mucho más eficiente que claves individuales
* Siempre asigna TTL a las claves de caché; las claves sin TTL solo desaparecen por evicción

### 🧪 Autoevaluación
1. Tu Redis mezcla datos de sesión de usuario (críticos, sin TTL) y datos de caché de catálogo (con TTL). ¿Qué política de evicción usarías para que la evicción nunca afecte a los datos de sesión?
2. \`INFO memory\` muestra \`mem_fragmentation_ratio:1.8\`. ¿Qué significa y qué acción tomarías?
3. ¿Por qué Redis no implementa LRU exacto y qué parámetro controla la precisión de su LRU aproximado?

---

1. \`volatile-lru\`: evicta solo claves con TTL configurado usando LRU. Los datos de sesión sin TTL son intocables. Los datos de catálogo con TTL se evictan según recencia de acceso.
2. Significa que el OS tiene asignado 1.8× más memoria de la que Redis usa efectivamente: hay 80% de overhead por fragmentación del memory allocator. Acciones: habilitar desfragmentación activa con \`CONFIG SET activedefrag yes\`, o ejecutar \`MEMORY PURGE\` para compactar; en casos severos, un reinicio controlado (con réplica para evitar downtime) también elimina la fragmentación.
3. Un LRU exacto requeriría una lista doblemente enlazada con todos los nodos ordenados por tiempo de acceso, con O(1) de actualización. Con millones de claves, el overhead de memoria y punteros sería prohibitivo. Redis usa LRU aproximado: en cada evicción muestrea \`maxmemory-samples\` claves al azar y evicta la menos reciente de la muestra. Con \`maxmemory-samples 10\`, la aproximación es casi idéntica al LRU exacto.
`

export default content
