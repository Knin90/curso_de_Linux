const content = `
## Módulo 3 — Variables, facts y condicionales

### 🎯 Objetivos de aprendizaje

* Entender la precedencia de variables en Ansible y por qué importa en producción.
* Usar ansible_facts para tomar decisiones basadas en el sistema operativo, hardware y red.
* Desactivar gather_facts cuando no es necesario para acelerar playbooks.
* Aplicar condicionales \`when\` con variables, facts y comparaciones de versión.
* Definir variables dinámicamente con \`set_fact\` y cargar variables desde archivos externos.

### ❓ El problema real

Tu playbook debe instalar nginx en servidores Ubuntu 22.04 y Rocky Linux 9. En Ubuntu usas \`apt\`, en Rocky usas \`dnf\`. La ruta de configuración también cambia. Sin variables y facts, escribirías dos playbooks distintos que divergen con el tiempo. Con facts y condicionales, un solo playbook maneja ambas distribuciones de forma elegante.

### 📖 Precedencia de variables: quién gana

Ansible tiene más de 20 niveles de precedencia. En orden ascendente (el último gana):

\`\`\`text
1.  defaults en roles (defaults/main.yml)           ← menor precedencia
2.  Variables de inventario (inventario INI)
3.  group_vars/all
4.  group_vars/<grupo>
5.  host_vars/<host>
6.  Variables de play (vars: en el playbook)
7.  Variables de bloque (vars: dentro de block:)
8.  Variables de tarea (vars: dentro de la task)
9.  include_vars / vars_files
10. set_fact / registered vars
11. extra-vars (-e en línea de comandos)            ← mayor precedencia
\`\`\`

Regla práctica: **cuanto más específico y tardío, mayor precedencia**.

\`\`\`yaml
# Ejemplo de conflicto de precedencia:

# group_vars/webservers.yml
nginx_port: 80

# host_vars/web-01.ejemplo.com.yml
nginx_port: 8080     # GANA sobre group_vars

# Línea de comandos:
# ansible-playbook site.yml -e "nginx_port=9090"  # GANA sobre todo
\`\`\`

### 📖 Variables de inventario: hostvars y groups

Las variables de todos los hosts son accesibles globalmente mediante \`hostvars\`:

\`\`\`yaml
# Acceder a la IP de un host diferente al actual
- name: Configurar backend con IP del servidor de BD
  ansible.builtin.template:
    src: templates/app.conf.j2
    dest: /etc/app/app.conf
  vars:
    db_host: "{{ hostvars['db-01.ejemplo.com']['ansible_default_ipv4']['address'] }}"

# Iterar sobre todos los hosts de un grupo
- name: Generar lista de servidores web en haproxy
  ansible.builtin.template:
    src: templates/haproxy.cfg.j2
    dest: /etc/haproxy/haproxy.cfg
  # En la plantilla: {% for host in groups['webservers'] %}

# Verificar si un host pertenece a un grupo
- name: Tarea solo para el primero del grupo
  ansible.builtin.debug:
    msg: "Soy el servidor primario"
  when: inventory_hostname == groups['databases'][0]
\`\`\`

### 📖 Ansible facts: conociendo el sistema

Los facts son variables automáticas que Ansible recopila al inicio de cada play mediante el módulo \`setup\`:

\`\`\`bash
# Ver todos los facts de un host
ansible web-01.ejemplo.com -m setup

# Filtrar facts específicos
ansible web-01.ejemplo.com -m setup -a "filter=ansible_memory_mb"
ansible web-01.ejemplo.com -m setup -a "filter=ansible_*_ipv4"

# Salida relevante:
# "ansible_distribution": "Ubuntu",
# "ansible_distribution_version": "22.04",
# "ansible_distribution_major_version": "22",
# "ansible_os_family": "Debian",
# "ansible_hostname": "web-01",
# "ansible_fqdn": "web-01.ejemplo.com",
# "ansible_default_ipv4": {
#     "address": "192.168.1.10",
#     "interface": "eth0",
#     "gateway": "192.168.1.1"
# },
# "ansible_memtotal_mb": 7948,
# "ansible_processor_vcpus": 4,
# "ansible_kernel": "5.15.0-101-generic"
\`\`\`

### 📖 Condicionales basados en facts del SO

\`\`\`yaml
---
- name: Instalar y configurar nginx multi-distro
  hosts: webservers
  become: true

  tasks:
    # Condicional por familia de SO
    - name: Instalar nginx (Debian/Ubuntu)
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Instalar nginx (RedHat/Rocky/AlmaLinux)
      ansible.builtin.dnf:
        name: nginx
        state: present
      when: ansible_os_family == "RedHat"

    # Condicional por distribución y versión exacta
    - name: Configurar repositorio de PHP 8.2 (Ubuntu 22.04)
      ansible.builtin.apt_repository:
        repo: ppa:ondrej/php
        state: present
      when:
        - ansible_distribution == "Ubuntu"
        - ansible_distribution_version is version('22.04', '>=')

    # Condicional por memoria disponible
    - name: Configurar Redis con caché grande
      ansible.builtin.template:
        src: templates/redis-large.conf.j2
        dest: /etc/redis/redis.conf
      when: ansible_memtotal_mb >= 8192

    - name: Configurar Redis con caché pequeña
      ansible.builtin.template:
        src: templates/redis-small.conf.j2
        dest: /etc/redis/redis.conf
      when: ansible_memtotal_mb < 8192

    # Condicional combinado con operadores lógicos
    - name: Habilitar IPv6 solo en Ubuntu moderno con suficiente RAM
      ansible.builtin.lineinfile:
        path: /etc/nginx/nginx.conf
        line: "listen [::]:80;"
        insertafter: "listen 80;"
      when:
        - ansible_distribution == "Ubuntu"
        - ansible_distribution_major_version | int >= 20
        - ansible_memtotal_mb >= 2048
        - ansible_default_ipv6 is defined
\`\`\`

### 📖 gather_facts: false — cuándo acelerar

Recopilar facts toma ~1-2 segundos por host. En playbooks de 500 hosts y sin necesidad de facts, son 10+ minutos desperdiciados:

\`\`\`yaml
---
# Playbook de solo paquetes — no necesita facts del SO
- name: Actualizar paquetes de seguridad
  hosts: all
  become: true
  gather_facts: false     # acelera el playbook

  tasks:
    - name: Actualizar todos los paquetes de seguridad (Debian)
      ansible.builtin.apt:
        upgrade: dist
        update_cache: true
      # Aquí SÍ necesitaríamos saber el OS — pero si todos son Debian, no hace falta gather_facts

# Facts parciales: solo recopilar lo necesario
- name: Play con facts mínimos
  hosts: webservers
  gather_facts: true
  gather_subset:
    - 'network'        # solo facts de red
    - '!hardware'      # excluir facts de hardware (lento)
    - '!virtual'       # excluir detección de virtualización
\`\`\`

### 📖 set_fact y vars_files

\`\`\`yaml
- name: Calcular variables derivadas con set_fact
  hosts: webservers
  become: true

  tasks:
    - name: Calcular directorio de logs basado en hostname
      ansible.builtin.set_fact:
        app_log_dir: "/var/log/{{ ansible_hostname }}/app"
        workers_count: "{{ ansible_processor_vcpus * 2 }}"
        is_primary: "{{ inventory_hostname == groups['webservers'][0] }}"

    - name: Usar los facts calculados
      ansible.builtin.file:
        path: "{{ app_log_dir }}"
        state: directory
        mode: '0755'

    - name: Debug de facts calculados
      ansible.builtin.debug:
        msg:
          - "Log dir: {{ app_log_dir }}"
          - "Workers: {{ workers_count }}"
          - "¿Es primario?: {{ is_primary }}"

# vars_files: cargar variables desde archivo YAML externo
- name: Play con vars_files
  hosts: databases
  vars_files:
    - vars/common.yml
    - vars/database.yml
    - "vars/{{ ansible_distribution | lower }}.yml"  # dinámico por OS

# vars_prompt: solicitar variable al operador en tiempo de ejecución
- name: Despliegue interactivo
  hosts: webservers
  vars_prompt:
    - name: app_version
      prompt: "Versión a desplegar (ej: 2.1.0)"
      private: false
      default: "latest"
    - name: db_password
      prompt: "Contraseña de base de datos"
      private: true      # no mostrar en pantalla al escribir
\`\`\`

### 📖 Variables especiales y magic variables

\`\`\`yaml
# Variables especiales siempre disponibles:
# inventory_hostname     → nombre del host como aparece en el inventario
# inventory_hostname_short → solo el nombre corto (sin dominio)
# ansible_play_hosts     → lista de hosts activos en el play actual
# ansible_play_batch     → hosts del batch actual (con serial:)
# groups                 → diccionario de todos los grupos del inventario
# group_names            → lista de grupos a los que pertenece el host actual
# hostvars               → variables de todos los hosts
# playbook_dir           → directorio donde está el playbook
# role_path              → directorio del rol actual

- name: Mostrar información del host
  ansible.builtin.debug:
    msg:
      - "Host: {{ inventory_hostname }}"
      - "Grupos: {{ group_names | join(', ') }}"
      - "Hosts en este play: {{ ansible_play_hosts | length }}"
      - "Directorio del playbook: {{ playbook_dir }}"

- name: Tarea solo para el host primario de cada grupo
  ansible.builtin.command: /opt/app/promote-primary.sh
  when: inventory_hostname == groups[group_names[0]][0]
\`\`\`

### 📋 Lo que debes recordar

* La precedencia de variables es: defaults < group_vars < host_vars < play vars < set_fact < extra-vars.
* Los **ansible_facts** incluyen OS, versión, memoria, CPUs, red — imprescindibles para playbooks multi-distro.
* **gather_facts: false** ahorra tiempo cuando no necesitas facts; usa \`gather_subset\` para facts parciales.
* **set_fact** crea variables derivadas en tiempo de ejecución; persisten para el resto del play.
* **hostvars** y **groups** dan acceso cross-host a variables de cualquier nodo del inventario.

### 🧪 Autoevaluación

1. Tienes \`nginx_port: 80\` en \`group_vars/webservers.yml\` y \`nginx_port: 8080\` en \`host_vars/web-01.yml\`. Si además ejecutas \`ansible-playbook -e "nginx_port=9090"\`, ¿qué valor tiene \`nginx_port\` en web-01?
2. ¿Qué fact usarías para diferenciar entre Rocky Linux 9 y AlmaLinux 9, y cuál para tratar a ambos igual como familia RedHat?
3. ¿Por qué \`workers_count: "{{ ansible_processor_vcpus * 2 }}"\` en \`set_fact\` resulta en un string en lugar de un entero, y cómo lo conviertes a entero en un \`when\`?

---

1. El valor es \`9090\`. La extra-var (pasada con \`-e\`) tiene la mayor precedencia en toda la jerarquía de variables de Ansible, superando tanto a \`host_vars\` como a \`group_vars\` y cualquier variable definida en el playbook.
2. Para diferenciarlos: \`ansible_distribution\` devuelve \`"Rocky"\` o \`"AlmaLinux"\` respectivamente. Para tratarlos igual: \`ansible_os_family\` devuelve \`"RedHat"\` en ambos casos, así como en CentOS, RHEL y Fedora — es el fact correcto para lógica agnóstica de distribución dentro de la familia Red Hat.
3. Jinja2 evalúa la expresión pero el resultado de \`set_fact\` es siempre un string (tipo YAML string) a menos que se fuerze la conversión. En un condicional \`when\` puedes convertirlo con el filtro \`| int\`: \`when: workers_count | int > 4\`. Alternativamente, en Python moderno de Ansible, las expresiones matemáticas dentro de \`set_fact\` pueden retornar enteros directamente si no hay comillas adicionales, pero es más seguro usar \`| int\` explícitamente.
`

export default content
