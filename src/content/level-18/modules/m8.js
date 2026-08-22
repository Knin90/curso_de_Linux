const content = `
## Módulo 8 — Proyecto real: diagnóstico y resolución de problemas DNS en producción

### 🎯 Objetivos de aprendizaje
* Diagnosticar fallos de resolución DNS usando \`dig\`, \`resolvectl\` y logs de BIND9
* Distinguir entre problemas de propagación, configuración de zona y resolución local
* Aplicar correcciones a zonas DNS y recargar BIND9 de forma segura
* Configurar DNS split-horizon para entornos corporativos con systemd-resolved

### ❓ El problema real

El equipo de operaciones recibe tres tickets simultáneos:

1. **Ticket #1:** "El sitio web empresa.com no carga desde ayer. Funciona en algunas redes pero no en otras."
2. **Ticket #2:** "El correo corporativo no llega. Los clientes dicen que sus mensajes rebotan con error 550."
3. **Ticket #3:** "El servicio interno api.corp.internal no resuelve desde las laptops de los desarrolladores, pero sí desde los servidores."

Cada problema tiene una causa diferente. El diagnóstico sistemático es clave.

### 📖 Estructura del proyecto

\`\`\`
empresa.com/
├── /etc/bind/zones/empresa.com.zone       ← zona autoritativa (TTL, MX, SPF)
├── /etc/systemd/resolved.conf             ← split-horizon para .internal
└── /var/log/named/named.log               ← log de recargas y queries de BIND9
\`\`\`

### 📖 Escenario 1 — Sitio web sin resolver tras migración de dominio

**Síntoma:** empresa.com resuelve a la IP vieja en algunas redes.

**Causa raíz:** TTL demasiado alto (86400 segundos = 24 horas) configurado antes de la migración. Los resolvers recursivos siguen sirviendo la IP anterior desde su caché.

#### Diagnóstico paso a paso

\`\`\`bash
# Paso 1: Comparar resolución entre el servidor autoritativo y Google DNS
# Si difieren, el problema es de propagación/caché, no de la zona

# Consultar Google DNS (resolver público)
dig @8.8.8.8 empresa.com A
\`\`\`

**Salida (IP antigua en caché):**
\`\`\`
;; ANSWER SECTION:
empresa.com.            72341   IN      A       203.0.113.10

;; Query time: 12 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
\`\`\`

\`\`\`bash
# Consultar el servidor autoritativo directamente
# Primero encontrar los NS del dominio
dig empresa.com NS

# Luego consultar ese NS directamente
dig @ns1.empresa.com empresa.com A
\`\`\`

**Salida (IP nueva en el autoritativo):**
\`\`\`
;; ANSWER SECTION:
empresa.com.            3600    IN      A       198.51.100.25

;; Query time: 8 msec
;; SERVER: ns1.empresa.com#53
\`\`\`

\`\`\`bash
# El TTL en caché de Google DNS (72341 segundos) indica cuánto tiempo falta
# para que expire la entrada cacheada

# Verificar el TTL actual configurado en la zona
dig @ns1.empresa.com empresa.com A | grep -E "ANSWER|empresa"

# Consultar el SOA para ver el TTL mínimo
dig @ns1.empresa.com empresa.com SOA
\`\`\`

#### Solución

\`\`\`bash
# 1. Reducir el TTL en la zona ANTES de futuras migraciones
# En el archivo de zona /etc/bind/zones/empresa.com.zone:
#   empresa.com.  IN  A  198.51.100.25
# Cambiar el TTL a 300 (5 minutos) al menos 24h antes de migrar

# 2. Limpiar caché local del sistema (no afecta resolvers externos)
sudo resolvectl flush-caches

# Verificar que se limpió
resolvectl statistics | grep "Cache"
# Current Cache Size: 0
\`\`\`

\`\`\`bash
# 3. Para clientes que no pueden esperar la propagación:
# Usar el servidor autoritativo directamente en /etc/hosts (temporal)
echo "198.51.100.25 empresa.com www.empresa.com" | sudo tee -a /etc/hosts

# O forzar resolución en la sesión actual
dig @ns1.empresa.com empresa.com A +short
# 198.51.100.25
\`\`\`

\`\`\`bash
# 4. Monitorear la propagación
# Consultar múltiples resolvers para ver el avance
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9 208.67.222.222; do
    echo -n "Resolver \$resolver: "
    dig @\$resolver empresa.com A +short
done
\`\`\`

**Nota clave:** La propagación DNS no es instantánea ni controlable desde el servidor. Solo se puede esperar a que los TTLs expiren en cada resolver que tiene la entrada cacheada.

### 📖 Escenario 2 — Fallo en entrega de correo por MX y SPF incorrectos

**Síntoma:** Los correos enviados a @empresa.com rebotan con "User unknown" o son rechazados como spam.

**Causa raíz:** Registro MX sin prioridad válida y registro SPF (TXT) mal formado.

#### Diagnóstico paso a paso

\`\`\`bash
# Verificar registros MX
dig empresa.com MX
\`\`\`

**Salida con problema:**
\`\`\`
;; ANSWER SECTION:
empresa.com.            3600    IN      MX      mail.empresa.com.

;; Query time: 15 msec
\`\`\`

El problema: falta el número de prioridad. El formato correcto es \`10 mail.empresa.com.\`

\`\`\`bash
# Verificar registros TXT (incluye SPF y DKIM)
dig empresa.com TXT
\`\`\`

**Salida con problema:**
\`\`\`
;; ANSWER SECTION:
empresa.com.            3600    IN      TXT     "v=spf1 ip4:203.0.113.0/24 -all"
\`\`\`

El problema: la IP en el SPF es la antigua (203.0.113.0/24), tras la migración el servidor de correo está en 198.51.100.0/24.

\`\`\`bash
# Simular lo que haría mxtoolbox: verificar entrega completa
# 1. Verificar que el MX resuelve a una IP válida
dig mail.empresa.com A
# ;; ANSWER SECTION:
# mail.empresa.com.  3600  IN  A  198.51.100.50

# 2. Verificar PTR (reverse DNS) del servidor de correo
dig -x 198.51.100.50
# ;; ANSWER SECTION:
# 50.100.51.198.in-addr.arpa. 3600 IN PTR mail.empresa.com.

# 3. Probar conexión SMTP directa
nc -z -v mail.empresa.com 25
# Connection to mail.empresa.com 25 port [tcp/smtp] succeeded!
\`\`\`

#### Corrección en la zona BIND9

\`\`\`bash
sudo nano /etc/bind/zones/empresa.com.zone
\`\`\`

Zona corregida:
\`\`\`
\$TTL 3600
@   IN  SOA  ns1.empresa.com. admin.empresa.com. (
                2024031502  ; Serial (incrementar siempre)
                3600        ; Refresh
                1800        ; Retry
                604800      ; Expire
                300 )       ; Negative Cache TTL

; Servidores de nombres
@   IN  NS   ns1.empresa.com.
@   IN  NS   ns2.empresa.com.

; Registro A principal
@   IN  A    198.51.100.25

; Registro MX con prioridad correcta
@   IN  MX   10  mail.empresa.com.
@   IN  MX   20  mail2.empresa.com.  ; Backup MX

; Registro SPF corregido con IP actual del servidor de correo
@   IN  TXT  "v=spf1 ip4:198.51.100.0/24 mx -all"

; Host del servidor de correo
mail    IN  A  198.51.100.50
mail2   IN  A  198.51.100.51
\`\`\`

\`\`\`bash
# Verificar sintaxis de la zona antes de recargar
sudo named-checkzone empresa.com /etc/bind/zones/empresa.com.zone
\`\`\`

**Salida esperada:**
\`\`\`
zone empresa.com/IN: loaded serial 2024031502
OK
\`\`\`

\`\`\`bash
# Recargar BIND9 sin reiniciarlo (sin tiempo de inactividad)
sudo rndc reload empresa.com
# zone reload up-to-date

# Verificar en los logs que la zona se cargó correctamente
sudo tail -20 /var/log/named/named.log
\`\`\`

**Log esperado:**
\`\`\`
15-Mar-2024 14:30:01.234 zone empresa.com/IN: loaded serial 2024031502
15-Mar-2024 14:30:01.235 all zones loaded
15-Mar-2024 14:30:01.236 running
\`\`\`

\`\`\`bash
# Verificar que los cambios se reflejan
dig @localhost empresa.com MX
# empresa.com.  3600  IN  MX  10  mail.empresa.com.
# empresa.com.  3600  IN  MX  20  mail2.empresa.com.

dig @localhost empresa.com TXT | grep spf
# empresa.com.  3600  IN  TXT  "v=spf1 ip4:198.51.100.0/24 mx -all"
\`\`\`

### 📖 Escenario 3 — Servicio interno sin resolver en red corporativa

**Síntoma:** \`api.corp.internal\` resuelve correctamente en los servidores de producción (que usan 10.0.0.53 como DNS), pero no en las laptops de los desarrolladores.

**Causa raíz:** systemd-resolved en las laptops usa el DNS del router (8.8.8.8 del ISP) para todos los dominios, ignorando el servidor DNS corporativo para el dominio \`.internal\`.

#### Diagnóstico paso a paso

\`\`\`bash
# En la laptop del desarrollador:

# Ver configuración actual de DNS
resolvectl status
\`\`\`

**Salida (problema visible):**
\`\`\`
Global
       Protocols: -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
resolv.conf mode: stub

Link 2 (eth0)
    Current Scopes: DNS
         Protocols: +DefaultRoute +LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
Current DNS Server: 8.8.8.8
       DNS Servers: 8.8.8.8 8.8.4.4
        DNS Domain: lan
\`\`\`

\`\`\`bash
# Intentar resolver el dominio interno
dig api.corp.internal A
# ;; ANSWER SECTION: (vacío — NXDOMAIN)
# Devuelve NXDOMAIN porque 8.8.8.8 no tiene información de .internal

# Confirmar que el DNS corporativo sí resuelve
dig @10.0.0.53 api.corp.internal A
# ;; ANSWER SECTION:
# api.corp.internal.  60  IN  A  10.0.0.100
\`\`\`

#### Solución — Configurar DNS split-horizon con systemd-resolved

\`\`\`bash
# Opción 1: Configuración global en /etc/systemd/resolved.conf
sudo nano /etc/systemd/resolved.conf
\`\`\`

Contenido:
\`\`\`
[Resolve]
# DNS para dominios públicos (primero corporativo, fallback a Google)
DNS=10.0.0.53
FallbackDNS=8.8.8.8 8.8.4.4

# Dominios que deben resolverse EXCLUSIVAMENTE via DNS corporativo
# El prefijo ~ indica "search domain for routing only" (no añadir a búsqueda)
Domains=~corp.internal ~empresa.local

# Habilitar DNSSEC solo si el servidor corporativo lo soporta
DNSSEC=no
\`\`\`

\`\`\`bash
# Opción 2: Configuración por interfaz de red (más granular)
# Útil cuando la VPN proporciona su propia interfaz
sudo systemd-resolve --interface=vpn0 --set-dns=10.0.0.53 --set-domain=corp.internal

# Aplicar cambios
sudo systemctl restart systemd-resolved

# Verificar nueva configuración
resolvectl status
\`\`\`

**Salida esperada tras la corrección:**
\`\`\`
Global
       Protocols: -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
resolv.conf mode: stub

Link 2 (eth0)
    Current Scopes: DNS
         Protocols: +DefaultRoute +LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
Current DNS Server: 10.0.0.53
       DNS Servers: 10.0.0.53
        DNS Domain: ~corp.internal ~empresa.local
\`\`\`

\`\`\`bash
# Verificar que ahora resuelve correctamente
dig api.corp.internal A
# ;; ANSWER SECTION:
# api.corp.internal.  60  IN  A  10.0.0.100

# Y que los dominios públicos siguen funcionando
dig google.com A +short
# 142.250.80.46
\`\`\`

### 📖 Estado final del servidor BIND9

\`\`\`bash
# Verificar configuración completa de BIND9
sudo named-checkconf /etc/bind/named.conf

# Verificar todas las zonas
sudo named-checkconf -z

# Ver estadísticas del servidor DNS
sudo rndc stats
sudo cat /var/named/data/named_stats.txt | head -50

# Monitorear queries en tiempo real
sudo rndc querylog on
sudo tail -f /var/log/named/named.log | grep -E "query|error|warning"
\`\`\`

**Snippet de log de BIND9 con queries:**
\`\`\`
15-Mar-2024 15:00:01.123 client @0x7f1234 192.168.1.50#45231: query: empresa.com IN A + (192.168.1.1)
15-Mar-2024 15:00:01.124 client @0x7f1234 192.168.1.50#45231: query: empresa.com IN MX + (192.168.1.1)
\`\`\`

### 📋 Lo que debes recordar
* \`dig @servidor dominio tipo\` permite consultar cualquier resolver específico para comparar respuestas
* El TTL en caché determina cuánto tiempo tardará en propagarse un cambio — planearlo con antelación es clave
* Los registros MX **siempre** requieren un número de prioridad; sin él, el registro puede ser inválido
* \`named-checkzone\` y \`named-checkconf\` deben ejecutarse antes de cualquier recarga de BIND9
* \`rndc reload zona\` recarga una zona sin interrumpir el servicio DNS
* En systemd-resolved, \`Domains=~dominio.interno\` enruta ese dominio al DNS especificado sin añadirlo al sufijo de búsqueda

### 🧪 Autoevaluación
1. ¿Cómo determinas si un problema de resolución DNS es de propagación (caché) o de configuración de zona?
2. ¿Qué hace el prefijo \`~\` en la directiva \`Domains=\` de systemd-resolved?
3. ¿Qué comando recarga solo una zona específica en BIND9 sin reiniciar el servicio completo?

---

1. Comparando la respuesta del servidor autoritativo (\`dig @ns1.dominio.com\`) con la de un resolver público (\`dig @8.8.8.8\`). Si difieren, es problema de caché/propagación; si el autoritativo también falla, es un problema de configuración de zona
2. El prefijo \`~\` indica que ese dominio es solo para enrutamiento DNS (routing domain): las consultas para ese sufijo se envían al DNS especificado, pero el dominio no se añade como sufijo de búsqueda automática
3. \`sudo rndc reload nombre-de-zona\` — recarga solo la zona especificada mientras BIND9 sigue sirviendo el resto de zonas sin interrupción
`

export default content
