export const meta = {
  id: 4,
  title: 'Usuarios, Permisos y ACLs',
  stage: 1,
  description: 'Del modelo de seguridad del kernel a las ACLs: UID/GID, inodos, permisos UGO, umask, bits especiales y control de acceso granular.',
  prerequisite: 'Nivel 3 — Terminal y Multiplexores',
  next: 'Nivel 5 — Gestión de Paquetes y Repositorios',
}

export const modules = [
  { id: 1, title: 'El Modelo de Seguridad de Linux: cómo piensa el Kernel' },
  { id: 2, title: 'Identidad: Usuarios, Grupos, UID y GID' },
  { id: 3, title: 'El sistema UGO: Permisos Base (rwx)' },
  { id: 4, title: 'chmod y chown: cambiar permisos y propietarios' },
  { id: 5, title: 'umask: permisos por defecto al crear archivos' },
  { id: 6, title: 'Permisos Especiales: SUID, SGID y Sticky Bit' },
  { id: 7, title: 'Listas de Control de Acceso (ACLs)' },
  { id: 8, title: 'Laboratorio integrador: Infraestructura segura de equipos' },
]
