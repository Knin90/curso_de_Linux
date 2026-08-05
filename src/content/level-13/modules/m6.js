const content = `
## Módulo 6 — at y batch: tareas únicas programadas

### 🎯 Objetivos de aprendizaje

* Usar \`at\` para programar tareas únicas a una hora específica.
* Entender \`batch\` para ejecutar tareas cuando el sistema tenga baja carga.
* Gestionar la cola de trabajos con \`atq\` y \`atrm\`.
* Identificar cuándo usar at en lugar de cron o timers.

### ❓ El problema real

Necesitas reiniciar nginx en exactamente 30 minutos, después de aplicar un cambio de configuración durante una ventana de mantenimiento. O necesitas ejecutar un script de migración de base de datos esta noche a las 23:00, una sola vez. Crear un cron job para algo que se ejecuta una vez no tiene sentido — \`at\` es la herramienta exacta para esto.

### 📖 at: programar tareas únicas

\`\`\`bash
# Instalar si no está disponible
sudo apt install at

# Verificar que el daemon está corriendo
systemctl status atd
\`\`\`

**Formas de usar at:**

\`\`\`bash
# Forma interactiva: escribir comandos, terminar con Ctrl+D
at 23:00
> /usr/local/bin/migration.sh
> echo "Migración completada" | mail -s "Deploy" ops@empresa.com
> <Ctrl+D>
# job 1 at Mon Jan 15 23:00:00 2024

# Desde stdin con here-doc
at 23:00 << 'EOF'
/usr/local/bin/migration.sh >> /var/log/migration.log 2>&1
EOF

# Desde un archivo de comandos
at 23:00 -f /tmp/migration-commands.sh

# Usando pipe
echo "/usr/local/bin/migration.sh" | at 23:00
\`\`\`

### 📖 Especificación de tiempo en at

\`\`\`text
HORA ESPECÍFICA HOY
  at 23:00
  at 23:00 today
  at 11pm

FECHA Y HORA ESPECÍFICA
  at 23:00 Jan 15
  at 23:00 15.01.2024
  at 11pm January 15

TIEMPO RELATIVO
  at now + 30 minutes
  at now + 2 hours
  at now + 1 day
  at now + 1 week
  at midnight         → próxima medianoche
  at noon             → próximo mediodía
  at teatime          → a las 4pm (en serio)

EJEMPLOS COMBINADOS
  at 2am tomorrow
  at 9:00 next monday
  at noon + 3 days
\`\`\`

\`\`\`bash
# Verificar cuándo se ejecutará antes de confirmar
at -l    # equivalente a atq
\`\`\`

### 📖 Gestionar la cola de at

\`\`\`bash
# Ver todos los trabajos pendientes
atq
# Output:
# 1    Mon Jan 15 23:00:00 2024 a root
# 2    Tue Jan 16 09:00:00 2024 a deploy

# Formato: número_job  fecha_hora  cola  usuario
# Cola "a" = at normal, "b" = batch

# Ver los comandos de un trabajo específico
at -c 1    # muestra el job número 1 (incluye todo el entorno)

# Eliminar un trabajo
atrm 1     # eliminar job número 1
atrm 1 2   # eliminar varios jobs

# Alternativa
at -d 1    # equivalente a atrm 1
\`\`\`

### 📖 batch: ejecución cuando hay baja carga

\`\`\`batch\` es como \`at\` pero en lugar de una hora específica, se ejecuta cuando el load average cae por debajo de 1.5 (configurable):

\`\`\`bash
# Programar tarea para cuando el sistema esté poco cargado
batch << 'EOF'
/usr/local/bin/procesar-imagenes-grandes.sh >> /var/log/imagenes.log 2>&1
EOF

# batch con la misma sintaxis que at para la entrada
echo "nice -n 19 /usr/local/bin/tarea-pesada.sh" | batch
\`\`\`

\`\`\`text
CUÁNDO USAR batch:
  - Procesar grandes volúmenes de datos que no tienen urgencia temporal
  - Generar reportes pesados
  - Comprimir backups grandes
  - Cualquier tarea CPU-intensiva que no importa cuándo exactamente corre,
    solo que corra cuando el sistema esté libre
\`\`\`

### 📖 Control de acceso a at

\`\`\`text
Mismo mecanismo que cron:
/etc/at.allow  → solo estos usuarios pueden usar at
/etc/at.deny   → todos menos estos usuarios pueden usar at
\`\`\`

### 📖 El entorno de at

Al igual que cron, \`at\` captura el entorno al momento de crear el job:

\`\`\`bash
# at captura las variables de entorno actuales cuando se programa
# Esto es DIFERENTE a cron (cron tiene entorno mínimo fijo)

# Verificar qué variables capturó un job
at -c <job_number> | head -30
# Verás una lista de export statements del entorno actual
\`\`\`

Esta es una ventaja de at sobre cron: si programas un job desde tu sesión de terminal, hereda tu \`$PATH\` y variables de entorno.

### 📖 Casos de uso reales

\`\`\`bash
# 1. Reinicio programado de servicio después de deploy
echo "systemctl restart nginx" | at now + 5 minutes

# 2. Ventana de mantenimiento: apagar servicio y levantarlo en 2 horas
at now + 0 minutes << 'EOF'
systemctl stop mi-app
EOF
at now + 2 hours << 'EOF'
systemctl start mi-app
EOF

# 3. Enviar recordatorio
echo "echo 'Revisar backups de esta semana' | mail -s 'Recordatorio' ops@empresa.com" | at 9am monday

# 4. Limpieza programada única
echo "rm -rf /tmp/migration-data-20240115/" | at 6am tomorrow

# 5. Script de rollback programado (por si el deploy falla)
at now + 30 minutes << 'EOF'
# Verificar si la app está respondiendo; si no, rollback
if ! curl -sf http://localhost/health; then
    /usr/local/bin/rollback.sh >> /var/log/rollback.log 2>&1
fi
EOF
\`\`\`

### 📋 Lo que debes recordar

* \`at\` es para tareas únicas; \`cron\` es para tareas recurrentes. No usar cron para algo que se ejecuta una sola vez.
* \`atq\` lista la cola pendiente; \`atrm <num>\` cancela un job.
* \`batch\` ejecuta cuando el load average < 1.5 — ideal para tareas pesadas sin hora crítica.
* A diferencia de cron, \`at\` hereda el entorno del shell al momento de programarlo.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia fundamental entre \`at\` y \`cron\`?
2. Programas un job con \`at 23:00\` pero necesitas cancelarlo. ¿Cómo lo haces?
3. ¿Cuándo preferirías \`batch\` sobre \`at now + 5 minutes\` para ejecutar una tarea?

---

1. \`at\` ejecuta una tarea **una sola vez** en un momento específico y la elimina de la cola. \`cron\` es para tareas **recurrentes** que se repiten según una expresión de calendario. Usar cron para algo que se ejecuta una vez requiere acordarse de borrarlo después; \`at\` lo gestiona automáticamente.
2. Primero \`atq\` para ver el número del job en la cola, luego \`atrm <número>\` para cancelarlo.
3. Cuando la tarea es CPU o I/O intensiva y no importa la hora exacta — solo que corra cuando el sistema esté libre. \`at now + 5 minutes\` la ejecuta en 5 minutos aunque el sistema esté al 100% de carga. \`batch\` espera a que el load average baje por debajo de 1.5, evitando agravar un pico de carga.
`

export default content
