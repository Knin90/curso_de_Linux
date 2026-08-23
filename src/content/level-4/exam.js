const exam = [
  {
    "q": "¿Quién toma la decisión final de permitir o denegar el acceso a un archivo en Linux?",
    "options": [
      "El Kernel, comparando UID/GID contra los bits del inodo",
      "La shell interactiva del usuario",
      "El propio archivo mediante un script de validación",
      "El gestor de paquetes de la distribución"
    ],
    "correct": 0
  },
  {
    "q": "¿Dónde se almacenan físicamente los permisos de un archivo en Linux?",
    "options": [
      "En el nombre del archivo",
      "En el inodo",
      "En la variable de entorno PATH",
      "En el archivo /etc/fstab"
    ],
    "correct": 1
  },
  {
    "q": "Si renombras o mueves un archivo a otra carpeta del mismo sistema de archivos, ¿qué ocurre con sus permisos?",
    "options": [
      "Se restablecen a 644 automáticamente",
      "Cambian según la nueva ubicación",
      "No cambian, porque viven en el inodo, no en el nombre",
      "Se eliminan y hay que asignarlos de nuevo"
    ],
    "correct": 2
  },
  {
    "q": "Según el modelo de decisión del kernel, ¿en qué orden se comparan los datos para decidir el acceso?",
    "options": [
      "Others → Group → User",
      "Solo se compara el GID",
      "Se pregunta interactivamente al usuario",
      "UID del proceso → GID del proceso → Others"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué comando muestra el número de inodo de un archivo junto al listado?",
    "options": [
      "ls -li",
      "chmod -v",
      "df -h",
      "whoami"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué ocurre internamente cuando ejecutas ./script.sh y el archivo no tiene el bit x?",
    "options": [
      "Se ejecuta igualmente con advertencia",
      "bash responde \"permission denied\"",
      "El kernel lo convierte en directorio",
      "Se ejecuta como root automáticamente"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué comando muestra la información completa de permisos y propietario almacenada en el inodo de un archivo?",
    "options": [
      "stat archivo",
      "mkdir archivo",
      "kill archivo",
      "top archivo"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué UID 0 tiene privilegios especiales en Linux?",
    "options": [
      "Porque está definido en /etc/hosts",
      "Porque root usa una contraseña más larga",
      "Porque UID 0 nunca puede ser reasignado",
      "Porque el kernel trata ese UID de forma especial en su código"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué archivo del sistema almacena los hashes de contraseñas de los usuarios?",
    "options": [
      "/etc/shadow",
      "/etc/passwd",
      "/etc/group",
      "/etc/hosts"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué consecuencia tiene ejecutar usermod -G developers usuario (sin la bandera -a)?",
    "options": [
      "Agrega el grupo sin afectar los demás",
      "Elimina todos los grupos secundarios previos del usuario",
      "Falla porque -G no existe",
      "Crea el grupo developers si no existe"
    ],
    "correct": 1
  },
  {
    "q": "En sistemas basados en RHEL/Fedora, ¿qué grupo suele usarse para otorgar privilegios administrativos vía sudo?",
    "options": [
      "sudo",
      "admin",
      "wheel",
      "root"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué comando permite ver de forma completa el UID, GID y los grupos secundarios de un usuario?",
    "options": [
      "passwd usuario",
      "groupadd usuario",
      "useradd usuario",
      "id usuario"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué comando elimina un usuario y también borra su directorio home?",
    "options": [
      "userdel -r usuario",
      "userdel usuario",
      "groupdel usuario",
      "usermod -d usuario"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué significa el permiso w aplicado a un directorio?",
    "options": [
      "Permite leer el contenido de los archivos dentro",
      "Permite crear, renombrar o eliminar archivos dentro",
      "Permite ejecutar el directorio como programa",
      "No tiene ningún efecto en directorios"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuál es el valor octal de los permisos r-xr-x---?",
    "options": [
      "755",
      "640",
      "550",
      "444"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué un directorio con permisos 644 no permite entrar con cd?",
    "options": [
      "Porque falta el bit r para el dueño",
      "Porque 644 es un valor inválido",
      "Porque el directorio necesita SGID",
      "Porque ninguna categoría tiene el bit x de ejecución"
    ],
    "correct": 3
  },
  {
    "q": "En la salida de ls -l, ¿cuántos caracteres componen la sección de tipo + permisos UGO?",
    "options": [
      "10",
      "9",
      "12",
      "8"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué opción de ls permite ver los permisos de un directorio sin listar su contenido?",
    "options": [
      "ls -a",
      "ls -ld",
      "ls -R",
      "ls -x"
    ],
    "correct": 1
  },
  {
    "q": "En un archivo, ¿qué permite el bit x (ejecución)?",
    "options": [
      "Listar los nombres de archivos",
      "Eliminar el archivo",
      "Ejecutar el archivo como programa",
      "Cambiar su propietario"
    ],
    "correct": 2
  },
  {
    "q": "¿Cómo añades permiso de ejecución solo al dueño sin tocar los permisos del grupo y otros?",
    "options": [
      "chmod 777 archivo",
      "chmod a+x archivo",
      "chown u+x archivo",
      "chmod u+x archivo"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué comando cambia dueño y grupo de /var/www/html a www-data:www-data de forma recursiva?",
    "options": [
      "sudo chown -R www-data:www-data /var/www/html",
      "chmod -R www-data /var/www/html",
      "sudo chgrp www-data /var/www/html",
      "sudo chown www-data /var/www"
    ],
    "correct": 0
  },
  {
    "q": "¿Por qué chmod 777 es peligroso en un servidor de producción?",
    "options": [
      "Porque impide que el dueño acceda al archivo",
      "Porque otorga lectura, escritura y ejecución a cualquier usuario del sistema",
      "Porque borra el archivo automáticamente",
      "Porque solo funciona con directorios"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué comando en modo simbólico equivale exactamente a chmod 750?",
    "options": [
      "chmod a=rwx",
      "chmod u+r,g+r archivo",
      "chmod u=rwx,g=rx,o= archivo",
      "chmod o=rwx archivo"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué comando cambia solo el grupo de un archivo, sin modificar el propietario?",
    "options": [
      "chown",
      "chmod",
      "chage",
      "chgrp"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué se recomienda hacer antes de aplicar un chown -R sobre un directorio grande?",
    "options": [
      "Verificar con find /ruta -user usuario_actual",
      "Ejecutar chmod 777 primero",
      "Reiniciar el sistema",
      "Eliminar el directorio y recrearlo"
    ],
    "correct": 0
  },
  {
    "q": "Con umask 027, ¿qué permisos tendrá un directorio recién creado?",
    "options": [
      "777",
      "750",
      "644",
      "700"
    ],
    "correct": 1
  },
  {
    "q": "¿Por qué el kernel nunca crea archivos con permiso de ejecución aunque el umask sea 000?",
    "options": [
      "Porque los archivos nuevos siempre son de solo lectura",
      "Porque umask no afecta a archivos",
      "Porque el máximo teórico para archivos es 666, sin bit x",
      "Porque se requiere chmod +x manualmente antes de crear el archivo"
    ],
    "correct": 2
  },
  {
    "q": "¿Cómo se calcula el permiso resultante al crear un archivo con un umask determinado?",
    "options": [
      "Se suma el umask al permiso máximo",
      "Se multiplica el umask por 2",
      "Se ignora el umask si el archivo ya existe",
      "Se resta el umask, bit a bit, del permiso máximo teórico"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué comando muestra el umask actual en formato simbólico?",
    "options": [
      "umask -S",
      "umask -v",
      "chmod -u",
      "stat umask"
    ],
    "correct": 0
  },
  {
    "q": "¿Cómo se hace que un umask sea persistente para un usuario específico?",
    "options": [
      "Ejecutando umask en la terminal cada vez",
      "Añadiendo \"umask valor\" a ~/.bashrc o ~/.bash_profile",
      "Modificando /etc/passwd",
      "No es posible hacerlo persistente"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuál es el permiso máximo teórico de un directorio antes de aplicar el umask?",
    "options": [
      "666",
      "755",
      "777",
      "644"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué /usr/bin/passwd puede escribir en /etc/shadow aunque lo ejecute un usuario normal?",
    "options": [
      "Porque /etc/shadow es legible por todos",
      "Porque passwd corre como servicio en segundo plano",
      "Porque el usuario normal tiene UID 0 temporalmente por defecto",
      "Porque passwd tiene el bit SUID activo y su dueño es root"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué hace el bit SGID aplicado a un directorio?",
    "options": [
      "Los archivos nuevos heredan el grupo del directorio padre",
      "Impide que se creen archivos nuevos",
      "Convierte el directorio en solo lectura",
      "Otorga privilegios de root a quien entre al directorio"
    ],
    "correct": 0
  },
  {
    "q": "Si ves -rwSr--r-- en ls -l, ¿qué indica la S mayúscula?",
    "options": [
      "Que el archivo está cifrado",
      "Que el SUID está activo pero falta el bit de ejecución, siendo inefectivo",
      "Que el archivo tiene Sticky Bit",
      "Que el archivo pertenece a un grupo del sistema"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué protege el Sticky Bit aplicado a un directorio como /tmp?",
    "options": [
      "Que nadie pueda leer los archivos",
      "Que los archivos se cifren automáticamente",
      "Que cada usuario solo pueda eliminar sus propios archivos",
      "Que el directorio no pueda ser listado"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué valor octal corresponde a aplicar SUID y SGID juntos a un archivo?",
    "options": [
      "1000",
      "4000",
      "2000",
      "6000"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué comando permite encontrar todos los archivos con SUID activo en el sistema?",
    "options": [
      "find / -perm -4000 -type f",
      "ls -R / | grep suid",
      "chmod -R 4000 /",
      "stat --suid /"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué hace la máscara ACL (mask) y por qué puede causar que una regla \"correcta\" no funcione?",
    "options": [
      "Bloquea completamente todas las ACLs del archivo",
      "Define el permiso máximo efectivo para las entradas ACL, reduciendo permisos por intersección",
      "Cambia automáticamente el dueño del archivo",
      "Solo afecta a directorios, nunca a archivos"
    ],
    "correct": 1
  },
  {
    "q": "¿Cómo eliminas TODAS las ACLs de un archivo y vuelves a UGO puro?",
    "options": [
      "setfacl -x archivo",
      "setfacl -m archivo",
      "setfacl -b archivo",
      "rm -acl archivo"
    ],
    "correct": 2
  },
  {
    "q": "Si defines user:pedro:rwx y la máscara es r--, ¿qué permisos efectivos tendrá pedro?",
    "options": [
      "rwx completos",
      "Ningún permiso",
      "rw- sin ejecución",
      "r-- solamente"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué comando muestra las reglas ACL de un archivo?",
    "options": [
      "getfacl archivo",
      "setfacl archivo",
      "lsacl archivo",
      "chacl -l archivo"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué opción de setfacl aplica una regla ACL que hereden automáticamente los archivos nuevos creados dentro de un directorio?",
    "options": [
      "setfacl -R",
      "setfacl -d",
      "setfacl -m",
      "setfacl -x"
    ],
    "correct": 1
  },
  {
    "q": "Al hacer ls -l sobre un archivo con ACLs activas, ¿qué símbolo adicional aparece al final de los permisos?",
    "options": [
      "*",
      "@",
      "+",
      "#"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué developers necesita una regla ACL sobre /opt/empresa/informes en lugar de resolverse solo con UGO?",
    "options": [
      "Porque developers no tiene usuarios asignados",
      "Porque ACL es obligatorio en todos los directorios",
      "Porque UGO no admite el bit de lectura",
      "Porque UGO solo permite un grupo dueño por recurso y developers no es ese grupo"
    ],
    "correct": 3
  },
  {
    "q": "Si dev1 crea un archivo dentro de /opt/empresa/codigo y el bit SGID está activo, ¿qué grupo queda asignado al archivo nuevo?",
    "options": [
      "El grupo developers, heredado del directorio padre",
      "El grupo primario de dev1",
      "El grupo root",
      "Ningún grupo, hay que asignarlo manualmente"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué error comete un administrador que ejecuta usermod -G qa tester1 en vez de usermod -aG qa tester1?",
    "options": [
      "No pasa nada, ambos comandos son equivalentes",
      "Reemplaza por completo los grupos secundarios existentes de tester1",
      "Crea el grupo qa automáticamente",
      "Elimina al usuario tester1 del sistema"
    ],
    "correct": 1
  },
  {
    "q": "Según el flujo del proyecto, ¿cuál es el orden correcto de configuración de la infraestructura de identidades?",
    "options": [
      "ACLs → Permisos → Usuarios → Grupos → Directorios",
      "Directorios → ACLs → Grupos → Usuarios → Permisos",
      "Grupos → Usuarios → Directorios → Permisos UGO/SGID → ACLs",
      "Usuarios → ACLs → Grupos → Directorios → Permisos"
    ],
    "correct": 2
  },
  {
    "q": "En el proyecto, ¿qué permisos octales se aplican al directorio /opt/empresa/releases para que solo deployer tenga acceso?",
    "options": [
      "2770",
      "2750",
      "0770",
      "2700"
    ],
    "correct": 3
  },
  {
    "q": "¿Con qué comando se verifica el acceso real de un usuario específico a un recurso, en lugar de confiar solo en ls -l?",
    "options": [
      "sudo -u usuario comando",
      "chmod -u usuario",
      "getfacl -u usuario",
      "id -u usuario comando"
    ],
    "correct": 0
  },
  {
    "q": "¿Por qué el auditor externo (auditor_ext) puede leer /opt/empresa/informes pero no puede crear archivos ahí?",
    "options": [
      "Porque su UID es 0",
      "Porque no pertenece al grupo qa y su ACL solo otorga permiso de lectura y ejecución (rx), sin escritura",
      "Porque el directorio tiene Sticky Bit",
      "Porque no existe la carpeta informes"
    ],
    "correct": 1
  }
]

export default exam
