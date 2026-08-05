export const meta = {
  id: 11,
  title: 'Monitoreo, Logs y Observabilidad',
  stage: 2,
  description: 'Arquitectura de logging en Linux, journald, rsyslog, herramientas de monitoreo de recursos, /proc y /sys, alertas automáticas y observabilidad con strace, lsof y ss.',
  prerequisite: 'Nivel 10 — Firewall en Linux: iptables, nftables y ufw',
  next: 'Nivel 12 — Automatización con Bash: Scripts de Producción',
}

export const modules = [
  { id: 1, title: 'Arquitectura de logs: syslog, journald y rsyslog' },
  { id: 2, title: 'journalctl: consultas avanzadas y filtrado' },
  { id: 3, title: 'rsyslog: configuración, filtros y reenvío remoto' },
  { id: 4, title: 'Monitoreo de recursos: top, htop, vmstat e iostat' },
  { id: 5, title: 'El sistema de archivos /proc y /sys' },
  { id: 6, title: 'Alertas automáticas: logwatch y fail2ban' },
  { id: 7, title: 'Observabilidad avanzada: strace, lsof y ss' },
  { id: 8, title: 'Laboratorio integrado: sistema de monitoreo end-to-end' },
]
