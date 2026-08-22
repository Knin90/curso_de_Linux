export const meta = {
  id: 21,
  title: 'Hardening de Sistema Linux',
  stage: 4,
  description: 'Principios de defensa en profundidad, hardening del kernel con sysctl, eliminación de servicios innecesarios, permisos SUID/SGID, SSH hardening de producción, PAM, evaluación CIS Benchmark y remediación automatizada.',
  prerequisite: 'Nivel 20 — nginx: Proxy Inverso y Load Balancing',
  next: 'Nivel 22 — Gestión de Certificados SSL/TLS',
}

export const modules = [
  { id: 1, title: 'Principios de hardening: superficie de ataque y defensa en profundidad' },
  { id: 2, title: 'Hardening del kernel: sysctl y parámetros de seguridad de red' },
  { id: 3, title: 'Servicios y puertos: eliminar lo innecesario' },
  { id: 4, title: 'Permisos de archivos: SUID, SGID, sticky bit y auditoría' },
  { id: 5, title: 'SSH hardening: configuración segura de producción' },
  { id: 6, title: 'PAM y políticas de autenticación robustas' },
  { id: 7, title: 'CIS Benchmark: evaluación y remediación automatizada' },
  { id: 8, title: 'Proyecto real: hardening completo de un servidor' },
]
