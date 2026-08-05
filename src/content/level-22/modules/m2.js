const content = `
## Módulo 2 — openssl: generar, inspeccionar y verificar certificados

### 🎯 Objetivos de aprendizaje
* Generar claves privadas RSA y ECDSA con openssl
* Crear una solicitud de firma de certificado (CSR)
* Generar certificados auto-firmados directamente
* Inspeccionar el contenido completo de un certificado
* Verificar la cadena de confianza y la fecha de expiración
* Probar una conexión TLS con \`openssl s_client\`
* Exportar e importar certificados en formato PKCS#12

---

### ❓ El problema real

Necesitas configurar HTTPS en un servidor interno, inspeccionar por qué un certificado es
rechazado, o verificar qué dominios cubre un certificado antes de que expire. Todas estas
tareas se resuelven con \`openssl\`, la navaja suiza de PKI en Linux. Sin dominarlo, dependes
de interfaces gráficas o herramientas externas para trabajo que deberías poder hacer desde la
terminal.

---

### 📖 Generar una clave privada

**RSA 2048 bits** (compatible, más lento):
\`\`\`bash
openssl genrsa -out servidor.key 2048
\`\`\`

**RSA 4096 bits** (mayor seguridad, más lento aún):
\`\`\`bash
openssl genrsa -out servidor.key 4096
\`\`\`

**ECDSA P-256** (recomendado: rápido y seguro):
\`\`\`bash
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out servidor.key
\`\`\`

La clave privada resultante debe protegerse con permisos estrictos:
\`\`\`bash
chmod 600 servidor.key
\`\`\`

Para cifrar la clave privada con contraseña (útil en CAs):
\`\`\`bash
openssl genrsa -aes256 -out ca.key 4096
\`\`\`

---

### 📖 Crear una CSR (Certificate Signing Request)

La CSR contiene tu clave pública y los datos de identidad. Se envía a la CA para que la firme.

\`\`\`bash
openssl req -new -key servidor.key -out servidor.csr
\`\`\`

El comando es interactivo y solicita:
\`\`\`
Country Name (2 letter code) [AU]: MX
State or Province Name [Some-State]: Ciudad de Mexico
Locality Name []: CDMX
Organization Name []: Empresa SA de CV
Organizational Unit Name []: Infraestructura
Common Name []: api.empresa.com
Email Address []: ops@empresa.com
\`\`\`

Para automatizar (sin prompt interactivo):
\`\`\`bash
openssl req -new -key servidor.key -out servidor.csr \\
  -subj "/C=MX/ST=CDMX/O=Empresa/CN=api.empresa.com"
\`\`\`

Para incluir SANs en la CSR (necesario en certificados modernos):
\`\`\`bash
openssl req -new -key servidor.key -out servidor.csr \\
  -subj "/CN=api.empresa.com" \\
  -addext "subjectAltName=DNS:api.empresa.com,DNS:www.empresa.com,IP:10.0.0.5"
\`\`\`

Verificar el contenido de la CSR:
\`\`\`bash
openssl req -text -noout -in servidor.csr
\`\`\`

---

### 📖 Generar un certificado auto-firmado

Útil para desarrollo y pruebas internas. Genera clave + certificado en un solo comando:

\`\`\`bash
openssl req -x509 -newkey rsa:2048 -keyout self.key -out self.crt \\
  -days 365 -nodes \\
  -subj "/CN=localhost" \\
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
\`\`\`

\`-nodes\` significa "no DES" — no cifra la clave privada con contraseña. Conveniente para
servidores que arrancan automáticamente.

A partir de una clave y CSR existentes:
\`\`\`bash
openssl x509 -req -in servidor.csr -signkey servidor.key \\
  -out servidor.crt -days 365
\`\`\`

---

### 📖 Inspeccionar un certificado

Ver el contenido completo en texto legible:
\`\`\`bash
openssl x509 -text -noout -in servidor.crt
\`\`\`

Salida (extracto relevante):
\`\`\`
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            6a:3f:9b:12:...
        Signature Algorithm: ecdsa-with-SHA256
        Issuer: CN=Let's Encrypt R11, O=Let's Encrypt, C=US
        Validity
            Not Before: Jul  1 00:00:00 2025 GMT
            Not After : Sep 29 23:59:59 2025 GMT
        Subject: CN=api.empresa.com
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
        X509v3 extensions:
            X509v3 Subject Alternative Name:
                DNS:api.empresa.com, DNS:www.empresa.com
            X509v3 Key Usage:
                Digital Signature
            X509v3 Extended Key Usage:
                TLS Web Server Authentication
            X509v3 Authority Key Identifier:
                ...
\`\`\`

Ver solo campos específicos:
\`\`\`bash
# Fecha de expiración
openssl x509 -enddate -noout -in servidor.crt
# notAfter=Sep 29 23:59:59 2025 GMT

# Subject
openssl x509 -subject -noout -in servidor.crt

# Issuer
openssl x509 -issuer -noout -in servidor.crt

# SANs
openssl x509 -ext subjectAltName -noout -in servidor.crt

# Huella digital SHA-256
openssl x509 -fingerprint -sha256 -noout -in servidor.crt
\`\`\`

---

### 📖 Verificar la cadena de confianza

\`\`\`bash
openssl verify -CAfile ca-bundle.crt servidor.crt
\`\`\`

Salida exitosa:
\`\`\`
servidor.crt: OK
\`\`\`

Si la CA es el sistema:
\`\`\`bash
openssl verify servidor.crt
\`\`\`

Verificar con cadena completa (cuando el servidor envía el fullchain):
\`\`\`bash
openssl verify -CAfile ca-raiz.crt -untrusted intermedia.crt servidor.crt
\`\`\`

Error común — cadena incompleta:
\`\`\`
servidor.crt: C = US, O = Let's Encrypt, CN = R11
error 2 at 1 depth lookup: unable to get issuer certificate
\`\`\`
Significa que falta el certificado de la CA intermedia en la verificación.

---

### 📖 Probar una conexión TLS con s_client

\`openssl s_client\` simula un cliente TLS y muestra toda la información del handshake.

\`\`\`bash
openssl s_client -connect api.empresa.com:443 -servername api.empresa.com
\`\`\`

Salida relevante:
\`\`\`
CONNECTED(00000003)
depth=2 C=US, O=Internet Security Research Group, CN=ISRG Root X1
verify return:1
depth=1 C=US, O=Let's Encrypt, CN=R11
verify return:1
depth=0 CN=api.empresa.com
verify return:1
---
Certificate chain
 0 s:CN=api.empresa.com
   i:C=US, O=Let's Encrypt, CN=R11
 1 s:C=US, O=Let's Encrypt, CN=R11
   i:C=US, O=Internet Security Research Group, CN=ISRG Root X1
---
Server certificate
-----BEGIN CERTIFICATE-----
MIIEkjCC...
-----END CERTIFICATE-----
---
subject=CN=api.empresa.com
issuer=C=US, O=Let's Encrypt, CN=R11
---
SSL handshake has read 4085 bytes and written 405 bytes
Verify return code: 0 (ok)
---
\`\`\`

Un \`Verify return code: 0 (ok)\` confirma que la cadena es válida.

Opciones útiles adicionales:
\`\`\`bash
# Ver solo la fecha de expiración desde un host remoto
echo | openssl s_client -connect api.empresa.com:443 -servername api.empresa.com 2>/dev/null \\
  | openssl x509 -noout -enddate

# Mostrar los protocolos TLS soportados
openssl s_client -connect api.empresa.com:443 -tls1_2 2>&1 | grep "Protocol"

# Guardar el certificado del servidor a disco
echo | openssl s_client -connect api.empresa.com:443 -servername api.empresa.com 2>/dev/null \\
  | openssl x509 -out servidor-remoto.crt
\`\`\`

---

### 📖 Exportar e importar PKCS#12

PKCS#12 (.p12 / .pfx) empaqueta el certificado, la clave privada y la cadena en un solo archivo
binario protegido con contraseña. Útil para importar en Windows, Java keystores, o navegadores.

Exportar a PKCS#12:
\`\`\`bash
openssl pkcs12 -export \\
  -in servidor.crt \\
  -inkey servidor.key \\
  -certfile cadena.crt \\
  -out servidor.p12 \\
  -name "api.empresa.com"
\`\`\`

Importar desde PKCS#12 (extraer clave y certificado):
\`\`\`bash
# Extraer certificado
openssl pkcs12 -in servidor.p12 -clcerts -nokeys -out servidor.crt

# Extraer clave privada (sin cifrar)
openssl pkcs12 -in servidor.p12 -nocerts -nodes -out servidor.key
\`\`\`

---

### 📖 Comprobar si una clave y un certificado coinciden

Un error frecuente es usar una clave privada que no corresponde al certificado. Para verificar:
\`\`\`bash
# Los módulos deben ser idénticos
openssl x509 -modulus -noout -in servidor.crt | openssl md5
openssl rsa  -modulus -noout -in servidor.key | openssl md5
\`\`\`

Si los hash MD5 coinciden, el par clave/certificado es correcto.

---

### 📋 Lo que debes recordar
* \`openssl genrsa\` o \`openssl genpkey\` generan claves privadas; preferir ECDSA P-256 para nuevas implementaciones
* La CSR contiene la clave pública + datos de identidad; se envía a la CA para firmar
* \`openssl x509 -text -noout\` muestra todo el contenido de un certificado en texto legible
* \`openssl x509 -enddate -noout\` es la forma rápida de ver cuándo expira un certificado
* \`openssl s_client -connect host:443\` prueba el handshake TLS y muestra la cadena completa
* Verificar que la clave y el certificado coinciden comparando sus módulos MD5
* PKCS#12 agrupa certificado + clave privada + cadena en un solo archivo protegido con contraseña

---

### 🧪 Autoevaluación

1. Generas una CSR con \`openssl req -new\` pero el navegador rechaza el certificado firmado con "hostname mismatch". ¿Qué campo debiste incluir en la CSR?
2. \`openssl verify servidor.crt\` devuelve \`error 2: unable to get issuer certificate\`. ¿Qué significa y cómo lo corriges?
3. Quieres comprobar en un script de monitoreo si un certificado remoto expira en menos de 30 días. ¿Qué comando usarías?

---

1. El campo SAN (\`subjectAltName\`). Debes añadir \`-addext "subjectAltName=DNS:nombre.com"\` al comando \`openssl req\`.
2. Que el certificado de la CA intermedia no está disponible. Se corrige con \`openssl verify -CAfile ca-raiz.crt -untrusted intermedia.crt servidor.crt\` o asegurando que el bundle incluya la cadena completa.
3. \`echo | openssl s_client -connect host:443 -servername host 2>/dev/null | openssl x509 -noout -checkend 2592000\` (2592000 = 30 días en segundos). Devuelve código de salida 0 si aún es válido, 1 si expira antes.
`

export default content
