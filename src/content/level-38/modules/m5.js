const content = `
## Módulo 5 — Servicios: systemd, nginx y la aplicación desplegada

### 🎯 Objetivos de aprendizaje

* Instalar y configurar nginx como proxy inverso hacia la aplicación de srv-prod01.
* Escribir un unit file de systemd propio para la aplicación desplegada.
* Configurar políticas de reinicio automático y healthchecks para ambos servicios.
* Verificar que el sistema de servicios sobrevive a caídas de proceso y a reinicios del servidor.

### ❓ El problema real

srv-prod01 ya tiene red, SSH y almacenamiento listos, pero todavía no sirve nada. La aplicación que se va a desplegar es un backend simple que escucha en \`127.0.0.1:8080\`; no debe exponerse directamente a internet. Se necesita nginx como capa intermedia (proxy inverso) que reciba el tráfico externo en 80/443 y lo reenvíe internamente, y se necesita que tanto nginx como la aplicación se reinicien solos si fallan, sin depender de que un humano lo note y lo arregle a mano a las 3 de la mañana.

### 📖 Instalación de nginx como proxy inverso

\`\`\`bash
dnf install -y nginx
systemctl enable --now nginx
\`\`\`

\`\`\`text
# /etc/nginx/conf.d/srv-prod01.conf
server {
    listen 80;
    server_name srv-prod01.example.org;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

    location /healthz {
        proxy_pass http://127.0.0.1:8080/healthz;
        access_log off;
    }
}
\`\`\`

\`\`\`bash
# Validar sintaxis antes de recargar
nginx -t
# nginx: configuration file /etc/nginx/nginx.conf test is successful

systemctl reload nginx
\`\`\`

La aplicación solo escucha en \`127.0.0.1\`, nunca en \`0.0.0.0\`: si nginx cayera o su configuración fuera incorrecta, la aplicación no queda expuesta directamente por accidente al mundo exterior.

### 📖 Unit file propio para la aplicación

La aplicación se despliega en \`/var/www/srv-prod01\` (el volumen \`lv_www\` creado en el módulo 4), corriendo como el usuario de servicio \`appsvc\` creado en el módulo 2.

\`\`\`text
# /etc/systemd/system/app-srv.service
[Unit]
Description=Aplicación de srv-prod01
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=appsvc
Group=appsvc
WorkingDirectory=/var/www/srv-prod01
ExecStart=/usr/bin/node /var/www/srv-prod01/server.js
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3

# Hardening del proceso
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/www/srv-prod01
ProtectHome=true

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
systemctl daemon-reload
systemctl enable --now app-srv.service
systemctl status app-srv.service
\`\`\`

\`\`\`text
● app-srv.service - Aplicación de srv-prod01
     Loaded: loaded (/etc/systemd/system/app-srv.service; enabled)
     Active: active (running) since ...
\`\`\`

\`\`\`text
DIRECTIVA                POR QUÉ
──────────────────────────────────────────────────────────────────────────
Restart=on-failure        Reinicia solo si el proceso termina con error, no en un stop intencional
RestartSec=5               Da margen para que el problema que causó el fallo no se repita instantáneamente
StartLimitBurst=3          Evita un bucle infinito de reinicios si el proceso está roto de fondo
ProtectSystem=strict        El proceso no puede escribir en el sistema de archivos salvo lo listado
ReadWritePaths=...          Único directorio donde el proceso puede escribir, alineado con lv_www
\`\`\`

### 📖 Healthcheck y verificación de disponibilidad

\`\`\`bash
# La aplicación expone /healthz internamente
curl -s http://127.0.0.1:8080/healthz
# {"status":"ok","uptime":142}

# A través de nginx, expuesto en el servidor
curl -s http://srv-prod01/healthz
# {"status":"ok","uptime":142}
\`\`\`

\`\`\`bash
# Simular una caída del proceso y verificar el reinicio automático
systemctl status app-srv.service | grep 'Main PID'
kill -9 <PID>
sleep 6
systemctl status app-srv.service
# Active: active (running) — nuevo PID, RestartSec=5 cumplido
journalctl -u app-srv.service --since "2 minutes ago"
\`\`\`

Este test es obligatorio, no opcional: un \`Restart=on-failure\` sin verificar es una suposición, no una garantía. El checklist del proyecto solo se marca con evidencia de que el reinicio automático ocurrió de verdad.

### 📖 Orden de arranque y dependencias entre servicios

\`\`\`bash
# nginx depende de que la app esté disponible para no servir errores 502 al arrancar
# Se ajusta con After= y opcionalmente con un ExecStartPre que espera el healthcheck
\`\`\`

\`\`\`text
# Añadir a la sección [Unit] de nginx.service vía override
systemctl edit nginx.service
\`\`\`

\`\`\`text
[Unit]
After=app-srv.service
Wants=app-srv.service
\`\`\`

\`\`\`bash
systemctl daemon-reload
systemctl restart nginx
systemctl list-dependencies nginx.service
\`\`\`

### 📋 Lo que debes recordar

* La aplicación solo escucha en \`127.0.0.1\`; nginx es la única puerta de entrada externa.
* Todo servicio propio del proyecto tiene un unit file con \`Restart=\`, límites de reinicio y hardening de \`systemd\` (\`ProtectSystem\`, \`NoNewPrivileges\`).
* El reinicio automático se verifica matando el proceso y observando el healthcheck recuperarse, no se asume.
* Las dependencias de arranque entre servicios (\`After=\`, \`Wants=\`) evitan errores transitorios al iniciar el servidor completo.

### 🧪 Autoevaluación

1. ¿Por qué la aplicación desplegada escucha en \`127.0.0.1:8080\` y no en \`0.0.0.0:8080\`?
2. ¿Qué combinación de directivas de systemd evita que un servicio roto entre en un bucle infinito de reinicios?
3. ¿Cómo se verifica, con evidencia real, que \`Restart=on-failure\` funciona en \`app-srv.service\`?

---

1. Para que la única forma de alcanzar la aplicación desde fuera del servidor sea a través de nginx; si escuchara en todas las interfaces, un firewall mal configurado o una regla olvidada podría exponerla directamente a internet sin la capa de proxy, TLS y control que nginx aporta.
2. \`Restart=on-failure\` combinado con \`RestartSec\` (margen entre reintentos) y \`StartLimitBurst\`/\`StartLimitIntervalSec\` (número máximo de reinicios permitidos en una ventana de tiempo); superado el límite, systemd deja el servicio en \`failed\` en vez de reintentar indefinidamente.
3. Obteniendo el PID del proceso activo, matándolo con \`kill -9\`, esperando el tiempo de \`RestartSec\` y confirmando con \`systemctl status\` que el servicio volvió a \`active (running)\` con un PID nuevo, además de revisar \`journalctl -u app-srv.service\` para ver el evento de reinicio registrado.
`

export default content
