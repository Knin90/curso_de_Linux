const content = `
## Módulo 5 — Mutual TLS (mTLS): autenticación de cliente

### 🎯 Objetivos de aprendizaje
* Entender la diferencia entre TLS estándar y mTLS
* Generar certificados de cliente firmados por una CA
* Configurar nginx para requerir autenticación mTLS
* Probar mTLS con curl y entender las variables de nginx disponibles
* Conocer los casos de uso reales: APIs internas, zero-trust, microservicios

---

### ❓ El problema real

En TLS estándar, solo el servidor se autentica ante el cliente (presentando su certificado).
El cliente no necesita identificarse criptográficamente — basta con tener la contraseña o el
token correcto. En entornos de alta seguridad — APIs entre microservicios, acceso a
infraestructura crítica, arquitecturas zero-trust — necesitas que el cliente también pruebe
su identidad con un certificado. Eso es mTLS.

---

### 📖 ¿Cómo funciona el handshake mTLS?

En TLS estándar el handshake tiene estos pasos relevantes:
1. El servidor envía su certificado.
2. El cliente verifica el certificado del servidor.
3. Se establece la sesión cifrada.

En mTLS se añaden dos pasos:
1. El servidor envía su certificado.
2. El servidor solicita al cliente que presente su certificado (\`CertificateRequest\`).
3. El cliente envía su certificado.
4. El servidor verifica el certificado del cliente contra su CA configurada.
5. Se establece la sesión cifrada.

Si el cliente no tiene certificado, o su certificado no está firmado por la CA correcta,
el servidor rechaza la conexión en la capa TLS — antes de procesar ninguna petición HTTP.

---

### 📖 Generar un certificado de cliente

Necesitas una CA (puede ser la misma que firmó el certificado del servidor, o una CA interna
dedicada a clientes). Para este ejemplo se asume que tienes \`ca.crt\` y \`ca.key\`.

**Paso 1: Generar clave privada del cliente**
\`\`\`bash
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out cliente.key
\`\`\`

**Paso 2: Crear la CSR del cliente**
\`\`\`bash
openssl req -new -key cliente.key -out cliente.csr \\
  -subj "/C=MX/O=Empresa/CN=servicio-backend"
\`\`\`

**Paso 3: Firmar la CSR con la CA — especificando \`clientAuth\` en el Extended Key Usage**
\`\`\`bash
openssl x509 -req -in cliente.csr -CA ca.crt -CAkey ca.key \\
  -CAcreateserial -out cliente.crt -days 365 \\
  -extfile <(echo "extendedKeyUsage=clientAuth")
\`\`\`

El campo \`extendedKeyUsage=clientAuth\` es obligatorio. Sin él, algunos servidores rechazarán
el certificado para autenticación de cliente aunque sea firmado por la CA correcta.

Verificar:
\`\`\`bash
openssl x509 -text -noout -in cliente.crt | grep -A1 "Extended Key"
# Extended Key Usage:
#     TLS Web Client Authentication
\`\`\`

---

### 📖 Configurar nginx para mTLS

Configuración nginx con mTLS obligatorio:

\`\`\`nginx
server {
    listen 443 ssl;
    server_name api.empresa.com;

    ssl_certificate     /etc/ssl/certs/servidor.crt;
    ssl_certificate_key /etc/ssl/private/servidor.key;

    # CA que firmó los certificados de cliente
    ssl_client_certificate /etc/ssl/certs/ca.crt;

    # on = requerir cert de cliente (rechaza sin cert)
    # off = no pedir cert de cliente (TLS normal)
    # optional = aceptar con o sin cert, decidir en la app
    # optional_no_ca = acepta cualquier cert sin verificar CA
    ssl_verify_client on;

    # Profundidad de la cadena del certificado de cliente (1 = CA directa)
    ssl_verify_depth 2;

    location /api/ {
        # Variables disponibles en la request
        # \$ssl_client_verify: SUCCESS, FAILED, NONE
        # \$ssl_client_s_dn: Subject DN del certificado (ej: CN=servicio-backend,O=Empresa)
        # \$ssl_client_i_dn: Issuer DN
        # \$ssl_client_serial: Número de serie del cert del cliente
        # \$ssl_client_fingerprint: Huella SHA1 del cert del cliente

        if (\$ssl_client_verify != SUCCESS) {
            return 403;
        }

        # Pasar el DN del cliente al backend como header
        proxy_set_header X-SSL-Client-DN \$ssl_client_s_dn;
        proxy_set_header X-SSL-Client-Verify \$ssl_client_verify;

        proxy_pass http://backend:8080;
    }
}
\`\`\`

Recargar nginx:
\`\`\`bash
sudo nginx -t && sudo systemctl reload nginx
\`\`\`

---

### 📖 mTLS opcional: decidir en la aplicación

Con \`ssl_verify_client optional\`, nginx acepta tanto clientes con certificado como sin él.
La aplicación decide qué hacer según \`\$ssl_client_verify\`:

\`\`\`nginx
server {
    # ...
    ssl_client_certificate /etc/ssl/certs/ca.crt;
    ssl_verify_client optional;

    location /api/public {
        # acceso sin cert de cliente
        proxy_pass http://backend:8080;
    }

    location /api/admin {
        # requiere cert de cliente válido
        if (\$ssl_client_verify != SUCCESS) {
            return 401;
        }
        proxy_set_header X-Client-CN \$ssl_client_s_dn;
        proxy_pass http://backend:8080;
    }
}
\`\`\`

---

### 📖 Probar mTLS con curl

Sin certificado de cliente (debe fallar con mTLS obligatorio):
\`\`\`bash
curl -v https://api.empresa.com/api/datos
\`\`\`
\`\`\`
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate: api.empresa.com
curl: (56) OpenSSL SSL_read: error:14094412:SSL routines:ssl3_read_bytes:
       sslv3 alert handshake failure
\`\`\`

Con certificado de cliente:
\`\`\`bash
curl -v \\
  --cert cliente.crt \\
  --key cliente.key \\
  --cacert ca.crt \\
  https://api.empresa.com/api/datos
\`\`\`
\`\`\`
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate verified
* SSL certificate verify ok
> GET /api/datos HTTP/2
< HTTP/2 200
\`\`\`

Si la CA del servidor es pública (Let's Encrypt), omite \`--cacert\`:
\`\`\`bash
curl --cert cliente.crt --key cliente.key https://api.empresa.com/api/datos
\`\`\`

---

### 📖 Ejemplo en Python (requests)

\`\`\`python
import requests

response = requests.get(
    "https://api.empresa.com/api/datos",
    cert=("cliente.crt", "cliente.key"),  # Certificado y clave del cliente
    verify="ca.crt"                        # CA del servidor (omitir si es pública)
)
print(response.status_code)
\`\`\`

---

### 📖 Casos de uso reales de mTLS

**Autenticación de microservicios** — En una arquitectura de microservicios, cada servicio
tiene su propio certificado de cliente. El API gateway o el servicio receptor verifica que
la llamada proviene de un servicio conocido, no de un actor externo que comprometió la red
interna.

**Zero-trust networking** — En lugar de confiar en que "si estás en la VPN eres legítimo",
cada conexión requiere un certificado de cliente válido. Incluso si un atacante obtiene acceso
a la red interna, no puede comunicarse con servicios sin el certificado.

**Acceso a infraestructura crítica** — Bases de datos, servidores de configuración (Vault,
etcd), o APIs de administración que no deben ser accesibles con solo usuario/contraseña.

**IoT y dispositivos embebidos** — Cada dispositivo tiene un certificado único firmado durante
la fabricación. El servidor puede revocar certificados de dispositivos comprometidos.

---

### 📖 Revocación de certificados de cliente

Si un cliente es comprometido, su certificado debe revocarse. Con CA propia:

\`\`\`bash
# Revocar en la CA
openssl ca -config openssl.cnf -revoke /etc/ssl/CA/newcerts/01.pem

# Generar CRL actualizada
openssl ca -config openssl.cnf -gencrl -out /etc/ssl/CA/crl.pem
\`\`\`

Configurar nginx para verificar la CRL:
\`\`\`nginx
ssl_crl /etc/ssl/CA/crl.pem;
\`\`\`

La CRL debe mantenerse actualizada — tiene fecha de expiración. Una alternativa más moderna
es OCSP (Online Certificate Status Protocol) para verificación en tiempo real.

---

### 📋 Lo que debes recordar
* mTLS autentica tanto al servidor como al cliente mediante certificados X.509
* El certificado de cliente debe tener \`extendedKeyUsage=clientAuth\`
* nginx: \`ssl_client_certificate\` define la CA, \`ssl_verify_client on\` lo hace obligatorio
* \`\$ssl_client_verify\` contiene SUCCESS o FAILED; \`\$ssl_client_s_dn\` el Subject del cert del cliente
* Con curl se especifica \`--cert\` y \`--key\` para presentar el certificado de cliente
* \`ssl_verify_client optional\` permite decisiones a nivel de location en nginx
* mTLS es la base de arquitecturas zero-trust y autenticación de microservicios

---

### 🧪 Autoevaluación

1. Configuras mTLS en nginx con \`ssl_verify_client on\` y la CA correcta, pero curl con \`--cert\` sigue recibiendo un error de handshake. ¿Qué campo del certificado de cliente debes verificar primero?
2. Tienes una API que debe ser accesible para usuarios normales (sin cert) y para microservicios (con cert). ¿Qué directiva de nginx usas y cómo distingues ambos casos en la configuración?
3. Un microservicio tiene su certificado de cliente comprometido. ¿Cuál es el proceso para invalidar inmediatamente ese acceso sin revocar todos los demás certificados?

---

1. El campo \`Extended Key Usage\`. Debe contener \`TLS Web Client Authentication\` (clientAuth). Sin este campo, nginx rechaza el certificado aunque esté firmado por la CA correcta.
2. Se usa \`ssl_verify_client optional\`. En el bloque \`location\` que requiere mTLS se verifica \`if (\$ssl_client_verify != SUCCESS) { return 401; }\`. En locations públicas no se añade esa verificación.
3. Revocar el certificado en la CA con \`openssl ca -revoke\`, generar una CRL actualizada con \`openssl ca -gencrl\`, y asegurarse de que nginx la referencia con \`ssl_crl\` y está al día. Si no hay CRL configurada, nginx no sabrá que el certificado fue revocado.
`

export default content
