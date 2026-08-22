export const meta = {
  id: 29,
  title: 'Docker Compose: Aplicaciones Multi-Contenedor',
  stage: 5,
  description: 'Estructura y sintaxis de docker-compose.yml, gestión de services, networks y volumes, variables de entorno, ciclo de vida completo, override files para dev/prod, health checks y troubleshooting de aplicaciones multi-contenedor.',
  prerequisite: 'Nivel 28 — Docker: Contenedores en Linux',
  next: 'Nivel 30 — Git Avanzado y CI/CD en Linux',
}

export const modules = [
  { id: 1, title: 'docker-compose.yml: estructura, versiones y sintaxis' },
  { id: 2, title: 'Services, networks y volumes en Compose' },
  { id: 3, title: 'Variables de entorno y archivos .env en Compose' },
  { id: 4, title: 'Gestión del ciclo de vida: up, down, scale, restart' },
  { id: 5, title: 'Override files: compose.override.yml para dev/prod' },
  { id: 6, title: 'Health checks y dependencias entre servicios' },
  { id: 7, title: 'Troubleshooting de aplicaciones multi-contenedor' },
  { id: 8, title: 'Proyecto real: stack completo LEMP con Docker Compose' },
]
