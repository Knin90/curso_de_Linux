export const meta = {
  id: 18,
  title: 'DNS: Fundamentos, Configuración y Diagnóstico',
  stage: 3,
  description: 'Protocolo DNS completo: jerarquía, resolución recursiva e iterativa, tipos de registros, herramientas de diagnóstico, systemd-resolved, servidores autoritativos con bind9, servidores recursivos con unbound y DNSSEC.',
  prerequisite: 'Nivel 17 — Routing y Configuración Avanzada de Red',
  next: 'Nivel 19 — nginx: Servidor Web Avanzado',
}

export const modules = [
  { id: 1, title: 'Protocolo DNS: jerarquía, resolución recursiva e iterativa' },
  { id: 2, title: 'Tipos de registros DNS: A, AAAA, CNAME, MX, TXT, SRV, PTR' },
  { id: 3, title: 'dig, nslookup y host: consultas DNS avanzadas' },
  { id: 4, title: 'systemd-resolved: caché DNS local y configuración' },
  { id: 5, title: 'Servidor DNS autoritativo con bind9' },
  { id: 6, title: 'Servidor DNS recursivo con unbound' },
  { id: 7, title: 'DNSSEC: firma y validación de zonas' },
  { id: 8, title: 'Proyecto real: diagnóstico y resolución de problemas DNS en producción' },
]
