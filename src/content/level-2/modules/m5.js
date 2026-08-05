const content = `
## Módulo 5 — Targets de systemd y niveles de ejecución (Runlevels)

### 🎯 Objetivos de aprendizaje

* Comprender el concepto de **Target** en \`systemd\` como estado operativo del sistema.
* Relacionar los Targets modernos con los antiguos *Runlevels* de SysVinit.
* Cambiar el Target predeterminado y alternar entre Targets en caliente.

### 📖 Explicación técnica: ¿Qué es un Target?

Un **Target** es un punto de sincronización o un "estado deseado" compuesto por un grupo de unidades de servicio. En lugar de ejecutar scripts secuenciales en orden numérico como en los sistemas clásicos, \`systemd\` activa el Target solicitado y este carga sus dependencias.

\`\`\`text
                       ESTRUCTURA DE DEPENDENCIAS

                          graphical.target
                                 │
                                 ▼ (Requiere)
                          multi-user.target
                                 │
                                 ▼ (Requiere)
                           basic.target
                                 │
                                 ▼ (Requiere)
                          sysinit.target
\`\`\`

### 📊 Tabla de equivalencias: Runlevels vs. Targets

| Runlevel SysVinit | Target de systemd | Propósito y estado del sistema |
| --- | --- | --- |
| **0** | \`poweroff.target\` | Apaga y corta el suministro eléctrico del equipo. |
| **1 / S** | \`rescue.target\` | Modo monousuario de mantenimiento. Pide clave de root. |
| **3** | \`multi-user.target\` | **Modo servidor completo (Consola de comandos con red, sin interfaz gráfica).** |
| **5** | \`graphical.target\` | **Modo escritorio completo (Multiusuario con red e interfaz gráfica GUI).** |
| **6** | \`reboot.target\` | Reinicia la máquina. |
| **—** | \`emergency.target\` | Modo de emergencia absoluto. Raíz montada en solo lectura, mínimo de servicios. |

### 💻 Comandos prácticos para administrar Targets

#### 1. Ver el Target predeterminado del sistema:

\`\`\`bash
systemctl get-default
\`\`\`

#### 2. Configurar el sistema para arrancar en modo Servidor (sin GUI):

\`\`\`bash
sudo systemctl set-default multi-user.target
\`\`\`

#### 3. Configurar el sistema para arrancar en modo Escritorio (GUI):

\`\`\`bash
sudo systemctl set-default graphical.target
\`\`\`

#### 4. Cambiar a modo consola en caliente (sin reiniciar):

\`\`\`bash
sudo systemctl isolate multi-user.target
\`\`\`

### 🏢 Caso de uso profesional

En entornos de producción, mantener una interfaz gráfica activa consume recursos valiosos (RAM y CPU) y amplía la superficie de ataque. La primera buena práctica de seguridad (*hardening*) es asegurar que todos los servidores tengan como objetivo predeterminado \`multi-user.target\`.

### 📋 Lo que debes recordar

* **Qué hace:** Define el estado final del sistema (apagado, rescate, servidor en modo texto, o escritorio gráfico).
* **Cuándo ocurre:** Es evaluado por \`systemd\` durante la fase final del arranque.
* **Comandos clave:** \`systemctl get-default\`, \`systemctl set-default\`, \`systemctl isolate\`.
* **Equivalencias clave:** Runlevel 3 = \`multi-user.target\` | Runlevel 5 = \`graphical.target\`.

### 🧪 Autoevaluación rápida

1. ¿Qué Target de \`systemd\` equivale al tradicional Runlevel 3 (modo texto con red)?
2. ¿Qué comando se utiliza para cambiar de un entorno gráfico a una consola pura en caliente sin reiniciar el servidor?
3. ¿En qué se diferencia \`emergency.target\` de \`rescue.target\`?

---

1. \`multi-user.target\`.
2. \`sudo systemctl isolate multi-user.target\`.
3. \`emergency.target\` monta el sistema de archivos raíz en modo **solo lectura** y carga aún menos servicios que \`rescue.target\`.
`

export default content
