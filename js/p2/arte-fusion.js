// fusion.js — PROTOTIPO Parte 2: FUSIÓN GIGANTE y PELEA DE GIGANTES (fase 3 del jefe).
// Dark Secuaz une todas sus torretas y se hace GIGANTE; los héroes fusionan sus
// robots hackeados (Bólido del Director + Gran halcón de Falcon, variantes A) en
// un robot enorme azul y verde: "TITÁN HALCÓN" (nombre provisional).
//   · Del Bólido (azul/cian): cuerpo-cabina del Director, piernas, ruedas en
//     hombros y gemelos, faros y franja de carreras.
//   · Del Gran halcón (verde/marrón): alas de plumas de metal a la espalda,
//     cabeza-casco de halcón con cresta y la cabina de Falcon, puños-garra
//     (muñeca y puño marrones con uñas grises, como las «Garras de metal»).
//   · Ojo-luz y faros VERDES/cian claro: es un robot hackeado (regla del juego).
// Exporta:
//   P2.fn.robotFusion(c, x, piesY, {scale, facing, pose:'guardia'|'puño'})  ~250 px a escala 1
//   P2.fn.secuazGigante(c, x, piesY, {scale, facing})                       ~260 px a escala 1
(function () {
  'use strict';
  var O = P2.OUTLINE, PI = Math.PI;
  var D = P2.PAL.director, F = P2.PAL.falcon, H = P2.PAL.hacked, E = P2.PAL.enemy;
  // Paleta del robot de los héroes (mismos colores que el Bólido A y el Gran halcón A)
  var HB = {
    BODY: D.SUIT2, BODY2: D.SUIT, DARK: '#1e2b5c', DEEP: D.VEST, ACC: D.CYAN, ACC2: '#0891b2',
    LAMP: '#a5f3fc', TIRE: '#1f2430',
    GREEN: F.GREEN, GREEN2: '#16a34a', GDARK: F.DARK, BROWN: F.BROWN, BROWN_D: '#4a2108',
    PLATE: '#d1d5db', PLATE_D: F.MASK, TIP: F.GREEN, TIP_D: H.RED,
    THROAT: '#fef3c7', BEAK: '#94a3b8', BEAK_D: '#4b5563', GOLD: '#facc15', EYE: H.EYE
  };
  // Paleta de las torretas del ejército (para P2.fn.turretHead)
  var TP = { RED: E.RED, RED_L: E.RED_L, EYE: E.EYE };

  // =====================================================================
  //  Piezas comunes
  // =====================================================================
  // Extremidad entre dos articulaciones (como en el transformable)
  function limb(c, x1, y1, x2, y2, w, fill, lw) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy);
    c.save(); c.translate(x1, y1); c.rotate(Math.atan2(dy, dx));
    P2.rf(c, -w / 2, -w / 2, L + w, w, w / 2, fill, O, lw || 3);
    c.restore();
  }
  // Trazo grueso con contorno
  function tube(c, pts, col, w) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.strokeStyle = O; c.lineWidth = w + 5; c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.stroke();
    c.restore();
  }
  // Rueda del Bólido: neumático, llanta cian, buje y tornillos
  function wheel(c, x, y, r) {
    P2.circ(c, x, y, r, HB.TIRE, O, 3);
    c.strokeStyle = '#3a4152'; c.lineWidth = Math.max(1.5, r * 0.08);
    c.beginPath(); c.arc(x, y, r * 0.8, 0, PI * 2); c.stroke();
    P2.circ(c, x, y, r * 0.58, HB.ACC, O, 2.5);
    P2.circ(c, x, y, r * 0.3, HB.DEEP, O, 2);
    for (var b = 0; b < 5; b++) {
      var a = b * PI * 2 / 5 - PI / 2;
      P2.circ(c, x + Math.cos(a) * r * 0.44, y + Math.sin(a) * r * 0.44, Math.max(1.2, r * 0.07), '#e2e8f0', null);
    }
    P2.circ(c, x - r * 0.1, y - r * 0.1, r * 0.09, '#ffffff', null);
  }
  // Pluma-cuchilla del Gran halcón (base redonda, punta afilada y muesca)
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
  // Escamas de plumas (arcos) dentro de la zona recortada actual
  function scallops(c, x0, y0, cols, rows, dx, dy, r, col) {
    c.strokeStyle = col; c.lineWidth = 1.8;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = x0 + i * dx + (j % 2) * dx * 0.5, y = y0 + j * dy;
        c.beginPath(); c.arc(x, y, r, 0.15 * PI, 0.85 * PI); c.stroke();
      }
    }
  }
  // V amarilla de halcón (emblema del pecho de Lord Falcon)
  function emblemV(c, x, y, s) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x - 7 * s, y - 3 * s); c.lineTo(x, y + 4 * s); c.lineTo(x + 7 * s, y - 3 * s);
    c.strokeStyle = O; c.lineWidth = 3.4 * s + 3; c.stroke();
    c.strokeStyle = HB.GOLD; c.lineWidth = 3.4 * s; c.stroke();
    c.restore();
  }

  // ---------- Cabinas ----------
  // Cabina del Bólido con el Director dentro (busto)
  function cabinDirector(c, x, y, w, h, r) {
    c.save();
    P2.rr(c, x, y, w, h, r);
    var g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#cffafe'); g.addColorStop(1, '#67e8f9');
    c.fillStyle = g; c.fill();
    c.clip();
    var k = h / 44;
    P2.director(c, x + w * 0.5, y + 3 + 64 * k, { scale: k, facing: 1 });
    c.globalAlpha = 0.45; c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x + w * 0.66, y); c.lineTo(x + w * 0.8, y); c.lineTo(x + w * 0.56, y + h); c.lineTo(x + w * 0.42, y + h);
    c.closePath(); c.fill();
    c.restore();
    P2.rf(c, x, y, w, h, r, null, O, 2.5);
  }
  // Cabina-burbuja del halcón con Lord Falcon dentro
  function cabinFalcon(c, cx, cy, rx, ry) {
    P2.elli(c, cx, cy + 1, rx + 3.5, ry + 3.5, HB.BROWN, O, 3);
    c.save();
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, PI * 2); c.clip();
    c.fillStyle = '#bae6fd'; c.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
    var fs = ry * 0.06;
    P2.falcon(c, cx + rx * 0.05, cy + 47 * fs, { scale: fs, facing: 1 });
    c.globalAlpha = 0.18; c.fillStyle = '#ffffff'; c.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
    c.globalAlpha = 0.85; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1.5, ry * 0.16); c.lineCap = 'round';
    c.beginPath(); c.ellipse(cx, cy, rx * 0.72, ry * 0.7, 0, 1.12 * PI, 1.42 * PI); c.stroke();
    c.restore();
    P2.elli(c, cx, cy, rx, ry, null, O, 2.5);
  }

  // ---------- Cabeza-casco de halcón (la del Gran halcón, en grande) ----------
  function hawkHead(c, hx, hy, r) {
    var st = 1.1, rx = r * st;
    var ex = hx + r * 0.32 * st, ey = hy - r * 0.16;
    // plumas de la nuca
    blade(c, hx - rx * 0.5, hy - r * 0.55, PI + 0.55, r * 0.95, r * 0.42, HB.GDARK, HB.TIP_D);
    blade(c, hx - rx * 0.7, hy - r * 0.1, PI + 0.25, r * 0.85, r * 0.4, HB.GDARK, HB.TIP_D);
    P2.elli(c, hx, hy, rx, r, HB.GREEN, O, 3);
    c.save();
    c.beginPath(); c.ellipse(hx, hy, rx, r, 0, 0, PI * 2); c.clip();
    // garganta crema pequeña, junto al pico y sin contorno (no forma un "segundo ojo")
    P2.elli(c, hx + r * 0.55, hy + r * 0.72, rx * 0.45, r * 0.35, HB.THROAT, null);
    // capucha (casco oscuro por arriba y por detrás)
    c.beginPath();
    c.moveTo(hx - rx * 1.2, hy + r * 0.9);
    c.lineTo(hx - rx * 0.25, hy + r * 0.25);
    c.quadraticCurveTo(hx + rx * 0.2, hy - r * 0.45, hx + rx * 1.2, hy - r * 0.42);
    c.lineTo(hx + rx * 1.2, hy - r * 1.2); c.lineTo(hx - rx * 1.2, hy - r * 1.2);
    c.closePath(); c.fillStyle = HB.GDARK; c.fill();
    c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    // máscara gris de Lord Falcon
    P2.rr(c, hx - rx * 0.15, hy - r * 0.45, rx * 1.3, r * 0.58, r * 0.28);
    c.fillStyle = F.MASK; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    // "bigote" de halcón peregrino: lágrima que cae del ojo hacia atrás
    c.save(); c.translate(ex - r * 0.15, ey + r * 0.42); c.rotate(0.5);
    c.beginPath(); c.moveTo(0, -r * 0.3);
    c.quadraticCurveTo(r * 0.2, r * 0.05, 0, r * 0.3);
    c.quadraticCurveTo(-r * 0.2, r * 0.05, 0, -r * 0.3); c.closePath();
    c.fillStyle = HB.GDARK; c.fill(); c.strokeStyle = O; c.lineWidth = 2; c.stroke();
    c.restore();
    c.restore();
    P2.elli(c, hx, hy, rx, r, null, O, 3);
    // pico de metal con cera amarilla
    var bx = hx + r * 0.8 * st;
    c.beginPath();
    c.moveTo(bx - r * 0.15, hy - r * 0.42);
    c.quadraticCurveTo(bx + r * 0.5, hy - r * 0.46, bx + r * 0.7, hy + r * 0.08);
    c.quadraticCurveTo(bx + r * 0.72, hy + r * 0.36, bx + r * 0.56, hy + r * 0.46);
    c.quadraticCurveTo(bx + r * 0.52, hy + r * 0.3, bx + r * 0.32, hy + r * 0.26);
    c.lineTo(bx - r * 0.15, hy + r * 0.28);
    c.closePath();
    c.fillStyle = HB.BEAK; c.fill();
    c.save(); c.clip();
    c.fillStyle = HB.BEAK_D; c.fillRect(bx + r * 0.5, hy - r, r, r * 2);
    c.fillStyle = HB.GOLD; c.fillRect(bx - r * 0.3, hy - r, r * 0.38, r * 2);
    c.restore();
    c.strokeStyle = O; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke();
    P2.poly(c, [[bx - r * 0.1, hy + r * 0.28], [bx + r * 0.36, hy + r * 0.28], [bx + r * 0.06, hy + r * 0.52]], HB.BEAK_D, O, 2.5);
    // ojo-luz VERDE (hackeado) con anillo amarillo
    P2.eyeLight(c, ex, ey, r * 0.27, HB.EYE);
    c.beginPath(); c.arc(ex, ey, r * 0.38, 0, PI * 2);
    c.strokeStyle = O; c.lineWidth = r * 0.13 + 2.5; c.stroke();
    c.strokeStyle = HB.GOLD; c.lineWidth = r * 0.13; c.stroke();
    tube(c, [[ex - r * 0.42, ey - r * 0.42], [ex + r * 0.4, ey - r * 0.5]], HB.GDARK, 3);
  }

  // ---------- Ala de plumas de metal (Gran halcón). Ala derecha; left = espejo ----------
  function wing(c, sx, sy, left) {
    var plate = left ? HB.PLATE_D : HB.PLATE, tip = left ? HB.TIP_D : HB.TIP;
    var cover = left ? HB.GDARK : HB.GREEN, arm = left ? HB.BROWN_D : HB.BROWN;
    var L = 78;
    c.save(); c.translate(sx, sy); if (left) c.scale(-1, 1); c.rotate(-0.4);
    // secundarias (cuelgan del brazo del ala)
    [[0.36, 1.5, 32], [0.56, 1.3, 36], [0.76, 1.08, 40]].forEach(function (f) {
      blade(c, L * f[0], 6, f[1], f[2], 13, plate, tip);
    });
    // plumas de arriba (ala levantada: forma de abanico grande)
    [[0.3, -1.4, 32], [0.5, -1.2, 38], [0.7, -1.0, 42]].forEach(function (f) {
      blade(c, L * f[0], -8, f[1], f[2], 13, plate, tip);
    });
    // primarias: abiertas como los "dedos" de un águila
    [[-0.78, 42], [-0.4, 48], [-0.02, 46], [0.36, 40], [0.74, 34]].forEach(function (f) {
      blade(c, L - 6, 2, f[0], f[1], 13, plate, tip);
    });
    // cobertoras (placa con escamas)
    c.save();
    P2.rr(c, -4, -12, L + 4, 30, 14); c.fillStyle = cover; c.fill();
    c.clip(); scallops(c, 6, -2, 8, 2, 9, 8, 4.5, 'rgba(26,26,46,0.35)');
    c.restore();
    P2.rf(c, -4, -12, L + 4, 30, 14, null, O, 2.5);
    P2.rf(c, -2, -14, L + 2, 10, 5, arm, O, 2.5);
    P2.circ(c, L - 2, -9, 3, plate, O, 2);
    c.restore();
  }

  // ---------- Puño-garra (las garras del halcón): dir = hacia dónde apuntan las uñas ----------
  function claw(c, x, y, dir, s) {
    c.beginPath();
    c.moveTo(x - dir * 2 * s, y - 3.2 * s);
    c.quadraticCurveTo(x + dir * 9 * s, y - 4 * s, x + dir * 8 * s, y + 4.5 * s);
    c.quadraticCurveTo(x + dir * 4.5 * s, y + 0.5 * s, x - dir * 2 * s, y + 3 * s);
    c.closePath();
    c.fillStyle = '#94a3b8'; c.fill();
    c.strokeStyle = O; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke();
  }
  // Puño = la pata del Gran halcón: muñeca y puño MARRÓN de Falcon, uñas de metal gris.
  function fist(c, fx, fy, dir, col) {
    P2.rf(c, fx - 15, fy - 15, 30, 30, 10, col, O, 3);
    // placa de nudillos de metal
    P2.rf(c, dir > 0 ? fx + 2 : fx - 13, fy - 13, 11, 26, 5, HB.PLATE, O, 2.5);
    [-8, 0, 8].forEach(function (d) { claw(c, fx + dir * 13, fy + d, dir, 1.05); });
  }
  // Brazo: hombro (sx,sy) → codo → puño. Antebrazo verde con cuchillas de pluma;
  // muñeca y puño marrones (como las patas del Gran halcón) con garras grises.
  function arm(c, sx, sy, ex, ey, fx, fy, far) {
    var green = far ? HB.GREEN2 : HB.GREEN, plate = far ? HB.PLATE_D : HB.PLATE, tip = far ? HB.TIP_D : HB.TIP;
    var brown = far ? HB.BROWN_D : HB.BROWN;
    limb(c, sx, sy, ex, ey, 22, far ? HB.DARK : HB.BODY2);
    // cuchillas de pluma en el antebrazo (apuntan hacia el codo, como un ala plegada)
    var a = Math.atan2(ey - fy, ex - fx);
    var mx = fx + (ex - fx) * 0.25, my = fy + (ey - fy) * 0.25;
    blade(c, mx, my, a - 0.75, 32, 11, plate, tip);
    blade(c, mx, my, a - 0.4, 40, 11, plate, tip);
    limb(c, ex, ey, fx, fy, 24, green);
    P2.circ(c, ex, ey, 7, HB.ACC, O, 2.5);
    // muñeca marrón (la "pata" del halcón)
    limb(c, fx + (ex - fx) * 0.4, fy + (ey - fy) * 0.4, fx, fy, 26, brown);
    fist(c, fx, fy, fx >= sx ? 1 : -1, brown);
  }

  // ---------- Pierna del Bólido: muslo, rodillera, espinillera, rueda en el gemelo ----------
  function leg(c, cx, far) {
    var side = cx < 0 ? -1 : 1;
    P2.rf(c, cx - 15, -116, 30, 50, 10, far ? HB.DARK : HB.BODY2, O, 3);
    P2.rf(c, cx - 17, -72, 34, 58, 11, far ? HB.BODY2 : HB.BODY, O, 3);
    P2.rf(c, cx - 17, -52, 34, 6, 3, HB.ACC, O, 2.5);
    wheel(c, cx + side * 19, -36, 13.5);
    P2.circ(c, cx, -70, 8, HB.ACC, O, 2.5);
    P2.rf(c, cx - 20, -17, 46, 17, 7, HB.DEEP, O, 3);
    P2.rf(c, cx + 17, -14, 8, 11, 3, HB.ACC, O, 2);
  }

  // =====================================================================
  //  ROBOT FUSIÓN (pies en 0,0; mira a la derecha). ~250 px de alto.
  // =====================================================================
  function drawFusion(c, pose) {
    P2.elli(c, 0, -1, 72, 10, 'rgba(0,0,0,0.25)', null);
    // alas del halcón a la espalda
    wing(c, -24, -196, true);
    wing(c, 24, -196, false);
    // brazo trasero (colgando, en guardia)
    arm(c, -62, -180, -78, -140, -80, -102, true);
    // piernas y caderas
    leg(c, -26, true); leg(c, 26, false);
    P2.rf(c, -46, -128, 92, 20, 9, HB.DEEP, O, 3);
    // ---- tronco = el Bólido de pie ----
    c.save();
    P2.rr(c, -58, -206, 116, 88, 24); c.fillStyle = HB.BODY; c.fill(); c.clip();
    // capó: costados más oscuros
    c.fillStyle = HB.BODY2;
    c.beginPath(); c.moveTo(-60, -210); c.lineTo(-38, -210); c.lineTo(-48, -140); c.lineTo(-60, -140); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(60, -210); c.lineTo(38, -210); c.lineTo(48, -140); c.lineTo(60, -140); c.closePath(); c.fill();
    // parachoques con faros
    c.fillStyle = HB.BODY2; c.fillRect(-60, -140, 120, 24);
    c.restore();
    P2.line(c, -60, -140, 60, -140, O, 2.5);
    P2.rf(c, -58, -154, 116, 8, 4, HB.ACC, O, 2.5);            // franja de carreras
    [-40, 40].forEach(function (lx) {
      P2.rf(c, lx - 9, -134, 18, 11, 5, HB.LAMP, O, 2.5);    // faros
      P2.circ(c, lx - 3, -130, 2, '#ffffff', null);
    });
    P2.rf(c, -58, -206, 116, 88, 24, null, O, 3);
    // hebilla con la V del halcón
    P2.rf(c, -15, -138, 30, 22, 7, HB.DARK, O, 2.5);
    emblemV(c, 0, -128, 1.05);
    // cabina del Director en el pecho
    cabinDirector(c, -27, -199, 54, 42, 14);
    // hombros = ruedas delanteras del coche con guardabarros
    [-1, 1].forEach(function (s) {
      var wx = s * 62, wy = -186;
      wheel(c, wx, wy, 20);
      c.save(); c.lineCap = 'round';
      [[O, 13], [s < 0 ? HB.BODY2 : HB.BODY, 7.5]].forEach(function (p) {
        c.strokeStyle = p[0]; c.lineWidth = p[1];
        c.beginPath(); c.arc(wx, wy, 26, PI * 1.08, PI * 1.92); c.stroke();
      });
      c.restore();
    });
    // cuello, cresta y cabeza de halcón con la cabina de Falcon
    P2.rf(c, -12, -230, 24, 28, 6, HB.DEEP, O, 2.5);
    P2.rf(c, -12, -218, 24, 5, 2, HB.ACC, O, 2);
    // cresta de halcón: 3 plumas grandes que asoman por encima de la cabina
    blade(c, -22, -266, -2.75, 40, 15, HB.PLATE_D, HB.TIP_D);
    blade(c, -20, -268, -2.25, 44, 16, HB.PLATE_D, HB.TIP_D);
    blade(c, -16, -270, -1.8, 44, 16, HB.PLATE, HB.TIP);
    hawkHead(c, 8, -244, 26);
    cabinFalcon(c, -16, -262, 14, 13);
    // brazo delantero
    if (pose === 'puño') arm(c, 62, -180, 94, -158, 132, -162, false);
    else arm(c, 62, -180, 92, -140, 104, -176, false);
  }

  // =====================================================================
  //  DARK SECUAZ GIGANTE: el cuerpo APROBADO (P2.fn.secuaz) + muchas torretas
  // =====================================================================
  var GK = 1.2; // cuánto más grande es el cuerpo base
  // Torreta pegada con su soporte atornillado. rot = giro del montaje (0 = hacia arriba)
  function bolted(c, x, by, K, ang, rot, mount) {
    c.save(); c.translate(x, by); if (rot) c.rotate(rot);
    P2.rf(c, -15 * K, -3 * K, 30 * K, 9 * K, 3 * K, mount || E.DARK, O, 2);
    P2.circ(c, -10 * K, 1.5 * K, 1.6, '#94a3b8', null); P2.circ(c, 10 * K, 1.5 * K, 1.6, '#94a3b8', null);
    P2.fn.turretHead(c, 0, -2 * K, K, TP, ang, false);
    c.restore();
  }
  function drawGigante(c) {
    // aura roja de poder
    c.save(); c.globalAlpha = 0.16; P2.elli(c, 0, -96, 86, 104, E.RED_L, null); c.globalAlpha = 1; c.restore();
    // ---- torretas de la espalda (detrás del cuerpo) ----
    [-1, 1].forEach(function (s) {
      // mástiles con torreta, asomando junto a la cabeza
      limb(c, s * 30, -112, s * 50, -158, 9, E.STEEL_DD, 2.5);
      bolted(c, s * 50, -160, 0.85, s > 0 ? -0.75 : PI + 0.75, 0);
      // torretas de la espalda, por fuera de los hombros
      bolted(c, s * 84, -128, 0.9, s > 0 ? -0.25 : PI + 0.25, s * 0.55);
    });
    // ---- el cuerpo aprobado ----
    P2.fn.secuaz(c, 0, 0, { scale: 1 });
    // ---- torretas de los hombros ----
    [-1, 1].forEach(function (s) {
      bolted(c, s * 58, -127, 1.0, s > 0 ? -0.45 : PI + 0.45, 0);
      // torretas en los brazos (hacia fuera)
      bolted(c, s * 72, -94, 0.78, -1.25, s * PI / 2);
      // torretas en los puños (hacia fuera)
      bolted(c, s * 82, -58, 0.62, -1.0, s * PI / 2);
    });
    // ---- corona de torretas (de bronce, la marca de Dark Toros) ----
    var cx = 0, cy = -173, R = 28;
    c.save(); c.lineCap = 'round';
    [[O, 14], [E.BRONZE, 9]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.arc(cx, cy, R - 6, PI * 1.02, PI * 1.76); c.stroke();
    });
    c.restore();
    // (deja hueco a la derecha para el cañón de la cabeza)
    [-162, -134, -106, -78, -52].forEach(function (deg, i) {
      var a = deg * PI / 180;
      bolted(c, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0.6, [-2.3, -2.0, -1.57, -1.2, -0.9][i], a + PI / 2, E.BRONZE);
    });
  }

  // ---------- Exportadas (nunca lanzan) ----------
  function opts(o) {
    o = o || {};
    return { s: (typeof o.scale === 'number' && o.scale > 0) ? o.scale : 1, f: (o.facing === -1) ? -1 : 1 };
  }
  P2.fn.robotFusion = function (c, x, y, o) {
    var q = opts(o);
    c.save();
    try {
      c.translate(x, y); c.scale(q.s * q.f, q.s);
      c.lineJoin = 'round'; c.lineCap = 'round';
      drawFusion(c, (o && o.pose) || 'guardia');
    } catch (e) { /* un prototipo nunca rompe la página */ }
    c.restore();
  };
  P2.fn.secuazGigante = function (c, x, y, o) {
    var q = opts(o);
    c.save();
    try {
      c.translate(x, y); c.scale(q.s * q.f * GK, q.s * GK);
      c.lineJoin = 'round'; c.lineCap = 'round';
      drawGigante(c);
    } catch (e) { /* un prototipo nunca rompe la página */ }
    c.restore();
  };

  // =====================================================================
  //  Decorado de los paneles
  // =====================================================================
  function cloud(c, x, y, s, a) {
    c.save(); c.globalAlpha = a || 0.75; c.fillStyle = '#ffffff';
    [[0, 0, 18], [20, -8, 22], [42, 0, 17], [20, 6, 18]].forEach(function (p) {
      c.beginPath(); c.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, PI * 2); c.fill();
    });
    c.restore();
  }
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
  function callout(c, text, tx, ty, px, py, col, align) {
    P2.line(c, tx, ty, px, py, O, 5);
    P2.line(c, tx, ty, px, py, '#fef3c7', 2);
    P2.circ(c, px, py, 3.5, '#fef3c7', O, 2);
    P2.label(c, text, tx, ty + (ty < py ? -5 : 15), 13, col || '#fef3c7', align);
  }
  // Estrella de choque
  function burst(c, x, y, r, n, fill, rot) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var a = (rot || 0) + i * PI / n, rr = (i % 2) ? r * 0.55 : r * (i % 4 === 0 ? 1 : 0.85);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    P2.poly(c, pts, fill, O, 3);
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
  // Suelo de la fortaleza del cielo (acero con franja roja)
  function deck(c, y) {
    P2.rf(c, -10, y, 500, 60, 0, E.STEEL_D, O, 3);
    P2.rf(c, -10, y, 500, 9, 0, '#94a3b8', O, 3);
    c.fillStyle = E.RED; c.fillRect(-10, y + 14, 500, 6);
    for (var i = 0; i < 12; i++) P2.circ(c, 14 + i * 42, y + 30, 2.2, '#94a3b8', null);
  }
  function tower(c, x, y, w, h) {
    P2.rf(c, x, y, w, h, 6, '#334155', O, 2.5);
    P2.rf(c, x - 4, y - 8, w + 8, 12, 4, '#475569', O, 2.5);
    for (var j = 0; j < 3; j++) P2.rf(c, x + w / 2 - 4, y + 16 + j * 26, 8, 12, 3, '#fca5a5', O, 1.5);
  }
  // Mini-torreta volando hacia el gigante (para "une sus torretas")
  function flyingTurret(c, x, y, dir) {
    c.save(); c.globalAlpha = 0.6;
    [0, 12, 24].forEach(function (d, i) { P2.line(c, x - dir * (24 + d), y - 6 + i * 6, x - dir * (44 + d), y - 6 + i * 6, '#fecaca', 3); });
    c.restore();
    if (window.G && G.gfx && G.gfx.drawTurret) G.gfx.drawTurret(c, x, y, { t: P2.T, scale: 1.1, angle: dir > 0 ? 0.5 : PI - 0.5 });
    P2.label(c, '¡clac!', x, y - 24, 13, '#fecaca');
  }

  // =====================================================================
  //  Paneles
  // =====================================================================
  P2.register({
    key: 'fusion',
    title: 'Fusión gigante y pelea de gigantes',
    panels: [
      {
        title: '¡Fusión!',
        subtitle: 'Mecha-halcón + robot del Director = ¡Titán Halcón!',
        bg: ['#0f172a', '#1e3a8a'],
        render: function (c) {
          var X = 344, Y = 464, S = 1.0;
          function at(x, y) { return [X + x * S, Y + y * S]; }
          glow(c, X, 300, 175, 'rgba(250,204,21,0.42)');
          [[250, 150, 1], [466, 140, 0.8], [458, 400, 0.9], [200, 252, 0.6]].forEach(function (p) { sparkle(c, p[0], p[1], p[2], '#fde68a'); });
          // las piezas: arriba el halcón (da las piezas verdes); abajo el robot/coche del Director (las azules)
          P2.fn.mechaHalcon(c, 92, 140, { variant: 'A', modo: 'vuelo', scale: 0.82 });
          P2.label(c, 'Mecha-halcón de Falcon', 98, 214, 13, '#86efac');
          P2.label(c, '+', 96, 246, 28, '#fbbf24');
          P2.label(c, 'Bólido del Director', 96, 276, 13, '#93c5fd');
          P2.fn.transformableRobot(c, 40, 392, { variant: 'A', scale: 0.62 });
          P2.label(c, '⇄', 78, 360, 18, '#fde68a');
          P2.fn.transformableCoche(c, 128, 392, { variant: 'A', scale: 0.6 });
          P2.label(c, 'robot', 40, 412, 12, '#bfdbfe');
          P2.label(c, 'coche', 128, 412, 12, '#bfdbfe');
          // el gigante
          P2.fn.robotFusion(c, X, Y, { scale: S });
          // flechas: verde = del halcón; azul = del coche
          var rw = at(84, -236), h = at(-42, -255), bf = at(-96, -100), bp = at(-20, -128), lw = at(-46, -38);
          arrow(c, 70, 96, 300, 52, rw[0], rw[1], '#4ade80');                 // alas (por arriba)
          arrow(c, 140, 150, 240, 192, h[0], h[1], '#4ade80');                // cabeza = casco (acaba junto a la cabina, sin taparla)
          arrow(c, 112, 172, 222, 178, bf[0], bf[1], '#4ade80');               // garras = puños
          arrow(c, 156, 384, 262, 436, bp[0], bp[1], '#60a5fa');              // coche de pie = tronco
          arrow(c, 112, 428, 196, 474, lw[0] - 10, lw[1] + 8, '#60a5fa');     // ruedas = piernas
          P2.label(c, 'alas', 300, 88, 14, '#bbf7d0');
          P2.label(c, 'cabeza = casco', 226, 134, 13, '#bbf7d0');
          P2.label(c, 'garras = puños', 168, 236, 13, '#bbf7d0');
          P2.label(c, 'coche de pie = tronco', 190, 348, 13, '#bfdbfe');
          P2.label(c, 'ruedas = piernas', 236, 470, 13, '#bfdbfe');
        }
      },
      {
        title: 'Robot gigante de los héroes',
        subtitle: 'Titán Halcón: azul del Director y verde de Falcon',
        bg: ['#0c4a6e', '#38bdf8'],
        render: function (c) {
          var X = 236, Y = 468, S = 1.25;
          function at(x, y) { return [X + x * S, Y + y * S]; }
          glow(c, 240, 290, 200, 'rgba(255,255,255,0.35)');
          P2.rf(c, -10, 456, 500, 40, 0, 'rgba(15,23,42,0.35)', null);
          P2.fn.robotFusion(c, X, Y, { scale: S });
          var fa = at(-29, -262), di = at(-27, -170), wi = at(-96, -218), ey = at(17, -248), fi = at(110, -184), wh = at(58, -36), sh = at(-62, -186);
          callout(c, 'Lord Falcon', 66, 104, fa[0], fa[1], '#bbf7d0');
          callout(c, 'Director', 58, 300, di[0], di[1], '#bfdbfe');
          callout(c, 'alas del halcón', 64, 186, wi[0], wi[1], '#bbf7d0');
          callout(c, 'ojo verde', 330, 92, ey[0] + 8, ey[1] - 10, '#86efac');
          callout(c, 'puños-garra', 428, 276, fi[0], fi[1], '#bbf7d0');
          callout(c, 'ruedas del coche', 404, 380, wh[0], wh[1], '#bfdbfe');
          callout(c, 'hombros-rueda', 66, 240, sh[0] - 14, sh[1] + 16, '#bfdbfe');
        }
      },
      {
        title: 'Dark Secuaz gigante',
        subtitle: '¡Se une a todas sus torretas!',
        bg: ['#1e1b4b', '#6d28d9'],
        render: function (c) {
          deck(c, 456);
          flyingTurret(c, 50, 150, 1);
          flyingTurret(c, 430, 116, -1);
          P2.fn.secuazGigante(c, 240, 458, { scale: 1.38 });
          callout(c, 'corona de torretas', 96, 92, 190, 112, '#fde68a');
          callout(c, 'torretas en hombros', 400, 210, 330, 236, '#fecaca');
          callout(c, 'y en los brazos', 420, 330, 384, 300, '#fecaca');
          callout(c, 'gema en el bolsillo', 400, 420, 286, 360, '#fda4af');
          callout(c, 'cuernos de bronce', 74, 412, 226, 308, '#fdba74');
        }
      },
      {
        title: '¡Pelea de gigantes!',
        subtitle: 'En la fortaleza del cielo · a escala de juego',
        bg: ['#1e3a8a', '#f9a8d4'],
        render: function (c) {
          cloud(c, 20, 120, 1.1, 0.55); cloud(c, 380, 96, 0.9, 0.5); cloud(c, 196, 156, 0.7, 0.4);
          tower(c, 24, 300, 34, 156); tower(c, 418, 280, 38, 176);
          cloud(c, -10, 420, 1.4, 0.7); cloud(c, 404, 430, 1.3, 0.7);
          deck(c, 456);
          // primero el Secuaz; luego el choque; y encima el Titán con su puño-garra
          P2.fn.secuazGigante(c, 336, 456, { scale: 1, facing: -1 });
          var hx = 146 + 154, hy = 456 - 162;   // punta de las garras
          c.save(); c.globalAlpha = 0.85;
          [[-1.75, 66], [-2.35, 62], [-0.6, 64], [0.1, 60], [-1.15, 60], [0.75, 58]].forEach(function (r) {
            P2.line(c, hx + Math.cos(r[0]) * 40, hy + Math.sin(r[0]) * 40, hx + Math.cos(r[0]) * r[1], hy + Math.sin(r[0]) * r[1], '#fff7ed', 4);
          });
          c.restore();
          burst(c, hx + 6, hy, 34, 9, '#fbbf24', 0.2);
          burst(c, hx + 6, hy, 21, 7, '#fff7ed', 0.5);
          P2.fn.robotFusion(c, 146, 456, { scale: 1, pose: 'puño' });
          P2.label(c, '¡PUM!', 330, 250, 18, '#ef4444');
          P2.label(c, '¡CHOQUE DE TITANES!', 240, 112, 26, '#fde68a');
          // referencia: un héroe a su tamaño normal
          c.save(); c.globalAlpha = 0.7; P2.director(c, 222, 456, { scale: 1 }); c.restore();
          // rótulo junto al Director, por encima del suelo (en el hueco entre él y el pie del Secuaz)
          P2.label(c, 'tamaño de', 266, 418, 12, '#fef3c7');
          P2.label(c, 'un héroe', 266, 433, 12, '#fef3c7');
          // mini-torreta del Secuaz, a la derecha (deja sitio al rótulo)
          if (P2.fn.miniTorreta) P2.fn.miniTorreta(c, 400, 456, { scale: 1, angle: PI - 0.45 });
        }
      }
    ]
  });
})();
