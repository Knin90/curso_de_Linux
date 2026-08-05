const content = `
## Módulo 6 — Servidor DNS recursivo con unbound

### 🎯 Objetivos de aprendizaje
* Entender cuándo usar unbound en lugar de bind9 para resolución recursiva
* Instalar y configurar unbound como resolver de caché local o de red
* Configurar zonas de reenvío (forward-zone) y zonas locales (local-data)
* Ajustar parámetros de caché, prefetch y control de acceso
* Gestionar unbound con \`unbound-control\` y revisar estadísticas
* Comparar unbound vs bind9 para el rol de resolver recursivo

### ❓ El problema real
Tienes una red de oficina con 50 estaciones de trabajo. En lugar de que cada máquina consulte directamente a \`8.8.8.8\`, quieres un resolver local que: cachee respuestas para reducir latencia y tráfico WAN, reenvíe consultas de \`oficina.local\` al DNS interno, valide DNSSEC, y sea fácil de mantener sin la complejidad de bind9.

### 📖 Unbound vs bind9 para resolución recursiva

| Característica | unbound | bind9 |
|---|---|---|
| Propósito principal | Resolver recursivo/caché | Autoritativo + resolver |
| Complejidad de config | Baja | Alta |
| Rendimiento como resolver | Excelente | Bueno |
| Validación DNSSEC | Integrada, activada por defecto | Requiere configuración |
| Zonas autoritativas | No (solo local-data simple) | Sí, completo |
| Caso de uso típico | Resolver de red/hosts | Servidor autoritativo |
| Footprint de memoria | Menor | Mayor |

**Conclusión práctica:** usa unbound cuando necesitas un resolver recursivo con caché. Usa bind9 cuando necesitas ser autoritativo para una zona propia.

### 📖 Instalación

\`\`\`bash
# Debian/Ubuntu
apt-get install -y unbound

# RHEL/Rocky/AlmaLinux
dnf install -y unbound

# Verificar
unbound -V
# Version 1.17.0

systemctl enable --now unbound

# unbound-control requiere inicializar las claves de control
unbound-control-setup
\`\`\`

### 📖 Estructura de configuración

\`\`\`
/etc/unbound/
├── unbound.conf              # Archivo principal
└── unbound.conf.d/           # Directorio para includes (en Debian)
    ├── 10-access-control.conf
    ├── 20-local-zones.conf
    └── 30-forward-zones.conf
\`\`\`

### 📖 unbound.conf: configuración completa

\`\`\`yaml
# /etc/unbound/unbound.conf
server:
    # Interfaz y puerto de escucha
    interface: 0.0.0.0
    interface: ::0
    port: 53

    # Acceso — quién puede consultar este resolver
    access-control: 127.0.0.0/8    allow
    access-control: ::1             allow
    access-control: 192.168.0.0/16 allow
    access-control: 10.0.0.0/8     allow
    access-control: 0.0.0.0/0      refuse   # rechazar todo lo demás

    # Root hints — para resolución sin forwarders
    root-hints: "/var/lib/unbound/root.hints"

    # DNSSEC — validación automática con anclas de confianza integradas
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    # Caché
    cache-min-ttl: 60        # mínimo TTL en caché (evita flush agresivo)
    cache-max-ttl: 86400     # máximo TTL en caché (24 horas)
    cache-max-negative-ttl: 3600  # TTL máximo para NXDOMAIN cacheados

    # Prefetch — re-resolver registros próximos a expirar proactivamente
    prefetch: yes
    prefetch-key: yes        # pre-fetch DNSKEY también

    # Rendimiento
    num-threads: 4           # un thread por CPU core
    msg-cache-slabs: 4       # debe ser potencia de 2, igual a num-threads
    rrset-cache-slabs: 4
    infra-cache-slabs: 4
    key-cache-slabs: 4
    rrset-cache-size: 256m   # caché de resource record sets
    msg-cache-size: 128m     # caché de mensajes DNS completos

    # Privacidad y seguridad
    hide-identity: yes       # no revelar nombre del servidor
    hide-version: yes        # no revelar versión de unbound
    qname-minimisation: yes  # RFC 7816 — enviar solo lo necesario a cada NS

    # Hardening
    harden-dnssec-stripped: yes
    harden-below-nxdomain: yes
    harden-referral-path: yes
    harden-algo-downgrade: no
    use-caps-for-id: yes     # 0x20 encoding — aleatorizar mayúsculas en queries

    # Logging
    verbosity: 1
    logfile: "/var/log/unbound/unbound.log"
    log-queries: no          # activar solo para debug (muy verboso)
    log-replies: no

    # Estadísticas
    statistics-interval: 3600
    extended-statistics: yes

# Control remoto (para unbound-control)
remote-control:
    control-enable: yes
    control-interface: 127.0.0.1
    control-port: 8953
    server-key-file: "/etc/unbound/unbound_server.key"
    server-cert-file: "/etc/unbound/unbound_server.pem"
    control-key-file: "/etc/unbound/unbound_control.key"
    control-cert-file: "/etc/unbound/unbound_control.pem"
\`\`\`

### 📖 Root hints

Los root hints son la lista de root servers. Unbound los necesita para resolución sin forwarders:

\`\`\`bash
# Descargar root hints actualizados
curl -o /var/lib/unbound/root.hints https://www.internic.net/domain/named.root

# Verificar
head -20 /var/lib/unbound/root.hints

# Automatizar actualización mensual
echo "0 0 1 * * root curl -o /var/lib/unbound/root.hints https://www.internic.net/domain/named.root && systemctl reload unbound" > /etc/cron.d/unbound-root-hints
\`\`\`

### 📖 Zonas de reenvío (forward-zone)

\`\`\`yaml
# /etc/unbound/unbound.conf.d/30-forward-zones.conf

# Reenviar dominio interno al DNS privado
forward-zone:
    name: "oficina.local"
    forward-addr: 10.0.0.53    # DNS interno de la oficina
    forward-first: no           # no intentar resolver recursivamente si falla

# Reenviar todo lo público a un resolver de upstream
# (si no se define esto, unbound resuelve directamente desde root hints)
forward-zone:
    name: "."
    forward-addr: 9.9.9.9@853#dns.quad9.net   # DoT (DNS over TLS)
    forward-addr: 149.112.112.112@853#dns.quad9.net
    forward-tls-upstream: yes
\`\`\`

### 📖 Zonas locales (local-data)

Para resolver nombres internos sin un servidor DNS autoritativo separado:

\`\`\`yaml
# /etc/unbound/unbound.conf.d/20-local-zones.conf

# Tipo static: responde con los registros definidos; NXDOMAIN para lo no definido
local-zone: "oficina.local." static

local-data: "gateway.oficina.local. IN A 192.168.1.1"
local-data: "nas.oficina.local.     IN A 192.168.1.5"
local-data: "impresora.oficina.local. IN A 192.168.1.20"

# PTR inversos
local-data-ptr: "192.168.1.1 gateway.oficina.local"
local-data-ptr: "192.168.1.5 nas.oficina.local"

# Bloquear dominio (tipo redirect a NXDOMAIN)
local-zone: "ads.example.com." always_nxdomain

# Tipo transparent: responde con local-data si existe, recurse para lo demás
local-zone: "empresa.com." transparent
local-data: "intranet.empresa.com. IN A 10.0.0.100"
\`\`\`

**Tipos de local-zone:**
- \`static\` — solo responde con local-data; NXDOMAIN para nombres no definidos
- \`transparent\` — local-data tiene prioridad; recurse para lo no definido
- \`redirect\` — redirige todas las queries a una IP (bloqueo DNS)
- \`always_nxdomain\` — siempre devuelve NXDOMAIN
- \`nodefault\` — quitar zonas por defecto (útil para override de localhost)

### 📖 unbound-control: gestión del servidor

\`\`\`bash
# Estado del servidor
unbound-control status

# Estadísticas de caché y rendimiento
unbound-control stats
unbound-control stats_noreset   # estadísticas sin resetear contadores

# Recargar configuración sin reiniciar
unbound-control reload

# Vaciar caché completa
unbound-control flush_zone .

# Vaciar caché de un nombre específico
unbound-control flush www.example.com

# Vaciar caché de un tipo específico
unbound-control flush_type example.com MX

# Añadir registro local en caliente (temporal, no persiste)
unbound-control local_data "test.oficina.local. IN A 192.168.1.99"

# Eliminar registro local
unbound-control local_data_remove test.oficina.local

# Ver lista de zonas locales
unbound-control list_local_zones

# Consultar una IP como si fuera un cliente (para debug)
unbound-host -C /etc/unbound/unbound.conf www.example.com
\`\`\`

### 📖 Estadísticas de rendimiento

\`\`\`bash
unbound-control stats | grep -E "total|cache|prefetch"
# thread0.num.queries=15432
# thread0.num.cachehits=12891
# thread0.num.cachemiss=2541
# thread0.num.prefetch=891
# total.num.queries=15432
# total.requestlist.avg=0.23
\`\`\`

**Interpretar la tasa de caché:**
- Cache hit rate = \`cachehits / queries * 100\`
- >80% es saludable para un resolver de red
- Si es baja, revisar \`cache-max-ttl\` y \`prefetch\`

### 📖 Validación y diagnóstico

\`\`\`bash
# Verificar configuración antes de recargar
unbound-checkconf /etc/unbound/unbound.conf

# Ver log en tiempo real
tail -f /var/log/unbound/unbound.log

# Probar resolución a través de unbound local
dig @127.0.0.1 A www.example.com
dig @127.0.0.1 A nas.oficina.local

# Verificar que DNSSEC funciona
dig @127.0.0.1 A www.dnssec-failed.org
# SERVFAIL indica que unbound rechazó la respuesta por DNSSEC inválido (correcto)

dig @127.0.0.1 A www.cloudflare.com +dnssec
# La respuesta debe incluir flags: ad (Authenticated Data)
\`\`\`

### 📋 Lo que debes recordar
* unbound es un resolver recursivo, no un servidor autoritativo. Para zonas propias con AXFR, usa bind9.
* \`access-control\` es la primera línea de defensa: restringir siempre a IPs de confianza.
* \`prefetch: yes\` mejora la latencia percibida al renovar entradas de caché antes de que expiren.
* \`qname-minimisation\` mejora la privacidad enviando a cada servidor NS solo la parte que necesita.
* \`unbound-control reload\` recarga sin downtime; \`flush\` vacía caché sin recargar configuración.
* Para DNS over TLS upstream, añadir \`@853#hostname\` en \`forward-addr\` y \`forward-tls-upstream: yes\`.

### 🧪 Autoevaluación
1. ¿Qué tipo de \`local-zone\` usarías para bloquear un dominio de publicidad de forma que devuelva NXDOMAIN?
2. Tienes configurado \`forward-zone: name: "."\ con los servidores de Quad9. ¿Unbound resolverá desde root hints o reenviará las queries?
3. \`unbound-control stats\` muestra \`cachehits=100\` y \`queries=1000\`. ¿Cuál es el cache hit rate y qué indica si es menor al 50%?

---

1. \`local-zone: "ads.example.com." always_nxdomain\` — devuelve NXDOMAIN para el dominio y todos sus subdominios.
2. Reenviará todas las queries a Quad9. La zona \`".\` como forward-zone cubre todo el espacio de nombres, haciendo que unbound actúe como un resolver que reenvía en lugar de resolver directamente desde root hints.
3. Cache hit rate = 100/1000 × 100 = 10%. Un cache hit rate menor al 50% indica que muy pocas consultas se sirven desde caché. Posibles causas: TTLs muy cortos en \`cache-min-ttl\`, consultas muy variadas sin repetición, o caché muy pequeña (\`msg-cache-size\`/\`rrset-cache-size\`).
`

export default content
