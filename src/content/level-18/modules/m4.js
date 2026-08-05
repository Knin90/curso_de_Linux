const content = `
## Módulo 4 — systemd-resolved: caché DNS local y configuración

### 🎯 Objetivos de aprendizaje
* Entender el rol de systemd-resolved como stub resolver local
* Configurar servidores DNS y fallback en \`/etc/systemd/resolved.conf\`
* Distinguir entre los distintos archivos de resolv.conf y cuándo usar cada uno
* Gestionar la caché DNS local con \`resolvectl\`
* Configurar DNS por interfaz con systemd-networkd
* Habilitar y validar DNSSEC a través de resolved

### ❓ El problema real
Estás configurando un servidor que debe usar el DNS interno de tu empresa para los dominios \`corp.local\` e \`internal.corp\`, pero el DNS de Google para todo lo demás. Además, varios desarrolladores se quejan de que los cambios DNS que haces tardan en verse aunque el TTL haya expirado. Todo esto tiene solución directa en systemd-resolved.

### 📖 ¿Qué es systemd-resolved?

systemd-resolved es un servicio de resolución de nombres que provee:
- **Stub resolver local** en \`127.0.0.53:53\` — acepta consultas DNS estándar
- **Caché DNS local** — reduce latencia y tráfico de red
- **Resolución LLMNR y mDNS** — para redes locales sin servidor DNS
- **Validación DNSSEC** — opcional, configurable por interfaz
- **DNS por interfaz** — cada interfaz puede tener sus propios servidores y dominios de búsqueda

\`\`\`bash
# Verificar estado del servicio
systemctl status systemd-resolved

# Ver configuración activa
resolvectl status
\`\`\`

### 📖 Los tres archivos de resolv.conf

Este es el punto de mayor confusión con systemd-resolved. Existen tres variantes:

**1. \`/run/systemd/resolve/stub-resolv.conf\`** — apunta al stub resolver local:
\`\`\`
nameserver 127.0.0.53
options edns0 trust-ad
\`\`\`
Todas las consultas van a systemd-resolved, que gestiona caché, DNSSEC y reenvío. **Esta es la configuración recomendada** en sistemas con systemd-resolved activo.

**2. \`/run/systemd/resolve/resolv.conf\`** — lista los servidores DNS upstream reales (sin pasar por el stub):
\`\`\`
nameserver 8.8.8.8
nameserver 8.8.4.4
# generado dinámicamente por systemd-resolved
\`\`\`
Útil cuando una aplicación necesita contactar directamente los DNS upstream.

**3. \`/etc/resolv.conf\`** — en distribuciones modernas suele ser un symlink:
\`\`\`bash
ls -la /etc/resolv.conf
# /etc/resolv.conf -> /run/systemd/resolve/stub-resolv.conf  (Ubuntu/Debian moderno)
# /etc/resolv.conf -> /run/systemd/resolve/resolv.conf       (algunas distros)
# /etc/resolv.conf  (archivo estático — sin symlink — en sistemas sin systemd-resolved)
\`\`\`

**Configurar el symlink correcto:**
\`\`\`bash
# Establecer el stub resolver (recomendado)
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf

# Verificar
cat /etc/resolv.conf
\`\`\`

### 📖 Configuración de /etc/systemd/resolved.conf

\`\`\`bash
# Ver configuración actual efectiva
resolvectl status | head -30
\`\`\`

El archivo principal de configuración:
\`\`\`bash
# /etc/systemd/resolved.conf
[Resolve]
# Servidores DNS primarios (separados por espacios)
DNS=9.9.9.9 149.112.112.112

# Fallback si los primarios no responden
FallbackDNS=8.8.8.8 8.8.4.4 2001:4860:4860::8888

# Dominios de búsqueda globales
Domains=~.

# Activar validación DNSSEC
# Opciones: no, allow-downgrade, yes
DNSSEC=allow-downgrade

# Activar caché DNS
Cache=yes

# No usar mDNS (útil en servidores)
MulticastDNS=no

# No usar LLMNR
LLMNR=no
\`\`\`

\`\`\`bash
# Aplicar cambios
systemctl restart systemd-resolved
\`\`\`

### 📖 DNS por interfaz con systemd-networkd

Para el caso de uso del problema real (DNS interno para \`corp.local\`, DNS público para el resto), se configura por interfaz:

\`\`\`bash
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=no
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=10.0.0.53
Domains=~corp.local ~internal.corp
\`\`\`

\`\`\`bash
# /etc/systemd/network/20-eth1.network
[Match]
Name=eth1

[Network]
DHCP=yes
# Los DNS de esta interfaz sirven para todo lo no cubierto por eth0
\`\`\`

La sintaxis \`~dominio\` en \`Domains=\` significa "usar este DNS solo para consultas de este dominio específico" (routing domain). Sin el \`~\`, es un dominio de búsqueda (se añade al resolver nombres cortos).

\`\`\`bash
# Aplicar configuración de red
networkctl reload

# Verificar routing de dominios
resolvectl status eth0
\`\`\`

### 📖 resolvectl: gestión y diagnóstico

\`\`\`bash
# Estado global del resolver
resolvectl status

# Estado de una interfaz específica
resolvectl status eth0

# Consulta DNS a través de resolved (respeta caché y routing de dominios)
resolvectl query www.example.com
resolvectl query -t MX example.com
resolvectl query -t TXT _dmarc.example.com

# Consulta con estadísticas de rendimiento
resolvectl query --legend=yes www.example.com

# Vaciar la caché DNS
resolvectl flush-caches

# Estadísticas de la caché
resolvectl statistics

# Cambiar servidores DNS en tiempo real (temporal, no persiste)
resolvectl dns eth0 1.1.1.1 1.0.0.1

# Ver log de consultas DNS (requiere LogLevel=debug en resolved.conf)
journalctl -u systemd-resolved -f
\`\`\`

**Salida de \`resolvectl status\`:**
\`\`\`
Global
       Protocols: +LLMNR +mDNS -DNSOverTLS DNSSEC=allow-downgrade/supported
resolv.conf mode: stub
      DNS Servers: 9.9.9.9 149.112.112.112
   DNS Fallback: 8.8.8.8 8.8.4.4

Link 2 (eth0)
    DNS Servers: 10.0.0.53
         Domains: ~corp.local ~internal.corp
\`\`\`

### 📖 Control de caché

\`\`\`bash
# Vaciar toda la caché
resolvectl flush-caches

# Ver estadísticas de caché
resolvectl statistics
# Current Transactions: 0
# Total Transactions: 1532
# Current Cache Size: 47
# Cache Hits: 891
# Cache Misses: 641

# Verificar si una consulta viene de caché
# (el tiempo de respuesta < 1ms indica caché)
time resolvectl query www.example.com
\`\`\`

**Para debug de problemas de caché durante desarrollo:**
\`\`\`bash
# Flujo completo de diagnóstico cuando los cambios DNS no se ven
resolvectl flush-caches                    # limpiar caché local
resolvectl query www.example.com           # consultar con resolved
dig @9.9.9.9 www.example.com              # consultar directamente resolver upstream
dig @ns1.example.com www.example.com       # consultar autoritativo directamente
\`\`\`

### 📖 DNSSEC en resolved

\`\`\`bash
# Habilitar DNSSEC en resolved.conf
# DNSSEC=yes          → validar siempre, rechazar si falla
# DNSSEC=allow-downgrade → validar si el servidor lo soporta, continuar si no
# DNSSEC=no           → sin validación

# Verificar si un dominio tiene DNSSEC válido
resolvectl query --legend --type=DNSKEY example.com

# Ver si la respuesta está autenticada
resolvectl query www.example.com
# Flags: authenticated    ← indica validación DNSSEC exitosa
\`\`\`

### 📖 Casos de uso de producción

**Servidor con DNS privado para microservicios:**
\`\`\`bash
# /etc/systemd/resolved.conf
[Resolve]
DNS=10.96.0.10          # CoreDNS de Kubernetes
FallbackDNS=8.8.8.8
Domains=~cluster.local ~svc.cluster.local ~default.svc.cluster.local
DNSSEC=no               # DNS interno no suele tener DNSSEC
Cache=yes
\`\`\`

**Hardening: deshabilitar protocolos no necesarios en servidores:**
\`\`\`bash
# /etc/systemd/resolved.conf
[Resolve]
DNS=9.9.9.9
FallbackDNS=149.112.112.112
DNSSEC=yes
DNSOverTLS=yes
MulticastDNS=no
LLMNR=no
\`\`\`

### 📋 Lo que debes recordar
* El stub resolver escucha en \`127.0.0.53:53\`. \`/etc/resolv.conf\` debe ser un symlink a \`stub-resolv.conf\`.
* La caché de resolved puede contener respuestas obsoletas. Usa \`resolvectl flush-caches\` para limpiarla.
* Los routing domains (\`~dominio\`) enrutan consultas específicas a servidores DNS específicos sin ser sufijos de búsqueda.
* Los cambios en \`resolved.conf\` requieren reiniciar el servicio; los de \`networkd\` requieren \`networkctl reload\`.
* \`resolvectl query\` respeta el routing de dominios y la caché; \`dig\` va directo al servidor que le indiques.

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre \`/run/systemd/resolve/stub-resolv.conf\` y \`/run/systemd/resolve/resolv.conf\`?
2. Quieres que las consultas a \`*.dev.internal\` vayan al DNS \`10.10.0.1\`, pero el resto al DNS público. ¿Cómo lo configuras en un archivo \`.network\`?
3. Un desarrollador dice que los cambios DNS no se ven aunque el TTL expiró. ¿Qué comando ejecutas primero y por qué?

---

1. \`stub-resolv.conf\` apunta a \`127.0.0.53\` (el stub de resolved), por lo que todas las consultas pasan por resolved y se benefician de su caché, DNSSEC y routing de dominios. \`resolv.conf\` lista directamente los servidores DNS upstream reales, saltando el stub (y su caché).
2. En el archivo \`.network\` de la interfaz correspondiente: \`DNS=10.10.0.1\` y \`Domains=~dev.internal\`. El \`~\` indica que es un routing domain, no un sufijo de búsqueda.
3. \`resolvectl flush-caches\` — la caché local de systemd-resolved puede tener el registro obsoleto aunque el TTL haya expirado en el servidor upstream. Vaciarla es el primer paso antes de diagnosticar si el problema es de propagación upstream.
`

export default content
