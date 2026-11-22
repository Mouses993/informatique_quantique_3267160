// Aperçu rapide de l'emblème : écrit out/emblem_preview.png
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { emblemSVG } from '../lib/emblem.js';
import fs from 'node:fs';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">${emblemSVG()}</svg>`;
fs.mkdirSync('../out/intro-egep', { recursive: true });
fs.writeFileSync('../out/intro-egep/emblem_preview.svg', svg);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1000, height: 1000 } });
await pg.setContent(`<body style="margin:0;background:#e9e4da">${svg}</body>`);
await pg.screenshot({ path: '../out/intro-egep/emblem_preview.png' });
await b.close();
