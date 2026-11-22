# Intro JT Spécial : États généraux de l'Élevage et de la Pêche

Intro de 20 s · 1920×1080 · 25 i/s progressif · 16:9 · musique et bruitages synthétisés (aucun échantillon tiers).

## Livrables (`livraison/`)

| Fichier | Usage |
|---|---|
| `Intro_JT_EGEP_1080p25_broadcast_-23LUFS.mp4` | **Diffusion** : H.264 High 4.2, BT.709, ~8,6 Mb/s, AAC 48 kHz, -23 LUFS / -1 dBTP (EBU R128) |
| `Intro_JT_EGEP_1080p25_web_-14LUFS.mp4` | Réseaux sociaux / web, -14 LUFS |
| `Intro_JT_EGEP_audio_-23LUFS.wav` | Bande son seule, 48 kHz 24 bits, pour le montage |
| `Intro_JT_EGEP_poster.png` | Image de fin (carton logo) |

## Logo (`logo/`)

Emblème : le soleil se lève sur le Niger entre les cornes en lyre d'un zébu (l'élevage) ;
sous l'horizon, le fleuve et un capitaine qui saute (la pêche). Filet tricolore vert-or-rouge sous le titre.

- `embleme.svg/.png` : l'emblème seul
- `logo-horizontal_fond-sombre` / `_fond-clair` (SVG + PNG transparent 4000 px)
- `logo-vertical_fond-sombre` / `_fond-clair`
- `planche-logo.png` : planche de présentation

Les SVG sont vectorisés (textes convertis en tracés) : ils s'ouvrent dans Illustrator / After Effects sans les polices.
Couleurs : nuit `#0A1C28`, or `#F4B41A`, crème `#F6ECD6`, eau `#2E6E86`, drapeau `#14B53A` `#FCD116` `#CE1126`.
Polices : Barlow Condensed (titres), Inter (textes), toutes deux sous licence SIL OFL.

## Découpage

| Temps | Plan | Texte |
|---|---|---|
| 0–3 s | Aube sur le Niger, pirogue poussée à la perche, mosquée en banco sur la rive | JT SPÉCIAL |
| 3–5,5 s | Pêcheur qui lance l'épervier devant le soleil | PÊCHE |
| 5,5–8 s | Traversée des zébus, bouvier au chapeau peul | ÉLEVAGE |
| 8–11 s | **Portrait du Président** | Général d'Armée ASSIMI GOÏTA · Président de la Transition, Chef de l'État |
| 11–14 s | **Portrait du Ministre** | YOUBA BA · Ministre de l'Élevage et de la Pêche |
| 14–16 s | Montage rapide (filet, poisson, pirogues) | OUVERTURE · LUNDI 23 NOVEMBRE 2026 |
| 16–20 s | L'emblème se construit, titre, tenue | ÉTATS GÉNÉRAUX DE L'ÉLEVAGE ET DE LA PÊCHE · JT SPÉCIAL |

## Remplacer les illustrations par de vraies images

Les plans de pêche et d'élevage sont des illustrations en silhouettes. Les portraits officiels sont des
**cadres vides « PHOTO OFFICIELLE »**, à remplir avant diffusion.

1. Déposer les images dans `assets/photos/` avec ces noms (jpg, png ou webp) :
   - `president.jpg`, `ministre.jpg` : portraits officiels, cadrage vertical 3:4 (visage dans le tiers haut)
   - `aube.jpg`, `epervier.jpg`, `zebus.jpg` : plans larges 16:9 qui remplacent les plans 1 à 3
   - `m1.jpg`, `m2.jpg`, `m3.jpg` : les trois coupes rapides du montage (14 à 15,5 s)
2. `cd tools && node photos.mjs` (met à jour `assets/photos/manifest.json`)
3. Re-rendre (depuis le dossier parent de `intro-egep/`) :
   ```
   node <skill>/scripts/render.mjs --film intro-egep --video-only --fps 25
   node <skill>/scripts/mix.mjs intro-egep
   ```
   Les photos reçoivent automatiquement un étalonnage chaud, une poussée lente et un dégradé bas pour la lisibilité.

Les textes (noms, titres, date) se modifient en haut de `film.js` (objet `TXT`).

## Sources

- `film.js` : le film (fonction pure du temps) · `lib/emblem.js` : géométrie de l'emblème, partagée film + logo
- `audio/score.py` : la musique (kora, djembé, cordes, 120 BPM, ré mineur) · `beats.json` : grille mesurée
- `tools/build_logo.mjs` : génère `logo/` · `docs/shotlist.md`, `docs/critique.md`
