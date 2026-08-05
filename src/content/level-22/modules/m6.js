const content = `
## Módulo 6 — Diagnóstico de problemas SSL/TLS

### 🎯 Objetivos de aprendizaje
* Interpretar la salida completa de \`openssl s_client\`
* Identificar errores comunes de certificado y sus causas exactas
* Usar testssl.sh para auditar la configuración TLS de un servidor
* Leer errores SSL en los logs de nginx
* Diagnosticar problemas de cadena incompleta, expiración y hostname mismatch

---

### ❓ El problema real

Un cliente reporta "conexión no segura" al acceder a tu aplicación. O el deploy de un nuevo
certificado rompió algo. O curl desde un script de monitoreo falla pero el navegador funciona.
Diagnosticar problemas TLS requiere saber exactamente qué está fallando — en el certificado,
en la cadena, en la configuración del servidor, o en el cliente. Las herramientas existen;
el problema es saber leer lo que dicen.

---

### 📖 Interpretar openssl s_client en profundidad

El comando completo con todas las opciones de diagnóstico:

\`\`\`bash
openssl s_client -connect api.empresa.com:443 \\
  -servername api.empresa.com \\
  -showcerts \\
  2>&1 | less
\`\`\`

**Secciones clave de la salida:**

**1. Cadena de certificados recibida:**
\`\`\`
Certificate chain
 0 s:CN=api.empresa.com
   i:C=US, O=Let's Encrypt, CN=R11
 1 s:C=US, O=Let's Encrypt, CN=R11
   i:C=US, O=ISRG, CN=ISRG Root X1
\`\`\`
- \`s:\` = Subject (a quién pertenece)
- \`i:\` = Issuer (quién lo firmó)
- Índice 0 = certificado del servidor; índices 1+ = intermedias

**Cadena incompleta (problema frecuente):**
\`\`\`
Certificate chain
 0 s:CN=api.empresa.com
   i:C=US, O=Let's Encrypt, CN=R11
\`\`\`
Solo aparece el certificado hoja. La CA intermedia no está siendo enviada. Los navegadores
a menudo la descargan automáticamente (AIA), pero curl y muchos clientes la rechazan.

**2. Resultado de verificación:**
\`\`\`
Verify return code: 0 (ok)
\`\`\`
Cualquier código distinto de 0 indica un problema:
\`\`\`
Verify return code: 10 (certificate has expired)
Verify return code: 18 (self signed certificate)
Verify return code: 19 (self signed certificate in certificate chain)
Verify return code: 20 (unable to get local issuer certificate)
Verify return code: 21 (unable to verify the first certificate)
Verify return code: 62 (hostname mismatch)
\`\`\`

**3. Protocolo y cipher suite negociados:**
\`\`\`
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
\`\`\`
Confirma que se está usando TLS 1.3 (o 1.2) y no versiones antiguas como TLS 1.0/1.1 o SSLv3.

---

### 📖 Errores comunes y cómo diagnosticarlos

**Error 1: Certificado expirado**

Síntoma en el navegador: \`ERR_CERT_DATE_INVALID\`
Diagnóstico:
\`\`\`bash
echo | openssl s_client -connect api.empresa.com:443 2>/dev/null \\
  | openssl x509 -noout -enddate
# notAfter=Aug 01 12:00:00 2025 GMT

openssl x509 -noout -checkend 0 -in cert.pem
# Certificate will expire
\`\`\`
Solución: renovar el certificado con certbot o la CA correspondiente.

---

**Error 2: Hostname mismatch (nombre no coincide)**

Síntoma: \`ERR_CERT_COMMON_NAME_INVALID\` o \`SSL_ERROR_BAD_CERT_DOMAIN\`
Diagnóstico:
\`\`\`bash
openssl x509 -text -noout -in cert.pem | grep -A1 "Subject Alternative"
# DNS:www.empresa.com, DNS:empresa.com
# (api.empresa.com no está en el SAN)
\`\`\`
Solución: emitir un nuevo certificado que incluya el hostname correcto en el SAN.

---

**Error 3: Cadena incompleta**

Síntoma: funciona en Chrome pero falla en curl, wget, o aplicaciones Java. Chrome descarga
la intermedia via AIA; curl no.

Diagnóstico:
\`\`\`bash
openssl s_client -connect api.empresa.com:443 -showcerts 2>/dev/null \\
  | grep -c "BEGIN CERTIFICATE"
# 1 = solo el cert hoja (cadena incompleta)
# 2 o 3 = cadena completa
\`\`\`

Verificar localmente:
\`\`\`bash
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt cert.pem
# cert.pem: C = US, O = Let's Encrypt, CN = R11
# error 2 at 1 depth lookup: unable to get issuer certificate
\`\`\`

Solución en nginx: asegurarse de usar \`fullchain.pem\` (cert + cadena), no solo \`cert.pem\`:
\`\`\`nginx
ssl_certificate /etc/letsencrypt/live/api.empresa.com/fullchain.pem;
# NO usar:
# ssl_certificate /etc/letsencrypt/live/api.empresa.com/cert.pem;
\`\`\`

---

**Error 4: Certificado auto-firmado en producción**

Síntoma: \`ERR_CERT_AUTHORITY_INVALID\`
Diagnóstico:
\`\`\`bash
openssl x509 -text -noout -in cert.pem | grep -A1 "Issuer"
# Issuer: CN=api.empresa.com  <-- mismo que Subject = auto-firmado
\`\`\`
o:
\`\`\`bash
openssl s_client -connect api.empresa.com:443 2>&1 | grep "Verify return"
# Verify return code: 18 (self signed certificate)
\`\`\`
Solución: reemplazar con certificado de CA reconocida (Let's Encrypt) o agregar la CA
interna al almacén de confianza de los clientes.

---

**Error 5: Ciphers débiles o protocolo obsoleto**

Diagnóstico con s_client:
\`\`\`bash
# Comprobar si el servidor acepta TLS 1.0 (obsoleto)
openssl s_client -connect api.empresa.com:443 -tls1 2>&1 | grep "Cipher\|Protocol\|handshake"
# handshake failure = bien configurado (rechaza TLS 1.0)
\`\`\`

---

### 📖 testssl.sh: auditoría TLS completa

testssl.sh es la herramienta más completa para auditar la configuración TLS de un servidor.
Comprueba protocolos, cipher suites, vulnerabilidades conocidas (POODLE, BEAST, HEARTBLEED,
ROBOT, etc.) y calidad del certificado.

Instalación:
\`\`\`bash
git clone --depth 1 https://github.com/drwetter/testssl.sh.git
cd testssl.sh
\`\`\`

Uso básico:
\`\`\`bash
./testssl.sh api.empresa.com
\`\`\`

Salida (extracto):
\`\`\`
 Testing protocols via sockets
 SSLv2      not offered (OK)
 SSLv3      not offered (OK)
 TLS 1      not offered (OK)
 TLS 1.1    not offered (OK)
 TLS 1.2    offered (OK)
 TLS 1.3    offered (OK)

 Testing server's cipher preferences
 TLSv1.3:   TLS_AES_256_GCM_SHA384 TLS_CHACHA20_POLY1305_SHA256 TLS_AES_128_GCM_SHA256
 TLSv1.2:   ECDHE-ECDSA-AES256-GCM-SHA384 ECDHE-ECDSA-AES128-GCM-SHA256

 Testing vulnerabilities
 Heartbleed (CVE-2014-0160)    not vulnerable (OK)
 POODLE, SSL (CVE-2014-3566)   not vulnerable (OK)
 ROBOT                         not vulnerable (OK)

 Rating
 Overall Grade                 A+
\`\`\`

Para generar un reporte HTML:
\`\`\`bash
./testssl.sh --htmlfile reporte-tls.html api.empresa.com
\`\`\`

Para verificar solo el certificado:
\`\`\`bash
./testssl.sh --certinfo api.empresa.com
\`\`\`

---

### 📖 nmap para enumerar cipher suites

\`\`\`bash
nmap --script ssl-enum-ciphers -p 443 api.empresa.com
\`\`\`

Salida:
\`\`\`
443/tcp open  https
| ssl-enum-ciphers:
|   TLSv1.2:
|     ciphers:
|       TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 (ecdh_x25519) - A
|       TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 (ecdh_x25519) - A
|     compressors:
|       NULL
|     cipher preference: server
|   TLSv1.3:
|     ciphers:
|       TLS_AES_256_GCM_SHA384 - A
|_  least strength: A
\`\`\`

---

### 📖 curl -v: ver el handshake TLS

\`\`\`bash
curl -v https://api.empresa.com/healthz 2>&1 | head -50
\`\`\`

\`\`\`
* Trying 203.0.113.10:443...
* Connected to api.empresa.com (203.0.113.10) port 443
* ALPN: curl offers h2,http/1.1
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (IN),  TLS handshake, Server hello (2):
* TLSv1.3 (IN),  TLS handshake, Encrypted Extensions (8):
* TLSv1.3 (IN),  TLS handshake, Certificate (11):
* TLSv1.3 (IN),  TLS handshake, CERT verify (15):
* TLSv1.3 (IN),  TLS handshake, Finished (20):
* TLSv1.3 (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate:
*  subject: CN=api.empresa.com
*  start date: Jul  1 00:00:00 2025 GMT
*  expire date: Sep 29 00:00:00 2025 GMT
*  subjectAltName: host "api.empresa.com" matched cert's "api.empresa.com"
*  issuer: C=US; O=Let's Encrypt; CN=R11
*  SSL certificate verify ok.
\`\`\`

---

### 📖 Errores SSL en logs de nginx

Los errores SSL aparecen en \`/var/log/nginx/error.log\`:

\`\`\`bash
sudo tail -f /var/log/nginx/error.log | grep -i ssl
\`\`\`

Errores comunes y su significado:

\`\`\`
SSL_CTX_use_PrivateKey_file("/etc/ssl/private/servidor.key") failed
(SSL: error:0200100D:system library:fopen:Permission denied)
\`\`\`
→ nginx no puede leer la clave privada. Verificar permisos: \`chmod 640 servidor.key\`,
\`chown root:nginx servidor.key\`.

\`\`\`
SSL_do_handshake() failed (SSL: error:14094418:SSL routines:ssl3_read_bytes:tlsv1 alert unknown ca)
\`\`\`
→ El cliente presentó un certificado firmado por una CA que el servidor no reconoce.
En mTLS: verificar que \`ssl_client_certificate\` apunta a la CA correcta.

\`\`\`
peer closed connection in SSL handshake while SSL handshaking
\`\`\`
→ El cliente abortó el handshake. Puede ser que el cliente no soporte los protocolos/ciphers
del servidor, o que un firewall esté interfiriendo.

\`\`\`
SSL: error:0A000086:SSL routines::certificate verify failed
\`\`\`
→ El certificado del servidor no pasa la verificación. Posibles causas: expirado, cadena
incompleta, CA desconocida.

---

### 📋 Lo que debes recordar
* \`openssl s_client -connect host:443 -servername host -showcerts\` muestra la cadena completa
* Verify return code 0 = OK; cualquier otro valor indica el tipo de problema
* Cadena incompleta: nginx debe servir \`fullchain.pem\`, no solo \`cert.pem\`
* testssl.sh realiza auditoría completa de protocolos, ciphers y vulnerabilidades
* \`nmap --script ssl-enum-ciphers\` lista los cipher suites aceptados por el servidor
* Los errores SSL de nginx aparecen en \`/var/log/nginx/error.log\` con detalles del problema
* curl -v muestra el handshake completo incluyendo verificación del certificado

---

### 🧪 Autoevaluación

1. \`openssl s_client\` muestra \`Verify return code: 20 (unable to get local issuer certificate)\` pero el certificado es de Let's Encrypt. ¿Cuál es la causa más probable?
2. Un certificado funciona correctamente en Chrome pero curl da error de verificación. ¿Qué característica de Chrome explica la diferencia y cómo confirmarías la causa con openssl?
3. Nginx registra el error \`SSL_CTX_use_PrivateKey_file failed: Permission denied\`. ¿Qué comandos ejecutarías para diagnosticar y resolver el problema?

---

1. La CA intermedia de Let's Encrypt no está en el bundle de CAs del sistema local, o el servidor está enviando solo el certificado hoja (cadena incompleta). Confirmar con \`openssl s_client -showcerts\` contando cuántos certificados aparecen.
2. Chrome descarga automáticamente la CA intermedia usando la URL en la extensión AIA (Authority Information Access) del certificado. curl no lo hace. Para confirmar: \`openssl s_client -connect host:443 -showcerts 2>/dev/null | grep -c "BEGIN CERTIFICATE"\` — si devuelve 1, la cadena está incompleta.
3. Primero verificar el propietario y permisos: \`ls -la /etc/ssl/private/servidor.key\`. Luego asegurar que nginx puede leer el archivo: \`chown root:nginx /etc/ssl/private/servidor.key && chmod 640 /etc/ssl/private/servidor.key\`. Recargar nginx y verificar que el error desaparece.
`

export default content
