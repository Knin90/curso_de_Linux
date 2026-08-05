const content = `
## Módulo 7 — Diagnóstico avanzado de routing: problemas reales

### 🎯 Objetivos de aprendizaje

* Diagnosticar sistemáticamente problemas de routing en producción.
* Identificar rutas asimétricas y sus consecuencias.
* Usar \`traceroute\`, \`mtr\` y \`ss\` para diagnóstico avanzado.
* Resolver los problemas más comunes: rutas faltantes, métricas incorrectas, RPF.

### ❓ El problema real

Recibes un ticket: "el servidor no puede conectar a la base de datos en 10.5.0.50". El servidor tiene conectividad general a internet, pero esa IP específica no responde. El problema puede estar en cualquier capa: routing local, firewall, routing del return path, o el destino mismo. Este módulo da un framework sistemático para diagnosticarlo.

### 📖 Framework de diagnóstico de routing

\`\`\`text
Ante cualquier problema de conectividad, siempre en este orden:

1. ¿Puedo alcanzar el host? (ping)
2. ¿Por qué ruta voy? (ip route get)
3. ¿Dónde se pierde el paquete? (traceroute/mtr)
4. ¿Llega TCP? (telnet/nc al puerto)
5. ¿El problema es solo en un sentido? (asymmetric routing)
6. ¿Hay reglas de firewall en el camino? (iptables -L)
\`\`\`

\`\`\`bash
# Paso 1: conectividad básica
ping -c 4 10.5.0.50
ping -c 4 -I eth1 10.5.0.50   # forzar interfaz específica

# Paso 2: verificar la ruta
ip route get 10.5.0.50
ip route get 10.5.0.50 from 192.168.1.100  # con IP origen explícita

# Paso 3: trazar el camino
traceroute 10.5.0.50
traceroute -n 10.5.0.50        # sin resolución DNS (más rápido)
traceroute -I 10.5.0.50        # usando ICMP en lugar de UDP

# mtr: traceroute continuo con estadísticas
mtr -n 10.5.0.50               # modo no-interactivo
mtr --report 10.5.0.50         # generar reporte y salir
mtr -n --report --report-cycles 20 10.5.0.50

# Paso 4: verificar capa TCP
nc -zv 10.5.0.50 5432          # test TCP al puerto de PostgreSQL
timeout 3 bash -c 'echo > /dev/tcp/10.5.0.50/5432' && echo "OPEN" || echo "CLOSED"
\`\`\`

### 📖 Diagnóstico de rutas asimétricas

El routing asimétrico ocurre cuando el paquete de ida toma un camino y el de vuelta toma otro. Esto puede romper conexiones TCP.

\`\`\`text
Escenario problemático:
  Cliente (10.0.0.5) → Servidor (192.168.1.100)
    Ida:    Cliente → Router A → Servidor
    Vuelta: Servidor → Router B → Cliente

Si Router B usa RPF (Reverse Path Filtering) y no ve una ruta de retorno
coherente, puede descartar el paquete de vuelta → la conexión TCP nunca
completa el handshake.
\`\`\`

\`\`\`bash
# Ver si RPF está activo (bloquea paquetes con routing asimétrico)
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.eth0.rp_filter
# 0 = desactivado
# 1 = strict: el paquete debe llegar por la interfaz que la tabla de routing
#             usaría para enviar a esa IP origen
# 2 = loose:  solo verifica que exista alguna ruta al origen

# Cambiar a modo loose (solución temporal)
sudo sysctl -w net.ipv4.conf.all.rp_filter=2

# Hacer persistente
echo "net.ipv4.conf.all.rp_filter = 2" | sudo tee -a /etc/sysctl.d/99-rp_filter.conf
sudo sysctl -p /etc/sysctl.d/99-rp_filter.conf
\`\`\`

### 📖 Problemas comunes y su resolución

\`\`\`bash
# PROBLEMA 1: Dos rutas default, se usa la equivocada
ip route show | grep default
# default via 10.0.0.1 dev eth0 metric 100
# default via 192.168.1.1 dev eth1 metric 100

# Solución: eliminar la no deseada o ajustar métricas
sudo ip route del default via 10.0.0.1 dev eth0
# O cambiar métrica para que eth1 sea preferida
sudo ip route change default via 192.168.1.1 dev eth1 metric 50

# PROBLEMA 2: Ruta más específica incorrecta
ip route get 10.5.0.50
# 10.5.0.50 via 10.0.0.1 dev eth0   ← va por eth0, debería ir por eth1

# Ver por qué: buscar la ruta que está ganando
ip route show | grep 10.5.0

# Agregar ruta más específica correcta
sudo ip route add 10.5.0.0/24 via 192.168.1.1 dev eth1

# PROBLEMA 3: Tabla de routing de una VPN interfiere con el tráfico normal
# La VPN agrega rutas más específicas que la default
ip route show | grep -E "0\\.0\\.0\\.0|tun0"

# Agregar excepciones antes de conectar la VPN
sudo ip route add 192.168.1.0/24 via 192.168.1.1 dev eth0
\`\`\`

### 📖 Análisis de conexiones activas con ss

\`\`\`bash
# Ver todas las conexiones establecidas con información de routing
ss -tn           # TCP establecidas
ss -tnp          # TCP con proceso
ss -tn state established

# Ver si una conexión específica usa la interfaz correcta
ss -tn dst 10.5.0.50

# Ver el socket con toda la información de routing
ss -tnoe dst 10.5.0.50
# Muestra: timer, retransmits, uid, ino, sk

# Diagnosticar por qué una conexión no levanta
ss -tn state syn-sent     # TCP en SYN enviado (esperando SYN-ACK)
ss -tn state time-wait    # TCP en TIME_WAIT (demasiados = problema de carga)

# Ver estadísticas de red generales
ss -s
\`\`\`

### 📋 Lo que debes recordar

* El orden de diagnóstico es: ping → ip route get → traceroute → nc al puerto. No saltarse pasos.
* El routing asimétrico puede romper TCP si RPF está en modo strict. El modo loose suele ser el compromiso correcto en producción con múltiples interfaces.
* \`ip route get <IP> from <mi-IP>\` simula el lookup de routing incluyendo la IP origen, que puede cambiar la decisión si hay policy routing.
* \`mtr --report\` genera un snapshot completo del camino con estadísticas de pérdida de paquetes por salto.

### 🧪 Autoevaluación

1. El ping a 10.5.0.50 funciona pero \`nc -zv 10.5.0.50 5432\` falla. ¿En qué capa está el problema?
2. \`ip route get 10.5.0.50\` muestra que el tráfico va por eth0, pero debería ir por eth1 (que tiene mayor velocidad). ¿Cómo lo corriges sin borrar la ruta existente?
3. ¿Qué es RPF y por qué puede causar problemas en un servidor con múltiples interfaces?

---

1. El problema está en la capa 4 (transporte) o superior — no en routing. El paquete ICMP llega (routing OK), pero el puerto TCP 5432 no responde. Las causas más probables: firewall bloqueando el puerto (iptables, nftables, o un firewall de host en el destino), el servicio PostgreSQL no está corriendo, o está escuchando solo en localhost (\`127.0.0.1\`) en lugar de en la IP de red.
2. Dos opciones: (a) cambiar la métrica de la ruta actual \`ip route change <red> via <gw> dev eth1 metric 50\` para que eth1 sea preferida sobre eth0, o (b) agregar una ruta más específica (\`ip route add 10.5.0.0/24 via <gw-eth1> dev eth1\`) que gane por LPM sobre la ruta actual menos específica.
3. RPF (Reverse Path Filtering) es una medida de seguridad del kernel que verifica que el paquete llegó por la interfaz "correcta": la misma que el kernel usaría para responder a esa IP origen. En modo strict, si hay routing asimétrico (el paquete de ida va por eth0 pero el de vuelta vendría por eth1), el kernel descarta el paquete de vuelta como "spoof". Esto rompe conexiones TCP legítimas. La solución es cambiar a modo loose (rp_filter=2) que solo verifica que exista alguna ruta al origen.
`

export default content
