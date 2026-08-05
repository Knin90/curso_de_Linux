const content = `
## Módulo 6 — Live USB

### 🎯 Objetivos de aprendizaje

* Crear medios de instalación y rescate en unidades USB.
* Verificar la integridad de las imágenes de disco (ISO) descargadas.

### ❓ Problema real que resuelve

Para instalar un sistema operativo en un equipo limpio o recuperarlo de un fallo que le impide arrancar, es necesario contar con un entorno de ejecución independiente almacenado en un medio extraíble.

### 💡 Analogía

Un Live USB es como un **equipo de primeros auxilios portátil**: contiene todo lo necesario para operar en el lugar sin alterar la infraestructura permanente a menos que sea indicado.

### 📖 Explicación técnica

Una imagen ISO grabada en modo "Live" carga el kernel y el sistema de archivos comprimido (*SquashFS*) directamente en la memoria RAM. Esto permite probar el hardware del equipo sin escribir datos en el disco almacenamiento interno.

### 💻 Ejemplo básico

**1. Verificación del Checksum SHA256 (Linux / Windows):**

\`\`\`bash
# En Linux
sha256sum ubuntu-24.04-desktop-amd64.iso

# En Windows (PowerShell)
Get-FileHash -Algorithm SHA256 .\\ubuntu-24.04-desktop-amd64.iso
\`\`\`

**2. Grabación directa mediante línea de comandos (Linux):**

\`\`\`bash
# Identificar el dispositivo USB (ej. /dev/sdb)
lsblk

# Escribir la imagen ISO en el USB de forma síncrona
sudo dd if=ubuntu-24.04-desktop-amd64.iso of=/dev/sdb bs=4M status=progress oflag=sync
\`\`\`

### 🏢 Caso de uso profesional

Los administradores conservan unidades USB de rescate con herramientas como **SystemRescue** o **GParted Live** para restablecer contraseñas de superusuario olvidadas, reparar la configuración de GRUB o clonar discos con fallos sectores.

### 🧪 Laboratorio guiado

1. Descarga la ISO de una distribución Linux y obtén su código hash SHA256 oficial desde la página del proveedor.
2. Compara el valor hash calculado localmente con el oficial para garantizar la integridad del archivo.
3. Utiliza herramientas gráficas como **balenaEtcher** / **Rufus** o el comando \`dd\` para volcar la imagen a una unidad USB.

### ⚠️ Errores comunes

* **Peligro con \`dd\`:** Seleccionar por error el disco interno (\`/dev/sda\`) en lugar de la unidad USB (\`/dev/sdb\`). El comando \`dd\` sobrescribirá la unidad de destino de forma irreversible y sin pedir confirmación.
`

export default content
