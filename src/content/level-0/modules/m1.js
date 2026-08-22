const content = `
## Módulo 1 — ¿Qué es Linux? Kernel, sistema operativo y distribución

### 🎯 Objetivos de aprendizaje

* Distinguir con precisión entre **kernel**, **sistema operativo** y **distribución**.
* Entender qué hace exactamente el kernel de Linux dentro de un equipo.
* Comprender por qué "Linux" nombra técnicamente solo una pieza del sistema, aunque coloquialmente se use para nombrar el todo.

### ❓ Problema real que resuelve

Es habitual escuchar frases como *"voy a instalar Linux"* o *"prefiero Windows a Linux"*, como si fueran productos equivalentes y cerrados. Pero Linux, en sentido estricto, no es un sistema operativo instalable: es el **kernel**, el núcleo que gestiona el hardware. Sin entender esta distinción, es imposible comprender por qué existen cientos de "Linux" distintos (Ubuntu, Fedora, Arch...) que a la vez se parecen y a la vez son muy diferentes entre sí.

### 💡 Analogía

Piensa en un automóvil. El **motor** es el kernel: convierte combustible en movimiento. Pero un motor solo, tirado en el suelo, no te lleva a ningún lado — necesitas la **carrocería**: chasis, volante, asientos, el resto del sistema operativo. Motor + carrocería = auto completo y usable.

\`\`\`diagram
{"type":"side-by-side","gapLabels":["+","="],"columns":[{"title":"Motor","icon":"server","rows":["Es el kernel","Mueve todo, pero solo no sirve de nada"]},{"title":"Carrocería","icon":"package","rows":["Es el resto del SO","Chasis, volante, asientos"]},{"title":"Auto completo","icon":"desktop","focal":true,"rows":["Es el sistema operativo","Listo para conducir"]}]}
\`\`\`

### 📖 Explicación técnica

* **Kernel**: el núcleo. Es el programa que se ejecuta con privilegios máximos (*modo núcleo* o *ring 0*) y que gestiona directamente el hardware: CPU, memoria RAM, discos, red, dispositivos. Todo lo demás en el sistema pide permiso al kernel para acceder al hardware, mediante **llamadas al sistema** (*syscalls*).
* **Sistema operativo (SO)**: el kernel más un conjunto de programas de espacio de usuario indispensables para que el equipo sea usable: un intérprete de comandos (*shell*), utilidades básicas (copiar archivos, listar directorios, gestionar procesos), bibliotecas del sistema (como **glibc**) y, opcionalmente, un entorno gráfico.
* **Distribución (distro)**: un sistema operativo completo y ensamblado, construido alrededor del kernel Linux, que añade un **gestor de paquetes**, una selección de software por defecto, políticas de actualización, documentación y una comunidad o empresa detrás. Ubuntu, Fedora, Debian, Arch Linux y openSUSE son todas distribuciones distintas que comparten el mismo kernel pero difieren en casi todo lo demás.
* Por eso, técnicamente, nunca "instalas Linux": instalas una **distribución** que incluye Linux como su kernel.

### ⚙️ ¿Qué ocurre internamente?

Capas de un sistema Linux típico, de abajo hacia arriba:

\`\`\`diagram
{"type":"flow-stack","layers":[{"tag":"L1","icon":"desktop","name":"Aplicaciones de usuario","meta":"navegador · editor · terminal"},{"tag":"L2","icon":"terminal","name":"Entorno gráfico / Shell","meta":"GNOME · KDE · bash · zsh"},{"tag":"L3","icon":"package","name":"Bibliotecas del sistema","meta":"glibc · systemd"},{"tag":"L4","icon":"server","name":"KERNEL LINUX","meta":"procesos · memoria · archivos · red","focal":true,"chip":"RING 0"},{"tag":"L5","icon":"chip","name":"Hardware","meta":"CPU · RAM · disco · red · periféricos"}],"edges":[{"label":"EJECUTA"},{"label":"INVOCA"},{"label":"SYSCALL","accent":true},{"label":"GESTIONA HW"}],"sidePanel":{"title":"FRONTERA DE PRIVILEGIO","lines":["Nada toca el hardware sin","pasar por el kernel primero."],"code":"open() read() write() fork()"}}
\`\`\`

Una distribución empaqueta y organiza todas estas capas, añadiendo su propio criterio sobre qué software incluir por defecto y cómo mantenerlo actualizado.

### 💻 Ejemplo básico

Consultar qué versión del kernel está corriendo en un sistema Linux (útil incluso antes de instalar nada, por ejemplo desde una Live USB o WSL):

\`\`\`bash
uname -r
\`\`\`

Ver información más completa del sistema (kernel, arquitectura, nombre de host):

\`\`\`bash
uname -a
\`\`\`

Consultar qué distribución está instalada (nombre, versión, código):

\`\`\`bash
cat /etc/os-release
\`\`\`

### 🏢 Caso de uso profesional

Cuando una empresa reporta un incidente de seguridad relacionado con el kernel (por ejemplo, una vulnerabilidad publicada con un identificador **CVE**), el equipo de infraestructura necesita saber exactamente qué versión de kernel corre en sus servidores — independientemente de qué distribución usen — para determinar si están expuestos y cuándo aplicar el parche correspondiente.

### 📋 Lo que debes recordar

* **Kernel:** el núcleo que gestiona el hardware directamente. Linux, en sentido estricto, es solo esto.
* **Sistema operativo:** kernel + utilidades básicas de espacio de usuario.
* **Distribución:** un sistema operativo completo, ensamblado y mantenido, con su propio gestor de paquetes y comunidad.
* **Comando clave:** \`uname -r\` para ver la versión del kernel; \`cat /etc/os-release\` para ver la distribución.

### 🧪 Autoevaluación rápida

1. ¿Por qué decir "voy a instalar Linux" es, técnicamente, impreciso?
2. ¿Qué gestiona directamente el kernel que ninguna otra capa del sistema gestiona?
3. ¿Qué añade una distribución sobre el kernel y las utilidades básicas del sistema operativo?

---

1. Porque Linux es el kernel, no un sistema operativo completo instalable; lo que se instala es una distribución que incluye a Linux como su núcleo.
2. El acceso directo al hardware: CPU, memoria, discos, red y dispositivos, mediante privilegios de modo núcleo.
3. Un gestor de paquetes, una selección de software por defecto, políticas de actualización y una comunidad o empresa que la mantiene.
`

export default content
