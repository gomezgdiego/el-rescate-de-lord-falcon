// fusiones.js — PROTOTIPO Parte 3 "We Are a Team": las FUSIONES de los robots.
// Idea de Papá: en las batallas importantes, los héroes FUSIONAN sus robots.
// Regla: UN jugador maneja el robot fusionado y cada uno de los demás dispara SU
// cañón con una tecla (por eso cada fusión marca el cañón de cada héroe).
//
//   · FUSIÓN TERRESTRE «Titán Turbo» (jefe del cap. 2, la Gran Excavadora):
//       robot transformable del Director (azul/cian: piernas con ruedas, tronco con
//       su cabina, hombro-rueda) + robot-moto de Mikey (blanco/naranja: casco-cabeza
//       con Mikey dentro, rueda trasera a la espalda, brazo con los 3 lanzadores).
//       Cañones: Mikey = 3 lanzadores del brazo · Director = cañón-pulso del hombro.
//   · FUSIÓN VOLADORA «Titán Tormenta» (jefe del cap. 3, el Dron Nodriza):
//       submarino-nave de Peter (amarillo/negro/verde: tronco-cápsula con Peter en el
//       ojo de buey, turbo a la espalda, brazo con el escudo-rueda de Juanjo) +
//       mecha-halcón de Falcon (verde/marrón: alas de plumas de metal, cabeza de
//       halcón con Falcon, patas-garra).
//       Cañones: Peter = escudo-cañón · Falcon = plumas-dardo de las alas.
//   · FUSIÓN FINAL «WE ARE A TEAM» (contra Robovill): DARK SECUAZ (bueno, verde) es
//       el CUERPO; encima, las alas y el casco-cresta del mecha-halcón (Falcon), el
//       coche del Director en el hombro de atrás, la cápsula de Mikey con los 3
//       lanzadores en el hombro de delante y el submarino de Peter con el escudo en
//       el puño. Emblema del equipo (4 colores) en el pecho. Los 4 pilotos se ven.
//
// Exporta (nunca lanzan; c.save()/c.restore()):
//   P2.fn.fusionTerrestre(c, x, piesY, {scale, facing})   ~225 px de alto a escala 1
//   P2.fn.fusionVoladora(c, x, centroY, {scale, facing})  ~230 px (vuela: se ancla en su centro)
//   P2.fn.fusionFinal(c, x, piesY, {scale, facing})       ~330 px (¡la más grande!)
(function () {
  'use strict';
  var O = P2.OUTLINE || '#1a1a2e', PI = Math.PI;
  var H = P2.PAL.hacked;

  // ---------- Paletas (las de cada vehículo hackeado) ----------
  var D = { BODY: '#3b82f6', BODY2: '#1e3a8a', DARK: '#1e2b5c', DEEP: '#0f172a', ACC: '#22d3ee', ACC2: '#0891b2',
            LAMP: '#a5f3fc', TIRE: '#1f2430' };
  var MK = { COAT: '#f8fafc', COAT2: '#cbd5e1', ORANGE: '#f97316', ORANGE_D: '#c2410c', DARK: '#334155', DEEP: '#1f2937',
             SN: '#f43f5e', PI: '#fbbf24', MG: '#a855f7', ENERGY: '#60a5fa', TIRE: '#1f2430' };
  var PT = { SUIT: '#facc15', SUIT_D: '#eab308', BELLY: '#fef9c3', BLACK: '#1f2937', DARK: '#3f3f46',
             GREEN: '#22c55e', GREEN_D: '#15803d', RIVET: '#86efac' };
  var F = { GREEN: '#22c55e', GREEN2: '#16a34a', GDARK: '#14532d', BROWN: '#78350f', BROWN_D: '#4a2108',
            PLATE: '#d1d5db', PLATE_D: '#9ca3af', TIP: '#22c55e', TIP_D: '#15803d', MASK: '#9ca3af',
            THROAT: '#fef3c7', BEAK: '#94a3b8', BEAK_D: '#4b5563', GOLD: '#facc15' };
  var EYE = H.EYE;
  // colores de las etiquetas de cada héroe
  var COL = { director: '#67e8f9', falcon: '#86efac', mikey: '#fdba74', peter: '#fde047', secuaz: '#4ade80' };

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  // =====================================================================
  //  Piezas comunes
  // =====================================================================
  function limb(c, x1, y1, x2, y2, w, fill, lw) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy);
    c.save(); c.translate(x1, y1); c.rotate(Math.atan2(dy, dx));
    P2.rf(c, -w / 2, -w / 2, L + w, w, w / 2, fill, O, lw || 3);
    c.restore();
  }
  function tube(c, pts, col, w) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    [[O, w + 5], [col, w]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    });
    c.restore();
  }
  function smile(c, x, y, r) {
    c.strokeStyle = O; c.lineWidth = 2.5;
    c.beginPath(); c.arc(x, y, r, 0.15 * PI, 0.85 * PI); c.stroke();
  }

  // ---------- Pilotos dentro de las cabinas ----------
  // Dibuja al héroe real (busto) con la cabeza llenando una ventana de alto h cuyo borde de arriba es y.
  var TOP = { director: 62, falcon: 58, mikey: 72, peter: 66 };
  function hero(c, who, x, y, h) {
    var top = TOP[who] || 62, k = h / (top - 18), fy = y + 2 + top * k;
    if (who === 'director') P2.director(c, x, fy, { scale: k, facing: 1 });
    else if (who === 'falcon') P2.falcon(c, x, fy, { scale: k, facing: 1 });
    else if (P2.fn && typeof P2.fn[who] === 'function') P2.fn[who](c, x - 1.5 * k, fy, { variant: 'A', scale: k, facing: 1 });
    else { P2.circ(c, x, y + h * 0.55, h * 0.35, '#f2c49b', O, 2); }
  }
  function glassGrad(c, y, h, g0, g1) {
    var g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, g0); g.addColorStop(1, g1);
    return g;
  }
  // Cabina rectangular redondeada
  function cabin(c, who, x, y, w, h, r, g0, g1) {
    c.save();
    P2.rr(c, x, y, w, h, r); c.fillStyle = glassGrad(c, y, h, g0 || '#cffafe', g1 || '#67e8f9'); c.fill();
    c.clip();
    hero(c, who, x + w * 0.5, y, h);
    c.globalAlpha = 0.45; c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(x + w * 0.7, y); c.lineTo(x + w * 0.84, y); c.lineTo(x + w * 0.6, y + h); c.lineTo(x + w * 0.46, y + h);
    c.closePath(); c.fill();
    c.restore();
    P2.rf(c, x, y, w, h, r, null, O, 2.5);
  }
  // Cabina-burbuja (redonda) con aro de color
  function bubble(c, who, cx, cy, r, ring, rivet) {
    P2.circ(c, cx, cy, r + 4, ring, O, 3);
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, PI * 2);
    c.fillStyle = glassGrad(c, cy - r, r * 2, '#ecfeff', '#a5f3fc'); c.fill(); c.clip();
    hero(c, who, cx, cy - r * 0.95, r * 1.7);
    c.globalAlpha = 0.5; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1.5, r * 0.15); c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, r * 0.75, 1.1 * PI, 1.45 * PI); c.stroke();
    c.restore();
    P2.circ(c, cx, cy, r, null, O, 2.5);
    if (rivet) {
      for (var i = 0; i < 6; i++) {
        var a = i * PI / 3 + 0.3;
        P2.circ(c, cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), 1.4, rivet, null);
      }
    }
  }

  // ---------- Ruedas ----------
  // Rueda del robot del Director (llanta cian)
  function dWheel(c, x, y, r) {
    P2.circ(c, x, y, r, D.TIRE, O, 3);
    c.strokeStyle = '#3a4152'; c.lineWidth = Math.max(1.5, r * 0.08);
    c.beginPath(); c.arc(x, y, r * 0.8, 0, PI * 2); c.stroke();
    P2.circ(c, x, y, r * 0.58, D.ACC, O, 2.5);
    P2.circ(c, x, y, r * 0.3, D.DEEP, O, 2);
    for (var b = 0; b < 5; b++) {
      var a = b * PI * 2 / 5 - PI / 2;
      P2.circ(c, x + Math.cos(a) * r * 0.44, y + Math.sin(a) * r * 0.44, Math.max(1.2, r * 0.07), '#e2e8f0', null);
    }
  }
  // Rueda de la moto de Mikey (radios naranjas)
  function mWheel(c, x, y, r) {
    P2.circ(c, x, y, r, MK.TIRE, O, 3);
    c.strokeStyle = '#3a4152'; c.lineWidth = Math.max(1.5, r * 0.08);
    c.beginPath(); c.arc(x, y, r * 0.8, 0, PI * 2); c.stroke();
    P2.circ(c, x, y, r * 0.62, MK.DARK, O, 2.5);
    c.strokeStyle = MK.ORANGE; c.lineWidth = Math.max(2, r * 0.14); c.lineCap = 'round';
    for (var b = 0; b < 5; b++) {
      var a = b * PI * 2 / 5 - 1.2;
      c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
      c.lineTo(x + Math.cos(a) * r * 0.56, y + Math.sin(a) * r * 0.56); c.stroke();
    }
    P2.circ(c, x, y, r * 0.22, MK.ORANGE, O, 2);
  }

  // ---------- Los 3 lanzadores de Mikey (bloque en x,y; apuntan a +x) ----------
  function launchers(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    var lw = Math.min(2, 2.6 / s);
    P2.rf(c, 12, -15, 38, 5, 2.5, MK.SN, O, lw);
    P2.rf(c, 20, -18, 8, 3, 1.5, MK.DEEP, O, lw * 0.8);
    P2.circ(c, 51, -12.5, 2.6, MK.ENERGY, O, lw * 0.8);
    P2.rf(c, 12, -8, 22, 7, 3, MK.PI, O, lw);
    P2.circ(c, 35, -4.5, 3, MK.ENERGY, O, lw * 0.8);
    P2.rf(c, 12, 0, 16, 9, 3, MK.MG, O, lw);
    [1.5, 4.5, 7.5].forEach(function (yy) { P2.rf(c, 27, yy - 1.2, 9, 2.4, 1, '#cbd5e1', O, lw * 0.5); });
    P2.circ(c, 37, 4.5, 2.4, MK.ENERGY, O, lw * 0.8);
    P2.rf(c, 0, -18, 16, 29, 5, MK.DARK, O, lw * 1.2);
    P2.circ(c, 8, -3, 3, MK.ORANGE, O, lw * 0.8);
    c.restore();
  }
  // ---------- Escudo-rueda de Peter (la idea de Juanjo: radios verdes y negros) ----------
  function shield(c, x, y, r, rot) {
    c.save(); c.translate(x, y);
    P2.circ(c, 0, 0, r, PT.BLACK, O, 3);
    P2.circ(c, 0, 0, r * 0.8, '#e5e7eb', O, 2);
    c.save(); c.rotate(rot || 0);
    for (var i = 0; i < 8; i++) {
      c.save(); c.rotate(i * PI / 4);
      P2.rf(c, r * 0.15, -r * 0.1, r * 0.62, r * 0.2, r * 0.08, i % 2 ? PT.BLACK : PT.GREEN, O, 1.6);
      c.restore();
    }
    c.restore();
    P2.circ(c, 0, 0, r * 0.25, PT.BLACK, O, 2);
    P2.circ(c, 0, 0, r * 0.12, '#4ade80', null);
    for (var k = 0; k < 8; k++) {
      var b = k * PI / 4 + PI / 8 + (rot || 0);
      P2.circ(c, Math.cos(b) * r * 0.9, Math.sin(b) * r * 0.9, Math.max(1, r * 0.055), PT.RIVET, null);
    }
    c.globalAlpha = 0.45; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, r * 0.1);
    c.beginPath(); c.arc(0, 0, r * 0.66, PI * 1.08, PI * 1.42); c.stroke(); c.globalAlpha = 1;
    c.restore();
  }

  // ---------- Plumas de metal y alas (las del mecha-halcón de Falcon) ----------
  function bladePath(c, len, w) {
    var h = w / 2;
    c.beginPath();
    c.moveTo(h, -h);
    c.lineTo(len - w * 1.5, -h);
    c.quadraticCurveTo(len - w * 0.35, -h, len, h * 0.45);
    c.lineTo(len - w * 0.8, h);
    c.lineTo(len - w * 1.1, h * 0.35);
    c.lineTo(len - w * 1.4, h);
    c.lineTo(h, h);
    c.arc(h, 0, h, PI / 2, PI * 1.5);
    c.closePath();
  }
  function blade(c, x, y, ang, len, w, fill, tip, lw) {
    c.save(); c.translate(x, y); c.rotate(ang);
    bladePath(c, len, w);
    c.fillStyle = fill; c.fill();
    c.save(); c.clip();
    c.fillStyle = tip; c.fillRect(len - w * 1.25, -w, w * 1.4, w * 2);
    c.restore();
    c.strokeStyle = 'rgba(26,26,46,0.35)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(w * 0.55, 0); c.lineTo(len - w * 1.45, 0); c.stroke();
    bladePath(c, len, w);
    c.strokeStyle = O; c.lineWidth = lw || 2.5; c.stroke();
    c.restore();
  }
  function scallops(c, x0, y0, cols, rows, dx, dy, r, col) {
    c.strokeStyle = col; c.lineWidth = 1.8;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = x0 + i * dx + (j % 2) * dx * 0.5, y = y0 + j * dy;
        c.beginPath(); c.arc(x, y, r, 0.15 * PI, 0.85 * PI); c.stroke();
      }
    }
  }
  // Ala derecha (left = espejo). rot = giro (más negativo = más levantada). s = tamaño.
  function wing(c, sx, sy, left, rot, s) {
    var plate = left ? F.PLATE_D : F.PLATE, tip = left ? F.TIP_D : F.TIP;
    var cover = left ? F.GDARK : F.GREEN, arm = left ? F.BROWN_D : F.BROWN;
    var L = 78;
    c.save(); c.translate(sx, sy); c.scale(left ? -s : s, s); c.rotate(rot);
    [[0.36, 1.5, 32], [0.56, 1.3, 36], [0.76, 1.08, 40]].forEach(function (f) { blade(c, L * f[0], 6, f[1], f[2], 13, plate, tip); });
    [[0.3, -1.4, 32], [0.5, -1.2, 38], [0.7, -1.0, 42]].forEach(function (f) { blade(c, L * f[0], -8, f[1], f[2], 13, plate, tip); });
    [[-0.78, 42], [-0.4, 48], [-0.02, 46], [0.36, 40], [0.74, 34]].forEach(function (f) { blade(c, L - 6, 2, f[0], f[1], 13, plate, tip); });
    c.save();
    P2.rr(c, -4, -12, L + 4, 30, 14); c.fillStyle = cover; c.fill();
    c.clip(); scallops(c, 6, -2, 8, 2, 9, 8, 4.5, 'rgba(26,26,46,0.35)');
    c.restore();
    P2.rf(c, -4, -12, L + 4, 30, 14, null, O, 2.5);
    P2.rf(c, -2, -14, L + 2, 10, 5, arm, O, 2.5);
    P2.circ(c, L - 2, -9, 3, plate, O, 2);
    c.restore();
  }
  // Lanzador de plumas-dardo (cañón de Falcon), apunta a +x
  function dartPod(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    P2.rf(c, -10, -8, 24, 16, 6, F.BROWN, O, 2.5);
    [-3.5, 3.5].forEach(function (d) {
      P2.rf(c, 10, d - 2.6, 16, 5.2, 2.6, F.GOLD, O, 2);
      P2.rf(c, 13, d - 2.6, 3, 5.2, 1, '#ffffff', null);
      P2.poly(c, [[25, d - 3.5], [32, d], [25, d + 3.5]], F.TIP, O, 1.8);
    });
    P2.circ(c, -2, 0, 3, F.GOLD, O, 1.5);
    c.restore();
  }
  // Uña de la garra (dir = hacia dónde apunta)
  function claw(c, x, y, dir, s) {
    c.beginPath();
    c.moveTo(x - dir * 2 * s, y - 3.2 * s);
    c.quadraticCurveTo(x + dir * 9 * s, y - 4 * s, x + dir * 8 * s, y + 4.5 * s);
    c.quadraticCurveTo(x + dir * 4.5 * s, y + 0.5 * s, x - dir * 2 * s, y + 3 * s);
    c.closePath();
    c.fillStyle = '#94a3b8'; c.fill();
    c.strokeStyle = O; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke();
  }
  // V amarilla del halcón
  function emblemV(c, x, y, s) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x - 7 * s, y - 3 * s); c.lineTo(x, y + 4 * s); c.lineTo(x + 7 * s, y - 3 * s);
    c.strokeStyle = O; c.lineWidth = 3.4 * s + 3; c.stroke();
    c.strokeStyle = F.GOLD; c.lineWidth = 3.4 * s; c.stroke();
    c.restore();
  }
  // Cabeza-casco de halcón (verde, máscara gris, pico de metal, ojo-luz VERDE)
  function hawkHead(c, hx, hy, r) {
    var st = 1.1, rx = r * st;
    var ex = hx + r * 0.32 * st, ey = hy - r * 0.16;
    blade(c, hx - rx * 0.5, hy - r * 0.55, PI + 0.55, r * 0.95, r * 0.42, F.GDARK, F.TIP_D);
    blade(c, hx - rx * 0.7, hy - r * 0.1, PI + 0.25, r * 0.85, r * 0.4, F.GDARK, F.TIP_D);
    P2.elli(c, hx, hy, rx, r, F.GREEN, O, 3);
    c.save();
    c.beginPath(); c.ellipse(hx, hy, rx, r, 0, 0, PI * 2); c.clip();
    P2.elli(c, hx + r * 0.55, hy + r * 0.72, rx * 0.45, r * 0.35, F.THROAT, null);
    c.beginPath();
    c.moveTo(hx - rx * 1.2, hy + r * 0.9);
    c.lineTo(hx - rx * 0.25, hy + r * 0.25);
    c.quadraticCurveTo(hx + rx * 0.2, hy - r * 0.45, hx + rx * 1.2, hy - r * 0.42);
    c.lineTo(hx + rx * 1.2, hy - r * 1.2); c.lineTo(hx - rx * 1.2, hy - r * 1.2);
    c.closePath(); c.fillStyle = F.GDARK; c.fill();
    c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    P2.rr(c, hx - rx * 0.15, hy - r * 0.45, rx * 1.3, r * 0.58, r * 0.28);
    c.fillStyle = F.MASK; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    c.restore();
    P2.elli(c, hx, hy, rx, r, null, O, 3);
    var bx = hx + r * 0.8 * st;
    c.beginPath();
    c.moveTo(bx - r * 0.15, hy - r * 0.42);
    c.quadraticCurveTo(bx + r * 0.5, hy - r * 0.46, bx + r * 0.7, hy + r * 0.08);
    c.quadraticCurveTo(bx + r * 0.72, hy + r * 0.36, bx + r * 0.56, hy + r * 0.46);
    c.quadraticCurveTo(bx + r * 0.52, hy + r * 0.3, bx + r * 0.32, hy + r * 0.26);
    c.lineTo(bx - r * 0.15, hy + r * 0.28);
    c.closePath();
    c.fillStyle = F.BEAK; c.fill();
    c.save(); c.clip();
    c.fillStyle = F.BEAK_D; c.fillRect(bx + r * 0.5, hy - r, r, r * 2);
    c.fillStyle = F.GOLD; c.fillRect(bx - r * 0.3, hy - r, r * 0.38, r * 2);
    c.restore();
    c.strokeStyle = O; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke();
    P2.eyeLight(c, ex, ey, r * 0.27, EYE);
    c.beginPath(); c.arc(ex, ey, r * 0.38, 0, PI * 2);
    c.strokeStyle = O; c.lineWidth = r * 0.13 + 2.5; c.stroke();
    c.strokeStyle = F.GOLD; c.lineWidth = r * 0.13; c.stroke();
  }
  // Llama de turbo (apunta hacia -x)
  function flame(c, x, y, len, w) {
    c.save(); c.globalAlpha = 0.95;
    P2.poly(c, [[x, y - w], [x - len, y], [x, y + w]], '#fb923c', O, 2);
    P2.poly(c, [[x, y - w * 0.55], [x - len * 0.62, y], [x, y + w * 0.55]], '#fde68a', null);
    P2.poly(c, [[x, y - w * 0.25], [x - len * 0.3, y], [x, y + w * 0.25]], '#ffffff', null);
    c.restore();
  }

  // =====================================================================
  //  FUSIÓN TERRESTRE «Titán Turbo» (pies en 0,0; mira a la derecha)
  //  Dibujo interno de ~272 px; se dibuja a 0,83 → ~225 px a escala 1.
  // =====================================================================
  var TERR_K = 0.83;
  function dLeg(c, cx, far) {
    P2.rf(c, cx - 15, -116, 30, 50, 10, far ? D.DARK : D.BODY2, O, 3);
    // carenado blanco y naranja de la moto por fuera del muslo
    P2.rf(c, cx - 13, -112, 26, 24, 9, far ? MK.COAT2 : MK.COAT, O, 2.5);
    P2.rf(c, cx - 13, -96, 26, 6, 3, far ? MK.ORANGE_D : MK.ORANGE, O, 2);
    P2.rf(c, cx - 17, -72, 34, 58, 11, far ? D.BODY2 : D.BODY, O, 3);
    // franja naranja en la espinilla (¡medio moto!)
    P2.rf(c, cx - 17, -52, 34, 7, 3, far ? MK.ORANGE_D : MK.ORANGE, O, 2.5);
    dWheel(c, cx + (cx < 0 ? -1 : 1) * 19, -36, 13.5);
    P2.circ(c, cx, -70, 8, D.ACC, O, 2.5);
    P2.rf(c, cx - 20, -17, 46, 17, 7, D.DEEP, O, 3);
    P2.rf(c, cx + 17, -14, 8, 11, 3, D.ACC, O, 2);
  }
  function drawTerrestre(c) {
    P2.elli(c, 4, -1, 78, 10, 'rgba(0,0,0,0.25)', null);
    // tubos de escape de la moto: salen por ENCIMA de los hombros, con llamita
    [[-64, -258, 0], [-46, -266, 1]].forEach(function (p) {
      c.save(); c.translate(p[0], p[1] - 4); c.rotate(PI / 2);
      flame(c, 0, 0, 20 + p[2] * 4, 6);
      c.restore();
    });
    tube(c, [[-50, -196], [-64, -224], [-64, -256]], '#cbd5e1', 8);
    tube(c, [[-36, -200], [-46, -232], [-46, -264]], '#cbd5e1', 8);
    P2.rf(c, -71, -262, 14, 10, 3, MK.DARK, O, 2); P2.rf(c, -53, -270, 14, 10, 3, MK.DARK, O, 2);
    // rueda trasera de la moto de Mikey, a la espalda
    limb(c, -30, -176, -70, -184, 10, MK.DARK);
    mWheel(c, -74, -186, 32);
    // brazo trasero (Director): puño azul
    limb(c, -50, -188, -70, -150, 20, D.DARK);
    limb(c, -70, -150, -64, -112, 22, MK.COAT2);
    P2.rf(c, -78, -136, 22, 6, 3, MK.ORANGE_D, O, 2);
    P2.circ(c, -70, -150, 7, D.ACC, O, 2.5);
    P2.rf(c, -80, -118, 30, 30, 10, D.BODY2, O, 3);
    P2.rf(c, -56, -116, 8, 26, 4, D.ACC, O, 2);
    // piernas del robot del Director (ruedas en los gemelos)
    dLeg(c, -26, true); dLeg(c, 26, false);
    P2.rf(c, -46, -128, 92, 20, 9, D.DEEP, O, 3);
    // ---- tronco = el robot del Director ----
    c.save();
    P2.rr(c, -56, -210, 112, 88, 24); c.fillStyle = D.BODY; c.fill(); c.clip();
    c.fillStyle = D.BODY2;
    c.beginPath(); c.moveTo(-58, -214); c.lineTo(-38, -214); c.lineTo(-46, -144); c.lineTo(-58, -144); c.closePath(); c.fill();
    c.fillRect(-60, -144, 120, 24);
    c.restore();
    P2.line(c, -56, -144, 56, -144, O, 2.5);
    // franja naranja de Mikey + franja cian del Director: ¡están unidos!
    P2.rf(c, -56, -160, 112, 8, 4, D.ACC, O, 2.5);
    P2.rf(c, -56, -152, 112, 6, 3, MK.ORANGE, O, 2);
    [-38, 38].forEach(function (lx) {
      P2.rf(c, lx - 9, -138, 18, 11, 5, D.LAMP, O, 2.5);
      P2.circ(c, lx - 3, -134, 2, '#ffffff', null);
    });
    P2.rf(c, -56, -210, 112, 88, 24, null, O, 3);
    // hebilla con el rayo de la moto «Rayo»
    P2.rf(c, -14, -142, 28, 20, 7, D.DEEP, O, 2.5);
    P2.poly(c, [[2, -139], [-6, -131], [0, -131], [-3, -124], [6, -133], [0, -133]], MK.ORANGE, O, 1.5);
    // cabina del Director en el pecho
    cabin(c, 'director', -26, -203, 52, 40, 13);
    // ---- cabeza = el casco de la robot-moto de Mikey ----
    P2.rf(c, -10, -226, 20, 20, 5, D.DEEP, O, 2.5);
    P2.poly(c, [[-14, -262], [-46, -276], [-34, -246]], MK.ORANGE, O, 3);        // aleta
    P2.horns(c, 2, -270, 0.7, H.RED_L);
    P2.rf(c, -28, -274, 58, 54, 20, MK.COAT, O, 3);
    P2.rf(c, -28, -236, 58, 8, 4, MK.ORANGE, O, 2.5);
    cabin(c, 'mikey', -10, -266, 34, 30, 10, '#e0f2fe', '#7dd3fc');
    // mandíbula con el ojo-luz verde y la sonrisa
    P2.rf(c, 6, -232, 30, 14, 6, MK.DEEP, O, 2.5);
    P2.eyeLight(c, 26, -225.5, 3.6, EYE);
    smile(c, 15, -226, 4);
    // hombro de delante = rueda del coche del Director
    P2.circ(c, 58, -190, 10, D.DEEP, O, 2.5);
    // ---- brazo de delante = brazo de la moto de Mikey con los 3 lanzadores ----
    limb(c, 58, -188, 80, -152, 18, MK.COAT2);
    P2.circ(c, 80, -152, 7, MK.ORANGE, O, 2.5);
    limb(c, 80, -152, 104, -138, 22, MK.COAT);
    P2.rf(c, 84, -146, 22, 7, 3.5, MK.ORANGE, O, 2);
    launchers(c, 104, -134, 1.25);
    // hombro = la rueda DELANTERA de la moto de Mikey, con su guardabarros naranja
    mWheel(c, 60, -192, 20);
    c.save(); c.lineCap = 'round';
    [[O, 13], [MK.ORANGE, 7.5]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.arc(60, -192, 26, PI * 1.08, PI * 1.92); c.stroke();
    });
    c.restore();
    // ---- cañón-pulso del Director, encima del hombro ----
    P2.rf(c, 44, -232, 30, 14, 5, D.DEEP, O, 2.5);
    c.save(); c.translate(62, -230); c.rotate(-0.18);
    P2.rf(c, -6, -9, 50, 16, 7, D.BODY2, O, 3);
    P2.rf(c, 8, -9, 6, 16, 2, D.ACC, O, 2);
    P2.rf(c, 22, -9, 6, 16, 2, D.ACC, O, 2);
    P2.rf(c, 42, -11, 10, 20, 4, D.DEEP, O, 2.5);
    c.globalAlpha = 0.5; P2.circ(c, 54, -1, 9, D.ACC, null); c.globalAlpha = 1;
    P2.circ(c, 53, -1, 4.5, D.LAMP, O, 2);
    c.restore();
  }
  // Puntos clave (coordenadas internas) para etiquetas de los paneles
  var TERR_PTS = {
    mikeyGun: [158, -140], dirGun: [114, -244], mikey: [8, -252], director: [0, -184],
    wheelBack: [-84, -190], legs: [26, -40], head: [-20, -262], arm: [92, -146]
  };

  // =====================================================================
  //  FUSIÓN VOLADORA «Titán Tormenta» (centro en 0,0; mira a la derecha)
  //  ~232 px de alto a escala 1.
  // =====================================================================
  function drawVoladora(c) {
    c.save(); c.rotate(0.08);
    // ala lejana y cercana (detrás del tronco)
    wing(c, -18, -46, true, -0.5, 1.05);
    wing(c, 14, -46, false, -0.5, 1.05);
    // lanzadores de plumas-dardo en el ala cercana (cañón de Falcon)
    // turbo de la nave de Peter a la espalda (con llama)
    flame(c, -66, 6, 56, 13);
    P2.rf(c, -70, -10, 30, 32, 9, PT.DARK, O, 3);
    P2.circ(c, -66, 6, 6, '#fde68a', O, 2);
    P2.poly(c, [[-48, -14], [-80, -34], [-66, -8]], PT.BLACK, O, 2.5);
    P2.poly(c, [[-48, 26], [-80, 46], [-66, 20]], PT.BLACK, O, 2.5);
    // brazo de atrás (verde, puño-garra marrón)
    limb(c, -34, -36, -52, -2, 18, F.GDARK);
    limb(c, -52, -2, -46, 30, 20, F.GREEN2);
    P2.rf(c, -58, 24, 26, 24, 9, F.BROWN_D, O, 3);
    [30, 37, 44].forEach(function (yy) { claw(c, -34, yy, 1, 0.9); });
    // patas-garra del halcón (encogidas, como al volar)
    tube(c, [[-16, 36], [-26, 62], [-18, 84]], F.BROWN_D, 10);
    [-22, -16, -10].forEach(function (xx, i) { claw(c, xx + 2, 86 + i * 0.5, 1, 0.95); });
    tube(c, [[14, 36], [12, 64], [24, 86]], F.BROWN, 11);
    [20, 26, 32].forEach(function (xx) { claw(c, xx + 2, 88, 1, 1.05); });
    // tronco = la cápsula del submarino de Peter, de pie
    c.save();
    P2.rr(c, -44, -66, 88, 108, 38); c.fillStyle = PT.SUIT; c.fill(); c.clip();
    c.fillStyle = PT.SUIT_D; c.fillRect(-50, 14, 100, 30);
    c.fillStyle = PT.BLACK; c.fillRect(-50, -2, 100, 9); c.fillRect(-50, 12, 100, 5);
    c.restore();
    P2.rf(c, -44, -66, 88, 108, 38, null, O, 3);
    P2.line(c, -44, 14, 44, 14, O, 2);
    // ventanitas del submarino
    [[-24, 28], [-8, 28]].forEach(function (p) { P2.circ(c, p[0], p[1], 5, '#a5f3fc', O, 2); P2.circ(c, p[0] - 1.5, p[1] - 1.5, 1.4, '#fff', null); });
    // V del halcón en el cinturón
    emblemV(c, 22, 26, 1.1);
    // ojo de buey con Peter
    bubble(c, 'peter', 4, -28, 21, PT.BLACK, PT.RIVET);
    // hombreras = aletas del submarino
    P2.poly(c, [[-26, -62], [-58, -74], [-50, -48]], PT.BLACK, O, 2.5);
    // cabeza de halcón con Falcon en la burbuja
    P2.rf(c, -10, -80, 22, 18, 6, PT.BLACK, O, 2.5);
    blade(c, -26, -114, -2.75, 36, 14, F.PLATE_D, F.TIP_D);
    blade(c, -24, -116, -2.25, 40, 15, F.PLATE_D, F.TIP_D);
    blade(c, -20, -118, -1.8, 40, 15, F.PLATE, F.TIP);
    hawkHead(c, 8, -94, 24);
    bubble(c, 'falcon', -16, -110, 13, F.BROWN, null);
    // brazo de delante (amarillo) con el ESCUDO-CAÑÓN de Peter
    limb(c, 30, -44, 58, -24, 18, PT.SUIT_D);
    P2.circ(c, 30, -44, 10, PT.BLACK, O, 2.5);
    P2.circ(c, 58, -24, 7, PT.GREEN, O, 2.5);
    limb(c, 58, -24, 86, -32, 20, PT.SUIT);
    P2.rf(c, 64, -38, 8, 14, 3, PT.BLACK, O, 2);
    // boca del cañón detrás del escudo (asoma por arriba y por abajo)
    P2.rf(c, 84, -58, 22, 52, 8, PT.DARK, O, 2.5);
    shield(c, 102, -32, 34, 0.2);
    // lanzador de plumas-dardo (cañón de Falcon), sobre el ala de delante y ENCIMA de todo
    dartPod(c, 64, -94, 1.6);
    c.restore();
  }
  // Puntos clave (antes de la inclinación de 0,08 rad: aproximados)
  var VOL_PTS = { peterGun: [104, -24], falconGun: [75, -88], peter: [6, -28], falcon: [-16, -108],
                  wings: [-70, -110], turbo: [-70, 8], head: [16, -94], claws: [20, 84] };

  // =====================================================================
  //  FUSIÓN FINAL «WE ARE A TEAM» (pies en 0,0; mira a la derecha). ~330 px
  //  Cuerpo = Dark Secuaz bueno (P2.fn.secuaz) a 1,35.
  // =====================================================================
  var SK = 1.35;
  function teamBadge(c, x, y, r) {
    var cols = [D.BODY, F.GREEN, MK.ORANGE, PT.SUIT];
    P2.circ(c, x, y, r + 3, PT.BLACK, O, 3);
    for (var i = 0; i < 4; i++) {
      c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, -PI / 2 + i * PI / 2, -PI / 2 + (i + 1) * PI / 2); c.closePath();
      c.fillStyle = cols[i]; c.fill(); c.strokeStyle = O; c.lineWidth = 2; c.stroke();
    }
    // estrella blanca en el centro (el equipo)
    var pts = [];
    for (var k = 0; k < 10; k++) {
      var a = -PI / 2 + k * PI / 5, rr = (k % 2) ? r * 0.28 : r * 0.62;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    P2.poly(c, pts, '#ffffff', O, 2);
  }
  function drawFinal(c, o) {
    // aura verde de equipo (opcional: solo en el panel de presentación)
    if (o && o.aura) { c.save(); c.globalAlpha = 0.18; P2.elli(c, 0, -160, 150, 170, H.RED_L, null); c.restore(); }
    // ---- ALAS del mecha-halcón (Falcon), a la espalda ----
    wing(c, -58, -182, true, -0.6, 1.3);
    wing(c, 58, -182, false, -0.6, 1.3);
    // ---- cresta del casco de halcón (asoma por detrás de la cabeza) ----
    blade(c, -18, -276, -2.5, 46, 17, F.PLATE_D, F.TIP_D);
    blade(c, -12, -280, -2.0, 50, 18, F.PLATE_D, F.TIP_D);
    blade(c, -4, -282, -1.6, 48, 18, F.PLATE, F.TIP);
    // ---- EL CUERPO: Dark Secuaz (bueno y verde) ----
    P2.fn.secuaz(c, 0, 0, { scale: SK, good: true, angle: -0.12 });
    // casco del halcón sobre la cúpula: la burbuja de Falcon con la V dorada
    bubble(c, 'falcon', -4, -270, 16, F.BROWN, null);
    emblemV(c, -4, -246, 0.9);
    // emblema del equipo en el pecho (4 colores = 4 héroes)
    teamBadge(c, 0, -136, 19);
    // ---- hombro de atrás: el coche del Director con su cabina ----
    c.save(); c.translate(-90, -192); c.scale(1.4, 1.4);
    P2.poly(c, [[-34, 6], [-30, -10], [-14, -16], [22, -16], [34, -4], [34, 8], [-34, 8]], D.BODY, O, 3);
    P2.rf(c, -34, -2, 68, 6, 3, D.ACC, O, 2);
    dWheel(c, -20, 12, 10); dWheel(c, 20, 12, 10);
    P2.rf(c, 28, -8, 8, 7, 3, D.LAMP, O, 2);
    // cañón-pulso del Director en el techo del coche (dispara en diagonal hacia arriba)
    c.save(); c.translate(-20, -16); c.rotate(-0.85);
    P2.rf(c, -4, -7, 40, 14, 6, D.BODY2, O, 2.5);
    P2.rf(c, 10, -7, 5, 14, 2, D.ACC, O, 2);
    P2.rf(c, 32, -9, 10, 18, 4, D.DEEP, O, 2.5);
    c.globalAlpha = 0.5; P2.circ(c, 44, 0, 8, D.ACC, null); c.globalAlpha = 1;
    P2.circ(c, 43, 0, 4, D.LAMP, O, 2);
    c.restore();
    cabin(c, 'director', -6, -32, 28, 22, 9);
    c.restore();
    // ---- hombro de delante: la robot-moto de Mikey (2 ruedas + carenado naranja) ----
    c.save(); c.translate(80, -186);
    mWheel(c, -16, 8, 15); mWheel(c, 40, 8, 15);
    P2.poly(c, [[-30, 2], [-22, -10], [46, -10], [58, 0], [54, 6], [-28, 8]], MK.ORANGE, O, 3);
    P2.rf(c, -24, -4, 74, 5, 2.5, MK.ORANGE_D, null);
    P2.rf(c, -12, -38, 46, 32, 11, MK.COAT, O, 3);
    P2.rf(c, -12, -16, 46, 6, 3, MK.ORANGE, O, 2);
    cabin(c, 'mikey', -6, -35, 24, 19, 7, '#e0f2fe', '#7dd3fc');
    launchers(c, 32, -20, 1.3);
    c.restore();
    // ---- puño de delante: el submarino de Peter con el ESCUDO ----
    c.save(); c.translate(98, -84);
    P2.poly(c, [[-22, -20], [-40, -32], [-34, -14]], PT.BLACK, O, 2.5);
    P2.rf(c, -30, -22, 74, 44, 22, PT.SUIT, O, 3);
    c.save(); P2.rr(c, -30, -22, 74, 44, 22); c.clip();
    c.fillStyle = PT.SUIT_D; c.fillRect(-32, 8, 80, 16);
    c.fillStyle = PT.BLACK; c.fillRect(-18, -24, 7, 50);
    c.restore();
    P2.rf(c, -30, -22, 74, 44, 22, null, O, 3);
    bubble(c, 'peter', 10, -2, 14, PT.BLACK, PT.RIVET);
    shield(c, 56, 0, 36, 0.15);
    c.restore();
    // lanzador de plumas-dardo (Falcon) en el ala de delante, encima de todo
    dartPod(c, 138, -268, 1.4);
  }
  var FIN_PTS = { body: [0, -110], wings: [-118, -262], falconPod: [-4, -270], director: [-79, -221],
                  mikey: [86, -212], peter: [108, -86], shield: [154, -84], badge: [0, -136],
                  mikeyGun: [160, -212], peterGun: [154, -84], dirGun: [-78, -260], falconGun: [141, -268], secuazGun: [80, -244] };

  // ---------- Exportadas ----------
  function wrap(fn, k) {
    return function (c, x, y, o) {
      if (!c || !c.save) return;
      o = o || {};
      c.save();
      try {
        var s = num(o.scale, 1); if (s <= 0) s = 1;
        var f = o.facing === -1 ? -1 : 1;
        c.translate(num(x, 0), num(y, 0)); c.scale(s * f * k, s * k);
        c.lineJoin = 'round'; c.lineCap = 'round';
        fn(c, o);
      } catch (e) { if (window.console && console.warn) console.warn('[fusiones]', e); }
      c.restore();
    };
  }
  P2.fn.fusionTerrestre = wrap(drawTerrestre, TERR_K);
  P2.fn.fusionVoladora = wrap(drawVoladora, 1);
  P2.fn.fusionFinal = wrap(drawFinal, 1);

  // =====================================================================
  //  Utilidades de los paneles
  // =====================================================================
  function arrow(c, x0, y0, cx, cy, x1, y1, col) {
    var ang = Math.atan2(y1 - cy, x1 - cx);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    [[O, 9], [col, 4.5]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1 - Math.cos(ang) * 6, y1 - Math.sin(ang) * 6); c.stroke();
    });
    c.translate(x1, y1); c.rotate(ang);
    P2.poly(c, [[4, 0], [-11, -9], [-11, 9]], col, O, 2.5);
    c.restore();
  }
  function textW(c, t, size) {
    c.save(); c.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    var w = c.measureText(t).width; c.restore(); return w;
  }
  // Etiqueta de CAÑÓN: caja con el color del héroe + línea + diana sobre el cañón
  function gunTag(c, txt, tx, ty, px, py, col) {
    var w = textW(c, txt, 13) + 30, h = 22;
    var bx = tx - w / 2, by = ty - h / 2;
    var sx = Math.max(bx, Math.min(bx + w, px)), sy = py < by ? by : (py > by + h ? by + h : ty);
    P2.line(c, sx, sy, px, py, O, 5);
    P2.line(c, sx, sy, px, py, col, 2);
    c.save(); c.globalAlpha = 0.9; P2.rf(c, bx, by, w, h, 8, '#0f172a', null); c.restore();
    P2.rf(c, bx, by, w, h, 8, null, col, 2.5);
    // diana pequeña dentro de la caja
    P2.circ(c, bx + 12, ty, 5.5, null, col, 2); P2.circ(c, bx + 12, ty, 1.8, col, null);
    P2.label(c, txt, bx + 22, ty + 4.5, 13, col, 'left');
    // diana sobre el cañón
    P2.circ(c, px, py, 8, null, O, 5); P2.circ(c, px, py, 8, null, col, 2.5);
    P2.circ(c, px, py, 2.5, col, O, 1.5);
  }
  function callout(c, text, tx, ty, px, py, col, align) {
    P2.line(c, tx, ty, px, py, O, 5);
    P2.line(c, tx, ty, px, py, '#fef3c7', 2);
    P2.circ(c, px, py, 3.5, '#fef3c7', O, 2);
    P2.label(c, text, tx, ty + (ty < py ? -5 : 15), 13, col || '#fef3c7', align);
  }
  function glow(c, x, y, r, col) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, PI * 2); c.fill();
  }
  function sparkle(c, x, y, s, col) {
    P2.poly(c, [[x, y - 9 * s], [x + 2.5 * s, y - 2.5 * s], [x + 9 * s, y], [x + 2.5 * s, y + 2.5 * s],
      [x, y + 9 * s], [x - 2.5 * s, y + 2.5 * s], [x - 9 * s, y], [x - 2.5 * s, y - 2.5 * s]], col, O, 2);
  }
  function burst(c, x, y, r, n, fill, rot) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var a = (rot || 0) + i * PI / n, rr = (i % 2) ? r * 0.55 : r * (i % 4 === 0 ? 1 : 0.85);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    P2.poly(c, pts, fill, O, 3);
  }
  function cloud(c, x, y, s, a) {
    c.save(); c.globalAlpha = a || 0.75; c.fillStyle = '#ffffff';
    [[0, 0, 18], [20, -8, 22], [42, 0, 17], [20, 6, 18]].forEach(function (p) {
      c.beginPath(); c.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, PI * 2); c.fill();
    });
    c.restore();
  }
  // caja de "pieza" (fuente de la fusión)
  function pieceBox(c, x, y, w, h, col) {
    c.save(); c.globalAlpha = 0.55; P2.rf(c, x, y, w, h, 12, '#0f172a', null); c.restore();
    P2.rf(c, x, y, w, h, 12, null, col, 2.5);
  }
  // punto (coordenadas internas) → panel
  function at(X, Y, S, k, p) { return [X + p[0] * S * k, Y + p[1] * S * k]; }
  // Bola de energía de Mikey
  function ball(c, x, y, r, col) {
    c.save(); c.globalAlpha = 0.35; P2.circ(c, x, y, r * 1.9, col || MK.ENERGY, null); c.restore();
    P2.circ(c, x, y, r, col || '#3b82f6', O, 2);
    P2.circ(c, x, y, r * 0.5, '#dbeafe', null);
  }
  function speedLines(c, x, y, len, n, col) {
    c.save(); c.globalAlpha = 0.6;
    for (var i = 0; i < n; i++) P2.line(c, x - (i % 2) * 12, y + i * 9, x - len - (i % 2) * 12, y + i * 9, col || '#fef3c7', 3);
    c.restore();
  }

  // =====================================================================
  //  Paneles
  // =====================================================================
  // Opciones de nombre para que Juanjo elija (2 líneas, abajo a la izquierda)
  function nameChoice(c, l1, l2, x, y) {
    P2.label(c, l1, x, y, 12, '#fef3c7');
    if (l2) P2.label(c, l2, x, y + 16, 12, '#fef3c7');
  }
  // Tornillo que sale volando (del mini-robot roto)
  function screw(c, x, y, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    P2.rf(c, -2, -1, 9, 4, 1.5, '#cbd5e1', O, 1.5);
    P2.rf(c, -5, -3.5, 4, 8, 1.5, '#94a3b8', O, 1.5);
    c.restore();
  }

  P2.register({
    key: 'fusiones',
    title: 'Fusiones: ¡We Are a Team!',
    panels: [
      // ---------------------------------------------------------------
      {
        title: 'Fusión terrestre: «Titán Turbo»',
        subtitle: 'Moto de Mikey + robot del Director · contra la Gran Excavadora (cap. 2)',
        bg: ['#1c1917', '#78350f'],
        render: function (c) {
          // túnel: arco de roca arriba y vigas de madera a los lados
          c.beginPath(); c.moveTo(0, 64); c.lineTo(480, 64); c.lineTo(480, 250);
          c.quadraticCurveTo(472, 84, 240, 78); c.quadraticCurveTo(8, 84, 0, 250); c.closePath();
          c.fillStyle = '#0c0a09'; c.fill(); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
          [[40, 74, 16], [110, 70, 12], [430, 80, 15], [370, 70, 11], [14, 130, 10], [466, 140, 11]].forEach(function (p) {
            P2.elli(c, p[0], p[1], p[2], p[2] * 0.6, '#292524', O, 2);
          });
          [[0, 14], [466, 14]].forEach(function (b) {
            P2.rf(c, b[0], 150, b[1], 312, 3, '#92400e', O, 3);
            P2.line(c, b[0] + 7, 170, b[0] + 7, 440, 'rgba(26,26,46,0.35)', 2);
          });
          P2.rf(c, -4, 142, 488, 14, 4, '#78350f', O, 3);
          // suelo de tierra y rocas
          c.fillStyle = '#451a03'; c.fillRect(0, 462, 480, 18);
          P2.line(c, 0, 462, 480, 462, O, 3);
          [[30, 470], [150, 474], [400, 470]].forEach(function (p) { P2.elli(c, p[0], p[1], 10, 4, '#78350f', O, 2); });
          var X = 296, Y = 460, S = 1.24, k = TERR_K;
          glow(c, X, 300, 170, 'rgba(251,146,60,0.30)');
          // ---- las piezas ----
          pieceBox(c, 8, 72, 132, 150, COL.mikey);
          P2.fn.robotMoto(c, 82, 196, { variant: 'A', modo: 'robot', scale: 0.82 });
          P2.label(c, 'Robot-moto de Mikey', 74, 214, 12, COL.mikey);
          P2.label(c, '+', 74, 248, 30, '#fbbf24');
          pieceBox(c, 8, 262, 132, 150, COL.director);
          P2.fn.transformableRobot(c, 80, 388, { variant: 'A', scale: 0.82 });
          P2.label(c, 'Robot del Director', 74, 404, 12, COL.director);
          // ---- el Titán ----
          P2.fn.fusionTerrestre(c, X, Y, { scale: S });
          var pHead = at(X, Y, S, k, TERR_PTS.head), pWheel = at(X, Y, S, k, TERR_PTS.wheelBack),
              pLegs = at(X, Y, S, k, [-40, -60]);
          arrow(c, 122, 110, 170, 86, pHead[0] - 6, pHead[1] - 4, COL.mikey);          // casco → cabeza
          arrow(c, 134, 150, 190, 170, pWheel[0] - 30, pWheel[1], COL.mikey);         // rueda → espalda
          arrow(c, 134, 300, 190, 300, pLegs[0] - 30, pLegs[1] - 30, COL.director);   // robot → piernas y tronco
          P2.label(c, 'casco = cabeza', 196, 100, 12, '#fed7aa');
          P2.label(c, 'rueda = espalda', 168, 194, 12, '#fed7aa');
          P2.label(c, 'tronco y piernas', 178, 326, 12, '#a5f3fc');
          // ---- cañones ----
          var mgun = at(X, Y, S, k, TERR_PTS.mikeyGun), dgun = at(X, Y, S, k, TERR_PTS.dirGun);
          gunTag(c, 'Cañón de Mikey', 404, 356, mgun[0] - 10, mgun[1], COL.mikey);
          P2.label(c, '(3 lanzadores)', 404, 384, 12, '#fed7aa');
          gunTag(c, 'Cañón del Director', 368, 104, dgun[0], dgun[1], COL.director);
          P2.label(c, 'cañón-pulso', 368, 132, 12, '#a5f3fc');
          nameChoice(c, 'Nombre: ¿Titán Turbo,', 'Moto-Titán o Turbo-Rayo?', 96, 432);
        }
      },
      // ---------------------------------------------------------------
      {
        title: 'Fusión voladora: «Titán Tormenta»',
        subtitle: 'Nave de Peter + mecha-halcón de Falcon · contra el Dron Nodriza (cap. 3)',
        bg: ['#0c4a6e', '#7dd3fc'],
        render: function (c) {
          // agua del río a la salida (abajo)
          c.fillStyle = '#0369a1'; c.fillRect(0, 440, 480, 40);
          c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#e0f2fe'; c.lineWidth = 3;
          for (var i = 0; i < 8; i++) { c.beginPath(); c.arc(30 + i * 62, 446, 14, 1.1 * PI, 1.9 * PI); c.stroke(); }
          c.restore();
          P2.line(c, 0, 440, 480, 440, O, 3);
          cloud(c, 230, 420, 0.8, 0.5);
          var X = 306, Y = 274, S = 1.1;
          glow(c, X, Y, 170, 'rgba(254,240,138,0.35)');
          speedLines(c, 200, 330, 60, 4, '#e0f2fe');
          // ---- las piezas: el halcón ARRIBA (va a las alas y la cabeza) y el submarino ABAJO (va al tronco) ----
          pieceBox(c, 8, 72, 132, 150, COL.falcon);
          P2.fn.mechaHalcon(c, 72, 140, { variant: 'A', modo: 'vuelo', scale: 0.64 });
          P2.label(c, 'Mecha-halcón', 74, 196, 12, COL.falcon);
          P2.label(c, 'de Falcon', 74, 212, 12, COL.falcon);
          P2.label(c, '+', 74, 248, 30, '#fbbf24');
          pieceBox(c, 8, 262, 132, 150, COL.peter);
          P2.fn.submarinoNave(c, 76, 336, { variant: 'A', modo: 'nave', scale: 0.62, estela: false });
          P2.label(c, 'Submarino-nave', 74, 386, 12, COL.peter);
          P2.label(c, 'de Peter', 74, 402, 12, COL.peter);
          // ---- el Titán ----
          P2.fn.fusionVoladora(c, X, Y, { scale: S });
          var pBody = at(X, Y, S, 1, [-40, 0]), pWing = at(X, Y, S, 1, [-80, -120]), pHead = at(X, Y, S, 1, [-10, -126]);
          arrow(c, 128, 96, 170, 74, pHead[0] - 18, pHead[1] - 10, COL.falcon);      // halcón → cabeza
          arrow(c, 134, 150, 180, 160, pWing[0], pWing[1] + 20, COL.falcon);         // halcón → alas
          arrow(c, 134, 330, 200, 330, pBody[0] - 10, pBody[1] + 20, COL.peter);     // cápsula → tronco
          P2.label(c, 'alas y cabeza', 196, 196, 12, '#bbf7d0');
          P2.label(c, 'cápsula = tronco', 196, 354, 12, '#fef08a');
          // ---- cañones ----
          var pg = at(X, Y, S, 1, VOL_PTS.peterGun), fg = at(X, Y, S, 1, VOL_PTS.falconGun);
          gunTag(c, 'Cañón de Peter', 384, 410, pg[0] + 4, pg[1] + 4, COL.peter);
          gunTag(c, 'Cañón de Falcon', 380, 84, fg[0], fg[1], COL.falcon);
          P2.label(c, '¡escudo-cañón!', 400, 436, 12, '#fef08a');
          P2.label(c, 'plumas-dardo', 380, 112, 12, '#bbf7d0');
          nameChoice(c, 'Nombre: ¿Titán Tormenta, Halcón-Trueno o Ala-Escudo?', null, 180, 468);
        }
      },
      // ---------------------------------------------------------------
      {
        title: 'FUSIÓN FINAL: ¡WE ARE A TEAM!',
        subtitle: 'Los 4 vehículos + Dark Secuaz (¡el cuerpo!) = el robot más grande',
        bg: ['#1e1b4b', '#7c3aed'],
        render: function (c) {
          var X = 236, Y = 470, S = 1.0;
          glow(c, X, 300, 230, 'rgba(250,204,21,0.40)');
          [[24, 226, 0.7], [458, 250, 0.8], [40, 120, 0.6]].forEach(function (p) { sparkle(c, p[0], p[1], p[2], '#fde68a'); });
          P2.fn.fusionFinal(c, X, Y, { scale: S, aura: true });
          // lema grande
          P2.label(c, '¡WE ARE A TEAM!', 240, 104, 34, '#fde68a');
          P2.label(c, '¡Somos un equipo!', 240, 126, 13, '#fef3c7');
          function P(p) { return at(X, Y, S, 1, p); }
          // de dónde sale cada parte
          callout(c, 'alas: Falcon', 52, 262, P(FIN_PTS.wings)[0], P(FIN_PTS.wings)[1], COL.falcon);
          callout(c, 'cuerpo: ¡Dark Secuaz!', 92, 454, P([-40, -70])[0], P([-40, -70])[1], COL.secuaz);
          callout(c, 'emblema', 70, 392, P(FIN_PTS.badge)[0] - 18, P(FIN_PTS.badge)[1] + 6, '#fef3c7');
          // EL CAÑÓN DE CADA HÉROE (cada uno dispara el suyo con una tecla)
          var sg = P(FIN_PTS.secuazGun), dg = P(FIN_PTS.dirGun), fg = P(FIN_PTS.falconGun),
              mg = P(FIN_PTS.mikeyGun), pg = P(FIN_PTS.peterGun);
          gunTag(c, 'Cañón de Dark Secuaz', 132, 152, sg[0], sg[1], COL.secuaz);
          P2.label(c, '(dispara solo)', 132, 178, 12, '#bbf7d0');
          gunTag(c, 'Cañón del Director', 96, 314, dg[0], dg[1], COL.director);
          gunTag(c, 'Cañón de Falcon', 392, 160, fg[0], fg[1], COL.falcon);
          gunTag(c, 'Cañón de Mikey', 400, 318, mg[0], mg[1], COL.mikey);
          gunTag(c, 'Escudo de Peter', 394, 452, pg[0], pg[1] + 10, COL.peter);
        }
      },
      // ---------------------------------------------------------------
      {
        title: '¡Contra Robovill!',
        subtitle: 'La pelea de gigantes final · todo a la misma escala (×¾)',
        bg: ['#1e1b4b', '#be185d'],
        render: function (c) {
          var S = 0.75, RX = 402, RY = 456;
          // arena: fábrica oscura con focos
          c.save(); c.globalAlpha = 0.18; c.fillStyle = '#fde68a';
          P2.poly(c, [[60, 64], [100, 64], [200, 470], [20, 470]], '#fde68a', null);
          P2.poly(c, [[380, 64], [420, 64], [470, 470], [290, 470]], '#fde68a', null);
          c.restore();
          c.fillStyle = '#1e293b'; c.fillRect(0, 456, 480, 24);
          c.fillStyle = '#7f1d1d'; c.fillRect(0, 462, 480, 5);
          P2.line(c, 0, 456, 480, 456, O, 3);
          // Robovill (variante A, mirando a la izquierda, alas cerradas para que quepa)
          var hasRV = typeof (P2.fn && P2.fn.robovill) === 'function';
          if (hasRV) P2.fn.robovill(c, RX, RY, { variant: 'A', scale: S, facing: -1, brazo: 'martillo', alas: 'cerradas', taladro: 0.4 });
          else P2.fn.secuaz(c, RX, RY, { scale: 1.2 });
          // su ataque: ¡lluvia de mini-robots!
          var minis = [[196, 168, 0], [262, 196, 1], [318, 150, 2]];
          if (P2.fn.miniRobot) minis.forEach(function (m) { P2.fn.miniRobot(c, m[0], m[1], { scale: 0.6, facing: -1, cayendo: true }); });
          var fx = 150, fy = 456;
          var mg = at(fx, fy, S, 1, FIN_PTS.mikeyGun), fg = at(fx, fy, S, 1, FIN_PTS.falconGun),
              dg = at(fx, fy, S, 1, FIN_PTS.dirGun);
          // la fusión final
          P2.fn.fusionFinal(c, fx, fy, { scale: S });
          // el martillo de Robovill, ENCIMA, chocando contra el escudo de Peter
          var wx = RX - 114 * S, wy = RY - 104 * S;
          if (P2.fn.robovillBrazo) P2.fn.robovillBrazo(c, wx, wy, { tipo: 'martillo', scale: S, facing: -1 });
          // Director: pulsos en diagonal contra un mini-robot que cae... ¡pop!
          var tx = minis[0][0], ty = minis[0][1];
          [0.28, 0.52, 0.76].forEach(function (u, i) {
            ball(c, dg[0] + (tx - dg[0]) * u, dg[1] + (ty - dg[1]) * u, 5 + i, '#22d3ee');
          });
          burst(c, tx, ty, 18, 7, '#a5f3fc', 0.3);
          burst(c, tx, ty, 9, 5, '#ffffff', 0.1);
          screw(c, tx - 22, ty - 14, -0.6); screw(c, tx + 20, ty - 18, 0.8); screw(c, tx + 4, ty + 22, 2.1);
          P2.label(c, '¡pop!', tx - 4, ty - 24, 14, '#a5f3fc');
          // Mikey: bolas de energía a la GEMA COPIA (su punto débil)
          var gx = RX - 14 * S, gy = RY - 110 * S;
          [0.22, 0.45, 0.68].forEach(function (u, i) {
            ball(c, mg[0] + (gx - mg[0]) * u, mg[1] + (gy - mg[1]) * u, 5 + i);
          });
          sparkle(c, gx - 4, gy - 2, 1.2, '#fde68a');
          // Falcon: plumas-dardo hacia la cabeza de Robovill
          [[fg[0] + 26, fg[1] + 2], [fg[0] + 56, fg[1] + 6]].forEach(function (d) {
            c.save(); c.translate(d[0], d[1]); c.rotate(0.15);
            P2.rf(c, -12, -3, 20, 6, 3, F.GOLD, O, 2);
            P2.poly(c, [[7, -4], [15, 0], [7, 4]], F.TIP, O, 1.8);
            c.restore();
          });
          // ¡choque! escudo de Peter contra el martillo de Robovill (en el borde de contacto)
          var hx = fx + 154 * S + 26, hy = fy - 84 * S - 4;
          c.save(); c.globalAlpha = 0.9;
          [[-1.9, 46], [-2.5, 42], [-0.9, 44], [1.9, 42], [2.5, 40]].forEach(function (r) {
            P2.line(c, hx + Math.cos(r[0]) * 28, hy + Math.sin(r[0]) * 28, hx + Math.cos(r[0]) * r[1], hy + Math.sin(r[0]) * r[1], '#fff7ed', 4);
          });
          c.restore();
          burst(c, hx, hy, 24, 9, '#fbbf24', 0.2);
          burst(c, hx, hy, 14, 7, '#fff7ed', 0.5);
          P2.label(c, '¡CLONK!', hx - 6, hy - 34, 18, '#fde68a');
          // cada héroe dispara SU cañón (una tecla cada uno)
          P2.label(c, 'Director', tx - 52, ty + 20, 12, COL.director);
          P2.label(c, 'Falcon', fg[0] + 44, fg[1] - 14, 12, COL.falcon);
          P2.label(c, 'Mikey', mg[0] + 40, mg[1] + 2, 12, COL.mikey);
          P2.label(c, 'Peter', hx - 30, hy + 50, 12, COL.peter);
          P2.label(c, '¡CHOQUE FINAL!', 240, 104, 28, '#fde68a');
          // escala de juego: un héroe a la misma escala
          P2.director(c, 30, 456, { scale: S });
          P2.falcon(c, 58, 456, { scale: S });
          P2.label(c, 'héroes', 44, 404, 12, '#fef3c7');
          P2.label(c, 'Robovill', RX + 30, 236, 13, '#fecaca');
        }
      }
    ]
  });
})();
