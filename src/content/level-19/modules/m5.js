const content = `
## Módulo 5 — SSL/TLS en nginx: certificados, HTTPS y configuración segura

### 🎯 Objetivos de aprendizaje

* Configurar HTTPS en nginx con certificados propios y de Let's Encrypt.
* Definir protocolos y ciphers seguros descartando versiones obsoletas.
* Implementar HSTS, OCSP stapling y la redirección HTTP→HTTPS.
* Configurar la sesión TLS correctamente para balancear seguridad y rendimiento.

### ❓ El problema real

Tienes un sitio en HTTP y necesitas migrarlo a HTTPS. Con un certificado de Let's Encrypt gratuito y nginx puedes conseguir un A+ en ssllabs.com si la configuración es correcta. Si usas la configuración por defecto, probablemente acabes con TLS 1.0 habilitado, ciphers débiles y sin HSTS, lo que resultará en un B o C. Este módulo muestra la configuración que deberías usar en producción hoy.

### 📖 Obtener un certificado con Let's Encrypt (Certbot)

\`\`\`bash
# Instalar certbot con plugin de nginx
apt install certbot python3-certbot-nginx    # Debian/Ubuntu
dnf install certbot python3-certbot-nginx   # Fedora/RHEL

# Obtener certificado para uno o varios dominios
# Certbot modifica nginx.conf automáticamente (--nginx flag)
certbot --nginx -d empresa.com -d www.empresa.com

# Modo manual: solo obtener el certificado, configurar nginx manualmente
certbot certonly --nginx -d empresa.com -d www.empresa.com

# Los certificados se guardan en:
# /etc/letsencrypt/live/empresa.com/fullchain.pem  ← certificado + cadena
# /etc/letsencrypt/live/empresa.com/privkey.pem    ← clave privada

# Renovación automática: certbot instala un timer de systemd o cron
systemctl status certbot.timer
certbot renew --dry-run    # simular renovación sin hacer cambios
\`\`\`

### 📖 Configuración básica de HTTPS

\`\`\`nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name empresa.com www.empresa.com;

    # Certificado y clave privada
    ssl_certificate     /etc/letsencrypt/live/empresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/empresa.com/privkey.pem;

    root /var/www/empresa;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }
}

# Redirección HTTP → HTTPS (301 permanente)
server {
    listen 80;
    listen [::]:80;
    server_name empresa.com www.empresa.com;
    return 301 https://\$host\$request_uri;
}
\`\`\`

### 📖 Protocolos TLS: qué habilitar y qué descartar

\`\`\`nginx
# Estado actual (2024):
# TLS 1.0: OBSOLETO. Vulnerable (POODLE, BEAST). No usar.
# TLS 1.1: OBSOLETO. Depreciado por RFC 8996. No usar.
# TLS 1.2: VIGENTE. Requerido para compatibilidad con clientes más antiguos.
# TLS 1.3: PREFERIDO. Más rápido (1-RTT handshake), más seguro.

ssl_protocols TLSv1.2 TLSv1.3;

# Solo TLS 1.3 (máxima seguridad, menor compatibilidad)
# ssl_protocols TLSv1.3;
# Excluye: IE11, Android < 5, Java 8u31 y anteriores
\`\`\`

### 📖 Cipher suites: configuración segura

\`\`\`nginx
# Para TLS 1.2 (TLS 1.3 tiene sus propios ciphers no configurables)
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';

# El servidor elige el cipher, no el cliente
ssl_prefer_server_ciphers on;

# Alternativa: usar la configuración recomendada de Mozilla
# https://ssl-config.mozilla.org (herramienta oficial, úsala)
# Genera configuraciones para Intermediate, Modern y Old compatibility
\`\`\`

### 📖 Sesión TLS: caché y timeout

El handshake TLS es costoso (CPU + RTTs). La reutilización de sesiones (session resumption) evita repetirlo en conexiones posteriores del mismo cliente:

\`\`\`nginx
# Caché de sesiones TLS compartido entre workers
# 1m ≈ 4000 sesiones; para alto tráfico usa 10m o más
ssl_session_cache shared:SSL:10m;

# Tiempo máximo que dura una sesión en caché
ssl_session_timeout 1d;

# Deshabilitar session tickets (evitar problemas de Perfect Forward Secrecy
# si la clave de tickets se filtra)
ssl_session_tickets off;

# Parámetros DH para DHE ciphers (si los usas)
# Generar: openssl dhparam -out /etc/nginx/dhparam.pem 2048
ssl_dhparam /etc/nginx/dhparam.pem;
\`\`\`

### 📖 OCSP Stapling: verificación de revocación eficiente

Sin OCSP stapling, el navegador contacta la CA para verificar si el certificado ha sido revocado (lento, privacidad del usuario expuesta). Con stapling, nginx hace esa consulta y incluye la respuesta en el handshake TLS:

\`\`\`nginx
# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;

# Certificado de la CA (necesario para verificar la respuesta OCSP)
# fullchain.pem de Let's Encrypt ya lo incluye
ssl_trusted_certificate /etc/letsencrypt/live/empresa.com/fullchain.pem;

# Resolver DNS para contactar la CA (debe estar accesible desde el servidor)
resolver 8.8.8.8 1.1.1.1 valid=300s;
resolver_timeout 5s;
\`\`\`

\`\`\`bash
# Verificar que OCSP stapling funciona
openssl s_client -connect empresa.com:443 -status 2>/dev/null | grep -A 10 "OCSP response"
# Debe mostrar: OCSP Response Status: successful
\`\`\`

### 📖 HSTS: HTTP Strict Transport Security

HSTS le indica al navegador que nunca use HTTP para este dominio, incluso si el usuario escribe \`http://\`. Previene ataques de downgrade y SSL stripping:

\`\`\`nginx
server {
    listen 443 ssl;
    server_name empresa.com;

    # HSTS: el navegador solo usará HTTPS durante max-age segundos
    # includeSubDomains: aplica a todos los subdominios
    # preload: permite incluir el dominio en la lista precargada de navegadores
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
\`\`\`

**Advertencia importante:** Una vez que un navegador recibe HSTS con \`max-age=31536000\`, intentará HTTPS durante 1 año aunque elimines el certificado. Empieza con \`max-age=300\` (5 minutos) para pruebas, y sube a 1 año solo cuando estés seguro de que HTTPS funcionará permanentemente.

### 📖 Configuración SSL completa para producción

\`\`\`nginx
# /etc/nginx/snippets/ssl-params.conf
# Incluir este snippet en todos los server blocks HTTPS

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';

ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

ssl_stapling on;
ssl_stapling_verify on;
resolver 1.1.1.1 8.8.8.8 valid=300s;
resolver_timeout 5s;

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
\`\`\`

\`\`\`nginx
# /etc/nginx/sites-available/empresa.com

server {
    listen 80;
    listen [::]:80;
    server_name empresa.com www.empresa.com;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;  # nginx >= 1.25.1; antes era: listen 443 ssl http2;
    server_name empresa.com www.empresa.com;

    ssl_certificate     /etc/letsencrypt/live/empresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/empresa.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/empresa.com/chain.pem;

    include /etc/nginx/snippets/ssl-params.conf;

    root /var/www/empresa;
    index index.html;

    access_log /var/log/nginx/empresa.com.access.log;
    error_log  /var/log/nginx/empresa.com.error.log warn;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
\`\`\`

### 📖 Verificar la configuración SSL

\`\`\`bash
# Test básico de SSL con openssl
openssl s_client -connect empresa.com:443 -servername empresa.com < /dev/null

# Ver los protocolos soportados
openssl s_client -connect empresa.com:443 -tls1   # debe fallar si TLS 1.0 está deshabilitado
openssl s_client -connect empresa.com:443 -tls1_2 # debe funcionar
openssl s_client -connect empresa.com:443 -tls1_3 # debe funcionar

# Ver la cadena de certificados
openssl s_client -connect empresa.com:443 -showcerts < /dev/null

# Verificar fecha de expiración
echo | openssl s_client -connect empresa.com:443 2>/dev/null | openssl x509 -noout -dates

# Test completo online: https://www.ssllabs.com/ssltest/
# curl también puede verificar:
curl -v https://empresa.com 2>&1 | grep -E "(SSL|TLS|certificate)"
\`\`\`

### 📖 Renovación automática de Let's Encrypt

\`\`\`bash
# Certbot instala automáticamente un timer de systemd
systemctl status certbot.timer
# ● certbot.timer - Run certbot twice daily
#      Active: active (waiting)
#     Trigger: Wed 2024-01-10 12:00:00 UTC; 4h left

# Verificar que la renovación automática funciona (simulación)
certbot renew --dry-run

# El hook post-renovación recarga nginx automáticamente
# Certbot crea /etc/letsencrypt/renewal-hooks/deploy/
ls /etc/letsencrypt/renewal-hooks/deploy/

# Si nginx no se recarga tras la renovación, crear el hook manualmente:
cat > /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << 'HOOK'
#!/bin/bash
nginx -t && systemctl reload nginx
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
\`\`\`

### 📋 Lo que debes recordar

* Solo usar TLS 1.2 y 1.3. TLS 1.0 y 1.1 son obsoletos y vulnerables.
* HSTS es irreversible durante el \`max-age\`: empieza con valores bajos en testing antes de subirlo a 1 año.
* OCSP stapling mejora el rendimiento del handshake y la privacidad del usuario: siempre habilitarlo.
* La redirección HTTP→HTTPS debe ser 301 (permanente), no 302.
* \`ssl_session_tickets off\` + \`ssl_session_cache\` es la combinación correcta para PFS con reutilización de sesión.

### 🧪 Autoevaluación

1. ¿Por qué \`ssl_session_tickets off\` mejora la seguridad respecto a tener session tickets habilitados?
2. Un usuario visita tu sitio HTTPS con HSTS \`max-age=31536000\`. Al día siguiente eliminas el certificado SSL y pones el sitio en HTTP. ¿Qué pasa?
3. ¿Qué hace concretamente OCSP stapling y qué problema resuelve frente a la verificación OCSP estándar?

---

1. Los session tickets cifran el estado de la sesión TLS con una clave mantenida por el servidor. Si esa clave se filtra (o no rota frecuentemente), un atacante que grabó el tráfico puede descifrarlo retroactivamente, rompiendo la Perfect Forward Secrecy. Con \`ssl_session_tickets off\`, el servidor usa session IDs en caché (que expiran y no se reutilizan entre reinicios), preservando PFS porque cada sesión usa claves efímeras.
2. El navegador del usuario tiene HSTS cacheado por 1 año. Cuando intenta acceder al sitio, el navegador automáticamente convierte la petición a HTTPS y se niega a conectar si el certificado no es válido. El usuario verá un error de conexión y no podrá acceder aunque el sitio responda en HTTP. No hay forma de forzar al navegador a usar HTTP durante ese año (excepto borrar manualmente el HSTS en la configuración del navegador).
3. En el flujo OCSP estándar, el navegador contacta directamente al servidor OCSP de la CA para verificar si el certificado está revocado: esto añade latencia al handshake TLS (una petición HTTP adicional a la CA) y revela al servidor de la CA qué sitios visita el usuario. Con OCSP stapling, es nginx quien consulta la CA periódicamente y adjunta la respuesta OCSP (firmada por la CA) directamente en el handshake TLS. El navegador verifica esa respuesta sin contactar la CA: handshake más rápido y privacidad del usuario preservada.
`

export default content
