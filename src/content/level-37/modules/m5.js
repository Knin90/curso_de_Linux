const content = `
## Módulo 5 — Fallos de servicio: leer journalctl y systemctl status como profesional

### 🎯 Objetivos de aprendizaje

* Interpretar la salida completa de \`systemctl status\` incluyendo estados y códigos de salida.
* Filtrar y correlacionar logs con \`journalctl\` de forma eficiente en un incidente real.
* Entender los exit codes más comunes de systemd y qué indican sobre la falla.
* Diagnosticar dependencias fallidas entre unidades systemd.
* Detectar y corregir unit files mal escritos que causan reinicios en bucle.

### ❓ El problema real

Un servicio crítico aparece como "failed" en el dashboard de monitoreo. Un administrador sin experiencia ejecuta \`systemctl restart\` repetidamente, cada vez viendo el mismo fallo, sin leer realmente la información que systemd ya le está dando. \`systemctl status\` y \`journalctl\` contienen casi siempre la causa exacta de la falla en las primeras líneas: un puerto ocupado, un archivo de configuración con sintaxis inválida, un permiso denegado. Saber leer esta salida de forma sistemática reduce el tiempo de diagnóstico de minutos a segundos.

### 📖 systemctl status: leyendo cada campo

\`\`\`bash
systemctl status nginx
# ● nginx.service - A high performance web server
#      Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled)
#      Active: failed (Result: exit-code) since Thu 2026-08-14 10:15:32 UTC; 2min ago
#     Process: 4821 ExecStart=/usr/sbin/nginx -g daemon on; (code=exited, status=1/FAILURE)
#    Main PID: 4821 (code=exited, status=1/FAILURE)
\`\`\`

\`\`\`text
CAMPO       QUÉ INFORMA
─────────────────────────────────────────────────────────────────────────────
Loaded       Si la unidad existe, su ruta, y si está "enabled" (arranca al boot)
Active       Estado actual: active (running), failed, inactive (dead), activating
Result       La razón del último fallo: exit-code, signal, timeout, core-dump
Process      El comando exacto ejecutado y su código de salida
Main PID     El PID principal y su código de salida final
\`\`\`

El símbolo al inicio (\`●\`) cambia de color/significado: verde = activo y saludable, rojo = failed, blanco = inactivo. En terminal sin color, \`Active: failed\` es la señal inequívoca.

### 📖 Exit codes comunes y qué indican

\`\`\`text
CÓDIGO DE SALIDA         SIGNIFICADO TÍPICO
─────────────────────────────────────────────────────────────────────────────
0                         Salida exitosa (para servicios oneshot; no aplica a
                          daemons que deben permanecer corriendo)
1                         Error genérico de aplicación; revisar journalctl
2                         Uso incorrecto del comando (flag/argumento inválido)
126                       El binario existe pero no es ejecutable (permisos)
127                       Comando/binario no encontrado (ExecStart apunta mal)
137 (128+9)               El proceso recibió SIGKILL (9) — a menudo OOM killer
143 (128+15)              El proceso recibió SIGTERM (15) — apagado normal
\`\`\`

\`\`\`bash
# Los códigos 128+N siempre indican terminación por señal N
# 137 = 128 + 9  → SIGKILL, sospechar OOM killer
journalctl -k | grep -i "killed process" | grep <nombre_proceso>
\`\`\`

### 📖 journalctl: filtros esenciales para un incidente

\`\`\`bash
# Logs de una unidad específica, más recientes primero
journalctl -u nginx -n 50 --no-pager

# Solo errores y niveles superiores (crit, alert, emerg), desde hace 1 hora
journalctl -u nginx --since "1 hour ago" --priority=err

# Seguimiento en tiempo real (como tail -f)
journalctl -u nginx -f

# Logs de un rango de tiempo específico (útil para correlacionar con una alerta)
journalctl --since "2026-08-14 10:00:00" --until "2026-08-14 10:30:00"

# Logs del arranque actual únicamente (útil tras un reinicio inesperado)
journalctl -b

# Logs del arranque ANTERIOR (para diagnosticar por qué reinició)
journalctl -b -1

# Correlacionar TODOS los servicios en una ventana de tiempo (no solo uno)
journalctl --since "10:14:00" --until "10:16:00"
\`\`\`

\`\`\`bash
# Niveles de prioridad de journalctl, de más a menos crítico
# 0 emerg  1 alert  2 crit  3 err  4 warning  5 notice  6 info  7 debug
journalctl -p err..emerg    # solo err, crit, alert, emerg (rango)
\`\`\`

### 📖 Dependencias fallidas entre unidades

Un servicio puede fallar no por su propia configuración, sino porque una unidad de la que depende (\`Requires=\`, \`After=\`) no arrancó correctamente.

\`\`\`bash
# Ver el árbol de dependencias de una unidad
systemctl list-dependencies nginx

# Ver TODAS las unidades fallidas del sistema (no solo la que se está investigando)
systemctl --failed

# Ver qué requiere y qué depende de la unidad en cuestión
systemctl show nginx -p Requires -p After -p Wants
\`\`\`

\`\`\`text
ESCENARIO TÍPICO
─────────────────────────────────────────────────────────────────────────────
myapp.service tiene "Requires=postgresql.service" y "After=postgresql.service".
Si postgresql.service falla al arrancar, myapp.service también falla,
aunque su propia configuración esté perfecta. systemctl status myapp
mostrará "failed" pero la causa real está en postgresql.
\`\`\`

### 📖 Unit files rotos y reinicios en bucle (restart loop)

\`\`\`bash
# Ver la definición completa de la unidad, incluyendo overrides locales
systemctl cat nginx

# Validar sintaxis de un unit file antes de recargar
systemd-analyze verify /etc/systemd/system/myapp.service

# Después de editar un unit file manualmente, SIEMPRE recargar el daemon
systemctl daemon-reload
\`\`\`

Un problema clásico es un servicio con \`Restart=always\` sin \`RestartSec\` adecuado ni \`StartLimitBurst\` configurado: si el proceso falla instantáneamente en cada intento, systemd lo reinicia en bucle consumiendo CPU y llenando el journal de entradas repetidas.

\`\`\`ini
# /etc/systemd/system/myapp.service — configuración defensiva recomendada
[Service]
ExecStart=/usr/bin/myapp
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3
# Si falla 3 veces en 60 segundos, systemd deja de reintentar
# y marca la unidad como "failed" en vez de reintentar indefinidamente
\`\`\`

\`\`\`bash
# Confirmar si una unidad entró en "start-limit-hit"
systemctl status myapp
# Active: failed (Result: start-limit-hit)

# Resetear el contador de fallos para permitir un nuevo intento manual
systemctl reset-failed myapp
\`\`\`

### 📋 Lo que debes recordar

* \`systemctl status\` ya contiene la causa del fallo en el campo \`Result\` y el código de salida del proceso: leerlo antes de reiniciar.
* Los códigos de salida 128+N indican terminación por señal N; 137 sugiere SIGKILL, a menudo del OOM killer.
* \`journalctl -u <unidad> --since --priority=err\` es el filtro más útil para aislar la causa de un fallo específico.
* Un servicio puede fallar por una dependencia (\`Requires=\`/\`After=\`) que no arrancó, no por su propia configuración.
* \`systemctl --failed\` muestra todas las unidades fallidas del sistema, útil para detectar fallos en cascada.
* \`Restart=on-failure\` con \`StartLimitBurst\` evita reinicios en bucle infinito; sin ello, un fallo inmediato puede saturar el sistema.

### 🧪 Autoevaluación

1. \`systemctl status\` muestra "status=137/FAILURE" para un proceso. ¿Qué se debe investigar primero?
2. Un servicio \`myapp.service\` falla y su configuración parece correcta. ¿Qué otro lugar se debe revisar antes de asumir un bug en la app?
3. ¿Qué combinación de directivas en un unit file evita que un servicio entre en un bucle de reinicios infinito?

---

1. El código 137 = 128 + 9 (SIGKILL). Se debe investigar si el OOM killer terminó el proceso, revisando \`journalctl -k | grep -i "killed process"\` o \`dmesg -T\`, ya que SIGKILL no puede ser capturado por la aplicación y frecuentemente indica que el kernel lo forzó por falta de memoria.
2. Se deben revisar las dependencias de la unidad (\`systemctl list-dependencies myapp\` y \`systemctl show myapp -p Requires -p After\`), ya que el servicio puede depender de otra unidad (como una base de datos) que falló al arrancar, causando el fallo en cascada sin que haya ningún problema en la configuración propia de \`myapp.service\`.
3. \`Restart=on-failure\` combinado con \`StartLimitIntervalSec\` y \`StartLimitBurst\`: si el servicio falla más veces que \`StartLimitBurst\` dentro de \`StartLimitIntervalSec\`, systemd detiene los reintentos automáticos y marca la unidad como \`failed\` con resultado \`start-limit-hit\`, en vez de reintentar indefinidamente.
`

export default content
