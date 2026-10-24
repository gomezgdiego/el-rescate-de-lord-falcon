// robovill.js — PROTOTIPO Parte 3: ROBOVILL, el nuevo villano ("Taladro con alas").
// Diseño de Juanjo: un robot ENORME con un TALADRO GIGANTE (para ir bajo tierra),
// ALAS DE METAL (para volar) y la GEMA COPIA (copia de máquina de la Gema del Poder,
// con circuitos dorados por dentro). Familia del ejército robot (acero + rojo, ojo-luz)
// con su propio acento: la gema carmesí/morada y los CIRCUITOS DORADOS que brillan.
//
// Exporta (todas con c.save()/c.restore() y sin lanzar excepciones):
//   P2.fn.robovill(c, x, piesY, {variant:'A'|'B', scale, facing,
//                  brazo:'martillo'|'sierra'|'canon'|'pinza', alas:'abiertas'|'cerradas', taladro:0..1})
//       (x, piesY) = centro de los pies (en la variante B, la punta del taladro).
//       Mide ~290 px de alto (con el taladro) a escala 1 (Dark Secuaz mide ~190).
//       A escala de juego se usa a 0,93: ~270 px (rango pedido 240-280).
//   P2.fn.robovillBrazo(c, x, y, {tipo, scale, facing, giro})   (x, y) = muñeca; apunta hacia delante
//   P2.fn.gemaCopia(c, x, y, {scale})       (x, y) = centro de la gema
//   P2.fn.miniRobot(c, x, y, {scale, facing, cayendo})   (x, y) = centro (vuela con hélice)
(function () {
  'use strict';
  var O = P2.OUTLINE || '#1a1a2e';
  var E = P2.PAL.enemy;
  var GA = (P2.PAL.gem && P2.PAL.gem.A) || '#e11d48', GB = (P2.PAL.gem && P2.PAL.gem.B) || '#a21caf';
  var CIR = '#facc15', CIR_L = '#fef9c3';           // circuitos dorados: el acento de Robovill
  var SILVER = '#e2e8f0', SILVER_D = '#94a3b8';
  var TAU = Math.PI * 2;

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  // Envuelve una función de dibujo: save/restore y nunca lanza.
  function safe(fn) {
    return function (c, x, y, o) {
      if (!c || !c.save) return;
      c.save();
      try { fn(c, num(x, 0), num(y, 0), o || {}); }
      catch (e) { if (window.console && console.warn) console.warn('[robovill]', e); }
      c.restore();
    };
  }
  // Brazo/pierna gruesa: contorno + relleno con puntas redondas
  function limb(c, x1, y1, x2, y2, w, col) {
    P2.line(c, x1, y1, x2, y2, O, w + 6);
    P2.line(c, x1, y1, x2, y2, col, w);
  }
  // Pista de circuito dorado que brilla (polilínea + puntitos)
  function circuit(c, pts, w) {
    w = w || 3;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    [[O, w + 3, 1], [CIR, w + 5, 0.35], [CIR, w, 1], [CIR_L, w * 0.4, 1]].forEach(function (p, i) {
      if (i === 1) return;   // (el halo se pinta después)
      c.globalAlpha = p[2]; c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]);
      c.stroke();
    });
    var e = pts[pts.length - 1];
    P2.circ(c, e[0], e[1], w + 1.6, CIR, O, 1.5);
    P2.circ(c, e[0], e[1], w * 0.5, CIR_L, null);
    c.restore();
  }
  function bolt(c, x, y, r) { P2.circ(c, x, y, r || 2.4, '#cbd5e1', O, 1.4); }

  // ---------------------------------------------------------------------
  //  TALADRO: base en (x, y), apunta en la dirección "arriba" girada ang.
  //  Plateado con bandas rojas en espiral (spin 0..1 = giro).
  // ---------------------------------------------------------------------
  function drill(c, x, y, ang, len, w, spin) {
    c.save(); c.translate(x, y); c.rotate(ang);
    var n = 5, step = (len - 8) / n, sp = ((spin % 1) + 1) % 1;
    function hw(yy) { return (w / 2) * (1 + yy / len); }      // media anchura a la altura yy (yy <= 0)
    // silueta de rosca: dientes en escalera, desfasados a cada lado
    var pts = [[-w / 2, 0], [w / 2, 0]], j, yA, yB;
    for (j = 0; j < n; j++) {
      yA = -j * step - 2; yB = -(j + 0.7) * step - 2;
      pts.push([hw(yA) + 2, yA - 2]); pts.push([hw(yB) + 6, yB]); pts.push([hw(yB) - 1, yB - 2]);
    }
    pts.push([2, -len + 3]); pts.push([0, -len]); pts.push([-2, -len + 3]);
    for (j = n - 1; j >= 0; j--) {
      yA = -(j + 0.35) * step - 2; yB = -(j + 1.05) * step - 2;
      pts.push([-hw(yB) + 1, yB - 2]); pts.push([-hw(yB) - 6, yB]); pts.push([-hw(yA) - 2, yA]);
    }
    var g = c.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, '#94a3b8'); g.addColorStop(0.4, '#f8fafc'); g.addColorStop(1, '#64748b');
    P2.poly(c, pts, g, null);
    c.save();
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); c.clip();
    // estrías en espiral (giran con spin)
    for (var b = -2; b <= n + 1; b++) {
      var h = (b + sp) * step;
      c.strokeStyle = O; c.lineWidth = 3; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(-w / 2 - 8, -h + step * 0.45); c.lineTo(w / 2 + 8, -h - step * 0.45); c.stroke();
      c.strokeStyle = 'rgba(51,65,85,0.55)'; c.lineWidth = step * 0.34;
      c.beginPath(); c.moveTo(-w / 2 - 8, -h + step * 0.45 - step * 0.2); c.lineTo(w / 2 + 8, -h - step * 0.45 - step * 0.2); c.stroke();
    }
    c.globalAlpha = 0.6; c.strokeStyle = '#ffffff'; c.lineWidth = 3.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-w * 0.16, -8); c.lineTo(-w * 0.03, -len + 16); c.stroke();
    c.restore();
    P2.poly(c, pts, null, O, 3);
    // punta roja brillante
    P2.poly(c, [[-5, -len + 12], [5, -len + 12], [0, -len]], E.RED_L, O, 2);
    // collar
    P2.rf(c, -w / 2 - 6, -7, w + 12, 15, 6, E.RED, O, 3);
    for (var q = 0; q < 4; q++) bolt(c, -w / 2 + 2 + q * (w - 4) / 3, 0.5, 2.2);
    c.restore();
  }

  // ---------------------------------------------------------------------
  //  BRAZOS CAMBIANTES. Origen = muñeca; la herramienta apunta a +x.
  // ---------------------------------------------------------------------
  function tool(c, tipo, spin) {
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (tipo === 'sierra') {
      P2.rf(c, -2, -9, 22, 18, 6, E.STEEL_DD, O, 2.5);
      var cx = 36, R = 27, nT = 14, a0 = (spin || 0) * TAU / nT;
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#ffffff'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(cx, 0, R + 9, -1.2, -0.3); c.stroke();
      c.beginPath(); c.arc(cx, 0, R + 9, 1.9, 2.8); c.stroke(); c.restore();
      var pts = [];
      for (var i = 0; i < nT * 2; i++) {
        var a = a0 + i * Math.PI / nT, r = (i % 2) ? R - 5 : R + 3;
        pts.push([cx + Math.cos(a) * r, Math.sin(a) * r]);
      }
      P2.poly(c, pts, SILVER, O, 2.5);
      P2.circ(c, cx, 0, R - 9, SILVER_D, O, 2);
      P2.circ(c, cx, 0, 9, E.RED_L, O, 2.5);
      bolt(c, cx, 0, 3);
      P2.circ(c, cx - 7, -10, 3, 'rgba(255,255,255,0.7)', null);
    } else if (tipo === 'canon') {
      P2.rf(c, -2, -15, 24, 30, 9, E.STEEL_DD, O, 2.5);
      P2.rf(c, 16, -12, 44, 24, 9, E.STEEL_D, O, 3);
      P2.rf(c, 22, -9, 26, 5, 2.5, 'rgba(255,255,255,0.25)', null);
      P2.rf(c, 46, -16, 11, 32, 4, E.RED, O, 2.5);
      P2.elli(c, 60, 0, 5, 10, '#0b1020', O, 2);
      c.save(); c.globalAlpha = 0.35; P2.circ(c, 70, 0, 15, '#fb7185', null); c.restore();
      P2.circ(c, 70, 0, 8, E.RED_L, O, 2);
      P2.circ(c, 68, -2, 3, '#fecaca', null);
    } else if (tipo === 'pinza') {
      P2.rf(c, -2, -13, 24, 26, 8, E.STEEL_DD, O, 2.5);
      // pinza de arriba
      c.save(); c.translate(22, -4); c.rotate(-0.35);
      P2.poly(c, [[0, -6], [24, -12], [44, -4], [52, 8], [40, 4], [26, 2], [0, 6]], E.STEEL, O, 2.5);
      P2.poly(c, [[40, 4], [52, 8], [44, -4], [36, -6]], E.RED_L, O, 2);
      c.restore();
      // pinza de abajo
      c.save(); c.translate(22, 4); c.rotate(0.35);
      P2.poly(c, [[0, 6], [24, 12], [44, 4], [52, -8], [40, -4], [26, -2], [0, -6]], E.STEEL_D, O, 2.5);
      P2.poly(c, [[40, -4], [52, -8], [44, 4], [36, 6]], E.RED_L, O, 2);
      c.restore();
      P2.circ(c, 22, 0, 9, E.RED, O, 2.5);
      bolt(c, 22, 0, 3);
    } else { // martillo
      P2.rf(c, -2, -7, 30, 14, 5, E.STEEL_DD, O, 2.5);
      P2.rf(c, 22, -32, 36, 64, 12, E.STEEL, O, 3);
      P2.rf(c, 22, -32, 36, 14, 7, E.RED, O, 2.5);
      P2.rf(c, 22, 18, 36, 14, 7, E.RED, O, 2.5);
      P2.rf(c, 52, -22, 10, 44, 4, E.STEEL_D, O, 2.5);
      P2.rf(c, 27, -16, 6, 30, 3, 'rgba(255,255,255,0.3)', null);
      bolt(c, 40, -25); bolt(c, 40, 25);
    }
  }
  P2.fn.robovillBrazo = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = o.facing === -1 ? -1 : 1;
    c.translate(x, y); c.scale(s * f, s);
    tool(c, o.tipo || 'martillo', num(o.giro, 0));
  });

  // ---------------------------------------------------------------------
  //  GEMA COPIA: misma forma que la Gema del Poder pero de máquina:
  //  marco de acero con tornillos, chip en el centro y circuitos dorados.
  // ---------------------------------------------------------------------
  var GEM_PTS = [[0, -16], [11, -6], [8, 13], [-8, 13], [-11, -6]];
  function scalePts(p, k) { return p.map(function (q) { return [q[0] * k, q[1] * k + (k - 1) * 1.2]; }); }
  P2.fn.gemaCopia = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), t = num(o.t, P2.T);
    c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
    // halo
    c.save(); c.globalAlpha = 0.45;
    var rg = c.createRadialGradient(0, 0, 2, 0, 0, 30);
    rg.addColorStop(0, 'rgba(250,204,21,0.9)'); rg.addColorStop(0.5, 'rgba(225,29,72,0.45)'); rg.addColorStop(1, 'rgba(162,28,175,0)');
    c.fillStyle = rg; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill(); c.restore();
    // marco de acero
    var fr = scalePts(GEM_PTS, 1.24);
    P2.poly(c, fr, E.STEEL_D, O, 2.2);
    fr.forEach(function (p) { P2.circ(c, p[0] * 0.91, p[1] * 0.91, 1.4, '#cbd5e1', O, 0.8); });
    // cuerpo: MISMA forma y MISMAS facetas que la Gema del Poder
    var g = c.createLinearGradient(-10, -16, 10, 13);
    g.addColorStop(0, GA); g.addColorStop(1, GB);
    P2.poly(c, GEM_PTS, g, '#4c0519', 2);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.moveTo(0, -16); c.lineTo(11, -6); c.lineTo(0, -4); c.closePath(); c.fill();
    c.fillStyle = 'rgba(60,0,40,0.2)';
    c.beginPath(); c.moveTo(0, -4); c.lineTo(8, 13); c.lineTo(-8, 13); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-11, -6); c.lineTo(0, -4); c.lineTo(11, -6); c.moveTo(0, -4); c.lineTo(0, 13); c.moveTo(0, -16); c.lineTo(0, -4); c.stroke();
    // circuitos por dentro
    c.save();
    c.beginPath(); c.moveTo(GEM_PTS[0][0], GEM_PTS[0][1]);
    for (var i = 1; i < GEM_PTS.length; i++) c.lineTo(GEM_PTS[i][0], GEM_PTS[i][1]);
    c.closePath(); c.clip();
    var tr = [[[0, -1], [0, -9], [3, -12]], [[0, -1], [-6, -1], [-8, -5]], [[0, -1], [6, -1], [7, 4]], [[0, -1], [0, 5], [-4, 9]], [[0, 5], [4, 9]]];
    var glow = 0.75 + 0.25 * Math.sin(t * 5);
    c.globalAlpha = 0.45 * glow; c.strokeStyle = CIR; c.lineWidth = 3.6; c.lineCap = 'round'; c.lineJoin = 'round';
    tr.forEach(function (p) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (var k = 1; k < p.length; k++) c.lineTo(p[k][0], p[k][1]); c.stroke(); });
    c.globalAlpha = 1; c.strokeStyle = CIR_L; c.lineWidth = 1.3;
    tr.forEach(function (p) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (var k = 1; k < p.length; k++) c.lineTo(p[k][0], p[k][1]); c.stroke(); });
    tr.forEach(function (p) { var e = p[p.length - 1]; P2.circ(c, e[0], e[1], 1.3, CIR, null); });
    c.restore();
    P2.poly(c, GEM_PTS, null, '#4c0519', 2);
    // chip central
    P2.rf(c, -3.5, -4.5, 7, 7, 1.5, '#1e293b', O, 1.2);
    P2.circ(c, 0, -1, 1.6, CIR_L, null);
    // brillito
    P2.poly(c, [[-4, -11], [-1.5, -11], [-5, -6]], 'rgba(255,255,255,0.8)', null);
  });

  // ---------------------------------------------------------------------
  //  MINI-ROBOT de la lluvia: bolita de acero con hélice y ojo-luz.
  // ---------------------------------------------------------------------
  P2.fn.miniRobot = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = o.facing === -1 ? -1 : 1, t = num(o.t, P2.T);
    c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';
    // patitas colgando
    P2.line(c, -5, 9, -7, 16, O, 4.5); P2.line(c, -5, 9, -7, 16, E.STEEL_DD, 2);
    P2.line(c, 5, 9, 6, 16, O, 4.5); P2.line(c, 5, 9, 6, 16, E.STEEL_DD, 2);
    P2.rf(c, -10, 14, 6, 4, 2, E.DARK, O, 1.5); P2.rf(c, 3, 14, 7, 4, 2, E.DARK, O, 1.5);
    // aleta trasera
    P2.poly(c, [[-9, -3], [-17, -8], [-15, 3], [-9, 4]], E.RED, O, 2);
    // hélice
    P2.line(c, 0, -11, 0, -17, O, 3);
    var w = 9 + 3 * Math.sin(t * 20 + x * 0.1);
    P2.elli(c, 0, -18, w, 2.6, '#cbd5e1', O, 1.8);
    P2.circ(c, 0, -18, 2, E.RED_L, O, 1.2);
    // cuerpo
    P2.circ(c, 0, 0, 11, E.STEEL, O, 2.5);
    c.save(); c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.clip();
    c.fillStyle = E.STEEL_D; c.fillRect(-12, 3, 24, 10);
    c.fillStyle = E.RED; c.fillRect(-12, 1, 24, 3);
    c.restore();
    P2.circ(c, 0, 0, 11, null, O, 2.5);
    // ojo-luz y ceja enfadada (pero mona)
    P2.eyeLight(c, 4, -3, 3.6, E.EYE);
    P2.line(c, -1, -9, 8, -7, O, 2.2);
    // punto de circuito dorado
    P2.circ(c, -5, 6, 1.6, CIR, null);
  });

  // ---------------------------------------------------------------------
  //  ALAS
  // ---------------------------------------------------------------------
  // Variante A: alas de PLUMAS DE METAL (placas de acero con punta roja)
  //   Forma de ala de verdad: un HUESO de acero (borde de ataque) que sale del hombro
  //   hacia atrás y arriba, con PLUMAS DE METAL colgando debajo en escalera
  //   (cortas junto al cuerpo, largas en la punta). Abiertas = envergadura enorme;
  //   cerradas = plegadas sobre la espalda pero asomando por encima del hombro.
  function wingsA(c, ax, ay, open, far) {
    // borde de ataque: curva hombro (0,0) -> codo -> punta (hacia atrás = -x)
    var C = open ? [-32, -92] : [-6, -60], T = open ? [-118, -72] : [-30, -96];
    var nF = open ? 6 : 4;
    var body = far ? E.STEEL_DD : E.STEEL, body2 = far ? '#334155' : E.STEEL_D, tip = far ? E.RED : E.RED_L;
    function P(u) { var a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; return [b * C[0] + d * T[0], b * C[1] + d * T[1]]; }
    c.save(); c.translate(ax, ay);
    if (far) { c.rotate(open ? 0.38 : 0.22); c.scale(0.92, 0.92); }
    // plumas en escalera (de la raíz a la punta: la de la punta queda encima)
    for (var i = 0; i < nF; i++) {
      var u = 0.22 + 0.78 * i / (nF - 1), q = P(u);
      var fl = open ? 40 + 13 * i : 30 + 8 * i;               // más largas hacia la punta
      var fa = open ? 1.62 + 0.13 * i : 1.7 + 0.08 * i;       // cuelgan hacia abajo y un poco atrás
      c.save(); c.translate(q[0], q[1]); c.rotate(fa);
      c.beginPath(); c.moveTo(-4, -14); c.lineTo(fl - 18, -14);
      c.quadraticCurveTo(fl + 2, -14, fl + 6, 0); c.quadraticCurveTo(fl + 2, 14, fl - 18, 14);
      c.lineTo(-4, 14); c.closePath();
      c.fillStyle = i % 2 ? body2 : body; c.fill();
      c.save(); c.clip(); c.fillStyle = tip; c.fillRect(fl - 10, -16, 20, 32);
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(0, -11, fl - 14, 5); c.restore();
      c.strokeStyle = O; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
      P2.line(c, fl - 10, -13, fl - 10, 13, O, 2);
      c.restore();
    }
    // hueso del ala (borde de ataque) con garra roja en la punta
    c.lineCap = 'round'; c.lineJoin = 'round';
    [[O, 19], [far ? '#334155' : E.STEEL_D, 13]].forEach(function (st) {
      c.strokeStyle = st[0]; c.lineWidth = st[1];
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(C[0], C[1], T[0], T[1]); c.stroke();
    });
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-2, -5); c.quadraticCurveTo(C[0], C[1] - 5, T[0] + 8, T[1] - 5); c.stroke();
    var ta = Math.atan2(T[1] - C[1], T[0] - C[0]);
    c.save(); c.translate(T[0], T[1]); c.rotate(ta);
    P2.poly(c, [[-4, -9], [20, 0], [-4, 9]], tip, O, 2.5);
    c.restore();
    var m = P(0.5); P2.circ(c, m[0], m[1], 6.5, tip, O, 2);
    P2.circ(c, 0, 0, 13, tip, O, 3);
    bolt(c, 0, 0, 4);
    c.restore();
  }
  // Variante B: alas de MURCIÉLAGO DE METAL (varillas + paneles rojos)
  function wingsB(c, ax, ay, open, far, k) {
    var ang = open ? [-2.15, -2.55, -2.98] : [-2.2, -2.42, -2.62];
    var len = open ? [104, 120, 100] : [95, 88, 80];
    var memA = far ? '#b91c1c' : '#ef4444', memB = far ? '#991b1b' : '#f87171';
    var rib = far ? E.DARK : E.STEEL_DD;
    c.save(); c.translate(ax, ay); if (k) c.scale(-k, k);
    var tips = ang.map(function (a, i) { return [Math.cos(a) * len[i], Math.sin(a) * len[i]]; });
    // paneles (membrana con borde ondulado)
    for (var i = 0; i < tips.length; i++) {
      var p1 = tips[i], p0 = i === 0 ? [Math.cos(ang[0] + 0.7) * 34, Math.sin(ang[0] + 0.7) * 34] : tips[i - 1];
      var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(p0[0], p0[1]);
      c.quadraticCurveTo(mx * 0.62, my * 0.62, p1[0], p1[1]); c.closePath();
      c.fillStyle = i % 2 ? memB : memA; c.fill();
      c.strokeStyle = O; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
      // remaches de los paneles
      bolt(c, mx * 0.5, my * 0.5, 2);
    }
    // varillas
    tips.forEach(function (p) {
      limb(c, 0, 0, p[0], p[1], 7, rib);
      P2.circ(c, p[0], p[1], 6, far ? E.RED : E.RED_L, O, 2.5);
    });
    P2.circ(c, 0, 0, 14, far ? E.RED : E.RED_L, O, 3);
    bolt(c, 0, 0, 4);
    c.restore();
  }

  // ---------------------------------------------------------------------
  //  ROBOVILL A — "Taladro-casco": el taladro sale de la cabeza como un cuerno
  // ---------------------------------------------------------------------
  function drawA(c, o) {
    var open = o.alas !== 'cerradas', spin = num(o.taladro, 0.3), brazo = o.brazo || 'martillo';
    P2.elli(c, 0, -2, 84, 12, 'rgba(0,0,0,0.25)', null);
    // alas (detrás de todo)
    wingsA(c, -26, -164, open, true);
    wingsA(c, -46, -152, open, false);
    // escapes de la espalda
    P2.rf(c, -88, -160, 22, 46, 8, E.STEEL_DD, O, 3);
    P2.rf(c, -92, -122, 30, 12, 5, E.RED, O, 2.5);
    // brazo trasero
    limb(c, -40, -136, -64, -94, 18, E.STEEL_DD);
    P2.rf(c, -84, -100, 34, 32, 11, E.STEEL_DD, O, 3);
    P2.rf(c, -84, -100, 12, 32, 6, E.RED, O, 2);
    // piernas
    P2.rf(c, -40, -64, 34, 52, 10, E.STEEL_DD, O, 3);
    P2.rf(c, -50, -20, 54, 20, 9, E.DARK, O, 3);
    P2.rf(c, 4, -64, 36, 52, 10, E.STEEL_D, O, 3);
    bolt(c, 22, -42, 3.5);
    P2.rf(c, -2, -20, 60, 20, 9, E.DARK, O, 3);
    P2.rf(c, 40, -20, 18, 20, 8, E.RED_L, O, 2.5);
    // cadera
    P2.rf(c, -54, -76, 108, 22, 10, E.STEEL_DD, O, 3);
    // torso rechoncho
    P2.rf(c, -74, -176, 148, 116, 38, E.STEEL, O, 3);
    P2.rf(c, -60, -168, 96, 18, 9, 'rgba(255,255,255,0.14)', null);
    P2.rf(c, -48, -138, 96, 62, 18, E.STEEL_D, O, 2.5);
    P2.rf(c, -74, -92, 148, 12, 6, E.RED, O, 2.5);
    // circuitos dorados que salen de la gema
    circuit(c, [[14, -108], [-14, -108], [-14, -128], [-36, -128]], 3);
    circuit(c, [[14, -108], [14, -84], [-30, -84]], 2.5);
    circuit(c, [[14, -108], [36, -108], [36, -150], [54, -150]], 3);
    P2.fn.gemaCopia(c, 14, -110, { scale: 1.2 });
    // cuello + cabeza
    P2.rf(c, -20, -190, 40, 20, 6, E.STEEL_DD, O, 3);
    P2.rf(c, -46, -232, 96, 58, 22, E.STEEL, O, 3);
    P2.rf(c, -38, -228, 58, 10, 5, 'rgba(255,255,255,0.16)', null);
    // oreja-tornillo
    P2.circ(c, -22, -204, 11, E.STEEL_D, O, 2.5);
    P2.circ(c, -22, -204, 4.5, E.RED_L, O, 1.8);
    // visor + ojo-luz
    P2.rf(c, 6, -222, 46, 28, 13, E.DARK, O, 2.5);
    P2.eyeLight(c, 32, -208, 9.5, E.EYE);
    // ceja de malo (pero simpático)
    P2.poly(c, [[6, -230], [50, -224], [50, -217], [10, -222]], E.RED, O, 2);
    // boca-rejilla con sonrisa pícara
    c.beginPath(); c.moveTo(16, -192); c.quadraticCurveTo(34, -180, 50, -194); c.lineTo(48, -186);
    c.quadraticCurveTo(34, -172, 18, -186); c.closePath();
    c.fillStyle = '#0b1020'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    P2.line(c, 26, -189, 26, -181, '#e2e8f0', 2); P2.line(c, 34, -186, 34, -178, '#e2e8f0', 2); P2.line(c, 42, -189, 42, -182, '#e2e8f0', 2);
    // TALADRO-CASCO (cuerno gigante, inclinado hacia delante)
    drill(c, -6, -220, 0.72, 92, 68, spin);
    // brazo delantero (cambiante)
    P2.circ(c, 56, -144, 20, E.RED, O, 3);
    bolt(c, 56, -144, 4);
    limb(c, 60, -136, 82, -104, 20, E.STEEL_D);
    P2.circ(c, 82, -104, 12, E.STEEL_DD, O, 2.5);
    limb(c, 84, -104, 106, -104, 22, E.STEEL);
    P2.rf(c, 104, -118, 12, 28, 4, E.RED, O, 2.5);
    c.save(); c.translate(114, -104); tool(c, brazo, spin); c.restore();
  }

  // ---------------------------------------------------------------------
  //  ROBOVILL B — "Peonza-taladro": el taladro es la parte de abajo del cuerpo
  // ---------------------------------------------------------------------
  function drawB(c, o) {
    var open = o.alas !== 'cerradas', spin = num(o.taladro, 0.3), brazo = o.brazo || 'pinza';
    P2.elli(c, 0, -2, 46, 8, 'rgba(0,0,0,0.25)', null);
    // alas
    wingsB(c, 26, -214, open, true, 0.78);   // la otra ala asoma por la derecha
    wingsB(c, -50, -196, open, false);
    // propulsores laterales con llamita
    [[-70, -118], [44, -118]].forEach(function (p, i) {
      c.save(); c.globalAlpha = 0.9;
      P2.poly(c, [[p[0] + 4, p[1] + 20], [p[0] + 13, p[1] + 40 - i * 6], [p[0] + 22, p[1] + 20]], '#fb923c', O, 2);
      P2.poly(c, [[p[0] + 9, p[1] + 20], [p[0] + 13, p[1] + 30 - i * 4], [p[0] + 17, p[1] + 20]], '#fde047', null);
      c.restore();
      P2.rf(c, p[0], p[1], 26, 22, 8, E.STEEL_DD, O, 3);
      P2.rf(c, p[0] + 2, p[1] + 16, 22, 7, 3, E.RED, O, 2);
    });
    // TALADRO-PEONZA (abajo, apuntando al suelo)
    drill(c, 0, -96, Math.PI, 94, 104, spin);
    // brazo trasero
    limb(c, -50, -156, -80, -126, 16, E.STEEL_DD);
    P2.rf(c, -98, -134, 30, 28, 10, E.STEEL_DD, O, 3);
    // cuerpo-cabeza redondo (tipo Kirby)
    P2.rf(c, -62, -116, 124, 20, 10, E.RED, O, 3);
    P2.elli(c, 0, -176, 80, 70, E.STEEL, O, 3);
    c.save(); c.beginPath(); c.ellipse(0, -176, 80, 70, 0, 0, TAU); c.clip();
    c.fillStyle = E.STEEL_D; c.beginPath(); c.ellipse(0, -100, 92, 46, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.14)'; c.beginPath(); c.ellipse(-20, -222, 46, 14, -0.15, 0, TAU); c.fill();
    c.restore();
    P2.elli(c, 0, -176, 80, 70, null, O, 3);
    P2.line(c, -76, -150, 76, -150, O, 2.5);
    // escotilla de mini-robots arriba
    P2.rf(c, -30, -256, 44, 16, 8, E.RED, O, 3);
    P2.rf(c, -20, -263, 24, 10, 5, E.STEEL_DD, O, 2.5);
    bolt(c, -22, -248, 2.2); bolt(c, 6, -248, 2.2);
    // circuitos dorados
    circuit(c, [[0, -128], [-30, -128], [-30, -160], [-56, -160]], 3);
    circuit(c, [[0, -128], [-6, -128], [-6, -114]], 2.5);
    circuit(c, [[0, -128], [0, -142], [-20, -142], [-20, -232], [-8, -232]], 2.5);
    P2.fn.gemaCopia(c, 0, -128, { scale: 1.15 });
    // cara: visor ancho con ojo-luz grande
    P2.rf(c, 10, -222, 66, 40, 18, E.DARK, O, 3);
    P2.eyeLight(c, 46, -202, 13, E.EYE);
    P2.poly(c, [[10, -232], [74, -226], [74, -218], [14, -222]], E.RED, O, 2);
    // boca-rejilla
    P2.rf(c, 34, -176, 38, 14, 7, '#0b1020', O, 2.5);
    [42, 50, 58, 66].forEach(function (xx) { P2.line(c, xx, -173, xx, -165, '#e2e8f0', 2); });
    // antena-oreja
    P2.circ(c, -34, -196, 12, E.STEEL_D, O, 2.5);
    P2.circ(c, -34, -196, 5, E.RED_L, O, 1.8);
    // brazo delantero (cambiante)
    P2.circ(c, 58, -144, 18, E.RED, O, 3);
    bolt(c, 58, -144, 4);
    limb(c, 62, -138, 84, -116, 18, E.STEEL_D);
    P2.circ(c, 84, -116, 11, E.STEEL_DD, O, 2.5);
    limb(c, 86, -116, 106, -116, 20, E.STEEL);
    P2.rf(c, 104, -130, 12, 28, 4, E.RED, O, 2.5);
    c.save(); c.translate(114, -116); tool(c, brazo, spin); c.restore();
  }

  P2.fn.robovill = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = o.facing === -1 ? -1 : 1;
    c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';
    if (o.variant === 'B') drawB(c, o); else drawA(c, o);
  });

  // ---------------------------------------------------------------------
  //  Utilidades de panel
  // ---------------------------------------------------------------------
  function suelo(c, gy, col, top) {
    c.fillStyle = col || 'rgba(0,0,0,0.3)'; c.fillRect(0, gy, 480, 480 - gy);
    c.fillStyle = top || 'rgba(255,255,255,0.12)'; c.fillRect(0, gy, 480, 4);
    P2.line(c, 0, gy, 480, gy, O, 3);
  }
  // rótulo con línea que señala una pieza
  //   La línea empieza en el BORDE del rótulo (no en su centro), para que no
  //   asome entre las palabras.
  function nota(c, txt, tx, ty, px, py, col, align) {
    c.save(); c.font = 'bold 14px system-ui, "Segoe UI", Arial, sans-serif';
    var w = c.measureText(txt).width; c.restore();
    var sx = tx, sy = ty - 5;
    if (px > tx + w / 2) sx = tx + w / 2 + 5;
    else if (px < tx - w / 2) sx = tx - w / 2 - 5;
    else sy = py > ty ? ty + 5 : ty - 17;
    P2.line(c, sx, sy, px, py, O, 4.5);
    P2.line(c, sx, sy, px, py, '#fef3c7', 2);
    P2.circ(c, px, py, 3.5, '#fef3c7', O, 1.5);
    P2.label(c, txt, tx, ty, 14, col || '#fef3c7', align);
  }
  function pum(c, x, y, r, txt, size, col) {
    var pts = [];
    for (var i = 0; i < 18; i++) {
      var a = i * Math.PI / 9 + 0.1, rr = (i % 2) ? r * 0.64 : r;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    P2.poly(c, pts, col || '#fbbf24', O, 2.5);
    P2.label(c, txt, x, y + (size || 17) * 0.35, size || 17, '#fff7ed');
  }
  function nube(c, x, y, s, alpha) {
    c.save(); c.globalAlpha = alpha || 0.9;
    c.fillStyle = '#ffffff';
    [[0, 0, 22], [22, 4, 17], [-22, 5, 16], [10, -12, 15]].forEach(function (b) {
      c.beginPath(); c.arc(x + b[0] * s, y + b[1] * s, b[2] * s, 0, TAU); c.fill();
    });
    c.restore();
  }
  function flecha(c, x1, y1, x2, y2, col) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    [[O, 7], [col, 3.5]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1]; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    });
    c.save(); c.translate(x2, y2); c.rotate(a);
    P2.poly(c, [[6, 0], [-7, -7], [-7, 7]], col, O, 2);
    c.restore();
  }
  function roca(c, x, y, r, rot, col) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = rot + i * TAU / 6, rr = r * (0.75 + 0.25 * ((i * 7 + 3) % 4) / 3);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    P2.poly(c, pts, col || '#92400e', O, 2);
  }
  function estrellita(c, x, y, r, col) {
    var pts = [];
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    P2.poly(c, pts, col || '#fde68a', O, 1.5);
  }

  P2.register({
    key: 'robovill',
    title: 'ROBOVILL, el nuevo villano',
    panels: [
      // ---------------- 1) VARIANTE A ----------------
      {
        title: 'Robovill A: «Taladro-casco»',
        subtitle: 'El taladro es su casco y su cuerno · alas de plumas de metal',
        bg: ['#1e1238', '#4c1d95'],
        render: function (c, t) {
          suelo(c, 456);
          // x=276, escala 1,09: ocupa x≈14..468 (margen de 8 px a los dos lados:
          // las plumas a la izquierda y el martillo a la derecha)
          P2.fn.robovill(c, 276, 458, { variant: 'A', scale: 1.09, brazo: 'martillo', alas: 'abiertas', taladro: 0.25 });
          nota(c, 'taladro-casco', 398, 112, 305, 178, '#fecaca');
          nota(c, 'alas de metal', 70, 96, 175, 220, '#e2e8f0');
          nota(c, 'ojo-luz', 424, 196, 311, 231, '#fca5a5');
          nota(c, 'gema copia', 414, 262, 299, 337, '#f9a8d4');
          nota(c, 'circuitos dorados', 96, 440, 241, 366, '#fde047');
          nota(c, 'brazo cambiante', 404, 430, 443, 378, '#fef3c7');
        }
      },
      // ---------------- 2) VARIANTE B ----------------
      {
        title: 'Robovill B: «Peonza-taladro»',
        subtitle: 'El taladro es su parte de abajo · alas de murciélago de metal',
        bg: ['#1e1b4b', '#312e81'],
        render: function (c, t) {
          suelo(c, 456);
          // polvo donde gira
          c.save(); c.globalAlpha = 0.6;
          [[-40, 0, 12], [-22, -6, 9], [24, -5, 10], [42, 0, 12]].forEach(function (p) { P2.circ(c, 228 + p[0], 452 + p[1], p[2], '#d6d3d1', null); });
          c.restore();
          P2.fn.robovill(c, 228, 458, { variant: 'B', scale: 1.28, brazo: 'pinza', alas: 'abiertas', taladro: 0.6 });
          nota(c, 'escotilla de mini-robots', 312, 84, 222, 128, '#fef3c7');
          nota(c, 'alas de murciélago', 86, 90, 110, 124, '#fca5a5');
          nota(c, 'gema copia', 74, 300, 216, 292, '#f9a8d4');
          nota(c, 'ojo-luz', 420, 186, 290, 200, '#fca5a5');
          nota(c, 'taladro-peonza', 82, 420, 192, 400, '#fecaca');
          nota(c, 'brazo cambiante', 400, 384, 412, 322, '#fef3c7');
        }
      },
      // ---------------- 3) BRAZOS CAMBIANTES ----------------
      {
        title: 'Brazos cambiantes',
        subtitle: '¡Cambia de brazo en plena pelea! (y siempre avisa antes)',
        bg: ['#111827', '#374151'],
        render: function (c, t) {
          var cells = [
            { tipo: 'martillo', name: 'Martillo', txt: '¡golpea el suelo!', x: 120, y: 160, col: '#fde68a' },
            { tipo: 'sierra', name: 'Sierra', txt: 'corta plataformas', x: 360, y: 160, col: '#e2e8f0' },
            { tipo: 'canon', name: 'Cañón', txt: 'dispara bolas rojas', x: 120, y: 360, col: '#fca5a5' },
            { tipo: 'pinza', name: 'Pinza', txt: 'te agarra: ¡escápate!', x: 360, y: 360, col: '#fdba74' }
          ];
          cells.forEach(function (k, i) {
            P2.rf(c, k.x - 112, k.y - 92, 224, 190, 18, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.18)', 2);
            // antebrazo de Robovill (recortado a su tarjeta: los 4 iguales)
            c.save(); c.beginPath(); c.rect(k.x - 110, k.y - 90, 220, 186); c.clip();
            var wx = k.x - 34, wy = k.y - 10, s = 1.55;
            limb(c, k.x - 108, wy + 14, wx - 18, wy, 30, E.STEEL);
            P2.circ(c, k.x - 98, wy + 12, 14, E.RED, O, 3);
            bolt(c, k.x - 98, wy + 12, 4);
            P2.rf(c, wx - 18, wy - 20, 18, 40, 5, E.RED, O, 3);
            P2.fn.robovillBrazo(c, wx, wy, { tipo: k.tipo, scale: s, giro: 0.4 });
            c.restore();
            P2.label(c, (i + 1) + '. ' + k.name, k.x, k.y + 64, 19, k.col);
            P2.label(c, k.txt, k.x, k.y + 86, 13, '#e5e7eb');
          });
          // icono de "cambiar"
          P2.circ(c, 240, 260, 22, '#fbbf24', O, 3);
          c.save(); c.strokeStyle = O; c.lineWidth = 3.5;
          c.beginPath(); c.arc(240, 260, 11, -2.6, 0.9); c.stroke(); c.restore();
          P2.poly(c, [[246, 272], [255, 266], [251, 279]], O, null);
          P2.poly(c, [[230, 247], [226, 254], [234, 255]], O, null);
        }
      },
      // ---------------- 4) SALE DEL SUELO ----------------
      {
        title: '¡Sale del suelo!',
        subtitle: 'Excava por debajo y asoma por sorpresa… ¡pero siempre avisa con «!»',
        bg: ['#1c1917', '#57534e'],
        render: function (c, t) {
          var gy = 336;
          // tierra (corte del subsuelo)
          c.fillStyle = '#78350f'; c.fillRect(0, gy, 480, 480 - gy);
          c.fillStyle = '#92400e'; c.fillRect(0, gy + 40, 480, 24);
          c.fillStyle = '#5b2a0b'; c.fillRect(0, gy + 100, 480, 50);
          [[40, 380, 8], [150, 420, 10], [420, 400, 9], [96, 456, 7], [460, 456, 8]].forEach(function (r, i) { roca(c, r[0], r[1], r[2], i, '#a8a29e'); });
          // túnel que ha excavado
          c.save(); c.strokeStyle = O; c.lineWidth = 46; c.lineCap = 'round';
          c.beginPath(); c.moveTo(-20, 440); c.quadraticCurveTo(190, 452, 330, 360); c.stroke();
          c.strokeStyle = '#1c1008'; c.lineWidth = 40;
          c.beginPath(); c.moveTo(-20, 440); c.quadraticCurveTo(190, 452, 330, 360); c.stroke();
          c.restore();
          P2.label(c, 'su túnel secreto', 118, 470, 13, '#fde68a');
          // hierba arriba
          c.fillStyle = '#4d7c0f'; c.fillRect(0, gy - 6, 480, 10);
          P2.line(c, 0, gy - 6, 480, gy - 6, O, 3);
          // estallido detrás
          c.save(); c.globalAlpha = 0.35;
          for (var i = 0; i < 10; i++) {
            var a = -Math.PI + i * Math.PI / 9;
            P2.poly(c, [[330, gy], [330 + Math.cos(a - 0.08) * 230, gy + Math.sin(a - 0.08) * 230], [330 + Math.cos(a + 0.08) * 230, gy + Math.sin(a + 0.08) * 230]], '#fde68a', null);
          }
          c.restore();
          // Robovill A asomando (recortado al nivel del suelo)
          c.save(); c.beginPath(); c.rect(0, 0, 480, gy - 2); c.clip();
          P2.fn.robovill(c, 334, gy + 80, { variant: 'A', scale: 1.08, facing: -1, brazo: 'martillo', alas: 'cerradas', taladro: 0.7 });
          c.restore();
          // borde del agujero y rocas que saltan
          P2.elli(c, 334, gy - 2, 100, 12, '#3f1d06', O, 3);
          [[196, 234, 10], [214, 180, 8], [250, 140, 7], [440, 160, 8], [452, 214, 11], [466, 268, 8], [204, 292, 9], [454, 304, 9]].forEach(function (r, i) {
            roca(c, r[0], r[1], r[2], i * 0.7, i % 2 ? '#92400e' : '#b45309');
          });
          c.save(); c.globalAlpha = 0.7;
          [[236, 326, 16], [262, 318, 12], [404, 320, 13], [430, 328, 17]].forEach(function (p) { P2.circ(c, p[0], p[1], p[2], '#d6d3d1', null); });
          c.restore();
          pum(c, 420, 106, 36, '¡CRAC!', 17, '#fb923c');
          // 1) el aviso, dentro de un recuadro
          P2.rf(c, 12, 74, 156, 134, 14, 'rgba(15,23,42,0.75)', '#fbbf24', 2.5);
          P2.label(c, '1) ¡Aviso!', 90, 96, 15, '#fbbf24');
          P2.line(c, 22, 176, 158, 176, '#4d7c0f', 6); P2.line(c, 22, 180, 158, 180, O, 2.5);
          c.save(); c.strokeStyle = O; c.lineWidth = 2.5; c.lineJoin = 'round';
          c.beginPath(); c.moveTo(70, 180); c.lineTo(80, 174); c.lineTo(88, 182); c.lineTo(98, 174); c.lineTo(108, 180); c.stroke();
          c.beginPath(); c.moveTo(56, 168); c.lineTo(62, 162); c.moveTo(120, 168); c.lineTo(114, 162); c.moveTo(52, 160); c.lineTo(58, 154); c.moveTo(124, 160); c.lineTo(118, 154); c.stroke();
          c.restore();
          P2.exclaim(c, 89, 134);
          P2.label(c, 'el suelo tiembla', 90, 200, 12, '#e5e7eb');
          P2.label(c, '2) ¡Taladrazo!', 266, 100, 16, '#fecaca');
          // héroes pequeños (escala de juego) escapando
          [[34, gy - 4], [86, gy - 18]].forEach(function (h) {
            c.save(); c.globalAlpha = 0.8; c.strokeStyle = '#fef3c7'; c.lineWidth = 3; c.lineCap = 'round';
            [[-44, 16], [-30, 26], [-16, 20]].forEach(function (l) { c.beginPath(); c.moveTo(h[0] + 20, h[1] + l[0]); c.lineTo(h[0] + 20 + l[1], h[1] + l[0]); c.stroke(); });
            c.globalAlpha = 0.7;
            [[18, -4, 7], [28, -8, 5], [36, -3, 4]].forEach(function (d) { P2.circ(c, h[0] + d[0], h[1] + d[1], d[2], '#d6d3d1', null); });
            c.restore();
          });
          P2.director(c, 34, gy - 4, { scale: 1, facing: -1, pose: 'run' });
          P2.falcon(c, 86, gy - 18, { scale: 1, facing: -1, pose: 'jump' });
          P2.label(c, '¡corred!', 62, 244, 14, '#bbf7d0');
        }
      },
      // ---------------- 5) VUELA ----------------
      {
        title: '¡Vuela!',
        subtitle: 'Abre las alas de metal y suelta una lluvia de mini-robots',
        bg: ['#1e3a8a', '#7dd3fc'],
        render: function (c, t) {
          nube(c, 60, 120, 1.1, 0.8); nube(c, 420, 210, 1.3, 0.7); nube(c, 380, 90, 0.8, 0.6); nube(c, 70, 300, 0.9, 0.6);
          suelo(c, 448, '#166534', 'rgba(255,255,255,0.18)');
          // Robovill volando (inclinado), con llamas de los pies
          c.save(); c.translate(264, 334); c.rotate(0.26);
          [[-18, 0], [30, 0]].forEach(function (p) {
            P2.poly(c, [[p[0] - 22, 0], [p[0] - 4, 42], [p[0] + 14, 0]], '#fb923c', O, 2.5);
            P2.poly(c, [[p[0] - 13, 0], [p[0] - 4, 24], [p[0] + 5, 0]], '#fde047', null);
          });
          P2.fn.robovill(c, 0, 0, { variant: 'A', scale: 0.86, brazo: 'canon', alas: 'abiertas', taladro: 0.1 });
          c.restore();
          // líneas de velocidad
          c.save(); c.globalAlpha = 0.6; c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round';
          [[340, 140, 410], [350, 180, 440], [336, 250, 400]].forEach(function (l) { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[1]); c.stroke(); });
          c.restore();
          // lluvia de mini-robots (con estelas que persiguen)
          // cada mini-robot va a por el héroe más cercano: Director (40,410) o Falcon (446,410)
          var HD = [40, 412], HF = [446, 412];
          var minis = [[176, 332], [130, 372], [206, 392], [82, 396], [306, 340], [352, 372], [286, 398], [404, 396]];
          c.save(); c.setLineDash([5, 6]); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2.5;
          minis.forEach(function (m) {
            var h = m[0] < 245 ? HD : HF, dx = h[0] - m[0], dy = h[1] - m[1], d = Math.sqrt(dx * dx + dy * dy) || 1;
            var sx = m[0] < 245 ? 228 : 270;
            c.beginPath(); c.moveTo(sx, 300); c.quadraticCurveTo(m[0] - dx / d * 60, m[1] - dy / d * 60, m[0] - dx / d * 14, m[1] - dy / d * 14); c.stroke();
          });
          c.restore();
          minis.forEach(function (m, i) { P2.fn.miniRobot(c, m[0], m[1], { scale: 1.15, facing: m[0] < 245 ? -1 : 1, t: t + i * 0.37 }); });
          // ¡ya los alcanzan!
          P2.label(c, '!', 40, 368, 24, '#fde047');
          P2.label(c, '!', 446, 368, 24, '#fde047');
          // héroes a escala de juego
          P2.director(c, 40, 448, { scale: 1, facing: 1, pose: 'idle' });
          P2.falcon(c, 446, 448, { scale: 1, facing: -1, pose: 'idle' });
          P2.label(c, '¡Lluvia de mini-robots!', 96, 250, 15, '#fde047');
          P2.label(c, '¡te persiguen!', 300, 440, 14, '#fecaca');
        }
      },
      // ---------------- 6) GEMA COPIA Y ESCALA ----------------
      {
        title: 'La gema copia y la escala',
        subtitle: 'Original vs. copia de máquina · Robovill a tamaño de juego',
        bg: ['#0f172a', '#312e81'],
        render: function (c, t) {
          // comparación de gemas
          P2.rf(c, 12, 72, 260, 168, 16, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.2)', 2);
          P2.call('gemaPoder', c, 76, 146, { scale: 2.6, t: t });
          P2.fn.gemaCopia(c, 204, 146, { scale: 2.6, t: t });
          P2.label(c, 'Gema del Poder', 76, 214, 14, '#fbcfe8');
          P2.label(c, '(la de verdad)', 76, 230, 12, '#cbd5e1');
          P2.label(c, 'Gema copia', 204, 214, 14, '#fde047');
          P2.label(c, 'marco + circuitos', 204, 230, 12, '#cbd5e1');
          P2.label(c, '≠', 140, 152, 22, '#fef3c7');
          // fila a escala de juego
          suelo(c, 454);
          P2.director(c, 30, 454, { scale: 1, facing: 1 });
          P2.fn.secuaz(c, 122, 454, { scale: 1, good: true });
          // escala de juego 0,93: ~272 px de alto (rango 240-280); el ala acaba en x≈468
          // (12 px del borde) y el martillo queda separado de la mano de Dark Secuaz
          P2.fn.robovill(c, 370, 454, { variant: 'A', scale: 0.93, facing: -1, brazo: 'martillo', alas: 'cerradas', taladro: 0.4 });
          // marcas de altura
          [[64, '#22d3ee', 6], [190, '#86efac', 6], [272, '#fca5a5', 284]].forEach(function (h) {
            c.save(); c.setLineDash([4, 5]); c.strokeStyle = h[1]; c.lineWidth = 1.5;
            c.beginPath(); c.moveTo(h[2], 454 - h[0]); c.lineTo(474, 454 - h[0]); c.stroke(); c.restore();
          });
          P2.label(c, 'Director', 36, 474, 12, '#bae6fd');
          P2.label(c, 'Dark Secuaz (bueno)', 140, 474, 12, '#bbf7d0');
          P2.label(c, 'Robovill', 380, 474, 12, '#fecaca');
          P2.label(c, '~64 px', 252, 406, 12, '#67e8f9');
          P2.label(c, '~270 px', 306, 176, 12, '#fca5a5');
          P2.label(c, '~190 px', 230, 258, 12, '#86efac');
        }
      }
    ]
  });
})();
