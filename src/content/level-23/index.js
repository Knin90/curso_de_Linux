export const meta = {
  id: 23,
  title: 'Auditoría de Seguridad con auditd',
  stage: 4,
  description: 'Arquitectura de auditd, reglas de auditoría con auditctl, búsqueda de eventos con ausearch, reportes con aureport, monitoreo de archivos críticos, auditoría de llamadas al sistema y cumplimiento normativo PCI-DSS, HIPAA y CIS.',
  prerequisite: 'Nivel 22 — Gestión de Certificados SSL/TLS',
  next: 'Nivel 24 — SELinux y AppArmor: Control de Acceso Obligatorio',
}

export const modules = [
  { id: 1, title: 'auditd: arquitectura y componentes del sistema de auditoría' },
  { id: 2, title: 'Reglas de auditoría: auditctl y /etc/audit/rules.d/' },
  { id: 3, title: 'ausearch: búsqueda y filtrado de eventos de auditoría' },
  { id: 4, title: 'aureport: reportes automáticos del sistema de auditoría' },
  { id: 5, title: 'Monitoreo de archivos críticos: /etc/passwd, /etc/sudoers, /bin/' },
  { id: 6, title: 'Auditoría de llamadas al sistema y escalada de privilegios' },
  { id: 7, title: 'Cumplimiento normativo: PCI-DSS, HIPAA y CIS con auditd' },
  { id: 8, title: 'Laboratorio: sistema de auditoría de producción completo' },
]
