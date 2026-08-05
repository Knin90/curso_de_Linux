const content = `
## Módulo 6 — Plantillas Jinja2: configuración dinámica

### 🎯 Objetivos de aprendizaje

* Distinguir entre el módulo \`template\` y el módulo \`copy\`, y saber cuándo usar cada uno.
* Dominar la sintaxis básica de Jinja2: variables, filtros, condicionales y bucles.
* Aplicar control de espacios en blanco para generar archivos de configuración limpios.
* Usar \`ansible_facts\` dentro de plantillas para adaptar la configuración al host destino.
* Depurar plantillas con \`--diff\` para ver el resultado renderizado antes de aplicarlo.

---

### ❓ El problema real

Tu equipo gestiona 40 servidores nginx. Cada uno tiene un número diferente de CPUs, distintas IPs de backend y nombres de dominio únicos. Mantener 40 archivos \`nginx.conf\` manualmente es inviable: cuando cambia un parámetro global, hay que editarlos todos. ¿Cómo generar archivos de configuración correctos para cada host de forma automática?

---

### 📖 Módulo \`template\` vs módulo \`copy\`

Ansible ofrece dos módulos para transferir archivos a los hosts remotos:

| Módulo   | Procesa Jinja2 | Uso típico                              |
|----------|----------------|-----------------------------------------|
| \`copy\`   | No             | Archivos estáticos, scripts binarios    |
| \`template\` | Sí           | Archivos de configuración dinámicos     |

El módulo \`template\` lee el archivo de origen (en el controlador), lo renderiza con Jinja2 sustituyendo variables y expresiones, y luego transfiere el resultado al host remoto.

\`\`\`yaml
# Usando copy — el archivo se transfiere tal cual
- name: copiar script de arranque
  copy:
    src: files/startup.sh
    dest: /usr/local/bin/startup.sh
    mode: '0755'

# Usando template — Jinja2 se evalúa antes de transferir
- name: generar configuración de nginx
  template:
    src: templates/nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
  notify: reload nginx
\`\`\`

**Convención de extensión:** los archivos de plantilla usan la extensión \`.j2\` por convención. No es un requisito técnico de Ansible, pero facilita la identificación en el repositorio y evita confundir plantillas con archivos estáticos.

---

### 📖 Sintaxis básica de Jinja2

#### Variables

La sintaxis \`{{ variable }}\` evalúa y sustituye cualquier variable disponible en el contexto del play:

\`\`\`jinja2
# Variables del inventario y del play
server_name {{ inventory_hostname }};
hostname     {{ ansible_hostname }};

# Variables definidas en vars o group_vars
listen {{ http_port | default(80) }};
\`\`\`

#### Filtros

Los filtros transforman valores. Se encadenan con el operador \`|\`:

\`\`\`jinja2
# Convertir a mayúsculas
{{ environment | upper }}              → PRODUCTION

# Unir una lista con separador
{{ backends | join(', ') }}            → srv1, srv2, srv3

# Valor por defecto si la variable no está definida
{{ log_level | default('warning') }}   → warning

# Extraer el nombre base de una ruta
{{ config_path | basename }}           → nginx.conf

# Sustitución con expresión regular
{{ service_name | regex_replace('-', '_') }}

# Filtrar elementos de una lista por atributo
{% set activos = servers | selectattr('active', 'equalto', true) | list %}
\`\`\`

#### Filtros de uso frecuente en infraestructura

\`\`\`jinja2
{{ ansible_memtotal_mb | int // 4 }}      # Memoria dividida entre 4
{{ items | length }}                       # Cantidad de elementos
{{ path | dirname }}                       # Directorio padre
{{ value | string | trim }}                # Convertir y limpiar espacios
{{ lista | unique | sort }}                # Deduplicar y ordenar
{{ dict | dict2items }}                    # Convertir diccionario a lista de pares
\`\`\`

---

### 📖 Condicionales

La sintaxis \`{% if %}...{% endif %}\` permite generar bloques de configuración según condiciones:

\`\`\`jinja2
# Configuración específica por familia de sistema operativo
{% if ansible_os_family == 'Debian' %}
user www-data;
{% elif ansible_os_family == 'RedHat' %}
user nginx;
{% else %}
user nobody;
{% endif %}

# Activar SSL solo si el certificado existe
{% if ssl_enabled is defined and ssl_enabled %}
ssl_certificate     {{ ssl_cert_path }};
ssl_certificate_key {{ ssl_key_path }};
{% endif %}
\`\`\`

---

### 📖 Bucles

La sintaxis \`{% for %}...{% endfor %}\` itera listas, grupos del inventario o diccionarios:

\`\`\`jinja2
# Iterar sobre hosts de un grupo del inventario
upstream backend_pool {
{% for server in groups['webservers'] %}
    server {{ hostvars[server]['ansible_default_ipv4']['address'] }}:8080;
{% endfor %}
}

# Usar loop.index para numerar entradas
{% for item in config_items %}
{{ loop.index }}. {{ item.name }} = {{ item.value }}
{% endfor %}

# loop.first y loop.last para lógica de separadores
{% for db in databases %}
{{ db.name }}{% if not loop.last %},{% endif %}
{% endfor %}
\`\`\`

---

### 📖 Control de espacios en blanco

Por defecto Jinja2 conserva los saltos de línea alrededor de las etiquetas de bloque. El guion \`-\` elimina el espacio en blanco anterior o posterior:

\`\`\`jinja2
# Sin control — genera líneas en blanco no deseadas
{% for item in items %}
{{ item }}
{% endfor %}

# Con control — salida compacta
{%- for item in items %}
{{ item }}
{%- endfor %}
\`\`\`

---

### 📖 Ejemplos reales

#### nginx.conf.j2 — servidor web con upstream dinámico

\`\`\`jinja2
worker_processes {{ ansible_processor_vcpus }};
error_log /var/log/nginx/error.log {{ nginx_log_level | default('warn') }};

events {
    worker_connections {{ nginx_worker_connections | default(1024) }};
}

http {
    upstream app_backend {
{%- for backend in app_backends %}
        server {{ backend.host }}:{{ backend.port }} weight={{ backend.weight | default(1) }};
{%- endfor %}
    }

    server {
        listen {{ http_port | default(80) }};
        server_name {{ inventory_hostname }};

        location / {
            proxy_pass http://app_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
\`\`\`

#### /etc/hosts.j2 — generación automática de entradas

\`\`\`jinja2
127.0.0.1   localhost
::1         localhost

# Hosts gestionados por Ansible — no editar manualmente
{% for host in groups['all'] %}
{% if hostvars[host]['ansible_default_ipv4'] is defined %}
{{ hostvars[host]['ansible_default_ipv4']['address'] }}   {{ host }}
{% endif %}
{% endfor %}
\`\`\`

#### prometheus.yml.j2 — scrape_configs dinámico

\`\`\`jinja2
global:
  scrape_interval: {{ prometheus_scrape_interval | default('15s') }}
  evaluation_interval: 15s

scrape_configs:
{%- for target in monitoring_targets %}
  - job_name: '{{ target.name }}'
    static_configs:
      - targets:
{%- for host in target.hosts %}
          - '{{ host }}:{{ target.port }}'
{%- endfor %}
{%- endfor %}
\`\`\`

#### application.properties.j2 — configuración de aplicación Java

\`\`\`jinja2
# Base de datos — valores gestionados por Ansible Vault
spring.datasource.url=jdbc:mysql://{{ db_host }}:{{ db_port }}/{{ db_name }}
spring.datasource.username={{ db_user }}
spring.datasource.password={{ db_password }}

# Configuración del servidor
server.port={{ app_port | default(8080) }}
server.servlet.context-path={{ app_context_path | default('/') }}

# Logs
logging.level.root={{ log_level | default('INFO') }}
logging.file.name=/var/log/{{ app_name }}/application.log
\`\`\`

---

### 📖 ansible_facts en plantillas

Los facts recopilados por el módulo \`setup\` (ejecutado automáticamente al inicio del play) están disponibles en todas las plantillas:

\`\`\`jinja2
# IP principal del host
bind_address={{ ansible_default_ipv4.address }}

# Distribución y versión
# Sistema: {{ ansible_distribution }} {{ ansible_distribution_version }}

# Memoria total en MB — útil para calcular límites de JVM o caché
max_memory={{ (ansible_memtotal_mb * 0.75) | int }}m

# Número de CPUs para configurar workers
worker_threads={{ ansible_processor_vcpus }}
\`\`\`

---

### 📖 Depuración de plantillas con \`--diff\`

El flag \`--diff\` muestra exactamente qué cambiaría en el archivo destino antes y después del renderizado:

\`\`\`bash
ansible-playbook site.yml --diff --check
\`\`\`

Salida típica:

\`\`\`diff
TASK [nginx : generar configuración de nginx]
--- before: /etc/nginx/nginx.conf
+++ after: /tmp/ansible-template
@@ -1,3 +1,3 @@
 worker_processes 2;
-worker_connections 512;
+worker_connections 1024;
\`\`\`

Combinar \`--check\` con \`--diff\` permite revisar los cambios sin aplicarlos — indispensable antes de modificar configuraciones en producción.

---

### 📋 Lo que debes recordar

* \`template\` procesa Jinja2; \`copy\` transfiere el archivo sin modificarlo.
* \`{{ variable }}\` sustituye valores; \`{% %}\` ejecuta lógica (if, for).
* Los filtros transforman datos: \`default\`, \`upper\`, \`join\`, \`selectattr\`, \`regex_replace\`.
* \`{%- -%}\` elimina espacios en blanco adyacentes para generar archivos limpios.
* \`ansible_facts\` (CPU, memoria, IP, distribución) están disponibles directamente en las plantillas.
* \`groups['nombre']\` y \`hostvars[host]\` permiten generar configuraciones que referencian a otros hosts del inventario.
* Siempre validar con \`--check --diff\` antes de aplicar cambios en producción.

---

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia funcional entre el módulo \`copy\` y el módulo \`template\`?
2. Dado que \`backends = ['10.0.1.1', '10.0.1.2', '10.0.1.3']\`, ¿qué produce \`{{ backends | join(' ') }}\`?
3. ¿Cómo se elimina el espacio en blanco que Jinja2 genera antes de una etiqueta \`{% for %}\`?

---

1. \`copy\` transfiere el archivo tal cual sin procesar su contenido; \`template\` evalúa las expresiones Jinja2 del archivo fuente y transfiere el resultado renderizado.
2. Produce la cadena \`10.0.1.1 10.0.1.2 10.0.1.3\` (los elementos unidos por un espacio).
3. Usando el guion en la etiqueta de apertura: \`{%- for %}\`. El guion le indica a Jinja2 que elimine el espacio en blanco (incluido el salto de línea) que precede a esa etiqueta.
`

export default content
