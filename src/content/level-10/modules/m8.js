const content = `
## Módulo 8 — Proyecto real: ruleset de producción para un servidor web con acceso restringido

### 🎯 Objetivos de aprendizaje

* Construir un ruleset de firewall completo de producción aplicando el principio de mínimo privilegio.
* Implementar el mismo resultado con \`iptables\` y con \`ufw\`, y saber cuándo elegir cada uno.
* Diagnosticar sistemáticamente un servicio que "no responde" cuando la causa puede estar en el firewall.

### ❓ El problema real

Un servidor web nuevo va a producción. Sirve HTTP y HTTPS al público, pero SSH solo debe ser accesible desde la red interna del equipo de administración (\`10.10.0.0/16\`) — nunca desde Internet abierto. La política de seguridad de la empresa exige el principio de mínimo privilegio: todo bloqueado por defecto, y solo lo estrictamente necesario permitido explícitamente. Debes entregar el ruleset, persistirlo para que sobreviva a reinicios, y dejar preparado un procedimiento de diagnóstico porque, poco después del despliegue, QA reporta que \`https://miservidor.com\` no responde.

### 📖 Estructura del proyecto

\`\`\`
firewall-produccion/
├── firewall-iptables.sh
├── firewall-ufw.sh
└── diagnostico-443.sh
\`\`\`

### 📖 firewall-iptables.sh — ruleset completo con iptables

\`\`\`bash
#!/bin/bash
set -e

echo "[+] Configurando firewall de producción..."

# FASE 1: política permisiva durante la transición (no quedar bloqueado)
iptables -P INPUT   ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT  ACCEPT

# Eliminar reglas y cadenas existentes
iptables -F
iptables -X
iptables -Z

# FASE 2: loopback siempre permitido
iptables -A INPUT  -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# FASE 3: conexiones ya establecidas
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# FASE 4: SSH restringido a la red de administración
iptables -A INPUT -p tcp --dport 22 -s 10.10.0.0/16 -j ACCEPT

# FASE 5: web público
iptables -A INPUT -p tcp --dport 80  -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# FASE 6: ping limitado, contra flood
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 5/min --limit-burst 10 -j ACCEPT
iptables -A INPUT -p icmp --icmp-type echo-request -j DROP

# FASE 7: registrar todo lo bloqueado
iptables -A INPUT -j LOG --log-prefix "FW-DROP: " --log-level 4

# FASE 8: política final restrictiva
iptables -P INPUT   DROP
iptables -P FORWARD DROP
iptables -P OUTPUT  ACCEPT

# FASE 9: persistir
iptables-save > /etc/iptables/rules.v4
echo "[+] Reglas guardadas en /etc/iptables/rules.v4"
\`\`\`

El orden importa: se establece política \`ACCEPT\` antes del \`flush\` para no perder acceso remoto a mitad del script, y la política \`DROP\` final solo se activa después de que todas las reglas de permiso ya están cargadas.

### 📖 firewall-ufw.sh — el mismo resultado con ufw

\`\`\`bash
#!/bin/bash
set -e

echo "[+] Configurando firewall con ufw..."

ufw default deny incoming
ufw default allow outgoing
ufw default deny forward

# SSH solo desde la red de administración
ufw allow from 10.10.0.0/16 to any port 22 proto tcp

# Web público
ufw allow 80/tcp
ufw allow 443/tcp

ufw --force enable
ufw status verbose
\`\`\`

\`ufw\` genera reglas \`iptables\` equivalentes por debajo, pero con una sintaxis mucho más legible; se prefiere en servidores donde la simplicidad del mantenimiento importa más que el control fino de \`nftables\` o \`iptables\` puro.

### 📖 diagnostico-443.sh — QA reporta "no responde"

\`\`\`bash
#!/bin/bash
# Diagnóstico por capas ante un servicio inaccesible

echo "[1] ¿La app escucha en el puerto?"
ss -tlnp | grep ':443'

echo "[2] ¿Funciona localmente, sin pasar por la red externa?"
curl -sk https://localhost -o /dev/null -w "%{http_code}\\n"

echo "[3] ¿El firewall tiene una regla de bloqueo antes de la de permiso?"
iptables -L INPUT -v -n | grep -E "443|DROP|REJECT"

echo "[4] ¿ufw tiene la regla activa?"
ufw status verbose | grep 443
\`\`\`

### 📖 Secuencia de ejecución

1. Aplicar el ruleset con iptables en el servidor de producción:

\`\`\`bash
sudo bash firewall-iptables.sh
\`\`\`

Verificar el resultado:

\`\`\`bash
sudo iptables -L -v -n
\`\`\`

2. Confirmar que SSH desde fuera de la red de administración es rechazado, y que sí funciona desde dentro de \`10.10.0.0/16\`.

3. (Alternativa equivalente) En un servidor Ubuntu, aplicar el mismo resultado con ufw:

\`\`\`bash
sudo bash firewall-ufw.sh
\`\`\`

Salida esperada:

\`\`\`
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       10.10.0.0/16
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
\`\`\`

4. Cuando QA reporta que \`https://miservidor.com\` no responde, ejecutar el diagnóstico en orden:

\`\`\`bash
bash diagnostico-443.sh
\`\`\`

5. Interpretar el resultado del paso [1]: si \`ss -tlnp\` no muestra nada escuchando en \`:443\`, nginx no está corriendo — el problema no es el firewall.

\`\`\`bash
sudo systemctl status nginx
sudo systemctl start nginx
\`\`\`

6. Si el paso [1] muestra nginx escuchando pero el paso [2] falla localmente, el problema es de configuración de nginx o del certificado, no del firewall.

7. Si los pasos [1] y [2] son correctos pero el cliente externo sigue sin poder conectar, añadir una regla \`LOG\` temporal para confirmar si el paquete llega al firewall:

\`\`\`bash
sudo iptables -I INPUT 1 -p tcp --dport 443 -j LOG --log-prefix "DEBUG-443: "
# El cliente reintenta la conexión...
sudo journalctl -k --since "1 min ago" | grep "DEBUG-443"
sudo iptables -D INPUT -p tcp --dport 443 -j LOG --log-prefix "DEBUG-443: "
\`\`\`

Si el log aparece, el paquete sí llega a la cadena \`INPUT\`: revisar qué regla lo bloquea después. Si no aparece, el paquete nunca llega — sospechar de DNS, un balanceador externo o un firewall de nube antes del servidor.

### 📋 Lo que debes recordar

* Política \`DROP\` por defecto, con excepciones explícitas: todo lo que se olvide queda bloqueado, no abierto.
* Antes de hacer \`flush\` de las reglas, establecer política \`ACCEPT\` temporalmente — de lo contrario, un \`flush\` con política \`DROP\` activa corta el acceso remoto de inmediato.
* Loopback y \`ESTABLISHED,RELATED\` siempre primero: sin estas reglas, servicios que sí tienen sus puertos abiertos igual dejan de funcionar.
* SSH restringido por origen (\`-s 10.10.0.0/16\`) reduce drásticamente la superficie de ataque frente a fuerza bruta desde Internet.
* Persistir las reglas (\`iptables-save\`, o el estado propio de \`ufw\`) es obligatorio: un firewall que desaparece al reiniciar da una falsa sensación de seguridad.
* Ante un servicio "que no responde", diagnosticar en orden: ¿escucha el proceso? → ¿responde localmente? → ¿el firewall lo bloquea? → ¿el paquete llega siquiera a la máquina?

### 🧪 Autoevaluación

1. En \`firewall-iptables.sh\`, ¿por qué se establece política \`ACCEPT\` al inicio del script antes de hacer \`flush\` de las reglas existentes?
2. Un servidor tiene \`ufw allow 443/tcp\` configurado, pero el cliente sigue sin poder conectar y \`tcpdump\` confirma que los paquetes SYN sí llegan a la interfaz de red. ¿Qué pasos seguirías a continuación?
3. ¿Por qué la regla de SSH usa \`-s 10.10.0.0/16\` en vez de dejar el puerto 22 abierto a cualquier origen?

---

1. Porque si se hace \`flush\` con la política \`DROP\` ya activa, las reglas que permitían el acceso SSH desaparecen momentáneamente pero la política \`DROP\` sigue en pie, bloqueando toda conexión remota — incluida la sesión SSH del propio administrador ejecutando el script. Establecer \`ACCEPT\` primero garantiza que el tráfico sigue fluyendo durante toda la transición, hasta que las nuevas reglas específicas quedan cargadas.
2. Primero, verificar que el proceso realmente escucha en \`0.0.0.0:443\` con \`ss -tlnp\`. Luego, probar localmente con \`curl -sk https://localhost\`. Después, confirmar con \`ufw status verbose\` que la regla existe tanto para IPv4 como para IPv6. Si todo eso es correcto, añadir una regla \`LOG\` temporal en \`iptables\` antes de la regla de permiso para confirmar si el paquete efectivamente llega a la cadena \`INPUT\`, y revisar si alguna otra herramienta (Docker, fail2ban) está insertando reglas que interfieren.
3. Restringir el origen reduce la superficie de ataque: aunque un atacante conozca que el puerto 22 existe, no puede ni siquiera intentar autenticarse si su tráfico no proviene de la red \`10.10.0.0/16\`. Dejar el puerto abierto a cualquier origen expone el servidor a intentos de fuerza bruta constantes desde Internet, incluso con autenticación por llave configurada correctamente.
`

export default content
