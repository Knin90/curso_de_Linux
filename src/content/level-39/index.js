export const meta = {
  id: 39,
  title: 'Evaluación Profesional',
  stage: 7,
  description: 'Cierre integral del curso: batería de evaluaciones divididas en fundamentos, administración, troubleshooting y automatización, con escenarios prácticos reales, rúbricas de aprobación y un examen final integrador que certifica el criterio de egreso.',
  prerequisite: 'Nivel 38 — Proyecto de Administración Integrador',
  next: null,
}

export const modules = [
  { id: 1, title: 'Evaluación de fundamentos I: filesystem, shell, procesos, usuarios y permisos' },
  { id: 2, title: 'Evaluación de fundamentos II: redes y almacenamiento' },
  { id: 3, title: 'Evaluación de administración I: systemd, SSH y gestión de paquetes' },
  { id: 4, title: 'Evaluación de administración II: logs, LVM/RAID, firewall y SELinux/AppArmor' },
  { id: 5, title: 'Evaluación de troubleshooting I: fallos de servicio y de red' },
  { id: 6, title: 'Evaluación de troubleshooting II: arranque, disco lleno y rendimiento' },
  { id: 7, title: 'Evaluación de automatización: Bash, cron y systemd timers' },
  { id: 8, title: 'Examen final integrador y criterio de certificación' },
]
