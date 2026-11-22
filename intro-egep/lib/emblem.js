// Emblème des États généraux de l'Élevage et de la Pêche.
// Une seule géométrie (SVG path data dans une boîte 1000×1000) partagée par le film (Path2D)
// et par tools/build_logo.mjs (SVG / PNG livrés). Modifier ici = modifier partout.
//
// Lecture : le soleil se lève sur le Niger entre les cornes en lyre d'un zébu (l'élevage) ;
// sous l'horizon, le fleuve et un poisson qui saute (la pêche).

export const COL = {
  ink: '#0A1C28',      // nuit du fleuve
  ink2: '#123247',
  gold: '#F4B41A',     // l'accent unique : le soleil
  cream: '#F6ECD6',
  water: '#2E6E86',
  green: '#14B53A',    // drapeau du Mali : filet de signature uniquement
  yellow: '#FCD116',
  red: '#CE1126',
};

export const BOX = 1000;
export const CX = 500, CY = 500, R_OUT = 492, R_IN = 462;
export const HORIZON = 585;
export const SUN = { cx: 500, cy: HORIZON, r: 205 };

// Tête de zébu de face : chanfrein long, mufle arrondi qui touche l'horizon.
export const HEAD = 'M438,402 C438,378 562,378 562,402 L548,500 C543,548 527,578 500,578 C473,578 457,548 452,500 Z';
// Oreilles tombantes (typiques du zébu peul).
export const EAR_L = 'M446,430 C418,428 382,440 352,468 C362,478 404,476 450,456 Z';
export const EAR_R = 'M554,430 C582,428 618,440 648,468 C638,478 596,476 550,456 Z';
// Cornes en lyre : partent du chignon, s'écartent puis reviennent vers l'intérieur.
export const HORN_L = 'M452,392 C392,384 318,352 300,268 C288,212 304,164 344,118 C338,170 330,214 342,262 C358,318 404,350 458,366 Z';
export const HORN_R = 'M548,392 C608,384 682,352 700,268 C712,212 696,164 656,118 C662,170 670,214 658,262 C642,318 596,350 542,366 Z';
// Liste d'adorno entre les cornes (le chignon).
export const POLL = 'M452,366 C470,352 530,352 548,366 L548,392 C530,384 470,384 452,392 Z';

// Poisson (capitaine du Niger, stylisé), à l'origine, tourné vers la droite, longueur ~330.
export const FISH = 'M-156,14 C-118,-46 30,-84 128,-22 C140,-14 150,-6 156,0 C146,10 136,16 124,20 C40,64 -96,70 -156,14 Z ' +
  'M-126,-8 C-160,-26 -194,-46 -224,-66 C-208,-20 -210,30 -228,78 C-196,58 -160,40 -126,30 Z';
export const FISH_FIN = 'M-40,-48 C-18,-92 34,-104 72,-66 C30,-60 -4,-54 -40,-48 Z';
export const FISH_POSE = { x: 655, y: 742, rot: -0.5, s: 0.9 };   // en plein saut, au-dessus des vagues

// Vagues : sinusoïdes tracées en courbes de Bézier, du bord gauche au bord droit du disque.
export function wave(y, amp, wl, phase = 0, x0 = 20, x1 = 980) {
  const q = wl / 4;
  let x = x0 - ((((x0 - phase) % wl) + wl) % wl);   // commence sur un passage à l'axe, aligné sur la phase
  const yAt = (i) => y + [0, -1, 0, 1][i % 4] * amp;
  const f = (v) => v.toFixed(1);
  let d = `M${f(x)},${f(yAt(0))}`;
  for (let i = 0; x < x1; i++) {
    const ya = yAt(i), yb = yAt(i + 1), xb = x + q;
    if (i % 2 === 0) d += ` C${f(x + 0.3343 * q)},${f(ya + 0.5251 * (yb - ya))} ${f(x + 0.6401 * q)},${f(yb)} ${f(xb)},${f(yb)}`;
    else d += ` C${f(x + 0.3599 * q)},${f(ya)} ${f(x + 0.6657 * q)},${f(yb + 0.5251 * (ya - yb))} ${f(xb)},${f(yb)}`;
    x = xb;
  }
  return d;
}
export const WAVES = [
  { y: 640, amp: 15, wl: 210, phase: 40, w: 16 },
  { y: 712, amp: 14, wl: 190, phase: 120, w: 17 },
  { y: 778, amp: 12, wl: 170, phase: 10, w: 13 },
  { y: 836, amp: 10, wl: 150, phase: 90, w: 10 },
];

// ------------------------------------------------------------------ dessin canvas (le film)
// p : progression par élément (0..1), pour l'assemblage animé. Tout à 1 = logo final.
const P2 = {};
const path = (k, d) => (P2[k] ||= new Path2D(d));

export function drawEmblem(ctx, x, y, size, p = {}, opt = {}) {
  const g = (k) => (p[k] === undefined ? 1 : p[k]);
  const s = size / BOX;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-CX, -CY);
  const disc = g('disc');
  if (disc <= 0) { ctx.restore(); return; }
  // disque + anneau
  ctx.save();
  ctx.translate(CX, CY); ctx.scale(disc, disc); ctx.translate(-CX, -CY);
  ctx.beginPath(); ctx.arc(CX, CY, R_OUT, 0, Math.PI * 2);
  ctx.fillStyle = opt.ringColor || COL.gold; ctx.globalAlpha = g('ring'); ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(CX, CY, R_IN, 0, Math.PI * 2);
  const grd = ctx.createLinearGradient(0, 40, 0, HORIZON);
  grd.addColorStop(0, COL.ink2); grd.addColorStop(1, '#1D4A63');
  ctx.fillStyle = grd; ctx.fill();
  ctx.restore();

  // tout le reste est découpé dans le disque intérieur
  ctx.save();
  ctx.beginPath(); ctx.arc(CX, CY, R_IN * Math.min(1, disc), 0, Math.PI * 2); ctx.clip();
  // eau
  ctx.fillStyle = COL.ink;
  ctx.fillRect(0, HORIZON, BOX, BOX - HORIZON);
  // soleil qui se lève : il monte depuis sous l'horizon
  const sun = g('sun');
  if (sun > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, BOX, HORIZON); ctx.clip();
    ctx.beginPath(); ctx.arc(SUN.cx, SUN.cy + (1 - sun) * (SUN.r + 20), SUN.r, 0, Math.PI * 2);
    ctx.fillStyle = COL.gold; ctx.fill();
    ctx.restore();
  }
  // vagues (tracées de gauche à droite)
  WAVES.forEach((w, i) => {
    const k = g('wave' + i);
    if (k <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 40 + 940 * k, BOX); ctx.clip();
    ctx.lineCap = 'round'; ctx.lineWidth = w.w; ctx.strokeStyle = i === 0 ? COL.gold : COL.water;
    ctx.stroke(path('w' + i, wave(w.y, w.amp, w.wl, w.phase + (opt.flow || 0) * (i % 2 ? -1 : 1))));
    ctx.restore();
  });
  // horizon
  const hz = g('horizon');
  if (hz > 0) {
    ctx.fillStyle = COL.gold;
    ctx.fillRect(CX - 470 * hz, HORIZON - 5, 940 * hz, 10);
  }
  // cornes : poussent depuis le chignon (révélées par un masque qui monte)
  const horn = g('horns');
  if (horn > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 400 - 300 * horn, BOX, 300 * horn + 10); ctx.clip();
    ctx.fillStyle = COL.cream;
    ctx.fill(path('hl', HORN_L)); ctx.fill(path('hr', HORN_R));
    ctx.restore();
  }
  // tête
  const head = g('head');
  if (head > 0) {
    ctx.save();
    ctx.translate(0, (1 - head) * -60); ctx.globalAlpha = Math.min(1, head * 1.6);
    ctx.fillStyle = COL.cream;
    ctx.fill(path('el', EAR_L)); ctx.fill(path('er', EAR_R));
    ctx.fill(path('head', HEAD)); ctx.fill(path('poll', POLL));
    // ombre du chanfrein : un trait sombre qui donne le volume
    ctx.fillStyle = COL.ink; ctx.globalAlpha *= 0.9;
    ctx.beginPath(); ctx.ellipse(486, 556, 6, 9, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(514, 556, 6, 9, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // poisson
  const fish = g('fish');
  if (fish > 0) {
    const fp = opt.fishPose || FISH_POSE;
    // arc du saut : part de sous la vague, finit à sa pose
    const a = 1 - fish;
    const fx = fp.x - a * 160, fy = fp.y + a * a * 220;
    ctx.save();
    ctx.translate(fx, fy); ctx.rotate(fp.rot + a * 0.6); ctx.scale(fp.s, fp.s);
    ctx.fillStyle = opt.fishColor || COL.cream;
    ctx.fill(path('fish', FISH)); ctx.fill(path('fin', FISH_FIN));
    ctx.fillStyle = COL.ink;
    ctx.beginPath(); ctx.arc(100, -14, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ SVG (livrables)
export function emblemSVG(opt = {}) {
  const fishColor = opt.fishColor || COL.cream;
  const fp = FISH_POSE;
  const deg = (fp.rot * 180) / Math.PI;
  const waves = WAVES.map((w, i) =>
    `<path d="${wave(w.y, w.amp, w.wl, w.phase)}" fill="none" stroke="${i === 0 ? COL.gold : COL.water}" stroke-width="${w.w}" stroke-linecap="round"/>`).join('\n      ');
  return `<g id="embleme">
    <defs>
      <clipPath id="disque"><circle cx="${CX}" cy="${CY}" r="${R_IN}"/></clipPath>
      <clipPath id="ciel"><rect x="0" y="0" width="${BOX}" height="${HORIZON}"/></clipPath>
      <linearGradient id="gciel" x1="0" y1="40" x2="0" y2="${HORIZON}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${COL.ink2}"/><stop offset="1" stop-color="#1D4A63"/>
      </linearGradient>
    </defs>
    <circle cx="${CX}" cy="${CY}" r="${R_OUT}" fill="${COL.gold}"/>
    <circle cx="${CX}" cy="${CY}" r="${R_IN}" fill="url(#gciel)"/>
    <g clip-path="url(#disque)">
      <rect x="0" y="${HORIZON}" width="${BOX}" height="${BOX - HORIZON}" fill="${COL.ink}"/>
      <circle cx="${SUN.cx}" cy="${SUN.cy}" r="${SUN.r}" fill="${COL.gold}" clip-path="url(#ciel)"/>
      ${waves}
      <rect x="${CX - 470}" y="${HORIZON - 5}" width="940" height="10" fill="${COL.gold}"/>
      <path d="${HORN_L}" fill="${COL.cream}"/><path d="${HORN_R}" fill="${COL.cream}"/>
      <path d="${EAR_L}" fill="${COL.cream}"/><path d="${EAR_R}" fill="${COL.cream}"/>
      <path d="${HEAD}" fill="${COL.cream}"/><path d="${POLL}" fill="${COL.cream}"/>
      <ellipse cx="486" cy="556" rx="6" ry="9" transform="rotate(20 486 556)" fill="${COL.ink}"/>
      <ellipse cx="514" cy="556" rx="6" ry="9" transform="rotate(-20 514 556)" fill="${COL.ink}"/>
      <g transform="translate(${fp.x} ${fp.y}) rotate(${deg.toFixed(2)}) scale(${fp.s})">
        <path d="${FISH}" fill="${fishColor}"/><path d="${FISH_FIN}" fill="${fishColor}"/>
        <circle cx="100" cy="-14" r="8" fill="${COL.ink}"/>
      </g>
    </g>
  </g>`;
}
