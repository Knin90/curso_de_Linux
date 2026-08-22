const content = `
## Módulo 8 — Proyecto real: postmortem de un servidor al borde del colapso por espacio

### 🎯 Objetivos de aprendizaje

* Aplicar el árbol de diagnóstico completo ante un incidente real de almacenamiento en producción.
* Distinguir espacio agotado por bloques, por inodos y por "espacio fantasma" (archivos borrados aún abiertos).
* Escribir un runbook de incidente reutilizable con causa raíz, remediación y prevención.

### ❓ El problema real

Son las 3 AM. PagerDuty despierta al equipo de guardia: la aplicación de un cliente empezó a fallar al escribir logs. \`df -h\` confirma que \`/\` está al 97%. Debes actuar rápido pero de forma metódica: localizar qué está consumiendo el espacio, liberar lo necesario sin romper nada, verificar que no es un problema de inodos disfrazado de problema de espacio, y detectar si hay "espacio fantasma" — archivos ya borrados pero que un proceso sigue teniendo abiertos, invisibles para \`du\` pero contados por \`df\`. Al terminar, entregas un postmortem con la causa raíz y la prevención para que no vuelva a pasar.

### 📖 Estructura del proyecto

\`\`\`
incidente-disco-lleno/
├── diagnostico.sh
├── liberar-espacio.sh
├── diagnostico-inodos.sh
└── postmortem.md
\`\`\`

### 📖 diagnostico.sh — localizar al consumidor

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "[1] Confirmar qué filesystem está lleno:"
df -h

echo "[2] Localizar el mayor consumidor (top 15, 2 niveles de profundidad):"
sudo du -h --max-depth=2 / 2>/dev/null | sort -rh | head -15

echo "[3] Archivos individuales mayores a 1 GB:"
sudo find / -type f -size +1G 2>/dev/null | xargs ls -lh 2>/dev/null || true

echo "[4] Espacio fantasma: archivos borrados pero aún abiertos por un proceso:"
sudo lsof +L1
\`\`\`

\`lsof +L1\` es la herramienta clave del paso 4: lista descriptores de archivo con menos de 1 enlace (\`link count\`), es decir, archivos que ya fueron borrados del árbol de directorios pero cuyo espacio no se libera porque un proceso todavía los tiene abiertos.

### 📖 liberar-espacio.sh — remediación

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "[1] Diagnóstico de journald:"
sudo journalctl --disk-usage
sudo journalctl --vacuum-time=3d

echo "[2] Logs de aplicación rotados y antiguos:"
sudo find /var/log -name "*.gz" -mtime +7 -delete
sudo find /var/log -name "*.log.*" -mtime +7 -delete

echo "[3] Caché de paquetes:"
sudo apt clean 2>/dev/null || sudo dnf clean all 2>/dev/null || true

echo "[4] Temporales antiguos:"
sudo find /tmp -type f -mtime +1 -delete
sudo find /var/tmp -type f -mtime +7 -delete

echo "[5] Resultado:"
df -h /
\`\`\`

Nota que este script NO trunca archivos fantasma automáticamente — esa acción se decide manualmente porque implica reiniciar o intervenir un proceso en producción (ver secuencia de ejecución, paso 6).

### 📖 diagnostico-inodos.sh — el problema que \`df -h\` no muestra

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "[1] Inodos disponibles (no confundir con espacio en bloques):"
df -i

echo "[2] Directorio con más archivos bajo /var:"
sudo find /var -xdev -printf '%h\\n' 2>/dev/null | sort | uniq -c | sort -rn | head -10

echo "[3] Caso típico: sesiones de aplicación no limpiadas:"
ls /var/lib/php/sessions/ 2>/dev/null | wc -l
\`\`\`

Un filesystem puede tener espacio libre en bloques (\`df -h\` se ve bien) y aun así no permitir crear archivos nuevos, porque se agotó la tabla de inodos (\`df -i\` al 100%). Es un fallo distinto que requiere un diagnóstico distinto.

### 📖 Secuencia de ejecución

1. Confirmar el incidente y localizar al consumidor:

\`\`\`bash
bash diagnostico.sh
\`\`\`

Salida esperada del paso 2 (ejemplo):

\`\`\`
30G   /var/log
12G   /var/lib/docker
3G    /home
\`\`\`

2. Si \`/var/log\` es el mayor consumidor, ejecutar la remediación:

\`\`\`bash
bash liberar-espacio.sh
\`\`\`

3. Verificar el resultado inmediato:

\`\`\`bash
df -h /
\`\`\`

Si el porcentaje bajó por debajo del umbral crítico (ej. de 97% a 80%), la remediación de logs y caché fue suficiente.

4. Si el porcentaje casi no cambió a pesar de haber liberado logs, revisar espacio fantasma:

\`\`\`bash
sudo lsof +L1
\`\`\`

Salida esperada si hay un archivo fantasma:

\`\`\`
COMMAND   PID   USER   FD   TYPE DEVICE  SIZE/OFF NLINK NODE NAME
nginx    1842   www    12w  REG   8,1    4200000000    0 5234 /var/log/nginx/access.log (deleted)
\`\`\`

La columna \`NLINK 0\` confirma que el archivo ya no tiene nombre en el árbol de directorios, pero \`SIZE/OFF\` muestra 4.2 GB que \`df\` sigue contando como usados.

5. Liberar el espacio fantasma reiniciando el proceso responsable (opción preferida en producción) o truncando el descriptor directamente:

\`\`\`bash
# Opción A (preferida): reiniciar el proceso
sudo systemctl restart nginx

# Opción B (si no se puede reiniciar): truncar sin matar el proceso
sudo truncate -s 0 /proc/1842/fd/12
\`\`\`

6. Descartar un problema de inodos como causa alternativa o adicional:

\`\`\`bash
bash diagnostico-inodos.sh
\`\`\`

Salida esperada si hay agotamiento de inodos:

\`\`\`
Filesystem      Inodes   IUsed   IFree IUse% Mounted on
/dev/sda1      6553600 6553600       0  100% /var
\`\`\`

7. Documentar el incidente en \`postmortem.md\` con causa raíz, remediación aplicada y prevención (rotación de logs, límite de tamaño en journald, alertas al 85%).

### 📋 Lo que debes recordar

* Diagnostica siempre en este orden: espacio en bloques (\`df -h\`) → mayor consumidor (\`du\`) → espacio fantasma (\`lsof +L1\`) → inodos (\`df -i\`). Cada capa puede ocultar la causa real de la anterior.
* \`du\` y \`df\` pueden discrepar: si \`du\` no explica todo el espacio usado que reporta \`df\`, sospecha de espacio fantasma.
* \`lsof +L1\` es la única herramienta que revela archivos borrados pero aún abiertos; \`find\` y \`du\` no los ven porque ya no existen en el árbol de directorios.
* Reiniciar el proceso propietario es la forma más segura de liberar espacio fantasma; truncar el descriptor con \`truncate -s 0 /proc/<PID>/fd/<FD>\` es la alternativa cuando no se puede reiniciar.
* \`df -i\` puede reportar 100% de inodos usados incluso con espacio en bloques libre — son dos recursos independientes que se agotan por separado.
* Todo incidente termina con un postmortem: causa raíz, remediación aplicada y una acción de prevención concreta.

### 🧪 Autoevaluación

1. \`du -h /var/log\` reporta solo 2 GB, pero \`df -h\` muestra que el filesystem está casi lleno con "espacio fantasma" sospechado. ¿Qué comando usarías para confirmarlo y qué columna de su salida es la evidencia clave?
2. Un servidor tiene espacio libre según \`df -h\` pero las aplicaciones no pueden crear archivos nuevos. ¿Qué comando revela la causa y qué se busca en su salida?
3. En el incidente, ¿por qué reiniciar el proceso propietario del archivo fantasma es preferible a truncar el descriptor directamente con \`truncate\`?

---

1. \`sudo lsof +L1\`, que lista descriptores abiertos con \`NLINK\` menor a 1. La columna clave es \`NLINK\`: un valor de \`0\` confirma que el archivo fue borrado del árbol de directorios pero un proceso sigue teniéndolo abierto, por lo que el espacio no se libera hasta que ese proceso lo cierre o termine.
2. \`df -i\`, que muestra inodos usados y disponibles por filesystem, un recurso independiente del espacio en bloques. Se busca la columna \`IUse%\` cercana o igual a 100%: eso confirma que el filesystem se quedó sin "entradas" disponibles para crear archivos nuevos, aunque técnicamente haya bloques de datos libres.
3. Reiniciar el proceso cierra limpiamente todos sus descriptores de archivo, incluido el archivo fantasma, liberando el espacio de forma segura y sin riesgo de dejar al proceso en un estado inconsistente. Truncar el descriptor con \`truncate -s 0 /proc/<PID>/fd/<FD>\` libera el espacio sin reiniciar, pero el proceso puede no esperar ese cambio y comportarse de forma impredecible si sigue escribiendo en ese archivo asumiendo su tamaño anterior.
`

export default content
