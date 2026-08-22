export const meta = {
  id: 37,
  title: 'Troubleshooting Profesional',
  stage: 7,
  description: 'Metodología estructurada para diagnosticar y resolver incidentes en sistemas Linux de producción: de síntoma a causa raíz, cuellos de botella de CPU/memoria/disco, fallos de servicios, red, DNS y arranque, cerrando con un laboratorio integrador de incidente multicausa.',
  prerequisite: 'Nivel 36 — Backup y Recuperación de Desastres',
  next: 'Nivel 38 — Proyecto de Administración Integrador',
}

export const modules = [
  { id: 1, title: 'Metodología de troubleshooting: de síntoma a causa raíz' },
  { id: 2, title: 'Sistema no responde o carga alta: diagnóstico paso a paso' },
  { id: 3, title: 'Uso de CPU y memoria: identificar y resolver cuellos de botella' },
  { id: 4, title: 'Disco lleno e inodos agotados: diagnóstico y remediación' },
  { id: 5, title: 'Fallos de servicio: leer journalctl y systemctl status como profesional' },
  { id: 6, title: 'Fallos de red y DNS: aislar la capa que falla' },
  { id: 7, title: 'Fallos de arranque: rescate desde GRUB e initramfs' },
  { id: 8, title: 'Caso real: incidente multicausa en producción' },
]
