export const meta = {
  id: 9,
  title: 'SSH Avanzado: Criptografía Asimétrica y Acceso Remoto Profesional',
  stage: 1,
  description: 'Protocolo SSH, criptografía asimétrica Ed25519, gestión de llaves, ssh-agent, ~/.ssh/config, ProxyJump, hardening de sshd_config y diagnóstico profesional.',
  prerequisite: 'Nivel 8 — Almacenamiento Avanzado: UUID, VFS y Diagnóstico Profesional',
  next: 'Nivel 10 — Firewall: iptables, nftables y ufw',
}

export const modules = [
  { id: 1, title: '¿Qué es SSH y cómo funciona internamente?' },
  { id: 2, title: 'Estructura de ~/.ssh: llaves, archivos y permisos' },
  { id: 3, title: 'Generación de llaves: Ed25519, RSA y algoritmos' },
  { id: 4, title: 'Distribución de llaves y ssh-agent' },
  { id: 5, title: '~/.ssh/config: alias, perfiles y ProxyJump' },
  { id: 6, title: 'Transferencia de archivos: scp y sftp' },
  { id: 7, title: 'Hardening del servidor SSH: sshd_config' },
  { id: 8, title: 'Proyecto real: acceso SSH sin contraseñas para automatización con Ansible' },
]
