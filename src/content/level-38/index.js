export const meta = {
  id: 38,
  title: 'Proyecto de Administración Integrador',
  stage: 7,
  description: 'Proyecto guiado paso a paso: construir de cero un servidor de producción completo (srv-prod01), integrando usuarios, SSH, firewall, almacenamiento con LVM, systemd, nginx, seguridad (SELinux/AppArmor), observabilidad y backups. Cada módulo avanza el mismo servidor hasta dejarlo documentado y listo para operar.',
  prerequisite: 'Nivel 37 — Troubleshooting Profesional',
  next: 'Nivel 39 — Evaluación Profesional',
}

export const modules = [
  { id: 1, title: 'Definición del proyecto: requisitos de un servidor de producción real' },
  { id: 2, title: 'Provisioning base: hostname, usuarios, grupos, sudo y hardening inicial' },
  { id: 3, title: 'Red, SSH y firewall del servidor' },
  { id: 4, title: 'Almacenamiento: LVM, filesystem y mount points del proyecto' },
  { id: 5, title: 'Servicios: systemd, nginx y la aplicación desplegada' },
  { id: 6, title: 'Seguridad: SELinux/AppArmor, auditd y certificados SSL/TLS' },
  { id: 7, title: 'Observabilidad: logs, monitoreo y backups automatizados' },
  { id: 8, title: 'Entrega: checklist de aceptación, runbook y documentación final' },
]
