export const meta = {
  id: 8,
  title: 'Almacenamiento Avanzado: UUID, VFS y Diagnóstico Profesional',
  stage: 1,
  description: 'Arquitectura interna de sistemas de archivos, montaje con UUID/LABEL, persistencia con fstab, VFS y diagnóstico completo de espacio e inodos.',
  prerequisite: 'Nivel 7 — Almacenamiento, Particionamiento y Sistemas de Archivos',
  next: 'Nivel 9 — Redes y Firewall',
}

export const modules = [
  { id: 1, title: 'Anatomía del almacenamiento: de disco a aplicación' },
  { id: 2, title: 'Particionado GPT profesional con fdisk y gdisk' },
  { id: 3, title: 'Estructura interna de los sistemas de archivos' },
  { id: 4, title: 'Comparativa ext4, xfs y btrfs: cuándo usar cada uno' },
  { id: 5, title: 'Formateo y etiquetado de particiones' },
  { id: 6, title: 'Montaje temporal y el VFS' },
  { id: 7, title: 'UUID, LABEL y persistencia con /etc/fstab' },
  { id: 8, title: 'Proyecto real: postmortem de un servidor al borde del colapso por espacio' },
]
