export const stages = [
  { id: 1, title: 'Fundamentos', color: 'green' },
  { id: 2, title: 'Administración del Sistema', color: 'cyan' },
  { id: 3, title: 'Redes', color: 'yellow' },
  { id: 4, title: 'Seguridad', color: 'red' },
  { id: 5, title: 'Automatización', color: 'green' },
  { id: 6, title: 'Infraestructura', color: 'cyan' },
  { id: 7, title: 'Proyecto Final', color: 'yellow' },
]

export const levels = [
  // Etapa 1 — Fundamentos
  { id: 0, stage: 1, title: 'Introducción al mundo Linux', status: 'available', moduleCount: 4 },
  { id: 1, stage: 1, title: 'Instalación', status: 'available', moduleCount: 8 },
  { id: 2, stage: 1, title: 'Arranque del sistema (Boot Process)', status: 'available', moduleCount: 8 },
  { id: 3, stage: 1, title: 'Terminal (+ multiplexores)', status: 'available', moduleCount: 8 },
  { id: 4, stage: 1, title: 'Usuarios, Permisos y ACLs', status: 'available', moduleCount: 8 },
  { id: 5, stage: 1, title: 'Gestión de Paquetes y Repositorios', status: 'available', moduleCount: 8 },
  { id: 6, stage: 1, title: 'Systemd y Gestión de Servicios', status: 'available', moduleCount: 8 },
  { id: 7, stage: 1, title: 'Almacenamiento, Particionamiento y Sistemas de Archivos', status: 'available', moduleCount: 8 },
  { id: 8, stage: 1, title: 'Almacenamiento Avanzado: UUID, VFS y Diagnóstico Profesional', status: 'available', moduleCount: 8 },
  { id: 9, stage: 1, title: 'SSH Avanzado: Criptografía Asimétrica y Acceso Remoto Profesional', status: 'available', moduleCount: 8 },
  { id: 10, stage: 1, title: 'Firewall en Linux: iptables, nftables y ufw', status: 'available', moduleCount: 8 },
  // Etapa 2 — Administración del Sistema
  { id: 11, stage: 2, title: 'Monitoreo, Logs y Observabilidad', status: 'available', moduleCount: 8 },
  { id: 12, stage: 2, title: 'Automatización con Bash: Scripts de Producción', status: 'available', moduleCount: 8 },
  { id: 13, stage: 2, title: 'Cron, Tareas Programadas y Automatización de Sistema', status: 'available', moduleCount: 8 },
  { id: 14, stage: 2, title: 'Gestión Avanzada de Procesos', status: 'available', moduleCount: 8 },
  { id: 15, stage: 2, title: 'Gestión de Usuarios y Grupos Avanzada', status: 'available', moduleCount: 8 },
  // Etapa 3 — Redes
  { id: 16, stage: 3, title: 'Redes en Linux: Fundamentos y Diagnóstico', status: 'available', moduleCount: 8 },
  { id: 17, stage: 3, title: 'Routing y Configuración Avanzada de Red', status: 'available', moduleCount: 8 },
  { id: 18, stage: 3, title: 'DNS: Fundamentos, Configuración y Diagnóstico', status: 'available', moduleCount: 8 },
  { id: 19, stage: 3, title: 'nginx: Servidor Web Avanzado', status: 'available', moduleCount: 8 },
  { id: 20, stage: 3, title: 'nginx: Proxy Inverso y Load Balancing', status: 'available', moduleCount: 8 },
  // Etapa 4 — Seguridad
  { id: 21, stage: 4, title: 'Hardening de Sistema Linux', status: 'available', moduleCount: 8 },
  { id: 22, stage: 4, title: 'Gestión de Certificados SSL/TLS', status: 'available', moduleCount: 8 },
  { id: 23, stage: 4, title: 'Auditoría de Seguridad con auditd', status: 'available', moduleCount: 8 },
  { id: 24, stage: 4, title: 'SELinux y AppArmor: Control de Acceso Obligatorio', status: 'available', moduleCount: 8 },
  { id: 25, stage: 4, title: 'Detección de Intrusiones y Respuesta a Incidentes', status: 'available', moduleCount: 8 },
  { id: 26, stage: 4, title: 'Análisis de Vulnerabilidades y Gestión de Parches', status: 'available', moduleCount: 8 },
  // Etapa 5 — Automatización
  { id: 27, stage: 5, title: 'Ansible: Automatización de Infraestructura', status: 'available', moduleCount: 8 },
  { id: 28, stage: 5, title: 'Docker: Contenedores en Linux', status: 'available', moduleCount: 8 },
  { id: 29, stage: 5, title: 'Docker Compose: Aplicaciones Multi-Contenedor', status: 'available', moduleCount: 8 },
  // Etapa 6 — Infraestructura
  { id: 30, stage: 6, title: 'Git Avanzado y CI/CD en Linux', status: 'available', moduleCount: 8 },
  { id: 31, stage: 6, title: 'Infraestructura como Código con Terraform', status: 'available', moduleCount: 8 },
  { id: 32, stage: 6, title: 'Alta Disponibilidad y Balanceo de Carga', status: 'available', moduleCount: 8 },
  { id: 33, stage: 6, title: 'PostgreSQL en Producción', status: 'available', moduleCount: 8 },
  { id: 34, stage: 6, title: 'Redis y Caché en Producción', status: 'available', moduleCount: 8 },
  { id: 35, stage: 6, title: 'Monitoreo con Prometheus y Grafana', status: 'available', moduleCount: 8 },
  { id: 36, stage: 6, title: 'Backup y Recuperación de Desastres', status: 'available', moduleCount: 8 },
  // Etapa 7 — Proyecto Final
  { id: 37, stage: 7, title: 'Troubleshooting Profesional', status: 'available', moduleCount: 8 },
  { id: 38, stage: 7, title: 'Proyecto de Administración Integrador', status: 'available', moduleCount: 8 },
  { id: 39, stage: 7, title: 'Evaluación Profesional', status: 'available', moduleCount: 8 },
]

export function getLevel(id) {
  return levels.find(l => l.id === Number(id))
}
