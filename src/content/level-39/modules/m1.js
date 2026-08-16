const content = `
## Módulo 1 — Evaluación de fundamentos I: filesystem, shell, procesos, usuarios y permisos

### 🎯 Objetivos de aprendizaje

* Demostrar dominio operativo del filesystem jerárquico (FHS), navegación y manipulación de rutas.
* Resolver problemas reales de permisos, propietarios y bits especiales (SUID/SGID/sticky).
* Diagnosticar y controlar procesos con las herramientas estándar (ps, top, kill, jobs).
* Gestionar usuarios y grupos aplicando el principio de menor privilegio.
* Demostrar fluidez con shell scripting básico: pipes, redirecciones y expansión de variables.

### ❓ El problema real

Esta es una evaluación, no una lección. Cada bloque plantea un escenario con síntomas reales —una salida de comando, un mensaje de error, una estructura de permisos— y exige un diagnóstico y una acción concreta, igual que en un puesto de trabajo real. No se pregunta "¿qué hace \`chmod\`?"; se pregunta "dado este \`ls -l\`, ¿qué comando restaura el acceso correcto sin abrir de más?".

### 📖 Bloque A — Filesystem y shell (5 escenarios)

**Escenario A1.** Un script falla con \`bash: ./deploy.sh: Permission denied\` aunque el archivo existe y el usuario es el propietario.

\`\`\`bash
$ ls -l deploy.sh
-rw-r--r-- 1 ana ana 340 ago 10 09:12 deploy.sh
\`\`\`

*Tarea:* dar el comando exacto para solucionarlo sin otorgar más permisos de los necesarios.

**Escenario A2.** Se necesita encontrar todos los archivos \`.log\` mayores a 100 MB en \`/var/log\` modificados en los últimos 7 días, y comprimirlos.

*Tarea:* escribir el pipeline completo (find + xargs o -exec).

**Escenario A3.** Un usuario reporta que \`cd /mnt/backup\` funciona pero \`ls\` dentro de esa carpeta devuelve "Permission denied" en algunos subdirectorios.

*Tarea:* explicar la diferencia entre el permiso de ejecución (x) en directorios vs. archivos, y qué combinación de permisos produce ese síntoma exacto.

**Escenario A4.** Dado el siguiente comando, predecir la salida exacta incluyendo el código de salida:

\`\`\`bash
$ echo "hola" | grep "chau" ; echo "salida: $?"
\`\`\`

**Escenario A5.** Un pipeline de tres comandos falla silenciosamente en el segundo paso pero el script continúa como si nada hubiera pasado.

*Tarea:* explicar por qué ocurre esto con \`set -e\` normal y qué opción de bash lo corrige (\`set -o pipefail\`).

### 📖 Bloque B — Procesos (4 escenarios)

**Escenario B1.** Un proceso \`python3 worker.py\` quedó en estado zombie (\`Z\`) según \`ps aux\`.

\`\`\`text
USER   PID  %CPU %MEM   VSZ   RSS TTY  STAT START   TIME COMMAND
root  4821   0.0  0.0     0     0 ?    Z    10:03   0:00 [worker.py] <defunct>
\`\`\`

*Tarea:* explicar por qué \`kill -9 4821\` no elimina el zombie y cuál es la causa raíz real a corregir.

**Escenario B2.** Un proceso en primer plano está bloqueando la terminal y se necesita seguir trabajando sin matarlo.

*Tarea:* dar la secuencia de teclas y comandos (Ctrl+Z, bg, disown si aplica) para liberarlo sin perder el trabajo.

**Escenario B3.** \`top\` muestra un proceso al 100% de un núcleo de forma sostenida. Se necesita bajarle prioridad sin detenerlo.

*Tarea:* dar el comando exacto con el valor de nice apropiado y explicar el rango válido (-20 a 19).

**Escenario B4.** Un servicio hijo no muere al matar el proceso padre con \`kill\`.

*Tarea:* explicar cómo identificar y terminar todo el árbol de procesos (\`pkill -P\`, \`kill -- -PGID\`).

### 📖 Bloque C — Usuarios, grupos y permisos avanzados (4 escenarios)

**Escenario C1.** Un directorio compartido \`/srv/proyectos\` necesita que todos los archivos nuevos hereden el grupo \`devs\` automáticamente, sin que cada usuario tenga que hacer \`chgrp\` manual.

*Tarea:* dar el comando que resuelve esto (bit SGID en el directorio).

**Escenario C2.** Se detecta un binario con permisos \`-rwsr-xr-x\` propiedad de root en \`/usr/local/bin\`.

\`\`\`bash
$ ls -l /usr/local/bin/custom-tool
-rwsr-xr-x 1 root root 15234 jun  3 2025 /usr/local/bin/custom-tool
\`\`\`

*Tarea:* explicar el riesgo de seguridad, cómo se detecta de forma proactiva en todo el sistema y cuándo está justificado mantenerlo.

**Escenario C3.** Un usuario nuevo necesita permisos de administración limitados solo para reiniciar el servicio \`nginx\`, sin acceso root completo.

*Tarea:* diseñar la línea de \`/etc/sudoers\` (vía \`visudo\`) que lo permite de forma mínima.

**Escenario C4.** Un directorio compartido usado por múltiples usuarios para archivos temporales debe evitar que un usuario borre archivos de otro.

*Tarea:* identificar el bit especial correcto (sticky bit) y el comando para aplicarlo.

### 📋 Rúbrica de evaluación — Bloque de fundamentos I

| Criterio | Insuficiente | Aceptable | Sólido |
|---|---|---|---|
| Diagnóstico de permisos | Aplica \`chmod 777\` u otras soluciones excesivas | Identifica el permiso correcto pero con comando subóptimo | Aplica el permiso mínimo necesario y explica el porqué |
| Gestión de procesos | Usa \`kill -9\` como primera opción sin diagnóstico | Diferencia señales pero no explica causa raíz | Diagnostica causa raíz (ej. proceso padre no espera al hijo) antes de actuar |
| Uso de pipes y redirecciones | Comandos no funcionan o requieren corrección | Pipeline funcional pero verboso | Pipeline idiomático, usa \`-exec\`/\`xargs\` apropiadamente |
| Seguridad en permisos especiales | No reconoce SUID/SGID/sticky como riesgo | Identifica el bit pero no evalúa el riesgo | Evalúa riesgo, propone principio de menor privilegio |

**Criterio de aprobación:** mínimo "Aceptable" en los 4 criterios, con al menos 2 en "Sólido".

### 📋 Lo que debes recordar

* Un escenario de evaluación profesional se resuelve con diagnóstico primero, comando después — nunca al revés.
* Los procesos zombie no se "matan": se corrige el proceso padre que no hace \`wait()\`.
* El principio de menor privilegio aplica tanto a \`chmod\` como a \`sudoers\`.
* SGID en directorios y sticky bit resuelven problemas de colaboración distintos: herencia de grupo vs. protección de borrado.

### 🧪 Autoevaluación

1. En el escenario A1, ¿cuál es el comando exacto y por qué no se debe usar \`chmod 777\`?
2. ¿Por qué \`kill -9\` no elimina un proceso zombie?
3. ¿Qué diferencia hay entre el bit SGID en un directorio y el sticky bit en cuanto al problema que resuelven?

---

1. \`chmod u+x deploy.sh\` (o \`chmod 744\`). \`chmod 777\` otorga escritura y ejecución a todos los usuarios del sistema, exponiendo el script a modificación por cualquier cuenta local — viola el principio de menor privilegio y es una falla de seguridad, no una solución.
2. Un zombie ya terminó su ejecución; solo queda su entrada en la tabla de procesos esperando que el padre lea su código de salida con \`wait()\`. \`kill -9\` no tiene efecto porque el proceso ya no está corriendo. La solución real es corregir o reiniciar el proceso padre para que llame a \`wait()\`, o si el padre es \`init\`/\`systemd\`, este limpia automáticamente al re-parentar al zombie.
3. El SGID en un directorio hace que todo archivo o subdirectorio creado dentro herede el grupo del directorio padre (resuelve colaboración de grupo). El sticky bit en un directorio impide que un usuario borre o renombre archivos de otro usuario aunque tenga permiso de escritura en el directorio (resuelve protección en espacios compartidos como \`/tmp\`). Son problemas distintos y pueden combinarse.
`

export default content
