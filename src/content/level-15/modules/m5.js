const content = `
## Módulo 5 — Cuotas de disco: edquota, quota, repquota y gestión de almacenamiento

### 🎯 Objetivos de aprendizaje

* Entender la diferencia entre límites suaves (soft) y duros (hard) y el período de gracia.
* Habilitar cuotas en un filesystem y verificar que funcionen correctamente.
* Usar edquota para establecer cuotas por usuario y por grupo.
* Generar reportes con repquota y automatizar alertas con warnquota.

### ❓ El problema real

Un servidor de archivos compartido tiene 500 GB de espacio. Sin cuotas, un solo usuario puede llenar el disco, dejando a todos los demás sin capacidad de escribir. Esto ha pasado antes: un desarrollador subió backups de su laptop personal y saturó el servidor. Las cuotas de disco permiten asignar límites por usuario y grupo, y cuando el disco se llena, solo afecta al usuario que excedió su cuota, no a todos.

### 📖 Conceptos: soft, hard y grace period

\`\`\`text
LÍMITE       COMPORTAMIENTO
────────────────────────────────────────────────────────────────────
hard limit   Nunca puede superarse. El sistema rechaza escrituras al alcanzarlo.
soft limit   Puede superarse temporalmente durante el "grace period" (período de gracia).
             Al superar el soft limit, el usuario recibe advertencias.
             Al expirar el grace period sin reducir el uso, el soft actúa como hard.
grace period Tiempo en que el usuario puede estar sobre el soft limit (típicamente 7 días).

Ejemplo:
  soft = 1 GB, hard = 1.5 GB, grace = 7 días

  Día 1: usuario ocupa 1.2 GB → Supera soft. Recibe advertencia. Tiene 7 días para reducir.
  Día 7: usuario ocupa 1.3 GB → Grace period expirado. Soft actúa como hard: no puede escribir.
  En cualquier momento: usuario ocupa 1.5 GB → Supera hard. Escritura rechazada inmediatamente.
\`\`\`

### 📖 Habilitar cuotas en el filesystem

\`\`\`bash
# Paso 1: Montar el filesystem con opciones de cuota
# Editar /etc/fstab:
# /dev/sdb1  /datos  ext4  defaults,usrquota,grpquota  0 2

# Opciones de montaje:
# usrquota  → habilita cuotas por usuario
# grpquota  → habilita cuotas por grupo
# usrjquota=aquota.user,grpjquota=aquota.group,jqfmt=vfsv0  → cuotas con journal (ext4)

# Para XFS (cuotas integradas, no necesita archivos separados):
# /dev/sdb1  /datos  xfs  defaults,uquota,gquota  0 2
# uquota = user quota, gquota = group quota, pquota = project quota

# Remontar con las nuevas opciones sin reiniciar
mount -o remount /datos

# Paso 2: Crear los archivos de base de datos de cuotas (solo ext2/ext3/ext4)
quotacheck -cugm /datos
# -c: crear archivos si no existen
# -u: cuotas de usuario
# -g: cuotas de grupo
# -m: no remontar en modo lectura durante el check (puede ser necesario en sistemas activos)

# Esto crea /datos/aquota.user y /datos/aquota.group

# Paso 3: Activar cuotas
quotaon -ug /datos     # activar para usuarios y grupos
quotaon -a             # activar en todos los filesystems de fstab con cuotas

# Verificar que están activas
quotaon -p /datos      # -p = print status
# /datos: user quotas turned on
# /datos: group quotas turned on

# Para desactivar:
quotaoff /datos
\`\`\`

### 📖 edquota: establecer cuotas

\`\`\`bash
# Editar cuotas de un usuario (abre el editor configurado en \$EDITOR)
edquota -u maria

# El editor muestra algo como:
# Disk quotas for user maria (uid 1001):
#   Filesystem   blocks   soft    hard   inodes   soft   hard
#   /dev/sdb1    102400  512000  614400       0      0      0
#
# Columnas:
# blocks:  bloques actuales en uso (1 bloque = 1 KB en la mayoría de sistemas)
# soft:    límite suave en bloques (0 = sin límite)
# hard:    límite duro en bloques (0 = sin límite)
# inodes:  inodes actuales en uso
# soft:    límite suave de inodes (0 = sin límite)
# hard:    límite duro de inodes (0 = sin límite)

# Convertir GB a bloques para edquota:
# 1 GB = 1,048,576 bloques (de 1 KB)
# 10 GB = 10,485,760 bloques

# Editar cuotas de un grupo
edquota -g developers
\`\`\`

\`\`\`bash
# setquota: establecer cuotas sin abrir editor (útil para scripts)
# setquota -u usuario soft_bloques hard_bloques soft_inodes hard_inodes filesystem

# 10 GB soft, 12 GB hard, sin límite de inodes
setquota -u maria 10485760 12582912 0 0 /datos

# 5 GB soft, 6 GB hard para el grupo developers
setquota -g developers 5242880 6291456 0 0 /datos

# Copiar cuotas de un usuario a otro (útil para aplicar plantillas)
edquota -p plantilla_usuario maria  # copiar cuotas de plantilla_usuario a maria
edquota -p plantilla_usuario carlos ana jose  # aplicar a múltiples usuarios
\`\`\`

### 📖 Establecer el grace period

\`\`\`bash
# Editar el período de gracia (global para el filesystem)
edquota -t

# El editor muestra:
# Grace period before enforcing soft limits for users:
# Time units may be: days, hours, minutes, or seconds
#   Filesystem   Block grace period   Inode grace period
#   /dev/sdb1          7days               7days

# Cambiar a 3 días para bloques, 7 días para inodes:
# Filesystem   Block grace period   Inode grace period
# /dev/sdb1          3days               7days

# Para grupos:
edquota -tg
\`\`\`

### 📖 quota y repquota: consulta y reportes

\`\`\`bash
# Ver cuota de un usuario específico
quota -u maria
# Disk quotas for user maria (uid 1001):
#      Filesystem  blocks   quota   limit   grace  files   quota   limit   grace
#       /dev/sdb1  204800* 512000  614400   6days   1024       0       0

# El * después de blocks indica que el usuario superó el soft limit
# grace muestra el tiempo restante del período de gracia

# Ver cuota del usuario actual
quota

# Ver cuota con nombres de filesystem en lugar de dispositivos
quota -s maria    # -s = human readable (muestra en K, M, G)

# repquota: reporte completo de todos los usuarios
repquota /datos
# Output:
# *** Report for user quotas on device /dev/sdb1
# Block grace time: 7days; Inode grace time: 7days
#                         Block limits                File limits
# User            used    soft    hard  grace    used  soft  hard  grace
# ────────────────────────────────────────────────────────────────────────
# root      --       0       0       0            0     0     0
# maria     -+  204800  512000  614400         1024     0     0
# carlos    --  102400  512000  614400          512     0     0

# Explicación de los signos:
# --  ambos límites OK
# -+  superó el soft limit de bloques
# +-  superó el soft limit de inodes
# ++  superó ambos soft limits

# Reporte de grupos
repquota -g /datos

# Reporte de todos los filesystems
repquota -a

# Reporte ordenado por uso
repquota -s /datos | sort -k2 -rh

# Exportar como CSV para reportes
repquota /datos | awk 'NR>4 {print \$1","(\$3/1024)"MB,",(\$4/1024)"MB"}'
\`\`\`

### 📖 quotacheck: verificación y actualización

\`\`\`bash
# quotacheck verifica la consistencia de los datos de cuota
# Ejecutar cuando el filesystem no fue desmontado limpiamente

# Verificar y actualizar bases de datos de cuota
quotacheck -ug /datos     # verificar usuario y grupo
quotacheck -aug           # todos los filesystems con cuotas

# Si el sistema tuvo un crash, puede ser necesario:
quotaoff /datos
quotacheck -ugm /datos
quotaon /datos

# En XFS, las cuotas están en el filesystem — no necesita quotacheck
# xfs_quota es la herramienta para XFS

# XFS quota management:
xfs_quota -x -c 'report -h' /datos          # reporte legible
xfs_quota -x -c 'limit bsoft=10g bhard=12g maria' /datos  # establecer límites
xfs_quota -x -c 'quota -h maria' /datos     # ver cuota de un usuario
\`\`\`

### 📖 warnquota: notificaciones automáticas

\`\`\`bash
# warnquota envía emails a usuarios que superaron su soft limit
# Configurar en /etc/warnquota.conf

cat /etc/warnquota.conf
# MAIL_CMD       = "/usr/sbin/sendmail -t"
# FROM           = "diskquota@empresa.com"
# SUBJECT        = "Advertencia de cuota de disco"
# CC_TO          = "sysadmin@empresa.com"
# SUPPORT        = "helpdesk@empresa.com"
# PHONE          = "Ext. 2100"
# MESSAGE        = "Estimado %s,\\n\\nHas superado tu cuota de disco en %s.\\n"

# Ejecutar warnquota manualmente
warnquota

# Configurar en cron para ejecución diaria
# /etc/cron.daily/quota
#!/bin/bash
warnquota
repquota -a > /var/log/quota-report-\$(date +%Y%m%d).log
\`\`\`

### 📖 Script de gestión de cuotas para producción

\`\`\`bash
#!/usr/bin/env bash
# quota-setup.sh — aplicar cuotas por departamento

FILESYSTEM="/datos"

# Definir cuotas por departamento (en bloques de 1K)
# formato: grupo:soft:hard
declare -A QUOTAS=(
    ["developers"]="10485760:12582912"   # 10GB soft, 12GB hard
    ["marketing"]="5242880:6291456"      # 5GB soft, 6GB hard
    ["contabilidad"]="2097152:2621440"   # 2GB soft, 2.5GB hard
)

echo "=== Configurando cuotas en \$FILESYSTEM ==="

for grupo in "\${!QUOTAS[@]}"; do
    IFS=: read -r soft hard <<< "\${QUOTAS[\$grupo]}"

    # Verificar que el grupo existe
    if ! getent group "\$grupo" > /dev/null 2>&1; then
        echo "AVISO: grupo \$grupo no existe, saltando"
        continue
    fi

    # Aplicar cuota de grupo
    setquota -g "\$grupo" "\$soft" "\$hard" 0 0 "\$FILESYSTEM"
    echo "Cuota aplicada a \$grupo: soft=\$((\$soft/1024/1024))GB, hard=\$((\$hard/1024/1024))GB"

    # Aplicar cuota a cada miembro del grupo
    while IFS= read -r usuario; do
        if id "\$usuario" > /dev/null 2>&1; then
            setquota -u "\$usuario" "\$soft" "\$hard" 0 0 "\$FILESYSTEM"
        fi
    done < <(getent group "\$grupo" | cut -d: -f4 | tr , '\\n')
done

echo ""
echo "=== Reporte de cuotas actuales ==="
repquota -s "\$FILESYSTEM"
\`\`\`

### 📋 Lo que debes recordar

* Los límites soft y hard se miden en bloques de 1 KB (en la mayoría de filesystems ext). Para XFS y sistemas modernos, puede ser diferente — verificar con \`repquota\`.
* El grace period no es por usuario — es una configuración global del filesystem. Si se necesitan grace periods diferentes, requiere filesystems separados.
* En XFS, las cuotas están integradas y no necesitan archivos \`aquota.user/group\` ni \`quotacheck\`. Usar \`xfs_quota\` en lugar de las herramientas estándar.
* \`edquota -p plantilla usuario\` es el método eficiente para aplicar la misma política a múltiples usuarios — copia la configuración exacta de la plantilla.

### 🧪 Autoevaluación

1. Un usuario tiene soft=5GB, hard=6GB, grace=7 días. Hoy ocupa 5.5 GB y el grace period expiró hace 2 días. ¿Puede escribir 1 MB más? ¿Puede escribir si reduce a 4.5 GB primero?
2. ¿Por qué \`quotacheck\` puede tardar mucho tiempo en filesystems grandes y cuándo es realmente necesario ejecutarlo?
3. En un servidor con XFS, un colega intenta ejecutar \`quotacheck\` y el comando falla. ¿Por qué? ¿Qué comando usa en XFS para verificar el estado de las cuotas?

---

1. No puede escribir 1 MB más. El grace period expiró y el soft limit actúa como hard limit (5 GB). Si intenta escribir, recibirá "Disk quota exceeded". Sí puede escribir después de reducir a 4.5 GB: una vez por debajo del soft limit, el contador de gracia se resetea y puede volver a usar hasta el soft limit sin restricciones.
2. \`quotacheck\` escanea todos los inodos del filesystem para recalcular el uso real de cuotas. En filesystems de terabytes con millones de archivos, esto puede tomar horas. Solo es necesario ejecutarlo cuando: (1) el sistema tuvo un crash sin desmontaje limpio, (2) las cuotas se habilitaron por primera vez y no hay datos previos, o (3) se detecta inconsistencia entre lo reportado y el uso real. En operación normal, el kernel mantiene las estadísticas de cuota actualizadas automáticamente.
3. En XFS, las cuotas son una característica nativa del filesystem y no usan los archivos \`aquota.user/group\` que necesita \`quotacheck\`. El comando correcto es \`xfs_quota -x -c 'report' /filesystem\` para ver el estado, y las opciones de montaje son \`uquota\` y \`gquota\` en lugar de \`usrquota/grpquota\`.
`

export default content
