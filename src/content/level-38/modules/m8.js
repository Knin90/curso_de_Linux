const content = `
## Módulo 8 — Entrega: checklist de aceptación, runbook y documentación final

### 🎯 Objetivos de aprendizaje

* Ejecutar el checklist maestro del proyecto completo con evidencia real, no por memoria.
* Escribir un runbook de operación que permita a otro administrador operar srv-prod01 sin haber participado en su construcción.
* Documentar la arquitectura final del servidor de forma que sea consultable y mantenible.
* Cerrar el proyecto con un criterio de aceptación explícito y verificable.

### ❓ El problema real

srv-prod01 está técnicamente terminado: tiene usuarios, red endurecida, almacenamiento en LVM, servicios gestionados por systemd, SELinux enforcing, TLS y backups verificados. Pero si mañana el administrador que lo construyó se va de vacaciones, se enferma, o simplemente cambia de equipo, ¿puede otra persona operarlo? Si la respuesta no es un "sí" inmediato y demostrable, el proyecto no está completo: falta el pilar de documentación definido en el módulo 1. Este módulo cierra el proyecto formalmente.

### 📖 Ejecución del checklist maestro con evidencia

El checklist definido en el módulo 1 se recorre aquí punto por punto, exigiendo el comando y la salida que demuestran su cumplimiento, no solo la afirmación de que "ya se hizo".

\`\`\`text
[x] M2 — Hostname, usuarios y sudo
    hostnamectl status            → Static hostname: srv-prod01
    id dscastro                   → grupos=...,sysadmins
    sudo -l -U dscastro            → (ALL) ALL

[x] M2 — Sistema actualizado y hardening inicial
    dnf list updates              → sin actualizaciones pendientes
    systemctl list-unit-files --state=enabled → solo servicios del rol definido en M1

[x] M3 — SSH endurecido
    sshd -T | grep -E 'permitrootlogin|passwordauthentication|port'
      → permitrootlogin no / passwordauthentication no / port 2222
    nmap -Pn -p22 srv-prod01      → 22/tcp closed

[x] M3 — Firewall con superficie mínima
    firewall-cmd --list-all       → coincide con la matriz de puertos del módulo 3

[x] M4 — LVM con volúmenes separados
    lsblk; lvs; df -hT | grep vg_data → lv_log, lv_www, lv_home montados

[x] M4 — fstab persistente
    mount -a && reboot && df -hT  → montajes sobreviven al reinicio

[x] M5 — systemd gestionando nginx y app-srv con restart automático
    kill -9 <PID app-srv>; sleep 6; systemctl status app-srv → active (running)

[x] M6 — SELinux enforcing, auditd activo, TLS válido
    getenforce                    → Enforcing
    systemctl status auditd       → active
    openssl x509 -noout -dates    → notAfter dentro del rango vigente

[x] M7 — Logs, monitoreo y backups verificados
    logrotate -d ...              → configuración válida
    curl 127.0.0.1:9100/metrics   → métricas expuestas
    diff -rq (restore-test)       → sin diferencias, backup verificado
\`\`\`

Cada línea marcada con \`[x]\` en un proyecto real debe estar respaldada por la salida real del comando, guardada como evidencia (captura, log o archivo de texto) junto con el runbook.

### 📖 Runbook de operación de srv-prod01

El runbook es el documento que un administrador nuevo lee para operar el servidor sin preguntas. Se estructura por tarea operativa, no por módulo del proyecto.

\`\`\`text
# RUNBOOK — srv-prod01

## 1. Acceso al servidor
ssh -i ~/.ssh/srv-prod01_ed25519 -p 2222 <usuario>@srv-prod01
(el usuario debe estar en el grupo sysadmins y en AllowUsers de sshd_config)

## 2. Verificar estado general
systemctl status nginx app-srv.service auditd firewalld
curl -s http://127.0.0.1:8080/healthz
df -hT | grep vg_data

## 3. Reiniciar la aplicación (mantenimiento planificado)
systemctl restart app-srv.service
journalctl -u app-srv.service -f      # observar arranque limpio

## 4. Diagnosticar un 502/503 en el sitio
1. curl 127.0.0.1:8080/healthz         → ¿responde la app directamente?
2. systemctl status app-srv.service    → ¿está activo?
3. journalctl -u app-srv.service -n 50 → ¿qué error dejó?
4. nginx -t && tail -f /var/log/nginx/error.log

## 5. El disco de /var/log se está llenando
lvextend -L +2G /dev/vg_data/lv_log
xfs_growfs /var/log
# Revisar por qué crece: journalctl --disk-usage, du -sh /var/log/*

## 6. Restaurar desde backup
tar -xzf /opt/backups/srv-prod01/backup-<fecha>.tar.gz -C /tmp/restore
# revisar contenido antes de copiar sobre producción
rsync -a /tmp/restore/var/www/srv-prod01/ /var/www/srv-prod01/
systemctl restart app-srv.service

## 7. Renovar o forzar la revisión del certificado TLS
certbot renew --dry-run
certbot certificates

## 8. Contactos y escalamiento
Administrador principal: dscastro
Escalamiento fuera de horario: <definir según la organización>
\`\`\`

### 📖 Documentación de arquitectura final

\`\`\`text
# ARQUITECTURA — srv-prod01

Hostname:        srv-prod01
Rol:             servidor web de producción

Red:
  - SSH: puerto 2222, solo llaves, usuario dscastro (grupo sysadmins)
  - HTTP: 80 (redirige a 443)
  - HTTPS: 443 (nginx + certbot, renovación automática)
  - Firewall: firewalld, zona drop por defecto

Almacenamiento:
  - /dev/sda: sistema operativo (20G, no crece)
  - /dev/sdb → vg_data:
      lv_log  (5G)  → /var/log
      lv_www  (10G) → /var/www
      lv_home (5G)  → /home
  - 10G libres en vg_data como margen de crecimiento

Servicios:
  - nginx: proxy inverso + TLS, unit gestionado por systemd
  - app-srv.service: aplicación en Node.js, corre como appsvc, Restart=on-failure

Seguridad:
  - SELinux: enforcing (política local srv_prod01_local.pp)
  - auditd: reglas sobre sudoers, sshd_config, firewall, /var/www/srv-prod01
  - TLS: Let's Encrypt vía certbot, renovación automática verificada

Observabilidad:
  - logrotate: nginx 14 días, app 30 días, journald 7 días, auditd 90 días
  - node_exporter en 127.0.0.1:9100 para Prometheus
  - backup diario 02:00 vía systemd timer, restauración verificada
\`\`\`

### 📖 Criterio de aceptación final del proyecto

\`\`\`text
El proyecto se considera ACEPTADO cuando:

1. Las 10 líneas del checklist maestro están marcadas con evidencia adjunta.
2. Un administrador que no participó en la construcción puede, siguiendo solo
   el runbook, diagnosticar y resolver un 502 simulado sin ayuda del autor original.
3. Un reinicio completo del servidor (reboot) deja todos los servicios
   operativos automáticamente, sin intervención manual.
4. La restauración de un backup a un entorno de prueba reproduce el estado
   funcional de la aplicación.
\`\`\`

El punto 2 es la prueba definitiva del pilar de documentación: si el runbook no es suficiente para que otra persona opere el servidor, el proyecto no está terminado, sin importar cuán sólida sea la configuración técnica subyacente.

### 📋 Lo que debes recordar

* El checklist maestro se cierra con evidencia real de cada comando, no con la memoria de que "se hizo en el módulo correspondiente".
* El runbook se organiza por tarea operativa (acceso, diagnóstico, restauración), no por el orden en que se construyó el servidor.
* La prueba definitiva de que la documentación es suficiente es que otro administrador, sin contexto previo, resuelva un incidente simulado solo con el runbook.
* Un proyecto de infraestructura se acepta con un criterio explícito y verificable, igual que cualquier otro entregable de ingeniería.

### 🧪 Autoevaluación

1. ¿Por qué el checklist maestro exige "evidencia" (comando + salida) y no solo una casilla marcada?
2. ¿Por qué el runbook se organiza por tarea operativa y no siguiendo el orden de los módulos 1 a 7 del proyecto?
3. ¿Cuál es la prueba definitiva de que la documentación de srv-prod01 cumple el pilar de documentación definido en el módulo 1?

---

1. Porque una casilla marcada sin evidencia es una afirmación no verificable; en un proyecto real, otra persona (un auditor, un nuevo administrador, el propio autor meses después) necesita poder confirmar que cada requisito realmente se cumplió, y solo el comando con su salida real permite esa verificación.
2. Porque en una operación real nadie diagnostica un incidente pensando "esto correspondía al módulo 5"; el administrador de guardia necesita encontrar rápidamente la sección relevante a la situación que está viviendo (un 502, un disco lleno, un certificado por vencer), y esa es una estructura por tarea, no cronológica.
3. Que un administrador que no participó en la construcción del servidor logre diagnosticar y resolver un incidente simulado (por ejemplo, un 502) usando exclusivamente el runbook, sin consultar al autor original; si eso no es posible, la documentación es insuficiente sin importar cuán completa parezca en el papel.
`

export default content
