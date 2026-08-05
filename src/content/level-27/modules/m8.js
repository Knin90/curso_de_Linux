const content = `
## Módulo 8 — Laboratorio: despliegue de stack LEMP con Ansible

### 🎯 Objetivos de aprendizaje

* Integrar en un proyecto real los conceptos aprendidos: roles, plantillas, handlers y Vault.
* Estructurar un proyecto Ansible siguiendo las convenciones de la industria.
* Desplegar un stack Linux + Nginx + MySQL + PHP-FPM de forma idempotente y reproducible.
* Verificar el despliegue mediante módulos de Ansible en lugar de comandos manuales.
* Confirmar la idempotencia ejecutando el playbook por segunda vez sin cambios.

---

### ❓ El problema real

Tu equipo necesita desplegar un stack LEMP en tres servidores de producción. El proceso manual tarda 45 minutos por servidor, es propenso a errores y no está documentado. Si un servidor falla, no hay forma rápida de reproducir su configuración exacta. El objetivo es automatizar el despliegue completo de forma que sea repetible, seguro (contraseñas cifradas) y verificable.

---

### 📖 Estructura del proyecto

\`\`\`
lemp-playbook/
├── ansible.cfg
├── inventory/
│   └── hosts
├── group_vars/
│   └── webservers/
│       ├── vars.yml
│       └── vault.yml
├── roles/
│   ├── nginx/
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   └── templates/
│   │       └── site.conf.j2
│   ├── mysql/
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   └── handlers/
│   │       └── main.yml
│   └── php/
│       └── tasks/
│           └── main.yml
└── site.yml
\`\`\`

---

### 📖 Archivos de configuración base

#### ansible.cfg

\`\`\`ini
[defaults]
inventory           = inventory/hosts
remote_user         = ubuntu
host_key_checking   = False
roles_path          = roles
stdout_callback     = yaml
callback_whitelist  = timer, profile_tasks

[privilege_escalation]
become        = True
become_method = sudo
become_user   = root
\`\`\`

#### inventory/hosts

\`\`\`ini
[webservers]
web01 ansible_host=192.168.1.10
web02 ansible_host=192.168.1.11
web03 ansible_host=192.168.1.12

[webservers:vars]
ansible_python_interpreter=/usr/bin/python3
\`\`\`

#### group_vars/webservers/vars.yml

\`\`\`yaml
# Configuración de nginx
domain_name: app.example.com
http_port: 80
nginx_worker_connections: 1024

# PHP
php_version: "8.1"

# Base de datos — contraseñas referenciadas desde vault.yml
db_host: localhost
db_port: 3306
db_name: myapp
db_user: myapp_user
db_root_password: "{{ vault_db_root_password }}"
db_app_password: "{{ vault_db_app_password }}"

# Aplicación
app_name: myapp
document_root: /var/www/{{ app_name }}
\`\`\`

#### group_vars/webservers/vault.yml

Este archivo debe crearse cifrado con Ansible Vault:

\`\`\`bash
ansible-vault create group_vars/webservers/vault.yml
\`\`\`

Contenido antes de cifrar:

\`\`\`yaml
vault_db_root_password: "R00tP4ssw0rd!Segura"
vault_db_app_password: "AppP4ssw0rd!Segura"
\`\`\`

---

### 📖 Playbook principal

#### site.yml

\`\`\`yaml
---
- name: Desplegar stack LEMP
  hosts: webservers
  become: yes

  pre_tasks:
    - name: Actualizar caché de paquetes
      apt:
        update_cache: yes
        cache_valid_time: 3600
      tags: [always]

  roles:
    - role: nginx
      tags: [nginx]
    - role: mysql
      tags: [mysql]
    - role: php
      tags: [php]

  post_tasks:
    - name: Verificar que nginx está activo
      service_facts:

    - name: Confirmar estado de servicios
      assert:
        that:
          - "'nginx' in services"
          - "services['nginx']['state'] == 'running'"
          - "'mysql' in services"
          - "services['mysql']['state'] == 'running'"
        fail_msg: "Uno o más servicios no están activos"
        success_msg: "Todos los servicios están en ejecución"
      tags: [verify]
\`\`\`

---

### 📖 Rol nginx

#### roles/nginx/tasks/main.yml

\`\`\`yaml
---
- name: Instalar nginx
  apt:
    name: nginx
    state: present

- name: Crear directorio raíz del sitio
  file:
    path: "{{ document_root }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'

- name: Desplegar configuración del virtual host
  template:
    src: site.conf.j2
    dest: /etc/nginx/sites-available/{{ app_name }}.conf
    owner: root
    group: root
    mode: '0644'
  notify: reload nginx

- name: Activar el virtual host
  file:
    src: /etc/nginx/sites-available/{{ app_name }}.conf
    dest: /etc/nginx/sites-enabled/{{ app_name }}.conf
    state: link
  notify: reload nginx

- name: Desactivar sitio default de nginx
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx

- name: Asegurar que nginx está habilitado e iniciado
  service:
    name: nginx
    state: started
    enabled: yes
\`\`\`

#### roles/nginx/handlers/main.yml

\`\`\`yaml
---
handlers:
  - name: reload nginx
    service:
      name: nginx
      state: reloaded

  - name: restart nginx
    service:
      name: nginx
      state: restarted
\`\`\`

#### roles/nginx/templates/site.conf.j2

\`\`\`jinja2
server {
    listen {{ http_port }};
    server_name {{ domain_name }} {{ inventory_hostname }};

    root {{ document_root }};
    index index.php index.html index.htm;

    access_log /var/log/nginx/{{ app_name }}_access.log;
    error_log  /var/log/nginx/{{ app_name }}_error.log;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \\.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php{{ php_version }}-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }

    # Cabeceras de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
\`\`\`

---

### 📖 Rol mysql

#### roles/mysql/tasks/main.yml

\`\`\`yaml
---
- name: Instalar MySQL server y dependencias Python
  apt:
    name:
      - mysql-server
      - python3-pymysql
    state: present

- name: Asegurar que MySQL está iniciado y habilitado
  service:
    name: mysql
    state: started
    enabled: yes

- name: Establecer contraseña de root para MySQL
  mysql_user:
    name: root
    host: localhost
    password: "{{ db_root_password }}"
    login_unix_socket: /var/run/mysqld/mysqld.sock
    state: present
  no_log: true

- name: Crear archivo de credenciales .my.cnf para root
  template:
    src: my.cnf.j2
    dest: /root/.my.cnf
    owner: root
    group: root
    mode: '0600'
  no_log: true

- name: Eliminar usuarios anónimos
  mysql_user:
    name: ''
    host_all: yes
    state: absent
    login_user: root
    login_password: "{{ db_root_password }}"
  no_log: true

- name: Eliminar base de datos de prueba
  mysql_db:
    name: test
    state: absent
    login_user: root
    login_password: "{{ db_root_password }}"

- name: Crear base de datos de la aplicación
  mysql_db:
    name: "{{ db_name }}"
    state: present
    encoding: utf8mb4
    collation: utf8mb4_unicode_ci
    login_user: root
    login_password: "{{ db_root_password }}"

- name: Crear usuario de la aplicación con privilegios
  mysql_user:
    name: "{{ db_user }}"
    password: "{{ db_app_password }}"
    priv: "{{ db_name }}.*:ALL"
    host: localhost
    state: present
    login_user: root
    login_password: "{{ db_root_password }}"
  no_log: true
  notify: restart mysql
\`\`\`

#### roles/mysql/handlers/main.yml

\`\`\`yaml
---
handlers:
  - name: restart mysql
    service:
      name: mysql
      state: restarted
\`\`\`

---

### 📖 Rol php

#### roles/php/tasks/main.yml

\`\`\`yaml
---
- name: Instalar PHP-FPM y extensiones requeridas
  apt:
    name:
      - php{{ php_version }}-fpm
      - php{{ php_version }}-mysql
      - php{{ php_version }}-mbstring
      - php{{ php_version }}-xml
      - php{{ php_version }}-curl
      - php{{ php_version }}-zip
    state: present

- name: Asegurar que PHP-FPM está iniciado y habilitado
  service:
    name: php{{ php_version }}-fpm
    state: started
    enabled: yes

- name: Desplegar phpinfo de diagnóstico
  copy:
    content: "<?php phpinfo();"
    dest: "{{ document_root }}/info.php"
    owner: www-data
    group: www-data
    mode: '0644'
  tags: [debug, never]
\`\`\`

---

### 📖 Secuencia de ejecución

#### Paso 1 — Dry run: verificar qué cambiaría

\`\`\`bash
ansible-playbook site.yml --check --diff --ask-vault-pass
\`\`\`

Revisa cuidadosamente la salida. El flag \`--diff\` muestra el contenido renderizado de cada plantilla. El flag \`--check\` no aplica ningún cambio.

#### Paso 2 — Despliegue real

\`\`\`bash
ansible-playbook site.yml --ask-vault-pass
\`\`\`

Salida esperada (primera ejecución): todas las tareas en \`changed\`, handlers ejecutados al final.

#### Paso 3 — Verificación funcional

\`\`\`bash
# Verificar que nginx responde en todos los hosts
ansible webservers -m uri -a "url=http://localhost/ return_content=yes"

# Desplegar y verificar phpinfo (tag 'debug' + 'never')
ansible-playbook site.yml --tags debug --ask-vault-pass
ansible webservers -m uri -a "url=http://localhost/info.php" --ask-vault-pass

# Verificar conectividad a MySQL desde cada host
ansible webservers -m community.mysql.mysql_info \
  -a "login_user={{ db_user }} login_password={{ db_app_password }}" \
  --ask-vault-pass
\`\`\`

#### Paso 4 — Prueba de idempotencia

\`\`\`bash
ansible-playbook site.yml --ask-vault-pass
\`\`\`

En la segunda ejecución, el resultado esperado es:

\`\`\`
PLAY RECAP ************************************
web01 : ok=18  changed=0  unreachable=0  failed=0
web02 : ok=18  changed=0  unreachable=0  failed=0
web03 : ok=18  changed=0  unreachable=0  failed=0
\`\`\`

\`changed=0\` en todos los hosts confirma que el playbook es idempotente: puede ejecutarse múltiples veces sin efectos no deseados.

---

### 📖 Diagnóstico de problemas frecuentes

\`\`\`bash
# Ver log de errores de nginx en tiempo real
ansible webservers -m command -a "journalctl -u nginx -n 50 --no-pager"

# Verificar configuración de nginx antes de recargar
ansible webservers -m command -a "nginx -t"

# Comprobar que PHP-FPM escucha en el socket correcto
ansible webservers -m stat \
  -a "path=/run/php/php8.1-fpm.sock"

# Revisar variables resueltas para un host
ansible web01 -m debug -a "var=hostvars[inventory_hostname]"
\`\`\`

---

### 📋 Lo que debes recordar

* La estructura de roles (\`tasks/\`, \`handlers/\`, \`templates/\`, \`files/\`) es la columna vertebral de proyectos Ansible mantenibles.
* \`no_log: true\` en tareas con contraseñas evita que los valores aparezcan en la salida de Ansible.
* La idempotencia se verifica ejecutando el playbook por segunda vez y confirmando \`changed=0\`.
* El stack LEMP requiere orden de dependencias: MySQL debe estar activo antes de crear usuarios; nginx necesita PHP-FPM para el socket fastcgi.
* Las contraseñas de base de datos nunca se escriben en texto plano; siempre se referencian desde \`vault.yml\` cifrado.
* \`--check --diff\` antes de producción y \`--tags debug --tags never\` para tareas de diagnóstico controlado.
* Un playbook correcto convierte un proceso de 45 minutos por servidor en minutos paralelos para toda la flota.

---

### 🧪 Autoevaluación

1. ¿Por qué se instala \`python3-pymysql\` en el rol de MySQL si no es parte del stack LEMP propiamente?
2. En la plantilla \`site.conf.j2\`, \`\$uri\` y \`\$query_string\` usan \`\\\$\` en lugar de \`\$\`. ¿Por qué?
3. ¿Qué indica exactamente \`changed=0\` en el PLAY RECAP de la segunda ejecución?

---

1. \`python3-pymysql\` es la librería Python que los módulos de Ansible (\`mysql_user\`, \`mysql_db\`) necesitan para conectarse a MySQL desde el host remoto. Sin ella, Ansible no puede gestionar usuarios ni bases de datos aunque MySQL esté instalado.
2. Porque dentro de una plantilla Jinja2, el símbolo \`\$\` seguido de texto es interpretado como una variable de shell si no se escapa. Con \`\\\$\` se escapa el símbolo para que llegue literalmente al archivo de configuración de nginx, donde sí tiene significado propio (\`\$uri\`, \`\$query_string\` son variables internas de nginx, no de Ansible).
3. Confirma que el playbook es idempotente: todas las tareas verificaron que el estado del sistema ya coincidía con el estado deseado y no realizaron ningún cambio. Esto es la prueba de que el despliegue fue correcto y que el playbook puede ejecutarse de forma segura múltiples veces.
`

export default content
