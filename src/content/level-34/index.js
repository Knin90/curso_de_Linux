export const meta = {
  id: 34,
  title: 'Redis y Caché en Producción',
  stage: 6,
  description: 'Arquitectura Redis single-threaded y estructuras de datos, persistencia RDB vs AOF y sus trade-offs, patrones de caché (cache-aside, write-through, write-behind), Redis Sentinel para alta disponibilidad, Redis Cluster para sharding horizontal, políticas de evicción y gestión de memoria.',
  prerequisite: 'Nivel 33 — PostgreSQL en Producción',
  next: 'Nivel 35 — Monitoreo con Prometheus y Grafana',
}

export const modules = [
  { id: 1, title: 'Arquitectura Redis: single-thread, event loop y estructuras de datos' },
  { id: 2, title: 'Persistencia: RDB, AOF y trade-offs de cada modo' },
  { id: 3, title: 'Patrones de caché: cache-aside, write-through y write-behind' },
  { id: 4, title: 'Políticas de evicción y gestión de memoria' },
  { id: 5, title: 'Pub/Sub, streams y casos de uso avanzados' },
  { id: 6, title: 'Redis Sentinel: alta disponibilidad y failover automático' },
  { id: 7, title: 'Redis Cluster: sharding horizontal y distribución de datos' },
  { id: 8, title: 'Laboratorio: Redis como capa de caché para aplicación web' },
]
