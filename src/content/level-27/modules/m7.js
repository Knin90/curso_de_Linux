const content = `
## Módulo 7 — Handlers, Ansible Vault y buenas prácticas

### 🎯 Objetivos de aprendizaje

* Entender el ciclo de vida de los handlers y cuándo se ejecutan respecto a las tareas normales.
* Configurar notificaciones, escuchas múltiples y ejecución anticipada de handlers.
* Cifrar datos sensibles con Ansible Vault en archivos completos y cadenas individuales.
* Gestionar múltiples contraseñas de Vault mediante Vault IDs.
* Aplicar las convenciones de calidad más importantes en proyectos Ansible reales.

---

### ❓ El problema real

Has cambiado el archivo de configuración de nginx en 15 servidores. Necesitas recargar el servicio, pero solo en los hosts donde el archivo realmente cambió — no en todos. Además, el playbook contiene la contraseña de la base de datos en texto plano en \`group_vars/prod/vars.yml\`, visible para cualquier persona con acceso al repositorio. ¿Cómo resolver ambos problemas de forma correcta?

---

### 📖 Handlers: recarga condicional y diferida

Un handler es una tarea especial que solo se ejecuta cuando otra tarea la notifica explícitamente mediante \`notify\`. Si la tarea notificante no reportó cambio (\`ok\` en lugar de \`changed\`), el handler no se invoca.

**Comportamiento clave:**
- Los handlers se acumulan durante la ejecución del play y se ejecutan todos al final, no inmediatamente al recibir la notificación.
- Si múltiples tareas notifican al mismo handler, este se ejecuta una sola vez.
- El orden de ejecución es el orden en que están definidos, no el orden de notificación.

#### Definición y uso básico

\`\`\`yaml
# tasks/main.yml
- name: instalar configuración de nginx
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: reload nginx

- name: instalar virtual host
  template:
    src: site.conf.j2
    dest: /etc/nginx/sites-available/app.conf
  notify: reload nginx   # el handler se ejecutará una sola vez al final

# handlers/main.yml
handlers:
  - name: reload nginx
    service:
      name: nginx
      state: reloaded

  - name: restart postgresql
    service:
      name: postgresql
      state: restarted
\`\`\`

#### Escucha múltiple con \`listen\`

Un handler puede escuchar un nombre de evento genérico al que notifican varias tareas:

\`\`\`yaml
# tasks/main.yml
- name: actualizar configuración de aplicación
  template:
    src: app.conf.j2
    dest: /etc/app/config.conf
  notify: reiniciar servicios web

- name: actualizar certificado SSL
  copy:
    src: files/cert.pem
    dest: /etc/ssl/certs/app.pem
  notify: reiniciar servicios web

# handlers/main.yml
handlers:
  - name: recargar nginx
    listen: reiniciar servicios web
    service:
      name: nginx
      state: reloaded

  - name: recargar php-fpm
    listen: reiniciar servicios web
    service:
      name: php8.1-fpm
      state: reloaded
\`\`\`

#### Ejecución anticipada con \`flush_handlers\`

En ocasiones es necesario ejecutar los handlers antes del final del play — por ejemplo, si una tarea posterior depende de que el servicio ya esté recargado:

\`\`\`yaml
- name: desplegar configuración de base de datos
  template:
    src: postgresql.conf.j2
    dest: /etc/postgresql/14/main/postgresql.conf
  notify: restart postgresql

- name: forzar ejecución inmediata de handlers
  meta: flush_handlers

- name: crear esquema de base de datos
  postgresql_db:
    name: "{{ db_name }}"
    state: present
  # esta tarea requiere que postgresql ya esté reiniciado
\`\`\`

---

### 📖 Ansible Vault: cifrado de datos sensibles

Ansible Vault cifra archivos y cadenas de texto usando AES-256. Los archivos cifrados se almacenan en el repositorio de forma segura — son ilegibles sin la contraseña pero completamente funcionales para Ansible.

#### Cifrar un archivo completo

\`\`\`bash
# Cifrar un archivo existente
ansible-vault encrypt group_vars/prod/vault.yml

# El archivo pasa de texto plano a un bloque cifrado:
# $ANSIBLE_VAULT;1.1;AES256
# 66613361643566623338663430...

# Ver el contenido sin descifrar el archivo en disco
ansible-vault view group_vars/prod/vault.yml

# Editar el archivo (lo descifra temporalmente en memoria)
ansible-vault edit group_vars/prod/vault.yml

# Descifrar permanentemente
ansible-vault decrypt group_vars/prod/vault.yml

# Cambiar la contraseña de cifrado
ansible-vault rekey group_vars/prod/vault.yml
\`\`\`

#### Cadenas cifradas individuales con \`encrypt_string\`

En lugar de cifrar un archivo completo, puedes cifrar solo el valor de una variable:

\`\`\`bash
ansible-vault encrypt_string 'miPasswordSegura123' --name 'db_password'
\`\`\`

Salida que se pega directamente en el archivo YAML:

\`\`\`yaml
# group_vars/prod/vars.yml
db_host: db.prod.internal
db_name: myapp_prod
db_password: !vault |
  \$ANSIBLE_VAULT;1.1;AES256
  66613361643566623338663430393530623636326330623431383539303834363561616130
  6236616364383233613865376538323864303963653337650a343362333066396233306138
  ...
\`\`\`

#### Ejecutar playbooks con archivos Vault

\`\`\`bash
# Solicitar contraseña interactivamente
ansible-playbook site.yml --ask-vault-pass

# Leer contraseña desde un archivo (útil en CI/CD)
ansible-playbook site.yml --vault-password-file ~/.vault_pass

# Mediante variable de entorno
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass
ansible-playbook site.yml
\`\`\`

El archivo de contraseña debe tener permisos restrictivos y nunca commitearse al repositorio:

\`\`\`bash
chmod 600 ~/.vault_pass
echo '.vault_pass' >> .gitignore
\`\`\`

#### Vault IDs: múltiples contraseñas por entorno

Cuando manejas varios entornos con contraseñas distintas, los Vault IDs permiten identificar qué contraseña usar para cada archivo:

\`\`\`bash
# Cifrar con un Vault ID específico
ansible-vault encrypt --vault-id dev@~/.vault_dev group_vars/dev/vault.yml
ansible-vault encrypt --vault-id prod@~/.vault_prod group_vars/prod/vault.yml

# Ejecutar proporcionando ambas contraseñas
ansible-playbook site.yml \
  --vault-id dev@~/.vault_dev \
  --vault-id prod@~/.vault_prod
\`\`\`

---

### 📖 Convención de separación de archivos Vault

La práctica recomendada es separar variables normales de variables cifradas:

\`\`\`
group_vars/
├── all/
│   ├── vars.yml      ← variables sin cifrar (visible en git log)
│   └── vault.yml     ← solo variables cifradas (ilegible en git log)
├── dev/
│   ├── vars.yml
│   └── vault.yml
└── prod/
    ├── vars.yml
    └── vault.yml
\`\`\`

Convención de prefijo \`vault_\` para evitar confusión:

\`\`\`yaml
# group_vars/prod/vars.yml — sin cifrar
db_host: db.prod.internal
db_name: myapp
db_password: "{{ vault_db_password }}"   # referencia a variable del vault

# group_vars/prod/vault.yml — cifrado con ansible-vault
vault_db_password: !vault |
  \$ANSIBLE_VAULT;1.1;AES256
  ...
\`\`\`

---

### 📖 Buenas prácticas de calidad

#### Control de versiones y seguridad

\`\`\`bash
# Nunca commitear contraseñas en texto plano
git diff --cached | grep -i password   # revisar antes del commit

# .gitignore esencial para proyectos Ansible
*.retry
.vault_pass
*.vault_pass
inventory/hosts_local
\`\`\`

#### Verificación antes de producción

\`\`\`bash
# Dry-run con visualización de diferencias — siempre antes de producción
ansible-playbook site.yml --check --diff --limit prod

# Verificar sintaxis sin ejecutar
ansible-playbook site.yml --syntax-check

# Listar tareas que se ejecutarían
ansible-playbook site.yml --list-tasks
\`\`\`

#### Tags para ejecución selectiva

\`\`\`yaml
- name: instalar paquetes del sistema
  apt:
    name: "{{ system_packages }}"
    state: present
  tags:
    - packages
    - bootstrap

- name: desplegar configuración de nginx
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  tags:
    - config
    - nginx

# Tag especial 'never': solo se ejecuta si se solicita explícitamente
- name: resetear base de datos (destructivo)
  command: /usr/local/bin/reset_db.sh
  tags:
    - never
    - reset
\`\`\`

\`\`\`bash
# Ejecutar solo tareas con tag 'config'
ansible-playbook site.yml --tags config

# Excluir tareas con tag 'packages'
ansible-playbook site.yml --skip-tags packages
\`\`\`

#### Calidad de playbooks con ansible-lint

\`\`\`bash
# Instalar
pip install ansible-lint

# Verificar el proyecto actual
ansible-lint

# Reglas comunes que detecta:
# - Uso de 'command' cuando existe un módulo equivalente
# - Tareas sin nombre (name)
# - Permisos de archivos en formato octal sin comillas
# - Handlers que no son realmente handlers
\`\`\`

#### Testing de roles con Molecule

\`\`\`bash
# Instalar Molecule con driver Docker
pip install molecule molecule-docker

# Inicializar escenario de prueba en un rol existente
molecule init scenario --driver-name docker

# Ciclo completo de prueba
molecule test   # create → prepare → converge → verify → destroy

# Solo aplicar el rol (sin destruir el contenedor)
molecule converge
\`\`\`

#### Fijar versión de Ansible en el proyecto

\`\`\`text
# requirements.txt
ansible==9.1.0
ansible-lint==24.2.0
molecule==24.2.1
molecule-docker==2.1.0
\`\`\`

\`\`\`bash
pip install -r requirements.txt
\`\`\`

---

### 📋 Lo que debes recordar

* Los handlers solo se ejecutan si la tarea notificante reportó \`changed\`, y se acumulan hasta el final del play.
* \`listen\` permite que un handler sea notificado por múltiples tareas con un nombre de evento genérico.
* \`meta: flush_handlers\` fuerza la ejecución inmediata de handlers pendientes dentro de un play.
* Ansible Vault cifra con AES-256; \`encrypt_string\` cifra valores individuales que se embeben directamente en YAML.
* Nunca usar \`--ask-vault-pass\` en CI/CD; preferir \`--vault-password-file\` con permisos \`600\`.
* Vault IDs permiten gestionar múltiples contraseñas para diferentes entornos en el mismo playbook.
* Convención \`vault_\` para nombrar variables cifradas y separar \`vars.yml\` de \`vault.yml\` por grupo.
* Siempre validar con \`--check --diff\` y \`ansible-lint\` antes de aplicar cambios en producción.

---

### 🧪 Autoevaluación

1. Si dos tareas diferentes notifican al mismo handler durante un play, ¿cuántas veces se ejecuta ese handler?
2. ¿Cuál es la diferencia entre \`ansible-vault encrypt\` y \`ansible-vault encrypt_string\`?
3. ¿Para qué sirve el tag especial \`never\` en Ansible y cuándo es útil?

---

1. Una sola vez. Ansible deduplica las notificaciones y ejecuta cada handler como máximo una vez al final del play, independientemente de cuántas tareas lo hayan notificado.
2. \`encrypt\` cifra un archivo completo en disco; \`encrypt_string\` cifra únicamente una cadena de texto y produce un bloque \`!vault |\` que se puede incrustar directamente como valor de una variable en cualquier archivo YAML.
3. Las tareas con el tag \`never\` son omitidas en todas las ejecuciones normales del playbook. Solo se ejecutan cuando se solicitan explícitamente con \`--tags never\` o con su nombre de tag específico. Es útil para tareas destructivas o de mantenimiento excepcional (reset de base de datos, limpieza total) que no deben correr por accidente.
`

export default content
