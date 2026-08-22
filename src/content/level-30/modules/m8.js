const content = `
## Módulo 8 — Proyecto real: pipeline CI/CD completo para servidor Linux

### 🎯 Objetivos de aprendizaje
* Construir un pipeline CI/CD funcional de extremo a extremo
* Combinar pre-commit hooks, GitHub Actions y despliegue por SSH
* Aplicar versionado semántico integrado en el flujo de entrega
* Verificar el ciclo completo: commit local → CI en nube → deploy en producción

### ❓ El problema real

Los módulos anteriores enseñaron cada pieza por separado. Este laboratorio las une en un sistema real: una aplicación Node.js con tests, que se valida localmente antes del commit, se testea en CI al hacer push, y se despliega automáticamente al servidor Linux cuando pasa todo.

### 📖 Estructura del proyecto

**Requisitos previos:**
* Repositorio en GitHub con una app Express básica
* Servidor Linux (VPS, EC2, Digital Ocean) con acceso SSH
* App corriendo como servicio systemd o proceso pm2
* GitHub Secrets configurados: \`SSH_PRIVATE_KEY\`, \`SERVER_HOST\`, \`SERVER_USER\`

**Estructura del proyecto:**
\`\`\`
myapp/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml
│       └── release.yml
├── .githooks/
│   ├── pre-commit
│   └── commit-msg
├── src/
│   └── app.js
├── tests/
│   └── app.test.js
├── package.json
└── VERSION
\`\`\`

**package.json mínimo:**
\`\`\`json
{
  "name": "myapp",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/app.js",
    "test": "jest",
    "lint": "eslint src/",
    "build": "echo 'build step'"
  },
  "dependencies": { "express": "^4.18.0" },
  "devDependencies": { "jest": "^29.0.0", "eslint": "^8.0.0" }
}
\`\`\`

### 📖 Paso 1 — Pre-commit hook (gate de calidad local)

El hook se ejecuta antes de cada commit. Si falla, el commit se cancela.

**Crear el hook compartible con el equipo:**
\`\`\`bash
mkdir -p .githooks
\`\`\`

**.githooks/pre-commit:**
\`\`\`bash
#!/bin/bash
set -e

echo "→ Ejecutando lint..."
npm run lint --if-present

echo "→ Ejecutando tests..."
npm test --if-present

echo "✓ Pre-commit OK"
exit 0
\`\`\`

\`\`\`bash
chmod +x .githooks/pre-commit

# Configurar Git para usar el directorio de hooks del proyecto
git config core.hooksPath .githooks

# Cada integrante del equipo debe ejecutar este comando al clonar:
# git config core.hooksPath .githooks
\`\`\`

**Hook commit-msg para validar Conventional Commits:**

**.githooks/commit-msg:**
\`\`\`bash
#!/bin/bash
commit_msg=\$(cat "\$1")
pattern="^(feat|fix|chore|docs|style|refactor|test|ci|perf)(\\([a-z-]+\\))?(!)?: .{1,72}"

if ! echo "\$commit_msg" | grep -qP "\$pattern"; then
  echo "✗ Formato de commit inválido."
  echo "  Usa: tipo(scope): descripción"
  echo "  Ejemplos: feat: añadir login, fix(auth): corregir token"
  exit 1
fi
exit 0
\`\`\`

\`\`\`bash
chmod +x .githooks/commit-msg
\`\`\`

### 📖 Paso 2 — GitHub Actions workflow principal

**.github/workflows/ci-cd.yml:**
\`\`\`yaml
name: CI/CD

on:
  push:
    branches: [main, 'feature/**']
  pull_request:
    branches: [main]

jobs:
  # ─────────────────────────────────────────
  # JOB 1: Tests
  # ─────────────────────────────────────────
  test:
    name: Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}
          restore-keys: \${{ runner.os }}-node-

      - name: Instalar dependencias
        run: npm ci

      - name: Lint
        run: npm run lint --if-present

      - name: Tests
        run: npm test -- --coverage

      - name: Subir resultados de tests
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: coverage/
          retention-days: 7

  # ─────────────────────────────────────────
  # JOB 2: Build
  # ─────────────────────────────────────────
  build:
    name: Build
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}

      - name: Instalar dependencias de producción
        run: npm ci --production

      - name: Build
        run: npm run build --if-present

      - name: Empaquetar artefacto
        run: tar -czf app.tar.gz src/ package.json package-lock.json

      - name: Subir artefacto
        uses: actions/upload-artifact@v4
        with:
          name: app-artifact
          path: app.tar.gz
          retention-days: 1

  # ─────────────────────────────────────────
  # JOB 3: Deploy (solo en main)
  # ─────────────────────────────────────────
  deploy:
    name: Deploy a producción
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production        # gate de aprobación opcional

    steps:
      - name: Descargar artefacto
        uses: actions/download-artifact@v4
        with:
          name: app-artifact

      - name: Instalar clave SSH
        run: |
          mkdir -p ~/.ssh
          echo "\${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H \${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      - name: Copiar artefacto al servidor
        run: |
          scp app.tar.gz \${{ secrets.SERVER_USER }}@\${{ secrets.SERVER_HOST }}:/tmp/

      - name: Deploy en servidor
        uses: appleboy/ssh-action@v1
        with:
          host: \${{ secrets.SERVER_HOST }}
          username: \${{ secrets.SERVER_USER }}
          key: \${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            set -e
            cd /opt/myapp

            # Backup de la versión actual
            cp -r . /opt/myapp-backup-\$(date +%Y%m%d%H%M%S) 2>/dev/null || true

            # Descomprimir nueva versión
            tar -xzf /tmp/app.tar.gz -C /opt/myapp/
            rm /tmp/app.tar.gz

            # Reiniciar el servicio
            # Con systemd:
            systemctl restart myapp
            # Con pm2 (alternativa):
            # pm2 restart myapp

            # Verificar que levantó
            sleep 3
            systemctl is-active myapp || exit 1

      - name: Verificar health check
        run: |
          sleep 5
          curl --fail https://\${{ secrets.SERVER_HOST }}/health || exit 1

      - name: Notificar fallo por Slack
        if: failure()
        run: |
          curl -X POST "\${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H 'Content-type: application/json' \
            -d '{"text": "❌ Deploy fallido en *\${{ github.repository }}* — commit \${{ github.sha }}"}'
\`\`\`

### 📖 Configuración del servicio systemd en el servidor

\`\`\`ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Node.js App
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node src/app.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
# Habilitar el servicio (una sola vez, en el servidor)
sudo systemctl enable myapp
sudo systemctl start myapp

# Verificar estado
sudo systemctl status myapp
\`\`\`

### 📖 Paso 3 — Versionado semántico y releases

**Workflow de release — .github/workflows/release.yml:**
\`\`\`yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generar notas de release
        id: notes
        run: |
          PREV_TAG=\$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "\$PREV_TAG" ]; then
            git log \$PREV_TAG..HEAD --pretty=format:"- %s" > release_notes.txt
          else
            git log --pretty=format:"- %s" > release_notes.txt
          fi
          cat release_notes.txt

      - name: Crear GitHub Release
        run: |
          gh release create \${{ github.ref_name }} \
            --title "Release \${{ github.ref_name }}" \
            --notes-file release_notes.txt
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

**Flujo manual de release:**
\`\`\`bash
# 1. Asegurarte de estar en main actualizado
git checkout main && git pull origin main

# 2. Crear tag anotado
git tag -a v1.0.0 -m "Initial production release"

# 3. Publicar tag (dispara el workflow de release)
git push origin v1.0.0

# 4. Verificar que la release se creó en GitHub
gh release view v1.0.0
\`\`\`

### 📖 Paso 4 — Estado del pipeline completo

**Escenario de prueba: corregir un bug y desplegarlo**

\`\`\`bash
# 1. Crear rama de feature
git checkout -b fix/login-validation

# 2. Hacer el cambio en el código
# (editar src/app.js)

# 3. Commit con Conventional Commits
git add src/app.js
git commit -m "fix: correct login validation for empty passwords"
# El hook pre-commit ejecuta lint + tests antes de completar el commit
# El hook commit-msg valida el formato

# 4. Push de la rama — dispara solo el job de tests en CI
git push origin fix/login-validation

# 5. Crear PR en GitHub
gh pr create --title "fix: correct login validation" --body "Fixes empty password crash"

# 6. Revisar que los checks pasan en el PR
gh pr checks

# 7. Mergear a main — dispara el pipeline completo: test → build → deploy
gh pr merge --squash

# 8. Verificar el deploy en el servidor
ssh deploy@\$SERVER_HOST "systemctl status myapp"
curl https://myapp.example.com/health

# 9. Ver logs del servicio si algo falló
ssh deploy@\$SERVER_HOST "journalctl -u myapp -n 50 --no-pager"
\`\`\`

**Verificar el estado del workflow desde el CLI:**
\`\`\`bash
# Ver los workflows en ejecución
gh run list --limit 5

# Ver detalle de una ejecución específica
gh run view <run-id>

# Ver logs de un job específico
gh run view <run-id> --log

# Re-ejecutar un workflow fallido
gh run rerun <run-id>
\`\`\`

### 📖 Diagnóstico de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| SSH: Permission denied | Clave pública no en \`authorized_keys\` del servidor | \`ssh-copy-id deploy@servidor\` |
| systemctl restart falla | El usuario de CI no tiene permisos sudo sin password | Añadir regla en \`/etc/sudoers\` |
| Health check timeout | App tarda en levantar | Aumentar el \`sleep\` antes de \`curl\` |
| Cache no aplica | Key de cache cambia en cada run | Revisar el \`hashFiles()\` y la ruta |
| Artefacto no encontrado | Nombre del artefacto no coincide entre jobs | Usar exactamente el mismo \`name:\` |

**Verificar permisos SSH en el servidor:**
\`\`\`bash
# La clave pública del CI debe estar aquí:
cat ~/.ssh/authorized_keys

# El usuario deploy debe poder reiniciar el servicio sin password:
# Añadir a /etc/sudoers (con visudo):
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart myapp
deploy ALL=(ALL) NOPASSWD: /bin/systemctl status myapp
\`\`\`

### 📋 Lo que debes recordar
* Los hooks de Git en \`.githooks/\` compartidos por el equipo requieren \`git config core.hooksPath .githooks\` en cada clon
* El pipeline fluye en orden: test → build → deploy, con \`needs:\` bloqueando cada etapa
* El deploy solo corre en la rama \`main\` y con \`event_name == 'push'\` (no en PRs)
* Los artefactos conectan el job de build con el de deploy sin recompilar
* El health check post-deploy valida que el servicio levantó correctamente
* Los releases se crean automáticamente al hacer push de un tag \`v*.*.*\`

### 🧪 Autoevaluación
1. ¿Por qué el job de deploy tiene la condición \`github.event_name == 'push'\` además de verificar la rama \`main\`?
2. Si el artefacto del job \`build\` se llama \`app-artifact\` pero el job \`deploy\` intenta descargarlo como \`build-output\`, ¿qué ocurre?
3. ¿Qué comando usarías para ver los últimos logs del servicio systemd en el servidor después de un deploy fallido?

---

1. Sin esa condición, los PRs apuntados a \`main\` también dispararían el deploy, ya que la rama base es \`main\`. El evento \`push\` confirma que el merge ya ocurrió.
2. El step de download falla con un error de artefacto no encontrado, bloqueando el deploy. Los nombres deben coincidir exactamente.
3. \`journalctl -u myapp -n 50 --no-pager\` (muestra las últimas 50 líneas del log del servicio)
`

export default content
