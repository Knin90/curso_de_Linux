const content = `
## Módulo 4 — Sistemas de archivos: ext4, xfs y btrfs

### 🎯 Objetivos de aprendizaje

* Entender qué construye \`mkfs\` internamente en el disco.
* Elegir el sistema de archivos correcto para cada caso de uso.
* Formatear particiones con ext4 y xfs, asignar etiquetas y verificar el resultado.

### 📖 Qué crea mkfs internamente

Una partición recién creada es solo una secuencia de bloques vacíos numerados. No hay carpetas, no hay nombres, no hay permisos. \`mkfs\` escribe las estructuras que hacen posible todo eso:

\`\`\`diagram
{"type":"table-like","title":"mkfs.ext4 /dev/sdb1 — estructuras creadas","rows":[{"key":"Superblock","value":"Metadatos maestros del filesystem: tamaño, estado, bloques totales/libres, magic number"},{"key":"Group Descriptor Table","value":"Mapa de grupos de bloques"},{"key":"Bitmap de bloques / inodos","value":"Qué bloques y qué inodos están ocupados (1/0)"},{"key":"Tabla de inodos","value":"Reserva fija de inodos al crear (crítico: ext4 no puede añadir más después)"},{"key":"Journal","value":"Registro de transacciones para recuperación tras corte de energía"},{"key":"Bloques de datos","value":"Aquí viven los archivos realmente"}]}
\`\`\`

### 📖 Comparativa: ext4 vs xfs vs btrfs

| Característica | ext4 | xfs | btrfs |
| --- | --- | --- | --- |
| Estabilidad en producción | Excelente | Excelente | Buena (mejorando) |
| Archivo máximo | 16 TB | 8 EiB | 16 EiB |
| Filesystem máximo | 1 EiB | 8 EiB | 16 EiB |
| Inodos | Fijos al formatear | Dinámicos | Dinámicos |
| Reducir tamaño en caliente | No | No | Sí (limitado) |
| Snapshots nativos | No | No | Sí |
| Compresión transparente | No | No | Sí (lzo, zstd) |
| Copy-on-Write | No | No | Sí |
| Mejor caso de uso | SO Linux, uso general | Bases de datos, archivos grandes | Desktops, entornos con snapshots |
| Usado por defecto en | Debian, Ubuntu | RHEL, Fedora | openSUSE |

> **Regla en producción:** ext4 para sistemas operativos y datos generales. xfs para bases de datos y volúmenes de datos grandes. btrfs para entornos de desarrollo con snapshots o cuando necesitas compresión transparente.

### 💻 Formatear particiones

\`\`\`bash
# ext4 (con label)
sudo mkfs.ext4 -L DATOS_APP /dev/sdb1

# xfs (con label)
sudo mkfs.xfs -L DATOS_APP /dev/sdb1

# btrfs (con label)
sudo mkfs.btrfs -L DATOS_APP /dev/sdb1

# Ver el resultado inmediatamente
lsblk -f /dev/sdb
\`\`\`

### 💻 Gestionar etiquetas (LABEL)

\`\`\`bash
# Ver la etiqueta actual
sudo e2label /dev/sdb1                    # ext4
sudo xfs_admin -l /dev/sdb1              # xfs

# Cambiar la etiqueta de ext4
sudo e2label /dev/sdb1 NUEVA_ETIQUETA

# Cambiar la etiqueta de xfs (disco debe estar desmontado)
sudo xfs_admin -L NUEVA_ETIQUETA /dev/sdb1

# Ver toda la info del filesystem ext4
sudo tune2fs -l /dev/sdb1

# Ver toda la info del filesystem xfs (montado)
xfs_info /mnt/punto
\`\`\`

### 💻 Verificar integridad del filesystem

\`\`\`bash
# Verificar ext4 (el disco debe estar DESMONTADO)
sudo fsck.ext4 /dev/sdb1
sudo e2fsck -f /dev/sdb1   # forzar revisión aunque parezca limpio

# Verificar xfs (el disco debe estar DESMONTADO)
sudo xfs_repair /dev/sdb1

# Ver si ext4 tiene errores registrados en el superblock
sudo tune2fs -l /dev/sdb1 | grep "Filesystem state"
# clean = sin errores
# not clean = hubo un cierre incorrecto (se revisará al montar)
\`\`\`

### 📖 El problema de los inodos en ext4

\`\`\`bash
# Ver cuántos inodos tiene tu partición
df -i /

# Ejemplo de servidor de correo lleno de inodos:
# Filesystem     Inodes  IUsed  IFree  IUse% Mounted on
# /dev/sda1    12058624 12058624      0  100% /

# El disco tiene espacio libre pero no puede crear más archivos
# porque no hay inodos disponibles

# Al formatear ext4, puedes aumentar la proporción de inodos:
sudo mkfs.ext4 -T news /dev/sdb1  # optimizado para millones de archivos pequeños
# vs
sudo mkfs.ext4 -T largefile /dev/sdb1  # optimizado para archivos grandes
\`\`\`

> xfs evita este problema porque asigna inodos dinámicamente cuando se necesitan — nunca se agotan mientras haya espacio en disco.

### 📋 Lo que debes recordar

* \`mkfs\` escribe las estructuras del filesystem: superblock, bitmap de inodos, tabla de inodos, journal, datos.
* ext4: estable, inodos fijos al formatear. xfs: mejor para archivos grandes, inodos dinámicos.
* Usar \`-L ETIQUETA\` al formatear para identificar el disco de forma legible.
* \`fsck\` / \`xfs_repair\` solo sobre discos **desmontados** — jamás sobre un disco montado en uso.

### 🧪 Autoevaluación rápida

1. \`df -h\` muestra espacio libre pero una aplicación falla al crear archivos con "No space left on device". ¿Qué puede ser?
2. ¿Cuándo elegirías xfs sobre ext4 en un servidor?
3. Formateas \`/dev/sdc1\` con \`mkfs.ext4\` pero cambias de idea y quieres xfs. ¿Qué haces?

---

1. Los **inodos están agotados** — verificar con \`df -i\`. En ext4, los inodos se reservan al formatear y no se pueden añadir después.
2. Para bases de datos con archivos grandes, alta concurrencia de escritura, o cuando necesitas inodos dinámicos (sin riesgo de agotarse).
3. Simplemente ejecutar \`sudo mkfs.xfs -f /dev/sdc1\` — el flag \`-f\` (force) sobreescribe el ext4 existente. Se perderán todos los datos de esa partición.
`
export default content
