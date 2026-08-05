const content = `
## Módulo 1 — Firmware: BIOS y UEFI

### 🎯 Objetivos de aprendizaje

* Entender qué es el firmware y por qué es lo primero que se ejecuta al encender un equipo.
* Diferenciar BIOS heredado (Legacy) de UEFI.
* Saber navegar y acceder a la configuración de firmware de una máquina real o virtual.

### ❓ Problema real que resuelve

Antes de que exista un sistema operativo, alguien tiene que decirle al hardware: *"enciende la CPU, revisa la memoria y busca dónde está el sistema que debes arrancar"*. Sin firmware, un ordenador es un bloque de silicio inerte.

### 💡 Analogía

El firmware es como el **recepcionista de un edificio de oficinas**: no hace el trabajo de ninguna empresa dentro del edificio, pero es el primero en recibirte, comprobar que las luces y ascensores funcionen, y dirigirte al piso correcto (el sistema operativo).

### 📖 Explicación técnica

* **BIOS** *(Basic Input/Output System)*: firmware de 16 bits heredado de los años 80. Usa un **Master Boot Record (MBR)** para localizar el sistema operativo. Está limitado a discos de hasta 2 TB y un máximo de 4 particiones primarias.
* **UEFI** *(Unified Extensible Firmware Interface)*: estándar moderno que reemplaza al BIOS. Soporta discos de gran capacidad (usa **GPT**), arranca más rápido, incluye su propia mini-shell, soporta red integrada y permite **Secure Boot**.
* Casi todo el hardware fabricado desde ~2012 usa UEFI, incorporando en muchos casos un modo de compatibilidad denominado **CSM** *(Compatibility Support Module)* para arrancar sistemas antiguos en modo BIOS.

### ⚙️ ¿Qué ocurre internamente?

Secuencia de arranque en un entorno UEFI:

\`\`\`text
Se enciende la máquina
        │
        ▼
POST (Power-On Self Test) — El firmware revisa CPU, RAM y dispositivos
        │
        ▼
UEFI carga su entorno y lee las entradas de arranque registradas en la NVRAM
        │
        ▼
Busca el bootloader en la partición EFI (ESP - EFI System Partition)
        │
        ▼
Entrega el control al bootloader (ej. GRUB) → Continúa en el Nivel 2
\`\`\`

> **Nota:** En BIOS heredado, en lugar de leer una partición EFI, el firmware lee directamente los primeros 512 bytes del disco (el MBR) para ejecutar un bootloader más simple.

### 💻 Ejemplo básico

Verificar si el sistema actual arrancó en modo UEFI o BIOS:

\`\`\`bash
[ -d /sys/firmware/efi ] && echo "UEFI" || echo "BIOS Legacy"
\`\`\`

Listar las entradas de arranque registradas en la NVRAM UEFI:

\`\`\`bash
efibootmgr -v
\`\`\`

Forzar el reinicio directo a la pantalla de configuración del firmware sin presionar teclas al encender:

\`\`\`bash
# Desde Linux
sudo systemctl reboot --firmware-setup

# Desde Windows (PowerShell / CMD como Administrador)
shutdown /r /fw /t 0
\`\`\`

### 🏢 Caso de uso profesional

Al desplegar servidores físicos en un datacenter, los administradores configuran el firmware para **arrancar automáticamente tras un corte de luz** (*Restore on AC Power Loss*) y activan el **arranque por red (PXE)** desde UEFI. Esto permite instalar sistemas operativos de forma remota en decenas de servidores sin interacción física.

### 🧪 Laboratorio guiado

1. Reinicia una máquina (física o virtual) e ingresa a la configuración de firmware (\`Supr\`, \`F2\` o \`F12\` según el fabricante, o usa el comando directo de reinicio a firmware).
2. Identifica si el firmware es BIOS o UEFI observando la interfaz gráfica y el soporte para ratón.
3. Localiza la sección **Boot Order** (Orden de arranque) y analiza la prioridad de los dispositivos.
4. Si es UEFI, identifica el estado de **Secure Boot**.

### ⚠️ Errores comunes

* **Confundir "actualizar firmware" con "resetear configuración":** actualizar el firmware (*flashear*) reescribe el chip ROM; un fallo en el proceso puede dejar la placa inoperativa (*brick*).
* **Incompatibilidad de modo:** instalar Linux en modo Legacy en un disco con tabla GPT (o viceversa), provocando que el sistema no arranque tras finalizar la instalación.

### ✅ Resultado esperado

El estudiante puede identificar el tipo de firmware de cualquier equipo, navegar su interfaz y comprender su rol en la cadena de arranque.

### 📚 Resumen

El firmware es el primer código ejecutado al encender un equipo. UEFI es el estándar actual, ofreciendo mayor flexibilidad, velocidad y seguridad que BIOS.

### 📖 Glosario del módulo

* **POST:** Autodiagnóstico de hardware inicial.
* **NVRAM:** Memoria no volátil donde UEFI almacena las variables de arranque.
* **ESP:** Partición especial formateada en FAT32 donde UEFI busca los gestores de arranque.
* **CSM:** Modo de compatibilidad en UEFI para simular un entorno BIOS Legacy.
`

export default content
