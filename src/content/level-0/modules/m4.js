const content = `
## Módulo 4 — Mini-proyecto real: documenta tu primer sistema Linux

### 🎯 Objetivos de aprendizaje

* Perder el miedo a la terminal, entendiendo qué es y qué no es.
* Ejecutar los primeros comandos de exploración de un sistema Linux, sin necesidad de instalar nada.
* Consolidar los conceptos de kernel, distribución y familia vistos en los módulos anteriores mediante observación directa.
* Producir un pequeño informe propio con los datos básicos de un sistema, la primera "entrega" real del curso.

### ❓ El problema real

Acabas de recibir acceso a una laptop de trabajo con Linux ya instalado (o vas a usar WSL, una Live USB o un sandbox online mientras llega tu turno de instalar en el Nivel 1). Antes de tocar nada, te piden algo muy habitual en cualquier equipo: **documentar la configuración básica del sistema** — qué distribución es, qué versión de kernel corre, quién es el usuario activo y cómo está organizado el sistema de archivos — para dejar constancia antes de empezar a trabajar sobre él. Vas a resolverlo con un puñado de comandos de solo lectura, sin instalar ni modificar nada.

### 📖 Estructura del proyecto

Vas a crear una pequeña carpeta de trabajo con un único archivo de texto plano donde queda tu informe:

\`\`\`
~/practica-linux/
└── informe.txt
\`\`\`

### 📖 Conceptos antes de empezar

Tres ideas necesarias antes de escribir el primer comando:

* **Shell**: el programa que interpreta lo que escribes y se lo pasa al sistema. La más común es **bash**; también existen **zsh** y **fish**. Es la capa "Shell" del diagrama del Módulo 1.
* **Prompt**: el texto que espera tu comando, normalmente con forma \`usuario@equipo:directorio$\`. El símbolo final (\`$\` o \`#\`) indica si operas como usuario normal o como **root** (administrador) — nunca trabajes como root salvo que sea estrictamente necesario, algo que se explicará a fondo en el Nivel 4.
* **Comando, opciones y argumentos**: la estructura general es \`comando -opciones argumento\`. Por ejemplo, en \`ls -l /home\`, \`ls\` es el comando, \`-l\` es una opción (formato largo) y \`/home\` es el argumento (dónde mirar).

### 📖 Ciclo de vida de un comando

\`\`\`text
Escribes: ls -l /home  y presionas Enter
        │
        ▼
La shell (bash) interpreta el texto y separa comando, opciones y argumentos
        │
        ▼
La shell busca el programa "ls" en las rutas definidas por la variable $PATH
        │
        ▼
El kernel crea un nuevo proceso (fork + exec) y le entrega el control
        │
        ▼
"ls" hace una llamada al sistema para leer el contenido de /home
        │
        ▼
El kernel devuelve los datos → "ls" los formatea → se imprimen en pantalla
        │
        ▼
La shell muestra un nuevo prompt, lista para el siguiente comando
\`\`\`

Este ciclo — shell interpreta, kernel ejecuta, resultado se imprime — es la base de absolutamente todo lo que harás en Linux desde la terminal, sin importar cuán avanzado sea el comando.

### 📖 Secuencia de ejecución

**Paso 1: Abrir una terminal**

Usa la que tengas disponible: WSL, una Live USB, una máquina virtual, o un sandbox de terminal Linux online.

**Paso 2: Crear tu carpeta de trabajo**

\`\`\`bash
mkdir -p ~/practica-linux
cd ~/practica-linux
pwd
\`\`\`

Salida esperada (la ruta variará según tu usuario):

\`\`\`
/home/tu_usuario/practica-linux
\`\`\`

**Paso 3: Identificar al usuario activo**

\`\`\`bash
whoami
\`\`\`

**Paso 4: Identificar la distribución y el kernel**

\`\`\`bash
cat /etc/os-release
uname -r
\`\`\`

Con la información del Módulo 3, identifica a qué familia de distribuciones pertenece (Debian/Ubuntu, RHEL/Fedora, Arch, u otra).

**Paso 5: Explorar el directorio personal**

\`\`\`bash
ls
ls -l
\`\`\`

Compara ambas salidas: ¿qué información extra aparece con \`-l\` (permisos, dueño, tamaño, fecha)?

**Paso 6: Escribir el informe**

\`\`\`bash
echo "Usuario: $(whoami)" > informe.txt
echo "Kernel: $(uname -r)" >> informe.txt
cat /etc/os-release >> informe.txt
cat informe.txt
\`\`\`

Salida esperada (varía según tu sistema):

\`\`\`
Usuario: tu_usuario
Kernel: 6.8.0-generic
NAME="Ubuntu"
VERSION="22.04 LTS (Jammy Jellyfish)"
...
\`\`\`

Con eso tienes tu primera entrega: un informe real, generado por ti, con los datos básicos del sistema que acabas de recibir.

### 📋 Lo que debes recordar

* Los seis comandos de este mini-proyecto (\`pwd\`, \`ls\`, \`cd\`, \`whoami\`, \`cat\`, \`uname\`) son de solo lectura: no hay forma de dañar el sistema ejecutándolos.
* La terminal no es más que una conversación estructurada con la shell, que a su vez conversa con el kernel.
* \`mkdir\`, \`cd\` y la redirección con \`>\`/\`>>\` son trivialmente reversibles: si algo sale mal, basta con borrar la carpeta (\`rm -rf ~/practica-linux\`) y repetir.
* En Linux, a diferencia de Windows, los comandos y nombres de archivo distinguen mayúsculas de minúsculas: \`LS\` no es lo mismo que \`ls\`.
* Con estos conceptos y comandos ya puedes documentar cualquier sistema Linux con el que te encuentres, sin miedo a la terminal.

### 🧪 Autoevaluación

1. ¿Por qué se dice que los comandos usados en este mini-proyecto (\`pwd\`, \`ls\`, \`whoami\`, \`cat\`, \`uname\`) son "seguros" de ejecutar en cualquier sistema?
2. Ejecutas \`cat /etc/os-release\` y \`uname -r\` en dos máquinas distintas y obtienes salidas diferentes en ambos comandos. ¿Qué te dice cada una por separado?
3. Si te equivocas y borras por accidente el archivo \`informe.txt\`, ¿qué comandos usarías para recrearlo desde cero?

---

1. Porque son comandos de **solo lectura**: consultan información del sistema (directorio actual, contenido de una carpeta, usuario activo, versión de un archivo o del kernel) sin modificar ni borrar nada. No existe una variante destructiva de \`pwd\`, \`ls\`, \`whoami\`, \`cat\` o \`uname\` usados de esta forma.
2. \`cat /etc/os-release\` identifica la **distribución** (y por tanto la familia: Debian/Ubuntu, RHEL/Fedora, Arch...), mientras que \`uname -r\` identifica la **versión del kernel** que corre por debajo, independientemente de la distribución. Dos distribuciones distintas pueden compartir la misma versión de kernel, y la misma distribución puede tener distintas versiones de kernel según cuándo se actualizó.
3. Con \`cd ~/practica-linux\` para volver a la carpeta, y luego repetir el Paso 6: \`echo "Usuario: $(whoami)" > informe.txt\`, seguido de \`echo "Kernel: $(uname -r)" >> informe.txt\` y \`cat /etc/os-release >> informe.txt\`. Como son solo comandos de lectura redirigidos a un archivo, recrearlo no tiene ningún riesgo.

## 🏁 Cierre del Nivel 0

Al completar este nivel, has adquirido las bases conceptuales para todo lo que sigue:

* Distinguir entre **kernel**, **sistema operativo** y **distribución**.
* Ubicar el origen de Linux en la historia de **Unix** y el proyecto **GNU**, y diferenciar software libre de open source.
* Reconocer las grandes **familias de distribuciones** y elegir una con criterio, no por moda.
* Moverte con soltura en una **terminal** real usando comandos básicos de exploración.

Con esta base, estás listo para el **Nivel 1 — Instalación**, donde estos conceptos dejan de ser teoría y se convierten en un sistema Linux real, instalado y funcionando en tu propia máquina.
`

export default content
