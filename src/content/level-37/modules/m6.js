const content = `
## Módulo 6 — Fallos de red y DNS: aislar la capa que falla

### 🎯 Objetivos de aprendizaje

* Aplicar el modelo de capas (interfaz → routing → DNS → aplicación) para aislar fallos de red.
* Diagnosticar problemas de interfaz y enrutamiento con \`ip\`, \`ping\` y \`traceroute\`.
* Diagnosticar problemas de resolución DNS con \`dig\` y distinguirlos de problemas de conectividad.
* Usar \`ss\` para verificar qué está (o no está) escuchando y en qué estado están las conexiones.
* Diferenciar un fallo de red real de un fallo de la aplicación que solo lo parece.

### ❓ El problema real

Un desarrollador reporta: "no puedo conectar a la API, debe ser un problema de red". El equipo de infraestructura revisa firewalls, switches y rutas durante una hora sin encontrar nada. Finalmente alguien ejecuta \`dig api.interno.local\` y descubre que el registro DNS simplemente no existe: nunca hubo problema de red, era un registro DNS faltante desde el principio. Sin un método para aislar por capas (¿falla la interfaz? ¿el routing? ¿el DNS? ¿la aplicación?), el diagnóstico de red se convierte en revisar todo sin orden, perdiendo tiempo en las capas equivocadas.

### 📖 El modelo de capas para diagnóstico de red

\`\`\`text
CAPA                  PREGUNTA QUE RESPONDE           HERRAMIENTA
─────────────────────────────────────────────────────────────────────────────
1. Interfaz            ¿La tarjeta de red está up      ip addr, ip link
                        y tiene IP asignada?
2. Routing local        ¿Hay una ruta hacia el          ip route, ping <gateway>
                        destino desde esta máquina?
3. Conectividad L3/L4   ¿El destino responde a nivel    ping, traceroute, mtr
                        de red/transporte?
4. DNS                  ¿El hostname resuelve a la      dig, nslookup
                        IP correcta?
5. Puerto/Servicio      ¿Algo escucha en el puerto      ss -tlnp, nc -zv
                        de destino?
6. Aplicación           ¿El servicio responde            curl -v, telnet
                        correctamente al protocolo?
\`\`\`

La estrategia es probar de la capa 1 hacia la 6 (o al revés si el síntoma ya sugiere una capa), descartando cada capa con una prueba concreta antes de pasar a la siguiente.

### 📖 Capa 1 — Interfaz de red

\`\`\`bash
# Estado de las interfaces: UP/DOWN, IP asignada
ip addr show
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
#     inet 10.0.0.15/24 brd 10.0.0.255 scope global eth0

# Si dice "DOWN" o "NO-CARRIER", el problema es físico/enlace, no de configuración
ip link show eth0

# Estadísticas de errores a nivel de interfaz (paquetes descartados, errores)
ip -s link show eth0
\`\`\`

### 📖 Capa 2 y 3 — Routing y conectividad

\`\`\`bash
# Tabla de rutas: ¿hay una ruta por defecto? ¿hacia dónde apunta?
ip route show
# default via 10.0.0.1 dev eth0
# 10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.15

# ¿Se puede alcanzar el gateway? (descarta problema de enlace local)
ping -c 3 10.0.0.1

# ¿Se puede alcanzar el destino? (descarta problema de ruta más allá del gateway)
ping -c 3 8.8.8.8

# traceroute: en qué salto exacto se pierde la conectividad
traceroute -n 8.8.8.8
# o, más informativo (combina ping + traceroute en tiempo real):
mtr -n 8.8.8.8
\`\`\`

\`\`\`text
REGLA DE AISLAMIENTO CON PING
─────────────────────────────────────────────────────────────────────────────
ping al gateway falla        → problema de capa 1/2 (enlace local, switch, cable)
ping al gateway funciona,
  ping a IP externa falla     → problema de routing más allá del gateway/firewall
ping a IP externa funciona,
  ping a hostname falla       → el problema es DNS, no conectividad de red
\`\`\`

### 📖 Capa 4 — DNS: aislar antes de acusar a la red

\`\`\`bash
# Resolución básica
dig api.interno.local +short

# Especificar un servidor DNS concreto para descartar el resolver local
dig @8.8.8.8 api.interno.local +short
dig @10.0.0.53 api.interno.local +short    # DNS interno de la organización

# Ver la respuesta completa, incluyendo el tiempo de respuesta y el servidor usado
dig api.interno.local
# ;; ANSWER SECTION:
# api.interno.local.  300  IN  A  10.0.0.42
# ;; Query time: 12 msec
# ;; SERVER: 10.0.0.53#53(10.0.0.53)

# Consultar qué resolvers está usando el sistema
cat /etc/resolv.conf
resolvectl status   # en sistemas con systemd-resolved
\`\`\`

\`\`\`text
DIAGNÓSTICO POR RESULTADO DE dig
─────────────────────────────────────────────────────────────────────────────
NXDOMAIN                    El registro no existe en absoluto (typo, o nunca
                             se creó); no es un problema de red
SERVFAIL                    El servidor DNS tuvo un error al resolver
                             (config del servidor, zona rota)
Sin respuesta / timeout      El servidor DNS no es alcanzable (problema de
                             red hacia el propio servidor DNS)
Responde pero con IP vieja   Problema de caché/TTL, no de resolución en sí
\`\`\`

\`\`\`bash
# Comparar la resolución local vs. un servidor externo confiable
# ayuda a descartar caché local corrupta o /etc/hosts mal configurado
cat /etc/hosts | grep -v '^#'
dig api.interno.local +short
dig @1.1.1.1 api.interno.local +short
\`\`\`

### 📖 Capa 5 y 6 — Puerto y aplicación

\`\`\`bash
# ¿Algo escucha en el puerto esperado, en esta máquina?
ss -tlnp | grep :443
# LISTEN 0 128 0.0.0.0:443 0.0.0.0:* users:(("nginx",pid=4821,fd=6))

# ¿El puerto es alcanzable DESDE OTRA máquina? (descarta firewall/NAT)
nc -zv 10.0.0.42 443
telnet 10.0.0.42 443

# Verbose HTTP: ver exactamente en qué fase falla (DNS, conexión, TLS, respuesta)
curl -v https://api.interno.local
# * Trying 10.0.0.42:443...
# * Connected to api.interno.local (10.0.0.42) port 443
# * SSL certificate problem: certificate has expired    ← causa real
\`\`\`

\`curl -v\` es especialmente valioso porque expone en qué fase exacta del proceso falla la conexión: resolución DNS, conexión TCP, handshake TLS, o respuesta HTTP — cada una apunta a una causa completamente distinta.

### 📖 Diferenciar "problema de red" de "problema de aplicación"

\`\`\`text
SÍNTOMA REPORTADO             CAPA REAL DEL PROBLEMA (frecuentemente)
─────────────────────────────────────────────────────────────────────────────
"No hay red"                   Casi siempre DNS o un firewall, rara vez la
                                interfaz física en entornos ya funcionando
"Timeout de conexión"          El paquete SYN no llega o la respuesta SYN-ACK
                                no vuelve: firewall, security group, ruta
"Connection refused"           SÍ hay red y el host responde, pero NADA
                                escucha en ese puerto — no es un problema de
                                red, es que el servicio no está corriendo
"502 Bad Gateway"               La red y el proxy funcionan; el backend
                                detrás del proxy es el que falla
\`\`\`

"Connection refused" es una respuesta activa del stack TCP/IP del destino (RST), lo cual en sí mismo prueba que la red SÍ funciona hasta ese host; el problema está en la capa de aplicación (el servicio no escucha), no en la red.

### 📋 Lo que debes recordar

* Aislar red significa probar en orden: interfaz → routing → conectividad → DNS → puerto → aplicación.
* \`ping\` al gateway vs. \`ping\` a una IP externa vs. \`ping\` a un hostname aíslan progresivamente enlace local, routing externo y DNS.
* \`dig @servidor\` permite comparar resolvers y descartar caché DNS local corrupta.
* "Connection refused" prueba que la red funciona: el problema está en que nada escucha en ese puerto, no en la red.
* \`curl -v\` muestra en qué fase exacta falla una conexión HTTP/TLS, acelerando el aislamiento drásticamente.
* NXDOMAIN no es un problema de red: significa que el registro DNS nunca existió.

### 🧪 Autoevaluación

1. \`ping\` al gateway funciona pero \`ping\` a un hostname externo falla. ¿En qué capa está el problema más probable?
2. Un cliente recibe "Connection refused" al intentar conectar a un servicio. ¿Es esto un problema de red?
3. \`curl -v\` muestra "SSL certificate problem: certificate has expired" después de conectar exitosamente al puerto 443. ¿Qué indica esto sobre las capas de red inferiores?

---

1. DNS. Si el gateway responde (capa 1/2 funcionando) pero un hostname no resuelve, mientras que \`ping\` a una IP externa sí funcionaría, el problema está en la resolución de nombres, no en la conectividad de red. Se debe verificar con \`dig\` contra distintos servidores DNS.
2. No. "Connection refused" es una respuesta activa (RST) del stack TCP/IP del host de destino, lo cual demuestra que la red funciona correctamente hasta esa máquina. El problema real es que ningún proceso está escuchando en el puerto solicitado — un problema de servicio/aplicación, no de red.
3. Indica que las capas inferiores funcionan correctamente: la interfaz, el routing, el DNS y el puerto TCP están bien, porque la conexión llegó hasta completar el handshake TCP y empezar el handshake TLS. El problema está aislado específicamente en la capa de aplicación/TLS: un certificado vencido, no en la red.
`

export default content
