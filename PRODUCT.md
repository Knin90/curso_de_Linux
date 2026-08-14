# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas hispanohablantes que empiezan de cero en Linux y quieren llegar a un perfil de administrador de sistemas profesional (sysadmin / DevOps / Cloud). Estudiantes individuales y autodidactas; no hay requisito previo de experiencia.

## Product Purpose

Un curso abierto y gratuito de Linux en español que lleva al alumno de cero a administrador profesional mediante un recorrido estructurado, con laboratorios reales y un proyecto final integrador. El éxito se mide por la capacidad del alumno de administrar un servidor real y por su preparación para certificaciones de la industria.

## Positioning

Recorrido completo y progresivo de 37 niveles (0–36) organizados en 7 etapas —Fundamentos, Administración, Redes, Seguridad, Automatización, Infraestructura y Proyecto Final— con laboratorios reales y mapeo directo a certificaciones reconocidas (CompTIA Linux+, LPIC, RHCSA, RHCE, CKA). La novedad clave del proyecto final es el paso de backup real: respaldar y verificar la restauración de todo el entorno.

## Operating Context

- Los niveles se estudian de forma secuencial; cada nivel tiene módulos guiados con contenido markdown, ejemplos de terminal y laboratorio integrador.
- Evaluación continua: quiz por nivel (8–10 preguntas), examen de etapa (30 preguntas + 1 laboratorio evaluado) y mapeo a certificaciones.
- El alumno trabaja con una terminal real (Bash), sistemas de archivos, red, firewall, contenedores (Docker), automatización (Ansible, Terraform) y despliegue en la nube.
- La app es una SPA con tema oscuro tipo terminal, navegación por niveles y módulos, y un índice general por etapas.

## Capabilities and Constraints

- 37 niveles (0–36) definidos, todos marcados como `available` en `src/registry.js`; el contenido real por nivel vive en `src/content/level-N/` (niveles 1–36 presentes; el nivel 0 no tiene entrada de contenido propia).
- 7 etapas con título y color asociado.
- Funcionalidades actuales: landing con estadísticas y destacados, stepper de módulos con auto-marcado de lectura (IntersectionObserver), tema claro/oscuro con toggle, renderizado del contenido de los módulos (parser propio en `src/components/level/LevelContent.jsx`, con bloques de código resaltados) y diagrama del proyecto final.
- Idioma del contenido: español. Copy de la app en español.
- No hay backend, cuentas de usuario ni sistema de progreso persistido; es una app estática (React + Vite).
- Evaluación: el quiz de autoevaluación por módulo está implementado como funcionalidad interactiva (secciones `Autoevaluación` con respuestas desplegables en `src/components/level/LevelContent.jsx`); el examen de etapa y el resto de la evaluación global siguen sin implementarse.

## Brand Commitments

- Nombre oficial: **Curso de Linux** (decisión confirmada y aplicada: `package.json`, `package-lock.json`, `<title>` y el UI usan «Curso de Linux»).
- Tono del copy: motivacional y profesional, en español.
- Marca visual tipo terminal: prompt `>_`, tipografía monoespaciada (JetBrains Mono) sobre Archivo, acentos verde/cian.

## Evidence on Hand

- Contenido real de 36 niveles con módulos completos en `src/content/level-1/` … `src/content/level-36/`.
- Landing completa con estructura, evaluación y proyecto final descritos en `src/pages/Home.jsx`.
- No hay testimonios, casos de estudio, precios ni datos de usuarios reales; no fabricar estas ausencias.

## Product Principles

1. **De cero a profesional, sin atajos**: el recorrido es completo y progresivo; cada nivel se apoya en el anterior.
2. **Práctica real sobre teoría**: laboratorios reales y un proyecto final integrador que converge en un servidor real de Internet a la nube.
3. **Valor comercial demostrable**: cada etapa se alinea con certificaciones reconocidas de la industria.
4. **Gratuito y abierto**: el curso es un recurso educativo abierto, sin cuenta ni monetización.
5. **Español primero**: todo el contenido y la interfaz están en español, para la audiencia hispanohablante.
