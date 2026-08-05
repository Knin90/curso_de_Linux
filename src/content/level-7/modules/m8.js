const content = `
## Módulo 8 — Laboratorio integrador: disco nuevo, disco perdido y disco lleno

### 🎯 Objetivos de aprendizaje

* Ejecutar el flujo completo de preparación de un disco nuevo para producción.
* Diagnosticar y recuperar un disco que "desapareció" tras un reinicio.
* Localizar y liberar espacio en un servidor al límite.

### 🏢 Escenario general

Eres el administrador de un servidor de base de datos. Hoy tienes tres tareas:

1. Preparar un disco nuevo de 100 GB para almacenar backups.
2. Resolver por qué \`/mnt/datos\` está vacío tras el reinicio de anoche.
3. Liberar espacio en \`/\` que está al 97%.

---

### 🧪 Laboratorio 1: Flujo completo de disco nuevo

\`\`\`bash
# Paso 1: Verificar que el disco existe
lsblk -f
# sdb aparece sin FSTYPE ni MOUNTPOINTS

# Paso 2: Crear tabla GPT y una partición que ocupe todo el disco
sudo fdisk /dev/sdb
# g → n → Enter → Enter → Enter → w

# Verificar
sudo partprobe /dev/sdb
lsblk /dev/sdb

# Paso 3: Formatear con ext4 y asignar etiqueta
sudo mkfs.ext4 -L RESPALDOS /dev/sdb1

# Verificar: debe mostrar FSTYPE=ext4 y LABEL=RESPALDOS
lsblk -f /dev/sdb

# Paso 4: Crear punto de montaje
sudo mkdir -p /srv/backups

# Paso 5: Montar temporalmente y verificar
sudo mount /dev/sdb1 /srv/backups
findmnt /srv/backups

# Paso 6: Obtener UUID para fstab
sudo blkid /dev/sdb1
# Copiar el UUID exacto

# Paso 7: Configurar fstab para persistencia
sudo cp /etc/fstab /etc/fstab.bak
sudo nano /etc/fstab
# Añadir:
# UUID=<tu-uuid> /srv/backups ext4 defaults,noatime 0 2

# Paso 8: Validar sin reiniciar (OBLIGATORIO)
sudo umount /srv/backups    # desmontar primero para que mount -a lo remonte
sudo mount -a
# Si no hay error: éxito

# Paso 9: Verificación final
findmnt /srv/backups
df -h /srv/backups
echo "OK" > /srv/backups/test.txt && cat /srv/backups/test.txt
\`\`\`

---

### 🧪 Laboratorio 2: El disco que desapareció

Ayer montaste \`/dev/sdb1\` en \`/mnt/datos\` con \`mount\`. El servidor se reinició. Ahora \`/mnt/datos\` está vacío.

\`\`\`bash
# Árbol de diagnóstico: de abajo hacia arriba

# Capa 1: ¿El disco físico existe?
lsblk
# ¿Aparece sdb? Si no → problema de hardware o cloud (verificar consola)

# Capa 2: ¿Tiene partición?
sudo fdisk -l /dev/sdb
# ¿Aparece sdb1? Si no → se perdió la tabla de particiones

# Capa 3: ¿Tiene filesystem?
lsblk -f /dev/sdb
# ¿Tiene FSTYPE? Si no → nunca fue formateado o fue formateado accidentalmente

# Capa 4: ¿Está en fstab?
grep "/mnt/datos" /etc/fstab
# Si no está → aquí está el problema. El admin usó mount manual que no persiste.

# Solución: añadir a fstab
sudo blkid /dev/sdb1    # obtener UUID
sudo nano /etc/fstab    # añadir la línea
sudo mount -a           # validar
findmnt /mnt/datos      # verificar que está montado
\`\`\`

---

### 🧪 Laboratorio 3: El disco lleno

\`df -h\` muestra \`/\` al 97%. La aplicación ya empieza a fallar al escribir logs.

\`\`\`bash
# Paso 1: Confirmar cuál filesystem está lleno
df -h
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        49G  47G   500M  97% /

# Paso 2: Localizar el mayor consumidor
sudo du -h --max-depth=2 / 2>/dev/null | sort -rh | head -15

# Escenario A: /var/log ocupa 30 GB
ls -lhS /var/log/
# → Ver si hay logs sin rotar o muy grandes

# Limpiar logs antiguos de journald
sudo journalctl --disk-usage
sudo journalctl --vacuum-time=3d

# Limpiar logs de aplicación (con precaución)
sudo find /var/log -name "*.gz" -mtime +7 -delete
sudo find /var/log -name "*.log.*" -mtime +7 -delete

# Paso 3: Verificar archivos > 1 GB
sudo find / -type f -size +1G 2>/dev/null | xargs ls -lh

# Paso 4: Verificar espacio fantasma (archivos borrados y abiertos)
sudo lsof +L1
# Si aparece un archivo borrado grande:
# Opción A: reiniciar el proceso → systemctl restart servicio
# Opción B: truncar sin reiniciar:
#   sudo truncate -s 0 /proc/<PID>/fd/<FD>

# Paso 5: Limpiar caché de paquetes
sudo apt clean             # Debian
sudo dnf clean all         # RHEL

# Paso 6: Limpiar archivos temporales antiguos
sudo find /tmp -type f -mtime +1 -delete
sudo find /var/tmp -type f -mtime +7 -delete

# Paso 7: Verificar resultado
df -h /
\`\`\`

---

### 🧪 Laboratorio 4: Diagnóstico de inodos

\`\`\`bash
# Verificar si el problema son los inodos (no los bloques)
df -i

# Si /var está al 100% de inodos:
# Encontrar el directorio con más archivos
sudo find /var -xdev -printf '%h\n' 2>/dev/null | sort | uniq -c | sort -rn | head -10

# Caso típico: millones de sesiones PHP
ls /var/lib/php/sessions/ | wc -l
sudo find /var/lib/php/sessions -type f -mtime +1 -delete

# Verificar después
df -i /var
\`\`\`

---

### 📋 Tabla resumen de herramientas del Nivel 7

| Herramienta | Función |
| --- | --- |
| \`lsblk\` | Ver discos, particiones y montajes en árbol |
| \`lsblk -f\` | Agregar FSTYPE, UUID, LABEL y uso |
| \`fdisk\` | Crear/gestionar tablas de particiones (soporta GPT) |
| \`gdisk\` | Herramienta exclusiva para GPT |
| \`partprobe\` | Forzar re-lectura de tabla de particiones por el kernel |
| \`mkfs.ext4\` | Formatear partición con ext4 |
| \`mkfs.xfs\` | Formatear partición con xfs |
| \`e2label\` | Ver/cambiar etiqueta de ext4 |
| \`xfs_admin\` | Ver/cambiar etiqueta de xfs |
| \`tune2fs -l\` | Información completa de un filesystem ext4 |
| \`fsck.ext4\` | Verificar/reparar ext4 (desmontado) |
| \`xfs_repair\` | Verificar/reparar xfs (desmontado) |
| \`mount\` | Montar filesystem temporalmente |
| \`umount\` | Desmontar filesystem |
| \`findmnt\` | Ver montajes activos en jerarquía |
| \`blkid\` | Obtener UUID, LABEL y tipo de filesystem |
| \`/etc/fstab\` | Configurar montajes persistentes |
| \`mount -a\` | Validar fstab sin reiniciar |
| \`df -h\` | Espacio disponible por filesystem |
| \`df -i\` | Inodos disponibles por filesystem |
| \`du -sh\` | Tamaño de un directorio |
| \`du -h \| sort -rh\` | Localizar directorio más grande |
| \`find -size +100M\` | Encontrar archivos grandes |
| \`lsof +L1\` | Detectar archivos borrados con descriptores abiertos |
`
export default content
