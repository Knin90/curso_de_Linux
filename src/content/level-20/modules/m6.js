const content = `
## Módulo 6 — Headers de proxy: X-Forwarded-For y seguridad

### 🎯 Objetivos de aprendizaje

* Configurar correctamente los headers X-Forwarded-* en nginx.
* Entender los riesgos de confiar ciegamente en X-Forwarded-For.
* Usar \`real_ip_module\` para obtener la IP real del cliente.
* Añadir y eliminar headers de seguridad en el proxy.

### ❓ El problema real

Tu aplicación implementa rate limiting por IP usando \`request.ip\`. En producción, detrás de nginx, todos los usuarios parecen venir de 127.0.0.1. El rate limiting no funciona. Peor: un usuario malintencionado envía \`X-Forwarded-For: 1.2.3.4\` y tu app se lo cree, permitiéndole falsificar su IP. Los headers de proxy mal configurados son un vector de ataque conocido.

### 📖 El problema de X-Forwarded-For

Cuando un cliente pasa por múltiples proxies, cada proxy añade su IP al header \`X-Forwarded-For\`:

\`\`\`text
Cliente (1.2.3.4)
  → Proxy 1 (10.0.0.1)  añade: X-Forwarded-For: 1.2.3.4
    → Proxy 2 (10.0.0.2) añade: X-Forwarded-For: 1.2.3.4, 10.0.0.1
      → nginx              añade: X-Forwarded-For: 1.2.3.4, 10.0.0.1, 10.0.0.2
        → Backend recibe:  X-Forwarded-For: 1.2.3.4, 10.0.0.1, 10.0.0.2
\`\`\`

El problema: el campo más a la izquierda (1.2.3.4) lo puso el cliente original — pero también lo puede falsificar cualquier cliente enviando un header \`X-Forwarded-For\` inventado.

### 📖 Configuración correcta de headers de proxy

\`\`\`nginx
# nginx.conf → http block
# Módulo real_ip: confiar solo en IPs de proxies conocidos
real_ip_header    X-Forwarded-For;
real_ip_recursive on;

# IPs de proxies en los que confiamos (nuestros proxies/load balancers)
set_real_ip_from  10.0.0.0/8;
set_real_ip_from  172.16.0.0/12;
set_real_ip_from  192.168.0.0/16;

# IPs de CDNs conocidas (ejemplo: Cloudflare)
set_real_ip_from  103.21.244.0/22;
set_real_ip_from  103.22.200.0/22;
\`\`\`

Con \`real_ip_recursive on\`, nginx recorre el header \`X-Forwarded-For\` de derecha a izquierda, ignorando las IPs de proxies de confianza hasta encontrar la primera IP no confiable — esa es la IP real del cliente y se convierte en \`\$remote_addr\`.

### 📖 Headers estándar a configurar

\`\`\`nginx
location / {
    proxy_pass http://mi_app;

    # ── Headers de identidad del cliente ──────────────────────────────
    # IP real del cliente (o la última IP del proxy de confianza)
    proxy_set_header X-Real-IP          \$remote_addr;

    # Cadena completa de IPs (cliente + proxies intermedios)
    proxy_set_header X-Forwarded-For    \$proxy_add_x_forwarded_for;

    # Protocolo original del cliente (http o https)
    proxy_set_header X-Forwarded-Proto  \$scheme;

    # Puerto original del cliente
    proxy_set_header X-Forwarded-Port   \$server_port;

    # Dominio original solicitado por el cliente
    proxy_set_header Host               \$host;

    # ── Limpiar headers que el cliente no debe poder inyectar ─────────
    # Si el cliente envió estos headers, eliminarlos antes de llegar al backend
    proxy_set_header X-Internal-Token   "";
    proxy_set_header X-Admin           "";
}
\`\`\`

### 📖 Headers de seguridad en la respuesta

nginx puede añadir o modificar headers de respuesta para mejorar la seguridad:

\`\`\`nginx
server {
    listen 443 ssl;
    server_name app.ejemplo.com;

    location / {
        proxy_pass http://mi_app;
        proxy_set_header Host            \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;

        # ── Headers de seguridad en la respuesta ──────────────────────
        # Forzar HTTPS para futuros requests (HSTS)
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Prevenir clickjacking
        add_header X-Frame-Options "SAMEORIGIN" always;

        # Prevenir MIME sniffing
        add_header X-Content-Type-Options "nosniff" always;

        # Política de referrer
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Eliminar el header que revela el software del servidor
        proxy_hide_header X-Powered-By;
        proxy_hide_header Server;

        # Ocultar también el servidor nginx
        server_tokens off;
    }
}
\`\`\`

### 📖 Verificar headers con curl

\`\`\`bash
# Ver todos los headers de respuesta
curl -I https://app.ejemplo.com/

# Ver headers enviados al backend (desde el backend mismo)
# Ejemplo con Node.js: console.log(req.headers)
# Ejemplo con Python/Flask: print(request.headers)

# Verificar que X-Forwarded-For llega bien
curl -H "X-Forwarded-For: 9.9.9.9" https://app.ejemplo.com/mi-ip
# Si el backend usa real_ip_module correctamente:
# → debe ignorar el 9.9.9.9 inyectado por el cliente
# → debe reportar la IP real de la conexión TCP

# Verificar headers de seguridad
curl -I https://app.ejemplo.com/ | grep -i "strict\|frame\|content-type"
\`\`\`

### 📋 Lo que debes recordar

* Sin \`set_real_ip_from\`, \`\$remote_addr\` es la IP del proxy anterior, no del cliente real.
* \`real_ip_recursive on\` es necesario cuando hay múltiples proxies en cadena.
* Siempre limpiar headers que el cliente no debería poder inyectar: \`proxy_set_header X-Internal-Token ""\`.
* \`proxy_hide_header\` en la respuesta oculta información del stack tecnológico que podrían aprovechar atacantes.

### 🧪 Autoevaluación

1. Un cliente malicioso envía \`X-Forwarded-For: 127.0.0.1\`. ¿Cómo evita nginx que el backend trate esa IP como el origen real?
2. ¿Cuál es la diferencia entre \`X-Real-IP\` y \`X-Forwarded-For\`?
3. ¿Por qué \`add_header Strict-Transport-Security\` solo tiene efecto cuando se añade en nginx y no cuando lo devuelve el backend?

---

1. Usando \`real_ip_recursive on\` junto con \`set_real_ip_from\` apuntando a los proxies de confianza. Con esta configuración, nginx no acepta el \`X-Forwarded-For\` del cliente como fuente de la IP real. En cambio, usa \`\$remote_addr\` (la IP de la conexión TCP real) y solo confía en los headers \`X-Forwarded-For\` añadidos por proxies cuyas IPs están listadas en \`set_real_ip_from\`. Un cliente externo enviando \`X-Forwarded-For: 127.0.0.1\` no está en la lista de proxies de confianza, por lo que ese valor se ignora.
2. \`X-Real-IP\` contiene una sola IP: la del cliente real (o la del último proxy de confianza). Es simple y fácil de leer para el backend. \`X-Forwarded-For\` es una lista de todas las IPs por las que ha pasado la petición en orden: \`IP-cliente, IP-proxy1, IP-proxy2\`. Contiene el historial completo del camino, útil para depuración, pero requiere parsing. Muchos frameworks usan \`X-Forwarded-For\` y toman el primer elemento (más a la izquierda) como la IP real.
3. Los headers \`add_header\` de nginx solo se incluyen en las respuestas que nginx genera directamente (errores, respuestas propias) o que pasan por nginx y a las que se añaden explícitamente. Para respuestas que vienen del backend vía \`proxy_pass\`, nginx añade los headers configurados con \`add_header\` antes de enviarlas al cliente, lo que funciona correctamente. Si el backend ya devuelve \`Strict-Transport-Security\`, nginx puede tener dos copias del header a menos que se use \`proxy_hide_header\` para eliminar la del backend primero. Por eso es mejor gestionarlo en nginx donde se tiene control centralizado.
`

export default content
