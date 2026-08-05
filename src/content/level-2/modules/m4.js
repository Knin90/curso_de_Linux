const content = `
## Módulo 4 — Transición al Kernel y ejecución de systemd (PID 1)

### 🎯 Objetivos de aprendizaje

* Reconocer el papel de \`systemd\` como el primer proceso en el espacio de usuario (**PID 1**).
* Analizar la secuencia de inicialización mediante \`journalctl\`.
* Distinguir los mensajes del buffer del kernel de los registros de \`systemd\`.

### 📖 Explicación técnica: El nacimiento de los procesos

Tras completar \`pivot_root\`, el kernel invoca la ejecución del binario \`/sbin/init\`. En la gran mayoría de las distribuciones Linux modernas, \`/sbin/init\` es un enlace simbólico a **\`systemd\`**.

\`\`\`text
              PROCESO DE NACIMIENTO DEL USERSPACE

    Kernel Space (Nivel de privilegio de Hardware)
  ────────────────────────────────────────────────────────
    1. Exec(/sbin/init) ──► Asigna Process ID = 1
  ────────────────────────────────────────────────────────
    Userspace (Nivel de aislamiento de aplicaciones)

                        ┌──────────┐
                        │ systemd  │ (PID 1)
                        └────┬─────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐
     │ sshd.d     │   │ networkd   │   │ udevd      │
     └────────────┘   └────────────┘   └────────────┘
\`\`\`

* **PID 1:** Es el único proceso del sistema que no posee un proceso padre. Si \`systemd\` finaliza accidentalmente, el kernel se detendrá de inmediato (*Kernel Panic*).
* **Paralelización:** A diferencia de los sistemas antiguos (*SysVinit*), \`systemd\` utiliza sockets activados para iniciar decenas de servicios al mismo tiempo, reduciendo drásticamente el tiempo de arranque.

### 💻 Comandos prácticos de análisis

#### 1. Verificar que systemd gestiona el PID 1:

\`\`\`bash
ps -p 1 -o comm=
\`\`\`

#### 2. Inspeccionar los registros del arranque actual:

\`\`\`bash
journalctl -b 0
\`\`\`

#### 3. Filtrar únicamente los errores ocurridos durante el arranque:

\`\`\`bash
journalctl -b 0 -p err
\`\`\`

### 📋 Lo que debes recordar

* **Qué hace:** Inicia el espacio de usuario, crea el proceso PID 1 y levanta los demonios y servicios del sistema.
* **Cuándo ocurre:** Justo después de la ejecución exitosa de \`pivot_root\`.
* **Archivos clave:** \`/sbin/init\`, \`/lib/systemd/systemd\`.
* **Comandos clave:** \`ps -p 1\`, \`journalctl -b 0\`.
* **Diagnóstico:** Revisa \`journalctl -b 0 -p err\` para localizar fallos de servicios en la fase de inicialización.

### 🧪 Autoevaluación rápida

1. ¿Qué sucede con el sistema operativo si el proceso con PID 1 es finalizado forzosamente?
2. ¿Qué diferencia clave existe entre \`journalctl -b\` y el comando \`dmesg\`?
3. ¿Cuál es el primer binario que ejecuta el kernel una vez que ha montado el disco duro real?

---

1. Ocurre un **Kernel Panic** y el sistema se detiene por completo.
2. \`dmesg\` muestra únicamente los mensajes del kernel (hardware/drivers); \`journalctl -b\` incluye además los registros de inicialización de los servicios en el espacio de usuario.
3. El archivo \`/sbin/init\` (que normalmente es un enlace hacia \`systemd\`).
`

export default content
