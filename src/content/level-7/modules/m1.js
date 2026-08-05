const content = `
## Módulo 1 — La jerarquía del almacenamiento en Linux

### 🎯 Objetivos de aprendizaje

* Comprender la cadena completa desde el disco físico hasta la aplicación.
* Entender por qué cada capa existe y qué problema resuelve.
* Saber en qué capa ocurren los errores más comunes de almacenamiento.

### ❓ El problema que resuelve

Conectas un disco nuevo a tu servidor. Ejecutas \`df -h\` y el espacio libre no aumentó. El disco está ahí físicamente, pero Linux no lo usa. ¿Por qué?

Porque entre el disco físico y tu aplicación hay cuatro capas. Si cualquiera de ellas falta, la cadena se rompe.

### 📖 La jerarquía completa

\`\`\`text
  Disco físico (SSD / HDD / NVMe / Volumen cloud)
        │
        ▼ Tabla de particiones (GPT / MBR)
        │  Metadatos escritos al inicio del disco
        │  Define límites y tipo de cada región
        │
        ▼ Partición (/dev/nvme0n1p1, /dev/sda2...)
        │  Región del disco tratada como unidad independiente
        │
        ▼ Sistema de archivos (ext4 / xfs / btrfs...)
        │  Estructura interna: superblock, inodos, journal, datos
        │  Traduce "archivo.txt" en bloques físicos
        │
        ▼ Punto de montaje (/mnt/datos, /var/lib/postgresql...)
        │  El kernel conecta el filesystem a un directorio vacío
        │  Mecanismo: VFS (Virtual File System)
        │
        ▼ Aplicación (PostgreSQL, Nginx, tus scripts...)
           Ve solo directorios y archivos — no sabe nada de discos ni particiones
\`\`\`

### 📖 Por qué esto importa en producción

Cada capa tiene su propio modo de fallo:

| Capa | Fallo típico | Síntoma |
| --- | --- | --- |
| Disco físico | Hardware dañado, no conectado | No aparece en \`lsblk\` |
| Tabla de particiones | Corrupta o ausente | \`fdisk -l\` no muestra particiones |
| Sistema de archivos | No formateado, corrupto | \`lsblk -f\` no muestra FSTYPE |
| Punto de montaje | No configurado o no montado | Directorio vacío, \`df\` no muestra el disco |
| fstab | Entrada faltante o incorrecta | No monta al reiniciar → Emergency Mode |

### 📖 Cómo ve el kernel el almacenamiento

El kernel de Linux expone todo el hardware de almacenamiento como **archivos de bloque** en \`/dev/\`:

\`\`\`text
  Tipo de disco          Nombre en /dev        Ejemplo
  ─────────────────────────────────────────────────────────
  SATA / SAS / SSD       /dev/sdX              /dev/sda, /dev/sdb
  NVMe (M.2 moderno)     /dev/nvmeXnY          /dev/nvme0n1
  Virtualizado (KVM)     /dev/vdX              /dev/vda
  Virtualizado (AWS Xen) /dev/xvdX             /dev/xvda
  Loop (imágenes/ISO)    /dev/loopX            /dev/loop0
  RAM disk               /dev/ramX             /dev/ram0

  Particiones: se añade el número al final
  /dev/sda   → disco completo
  /dev/sda1  → primera partición de sda
  /dev/nvme0n1p2 → segunda partición del primer NVMe
\`\`\`

### 💻 Ver la jerarquía completa de un vistazo

\`\`\`bash
# Vista de árbol: discos → particiones → filesystem → montaje
lsblk

# Vista completa con UUID, LABEL, tipo y uso
lsblk -f

# Ver todos los dispositivos de bloque con tamaño y tipo
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,UUID
\`\`\`

### 📋 Lo que debes recordar

* Un disco nuevo necesita tres pasos antes de ser usable: particionar → formatear → montar.
* \`lsblk\` muestra la jerarquía de discos y particiones. \`lsblk -f\` agrega filesystem y UUID.
* Si cualquier capa falta, las superiores no funcionan — diagnosticar siempre desde abajo hacia arriba.

### 🧪 Autoevaluación rápida

1. Tienes un disco conectado que aparece en \`lsblk\` pero \`df -h\` no lo muestra. ¿Qué capas pueden estar faltando?
2. ¿Cuál es la diferencia entre \`/dev/sda\` y \`/dev/sda1\`?
3. ¿Por qué una aplicación como PostgreSQL no sabe en qué disco físico están sus datos?

---

1. Pueden faltar: la **tabla de particiones**, el **sistema de archivos** (formateo), o el **punto de montaje** (montaje). Usar \`lsblk -f\` para diagnosticar qué capa está ausente.
2. \`/dev/sda\` es el **disco completo**. \`/dev/sda1\` es la **primera partición** dentro de ese disco.
3. Porque ve solo el **punto de montaje** (un directorio). El VFS del kernel hace la traducción transparente desde ese directorio hasta los bloques físicos del disco.
`
export default content
