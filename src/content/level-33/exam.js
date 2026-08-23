const exam = [
  // Módulo 1 — Arquitectura PostgreSQL: procesos, WAL, MVCC y shared buffers
  {
    q: '¿Qué proceso de PostgreSQL escribe dirty pages al disco de forma proactiva entre checkpoints?',
    options: ['bgwriter (Background Writer)', 'checkpointer', 'walwriter', 'autovacuum'],
    correct: 0,
  },
  {
    q: '¿Qué garantiza que una transacción se considere realmente comprometida (commit) en PostgreSQL?',
    options: ['Que los dirty pages se hayan escrito en el heap', 'Que el registro WAL de la transacción se haya escrito (flusheado) en disco', 'Que el proceso checkpointer haya corrido', 'Que shared_buffers se haya vaciado'],
    correct: 1,
  },
  {
    q: 'En MVCC, ¿qué ocurre cuando se ejecuta un UPDATE sobre una fila?',
    options: ['La fila se sobrescribe in-place inmediatamente', 'Se bloquea la tabla completa hasta que termine la transacción', 'Se crea una nueva versión de la fila y la anterior se marca como expirada (dead tuple)', 'Se elimina la fila anterior de forma inmediata sin dejar rastro'],
    correct: 2,
  },
  {
    q: '¿Qué proceso de PostgreSQL es responsable de limpiar los dead tuples generados por MVCC?',
    options: ['walwriter', 'checkpointer', 'bgwriter', 'autovacuum'],
    correct: 3,
  },
  {
    q: 'Según la regla de producción, ¿qué proporción de la RAM del servidor se recomienda asignar a shared_buffers?',
    options: ['25% de la RAM total', '50% de la RAM total', '10% de la RAM total', '75% de la RAM total'],
    correct: 0,
  },
  {
    q: '¿Qué indica un valor alto de buffers_backend en pg_stat_bgwriter?',
    options: ['Que autovacuum está deshabilitado', 'Que bgwriter no está limpiando dirty pages a tiempo y los backends deben escribirlas ellos mismos', 'Que el WAL se está corrompiendo', 'Que hay demasiadas conexiones activas'],
    correct: 1,
  },

  // Módulo 2 — Instalación y configuración: postgresql.conf y pg_hba.conf
  {
    q: '¿Cuál es la fuente recomendada para instalar PostgreSQL en producción en lugar del paquete de la distribución?',
    options: ['El repositorio por defecto de la distribución Linux', 'Compilar PostgreSQL desde el código fuente siempre', 'El repositorio oficial de PGDG (PostgreSQL Global Development Group)', 'El repositorio de Snap o Flatpak'],
    correct: 2,
  },
  {
    q: '¿Dónde se guardan los parámetros modificados con ALTER SYSTEM?',
    options: ['postgresql.conf', 'pg_hba.conf', 'pg_ident.conf', 'postgresql.auto.conf'],
    correct: 3,
  },
  {
    q: '¿Qué método de autenticación en pg_hba.conf nunca debe usarse en producción sobre conexiones TCP?',
    options: ['trust', 'scram-sha-256', 'cert', 'md5'],
    correct: 0,
  },
  {
    q: '¿Cuál es el método de autenticación recomendado desde PostgreSQL 14 para conexiones con contraseña?',
    options: ['md5', 'trust', 'peer', 'scram-sha-256'],
    correct: 3,
  },
  {
    q: '¿Qué parámetro de postgresql.conf permite capturar consultas que tardan más de 1 segundo?',
    options: ['log_min_duration_statement', 'log_statement', 'log_connections', 'log_lock_waits'],
    correct: 0,
  },
  {
    q: '¿Qué comando permite aplicar cambios de configuración sin desconectar a los clientes activos?',
    options: ['systemctl restart postgresql', 'SELECT pg_reload_conf();', 'DROP DATABASE y recrearla', 'pg_ctlcluster 16 main stop'],
    correct: 1,
  },

  // Módulo 3 — psql, roles, bases de datos y esquemas
  {
    q: '¿Qué diferencia hay entre GRANT sobre tablas existentes y ALTER DEFAULT PRIVILEGES?',
    options: ['No hay diferencia real, ambos hacen lo mismo', 'ALTER DEFAULT PRIVILEGES define los privilegios que tendrán los objetos creados en el futuro, mientras GRANT aplica solo a los existentes', 'GRANT aplica a objetos futuros y ALTER DEFAULT PRIVILEGES a los existentes', 'ALTER DEFAULT PRIVILEGES solo funciona con superusuarios'],
    correct: 1,
  },
  {
    q: '¿Por qué se recomienda usar template0 en lugar de template1 al crear una base de datos nueva?',
    options: ['template0 es más rápido de copiar que template1', 'template0 permite conexiones simultáneas durante la creación', 'template0 es un template base limpio, sin extensiones u objetos que el DBA haya podido añadir a template1', 'template1 no permite especificar encoding personalizado'],
    correct: 2,
  },
  {
    q: '¿Qué controla el parámetro search_path en PostgreSQL?',
    options: ['Qué usuarios pueden conectarse a la base de datos', 'El orden en que se ejecutan los triggers', 'En qué esquemas busca PostgreSQL los objetos que se referencian sin prefijo de esquema', 'Los privilegios por defecto de un rol nuevo'],
    correct: 2,
  },
  {
    q: '¿Qué metacomando de psql lista los roles existentes en el cluster?',
    options: ['\\dn', '\\dt', '\\dp', '\\du'],
    correct: 3,
  },
  {
    q: '¿Cuál es la ventaja de \\copy frente a COPY?',
    options: ['Es más rápido para tablas de más de 1 millón de filas', 'No requiere privilegios de superusuario porque se ejecuta desde el cliente, no desde el servidor', 'Permite exportar directamente a formato JSON', 'Soporta compresión automática del archivo de salida'],
    correct: 1,
  },
  {
    q: '¿Por qué no se debe conectar la aplicación con el rol postgres?',
    options: ['Porque el rol postgres no puede usar contraseñas seguras', 'Porque el rol postgres tiene un límite de conexiones muy bajo', 'Porque el rol postgres no admite conexiones remotas', 'Porque el rol postgres tiene privilegios de superusuario, lo que amplía el impacto de cualquier error o brecha de seguridad'],
    correct: 3,
  },

  // Módulo 4 — Indexación: B-tree, GIN, GiST, BRIN e índices parciales
  {
    q: 'Tienes una tabla de 500 millones de filas donde los datos se insertan en orden cronológico. ¿Qué tipo de índice es más adecuado?',
    options: ['BRIN', 'GIN', 'GiST', 'B-tree'],
    correct: 0,
  },
  {
    q: '¿Qué extensión y tipo de índice se usan típicamente para búsquedas ILIKE con subcadenas?',
    options: ['La extensión pg_trgm con un índice B-tree estándar', 'La extensión pg_trgm con un índice GIN usando gin_trgm_ops', 'La extensión hstore con un índice GiST', 'La extensión pg_stat_statements con un índice BRIN'],
    correct: 1,
  },
  {
    q: '¿Qué permite lograr un índice de cobertura creado con la cláusula INCLUDE?',
    options: ['Una búsqueda paralela automática en todas las réplicas', 'Un Index Only Scan, respondiendo la consulta sin acceder a la tabla (heap)', 'La compresión automática del índice en disco', 'Un Bitmap Heap Scan más rápido que el índice original'],
    correct: 2,
  },
  {
    q: '¿Qué diferencia hay entre CREATE INDEX y CREATE INDEX CONCURRENTLY?',
    options: ['CREATE INDEX CONCURRENTLY solo funciona con índices GIN', 'CREATE INDEX CONCURRENTLY no puede usarse en producción', 'CREATE INDEX CONCURRENTLY crea el índice en memoria en lugar de disco', 'CREATE INDEX CONCURRENTLY no bloquea las escrituras en la tabla durante la construcción, aunque tarda más'],
    correct: 3,
  },
  {
    q: '¿Para qué tipos de datos es más adecuado un índice GIN?',
    options: ['Arrays, JSONB y texto para búsquedas de texto completo (full-text search)', 'Tipos geométricos y rangos con solapamiento', 'Columnas numéricas con rangos secuenciales', 'Claves primarias y columnas de igualdad simple'],
    correct: 0,
  },
  {
    q: '¿Qué indica idx_scan = 0 en pg_stat_user_indexes tras 30 días de producción normal?',
    options: ['Que el índice está corrupto y debe reconstruirse de inmediato', 'Que el índice probablemente no se está usando y es candidato a eliminarse', 'Que la tabla necesita más autovacuum', 'Que el índice está fragmentado por escrituras concurrentes'],
    correct: 1,
  },

  // Módulo 5 — EXPLAIN ANALYZE: optimización de consultas en producción
  {
    q: '¿Cuál es la diferencia entre EXPLAIN y EXPLAIN ANALYZE?',
    options: ['EXPLAIN ANALYZE solo funciona con consultas SELECT', 'EXPLAIN muestra tiempos reales y EXPLAIN ANALYZE solo estimaciones', 'No hay diferencia, ambos comandos son sinónimos', 'EXPLAIN ANALYZE ejecuta realmente la consulta y añade tiempos y conteos reales; EXPLAIN solo muestra estimaciones'],
    correct: 3,
  },
  {
    q: '¿Qué indica un valor alto en "Rows Removed by Filter" dentro de un Seq Scan?',
    options: ['Que la tabla tiene demasiados índices', 'Que se están descartando muchas filas, una señal de que falta un índice adecuado', 'Que el planificador está usando paralelismo correctamente', 'Que las estadísticas están actualizadas'],
    correct: 1,
  },
  {
    q: '¿Qué tipo de nodo de plan es el más rápido porque no necesita acceder al heap (tabla)?',
    options: ['Seq Scan', 'Bitmap Heap Scan', 'Index Only Scan', 'Nested Loop'],
    correct: 2,
  },
  {
    q: '¿Qué sugiere un Nested Loop cuyo nodo interno tiene un valor de loops muy alto?',
    options: ['Que el índice usado está corrupto', 'Que se debería aumentar shared_buffers', 'Que la tabla necesita un REINDEX urgente', 'Un problema de N+1: la consulta interna se ejecuta una vez por cada fila externa'],
    correct: 3,
  },
  {
    q: '¿Qué indica que "actual rows" sea muy distinto de "rows" estimado en un plan de ejecución?',
    options: ['Que las estadísticas de la tabla están desactualizadas y conviene ejecutar ANALYZE', 'Que el índice utilizado es incorrecto y debe eliminarse', 'Que hay un deadlock en curso', 'Que la tabla está corrupta y necesita VACUUM FULL'],
    correct: 0,
  },
  {
    q: '¿Para qué sirve principalmente pg_stat_statements?',
    options: ['Bloquear automáticamente las consultas lentas', 'Identificar las consultas que más recursos consumen acumulados a lo largo del tiempo', 'Reemplazar la necesidad de EXPLAIN ANALYZE', 'Generar backups automáticos de las consultas ejecutadas'],
    correct: 1,
  },
  {
    q: '¿Qué hace la extensión auto_explain?',
    options: ['Cancela automáticamente las consultas que superan un umbral de duración', 'Reescribe las consultas lentas para optimizarlas', 'Registra automáticamente en el log el plan de las consultas que superan un umbral de duración', 'Envía alertas por correo cuando una consulta es lenta'],
    correct: 2,
  },

  // Módulo 6 — Replicación streaming: primario y réplicas de lectura
  {
    q: '¿Cuál es la diferencia principal entre replicación síncrona y asíncrona?',
    options: ['En modo asíncrono el primario espera confirmación de la réplica antes de responder', 'La replicación síncrona no requiere wal_level = replica', 'La diferencia solo afecta a las réplicas físicas, no a las lógicas', 'En modo síncrono el primario espera confirmación de la réplica antes de responder al cliente, garantizando cero pérdida de datos'],
    correct: 3,
  },
  {
    q: '¿Qué hace la opción -R de pg_basebackup?',
    options: ['Reinicia automáticamente el servicio PostgreSQL en la réplica', 'Genera automáticamente standby.signal y configura primary_conninfo en postgresql.auto.conf', 'Comprime el backup en formato tar.gz', 'Elimina los WAL antiguos del primario'],
    correct: 1,
  },
  {
    q: '¿Qué vista del primario muestra el estado y el lag de las réplicas conectadas?',
    options: ['pg_stat_wal_receiver', 'pg_stat_archiver', 'pg_stat_replication', 'pg_stat_bgwriter'],
    correct: 2,
  },
  {
    q: '¿Qué función de PostgreSQL promueve una réplica a primario?',
    options: ['pg_switch_wal()', 'pg_reload_conf()', 'pg_wal_replay_resume()', 'pg_promote()'],
    correct: 3,
  },
  {
    q: '¿Qué riesgo tienen los slots de replicación si la réplica se desconecta por mucho tiempo?',
    options: ['El primario acumula WAL indefinidamente hasta llenar el disco', 'La réplica se corrompe automáticamente', 'El primario deja de aceptar nuevas conexiones', 'Los datos de la réplica se vuelven inconsistentes de forma silenciosa'],
    correct: 0,
  },
  {
    q: '¿Por qué es peligroso leer inmediatamente de la réplica justo después de escribir en el primario?',
    options: ['Porque las réplicas nunca aceptan consultas SELECT', 'Porque la réplica asíncrona puede tener lag y aún no haber recibido o aplicado el cambio reciente', 'Porque leer de la réplica bloquea las escrituras en el primario', 'Porque la réplica requiere reiniciar el servicio tras cada escritura'],
    correct: 1,
  },

  // Módulo 7 — Backup y recuperación: pg_dump, pg_basebackup y PITR
  {
    q: '¿Qué formato de pg_dump es el más recomendado para backups regulares por ser comprimido y flexible?',
    options: ['Formato plain (-Fp), porque es el más legible', 'Formato tar (-Ft), porque no requiere pg_restore', 'Formato custom (-Fc), comprimido y compatible con pg_restore avanzado', 'Formato SQL sin compresión, porque es más portable'],
    correct: 2,
  },
  {
    q: '¿Qué herramienta es imprescindible para respaldar los roles y tablespaces de un cluster PostgreSQL?',
    options: ['pg_basebackup, porque copia todo el directorio de datos', 'pg_restore, porque puede reconstruir roles automáticamente', 'psql, ejecutando un script manual de roles', 'pg_dumpall, ya que pg_dump solo respalda una base de datos y no los globals del cluster'],
    correct: 3,
  },
  {
    q: '¿Qué formato de pg_dump permite restauración paralela usando pg_restore --jobs?',
    options: ['Formato plain (-Fp)', 'Formato custom (-Fc)', 'Formato directory (-Fd)', 'Formato tar (-Ft)'],
    correct: 2,
  },
  {
    q: '¿Qué permite lograr un backup base combinado con el archivado continuo de WAL?',
    options: ['Replicación síncrona sin pérdida de datos', 'Balanceo de carga de lectura entre réplicas', 'Point-in-Time Recovery (PITR): restaurar a cualquier momento entre el backup base y el último WAL archivado', 'Migración automática de mayor a menor versión de PostgreSQL'],
    correct: 2,
  },
  {
    q: 'En PostgreSQL 12+, ¿qué archivo indica que la instancia debe entrar en modo de recuperación (no de réplica)?',
    options: ['standby.signal', 'recovery.conf', 'postgresql.auto.conf', 'recovery.signal'],
    correct: 3,
  },
  {
    q: '¿Qué parámetro define el punto exacto en el tiempo al que se desea recuperar la base de datos en un PITR?',
    options: ['recovery_target_time', 'recovery_target_action', 'archive_timeout', 'checkpoint_timeout'],
    correct: 0,
  },

  // Módulo 8 — Proyecto real: PostgreSQL de producción completo
  {
    q: 'En un servidor con 16 GB de RAM dedicado a PostgreSQL, ¿qué valor de shared_buffers sigue la regla de producción?',
    options: ['4GB (25% de 16 GB)', '8GB (50% de 16 GB)', '2GB (12.5% de 16 GB)', '12GB (75% de 16 GB)'],
    correct: 0,
  },
  {
    q: '¿Qué hace el parámetro hot_standby_feedback = on en una réplica?',
    options: ['Envía automáticamente los backups diarios al primario', 'Informa al primario de los XIDs activos en la réplica para evitar que limpie filas que la réplica todavía necesita', 'Aumenta el shared_buffers de la réplica dinámicamente', 'Fuerza a la réplica a promoverse si detecta lag alto'],
    correct: 1,
  },
  {
    q: '¿Por qué es mala idea configurar max_connections = 1000 sin usar un connection pooler?',
    options: ['Porque PostgreSQL tiene un límite técnico absoluto de 500 conexiones', 'Porque cada conexión consume RAM y overhead de procesos, y con muchas conexiones inactivas se desperdician recursos que podrían usarse para datos', 'Porque más conexiones ralentizan automáticamente el WAL', 'Porque cada conexión requiere su propia licencia de PostgreSQL'],
    correct: 1,
  },
  {
    q: '¿Qué alternativa se recomienda en lugar de aumentar max_connections drásticamente?',
    options: ['Aumentar directamente shared_buffers para compensar', 'Desactivar autovacuum para liberar recursos', 'Reducir work_mem a 1MB para todas las sesiones', 'Usar PgBouncer en modo transaction pooling para compartir un pool reducido de conexiones reales'],
    correct: 3,
  },
  {
    q: '¿Qué vista y columna permiten detectar presión de I/O causada por checkpoints forzados por WAL lleno?',
    options: ['pg_stat_bgwriter (columna checkpoints_req)', 'pg_stat_replication', 'pg_stat_archiver', 'pg_stat_user_tables'],
    correct: 0,
  },
  {
    q: '¿Qué archivo genera pg_basebackup con -R en la réplica para indicar que la instancia es un standby?',
    options: ['recovery.signal', 'standby.signal', 'postgresql.auto.conf', 'primary_conninfo.conf'],
    correct: 1,
  },
  {
    q: '¿Qué combinación de backups conforma una estrategia robusta en producción?',
    options: ['Solo backups físicos mensuales sin WAL archiving', 'Solo pg_dumpall diario, sin backups físicos', 'Backup lógico diario (pg_dump) + backup físico semanal (pg_basebackup) + archivado continuo de WAL', 'Replicación síncrona como único método de backup'],
    correct: 2,
  },
]

export default exam
