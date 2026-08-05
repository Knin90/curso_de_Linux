const content = `
## Módulo 6 — Configuración Profesional de tmux (.tmux.conf)

### 🎯 Objetivos de aprendizaje

* Personalizar el archivo de configuración \`.tmux.conf\`.
* Remapear la tecla prefijo a combinaciones ergonómicas (como \`Ctrl + a\`).
* Habilitar el soporte de ratón y el modo de navegación estilo Vi/Vim.

### ❓ Problema real que resuelve

El prefijo por defecto \`Ctrl + b\` requiere estirar la mano izquierda de forma incómoda. Además, por defecto \`tmux\` no permite usar la rueda del ratón para hacer *scroll* en el historial de comandos.

### 📖 Explicación técnica: El archivo \`.tmux.conf\`

\`tmux\` lee su configuración desde \`~/.tmux.conf\` al iniciar. Cualquier cambio requiere reiniciar el servidor o recargar la configuración activamente.

### 💻 Archivo \`.tmux.conf\` optimizado para Producción

\`\`\`bash
nano ~/.tmux.conf
\`\`\`

Contenido recomendado:

\`\`\`text
# ===================================================================
# CONFIGURACIÓN PROFESIONAL DE TMUX
# ===================================================================

# 1. Cambiar prefijo de Ctrl+b a Ctrl+a (estilo GNU Screen)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# 2. Habilitar soporte completo para ratón
set -g mouse on

# 3. Iniciar indexado en 1 (más natural en teclado)
set -g base-index 1
setw -g pane-base-index 1

# 4. Aumentar límite del historial de desplazamiento
set -g history-limit 50000

# 5. Atajos más intuitivos para dividir paneles
bind | split-window -h
bind - split-window -v
unbind '"'
unbind %

# 6. Navegación estilo Vi entre paneles
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# 7. Recarga rápida con 'Ctrl+a r'
bind r source-file ~/.tmux.conf \\; display "Configuracion recargada!"

# 8. Barra de estado
set -g status-bg black
set -g status-fg white
set -g status-left '#[fg=green]#H [#S] '
set -g status-right '#[fg=yellow]%Y-%m-%d %H:%M#[default]'
\`\`\`

#### Aplicar los cambios sin cerrar tmux:

\`\`\`bash
tmux source-file ~/.tmux.conf
\`\`\`

### 📋 Lo que debes recordar

* **Ubicación:** \`~/.tmux.conf\` guarda las preferencias del usuario.
* **Mejora clave:** \`set -g mouse on\` permite la rueda del ratón y clic en paneles.
* **Recarga:** \`tmux source-file ~/.tmux.conf\` aplica cambios en caliente.

### 🧪 Autoevaluación rápida

1. ¿En qué ruta debe crearse el archivo de configuración de \`tmux\`?
2. ¿Qué directiva activa el clic y la rueda del ratón en \`tmux\`?
3. ¿Cuál es el comando para aplicar cambios en \`.tmux.conf\` sin reiniciar la sesión?

---

1. En **\`~/.tmux.conf\`**.
2. La instrucción **\`set -g mouse on\`**.
3. **\`tmux source-file ~/.tmux.conf\`**.
`
export default content
