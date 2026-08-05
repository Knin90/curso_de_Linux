const content = `
## Módulo 3 — Generación de llaves: Ed25519, RSA y algoritmos

### 🎯 Objetivos de aprendizaje

* Conocer los algoritmos de llave SSH disponibles y cuál elegir.
* Generar pares de llaves Ed25519 y RSA con opciones profesionales.
* Entender la passphrase y por qué no es opcional en entornos reales.

### 📖 Comparativa de algoritmos

| Algoritmo | Estado | Longitud de llave | Recomendación |
| --- | --- | --- | --- |
| **Ed25519** | Moderno (curve25519) | 256 bits (equivalente a RSA 3000+) | ✅ Usar para todo lo nuevo |
| **RSA** | Probado y compatible | 4096 bits mínimo en 2026 | ✅ Solo para compatibilidad con sistemas legacy |
| **ECDSA** | Moderno, menos adoptado | 256/384/521 bits | ⚠️ Aceptable, preferir Ed25519 |
| **DSA** | Obsoleto e inseguro | 1024 bits (fijo) | ❌ No usar. Rechazado por OpenSSH moderno. |

> **¿Por qué Ed25519?** Claves más cortas con seguridad mayor, operaciones más rápidas, diseño resistente a ataques de canal lateral, sin los problemas de implementación históricos de RSA y ECDSA.

### 💻 Generar llave Ed25519

\`\`\`bash
ssh-keygen -t ed25519 -C "admin@empresa.com"
\`\`\`

\`\`\`text
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/usuario/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase): [escribe passphrase segura]
Enter same passphrase again:
Your identification has been saved in /home/usuario/.ssh/id_ed25519
Your public key has been saved in /home/usuario/.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:aBcDeFgHiJkLmNoPqRsTuVwXyZ01234567890 admin@empresa.com
\`\`\`

### 💻 Generar llave RSA (compatibilidad con sistemas legacy)

\`\`\`bash
ssh-keygen -t rsa -b 4096 -C "admin@empresa.com"
\`\`\`

> Mínimo aceptable en 2026: RSA 3072 bits. Preferir 4096. RSA 1024 y 2048 deben considerarse inseguros.

### 💻 Opciones avanzadas de ssh-keygen

\`\`\`bash
# Generar con nombre de archivo personalizado (para múltiples llaves)
ssh-keygen -t ed25519 -C "deploy@empresa.com" -f ~/.ssh/id_ed25519_deploy

# Ver la fingerprint de una llave existente
ssh-keygen -l -f ~/.ssh/id_ed25519

# Ver la fingerprint en formato visual (más fácil de comparar)
ssh-keygen -lv -f ~/.ssh/id_ed25519

# Cambiar passphrase sin regenerar la llave
ssh-keygen -p -f ~/.ssh/id_ed25519

# Ver la llave pública de una llave privada (si perdiste la .pub)
ssh-keygen -y -f ~/.ssh/id_ed25519
\`\`\`

### 📖 La passphrase: no es opcional en producción

La passphrase cifra la llave privada en disco. Sin ella, quien robe el archivo \`id_ed25519\` tiene acceso inmediato a todos tus servidores.

\`\`\`text
SIN passphrase:
  Si alguien roba ~/.ssh/id_ed25519
  → Acceso instantáneo a todos los servidores donde está tu llave pública

CON passphrase:
  Si alguien roba ~/.ssh/id_ed25519
  → Solo tienen un archivo cifrado inútil sin la passphrase
\`\`\`

> La passphrase no es incómoda si usas \`ssh-agent\` (Módulo 4). Escribes la passphrase una sola vez al iniciar sesión y \`ssh-agent\` recuerda la llave descifrada en memoria para toda la sesión.

### 📖 Múltiples llaves: cuándo y por qué

Puedes tener distintas llaves para distintos propósitos:

\`\`\`text
~/.ssh/id_ed25519           ← Uso personal general
~/.ssh/id_ed25519_trabajo   ← Servidores de la empresa
~/.ssh/id_ed25519_deploy    ← Solo para CI/CD (sin passphrase, permisos limitados)
~/.ssh/id_ed25519_github    ← GitHub/GitLab
\`\`\`

Y en \`~/.ssh/config\` especificas qué llave usar para cada host (Módulo 5).

### 📋 Lo que debes recordar

* **Ed25519 es la elección correcta** para todo uso nuevo en 2026.
* **Siempre usar passphrase** en llaves de producción. \`ssh-agent\` elimina la incomodidad.
* RSA solo si el servidor de destino es tan antiguo que no soporta Ed25519.
* DSA: rechazarlo en cualquier configuración.
* Múltiples llaves por propósito = menor radio de impacto si una se compromete.

### 🧪 Autoevaluación

1. ¿Por qué Ed25519 es preferible a RSA para nuevas llaves?
2. Tienes una llave \`id_ed25519\` sin passphrase. ¿Qué riesgo concreto representa?
3. ¿Cómo ves la fingerprint de tu llave pública sin conectarte a ningún servidor?

---

1. Ed25519 ofrece seguridad equivalente o mayor con claves más cortas, operaciones más rápidas, y diseño resistente a ataques de canal lateral. RSA requiere claves de 4096 bits para seguridad comparable.
2. Si alguien accede al archivo \`~/.ssh/id_ed25519\` (robo de laptop, malware, acceso no autorizado al filesystem), puede conectarse inmediatamente a todos los servidores donde esté tu llave pública instalada.
3. \`ssh-keygen -l -f ~/.ssh/id_ed25519\` — muestra la fingerprint sin necesitar conexión a ningún servidor.
`

export default content
