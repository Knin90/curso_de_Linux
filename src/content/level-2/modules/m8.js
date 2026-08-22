const content = `
## Módulo 8 — Proyecto real: runbook de incidentes de arranque

### 🎯 Objetivos de aprendizaje

* Diagnosticar y reparar fallos comunes de montaje de disco (\`/etc/fstab\` corrupto).
* Reparar un cargador GRUB destruido usando \`chroot\` desde un Live USB.
* Dejar evidencia escrita (runbook) de cada incidente para el equipo de guardia.

### ❓ El problema real

Eres el administrador de guardia de un equipo pequeño de operaciones. Dos servidores dejan de arrancar la misma semana: uno se queda en \`Emergency mode\` por un \`/etc/fstab\` corrupto, y otro pierde por completo el sector de arranque y muestra \`grub rescue>\`. El equipo no tiene un procedimiento escrito para estos casos, así que se te pide construir un runbook de incidentes de arranque: scripts reproducibles para cada escenario, más un informe posterior (\`postmortem.md\`) que documente qué pasó y cómo se resolvió, para que la próxima persona de guardia no tenga que improvisar.

### 📖 Estructura del proyecto

\`\`\`
incident-boot-recovery/
├── diagnostico.sh
├── reparar-fstab.sh
├── reparar-grub-chroot.sh
└── postmortem.md
\`\`\`

### 📖 diagnostico.sh — primeros pasos al llegar a un servidor que no arranca

\`\`\`bash
#!/bin/bash
# Ejecutar desde la consola de mantenimiento (modo emergencia) o desde un Live USB.
set -euo pipefail

echo "== Revisando el journal en busca de fallos =="
journalctl -xb | grep -i "failed" || echo "Sin coincidencias de 'failed'"

echo "== Estado de montajes actuales =="
mount | grep " / "
\`\`\`

### 📖 reparar-fstab.sh — incidente 1: \`/etc/fstab\` corrupto

**Síntoma:** el sistema arranca pero se detiene en \`Emergency mode\` porque \`/etc/fstab\` referencia un disco inexistente.

\`\`\`bash
#!/bin/bash
# Se ejecuta desde la consola de mantenimiento, tras entrar con la clave de root.
set -euo pipefail

# 1. Remontar la raíz con permisos de escritura (la consola de emergencia monta en solo lectura)
mount -o remount,rw /

# 2. Abrir el archivo de montajes para localizar y corregir/comentar la línea defectuosa
nano /etc/fstab

# 3. Reiniciar una vez corregido
systemctl reboot
\`\`\`

### 📖 reparar-grub-chroot.sh — incidente 2: GRUB destruido

**Síntoma:** el disco perdió el sector de arranque; el equipo muestra \`grub rescue>\` o "no bootable device".

\`\`\`bash
#!/bin/bash
# Se ejecuta desde una sesión Live USB (no desde el disco dañado).
set -euo pipefail

# 1. Identificar la partición raíz del sistema dañado
sudo lsblk
# En este incidente: /dev/sda2 es la raíz (/), /dev/sda1 es la partición EFI

# 2. Montar el sistema dañado en /mnt
sudo mount /dev/sda2 /mnt
sudo mount /dev/sda1 /mnt/boot/efi   # solo en sistemas UEFI

# 3. Enlazar los sistemas de archivos especiales del kernel
for dir in /dev /dev/pts /proc /sys /run; do
  sudo mount --bind "\$dir" "/mnt\$dir"
done

# 4. Cambiar la raíz al sistema dañado
sudo chroot /mnt <<'CHROOT'
# Debian / Ubuntu:
grub-install /dev/sda
update-grub

# RHEL / Fedora (usar en su lugar si aplica):
# grub2-install /dev/sda
# grub2-mkconfig -o /boot/grub2/grub.cfg
CHROOT

# 5. Salir, desmontar y reiniciar
sudo umount -R /mnt
sudo reboot
\`\`\`

### 📖 postmortem.md — informe posterior al incidente

\`\`\`text
Incidente:      Fallo doble de arranque (fstab corrupto + GRUB destruido)
Servidores:     srv-web-01, srv-db-02
Detección:      journalctl -xb | grep -i failed
Causa raíz 1:   entrada obsoleta en /etc/fstab tras retirar un disco de datos
Causa raíz 2:   escritura accidental en el sector de arranque durante un
                reparticionado manual sin respaldo previo
Resolución:     ver diagnostico.sh, reparar-fstab.sh, reparar-grub-chroot.sh
Tiempo total:   38 minutos
Seguimiento:    agregar validación de fstab al pipeline de aprovisionamiento
                antes de retirar cualquier disco
\`\`\`

### 📖 Secuencia de ejecución

1. Al recibir la alerta de arranque fallido, ejecuta \`diagnostico.sh\` para confirmar si el journal reporta un fallo de montaje.
2. Si el fallo es \`/etc/fstab\`, sigue \`reparar-fstab.sh\` paso a paso desde la consola de mantenimiento.

Salida esperada al finalizar la reparación de fstab:

\`\`\`
== Revisando el journal en busca de fallos ==
systemd[1]: Failed to mount /mnt/datos.
== Estado de montajes actuales ==
/dev/sda2 on / type ext4 (rw,relatime)
\`\`\`

3. Si el fallo es de GRUB, arranca el servidor desde un Live USB y sigue \`reparar-grub-chroot.sh\`.

Salida esperada tras \`grub-install\` y \`update-grub\` dentro del chroot:

\`\`\`
Installing for x86_64-efi platform.
Installation finished. No error reported.
Generating grub configuration file ...
Found linux image: /boot/vmlinuz-6.5.0-14-generic
Found initrd image: /boot/initrd.img-6.5.0-14-generic
done
\`\`\`

4. Redacta \`postmortem.md\` con la causa raíz y el tiempo de resolución, y archívalo con el resto de incidentes del equipo.

### 📋 Lo que debes recordar

* **Qué hace:** documenta procedimientos reproducibles para recuperar sistemas Linux que no arrancan, en lugar de improvisar cada vez.
* **Técnica clave:** \`chroot\` permite reparar un sistema dañado operando desde un entorno independiente (Live USB) que monta ese disco como raíz temporal.
* **Comando indispensable:** \`mount --bind\` proyecta \`/dev\`, \`/proc\` y \`/sys\` del sistema Live dentro del \`chroot\`, sin lo cual \`grub-install\` no puede ver el hardware real.
* Un incidente sin \`postmortem.md\` es un incidente que se va a repetir.

### 🧪 Autoevaluación

1. ¿Para qué se usa la opción \`--bind\` del comando \`mount\` al preparar un entorno \`chroot\`?
2. Si el sistema se bloquea por un error en \`/etc/fstab\`, ¿por qué no se puede editar directamente ese archivo en el primer intento?
3. ¿Cuál es el propósito de \`chroot\` en una tarea de rescate como la del incidente 2?

---

1. Conecta los directorios del kernel del sistema activo (\`/dev\`, \`/proc\`, \`/sys\`) dentro del directorio montado en \`/mnt\`, para que los comandos ejecutados en el \`chroot\` puedan interactuar con el hardware real.
2. Porque la consola de emergencia monta la partición raíz en modo **solo lectura** (\`ro\`); debe remontarse primero en modo \`rw\` con \`mount -o remount,rw /\`.
3. Cambiar la raíz del sistema operativo activo (el Live USB) por la estructura de archivos montada del disco dañado, para poder reinstalar GRUB como si se estuviera ejecutando dentro del propio sistema afectado.
`

export default content
