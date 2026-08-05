const content = `
## Módulo 3 — dig, nslookup y host: consultas DNS avanzadas

### 🎯 Objetivos de aprendizaje
* Dominar la sintaxis completa de \`dig\` y leer todas las secciones de su salida
* Usar \`dig +trace\` para observar la resolución completa paso a paso
* Hacer consultas inversas, transferencias de zona y consultas DNSSEC
* Emplear \`nslookup\` en modo interactivo para diagnósticos rápidos
* Usar \`host\` para consultas concisas en scripts
* Aplicar estas herramientas para verificar MX, SPF y propagar cambios

### ❓ El problema real
Has configurado registros SPF y DKIM para tu dominio, pero el correo sigue llegando a spam en algunos destinos. Necesitas verificar que los registros están correctamente publicados, que los servidores MX apuntan a las IPs correctas, y que los cambios que hiciste hace 30 minutos ya se han propagado. Todo esto se hace desde la línea de comandos, sin acceso a paneles web.

### 📖 Anatomía de dig

\`dig\` (Domain Information Groper) es la herramienta de referencia para consultas DNS en Linux.

**Sintaxis básica:**
\`\`\`bash
dig [@servidor] [nombre] [tipo] [opciones]
\`\`\`

**Ejemplo completo con lectura de salida:**
\`\`\`bash
dig A www.example.com

; <<>> DiG 9.18.1 <<>> A www.example.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096

;; QUESTION SECTION:
;www.example.com.               IN      A

;; ANSWER SECTION:
www.example.com.        3600    IN      A       93.184.216.34

;; Query time: 23 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: Mon Jan 08 10:00:00 UTC 2024
;; MSG SIZE  rcvd: 56
\`\`\`

**Desglose de la salida:**
- \`status: NOERROR\` — consulta exitosa. Otros valores: \`NXDOMAIN\` (no existe), \`SERVFAIL\` (error en servidor), \`REFUSED\` (servidor rechazó la consulta)
- \`flags: qr rd ra\` — QR=es respuesta, RD=recursión pedida, RA=recursión disponible. La ausencia de \`aa\` indica que la respuesta viene de caché o de un resolver, no del autoritativo.
- \`ANSWER: 1\` — cuántos registros en la sección de respuesta
- \`3600\` — TTL restante en caché del resolver
- \`SERVER: 8.8.8.8\` — el resolver que respondió

### 📖 Opciones esenciales de dig

**Consultar un servidor específico:**
\`\`\`bash
# Consultar directamente el servidor autoritativo (saltando el resolver local)
dig @ns1.example.com A www.example.com

# Comparar respuesta de dos resolvers públicos
dig @8.8.8.8 A www.example.com
dig @1.1.1.1 A www.example.com
\`\`\`

**Salida compacta para scripts:**
\`\`\`bash
dig A www.example.com +short
# 93.184.216.34

dig MX example.com +short
# 10 mail1.example.com.
# 20 mail2.example.com.
\`\`\`

**Tipos de consulta:**
\`\`\`bash
dig MX example.com          # registros de correo
dig TXT example.com         # todos los registros TXT
dig NS example.com          # servidores de nombres
dig SOA example.com         # registro de autoridad
dig AAAA www.example.com    # IPv6
dig ANY example.com         # todos los tipos (resultado variable según servidor)
dig CAA example.com         # autorización de CA
\`\`\`

**Consulta inversa (PTR):**
\`\`\`bash
dig -x 93.184.216.34
# Equivalente a:
dig PTR 34.216.184.93.in-addr.arpa

# IPv6 inverso
dig -x 2606:2800:220:1:248:1893:25c8:1946
\`\`\`

### 📖 dig +trace: trazando la resolución completa

\`+trace\` hace que \`dig\` realice la resolución iterativa completa desde los root servers, mostrando cada paso:

\`\`\`bash
dig +trace www.example.com

# Salida abreviada:
.                       518400  IN      NS      a.root-servers.net.
.                       518400  IN      NS      b.root-servers.net.
# ... (los 13 root servers)
;; Received 525 bytes from 8.8.8.8#53(8.8.8.8) in 12 ms   ← consulta al resolver local

com.                    172800  IN      NS      a.gtld-servers.net.
# ...
;; Received 1170 bytes from 198.41.0.4#53(a.root-servers.net) in 8 ms  ← root server

example.com.            172800  IN      NS      a.iana-servers.net.
;; Received 512 bytes from 192.5.6.30#53(a.gtld-servers.net) in 9 ms  ← TLD server

www.example.com.        3600    IN      A       93.184.216.34
;; Received 56 bytes from 199.43.135.53#53(a.iana-servers.net) in 11 ms  ← autoritativo
\`\`\`

Esto permite ver exactamente qué servidor responde en cada nivel, identificar delegaciones rotas y verificar que el autoritativo tiene el registro correcto.

### 📖 Transferencia de zona con AXFR

AXFR solicita todos los registros de una zona (normalmente restringido):

\`\`\`bash
# Intentar transferencia de zona (suele estar bloqueada en producción)
dig @ns1.example.com example.com AXFR

# Si está permitido, muestra todos los registros:
# example.com.  IN  SOA  ...
# www           IN  A    93.184.216.34
# mail          IN  A    203.0.113.10
# ...

# Transferencia incremental (solo cambios desde serial N)
dig @ns1.example.com example.com IXFR=2024010800
\`\`\`

Si el servidor responde \`REFUSED\` o \`NOTAUTH\`, el AXFR está correctamente bloqueado (es lo esperado en producción).

### 📖 dig y DNSSEC

\`\`\`bash
# Solicitar registros DNSSEC (RRSIG, DNSKEY, DS)
dig +dnssec A www.example.com

# Deshabilitar validación DNSSEC del resolver (útil para debug)
dig +cd A www.example.com    # cd = Checking Disabled

# Ver la cadena de confianza DNSSEC
dig +dnssec +multi DNSKEY example.com
dig +dnssec DS example.com @a.gtld-servers.net
\`\`\`

### 📖 Opciones de formato útiles

\`\`\`bash
# Sin comentarios, solo la respuesta
dig +noall +answer A www.example.com

# Mostrar solo sección de autoridad
dig +noall +authority NS example.com

# Salida multilínea (más legible para DNSKEY, TXT largos)
dig +multi TXT example.com

# Sin recursión (consultar directamente un NS)
dig +norec @ns1.example.com A www.example.com

# Especificar puerto alternativo
dig -p 5353 @127.0.0.1 A www.example.com

# Con tiempo de espera personalizado
dig +time=2 +tries=1 A www.example.com @192.0.2.1
\`\`\`

### 📖 nslookup: consultas interactivas

\`nslookup\` es más antiguo que \`dig\` pero útil para diagnósticos rápidos e interactivos:

\`\`\`bash
# Modo no interactivo
nslookup www.example.com
nslookup www.example.com 8.8.8.8     # usar servidor específico

# Modo interactivo
nslookup
> server 8.8.8.8          # cambiar servidor
> set type=MX             # cambiar tipo de consulta
> example.com
> set type=TXT
> example.com
> set debug               # mostrar paquetes completos
> exit
\`\`\`

\`\`\`
Server:         8.8.8.8
Address:        8.8.8.8#53

Non-authoritative answer:    ← viene de caché del resolver
www.example.com     canonical name = example.com.
example.com         has address 93.184.216.34
\`\`\`

### 📖 host: la herramienta más concisa

\`host\` produce la salida más legible para humanos:

\`\`\`bash
# Resolución directa
host www.example.com
# www.example.com has address 93.184.216.34
# www.example.com has IPv6 address 2606:2800:220:1:248:1893:25c8:1946

# Resolución inversa
host 93.184.216.34
# 34.216.184.93.in-addr.arpa domain name pointer www.example.com.

# Tipo específico
host -t MX example.com
host -t TXT example.com

# Usar servidor específico
host www.example.com ns1.example.com
\`\`\`

### 📖 Casos prácticos

**Verificar propagación de un cambio:**
\`\`\`bash
# Consultar múltiples resolvers para ver si el cambio propagó
for ns in 8.8.8.8 1.1.1.1 9.9.9.9 208.67.222.222; do
  echo -n "\$ns: "
  dig @\$ns A www.example.com +short
done
\`\`\`

**Verificar configuración de correo completa:**
\`\`\`bash
DOMAIN="example.com"

echo "=== MX records ==="
dig MX \$DOMAIN +short

echo "=== SPF ==="
dig TXT \$DOMAIN +short | grep spf

echo "=== DMARC ==="
dig TXT _dmarc.\$DOMAIN +short

echo "=== DKIM (selector1) ==="
dig TXT selector1._domainkey.\$DOMAIN +short

echo "=== PTR del servidor MX ==="
MX_IP=\$(dig A mail.\$DOMAIN +short)
dig -x \$MX_IP +short
\`\`\`

**Verificar que el autoritativo tiene el registro correcto:**
\`\`\`bash
# Obtener los NS del dominio
NS=\$(dig NS example.com +short | head -1)
echo "NS: \$NS"

# Consultar directamente el autoritativo
dig @\$NS A www.example.com
# Si la respuesta tiene el flag 'aa', es autoritativa
\`\`\`

### 📋 Lo que debes recordar
* \`dig +short\` para scripts; sin opciones para diagnóstico completo.
* \`dig +trace\` simula la resolución iterativa completa y muestra cada servidor consultado.
* \`dig -x\` hace resolución inversa (PTR) automáticamente.
* La ausencia del flag \`aa\` significa que la respuesta viene de caché o de un resolver intermedio.
* \`NXDOMAIN\` = nombre no existe; \`SERVFAIL\` = error en el servidor DNS; \`REFUSED\` = el servidor rechazó la consulta.
* Para verificar propagación, consulta directamente el servidor autoritativo con \`@ns\`.

### 🧪 Autoevaluación
1. ¿Qué diferencia hay entre \`dig A www.example.com\` y \`dig @ns1.example.com A www.example.com +norec\`?
2. Ejecutas \`dig A www.example.com\` y ves que el TTL en la respuesta es 45 segundos, pero configuraste el registro con TTL de 3600. ¿Qué significa esto?
3. ¿Cómo verificarías, con un solo comando, que el registro SPF de \`example.com\` incluye la IP \`203.0.113.10\`?

---

1. El primer comando usa el resolver local (configurado en \`/etc/resolv.conf\`) y puede devolver una respuesta cacheada. El segundo consulta directamente el servidor autoritativo sin pedir recursión, obteniendo siempre la respuesta directa de la zona sin pasar por caché.
2. El TTL restante en la respuesta de \`dig\` es el tiempo que le queda al registro en la caché del resolver que respondió. Hace \`3600 - 45 = 3555\` segundos que el resolver cacheó ese registro. El TTL original sigue siendo 3600 en el servidor autoritativo.
3. \`dig TXT example.com +short | grep -o 'ip4:[^ ]*'\` — o más directo: \`dig TXT example.com +short\` y leer el registro SPF buscando la IP. Si se quiere verificar automáticamente: \`dig TXT example.com +short | grep '203.0.113.10'\`.
`

export default content
