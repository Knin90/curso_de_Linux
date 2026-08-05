const content = `
## Módulo 6 — ACLs avanzadas: setfacl, getfacl y casos de uso en producción

### 🎯 Objetivos de aprendizaje

* Entender por qué los permisos Unix estándar (rwx + ugo) son insuficientes en muchos escenarios.
* Aplicar ACLs con setfacl para control de acceso granular por usuario y grupo.
* Configurar ACLs por defecto para que los archivos nuevos hereden permisos correctos.
* Dominar la máscara de ACL y su interacción con chmod y umask.

### ❓ El problema real

El equipo de desarrollo necesita acceso de lectura al directorio de logs del servidor web (/var/log/nginx/), pero www-data es el propietario y los permisos son 750. No puedes hacer al directorio world-readable (744) porque los logs pueden contener información sensible. Tampoco puedes cambiar el grupo a developers porque www-data necesita seguir escribiendo. Los permisos Unix de tres bits no pueden expresar "www-data tiene rwx, developers tiene r-x, todos los demás nada". Las ACLs sí pueden.

### 📖 Limitaciones del modelo Unix estándar

\`\`\`text
Modelo Unix: propietario (u) + grupo (g) + otros (o)
Problema: solo permite UN propietario, UN grupo, y "todos los demás"

Escenario imposible sin ACLs:
  - archivo pertenece a alice:developers
  - alice puede leer y escribir
  - bob (en otro grupo) puede leer pero no escribir
  - carlos (auditor) puede leer pero no escribir
  - el servidor web (www-data) no tiene acceso

Con chmod: puedes hacer o+r para que bob y carlos lean, pero también todo el mundo.
Con ACLs: puedes expresar exactamente lo que necesitas.
\`\`\`

### 📖 Verificar soporte de ACLs

\`\`\`bash
# El filesystem debe montarse con soporte ACL
# ext4: ACLs habilitadas por defecto desde kernel 2.6.x
# XFS: ACLs habilitadas por defecto
# Verificar opciones de montaje:
mount | grep acl
tune2fs -l /dev/sda1 | grep "Default mount options"
# "Default mount options: user_xattr acl"

# Si no está habilitado, añadir a /etc/fstab:
# /dev/sda1  /  ext4  defaults,acl  0 1

# Verificar que las herramientas están instaladas
which setfacl getfacl || apt-get install acl
\`\`\`

### 📖 getfacl: leer ACLs

\`\`\`bash
# Ver ACL de un archivo o directorio
getfacl /var/www/html/config.php

# Output:
# file: var/www/html/config.php
# owner: www-data
# group: www-data
# user::rw-        ← propietario (www-data)
# group::r--       ← grupo (www-data)
# other::---       ← otros
# (sin ACLs extendidas — solo el ACL base = permisos Unix)

# Con ACLs extendidas:
getfacl /srv/proyecto/

# file: srv/proyecto/
# owner: alice
# group: developers
# user::rwx         ← alice (propietaria)
# user:bob:r-x      ← bob: ACL de usuario específico
# user:www-data:r-x ← www-data: ACL de usuario específico
# group::rwx        ← grupo developers
# group:auditores:r-x ← grupo auditores: ACL de grupo específico
# mask::rwx         ← máscara (ver más abajo)
# other::---        ← otros: sin acceso
# default:user::rwx         ← ACLs por defecto para archivos nuevos
# default:group::rwx
# default:other::---
\`\`\`

### 📖 setfacl: establecer ACLs

\`\`\`bash
# Sintaxis: setfacl [opciones] acl_spec archivo

# Añadir ACL para un usuario específico
setfacl -m u:bob:rx /srv/proyecto/
# -m: modify (añadir o modificar)
# u:bob:rx → usuario bob con lectura y ejecución (traversal)

# Añadir ACL para un grupo específico
setfacl -m g:auditores:rx /srv/proyecto/

# Añadir ACL para www-data (solo lectura en directorio de logs)
setfacl -m u:www-data:--- /var/log/privado/

# Múltiples ACLs en un comando
setfacl -m u:bob:rx,u:carlos:rx,g:auditores:r /srv/data/

# Aplicar recursivamente
setfacl -R -m g:developers:rx /var/log/nginx/

# Eliminar una ACL específica
setfacl -x u:bob /srv/proyecto/        # -x: eliminar entrada de bob
setfacl -x g:auditores /srv/proyecto/  # eliminar entrada de auditores

# Eliminar TODAS las ACLs extendidas (dejar solo permisos Unix base)
setfacl -b /srv/proyecto/              # -b: remove all ACLs

# Eliminar ACLs por defecto
setfacl -k /srv/proyecto/              # -k: remove default ACLs
\`\`\`

### 📖 La máscara de ACL

La máscara es el elemento más confuso de las ACLs. Actúa como límite máximo de permisos efectivos para las entradas de ACL de usuario (excepto el propietario) y grupo.

\`\`\`bash
# Cuando haces chmod en un archivo con ACLs, chmod modifica la MÁSCARA, no los permisos ACL
# Esto puede causar comportamientos inesperados

# Ejemplo:
setfacl -m u:bob:rwx /archivo       # bob tiene rwx
chmod 750 /archivo                   # chmod cambia mask a r-x

getfacl /archivo
# user::rwx
# user:bob:rwx            #effective:r-x    ← bob quería rwx pero efectivo es r-x (limitado por mask)
# group::r-x
# mask::r-x               ← mask es r-x, limita todos excepto propietario
# other::---

# Para establecer la máscara explícitamente:
setfacl -m m:rwx /archivo           # mask con acceso completo
setfacl -m m::rx /archivo           # mask con solo lectura/ejecución

# Permisos efectivos = permisos ACL AND mask
# bob quería rwx (111), mask es r-x (101) → efectivo es r-x (101)

# Para evitar que chmod cambie la máscara cuando usas ACLs,
# siempre establece la máscara explícitamente después de chmod:
chmod 750 /directorio
setfacl -m m:rwx /directorio         # restaurar máscara completa para ACLs
\`\`\`

### 📖 ACLs por defecto: herencia

Las ACLs por defecto solo aplican a directorios y determinan qué ACLs tendrán los archivos y subdirectorios creados dentro.

\`\`\`bash
# Establecer ACLs por defecto en un directorio
setfacl -d -m u:bob:rx /srv/proyecto/     # -d: default
setfacl -d -m g:developers:rwx /srv/proyecto/
setfacl -d -m u::rwx /srv/proyecto/       # propietario siempre rwx
setfacl -d -m o::--- /srv/proyecto/       # otros siempre sin acceso

# Combinar ACL de acceso y por defecto en un solo comando:
setfacl -m u:bob:rx -d -m u:bob:rx /srv/proyecto/

# Verificar que las ACLs por defecto se heredan:
touch /srv/proyecto/nuevo_archivo.txt
getfacl /srv/proyecto/nuevo_archivo.txt
# Debe mostrar las ACLs derivadas de las defaults del directorio padre

# IMPORTANTE: la herencia funciona así:
# - Archivos nuevos heredan las default ACLs del directorio padre (sin execute por defecto)
# - Subdirectorios nuevos heredan las default ACLs como default Y como access ACLs
# - La máscara se calcula automáticamente para los nuevos archivos

# Ejemplo completo para un directorio compartido:
setfacl -m u::rwx,g:developers:rwx,o::---,d:u::rwx,d:g:developers:rwx,d:o::--- /srv/shared/
\`\`\`

### 📖 Casos de uso en producción

\`\`\`bash
# CASO 1: Directorio de logs legible por desarrolladores sin comprometer seguridad
# El directorio /var/log/nginx/ pertenece a www-data:adm, permisos 750
setfacl -R -m g:developers:rx /var/log/nginx/
# Recursivo solo en directorios (para ejecutar correctamente el traversal):
find /var/log/nginx/ -type d -exec setfacl -m g:developers:rx {} \\;
find /var/log/nginx/ -type f -exec setfacl -m g:developers:r {} \\;
# Con default para nuevos logs:
setfacl -d -m g:developers:rx /var/log/nginx/

# CASO 2: Directorio de deploy compartido entre app server y CI/CD
# /srv/app/ pertenece a appuser:appgroup
setfacl -m u:deploy:rwx /srv/app/
setfacl -m u:jenkins:rx /srv/app/
setfacl -d -m u:deploy:rwx -d -m u:jenkins:rx /srv/app/

# CASO 3: Directorio FTP de clientes donde cada cliente ve solo su carpeta
# /srv/ftp/clienteA/ — clienteA puede rwx, auditor puede rx, nadie más
mkdir -p /srv/ftp/clienteA
chown ftpuser:nogroup /srv/ftp/clienteA
chmod 700 /srv/ftp/clienteA
setfacl -m u:clienteA:rwx /srv/ftp/clienteA/
setfacl -m u:auditor:rx /srv/ftp/clienteA/
setfacl -d -m u:clienteA:rwx -d -m u:auditor:rx /srv/ftp/clienteA/

# CASO 4: Respaldar y restaurar ACLs
# Útil al migrar servidores o hacer backup de configuración de permisos
getfacl -R /srv/proyecto/ > /backup/acls-proyecto.txt
# Para restaurar:
setfacl --restore=/backup/acls-proyecto.txt
\`\`\`

### 📖 Interacción entre ACLs y umask

\`\`\`bash
# umask no afecta a las ACLs por defecto — afecta a los permisos Unix base del nuevo archivo
# Pero la máscara del ACL SÍ se ve afectada por umask en algunos sistemas

# Al crear un archivo en un directorio con ACLs default:
# 1. El archivo se crea con los permisos que umask permite
# 2. Las ACLs se aplican desde las ACLs default del directorio
# 3. La mask se calcula como la unión de los permisos del grupo + todos los ACLs de grupo

# Verificar el efecto de umask en un directorio con ACLs:
umask 022   # current umask
touch /srv/proyecto/test.txt
getfacl /srv/proyecto/test.txt
# Los permisos efectivos dependen de mask, que depende de las ACLs default

# Para asegurarse de que los archivos nuevos siempre son accesibles al grupo:
setfacl -d -m g:developers:rw /srv/proyecto/
# Aunque umask quite los permisos de grupo, las ACLs default los restauran
\`\`\`

### 📋 Lo que debes recordar

* \`chmod\` modifica la máscara ACL cuando un archivo tiene ACLs extendidas — esto puede reducir los permisos efectivos de otras entradas ACL inesperadamente.
* Las ACLs por defecto (\`setfacl -d\`) solo aplican a directorios y controlan la herencia en archivos y subdirectorios creados posteriormente — no afectan los existentes.
* El propietario del archivo (\`user::\`) no está afectado por la máscara — siempre tiene los permisos que se le asignaron directamente.
* Para respaldar y restaurar la configuración de ACLs de una estructura de directorios completa: \`getfacl -R /dir > acls.txt\` y \`setfacl --restore=acls.txt\`.

### 🧪 Autoevaluación

1. Tienes un archivo con \`user:bob:rwx\` en su ACL y ejecutas \`chmod 640\`. ¿Qué permisos efectivos tiene bob después del chmod? ¿Por qué?
2. Creas un directorio /srv/datos con ACL default para el grupo analytics (\`setfacl -d -m g:analytics:rx\`). Luego creas un archivo dentro: \`touch /srv/datos/reporte.csv\`. ¿El grupo analytics puede leer el archivo inmediatamente? ¿Y si el archivo fue creado por root con umask 077?
3. ¿Cuál es la diferencia entre eliminar todas las ACLs con \`setfacl -b\` vs eliminar una entrada específica con \`setfacl -x u:bob\`? ¿Cuándo usar cada uno?

---

1. Bob tiene permisos efectivos r-- (solo lectura). \`chmod 640\` cambia la máscara a rw- (el permiso del grupo en chmod). Los permisos efectivos de bob se calculan como: ACL de bob (rwx = 111) AND máscara (rw- = 110) = rw- (110). Pero si el directorio padre también tiene restricciones, puede ser menos. Para que bob recupere rwx, necesitarías \`setfacl -m m:rwx /archivo\` para restaurar la máscara.
2. Sí, el grupo analytics puede leer el archivo si la herencia funciona correctamente. Las ACLs default se aplican independientemente de umask. Sin embargo, con umask 077 de root, el archivo se crea con permisos base 600, pero la ACL default sigue aplicándose, creando \`group:analytics:r-x #effective:r--\` (limitado por mask). Si la máscara resultante es r--, analytics puede leer. El punto clave: ACLs default y umask son mecanismos diferentes; las ACLs pueden garantizar acceso incluso cuando umask lo niega.
3. \`setfacl -b\` elimina TODAS las entradas ACL extendidas (deja solo los permisos Unix base user/group/other). Usar cuando quieres volver al modelo estándar Unix. \`setfacl -x u:bob\` elimina solo la entrada de bob, dejando las demás ACLs intactas. Usar cuando quieres revocar acceso de un usuario específico sin afectar a los demás.
`

export default content
