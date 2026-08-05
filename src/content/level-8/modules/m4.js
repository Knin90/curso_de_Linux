const content = `
## Módulo 4 — Comparativa ext4, xfs y btrfs: cuándo usar cada uno

### 🎯 Objetivos de aprendizaje

* Entender las diferencias arquitectónicas entre ext4, xfs y btrfs.
* Saber cuándo elegir cada sistema de archivos según el caso de uso.
* Reconocer los límites y restricciones de cada opción.

### 📖 Los tres principales en Linux

\`\`\`text
ext4 ─── Estabilidad y compatibilidad universal
xfs  ─── Alto rendimiento en archivos grandes y alta concurrencia
btrfs─── Snapshots nativos, copy-on-write, uso en desktops
\`\`\`

### 📖 Comparativa técnica

| Característica | ext4 | xfs | btrfs |
| --- | --- | --- | --- |
| **Madurez** | Muy alta (estable desde 2008) | Alta (producción desde 1994) | Media (estable, pero evoluciona) |
| **Journal** | Sí (data/ordered/writeback) | Sí | No necesita (COW) |
| **Inodos** | Fijos al formatear | Dinámicos (crecen según necesidad) | Dinámicos |
| **Archivos individuales máx.** | 16 TB | 8 EB | 16 EB |
| **Filesystem máx.** | 1 EB | 8 EB | 16 EB |
| **Snapshots** | No nativos | No nativos | Nativos (COW) |
| **Compresión** | No | No | Sí (zlib, lzo, zstd) |
| **Resize en caliente** | Crecer: sí. Reducir: sí | Solo crecer | Crecer: sí. Reducir: limitado |
| **RAID nativo** | No | No | Sí (pero btrfs RAID tiene advertencias) |
| **Rendimiento en archivos grandes** | Bueno | Excelente | Bueno |
| **Rendimiento en muchos archivos pequeños** | Bueno | Bueno | Variable |
| **Uso en producción** | Universal | Bases de datos, almacenamiento masivo | Desktops, Fedora/SUSE por defecto |

### 📖 Guía de selección

**Usa ext4 cuando:**
* Necesitas compatibilidad garantizada con todas las herramientas.
* Es un sistema operativo de propósito general.
* No sabes cuál elegir — ext4 raramente es la respuesta incorrecta.
* Necesitas reducir (shrink) el filesystem en el futuro.

**Usa xfs cuando:**
* Tienes una base de datos (PostgreSQL, MySQL, MongoDB).
* Los archivos son grandes (backups, logs, multimedia).
* Hay alta concurrencia de escrituras.
* Necesitas inodos dinámicos (millones de archivos pequeños).

**Usa btrfs cuando:**
* Quieres snapshots nativos para entornos de desarrollo o CI/CD.
* Necesitas compresión transparente para ahorrar espacio.
* Estás en un desktop (Fedora lo usa por defecto).
* No confíes en btrfs RAID en producción crítica sin backups externos.

### 🏢 Caso profesional

Tienes un servidor PostgreSQL con tablas de 500 GB. Usas \`ext4\` y notas que los \`VACUUM FULL\` son lentos y generan latencia en las queries. ¿Por qué?

Ext4 tiene un pool de inodos fijo. Con millones de tablas de trabajo temporales y alta concurrencia, los locks sobre la estructura de inodos se convierten en un cuello de botella.

Migrar los datos a una partición **xfs**: sus **Allocation Groups** permiten operaciones de metadatos en paralelo sobre regiones distintas del disco. El \`VACUUM\` deja de serializar operaciones de metadatos.

### 📋 Lo que debes recordar

* **ext4** = opción predeterminada segura para la mayoría de casos.
* **xfs** = mejor en archivos grandes, bases de datos, alta concurrencia e inodos dinámicos.
* **btrfs** = snapshots y compresión nativos, mejor para desktops y CI/CD.
* Ninguno de los tres es "el mejor" — depende del workload.

### 🧪 Autoevaluación

1. ¿Por qué xfs puede ser mejor que ext4 en un servidor PostgreSQL?
2. ¿Cuál es la principal ventaja de btrfs sobre ext4 y xfs?
3. Tienes un servidor de correo con millones de mensajes pequeños. \`df -h\` muestra espacio libre pero no puedes crear archivos. ¿Qué filesystem mitigaría esto mejor?

---

1. xfs tiene **inodos dinámicos** y **Allocation Groups** para operaciones de metadatos en paralelo, lo que reduce la contención en cargas de alta concurrencia.
2. **Snapshots nativos** mediante Copy-on-Write: puedes crear un snapshot instantáneo sin copiar datos.
3. **xfs**: sus inodos dinámicos no se agotan como los inodos fijos de ext4. En ext4, el número de inodos se fija al formatear con \`mkfs.ext4\`.
`
export default content
