const content = `
## Módulo 5 — umask: permisos por defecto al crear archivos

### 🎯 Objetivos de aprendizaje

* Entender qué es \`umask\` y por qué existe.
* Calcular los permisos resultantes al crear archivos y directorios.
* Saber cuándo modificar \`umask\` en lugar de usar \`chmod\` a posteriori.

### ❓ Problema real que resuelve

Cada vez que un desarrollador crea un script con \`touch deploy.sh\`, ese archivo nace con permisos \`644\` — legible por cualquiera del sistema. Si tu organización requiere que los archivos nuevos sean privados por defecto (\`600\`), correr \`chmod\` manualmente después de cada creación es un error humano esperando ocurrir. \`umask\` es la solución correcta.

### 📖 ¿Qué es umask?

\`umask\` es una **máscara de permisos** que el kernel aplica automáticamente al crear cualquier archivo o directorio. Define qué permisos se **quitan** del máximo teórico.

\`\`\`text
  Permisos máximos teóricos
  ─────────────────────────
  Archivo:    666  (rw-rw-rw-)   ← el kernel nunca crea archivos con x por defecto
  Directorio: 777  (rwxrwxrwx)

  umask 022
  ─────────────────────────────────────────────
  Archivo nuevo:    666 - 022 = 644  (rw-r--r--)
  Directorio nuevo: 777 - 022 = 755  (rwxr-xr-x)
\`\`\`

> La resta es bit a bit: si el bit está en umask, se elimina del permiso resultante.

### 💻 Consultar y cambiar umask

\`\`\`bash
# Ver el umask actual
umask

# Ver en formato simbólico
umask -S

# Cambiar umask para la sesión actual
umask 027

# Verificar el efecto: crear archivo y directorio
touch test_archivo.txt
mkdir test_directorio
ls -ld test_archivo.txt test_directorio
\`\`\`

Resultado con \`umask 027\`:

\`\`\`text
-rw-r----- 1 carlos developers 0 Aug 04 test_archivo.txt     # 640
drwxr-x--- 2 carlos developers 4096 Aug 04 test_directorio   # 750
\`\`\`

### 🔢 Valores de umask más comunes

| umask | Archivo nuevo | Directorio nuevo | Uso típico |
| --- | --- | --- | --- |
| \`022\` | \`644\` (rw-r--r--) | \`755\` (rwxr-xr-x) | Servidores web públicos |
| \`027\` | \`640\` (rw-r-----) | \`750\` (rwxr-x---) | Servidores empresariales |
| \`077\` | \`600\` (rw-------) | \`700\` (rwx------) | Máxima privacidad |
| \`002\` | \`664\` (rw-rw-r--) | \`775\` (rwxrwxr-x) | Trabajo colaborativo en equipo |

### 💻 Hacer umask persistente

El umask de sesión desaparece al cerrar la terminal. Para que sea permanente:

\`\`\`bash
# Para un usuario específico (añadir al final de ~/.bashrc o ~/.bash_profile)
echo "umask 027" >> ~/.bashrc

# Para todos los usuarios del sistema (requiere root)
# Editar /etc/profile o /etc/login.defs
grep UMASK /etc/login.defs
\`\`\`

### ⚠️ Error común

\`\`\`text
❌ Usar chmod después de crear archivos en lugar de configurar umask.
   Si tus archivos deben nacer con permisos específicos, configura el umask
   correcto. El chmod reactivo es señal de que la política de seguridad
   no está implementada en la capa correcta.
\`\`\`

### 📋 Lo que debes recordar

* \`umask\` define permisos que se **restan** al crear archivos/directorios.
* Archivos parten de \`666\`, directorios de \`777\`.
* El kernel nunca crea archivos con bit \`x\` — para eso necesitas \`chmod\` explícito.
* \`umask 022\` es el default más común; \`umask 027\` es más seguro en entornos empresariales.

### 🧪 Autoevaluación rápida

1. Con \`umask 027\`, ¿qué permisos tendrá un directorio recién creado?
2. ¿Por qué el kernel nunca crea archivos con permiso de ejecución aunque el umask sea \`000\`?
3. ¿Cómo harías que todos los archivos creados por el usuario \`deploy\` sean privados (\`600\`) por defecto?

---

1. \`750\` (rwxr-x---) — porque 777 - 027 = 750.
2. Porque el **máximo teórico para archivos es \`666\`** (sin ejecución). El kernel asume que crear un archivo ejecutable por defecto sería un riesgo de seguridad.
3. Añadir \`umask 077\` al \`~/.bashrc\` del usuario \`deploy\`.
`
export default content
