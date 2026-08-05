export const meta = {
  id: 6,
  title: 'Systemd y Gestión de Servicios',
  stage: 1,
  description: 'Del PID 1 al journalctl: arquitectura de systemd, ciclo de vida de servicios, persistencia en arranque, targets, archivos .service y auditoría de logs.',
  prerequisite: 'Nivel 5 — Gestión de Paquetes y Repositorios',
  next: 'Nivel 7 — Redes y Firewall',
}

export const modules = [
  { id: 1, title: 'Arquitectura de systemd: el PID 1 y su rol' },
  { id: 2, title: 'systemctl: ciclo de vida de servicios' },
  { id: 3, title: 'Enable vs Start: persistencia en el arranque' },
  { id: 4, title: 'Anatomía de un archivo .service' },
  { id: 5, title: 'Targets: equivalente moderno a runlevels' },
  { id: 6, title: 'journalctl: logs y auditoría centralizada' },
  { id: 7, title: 'Diagnóstico y troubleshooting de servicios' },
  { id: 8, title: 'Laboratorio integrador: despliegue profesional de un servicio' },
]
