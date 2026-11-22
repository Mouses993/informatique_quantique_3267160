// Construit les livrables du logo (SVG vectorisés + PNG transparents) depuis lib/emblem.js.
//   cd intro-egep/tools && node build_logo.mjs
// Sorties : intro-egep/logo/*.svg, *.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { emblemSVG, COL } from '../lib/emblem.js';
const require = createRequire(import.meta.url);
const opentype = require('opentype.js');
const { chromium } = require('playwright');

const FD = path.resolve('../fonts/src');
const load = (f) => opentype.parse(fs.readFileSync(path.join(FD, f)).buffer.slice(0));
const F = {
  d800: load('barlow-condensed-latin-800-normal.woff'),
  d700: load('barlow-condensed-latin-700-normal.woff'),
  u600: load('inter-latin-600-normal.woff'),
};
const L1 = 'ÉTATS GÉNÉRAUX';
const L2 = 'DE L’ÉLEVAGE ET DE LA PÊCHE';
const L3 = 'MALI · 2026';
// toutes les lettres existent dans les deux familles ?
for (const [k, f] of Object.entries(F)) for (const ch of new Set([...L1, ...L2, ...L3, ...'JTSPÉCIALÏ'])) {
  if (ch !== ' ' && f.charToGlyphIndex(ch) === 0) console.warn(`glyphe manquant ${ch} dans ${k}`);
}
// largeur avec interlettrage (track en em)
const width = (f, s, size, track = 0) => f.getAdvanceWidth(s, size, { kerning: true }) + track * size * ([...s].length - 1);
// texte -> path data, interlettrage appliqué lettre par lettre
function textPath(f, s, x, y, size, track = 0) {
  let d = '', cx = x;
  const glyphs = f.stringToGlyphs(s);
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(2);
    let adv = (g.advanceWidth / f.unitsPerEm) * size;
    if (i < glyphs.length - 1) adv += (f.getKerningValue(g, glyphs[i + 1]) / f.unitsPerEm) * size;
    cx += adv + track * size;
  });
  return d;
}
const capH = (f, size) => (f.tables.os2.sCapHeight / f.unitsPerEm) * size;

function wordmark(x, yTop, textColor, align = 'left') {
  const s1 = 300;
  const w1 = width(F.d800, L1, s1, 0.005);
  // L2 justifiée sur la largeur de L1
  const t2 = 0.04;
  const s2 = (w1 / width(F.d700, L2, 100, t2)) * 100;
  const w2 = width(F.d700, L2, s2, t2);
  const s3 = 64, t3 = 0.32;
  const w3 = width(F.u600, L3, s3, t3);
  const ox = align === 'center' ? x - w1 / 2 : x;
  const y1 = yTop + capH(F.d800, s1);
  const y2 = y1 + 36 + capH(F.d700, s2);
  const barY = y2 + 40, barH = 22;
  const y3 = barY + barH + 40 + capH(F.u600, s3);
  const third = w1 / 3;
  const out = `
  <path d="${textPath(F.d800, L1, ox, y1, s1, 0.005)}" fill="${textColor}"/>
  <path d="${textPath(F.d700, L2, ox, y2, s2, t2)}" fill="${textColor}"/>
  <rect x="${ox}" y="${barY}" width="${third}" height="${barH}" fill="${COL.green}"/>
  <rect x="${ox + third}" y="${barY}" width="${third}" height="${barH}" fill="${COL.yellow}"/>
  <rect x="${ox + 2 * third}" y="${barY}" width="${third}" height="${barH}" fill="${COL.red}"/>
  <path d="${textPath(F.u600, L3, align === 'center' ? x - w3 / 2 : ox, y3, s3, t3)}" fill="${textColor}"/>`;
  return { svg: out, w: w1, h: y3 - yTop, meta: { s1, s2, w2 } };
}

const OUT = path.resolve('../logo');
fs.mkdirSync(OUT, { recursive: true });
const files = [];
function write(name, w, h, body) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}">\n<title>États généraux de l’Élevage et de la Pêche</title>${body}\n</svg>\n`;
  fs.writeFileSync(path.join(OUT, name + '.svg'), svg);
  files.push([name, w, h, svg]);
}

// emblème seul
write('embleme', 1000, 1000, emblemSVG());
// horizontal : emblème + titre (versions fond sombre / fond clair)
for (const [suffix, tc] of [['fond-sombre', COL.cream], ['fond-clair', COL.ink]]) {
  const probe = wordmark(0, 0, tc);
  const gap = 90, pad = 20;
  const x = 1000 + gap;
  const yTop = 500 - probe.h / 2;
  const wm = wordmark(x, yTop, tc);
  write(`logo-horizontal_${suffix}`, x + wm.w + pad, 1000, emblemSVG() + wm.svg);
}
// vertical (empilé) : emblème au-dessus, titre centré
for (const [suffix, tc] of [['fond-sombre', COL.cream], ['fond-clair', COL.ink]]) {
  const probe = wordmark(0, 0, tc);
  const W = Math.max(1000, probe.w) + 80;
  const ex = (W - 1000) / 2;
  const wm = wordmark(W / 2, 1000 + 90, tc, 'center');
  write(`logo-vertical_${suffix}`, W, 1000 + 90 + wm.h + 40, `<g transform="translate(${ex} 0)">${emblemSVG()}</g>` + wm.svg);
}

// PNG transparents (et un aperçu sur fond)
const b = await chromium.launch();
for (const [name, w, h, svg] of files) {
  const scale = Math.min(4, 4000 / w);
  const pg = await b.newPage({ viewport: { width: Math.ceil(w), height: Math.ceil(h) }, deviceScaleFactor: scale });
  await pg.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/^<\?xml[^>]*>/, '')}</body></html>`);
  await pg.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  await pg.close();
}
// planche de présentation
const sheet = await b.newPage({ viewport: { width: 1600, height: 400 } });
const svgOf = (n) => files.find((f) => f[0] === n)[3].replace(/^<\?xml[^>]*>/, '').replace(/width="[\d.]+" height="[\d.]+"/, 'style="width:100%;height:auto"');
await sheet.setContent(`<html><body style="margin:0;width:1600px">
  <div style="background:${COL.ink};padding:70px 90px">${svgOf('logo-horizontal_fond-sombre')}</div>
  <div style="display:flex">
    <div style="flex:1;background:#F3EEE4;padding:60px 50px;display:flex;align-items:center">${svgOf('logo-horizontal_fond-clair')}</div>
    <div style="flex:1;background:#0E2533;padding:40px 150px">${svgOf('logo-vertical_fond-sombre')}</div>
  </div>
</body></html>`);
await sheet.screenshot({ path: path.join(OUT, 'planche-logo.png'), fullPage: true });
await b.close();
console.log(files.map((f) => `${f[0]}  ${f[1].toFixed(0)}x${f[2].toFixed(0)}`).join('\n'));
