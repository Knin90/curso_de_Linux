const exam = [
  {
    q: '¿Qué característica clave permite que aplicar la misma configuración de Terraform varias veces produzca siempre el mismo resultado?',
    options: [
      'Idempotencia, lograda mediante el archivo de estado que registra los recursos creados',
      'El uso de bucles for en HCL para repetir recursos',
      'La ejecución automática de rollback tras cada apply',
      'La compilación de los archivos .tf a binario antes de ejecutarlos',
    ],
    correct: 0,
  },
  {
    q: '¿Qué es el "drift" de configuración en el contexto de Terraform?',
    options: [
      'Un error de sintaxis en un bloque HCL que impide el plan',
      'La divergencia entre el estado real de la infraestructura y lo declarado en los archivos .tf',
      'El tiempo que tarda terraform apply en completarse',
      'La diferencia de versión entre dos providers instalados',
    ],
    correct: 1,
  },
  {
    q: '¿Qué comando de Terraform detecta el drift comparando el estado declarado con el estado real vía la API del provider?',
    options: [
      'terraform validate',
      'terraform fmt',
      'terraform plan',
      'terraform graph',
    ],
    correct: 2,
  },
  {
    q: 'Un colega sugiere usar Ansible en lugar de Terraform para crear instancias EC2 desde cero. Según el curso, ¿cuál es la recomendación habitual?',
    options: [
      'Usar únicamente Ansible porque su YAML es más simple que HCL',
      'Usar Terraform y Ansible en paralelo para el mismo recurso, sin coordinación',
      'Evitar ambas herramientas y usar scripts bash imperativos',
      'Usar Terraform para crear la infraestructura y Ansible para configurarla una vez creada',
    ],
    correct: 3,
  },
  {
    q: '¿Qué es OpenTofu?',
    options: [
      'El fork comunitario open-source de Terraform, mantenido por la Linux Foundation, funcionalmente equivalente',
      'Un plugin oficial de HashiCorp para gestionar workspaces',
      'Un lenguaje alternativo a HCL creado por AWS',
      'Una versión de pago de Terraform con soporte empresarial',
    ],
    correct: 0,
  },
  {
    q: 'Según la división clave entre herramientas de IaC, ¿cuál es la diferencia principal entre provisioning y configuration management?',
    options: [
      'Provisioning solo funciona en AWS; configuration management es multi-cloud',
      'Provisioning crea la infraestructura (servidores, redes); configuration management configura lo que ya existe (paquetes, archivos)',
      'Provisioning es imperativo y configuration management es siempre declarativo',
      'No hay diferencia real, son sinónimos usados indistintamente',
    ],
    correct: 1,
  },
  {
    q: '¿Por qué versionar la infraestructura en Git (archivos .tf) es uno de los pilares de IaC?',
    options: [
      'Porque Git ejecuta automáticamente terraform apply en cada commit',
      'Porque Terraform requiere un repositorio Git para funcionar',
      'Permite ver el historial completo de cambios, hacer code review y revertir a versiones anteriores',
      'Porque evita tener que declarar variables de entrada',
    ],
    correct: 2,
  },
  {
    q: '¿Cuál es la diferencia fundamental entre un bloque resource y un bloque data en Terraform?',
    options: [
      'resource es opcional mientras que data es obligatorio en todo archivo .tf',
      'data solo funciona con el provider de AWS',
      'resource no admite bloques anidados y data sí',
      'resource crea y gestiona un recurso real; data solo lee información de un recurso existente sin gestionarlo',
    ],
    correct: 3,
  },
  {
    q: '¿Qué significa el operador de versión ~> 5.0 en un bloque required_providers?',
    options: [
      'Compatible con la serie 5.x: permite 5.1, 5.2, pero no 6.0',
      'Exactamente la versión 5.0, sin excepciones',
      'Cualquier versión mayor o igual a 5.0, incluida la 6.0 o superior',
      'Solo versiones anteriores a 5.0',
    ],
    correct: 0,
  },
  {
    q: '¿Qué produce la expresión var.environment == "prod" ? "t3.medium" : "t3.micro" cuando environment vale "staging"?',
    options: [
      '"t3.medium", porque staging se trata como entorno de producción',
      '"t3.micro", porque la condición es falsa y se evalúa el segundo operando',
      'Un error de sintaxis porque el operador ternario no existe en HCL',
      '"staging", porque HCL devuelve el valor de la variable comparada',
    ],
    correct: 1,
  },
  {
    q: 'Tienes var.ports = [22, 80, 443] y necesitas crear un bloque ingress por cada puerto de la lista. ¿Qué construcción de HCL usas?',
    options: [
      'Tres bloques resource separados, uno por cada puerto',
      'Una expresión for dentro del argumento cidr_blocks',
      'Un bloque dynamic "ingress" con for_each = var.ports',
      'El meta-argumento count aplicado al bloque ingress directamente',
    ],
    correct: 2,
  },
  {
    q: '¿Qué tipo de dato de HCL se usa para representar { name = string, port = number, enabled = bool }?',
    options: [
      'map(string)',
      'tuple',
      'list(any)',
      'object',
    ],
    correct: 3,
  },
  {
    q: '¿Qué hace una expresión for como { for s in var.services : s => "${s}-server" }?',
    options: [
      'Transforma una lista en un mapa, usando cada elemento como clave y un valor derivado',
      'Filtra los elementos de var.services que sean strings',
      'Crea un bloque dynamic para cada servicio',
      'Concatena todos los elementos de la lista en un único string',
    ],
    correct: 0,
  },
  {
    q: '¿Qué archivos lee Terraform automáticamente al ejecutarse, independientemente de la convención de nombres (main.tf, variables.tf, etc.)?',
    options: [
      'Solo el archivo llamado exactamente main.tf',
      'Todos los archivos con extensión .tf del directorio de trabajo',
      'Solo los archivos listados en un manifest.json',
      'Solo el archivo indicado con la flag -file en la línea de comandos',
    ],
    correct: 1,
  },
  {
    q: '¿Qué es un provider en Terraform?',
    options: [
      'Un archivo de configuración que almacena las credenciales del usuario',
      'Un módulo reutilizable publicado en el Terraform Registry',
      'Un plugin que traduce los bloques HCL en llamadas a la API real de una plataforma (AWS, DigitalOcean, etc.)',
      'Un tipo de backend usado para guardar el estado remoto',
    ],
    correct: 2,
  },
  {
    q: '¿Dónde se recomienda leer las credenciales de AWS en lugar de hardcodearlas en el bloque provider "aws" {}?',
    options: [
      'Directamente en el argumento access_key del bloque provider',
      'En un comentario dentro del archivo main.tf',
      'En el archivo terraform.tfstate para que se autentiquen automáticamente',
      'De variables de entorno, del archivo ~/.aws/credentials, o de un IAM role',
    ],
    correct: 3,
  },
  {
    q: 'Necesitas crear el mismo tipo de recurso en dos regiones de AWS distintas. ¿Cómo lo configuras en Terraform?',
    options: [
      'Declarando dos bloques provider "aws" con distinto alias y region, y usando provider = aws.alias en cada recurso',
      'Declarando la región dos veces dentro del mismo bloque provider "aws"',
      'Ejecutando terraform apply dos veces con distintas variables de entorno para la misma configuración',
      'Usando dos archivos terraform.tfstate diferentes sin ningún bloque provider adicional',
    ],
    correct: 0,
  },
  {
    q: '¿Qué función cumple el archivo .terraform.lock.hcl?',
    options: [
      'Almacena las credenciales cifradas de los providers',
      'Registra las versiones exactas de los providers descargados, garantizando reproducibilidad',
      'Bloquea el estado para evitar ejecuciones concurrentes de apply',
      'Define las restricciones de versión de Terraform mismo, reemplazando a required_version',
    ],
    correct: 1,
  },
  {
    q: '¿Para qué se usa el provider local en Terraform?',
    options: [
      'Para crear instancias virtuales en un hipervisor local como VirtualBox',
      'Para simular llamadas a la API de AWS sin conexión a Internet',
      'Para gestionar archivos y directorios en la máquina donde se ejecuta Terraform',
      'Para almacenar el estado de Terraform de forma local en vez de remota',
    ],
    correct: 2,
  },
  {
    q: '¿Qué comando descarga los plugins de los providers declarados en required_providers?',
    options: [
      'terraform plan',
      'terraform providers install',
      'terraform apply',
      'terraform init',
    ],
    correct: 3,
  },
  {
    q: 'Tienes una variable db_password con sensitive = true. ¿Esto significa que el valor está encriptado en terraform.tfstate?',
    options: [
      'No, sensitive = true solo oculta el valor en la salida de plan/apply/output; en el estado se guarda en texto plano',
      'Sí, Terraform lo encripta automáticamente con AES-256 en el archivo de estado',
      'Sí, pero solo si se usa un backend remoto como S3',
      'No, además el valor tampoco se guarda en el estado en absoluto',
    ],
    correct: 0,
  },
  {
    q: '¿Qué archivos de variables carga Terraform automáticamente sin necesidad de flags en la línea de comandos?',
    options: [
      'Cualquier archivo con extensión .tf que contenga la palabra "vars"',
      'terraform.tfvars y los archivos *.auto.tfvars',
      'Solo el archivo indicado con -var-file en cada ejecución',
      'config.yaml y config.json en el directorio raíz',
    ],
    correct: 1,
  },
  {
    q: '¿Qué prefijo deben tener las variables de entorno para que Terraform las use como valores de variables de entrada?',
    options: [
      'TERRAFORM_',
      'TF_INPUT_',
      'TF_VAR_',
      'HCL_VAR_',
    ],
    correct: 2,
  },
  {
    q: '¿Cuál es la diferencia principal entre un local y una variable en Terraform?',
    options: [
      'Un local solo puede contener strings, mientras que una variable admite cualquier tipo',
      'Una variable requiere siempre un valor default; un local nunca lo tiene',
      'No hay diferencia funcional, solo difieren en el nombre del bloque',
      'Una variable es un input proporcionado externamente; un local es un valor calculado internamente y no puede modificarse desde fuera',
    ],
    correct: 3,
  },
  {
    q: 'Necesitas leer el ID de la VPC principal de tu cuenta AWS, creada manualmente por otro equipo (no por Terraform). ¿Qué bloque HCL usas?',
    options: [
      'Un bloque data, por ejemplo data "aws_vpc" "main"',
      'Un bloque resource "aws_vpc" con el mismo nombre que la VPC existente',
      'Un bloque import declarativo apuntando al ID de la VPC',
      'Un bloque local que referencie directamente el ID hardcodeado',
    ],
    correct: 0,
  },
  {
    q: 'En el orden de precedencia de variables de Terraform, ¿qué gana si se define el mismo valor en terraform.tfvars y también con el flag -var en la línea de comandos?',
    options: [
      'terraform.tfvars, porque se carga automáticamente y siempre tiene prioridad',
      'El flag -var, porque tiene mayor precedencia que terraform.tfvars',
      'Ninguno: Terraform lanza un error de conflicto y detiene la ejecución',
      'El valor por defecto declarado en el bloque variable',
    ],
    correct: 1,
  },
  {
    q: '¿Cuáles son las tres tareas críticas que realiza terraform init?',
    options: [
      'Crear los recursos, generar el plan, y aplicar los cambios',
      'Validar la sintaxis HCL, formatear el código, y hacer commit automático',
      'Descargar providers, inicializar el backend, e instalar módulos referenciados',
      'Destruir recursos huérfanos, renombrar el estado, y actualizar el lock file de Git',
    ],
    correct: 2,
  },
  {
    q: 'En la salida de terraform plan, ¿qué significa el símbolo -/+ junto a un recurso?',
    options: [
      'El recurso se creará por primera vez',
      'El recurso se modificará in-place sin recrearlo',
      'El recurso será destruido sin ser reemplazado',
      'El recurso será destruido y recreado (reemplazo)',
    ],
    correct: 3,
  },
  {
    q: '¿Qué hace terraform state mv aws_instance.web aws_instance.app_server?',
    options: [
      'Renombra el recurso dentro del estado sin destruirlo ni recrearlo',
      'Elimina el recurso del estado sin destruirlo en la nube',
      'Destruye la instancia web y crea una nueva llamada app_server',
      'Mueve el archivo terraform.tfstate a otra ubicación en disco',
    ],
    correct: 0,
  },
  {
    q: 'Tienes una base de datos RDS en producción. ¿Qué bloque de lifecycle evita su eliminación accidental?',
    options: [
      'lifecycle { create_before_destroy = true }',
      'lifecycle { prevent_destroy = true }',
      'lifecycle { ignore_changes = [all] }',
      'lifecycle { protect = true }',
    ],
    correct: 1,
  },
  {
    q: '¿Qué requiere el proceso de terraform import además de ejecutar el comando con el ID real del recurso?',
    options: [
      'Nada más: Terraform genera automáticamente el código .tf a partir del ID importado',
      'Tener configurado un backend remoto obligatoriamente',
      'Escribir manualmente el bloque de recurso correspondiente en el código .tf, ya que Terraform no lo genera',
      'Ejecutar primero terraform destroy sobre el recurso a importar',
    ],
    correct: 2,
  },
  {
    q: '¿Qué hace terraform apply -replace="aws_instance.web"?',
    options: [
      'Sustituye el proveedor del recurso por otro definido con alias',
      'Renombra el recurso en el estado sin recrearlo',
      'Marca el recurso como protegido contra destrucción',
      'Fuerza la recreación de ese recurso específico aunque Terraform no detecte cambios',
    ],
    correct: 3,
  },
  {
    q: '¿Cuáles son los tres archivos que constituyen la estructura mínima de un módulo de Terraform?',
    options: [
      'main.tf, variables.tf y outputs.tf',
      'main.tf, backend.tf y provider.tf',
      'module.tf, input.tf y export.tf',
      'resources.tf, config.tf y state.tf',
    ],
    correct: 0,
  },
  {
    q: '¿Cuál es la diferencia entre source = "./modules/webserver" y source = "terraform-aws-modules/vpc/aws"?',
    options: [
      'El primero requiere versión explícita y el segundo no',
      'El primero lee el código desde el sistema de archivos local; el segundo lo descarga del Terraform Registry durante terraform init',
      'Ambos hacen exactamente lo mismo, solo cambia el formato del string',
      'El segundo solo funciona con recursos de AWS EC2, nunca con VPC',
    ],
    correct: 1,
  },
  {
    q: 'Llamaste a un módulo con module "app_server" { ... } y este expone un output public_ip. ¿Cómo accedes a ese valor desde el módulo raíz?',
    options: [
      'var.app_server.public_ip',
      'output.app_server.public_ip',
      'module.app_server.public_ip',
      'app_server.module.public_ip',
    ],
    correct: 2,
  },
  {
    q: '¿Por qué se recomienda for_each sobre count para instanciar múltiples módulos?',
    options: [
      'Porque count no admite módulos, solo recursos individuales',
      'Porque for_each es más rápido de ejecutar en terraform apply',
      'Porque count requiere licencia empresarial de Terraform',
      'Porque for_each usa claves estables, mientras que con count los índices cambian si se elimina un elemento, causando destrucción y recreación innecesaria',
    ],
    correct: 3,
  },
  {
    q: 'Al consumir un módulo desde el Registro Público de Terraform, ¿por qué se recomienda fijar siempre el argumento version?',
    options: [
      'Para evitar que una actualización no controlada del módulo introduzca cambios inesperados en producción',
      'Porque sin version el módulo no se puede referenciar en absoluto',
      'Porque version determina el número de instancias del módulo a crear',
      'Porque los módulos locales requieren version pero los remotos no',
    ],
    correct: 0,
  },
  {
    q: '¿Qué proyecto de comunidad mantiene módulos de alta calidad para servicios AWS comunes como VPC, EC2, RDS y EKS?',
    options: [
      'hashicorp-community-modules',
      'terraform-aws-modules',
      'aws-terraform-registry',
      'terraform-official-aws',
    ],
    correct: 1,
  },
  {
    q: '¿Cuál es una de las tres limitaciones fundamentales del estado local para trabajo en equipo?',
    options: [
      'Solo permite un máximo de cinco recursos por archivo de estado',
      'Requiere reiniciar el backend cada vez que cambia un provider',
      'No hay locking: dos personas ejecutando apply simultáneamente pueden corromper el estado',
      'No admite el uso de módulos remotos junto con estado local',
    ],
    correct: 2,
  },
  {
    q: '¿Qué combinación de servicios AWS es el estándar de la industria para backend remoto con locking?',
    options: [
      'EFS para el estado y RDS para el locking',
      'S3 para el estado y SQS para el locking',
      'CloudWatch para el estado y IAM para el locking',
      'S3 para almacenar el estado y DynamoDB para el locking',
    ],
    correct: 3,
  },
  {
    q: '¿Para qué se usa terraform_remote_state?',
    options: [
      'Para leer los outputs de otro estado de Terraform desde una configuración distinta',
      'Para migrar el estado local a un backend remoto automáticamente',
      'Para cifrar el archivo terraform.tfstate con una clave KMS',
      'Para sincronizar dos workspaces distintos en tiempo real',
    ],
    correct: 0,
  },
  {
    q: '¿Cuál es la principal limitación de los workspaces de Terraform para separar entornos como prod y dev?',
    options: [
      'No permiten usar variables distintas por entorno',
      'Comparten el mismo backend y las mismas credenciales, sin aislamiento real de permisos',
      'Solo se pueden crear hasta tres workspaces por proyecto',
      'Requieren un backend distinto para cada workspace obligatoriamente',
    ],
    correct: 1,
  },
  {
    q: 'Si un apply falló y dejó un bloqueo activo en DynamoDB, ¿qué comando se usa para liberarlo manualmente?',
    options: [
      'terraform state rm <ID-del-bloqueo>',
      'terraform unlock --force',
      'terraform force-unlock <ID-del-bloqueo>',
      'terraform apply -unlock=true',
    ],
    correct: 2,
  },
  {
    q: '¿Qué permite hacer la configuración parcial del backend (backend "s3" {} vacío junto con -backend-config)?',
    options: [
      'Usar dos backends distintos simultáneamente en la misma ejecución',
      'Evitar tener que ejecutar terraform init en el proyecto',
      'Migrar automáticamente el estado sin confirmación interactiva',
      'Separar los valores sensibles o variables por entorno del código versionado del backend',
    ],
    correct: 3,
  },
  {
    q: '¿Por qué se usa terraform plan -out=webserver.plan en lugar de ejecutar directamente terraform apply?',
    options: [
      'Para congelar exactamente el conjunto de cambios planificado, de modo que el apply ejecute lo revisado y no lo que haya en el código en ese momento',
      'Porque terraform apply no puede ejecutarse sin un archivo de plan previo',
      'Porque el flag -out reduce el tiempo de ejecución del apply',
      'Porque sin -out el plan no detecta cambios en las variables sensibles',
    ],
    correct: 0,
  },
  {
    q: 'El servidor del laboratorio muestra la página por defecto de Nginx en lugar de la página personalizada. ¿Dónde revisarías si user_data.sh se ejecutó correctamente?',
    options: [
      'En el archivo terraform.tfstate, sección user_data',
      'En /var/log/terraform-init.log y en el log de cloud-init /var/log/cloud-init-output.log',
      'En la salida de terraform plan del último apply',
      'En /etc/nginx/nginx.conf, sección de logs de arranque',
    ],
    correct: 1,
  },
  {
    q: 'Tienes lifecycle { prevent_destroy = true } en el Droplet y necesitas cambiar droplet_size a un valor que requiere recreación. ¿Cuál es el primer paso?',
    options: [
      'Ejecutar terraform destroy -auto-approve directamente, ignorando la protección',
      'Cambiar el valor de droplet_size sin tocar el bloque lifecycle',
      'Eliminar el bloque lifecycle { prevent_destroy = true } del código antes de aplicar el cambio',
      'Renombrar el recurso con terraform state mv para evitar la protección',
    ],
    correct: 2,
  },
  {
    q: '¿Cómo se recomienda pasar secretos como el token de API de DigitalOcean, en vez de escribirlos en terraform.tfvars?',
    options: [
      'Codificados en base64 dentro de main.tf',
      'Como comentarios en el archivo backend.tf',
      'Como valores por defecto en el bloque variable correspondiente',
      'Como variables de entorno con el prefijo TF_VAR_, por ejemplo TF_VAR_do_token',
    ],
    correct: 3,
  },
  {
    q: '¿Qué hace terraform output -raw public_ip a diferencia de terraform output public_ip?',
    options: [
      'Extrae el valor en formato limpio sin comillas ni formato JSON, ideal para usarlo en scripts bash',
      'Muestra el valor en formato JSON en lugar de texto plano',
      'Oculta el valor si la variable está marcada como sensitive',
      'Refresca el estado antes de mostrar el output',
    ],
    correct: 0,
  },
  {
    q: 'En el laboratorio, ¿qué mecanismo estándar ejecuta el script de shell al primer arranque del servidor para instalar y configurar Nginx?',
    options: [
      'Un bloque provisioner "remote-exec" ejecutado después del apply',
      'El argumento user_data del recurso digitalocean_droplet, procesado por cloud-init',
      'El archivo terraform.tfvars, que Terraform copia al servidor automáticamente',
      'Un cron job configurado manualmente tras el despliegue',
    ],
    correct: 1,
  },
]

export default exam
