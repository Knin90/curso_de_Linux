const content = `
## Módulo 8 — Hardening de red y laboratorios integrados

### 🎯 Objetivos de aprendizaje

* Aplicar el principio de mínimo privilegio a la configuración de firewall.
* Construir rulesets completos de producción con iptables y ufw.
* Diagnosticar un servicio no accesible usando el árbol de decisión completo.
* Implementar protecciones contra ataques de red comunes.

### ❓ El principio de mínimo privilegio aplicado al firewall

El principio de mínimo privilegio dice: **un sistema solo debe tener acceso a exactamente lo que necesita para funcionar, y nada más**. Aplicado al firewall:

\`\`\`text
MODELO ERRÓNEO (permisivo con excepciones):
  Política: ACCEPT todo
  Regla: BLOQUEAR lo que sé que es peligroso
  Problema: todo lo que no conoces como peligroso queda abierto

MODELO CORRECTO (restrictivo con excepciones explícitas):
  Política: DROP todo
  Regla: PERMITIR solo lo que necesita el servicio
  Ventaja: todo lo que olvidas queda bloqueado por defecto
\`\`\`

---

### 🔬 Laboratorio 1: Ruleset completo de producción con iptables

Servidor web en producción que sirve HTTP, HTTPS y SSH. Solo el equipo de administración (10.10.0.0/16) puede acceder por SSH.

\`\`\`bash
#!/bin/bash
# firewall-produccion.sh
# Servidor web de producción

set -e  # Salir si cualquier comando falla

echo "[+] Configurando firewall de producción..."

# ── FASE 1: RESET SEGURO ─────────────────────────────────────────────────────
# Política permisiva durante la transición (no quedar bloqueado)
iptables -P INPUT   ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT  ACCEPT

# Eliminar reglas y cadenas existentes
iptables -F   # Flush todas las cadenas
iptables -X   # Eliminar cadenas personalizadas
iptables -Z   # Resetear contadores

# ── FASE 2: LOOPBACK ─────────────────────────────────────────────────────────
iptables -A INPUT  -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# ── FASE 3: CONEXIONES ESTABLECIDAS ──────────────────────────────────────────
# Permite el tráfico de retorno de conexiones que iniciamos nosotros
iptables -A INPUT  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Descartar paquetes inválidos (no pertenecen a ninguna conexión conocida)
iptables -A INPUT  -m conntrack --ctstate INVALID -j DROP

# ── FASE 4: SSH RESTRINGIDO ───────────────────────────────────────────────────
# Solo desde la red de administración
iptables -A INPUT -p tcp --dport 22 -s 10.10.0.0/16 -j ACCEPT

# ── FASE 5: WEB PÚBLICO ───────────────────────────────────────────────────────
iptables -A INPUT -p tcp --dport 80  -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# ── FASE 6: ICMP LIMITADO ─────────────────────────────────────────────────────
# Permitir ping pero con rate limiting (evitar flood)
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 5/min --limit-burst 10 -j ACCEPT
iptables -A INPUT -p icmp --icmp-type echo-request -j DROP  # Descartar el exceso

# ── FASE 7: LOGGING DEL TRÁFICO BLOQUEADO ─────────────────────────────────────
iptables -A INPUT -j LOG --log-prefix "FW-DROP: " --log-level 4

# ── FASE 8: POLÍTICA RESTRICTIVA ──────────────────────────────────────────────
iptables -P INPUT   DROP
iptables -P FORWARD DROP
iptables -P OUTPUT  ACCEPT   # Permitir salida (el servidor puede hacer curl, apt, etc.)

# ── FASE 9: PERSISTENCIA ──────────────────────────────────────────────────────
iptables-save > /etc/iptables/rules.v4
echo "[+] Reglas guardadas en /etc/iptables/rules.v4"

# ── VERIFICACIÓN ──────────────────────────────────────────────────────────────
echo "[+] Ruleset activo:"
iptables -L -v -n
\`\`\`

---

### 🔬 Laboratorio 2: Ruleset con ufw para servidor web

Mismo escenario pero usando ufw (más rápido para Ubuntu):

\`\`\`bash
#!/bin/bash
# firewall-ufw.sh

echo "[+] Configurando firewall con ufw..."

# 1. Política por defecto antes de activar
ufw default deny incoming
ufw default allow outgoing
ufw default deny forward

# 2. SSH solo desde red de administración
ufw allow from 10.10.0.0/16 to any port 22 proto tcp

# 3. Web público
ufw allow 80/tcp
ufw allow 443/tcp

# 4. Activar (solo si no está ya activo)
ufw --force enable

# 5. Verificar
echo "[+] Estado del firewall:"
ufw status verbose
\`\`\`

---

### 🔬 Laboratorio 3: Diagnóstico — aplicación no responde

Guión: el equipo de QA reporta que "https://miservidor.com no responde". Sigue este procedimiento:

\`\`\`bash
# ── PASO 1: ¿La app está corriendo y escuchando? ──────────────────────────────
ss -tlnp | grep ':443'
# Salida esperada: algo como:
# LISTEN  0  511  0.0.0.0:443  0.0.0.0:*  users:(("nginx",pid=1234,...))
#
# Si no hay output → nginx no está corriendo
#   systemctl status nginx
#   systemctl start nginx

# ── PASO 2: ¿Funciona localmente? ─────────────────────────────────────────────
curl -sk https://localhost -o /dev/null -w "%{http_code}\n"
# Esperado: 200 (o el código HTTP de tu app)
# Si falla → problema de configuración de nginx o certificado

# ── PASO 3: ¿Llegan paquetes? ─────────────────────────────────────────────────
# (Ejecutar en una terminal separada mientras el cliente reintenta)
tcpdump -i eth0 -n 'tcp port 443 and tcp[tcpflags] & tcp-syn != 0'
# Si no aparecen paquetes SYN → problema de red externa o DNS
# Si aparecen SYN → continuar al paso 4

# ── PASO 4: ¿El firewall bloquea? ─────────────────────────────────────────────
iptables -L INPUT -v -n | grep -E "443|DROP|REJECT"
# Buscar: ¿hay una regla DROP antes de la regla que permite 443?
# ¿Los contadores de la regla DROP están subiendo?

# Alternativa: añadir LOG temporal
iptables -I INPUT 1 -p tcp --dport 443 -j LOG --log-prefix "DEBUG-443: "
# Cliente reintenta...
journalctl -k --since "1 min ago" | grep "DEBUG-443"
# Si aparece log: el paquete llega → buscar qué lo bloquea después
# Si no aparece log: el paquete no llega a INPUT (¿PREROUTING/DNAT?)
# Limpiar regla temporal:
iptables -D INPUT -p tcp --dport 443 -j LOG --log-prefix "DEBUG-443: "

# ── PASO 5: Con ufw ───────────────────────────────────────────────────────────
ufw status verbose | grep 443
# ¿Hay regla ALLOW para 443? Si no → ufw allow 443/tcp
\`\`\`

---

### 📖 Protección contra ataques comunes

**1. Rate limiting SSH (contra fuerza bruta):**

\`\`\`bash
# Bloquear IPs que intentan más de 4 conexiones SSH en 60 segundos
iptables -A INPUT -p tcp --dport 22 -m recent --name SSH --rcheck --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -m recent --name SSH --set -j ACCEPT

# Con ufw (más simple):
# ufw limit ssh/tcp  ← limita a 6 intentos en 30 segundos
\`\`\`

**2. Drop de paquetes inválidos:**

\`\`\`bash
# Paquetes que no pertenecen a ninguna conexión conocida
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# Paquetes con flags TCP imposibles (fingerprinting/ataques)
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP        # Null scan
iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP         # XMAS scan
iptables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j DROP # SYN+RST (imposible)
iptables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP # SYN+FIN (imposible)
\`\`\`

**3. Limitación de ping flood:**

\`\`\`bash
# Permitir ping pero máximo 1 por segundo, con burst de 5
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s --limit-burst 5 -j ACCEPT
iptables -A INPUT -p icmp --icmp-type echo-request -j DROP
\`\`\`

**4. Protección SYN flood:**

\`\`\`bash
# Limitar nuevas conexiones TCP (SYN) — protección contra SYN flood básico
iptables -A INPUT -p tcp --syn -m limit --limit 25/s --limit-burst 50 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

# Mejor: habilitar SYN cookies en el kernel
echo 1 > /proc/sys/net/ipv4/tcp_syncookies
# Permanente:
echo "net.ipv4.tcp_syncookies = 1" >> /etc/sysctl.conf
\`\`\`

---

### 📋 Tabla resumen de comandos del nivel

\`\`\`text
COMANDO                                          PROPÓSITO
───────────────────────────────────────────────  ────────────────────────────────────────
iptables -L -v -n                                Ver reglas con contadores, sin DNS
iptables -L -n --line-numbers                    Ver reglas con números de línea
iptables -A INPUT -p tcp --dport 22 -j ACCEPT   Añadir regla al final
iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT  Insertar en posición 1
iptables -D INPUT 3                              Eliminar regla número 3
iptables -F                                      Flush: eliminar todas las reglas
iptables -P INPUT DROP                           Establecer política por defecto
iptables-save > /etc/iptables/rules.v4           Persistir reglas
iptables-restore < /etc/iptables/rules.v4        Restaurar reglas
─────────────────────────────────────────────────────────────────────────────────────────
nft list ruleset                                 Ver todo el ruleset de nftables
nft -f /etc/nftables.conf                        Cargar configuración
nft add element inet fw blocklist { IP }         Añadir IP a un set dinámicamente
─────────────────────────────────────────────────────────────────────────────────────────
ufw status verbose                               Estado completo de ufw
ufw allow 22/tcp                                 Permitir puerto
ufw deny from IP                                 Bloquear IP
ufw delete allow 80/tcp                          Eliminar regla
ufw logging medium                               Activar logging
─────────────────────────────────────────────────────────────────────────────────────────
tcpdump -i eth0 port 80                          Capturar tráfico en puerto 80
ss -tlnp | grep :80                              Ver qué proceso escucha en 80
conntrack -L -p tcp                              Ver conexiones TCP rastreadas
journalctl -k -f | grep FW-DROP                 Seguir logs del firewall
\`\`\`

---

### 📋 Reglas de oro del firewall en producción

1. **Política DROP primero.** Bloquear todo y abrir solo lo necesario. Nunca al revés.

2. **SSH primero.** Antes de cerrar INPUT, asegúrate de que SSH está permitido — o perderás acceso remoto.

3. **Loopback y ESTABLISHED siempre.** Sin estas dos reglas, muchas cosas dejan de funcionar aunque tengas los puertos correctos.

4. **Persiste las reglas.** Un firewall que desaparece al reiniciar no es un firewall — es una falsa sensación de seguridad.

5. **Documenta cada regla.** En seis meses no recordarás por qué abriste el puerto 8080. Usa comentarios en el script.

6. **Prueba antes de aplicar en producción.** Usa un entorno idéntico o prueba con \`iptables -C\` (check) para verificar que la regla sería válida.

7. **Monitoriza los logs.** Un firewall sin logging es mudo. Los logs revelan intentos de intrusión, servicios mal configurados y errores de conectividad.

8. **Principio de mínimo acceso.** Cierra puertos por IP cuando sea posible: si solo tu equipo usa SSH, limítalo a tu IP o red.

### 🧪 Autoevaluación

1. En el laboratorio 1, ¿por qué se establece política ACCEPT al inicio del script antes de hacer flush?
2. Un servidor tiene \`ufw allow 443/tcp\` configurado pero el cliente sigue sin conectar. tcpdump muestra que los paquetes SYN llegan. ¿Qué pasos seguirías?
3. ¿Por qué los paquetes con flags SYN+RST simultáneos son señal de un ataque y deben descartarse?

---

1. Porque si se hace flush con política DROP activa, las reglas que permitían el acceso SSH desaparecen pero la política DROP permanece, **bloqueando la conexión remota** inmediatamente. Establecer ACCEPT primero garantiza que el tráfico fluye libremente durante la transición.
2. Pasos: (1) verificar que nginx escucha en \`0.0.0.0:443\` con \`ss -tlnp\`, (2) probar localmente con \`curl -sk https://localhost\`, (3) revisar \`ufw status verbose\` para confirmar que la regla existe para IPv4 Y IPv6, (4) añadir regla LOG temporal antes de la regla ACCEPT para ver si el paquete llega a iptables, (5) comprobar si hay otras herramientas (Docker, fail2ban) que puedan estar añadiendo reglas que interfieran.
3. En el protocolo TCP, SYN indica inicio de conexión y RST indica cierre/rechazo. **Ambos flags no pueden ocurrir simultáneamente en un paquete legítimo** — es una combinación imposible en TCP normal. Los paquetes SYN+RST son generados por herramientas de escaneo o ataque para confundir implementaciones de firewall; descartarlos es siempre seguro.
`

export default content
