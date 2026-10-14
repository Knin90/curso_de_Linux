// Fig 6.3 — enable vs start.
// Tres servicios (motores con volante). El interruptor de cada motor es
// `start`/`stop`: el volante gira ahora, pero solo en RAM. El tambor del
// fondo es multi-user.target; una clavija en el tambor es el enlace simbólico
// que crea `enable` en multi-user.target.wants/. Al reiniciar, todo se para,
// el tambor da una vuelta y cada clavija empuja la varilla de su servicio:
// solo arrancan los que tienen clavija.
//
//   node figuras/systemd-enable/build.mjs [--light] [--out <dir>]
import * as k from "../../.agents/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.agents/skills/anatomy/kit/lathe.mjs";
import { options, writeFigure } from "../lib.mjs";

const { theme, out } = options();
const WIDTH = 640;
const HEIGHT = 420;

// ---- Modelo ---------------------------------------------------------------
const UNITS = [
  { name: "nginx", active: false, enabled: false },
  { name: "sshd", active: true, enabled: true },
  { name: "cups", active: false, enabled: false },
];

// ---- Mundo ----------------------------------------------------------------
const PLATE = { x: -168, y: -76, w: 336, d: 140, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const XS = [-96, 0, 96];
const DY = -54; // eje del tambor
const DZ = 26;
const DR = 9; // radio del tambor
const D0 = -150; // extremos del tambor
const D1 = 150;
const PEG = 8; // lo que sobresale la clavija
const HOUSING = { y: -2, r: 15, z0: 5, z1: 30 };
const FLY = { r: 14, z0: 35, z1: 38.5 };
const ROD = { y0: DY + DR + PEG - 1.2, y1: HOUSING.y - HOUSING.r - 0.4, r: 1.3, kick: 3.2 };
const GUIDE_Y = -34;
const KNOB = { y: 17, travel: 6, r: 2.8 };
const WHEEL_X = 163; // cara exterior del volante de mano
const ANGLES = 72;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [D0, DY, DZ + 18], [WHEEL_X, DY, DZ + 15], [XS[0], HOUSING.y, FLY.z1 + 2], [XS[2], HOUSING.y, FLY.z1 + 2]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 52 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
// Marco del tambor: ángulo 0 apunta a +z y crece hacia +y.
const drumFrame = (x) => G.frameOf([x, DY, DZ], [1, 0, 0], [0, 0, 1], [0, 1, 0]);

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
  // Bancada del tambor: una regleta baja a lo largo de x.
  const bed = { x: D0 - 8, y: DY - 10, w: D1 - D0 + 16, d: 20, r: 2 };
  out.push(S(k.slabOf(bed, 0, 1.2, P, 3, 0.4), { tone: "lo" }));
  // Regla frontal.
  const strip = { x: -150, y: 50, w: 300, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  return out.join("");
}

// Soporte del tambor (cojinete) en x.
function bearing(x) {
  const out = [];
  const block = { x: x - 5, y: DY - 9, w: 10, d: 18, r: 1.5 };
  out.push(S(k.slabOf({ x: x - 8, y: DY - 12, w: 16, d: 24, r: 2 }, 1.2, 3, P, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners({ x: x - 8, y: DY - 12, w: 16, d: 24 }, 2.4).map(([px, py]) => at([px, py, 4.2])), { size: 0.4 }));
  out.push(S(k.slabOf(block, 4.2, DZ + 11 - 4.2, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(block, DZ, P, 3), { tone: "faint" }) }));
  out.push(D([at([x - 2.5, DY - 6, DZ + 11]), at([x + 2.5, DY + 6, DZ + 11])], { size: 0.45 }));
  return out.join("");
}

function drum() {
  const F = drumFrame(D0 + 3);
  const len = D1 - D0 - 6;
  const seams = XS.flatMap((x) => [x - 7, x + 7]).map((x) => G.arcOf(F, x - D0 - 3, DR, P));
  const out = [];
  out.push(S(G.disc(0, len, DR, F, P), { tone: "hi", crease: "lo", inner: L(seams.join(""), { tone: "faint" }) }));
  return out.join("");
}

// Clavija (enlace en .wants/) en la posición x = 0; se traslada a cada servicio.
function pegAt(angle) {
  const F = drumFrame(0);
  const dir = G.radialOf(F, angle);
  const base = G.add3 ? G.add3([0, DY, DZ], G.mul3(dir, DR - 0.6)) : [0, DY + dir[1] * (DR - 0.6), DZ + dir[2] * (DR - 0.6)];
  const PF = G.frameAlong(base, dir);
  return S(G.disc(0, PEG - 1.8, 1.8, PF, P), { tone: "hi", lit: true }) + S(G.disc(PEG - 1.8, PEG + 0.6, 2.9, PF, P), { tone: "hi", lit: true });
}

// Volante de mano con radios y empuñadura, por ángulo.
function wheelAt(angle) {
  const F = drumFrame(D1 + 6);
  const out = [];
  out.push(S(G.disc(0, WHEEL_X - D1 - 9, 14, F, P), { tone: "mid", crease: "lo" }));
  const face = WHEEL_X - D1 - 9;
  out.push(L(G.circleOf(F, face, 11.4, P), { tone: "lo" }));
  out.push(L(G.spokesOf(F, face, 3.2, 11.4, 4, P, { phase: angle }), { tone: "lo" }));
  out.push(L(G.circleOf(F, face, 3.2, P), { tone: "lo" }));
  const grip = G.pointOf(F, face, 9, angle);
  const GF = G.frameOf(grip, [1, 0, 0], [0, 0, 1], [0, 1, 0]);
  out.push(S(G.disc(0, 6, 1.8, GF, P), { tone: "mid" }));
  out.push(S(G.disc(6, 7, 2.2, GF, P), { tone: "mid" }));
  return out.join("");
}

function wheelHub() {
  const F = drumFrame(D1);
  return S(G.disc(0, 6, 3.4, F, P), { tone: "mid" }) + S(G.disc(6, 9, 5, F, P), { tone: "mid" });
}

// Guía y varilla de empuje de cada servicio.
function guide(x) {
  const out = [];
  out.push(S(k.cylinder(x, GUIDE_Y, 3, 0, 1.4, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(x, GUIDE_Y, 2, 1.4, DZ - 4 - 1.4, P, 18), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: x - 3.6, y: GUIDE_Y - 3.6, w: 7.2, d: 7.2, r: 1 }, DZ - 4, 8, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([x, GUIDE_Y, DZ + 4])], { size: 0.4 }));
  return out.join("");
}
function rodPiece(x, y0, y1) {
  const F = G.frameOf([x, y0, DZ], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
  return S(G.disc(0, y1 - y0, ROD.r, F, P), { tone: "mid" });
}

function unit(x, u) {
  const out = [];
  const base = { x: x - 30, y: -26, w: 60, d: 56, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(base, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(base, 0, 5, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(base, 2.5, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(base, 3).map(([px, py]) => at([px, py, 5])), { size: 0.45 }));
  // Placa de nombre grabada.
  const tag = { x: x - 26, y: 18, w: 14, d: 9, r: 1 };
  out.push(S(k.slabOf(tag, 5, 0.6, P, 3, 0.3), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([tag.x + 1.6, tag.y + 6], 5.6, P, "x"), u.name, { size: 3.6, tone: "mid" }));
  // Carcasa del motor con aletas.
  out.push(S(k.cylinder(x, HOUSING.y, HOUSING.r + 1.4, HOUSING.z0, 2.4, P, 48, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, HOUSING.y, HOUSING.r, HOUSING.z0 + 2.4, HOUSING.z1 - HOUSING.z0 - 4.8, P, 56), { tone: "mid", crease: "none", inner: L(k.knurl(x, HOUSING.y, HOUSING.r, HOUSING.z0 + 2.4, HOUSING.z1 - 2.4, 40, P, 0.5), { tone: "lo" }) }));
  out.push(S(k.cylinder(x, HOUSING.y, HOUSING.r + 1.4, HOUSING.z1 - 2.4, 2.4, P, 48, 0.4), { tone: "mid" }));
  out.push(L(k.ring(x, HOUSING.y, HOUSING.r - 2, HOUSING.z1, P, 48), { tone: "faint" }));
  out.push(D(Array.from({ length: 6 }, (_, i) => at([x + Math.cos((i / 6) * Math.PI * 2) * (HOUSING.r - 0.4), HOUSING.y + Math.sin((i / 6) * Math.PI * 2) * (HOUSING.r - 0.4), HOUSING.z1])), { size: 0.4 }));
  out.push(S(k.cylinder(x, HOUSING.y, 2.4, HOUSING.z1, FLY.z0 - HOUSING.z1, P, 20), { tone: "mid" }));
  // Volante: disco fijo; los radios se dibujan aparte.
  out.push(S(k.cylinder(x, HOUSING.y, FLY.r, FLY.z0, FLY.z1 - FLY.z0, P, 64, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideArc(x, HOUSING.y, FLY.r, FLY.z0 + 1.6, P, 40), { tone: "faint" }) }));
  out.push(L(k.ring(x, HOUSING.y, FLY.r - 2.4, FLY.z1, P, 64), { tone: "lo" }));
  out.push(L(k.ring(x, HOUSING.y, 3, FLY.z1, P, 24), { tone: "lo" }));
  // Placa del interruptor con ranura.
  const sw = { x: x + 4, y: 10, w: 18, d: 16, r: 1.5 };
  out.push(S(k.slabOf(sw, 5, 3, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: x + 11.6, y: KNOB.y - 1.6, w: 2.8, d: KNOB.travel + 3.2, r: 1.4 }, 8, P, 4), { tone: "lo" }));
  const ticks = [KNOB.y, KNOB.y + KNOB.travel].map((y) => k.lineOnTop([sw.x + sw.w, y], [sw.x + sw.w - 3, y], 8, P));
  out.push(L(ticks.join(""), { tone: "mid" }));
  out.push(D([at([sw.x + 2, sw.y + 2, 8]), at([sw.x + 2, sw.y + sw.d - 2, 8])], { size: 0.4 }));
  return out.join("");
}
function knob(x) {
  return (
    S(k.cylinder(x + 13, KNOB.y, KNOB.r, 8, 4.2, P, 24), { tone: "hi", crease: "lo", inner: L(k.knurl(x + 13, KNOB.y, KNOB.r, 8, 12.2, 18, P), { tone: "lo" }) }) +
    D([at([x + 13, KNOB.y, 12.2])], { size: 0.5, tone: "hi" })
  );
}

const pegFrames = Array.from({ length: ANGLES }, (_, i) => pegAt((i / ANGLES) * Math.PI * 2));
const wheelFrames = Array.from({ length: ANGLES }, (_, i) => wheelAt((i / ANGLES) * Math.PI * 2));

// Zonas de clic invisibles sobre el tambor, una por servicio.
const hits = XS.map((x, i) => {
  const F = drumFrame(x - 9);
  return `<path d="${G.disc(0, 18, DR + PEG + 1, F, P).fill}" fill="transparent" style="cursor:pointer" data-act="enable" data-i="${i}"/>`;
}).join("");

const label =
  "Tres servicios dibujados como motores con volante sobre una bancada. Cada motor tiene un interruptor deslizante: start y stop. Detrás, un tambor horizontal hace de multi-user.target; una clavija en el tambor es el enlace simbólico que crea enable. Al reiniciar, todos los volantes se paran, el tambor da una vuelta y cada clavija empuja la varilla de su servicio para arrancarlo.";

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label,
  body: [
    plate(),
    bearing(D0 - 1),
    `<g data-part="pegs-back">${XS.map((x, i) => `<g data-peg="${i}" data-x="${x}"></g>`).join("")}</g>`,
    drum(),
    `<g data-part="pegs-front"></g>`,
    hits,
    bearing(D1 + 1),
    wheelHub(),
    `<g data-part="wheel" style="cursor:pointer" data-act="reboot">${wheelFrames[0]}</g>`,
    ...XS.map(
      (x, i) =>
        `<g data-part="rodback-${i}">${rodPiece(x, ROD.y0, GUIDE_Y - 3.6)}</g>${guide(x)}<g data-part="rodfront-${i}">${rodPiece(x, GUIDE_Y + 3.6 - 0.2, ROD.y1)}</g>` +
        `<g data-act="start" data-i="${i}" style="cursor:pointer">${unit(x, UNITS[i])}<path data-part="spokes-${i}" class="iso-line" data-tone="lo" d=""/><path data-part="mark-${i}" class="iso-line" data-tone="lit" d="" style="stroke-width:1.2"/><g data-part="knob-${i}">${knob(x)}</g></g>`,
    ),
  ],
});

const MODEL = { P, XS, DY, DZ, DR, PEG, FLY, HOUSING, KNOB, ROD, UNITS };

const live = `
const M = ${JSON.stringify(MODEL)};
const PEGS = ${JSON.stringify(pegFrames)};
const WHEELS = ${JSON.stringify(wheelFrames)};
const N = PEGS.length, TAU = Math.PI * 2;
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const q = (s) => svgEl.querySelector(s);
const readoutEl = document.querySelector("[data-readout]");
const stillMq = matchMedia("(prefers-reduced-motion: reduce)");
const backG = q('[data-part="pegs-back"]'), frontG = q('[data-part="pegs-front"]'), wheelG = q('[data-part="wheel"]');
const pegEls = [...backG.children];
const units = M.UNITS.map((u, i) => ({ ...u, spin: 0, speed: 0, show: u.enabled ? 1 : 0, knob: u.active ? 1 : 0, kick: 0,
  spokes: q('[data-part="spokes-' + i + '"]'), mark: q('[data-part="mark-' + i + '"]'), knobEl: q('[data-part="knob-' + i + '"]'),
  rodB: q('[data-part="rodback-' + i + '"]'), rodF: q('[data-part="rodfront-' + i + '"]') }));
let drumA = 0, phase = "idle", phaseT = 0, said = "start = ahora · enable = al arrancar", lastPegIx = -1;
const RPS = 0.7;

function say(text) { said = text; }
const stateOf = (u) => u.name + ": " + (u.active ? "active" : "inactive") + ", " + (u.enabled ? "enabled" : "disabled");

const act = {
  start(i) { const u = units[i]; u.active = true; say("systemctl start " + u.name + " → " + stateOf(u)); },
  stop(i) { const u = units[i]; u.active = false; say("systemctl stop " + u.name + " → " + stateOf(u)); },
  enable(i) { const u = units[i]; u.enabled = true; say("systemctl enable " + u.name + " → " + stateOf(u)); },
  disable(i) { const u = units[i]; u.enabled = false; say("systemctl disable " + u.name + " → " + stateOf(u)); },
  enableNow(i) { const u = units[i]; u.enabled = true; u.active = true; say("systemctl enable --now " + u.name + " → " + stateOf(u)); },
  disableNow(i) { const u = units[i]; u.enabled = false; u.active = false; say("systemctl disable --now " + u.name + " → " + stateOf(u)); },
  reboot() { if (phase !== "idle") return; phase = "down"; phaseT = 0; units.forEach((u) => (u.active = false)); say("reboot → apagando: la RAM se vacía"); },
  reset() { M.UNITS.forEach((s, i) => { units[i].active = s.active; units[i].enabled = s.enabled; }); say("estado inicial"); },
};

function draw() {
  const ix = ((Math.round((drumA / TAU) * N) % N) + N) % N;
  if (ix !== lastPegIx) { wheelG.innerHTML = WHEELS[ix]; pegEls.forEach((el) => (el.innerHTML = PEGS[ix])); lastPegIx = ix; }
  const a = (ix / N) * TAU;
  const facing = Math.sin(a) * Math.sin(${(52 * Math.PI) / 180}) * Math.cos(Math.PI / 6) + Math.cos(a) * Math.sin(Math.PI / 6);
  const into = facing >= 0 ? frontG : backG;
  units.forEach((u, i) => {
    const el = pegEls[i];
    if (el.parentNode !== into) into.appendChild(el);
    el.setAttribute("transform", translateAlong(M.P, [+el.dataset.x, 0, 0]));
    el.setAttribute("opacity", u.show.toFixed(3));
    el.style.display = u.show < 0.01 ? "none" : "";
    const x = M.XS[i], cy = M.HOUSING.y, z = M.FLY.z1;
    const spokes = [0, 1, 2].map((s) => { const t = u.spin + (s / 3) * TAU; return lineOnTop([x + Math.cos(t) * 3, cy + Math.sin(t) * 3], [x + Math.cos(t) * (M.FLY.r - 2.4), cy + Math.sin(t) * (M.FLY.r - 2.4)], z, M.P); }).join("");
    u.spokes.setAttribute("d", spokes);
    const t = u.spin;
    u.mark.setAttribute("d", lineOnTop([x + Math.cos(t) * (M.FLY.r - 2.4), cy + Math.sin(t) * (M.FLY.r - 2.4)], [x + Math.cos(t) * (M.FLY.r - 0.6), cy + Math.sin(t) * (M.FLY.r - 0.6)], z, M.P));
    u.knobEl.setAttribute("transform", translateAlong(M.P, [0, u.knob * M.KNOB.travel, 0]));
    const kick = translateAlong(M.P, [0, u.kick * M.ROD.kick, 0]);
    u.rodB.setAttribute("transform", kick); u.rodF.setAttribute("transform", kick);
  });
  const text = said || units.map((u) => u.name + " " + (u.active ? "▲" : "·") + (u.enabled ? "⚑" : "")).join("  ");
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
}

function describe() {
  stage.setAttribute("aria-valuetext", units.map(stateOf).join("; "));
}

// Recorrido: la historia del módulo (start sin enable → corte de luz → caído).
const TOUR = [
  [1.0, () => act.reset()],
  [2.8, () => act.start(0)],
  [3.0, () => act.reboot()],
  [5.6, () => act.enable(0)],
  [3.0, () => act.reboot()],
  [5.6, () => act.disableNow(0)],
  [2.8, () => act.enableNow(2)],
  [3.0, () => act.reboot()],
  [5.6, () => act.disableNow(2)],
];
let tourIx = 0, tourWait = 1.2, touring = !stillMq.matches, idleTimer = 0;
let frame = 0, last = 0, visible = false;
const ease = (cur, want, dt, tau, calm) => (calm ? want : cur + (want - cur) * (1 - Math.exp(-dt / tau)));

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = stillMq.matches;
  if (touring && phase === "idle") {
    tourWait -= dt;
    if (tourWait <= 0) { const [wait, fn] = TOUR[tourIx]; fn(); describe(); tourWait = wait; tourIx = (tourIx + 1) % TOUR.length; }
  }
  // Reinicio: apagado, vuelta del tambor, arranque por clavijas.
  if (phase === "down") { phaseT += dt; if (phaseT > (calm ? 0 : 1.1)) { phase = "turn"; phaseT = 0; say("reboot → multi-user.target: buscando enlaces en .wants/"); } }
  else if (phase === "turn") {
    const dur = calm ? 0.001 : 2.6;
    phaseT += dt;
    const before = drumA;
    const p = Math.min(1, phaseT / dur);
    drumA = (p < 1 ? (0.5 - Math.cos(p * Math.PI) / 2) : 1) * TAU;
    units.forEach((u) => {
      const d = Math.abs(((drumA - Math.PI / 2 + Math.PI) % TAU) - Math.PI);
      u.kick = u.enabled ? Math.max(0, 1 - d / 0.45) : 0;
      if (u.enabled && before < Math.PI / 2 && drumA >= Math.PI / 2) u.active = true;
    });
    if (p >= 1) {
      drumA = 0; phase = "idle";
      units.forEach((u) => { u.kick = 0; if (u.enabled) u.active = true; });
      const up = units.filter((u) => u.active).map((u) => u.name);
      const down = units.filter((u) => !u.active).map((u) => u.name);
      say("reboot → arrancan: " + (up.join(", ") || "ninguno") + (down.length ? " · siguen paradas: " + down.join(", ") : ""));
      describe();
    }
  }
  let moving = phase !== "idle";
  units.forEach((u) => {
    const want = u.active ? RPS * TAU : 0;
    u.speed = ease(u.speed, want, dt, u.active ? 0.5 : 0.9, calm);
    if (Math.abs(u.speed - want) < 1e-3) u.speed = want;
    u.spin = (u.spin + u.speed * (calm ? 0 : dt)) % TAU;
    u.show = ease(u.show, u.enabled ? 1 : 0, dt, 0.18, calm);
    if (Math.abs(u.show - (u.enabled ? 1 : 0)) < 2e-3) u.show = u.enabled ? 1 : 0;
    u.knob = ease(u.knob, u.active ? 1 : 0, dt, 0.12, calm);
    if (Math.abs(u.knob - (u.active ? 1 : 0)) < 2e-3) u.knob = u.active ? 1 : 0;
    if (u.speed > 0 || u.show !== (u.enabled ? 1 : 0) || u.knob !== (u.active ? 1 : 0)) moving = true;
  });
  draw();
  frame = visible && (moving || touring) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const interact = () => {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !stillMq.matches; tourIx = 0; tourWait = 0.5; run(); }, 9000);
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

svgEl.addEventListener("click", (event) => {
  const el = event.target.closest("[data-act]");
  if (!el) return;
  interact();
  const i = +el.dataset.i;
  if (el.dataset.act === "reboot") act.reboot();
  else if (phase !== "idle") return;
  else if (el.dataset.act === "start") (units[i].active ? act.stop : act.start)(i);
  else if (el.dataset.act === "enable") (units[i].enabled ? act.disable : act.enable)(i);
  describe();
  run();
});
stage.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const s = "123".indexOf(key), e = "asd".indexOf(key);
  let handled = true;
  if (key === "r") act.reboot();
  else if (phase !== "idle" || !key) handled = s >= 0 || e >= 0;
  else if (s >= 0) (units[s].active ? act.stop : act.start)(s);
  else if (e >= 0) (units[e].enabled ? act.disable : act.enable)(e);
  else handled = false;
  if (!handled) return;
  event.preventDefault();
  interact();
  describe();
  run();
});
stage.addEventListener("focus", interact);
describe();
draw();
`;

const body = k.plateHtml({
  fig: "Fig 6.3",
  title: "enable vs start",
  hint: "Toca motor, clavija o manivela",
  readout: "",
  keys: [
    { mark: "raised", label: "Motor con interruptor: start / stop (solo RAM)" },
    { mark: "lit", label: "Clavija en el tambor: el enlace que crea enable" },
    { mark: "edge", label: "Tambor: multi-user.target · manivela: reboot" },
  ],
  caption:
    "start gira el volante ahora, pero ese estado vive en la RAM: un reinicio lo borra. enable no arranca nada: clava un enlace en multi-user.target.wants/. En cada arranque el tambor da una vuelta y solo los servicios con clavija vuelven a girar. enable --now hace las dos cosas. Teclas: 1–3 start/stop, A S D enable/disable, R reboot.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="enable frente a start: teclas 1 a 3 arrancan o paran un servicio, A, S y D lo habilitan o deshabilitan, R reinicia">${svg}</div>`,
});

writeFigure({ name: "systemd-enable", title: "enable vs start", body, live, theme, out });
