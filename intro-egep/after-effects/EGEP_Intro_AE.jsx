/*  EGEP_Intro_AE.jsx
    Construit le projet After Effects « JT Spécial – États généraux de l'Élevage et de la Pêche ».

    Utilisation : After Effects > Fichier > Scripts > Exécuter le fichier de script… > choisir ce fichier.
    Le dossier « Footage » doit rester à côté du script. Installer d'abord les polices du dossier « Polices ».

    Compositions créées (1920×1080, 25 i/s) :
      01_INTRO_EGEP              intro de 20 s (montage photo, autorités, carton logo, musique)
      02_BANDEAU_Ministre        bandeau d'identification 6 s (fond transparent)
      03_BANDEAU_President
      04_BANDEAU_Modele          à dupliquer pour chaque invité : changer les calques texte NOM et FONCTION,
                                 les barres s'adaptent toutes seules à la longueur du texte.
*/
(function () {
  app.beginUndoGroup('EGEP Intro');

  var ROOT = File($.fileName).parent;
  var FOOT = ROOT.fullName + '/Footage/';
  var W = 1920, H = 1080, FPS = 25, BEAT = 0.5;

  // couleurs (0..1)
  function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
  var INK = hex('#0A1C28'), GOLD = hex('#F4B41A'), CREAM = hex('#F6ECD6'), WATER = hex('#2E6E86');
  var GREEN = hex('#14B53A'), YELLOW = hex('#FCD116'), RED = hex('#CE1126');
  var F_BLACK = 'BarlowCondensed-Black', F_XBOLD = 'BarlowCondensed-ExtraBold', F_BOLD = 'BarlowCondensed-Bold';
  var F_UI = 'Inter-SemiBold', F_UI_M = 'Inter-Medium';

  // ------------------------------------------------------------------ import
  var proj = app.project || app.newProject();
  var bin = proj.items.addFolder('EGEP_Intro');
  var binF = proj.items.addFolder('Footage'); binF.parentFolder = bin;
  function imp(rel) {
    var f = new File(FOOT + rel);
    if (!f.exists) { alert('Fichier manquant : Footage/' + rel); return null; }
    var it = proj.importFile(new ImportOptions(f));
    it.parentFolder = binF;
    return it;
  }
  var PH = {};
  var names = ['g01', 'g02', 'g03', 'g04', 'g05', 'g06', 'g07', 'president', 'ministre'];
  for (var i = 0; i < names.length; i++) PH[names[i]] = imp('Photos/' + names[i] + '.jpg');
  var EMB = imp('Logo/embleme.png');
  var AUDIO = imp('Audio/Intro_JT_EGEP_audio_-23LUFS.wav');
  var REF = imp('Reference/Intro_reference.mp4');

  // ------------------------------------------------------------------ outils
  function ease(prop) {
    var e = new KeyframeEase(0, 75);
    for (var k = 1; k <= prop.numKeys; k++) {
      var dims = prop.value instanceof Array ? prop.value.length : 1;
      if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) dims = 1;
      var arr = []; for (var d = 0; d < dims; d++) arr.push(e);
      try { prop.setTemporalEaseAtKey(k, arr, arr); } catch (err) {}
    }
  }
  function keys(prop, list, doEase) {
    for (var i = 0; i < list.length; i++) prop.setValueAtTime(list[i][0], list[i][1]);
    if (doEase !== false) ease(prop);
  }
  function solid(comp, name, col, t0, t1) {
    var l = comp.layers.addSolid(col, name, W, H, 1);
    l.inPoint = t0; l.outPoint = t1; return l;
  }
  function text(comp, str, font, size, col, x, y, t0, t1, opt) {
    opt = opt || {};
    var l = comp.layers.addText(str);
    var tp = l.property('ADBE Text Properties').property('ADBE Text Document');
    var td = tp.value;
    td.resetCharStyle(); td.resetParagraphStyle();
    td.text = str; td.font = font; td.fontSize = size; td.applyFill = true; td.fillColor = col; td.applyStroke = false;
    td.tracking = opt.tracking || 0;
    td.justification = opt.right ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
    tp.setValue(td);
    l.property('ADBE Transform Group').property('ADBE Position').setValue([x, y]);
    l.inPoint = t0; l.outPoint = t1;
    if (opt.name) l.name = opt.name;
    return l;
  }
  // lettres qui montent une à une (animateur de texte)
  function rise(l, t0, dur, dy) {
    var an = l.property('ADBE Text Properties').property('ADBE Text Animators').addProperty('ADBE Text Animator');
    an.name = 'Montée';
    var pr = an.property('ADBE Text Animator Properties');
    pr.addProperty('ADBE Text Position 3D').setValue([0, dy, 0]);
    pr.addProperty('ADBE Text Opacity').setValue(0);
    var sel = an.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
    keys(sel.property('ADBE Text Percent Offset'), [[t0, 0], [t0 + dur, 100]]);
    return l;
  }
  function rect(contents, name, w, h, x, y, col, op) {
    var g = contents.addProperty('ADBE Vector Group'); g.name = name;
    var v = g.property('ADBE Vectors Group');
    var r = v.addProperty('ADBE Vector Shape - Rect');
    r.property('ADBE Vector Rect Size').setValue([w, h]);
    r.property('ADBE Vector Rect Position').setValue([x + w / 2, y + h / 2]);
    var f = v.addProperty('ADBE Vector Graphic - Fill');
    f.property('ADBE Vector Fill Color').setValue(col);
    if (op !== undefined) f.property('ADBE Vector Fill Opacity').setValue(op);
    return r;
  }
  function tricolor(comp, x, y, w, h, t0, t1, tIn) {
    var l = comp.layers.addShape(); l.name = 'Filet tricolore';
    var c = l.property('ADBE Root Vectors Group');
    rect(c, 'Vert', w / 3 + 0.5, h, 0, 0, GREEN);
    rect(c, 'Or', w / 3 + 0.5, h, w / 3, 0, YELLOW);
    rect(c, 'Rouge', w / 3, h, 2 * w / 3, 0, RED);
    var tr = l.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]);
    tr.property('ADBE Position').setValue([x, y]);
    keys(tr.property('ADBE Scale'), [[tIn, [0, 100]], [tIn + 0.5, [100, 100]]]);
    l.inPoint = t0; l.outPoint = t1;
    return l;
  }
  function vignette(comp, t0, t1) {
    var l = solid(comp, 'Vignette', [0, 0, 0], t0, t1);
    var m = l.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    var s = new Shape(); var k = 0.5523;
    var cx = W / 2, cy = H / 2, rx = W * 0.62, ry = H * 0.7;
    s.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
    s.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
    s.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
    s.closed = true;
    m.property('ADBE Mask Shape').setValue(s);
    m.property('ADBE Mask Feather').setValue([420, 420]);
    m.inverted = true;
    l.property('ADBE Transform Group').property('ADBE Opacity').setValue(55);
    return l;
  }
  function gradientBas(comp, t0, t1) {
    var l = solid(comp, 'Dégradé bas (lisibilité)', INK, t0, t1);
    var m = l.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    var s = new Shape(); s.vertices = [[-200, H * 0.72], [W + 200, H * 0.72], [W + 200, H + 300], [-200, H + 300]]; s.closed = true;
    m.property('ADBE Mask Shape').setValue(s);
    m.property('ADBE Mask Feather').setValue([0, 380]);
    l.property('ADBE Transform Group').property('ADBE Opacity').setValue(80);
    var l2 = solid(comp, 'Dégradé haut (lisibilité)', INK, t0, t1);
    var m2 = l2.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    var s2 = new Shape(); s2.vertices = [[-200, -300], [W + 200, -300], [W + 200, H * 0.3], [-200, H * 0.3]]; s2.closed = true;
    m2.property('ADBE Mask Shape').setValue(s2);
    m2.property('ADBE Mask Feather').setValue([0, 360]);
    l2.property('ADBE Transform Group').property('ADBE Opacity').setValue(70);
  }
  // photo plein cadre : couverture + zoom lent + glissement + petit « punch » à la coupe
  function photoShot(comp, item, t0, t1, idx) {
    var l = comp.layers.add(item);
    l.inPoint = t0; l.outPoint = t1;
    var cov = Math.max(W / item.width, H / item.height) * 100;
    var inward = idx % 2 === 0;
    var z0 = inward ? 1.04 : 1.16, z1 = inward ? 1.16 : 1.04;
    var fx0 = inward ? 0.38 : 0.62, fx1 = inward ? 0.6 : 0.4;
    function px(z, fx) { var dw = item.width * cov / 100 * z; return W / 2 + (W - dw) * (fx - 0.5); }
    var tr = l.property('ADBE Transform Group');
    var tEnd = t1 + 0.25;
    keys(tr.property('ADBE Scale'), [[t0, [cov * z0 * 1.07, cov * z0 * 1.07]], [t0 + 0.25, [cov * z0 * 1.01, cov * z0 * 1.01]], [tEnd, [cov * z1, cov * z1]]], false);
    keys(tr.property('ADBE Position'), [[t0, [px(z0, fx0), H / 2]], [tEnd, [px(z1, fx1), H / 2]]], false);
    // étalonnage chaud léger
    var fx = l.property('ADBE Effect Parade');
    var cb = fx.addProperty('ADBE Tint');
    if (cb) { cb.property(1).setValue([0.04, 0.07, 0.1]); cb.property(2).setValue([1, 0.86, 0.66]); cb.property(3).setValue(14); }
    return l;
  }
  // portrait : fond nuit, cadre ajusté à la photo, dévoilé de bas en haut, filet or
  function portrait(comp, item, t0, t1, side) {
    var bg = solid(comp, 'Fond portrait', INK, t0, t1);
    var glow = comp.layers.addSolid(GOLD, 'Halo', W, H, 1); glow.inPoint = t0; glow.outPoint = t1;
    var gm = glow.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    var gs = new Shape(); var gx = side < 0 ? 520 : W - 520, k = 0.5523, r = 420;
    gs.vertices = [[gx, 540 - r], [gx + r, 540], [gx, 540 + r], [gx - r, 540]];
    gs.inTangents = [[-r * k, 0], [0, -r * k], [r * k, 0], [0, r * k]];
    gs.outTangents = [[r * k, 0], [0, r * k], [-r * k, 0], [0, -r * k]]; gs.closed = true;
    gm.property('ADBE Mask Shape').setValue(gs); gm.property('ADBE Mask Feather').setValue([500, 500]);
    glow.property('ADBE Transform Group').property('ADBE Opacity').setValue(45);
    var ph = 860, sc = ph / item.height * 100, pw = item.width * sc / 100;
    var l = comp.layers.add(item); l.inPoint = t0; l.outPoint = t1; l.name = 'Portrait';
    var tr = l.property('ADBE Transform Group');
    keys(tr.property('ADBE Scale'), [[t0, [sc, sc]], [t1, [sc * 1.05, sc * 1.05]]], false);
    tr.property('ADBE Position').setValue([W / 2, 100 + ph / 2]);
    var m = l.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    var w = item.width, h = item.height;
    function sh(top) { var s = new Shape(); s.vertices = [[0, top], [w, top], [w, h], [0, h]]; s.closed = true; return s; }
    keys(m.property('ADBE Mask Shape'), [[t0, sh(h * 0.35)], [t0 + 0.35, sh(0)]]);
    var bar = comp.layers.addShape(); bar.name = 'Filet or';
    rect(bar.property('ADBE Root Vectors Group'), 'Barre', 14, ph, 0, -ph, GOLD);
    var bt = bar.property('ADBE Transform Group');
    bt.property('ADBE Anchor Point').setValue([0, 0]);
    bt.property('ADBE Position').setValue([side < 0 ? W / 2 + pw / 2 : W / 2 - pw / 2 - 14, 100 + ph]);
    keys(bt.property('ADBE Scale'), [[t0, [100, 0]], [t0 + 0.5, [100, 100]]]);
    bar.inPoint = t0; bar.outPoint = t1;
    return l;
  }

  // ------------------------------------------------------------------ 01 INTRO
  var DUR = 20;
  var comp = proj.items.addComp('01_INTRO_EGEP', W, H, 1, DUR, FPS);
  comp.parentFolder = bin; comp.bgColor = INK;
  // [temps en temps musicaux (1 temps = 0,5 s), plan]
  var SEQ = [[0, 'g05'], [2, 'g02'], [4, 'g03'], [6, 'g04'], [8, 'g01'], [12, 'g06'], [16, 'MIN'],
    [18, 'g07'], [19, 'g04'], [20, 'g03'], [21, 'g05'], [22, 'PRES'],
    [24, 'g01'], [25, 'g06'], [26, 'g02'], [27, 'g07'], [28, 'g05'], [29, 'g04'], [30, 'g03'], [31, 'LOGO']];

  // les calques s'empilent : on construit du dernier plan au premier pour que le premier soit en haut ? Non :
  // chaque plan occupe sa propre plage de temps, l'ordre n'a pas d'importance.
  for (var s = 0; s < SEQ.length; s++) {
    var t0 = SEQ[s][0] * BEAT, t1 = (s + 1 < SEQ.length ? SEQ[s + 1][0] : 40) * BEAT, key = SEQ[s][1];
    if (key === 'LOGO') continue;
    if (key === 'MIN') portrait(comp, PH.ministre, t0, t1, 1);
    else if (key === 'PRES') portrait(comp, PH.president, t0, t1, -1);
    else if (PH[key]) photoShot(comp, PH[key], t0, t1, s);
  }
  gradientBas(comp, 0, 8);
  gradientBas(comp, 8, 16);
  vignette(comp, 0, 15.5);

  // JT SPÉCIAL sur l'ouverture
  var jt = text(comp, 'JT SPÉCIAL', F_BLACK, 230, CREAM, 90, 960, 0, 3.95, { name: 'JT SPÉCIAL (ouverture)', tracking: 10 });
  rise(jt, 0.45, 0.5, 260);
  keys(jt.property('ADBE Transform Group').property('ADBE Position'), [[3.75, [90, 960]], [3.95, [90, 1260]]]);
  tricolor(comp, 96, 990, 900, 14, 0, 3.95, 0.7);
  // PÊCHE / ÉLEVAGE
  rise(text(comp, 'PÊCHE', F_BLACK, 330, CREAM, 90, 1010, 4, 6, { tracking: 10 }), 4, 0.35, 380);
  rise(text(comp, 'ÉLEVAGE', F_BLACK, 300, CREAM, W - 90, 300, 6, 8, { right: true, tracking: 10 }), 6, 0.4, 345);

  // carton logo (15,5 s → 20 s)
  var tL = 15.5;
  solid(comp, 'Fond logo', INK, tL, DUR);
  var halo = comp.layers.addSolid(GOLD, 'Halo logo', W, H, 1); halo.inPoint = 16; halo.outPoint = DUR;
  var hm = halo.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
  var hs = new Shape(), hk = 0.5523, hr = 380, hx = 452, hy = 540;
  hs.vertices = [[hx, hy - hr], [hx + hr, hy], [hx, hy + hr], [hx - hr, hy]];
  hs.inTangents = [[-hr * hk, 0], [0, -hr * hk], [hr * hk, 0], [0, hr * hk]];
  hs.outTangents = [[hr * hk, 0], [0, hr * hk], [-hr * hk, 0], [0, -hr * hk]]; hs.closed = true;
  hm.property('ADBE Mask Shape').setValue(hs); hm.property('ADBE Mask Feather').setValue([420, 420]);
  keys(halo.property('ADBE Transform Group').property('ADBE Opacity'), [[16, 0], [16.8, 25]]);
  var em = comp.layers.add(EMB); em.inPoint = tL; em.outPoint = DUR; em.name = 'Emblème';
  var et = em.property('ADBE Transform Group');
  // gros plan sur la tête du zébu, puis recul jusqu'à la taille finale (600 px)
  keys(et.property('ADBE Anchor Point'), [[tL, [2000, 1820]], [16.95, [2000, 2000]]]);
  keys(et.property('ADBE Position'), [[tL, [W / 2, H / 2]], [16.95, [452, 540]]]);
  keys(et.property('ADBE Scale'), [[tL, [105, 105]], [16.95, [15, 15]]]);
  et.property('ADBE Scale').expression = '// recul en espace logarithmique (vitesse de travelling constante)\n' +
    'if (numKeys > 1 && time > key(1).time && time < key(2).time) {\n' +
    '  var p = easeOut(time, key(1).time, key(2).time, 0, 1);\n' +
    '  var a = key(1).value[0], b = key(2).value[0], s = a * Math.pow(b / a, p); [s, s];\n' +
    '} else value;';
  var tx = 452 + 300 + 80;
  rise(text(comp, 'JT SPÉCIAL', F_BLACK, 230, CREAM, tx, 520, 16.5, DUR, { name: 'JT SPÉCIAL (carton)', tracking: 10 }), 16.55, 0.45, 260);
  tricolor(comp, tx, 548, 900, 14, 16.9, DUR, 16.9);
  rise(text(comp, 'ÉTATS GÉNÉRAUX DE L’ÉLEVAGE ET DE LA PÊCHE', F_BOLD, 60, GOLD, tx, 630, 17, DUR, { tracking: 30 }), 17, 0.5, 70);
  var mali = text(comp, 'MALI · 2026', F_UI, 32, CREAM, tx, 694, 17.3, DUR, { tracking: 320 });
  keys(mali.property('ADBE Transform Group').property('ADBE Opacity'), [[17.3, 0], [17.65, 100]]);

  // son + vidéo de référence (calque guide désactivé, pour comparer)
  var au = comp.layers.add(AUDIO); au.name = 'Musique (-23 LUFS)';
  var rf = comp.layers.add(REF); rf.name = 'RÉFÉRENCE (rendu original)'; rf.enabled = false; rf.guideLayer = true; rf.moveToBeginning();
  try { rf.audioEnabled = false; } catch (e) {}

  // ------------------------------------------------------------------ BANDEAUX
  function bandeau(name, nom, titre) {
    var c = proj.items.addComp(name, W, H, 1, 6, FPS);
    c.parentFolder = bin;
    var L = 96, cy = 902, es = 168, bx = L + es + 18;
    // barre fonction (or), taille liée au texte FONCTION
    var b2 = c.layers.addShape(); b2.name = 'Barre FONCTION';
    var r2 = rect(b2.property('ADBE Root Vectors Group'), 'Barre', 600, 54, 0, 0, GOLD);
    r2.property('ADBE Vector Rect Size').expression = 'var r = thisComp.layer("FONCTION").sourceRectAtTime(time, false); [r.width + 52, 54]';
    r2.property('ADBE Vector Rect Position').expression = 'var r = thisComp.layer("FONCTION").sourceRectAtTime(time, false); [(r.width + 52) / 2, 27]';
    var t2 = b2.property('ADBE Transform Group');
    t2.property('ADBE Anchor Point').setValue([0, 0]); t2.property('ADBE Position').setValue([bx, cy + 16]);
    keys(t2.property('ADBE Scale'), [[0.45, [0, 100]], [0.9, [100, 100]], [5.0, [100, 100]], [5.45, [0, 100]]]);
    // barre nom (nuit) + filet tricolore
    var b1 = c.layers.addShape(); b1.name = 'Barre NOM';
    var g = b1.property('ADBE Root Vectors Group');
    var r1 = rect(g, 'Barre', 600, 92, 0, 0, INK, 95);
    r1.property('ADBE Vector Rect Size').expression = 'var r = thisComp.layer("NOM").sourceRectAtTime(time, false); [r.width + 64, 92]';
    r1.property('ADBE Vector Rect Position').expression = 'var r = thisComp.layer("NOM").sourceRectAtTime(time, false); [(r.width + 64) / 2, 46]';
    var cols = [GREEN, YELLOW, RED];
    for (var i = 0; i < 3; i++) {
      var ri = rect(g, 'Filet ' + (i + 1), 100, 6, 0, 0, cols[i]);
      ri.property('ADBE Vector Rect Size').expression = 'var w = (thisComp.layer("NOM").sourceRectAtTime(time, false).width + 64) / 3; [w + 0.5, 6]';
      ri.property('ADBE Vector Rect Position').expression = 'var w = (thisComp.layer("NOM").sourceRectAtTime(time, false).width + 64) / 3; [w * ' + i + ' + w / 2, 3]';
    }
    var t1 = b1.property('ADBE Transform Group');
    t1.property('ADBE Anchor Point').setValue([0, 0]); t1.property('ADBE Position').setValue([bx, cy - 76]);
    keys(t1.property('ADBE Scale'), [[0.15, [0, 100]], [0.65, [100, 100]], [5.0, [100, 100]], [5.4, [0, 100]]]);
    // textes (masqués par leur barre : cache alpha)
    var nT = text(c, nom, F_XBOLD, 66, CREAM, bx + 32, cy - 6, 0, 6, { name: 'NOM', tracking: 8 });
    rise(nT, 0.35, 0.45, 80);
    var fT = text(c, titre, F_UI, 30, INK, bx + 26, cy + 54, 0, 6, { name: 'FONCTION', tracking: 10 });
    rise(fT, 0.6, 0.4, 50);
    keys(nT.property('ADBE Transform Group').property('ADBE Opacity'), [[4.95, 100], [5.2, 0]]);
    keys(fT.property('ADBE Transform Group').property('ADBE Opacity'), [[4.95, 100], [5.2, 0]]);
    // emblème
    var e = c.layers.add(EMB); e.name = 'Emblème';
    var et2 = e.property('ADBE Transform Group');
    et2.property('ADBE Position').setValue([L + es / 2, cy]);
    var es100 = es / EMB.width * 100;
    keys(et2.property('ADBE Scale'), [[0, [0, 0]], [0.35, [es100 * 1.08, es100 * 1.08]], [0.55, [es100, es100]], [5.0, [es100, es100]], [5.45, [0, 0]]]);
    e.moveToEnd(); b2.moveToEnd(); b1.moveToEnd();
    nT.moveToBeginning(); fT.moveToBeginning();
    return c;
  }
  bandeau('02_BANDEAU_Ministre', 'Youba BA', 'Ministre de l’Élevage et de la Pêche');
  bandeau('03_BANDEAU_President', 'Général d’Armée Assimi GOÏTA', 'Président de la Transition, Chef de l’État');
  bandeau('04_BANDEAU_Modele', 'Prénom NOM', 'Fonction / Structure');

  comp.openInViewer();
  app.endUndoGroup();
  alert('Projet EGEP construit.\n\n01_INTRO_EGEP : intro 20 s\n02 à 04 : bandeaux d’identification (fond transparent)\n\nSi les polices apparaissent en rouge, installer le dossier « Polices » puis relancer.');
})();
