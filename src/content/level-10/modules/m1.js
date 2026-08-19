const content = `
## Módulo 1 — Arquitectura Netfilter: cómo filtra Linux el tráfico

### 🎯 Objetivos de aprendizaje

* Entender por qué un servidor sin firewall es un problema real.
* Conocer los 5 hooks de Netfilter y el flujo de un paquete por el kernel.
* Distinguir entre iptables, nftables y ufw como capas sobre Netfilter.
* Comprender stateful vs stateless filtering y el rol de conntrack.

### ❓ El problema real

Instalas un servidor web. El proceso \`nginx\` escucha en el puerto 80. Pero también tienes PostgreSQL en el puerto 5432, Redis en 6379 y una API interna en 8080. Por defecto, **todas esas puertas están abiertas a cualquier IP del mundo**. Un atacante puede intentar autenticarse en tu base de datos directamente desde Internet. La solución es un firewall: un mecanismo que decide qué paquetes pueden entrar, salir o pasar a través de tu sistema.

### 📖 Qué es Netfilter

Netfilter es el **framework del kernel Linux** que intercepta paquetes de red en puntos específicos del recorrido que hace cada paquete dentro del sistema operativo. No es un programa de usuario — vive en el espacio del kernel. iptables, nftables y ufw son herramientas de espacio de usuario que escriben reglas en Netfilter; el kernel ejecuta esas reglas a velocidad de hardware.

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Espacio de usuario","icon":"terminal","rows":["iptables","nftables","ufw","Herramientas que escriben reglas"]},{"title":"Espacio de kernel","icon":"chip","rows":["NETFILTER","hooks en la pila de red","Framework que ejecuta las reglas"]}],"vsLabel":"→"}
\`\`\`

### 📖 Los 5 hooks de Netfilter

Cada paquete que entra, sale o pasa por el sistema toca uno o más de estos puntos de intercepción:

\`\`\`diagram
{"type":"nested","container":{"title":"KERNEL LINUX","meta":"Hooks de Netfilter"},"items":[{"name":"PREROUTING","meta":"Antes de decidir routing","icon":"network"},{"name":"INPUT","meta":"Paquete destinado al host local"},{"name":"FORWARD","meta":"Paquete que pasa a través (no es para este host)"},{"name":"OUTPUT","meta":"Paquete generado por el host local"},{"name":"POSTROUTING","meta":"Después de routing, antes de salir","focal":true}],"external":[{"name":"Paquete entrante","icon":"network","side":"left"},{"name":"Paquete saliente","icon":"network","side":"right"}]}
\`\`\`

| Hook | Cuándo se ejecuta | Uso típico |
|------|-------------------|------------|
| **PREROUTING** | Antes de decidir routing | NAT de destino (DNAT), modificar paquetes entrantes |
| **INPUT** | Paquete destinado al host local | Filtrar tráfico que llega a este servidor |
| **FORWARD** | Paquete que pasa a través (no es para este host) | Firewall de red, router |
| **OUTPUT** | Paquete generado por el host local | Filtrar tráfico saliente |
| **POSTROUTING** | Después de decidir routing, antes de salir | NAT de origen (SNAT/MASQUERADE) |

### 📖 Diferencia entre iptables, nftables y ufw

Los tres usan Netfilter por debajo. La diferencia está en la interfaz:

\`\`\`diagram
{"type":"table-like","title":"iptables vs nftables vs ufw","rows":[{"key":"iptables","value":"1998, legado. Sintaxis clásica, ubicua, aún muy usada. Reglas separadas por tabla."},{"key":"nftables","value":"2014, sucesor oficial. Sintaxis unificada, mejor rendimiento, sets y mapas nativos. Default en Debian 10+, RHEL 8+, Ubuntu 20.04+."},{"key":"ufw","value":"2008, Ubuntu. Frontend de alto nivel sobre iptables/nftables. Ideal para casos simples."}]}
\`\`\`

### 📖 Stateless vs Stateful filtering: conntrack

Un firewall **stateless** evalúa cada paquete de forma independiente: solo mira la IP de origen, el puerto y el protocolo. Es simple pero incompleto — no puede distinguir si un paquete es respuesta legítima a una conexión que tú iniciaste.

Un firewall **stateful** usa **connection tracking (conntrack)**: el kernel lleva una tabla de todas las conexiones activas y puede clasificar cada paquete:

\`\`\`text
Estado conntrack     Significado
─────────────────    ──────────────────────────────────────────────────
NEW                  Primer paquete de una conexión nueva
ESTABLISHED          Paquete que pertenece a una conexión ya establecida
RELATED              Paquete relacionado con una conexión existente
                     (ej: FTP data channel, ICMP error)
INVALID              Paquete que no pertenece a ninguna conexión conocida
\`\`\`

La regla más importante de un firewall stateful:

\`\`\`bash
# Permitir tráfico de conexiones ya establecidas y relacionadas
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
\`\`\`

Esta regla sola permite que cualquier conexión que TÚ hayas iniciado reciba respuesta, sin abrir puertos específicos para el tráfico de retorno.

### 📋 Lo que debes recordar

* Netfilter vive en el kernel; iptables/nftables/ufw son herramientas de usuario.
* Los 5 hooks definen en qué punto del recorrido se puede interceptar un paquete.
* INPUT es para tráfico hacia el servidor; FORWARD es para tráfico que pasa a través.
* conntrack permite un firewall stateful: distingue respuestas legítimas de conexiones nuevas.

### 🧪 Autoevaluación

1. Un paquete llega desde Internet destinado a un proceso local (nginx). ¿Qué hooks de Netfilter atraviesa?
2. ¿Cuál es la diferencia entre un firewall stateless y uno stateful?
3. ¿Por qué ufw sigue usando Netfilter aunque sea una herramienta de "alto nivel"?

---

1. Atraviesa **PREROUTING** (antes del routing) y luego **INPUT** (porque el destino es el host local).
2. Un firewall **stateless** evalúa cada paquete de forma aislada. Un firewall **stateful** usa conntrack para rastrear el estado de las conexiones y permitir automáticamente el tráfico de retorno de conexiones establecidas.
3. Porque ufw es solo una **interfaz de usuario** — traduce sus comandos simples a reglas iptables o nftables, que son las que realmente escriben en Netfilter dentro del kernel.
`

export default content
