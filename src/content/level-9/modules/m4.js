const content = `
## Módulo 4 — Distribución de llaves y ssh-agent

### 🎯 Objetivos de aprendizaje

* Copiar la llave pública a un servidor con \`ssh-copy-id\`.
* Configurar \`ssh-agent\` para no escribir la passphrase repetidamente.
* Entender qué hace internamente cada operación.

### 📖 El flujo de distribución de llaves

\`\`\`text
1. Generas el par en tu máquina local:
   ~/.ssh/id_ed25519        (privada, nunca sale de aquí)
   ~/.ssh/id_ed25519.pub    (pública, se copia al servidor)

2. Instalas la llave pública en el servidor:
   /home/usuario/.ssh/authorized_keys  (contiene tu llave pública)

3. Al conectarte, el servidor desafía y tú firmas con la privada.
   El servidor verifica con la pública. Acceso concedido.
\`\`\`

### 💻 ssh-copy-id: instalar la llave en el servidor

\`\`\`bash
# Método recomendado (requiere acceso temporal por contraseña)
ssh-copy-id -i ~/.ssh/id_ed25519.pub usuario@192.168.1.50

# Con puerto personalizado
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 2222 usuario@192.168.1.50
\`\`\`

\`\`\`text
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s)
Number of key(s) added: 1
Now try logging in with: "ssh 'usuario@192.168.1.50'"
\`\`\`

**¿Qué hace ssh-copy-id internamente?**

1. Se conecta al servidor con contraseña.
2. Crea \`~/.ssh/\` si no existe (con permisos 700).
3. Añade tu llave pública al final de \`~/.ssh/authorized_keys\`.
4. Ajusta permisos a 600 en \`authorized_keys\`.

### 💻 Método manual (cuando ssh-copy-id no está disponible)

\`\`\`bash
# Opción A: con pipe
cat ~/.ssh/id_ed25519.pub | ssh usuario@192.168.1.50 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

# Opción B: copiar el contenido y pegarlo manualmente
cat ~/.ssh/id_ed25519.pub
# Copiar la salida, luego en el servidor:
# echo "ssh-ed25519 AAAA... admin@empresa.com" >> ~/.ssh/authorized_keys
\`\`\`

### 💻 Verificar la instalación en el servidor

\`\`\`bash
# Conectarse y verificar
ssh usuario@192.168.1.50
cat ~/.ssh/authorized_keys
# Debe mostrar tu llave pública
\`\`\`

### 📖 ssh-agent: el llavero en memoria

\`ssh-agent\` es un proceso que mantiene las llaves privadas descifradas en memoria RAM. Solo existe durante tu sesión. Al cerrar sesión, las claves en memoria se pierden (la llave en disco sigue protegida por passphrase).

\`\`\`bash
# 1. Iniciar el agente
eval "$(ssh-agent -s)"
# Agent pid 12345

# 2. Añadir llave (te pide la passphrase una sola vez)
ssh-add ~/.ssh/id_ed25519
# Enter passphrase for /home/usuario/.ssh/id_ed25519:
# Identity added: /home/usuario/.ssh/id_ed25519 (admin@empresa.com)

# 3. Verificar qué llaves tiene cargadas
ssh-add -l

# 4. Eliminar una llave del agente (sin borrar el archivo)
ssh-add -d ~/.ssh/id_ed25519

# 5. Eliminar TODAS las llaves del agente
ssh-add -D
\`\`\`

**Salida de \`ssh-add -l\`:**
\`\`\`text
256 SHA256:aBcDeFgH... admin@empresa.com (ED25519)
\`\`\`

### 📖 ssh-agent en distribuciones modernas

En GNOME y KDE, el agente se inicia automáticamente al hacer login gráfico y se integra con el keyring del sistema. Puedes verificarlo:

\`\`\`bash
echo $SSH_AUTH_SOCK
# Si devuelve una ruta como /run/user/1000/keyring/ssh → agente activo
\`\`\`

En servidores sin escritorio, añade al \`~/.bashrc\` o \`~/.profile\`:

\`\`\`bash
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)"
fi
\`\`\`

### 📋 Lo que debes recordar

* \`ssh-copy-id\` instala la llave pública en \`authorized_keys\` del servidor con los permisos correctos automáticamente.
* Después de \`ssh-copy-id\`, ya nunca debes necesitar contraseña para ese servidor.
* \`ssh-agent\` desbloquea la passphrase una vez y recuerda la llave para toda la sesión.
* Verifica con \`ssh-add -l\` qué llaves tiene cargadas el agente antes de depurar conexiones.

### 🧪 Autoevaluación

1. ¿Qué archivo en el servidor determina qué llaves públicas pueden autenticarse como ese usuario?
2. Instalaste la llave con \`ssh-copy-id\` pero SSH sigue pidiendo contraseña. ¿Qué revisas?
3. ¿Qué ventaja tiene \`ssh-agent\` frente a no usarlo cuando tienes passphrase?

---

1. \`~/.ssh/authorized_keys\` en el servidor, bajo el directorio home del usuario de destino.
2. (a) Permisos de \`~/.ssh\` y \`authorized_keys\` en el servidor (700 y 600 respectivamente). (b) Que \`PubkeyAuthentication yes\` esté en \`sshd_config\`. (c) Que \`ssh-agent\` tenga cargada la llave correcta (\`ssh-add -l\`).
3. \`ssh-agent\` escribe la passphrase **una sola vez** por sesión. Sin él, cada conexión SSH pediría la passphrase. Con 30 servidores, eso es inmanejable.
`

export default content
