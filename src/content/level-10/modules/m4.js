const content = `
## Módulo 4 — nftables: el sucesor moderno de iptables

### 🎯 Objetivos de aprendizaje

* Entender por qué nftables fue creado y qué mejoras ofrece.
* Conocer los conceptos de families, tables, chains y rules en nftables.
* Leer y escribir rulesets básicos en sintaxis nftables.
* Saber cuándo usar nftables vs iptables.

### ❓ El problema real

iptables tiene cuatro herramientas separadas: \`iptables\` (IPv4), \`ip6tables\` (IPv6), \`arptables\` (ARP), \`ebtables\` (bridge). Cada una tiene su propia sintaxis y sus propias reglas. Si quieres bloquear un puerto en IPv4 e IPv6, debes escribir la regla dos veces. nftables unifica todo esto en una sola herramienta con una sola sintaxis y soporte nativo de sets y mapas para reglas más eficientes.

### 📖 Por qué nftables reemplaza a iptables

\`\`\`text
PROBLEMA CON IPTABLES          SOLUCIÓN EN NFTABLES
────────────────────────────── ────────────────────────────────────────
4 herramientas separadas       1 sola herramienta (nft)
Sintaxis inconsistente         Sintaxis unificada y legible
Sin sets nativos               Sets nativos: { 80, 443, 8080 }
Cada regla evaluada            Maps y diccionarios para matching O(1)
  secuencialmente              en lugar de O(n) reglas
Rendimiento limitado           Mejor rendimiento, especialmente
  en grandes rulesets            con miles de reglas
Tablas fijas (filter/nat/...)  Tablas creadas por el usuario
\`\`\`

> nftables está disponible desde el kernel 3.13 (2014) y es el backend por defecto en Debian 10+, Ubuntu 20.04+, RHEL 8+, y prácticamente todas las distribuciones modernas.

### 📖 Conceptos de nftables

\`\`\`text
CONCEPTOS:

family (familia)
  El protocolo de red al que aplican las reglas.
  ip    → solo IPv4
  ip6   → solo IPv6
  inet  → IPv4 e IPv6 simultáneamente (el más útil)
  arp   → protocolo ARP
  bridge → tráfico de bridge
  netdev → ingress/egress de interfaz

table (tabla)
  Contenedor para chains. A diferencia de iptables, las tablas
  en nftables NO tienen propósito fijo — tú les das el nombre y propósito.
  Ejemplo: table inet mi_firewall { ... }

chain (cadena)
  Contenedor para rules. En nftables las chains tienen:
  - type: filter | nat | route
  - hook: prerouting | input | forward | output | postrouting
  - priority: número (menor = más prioritario; filter usa 0)
  - policy: accept | drop

rule (regla)
  La regla individual. Sintaxis más legible que iptables.
\`\`\`

### 📖 Comandos fundamentales de nftables

\`\`\`bash
# Ver todas las reglas activas
nft list ruleset

# Ver solo una tabla específica
nft list table inet mi_firewall

# Listar tables disponibles
nft list tables

# Añadir una regla (sin modificar archivo de config)
nft add rule inet mi_firewall input tcp dport 8080 accept

# Flush completo (eliminar todo)
nft flush ruleset
\`\`\`

### 📖 Sintaxis de reglas: comparativa iptables vs nftables

\`\`\`text
OPERACIÓN              IPTABLES                           NFTABLES
─────────────────────  ─────────────────────────────────  ──────────────────────────────────────
Permitir SSH           iptables -A INPUT -p tcp           nft add rule inet fw input \\
                         --dport 22 -j ACCEPT               tcp dport 22 accept

Permitir SSH + HTTPS   (dos comandos separados)           nft add rule inet fw input \\
                                                            tcp dport { 22, 443 } accept

Bloquear IP            iptables -A INPUT -s 1.2.3.4       nft add rule inet fw input \\
                         -j DROP                            ip saddr 1.2.3.4 drop

Estado ESTABLISHED     iptables -A INPUT -m conntrack     nft add rule inet fw input \\
                         --ctstate ESTABLISHED,RELATED       ct state established,related \\
                         -j ACCEPT                          accept

IPv4 + IPv6            (requiere ip6tables separado)      Un solo ruleset con \`inet\`
\`\`\`

### 📖 Ruleset completo de ejemplo para un servidor web

\`\`\`bash
# /etc/nftables.conf

#!/usr/sbin/nft -f

# Limpiar el ruleset anterior
flush ruleset

# Tabla principal para IPv4 e IPv6
table inet firewall {

  # Sets para IPs bloqueadas (permite añadir IPs dinámicamente)
  set blocklist {
    type ipv4_addr
    flags interval
  }

  chain input {
    type filter hook input priority 0; policy drop;

    # Loopback siempre permitido
    iif lo accept

    # Conexiones establecidas y relacionadas
    ct state established,related accept

    # Conexiones inválidas: descartar
    ct state invalid drop

    # IPs en blocklist: descartar
    ip saddr @blocklist drop

    # ICMP básico (ping)
    icmp type echo-request limit rate 5/second accept
    icmpv6 type { echo-request, nd-neighbor-solicit } accept

    # SSH
    tcp dport 22 accept

    # HTTP y HTTPS
    tcp dport { 80, 443 } accept

    # Logging de lo que llega y se descarta (última regla antes de policy drop)
    log prefix "nft-dropped: " level warn
  }

  chain forward {
    type filter hook forward priority 0; policy drop;
  }

  chain output {
    type filter hook output priority 0; policy accept;
  }
}
\`\`\`

Aplicar el ruleset:

\`\`\`bash
# Aplicar el archivo de configuración
nft -f /etc/nftables.conf

# Verificar que se aplicó correctamente
nft list ruleset

# Añadir una IP al blocklist dinámicamente (sin reiniciar el firewall)
nft add element inet firewall blocklist { 203.0.113.5 }
\`\`\`

### 📖 Persistencia con nftables

\`\`\`bash
# Guardar el ruleset actual en el archivo de configuración
nft list ruleset > /etc/nftables.conf

# Habilitar el servicio nftables para que cargue al boot
systemctl enable nftables
systemctl start nftables

# El servicio carga automáticamente /etc/nftables.conf al arrancar
\`\`\`

### 📖 iptables vs nftables: ¿cuál usar?

\`\`\`text
USA IPTABLES cuando:
  • Trabajas con sistemas legacy (RHEL 7, Debian 9, Ubuntu 18.04 o anterior)
  • Toda tu documentación/scripts existentes usan iptables
  • Necesitas compatibilidad máxima con herramientas de terceros

USA NFTABLES cuando:
  • Sistema moderno (RHEL 8+, Debian 10+, Ubuntu 20.04+)
  • Necesitas manejar IPv4 e IPv6 con el mismo ruleset
  • Tienes rulesets grandes donde el rendimiento importa
  • Quieres usar sets y mapas para reglas más eficientes

NOTA: En distribuciones modernas, \`iptables\` ya es un wrapper sobre nftables.
Puedes verificarlo:
  $ iptables --version
  iptables v1.8.7 (nf_tables)   ← indica que usa el backend nftables
\`\`\`

### 📋 Lo que debes recordar

* nftables unifica iptables, ip6tables, arptables y ebtables en una sola herramienta.
* La familia \`inet\` maneja IPv4 e IPv6 simultáneamente — úsala siempre.
* Los sets nativos permiten \`tcp dport { 22, 80, 443 }\` — más eficiente que tres reglas separadas.
* La persistencia requiere \`systemctl enable nftables\` que carga \`/etc/nftables.conf\` al boot.
* En sistemas modernos, \`iptables\` puede ser un wrapper sobre nftables.

### 🧪 Autoevaluación

1. ¿Cuál es la ventaja de la familia \`inet\` en nftables frente a usar la familia \`ip\`?
2. En iptables necesitarías 3 reglas para permitir los puertos 22, 80 y 443. ¿Cómo se hace en nftables con una sola regla?
3. ¿Cómo se añade dinámicamente una IP a un blocklist de nftables sin reescribir todo el ruleset?

---

1. La familia **inet** aplica a **IPv4 e IPv6 simultáneamente** en un solo ruleset. Con la familia \`ip\` solo se cubre IPv4 y habría que crear reglas duplicadas para ip6.
2. \`tcp dport { 22, 80, 443 } accept\` — los sets nativos de nftables permiten agrupar múltiples valores en una sola regla.
3. Con \`nft add element inet firewall blocklist { IP }\`. Si el set está definido en el ruleset, se puede modificar en tiempo real sin recargar las reglas.
`

export default content
