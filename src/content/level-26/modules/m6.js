const content = `
## Módulo 6 — Automatización de parches con unattended-upgrades

### 🎯 Objetivos de aprendizaje

* Configurar unattended-upgrades para aplicar automáticamente solo parches de seguridad.
* Entender los riesgos de la actualización automática y cómo mitigarlos.
* Configurar notificaciones por email y control de reinicios automáticos.
* Usar dnf-automatic como equivalente en RHEL/Fedora.

### ❓ El problema real

Un servidor sin parches durante semanas porque nadie tuvo tiempo de aplicarlos manualmente es el escenario más común en organizaciones pequeñas. La automatización de parches de seguridad reduce este riesgo — pero una actualización automática mal configurada puede romper servicios en producción. El equilibrio está en automatizar con control.

### 📖 Arquitectura de unattended-upgrades

\`\`\`text
FLUJO DE UNATTENDED-UPGRADES:

1. apt-daily.timer (cada 12h) → apt update → actualiza listas de paquetes
2. apt-daily-upgrade.timer (cada 24h, aleatorio) → unattended-upgrades ejecuta
3. Evalúa qué paquetes aplican según Origins-Pattern
4. Aplica solo los paquetes que coinciden (ej: solo repositorios de seguridad)
5. Envía email con resultado (si MAILTO configurado)
6. Reinicia el sistema si hay kernel nuevo Y AutomaticReboot=true (peligroso en prod!)

ARCHIVOS CLAVE:
/etc/apt/apt.conf.d/50unattended-upgrades   → configuración principal
/etc/apt/apt.conf.d/20auto-upgrades         → habilitación del timer
/var/log/unattended-upgrades/               → logs de ejecuciones
/var/run/reboot-required                    → existe si necesita reinicio
\`\`\`

### 📖 Instalación y configuración

\`\`\`bash
# Instalar
sudo apt-get install -y unattended-upgrades apt-listchanges

# Habilitar (configura los timers de apt)
sudo dpkg-reconfigure --priority=low unattended-upgrades

# O manualmente crear /etc/apt/apt.conf.d/20auto-upgrades:
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";      // actualizar listas diariamente
APT::Periodic::Unattended-Upgrade "1";         // aplicar upgrades diariamente
APT::Periodic::AutocleanInterval "7";          // limpiar paquetes viejos cada 7 días
APT::Periodic::Download-Upgradeable-Packages "1";
EOF
\`\`\`

### 📖 Configuración de 50unattended-upgrades

\`\`\`bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
\`\`\`

\`\`\`text
Unattended-Upgrade::Origins-Pattern {
    // Solo repositorios de seguridad de Ubuntu (patrón recomendado para producción)
    "origin=Ubuntu,archive=\${distro_codename}-security,label=Ubuntu";

    // NO incluir updates generales (pueden cambiar comportamiento)
    // "origin=Ubuntu,archive=\${distro_codename}-updates";

    // Para Debian:
    // "origin=Debian,codename=\${distro_codename},label=Debian-Security";
};

// Paquetes a excluir SIEMPRE (ejemplo: software crítico con dependencias frágiles)
Unattended-Upgrade::Package-Blacklist {
    "mysql-server";         // actualizar manualmente con ventana de mantenimiento
    "nginx";                // igual
    "php8.1";               // testar en staging primero
};

// Email de notificación (requiere postfix o sendmail)
Unattended-Upgrade::Mail "ops@empresa.com";
Unattended-Upgrade::MailReport "only-on-error";  // "always" o "only-on-error"

// Eliminar dependencias huérfanas automáticamente
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";

// Reinicio automático — PELIGROSO EN PRODUCCIÓN
// Solo habilitar si tienes HA o en ventana de mantenimiento
Unattended-Upgrade::Automatic-Reboot "false";   // dejar en false para prod
Unattended-Upgrade::Automatic-Reboot-Time "03:00";  // si se habilita, a las 3 AM

// Logging detallado
Unattended-Upgrade::Verbose "false";
\`\`\`

### 📖 Verificación y depuración

\`\`\`bash
# Ejecutar manualmente con modo dry-run
sudo unattended-upgrades --dry-run --debug 2>&1 | head -50

# Ejecutar de verdad con verbose
sudo unattended-upgrades -v

# Ver logs de ejecuciones anteriores
ls -la /var/log/unattended-upgrades/
tail -50 /var/log/unattended-upgrades/unattended-upgrades.log
grep "Packages that were upgraded" /var/log/unattended-upgrades/unattended-upgrades.log

# Verificar que el timer está activo
systemctl status apt-daily.timer apt-daily-upgrade.timer
systemctl list-timers | grep apt

# Ver cuándo fue la última ejecución
journalctl -u apt-daily-upgrade.service --since "7 days ago"

# Verificar si hay reinicio pendiente
ls /var/run/reboot-required 2>/dev/null && echo "REINICIO PENDIENTE"
cat /var/run/reboot-required.pkgs  # qué paquetes lo requieren
\`\`\`

### 📖 dnf-automatic: equivalente en RHEL/Fedora

\`\`\`bash
# Instalar
sudo dnf install -y dnf-automatic

# Configurar
sudo nano /etc/dnf/automatic.conf
\`\`\`

\`\`\`ini
[commands]
# Solo descargar (no instalar) — la opción más conservadora
upgrade_type = security       # solo actualizaciones de seguridad
random_sleep = 360            # aleatorio hasta 6 horas (evitar sobrecarga simultánea)
download_updates = yes
apply_updates = yes           # cambiar a "no" para solo notificar

[emitters]
emit_via = email,motd
\`\`\`

\`\`\`bash
# Habilitar el timer (aplicación automática)
sudo systemctl enable --now dnf-automatic.timer

# O solo descarga sin instalación:
sudo systemctl enable --now dnf-automatic-download.timer
# Luego instalar manualmente cuando sea conveniente:
sudo dnf upgrade --cacheonly

# Verificar
sudo systemctl status dnf-automatic.timer
journalctl -u dnf-automatic.service --since "24 hours ago"
\`\`\`

### 📋 Lo que debes recordar

* En producción: automáticamente aplicar parches de seguridad SÍ, pero con \`Automatic-Reboot "false"\` — el reinicio debe ser manual y planificado.
* Usa la blacklist para excluir paquetes críticos que requieren pruebas previas: bases de datos, servidores web, lenguajes de programación.
* Los logs de unattended-upgrades son tu auditoría: registran qué se actualizó, cuándo y con qué resultado.
* Combina con \`needrestart\`: detecta servicios que usan librerías actualizadas y necesitan reinicio sin reiniciar el kernel.

### 🧪 Autoevaluación

1. ¿Por qué configurar \`Automatic-Reboot "false"\` en servidores de producción aunque haya un nuevo kernel?
2. Tu unattended-upgrades está configurado y habilitado, pero nunca viste un email de confirmación. ¿Cómo verificas si está funcionando?
3. ¿Qué riesgo introduce poner \`nginx\` en la blacklist de unattended-upgrades?

---

1. Un reinicio en producción sin ventana de mantenimiento puede interrumpir servicios en horario de uso, causar pérdida de sesiones activas, o fallar si hay procesos críticos que no se detienen limpiamente. La práctica correcta es: el parche se aplica automáticamente (el kernel nuevo se instala), pero el reinicio para activarlo se programa en la próxima ventana de mantenimiento con \`shutdown -r 03:00\` o mediante herramientas de orquestación.
2. Tres formas: (1) Ver los logs directamente: \`tail -100 /var/log/unattended-upgrades/unattended-upgrades.log\`. (2) Ejecutar manualmente: \`sudo unattended-upgrades -v\` y ver el output. (3) Verificar el timer: \`systemctl status apt-daily-upgrade.timer\` y \`journalctl -u apt-daily-upgrade.service\`. Si el timer corre pero no hay parches, los logs mostrarán "No packages found that can be upgraded unattended" — lo que significa que está funcionando pero no había parches pendientes.
3. El riesgo es que nginx acumule CVEs sin parchear. Si un CVE crítico aparece en nginx y está en la blacklist, el sistema automático no lo aplicará. La resolución es tener un proceso manual explícito: las blacklisted deben ser revisadas en cada ciclo de parches manual. La blacklist no es "no parchear nunca" — es "no parchear sin revisión humana".
`

export default content
