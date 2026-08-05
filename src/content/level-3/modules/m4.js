const content = `
## Módulo 4 — Necesidad y Arquitectura de los Multiplexores (tmux)

### 🎯 Objetivos de aprendizaje

* Explicar la arquitectura cliente-servidor interna de \`tmux\`.
* Comprender el mecanismo de persistencia de procesos independiente de la conexión SSH.
* Comparar las ventajas de usar multiplexores frente al Job Control básico (\`nohup\`/\`bg\`).

### ❓ Problema real que resuelve

Trabajas remotamente desde una portátil. Necesitas dejar un entorno con 4 terminales abiertas organizadas de una forma específica, irte a casa, abrir tu PC de escritorio y **recuperar exactamente la misma pantalla con las 4 terminales vivas**.

### 💡 Analogía: La pausa en la consola de videojuegos

Usar \`tmux\` es como poner **pausa en una consola de videojuegos y apagar el televisor**. El juego no se ha cerrado ni ha muerto; sigue corriendo internamente en el chip de la consola (Servidor tmux). Cuando enciendes el televisor en otra habitación (Cliente tmux), te reenganchas exactamente en el mismo fotograma.

### 📖 Explicación técnica: La arquitectura Cliente-Servidor de tmux

\`\`\`text
                  CONEXIÓN SSH / CLIENTE (Remoto)
             ┌──────────────────────────────────────┐
             │ Cliente tmux (Proceso de pantalla)   │
             └──────────────────┬───────────────────┘
                                │
               [Desconexión de red / SSH cae]
                                │ (Se rompe el enlace)
                                ▼
                  SERVIDOR TMUX (Persistente en RAM)
             ┌──────────────────────────────────────┐
             │ Servidor tmux (Socket /tmp/tmux-*)   │
             ├──────────────────────────────────────┤
             │  ┌──────────────┐  ┌──────────────┐  │
             │  │ Sesión 1     │  │ Sesión 2     │  │
             │  │ ├─ Ventana 1 │  │ ├─ Ventana 1 │  │
             │  │ └─ Panel A/B │  │ └─ Panel A   │  │
             │  └──────────────┘  └──────────────┘  │
             └──────────────────────────────────────┘
\`\`\`

1. **El Servidor tmux:** Corre como demonio en el servidor de destino. Mantiene vivas las PTYs, buffers de texto y aplicaciones.
2. **El Cliente tmux:** Proceso visual que renderiza la salida. Si el cliente se desconecta, **el Servidor tmux no se destruye**. Los procesos siguen corriendo.

### 📊 Comparativa: Job Control básico vs. Multiplexor tmux

| Característica | \`nohup\` / \`bg\` | \`tmux\` / \`screen\` |
| --- | --- | --- |
| **Sobrevive al cierre de SSH** | Sí | Sí |
| **Mantiene viva la salida interactiva** | No (archivo estático) | **Sí (terminal interactiva real)** |
| **Permite dividir pantalla (Paneles)** | No | **Sí** |
| **Permite reconexión desde otro PC** | No | **Sí (\`tmux attach\`)** |
| **Colaboración multiusuario en vivo** | No | **Sí** |

### 📋 Lo que debes recordar

* **Qué hace:** Desconecta la ejecución de las terminales del estado de la conexión SSH.
* **Arquitectura:** Modelo Cliente-Servidor con sockets locales.
* **Concepto clave:** *Detaching* es desconectar la vista; *Attaching* es volver a conectarse a la sesión viva.

### 🧪 Autoevaluación rápida

1. Si tu conexión SSH se interrumpe mientras trabajas dentro de una sesión de \`tmux\`, ¿qué le ocurre a los scripts ejecutándose?
2. ¿Qué componente de \`tmux\` permanece en la memoria RAM gestionando las terminales virtuales?
3. ¿Cuál es la diferencia fundamental entre usar \`nohup\` y usar \`tmux\`?

---

1. Los scripts **continúan ejecutándose normalmente** sin enterarse de la caída de red.
2. El **Servidor de tmux** (proceso demonio).
3. \`nohup\` desvía la salida a un archivo estático no interactivo; \`tmux\` mantiene una terminal interactiva completa a la que puedes volver a conectarte.
`
export default content
