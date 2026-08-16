const content = `
## Módulo 7 — Fallos de arranque: rescate desde GRUB e initramfs

### 🎯 Objetivos de aprendizaje

* Entender la secuencia de arranque de Linux: firmware → GRUB → kernel → initramfs → init/systemd.
* Editar parámetros de arranque en GRUB para entrar en modo de rescate.
* Diagnosticar y reparar un sistema que cae en el shell de emergencia de initramfs.
* Usar \`fsck\` de forma segura para reparar un sistema de archivos corrupto.
* Diagnosticar y corregir un \`/etc/fstab\` roto que impide el arranque normal.

### ❓ El problema real

Después de un corte de energía inesperado, un servidor no vuelve a arrancar: se queda en una pantalla negra con el mensaje "Give root password for maintenance". El equipo, sin experiencia en este escenario, considera reinstalar el sistema operativo desde cero, lo cual implicaría horas de trabajo y riesgo de pérdida de datos. En realidad, el sistema está en modo de emergencia porque un sistema de archivos no se pudo montar limpiamente tras el corte abrupto — un problema que \`fsck\` resuelve en minutos sin necesidad de reinstalar nada. Reconocer en qué etapa del arranque falla el sistema es la diferencia entre una reparación de cinco minutos y una reconstrucción completa innecesaria.

### 📖 La secuencia de arranque completa

\`\`\`text
ETAPA                MENSAJE/SÍNTOMA TÍPICO SI FALLA
─────────────────────────────────────────────────────────────────────────────
1. Firmware           Pantalla del fabricante, sin salir de POST;
   (BIOS/UEFI)         problema de hardware, no de Linux

2. GRUB                Pantalla "GRUB rescue>" en vez del menú de arranque;
                        bootloader corrupto o no encuentra su configuración

3. Kernel               "Kernel panic - not syncing"; problema con la imagen
                        del kernel o parámetros de arranque incorrectos

4. initramfs            Shell "(initramfs)" o "dracut:/#"; no puede montar
                        el sistema de archivos raíz

5. init/systemd          "Give root password for maintenance" (emergency
                        target); systemd arrancó pero un mount o servicio
                        crítico falló

6. Sistema operativo     El sistema arrancó pero un servicio específico
   completo               falla; ya NO es un problema de arranque, es un
                        problema de servicio (ver Módulo 5)
\`\`\`

Identificar en cuál de estas seis etapas se detiene el arranque acota inmediatamente el tipo de solución necesaria.

### 📖 Editar parámetros de GRUB para rescate (sin modificar el disco)

Cuando el sistema arranca pero entra en un estado problemático (por ejemplo, un servicio que causa un bucle de reinicio, o se necesita resetear la contraseña de root), se puede interceptar el arranque desde el menú de GRUB.

\`\`\`text
1. Al ver el menú de GRUB, presionar 'e' sobre la entrada de arranque
   para editarla temporalmente (el cambio NO se guarda en disco).

2. Ubicar la línea que empieza con "linux" (o "linux16"/"linuxefi").

3. Al final de esa línea, agregar uno de estos parámetros:

   single              → arranca en modo single-user (runlevel 1)
   systemd.unit=rescue.target     → modo rescate de systemd
   systemd.unit=emergency.target  → modo emergencia (mínimo posible)
   init=/bin/bash                  → salta init completamente, shell directo

4. Presionar Ctrl+X (o F10) para arrancar con esos parámetros una sola vez.
\`\`\`

\`\`\`text
DIFERENCIA ENTRE RESCUE Y EMERGENCY TARGET
─────────────────────────────────────────────────────────────────────────────
rescue.target       Monta los sistemas de archivos locales, inicia sshd y
                     servicios básicos; útil cuando el problema es un
                     servicio específico de nivel superior
emergency.target     NO monta nada automáticamente (ni siquiera /); el
                     administrador monta manualmente lo que necesite;
                     útil cuando el problema está en el propio montaje
\`\`\`

\`\`\`bash
# Con init=/bin/bash, el sistema de archivos raíz suele montarse solo lectura
# Para poder editar archivos, remontar en lectura-escritura primero:
mount -o remount,rw /
\`\`\`

### 📖 El shell de emergencia de initramfs

Si el sistema cae en un prompt tipo \`(initramfs)\` o \`dracut:/#\` (antes incluso de que systemd inicie), el problema está en montar el sistema de archivos raíz: un UUID incorrecto, un disco desconectado, o un sistema de archivos corrupto.

\`\`\`bash
# Dentro del shell de initramfs: identificar los discos y particiones disponibles
lsblk
blkid    # muestra UUID y tipo de sistema de archivos de cada partición

# Comparar el UUID que initramfs espera contra el UUID real del disco
cat /etc/fstab      # si es accesible desde ahí, o desde un rescate externo
\`\`\`

### 📖 fsck: reparar un sistema de archivos de forma segura

\`\`\`bash
# NUNCA ejecutar fsck sobre un sistema de archivos MONTADO en lectura-escritura;
# puede causar más corrupción. Debe estar desmontado o en modo solo lectura.

# Verificar qué dispositivo corresponde a la partición problemática
lsblk -f

# Ejecutar fsck de forma interactiva (pregunta antes de cada reparación)
fsck /dev/sda1

# Modo automático: repara automáticamente lo que es seguro reparar
fsck -y /dev/sda1

# Forzar la verificación incluso si el sistema de archivos parece "limpio"
# (útil si se sospecha corrupción que el chequeo rápido no detecta)
fsck -f /dev/sda1
\`\`\`

\`\`\`text
CÓDIGOS DE SALIDA DE fsck (importantes para scripts y para saber qué pasó)
─────────────────────────────────────────────────────────────────────────────
0     Sin errores
1     Errores de sistema de archivos corregidos
2     Sistema reparado, se requiere reinicio
4     Errores de sistema de archivos NO corregidos (requiere intervención manual)
8     Error operacional (fsck no pudo ejecutarse)
\`\`\`

Después de que \`fsck\` repare exitosamente el sistema de archivos, se reinicia el sistema para que arranque normalmente con el disco ya consistente.

### 📖 /etc/fstab roto: la causa más común de caer en emergency mode

Un \`/etc/fstab\` con una entrada inválida (UUID que ya no existe, disco de red no disponible, typo en las opciones de montaje) hace que systemd no pueda completar \`local-fs.target\`, y por diseño de seguridad, cae en \`emergency.target\` en vez de arrancar con un sistema de archivos incompleto.

\`\`\`bash
# Estando en el shell de emergencia, con / ya montado en rw:
mount -o remount,rw /

# Revisar fstab en busca de la entrada problemática
cat /etc/fstab
# UUID=a1b2c3d4-... /data  ext4  defaults  0  2   ← si este UUID ya no existe, falla

# Verificar qué UUIDs existen realmente
blkid

# Corregir la entrada (comentarla temporalmente si el disco ya no está disponible,
# o corregir el UUID si cambió)
# UUID=a1b2c3d4-... /data  ext4  defaults  0  2

# Validar la sintaxis de fstab SIN reiniciar, antes de confiar en el arranque:
mount -a
# Si mount -a no reporta errores, fstab es sintácticamente correcto
# y todos los puntos de montaje son alcanzables
\`\`\`

\`\`\`text
OPCIÓN DEFENSIVA EN fstab PARA MONTAJES NO CRÍTICOS
─────────────────────────────────────────────────────────────────────────────
Agregar "nofail" a las opciones de montaje de discos no esenciales
(almacenamiento secundario, NFS, discos externos) evita que su ausencia
impida el arranque del sistema completo:

UUID=... /backup  ext4  defaults,nofail  0  2
\`\`\`

### 📋 Lo que debes recordar

* La secuencia de arranque es: firmware → GRUB → kernel → initramfs → init/systemd → sistema completo; identificar la etapa acota la solución.
* Editar la línea "linux" en el menú de GRUB (tecla 'e') permite un arranque de rescate sin modificar el disco.
* Un prompt \`(initramfs)\` indica que el sistema de archivos raíz no se pudo montar, antes incluso de que systemd inicie.
* \`fsck\` nunca se ejecuta sobre un sistema de archivos montado en lectura-escritura; debe estar desmontado o solo lectura.
* Un \`/etc/fstab\` con una entrada inválida es la causa más común de caer en \`emergency.target\`; \`mount -a\` valida la corrección sin reiniciar.
* La opción \`nofail\` en fstab evita que el fallo de un montaje no crítico impida el arranque completo del sistema.

### 🧪 Autoevaluación

1. El sistema muestra "Give root password for maintenance" al arrancar. ¿En qué etapa de la secuencia de arranque está el problema, aproximadamente?
2. ¿Por qué nunca se debe ejecutar \`fsck\` sobre un sistema de archivos montado en lectura-escritura?
3. Después de agregar un disco nuevo a \`/etc/fstab\` con un UUID incorrecto, el servidor no vuelve a arrancar normalmente tras reiniciar. ¿Cómo se diagnostica y corrige sin reinstalar el sistema?

---

1. En la etapa de init/systemd (emergency target): el kernel y initramfs ya lograron arrancar el sistema base, pero systemd no pudo completar algún objetivo crítico (típicamente un montaje de \`/etc/fstab\`), por lo que cae en modo de mantenimiento en vez de completar el arranque normal.
2. Porque \`fsck\` repara la estructura del sistema de archivos asumiendo que nada más lo está modificando simultáneamente. Si el sistema de archivos está montado en lectura-escritura, procesos activos pueden estar escribiendo al mismo tiempo que \`fsck\` intenta corregir su estructura, lo cual puede causar corrupción adicional en vez de repararla.
3. Se arranca en modo rescate/emergencia desde GRUB (agregando \`systemd.unit=emergency.target\` a la línea del kernel), se remonta \`/\` en lectura-escritura con \`mount -o remount,rw /\`, se compara el UUID en \`/etc/fstab\` contra los UUIDs reales con \`blkid\`, se corrige o comenta la entrada incorrecta, y se valida con \`mount -a\` antes de reiniciar normalmente. No es necesario reinstalar el sistema.
`

export default content
