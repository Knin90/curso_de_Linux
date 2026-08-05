const content = `
## Módulo 4 — ping, traceroute y mtr: diagnóstico de conectividad

### 🎯 Objetivos de aprendizaje

* Usar \`ping\` con opciones avanzadas para diagnóstico preciso de latencia y pérdida.
* Entender los tipos de mensajes ICMP relevantes para troubleshooting.
* Interpretar la salida de \`traceroute\` incluyendo asteriscos y saltos de alta latencia.
* Usar \`mtr\` para análisis continuo y detección de pérdida asimétrica.
* Distinguir entre pérdida de paquetes en un hop y alta latencia en un hop.

### ❓ El problema real

Un cliente reporta que la aplicación "va lenta". El servidor de aplicación responde en 50ms localmente. Pero desde la oficina del cliente, el tiempo de respuesta es de 800ms. ¿El problema está en el servidor? ¿En la red del cliente? ¿En algún hop intermedio? ¿Es pérdida de paquetes o alta latencia? Con \`ping\`, \`traceroute\` y \`mtr\` puedes localizar el problema a un segmento de red específico.

### 📖 ping: más allá del uso básico

\`ping\` envía paquetes ICMP Echo Request y espera ICMP Echo Reply. Es la herramienta de verificación de conectividad más básica, pero tiene opciones que pocos usan:

\`\`\`bash
# Básico: 4 paquetes
ping -c 4 8.8.8.8

# Cambiar el intervalo entre pings (default: 1 segundo)
ping -c 10 -i 0.2 8.8.8.8     # rápido: 0.2s entre paquetes

# Cambiar el tamaño del payload (útil para detectar problemas de MTU)
ping -c 4 -s 1472 8.8.8.8     # 1472 + 28 bytes ICMP+IP = 1500 (MTU standard)
ping -c 4 -s 8972 8.8.8.8     # jumbo frame: 8972 + 28 = 9000 (si la red lo soporta)

# No fragmentar (DF bit) — detectar MTU path
ping -c 4 -s 1472 -M do 8.8.8.8

# TTL específico (cuántos hops puede atravesar el paquete)
ping -c 4 -t 5 8.8.8.8        # solo llega hasta 5 hops

# Verbose: muestra también los ICMP de error
ping -v -c 4 8.8.8.8

# Ping de flood (requiere root) — test de throughput/stress
ping -f -c 10000 192.168.1.1
\`\`\`

\`\`\`text
# Salida normal de ping
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=11.2 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=11.4 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=118 time=11.1 ms
64 bytes from 8.8.8.8: icmp_seq=4 ttl=118 time=11.6 ms

--- 8.8.8.8 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 11.1/11.3/11.6/0.2 ms
\`\`\`

Métricas clave:
- **rtt min/avg/max**: latencia mínima, promedio y máxima. Si max es mucho mayor que avg, hay jitter (variabilidad) — problema para VoIP y videollamadas.
- **mdev**: desviación estándar de la latencia. mdev alto = jitter alto.
- **0% packet loss**: si hay pérdida, el porcentaje aparece aquí.
- **ttl=118**: el paquete llegó con TTL de 118. Si el destino envió con TTL=128 (Windows) o TTL=64/128 (Linux), calculamos hops = TTL_original - TTL_recibido.

### 📖 Tipos de ICMP relevantes

\`\`\`text
Tipo  Código  Nombre                    Causa habitual
──────────────────────────────────────────────────────────────────
0     0       Echo Reply                Respuesta normal a ping
3     0       Dest Unreachable: Net     La red destino no existe en tablas de routing
3     1       Dest Unreachable: Host    La red existe pero el host no responde ARP
3     3       Dest Unreachable: Port    El host destino no tiene proceso escuchando en ese puerto
3     4       Dest Unreachable: Fragmt  Un router necesita fragmentar pero DF bit está seteado
8     0       Echo Request              El ping saliente
11    0       Time Exceeded: TTL        Un router redujo TTL a 0 (normal en traceroute)
11    1       Time Exceeded: Reassembly Timeout de reensamblado de fragmentos
\`\`\`

El tipo 3 código 4 (Fragmentation Needed) es crítico: indica que hay un problema de MTU en el path. Es la causa de algunos problemas misteriosos donde el ping funciona pero conexiones TCP grandes fallan (el SYN es pequeño y pasa, pero los datos no).

### 📖 Detectar problemas de MTU path con ping

\`\`\`bash
# Buscar el MTU máximo del path haciendo ping con DF bit y diferentes tamaños
# Si -s 1472 funciona pero -s 1473 falla → MTU path = 1472 + 28 = 1500 (normal)
# Si -s 1400 falla → hay un segmento con MTU < 1428

ping -c 3 -s 1472 -M do 192.168.100.5   # OK: MTU OK
ping -c 3 -s 1450 -M do 192.168.100.5   # OK
ping -c 3 -s 1400 -M do 192.168.100.5   # FAIL: "Frag needed"
\`\`\`

\`\`\`text
# Salida cuando hay problema de MTU:
ping: local error: message too long, mtu=1400
\`\`\`

Esto explica la clase de bug donde SSH y HTTP pequeños funcionan, pero SCP o transferencias de archivos grandes se cuelgan — el VPN o túnel tiene MTU reducida y los paquetes grandes no pueden pasar.

### 📖 traceroute: mapeando el camino

\`traceroute\` envía paquetes con TTL incremental (1, 2, 3...). Cada router reduce el TTL en 1; cuando llega a 0, devuelve ICMP Time Exceeded con su IP. Así reconstruimos el camino:

\`\`\`bash
# Básico (usa UDP por defecto en Linux)
traceroute 8.8.8.8

# Sin resolución de nombres (más rápido)
traceroute -n 8.8.8.8

# Usando ICMP en lugar de UDP (como tracert de Windows)
traceroute -I 8.8.8.8

# Usando TCP al puerto 80 (pasa más firewalls)
traceroute -T -p 80 8.8.8.8

# Usando TCP al puerto 443 (aún más posibilidades de pasar)
traceroute -T -p 443 8.8.8.8

# Número de queries por hop (default 3)
traceroute -q 5 8.8.8.8

# Máximo de hops a explorar
traceroute -m 30 8.8.8.8
\`\`\`

\`\`\`text
# Salida de traceroute -n 8.8.8.8
traceroute to 8.8.8.8 (8.8.8.8), 30 hops max, 60 byte packets
 1  192.168.1.1     1.234 ms  1.198 ms  1.187 ms    ← gateway local
 2  10.0.0.1        5.432 ms  5.401 ms  5.389 ms    ← router del ISP
 3  72.14.215.165  11.234 ms  11.200 ms 11.188 ms
 4  * * *                                            ← router que filtra ICMP/UDP
 5  108.170.252.1  11.900 ms  11.876 ms  11.865 ms
 6  8.8.8.8        11.543 ms  11.521 ms  11.510 ms
\`\`\`

### 📖 Interpretación de traceroute

**¿Qué significa \`* * *\`?**

Un hop con \`* * *\` significa que ese router no devolvió ICMP Time Exceeded. Puede ser:
1. El router filtra ICMP/UDP saliente — pero el tráfico pasa igual.
2. El router tiene rate limiting en ICMP — no responde si hay demasiados.
3. El router realmente no responde (problema real).

La clave: si los hops posteriores al \`* * *\` responden, el router está funcionando — solo no responde a traceroute. Si los hops después también son \`* * *\` hasta el final, hay un problema real de routing o el destino es inalcanzable.

**Latencia alta en un hop intermedio:**

\`\`\`text
 3  router-isp.net   200 ms  200 ms  200 ms
 4  8.8.8.8           12 ms   12 ms   12 ms
\`\`\`

Esto parece raro — el hop 3 tiene 200ms pero el destino final tiene 12ms. Explicación: el hop 3 tiene rate limiting en ICMP (baja prioridad para los Time Exceeded que genera) pero forwardea el tráfico real normalmente. La latencia del hop 3 no es representativa del tráfico de datos.

**El indicador real de problema:** la latencia del hop N+1 es significativamente mayor que la del hop N, Y esa latencia alta persiste hasta el destino final.

### 📖 mtr: combinando ping y traceroute en tiempo real

\`mtr\` (Matt's Traceroute) hace traceroute continuo y acumula estadísticas de pérdida y latencia por hop. Es la herramienta más completa para diagnóstico de red:

\`\`\`bash
# Interactivo (actualiza en pantalla)
mtr 8.8.8.8

# Reporte estático (100 paquetes y sale)
mtr --report --report-cycles 100 8.8.8.8

# Sin resolución de nombres
mtr -n --report --report-cycles 50 8.8.8.8

# Usando TCP en lugar de ICMP (para redes que filtran ICMP)
mtr --tcp --port 80 --report --report-cycles 30 8.8.8.8

# Cambiar intervalo entre paquetes (default 1 segundo)
mtr --interval 0.5 --report --report-cycles 60 8.8.8.8
\`\`\`

\`\`\`text
# Salida de mtr --report -n --report-cycles 100 8.8.8.8
Start: 2024-01-15T10:23:45+0000
HOST: servidor                    Loss%   Snt   Last   Avg  Best  Wrst StDev
  1. 192.168.1.1                   0.0%   100    1.2   1.3   1.1   2.1   0.2
  2. 10.0.0.1                      0.0%   100    5.4   5.5   5.2   6.1   0.3
  3. 72.14.215.165                  0.0%   100   11.2  11.3  11.0  12.1   0.2
  4. ???                          100.0%   100    0.0   0.0   0.0   0.0   0.0
  5. 108.170.252.1                  0.0%   100   11.8  11.9  11.5  12.5   0.2
  6. 8.8.8.8                        0.0%   100   11.5  11.6  11.3  12.1   0.2
\`\`\`

Columnas:
- **Loss%**: porcentaje de paquetes perdidos en ese hop.
- **Snt**: paquetes enviados.
- **Last/Avg/Best/Wrst**: última, promedio, mejor y peor latencia.
- **StDev**: desviación estándar (jitter).

### 📖 Detectar pérdida de paquetes real vs rate limiting

Esta es la distinción más importante al leer \`mtr\`:

\`\`\`text
Escenario 1: Rate limiting (no es un problema)
  1. 192.168.1.1    0.0%    100   1.2  1.3  1.1  2.1  0.2
  2. 10.0.0.1      20.0%    100   5.4  5.5  5.2  6.1  0.3   ← 20% "pérdida"
  3. 8.8.8.8        0.0%    100  11.5 11.6 11.3 12.1  0.2   ← 0% pérdida al final

→ El hop 2 tiene 20% "pérdida" pero el destino tiene 0%.
→ Conclusión: el hop 2 aplica rate limiting a ICMP, pero forwardea el tráfico real.
→ No hay problema real.

Escenario 2: Pérdida real (hay un problema)
  1. 192.168.1.1    0.0%    100   1.2  1.3  1.1  2.1  0.2
  2. 10.0.0.1       0.0%    100   5.4  5.5  5.2  6.1  0.3
  3. 72.14.215.165 18.0%    100  11.2 11.3 11.0 12.1  0.2   ← 18% pérdida
  4. 8.8.8.8       18.0%    100  11.5 11.6 11.3 12.1  0.2   ← 18% pérdida al final

→ La pérdida se origina en el hop 3 y se mantiene hasta el destino.
→ Conclusión: hay pérdida de paquetes real entre hop 2 y hop 3.
→ El problema está en ese segmento de red.
\`\`\`

**Regla práctica**: si el porcentaje de pérdida en un hop intermedio es mayor que en el destino final, es rate limiting. Si es igual o mayor al del destino, la pérdida es real y se origina en ese hop.

### 📖 Routing asimétrico

El routing en Internet es frecuentemente asimétrico: el paquete va por un camino y la respuesta vuelve por otro. Esto complica el diagnóstico:

\`\`\`bash
# Ejecutar mtr desde el servidor al cliente Y desde el cliente al servidor
# Un camino puede tener pérdida en una sola dirección

# Desde servidor A
mtr --report -n --report-cycles 50 IP_CLIENTE

# Desde servidor B (el cliente)
mtr --report -n --report-cycles 50 IP_SERVIDOR
\`\`\`

Si el problema es solo en una dirección, el segmento problemático está en esa ruta específica. El routing asimétrico también explica por qué TCP funciona bien (ACKs vuelven por otro camino) pero \`ping\` muestra alta latencia.

### 📋 Lo que debes recordar

* \`ping -s 1472 -M do\` detecta problemas de MTU path — si falla con tamaños grandes pero funciona con pequeños, hay un segmento con MTU reducida (VPN, túnel).
* ICMP tipo 3 código 4 (Fragmentation Needed) es la señal de MTU path problem — causa bugs donde SSH funciona pero transferencias grandes se cuelgan.
* \`* * *\` en traceroute no siempre es un problema — si los hops siguientes responden, el router solo filtra ICMP pero forwardea el tráfico.
* Latencia alta en un hop intermedio seguida de latencia normal en el destino = rate limiting ICMP, no un problema real.
* En \`mtr\`, la pérdida es real solo si se mantiene o aumenta desde el hop problemático hasta el destino final.
* El routing es asimétrico — siempre ejecutar \`mtr\` en ambas direcciones para diagnóstico completo.

### 🧪 Autoevaluación

1. \`mtr\` muestra 15% de pérdida en el hop 4, pero 0% de pérdida en el hop 5 (el destino final). ¿Qué significa esto y cuál es el diagnóstico correcto?
2. Las conexiones SSH a un servidor funcionan, pero cuando haces SCP de archivos grandes, la transferencia se cuelga después de unos segundos. \`ping\` al servidor funciona perfectamente. ¿Cuál es la causa más probable y cómo la diagnosticas?
3. ¿Por qué \`traceroute -T -p 443 destino\` puede llegar a un destino donde \`traceroute destino\` (UDP) muestra \`* * *\` desde cierto hop en adelante?

---

1. La pérdida del 15% en el hop 4 pero 0% en el destino es rate limiting ICMP. El hop 4 limita la velocidad a la que genera mensajes ICMP Time Exceeded (para proteger su CPU) pero forwardea el tráfico de datos normalmente. El diagnóstico correcto: no hay pérdida de paquetes real. La evidencia es que el destino final tiene 0% de pérdida — si hubiera pérdida real en hop 4, el destino también la mostraría.
2. La causa más probable es un problema de MTU path. El SYN de SSH es pequeño y pasa, pero los paquetes de datos de SCP son grandes y quedan bloqueados por un segmento de red (VPN, túnel GRE, PPPoE) con MTU reducida. El diagnóstico: \`ping -c 3 -s 1472 -M do IP_SERVIDOR\` — si falla, hay MTU path problem. Luego reducir el tamaño (-s 1400, -s 1350) hasta encontrar el máximo que pasa. La solución puede ser ajustar MSS con iptables (\`TCPMSS\`) o configurar el MTU del túnel.
3. Muchos firewalls y dispositivos de red bloquean el tráfico UDP a puertos altos (que usa traceroute por defecto) pero permiten TCP/443 (HTTPS) porque es tráfico web legítimo. \`traceroute -T -p 443\` usa paquetes TCP con flags SYN, que los firewalls dejan pasar asumiendo que es una conexión HTTPS real. El router que generaba los \`* * *\` sí lo deja pasar, y los hops siguientes también, permitiendo ver el camino completo.
`

export default content
