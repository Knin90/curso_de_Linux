const content = `
## Módulo 6 — Respuesta a incidentes: playbook y contención

### 🎯 Objetivos de aprendizaje
* Comprender las seis fases del ciclo de respuesta a incidentes (IR)
* Saber qué preservar antes de tocar cualquier cosa en un sistema comprometido
* Aplicar estrategias de contención graduadas según la severidad del incidente
* Construir un playbook mínimo reutilizable para tu organización

### ❓ El problema real
Son las 2:47 de la madrugada. Tu sistema de monitoreo dispara una alerta: tráfico saliente anómalo desde un servidor de producción hacia una IP desconocida en otro país. Nadie sabe si es un falso positivo, un ransomware en marcha, o un atacante que lleva semanas dentro. ¿Qué haces primero? ¿Apagas el servidor? ¿Desconectas la red? ¿Llamas a alguien?

Sin un playbook, cada persona del equipo tomará decisiones distintas bajo presión — y muchas de esas decisiones destruirán evidencia o empeorarán la situación. Este módulo te da el marco para actuar con metodología.

### 📖 Las seis fases de respuesta a incidentes (NIST SP 800-61)

El estándar de la industria define seis fases que se aplican a cualquier incidente, desde un servidor comprometido hasta un ransomware corporativo.

**Fase 1 — Preparación (antes del incidente)**

La preparación es lo que decides con tiempo, no bajo presión. Incluye:

- **Playbooks documentados**: un documento por tipo de incidente (compromiso SSH, ransomware, exfiltración de datos). No improvises el procedimiento mientras el reloj corre.
- **Lista de contactos de emergencia**: responsable de seguridad, equipo legal, proveedor de hosting, CISO, contactos regulatorios si aplica.
- **Baseline de integridad**: ejecutar AIDE o Tripwire antes de cualquier incidente para tener una foto del estado limpio del sistema.
- **Canal de comunicación fuera de banda**: si el atacante tiene acceso al sistema, puede leer tus correos y Slack corporativo. Usa Signal, un teléfono dedicado, o una cuenta de correo externa para coordinar la respuesta.
- **Backups verificados y aislados**: un backup al que el atacante también tiene acceso no sirve de nada.
- **Permisos legales**: asegúrate de que el equipo IR tenga autorización explícita para analizar sistemas. En algunos contextos esto importa legalmente.

**Fase 2 — Identificación**

Antes de actuar, confirma que es un incidente real. Las preguntas clave:

- ¿Qué disparó la alerta? (fail2ban, AIDE, reporte de usuario, anomalía en monitoring)
- ¿Es un falso positivo o compromiso confirmado?
- ¿Cuál es el alcance aproximado? (¿un servidor? ¿toda la red?)
- ¿Cuándo empezó? (revisar logs con \`last\`, \`lastb\`, \`journalctl\`)

Un error frecuente es saltar directo a la contención sin identificar bien el vector. Si no sabes cómo entraron, la eradicación no será completa.

**Fase 3 — Contención**

La contención detiene el daño sin destruir evidencia. Existen estrategias de contención graduadas:

*Contención de red — opción nuclear (preserva evidencia en disco):*
\`\`\`bash
# Bloquea TODO el tráfico entrante y saliente — el sistema queda en cuarentena
iptables -I INPUT -j DROP
iptables -I OUTPUT -j DROP
# Nota: si tienes sesión SSH activa, la perderás. Úsalo solo con acceso físico o consola.
\`\`\`

*Bloqueo selectivo del atacante (menos disruptivo):*
\`\`\`bash
# Bloquea solo la IP del atacante identificada
iptables -I INPUT -s 203.0.113.45 -j DROP
iptables -I OUTPUT -d 203.0.113.45 -j DROP
# Verifica que se aplicó:
iptables -L INPUT -n --line-numbers | head -5
\`\`\`

*Deshabilitar la cuenta comprometida:*
\`\`\`bash
# Bloquea el login sin eliminar la cuenta (preserva evidencia)
usermod -L nombre_usuario
# Además, fuerza expiración inmediata:
chage -E 0 nombre_usuario
# Verifica:
passwd -S nombre_usuario   # debe mostrar 'L' (locked)
\`\`\`

*Aislar un servicio específico:*
\`\`\`bash
# Detiene el servicio sin afectar el resto del sistema
systemctl stop nombre_servicio
# Bloquea el puerto que usa:
iptables -I INPUT -p tcp --dport 8080 -j DROP
\`\`\`

**Fase 4 — Preservación de evidencia (ANTES de cualquier cambio)**

Este paso es crítico y frecuentemente omitido. Una vez que modificas el sistema, la evidencia forense se degrada o destruye. Ejecuta esto antes de la eradicación:

\`\`\`bash
# Preservar logs completos
cp -a /var/log/ /evidence/logs_$(date +%Y%m%d_%H%M%S)/

# Preservar directorios home de usuarios sospechosos
tar -czf /evidence/homes_$(date +%Y%m%d).tar.gz /home/

# Si es una VM: tomar snapshot desde la consola del hipervisor (ESXi, Proxmox, etc.)
# antes de cualquier acción en el sistema operativo.

# Hash de los logs para verificar cadena de custodia:
sha256sum /var/log/auth.log > /evidence/auth.log.sha256
sha256sum /var/log/syslog >> /evidence/auth.log.sha256
\`\`\`

La regla de oro: **quien recolecta evidencia no debería ser quien la analiza**, para mantener cadena de custodia en contextos legales.

**Fase 5 — Eradicación**

Una vez contenido y con evidencia preservada, elimina la causa raíz:

- Elimina malware, backdoors, y cron jobs maliciosos encontrados en el análisis
- Parchea la vulnerabilidad que fue explotada
- Resetea todas las credenciales (no solo la comprometida)
- Revoca claves SSH sospechosas en \`~/.ssh/authorized_keys\`
- Elimina usuarios no autorizados creados por el atacante

**Fase 6 — Recuperación**

- Restaura desde backup limpio, o reconstruye el servidor desde cero si el compromiso fue profundo
- Verifica integridad con AIDE: \`aide --check\`
- Reactiva servicios de forma gradual, monitoreando anomalías
- Aumenta nivel de logging temporalmente para detectar reinfección

**Fase 7 — Lecciones aprendidas (Post-mortem)**

Dentro de las 72 horas posteriores al incidente:

- ¿Cómo entraron? ¿Cuánto tiempo estuvieron dentro antes de ser detectados?
- ¿Qué funcionó bien en la respuesta? ¿Qué falló?
- ¿Qué cambios de configuración, monitoreo o procedimiento hubieran prevenido esto?
- Documentar todo en un informe interno (timeline, acciones tomadas, impacto)

### 📖 Comunicación durante el incidente

**A quién notificar:**
- Management/dirección: tan pronto como se confirma el incidente
- Equipo legal: si hay datos personales involucrados (GDPR, LOPD, etc.)
- Usuarios afectados: según requerimientos regulatorios del sector
- Autoridades: en casos de crimen informático grave

**Qué NO decir públicamente (mientras el incidente está activo):**
- Detalles técnicos del vector de ataque (ayuda al atacante)
- Alcance exacto del compromiso (puede ser incompleto y generar pánico)
- Estimaciones de datos robados sin confirmación

**Plantilla mínima de comunicación interna:**
> "A las [hora] detectamos actividad anómala en [sistema]. Hemos activado el protocolo de respuesta a incidentes. El sistema ha sido aislado. Estamos investigando el alcance. Próxima actualización en [tiempo]."

### 📖 Plantilla de playbook IR

\`\`\`
TRIGGER: [qué disparó la alerta]
SEVERIDAD: [crítica / alta / media / baja]
RESPONSABLE IR: [nombre]
HORA DE INICIO: [timestamp]

ACCIONES INICIALES (primeros 15 minutos):
  □ Confirmar que es incidente real (no falso positivo)
  □ Notificar al responsable de seguridad
  □ Abrir canal de comunicación fuera de banda
  □ NO reiniciar ni apagar el sistema

PRESERVACIÓN DE EVIDENCIA:
  □ Capturar estado volátil (RAM, conexiones, procesos)
  □ Copiar logs: cp -a /var/log/ /evidence/
  □ Hash de evidencia para cadena de custodia

CONTENCIÓN:
  □ Bloquear IP atacante o aislar red según severidad
  □ Deshabilitar cuenta comprometida
  □ Detener servicios afectados

ERADICACIÓN:
  □ Identificar y eliminar malware/backdoors
  □ Parchear vulnerabilidad explotada
  □ Resetear credenciales

RECUPERACIÓN:
  □ Restaurar desde backup limpio
  □ Verificar integridad (AIDE)
  □ Monitoreo intensivo post-recuperación

COMUNICACIÓN:
  □ Notificado management: [hora]
  □ Notificado legal: [hora / N/A]
  □ Notificados usuarios: [hora / N/A]

POST-MORTEM: [fecha programada]
\`\`\`

### 📋 Lo que debes recordar
* Nunca reinicies un sistema comprometido antes de preservar evidencia volátil
* La contención tiene múltiples niveles: desde bloquear una IP hasta aislar red completa
* \`usermod -L\` bloquea una cuenta sin eliminarla — preserva logs de acceso
* El canal de comunicación fuera de banda es crítico si el atacante puede leer tus comunicaciones
* El post-mortem no es opcional: sin él, el mismo incidente se repetirá
* Documenta cada acción con timestamp mientras la ejecutas, no al final

### 🧪 Autoevaluación
1. Un administrador detecta un compromiso y reinicia el servidor "para limpiar procesos maliciosos". ¿Qué evidencia acaba de destruir?
2. ¿Cuál es la diferencia entre contención y eradicación? Da un ejemplo concreto de cada una.
3. ¿Por qué se recomienda usar un canal de comunicación fuera de banda durante un incidente activo?

---

1. Destruyó toda la evidencia volátil: conexiones de red activas, procesos en memoria, RAM (que podría contener claves de cifrado o credenciales), y cualquier proceso malicioso que no escribió artefactos en disco. También alteró timestamps de archivos. La evidencia en disco puede quedar parcialmente intacta, pero la información más valiosa sobre el atacante activo se perdió.
2. Contención detiene el daño inmediato sin eliminar la causa raíz (ejemplo: bloquear la IP del atacante con iptables). Eradicación elimina la causa raíz una vez contenido el incidente (ejemplo: encontrar y eliminar el backdoor que instaló el atacante, parchear la vulnerabilidad explotada). Eradicar sin contener primero permite al atacante seguir actuando mientras limpias.
3. Si el atacante tiene acceso al sistema comprometido, puede interceptar correos corporativos, mensajes internos, y comunicaciones que pasan por ese servidor o la misma red. Un canal fuera de banda (Signal, teléfono, cuenta de correo externa) garantiza que la coordinación de la respuesta no sea visible para el atacante.
`

export default content
