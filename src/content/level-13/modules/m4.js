const content = `
## Módulo 4 — anacron: tareas para sistemas que no corren 24/7

### 🎯 Objetivos de aprendizaje

* Entender por qué cron falla en sistemas que no están encendidos 24/7.
* Configurar anacron para garantizar la ejecución de tareas perdidas.
* Entender la relación entre cron y anacron en distribuciones modernas.
* Decidir cuándo usar cron vs anacron.

### ❓ El problema real

Tu laptop de desarrollo tiene un script de backup configurado en cron para las 3:00 AM. Pero nunca está encendida a las 3:00 AM — siempre está apagada o en suspensión. El backup nunca se ejecuta. cron no tiene memoria: si el sistema no está corriendo en el momento exacto, la tarea se pierde. anacron resuelve esto.

### 📖 La limitación de cron

\`\`\`text
cron:
  ✓ Exactitud temporal: ejecuta exactamente a la hora especificada
  ✓ Frecuencia arbitraria: puede ejecutar cada minuto
  ✗ Sin memoria: si el sistema está apagado, la tarea se pierde
  ✗ Depende de que el sistema corra 24/7

anacron:
  ✓ Con memoria: registra cuándo ejecutó cada tarea por última vez
  ✓ Ejecuta al arrancar si una tarea fue perdida
  ✗ Granularidad mínima: días (no horas ni minutos)
  ✗ Solo para tareas periódicas (diarias, semanales, mensuales)
\`\`\`

### 📖 Cómo funciona anacron

\`\`\`text
Al arrancar el sistema:

1. anacron lee /etc/anacrontab
2. Para cada tarea, comprueba el archivo timestamp en /var/spool/anacron/
3. Calcula si han pasado N días desde la última ejecución
4. Si sí: ejecuta la tarea (con un delay aleatorio para distribuir carga)
5. Actualiza el timestamp
\`\`\`

\`\`\`bash
# Ver los timestamps de última ejecución
ls -la /var/spool/anacron/
cat /var/spool/anacron/cron.daily
# 20240115  ← fecha de última ejecución (YYYYMMDD)
\`\`\`

### 📖 Configuración: /etc/anacrontab

\`\`\`text
# /etc/anacrontab

# Variables de entorno
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=root

# Formato:
# periodo  delay  identificador  comando
# periodo  = días entre ejecuciones
# delay    = minutos a esperar tras el arranque antes de ejecutar
# identificador = nombre para el archivo de timestamp

# Cada día, 5 minutos después del arranque
1    5    cron.daily    run-parts --report /etc/cron.daily

# Cada semana, 10 minutos después del arranque
7    10   cron.weekly   run-parts --report /etc/cron.weekly

# Cada mes (30 días), 15 minutos después del arranque
@monthly 15  cron.monthly  run-parts --report /etc/cron.monthly
\`\`\`

**El delay** es importante: si todos los cron jobs se lanzaran simultáneamente al arranque, podrían saturar el sistema. Los delays escalonan la carga.

### 📖 Añadir tareas propias a anacron

\`\`\`text
# /etc/anacrontab — agregar al final

# Backup cada 2 días, con delay de 20 minutos
2    20   mi-backup    /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Reporte semanal de seguridad
7    30   sec-report   /usr/local/bin/security-report.sh

# Limpieza mensual
30   45   limpieza-mes /usr/local/bin/cleanup.sh
\`\`\`

\`\`\`bash
# Probar anacron manualmente (sin modificar timestamps)
anacron -n -d    # -n = ejecutar ahora sin delay, -d = debug/verbose

# Forzar ejecución de todas las tareas (ignora timestamps)
anacron -f -n -d

# Ver qué ejecutaría sin ejecutar
anacron -T    # test de sintaxis del anacrontab
\`\`\`

### 📖 La relación cron + anacron en distribuciones modernas

En Ubuntu/Debian, \`/etc/cron.daily\`, \`/etc/cron.weekly\` y \`/etc/cron.monthly\` son ejecutados por **ambos**:

\`\`\`text
/etc/crontab:
  25 6  * * *    root    test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.daily; }

Esta línea dice:
  "A las 6:25 AM, si anacron NO está instalado, ejecutar cron.daily directamente"

Si anacron SÍ está instalado (el caso normal):
  - cron.daily no se ejecuta desde /etc/crontab
  - anacron se encarga de ejecutarlo cuando corresponda
  - garantizando que se ejecute incluso si el sistema estuvo apagado
\`\`\`

\`\`\`bash
# Verificar si anacron está instalado
which anacron
dpkg -l anacron    # Debian/Ubuntu
rpm -q cronie-anacron   # RHEL/Fedora

# Ver el estado del servicio
systemctl status anacron 2>/dev/null || echo "anacron no usa systemd service"
# anacron se ejecuta al arrancar via /etc/init.d o cron, no como servicio persistente
\`\`\`

### 📖 Cuándo usar cron vs anacron

\`\`\`text
USA cron cuando:
  ✓ El servidor corre 24/7 (VPS, servidor dedicado)
  ✓ Necesitas granularidad menor a un día (cada hora, cada 5 minutos)
  ✓ La hora exacta importa (backup a las 2:00 AM cuando hay menos carga)
  ✓ Tareas de monitoreo en tiempo real

USA anacron cuando:
  ✓ Sistema que se apaga (laptop, workstation, servidor con ventanas de mantenimiento)
  ✓ Granularidad de días es suficiente
  ✓ Quieres garantía de ejecución aunque el sistema estuviera apagado
  ✓ Los jobs ya están en /etc/cron.daily (anacron los gestiona automáticamente)

COMBINAR los dos:
  - cron para tareas de tiempo crítico y alta frecuencia
  - anacron para tareas de mantenimiento que solo necesitan correr "una vez al día"
\`\`\`

### 📋 Lo que debes recordar

* anacron registra la última ejecución en \`/var/spool/anacron/\` — si ese archivo muestra una fecha vieja, la tarea se ejecutará en el próximo arranque.
* El delay en \`/etc/anacrontab\` evita que todas las tareas se ejecuten simultáneamente al arrancar.
* En Ubuntu/Debian, si anacron está instalado, es quien ejecuta \`/etc/cron.daily\` — cron solo lo hace si anacron no está disponible.
* \`anacron -n -d\` es la forma de probar anacron manualmente sin esperar al próximo arranque.

### 🧪 Autoevaluación

1. Tu servidor se apaga cada noche a las 22:00 y arranca a las 8:00. El backup en \`/etc/cron.daily\` debería correr a las 6:25 AM. ¿Se ejecuta? ¿Por qué?
2. ¿Qué archivo de timestamp revisa anacron para decidir si ejecutar una tarea?
3. ¿Para qué sirve el campo "delay" en \`/etc/anacrontab\`?

---

1. Sí se ejecuta, gracias a anacron. El servidor no estaba encendido a las 6:25 AM. Cuando arranca a las 8:00 AM, anacron revisa el timestamp de cron.daily. Si han pasado más de 1 día desde la última ejecución, lanza el script (con el delay configurado). Si no hubiera anacron, la tarea se perdería hasta el siguiente día.
2. \`/var/spool/anacron/<identificador>\` — por ejemplo \`/var/spool/anacron/cron.daily\`. Contiene la fecha de la última ejecución en formato YYYYMMDD.
3. El delay (en minutos) retrasa el inicio de la tarea después del arranque del sistema. Sin delay, todas las tareas de anacron arrancarían simultáneamente, generando picos de CPU/disco. Los delays escalonan la carga: cron.daily arranca a los 5 min, cron.weekly a los 10 min, cron.monthly a los 15 min.
`

export default content
