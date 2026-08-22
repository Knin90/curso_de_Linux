export const meta = {
  id: 16,
  title: 'Redes en Linux: Fundamentos y Diagnóstico',
  stage: 3,
  description: 'Stack de red de Linux y modelo OSI en la práctica, gestión de interfaces con ip, herramientas de diagnóstico (ss, tcpdump, ping, traceroute, mtr), internals de TCP/IP, /proc/net, análisis de tráfico, metodología de troubleshooting de red y laboratorio de diagnóstico.',
  prerequisite: 'Nivel 15 — Gestión de Usuarios y Grupos Avanzada',
  next: 'Nivel 17 — Routing y Configuración Avanzada de Red',
}

export const modules = [
  { id: 1, title: 'Stack de red de Linux: del kernel al socket' },
  { id: 2, title: 'ip: gestión de interfaces, direcciones y enlaces' },
  { id: 3, title: 'ss y netstat: estado de conexiones y sockets' },
  { id: 4, title: 'ping, traceroute y mtr: diagnóstico de conectividad' },
  { id: 5, title: 'tcpdump: captura y análisis de tráfico de red' },
  { id: 6, title: '/proc/net e internals del stack TCP/IP' },
  { id: 7, title: 'Metodología de troubleshooting de red en producción' },
  { id: 8, title: 'Proyecto real: diagnóstico completo de problemas de red en producción' },
]
