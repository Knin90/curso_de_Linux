const content = `
## Módulo 3 — Evaluación de administración I: systemd, SSH y gestión de paquetes

### 🎯 Objetivos de aprendizaje

* Diagnosticar y corregir unidades de systemd que fallan al arrancar o no persisten tras reinicio.
* Configurar y asegurar acceso SSH aplicando buenas prácticas de producción.
* Resolver conflictos y problemas de integridad en la gestión de paquetes.
* Justificar decisiones de administración con criterio de riesgo, no solo de sintaxis de comandos.

### ❓ El problema real

La administración real no es memorizar subcomandos; es decidir correctamente bajo presión con información parcial. Esta evaluación presenta salidas reales de \`systemctl\`, \`journalctl\`, logs de SSH y errores de gestores de paquetes, y exige la acción correcta — no la explicación teórica del comando.

### 📖 Bloque A — systemd (5 escenarios)

**Escenario A1.** Un servicio no arranca tras \`systemctl start app.service\` y el estado muestra \`failed\`.

\`\`\`bash
$ systemctl status app.service
● app.service - App Service
   Loaded: loaded (/etc/systemd/system/app.service; enabled)
   Active: failed (Result: exit-code) since Fri 09:12:03
  Process: 3021 ExecStart=/opt/app/run.sh (code=exited, status=203/EXEC)
\`\`\`

*Tarea:* interpretar el código \`203/EXEC\` (el binario no existe o no tiene permiso de ejecución) y el comando para confirmarlo.

**Escenario A2.** Un servicio funciona con \`systemctl start\` pero no arranca tras reiniciar el servidor.

*Tarea:* identificar la causa más probable y el comando faltante (\`systemctl enable\`).

**Escenario A3.** Se necesita que un servicio reinicie automáticamente si falla, pero no en un loop infinito si el fallo es persistente.

*Tarea:* escribir el bloque \`[Service]\` con \`Restart=on-failure\`, \`RestartSec\` y \`StartLimitBurst\`/\`StartLimitIntervalSec\`.

**Escenario A4.** Un servicio depende de que la red esté completamente disponible (no solo la interfaz up) antes de arrancar.

*Tarea:* identificar el target correcto (\`network-online.target\` con \`After=\` y \`Wants=\`, no \`network.target\`).

**Escenario A5.** \`journalctl -u app.service\` no muestra logs de más de 3 días atrás aunque el servicio corre hace semanas.

*Tarea:* explicar la causa probable (rotación por \`SystemMaxUse\`/límite de journal) y el comando para verificar el límite configurado (\`journalctl --disk-usage\`, \`/etc/systemd/journald.conf\`).

### 📖 Bloque B — SSH (4 escenarios)

**Escenario B1.** Un servidor de producción permite login SSH con contraseña y como root directamente. Se pide endurecerlo sin cortar el acceso del equipo.

*Tarea:* listar el orden correcto de cambios en \`sshd_config\` (agregar clave pública primero, probar, luego \`PasswordAuthentication no\` y \`PermitRootLogin no\`) y por qué el orden importa.

**Escenario B2.** La conexión SSH falla con:

\`\`\`text
Permissions 0644 for '/home/ana/.ssh/id_rsa' are too open.
\`\`\`

*Tarea:* dar el comando exacto de corrección y explicar por qué SSH es estricto con estos permisos.

**Escenario B3.** Se necesita dar acceso a un contratista externo por tiempo limitado, solo a un servidor específico, sin exponer el resto de la infraestructura.

*Tarea:* diseñar la solución (clave dedicada + \`ForceCommand\`/restricción por \`Match\` en sshd_config, o bastion host) y justificar por qué no compartir una clave existente.

**Escenario B4.** Un túnel SSH (\`-L 8080:localhost:80\`) deja de funcionar después de una actualización del servidor.

*Tarea:* identificar la directiva de \`sshd_config\` responsable (\`AllowTcpForwarding\`) y cómo confirmarla.

### 📖 Bloque C — Gestión de paquetes (4 escenarios)

**Escenario C1.** \`apt install\` falla con dependencias rotas.

\`\`\`text
The following packages have unmet dependencies:
 libssl-dev : Depends: libssl3 (= 3.0.2-0ubuntu1.10) but 3.0.2-0ubuntu1.12 is installed
\`\`\`

*Tarea:* dar la secuencia de diagnóstico y reparación (\`apt --fix-broken install\`, revisar repositorios mixtos).

**Escenario C2.** Un paquete instalado manualmente (\`dpkg -i\`) no recibe actualizaciones de seguridad automáticas.

*Tarea:* explicar por qué y cómo migrar a gestión vía repositorio APT correctamente configurado.

**Escenario C3.** Se necesita revertir a una versión anterior de un paquete crítico tras un update problemático.

*Tarea:* dar el comando con versión específica (\`apt install paquete=version\`) y cómo evitar que se actualice de nuevo (\`apt-mark hold\`).

**Escenario C4.** Un servidor con \`yum\`/\`dnf\` reporta un repositorio con firma GPG inválida al intentar actualizar.

*Tarea:* explicar el riesgo de simplemente desactivar la verificación GPG (\`gpgcheck=0\`) versus importar la clave correcta.

### 📋 Rúbrica de evaluación — Bloque de administración I

| Criterio | Insuficiente | Aceptable | Sólido |
|---|---|---|---|
| Diagnóstico de systemd | No usa \`journalctl\`/\`systemctl status\` para diagnosticar | Diagnostica con ayuda de logs pero omite causa raíz | Diagnostica con logs y explica causa raíz + corrección persistente |
| Endurecimiento SSH | Deshabilita password auth sin verificar clave pública antes | Sigue el orden correcto con supervisión | Sigue el orden correcto y justifica cada paso por su impacto |
| Gestión de paquetes | Usa \`--force\` o desactiva verificaciones de seguridad sin evaluar riesgo | Resuelve el conflicto pero sin prevenir recurrencia | Resuelve y aplica medida preventiva (hold, repositorio correcto) |
| Criterio de seguridad | Prioriza rapidez sobre seguridad sistemáticamente | Balancea ambos con guía | Balancea rapidez y seguridad de forma autónoma y justificada |

**Criterio de aprobación:** mínimo "Aceptable" en los 4 criterios. El criterio de endurecimiento SSH es eliminatorio: deshabilitar autenticación por contraseña antes de confirmar acceso por clave pública reprueba el bloque, sin importar el resto del puntaje.

### 📋 Lo que debes recordar

* \`systemctl start\` sin \`enable\` no persiste tras reinicio — son operaciones independientes.
* El código de salida \`203/EXEC\` de systemd casi siempre significa binario inexistente o sin permiso de ejecución.
* Nunca deshabilitar \`PasswordAuthentication\` en SSH sin confirmar antes que el acceso por clave pública funciona.
* Desactivar verificación GPG en un repositorio de paquetes es aceptar ejecutar código no verificado como root.

### 🧪 Autoevaluación

1. ¿Qué diferencia hay entre \`systemctl start\` y \`systemctl enable\`, y qué combinación de comandos asegura arranque inmediato y persistente?
2. ¿Por qué el orden importa al endurecer SSH deshabilitando autenticación por contraseña?
3. ¿Por qué desactivar \`gpgcheck\` en un repositorio de paquetes es una decisión de alto riesgo?

---

1. \`systemctl start\` arranca el servicio en la sesión actual; \`systemctl enable\` crea el symlink que lo activa en el próximo arranque, pero no lo inicia ahora. Para ambos efectos: \`systemctl enable --now app.service\`.
2. Si se deshabilita la autenticación por contraseña antes de confirmar que la clave pública funciona correctamente (permisos, \`authorized_keys\` bien configurado), se puede perder todo acceso remoto al servidor, incluyendo el propio, dejando la única vía de recuperación el acceso físico o de consola del proveedor.
3. Porque \`gpgcheck\` verifica que los paquetes provienen del mantenedor legítimo y no fueron alterados en tránsito o en un mirror comprometido. Desactivarlo permite instalar paquetes maliciosos sin advertencia, ejecutando código arbitrario con privilegios de root durante la instalación.
`

export default content
