export const meta = {
  id: 1,
  title: 'Instalación',
  stage: 1,
  description: 'Firmware, particionado, virtualización y tu primera instalación real de Linux.',
  prerequisite: 'Nivel 0 — Introducción al mundo Linux',
  next: 'Nivel 2 — Arranque del sistema',
}

export const modules = [
  { id: 1, title: 'Firmware: BIOS y UEFI' },
  { id: 2, title: 'Particionado de disco: MBR vs GPT' },
  { id: 3, title: 'Secure Boot' },
  { id: 4, title: 'Virtualización (VMware, VirtualBox, GNOME Boxes)' },
  { id: 5, title: 'WSL — Windows Subsystem for Linux' },
  { id: 6, title: 'Live USB' },
  { id: 7, title: 'Dual Boot' },
  { id: 8, title: 'Proyecto real: runbook de instalación para una flota de 3 servidores' },
]
