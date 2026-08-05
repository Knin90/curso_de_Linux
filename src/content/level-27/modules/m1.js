const content = `
## Módulo 1 — Arquitectura Ansible: agentless, SSH e inventario

### 🎯 Objetivos de aprendizaje

* Comprender el modelo agentless de Ansible y por qué elimina la necesidad de software en los nodos gestionados.
* Distinguir el rol del control node frente a los managed nodes.
* Crear y organizar inventarios en formato INI y YAML con grupos y variables.
* Configurar ansible.cfg para un proyecto real.
* Ejecutar comandos ad-hoc para verificar conectividad y recopilar información.

### ❓ El problema real

Gestionas 40 servidores: 12 web, 8 de base de datos, 10 de caché y 10 de workers. Cada vez que hay un cambio de configuración, SSH a cada uno manualmente o mantienes scripts de shell que divergen entre equipos. Un script que funciona en un servidor falla en otro por diferencias de OS. No hay historial de qué cambió, cuándo ni quién. Ansible resuelve exactamente esto: infraestructura como código, reproducible, auditada y sin agente.

### 📖 Arquitectura agentless: cómo funciona

Ansible no instala ningún daemon en los servidores gestionados. Solo necesita:

- **Control node**: cualquier máquina Linux con Python 3 y Ansible instalado.
- **Managed nodes**: acceso SSH y Python ≥ 2.7 (o Python 3).

\`\`\`text
┌─────────────────────────────────────────────────────┐
│                   CONTROL NODE                      │
│  ansible/ansible-playbook CLI                       │
│  inventario + playbooks + roles                     │
└──────────────────┬──────────────────────────────────┘
                   │ SSH (puerto 22 por defecto)
        ┌──────────┴──────────┐
        ▼                     ▼
┌───────────────┐    ┌───────────────┐
│  web-01       │    │  db-01        │
│  (managed)    │    │  (managed)    │
│  Python 3     │    │  Python 3     │
│  Sin agente   │    │  Sin agente   │
└───────────────┘    └───────────────┘
\`\`\`

El flujo de ejecución:
1. Ansible lee el inventario y los playbooks en el control node.
2. Se conecta vía SSH a cada managed node.
3. Copia módulos Python temporales al nodo remoto (en \`/tmp\`).
4. Ejecuta los módulos remotamente.
5. Recopila los resultados y borra los archivos temporales.

### 📖 Instalación del control node

\`\`\`bash
# Ubuntu/Debian
apt update && apt install -y ansible

# RHEL/CentOS/Rocky
dnf install -y epel-release && dnf install -y ansible

# Pip (versión más reciente)
pip3 install ansible

# Verificar versión
ansible --version
# ansible [core 2.17.0]
#   config file = /etc/ansible/ansible.cfg
#   python version = 3.12.3
#   jinja version = 3.1.4

# Verificar conectividad con un nodo
ansible all -i "192.168.1.10," -m ping -u ubuntu --private-key ~/.ssh/id_ed25519
\`\`\`

### 📖 El inventario: inventariando la infraestructura

El inventario define qué nodos gestiona Ansible. Formato INI (el más común):

\`\`\`ini
# /etc/ansible/hosts  o  ./inventory/hosts

# Nodo individual
bastion.ejemplo.com

# Grupo de servidores web
[webservers]
web-01.ejemplo.com
web-02.ejemplo.com
web-03.ejemplo.com  ansible_port=2222

# Grupo de bases de datos con variables por host
[databases]
db-01.ejemplo.com  ansible_user=postgres
db-02.ejemplo.com  ansible_user=postgres  ansible_become=true

# Grupo de caché
[cache]
redis-01.ejemplo.com
redis-02.ejemplo.com

# Grupo de grupos (meta-grupo)
[production:children]
webservers
databases
cache

# Variables para todo el grupo webservers
[webservers:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/prod_rsa
http_port=80
\`\`\`

El mismo inventario en formato YAML (más expresivo para estructuras complejas):

\`\`\`yaml
# inventory/hosts.yml
all:
  children:
    webservers:
      hosts:
        web-01.ejemplo.com:
          ansible_port: 22
        web-02.ejemplo.com:
        web-03.ejemplo.com:
          ansible_port: 2222
      vars:
        ansible_user: ubuntu
        http_port: 80

    databases:
      hosts:
        db-01.ejemplo.com:
          ansible_user: postgres
        db-02.ejemplo.com:
          ansible_user: postgres
      vars:
        ansible_become: true
        db_port: 5432

    cache:
      hosts:
        redis-01.ejemplo.com:
        redis-02.ejemplo.com:
      vars:
        redis_port: 6379

    production:
      children:
        webservers:
        databases:
        cache:
\`\`\`

### 📖 group_vars y host_vars

En lugar de definir variables en el inventario, el estándar es usar directorios:

\`\`\`bash
# Estructura de proyecto recomendada
proyecto/
├── inventory/
│   ├── hosts.yml          # solo hostnames y grupos
│   ├── group_vars/
│   │   ├── all.yml        # variables para TODOS los hosts
│   │   ├── webservers.yml # variables solo para webservers
│   │   └── databases.yml  # variables solo para databases
│   └── host_vars/
│       ├── web-01.ejemplo.com.yml   # variables específicas del host
│       └── db-01.ejemplo.com.yml
\`\`\`

\`\`\`yaml
# inventory/group_vars/all.yml
ansible_user: ubuntu
ansible_ssh_private_key_file: ~/.ssh/id_ed25519
ntp_server: time.cloudflare.com
timezone: America/Bogota

# inventory/group_vars/webservers.yml
nginx_worker_processes: auto
nginx_worker_connections: 1024
app_env: production

# inventory/host_vars/web-01.ejemplo.com.yml
nginx_server_name: web-01.ejemplo.com
backup_priority: primary
\`\`\`

### 📖 ansible.cfg: configuración del proyecto

\`\`\`ini
# ansible.cfg (en el directorio raíz del proyecto)
[defaults]
inventory          = ./inventory/hosts.yml
remote_user        = ubuntu
private_key_file   = ~/.ssh/id_ed25519
host_key_checking  = False        # desactivar en entornos de lab
forks              = 10           # paralelismo (nodos simultáneos)
timeout            = 30
retry_files_enabled = False
stdout_callback    = yaml         # salida más legible
callbacks_enabled  = timer, profile_tasks

[privilege_escalation]
become             = True
become_method      = sudo
become_user        = root
become_ask_pass    = False

[ssh_connection]
ssh_args           = -C -o ControlMaster=auto -o ControlPersist=60s
pipelining         = True         # mejora rendimiento significativamente
\`\`\`

### 📖 Comandos ad-hoc

Los comandos ad-hoc ejecutan un módulo directamente sin escribir un playbook:

\`\`\`bash
# Sintaxis: ansible <patrón> -m <módulo> -a "<argumentos>"

# Verificar conectividad (módulo ping)
ansible all -m ping
ansible webservers -m ping
ansible 'web-01,web-02' -m ping

# Ejecutar comando remoto
ansible webservers -m command -a "uptime"
ansible databases -m command -a "df -h /var/lib/mysql"

# shell permite pipes y variables de entorno
ansible webservers -m shell -a "ps aux | grep nginx | wc -l"

# Recopilar facts de un nodo
ansible web-01.ejemplo.com -m setup
ansible web-01.ejemplo.com -m setup -a "filter=ansible_memory_mb"

# Copiar un archivo
ansible webservers -m copy -a "src=/tmp/config.conf dest=/etc/app/config.conf mode=0644"

# Instalar paquete (con become)
ansible webservers -m apt -a "name=htop state=present" --become

# Reiniciar servicio
ansible webservers -m service -a "name=nginx state=restarted" --become

# Listar hosts que coinciden con un patrón (sin ejecutar nada)
ansible webservers --list-hosts

# Ejecutar solo en un subset de hosts
ansible webservers -m ping --limit web-01.ejemplo.com
\`\`\`

### 📖 Tipos de conexión y privilege escalation

\`\`\`yaml
# En playbook o inventario
# Tipos de conexión:
ansible_connection: ssh      # default — SSH estándar
ansible_connection: local    # ejecutar en el control node mismo
ansible_connection: docker   # conexión a contenedor Docker

# Privilege escalation:
become: yes                  # activar sudo
become_user: root            # usuario destino (default: root)
become_method: sudo          # método: sudo, su, pbrun, pfexec, doas
become_flags: '-H -S -n'     # flags adicionales para sudo

# En ansible.cfg para todos los playbooks:
# [privilege_escalation]
# become = True

# Por host en inventario:
db-01.ejemplo.com ansible_become=true ansible_become_user=postgres
\`\`\`

### 📋 Lo que debes recordar

* Ansible es **agentless**: solo necesita SSH y Python en los nodos gestionados.
* El **inventario** define los hosts; **group_vars** y **host_vars** organizan las variables.
* **ansible.cfg** configura comportamiento global: usuario, clave SSH, paralelismo, callbacks.
* Los **comandos ad-hoc** ejecutan módulos directamente sin playbook — ideales para tareas únicas y verificación.
* **become: yes** activa escalada de privilegios vía sudo sin necesidad de contraseñas en texto plano.

### 🧪 Autoevaluación

1. ¿Por qué Ansible no necesita instalar un agente en los servidores gestionados, y qué ventaja operativa tiene eso?
2. ¿Cuál es la diferencia entre definir variables en \`[webservers:vars]\` dentro del inventario INI versus en \`group_vars/webservers.yml\`?
3. Si tienes 200 servidores y quieres ejecutar \`ansible all -m ping\`, ¿qué parámetro de ansible.cfg controla cuántos se contactan simultáneamente?

---

1. Ansible no necesita agente porque usa SSH (protocolo estándar presente en todo servidor Linux) y Python (ya instalado en la mayoría de distribuciones). La ventaja es cero overhead de gestión: no hay daemons que actualizar, no hay puertos adicionales que abrir en el firewall, y no hay superficie de ataque adicional en cada nodo.
2. Las variables en \`[webservers:vars]\` están dentro del archivo de inventario, lo que mezcla topología de red con configuración de aplicación y dificulta la legibilidad en inventarios grandes. \`group_vars/webservers.yml\` es un archivo separado, versionable independientemente, más legible, y permite usar formato YAML completo (anclas, referencias, etc.). El estándar de producción es siempre usar \`group_vars/\` y \`host_vars/\`.
3. El parámetro \`forks\` en la sección \`[defaults]\` de ansible.cfg. Por defecto es 5. Para 200 servidores, un valor entre 20 y 50 es razonable dependiendo de los recursos del control node y el ancho de banda de red.
`

export default content
