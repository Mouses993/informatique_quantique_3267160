// Intro JT Spécial « États généraux de l'Élevage et de la Pêche » : fonction pure du temps.
// window.seek(t) peint l'image t. Timing en temps musicaux (u) sur la grille mesurée (beats.json).
// Plan : docs/shotlist.md. Emblème partagé avec le logo : lib/emblem.js.
//
// EMPLACEMENTS PHOTO : chaque plan illustré est remplacé par une vraie image si elle est listée dans
// assets/photos/manifest.json (généré par `node tools/photos.mjs`). Noms attendus :
//   aube.jpg  epervier.jpg  zebus.jpg  president.jpg  ministre.jpg  m1.jpg  m2.jpg  m3.jpg
import * as M from './lib/motion.js';
import { drawEmblem, COL } from './lib/emblem.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, font, layout, fill, cover, noise1, hash01, mix, TAU, kf, bump } = M;

// ------------------------------------------------------------------ textes (modifiables ici)
const SHOW_NAMES = false;   // noms / titres des autorités à l'écran (désactivé à la demande)
const SHOW_DATE = false;    // bandeau de date pendant le montage
const TXT = {
  tag: 'JT SPÉCIAL',
  peche: 'PÊCHE',
  elevage: 'ÉLEVAGE',
  pres: { grade: 'Général d’Armée', nom: 'ASSIMI GOÏTA', titre: 'Président de la Transition, Chef de l’État' },
  min: { grade: '', nom: 'YOUBA BA', titre: 'Ministre de l’Élevage et de la Pêche' },
  date: { kicker: 'OUVERTURE', jour: 'LUNDI 23 NOVEMBRE 2026' },
  l1: 'ÉTATS GÉNÉRAUX',
  l2: 'DE L’ÉLEVAGE ET DE LA PÊCHE',
  l3: 'MALI · 2026',
};

// ------------------------------------------------------------------ palette
const C = {
  ...COL,
  sil: '#0A0F16',        // silhouettes
  skyTop: '#101C38',
  skyMid: '#6A2E45',
  skyLow: '#E2772C',
  skyHz: '#F8B54A',
  sunCore: '#FFE6A3',
  waterHz: '#5A2B36',
  waterLow: '#0A121C',
};
const D = 'Display', UI = 'UI';

// ------------------------------------------------------------------ sons (sfx.mjs)
const HITS = [
  [1.5, 'JT SPÉCIAL', 'click'],
  [5.9, 'whip vers épervier', 'whoosh', { len: 0.45 }],
  [7.9, 'lancer de l’épervier', 'whoosh', { len: 0.35, from: 500, to: 3200, pan: -0.3 }],
  [8, 'PÊCHE', 'thud', { pitch: 140 }],
  [10.9, 'tilt vers les zébus', 'whoosh', { len: 0.45, from: 2600, to: 500 }],
  [12, 'ÉLEVAGE', 'thud', { pitch: 120 }],
  [21.9, 'push vers le Ministre', 'whoosh', { len: 0.45, pan: 0.3 }],
  [28, 'coupe filet', 'click'],
  [29, 'coupe poisson', 'click'],
  [30, 'coupe pirogues', 'click'],
  [31, 'coupe cornes', 'click'],
  [32, 'logo', 'swell', { len: 1.2 }],
  [33.1, 'titre', 'whoosh', { len: 0.4, from: 3000, to: 800 }],
  [34.6, 'tricolore', 'bell', { pitch: 'D6' }],
];

// ------------------------------------------------------------------ outils
const P2 = new Map();
const pth = (d) => { let p = P2.get(d); if (!p) { p = new Path2D(d); P2.set(d, p); } return p; };
const rnd = (i, s) => hash01(i, s);

// texte lettre par lettre qui monte depuis un masque (la ligne de base)
function rise(ctx, str, x, base, size, weight, family, color, u, u0, { track = 0, stagger = 0.035, align = 'left', cfg = SPRING.snappy, maskPad = 0.3 } = {}) {
  const f = font(size, weight, family);
  const L = layout(ctx, str, f, track * size);
  const x0 = align === 'center' ? x - L.width / 2 : align === 'right' ? x - L.width : x;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, base - size * 1.3, W, size * (1.3 + maskPad)); ctx.clip();
  ctx.font = f; ctx.fillStyle = color; ctx.textAlign = 'center';
  L.glyphs.forEach((g, j) => {
    const k = springU(u, u0 + j * stagger, cfg);
    if (k <= 0) return;
    ctx.fillText(g.ch, x0 + g.cx, base + (1 - k) * size * 1.15);
  });
  ctx.restore();
  return L.width;
}
function textW(ctx, str, size, weight, family, track = 0) { return layout(ctx, str, font(size, weight, family), track * size).width; }
function txt(ctx, str, x, y, size, weight, family, color, { track = 0, align = 'left', alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = font(size, weight, family); ctx.fillStyle = color; ctx.textAlign = align;
  ctx.letterSpacing = `${track * size}px`;
  ctx.fillText(str, x, y);
  ctx.restore();
}
function tricolor(ctx, x, y, w, h, p = 1) {
  if (p <= 0) return;
  const t = w / 3;
  [C.green, C.yellow, C.red].forEach((c, i) => {
    const seg = clamp(p * 3 - i);
    if (seg <= 0) return;
    ctx.fillStyle = c; ctx.fillRect(x + i * t, y, t * seg + (seg >= 1 && i < 2 ? 0.5 : 0), h);
  });
}

// ------------------------------------------------------------------ monde illustré : ciel, soleil, fleuve
function sky(ctx, hy, sun, tone = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, mix(C.skyTop, '#0B1530', tone));
  g.addColorStop(0.45, mix(C.skyMid, '#4A2340', tone));
  g.addColorStop(0.82, mix(C.skyLow, '#C9622A', tone));
  g.addColorStop(1, C.skyHz);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 1);
  // halo
  const hg = ctx.createRadialGradient(sun.x, sun.y, sun.r * 0.6, sun.x, sun.y, sun.r * 3.2);
  hg.addColorStop(0, 'rgba(255,196,110,0.55)'); hg.addColorStop(0.4, 'rgba(240,140,60,0.18)'); hg.addColorStop(1, 'rgba(240,120,50,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, hy + 1);
  // disque
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hy); ctx.clip();
  const sg = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.r);
  sg.addColorStop(0, C.sunCore); sg.addColorStop(0.75, '#FFC94E'); sg.addColorStop(1, C.gold);
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r, 0, TAU); ctx.fill();
  ctx.restore();
}
function river(ctx, hy, sun, u, seed = 1, rows = 34) {
  const g = ctx.createLinearGradient(0, hy, 0, H);
  g.addColorStop(0, C.waterHz); g.addColorStop(0.35, '#2A1B2C'); g.addColorStop(1, C.waterLow);
  ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
  // reflet du soleil : tirets dorés qui scintillent, plus larges vers le bas (perspective)
  for (let j = 0; j < rows; j++) {
    const q = j / rows;
    const y = hy + 4 + (H - hy) * q ** 1.45;
    const half = sun.r * (0.25 + 0.9 * q) * (0.75 + 0.25 * noise1(j * 0.9 + u * 0.6, seed));
    const a = (1 - q) ** 1.2 * 0.85;
    const th = 2 + 7 * q;
    for (let k = 0; k < 3; k++) {
      const c = sun.x + half * (noise1(j * 1.7 + k * 9.1 + u * 0.9, seed + k) * 0.9);
      const w = half * (0.25 + 0.5 * rnd(j * 3 + k, seed)) * (0.6 + 0.4 * Math.sin(u * 2.1 + j + k * 2));
      if (w <= 2) continue;
      ctx.fillStyle = `rgba(255,${190 + 40 * (1 - q) | 0},${90 + 60 * (1 - q) | 0},${a * (k === 0 ? 1 : 0.6)})`;
      ctx.fillRect(c - w / 2, y, w, th);
    }
  }
  // rides
  ctx.fillStyle = 'rgba(255,170,120,0.10)';
  for (let j = 0; j < 26; j++) {
    const q = rnd(j, seed + 40);
    const y = hy + 6 + (H - hy) * q ** 1.3;
    const x = ((rnd(j, seed + 41) * W * 1.4 + u * 18 * (1 + q)) % (W * 1.4)) - W * 0.2;
    ctx.fillRect(x, y, 60 + 260 * q * rnd(j, seed + 42), 1.5 + 3 * q);
  }
}
// rive lointaine : arbres, rôniers, mosquée en banco
function farBank(ctx, hy, seed, { mosqueX = null, s = 1, ox = 0 } = {}) {
  ctx.fillStyle = C.sil;
  ctx.beginPath(); ctx.moveTo(0, hy + 2);
  for (let x = 0; x <= W; x += 24) {
    const k = Math.floor((x - ox) / 24);
    const hgt = (6 + 10 * rnd(k, seed) + 18 * Math.max(0, noise1((x - ox) * 0.004, seed))) * s;
    ctx.lineTo(x, hy - hgt);
  }
  ctx.lineTo(W, hy + 2); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 9; i++) {   // rôniers
    const x = ((rnd(i, seed + 5) * W * 1.2 + ox) % (W * 1.2)) - 50;
    const h = (40 + 40 * rnd(i, seed + 6)) * s;
    palm(ctx, x, hy - 6 * s, h, seed + i);
  }
  if (mosqueX !== null) mosque(ctx, mosqueX + ox * 0.6, hy - 4 * s, 72 * s);
}
function palm(ctx, x, y, h, seed) {
  ctx.strokeStyle = C.sil; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, h * 0.05);
  const lean = (rnd(seed, 77) - 0.5) * 0.15;
  const tx = x + Math.sin(lean) * h, ty = y - h;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.lineWidth = Math.max(1.5, h * 0.035);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.36;
    const L = h * (0.32 + 0.08 * Math.cos(i));
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - h * 0.04, tx + Math.cos(a) * L, ty + Math.sin(a) * L + L * 0.25);
    ctx.stroke();
  }
}
function mosque(ctx, x, y, h) {
  // silhouette soudano-sahélienne : corps massif, trois tours à pinacles, torons (bois qui dépassent)
  ctx.fillStyle = C.sil; ctx.strokeStyle = C.sil;
  const w = h * 3.2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2 + h * 0.08, y - h * 0.55); ctx.lineTo(x + w / 2 - h * 0.08, y - h * 0.55); ctx.lineTo(x + w / 2, y); ctx.fill();
  [-0.36, 0, 0.36].forEach((p, i) => {
    const tx = x + p * w, th = h * (i === 1 ? 1.05 : 0.85), tw = h * 0.34;
    ctx.beginPath();
    ctx.moveTo(tx - tw / 2, y - h * 0.5); ctx.lineTo(tx - tw * 0.36, y - th); ctx.lineTo(tx - tw * 0.12, y - th - h * 0.16);
    ctx.lineTo(tx, y - th - h * 0.2); ctx.lineTo(tx + tw * 0.12, y - th - h * 0.16); ctx.lineTo(tx + tw * 0.36, y - th); ctx.lineTo(tx + tw / 2, y - h * 0.5); ctx.fill();
    ctx.lineWidth = Math.max(1, h * 0.025);
    for (let r = 0; r < 3; r++) {
      const yy = y - h * 0.62 - r * th * 0.16;
      ctx.beginPath(); ctx.moveTo(tx - tw * 0.55, yy); ctx.lineTo(tx + tw * 0.55, yy); ctx.stroke();
    }
  });
  for (let i = 0; i < 9; i++) {   // créneaux
    const cx = x - w * 0.45 + i * w * 0.1125;
    ctx.beginPath(); ctx.moveTo(cx - h * 0.04, y - h * 0.54); ctx.lineTo(cx, y - h * 0.68); ctx.lineTo(cx + h * 0.04, y - h * 0.54); ctx.fill();
  }
}
function bird(ctx, x, y, s, ph) {
  const f = Math.sin(ph) * 0.8;
  ctx.strokeStyle = C.sil; ctx.lineWidth = Math.max(1.5, s * 0.09); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.5 * f); ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.35 - s * 0.4 * f, x, y);
  ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.35 - s * 0.4 * f, x + s, y - s * 0.5 * f);
  ctx.stroke();
}

// ------------------------------------------------------------------ silhouettes : pirogue, personnage, épervier, zébu
function pirogue(ctx, x, y, L, rot = 0, { hide = 0 } = {}) {
  // y = ligne de flottaison ; proue et poupe relevées (pirogue bozo)
  const h = L * 0.05;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = C.sil;
  ctx.beginPath();
  ctx.moveTo(-L / 2, -h * 2.1);
  ctx.quadraticCurveTo(-L * 0.44, h * 0.9, -L * 0.3, h * 0.9);
  ctx.lineTo(L * 0.3, h * 0.9);
  ctx.quadraticCurveTo(L * 0.44, h * 0.9, L / 2, -h * 2.1);
  ctx.quadraticCurveTo(L * 0.4, -h * 0.9, L * 0.25, -h * 0.85);
  ctx.lineTo(-L * 0.25, -h * 0.85);
  ctx.quadraticCurveTo(-L * 0.4, -h * 0.9, -L / 2, -h * 2.1);
  ctx.fill();
  ctx.restore();
  void hide;
}
// membre effilé : capsule de a (largeur wa) à b (largeur wb)
function limb(ctx, a, b, wa, wb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  ctx.beginPath();
  ctx.moveTo(a[0] + nx * wa / 2, a[1] + ny * wa / 2); ctx.lineTo(b[0] + nx * wb / 2, b[1] + ny * wb / 2);
  ctx.lineTo(b[0] - nx * wb / 2, b[1] - ny * wb / 2); ctx.lineTo(a[0] - nx * wa / 2, a[1] - ny * wa / 2); ctx.fill();
  ctx.beginPath(); ctx.arc(a[0], a[1], wa / 2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(b[0], b[1], wb / 2, 0, TAU); ctx.fill();
}
// personnage debout : pose = { lean, head, armB:[a1,a2], armF:[a1,a2], stance, knee, hat:'peul'|'bonnet'|null, robe }
// angles : 0 = vers le bas, positif = vers l'avant (+x). Retourne les mains [arrière, avant].
function person(ctx, x, y, s, pose, flip = 1) {
  const P = { lean: 0, head: 0, armB: [0.2, 0.3], armF: [-0.2, -0.1], stance: 0.12, knee: 0.04, hat: null, robe: false, ...pose };
  ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
  ctx.fillStyle = C.sil;
  const hip = [0, -s * 0.5];
  // jambes (genou légèrement fléchi vers l'avant)
  for (const sg of [-1, 1]) {
    const foot = [sg * P.stance * s, -s * 0.02];
    const knee = [(hip[0] + foot[0]) / 2 + P.knee * s, (hip[1] + foot[1]) / 2];
    limb(ctx, [hip[0] + sg * s * 0.015, hip[1]], knee, s * 0.085, s * 0.062);
    limb(ctx, knee, foot, s * 0.06, s * 0.038);
    ctx.beginPath(); ctx.ellipse(foot[0] + s * 0.03, -s * 0.012, s * 0.045, s * 0.016, 0, 0, TAU); ctx.fill();
  }
  // tronc : du bassin à la poitrine, tunique évasée
  const ux = Math.sin(P.lean), uy = -Math.cos(P.lean);
  const chest = [hip[0] + ux * s * 0.29, hip[1] + uy * s * 0.29];
  limb(ctx, [hip[0] - ux * s * 0.02, hip[1] - uy * s * 0.02], chest, s * 0.14, s * 0.17);
  const hem = P.robe ? 0.36 : 0.08;
  ctx.beginPath();
  ctx.moveTo(chest[0] - s * 0.07, chest[1] + s * 0.02); ctx.lineTo(chest[0] + s * 0.07, chest[1] + s * 0.02);
  ctx.lineTo(hip[0] + s * (0.1 + hem * 0.3), hip[1] + s * hem); ctx.lineTo(hip[0] - s * (0.1 + hem * 0.3), hip[1] + s * hem); ctx.fill();
  // cou + tête (petit nez vers l'avant)
  const ha = P.lean + P.head;
  const hx = Math.sin(ha), hy = -Math.cos(ha);
  const hc = [chest[0] + hx * s * 0.115, chest[1] + hy * s * 0.115];
  limb(ctx, chest, hc, s * 0.05, s * 0.045);
  ctx.beginPath(); ctx.ellipse(hc[0], hc[1], s * 0.056, s * 0.066, ha, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hc[0] + s * 0.045, hc[1] - s * 0.01); ctx.lineTo(hc[0] + s * 0.072, hc[1] + s * 0.012); ctx.lineTo(hc[0] + s * 0.04, hc[1] + s * 0.03); ctx.fill();
  if (P.hat === 'peul') {   // chapeau peul conique à large bord
    ctx.save(); ctx.translate(hc[0], hc[1] - s * 0.04); ctx.rotate(ha * 0.7);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.16, s * 0.022, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.07, -s * 0.005); ctx.quadraticCurveTo(-s * 0.02, -s * 0.09, 0, -s * 0.13); ctx.quadraticCurveTo(s * 0.02, -s * 0.09, s * 0.07, -s * 0.005); ctx.fill();
    ctx.restore();
  } else if (P.hat === 'bonnet') {
    ctx.beginPath(); ctx.ellipse(hc[0] - s * 0.008, hc[1] - s * 0.045, s * 0.058, s * 0.04, ha, Math.PI, TAU); ctx.fill();
  }
  // bras
  const hands = [];
  const sh = [chest[0] - ux * s * 0.01, chest[1] - uy * s * 0.01];
  for (const [a1, a2] of [P.armB, P.armF]) {
    const e = [sh[0] + Math.sin(a1) * s * 0.17, sh[1] + Math.cos(a1) * s * 0.17];
    const hnd = [e[0] + Math.sin(a2) * s * 0.155, e[1] + Math.cos(a2) * s * 0.155];
    limb(ctx, sh, e, s * 0.062, s * 0.048);
    limb(ctx, e, hnd, s * 0.046, s * 0.034);
    ctx.beginPath(); ctx.arc(hnd[0], hnd[1], s * 0.026, 0, TAU); ctx.fill();
    hands.push([x + hnd[0] * flip, y + hnd[1]]);
  }
  ctx.restore();
  return hands;
}
function pole(ctx, a, b, w) {
  ctx.strokeStyle = C.sil; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
}
// épervier ouvert : dôme de mailles, couronne de plombs. c = centre de la couronne, R rayon, sq aplatissement
function castNet(ctx, cx, cy, R, sq, open, { alpha = 1, color = C.sil, lw = 2.2 } = {}) {
  if (R < 2) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round';
  const ry = R * sq, apexY = cy - R * (0.55 - 0.25 * open);
  const N = 28;
  ctx.lineWidth = lw;
  for (let i = 0; i < N; i++) {     // rayons du sommet à la couronne
    const a = (i / N) * TAU;
    const rx = cx + Math.cos(a) * R, rpy = cy + Math.sin(a) * ry;
    ctx.beginPath(); ctx.moveTo(cx, apexY);
    ctx.quadraticCurveTo(cx + Math.cos(a) * R * 0.75, lerp(apexY, rpy, 0.35), rx, rpy); ctx.stroke();
  }
  for (let r = 1; r <= 4; r++) {    // anneaux de mailles
    const f = r / 4.6;
    const yy = lerp(apexY, cy, Math.sqrt(f) * 0.95);
    ctx.beginPath(); ctx.ellipse(cx, yy, R * f * 0.98, ry * f, 0, 0, TAU); ctx.stroke();
  }
  ctx.lineWidth = lw * 2.2;          // couronne plombée
  ctx.beginPath(); ctx.ellipse(cx, cy, R, ry, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * ry, lw * 1.8, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// zébu de profil (vers la droite), origine = ligne d'eau au milieu du corps, longueur ~ 2*s
// épervier en paquet, pendu à la main : cloche de mailles + plombs
function drapedNet(ctx, x, y, L, sway) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
  ctx.fillStyle = 'rgba(10,15,22,0.55)'; ctx.strokeStyle = C.sil; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-L * 0.12, L * 0.3, -L * 0.34, L * 0.7, -L * 0.3, L);
  ctx.quadraticCurveTo(0, L * 1.08, L * 0.3, L);
  ctx.bezierCurveTo(L * 0.34, L * 0.7, L * 0.12, L * 0.3, 0, 0); ctx.fill(); ctx.stroke();
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(i * L * 0.05, L * 0.5, i * L * 0.095, L * 1.03); ctx.stroke();
  }
  for (let r = 1; r <= 3; r++) {
    const yy = L * r / 3.4, w = L * 0.3 * Math.sqrt(r / 3.4);
    ctx.beginPath(); ctx.moveTo(-w, yy); ctx.quadraticCurveTo(0, yy + L * 0.05, w, yy); ctx.stroke();
  }
  ctx.fillStyle = C.sil;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-L * 0.3 + i * L * 0.075, L * (1 + 0.04 * Math.sin(i / 8 * Math.PI)), 5, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// zébu peul : bosse marquée, tête allongée vers l'avant-bas, oreilles tombantes, grandes cornes en lyre
const ZEBU = 'M-116,6 L-114,-40 C-112,-52 -104,-58 -92,-58 C-64,-58 -34,-60 -10,-64 C-4,-82 8,-98 24,-98 C40,-98 50,-88 58,-80 C66,-76 76,-78 84,-82 C92,-86 100,-84 106,-76 C114,-64 124,-52 134,-40 C138,-32 134,-26 126,-28 C116,-30 108,-30 100,-30 C96,-18 90,-6 86,6 Z';
const ZEBU_HORN = 'M84,-78 C72,-96 62,-120 68,-152 C70,-160 79,-160 79,-151 C78,-124 88,-104 98,-88 Z ' +
  'M96,-84 C110,-100 126,-118 127,-150 C127,-158 136,-158 136,-149 C138,-114 122,-92 106,-78 Z';
const ZEBU_EAR = 'M92,-72 C82,-70 70,-64 62,-54 C76,-56 86,-62 96,-66 Z';
function zebu(ctx, x, y, s, ph, flip = 1) {
  ctx.save(); ctx.translate(x, y + Math.sin(ph) * s * 0.03); ctx.scale(flip * s / 100, s / 100);
  ctx.rotate(Math.sin(ph) * 0.02);
  ctx.fillStyle = C.sil;
  ctx.fill(pth(ZEBU)); ctx.fill(pth(ZEBU_HORN)); ctx.fill(pth(ZEBU_EAR));
  ctx.restore();
  // remous autour de l'animal
  ctx.strokeStyle = 'rgba(255,190,120,0.35)'; ctx.lineWidth = Math.max(1.5, s * 0.025);
  for (let i = 0; i < 3; i++) {
    const k = (ph * 0.3 + i / 3) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.ellipse(x + flip * s * 0.1, y + s * 0.05, s * (1.1 + k * 0.6), s * (0.06 + k * 0.04), 0, 0, Math.PI); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function fishSil(ctx, x, y, s, rot, color = C.sil) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.fill(pth('M-156,14 C-118,-46 30,-84 128,-22 C140,-14 150,-6 156,0 C146,10 136,16 124,20 C40,64 -96,70 -156,14 Z'));
  ctx.fill(pth('M-126,-8 C-160,-26 -194,-46 -224,-66 C-208,-20 -210,30 -228,78 C-196,58 -160,40 -126,30 Z'));
  ctx.fill(pth('M-40,-48 C-18,-92 34,-104 72,-66 C30,-60 -4,-54 -40,-48 Z'));
  ctx.restore();
}

// ------------------------------------------------------------------ photo (remplace l'illustration)
// étalonnage chaud + poussée lente + dégradé bas pour la lisibilité des textes
function photo(ctx, img, u, u0, u1, { fx = 0.5, fy = 0.45, z0 = 1.0, z1 = 1.08 } = {}) {
  const p = prog(u, u0, u1);
  cover(ctx, img, 0, 0, W, H, { fx, fy, zoom: z0 * (z1 / z0) ** p });
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(232,134,42,0.35)'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(10,28,40,0.75)'); g.addColorStop(0.38, 'rgba(10,28,40,0.1)');
  g.addColorStop(0.6, 'rgba(10,28,40,0.1)'); g.addColorStop(1, 'rgba(10,28,40,0.85)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function vignette(ctx, k = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ S1 aube sur le Niger (u 0..6)
function sceneAube(ctx, u, IMG) {
  if (IMG.aube) photo(ctx, IMG.aube, u, -0.5, 6.5);
  else {
    ctx.save();
    M.zoomAbout(ctx, 1.0 * (1.09 / 1.0) ** E.inOutSine(prog(u, 0, 6)), 1150, 560);   // travelling avant lent
    const hy = 640;
    const sun = { x: 1240, y: hy + 40 - 26 * E.outCubic(prog(u, -1, 6)), r: 300 };
    sky(ctx, hy, sun);
    for (let i = 0; i < 4; i++) {   // oiseaux
      const bx = 1380 + i * 70 + u * 55 + (i % 2) * 30, by = 250 + i * 26 - u * 6 + (i % 2) * 18;
      bird(ctx, bx, by, 16 - i * 1.5, u * 9 + i * 1.3);
    }
    farBank(ctx, hy, 3, { mosqueX: 420, ox: -u * 4 });
    river(ctx, hy, sun, u, 2);
    // pirogue lointaine, pagayeur assis
    const fx = 560 + u * 10;
    pirogue(ctx, fx, 700, 240);
    person(ctx, fx + 10, 694, 46, { lean: 0.5, armB: [1.2, 1.6], armF: [1.0, 1.4], stance: 0.05 });
    // pirogue principale : le perchiste traverse devant le soleil
    const px = 930 + u * 34, py = 840 + Math.sin(u * 1.4) * 3;
    const cyc = (u * 0.5) % 1;                       // un coup de perche par 2 temps
    const push = Math.sin(cyc * TAU);
    pirogue(ctx, px, py, 880, Math.sin(u * 1.4 + 1) * 0.006);
    const hands = person(ctx, px + 120, py - 36, 400, {
      lean: 0.12 + 0.14 * push, head: -0.1, stance: 0.13, hat: 'bonnet',
      armB: [-0.9 - 0.3 * push, -1.6], armF: [-0.5 - 0.3 * push, -1.9],
    }, -1);
    const top = [hands[1][0] + 70 + 40 * push, hands[1][1] - 150];
    const bot = [hands[1][0] - 150 - 60 * push, py + 120];
    pole(ctx, top, bot, 9);
    // seconde silhouette assise à la poupe
    person(ctx, px - 300, py - 34, 150, { lean: 0.35, stance: 0.05, armB: [0.9, 1.4], armF: [0.6, 1.2] });
    ctx.restore();
  }
  vignette(ctx, 0.45);
  // JT SPÉCIAL
  const size = 150;
  const x = 96, base = 950;
  const k = springU(u, 1.0, SPRING.gentle);
  const w = textW(ctx, TXT.tag, size, 800, D, 0.01);
  if (k > 0) tricolor(ctx, x, base + 26, w, 10, k);
  rise(ctx, TXT.tag, x, base, size, 800, D, C.cream, u, 1.4, { track: 0.01, stagger: 0.04, cfg: SPRING.bouncy });
}

// ------------------------------------------------------------------ S2 le lancer d'épervier (u 6..11)
function sceneEpervier(ctx, u, IMG) {
  const hy = 720;
  const sun = { x: 700, y: hy - 10, r: 430 };
  // pose : armé (u<7.6), lancer (7.6..8.1), suivi
  const wind = E.inOutCubic(prog(u, 5.8, 7.5));
  const thr = E.outQuint(prog(u, 7.55, 8.1));
  const lean = lerp(lerp(0, -0.22, wind), 0.32, thr);
  const a1 = lerp(lerp(0.6, -1.3, wind), 2.25, thr);
  const a2 = lerp(lerp(0.4, -1.2, wind), 2.0, thr);
  const bx = 1290, by = 880 + Math.sin(u * 1.2) * 4;
  let hands;
  if (IMG.epervier) photo(ctx, IMG.epervier, u, 5.5, 11.5, { z0: 1.05, z1: 1.14 });
  else {
    sky(ctx, hy, sun, 0.15);
    farBank(ctx, hy, 9, { s: 0.8, ox: -(u - 6) * 6 });
    river(ctx, hy, sun, u, 5);
    pirogue(ctx, bx + 380, by + 30, 1100, -0.02);
    hands = person(ctx, bx, by, 560, { lean, head: lerp(0.2, -0.35, thr), stance: 0.16, armB: [a1 - 0.25, a2 - 0.2], armF: [a1, a2] }, -1);
    // l'épervier : en paquet dans les mains, puis s'ouvre en vol
    const fly = prog(u, 8.0, 9.4);
    if (u < 8.0) {
      const h = hands[1];
      drapedNet(ctx, h[0], h[1], 150 + 20 * wind, lerp(0, -0.5, wind) + Math.sin(u * 3) * 0.05);
    } else {
      const open = springU(u, 8.0, { stiffness: 70, damping: 9 });
      const fall = E.inQuad(prog(u, 9.6, 11.2));
      const cx = lerp(hands[1][0], 640, E.outCubic(fly)), cy = lerp(hands[1][1], 470, E.outCubic(fly)) + fall * 260;
      castNet(ctx, cx, cy, 30 + 330 * open, lerp(1.4, 0.3, clamp(open)), clamp(open), { lw: 2.6 });
      // la corde qui relie le pêcheur au filet
      const h = hands[1];
      ctx.strokeStyle = C.sil; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.quadraticCurveTo(lerp(h[0], cx, 0.5), Math.max(h[1], cy) + 80, cx, cy - (30 + 330 * open) * 0.4); ctx.stroke();
    }
  }
  vignette(ctx, 0.4);
  rise(ctx, TXT.peche, 90, 1010, 330, 900, D, C.cream, u, 8.0, { track: 0.01, stagger: 0.05, cfg: SPRING.bouncy });
}

// ------------------------------------------------------------------ S3 la traversée des zébus (u 11..16)
function sceneZebus(ctx, u, IMG) {
  if (IMG.zebus) photo(ctx, IMG.zebus, u, 10.5, 16.5, { z0: 1.12, z1: 1.02 });
  else {
    const hy = 520;
    const pan = (u - 11) * 26;
    const sun = { x: 1480 - pan * 0.3, y: hy + 10, r: 170 };
    sky(ctx, hy, sun, 0.35);
    for (let i = 0; i < 5; i++) bird(ctx, 300 + i * 90 + u * 40, 200 + (i % 2) * 30 + i * 8, 13, u * 8 + i);
    farBank(ctx, hy, 21, { s: 0.75, ox: -pan * 0.4, mosqueX: 1180 });
    river(ctx, hy, sun, u, 8, 30);
    // rangée lointaine (vers la gauche)
    for (let i = 0; i < 7; i++) {
      const x = 260 + i * 210 - pan * 0.6 - (u - 11) * 8;
      zebu(ctx, x, 650 + (i % 2) * 8, 58, u * 2.2 + i * 1.7, -1);
    }
    // rangée proche (vers la droite) + bouvier en pirogue, chapeau peul
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 450 - pan + (u - 11) * 24;
      zebu(ctx, x, 860 + (i % 2) * 34, 165 + (i % 2) * 20, u * 2.4 + i * 2.1, 1);
    }
    const hx = 1560 - pan * 1.1, hyb = 960;
    pirogue(ctx, hx, hyb, 520, 0.01);
    const push = Math.sin(u * 1.6);
    const hd = person(ctx, hx + 40, hyb - 22, 330, { lean: 0.1 + 0.1 * push, hat: 'peul', robe: true, stance: 0.1, armB: [-0.9, -1.5], armF: [-0.6, -1.8] }, -1);
    pole(ctx, [hd[1][0] + 40, hd[1][1] - 140], [hd[1][0] - 120 - 30 * push, hyb + 110], 7);
  }
  vignette(ctx, 0.4);
  rise(ctx, TXT.elevage, W - 90, 300, 300, 900, D, C.cream, u, 12.0, { track: 0.01, stagger: 0.045, align: 'right', cfg: SPRING.bouncy });
}

// ------------------------------------------------------------------ S4 / S5 portraits officiels
function portraitBg(ctx, u, side) {
  fill(ctx, C.ink);
  // soleil qui rétroéclaire le cadre
  const sx = side < 0 ? 520 : W - 520;
  const g = ctx.createRadialGradient(sx, 560, 40, sx, 560, 820);
  g.addColorStop(0, 'rgba(244,180,26,0.55)'); g.addColorStop(0.35, 'rgba(226,119,44,0.22)'); g.addColorStop(1, 'rgba(10,28,40,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // houle de l'emblème qui coule en bas de l'écran
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const y = 800 + i * 52, amp = 12 - i, wl = 260 - i * 14;
    ctx.strokeStyle = i === 0 ? 'rgba(244,180,26,0.55)' : `rgba(46,110,134,${0.45 - i * 0.05})`;
    ctx.lineWidth = 9 - i;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 12) {
      const yy = y + Math.sin((x + (u * 60 + i * 40) * (i % 2 ? -1 : 1)) / wl * TAU) * amp;
      if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}
function placeholderPortrait(ctx, x, y, w, h, label) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2B4656'); g.addColorStop(1, '#162A36');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3B5A6C';
  ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.4, w * 0.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.98, w * 0.42, h * 0.33, 0, Math.PI, TAU); ctx.fill();
  txt(ctx, 'PHOTO OFFICIELLE', x + w / 2, y + h - 70, 30, 700, UI, C.cream, { align: 'center', track: 0.12, alpha: 0.75 });
  txt(ctx, label, x + w / 2, y + h - 30, 22, 500, UI, C.cream, { align: 'center', alpha: 0.5 });
}
function scenePortrait(ctx, u, u0, IMG, who) {
  const side = who === 'pres' ? -1 : 1;            // côté du cadre photo
  const T = TXT[who];
  const img = IMG[who === 'pres' ? 'president' : 'ministre'];
  portraitBg(ctx, u, side);
  const ph = SHOW_NAMES ? 780 : 860, py = SHOW_NAMES ? 150 : 100;
  const pw = SHOW_NAMES || !img ? (SHOW_NAMES ? 600 : 680) : clamp(ph * img.width / img.height, 600, 1400);
  const px = SHOW_NAMES ? (side < 0 ? 200 : W - 200 - pw) : (W - pw) / 2 + side * 0;
  // le cadre se dévoile de bas en haut
  const k = springU(u, u0 - 0.4, SPRING.snappy);
  const rev = clamp(k);
  ctx.save();
  ctx.beginPath(); ctx.rect(px, py + ph * (1 - rev), pw, ph * rev); ctx.clip();
  ctx.translate(0, (1 - k) * 60);
  if (img) {
    const pz = 1.02 * (1.08 / 1.02) ** prog(u, u0, u0 + 6);
    cover(ctx, img, px, py, pw, ph, who === 'pres' ? { fx: 0.5, fy: 0.12, zoom: pz } : { fx: 0.46, fy: 0.25, zoom: pz });
  } else placeholderPortrait(ctx, px, py, pw, ph, `assets/photos/${who === 'pres' ? 'president' : 'ministre'}.jpg`);
  ctx.restore();
  // filet or sur le bord intérieur du cadre
  const barK = E.outQuint(prog(u, u0 + 0.1, u0 + 0.9));
  ctx.fillStyle = C.gold;
  const bx = side < 0 ? px + pw : px - 14;
  ctx.fillRect(bx, py + ph - ph * barK, 14, ph * barK);
  // bloc texte
  if (!SHOW_NAMES) return;
  const tx = side < 0 ? px + pw + 90 : 120;
  if (T.grade) rise(ctx, T.grade.toUpperCase(), tx, 420, 64, 600, D, C.gold, u, u0 + 0.35, { track: 0.06, stagger: 0.02 });
  const nameSize = who === 'pres' ? 210 : 250;
  const top = T.grade ? 420 : 380;
  const nw = rise(ctx, T.nom, tx - 6, top + nameSize * 0.86, nameSize, 800, D, C.cream, u, u0 + 0.5, { track: 0.005, stagger: 0.03, cfg: SPRING.bouncy });
  const ly = top + nameSize * 0.86 + 40;
  tricolor(ctx, tx, ly, Math.max(nw, 420), 10, E.outQuint(prog(u, u0 + 0.9, u0 + 1.7)));
  const tk = E.outCubic(prog(u, u0 + 1.2, u0 + 1.9));
  if (tk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, ly + 20, W, 80); ctx.clip();
    txt(ctx, T.titre, tx, ly + 72 + (1 - tk) * 60, 48, 500, UI, C.cream);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ S6 montage rapide (u 28..31)
function montage(ctx, u, IMG) {
  const i = Math.floor(u - 28);
  const lu = u - 28 - i;                            // 0..1 dans le plan
  if (i === 0) {          // filet en gros plan devant le soleil
    if (IMG.m1) photo(ctx, IMG.m1, lu, 0, 1, { z0: 1.0, z1: 1.1 });
    else {
      const sun = { x: 960, y: 640, r: 520 };
      sky(ctx, 1000, sun, 0.1);
      river(ctx, 1000, sun, u, 3);
      castNet(ctx, 960, 560 + lu * 60, 900 + lu * 120, 0.42, 1, { lw: 5 });
    }
  } else if (i === 1) {   // poisson qui saute
    if (IMG.m2) photo(ctx, IMG.m2, lu, 0, 1, { z0: 1.06, z1: 1.0 });
    else {
      const hy = 760, sun = { x: 1220, y: hy, r: 400 };
      sky(ctx, hy, sun, 0.05);
      river(ctx, hy, sun, u, 6);
      const a = lerp(-0.75, 0.35, lu);
      fishSil(ctx, lerp(980, 1480, lu), hy - 380 * Math.sin(Math.PI * (0.3 + lu * 0.5)), 1.35, a);
      ctx.fillStyle = C.sil;
      for (let d = 0; d < 14; d++) {   // gouttes
        const t0 = rnd(d, 61) * 0.5;
        const q = clamp((lu - t0) / 0.6);
        if (q <= 0) continue;
        const dx = 900 + rnd(d, 62) * 220 + q * (rnd(d, 63) - 0.5) * 300;
        const dy = hy - 40 - Math.sin(q * Math.PI) * (80 + 160 * rnd(d, 64));
        ctx.beginPath(); ctx.arc(dx, dy, 4 + 6 * rnd(d, 65), 0, TAU); ctx.fill();
      }
    }
  } else {                // pirogues en file sur l'eau d'or
    if (IMG.m3) photo(ctx, IMG.m3, lu, 0, 1, { z0: 1.0, z1: 1.08 });
    else {
      const hy = 430, sun = { x: 1500, y: hy - 30, r: 210 };
      sky(ctx, hy, sun, 0.25);
      farBank(ctx, hy, 30, { s: 0.6 });
      river(ctx, hy, sun, u, 11, 30);
      [[520, 560, 360], [1060, 700, 560], [700, 900, 900]].forEach(([x, y, L], j) => {
        const xx = x + lu * (40 + j * 30);
        pirogue(ctx, xx, y, L);
        const hands = person(ctx, xx + L * 0.12, y - L * 0.04, L * 0.42, { lean: 0.2, hat: j === 1 ? 'peul' : 'bonnet', armB: [-1.0, -1.6], armF: [-0.7, -1.9] }, -1);
        pole(ctx, [hands[1][0] + L * 0.06, hands[1][1] - L * 0.2], [hands[1][0] - L * 0.2, y + L * 0.12], Math.max(3, L * 0.01));
      });
    }
  }
  vignette(ctx, 0.5);
}
function dateCard(ctx, u) {
  // bandeau de date qui reste fixe à travers les coupes du montage
  const k = springU(u, 27.85, SPRING.snappy);
  const out = E.inCubic(prog(u, 30.7, 31.0));
  if (k <= 0 || out >= 1) return;
  const x = 96, y = 820;
  const w = (textW(ctx, TXT.date.jour, 96, 800, D, 0.01) + 80) * clamp(k) * (1 - out);
  ctx.fillStyle = C.ink; ctx.fillRect(x - 40, y - 120, w, 190);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 40, y - 120, w, 190); ctx.clip();
  txt(ctx, TXT.date.kicker, x, y - 60, 34, 700, UI, C.gold, { track: 0.2 });
  rise(ctx, TXT.date.jour, x, y + 30, 96, 800, D, C.cream, u, 28.1, { track: 0.01, stagger: 0.015 });
  ctx.restore();
  tricolor(ctx, x - 40, y + 70, w, 8, 1);
}

// ------------------------------------------------------------------ S7 l'emblème et le titre (u 31..40)
function sceneLogo(ctx, u) {
  fill(ctx, C.ink);
  const fin = { x: 452, y: 540, size: 600 };
  const zk = springU(u, 31.9, { stiffness: 90, damping: 17 });       // le recul
  const z0 = 4200;
  const size = z0 * (fin.size / z0) ** clamp(zk, 0, 1.08);
  // point d'intérêt : la tête du zébu au centre de l'écran pendant le gros plan
  const lx = lerp(500, 500, zk), ly = lerp(455 - (u - 31) * 6, 500, clamp(zk));
  const cx = lerp(W / 2, fin.x, zk) - ((lx - 500) / 1000) * size;
  const cy = lerp(H / 2, fin.y, zk) - ((ly - 500) / 1000) * size;
  // halo derrière l'emblème
  const hk = clamp(zk);
  if (hk > 0) {
    const g = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 1.3);
    g.addColorStop(0, `rgba(244,180,26,${0.25 * hk})`); g.addColorStop(1, 'rgba(244,180,26,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // houle de fond, très discrète
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const y = 930 + i * 40;
    ctx.strokeStyle = `rgba(46,110,134,${(0.28 - i * 0.05) * hk})`; ctx.lineWidth = 6 - i;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 14) {
      const yy = y + Math.sin((x + u * 40 * (i % 2 ? -1 : 1)) / (240 - i * 20) * TAU) * (10 - i * 2);
      if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  const p = {
    disc: 1, ring: 1,
    sun: 0.55 + 0.45 * E.outCubic(prog(u, 30.8, 32.4)),
    horns: 1, head: 1,
    horizon: 1,
    wave0: E.outCubic(prog(u, 32.35, 33.1)), wave1: E.outCubic(prog(u, 32.5, 33.25)),
    wave2: E.outCubic(prog(u, 32.65, 33.4)), wave3: E.outCubic(prog(u, 32.8, 33.55)),
    fish: springU(u, 33.0, { stiffness: 120, damping: 11 }),
  };
  drawEmblem(ctx, cx, cy, size, p, { flow: (u - 32) * 20 });

  // titre : même composition que le logo horizontal
  const tx = fin.x + fin.size / 2 + 80;
  const s1 = 150;
  const w1 = textW(ctx, TXT.l1, s1, 800, D, 0.005);
  const s2 = (w1 / textW(ctx, TXT.l2, 100, 700, D, 0.04)) * 100;
  const blockTop = 540 - 150;
  const y1 = blockTop + 100 + s1 * 0.7;
  rise(ctx, TXT.l1, tx, y1, s1, 800, D, C.cream, u, 33.1, { track: 0.005, stagger: 0.025, cfg: SPRING.snappy });
  const y2 = y1 + 18 + s2 * 0.7;
  rise(ctx, TXT.l2, tx, y2, s2, 700, D, C.cream, u, 33.55, { track: 0.04, stagger: 0.012 });
  tricolor(ctx, tx, y2 + 22, w1, 12, E.outQuint(prog(u, 34.2, 35.0)));
  const k3 = E.outCubic(prog(u, 34.6, 35.3));
  if (k3 > 0) txt(ctx, TXT.l3, tx, y2 + 22 + 12 + 52 + (1 - k3) * 20, 34, 600, UI, C.cream, { track: 0.32, alpha: k3 });
  // étiquette JT SPÉCIAL
  const kt = springU(u, 34.9, SPRING.bouncy);
  if (kt > 0) {
    const lw = textW(ctx, TXT.tag, 46, 800, D, 0.06) + 40;
    ctx.save(); ctx.translate(tx, blockTop + 20); ctx.scale(clamp(kt, 0, 1.2), 1);
    ctx.fillStyle = C.gold; ctx.fillRect(0, 0, lw, 62);
    ctx.restore();
    if (kt > 0.6) txt(ctx, TXT.tag, tx + 20, blockTop + 20 + 47, 46, 800, D, C.ink, { track: 0.06, alpha: clamp((kt - 0.6) / 0.3) });
  }
  vignette(ctx, 0.35);
}

// ------------------------------------------------------------------ transitions
// whip : panoramique où les deux plans sont à l'écran ; fini sur le temps u1
function whip(ctx, u, u1, dur, dx, dy, a, b) {
  const p = E.inOutCubic(prog(u, u1 - dur, u1));
  ctx.save(); ctx.translate(-dx * p * W, -dy * p * H); a(); ctx.restore();
  ctx.save(); ctx.translate(dx * (1 - p) * W, dy * (1 - p) * H); b(); ctx.restore();
}

// ------------------------------------------------------------------ le film
let MANIFEST = {};
const PHOTO_KEYS = ['aube', 'epervier', 'zebus', 'president', 'ministre', 'm1', 'm2', 'm3'];
try {
  MANIFEST = await fetch('assets/photos/manifest.json').then((r) => (r.ok ? r.json() : {}));
} catch { MANIFEST = {}; }
const images = {};
for (const k of PHOTO_KEYS) if (MANIFEST[k]) images[k] = `assets/photos/${MANIFEST[k]}`;

M.film({
  fonts: [font(100, 600, D), font(100, 700, D), font(100, 800, D), font(100, 900, D), font(40, 500, UI), font(40, 600, UI), font(40, 700, UI)],
  images,
  hits: HITS,
  samples: (t) => (t > 8.2 && t < 10.8) || t > 16.6 ? 8 : 14,
  draw(ctx, u, t, IMG) {
    if (u < 5.5) sceneAube(ctx, u, IMG);
    else if (u < 6) whip(ctx, u, 6, 0.5, 1, 0, () => sceneAube(ctx, u, IMG), () => sceneEpervier(ctx, u, IMG));
    else if (u < 10.55) sceneEpervier(ctx, u, IMG);
    else if (u < 11) whip(ctx, u, 11, 0.45, 0, -1, () => sceneEpervier(ctx, u, IMG), () => sceneZebus(ctx, u, IMG));
    else if (u < 16) sceneZebus(ctx, u, IMG);
    else if (u < 21.5) scenePortrait(ctx, u, 16, IMG, 'pres');
    else if (u < 22) whip(ctx, u, 22, 0.5, 1, 0, () => scenePortrait(ctx, u, 16, IMG, 'pres'), () => scenePortrait(ctx, u, 22, IMG, 'min'));
    else if (u < 28) scenePortrait(ctx, u, 22, IMG, 'min');
    else if (u < 31) montage(ctx, u, IMG);
    else sceneLogo(ctx, u);
    if (SHOW_DATE && u >= 27.8 && u < 31.05) dateCard(ctx, u);
  },
});
