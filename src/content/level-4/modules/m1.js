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

\`\`\`text
                     Usuario / Proceso

                           │
                  Solicita acceso a archivo
                           │
                           ▼

                    Kernel de Linux

                           │
           ┌───────────────┴───────────────┐
           │  ¿UID del proceso == UID dueño?│
           └───────────────┬───────────────┘
                           │
               Sí ─────────┴───────── No
               │                       │
               ▼                       ▼
        Aplica bits User        ¿GID del proceso == GID grupo?
                                       │
                               Sí ─────┴───── No
                               │              │
                               ▼              ▼
                        Aplica bits    Aplica bits Others
                        Group
                               │
                    ¿Tiene el permiso requerido?
                               │
                     Sí ───────┴────── No
                     │                 │
                     ▼                 ▼
              Permite acceso    Permission denied
\`\`\`

### 🗂️ El inodo: donde viven los permisos

El nombre de un archivo **no almacena los permisos**. El nombre es solo un puntero. Los permisos viven en una estructura interna del sistema de archivos llamada **inodo**:

\`\`\`text
  Directorio (tabla de nombres)
  ├── "informe.txt"  ──► Inodo 47823
  ├── "backup.sh"    ──► Inodo 47824
  └── "config.conf"  ──► Inodo 47825

  Inodo 47823
  ├── UID propietario: 1001
  ├── GID grupo:       1005
  ├── Permisos:        rw-r-----  (640)
  ├── Tamaño:          4096 bytes
  ├── Fecha creación:  2026-08-01
  └── Bloques de datos: [bloque 8821, bloque 8822]
\`\`\`

> Puedes renombrar un archivo, moverlo, o tener múltiples nombres (enlaces) apuntando al mismo inodo — los permisos no cambian porque viven en el inodo, no en el nombre.

### 🔍 ¿Qué ocurre cuando ejecutas un archivo?

\`\`\`text
  Usuario escribe: ./script.sh

        │
        ▼ Shell llama a execve()
        │
        ▼ Kernel busca el inodo de script.sh
        │
        ▼ Comprueba bit de ejecución (x)
        │
    ¿Tiene x?
        │
    Sí ─┴─ No
    │       │
    ▼       ▼
 Ejecuta   bash: permission denied
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
