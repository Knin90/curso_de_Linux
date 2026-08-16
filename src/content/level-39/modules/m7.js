const content = `
## Módulo 7 — Evaluación de automatización: Bash, cron y systemd timers

### 🎯 Objetivos de aprendizaje

* Escribir y depurar scripts Bash robustos, no solo funcionales en el caso feliz.
* Corregir errores comunes de programación en Bash (quoting, control de errores, condiciones de carrera).
* Elegir correctamente entre cron y systemd timers según el requisito operacional.
* Diseñar automatizaciones seguras: idempotentes, con logging y manejo de fallos.

### ❓ El problema real

Un script que "funciona en mi máquina" y un script listo para producción no son lo mismo. Esta evaluación entrega scripts reales con defectos —algunos sutiles— y exige encontrarlos y corregirlos, además de diseñar automatizaciones nuevas con criterio de robustez: qué pasa si el script se ejecuta dos veces a la vez, qué pasa si un comando intermedio falla, qué pasa si una variable está vacía.

### 📖 Ejercicio 1 — Encontrar y corregir los defectos

El siguiente script pretende hacer backup de una carpeta y borrar backups de más de 7 días, ejecutándose por cron cada noche:

\`\`\`bash
#!/bin/bash
BACKUP_DIR=/backups
SRC_DIR=$1

tar -czf $BACKUP_DIR/backup-$(date +%Y%m%d).tar.gz $SRC_DIR
find $BACKUP_DIR -mtime +7 -exec rm {} \\;
echo "Backup completado"
\`\`\`

*Tarea:* identificar al menos 4 defectos reales de este script y corregirlos.

**Defectos a encontrar:**
1. Sin \`set -euo pipefail\`: si \`tar\` falla, el script sigue y borra backups viejos igual, dejando cero backups válidos.
2. \`$SRC_DIR\` sin comillas: si la ruta tiene espacios, se rompe o se interpreta como múltiples argumentos.
3. \`find $BACKUP_DIR -mtime +7 -exec rm\` sin filtrar por nombre/patrón de backup: si hay otros archivos en esa carpeta, los borra también, y no restringe a archivos regulares (podría intentar borrar subdirectorios sin \`-type f\`).
4. Sin validación de que \`$SRC_DIR\` fue provisto ni de que existe, antes de intentar el \`tar\`.
5. Sin logging a archivo (solo \`echo\`, que en cron sin redirección se pierde o va a mail del sistema sin control).

### 📖 Ejercicio 2 — Versión corregida esperada

*Tarea:* reescribir el script del Ejercicio 1 aplicando las correcciones. Una solución de referencia:

\`\`\`bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR=/backups
SRC_DIR="\${1:?Uso: backup.sh <directorio_origen>}"
LOG_FILE=/var/log/backup.log

if [[ ! -d "$SRC_DIR" ]]; then
  echo "$(date -Iseconds) ERROR: $SRC_DIR no existe" >> "$LOG_FILE"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d)
ARCHIVE="$BACKUP_DIR/backup-$TIMESTAMP.tar.gz"

if tar -czf "$ARCHIVE" "$SRC_DIR"; then
  echo "$(date -Iseconds) OK: backup creado en $ARCHIVE" >> "$LOG_FILE"
else
  echo "$(date -Iseconds) ERROR: falló tar sobre $SRC_DIR" >> "$LOG_FILE"
  exit 1
fi

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'backup-*.tar.gz' -mtime +7 -delete
echo "$(date -Iseconds) OK: limpieza de backups antiguos completada" >> "$LOG_FILE"
\`\`\`

### 📖 Ejercicio 3 — Cron vs. systemd timers

**Escenario.** Se necesita programar una tarea que corra cada 15 minutos, pero si el servidor estuvo apagado en el horario programado, debe ejecutarse apenas vuelva a estar disponible (catch-up).

*Tarea:* explicar por qué cron no soporta esto de forma nativa y cómo un systemd timer con \`Persistent=true\` sí lo resuelve.

\`\`\`ini
# /etc/systemd/system/tarea.timer
[Unit]
Description=Ejecuta tarea cada 15 minutos con catch-up

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
\`\`\`

### 📖 Ejercicio 4 — Condición de carrera en automatización

**Escenario.** Un cron job que sincroniza archivos tarda a veces más de 5 minutos, pero está programado cada 5 minutos, generando ejecuciones superpuestas que corrompen el destino.

*Tarea:* diseñar la solución con un lock file (\`flock\`) que evite ejecuciones concurrentes.

\`\`\`bash
*/5 * * * * /usr/bin/flock -n /tmp/sync.lock /opt/scripts/sync.sh
\`\`\`

*Tarea adicional:* explicar qué hace \`-n\` (non-blocking: si ya hay una ejecución en curso, la nueva simplemente no arranca en vez de esperar).

### 📖 Ejercicio 5 — Diseño de automatización desde cero

**Escenario.** Se pide automatizar la rotación de una clave API que expira cada 90 días, notificando al equipo por email si la rotación falla, sin exponer la clave en logs.

*Tarea:* listar los requisitos no funcionales que debe cumplir el script (idempotencia, manejo de fallo con reintento o alerta, no loguear secretos, permisos restrictivos sobre el archivo que contiene la clave nueva) además de la lógica funcional.

### 📋 Rúbrica de evaluación — Automatización

| Criterio | Insuficiente | Aceptable | Sólido |
|---|---|---|---|
| Manejo de errores | Sin \`set -e\`/verificación de comandos críticos | Verifica algunos comandos pero no todos los críticos | \`set -euo pipefail\` + verificación explícita de pasos críticos |
| Quoting y variables | Variables sin comillas de forma sistemática | Comillas en la mayoría de los casos | Comillas consistentes y validación de variables antes de usarlas |
| Elección cron vs. systemd timer | Usa cron para todo sin evaluar requisitos | Elige correctamente con guía | Elige de forma autónoma justificando por catch-up, dependencias o logging |
| Seguridad en automatización | Loguea secretos o dejan permisos abiertos en archivos sensibles | Evita loguear secretos pero permisos no verificados | Evita loguear secretos y aplica permisos restrictivos explícitamente |

**Criterio de aprobación:** mínimo "Aceptable" en los 4 criterios. Loguear secretos en texto plano es eliminatorio para el bloque.

### 📋 Lo que debes recordar

* \`set -euo pipefail\` es el mínimo indispensable en cualquier script de producción.
* Las variables que contienen rutas o entradas externas siempre van entre comillas dobles.
* \`flock\` es la herramienta estándar para evitar ejecuciones superpuestas de cron jobs.
* systemd timers con \`Persistent=true\` resuelven el catch-up que cron no soporta nativamente.
* Nunca loguear secretos (API keys, contraseñas) en texto plano, ni siquiera en logs de debug temporales.

### 🧪 Autoevaluación

1. ¿Qué hace \`set -euo pipefail\` y por qué su ausencia permitió que el script del Ejercicio 1 borrara backups válidos tras un fallo silencioso?
2. ¿Por qué \`find $BACKUP_DIR -mtime +7 -exec rm {} \\;\` sin \`-type f\` ni filtro de nombre es peligroso?
3. ¿Qué problema resuelve \`flock\` en un cron job y qué hace específicamente la opción \`-n\`?

---

1. \`set -e\` detiene el script ante cualquier comando que falle (código de salida distinto de 0); \`-u\` trata variables no definidas como error; \`-o pipefail\` propaga el fallo de cualquier comando dentro de un pipe, no solo el último. Sin esto, si \`tar\` fallaba (por ejemplo, disco lleno o permisos), el script seguía ejecutando el \`find ... rm\`, borrando los backups antiguos y dejando el sistema sin ningún backup válido reciente ni antiguo.
2. Porque sin \`-type f\` puede intentar operar sobre directorios u otros tipos de archivo dentro de \`$BACKUP_DIR\`, y sin un filtro de nombre (por ejemplo \`-name 'backup-*.tar.gz'\`) borra cualquier archivo de más de 7 días en esa carpeta, incluyendo archivos que no son backups generados por este script — un efecto secundario destructivo no intencionado.
3. \`flock\` evita que dos instancias del mismo cron job corran simultáneamente cuando una ejecución tarda más que el intervalo programado, previniendo condiciones de carrera (por ejemplo, dos procesos de sincronización escribiendo al mismo destino a la vez). La opción \`-n\` (non-blocking) hace que si el lock ya está tomado, el nuevo proceso termine inmediatamente en vez de quedar esperando indefinidamente a que se libere.
`

export default content
