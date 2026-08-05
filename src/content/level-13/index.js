export const meta = {
  id: 13,
  title: 'Cron, Tareas Programadas y Automatización de Sistema',
  stage: 2,
  description: 'Sintaxis crontab, variables de entorno en cron, anacron para sistemas no 24/7, systemd timers como alternativa moderna, at para tareas únicas y patrones de automatización de sistema.',
  prerequisite: 'Nivel 12 — Automatización con Bash: Scripts de Producción',
  next: 'Nivel 14 — Gestión Avanzada de Procesos',
}

export const modules = [
  { id: 1, title: 'cron: sintaxis, tipos y entorno de ejecución' },
  { id: 2, title: 'crontab: gestión de trabajos por usuario y sistema' },
  { id: 3, title: 'Variables de entorno y depuración en cron' },
  { id: 4, title: 'anacron: tareas para sistemas que no corren 24/7' },
  { id: 5, title: 'systemd timers: la alternativa moderna a cron' },
  { id: 6, title: 'at y batch: tareas únicas programadas' },
  { id: 7, title: 'Patrones de automatización: locks, logs y notificaciones' },
  { id: 8, title: 'Laboratorio integrado: sistema de automatización completo' },
]
