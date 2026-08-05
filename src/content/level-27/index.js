export const meta = {
  id: 27,
  title: 'Ansible: Automatización de Infraestructura',
  stage: 5,
  description: 'Arquitectura de Ansible e inventario, playbooks y módulos esenciales, variables, facts y plantillas Jinja2, roles y estructura de proyecto, handlers, Ansible Vault para secretos, y un laboratorio de despliegue de stack completo de aplicación.',
  prerequisite: 'Nivel 26 — Análisis de Vulnerabilidades y Gestión de Parches',
  next: 'Nivel 28 — Docker: Contenedores en Linux',
}

export const modules = [
  { id: 1, title: 'Arquitectura Ansible: agentless, SSH e inventario' },
  { id: 2, title: 'Playbooks: tasks, módulos y ejecución' },
  { id: 3, title: 'Variables, facts y condicionales' },
  { id: 4, title: 'Loops, filtros y módulos avanzados' },
  { id: 5, title: 'Roles: estructura, dependencias y reutilización' },
  { id: 6, title: 'Plantillas Jinja2: configuración dinámica' },
  { id: 7, title: 'Handlers, Ansible Vault y buenas prácticas' },
  { id: 8, title: 'Laboratorio: despliegue de stack LEMP con Ansible' },
]
