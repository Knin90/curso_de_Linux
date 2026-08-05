const content = `
## Módulo 5 — Formateo y etiquetado de particiones

### 🎯 Objetivos de aprendizaje

* Formatear una partición con ext4 y xfs usando las opciones correctas.
* Asignar y modificar etiquetas (LABEL) en cada tipo de filesystem.
* Verificar el resultado con \`lsblk -f\` y \`blkid\`.

### 📖 El proceso de formateo

\`mkfs\` (make filesystem) instala la estructura del sistema de archivos sobre una partición vacía. **Es destructivo**: si la partición tiene datos, los borra sin advertencia.

\`\`\`text
/dev/sdb1 (bloques vacíos)
        ↓
mkfs.ext4 /dev/sdb1
        ↓
/dev/sdb1 (superblock + inodos + journal + bloques de datos listos)
\`\`\`

### 💻 Formatear con ext4

\`\`\`bash
# Formateo básico
sudo mkfs.ext4 /dev/sdb1

# Con etiqueta directamente en el formateo
sudo mkfs.ext4 -L RESPALDOS /dev/sdb1

# Con tamaño de bloque explícito (4096 es el estándar para filesystems > 1 GB)
sudo mkfs.ext4 -b 4096 -L DATOS /dev/sdb1
\`\`\`

### 💻 Formatear con xfs

\`\`\`bash
# Formateo básico
sudo mkfs.xfs /dev/sdb1

# Con etiqueta
sudo mkfs.xfs -L RESPALDOS /dev/sdb1

# Nota: xfs no acepta formatear una partición ya formateada sin -f
sudo mkfs.xfs -f -L RESPALDOS /dev/sdb1
\`\`\`

### 💻 Asignar o cambiar la LABEL después del formateo

\`\`\`bash
# Para ext4: ver etiqueta actual
sudo e2label /dev/sdb1

# Para ext4: asignar nueva etiqueta
sudo e2label /dev/sdb1 BACKUP_DATOS

# Para xfs: ver etiqueta actual (filesystem debe estar desmontado o en modo read-only)
sudo xfs_admin -l /dev/sdb1

# Para xfs: asignar nueva etiqueta
sudo xfs_admin -L BACKUP_DATOS /dev/sdb1
\`\`\`

### 💻 Verificar el resultado

\`\`\`bash
# Ver filesystem, LABEL, UUID y uso
lsblk -f /dev/sdb

# Ver UUID, LABEL y tipo en detalle
sudo blkid /dev/sdb1
\`\`\`

**Salida esperada de \`blkid\` tras formateo:**

\`\`\`text
/dev/sdb1: LABEL="RESPALDOS" UUID="4b29c911-3832-48df-b51e-e2f4949a21b3" BLOCK_SIZE="4096" TYPE="ext4"
\`\`\`

### 📖 ¿Por qué usar LABEL?

Las etiquetas hacen los scripts de administración más legibles:

\`\`\`bash
# Sin LABEL (frágil: el nombre puede cambiar)
mount /dev/sdb1 /srv/backups

# Con LABEL (legible y portable)
mount LABEL=RESPALDOS /srv/backups
\`\`\`

### 📋 Lo que debes recordar

* \`mkfs\` **destruye datos existentes**. Verificar el dispositivo con \`lsblk\` antes de ejecutarlo.
* \`-L\` en \`mkfs.ext4\` y \`mkfs.xfs\` asigna la etiqueta durante el formateo — más eficiente que hacerlo después.
* \`blkid\` muestra UUID y LABEL de cualquier dispositivo.
* \`e2label\` y \`xfs_admin -L\` permiten cambiar la etiqueta sin reformatear.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`mkfs.ext4 -L DATOS /dev/sdb1\` y \`mkfs.ext4 /dev/sdb1\` seguido de \`e2label /dev/sdb1 DATOS\`?
2. Quieres cambiar la LABEL de una partición xfs de \`VIEJO\` a \`NUEVO\` sin reformatear. ¿Qué comando usas?
3. \`mkfs.xfs /dev/sdb1\` falla con "appears to contain an existing filesystem". ¿Cómo lo resuelves?

---

1. El resultado final es el mismo. La diferencia es que \`-L\` durante \`mkfs\` lo hace en un solo paso, mientras que \`e2label\` requiere un segundo comando.
2. \`sudo xfs_admin -L NUEVO /dev/sdb1\` (filesystem desmontado o en read-only).
3. Agregar \`-f\` para forzar: \`sudo mkfs.xfs -f /dev/sdb1\`. Esto destruye el filesystem existente.
`
export default content
