---
name: Curso de Linux
description: Curso abierto de Linux en español, de cero a administrador profesional — estética de terminal profesional.
colors:
  primary: "#03624C"
  primary-hover: "#02483A"
  primary-soft: "#E6F2EC"
  neutral-bg: "#F6F9F7"
  neutral-surface: "#FFFFFF"
  neutral-fg: "#0C1F18"
  neutral-muted: "#3E524A"
  neutral-border: "#B5C9BE"
  success: "#03624C"
  warning: "#8A5A00"
  code-bg: "#030F0F"
  code-fg: "#DCECE4"
  dark-bg: "#030F0F"
  dark-surface: "#0A1613"
  dark-fg: "#DCECE4"
  dark-border: "rgba(255,255,255,0.1)"
  dark-primary: "#00DF82"
  dark-primary-ink: "#7DF5BC"
typography:
  display:
    fontFamily: "'IBM Plex Sans', -apple-system, system-ui, sans-serif"
    fontSize: "clamp(38px, 5vw, 60px)"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Archivo', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "clamp(24px, 3vw, 40px)"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Archivo', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Archivo', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11.5px"
    fontWeight: 700
    letterSpacing: "0.08em"
    textTransform: "uppercase"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "84px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "13px 22px"
    typography: "15px, 600"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.sm}"
    borderBottom: "1.5px solid {colors.neutral-border}"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.neutral-border}"
    padding: "20px 22px"
  chip:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.pill}"
    padding: "6px 13px"
  code-block:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.code-fg}"
    rounded: "{rounded.lg}"
---

# Design System: Curso de Linux

## Overview

**Creative North Star: "El Laboratorio de Terminal"**

El sistema visual nace de la idea de una terminal de administrador de sistemas convertida en aula: superficies limpias tipo papel que ceden el protagonismo a bloques de código oscuros, acentos verde/cian que recuerdan a una sesión de `ls --color` bien configurada, y tipografía monoespaciada como lenguaje estructural (números de nivel, kickers, etiquetas, metadatos). Es una estética profesional y sobria — la de un manual técnico bien maquetado — no una imitación ciberpunk. La densidad es cómoda, con aire generoso entre secciones (84px) y grupos apretados dentro de cada tarjeta.

El modo claro es el "papel de notas del ingeniero" y el modo oscuro la "terminal en sí": ambos comparten la misma arquitectura de tokens en OKLCh, de modo que el cambio de tema es una permutación de variables, no un rediseño.

**Key Characteristics:**
- Superficies planas con bordes de 1px y radios de 10–12px; la elevación se expresa por capas tonales, no por sombras duras.
- El acento verde se usa con moderación: solo en acciones primarias, enlaces, y marcadores estructurales (números de nivel, módulos). En claro #03624C; en oscuro #00DF82.
- La tipografía monoespaciada es estructural, no decorativa: números, kickers, etiquetas, comandos y metadatos.
- Bloques de código oscuros en ambos temas (contraste deliberado contra superficies claras).
- Un solo momento de movimiento por entrada: cascadas de `fadeUp` cortas (50–80ms entre elementos) con easing exponencial custom, y press states `scale(0.97)` en todo elemento pulsable.

## Colors

Paleta de terminal disciplinada (Ansible): neutros verde-tinta en papel y superficies, verde profundo #03624C como acento principal en modo claro, verde brillante #00DF82 como acento en modo oscuro, ámbar para advertencias y rojo/amarillo funcionales para errores y logs.

### Primary
- **Verde Ansible #03624C** (modo claro): acciones primarias (botones), enlaces activos, chip activo del stepper, bordes de foco. Hover → #02483A.
- **Verde brillante #00DF82** (modo oscuro): mismo rol de acento sobre fondo #030F0F, con tinta mint #7DF5BC para texto sobre acento-soft.

### Neutral
- **Papel** (#F6F9F7): fondo del modo claro; casi blanco con un susurro verde.
- **Superficie** (#FFFFFF): tarjetas, nav, strips; blanco puro sobre el papel.
- **Tinta** (#0C1F18): texto principal; casi negro con matiz verde.
- **Muted** (#3E524A): texto secundario, kickers, metadatos.
- **Borde** (#B5C9BE): separadores y bordes; en oscuro, blanco al 10%.
- **Terminal** (#030F0F): fondo de bloques de código, presentes en ambos temas.

### Semantic
- **Verde Éxito** (#03624C en claro, #00DF82 en oscuro): checks de objetivos, resultados esperados, botón "Copiado", barras de progreso.
- **Ámbar Aviso** (#8A5A00 en claro, #FBBF24 en oscuro): tarjetas de errores comunes, advertencias.

### Named Rules
**La Regla del Código Oscuro.** Los bloques de código son siempre el elemento más oscuro de la pantalla, en ambos temas. Esa inversión deliberada es lo que ancla la identidad de "terminal en el papel".

## Typography

**Display Font:** IBM Plex Sans (fallback: -apple-system, system-ui)
**Body Font:** Archivo (fallback: -apple-system, BlinkMacSystemFont, system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (fallback: ui-monospace, SF Mono, Menlo, Consolas, monospace)

**Character:** IBM Plex Sans (herencia IBM, gesto técnico-industrial) da carácter a los títulos, mientras Archivo mantiene la neutralidad del cuerpo y JetBrains Mono estructura todo lo que es número, comando o etiqueta. La pareja lee como documentación de ingeniería bien hecha: clara, precisa, con una voz propia.

### Hierarchy
- **Display** (650, clamp(38px, 5vw, 60px), 1.05, tracking -0.025em): títulos de hero (landing y nivel). Máximo ~6rem.
- **Headline** (650, clamp(24px, 3vw, 40px), 1.1, tracking -0.02em): títulos de sección y de módulo.
- **Title** (650, 17px, tracking -0.01em): títulos de tarjeta, "siguiente módulo".
- **Body** (400, 14.5–18px, 1.6): párrafos. Medida máx. 60–70ch en lead/hero.
- **Label** (JetBrains Mono, 700, 11.5px, tracking 0.08em, uppercase): kickers de sección, etiquetas "MÓDULO 01", badges, chips de navegación.

### Named Rules
**La Regla del Mono Estructural.** La monoespaciada nunca decora: solo etiqueta números, comandos, códigos y metadatos. Si un texto no es ninguna de esas cosas, usa Archivo.

## Layout

Contenedor centrado con máximo de 1080px (landing) / 1160px (niveles), padding lateral 24px. La landing es una columna vertical de secciones con ritmo de 84px. La página de nivel es una columna de 1fr con hero, barra de progreso y grid de tarjetas de módulos; la página de módulo añade un stepper horizontal (chips) bajo el hero para saltar entre módulos del nivel. Tarjetas destacadas: grid de 2 columnas (1 columna bajo 900px). Evaluación: 3 columnas (1 bajo 900px). La estadísticas: 4 columnas (2 bajo 900px).

El espaciado obedece a una regla simple: más espacio sobre un encabezado que debajo; grupos apretados dentro de las tarjetas, separaciones generosas entre secciones.

## Elevation & Depth

El sistema es **plano por defecto** — no hay sombras en reposo. La profundidad se comunica por capas tonales: superficie (blanco/tarjeta) sobre fondo (papel), y el bloque de código como pozo oscuro. La única respuesta de elevación es el hover: `translateY(-1px a -2px)` con `--ease-out` en tarjetas y enlaces "siguiente", gated detrás de `@media (hover: hover) and (pointer: fine)`. El nav usa `backdrop-filter: blur(14px)` con fondo al 82% para el efecto de vidrio deslizante.

### Named Rules
**La Regla Plana.** Superficies planas en reposo. El movimiento de elevación existe solo como respuesta a hover, nunca como decoración permanente.

## Shapes

Radios contenidos de 10–12px en tarjetas y contenedores; 6–8px en controles pequeños (botones de copiar, badges, números de nivel); píldoras (999px) solo en controles pequeños tipo chip/tag/nav-level. Bordes de 1px en todas las superficies, con `color-mix` del acento para estados hover/activos. Los bloques de código usan `border-radius: 12px` y ocultan el desbordamiento. Nada de esquinas radicales ni formas recortadas: la geometría es tranquila y funcional.

## Components

### Buttons
- **Shape:** radius 10px (primario), 8px (nav CTA), 6px (copy).
- **Primary:** fondo acento, texto papel, padding 13px 22px, min-height 48px. Hover → acento-hover. **Press:** `transform: scale(0.97)` con `transition: transform 160ms var(--ease-out)` — el feedback es instantáneo y solo usa GPU.
- **Secondary:** texto tinta sin fondo, subrayado de 1.5px que se oscurece al hover.
- **Copy (en código):** ghost sobre fondo oscuro; `:active` scale(0.93); estado `.done` (Copiado) en verde éxito con un pop sutil scale(1.03).

### Chips
- **Style:** píldora (999px), superficie + borde 1px, texto 13px/550. **Hover:** borde y texto a tinta; **press:** scale(0.95). Los chips del stepper de módulos (`ms-chip`) mantienen el mismo lenguaje.

### Cards / Containers
- **Corner Style:** radius 12px.
- **Background:** superficie sobre papel; variantes semánticas con fondos tintados: warning (ámbar al 97% de L), result (verde al 96.5% de L), analogy (papel con comilla serif del acento).
- **Border:** 1px borde neutro; hover tintado con color-mix del acento al 40%.
- **Internal Padding:** 20–24px.
- **Shadow Strategy:** ninguno (ver Elevation).

### Quiz (signature)
- Ítems como tarjetas apiladas con borde 1px, radius 12px. **Press:** scale(0.985). Al abrir: la respuesta se revela con `grid-template-rows: 0fr → 1fr` + opacity (240ms `--ease-out`), y el chevron `▼` rota 180°. Accesible por teclado: `role="button"`, `aria-expanded`, Enter/Espacio.

### Navigation
- **Nav sticky** con blur(14px) y borde inferior 1px. Brand: marca `>_` en caja tinta (papel el glifo) + «Curso de Linux». La barra es deliberadamente mínima: solo brand + theme toggle en la landing; en los niveles se añade un chip con el nivel actual (`nav-level`). Theme toggle 34px con `:active scale(0.92)`.

### Module Stepper (módulos)
- Tira horizontal de chips numerados bajo el hero de la página de módulo; el chip activo usa acento en borde y tinta, los leídos muestran un check SVG y el pendiente actual un pulso sutil. **Hover:** sube el acento del borde; stagger de entrada con `--i`.

### Flow Diagram
- Nodos como tarjetas horizontales (radius 10px) con icono de 30px en caja; conectores verticales de 1px con flecha. El nodo "entrada" (Internet) usa el acento invertido.

## Do's and Don'ts

### Do:
- **Do** usar el acento verde solo para acción, enlaces y marcadores estructurales. Su rareza es el punto (≤10% de cualquier pantalla).
- **Do** mantener los bloques de código como el elemento más oscuro, incluso en modo claro.
- **Do** usar press states `scale(0.97–0.93)` en todo elemento pulsable, con `transition: transform 160ms var(--ease-out)`.
- **Do** gatear los hovers con movimiento detrás de `@media (hover: hover) and (pointer: fine)`.
- **Do** usar la monoespaciada solo para números, comandos, etiquetas y metadatos.
- **Do** respetar `prefers-reduced-motion`: sin transform-based motion, solo fades/opacity.

### Don't:
- **Don't** usar sombras duras ni elevation en reposo; el sistema es plano por capas tonales.
- **Don't** usar `transition: all` ni `ease-in` en UI (se siente lento); usa `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- **Don't** animar desde `scale(0)`; la entrada es `fadeUp` con translateY(14px) + opacity desde un estado casi visible.
- **Don't** aplicar stagger con delays > 80ms entre elementos; la UI debe sentirse inmediata.
- **Don't** usar emoji ni glifos Unicode como sistema de iconos; los checks y marcadores se dibujan con CSS/SVG.
- **Don't** romper el contraste: texto muted ≥ 4.5:1 sobre su fondo.
