export const meta = {
  id: 5,
  title: 'Gestión de Paquetes y Repositorios',
  stage: 1,
  description: 'Del repositorio al sistema de archivos: arquitectura de paquetes, APT/DPKG, DNF/RPM, verificación GPG y mantenimiento profesional.',
  prerequisite: 'Nivel 4 — Usuarios, Permisos y ACLs',
  next: 'Nivel 6 — Procesos y Servicios',
}

export const modules = [
  { id: 1, title: '¿Cómo llega el software a tu servidor? Arquitectura general' },
  { id: 2, title: '¿Qué es realmente un paquete? Contenido y dependencias' },
  { id: 3, title: 'Repositorios y verificación GPG' },
  { id: 4, title: 'APT y DPKG: el sistema de paquetes Debian/Ubuntu' },
  { id: 5, title: 'DNF y RPM: el sistema de paquetes Fedora/RHEL' },
  { id: 6, title: 'La base de datos local de paquetes' },
  { id: 7, title: 'Actualizaciones, limpieza y mantenimiento' },
  { id: 8, title: 'Laboratorio integrador: ciclo completo de software en producción' },
]
