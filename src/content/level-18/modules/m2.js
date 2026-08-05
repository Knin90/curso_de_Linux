const content = `
## Módulo 2 — Tipos de registros DNS: A, AAAA, CNAME, MX, TXT, SRV, PTR

### 🎯 Objetivos de aprendizaje
* Conocer el propósito y la sintaxis de cada tipo de registro DNS fundamental
* Entender las restricciones de CNAME y los errores comunes al usarlo
* Configurar correctamente registros MX con prioridad para routing de correo
* Leer e interpretar registros TXT para SPF, DKIM, DMARC
* Comprender el DNS inverso con PTR y su relación con /etc/hosts
* Conocer SOA, NS, CAA y su rol en la delegación y seguridad

### ❓ El problema real
El correo saliente de tu dominio llega a spam. Revisas el servidor y todo parece correcto, pero el destinatario reporta que fallan las verificaciones SPF y DKIM. También tienes un servicio VoIP que no encuentra los servidores SIP automáticamente. Todos estos problemas se resuelven entendiendo y configurando correctamente los tipos de registros DNS.

### 📖 Registros de dirección: A y AAAA

**Registro A** — mapea un nombre a una dirección IPv4.

\`\`\`dns-zone
; Sintaxis en archivo de zona
www       IN  A     93.184.216.34
mail      IN  A     203.0.113.10
@         IN  A     93.184.216.34   ; @ representa el apex del dominio
\`\`\`

**Registro AAAA** — mapea un nombre a una dirección IPv6.

\`\`\`dns-zone
www       IN  AAAA  2606:2800:220:1:248:1893:25c8:1946
mail      IN  AAAA  2001:db8::10
\`\`\`

Un mismo nombre puede tener múltiples registros A y/o AAAA (round-robin DNS para balanceo básico de carga). Los clientes modernos priorizan IPv6 (AAAA) cuando está disponible (RFC 6724).

### 📖 CNAME: alias de nombres

**Registro CNAME** — crea un alias que apunta a otro nombre (no a una IP). El resolver sigue la cadena hasta encontrar un registro A o AAAA.

\`\`\`dns-zone
ftp       IN  CNAME  www.example.com.
blog      IN  CNAME  example.ghost.io.
\`\`\`

**Restricciones críticas de CNAME:**

1. **No puede coexistir con otros registros del mismo nombre.** Esto hace imposible poner un CNAME en el apex del dominio (\`@\` o \`example.com\`), porque el apex siempre necesita registros NS y SOA. Usar \`ALIAS\` o \`ANAME\` (extensiones no estándar de algunos proveedores) es la alternativa.

2. **MX y NS no pueden apuntar a un CNAME.** RFC 2181 lo prohíbe. Un MX debe apuntar siempre a un registro A o AAAA.

3. **No encadenar CNAME → CNAME excesivamente.** Cada salto añade latencia. Máximo 2-3 saltos es la práctica recomendada.

\`\`\`bash
# Verificar la cadena de CNAME
dig CNAME blog.example.com +short
# blog.example.com → example.ghost.io → 104.18.27.13
\`\`\`

### 📖 MX: routing de correo

**Registro MX** — indica qué servidores aceptan correo para el dominio. Lleva un valor de **prioridad** (menor = mayor prioridad).

\`\`\`dns-zone
@   IN  MX  10  mail1.example.com.
@   IN  MX  20  mail2.example.com.
@   IN  MX  30  backup-mail.provider.com.
\`\`\`

El servidor de origen intenta primero el MX con prioridad 10. Si no responde, prueba el 20, luego el 30. Valores iguales de prioridad implican balanceo de carga aleatorio.

**Error frecuente:** apuntar MX a un CNAME (RFC 2181 §10.3 lo prohíbe). El servidor MX debe tener su propio registro A o AAAA.

\`\`\`bash
# Verificar registros MX
dig MX example.com
dig A mail1.example.com   # verificar que el MX resuelve a IP directa
\`\`\`

### 📖 TXT: texto arbitrario y autenticación de correo

**Registro TXT** — contiene texto arbitrario. Su uso principal hoy es la autenticación de correo y verificación de propiedad de dominio.

**SPF (Sender Policy Framework)** — define qué servidores pueden enviar correo en nombre del dominio:

\`\`\`dns-zone
@   IN  TXT  "v=spf1 ip4:203.0.113.0/24 include:_spf.google.com -all"
\`\`\`

- \`ip4:\` — IPs autorizadas directamente
- \`include:\` — delega a la política SPF de otro dominio
- \`-all\` — rechazar todo lo no listado (hard fail)
- \`~all\` — marcar como sospechoso (soft fail)

**DKIM (DomainKeys Identified Mail)** — clave pública para verificar firmas criptográficas en los mensajes:

\`\`\`dns-zone
selector1._domainkey  IN  TXT  "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA..."
\`\`\`

El selector (\`selector1\`) lo define el servidor de correo. La clave \`p=\` es la clave pública RSA.

**DMARC (Domain-based Message Authentication)** — política sobre qué hacer cuando SPF o DKIM fallan:

\`\`\`dns-zone
_dmarc  IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; pct=100"
\`\`\`

- \`p=none\` — solo monitorear
- \`p=quarantine\` — enviar a spam si falla
- \`p=reject\` — rechazar el mensaje si falla

**Verificación de propiedad** — muchos proveedores usan TXT para verificar que controlas el dominio:

\`\`\`dns-zone
@  IN  TXT  "google-site-verification=abc123xyz"
\`\`\`

### 📖 SRV: descubrimiento de servicios

**Registro SRV** — permite descubrir automáticamente qué host y puerto ofrece un servicio específico.

Formato: \`_servicio._protocolo.dominio  IN  SRV  prioridad  peso  puerto  destino\`

\`\`\`dns-zone
_sip._tcp.example.com.   IN  SRV  10  60  5060  sip1.example.com.
_sip._tcp.example.com.   IN  SRV  20  40  5060  sip2.example.com.
_xmpp-client._tcp        IN  SRV  5   100 5222  xmpp.example.com.
_ldaps._tcp              IN  SRV  0   100 636   ldap.example.com.
\`\`\`

- **Prioridad**: menor = mayor prioridad (igual que MX)
- **Peso**: usado para balanceo cuando la prioridad es igual (mayor peso = más tráfico)
- **Puerto**: el puerto donde escucha el servicio
- **Destino**: debe ser un nombre con registro A/AAAA (no un CNAME)

### 📖 PTR: DNS inverso

**Registro PTR** — mapea una IP a un nombre (resolución inversa). Usado para verificación anti-spam, logs, y herramientas como \`host\` o \`dig -x\`.

Las IPs inversas se representan en el dominio especial \`in-addr.arpa\` (IPv4) o \`ip6.arpa\` (IPv6):

\`\`\`dns-zone
; Para la IP 203.0.113.10 en la zona 113.0.203.in-addr.arpa
10  IN  PTR  mail.example.com.
\`\`\`

\`\`\`bash
# Consulta inversa
dig -x 203.0.113.10
dig PTR 10.113.0.203.in-addr.arpa
\`\`\`

**PTR vs /etc/hosts:** \`/etc/hosts\` es resolución local en el propio sistema y tiene precedencia sobre DNS (controlado por \`/etc/nsswitch.conf\`). PTR es la resolución inversa en el DNS público, visible para todos. No son lo mismo: puedes tener \`/etc/hosts\` para resolución local en tu red, y PTR en DNS para que el mundo externo haga reverse lookups.

**Quién controla el PTR:** el bloque IP lo gestiona el ISP o el proveedor cloud. Para tener un PTR correcto en tu IP de servidor, debes solicitárselo al proveedor o configurarlo en su panel (DigitalOcean, AWS EC2 hostname, etc.).

### 📖 NS y SOA: delegación y autoridad

**Registro NS** — indica qué servidores son autoritativos para una zona:

\`\`\`dns-zone
example.com.  IN  NS  ns1.example.com.
example.com.  IN  NS  ns2.example.com.
\`\`\`

**Registro SOA (Start of Authority)** — obligatorio en toda zona. Contiene metadatos administrativos:

\`\`\`dns-zone
example.com.  IN  SOA  ns1.example.com.  admin.example.com. (
                        2024010801  ; Serial (fecha + número de revisión)
                        3600        ; Refresh (secundarios consultan cada N seg)
                        900         ; Retry (si refresh falla, reintentar cada N seg)
                        604800      ; Expire (secundario deja de responder tras N seg sin sync)
                        300 )       ; Minimum TTL / caché negativa NXDOMAIN
\`\`\`

El **serial** debe incrementarse en cada cambio de zona; los servidores secundarios lo usan para detectar actualizaciones. Formato recomendado: YYYYMMDDNN (año, mes, día, revisión del día).

### 📖 CAA: autorización de emisión de certificados

**Registro CAA (Certification Authority Authorization)** — especifica qué CAs pueden emitir certificados TLS para el dominio. Las CAs están obligadas a consultar CAA antes de emitir.

\`\`\`dns-zone
example.com.  IN  CAA  0  issue    "letsencrypt.org"
example.com.  IN  CAA  0  issuewild ";"          ; prohibir wildcards
example.com.  IN  CAA  0  iodef    "mailto:security@example.com"
\`\`\`

### 📋 Lo que debes recordar
* CNAME no puede coexistir con otros registros del mismo nombre; nunca en el apex del dominio.
* MX y NS nunca apuntan a un CNAME; siempre a registros A/AAAA directos.
* SPF, DKIM y DMARC son registros TXT que trabajan juntos para autenticar correo.
* SRV permite descubrir servicios automáticamente (VoIP, LDAP, XMPP).
* PTR lo controla el proveedor del bloque IP, no el dueño del dominio.
* El serial del SOA debe incrementarse en cada modificación de zona.

### 🧪 Autoevaluación
1. ¿Por qué no se puede poner un CNAME en el apex del dominio (\`example.com\` sin subdominio)?
2. Tienes dos registros MX: prioridad 10 y prioridad 20. ¿Qué pasa si el servidor con prioridad 10 no está disponible?
3. Tu dominio tiene el registro TXT \`"v=spf1 include:_spf.google.com -all"\`. Un colega quiere añadir un nuevo servidor con IP \`198.51.100.5\`. ¿Cómo queda el registro?

---

1. El apex del dominio siempre debe tener registros NS y SOA. Un CNAME no puede coexistir con ningún otro registro en el mismo nombre, por lo que es técnicamente imposible.
2. El servidor de correo origen intenta el MX de prioridad 20. Si este tampoco responde, continuará reintentando periódicamente (hasta el límite de tiempo definido en su configuración) antes de devolver el correo como no entregable.
3. \`"v=spf1 ip4:198.51.100.5 include:_spf.google.com -all"\` — se añade el mecanismo \`ip4:\` antes del \`include:\` y el \`-all\`.
`

export default content
