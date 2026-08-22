export const meta = {
  id: 28,
  title: 'Docker: Contenedores en Linux',
  stage: 5,
  description: 'Fundamentos de contenedores: namespaces y cgroups, arquitectura Docker daemon/client/registry, imágenes y capas, Dockerfile y builds eficientes, docker run con volumes y networks, multi-stage builds, redes Docker en profundidad, y seguridad de contenedores.',
  prerequisite: 'Nivel 27 — Ansible: Automatización de Infraestructura',
  next: 'Nivel 29 — Docker Compose: Aplicaciones Multi-Contenedor',
}

export const modules = [
  { id: 1, title: 'Fundamentos: namespaces, cgroups y qué es un contenedor' },
  { id: 2, title: 'Arquitectura Docker: daemon, cliente, imágenes y registry' },
  { id: 3, title: 'Dockerfile: construir imágenes eficientes' },
  { id: 4, title: 'docker run: contenedores, volúmenes y puertos' },
  { id: 5, title: 'Redes Docker: bridge, host, overlay y custom networks' },
  { id: 6, title: 'Multi-stage builds y optimización de imágenes' },
  { id: 7, title: 'Seguridad de contenedores: capabilities, seccomp y rootless' },
  { id: 8, title: 'Proyecto real: containerizar una aplicación real' },
]
