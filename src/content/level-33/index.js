export const meta = {
  id: 33,
  title: 'PostgreSQL en Producción',
  stage: 6,
  description: 'Arquitectura de PostgreSQL: procesos, WAL y MVCC, instalación y configuración de postgresql.conf y pg_hba.conf, psql y objetos de base de datos, indexación avanzada (B-tree, GIN, GiST, parciales), optimización de consultas con EXPLAIN ANALYZE, replicación streaming, backup con pg_dump y PITR.',
  prerequisite: 'Nivel 32 — Alta Disponibilidad y Balanceo de Carga',
  next: 'Nivel 34 — Redis y Caché en Producción',
}

export const modules = [
  { id: 1, title: 'Arquitectura PostgreSQL: procesos, WAL, MVCC y shared buffers' },
  { id: 2, title: 'Instalación y configuración: postgresql.conf y pg_hba.conf' },
  { id: 3, title: 'psql, roles, bases de datos y esquemas' },
  { id: 4, title: 'Indexación: B-tree, GIN, GiST, BRIN e índices parciales' },
  { id: 5, title: 'EXPLAIN ANALYZE: optimización de consultas en producción' },
  { id: 6, title: 'Replicación streaming: primario y réplicas de lectura' },
  { id: 7, title: 'Backup y recuperación: pg_dump, pg_basebackup y PITR' },
  { id: 8, title: 'Laboratorio: PostgreSQL de producción completo' },
]
