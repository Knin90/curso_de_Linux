export const meta = {
  id: 14,
  title: 'Gestión Avanzada de Procesos',
  stage: 2,
  description: 'Señales y comunicación entre procesos, prioridades con nice/renice, anatomía interna de un proceso en /proc, ulimits, cgroups v2, gestión del ciclo de vida de procesos y diagnóstico avanzado con pmap, pidstat y perf.',
  prerequisite: 'Nivel 13 — Cron, Tareas Programadas y Automatización de Sistema',
  next: 'Nivel 15 — Gestión de Usuarios y Grupos Avanzada',
}

export const modules = [
  { id: 1, title: 'Señales en Linux: kill, signals y comunicación entre procesos' },
  { id: 2, title: 'Prioridades: nice, renice y el scheduler de Linux' },
  { id: 3, title: 'Anatomía de un proceso: /proc/PID y estructura interna' },
  { id: 4, title: 'ulimits: límites de recursos por proceso y usuario' },
  { id: 5, title: 'cgroups v2: control de recursos del sistema' },
  { id: 6, title: 'Procesos zombie, huérfanos y gestión del ciclo de vida' },
  { id: 7, title: 'Diagnóstico de procesos: pmap, pidstat y perf básico' },
  { id: 8, title: 'Proyecto real: incidente de procesos en un servidor de producción' },
]
