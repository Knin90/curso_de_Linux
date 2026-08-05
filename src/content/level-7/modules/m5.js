const content = `
## Módulo 5 — Montaje temporal y el VFS

### 🎯 Objetivos de aprendizaje

* Entender qué hace \`mount\` internamente a nivel del kernel (VFS).
* Montar y desmontar filesystems correctamente.
* Entender qué ocurre cuando montas sobre un directorio con archivos existentes.

### 📖 El VFS: Virtual File System

El VFS es la capa de abstracción del kernel que unifica todos los sistemas de archivos bajo una misma interfaz. Las aplicaciones nunca llaman directamente a ext4 o xfs — llaman al VFS, que traduce hacia el filesystem real.

\`\`\`text
  Aplicación: open("/mnt/datos/archivo.txt", O_RDONLY)
        │
        ▼ VFS del kernel
        │
        ├── ¿A qué filesystem pertenece /mnt/datos?
        │   (consulta la tabla de montajes interna del kernel)
        │
        ├── /mnt/datos → montado desde /dev/sdb1 → filesystem ext4
        │
        ▼ Driver de ext4
        │
        ├── Busca el inodo de "archivo.txt"
        ├── Lee los bloques de datos del disco
        │
        ▼ Datos devueltos a la aplicación
\`\`\`

> **mount no copia archivos.** Modifica la tabla de montajes del kernel. Desde ese momento, cualquier acceso a \`/mnt/datos\` es redirigido por el VFS hacia \`/dev/sdb1\`. Las aplicaciones no cambian nada — ven solo un directorio normal.

### 📖 El efecto sorpresa: montar sobre archivos existentes

\`\`\`text
  ANTES de montar:
  /home/
  ├── carlos/    ← directorio real
  ├── ana/       ← directorio real
  └── pedro/     ← directorio real

  DESPUÉS de: sudo mount /dev/sdb1 /home
  /home/
  ├── (contenido de /dev/sdb1)

  Los directorios originales quedan OCULTOS bajo el montaje.
  No desaparecieron — siguen en disco — pero son inaccesibles.

  DESPUÉS de: sudo umount /home
  /home/
  ├── carlos/    ← vuelven a aparecer
  ├── ana/
  └── pedro/
\`\`\`

> Esto sorprende a muchos administradores. Es el comportamiento correcto del VFS — el punto de montaje "tapa" el contenido original sin eliminarlo.

### 💻 Montar un filesystem

\`\`\`bash
# Crear el directorio de montaje
sudo mkdir -p /mnt/datos

# Montar la partición
sudo mount /dev/sdb1 /mnt/datos

# Montar con opciones específicas
sudo mount -o noatime,ro /dev/sdb1 /mnt/datos   # solo lectura + sin atime

# Montar un archivo ISO como si fuera un disco
sudo mount -o loop imagen.iso /mnt/iso

# Montar por UUID (más seguro que por nombre de dispositivo)
sudo mount UUID="4b29c911-3832-48df-b51e-e2f4949a21b3" /mnt/datos

# Montar por LABEL
sudo mount LABEL=BACKUP_DATOS /mnt/datos
\`\`\`

### 💻 Verificar montajes activos

\`\`\`bash
# Vista jerárquica limpia (recomendado)
findmnt

# Vista específica de un punto de montaje
findmnt /mnt/datos

# Ver opciones de montaje de un filesystem
findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS /mnt/datos

# Forma clásica (menos legible)
mount | grep sdb1
\`\`\`

\`\`\`text
  Salida de findmnt:
  TARGET        SOURCE    FSTYPE  OPTIONS
  /             /dev/sda1 ext4    rw,relatime
  └─/mnt/datos  /dev/sdb1 ext4    rw,relatime
\`\`\`

### 💻 Desmontar un filesystem

\`\`\`bash
# Desmontar por punto de montaje
sudo umount /mnt/datos

# Desmontar por dispositivo
sudo umount /dev/sdb1

# Si umount falla con "device is busy":
# Ver qué proceso está usando el filesystem
sudo lsof /mnt/datos
sudo fuser -mv /mnt/datos

# Forzar desmontaje (peligroso — puede corromper datos)
sudo umount -f /mnt/datos

# Desmontaje lazy (desconecta cuando todos los procesos terminan)
sudo umount -l /mnt/datos
\`\`\`

### 📖 Opciones de montaje más útiles

| Opción | Efecto |
| --- | --- |
| \`defaults\` | rw, suid, dev, exec, auto, nouser, async |
| \`ro\` | Solo lectura |
| \`noatime\` | No actualizar timestamps de acceso (mejor rendimiento en SSDs) |
| \`noexec\` | No permitir ejecutar binarios desde este filesystem |
| \`nosuid\` | Ignorar bits SUID/SGID (seguridad) |
| \`nodev\` | No interpretar dispositivos de bloque en el filesystem |
| \`sync\` | Escrituras síncronas (más lento pero más seguro) |

### 📋 Lo que debes recordar

* \`mount\` modifica la tabla de montajes del kernel — no copia datos.
* \`findmnt\` es superior a \`mount | grep\` para ver montajes activos.
* Montar sobre un directorio con archivos los oculta (no los elimina) hasta desmontar.
* \`umount\` falla con "device is busy" si algún proceso tiene archivos abiertos — usar \`lsof\` para identificarlo.
* El montaje con \`mount\` es **temporal** — no sobrevive al reinicio. Para persistencia: \`/etc/fstab\`.

### 🧪 Autoevaluación rápida

1. ¿Qué hace el VFS cuando una aplicación abre un archivo en \`/mnt/datos\`?
2. Montas \`/dev/sdb1\` sobre \`/home\`. Los directorios de usuario desaparecen. ¿Están borrados?
3. \`umount /mnt/datos\` falla con "target is busy". ¿Cuál es el siguiente paso correcto?

---

1. El VFS consulta su tabla de montajes, descubre que \`/mnt/datos\` apunta a \`/dev/sdb1\` con ext4, y delega la operación al driver de ext4 — transparentemente para la aplicación.
2. No. Están **ocultos** bajo el punto de montaje. Al hacer \`umount /home\`, los directorios originales vuelven a ser visibles.
3. Usar \`sudo lsof /mnt/datos\` para identificar qué proceso tiene archivos abiertos en ese filesystem, cerrarlo, y luego reintentar \`umount\`.
`
export default content
