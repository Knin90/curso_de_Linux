export const meta = {
  id: 25,
  title: 'Detección de Intrusiones y Respuesta a Incidentes',
  stage: 4,
  description: 'Threat modeling y kill chain de ataques, fail2ban para bloqueo automático, AIDE para integridad de archivos, correlación de logs para detección, playbooks de respuesta a incidentes, análisis forense básico con herramientas estándar de Linux y análisis post-incidente.',
  prerequisite: 'Nivel 24 — SELinux y AppArmor: Control de Acceso Obligatorio',
  next: 'Nivel 26 — Análisis de Vulnerabilidades y Gestión de Parches',
}

export const modules = [
  { id: 1, title: 'Threat modeling: kill chain y superficies de ataque en Linux' },
  { id: 2, title: 'fail2ban: detección y bloqueo automático de ataques' },
  { id: 3, title: 'AIDE: monitoreo de integridad de archivos del sistema' },
  { id: 4, title: 'Análisis de logs: correlación y detección de anomalías' },
  { id: 5, title: 'Indicadores de compromiso: ¿cómo saber si fui comprometido?' },
  { id: 6, title: 'Respuesta a incidentes: playbook y contención' },
  { id: 7, title: 'Análisis forense básico en Linux: evidencia sin destruirla' },
  { id: 8, title: 'Proyecto real: detectar y responder a un ataque simulado' },
]
