const content = `
## Módulo 8 — Caso real: examen final integrador y criterio de certificación

### 🎯 Objetivos de aprendizaje

* Resolver un incidente multicausa que cruza fundamentos, administración, troubleshooting y automatización simultáneamente.
* Aplicar el checklist completo de competencias esperadas de un egresado del curso.
* Autoevaluarse contra el criterio de aprobación final y decidir si se está listo para roles de administración Linux en producción.

### ❓ El problema real

En producción los incidentes reales rara vez tienen una sola causa. Este examen final presenta un escenario extenso donde una alerta inicial simple esconde una cadena de causas relacionadas con redes, almacenamiento, systemd y un script de automatización defectuoso — exactamente el tipo de incidente que un administrador junior enfrenta en su primer mes de trabajo real.

### 📖 Estructura del caso

\`\`\`
Examen final integrador
├── Escenario integrador          ← incidente multicausa a resolver
├── Checklist de competencias     ← 14 ítems, fundamentos → automatización
├── Criterio de aprobación        ← tabla de niveles de certificación
└── Autoevaluación final          ← 3 preguntas de cierre
\`\`\`

### 📖 Escenario integrador — "El viernes de la caída en cascada"

Son las 18:40 de un viernes. Llega una alerta: el sitio \`shop.miempresa.com\` no responde. El equipo de guardia tiene acceso SSH al servidor \`web01\` y a los logs centralizados. Esta es la evidencia disponible, en el orden en que se va recolectando:

**Paso 1 — Estado inicial**

\`\`\`bash
$ curl -I https://shop.miempresa.com
curl: (28) Failed to connect: Connection timed out

$ ssh admin@web01
$ systemctl status nginx
● nginx.service - A high performance web server
   Active: active (running) since Fri 08:00:01
\`\`\`

nginx está activo, pero el sitio no responde desde afuera. *Tarea:* proponer la siguiente hipótesis a verificar y el comando correspondiente.

**Paso 2 — Verificación de backend**

\`\`\`bash
$ curl -I http://localhost:80
HTTP/1.1 502 Bad Gateway

$ systemctl status app-backend.service
● app-backend.service - App Backend
   Active: failed (Result: exit-code) since 18:22:47
  Process: 8821 ExecStart=/opt/app/start.sh (code=exited, status=1/FAILURE)
\`\`\`

El backend está caído desde las 18:22. nginx devuelve 502 porque no puede conectar al backend. *Tarea:* identificar por qué el "servicio caído" no era nginx sino su dependencia, y el siguiente log a revisar.

**Paso 3 — Causa del fallo del backend**

\`\`\`bash
$ journalctl -u app-backend.service --since "18:20" | tail -15
Aug 14 18:22:40 web01 start.sh[8821]: ERROR: cannot write to /var/lib/app/uploads: No space left on device
Aug 14 18:22:47 web01 systemd[1]: app-backend.service: Main process exited, code=exited, status=1/FAILURE

$ df -h /var
Filesystem  Size  Used Avail Use% Mounted on
/dev/sda3    20G   20G     0 100% /var
\`\`\`

Disco lleno. *Tarea:* antes de borrar nada, identificar qué está consumiendo el espacio.

**Paso 4 — Causa raíz del disco lleno**

\`\`\`bash
$ du -xh --max-depth=2 /var 2>/dev/null | sort -rh | head -5
14G  /var/lib/app/uploads
5G   /var/log

$ ls /var/lib/app/uploads | wc -l
48231

$ crontab -l -u app
0 2 * * * /opt/scripts/cleanup-uploads.sh
\`\`\`

Hay un cron job diseñado para limpiar uploads antiguos que corre a las 2 AM. *Tarea:* revisar el script.

**Paso 5 — El script defectuoso**

\`\`\`bash
$ cat /opt/scripts/cleanup-uploads.sh
#!/bin/bash
UPLOADS_DIR=/var/lib/app/uploads
find $UPLOADS_DIR -mtime +30 -exec rm {} \\;
\`\`\`

\`\`\`bash
$ journalctl -u cron --since "today 02:00" | grep cleanup
(sin resultados)
\`\`\`

El script existe en crontab pero no hay evidencia de que haya corrido hoy. *Tarea:* investigar por qué (verificar que el servicio cron esté activo, verificar permisos de ejecución del script, verificar el log de cron/syslog específico en vez de journalctl -u cron si el sistema usa cron tradicional).

**Paso 6 — Hallazgo final**

\`\`\`bash
$ ls -l /opt/scripts/cleanup-uploads.sh
-rw-r--r-- 1 root root 120 jul 02 2025 cleanup-uploads.sh

$ systemctl status cron
● cron.service - Regular background program processing daemon
   Active: active (running)
\`\`\`

El script nunca tuvo permiso de ejecución desde que fue desplegado hace más de un mes. Cron intentaba ejecutarlo silenciosamente y fallaba cada noche sin alertar a nadie, permitiendo que los uploads se acumularan sin control hasta llenar el disco.

*Tarea final del escenario:* redactar la causa raíz completa del incidente (una frase), la corrección inmediata (3 pasos) y la corrección de fondo (2 medidas preventivas).

**Causa raíz:** el script de limpieza de uploads nunca tuvo permiso de ejecución tras su despliegue, por lo que cron falló silenciosamente cada noche durante más de un mes, permitiendo que el disco de \`/var\` se llenara y provocara la caída en cascada del backend y, por dependencia, del sitio completo.

**Corrección inmediata:**
1. \`chmod +x /opt/scripts/cleanup-uploads.sh\` y ejecutarlo manualmente para liberar espacio urgente.
2. \`systemctl restart app-backend.service\` una vez liberado el espacio.
3. Verificar con \`curl\` externo que el sitio vuelve a responder.

**Corrección de fondo:**
1. Agregar monitoreo de espacio en disco con alerta temprana (80%/90%) para no depender de la caída del servicio como señal.
2. Agregar logging explícito y verificación de código de salida al script de limpieza (o migrarlo a un systemd timer con \`OnFailure=\` para alertar si falla), de forma que un fallo silencioso de cron nunca vuelva a pasar desapercibido.

### 📖 Checklist final — Qué debe saber hacer un egresado del curso

* Navegar y manipular el filesystem, procesos, usuarios y permisos con criterio de menor privilegio.
* Diagnosticar problemas de red por capas, desde resolución DNS hasta firewall y aplicación.
* Gestionar almacenamiento (particiones, LVM, RAID) sin poner en riesgo la integridad de los datos.
* Administrar servicios con systemd, incluyendo diagnóstico de fallos vía journalctl.
* Configurar y endurecer acceso SSH siguiendo el orden correcto de cambios.
* Gestionar paquetes sin desactivar verificaciones de seguridad como atajo.
* Correlacionar logs de múltiples fuentes para reconstruir la causa de un incidente.
* Diagnosticar y recuperar sistemas que no arrancan, incluyendo el reset de acceso root cuando corresponde.
* Resolver incidentes de disco lleno identificando la causa raíz, no solo liberando espacio.
* Interpretar métricas de rendimiento (CPU, memoria, I/O wait, load average) sin confundir síntomas.
* Escribir scripts Bash robustos: manejo de errores, quoting correcto, prevención de condiciones de carrera.
* Elegir correctamente entre cron y systemd timers según el requisito operacional real.
* Resolver incidentes multicausa siguiendo una cadena de diagnóstico completa, no soluciones parciales.
* Comunicar un diagnóstico técnico de forma clara: síntoma, causa raíz, corrección inmediata, corrección de fondo.

### 📖 Criterio de aprobación final del curso

| Nivel de dominio | Descripción | Resultado |
|---|---|---|
| No certificado | Falla criterios eliminatorios (acciones destructivas sin verificación, desactivar controles de seguridad como atajo) en 2 o más módulos de evaluación | Repetir módulos de fundamentos antes de reintentar |
| Certificado — Junior | "Aceptable" o superior en los 7 módulos de evaluación (1 a 7), sin fallos eliminatorios | Preparado para roles de soporte/operaciones con supervisión |
| Certificado — Profesional | "Sólido" en al menos 5 de los 7 módulos de evaluación, resuelve el escenario integrador de este módulo de forma autónoma y completa | Preparado para roles de administración Linux en producción |

**Regla de cierre:** ningún nivel de certificación se otorga si hubo un fallo eliminatorio en seguridad (desactivar SELinux/AppArmor/firewall como solución, deshabilitar autenticación SSH sin verificación previa, loguear secretos, actuar sobre datos en riesgo sin verificación) en cualquiera de los 7 módulos, sin importar el puntaje del resto.

### 📋 Lo que debes recordar

* Un incidente real rara vez tiene una sola causa: "el disco se llenó" es el síntoma final, no la causa raíz completa.
* Cada nivel de certificación exige superar los módulos de evaluación sin fallos eliminatorios de seguridad, sin importar el puntaje del resto.
* El checklist de competencias es una herramienta de autodiagnóstico honesto, no una puntuación perfecta: identificar un área débil es un resultado válido y esperado.
* Un diagnóstico completo siempre distingue el síntoma superficial de la causa raíz que lo generó, y documenta corrección inmediata y corrección de fondo por separado.

### 🧪 Autoevaluación final

1. En el escenario integrador, ¿cuál fue la causa raíz real del incidente, y por qué "el disco se llenó" no es una respuesta completa?
2. Repasando el checklist: ¿hay algún ítem que no podrías resolver hoy sin consultar documentación? Identifícalo como tu próxima área de estudio.
3. Según el criterio de aprobación, ¿qué nivel de certificación corresponde a alguien que resuelve todo correctamente pero en un módulo anterior desactivó el firewall "para probar más rápido"?

---

1. La causa raíz fue que el script de limpieza de uploads nunca tuvo permiso de ejecución, por lo que cron falló silenciosamente durante más de un mes sin generar alerta. "El disco se llenó" es el síntoma final visible, no la causa: llenarse fue la consecuencia de que el mecanismo de limpieza automática nunca funcionó, y nadie lo notó porque el fallo era silencioso. Una respuesta completa siempre distingue el síntoma superficial de la causa que lo generó.
2. Respuesta abierta — es correcto y esperado identificar al menos un área débil; el objetivo del checklist es autodiagnóstico honesto, no una puntuación perfecta.
3. No certificado. Desactivar el firewall como atajo es un fallo eliminatorio de seguridad según el criterio de cierre, independientemente de que el resto del desempeño haya sido correcto — la regla de cierre invalida la certificación sin importar el puntaje en otros módulos.
`

export default content
