const content = `
## Módulo 6 — Transferencia de archivos: scp y sftp

### 🎯 Objetivos de aprendizaje

* Transferir archivos y directorios con \`scp\` en ambas direcciones.
* Usar \`sftp\` para operaciones interactivas de archivos remotos.
* Conocer las diferencias entre \`scp\`, \`sftp\` y \`rsync\`.

### 📖 scp vs sftp vs rsync

| Herramienta | Mejor para | Modo |
| --- | --- | --- |
| \`scp\` | Copias rápidas de archivos o directorios | No interactivo |
| \`sftp\` | Exploración y transferencia interactiva | Interactivo (como FTP) |
| \`rsync\` | Sincronización eficiente (solo transfiere cambios) | No interactivo, avanzado |

### 💻 scp: copia segura

\`\`\`bash
# Subir un archivo al servidor
scp archivo.txt usuario@192.168.1.50:/tmp/

# Subir usando alias de ~/.ssh/config
scp archivo.txt web-prod:/tmp/

# Subir un directorio completo
scp -r ./proyecto/ web-prod:/var/www/html/

# Descargar un archivo del servidor
scp web-prod:/var/log/nginx/error.log ./logs/

# Descargar un directorio completo
scp -r web-prod:/etc/nginx/conf.d/ ./nginx-backup/

# Con puerto personalizado
scp -P 2222 archivo.txt db-prod:/tmp/

# Copiar entre dos servidores remotos (pasando por el cliente)
scp web-prod:/tmp/dump.sql db-prod:/tmp/
\`\`\`

**Sintaxis general:**

\`\`\`text
scp [opciones] [fuente] [destino]

Fuente/destino remoto:   usuario@host:/ruta/
                         alias-de-config:/ruta/
Fuente/destino local:    /ruta/local o ./relativa
\`\`\`

| Opción | Descripción |
| --- | --- |
| \`-r\` | Copiar directorio recursivamente |
| \`-P\` (mayúscula) | Puerto del servidor (distinto a \`ssh -p\` minúscula) |
| \`-i\` | Especificar llave privada |
| \`-v\` | Modo verbose para diagnóstico |
| \`-C\` | Habilitar compresión (útil en conexiones lentas) |

### 💻 sftp: FTP sobre SSH

\`sftp\` abre una sesión interactiva donde puedes navegar, listar, subir y descargar archivos.

\`\`\`bash
sftp web-prod
\`\`\`

**Comandos dentro de sftp:**

\`\`\`text
sftp> ls                       # Listar directorio remoto
sftp> ls -la                   # Lista detallada
sftp> cd /var/log/nginx        # Navegar en el servidor
sftp> pwd                      # Ver directorio remoto actual

sftp> lls                      # Listar directorio LOCAL
sftp> lcd ~/descargas          # Cambiar directorio LOCAL

sftp> get access.log           # Descargar archivo
sftp> get access.log local.log # Descargar con nombre diferente
sftp> get -r nginx/            # Descargar directorio recursivo

sftp> put backup.sql /tmp/     # Subir archivo
sftp> put -r ./conf.d/ /etc/nginx/  # Subir directorio

sftp> mkdir /tmp/nueva         # Crear directorio remoto
sftp> rm /tmp/viejo.log        # Eliminar archivo remoto
sftp> exit                     # Salir
\`\`\`

### 💻 rsync sobre SSH: transferencias inteligentes

\`rsync\` transfiere solo las diferencias entre origen y destino, ideal para sincronizaciones periódicas de directorios grandes.

\`\`\`bash
# Sincronizar directorio local → servidor
rsync -avz --progress ./proyecto/ web-prod:/var/www/html/

# Sincronizar servidor → local (backup)
rsync -avz web-prod:/var/log/nginx/ ./logs/nginx/

# Con exclusiones
rsync -avz --exclude='*.log' --exclude='.git' ./proyecto/ web-prod:/var/www/

# Dry run (simula sin ejecutar)
rsync -avzn ./proyecto/ web-prod:/var/www/html/
\`\`\`

| Opción rsync | Descripción |
| --- | --- |
| \`-a\` | Modo archivo (preserva permisos, timestamps, propietario) |
| \`-v\` | Verbose |
| \`-z\` | Compresión en tránsito |
| \`--progress\` | Mostrar progreso de cada archivo |
| \`-n\` | Dry run: simula sin ejecutar |
| \`--delete\` | Elimina en destino archivos que ya no existen en origen |

### 📋 Lo que debes recordar

* \`scp\` usa la misma autenticación que \`ssh\`: llaves, agente y \`~/.ssh/config\`.
* La opción de puerto en \`scp\` es \`-P\` (mayúscula), a diferencia de \`ssh -p\` (minúscula).
* \`sftp\` es útil para explorar el sistema de archivos remoto interactivamente.
* \`rsync\` es la herramienta correcta para sincronizaciones incrementales de directorios grandes.

### 🧪 Autoevaluación

1. ¿Cómo descargás el directorio \`/etc/nginx/\` completo del servidor \`web-prod\` a tu carpeta local \`./backups/\`?
2. ¿Por qué \`rsync\` es más eficiente que \`scp -r\` para sincronizaciones periódicas?
3. Dentro de una sesión \`sftp\`, ¿cómo ves el directorio LOCAL donde estás?

---

1. \`scp -r web-prod:/etc/nginx/ ./backups/\`
2. \`rsync\` calcula el delta entre origen y destino y transfiere **solo los archivos nuevos o modificados**. \`scp -r\` siempre copia todo, incluso si ya existe y no cambió.
3. \`lls\` (local list) muestra el directorio local. Los comandos con \`l\` al inicio (\`lls\`, \`lcd\`, \`lpwd\`) operan en el sistema de archivos **local**.
`

export default content
