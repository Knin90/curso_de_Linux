const content = `
## Módulo 8 — Laboratorio integrador: Entorno de Operaciones Inmune

### 🎯 Objetivos de aprendizaje

* Desplegar una consola de monitorización multinivel (*Dashboard*) dividiendo paneles con \`tmux\`.
* Simular un corte de red intencional y recuperar la sesión intacta.

### 🧪 Escenario 1: Construcción del Dashboard de Operaciones

\`\`\`diagram
{"type":"table-like","title":"DASHBOARD DE RED","rows":[{"key":"PANEL 1 (Izquierda - 50%)","value":"Monitorización de Sistema · Command: htop / top"},{"key":"PANEL 2 (Arriba Der - 25%)","value":"Tráfico de Red en Tiempo Real"},{"key":"PANEL 3 (Abajo Der - 25%)","value":"Monitoreo de Logs en Vivo · Command: tail -f"}]}
\`\`\`

#### Pasos de construcción:

1. Inicia sesión \`Dashboard\`:

\`\`\`bash
tmux new -s Dashboard
\`\`\`

2. Divide la pantalla verticalmente: **\`Ctrl + b\`** luego **\`%\`**

3. En el panel izquierdo:

\`\`\`bash
top
\`\`\`

4. Salta al panel derecho: **\`Ctrl + b\`** \`Flecha Derecha\`

5. Divide este panel horizontalmente: **\`Ctrl + b\`** luego **\`"\`**

6. En el panel superior derecho:

\`\`\`bash
ping 8.8.8.8
\`\`\`

7. Panel inferior derecho (**\`Ctrl + b\`** \`Flecha Abajo\`):

\`\`\`bash
tail -f /var/log/syslog
\`\`\`

8. Desacóplate: **\`Ctrl + b\`** \`d\`

### 🧪 Escenario 2: Resiliencia ante fallos de red

1. Conéctate a tu servidor por SSH.
2. Inicia sesión de \`tmux\`:

\`\`\`bash
tmux new -s prueba_fuego
\`\`\`

3. Lanza script persistente:

\`\`\`bash
while true; do date >> /tmp/contador.log; sleep 1; done
\`\`\`

4. **Simula la caída:** Cierra la ventana de la terminal gráfica directamente.
5. Abre nueva terminal, reconéctate por SSH.
6. Comprueba que el archivo sigue creciendo:

\`\`\`bash
ls -lh /tmp/contador.log
\`\`\`

7. Reconéctate:

\`\`\`bash
tmux attach -t prueba_fuego
\`\`\`

8. **Verificación:** La pantalla sigue imprimiendo el bucle. Cancela con \`Ctrl + C\` y elimina con \`exit\`.

### 📋 Lo que debes recordar

* **Persistencia real:** Las aplicaciones dentro de \`tmux\` sobreviven a la desconexión violenta del cliente SSH.
* **Organización espacial:** Los paneles divididos permiten la visión global de la salud del servidor sin ventanas flotantes.

### 🧪 Autoevaluación rápida

1. Si cierras la ventana de tu emulador de terminal mientras una sesión de \`tmux\` está abierta, ¿se pierde el trabajo ejecutándose dentro?
2. ¿Qué comando verifica desde la Shell cuántas sesiones de \`tmux\` siguen vivas?
3. ¿Cómo recuperas el control visual de la sesión llamada \`Dashboard\` tras un corte de red?

---

1. **No, no se pierde.** El servidor de \`tmux\` mantiene viva la ejecución en la memoria RAM del servidor.
2. El comando **\`tmux ls\`**.
3. Ejecutando **\`tmux attach -t Dashboard\`**.
`
export default content
