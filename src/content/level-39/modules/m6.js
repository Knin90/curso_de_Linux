const content = `
## Módulo 6 — Evaluación de troubleshooting II: fallos de arranque, disco lleno y rendimiento

### 🎯 Objetivos de aprendizaje

* Diagnosticar y recuperar un sistema que no arranca, incluyendo escenarios de GRUB e initramfs.
* Resolver incidentes de disco lleno identificando la causa real, no solo liberando espacio de emergencia.
* Diagnosticar cuellos de botella de CPU, memoria, disco y red con las herramientas estándar.
* Priorizar acciones bajo presión sin comprometer la integridad de los datos.

### ❓ El problema real

Los fallos de arranque y el rendimiento degradado son los incidentes donde más se nota la diferencia entre seguir una receta y entender el sistema. Un sistema que no bootea no perdona errores de procedimiento; un problema de rendimiento mal diagnosticado se "resuelve" temporalmente y reaparece. Este bloque evalúa ambos bajo evidencia real.

### 📖 Bloque A — Fallos de arranque (4 escenarios)

**Escenario A1.** El sistema se detiene en el prompt de GRUB con el mensaje:

\`\`\`text
error: unknown filesystem.
grub rescue>
\`\`\`

*Tarea:* explicar la causa más probable (partición/tabla dañada o cambio de identificador de disco) y los primeros comandos de diagnóstico dentro de \`grub rescue\` (\`ls\`, \`set\`, localizar la partición boot).

**Escenario A2.** El sistema arranca pero cae a un shell de emergencia con el mensaje:

\`\`\`text
[FAILED] Failed to mount /data.
You are in emergency mode.
\`\`\`

*Tarea:* identificar la causa (típicamente una entrada de \`/etc/fstab\` apuntando a un disco/UUID que ya no existe) y el archivo a editar antes de reintentar el arranque.

**Escenario A3.** Tras una actualización de kernel, el sistema no arranca con el kernel nuevo pero sí con el anterior.

*Tarea:* explicar cómo seleccionar el kernel anterior desde el menú de GRUB como solución inmediata, y cómo investigar la causa (módulos faltantes, initramfs mal generado) antes de reintentar la actualización.

**Escenario A4.** Se necesita recuperar acceso root en un servidor donde se perdió la contraseña, con acceso físico o de consola disponible.

*Tarea:* describir el procedimiento estándar (editar la línea de arranque en GRUB, agregar \`init=/bin/bash\` o modo single-user, remount rw, \`passwd\`) y la consideración de seguridad que implica (cualquiera con acceso físico puede hacer esto — por eso importa el cifrado de disco y la seguridad física).

### 📖 Bloque B — Disco lleno (4 escenarios)

**Escenario B1.** Alerta de monitoreo: partición raíz al 98%. El servidor sigue funcionando pero con degradación.

\`\`\`bash
$ du -xh --max-depth=1 / 2>/dev/null | sort -rh | head -5
12G  /var
3.2G /usr
1.1G /home
\`\`\`

*Tarea:* continuar el diagnóstico dentro de \`/var\` (típicamente \`/var/log\` o \`/var/lib/docker\`) antes de borrar nada, y explicar por qué borrar archivos de log activos sin \`truncate\` puede no liberar espacio inmediatamente (archivo abierto por un proceso).

**Escenario B2.** El disco se llenó por una tabla de base de datos con crecimiento descontrolado de WAL/logs de transacciones.

*Tarea:* explicar por qué borrar los archivos WAL directamente del filesystem es peligroso (corrupción de la base) y cuál es el procedimiento correcto (verificar replicación/archiving detenido, forzar checkpoint, corregir la causa del atasco).

**Escenario B3.** Tras liberar espacio de emergencia, la partición vuelve a llenarse en 24 horas.

*Tarea:* diseñar un monitoreo preventivo (alerta a 80%/90%, rotación de logs, límite de crecimiento de contenedores) en vez de repetir la limpieza manual.

**Escenario B4.** \`df\` reporta espacio disponible pero un proceso no puede crear archivos nuevos con "No space left on device".

*Tarea:* explicar la causa alternativa (inodos agotados) y el comando para confirmarlo (\`df -i\`).

### 📖 Bloque C — Rendimiento (5 escenarios)

**Escenario C1.** Un servidor reporta lentitud generalizada. \`top\` muestra:

\`\`\`text
%Cpu(s): 12.0 us, 3.0 sy, 0.0 ni, 40.0 id, 45.0 wa, 0.0 hi, 0.0 si, 0.0 st
\`\`\`

*Tarea:* interpretar el 45% en \`wa\` (I/O wait) como indicador de cuello de botella en disco, no en CPU, y el siguiente comando a correr (\`iostat -x 1\` o \`iotop\`).

**Escenario C2.** \`free -h\` muestra poca memoria libre pero el sistema no está lento.

\`\`\`text
              total   used   free  shared  buff/cache  available
Mem:           16Gi   2.1Gi  0.3Gi   0.1Gi       13.6Gi      13.2Gi
\`\`\`

*Tarea:* explicar por qué "free" bajo no es un problema cuando \`buff/cache\` es alto y \`available\` refleja la memoria real utilizable.

**Escenario C3.** Un proceso específico consume memoria de forma creciente y sostenida a lo largo de los días (memory leak sospechado).

*Tarea:* dar el comando para monitorear el crecimiento en el tiempo (\`ps -o rss,vsz -p PID\` repetido, o \`smem\`) y cómo diferenciarlo de un uso alto pero estable.

**Escenario C4.** La carga promedio (\`uptime\`) muestra \`load average: 8.50, 7.90, 6.10\` en un servidor de 4 núcleos.

*Tarea:* interpretar por qué un load average superior al número de núcleos indica saturación, y qué se revisa a continuación (procesos en \`D\` state con \`ps aux\` — esperando I/O — vs. procesos consumiendo CPU real).

**Escenario C5.** Una aplicación web responde lento solo bajo carga concurrente, no en pruebas individuales.

*Tarea:* proponer un método de diagnóstico bajo carga (herramienta de benchmark tipo \`ab\`/\`wrk\` combinada con monitoreo simultáneo de CPU/memoria/conexiones) en vez de asumir la causa sin reproducirla.

### 📋 Rúbrica de evaluación — Troubleshooting II

| Criterio | Insuficiente | Aceptable | Sólido |
|---|---|---|---|
| Recuperación de arranque | No conoce el procedimiento de recuperación GRUB/emergencia | Recupera con ayuda o pasos incompletos | Recupera de forma autónoma y explica el riesgo de seguridad implícito |
| Diagnóstico de disco lleno | Borra archivos sin investigar causa | Investiga causa pero sin plan preventivo | Investiga causa, corrige de forma segura y previene recurrencia |
| Interpretación de métricas de rendimiento | Confunde CPU alta con I/O wait o memoria cacheada con memoria agotada | Interpreta correctamente con verificación adicional | Interpreta correctamente en el primer análisis y confirma con la herramienta adecuada |
| Reproducción de problemas | Actúa sobre hipótesis no verificadas | Intenta reproducir pero de forma parcial | Reproduce el problema de forma controlada antes de proponer solución |

**Criterio de aprobación:** mínimo "Aceptable" en los 4 criterios. Borrar archivos WAL/de base de datos sin verificación (Escenario B2) es eliminatorio.

### 📋 Lo que debes recordar

* Un alto porcentaje de \`wa\` en \`top\` señala cuello de botella de disco, no de CPU — no sirve escalar núcleos para resolverlo.
* \`buff/cache\` alto y \`free\` bajo en \`free -h\` es normal y saludable; lo que importa es \`available\`.
* Load average por encima del número de núcleos indica saturación, pero hay que revisar si es CPU o procesos en espera de I/O (\`D\` state).
* Nunca borrar archivos WAL de una base de datos manualmente para liberar espacio: puede corromper la base.
* Un disco lleno por inodos agotados no se resuelve borrando archivos grandes, sino identificando quién generó millones de archivos pequeños.

### 🧪 Autoevaluación

1. En el escenario C1, ¿qué indica un 45% de \`wa\` en \`top\` y qué comando se corre a continuación?
2. ¿Por qué \`free -h\` mostrando poca memoria "free" no es necesariamente un problema?
3. ¿Por qué es peligroso borrar directamente los archivos WAL de una base de datos para liberar espacio?

---

1. Indica que el 45% del tiempo de CPU se pasa esperando operaciones de entrada/salida (I/O wait), es decir, el cuello de botella está en el subsistema de disco, no en el procesamiento. El siguiente paso es \`iostat -x 1\` o \`iotop\` para identificar qué proceso y qué disco están generando esa espera.
2. Porque Linux usa la memoria libre para cachear páginas de disco y buffers (\`buff/cache\`), lo cual mejora el rendimiento y se libera automáticamente cuando una aplicación la necesita. La columna \`available\` es la que refleja la memoria realmente disponible para nuevos procesos, y en el ejemplo es alta (13.2Gi), indicando que el sistema está saludable.
3. Los archivos WAL (Write-Ahead Log) contienen transacciones pendientes de aplicar o necesarias para replicación/recuperación ante fallos. Borrarlos manualmente puede dejar la base de datos en un estado inconsistente o irrecuperable ante un crash, o romper la replicación con réplicas que dependen de esos segmentos. El procedimiento correcto es identificar por qué no se están limpiando automáticamente (replicación detenida, archiving fallando) y corregir esa causa.
`

export default content
