const content = `
## Módulo 5 — ~/.ssh/config: alias, perfiles y ProxyJump

### 🎯 Objetivos de aprendizaje

* Crear alias de conexión en \`~/.ssh/config\` para simplificar comandos complejos.
* Configurar perfiles por host con usuario, puerto y llave específicos.
* Implementar \`ProxyJump\` para acceder a servidores en redes privadas.

### ❓ El problema real

Tienes que conectarte a: \`ssh ubuntu@ec2-54-123-45-67.compute-1.amazonaws.com -p 22 -i ~/.ssh/id_ed25519_trabajo\`. Cada vez. Con 10 servidores diferentes. Un error tipográfico y te conectas al servidor equivocado. O simplemente, es un infierno.

### 📖 La solución: ~/.ssh/config

El archivo \`~/.ssh/config\` permite definir perfiles por host. SSH los lee automáticamente.

\`\`\`bash
# Estructura de una entrada
Host <alias>
    HostName <IP o dominio real>
    User <usuario>
    Port <puerto>
    IdentityFile <ruta a llave privada>
    <otras opciones>
\`\`\`

### 💻 Configuración completa de ejemplo

\`\`\`bash
# Permisos correctos del archivo de config
chmod 600 ~/.ssh/config

nano ~/.ssh/config
\`\`\`

\`\`\`text
# ─── Opciones globales (aplican a todos los hosts) ───────────────────
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    StrictHostKeyChecking ask
    AddKeysToAgent yes

# ─── Servidor web de producción ──────────────────────────────────────
Host web-prod
    HostName 192.168.1.50
    User ubuntu
    Port 22
    IdentityFile ~/.ssh/id_ed25519

# ─── Servidor de base de datos (puerto modificado) ───────────────────
Host db-prod
    HostName 192.168.2.10
    User postgres
    Port 2222
    IdentityFile ~/.ssh/id_ed25519

# ─── Bastión de acceso (tiene IP pública) ────────────────────────────
Host bastion
    HostName 203.0.113.10
    User admin
    IdentityFile ~/.ssh/id_ed25519

# ─── Servidor privado (solo accesible desde bastión) ─────────────────
Host privado
    HostName 10.0.0.15
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    ProxyJump bastion

# ─── Alias para AWS con nombre de instancia largo ────────────────────
Host aws-web
    HostName ec2-54-123-45-67.compute-1.amazonaws.com
    User ec2-user
    IdentityFile ~/.ssh/id_ed25519_trabajo
    StrictHostKeyChecking accept-new
\`\`\`

**Ahora conectarse es trivial:**

\`\`\`bash
ssh web-prod
ssh db-prod
ssh privado           # Salta automáticamente por bastión
scp archivo web-prod:/tmp/
sftp db-prod
\`\`\`

### 📖 Opciones importantes de ~/.ssh/config

| Opción | Valor ejemplo | Descripción |
| --- | --- | --- |
| \`ServerAliveInterval\` | \`60\` | Envía paquetes keepalive cada N segundos para evitar desconexión |
| \`ServerAliveCountMax\` | \`3\` | Desconecta si no recibe respuesta en N intentos |
| \`StrictHostKeyChecking\` | \`ask\` / \`accept-new\` / \`yes\` / \`no\` | Política de verificación de Host Key |
| \`AddKeysToAgent\` | \`yes\` | Añade automáticamente la llave a ssh-agent al usarla |
| \`ForwardAgent\` | \`yes\` | Reenvía el agente SSH al servidor (útil para bastiones, usar con cuidado) |
| \`IdentityFile\` | \`~/.ssh/id_ed25519\` | Llave específica para este host |
| \`IdentitiesOnly\` | \`yes\` | Solo usa la llave especificada, ignora el agente |

### 📖 ProxyJump: acceso a redes privadas

En infraestructuras reales, los servidores de base de datos, internos y de staging **no tienen IP pública**. Solo el bastión la tiene.

\`\`\`diagram
{"type":"flow-stack","layers":[{"icon":"cloud","name":"Internet"},{"icon":"gateway","name":"Bastión","meta":"IP pública"},{"icon":"server","name":"Servidor privado","meta":"10.0.0.15"}],"edges":[{"label":"SSH"},{"label":"ProxyJump"}]}
\`\`\`

**Sin \`~/.ssh/config\`:**
\`\`\`bash
ssh -J admin@203.0.113.10 ubuntu@10.0.0.15
\`\`\`

**Con \`~/.ssh/config\`:**
\`\`\`bash
ssh privado
\`\`\`

Y SSH hace el salto automáticamente. Ansible también usará este ProxyJump cuando haga conexiones a esos servidores.

### 📖 StrictHostKeyChecking: los tres modos

| Valor | Comportamiento | Usar cuando |
| --- | --- | --- |
| \`ask\` | Pregunta la primera vez, rechaza cambios | **Producción (humanos)** |
| \`accept-new\` | Acepta nuevos hosts automáticamente, rechaza cambios | **CI/CD con servidores nuevos** |
| \`yes\` | Rechaza cualquier host no conocido | **Alta seguridad** |
| \`no\` | Acepta todo sin verificar | **Nunca en producción. Vulnerable a MITM.** |

### 📋 Lo que debes recordar

* \`~/.ssh/config\` transforma comandos complejos en aliases de una palabra.
* **Ansible lo reutiliza automáticamente**: ProxyJump, llaves, puertos y usuarios en \`config\` son transparentes para Ansible.
* \`ServerAliveInterval\` evita que las sesiones SSH se corten por inactividad.
* \`StrictHostKeyChecking no\` nunca en producción — es el equivalente a no verificar el servidor.

### 🧪 Autoevaluación

1. ¿Cómo conectarías a un servidor en \`10.0.0.5\` que solo es accesible desde \`bastion.empresa.com\` con usuario \`admin\`?
2. ¿Por qué \`ServerAliveInterval 60\` es útil en sesiones de larga duración?
3. ¿Qué diferencia hay entre \`StrictHostKeyChecking accept-new\` y \`no\`?

---

1. En \`~/.ssh/config\`: \`Host privado\`, \`HostName 10.0.0.5\`, \`User ubuntu\`, \`ProxyJump bastion.empresa.com\`. Luego \`ssh privado\`.
2. Evita que routers, firewalls o el propio sistema operativo cierren la conexión TCP por inactividad. Sin él, una sesión idle puede cortarse silenciosamente.
3. \`accept-new\` acepta hosts nunca vistos pero **rechaza si la Host Key cambia** (protege contra MITM en reconexiones). \`no\` acepta todo siempre, incluyendo cambios de Host Key maliciosos.
`

export default content
