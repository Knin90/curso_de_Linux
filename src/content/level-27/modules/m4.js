const content = `
## Módulo 4 — Loops, filtros y módulos avanzados

### 🎯 Objetivos de aprendizaje

* Usar \`loop\` para iterar sobre listas y diccionarios sin repetir tasks.
* Capturar resultados de loops con \`register\` e iterar sobre ellos.
* Controlar la presentación de loops con \`loop_control\`.
* Aplicar módulos avanzados: \`blockinfile\`, \`lineinfile\`, \`uri\`, \`wait_for\`, \`assert\`.
* Modularizar playbooks con \`include_tasks\` e \`import_tasks\`.

### ❓ El problema real

Necesitas crear 10 usuarios del sistema, cada uno con su directorio home, su clave SSH y permisos específicos. Sin loops escribirías 10 veces la misma task con datos diferentes — 300 líneas de YAML redundante que divergen al primer error. Con \`loop\` son 30 líneas que tratan todos los usuarios de forma idéntica y consistente.

### 📖 loop: iteración sobre listas

\`\`\`yaml
---
- name: Gestión de usuarios y recursos del sistema
  hosts: all
  become: true

  vars:
    app_users:
      - name: deploy
        uid: 2001
        groups: [docker, sudo]
        shell: /bin/bash
      - name: monitor
        uid: 2002
        groups: [systemd-journal]
        shell: /usr/sbin/nologin
      - name: backup
        uid: 2003
        groups: [tape]
        shell: /usr/sbin/nologin

    required_packages:
      - nginx
      - python3-pip
      - git
      - htop
      - tmux

  tasks:
    # Loop simple sobre lista de strings
    - name: Instalar paquetes requeridos
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop: "{{ required_packages }}"

    # Loop sobre lista de diccionarios
    - name: Crear usuarios del sistema
      ansible.builtin.user:
        name: "{{ item.name }}"
        uid: "{{ item.uid }}"
        groups: "{{ item.groups }}"
        append: true
        shell: "{{ item.shell }}"
        create_home: true
      loop: "{{ app_users }}"

    # Loop con dict2items: iterar sobre un diccionario
    - name: Crear directorios de configuración por servicio
      ansible.builtin.file:
        path: "/etc/{{ item.key }}"
        state: directory
        mode: "{{ item.value }}"
      loop: "{{ service_dirs | dict2items }}"
      vars:
        service_dirs:
          nginx: '0755'
          app: '0750'
          secrets: '0700'
\`\`\`

### 📖 register con loops: capturar todos los resultados

\`\`\`yaml
    # Verificar estado de múltiples servicios
    - name: Verificar servicios críticos
      ansible.builtin.command: systemctl is-active "{{ item }}"
      register: service_status
      changed_when: false
      ignore_errors: true
      loop:
        - nginx
        - postgresql
        - redis

    # El resultado es una lista en service_status.results
    - name: Mostrar servicios caídos
      ansible.builtin.debug:
        msg: "ALERTA: {{ item.item }} está {{ item.stdout }}"
      loop: "{{ service_status.results }}"
      when: item.stdout != "active"

    # Recopilar solo los resultados fallidos
    - name: Fallar si algún servicio crítico está caído
      ansible.builtin.fail:
        msg: "Servicios caídos: {{ service_status.results | selectattr('stdout', 'ne', 'active') | map(attribute='item') | list | join(', ') }}"
      when: service_status.results | selectattr('stdout', 'ne', 'active') | list | length > 0
\`\`\`

### 📖 loop_control: presentación y control del loop

\`\`\`yaml
    # label: mostrar algo más legible que el objeto completo
    - name: Configurar virtual hosts de nginx
      ansible.builtin.template:
        src: "templates/vhost.conf.j2"
        dest: "/etc/nginx/sites-available/{{ item.domain }}.conf"
      loop: "{{ virtual_hosts }}"
      loop_control:
        label: "{{ item.domain }}"   # en lugar de mostrar el dict completo
      vars:
        virtual_hosts:
          - domain: api.ejemplo.com
            port: 8080
            backend: "localhost:3000"
          - domain: admin.ejemplo.com
            port: 8081
            backend: "localhost:3001"

    # index_var: acceder al índice de la iteración actual
    - name: Crear configuraciones con índice
      ansible.builtin.copy:
        content: "upstream_id={{ item_index }}\nhost={{ item }}\n"
        dest: "/etc/app/upstream-{{ item_index }}.conf"
      loop: "{{ groups['webservers'] }}"
      loop_control:
        index_var: item_index
        label: "upstream-{{ item_index }}: {{ item }}"

    # pause: añadir pausa entre iteraciones
    - name: Reiniciar servicios uno a uno con pausa
      ansible.builtin.service:
        name: "{{ item }}"
        state: restarted
      loop:
        - worker-1
        - worker-2
        - worker-3
      loop_control:
        pause: 5    # esperar 5 segundos entre cada iteración
\`\`\`

### 📖 Módulos de edición de archivos: lineinfile y blockinfile

\`\`\`yaml
    # lineinfile: asegurar que una línea existe (o no existe) en un archivo
    - name: Configurar parámetros del kernel en sysctl.conf
      ansible.builtin.lineinfile:
        path: /etc/sysctl.conf
        line: "{{ item.key }} = {{ item.value }}"
        regexp: "^{{ item.key }}"   # patrón para buscar la línea existente
        state: present
      loop:
        - { key: 'net.ipv4.ip_forward', value: '1' }
        - { key: 'vm.swappiness', value: '10' }
        - { key: 'net.core.somaxconn', value: '65535' }
      notify: Aplicar parámetros sysctl

    # lineinfile con backrefs: modificar parte de una línea con regex
    - name: Aumentar límite de conexiones en nginx.conf
      ansible.builtin.lineinfile:
        path: /etc/nginx/nginx.conf
        regexp: '^(\s*)worker_connections\s+\d+;'
        line: '\\1worker_connections 4096;'
        backrefs: true              # usar grupos de captura del regexp

    # blockinfile: insertar un bloque completo de texto
    - name: Agregar bloque de configuración a SSH
      ansible.builtin.blockinfile:
        path: /etc/ssh/sshd_config
        marker: "# {mark} ANSIBLE MANAGED BLOCK — hardening"
        block: |
          Protocol 2
          PermitRootLogin no
          PasswordAuthentication no
          MaxAuthTries 3
          ClientAliveInterval 300
          ClientAliveCountMax 2
        insertafter: EOF
        backup: true
      notify: Reiniciar sshd

    # replace: reemplazar todas las ocurrencias de un patrón
    - name: Actualizar versión de la imagen en docker-compose
      ansible.builtin.replace:
        path: /opt/app/docker-compose.yml
        regexp: 'image: myapp:.*'
        replace: "image: myapp:{{ app_version }}"
\`\`\`

### 📖 Módulos de red y espera: uri y wait_for

\`\`\`yaml
    # uri: hacer peticiones HTTP/HTTPS
    - name: Verificar que la API responde 200
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}/api/health"
        method: GET
        status_code: 200
        timeout: 10
        return_content: true
      register: health_check
      retries: 5
      delay: 10
      until: health_check.status == 200

    # uri: enviar datos con autenticación
    - name: Crear usuario en API interna
      ansible.builtin.uri:
        url: "https://api.interno.ejemplo.com/users"
        method: POST
        headers:
          Authorization: "Bearer {{ vault_api_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          username: "{{ item }}"
          role: "readonly"
        status_code: [200, 201]
      loop: "{{ new_users }}"

    # wait_for: esperar a que un puerto esté disponible
    - name: Esperar a que PostgreSQL acepte conexiones
      ansible.builtin.wait_for:
        host: "{{ ansible_default_ipv4.address }}"
        port: 5432
        delay: 5            # esperar 5s antes de empezar a verificar
        timeout: 60         # tiempo máximo de espera
        state: started      # started | stopped | drained | absent | present

    # wait_for_connection: esperar a que el nodo sea accesible por SSH
    - name: Esperar a que el servidor reiniciado vuelva online
      ansible.builtin.wait_for_connection:
        delay: 10
        timeout: 300
      # Útil después de un reboot:
      # - ansible.builtin.reboot:
      #     reboot_timeout: 300
\`\`\`

### 📖 Control de flujo: assert, debug, pause

\`\`\`yaml
    # assert: validar condiciones y fallar con mensaje claro
    - name: Verificar prerrequisitos del despliegue
      ansible.builtin.assert:
        that:
          - ansible_memtotal_mb >= 2048
          - ansible_processor_vcpus >= 2
          - app_version is defined
          - app_version | regex_search('^\\d+\\.\\d+\\.\\d+\$')
        fail_msg: "Prerrequisitos no cumplidos: RAM={{ ansible_memtotal_mb }}MB, CPUs={{ ansible_processor_vcpus }}, version={{ app_version | default('NO DEFINIDA') }}"
        success_msg: "Prerrequisitos verificados correctamente"

    # debug: imprimir información durante la ejecución
    - name: Mostrar configuración de despliegue
      ansible.builtin.debug:
        msg:
          - "Host: {{ inventory_hostname }}"
          - "Versión: {{ app_version }}"
          - "Entorno: {{ app_env }}"
          - "Workers: {{ ansible_processor_vcpus * 2 }}"
        verbosity: 1    # solo mostrar con -v o más

    # pause: pausar la ejecución para intervención manual
    - name: Pausa de verificación antes de reiniciar servicios
      ansible.builtin.pause:
        prompt: "Verifica que el balanceador sacó este nodo. Presiona Enter para continuar o Ctrl+C para cancelar"

    - name: Pausa automática de 30 segundos
      ansible.builtin.pause:
        seconds: 30
        echo: false
\`\`\`

### 📖 include_tasks e import_tasks

\`\`\`yaml
# La diferencia clave:
# import_tasks → carga en tiempo de PARSEO (estático, los tags se propagan)
# include_tasks → carga en tiempo de EJECUCIÓN (dinámico, permite variables en el nombre)

# playbook principal:
- name: Despliegue completo
  hosts: webservers
  tasks:
    # import: siempre se carga, los tags del import aplican a las subtasks
    - name: Importar tasks de preparación del sistema
      ansible.builtin.import_tasks: tasks/prepare-system.yml

    # include: carga dinámicamente, el nombre puede contener variables
    - name: Incluir tasks específicas del OS
      ansible.builtin.include_tasks: "tasks/setup-{{ ansible_os_family | lower }}.yml"

    # include con variables adicionales
    - name: Desplegar cada componente
      ansible.builtin.include_tasks: tasks/deploy-component.yml
      loop: "{{ app_components }}"
      loop_control:
        loop_var: component    # nombre de la variable (evitar conflicto con 'item')

# tasks/deploy-component.yml
# - name: Descargar {{ component.name }} versión {{ component.version }}
#   ansible.builtin.get_url:
#     url: "{{ component.url }}"
#     dest: "/opt/{{ component.name }}"
\`\`\`

### 📋 Lo que debes recordar

* \`loop\` reemplaza \`with_items\` (legacy) — úsalo siempre en código nuevo.
* \`register\` con loops guarda todos los resultados en \`variable.results\` como lista.
* \`loop_control.label\` evita logs ilegibles cuando el \`item\` es un dict complejo.
* \`lineinfile\` para una línea, \`blockinfile\` para bloques, \`replace\` para patrones globales.
* \`uri\` + \`retries\` + \`until\` es el patrón estándar para verificar que un servicio levantó.
* \`import_tasks\` es estático (tiempo de parseo), \`include_tasks\` es dinámico (tiempo de ejecución).

### 🧪 Autoevaluación

1. Tienes un \`register: resultado\` sobre un loop de 5 items. ¿Cómo accedes al stdout del tercer item?
2. ¿Cuál es la diferencia entre \`with_items\` y \`loop\` en la práctica, y por qué se prefiere \`loop\` en Ansible moderno?
3. ¿Por qué \`import_tasks\` propaga tags automáticamente a sus subtasks pero \`include_tasks\` no?

---

1. Con \`resultado.results[2].stdout\`. Los resultados de loops se almacenan en la clave \`results\` como lista ordenada en el mismo orden del loop original. El índice comienza en 0, así que el tercer item está en \`[2]\`.
2. En la práctica, para listas simples son equivalentes. La diferencia es que \`with_items\` aplana automáticamente listas anidadas (una lista de listas se convierte en una sola lista plana), mientras que \`loop\` no aplana — pasa los sublistas como elementos. \`loop\` se prefiere porque es más predecible, soporta plugins de lookup directamente, y es el estándar oficial desde Ansible 2.5 — \`with_items\` existe por compatibilidad pero ya no se recomienda en código nuevo.
3. \`import_tasks\` es estático: Ansible lo procesa en tiempo de parseo, antes de la ejecución, como si el contenido del archivo estuviera incrustado directamente en el playbook. Por eso los tags del \`import_tasks\` se propagan: Ansible "ve" todas las tasks antes de empezar. \`include_tasks\` es dinámico: no se carga hasta que se llega a esa línea durante la ejecución, y las condiciones (\`when\`, variables) se evalúan en ese momento. El costo es que los tags no pueden propagarse a tasks que Ansible aún no ha leído.
`

export default content
