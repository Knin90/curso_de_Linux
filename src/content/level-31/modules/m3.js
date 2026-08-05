const content = `
## Módulo 3 — Providers y resources: AWS, DigitalOcean y local

### 🎯 Objetivos de aprendizaje

* Entender qué es un provider y cómo Terraform lo descarga e inicializa.
* Configurar los providers de AWS y DigitalOcean con autenticación correcta.
* Usar recursos básicos de AWS, DigitalOcean y el provider local.
* Navegar la documentación de providers para descubrir recursos y sus argumentos.

### ❓ El problema real

Tienes que provisionar infraestructura en AWS, pero también tienes algunos servicios en DigitalOcean por costos. Cada plataforma tiene su API, su autenticación y sus recursos propios. Terraform abstrae estas diferencias: el mismo workflow (\`plan\`/\`apply\`) funciona con cualquier provider. Entender cómo configurarlos y qué recursos ofrecen es esencial.

### 📖 ¿Qué es un provider?

Un provider es un plugin que traduce los bloques HCL en llamadas a APIs reales. Cuando declaras \`resource "aws_instance"\`, el provider de AWS convierte eso en llamadas a la API de EC2. Sin el provider, Terraform no sabe qué hacer con ese recurso.

Los providers están publicados en el Terraform Registry (\`registry.terraform.io\`) y se descargan con \`terraform init\`.

\`\`\`hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"    # organización/nombre en el registry
      version = "~> 5.0"
    }
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}
\`\`\`

Después de declarar los providers, \`terraform init\` los descarga:

\`\`\`bash
terraform init

# Output:
# Initializing the backend...
# Initializing provider plugins...
# - Finding hashicorp/aws versions matching "~> 5.0"...
# - Finding digitalocean/digitalocean versions matching "~> 2.0"...
# - Installing hashicorp/aws v5.31.0...
# - Installing digitalocean/digitalocean v2.34.1...
#
# Terraform has been successfully initialized!
\`\`\`

Los providers se guardan en \`.terraform/providers/\`. El archivo \`.terraform.lock.hcl\` registra las versiones exactas descargadas — debe commitearse al repositorio para garantizar reproducibilidad.

### 📖 Configuración del provider AWS

\`\`\`hcl
# providers.tf
provider "aws" {
  region = "us-east-1"

  # Las credenciales NO se ponen aquí — se leen de:
  # 1. Variables de entorno: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  # 2. ~/.aws/credentials (configurado con aws configure)
  # 3. IAM role (en instancias EC2 o roles de CI/CD)
}
\`\`\`

Configurar credenciales via variables de entorno (recomendado en CI/CD):

\`\`\`bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"

terraform plan
\`\`\`

Configurar con perfil de AWS CLI:

\`\`\`hcl
provider "aws" {
  region  = "us-east-1"
  profile = "mi-empresa-prod"  # perfil en ~/.aws/credentials
}
\`\`\`

**Multiple providers del mismo tipo** (multi-región o multi-cuenta):

\`\`\`hcl
provider "aws" {
  region = "us-east-1"
  alias  = "virginia"
}

provider "aws" {
  region = "eu-west-1"
  alias  = "irlanda"
}

resource "aws_instance" "web_us" {
  provider      = aws.virginia
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

resource "aws_instance" "web_eu" {
  provider      = aws.irlanda
  ami           = "ami-0a8e758f5e873d1c1"
  instance_type = "t3.micro"
}
\`\`\`

### 📖 Recursos AWS comunes

**Instancia EC2**:

\`\`\`hcl
resource "aws_instance" "web" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  key_name               = "mi-clave-ssh"
  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id              = aws_subnet.public.id

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl enable --now nginx
  EOF

  tags = {
    Name = "web-server"
  }
}
\`\`\`

**Security Group**:

\`\`\`hcl
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Permite trafico web y SSH"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]  # solo red interna
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-sg"
  }
}
\`\`\`

**Bucket S3**:

\`\`\`hcl
resource "aws_s3_bucket" "static" {
  bucket = "mi-empresa-static-2024"

  tags = {
    Name = "static-assets"
  }
}

resource "aws_s3_bucket_versioning" "static" {
  bucket = aws_s3_bucket.static.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static" {
  bucket = aws_s3_bucket.static.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
\`\`\`

### 📖 Configuración del provider DigitalOcean

\`\`\`hcl
provider "digitalocean" {
  # Token leído de variable de entorno: DIGITALOCEAN_TOKEN
  # No hardcodear el token aquí
}
\`\`\`

\`\`\`bash
export DIGITALOCEAN_TOKEN="dop_v1_..."
terraform plan
\`\`\`

**Droplet en DigitalOcean**:

\`\`\`hcl
resource "digitalocean_droplet" "web" {
  name   = "web-server"
  region = "nyc3"
  size   = "s-1vcpu-1gb"
  image  = "ubuntu-22-04-x64"

  ssh_keys = [digitalocean_ssh_key.default.fingerprint]

  tags = ["web", "production"]
}

resource "digitalocean_ssh_key" "default" {
  name       = "mi-clave-ssh"
  public_key = file("~/.ssh/id_rsa.pub")
}

resource "digitalocean_firewall" "web" {
  name = "web-firewall"

  droplet_ids = [digitalocean_droplet.web.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
\`\`\`

### 📖 Provider local: archivos en el sistema

El provider \`local\` gestiona archivos y directorios en la máquina donde se ejecuta Terraform. Útil para generar archivos de configuración o inventarios de Ansible:

\`\`\`hcl
resource "local_file" "ansible_inventory" {
  filename = "\${path.module}/inventory.ini"
  content  = <<-EOF
    [webservers]
    \${aws_instance.web.public_ip} ansible_user=ubuntu
  EOF
}

resource "local_sensitive_file" "private_key" {
  filename        = "\${path.module}/id_rsa"
  content         = tls_private_key.ssh.private_key_pem
  file_permission = "0600"
}
\`\`\`

### 📖 Navegación de la documentación de providers

La documentación oficial está en \`registry.terraform.io\`:

\`\`\`text
https://registry.terraform.io/providers/hashicorp/aws/latest/docs
\`\`\`

Para cada recurso encontrarás:
- **Example Usage**: ejemplos mínimos funcionales
- **Argument Reference**: todos los argumentos aceptados (required/optional)
- **Attributes Reference**: atributos exportados que puedes referenciar (como \`.id\`, \`.arn\`, \`.public_ip\`)
- **Import**: cómo importar recursos existentes al estado de Terraform

Flujo recomendado al usar un recurso nuevo:

\`\`\`bash
# 1. Buscar el recurso en la documentación
# 2. Copiar el "Example Usage" como punto de partida
# 3. Revisar "Argument Reference" para los campos requeridos
# 4. Revisar "Attributes Reference" para saber qué valores puedes referenciar
\`\`\`

### 📋 Lo que debes recordar

* Los providers son plugins que se descargan con \`terraform init\` desde el Terraform Registry.
* Las credenciales nunca van en el código — se leen de variables de entorno o archivos de configuración locales (\`~/.aws/credentials\`).
* El archivo \`.terraform.lock.hcl\` fija las versiones exactas de los providers — commitearlo garantiza reproducibilidad.
* Los atributos de un recurso se referencian como \`tipo_recurso.nombre_local.atributo\` (ej: \`aws_instance.web.public_ip\`).
* La documentación en registry.terraform.io tiene todos los argumentos y atributos exportados de cada recurso.

### 🧪 Autoevaluación

1. ¿Por qué no se deben hardcodear las credenciales de AWS en el bloque \`provider "aws" {}\`?
2. ¿Qué hace \`terraform init\` respecto a los providers y por qué es necesario ejecutarlo antes de cualquier otro comando?
3. Necesitas crear el mismo recurso en dos regiones de AWS distintas. ¿Cómo configuras Terraform para lograrlo?

---

1. Porque los archivos \`.tf\` se commitean al repositorio y las credenciales quedarían expuestas en el historial de git. Incluso si luego se eliminan, el historial las conserva. Además, rotar credenciales implicaría modificar el código. La práctica correcta es leerlas de variables de entorno (\`AWS_ACCESS_KEY_ID\`/\`AWS_SECRET_ACCESS_KEY\`), del archivo \`~/.aws/credentials\`, o de IAM roles cuando Terraform corre en AWS.
2. \`terraform init\` descarga e instala los plugins de los providers declarados en \`required_providers\`, inicializa el backend de estado, y descarga los módulos referenciados. Sin ejecutarlo, Terraform no tiene los plugins necesarios para interpretar los recursos y devuelve un error. Debe ejecutarse al clonar un proyecto o cuando se añaden nuevos providers o módulos.
3. Declarando dos bloques \`provider "aws"\` con distintos valores de \`alias\` y \`region\`, luego especificando \`provider = aws.alias\` en cada recurso. Ejemplo: \`provider "aws" { region = "us-east-1"; alias = "virginia" }\` y \`provider "aws" { region = "eu-west-1"; alias = "irlanda" }\`.
`

export default content
