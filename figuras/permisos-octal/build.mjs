// Fig 4.3 — Permisos en octal: tres columnas de bloques patrón (u, g, o).
// Cada bit es un bloque cuya altura es su valor: r = 4, w = 2, x = 1.
// Meter un bloque en la columna suma su altura; el palpador del medidor
// de altura se apoya en la cima de la pila y su regla marca el dígito octal.
//
//   node figuras/permisos-octal/build.mjs [--light] [--out <dir>]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.agents/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.agents/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const theme = argv.includes("--light") ? "light" : "dark";
const outAt = argv.indexOf("--out");
const OUT = outAt >= 0 ? resolve(argv[outAt + 1]) : resolve(HERE, "../../public/figuras");
const NAME = theme === "light" ? "permisos-octal-light.html" : "permisos-octal.html";

const WIDTH = 640;
const HEIGHT = 420;

// ---- Modelo: la verdad que mueve todo -------------------------------------
const UNIT = 6; // altura de 1 en el octal, en unidades de mundo
const BITS = [
  { name: "r", value: 4 },
  { name: "w", value: 2 },
  { name: "x", value: 1 },
];
const WHO = ["u", "g", "o"];
const START = 0o755;

// ---- Mundo ---------------------------------------------------------------
const PLATE = { x: -150, y: -62, w: 300, d: 124, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const BASE = 1.2; // cara superior de bandejas y asientos
const COLS = [-96, 0, 96];
const COL_Y = -18;
const PARK_Y = 27;
const PARK_DX = [-24, 0, 24];
const BLOCK = { w: 18, d: 14 };
const POST_DX = -22;
const POST_TOP = 60;
const ARM_REST = BASE; // cota inferior del palpador sin bloques
const SCALE_STEPS = 7;

const blockPlan = (cx, cy) => ({ x: cx - BLOCK.w / 2, y: cy - BLOCK.d / 2, w: BLOCK.w, d: BLOCK.d, r: 1 });

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...COLS.map((x) => [x + POST_DX, COL_Y, POST_TOP + 3])],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 54 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---- Base: placa, patas, ranura, tornillos, regla, placa de rótulo -------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // Ranuras que separan los tres módulos, de ranura perimetral a ranura perimetral.
  for (const x of [-48, 48]) out.push(L(k.lineOnTop([x, PLATE.y + 5], [x, PLATE.y + PLATE.d - 5], 0, P), { tone: "faint" }));

  // Regla frontal con marcas cada 4 y mayor cada 5.
  const strip = { x: -132, y: 49, w: 264, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));

  // Placa de rótulo atornillada en la esquina trasera derecha.
  const label = { x: 112, y: -56, w: 30, d: 18, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  [[22, -51], [16, -47], [19, -43]].forEach(([len, y]) => out.push(L(k.lineOnTop([label.x + 4, y], [label.x + 4 + len * 0.95, y], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2.2, label.y + 2.2, 0.8]), at([label.x + label.w - 2.2, label.y + label.d - 2.2, 0.8])], { size: 0.4 }));
  return out.join("");
}

// ---- Por módulo: bandeja, asiento de la columna, pie del medidor ---------
function module(xc, who) {
  const out = [];
  const tray = { x: xc - 38, y: 10, w: 76, d: 34, r: 3 };
  out.push(S(k.slabOf(tray, 0, BASE, P, 4, 0.4), { tone: "lo" }));
  PARK_DX.forEach((dx) => out.push(L(k.planOutline(k.insetPlan(blockPlan(xc + dx, PARK_Y), -1.2), BASE, P, 3), { tone: "faint" })));
  out.push(D([at([tray.x + 3, tray.y + 3, BASE]), at([tray.x + tray.w - 3, tray.y + 3, BASE]), at([tray.x + 3, tray.y + tray.d - 3, BASE]), at([tray.x + tray.w - 3, tray.y + tray.d - 3, BASE])], { size: 0.4, tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([tray.x + 5, tray.y + tray.d - 3.6], BASE, P, "x"), who, { size: 6, tone: "mid" }));

  const seat = { x: xc - 13, y: COL_Y - 11, w: 26, d: 22, r: 2 };
  out.push(S(k.slabOf(seat, 0, BASE, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(blockPlan(xc, COL_Y), -1.2), BASE, P, 3), { tone: "faint" }));
  out.push(D(k.corners(seat, 2.2).map(([x, y]) => at([x, y, BASE])), { size: 0.4, tone: "lo" }));
  return out.join("");
}

// ---- Medidor de altura: pie, columna con regla 0–7, sombrerete ----------
function post(xc) {
  const px = xc + POST_DX;
  const out = [];
  const foot = { x: px - 6, y: COL_Y - 6.5, w: 12, d: 13, r: 1.5 };
  out.push(S(k.slabOf(foot, 0, BASE, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([foot.x + 1.6, foot.y + 1.6, BASE]), at([foot.x + foot.w - 1.6, foot.y + foot.d - 1.6, BASE])], { size: 0.4 }));
  const bar = { x: px - 3, y: COL_Y - 2.5, w: 6, d: 5, r: 0 };
  out.push(S(k.slabOf(bar, BASE, POST_TOP - BASE, P, 2, 0.3), { tone: "mid", crease: "lo" }));
  // Marcas en la cara +y, nacen de la arista -x: una mayor por dígito, una menor a medio dígito.
  const face = bar.y + bar.d;
  const edge = bar.x;
  const minor = [];
  const major = [];
  for (let n = 0; n <= SCALE_STEPS * 2; n++) {
    const z = BASE + (n * UNIT) / 2;
    (n % 2 ? minor : major).push(k.segment([edge, face, z], [edge + (n % 2 ? 1.6 : 3.2), face, z], P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "hi" }));
  const cap = { x: px - 4, y: COL_Y - 3.5, w: 8, d: 7, r: 1 };
  out.push(S(k.slabOf(cap, POST_TOP, 2.6, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([px, COL_Y, POST_TOP + 2.6])], { size: 0.45 }));
  return out.join("");
}

// ---- Carro del palpador (se construye en reposo y se traslada en z) -----
function gauge(xc) {
  const px = xc + POST_DX;
  const a = ARM_REST;
  const out = [];
  const slider = { x: px - 4.6, y: COL_Y - 4.2, w: 9.2, d: 8.4, r: 1 };
  out.push(S(k.slabOf(slider, a, 9, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(slider, a + 4.5, P, 3), { tone: "faint" }) }));
  // Tornillo de bloqueo en la cara +y del carro.
  const F = G.frameAlong([px - 1.2, slider.y + slider.d, a + 5], [0, 1, 0]);
  out.push(S(G.disc(0, 1.2, 1.3, F, P), { tone: "mid" }));
  out.push(S(G.disc(1.2, 3.6, 2.3, F, P), { tone: "mid", inner: L(G.ribsOf(F, 1.2, 3.6, 2.3, 18, P, { seams: true }), { tone: "lo" }) }));
  const head = { x: xc - 3.6, y: COL_Y - 2.6, w: 7.2, d: 5.2, r: 1 };
  const arm = { x: slider.x + slider.w, y: COL_Y - 1.4, w: head.x - slider.x - slider.w + 0.6, d: 2.8, r: 0.4 };
  out.push(S(k.slabOf(arm, a + 5.4, 2.4, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  out.push(D([at([arm.x + 2, COL_Y, a + 7.8]), at([arm.x + arm.w - 2.4, COL_Y, a + 7.8])], { size: 0.38, tone: "lo" }));
  out.push(S(k.slabOf(head, a + 3.2, 5.2, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  // Punta del palpador: el único acento iluminado; toca la cima de la pila.
  out.push(S(k.cylinder(xc, COL_Y, 1.5, a, 3.2, P, 18), { tone: "hi", lit: true }));
  return out.join("");
}

// ---- Bloques patrón (en reposo sobre el asiento de su columna) ----------
function block(xc, bit) {
  const h = bit.value * UNIT;
  const plan = blockPlan(xc, COL_Y);
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 1.5), BASE, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(plan, BASE, h, P, 3, 0.5), { tone: "hi", crease: "lo", inner: h > 8 ? L(k.sideSeam(plan, BASE + h - 2, P, 3), { tone: "faint" }) : "" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2), BASE + h, P, 3), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([xc - 7, COL_Y + 5], BASE + h, P, "x"), `${bit.name} ${bit.value}`, { size: 4.2, tone: "mid" }));
  return out.join("");
}

const items = [];
COLS.forEach((xc, c) => {
  items.push({ id: `post-${c}`, kind: "post", c, svg: post(xc) });
  items.push({ id: `gauge-${c}`, kind: "gauge", c, svg: gauge(xc) });
  BITS.forEach((bit, b) => items.push({ id: `block-${c}-${b}`, kind: "block", c, b, svg: block(xc, bit) }));
});

const label =
  "Una máquina de bloques patrón con tres columnas: usuario, grupo y otros. En cada una hay tres bloques cuya altura es su valor: r mide 4, w mide 2 y x mide 1. Los bloques metidos en la columna forman una pila; el palpador de un medidor de altura se apoya en la cima y su regla de 0 a 7 marca el dígito octal del permiso.";

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label,
  body: [plate(), ...COLS.map((xc, c) => module(xc, WHO[c])), `<g data-movers>${items.map((it) => `<g data-part="${it.id}"${it.kind === "block" ? ` data-c="${it.c}" data-b="${it.b}" style="cursor:pointer"` : ""}>${it.svg}</g>`).join("")}</g>`],
});

const MODEL = {
  P,
  UNIT,
  BASE,
  COLS,
  COL_Y,
  PARK_Y,
  PARK_DX,
  POST_DX,
  VALUES: BITS.map((b) => b.value),
  NAMES: BITS.map((b) => b.name),
  START,
};

const live = `
const M = ${JSON.stringify(MODEL)};
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const moversEl = svgEl.querySelector("[data-movers]");
const readoutEl = document.querySelector("[data-readout]");
const stillMq = matchMedia("(prefers-reduced-motion: reduce)");
const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth01 = (v) => { const t = cl(v, 0, 1); return t * t * (3 - 2 * t); };
const LIFT = 0.35; // fracción del recorrido en la que los bloques de encima se apartan

// Estado: bits[c][b] ∈ {0,1}; u[c][b] sigue al bit con suavidad.
const bitsOf = (mode) => [6, 3, 0].map((sh) => { const d = (mode >> sh) & 7; return [4, 2, 1].map((v) => (d & v ? 1 : 0)); });
let bits = bitsOf(M.START);
const u = bits.map((row) => row.slice());
const arm = [0, 0, 0].map((_, c) => ({ at: digitOf(c) * M.UNIT, rate: 0 }));
function digitOf(c) { return bits[c].reduce((s, on, b) => s + on * M.VALUES[b], 0); }
const modeOf = () => bits.map((_, c) => digitOf(c)).join("");
const symOf = () => "-" + bits.map((row) => row.map((on, b) => (on ? M.NAMES[b] : "-")).join("")).join("");

const parts = new Map([...moversEl.children].map((el) => [el.dataset.part, el]));

function blockPose(c, b) {
  const uu = u[c][b];
  const travel = smooth01((uu - LIFT) / (1 - LIFT));
  let under = 0;
  for (let j = 0; j < b; j++) under += M.VALUES[j] * M.UNIT * smooth01(u[c][j] / LIFT) * (u[c][j] > 0 ? 1 : 0);
  // Los bloques ya metidos se desplazan a la vez que la pila bajo ellos.
  const lift = smooth01(travel / 0.5);
  const dx = M.PARK_DX[b] * (1 - travel);
  const dy = (M.PARK_Y - M.COL_Y) * (1 - travel);
  return [dx, dy, under * lift];
}

function draw() {
  const order = [];
  M.COLS.forEach((xc, c) => {
    const px = xc + M.POST_DX;
    order.push([depthOf([px, M.COL_Y, 0], M.P), parts.get("post-" + c)]);
    let busy = 0, top = 0;
    for (let b = 0; b < 3; b++) {
      const [dx, dy, dz] = blockPose(c, b);
      const el = parts.get("block-" + c + "-" + b);
      el.setAttribute("transform", translateAlong(M.P, [dx, dy, dz]));
      order.push([depthOf([xc + dx, M.COL_Y + dy, 0], M.P) + dz * 1e-3, el]);
      if (u[c][b] > 0.001 && u[c][b] < 0.999) busy = 1;
    }
    order.push([depthOf([xc, M.COL_Y, 0], M.P) + 0.5, parts.get("gauge-" + c)]);
    parts.get("gauge-" + c).setAttribute("transform", translateAlong(M.P, [0, 0, arm[c].at]));
  });
  order.sort((a, b) => a[0] - b[0]);
  order.forEach(([, el], i) => { if (moversEl.children[i] !== el) moversEl.insertBefore(el, moversEl.children[i] || null); });
  const text = "chmod " + modeOf() + " · " + symOf();
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
}

function describe() {
  const names = ["usuario", "grupo", "otros"];
  stage.setAttribute("aria-valuetext", "chmod " + modeOf() + ", " + symOf() + ". " + names.map((n, c) => n + " " + digitOf(c)).join(", "));
}

// Recorrido automático por los modos más habituales.
const TOUR = [0o755, 0o644, 0o700, 0o750, 0o600, 0o775, 0o640, 0o777];
let frame = 0, last = 0, clock = 0, tourIx = 0, visible = false, idleTimer = 0;
let touring = !stillMq.matches;
const setMode = (mode) => { bits = bitsOf(mode); describe(); };

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = stillMq.matches;
  if (touring) {
    clock += dt;
    if (clock > 3.2) { clock = 0; tourIx = (tourIx + 1) % TOUR.length; setMode(TOUR[tourIx]); }
  }
  let moving = false;
  for (let c = 0; c < 3; c++) {
    let anyTravel = false;
    for (let b = 0; b < 3; b++) {
      const want = bits[c][b];
      const cur = u[c][b];
      // Velocidad constante: 0,9 s por recorrido completo, suavizado por smooth01 en la pose.
      const next = calm ? want : cur + cl(want - cur, -dt / 0.9, dt / 0.9);
      u[c][b] = Math.abs(next - want) < 1e-4 ? want : next;
      if (u[c][b] !== want) { moving = true; anyTravel = true; }
    }
    // El palpador sube por encima de la pila mientras un bloque entra o sale.
    let topNow = 0;
    for (let b = 0; b < 3; b++) { const [, , dz] = blockPose(c, b); if (u[c][b] > LIFT) topNow = Math.max(topNow, dz + M.VALUES[b] * M.UNIT * smooth01((u[c][b] - LIFT) / (1 - LIFT) / 0.5)); }
    const want = anyTravel ? Math.max(topNow, digitOf(c) * M.UNIT) + 9 : digitOf(c) * M.UNIT;
    const a = arm[c];
    if (calm) { a.at = want; a.rate = 0; }
    else {
      for (let i = 0; i < 4; i++) { a.rate += ((want - a.at) * 160 - a.rate * 2 * Math.sqrt(160)) * dt / 4; a.at += a.rate * dt / 4; }
      if (Math.abs(want - a.at) < 5e-3 && Math.abs(a.rate) < 5e-3) { a.at = want; a.rate = 0; } else moving = true;
    }
  }
  draw();
  frame = visible && (moving || touring) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const interact = () => {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !stillMq.matches; clock = 0; run(); }, 6000);
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

svgEl.addEventListener("click", (event) => {
  const el = event.target.closest("[data-b]");
  if (!el) return;
  interact();
  const c = +el.dataset.c, b = +el.dataset.b;
  bits[c][b] ^= 1;
  describe();
  run();
});
stage.addEventListener("keydown", (event) => {
  let handled = true;
  const n = Number(event.key);
  if (n >= 1 && n <= 9) { bits[Math.floor((n - 1) / 3)][(n - 1) % 3] ^= 1; }
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") { tourIx = (tourIx + 1) % TOUR.length; setMode(TOUR[tourIx]); }
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { tourIx = (tourIx + TOUR.length - 1) % TOUR.length; setMode(TOUR[tourIx]); }
  else if (event.key === "Home") setMode(0o777);
  else if (event.key === "End") setMode(0);
  else handled = false;
  if (!handled) return;
  event.preventDefault();
  interact();
  describe();
  run();
});
stage.addEventListener("focus", interact);

// Dentro de un iframe: avisa de la altura al documento padre.
const sendHeight = () => { if (parent !== window) parent.postMessage({ anatomyFigure: location.pathname, height: Math.ceil(document.documentElement.scrollHeight) }, "*"); };
new ResizeObserver(sendHeight).observe(document.body);
addEventListener("load", sendHeight);

describe();
draw();
`;

const body = k.plateHtml({
  fig: "Fig 4.3",
  title: "Permisos en octal",
  hint: "Toca un bloque para meterlo o sacarlo",
  readout: "chmod 755 · -rwxr-xr-x",
  keys: [
    { mark: "raised", label: "Bloques patrón: r mide 4, w mide 2, x mide 1" },
    { mark: "lit", label: "Palpador: se apoya en la cima de la pila" },
    { mark: "edge", label: "Regla del medidor: una marca mayor por dígito, de 0 a 7" },
  ],
  caption:
    "Cada columna es un grupo de permisos: u (dueño), g (grupo) y o (otros). Un permiso activo es un bloque metido en la pila; como cada bloque mide lo que vale, la altura de la pila es la suma r + w + x y el palpador la lee directamente como el dígito octal. rwx = 4 + 2 + 1 = 7, r-x = 4 + 1 = 5, r-- = 4. Teclas: 1–9 alternan los bloques, flechas recorren modos habituales.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Permisos en octal: las teclas 1 a 9 meten o sacan bloques, las flechas cambian entre modos habituales" aria-valuemin="0" aria-valuemax="511" aria-valuenow="493">${svg}</div>`,
});

const EMBED_CSS = `<style>body{background:var(--anatomy-card)}.iso-page{margin:0 auto;width:100%;max-width:720px;padding:2px 2px 14px}.iso-legend{padding:0 14px}</style>`;
const html = k
  .pageHtml({ title: "Permisos en octal", theme, body, script: kitScript() + live, width: 720 })
  .replace('<html lang="en">', '<html lang="es">')
  .replace("</head>", `${EMBED_CSS}</head>`);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, NAME), html);
console.log("wrote", join(OUT, NAME));
