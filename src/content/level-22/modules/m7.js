const content = `
## Módulo 7 — Certificados internos: CA propia con openssl

### 🎯 Objetivos de aprendizaje
* Crear una CA raíz auto-firmada con openssl
* Configurar la estructura de directorios de una CA
* Firmar certificados de servidor con la CA propia
* Generar y mantener una CRL (Certificate Revocation List)
* Distribuir el certificado raíz a clientes para que confíen en la CA

---

### ❓ El problema real

Para servicios internos que nunca serán públicos — bases de datos, APIs entre microservicios,
paneles de administración, VPN — no tiene sentido usar Let's Encrypt (que requiere validación
pública del dominio). Crear tu propia CA te permite emitir certificados válidos para dominios
internos (\`servicio.corp\`, IPs privadas, etc.) sin depender de terceros, sin límites de tasa,
y con control total sobre la cadena de confianza.

---

### 📖 Estructura de directorios de la CA

La estructura estándar de openssl para gestionar una CA:

\`\`\`bash
sudo mkdir -p /etc/ssl/CA/{newcerts,private,crl}
sudo chmod 700 /etc/ssl/CA/private

# Archivos de estado de la CA
sudo touch /etc/ssl/CA/index.txt
echo "1000" | sudo tee /etc/ssl/CA/serial
echo "1000" | sudo tee /etc/ssl/CA/crlnumber
\`\`\`

Descripción:
- \`newcerts/\` — certificados emitidos (nombrados por número de serie)
- \`private/\` — clave privada de la CA (solo root puede leer)
- \`crl/\` — listas de revocación generadas
- \`index.txt\` — base de datos de certificados emitidos
- \`serial\` — número de serie del próximo certificado
- \`crlnumber\` — número de la próxima CRL

---

### 📖 Configuración openssl.cnf para la CA

Crear el archivo de configuración:

\`\`\`bash
sudo nano /etc/ssl/CA/openssl.cnf
\`\`\`

\`\`\`ini
[ ca ]
default_ca = CA_default

[ CA_default ]
dir               = /etc/ssl/CA
certs             = \$dir/newcerts
crl_dir           = \$dir/crl
database          = \$dir/index.txt
new_certs_dir     = \$dir/newcerts
certificate       = \$dir/ca.crt
serial            = \$dir/serial
crlnumber         = \$dir/crlnumber
crl               = \$dir/crl/ca.crl
private_key       = \$dir/private/ca.key
name_opt          = ca_default
cert_opt          = ca_default
default_days      = 365
default_crl_days  = 30
default_md        = sha256
preserve          = no
policy            = policy_strict

[ policy_strict ]
countryName             = match
stateOrProvinceName     = optional
organizationName        = match
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[ policy_loose ]
countryName             = optional
stateOrProvinceName     = optional
localityName            = optional
organizationName        = optional
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[ req ]
default_bits        = 4096
distinguished_name  = req_distinguished_name
string_mask         = utf8only
default_md          = sha256
x509_extensions     = v3_ca

[ req_distinguished_name ]
countryName                     = Country Name (2 letter code)
stateOrProvinceName             = State or Province Name
localityName                    = Locality Name
organizationName                = Organization Name
organizationalUnitName          = Organizational Unit Name
commonName                      = Common Name
emailAddress                    = Email Address

countryName_default             = MX
stateOrProvinceName_default     = CDMX
organizationName_default        = Empresa SA de CV

[ v3_ca ]
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints       = critical, CA:true
keyUsage               = critical, digitalSignature, cRLSign, keyCertSign

[ v3_intermediate_ca ]
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints       = critical, CA:true, pathlen:0
keyUsage               = critical, digitalSignature, cRLSign, keyCertSign

[ server_cert ]
basicConstraints       = CA:FALSE
nsCertType             = server
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage               = critical, digitalSignature, keyEncipherment
extendedKeyUsage       = serverAuth

[ client_cert ]
basicConstraints       = CA:FALSE
nsCertType             = client
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage               = critical, digitalSignature
extendedKeyUsage       = clientAuth
\`\`\`

---

### 📖 Generar la clave y el certificado raíz

\`\`\`bash
# Clave privada de la CA (cifrada con AES-256)
sudo openssl genrsa -aes256 -out /etc/ssl/CA/private/ca.key 4096
sudo chmod 400 /etc/ssl/CA/private/ca.key

# Certificado auto-firmado de la CA raíz (válido 10 años)
sudo openssl req -config /etc/ssl/CA/openssl.cnf \\
  -key /etc/ssl/CA/private/ca.key \\
  -new -x509 -days 3650 \\
  -extensions v3_ca \\
  -out /etc/ssl/CA/ca.crt \\
  -subj "/C=MX/ST=CDMX/O=Empresa SA de CV/CN=Empresa Internal CA"
\`\`\`

Verificar:
\`\`\`bash
openssl x509 -text -noout -in /etc/ssl/CA/ca.crt | grep -E "Subject|Issuer|Not After|CA:"
\`\`\`
\`\`\`
        Issuer: C=MX, ST=CDMX, O=Empresa SA de CV, CN=Empresa Internal CA
        Subject: C=MX, ST=CDMX, O=Empresa SA de CV, CN=Empresa Internal CA
            Not After : Aug  1 00:00:00 2035 GMT
                CA:TRUE
\`\`\`
Issuer = Subject confirma que es auto-firmado (CA raíz).

---

### 📖 Firmar un certificado de servidor

**Paso 1: Generar la clave del servidor**
\`\`\`bash
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out servidor.key
\`\`\`

**Paso 2: Crear la CSR**
\`\`\`bash
openssl req -new -key servidor.key -out servidor.csr \\
  -subj "/C=MX/ST=CDMX/O=Empresa SA de CV/CN=api.corp.empresa.com"
\`\`\`

**Paso 3: Crear archivo de extensiones para el SAN**
\`\`\`bash
cat > servidor-ext.cnf <<EOF
[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = api.corp.empresa.com
DNS.2 = api.empresa.internal
IP.1  = 10.0.1.50
EOF
\`\`\`

**Paso 4: Firmar con la CA**
\`\`\`bash
sudo openssl ca -config /etc/ssl/CA/openssl.cnf \\
  -extensions server_cert \\
  -extfile servidor-ext.cnf -extensions req_ext \\
  -days 365 -notext -md sha256 \\
  -in servidor.csr \\
  -out servidor.crt
\`\`\`

Salida:
\`\`\`
Sign the certificate? [y/n]: y
1 out of 1 certificate requests certified, commit? [y/n]: y
Write out database with 1 new entries
Data Base Updated
\`\`\`

El certificado firmado aparece en \`/etc/ssl/CA/newcerts/1000.pem\` y en \`servidor.crt\`.

Verificar:
\`\`\`bash
openssl verify -CAfile /etc/ssl/CA/ca.crt servidor.crt
# servidor.crt: OK
\`\`\`

---

### 📖 Revocar un certificado y generar CRL

Si un certificado es comprometido:

\`\`\`bash
# Revocar por número de serie (o por ruta al cert)
sudo openssl ca -config /etc/ssl/CA/openssl.cnf \\
  -revoke /etc/ssl/CA/newcerts/1000.pem

# Generar la CRL actualizada
sudo openssl ca -config /etc/ssl/CA/openssl.cnf \\
  -gencrl -out /etc/ssl/CA/crl/ca.crl
\`\`\`

Verificar el contenido de la CRL:
\`\`\`bash
openssl crl -text -noout -in /etc/ssl/CA/crl/ca.crl
\`\`\`

\`\`\`
Certificate Revocation List (CRL):
        Version 2 (0x1)
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN=Empresa Internal CA, O=Empresa SA de CV, ...
        Last Update: Aug  4 10:00:00 2025 GMT
        Next Update: Sep  3 10:00:00 2025 GMT
Revoked Certificates:
    Serial Number: 1000
        Revocation Date: Aug  4 10:00:00 2025 GMT
\`\`\`

La CRL tiene fecha de expiración (\`Next Update\`). Debe regenerarse antes de que expire,
de lo contrario los clientes que la consulten la considerarán inválida.

Configurar nginx para verificar la CRL:
\`\`\`nginx
ssl_crl /etc/ssl/CA/crl/ca.crl;
\`\`\`

---

### 📖 Distribuir el certificado raíz a los clientes

Para que los clientes confíen en los certificados firmados por tu CA, deben tener el certificado
raíz en su almacén de confianza.

**En servidores Linux (Debian/Ubuntu):**
\`\`\`bash
sudo cp /etc/ssl/CA/ca.crt /usr/local/share/ca-certificates/empresa-internal-ca.crt
sudo update-ca-certificates
\`\`\`

**En servidores Linux (RHEL/CentOS):**
\`\`\`bash
sudo cp /etc/ssl/CA/ca.crt /etc/pki/ca-trust/source/anchors/empresa-internal-ca.crt
sudo update-ca-trust
\`\`\`

**En macOS (para desarrollo):**
\`\`\`bash
sudo security add-trusted-cert -d -r trustRoot \\
  -k /Library/Keychains/System.keychain ca.crt
\`\`\`

**En Windows (para desarrollo):**
\`\`\`
certlm.msc → Entidades de certificación raíz de confianza → Importar → ca.crt
\`\`\`

**Para curl en scripts (sin instalar en el sistema):**
\`\`\`bash
curl --cacert /etc/ssl/CA/ca.crt https://api.corp.empresa.com/healthz
\`\`\`

---

### 📖 Casos de uso: cuándo usar CA propia

| Caso | CA propia | Let's Encrypt |
|---|---|---|
| Dominio público (\`empresa.com\`) | No recomendado | ✅ |
| Dominio interno (\`api.corp\`, IP privada) | ✅ | No posible |
| Wildcard sin DNS público | ✅ | Requiere DNS-01 |
| mTLS con certificados de cliente | ✅ | No aplica |
| VPN (OpenVPN, WireGuard) | ✅ | No aplica |
| Entorno de desarrollo local | ✅ | Requiere port 80/DNS |
| Muchos certificados por día | ✅ (sin límite) | Límite 50/semana |

---

### 📋 Lo que debes recordar
* La CA raíz se crea con \`openssl req -x509\` y su clave privada debe protegerse con contraseña y permisos 400
* \`openssl ca -config\` gestiona la firma, el \`index.txt\` y el número de serie automáticamente
* Los certificados firmados van a \`newcerts/\` nombrados por número de serie
* Siempre incluir el SAN al firmar certificados de servidor (los navegadores modernos lo requieren)
* La CRL tiene fecha de expiración y debe regenerarse periódicamente
* Para distribuir la CA, copiar a \`/usr/local/share/ca-certificates/\` y ejecutar \`update-ca-certificates\`
* CA propia es la solución correcta para servicios internos, mTLS y dominios no públicos

---

### 🧪 Autoevaluación

1. Creas una CA raíz y firmas un certificado de servidor. curl con \`--cacert ca.crt\` dice OK, pero el navegador muestra "no confiable". ¿Cuál es la causa y cómo resolverlo?
2. La CRL de tu CA interna expiró (la fecha \`Next Update\` pasó). ¿Qué impacto tiene esto en los clientes que verifican CRL?
3. Firmas un certificado de servidor pero el navegador da "hostname mismatch" aunque el CN es correcto. ¿Por qué y cómo se soluciona al firmar?

---

1. El certificado raíz de la CA no está en el almacén de confianza del navegador. Para Firefox e IE/Edge hay que importarlo manualmente en las preferencias de certificados del navegador. Para Chrome en sistemas Linux/Windows, instalarlo en el almacén del sistema con \`update-ca-certificates\` (Chrome usa el almacén del SO).
2. Los clientes que verifican la CRL la rechazarán como inválida o expirada, y dependiendo de su política (hard-fail vs soft-fail) podrían rechazar todos los certificados de esa CA o ignorar la verificación de revocación. La solución inmediata es regenerar la CRL con \`openssl ca -gencrl\`.
3. Los navegadores modernos no validan el CN para verificar el hostname; solo verifican el campo SAN. Al firmar, se debe usar \`-extfile\` con un bloque \`[alt_names]\` que incluya el dominio en \`DNS.1\`. Sin SAN, el certificado se considerará inválido para ese hostname aunque el CN coincida.
`

export default content
