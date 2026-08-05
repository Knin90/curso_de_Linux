const content = `
## Módulo 5 — Ciclo de vida: terraform init, plan, apply, destroy y state

### 🎯 Objetivos de aprendizaje

* Dominar los comandos fundamentales del ciclo de vida de Terraform.
* Comprender el rol del archivo \`terraform.tfstate\` como fuente de verdad.
* Operar el estado con \`terraform state\` para renombrar, inspeccionar e importar recursos.
* Aplicar el meta-argumento \`lifecycle\` para controlar comportamientos de reemplazo y protección.

### ❓ El problema real

Llevas una semana escribiendo configuración HCL y ahora quieres desplegar tu primer recurso real. Abres la terminal y escribes \`terraform apply\`. Nada funciona como esperabas: te pide confirmación, muestra símbolos extraños como \`+\`, \`~\` y \`-\`, y menciona un archivo \`.tfstate\` que nunca creaste. Además, un colega ejecutó \`apply\` al mismo tiempo y el estado quedó corrupto. Para evitar exactamente este caos, necesitas entender el ciclo de vida completo de Terraform.

### 📖 terraform init: el punto de partida

\`terraform init\` es siempre el primer comando a ejecutar en un proyecto nuevo o clonado. Realiza tres tareas críticas:

**1. Descarga de providers**

\`\`\`bash
terraform init
\`\`\`

Al ejecutarse, Terraform lee el bloque \`required_providers\` y descarga los plugins binarios correspondientes en el directorio \`.terraform/providers/\`. Estos binarios no forman parte del repositorio (se incluyen en \`.gitignore\`).

\`\`\`
.terraform/
└── providers/
    └── registry.terraform.io/
        └── hashicorp/
            └── aws/
                └── 5.0.0/
                    └── linux_amd64/
                        └── terraform-provider-aws_v5.0.0
\`\`\`

**2. Inicialización del backend**

Si hay un bloque \`backend\` configurado (S3, GCS, Terraform Cloud, etc.), \`init\` establece la conexión y migra el estado si es necesario.

**3. Instalación de módulos**

Los módulos referenciados con \`source\` se descargan en \`.terraform/modules/\`.

\`terraform init\` es idempotente: ejecutarlo múltiples veces no produce efectos secundarios. Debes re-ejecutarlo al agregar un nuevo provider, cambiar el backend, o agregar un módulo nuevo.

### 📖 terraform validate: verificación de sintaxis

\`\`\`bash
terraform validate
\`\`\`

Verifica que la configuración HCL sea sintácticamente válida y que las referencias entre recursos sean coherentes. Es una comprobación puramente local: **no realiza llamadas a la API del proveedor**, por lo que no detecta errores de autenticación ni recursos inexistentes.

Ideal para integrarlo en pipelines de CI antes de ejecutar \`plan\`:

\`\`\`bash
terraform init -backend=false && terraform validate
\`\`\`

### 📖 terraform plan: comparar estado deseado vs. estado actual

\`terraform plan\` es el comando más informativo del ciclo de vida. Compara:

* **Estado deseado**: lo que describes en los archivos \`.tf\`.
* **Estado actual**: lo que está registrado en \`terraform.tfstate\`.

El resultado muestra un plan de ejecución con símbolos claros:

| Símbolo | Significado |
|---------|-------------|
| \`+\`   | Recurso a crear |
| \`-\`   | Recurso a destruir |
| \`~\`   | Recurso a modificar in-place |
| \`-/+\` | Recurso a destruir y recrear (reemplazo) |

**Guardar el plan en un archivo:**

\`\`\`bash
terraform plan -out=plan.tfplan
\`\`\`

Esto congela exactamente lo que se ejecutará. Cualquier cambio posterior en el código no afectará a ese plan guardado. Es la práctica recomendada en entornos de producción.

**Verificar el plan guardado:**

\`\`\`bash
terraform show plan.tfplan
\`\`\`

### 📖 terraform apply: ejecutar el plan

Sin archivo de plan (requiere confirmación interactiva):

\`\`\`bash
terraform apply
\`\`\`

Con archivo de plan guardado (no pide confirmación):

\`\`\`bash
terraform apply plan.tfplan
\`\`\`

Al completarse, Terraform actualiza \`terraform.tfstate\` con los IDs y atributos reales de los recursos creados. **Nunca edites este archivo manualmente.**

Para automatización (CI/CD):

\`\`\`bash
terraform apply -auto-approve plan.tfplan
\`\`\`

### 📖 terraform destroy: eliminar infraestructura

\`terraform destroy\` ejecuta internamente un plan de destrucción para todos los recursos del estado y solicita confirmación.

\`\`\`bash
terraform destroy
\`\`\`

Con confirmación automática (úsalo con cuidado en producción):

\`\`\`bash
terraform destroy -auto-approve
\`\`\`

Para destruir un único recurso específico:

\`\`\`bash
terraform destroy -target=aws_instance.web
\`\`\`

### 📖 terraform.tfstate: la fuente de verdad

El archivo \`terraform.tfstate\` es un JSON que registra el estado real de todos los recursos gestionados:

\`\`\`json
{
  "version": 4,
  "terraform_version": "1.6.0",
  "resources": [
    {
      "type": "aws_instance",
      "name": "web",
      "provider": "provider[\\"registry.terraform.io/hashicorp/aws\\"]",
      "instances": [
        {
          "attributes": {
            "id": "i-0abc123def456",
            "instance_type": "t3.micro",
            "public_ip": "54.234.1.100"
          }
        }
      ]
    }
  ]
}
\`\`\`

Este archivo contiene IDs reales de recursos en la nube, IPs, secretos, y metadatos de dependencias. **Nunca lo cometas en Git sin cifrado**, y **nunca lo edites manualmente**.

### 📖 Comandos terraform state

**Listar todos los recursos rastreados:**

\`\`\`bash
terraform state list
\`\`\`

Salida de ejemplo:
\`\`\`
aws_instance.web
aws_security_group.web_sg
aws_s3_bucket.assets
\`\`\`

**Inspeccionar un recurso específico:**

\`\`\`bash
terraform state show aws_instance.web
\`\`\`

Muestra todos los atributos del recurso tal como Terraform los conoce.

**Renombrar un recurso en el estado (sin recrearlo):**

\`\`\`bash
terraform state mv aws_instance.web aws_instance.app_server
\`\`\`

Útil cuando refactorizas el nombre de un recurso en el código y no quieres que Terraform lo destruya y recree.

**Eliminar un recurso del estado sin destruirlo:**

\`\`\`bash
terraform state rm aws_s3_bucket.legacy
\`\`\`

El recurso seguirá existiendo en la nube, pero Terraform dejará de gestionarlo. Útil para transferir gestión a otra configuración.

### 📖 terraform import: adoptar recursos existentes

Si tienes recursos creados manualmente o por otro sistema, puedes incorporarlos al estado de Terraform sin recrearlos:

\`\`\`bash
terraform import aws_instance.web i-0abc123def456
\`\`\`

El proceso requiere dos pasos:
1. Escribir el bloque de recurso en el código \`.tf\` (Terraform no genera el código por ti).
2. Ejecutar el comando \`import\` con el ID real del recurso.

Desde Terraform 1.5+, puedes usar el bloque \`import\` declarativo en HCL:

\`\`\`hcl
import {
  to = aws_instance.web
  id = "i-0abc123def456"
}
\`\`\`

### 📖 depends_on: dependencias explícitas

Terraform construye un grafo de dependencias implícito basado en referencias entre recursos. Sin embargo, a veces hay dependencias que Terraform no puede detectar (por ejemplo, una política IAM que debe existir antes de que un servicio la use, pero no hay referencia directa):

\`\`\`hcl
resource "aws_instance" "app" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"

  depends_on = [aws_iam_role_policy.app_policy]
}
\`\`\`

Usa \`depends_on\` con moderación: las referencias implícitas son preferibles porque Terraform las gestiona automáticamente.

### 📖 lifecycle: controlar el comportamiento de reemplazo

El meta-argumento \`lifecycle\` permite modificar cómo Terraform gestiona cambios que requieren reemplazo:

**create_before_destroy: reemplazo sin tiempo de inactividad**

\`\`\`hcl
resource "aws_instance" "web" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true
  }
}
\`\`\`

Por defecto, Terraform destruye el recurso antes de crear el reemplazo. Con \`create_before_destroy = true\`, crea el nuevo primero y luego destruye el viejo. Esencial para cargas de trabajo con alta disponibilidad.

**prevent_destroy: protección contra eliminación accidental**

\`\`\`hcl
resource "aws_rds_instance" "production" {
  identifier = "prod-db"
  engine     = "postgres"

  lifecycle {
    prevent_destroy = true
  }
}
\`\`\`

Si alguien ejecuta \`terraform destroy\` o hace un cambio que requiere reemplazar este recurso, Terraform abortará con un error. Es la red de seguridad para bases de datos y recursos críticos.

**ignore_changes: ignorar deriva en atributos específicos**

\`\`\`hcl
resource "aws_instance" "web" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }

  lifecycle {
    ignore_changes = [tags["Environment"]]
  }
}
\`\`\`

Útil cuando otros sistemas (como AWS Config o herramientas de billing) modifican ciertos atributos automáticamente y no quieres que Terraform los revierta.

### 📖 terraform refresh y replace

**terraform apply -refresh-only** (reemplaza al deprecated \`terraform refresh\`):

\`\`\`bash
terraform apply -refresh-only
\`\`\`

Sincroniza el estado con la realidad de la nube sin aplicar cambios. Útil para detectar deriva (drift) entre el estado y la infraestructura real.

**terraform apply -replace** (reemplaza al deprecated \`terraform taint\`):

\`\`\`bash
terraform apply -replace="aws_instance.web"
\`\`\`

Fuerza la recreación de un recurso específico, aunque Terraform no detecte cambios. Útil cuando un recurso está en mal estado y necesitas un reemplazo limpio.

### 📋 Lo que debes recordar

* El flujo estándar es siempre: \`init\` → \`validate\` → \`plan -out=plan.tfplan\` → \`apply plan.tfplan\`.
* \`terraform.tfstate\` es la fuente de verdad: nunca lo edites manualmente ni lo cometas en Git sin cifrado.
* \`terraform state mv\` renombra recursos sin recrearlos; \`terraform state rm\` los desvincula sin destruirlos.
* \`terraform import\` adopta recursos existentes, pero requiere que escribas el código HCL manualmente.
* \`lifecycle.prevent_destroy\` es la red de seguridad para recursos críticos como bases de datos.
* \`create_before_destroy\` garantiza reemplazos sin tiempo de inactividad.
* \`ignore_changes\` evita que Terraform revierta cambios gestionados por sistemas externos.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`terraform apply\` y \`terraform apply plan.tfplan\`?
2. ¿Qué hace \`terraform state rm\` y en qué caso lo usarías?
3. Tienes una base de datos RDS en producción. ¿Qué configuración de \`lifecycle\` añadirías para evitar su eliminación accidental, y qué sucede si igualmente ejecutas \`terraform destroy\`?

---

1. Sin archivo de plan, \`apply\` genera un nuevo plan en el momento y pide confirmación interactiva; puede diferir del plan anterior si el código cambió. Con \`plan.tfplan\`, ejecuta exactamente el plan guardado sin confirmación, garantizando que no hay sorpresas.
2. \`terraform state rm\` elimina el recurso del estado de Terraform sin destruirlo en la nube. Se usa cuando quieres dejar de gestionar un recurso con esa configuración (por ejemplo, para transferirlo a otra configuración de Terraform o gestión manual).
3. Se añade \`lifecycle { prevent_destroy = true }\`. Si se ejecuta \`terraform destroy\`, Terraform abortará con el error \`Error: Instance cannot be destroyed\`, protegiendo el recurso. Para destruirlo, primero debes eliminar ese bloque \`lifecycle\` del código.
`

export default content
