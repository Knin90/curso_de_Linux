const content = `
## Módulo 8 — Proyecto real: provisionar un volumen de backups en un servidor de base de datos

### 🎯 Objetivos de aprendizaje

* Ejecutar el flujo completo de preparación de un disco nuevo: partición GPT, formateo, montaje y persistencia.
* Configurar \`/etc/fstab\` con UUID de forma segura, sin arriesgar un arranque roto.
* Diagnosticar y recuperar un punto de montaje que "desapareció" tras un reinicio.

### ❓ El problema real

Eres el administrador de un servidor de base de datos en producción. Acaban de agregar un disco de 100 GB (\`/dev/sdb\`) exclusivamente para guardar backups nocturnos. Debes dejarlo particionado, formateado y montado en \`/srv/backups\`, de forma que sobreviva a reinicios. Un compañero, mientras tanto, te avisa de un problema en otro servidor: montó un disco similar a mano ayer con \`mount\`, el servidor se reinició esta madrugada por una actualización de kernel, y ahora \`/mnt/datos\` aparece vacío. Debes resolver ambos casos con el mismo procedimiento disciplinado.

### 📖 Estructura del proyecto

\`\`\`
provision-disco-backups/
├── provisionar.sh
├── diagnostico-montaje-perdido.sh
└── fstab.entry
\`\`\`

### 📖 provisionar.sh — flujo completo de disco nuevo

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "[1] Verificando que el disco existe..."
lsblk -f
# sdb debe aparecer sin FSTYPE ni MOUNTPOINTS

echo "[2] Creando tabla GPT y partición completa..."
# Interactivo: sudo fdisk /dev/sdb  →  g → n → Enter → Enter → Enter → w
sudo partprobe /dev/sdb
lsblk /dev/sdb

echo "[3] Formateando con ext4 y asignando etiqueta..."
sudo mkfs.ext4 -L RESPALDOS /dev/sdb1
lsblk -f /dev/sdb

echo "[4] Creando punto de montaje..."
sudo mkdir -p /srv/backups

echo "[5] Montando temporalmente para verificar..."
sudo mount /dev/sdb1 /srv/backups
findmnt /srv/backups

echo "[6] Obteniendo UUID para fstab..."
sudo blkid /dev/sdb1
\`\`\`

Los pasos [2] a [6] son la mitad "temporal" del trabajo: prueban que el disco funciona, pero no sobreviven a un reinicio hasta que se registran en \`fstab\`.

### 📖 fstab.entry — línea a añadir a /etc/fstab

\`\`\`text
# Respaldos nocturnos de la base de datos — agregado 2024-01-15
UUID=4a3f9c2e-1234-4b8a-9abc-987654321def /srv/backups ext4 defaults,noatime 0 2
\`\`\`

Usar siempre \`UUID=\`, nunca \`/dev/sdb1\` directamente: el nombre del dispositivo puede cambiar entre reinicios si se agregan o quitan discos, pero el UUID es fijo al filesystem.

### 📖 diagnostico-montaje-perdido.sh — recuperación del caso reportado

\`\`\`bash
#!/bin/bash
# Diagnóstico de abajo hacia arriba para /mnt/datos vacío tras reinicio

echo "Capa 1: ¿el disco físico existe?"
lsblk

echo "Capa 2: ¿tiene partición?"
sudo fdisk -l /dev/sdb

echo "Capa 3: ¿tiene filesystem?"
lsblk -f /dev/sdb

echo "Capa 4: ¿está registrado en fstab?"
grep "/mnt/datos" /etc/fstab || echo "NO ENCONTRADO: esta es la causa raíz"
\`\`\`

Si las capas 1 a 3 son correctas pero la capa 4 falla, el diagnóstico es claro: el disco y el filesystem están intactos, pero el montaje se hizo con \`mount\` manual, que nunca se guarda en disco ni sobrevive a un reinicio.

### 📖 Secuencia de ejecución

1. Copiar de seguridad de \`/etc/fstab\` antes de tocar nada, en ambos servidores:

\`\`\`bash
sudo cp /etc/fstab /etc/fstab.bak
\`\`\`

2. En el servidor de base de datos, ejecutar el flujo completo de aprovisionamiento:

\`\`\`bash
bash provisionar.sh
\`\`\`

Salida esperada del último paso:

\`\`\`
/dev/sdb1: LABEL="RESPALDOS" UUID="4a3f9c2e-1234-4b8a-9abc-987654321def" TYPE="ext4"
\`\`\`

3. Agregar la línea de \`fstab.entry\` al final de \`/etc/fstab\`, sustituyendo el UUID real:

\`\`\`bash
echo "UUID=4a3f9c2e-1234-4b8a-9abc-987654321def /srv/backups ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab
\`\`\`

4. Validar sin reiniciar — este paso es obligatorio, nunca reiniciar a ciegas confiando en un fstab sin probar:

\`\`\`bash
sudo umount /srv/backups
sudo mount -a
\`\`\`

Si \`mount -a\` no produce ningún error, el fstab es válido.

5. Verificación final del disco de producción:

\`\`\`bash
findmnt /srv/backups
df -h /srv/backups
echo "OK" | sudo tee /srv/backups/test.txt && cat /srv/backups/test.txt
\`\`\`

6. Diagnosticar el servidor con \`/mnt/datos\` vacío:

\`\`\`bash
bash diagnostico-montaje-perdido.sh
\`\`\`

Salida esperada: las capas 1-3 confirman que el disco y el filesystem existen; la capa 4 revela \`NO ENCONTRADO: esta es la causa raíz\`.

7. Reparar el segundo servidor con el mismo procedimiento disciplinado que en el paso 3:

\`\`\`bash
sudo blkid /dev/sdb1
echo "UUID=<uuid-obtenido> /mnt/datos ext4 defaults 0 2" | sudo tee -a /etc/fstab
sudo mount -a
findmnt /mnt/datos
\`\`\`

### 📋 Lo que debes recordar

* El flujo de un disco nuevo siempre sigue el mismo orden: verificar → particionar → formatear → punto de montaje → montar temporal → obtener UUID → fstab → validar → verificar.
* \`mount\` sin editar \`fstab\` es temporal por diseño: sobrevive hasta el próximo reinicio y nada más.
* Siempre usar \`UUID=\` en \`fstab\`, nunca la ruta \`/dev/sdX\`, que puede reasignarse.
* \`sudo mount -a\` después de editar \`fstab\` es el paso de validación obligatorio: si hay un error de sintaxis, aparece aquí, no en el próximo reinicio cuando ya sea tarde.
* Backup de \`/etc/fstab\` antes de cualquier edición: un \`fstab\` roto puede impedir que el sistema arranque normalmente.
* Ante un punto de montaje vacío tras reinicio, diagnosticar siempre de abajo hacia arriba: disco → partición → filesystem → fstab.

### 🧪 Autoevaluación

1. ¿Por qué se usa \`UUID=\` en \`/etc/fstab\` en lugar de \`/dev/sdb1\` directamente?
2. Después de editar \`/etc/fstab\` a mano, ¿qué comando debe ejecutarse antes de reiniciar el servidor, y qué demuestra si tiene éxito?
3. Un compañero montó un disco con \`sudo mount /dev/sdb1 /mnt/datos\` y todo funcionó. Una semana después, tras un reinicio de rutina, \`/mnt/datos\` aparece vacío pero el disco sigue apareciendo en \`lsblk\`. ¿Cuál es la causa más probable?

---

1. El nombre del dispositivo (\`/dev/sdb1\`) depende del orden en que el kernel detecta los discos, que puede cambiar si se agregan, quitan o reordenan discos en el servidor. El UUID se genera al formatear el filesystem y es único y estable, así que \`fstab\` sigue apuntando al disco correcto sin importar cómo se renombren los dispositivos.
2. \`sudo mount -a\`, que vuelve a montar todo lo definido en \`fstab\` sin necesidad de reiniciar. Si no produce ningún error, la sintaxis y las referencias (UUID, punto de montaje, tipo de filesystem) son válidas, y el sistema arrancará correctamente la próxima vez.
3. El disco y el filesystem están intactos (por eso \`lsblk\` lo muestra), pero el montaje se hizo con \`mount\` manual sin agregar la entrada correspondiente en \`/etc/fstab\`. Ese tipo de montaje es temporal y no sobrevive a un reinicio; la solución es obtener el UUID con \`blkid\` y añadir la línea correcta a \`fstab\`.
`

export default content
