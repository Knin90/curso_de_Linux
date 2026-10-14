// Fig 3.2 — Descriptores 0, 1, 2 y redirección.
// El proceso es una máquina con tres bocas: 0 (stdin, entra del teclado),
// 1 (stdout, cubos) y 2 (stderr, discos). Cada salida pasa por un desviador
// giratorio que la manda a la terminal, a un archivo o al desagüe /dev/null.
// Los desviadores son los operadores: >, 2>, 2>&1.
//
//   node figuras/redireccion/build.mjs [--light] [--out <dir>]
import * as k from "../../.agents/skills/anatomy/kit/iso-kit.mjs";
import { options, writeFigure } from "../lib.mjs";

const { theme, out } = options();
const WIDTH = 640;
const HEIGHT = 420;

// ---- Mundo ----------------------------------------------------------------
const PLATE = { x: -164, y: -76, w: 316, d: 136, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const PROC = { x: -88, y: -36, w: 56, d: 62, r: 3 };
const PROC_H = 34;
const PORT1 = [PROC.x + PROC.w, -20];
const PORT2 = [PROC.x + PROC.w, 12];
const PORT0 = [-70, PROC.y + PROC.d];
const D1 = [6, -20];
const D2 = [6, 22];
const KEYB = { x: -150, y: 34, w: 50, d: 24, r: 2 };
const MON = { base: { x: 100, y: -68, w: 40, d: 28, r: 2 }, body: { x: 103, y: -66, w: 34, d: 18, r: 2 }, z0: 9, z1: 40 };
const SCREEN = { x0: 107, x1: 133, z0: 14, z1: 35, y: MON.body.y + MON.body.d };
const BOX = { x: 102, y: -12, w: 36, d: 28, r: 1.5 };
const DRAIN = [110, 36];
// Entradas de cada destino (donde la ficha desaparece).
const DEST = {
  term: [MON.base.x - 4, MON.base.y + MON.base.d / 2],
  file: [BOX.x - 4, BOX.y + BOX.d / 2],
  null: DRAIN,
};
const TOK = { size: 6, r: 3.3, h: 5 };
const POOL = 10;
const CARDS = 9;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [MON.body.x, MON.body.y, MON.z1 + 2], [PROC.x, PROC.y, PROC_H + 2]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 52 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

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
  return out.join("");
}

// Pistas: ranuras en la placa. Cada una es una línea que nace en una boca
// o en un desviador y muere en el pie de un destino.
const ROUTES = {
  0: [[KEYB.x + KEYB.w, KEYB.y + KEYB.d / 2], [PORT0[0], KEYB.y + KEYB.d / 2], PORT0],
  1: [PORT1, D1],
  2: [PORT2, D2],
};
const branch = (from, to) => {
  const dst = DEST[to];
  const mid = [Math.max(from[0] + 22, dst[0] - 40), dst[1]];
  return [from, [from[0] + 14, from[1] + (dst[1] - from[1]) * 0.25], mid, dst];
};
const BRANCHES = {};
for (const [fd, from] of [["1", D1], ["2", D2]]) for (const to of ["term", "file", "null"]) BRANCHES[`${fd}-${to}`] = branch(from, to);

function tracks() {
  const out = [];
  out.push(L(Object.values(ROUTES).map((r) => k.onTop(r, 0, P)).join(""), { tone: "lo" }));
  for (const [id, r] of Object.entries(BRANCHES)) out.push(`<path data-track="${id}" class="iso-line" data-tone="faint" d="${k.onTop(r, 0, P)}"/>`);
  return out.join("");
}

function keyboard() {
  const out = [`<path class="iso-halo" d="${k.haloOf(KEYB, 0, 4, P)}"/>`];
  out.push(S(k.slabOf(KEYB, 0, 4, P, 3, 0.6), { tone: "mid" }));
  const keys = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) keys.push([KEYB.x + 3 + col * 6.4, KEYB.y + 3 + row * 6.4]);
  for (const [x, y] of byDepth(keys)) out.push(S(k.slabOf({ x, y, w: 5, d: 5, r: 0.8 }, 4, 1.6, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  return out.join("");
}

function process_() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PROC, 0, PROC_H, P)}"/>`];
  out.push(S(k.slabOf(PROC, 0, PROC_H, P, 5, 1), { tone: "mid", inner: L(k.sideSeam(PROC, PROC_H - 7, P, 5) + k.sideSeam(PROC, 5, P, 5), { tone: "faint" }) }));
  // Rejilla de ventilación: ranuras cerradas en la tapa.
  for (let i = 0; i < 6; i++) out.push(L(k.planOutline({ x: PROC.x + 10 + i * 6, y: PROC.y + 8, w: 2.4, d: 22, r: 1.2 }, PROC_H, P, 3), { tone: "lo" }));
  // Placa de rótulo con líneas de texto.
  const tag = { x: PROC.x + 8, y: PROC.y + 36, w: 30, d: 16, r: 1.2 };
  out.push(S(k.slabOf(tag, PROC_H, 0.8, P, 3, 0.3), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([tag.x + 3, tag.y + 6.5], PROC_H + 0.8, P, "x"), "PID 4012", { size: 3.4, tone: "mid" }));
  [[20, 10.5], [14, 13.5]].forEach(([len, dy]) => out.push(L(k.lineOnTop([tag.x + 3, tag.y + dy], [tag.x + 3 + len, tag.y + dy], PROC_H + 0.8, P), { tone: "lo", free: true })));
  out.push(D(k.corners(PROC, 3).map(([x, y]) => at([x, y, PROC_H])), { size: 0.45 }));
  // Bocas: marco saliente en la base de cada cara, con su número grabado.
  const port = (plan, n, textAt) => {
    out.push(S(k.slabOf(plan, 0, 9, P, 2, 0.4), { tone: "hi", crease: "lo" }));
    out.push(k.faceTextSvg(k.topMatrix(textAt, 9, P, "x"), n, { size: 4.2, tone: "mid", anchor: "middle" }));
  };
  port({ x: PORT1[0], y: PORT1[1] - 6, w: 3.2, d: 12, r: 0.6 }, "1", [PORT1[0] + 1.6, PORT1[1] + 1.4]);
  port({ x: PORT2[0], y: PORT2[1] - 6, w: 3.2, d: 12, r: 0.6 }, "2", [PORT2[0] + 1.6, PORT2[1] + 1.4]);
  port({ x: PORT0[0] - 6, y: PORT0[1], w: 12, d: 3.2, r: 0.6 }, "0", [PORT0[0], PORT0[1] + 2.6]);
  return out.join("");
}

function monitor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(MON.base, 0, 3, P)}"/>`];
  out.push(S(k.slabOf(MON.base, 0, 3, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 114, y: -60, w: 12, d: 8, r: 1 }, 3, MON.z0 - 3, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf(MON.body, MON.z0, MON.z1 - MON.z0, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(MON.body, MON.z0 + 3, P, 4), { tone: "faint" }) }));
  // Pantalla: marco cerrado en la cara +y.
  const y = SCREEN.y;
  const rect = [[SCREEN.x0, y, SCREEN.z0], [SCREEN.x1, y, SCREEN.z0], [SCREEN.x1, y, SCREEN.z1], [SCREEN.x0, y, SCREEN.z1]];
  out.push(`<path class="iso-fill" d="${k.pathOf(rect.map(at), true)}" style="fill:var(--anatomy-shade-0)"/>`);
  out.push(L(k.pathOf(rect.map(at), true), { tone: "lo" }));
  out.push(D([at([MON.body.x + MON.body.w - 3, y, MON.z0 + 1.6])], { size: 0.6, tone: "hi" }));
  out.push(k.faceTextSvg(k.sideMatrix([MON.body.x + 4, y], MON.z0 + 1.1, P, "left"), "/dev/tty", { size: 2.6, tone: "lo" }));
  for (const x of [MON.body.x + 5, MON.body.x + MON.body.w - 5]) out.push(L(k.planOutline({ x: x - 1, y: MON.body.y + 3, w: 2, d: 12, r: 1 }, MON.z1, P, 3), { tone: "lo" }));
  return out.join("");
}

function boxBack() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BOX, 0, 2, P)}"/>`];
  out.push(S(k.slabOf(BOX, 0, 1.4, P, 3, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: BOX.x, y: BOX.y, w: BOX.w, d: 2, r: 0.4 }, 1.4, 16, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BOX.x, y: BOX.y, w: 2, d: BOX.d, r: 0.4 }, 1.4, 16, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}
function boxFront() {
  const out = [];
  out.push(S(k.slabOf({ x: BOX.x + BOX.w - 2, y: BOX.y, w: 2, d: BOX.d, r: 0.4 }, 1.4, 16, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BOX.x, y: BOX.y + BOX.d - 2, w: BOX.w, d: 2, r: 0.4 }, 1.4, 7, P, 2, 0.3), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([BOX.x + 3, BOX.y + BOX.d - 0.6], 8.4, P, "x"), "salida.txt", { size: 2.6, tone: "lo" }));
  return out.join("");
}
// Hojas apiladas en el archivo: una por línea escrita.
function card(level, kind) {
  const z = 1.4 + level * 1.5;
  const plan = { x: BOX.x + 4, y: BOX.y + 4, w: BOX.w - 8, d: BOX.d - 8, r: 0.6 };
  const top = k.lineOnTop([plan.x + 3, plan.y + plan.d / 2], [plan.x + plan.w - (kind === "2" ? 12 : 4), plan.y + plan.d / 2], z + 1.2, P);
  return S(k.slabOf(plan, z, 1.2, P, 2), { tone: kind === "2" ? "mid" : "hi", crease: "lo" }) + L(top, { tone: "lo", dotted: kind === "2", free: true });
}

function drain() {
  const [x, y] = DRAIN;
  const out = [];
  out.push(S(k.cylinder(x, y, 15, 0, 1.4, P, 48, 0.5), { tone: "mid" }));
  out.push(L(k.ring(x, y, 12.5, 1.4, P, 48) + k.ring(x, y, 4, 1.4, P, 24), { tone: "lo" }));
  const slots = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    slots.push(k.lineOnTop([x + Math.cos(a) * 4, y + Math.sin(a) * 4], [x + Math.cos(a) * 12.5, y + Math.sin(a) * 12.5], 1.4, P));
  }
  out.push(L(slots.join(""), { tone: "lo" }));
  const tag = { x: x + 18, y: y - 4, w: 20, d: 8, r: 1 };
  out.push(S(k.slabOf(tag, 0, 0.6, P, 3, 0.3), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([tag.x + 1.6, tag.y + 5.2], 0.6, P, "x"), "/dev/null", { size: 3, tone: "mid" }));
  out.push(D(Array.from({ length: 4 }, (_, i) => at([x + Math.cos(i * 1.57 + 0.78) * 13.8, y + Math.sin(i * 1.57 + 0.78) * 13.8, 1.4])), { size: 0.4 }));
  return out.join("");
}

function diverterBase([x, y]) {
  return S(k.cylinder(x, y, 11, 0, 2.2, P, 48, 0.4), { tone: "mid" }) + L(k.ring(x, y, 9, 2.2, P, 40), { tone: "faint" }) + D(Array.from({ length: 6 }, (_, i) => at([x + Math.cos(i * 1.047) * 10, y + Math.sin(i * 1.047) * 10, 2.2])), { size: 0.4, tone: "lo" });
}

const cube = S(k.slabOf({ x: -TOK.size / 2, y: -TOK.size / 2, w: TOK.size, d: TOK.size, r: 0.5 }, 0, TOK.size, P, 2, 0.3), { tone: "hi", crease: "lo" });
const puck = S(k.cylinder(0, 0, TOK.r, 0, TOK.h, P, 20, 0.3), { tone: "mid", crease: "lo", inner: "" }) + L(k.ring(0, 0, TOK.r - 1, TOK.h, P, 16), { tone: "lo", dotted: true });
const inTok = S(k.slabOf({ x: -2, y: -2, w: 4, d: 4, r: 0.4 }, 0, 2.4, P, 2), { tone: "lo" });

const cards = [];
for (let level = 0; level < CARDS; level++) for (const kind of ["1", "2"]) cards.push(`<g data-card="${level}-${kind}" style="display:none">${card(level, kind)}</g>`);

const label =
  "Una máquina-proceso sobre una placa. Por la boca 0 entran fichas desde un teclado. Por la boca 1 salen cubos (stdout) y por la boca 2 discos (stderr). Cada salida pasa por un desviador giratorio que la manda a uno de tres destinos: un monitor (la terminal), una caja de hojas (un archivo) o un desagüe (/dev/null).";

const movers = [
  ["proc", process_(), PROC.x + PROC.w / 2, PROC.y + PROC.d / 2],
  ["mon", monitor(), 120, -54],
  ["boxback", boxBack() + `<g data-part="cards">${cards.join("")}</g>`, BOX.x + 2, BOX.y + 2],
  ["boxfront", boxFront(), BOX.x + BOX.w, BOX.y + BOX.d],
  ["keyb", keyboard(), KEYB.x + KEYB.w / 2, KEYB.y + KEYB.d / 2],
  ["d1", diverterBase(D1) + `<g data-vane></g>`, ...D1],
  ["d2", diverterBase(D2) + `<g data-vane></g>`, ...D2],
];
const tokens = [];
for (let i = 0; i < POOL; i++) tokens.push(`<g data-tok="1" style="display:none">${cube}</g>`, `<g data-tok="2" style="display:none">${puck}</g>`);
for (let i = 0; i < 3; i++) tokens.push(`<g data-tok="0" style="display:none">${inTok}</g>`);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label,
  body: [
    plate(),
    tracks(),
    drain(),
    `<g data-movers>${movers.map(([id, s, x, y]) => `<g data-part="${id}" data-x="${x}" data-y="${y}"${id === "d1" || id === "d2" ? ' style="cursor:pointer"' : ""}>${s}</g>`).join("")}${tokens.join("")}</g>`,
    `<g data-part="screen"></g>`,
  ],
});

const MODEL = { P, D1, D2, ROUTES, BRANCHES, DEST, SCREEN, DRAIN, BOX, CARDS };

const live = `
const M = ${JSON.stringify(MODEL)};
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const q = (s) => svgEl.querySelector(s);
const readoutEl = document.querySelector("[data-readout]");
const stillMq = matchMedia("(prefers-reduced-motion: reduce)");
const moversEl = q("[data-movers]");
const screenEl = q('[data-part="screen"]');
const fixed = [...moversEl.querySelectorAll(":scope > [data-part]")];
const pool = { 0: [...moversEl.querySelectorAll('[data-tok="0"]')], 1: [...moversEl.querySelectorAll('[data-tok="1"]')], 2: [...moversEl.querySelectorAll('[data-tok="2"]')] };
const DESTS = ["term", "file", "null"];

// Estado: adónde apunta cada descriptor.
let route = { 1: "term", 2: "term" };
const vane = { 1: 0, 2: 0 };
const angleTo = (fd, to) => { const b = M.BRANCHES[fd + "-" + to]; const [a, c] = [b[0], b[1]]; return Math.atan2(c[1] - a[1], c[0] - a[0]); };

function commandOf() {
  let cmd = "find /etc -name '*.conf'";
  if (route[1] === "file") cmd += " > salida.txt";
  if (route[1] === "null") cmd += " > /dev/null";
  if (route[2] !== "term") cmd += route[2] === route[1] ? " 2>&1" : route[2] === "file" ? " 2> salida.txt" : " 2> /dev/null";
  return cmd;
}

// Pantalla (líneas en la cara del monitor) y archivo (hojas apiladas).
let screen = [];
let fileLines = [];
function drawScreen() {
  const rows = screen.slice(-6);
  const step = (M.SCREEN.z1 - M.SCREEN.z0 - 4) / 6;
  const out = rows.map((kind, i) => {
    const z = M.SCREEN.z1 - 3 - i * step;
    const len = kind === "1" ? 18 : 11;
    return '<path class="iso-line" data-tone="' + (kind === "1" ? "hi" : "mid") + '" data-free=""' + (kind === "2" ? ' stroke-dasharray="0.6 1.6"' : "") + ' d="' + segment([M.SCREEN.x0 + 3, M.SCREEN.y, z], [M.SCREEN.x0 + 3 + len, M.SCREEN.y, z], M.P) + '"/>';
  });
  screenEl.innerHTML = out.join("");
}
function drawFile() {
  for (const el of q('[data-part="cards"]').children) el.style.display = "none";
  fileLines.slice(-M.CARDS).forEach((kind, level) => { const el = q('[data-card="' + level + "-" + kind + '"]'); if (el) el.style.display = ""; });
}
function arrive(kind, to) {
  if (to === "term") { screen.push(kind); if (screen.length > 6) screen.shift(); drawScreen(); }
  if (to === "file") { fileLines.push(kind); if (fileLines.length > M.CARDS) fileLines.shift(); drawFile(); }
}

// Fichas en vuelo.
const live = [];
const lengthOf = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
function pointAlong(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg) { const t = d / seg; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; }
    d -= seg;
  }
  return pts[pts.length - 1];
}
function spawn(kind) {
  const el = pool[kind].find((e) => !e.__busy);
  if (!el) return;
  const to = kind === "0" ? null : route[kind];
  const pts = kind === "0" ? M.ROUTES[0] : [...M.ROUTES[kind], ...M.BRANCHES[kind + "-" + to].slice(1)];
  el.__busy = true;
  el.style.display = "";
  live.push({ el, kind, to, pts, len: lengthOf(pts), d: 0, sink: 0 });
}

function setRoute(fd, to, quiet) {
  route[fd] = to;
  // Una redirección con > abre el archivo truncándolo: cada ejecución lo vacía.
  if (route[1] === "file" || route[2] === "file") { fileLines = []; drawFile(); }
  if (!quiet) describe();
}
function setMode(r1, r2) { route = { 1: r1, 2: r2 }; if (r1 === "file" || r2 === "file") { fileLines = []; drawFile(); } describe(); }
function describe() { stage.setAttribute("aria-valuetext", commandOf() + ". stdout va a " + route[1] + ", stderr va a " + route[2]); }

const SPEED = 34;
function draw() {
  const items = [];
  fixed.forEach((el) => items.push([depthOf([+el.dataset.x, +el.dataset.y, 0], M.P), el]));
  for (const t of live) {
    const [x, y] = pointAlong(t.pts, t.d);
    // Sobre la plataforma de un desviador la ficha va 2,2 más alta.
    const onDisc = [M.D1, M.D2].some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 11.5);
    t.lift = t.lift === undefined ? 0 : t.lift + ((onDisc ? 2.2 : 0) - t.lift) * 0.35;
    t.el.setAttribute("transform", translateAlong(M.P, [x, y, t.lift - t.sink * 4]));
    t.el.setAttribute("opacity", (1 - t.sink).toFixed(3));
    items.push([depthOf([x, y, 0], M.P) + 0.01, t.el]);
  }
  items.sort((a, b) => a[0] - b[0]);
  items.forEach(([, el], i) => { if (moversEl.children[i] !== el) moversEl.insertBefore(el, moversEl.children[i] || null); });
  for (const fd of ["1", "2"]) {
    const [x, y] = fd === "1" ? M.D1 : M.D2;
    const a = vane[fd];
    const c = Math.cos(a), s = Math.sin(a);
    const pt = (u, v) => [x + c * u - s * v, y + s * u + c * v];
    const ring = [pt(-4, -2), pt(12, -2), pt(14.5, 0), pt(12, 2), pt(-4, 2)];
    q('[data-part="d' + fd + '"] [data-vane]').innerHTML = solidSvg(extrude(ring, 2.2, 3, M.P), { tone: "hi", lit: true }) + dotsSvg([iso([x, y, 5.2], M.P)], { size: 0.6, tone: "hi" });
  }
  svgEl.querySelectorAll("[data-track]").forEach((el) => { const [fd, to] = el.dataset.track.split("-"); const on = route[fd] === to; el.setAttribute("data-tone", on ? "hi" : "faint"); el.style.strokeWidth = on ? "1.3px" : ""; });
  const text = commandOf();
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
}

const TOUR = [["term", "term"], ["file", "term"], ["term", "null"], ["file", "file"], ["null", "null"]];
let tourIx = 0, tourT = 0, touring = !stillMq.matches, idleTimer = 0;
let frame = 0, last = 0, visible = false;
const clocks = { 0: 1.6, 1: 0.3, 2: 0.9 };
const EVERY = { 0: 2.6, 1: 1.2, 2: 1.9 };

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = stillMq.matches;
  if (touring) { tourT += dt; if (tourT > 6.5) { tourT = 0; tourIx = (tourIx + 1) % TOUR.length; setMode(...TOUR[tourIx]); } }
  if (!calm) for (const kind of ["0", "1", "2"]) { clocks[kind] -= dt; if (clocks[kind] <= 0) { clocks[kind] = EVERY[kind]; spawn(kind); } }
  for (const t of [...live]) {
    if (t.d < t.len) t.d = Math.min(t.len, t.d + SPEED * dt);
    else if (t.to === "null") t.sink = Math.min(1, t.sink + dt * 2.4);
    else t.sink = 1;
    if (t.sink >= 1) {
      if (t.to) arrive(t.kind, t.to);
      t.el.style.display = "none"; t.el.__busy = false; t.sink = 0;
      live.splice(live.indexOf(t), 1);
    }
  }
  for (const fd of ["1", "2"]) {
    const want = angleTo(fd, route[fd]);
    let d = want - vane[fd];
    d = Math.atan2(Math.sin(d), Math.cos(d));
    vane[fd] = calm ? want : vane[fd] + d * (1 - Math.exp(-dt / 0.18));
  }
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } else if (stillMq.matches) draw(); };
const interact = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !stillMq.matches; tourT = 0; run(); }, 9000); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

const cycle = (fd) => setRoute(fd, DESTS[(DESTS.indexOf(route[fd]) + 1) % 3]);
svgEl.addEventListener("click", (event) => {
  const el = event.target.closest('[data-part="d1"],[data-part="d2"]');
  if (!el) return;
  interact();
  cycle(el.dataset.part === "d1" ? "1" : "2");
  run();
});
stage.addEventListener("keydown", (event) => {
  let handled = true;
  if (event.key === "1" || event.key === "2") cycle(event.key);
  else if (event.key === "ArrowRight" || event.key === "ArrowLeft") { tourIx = (tourIx + (event.key === "ArrowRight" ? 1 : TOUR.length - 1)) % TOUR.length; setMode(...TOUR[tourIx]); }
  else handled = false;
  if (!handled) return;
  event.preventDefault();
  interact();
  run();
});
stage.addEventListener("focus", interact);
// Arranque: la terminal ya tiene algunas líneas.
screen = ["1", "1", "2", "1"];
drawScreen();
describe();
draw();
`;

const body = k.plateHtml({
  fig: "Fig 3.2",
  title: "Descriptores 0 · 1 · 2",
  hint: "Toca un desviador para redirigir",
  readout: "find /etc -name '*.conf'",
  keys: [
    { mark: "raised", label: "Cubos: stdout (FD 1) · discos punteados: stderr (FD 2)" },
    { mark: "lit", label: "Desviadores: los operadores >, 2> y 2>&1" },
    { mark: "edge", label: "Destinos: monitor (terminal), caja (archivo), desagüe (/dev/null)" },
  ],
  caption:
    "El proceso no sabe adónde va su salida: escribe por la boca 1 y por la boca 2, y es la shell la que gira los desviadores antes de arrancarlo. Por defecto las dos van a la terminal. > manda la 1 a un archivo (y lo vacía al abrirlo), 2> /dev/null tira los errores, y 2>&1 hace que la 2 siga a la 1 adonde vaya. La boca 0 recibe del teclado. Teclas: 1 y 2 giran cada desviador; flechas recorren ejemplos.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Redirección de descriptores: las teclas 1 y 2 cambian el destino de stdout y stderr, las flechas recorren ejemplos">${svg}</div>`,
});

writeFigure({ name: "redireccion", title: "Descriptores y redirección", body, live, theme, out });
