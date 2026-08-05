const content = `
## Módulo 7 — Actualizaciones, limpieza y mantenimiento

### 🎯 Objetivos de aprendizaje

* Establecer una rutina de mantenimiento segura para servidores Linux.
* Gestionar el espacio en disco ocupado por la caché de paquetes.
* Entender \`apt-mark\` y cómo controlar qué paquetes se actualizan automáticamente.
* Aplicar actualizaciones de seguridad sin actualizar el sistema completo.

### 📖 Estrategia de actualización en producción

En producción, no se actualiza a ciegas. El flujo correcto:

\`\`\`text
  1. apt update / dnf check-update
     (¿qué actualizaciones están disponibles?)
          │
          ▼
  2. Revisar qué va a cambiar
     apt list --upgradable
     dnf check-update
          │
          ▼
  3. Aplicar actualizaciones de seguridad primero
     apt upgrade --with-new-pkgs (Debian)
     dnf upgrade --security (RHEL)
          │
          ▼
  4. Probar en entorno de staging
          │
          ▼
  5. Aplicar en producción con mantenimiento programado
\`\`\`

### 💻 Actualizaciones de seguridad solamente

\`\`\`bash
# Debian/Ubuntu: ver solo actualizaciones de seguridad disponibles
apt list --upgradable 2>/dev/null | grep -i security

# Instalar solo actualizaciones de seguridad (unattended-upgrades)
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# RHEL/Fedora: actualizar solo parches de seguridad
sudo dnf upgrade --security

# Ver qué CVEs corrige una actualización
dnf updateinfo list security
\`\`\`

### 💻 Controlar qué paquetes se actualizan

\`\`\`bash
# Debian: marcar un paquete como "hold" (no se actualiza)
sudo apt-mark hold nginx

# Ver paquetes en hold
apt-mark showhold

# Liberar un hold
sudo apt-mark unhold nginx

# RHEL: excluir paquete de actualizaciones (en /etc/dnf/dnf.conf o el .repo)
# Añadir al repo: exclude=nginx*
dnf versionlock add nginx   # requiere plugin dnf-plugin-versionlock
\`\`\`

### 💻 Gestión del espacio en disco

La caché de paquetes descargados puede ocupar varios gigabytes con el tiempo:

\`\`\`bash
# Debian: ver cuánto ocupa la caché
du -sh /var/cache/apt/archives/

# Eliminar paquetes .deb descargados que ya no son necesarios
sudo apt clean          # elimina todo /var/cache/apt/archives/
sudo apt autoclean      # elimina solo versiones antiguas (conserva la actual)

# Eliminar dependencias huérfanas (instaladas solo para otro paquete ya eliminado)
sudo apt autoremove

# Todo junto — rutina de mantenimiento completa
sudo apt update && sudo apt upgrade -y && sudo apt autoremove -y && sudo apt autoclean

# RHEL: limpiar caché DNF
sudo dnf clean all
sudo dnf clean packages    # solo los paquetes descargados
du -sh /var/cache/dnf/
\`\`\`

### 💻 Ver el historial de cambios

\`\`\`bash
# Debian: ver log de instalaciones/desinstalaciones
cat /var/log/dpkg.log | grep "install\|remove" | tail -20

# Ver el historial de apt
cat /var/log/apt/history.log | tail -30

# RHEL: historial completo de DNF con posibilidad de deshacer
dnf history
dnf history info 10     # detalle de la transacción 10
dnf history undo 10     # deshacer la transacción 10
\`\`\`

### 💻 Encontrar paquetes instalados manualmente vs automáticamente

\`\`\`bash
# Debian: paquetes instalados por el usuario (no como dependencia)
apt-mark showmanual

# Paquetes instalados automáticamente (dependencias)
apt-mark showauto

# RHEL: paquetes instalados manualmente
dnf history userinstalled
\`\`\`

### ⚠️ Errores comunes

\`\`\`text
❌ Error 1: apt upgrade en producción sin revisar qué cambia
   Siempre ejecutar apt list --upgradable primero. Una actualización de kernel
   o de la libc puede requerir reinicio y afectar servicios.

❌ Error 2: No ejecutar autoremove nunca
   Las dependencias huérfanas se acumulan. Con el tiempo ocupan espacio
   significativo y dificultan auditorías de qué está instalado.

❌ Error 3: No tener unattended-upgrades configurado en servidores
   Los servidores que no reciben actualizaciones de seguridad automáticas
   quedan expuestos a vulnerabilidades conocidas con parche disponible.
\`\`\`

### 📋 Lo que debes recordar

* En producción: revisar qué cambia antes de actualizar. Aplicar seguridad primero.
* \`apt-mark hold\` congela un paquete — útil para versiones críticas de dependencias.
* \`apt clean\` libera espacio; \`apt autoremove\` elimina paquetes huérfanos.
* En RHEL, \`dnf history undo\` permite revertir cualquier transacción.

### 🧪 Autoevaluación rápida

1. ¿Cómo evitas que nginx se actualice automáticamente en un servidor Debian?
2. ¿Cuál es la diferencia entre \`apt clean\` y \`apt autoclean\`?
3. ¿Qué hace \`apt autoremove\` y por qué es importante ejecutarlo periódicamente?

---

1. Con \`sudo apt-mark hold nginx\` — el paquete queda congelado en su versión actual.
2. \`apt clean\` elimina **toda** la caché de \`.deb\`. \`apt autoclean\` elimina solo las versiones antiguas que ya no son descargables (la versión actual del paquete se conserva en caché).
3. Elimina dependencias instaladas automáticamente que ya no son necesarias porque el paquete que las requería fue eliminado. Sin autoremove, esas dependencias quedan acumulando espacio y creando ruido en las auditorías.
`
export default content
