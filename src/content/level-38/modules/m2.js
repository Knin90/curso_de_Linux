const content = `
## Módulo 2 — Provisioning base: hostname, usuarios, grupos, sudo y hardening inicial

### 🎯 Objetivos de aprendizaje

* Configurar identidad del sistema (hostname, timezone, locale) de forma persistente.
* Crear la estructura de usuarios y grupos que usará srv-prod01 durante todo el proyecto.
* Delegar privilegios administrativos con sudo sin exponer la contraseña de root.
* Aplicar el primer nivel de hardening: actualizaciones, servicios innecesarios y políticas de contraseña.

### ❓ El problema real

srv-prod01 acaba de terminar su instalación mínima. En este estado, cualquier persona con acceso físico o a la consola puede loguearse como root con contraseña, no hay separación de responsabilidades entre quien administra el sistema y quien opera la aplicación, y el sistema trae instalados servicios que nadie pidió y que amplían la superficie de ataque sin aportar nada. Antes de tocar red o almacenamiento, hay que dejar la base del sistema en un estado auditable y con responsabilidades claras.

### 📖 Identidad del sistema: hostname, timezone y locale

\`\`\`bash
# Fijar el hostname del proyecto de forma persistente
hostnamectl set-hostname srv-prod01
hostnamectl status
# Static hostname: srv-prod01

# Asegurar resolución local coherente
echo "127.0.1.1 srv-prod01" >> /etc/hosts

# Timezone y locale explícitos (evita ambigüedad en logs y cron)
timedatectl set-timezone America/Bogota
localectl set-locale LANG=es_ES.UTF-8
timedatectl status
\`\`\`

Un hostname genérico como \`localhost\` o \`ip-10-0-0-5\` en logs y alertas dificulta identificar el origen de un incidente cuando hay varios servidores. Fijarlo es el primer paso de trazabilidad.

### 📖 Usuarios y grupos del proyecto

srv-prod01 necesita dos tipos de cuentas con propósitos distintos: una cuenta nominal para administración humana, y una cuenta de servicio sin shell para ejecutar la aplicación.

\`\`\`bash
# Grupo de administradores del proyecto
groupadd sysadmins

# Usuario nominal de administración (no "admin" genérico: nombre real de la persona)
useradd -m -s /bin/bash -c "Denis Admin" -G sysadmins dscastro
passwd dscastro

# Grupo y usuario de servicio para la aplicación (sin shell, sin login interactivo)
groupadd appsvc
useradd -r -M -s /usr/sbin/nologin -g appsvc -d /var/www/srv-prod01 appsvc

# Verificación
id dscastro
# uid=1001(dscastro) gid=1001(dscastro) grupos=1001(dscastro),1002(sysadmins)
id appsvc
# uid=998(appsvc) gid=998(appsvc) grupos=998(appsvc)
\`\`\`

\`\`\`text
DECISIÓN                          POR QUÉ
──────────────────────────────────────────────────────────────────────────
Usuario nominal, no "admin"       Trazabilidad: en logs y auditd se sabe quién hizo qué
Usuario de servicio con nologin   Si la app es comprometida, el atacante no obtiene una shell interactiva
Grupo sysadmins separado          Permite delegar sudo por grupo, no por usuario individual
Home de appsvc en /var/www        Alinea el usuario de servicio con dónde vivirán los archivos de la app
\`\`\`

### 📖 Delegación de privilegios con sudo

Root nunca se usa por login directo en producción: todo privilegio elevado pasa por sudo, quedando registrado.

\`\`\`bash
# Delegar sudo completo al grupo de administradores (visudo evita errores de sintaxis)
visudo -f /etc/sudoers.d/sysadmins
\`\`\`

\`\`\`text
# /etc/sudoers.d/sysadmins
%sysadmins ALL=(ALL) ALL
\`\`\`

\`\`\`bash
# Validar sintaxis antes de cerrar la sesión de root
visudo -c
# /etc/sudoers.d/sysadmins: parsed OK

# Confirmar que dscastro puede escalar
su - dscastro
sudo whoami
# root
\`\`\`

Solo después de confirmar que \`sudo\` funciona para el usuario nominal se bloquea el login directo de root (esto se completa formalmente en el módulo 3 al endurecer SSH, pero la regla general es: nunca cerrar el acceso de root hasta verificar que sudo funciona).

### 📖 Actualización del sistema y reducción de servicios

\`\`\`bash
# Actualizar el sistema recién instalado (Fedora/RHEL como referencia; Debian/Ubuntu usa apt)
dnf update -y

# Listar servicios habilitados para revisar qué corre por defecto
systemctl list-unit-files --state=enabled --type=service

# Deshabilitar servicios que no forman parte del rol de srv-prod01
systemctl disable --now cups.service        # impresión: no aplica a un servidor web
systemctl disable --now avahi-daemon.service # descubrimiento de red: innecesario, expone info
systemctl disable --now bluetooth.service    # sin hardware relevante en un servidor
\`\`\`

Cada servicio activo es superficie de ataque y consumo de recursos que no aporta al rol del servidor. La regla es simple: si no está en la topología definida en el módulo 1, no corre en srv-prod01.

### 📖 Política de contraseñas y expiración de cuentas

\`\`\`bash
# Política de complejidad y vida útil (PAM + login.defs)
dnf install -y libpwquality

# /etc/security/pwquality.conf
minlen = 14
dcredit = -1
ucredit = -1
lcredit = -1
ocredit = -1
retry = 3

# /etc/login.defs
PASS_MAX_DAYS   90
PASS_MIN_DAYS   1
PASS_WARN_AGE   14

# Aplicar la política de expiración al usuario nominal existente
chage --maxdays 90 --mindays 1 --warndays 14 dscastro
chage -l dscastro
\`\`\`

### 📋 Lo que debes recordar

* El hostname, timezone y locale se fijan primero: toda la trazabilidad posterior (logs, cron, auditd) depende de ellos.
* Cada usuario tiene un propósito claro: nominal con sudo para administración, de servicio sin shell para la aplicación.
* sudo se prueba y confirma antes de restringir cualquier otro acceso privilegiado.
* Reducir servicios habilitados es hardening tan importante como configurar el firewall.
* Las políticas de contraseña (complejidad + expiración) se aplican desde el aprovisionamiento, no después de un incidente.

### 🧪 Autoevaluación

1. ¿Por qué el usuario de la aplicación (appsvc) se crea con \`-s /usr/sbin/nologin\` en lugar de \`/bin/bash\`?
2. ¿Qué comando se usa para editar \`/etc/sudoers.d/\` de forma segura y por qué no se edita directamente con un editor de texto?
3. ¿En qué orden se debe verificar sudo respecto a restringir el acceso de root, y por qué ese orden importa?

---

1. Porque appsvc no necesita una sesión interactiva; si la aplicación es comprometida, un atacante que gane ejecución como appsvc no puede abrir una shell de login, lo que limita el impacto del compromiso.
2. Con \`visudo\`, porque valida la sintaxis del archivo antes de guardarlo; un error de sintaxis introducido con un editor normal puede dejar sudo completamente roto en el sistema, incluso para root.
3. Sudo se debe verificar (probar que el usuario nominal puede escalar con éxito) antes de restringir el acceso de root; si se restringe root primero y sudo falla por un error de configuración, la sesión puede quedar sin ninguna vía de escalar privilegios.
`

export default content
