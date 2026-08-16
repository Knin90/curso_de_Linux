const content = `
## Módulo 3 — Red, SSH y firewall del servidor

### 🎯 Objetivos de aprendizaje

* Endurecer el acceso SSH a srv-prod01 mediante llaves, puerto no estándar y restricción de usuarios.
* Configurar firewalld con una política de superficie mínima expuesta.
* Verificar la exposición real del servidor desde una perspectiva externa antes y después del endurecimiento.
* Documentar la matriz de puertos abiertos como parte del checklist del proyecto.

### ❓ El problema real

srv-prod01 ya tiene usuarios y sudo configurados, pero sigue siendo accesible por SSH con contraseña, en el puerto 22, y sin ningún firewall activo. Cualquier scanner automatizado en internet lo encontrará en minutos y empezará a intentar fuerza bruta contra root. Este módulo cierra esa ventana: convierte el acceso remoto en algo que solo un poseedor de la llave privada correcta puede usar, y reduce la superficie de red a exactamente los puertos que el servidor necesita exponer.

### 📖 Generación y despliegue de llaves SSH

\`\`\`bash
# Desde la máquina del administrador (NO en srv-prod01)
ssh-keygen -t ed25519 -C "dscastro@srv-prod01" -f ~/.ssh/srv-prod01_ed25519

# Copiar la llave pública al servidor (todavía con contraseña, es la última vez)
ssh-copy-id -i ~/.ssh/srv-prod01_ed25519.pub dscastro@srv-prod01

# Verificar login por llave antes de deshabilitar contraseñas
ssh -i ~/.ssh/srv-prod01_ed25519 dscastro@srv-prod01 "sudo whoami"
# root
\`\`\`

ed25519 se prefiere sobre RSA por ser más rápido y con llaves más cortas para un nivel de seguridad equivalente o superior; RSA de 4096 bits sigue siendo válido si hay restricciones de compatibilidad.

### 📖 Endurecimiento de sshd_config

\`\`\`bash
# /etc/ssh/sshd_config.d/10-hardening.conf
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
KbdInteractiveAuthentication no
AllowUsers dscastro
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
\`\`\`

\`\`\`bash
# Validar la sintaxis antes de reiniciar el servicio
sshd -t
# Sin salida = configuración válida

# Reiniciar SSH (mantener la sesión actual abierta en otra terminal como red de seguridad)
systemctl restart sshd

# Probar la nueva configuración en una terminal aparte ANTES de cerrar la sesión activa
ssh -i ~/.ssh/srv-prod01_ed25519 -p 2222 dscastro@srv-prod01
\`\`\`

\`\`\`text
DIRECTIVA                        POR QUÉ
──────────────────────────────────────────────────────────────────────────
Port 2222                        Reduce el ruido de scanners automatizados contra el 22 por defecto
PermitRootLogin no               Root nunca inicia sesión directo; todo pasa por sudo y queda registrado
PasswordAuthentication no         Elimina la fuerza bruta por contraseña como vector de entrada
AllowUsers dscastro               Lista blanca explícita: ningún otro usuario del sistema puede entrar por SSH
MaxAuthTries 3                    Limita intentos por conexión antes de cerrarla
\`\`\`

**Regla de oro:** nunca cerrar la sesión SSH actual hasta confirmar en una segunda terminal que la nueva configuración permite conectar. Si algo falla, la sesión abierta es la única vía de recuperación sin acceso a consola física o de la nube.

### 📖 Firewall con firewalld: superficie mínima expuesta

\`\`\`bash
# Estado inicial del firewall
systemctl enable --now firewalld
firewall-cmd --get-active-zones

# Usar una zona restrictiva por defecto (drop en vez de public)
firewall-cmd --set-default-zone=drop
firewall-cmd --get-default-zone
# drop

# Abrir explícitamente solo lo que srv-prod01 necesita según la topología del módulo 1
firewall-cmd --permanent --zone=drop --add-port=2222/tcp   # SSH endurecido
firewall-cmd --permanent --zone=drop --add-service=http    # 80, redirige a HTTPS
firewall-cmd --permanent --zone=drop --add-service=https   # 443

# Aplicar cambios permanentes
firewall-cmd --reload
firewall-cmd --list-all
\`\`\`

\`\`\`text
public (default)
  target: default
  ports: 2222/tcp
  services: http https
\`\`\`

La zona \`drop\` descarta silenciosamente cualquier tráfico no permitido explícitamente, sin siquiera responder con un rechazo (a diferencia de \`reject\`), lo que dificulta el reconocimiento por parte de un atacante.

### 📖 Verificación externa de la superficie expuesta

\`\`\`bash
# Desde una máquina externa, no desde srv-prod01
nmap -Pn -p- srv-prod01
# PORT     STATE SERVICE
# 2222/tcp open  EasySoftwareProducts
# 80/tcp   open  http
# 443/tcp  open  https

# Confirmar que el puerto 22 original ya no responde
nmap -Pn -p22 srv-prod01
# 22/tcp closed ssh
\`\`\`

Verificar desde fuera del servidor es imprescindible: una regla de firewall mal aplicada localmente puede parecer correcta en \`firewall-cmd --list-all\` pero seguir exponiendo el puerto si hay una interfaz o zona no contemplada.

### 📖 Matriz de puertos del proyecto (para el checklist final)

\`\`\`text
PUERTO   PROTOCOLO   SERVICIO         ORIGEN PERMITIDO       JUSTIFICACIÓN
──────────────────────────────────────────────────────────────────────────────
2222     TCP         SSH (sshd)       administradores/VPN     acceso administrativo
80       TCP         HTTP (nginx)     cualquiera               redirige a 443
443      TCP         HTTPS (nginx)    cualquiera               tráfico de la aplicación
\`\`\`

Esta matriz se documenta formalmente en el módulo 8, pero se construye aquí, puerto por puerto, a medida que se justifica cada apertura.

### 📋 Lo que debes recordar

* SSH se endurece con llaves, sin contraseñas, sin root directo y en un puerto no estándar, y se verifica en una segunda terminal antes de cerrar la sesión activa.
* firewalld con zona \`drop\` por defecto invierte la lógica: todo cerrado salvo lo explícitamente abierto.
* La verificación de superficie expuesta se hace desde fuera del servidor con \`nmap\`, nunca solo con la configuración local.
* Cada puerto abierto debe tener una justificación documentada; "por si acaso" no es una razón válida en producción.

### 🧪 Autoevaluación

1. ¿Por qué se debe mantener la sesión SSH actual abierta al reiniciar sshd con la nueva configuración?
2. ¿Qué diferencia práctica hay entre la zona \`drop\` y la zona \`public\` de firewalld?
3. Un administrador confirma con \`firewall-cmd --list-all\` que el puerto 22 está cerrado, pero \`nmap\` desde otra máquina lo muestra abierto. ¿Qué es lo primero que se debería sospechar?

---

1. Porque si la nueva configuración de sshd tiene un error, la sesión activa es la única vía de acceso restante para corregirlo sin depender de consola física o de la nube; cerrarla antes de verificar puede dejar el servidor inaccesible.
2. \`drop\` descarta silenciosamente todo tráfico no permitido explícitamente sin responder al origen, mientras que \`public\` (la zona por defecto en muchas distros) es más permisiva y responde con rechazos visibles, lo que facilita el reconocimiento por parte de un atacante.
3. Que la regla esté aplicada en una zona o interfaz distinta a la que realmente recibe el tráfico (por ejemplo, la interfaz activa no está en la zona \`drop\` configurada), o que exista una regla adicional (NAT, otra herramienta de firewall, un contenedor) exponiendo el puerto por otra vía.
`

export default content
