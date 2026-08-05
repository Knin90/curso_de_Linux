const content = `
## Módulo 6 — GitHub Actions: workflows para deploy en Linux

### 🎯 Objetivos de aprendizaje
* Crear workflows de GitHub Actions para integración y despliegue continuos
* Comprender los triggers disponibles y cuándo usar cada uno
* Usar contextos y secretos para parametrizar pipelines de forma segura
* Implementar despliegues SSH y rsync a servidores Linux
* Construir imágenes Docker y publicarlas con GitHub Actions
* Controlar el flujo con condicionales, dependencias entre jobs y artefactos

### ❓ El problema real

Tu equipo hace deploy a mano: alguien se conecta por SSH, ejecuta \`git pull\`, reinicia el servicio y reza para que no haya errores. Un lunes, dos personas hacen deploy simultáneo. El servidor queda en estado inconsistente y la app cae. ¿Cómo automatizar el proceso para que cada push a \`main\` despliegue de forma confiable, reproducible y sin intervención humana?

### 📖 Estructura de un workflow

GitHub Actions vive en \`.github/workflows/\`. Cada archivo YAML define un workflow independiente.

\`\`\`yaml
# .github/workflows/deploy.yml
name: CI/CD Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:          # disparo manual desde la UI de GitHub
  schedule:
    - cron: '0 3 * * *'       # cada día a las 03:00 UTC

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
\`\`\`

**Triggers principales:**
| Trigger | Cuándo usar |
|---|---|
| \`push\` | deploy automático al fusionar |
| \`pull_request\` | validar antes de merge |
| \`workflow_dispatch\` | deploy manual bajo demanda |
| \`schedule\` | tareas programadas (backups, reportes) |

### 📖 Contextos y secretos

GitHub Actions expone información del entorno a través de contextos. Se accede con la sintaxis \`\${{ expresión }}\`.

\`\`\`yaml
steps:
  - name: Mostrar información del contexto
    run: |
      echo "Rama: \${{ github.ref }}"
      echo "Commit: \${{ github.sha }}"
      echo "Actor: \${{ github.actor }}"
      echo "Entorno: \${{ vars.ENVIRONMENT }}"

  - name: Usar un secreto
    run: echo "Clave configurada: \${{ secrets.MY_SECRET != '' }}"
    env:
      API_KEY: \${{ secrets.MY_SECRET }}
\`\`\`

**Contextos más usados:**
* \`\${{ github.ref }}\` — rama o tag que disparó el workflow (ej. \`refs/heads/main\`)
* \`\${{ github.sha }}\` — hash completo del commit
* \`\${{ github.actor }}\` — usuario que disparó el workflow
* \`\${{ secrets.NOMBRE }}\` — secreto cifrado, nunca visible en logs
* \`\${{ vars.NOMBRE }}\` — variable de entorno del repositorio (no cifrada)
* \`\${{ github.run_number }}\` — número incremental del workflow

> **Regla:** datos sensibles (claves SSH, tokens, contraseñas) siempre en \`secrets\`. Configuración no sensible en \`vars\`.

### 📖 Steps esenciales

\`\`\`yaml
steps:
  # Clonar el repositorio
  - uses: actions/checkout@v4

  # Configurar Node.js
  - uses: actions/setup-node@v4
    with:
      node-version: '20'

  # Cache de dependencias (acelera builds sucesivos)
  - uses: actions/cache@v4
    with:
      path: ~/.npm
      key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        \${{ runner.os }}-node-

  # Instalar y testear
  - name: Instalar dependencias y ejecutar tests
    run: npm ci && npm test

  # Cache para proyectos Python
  - uses: actions/cache@v4
    with:
      path: ~/.cache/pip
      key: \${{ runner.os }}-pip-\${{ hashFiles('**/requirements.txt') }}
\`\`\`

### 📖 Deploy por SSH a servidor Linux

Almacena estas variables como **GitHub Secrets** en tu repositorio:
* \`SSH_PRIVATE_KEY\` — clave privada sin passphrase
* \`SERVER_HOST\` — IP o dominio del servidor
* \`SERVER_USER\` — usuario con acceso a la app

\`\`\`yaml
  - name: Deploy al servidor vía SSH
    uses: appleboy/ssh-action@v1
    with:
      host: \${{ secrets.SERVER_HOST }}
      username: \${{ secrets.SERVER_USER }}
      key: \${{ secrets.SSH_PRIVATE_KEY }}
      script: |
        cd /app
        git pull origin main
        npm ci --production
        systemctl restart app
\`\`\`

### 📖 Deploy con rsync

Rsync es ideal para sincronizar archivos estáticos o distribuciones compiladas:

\`\`\`yaml
  - name: Instalar clave SSH
    run: |
      mkdir -p ~/.ssh
      echo "\${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
      chmod 600 ~/.ssh/id_rsa
      ssh-keyscan -H \${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

  - name: Build
    run: npm run build

  - name: Sync al servidor
    run: |
      rsync -avz --delete ./dist/ \
        \${{ secrets.SERVER_USER }}@\${{ secrets.SERVER_HOST }}:/var/www/myapp/
\`\`\`

### 📖 Build y push de imagen Docker

\`\`\`yaml
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login a Docker Hub
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build y push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            miusuario/miapp:latest
            miusuario/miapp:\${{ github.sha }}
\`\`\`

### 📖 Environments con aprobación manual

Para produción crítica, configura un **Environment** en GitHub con revisores requeridos. El deploy queda pausado hasta que alguien lo apruebe.

\`\`\`yaml
jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment: production        # requiere aprobación si está configurado
    steps:
      - name: Deploy a producción
        run: ./scripts/deploy.sh
\`\`\`

Configura los revisores en: Settings → Environments → production → Required reviewers.

### 📖 Condicionales y dependencias entre jobs

\`\`\`yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  build:
    needs: test                    # espera a que test pase
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  deploy:
    needs: [test, build]           # espera ambos
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'   # solo en main
    steps:
      - name: Solo si build fue exitoso
        if: success()
        run: ./deploy.sh

      - name: Notificar fallo
        if: failure()
        run: ./notify-failure.sh
\`\`\`

### 📖 Artefactos entre jobs

Los jobs corren en máquinas separadas. Para pasar archivos entre ellos, usa artefactos:

\`\`\`yaml
  build:
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist-files
          path: dist/
          retention-days: 1

  deploy:
    needs: build
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist-files
          path: dist/
      - run: rsync -avz dist/ usuario@servidor:/var/www/
\`\`\`

### 📋 Lo que debes recordar
* Los workflows viven en \`.github/workflows/\` y se disparan por eventos configurados en \`on:\`
* Datos sensibles siempre en \`secrets\`, configuración no sensible en \`vars\`
* \`needs:\` define dependencias entre jobs; \`if:\` controla ejecución condicional
* \`actions/cache@v4\` puede reducir el tiempo de build de minutos a segundos
* Los artefactos son el único mecanismo para pasar archivos entre jobs distintos
* Los Environments de GitHub permiten añadir gates de aprobación humana antes del deploy

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre \`secrets\` y \`vars\` en GitHub Actions?
2. ¿Qué keyword se usa para que un job espere a que otro termine antes de ejecutarse?
3. Si necesitas pasar el directorio \`dist/\` del job \`build\` al job \`deploy\`, ¿qué actions usas?

---

1. \`secrets\` almacena valores cifrados que nunca aparecen en logs (claves, tokens). \`vars\` almacena configuración no sensible visible en texto plano.
2. \`needs:\` seguido del nombre del job o una lista de jobs: \`needs: [test, build]\`
3. \`actions/upload-artifact@v4\` en el job \`build\` y \`actions/download-artifact@v4\` en el job \`deploy\`
`

export default content
