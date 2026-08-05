const content = `
## Módulo 4 — Anatomía de un archivo .service

### 🎯 Objetivos de aprendizaje

* Leer e interpretar un archivo \`.service\` real.
* Crear una unidad personalizada para una aplicación propia.
* Entender las directivas más importantes de cada sección.

### 📖 Estructura de un archivo .service

Los archivos \`.service\` tienen tres secciones obligatorias:

\`\`\`ini
[Unit]
Description=Descripción legible del servicio
After=network.target       # Arrancar después de que la red esté disponible
Requires=postgresql.service  # Si postgresql falla, este también falla
Wants=redis.service          # Intenta arrancar redis, pero no falla si redis falla

[Service]
Type=simple                # Tipo de proceso (ver tabla abajo)
User=www-data              # Usuario con el que corre el proceso
Group=www-data
WorkingDirectory=/opt/miapp
ExecStart=/usr/bin/node /opt/miapp/server.js   # Comando de arranque
ExecReload=/bin/kill -HUP $MAINPID             # Comando de reload
ExecStop=/bin/kill -TERM $MAINPID              # Comando de parada limpia
Restart=always             # Reiniciar automáticamente si el proceso muere
RestartSec=3               # Esperar 3 segundos antes de reintentar
Environment=NODE_ENV=production
EnvironmentFile=/etc/miapp/config              # Variables desde archivo

[Install]
WantedBy=multi-user.target   # En qué target se activa con enable
\`\`\`

### 📖 Tipos de servicio (Type=)

| Type | Comportamiento |
| --- | --- |
| \`simple\` | El proceso principal es el ExecStart. Default. |
| \`forking\` | El proceso hace fork() y el padre termina (daemons clásicos como sshd) |
| \`oneshot\` | Ejecuta el comando y termina (scripts de inicio, tareas únicas) |
| \`notify\` | El servicio avisa a systemd cuando está listo (más preciso que simple) |
| \`dbus\` | El servicio anuncia su disponibilidad por D-Bus |

### 📖 Directivas de reinicio automático

\`\`\`ini
Restart=always       # Reiniciar siempre (crashed, killed, timeout)
Restart=on-failure   # Reiniciar solo si termina con código de error != 0
Restart=no           # No reiniciar nunca (default)
RestartSec=5         # Segundos de espera antes de reintentar
StartLimitIntervalSec=60  # Ventana de tiempo para contar intentos
StartLimitBurst=3         # Máximo de intentos en la ventana → marca como failed
\`\`\`

### 💻 Ver el .service de un servicio existente

\`\`\`bash
# Ver el archivo completo de una unidad
systemctl cat nginx
systemctl cat sshd

# Ver todas las propiedades efectivas (incluyendo defaults heredados)
systemctl show nginx

# Ver una propiedad específica
systemctl show nginx -p Restart
systemctl show nginx -p MainPID
\`\`\`

### 💻 Crear una unidad personalizada

Ejemplo: una aplicación Node.js en \`/opt/miapp\`:

\`\`\`bash
# 1. Crear el archivo de unidad
sudo tee /etc/systemd/system/miapp.service <<'EOF'
[Unit]
Description=Mi Aplicación Node.js
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/miapp
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 2. Recargar systemd para que conozca la nueva unidad
sudo systemctl daemon-reload

# 3. Habilitar y arrancar
sudo systemctl enable --now miapp

# 4. Verificar
sudo systemctl status miapp
\`\`\`

> ⚠️ Después de crear o modificar cualquier archivo \`.service\`, **siempre** ejecutar \`systemctl daemon-reload\`. Si no, systemd seguirá usando la versión anterior en caché.

### 💻 Editar una unidad existente de forma segura

\`\`\`bash
# Editar con validación automática (método recomendado)
sudo systemctl edit nginx --full

# Crear un "override" que extiende la unidad sin modificarla
# (se guarda en /etc/systemd/system/nginx.service.d/override.conf)
sudo systemctl edit nginx

# Ver todos los archivos que componen la unidad final
systemctl cat nginx
\`\`\`

### 📋 Lo que debes recordar

* Tres secciones: \`[Unit]\` (metadata/dependencias), \`[Service]\` (comportamiento), \`[Install]\` (targets).
* Después de cualquier cambio en archivos \`.service\`: \`systemctl daemon-reload\`.
* \`Restart=on-failure\` es la opción más común en producción — no reinicia si el admin detiene el servicio intencionalmente.
* \`systemctl edit\` crea overrides sin modificar el archivo original del paquete.

### 🧪 Autoevaluación rápida

1. ¿Para qué sirve \`After=network.target\` en la sección \`[Unit]\`?
2. Modificaste \`/etc/systemd/system/miapp.service\`. ¿Cuál es el siguiente comando obligatorio?
3. ¿Cuál es la diferencia entre \`Restart=always\` y \`Restart=on-failure\`?

---

1. Le dice a systemd que espere a que la red esté disponible antes de arrancar este servicio. Sin esto, el servicio podría intentar conectarse a la red antes de que esté lista.
2. \`sudo systemctl daemon-reload\` — para que systemd re-lea el archivo modificado.
3. \`always\` reinicia el servicio sin importar cómo terminó (incluso si el admin hizo \`systemctl stop\`). \`on-failure\` reinicia solo cuando el proceso termina con un código de error distinto de 0.
`
export default content
