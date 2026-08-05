const content = `
## Módulo 5 — Targets: equivalente moderno a runlevels

### 🎯 Objetivos de aprendizaje

* Entender qué son los targets de systemd y cómo reemplazan a los runlevels de SysVinit.
* Saber cambiar el target en tiempo real y establecer el target por defecto.
* Conocer el rescue target para recuperación de sistemas.

### 📖 De runlevels a targets

En SysVinit, los **runlevels** definían el estado del sistema:

\`\`\`text
  SysVinit Runlevels          systemd Targets equivalentes
  ────────────────────────    ─────────────────────────────────────────
  0  Apagado                  poweroff.target
  1  Monousuario              rescue.target
  2  Multiusuario sin red     (no tiene equivalente directo)
  3  Multiusuario con red     multi-user.target
  4  Reservado                (no usado)
  5  Multiusuario con GUI     graphical.target
  6  Reinicio                 reboot.target
\`\`\`

En systemd, los **targets** son mucho más flexibles — son simplemente unidades que agrupan otras unidades. Pueden depender entre sí y coexistir múltiples targets activos simultáneamente.

### 📖 Los targets más importantes

\`\`\`text
  poweroff.target
  └── Apaga el sistema completamente

  rescue.target
  └── Monousuario, sin servicios de red
  └── Para reparar sistemas dañados
  └── Solo el usuario root puede conectarse

  multi-user.target
  └── Servidor típico sin GUI
  └── Red disponible, múltiples usuarios
  └── La mayoría de servidores Linux usan este target

  graphical.target
  └── multi-user.target + servidor gráfico (Xorg/Wayland)
  └── Escritorios Linux (GNOME, KDE...)

  emergency.target
  └── Más básico que rescue — solo el sistema de archivos raíz en modo solo lectura
  └── Para cuando ni rescue.target funciona
\`\`\`

### 💻 Gestionar targets

\`\`\`bash
# Ver el target activo actualmente
systemctl get-default

# Ver todos los targets activos
systemctl list-units --type=target

# Cambiar el target por defecto (persiste entre reinicios)
sudo systemctl set-default multi-user.target
sudo systemctl set-default graphical.target

# Cambiar el target en tiempo real (sin reiniciar)
# Equivalente a cambiar el runlevel en caliente
sudo systemctl isolate multi-user.target

# Apagar el sistema ordenadamente
sudo systemctl poweroff

# Reiniciar
sudo systemctl reboot

# Entrar en modo rescate (emergency, sin red)
sudo systemctl rescue

# Suspender el sistema
sudo systemctl suspend
\`\`\`

### 📖 ¿Cómo sabe systemd qué servicios activar en cada target?

Los servicios usan \`WantedBy=\` en su sección \`[Install]\` para declarar en qué target quieren participar:

\`\`\`ini
[Install]
WantedBy=multi-user.target
\`\`\`

Cuando se ejecuta \`systemctl enable\`, systemd crea el enlace simbólico en el directorio \`.wants\` del target declarado:

\`\`\`bash
ls /etc/systemd/system/multi-user.target.wants/
# nginx.service → /usr/lib/systemd/system/nginx.service
# sshd.service  → /usr/lib/systemd/system/sshd.service
# chronyd.service → ...
\`\`\`

### 📖 Ver las dependencias de un target

\`\`\`bash
# Ver qué unidades componen el multi-user.target
systemctl list-dependencies multi-user.target

# Ver de qué depende un servicio específico
systemctl list-dependencies nginx.service

# Ver qué servicios dependen de nginx (quién necesita a nginx)
systemctl list-dependencies --reverse nginx.service
\`\`\`

### 📖 Recuperación con rescue.target

Cuando el sistema no arranca correctamente:

\`\`\`bash
# Desde la línea de comandos del sistema arrancado:
sudo systemctl rescue

# Desde GRUB (al arrancar): añadir al kernel
systemd.unit=rescue.target
# o
systemd.unit=emergency.target
\`\`\`

> En rescue.target solo root puede conectarse, no hay red, y solo los servicios esenciales corren. Es el equivalente al "modo seguro" de Linux.

### 📋 Lo que debes recordar

* \`multi-user.target\` = servidor sin GUI. \`graphical.target\` = escritorio con GUI.
* \`set-default\` cambia el target permanente. \`isolate\` cambia en caliente.
* Los servicios declaran su target en \`WantedBy=\`. \`enable\` crea el enlace en el directorio \`.wants\` de ese target.
* \`rescue.target\` para reparar sistemas; \`emergency.target\` cuando ni rescue funciona.

### 🧪 Autoevaluación rápida

1. En un servidor Linux sin interfaz gráfica, ¿cuál debería ser el target por defecto?
2. ¿Qué hace \`systemctl isolate multi-user.target\`?
3. Si en la sección \`[Install]\` de un .service dice \`WantedBy=graphical.target\`, ¿qué pasa cuando ese servicio se habilita en un servidor sin GUI (multi-user.target)?

---

1. \`multi-user.target\` — es el target estándar para servidores Linux sin entorno gráfico.
2. Cambia el target activo **en tiempo real** a \`multi-user.target\`, deteniendo los servicios que no pertenecen a él (como el servidor gráfico) sin reiniciar.
3. El servicio se habilitará en el target declarado (\`graphical.target\`). Si el sistema arranca en \`multi-user.target\`, ese servicio **no arrancará** porque no está declarado en multi-user. Habría que añadir \`WantedBy=multi-user.target\` también.
`
export default content
