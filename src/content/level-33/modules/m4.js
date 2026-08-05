const content = `
## Módulo 4 — Indexación: B-tree, GIN, GiST, BRIN e índices parciales

### 🎯 Objetivos de aprendizaje
* Comprender por qué los índices transforman el rendimiento de las consultas
* Saber elegir el tipo de índice correcto según el tipo de dato y el patrón de consulta
* Crear índices parciales, de expresión y de cobertura para optimizar casos específicos
* Monitorear el uso real de los índices con \`pg_stat_user_indexes\`
* Identificar y eliminar índices bloqueados, duplicados o no utilizados

### ❓ El problema real
Tu aplicación funciona bien con mil registros. A los seis meses tienes dos millones
de órdenes y el endpoint de búsqueda por correo tarda cuatro segundos. El DBA de
guardia mira el plan con EXPLAIN ANALYZE, ve un "Seq Scan" y dice: "faltan índices".
¿Por qué un scan secuencial es tan lento? ¿Y cómo decides qué índice crear?

### 📖 Por qué existen los índices

Sin índice, PostgreSQL lee cada fila de la tabla para encontrar las que coinciden
con la condición: complejidad O(n). Con un millón de filas y páginas de 8 KB, eso
equivale a leer cientos de megabytes del disco.

Un índice es una estructura de datos auxiliar que permite llegar a las filas
relevantes en O(log n) o incluso O(1), a cambio de espacio en disco y una pequeña
penalización en escrituras (INSERT, UPDATE, DELETE deben actualizar el índice).

La regla de oro: indexa las columnas que aparecen frecuentemente en WHERE, JOIN ON,
ORDER BY y GROUP BY. No indexes todo; cada índice tiene un costo de mantenimiento.

### 📖 B-tree — el índice universal

Es el tipo por defecto. Implementa un árbol balanceado donde cada nodo contiene
valores ordenados y punteros a sus hijos.

**Cuándo usarlo:**
- Igualdad: \`WHERE email = 'user@example.com'\`
- Rango: \`WHERE created_at BETWEEN '2024-01-01' AND '2024-06-30'\`
- Ordenamiento: \`ORDER BY last_name\`
- Prefijo de cadena: \`WHERE name LIKE 'García%'\` (solo prefijo, no sufijo)
- Verificación de nulo: \`WHERE deleted_at IS NULL\`

\`\`\`sql
-- Índice simple
CREATE INDEX idx_orders_created ON orders(created_at);

-- Índice multi-columna (el orden importa mucho)
-- Útil para: WHERE user_id = 5 ORDER BY created_at DESC
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

-- Regla de prefijo: un índice (a, b, c) sirve para:
--   WHERE a = 1
--   WHERE a = 1 AND b = 2
--   WHERE a = 1 AND b = 2 AND c = 3
-- NO sirve para: WHERE b = 2 (a está ausente)
\`\`\`

### 📖 GIN — para búsquedas dentro de valores compuestos

GIN (Generalized Inverted Index) construye un mapa invertido: de cada elemento
interno al conjunto de filas que lo contienen. Ideal cuando el valor de una
columna es en sí mismo una colección (array, JSONB, texto con lexemas).

**Casos de uso:**
\`\`\`sql
-- Arrays
CREATE INDEX idx_tags ON articles USING GIN(tags);
SELECT * FROM articles WHERE tags @> ARRAY['postgresql', 'performance'];
-- @>  contiene todos los elementos
-- <@  está contenido en
-- &&  tiene algún elemento en común

-- JSONB
CREATE INDEX idx_meta ON products USING GIN(metadata);
SELECT * FROM products WHERE metadata ? 'color';          -- tiene la clave
SELECT * FROM products WHERE metadata @> '{"color":"red"}'; -- contiene subdoc

-- Full-text search
CREATE INDEX idx_fts ON articles USING GIN(to_tsvector('spanish', body));
SELECT * FROM articles
WHERE to_tsvector('spanish', body) @@ to_tsquery('spanish', 'postgresql & rendimiento');

-- pg_trgm: búsqueda por trigrama (ILIKE, similitud)
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_trgm_name ON products USING GIN(name gin_trgm_ops);
SELECT * FROM products WHERE name ILIKE '%postgre%';
\`\`\`

GIN es grande y lento de construir, pero muy rápido en consulta. Adecuado cuando
las búsquedas son frecuentes y las escrituras moderadas.

### 📖 GiST — para tipos geométricos y rangos

GiST (Generalized Search Tree) es un framework extensible que admite operadores
de solapamiento, contención y proximidad. No almacena valores exactos sino
predicados que pueden ser "falsos positivos" (requiere verificación posterior).

**Casos de uso:**
\`\`\`sql
-- Tipos geométricos
CREATE INDEX idx_location ON stores USING GIST(location);  -- columna point
SELECT * FROM stores WHERE location <-> point(40.41, -3.70) < 10; -- distancia

-- Rangos
CREATE INDEX idx_reservation ON reservations USING GIST(period);  -- tstzrange
SELECT * FROM reservations WHERE period && tstzrange('2024-06-01','2024-06-30');
-- &&  se solapan
-- @>  contiene el punto/rango
-- <@  está dentro del rango

-- Full-text con ranking (GiST soporta ts_rank mejor en algunos casos)
CREATE INDEX idx_fts_gist ON docs USING GIST(to_tsvector('spanish', content));
\`\`\`

### 📖 BRIN — para tablas enormes con acceso secuencial

BRIN (Block Range INdex) no indexa filas individuales. Divide la tabla en rangos
de bloques físicos y almacena el valor mínimo y máximo de la columna en cada rango.
El resultado es un índice diminuto (kilobytes en lugar de gigabytes).

**Condición de uso:** la columna debe estar correlacionada con el orden físico
de las filas. Si los datos se insertan en orden creciente (timestamp de eventos,
ID de autoincremento), BRIN es ideal.

\`\`\`sql
-- Tabla de eventos: 500 millones de filas, ~100 GB
CREATE INDEX idx_events_ts ON events USING BRIN(occurred_at);
-- El índice ocupa ~50 KB en lugar de ~10 GB (B-tree)

-- Consulta eficiente: rango de tiempo reciente
SELECT * FROM events WHERE occurred_at >= NOW() - INTERVAL '1 hour';

-- NO es eficiente para:
SELECT * FROM events WHERE user_id = 42;  -- user_id no es secuencial
\`\`\`

Ajuste del tamaño del rango:
\`\`\`sql
CREATE INDEX idx_events_ts ON events USING BRIN(occurred_at)
  WITH (pages_per_range = 32);  -- por defecto 128; menos páginas = más preciso pero más grande
\`\`\`

### 📖 Índice parcial

Un índice parcial incluye solo las filas que cumplen una condición WHERE.
Es más pequeño, más rápido de construir y más rápido de buscar.

\`\`\`sql
-- Solo usuarios activos (10% del total)
CREATE INDEX idx_active_users ON users(email) WHERE active = true;

-- Consulta que usa el índice:
SELECT id FROM users WHERE email = 'maria@example.com' AND active = true;

-- Índice único parcial: unicidad solo entre filas no eliminadas (soft delete)
CREATE UNIQUE INDEX idx_unique_email_active
  ON users(email)
  WHERE deleted_at IS NULL;
-- Permite el mismo email si la fila está eliminada; no si está activa
\`\`\`

### 📖 Índice de expresión

Indexa el resultado de una función o expresión, no la columna cruda.

\`\`\`sql
-- Búsqueda sin distinción de mayúsculas/minúsculas
CREATE INDEX idx_lower_email ON users(lower(email));

-- Consulta que usa el índice:
SELECT * FROM users WHERE lower(email) = lower('Usuario@EXAMPLE.COM');

-- Extracción de campo JSONB (para versiones sin índice GIN por campo)
CREATE INDEX idx_country ON users((metadata->>'country'));
SELECT * FROM users WHERE metadata->>'country' = 'ES';
\`\`\`

### 📖 Índice de cobertura (INCLUDE)

Añade columnas extra al índice sin que formen parte de la clave de búsqueda.
Permite un "Index Only Scan": PostgreSQL responde la consulta leyendo solo el
índice, sin tocar la tabla (heap).

\`\`\`sql
CREATE INDEX idx_orders_cover
  ON orders(user_id)
  INCLUDE (total, created_at, status);

-- Esta consulta es Index Only Scan (todos los campos vienen del índice):
SELECT user_id, total, created_at, status
FROM orders
WHERE user_id = 42;
\`\`\`

### 📖 Creación concurrente y mantenimiento

\`\`\`sql
-- Creación sin bloquear escrituras (tarda más, pero es seguro en producción)
CREATE INDEX CONCURRENTLY idx_orders_email ON orders(customer_email);

-- Reconstruir un índice corrupto o con mucho bloat
REINDEX INDEX CONCURRENTLY idx_orders_email;

-- Reconstruir todos los índices de una tabla
REINDEX TABLE CONCURRENTLY orders;
\`\`\`

### 📖 Monitoreo: ¿se usan los índices?

\`\`\`sql
-- Estadísticas de uso por índice
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,        -- número de veces que se usó el índice
  idx_tup_read,    -- filas leídas desde el índice
  idx_tup_fetch    -- filas obtenidas del heap
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;   -- los de idx_scan=0 son candidatos a eliminar

-- Tamaño de índices
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes
WHERE tablename = 'orders';

-- Detectar bloat en índices (requiere extensión pgstattuple)
CREATE EXTENSION pgstattuple;
SELECT * FROM pgstatindex('idx_orders_user_date');
-- leaf_fragmentation > 30% → considera REINDEX
\`\`\`

### 📖 Eliminar índices no utilizados

Cada índice que no se usa es un costo puro: ralentiza INSERT/UPDATE/DELETE y
ocupa espacio. Política recomendada: si \`idx_scan = 0\` después de 30 días de
producción normal, el índice probablemente no es necesario.

\`\`\`sql
-- Ver índices con cero usos desde el último reinicio de estadísticas
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname NOT IN ('pg_catalog','information_schema')
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Eliminar (siempre con CONCURRENTLY en producción)
DROP INDEX CONCURRENTLY idx_unused_column;
\`\`\`

### 📋 Lo que debes recordar
* B-tree es el índice por defecto; cubre igualdad, rango, ORDER BY y LIKE de prefijo
* GIN para arrays, JSONB y full-text; GiST para geometría y rangos con solapamiento
* BRIN es diminuto y eficaz en tablas enormes con datos físicamente ordenados
* Los índices parciales y de expresión cubren patrones de consulta específicos con mínimo overhead
* INCLUDE convierte un índice en "cobertura" y habilita Index Only Scan
* Siempre usa CONCURRENTLY en producción para crear o reconstruir índices
* Audita \`pg_stat_user_indexes\` regularmente y elimina índices con \`idx_scan = 0\`

### 🧪 Autoevaluación
1. Tienes una tabla de 50 millones de registros de logs con columna \`recorded_at TIMESTAMPTZ\` y los registros se insertan en orden cronológico. ¿Qué tipo de índice usarías y por qué?
2. Necesitas buscar productos cuyo nombre contenga la subcadena \`'café'\` sin importar mayúsculas (ILIKE). ¿Qué índice y extensión utilizas?
3. ¿Cuál es la diferencia entre \`CREATE INDEX\` y \`CREATE INDEX CONCURRENTLY\`? ¿Cuándo usarías cada uno?

---

1. BRIN, porque los datos son secuenciales: la correlación entre el orden físico y el valor de la columna es alta. El índice ocupa kilobytes en lugar de gigabytes y es eficiente para consultas de rango temporal.
2. La extensión \`pg_trgm\` con un índice GIN usando la clase de operador \`gin_trgm_ops\`: \`CREATE INDEX idx_trgm ON products USING GIN(name gin_trgm_ops);\`. Esto permite que \`ILIKE '%café%'\` use el índice.
3. \`CREATE INDEX\` adquiere un bloqueo exclusivo sobre la tabla durante la construcción: bloquea todas las escrituras. \`CREATE INDEX CONCURRENTLY\` hace múltiples pasadas sin bloquear escrituras, tarda más pero es seguro en producción. Usa \`CONCURRENTLY\` salvo en entornos de desarrollo o mantenimiento programado.
`

export default content
