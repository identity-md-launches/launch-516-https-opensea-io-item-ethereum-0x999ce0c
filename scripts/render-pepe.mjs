// Generates an ASS subtitle file that draws every frame of the Swarm Pepe #1043 video
// (vector drawings + text), plus the aevalsrc audio expression and ffmpeg filter script.
import fs from 'fs';
fs.mkdirSync('build', { recursive: true });
const W = 1280, H = 720, FPS = 25, DUR = 15, N = FPS * DUR;
const P = 8; // \p4 => coords are 8x
const R = v => Math.round(v * P);
const col = hex => '&H' + hex.slice(4, 6) + hex.slice(2, 4) + hex.slice(0, 2) + '&';
const alp = a => '&H' + Math.round((1 - clamp(a)) * 255).toString(16).padStart(2, '0').toUpperCase() + '&';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const eOut = k => 1 - Math.pow(1 - clamp(k), 3);
const eBack = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const ts = cs => { const h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, s = Math.floor(cs / 100) % 60, c = cs % 100; return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`; };
const fmt = n => Math.round(n).toLocaleString('en-US');

let rs = 1043; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

const events = [];
let batch = new Map(), frameText = [], curF = 0;
function ev(layer, c0, c1, text) { events.push({ layer, c0, c1, text }); }
function staticEv(layer, t0, t1, text) { ev(layer, Math.round(t0 * 100), Math.round(t1 * 100), text); }

function shape(layer, path, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.003) return;
  const fa = o.fillAlpha ?? a;
  const key = [layer, o.fill ?? '000000', o.bord ?? 0, o.bc ?? '000000', alp(a), alp(fa), o.blur ?? 0].join('|');
  if (!batch.has(key)) batch.set(key, { layer, o: { ...o }, a, fa, paths: [] });
  batch.get(key).paths.push(path);
}
function text(layer, x, y, an, size, color, str, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.003) return;
  frameText.push({ layer, t: `{\\an${an}\\pos(${x.toFixed(1)},${y.toFixed(1)})\\fnFreeSans\\b1\\fs${size}\\1c${col(color)}\\3c${col(o.bc ?? '000000')}\\4c&H000000&\\bord${o.bord ?? 3}\\shad${o.shad ?? 2}\\1a${alp(a)}\\3a${alp(a)}\\4a${alp(a * 0.6)}\\fscx${(o.sc ?? 100).toFixed(1)}\\fscy${(o.sc ?? 100).toFixed(1)}\\blur${o.blur ?? 0.6}}${str}` });
}
function flush() {
  const c0 = curF * 4, c1 = c0 + 4;
  for (const b of batch.values()) {
    const o = b.o;
    ev(b.layer, c0, c1, `{\\an7\\pos(0,0)\\p4\\bord${o.bord ?? 0}\\shad0\\blur${o.blur ?? 0}\\1c${col(o.fill ?? '000000')}\\3c${col(o.bc ?? '000000')}\\1a${alp(b.fa)}\\3a${alp(b.a)}}${b.paths.join(' ')}{\\p0}`);
  }
  for (const f of frameText) ev(f.layer, c0, c1, f.t);
  batch = new Map(); frameText = [];
}

// ---- path helpers (T = {x,y,s} local->screen) ----
const X = (T, x) => R(T.x + x * T.s), Y = (T, y) => R(T.y + y * T.s);
const K = 0.5523;
function ell(T, cx, cy, rx, ry) {
  const p = (x, y) => `${X(T, x)} ${Y(T, y)}`;
  return `m ${p(cx + rx, cy)} b ${p(cx + rx, cy + K * ry)} ${p(cx + K * rx, cy + ry)} ${p(cx, cy + ry)} b ${p(cx - K * rx, cy + ry)} ${p(cx - rx, cy + K * ry)} ${p(cx - rx, cy)} b ${p(cx - rx, cy - K * ry)} ${p(cx - K * rx, cy - ry)} ${p(cx, cy - ry)} b ${p(cx + K * rx, cy - ry)} ${p(cx + rx, cy - K * ry)} ${p(cx + rx, cy)}`;
}
function halfTop(T, cx, cy, rx, ry, drop = 0) {
  const p = (x, y) => `${X(T, x)} ${Y(T, y)}`;
  return `m ${p(cx - rx, cy + drop)} b ${p(cx - rx, cy - K * ry)} ${p(cx - K * rx, cy - ry)} ${p(cx, cy - ry)} b ${p(cx + K * rx, cy - ry)} ${p(cx + rx, cy - K * ry)} ${p(cx + rx, cy + drop)} b ${p(cx + rx * 0.4, cy + drop + ry * 0.12)} ${p(cx - rx * 0.4, cy + drop + ry * 0.12)} ${p(cx - rx, cy + drop)}`;
}
function poly(T, pts) { return 'm ' + pts.map(([x, y], i) => (i === 1 ? 'l ' : '') + `${X(T, x)} ${Y(T, y)}`).join(' '); }
const I = { x: 0, y: 0, s: 1 };
function star(x, y, s) { return poly(I, [[x, y - s], [x + s * .22, y - s * .22], [x + s, y], [x + s * .22, y + s * .22], [x, y + s], [x - s * .22, y + s * .22], [x - s, y], [x - s * .22, y - s * .22]]); }
function rect(x0, y0, x1, y1) { return poly(I, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); }
function ring(layer, x, y, r, color, a, w = 4) { shape(layer, ell(I, x, y, r, r), { fill: color, fillAlpha: 0, alpha: a, bord: w, bc: color }); }

// ---- the pepe ----
function pepe(T, o = {}) {
  const gold = o.skin === 'gold', a = o.alpha ?? 1, L = o.layer ?? 10, s = T.s;
  const skin = gold ? 'E0AE1C' : '5E9E34', hi = gold ? 'FFF0A0' : '86C44E', ol = gold ? '4A2E02' : '15240C';
  const bw = +(Math.max(1, 3.2 * s)).toFixed(1);
  if (o.glow) shape(L - 1, ell(T, 0, 0, 170, 150), { fill: 'FFC83A', alpha: a * o.glow, blur: 40 * s });
  shape(L, ell(T, 0, 20, 105, 78), { fill: skin, alpha: a, bord: bw, bc: ol });
  shape(L + 1, ell(T, -38, 0, 42, 20), { fill: hi, alpha: a * (gold ? 0.55 : 0.35), blur: 6 * s });
  shape(L + 2, ell(T, -46, -40, 40, 34), { fill: 'FFFFFF', alpha: a, bord: bw, bc: ol });
  shape(L + 2, ell(T, 46, -40, 40, 34), { fill: 'FFFFFF', alpha: a, bord: bw, bc: ol });
  shape(L + 3, ell(T, -36, -29, 13, 13), { fill: '111111', alpha: a });
  shape(L + 3, ell(T, 56, -29, 13, 13), { fill: '111111', alpha: a });
  shape(L + 4, halfTop(T, -46, -40, 41.5, 35.5, 2), { fill: skin, alpha: a, bord: bw, bc: ol });
  shape(L + 4, halfTop(T, 46, -40, 41.5, 35.5, 2), { fill: skin, alpha: a, bord: bw, bc: ol });
  if (gold) shape(L + 5, ell(T, -52, -60, 16, 7), { fill: hi, alpha: a * 0.7, blur: 3 * s });
  shape(L + 5, ell(T, 0, 54, 60, 19), { fill: 'B84A3A', alpha: a, bord: bw, bc: ol });
  shape(L + 6, ell(T, 2, 56, 46, 9), { fill: '3B0D0D', alpha: a });
  if (o.mole) { const ms = o.moleScale ?? 1; shape(L + 7, ell(T, 66, 22, 6.5 * ms, 6.5 * ms), { fill: '3E2410', alpha: a }); }
  if (o.crown) {
    const d = o.crownDy ?? 0, ca = a * (o.crownAlpha ?? 1);
    const C = { x: T.x, y: T.y + d * s, s };
    shape(L + 8, poly(C, [[-58, -64], [58, -64], [64, -130], [33, -100], [0, -152], [-33, -100], [-64, -130]]), { fill: 'FFD83B', alpha: ca, bord: bw, bc: '7A4200' });
    shape(L + 9, poly(C, [[-54, -70], [54, -70], [55, -80], [-55, -80]]), { fill: 'FFF3A6', alpha: ca * 0.8 });
    shape(L + 9, ell(C, 0, -86, 9, 9), { fill: 'E0245E', alpha: ca, bord: bw * 0.6, bc: '5A0020' });
    shape(L + 9, ell(C, -34, -86, 7, 7), { fill: '2E7BFF', alpha: ca, bord: bw * 0.6, bc: '001A5A' });
    shape(L + 9, ell(C, 34, -86, 7, 7), { fill: '2E7BFF', alpha: ca, bord: bw * 0.6, bc: '001A5A' });
    for (const [x, y] of [[-64, -130], [0, -152], [64, -130]]) shape(L + 9, ell(C, x, y, 7, 7), { fill: 'FFF3A6', alpha: ca, bord: bw * 0.6, bc: '7A4200' });
  }
}

// ---- scene data ----
const swarm = [];
for (let r = 0; r < 8; r++) for (let c = 0; c < 13; c++) {
  swarm.push({ x: 48 + c * 99 + (rnd() - .5) * 26 + (r % 2) * 20, y: 50 + r * 92 + (rnd() - .5) * 20, ph: rnd(), gold: r === 5 && c === 9 });
}
const kingStart = swarm.find(p => p.gold);
const traits = [
  ['SKIN', 'Gold', 0.01, 3.2, [0, 20, 118]],
  ['EYES', 'Plain', 0.38, 4.2, [0, -45, 100]],
  ['MOUTH', 'Open', 0.15, 5.2, [0, 54, 66]],
  ['HAT', 'Crown', 0.03, 6.2, [0, -108, 62]],
  ['ACCESSORY', 'Mole', 0.08, 7.2, [66, 22, 20]],
];
const cum = []; { let p = 1; for (const t of traits) { p *= t[2]; cum.push(p); } }
const S2P = { x: 330, y: 420, s: 1.55 };

for (curF = 0; curF < N; curF++) {
  const t = curF / FPS;

  // ===== Scene 1: the swarm (0 - 3.0) =====
  if (t < 3.05) {
    const fadeOthers = 1 - ramp(t, 2.2, 2.7);
    for (const p of swarm) {
      const bob = 4 * Math.sin(2 * Math.PI * (0.9 * t + p.ph));
      if (p.gold) continue;
      pepe({ x: p.x + 8 * t, y: p.y + bob, s: 0.3 }, { layer: 10, alpha: fadeOthers });
    }
    // gold one: sits in the crowd, then flies to scene-2 position
    const k = eOut(ramp(t, 2.2, 3.0));
    const gx = lerp(kingStart.x + 8 * Math.min(t, 2.2), S2P.x, k), gy = lerp(kingStart.y, S2P.y, k), gs = lerp(0.3, S2P.s, k);
    const pulse = ramp(t, 1.3, 1.5) * (1 - ramp(t, 2.2, 2.4));
    pepe({ x: gx, y: gy, s: gs }, { skin: 'gold', crown: true, mole: true, layer: 30, glow: 0.35 * pulse + 0.35 * k });
    for (let i = 0; i < 2; i++) {
      const ph = ((t - 1.3) * 1.2 + i * 0.5) % 1;
      if (t > 1.3) ring(28, gx, gy, 40 + ph * 50, 'FFD83B', pulse * (1 - ph), 3);
    }
    // title band
    const ta = ramp(t, 0.05, 0.4) * fadeOthers;
    shape(50, rect(0, 70, W, 205), { fill: '07040F', alpha: 0.72 * ta, blur: 8 });
    text(60, W / 2, 125, 5, 84, 'FFD83B', 'SWARM PEPE #1043', { alpha: ta, bord: 5, bc: '3A2200', sc: lerp(135, 100, eOut(ramp(t, 0.05, 0.5))) });
    text(60, W / 2, 180, 5, 32, 'FFFFFF', '5,000 pepes in the swarm. Only one looks like this.', { alpha: ramp(t, 0.9, 1.3) * fadeOthers, bord: 2 });
  }

  // ===== Scene 2: trait odds (3.0 - 9.0) =====
  if (t >= 3.0 && t < 9.25) {
    const A = ramp(t, 2.9, 3.2) * (1 - ramp(t, 8.9, 9.2));
    const P2 = { x: S2P.x, y: S2P.y + 5 * Math.sin(2 * Math.PI * 0.5 * (t - 3)), s: S2P.s };
    pepe(P2, { skin: 'gold', crown: true, mole: true, layer: 30, glow: 0.35, alpha: A });
    text(60, 700, 92, 4, 40, 'FFFFFF', 'TRAIT ODDS', { alpha: A * ramp(t, 3.0, 3.3), bord: 2 });
    let stage = -1;
    traits.forEach(([lab, val, w, t0, hl], i) => {
      if (t < t0) return; stage = i;
      const k = eOut(ramp(t, t0, t0 + 0.4)), a = A * k, y = 150 + i * 76, dx = (1 - k) * 60;
      const rare = w <= 0.03;
      text(60, 700 + dx, y, 7, 22, '9FA8C8', lab, { alpha: a, bord: 0, shad: 0 });
      text(60, 700 + dx, y + 22, 7, 38, rare ? 'FFD83B' : 'FFFFFF', val, { alpha: a, bord: 2 });
      shape(40, rect(870 + dx, y + 26, 1150 + dx, y + 50), { fill: '2A2340', alpha: a });
      const bw = (w / 0.38) * 280 * eOut(ramp(t, t0 + 0.1, t0 + 0.7));
      shape(41, rect(870 + dx, y + 26, 870 + dx + Math.max(3, bw), y + 50), { fill: rare ? 'FFB81F' : '5E9E34', alpha: a });
      text(60, 1235 + dx, y + 38, 6, 34, rare ? 'FFD83B' : 'FFFFFF', `${+(w * 100).toFixed(0)}%`, { alpha: a, bord: 2 });
      // highlight on the pepe
      const ph = ramp(t, t0, t0 + 0.9);
      if (ph > 0 && ph < 1) ring(45, P2.x + hl[0] * P2.s, P2.y + hl[1] * P2.s, hl[2] * P2.s * (0.9 + 0.35 * ph), rare ? 'FFD83B' : 'FFFFFF', A * (1 - ph), 5);
    });
    if (stage >= 0) {
      const t0 = traits[stage][3];
      const from = stage ? 1 / cum[stage - 1] : 1, to = 1 / cum[stage];
      const v = Math.exp(lerp(Math.log(from), Math.log(to), eOut(ramp(t, t0, t0 + 0.6))));
      const ya = 548;
      text(60, 700, ya, 7, 24, '9FA8C8', 'COMBINED ODDS', { alpha: A, bord: 0, shad: 0 });
      text(60, 700, ya + 26, 7, 62, 'FFD83B', `1 in ${fmt(v)}`, { alpha: A, bord: 4, bc: '3A2200', sc: 100 + 8 * (1 - ramp(t, t0 + 0.5, t0 + 0.8)) * ramp(t, t0, t0 + 0.1) });
      text(60, 700, ya + 102, 7, 24, 'FFFFFF', `${(cum[stage] * 100).toPrecision(4).replace(/0+$/, '')}% = ` + traits.slice(0, stage + 1).map(x => `${+(x[2] * 100).toFixed(0)}%`).join(' × '), { alpha: A * 0.9, bord: 2 });
    }
    text(60, 330, 690, 5, 26, 'FFD83B', 'Gold + Crown alone: 0.03%  ≈ 1.5 in the whole set', { alpha: A * ramp(t, 8.0, 8.3), bord: 2 });
  }

  // ===== Scene 3: 1 in 731,000 vs a 5,000 mint (9.0 - 11.8) =====
  if (t >= 9.0 && t < 12.0) {
    const A = ramp(t, 9.0, 9.3) * (1 - ramp(t, 11.6, 11.9));
    text(60, W / 2, 88, 5, 104, 'FFD83B', '1 in 731,000', { alpha: A, bord: 5, bc: '3A2200', sc: lerp(70, 100, eBack(ramp(t, 9.0, 9.5))) });
    text(60, W / 2, 164, 5, 30, 'FFFFFF', 'A full 5,000 mint is expected to produce ~0.007 of this combo.', { alpha: A * ramp(t, 9.3, 9.6), bord: 2 });
    text(60, W / 2, 202, 5, 26, 'C8CCE0', 'Each dot below is one Swarm Pepe. Only one is #1043.', { alpha: A * ramp(t, 9.6, 9.9), bord: 2 });
    // gold dot index 1043 → row 10, col 43
    const gx = 195 + 43 * 9 + 2.5, gy = 238 + 10 * 9 + 2.5, k = ramp(t, 10.3, 10.6);
    if (t >= 10.3) {
      shape(56, ell(I, gx, gy, 3 + 5 * eBack(k), 3 + 5 * eBack(k)), { fill: 'FFD83B', alpha: A, bord: 2, bc: 'FFFFFF' });
      const ph = ((t - 10.3) * 1.3) % 1;
      ring(55, gx, gy, 10 + 40 * ph, 'FFD83B', A * (1 - ph), 3);
      shape(57, poly(I, [[gx + 12, gy - 4], [gx + 120, gy - 50], [gx + 120, gy - 46], [gx + 12, gy]]), { fill: 'FFD83B', alpha: A * k });
      text(60, gx + 128, gy - 48, 4, 34, 'FFD83B', '#1043', { alpha: A * k, bord: 3, bc: '3A2200' });
    }
  }

  // ===== Scene 4: king of the swarm (11.8 - 15) =====
  if (t >= 11.7) {
    const A = ramp(t, 11.7, 12.0);
    const cx = 640, cy = 330;
    const rot = t * 0.25;
    const rays = [];
    for (let i = 0; i < 18; i++) {
      const a0 = rot + i * Math.PI * 2 / 18, hw = 0.07;
      rays.push(poly(I, [[cx, cy], [cx + 1100 * Math.cos(a0 - hw), cy + 1100 * Math.sin(a0 - hw)], [cx + 1100 * Math.cos(a0 + hw), cy + 1100 * Math.sin(a0 + hw)]]));
    }
    for (const r of rays) shape(5, r, { fill: 'FFD24A', alpha: 0.13 * A, blur: 6 });
    const ks = 1.45 * eBack(ramp(t, 11.8, 12.5));
    const K2 = { x: cx, y: 360 + 6 * Math.sin(2 * Math.PI * 0.6 * (t - 11.8)), s: Math.max(0.01, ks) };
    pepe(K2, { skin: 'gold', crown: true, mole: true, layer: 30, glow: 0.55, alpha: A, crownDy: -60 * (1 - eOut(ramp(t, 12.2, 12.6))), crownAlpha: ramp(t, 12.2, 12.35) });
    // sparkles
    for (let i = 0; i < 14; i++) {
      const ang = i * 2.39996, rad = 190 + 70 * ((i * 37) % 5) / 5;
      const tw = Math.max(0, Math.sin(2 * Math.PI * (1.1 * t + i * 0.37)));
      shape(48, star(cx + rad * Math.cos(ang) * 1.25, 330 + rad * Math.sin(ang) * 0.85, 6 + 12 * tw), { fill: 'FFF6C8', alpha: A * tw * ramp(t, 12.3, 12.6), blur: 1 });
    }
    // the swarm bowing
    for (let i = 0; i < 10; i++) {
      const x = 70 + i * 127.8; if (Math.abs(x - cx) < 70) continue;
      const bow = Math.max(0, Math.sin(2 * Math.PI * 0.9 * (t - 12.4) - Math.abs(x - cx) / 300)) * ramp(t, 12.4, 12.6);
      pepe({ x, y: 628 + 12 * bow, s: 0.42 }, { layer: 10, alpha: A * ramp(t, 12.0, 12.4) });
    }
    text(60, W / 2, 70, 5, 78, 'FFD83B', 'KING OF THE SWARM', { alpha: ramp(t, 12.5, 12.8), bord: 5, bc: '3A2200', sc: lerp(150, 100, eOut(ramp(t, 12.5, 12.9))) });
    text(60, W / 2, 700, 5, 26, 'FFFFFF', 'Swarm Pepe #1043  ·  Gold · Plain · Open · Crown · Mole  ·  1 in 731k', { alpha: ramp(t, 13.1, 13.5), bord: 2 });
    const fo = ramp(t, 14.4, 15.0);
    if (fo > 0) shape(100, rect(-10, -10, W + 10, H + 10), { fill: '000000', alpha: fo });
  }

  // dot grid for scene 3 is static; everything else flushed per frame
  flush();
}

// Scene 3 grid as static events (10 row-chunks staggered in, dim when #1043 lights up)
for (let chunk = 0; chunk < 10; chunk++) {
  const paths = [];
  for (let r = chunk * 5; r < chunk * 5 + 5; r++) for (let c = 0; c < 100; c++) {
    if (r === 10 && c === 43) continue;
    const x = 195 + c * 9, y = 238 + r * 9; paths.push(rect(x, y, x + 5, y + 5));
  }
  const t0 = 9.15 + chunk * 0.06, t1 = 11.9;
  const dimAt = Math.round((10.3 - t0) * 1000);
  ev(20, Math.round(t0 * 100), Math.round(t1 * 100), `{\\an7\\pos(0,0)\\p4\\bord0\\shad0\\1c${col('5E9E34')}\\1a&H20&\\fad(250,300)\\t(${dimAt},${dimAt + 300},\\1a&HA8&)}${paths.join(' ')}{\\p0}`);
}

const hdr = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: D,FreeSans,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
fs.writeFileSync('build/pepe.ass', hdr + events.map(e => `Dialogue: ${e.layer},${ts(e.c0)},${ts(e.c1)},D,,0,0,0,,${e.text}`).join('\n') + '\n');

// ---- audio ----
const note = (T, f, amp, dec) => `gte(t,${T})*${amp}*exp(-${dec}*(t-${T}))*(sin(2*PI*${f}*(t-${T}))+0.3*sin(4*PI*${f}*(t-${T})))`;
const parts = [
  // low pulsing pad under scenes 1-3
  `lt(t,11.8)*0.07*(0.6+0.4*sin(2*PI*1.5*t))*(sin(2*PI*55*t)+0.6*sin(2*PI*82.4*t)+0.3*sin(2*PI*110*t))`,
  note(0.1, 65.4, 0.35, 2.5),
  note(1.3, 1318.5, 0.08, 6), note(1.55, 1760, 0.06, 6),
  note(3.2, 523.25, 0.18, 4), note(3.3, 1046.5, 0.1, 5),
  note(4.2, 587.33, 0.14, 5),
  note(5.2, 659.25, 0.14, 5),
  note(6.2, 783.99, 0.18, 4), note(6.3, 1567.98, 0.1, 5),
  note(7.2, 880, 0.14, 5),
  note(8.0, 1046.5, 0.08, 4),
  // riser 9.0-11.8
  `between(t,9,11.8)*0.1*((t-9)/2.8)*sin(2*PI*(180*(t-9)+70*(t-9)*(t-9)))`,
  note(10.3, 2093, 0.1, 5),
  // fanfare
  note(11.8, 65.4, 0.35, 1.5),
  note(11.8, 261.63, 0.12, 0.7), note(11.8, 329.63, 0.1, 0.7), note(11.8, 392, 0.1, 0.7),
  note(12.2, 523.25, 0.12, 1.2), note(12.4, 659.25, 0.12, 1.2), note(12.6, 783.99, 0.12, 1.1), note(12.9, 1046.5, 0.14, 0.9),
  note(12.9, 523.25, 0.08, 0.6), note(12.9, 392, 0.08, 0.6), note(12.9, 659.25, 0.08, 0.6),
];
const aexpr = `(${parts.join('+')})*min(1,(15-t)/0.6)`;
const fc = `color=c=black:s=${W}x${H}:r=${FPS}:d=${DUR},format=rgb24,geq=r='clip(40-30*hypot(X-640,Y-330)/760,0,255)':g='clip(18-12*hypot(X-640,Y-330)/760,0,255)':b='clip(70-55*hypot(X-640,Y-330)/760,0,255)',ass=build/pepe.ass[v];
aevalsrc=exprs='${aexpr}|${aexpr}':s=48000:d=${DUR},volume=1.4,alimiter=limit=0.9[a]`;
fs.writeFileSync('build/fc.txt', fc);
console.log('events', events.length, 'ass bytes', fs.statSync('build/pepe.ass').size);
