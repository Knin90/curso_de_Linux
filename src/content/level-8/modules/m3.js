const content = `
## Módulo 3 — Estructura interna de los sistemas de archivos

### 🎯 Objetivos de aprendizaje

* Entender qué construye \`mkfs.ext4\` sobre la partición.
* Comprender el rol del superblock, inodos, journal y bloques de datos.
* Saber por qué los inodos son tan críticos como los bloques de espacio libre.

### 📖 ¿Qué es un sistema de archivos?

Una partición recién creada (\`/dev/sdb1\`) es solo una secuencia numerada de bloques vacíos. No existen carpetas. No existen nombres de archivos. No existen permisos.

El **sistema de archivos** instala una estructura sobre esos bloques que define cómo se crean, leen, modifican y protegen los archivos.

> Las aplicaciones no ven bloques. Ven directorios y archivos porque el filesystem traduce \`/home/usuario/doc.txt\` en bloques físicos específicos del disco.

### 📖 Qué construye mkfs.ext4

\`\`\`text
Partición vacía (bloques sin estructura)

        ↓  mkfs.ext4 /dev/sdb1

┌────────────────────────────────────────┐
│  Superblock                            │ ← Metadatos maestros
│  (tamaño total, bloques libres,        │   Se replica cada 32768 bloques
│   estado del filesystem, magic number) │
├────────────────────────────────────────┤
│  Tabla de inodos                       │ ← Un inodo por archivo/directorio
│  (permisos, propietario, tamaño,       │   Contiene punteros a bloques de datos
│   timestamps, punteros a bloques)      │   No contiene el nombre del archivo
├────────────────────────────────────────┤
│  Bitmap de bloques                     │ ← Mapa de bloques ocupados/libres
│  Bitmap de inodos                      │ ← Mapa de inodos en uso/disponibles
├────────────────────────────────────────┤
│  Journal (registro de transacciones)   │ ← Garantiza consistencia
│                                        │   tras un corte de energía
│                                        │   El kernel escribe aquí primero,
│                                        │   luego al destino final
├────────────────────────────────────────┤
│  Bloques de datos                      │ ← Aquí viven los contenidos
│                                        │   reales de los archivos
└────────────────────────────────────────┘
\`\`\`

### 📖 El inodo: la ficha de identidad de cada archivo

Cada archivo y directorio tiene exactamente **un inodo**. El inodo contiene:

* Tipo (archivo regular, directorio, enlace simbólico...)
* Permisos (\`rwxr-xr-x\`)
* Propietario y grupo (UID, GID)
* Tamaño en bytes
* Timestamps: creación, modificación, acceso
* Punteros a los bloques de datos donde está el contenido

> **Lo que el inodo NO contiene:** el nombre del archivo. El nombre vive en el directorio padre. Esto es por qué puedes tener dos rutas (hard links) apuntando al mismo inodo — y por qué \`mv\` dentro del mismo filesystem es instantáneo.

### 📖 El Journal: protección contra caídas de energía

Sin journal, un corte de energía durante una escritura puede dejar el filesystem en estado inconsistente (inodo actualizado pero bloques de datos no escritos, o viceversa).

Con journal:
1. El kernel escribe la operación al journal primero (secuencial, rápido).
2. Confirma que el journal está completo.
3. Aplica los cambios a su destino final.
4. Marca la transacción del journal como completada.

Al arrancar tras un crash, el kernel revisa el journal y completa o revierte cualquier transacción incompleta. El chequeo tarda segundos, no horas.

### 💻 Inspeccionar la estructura de un filesystem

\`\`\`bash
# Ver información del superblock y configuración de ext4
sudo tune2fs -l /dev/sdb1

# Ver conteo de inodos libres y usados
df -i

# Ver UUID y tipo de filesystem
sudo blkid /dev/sdb1
\`\`\`

**Ejemplo de salida de \`tune2fs -l\`:**

\`\`\`text
Filesystem volume name:   RESPALDOS
Last mounted on:          /srv/backups
Filesystem UUID:          4b29c911-3832-48df-b51e-e2f4949a21b3
Inode count:              6553600
Free inodes:              6553589
Block count:              26214400
Free blocks:              25876480
Block size:               4096
Journal size:             128M
\`\`\`

### 📋 Lo que debes recordar

* \`mkfs.ext4\` construye: superblock + tabla de inodos + bitmaps + journal + bloques de datos.
* Cada archivo tiene **un inodo**. Los inodos son finitos y se definen al formatear.
* El **journal** garantiza consistencia tras cuellos de botella o cortes de energía.
* \`df -i\` muestra inodos disponibles — tan crítico como \`df -h\` para espacio.

### 🧪 Autoevaluación

1. ¿Qué contiene un inodo? ¿Qué NO contiene?
2. \`df -h\` muestra 40% de espacio libre pero la aplicación reporta "No space left on device". ¿Qué investigas?
3. ¿Para qué sirve el journal en ext4?

---

1. El inodo contiene: permisos, propietario, tamaño, timestamps, punteros a bloques. **No contiene** el nombre del archivo (el nombre vive en el directorio padre).
2. Los **inodos** pueden estar llenos. Verificar con \`df -i\`.
3. El journal registra transacciones antes de aplicarlas. Permite recuperación rápida y consistente tras un crash o corte de energía.
`
export default content
