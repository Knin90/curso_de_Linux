const content = `
## Módulo 5 — Servidor DNS autoritativo con bind9

### 🎯 Objetivos de aprendizaje
* Instalar y configurar bind9 como servidor DNS autoritativo
* Estructurar correctamente \`named.conf\` y sus archivos incluidos
* Escribir archivos de zona con registros SOA, NS, A, MX y otros tipos
* Validar la configuración con \`named-checkconf\` y \`named-checkzone\`
* Gestionar el servidor con \`rndc\` (recarga, estadísticas, flush de caché)
* Configurar transferencias de zona para servidores secundarios
* Habilitar logging estructurado para diagnóstico

### ❓ El problema real
Tu empresa necesita alojar su propio DNS autoritativo para el dominio \`empresa.com\` y su zona inversa. Los DNS externos (registrar) delegan a tus servidores \`ns1.empresa.com\` y \`ns2.empresa.com\`. Debes configurar bind9 en el servidor primario de forma que responda con autoridad para la zona, permita transferencias solo al secundario, y tenga logging adecuado para auditoría.

### 📖 Instalación

\`\`\`bash
# Debian/Ubuntu
apt-get install -y bind9 bind9-utils bind9-doc

# RHEL/Rocky/AlmaLinux
dnf install -y bind bind-utils

# Verificar
named -v
# BIND 9.18.1 (Extended Support Version)

systemctl enable --now named   # RHEL
# o
systemctl enable --now bind9   # Debian/Ubuntu
\`\`\`

### 📖 Estructura de archivos de bind9

\`\`\`
/etc/bind/                        # Debian/Ubuntu
├── named.conf                    # Archivo principal (solo incluye otros)
├── named.conf.options            # Opciones globales del servidor
├── named.conf.local              # Definición de zonas locales
├── named.conf.default-zones      # Zonas raíz y localhost por defecto
└── zones/
    ├── db.empresa.com            # Archivo de zona directa
    └── db.203.0.113              # Archivo de zona inversa

/var/named/                       # RHEL — directorio de zonas
/var/log/named/                   # Logs
\`\`\`

### 📖 named.conf.options: configuración global

\`\`\`bash
# /etc/bind/named.conf.options
options {
    directory "/var/cache/bind";

    # Reenviar consultas no autoritativas a resolvers upstream
    forwarders {
        9.9.9.9;
        149.112.112.112;
    };
    forward only;   # no intentar resolver recursivamente si forwarders fallan

    # Permitir recursión solo desde redes internas
    # ¡CRÍTICO! Un resolver abierto puede usarse para amplificación DDoS
    allow-recursion {
        127.0.0.1;
        ::1;
        192.168.0.0/16;
        10.0.0.0/8;
    };

    # Quién puede hacer consultas al servidor
    allow-query {
        any;   # zona pública: todos pueden consultar
    };

    # Deshabilitar recursión para servidores puramente autoritativos
    # recursion no;

    # DNSSEC
    dnssec-validation auto;

    # Versión de bind oculta (seguridad)
    version "not disclosed";

    # Limitar tamaño de respuestas UDP (ayuda con amplificación)
    max-udp-size 4096;

    listen-on { any; };
    listen-on-v6 { any; };
};
\`\`\`

### 📖 named.conf.local: definición de zonas

\`\`\`bash
# /etc/bind/named.conf.local

# Zona directa (primaria)
zone "empresa.com" {
    type primary;               # este servidor es el primario
    file "/etc/bind/zones/db.empresa.com";
    allow-transfer {
        192.168.1.2;            # solo el secundario puede hacer AXFR
    };
    also-notify {
        192.168.1.2;            # notificar al secundario cuando haya cambios
    };
};

# Zona inversa para 203.0.113.0/24
zone "113.0.203.in-addr.arpa" {
    type primary;
    file "/etc/bind/zones/db.203.0.113";
    allow-transfer {
        192.168.1.2;
    };
};
\`\`\`

### 📖 Archivo de zona directa

\`\`\`bash
mkdir -p /etc/bind/zones
\`\`\`

\`\`\`dns-zone
; /etc/bind/zones/db.empresa.com
; Punto y coma = comentario en zona DNS

\$ORIGIN empresa.com.    ; todos los nombres relativos se completan con esto
\$TTL 3600               ; TTL por defecto para todos los registros

; SOA — obligatorio, siempre el primero
@   IN  SOA  ns1.empresa.com.  admin.empresa.com. (
        2024010801  ; Serial: YYYYMMDDNN — incrementar en cada cambio
        3600        ; Refresh: secundario consulta cada 1 hora
        900         ; Retry: si refresh falla, reintentar cada 15 min
        604800      ; Expire: secundario expira zona tras 7 días sin sync
        300 )       ; Minimum TTL / caché negativa NXDOMAIN

; Servidores de nombres (NS) — deben coincidir con lo registrado en el TLD
@   IN  NS   ns1.empresa.com.
@   IN  NS   ns2.empresa.com.

; Registros de dirección para los propios nameservers (glue records)
ns1         IN  A    203.0.113.1
ns2         IN  A    203.0.113.2

; Apex del dominio
@           IN  A    203.0.113.10
@           IN  AAAA 2001:db8::10

; Subdominio WWW
www         IN  A    203.0.113.10
www         IN  AAAA 2001:db8::10

; Correo
@           IN  MX   10 mail.empresa.com.
@           IN  MX   20 mail2.empresa.com.
mail        IN  A    203.0.113.20
mail2       IN  A    203.0.113.21

; SPF
@           IN  TXT  "v=spf1 ip4:203.0.113.0/24 -all"

; DMARC
_dmarc      IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@empresa.com"

; Alias
ftp         IN  CNAME www.empresa.com.
blog        IN  CNAME www.empresa.com.

; SRV para SIP
_sip._tcp   IN  SRV  10 60 5060 sip.empresa.com.
sip         IN  A    203.0.113.30

; CAA
@           IN  CAA  0 issue "letsencrypt.org"
\`\`\`

### 📖 Archivo de zona inversa

\`\`\`dns-zone
; /etc/bind/zones/db.203.0.113
\$ORIGIN 113.0.203.in-addr.arpa.
\$TTL 3600

@   IN  SOA  ns1.empresa.com.  admin.empresa.com. (
        2024010801
        3600
        900
        604800
        300 )

@   IN  NS   ns1.empresa.com.
@   IN  NS   ns2.empresa.com.

; PTR — solo el último octeto como nombre relativo
1   IN  PTR  ns1.empresa.com.
2   IN  PTR  ns2.empresa.com.
10  IN  PTR  empresa.com.
20  IN  PTR  mail.empresa.com.
21  IN  PTR  mail2.empresa.com.
30  IN  PTR  sip.empresa.com.
\`\`\`

### 📖 Validación y recarga

**SIEMPRE validar antes de recargar:**

\`\`\`bash
# Validar configuración global de named
named-checkconf /etc/bind/named.conf
# Sin salida = sin errores

# Validar archivo de zona
named-checkzone empresa.com /etc/bind/zones/db.empresa.com
# zone empresa.com/IN: loaded serial 2024010801
# OK

# Validar zona inversa
named-checkzone 113.0.203.in-addr.arpa /etc/bind/zones/db.203.0.113

# Recargar solo las zonas (sin reiniciar el proceso — zero downtime)
rndc reload

# Recargar una zona específica
rndc reload empresa.com

# Forzar verificación de zona
rndc retransfer empresa.com   # en secundario, re-pull del primario
\`\`\`

### 📖 Gestión con rndc

\`\`\`bash
# Estado del servidor
rndc status

# Estadísticas detalladas (escribe a /var/cache/bind/named_stats.txt)
rndc stats
cat /var/cache/bind/named_stats.txt | head -50

# Vaciar caché del resolver integrado
rndc flush

# Recargar sin interrumpir queries en vuelo
rndc reload

# Congelar zona para edición (deshabilita actualizaciones dinámicas)
rndc freeze empresa.com
# editar el archivo
rndc thaw empresa.com

# Consultar una zona en memoria
rndc dumpdb -zones
\`\`\`

### 📖 Logging

\`\`\`bash
# Añadir al named.conf.options o named.conf:
logging {
    channel default_log {
        file "/var/log/named/default.log" versions 3 size 10m;
        severity dynamic;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    channel queries_log {
        file "/var/log/named/queries.log" versions 5 size 50m;
        severity info;
        print-time yes;
    };

    category default { default_log; };
    category queries { queries_log; };
    category security { default_log; };
    category config { default_log; };
};
\`\`\`

\`\`\`bash
mkdir -p /var/log/named
chown bind:bind /var/log/named
rndc reload
\`\`\`

### 📖 Workflow completo para añadir un registro

\`\`\`bash
# 1. Editar el archivo de zona
vim /etc/bind/zones/db.empresa.com

# 2. Incrementar el serial (CRÍTICO)
# Cambiar: 2024010801 → 2024010802

# 3. Validar
named-checkzone empresa.com /etc/bind/zones/db.empresa.com

# 4. Recargar (solo si la validación es OK)
rndc reload empresa.com

# 5. Verificar
dig @localhost A nuevo-host.empresa.com
dig @ns1.empresa.com A nuevo-host.empresa.com
\`\`\`

### 📋 Lo que debes recordar
* \`allow-recursion\` debe limitarse siempre a IPs de confianza en un servidor autoritativo público.
* El serial del SOA debe incrementarse en cada modificación. Si no se incrementa, los secundarios no transfieren la zona.
* Usar \`named-checkconf\` y \`named-checkzone\` antes de cualquier \`rndc reload\`.
* \`rndc reload\` recarga zonas sin downtime; \`systemctl restart named\` reinicia el proceso completo.
* \`allow-transfer\` limita quién puede hacer AXFR — no dejarlo abierto en producción.
* El formato FQDN en archivos de zona: siempre terminar con punto (\`empresa.com.\`). Sin punto es relativo al \$ORIGIN.

### 🧪 Autoevaluación
1. ¿Qué ocurre si modificas el archivo de zona pero olvidas incrementar el serial antes de hacer \`rndc reload\`?
2. ¿Cuál es el riesgo de configurar \`allow-recursion { any; };\` en un servidor autoritativo público?
3. Añades el registro \`tienda   IN  A   203.0.113.50\` al archivo de zona. ¿A qué FQDN resuelve este nombre relativo si \`\$ORIGIN\` es \`empresa.com.\`?

---

1. El servidor primario carga la nueva zona, pero los servidores secundarios no detectarán ningún cambio porque el serial no es mayor que el que ya tienen. Los secundarios seguirán sirviendo la versión antigua hasta que se incremente el serial y se recargue.
2. El servidor puede ser usado para ataques de amplificación DNS (DNS amplification DDoS): un atacante envía consultas con IP origen falsificada, y el servidor envía respuestas grandes a la víctima. Un servidor abierto también desperdicia recursos respondiendo consultas externas arbitrarias.
3. Resuelve a \`tienda.empresa.com.\` — el nombre relativo \`tienda\` se completa con el \$ORIGIN \`empresa.com.\`.
`

export default content
