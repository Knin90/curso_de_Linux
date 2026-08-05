export const meta = {
  id: 2,
  title: 'Arranque del Sistema (Boot Process)',
  stage: 1,
  description: 'Del POST al login: domina las 5 etapas del arranque, GRUB2, initramfs, systemd y recuperación de sistemas.',
  prerequisite: 'Nivel 1 — Instalación',
  next: 'Nivel 3 — Terminal y Multiplexores',
}

export const modules = [
  { id: 1, title: 'La cadena de arranque global: del POST al PID 1' },
  { id: 2, title: 'Gestor de arranque GRUB2' },
  { id: 3, title: 'Disco RAM inicial: initramfs / initrd' },
  { id: 4, title: 'Transición al Kernel y ejecución de systemd (PID 1)' },
  { id: 5, title: 'Targets de systemd y niveles de ejecución (Runlevels)' },
  { id: 6, title: 'Análisis de tiempos y dependencias de arranque' },
  { id: 7, title: 'Modos de recuperación, rescate y bypass de autenticación' },
  { id: 8, title: 'Laboratorio integrador: Diagnóstico y reparación' },
]
