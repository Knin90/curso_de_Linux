const content = `
## Módulo 4 — chmod y chown: cambiar permisos y propietarios

### 🎯 Objetivos de aprendizaje

* Usar \`chmod\` en modo octal y en modo simbólico.
* Cambiar propietario y grupo con \`chown\` y \`chgrp\`.
* Aplicar cambios recursivos con \`-R\` de forma segura.
* Reconocer y evitar el error crítico de \`chmod 777\`.

### 📖 chmod: el comando que modifica los bits del inodo

\`\`\`text
  chmod 750 archivo.sh

        │
        ▼ Shell llama a chmod()
        │
        ▼ Kernel localiza el inodo del archivo
        │
        ▼ Modifica los 9 bits de permisos en el inodo
        │
        ▼ Nuevo modo: rwxr-x--- (750)
\`\`\`

### 💻 chmod en modo OCTAL (el más profesional)

\`\`\`bash
# Control total al dueño, leer+ejecutar al grupo, nada a otros
chmod 750 script_backup.sh

# Solo lectura para todos (logs de auditoría)
chmod 444 auditoria.log

# Directorio accesible por el equipo, cerrado al resto
chmod 770 /opt/proyecto
\`\`\`

### 💻 chmod en modo SIMBÓLICO (más legible para cambios puntuales)

La sintaxis es: \`[quién][operación][permiso]\`

\`\`\`text
  Quién:     u (user/dueño), g (group), o (others), a (all/todos)
  Operación: + (añadir), - (quitar), = (establecer exacto)
  Permiso:   r, w, x
\`\`\`

\`\`\`bash
# Añadir permiso de ejecución al dueño
chmod u+x deploy.sh

# Quitar escritura a otros
chmod o-w config.conf

# Dar lectura y ejecución al grupo, quitar todo a otros
chmod g+rx,o-rwx /var/www/app

# Equivale exactamente a chmod 750:
chmod u=rwx,g=rx,o= archivo.sh
\`\`\`

| Situación | Octal | Simbólico |
| --- | --- | --- |
| Hacer ejecutable solo para dueño | \`chmod 700\` | \`chmod u+x,g-x,o-x\` |
| Quitar escritura a todos | \`chmod a-w\` | \`chmod a-w\` |
| Web pública (nginx sirve archivos) | \`chmod 644\` | \`chmod u=rw,g=r,o=r\` |
| Script de deploy solo para admins | \`chmod 750\` | \`chmod u=rwx,g=rx,o=\` |

### 💻 chown: cambiar propietario y grupo

\`\`\`bash
# Cambiar dueño
sudo chown carlos archivo.txt

# Cambiar dueño y grupo juntos
sudo chown carlos:developers /var/www/proyecto

# Solo cambiar el grupo
sudo chgrp developers /var/www/proyecto

# Aplicar recursivamente a todo un directorio
sudo chown -R www-data:www-data /var/www/html
\`\`\`

### ⚠️ Errores comunes

\`\`\`text
❌ Error 1: chmod 777
   Significa: Lectura + Escritura + Ejecución para CUALQUIER usuario del sistema.
   Consecuencia: Cualquier proceso comprometido puede modificar o ejecutar el archivo.
   Regla: Si hay un problema de permisos, identifica al dueño legítimo. Nunca abras todo.

❌ Error 2: chmod -R 755 /
   Aplicar permisos recursivos desde la raíz del sistema. Destruye las protecciones
   de archivos críticos como /etc/shadow.
   Regla: Siempre especifica una ruta concreta, nunca la raíz del sistema.

❌ Error 3: chown -R sin verificar primero
   Antes de aplicar chown recursivo, verifica con: find /ruta -user usuario_actual
\`\`\`

### 📋 Lo que debes recordar

* Octal para establecer permisos completos; simbólico para cambios puntuales.
* \`chown usuario:grupo archivo\` cambia dueño y grupo en un solo comando.
* \`chmod 777\` está prohibido en servidores de producción.
* \`-R\` aplica recursivamente — úsalo con precaución y ruta específica.

### 🧪 Autoevaluación rápida

1. ¿Cómo añades permiso de ejecución solo al dueño sin tocar los permisos del grupo y otros?
2. ¿Qué comando cambia el dueño y el grupo de \`/var/www/html\` a \`www-data:www-data\` de forma recursiva?
3. ¿Por qué \`chmod 777\` es peligroso?

---

1. \`chmod u+x archivo\` (modo simbólico, no toca grupo ni otros).
2. \`sudo chown -R www-data:www-data /var/www/html\`
3. Otorga **lectura, escritura y ejecución a cualquier usuario del sistema**, incluyendo procesos comprometidos o usuarios no autorizados.
`
export default content
