const content = `
## Módulo 8 — Laboratorio integrador: instalación real

### 🎯 Objetivos de aprendizaje

* Completar la instalación de tres distribuciones representativas del ecosistema Linux: **Ubuntu**, **Fedora** y **Debian**.
* Evaluar las diferencias entre los instaladores **Calamares/Subiquity**, **Anaconda** y el **Instalador de Debian**.

### 📖 Explicación técnica

Cada familia de distribuciones utiliza herramientas distintas para guiar el proceso de particionado, selección de paquetes y creación de usuarios:

\`\`\`diagram
{"type":"tree","root":{"name":"Configuración de particionamiento","meta":"[1] Live USB en modo UEFI → [2] Verificación de tabla GPT y ESP","icon":"disk"},"children":[{"name":"Particionado guiado","meta":"Uso de todo el disco","edgeLabel":"automático","children":[{"name":"Instalación final","meta":"[4] Copia de archivos → [5] GRUB en ESP → [6] Usuario/root/zonas → [7] Reinicio"}]},{"name":"Particionado manual","meta":"/, /boot/efi, swap","edgeLabel":"manual","children":[{"name":"Instalación final","meta":"[4] Copia de archivos → [5] GRUB en ESP → [6] Usuario/root/zonas → [7] Reinicio"}]}]}
\`\`\`

### 📊 Comparativa de Instaladores

| Distribución | Nombre del Instalador | Características Principales |
| --- | --- | --- |
| **Ubuntu** | Subiquity / Calamares | Interfaz simplificada, detección automática de controladores propietarios. |
| **Fedora** | Anaconda | Enfoque en particionado avanzado, soporta Btrfs con subvolúmenes por defecto. |
| **Debian** | Debian Installer | Interfaz guiada por texto/gráfica tradicional, mayor nivel de control granular. |

### 💻 Comandos de verificación post-instalación

Tras completar cada instalación, ejecuta los siguientes comandos para validar la configuración del sistema:

\`\`\`bash
# 1. Validar la distribución e información del kernel
lsb_release -a
uname -r

# 2. Verificar el punto de montaje de la partición ESP
df -h /boot/efi

# 3. Validar el estado de las entradas de arranque en el firmware
sudo efibootmgr -v
\`\`\`

### 🧪 Laboratorio guiado

1. **Instalación 1 (Ubuntu):** Crea una VM en modo UEFI. Utiliza la opción de particionado automático y verifica la creación de la partición ESP.
2. **Instalación 2 (Fedora):** Crea una VM en modo UEFI. Selecciona el particionado manual y examina la estructura basada en **Btrfs**.
3. **Instalación 3 (Debian):** Realiza la instalación configurando la clave de \`root\` y un usuario sin privilegios.
4. **Captura de estado (Snapshot):** Toma una instantánea (*snapshot*) de cada máquina virtual limpia. Estas imágenes servirán como punto de partida para los laboratorios de los siguientes niveles.

### ✅ Resultado esperado

El estudiante cuenta con tres entornos virtuales completamente funcionales e identificará las diferencias de instalación entre las familias Debian/Ubuntu y Red Hat/Fedora.

---

## 🏁 Cierre del Nivel 1

Al completar este nivel, has adquirido los conocimientos teóricos y prácticos para:

* Identificar el firmware (**BIOS/UEFI**) y gestionar sus entradas de arranque.
* Estructurar el almacenamiento utilizando esquemas de particionado **MBR** o **GPT**.
* Administrar el estado de **Secure Boot** e importar claves **MOK**.
* Desplegar entornos virtuales en **hipervisores** y configurar **WSL2** en Windows.
* Generar medios de arranque **Live USB** seguros mediante hash SHA256.
* Planificar un **Arranque Dual** tomando en cuenta Fast Startup y BitLocker.
* Ejecutar instalaciones completas de **Ubuntu, Fedora y Debian**.
`

export default content
