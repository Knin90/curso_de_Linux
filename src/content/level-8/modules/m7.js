const content = `
## Módulo 7 — UUID, LABEL y persistencia con /etc/fstab

### 🎯 Objetivos de aprendizaje

* Entender por qué los nombres de dispositivo (/dev/sdX) son peligrosos en fstab.
* Usar UUID y LABEL como identificadores estables.
* Configurar \`/etc/fstab\` correctamente y validar antes de reiniciar.

### 📖 El problema de /dev/sdb1 en fstab

El kernel asigna nombres (\`sda\`, \`sdb\`, \`sdc\`) según el **orden en que detecta los discos** durante el arranque. Si:
* Añades otro disco,
* El controlador SATA tarda más en inicializarse,
* El orden de los buses cambia...

...\`sdb\` puede convertirse en \`sdc\` en el próximo arranque. Tu \`fstab\` apuntará a un dispositivo diferente, o uno que ya no existe. El sistema entra en **Emergency Mode**.

### 📖 UUID: identificador permanente

El **UUID (Universally Unique Identifier)** está grabado en el **superblock** del filesystem. Nunca cambia aunque:
* Cambies el cable SATA,
* Muevas el disco a otro servidor,
* El kernel lo detecte en diferente orden.

\`\`\`bash
# Obtener UUID de una partición
sudo blkid /dev/sdb1
\`\`\`

\`\`\`text
/dev/sdb1: LABEL="RESPALDOS" UUID="4b29c911-3832-48df-b51e-e2f4949a21b3" BLOCK_SIZE="4096" TYPE="ext4"
\`\`\`

### 📖 Anatomía de /etc/fstab

\`\`\`bash
# Estructura de cada línea:
# <dispositivo>  <punto_montaje>  <tipo_fs>  <opciones>  <dump>  <pass>

# Ejemplo con UUID (recomendado para producción):
UUID=4b29c911-3832-48df-b51e-e2f4949a21b3  /srv/backups  ext4  defaults,noatime  0  2

# Ejemplo con LABEL (más legible):
LABEL=RESPALDOS  /srv/backups  ext4  defaults,noatime  0  2
\`\`\`

### 📖 Los seis campos de fstab

| Campo | Valor | Significado |
| --- | --- | --- |
| 1 — Dispositivo | \`UUID=...\` o \`LABEL=...\` | Qué montar. Nunca usar \`/dev/sdX\`. |
| 2 — Punto de montaje | \`/srv/backups\` | Dónde montar. El directorio debe existir. |
| 3 — Tipo de filesystem | \`ext4\`, \`xfs\`, \`btrfs\` | Tipo del sistema de archivos. |
| 4 — Opciones | \`defaults,noatime\` | Opciones de montaje. |
| 5 — Dump | \`0\` | Backup con \`dump\`. Siempre \`0\` hoy en día. |
| 6 — Pass | \`0\`, \`1\` o \`2\` | Orden de \`fsck\`. \`1\` = raíz, \`2\` = otros, \`0\` = no chequear. |

### 📖 Opciones de montaje importantes

| Opción | Efecto |
| --- | --- |
| \`defaults\` | rw, suid, dev, exec, auto, nouser, async |
| \`noatime\` | No actualizar timestamp de acceso al leer. Mejora rendimiento y vida útil de SSD. |
| \`ro\` | Montar en solo lectura. |
| \`noexec\` | Prohibir ejecución de binarios. Útil para \`/tmp\`. |
| \`nofail\` | No fallar el arranque si el dispositivo no está disponible. Útil para discos externos. |

### 💻 Configurar montaje persistente paso a paso

\`\`\`bash
# 1. Obtener el UUID
sudo blkid /dev/sdb1

# 2. Hacer backup de fstab (CRÍTICO)
sudo cp /etc/fstab /etc/fstab.bak

# 3. Editar fstab
sudo nano /etc/fstab
# Añadir al final:
# UUID=4b29c911-3832-48df-b51e-e2f4949a21b3  /srv/backups  ext4  defaults,noatime  0  2

# 4. Crear el punto de montaje si no existe
sudo mkdir -p /srv/backups

# 5. Validar SIN reiniciar (OBLIGATORIO)
sudo mount -a
# Sin output = sin errores

# 6. Verificar que está montado
findmnt /srv/backups
df -h /srv/backups
\`\`\`

### ⚠️ La regla más importante

> **Siempre ejecuta \`sudo mount -a\` después de editar \`/etc/fstab\`.**
>
> Si hay un error en fstab y reinicias sin validar, el sistema entrará en **Emergency Mode**. Si el servidor es remoto, perderás acceso. Corregir fstab desde Emergency Mode requiere acceso físico o consola de rescate.

### 📋 Lo que debes recordar

* **Nunca uses \`/dev/sdX\` en fstab.** Usa \`UUID=\` o \`LABEL=\`.
* \`blkid\` es la fuente del UUID.
* **Backup de fstab antes de editar:** \`cp /etc/fstab /etc/fstab.bak\`
* **Siempre valida con \`mount -a\`** antes de reiniciar.
* \`noatime\` reduce escrituras innecesarias — úsala en SSDs y cargas de lectura intensiva.

### 🧪 Autoevaluación

1. Editas \`/etc/fstab\` y reinicias sin validar. El sistema entra en Emergency Mode. ¿Cómo lo hubieras prevenido?
2. ¿Por qué \`UUID=\` es más seguro que \`LABEL=\` en fstab?
3. Tienes un disco USB externo que a veces no está conectado. ¿Qué opción de fstab evita que su ausencia rompa el arranque?

---

1. Ejecutando \`sudo mount -a\` antes de reiniciar. Si hubiera habido un error, el comando lo habría mostrado sin necesidad de reiniciar.
2. Los UUID son globalmente únicos. Una LABEL puede repetirse si dos discos tienen la misma etiqueta, causando comportamiento impredecible. UUID garantiza que siempre identifica exactamente ese filesystem.
3. La opción \`nofail\`: \`UUID=... /media/usb ext4 defaults,nofail 0 0\`
`
export default content
