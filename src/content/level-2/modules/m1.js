const content = `
## Módulo 1 — La cadena de arranque global: del POST al PID 1

### 🎯 Objetivos de aprendizaje

* Dominar de memoria las 5 etapas consecutivas del proceso de arranque en Linux.
* Identificar qué componente tiene el control en cada fase y los puntos de traspaso (*handoff*).
* Distinguir las diferencias estructurales entre los sistemas **BIOS** y **UEFI**.
* Reconocer en qué fase se encuentra el equipo mediante pistas visuales y sensoriales.

### ❓ Problema real que resuelve

Cuando un equipo falla al encender, el mensaje de error o el estado de la pantalla revela en qué etapa exacta se ha detenido. Diagnosticar sin este mapa mental es actuar a ciegas.

### 🗺️ Visión global del proceso

\`\`\`diagram
{"type":"flow-stack","layers":[{"icon":"desktop","name":"Botón de encendido"},{"tag":"L1","icon":"chip","name":"POST / Firmware","meta":"BIOS o UEFI"},{"tag":"L2","icon":"disk","name":"GRUB2","meta":"Bootloader"},{"tag":"L3","icon":"package","name":"Kernel + initramfs","meta":"Carga en RAM"},{"tag":"L4","icon":"sync","name":"pivot_root","meta":"Cambio de raíz"},{"tag":"L5","icon":"server","name":"systemd (PID 1)","meta":"Espacio de usuario","focal":true},{"icon":"user","name":"Login"}],"edges":[{"label":"POST"},{"label":"carga GRUB"},{"label":"carga kernel"},{"label":"pivot_root"},{"label":"exec init"},{"label":"login"}]}
\`\`\`

### 👑 Tabla de control: ¿Quién gobierna la máquina en cada etapa?

| Etapa | ¿Quién controla la máquina? | Ubicación física / Memoria | Responsabilidad principal |
| --- | --- | --- | --- |
| **1. POST** | **Firmware** (BIOS o UEFI) | Chip ROM/NVRAM en la placa base | Diagnosticar hardware básico y localizar el disco de arranque. |
| **2. Bootloader** | **GRUB2** | Sector de arranque (MBR) o Partición ESP | Presentar menú, seleccionar kernel y cargarlo en RAM. |
| **3. Early Kernel** | **Kernel + initramfs** | Memoria RAM (*tmpfs*) | Cargar drivers esenciales y montar la partición raíz (\`/\`) real. |
| **4. Switch Root** | **Kernel definitivo** | Memoria RAM | Ejecutar \`pivot_root\` y transferir el control al proceso inicial. |
| **5. Userspace** | **\`systemd\`** (PID 1) | Disco principal / RAM | Levantar servicios en paralelo y preparar el entorno de usuario. |
| **6. Login** | **Usuario** / Shell / GUI | Espacio de usuario | Permitir la interacción autenticada. |

### 💡 Analogía: La carrera de relevos espacial

El arranque es como el **despegue de un cohete espacial**:

1. **La torre de lanzamiento (Firmware):** Realiza comprobaciones iniciales y enciende los motores.
2. **El cohete propulsor (GRUB):** Eleva la nave fuera de la atmósfera inicial.
3. **El módulo de maniobra (initramfs):** Despliega los paneles y ajusta la trayectoria.
4. **La nave principal (Kernel + systemd):** Entra en órbita estable y activa los sistemas de soporte vital.

Si el testigo se cae en cualquier relevo, la misión se aborta.

### 📦 BIOS vs. UEFI: La primera bifurcación del camino

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Sistema BIOS","rows":["Ejecuta POST desde el chip ROM","Lee el sector MBR (primeros 512 bytes del disco)","Carga el Bootloader (GRUB)"]},{"title":"Sistema UEFI","rows":["Ejecuta POST desde chip NVRAM","Lee la partición ESP (VFAT)","Ejecuta directamente el binario EFI (ej. /EFI/boot/bootx64.efi)"]}],"vsLabel":"VS"}
\`\`\`

### 🔗 Hilo narrativo: El flujo de traspasos (*Handoffs*)

1. **Del Firmware a GRUB:** El firmware finaliza la comprobación del hardware (*POST*), localiza el disco en la NVRAM/MBR y pasa el control a la dirección de memoria donde reside **GRUB**.
2. **De GRUB al Kernel:** GRUB lee su configuración, carga el archivo del kernel (\`vmlinuz\`) y la imagen \`initramfs\` en la memoria RAM, e instruye a la CPU para que salte al punto de entrada del kernel.
3. **Del Kernel a initramfs:** El kernel se desinteresa de GRUB, inicia sus subsistemas en RAM y ejecuta el script \`/init\` que está empaquetado dentro de \`initramfs\`.
4. **De initramfs a systemd:** \`initramfs\` carga los controladores de disco duro, descubre y monta la raíz real (\`/\`), ejecuta \`pivot_root\` y llama al binario \`/sbin/init\` (que es un enlace a \`systemd\`).

### 👁️ Pistas de diagnóstico rápido

| Etapa | Pistas visuales / sensoriales | ¿Qué está pasando internamente? |
| --- | --- | --- |
| **1. POST** | Logotipo del fabricante (Dell, HP, Lenovo), pitidos cortos, lista de RAM/CPUs. | El hardware se autochequea antes de buscar software. |
| **2. GRUB** | Menú interactivo con fondo oscuro listando sistemas operativos o kernels. | El gestor de arranque espera instrucciones del usuario o el timeout. |
| **3. Kernel** | Texto blanco desplazándose rápidamente sobre pantalla negra (*Boot log*). | El kernel detecta el hardware e inicializa los controladores. |
| **4. systemd** | Lista de comprobaciones con marcas verdes \`[ OK ]\` o rojas \`[ FAILED ]\`. | Los servicios del espacio de usuario se están iniciando en paralelo. |
| **5. Login** | Pantalla gráfica de inicio de sesión (GDM/SDDM) o prompt \`hostname login:\`. | El sistema está listo para recibir comandos del usuario. |

### 💻 Comandos de inspección inicial

Comprobar los mensajes generados por el kernel durante el arranque actual:

\`\`\`bash
dmesg | head -n 30
\`\`\`

Filtrar el buffer del kernel para ver únicamente los discos detectados en el arranque:

\`\`\`bash
dmesg | grep -i "sda\\|nvme"
\`\`\`

### 🏢 Caso de uso profesional

En servidores remotos o instancias en la nube (AWS, Azure) que sufren un cuelgue al reiniciar, consultar la **consola serie** te permite identificar la etapa del fallo: si no hay mensajes de \`[ OK ]\`, el problema está en GRUB o en la imagen \`initramfs\`; si los hay, el fallo es un servicio bloqueado en \`systemd\`.

### 📋 Lo que debes recordar

* **Qué hace:** Describe el recorrido del sistema desde el impulso eléctrico hasta el entorno interactivo.
* **Cuándo ocurre:** Durante los primeros 5 a 30 segundos tras presionar el botón de encendido.
* **Componentes clave:** Firmware (BIOS/UEFI), Bootloader (GRUB2), Kernel, \`initramfs\`, \`systemd\`.
* **Comando principal:** \`dmesg\` para revisar los mensajes emitidos por el kernel.
* **Punto de diagnóstico:** El tipo de pantalla (Logotipo / Menú GRUB / Texto blanco / Prompt) indica la etapa exacta del problema.

### 🧪 Autoevaluación rápida

1. ¿Quién tiene el control de la CPU durante la comprobación de memoria RAM al encender el equipo?
2. ¿Cuál es la diferencia principal en la forma en que BIOS y UEFI localizan el gestor de arranque?
3. ¿En qué momento exacto se realiza la transición entre el espacio de kernel y la ejecución del PID 1?

---

1. El **Firmware** (BIOS o UEFI).
2. BIOS lee los primeros 512 bytes del disco (MBR); UEFI lee un archivo \`.efi\` desde una partición formateada en FAT32 (ESP).
3. Tras montar la partición raíz real y realizar la operación \`pivot_root\`, reemplazando la imagen temporal en RAM por \`/sbin/init\`.
`

export default content
