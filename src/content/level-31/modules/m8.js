const content = `
## Módulo 8 — Laboratorio: desplegar servidor web completo con Terraform

### 🎯 Objetivos de aprendizaje

* Aplicar el ciclo completo de Terraform en un proyecto real: init, validate, plan, apply, destroy.
* Provisionar un servidor web con Nginx usando \`user_data\`.
* Gestionar claves SSH, reglas de firewall, y una IP flotante como infraestructura declarativa.
* Inspeccionar el estado resultante y verificar la protección \`prevent_destroy\`.

### ❓ El problema real

Has estudiado HCL, el ciclo de vida, módulos y estado remoto. Ahora es momento de consolidar todo en un despliegue real. Vas a crear desde cero un servidor web accesible por Internet, con Nginx instalado automáticamente, protegido por un firewall correctamente configurado, y con una IP pública estable. Al final verificarás que el servidor responde, inspeccionarás el estado generado, y comprobarás que las protecciones de lifecycle funcionan en la práctica.

### 📖 Estructura del proyecto

\`\`\`
terraform-webserver/
├── main.tf
├── variables.tf
├── outputs.tf
├── backend.tf
├── user_data.sh
└── terraform.tfvars
\`\`\`

### 📖 user_data.sh — script de inicialización del servidor

Este script se ejecuta una sola vez cuando el Droplet arranca por primera vez. Cloud-init lo ejecuta como root.

\`\`\`bash
#!/bin/bash
set -euo pipefail

# Actualizar el sistema
apt-get update -y
apt-get upgrade -y

# Instalar Nginx
apt-get install -y nginx

# Habilitar e iniciar el servicio
systemctl enable nginx
systemctl start nginx

# Página de bienvenida personalizada
cat > /var/www/html/index.html <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Servidor Terraform</title>
</head>
<body>
  <h1>¡Hola desde Terraform!</h1>
  <p>Este servidor fue provisionado con Terraform.</p>
</body>
</html>
EOF

# Registrar la finalización
echo "user_data ejecutado correctamente: \$(date)" >> /var/log/terraform-init.log
\`\`\`

### 📖 variables.tf — definición de inputs

\`\`\`hcl
# variables.tf

variable "do_token" {
  type        = string
  description = "Token de API de DigitalOcean. Se obtiene en https://cloud.digitalocean.com/account/api/tokens"
  sensitive   = true
}

variable "ssh_public_key" {
  type        = string
  description = "Clave SSH pública a instalar en el servidor. Contenido del archivo ~/.ssh/id_ed25519.pub"
}

variable "region" {
  type        = string
  description = "Región de DigitalOcean donde se crea el Droplet."
  default     = "nyc3"

  validation {
    condition     = contains(["nyc3", "nyc1", "sfo3", "ams3", "sgp1", "lon1", "fra1"], var.region)
    error_message = "La región debe ser una de las regiones disponibles de DigitalOcean."
  }
}

variable "droplet_size" {
  type        = string
  description = "Tamaño del Droplet (slug de DigitalOcean)."
  default     = "s-1vcpu-1gb"
}

variable "droplet_image" {
  type        = string
  description = "Imagen base del sistema operativo."
  default     = "ubuntu-22-04-x64"
}

variable "project_name" {
  type        = string
  description = "Nombre del proyecto. Se usa como prefijo en el nombre de los recursos."
  default     = "terraform-lab"
}
\`\`\`

### 📖 terraform.tfvars — valores de instancia (no se versiona con secretos)

\`\`\`hcl
# terraform.tfvars
# do_token y ssh_public_key se pasan como variables de entorno:
# export TF_VAR_do_token="dop_v1_..."
# export TF_VAR_ssh_public_key="\$(cat ~/.ssh/id_ed25519.pub)"

region        = "nyc3"
droplet_size  = "s-1vcpu-1gb"
droplet_image = "ubuntu-22-04-x64"
project_name  = "terraform-lab"
\`\`\`

### 📖 backend.tf — configuración del backend

Para este laboratorio usaremos el backend local. En producción usarías S3 + DynamoDB (Módulo 7):

\`\`\`hcl
# backend.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  # Backend local para el laboratorio
  # En producción: reemplazar por backend "s3" { ... }
  backend "local" {
    path = "terraform.tfstate"
  }
}
\`\`\`

### 📖 main.tf — recursos principales

\`\`\`hcl
# main.tf

# Configuración del provider de DigitalOcean
provider "digitalocean" {
  token = var.do_token
}

# ─────────────────────────────────────────
# Clave SSH
# ─────────────────────────────────────────

resource "digitalocean_ssh_key" "lab" {
  name       = "\${var.project_name}-key"
  public_key = var.ssh_public_key
}

# ─────────────────────────────────────────
# Firewall
# ─────────────────────────────────────────

resource "digitalocean_firewall" "web" {
  name = "\${var.project_name}-firewall"

  droplet_ids = [digitalocean_droplet.web.id]

  # Tráfico entrante permitido
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

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Tráfico saliente: todo permitido
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# ─────────────────────────────────────────
# Droplet (instancia del servidor)
# ─────────────────────────────────────────

resource "digitalocean_droplet" "web" {
  name   = "\${var.project_name}-web"
  region = var.region
  size   = var.droplet_size
  image  = var.droplet_image

  ssh_keys = [digitalocean_ssh_key.lab.fingerprint]

  # Script de inicialización: instala y configura Nginx
  user_data = file("\${path.module}/user_data.sh")

  # Monitoreo básico incluido
  monitoring = true

  tags = [var.project_name, "web", "terraform"]
}

# ─────────────────────────────────────────
# IP Flotante (Floating IP / Reserved IP)
# ─────────────────────────────────────────

resource "digitalocean_reserved_ip" "web" {
  region = var.region
}

resource "digitalocean_reserved_ip_assignment" "web" {
  ip_address = digitalocean_reserved_ip.web.ip_address
  droplet_id = digitalocean_droplet.web.id
}
\`\`\`

### 📖 outputs.tf — valores de salida

\`\`\`hcl
# outputs.tf

output "droplet_id" {
  description = "ID único del Droplet creado."
  value       = digitalocean_droplet.web.id
}

output "droplet_name" {
  description = "Nombre del Droplet."
  value       = digitalocean_droplet.web.name
}

output "public_ip" {
  description = "IP flotante asignada al servidor. Usa esta IP para acceder."
  value       = digitalocean_reserved_ip.web.ip_address
}

output "droplet_ip" {
  description = "IP efímera del Droplet (puede cambiar si se recrea)."
  value       = digitalocean_droplet.web.ipv4_address
}

output "ssh_command" {
  description = "Comando SSH para conectarse al servidor."
  value       = "ssh root@\${digitalocean_reserved_ip.web.ip_address}"
}

output "web_url" {
  description = "URL del servidor web."
  value       = "http://\${digitalocean_reserved_ip.web.ip_address}"
}
\`\`\`

### 📖 Secuencia de ejecución completa

**Paso 1: Preparar credenciales**

\`\`\`bash
export TF_VAR_do_token="dop_v1_tu_token_aqui"
export TF_VAR_ssh_public_key="\$(cat ~/.ssh/id_ed25519.pub)"
\`\`\`

Si no tienes una clave SSH, créala:

\`\`\`bash
ssh-keygen -t ed25519 -C "terraform-lab" -f ~/.ssh/id_ed25519
\`\`\`

**Paso 2: Inicializar el proyecto**

\`\`\`bash
cd terraform-webserver
terraform init
\`\`\`

Salida esperada:

\`\`\`
Initializing the backend...
Initializing provider plugins...
- Finding digitalocean/digitalocean versions matching "~> 2.0"...
- Installing digitalocean/digitalocean v2.34.1...
Terraform has been successfully initialized!
\`\`\`

**Paso 3: Validar la configuración**

\`\`\`bash
terraform validate
\`\`\`

\`\`\`
Success! The configuration is valid.
\`\`\`

**Paso 4: Revisar el plan**

\`\`\`bash
terraform plan -out=webserver.plan
\`\`\`

El plan muestra 4 recursos a crear:

\`\`\`
Plan: 4 to add, 0 to change, 0 to destroy.

  + digitalocean_ssh_key.lab
  + digitalocean_firewall.web
  + digitalocean_droplet.web
  + digitalocean_reserved_ip.web
  + digitalocean_reserved_ip_assignment.web
\`\`\`

Revisa atentamente los detalles antes de continuar. Verifica que el tamaño, región, e imagen sean los correctos.

**Paso 5: Aplicar el plan**

\`\`\`bash
terraform apply webserver.plan
\`\`\`

El despliegue toma aproximadamente 60-90 segundos. Al terminar:

\`\`\`
Apply complete! Resources: 5 added, 0 changed, 0 destroyed.

Outputs:

droplet_id   = "123456789"
droplet_name = "terraform-lab-web"
public_ip    = "142.93.45.67"
ssh_command  = "ssh root@142.93.45.67"
web_url      = "http://142.93.45.67"
\`\`\`

**Paso 6: Verificar el servidor**

Espera 60 segundos para que \`user_data\` termine de ejecutarse, luego:

\`\`\`bash
# Verificar respuesta HTTP
curl http://\$(terraform output -raw public_ip)

# Conectarse por SSH
ssh root@\$(terraform output -raw public_ip)

# Desde el servidor, verificar el log de inicialización
cat /var/log/terraform-init.log
\`\`\`

**Paso 7: Inspeccionar el estado**

\`\`\`bash
# Listar todos los recursos rastreados
terraform state list

# Ver detalles completos del Droplet
terraform state show digitalocean_droplet.web

# Extraer un atributo específico del estado
terraform output -raw public_ip
\`\`\`

### 📖 Probar lifecycle prevent_destroy

Agrega el bloque \`lifecycle\` al recurso del Droplet en \`main.tf\`:

\`\`\`hcl
resource "digitalocean_droplet" "web" {
  name   = "\${var.project_name}-web"
  region = var.region
  size   = var.droplet_size
  image  = var.droplet_image

  ssh_keys  = [digitalocean_ssh_key.lab.fingerprint]
  user_data = file("\${path.module}/user_data.sh")
  monitoring = true

  tags = [var.project_name, "web", "terraform"]

  lifecycle {
    prevent_destroy = true
  }
}
\`\`\`

Intenta destruir con la protección activa:

\`\`\`bash
terraform destroy
\`\`\`

Resultado esperado:

\`\`\`
╷
│ Error: Instance cannot be destroyed
│
│   on main.tf line 52:
│   52: resource "digitalocean_droplet" "web" {
│
│ Resource digitalocean_droplet.web has lifecycle.prevent_destroy set, but
│ the plan calls for this resource to be destroyed.
╵
\`\`\`

Terraform se niega a continuar. Para poder destruir, elimina el bloque \`lifecycle\` del código y vuelve a ejecutar.

### 📖 Limpieza: destruir la infraestructura

Una vez completado el laboratorio, elimina todos los recursos para evitar cargos:

\`\`\`bash
# Asegúrate de haber eliminado el bloque lifecycle.prevent_destroy primero
terraform destroy
\`\`\`

Confirma con \`yes\` cuando se solicite. El estado quedará vacío:

\`\`\`
Destroy complete! Resources: 5 destroyed.
\`\`\`

Verifica que el estado esté limpio:

\`\`\`bash
terraform state list
# (sin salida: estado vacío)
\`\`\`

### 📖 Equivalente en AWS (alternativa)

Si prefieres usar AWS en lugar de DigitalOcean, el equivalente funcional es:

\`\`\`hcl
# Provider
provider "aws" {
  region = "us-east-1"
}

# Security Group
resource "aws_security_group" "web" {
  name = "terraform-lab-sg"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
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

# Key Pair
resource "aws_key_pair" "lab" {
  key_name   = "terraform-lab-key"
  public_key = var.ssh_public_key
}

# Instancia EC2
resource "aws_instance" "web" {
  ami                    = "ami-0c02fb55956c7d316"  # Ubuntu 22.04 us-east-1
  instance_type          = "t3.micro"
  key_name               = aws_key_pair.lab.key_name
  vpc_security_group_ids = [aws_security_group.web.id]
  user_data              = file("\${path.module}/user_data.sh")

  tags = {
    Name = "terraform-lab-web"
  }
}

# Elastic IP
resource "aws_eip" "web" {
  instance = aws_instance.web.id
  domain   = "vpc"
}

output "public_ip" {
  value = aws_eip.web.public_ip
}
\`\`\`

### 📋 Lo que debes recordar

* El flujo completo es siempre: \`init\` → \`validate\` → \`plan -out=archivo.plan\` → \`apply archivo.plan\`.
* El campo \`user_data\` ejecuta un script de shell al primer arranque del servidor; es el mecanismo estándar para bootstrapping.
* Las variables marcadas como \`sensitive = true\` no aparecen en la salida del plan ni en los logs.
* Pasa secretos como variables de entorno (\`TF_VAR_nombre\`), nunca los escribas en \`terraform.tfvars\`.
* \`terraform output -raw <nombre>\` extrae un valor del estado en formato limpio, ideal para scripts.
* \`lifecycle { prevent_destroy = true }\` bloquea cualquier operación que destruya ese recurso hasta que se elimine del código.
* Siempre ejecuta \`terraform destroy\` al terminar laboratorios para evitar costos inesperados.

### 🧪 Autoevaluación

1. ¿Por qué se usa \`-out=webserver.plan\` al hacer \`terraform plan\` en lugar de ejecutar directamente \`terraform apply\`?
2. El servidor muestra la página de Nginx por defecto en lugar de tu página personalizada. ¿Qué herramienta usarías para verificar si \`user_data.sh\` se ejecutó correctamente, y dónde buscarías el log?
3. Tienes \`prevent_destroy = true\` en el Droplet y quieres cambiar el tamaño de la instancia (\`droplet_size\`) a un valor que requiere recreación. ¿Qué pasos debes seguir para hacerlo de forma segura?

---

1. Con \`-out=webserver.plan\` se congela exactamente el conjunto de cambios que se planificaron. Si el código cambia entre \`plan\` y \`apply\` (por otro commit, otro operador, o un cambio accidental), el \`apply\` con el archivo de plan ejecuta lo que fue revisado, no lo que hay en el código en ese momento. Es el mecanismo de seguridad para entornos de producción.
2. Se conecta por SSH al servidor (\`ssh root@<ip>\`) y se revisa el archivo \`/var/log/terraform-init.log\` (que el script escribe al terminar) y el log de cloud-init en \`/var/log/cloud-init-output.log\`, que captura toda la salida estándar del script \`user_data\`.
3. Primero, eliminar el bloque \`lifecycle { prevent_destroy = true }\` del código. Luego, ejecutar \`terraform plan -out=resize.plan\` para ver que el cambio requiere recreación. Si se acepta la recreación (y se ha hecho backup de los datos necesarios), ejecutar \`terraform apply resize.plan\`. Una vez que el nuevo Droplet esté funcionando, se puede volver a agregar \`prevent_destroy = true\`.
`

export default content
