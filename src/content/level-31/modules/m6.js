const content = `
## Módulo 6 — Módulos: estructura, reutilización y registro público

### 🎯 Objetivos de aprendizaje

* Entender por qué los módulos son la unidad fundamental de reutilización en Terraform.
* Crear módulos locales con la estructura estándar de archivos.
* Consumir módulos locales, de Git y del Registro Público de Terraform.
* Exponer y consumir inputs y outputs de módulos.
* Aplicar buenas prácticas de versionado y diseño de interfaz.

### ❓ El problema real

Tu organización tiene tres entornos (desarrollo, staging, producción) y cada uno necesita un servidor web con las mismas características: instancia EC2, grupo de seguridad, y una IP elástica. Has copiado y pegado el mismo bloque de HCL tres veces y ahora necesitas agregar un puerto nuevo al firewall. Debes hacer ese cambio en tres lugares distintos, y ya en el segundo olvidaste actualizar una variable. Los módulos de Terraform resuelven exactamente este problema de duplicación y deriva entre entornos.

### 📖 El principio DRY en infraestructura

DRY (Don't Repeat Yourself) aplica a la infraestructura tanto como al código de aplicación. Un módulo de Terraform es un contenedor de recursos relacionados que se comporta como una función: recibe inputs (variables), produce outputs, y oculta la implementación interna.

Sin módulos:
\`\`\`
entornos/
├── dev/main.tf       (60 líneas, servidor web)
├── staging/main.tf   (60 líneas, mismas resources)
└── prod/main.tf      (60 líneas, mismas resources)
\`\`\`

Con módulos:
\`\`\`
modules/webserver/    (60 líneas, una sola vez)
entornos/
├── dev/main.tf       (8 líneas, llama al módulo)
├── staging/main.tf   (8 líneas, llama al módulo)
└── prod/main.tf      (8 líneas, llama al módulo)
\`\`\`

### 📖 Estructura estándar de un módulo

La convención de Terraform establece que un módulo debe tener al menos tres archivos:

\`\`\`
modules/webserver/
├── main.tf        # Recursos que el módulo gestiona
├── variables.tf   # Inputs del módulo
├── outputs.tf     # Valores que el módulo expone
└── README.md      # Documentación de uso
\`\`\`

Archivos opcionales frecuentes:

\`\`\`
modules/webserver/
├── versions.tf    # Restricciones de versión de Terraform y providers
├── locals.tf      # Valores locales calculados
└── data.tf        # Data sources
\`\`\`

**main.tf — los recursos:**

\`\`\`hcl
resource "aws_instance" "this" {
  ami           = var.ami_id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.this.id]

  tags = {
    Name        = var.name
    Environment = var.environment
  }
}

resource "aws_security_group" "this" {
  name        = "\${var.name}-sg"
  description = "Security group for \${var.name}"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
\`\`\`

**variables.tf — los inputs:**

\`\`\`hcl
variable "name" {
  type        = string
  description = "Nombre del servidor web. Usado como prefijo en todos los recursos."
}

variable "ami_id" {
  type        = string
  description = "ID de la AMI de Ubuntu 22.04 para la región objetivo."
}

variable "instance_type" {
  type        = string
  description = "Tipo de instancia EC2."
  default     = "t3.micro"
}

variable "environment" {
  type        = string
  description = "Entorno de despliegue (dev, staging, prod)."
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "El entorno debe ser dev, staging, o prod."
  }
}
\`\`\`

**outputs.tf — los valores expuestos:**

\`\`\`hcl
output "instance_id" {
  description = "ID de la instancia EC2 creada."
  value       = aws_instance.this.id
}

output "public_ip" {
  description = "IP pública de la instancia."
  value       = aws_instance.this.public_ip
}

output "security_group_id" {
  description = "ID del grupo de seguridad."
  value       = aws_security_group.this.id
}
\`\`\`

### 📖 Llamar a un módulo local

Desde el directorio raíz del proyecto (que Terraform llama el **módulo raíz**):

\`\`\`hcl
# entornos/dev/main.tf

module "web_server" {
  source = "../../modules/webserver"

  name          = "dev-web"
  ami_id        = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"
  environment   = "dev"
}

output "web_ip" {
  value = module.web_server.public_ip
}
\`\`\`

La sintaxis para acceder a outputs de un módulo es \`module.<nombre_módulo>.<nombre_output>\`.

Después de agregar o cambiar el \`source\` de un módulo, siempre ejecuta \`terraform init\` para que Terraform lo registre.

### 📖 Fuentes de módulos

**1. Ruta local:**
\`\`\`hcl
source = "./modules/webserver"
source = "../../shared/modules/network"
\`\`\`

**2. Repositorio Git:**
\`\`\`hcl
# HTTPS
source = "github.com/mi-org/terraform-modules//webserver?ref=v2.1.0"

# SSH
source = "git@github.com:mi-org/terraform-modules.git//webserver?ref=v2.1.0"
\`\`\`

El doble slash \`//\` separa la URL del repositorio del subdirectorio interno. El parámetro \`ref\` puede ser un tag, branch, o commit SHA.

**3. Registro Público de Terraform:**
\`\`\`hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "mi-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}
\`\`\`

El formato es \`<namespace>/<nombre>/<provider>\`. La versión se especifica por separado del source.

### 📖 terraform-aws-modules: módulos de comunidad

El proyecto [terraform-aws-modules](https://github.com/terraform-aws-modules) mantiene módulos de alta calidad para los servicios AWS más comunes:

| Módulo | Registro |
|--------|----------|
| VPC, subnets, routes | \`terraform-aws-modules/vpc/aws\` |
| Instancias EC2 | \`terraform-aws-modules/ec2-instance/aws\` |
| RDS (Aurora, PostgreSQL) | \`terraform-aws-modules/rds/aws\` |
| EKS (Kubernetes) | \`terraform-aws-modules/eks/aws\` |
| ALB / NLB | \`terraform-aws-modules/alb/aws\` |

Estos módulos encapsulan años de experiencia en producción y siguen las mejores prácticas de AWS. Úsalos como base antes de escribir módulos desde cero.

### 📖 Restricciones de versión

Siempre especifica versiones para módulos del registro o Git. Nunca uses \`source\` sin versión en un entorno de producción:

\`\`\`hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"   # Acepta 20.x.x, rechaza 21.0.0
}
\`\`\`

Operadores de restricción:

| Operador | Significado |
|----------|-------------|
| \`= 1.2.0\` | Exactamente esa versión |
| \`~> 1.2\` | >= 1.2, < 2.0 (permissive patch) |
| \`~> 1.2.0\` | >= 1.2.0, < 1.3.0 (solo patches) |
| \`>= 1.0, < 2.0\` | Rango explícito |

### 📖 Módulos con count y for_each

Puedes instanciar múltiples copias de un módulo:

**Con count:**
\`\`\`hcl
module "worker" {
  source = "./modules/worker"
  count  = 3

  name = "worker-\${count.index}"
}
\`\`\`

**Con for_each (preferible para colecciones nombradas):**
\`\`\`hcl
locals {
  entornos = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.medium"
  }
}

module "server" {
  source   = "./modules/webserver"
  for_each = local.entornos

  name          = each.key
  instance_type = each.value
}

output "server_ips" {
  value = { for k, v in module.server : k => v.public_ip }
}
\`\`\`

### 📖 Módulos anidados

Un módulo puede llamar a otros módulos internamente. La profundidad no tiene límite técnico, pero la recomendación es no superar dos niveles de anidamiento para mantener la legibilidad.

\`\`\`
módulo raíz
└── modules/app-stack
    ├── modules/webserver  (módulo anidado nivel 1)
    └── modules/database   (módulo anidado nivel 1)
\`\`\`

### 📖 Buenas prácticas de diseño de módulos

**Interfaz mínima:** expón solo las variables que el consumidor realmente necesita cambiar. Demasiados inputs hacen el módulo difícil de usar.

**Defaults sensatos:** proporciona valores por defecto razonables para variables opcionales.

**Outputs completos:** expón todos los atributos que los consumidores podrían necesitar, incluyendo IDs de recursos.

**Un solo propósito:** un módulo debe gestionar una sola unidad lógica (un servidor web, una base de datos). No mezcles responsabilidades.

**Documentación:** incluye siempre un README con ejemplos de uso, inputs, outputs, y requisitos de versión.

### 📋 Lo que debes recordar

* Un módulo es un directorio con archivos \`.tf\`: \`main.tf\`, \`variables.tf\`, y \`outputs.tf\` son la estructura mínima.
* Los inputs se declaran con \`variable\` y se acceden con \`var.<nombre>\`; los outputs con \`output\` y se consumen como \`module.<módulo>.<output>\`.
* Siempre ejecuta \`terraform init\` después de agregar o cambiar la fuente de un módulo.
* Usa siempre \`version\` al consumir módulos del registro o Git; nunca dejes la versión sin fijar.
* \`terraform-aws-modules\` ofrece módulos de comunidad maduros para VPC, EC2, RDS, EKS, y ALB.
* \`for_each\` es preferible a \`count\` para instanciar múltiples módulos con nombres significativos.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`source = "./modules/webserver"\` y \`source = "terraform-aws-modules/vpc/aws"\` en términos de dónde Terraform obtiene el código?
2. Tienes un módulo que crea una instancia EC2 y expone un output \`public_ip\`. ¿Cómo accedes a ese valor desde el módulo raíz si llamaste al módulo con el nombre \`app_server\`?
3. ¿Por qué se recomienda \`for_each\` sobre \`count\` para instanciar múltiples módulos? ¿Qué problema resuelve?

---

1. Con ruta local (\`./modules/webserver\`), el código está en el sistema de archivos local y Terraform lo lee directamente. Con el registro público (\`terraform-aws-modules/vpc/aws\`), Terraform descarga el código desde registry.terraform.io durante \`terraform init\`.
2. Se accede con \`module.app_server.public_ip\` en cualquier expresión del módulo raíz, o en un bloque \`output\` para exponerlo hacia arriba.
3. Con \`count\`, los módulos se identifican por índice numérico (\`module.server[0]\`, \`module.server[1]\`). Si eliminas el primero de una lista, todos los índices cambian y Terraform destruye y recrea recursos innecesariamente. Con \`for_each\`, cada instancia tiene una clave estable (\`module.server["dev"]\`), por lo que eliminar una entrada no afecta a las demás.
`

export default content
