const content = `
## Módulo 2 — Gestor de arranque GRUB2

### 🎯 Objetivos de aprendizaje

* Comprender la arquitectura modular de archivos de GRUB2.
* Modificar parámetros del kernel en caliente (edición interactiva) y de forma permanente.
* Compilar la configuración final sin editar archivos generados automáticamente.

### ❓ Problema real que resuelve

Si necesitas modificar el comportamiento del sistema (desactivar la aceleración gráfica, modificar nombres de interfaces de red o ingresar en modo de recuperación), debes pasarte esos parámetros al kernel a través de GRUB antes de que el sistema inicie.

### 📖 Explicación técnica: La arquitectura de GRUB2

**GRUB2** (*GRand Unified Bootloader*) es un sistema operativo en miniatura: posee sus propios controladores de disco para leer ext4, XFS o Btrfs, entender tablas de particiones y cargar archivos desde el disco duro a la RAM.

\`\`\`text
                  ARCHIVOS DE ORIGEN (Editables)
         ┌──────────────────────────────────────────────┐
         │  /etc/default/grub (Configuración general)   │
         │  /etc/grub.d/*     (Scripts de menú)         │
         └──────────────────────┬───────────────────────┘
                                │
                                │  Ejecución de update-grub
                                ▼
                  ARCHIVO COMPILADO (¡NO EDITAR!)
         ┌──────────────────────────────────────────────┐
         │  /boot/grub/grub.cfg (Debian/Ubuntu)         │
         │  /boot/grub2/grub.cfg (RHEL/Fedora)          │
         └──────────────────────────────────────────────┘
\`\`\`

> **¡REGLA DE ORO!**
> **NUNCA** edites directamente \`/boot/grub/grub.cfg\`. Este archivo es generado automáticamente.
> Los cambios directos se sobrescribirán en la siguiente actualización del kernel.

### 💻 Ejemplos prácticos

#### 1. Editar parámetros de forma permanente:

\`\`\`bash
sudo nano /etc/default/grub
\`\`\`

Ubica la línea \`GRUB_CMDLINE_LINUX_DEFAULT\` y elimina \`quiet splash\` para ver los mensajes detallados:

\`\`\`text
GRUB_CMDLINE_LINUX_DEFAULT="nosplash"
\`\`\`

#### 2. Aplicar y compilar los cambios:

\`\`\`bash
# En Debian / Ubuntu:
sudo update-grub

# En RHEL / Fedora / AlmaLinux:
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
\`\`\`

### ⚙️ Modificación de parámetros en caliente

Cuando el menú de GRUB esté en pantalla:

1. Presiona la tecla **\`e\`** sobre la opción deseada.
2. Navega con las flechas hasta la línea que comienza por \`linux\`, \`linux16\` o \`linuxefi\`.
3. Añade al final de la línea el parámetro necesario (ejemplo: \`nomodeset\` para evitar fallos de video).
4. Presiona **\`Ctrl + X\`** o **\`F10\`** para arrancar temporalmente con ese parámetro.

\`\`\`text
  ┌────────────────────────────────────────────────────────────────────────┐
  │ linux /boot/vmlinuz-6.8.0-generic root=UUID=x-x-x ro quiet nomodeset   │
  │                                                      ▲                 │
  │                                      Parámetro añadido en caliente     │
  └────────────────────────────────────────────────────────────────────────┘
\`\`\`

### 🏢 Caso de uso profesional

Configurar consolas serie en servidores dedicados o instancias cloud ajustando \`console=ttyS0,115200\` dentro de \`/etc/default/grub\`. Esto permite administrar el servidor incluso si la tarjeta de red se desconfigura.

### 📋 Lo que debes recordar

* **Qué hace:** Presenta el menú de selección de SO y carga el kernel en memoria RAM con parámetros específicos.
* **Cuándo ocurre:** Inmediatamente después del chequeo de hardware (POST).
* **Archivos clave:** \`/etc/default/grub\` (origen), \`/etc/grub.d/\` (scripts), \`/boot/grub/grub.cfg\` (resultado final compilado).
* **Comandos clave:** \`update-grub\` o \`grub2-mkconfig -o /boot/grub2/grub.cfg\`.
* **Diagnóstico:** Si aparece el prompt \`grub>\`, el gestor no puede encontrar su archivo de configuración o el kernel en el disco.

### 🧪 Autoevaluación rápida

1. ¿Por qué es un error modificar directamente el archivo \`/boot/grub/grub.cfg\`?
2. ¿Qué tecla debes presionar en el menú de GRUB para editar la línea de comandos del kernel en caliente?
3. ¿Qué comando se utiliza en sistemas RHEL/CentOS para regenerar el archivo compilado de GRUB2?

---

1. Porque es un archivo compilado automáticamente y se sobrescribirá al actualizar el kernel o la configuración.
2. La tecla **\`e\`**.
3. \`sudo grub2-mkconfig -o /boot/grub2/grub.cfg\`
`

export default content
