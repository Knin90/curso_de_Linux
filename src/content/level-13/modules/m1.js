const content = `
## Módulo 1 — cron: sintaxis, tipos y entorno de ejecución

### 🎯 Objetivos de aprendizaje

* Leer y escribir expresiones cron correctamente.
* Entender los tipos de cron disponibles en un sistema Linux.
* Comprender por qué el entorno de cron es diferente al del shell interactivo.
* Usar atajos de cron como @daily, @reboot y @hourly.

### ❓ El problema real

Configuras un cron job que funciona perfecto cuando lo ejecutas manualmente, pero falla silenciosamente cuando cron lo corre. El motivo casi siempre es el mismo: el entorno de cron no tiene tu \`$PATH\`, tus variables de entorno ni tu directorio de trabajo. Entender esto desde el principio evita el bug más común con cron.

### 📖 Anatomía de una expresión cron

\`\`\`text
┌───────────── minuto       (0-59)
│ ┌─────────── hora         (0-23)
│ │ ┌───────── día del mes  (1-31)
│ │ │ ┌─────── mes          (1-12 o jan-dec)
│ │ │ │ ┌───── día de semana (0-7, donde 0 y 7 = domingo)
│ │ │ │ │
* * * * *  comando a ejecutar
\`\`\`

**Operadores:**

\`\`\`text
*     cualquier valor
,     lista de valores        5,10,15 = en minutos 5, 10 y 15
-     rango                   1-5     = de lunes a viernes
/     paso (step)             */15    = cada 15 unidades
\`\`\`

### 📖 Ejemplos de expresiones cron

\`\`\`text
# Cada minuto
* * * * *

# Cada hora (en el minuto 0)
0 * * * *

# Todos los días a las 2:30 AM
30 2 * * *

# Cada lunes a las 9:00 AM
0 9 * * 1

# Lunes a viernes a las 8:00 AM
0 8 * * 1-5

# Primer día de cada mes a medianoche
0 0 1 * *

# Cada 15 minutos
*/15 * * * *

# Cada 6 horas
0 */6 * * *

# Múltiples momentos: a las 8:00, 12:00 y 18:00
0 8,12,18 * * *

# Cada 30 minutos entre las 9:00 y las 17:00, de lunes a viernes
*/30 9-17 * * 1-5
\`\`\`

### 📖 Atajos de cron

\`\`\`text
@reboot     al arrancar el sistema (una vez)
@yearly     una vez al año      →  0 0 1 1 *
@annually   igual que @yearly
@monthly    una vez al mes      →  0 0 1 * *
@weekly     una vez a la semana →  0 0 * * 0
@daily      una vez al día      →  0 0 * * *
@midnight   igual que @daily
@hourly     cada hora           →  0 * * * *
\`\`\`

\`\`\`bash
# Ejemplos con atajos
@reboot /usr/local/bin/start-tunnel.sh
@daily  /usr/local/bin/backup.sh
@monthly certbot renew
\`\`\`

### 📖 El entorno de cron

Este es el bug más frecuente. El entorno de cron es mínimo:

\`\`\`text
SHELL=/bin/sh
PATH=/usr/bin:/bin
LOGNAME=usuario
HOME=/home/usuario
\`\`\`

**Lo que NO tiene:**
- Tu \`~/.bashrc\` o \`~/.profile\` no se cargan
- No tiene \`/usr/local/bin\`, \`/snap/bin\` ni rutas personalizadas
- No tiene variables de entorno de tu sesión

**Consecuencias:**

\`\`\`bash
# MAL: node, python3, ruby pueden no estar en /usr/bin o /bin
* * * * * node /app/script.js           # puede fallar: "node: not found"
* * * * * python3 /app/script.py        # puede fallar

# BIEN: siempre usar rutas absolutas
* * * * * /usr/local/bin/node /app/script.js
* * * * * /usr/bin/python3 /app/script.py

# MEJOR: definir PATH en el crontab
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
* * * * * node /app/script.js           # ahora funciona
\`\`\`

### 📖 Tipos de cron en un sistema Linux

\`\`\`text
TIPO                   UBICACIÓN              QUIÉN LO GESTIONA
──────────────────────────────────────────────────────────────────
crontab de usuario     /var/spool/cron/       cada usuario con crontab -e
crontab de root        /var/spool/cron/root   root con crontab -e
/etc/crontab           /etc/crontab           root (tiene campo "usuario")
cron.d                 /etc/cron.d/           paquetes y admins del sistema
cron.hourly            /etc/cron.hourly/      scripts ejecutados cada hora
cron.daily             /etc/cron.daily/       scripts ejecutados cada día
cron.weekly            /etc/cron.weekly/      scripts ejecutados cada semana
cron.monthly           /etc/cron.monthly/     scripts ejecutados cada mes
\`\`\`

La diferencia entre \`/etc/crontab\` y crontabs de usuario: \`/etc/crontab\` tiene un campo extra para el usuario:

\`\`\`bash
# /etc/crontab — tiene campo USUARIO
# m  h  dom  mon  dow  usuario   comando
  30 2  *    *    *    root      /usr/local/bin/backup.sh
  0  9  *    *    1-5  www-data  /usr/local/bin/report.sh

# crontab de usuario — NO tiene campo usuario (ya se sabe quién es)
  30 2  *    *    *    /usr/local/bin/backup.sh
\`\`\`

### 📋 Lo que debes recordar

* Los 5 campos son: minuto, hora, día-mes, mes, día-semana.
* \`*/15\` = cada 15 unidades; \`1-5\` = rango; \`1,3,5\` = lista.
* El PATH de cron es mínimo: siempre usar rutas absolutas o definir PATH en el crontab.
* \`@reboot\` ejecuta al arrancar — útil para iniciar túneles o servicios no gestionados por systemd.

### 🧪 Autoevaluación

1. ¿Qué expresión cron ejecuta algo a las 3:45 AM todos los días de lunes a viernes?
2. ¿Por qué \`* * * * * python3 mi-script.py\` puede fallar en cron aunque funcione en terminal?
3. ¿Cuál es la diferencia entre un crontab de usuario y \`/etc/crontab\`?

---

1. \`45 3 * * 1-5\` — minuto 45, hora 3, cualquier día del mes, cualquier mes, días 1-5 (lunes a viernes).
2. Porque el \`PATH\` de cron es solo \`/usr/bin:/bin\`. Si \`python3\` está en \`/usr/local/bin\` o \`/snap/bin\`, cron no lo encuentra y el job falla con "command not found" sin ningún output visible. Solución: usar \`/usr/bin/python3\` o definir \`PATH\` al inicio del crontab.
3. \`/etc/crontab\` tiene un campo adicional para el usuario bajo el cual corre el comando. Los crontabs de usuario (gestionados con \`crontab -e\`) no tienen ese campo — el comando siempre corre bajo el usuario dueño del crontab.
`

export default content
