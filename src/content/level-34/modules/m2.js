const content = `
## Módulo 2 — Persistencia: RDB, AOF y trade-offs de cada modo

### 🎯 Objetivos de aprendizaje
* Entender cómo funciona RDB (snapshots) y cuándo usarlo
* Entender cómo funciona AOF (append-only file) y sus tres modos de fsync
* Evaluar los trade-offs de pérdida de datos vs rendimiento vs tamaño de archivo
* Configurar persistencia híbrida y verificar la integridad de los archivos

### ❓ El problema real

Tu equipo usa Redis para almacenar sesiones de usuario y el carrito de compras. El servidor se reinicia inesperadamente a las 3 AM. Al levantar, Redis arranca vacío y 8.000 usuarios pierden sus carritos activos. El CTO pregunta qué configuración de persistencia deberían tener. Necesitas presentar las opciones con sus trade-offs reales.

### 📖 RDB: Redis Database Snapshots

RDB crea un snapshot completo del dataset en un archivo binario (\`.rdb\`). Es una fotografía del estado de Redis en un momento dado.

**Cómo funciona internamente**

Cuando Redis ejecuta BGSAVE (Background Save), hace un \`fork()\` del proceso principal. El proceso hijo escribe el snapshot al disco mientras el padre sigue procesando comandos. Linux usa Copy-on-Write (CoW): las páginas de memoria solo se copian cuando el hijo o el padre las modifica, por lo que el fork es casi instantáneo incluso con datasets grandes.

\`\`\`bash
# Verificar la configuración actual de snapshots
redis-cli CONFIG GET save

# Configurar triggers de snapshot en redis.conf
# save <segundos> <cambios_mínimos>
# Guardar si en 900 segundos hubo al menos 1 cambio
# Guardar si en 300 segundos hubo al menos 10 cambios
# Guardar si en 60 segundos hubo al menos 10.000 cambios
# save 900 1
# save 300 10
# save 60 10000

# Cambiar configuración en caliente (sin reiniciar)
redis-cli CONFIG SET save "900 1 300 10 60 10000"

# Snapshot manual — bloquea el servidor hasta completar (¡nunca en producción!)
redis-cli SAVE

# Snapshot en background — no bloquea
redis-cli BGSAVE

# Ver cuándo fue el último save exitoso
redis-cli LASTSAVE   # retorna timestamp Unix

# Verificar si hay un BGSAVE en progreso
redis-cli INFO persistence | grep rdb_bgsave_in_progress
\`\`\`

**Configuración en redis.conf**

\`\`\`bash
# Nombre del archivo de snapshot
dbfilename dump.rdb

# Directorio donde se guarda
dir /var/lib/redis

# Comprimir el RDB con LZF (recomendado — reduce tamaño ~50%)
rdbcompression yes

# Calcular checksum CRC64 al guardar/cargar (detecta corrupción)
rdbchecksum yes

# Desactivar snapshots completamente (para instancias solo-caché)
save ""
\`\`\`

**Verificar integridad del archivo RDB**

\`\`\`bash
# Herramienta incluida con Redis
redis-check-rdb /var/lib/redis/dump.rdb

# Output esperado si el archivo está sano:
# [offset 0] Checking RDB file dump.rdb
# [offset 26] AUX FIELD redis-ver = '7.2.3'
# [offset 40] AUX FIELD redis-bits = '64'
# [offset 52] AUX FIELD ctime = '1700000000'
# [offset 67] AUX FIELD used-mem = '1000000'
# [offset 79] AUX FIELD aof-base = '0'
# [offset 81] Selecting DB ID 0
# [offset 90] Checksum OK
\`\`\`

### 📖 AOF: Append-Only File

AOF registra cada comando de escritura que modifica el dataset. Al reiniciar, Redis reproduce todos los comandos para reconstruir el estado. Es el equivalente a un WAL (Write-Ahead Log) en bases de datos relacionales.

**Configuración en redis.conf**

\`\`\`bash
# Activar AOF
appendonly yes

# Nombre del archivo
appendfilename "appendonly.aof"

# Directorio (mismo que dir de RDB)
dir /var/lib/redis

# Modo de sincronización al disco
# always   — fsync después de cada comando (máxima durabilidad, menor rendimiento)
# everysec — fsync cada segundo (balance entre durabilidad y rendimiento) ← recomendado
# no       — el OS decide cuándo hacer fsync (mayor rendimiento, más riesgo de pérdida)
appendfsync everysec
\`\`\`

**Los tres modos de appendfsync en detalle**

\`\`\`
always:
  - Redis llama fsync() después de CADA escritura al AOF
  - Pérdida máxima de datos: 1 comando
  - Impacto en rendimiento: ~100x más lento que no persistencia
  - Uso: datos financieros, transacciones críticas

everysec (recomendado):
  - Un hilo auxiliar llama fsync() cada segundo
  - Pérdida máxima de datos: ~1 segundo de escrituras
  - Impacto en rendimiento: ~2-5% respecto a no persistencia
  - Uso: la mayoría de aplicaciones de producción

no:
  - Redis escribe al buffer del kernel, el OS hace fsync cuando decide
  - Pérdida potencial: todo lo que no haya volcado el OS (puede ser varios segundos o minutos)
  - Impacto en rendimiento: mínimo
  - Uso: cuando Redis es pure cache y la pérdida de datos es aceptable
\`\`\`

**AOF Rewrite: compactación del log**

Con el tiempo el AOF crece. Si una clave se modifica 10.000 veces, el AOF tiene 10.000 líneas para esa clave. BGREWRITEAOF compacta el AOF generando el conjunto mínimo de comandos para reproducir el estado actual.

\`\`\`bash
# Rewrite manual
redis-cli BGREWRITEAOF

# Redis puede hacer rewrite automático cuando el AOF crece demasiado
# redis.conf:
# auto-aof-rewrite-percentage 100   # rewrite cuando el AOF dobla su tamaño base
# auto-aof-rewrite-min-size 64mb    # pero solo si tiene al menos 64MB

# Verificar estado del AOF
redis-cli INFO persistence | grep aof

# Output relevante:
# aof_enabled:1
# aof_rewrite_in_progress:0
# aof_last_rewrite_time_sec:12
# aof_current_size:134217728
# aof_base_size:67108864

# Verificar integridad del AOF
redis-check-aof /var/lib/redis/appendonly.aof

# Si el AOF está truncado (crash durante escritura), repararlo
redis-check-aof --fix /var/lib/redis/appendonly.aof
\`\`\`

### 📖 RDB vs AOF: trade-offs

\`\`\`
Criterio              RDB                          AOF (everysec)
─────────────────────────────────────────────────────────────────
Pérdida de datos      Hasta el último snapshot      ~1 segundo
                      (minutos u horas)

Velocidad restart     Muy rápido (carga binario)    Más lento (reproduce cmds)

Tamaño en disco       Compacto (binario + LZF)      Mayor (texto, crece con el tiempo)

Impacto en ops        Fork cada N segundos          ~2-5% constante con everysec

Integridad            Riesgo de snapshot incompleto Puede truncarse, redis-check-aof
                      si el proceso muere durante   puede repararlo
                      el fork

Legibilidad           Binario (no legible)          Texto RESP (legible con cat)

Caso de uso ideal     Backups, disaster recovery    Durabilidad operacional
                      Cache reconstruible           Datos de sesión, colas
\`\`\`

### 📖 Persistencia híbrida: lo mejor de ambos mundos

Desde Redis 4.0 existe el modo híbrido: el AOF comienza con un snapshot RDB (para carga rápida) y luego adjunta los comandos incrementales (para durabilidad).

\`\`\`bash
# redis.conf
appendonly yes
aof-use-rdb-preamble yes   # activar modo híbrido (default en Redis 7.x)

# El archivo AOF tendrá la estructura:
# [RDB binary data] + [AOF commands desde el snapshot]
# Al cargar: Redis lee el RDB rápidamente, luego aplica los comandos AOF
\`\`\`

**Verificar que la persistencia funciona**

\`\`\`bash
# Después de configurar, crear datos de prueba
redis-cli SET test:persistence:key "valor-importante" EX 86400
redis-cli HSET test:persistence:hash campo1 "valor1" campo2 "valor2"
redis-cli BGSAVE   # forzar snapshot RDB

# Verificar archivos generados
ls -lh /var/lib/redis/
# -rw-r--r-- 1 redis redis 2.1M dump.rdb
# -rw-r--r-- 1 redis redis  45K appendonly.aof

# Simular reinicio y verificar que los datos persisten
redis-cli DEBUG RELOAD   # recarga el RDB desde disco sin reiniciar el proceso
redis-cli GET test:persistence:key   # debe retornar "valor-importante"

# En producción, para verificar recuperación real:
# systemctl restart redis
# redis-cli GET test:persistence:key
\`\`\`

**Configuración completa recomendada para producción**

\`\`\`bash
# /etc/redis/redis.conf — persistencia para datos críticos

# RDB — backup periódico
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir /var/lib/redis
rdbcompression yes
rdbchecksum yes

# AOF — durabilidad operacional
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no   # no suspender AOF durante rewrite
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes          # cargar AOF truncado en lugar de fallar
aof-use-rdb-preamble yes        # modo híbrido
\`\`\`

### 📖 Casos donde desactivar persistencia

Si Redis es una capa de caché pura (los datos originales están en la base de datos relacional), la persistencia solo añade latencia sin beneficio real. Un cache miss es aceptable, un servidor más lento no lo es.

\`\`\`bash
# redis.conf para caché pura sin persistencia
save ""                # desactivar RDB
appendonly no          # desactivar AOF

# O cambiar en caliente
redis-cli CONFIG SET save ""
redis-cli CONFIG SET appendonly no
\`\`\`

### 📋 Lo que debes recordar
* RDB crea snapshots periódicos usando fork + Copy-on-Write; rápido al arrancar, puede perder minutos de datos
* AOF registra cada escritura; con \`everysec\` la pérdida máxima es ~1 segundo
* El modo híbrido (\`aof-use-rdb-preamble yes\`) combina arranque rápido con alta durabilidad
* BGSAVE y BGREWRITEAOF son operaciones no bloqueantes; SAVE bloquea — nunca en producción
* \`redis-check-rdb\` y \`redis-check-aof\` verifican integridad; \`redis-check-aof --fix\` repara AOF truncado
* Para caché pura donde los datos son reconstruibles: desactiva ambas persistencias

### 🧪 Autoevaluación
1. ¿Qué técnica del sistema operativo hace que el fork para BGSAVE sea casi instantáneo incluso con 10 GB de datos?
2. Tienes una aplicación de e-commerce donde los carritos de compra se almacenan en Redis. ¿Qué combinación de persistencia usarías y por qué?
3. Tu servidor Redis arrancó después de un crash y el log muestra \`Bad file format reading the append only file\`. ¿Cuál es el siguiente paso?

---

1. Copy-on-Write (CoW). El fork copia las estructuras de control del proceso pero no la memoria de datos. Las páginas de RAM se comparten entre padre e hijo hasta que alguno las modifica, momento en el que el OS copia solo esa página. Esto hace el fork casi instantáneo independientemente del tamaño del dataset.
2. AOF con appendfsync everysec + RDB habilitado + modo híbrido. El carrito de compra tiene valor comercial directo — perder 1 segundo de datos es aceptable, perder el trabajo de la última hora no lo es. RDB provee backups para disaster recovery. El modo híbrido asegura reinicios rápidos.
3. Ejecutar \`redis-check-aof --fix /var/lib/redis/appendonly.aof\`. La herramienta trunca el AOF en el último comando válido, desechando la escritura incompleta que causó la corrupción. Luego reiniciar Redis.
`

export default content
