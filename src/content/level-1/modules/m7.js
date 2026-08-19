const content = `
## Módulo 7 — Dual Boot

### 🎯 Objetivos de aprendizaje

* Configurar un entorno de arranque dual entre Windows y Linux en un mismo disco.
* Prevenir bloqueos del sistema de archivos y pérdida de datos durante el proceso.

### ❓ Problema real que resuelve

Ciertas aplicaciones o dispositivos requieren acceso directo al hardware (*bare-metal*), imposibilitando el uso de máquinas virtuales, pero obligando a mantener dos sistemas operativos alternativos en el mismo equipo.

### 📖 Explicación técnica

El arranque dual requiere modificar la estructura de particiones existente para liberar espacio no asignado donde se instalará el segundo sistema operativo.

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Partición ESP (FAT32)","icon":"disk","rows":["Bootloaders:","/EFI/Microsoft/","/EFI/ubuntu/ (GRUB)"]},{"title":"Partición Windows","rows":["System (NTFS)"]},{"title":"Partición Linux","rows":["System (ext4 / btrfs)"]}]}
\`\`\`

### 🚨 Requisitos y precauciones críticas antes de modificar particiones

#### 1. Desactivación de Windows Fast Startup (Inicio Rápido)

Windows utiliza un apagado híbrido que guarda el estado del kernel en disco. Esto deja la partición NTFS en estado "ocupado" (*dirty bit*), impidiendo que Linux modifique las particiones o monte el disco.

**Cómo desactivarlo en Windows:**

1. Abre el *Panel de control* → *Opciones de energía*.
2. Haz clic en *"Elegir el comportamiento de los botones de inicio/apagado"*.
3. Haz clic en *"Cambiar la configuración no disponible actualmente"*.
4. Desmarca la casilla **"Activar inicio rápido (recomendado)"** y guarda los cambios.

\`\`\`powershell
# O mediante PowerShell (como Administrador):
Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power' -Name 'HiberbootEnabled' -Value 0
\`\`\`

#### 2. Gestión de BitLocker (Cifrado de disco)

Si el disco de Windows está cifrado con BitLocker, el instalador de Linux no podrá reducir la partición ni leer su contenido.

**Procedimiento:**

1. Obtén y guarda la clave de recuperación de BitLocker de 48 dígitos (desde tu cuenta de Microsoft).
2. Suspende temporalmente la protección antes de cambiar el tamaño de la partición:

\`\`\`powershell
# Ejecutar en PowerShell como Administrador
Suspend-BitLocker -MountPoint "C:" -RebootCount 0
\`\`\`

### 💻 Ejemplo básico

Pasos para preparar un arranque dual:

1. Desactivar **Fast Startup** y suspender **BitLocker** en Windows.
2. Reducir la partición \`C:\` desde el *Administrador de discos* de Windows (*diskmgmt.msc*).
3. Iniciar el equipo desde el Live USB de Linux.
4. Seleccionar la opción de instalación *"Instalar junto a Windows"*.

### 🧪 Laboratorio guiado

1. Practica la preparación para Dual Boot dentro de una VM que contenga un Windows virtualizado.
2. Aplica la deshabilitación del inicio rápido y verifica el estado de montaje de la partición.
3. Realiza la instalación de Linux en el espacio no asignado y analiza el menú de selección de GRUB tras reiniciar.
`

export default content
