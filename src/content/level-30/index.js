export const meta = {
  id: 30,
  title: 'Git Avanzado y CI/CD en Linux',
  stage: 6,
  description: 'Internals de Git: objetos, refs y pack files, operaciones avanzadas (rebase, cherry-pick, bisect, stash), git hooks para automatización local, fundamentos de CI/CD con GitHub Actions y GitLab CI, pipelines de deploy para servidores Linux, versionado semántico y gestión de releases.',
  prerequisite: 'Nivel 29 — Docker Compose: Aplicaciones Multi-Contenedor',
  next: 'Nivel 31 — Infraestructura como Código con Terraform',
}

export const modules = [
  { id: 1, title: 'Internals de Git: objetos, refs, index y pack files' },
  { id: 2, title: 'Operaciones avanzadas: rebase, cherry-pick, bisect y reflog' },
  { id: 3, title: 'Git hooks: automatización en el cliente y servidor' },
  { id: 4, title: 'Estrategias de branching: GitFlow, trunk-based y GitHub Flow' },
  { id: 5, title: 'CI/CD fundamentos: pipelines, stages y artifacts' },
  { id: 6, title: 'GitHub Actions: workflows para deploy en Linux' },
  { id: 7, title: 'Versionado semántico, tags y gestión de releases' },
  { id: 8, title: 'Laboratorio: pipeline CI/CD completo para servidor Linux' },
]
