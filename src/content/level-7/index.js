export const meta = {
  id: 7,
  title: 'Almacenamiento, Particionamiento y Sistemas de Archivos',
  stage: 1,
  description: 'Del disco físico al punto de montaje: jerarquía de almacenamiento, particionado GPT, ext4/xfs, UUID, VFS, fstab y diagnóstico profesional de espacio.',
  prerequisite: 'Nivel 6 — Systemd y Gestión de Servicios',
  next: 'Nivel 8 — Redes y Firewall',
}

export const modules = [
  { id: 1, title: 'La jerarquía del almacenamiento en Linux' },
  { id: 2, title: 'Dispositivos de bloque: /dev, lsblk y tipos de disco' },
  { id: 3, title: 'Particionado GPT con fdisk y gdisk' },
  { id: 4, title: 'Sistemas de archivos: ext4, xfs y btrfs' },
  { id: 5, title: 'Montaje temporal y el VFS' },
  { id: 6, title: '/etc/fstab: UUID, LABEL y persistencia' },
  { id: 7, title: 'Diagnóstico de espacio: df, du, inodos y archivos fantasma' },
  { id: 8, title: 'Proyecto real: provisionar un volumen de backups en un servidor de base de datos' },
]
