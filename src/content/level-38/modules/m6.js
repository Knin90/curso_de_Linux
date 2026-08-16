const content = `
## Módulo 6 — Seguridad: SELinux/AppArmor, auditd y certificados SSL/TLS

### 🎯 Objetivos de aprendizaje

* Poner SELinux en modo enforcing sobre srv-prod01 sin romper nginx ni la aplicación desplegada.
* Configurar auditd para registrar eventos de seguridad relevantes del servidor del proyecto.
* Emitir y aplicar un certificado TLS válido para el tráfico HTTPS del servicio.
* Verificar que el endurecimiento de seguridad no degrada la disponibilidad ya construida en el módulo 5.

### ❓ El problema real

srv-prod01 sirve tráfico, se reinicia solo si falla, y tiene una superficie de red mínima. Pero hasta ahora corre con SELinux en modo permissive (o deshabilitado), sin auditoría de eventos sensibles y sirviendo HTTP sin cifrar. Un compromiso de la aplicación en este estado no deja rastro claro y, de tener éxito, no encuentra ninguna barrera de contención más allá del propio proceso. Este módulo cierra esas tres brechas sin romper lo que ya funciona, verificando cada cambio antes de avanzar al siguiente.

### 📖 De permissive a enforcing sin romper el servicio

\`\`\`bash
# Estado actual
getenforce
# Permissive

# Nunca se pasa a enforcing a ciegas: primero se revisan las denegaciones ya registradas
# en modo permissive, generadas por el tráfico normal de nginx y app-srv desde el módulo 5
ausearch -m avc -ts recent

# Traducir las denegaciones a políticas concretas con audit2allow
ausearch -m avc -ts recent | audit2allow -M srv_prod01_local
semodule -i srv_prod01_local.pp
\`\`\`

\`\`\`bash
# Confirmar que los contextos de archivo son correctos para nginx y la app
ls -Z /var/www/srv-prod01
restorecon -Rv /var/www/srv-prod01

# Confirmar el booleano necesario para que nginx haga proxy_pass a la app
getsebool httpd_can_network_connect
# httpd_can_network_connect --> off
setsebool -P httpd_can_network_connect on
\`\`\`

\`\`\`bash
# Solo ahora, con las denegaciones conocidas resueltas, se activa enforcing
setenforce 1
getenforce
# Enforcing

# Persistir el cambio
sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config
\`\`\`

\`\`\`bash
# Verificación funcional inmediata: el servicio sigue respondiendo
curl -s http://srv-prod01/healthz
systemctl status nginx app-srv.service
ausearch -m avc -ts recent
# Sin denegaciones nuevas = la transición fue exitosa
\`\`\`

En sistemas basados en Debian/Ubuntu, el equivalente es AppArmor: se revisan los perfiles en modo \`complain\` con \`aa-logprof\`, se ajustan, y se pasan a \`enforce\` con \`aa-enforce\` solo después de confirmar que no quedan denegaciones inesperadas contra el proceso de la aplicación.

### 📖 auditd: registrar eventos de seguridad relevantes

\`\`\`bash
dnf install -y audit
systemctl enable --now auditd
\`\`\`

\`\`\`text
# /etc/audit/rules.d/srv-prod01.rules

# Cambios en autenticación y usuarios
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k privilege_escalation
-w /etc/sudoers.d/ -p wa -k privilege_escalation

# Cambios en la configuración de SSH y el firewall
-w /etc/ssh/sshd_config -p wa -k ssh_config
-w /etc/firewalld/ -p wa -k firewall_config

# Cambios en el código y configuración de la aplicación desplegada
-w /var/www/srv-prod01 -p wa -k app_changes

# Uso de comandos con privilegios elevados
-a always,exit -F arch=b64 -F euid=0 -S execve -k root_commands
\`\`\`

\`\`\`bash
augenrules --load
auditctl -l
systemctl restart auditd
\`\`\`

\`\`\`bash
# Prueba: modificar sudoers y confirmar que queda registrado
visudo -f /etc/sudoers.d/test
ausearch -k privilege_escalation -ts recent
# type=PATH ... name="/etc/sudoers.d/test" ...
rm /etc/sudoers.d/test
\`\`\`

### 📖 Certificado TLS para el tráfico HTTPS

\`\`\`bash
# Emisión con Let's Encrypt vía certbot, integrado con nginx
dnf install -y certbot python3-certbot-nginx
certbot --nginx -d srv-prod01.example.org --non-interactive --agree-tos -m admin@example.org

# certbot reescribe /etc/nginx/conf.d/srv-prod01.conf añadiendo el bloque 443 con TLS
# y un redirect automático de 80 a 443
nginx -t
systemctl reload nginx
\`\`\`

\`\`\`bash
# Verificar el certificado y la redirección
curl -sI http://srv-prod01
# HTTP/1.1 301 Moved Permanently
# Location: https://srv-prod01.example.org/

curl -sI https://srv-prod01.example.org
# HTTP/2 200

openssl s_client -connect srv-prod01.example.org:443 -servername srv-prod01.example.org </dev/null 2>/dev/null | openssl x509 -noout -dates
# notAfter=... (90 días desde la emisión)
\`\`\`

\`\`\`bash
# Renovación automática (certbot instala su propio timer de systemd)
systemctl list-timers | grep certbot
certbot renew --dry-run
# Congratulations, all simulated renewals succeeded
\`\`\`

Un certificado sin renovación automática verificada es una falla de disponibilidad programada: expira en 90 días y tumba el HTTPS del servicio si nadie lo nota antes.

### 📋 Lo que debes recordar

* SELinux nunca se pasa a enforcing a ciegas: se revisan las denegaciones en permissive, se corrigen con \`audit2allow\`/booleanos/contextos, y solo entonces se activa.
* Cada transición de seguridad se verifica funcionalmente de inmediato (\`curl\` al healthcheck, \`systemctl status\`) antes de considerarla completa.
* auditd debe vigilar específicamente los archivos y acciones que ya se identificaron como sensibles en módulos anteriores: sudoers, sshd_config, firewall, código de la app.
* Un certificado TLS sin renovación automática verificada (\`certbot renew --dry-run\`) es una falla de disponibilidad latente, no una tarea terminada.

### 🧪 Autoevaluación

1. ¿Por qué no se debe activar \`setenforce 1\` directamente sin antes revisar el modo permissive?
2. ¿Qué booleano de SELinux es necesario para que nginx pueda hacer \`proxy_pass\` hacia la aplicación en otro puerto?
3. ¿Cómo se verifica que la renovación automática del certificado TLS realmente funcionará quedando fuera de servicio en 90 días?

---

1. Porque en modo permissive el sistema registra pero no bloquea las acciones denegadas; revisar esas denegaciones con \`ausearch\`/\`audit2allow\` primero permite corregir la política antes de que enforcing bloquee tráfico legítimo de nginx o la aplicación y tumbe el servicio.
2. \`httpd_can_network_connect\`, que permite a los procesos con el contexto de \`httpd\` (nginx) iniciar conexiones de red salientes, necesarias para el \`proxy_pass\` hacia \`127.0.0.1:8080\`.
3. Con \`certbot renew --dry-run\`, que simula el proceso completo de renovación sin modificar el certificado real, confirmando que la automatización (el timer de systemd que certbot instala) funcionará cuando el certificado esté próximo a expirar de verdad.
`

export default content
