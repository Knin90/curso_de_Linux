const content = `
## Módulo 3 — Patrones de caché: cache-aside, write-through y write-behind

### 🎯 Objetivos de aprendizaje
* Comprender por qué se introduce una capa de caché entre la aplicación y la base de datos
* Dominar los cuatro patrones fundamentales: cache-aside, write-through, write-behind y read-through
* Identificar el problema de cache stampede y sus soluciones prácticas
* Aplicar estrategias de invalidación y convenciones de nomenclatura de claves

### ❓ El problema real

Tu API de productos tarda 40 ms en responder: 35 ms son de la consulta a PostgreSQL. En horas pico, con 2000 req/s, la base de datos satura sus conexiones y el tiempo sube a 800 ms. El contenido del catálogo cambia pocas veces al día, pero se lee miles de veces por hora.

Redis puede responder en menos de 1 ms. El desafío no es instalarlo, sino elegir correctamente cómo fluye la información entre caché y base de datos.

### 📖 ¿Por qué cachear?

El acceso a una base de datos relacional implica:
- Resolución de red (si es remota)
- Parsing del query por el motor SQL
- Acceso a disco para leer páginas no cacheadas
- Serialización del resultado

Latencia típica: **10–50 ms** por consulta.

Redis opera enteramente en memoria RAM con estructuras de datos optimizadas. Latencia típica: **< 1 ms**. Los beneficios son tres:

1. **Reducción de latencia**: las respuestas llegan antes al usuario
2. **Reducción de carga en BD**: menos consultas al origen, más headroom para writes
3. **Absorción de picos de tráfico**: el caché actúa como amortiguador durante spikes

### 📖 Cache-Aside (Lazy Loading)

El patrón más común. La aplicación gestiona el caché activamente:

**Flujo de lectura:**
\`\`\`
1. App solicita dato → GET user:1234:profile
2. HIT (caché tiene el dato) → retornar inmediatamente
3. MISS (caché no tiene el dato):
   a. Consultar base de datos
   b. Escribir resultado en caché: SET user:1234:profile '...' EX 3600
   c. Retornar el dato
\`\`\`

**Comandos Redis:**
\`\`\`bash
# Verificar si existe (HIT o MISS)
GET user:1234:profile

# Escribir al caché con TTL de 1 hora
SET user:1234:profile '{"name":"Ana","email":"ana@example.com"}' EX 3600

# Alternativa: solo escribir si NO existe (useful para evitar sobreescribir)
SET user:1234:profile '...' EX 3600 NX
\`\`\`

**Ventajas:**
- Solo cachea datos que realmente se acceden (no desperdicia memoria)
- Un fallo de Redis no rompe la aplicación (degradación elegante)
- Compatible con cualquier base de datos

**Desventajas:**
- **Cold start penalty**: las primeras N peticiones después de reiniciar el caché van a la BD
- **Data staleness**: el dato en caché puede quedar desactualizado hasta que expire su TTL
- La lógica de caché está dispersa en el código de la aplicación

**Cuándo usarlo:** lecturas frecuentes de datos que cambian con poca frecuencia (catálogos, perfiles de usuario, configuraciones).

### 📖 Write-Through

La aplicación escribe simultáneamente en caché Y en base de datos. Ambas siempre están en sync.

**Flujo de escritura:**
\`\`\`
1. App actualiza dato
2. Escribe en caché: SET user:1234:profile '...' EX 3600
3. Escribe en BD (misma transacción o inmediatamente después)
4. Confirma éxito al cliente
\`\`\`

**Ventajas:**
- El caché siempre tiene datos frescos, no hay staleness
- Sin cold start: el dato está en caché desde que se escribe

**Desventajas:**
- **Mayor latencia de escritura**: hay que esperar confirmación de BD Y caché
- **Cache pollution**: se cachea todo lo que se escribe, incluyendo datos que quizá nunca se lean
- Complejidad al manejar errores parciales (qué pasa si BD falla pero caché ya se escribió)

**Cuándo usarlo:** aplicaciones donde la consistencia importa más que la latencia de escritura (sistemas financieros, inventario).

### 📖 Write-Behind (Write-Back)

La aplicación escribe solo en caché. El caché se sincroniza con la BD de forma asíncrona.

**Flujo:**
\`\`\`
1. App actualiza dato → escribe en caché inmediatamente
2. Cliente recibe confirmación (muy rápido)
3. En background: Redis flush → BD (después de N ms o N eventos)
\`\`\`

**Ventajas:**
- **Latencia de escritura mínima**: el cliente no espera a la BD
- **Batching posible**: agrupar múltiples writes antes de persistir (eficiente para contadores, analytics)

**Desventajas:**
- **Riesgo de pérdida de datos**: si Redis cae antes de flush, los writes se pierden
- Complejidad operacional alta: necesitas un proceso de flush confiable
- Difícil de debuggear inconsistencias

**Cuándo usarlo:** contadores de visitas, analytics de eventos, métricas en tiempo real donde perder algunos eventos es aceptable.

\`\`\`bash
# Ejemplo: incrementar un contador (write-behind implícito)
INCR page:homepage:views      # atómico, en memoria, instantáneo
EXPIRE page:homepage:views 86400  # TTL de 24 horas

# El valor se puede vaciar periódicamente a BD con un cron
\`\`\`

### 📖 Read-Through

Similar a cache-aside, pero la capa de caché (biblioteca o proxy) se interpone entre la app y la BD. La aplicación solo habla con el caché; el caché se encarga de consultar la BD en caso de miss.

**Diferencia clave vs cache-aside:**
- En **cache-aside**: la app decide cuándo leer la BD y escribir al caché
- En **read-through**: el caché lo hace transparentemente; la app no sabe si hubo miss

Implementado por libraries como Netflix EVCache, Twemproxy, o Redis con módulos proxy.

### 📖 Cache Stampede (Dog-Pile Effect)

Escenario: una clave muy popular expira. Cientos de requests simultáneos detectan el MISS y todos consultan la BD al mismo tiempo. La BD recibe 500 queries idénticos en milisegundos.

**Solución 1: Mutex lock con SETNX**
\`\`\`bash
# Solo el primer proceso que gane el lock consulta la BD
SETNX lock:user:1234:profile 1   # retorna 1 si ganó el lock, 0 si no
EXPIRE lock:user:1234:profile 10  # TTL del lock: 10 segundos máximo

# Si ganó: consultar BD, escribir caché, liberar lock
DEL lock:user:1234:profile

# Si perdió: reintentar GET hasta que el ganador llene el caché
\`\`\`

O en una sola operación atómica:
\`\`\`bash
SET lock:user:1234:profile 1 EX 10 NX
# NX = solo si no existe, EX = con TTL
\`\`\`

**Solución 2: Probabilistic Early Expiration**
En lugar de esperar a que expire, el sistema calcula una probabilidad de renovar antes de que expire (basada en el tiempo restante y el costo de recargar). Reduce colisiones sin necesidad de locks.

**Solución 3: Cache Warming**
Antes de que expire una clave crítica, un proceso background la renueva proactivamente. Requiere infraestructura adicional pero elimina la posibilidad de stampede.

### 📖 Estrategias de invalidación de caché

**TTL-based:** la clave expira automáticamente después de N segundos. Simple, eventualmente consistente.
\`\`\`bash
SET product:4567:details '...' EX 1800  # expira en 30 minutos
\`\`\`

**Event-driven (invalidación explícita):** cuando la BD se actualiza, el código borra la clave del caché.
\`\`\`bash
# Al actualizar un producto en BD:
DEL product:4567:details

# Próxima lectura → MISS → recarga desde BD
\`\`\`

**Cache-tag:** agrupar claves relacionadas bajo una "etiqueta" para invalidar en bloque.
\`\`\`bash
# Cuando se actualiza la categoría "electronics":
# Borrar todas las claves etiquetadas como electronics:
SMEMBERS tag:electronics        # obtener lista de claves asociadas
# Luego DEL de cada una
\`\`\`

### 📖 Convenciones de nomenclatura de claves

Una convención clara evita colisiones y facilita el debugging:

**Patrón:** \`namespace:entidad:id[:campo]\`

\`\`\`bash
user:1234:profile          # perfil completo del usuario 1234
user:1234:orders           # lista de órdenes del usuario 1234
order:5678:details         # detalles de la orden 5678
product:9012:inventory     # inventario del producto 9012
session:abc123             # datos de sesión
rate:limit:user:1234       # rate limit del usuario
\`\`\`

**Reglas prácticas:**
- Usar separador consistente (: es estándar en Redis)
- Nombres descriptivos pero no excesivamente largos (cada byte cuenta)
- Incluir versión si el esquema puede cambiar: \`user:v2:1234:profile\`
- Evitar caracteres especiales que compliquen el uso con SCAN y KEYS

### 📋 Lo que debes recordar
* Cache-aside es el patrón más versátil: la app controla el caché, un fallo de Redis no rompe nada
* Write-through garantiza consistencia a costa de mayor latencia en escritura
* Write-behind minimiza latencia de escritura pero arriesga pérdida de datos ante fallos de Redis
* Cache stampede ocurre cuando muchos clientes detectan un MISS simultáneo; usa SETNX para coordinar acceso
* La invalidación por TTL es simple pero acepta staleness; la invalidación por eventos es más compleja pero más precisa
* Nombrar claves con el patrón \`namespace:entidad:id\` facilita el mantenimiento y el debugging

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia principal entre cache-aside y read-through en términos de quién gestiona el MISS?
2. Tienes un contador de visitas que se incrementa millones de veces al día y puedes tolerar perder datos de los últimos 5 segundos en un crash. ¿Qué patrón es más apropiado y por qué?
3. Describe el problema de cache stampede y menciona dos estrategias para mitigarlo.

---

1. En cache-aside, la aplicación detecta el MISS y es responsable de consultar la BD y escribir el resultado al caché. En read-through, la capa de caché detecta el MISS y consulta la BD de forma transparente; la aplicación solo ve una interfaz de caché.
2. Write-behind (write-back): se escribe solo en Redis de forma instantánea y se descarga a BD de forma asíncrona. El bajo riesgo de pérdida de datos (5 s) es aceptable para métricas de analytics, y la latencia de escritura es mínima.
3. Cache stampede ocurre cuando una clave muy accedida expira y cientos de clientes detectan el MISS simultáneamente, abrumando la BD con queries idénticos. Soluciones: (a) mutex con SETNX — solo un proceso consulta la BD mientras los demás esperan; (b) probabilistic early expiration — renovar la clave antes de que expire con probabilidad creciente a medida que se acerca el TTL.
`

export default content
