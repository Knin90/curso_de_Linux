const content = `
## Módulo 2 — HCL: sintaxis, bloques, tipos de datos y expresiones

### 🎯 Objetivos de aprendizaje

* Leer y escribir archivos HCL con soltura: bloques, argumentos y atributos.
* Identificar los bloques principales de Terraform y su propósito.
* Usar el sistema de tipos de HCL: string, number, bool, list, map y object.
* Escribir expresiones, interpolaciones, condicionales y expresiones for.

### ❓ El problema real

Estás leyendo la documentación de un módulo de Terraform y encuentras HCL con interpolaciones, expresiones condicionales y bloques anidados. Sin entender la sintaxis base, no puedes modificar configuraciones existentes ni escribir las tuyas propias. HCL es el lenguaje de Terraform — aprenderlo bien es la base de todo lo demás.

### 📖 Estructura de archivos .tf

Terraform lee todos los archivos \`.tf\` del directorio de trabajo. La convención es dividir la configuración en archivos por responsabilidad:

\`\`\`text
proyecto/
├── main.tf          # recursos principales
├── variables.tf     # declaración de variables de entrada
├── outputs.tf       # outputs del módulo/configuración
├── providers.tf     # configuración de providers
├── versions.tf      # restricciones de versiones
└── terraform.tfvars # valores de variables (no commitear si tiene secretos)
\`\`\`

Terraform no impone esta estructura — puedes poner todo en un solo \`main.tf\`. La división es una convención para legibilidad.

### 📖 El bloque terraform {}

Configura el comportamiento del propio Terraform: versión requerida y providers necesarios.

\`\`\`hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}
\`\`\`

Operadores de versión:
- \`= 5.0.0\` — exactamente esa versión
- \`>= 5.0\` — esa versión o mayor
- \`~> 5.0\` — compatible con 5.x (permite 5.1, 5.2, pero no 6.0)
- \`>= 5.0, < 6.0\` — rango explícito

### 📖 Bloques principales de Terraform

**resource**: el bloque más usado. Define un recurso de infraestructura real.

\`\`\`hcl
resource "aws_s3_bucket" "logs" {
  #      ───────────────  ────
  #      tipo de recurso  nombre local (identificador en Terraform)

  bucket = "mi-empresa-logs-2024"

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
\`\`\`

El tipo de recurso (\`aws_s3_bucket\`) determina qué provider se usa y qué argumentos acepta. El nombre local (\`logs\`) es solo para referenciarlo dentro de Terraform.

**data**: lee recursos existentes sin crearlos ni modificarlos.

\`\`\`hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}
\`\`\`

**variable**: declara una variable de entrada.

\`\`\`hcl
variable "instance_type" {
  type        = string
  description = "Tipo de instancia EC2"
  default     = "t3.micro"

  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Tipo de instancia no permitido. Usa t3.micro, t3.small o t3.medium."
  }
}
\`\`\`

**output**: expone valores del módulo o configuración.

\`\`\`hcl
output "instance_public_ip" {
  description = "IP pública del servidor web"
  value       = aws_instance.web.public_ip
}
\`\`\`

**locals**: valores calculados internamente, no son inputs del usuario.

\`\`\`hcl
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  name_prefix = "\${var.project_name}-\${var.environment}"
}
\`\`\`

**module**: invoca un módulo reutilizable.

\`\`\`hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "mi-vpc"
  cidr = "10.0.0.0/16"
}
\`\`\`

### 📖 Sistema de tipos de HCL

\`\`\`hcl
variable "ejemplos" {
  # Tipos primitivos
  type = string   # "hola mundo"
  type = number   # 42, 3.14
  type = bool     # true, false

  # Tipos de colección
  type = list(string)    # ["a", "b", "c"]
  type = set(string)     # como list pero sin duplicados y sin orden
  type = map(string)     # { clave = "valor" }

  # Tipos estructurales
  type = object({
    name    = string
    port    = number
    enabled = bool
  })

  type = tuple([string, number, bool])  # tipos fijos por posición

  # Tipo dinámico (evitar cuando sea posible)
  type = any
}
\`\`\`

Ejemplo con tipos complejos en uso real:

\`\`\`hcl
variable "allowed_ports" {
  type        = list(number)
  description = "Puertos abiertos en el security group"
  default     = [22, 80, 443]
}

variable "tags" {
  type = map(string)
  default = {
    Environment = "dev"
    Team        = "backend"
  }
}

variable "database_config" {
  type = object({
    engine         = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
  default = {
    engine         = "postgres"
    instance_class = "db.t3.micro"
    storage_gb     = 20
    multi_az       = false
  }
}
\`\`\`

### 📖 Expresiones e interpolaciones

**Interpolación de cadenas**:

\`\`\`hcl
# Referencia a variable
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Interpolación en string con \${}
  tags = {
    Name = "\${var.project_name}-web-\${var.environment}"
  }
}

# Referencia a atributo de otro recurso
resource "aws_eip" "web" {
  instance = aws_instance.web.id
  #          ─────────────────────
  #          tipo.nombre_local.atributo
}
\`\`\`

**Expresión condicional** (operador ternario):

\`\`\`hcl
# condición ? valor_si_true : valor_si_false
resource "aws_instance" "web" {
  instance_type = var.environment == "production" ? "t3.medium" : "t3.micro"
  monitoring    = var.environment == "production" ? true : false
}
\`\`\`

**Expresiones for** — transformar colecciones:

\`\`\`hcl
locals {
  # Convertir lista en mapa
  # ["web", "api", "worker"] → { web = "web-server", api = "api-server", ... }
  server_names = { for s in var.services : s => "\${s}-server" }

  # Filtrar lista
  prod_instances = [for i in var.instances : i if i.environment == "production"]

  # Transformar mapa
  upper_tags = { for k, v in var.tags : k => upper(v) }
}
\`\`\`

**Funciones built-in** — HCL tiene un conjunto amplio de funciones:

\`\`\`hcl
locals {
  # Manipulación de strings
  nombre_lower = lower(var.project_name)
  nombre_upper = upper(var.project_name)
  nombre_trim  = trimspace("  hola  ")
  partes       = split("-", "web-server-prod")  # ["web", "server", "prod"]
  unido        = join("-", ["web", "server"])    # "web-server"

  # Colecciones
  longitud = length(var.allowed_ports)
  primero  = element(var.allowed_ports, 0)
  contiene = contains(["t2.micro", "t3.micro"], var.instance_type)

  # Encoding
  config_b64 = base64encode("contenido de config")
  json_str   = jsonencode({ key = "value", num = 42 })

  # Fechas y formato
  timestamp  = timestamp()  # ISO 8601 actual
}
\`\`\`

### 📖 Bloques anidados y argumentos dinámicos

Muchos recursos tienen bloques anidados para configuración compleja:

\`\`\`hcl
resource "aws_security_group" "web" {
  name = "web-sg"

  # Bloque anidado estático
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # dynamic block: genera bloques repetidos desde una colección
  dynamic "ingress" {
    for_each = var.allowed_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
\`\`\`

### 📋 Lo que debes recordar

* La convención es separar \`main.tf\`, \`variables.tf\`, \`outputs.tf\` y \`providers.tf\` — pero Terraform lee todos los \`.tf\` del directorio.
* Los bloques principales son: \`terraform\`, \`resource\`, \`data\`, \`variable\`, \`output\`, \`locals\`, \`module\`.
* Las referencias siguen el patrón \`tipo_recurso.nombre_local.atributo\` (ej: \`aws_instance.web.public_ip\`).
* Los bloques \`dynamic\` generan bloques anidados repetidos desde una colección.
* El operador \`~>\` en versiones significa "compatible con" — permite parches y minor pero no major.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre un bloque \`resource\` y un bloque \`data\`?
2. ¿Qué produce la expresión \`var.environment == "prod" ? "t3.medium" : "t3.micro"\` cuando \`environment\` es \`"staging"\`?
3. Tienes una lista \`var.ports = [22, 80, 443]\` y necesitas crear un bloque \`ingress\` por cada puerto. ¿Qué construcción de HCL usas?

---

1. \`resource\` crea y gestiona un recurso de infraestructura real — Terraform es responsable de su ciclo de vida (crear, modificar, destruir). \`data\` lee información de un recurso existente sin gestionarlo: solo permite consultar datos para usarlos en otros lugares. Ejemplo: \`data "aws_ami"\` busca la AMI más reciente de Ubuntu sin crear ninguna instancia.
2. Produce \`"t3.micro"\`. La condición \`"staging" == "prod"\` es \`false\`, por lo que se evalúa el segundo operando. Es el equivalente del operador ternario de otros lenguajes.
3. Se usa un bloque \`dynamic\`. Dentro del recurso se declara \`dynamic "ingress" { for_each = var.ports; content { from_port = ingress.value; to_port = ingress.value; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] } }\`. Terraform genera un bloque \`ingress\` por cada elemento de la lista.
`

export default content
