export const meta = {
  id: 19,
  title: 'nginx: Servidor Web Avanzado',
  stage: 3,
  description: 'Arquitectura de nginx: master/worker y event loop, virtual hosts y server blocks, configuración avanzada de location blocks, archivos estáticos, SSL/TLS, compresión gzip, rate limiting, logs de acceso y error, y hardening de nginx para producción.',
  prerequisite: 'Nivel 18 — DNS: Fundamentos, Configuración y Diagnóstico',
  next: 'Nivel 20 — nginx: Proxy Inverso y Load Balancing',
}

export const modules = [
  { id: 1, title: 'Arquitectura nginx: master/worker, event loop y configuración base' },
  { id: 2, title: 'Server blocks y virtual hosting: múltiples sitios en un servidor' },
  { id: 3, title: 'Location blocks: regex, prioridad y configuración avanzada' },
  { id: 4, title: 'Archivos estáticos: root, alias, autoindex y optimización' },
  { id: 5, title: 'SSL/TLS en nginx: certificados, HTTPS y configuración segura' },
  { id: 6, title: 'Compresión, caché de cliente y optimización de rendimiento' },
  { id: 7, title: 'Rate limiting, limit_conn y protección contra abuso' },
  { id: 8, title: 'Proyecto real: servidor web nginx de producción completo' },
]
