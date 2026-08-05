const content = `
## Módulo 5 — EXPLAIN ANALYZE: optimización de consultas en producción

### 🎯 Objetivos de aprendizaje
* Interpretar la salida de EXPLAIN y EXPLAIN ANALYZE sin perderse en el árbol de nodos
* Distinguir estimaciones del planificador de métricas reales de ejecución
* Identificar los patrones problemáticos más comunes: Seq Scan evitable, estadísticas desactualizadas, N+1, I/O excesivo
* Usar \`pg_stat_statements\` y \`auto_explain\` para encontrar consultas lentas en producción
* Aplicar ajustes de configuración y de esquema basados en evidencia del plan

### ❓ El problema real
Recibes un ticket: "el dashboard tarda 8 segundos en cargar". La consulta parece
sencilla: un JOIN entre órdenes y usuarios con un filtro de fecha. En tu laptop
va rápida. En producción, con datos reales, es otra historia. ¿Cómo lees la mente
del planificador de PostgreSQL para entender qué hace exactamente y por qué?

### 📖 EXPLAIN vs EXPLAIN ANALYZE

\`EXPLAIN\` muestra el plan de ejecución elegido por el planificador, con estimaciones
de costo y filas. La consulta **no se ejecuta**.

\`EXPLAIN ANALYZE\` ejecuta la consulta y añade tiempos reales y conteos de filas
reales. La consulta **sí se ejecuta**: ten cuidado con UPDATE/DELETE destructivos
(envuélvelos en una transacción y haz ROLLBACK).

\`\`\`sql
-- Solo el plan estimado (seguro, no ejecuta)
EXPLAIN SELECT * FROM orders WHERE user_id = 42;

-- Plan real (ejecuta la consulta)
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42;

-- Máximo detalle: tiempos, buffers, formato JSON legible por herramientas
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
  SELECT o.id, o.total, u.email
  FROM orders o
  JOIN users u ON o.user_id = u.id
  WHERE o.created_at >= NOW() - INTERVAL '7 days';
\`\`\`

Herramientas para visualizar planes JSON:
- https://explain.dalibo.com  (pega el JSON, ves el árbol coloreado)
- https://explain.depesz.com  (formato texto, codificado por color)

### 📖 Anatomía de un nodo de plan

Cada línea del plan representa un nodo de operación. Los nodos se anidan:
el hijo alimenta al padre.

\`\`\`
Gather  (cost=1000.00..18340.00 rows=50 width=120)
        (actual time=12.3..340.5 rows=47 loops=1)
  ->  Parallel Seq Scan on orders  (cost=0.00..17830.00 rows=50 width=120)
                                   (actual time=0.1..310.2 rows=47 loops=1)
        Filter: (user_id = 42)
        Rows Removed by Filter: 1823450
\`\`\`

Campos clave:
- \`cost=(startup..total)\`: unidades de "trabajo" estimadas. No son milisegundos.
  startup = costo hasta devolver la primera fila; total = costo completo.
- \`rows\`: filas estimadas por el planificador.
- \`width\`: ancho promedio de una fila en bytes.
- \`actual time=X..Y ms\`: tiempo real hasta primera fila .. tiempo total (en ms).
- \`actual rows\`: filas reales devueltas.
- \`loops\`: cuántas veces se ejecutó el nodo (relevante en Nested Loop).

### 📖 Tipos de nodo: qué significan

**Seq Scan** — escaneo secuencial de toda la tabla.
No siempre es malo: para tablas pequeñas o selectividad baja es más rápido que
un índice. Preocúpate cuando la tabla es grande y los "Rows Removed by Filter"
son muchos.

\`\`\`
Seq Scan on orders  (actual time=0.1..4200.3 rows=50 loops=1)
  Filter: (status = 'pending')
  Rows Removed by Filter: 2500000   ← escanea 2.5M para devolver 50
\`\`\`
Solución: índice en \`status\`, o índice parcial \`WHERE status = 'pending'\`.

**Index Scan** — usa el índice para localizar filas, luego accede al heap (tabla)
para leer las columnas restantes.

\`\`\`
Index Scan using idx_orders_user on orders
  (actual time=0.1..0.8 rows=50 loops=1)
  Index Cond: (user_id = 42)
\`\`\`

**Index Only Scan** — todas las columnas necesarias están en el índice (INCLUDE).
No accede al heap. Es el tipo más rápido.

\`\`\`
Index Only Scan using idx_orders_cover on orders
  (actual time=0.05..0.2 rows=50 loops=1)
  Heap Fetches: 0   ← nunca toca la tabla
\`\`\`

**Bitmap Heap Scan** — para selectividad media: el índice devuelve muchos TIDs,
se agrupan en un mapa de bits y luego se leen los bloques de heap en orden.

\`\`\`
Bitmap Heap Scan on orders  (actual time=2.1..15.4 rows=3200 loops=1)
  ->  Bitmap Index Scan on idx_orders_status  (actual time=1.8..1.8 rows=3200 loops=1)
\`\`\`

### 📖 Tipos de Join

**Hash Join** — construye una tabla hash del lado menor, escanea el mayor.
Eficiente para tablas grandes sin orden previo. Requiere memoria (work_mem).

**Nested Loop** — por cada fila del lado externo, busca filas coincidentes en
el interno. Eficiente cuando el lado interno es pequeño o usa un índice.
Si \`loops\` es alto y el nodo interno es lento → señal de N+1.

\`\`\`
Nested Loop  (actual time=0.1..1200.0 rows=10000 loops=1)
  ->  Seq Scan on orders  (actual time=0.1..50.0 rows=10000 loops=1)
  ->  Index Scan on users  (actual time=0.05..0.08 rows=1 loops=10000)
\`\`\`
Aquí el Index Scan en users se ejecuta 10 000 veces (loops=10000): N+1 clásico.

**Merge Join** — requiere ambas entradas ordenadas. Eficiente cuando ya existen
índices ordenados en las columnas de join.

### 📖 Buffers: leer el comportamiento de I/O

Con \`EXPLAIN (ANALYZE, BUFFERS)\`:

\`\`\`
Seq Scan on orders
  Buffers: shared hit=1240 read=18500
\`\`\`

- \`shared hit\`: bloques servidos desde shared_buffers (caché en RAM). Rápido.
- \`shared read\`: bloques leídos del sistema de archivos (disco o page cache del OS). Lento.

Una proporción alta de \`read\` indica presión de I/O. Considera:
- Aumentar \`shared_buffers\` si el servidor tiene RAM disponible.
- Añadir un índice para reducir los bloques accedidos.
- Optimizar la consulta para reducir el conjunto de datos leído.

### 📖 Diagnosticar problemas comunes

**Estadísticas desactualizadas (rows estimados ≠ rows reales):**
\`\`\`
Seq Scan on orders  (cost=0..25000 rows=100)  ← estima 100
                    (actual rows=850000)        ← son 850 000
\`\`\`
El planificador toma decisiones erróneas. Solución:
\`\`\`sql
ANALYZE orders;                     -- actualiza estadísticas de la tabla
-- O para toda la base:
VACUUM ANALYZE;
\`\`\`
Ajusta la frecuencia del autovacuum si la tabla cambia mucho.

**Hash Join que se desborda a disco:**
\`\`\`
Hash  (actual time=2300..2300 rows=500000 loops=1)
  Batches: 8  Memory Usage: 4096kB   ← batches > 1 → usó disco
\`\`\`
Solución temporal (solo para la sesión):
\`\`\`sql
SET work_mem = '256MB';
\`\`\`
Permanente (con cuidado: multiplica por max_connections):
\`\`\`
# postgresql.conf
work_mem = 64MB
\`\`\`

**Sort en disco:**
\`\`\`
Sort  (actual time=1800..2100 rows=200000 loops=1)
  Sort Key: created_at DESC
  Sort Method: external merge  Disk: 48000kB   ← usó disco
\`\`\`
Aumenta \`work_mem\` o añade un índice en la columna de ordenamiento.

### 📖 pg_stat_statements — encontrar las consultas más costosas

\`pg_stat_statements\` acumula estadísticas de ejecución por consulta a lo largo
del tiempo. Es indispensable para saber qué consultas consumen más recursos.

Activación:
\`\`\`sql
-- postgresql.conf (requiere reinicio)
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all

-- Después del reinicio, en cada base:
CREATE EXTENSION pg_stat_statements;
\`\`\`

Consultas de análisis:
\`\`\`sql
-- Top 10 por tiempo total acumulado
SELECT
  LEFT(query, 80)         AS query,
  calls,
  ROUND(total_exec_time::numeric, 2)  AS total_ms,
  ROUND(mean_exec_time::numeric, 2)   AS mean_ms,
  ROUND((100 * total_exec_time / SUM(total_exec_time) OVER())::numeric, 2) AS pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Top 10 por tiempo medio (consultas lentas individuales)
SELECT LEFT(query, 80), calls, ROUND(mean_exec_time::numeric, 2) AS mean_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Resetear estadísticas
SELECT pg_stat_statements_reset();
\`\`\`

### 📖 auto_explain — capturar planes de consultas lentas automáticamente

\`auto_explain\` registra el plan de ejecución de consultas que superan un umbral
de duración, directamente en el log de PostgreSQL. No requiere instrumentar la
aplicación.

\`\`\`
# postgresql.conf
shared_preload_libraries = 'pg_stat_statements,auto_explain'
auto_explain.log_min_duration = 1000   # ms; logea planes de consultas > 1 s
auto_explain.log_analyze = on          # incluye tiempos reales (ejecuta ANALYZE)
auto_explain.log_buffers = on          # incluye información de buffers
auto_explain.log_nested_statements = on # también logea consultas internas
\`\`\`

Las entradas aparecen en \`/var/log/postgresql/postgresql-*.log\` con el plan completo.
Usa \`pgBadger\` para generar reportes HTML a partir de los logs.

### 📖 Flujo de optimización sistemático

1. Identifica la consulta lenta con \`pg_stat_statements\` (mayor \`total_exec_time\`).
2. Ejecuta \`EXPLAIN (ANALYZE, BUFFERS)\` en un entorno de staging con datos reales.
3. Busca señales de alerta:
   - Seq Scan en tabla grande con muchas filas eliminadas
   - \`actual rows\` muy distinto de \`rows\` estimado → \`ANALYZE\`
   - \`shared read\` alto → I/O; considera índice o aumento de shared_buffers
   - \`loops\` alto en nodo lento → N+1; reescribe con JOIN o subconsulta
   - Sort/Hash con \`Disk\` → aumenta work_mem
4. Aplica el cambio mínimo (índice, ANALYZE, reescritura de consulta).
5. Verifica con \`EXPLAIN ANALYZE\` que el plan mejoró.
6. Monitorea \`pg_stat_statements\` después del despliegue.

### 📋 Lo que debes recordar
* EXPLAIN muestra estimaciones; EXPLAIN ANALYZE muestra la realidad (y ejecuta la consulta)
* Index Only Scan es el tipo más rápido: usa INCLUDE para habilitarlo
* \`actual rows\` muy diferente de \`rows\` → estadísticas obsoletas → ejecuta ANALYZE
* Buffers \`shared read\` alto indica I/O en disco; \`shared hit\` indica uso de caché
* \`pg_stat_statements\` es tu fuente de verdad para encontrar consultas costosas en producción
* \`auto_explain\` captura planes automáticamente en el log sin tocar la aplicación
* Ajusta \`work_mem\` en sesión antes de escalar globalmente

### 🧪 Autoevaluación
1. En la salida de EXPLAIN ANALYZE ves \`actual rows=85000\` pero \`rows=120\`. ¿Qué significa y qué harías?
2. ¿Cuál es la diferencia entre Index Scan e Index Only Scan? ¿Qué necesitas para obtener el segundo?
3. Ves un Nested Loop con \`loops=50000\` en el nodo interno (Index Scan sobre una tabla). ¿Qué problema sugiere y cómo lo investigarías?

---

1. El planificador estimó 120 filas pero encontró 85 000 reales: las estadísticas de la tabla están desactualizadas. Ejecuta \`ANALYZE tabla;\` o \`VACUUM ANALYZE tabla;\` para actualizarlas y permitir al planificador elegir un plan mejor (probablemente cambiará a Hash Join o Seq Scan con paralelismo en lugar de Nested Loop).
2. Index Scan usa el índice para localizar las filas y luego accede al heap (la tabla) para leer las columnas que no están en el índice. Index Only Scan obtiene todas las columnas necesarias directamente del índice sin tocar el heap. Para obtener Index Only Scan necesitas que todas las columnas del SELECT estén incluidas en el índice, ya sea como columnas clave o en la cláusula INCLUDE.
3. Sugiere un problema de N+1: la consulta externa devuelve 50 000 filas y por cada una ejecuta una búsqueda en la tabla interna. Investigaría trazando la consulta en la aplicación para ver si hay múltiples llamadas SQL que deberían ser un único JOIN. La solución típica es reescribir como JOIN o usar una subconsulta que materialice el conjunto interno una sola vez.
`

export default content
