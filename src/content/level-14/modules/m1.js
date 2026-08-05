const content = `
## Módulo 1 — Señales en Linux: kill, signals y comunicación entre procesos

### 🎯 Objetivos de aprendizaje

* Entender qué es una señal y cómo fluye desde el kernel hasta un proceso.
* Conocer las señales más importantes y cuándo usar cada una.
* Enviar señales con kill, pkill y killall correctamente.
* Manejar señales en scripts bash con trap.

### ❓ El problema real

Tu servidor de aplicación Node.js necesita recargarse sin perder conexiones activas. Si mandas SIGKILL, el proceso muere instantáneamente y los clientes conectados reciben un error. Si mandas SIGTERM, el proceso tiene la oportunidad de terminar conexiones con elegancia. La diferencia entre las señales no es solo técnica — es la diferencia entre un deploy limpio y una interrupción de servicio.

### 📖 ¿Qué es una señal?

Una señal es una notificación asíncrona que el kernel (o un proceso) envía a otro proceso. El proceso receptor interrumpe su ejecución, corre el handler de la señal, y luego continúa (o termina, según la señal).

\`\`\`text
EMISOR                      KERNEL                    RECEPTOR
─────────                   ──────                    ────────
kill(pid, SIGTERM)   →      entrega señal     →       proceso interrumpe
kill -2 PID          →      convierte a SIGINT →      handler SIGINT corre
Ctrl+C               →      genera SIGINT     →       proceso recibe SIGINT
proceso hijo muere   →      genera SIGCHLD    →       padre recibe notificación
\`\`\`

### 📖 Las señales más importantes

\`\`\`text
SEÑAL      NÚMERO   DESCRIPCIÓN                              IGNORABLE
─────────────────────────────────────────────────────────────────────────
SIGHUP      1       Hangup — recarga config (por convención)     Sí
SIGINT      2       Interrupción (Ctrl+C)                        Sí
SIGQUIT     3       Quit — genera core dump                      Sí
SIGKILL     9       Muerte inmediata — NO ignorable              NO
SIGTERM    15       Terminación elegante (por defecto de kill)   Sí
SIGSTOP    19       Pausa de proceso — NO ignorable              NO
SIGCONT    18       Reanudar proceso pausado                     Sí
SIGCHLD    17       Hijo terminó o se pausó                      Sí
SIGUSR1    10       Señal definida por el usuario 1              Sí
SIGUSR2    12       Señal definida por el usuario 2              Sí
SIGPIPE    13       Escritura a pipe sin lector                  Sí
SIGALRM    14       Alarma de tiempo (alarm syscall)             Sí
SIGWINCH   28       Ventana de terminal redimensionada           Sí
\`\`\`

**Regla crítica:** SIGKILL (9) y SIGSTOP (19) nunca pueden ser interceptadas, ignoradas ni bloqueadas. Son el mecanismo de último recurso del kernel.

### 📖 Comandos para enviar señales

\`\`\`bash
# kill — enviar señal a PID específico
kill PID                     # envía SIGTERM (15) por defecto
kill -15 PID                 # SIGTERM explícito
kill -TERM PID               # por nombre
kill -9 PID                  # SIGKILL (fuerza bruta, último recurso)
kill -HUP PID                # SIGHUP (recarga config — nginx, sshd, etc.)
kill -STOP PID               # pausar proceso
kill -CONT PID               # reanudar proceso

# Enviar señal a múltiples procesos
kill -15 PID1 PID2 PID3

# pkill — por nombre de proceso
pkill nginx                  # SIGTERM a todos los procesos llamados nginx
pkill -9 nginx               # SIGKILL
pkill -HUP nginx             # recargar config de nginx
pkill -u www-data            # SIGTERM a todos los procesos del usuario www-data
pkill -f "python worker.py"  # por línea de comando completa (útil para workers)

# killall — similar a pkill, más portable
killall nginx
killall -9 node
killall -HUP sshd

# Ver qué señales existen
kill -l

# Verificar que el proceso murió
kill -0 PID   # señal 0: no envía nada, solo comprueba si el proceso existe
echo \$?       # 0 = proceso existe, 1 = no existe (o no tienes permiso)
\`\`\`

### 📖 El protocolo correcto de terminación

\`\`\`bash
#!/usr/bin/env bash
# stop-service.sh — terminar un proceso con gracia, SIGKILL como último recurso

graceful_stop() {
    local pid=\$1
    local timeout=\${2:-30}  # esperar 30 segundos por defecto

    # Verificar que el proceso existe
    if ! kill -0 "\$pid" 2>/dev/null; then
        echo "PID \$pid no existe"
        return 0
    fi

    echo "Enviando SIGTERM a PID \$pid..."
    kill -TERM "\$pid"

    # Esperar hasta timeout
    local elapsed=0
    while kill -0 "\$pid" 2>/dev/null; do
        if [ "\$elapsed" -ge "\$timeout" ]; then
            echo "Proceso no terminó en \${timeout}s, enviando SIGKILL..."
            kill -KILL "\$pid"
            return 1
        fi
        sleep 1
        elapsed=$(( elapsed + 1 ))
    done

    echo "Proceso \$pid terminado correctamente"
    return 0
}

graceful_stop "\$1" "\${2:-30}"
\`\`\`

### 📖 Manejo de señales en scripts bash con trap

\`\`\`bash
#!/usr/bin/env bash
# Script con manejo correcto de señales

TEMP_FILE="/tmp/mi-proceso-\$\$"
LOCK_FILE="/var/lock/mi-proceso.lock"

cleanup() {
    echo "Limpiando recursos..."
    rm -f "\$TEMP_FILE" "\$LOCK_FILE"
    exit 0
}

# Registrar cleanup para señales comunes
trap cleanup SIGTERM SIGINT SIGQUIT

# SIGHUP para recargar configuración
reload_config() {
    echo "Recargando configuración..."
    source /etc/mi-app/config.sh
}
trap reload_config SIGHUP

echo "PID: \$\$"  # Imprimir el propio PID para facilitar el envío de señales
touch "\$LOCK_FILE"

# Bucle principal
while true; do
    # Hacer trabajo...
    echo "Procesando... (Ctrl+C para parar)"
    sleep 5
done
\`\`\`

\`\`\`bash
# Uso:
./mi-script.sh &
kill -HUP \$!    # recarga config
kill -TERM \$!   # terminación elegante (ejecuta cleanup)
\`\`\`

### 📋 Lo que debes recordar

* SIGTERM (15) es la señal correcta para pedir terminación — el proceso tiene tiempo de limpiar.
* SIGKILL (9) no puede ignorarse: úsala solo si SIGTERM no funciona después de esperar.
* SIGHUP por convención recarga la configuración de servicios (nginx, sshd, rsyslog).
* \`trap cleanup SIGTERM SIGINT\` en bash permite limpiar archivos temporales al terminar.

### 🧪 Autoevaluación

1. ¿Por qué SIGKILL es peligroso para una base de datos PostgreSQL en comparación con SIGTERM?
2. ¿Qué hace \`kill -0 PID\` y para qué sirve?
3. Tu proceso nginx no responde a SIGTERM. ¿Cuál es el protocolo correcto de terminación?

---

1. SIGKILL mata el proceso instantáneamente sin que PostgreSQL pueda hacer flush de sus buffers WAL ni cerrar sus archivos de datos correctamente. Esto puede dejar la base de datos en estado inconsistente y requerir recuperación al reiniciar. SIGTERM permite a PostgreSQL completar la transacción actual y hacer un shutdown limpio.
2. La señal 0 es especial: no envía ninguna señal real, solo verifica si el proceso existe y si tienes permiso para enviarle señales. Retorna 0 si el proceso existe, 1 si no. Útil en scripts para comprobar si un proceso sigue vivo: \`kill -0 "\$pid" 2>/dev/null && echo "vivo"\`.
3. El protocolo: (1) \`kill -TERM \$pid\` y esperar 30 segundos, (2) si no termina, \`kill -KILL \$pid\`. Antes de SIGKILL, considera \`kill -QUIT\` que genera un core dump útil para diagnóstico. Nunca uses SIGKILL directamente sin intentar SIGTERM primero.
`

export default content
