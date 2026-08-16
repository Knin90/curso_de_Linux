const content = `
## Módulo 1 — Definición del proyecto: requisitos de un servidor de producción real

### 🎯 Objetivos de aprendizaje

* Entender qué distingue a un servidor "de laboratorio" de un servidor de producción real.
* Definir los cuatro pilares de un servidor productivo: disponibilidad, seguridad, trazabilidad y documentación.
* Construir el checklist maestro del proyecto que se irá completando en los módulos 2 a 8.
* Fijar el alcance, la topología y el nombre del servidor que se construirá durante todo el nivel.

### ❓ El problema real

Una empresa pequeña necesita desplegar su primera aplicación web propia en un servidor Linux. El equipo sabe instalar un sistema operativo y "hacer que funcione", pero nunca ha construido un servidor pensado para sobrevivir sin ellos: reinicios, ataques, discos llenos, certificados vencidos, o un administrador nuevo que tiene que operarlo sin haber estado en la reunión original. Este nivel resuelve exactamente ese problema: construir, de punta a punta, un servidor que cualquier administrador competente pueda operar, auditar y mantener.

A partir de este módulo, todo el trabajo se hace sobre **el mismo servidor**, con nombre de host \`srv-prod01\`, que representa un servidor web de producción para una aplicación interna de la organización.

### 📖 ¿Qué diferencia a un servidor de producción de una máquina de pruebas?

\`\`\`text
CRITERIO              LABORATORIO / PRUEBAS         PRODUCCIÓN REAL
──────────────────────────────────────────────────────────────────────────────
Acceso                root con contraseña           usuarios nominales + sudo + llaves SSH
Firewall              deshabilitado o abierto        superficie mínima, reglas explícitas
Almacenamiento        disco único, sin plan          LVM, particionado por propósito
Servicios             procesos sueltos, sin systemd  unit files, restart policy, healthchecks
Seguridad             SELinux/AppArmor en permissive  enforcing, auditado
Logs                  se pierden al reiniciar         centralizados, rotados, con retención
Backups               no existen                      automatizados, verificados, restaurables
Documentación         "está en mi cabeza"              runbook escrito, reproducible por otro admin
Cambios               manuales, no versionados         scripts, checklist, control de versiones
\`\`\`

Ningún punto de esta tabla es opcional en un entorno real. Un servidor que falla en cualquiera de estas filas no es un servidor de producción: es un experimento con suerte.

### 📖 Los cuatro pilares de un servidor de producción

**1. Disponibilidad**

El servicio debe seguir funcionando (o recuperarse rápido) ante fallos esperables: reinicios, caídas de un proceso, saturación de disco, picos de tráfico.

\`\`\`text
- systemd gestiona el ciclo de vida de los servicios (arranque, reinicio automático)
- El almacenamiento tiene margen de crecimiento (LVM permite extender sin downtime)
- Existen healthchecks que detectan un servicio caído antes que el usuario final
\`\`\`

**2. Seguridad**

El servidor reduce su superficie de ataque y contiene el daño si algo falla.

\`\`\`text
- Acceso remoto solo por SSH con llaves, sin contraseñas, sin root directo
- Firewall con política de denegación por defecto
- SELinux/AppArmor en modo enforcing, no permissive
- TLS en todo tráfico web expuesto
\`\`\`

**3. Trazabilidad**

Todo lo que ocurre en el servidor queda registrado y es auditable después del hecho.

\`\`\`text
- Logs de autenticación, del sistema y de la aplicación, centralizados y con retención
- auditd registrando cambios en archivos y comandos sensibles
- Historial de cambios de configuración (qué se cambió, cuándo, quién y por qué)
\`\`\`

**4. Documentación**

Un administrador distinto al que construyó el servidor puede operarlo sin preguntar.

\`\`\`text
- Runbook de operación: cómo arrancar, detener, diagnosticar y recuperar el servicio
- Diagrama o descripción de la arquitectura de red, almacenamiento y servicios
- Checklist de aceptación que demuestra que el servidor cumple los requisitos
\`\`\`

### 📖 El servidor del proyecto: srv-prod01

Durante los 8 módulos de este nivel se construye un único servidor con esta topología objetivo:

\`\`\`text
Hostname:        srv-prod01
Rol:             servidor web de producción (nginx como proxy + app backend)
Usuarios:        admin nominal con sudo, usuario de servicio sin shell para la app
Red expuesta:    HTTP (80, redirige a HTTPS) y HTTPS (443); SSH (puerto no estándar)
Almacenamiento:  LVM con volúmenes separados para /var/log, /var/www y /home
Servicios:       nginx (proxy inverso + TLS), app-srv (unit systemd propio)
Seguridad:       SELinux enforcing, firewalld con zona restrictiva, auditd activo
Observabilidad:  logs centralizados, monitoreo básico con Prometheus/Grafana
Backups:         systemd timer diario, verificado con restauración de prueba
\`\`\`

Cada módulo siguiente construye una pieza de esta topología sobre la instalación base ya existente. No se reinstala el sistema entre módulos: se avanza el mismo servidor, igual que ocurriría en un proyecto real.

### 📖 Checklist maestro del proyecto

Este es el checklist que se va marcando módulo a módulo. Se reproduce aquí completo para tener visión del alcance total; cada módulo detalla cómo cumplir su sección.

\`\`\`text
[ ] M2 — Hostname configurado, usuarios y grupos creados, sudo delegado sin contraseña de root
[ ] M2 — Sistema actualizado, servicios innecesarios deshabilitados, políticas de contraseña aplicadas
[ ] M3 — SSH endurecido (sin root, sin contraseña, puerto no estándar, solo usuarios autorizados)
[ ] M3 — Firewall activo con política deny-by-default y solo los puertos necesarios abiertos
[ ] M4 — LVM configurado con volúmenes separados para datos críticos y margen de crecimiento
[ ] M4 — /etc/fstab correcto, montajes persistentes tras reinicio, verificado con mount -a
[ ] M5 — nginx y la aplicación gestionados por systemd con restart automático y healthcheck
[ ] M6 — SELinux/AppArmor en enforcing, auditd activo, TLS válido en el servicio expuesto
[ ] M7 — Logs centralizados con rotación, monitoreo básico activo, backups automatizados y probados
[ ] M8 — Checklist de aceptación final firmado, runbook completo, documentación entregable
\`\`\`

Este checklist es el contrato del proyecto: si al final del módulo 8 cada línea está marcada con evidencia (comando ejecutado + salida observada), el servidor cumple con el estándar de producción definido en este módulo.

### 📋 Lo que debes recordar

* Un servidor de producción se define por cuatro pilares: disponibilidad, seguridad, trazabilidad y documentación.
* Este proyecto construye un único servidor (\`srv-prod01\`) de forma incremental a lo largo de 8 módulos; nada se reinicia entre módulos.
* El checklist maestro es el contrato de aceptación del proyecto completo, no una sugerencia.
* "Funciona" no es un criterio de producción; "cumple el checklist con evidencia" sí lo es.

### 🧪 Autoevaluación

1. ¿Cuáles son los cuatro pilares que distinguen a un servidor de producción de una máquina de pruebas?
2. ¿Por qué el proyecto usa un único servidor a lo largo de los 8 módulos en lugar de servidores independientes por tema?
3. Un servidor tiene TLS, SELinux enforcing y backups automatizados, pero nadie más que su creador sabe cómo operarlo. ¿Qué pilar está incumpliendo?

---

1. Disponibilidad, seguridad, trazabilidad y documentación.
2. Porque un servidor real se construye de forma incremental sobre la misma base: reproduce el escenario real donde cada decisión (usuarios, red, almacenamiento) afecta a las siguientes, y obliga a mantener coherencia entre todas las capas en vez de tratarlas como piezas aisladas.
3. El pilar de documentación: sin runbook ni documentación entregable, el servidor depende de una sola persona, lo cual es un punto único de falla operativo.
`

export default content
