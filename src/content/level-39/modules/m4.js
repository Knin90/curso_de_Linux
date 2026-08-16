const content = `
## Módulo 4 — Evaluación de administración II: logs, LVM/RAID, firewall y SELinux/AppArmor

### 🎯 Objetivos de aprendizaje

* Correlacionar logs de múltiples fuentes para reconstruir la causa de un incidente.
* Tomar decisiones correctas de recuperación en arreglos LVM y RAID degradados.
* Diseñar reglas de firewall mínimas y auditables.
* Diagnosticar denegaciones de SELinux/AppArmor sin desactivar el control de acceso obligatorio.

### ❓ El problema real

Esta sección evalúa las herramientas de administración avanzada que separan a un administrador junior de uno senior: no basta con ejecutar el comando que "arregla" el síntoma, hay que entender el estado real del sistema antes de tocarlo, especialmente cuando hay redundancia de datos (RAID) o control de acceso obligatorio (SELinux) de por medio.

### 📖 Bloque A — Logs (4 escenarios)

**Escenario A1.** Se reporta una caída de servicio a las 03:14. Se dispone de logs de systemd, nginx y del kernel.

*Tarea:* describir el orden de correlación: \`journalctl --since "03:10" --until "03:20"\`, luego logs de aplicación, luego \`dmesg -T\` para descartar OOM killer.

**Escenario A2.** \`dmesg\` muestra:

\`\`\`text
[99123.221] Out of memory: Killed process 4210 (java) total-vm:4123456kB
\`\`\`

*Tarea:* explicar qué hace el OOM killer y por qué el "servicio caído" no es un bug de la aplicación sino falta de memoria del sistema.

**Escenario A3.** Los logs de un servidor se llenan cada pocos días y se necesita retención de 30 días sin llenar el disco.

*Tarea:* diseñar la configuración de \`logrotate\` (rotación diaria, compresión, \`maxsize\`, \`rotate 30\`).

**Escenario A4.** Se sospecha que un atacante borró evidencia de sus acciones en los logs locales.

*Tarea:* explicar por qué el envío de logs a un servidor remoto (syslog centralizado) es la mitigación correcta y por qué confiar solo en logs locales es insuficiente en respuesta a incidentes.

### 📖 Bloque B — LVM y RAID (4 escenarios)

**Escenario B1.** \`cat /proc/mdstat\` muestra un RAID 5 degradado:

\`\`\`text
md0 : active raid5 sdb1[1] sdc1[2]
      41929728 blocks super 1.2 level 5, 64k chunk, algorithm 2 [3/2] [_UU]
\`\`\`

*Tarea:* interpretar \`[3/2] [_UU]\` (falta un disco, 2 de 3 activos) y dar la secuencia correcta para reemplazar el disco fallado sin perder datos.

**Escenario B2.** Un volumen lógico LVM se quedó sin espacio en el volume group también.

*Tarea:* explicar las dos rutas posibles: agregar un disco físico nuevo (\`pvcreate\` + \`vgextend\`) o liberar espacio de otro LV, y cuándo aplica cada una.

**Escenario B3.** Se necesita hacer un snapshot de un LV antes de una actualización riesgosa, con posibilidad de rollback rápido.

*Tarea:* dar el comando \`lvcreate -s\` y explicar la limitación de espacio del snapshot (se llena si el volumen origen cambia mucho).

**Escenario B4.** Un RAID 1 con dos discos: uno fue reemplazado por error con un disco más pequeño.

*Tarea:* explicar por qué el RAID no puede reconstruirse (el nuevo disco no tiene capacidad suficiente) y qué verificación se debe hacer siempre antes de un reemplazo.

### 📖 Bloque C — Firewall y control de acceso obligatorio (5 escenarios)

**Escenario C1.** Se necesita permitir tráfico SSH solo desde una IP de administración específica, bloqueando el resto.

*Tarea:* escribir la regla \`nftables\` o \`iptables\` correcta, incluyendo el orden respecto a una regla DROP general.

**Escenario C2.** Un servicio web fue puesto en producción y SELinux bloquea su acceso a un puerto no estándar (8443).

\`\`\`text
type=AVC msg=audit(...): avc: denied { name_connect } for pid=2201 comm="nginx" dest=8443
\`\`\`

*Tarea:* explicar por qué \`setenforce 0\` es la respuesta incorrecta y cuál es la correcta (\`semanage port -a -t http_port_t -p tcp 8443\`).

**Escenario C3.** AppArmor bloquea a una aplicación de leer un archivo de configuración en una ruta no estándar.

*Tarea:* explicar el flujo correcto: modo \`complain\`, revisar \`aa-logprof\`, ajustar el perfil, volver a modo \`enforce\` — nunca deshabilitar AppArmor globalmente.

**Escenario C4.** Un firewall con demasiadas reglas acumuladas durante meses necesita auditoría antes de una migración.

*Tarea:* describir el proceso de auditoría (listar reglas, identificar cuáles siguen siendo necesarias, documentar cada una con su propósito) antes de tocar producción.

**Escenario C5.** Un desarrollador pide desactivar el firewall "para probar más rápido" en un servidor de staging con datos sensibles.

*Tarea:* explicar por qué esto es inaceptable incluso en staging y qué alternativa ofrecer (regla temporal específica y auditada, revertida después de la prueba).

### 📋 Rúbrica de evaluación — Bloque de administración II

| Criterio | Insuficiente | Aceptable | Sólido |
|---|---|---|---|
| Correlación de logs | Revisa una sola fuente de log | Revisa múltiples fuentes sin orden claro | Correlaciona por ventana de tiempo entre fuentes de forma sistemática |
| Decisiones en RAID/LVM | Actúa sin verificar estado (\`mdstat\`/\`pvs\`) antes de reemplazar discos | Verifica pero comete errores de secuencia | Verifica estado completo y ejecuta la secuencia correcta sin pérdida de datos |
| Reglas de firewall | Reglas amplias o sin orden (permitir todo primero) | Reglas correctas pero no documentadas | Reglas mínimas, ordenadas y documentadas |
| SELinux/AppArmor | Desactiva el control de acceso obligatorio ante el primer bloqueo | Usa modo permisivo/complain sin volver a enforce | Diagnostica, ajusta la política específica y mantiene enforce/enforcing |

**Criterio de aprobación:** mínimo "Aceptable" en los 4 criterios. Desactivar SELinux/AppArmor globalmente o desactivar el firewall como solución es eliminatorio para el bloque.

### 📋 Lo que debes recordar

* \`[3/2] [_UU]\` en \`/proc/mdstat\` indica RAID degradado: siempre verificar antes de reemplazar hardware.
* El OOM killer no es un bug de la aplicación — es el kernel liberando memoria bajo presión.
* \`setenforce 0\` y deshabilitar el firewall son parches que eliminan la protección, no soluciones.
* Auditar reglas de firewall antes de una migración previene arrastrar reglas obsoletas o inseguras.

### 🧪 Autoevaluación

1. ¿Qué significa \`[3/2] [_UU]\` en la salida de \`/proc/mdstat\` y qué se debe verificar antes de reemplazar el disco?
2. ¿Por qué \`setenforce 0\` es la respuesta incorrecta ante una denegación de SELinux en producción?
3. ¿Cuál es el proceso correcto para permitir una acción legítima que AppArmor bloquea, sin comprometer el resto del sistema?

---

1. Indica un RAID configurado para 3 discos con solo 2 activos (el guion bajo marca la posición del disco faltante o fallado). Antes de reemplazar, se debe confirmar cuál disco físico falló realmente (\`mdadm --detail /dev/md0\`, revisar \`dmesg\`/SMART) y verificar que el disco de reemplazo tenga capacidad igual o mayor, para evitar reconstrucción fallida.
2. Porque desactiva el control de acceso obligatorio para todo el sistema, no solo para el servicio afectado, eliminando una capa de defensa crítica de forma permanente hasta que alguien lo reactive. La respuesta correcta es identificar el contexto/política específica bloqueada (vía \`ausearch\`/\`audit2allow\`) y ajustar solo esa regla.
3. Poner el perfil en modo \`complain\` (registra sin bloquear), reproducir la acción legítima, revisar los eventos con \`aa-logprof\` para generar las reglas necesarias, aplicar el perfil ajustado y volver a modo \`enforce\`. Nunca deshabilitar AppArmor globalmente como atajo.
`

export default content
