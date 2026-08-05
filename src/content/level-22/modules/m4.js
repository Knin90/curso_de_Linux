const content = `
## Módulo 4 — Renovación automática y gestión del ciclo de vida

### 🎯 Objetivos de aprendizaje
* Entender cómo funciona el timer systemd de certbot (y la alternativa con cron)
* Configurar hooks de pre/post/deploy para recargar servicios automáticamente
* Monitorear la expiración de certificados con scripts y herramientas externas
* Conocer la estructura de \`/etc/letsencrypt/renewal/\`
* Forzar una renovación manual cuando es necesario

---

### ❓ El problema real

Let's Encrypt emite certificados con validez de 90 días. Si la renovación falla silenciosamente
— porque el hook de post-renovación falla, porque el puerto 80 estaba bloqueado, o porque el
DNS cambió — el certificado expira y el sitio queda inaccesible a las 2 de la madrugada un
domingo. La renovación automática bien configurada incluye monitoreo proactivo y alertas antes
de que ocurra la expiración.

---

### 📖 Timer systemd de certbot

Cuando se instala certbot en sistemas modernos (Debian 10+, Ubuntu 20.04+), se instalan
automáticamente un timer y un servicio systemd:

\`\`\`bash
systemctl status certbot.timer
\`\`\`

\`\`\`
● certbot.timer - Run certbot twice daily
     Loaded: loaded (/lib/systemd/system/certbot.timer; enabled)
     Active: active (waiting)
    Trigger: Mon 2025-08-05 12:00:00 UTC; 14h left
\`\`\`

\`\`\`bash
systemctl cat certbot.timer
\`\`\`

\`\`\`
[Unit]
Description=Run certbot twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=43200
Persistent=true

[Install]
WantedBy=timers.target
\`\`\`

El timer se ejecuta dos veces al día a las 00:00 y 12:00 UTC, con un retraso aleatorio de
hasta 12 horas (\`RandomizedDelaySec=43200\`). Esto dispersa la carga en los servidores de
Let's Encrypt.

\`certbot renew\` solo renueva certificados que expiran en menos de 30 días. No hace nada
si el certificado tiene más de 30 días de vigencia restante.

Verificar que el timer está activo:
\`\`\`bash
systemctl is-enabled certbot.timer
# enabled

systemctl list-timers --all | grep certbot
\`\`\`

---

### 📖 Alternativa con cron

Si el sistema usa cron en lugar de systemd, o si necesitas más control:

\`\`\`bash
sudo crontab -e
\`\`\`

Agregar:
\`\`\`
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
\`\`\`

El \`--quiet\` suprime la salida cuando no hay nada que renovar. Sin él, cron enviaría un email
cada día aunque no haya renovación.

---

### 📖 Hooks de certbot

Los hooks permiten ejecutar comandos antes, durante o después de la renovación.

**--pre-hook** — se ejecuta antes de intentar renovar (ideal para detener servicios que
ocupan el puerto 80 en modo standalone):
\`\`\`bash
certbot renew --pre-hook "systemctl stop nginx"
\`\`\`

**--post-hook** — se ejecuta después de intentar renovar, independientemente de si tuvo éxito:
\`\`\`bash
certbot renew --post-hook "systemctl start nginx"
\`\`\`

**--deploy-hook** — se ejecuta SOLO cuando un certificado fue renovado exitosamente. Es el
hook más importante para recargar servicios:
\`\`\`bash
certbot renew --deploy-hook "systemctl reload nginx"
\`\`\`

La diferencia clave: \`--post-hook\` se ejecuta siempre; \`--deploy-hook\` solo cuando hubo
renovación efectiva. Usa \`--deploy-hook\` para evitar recargas innecesarias del servidor web.

---

### 📖 Hooks persistentes en archivos de configuración

En lugar de pasar hooks en la línea de comandos, puedes guardarlos como scripts en:

\`\`\`
/etc/letsencrypt/renewal-hooks/pre/
/etc/letsencrypt/renewal-hooks/post/
/etc/letsencrypt/renewal-hooks/deploy/
\`\`\`

Cualquier archivo ejecutable en esas carpetas se corre en el momento correspondiente. Ejemplo:

\`\`\`bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
\`\`\`

\`\`\`bash
#!/bin/bash
systemctl reload nginx
\`\`\`

\`\`\`bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
\`\`\`

Este enfoque es preferible al de pasar hooks en la línea de comandos porque el timer systemd
no necesita modificarse, y los hooks se aplican a todos los certificados gestionados.

---

### 📖 Archivos de configuración de renovación

Cada certificado tiene un archivo de configuración en:
\`\`\`
/etc/letsencrypt/renewal/api.empresa.com.conf
\`\`\`

Contenido típico:
\`\`\`ini
# renew_before_expiry = 30 days
version = 2.9.0
archive_dir = /etc/letsencrypt/archive/api.empresa.com
cert = /etc/letsencrypt/live/api.empresa.com/cert.pem
privkey = /etc/letsencrypt/live/api.empresa.com/privkey.pem
chain = /etc/letsencrypt/live/api.empresa.com/chain.pem
fullchain = /etc/letsencrypt/live/api.empresa.com/fullchain.pem

[renewalparams]
authenticator = nginx
server = https://acme-v02.api.letsencrypt.org/directory
account = a1b2c3d4...
\`\`\`

Aquí puedes cambiar el método de autenticación, añadir dominios, o ajustar la configuración
sin necesidad de emitir un nuevo certificado desde cero.

---

### 📖 Monitoreo de expiración

**Con script propio:**
\`\`\`bash
#!/bin/bash
# check-certs.sh — alerta si un certificado expira en menos de N días

THRESHOLD=\${1:-30}
CERTS_DIR="/etc/letsencrypt/live"

for domain_dir in "\$CERTS_DIR"/*/; do
  domain=\$(basename "\$domain_dir")
  cert="\$domain_dir/cert.pem"
  [ -f "\$cert" ] || continue

  expiry=\$(openssl x509 -enddate -noout -in "\$cert" | cut -d= -f2)
  expiry_epoch=\$(date -d "\$expiry" +%s)
  now_epoch=\$(date +%s)
  days_left=\$(( (expiry_epoch - now_epoch) / 86400 ))

  if [ "\$days_left" -lt "\$THRESHOLD" ]; then
    echo "ALERTA: \$domain expira en \$days_left días (\$expiry)"
  else
    echo "OK: \$domain válido por \$days_left días más"
  fi
done
\`\`\`

\`\`\`bash
chmod +x check-certs.sh
./check-certs.sh 30
\`\`\`

**Comprobar desde fuera del servidor (certbot no disponible):**
\`\`\`bash
# Verificar si el cert del host remoto expira en menos de 30 días
echo | openssl s_client -connect api.empresa.com:443 -servername api.empresa.com 2>/dev/null \\
  | openssl x509 -noout -checkend 2592000
# Salida: Certificate will expire
# Código de salida: 1 = expira pronto, 0 = aún válido
\`\`\`

**Con ssl-cert-check (herramienta especializada):**
\`\`\`bash
sudo apt install ssl-cert-check
ssl-cert-check -s api.empresa.com -p 443 -n 30
\`\`\`

**Con Nagios/check_http:**
\`\`\`bash
/usr/lib/nagios/plugins/check_http -H api.empresa.com --ssl -p 443 \\
  --certificate=30 --sni
\`\`\`
Devuelve WARNING si expira en menos de 30 días, CRITICAL si expira en menos de 14.

---

### 📖 Forzar renovación manual

Para renovar un certificado específico sin esperar a que queden 30 días:

\`\`\`bash
sudo certbot renew --force-renewal --cert-name api.empresa.com
\`\`\`

Para renovar todos los certificados forzosamente (úsalo con cuidado — consume cuota):
\`\`\`bash
sudo certbot renew --force-renewal
\`\`\`

Para revocar un certificado (si la clave privada fue comprometida):
\`\`\`bash
sudo certbot revoke --cert-path /etc/letsencrypt/live/api.empresa.com/cert.pem
\`\`\`

Para eliminar un certificado de certbot sin revocar:
\`\`\`bash
sudo certbot delete --cert-name api.empresa.com
\`\`\`

---

### 📖 Configurar alertas por email

Si certbot está configurado con el timer systemd, los fallos de renovación quedan en el
journal. Para recibir alertas por email en caso de fallo:

\`\`\`bash
sudo nano /etc/systemd/system/certbot-failure-alert.service
\`\`\`

\`\`\`ini
[Unit]
Description=Alert on certbot renewal failure
After=certbot.service

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'systemctl is-failed certbot.service && echo "Certbot renewal FAILED on \$(hostname)" | mail -s "CERT ALERT" ops@empresa.com'
\`\`\`

\`\`\`bash
sudo systemctl daemon-reload
\`\`\`

Una alternativa más simple: agregar \`--email ops@empresa.com\` al comando certbot inicial para
que Let's Encrypt envíe recordatorios cuando el certificado se acerque a la expiración.

---

### 📋 Lo que debes recordar
* El timer systemd de certbot se ejecuta dos veces al día y renueva certs con menos de 30 días de vigencia
* \`--deploy-hook\` solo corre cuando hay renovación exitosa — usar para recargar nginx/apache
* Los hooks persistentes van en \`/etc/letsencrypt/renewal-hooks/deploy/\`
* \`/etc/letsencrypt/renewal/dominio.conf\` almacena la configuración de renovación de cada cert
* \`certbot renew --dry-run\` verifica que la renovación funcionaría sin hacer cambios reales
* Monitorear la expiración externamente con scripts o herramientas como ssl-cert-check
* \`certbot renew --force-renewal\` fuerza la renovación independientemente de la fecha de expiración

---

### 🧪 Autoevaluación

1. El timer de certbot corre correctamente, renueva el certificado, pero nginx sigue sirviendo el certificado expirado. ¿Qué falta en la configuración?
2. ¿Cuándo conviene usar \`--post-hook\` en lugar de \`--deploy-hook\`?
3. Tienes 5 dominios con certificados Let's Encrypt. Quieres recibir una alerta 30 días antes de que cualquiera expire. ¿Cómo lo implementarías de forma simple?

---

1. Falta un deploy-hook que recargue nginx después de la renovación. Agregar un script en \`/etc/letsencrypt/renewal-hooks/deploy/\` que ejecute \`systemctl reload nginx\`.
2. \`--post-hook\` conviene cuando siempre se necesita ejecutar la acción independientemente de si hubo renovación — por ejemplo, para arrancar nginx después de detenerlo con \`--pre-hook --standalone\`. Para recargar configuración solo cuando cambió el certificado, se usa \`--deploy-hook\`.
3. Crear un script que itere \`/etc/letsencrypt/live/*/cert.pem\`, use \`openssl x509 -checkend 2592000\` y envíe un email si devuelve código 1. Programarlo con cron diario o como timer systemd.
`

export default content
