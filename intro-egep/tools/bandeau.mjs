// Bandeaux d'identification (lower thirds) aux couleurs des États généraux.
//   cd intro-egep/tools && node bandeau.mjs
// Écrit ../bandeaux/<id>.png (image fixe transparente) et <id>.mov (animation 6 s, 25 i/s, codec PNG avec alpha)
// Ajouter / modifier une personne : la liste PERSONNES ci-dessous.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const PERSONNES = [
  { id: 'bandeau_ministre', nom: 'Youba BA', titre: 'Ministre de l’Élevage et de la Pêche' },
  { id: 'bandeau_president', nom: 'Général d’Armée Assimi GOÏTA', titre: 'Président de la Transition, Chef de l’État' },
  { id: 'bandeau_modele', nom: 'Prénom NOM', titre: 'Fonction / Structure' },
];
const FPS = 25, DUR = 6;
const ROOT = path.resolve('..');
const OUT = path.join(ROOT, 'bandeaux');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(0);
const port = server.address().port;
fs.writeFileSync(path.join(ROOT, 'tools', '_bandeau.html'), `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:Display;src:url(/fonts/barlow-condensed-latin-800-normal.woff2);font-weight:800}
@font-face{font-family:UI;src:url(/fonts/inter-latin-600-normal.woff2);font-weight:600}
html,body{margin:0;background:transparent}</style><canvas id=c width=1920 height=1080></canvas>
<script type=module>
import { drawEmblem, COL } from '/lib/emblem.js';
const c = document.getElementById('c'), x = c.getContext('2d');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const outQuint = (t) => 1 - (1 - t) ** 5;
const spring = (t, k = 260, d = 16) => { if (t <= 0) return 0; const w = Math.sqrt(k), z = d / (2 * w), wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); };
await document.fonts.load('800 60px Display'); await document.fonts.load('600 30px UI');
window.draw = (t, nom, titre) => {
  x.clearRect(0, 0, 1920, 1080);
  const out = outQuint(prog(t, 5.0, 5.45));
  const L = 96, cy = 902, es = 168;
  // emblème
  const ek = spring(t - 0.0) * (1 - out);
  if (ek > 0.01) drawEmblem(x, L + es / 2, cy, es * ek, {});
  const bx = L + es + 18;
  x.font = '800 66px Display'; x.letterSpacing = '0.5px'; const nw = x.measureText(nom).width;
  x.font = '600 30px UI'; x.letterSpacing = '0.3px'; const tw = x.measureText(titre).width;
  const w1 = nw + 64, w2 = tw + 52;
  // barre du nom (nuit) avec filet tricolore
  const k1 = outQuint(prog(t, 0.15, 0.65)) * (1 - out);
  if (k1 > 0) {
    x.save(); x.beginPath(); x.rect(bx, 0, w1 * k1, 1080); x.clip();
    x.globalAlpha = 0.95; x.fillStyle = COL.ink; x.fillRect(bx, cy - 76, w1, 92); x.globalAlpha = 1;
    [COL.green, COL.yellow, COL.red].forEach((col, i) => { x.fillStyle = col; x.fillRect(bx + i * w1 / 3, cy - 76, w1 / 3 + 0.5, 6); });
    const r = outQuint(prog(t, 0.35, 0.8));
    x.beginPath(); x.rect(bx, cy - 70, w1, 86); x.clip();
    x.font = '800 66px Display'; x.letterSpacing = '0.5px'; x.fillStyle = COL.cream; x.fillText(nom, bx + 32, cy - 6 + (1 - r) * 80);
    x.restore();
  }
  // barre de la fonction (or)
  const k2 = outQuint(prog(t, 0.45, 0.9)) * (1 - out);
  if (k2 > 0) {
    x.save(); x.beginPath(); x.rect(bx, 0, w2 * k2, 1080); x.clip();
    x.fillStyle = COL.gold; x.fillRect(bx, cy + 16, w2, 54);
    const r = outQuint(prog(t, 0.6, 1.0));
    x.beginPath(); x.rect(bx, cy + 16, w2, 54); x.clip();
    x.font = '600 30px UI'; x.letterSpacing = '0.3px'; x.fillStyle = COL.ink; x.fillText(titre, bx + 26, cy + 54 + (1 - r) * 50);
    x.restore();
  }
  return c.toDataURL('image/png');
};
window.ready = true;
</script>`);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await pg.goto(`http://127.0.0.1:${port}/tools/_bandeau.html`);
await pg.waitForFunction('window.ready === true');
for (const P of PERSONNES) {
  const dir = path.join(OUT, '_frames_' + P.id);
  fs.mkdirSync(dir, { recursive: true });
  for (let f = 0; f < FPS * DUR; f++) {
    const url = await pg.evaluate(([t, n, ti]) => window.draw(t, n, ti), [f / FPS, P.nom, P.titre]);
    fs.writeFileSync(path.join(dir, String(f).padStart(4, '0') + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  const still = await pg.evaluate(([n, ti]) => window.draw(3, n, ti), [P.nom, P.titre]);
  fs.writeFileSync(path.join(OUT, P.id + '.png'), Buffer.from(still.split(',')[1], 'base64'));
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png'),
    '-c:v', 'png', '-pix_fmt', 'rgba', path.join(OUT, P.id + '.mov')], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg');
  fs.rmSync(dir, { recursive: true });
  console.log(P.id);
}
await b.close(); server.close();
fs.rmSync(path.join(ROOT, 'tools', '_bandeau.html'));
