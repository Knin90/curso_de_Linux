export const meta = {
  id: 15,
  title: 'Gestión de Usuarios y Grupos Avanzada',
  stage: 2,
  description: 'Sudoers avanzado con aliases y sudoreplay, PAM en profundidad, nsswitch.conf e internals de /etc/shadow, cuotas de disco, políticas de contraseñas con chage, autenticación centralizada con SSSD y LDAP/Active Directory, y un laboratorio de gestión empresarial de usuarios.',
  prerequisite: 'Nivel 14 — Gestión Avanzada de Procesos',
  next: 'Nivel 16 — Redes en Linux: Fundamentos y Diagnóstico',
}

export const modules = [
  { id: 1, title: 'sudoers avanzado: aliases, NOPASSWD, restricciones y sudoreplay' },
  { id: 2, title: 'PAM: autenticación modular y stack de módulos' },
  { id: 3, title: '/etc/shadow, /etc/group y NSS: internals del sistema de usuarios' },
  { id: 4, title: 'chage y políticas de contraseñas: caducidad y envejecimiento' },
  { id: 5, title: 'Cuotas de disco: edquota, quota, repquota y gestión de almacenamiento' },
  { id: 6, title: 'ACLs avanzadas: setfacl, getfacl y casos de uso en producción' },
  { id: 7, title: 'SSSD y autenticación centralizada: LDAP y Active Directory' },
  { id: 8, title: 'Proyecto real: onboarding de usuarios para TechCorp' },
]
