const content = `
## Módulo 7 — Modos de recuperación, rescate y bypass de autenticación

### 🎯 Objetivos de aprendizaje

* Recuperar el control del sistema cuando se ha olvidado la contraseña de \`root\`.
* Iniciar el sistema en modo de mantenimiento (\`rescue.target\`).
* Aplicar técnicas de bypass del proceso de inicialización mediante \`init=/bin/bash\` o \`rd.break\`.

### 🔨 Método 1: Resetear clave de root con \`init=/bin/bash\` (Debian, Ubuntu y derivados)

Este método le ordena al kernel que ignore \`systemd\` y entregue inmediatamente una Shell con privilegios de administrador.

\`\`\`text
Menú de GRUB ──► Tecla 'e' ──► Añadir 'rw init=/bin/bash' ──► Ctrl+X ──► Shell de Root sin clave
\`\`\`

#### Pasos detallados:

1. Reinicia el equipo y presiona **\`e\`** en el menú de GRUB.
2. Localiza la línea que comienza por \`linux\` y navega hasta el final.
3. Elimina parámetros como \`quiet\` o \`splash\` y agrega:

\`\`\`text
rw init=/bin/bash
\`\`\`

4. Presiona **\`Ctrl + X\`** para arrancar.
5. Obtendrás una consola limpia directa: \`root@(none):/#\`
6. Modifica la contraseña del usuario root:

\`\`\`bash
passwd root
\`\`\`

7. En distribuciones con SELinux activado, fuerza el reetiquetado de seguridad:

\`\`\`bash
touch /.autorelabel
\`\`\`

8. Reinicia el sistema ejecutando:

\`\`\`bash
exec /sbin/init
\`\`\`

### 🔨 Método 2: Recuperación mediante \`rd.break\` (RHEL, AlmaLinux, Rocky Linux, Fedora)

#### Pasos detallados:

1. En el menú de GRUB, presiona **\`e\`** sobre la opción de arranque.
2. Al final de la línea \`linux\`, añade:

\`\`\`text
rd.break
\`\`\`

3. Presiona **\`Ctrl + X\`**. El arranque se detendrá en la memoria \`initramfs\` antes de montar el disco real.
4. Monta la partición real \`/sysroot\` en modo lectura/escritura:

\`\`\`bash
mount -o remount,rw /sysroot
\`\`\`

5. Entra al entorno del disco duro mediante \`chroot\`:

\`\`\`bash
chroot /sysroot
\`\`\`

6. Actualiza la clave de \`root\`:

\`\`\`bash
passwd
\`\`\`

7. Marca el reetiquetado obligatorio para SELinux:

\`\`\`bash
touch /.autorelabel
\`\`\`

8. Sal del entorno y reanuda la carga:

\`\`\`bash
exit
exit
\`\`\`

### 🔒 Advertencia de Seguridad

Cualquier usuario con **acceso físico** al equipo o a la consola de una máquina virtual puede realizar este procedimiento para obtener acceso total. Para evitarlo en entornos de alta seguridad:

1. Protege el menú de GRUB mediante una contraseña.
2. Cifra el disco completo utilizando **LUKS**.

### 📋 Lo que debes recordar

* **Qué hace:** Permite ganar acceso administrativo y reparar un sistema sin la contraseña de acceso.
* **Técnicas clave:** Parámetro \`init=/bin/bash\` (Debian/Ubuntu) y \`rd.break\` (RHEL/Fedora).
* **Archivos/Comandos críticos:** \`passwd\`, \`mount -o remount,rw /\`, \`touch /.autorelabel\`.
* **Requisito fundamental:** Acceso físico a la máquina o a la consola de administración del hipervisor.

### 🧪 Autoevaluación rápida

1. ¿Qué parámetro le indica al kernel que ejecute una Shell inmediatamente en lugar del sistema \`systemd\`?
2. ¿Por qué es necesario crear el archivo \`/.autorelabel\` tras cambiar una clave de root mediante bypass en un sistema con SELinux?
3. ¿Cuál es el comando necesario para cambiar los permisos de montaje del disco raíz de lectura a lectura/escritura?

---

1. \`init=/bin/bash\`.
2. Para que SELinux actualice los contextos de seguridad del archivo de contraseñas (\`/etc/shadow\`) durante el próximo arranque; de lo contrario, impedirá el inicio de sesión.
3. \`mount -o remount,rw /\` (o \`/sysroot\` según la fase).
`

export default content
