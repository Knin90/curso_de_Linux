export const meta = {
  id: 22,
  title: 'Gestión de Certificados SSL/TLS',
  stage: 4,
  description: 'Infraestructura de clave pública y cadena de confianza, openssl para generar e inspeccionar certificados, Let\'s Encrypt con certbot, renovación automática, mTLS, diagnóstico de problemas SSL/TLS y CA propia con openssl.',
  prerequisite: 'Nivel 21 — Hardening de Sistema Linux',
  next: 'Nivel 23 — Auditoría de Seguridad con auditd',
}

export const modules = [
  { id: 1, title: 'PKI: infraestructura de clave pública y cadena de confianza' },
  { id: 2, title: 'openssl: generar, inspeccionar y verificar certificados' },
  { id: 3, title: "Let's Encrypt y certbot: certificados gratuitos automáticos" },
  { id: 4, title: 'Renovación automática y gestión del ciclo de vida' },
  { id: 5, title: 'Mutual TLS (mTLS): autenticación de cliente' },
  { id: 6, title: 'Diagnóstico de problemas SSL/TLS' },
  { id: 7, title: 'Certificados internos: CA propia con openssl' },
  { id: 8, title: 'Proyecto real: gestión completa de PKI' },
]
