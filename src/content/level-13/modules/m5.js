const content = `
## Módulo 5 — systemd timers: la alternativa moderna a cron

### 🎯 Objetivos de aprendizaje

* Entender la arquitectura de systemd timers: .timer + .service.
* Crear timers para tareas recurrentes y de calendario.
* Comparar ventajas de timers vs cron para distintos casos.
* Monitorear y depurar timers con journalctl y systemctl.

### ❓ El problema real

Un cron job falla y no sabes cuándo fue la última vez que tuvo éxito. No hay forma fácil de ver el historial de ejecuciones o el output del job sin revisar múltiples archivos de log. systemd timers resuelven esto: están integrados con journald, tienen historial de ejecuciones, exit codes registrados y se pueden inspeccionar con las mismas herramientas que los servicios.

### 📖 Arquitectura: timer + service

Un systemd timer siempre tiene dos archivos:

\`\`\`text
mi-tarea.timer    ← controla CUÁNDO ejecutar
mi-tarea.service  ← controla QUÉ ejecutar (y cómo)

El timer activa el service según el calendario definido.
\`\`\`

\`\`\`bash
# Ubicaciones
/etc/systemd/system/     ← units del sistema (root)
~/.config/systemd/user/  ← units de usuario (no requiere root)
\`\`\`

### 📖 Crear un timer simple

\`\`\`bash
sudo nano /etc/systemd/system/backup.service
\`\`\`

\`\`\`ini
[Unit]
Description=Backup diario de la base de datos
After=network.target postgresql.service

[Service]
Type=oneshot
User=backup
ExecStart=/usr/local/bin/backup-db.sh
StandardOutput=journal
StandardError=journal

# No es necesario [Install] — el timer lo activa
\`\`\`

\`\`\`bash
sudo nano /etc/systemd/system/backup.timer
\`\`\`

\`\`\`ini
[Unit]
Description=Timer para backup diario
Requires=backup.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
Unit=backup.service

[Install]
WantedBy=timers.target
\`\`\`

\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl enable --now backup.timer

# Verificar
systemctl status backup.timer
systemctl list-timers
\`\`\`

### 📖 Sintaxis OnCalendar

\`\`\`text
FORMATO: DíaSemana Año-Mes-Día Hora:Minuto:Segundo

Ejemplos:
  daily                     → todos los días a medianoche (00:00:00)
  hourly                    → cada hora
  weekly                    → lunes a las 00:00:00
  monthly                   → primer día del mes a las 00:00:00
  annually                  → 1 de enero a las 00:00:00

  *-*-* 02:00:00            → todos los días a las 2 AM
  Mon *-*-* 09:00:00        → lunes a las 9 AM
  Mon..Fri *-*-* 08:00:00   → lunes a viernes a las 8 AM
  *-*-1 00:00:00            → primer día de cada mes
  *-*-* *:00:00             → cada hora (en punto)
  *-*-* *:0/15:00           → cada 15 minutos
  2024-01-15 14:00:00       → fecha y hora específica (una vez)
\`\`\`

\`\`\`bash
# Verificar que la expresión es válida
systemd-analyze calendar "*-*-* 02:00:00"
systemd-analyze calendar "Mon..Fri *-*-* 08:00:00"
# Muestra: próxima ejecución y tiempo restante
\`\`\`

### 📖 Opciones avanzadas del timer

\`\`\`ini
[Timer]
# Ejecutar X tiempo después de que arrancó el sistema
OnBootSec=15min

# Ejecutar X tiempo después de que este timer se activó por última vez
OnUnitActiveSec=1h

# Ejecutar a un momento específico de calendario
OnCalendar=*-*-* 02:00:00

# Si el sistema estuvo apagado y se perdió una ejecución, correr inmediatamente
Persistent=true

# Añadir un delay aleatorio de hasta N segundos para distribuir carga
RandomizedDelaySec=300

# Ejecutar X tiempo después del arranque, luego cada Y
OnBootSec=5min
OnUnitActiveSec=1h
\`\`\`

### 📖 Timers de usuario (sin root)

\`\`\`bash
# Crear timer como usuario normal
mkdir -p ~/.config/systemd/user/

# ~/.config/systemd/user/mi-script.service
cat > ~/.config/systemd/user/mi-script.service << 'EOF'
[Unit]
Description=Mi script personal

[Service]
Type=oneshot
ExecStart=%h/scripts/mi-script.sh
EOF

# ~/.config/systemd/user/mi-script.timer
cat > ~/.config/systemd/user/mi-script.timer << 'EOF'
[Unit]
Description=Ejecutar mi-script cada hora

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now mi-script.timer
systemctl --user list-timers
\`\`\`

### 📖 Monitoreo y depuración

\`\`\`bash
# Ver todos los timers del sistema
systemctl list-timers --all

# Output:
# NEXT                         LEFT     LAST                         PASSED  UNIT
# Mon 2024-01-15 02:00:00 UTC  11h left Sun 2024-01-14 02:00:01 UTC  13h ago backup.timer

# Estado del timer
systemctl status backup.timer

# Estado de la última ejecución del service
systemctl status backup.service

# Ver el output de la última ejecución (integrado con journald)
journalctl -u backup.service -n 50
journalctl -u backup.service --since "yesterday"

# Ver todas las ejecuciones históricas
journalctl -u backup.service

# Ejecutar manualmente (activar el service directamente)
sudo systemctl start backup.service
# El timer no se afecta — solo ejecuta el service
\`\`\`

### 📖 cron vs systemd timers: comparación

\`\`\`text
CARACTERÍSTICA            CRON              SYSTEMD TIMERS
────────────────────────────────────────────────────────────────
Historial de ejecución    solo con log       journald integrado
Output de jobs            manual (>> log)    journald automático
Dependencias              no                 After=, Requires=
Ejecutar como usuario     campo USUARIO      User= en .service
Granularidad mínima       1 minuto           1 segundo
Onshot vs persistente     siempre onshot     Type=oneshot o simple
Timers relativos al boot  @reboot solo       OnBootSec=
Captura de errores        manual             journald + ExecCondition
Complejidad               simple             más archivos

ELIGE cron si:            scripts simples, equipo acostumbrado
ELIGE timers si:          necesitas logs integrados, dependencias,
                          o ya usas systemd para todo
\`\`\`

### 📋 Lo que debes recordar

* Todo timer requiere un .service correspondiente — el timer solo dice cuándo; el service dice qué.
* \`Persistent=true\` es el equivalente de anacron: ejecuta la tarea perdida al próximo arranque.
* \`systemctl list-timers\` muestra cuándo fue la última ejecución y cuándo es la próxima.
* \`journalctl -u mi-tarea.service\` da el historial completo sin necesidad de archivos de log separados.

### 🧪 Autoevaluación

1. ¿Cuál es la ventaja principal de systemd timers sobre cron para depuración?
2. ¿Para qué sirve \`Persistent=true\` en un timer?
3. ¿Cómo ejecutas manualmente el servicio asociado a un timer sin esperar al próximo disparo?

---

1. El output y los exit codes quedan en journald automáticamente, sin necesidad de redirigir a archivos de log manualmente. \`journalctl -u mi-servicio.service\` muestra el historial completo de ejecuciones, cuándo corrió, qué imprimió y si tuvo éxito o falló — todo en un solo lugar.
2. Funciona como anacron: si el sistema estuvo apagado cuando debería haber corrido el timer, \`Persistent=true\` hace que se ejecute inmediatamente al próximo arranque en lugar de esperar al siguiente intervalo.
3. \`sudo systemctl start mi-tarea.service\` — activa el service directamente. El timer no se modifica y seguirá disparando en su horario normal.
`

export default content
