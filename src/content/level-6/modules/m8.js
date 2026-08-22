const content = `
## Módulo 8 — Proyecto real: monitoreo de salud con systemd para una flota de servidores

### 🎯 Objetivos de aprendizaje

* Diseñar un servicio systemd personalizado junto con un timer que reemplace un cron tradicional.
* Aplicar el ciclo completo: crear unidad, recargar systemd, habilitar, verificar y auditar logs.
* Diagnosticar y recuperar un servicio crítico (\`chronyd\`) tras un fallo de configuración introducido en producción.

### ❓ El problema real

El equipo de operaciones de una startup necesita saber, en cualquier momento, si un servidor está sano: uptime, uso de disco, memoria libre y carga del sistema. Hasta ahora dependían de que alguien entrara por SSH y mirara a mano. Te piden automatizar esa verificación cada 5 minutos, que sobreviva a reinicios, que quede registrada en el journal para poder auditar el historial, y que la hora del servidor esté siempre sincronizada (los timestamps de los reportes deben ser confiables). Además, un compañero reporta que en uno de los servidores \`chronyd\` "se rompió" después de un cambio de configuración manual — debes diagnosticarlo y repararlo con el mismo flujo que usarías en producción.

### 📖 Estructura del proyecto

\`\`\`
monitoreo-salud/
├── health-check.sh
├── health-check.service
├── health-check.timer
└── runbook-diagnostico.md
\`\`\`

### 📖 health-check.sh — script de verificación

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "=== Health Check \$(date) ==="
echo "Uptime: \$(uptime -p)"
echo "Disk usage: \$(df -h / | tail -1 | awk '{print \$5}')"
echo "Memory free: \$(free -h | awk '/^Mem:/{print \$4}')"
echo "Load average: \$(cat /proc/loadavg | awk '{print \$1, \$2, \$3}')"
\`\`\`

Se instala en \`/usr/local/bin/health-check.sh\` con permisos de ejecución.

### 📖 health-check.service — unidad oneshot

\`\`\`ini
[Unit]
Description=System Health Check
After=network.target chronyd.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/health-check.sh
StandardOutput=journal
StandardError=journal
\`\`\`

Nota el \`Type=oneshot\`: el proceso corre, termina, y systemd considera el servicio "exitoso" según el código de salida — no queda residente.

### 📖 health-check.timer — disparador periódico

\`\`\`ini
[Unit]
Description=Ejecutar health-check.sh cada 5 minutos

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Unit=health-check.service

[Install]
WantedBy=timers.target
\`\`\`

\`OnBootSec\` da un margen tras el arranque; \`OnUnitActiveSec\` mide desde la última ejecución, no desde un reloj fijo — así el servidor nunca queda sin verificación aunque el timer se reinicie.

### 📖 Secuencia de ejecución

1. Instalar y habilitar la sincronización de tiempo, requisito de todo el resto:

\`\`\`bash
sudo apt update && sudo apt install -y chrony
sudo systemctl enable --now chronyd
sudo systemctl status chronyd
\`\`\`

Salida esperada: \`Active: active (running)\` y \`Loaded: ... enabled\`.

2. Crear el script y darle permisos de ejecución:

\`\`\`bash
sudo cp health-check.sh /usr/local/bin/health-check.sh
sudo chmod +x /usr/local/bin/health-check.sh
\`\`\`

3. Instalar las unidades \`.service\` y \`.timer\` en \`/etc/systemd/system/\`:

\`\`\`bash
sudo cp health-check.service /etc/systemd/system/
sudo cp health-check.timer /etc/systemd/system/
sudo systemctl daemon-reload
\`\`\`

4. Habilitar y arrancar el timer (no el service — el timer lo dispara):

\`\`\`bash
sudo systemctl enable --now health-check.timer
systemctl list-timers health-check.timer
\`\`\`

Salida esperada:

\`\`\`
NEXT                        LEFT     LAST  PASSED  UNIT                 ACTIVATES
Mon 2024-01-15 10:05:00 UTC 4min left n/a  n/a     health-check.timer   health-check.service
\`\`\`

5. Forzar una ejecución manual y revisar el resultado en el journal:

\`\`\`bash
sudo systemctl start health-check.service
journalctl -u health-check.service -n 20
\`\`\`

6. Simular el incidente reportado: introducir un error en \`chrony.conf\`:

\`\`\`bash
sudo cp /etc/chrony.conf /etc/chrony.conf.bak
sudo sed -i 's/^server/invalid_directive/' /etc/chrony.conf
sudo systemctl restart chronyd
\`\`\`

7. Aplicar el árbol de diagnóstico: estado, logs, validador de configuración y línea exacta del error:

\`\`\`bash
sudo systemctl status chronyd
journalctl -u chronyd -n 20 --no-pager
chronyd -Q
grep "invalid_directive" /etc/chrony.conf
\`\`\`

8. Restaurar la configuración y recuperar el servicio:

\`\`\`bash
sudo cp /etc/chrony.conf.bak /etc/chrony.conf
sudo systemctl reset-failed chronyd
sudo systemctl start chronyd
sudo systemctl status chronyd
\`\`\`

9. Verificación final de todo el sistema:

\`\`\`bash
systemctl is-active chronyd health-check.timer
systemctl is-enabled chronyd health-check.timer
journalctl -u health-check.service --since today
\`\`\`

### 📋 Lo que debes recordar

* Un \`.timer\` + un \`.service Type=oneshot\` es el reemplazo moderno de cron: se integra con el journal, respeta dependencias (\`After=\`) y se audita con \`systemctl list-timers\`.
* Tras crear o modificar cualquier archivo de unidad, \`systemctl daemon-reload\` es obligatorio antes de que el cambio surta efecto.
* Se habilita y arranca el \`.timer\`, no el \`.service\` directamente, salvo para pruebas manuales puntuales.
* \`journalctl -u <unidad>\` centraliza toda la evidencia: stdout, stderr y eventos de systemd en una sola línea de tiempo.
* Ante un servicio que falla tras un cambio de configuración: \`systemctl status\` → \`journalctl -n\` → validador de configuración propio del programa → revisar la línea exacta → restaurar backup → \`reset-failed\` → arrancar.
* \`systemctl reset-failed\` limpia el contador de fallos; sin él, systemd puede negarse a reiniciar un servicio marcado como fallido repetidamente.

### 🧪 Autoevaluación

1. ¿Por qué se usa \`OnUnitActiveSec\` en lugar de una hora fija tipo \`OnCalendar\` para este caso de uso?
2. Después de copiar \`health-check.service\` a \`/etc/systemd/system/\`, ejecutas \`systemctl start health-check\` y no pasa nada visible. ¿Qué paso faltó y por qué es obligatorio?
3. \`chronyd\` no arranca tras un cambio manual en su configuración. ¿Cuál es el primer comando que ejecutas y qué información específica buscas en su salida?

---

1. \`OnUnitActiveSec\` mide el intervalo desde la última vez que el servicio terminó de ejecutarse, garantizando siempre 5 minutos de separación real entre corridas, sin importar si el timer se recargó o el sistema estuvo suspendido. \`OnCalendar\` dispara en horas de reloj fijas, lo cual es útil para tareas tipo "todos los días a las 3am", pero no para un monitoreo de intervalo constante.
2. Faltó \`systemctl daemon-reload\`. systemd solo lee las unidades al arrancar o cuando se le pide explícitamente que recargue su configuración; copiar un archivo nuevo a \`/etc/systemd/system/\` no lo registra automáticamente, por lo que \`systemctl start\` falla silenciosamente o reporta que la unidad no existe.
3. El primer comando es \`systemctl status chronyd\`. Se busca la línea \`Active:\` (para confirmar que falló, no solo que está detenido) y la referencia a las últimas líneas de log que el propio \`status\` muestra, que suelen apuntar directamente a la directiva de configuración inválida antes de tener que ir a \`journalctl\`.
`

export default content
