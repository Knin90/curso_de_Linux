const content = `
## Módulo 3 — Particionado GPT con fdisk y gdisk

### 🎯 Objetivos de aprendizaje

* Entender la diferencia entre MBR y GPT y por qué GPT es el estándar moderno.
* Crear una tabla de particiones GPT y particiones con \`fdisk\` y \`gdisk\`.
* Verificar el resultado y entender los límites de cada tipo de tabla.

### 📖 MBR vs GPT: por qué importa la elección

\`\`\`text
  MBR (Master Boot Record) — Legado
  ──────────────────────────────────────────────────
  Máximo disco:  2 TB
  Particiones:   4 primarias (o 3 + extendida + lógicas)
  Redundancia:   Ninguna — si se corrompe, el disco es inutilizable
  Soporte UEFI:  Limitado
  Año de diseño: 1983

  GPT (GUID Partition Table) — Estándar moderno
  ──────────────────────────────────────────────────
  Máximo disco:  8 ZiB (prácticamente ilimitado)
  Particiones:   128 primarias por defecto
  Redundancia:   Tabla duplicada al inicio y al final del disco
  Soporte UEFI:  Nativo (requerido para arranque UEFI)
  Año de diseño: 1990s con UEFI
\`\`\`

> En 2026, cualquier disco nuevo debe usar GPT. MBR solo tiene sentido para hardware muy antiguo (sin UEFI) o por compatibilidad con sistemas legacy específicos.

### 💻 Particionado con fdisk (soporta GPT desde versión moderna)

\`\`\`bash
# Abrir el disco nuevo para particionar
sudo fdisk /dev/sdb
\`\`\`

Comandos dentro de \`fdisk\`:

\`\`\`text
  g         → Crear nueva tabla GPT (borra todo lo que había)
  n         → Nueva partición
              Partition number: Enter (acepta el siguiente disponible)
              First sector: Enter (acepta el inicio por defecto)
              Last sector: Enter (acepta el final = toda la partición)
                           o "+50G" para exactamente 50 GB
                           o "+500M" para 500 MB
  p         → Previsualizar la tabla de particiones (sin guardar)
  d         → Eliminar una partición
  t         → Cambiar el tipo de partición
  w         → Escribir los cambios al disco (IRREVERSIBLE)
  q         → Salir sin guardar
\`\`\`

**Ejemplo: partición única que ocupa todo el disco:**

\`\`\`bash
sudo fdisk /dev/sdb
# g → n → Enter → Enter → Enter → w
\`\`\`

**Ejemplo: dos particiones (50 GB datos + resto swap):**

\`\`\`bash
sudo fdisk /dev/sdb
# g → n → Enter → Enter → +50G → n → Enter → Enter → Enter → w
\`\`\`

### 💻 Particionado con gdisk (diseñado exclusivamente para GPT)

\`gdisk\` es más explícito sobre GPT y tiene mejores mensajes de error:

\`\`\`bash
sudo gdisk /dev/sdb
\`\`\`

Comandos dentro de \`gdisk\`:

\`\`\`text
  ?         → Ayuda
  o         → Crear nueva tabla GPT vacía
  n         → Nueva partición
  p         → Ver tabla actual
  i         → Información de una partición
  d         → Eliminar partición
  w         → Escribir y salir (confirmar con Y)
  q         → Salir sin cambios
\`\`\`

### 💻 Verificar el resultado

\`\`\`bash
# Ver la tabla de particiones recién creada
sudo fdisk -l /dev/sdb

# Ver en árbol (debería aparecer sdb1)
lsblk /dev/sdb

# Verificar que el kernel reconoció la nueva partición
# (a veces necesita actualizar la tabla en memoria)
sudo partprobe /dev/sdb
# o
sudo blockdev --rereadpt /dev/sdb
\`\`\`

### 📖 Tipos de partición importantes

\`\`\`bash
# Ver tipos disponibles dentro de fdisk
# t → L para listar tipos

# Los más comunes:
# 20 = Linux filesystem (ext4, xfs, btrfs)
# 19 = Linux swap
# 1  = EFI System (para /boot/efi)
# 4  = BIOS boot (para GRUB legacy en discos GPT)
\`\`\`

### ⚠️ Advertencia crítica

**Verificar tres veces el dispositivo correcto antes de ejecutar \`fdisk\` o \`gdisk\`.**

\`\`\`bash
# Confirmar qué disco es el nuevo ANTES de particionar
lsblk -f
sudo fdisk -l | grep "Disk /dev"
\`\`\`

> Una partición creada en el disco equivocado destruye la tabla de particiones de ese disco. No hay deshacer en \`fdisk\` una vez que escribes con \`w\`.

### 📋 Lo que debes recordar

* GPT es el estándar moderno: soporta discos > 2 TB, 128 particiones, redundancia de tabla.
* \`fdisk\` moderno soporta GPT. \`gdisk\` es exclusivo para GPT y más explícito.
* Dentro de \`fdisk\`/\`gdisk\`: \`p\` para previsualizar antes de \`w\` para confirmar.
* Después de particionar: \`sudo partprobe /dev/sdX\` si el kernel no ve la nueva partición.
* Siempre verificar el dispositivo correcto con \`lsblk -f\` ANTES de ejecutar cualquier comando de particionado.

### 🧪 Autoevaluación rápida

1. ¿Por qué GPT soporta 128 particiones y MBR solo 4?
2. Dentro de \`fdisk\`, creaste una partición y ves con \`p\` que todo está bien. Luego presionas \`q\`. ¿Qué pasó con los cambios?
3. Particionaste \`/dev/sdb\` y ejecutas \`lsblk\` pero \`sdb1\` no aparece. ¿Qué comando ejecutas?

---

1. MBR reserva solo 64 bytes para la tabla de particiones, suficiente para 4 entradas. GPT usa una estructura de 128 entradas por diseño, cada una con su propio GUID único.
2. **Nada** — \`q\` sale sin guardar. Los cambios solo se aplican al disco cuando presionas \`w\`.
3. \`sudo partprobe /dev/sdb\` — fuerza al kernel a re-leer la tabla de particiones del disco.
`
export default content
