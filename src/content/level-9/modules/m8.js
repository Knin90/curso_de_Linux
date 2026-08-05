const content = `
## Módulo 8 — Diagnóstico y laboratorios integrados

### 🎯 Objetivos de aprendizaje

* Diagnosticar sistemáticamente fallos de conexión SSH.
* Usar \`ssh -v\`, \`journalctl\` y \`nc\` para identificar la capa exacta del fallo.
* Completar el flujo completo de una infraestructura SSH lista para Ansible.

### 📖 Árbol de diagnóstico SSH

Ante cualquier fallo de conexión SSH, diagnosticar de abajo hacia arriba:

\`\`\`text
¿No conecta?
      │
      ▼ ping servidor
   ┌──┴──┐
  Sí    No → Red caída, servidor apagado, ICMP bloqueado
   │
   ▼ nc -zv servidor 22
   ┌──┴──┐
  Sí    No → Firewall bloquea puerto 22, sshd no corre,
   │          o SSH en puerto diferente
   ▼ ssh -vvv usuario@servidor
   │  (¿en qué fase falla?)
   ├── "Connection refused"   → sshd no corre o puerto equivocado
   ├── "Host key changed"     → reinstalación o ataque MITM
   ├── "Permission denied"    → autenticación fallida
   │    └── ¿Permisos ~/.ssh? → ls -la ~/.ssh/ en servidor
   │    └── ¿Llave en authorized_keys? → cat ~/.ssh/authorized_keys
   │    └── ¿PasswordAuthentication no sin llave? → acceso por consola
   └── Conecta pero lento     → DNS reverso, UsePrivilegeSeparation
\`\`\`

### 💻 Herramientas de diagnóstico

\`\`\`bash
# ─── DESDE EL CLIENTE ───────────────────────────────────────────────

# Verificar conectividad básica
ping servidor

# Verificar que el puerto SSH está abierto
nc -zv servidor 22

# Modo verbose nivel 1: información básica
ssh -v usuario@servidor

# Modo verbose nivel 3: máximo detalle (cada paquete)
ssh -vvv usuario@servidor

# Ver qué llave ofrece el agente
ssh-add -l

# ─── EN EL SERVIDOR (por consola o sesión existente) ────────────────

# Estado del servicio sshd
sudo systemctl status sshd

# Logs en tiempo real
sudo journalctl -u sshd -f

# Últimas 50 líneas de log con errores de autenticación
sudo journalctl -u sshd -n 50 | grep -E "Failed|Invalid|error|Accepted"

# Logs clásicos (alternativa)
sudo tail -f /var/log/auth.log        # Debian/Ubuntu
sudo tail -f /var/log/secure          # RHEL/Fedora

# Verificar configuración efectiva
sudo sshd -T | grep -E "passwordauth|pubkeyauth|permitrootlogin|port"

# Verificar permisos del ~/.ssh del usuario que intenta entrar
ls -la /home/usuario/.ssh/
cat /home/usuario/.ssh/authorized_keys

# Eliminar entrada de known_hosts si el servidor fue reinstalado
ssh-keygen -R 192.168.1.50
\`\`\`

### 🧪 Laboratorio 1: Auditoría del entorno local SSH

\`\`\`bash
# 1. Inventariar las llaves presentes
ls -la ~/.ssh/

# 2. Verificar permisos
stat ~/.ssh ~/.ssh/id_ed25519 ~/.ssh/authorized_keys 2>/dev/null

# 3. Ver cuántos servidores conocidos tienes
wc -l ~/.ssh/known_hosts

# 4. Ver qué llaves tiene cargadas el agente
ssh-add -l

# 5. Ver fingerprint de tu llave
ssh-keygen -l -f ~/.ssh/id_ed25519
\`\`\`

---

### 🧪 Laboratorio 2: Flujo completo de acceso seguro

**Escenario:** Preparar un servidor Ubuntu para acceso sin contraseñas, listo para ser automatizado con Ansible.

\`\`\`bash
# ─── EN EL CLIENTE (tu máquina) ─────────────────────────────────────

# 1. Generar llave Ed25519 con passphrase
ssh-keygen -t ed25519 -C "admin@empresa.com"

# 2. Iniciar ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. Copiar llave al servidor
ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@192.168.1.50

# 4. Crear alias en ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'
Host servidor-lab
    HostName 192.168.1.50
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
    ServerAliveInterval 60
EOF
chmod 600 ~/.ssh/config

# 5. Probar la conexión
ssh servidor-lab

# ─── EN EL SERVIDOR ──────────────────────────────────────────────────

# 6. Verificar que la llave está instalada
cat ~/.ssh/authorized_keys

# 7. Hacer backup y aplicar hardening
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config

# O editarlo manualmente
sudo nano /etc/ssh/sshd_config

# 8. Validar y recargar
sudo sshd -t
sudo systemctl reload sshd

# ─── VERIFICACIÓN FINAL (desde otra terminal) ───────────────────────

# 9. Confirmar que la conexión funciona con llave
ssh servidor-lab

# 10. Confirmar que la contraseña es rechazada
ssh -o PasswordAuthentication=yes -o PubkeyAuthentication=no ubuntu@192.168.1.50
# Debe fallar con "Permission denied (publickey)"
\`\`\`

---

### 🧪 Laboratorio 3: ProxyJump a servidor privado

\`\`\`bash
# Configuración en ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'

Host bastion
    HostName 203.0.113.10
    User admin
    IdentityFile ~/.ssh/id_ed25519

Host privado
    HostName 10.0.0.15
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    ProxyJump bastion
EOF

# Verificar que la llave está en el bastión
ssh-copy-id -i ~/.ssh/id_ed25519.pub admin@203.0.113.10

# Verificar que la llave está en el servidor privado
# (conectarse al bastión primero y copiarla)
ssh bastion
ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@10.0.0.15

# Conectar en un solo comando desde el cliente
ssh privado
\`\`\`

---

### 🧪 Laboratorio 4: Diagnóstico de una conexión rota

**Escenario:** "No puedo entrar a web-prod". Diagnosticar sistemáticamente.

\`\`\`bash
# Desde la máquina del compañero:
ping web-prod
nc -zv web-prod 22
ssh -vvv web-prod 2>&1 | head -50

# En el servidor (por consola cloud):
sudo systemctl status sshd
sudo journalctl -u sshd -n 20
sudo sshd -t
ls -la /home/ubuntu/.ssh/
cat /home/ubuntu/.ssh/authorized_keys
grep "PasswordAuthentication\\|PubkeyAuthentication\\|PermitRootLogin" /etc/ssh/sshd_config
\`\`\`

**Pregunta:** \`nc -zv web-prod 22\` reporta \`Connection refused\` pero \`ping web-prod\` funciona. ¿Qué investigas?

> sshd no está corriendo (\`systemctl status sshd\`), o SSH está escuchando en un puerto diferente (\`sshd -T | grep port\`), o un firewall local bloquea el 22 (\`ufw status\` o \`iptables -L\`).

---

### 📋 Tabla resumen de comandos del Nivel 9

| Comando | Función |
| --- | --- |
| \`ssh-keygen -t ed25519\` | Generar par de llaves Ed25519 |
| \`ssh-keygen -l -f ~/.ssh/id_ed25519\` | Ver fingerprint de una llave |
| \`ssh-keygen -R <IP>\` | Eliminar entrada de known_hosts |
| \`ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host\` | Instalar llave pública en servidor |
| \`eval "$(ssh-agent -s)"\` | Iniciar ssh-agent |
| \`ssh-add ~/.ssh/id_ed25519\` | Añadir llave al agente |
| \`ssh-add -l\` | Listar llaves cargadas en el agente |
| \`ssh -v user@host\` | Conexión con verbose nivel 1 |
| \`ssh -vvv user@host\` | Conexión con verbose máximo |
| \`ssh -J bastion user@privado\` | Salto por bastión manual |
| \`scp archivo host:/ruta\` | Copiar archivo al servidor |
| \`scp -r host:/ruta ./local\` | Descargar directorio del servidor |
| \`sftp host\` | Sesión interactiva de transferencia |
| \`nc -zv host 22\` | Verificar que el puerto SSH está abierto |
| \`sudo sshd -t\` | Validar sintaxis de sshd_config |
| \`sudo sshd -T\` | Ver configuración efectiva del daemon |
| \`sudo systemctl reload sshd\` | Recargar config sin cortar sesiones |
| \`sudo journalctl -u sshd -f\` | Ver logs SSH en tiempo real |
| \`~/.ssh/config\` | Alias y perfiles de conexión |
| \`/etc/ssh/sshd_config\` | Configuración del daemon SSH |

### 🎯 Reglas de oro

1. **La llave privada NUNCA sale de tu máquina.**
2. **Ed25519 para todo lo nuevo.** RSA solo por compatibilidad legacy.
3. **Passphrase + ssh-agent** = seguridad sin fricción.
4. **PasswordAuthentication no + PermitRootLogin no** = tríada mínima de hardening.
5. **sshd -t antes de cualquier cambio.** reload nunca restart.
6. **~/.ssh/config desde el día 1.** Ansible lo agradecerá.
7. **ProxyJump para redes privadas.** No expongas servidores internos a Internet.
8. **Backup de sshd_config antes de editar.** Una sesión SSH extra de emergencia siempre abierta.
`

export default content
