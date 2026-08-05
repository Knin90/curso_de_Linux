const content = `
## Módulo 4 — Variables, outputs, locals y data sources

### 🎯 Objetivos de aprendizaje

* Declarar variables con tipos, descripciones, valores por defecto y validaciones.
* Proporcionar valores a variables mediante múltiples mecanismos (tfvars, flags, env vars).
* Usar \`sensitive = true\` para proteger valores confidenciales.
* Declarar outputs para exponer valores y usar \`terraform output\`.
* Crear locals para centralizar valores calculados y evitar repetición.
* Usar data sources para leer información dinámica de la nube.

### ❓ El problema real

Tienes una configuración de Terraform que funciona para producción, pero necesitas usarla también para staging y development con distintos tamaños de instancia, regiones y nombres. Sin variables, tendrías que duplicar el código. Sin outputs, no sabrías la IP del servidor recién creado. Sin data sources, tendrías que hardcodear IDs de AMIs que cambian por región. Estos cuatro mecanismos hacen que la configuración sea reutilizable, dinámica y observable.

### 📖 Variables de entrada

La declaración va en \`variables.tf\`:

\`\`\`hcl
# variables.tf

variable "project_name" {
  type        = string
  description = "Nombre del proyecto, usado como prefijo en todos los recursos"
  # Sin default: es requerida — Terraform la pedirá interactivamente si no se provee
}

variable "environment" {
  type        = string
  description = "Entorno de despliegue"
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "El entorno debe ser dev, staging o production."
  }
}

variable "instance_type" {
  type        = string
  description = "Tipo de instancia EC2"
  default     = "t3.micro"
}

variable "allowed_ssh_cidrs" {
  type        = list(string)
  description = "CIDRs permitidos para acceso SSH"
  default     = ["0.0.0.0/0"]
}

variable "db_password" {
  type        = string
  description = "Contraseña de la base de datos"
  sensitive   = true  # Terraform no mostrará este valor en logs ni en plan output
}

variable "tags" {
  type = map(string)
  description = "Tags adicionales para todos los recursos"
  default     = {}
}

variable "server_config" {
  type = object({
    instance_type = string
    disk_size_gb  = number
    monitoring    = bool
  })
  description = "Configuración del servidor web"
  default = {
    instance_type = "t3.micro"
    disk_size_gb  = 20
    monitoring    = false
  }
}
\`\`\`

Uso de las variables en \`main.tf\`:

\`\`\`hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.server_config.instance_type

  root_block_device {
    volume_size = var.server_config.disk_size_gb
  }

  monitoring = var.server_config.monitoring

  tags = merge(var.tags, {
    Name        = "\${var.project_name}-web"
    Environment = var.environment
  })
}
\`\`\`

### 📖 Cómo proporcionar valores a las variables

**1. terraform.tfvars** — archivo automáticamente cargado:

\`\`\`hcl
# terraform.tfvars
project_name      = "mi-app"
environment       = "production"
instance_type     = "t3.medium"
allowed_ssh_cidrs = ["10.0.0.0/8"]
tags = {
  Team      = "platform"
  CostCenter = "engineering"
}
\`\`\`

**2. Archivos .auto.tfvars** — también cargados automáticamente:

\`\`\`hcl
# production.auto.tfvars (solo en el branch de producción)
environment   = "production"
instance_type = "t3.large"
\`\`\`

**3. Flag -var en la línea de comandos**:

\`\`\`bash
terraform apply -var="environment=staging" -var="instance_type=t3.small"
\`\`\`

**4. Flag -var-file para archivo específico**:

\`\`\`bash
terraform apply -var-file="environments/staging.tfvars"
\`\`\`

**5. Variables de entorno** — prefijo \`TF_VAR_\`:

\`\`\`bash
export TF_VAR_db_password="mi-contraseña-segura"
export TF_VAR_project_name="mi-app"
terraform apply
\`\`\`

**Orden de precedencia** (de menor a mayor, el último gana):
1. Valores por defecto en la declaración
2. \`terraform.tfvars\`
3. \`*.auto.tfvars\` (en orden alfabético)
4. \`-var-file\`
5. \`-var\`
6. Variables de entorno \`TF_VAR_*\`

**Gestión de secretos**: nunca commitear \`terraform.tfvars\` si contiene contraseñas. Usar \`TF_VAR_\` variables de entorno inyectadas por el CI/CD, o herramientas como HashiCorp Vault, AWS Secrets Manager, o archivos encriptados con \`sops\`.

\`\`\`bash
# .gitignore
*.tfvars
!example.tfvars  # solo commitear el ejemplo sin valores reales
.terraform/
*.tfstate
*.tfstate.backup
\`\`\`

### 📖 Outputs

Los outputs exponen valores de la infraestructura creada. Se declaran en \`outputs.tf\`:

\`\`\`hcl
# outputs.tf

output "web_public_ip" {
  description = "IP pública del servidor web"
  value       = aws_instance.web.public_ip
}

output "web_public_dns" {
  description = "DNS público del servidor web"
  value       = aws_instance.web.public_dns
}

output "db_endpoint" {
  description = "Endpoint de conexión a la base de datos"
  value       = aws_db_instance.main.endpoint
  sensitive   = true  # no se muestra en el output normal de terraform apply
}

output "s3_bucket_name" {
  description = "Nombre del bucket S3"
  value       = aws_s3_bucket.static.bucket
}

# Output de múltiples valores como mapa
output "instance_info" {
  description = "Información completa de la instancia"
  value = {
    id         = aws_instance.web.id
    public_ip  = aws_instance.web.public_ip
    private_ip = aws_instance.web.private_ip
    az         = aws_instance.web.availability_zone
  }
}
\`\`\`

Uso del comando \`terraform output\`:

\`\`\`bash
# Ver todos los outputs
terraform output

# Ver un output específico
terraform output web_public_ip

# Output en formato JSON (útil para scripts)
terraform output -json

# Output de valor sensitive
terraform output -raw db_endpoint

# Usar en scripts bash
IP=\$(terraform output -raw web_public_ip)
ssh ubuntu@\$IP
\`\`\`

Los outputs también son esenciales cuando se usan módulos: el módulo hijo expone valores que el módulo padre puede consumir.

### 📖 Locals

Los locals son valores calculados que se usan internamente. No son inputs del usuario ni outputs expuestos — son una forma de evitar repetición y centralizar lógica:

\`\`\`hcl
# main.tf (sección locals)
locals {
  # Prefijo común para nombrar recursos
  name_prefix = "\${var.project_name}-\${var.environment}"

  # Tags que se aplican a todos los recursos
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    CreatedAt   = timestamp()
  })

  # Mapa de tipos de instancia por entorno
  instance_types = {
    dev        = "t3.micro"
    staging    = "t3.small"
    production = "t3.medium"
  }

  # Selección dinámica del tipo de instancia
  effective_instance_type = lookup(local.instance_types, var.environment, "t3.micro")

  # Lista de puertos a abrir
  web_ports = [80, 443]

  # Cidr blocks por entorno
  ssh_cidrs = var.environment == "production" ? ["10.0.0.0/8"] : ["0.0.0.0/0"]
}

# Uso de locals
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.effective_instance_type

  tags = merge(local.common_tags, {
    Name = "\${local.name_prefix}-web"
  })
}
\`\`\`

### 📖 Data sources: información dinámica de la nube

Los data sources leen información existente sin crear ni modificar recursos. Son esenciales para evitar hardcodear IDs que varían por región o que cambian con el tiempo.

**AMI más reciente de Ubuntu**:

\`\`\`hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical official

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id  # siempre la AMI más reciente
  instance_type = "t3.micro"
}
\`\`\`

**VPC y subnets existentes** (infraestructura creada por otro equipo):

\`\`\`hcl
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Type"
    values = ["public"]
  }
}

resource "aws_instance" "web" {
  ami       = data.aws_ami.ubuntu.id
  subnet_id = data.aws_subnets.public.ids[0]
}
\`\`\`

**Cuenta AWS actual** (útil para construir ARNs):

\`\`\`hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  bucket_arn = "arn:aws:s3:::\${aws_s3_bucket.main.bucket}"
}
\`\`\`

**Secreto de AWS Secrets Manager**:

\`\`\`hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # ...
}
\`\`\`

### 📋 Lo que debes recordar

* Las variables sin \`default\` son requeridas — Terraform las pedirá interactivamente si no se proveen por otro medio.
* \`sensitive = true\` evita que Terraform muestre el valor en logs y en el plan output. No encripta el valor en el estado.
* Los archivos \`terraform.tfvars\` y \`*.auto.tfvars\` se cargan automáticamente — útil para valores por entorno.
* Los locals centralizan valores calculados internamente; no son inputs ni outputs, son conveniencia.
* Los data sources leen infraestructura existente sin gestionarla — esenciales para AMIs dinámicas, VPCs compartidas, y secretos.

### 🧪 Autoevaluación

1. Tienes una variable \`db_password\` con \`sensitive = true\`. ¿Eso significa que el valor está encriptado en \`terraform.tfstate\`?
2. ¿Cuál es la diferencia entre un \`local\` y una \`variable\`? ¿Cuándo usas cada uno?
3. Necesitas saber el ID de la VPC principal de tu cuenta AWS (creada por otro equipo, no por Terraform) para usarlo en un security group. ¿Qué construción de HCL usas?

---

1. No. \`sensitive = true\` solo suprime la visualización del valor en la salida de \`terraform plan\` y \`terraform apply\` (aparece como \`(sensitive value)\`), y evita que se muestre con \`terraform output\` sin la flag \`-raw\`. El valor se almacena en texto plano en \`terraform.tfstate\`. Por eso el archivo de estado debe estar protegido — idealmente en un backend remoto con encriptación habilitada (como S3 con SSE).
2. Una \`variable\` es un input que el usuario o el sistema externo proporciona al ejecutar Terraform — permite personalizar el comportamiento. Un \`local\` es un valor calculado internamente a partir de variables u otros recursos — no puede ser modificado desde fuera. Se usa \`variable\` cuando el valor debe poder cambiarse en distintos entornos o invocaciones. Se usa \`local\` para centralizar expresiones repetidas, evitar duplicación y mejorar legibilidad.
3. Se usa un bloque \`data\`. Por ejemplo: \`data "aws_vpc" "main" { filter { name = "tag:Name"; values = ["main-vpc"] } }\`. Luego se referencia como \`data.aws_vpc.main.id\` en el security group. El data source no crea ni modifica la VPC — solo la lee.
`

export default content
