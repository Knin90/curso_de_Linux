const content = `
## Módulo 3 — Gestión de Procesos: Foreground, Background y Signal Control

### 🎯 Objetivos de aprendizaje

* Enviar tareas al segundo plano (*background*) durante o después de su ejecución.
* Pausar, reanudar y listar trabajos activos usando el mecanismo de *Job Control*.
* Inmunizar procesos contra la señal de cierre de terminal (\`SIGHUP\`) usando \`nohup\` y \`disown\`.

### ❓ Problema real que resuelve

Lanzas un comando que tarda 45 minutos en procesar datos. De repente, necesitas la terminal libre para ejecutar otros comandos inmediatamente. No necesitas abrir otra sesión ni cancelar la tarea actual.

### 📖 Explicación técnica: Estados de un proceso en la Shell

\`\`\`diagram
{"type":"tree","root":{"name":"Proceso en foreground","meta":"bloquea la entrada de la shell"},"children":[{"name":"Proceso detenido (Stopped Job)","edgeLabel":"Ctrl+Z (SIGSTOP)","focal":true,"children":[{"name":"Background (corriendo)","meta":"libera el prompt de la shell","edgeLabel":"bg"},{"name":"Regresa a foreground","edgeLabel":"fg"}]}]}
\`\`\`

### 💻 Comandos y Atajos prácticos

#### 1. Iniciar un proceso directamente en segundo plano:

\`\`\`bash
sleep 300 &
\`\`\`

*Salida:* \`[1] 45892\` *(Número de Job [1] y Process ID PID 45892).*

#### 2. Pausar un comando en ejecución en primer plano:

Presiona **\`Ctrl + Z\`**. La tarea pasa a estado *Stopped*.

#### 3. Ver todos los trabajos gestionados por la Shell actual:

\`\`\`bash
jobs -l
\`\`\`

#### 4. Reanudar el trabajo pausado en segundo plano:

\`\`\`bash
bg %1
\`\`\`

#### 5. Traer el trabajo de vuelta al primer plano:

\`\`\`bash
fg %1
\`\`\`

#### 6. Proteger una tarea para que no muera al cerrar la terminal (\`SIGHUP\`):

\`\`\`bash
# Opción A: Usando nohup al arrancar
nohup python3 script_largo.py &

# Opción B: Desvincular un proceso que ya está corriendo
disown -h %1
\`\`\`

### 🏢 Caso de uso profesional

Vas a ejecutar una migración de base de datos pesada vía SSH. Si la conexión Wi-Fi se corta, la Shell del servidor recibe la señal \`SIGHUP\` y **mata todos los procesos hijos**, dejando la migración a medias. Ejecutar la tarea con \`nohup\` o dentro de un multiplexor evita la catástrofe.

### 📋 Lo que debes recordar

* **Qué hace:** Controla qué aplicaciones ocupan la pantalla y cuáles siguen trabajando por detrás.
* **Atajos críticos:** \`Ctrl + C\` (matar proceso), \`Ctrl + Z\` (pausar proceso).
* **Comandos clave:** \`&\` (enviar al fondo), \`jobs\` (listar), \`fg\` (traer al frente), \`bg\` (reanudar en el fondo), \`disown\` / \`nohup\` (inmunizar contra cierres de sesión).

### 🧪 Autoevaluación rápida

1. ¿Qué combinación de teclas pausa un proceso en ejecución para regresar al prompt de la Shell?
2. Si tienes un proceso pausado identificado como \`[2]\`, ¿qué comando usas para que continúe en segundo plano?
3. ¿Qué señal envía la terminal a todos sus procesos hijos cuando la ventana se cierra o la red SSH se cae?

---

1. **\`Ctrl + Z\`**.
2. El comando **\`bg %2\`**.
3. La señal **\`SIGHUP\`** (*Signal Hangup*, Señal 1).
`
export default content
