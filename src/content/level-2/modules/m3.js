const content = `
## Módulo 3 — Disco RAM inicial: initramfs / initrd

### 🎯 Objetivos de aprendizaje

* Entender la necesidad fundamental de un sistema de archivos temporal en RAM.
* Explicar el concepto y funcionamiento del mecanismo \`pivot_root\`.
* Inspeccionar y regenerar imágenes de \`initramfs\` ante cambios de controladores o hardware.

### ❓ El dilema del kernel

\`\`\`diagram
{"type":"flow-stack","layers":[{"name":"El dilema del kernel","meta":"Necesita drivers para leer el disco, pero necesita leer el disco para cargar los drivers","focal":true},{"name":"¿Cómo salir del bucle?"}],"edges":[{"label":"paradoja"}]}
\`\`\`

**La respuesta:** Necesitamos una "caja de herramientas intermedia" empaquetada junto con el kernel que se cargue directamente en memoria RAM: **\`initramfs\`**.

### 📖 Explicación técnica: ¿Cómo funciona initramfs?

1. GRUB deposita en la RAM dos archivos: el kernel ejecutable (\`vmlinuz\`) y el archivo comprimido (\`initramfs.img\`).
2. El kernel descomprime \`initramfs\` creando una estructura de archivos temporal en RAM (*tmpfs*).
3. Se ejecuta el script \`/init\` dentro de la RAM, cargando los módulos de kernel específicos para el almacenamiento (drivers de controladoras RAID, descifrado LUKS, volúmenes LVM, etc.).
4. Una vez detectado el disco duro real, se ejecuta **\`pivot_root\`**: el sistema intercambia el directorio raíz temporal en RAM por la partición raíz real montada desde el disco duro.

\`\`\`diagram
{"type":"flow-stack","layers":[{"tag":"1","icon":"disk","name":"Carga initramfs en RAM (tmpfs)","meta":"/init carga módulos: nvme.ko, dm-crypt.ko, ext4.ko"},{"tag":"2","icon":"database","name":"Monta el disco real en /sysroot","meta":"Descubre el almacenamiento definitivo"},{"tag":"3","icon":"sync","name":"pivot_root /sysroot","meta":"La partición del disco pasa a ser la nueva / · se libera la RAM de initramfs","focal":true}],"edges":[{"label":"detecta discos"},{"label":"pivot_root"}]}
\`\`\`

### 💻 Comandos de inspección y regeneración

#### 1. Ver qué controladores contiene la imagen initramfs actual:

\`\`\`bash
# En Debian / Ubuntu:
lsinitramfs /boot/initrd.img-$(uname -r) | grep -i "lvm"

# En RHEL / Fedora / AlmaLinux:
sudo lsinitrd /boot/initramfs-$(uname -r).img | grep -i "btrfs"
\`\`\`

#### 2. Regenerar la imagen initramfs (tras actualizar drivers o cambiar hardware):

\`\`\`bash
# En Debian / Ubuntu:
sudo update-initramfs -u -k all

# En RHEL / Fedora (vía Dracut):
sudo dracut --force
\`\`\`

### 🏢 Caso de uso profesional

Al clonar una máquina física a un entorno virtualizado (proceso P2V), el nuevo servidor fallará con el error \`Kernel Panic - not syncing: VFS: Unable to mount root fs\`. Esto ocurre porque el \`initramfs\` original no contiene los controladores virtuales de disco (como \`virtio_blk\`). La solución consiste en iniciar desde un Live USB y **regenerar la imagen initramfs**.

### 📋 Lo que debes recordar

* **Qué hace:** Proporciona un entorno de archivos temporal en memoria RAM con los drivers necesarios para alcanzar el disco real.
* **Cuándo ocurre:** Inmediatamente después de que el kernel toma el control y antes de montar la raíz (\`/\`).
* **Archivos clave:** \`/boot/initrd.img-*\` o \`/boot/initramfs-*.img\`.
* **Comandos clave:** \`update-initramfs\` (Debian/Ubuntu), \`dracut\` (RHEL), \`lsinitramfs\` / \`lsinitrd\` (inspección).
* **Operación crítica:** \`pivot_root\` hace la permuta entre la memoria RAM temporal y el disco definitivo.

### 🧪 Autoevaluación rápida

1. ¿Cuál es el problema circular que resuelve la existencia de \`initramfs\`?
2. ¿Qué función cumple la instrucción \`pivot_root\`?
3. Si migras un disco a una controladora RAID desconocida y el sistema no arranca, ¿qué componente requiere actualización?

---

1. Que el kernel necesita controladores en disco para leer el disco donde están guardados esos mismos controladores.
2. Intercambia el sistema de archivos temporal montado en memoria RAM por el sistema de archivos raíz definitivo del disco duro.
3. La imagen **\`initramfs\`**, incorporando los módulos del kernel para la nueva controladora RAID.
`

export default content
