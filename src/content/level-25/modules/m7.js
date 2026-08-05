const content = `
## Módulo 7 — Análisis forense básico en Linux: evidencia sin destruirla

### 🎯 Objetivos de aprendizaje
* Entender el orden de volatilidad y por qué importa la secuencia de recolección
* Capturar estado de red, procesos, y usuarios activos antes de que desaparezcan
* Identificar artefactos de sistema de archivos que indican compromiso
* Crear imágenes forenses verificables con cadena de custodia

### ❓ El problema real
Tienes un servidor que probablemente fue comprometido hace 48 horas. No sabes si el atacante sigue activo, qué modificó, o cómo entró. Cada minuto que pasa, el rastro se enfría: los procesos maliciosos pueden terminar, los logs pueden rotarse, las conexiones activas desaparecen. Si reinicias "para empezar limpio", habrás destruido la mayor parte de la evidencia que necesitas para entender qué pasó — y para evitar que vuelva a ocurrir.

El análisis forense en Linux no requiere herramientas comerciales caras. Con comandos estándar y metodología correcta puedes construir un cuadro completo del incidente.

### 📖 Orden de volatilidad: recolecta primero lo que desaparece antes

La regla fundamental del análisis forense es recolectar evidencia **de más volátil a menos volátil**:

\`\`\`
1. Registros de CPU y caché  (desaparece al detener proceso)
2. RAM / memoria del kernel   (desaparece al reiniciar)
3. Estado de red actual        (conexiones activas, tabla ARP)
4. Procesos en ejecución       (desaparecen al terminar)
5. Usuarios conectados         (desaparece al cerrar sesión)
6. Sistema de archivos         (persiste, pero puede modificarse)
7. Logs del sistema            (persisten, pero pueden rotarse)
8. Disco completo / backups    (más estable, menos urgente)
\`\`\`

**NUNCA reinicies un sistema comprometido antes de recolectar el estado volátil.**

### 📖 Estado de red — conexiones activas

Las conexiones de red revelan si el atacante sigue conectado o si hay comunicación con C2 (command and control):

\`\`\`bash
# Conexiones TCP activas con procesos asociados
ss -tnp
# Ejemplo de salida sospechosa:
# ESTAB 0 0 192.168.1.10:22 203.0.113.45:4444 users:(("bash",pid=2847,fd=3))
# Un bash directamente en una conexión de red es señal de shell reversa

# Puertos en escucha (servicios activos)
ss -lnp

# Tabla de enrutamiento (detecta rutas maliciosas inyectadas)
ip route

# Tabla ARP (mapeo IP → MAC en la red local)
ip arp
# o en sistemas más antiguos:
arp -n

# Estadísticas de red por protocolo
netstat -rn
\`\`\`

Busca: conexiones establecidas en puertos no estándar, procesos como \`bash\` o \`sh\` directamente en conexiones de red (indicio de shell reversa), y puertos en escucha que no reconoces.

### 📖 Procesos en ejecución

\`\`\`bash
# Árbol de procesos completo — revela relaciones padre/hijo anómalas
ps aux --forest

# Ver binario real que ejecuta cada proceso (ruta en /proc)
ls -la /proc/*/exe 2>/dev/null | head -40

# SEÑAL CRÍTICA: procesos con binario eliminado (técnica de ocultamiento)
ls -la /proc/*/exe 2>/dev/null | grep deleted
# Un proceso legítimo no debería tener su binario marcado como '(deleted)'
# Esto indica que el atacante subió un binario, lo ejecutó y lo borró del disco
# El proceso sigue en RAM pero el archivo ya no existe en el sistema de archivos

# Ver descriptores de archivo de todos los procesos
ls /proc/*/fd | wc -l

# Conexiones de red por proceso
lsof -i
# Ejemplo: lsof -i muestra qué proceso tiene abierto cada socket

# Árbol de procesos con PIDs explícitos
pstree -p

# Ver las variables de entorno de un proceso específico (PID 1234)
cat /proc/1234/environ | tr '\0' '\n'
# Puede revelar credenciales o rutas inyectadas por el atacante
\`\`\`

### 📖 Actividad de usuarios

\`\`\`bash
# Usuarios conectados ahora mismo
w
# Muestra: usuario, terminal, IP de origen, hora de login, comando actual

# Historial de logins (exitosos)
last | head -30

# Historial de logins fallidos
lastb | head -30

# Dump binario del wtmp para análisis detallado
utmpdump /var/log/wtmp | sort | head -50

# Historial de comandos por usuario
cat /home/nombre_usuario/.bash_history
# Nota: un atacante puede borrar este archivo o usar HISTFILE=/dev/null
# Si está vacío o no existe en una cuenta activa, es sospechoso

# Variables de entorno de procesos activos
# Útil para detectar LD_PRELOAD (técnica de rootkit)
cat /proc/*/environ 2>/dev/null | tr '\0' '\n' | grep -i "ld_preload\|ld_library"
\`\`\`

### 📖 Artefactos del sistema de archivos

\`\`\`bash
# Archivos modificados DESPUÉS del compromiso estimado
# (asumiendo que /etc/passwd no fue modificado antes del compromiso)
find / -newer /etc/passwd -type f 2>/dev/null | grep -v '/proc\|/sys\|/run'

# Archivos modificados en las últimas 24 horas
find / -mtime -1 -type f 2>/dev/null | grep -v '/proc\|/sys\|/run\|/tmp'

# Metadata completa de un archivo sospechoso
stat /ruta/al/archivo
# Muestra: atime (último acceso), mtime (última modificación), ctime (cambio de metadatos)
# ctime no puede falsificarse tan fácilmente como atime/mtime con touch

# Extraer cadenas legibles de un binario sospechoso
strings /ruta/binario/sospechoso | head -50
# Busca: URLs, IPs, rutas, mensajes de error, credenciales hardcodeadas

# Identificar tipo real de archivo (ignora extensión)
file /ruta/archivo/sospechoso
# Un archivo .jpg que file identifica como "ELF 64-bit executable" es malware

# Ver primeros bytes (magic bytes) para verificar tipo real
hexdump -C /ruta/archivo | head -5
# ELF comienza con: 7f 45 4c 46 (0x7f E L F)
# ZIP comienza con: 50 4b 03 04
# Script bash comienza con: 23 21 (# !)

# Archivos ocultos en directorios temporales (lugar favorito de malware)
find /tmp /var/tmp /dev/shm -type f 2>/dev/null
ls -la /tmp/ /var/tmp/

# Binarios con SUID/SGID inusuales (posible escalada de privilegios)
find / -perm /4000 -type f 2>/dev/null | sort
# Compara con una lista baseline de tu sistema
\`\`\`

### 📖 Preservación de logs

\`\`\`bash
# Preservar logs completos con estructura de directorios intacta
cp -a /var/log/ /evidence/logs_$(date +%Y%m%d_%H%M%S)/

# Exportar journal del sistema para un rango de tiempo específico
journalctl --since "2024-01-15 10:00" --until "2024-01-15 18:00" > /evidence/journal.txt

# Hash de integridad para cadena de custodia
sha256sum /var/log/auth.log /var/log/syslog /var/log/secure 2>/dev/null | tee /evidence/log_hashes.txt

# Si los logs del sistema ya fueron manipulados, busca en journal (más difícil de modificar)
journalctl -p err -n 100
\`\`\`

### 📖 Imagen forense del disco

Una imagen forense es una copia bit-a-bit del disco que puede analizarse sin tocar el original. Es el estándar para análisis legales.

\`\`\`bash
# Imagen completa del disco (el sistema debe estar detenido o usar Live CD)
# Redirige la imagen a otro disco o share de red:
dd if=/dev/sda of=/evidence/disk_$(date +%Y%m%d).img bs=64K status=progress

# Verificar integridad de la imagen con hash
sha256sum /dev/sda > /evidence/disk_original.sha256
sha256sum /evidence/disk_$(date +%Y%m%d).img > /evidence/disk_image.sha256
# Ambos hashes deben coincidir exactamente

# Alternativa más rápida con compresión (pierde reproducibilidad exacta de bloques vacíos)
dd if=/dev/sda bs=64K status=progress | gzip -9 > /evidence/disk.img.gz

# Montar la imagen en modo solo lectura para análisis sin modificar original
mkdir -p /mnt/forensic
mount -o ro,loop /evidence/disk.img /mnt/forensic
# Ahora puedes examinar /mnt/forensic/ sin riesgo de modificar evidencia
\`\`\`

### 📖 Timeline de actividad del sistema de archivos

\`\`\`bash
# Generar timeline de archivos por tiempo de modificación (más recientes últimos)
find / -printf "%T@ %Tc %p\n" 2>/dev/null | sort -n | tail -100
# Formato: timestamp_unix  fecha_legible  ruta

# Filtrar por directorio específico (ejemplo: /home y /etc)
find /home /etc -printf "%T@ %Tc %p\n" 2>/dev/null | sort -n | tail -50

# Timeline combinando múltiples fuentes de tiempo
find / -printf "%T@ mtime %Tc %p\n" 2>/dev/null | sort -n > /evidence/timeline_mtime.txt
find / -printf "%C@ ctime %Cc %p\n" 2>/dev/null | sort -n > /evidence/timeline_ctime.txt
\`\`\`

### 📖 Script de recolección inicial

Guarda esto como \`/root/ir_collect.sh\` y ejecútalo como primera acción en cualquier incidente:

\`\`\`bash
#!/bin/bash
EVIDENCE="/evidence/\$(hostname)_\$(date +%Y%m%d_%H%M%S)"
mkdir -p "\$EVIDENCE"

echo "[*] Recolectando estado de red..."
ss -tnp > "\$EVIDENCE/ss_tnp.txt"
ss -lnp > "\$EVIDENCE/ss_lnp.txt"
ip route > "\$EVIDENCE/ip_route.txt"
ip arp > "\$EVIDENCE/ip_arp.txt"

echo "[*] Recolectando procesos..."
ps aux --forest > "\$EVIDENCE/ps_forest.txt"
ls -la /proc/*/exe 2>/dev/null | grep deleted > "\$EVIDENCE/deleted_binaries.txt"
pstree -p > "\$EVIDENCE/pstree.txt"
lsof -i > "\$EVIDENCE/lsof_i.txt"

echo "[*] Recolectando sesiones de usuario..."
w > "\$EVIDENCE/w.txt"
last > "\$EVIDENCE/last.txt"
lastb > "\$EVIDENCE/lastb.txt"

echo "[*] Preservando logs..."
cp -a /var/log/ "\$EVIDENCE/logs/"
journalctl -n 10000 > "\$EVIDENCE/journal.txt"

echo "[*] Generando hashes de integridad..."
sha256sum "\$EVIDENCE/logs/"* 2>/dev/null > "\$EVIDENCE/hashes.txt"

echo "[+] Recolección completa en: \$EVIDENCE"
\`\`\`

### 📋 Lo que debes recordar
* El orden de volatilidad determina qué recolectar primero: red → procesos → usuarios → disco
* Un proceso cuyo binario aparece como \`(deleted)\` en \`/proc/\*/exe\` es señal de rootkit o malware
* \`stat\` muestra tres timestamps: atime, mtime, y ctime — ctime es el más difícil de falsificar
* \`strings\` y \`file\` son las primeras herramientas al analizar un binario sospechoso
* La imagen forense (\`dd\`) debe hacerse con el sistema detenido o desde Live CD para garantizar consistencia
* Hashea todo antes y después de copiar — la cadena de custodia empieza desde el primer segundo

### 🧪 Autoevaluación
1. Ejecutas \`ls -la /proc/*/exe 2>/dev/null | grep deleted\` y encuentras tres entradas. ¿Qué significa esto y cómo investigas cuáles son esos procesos?
2. ¿Cuál es la diferencia entre mtime y ctime de un archivo, y por qué ctime es más relevante para análisis forense?
3. Un analista quiere examinar el disco de un servidor comprometido sin alterar evidencia. ¿Cuál es el procedimiento correcto y qué opciones de montaje usa?

---

1. Significa que tres procesos están ejecutando binarios que ya no existen en el sistema de archivos — el atacante los ejecutó y luego los borró para ocultar rastros. Para investigar: toma el PID de cada entrada (\`ls -la /proc/2847/exe\`), luego examina \`/proc/2847/cmdline\` (comando), \`/proc/2847/maps\` (librerías cargadas), \`/proc/2847/net/tcp\` (conexiones), y \`cat /proc/2847/environ | tr '\\0' '\\n'\` (variables de entorno). También puedes intentar copiar el binario desde memoria: \`cp /proc/2847/exe /evidence/recovered_binary\`.
2. mtime (modification time) es la última vez que se modificó el contenido del archivo — puede falsificarse fácilmente con \`touch -m\`. ctime (change time) es la última vez que cambió el inode del archivo (permisos, propietario, número de enlaces, o contenido) — no puede cambiarse con \`touch\`, solo reiniciando el sistema o con acceso root directo al dispositivo. Para análisis forense, ctime es más confiable porque es más difícil manipular sin dejar rastros adicionales.
3. Procedimiento correcto: (1) Detener el sistema o arrancar desde Live CD para evitar escrituras en el disco durante la copia. (2) Identificar el dispositivo: \`lsblk\`. (3) Crear imagen con \`dd if=/dev/sda of=/evidence/disk.img bs=64K status=progress\`. (4) Verificar integridad comparando SHA256 del dispositivo y la imagen. (5) Montar la imagen en modo solo lectura: \`mount -o ro,loop /evidence/disk.img /mnt/forensic\`. La opción \`ro\` es crítica — sin ella cualquier acceso podría modificar timestamps y contaminar la evidencia.
`

export default content
