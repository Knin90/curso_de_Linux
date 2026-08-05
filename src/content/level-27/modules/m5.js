const content = `
## Módulo 5 — Roles: estructura, dependencias y reutilización

### 🎯 Objetivos de aprendizaje

* Entender qué problema resuelven los roles y cuándo crearlos.
* Usar \`ansible-galaxy init\` para generar la estructura estándar de un rol.
* Conocer cada directorio del rol y su propósito exacto.
* Definir dependencias entre roles en \`meta/main.yml\`.
* Instalar roles de Ansible Galaxy con \`requirements.yml\`.

### ❓ El problema real

Tienes la configuración de nginx repartida en 5 playbooks distintos. Cuando actualizas el template de configuración, lo cambias en algunos pero olvidas otros. Tres equipos mantienen su propia versión del "playbook de nginx" con pequeñas diferencias que nadie recuerda. Los roles son la respuesta: una única unidad reutilizable, versionada, testeable, que cualquier playbook puede invocar y obtener el mismo resultado.

### 📖 Qué es un rol y cuándo crearlo

Un rol es una unidad autónoma y reutilizable de automatización con estructura estandarizada. Crea un rol cuando:

- La misma configuración se necesita en múltiples playbooks o proyectos.
- Un componente es suficientemente complejo para merecer sus propios tests.
- Quieres publicar o compartir la lógica (Ansible Galaxy, repositorio interno).
- Un play tiene más de ~30-40 tasks y se vuelve difícil de mantener.

No todo necesita ser un rol — para un playbook de un solo uso, tasks directas son suficientes.

### 📖 Estructura de un rol: directorio por directorio

\`\`\`bash
# Generar estructura estándar
ansible-galaxy init nginx

# Resultado:
nginx/
├── defaults/
│   └── main.yml       # variables con menor precedencia (overridables)
├── files/
│   └── ...            # archivos estáticos copiados con copy:
├── handlers/
│   └── main.yml       # handlers (notificados por tasks del rol)
├── meta/
│   └── main.yml       # metadatos del rol y dependencias
├── tasks/
│   └── main.yml       # entry point — lista de tasks del rol
├── templates/
│   └── ...            # plantillas Jinja2 (.j2) para template:
├── tests/
│   ├── inventory      # inventario de test (localhost)
│   └── test.yml       # playbook de prueba del rol
└── vars/
    └── main.yml       # variables de mayor precedencia (no overridables)
\`\`\`

**La diferencia clave entre \`defaults/\` y \`vars/\`:**
- \`defaults/main.yml\`: variables con la menor precedencia. El operador puede sobrescribirlas en el playbook o inventario. Úsalas para valores configurables.
- \`vars/main.yml\`: mayor precedencia que group_vars y host_vars. El operador no puede sobrescribirlas fácilmente. Úsalas para constantes internas del rol.

### 📖 Ejemplo completo: rol nginx

\`\`\`yaml
# roles/nginx/defaults/main.yml
nginx_user: www-data
nginx_worker_processes: auto
nginx_worker_connections: 1024
nginx_keepalive_timeout: 65
nginx_server_tokens: "off"
nginx_vhosts: []          # lista de virtual hosts (vacía por defecto)
nginx_remove_default_site: true
\`\`\`

\`\`\`yaml
# roles/nginx/vars/main.yml
# Constantes internas — no se espera que el operador las cambie
nginx_conf_dir: /etc/nginx
nginx_sites_available: /etc/nginx/sites-available
nginx_sites_enabled: /etc/nginx/sites-enabled
nginx_pid_file: /run/nginx.pid
\`\`\`

\`\`\`yaml
# roles/nginx/tasks/main.yml
---
- name: Incluir tasks de instalación
  ansible.builtin.import_tasks: install.yml
  tags: [nginx, install]

- name: Incluir tasks de configuración
  ansible.builtin.import_tasks: configure.yml
  tags: [nginx, config]

- name: Incluir tasks de virtual hosts
  ansible.builtin.import_tasks: vhosts.yml
  tags: [nginx, vhosts]
  when: nginx_vhosts | length > 0
\`\`\`

\`\`\`yaml
# roles/nginx/tasks/install.yml
---
- name: Instalar nginx
  ansible.builtin.package:
    name: nginx
    state: present

- name: Eliminar sitio por defecto
  ansible.builtin.file:
    path: "{{ nginx_sites_enabled }}/default"
    state: absent
  when: nginx_remove_default_site
  notify: Recargar nginx
\`\`\`

\`\`\`yaml
# roles/nginx/tasks/configure.yml
---
- name: Copiar nginx.conf principal
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: "{{ nginx_conf_dir }}/nginx.conf"
    owner: root
    group: root
    mode: '0644'
    validate: 'nginx -t -c %s'
  notify: Recargar nginx
\`\`\`

\`\`\`yaml
# roles/nginx/tasks/vhosts.yml
---
- name: Crear virtual hosts
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "{{ nginx_sites_available }}/{{ item.name }}.conf"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ nginx_vhosts }}"
  loop_control:
    label: "{{ item.name }}"
  notify: Recargar nginx

- name: Habilitar virtual hosts
  ansible.builtin.file:
    src: "{{ nginx_sites_available }}/{{ item.name }}.conf"
    dest: "{{ nginx_sites_enabled }}/{{ item.name }}.conf"
    state: link
  loop: "{{ nginx_vhosts }}"
  loop_control:
    label: "{{ item.name }}"
  notify: Recargar nginx
\`\`\`

\`\`\`yaml
# roles/nginx/handlers/main.yml
---
- name: Recargar nginx
  ansible.builtin.service:
    name: nginx
    state: reloaded

- name: Reiniciar nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
\`\`\`

\`\`\`yaml
# roles/nginx/meta/main.yml
---
galaxy_info:
  author: tu-nombre
  description: Rol para instalar y configurar nginx
  company: Tu Empresa
  license: MIT
  min_ansible_version: '2.14'
  platforms:
    - name: Ubuntu
      versions: ['20.04', '22.04', '24.04']
    - name: Debian
      versions: ['11', '12']
  galaxy_tags:
    - nginx
    - web
    - proxy

dependencies:
  - role: common        # este rol siempre instala primero el rol 'common'
    vars:
      common_timezone: "America/Bogota"
  - role: ufw
    vars:
      ufw_rules:
        - { port: 80, proto: tcp }
        - { port: 443, proto: tcp }
\`\`\`

### 📖 Usar roles en un playbook

\`\`\`yaml
---
# site.yml
- name: Configurar servidores web
  hosts: webservers
  become: true

  # Forma 1: lista de roles (simple)
  roles:
    - common
    - nginx
    - php-fpm

  # Forma 2: con variables y tags por rol
  roles:
    - role: common
      tags: [common]

    - role: nginx
      tags: [nginx, web]
      vars:
        nginx_worker_connections: 2048
        nginx_vhosts:
          - name: api.ejemplo.com
            server_name: api.ejemplo.com
            root: /var/www/api
            index: index.php

    - role: php-fpm
      tags: [php]
      vars:
        php_version: "8.2"

  # Forma 3: include_role en tasks (más flexible)
  tasks:
    - name: Aplicar rol nginx condicionalmente
      ansible.builtin.include_role:
        name: nginx
      when: "'webservers' in group_names"
      vars:
        nginx_worker_connections: 4096
\`\`\`

### 📖 Ansible Galaxy: roles de la comunidad

\`\`\`bash
# Buscar roles en Galaxy
ansible-galaxy search geerlingguy.nginx

# Instalar un rol de Galaxy
ansible-galaxy install geerlingguy.nginx

# Ver información de un rol
ansible-galaxy info geerlingguy.nginx

# Instalar en directorio específico del proyecto (recomendado)
ansible-galaxy install geerlingguy.nginx -p ./roles/

# requirements.yml: definir dependencias del proyecto
\`\`\`

\`\`\`yaml
# requirements.yml
---
roles:
  # Desde Ansible Galaxy
  - name: geerlingguy.nginx
    version: "3.2.0"

  - name: geerlingguy.mysql
    version: "4.6.3"

  # Desde un repositorio Git
  - name: internal-common
    src: git+https://github.com/mi-empresa/ansible-role-common.git
    version: v1.2.0

  # Desde una URL directa
  - name: mi-rol-especial
    src: https://example.com/roles/mi-rol-especial.tar.gz

collections:
  - name: community.general
    version: ">=7.0.0"
  - name: ansible.posix
    version: ">=1.5.0"
\`\`\`

\`\`\`bash
# Instalar todas las dependencias del proyecto
ansible-galaxy install -r requirements.yml
ansible-galaxy install -r requirements.yml -p ./roles/

# En CI/CD (sin confirmaciones interactivas)
ansible-galaxy install -r requirements.yml --force
\`\`\`

### 📖 Estructura de proyecto con roles

\`\`\`bash
# Estructura recomendada para un proyecto real
proyecto-ansible/
├── ansible.cfg
├── site.yml                    # playbook principal
├── webservers.yml              # playbook específico
├── databases.yml
├── requirements.yml            # dependencias de Galaxy
├── inventory/
│   ├── production/
│   │   ├── hosts.yml
│   │   ├── group_vars/
│   │   └── host_vars/
│   └── staging/
│       ├── hosts.yml
│       └── group_vars/
├── roles/
│   ├── common/                 # rol interno
│   ├── nginx/                  # rol interno
│   └── geerlingguy.mysql/      # rol de Galaxy (no modificar)
├── playbooks/
│   ├── deploy-app.yml
│   └── maintenance.yml
└── vars/
    └── vault.yml               # variables cifradas con Vault
\`\`\`

### 📋 Lo que debes recordar

* Los roles organizan tasks, templates, handlers y variables en una unidad reutilizable con estructura estándar.
* \`defaults/main.yml\` → variables configurables (menor precedencia). \`vars/main.yml\` → constantes del rol (mayor precedencia).
* Las dependencias en \`meta/main.yml\` se ejecutan automáticamente antes del rol.
* \`requirements.yml\` centraliza todas las dependencias de Galaxy del proyecto.
* No convertir todo en rol — solo cuando hay reutilización real o complejidad suficiente.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia práctica entre \`defaults/main.yml\` y \`vars/main.yml\` en un rol, y cuándo usarías cada uno?
2. Si el rol \`nginx\` depende del rol \`common\` en su \`meta/main.yml\`, ¿qué ocurre cuando invocas \`nginx\` en un playbook?
3. ¿Por qué se recomienda instalar roles de Galaxy en \`./roles/\` del proyecto en lugar de en \`~/.ansible/roles/\`?

---

1. \`defaults/main.yml\` tiene la precedencia más baja de todas las fuentes de variables en Ansible, por lo que cualquier variable definida en el inventario, \`group_vars\`, \`host_vars\` o el playbook la sobrescribe fácilmente. Úsala para valores que el operador debe poder personalizar (puertos, rutas, opciones de configuración). \`vars/main.yml\` tiene alta precedencia — solo \`set_fact\` y extra-vars la superan — por lo que protege constantes internas del rol que no deben ser modificadas accidentalmente. Úsala para paths internos fijos, nombres de paquetes, o valores que romperían el rol si cambian.
2. Ansible ejecuta el rol \`common\` automáticamente antes de \`nginx\`, sin necesidad de declararlo en el playbook. Si el mismo rol depende de múltiples roles, Ansible gestiona el orden y evita duplicados — si \`common\` ya fue ejecutado en el mismo play, no se vuelve a ejecutar.
3. Por reproducibilidad y aislamiento. Si instalas en \`~/.ansible/roles/\`, la versión disponible depende de lo que tenga el sistema del operador — un colega puede tener una versión diferente del mismo rol. En \`./roles/\` del proyecto, la versión está controlada por \`requirements.yml\`, puedes commitear el directorio o reproducirlo exactamente desde \`requirements.yml\` en cualquier máquina, en CI/CD, o en años futuros.
`

export default content
