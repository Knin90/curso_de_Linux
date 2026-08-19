const content = `
## Módulo 5 — CI/CD fundamentos: pipelines, stages y artifacts

### 🎯 Objetivos de aprendizaje
* Entender la diferencia entre Integración Continua, Entrega Continua y Despliegue Continuo
* Conocer la anatomía de un pipeline: triggers, stages, jobs y artifacts
* Implementar secretos de forma segura en CI
* Diseñar estrategias de rollback para deployments en servidores Linux
* Comprender la promoción de environments: dev → staging → prod

### ❓ El problema real
El equipo sube código que funciona en su máquina pero falla en producción. Los deploys son manuales, lentos y propensos a errores humanos. Necesitan un pipeline que automatice el build, los tests y el deploy de forma reproducible.

### 📖 Definiciones fundamentales

**Continuous Integration (CI)**: cada push/PR dispara automáticamente un build y una suite de tests. El objetivo es detectar problemas de integración lo antes posible.

**Continuous Delivery (CD — Entrega)**: el software está siempre en un estado deployable. El deploy a producción sigue siendo un paso manual (un botón o aprobación).

**Continuous Deployment (CD — Despliegue)**: cada merge a la rama principal se despliega automáticamente a producción sin intervención humana. Requiere alta confianza en los tests.

\`\`\`diagram
{"type":"nested","container":{"title":"Pipeline","meta":"Duración típica: 3-15 minutos · CI llega hasta test · Continuous Delivery hasta staging (deploy prod manual) · Continuous Deployment hasta prod (automático)"},"items":[{"name":"trigger","icon":"pipeline"},{"name":"checkout"},{"name":"build"},{"name":"test"},{"name":"deploy","focal":true}],"external":[{"name":"Developer push","icon":"user","side":"left"}]}
\`\`\`

### 📖 Anatomía de un pipeline

Un pipeline se compone de **stages** (fases) que se ejecutan en orden. Dentro de cada stage hay **jobs** que pueden correr en paralelo:

\`\`\`diagram
{"type":"nested","container":{"title":"Pipeline: main push"},"items":[{"name":"Build","meta":"compile + lint","icon":"package"},{"name":"Test","meta":"unit-tests · integration-tests · security-scan (en paralelo)","icon":"bug"},{"name":"Package","meta":"docker-build + docker-push","icon":"package"},{"name":"Deploy Staging","meta":"deploy-to-staging (auto)"},{"name":"Smoke tests","meta":"health-check + e2e (auto)"},{"name":"Deploy Production","meta":"deploy-to-prod (manual approval)","focal":true}]}
\`\`\`

### 📖 Artifacts

Los artifacts son archivos generados por un job que se preservan entre stages o se descargan al terminar el pipeline:

\`\`\`yaml
# Tipos comunes de artifacts:
# - Binarios compilados (.jar, binario Go, bundle JS)
# - Imágenes Docker (en registry, no en el sistema de archivos)
# - Reportes de cobertura de tests
# - Reportes de seguridad (SAST, DAST)
# - Paquetes (.deb, .rpm, .tar.gz)
# - Manifiestos de dependencias (lockfiles)

# Principio: un artifact se construye UNA VEZ y se promueve entre environments.
# NUNCA rebuilding en cada environment (diferente código = no reproducible).
\`\`\`

### 📖 Gestión de secretos en CI

**Reglas de oro:**
1. Nunca escribir secretos en el código ni en archivos de configuración versionados
2. Usar las variables de entorno secretas del sistema de CI
3. Los secretos no deben aparecer en los logs (los CI los enmascaran automáticamente)
4. Usar secretos de solo lectura para ambientes de CI; los de producción deben tener más restricciones

\`\`\`bash
# En GitHub Actions: Settings → Secrets and variables → Actions
# Los secretos se exponen como variables de entorno con secrets.*

# En el pipeline:
env:
  DATABASE_URL: \${{ secrets.DATABASE_URL }}
  API_KEY: \${{ secrets.PROD_API_KEY }}

# Para SSH keys (deploy):
# 1. Generar par de llaves sin passphrase
ssh-keygen -t ed25519 -C "ci-deploy" -f ~/.ssh/ci_deploy -N ""

# 2. Agregar la llave pública al servidor
cat ~/.ssh/ci_deploy.pub >> /home/deploy/.ssh/authorized_keys

# 3. Guardar la llave PRIVADA como secreto en CI
# (el contenido completo de ~/.ssh/ci_deploy)

# En el pipeline: usar el secreto para SSH
- name: Deploy via SSH
  run: |
    mkdir -p ~/.ssh
    echo "\${{ secrets.DEPLOY_KEY }}" > ~/.ssh/id_ed25519
    chmod 600 ~/.ssh/id_ed25519
    ssh-keyscan -H mi-servidor.com >> ~/.ssh/known_hosts
    ssh deploy@mi-servidor.com "cd /app && git pull && systemctl restart myapp"
\`\`\`

### 📖 Environments y promoción

La promoción asegura que el mismo artifact pasa por ambientes en orden:

\`\`\`
DEV          STAGING          PRODUCTION
────         ───────          ──────────
auto-deploy  auto-deploy      manual approval
mínimo test  full test suite  smoke tests post-deploy
datos fake   datos anonimatos datos reales
\`\`\`

**Environment variables por ambiente:**
\`\`\`bash
# Variables de entorno típicas por ambiente:
# DEV
APP_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgres://localhost/myapp_dev

# STAGING
APP_ENV=staging
LOG_LEVEL=info
DATABASE_URL=postgres://staging-db/myapp_staging

# PRODUCTION
APP_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgres://prod-db/myapp_prod
\`\`\`

### 📖 Deployments idempotentes

Un deployment idempotente puede ejecutarse múltiples veces sin efectos secundarios inesperados:

\`\`\`bash
#!/bin/bash
# deploy.sh — Script de deploy idempotente

set -euo pipefail

APP_DIR="/var/www/myapp"
APP_USER="www-data"
SERVICE_NAME="myapp"

echo "=== Deploy iniciado: \$(date) ==="

# 1. Pull del código (idempotente: siempre lleva al mismo estado)
cd "\$APP_DIR"
git fetch origin main
git reset --hard origin/main

# 2. Instalar dependencias (idempotente si hay lockfile)
npm ci --production

# 3. Migraciones de base de datos (deben ser idempotentes)
npm run db:migrate

# 4. Reiniciar el servicio
systemctl reload-or-restart "\$SERVICE_NAME"

# 5. Health check
sleep 5
curl --fail --silent http://localhost:3000/health || {
  echo "✗ Health check falló — iniciando rollback"
  exit 1
}

echo "=== Deploy exitoso: \$(date) ==="
\`\`\`

### 📖 Estrategias de rollback

**Blue-Green Deployment:**
\`\`\`bash
# Tienes dos entornos idénticos: Blue (activo) y Green (inactivo)
# Deploy va a Green, luego cambias el load balancer

# Nginx config: /etc/nginx/conf.d/myapp.conf
upstream myapp_blue {
    server 127.0.0.1:3000;
}

upstream myapp_green {
    server 127.0.0.1:3001;
}

server {
    location / {
        proxy_pass http://myapp_blue;  # Cambiar a green para deploy
    }
}

# Para rollback: simplemente apuntar de vuelta a Blue
\`\`\`

**Rollback rápido con Git:**
\`\`\`bash
# En el servidor: mantener el SHA del último deploy exitoso
LAST_GOOD_SHA=\$(cat /var/www/myapp/.last-good-deploy)

# Rollback
cd /var/www/myapp
git reset --hard "\$LAST_GOOD_SHA"
npm ci --production
systemctl restart myapp

# Guardar SHA después de deploy exitoso
git rev-parse HEAD > /var/www/myapp/.last-good-deploy
\`\`\`

### 📖 Métricas clave de un pipeline

| Métrica | Objetivo | Señal de alerta |
|---------|----------|-----------------|
| Pipeline duration | < 10 min | > 15 min |
| Test pass rate | > 95% | < 90% |
| Deploy frequency | ≥ 1/día (web) | < 1/semana |
| Change failure rate | < 5% | > 15% |
| Mean time to recovery (MTTR) | < 1 hora | > 4 horas |

Estas son las **DORA metrics** (DevOps Research and Assessment), el estándar de la industria para medir madurez de CI/CD.

### 📋 Lo que debes recordar
* CI = build+test automático en cada push; CD (delivery) = siempre deployable; CD (deployment) = deploy automático a prod
* Un pipeline tiene stages secuenciales con jobs paralelos dentro de cada stage
* Los artifacts se construyen UNA VEZ y se promueven entre environments (nunca rebuild)
* Los secretos van en las variables de entorno del CI, nunca en el código ni en los logs
* Los deployments deben ser idempotentes para poder ejecutarse múltiples veces de forma segura
* Blue-green y git reset --hard son las estrategias de rollback más comunes

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre Continuous Delivery y Continuous Deployment?
2. ¿Por qué es importante que un deployment sea idempotente?
3. ¿Qué son las DORA metrics y para qué sirven?

---

1. En Continuous Delivery el deploy a producción requiere una aprobación manual (un humano decide cuándo). En Continuous Deployment cada merge a la rama principal dispara un deploy automático a producción sin intervención humana.
2. Un deployment idempotente puede ejecutarse varias veces con el mismo resultado. Esto es crítico porque los pipelines de CI/CD pueden fallar y reejecutarse, y en situaciones de rollback o retry el sistema debe quedar en un estado consistente sin efectos secundarios acumulados (ej: evitar que las migraciones de BD se ejecuten dos veces).
3. Las DORA metrics son cuatro indicadores del DevOps Research and Assessment program que miden la madurez del proceso de entrega de software: deployment frequency (frecuencia de deploy), lead time for changes (tiempo desde commit hasta producción), change failure rate (porcentaje de deploys que causan incidentes) y mean time to recovery (tiempo promedio en recuperarse de un fallo).
`

export default content
