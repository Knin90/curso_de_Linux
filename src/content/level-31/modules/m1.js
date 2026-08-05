const content = `
## Módulo 1 — IaC declarativo: conceptos y ventajas sobre scripting imperativo

### 🎯 Objetivos de aprendizaje

* Comprender la diferencia fundamental entre infraestructura imperativa y declarativa.
* Entender qué es la idempotencia y por qué es crítica en la gestión de infraestructura.
* Identificar los problemas de configuración drift y cómo IaC los resuelve.
* Situar Terraform dentro del ecosistema de herramientas IaC y entender su alcance.

### ❓ El problema real

Tu equipo ha crecido y ahora hay cinco ingenieros que despliegan servidores. Cada uno usa sus propios scripts bash, con variables distintas, pasos en diferente orden, y sin documentación actualizada. El entorno de staging tiene paquetes distintos a producción porque alguien "arregló algo manualmente" hace tres meses. No hay registro de quién cambió qué ni cuándo. Cuando hay un incidente, nadie sabe cuál es el estado real de la infraestructura. Este es el problema que Infrastructure as Code resuelve.

### 📖 El enfoque imperativo: scripts y pasos manuales

El enfoque tradicional para provisionar infraestructura es imperativo: describes una secuencia de pasos para llegar al estado deseado.

\`\`\`bash
#!/bin/bash
# Script imperativo para crear un servidor web
# Problema: ¿qué pasa si lo ejecutas dos veces?

# Crear instancia EC2
INSTANCE_ID=\$(aws ec2 run-instances \\
  --image-id ami-0c55b159cbfafe1f0 \\
  --instance-type t2.micro \\
  --query 'Instances[0].InstanceId' \\
  --output text)

echo "Instancia creada: \$INSTANCE_ID"

# Crear security group (falla si ya existe)
aws ec2 create-security-group \\
  --group-name "web-sg" \\
  --description "Web server security group"

# Añadir regla (falla si ya existe)
aws ec2 authorize-security-group-ingress \\
  --group-name "web-sg" \\
  --protocol tcp \\
  --port 80 \\
  --cidr 0.0.0.0/0
\`\`\`

Problemas evidentes de este enfoque:

1. **No es idempotente**: ejecutarlo dos veces crea dos instancias y falla en el security group.
2. **No hay gestión de estado**: el script no sabe qué ya existe.
3. **Sin rollback**: si falla a la mitad, el estado queda inconsistente.
4. **Difícil de auditar**: no hay forma de saber qué se ejecutó y cuándo.

### 📖 El enfoque declarativo: estado deseado

En el enfoque declarativo describes el estado final que quieres, no los pasos para llegar a él. El motor de IaC calcula la diferencia entre el estado actual y el deseado, y aplica solo los cambios necesarios.

\`\`\`hcl
# Terraform: enfoque declarativo
# Esto describe QUÉ quieres, no CÓMO crearlo

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "web-server"
  }
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web server security group"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
\`\`\`

Ejecutar \`terraform apply\` dos veces produce el mismo resultado: Terraform compara el estado deseado con el estado real y no hace nada si ya coinciden. Eso es idempotencia.

### 📖 Los cuatro pilares de IaC

**1. Idempotencia**

Aplicar la misma configuración múltiples veces siempre produce el mismo resultado. Terraform logra esto manteniendo un archivo de estado que registra los recursos que ha creado.

**2. Detección de drift**

Con el tiempo, alguien modifica un recurso manualmente en la consola de AWS. Esto es drift: la realidad diverge de lo que está en el código. Terraform detecta esto:

\`\`\`bash
terraform plan
# Output:
# ~ aws_instance.web
#   instance_type: "t2.micro" -> "t2.small"  # alguien lo cambió manualmente
\`\`\`

**3. Versionado de infraestructura**

Como la infraestructura está en archivos \`.tf\`, vive en Git. Puedes ver la historia completa, hacer code review de cambios, revertir a versiones anteriores, y aplicar branching strategies:

\`\`\`bash
git log --oneline infra/
# a3f9d12 feat: escalar instancias RDS a db.t3.medium
# b7e2c41 fix: añadir puerto 443 al security group
# 9d1a8f0 feat: añadir bucket S3 para backups
\`\`\`

**4. Colaboración y revisión**

Los cambios de infraestructura pasan por pull requests, igual que el código de aplicación. El equipo revisa, discute, aprueba, y hay un registro completo de quién aprobó qué y por qué.

### 📖 Comparación de herramientas IaC

Cada herramienta tiene un alcance diferente. No son competidoras directas en todos los casos:

| Herramienta | Paradigma | Alcance principal | Lenguaje |
|-------------|-----------|-------------------|----------|
| **Terraform / OpenTofu** | Declarativo | Provisionamiento de infraestructura | HCL |
| **Ansible** | Procedural/Declarativo | Gestión de configuración, orquestación | YAML |
| **Pulumi** | Declarativo | Provisionamiento (como Terraform) | Python, TS, Go... |
| **CloudFormation** | Declarativo | Solo AWS | YAML/JSON |
| **Chef / Puppet** | Declarativo | Gestión de configuración | DSL propio |

La división clave es entre **provisioning** (crear la infraestructura: servidores, redes, bases de datos) y **configuration management** (configurar lo que ya existe: instalar paquetes, gestionar archivos de configuración). Terraform es el estándar de facto para provisioning multi-cloud.

**Terraform vs OpenTofu**: En 2023, HashiCorp cambió la licencia de Terraform de open-source (MPL 2.0) a BSL. OpenTofu es el fork comunitario open-source mantenido por la Linux Foundation. Ambos son funcionalmente equivalentes para este curso.

### 📖 El flujo de trabajo IaC en un equipo

\`\`\`text
Desarrollador
     │
     ▼
  Escribe/modifica .tf files
     │
     ▼
  git commit + push
     │
     ▼
  Pull Request → revisión por el equipo
     │
     ▼
  CI ejecuta terraform plan → muestra los cambios
     │
     ▼
  Aprobación del PR
     │
     ▼
  Merge → CD ejecuta terraform apply
     │
     ▼
  Infraestructura actualizada
\`\`\`

Este flujo garantiza que ningún cambio de infraestructura ocurra sin revisión, documentación y aprobación.

### 📋 Lo que debes recordar

* El enfoque imperativo (scripts bash) no es idempotente y no gestiona estado. IaC declarativo sí lo es.
* Terraform describe el estado deseado; el motor calcula y aplica solo los cambios necesarios.
* Drift es cuando la infraestructura real diverge del código — Terraform lo detecta con \`terraform plan\`.
* Terraform es para provisioning (crear infraestructura); Ansible es para configuration management (configurarla). Se complementan.
* OpenTofu es el fork open-source de Terraform, funcionalmente equivalente.

### 🧪 Autoevaluación

1. ¿Por qué ejecutar un script bash de provisioning dos veces puede ser problemático, y cómo Terraform resuelve ese problema?
2. ¿Qué es el "drift" de configuración y qué comando de Terraform lo detecta?
3. Un colega sugiere usar Ansible en lugar de Terraform para crear instancias EC2. ¿Qué le respondes?

---

1. Un script bash imperativo no tiene noción de estado: si el recurso ya existe, intentará crearlo de nuevo (generando duplicados o errores). Terraform mantiene un archivo de estado (\`terraform.tfstate\`) que registra qué recursos ha creado. Al ejecutarlo de nuevo, compara el estado deseado con el estado registrado y con la infraestructura real, aplicando solo los cambios necesarios. Resultado: idempotencia garantizada.
2. Drift es la divergencia entre el estado real de la infraestructura (modificada manualmente o por otros procesos) y el estado declarado en los archivos \`.tf\`. El comando \`terraform plan\` lo detecta consultando el estado actual de cada recurso vía la API del provider y comparándolo con la configuración declarada, mostrando las diferencias como cambios pendientes.
3. Ansible puede provisionar instancias EC2 (tiene módulos para ello), pero está optimizado para gestión de configuración: instalar paquetes, gestionar archivos, ejecutar comandos. Terraform está diseñado específicamente para provisioning de infraestructura y ofrece mejor gestión de dependencias entre recursos, detección de drift, estado remoto compartido en equipo, y plan/apply cycle más robusto. La recomendación habitual es Terraform para crear la infraestructura y Ansible para configurarla una vez creada.
`

export default content
