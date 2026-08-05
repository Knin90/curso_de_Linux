const content = `
## Módulo 2 — Estructura de ~/.ssh: llaves, archivos y permisos

### 🎯 Objetivos de aprendizaje

* Conocer cada archivo del directorio ~/.ssh y su función.
* Entender la diferencia entre Host Key (del servidor) y llave de usuario (del cliente).
* Configurar permisos correctos: SSH los verifica y rechaza llaves mal protegidas.

### 📖 El directorio ~/.ssh

\`\`\`text
~/.ssh/
├── config              ← Alias y perfiles de conexión (cliente)
├── id_ed25519          ← Llave PRIVADA del usuario (nunca compartir, permisos 600)
├── id_ed25519.pub      ← Llave PÚBLICA del usuario (distribuir a servidores)
├── id_rsa              ← Llave RSA antigua (si existe)
├── id_rsa.pub          ← Llave pública RSA
├── authorized_keys     ← En el SERVIDOR: qué llaves públicas pueden entrar
├── known_hosts         ← Huellas dactilares de servidores ya verificados
└── known_hosts.old     ← Backup automático de known_hosts
\`\`\`

| Archivo | Dónde existe | Función |
| --- | --- | --- |
| \`id_ed25519\` | Cliente | Llave privada del usuario. Nunca sale de esta máquina. |
| \`id_ed25519.pub\` | Cliente | Llave pública. Se instala en \`authorized_keys\` de los servidores. |
| \`authorized_keys\` | Servidor | Lista de llaves públicas autorizadas para entrar como este usuario. |
| \`known_hosts\` | Cliente | Fingerprints de servidores conocidos. Previene ataques MITM. |
| \`config\` | Cliente | Alias, puertos, usuarios y opciones por host. |

### 📖 Host Key vs Llave de Usuario

\`\`\`text
HOST KEY (identidad del servidor)       LLAVE DE USUARIO (identidad del cliente)
────────────────────────────────        ────────────────────────────────────────
Generada por el servidor al             Generada por el usuario con ssh-keygen
instalar sshd
Ubicación: /etc/ssh/ssh_host_*          Ubicación: ~/.ssh/id_ed25519
Propósito: probar que el servidor       Propósito: probar que el cliente es quien
es quien dice ser (evitar MITM)         dice ser (autenticación)
Se guarda en: ~/.ssh/known_hosts        Se instala en: ~/.ssh/authorized_keys
del cliente                             del servidor
\`\`\`

### 📖 known_hosts: el registro de servidores verificados

La primera vez que te conectas a un servidor nuevo:

\`\`\`text
The authenticity of host '192.168.1.50 (192.168.1.50)' can't be established.
ED25519 key fingerprint is SHA256:aBcD1234xYzW...
Are you sure you want to continue connecting (yes/no/[fingerprint])?
\`\`\`

Al responder \`yes\`, SSH guarda la fingerprint en \`~/.ssh/known_hosts\`. En futuras conexiones la compara automáticamente. Si cambia (reinstalación del servidor, ataque MITM), SSH advierte:

\`\`\`text
WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!
IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
\`\`\`

> Antes de ignorar esta advertencia, verifica con el administrador del servidor si fue reinstalado. Si es legítimo, elimina la entrada antigua: \`ssh-keygen -R 192.168.1.50\`

### 📖 Permisos críticos: SSH es paranoico

OpenSSH verifica los permisos de cada archivo antes de usarlo. Si encuentra permisos demasiado abiertos, **rechaza la llave sin dar más explicaciones**.

\`\`\`bash
# Directorio ~/.ssh: solo el propietario puede entrar
chmod 700 ~/.ssh

# Llave privada: solo el propietario puede leer
chmod 600 ~/.ssh/id_ed25519

# Llave pública: puede ser legible
chmod 644 ~/.ssh/id_ed25519.pub

# authorized_keys en el SERVIDOR: solo el propietario puede leer/escribir
chmod 600 ~/.ssh/authorized_keys

# known_hosts: legible por todos
chmod 644 ~/.ssh/known_hosts
\`\`\`

| Archivo | Permiso correcto | Si está mal |
| --- | --- | --- |
| \`~/.ssh\` | \`700\` (rwx------) | SSH ignora todo el directorio |
| \`id_ed25519\` | \`600\` (rw-------) | SSH rechaza la llave, pide contraseña |
| \`authorized_keys\` | \`600\` | SSH no acepta la autenticación por llave |

### 💻 Verificar y corregir permisos de golpe

\`\`\`bash
# Ver estado actual
ls -la ~/.ssh/

# Corregir todo en un solo bloque
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519 ~/.ssh/authorized_keys
chmod 644 ~/.ssh/id_ed25519.pub ~/.ssh/known_hosts ~/.ssh/config 2>/dev/null
\`\`\`

### 📋 Lo que debes recordar

* \`id_ed25519\` es privada: **permisos 600, nunca compartir, nunca subir a Git.**
* \`authorized_keys\` en el servidor determina quién puede entrar. Si alguien añade su llave ahí, tiene acceso.
* \`known_hosts\` protege contra ataques MITM. No ignorar sus advertencias.
* Permisos incorrectos en \`~/.ssh\` hacen que SSH falle silenciosamente o pida contraseña.

### 🧪 Autoevaluación

1. ¿Dónde se guarda la llave pública que copias a un servidor para acceder sin contraseña?
2. SSH falla y pide contraseña aunque tienes las llaves generadas. ¿Qué revisas primero?
3. ¿Qué significa la advertencia "REMOTE HOST IDENTIFICATION HAS CHANGED"?

---

1. En \`~/.ssh/authorized_keys\` del **servidor** de destino, bajo el directorio home del usuario con el que te conectas.
2. Los **permisos** de \`~/.ssh\` (debe ser 700) y de \`~/.ssh/id_ed25519\` (debe ser 600). SSH rechaza llaves con permisos demasiado abiertos.
3. El servidor presenta una Host Key diferente a la que \`known_hosts\` tiene guardada. Puede ser una reinstalación legítima o un ataque MITM. Verificar antes de continuar.
`

export default content
