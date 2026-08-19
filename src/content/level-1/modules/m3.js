const content = `
## Módulo 3 — Secure Boot

### 🎯 Objetivos de aprendizaje

* Comprender la función de seguridad que cumple Secure Boot.
* Administrar la firma de componentes y saber cuándo es necesario gestionar claves.

### ❓ Problema real que resuelve

Un atacante con acceso al equipo podría instalar malware a nivel de bootloader (*bootkits*). Este software se ejecutaría **antes** que el propio sistema operativo, volviéndose invisible para los mecanismos de seguridad tradicionales.

### 💡 Analogía

Secure Boot es un **control de acceso con firma biométrica**: solo permite la entrada a componentes cuya firma coincida con una clave registrada en la lista de confianza.

### 📖 Explicación técnica

Secure Boot verifica la firma digital del bootloader, del kernel y de los módulos cargados durante el arranque.

Distribuciones como Ubuntu, Fedora y Debian utilizan un gestor de arranque intermedio llamado **\`shim\`**, el cual está firmado por Microsoft (cuya clave viene preinstalada en el firmware de la mayoría de fabricantes). Gracias a esto, **Linux puede arrancar con Secure Boot activo**.

\`\`\`diagram
{"type":"tree","root":{"name":"Verifica firma digital (PK / KEK / db)","meta":"UEFI localiza el bootloader firmado shim.efi"},"children":[{"name":"Válida","edgeLabel":"sí","meta":"Continúa el arranque","focal":true},{"name":"No válida","edgeLabel":"no","meta":"Bloquea el arranque"}]}
\`\`\`

### 💻 Ejemplo básico

Comprobar el estado de Secure Boot desde la terminal de Linux:

\`\`\`bash
mokutil --sb-state
\`\`\`

### 🏢 Caso de uso profesional / Escenario real: Pantalla MOK

Al instalar controladores propietarios de video (ej. NVIDIA) o módulos de red en un sistema con Secure Boot activo, Linux solicitará crear una contraseña para registrar la clave **MOK** *(Machine Owner Key)*.

Al reiniciar, el sistema mostrará una pantalla azul/gris llamada **Shim UEFI Key Management**. El administrador debe seleccionar **"Enroll MOK"**, introducir la contraseña definida y confirmar la importación para autorizar la carga de los controladores.

\`\`\`diagram
{"type":"table-like","title":"Perform MOK management","rows":[{"value":"Continue boot"},{"key":"→","value":"Enroll MOK (seleccionar esta opción)"},{"value":"Enroll key from disk"},{"value":"Enroll hash from disk"}]}
\`\`\`

### 🧪 Laboratorio guiado

1. Verifica el estado de Secure Boot con \`mokutil --sb-state\`.
2. Acceda a la interfaz UEFI del sistema y ubique las opciones de gestión de claves (*Key Management*).
3. Documente el procedimiento para habilitar o deshabilitar el estado según la distribución a desplegar.

### ⚠️ Errores comunes

* Desactivar Secure Boot en entornos corporativos sin justificación, violando políticas de cumplimiento (*compliance*).
* Reiniciar el sistema tras instalar drivers propietarios y cancelar la pantalla MOK por desconocimiento, lo que provoca que los módulos de kernel sean rechazados.

### ✅ Resultado esperado

El estudiante comprende el funcionamiento de Secure Boot, sabe verificar su estado y puede completar la firma de módulos mediante el gestor MOK.
`

export default content
