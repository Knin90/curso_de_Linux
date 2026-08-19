const content = `
## Módulo 7 — Sesiones Colaborativas y Alternativas (screen)

### 🎯 Objetivos de aprendizaje

* Configurar sesiones compartidas en tiempo real para trabajo colaborativo de SysAdmins.
* Administrar el multiplexor clásico **GNU Screen** en servidores heredados.
* Elegir la herramienta adecuada según las restricciones del entorno empresarial.

### ❓ Problema real que resuelve

Un administrador sénior necesita guiar a un administrador júnior en otra ciudad a resolver un incidente crítico en un servidor remoto. Ambos deben ver la misma pantalla y teclear en el mismo terminal simultáneamente.

### 📖 Trabajo colaborativo vía Socket Compartido

\`\`\`diagram
{"type":"nested","container":{"title":"Servidor tmux","meta":"misma pantalla, ambos ven todo"},"items":[{"name":"Sesión compartida","meta":"socket: /tmp/compartido_tmux","icon":"terminal"}],"external":[{"name":"SysAdmin 1 (Panamá)","icon":"user","side":"left"},{"name":"SysAdmin 2 (España)","icon":"user","side":"right"}]}
\`\`\`

### 💻 Crear una sesión colaborativa en tmux

#### Paso 1 (SysAdmin 1 — Creador):

\`\`\`bash
tmux -S /tmp/sesion_compartida new -s soporte
chmod 777 /tmp/sesion_compartida
\`\`\`

#### Paso 2 (SysAdmin 2 — Invitado):

\`\`\`bash
tmux -S /tmp/sesion_compartida attach -t soporte
\`\`\`

Ambos administradores verán el mismo cursor y lo que teclee cualquiera se reflejará instantáneamente en la pantalla del otro.

### 📜 El estándar clásico: GNU Screen

En servidores antiguos (RHEL 6/7 o sistemas embebidos), \`tmux\` puede no estar disponible pero **GNU Screen** sí.

| Acción | Comando |
| --- | --- |
| Iniciar sesión | \`screen -S misecion\` |
| Listar sesiones | \`screen -ls\` |
| Desacoplar | \`Ctrl + a\` luego \`d\` |
| Reconectar | \`screen -r misecion\` |
| Modo espejo compartido | \`screen -x misecion\` |

### 📋 Lo que debes recordar

* **Colaboración:** Las sesiones compartidas permiten que 2 personas operen el mismo prompt a distancia.
* **Sistemas antiguos:** GNU Screen es la alternativa clásica cuando \`tmux\` no está disponible.
* **Atajo en Screen:** \`Ctrl + a\` es el prefijo estándar de \`screen\`.

### 🧪 Autoevaluación rápida

1. ¿Qué parámetro de \`tmux\` permite especificar una ruta de socket personalizada para sesiones colaborativas?
2. Si no puedes instalar \`tmux\` en un servidor antiguo, ¿qué herramienta clásica realiza la misma función?
3. ¿Qué comando de \`screen\` permite acoplarse en modo espejo a una sesión vista por otro usuario?

---

1. El parámetro **\`-S\`** (ejemplo: \`tmux -S /ruta/socket\`).
2. La herramienta **\`GNU Screen\`** (\`screen\`).
3. El comando **\`screen -x\`**.
`
export default content
