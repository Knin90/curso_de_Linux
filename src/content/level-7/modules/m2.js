const content = `
## Módulo 2 — Dispositivos de bloque: /dev, lsblk y tipos de disco

### 🎯 Objetivos de aprendizaje

* Identificar cualquier dispositivo de almacenamiento en el sistema.
* Leer e interpretar la salida de \`lsblk\` y \`fdisk -l\`.
* Distinguir entre discos físicos, particiones y dispositivos virtuales.

### 📖 ¿Qué es un dispositivo de bloque?

Un **dispositivo de bloque** es un archivo especial en \`/dev/\` que representa un medio de almacenamiento. Se llama "de bloque" porque el kernel lee y escribe datos en bloques de tamaño fijo (típicamente 512 bytes o 4 KB), no byte a byte.

\`\`\`bash
# Los archivos de bloque tienen 'b' como primer carácter en ls -l
ls -la /dev/sda /dev/sda1
# brw-rw---- 1 root disk  8, 0 /dev/sda     ← b = block device
# brw-rw---- 1 root disk  8, 1 /dev/sda1    ← b = block device
\`\`\`

### 💻 lsblk: el comando de diagnóstico principal

\`\`\`bash
lsblk
\`\`\`

\`\`\`text
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda           8:0    0    50G  0 disk
├─sda1        8:1    0    49G  0 part /
└─sda9        8:9    0     1M  0 part
sdb           8:16   0   100G  0 disk        ← disco nuevo, sin particiones
nvme0n1     259:0    0   200G  0 disk
├─nvme0n1p1 259:1    0   512M  0 part /boot/efi
└─nvme0n1p2 259:2    0 199.5G  0 part /
\`\`\`

**Columnas clave:**

| Columna | Significado |
| --- | --- |
| \`NAME\` | Nombre del dispositivo en \`/dev/\` |
| \`SIZE\` | Tamaño del disco o partición |
| \`TYPE\` | \`disk\` = disco completo, \`part\` = partición, \`loop\` = loop device |
| \`MOUNTPOINTS\` | Vacío = no montado |

### 💻 lsblk -f: agrega filesystem y UUID

\`\`\`bash
lsblk -f
\`\`\`

\`\`\`text
NAME        FSTYPE   FSVER LABEL    UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
sda
├─sda1      ext4     1.0            a1b2c3d4-e5f6-7890-abcd-ef1234567890   33G    30%   /
└─sda9
sdb                                                                                      ← sin FSTYPE = sin formato
nvme0n1
├─nvme0n1p1 vfat     FAT32 EFI      1234-5678                              498M     2%  /boot/efi
└─nvme0n1p2 ext4     1.0   ROOT     b2c3d4e5-f6a7-8901-bcde-f23456789012   150G    25%  /
\`\`\`

> \`lsblk -f\` es tu primer comando al diagnosticar cualquier problema de almacenamiento. Responde en una sola pantalla: ¿existe el disco?, ¿tiene particiones?, ¿tiene filesystem?, ¿está montado?, ¿cuál es su UUID?

### 💻 fdisk -l: información técnica detallada

\`\`\`bash
sudo fdisk -l
\`\`\`

\`\`\`text
Disk /dev/sda: 50 GiB, 53687091200 bytes, 104857600 sectors
Disk model: QEMU HARDDISK
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: gpt

Device      Start       End   Sectors  Size Type
/dev/sda1    2048  102762495 102760448   49G Linux filesystem
/dev/sda9  102762496 104855551   2093056    1M BIOS boot
\`\`\`

### 💻 Identificar el tipo de disco en tu sistema

\`\`\`bash
# Ver el tipo de interfaz de cada disco
lsblk -d -o NAME,TYPE,TRAN,SIZE,MODEL

# Ver si un disco es SSD o HDD (rotacional)
cat /sys/block/sda/queue/rotational
# 0 = SSD (no rotacional)
# 1 = HDD (rotacional, tiene platos físicos)

# Ver el modelo exacto del disco
sudo hdparm -I /dev/sda | grep "Model Number"

# Para NVMe
sudo nvme list
\`\`\`

### 💻 Detectar discos nuevos sin reiniciar

En entornos cloud, puedes adjuntar volúmenes en caliente:

\`\`\`bash
# Forzar re-escaneo del bus SCSI (para VMs y cloud)
echo "- - -" | sudo tee /sys/class/scsi_host/host0/scan

# Ver si el kernel reconoció el nuevo disco
dmesg | tail -20 | grep -i "sd\|nvme\|disk"

# Listar solo los discos (sin particiones)
lsblk -d -o NAME,SIZE,MODEL,SERIAL
\`\`\`

### 📋 Lo que debes recordar

* \`lsblk\` muestra árbol de discos y particiones. \`lsblk -f\` agrega FSTYPE y UUID.
* \`lsblk -f\` es el punto de partida de cualquier diagnóstico de almacenamiento.
* Discos sin FSTYPE en \`lsblk -f\` = sin formato → necesitan \`mkfs\`.
* Discos sin MOUNTPOINTS = sin montar → necesitan \`mount\` o entrada en \`/etc/fstab\`.

### 🧪 Autoevaluación rápida

1. En la salida de \`lsblk -f\`, un disco muestra \`FSTYPE\` vacío. ¿Qué significa y qué debes hacer?
2. ¿Qué diferencia hay entre \`lsblk\` y \`fdisk -l\`?
3. ¿Cómo determinas si un disco es SSD o HDD desde la línea de comandos?

---

1. Significa que el disco (o partición) **no tiene sistema de archivos** — no ha sido formateado. Debes ejecutar \`mkfs.ext4\` o \`mkfs.xfs\` sobre esa partición.
2. \`lsblk\` muestra la jerarquía en árbol de forma limpia con montajes. \`fdisk -l\` muestra información técnica detallada de la tabla de particiones (sectores, tipo GPT/MBR, tamaños exactos).
3. Con \`cat /sys/block/sda/queue/rotational\`: \`0\` = SSD, \`1\` = HDD.
`
export default content
