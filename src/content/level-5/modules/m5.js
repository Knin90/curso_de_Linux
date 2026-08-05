const content = `
## Módulo 5 — DNF y RPM: el sistema de paquetes Fedora/RHEL

### 🎯 Objetivos de aprendizaje

* Dominar los comandos esenciales de DNF para administración en RHEL/Fedora/Rocky.
* Usar RPM para operaciones de bajo nivel y consultas sobre paquetes instalados.
* Comparar comandos equivalentes entre APT/DPKG y DNF/RPM.

### 📖 La familia Red Hat

DNF (Dandified YUM) es el sucesor de YUM en Fedora y RHEL 8+. Bajo él, RPM hace el trabajo real — igual que DPKG bajo APT.

\`\`\`text
  Distribución          Gestor alto nivel   Gestor bajo nivel   Formato
  ────────────────────────────────────────────────────────────────────
  Fedora                DNF                 RPM                 .rpm
  RHEL 8+ / Rocky       DNF                 RPM                 .rpm
  RHEL 7 / CentOS 7     YUM                 RPM                 .rpm
\`\`\`

### 💻 DNF: instalación y eliminación

\`\`\`bash
# Actualizar índices y mostrar actualizaciones disponibles
dnf check-update

# Instalar paquete
sudo dnf install nginx

# Instalar sin confirmación
sudo dnf install -y nginx

# Eliminar paquete
sudo dnf remove nginx

# Eliminar paquetes huérfanos
sudo dnf autoremove
\`\`\`

### 💻 DNF: actualización del sistema

\`\`\`bash
# Actualizar todos los paquetes
sudo dnf upgrade

# Actualizar un paquete específico
sudo dnf upgrade nginx

# Ver historial de operaciones (muy útil para hacer rollback)
dnf history
dnf history info 5    # ver detalle de la operación 5
dnf history undo 5    # deshacer la operación 5
\`\`\`

> DNF tiene **historial de transacciones** — puedes deshacer instalaciones. APT no tiene esta capacidad nativa.

### 💻 DNF: búsqueda e información

\`\`\`bash
# Buscar paquete
dnf search nginx

# Ver información del paquete
dnf info nginx

# Ver dependencias
dnf deplist nginx

# Ver qué repositorio provee el paquete
dnf provides /usr/sbin/nginx

# Listar repositorios activos
dnf repolist

# Ver grupos de paquetes (equivalente a tasksel en Debian)
dnf grouplist
sudo dnf groupinstall "Development Tools"
\`\`\`

### 💻 RPM: operaciones de bajo nivel

\`\`\`bash
# Instalar .rpm local
sudo rpm -ivh paquete.rpm      # i=instalar, v=verbose, h=progress

# Actualizar .rpm local
sudo rpm -Uvh paquete.rpm      # U=upgrade (instala si no existe)

# Ver información del paquete instalado
rpm -qi nginx

# Listar archivos que instaló el paquete
rpm -ql nginx

# Saber a qué paquete pertenece un archivo
rpm -qf /usr/sbin/nginx

# Ver dependencias
rpm -qR nginx

# Verificar integridad de los archivos instalados (comprueba checksums)
rpm -V nginx
\`\`\`

### 📖 Tabla comparativa APT/DPKG — DNF/RPM

| Acción | Debian/Ubuntu | Fedora/RHEL |
| --- | --- | --- |
| Actualizar índices | \`apt update\` | \`dnf check-update\` |
| Instalar paquete | \`apt install nginx\` | \`dnf install nginx\` |
| Eliminar paquete | \`apt remove nginx\` | \`dnf remove nginx\` |
| Eliminar + configuración | \`apt purge nginx\` | \`dnf remove nginx\` (RPM no distingue) |
| Actualizar sistema | \`apt upgrade\` | \`dnf upgrade\` |
| Buscar paquete | \`apt search nginx\` | \`dnf search nginx\` |
| Info paquete | \`apt show nginx\` | \`dnf info nginx\` |
| Archivos del paquete | \`dpkg -L nginx\` | \`rpm -ql nginx\` |
| Dueño de un archivo | \`dpkg -S /ruta\` | \`rpm -qf /ruta\` |
| Instalar .deb/.rpm local | \`dpkg -i pkg.deb\` | \`rpm -ivh pkg.rpm\` |
| Deshacer operación | — | \`dnf history undo N\` |
| Verificar integridad | \`debsums\` (extra) | \`rpm -V paquete\` |

### 📋 Lo que debes recordar

* DNF es el equivalente RHEL de APT. RPM es el equivalente de DPKG.
* \`dnf history undo\` permite revertir instalaciones — una ventaja sobre APT.
* \`rpm -V paquete\` verifica que los archivos instalados no fueron modificados desde la instalación — útil en respuesta a incidentes de seguridad.
* \`rpm -qf /ruta\` es equivalente a \`dpkg -S /ruta\` — ambos responden "¿quién instaló este archivo?".

### 🧪 Autoevaluación rápida

1. ¿Cuál es el equivalente en DNF de \`apt purge\`?
2. ¿Qué hace \`rpm -V nginx\` que \`rpm -qi nginx\` no hace?
3. Instalaste 5 paquetes con DNF hace una hora y quieres deshacerlo. ¿Cómo?

---

1. DNF no distingue entre \`remove\` y \`purge\` — \`dnf remove nginx\` elimina paquete y configuración.
2. \`rpm -V\` **verifica la integridad** de los archivos instalados comparando checksums actuales con los registrados en la base de datos. \`rpm -qi\` solo muestra metadatos del paquete.
3. \`dnf history\` para ver el número de transacción, luego \`sudo dnf history undo N\`.
`
export default content
