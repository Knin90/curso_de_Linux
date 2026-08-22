export const meta = {
  id: 36,
  title: 'Backup y Recuperación de Desastres',
  stage: 6,
  description: 'RPO y RTO como métricas de diseño, tipos de backup (completo/incremental/diferencial), rsync para backup local y remoto, BorgBackup para backups deduplicados y cifrados, automatización con cron y systemd timers, testing de restauración como proceso crítico, y planificación de Disaster Recovery.',
  prerequisite: 'Nivel 35 — Monitoreo con Prometheus y Grafana',
  next: 'Nivel 37 — Troubleshooting Profesional',
}

export const modules = [
  { id: 1, title: 'Estrategia de backup: RPO, RTO, tipos y regla 3-2-1' },
  { id: 2, title: 'rsync: backup local, remoto y sincronización eficiente' },
  { id: 3, title: 'tar y compresión: backups de archivos y directorios' },
  { id: 4, title: 'BorgBackup: deduplicación, cifrado e incrementales eficientes' },
  { id: 5, title: 'Automatización de backups con cron y systemd timers' },
  { id: 6, title: 'Testing de restauración: el paso crítico que todos omiten' },
  { id: 7, title: 'Disaster Recovery: planificación, runbooks y failover' },
  { id: 8, title: 'Proyecto real: sistema de backup completo con restauración verificada' },
]
