// Recense les vraies photos déposées dans assets/photos/ et écrit manifest.json pour le film.
//   cd intro-egep/tools && node photos.mjs
// Noms reconnus (jpg, jpeg, png ou webp) :
//   president  ministre  g01 … g20 (galerie, dans l'ordre d'apparition voulu)
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.resolve('../assets/photos');
const KEYS = ['president', 'ministre', ...Array.from({ length: 20 }, (_, i) => 'g' + String(i + 1).padStart(2, '0'))];
const files = fs.readdirSync(DIR);
const manifest = {};
for (const k of KEYS) {
  const f = files.find((n) => new RegExp(`^${k}\\.(jpe?g|png|webp)$`, 'i').test(n));
  if (f) manifest[k] = f;
}
fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(Object.keys(manifest).length ? manifest : 'aucune photo : le film garde les illustrations et les cadres « PHOTO OFFICIELLE »');
