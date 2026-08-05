const content = `
## Módulo 6 — /etc/fstab: UUID, LABEL y persistencia

### 🎯 Objetivos de aprendizaje

* Entender por qué los montajes manuales no sobreviven al reinicio.
* Configurar \`/etc/fstab\` correctamente usando UUID y LABEL.
* Validar los cambios sin necesidad de reiniciar el servidor.

### ❓ El problema que resuelve fstab

\`\`\`text
  mount /dev/sdb1 /mnt/datos
        │
        ▼ El kernel añade la entrada a su tabla de montajes (RAM)
        │
        ▼ El servidor se reinicia
        │
        ▼ La tabla de montajes del kernel se reinicializa (vacía)
        │
        ▼ /mnt/datos está vacío — los archivos "desaparecieron"
\`\`\`

\`/etc/fstab\` es el archivo que systemd lee durante el arranque para restaurar todos los montajes. Cada línea es una instrucción de montaje persistente.

### ⚠️ UUID vs nombre de dispositivo: la regla más importante

\`\`\`text
  /dev/sdb1  ← PELIGROSO en fstab

  El kernel asigna sda/sdb/sdc en el orden que detecta los discos.
  Si añades otro disco, si cambia el orden de los controladores,
  o si el hardware tarda diferente al arrancar:

  Lo que era sdb puede convertirse en sdc.
  fstab apunta a sdb1 → ya no existe → Emergency Mode.

  UUID="4b29c911-..."  ← SEGURO en fstab

  El UUID está grabado en el superblock del filesystem.
  No cambia si el disco se mueve a otro puerto SATA.
  No cambia si añades más discos.
  Solo cambia si reformateas el disco.
\`\`\`

### 💻 Obtener UUID y LABEL

\`\`\`bash
# Ver UUID de todos los dispositivos
sudo blkid

# Ver UUID de un dispositivo específico
sudo blkid /dev/sdb1
# /dev/sdb1: LABEL="BACKUP_DATOS" UUID="4b29c911-3832-48df-b51e-e2f4949a21b3" TYPE="ext4"

# Ver con lsblk (más limpio para scripting)
lsblk -f /dev/sdb1
\`\`\`

### 📖 Anatomía de /etc/fstab

\`\`\`text
# <dispositivo>                                   <mountpoint>   <type>  <options>        <dump> <pass>
UUID=4b29c911-3832-48df-b51e-e2f4949a21b3         /mnt/datos     ext4    defaults,noatime   0      2
LABEL=BACKUP_DATOS                                /srv/backups   ext4    defaults,noatime   0      2
UUID=b2c3d4e5-f6a7-8901-bcde-f23456789012         /              ext4    errors=remount-ro  0      1
\`\`\`

**Descripción de cada campo:**

| Campo | Valores | Significado |
| --- | --- | --- |
| 1 — dispositivo | \`UUID=...\`, \`LABEL=...\`, \`/dev/sdX\` | Qué montar (siempre UUID o LABEL en producción) |
| 2 — mountpoint | \`/mnt/datos\`, \`/\`, \`swap\` | Dónde montar |
| 3 — type | \`ext4\`, \`xfs\`, \`swap\`, \`vfat\`, \`auto\` | Tipo de filesystem |
| 4 — options | \`defaults\`, \`noatime\`, \`ro\`, \`noexec\` | Opciones de montaje |
| 5 — dump | \`0\` o \`1\` | Si \`dump\` hace backup de este FS (0 = no, casi siempre 0) |
| 6 — pass | \`0\`, \`1\`, \`2\` | Orden de \`fsck\` al arrancar (0=no, 1=raíz, 2=otros) |

### 💻 Editar fstab correctamente

\`\`\`bash
# 1. Obtener el UUID
sudo blkid /dev/sdb1
# UUID="4b29c911-3832-48df-b51e-e2f4949a21b3"

# 2. Hacer copia de seguridad SIEMPRE antes de editar
sudo cp /etc/fstab /etc/fstab.bak

# 3. Editar
sudo nano /etc/fstab

# Añadir la línea:
# UUID=4b29c911-3832-48df-b51e-e2f4949a21b3 /mnt/datos ext4 defaults,noatime 0 2

# 4. VALIDAR antes de reiniciar (OBLIGATORIO)
sudo mount -a

# Si mount -a no muestra errores → seguro reiniciar
# Si mount -a muestra un error → corregir fstab AHORA, NO reiniciar
\`\`\`

### 📖 mount -a: el comando que salva servidores

\`\`\`text
  sudo mount -a
        │
        ▼ Lee /etc/fstab línea por línea
        │
        ├── ¿Está ya montado? → salta
        ├── ¿UUID existe? → monta
        └── ¿UUID no existe o error de sintaxis? → muestra error aquí

  Si hay un error y NO ejecutas mount -a:
  → Reinicias confiando en fstab
  → systemd intenta montar → falla
  → El sistema entra en Emergency Mode
  → Necesitas acceso físico o consola de recuperación para corregir
\`\`\`

### 💻 Opciones de fstab más usadas en producción

\`\`\`bash
# Datos de aplicación (lectura/escritura, sin actualizar atime)
UUID=xxxx /var/lib/postgresql xfs defaults,noatime 0 2

# Datos en solo lectura (auditoría, backups históricos)
UUID=xxxx /mnt/archivo ext4 ro,noatime 0 2

# Directorio web (sin ejecución de binarios, seguridad adicional)
UUID=xxxx /var/www/uploads ext4 defaults,noexec,nosuid 0 2

# Swap
UUID=xxxx none swap sw 0 0
\`\`\`

### 📋 Lo que debes recordar

* \`/etc/fstab\` = la memoria del sistema para montajes permanentes.
* Siempre UUID o LABEL — nunca \`/dev/sdX\` en producción.
* Siempre \`sudo mount -a\` después de editar — nunca reiniciar a ciegas.
* Siempre \`cp /etc/fstab /etc/fstab.bak\` antes de editar.
* \`pass\` = 1 para la raíz, 2 para otros, 0 para no verificar.

### 🧪 Autoevaluación rápida

1. ¿Por qué es peligroso usar \`/dev/sdb1\` en \`/etc/fstab\`?
2. Editaste \`/etc/fstab\` y pusiste un UUID incorrecto. \`sudo mount -a\` muestra un error. ¿Qué haces?
3. ¿Qué significa \`pass=2\` en la última columna de \`/etc/fstab\`?

---

1. Porque el nombre del dispositivo puede cambiar si se añaden discos o cambia el orden de detección del kernel. El sistema puede arrancar en Emergency Mode si \`sdb1\` ya no existe o apunta al disco equivocado.
2. Corregir \`/etc/fstab\` (o restaurar \`fstab.bak\`) hasta que \`mount -a\` no muestre errores. **No reiniciar** hasta que el comando valide correctamente.
3. Este filesystem será verificado por \`fsck\` durante el arranque, pero **después** de los filesystems con \`pass=1\` (que es siempre la partición raíz \`/\`).
`
export default content
