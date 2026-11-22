// Recense les vraies photos déposées dans assets/photos/ et écrit manifest.json pour le film.
//   cd intro-egep/tools && node photos.mjs
// Noms reconnus (jpg, jpeg, png ou webp) :
//   aube  epervier  zebus  president  ministre  m1  m2  m3
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.resolve('../assets/photos');
const KEYS = ['aube', 'epervier', 'zebus', 'president', 'ministre', 'm1', 'm2', 'm3'];
const files = fs.readdirSync(DIR);
const manifest = {};
for (const k of KEYS) {
  const f = files.find((n) => new RegExp(`^${k}\\.(jpe?g|png|webp)$`, 'i').test(n));
  if (f) manifest[k] = f;
}
fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(Object.keys(manifest).length ? manifest : 'aucune photo : le film garde les illustrations et les cadres « PHOTO OFFICIELLE »');
