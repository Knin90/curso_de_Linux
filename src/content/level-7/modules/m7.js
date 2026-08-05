const content = `
## Módulo 7 — Diagnóstico de espacio: df, du, inodos y archivos fantasma

### 🎯 Objetivos de aprendizaje

* Monitorear el uso de espacio en disco y detectar filesystems saturados.
* Localizar qué directorio o proceso consume espacio inesperadamente.
* Entender y resolver el problema de los inodos agotados y los archivos fantasma.

### 📖 El flujo de diagnóstico de almacenamiento

\`\`\`text
  Una aplicación reporta: "No space left on device"

  Paso 1: ¿Qué filesystem está lleno?
  df -h        ← ver uso por filesystem

  Paso 2: ¿Dónde está el espacio consumido?
  du -h /ruta | sort -rh | head -20   ← encontrar directorios grandes

  Paso 3: ¿Es un problema de inodos (no de bloques)?
  df -i        ← ver inodos libres/usados

  Paso 4: ¿Hay archivos borrados pero aún abiertos?
  lsof +L1     ← detectar "espacio fantasma"
\`\`\`

### 💻 df: espacio disponible por filesystem

\`\`\`bash
# Vista legible por humanos
df -h

# Salida típica:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        49G   45G  1.2G  98% /           ← ¡peligro!
# /dev/sdb1       100G  1.2G   94G   2% /mnt/datos
# tmpfs           391M  1.2M  390M   1% /run

# Ver solo un filesystem específico
df -h /var/log

# Ver en bloques exactos (para diagnóstico técnico)
df -B1 /

# Ver tipo de filesystem incluido
df -hT
\`\`\`

### 💻 du: tamaño de directorios

\`\`\`bash
# Tamaño total de un directorio
sudo du -sh /var/log

# Los 10 directorios más grandes dentro de /var
sudo du -h /var | sort -rh | head -10

# Solo un nivel de profundidad (sin recursión excesiva)
sudo du -h --max-depth=1 /var

# Encontrar archivos > 100 MB
sudo find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null

# Encontrar archivos > 1 GB
sudo find / -type f -size +1G 2>/dev/null | xargs ls -lh

# Ordenar por tamaño los archivos de un directorio
ls -lhS /var/log/ | head -10
\`\`\`

### 📖 El problema de los inodos

Los inodos son las entradas que identifican cada archivo o directorio. En ext4, su número se fija al formatear. En servidores con millones de archivos pequeños (servidores de correo, caches, sesiones PHP), los inodos pueden agotarse antes que el espacio en disco.

\`\`\`bash
# Ver inodos disponibles
df -i

# Salida:
# Filesystem     Inodes  IUsed   IFree IUse% Mounted on
# /dev/sda1    12058624 12058624      0  100% /    ← inodos al 100%, espacio libre no importa

# Encontrar el directorio con más archivos (el culpable)
sudo find / -xdev -printf '%h\n' 2>/dev/null | sort | uniq -c | sort -rn | head -10
\`\`\`

**Soluciones al agotamiento de inodos:**

\`\`\`bash
# Opción 1: Limpiar archivos innecesarios (sesiones viejas, temporales)
sudo find /var/lib/php/sessions -type f -mtime +7 -delete
sudo find /tmp -type f -mtime +1 -delete

# Opción 2: Migrar a xfs (inodos dinámicos — no se agotan)
# (requiere planificación y migración de datos)

# Opción 3: Al crear ext4, especificar más inodos
sudo mkfs.ext4 -T news /dev/sdX  # optimizado para archivos pequeños
\`\`\`

### 📖 Archivos fantasma: espacio que no aparece en du

Este es el escenario más desconcertante en administración de Linux:

\`\`\`text
  df -h muestra /var al 95%
  du -sh /var muestra solo 20 GB de 100 GB

  ¿Dónde están los otros 80 GB?
\`\`\`

**Causa:** Un proceso abrió un archivo, ese archivo fue **borrado** del sistema de archivos (con \`rm\`), pero el proceso sigue corriendo y tiene el archivo abierto. El kernel no libera el espacio hasta que el proceso cierre el archivo (o el proceso termine).

\`\`\`bash
# Encontrar archivos borrados pero aún abiertos
sudo lsof +L1

# Salida típica:
# nginx     12345  www-data  5w  REG  8,1  83886080  0  /var/log/nginx/error.log (deleted)
#                                          ^^^^^^^^^ 80 GB ocupados por este archivo borrado

# Solución 1: Reiniciar el proceso (libera el descriptor de archivo)
sudo systemctl restart nginx

# Solución 2: Si no puedes reiniciar, truncar el archivo vía /proc
sudo truncate -s 0 /proc/12345/fd/5
# El proceso sigue corriendo, el espacio se libera inmediatamente
\`\`\`

### 💻 Rutina completa de auditoría de espacio

\`\`\`bash
# 1. Estado general
df -h
df -i   # inodos

# 2. Directorios más grandes
sudo du -h --max-depth=2 / 2>/dev/null | sort -rh | head -20

# 3. Archivos > 500 MB
sudo find / -type f -size +500M 2>/dev/null | xargs ls -lh

# 4. Archivos de log que crecen fuera de control
ls -lhS /var/log/

# 5. Espacio fantasma
sudo lsof +L1

# 6. Archivos temporales antiguos
sudo find /tmp /var/tmp -type f -mtime +7 | wc -l
\`\`\`

### 📋 Lo que debes recordar

* \`df -h\` muestra espacio por filesystem. \`du -h | sort -rh\` localiza el culpable.
* \`df -i\` muestra inodos — un filesystem puede estar al 100% de inodos con espacio libre.
* \`lsof +L1\` detecta archivos borrados pero aún abiertos — el "espacio fantasma".
* Reiniciar el proceso o truncar via \`/proc/PID/fd/N\` libera el espacio sin perder el proceso.

### 🧪 Autoevaluación rápida

1. \`df -h\` muestra \`/\` al 30%. \`du -sh /\` muestra solo 15 GB de 100 GB. ¿Qué puede explicar la diferencia?
2. ¿Por qué pueden agotarse los inodos en ext4 aunque haya espacio libre en disco?
3. Un log de nginx fue eliminado con \`rm\` pero \`df -h\` sigue mostrando el espacio ocupado. ¿Qué comando usas para verificarlo?

---

1. Archivos borrados pero con descriptores abiertos por procesos (**archivos fantasma**). Verificar con \`sudo lsof +L1\`.
2. Porque en ext4, los inodos se reservan al formatear en cantidad fija. En servidores con millones de archivos pequeños, los inodos se agotan antes que los bloques de datos.
3. \`sudo lsof +L1\` — muestra archivos con \`link count = 0\` (borrados del directorio) que siguen abiertos por algún proceso, con el tamaño que están ocupando.
`
export default content
