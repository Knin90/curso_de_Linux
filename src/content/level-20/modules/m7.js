const content = `
## Módulo 7 — Terminación SSL y re-cifrado backend

### 🎯 Objetivos de aprendizaje

* Configurar terminación SSL en nginx (SSL offloading).
* Implementar re-cifrado al backend (SSL end-to-end).
* Gestionar certificados en el contexto de proxy inverso.
* Elegir entre terminación SSL y re-cifrado según los requisitos de seguridad.

### ❓ El problema real

Tu empresa requiere cifrado en tránsito en todos los segmentos de red, incluso entre nginx y los backends internos. Actualmente nginx termina SSL y habla HTTP plano con los backends. El equipo de seguridad lo considera insuficiente para datos médicos. Necesitas configurar re-cifrado: nginx termina el SSL externo, verifica el certificado del cliente, y re-cifra la conexión hacia el backend con su propio certificado. Esto se llama SSL end-to-end o re-cifrado.

### 📖 Terminación SSL (SSL offloading)

El patrón más común: el cliente habla HTTPS con nginx, y nginx habla HTTP plano con el backend en la red interna:

\`\`\`diagram
{"type":"flow-stack","layers":[{"name":"Cliente","icon":"desktop"},{"name":"nginx","meta":"termina TLS · :443","icon":"gateway","focal":true},{"name":"Backend","meta":"red interna · :3000","icon":"server"}],"edges":[{"label":"HTTPS","accent":true},{"label":"HTTP"}]}
\`\`\`

\`\`\`nginx
server {
    listen 443 ssl;
    server_name app.ejemplo.com;

    # Certificado de nginx (el que ve el cliente)
    ssl_certificate     /etc/letsencrypt/live/app.ejemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.ejemplo.com/privkey.pem;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        # Backend en HTTP plano — tráfico interno no cifrado
        proxy_pass http://localhost:3000;
        proxy_set_header Host              \$host;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;   # indica "https" al backend
    }
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name app.ejemplo.com;
    return 301 https://\$host\$request_uri;
}
\`\`\`

### 📖 Re-cifrado al backend (SSL end-to-end)

nginx habla HTTPS tanto con el cliente como con el backend:

\`\`\`diagram
{"type":"flow-stack","layers":[{"name":"Cliente","icon":"desktop"},{"name":"nginx","meta":"proxy TLS · :443","icon":"gateway","focal":true},{"name":"Backend","meta":":3443","icon":"server"}],"edges":[{"label":"HTTPS","accent":true},{"label":"HTTPS","accent":true}]}
\`\`\`

\`\`\`nginx
server {
    listen 443 ssl;
    server_name app.ejemplo.com;

    # Certificado de nginx (externo)
    ssl_certificate     /etc/letsencrypt/live/app.ejemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.ejemplo.com/privkey.pem;

    location / {
        # ── Re-cifrado al backend ──────────────────────────────────────
        proxy_pass https://backend.interno:3443;

        # Verificar el certificado del backend
        proxy_ssl_verify        on;
        proxy_ssl_trusted_certificate /etc/nginx/certs/ca-interna.pem;
        proxy_ssl_verify_depth  2;

        # Certificado de cliente (si el backend requiere mTLS)
        proxy_ssl_certificate     /etc/nginx/certs/nginx-client.crt;
        proxy_ssl_certificate_key /etc/nginx/certs/nginx-client.key;

        # Protocolo y cifrados para la conexión nginx → backend
        proxy_ssl_protocols     TLSv1.2 TLSv1.3;
        proxy_ssl_ciphers       HIGH:!aNULL:!MD5;

        # Reutilizar sesiones SSL con el backend (mejora rendimiento)
        proxy_ssl_session_reuse on;

        proxy_set_header Host            \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
\`\`\`

### 📖 Certificados internos para backends

Para re-cifrado en red interna, generalmente se usa una CA propia:

\`\`\`bash
# Generar CA interna (una sola vez)
openssl genrsa -out ca-interna.key 4096
openssl req -new -x509 -days 3650 \
    -key ca-interna.key \
    -out ca-interna.crt \
    -subj "/CN=CA Interna/O=Empresa"

# Generar certificado para el backend
openssl genrsa -out backend.key 2048
openssl req -new -key backend.key \
    -out backend.csr \
    -subj "/CN=backend.interno/O=Empresa"

openssl x509 -req -days 365 \
    -in backend.csr \
    -CA ca-interna.crt \
    -CAkey ca-interna.key \
    -CAcreateserial \
    -out backend.crt

# Distribuir al backend
scp backend.crt backend.key usuario@backend.interno:/etc/ssl/
# Distribuir CA a nginx
cp ca-interna.crt /etc/nginx/certs/ca-interna.pem
\`\`\`

### 📖 Comparativa: terminación SSL vs re-cifrado

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Terminación SSL","icon":"lock","rows":["Cifrado externo: sí (HTTPS cliente)","Cifrado interno: no (HTTP plano)","Complejidad: baja","Rendimiento: mayor (menos cifrado)","Requisito regulatorio: PCI-DSS nivel bajo","Gestión certificados: 1 cert (externo)","Ideal para: la mayoría de apps"]},{"title":"Re-cifrado","icon":"lock","focal":true,"rows":["Cifrado externo: sí (HTTPS cliente)","Cifrado interno: sí (HTTPS backend)","Complejidad: alta","Rendimiento: menor (doble cifrado)","Requisito regulatorio: PCI-DSS, HIPAA, PII","Gestión certificados: 2+ certs (+ CA interna)","Ideal para: datos sensibles, compliance"]}]}
\`\`\`

### 📋 Lo que debes recordar

* \`proxy_ssl_verify on\` verifica el certificado del backend — sin esto, el re-cifrado no protege contra MITM interno.
* \`proxy_ssl_session_reuse on\` reutiliza sesiones TLS para reducir el overhead del handshake con los backends.
* La terminación SSL es suficiente para la mayoría de aplicaciones si la red interna es de confianza.
* El re-cifrado es obligatorio para datos bajo HIPAA, PCI-DSS nivel alto o redes no confiables.

### 🧪 Autoevaluación

1. ¿Qué diferencia de seguridad hay entre \`proxy_pass http://backend:3000\` y \`proxy_pass https://backend:3443\`?
2. ¿Por qué es importante \`proxy_ssl_verify on\` si ya se está usando HTTPS hacia el backend?
3. Un backend requiere mTLS. ¿Qué directivas adicionales necesita nginx para presentar su propio certificado?

---

1. Con \`http://\`, el tráfico entre nginx y el backend viaja sin cifrar. Si alguien puede interceptar el tráfico de red interna (ARP spoofing, acceso físico a switches, otro servidor comprometido en la misma red), puede leer los datos. Con \`https://\`, todo el tráfico está cifrado incluso en la red interna. La diferencia práctica depende del modelo de amenaza: red interna completamente controlada vs red con múltiples inquilinos o requisitos de compliance.
2. Sin \`proxy_ssl_verify on\`, nginx establece una conexión HTTPS cifrada pero no verifica que el certificado del backend sea auténtico. Un atacante podría hacer un ataque man-in-the-middle en la red interna presentando un certificado falso, y nginx lo aceptaría. La verificación garantiza que nginx solo habla con el backend legítimo cuyo certificado fue firmado por la CA de confianza configurada.
3. Necesita \`proxy_ssl_certificate\` apuntando al archivo .crt del certificado cliente de nginx, y \`proxy_ssl_certificate_key\` apuntando a la clave privada correspondiente. Opcionalmente, se configura \`proxy_ssl_trusted_certificate\` con la CA que firmó el certificado del backend. El backend debe estar configurado para requerir certificado de cliente (\`ssl_verify_client on\` si también es nginx) y confiar en la CA que firmó el certificado de nginx.
`

export default content
