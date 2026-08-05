const content = `
## Módulo 2 — systemctl: ciclo de vida de servicios

### 🎯 Objetivos de aprendizaje

* Dominar los comandos de systemctl para el ciclo de vida completo de un servicio.
* Interpretar correctamente la salida de \`systemctl status\`.
* Entender la diferencia crítica entre \`restart\` y \`reload\` en producción.

### 📖 systemctl: la interfaz con systemd

\`systemctl\` (System Control) es la herramienta que usas para comunicarte con el proceso systemd (PID 1). Todas las operaciones sobre servicios pasan por aquí.

### 💻 Verificar el estado de un servicio

\`\`\`bash
sudo systemctl status sshd
\`\`\`

\`\`\`text
● ssh.service - OpenBSD Secure Shell server
     Loaded: loaded (/usr/lib/systemd/system/ssh.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2026-08-04 09:14:22 UTC; 6h ago
       Docs: man:sshd(8) man:sshd_config(5)
   Main PID: 890 (sshd)
      Tasks: 1 (limit: 4614)
     Memory: 5.4M
        CPU: 234ms
     CGroup: /system.slice/ssh.service
             └─890 "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups"
\`\`\`

**Anatomía del output:**

| Campo | Significado |
| --- | --- |
| \`Loaded: loaded\` | systemd conoce esta unidad |
| \`enabled\` / \`disabled\` | ¿Arranca automáticamente al boot? |
| \`Active: active (running)\` | Está corriendo ahora |
| \`Active: inactive (dead)\` | Está detenido |
| \`Active: failed\` | Terminó con error |
| \`Main PID\` | PID del proceso principal |
| \`CGroup\` | Árbol de procesos del servicio |

### 💻 Comandos del ciclo de vida

\`\`\`bash
# Arrancar un servicio (solo en esta sesión)
sudo systemctl start nginx

# Detener un servicio
sudo systemctl stop nginx

# Reiniciar (mata el proceso y lo vuelve a crear — corta conexiones)
sudo systemctl restart nginx

# Recargar configuración sin matar el proceso
sudo systemctl reload nginx

# Restart si soporta reload, sino restart automáticamente
sudo systemctl reload-or-restart nginx

# Matar brutalmente un proceso que no responde a stop
sudo systemctl kill nginx

# Ver si un servicio está corriendo en este momento
systemctl is-active nginx
# active / inactive / failed

# Ver si está configurado para arrancar al boot
systemctl is-enabled nginx
# enabled / disabled / masked
\`\`\`

### 📖 restart vs reload: la decisión más importante en producción

\`\`\`text
  systemctl restart nginx
  ─────────────────────────────────────────────
  1. systemd envía SIGTERM al proceso nginx
  2. nginx termina (todas las conexiones se cortan)
  3. systemd crea un nuevo proceso nginx
  4. nginx carga la nueva configuración
  ✗ Resultado: 500 usuarios conectados pierden su conexión

  systemctl reload nginx
  ─────────────────────────────────────────────
  1. systemd envía SIGHUP al proceso nginx
  2. nginx recibe la señal mientras sigue corriendo
  3. nginx re-lee su archivo de configuración en caliente
  4. Las nuevas conexiones usan la nueva configuración
  ✓ Resultado: 0 usuarios afectados
\`\`\`

> ⚠️ No todos los servicios soportan \`reload\`. Si lo intentas con uno que no lo soporta, systemd responde con error. En ese caso usa \`reload-or-restart\` — intenta reload, y si falla, hace restart.

### 💻 Verificación rápida del estado de múltiples servicios

\`\`\`bash
# Ver si nginx y sshd están corriendo
systemctl is-active nginx sshd

# Ver estado resumido de varios servicios a la vez
systemctl status nginx sshd mysql

# Listar todos los servicios fallidos
systemctl list-units --type=service --state=failed

# Ver todos los servicios (corriendo + parados)
systemctl list-units --type=service --all
\`\`\`

### 📋 Lo que debes recordar

* \`status\` muestra dos estados independientes: \`Loaded\` (persistencia) y \`Active\` (estado actual).
* \`restart\` corta todas las conexiones activas. \`reload\` aplica configuración en caliente.
* Usar \`reload-or-restart\` cuando no sabes si el servicio soporta reload.
* \`is-active\` y \`is-enabled\` devuelven texto legible — útil en scripts de automatización.

### 🧪 Autoevaluación rápida

1. En la salida de \`systemctl status\`, ¿qué indica \`Active: active (running)\` vs \`Loaded: enabled\`?
2. Tienes 200 usuarios conectados a un servidor SSH y necesitas aplicar un cambio en \`/etc/ssh/sshd_config\`. ¿Qué comando usas?
3. ¿Qué hace \`systemctl kill nginx\` diferente de \`systemctl stop nginx\`?

---

1. \`Active: active (running)\` = el servicio está corriendo **ahora mismo**. \`Loaded: enabled\` = systemd lo **arrancará automáticamente** en el próximo boot. Son estados independientes.
2. \`sudo systemctl reload sshd\` — aplica la nueva configuración sin cortar las sesiones SSH activas.
3. \`stop\` envía SIGTERM y espera a que el proceso termine limpiamente. \`kill\` envía SIGKILL inmediatamente — para procesos que no responden a \`stop\`.
`
export default content
