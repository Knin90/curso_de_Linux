const content = `
## Módulo 1 — Anatomía del almacenamiento: de disco a aplicación

### 🎯 Objetivos de aprendizaje

* Comprender la jerarquía completa: disco → partición → filesystem → punto de montaje → aplicación.
* Identificar cada tipo de dispositivo de bloque en \`/dev/\`.
* Usar \`lsblk\` y \`lsblk -f\` para inspeccionar el estado de cada capa.

### ❓ El problema real

Compras un disco de 500 GB en tu proveedor de nube y lo conectas al servidor. Ejecutas \`df -h\` y el espacio libre no cambió. El disco está físicamente presente, pero el sistema no lo usa.

¿Por qué? Porque entre el disco y la aplicación hay cuatro capas. Si una falta, la cadena se rompe.

### 📖 La jerarquía completa

\`\`\`text
Disco Físico (SSD / HDD / NVMe / Volumen cloud)
        │
        ▼  Tabla de particiones (GPT)
        │  Metadatos al inicio del disco — define límites de cada región
        │
        ▼  Partición (/dev/nvme0n1p1, /dev/sda2...)
        │  Región tratada como unidad independiente
        │
        ▼  Sistema de archivos (ext4 / xfs / btrfs...)
        │  Estructura interna: superblock, inodos, journal, datos
        │  Traduce "archivo.txt" en bloques físicos
        │
        ▼  Punto de montaje (/mnt/datos, /var/lib/postgresql...)
        │  El kernel conecta el filesystem a un directorio del árbol
        │
        ▼  Aplicación (PostgreSQL, Nginx, scripts...)
           Solo ve directorios y archivos — nunca los bloques físicos
\`\`\`

### 📖 Tipos de dispositivos de bloque

\`\`\`text
Tipo de disco           Nombre en /dev         Ejemplo
─────────────────────────────────────────────────────────
SATA / SAS / SSD        /dev/sdX               /dev/sda, /dev/sdb
NVMe (M.2 moderno)      /dev/nvmeXnY           /dev/nvme0n1
Virtualizado (KVM)      /dev/vdX               /dev/vda
Virtualizado (AWS Xen)  /dev/xvdX              /dev/xvda
Loop (imágenes/ISO)     /dev/loopX             /dev/loop0

Particiones: número al final
/dev/sda       → disco completo
/dev/sda1      → primera partición
/dev/nvme0n1p2 → segunda partición del primer NVMe
\`\`\`

### 💻 Inspección de la jerarquía

\`\`\`bash
# Vista de árbol: discos → particiones → filesystem → montaje
lsblk

# Vista completa con UUID, LABEL, tipo y uso de espacio
lsblk -f

# Columnas personalizadas
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,UUID
\`\`\`

**Resultado típico de \`lsblk -f\`:**

\`\`\`text
NAME     FSTYPE  LABEL        UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
sda
├─sda1   ext4               a1b2c3d4-e5f6-7890-abcd-ef1234567890   33G    30%    /
sdb                                                  ← Sin filesystem: disco nuevo
nvme0n1
├─nvme0n1p1 vfat  EFI       1234-5678                              498M     2%   /boot/efi
└─nvme0n1p2 ext4  ROOT      b2c3d4e5-f6a7-8901-bcde-f23456789012  150G    25%   /
\`\`\`

> \`lsblk -f\` es tu primer comando de diagnóstico. En una pantalla te dice: ¿existe el disco?, ¿tiene partición?, ¿tiene filesystem?, ¿está montado?, ¿cuál es su UUID?

### 📖 Modos de fallo por capa

| Capa | Fallo típico | Diagnóstico |
| --- | --- | --- |
| Disco físico | No conectado, hardware dañado | No aparece en \`lsblk\` |
| Tabla de particiones | Ausente o corrupta | \`fdisk -l\` no muestra particiones |
| Sistema de archivos | No formateado | \`lsblk -f\` sin FSTYPE |
| Punto de montaje | No montado | Directorio vacío, \`df\` no lo muestra |
| fstab | Entrada faltante | No monta al reiniciar → Emergency Mode |

### 📋 Lo que debes recordar

* Un disco nuevo necesita tres pasos: **particionar → formatear → montar**.
* Diagnostica siempre **de abajo hacia arriba**: disco → partición → filesystem → montaje → fstab.
* \`lsblk -f\` muestra el estado de todas las capas en una sola vista.

### 🧪 Autoevaluación

1. \`lsblk\` muestra \`sdb\` pero \`df -h\` no lo lista. ¿Qué capas pueden faltar?
2. ¿Qué diferencia hay entre \`/dev/sda\` y \`/dev/sda1\`?
3. ¿Por qué PostgreSQL no sabe en qué disco físico están sus datos?

---

1. Pueden faltar la tabla de particiones, el filesystem (formateo) o el punto de montaje. Usar \`lsblk -f\` para ver cuál es la primera capa ausente.
2. \`/dev/sda\` es el **disco completo**. \`/dev/sda1\` es la **primera partición** de ese disco.
3. Porque solo ve el **punto de montaje** (un directorio). El VFS del kernel hace la traducción transparente hacia los bloques físicos.
`
export default content
