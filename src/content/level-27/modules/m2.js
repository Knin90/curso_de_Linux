const content = `
## Módulo 2 — Playbooks: tasks, módulos y ejecución

### 🎯 Objetivos de aprendizaje

* Escribir playbooks YAML bien estructurados con hosts, become y tasks.
* Usar los módulos \`ansible.builtin\` más importantes en escenarios reales.
* Controlar el comportamiento de tasks con \`when\`, \`register\`, \`notify\`, \`ignore_errors\` y \`failed_when\`.
* Ejecutar playbooks con \`--check\`, \`--diff\`, tags y \`--limit\` para operaciones seguras en producción.

### ❓ El problema real

Necesitas configurar 15 servidores web: instalar nginx, copiar la configuración, habilitar el servicio y verificar que responde en el puerto 80. Hacerlo manualmente tarda horas y es propenso a errores. Con un playbook de Ansible, lo ejecutas una vez, tarda minutos, es idempotente (puedes correrlo N veces sin romper nada) y queda documentado en el repositorio como código.

### 📖 Estructura de un playbook

Un playbook es una lista de **plays**. Cada play selecciona hosts y define tasks:

\`\`\`yaml
---
# site.yml — playbook principal
- name: Configurar servidores web
  hosts: webservers          # grupo del inventario
  become: true               # escalar privilegios en todas las tasks
  gather_facts: true         # recopilar facts del sistema (default: true)

  vars:
    nginx_port: 80
    app_root: /var/www/html

  tasks:
    - name: Instalar nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

    - name: Asegurar que nginx está iniciado y habilitado
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

    - name: Copiar configuración del virtual host
      ansible.builtin.template:
        src: templates/nginx-vhost.conf.j2
        dest: /etc/nginx/sites-available/app.conf
        owner: root
        group: root
        mode: '0644'
      notify: Recargar nginx

  handlers:
    - name: Recargar nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
\`\`\`

### 📖 Módulos esenciales: gestión de paquetes

\`\`\`yaml
# apt (Debian/Ubuntu)
- name: Instalar múltiples paquetes
  ansible.builtin.apt:
    name:
      - nginx
      - python3-pip
      - git
    state: present        # present | absent | latest | build-dep
    update_cache: true    # equivale a apt update
    cache_valid_time: 3600  # no actualizar cache si tiene < 1h

# dnf (RHEL 8+ / Fedora / Rocky / AlmaLinux)
- name: Instalar httpd con dnf
  ansible.builtin.dnf:
    name: httpd
    state: latest

# yum (RHEL 7 / CentOS 7)
- name: Instalar dependencias con yum
  ansible.builtin.yum:
    name:
      - epel-release
      - nginx
    state: present

# package (agnóstico de distribución — usa el gestor del sistema)
- name: Instalar curl en cualquier distribución
  ansible.builtin.package:
    name: curl
    state: present
\`\`\`

### 📖 Módulos esenciales: archivos y directorios

\`\`\`yaml
# file: crear directorios, establecer permisos, crear symlinks
- name: Crear directorio de logs de la aplicación
  ansible.builtin.file:
    path: /var/log/app
    state: directory        # directory | file | link | absent | touch
    owner: www-data
    group: www-data
    mode: '0755'
    recurse: true           # aplicar permisos recursivamente

# copy: copiar archivo desde el control node
- name: Copiar script de inicio
  ansible.builtin.copy:
    src: files/start-app.sh
    dest: /usr/local/bin/start-app.sh
    owner: root
    group: root
    mode: '0755'
    backup: true            # guardar copia con timestamp si existe

# copy con content inline (sin archivo fuente)
- name: Escribir configuración inline
  ansible.builtin.copy:
    content: |
      [Unit]
      Description=Mi Aplicación
      After=network.target
    dest: /etc/systemd/system/miapp.service
    mode: '0644'

# template: copiar con sustitución de variables Jinja2
- name: Renderizar configuración de nginx
  ansible.builtin.template:
    src: templates/nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    validate: 'nginx -t -c %s'  # validar antes de instalar

# get_url: descargar archivo desde HTTP/HTTPS
- name: Descargar binario de aplicación
  ansible.builtin.get_url:
    url: https://releases.ejemplo.com/app-v2.1.0-linux-amd64.tar.gz
    dest: /tmp/app-v2.1.0.tar.gz
    checksum: sha256:a1b2c3d4e5f6...
    mode: '0644'

# unarchive: descomprimir archivos
- name: Extraer binario de aplicación
  ansible.builtin.unarchive:
    src: /tmp/app-v2.1.0.tar.gz
    dest: /opt/app/
    remote_src: true        # el archivo ya está en el nodo remoto
    owner: app
    group: app
\`\`\`

### 📖 Módulos esenciales: servicios y usuarios

\`\`\`yaml
# service: gestionar servicios systemd/init
- name: Habilitar e iniciar PostgreSQL
  ansible.builtin.service:
    name: postgresql
    state: started          # started | stopped | restarted | reloaded
    enabled: true           # habilitar en el arranque del sistema

# systemd: control más fino de systemd
- name: Recargar systemd y reiniciar servicio
  ansible.builtin.systemd:
    name: miapp
    state: restarted
    daemon_reload: true     # equivale a systemctl daemon-reload

# user: gestionar usuarios del sistema
- name: Crear usuario de aplicación
  ansible.builtin.user:
    name: appuser
    uid: 1500
    group: appgroup
    groups:
      - docker
      - sudo
    append: true            # agregar a grupos sin quitar los existentes
    shell: /bin/bash
    home: /home/appuser
    create_home: true
    password: "{{ vault_appuser_password | password_hash('sha512') }}"

# group: gestionar grupos
- name: Crear grupo de aplicación
  ansible.builtin.group:
    name: appgroup
    gid: 1500
    state: present

# command: ejecutar comando sin shell (sin pipes, sin variables de entorno)
- name: Inicializar base de datos
  ansible.builtin.command:
    cmd: /opt/app/bin/init-db --force
    creates: /var/lib/app/.initialized  # no ejecutar si este archivo existe

# shell: ejecutar con bash (permite pipes y redirecciones)
- name: Obtener número de workers activos
  ansible.builtin.shell: |
    ps aux | grep '[w]orker' | wc -l
  register: worker_count
  changed_when: false   # este comando no cambia nada
\`\`\`

### 📖 Control de tareas: register, when, notify

\`\`\`yaml
- name: Verificar si la aplicación está instalada
  ansible.builtin.command: which myapp
  register: myapp_check
  ignore_errors: true       # no fallar si el comando retorna != 0
  changed_when: false

- name: Instalar aplicación si no existe
  ansible.builtin.get_url:
    url: https://releases.ejemplo.com/myapp-latest
    dest: /usr/local/bin/myapp
    mode: '0755'
  when: myapp_check.rc != 0    # solo si el comando anterior falló

- name: Obtener versión actual de nginx
  ansible.builtin.command: nginx -v
  register: nginx_version
  changed_when: false

- name: Mostrar versión de nginx
  ansible.builtin.debug:
    msg: "Nginx version: {{ nginx_version.stderr }}"  # nginx -v escribe en stderr

- name: Copiar configuración solo en Ubuntu
  ansible.builtin.copy:
    src: files/ubuntu-nginx.conf
    dest: /etc/nginx/nginx.conf
  when:
    - ansible_distribution == "Ubuntu"
    - ansible_distribution_version is version('20.04', '>=')
  notify: Recargar nginx

# failed_when: definir cuándo una tarea cuenta como fallida
- name: Verificar espacio en disco
  ansible.builtin.command: df -BG /var/lib/mysql
  register: disk_check
  failed_when:
    - disk_check.rc != 0
    - '"100%" in disk_check.stdout'

# changed_when: definir cuándo una tarea cuenta como "changed"
- name: Ejecutar script de migración
  ansible.builtin.command: /opt/app/migrate.sh
  register: migration_result
  changed_when: '"Applied" in migration_result.stdout'
\`\`\`

### 📖 Ejecución segura en producción

\`\`\`bash
# --check: simular sin ejecutar cambios (dry run)
ansible-playbook site.yml --check

# --diff: mostrar qué cambiaría en los archivos
ansible-playbook site.yml --check --diff

# Salida con --diff:
# --- before: /etc/nginx/nginx.conf
# +++ after: /etc/nginx/nginx.conf
# @@ -1,5 +1,5 @@
#  worker_processes auto;
# -worker_connections 768;
# +worker_connections 1024;

# --limit: ejecutar solo en un subset de hosts
ansible-playbook site.yml --limit web-01.ejemplo.com
ansible-playbook site.yml --limit "webservers:!web-03"  # todos menos web-03

# Tags: ejecutar solo ciertas tasks
ansible-playbook site.yml --tags "install,config"
ansible-playbook site.yml --skip-tags "install"

# Agregar tags a tasks:
- name: Instalar dependencias
  ansible.builtin.apt:
    name: nginx
    state: present
  tags:
    - install
    - nginx

# --start-at-task: reanudar desde una tarea específica
ansible-playbook site.yml --start-at-task "Copiar configuración del virtual host"

# -v, -vv, -vvv: incrementar verbosidad
ansible-playbook site.yml -vv

# --syntax-check: validar YAML y sintaxis sin ejecutar
ansible-playbook site.yml --syntax-check

# Listar tasks que ejecutaría sin ejecutarlas
ansible-playbook site.yml --list-tasks

# Listar hosts afectados
ansible-playbook site.yml --list-hosts
\`\`\`

### 📋 Lo que debes recordar

* Un playbook tiene **plays** → plays tienen **tasks** → tasks usan **módulos**.
* Usar siempre el nombre completo del módulo (\`ansible.builtin.apt\`) evita ambigüedades con colecciones de terceros.
* \`register\` captura la salida de una tarea; \`when\` aplica condiciones; \`notify\` dispara handlers.
* \`--check --diff\` antes de aplicar en producción es una disciplina, no una opción.
* \`changed_when: false\` en comandos de solo-lectura evita falsos positivos en los reportes de cambios.

### 🧪 Autoevaluación

1. ¿Qué diferencia hay entre \`ansible.builtin.command\` y \`ansible.builtin.shell\`? ¿Cuándo usarías cada uno?
2. Si una tarea con \`register: resultado\` ejecuta un comando que devuelve código de salida 1, ¿qué contiene \`resultado.rc\` y cómo evitas que el playbook falle?
3. ¿Por qué \`changed_when: false\` es importante en tareas que solo leen información del sistema?

---

1. \`command\` ejecuta el binario directamente sin invocar un shell — no interpreta pipes (\`|\`), redirecciones (\`>\`), variables de entorno (\`\$VAR\`), ni expansión de globos (\`*.conf\`). Es más seguro y predecible. \`shell\` invoca \`/bin/sh -c\` y sí interpreta toda la sintaxis de shell. Usa \`command\` siempre que puedas; usa \`shell\` solo cuando necesites pipes u otras características de shell.
2. \`resultado.rc\` contiene \`1\` (el código de retorno). Por defecto Ansible considera cualquier \`rc != 0\` como fallo y detiene el playbook. Para evitar esto, agregas \`ignore_errors: true\` (la tarea falla pero el playbook continúa) o \`failed_when: false\` (nunca se considera fallida), o defines una condición más precisa con \`failed_when: resultado.rc not in [0, 1]\`.
3. Porque Ansible traza cuántas tareas resultaron en cambio (\`changed\`) para el reporte final. Un comando de solo lectura (como \`df\`, \`ps\`, \`cat\`) nunca modifica el sistema, pero por defecto Ansible lo marca como \`changed\` si el RC es 0. Esto contamina el reporte, dificulta identificar qué realmente cambió, y puede disparar handlers incorrectamente si alguien agrega un \`notify\`.
`

export default content
