const content = `
## Módulo 6 — Montaje temporal y el VFS

### 🎯 Objetivos de aprendizaje

* Entender qué hace \`mount\` a nivel del kernel (VFS).
* Montar y desmontar filesystems correctamente.
* Saber qué ocurre cuando montas sobre un directorio con archivos existentes.

### 📖 El VFS: Virtual File System

El kernel de Linux mantiene una tabla interna llamada **VFS (Virtual File System)**. Esta tabla mapea rutas del árbol de directorios a los dispositivos físicos correspondientes.

\`\`\`text
Árbol de directorios del kernel (VFS)

/                    → /dev/sda1 (ext4)
├── home/
├── var/
├── etc/
└── mnt/
    └── datos/       → /dev/sdb1 (ext4)  ← mount agrega esta entrada
\`\`\`

Cuando una aplicación accede a \`/mnt/datos/archivo.txt\`:
1. El kernel consulta el VFS.
2. Detecta que \`/mnt/datos\` está mapeado a \`/dev/sdb1\`.
3. Traduce el acceso a los bloques físicos de esa partición.

La aplicación no sabe nada de discos — solo ve un directorio.

### ⚠️ mount es temporal

\`mount\` modifica el VFS **en memoria RAM**. Al reiniciar, el VFS se reinicia y el mapeo desaparece. El disco sigue existiendo pero ya no está conectado al árbol de directorios.

Para que el montaje sobreviva a reinicios → \`/etc/fstab\` (Módulo 7).

### 💻 Montaje temporal

\`\`\`bash
# 1. Crear el directorio punto de montaje (si no existe)
sudo mkdir -p /mnt/datos

# 2. Montar el filesystem
sudo mount /dev/sdb1 /mnt/datos

# Alternativamente, montar por LABEL o UUID
sudo mount LABEL=RESPALDOS /mnt/datos
sudo mount UUID=4b29c911-3832-48df-b51e-e2f4949a21b3 /mnt/datos

# 3. Verificar el montaje
findmnt /mnt/datos
\`\`\`

**Salida de \`findmnt\`:**

\`\`\`text
TARGET     SOURCE     FSTYPE OPTIONS
/mnt/datos /dev/sdb1  ext4   rw,relatime
\`\`\`

### 💻 Ver todos los montajes activos

\`\`\`bash
# Vista jerárquica (recomendado)
findmnt

# Vista clásica (plana)
mount | grep -v tmpfs
\`\`\`

**Salida de \`findmnt\`:**

\`\`\`text
TARGET        SOURCE      FSTYPE  OPTIONS
/             /dev/sda1   ext4    rw,relatime
└─/mnt/datos  /dev/sdb1   ext4    rw,relatime
\`\`\`

### 💻 Desmontar

\`\`\`bash
sudo umount /mnt/datos

# Si falla con "target is busy": ver qué proceso usa el filesystem
sudo lsof /mnt/datos
sudo fuser -m /mnt/datos
\`\`\`

### 📖 ¿Qué pasa si montas sobre un directorio con archivos?

\`\`\`text
ANTES del mount:
/datos/
├── archivo1.txt
├── archivo2.txt
└── subdir/

DESPUÉS de mount /dev/sdb1 /datos:
/datos/
└── (contenido de /dev/sdb1)
\`\`\`

Los archivos originales **no desaparecen**. Quedan **ocultos** bajo el punto de montaje hasta que desmontes. Ejecutar \`umount /datos\` los hace reaparecer.

> Esto sorprende a muchos administradores junior. El VFS "tapa" el contenido original con el nuevo filesystem.

### 📋 Lo que debes recordar

* \`mount\` modifica el VFS en RAM — **no persiste** tras reinicio.
* \`findmnt\` muestra la jerarquía de montajes de forma más clara que \`mount\`.
* Montar sobre un directorio con archivos **oculta** (no borra) los archivos originales.
* Si \`umount\` falla con "busy": usar \`lsof\` o \`fuser\` para ver qué proceso tiene el directorio abierto.

### 🧪 Autoevaluación

1. Montas \`/dev/sdb1\` sobre \`/var/log\`. Los logs anteriores ya no son visibles. ¿Se perdieron?
2. \`umount /mnt/datos\` falla con "target is busy". ¿Qué haces?
3. ¿Cuál es la diferencia entre \`findmnt\` y \`mount\` para ver montajes activos?

---

1. No. Los logs originales quedaron **ocultos** bajo el punto de montaje. Al ejecutar \`umount /var/log\` volverán a aparecer.
2. Ejecutar \`sudo lsof /mnt/datos\` o \`sudo fuser -m /mnt/datos\` para identificar qué proceso tiene el directorio abierto. Cerrar ese proceso primero.
3. \`findmnt\` muestra los montajes en **árbol jerárquico** (muy legible). \`mount\` muestra una lista plana con más opciones de texto pero más difícil de parsear.
`
export default content
