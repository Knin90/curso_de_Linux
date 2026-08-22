const content = `
## Módulo 1 — Metodología de troubleshooting: de síntoma a causa raíz

### 🎯 Objetivos de aprendizaje

* Aplicar un framework estructurado de resolución de incidentes en lugar de "probar cosas al azar".
* Distinguir entre síntoma, causa contribuyente y causa raíz.
* Formular hipótesis verificables y descartarlas con evidencia, no con intuición.
* Aislar la causa mediante bisección del sistema (capas, componentes, tiempo).
* Documentar un incidente de forma que sea útil para el próximo administrador que lo lea.

### ❓ El problema real

Un administrador junior recibe una alerta: "el sitio web está caído". Reinicia nginx. Sigue caído. Reinicia el servidor completo. Sigue caído. Después de 40 minutos de reinicios aleatorios, alguien más revisa \`df -h\` y encuentra el disco al 100%. El problema nunca fue el servicio: era espacio en disco agotado por logs sin rotar. El troubleshooting sin método consume tiempo, genera reinicios innecesarios (que pueden empeorar la situación) y no dejan aprendizaje: la próxima vez que ocurra el mismo problema, se repetirá el mismo ensayo y error. Un profesional no "prueba cosas": sigue un proceso repetible que reduce el espacio de búsqueda en cada paso.

### 📖 El framework de 8 pasos

\`\`\`text
1. RECOLECTAR INFORMACIÓN     ¿Qué se sabe objetivamente? (logs, métricas, reportes)
2. IDENTIFICAR SÍNTOMAS        ¿Qué comportamiento observable es anormal?
3. FORMULAR HIPÓTESIS          ¿Qué explicaciones son plausibles, en orden de probabilidad?
4. VERIFICAR CADA HIPÓTESIS    ¿Qué comando/prueba confirma o descarta cada una?
5. AISLAR LA CAUSA             ¿En qué capa/componente exacto está el problema?
6. APLICAR LA CORRECCIÓN       ¿Cuál es el cambio mínimo que resuelve la causa raíz?
7. VERIFICAR LA RESOLUCIÓN     ¿El síntoma desapareció? ¿Hay efectos secundarios?
8. DOCUMENTAR                  ¿Qué se aprendió? ¿Cómo se detecta/previene la próxima vez?
\`\`\`

Este framework no es lineal en la práctica: a menudo se vuelve al paso 3 después de descartar una hipótesis. Lo importante es que cada iteración reduce el espacio de búsqueda, en vez de repetir intentos sin registro.

### 📖 Paso 1 — Recolectar información sin tocar nada

Antes de ejecutar cualquier comando que cambie el estado del sistema (reiniciar un servicio, matar un proceso), se recolecta evidencia. Tocar el sistema antes de observarlo destruye información valiosa para el diagnóstico.

\`\`\`bash
# Preguntas que responder ANTES de actuar:
# ¿Cuándo empezó el problema? (correlacionar con despliegues, cron jobs, cambios)
# ¿Es intermitente o constante?
# ¿Afecta a todos los usuarios o a un subconjunto?
# ¿Qué cambió recientemente? (deploys, actualizaciones, cambios de config)

# Comandos de recolección no destructiva:
uptime                      # carga del sistema y tiempo activo
w                            # quién está conectado y qué hace
last -x | head -20           # historial de logins y reinicios recientes
journalctl --since "1 hour ago" --priority=err   # errores recientes
dmesg -T | tail -50          # mensajes de kernel con timestamp legible
systemctl --failed           # unidades systemd fallidas
\`\`\`

### 📖 Paso 2 — Diferenciar síntoma de causa

Un síntoma es lo que se observa ("el sitio responde con 502"). Una causa contribuyente es un factor que agrava el problema ("hay 3 procesos php-fpm colgados"). La causa raíz es el origen real ("un query sin índice satura la conexión a la base de datos, agota el pool de PHP-FPM, y nginx recibe 502 al no encontrar workers disponibles").

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Síntoma","icon":"alert","rows":["El sitio da 502","El servidor está lento","No puedo hacer SSH"]},{"title":"Causa contribuyente","icon":"search","rows":["PHP-FPM sin workers libres","Swap al 90%","sshd no escucha"]},{"title":"Causa raíz","icon":"bug","focal":true,"rows":["Query N+1 sin índice","Memory leak en app","Disco lleno, journal no escribe"]}],"vsLabel":"→"}
\`\`\`

Corregir solo el síntoma (reiniciar php-fpm) resuelve el problema temporalmente pero no evita que vuelva a ocurrir. Encontrar la causa raíz es el objetivo del troubleshooting profesional.

### 📖 Paso 3 y 4 — Hipótesis y verificación (método científico aplicado)

Cada hipótesis debe ser específica y verificable con un comando concreto, no vaga.

\`\`\`text
❌ Hipótesis vaga:        "Puede ser un problema de red"
✅ Hipótesis verificable: "El DNS interno no resuelve el hostname de la base de datos"
   Verificación:          dig +short db-internal.local
   Resultado esperado:    una IP; si no hay respuesta, hipótesis confirmada
\`\`\`

Orden recomendado de hipótesis: de más probable/barata de verificar a menos probable/costosa. No se verifica "corrupción de kernel" antes de revisar \`df -h\`.

\`\`\`bash
# Ejemplo de cadena de verificación para "el sitio no responde"
curl -I http://localhost         # ¿responde localmente? aísla red externa
systemctl status nginx           # ¿el servicio está activo?
ss -tlnp | grep :80              # ¿algo escucha en el puerto?
df -h                            # ¿hay espacio en disco?
free -h                          # ¿hay memoria disponible?
journalctl -u nginx -n 50        # ¿qué dice el log del servicio?
\`\`\`

### 📖 Paso 5 — Aislar la causa por bisección de capas

Un sistema en producción tiene capas: red → sistema operativo → servicio → aplicación → base de datos. Aislar significa determinar en qué capa exacta ocurre la falla, probando desde la capa más externa hacia adentro (o al revés, según el síntoma).

\`\`\`text
CAPA               PRUEBA DE AISLAMIENTO
─────────────────────────────────────────────────────────────
Red externa        ping / curl desde fuera del servidor
Red local           ping / curl desde localhost
Sistema operativo   recursos (CPU, memoria, disco, inodos)
Servicio            systemctl status, journalctl -u <servicio>
Aplicación          logs de aplicación, códigos de error HTTP
Base de datos        conexión directa, EXPLAIN de queries lentas
\`\`\`

Cada prueba exitosa descarta una capa completa y reduce drásticamente el espacio de búsqueda restante.

### 📖 Paso 6, 7 y 8 — Corregir, verificar y documentar

La corrección debe ser el cambio mínimo necesario para resolver la causa raíz, no un parche amplio "por si acaso". Después de aplicarla, se verifica que el síntoma original desapareció y que no se introdujeron efectos secundarios (por ejemplo, reiniciar un servicio puede resolver el síntoma pero perder conexiones activas).

La documentación de un incidente profesional (post-mortem) incluye como mínimo:

\`\`\`text
* Línea de tiempo: cuándo empezó, cuándo se detectó, cuándo se resolvió
* Síntoma observado y cómo se detectó (alerta, usuario, monitoreo)
* Causa raíz confirmada con evidencia
* Corrección aplicada
* Acción preventiva: ¿cómo se detecta antes la próxima vez? ¿cómo se evita?
\`\`\`

### 📋 Lo que debes recordar

* El framework es: recolectar → identificar síntoma → formular hipótesis → verificar → aislar → corregir → verificar → documentar.
* No se actúa (reiniciar, matar procesos) antes de recolectar evidencia; eso destruye información de diagnóstico.
* Un síntoma no es una causa raíz: reiniciar un servicio sin encontrar la causa raíz garantiza una recurrencia.
* Las hipótesis deben ser específicas y verificables con un comando concreto, ordenadas de más a menos probable.
* Aislar por capas (red, SO, servicio, aplicación, base de datos) reduce el espacio de búsqueda en cada paso.
* Todo incidente resuelto se documenta: línea de tiempo, causa raíz, corrección y prevención futura.

### 🧪 Autoevaluación

1. ¿Por qué reiniciar un servicio antes de recolectar información puede ser contraproducente para el diagnóstico?
2. Un administrador dice: "el problema es que nginx no responde". ¿Es esto un síntoma o una causa raíz? Justifica.
3. ¿Qué significa "aislar por capas" y por qué reduce el tiempo de resolución de un incidente?

---

1. Porque reiniciar destruye el estado del sistema en el momento de la falla (procesos colgados, conexiones abiertas, contenido de memoria) que podría contener la evidencia clave para identificar la causa raíz, forzando a esperar a que el problema recurra para poder diagnosticarlo correctamente.
2. Es un síntoma. "nginx no responde" describe el comportamiento observable, pero no explica por qué: podría deberse a falta de memoria, disco lleno, un proceso hijo colgado o un error de configuración. La causa raíz es la explicación subyacente que, al corregirse, hace que el síntoma no vuelva a aparecer.
3. Aislar por capas significa probar sistemáticamente cada capa del sistema (red, sistema operativo, servicio, aplicación, base de datos) de forma independiente para determinar en cuál exactamente está el problema. Reduce el tiempo porque cada prueba exitosa descarta una capa completa, evitando investigar componentes que ya se confirmó que funcionan correctamente.
`

export default content
