const content = `
## Módulo 1 — Protocolo DNS: jerarquía, resolución recursiva e iterativa

### 🎯 Objetivos de aprendizaje
* Comprender la jerarquía del sistema DNS y el rol de cada tipo de servidor
* Distinguir con precisión la resolución recursiva de la iterativa
* Trazar el camino completo que recorre una consulta DNS desde el cliente hasta la respuesta autoritativa
* Interpretar el papel de TTL, caché negativa y el formato del mensaje DNS
* Entender cómo /etc/resolv.conf influye en la resolución de nombres en Linux

### ❓ El problema real
Tu equipo acaba de migrar la infraestructura de un datacenter a otro. Los registros DNS se actualizaron hace dos horas, pero algunos clientes siguen resolviendo las IPs antiguas. Tu manager pregunta: "¿Cuánto tiempo más va a tardar esto en propagarse?". Para responder con precisión —y saber cómo reducir ese tiempo la próxima vez— necesitas entender exactamente cómo funciona DNS internamente.

### 📖 La jerarquía DNS

DNS es un sistema distribuido de nombres organizado como un árbol invertido. Cada nodo del árbol es una zona DNS administrada de forma independiente.

\`\`\`
                        . (raíz)
                        |
          ┌─────────────┼─────────────┐
         com           net           org
          |
    ┌─────┴─────┐
  example     google
      |
     www
\`\`\`

**Niveles de la jerarquía:**

1. **Zona raíz (\`.\`)** — Los 13 clústeres de root name servers (a.root-servers.net … m.root-servers.net). Conocen qué servidores son autoritativos para cada TLD.

2. **TLD (Top-Level Domain)** — \`.com\`, \`.net\`, \`.es\`, \`.io\`. Gestionados por registros (Verisign para \`.com\`). Conocen qué servidores son autoritativos para cada dominio bajo ese TLD.

3. **Servidor autoritativo del dominio** — Administrado por el propietario del dominio. Tiene la respuesta definitiva para los registros de esa zona. Una respuesta autoritativa lleva el flag **AA (Authoritative Answer)** activado.

4. **Resolver recursivo** — No es autoritativo para nada; su trabajo es encontrar la respuesta por ti consultando la jerarquía. Es lo que configuras en \`/etc/resolv.conf\`.

### 📖 Resolución recursiva vs. iterativa

**Resolución iterativa** — El resolver hace todo el trabajo. El cliente pregunta al resolver, y el resolver consulta servidor por servidor siguiendo la jerarquía.

\`\`\`
Cliente → Resolver recursivo → Root NS → TLD NS → Autoritativo → Resolver → Cliente
\`\`\`

Paso a paso para \`www.example.com\`:

1. El cliente envía la consulta al resolver configurado en \`/etc/resolv.conf\` (p. ej., \`8.8.8.8\`).
2. El resolver no tiene la respuesta en caché. Consulta a un root server: *"¿Quién sabe de \`.com\`?"*
3. El root server responde: *"Estos son los servidores NS de \`.com\`"* (no es la respuesta final, es una referencia).
4. El resolver consulta al TLD de \`.com\`: *"¿Quién sabe de \`example.com\`?"*
5. El TLD responde con los NS autoritativos de \`example.com\`.
6. El resolver consulta al servidor autoritativo de \`example.com\`: *"Dame el registro A de \`www\`"*.
7. El autoritativo responde con la IP. El resolver cachea el resultado y lo entrega al cliente.

**Resolución recursiva (desde el punto de vista del cliente)** — Para el cliente, la interacción es simple: pregunta al resolver y recibe la respuesta. La complejidad está oculta en el resolver.

El servidor también puede responder con el flag **RD (Recursion Desired)** activado, indicando que el cliente pide recursión. El flag **RA (Recursion Available)** en la respuesta indica que el servidor puede hacerlo.

### 📖 TTL y caché

**TTL (Time To Live)** — Cada registro DNS tiene un TTL en segundos. Indica cuánto tiempo un resolver puede cachear esa respuesta sin volver a consultar al autoritativo.

\`\`\`bash
# Ver el TTL de un registro
dig A www.example.com

# Salida relevante:
# www.example.com.  3600  IN  A  93.184.216.34
#                   ^^^^
#                   TTL en segundos (1 hora)
\`\`\`

**Caché negativa** — Cuando un nombre no existe (respuesta NXDOMAIN), los resolvers también cachean esa respuesta durante el tiempo indicado en el campo **minimum TTL del registro SOA** de la zona. Esto evita que se martillee al servidor autoritativo con consultas de nombres inexistentes.

**Impacto en migraciones:** Si el TTL era de 86400 (24 horas), los clientes con la respuesta cacheada seguirán viendo la IP antigua hasta que expire su caché. La práctica correcta es reducir el TTL a 300 segundos antes de la migración.

### 📖 DNS sobre UDP y TCP (puerto 53)

DNS usa **UDP/53** por defecto para consultas normales: es rápido y sin conexión, suficiente para respuestas pequeñas.

DNS usa **TCP/53** cuando:
- La respuesta supera 512 bytes (límite original de UDP; con EDNS0 el límite sube a 4096 bytes).
- Se realizan transferencias de zona (AXFR).
- El servidor indica con el flag **TC (Truncated)** que la respuesta fue truncada; el cliente reintenta con TCP.

\`\`\`bash
# Forzar consulta por TCP
dig +tcp A www.example.com

# Ver si hay truncamiento
dig ANY example.com | grep "flags:"
\`\`\`

### 📖 Formato del mensaje DNS

Un mensaje DNS tiene cuatro secciones:

\`\`\`
┌─────────────────────────────────────┐
│ HEADER (12 bytes fijos)             │
│  ID, QR, OPCODE, AA, TC, RD, RA,   │
│  RCODE, QDCOUNT, ANCOUNT,          │
│  NSCOUNT, ARCOUNT                   │
├─────────────────────────────────────┤
│ QUESTION — qué se pregunta          │
│  QNAME, QTYPE (A/MX/etc), QCLASS   │
├─────────────────────────────────────┤
│ ANSWER — respuestas directas        │
│  NAME, TYPE, CLASS, TTL, RDATA     │
├─────────────────────────────────────┤
│ AUTHORITY — NS referidos            │
├─────────────────────────────────────┤
│ ADDITIONAL — IPs de los NS referidos│
└─────────────────────────────────────┘
\`\`\`

**Flags importantes en el header:**
- \`QR\`: 0 = Query, 1 = Response
- \`AA\`: Authoritative Answer
- \`RD\`: Recursion Desired (cliente lo pide)
- \`RA\`: Recursion Available (servidor lo soporta)
- \`TC\`: Truncated
- \`RCODE\`: 0 = NOERROR, 3 = NXDOMAIN, 2 = SERVFAIL

### 📖 /etc/resolv.conf en Linux

Este archivo controla qué resolver recursivo usa el sistema operativo:

\`\`\`bash
cat /etc/resolv.conf
\`\`\`

\`\`\`
# Generado por systemd-resolved
nameserver 127.0.0.53
options edns0 trust-ad
search example.com internal.corp
\`\`\`

**Directivas:**
- \`nameserver\` — IP del resolver (hasta 3). En sistemas modernos suele apuntar al stub de systemd-resolved (\`127.0.0.53\`).
- \`search\` — Dominios a añadir al intentar resolver nombres cortos. Con \`search example.com\`, una consulta a \`host1\` se convierte en \`host1.example.com\`.
- \`domain\` — Define el dominio local (mutuamente excluyente con \`search\`).
- \`options ndots:5\` — Número de puntos necesarios para que un nombre se trate como FQDN sin añadir el sufijo de búsqueda.

**Advertencia:** En sistemas con systemd-resolved, \`/etc/resolv.conf\` suele ser un symlink. Editarlo directamente puede ser sobrescrito. La configuración correcta se hace en \`/etc/systemd/resolved.conf\` (módulo 4).

### 📋 Lo que debes recordar
* La jerarquía DNS es: raíz → TLD → autoritativo. El resolver recursivo no es parte de la jerarquía, es el intermediario.
* En resolución iterativa, el resolver hace todas las consultas; para el cliente siempre parece recursiva.
* TTL controla cuánto tiempo se cachea una respuesta. Caché negativa aplica a NXDOMAIN.
* DNS usa UDP/53 por defecto; TCP/53 para respuestas grandes y transferencias de zona.
* El flag AA distingue una respuesta autoritativa de una cacheada.
* Antes de una migración: reduce el TTL con suficiente antelación.

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre un resolver recursivo y un servidor DNS autoritativo?
2. Una consulta a \`www.example.com\` no está en caché. ¿Cuántas consultas DNS realizará el resolver antes de devolver la respuesta al cliente?
3. El TTL de un registro A es 86400. ¿Qué debe hacerse antes de una migración y con cuánta antelación?

---

1. El resolver recursivo consulta la jerarquía en nombre del cliente y cachea respuestas, pero no tiene autoridad sobre ninguna zona. El servidor autoritativo tiene la respuesta definitiva para los registros de su zona (flag AA activo).
2. Al menos tres consultas: una al root server (para obtener los NS de \`.com\`), una al TLD de \`.com\` (para obtener los NS de \`example.com\`), y una al servidor autoritativo de \`example.com\` (para obtener el registro A de \`www\`).
3. Se debe reducir el TTL a un valor bajo (p. ej., 300 segundos) con una antelación igual al TTL actual (en este caso, 24 horas antes), para que la mayoría de los resolvers tengan TTLs cortos en caché cuando se realice el cambio.
`

export default content
