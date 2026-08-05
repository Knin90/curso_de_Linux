export const meta = {
  id: 32,
  title: 'Alta Disponibilidad y Balanceo de Carga',
  stage: 6,
  description: 'SLA, RTO y RPO como métricas de diseño, HAProxy para balanceo de carga, keepalived y VRRP para failover de IP virtual, sesiones distribuidas, monitoreo de clusters HA y procedimientos de disaster recovery.',
  prerequisite: 'Nivel 31 — Infraestructura como Código con Terraform',
  next: 'Nivel 33 — PostgreSQL en Producción',
}

export const modules = [
  { id: 1, title: 'Conceptos de HA: SLA, RTO, RPO y Single Points of Failure' },
  { id: 2, title: 'HAProxy: arquitectura y configuración básica' },
  { id: 3, title: 'HAProxy: algoritmos de balanceo y health checks' },
  { id: 4, title: 'keepalived y VRRP: failover de IP virtual' },
  { id: 5, title: 'Sesiones distribuidas y sticky sessions' },
  { id: 6, title: 'Monitoreo de un cluster HA: métricas y alertas' },
  { id: 7, title: 'Disaster recovery: procedimientos y testing' },
  { id: 8, title: 'Laboratorio: cluster HA completo con HAProxy y keepalived' },
]
