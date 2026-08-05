const content = `
## Módulo 8 — Laboratorio integrador: Diagnóstico y reparación

### 🎯 Objetivos de aprendizaje

* Diagnosticar y reparar fallos comunes de montaje de disco.
* Realizar la técnica de **Chroot desde un Live USB** para reparar un sistema inaccesible o un gestor GRUB destruido.

### 🧪 Escenario 1: Reparar un archivo \`/etc/fstab\` corrupto

**Síntoma:** El sistema arranca pero se detiene en seco mostrando el mensaje \`Emergency mode\` debido a una ruta de disco inexistente en \`/etc/fstab\`.

\`\`\`text
               DIAGNÓSTICO Y SOLUCIÓN DE FSTAB

  [Fallo de arranque] ──► Ingresar clave Root ──► journalctl -xb | grep -i failed
                                                         │
                                                         ▼
  systemctl reboot ◄── Corregir error en /etc/fstab ◄── mount -o remount,rw /
\`\`\`

#### Procedimiento de reparación:

1. Ingresa a la consola de mantenimiento introduciendo la clave de root.
2. Localiza el punto de montaje fallido:

\`\`\`bash
journalctl -xb | grep -i "failed"
\`\`\`

3. Vuelve a montar el sistema de archivos raíz con permisos de escritura:

\`\`\`bash
mount -o remount,rw /
\`\`\`

4. Edita el archivo de montaje de discos:

\`\`\`bash
nano /etc/fstab
\`\`\`

5. Comenta (coloca \`#\` al inicio) o corrige la línea del disco defectuoso.
6. Reinicia el servidor:

\`\`\`bash
systemctl reboot
\`\`\`

### 🧪 Escenario 2: Reinstalación de GRUB dañado utilizando Chroot desde un Live USB

**Síntoma:** El disco principal perdió el sector de arranque y el equipo muestra el mensaje \`grub rescue>\` o un error indicando que no hay dispositivo de arranque.

\`\`\`text
               TÉCNICA CHROOT DESDE LIVE USB

  ┌─────────────────────────────────────────────────────────────┐
  │ 1. Iniciar sistema desde un Live USB de Linux.              │
  │ 2. Montar partición raíz del disco duro en /mnt.            │
  │ 3. Enlazar pseudo-sistemas: /dev, /proc, /sys hacia /mnt.   │
  │ 4. Ejecutar: chroot /mnt                                    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │      ¡AHORA OPERAS DENTRO DEL DISCO DURO DAÑADO!            │
  │  - Ejecutar: grub-install /dev/sda                          │
  │  - Ejecutar: update-grub                                    │
  └─────────────────────────────────────────────────────────────┘
\`\`\`

#### Guía paso a paso:

1. Inicia el equipo utilizando una distribución en modo **Live USB**.
2. Abre la consola de comandos del sistema Live.
3. Identifica la partición del disco duro donde reside el sistema operativo instalado:

\`\`\`bash
sudo lsblk
# En este ejemplo: /dev/sda2 es la raíz (/), y /dev/sda1 es la partición EFI
\`\`\`

4. Monta el directorio raíz dañado en el punto de montaje \`/mnt\` de la sesión Live:

\`\`\`bash
sudo mount /dev/sda2 /mnt
sudo mount /dev/sda1 /mnt/boot/efi   # Únicamente en sistemas UEFI
\`\`\`

5. Realiza el montaje vinculante (*bind mount*) de los sistemas de archivos especiales del kernel:

\`\`\`bash
for dir in /dev /dev/pts /proc /sys /run; do sudo mount --bind $dir /mnt$dir; done
\`\`\`

6. Realiza el cambio de raíz para ingresar al sistema del disco duro:

\`\`\`bash
sudo chroot /mnt
\`\`\`

7. Reinstala y compila la configuración del cargador de arranque:

\`\`\`bash
# En distribuciones Debian / Ubuntu:
grub-install /dev/sda
update-grub

# En distribuciones RHEL / Fedora:
grub2-install /dev/sda
grub2-mkconfig -o /boot/grub2/grub.cfg
\`\`\`

8. Sal del entorno chroot, desmonta las unidades y reinicia:

\`\`\`bash
exit
sudo reboot
\`\`\`

### 📋 Lo que debes recordar

* **Qué hace:** Proporciona los procedimientos para recuperar sistemas Linux inaccesibles mediante entornos Live o consolas de emergencia.
* **Técnica clave:** El proceso **Chroot** permite reparar un sistema operativo dañado operando desde un sistema independiente cargado en USB.
* **Comando indispensable:** \`mount --bind\` para proyectar recursos virtuales de hardware (\`/dev\`, \`/proc\`, \`/sys\`) al interior del entorno \`chroot\`.

### 🧪 Autoevaluación rápida

1. ¿Para qué se utiliza la opción \`--bind\` del comando \`mount\` al preparar un entorno \`chroot\`?
2. Si el sistema se bloquea por un error en \`/etc/fstab\`, ¿por qué no es posible editar directamente ese archivo en el primer intento?
3. ¿Cuál es el propósito del comando \`chroot\` en una tarea de rescate de servidor?

---

1. Para conectar los directorios del kernel del sistema activo (\`/dev\`, \`/proc\`, \`/sys\`) al interior del directorio montado en \`/mnt\`, permitiendo que los comandos del Chroot puedan interactuar con el hardware.
2. Porque el sistema de emergencia monta la partición raíz en modo **solo lectura** (\`ro\`). Debe re-montarse primero en modo \`rw\`.
3. Cambiar la raíz del sistema operativo activo (en este caso el Live USB) por la estructura de archivos montada del disco duro dañado.
`

export default content
