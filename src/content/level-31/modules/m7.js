const content = `
## Módulo 7 — Estado remoto: backends S3, locking y workspaces

### 🎯 Objetivos de aprendizaje

* Entender por qué el estado local es insuficiente para equipos.
* Configurar un backend remoto en S3 con DynamoDB para locking.
* Migrar estado local a un backend remoto de forma segura.
* Leer outputs de otro estado con \`terraform_remote_state\`.
* Usar workspaces para gestionar múltiples entornos con el mismo código.

### ❓ El problema real

Tu equipo de tres ingenieros trabaja en la misma infraestructura. Cada uno tiene \`terraform.tfstate\` en su laptop. El lunes, Ana aplica cambios mientras Beto ejecuta \`plan\` desde su máquina: su estado local tiene dos semanas de antigüedad, no refleja lo que Ana acaba de crear, y su \`apply\` subsiguiente sobrescribe parte de la infraestructura. Carlos, que trabaja desde casa, tiene una versión diferente del estado que obtuvo el viernes. El resultado: tres versiones distintas del estado, recursos duplicados en la nube, y una hora perdida reconstruyendo lo que ocurrió. El estado remoto resuelve este problema.

### 📖 El problema con el estado local

El estado local (\`terraform.tfstate\` en tu directorio de trabajo) tiene tres limitaciones fundamentales para equipos:

1. **No compartible**: cada persona trabaja con su propia copia, que diverge con el tiempo.
2. **Sin locking**: dos personas ejecutando \`apply\` simultáneamente corrompen el estado.
3. **Sin historial**: si el archivo se pierde o corrompe, no hay forma de recuperarlo.

### 📖 Backends remotos en Terraform

Un backend define dónde y cómo Terraform almacena el estado. Los backends remotos más comunes:

| Backend | Caso de uso |
|---------|-------------|
| S3 + DynamoDB | AWS: estándar en la industria |
| Google Cloud Storage | GCP |
| Azure Blob Storage | Azure |
| Terraform Cloud | Plataforma gestionada multi-cloud |
| Consul | HashiCorp stack |
| HTTP | Backends personalizados |

### 📖 Configuración del backend S3

**Paso 1: Crear los recursos de infraestructura del backend**

Antes de configurar el backend, los recursos de S3 y DynamoDB deben existir. Lo más común es crearlos manualmente o con un script de arranque:

\`\`\`bash
# Crear el bucket S3 con versionado
aws s3api create-bucket \\
  --bucket mi-empresa-terraform-state \\
  --region us-east-1

aws s3api put-bucket-versioning \\
  --bucket mi-empresa-terraform-state \\
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \\
  --bucket mi-empresa-terraform-state \\
  --server-side-encryption-configuration \\
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Crear la tabla DynamoDB para locking
aws dynamodb create-table \\
  --table-name terraform-locks \\
  --attribute-definitions AttributeName=LockID,AttributeType=S \\
  --key-schema AttributeName=LockID,KeyType=HASH \\
  --billing-mode PAY_PER_REQUEST \\
  --region us-east-1
\`\`\`

**Paso 2: Configurar el backend en Terraform**

\`\`\`hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "mi-empresa-terraform-state"
    key            = "prod/api-server/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
\`\`\`

El campo \`key\` define la ruta dentro del bucket. Es una convención usar \`<entorno>/<proyecto>/terraform.tfstate\` para organizar múltiples estados en el mismo bucket.

**Paso 3: Migrar el estado local al backend remoto**

\`\`\`bash
terraform init -migrate-state
\`\`\`

Terraform detecta que hay un estado local existente y ofrece migrarlo al backend. Confirma con \`yes\`.

### 📖 Cómo funciona el locking con DynamoDB

Cuando ejecutas \`terraform apply\`, Terraform:

1. Escribe un registro en DynamoDB con \`LockID = <bucket>/<key>\` y metadata del bloqueo.
2. Ejecuta el apply.
3. Elimina el registro de DynamoDB al terminar.

Si una segunda persona intenta ejecutar \`apply\` mientras el primero está activo:

\`\`\`
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        3d3f3b1a-...
  Path:      mi-empresa-terraform-state/prod/api-server/terraform.tfstate
  Operation: OperationTypeApply
  Who:       ana@laptop:/infra
  Version:   1.6.0
  Created:   2026-08-04 10:23:11
\`\`\`

Si un apply falló y dejó el bloqueo activo, puedes forzar su liberación:

\`\`\`bash
terraform force-unlock <ID-del-bloqueo>
\`\`\`

Úsalo solo cuando estés seguro de que no hay otro proceso activo.

### 📖 Seguridad del estado remoto

El estado contiene información sensible (IPs, claves, secretos de recursos). Para el backend S3:

**Cifrado en tránsito**: S3 usa HTTPS por defecto.

**Cifrado en reposo**: el campo \`encrypt = true\` en el backend activa SSE-S3. Para mayor seguridad, usa KMS:

\`\`\`hcl
backend "s3" {
  bucket         = "mi-empresa-terraform-state"
  key            = "prod/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/mrk-abc123"
  dynamodb_table = "terraform-locks"
}
\`\`\`

**Política IAM de mínimo privilegio** para Terraform:

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::mi-empresa-terraform-state/prod/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::mi-empresa-terraform-state"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/terraform-locks"
    }
  ]
}
\`\`\`

**Versionado del bucket S3**: con el versionado habilitado, cada versión del estado queda almacenada. Si el estado se corrompe, puedes restaurar la versión anterior desde la consola de S3 o con AWS CLI.

### 📖 terraform_remote_state: referencias entre stacks

Cuando tienes infraestructura dividida en múltiples configuraciones (networking, base de datos, aplicación), \`terraform_remote_state\` permite leer los outputs de un estado desde otro:

**En el stack de networking** (\`networking/outputs.tf\`):
\`\`\`hcl
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
\`\`\`

**En el stack de la aplicación** (\`app/main.tf\`):
\`\`\`hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "mi-empresa-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  ami       = "ami-0c02fb55956c7d316"
  subnet_id = data.terraform_remote_state.network.outputs.private_subnet_ids[0]
}
\`\`\`

### 📖 Workspaces: un código, múltiples entornos

Los workspaces permiten tener múltiples instancias de estado para la misma configuración. Es conceptualmente similar a las ramas de Git, pero para el estado de infraestructura.

**Gestión de workspaces:**

\`\`\`bash
terraform workspace list          # Lista workspaces (el activo lleva *)
terraform workspace new staging   # Crea y activa workspace "staging"
terraform workspace select prod   # Cambia al workspace "prod"
terraform workspace show          # Muestra el workspace activo
terraform workspace delete dev    # Elimina workspace (debe estar vacío)
\`\`\`

Cada workspace tiene su propio estado en el backend:

\`\`\`
s3://mi-bucket/
├── prod/terraform.tfstate         (workspace default)
└── env:/
    ├── staging/prod/terraform.tfstate
    └── dev/prod/terraform.tfstate
\`\`\`

**Usar el workspace en el código:**

\`\`\`hcl
locals {
  instance_type = {
    default = "t3.medium"
    staging = "t3.small"
    dev     = "t3.micro"
  }
}

resource "aws_instance" "app" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = local.instance_type[terraform.workspace]

  tags = {
    Environment = terraform.workspace
    Name        = "\${terraform.workspace}-app-server"
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "\${terraform.workspace}-mi-empresa-assets"
}
\`\`\`

### 📖 Limitaciones de workspaces y cuándo usar cuentas separadas

Los workspaces son convenientes para diferencias menores entre entornos, pero tienen limitaciones importantes:

**Comparten el mismo backend**: todos los workspaces usan el mismo bucket S3 y las mismas credenciales. No hay aislamiento de permisos.

**Comparten el mismo código de providers**: si dev necesita el provider de AWS en \`us-east-1\` y prod en \`eu-west-1\`, los workspaces no lo gestionan elegantemente.

**Para aislamiento real** (especialmente prod vs. no-prod), la práctica recomendada es usar **cuentas de AWS separadas** con backends separados en cada cuenta. Los workspaces son apropiados para diferencias de configuración (tamaño de instancia, número de réplicas), no para separación de seguridad.

### 📖 Configuración parcial del backend

Para evitar hardcodear credenciales sensibles o valores que varían por entorno en el código del backend, puedes usar configuración parcial:

\`\`\`hcl
# backend.tf (solo la estructura, sin valores sensibles)
terraform {
  backend "s3" {}
}
\`\`\`

\`\`\`bash
# Pasar la configuración en tiempo de init
terraform init \\
  -backend-config="bucket=mi-empresa-terraform-state" \\
  -backend-config="key=prod/terraform.tfstate" \\
  -backend-config="region=us-east-1" \\
  -backend-config="dynamodb_table=terraform-locks"
\`\`\`

O con un archivo de configuración del backend:

\`\`\`hcl
# backend-prod.hcl
bucket         = "mi-empresa-terraform-state"
key            = "prod/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
\`\`\`

\`\`\`bash
terraform init -backend-config=backend-prod.hcl
\`\`\`

### 📋 Lo que debes recordar

* El estado local es inadecuado para equipos: sin compartición real, sin locking, sin historial.
* El backend S3 + DynamoDB es el estándar para AWS: S3 almacena el estado, DynamoDB gestiona el locking.
* Habilita versionado S3 y cifrado KMS para proteger el estado en producción.
* \`terraform_remote_state\` permite que diferentes stacks se comuniquen a través de sus outputs.
* Los workspaces son útiles para variaciones de configuración entre entornos, no para aislamiento de seguridad.
* Para aislamiento real (prod vs. dev), usa cuentas separadas con backends independientes.
* La configuración parcial del backend permite separar credenciales del código versionado.

### 🧪 Autoevaluación

1. ¿Qué sucede exactamente cuando dos ingenieros ejecutan \`terraform apply\` simultáneamente con el backend S3 + DynamoDB configurado?
2. ¿Qué hace \`terraform init -migrate-state\` y cuándo necesitas ejecutarlo?
3. ¿Cuál es la principal limitación de los workspaces para gestionar entornos de producción vs. desarrollo, y cuál es la alternativa recomendada?

---

1. El primer \`apply\` escribe un registro de bloqueo en DynamoDB. El segundo intento detecta ese bloqueo, muestra el mensaje de error con los detalles del bloqueo activo (quién lo tiene, cuándo comenzó), y aborta. Una vez que el primero termina y libera el bloqueo, el segundo puede proceder.
2. \`terraform init -migrate-state\` detecta que ya existe un estado local (\`terraform.tfstate\`) y ofrece copiarlo al nuevo backend remoto configurado. Se necesita la primera vez que se configura un backend en un proyecto existente que tenía estado local.
3. Los workspaces comparten el mismo backend y las mismas credenciales, sin aislamiento real de permisos. Un operador con acceso al workspace \`dev\` también tiene acceso al workspace \`prod\`. La alternativa recomendada son cuentas de AWS separadas con backends independientes en cada cuenta, lo que garantiza aislamiento de IAM, billing, y configuración de providers.
`

export default content
