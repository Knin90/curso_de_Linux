const content = `
## Módulo 7 — Diagnóstico y troubleshooting de servicios

### 🎯 Objetivos de aprendizaje

* Diagnosticar sistemáticamente por qué un servicio falla al arrancar.
* Interpretar códigos de salida y señales de terminación.
* Aplicar un flujo de diagnóstico estructurado en producción.

### 📖 El flujo de diagnóstico en 5 pasos

Cuando un servicio falla, el instinto del novato es reiniciarlo esperando que funcione. El administrador experimentado sigue un proceso:

\`\`\`text
  1. ¿Qué está pasando ahora?
     systemctl status servicio

  2. ¿Cuándo exactamente falló y cuál fue el último mensaje?
     journalctl -u servicio -n 50 --no-pager

  3. ¿Con qué código salió el proceso?
     systemctl show servicio -p ExitCode -p Result

  4. ¿El archivo de configuración tiene errores de sintaxis?
     nginx -t     # para nginx
     sshd -t      # para sshd
     apachectl configtest  # para apache

  5. ¿Hay conflictos de puertos o permisos?
     ss -tlnp | grep :80
     ls -la /var/run/nginx.pid
\`\`\`

### 💻 Interpretar el estado "failed"

\`\`\`bash
systemctl status nginx
\`\`\`

\`\`\`text
● nginx.service - A high performance web server
     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled)
     Active: failed (Result: exit-code) since Tue 2026-08-04 15:30:12 UTC; 3min ago
    Process: 12345 ExecStart=/usr/sbin/nginx -g daemon off; (code=exited, status=1/FAILURE)
   Main PID: 12345 (code=exited, status=1/FAILURE)

Aug 04 15:30:12 server nginx[12345]: nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
\`\`\`

**Leer este output:**
* \`Result: exit-code\` → el proceso terminó con un código de error
* \`status=1/FAILURE\` → código de salida 1 (error genérico)
* El mensaje final: puerto 80 ya está en uso por otro proceso

### 📖 Códigos de resultado de systemd

| Result | Causa |
| --- | --- |
| \`success\` | El proceso terminó correctamente (código 0) |
| \`exit-code\` | El proceso terminó con código de error != 0 |
| \`signal\` | El proceso fue terminado por una señal (SIGKILL, SIGSEGV...) |
| \`core-dump\` | El proceso generó un core dump (crash grave) |
| \`timeout\` | El proceso no arrancó o no se detuvo en el tiempo límite |
| \`start-limit-hit\` | Superó el límite de intentos de reinicio |

### 💻 Diagnóstico de conflictos de puerto

\`\`\`bash
# ¿Qué proceso usa el puerto 80?
sudo ss -tlnp | grep :80
# o
sudo lsof -i :80

# Ver todos los puertos en uso
sudo ss -tlnp

# Matar el proceso que ocupa el puerto (con precaución)
sudo kill -9 <PID>
\`\`\`

### 💻 Diagnóstico de permisos

\`\`\`bash
# ¿El servicio tiene acceso al archivo que necesita?
sudo -u www-data ls /var/www/html  # Intentar acceder como el usuario del servicio

# ¿El socket/PID tiene los permisos correctos?
ls -la /var/run/nginx.pid
ls -la /run/nginx/

# ¿El ejecutable tiene permisos de ejecución?
ls -la /usr/sbin/nginx
\`\`\`

### 💻 El servicio supera el límite de reintentos

\`\`\`bash
systemctl status miapp
# Active: failed (Result: start-limit-hit)

# Ver cuántos intentos permitidos y en qué ventana
systemctl show miapp -p StartLimitBurst -p StartLimitIntervalSec

# Resetear el contador para intentar arrancar de nuevo
sudo systemctl reset-failed miapp
sudo systemctl start miapp
\`\`\`

### 💻 Verificar la sintaxis antes de reiniciar

\`\`\`bash
# nginx
sudo nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# sshd
sudo sshd -t

# apache2
sudo apache2ctl configtest

# Verificar la unidad .service
sudo systemd-analyze verify /etc/systemd/system/miapp.service
\`\`\`

### 💻 Ver logs del arranque anterior después de un crash

\`\`\`bash
# ¿Cuántos boots hay registrados?
journalctl --list-boots

# Logs del arranque anterior
journalctl -b -1

# Logs del servicio en el arranque anterior
journalctl -b -1 -u nginx

# Buscar el último mensaje de pánico del kernel
journalctl -b -1 -k | grep -i "panic\|error\|fail"
\`\`\`

### 📖 Checklist de troubleshooting rápido

\`\`\`text
  ✓ systemctl status servicio        → ¿qué dice el estado y el último mensaje?
  ✓ journalctl -u servicio -n 30     → ¿qué dijo el proceso antes de morir?
  ✓ servicio -t (test de config)     → ¿hay errores de sintaxis?
  ✓ ss -tlnp | grep :PUERTO         → ¿hay conflicto de puerto?
  ✓ systemctl show servicio -p User  → ¿corre con el usuario correcto?
  ✓ journalctl -b -1 -u servicio     → ¿qué pasó en el arranque anterior?
  ✓ systemctl list-dependencies      → ¿alguna dependencia falló primero?
\`\`\`

### 📋 Lo que debes recordar

* El mensaje final en \`systemctl status\` suele contener la causa raíz directa.
* \`start-limit-hit\` no significa que el problema persiste — significa que systemd se rindió de reintentar. \`reset-failed\` para intentar de nuevo.
* Verificar la configuración con el flag \`-t\` (test) del servicio antes de hacer \`restart\`.
* \`journalctl -b -1\` es indispensable cuando el sistema crasheó y se reinició solo.

### 🧪 Autoevaluación rápida

1. \`systemctl status nginx\` muestra \`Active: failed (Result: start-limit-hit)\`. ¿Está nginx fallando ahora mismo o es un estado histórico?
2. ¿Cómo averiguas qué proceso ocupa el puerto 443 antes de arrancar nginx?
3. Modificaste \`/etc/nginx/nginx.conf\`. ¿Qué verificas antes de hacer \`systemctl reload nginx\`?

---

1. Es un **estado histórico**: nginx intentó arrancar varias veces, falló cada vez, y systemd dejó de reintentar. El problema original puede seguir presente. Investigar con \`journalctl -u nginx -n 30\` para encontrar la causa.
2. \`sudo ss -tlnp | grep :443\` o \`sudo lsof -i :443\`.
3. \`sudo nginx -t\` — verifica la sintaxis del archivo de configuración. Si hay errores, \`reload\` fallará.
`
export default content
