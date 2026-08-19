const content = `
## Módulo 8 — Diagnóstico de espacio e inodos: laboratorios integrados

### 🎯 Objetivos de aprendizaje

* Aplicar el árbol de diagnóstico completo ante cualquier problema de almacenamiento.
* Localizar el consumidor de espacio en segundos usando \`du\`, \`find\` y \`lsof\`.
* Detectar y liberar espacio fantasma (archivos borrados con descriptores abiertos).

### 📖 Árbol de diagnóstico

Ante cualquier problema de almacenamiento, sigue siempre de **abajo hacia arriba**:

\`\`\`diagram
{"type":"tree","root":{"name":"¿El disco aparece?","meta":"lsblk · si no: verificar hardware/consola cloud"},"children":[{"name":"¿Tiene partición?","meta":"sudo fdisk -l /dev/sdb · si no: fdisk → g → n → w","edgeLabel":"sí","children":[{"name":"¿Tiene filesystem?","meta":"lsblk -f /dev/sdb · si no: mkfs.ext4 o mkfs.xfs","edgeLabel":"sí","children":[{"name":"¿Está montado?","meta":"findmnt · si no: mount /dev/sdb1 /mnt/punto","edgeLabel":"sí","children":[{"name":"¿Está en fstab?","meta":"grep /etc/fstab · si no: añadir entrada UUID y mount -a","edgeLabel":"sí","children":[{"name":"Todo correcto","edgeLabel":"sí"}]}]}]}]}]}
\`\`\`

### 💻 Herramientas de auditoría de espacio

\`\`\`bash
# Espacio disponible en todos los montajes
df -h

# Inodos disponibles (crítico en servidores de correo/cache)
df -i

# Tamaño de un directorio específico
sudo du -sh /var/log/

# Los 10 directorios más grandes bajo /var
sudo du -h /var | sort -rh | head -n 10

# Archivos mayores a 100 MB
sudo find / -type f -size +100M 2>/dev/null | xargs ls -lh

# Archivos borrados pero aún abiertos por procesos (espacio fantasma)
sudo lsof +L1
\`\`\`

### 🧪 Laboratorio 1: Disco nuevo completo

**Escenario:** Disco de 100 GB recién agregado como \`/dev/sdb\`. Prepararlo para producción.

\`\`\`bash
# 1. Verificar que existe
lsblk -f

# 2. Crear tabla GPT y partición
sudo fdisk /dev/sdb
# g → n → Enter → Enter → Enter → w

# 3. Forzar re-lectura de tabla
sudo partprobe /dev/sdb

# 4. Formatear y etiquetar
sudo mkfs.ext4 -L RESPALDOS /dev/sdb1

# 5. Crear punto de montaje
sudo mkdir -p /srv/backups

# 6. Montar temporalmente
sudo mount /dev/sdb1 /srv/backups
findmnt /srv/backups

# 7. Obtener UUID
sudo blkid /dev/sdb1

# 8. Backup y edición de fstab
sudo cp /etc/fstab /etc/fstab.bak
sudo nano /etc/fstab
# Añadir: UUID=<uuid> /srv/backups ext4 defaults,noatime 0 2

# 9. Validar (CRÍTICO)
sudo umount /srv/backups
sudo mount -a

# 10. Verificación final
findmnt /srv/backups
df -h /srv/backups
echo "test" | sudo tee /srv/backups/test.txt
\`\`\`

---

### 🧪 Laboratorio 2: El disco que desapareció

**Escenario:** \`/mnt/datos\` está vacío después del reinicio. El disco existe pero no está montado.

\`\`\`bash
# Capa 1: ¿El disco físico existe?
lsblk

# Capa 2: ¿Tiene partición?
sudo fdisk -l /dev/sdb

# Capa 3: ¿Tiene filesystem?
lsblk -f /dev/sdb

# Capa 4: ¿Está en fstab?
grep "/mnt/datos" /etc/fstab

# Diagnóstico: la entrada en fstab falta (el admin montó con mount manual)
# Solución:
sudo blkid /dev/sdb1
sudo nano /etc/fstab
# Añadir la entrada correcta
sudo mount -a
findmnt /mnt/datos
\`\`\`

**Pregunta:** Si \`lsblk\` muestra el disco pero \`fdisk -l\` no muestra particiones, ¿qué ocurrió?

> La tabla de particiones se corrompió o el disco nunca fue particionado. Crear nueva tabla con \`fdisk\` — pero esto **borra cualquier dato existente**. Considerar primero \`testdisk\` para recuperación.

---

### 🧪 Laboratorio 3: El disco lleno

**Escenario:** \`df -h\` muestra \`/\` al 97%. La aplicación ya falla al escribir logs.

\`\`\`bash
# 1. Confirmar cuál filesystem está lleno
df -h

# 2. Localizar el mayor consumidor
sudo du -h --max-depth=2 / 2>/dev/null | sort -rh | head -15

# 3. Si /var/log es el culpable:
sudo journalctl --disk-usage
sudo journalctl --vacuum-time=3d

# Limpiar logs rotados antiguos
sudo find /var/log -name "*.gz" -mtime +7 -delete

# 4. Archivos mayores a 1 GB
sudo find / -type f -size +1G 2>/dev/null | xargs ls -lh

# 5. Espacio fantasma: archivos borrados pero abiertos
sudo lsof +L1
# Columna SIZE muestra el tamaño del archivo borrado
# NOMBRE del proceso en columna COMMAND
# Opción A: reiniciar el proceso
sudo systemctl restart nombre-servicio
# Opción B: truncar sin reiniciar (avanzado)
# sudo truncate -s 0 /proc/<PID>/fd/<FD>

# 6. Limpiar caché de paquetes
sudo apt clean      # Debian/Ubuntu
sudo dnf clean all  # RHEL/Fedora

# 7. Verificar resultado
df -h /
\`\`\`

---

### 🧪 Laboratorio 4: El problema de los inodos

**Escenario:** \`df -h\` muestra espacio libre pero la aplicación no puede crear archivos.

\`\`\`bash
# Verificar: ¿son los inodos?
df -i

# Ejemplo de salida alarmante:
# Filesystem      Inodes   IUsed   IFree IUse% Mounted on
# /dev/sda1      6553600 6553600       0  100% /var

# Encontrar el directorio con más archivos
sudo find /var -xdev -printf '%h\\n' 2>/dev/null | sort | uniq -c | sort -rn | head -10

# Caso típico: sesiones PHP no limpiadas
ls /var/lib/php/sessions/ | wc -l
sudo find /var/lib/php/sessions -type f -mtime +1 -delete

# Verificar mejoría
df -i /var
\`\`\`

---

### 📋 Tabla resumen de comandos del Nivel 8

| Comando | Función |
| --- | --- |
| \`lsblk\` | Ver discos, particiones y montajes en árbol |
| \`lsblk -f\` | Agregar FSTYPE, UUID, LABEL y uso |
| \`fdisk\` / \`gdisk\` | Crear/gestionar tablas de particiones GPT |
| \`partprobe\` | Re-leer tabla de particiones sin reiniciar |
| \`mkfs.ext4\` / \`mkfs.xfs\` | Formatear partición |
| \`e2label\` / \`xfs_admin -L\` | Ver/cambiar etiqueta de ext4/xfs |
| \`tune2fs -l\` | Inspeccionar superblock de ext4 |
| \`mount\` | Montar filesystem temporalmente |
| \`umount\` | Desmontar filesystem |
| \`findmnt\` | Ver montajes activos en jerarquía |
| \`blkid\` | Obtener UUID, LABEL y tipo |
| \`/etc/fstab\` | Configurar montajes persistentes |
| \`mount -a\` | Validar fstab sin reiniciar |
| \`df -h\` | Espacio disponible por filesystem |
| \`df -i\` | Inodos disponibles por filesystem |
| \`du -sh\` | Tamaño de un directorio |
| \`du -h | sort -rh\` | Localizar directorio más grande |
| \`find -size +100M\` | Encontrar archivos grandes |
| \`lsof +L1\` | Detectar espacio fantasma |
| \`lsof\` / \`fuser\` | Ver qué proceso usa un filesystem |

### 🎯 Reglas de oro

1. **Nunca uses \`/dev/sdX\` en fstab.** UUID es permanente.
2. **Siempre valida con \`mount -a\`** antes de reiniciar.
3. **Backup de fstab antes de editar**: \`cp /etc/fstab /etc/fstab.bak\`
4. **Diagnostica de abajo hacia arriba**: disco → partición → filesystem → montaje → fstab.
5. **Monitorea inodos**, no solo espacio: \`df -i\` puede salvar tu día.
6. **Usa \`noatime\`** en SSDs — reduce escrituras innecesarias.
`
export default content
