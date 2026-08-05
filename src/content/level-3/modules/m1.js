const content = `
## Módulo 1 — La arquitectura CLI: TTYs, Consolas Virtuales y PTYs

### 🎯 Objetivos de aprendizaje

* Diferenciar conceptual y técnicamente entre TTY nativas (\`/dev/tty*\`) y Pseudoterminales (\`/dev/pts/*\`).
* Alternar entre Consolas Virtuales del Kernel mediante combinaciones de teclas.
* Identificar qué usuarios y procesos están asociados a cada terminal activa mediante comandos del sistema.

### ❓ Problema real que resuelve

Si la interfaz gráfica de tu servidor de administración o estación de trabajo se congela por completo, no necesitas presionar el botón de apagar. Puedes saltar a una Consola Virtual limpia (TTY2), matar el proceso colgado y volver al entorno gráfico sin perder datos.

### 💡 Analogía

Una **TTY nativa** es como una línea telefónica fija directa conectada con un cable de cobre físico a la central. Un **PTY (Pseudoterminal)** es como una llamada realizada por software a través de VoIP (WhatsApp, Skype): para el usuario se escucha igual, pero por dentro viaja emulada sobre una infraestructura de red o software.

### 📖 Explicación técnica: La arquitectura TTY vs. PTY

\`\`\`text
  ┌──────────────────────────────────────────────────────────────┐
  │ CONSOLA VIRTUAL NATIVA (TTY)                                 │
  │ [Teclado Físico] ──► /dev/tty1 (Kernel) ──► /bin/bash        │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │ EMULACIÓN DE TERMINAL / SSH (PTY)                            │
  │ [Cliente SSH / Terminal GUI]                                 │
  │        │                                                     │
  │        ▼                                                     │
  │ /dev/ptmx (Master) ──► /dev/pts/0 (Slave) ──► /bin/bash      │
  └──────────────────────────────────────────────────────────────┘
\`\`\`

1. **TTY Nativa (\`/dev/tty1\` a \`/dev/tty6\`):** Linux reserva habitualmente 6 consolas de texto puras gestionadas directamente por el kernel. Puedes acceder a ellas presionando \`Ctrl + Alt + F1\` hasta \`F6\`.
2. **PTY (\`/dev/pts/X\`):** Cuando abres una ventana de terminal en GNOME, KDE, o te conectas vía SSH, el sistema crea un par Master/Slave en \`/dev/pts/\`. El programa gráfico escribe en el Master y la Shell lee del Slave.

### 👁️ Pistas de diagnóstico

| Tipo de sesión | Ruta de dispositivo | ¿Cómo se reconoce? |
| --- | --- | --- |
| **Consola Virtual Nativa** | \`/dev/tty1\` ... \`/dev/tty6\` | Pantalla completamente negra con texto blanco sin puntero de ratón GUI. |
| **Emulador Gráfico local** | \`/dev/pts/0\` ... \`/dev/pts/N\` | Ventana dentro del entorno gráfico (GNOME Terminal, Alacritty, Kitty). |
| **Sesión remota SSH** | \`/dev/pts/N\` | Al ejecutar \`who\` o \`w\`, muestra la IP remota de origen. |

### 💻 Comandos prácticos

#### 1. Identificar la terminal en la que estás trabajando:

\`\`\`bash
tty
\`\`\`

*Salida típica en SSH/GUI:* \`/dev/pts/2\`
*Salida típica en Consola Virtual:* \`/dev/tty1\`

#### 2. Listar todas las terminales activas en el sistema:

\`\`\`bash
w
\`\`\`

#### 3. Consultar los detalles de los usuarios conectados:

\`\`\`bash
who -u
\`\`\`

### 🏢 Caso de uso profesional

Un servidor de base de datos no responde en el puerto SSH (22) porque el demonio \`sshd\` se ha colgado. Si tienes acceso a la consola fuera de banda (KVM/iLO/iDRAC), abres una TTY física nativa (\`/dev/tty1\`), te autenticas localmente y reinicias el servicio de red sin tocar el botón de encendido.

### 📋 Lo que debes recordar

* **Qué hace:** Administra los canales de entrada y salida de texto entre el hardware/software y el sistema.
* **Diferencia clave:** \`/dev/tty*\` son consolas directas del kernel; \`/dev/pts/*\` son emulaciones por software (SSH/GUI).
* **Comandos clave:** \`tty\` (muestra tu terminal actual), \`w\` / \`who\` (muestra quién está conectado y en qué TTY/PTY).

### 🧪 Autoevaluación rápida

1. Si te conectas a un servidor mediante \`ssh usuario@192.168.1.50\`, ¿qué tipo de dispositivo se asignará: \`/dev/tty\` o \`/dev/pts\`?
2. ¿Qué combinación de teclas permite saltar a la Consola Virtual número 3?
3. ¿Qué comando muestra exactamente en qué terminal estás ejecutando comandos?

---

1. Se asignará un **\`/dev/pts/*\`** (Pseudoterminal Slave).
2. **\`Ctrl + Alt + F3\`**.
3. El comando **\`tty\`**.
`
export default content
