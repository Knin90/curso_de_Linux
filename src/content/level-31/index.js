export const meta = {
  id: 31,
  title: 'Infraestructura como Código con Terraform',
  stage: 6,
  description: 'Conceptos de IaC declarativo, sintaxis HCL y bloques de Terraform, providers y recursos, variables, outputs y locals, ciclo de vida plan/apply/destroy, módulos para reutilización, estado remoto con backends S3, y despliegue de infraestructura real en la nube.',
  prerequisite: 'Nivel 30 — Git Avanzado y CI/CD en Linux',
  next: 'Nivel 32 — Alta Disponibilidad y Balanceo de Carga',
}

export const modules = [
  { id: 1, title: 'IaC declarativo: conceptos y ventajas sobre scripting imperativo' },
  { id: 2, title: 'HCL: sintaxis, bloques, tipos de datos y expresiones' },
  { id: 3, title: 'Providers y resources: AWS, DigitalOcean y local' },
  { id: 4, title: 'Variables, outputs, locals y data sources' },
  { id: 5, title: 'Ciclo de vida: terraform init, plan, apply, destroy y state' },
  { id: 6, title: 'Módulos: estructura, reutilización y registro público' },
  { id: 7, title: 'Estado remoto: backends S3, locking y workspaces' },
  { id: 8, title: 'Laboratorio: desplegar servidor web completo con Terraform' },
]
