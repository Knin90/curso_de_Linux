export const meta = {
  id: 26,
  title: 'Análisis de Vulnerabilidades y Gestión de Parches',
  stage: 4,
  description: 'CVE y el ecosistema de vulnerabilidades, gestión de parches con apt/dnf, escaneo con OpenVAS y Nessus, auditoría con Lynis, automatización de parches, métricas CVSS y un programa completo de gestión de vulnerabilidades.',
  prerequisite: 'Nivel 25 — Detección de Intrusiones y Respuesta a Incidentes',
  next: 'Nivel 27 — Ansible: Automatización de Infraestructura',
}

export const modules = [
  { id: 1, title: 'CVE, NVD y el ecosistema de vulnerabilidades' },
  { id: 2, title: 'Gestión de parches en Linux: apt/dnf security updates' },
  { id: 3, title: 'OpenVAS y Nessus: escaneo de vulnerabilidades' },
  { id: 4, title: 'Lynis: auditoría de seguridad automatizada del sistema' },
  { id: 5, title: 'Gestión de vulnerabilidades en producción: priorización y remediación' },
  { id: 6, title: 'Automatización de parches con unattended-upgrades' },
  { id: 7, title: 'Métricas de seguridad: CVSS, tiempo de remediación, SLA' },
  { id: 8, title: 'Proyecto real: programa completo de gestión de vulnerabilidades' },
]
