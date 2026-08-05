const content = `
## Módulo 3 — Let's Encrypt y certbot: certificados gratuitos automáticos

### 🎯 Objetivos de aprendizaje
* Comprender el protocolo ACME y cómo automatiza la emisión de certificados
* Distinguir los desafíos HTTP-01 y DNS-01 y cuándo usar cada uno
* Obtener certificados con certbot en modo standalone, webroot y DNS
* Conocer la estructura de archivos en \`/etc/letsencrypt/live/\`
* Listar certificados activos y hacer un dry-run de renovación

---

### ❓ El problema real

Antes de Let's Encrypt, obtener un certificado TLS costaba entre 50 y 300 USD al año, requería
validación manual y tomaba días. Hoy, con certbot y ACME, un certificado válido se obtiene en
segundos — gratis, automático y renovable. El 80% de los sitios HTTPS del mundo usan esta
infraestructura. Entender cómo funciona te permite desplegarlo correctamente y diagnosticar
cuando falla.

---

### 📖 El protocolo ACME

ACME (Automatic Certificate Management Environment, RFC 8555) es el protocolo que Let's
Encrypt usa para:

1. Verificar que controlas el dominio para el que pides el certificado.
2. Emitir el certificado automáticamente.
3. Revocar o renovar sin intervención humana.

El cliente ACME (certbot, acme.sh, etc.) se comunica con el servidor ACME de Let's Encrypt
(\`https://acme-v02.api.letsencrypt.org\`) mediante solicitudes HTTPS firmadas con una clave de
cuenta que certbot genera en el primer uso.

---

### 📖 Desafío HTTP-01

Let's Encrypt hace una petición HTTP al dominio en la ruta:
\`http://tudominio.com/.well-known/acme-challenge/<token>\`

Si el servidor responde con el valor correcto, se demuestra que controlas el dominio.

**Requisitos:**
- El dominio debe resolver a una IP pública.
- El puerto 80 debe ser accesible desde internet.
- No funciona para wildcards (\`*.dominio.com\`).

**Caso de uso típico:** cualquier servidor web público con DNS correcto.

---

### 📖 Desafío DNS-01

Se crea un registro TXT en el DNS del dominio:
\`_acme-challenge.tudominio.com  TXT  "valor-del-challenge"\`

Let's Encrypt consulta el DNS y verifica el valor.

**Ventajas:**
- Funciona para wildcards (\`*.dominio.com\`).
- No requiere puerto 80 abierto (servidores internos, firewalls estrictos).
- Puede validar dominios internos si el DNS es público.

**Requisito:** acceso programático a la API del proveedor DNS para crear/borrar el registro TXT.
Certbot tiene plugins para Cloudflare, Route53, DigitalOcean, Hetzner, etc.

---

### 📖 Instalación de certbot

En Debian/Ubuntu:
\`\`\`bash
sudo apt install certbot
# Con plugin para nginx:
sudo apt install python3-certbot-nginx
# Con plugin para apache:
sudo apt install python3-certbot-apache
\`\`\`

En RHEL/CentOS (con EPEL):
\`\`\`bash
sudo dnf install certbot python3-certbot-nginx
\`\`\`

---

### 📖 Modo standalone: certbot certonly --standalone

Certbot levanta su propio servidor HTTP temporal en el puerto 80. Útil cuando no tienes nginx
o apache corriendo, o durante la configuración inicial.

\`\`\`bash
sudo certbot certonly --standalone -d api.empresa.com -d www.empresa.com
\`\`\`

**Importante:** el servicio que ocupa el puerto 80 debe detenerse antes de ejecutar el comando.
\`\`\`bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d api.empresa.com
sudo systemctl start nginx
\`\`\`

Salida exitosa:
\`\`\`
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Requesting a certificate for api.empresa.com

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/api.empresa.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/api.empresa.com/privkey.pem
This certificate expires on 2025-10-01.
These files will be updated when the certificate renews.
\`\`\`

---

### 📖 Modo webroot: certbot certonly --webroot

Certbot escribe el token del desafío en el directorio raíz del servidor web existente.
El servidor web sirve el archivo normalmente. No interrumpe el servicio.

\`\`\`bash
sudo certbot certonly --webroot \\
  -w /var/www/html \\
  -d empresa.com \\
  -d www.empresa.com
\`\`\`

El servidor web debe servir \`/.well-known/acme-challenge/\` desde \`/var/www/html\`.
Para nginx, asegúrate de que no haya reescritura que bloquee esa ruta:

\`\`\`nginx
location /.well-known/acme-challenge/ {
    root /var/www/html;
}
\`\`\`

---

### 📖 Modo DNS con plugin de Cloudflare

Para wildcards o servidores sin puerto 80 público:

\`\`\`bash
sudo apt install python3-certbot-dns-cloudflare
\`\`\`

Crear el archivo de credenciales:
\`\`\`bash
sudo mkdir -p /etc/letsencrypt/cloudflare
sudo nano /etc/letsencrypt/cloudflare/credentials.ini
\`\`\`

Contenido:
\`\`\`
dns_cloudflare_api_token = tu_api_token_aqui
\`\`\`

\`\`\`bash
sudo chmod 600 /etc/letsencrypt/cloudflare/credentials.ini
\`\`\`

Obtener el certificado wildcard:
\`\`\`bash
sudo certbot certonly \\
  --dns-cloudflare \\
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare/credentials.ini \\
  -d empresa.com \\
  -d "*.empresa.com"
\`\`\`

---

### 📖 Estructura de /etc/letsencrypt/live/

Después de obtener un certificado, certbot crea symlinks en:

\`\`\`
/etc/letsencrypt/live/api.empresa.com/
├── cert.pem       -> ../../archive/api.empresa.com/cert1.pem
├── chain.pem      -> ../../archive/api.empresa.com/chain1.pem
├── fullchain.pem  -> ../../archive/api.empresa.com/fullchain1.pem
└── privkey.pem    -> ../../archive/api.empresa.com/privkey1.pem
\`\`\`

| Archivo | Contenido |
|---|---|
| **cert.pem** | Solo el certificado del servidor |
| **chain.pem** | Solo los certificados de la CA intermedia |
| **fullchain.pem** | cert.pem + chain.pem (lo que nginx/apache necesitan) |
| **privkey.pem** | Clave privada del servidor |

En la configuración de nginx:
\`\`\`nginx
ssl_certificate     /etc/letsencrypt/live/api.empresa.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.empresa.com/privkey.pem;
\`\`\`

Los archivos reales están en \`/etc/letsencrypt/archive/\`. Los symlinks en \`live/\` apuntan
siempre a la versión actual. Durante la renovación, certbot actualiza los archivos en
\`archive/\` e incrementa el sufijo numérico (cert2.pem, cert3.pem...).

---

### 📖 Listar certificados y verificar estado

\`\`\`bash
sudo certbot certificates
\`\`\`

Salida:
\`\`\`
Found the following certs:
  Certificate Name: api.empresa.com
    Serial Number: 3fa1b...
    Key Type: ECDSA
    Domains: api.empresa.com www.empresa.com
    Expiry Date: 2025-10-01 12:00:00+00:00 (VALID: 89 days)
    Certificate Path: /etc/letsencrypt/live/api.empresa.com/fullchain.pem
    Private Key Path: /etc/letsencrypt/live/api.empresa.com/privkey.pem
\`\`\`

---

### 📖 Dry-run de renovación

Simula el proceso de renovación sin modificar archivos ni hacer llamadas reales a la CA:

\`\`\`bash
sudo certbot renew --dry-run
\`\`\`

Salida exitosa:
\`\`\`
Simulating renewal of an existing certificate for api.empresa.com

Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/api.empresa.com/fullchain.pem (success)
\`\`\`

Ejecuta esto después de instalar certbot y antes de depender de la renovación automática. Si
el dry-run falla, el certificado no se renovará cuando expire.

---

### 📖 Límites de tasa de Let's Encrypt

Let's Encrypt aplica límites para prevenir abuso:
- **50 certificados por dominio registrado por semana** (ej. empresa.com)
- **5 duplicados por semana** (mismo conjunto de dominios)
- **5 fallos de validación por hostname por hora**

Para pruebas usa el entorno de staging (no genera certificados de confianza, pero no consume
cuota de producción):
\`\`\`bash
sudo certbot certonly --staging --standalone -d test.empresa.com
\`\`\`

---

### 📋 Lo que debes recordar
* ACME automatiza la validación de dominio y emisión de certificados vía HTTP-01 o DNS-01
* HTTP-01 requiere puerto 80 accesible; DNS-01 soporta wildcards y no necesita puerto 80
* \`--standalone\` levanta un servidor temporal; \`--webroot\` usa el servidor web existente
* \`/etc/letsencrypt/live/dominio/\` contiene symlinks a la versión actual del certificado
* nginx y apache deben apuntar a \`fullchain.pem\` (cert + cadena) y \`privkey.pem\`
* Ejecutar \`certbot renew --dry-run\` antes de depender de la renovación automática
* El entorno de staging de Let's Encrypt permite pruebas sin consumir cuota de producción

---

### 🧪 Autoevaluación

1. Tienes un servidor interno sin acceso al puerto 80 desde internet pero el DNS es público. Necesitas un wildcard \`*.internal.empresa.com\`. ¿Qué método de desafío debes usar y por qué?
2. Después de \`certbot certonly\`, nginx sigue sirviendo el certificado auto-firmado anterior. ¿Cuál es la causa más probable?
3. ¿Qué diferencia hay entre \`cert.pem\` y \`fullchain.pem\` en \`/etc/letsencrypt/live/\`? ¿Cuál debe configurarse en nginx?

---

1. DNS-01, porque HTTP-01 requiere puerto 80 accesible desde internet y no soporta wildcards. Con DNS-01 se crea un registro TXT en el DNS sin necesidad de exponer el servidor.
2. La configuración de nginx sigue apuntando a los archivos de certificado anteriores. Hay que actualizar \`ssl_certificate\` y \`ssl_certificate_key\` para que apunten a los archivos en \`/etc/letsencrypt/live/\` y recargar nginx.
3. \`cert.pem\` contiene solo el certificado del servidor. \`fullchain.pem\` contiene el certificado del servidor más los certificados de la CA intermedia. Nginx debe configurarse con \`fullchain.pem\` para que los clientes puedan verificar la cadena completa.
`

export default content
