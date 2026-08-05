const content = `
## Módulo 1 — PKI: infraestructura de clave pública y cadena de confianza

### 🎯 Objetivos de aprendizaje
* Comprender la criptografía asimétrica como base de PKI
* Entender qué es un certificado X.509 y qué campos contiene
* Distinguir la cadena de confianza: CA raíz, CA intermedia y certificado hoja
* Diferenciar certificados auto-firmados de certificados firmados por una CA
* Gestionar el almacén de confianza del sistema operativo

---

### ❓ El problema real

Navegas a \`https://banco.com\` y el candado verde aparece. ¿Cómo sabe tu navegador que ese
servidor es realmente banco.com y no un impostor? ¿Quién garantizó que la clave pública que
recibes pertenece a quien dice ser?

La respuesta es PKI — Public Key Infrastructure. Sin entender PKI, no puedes diagnosticar
errores SSL, no puedes configurar mTLS, y no puedes tomar decisiones informadas sobre
certificados en producción.

---

### 📖 Criptografía asimétrica: el fundamento

A diferencia del cifrado simétrico (una sola clave compartida), la criptografía asimétrica usa
un par de claves matemáticamente relacionadas:

**Clave privada** — secreta, nunca abandona el servidor. Se usa para firmar y descifrar.
**Clave pública** — se distribuye libremente. Se usa para verificar firmas y cifrar.

La relación matemática garantiza que lo que firma la clave privada solo puede verificarse con su
clave pública correspondiente, y viceversa. Nadie puede derivar la clave privada a partir de la
pública (con los tamaños actuales de clave: RSA ≥2048 bits, EC P-256 o superior).

El algoritmo más usado históricamente es RSA. Hoy se prefiere ECDSA (Elliptic Curve) porque
produce claves más cortas con igual seguridad y opera más rápido en el handshake TLS.

---

### 📖 ¿Qué es un certificado X.509?

Un certificado es una **clave pública firmada digitalmente** junto con metadatos que la
identifican. La firma la realiza una entidad de confianza — la CA (Certificate Authority).

El formato estándar es **X.509 v3**, definido en RFC 5280. Un certificado contiene:

| Campo | Descripción |
|---|---|
| **Subject** | A quién pertenece el certificado (CN, O, C, etc.) |
| **Issuer** | Quién lo firmó (la CA) |
| **Serial Number** | Número único dentro de la CA |
| **Validity** | notBefore y notAfter (fechas de validez) |
| **Public Key** | La clave pública del sujeto (RSA, EC, etc.) |
| **Subject Alternative Name (SAN)** | Dominios adicionales cubiertos |
| **Key Usage / Extended Key Usage** | Para qué puede usarse (TLS server, client auth, etc.) |
| **Signature** | Firma digital de la CA sobre todos los campos anteriores |

El campo **SAN** es el que los navegadores modernos verifican para validar el hostname.
El campo **CN** (Common Name) ya no es suficiente según RFC 6125.

---

### 📖 La cadena de confianza

Ninguna CA raíz firma directamente los certificados de sitios web en producción. El modelo real
es jerárquico:

\`\`\`
Root CA (CA raíz)
  └── Intermediate CA (CA intermedia)
        └── Leaf Certificate (certificado hoja — tu servidor)
\`\`\`

**CA raíz** — Su clave privada está en hardware HSM desconectado de internet. Solo firma
certificados de CA intermedias. Está preinstalada en el almacén de confianza del SO y el
navegador.

**CA intermedia** — Opera en línea, firma certificados de servidores. Si se compromete, se
revoca sin afectar la raíz. Permite delegar la función de firma.

**Certificado hoja** — El que instala tu servidor web. Es emitido para un dominio específico.
Su validez máxima hoy es 90 días (Let's Encrypt) o hasta 398 días (otras CAs comerciales).

Cuando un cliente TLS recibe tu certificado, verifica:
1. La firma del certificado hoja con la clave pública de la CA intermedia.
2. La firma de la CA intermedia con la clave pública de la CA raíz.
3. Que la CA raíz está en su almacén de confianza local.
4. Que ningún certificado está expirado o revocado.

Si algún eslabón falla, el cliente rechaza la conexión.

---

### 📖 Certificado auto-firmado vs. firmado por una CA

**Auto-firmado** — El Subject y el Issuer son el mismo. La clave privada firma su propio
certificado. No hay cadena de confianza externa. Los navegadores y clientes lo rechazan por
defecto a menos que lo agregues manualmente al almacén de confianza.

Usos legítimos: desarrollo local, infraestructura interna con CA propia, pruebas.

**Firmado por CA** — Una CA reconocida verifica que controlas el dominio (domain validation,
DV) o que tu organización existe (OV, EV), y firma el certificado. Los clientes lo aceptan
automáticamente porque confían en esa CA raíz.

En producción pública, siempre se usa una CA reconocida. Para servicios internos, se usa una
CA interna gestionada por el equipo de sysadmin.

---

### 📖 Almacén de confianza del sistema operativo

El sistema operativo mantiene una lista de CAs raíz en las que confía. En sistemas basados en
Debian/Ubuntu:

\`\`\`
/etc/ssl/certs/           # Certificados individuales (symlinks)
/etc/ssl/certs/ca-certificates.crt  # Bundle unificado (PEM concatenado)
\`\`\`

Para agregar una CA personalizada (interna):

\`\`\`bash
# Copiar el certificado raíz en formato PEM
sudo cp mi-ca-raiz.crt /usr/local/share/ca-certificates/mi-ca-raiz.crt

# Regenerar el bundle y los symlinks
sudo update-ca-certificates
\`\`\`

Salida esperada:
\`\`\`
Updating certificates in /etc/ssl/certs...
1 added, 0 removed; done.
Running hooks in /etc/ca-certificates/update.d...
done.
\`\`\`

En sistemas RHEL/CentOS/Fedora:
\`\`\`bash
sudo cp mi-ca-raiz.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
\`\`\`

Las aplicaciones que usan la librería del sistema (OpenSSL, GnuTLS) consultan este almacén.
Los navegadores como Firefox mantienen su propio almacén independiente del SO.

---

### 📖 Formatos de archivo de certificados

Encontrarás estas extensiones en el trabajo diario:

| Extensión | Formato | Contenido típico |
|---|---|---|
| .pem | Base64 (texto) | Cert, clave, o ambos |
| .crt / .cer | Base64 o DER | Certificado |
| .key | Base64 (texto) | Clave privada |
| .csr | Base64 (texto) | Solicitud de firma |
| .der | Binario | Certificado en binario |
| .p12 / .pfx | Binario | Cert + clave privada + cadena |

El formato PEM es el más común en Linux. Se reconoce por los encabezados:
\`\`\`
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAL...
-----END CERTIFICATE-----
\`\`\`

---

### 📋 Lo que debes recordar
* La criptografía asimétrica usa un par clave pública/privada; la privada nunca sale del servidor
* Un certificado X.509 es una clave pública firmada por una CA con metadatos de identidad
* La cadena de confianza va de CA raíz → CA intermedia → certificado hoja
* Los certificados auto-firmados no tienen cadena de confianza externa; se rechazan sin configuración manual
* El campo SAN define los dominios cubiertos; los navegadores modernos lo usan en vez del CN
* \`update-ca-certificates\` (Debian) o \`update-ca-trust\` (RHEL) agrega CAs personalizadas al almacén del sistema

---

### 🧪 Autoevaluación

1. ¿Por qué la cadena de confianza usa una CA intermedia en lugar de que la CA raíz firme directamente los certificados hoja?
2. Un sitio presenta un certificado válido pero el navegador muestra "NET::ERR_CERT_COMMON_NAME_INVALID". ¿Cuál es la causa más probable?
3. Instalas una CA interna en \`/usr/local/share/ca-certificates/\` pero \`curl https://servicio-interno\` sigue fallando. ¿Qué paso falta?

---

1. Para proteger la CA raíz: si la intermedia se compromete, se revoca sin invalidar la raíz (cuya clave está offline en HSM). Limita la exposición de la clave más valiosa.
2. El dominio del servidor no está en el campo SAN del certificado. Los navegadores modernos ignoran el CN y solo validan el SAN.
3. Falta ejecutar \`sudo update-ca-certificates\` para regenerar el bundle \`ca-certificates.crt\` con la nueva CA. Copiar el archivo no es suficiente.
`

export default content
