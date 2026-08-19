const content = `
## Módulo 1 — El Modelo de Seguridad de Linux: cómo piensa el Kernel

### 🎯 Objetivos de aprendizaje

* Entender por qué existen los permisos y cómo el kernel toma decisiones de acceso.
* Comprender la relación entre UID, GID y los permisos almacenados en el inodo.
* Saber qué ocurre internamente cuando ejecutas un archivo o accedes a un directorio.

### ❓ Problema real que resuelve

Antes de tocar un solo comando, necesitas entender **cómo piensa el kernel**. Sin ese mapa mental, memorizar \`chmod\` o \`chown\` es como aprender a conducir sin entender qué hace el motor. Cuando algo falla con permisos, el 90% de los administradores novatos prueba comandos al azar. Tú vas a entender el porqué.

### 📖 El modelo de decisión del Kernel

Linux no pregunta al usuario si puede acceder a un archivo. **El Kernel toma esa decisión de forma autónoma**, comparando tres datos: el UID del proceso, el GID del proceso, y los bits de permiso almacenados en el inodo del archivo.

\`\`\`diagram
{"type":"tree","root":{"name":"Kernel de Linux","meta":"Decide acceso comparando UID → GID → Others"},"children":[{"name":"¿UID del proceso == UID dueño?","children":[{"name":"Aplica bits User","edgeLabel":"sí"},{"name":"Aplica bits Group","edgeLabel":"no, ¿GID == grupo?"},{"name":"Aplica bits Others","edgeLabel":"no (ni UID ni GID)"}]},{"name":"¿Tiene el permiso requerido?","children":[{"name":"Permite acceso","edgeLabel":"sí"},{"name":"Permission denied","edgeLabel":"no"}]}]}
\`\`\`

### 🗂️ El inodo: donde viven los permisos

El nombre de un archivo **no almacena los permisos**. El nombre es solo un puntero. Los permisos viven en una estructura interna del sistema de archivos llamada **inodo**:

\`\`\`diagram
{"type":"table-like","title":"Directorio y su inodo","rows":[{"key":"informe.txt","value":"→ Inodo 47823"},{"key":"backup.sh","value":"→ Inodo 47824"},{"key":"config.conf","value":"→ Inodo 47825"},{"value":"— Inodo 47823 —"},{"key":"UID propietario","value":"1001"},{"key":"GID grupo","value":"1005"},{"key":"Permisos","value":"rw-r----- (640)"},{"key":"Tamaño","value":"4096 bytes"},{"key":"Fecha creación","value":"2026-08-01"},{"key":"Bloques de datos","value":"bloque 8821, bloque 8822"}]}
\`\`\`

> Puedes renombrar un archivo, moverlo, o tener múltiples nombres (enlaces) apuntando al mismo inodo — los permisos no cambian porque viven en el inodo, no en el nombre.

### 🔍 ¿Qué ocurre cuando ejecutas un archivo?

\`\`\`diagram
{"type":"tree","root":{"name":"Usuario escribe: ./script.sh","meta":"execve() → kernel busca inodo → comprueba bit x"},"children":[{"name":"Ejecuta","edgeLabel":"sí, ¿tiene x?"},{"name":"bash: permission denied","edgeLabel":"no"}]}
\`\`\`

### 💻 Inspeccionar inodos en práctica

Ver el número de inodo de un archivo:

\`\`\`bash
ls -li /etc/passwd
\`\`\`

Ver los permisos completos y propietario:

\`\`\`bash
stat /etc/passwd
\`\`\`

### 📋 Lo que debes recordar

* El kernel toma las decisiones de acceso, no el usuario.
* El kernel compara UID → GID → Others en ese orden de prioridad.
* Los permisos viven en el **inodo**, no en el nombre del archivo.
* Renombrar o mover un archivo no cambia sus permisos.

### 🧪 Autoevaluación rápida

1. ¿Quién toma la decisión de permitir o denegar el acceso a un archivo en Linux?
2. ¿Dónde se almacenan físicamente los permisos de un archivo?
3. Si renombras un archivo, ¿cambian sus permisos?

---

1. El **Kernel de Linux** (no el usuario, no la shell).
2. En el **inodo** del archivo.
3. **No.** Los permisos están en el inodo; renombrar solo cambia la entrada en el directorio.
`
export default content
