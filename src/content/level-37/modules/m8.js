const content = `
## Módulo 8 — Laboratorio integrador: incidente multicausa simulado

### 🎯 Objetivos de aprendizaje

* Aplicar el framework completo de troubleshooting del Módulo 1 a un incidente real con causas encadenadas.
* Practicar el aislamiento por capas cuando un síntoma tiene múltiples causas contribuyentes simultáneas.
* Reconocer cómo un problema resuelto a medias puede enmascarar un segundo problema subyacente.
* Redactar un post-mortem completo a partir de un incidente resuelto paso a paso.

### ❓ El escenario

Son las 03:14 AM. Una alerta despierta al administrador de guardia: **"api.produccion.local: 5xx errors > 50%"**. Los usuarios reportan que la aplicación "no carga" de forma intermitente. El administrador de guardia no tiene más contexto que esto. A continuación se reconstruye el diagnóstico completo, paso a paso, aplicando exactamente el framework del Módulo 1.

Este incidente combina **tres causas encadenadas**: un log sin rotar que agotó el disco, lo cual provocó que un servicio de base de datos fallara al escribir, lo cual a su vez saturó el pool de conexiones de la aplicación. Resolver solo la primera causa no habría sido suficiente.

### 📖 Paso 1 y 2 — Recolectar información e identificar síntomas (sin tocar nada aún)

\`\`\`bash
# Confirmar el síntoma reportado, sin reiniciar nada todavía
curl -I http://localhost/health
# HTTP/1.1 502 Bad Gateway

# ¿Qué cambió recientemente? Revisar despliegues y cron jobs de las últimas horas
journalctl --since "4 hours ago" --priority=err | tail -50

# Estado general del sistema, no destructivo
uptime
# load average: 3.10, 2.95, 2.80   ← no es excesivamente alto, descarta saturación de CPU pura
\`\`\`

Síntoma confirmado: la API responde 502 de forma intermitente. Un 502 significa que el proxy (nginx) está activo, pero el backend detrás no responde correctamente — esto ya apunta la investigación hacia la capa de aplicación/backend, no hacia la red externa.

### 📖 Paso 3 y 4 — Hipótesis y verificación, capa por capa

**Hipótesis 1: ¿nginx está caído?**

\`\`\`bash
systemctl status nginx
# Active: active (running)   ← descartada: nginx está vivo
\`\`\`

**Hipótesis 2: ¿el backend de la aplicación está caído?**

\`\`\`bash
systemctl status myapp
# ● myapp.service - Application Backend
#      Active: active (running) since ...  ← está "activo" pero...

journalctl -u myapp -n 30 --no-pager
# Aug 14 03:10:12 myapp[2891]: ERROR: could not connect to database:
#   FATAL: could not write to file "pg_wal/000000010000...": No space left on device
\`\`\`

Se encuentra la primera pista concreta: **"No space left on device"**. El backend está corriendo, pero no puede escribir en la base de datos porque el disco está lleno.

### 📖 Paso 5 — Aislar la causa raíz del disco lleno

\`\`\`bash
df -h
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   50G     0  100% /

# Localizar qué consume el espacio
du -h --max-depth=1 /var | sort -rh | head -5
# 38G   /var/log
du -h --max-depth=1 /var/log | sort -rh | head -5
# 36G   /var/log/myapp
ls -lhS /var/log/myapp | head -5
# -rw-r--r-- 1 myapp myapp 36G Aug 14 03:12 debug.log
\`\`\`

Causa raíz de nivel 1 encontrada: un archivo \`debug.log\` de 36GB. Antes de borrarlo, se verifica si algún proceso lo tiene abierto (Módulo 4) para evitar el problema de "espacio no liberado":

\`\`\`bash
lsof /var/log/myapp/debug.log
# COMMAND   PID  USER   FD   TYPE  NAME
# myapp    2891  myapp   3w   REG  /var/log/myapp/debug.log
\`\`\`

El proceso \`myapp\` (PID 2891) tiene el archivo abierto activamente. Truncarlo (no borrarlo) es la corrección correcta para liberar espacio de inmediato sin perder el file descriptor:

\`\`\`bash
: > /var/log/myapp/debug.log
df -h /
# Use%: 71%   ← espacio recuperado inmediatamente
\`\`\`

**¿Por qué llegó a 36GB?** Revisando la configuración de logging de la aplicación y \`/etc/logrotate.d/myapp\`:

\`\`\`bash
cat /etc/logrotate.d/myapp
# archivo no existe → nunca se configuró logrotate para esta aplicación
\`\`\`

Causa raíz de nivel 2 confirmada: la aplicación nunca tuvo logrotate configurado, y un despliegue reciente (visible en \`journalctl --since\`) activó accidentalmente el nivel de log \`DEBUG\` en vez de \`INFO\`, generando volumen masivo de logs sin control.

### 📖 Paso 5 (continuación) — ¿Se resolvió todo el incidente?

Con espacio recuperado, se reinicia el servicio de base de datos para que retome escrituras normales:

\`\`\`bash
systemctl restart postgresql
systemctl status postgresql
# Active: active (running)   ← recuperado

curl -I http://localhost/health
# HTTP/1.1 502 Bad Gateway   ← el síntoma original SIGUE presente
\`\`\`

El disco y la base de datos están sanos, pero la API sigue fallando: hay una **segunda causa contribuyente** encadenada. Se continúa el aislamiento en la capa de aplicación:

\`\`\`bash
journalctl -u myapp -n 20 --no-pager
# ERROR: connection pool exhausted, timeout waiting for available connection

ss -tnp | grep :5432 | wc -l
# 200   ← el pool de conexiones a PostgreSQL está saturado al límite configurado
\`\`\`

Durante el periodo en que la base de datos no podía escribir (mientras el disco estaba lleno), cientos de requests quedaron colgados esperando una conexión que nunca se liberaba, agotando el pool completo de la aplicación. Aunque la causa original (disco lleno) ya se corrigió, sus efectos secundarios (conexiones colgadas) seguían saturando el sistema.

\`\`\`bash
# Reiniciar el backend limpia el pool de conexiones colgadas de forma controlada
systemctl restart myapp
systemctl status myapp
# Active: active (running)

curl -I http://localhost/health
# HTTP/1.1 200 OK   ← síntoma resuelto
\`\`\`

### 📖 Paso 6, 7 y 8 — Corrección definitiva, verificación y documentación

**Correcciones aplicadas (mínimas, sobre la causa raíz, no solo el síntoma):**

\`\`\`bash
# 1. Configurar logrotate para la aplicación (evita que vuelva a ocurrir)
cat > /etc/logrotate.d/myapp << 'EOF'
/var/log/myapp/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    maxsize 500M
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
EOF

# 2. Revertir el nivel de log accidental de DEBUG a INFO en la configuración
#    de despliegue (corrección en el repositorio de configuración, no local)

# 3. Configurar un timeout en el pool de conexiones para que no se cuelgue
#    indefinidamente ante fallos de base de datos (defensa contra el efecto
#    en cascada observado)
\`\`\`

**Verificación final:**

\`\`\`bash
df -h /                          # espacio recuperado y estable
systemctl status postgresql myapp nginx   # las tres capas activas y sanas
curl -I http://localhost/health  # 200 OK sostenido, no intermitente
watch -n 5 'curl -s -o /dev/null -w "%{http_code}\\n" http://localhost/health'
# monitoreo continuo por varios minutos para confirmar que no reaparece
\`\`\`

**Post-mortem (resumen):**

\`\`\`text
LÍNEA DE TIEMPO
03:10  Nivel de log DEBUG activado accidentalmente en despliegue previo
03:12  debug.log alcanza 36GB, disco raíz llega a 100%
03:13  PostgreSQL no puede escribir WAL, empieza a fallar
03:14  Pool de conexiones de la app se satura, alerta 5xx dispara
03:20  Diagnóstico inicia: se confirma 502, se descarta nginx
03:24  Se identifica disco lleno como causa inmediata vía journalctl
03:28  Se trunca debug.log (verificando FD abierto primero), espacio recuperado
03:30  Se reinicia PostgreSQL, recupera escritura
03:31  Health check SIGUE fallando: pool de conexiones de la app saturado
03:33  Se reinicia el backend de la app, pool se limpia
03:34  Health check estable en 200 OK

CAUSA RAÍZ
Cadena de tres causas: nivel de log DEBUG mal configurado en un despliegue →
ausencia de logrotate para la aplicación → disco lleno → fallo de escritura
en PostgreSQL → saturación del pool de conexiones de la aplicación.

ACCIÓN PREVENTIVA
* logrotate configurado con límite de tamaño (maxsize 500M) para myapp.
* Alerta de monitoreo agregada para df -h > 85% (antes solo alertaba sobre 5xx).
* Timeout agregado al pool de conexiones para evitar saturación en cascada.
* Revisión del proceso de despliegue para evitar cambios accidentales de nivel de log.
\`\`\`

### 📋 Lo que debes recordar

* Un incidente real rara vez tiene una sola causa: resolver la primera causa encontrada no garantiza que el síntoma desaparezca.
* Verificar la resolución (paso 7 del framework) es lo que revela causas encadenadas: sin volver a probar el síntoma original, la segunda causa habría pasado desapercibida.
* Truncar en vez de borrar un log activo (verificando primero con \`lsof\`) evita perder el file descriptor y complicar aún más el incidente.
* Los efectos secundarios de una causa raíz (como un pool de conexiones saturado) pueden sobrevivir a la corrección de la causa original y requerir su propia corrección.
* Un post-mortem completo documenta la cadena completa de causas, no solo la primera encontrada, y define acciones preventivas específicas para cada eslabón.
* La detección temprana (alertar sobre disco al 85%, no solo sobre 5xx) es una acción preventiva tan importante como la corrección técnica misma.

### 🧪 Autoevaluación

1. Después de liberar espacio en disco y reiniciar PostgreSQL, el health check seguía devolviendo 502. ¿Qué principio del framework de troubleshooting explica por qué era necesario seguir investigando en vez de dar el incidente por cerrado?
2. ¿Por qué se truncó el archivo \`debug.log\` en vez de borrarlo directamente con \`rm\`?
3. En el post-mortem, se agregó una alerta de disco al 85% que antes no existía. ¿Qué principio del Módulo 1 respalda esta acción?

---

1. El paso 7 del framework, "verificar la resolución": no basta con aplicar una corrección, hay que confirmar que el síntoma original desapareció. En este caso, la verificación reveló que persistía un segundo efecto (pool de conexiones saturado), producto de la primera causa pero no resuelto por su corrección, lo cual habría quedado sin detectar si se hubiera asumido que el incidente estaba cerrado tras la primera corrección.
2. Porque el archivo estaba siendo escrito activamente por el proceso \`myapp\` (confirmado con \`lsof\`); si se hubiera borrado con \`rm\`, el espacio no se habría liberado hasta cerrar o reiniciar el proceso que mantenía el descriptor abierto, como se explica en el Módulo 4. Truncar el contenido con \`: >\` libera el espacio de inmediato sin afectar el descriptor de archivo activo.
3. El paso 8, "documentar", específicamente la parte de definir cómo detectar el problema antes la próxima vez. El incidente se detectó solo cuando ya afectaba a los usuarios (alerta de 5xx); agregar una alerta de disco al 85% permite detectar la causa raíz antes de que se propague en cascada hasta convertirse en un impacto visible para el usuario.
`

export default content
