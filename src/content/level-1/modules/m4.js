const content = `
## Módulo 4 — Virtualización (VMware, VirtualBox, GNOME Boxes)

### 🎯 Objetivos de aprendizaje

* Desplegar hipervisores tipo 2 para crear entornos aislados de prueba.
* Configurar recursos de hardware virtualizados de forma equilibrada.

### ❓ Problema real que resuelve

Modificar particiones o probar instalaciones directamente en el equipo principal conlleva el riesgo de pérdida de datos. La virtualización ofrece una capa de abstracción para experimentar con total seguridad.

### 💡 Analogía

Una máquina virtual es como un **simulador de vuelo**: permite entrenar en situaciones críticas sin poner en riesgo el avión real.

### 📖 Explicación técnica

Un **hipervisor** es la capa de software que administra la asignación de hardware (CPU, RAM, almacenamiento, red) entre el sistema anfitrión (*host*) y los sistemas invitados (*guest*).

\`\`\`text
   +-------------------------------------------------------+
   |             Sistema Anfitrión (Host OS)               |
   +-------------------------------------------------------+
   |          Hipervisor (VirtualBox / VMware)             |
   +-------------------------------------------------------+
   |  Máquina Virtual 1 (Guest)  |  Máquina Virtual 2 (Guest)|
   |  (Ubuntu - 2GB RAM / GPT)   |  (Fedora - 4GB RAM / GPT) |
   +-------------------------------------------------------+
\`\`\`

### 💻 Ejemplo básico

Creación de una VM mediante la interfaz de comandos de VirtualBox (\`VBoxManage\`):

\`\`\`bash
# Crear la definición de la VM
VBoxManage createvm --name "ServidorPruebas" --ostype "Ubuntu_64" --register

# Configurar memoria RAM, VRAM y CPUs
VBoxManage modifyvm "ServidorPruebas" --memory 2048 --vram 16 --cpus 2

# Crear un disco duro virtual de 20 GB
VBoxManage createhd --filename "ServidorPruebas.vdi" --size 20000
\`\`\`

### 🏢 Caso de uso profesional

Los administradores de sistemas utilizan la virtualización local para validar cambios en scripts de automatización (ej. Ansible, Terraform) antes de aplicarlos en entornos de producción.

### 🧪 Laboratorio guiado

1. Verifica que la extensión de virtualización por hardware (**VT-x** en Intel o **AMD-V** en AMD) esté activa en el firmware de tu equipo.
2. Instala VirtualBox, VMware Workstation Player o GNOME Boxes.
3. Crea un perfil de máquina virtual asignando 2 vCPUs, 2048 MB de RAM y un disco de 20 GB con formato de expansión dinámica.

### ⚠️ Errores comunes

* Asignar más del 50% de la memoria RAM o de los núcleos físicos del host a la VM, causando degradación severa del rendimiento general.
* Intentar ejecutar hipervisores sin haber activado **VT-x/AMD-V** en el UEFI, lo que impide ejecutar sistemas de 64 bits.

### ✅ Resultado esperado

El estudiante cuenta con un hipervisor instalado y una VM correctamente configurada para el laboratorio integrador.
`

export default content
