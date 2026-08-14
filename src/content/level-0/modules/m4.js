const content = `
## Módulo 4 — Laboratorio integrador: primer contacto con la terminal

### 🎯 Objetivos de aprendizaje

* Perder el miedo a la terminal, entendiendo qué es y qué no es.
* Ejecutar los primeros comandos de exploración de un sistema Linux, sin necesidad de instalar nada.
* Consolidar los conceptos de kernel, distribución y familia vistos en los módulos anteriores mediante observación directa.

### ❓ Problema real que resuelve

Antes de instalar una distribución en el Nivel 1, conviene perder el respeto reverencial a la terminal. Muchas personas abandonan Linux en sus primeros minutos simplemente por la sensación de estar frente a una pantalla negra "hostil". Este laboratorio demuestra que la terminal es, ante todo, una herramienta de **consulta**: la mayoría de los comandos que verás aquí solo leen información, no modifican nada.

### 💡 Analogía

La terminal es como el **panel de instrumentos de un avión** la primera vez que lo ves: decenas de indicadores que parecen indescifrables. Pero un piloto novato no aprende los 200 instrumentos a la vez — aprende primero los cuatro o cinco esenciales (altímetro, velocidad, combustible...) y los usa una y otra vez hasta que dejan de dar miedo. Este laboratorio es exactamente eso: cinco o seis comandos esenciales, repetidos hasta que se vuelvan naturales.

### 📖 Explicación técnica

Puedes seguir este laboratorio sin instalar nada, usando cualquiera de estas opciones:

* **WSL** (*Windows Subsystem for Linux*), si usas Windows — se cubre en detalle en el Nivel 1.
* Una **Live USB** o máquina virtual con cualquier distribución, sin instalarla en el disco.
* Un servicio de terminal Linux online (por ejemplo un *sandbox* en el navegador), útil solo para este primer contacto.

Conceptos base antes de escribir el primer comando:

* **Shell**: el programa que interpreta lo que escribes y se lo pasa al sistema. La más común es **bash**; también existen **zsh** y **fish**. Es la capa "Shell" del diagrama del Módulo 1.
* **Prompt**: el texto que espera tu comando, normalmente con forma \`usuario@equipo:directorio$\`. El símbolo final (\`$\` o \`#\`) indica si operas como usuario normal o como **root** (administrador) — nunca trabajes como root salvo que sea estrictamente necesario, algo que se explicará a fondo en el Nivel 4.
* **Comando, opciones y argumentos**: la estructura general es \`comando -opciones argumento\`. Por ejemplo, en \`ls -l /home\`, \`ls\` es el comando, \`-l\` es una opción (formato largo) y \`/home\` es el argumento (dónde mirar).

### ⚙️ ¿Qué ocurre internamente?

Ciclo de vida de un comando escrito en la terminal:

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

### 💻 Ejemplo básico

Los seis comandos esenciales de exploración para este primer contacto, todos de solo lectura:

\`\`\`bash
# ¿Dónde estoy? (imprime el directorio de trabajo actual)
pwd

# ¿Qué hay aquí? (lista el contenido del directorio actual)
ls

# ¿Qué hay aquí, con detalle? (formato largo: permisos, dueño, tamaño, fecha)
ls -l

# Moverme a mi carpeta personal
cd ~

# ¿Quién soy? (usuario con el que estoy conectado)
whoami

# ¿Qué distribución y qué kernel corren aquí? (repaso del Módulo 1)
cat /etc/os-release
uname -r
\`\`\`

*Ninguno de estos comandos modifica el sistema: todos "leen" y muestran información, igual que abrir un explorador de archivos en modo solo-lectura.*

### 🧪 Laboratorio guiado

1. Abre una terminal (WSL, Live USB, máquina virtual o sandbox online — la que tengas disponible).
2. Ejecuta \`pwd\` y anota qué directorio muestra. Ese es tu punto de partida.
3. Ejecuta \`ls\` y luego \`ls -l\` en el mismo directorio. Compara ambas salidas: ¿qué información extra aparece con \`-l\`?
4. Ejecuta \`cd ~\` seguido de \`pwd\` de nuevo. Confirma que te moviste a tu carpeta personal (\`/home/tu_usuario\` o similar).
5. Ejecuta \`whoami\` y \`cat /etc/os-release\`. Con la información del Módulo 3, identifica a qué familia de distribuciones pertenece el sistema que estás usando.
6. Ejecuta \`uname -r\` y compara el número de versión con el de un compañero o con otra máquina, si tienes acceso a más de una.

### ⚠️ Errores comunes

* **Miedo a "romper algo":** los seis comandos de este laboratorio son de solo lectura. No hay forma de dañar el sistema ejecutándolos, sin importar cuántas veces se repitan.
* **Confundir mayúsculas y minúsculas:** en Linux, a diferencia de Windows, los comandos y nombres de archivo distinguen mayúsculas de minúsculas. \`LS\` no es lo mismo que \`ls\`.
* **Esperar una interfaz gráfica de respuesta:** la terminal no muestra ventanas ni botones — su "respuesta" es texto plano impreso justo debajo del comando ejecutado.

### ✅ Resultado esperado

El estudiante ejecuta con soltura los seis comandos esenciales de exploración, entiende el ciclo shell-kernel-resultado detrás de cada uno, y llega al Nivel 1 sin temor a abrir una terminal.

### 📚 Resumen

La terminal no es más que una conversación estructurada con la shell, que a su vez conversa con el kernel. Dominar unos pocos comandos de solo lectura (\`pwd\`, \`ls\`, \`cd\`, \`whoami\`, \`cat\`, \`uname\`) es suficiente para explorar cualquier sistema Linux con confianza antes de tocar nada que pueda modificarlo.

---

## 🏁 Cierre del Nivel 0

Al completar este nivel, has adquirido las bases conceptuales para todo lo que sigue:

* Distinguir entre **kernel**, **sistema operativo** y **distribución**.
* Ubicar el origen de Linux en la historia de **Unix** y el proyecto **GNU**, y diferenciar software libre de open source.
* Reconocer las grandes **familias de distribuciones** y elegir una con criterio, no por moda.
* Moverte con soltura en una **terminal** real usando comandos básicos de exploración.

Con esta base, estás listo para el **Nivel 1 — Instalación**, donde estos conceptos dejan de ser teoría y se convierten en un sistema Linux real, instalado y funcionando en tu propia máquina.
`

export default content
