const content = `
## Módulo 8 — Proyecto real: acceso SSH sin contraseñas para automatización con Ansible

### 🎯 Objetivos de aprendizaje

* Configurar acceso SSH por llave, sin contraseñas, listo para ser automatizado con Ansible.
* Aplicar hardening básico a \`sshd_config\`: deshabilitar contraseñas y login de root.
* Diagnosticar sistemáticamente un fallo de conexión SSH usando \`ssh -vvv\`, \`journalctl\` y \`nc\`.

### ❓ El problema real

El equipo de plataforma va a empezar a gestionar 20 servidores Ubuntu con Ansible, que requiere SSH sin contraseñas para funcionar de forma no interactiva. Te asignan preparar el primer servidor como plantilla del proceso: generar una llave dedicada, distribuirla, crear un alias reutilizable en \`~/.ssh/config\`, y aplicar hardening (sin contraseñas, sin root directo). Mientras terminas, un compañero reporta en el canal de incidentes: "no puedo entrar a \`web-prod\`". Debes diagnosticar ese fallo con el mismo rigor antes de dar por cerrado el día.

### 📖 Estructura del proyecto

\`\`\`
acceso-ssh-ansible/
├── setup-cliente.sh
├── ssh-config.entry
├── hardening-servidor.sh
└── diagnostico.sh
\`\`\`

### 📖 setup-cliente.sh — generación y distribución de la llave

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "[1] Generar llave Ed25519 con passphrase:"
ssh-keygen -t ed25519 -C "ansible@empresa.com" -f ~/.ssh/id_ed25519_ansible

echo "[2] Iniciar ssh-agent y cargar la llave:"
eval "\$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_ansible

echo "[3] Copiar la llave pública al servidor:"
ssh-copy-id -i ~/.ssh/id_ed25519_ansible.pub ubuntu@192.168.1.50
\`\`\`

Ed25519 se elige por ser el algoritmo moderno recomendado: llaves más cortas, más rápido de verificar y sin las debilidades históricas de RSA con módulos pequeños.

### 📖 ssh-config.entry — alias reutilizable

\`\`\`text
Host servidor-lab
    HostName 192.168.1.50
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519_ansible
    StrictHostKeyChecking accept-new
    ServerAliveInterval 60
\`\`\`

\`ServerAliveInterval\` evita que conexiones inactivas se corten por timeouts de red intermedios; \`StrictHostKeyChecking accept-new\` acepta automáticamente hosts nuevos sin desactivar del todo la verificación de \`known_hosts\`, un balance razonable para infraestructura gestionada.

### 📖 hardening-servidor.sh — endurecer sshd_config

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "[1] Backup de la configuración actual:"
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

echo "[2] Aplicar hardening mínimo:"
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config

echo "[3] Validar sintaxis ANTES de recargar (obligatorio):"
sudo sshd -t

echo "[4] Recargar sin cortar sesiones activas:"
sudo systemctl reload sshd
\`\`\`

El orden es crítico: nunca se recarga \`sshd\` sin validar primero con \`sshd -t\`. Una sintaxis inválida en \`sshd_config\` puede dejar el servicio sin arrancar en el próximo reinicio, y sin acceso por consola eso significa perder el servidor.

### 📖 diagnostico.sh — árbol de diagnóstico ante "no puedo entrar"

\`\`\`bash
#!/bin/bash
# Ejecutar desde la máquina que reporta el fallo

echo "[1] ¿Hay conectividad de red básica?"
ping -c 2 web-prod

echo "[2] ¿El puerto SSH está abierto?"
nc -zv web-prod 22

echo "[3] ¿En qué fase exacta falla el handshake?"
ssh -vvv web-prod 2>&1 | tail -30
\`\`\`

Y en el servidor, por consola o una sesión ya abierta:

\`\`\`bash
sudo systemctl status sshd
sudo journalctl -u sshd -n 20
sudo sshd -t
ls -la /home/ubuntu/.ssh/
cat /home/ubuntu/.ssh/authorized_keys
grep -E "PasswordAuthentication|PubkeyAuthentication|PermitRootLogin" /etc/ssh/sshd_config
\`\`\`

### 📖 Secuencia de ejecución

1. Desde el cliente, generar y cargar la llave dedicada:

\`\`\`bash
bash setup-cliente.sh
\`\`\`

2. Añadir el alias al archivo de configuración local con los permisos correctos:

\`\`\`bash
cat ssh-config.entry >> ~/.ssh/config
chmod 600 ~/.ssh/config
\`\`\`

3. Probar la conexión con el alias antes de continuar:

\`\`\`bash
ssh servidor-lab
\`\`\`

4. En el servidor, aplicar el hardening:

\`\`\`bash
bash hardening-servidor.sh
\`\`\`

Salida esperada del paso de validación:

\`\`\`
sshd: /etc/ssh/sshd_config line 58: Deprecated option ...(si aplica)
sshd: configuration file OK
\`\`\`

5. Verificación final: la llave debe seguir funcionando y la contraseña debe ser rechazada:

\`\`\`bash
ssh servidor-lab
ssh -o PasswordAuthentication=yes -o PubkeyAuthentication=no ubuntu@192.168.1.50
\`\`\`

El segundo comando debe fallar con \`Permission denied (publickey)\`.

6. Atender el incidente de "no puedo entrar a web-prod" con el diagnóstico sistemático:

\`\`\`bash
bash diagnostico.sh
\`\`\`

7. Interpretar el resultado más común de este tipo de incidente: \`nc -zv web-prod 22\` reporta \`Connection refused\` pero \`ping\` funciona. Confirmar la causa exacta en el servidor:

\`\`\`bash
sudo systemctl status sshd
sudo ss -tlnp | grep :22
\`\`\`

Si \`sshd\` no aparece en \`ss -tlnp\`, el servicio no está escuchando — la causa más probable es que \`sshd\` está detenido o falló al arrancar tras un cambio de configuración no validado.

### 📋 Lo que debes recordar

* La llave privada nunca sale de la máquina donde se generó; solo la pública se distribuye con \`ssh-copy-id\`.
* Ed25519 es la elección por defecto para llaves nuevas; RSA solo se mantiene por compatibilidad con sistemas legacy.
* \`sshd -t\` antes de cualquier \`reload\` o \`restart\` es innegociable: valida la sintaxis sin arriesgar el acceso al servidor.
* \`systemctl reload sshd\`, no \`restart\`, para aplicar cambios de configuración sin cortar las sesiones ya activas.
* \`PasswordAuthentication no\` + \`PermitRootLogin no\` es la tríada mínima de hardening antes de exponer un servidor.
* Ante un fallo de conexión, diagnosticar de abajo hacia arriba: red (\`ping\`) → puerto (\`nc -zv\`) → protocolo (\`ssh -vvv\`) → estado del servicio (\`systemctl status\`) → configuración (\`sshd -T\`) → permisos y llaves en el servidor.
* \`~/.ssh/config\` con alias reutilizables es el punto de partida natural para que herramientas como Ansible usen las mismas credenciales sin reescribir parámetros de conexión.

### 🧪 Autoevaluación

1. ¿Por qué se ejecuta \`sudo sshd -t\` antes de \`systemctl reload sshd\` y qué riesgo evita concretamente?
2. \`nc -zv web-prod 22\` reporta \`Connection refused\`, pero \`ping web-prod\` responde con éxito. ¿Qué conclusión inicial es correcta y qué comando confirmarías en el servidor?
3. En el proyecto, ¿por qué se usa \`systemctl reload sshd\` en vez de \`systemctl restart sshd\` al aplicar el hardening?

---

1. \`sshd -t\` valida la sintaxis del archivo de configuración sin aplicar ningún cambio. Evita el riesgo de que un error tipográfico en \`sshd_config\` impida que el servicio arranque correctamente la próxima vez que se recargue o reinicie, lo que dejaría al servidor sin acceso SSH — un problema grave si no hay acceso por consola alternativa.
2. La conclusión correcta es que la capa de red funciona (el host responde a \`ping\`), pero nada está escuchando en el puerto 22, o un firewall lo está bloqueando activamente con un rechazo explícito. En el servidor se confirma con \`sudo systemctl status sshd\` y \`sudo ss -tlnp | grep :22\`: si \`sshd\` no aparece escuchando, el servicio está detenido o falló al iniciar.
3. \`reload\` le pide a \`sshd\` releer su configuración sin terminar el proceso principal, por lo que las sesiones SSH ya activas (incluida la que se está usando para hacer el cambio) no se cortan. \`restart\` mata y recrea el proceso, lo cual puede cortar la sesión actual del administrador si algo sale mal, dejándolo sin forma de revertir el cambio.
`

export default content
