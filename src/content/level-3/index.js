export const meta = {
  id: 3,
  title: 'Terminal, Shell y Multiplexores (tmux / screen)',
  stage: 1,
  description: 'De TTYs a tmux: domina la arquitectura CLI, redirecciones, job control y sesiones inmortales frente a caídas de red.',
  prerequisite: 'Nivel 2 — Arranque del Sistema',
  next: 'Nivel 4 — Usuarios, Permisos y ACLs',
}

export const modules = [
  { id: 1, title: 'La arquitectura CLI: TTYs, Consolas Virtuales y PTYs' },
  { id: 2, title: 'La Shell y Redirección de Descriptores (0, 1, 2)' },
  { id: 3, title: 'Gestión de Procesos: Foreground, Background y Signal Control' },
  { id: 4, title: 'Necesidad y Arquitectura de los Multiplexores (tmux)' },
  { id: 5, title: 'Dominio de tmux: Sesiones, Ventanas y Paneles' },
  { id: 6, title: 'Configuración Profesional de tmux (.tmux.conf)' },
  { id: 7, title: 'Sesiones Colaborativas y Alternativas (screen)' },
  { id: 8, title: 'Laboratorio integrador: Entorno de Operaciones Inmune' },
]
