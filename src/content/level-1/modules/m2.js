const content = `
## Módulo 2 — Particionado de disco: MBR vs GPT

### 🎯 Objetivos de aprendizaje

* Comprender qué es una tabla de particiones y por qué el disco la requiere.
* Comparar MBR y GPT para determinar cuál utilizar según el escenario.

### ❓ Problema real que resuelve

Un disco físico es un espacio continuo de almacenamiento. Sin una tabla de particiones, el sistema operativo no sabría dónde inicia ni dónde termina cada sección lógica (sistema, datos, área de intercambio, etc.).

### 💡 Analogía

Un disco sin particionar es un **terreno sin cercar**. La tabla de particiones es el **plano catastral**: define los límites exactos de cada lote y qué uso tiene asignado.

### 📖 Explicación técnica

| Característica | MBR (Master Boot Record) | GPT (GUID Partition Table) |
| --- | --- | --- |
| **Límite de particiones** | 4 primarias (o 3 primarias + 1 extendida) | 128 particiones primarias |
| **Capacidad máxima** | 2 TB por disco | 9.4 ZB (Zettabytes) |
| **Redundancia** | Sin copia de respaldo | Copia de seguridad al final del disco |
| **Requisito UEFI** | No (requiere modo CSM/Legacy) | **Sí (Estándar nativo)** |

### ⚙️ ¿Qué ocurre internamente?

Al leer el disco, el firmware consulta la tabla de particiones. En GPT, cada partición cuenta con un **GUID único** *(Globally Unique Identifier)* y un código de tipo estandarizado. La partición de sistema EFI (ESP) tiene un GUID idéntico en cualquier sistema operativo, lo que permite que Windows y Linux compartan el mismo disco sin sobrescribirse.

### 💻 Ejemplo básico

Consultar la tabla de particiones de un disco desde la terminal:

\`\`\`bash
sudo parted /dev/sda print
\`\`\`

*La salida indicará \`Partition Table: gpt\` o \`Partition Table: msdos\` (nombre técnico de MBR en Linux).*

### 🏢 Caso de uso profesional

Al migrar servidores legados con discos MBR a infraestructura UEFI moderna, los administradores emplean herramientas como \`sgdisk\` para convertir las tablas MBR a GPT **sin pérdida de datos**:

\`\`\`bash
sudo sgdisk -g /dev/sda
\`\`\`

### 🧪 Laboratorio guiado

1. En una máquina virtual de prueba, ejecuta \`sudo parted -l\` para examinar la estructura de discos.
2. Compara los campos de tipo de tabla de particiones entre distintas unidades.
3. Explora la herramienta interactiva \`gdisk /dev/sdX\` en modo consulta (\`p\`) para observar los GUIDs asociados.

### ⚠️ Errores comunes

* Intentar instalar un sistema en modo UEFI sobre un disco con tabla de particiones MBR sin habilitar CSM.
* Convertir una tabla de particiones sin haber realizado un respaldo previo.

### ✅ Resultado esperado

El estudiante identifica la estructura de particiones de un disco y selecciona el esquema correcto previo a la instalación.

### 📚 Resumen

GPT es el estándar moderno indispensable para sistemas UEFI, eliminando las restricciones de tamaño y cantidad de particiones propias de MBR.
`

export default content
