const exam = [
  {
    "q": "¿Qué necesita un managed node de Ansible para ser gestionado, sin instalar ningún agente?",
    "options": [
      "Acceso SSH y Python instalado",
      "Un daemon Ansible corriendo en segundo plano",
      "Una licencia de Ansible Tower",
      "Un firewall con el puerto 5986 abierto"
    ],
    "correct": 0
  },
  {
    "q": "¿Dónde copia Ansible temporalmente los módulos Python antes de ejecutarlos en el nodo remoto?",
    "options": [
      "/opt/ansible",
      "/tmp",
      "/etc/ansible/modules",
      "/var/lib/ansible"
    ],
    "correct": 1
  },
  {
    "q": "En un inventario INI, ¿qué sintaxis agrupa varios grupos dentro de un meta-grupo?",
    "options": [
      "[production:vars]",
      "[production:group]",
      "[production:children]",
      "[production:hosts]"
    ],
    "correct": 2
  },
  {
    "q": "¿Cuál es la ventaja principal de usar group_vars/ y host_vars/ en lugar de variables dentro del archivo de inventario?",
    "options": [
      "Son obligatorios para que Ansible funcione",
      "Eliminan la necesidad de SSH",
      "Aumentan el paralelismo automáticamente",
      "Permiten organizar variables en archivos separados, versionables y con YAML completo"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué parámetro de ansible.cfg controla cuántos nodos se contactan simultáneamente?",
    "options": [
      "forks",
      "timeout",
      "retry_files_enabled",
      "pipelining"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué hace el comando `ansible webservers -m ping`?",
    "options": [
      "Instala el paquete ping en los webservers",
      "Verifica conectividad y que Python responda en el grupo webservers",
      "Ejecuta un playbook completo",
      "Reinicia el servicio de red"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuál es la jerarquía correcta de estructura en un playbook de Ansible?",
    "options": [
      "Tasks → Plays → Módulos",
      "Módulos → Plays → Tasks",
      "Plays → Tasks → Módulos",
      "Roles → Plays → Handlers"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué se recomienda usar el nombre completo del módulo, como `ansible.builtin.apt`, en lugar de solo `apt`?",
    "options": [
      "Es obligatorio desde Ansible 1.0",
      "Hace que el playbook se ejecute más rápido",
      "Permite usar variables Jinja2 dentro del nombre",
      "Evita ambigüedades con módulos de colecciones de terceros con el mismo nombre corto"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué diferencia principal hay entre `ansible.builtin.command` y `ansible.builtin.shell`?",
    "options": [
      "shell interpreta pipes, redirecciones y variables de entorno; command no",
      "command es más lento que shell",
      "command solo funciona en RHEL",
      "shell no puede usarse con become"
    ],
    "correct": 0
  },
  {
    "q": "¿Para qué sirve `changed_when: false` en una tarea de solo lectura como `df` o `ps`?",
    "options": [
      "Para que la tarea nunca se ejecute",
      "Para evitar que se marque como \"changed\" y contamine el reporte de cambios",
      "Para ignorar errores de la tarea",
      "Para forzar que dispare los handlers"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué combinación de flags permite ver qué cambiaría un playbook sin aplicar los cambios?",
    "options": [
      "--syntax-check --list-tasks",
      "--limit --tags",
      "--check --diff",
      "--start-at-task --verbose"
    ],
    "correct": 2
  },
  {
    "q": "Si una tarea con `register: resultado` falla con código de salida distinto de cero, ¿qué opción evita que el playbook se detenga sin ignorar por completo el error?",
    "options": [
      "notify: false",
      "gather_facts: false",
      "become: false",
      "failed_when con una condición más precisa"
    ],
    "correct": 3
  },
  {
    "q": "En la precedencia de variables de Ansible, ¿qué gana entre `host_vars` y una extra-var pasada con `-e`?",
    "options": [
      "La extra-var (-e) tiene mayor precedencia y gana",
      "host_vars siempre gana",
      "Depende del orden alfabético",
      "Ninguna, se produce un error"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué módulo recopila automáticamente los ansible_facts al inicio de un play?",
    "options": [
      "ansible.builtin.debug",
      "ansible.builtin.setup",
      "ansible.builtin.gather",
      "ansible.builtin.facts"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué fact distingue si un sistema pertenece a la familia RedHat (Rocky, AlmaLinux, RHEL, Fedora)?",
    "options": [
      "ansible_distribution",
      "ansible_kernel",
      "ansible_os_family",
      "ansible_hostname"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué se recomienda `gather_facts: false` en un playbook de 500 hosts que solo actualiza paquetes de seguridad sin necesitar información del sistema?",
    "options": [
      "Porque gather_facts está deprecado",
      "Porque es obligatorio para usar become",
      "Porque impide el uso de handlers",
      "Porque ahorra tiempo evitando una recopilación de ~1-2s por host innecesaria"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué tipo de dato produce siempre `ansible.builtin.set_fact` para una expresión como `\"{{ ansible_processor_vcpus * 2 }}\"`?",
    "options": [
      "Un string, salvo que se convierta explícitamente",
      "Un entero (int)",
      "Un booleano",
      "Una lista"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué variable mágica de Ansible da acceso a las variables de todos los hosts del inventario, no solo del host actual?",
    "options": [
      "group_names",
      "hostvars",
      "inventory_hostname",
      "playbook_dir"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuál es el propósito de `vars_prompt` en un playbook?",
    "options": [
      "Cifrar variables automáticamente",
      "Cargar variables desde un archivo externo",
      "Solicitar una variable al operador en tiempo de ejecución",
      "Definir variables de menor precedencia"
    ],
    "correct": 2
  },
  {
    "q": "Con `register: resultado` sobre un `loop` de 5 elementos, ¿cómo se accede al stdout del tercer item?",
    "options": [
      "resultado.stdout[3]",
      "resultado[3].stdout",
      "resultado.results.stdout[2]",
      "resultado.results[2].stdout"
    ],
    "correct": 3
  },
  {
    "q": "¿Por qué se prefiere `loop` sobre `with_items` en Ansible moderno?",
    "options": [
      "loop no aplana listas anidadas automáticamente, es más predecible y es el estándar desde Ansible 2.5",
      "loop es más lento pero más seguro",
      "with_items fue eliminado por completo",
      "loop solo funciona con diccionarios"
    ],
    "correct": 0
  },
  {
    "q": "¿Para qué sirve `loop_control.label` en una tarea con un loop de diccionarios complejos?",
    "options": [
      "Para ordenar el loop alfabéticamente",
      "Para mostrar algo más legible que el objeto completo en la salida",
      "Para pausar la ejecución entre iteraciones",
      "Para limitar el número de iteraciones"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué módulo se usa para asegurar que una sola línea específica existe en un archivo de configuración?",
    "options": [
      "ansible.builtin.blockinfile",
      "ansible.builtin.replace",
      "ansible.builtin.lineinfile",
      "ansible.builtin.template"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué combinación de parámetros del módulo `uri` se usa para reintentar una petición hasta que un servicio responda correctamente?",
    "options": [
      "delay + timeout en wait_for",
      "become + become_user",
      "check_mode + diff",
      "retries + delay + until"
    ],
    "correct": 3
  },
  {
    "q": "¿Cuál es la diferencia principal entre `import_tasks` e `include_tasks`?",
    "options": [
      "import_tasks se procesa en tiempo de parseo (estático) e include_tasks en tiempo de ejecución (dinámico)",
      "import_tasks es dinámico e include_tasks estático",
      "No hay diferencia práctica alguna",
      "include_tasks no admite loops"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué comando genera la estructura estándar de un rol de Ansible?",
    "options": [
      "ansible-playbook --init",
      "ansible-galaxy init",
      "ansible-role create",
      "ansible-vault init"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuál es la diferencia clave entre `defaults/main.yml` y `vars/main.yml` en un rol?",
    "options": [
      "defaults tiene mayor precedencia que vars",
      "vars solo admite strings y defaults solo listas",
      "defaults tiene la menor precedencia (fácil de sobrescribir); vars tiene alta precedencia (constantes internas)",
      "No hay diferencia, son sinónimos"
    ],
    "correct": 2
  },
  {
    "q": "¿Dónde se definen las dependencias entre roles, como que \"nginx\" dependa de \"common\"?",
    "options": [
      "tasks/main.yml",
      "handlers/main.yml",
      "defaults/main.yml",
      "meta/main.yml"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué archivo centraliza las dependencias externas de Ansible Galaxy y colecciones de un proyecto?",
    "options": [
      "requirements.yml",
      "ansible.cfg",
      "site.yml",
      "inventory/hosts.yml"
    ],
    "correct": 0
  },
  {
    "q": "¿Por qué se recomienda instalar roles de Galaxy en `./roles/` del proyecto en lugar de en `~/.ansible/roles/`?",
    "options": [
      "Porque ~/.ansible/roles/ no existe en Linux",
      "Por reproducibilidad: la versión queda controlada por requirements.yml y es la misma en cualquier máquina o CI/CD",
      "Porque es un requisito técnico obligatorio de ansible-galaxy",
      "Porque acelera la ejecución del playbook"
    ],
    "correct": 1
  },
  {
    "q": "¿Cuándo se justifica convertir una configuración en un rol en lugar de dejarla como tasks directas en un playbook?",
    "options": [
      "Siempre, todo playbook debe tener roles",
      "Solo cuando se publica en Ansible Galaxy",
      "Cuando la misma configuración se reutiliza en múltiples playbooks o el play supera ~30-40 tasks",
      "Nunca, los roles están deprecados"
    ],
    "correct": 2
  },
  {
    "q": "¿Cuál es la diferencia funcional entre los módulos `copy` y `template`?",
    "options": [
      "copy es más rápido pero template más seguro",
      "template solo funciona con archivos .txt",
      "No hay diferencia, ambos procesan Jinja2",
      "copy transfiere el archivo tal cual; template evalúa Jinja2 antes de transferirlo"
    ],
    "correct": 3
  },
  {
    "q": "Dado `backends = ['10.0.1.1', '10.0.1.2', '10.0.1.3']`, ¿qué produce `{{ backends | join(' ') }}`?",
    "options": [
      "La cadena \"10.0.1.1 10.0.1.2 10.0.1.3\"",
      "Una lista de tres elementos",
      "Un error de sintaxis",
      "Solo el primer elemento de la lista"
    ],
    "correct": 0
  },
  {
    "q": "¿Cómo se elimina el espacio en blanco que Jinja2 genera antes de una etiqueta `{% for %}`?",
    "options": [
      "Con el filtro | trim",
      "Usando el guion en la apertura: {%- for %}",
      "No es posible eliminarlo",
      "Agregando gather_facts: false"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué extensión de archivo se usa por convención para las plantillas Jinja2 en Ansible?",
    "options": [
      ".tpl",
      ".jinja",
      ".j2",
      ".yml.tpl"
    ],
    "correct": 2
  },
  {
    "q": "¿Qué permite el flag `--diff` combinado con `--check` al aplicar un playbook con plantillas?",
    "options": [
      "Aplicar los cambios de forma silenciosa",
      "Cifrar automáticamente las plantillas",
      "Saltarse la validación de sintaxis",
      "Revisar el contenido renderizado que cambiaría sin aplicar nada"
    ],
    "correct": 3
  },
  {
    "q": "¿Qué sintaxis Jinja2 permite iterar sobre los hosts de un grupo del inventario dentro de una plantilla?",
    "options": [
      "{% for server in groups['webservers'] %}",
      "{{ for host in groups }}",
      "{# loop groups.webservers #}",
      "{% hosts webservers %}"
    ],
    "correct": 0
  },
  {
    "q": "Si dos tareas distintas notifican al mismo handler durante un play, ¿cuántas veces se ejecuta ese handler?",
    "options": [
      "Dos veces, una por cada notificación",
      "Una sola vez, al final del play",
      "Depende del orden de las tareas",
      "Nunca, se produce un conflicto"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué directiva permite que un handler sea notificado por múltiples tareas usando un nombre de evento genérico?",
    "options": [
      "notify_all",
      "flush_handlers",
      "listen",
      "become"
    ],
    "correct": 2
  },
  {
    "q": "¿Cuál es la diferencia entre `ansible-vault encrypt` y `ansible-vault encrypt_string`?",
    "options": [
      "encrypt_string cifra archivos completos y encrypt solo variables",
      "No hay diferencia práctica",
      "encrypt_string requiere una licencia de Ansible Tower",
      "encrypt cifra un archivo completo en disco; encrypt_string cifra solo una cadena para embeber en YAML"
    ],
    "correct": 3
  },
  {
    "q": "¿Para qué sirven los Vault IDs en Ansible?",
    "options": [
      "Para gestionar múltiples contraseñas de Vault identificando cuál usar por archivo o entorno",
      "Para generar automáticamente contraseñas",
      "Para reemplazar el uso de SSH",
      "Para nombrar los playbooks"
    ],
    "correct": 0
  },
  {
    "q": "¿Para qué sirve el tag especial `never` en una tarea de Ansible?",
    "options": [
      "Marca una tarea que jamás se puede ejecutar",
      "Omite la tarea en ejecuciones normales; solo corre si se solicita explícitamente con --tags",
      "Deshabilita los handlers de esa tarea",
      "Impide el uso de become en esa tarea"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué se recomienda usar en CI/CD en lugar de `--ask-vault-pass` para desbloquear archivos cifrados con Vault?",
    "options": [
      "--force",
      "--skip-vault",
      "--vault-password-file con permisos restrictivos (600)",
      "--ignore-errors"
    ],
    "correct": 2
  },
  {
    "q": "¿Por qué se instala `python3-pymysql` en el rol de MySQL del stack LEMP?",
    "options": [
      "Porque es parte del paquete mysql-server",
      "Porque reemplaza a php-mysql",
      "Porque cifra las contraseñas automáticamente",
      "Porque los módulos mysql_user y mysql_db de Ansible lo necesitan para conectarse a MySQL desde el host remoto"
    ],
    "correct": 3
  },
  {
    "q": "En la plantilla `site.conf.j2`, ¿por qué se escribe `\\$uri` en lugar de `$uri`?",
    "options": [
      "Porque hay que escapar el símbolo $ para que Jinja2 no lo interprete y llegue literalmente al archivo de nginx",
      "Porque $uri no existe en nginx",
      "Es un error de sintaxis en el ejemplo",
      "Porque Ansible reemplaza automáticamente $ por una variable propia"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué confirma exactamente `changed=0` en el PLAY RECAP de la segunda ejecución de un playbook?",
    "options": [
      "Que el playbook falló silenciosamente",
      "Que el playbook es idempotente: el estado deseado ya coincidía y no hubo cambios",
      "Que no se recopilaron facts",
      "Que los handlers no se ejecutaron nunca"
    ],
    "correct": 1
  },
  {
    "q": "¿Qué módulo usa el post_task del playbook LEMP para verificar el estado de los servicios del sistema?",
    "options": [
      "ansible.builtin.setup",
      "ansible.builtin.wait_for",
      "ansible.builtin.service_facts",
      "ansible.builtin.command"
    ],
    "correct": 2
  },
  {
    "q": "¿Para qué se usa `no_log: true` en las tareas que manejan la contraseña root de MySQL?",
    "options": [
      "Para desactivar los handlers",
      "Para acelerar la ejecución de la tarea",
      "Para forzar el modo --check",
      "Para evitar que las contraseñas aparezcan en la salida de Ansible"
    ],
    "correct": 3
  },
  {
    "q": "En el playbook LEMP, ¿qué garantiza que MySQL esté operativo antes de intentar crear el usuario de la aplicación?",
    "options": [
      "El orden de los roles en la lista roles: y las tasks secuenciales dentro del rol mysql",
      "gather_facts: false",
      "El tag never en la tarea de phpinfo",
      "notify: reload nginx"
    ],
    "correct": 0
  },
  {
    "q": "¿Qué comando se usa para crear directamente un archivo de vault cifrado sin tener uno en texto plano previo?",
    "options": [
      "ansible-vault encrypt",
      "ansible-vault create",
      "ansible-vault new",
      "ansible-vault edit --new"
    ],
    "correct": 1
  }
]

export default exam
