export const meta = {
  id: 24,
  title: 'SELinux y AppArmor: Control de Acceso Obligatorio',
  stage: 4,
  description: 'Modelo MAC vs DAC, contextos y políticas SELinux, modos enforcing/permissive/disabled, herramientas semanage/chcon/restorecon, diagnóstico con audit2why y audit2allow, perfiles AppArmor con aa-genprof y aa-logprof, confinamiento de servicios en producción.',
  prerequisite: 'Nivel 23 — Auditoría de Seguridad con auditd',
  next: 'Nivel 25 — Detección de Intrusiones y Respuesta a Incidentes',
}

export const modules = [
  { id: 1, title: 'MAC vs DAC: modelo de seguridad mandatorio vs discrecional' },
  { id: 2, title: 'SELinux: modos, contextos y política targeted' },
  { id: 3, title: 'Gestión de contextos SELinux: chcon, restorecon y semanage' },
  { id: 4, title: 'Diagnóstico SELinux: audit2why, audit2allow y resolución de denials' },
  { id: 5, title: 'AppArmor: perfiles, modos y herramientas' },
  { id: 6, title: 'aa-genprof y aa-logprof: creación de perfiles AppArmor' },
  { id: 7, title: 'Confinamiento de servicios en producción: nginx, sshd, contenedores' },
  { id: 8, title: 'Proyecto real: implementar MAC completo en un servidor de producción' },
]
