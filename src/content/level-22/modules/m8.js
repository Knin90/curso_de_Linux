const content = `
## Módulo 8 — Proyecto real: gestión completa de PKI

### 🎯 Objetivos de aprendizaje
* Construir una jerarquía PKI de tres niveles (Root CA → Intermediate CA → Certificado de servidor)
* Emitir certificados con Subject Alternative Names (SAN) para producción moderna
* Configurar nginx con cadena de certificados completa e Intermediate CA
* Implementar autenticación mutua TLS (mTLS) con certificados de cliente
* Distribuir la Root CA al sistema operativo para que todos los clientes confíen en ella

### ❓ El problema real

La empresa necesita asegurar su API interna \`api.empresa.internal\` con TLS y autenticación mutua. Los requisitos son:

- TLS válido sin advertencias de seguridad (cadena de confianza completa)
- Solo los clientes con certificado emitido por la CA corporativa pueden acceder
- La Root CA no debe usarse directamente para firmar certificados (práctica segura: si la Intermediate CA se compromete, se puede revocar sin tocar la Root CA)

### 📖 Estructura del proyecto

\`\`\`
/root/pki/
├── root-ca/
│   ├── root-ca.key
│   └── root-ca.crt
├── intermediate-ca/
│   ├── intermediate-ca.key
│   ├── intermediate-ca.csr
│   ├── intermediate-ca.ext
│   └── intermediate-ca.crt
├── server/
│   ├── server.key
│   ├── server-san.ext
│   ├── server.csr
│   ├── server.crt
│   └── fullchain.crt
└── client/
    ├── client.key
    ├── client.csr
    └── client.crt

/etc/nginx/sites-available/api.empresa.internal
\`\`\`

### 📖 Paso 1 — Crear la Root CA

La Root CA es la raíz de confianza. Su clave privada debe protegerse al máximo — en producción, se guarda en un HSM o en un sistema air-gapped.

\`\`\`bash
# Crear estructura de directorios
mkdir -p /root/pki/{root-ca,intermediate-ca,server,client}
cd /root/pki

# Crear clave privada de la Root CA (4096 bits, cifrada con AES-256)
# Se pedirá una passphrase — usar una contraseña fuerte y guardarla en un vault
openssl genrsa -aes256 -out root-ca/root-ca.key 4096

# Crear el certificado auto-firmado de la Root CA
# -x509: auto-firmado | -new: nueva petición | -days 3650: 10 años
openssl req -x509 -new -nodes \
    -key root-ca/root-ca.key \
    -sha256 \
    -days 3650 \
    -out root-ca/root-ca.crt \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Empresa SA/OU=IT Security/CN=Empresa Root CA"
\`\`\`

\`\`\`bash
# Verificar el certificado creado
openssl x509 -in root-ca/root-ca.crt -text -noout | grep -E "Subject:|Issuer:|Not|CA:"
\`\`\`

**Salida esperada:**
\`\`\`
        Issuer: C=ES, ST=Madrid, L=Madrid, O=Empresa SA, OU=IT Security, CN=Empresa Root CA
        Validity
            Not Before: Mar 15 12:00:00 2024 GMT
            Not After : Mar 13 12:00:00 2034 GMT
        Subject: C=ES, ST=Madrid, L=Madrid, O=Empresa SA, OU=IT Security, CN=Empresa Root CA
                CA:TRUE
\`\`\`

El campo \`CA:TRUE\` confirma que este certificado puede firmar otros certificados.

### 📖 Paso 2 — Crear la Intermediate CA

La Intermediate CA firma los certificados del día a día. Si se compromete, se puede revocar y reemplazar sin invalidar la Root CA.

\`\`\`bash
# Crear clave privada de la Intermediate CA
openssl genrsa -aes256 -out intermediate-ca/intermediate-ca.key 4096

# Crear la CSR (Certificate Signing Request) de la Intermediate CA
openssl req -new \
    -key intermediate-ca/intermediate-ca.key \
    -out intermediate-ca/intermediate-ca.csr \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Empresa SA/OU=IT Security/CN=Empresa Intermediate CA"

# Crear extensiones para la Intermediate CA
# pathlen:0 significa que esta CA no puede crear CAs subordinadas
cat > intermediate-ca/intermediate-ca.ext <<EOF
[v3_intermediate_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOF

# Firmar la CSR con la Root CA (5 años de validez)
openssl x509 -req \
    -in intermediate-ca/intermediate-ca.csr \
    -CA root-ca/root-ca.crt \
    -CAkey root-ca/root-ca.key \
    -CAcreateserial \
    -out intermediate-ca/intermediate-ca.crt \
    -days 1825 \
    -sha256 \
    -extensions v3_intermediate_ca \
    -extfile intermediate-ca/intermediate-ca.ext
\`\`\`

\`\`\`bash
# Verificar la cadena: el Issuer debe ser la Root CA
openssl x509 -in intermediate-ca/intermediate-ca.crt -text -noout | grep -E "Subject:|Issuer:|pathlen"
\`\`\`

**Salida esperada:**
\`\`\`
        Issuer: C=ES, ST=Madrid, O=Empresa SA, CN=Empresa Root CA
        Subject: C=ES, ST=Madrid, O=Empresa SA, CN=Empresa Intermediate CA
                CA:TRUE, pathlen:0
\`\`\`

\`\`\`bash
# Verificar que la Intermediate CA es válida bajo la Root CA
openssl verify -CAfile root-ca/root-ca.crt intermediate-ca/intermediate-ca.crt
# intermediate-ca/intermediate-ca.crt: OK
\`\`\`

### 📖 Paso 3 — Crear el certificado de servidor con SAN

Los navegadores y clientes modernos requieren Subject Alternative Names (SAN). El campo CN por sí solo ya no es suficiente.

\`\`\`bash
# Crear clave privada del servidor (2048 bits es suficiente para 2 años)
openssl genrsa -out server/server.key 2048

# Crear archivo de extensiones SAN
# Listar TODOS los nombres por los que se accederá al servidor
cat > server/server-san.ext <<EOF
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
C = ES
ST = Madrid
L = Madrid
O = Empresa SA
OU = Backend
CN = api.empresa.internal

[v3_req]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = api.empresa.internal
DNS.2 = api-v2.empresa.internal
IP.1 = 10.0.0.100
EOF

# Crear CSR del servidor con las extensiones SAN
openssl req -new \
    -key server/server.key \
    -out server/server.csr \
    -config server/server-san.ext
\`\`\`

\`\`\`bash
# Firmar el certificado del servidor con la Intermediate CA (2 años)
openssl x509 -req \
    -in server/server.csr \
    -CA intermediate-ca/intermediate-ca.crt \
    -CAkey intermediate-ca/intermediate-ca.key \
    -CAcreateserial \
    -out server/server.crt \
    -days 730 \
    -sha256 \
    -extensions v3_req \
    -extfile server/server-san.ext

# Verificar los SANs en el certificado
openssl x509 -in server/server.crt -text -noout | grep -A 4 "Subject Alternative Name"
\`\`\`

**Salida esperada:**
\`\`\`
            X509v3 Subject Alternative Name:
                DNS:api.empresa.internal, DNS:api-v2.empresa.internal,
                IP Address:10.0.0.100
\`\`\`

### 📖 Paso 4 — Construir la cadena de certificados

nginx necesita servir el certificado del servidor junto con la Intermediate CA. Esto permite a los clientes verificar la cadena completa.

\`\`\`bash
# Construir fullchain: servidor primero, luego Intermediate CA
# El orden es crítico: primero el leaf, luego las CAs intermedias
cat server/server.crt intermediate-ca/intermediate-ca.crt > server/fullchain.crt

# Verificar el número de certificados en la cadena
grep -c "BEGIN CERTIFICATE" server/fullchain.crt
# 2

# Verificar la cadena completa hasta la Root CA
openssl verify -CAfile root-ca/root-ca.crt \
    -untrusted intermediate-ca/intermediate-ca.crt \
    server/server.crt
# server/server.crt: OK
\`\`\`

### 📖 Paso 5 — Configurar nginx con TLS y cadena completa

\`\`\`bash
sudo nano /etc/nginx/sites-available/api.empresa.internal
\`\`\`

Configuración de nginx:
\`\`\`nginx
server {
    listen 443 ssl http2;
    server_name api.empresa.internal;

    # Certificado del servidor + Intermediate CA
    ssl_certificate     /root/pki/server/fullchain.crt;
    ssl_certificate_key /root/pki/server/server.key;

    # Para mTLS: verificar certificado del cliente
    ssl_client_certificate /root/pki/root-ca/root-ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    # Protocolos y cifrados modernos
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (solo activar cuando todo funcione)
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        # Pasar información del cliente a la aplicación
        proxy_set_header X-SSL-Client-CN \$ssl_client_s_dn_cn;
        proxy_set_header X-SSL-Client-Verify \$ssl_client_verify;
        proxy_pass http://localhost:8080;
    }
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name api.empresa.internal;
    return 301 https://\$host\$request_uri;
}
\`\`\`

\`\`\`bash
# Verificar sintaxis de nginx
sudo nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

sudo systemctl reload nginx
\`\`\`

### 📖 Paso 6 — Crear certificado de cliente para mTLS

\`\`\`bash
# Crear clave y CSR del cliente
openssl genrsa -out client/client.key 2048

openssl req -new \
    -key client/client.key \
    -out client/client.csr \
    -subj "/C=ES/O=Empresa SA/OU=Backend Team/CN=deploy-service"

# Firmar con la Intermediate CA (1 año para certificados de cliente)
openssl x509 -req \
    -in client/client.csr \
    -CA intermediate-ca/intermediate-ca.crt \
    -CAkey intermediate-ca/intermediate-ca.key \
    -CAcreateserial \
    -out client/client.crt \
    -days 365 \
    -sha256

# Verificar el certificado de cliente
openssl x509 -in client/client.crt -subject -issuer -noout
\`\`\`

**Salida esperada:**
\`\`\`
subject=C=ES, O=Empresa SA, OU=Backend Team, CN=deploy-service
issuer=C=ES, O=Empresa SA, CN=Empresa Intermediate CA
\`\`\`

### 📖 Paso 7 — Probar mTLS con curl

\`\`\`bash
# Sin certificado de cliente (debe fallar con mTLS activo)
curl https://api.empresa.internal/health \
    --cacert /root/pki/root-ca/root-ca.crt
# curl: (56) OpenSSL SSL_read: error:14094412:SSL routines: SSL3_READ_BYTES:sslv3 alert bad certificate
\`\`\`

\`\`\`bash
# Con certificado de cliente (debe funcionar)
curl https://api.empresa.internal/health \
    --cacert /root/pki/root-ca/root-ca.crt \
    --cert /root/pki/client/client.crt \
    --key /root/pki/client/client.key \
    -v 2>&1 | grep -E "SSL|subject|issuer|HTTP"
\`\`\`

**Salida esperada:**
\`\`\`
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate:
*  subject: C=ES; O=Empresa SA; CN=api.empresa.internal
*  start date: Mar 15 12:00:00 2024 GMT
*  expire date: Mar 15 12:00:00 2026 GMT
*  issuer: C=ES; O=Empresa SA; CN=Empresa Intermediate CA
*  SSL certificate verify ok.
< HTTP/2 200
\`\`\`

### 📖 Paso 8 — Verificación y diagnóstico

\`\`\`bash
# Verificar certificado de servidor contra la cadena completa
openssl verify \
    -CAfile /root/pki/root-ca/root-ca.crt \
    -untrusted /root/pki/intermediate-ca/intermediate-ca.crt \
    /root/pki/server/server.crt
# /root/pki/server/server.crt: OK

# Inspeccionar el servidor TLS en vivo (muestra toda la cadena)
openssl s_client -connect api.empresa.internal:443 \
    -CAfile /root/pki/root-ca/root-ca.crt \
    -servername api.empresa.internal
\`\`\`

**Fragmento de salida de s_client:**
\`\`\`
CONNECTED(00000003)
depth=2 CN=Empresa Root CA
verify return:1
depth=1 CN=Empresa Intermediate CA
verify return:1
depth=0 CN=api.empresa.internal
verify return:1
---
Certificate chain
 0 s:CN=api.empresa.internal
   i:CN=Empresa Intermediate CA
 1 s:CN=Empresa Intermediate CA
   i:CN=Empresa Root CA
---
Verify return code: 0 (ok)
\`\`\`

### 📖 Paso 9 — Distribuir la Root CA al sistema

Para que \`curl\`, Python, y otros clientes del sistema confíen en la CA corporativa sin flags adicionales:

\`\`\`bash
# Copiar la Root CA al almacén de CAs del sistema
sudo cp /root/pki/root-ca/root-ca.crt /usr/local/share/ca-certificates/empresa-root-ca.crt

# Actualizar el almacén de CAs (Debian/Ubuntu)
sudo update-ca-certificates
# Updating certificates in /etc/ssl/certs...
# 1 added, 0 removed; done.
# Running hooks in /etc/ca-certificates/update.d...
# done.

# En RHEL/Fedora/CentOS:
# sudo cp /root/pki/root-ca/root-ca.crt /etc/pki/ca-trust/source/anchors/
# sudo update-ca-trust
\`\`\`

\`\`\`bash
# Verificar que ahora funciona sin --cacert
curl https://api.empresa.internal/health
# {"status": "ok"}

# En Python también funciona automáticamente:
python3 -c "import urllib.request; print(urllib.request.urlopen('https://api.empresa.internal/health').read())"
# b'{"status": "ok"}'
\`\`\`

### 📋 Lo que debes recordar
* La jerarquía Root CA → Intermediate CA → Leaf cert aísla el compromiso: si un cert leaf se filtra, solo se revoca ese cert; si la Intermediate CA se compromete, se revoca sin tocar la Root CA
* Los SANs son obligatorios en certificados modernos; los navegadores ignoran el CN para la verificación del hostname
* \`openssl verify -CAfile root.crt -untrusted intermediate.crt server.crt\` valida la cadena completa offline
* El orden en fullchain.crt importa: primero el leaf, luego las CAs intermedias (de más específica a más general)
* Con mTLS, tanto el servidor como el cliente presentan certificados; nginx puede pasar el CN del cliente a la aplicación backend via headers
* \`update-ca-certificates\` instala la CA en el almacén del sistema para que todos los programas que usen OpenSSL confíen en ella automáticamente

### 🧪 Autoevaluación
1. ¿Por qué se necesita una Intermediate CA? ¿No sería más simple firmar todos los certificados directamente con la Root CA?
2. ¿Qué diferencia hay entre \`ssl_certificate\` (con fullchain) y servir solo el certificado del servidor en nginx?
3. ¿Qué significa la restricción \`pathlen:0\` en la Intermediate CA?

---

1. La Intermediate CA protege la Root CA: si un certificado de servidor se compromete o la Intermediate CA se ve afectada, se puede revocar y reemplazar la Intermediate CA sin invalidar la Root CA, cuya clave privada puede mantenerse completamente offline. Firmar con la Root CA directamente expondría su clave privada al uso diario
2. Servir solo el certificado del servidor obliga al cliente a tener la Intermediate CA ya en caché o a buscarla via AIA (Authority Information Access). El fullchain incluye la Intermediate CA en el handshake TLS, garantizando que todos los clientes puedan verificar la cadena sin depender de que tengan la Intermediate CA preinstalada
3. \`pathlen:0\` significa que la Intermediate CA puede firmar certificados de entidad final (servidores, clientes) pero no puede crear CAs subordinadas adicionales. Si fuera \`pathlen:1\`, podría crear una CA con pathlen:0, y así sucesivamente
`

export default content
