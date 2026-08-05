export const meta = {
  id: 35,
  title: 'Monitoreo con Prometheus y Grafana',
  stage: 6,
  description: 'Arquitectura pull-based de Prometheus, exporters para sistema y servicios, PromQL para consultas avanzadas, Alertmanager con notificaciones, dashboards en Grafana y métricas custom en aplicaciones.',
  prerequisite: 'Nivel 34 — Redis y Caché en Producción',
  next: 'Nivel 36 — Backup y Recuperación de Desastres',
}

export const modules = [
  { id: 1, title: 'Arquitectura Prometheus: pull model, TSDB y componentes' },
  { id: 2, title: 'Exporters: node_exporter, nginx, postgres, redis' },
  { id: 3, title: 'PromQL: consultas básicas y avanzadas' },
  { id: 4, title: 'Alerting: alertmanager, reglas y notificaciones' },
  { id: 5, title: 'Grafana: dashboards, datasources y paneles' },
  { id: 6, title: 'Recording rules y optimización de Prometheus' },
  { id: 7, title: 'Monitoreo de aplicaciones: métricas custom y client libraries' },
  { id: 8, title: 'Laboratorio: stack de monitoreo completo Prometheus/Grafana' },
]
