const content = `
## Módulo 5 — Dominio de tmux: Sesiones, Ventanas y Paneles

### 🎯 Objetivos de aprendizaje

* Dominar la jerarquía estructural de \`tmux\`: Sesiones > Ventanas > Paneles.
* Operar fluídamente la tecla Prefijo (*Prefix Key*) para ejecutar comandos internos.
* Crear, renombrar, dividir, alternar y reconectar sesiones de trabajo.

### 📖 Jerarquía estructural de tmux

\`\`\`text
  SESIÓN "Produccion"
  ├── VENTANA 0: "Servidor Web"
  │   ├── PANEL 0: htop (Monitorización CPU)
  │   └── PANEL 1: tail -f /var/log/nginx/access.log
  └── VENTANA 1: "Base de Datos"
      └── PANEL 0: psql (Consola interactiva SQL)
\`\`\`

### ⌨️ La Tecla Prefijo (Prefix Key)

Por defecto en \`tmux\`: **\`Ctrl + b\`**

> Presionas \`Ctrl + b\`, sueltas ambas teclas, y a continuación presionas la tecla de acción.

### 💻 Comandos desde la Terminal (Fuera de tmux)

#### 1. Crear una nueva sesión con nombre descriptivo:

\`\`\`bash
tmux new -s deploy_app
\`\`\`

#### 2. Listar todas las sesiones de tmux:

\`\`\`bash
tmux ls
\`\`\`

#### 3. Reconectarse (*Attach*) a una sesión existente:

\`\`\`bash
tmux attach -t deploy_app
\`\`\`

#### 4. Destruir una sesión específica:

\`\`\`bash
tmux kill-session -t deploy_app
\`\`\`

### 🎹 Atajos imprescindibles (Dentro de tmux, tras \`Ctrl + b\`)

**Sesiones:**
* **\`d\`** — Desacoplar (*Detach*). Sales dejando la sesión intacta.

**Ventanas (Pestañas completas):**
* **\`c\`** — Crear nueva ventana.
* **\`,\`** — Renombrar ventana actual.
* **\`n\`** — Ir a la siguiente ventana.
* **\`p\`** — Ir a la ventana anterior.
* **\`0..9\`** — Saltar a ventana por número.

**Paneles (Pantalla dividida):**
* **\`%\`** — Dividir verticalmente (Izquierda / Derecha).
* **\`"\`** — Dividir horizontalmente (Arriba / Abajo).
* **\`flechas\`** — Moverse entre paneles.
* **\`z\`** — Zoom al panel actual (pantalla completa temporal).
* **\`x\`** — Cerrar panel actual.

### 🏢 Caso de uso profesional

Un administrador abre \`tmux new -s monitoreo\`. Panel izquierdo: \`htop\`. Panel superior derecho: \`tail -f\` de logs. Panel inferior derecho: consola libre. Si debe desplazarse, hace \`Ctrl + b\` \`d\` y se retira sin cerrar nada.

### 📋 Lo que debes recordar

* **Jerarquía:** Sesiones → Ventanas → Paneles.
* **Símbolo maestro:** \`Ctrl + b\` es la puerta de entrada para cualquier atajo.
* **Atajos oro:** \`d\` (desconectar), \`%\` (dividir vertical), \`"\` (dividir horizontal), \`z\` (zoom temporal).

### 🧪 Autoevaluación rápida

1. ¿Cuál es la combinación de teclas por defecto para la tecla prefijo en \`tmux\`?
2. ¿Qué tecla debes presionar tras el prefijo para desacoplarte sin cerrar la sesión?
3. Si un panel está demasiado pequeño, ¿qué atajo lo hace ocupar la pantalla completa temporalmente?

---

1. **\`Ctrl + b\`**.
2. La tecla **\`d\`**.
3. **\`Ctrl + b\`** seguido de **\`z\`**.
`
export default content
