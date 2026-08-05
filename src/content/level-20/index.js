export const meta = {
  id: 20,
  title: 'nginx: Proxy Inverso y Load Balancing',
  stage: 3,
  description: 'Proxy inverso con proxy_pass, upstream y algoritmos de balanceo de carga, health checks, caché de proxy, WebSocket, headers de seguridad X-Forwarded-For, terminación SSL y arquitecturas completas de proxy.',
  prerequisite: 'Nivel 19 — nginx: Servidor Web Avanzado',
  next: 'Nivel 21 — Hardening de Sistema Linux',
}

export const modules = [
  { id: 1, title: 'Proxy inverso con nginx: proxy_pass y configuración básica' },
  { id: 2, title: 'Upstream y load balancing: algoritmos y configuración' },
  { id: 3, title: 'Health checks y manejo de backends caídos' },
  { id: 4, title: 'Caché de proxy: proxy_cache y configuración avanzada' },
  { id: 5, title: 'WebSocket y conexiones de larga duración' },
  { id: 6, title: 'Headers de proxy: X-Forwarded-For y seguridad' },
  { id: 7, title: 'Terminación SSL y re-cifrado backend' },
  { id: 8, title: 'Laboratorio: arquitectura proxy inverso completa' },
]
