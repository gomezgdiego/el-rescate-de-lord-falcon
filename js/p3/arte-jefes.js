// jefes.js — PROTOTIPO Parte 3 ("We Are a Team"): jefes y robots.
// Robot de práctica (cap. 1, BUENO y verde), La Gran Excavadora (cap. 2),
// El Dron Nodriza (cap. 3) y el Guardián de Robovill (cap. 4).
// Canvas 2D puro, determinista (sin Math.random, tiempo = P2.T), estilo Kirby/LEGO.
// Exporta: P2.fn.robotPractica, P2.fn.granExcavadora, P2.fn.dronNodriza, P2.fn.guardianRobovill
//   · Los de suelo se anclan en los PIES (x, y = centro de los pies); el dron, en su CENTRO.
//   · o: {scale, facing (1 derecha / -1 izquierda)} y extras opcionales documentados en cada uno.
(function () {
  'use strict';
  var O = P2.OUTLINE, LW = P2.LW;
  var GLOW = '#fde047', GLOW_D = '#f59e0b';          // punto débil (batería / motor)
  var CIRC = '#facc15';                              // circuitos DORADOS de la gema copia (acento de Robovill)
  var ENER = '#ec4899', ENER_L = '#f9a8d4';          // escudo de energía del guardián

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  // Envoltorio seguro: save/restore, traslada a (x, y), aplica scale y facing; nunca lanza.
  function safe(fn) {
    return function (c, x, y, o) {
      if (!c || !c.save) return;
      o = o || {};
      c.save();
      try {
        var s = num(o.scale, 1); if (s <= 0) s = 1;
        var f = (o.facing === -1) ? -1 : 1;
        c.translate(num(x, 0), num(y, 0)); c.scale(s * f, s);
        c.lineJoin = 'round'; c.lineCap = 'round';
        fn(c, o);
      } catch (e) { if (window.console) console.warn('jefes.js', e); }
      c.restore();
    };
  }
  function pal(bueno) {
    var E = P2.PAL.enemy, H = P2.PAL.hacked;
    return { STEEL: E.STEEL, STEEL_D: E.STEEL_D, STEEL_DD: E.STEEL_DD, DARK: E.DARK, BRONZE: E.BRONZE,
             RED: bueno ? H.RED : E.RED, RED_L: bueno ? H.RED_L : E.RED_L, EYE: bueno ? H.EYE : E.EYE };
  }
  // Trazo grueso con contorno (brazos, piernas, muelles)
  function limb(c, pts, col, w) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    [[O, w + 4], [col, w]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    });
    c.restore();
  }
  function sonrisa(c, x, y, r) {
    c.save(); c.lineCap = 'round';
    [[O, 4.5], ['#dcfce7', 2.2]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.arc(x, y, r, 0.18 * Math.PI, 0.82 * Math.PI); c.stroke();
    });
    c.restore();
  }
  function brillo(c, x, y, rx, ry, a) {
    c.save(); c.globalAlpha = a || 0.35; P2.elli(c, x, y, rx, ry, '#ffffff', null); c.restore();
  }
  function halo(c, x, y, r, rgb, a) {
    c.save(); c.globalCompositeOperation = 'lighter';
    var g = c.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + (a || 0.6) + ')');
    g.addColorStop(0.55, 'rgba(' + rgb + ',0.2)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // Batería brillante = PUNTO DÉBIL (mismo código visual que el robot con escudo de la Parte 2)
  function bateria(c, x, y, w, h) {
    halo(c, x + w / 2, y + h / 2, Math.max(w, h) * 0.85, '253,224,71', 0.6 + 0.1 * Math.sin(P2.T * 5));
    P2.rf(c, x, y, w, h, Math.min(w, h) * 0.32, P2.PAL.enemy.STEEL_DD, O, 2.5);
    P2.rf(c, x + 3, y + 4, w - 6, h - 8, Math.min(w, h) * 0.22, GLOW, O, 2);
    c.save(); c.globalAlpha = 0.8; P2.rf(c, x + 5, y + 6, 2.6, h - 14, 1.3, '#ffffff', null); c.restore();
    var cx = x + w / 2 + 1, cy = y + h / 2;
    P2.poly(c, [[cx + 1, cy - h * 0.3], [cx - w * 0.22, cy + 1], [cx, cy + 1], [cx - 2, cy + h * 0.3], [cx + w * 0.24, cy - 3], [cx + 1, cy - 3]], GLOW_D, O, 1.5);
  }
  // Marca de Robovill: la GEMA COPIA (gema de máquina con circuitos brillando)
  function gemaCopia(c, x, y, r) {
    c.save(); c.translate(x, y);
    c.globalAlpha = 0.35; P2.circ(c, 0, 0, r * 1.65, '#f472b6', null); c.globalAlpha = 1;
    var pts = [[0, -r], [r * 0.9, -r * 0.3], [r * 0.55, r], [-r * 0.55, r], [-r * 0.9, -r * 0.3]];
    var g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, P2.PAL.gem.A); g.addColorStop(1, P2.PAL.gem.B);
    P2.poly(c, pts, g, null);
    c.strokeStyle = CIRC; c.lineWidth = Math.max(1.2, r * 0.13); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-r * 0.55, -r * 0.2); c.lineTo(-r * 0.05, -r * 0.2); c.lineTo(-r * 0.05, r * 0.55);
    c.moveTo(r * 0.38, -r * 0.55); c.lineTo(r * 0.38, r * 0.1); c.lineTo(r * 0.12, r * 0.1);
    c.stroke();
    P2.circ(c, -r * 0.55, -r * 0.2, r * 0.13, '#ecfeff', null);
    P2.circ(c, -r * 0.05, r * 0.55, r * 0.13, '#ecfeff', null);
    P2.circ(c, r * 0.38, -r * 0.55, r * 0.13, '#ecfeff', null);
    c.globalAlpha = 0.5; P2.poly(c, [[-r * 0.2, -r * 0.8], [r * 0.15, -r * 0.62], [-r * 0.45, -r * 0.35]], '#ffffff', null); c.globalAlpha = 1;
    P2.poly(c, pts, null, O, Math.max(2, Math.min(3, r * 0.25)));
    c.restore();
  }
  // Usa la gema copia OFICIAL de robovill.js (marco de acero + circuitos dorados); si no está, la local.
  function marca(c, x, y, r) {
    if (!P2.call('gemaCopia', c, x, y, { scale: r / 13 })) gemaCopia(c, x, y, r);
  }
  // Cabeza mini-torreta (familia del ejército) SIN cañón. (cx, by) = base.
  function cabeza(c, cx, by, K, P, feliz) {
    var oy = by - 16 * K, k = function (v) { return v * K; };
    limb(c, [[cx + k(2), oy + k(-9)], [cx + k(5), oy + k(-17)]], P.STEEL_DD, Math.max(2, k(2.6)));
    P2.circ(c, cx + k(5.5), oy + k(-18), k(3.4), P.RED_L, O, 2);
    brillo(c, cx + k(4.6), oy + k(-19), k(1.1), k(1.1), 0.6);
    P2.rf(c, cx + k(-16), oy + k(4), k(32), k(12), k(5), '#334155', O, LW);
    P2.rf(c, cx + k(-12), oy + k(-4), k(24), k(12), k(6), P.RED, O, LW);
    c.beginPath(); c.arc(cx, oy + k(-2), k(9), Math.PI, 0); c.closePath();
    c.fillStyle = P.RED; c.fill(); c.strokeStyle = O; c.lineWidth = LW; c.stroke();
    brillo(c, cx - k(3.5), oy + k(-6), k(3), k(1.6), 0.3);
    P2.eyeLight(c, cx + k(1), oy + k(2.5), k(3.4), P.EYE);
    if (feliz) sonrisa(c, cx + k(1), oy + k(6.5), Math.max(k(4.5), 4));
  }
  // Manopla blandita de entrenamiento (cojín)
  function manopla(c, x, y, r, col, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    P2.rf(c, -r * 0.55, r * 0.55, r * 1.1, r * 0.7, r * 0.25, '#f8fafc', O, 2.5);       // puño
    P2.elli(c, 0, 0, r * 0.9, r, col, O, LW);
    P2.elli(c, -r * 0.75, r * 0.05, r * 0.32, r * 0.5, col, O, 2);                     // pulgar
    c.strokeStyle = O; c.lineWidth = 2; c.beginPath(); c.moveTo(-r * 0.4, -r * 0.15); c.lineTo(r * 0.5, -r * 0.15); c.stroke();
    brillo(c, r * 0.25, -r * 0.5, r * 0.3, r * 0.2, 0.55);
    c.restore();
  }
  // Escudo de Peter según el dibujo de Juanjo: redondo, con radios verdes y negros
  function escudoJuanjo(c, x, y, r) {
    c.save(); c.translate(x, y);
    P2.circ(c, 0, 0, r, '#e5e7eb', O, LW);
    c.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + 0.2;
      c.strokeStyle = (i % 2) ? '#111827' : '#16a34a'; c.lineWidth = Math.max(2, r * 0.2);
      c.beginPath(); c.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); c.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); c.stroke();
    }
    P2.circ(c, 0, 0, r * 0.86, null, '#111827', Math.max(2, r * 0.16));
    P2.circ(c, 0, 0, r * 0.24, '#22c55e', O, 2);
    P2.circ(c, 0, 0, r, null, O, LW);
    c.restore();
  }

  // ---- Utilidades de los paneles ----
  // Rótulo con línea guía: texto en (tx, ty); la guía va de (sx, sy) al punto (px, py).
  function nota(c, txt, tx, ty, sx, sy, px, py, col, size, align) {
    col = col || '#fef3c7';
    c.save(); c.lineCap = 'round';
    [[O, 5], [col, 2.2]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(px, py); c.stroke();
    });
    P2.circ(c, px, py, 4, col, O, 2);
    c.restore();
    P2.label(c, txt, tx, ty, size || 13, col, align);
  }
  function caja(c, x, y, w, h, txt) {
    c.save();
    c.globalAlpha = 0.5; P2.rf(c, x, y, w, h, 12, '#0b1020', null); c.globalAlpha = 1;
    P2.rf(c, x, y, w, h, 12, null, 'rgba(254,243,199,0.55)', 2);
    c.restore();
    if (txt) P2.label(c, txt, x + w / 2, y + 19, 12, '#fde68a');
  }
  function badge(c, n, x, y, col) {
    P2.circ(c, x, y, 10.5, col || '#fbbf24', O, 2.5);
    c.save(); c.font = 'bold 14px system-ui, "Segoe UI", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = O; c.fillText(String(n), x, y + 1); c.restore();
  }
  function nube(c, x, y, s, a) {
    c.save(); c.globalAlpha = a || 0.85;
    [[0, 0, 14], [14, -6, 16], [30, 0, 13], [15, 5, 14]].forEach(function (p) { P2.circ(c, x + p[0] * s, y + p[1] * s, p[2] * s, '#e0f2fe', null); });
    c.restore();
  }
  // Mini Mikey / Peter para el esquema: usa los dibujos del módulo de héroes si existen;
  // si no, un muñequito provisional.
  function miniHeroe(c, x, y, s, quien) {
    var names = (quien === 'mikey') ? ['mikey', 'mikeyStark'] : ['peter', 'peterRogers'];
    var pose = (quien === 'mikey') ? 'disparo' : 'bloquear';
    for (var i = 0; i < names.length; i++) {
      if (typeof P2.fn[names[i]] === 'function') { P2.call(names[i], c, x, y, { scale: s, facing: 1, pose: pose }); return; }
    }
    c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
    var mk = (quien === 'mikey');
    var suit = mk ? '#7c3aed' : '#e2e8f0', suitD = mk ? '#4c1d95' : '#475569';
    P2.elli(c, 0, -1, 15, 3, 'rgba(0,0,0,0.25)', null);
    if (mk) P2.rf(c, -17, -40, 9, 20, 3, '#334155', O, 2.5);                     // mochila-lanzadores
    P2.rf(c, -9, -17, 8, 17, 3, suitD, O, 2.5); P2.rf(c, 1, -17, 8, 17, 3, suitD, O, 2.5);
    P2.rf(c, -12, -38, 24, 24, 8, suit, O, LW);
    P2.rf(c, -12, -27, 24, 4, 2, mk ? '#f97316' : '#16a34a', O, 1.5);
    P2.circ(c, 1, -51, 15, '#f2c49b', O, LW);
    c.beginPath(); c.arc(1, -53, 15.5, Math.PI * 1.02, Math.PI * 1.98); c.closePath();
    c.fillStyle = mk ? '#1f2937' : '#92400e'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    if (mk) P2.rf(c, -2, -55, 18, 8, 4, '#f97316', O, 2);                         // gafas-visor
    else P2.circ(c, 9, -50, 2.2, O, null);
    if (mk) P2.rf(c, 8, -30, 16, 7, 3, '#38bdf8', O, 2);                         // lanzador
    else escudoJuanjo(c, 12, -27, 13);
    c.restore();
  }

  // =====================================================================
  //  ROBOT DE PRÁCTICA — (x, y) = pies. ~157 px de alto a escala 1.
  //  Lo fabrica Dark Secuaz (ahora bueno): verde, diana en el pecho, muelle y ruedas.
  //  o: {scale, facing, golpe (bool: diana encendida al recibir un acierto)}
  // =====================================================================
  P2.fn.robotPractica = safe(function (c, o) {
    var P = pal(true), G = '#22c55e', GD = '#15803d', golpe = !!o.golpe;
    P2.elli(c, 0, -1, 42, 6, 'rgba(0,0,0,0.25)', null);
    // brazo y manopla del FONDO
    limb(c, [[-16, -92], [-34, -84], [-40, -72]], P.STEEL_DD, 6);
    manopla(c, -43, -66, 10, '#fb923c', -0.5);
    // ruedas y base
    [-21, 0, 21].forEach(function (wx) {
      P2.circ(c, wx, -9, 8, P.DARK, O, LW);
      P2.circ(c, wx, -9, 3, '#94a3b8', O, 1.5);
    });
    P2.rf(c, -33, -27, 66, 15, 7, P.STEEL_D, O, LW);
    P2.rf(c, -33, -22, 66, 5, 2.5, GD, O, 2);
    // muelle (¡boing!)
    var pts = [];
    for (var i = 0; i <= 6; i++) pts.push([(i === 0 || i === 6) ? 0 : ((i % 2) ? 13 : -13), -27 - i * 3.6]);
    limb(c, pts, '#cbd5e1', 4);
    P2.rf(c, -20, -56, 40, 9, 4, P.STEEL_DD, O, 2.5);
    // cuerpo-barril verde
    P2.rr(c, -30, -114, 60, 62, 22);
    c.save(); c.clip();
    c.fillStyle = G; c.fillRect(-32, -116, 64, 66);
    c.fillStyle = GD; c.fillRect(-32, -66, 64, 16);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(-18, -100, 5, 9, 0.2, 0, Math.PI * 2); c.fill();
    c.restore();
    P2.line(c, -30, -66, 30, -66, O, 2);
    P2.rf(c, -30, -114, 60, 62, 22, null, O, LW);
    [[-22, -59], [-8, -59], [8, -59], [22, -59]].forEach(function (b) { P2.circ(c, b[0], b[1], 1.8, '#bbf7d0', null); });
    // DIANA en el pecho
    var dx = 3, dy = -88;
    if (golpe) {
      halo(c, dx, dy, 34, '253,224,71', 0.95);
      c.save(); c.globalAlpha = 0.35; P2.circ(c, dx, dy, 27, '#fde047', null); c.restore();
    }
    P2.circ(c, dx, dy, 19, '#ffffff', O, LW);
    P2.circ(c, dx, dy, 14.5, '#ef4444', O, 1.5);
    P2.circ(c, dx, dy, 10, '#ffffff', O, 1.5);
    P2.circ(c, dx, dy, 5.5, golpe ? '#fff7ed' : '#fde047', O, 2);
    if (golpe) {                                         // rayitas de "¡acierto!"
      for (var ri = 0; ri < 6; ri++) {
        var ra = -Math.PI / 2 + ri * Math.PI / 3 + 0.5;
        var x1 = dx + Math.cos(ra) * 23, y1 = dy + Math.sin(ra) * 23, x2 = dx + Math.cos(ra) * 30, y2 = dy + Math.sin(ra) * 30;
        P2.line(c, x1, y1, x2, y2, O, 4); P2.line(c, x1, y1, x2, y2, '#ffffff', 2);
      }
    }
    // cuello y cabeza feliz (ojo verde)
    P2.rf(c, -7, -120, 14, 8, 3, P.STEEL_DD, O, 2);
    P2.horns(c, 0, -142, 0.7, P.BRONZE);                 // cuernos como Dark Secuaz: "¡hecho por él!"
    cabeza(c, 0, -114, 1.2, P, true);
    // brazo y manopla del FRENTE (levantada: "¡dale aquí!")
    P2.circ(c, 28, -100, 6, P.STEEL_D, O, 2.5);
    limb(c, [[28, -100], [36, -108], [39, -116]], P.STEEL_DD, 6);
    manopla(c, 41, -123, 11, '#fde047', 0.35);
  });

  // =====================================================================
  //  LA GRAN EXCAVADORA — (x, y) = pies (base de las orugas). ~290 x 160 px a escala 1.
  //  Robot taladro de Robovill: ancho y bajito, orugas, taladro gigante y ojo-luz rojo.
  //  Punto débil: el motor brillante de atrás. o: {scale, facing, humo (bool, def. true)}
  // =====================================================================
  P2.fn.granExcavadora = safe(function (c, o) {
    var P = pal(false), T = P2.T;
    P2.elli(c, 18, -1, 132, 9, 'rgba(0,0,0,0.28)', null);
    // humo del tubo de escape (nubecitas grises)
    if (o.humo !== false) {
      c.save(); c.globalAlpha = 0.85;
      [[-73, -138, 8], [-64, -150, 10.5], [-50, -158, 8.5]].forEach(function (p) { P2.circ(c, p[0], p[1], p[2], '#cbd5e1', O, 2); });
      c.restore();
    }
    P2.rf(c, -80, -134, 13, 40, 4, P.STEEL_DD, O, 2.5);
    P2.rf(c, -83, -137, 19, 7, 3, P.DARK, O, 2);
    // MOTOR de atrás = punto débil
    bateria(c, -122, -98, 26, 46);
    // cuerpo bajo y ancho
    P2.rr(c, -104, -102, 166, 68, 20);
    c.save(); c.clip();
    c.fillStyle = P.STEEL; c.fillRect(-106, -104, 170, 72);
    c.fillStyle = P.STEEL_D; c.fillRect(-106, -56, 170, 24);
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(-92, -96, 70, 5);
    c.restore();
    P2.rf(c, -104, -102, 166, 68, 20, null, O, LW);
    P2.rf(c, -104, -70, 166, 11, 5, P.RED, O, 2);
    P2.rf(c, -70, -66, 40, 4, 2, P.RED_L, null);
    [[-94, -90], [-94, -48], [-4, -90], [52, -90], [52, -48]].forEach(function (b) { P2.circ(c, b[0], b[1], 2, '#94a3b8', O, 1); });
    marca(c, -44, -86, 10);
    // cúpula-cabeza: OJO-LUZ rojo grande + ceja + boca = una CARA que mira al taladro
    limb(c, [[-8, -128], [-12, -145]], P.STEEL_DD, 2.6);
    P2.circ(c, -13, -147, 4.5, P.RED_L, O, 2);
    c.beginPath(); c.arc(12, -101, 34, Math.PI, 0); c.closePath();
    c.fillStyle = P.STEEL_D; c.fill(); c.strokeStyle = O; c.lineWidth = LW; c.stroke();
    brillo(c, -8, -118, 5, 3, 0.3);
    P2.rf(c, -2, -127, 42, 25, 12, P.DARK, O, 2.5);
    P2.eyeLight(c, 22, -114.5, 11, P.EYE);
    P2.line(c, 9, -136, 33, -126, O, 7.5);                // ceja de "malo simpático" (baja hacia el ojo)
    P2.line(c, 9, -136, 33, -126, P.RED_L, 3.5);
    // boca-rejilla justo debajo de la cúpula (enfadada pero simpática)
    P2.rf(c, 18, -99, 26, 12, 5, P.DARK, O, 2);
    c.strokeStyle = '#94a3b8'; c.lineWidth = 2;
    [25, 31, 37].forEach(function (lx) { c.beginPath(); c.moveTo(lx, -96); c.lineTo(lx, -90); c.stroke(); });
    // ORUGAS
    P2.rf(c, -116, -40, 192, 40, 20, P.DARK, O, LW);
    for (var tx = -104; tx < 66; tx += 14) P2.rf(c, tx, -44, 8, 6, 2, P.STEEL_DD, O, 1.5);
    P2.rf(c, -108, -32, 176, 25, 12.5, P.STEEL_DD, O, 2);
    [-94, -62, -30, 2, 34, 58].forEach(function (wx, i) {
      var r = (i === 0 || i === 5) ? 9 : 10.5;
      P2.circ(c, wx, -19.5, r, P.STEEL_D, O, 2.5);
      c.save(); c.translate(wx, -19.5); c.rotate(T * 2 + i);
      c.strokeStyle = O; c.lineWidth = 2; c.beginPath(); c.moveTo(-r * 0.6, 0); c.lineTo(r * 0.6, 0); c.moveTo(0, -r * 0.6); c.lineTo(0, r * 0.6); c.stroke();
      c.restore();
      P2.circ(c, wx, -19.5, 3, '#94a3b8', O, 1.5);
    });
    // brazo del taladro
    P2.rf(c, 56, -94, 24, 54, 10, P.STEEL_DD, O, LW);
    P2.rf(c, 56, -76, 24, 9, 4, P.RED, O, 2);
    P2.circ(c, 68, -86, 2, '#94a3b8', null); P2.circ(c, 68, -50, 2, '#94a3b8', null);
    // TALADRO GIGANTE (cono con espiral roja)
    var cone = [[80, -96], [156, -67], [80, -38]];
    P2.poly(c, cone, '#cbd5e1', null);
    c.save();
    c.beginPath(); c.moveTo(cone[0][0], cone[0][1]); c.lineTo(cone[1][0], cone[1][1]); c.lineTo(cone[2][0], cone[2][1]); c.closePath(); c.clip();
    var ph = (T * 18) % 18;
    c.strokeStyle = P.RED_L; c.lineWidth = 7;
    for (var k = -1; k < 6; k++) { var sx = 72 + k * 18 + ph; c.beginPath(); c.moveTo(sx, -100); c.lineTo(sx + 18, -34); c.stroke(); }
    c.strokeStyle = O; c.lineWidth = 1.5;
    for (k = -1; k < 6; k++) { sx = 72 + k * 18 + ph; c.beginPath(); c.moveTo(sx - 3.5, -100); c.lineTo(sx + 14.5, -34); c.moveTo(sx + 3.5, -100); c.lineTo(sx + 21.5, -34); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(82, -90); c.lineTo(140, -70); c.lineTo(82, -80); c.closePath(); c.fill();
    c.restore();
    P2.poly(c, cone, null, O, LW);
    P2.elli(c, 80, -67, 7, 29, P.STEEL_D, O, LW);
    // trocitos de roca que salen volando + rayitas de giro
    [[166, -90, 6, 0.3], [172, -64, 5, 1.1], [162, -44, 4.5, 2.0]].forEach(function (r) {
      c.save(); c.translate(r[0], r[1]); c.rotate(r[3]);
      P2.poly(c, [[-r[2], -r[2] * 0.4], [-r[2] * 0.2, -r[2]], [r[2], -r[2] * 0.3], [r[2] * 0.6, r[2] * 0.8], [-r[2] * 0.6, r[2] * 0.7]], '#a16207', O, 2);
      c.restore();
    });
    c.strokeStyle = '#ffffff'; c.lineWidth = 2;
    c.beginPath(); c.arc(156, -67, 12, -1.0, -0.3); c.stroke();
    c.beginPath(); c.arc(156, -67, 12, 0.4, 1.1); c.stroke();
  });

  // =====================================================================
  //  EL DRON NODRIZA — (x, y) = CENTRO. ~300 x 190 px a escala 1 (un jefe ENORME).
  //  Dron con 2 hélices y una compuerta en la panza que suelta drones pequeños.
  //  Punto débil: la compuerta abierta (brilla en amarillo, como la batería de los demás).
  //  o: {scale, facing, abierta (bool, def. true), cria (bool, def. true: un dron asoma)}
  // =====================================================================
  P2.fn.dronNodriza = safe(function (c, o) {
    var P = pal(false), T = P2.T, abierta = o.abierta !== false;
    c.scale(1.4, 1.4);                                  // geometría base x1,4 = tamaño de jefe
    // aleta de cola con luz
    P2.poly(c, [[-80, -22], [-114, -54], [-104, -12], [-86, 6]], P.STEEL_D, O, LW);
    P2.poly(c, [[-106, -44], [-114, -54], [-110, -34]], P.RED, null);
    P2.circ(c, -113, -53, 4, P.RED_L, O, 2);
    // mástiles de las hélices
    [-58, 50].forEach(function (mx) { P2.rf(c, mx - 6, -64, 12, 28, 4, P.STEEL_DD, O, 2.5); });
    // propulsores de abajo con llamita
    [-62, 56].forEach(function (jx) {
      c.fillStyle = '#fbbf24'; c.beginPath(); c.moveTo(jx - 6, 38); c.quadraticCurveTo(jx, 62 + Math.sin(T * 9 + jx) * 2, jx + 6, 38); c.closePath(); c.fill();
      c.strokeStyle = '#f97316'; c.lineWidth = 2; c.stroke();
      P2.rf(c, jx - 10, 26, 20, 14, 5, P.DARK, O, 2.5);
    });
    // compuerta (las puertas abiertas cuelgan por debajo)
    if (abierta) {
      [[-4, 34, -16, 58, -8, 61, 4, 36], [40, 34, 52, 58, 44, 61, 32, 36]].forEach(function (d) {
        P2.poly(c, [[d[0], d[1]], [d[2], d[3]], [d[4], d[5]], [d[6], d[7]]], '#fbbf24', O, 2.5);
      });
      c.strokeStyle = O; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-6, 44); c.lineTo(0, 46); c.moveTo(-11, 52); c.lineTo(-4, 54); c.moveTo(43, 44); c.lineTo(37, 46); c.moveTo(47, 52); c.lineTo(41, 54); c.stroke();
    }
    // cuerpo
    c.beginPath(); c.ellipse(0, -2, 96, 44, 0, 0, Math.PI * 2);
    c.save(); c.clip();
    c.fillStyle = P.STEEL; c.fillRect(-98, -48, 196, 92);
    c.fillStyle = P.RED; c.fillRect(-98, 14, 196, 30);
    c.fillStyle = P.STEEL_D; c.fillRect(-98, 9, 196, 5);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(-30, -30, 34, 6, -0.05, 0, Math.PI * 2); c.fill();
    c.restore();
    P2.elli(c, 0, -2, 96, 44, null, O, LW);
    // agujero de la compuerta = PUNTO DÉBIL (halo amarillo y borde brillante)
    if (abierta) {
      halo(c, 18, 34, 30, '253,224,71', 0.6 + 0.1 * Math.sin(T * 5));
      P2.elli(c, 18, 34, 25, 8.5, GLOW, O, 2);
    }
    P2.elli(c, 18, 34, 22, 6.5, '#0b1020', O, 2.5);
    if (abierta) { c.save(); c.globalAlpha = 0.6; P2.elli(c, 18, 34, 14, 3, P.RED_L, null); c.restore(); }
    // ventanillas del hangar: drones esperando dentro (ojitos)
    [-40, -14, 12].forEach(function (wx, i) {
      P2.circ(c, wx, -16, 9, '#0f172a', O, 2.5);
      P2.circ(c, wx + 2, -15, 2.6, P.EYE, null);
      if (i !== 1) P2.circ(c, wx - 3, -16, 2.6, P.EYE, null);
      brillo(c, wx - 4, -21, 2.5, 1.5, 0.5);
    });
    marca(c, -70, -4, 10);
    [[-84, 20], [-50, 30], [80, 20]].forEach(function (b) { P2.circ(c, b[0], b[1], 2, '#fca5a5', O, 1); });
    // cara: visera con el OJO-LUZ grande
    P2.rf(c, 46, -34, 42, 9, 4.5, P.RED, O, 2.5);
    P2.circ(c, 68, -6, 21, P.DARK, O, LW);
    P2.eyeLight(c, 72, -6, 10.5, P.EYE);
    // hélices
    [-58, 50].forEach(function (hx, i) {
      c.save(); c.globalAlpha = 0.6; P2.elli(c, hx, -66, 46, 6, '#e2e8f0', null); c.restore();
      P2.elli(c, hx, -66, 46, 6, null, O, 2);
      var w = 30 + 12 * Math.cos(T * 7 + i * 1.7);
      P2.rf(c, hx - w, -69, w * 2, 6, 3, P.STEEL_DD, O, 2);
      P2.circ(c, hx, -66, 6.5, P.RED, O, 2.5);
      c.strokeStyle = '#ffffff'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(hx - 44, -76); c.lineTo(hx - 36, -78); c.moveTo(hx + 36, -78); c.lineTo(hx + 44, -76); c.stroke();
    });
    // un dron pequeño asomando por la compuerta
    if (abierta && o.cria !== false) P2.call('dronEnjambre', c, 18, 50, { scale: 0.8, facing: 1 });
  });

  // =====================================================================
  //  GUARDIÁN DE ROBOVILL — (x, y) = pies. ~195 px de alto a escala 1.
  //  Guarda las puertas de la fábrica oscura con un ESCUDO DE ENERGÍA.
  //  Partes para el trabajo en equipo: 1 puño-martillo (Peter lo bloquea),
  //  2 batería de la espalda = punto débil (Mikey dispara), 3 generador del
  //  escudo en el brazo (el Director lo hackea) y 4 botón de la cabeza (Falcon salta).
  //  o: {scale, facing, escudo (bool, def. true), hackeado (bool: generador verde, sin escudo)}
  // =====================================================================
  P2.fn.guardianRobovill = safe(function (c, o) {
    var hack = !!o.hackeado, P = pal(hack), T = P2.T, conEscudo = (o.escudo !== false) && !hack;
    P2.elli(c, 6, -1, 60, 8, 'rgba(0,0,0,0.28)', null);
    // brazo del FONDO con el puño-martillo levantado
    limb(c, [[-20, -124], [-46, -136], [-44, -160]], P.STEEL_DD, 9);
    P2.circ(c, -46, -136, 6.5, P.STEEL_D, O, 2.5);
    P2.rf(c, -64, -194, 40, 36, 12, P.STEEL_D, O, LW);
    P2.rf(c, -64, -194, 40, 12, 6, P.RED, O, 2.5);
    c.strokeStyle = O; c.lineWidth = 2;
    [-54, -44, -34].forEach(function (kx) { c.beginPath(); c.moveTo(kx, -180); c.lineTo(kx, -172); c.stroke(); });
    brillo(c, -56, -168, 4, 2.5, 0.35);
    // BATERÍA de la espalda = punto débil
    bateria(c, -56, -124, 20, 46);
    // piernas
    P2.rf(c, -30, -62, 22, 50, 8, P.STEEL_DD, O, LW);
    P2.rf(c, 6, -62, 22, 50, 8, P.STEEL_DD, O, LW);
    P2.circ(c, -19, -38, 4, '#94a3b8', O, 1.5); P2.circ(c, 17, -38, 4, '#94a3b8', O, 1.5);
    P2.rf(c, -38, -15, 34, 15, 6, P.DARK, O, LW);
    P2.rf(c, 0, -15, 40, 15, 6, P.DARK, O, LW);
    P2.rf(c, -36, -72, 72, 16, 8, P.STEEL_D, O, LW);
    // torso
    P2.rf(c, -40, -142, 80, 76, 22, P.STEEL, O, LW);
    P2.rf(c, -31, -134, 62, 36, 12, P.STEEL_D, O, 2.5);
    brillo(c, -22, -126, 6, 3, 0.3);
    marca(c, 0, -116, 12);
    P2.rf(c, -40, -93, 80, 10, 5, P.RED, O, 2);
    [[-31, -78], [31, -78]].forEach(function (b) { P2.circ(c, b[0], b[1], 2, '#94a3b8', O, 1); });
    // cabeza-casco con botón
    P2.rf(c, -8, -150, 16, 10, 3, P.STEEL_DD, O, 2);
    P2.rf(c, -10, -186, 22, 7, 3, '#fbbf24', O, 2);
    c.strokeStyle = O; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, -186); c.lineTo(-7, -179); c.moveTo(4, -186); c.lineTo(1, -179); c.stroke();
    c.beginPath(); c.arc(1, -186, 8, Math.PI, 0); c.closePath();
    c.fillStyle = '#ef4444'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    brillo(c, -2, -190, 2.5, 1.5, 0.7);
    P2.rf(c, -22, -180, 46, 36, 15, P.STEEL_D, O, LW);
    P2.rf(c, -22, -180, 46, 8, 4, P.RED, O, 2);
    P2.rf(c, -2, -169, 28, 14, 7, P.DARK, O, 2.5);
    P2.eyeLight(c, 14, -162, 5.5, P.EYE);
    P2.rf(c, 6, -153, 16, 6, 3, P.DARK, O, 1.8);
    c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5;
    [11, 16].forEach(function (lx) { c.beginPath(); c.moveTo(lx, -152); c.lineTo(lx, -148.5); c.stroke(); });
    // hombrera del frente
    P2.rf(c, 8, -142, 36, 24, 11, P.RED, O, LW);
    P2.rf(c, 11, -123, 30, 6, 3, P.STEEL_D, O, 2);
    brillo(c, 18, -136, 6, 2.5, 0.35);
    // brazo del frente con el GENERADOR del escudo
    limb(c, [[22, -124], [38, -104], [52, -101]], P.STEEL_DD, 9);
    P2.circ(c, 38, -104, 6, P.STEEL_D, O, 2.5);
    P2.rf(c, 44, -115, 24, 28, 8, P.DARK, O, LW);
    P2.circ(c, 50, -94, 2.2, hack ? '#22c55e' : '#ef4444', null);
    P2.circ(c, 57, -94, 2.2, hack ? '#22c55e' : '#fbbf24', null);
    var lens = hack ? '#86efac' : ENER_L;
    c.save(); c.globalAlpha = 0.45; P2.circ(c, 68, -103, 12, lens, null); c.restore();
    P2.circ(c, 68, -103, 7, lens, O, 2);
    P2.circ(c, 70, -105, 2, '#ffffff', null);
    if (hack) sonrisa(c, 15, -150, 4);
    // ESCUDO DE ENERGÍA (traslúcido, con celdas hexagonales)
    if (conEscudo) {
      var cx = -40, cy = -96, R = 126, a0 = -0.78, a1 = 0.78;
      c.save(); c.globalAlpha = 0.6; c.strokeStyle = ENER_L; c.lineWidth = 2;
      [[-112, -0.12], [-101, 0], [-90, 0.12]].forEach(function (b) {
        c.beginPath(); c.moveTo(74, b[0] - 0); c.lineTo(cx + (R - 13) * Math.cos(b[1]), cy + (R - 13) * Math.sin(b[1])); c.stroke();
      });
      c.restore();
      // pared traslúcida: relleno suave + banda brillante
      c.save(); c.globalAlpha = 0.2; c.fillStyle = ENER_L;
      c.beginPath(); c.arc(cx, cy, R + 13, a0, a1); c.arc(cx, cy, R - 13, a1, a0, true); c.closePath(); c.fill();
      c.restore();
      c.save();
      c.globalAlpha = 0.4 + 0.06 * Math.sin(T * 6);
      c.strokeStyle = ENER; c.lineWidth = 20; c.lineCap = 'butt';
      c.beginPath(); c.arc(cx, cy, R, a0, a1); c.stroke();
      c.restore();
      c.save(); c.strokeStyle = '#fce7f3'; c.lineWidth = 1.4; c.globalAlpha = 0.75;
      for (var a = a0 + 0.06; a < a1 - 0.03; a += 0.115) {
        for (var j = -1; j <= 1; j += 2) {
          var rr = R + j * 5, aa = a + (j > 0 ? 0.057 : 0);
          var hx = cx + rr * Math.cos(aa), hy = cy + rr * Math.sin(aa);
          c.beginPath();
          for (var q = 0; q < 6; q++) { var qa = q * Math.PI / 3; c.lineTo(hx + 5 * Math.cos(qa), hy + 5 * Math.sin(qa)); }
          c.closePath(); c.stroke();
        }
      }
      c.restore();
      c.save(); c.lineCap = 'round';
      [[R + 13, O, 4], [R - 13, O, 4], [R + 13, ENER_L, 2], [R - 13, ENER_L, 2]].forEach(function (p) {
        c.strokeStyle = p[1]; c.lineWidth = p[2]; c.beginPath(); c.arc(cx, cy, p[0], a0, a1); c.stroke();
      });
      [a0, a1].forEach(function (ea) {                  // tapas de los extremos
        var ex = Math.cos(ea), ey = Math.sin(ea);
        [[O, 4], [ENER_L, 2]].forEach(function (p) {
          c.strokeStyle = p[0]; c.lineWidth = p[1]; c.beginPath();
          c.moveTo(cx + (R - 13) * ex, cy + (R - 13) * ey); c.lineTo(cx + (R + 13) * ex, cy + (R + 13) * ey); c.stroke();
        });
      });
      c.restore();
    }
  });

  // =====================================================================
  //  PANELES
  // =====================================================================
  P2.register({
    key: 'jefes',
    title: 'Jefes y robots de la Parte 3',
    panels: [
      {
        title: 'Robot de práctica',
        subtitle: 'Capítulo 1 · lo fabrica Dark Secuaz para entrenar a Mikey y Peter',
        bg: ['#1e3a8a', '#7dd3fc'],
        render: function (c, t) {
          nube(c, 30, 110, 1.1, 0.7); nube(c, 250, 92, 0.8, 0.5); nube(c, 380, 150, 0.9, 0.55);
          // suelo de la base del cielo
          P2.rf(c, -10, 440, 500, 60, 0, '#475569', O, 3);
          P2.rf(c, -10, 440, 500, 8, 0, '#22c55e', O, 2);
          for (var i = 1; i < 6; i++) P2.circ(c, 30 + i * 84, 462, 3, '#94a3b8', O, 1.5);
          // mini Dark Secuaz (bueno) con su llave inglesa: él lo fabricó.
          // Lleva rótulo para que se entienda que es él (y no otro robot).
          P2.fn.secuaz(c, 44, 440, { scale: 0.42, good: true });
          P2.label(c, 'Dark Secuaz', 50, 461, 13, '#fdba74');
          c.save(); c.translate(80, 414); c.rotate(-0.7); c.scale(1.2, 1.2);
          P2.rf(c, -2.5, -2, 5, 18, 2, '#cbd5e1', O, 2);
          c.beginPath(); c.arc(0, -4, 6, 0.35 * Math.PI, 2.65 * Math.PI); c.fillStyle = '#cbd5e1'; c.fill(); c.strokeStyle = O; c.lineWidth = 2; c.stroke();
          P2.rf(c, -2.2, -12, 4.4, 7, 1.5, '#1e3a8a', null);
          c.restore();
          P2.fn.robotPractica(c, 186, 440, { scale: 2.2, golpe: true });
          // disparo de Mikey que va a la diana: bola + trayectoria + estrella de impacto
          c.save(); c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.setLineDash([6, 7]);
          c.beginPath(); c.moveTo(72, 249); c.lineTo(146, 236); c.stroke(); c.restore();
          if (!P2.call('bolaEnergia', c, 50, 252, { scale: 1.8, trail: 1 })) {
            c.save(); c.globalAlpha = 0.45; P2.circ(c, 50, 252, 13, '#38bdf8', null); c.restore();
            P2.circ(c, 50, 252, 8, '#7dd3fc', O, 2); P2.circ(c, 47, 249, 2.5, '#ffffff', null);
          }
          c.save(); c.translate(152, 230); P2.poly(c, [[0, -18], [5, -6], [18, -6], [8, 3], [12, 16], [0, 8], [-12, 16], [-8, 3], [-18, -6], [-5, -6]], '#fde047', O, 2.5); c.restore();
          P2.label(c, '¡+10!', 112, 206, 18, '#fde047');
          nota(c, 'ojo verde = amigo', 392, 96, 392, 102, 192, 167, '#bbf7d0');
          nota(c, 'manoplas blanditas', 392, 152, 392, 158, 292, 175, '#fef3c7');
          nota(c, '¡diana: apunta aquí!', 392, 218, 350, 224, 222, 245, '#fde047');
          nota(c, 'muelle: ¡boing!', 392, 268, 340, 274, 214, 362, '#fef3c7');
          nota(c, 'ruedas', 118, 474, 136, 462, 150, 434, '#fef3c7');
          nota(c, 'cuernos =', 74, 120, 108, 118, 152, 112, '#fdba74');
          P2.label(c, '¡hecho por', 74, 140, 12, '#fdba74');
          P2.label(c, 'Dark Secuaz!', 74, 155, 12, '#fdba74');
          // comparación a escala de juego (tamaño real)
          caja(c, 304, 290, 170, 184, '');
          P2.director(c, 334, 452, { scale: 1 });
          P2.fn.robotPractica(c, 416, 452, { scale: 1, facing: -1 });
          P2.line(c, 312, 452, 466, 452, 'rgba(254,243,199,0.6)', 2);
          P2.label(c, 'escala de juego', 389, 469, 12, '#fde68a');
        }
      },
      {
        title: 'La Gran Excavadora',
        subtitle: 'Capítulo 2 · jefe de los túneles (fusión terrestre)',
        bg: ['#1c1917', '#78350f'],
        render: function (c, t) {
          // túnel: piedras en las paredes
          c.save(); c.globalAlpha = 0.5;
          [[40, 90, 14], [140, 76, 9], [300, 84, 12], [440, 100, 16], [20, 300, 10], [460, 260, 12], [430, 200, 8]].forEach(function (p) { P2.elli(c, p[0], p[1], p[2], p[2] * 0.7, '#a8a29e', O, 2); });
          c.restore();
          P2.rf(c, -10, 330, 500, 160, 0, '#57351a', O, 3);
          P2.rf(c, -10, 330, 500, 10, 0, '#92400e', O, 2);
          c.save(); c.globalAlpha = 0.35;
          for (var i = 0; i < 14; i++) P2.circ(c, 18 + i * 34, 352 + (i % 3) * 9, 3 + (i % 2), '#d6a26b', null);
          c.restore();
          P2.fn.granExcavadora(c, 209, 330, { scale: 1.25 });
          nota(c, 'ojo-luz rojo', 318, 112, 300, 118, 240, 182, '#fecaca');
          nota(c, '¡taladro gigante!', 410, 140, 410, 146, 375, 238, '#fef3c7');
          nota(c, '¡punto débil:', 62, 376, 62, 362, 69, 246, '#fde047');
          P2.label(c, 'el motor!', 62, 393, 13, '#fde047');
          nota(c, 'orugas', 150, 420, 150, 406, 168, 316, '#fef3c7');
          nota(c, 'marca de Robovill', 170, 92, 176, 114, 154, 222, '#f9a8d4');
          P2.label(c, '(la gema copia)', 170, 108, 12, '#f9a8d4');
          caja(c, 200, 348, 272, 124, 'junto al Director (×0,5)');
          P2.line(c, 210, 458, 462, 458, 'rgba(254,243,199,0.6)', 2);
          P2.director(c, 236, 458, { scale: 0.5 });
          P2.fn.granExcavadora(c, 340, 458, { scale: 0.5, facing: -1, humo: false });
        }
      },
      {
        title: 'El Dron Nodriza',
        subtitle: 'Capítulo 3 · vigila la salida del río (fusión voladora)',
        bg: ['#0f172a', '#155e75'],
        render: function (c, t) {
          // salida de la cueva: luz al fondo a la derecha
          c.save(); c.globalAlpha = 0.25; P2.elli(c, 430, 300, 90, 120, '#a5f3fc', null); c.restore();
          // estalactitas
          [[20, 64, 34], [70, 64, 22], [420, 64, 28], [462, 64, 40]].forEach(function (p) {
            P2.poly(c, [[p[0] - 14, p[1]], [p[0] + 14, p[1]], [p[0], p[1] + p[2]]], '#334155', O, 2.5);
          });
          // agua
          P2.rf(c, -10, 398, 500, 100, 0, '#0e7490', O, 3);
          c.save(); c.globalAlpha = 0.3; P2.elli(c, 250, 404, 120, 7, '#0b1020', null); c.restore();
          c.strokeStyle = '#a5f3fc'; c.lineWidth = 2.5;
          for (var i = 0; i < 9; i++) {
            var wx = 6 + i * 56;
            c.beginPath(); c.arc(wx, 414, 10, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
          }
          P2.fn.dronNodriza(c, 248, 196, { scale: 1.1 });
          // drones pequeños que va soltando
          P2.call('dronEnjambre', c, 236, 318, { scale: 1.5, facing: -1 });
          P2.call('dronEnjambre', c, 300, 350, { scale: 1.5, facing: 1 });
          c.save(); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.setLineDash([4, 6]);
          c.beginPath(); c.moveTo(270, 288); c.quadraticCurveTo(250, 300, 240, 300); c.stroke();
          c.beginPath(); c.moveTo(284, 288); c.quadraticCurveTo(300, 310, 300, 330); c.stroke();
          c.restore();
          nota(c, 'hélices', 74, 92, 90, 98, 140, 98, '#fef3c7');
          nota(c, 'ojo-luz', 436, 110, 436, 116, 362, 188, '#fecaca');
          nota(c, 'compuerta:', 404, 296, 366, 292, 300, 254, '#fde047');
          P2.label(c, '¡suelta drones!', 404, 313, 13, '#fde047');
          P2.label(c, '(punto débil)', 404, 330, 13, '#fde047');
          nota(c, 'drones esperando', 64, 246, 112, 234, 186, 172, '#fecaca', 12);
          nota(c, 'marca de Robovill', 96, 300, 110, 286, 140, 192, '#f9a8d4');
          caja(c, 10, 340, 214, 132, 'junto al Director (×0,4)');
          // roca de la orilla: el Director está en tierra firme, no en el agua
          P2.rf(c, 16, 444, 52, 18, 7, '#475569', O, 2.5);
          P2.rf(c, 18, 442, 48, 6, 3, '#4ade80', O, 2);
          P2.director(c, 40, 444, { scale: 0.4 });
          P2.fn.dronNodriza(c, 126, 402, { scale: 0.4, facing: -1, cria: false });
        }
      },
      {
        title: 'Guardián de Robovill',
        subtitle: 'Capítulo 4 · protege las puertas de la fábrica oscura',
        bg: ['#18122b', '#3b0764'],
        render: function (c, t) {
          // puertas de la fábrica: marco de peligro, dos hojas con ranura y cartel de Robovill
          P2.rf(c, 30, 104, 250, 250, 14, '#1e1b2e', O, 3);
          c.save();
          P2.rr(c, 36, 110, 238, 246, 10); c.strokeStyle = '#facc15'; c.lineWidth = 10; c.stroke();
          c.setLineDash([12, 12]); c.strokeStyle = '#111827'; c.stroke();
          c.restore();
          P2.rf(c, 30, 104, 250, 250, 14, null, O, 3);
          P2.rf(c, 44, 118, 108, 236, 8, '#312e4a', O, 2.5);
          P2.rf(c, 158, 118, 108, 236, 8, '#312e4a', O, 2.5);
          for (var i = 0; i < 4; i++) { P2.rf(c, 52, 140 + i * 52, 92, 8, 3, '#4c1d95', null); P2.rf(c, 166, 140 + i * 52, 92, 8, 3, '#4c1d95', null); }
          P2.line(c, 155, 118, 155, 352, '#0b0716', 6);                        // ranura entre las hojas
          P2.rf(c, 132, 70, 46, 30, 8, '#0f0a1e', O, 2.5);                      // cartel
          marca(c, 155, 85, 9);
          P2.rf(c, -10, 352, 500, 20, 0, '#27272a', O, 3);
          P2.fn.guardianRobovill(c, 168, 352, { scale: 1.3 });
          badge(c, 1, 64, 110);  P2.line(c, 74, 112, 88, 118, '#fbbf24', 2);
          badge(c, 2, 76, 222);
          badge(c, 3, 232, 254);
          badge(c, 4, 200, 100);
          // leyenda (el número = la pieza)
          var leg = [['puño-martillo', '#fef3c7'], ['batería: punto débil', '#fde047'], ['generador del escudo', '#f9a8d4'], ['botón de apagado', '#fecaca']];
          leg.forEach(function (l, k) { badge(c, k + 1, 318, 90 + k * 25); P2.label(c, l[0], 334, 95 + k * 25, 12, l[1], 'left'); });
          c.save(); c.translate(318, 190);
          c.beginPath(); for (var q = 0; q < 6; q++) { var qa = q * Math.PI / 3; c.lineTo(10 * Math.cos(qa), 10 * Math.sin(qa)); }
          c.closePath(); c.fillStyle = ENER; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
          P2.circ(c, -2, -3, 2.5, '#fce7f3', null);
          c.restore();
          P2.label(c, 'escudo de energía', 334, 195, 12, ENER_L, 'left');
          // comparación
          caja(c, 316, 212, 156, 140, 'junto al Director (×0,5)');
          P2.director(c, 342, 342, { scale: 0.5 });
          P2.fn.guardianRobovill(c, 428, 342, { scale: 0.5, facing: -1 });
          // esquema de TRABAJO EN EQUIPO
          caja(c, 8, 362, 464, 112, '');
          P2.label(c, '¡Trabajo en equipo! (We Are a Team)', 240, 380, 14, '#fde68a');
          P2.label(c, 'el número = la pieza del guardián', 240, 395, 12, '#fef3c7');
          var cols = [66, 184, 302, 420], fy = 440;
          miniHeroe(c, cols[0] - 14, fy, 0.55, 'peter');
          c.save(); c.translate(cols[0] + 32, fy - 28);
          P2.poly(c, [[0, -11], [3, -3], [11, -2], [4, 3], [7, 11], [0, 6], [-7, 11], [-4, 3], [-11, -2], [-3, -3]], '#fde047', O, 2); c.restore();
          P2.label(c, '¡clinc!', cols[0] + 34, fy - 6, 12, '#fde047');
          miniHeroe(c, cols[1] - 14, fy, 0.55, 'mikey');
          if (!P2.call('bolaEnergia', c, cols[1] + 30, fy - 22, { scale: 1.3, trail: 1 })) {
            c.save(); c.globalAlpha = 0.45; P2.circ(c, cols[1] + 28, fy - 22, 11, '#38bdf8', null); c.restore();
            P2.circ(c, cols[1] + 28, fy - 22, 6.5, '#7dd3fc', O, 2); P2.circ(c, cols[1] + 26, fy - 24, 2, '#ffffff', null);
          }
          P2.director(c, cols[2] - 14, fy, { scale: 0.55 });
          P2.rf(c, cols[2] + 10, fy - 34, 28, 22, 5, '#0f172a', O, 2.5);
          P2.label(c, '>_', cols[2] + 24, fy - 18, 12, '#4ade80');
          P2.falcon(c, cols[3] - 14, fy, { scale: 0.55 });
          var ax = cols[3] + 22, ay = fy - 38;
          P2.poly(c, [[ax, ay], [ax + 12, ay + 14], [ax + 5, ay + 14], [ax + 5, ay + 28], [ax - 5, ay + 28], [ax - 5, ay + 14], [ax - 12, ay + 14]], '#fbbf24', O, 2.5);
          var txt = [['Peter bloquea', 'el puño'], ['Mikey dispara', 'a la batería'], ['Director hackea', 'el escudo'], ['Falcon salta', 'al botón']];
          cols.forEach(function (x, k) {
            badge(c, k + 1, x - 44, 412);
            P2.label(c, txt[k][0], x, 455, 12, '#fef3c7');
            P2.label(c, txt[k][1], x, 469, 12, '#fde68a');
            if (k < 3) P2.label(c, '→', x + 59, 455, 14, '#fbbf24');
          });
        }
      }
    ]
  });
})();
