const content = `
## Módulo 2 — Particionado GPT profesional con fdisk y gdisk

### 🎯 Objetivos de aprendizaje

* Entender qué es GPT y por qué reemplazó a MBR.
* Crear tablas de particiones y particiones con \`fdisk\` y \`gdisk\`.
* Verificar el resultado con \`lsblk\` y \`fdisk -l\`.

### 📖 GPT vs MBR

| Característica | MBR (legacy) | GPT (moderno) |
| --- | --- | --- |
| Tamaño máximo de disco | 2 TB | 9.4 ZB (prácticamente ilimitado) |
| Particiones primarias | 4 | 128 |
| Redundancia | Ninguna | Tabla de respaldo al final del disco |
| Compatibilidad UEFI | No | Sí (requerida para arranque UEFI) |
| Identificador de partición | Número | GUID único |

> En 2026, todo disco nuevo debe usar GPT. MBR existe solo en hardware muy antiguo.

### 📖 Anatomía de la tabla GPT

\`\`\`text
Inicio del disco
├── Sector 0: MBR protector (por compatibilidad con herramientas antiguas)
├── Sector 1: GPT Header (tamaño del disco, número de particiones, CRC32)
├── Sectores 2-33: Tabla de particiones (128 entradas × 128 bytes)
├── Sectores 34+: Datos (particiones reales)
│
└── Final del disco:
    ├── Tabla de particiones de respaldo
    └── GPT Header de respaldo
\`\`\`

### 💻 Particionado con fdisk (moderno, soporta GPT)

\`\`\`bash
# Abrir el disco
sudo fdisk /dev/sdb

# Dentro de fdisk:
# g   → crear nueva tabla GPT (borra todo el disco)
# n   → nueva partición
#       Enter → número por defecto (1)
#       Enter → primer sector por defecto (2048)
#       Enter → último sector por defecto (usa todo el disco)
# p   → ver la tabla antes de escribir
# w   → escribir cambios y salir (irreversible)
\`\`\`

\`\`\`bash
# Forzar que el kernel re-lea la tabla (sin reiniciar)
sudo partprobe /dev/sdb

# Verificar
lsblk /dev/sdb
sudo fdisk -l /dev/sdb
\`\`\`

### 💻 Particionado con gdisk (exclusivo GPT)

\`\`\`bash
sudo gdisk /dev/sdb
# ?   → ayuda
# n   → nueva partición
# w   → escribir y confirmar con Y
\`\`\`

### 💻 Ver la tabla de particiones actual

\`\`\`bash
# Listar todas las particiones de todos los discos
sudo fdisk -l

# Solo un disco específico
sudo fdisk -l /dev/sdb

# Vista de árbol
lsblk /dev/sdb
\`\`\`

**Antes y después de crear la partición:**

\`\`\`text
ANTES:
NAME  MAJ:MIN RM SIZE RO TYPE MOUNTPOINTS
sdb     8:16   0 100G  0 disk

DESPUÉS:
NAME  MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sdb     8:16   0  100G  0 disk
└─sdb1  8:17   0  100G  0 part
\`\`\`

### 📋 Lo que debes recordar

* Usar siempre **GPT** en discos modernos. \`fdisk\` moderno lo soporta nativamente.
* \`partprobe\` evita tener que reiniciar para que el kernel detecte la nueva tabla.
* **Verificar tres veces el dispositivo** antes de ejecutar \`fdisk\`. \`lsblk -f\` primero.
* \`w\` en \`fdisk\` es **irreversible**. Destruye la tabla anterior y todos los datos.

### 🧪 Autoevaluación

1. ¿Cuál es el límite de tamaño de disco de MBR? ¿Y de GPT?
2. Creaste una partición con \`fdisk\` pero \`lsblk\` aún no la muestra. ¿Qué comando ejecutas?
3. ¿Qué pasa si ejecutas \`fdisk /dev/sda\` en vez de \`fdisk /dev/sdb\`?

---

1. MBR: **2 TB**. GPT: **9.4 ZB** (límite práctico ilimitado).
2. \`sudo partprobe /dev/sdb\` — fuerza al kernel a re-leer la tabla de particiones.
3. Modificas el disco del sistema operativo. Si ejecutas \`w\`, corrompes el sistema. Siempre verificar con \`lsblk\` antes.
`
export default content
