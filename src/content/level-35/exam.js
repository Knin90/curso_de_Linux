const exam = [
  // Módulo 1 — Arquitectura Prometheus: pull model, TSDB y componentes
  {
    q: '¿Qué modelo de recolección usa Prometheus para obtener métricas de los targets?',
    options: [
      'Pull: Prometheus consulta periódicamente a los targets',
      'Push: los targets envían sus métricas a Prometheus',
      'Modelo híbrido pull/push simultáneo',
      'Solo push a través de Pushgateway',
    ],
    correct: 0,
  },
  {
    q: '¿Cuál es la retención por defecto de datos en Prometheus?',
    options: ['7 días', '15 días', '30 días', '90 días'],
    correct: 1,
  },
  {
    q: '¿Qué componente de Prometheus recibe y enruta las alertas hacia canales como Slack o email?',
    options: ['Pushgateway', 'Grafana', 'Alertmanager', 'TSDB'],
    correct: 2,
  },
  {
    q: '¿Para qué sirve el flag --web.enable-lifecycle en Prometheus?',
    options: [
      'Habilita autenticación básica en la API',
      'Activa la compresión Gorilla en el TSDB',
      'Configura la retención automática de bloques',
      'Permite recargar la configuración sin reiniciar el proceso vía /-/reload',
    ],
    correct: 3,
  },
  {
    q: '¿Cuáles son los cuatro tipos de métricas soportados por Prometheus?',
    options: [
      'Counter, Gauge, Histogram y Summary',
      'Counter, Timer, Trace y Log',
      'Gauge, Meter, Event y Span',
      'Counter, Gauge, Trace y Summary',
    ],
    correct: 0,
  },
  {
    q: 'En el almacenamiento TSDB de Prometheus, ¿dónde se guardan los datos más recientes antes de ser compactados en bloques?',
    options: [
      'En el índice invertido de labels',
      'En el Write-Ahead Log (WAL)',
      'En el archivo meta.json',
      'En memoria caché de Grafana',
    ],
    correct: 1,
  },

  // Módulo 2 — Exporters: node_exporter, nginx, postgres, redis
  {
    q: '¿Qué endpoint de nginx debe habilitarse para que nginx_exporter pueda leer sus métricas?',
    options: ['nginx_status', 'metrics_endpoint', 'stub_status', 'health_check'],
    correct: 2,
  },
  {
    q: '¿Qué rol de PostgreSQL se recomienda otorgar al usuario usado por postgres_exporter?',
    options: ['superuser', 'pg_read_all_data', 'postgres (rol admin)', 'pg_monitor'],
    correct: 3,
  },
  {
    q: '¿En qué puerto expone sus métricas node_exporter por defecto?',
    options: ['9100', '9090', '9093', '9121'],
    correct: 0,
  },
  {
    q: '¿Cómo se calcula el hit rate de Redis con las métricas de redis_exporter?',
    options: [
      'redis_connected_clients / redis_memory_used_bytes',
      'rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))',
      'sum(redis_commands_processed_total)',
      'redis_keyspace_hits_total - redis_keyspace_misses_total',
    ],
    correct: 1,
  },
  {
    q: '¿Qué flag de node_exporter es necesario para exponer el estado de las unidades systemd?',
    options: ['--collector.processes', '--collector.textfile', '--collector.systemd', '--web.enable-lifecycle'],
    correct: 2,
  },
  {
    q: '¿Qué finalidad tienen los labels como env, role y hostname agregados en los scrape_configs?',
    options: [
      'Reducir la cardinalidad de las métricas automáticamente',
      'Cifrar el tráfico de scrape entre Prometheus y el exporter',
      'Aumentar la frecuencia de scrape de ese job',
      'Permitir filtrar y agrupar series en PromQL según entorno, rol o servidor',
    ],
    correct: 3,
  },

  // Módulo 3 — PromQL: consultas básicas y avanzadas
  {
    q: '¿Qué función de PromQL se recomienda usar para graficar tendencias suaves sobre un counter?',
    options: ['rate()', 'irate()', 'delta()', 'changes()'],
    correct: 0,
  },
  {
    q: '¿Qué diferencia hay entre sum by (job) y sum without (instance) si las series tienen labels {job, instance, handler}?',
    options: [
      'Ambas producen exactamente el mismo resultado',
      'by (job) deja solo {job}; without (instance) deja {job, handler}',
      'by (job) elimina el label job',
      'without (instance) elimina todos los labels',
    ],
    correct: 1,
  },
  {
    q: '¿Qué función de PromQL se usa para calcular percentiles a partir de un histogram?',
    options: ['predict_linear()', 'quantile_over_time()', 'histogram_quantile()', 'topk()'],
    correct: 2,
  },
  {
    q: '¿Qué operador de label matching se usa para filtrar con una expresión regular en PromQL?',
    options: ['==', '!=', ':=', '=~'],
    correct: 3,
  },
  {
    q: '¿Para qué se utiliza la función predict_linear() en PromQL?',
    options: [
      'Para predecir el valor futuro de una métrica basándose en su tendencia lineal reciente',
      'Para calcular la media móvil de una métrica',
      'Para contar cuántas veces cambió un valor',
      'Para sumar métricas de distintos jobs',
    ],
    correct: 0,
  },
  {
    q: '¿Qué representan los 4 golden signals de SRE mencionados junto a PromQL?',
    options: [
      'CPU, Memoria, Disco y Red',
      'Latencia, Tráfico, Errores y Saturación',
      'Uptime, Latencia, Throughput y Cardinalidad',
      'Errores, Alertas, Logs y Trazas',
    ],
    correct: 1,
  },
  {
    q: '¿Qué hace la función increase(http_requests_total[1h])?',
    options: [
      'Calcula la tasa instantánea usando los últimos 2 puntos',
      'Calcula el promedio de requests por segundo',
      'Calcula el incremento total del counter durante la última hora (no por segundo)',
      'Reinicia el contador cada hora',
    ],
    correct: 2,
  },

  // Módulo 4 — Alerting: alertmanager, reglas y notificaciones
  {
    q: '¿Qué función cumple el campo "for" en una regla de alerta de Prometheus?',
    options: [
      'Define cada cuánto se reenvía la notificación si sigue activa',
      'Establece el tiempo máximo que Alertmanager guarda el historial',
      'Determina el intervalo de scrape de esa métrica',
      'Exige que la condición se cumpla de forma continua durante ese tiempo antes de pasar a Firing',
    ],
    correct: 3,
  },
  {
    q: '¿Qué hacen las inhibit_rules en Alertmanager?',
    options: [
      'Suprimen alertas de menor severidad cuando ya existe una de mayor severidad con el mismo contexto',
      'Agrupan alertas del mismo job en una sola notificación',
      'Bloquean el envío de alertas fuera de horario laboral',
      'Eliminan permanentemente alertas resueltas',
    ],
    correct: 0,
  },
  {
    q: '¿Qué diferencia hay entre group_wait y group_interval en la configuración de ruteo de Alertmanager?',
    options: [
      'Son sinónimos configurables indistintamente',
      'group_wait espera antes de la primera notificación de un grupo; group_interval es el tiempo entre notificaciones subsiguientes del mismo grupo',
      'group_wait aplica a Prometheus y group_interval a Alertmanager',
      'group_interval determina cuándo se resuelve automáticamente la alerta',
    ],
    correct: 1,
  },
  {
    q: '¿Qué comando de amtool permite silenciar una alerta durante un mantenimiento programado?',
    options: ['amtool alert mute', 'amtool silence pause', 'amtool silence add', 'amtool check-config --silence'],
    correct: 2,
  },
  {
    q: 'Una alerta tiene for: 5m y la condición se cumple solo 3 minutos antes de desaparecer. ¿Se dispara la notificación?',
    options: [
      'Sí, porque toda condición cumplida genera notificación inmediata',
      'Sí, pero solo se envía a los receptores marcados como críticos',
      'No, porque las alertas con for menor a 10m se ignoran',
      'No, porque nunca alcanza el estado Firing al no cumplirse los 5 minutos continuos',
    ],
    correct: 3,
  },
  {
    q: '¿Qué efecto tiene continue: true en una ruta de Alertmanager?',
    options: [
      'Permite que la alerta siga evaluándose en rutas posteriores además de la actual',
      'Detiene el procesamiento de la alerta en la ruta actual',
      'Repite la notificación indefinidamente hasta ser silenciada',
      'Convierte la alerta en crítica automáticamente',
    ],
    correct: 0,
  },

  // Módulo 5 — Grafana: dashboards, datasources y paneles
  {
    q: '¿Qué tipo de panel de Grafana muestra un único valor destacado, como "99.9% uptime"?',
    options: ['Gauge', 'Stat', 'Heatmap', 'Table'],
    correct: 1,
  },
  {
    q: '¿Qué ventaja tiene el provisioning de dashboards vía YAML frente a crearlos desde la interfaz web?',
    options: [
      'Permite editar dashboards sin necesidad de reiniciar Grafana',
      'Aumenta la resolución de los gráficos generados',
      'Los dashboards quedan versionados como código en Git y se restauran automáticamente al reconstruir el servidor',
      'Elimina la necesidad de configurar datasources',
    ],
    correct: 2,
  },
  {
    q: '¿Qué significa access: proxy en la configuración de un datasource de Grafana?',
    options: [
      'El navegador consulta directamente a Prometheus sin pasar por Grafana',
      'Los datos se almacenan en caché en un proxy externo',
      'Se cifra automáticamente el tráfico HTTP',
      'Grafana realiza las consultas al backend; el navegador del usuario no necesita acceso directo a Prometheus',
    ],
    correct: 3,
  },
  {
    q: '¿Qué dashboard de la comunidad de Grafana es el estándar para monitorear servidores Linux con node_exporter?',
    options: [
      'ID 1860 (Node Exporter Full)',
      'ID 9614 (NGINX Exporter)',
      'ID 763 (Redis Dashboard)',
      'ID 3662 (Prometheus 2.0 Stats)',
    ],
    correct: 0,
  },
  {
    q: '¿Cómo se logra que un panel de Grafana filtre datos dinámicamente según el servidor seleccionado en un dropdown?',
    options: [
      'Editando manualmente la query cada vez que cambia el servidor',
      'Usando variables de template como $instance en la consulta del panel',
      'Creando un dashboard distinto por cada servidor',
      'Configurando alertas separadas por instancia',
    ],
    correct: 1,
  },
  {
    q: '¿Qué usuario y contraseña iniciales tiene Grafana tras la instalación por defecto?',
    options: ['root / grafana', 'admin / changeme', 'admin / admin', 'grafana / admin123'],
    correct: 2,
  },

  // Módulo 6 — Recording rules y optimización de Prometheus
  {
    q: '¿Cuál es la convención de nombres recomendada para las recording rules?',
    options: [
      'nivel_agregación:métrica:operación',
      'métrica_operación_nivel',
      'rule_nombre_versión',
      'namespace.metric.type',
    ],
    correct: 0,
  },
  {
    q: '¿Por qué usar user_id como label en Prometheus es un antipatrón?',
    options: [
      'Porque Prometheus no permite labels alfanuméricos',
      'Genera una serie temporal por cada usuario único, disparando la cardinalidad y agotando memoria',
      'Porque ralentiza únicamente las consultas con regex',
      'Porque rompe la compatibilidad con Grafana',
    ],
    correct: 1,
  },
  {
    q: '¿Qué diferencia hay entre relabel_configs y metric_relabel_configs?',
    options: [
      'Son equivalentes y pueden usarse indistintamente',
      'relabel_configs solo aplica a Alertmanager',
      'relabel_configs actúa sobre los targets antes del scrape; metric_relabel_configs actúa sobre cada muestra después del scrape',
      'metric_relabel_configs solo funciona con exporters oficiales',
    ],
    correct: 2,
  },
  {
    q: '¿Cuándo tiene sentido crear una recording rule?',
    options: [
      'Para toda consulta ad-hoc de debugging de un solo uso',
      'Únicamente para métricas de baja cardinalidad',
      'Solo cuando se usa Grafana como visualizador',
      'Cuando una consulta costosa se usa en múltiples dashboards o alertas',
    ],
    correct: 3,
  },
  {
    q: '¿Qué mecanismo permite extender la retención de Prometheus más allá del almacenamiento local, típicamente hacia Thanos o Cortex?',
    options: ['--storage.tsdb.retention.time', 'federation exclusiva vía HTTP', 'pushgateway', 'remote_write'],
    correct: 3,
  },
  {
    q: '¿Qué comando valida la sintaxis de un archivo de recording rules antes de recargar Prometheus?',
    options: ['promtool check rules', 'promtool check config', 'curl -X POST /-/validate', 'prometheus --dry-run'],
    correct: 0,
  },

  // Módulo 7 — Monitoreo de aplicaciones: métricas custom y client libraries
  {
    q: '¿Qué tipo de métrica de Prometheus calcula los cuantiles en el propio cliente, en lugar de en el servidor?',
    options: ['Summary', 'Histogram', 'Gauge', 'Counter'],
    correct: 0,
  },
  {
    q: 'Según las convenciones de nomenclatura, ¿con qué sufijo deben terminar los nombres de los counters?',
    options: ['_count', '_total', '_sum', '_counter'],
    correct: 1,
  },
  {
    q: '¿Qué librería oficial se usa para instrumentar una aplicación Python con métricas de Prometheus?',
    options: ['prom-client', 'py-metrics', 'prometheus_client', 'flask-prometheus'],
    correct: 2,
  },
  {
    q: '¿Por qué se recomienda usar Histogram en lugar de Summary en sistemas distribuidos?',
    options: [
      'Porque Histogram no requiere configurar buckets',
      'Porque Summary no soporta labels',
      'Porque Histogram consume menos memoria que un Counter',
      'Porque los buckets de Histogram se pueden agregar entre múltiples instancias, a diferencia de los cuantiles de Summary',
    ],
    correct: 3,
  },
  {
    q: '¿Qué método de un Gauge se usa para establecer directamente un valor?',
    options: ['observe()', 'set()', 'inc() únicamente', 'time()'],
    correct: 1,
  },
  {
    q: 'Con 500,000 usuarios activos, ¿cuál es la solución correcta para analizar comportamiento por usuario sin dañar Prometheus?',
    options: [
      'Aumentar la retención de Prometheus a 1 año',
      'Usar Summary en lugar de Histogram para esa métrica',
      'Enviar esos datos a un sistema analítico externo (como ClickHouse o BigQuery) y no usar user_id como label',
      'Reducir el scrape_interval a 5 segundos',
    ],
    correct: 2,
  },
  {
    q: '¿Qué patrón de nombre sigue una métrica según la convención namespace_subsystem_name_unit?',
    options: [
      'http_request_counter_myapp',
      'duration_seconds_myapp_http',
      'myapp-http-request-duration',
      'myapp_http_request_duration_seconds',
    ],
    correct: 3,
  },

  // Módulo 8 — Proyecto real: stack de monitoreo completo Prometheus/Grafana
  {
    q: 'En el laboratorio final, ¿qué estados atraviesa una alerta antes de notificar, en orden?',
    options: [
      'Inactive → Pending → Firing',
      'Pending → Inactive → Firing',
      'Firing → Pending → Resolved',
      'Inactive → Firing → Pending',
    ],
    correct: 0,
  },
  {
    q: '¿Qué comando se usa para generar carga de CPU y probar la alerta HighCPUUsage?',
    options: [
      'top --batch --cpu 100',
      'stress --cpu 4 --timeout 120',
      'systemctl start cpu-load',
      'promtool test rules cpu.yml',
    ],
    correct: 1,
  },
  {
    q: 'Si el dashboard de Grafana muestra "No data", ¿cuál es una de las primeras verificaciones recomendadas?',
    options: [
      'Reinstalar Grafana desde cero',
      'Confirmar que el datasource de Prometheus responde "Data source is working" en el test de conexión',
      'Aumentar la retención de Prometheus',
      'Cambiar el puerto de Grafana a 8080',
    ],
    correct: 1,
  },
  {
    q: '¿En qué sección del archivo prometheus.yml se especifica la dirección de Alertmanager?',
    options: ['scrape_configs', 'rule_files', 'global.alertmanager_url', 'alerting.alertmanagers'],
    correct: 3,
  },
  {
    q: '¿Qué verifica exactamente promtool check rules antes de recargar Prometheus?',
    options: [
      'La sintaxis y validez de los archivos de reglas de alerta o recording rules',
      'La conectividad de red hacia los targets',
      'La versión instalada de Prometheus',
      'El uso de memoria actual del proceso',
    ],
    correct: 0,
  },
  {
    q: '¿Por qué la alerta InstanceDown se define con up == 0 en lugar de up != 1?',
    options: [
      'up != 1 no es una expresión válida en PromQL',
      'Es semánticamente más explícito, aunque en la práctica up solo toma valores 0 o 1',
      'up == 0 se evalúa con menor frecuencia',
      'up != 1 requiere una recording rule adicional',
    ],
    correct: 1,
  },
]

export default exam
