const content = `
## Módulo 4 — Almacenamiento: LVM, filesystem y mount points del proyecto

### 🎯 Objetivos de aprendizaje

* Diseñar un esquema de almacenamiento con LVM que separe datos por propósito y criticidad.
* Crear physical volumes, volume groups y logical volumes para srv-prod01.
* Formatear y montar los volúmenes de forma persistente en \`/etc/fstab\`.
* Verificar que el esquema resiste un reinicio y deja margen de crecimiento sin downtime.

### ❓ El problema real

srv-prod01 tiene, hasta ahora, un único disco con una única partición raíz. Si los logs de la aplicación crecen sin control, pueden llenar el mismo filesystem donde vive el sistema operativo y tumbar el servidor completo. Si en seis meses la aplicación necesita más espacio, no hay forma de crecer sin reinstalar. Este módulo reemplaza ese esquema plano por un diseño LVM que aísla el riesgo de cada componente y permite crecer en caliente.

### 📖 Diseño del esquema de almacenamiento

srv-prod01 recibe un segundo disco (\`/dev/sdb\`) dedicado exclusivamente a los datos de producción, separado del disco de sistema (\`/dev/sda\`).

\`\`\`text
DISCO      VG           LV              MOUNT POINT      TAMAÑO INICIAL   PROPÓSITO
──────────────────────────────────────────────────────────────────────────────────
/dev/sda   (sistema)    -               /                20G              SO, no crece
/dev/sdb   vg_data      lv_log          /var/log         5G               logs del sistema y nginx
/dev/sdb   vg_data      lv_www          /var/www          10G              contenido de la aplicación
/dev/sdb   vg_data      lv_home         /home             5G               homes de usuarios nominales
\`\`\`

Separar \`/var/log\` del resto es la decisión más importante: un ataque de log flooding o un bug que escribe logs sin control llena \`lv_log\`, no la raíz del sistema, y el servidor sigue arrancando y respondiendo.

### 📖 Creación del physical volume y volume group

\`\`\`bash
# Confirmar el disco disponible sin usar
lsblk
# sdb    8:16   0   30G  0 disk

# Crear el physical volume sobre el disco completo
pvcreate /dev/sdb
pvs
# PV         VG   Fmt  Attr PSize  PFree
# /dev/sdb        lvm2 ---  30.00g 30.00g

# Crear el volume group del proyecto
vgcreate vg_data /dev/sdb
vgs
# VG      #PV #LV #SN Attr   VSize  VFree
# vg_data   1   0   0 wz--n- 30.00g 30.00g
\`\`\`

### 📖 Creación de los logical volumes

\`\`\`bash
lvcreate -L 5G  -n lv_log  vg_data
lvcreate -L 10G -n lv_www  vg_data
lvcreate -L 5G  -n lv_home vg_data

lvs
# LV       VG      Attr       LSize  Pool Origin Data%
# lv_log   vg_data -wi-a----- 5.00g
# lv_www   vg_data -wi-a----- 10.00g
# lv_home  vg_data -wi-a----- 5.00g
\`\`\`

Se deja 10G libres en el VG (\`30G - 20G asignados\`) sin asignar a ningún LV: es el margen de crecimiento que permite extender cualquiera de los tres volúmenes en el futuro sin agregar disco.

### 📖 Formateo y montaje persistente

\`\`\`bash
# Formatear con XFS (buen soporte de crecimiento en caliente en distros basadas en RHEL)
mkfs.xfs /dev/vg_data/lv_log
mkfs.xfs /dev/vg_data/lv_www
mkfs.xfs /dev/vg_data/lv_home

# Puntos de montaje
mkdir -p /var/www

# Obtener UUIDs para /etc/fstab (más estable que rutas de dispositivo)
blkid /dev/vg_data/lv_log
blkid /dev/vg_data/lv_www
blkid /dev/vg_data/lv_home
\`\`\`

\`\`\`text
# /etc/fstab — añadir estas líneas
UUID=<uuid_lv_log>   /var/log   xfs   defaults   0 0
UUID=<uuid_lv_www>   /var/www   xfs   defaults   0 0
UUID=<uuid_lv_home>  /home      xfs   defaults   0 0
\`\`\`

\`\`\`bash
# Validar la sintaxis de fstab sin reiniciar
mount -a
# Sin errores = fstab correcto

# Confirmar que los tres volúmenes están montados donde corresponde
df -hT | grep vg_data
# /dev/mapper/vg_data-lv_log   xfs   5.0G   68M  5.0G   2% /var/log
# /dev/mapper/vg_data-lv_www   xfs   10G    33M   10G   1% /var/www
# /dev/mapper/vg_data-lv_home  xfs   5.0G   33M  5.0G   1% /home
\`\`\`

**Importante:** al migrar \`/var/log\` a un nuevo volumen con contenido preexistente, se debe copiar el contenido actual antes de montar encima (\`rsync -a /var/log/ /mnt/nuevo_log/\`) para no perder logs históricos; el orden correcto es: montar en un punto temporal, copiar datos, desmontar, montar en destino final.

### 📖 Verificación de persistencia tras reinicio

\`\`\`bash
reboot
# ... tras reconectar ...
df -hT | grep vg_data
lsblk
systemctl status nginx  # confirma que el servicio no falló por mount points ausentes
journalctl -b -p err    # revisa errores del boot actual relacionados a montajes
\`\`\`

Un esquema de LVM que solo funciona hasta el próximo reinicio no cumple el pilar de disponibilidad definido en el módulo 1. La verificación con reinicio real no es opcional.

### 📖 Crecimiento en caliente (referencia para operación futura)

\`\`\`bash
# Ejemplo: /var/www se queda sin espacio en el futuro
lvextend -L +5G /dev/vg_data/lv_www
xfs_growfs /var/www
df -h /var/www
# Crece sin desmontar, sin downtime
\`\`\`

Esta capacidad es la razón principal por la que LVM se eligió sobre particiones tradicionales: el crecimiento en caliente evita una ventana de mantenimiento para algo tan común como quedarse sin espacio.

### 📋 Lo que debes recordar

* \`/var/log\` se separa de la raíz del sistema para que un llenado de logs no tumbe el servidor completo.
* El diseño deja espacio libre sin asignar en el VG como margen de crecimiento futuro.
* \`/etc/fstab\` se valida con \`mount -a\` antes de confiar en que sobrevive a un reinicio, y se confirma con un reinicio real.
* LVM permite extender un logical volume y su filesystem en caliente, sin downtime, con \`lvextend\` + \`xfs_growfs\`.

### 🧪 Autoevaluación

1. ¿Por qué \`/var/log\` se monta en un logical volume separado en vez de dejarlo en la partición raíz?
2. ¿Qué comando confirma que \`/etc/fstab\` tiene sintaxis válida sin necesidad de reiniciar el servidor?
3. Un LV se queda sin espacio en producción. ¿Qué dos comandos, en qué orden, permiten crecerlo sin downtime?

---

1. Para aislar el riesgo: si los logs crecen sin control (por un bug, un ataque o un pico de tráfico), llenan solo ese volumen y no la raíz del sistema, permitiendo que el servidor siga arrancando y el resto de servicios sigan operando.
2. \`mount -a\`, que intenta montar todas las entradas de fstab que no estén ya montadas y reporta errores de sintaxis o de dispositivo sin necesidad de un reinicio.
3. Primero \`lvextend -L +<tamaño> /dev/vg/lv\` para agregar espacio al logical volume, y después \`xfs_growfs <mount_point>\` (o \`resize2fs\` si es ext4) para que el filesystem use el espacio recién agregado.
`

export default content
