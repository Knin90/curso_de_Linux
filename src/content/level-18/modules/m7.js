const content = `
## Módulo 7 — DNSSEC: firma y validación de zonas

### 🎯 Objetivos de aprendizaje
* Entender por qué DNSSEC existe y qué ataques previene
* Comprender la cadena de confianza desde la raíz hasta la zona final
* Conocer los registros DNSSEC: DNSKEY, RRSIG, DS, NSEC/NSEC3
* Firmar una zona con \`dnssec-keygen\` y \`dnssec-signzone\`
* Verificar la validación DNSSEC con \`dig +dnssec\` y \`+cd\`
* Configurar validación DNSSEC en unbound

### ❓ El problema real
En 2008, Dan Kaminsky descubrió una vulnerabilidad crítica en DNS que permitía a un atacante envenenar la caché de cualquier resolver con respuestas falsas, redirigiendo el tráfico de millones de usuarios a servidores maliciosos sin que nadie lo notara. DNSSEC fue diseñado para resolver exactamente este problema. Hoy, tu empresa quiere firmar su zona DNS para proteger a sus usuarios de este tipo de ataques.

### 📖 El problema: envenenamiento de caché (Ataque Kaminsky)

DNS fue diseñado en los años 80 sin mecanismos de autenticación. Un resolver acepta como válida cualquier respuesta que llegue con el ID de transacción correcto y desde el puerto correcto. El ataque Kaminsky explotaba esto:

1. El atacante solicita al resolver que resuelva \`random123.example.com\` (nombre aleatorio).
2. El resolver consulta al autoritativo de \`example.com\`.
3. Antes de que llegue la respuesta legítima, el atacante inunda el resolver con respuestas falsas para \`example.com\`, probando IDs de transacción aleatoriamente.
4. Si alguna respuesta falsa coincide con el ID correcto, el resolver cachea la respuesta maliciosa.
5. Ahora \`www.example.com\` resuelve a la IP del atacante para todos los clientes de ese resolver.

**DNSSEC resuelve esto** añadiendo firmas criptográficas a los registros DNS. Un resolver con DNSSEC activo puede verificar matemáticamente que la respuesta es auténtica y no ha sido modificada.

### 📖 Cadena de confianza

DNSSEC construye una cadena de confianza desde la raíz (\`.\`) hasta cada zona:

\`\`\`
Zona raíz (.)
    → Firma su KSK con su clave privada
    → Publica DNSKEY con la clave pública
    → Trust Anchor: el resolver confía en la clave raíz por configuración (hardcoded)
         |
         ↓ DS record en la zona raíz apunta al KSK de .com
Zona .com
    → Tiene su propio DNSKEY (KSK y ZSK)
    → La zona raíz publica un registro DS con el hash del KSK de .com
         |
         ↓ DS record en .com apunta al KSK de example.com
Zona example.com
    → Tiene su propio DNSKEY
    → .com publica un registro DS con el hash del KSK de example.com
    → Todos los registros de la zona están firmados con RRSIG
\`\`\`

Si algún eslabón de la cadena falla, el resolver rechaza la respuesta (SERVFAIL).

### 📖 Registros DNSSEC

**DNSKEY** — contiene la clave pública de la zona. Existen dos tipos:
- **KSK (Key Signing Key)** — flag 257: firma el propio DNSKEY rrset. Larga vida útil (1-2 años). Su hash va en el registro DS del padre.
- **ZSK (Zone Signing Key)** — flag 256: firma todos los demás registros de la zona. Vida útil más corta (mensual/trimestral). Se rota más frecuentemente.

\`\`\`bash
dig DNSKEY example.com

# example.com. 3600 IN DNSKEY 257 3 13 mdsswUyr3DPW...  ← KSK (flag 257)
# example.com. 3600 IN DNSKEY 256 3 13 oJMRESz5E57...  ← ZSK (flag 256)
\`\`\`

**RRSIG** — firma criptográfica de un rrset específico. Incluye nombre del algoritmo, expiración, y la firma en sí:

\`\`\`bash
dig A www.example.com +dnssec

# www.example.com. 3600 IN A 93.184.216.34
# www.example.com. 3600 IN RRSIG A 13 3 3600 20240201000000 20240101000000 12345 example.com. AbCd...
#                                  ^^ ^^ ^^                                 ^^^^^
#                               algo  labels  orig_ttl                       key_tag
\`\`\`

**DS (Delegation Signer)** — hash del KSK de la zona hija. Publicado en la zona padre para establecer el enlace de la cadena de confianza:

\`\`\`bash
# El DS de example.com está en la zona .com
dig DS example.com @a.gtld-servers.net

# example.com. 86400 IN DS 370 13 2 BE74359954660069D5C63D200C39F5603827D7DD02B56F120EE9F3A86764247C
#                         ^^^ ^^ ^
#                    key_tag algo digest_type
\`\`\`

**NSEC y NSEC3** — prueban la no-existencia de un nombre (respuesta auténtica a NXDOMAIN):
- **NSEC** — lista el siguiente nombre existente en la zona. Problema: permite enumerar todos los nombres de la zona.
- **NSEC3** — usa hashes de los nombres, dificultando la enumeración.

### 📖 Generación de claves con dnssec-keygen

\`\`\`bash
# Crear directorio para las claves
mkdir -p /etc/bind/keys/empresa.com
cd /etc/bind/keys/empresa.com

# Generar ZSK (Zone Signing Key)
# -a: algoritmo, -b: bits, -n: tipo (ZONE), -K: directorio
dnssec-keygen -a ECDSAP256SHA256 -n ZONE empresa.com
# Genera dos archivos:
# Kempresa.com.+013+12345.key      ← clave pública (va en DNSKEY)
# Kempresa.com.+013+12345.private  ← clave privada (NUNCA publicar)

# Generar KSK (Key Signing Key) — flag -f KSK
dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK empresa.com
# Kempresa.com.+013+67890.key
# Kempresa.com.+013+67890.private

ls -la
# Kempresa.com.+013+12345.key     (ZSK pública)
# Kempresa.com.+013+12345.private (ZSK privada — permisos 600)
# Kempresa.com.+013+67890.key     (KSK pública)
# Kempresa.com.+013+67890.private (KSK privada — permisos 600)
\`\`\`

**Algoritmos recomendados en 2024:**
- \`ECDSAP256SHA256\` (algoritmo 13) — recomendado: seguro, claves pequeñas, rápido
- \`ECDSAP384SHA384\` (algoritmo 14) — mayor seguridad, más lento
- \`ED25519\` (algoritmo 15) — muy recomendado: rápido y claves muy pequeñas
- ~~\`RSASHA256\`~~ — evitar para nuevas zonas (claves más grandes)

### 📖 Firmar la zona con dnssec-signzone

\`\`\`bash
# Incluir las claves públicas en el archivo de zona
cat /etc/bind/keys/empresa.com/Kempresa.com.+013+12345.key >> /etc/bind/zones/db.empresa.com
cat /etc/bind/keys/empresa.com/Kempresa.com.+013+67890.key >> /etc/bind/zones/db.empresa.com

# Firmar la zona
# -o: nombre de la zona, -k: KSK, -S: incluir claves automáticamente
# -e: expiración de firmas (30 días desde ahora)
cd /etc/bind/zones
dnssec-signzone \\
    -o empresa.com \\
    -k /etc/bind/keys/empresa.com/Kempresa.com.+013+67890 \\
    -S \\
    -e +2592000 \\
    /etc/bind/zones/db.empresa.com \\
    /etc/bind/keys/empresa.com/Kempresa.com.+013+12345

# Genera: db.empresa.com.signed
# También genera: dsset-empresa.com. (el DS record para publicar en el padre)
\`\`\`

\`\`\`bash
# Ver el DS record a publicar en el registrar
cat dsset-empresa.com.
# empresa.com. IN DS 67890 13 2 <hash>

# Actualizar named.conf para usar la zona firmada
# zone "empresa.com" { file "/etc/bind/zones/db.empresa.com.signed"; ... };

named-checkzone empresa.com /etc/bind/zones/db.empresa.com.signed
rndc reload empresa.com
\`\`\`

### 📖 Configurar validación DNSSEC en unbound

\`\`\`yaml
# /etc/unbound/unbound.conf
server:
    # Trust anchor automático (descarga y mantiene la clave raíz)
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    # Validación estricta
    harden-dnssec-stripped: yes    # rechazar si se eliminaron registros DNSSEC
    harden-algo-downgrade: no      # aceptar algoritmos más débiles si son válidos
\`\`\`

\`\`\`bash
# Inicializar el trust anchor
unbound-anchor -a /var/lib/unbound/root.key
systemctl restart unbound
\`\`\`

### 📖 Verificación con dig

\`\`\`bash
# Solicitar registros DNSSEC
dig A www.example.com +dnssec

# La respuesta válida incluirá:
# ;; flags: qr rd ra ad;     ← 'ad' = Authenticated Data (DNSSEC válido)
# www.example.com. 3600 IN A 93.184.216.34
# www.example.com. 3600 IN RRSIG A 13 3 3600 ...

# Verificar zona firmada directamente
dig @ns1.empresa.com A www.empresa.com +dnssec

# Deshabilitar validación (Checking Disabled) — ver respuesta sin validar
dig A www.empresa.com +cd

# Probar que un dominio con DNSSEC inválido falla correctamente
dig A www.dnssec-failed.org
# ;; status: SERVFAIL  ← correcto, el resolver rechazó por DNSSEC inválido

# Ver la cadena completa de DS
dig +trace +dnssec A www.example.com
\`\`\`

### 📖 Key rollover

Las claves deben rotarse periódicamente. El proceso para ZSK:

\`\`\`bash
# 1. Generar nueva ZSK
dnssec-keygen -a ECDSAP256SHA256 -n ZONE empresa.com

# 2. Publicar la nueva clave (añadir al archivo de zona, refirmar)
# Las firmas antiguas siguen siendo válidas durante el overlap

# 3. Esperar a que los caches tengan la nueva ZSK (TTL del DNSKEY)

# 4. Refirmar la zona con la nueva ZSK

# 5. Eliminar la ZSK antigua de la zona y refirmar
\`\`\`

Para KSK el proceso es más complejo porque requiere actualizar el DS en el registrar.

### 📖 bind9 con DNSSEC automático (inline signing)

bind9 soporta firma automática sin necesidad de \`dnssec-signzone\` manual:

\`\`\`bash
# En named.conf.local:
zone "empresa.com" {
    type primary;
    file "/etc/bind/zones/db.empresa.com";
    inline-signing yes;
    auto-dnssec maintain;   # gestiona automáticamente firmas y rollovers
    key-directory "/etc/bind/keys/empresa.com";
};
\`\`\`

\`\`\`bash
# Con inline-signing, solo editar el archivo sin firmar
# bind9 genera automáticamente db.empresa.com.signed en memoria
rndc reload empresa.com
rndc signing -list empresa.com  # ver estado de firmas
\`\`\`

### 📋 Lo que debes recordar
* DNSSEC previene envenenamiento de caché añadiendo firmas criptográficas verificables.
* La cadena de confianza va de raíz a TLD a zona, enlazada por registros DS en la zona padre.
* KSK (flag 257) firma el DNSKEY; ZSK (flag 256) firma el resto. El DS en el padre apunta al KSK.
* NSEC3 es preferible a NSEC porque dificulta la enumeración de la zona.
* El flag \`ad\` en la respuesta de \`dig\` indica validación DNSSEC exitosa.
* \`+cd\` desactiva la validación para debug. \`SERVFAIL\` en zona DNSSEC indica fallo de validación.
* Las firmas tienen fecha de expiración — automatizar el proceso de re-firma es crítico.

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre KSK y ZSK, y por qué se usan dos tipos de clave?
2. Ejecutas \`dig A www.empresa.com\` y recibes \`status: SERVFAIL\` aunque el servidor está activo. Si añades \`+cd\` y la consulta tiene éxito, ¿qué indica esto?
3. ¿Qué registro debes publicar en el registrar de tu dominio para completar la cadena de confianza DNSSEC?

---

1. El KSK (flag 257) tiene larga vida útil y su clave pública (como hash) se publica en la zona padre como DS. El ZSK (flag 256) firma todos los registros de la zona y se rota más frecuentemente por facilidad operativa. Se separan para que el rollover de ZSK no requiera actualizar el DS en el padre (operación más costosa y lenta).
2. Indica que la zona tiene problemas de DNSSEC: las firmas son inválidas, han expirado, o faltan registros DNSSEC esperados. El validador del resolver rechaza la respuesta porque no puede verificar su autenticidad. \`+cd\` deshabilita la validación, permitiendo ver la respuesta sin autenticar.
3. El registro **DS (Delegation Signer)** — contiene el hash del KSK de tu zona. Se genera como \`dsset-empresa.com.\` al firmar con \`dnssec-signzone\`, y se debe publicar en la zona padre (\`.com\` en este caso) a través del registrar de dominio.
`

export default content
