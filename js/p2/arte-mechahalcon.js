// mechahalcon.js — PROTOTIPO Parte 2: el MECHA-HALCÓN que pilota Lord Falcon.
// Robot volador con forma de halcón del ejército de Dark Secuaz. Lord Falcon lo
// hackea: toma sus colores (verde, marrón y placas de metal en forma de plumas)
// y él va en la cabina con su capucha y su máscara.
// Dos variantes para que Juanjo elija: A "Gran halcón" y B "Halcón-jet".
//
// Exporta:
//   P2.fn.mechaHalcon(c, x, y, { variant: 'A'|'B', modo: 'vuelo'|'posado',
//                                enemy, piloto, disparo, scale, facing })
//     · vuelo  → (x, y) = centro del robot.
//     · posado → (x, y) = punto medio entre las patas (en el suelo).
//     · enemy: true → versión de Dark Secuaz (acero + rojo, sin piloto).
//     · piloto: por defecto true si no es enemigo (Falcon en la cabina).
//   Medidas a escala 1: A vuelo ~145 x 115 (envergadura ~130), A posado ~125 de alto;
//                       B vuelo ~125 de largo (+ llama), B posado ~85 de alto.
(function () {
  'use strict';
  var O = P2.OUTLINE, PI = Math.PI;
  var K = 1; // compensación de grosor de línea cuando se dibuja muy ampliado

  function W(v) { return v * K; }

  // ---------- Paletas ----------
  function pal(enemy) {
    var E = P2.PAL.enemy, F = P2.PAL.falcon, H = P2.PAL.hacked;
    if (enemy) {
      return { enemy: true, body: E.STEEL, bodyD: E.STEEL_D, arm: E.STEEL_DD, dark: E.DARK,
        plate: '#94a3b8', plateD: '#64748b', tip: E.RED_L, tipD: E.RED, chest: E.RED,
        beak: '#cbd5e1', beakD: '#94a3b8', cere: E.RED_L, hood: E.STEEL_DD, mask: E.DARK, throat: '#94a3b8',
        armD: E.DARK, eye: E.EYE, glass: '#3a1219', bars: E.DARK,
        flame: '#f97316', flameIn: '#fde68a', claw: '#94a3b8', clawTip: E.DARK, bronze: E.BRONZE };
    }
    return { enemy: false, body: F.GREEN, bodyD: F.DARK, arm: F.BROWN, dark: '#0f2e1a',
      plate: '#d1d5db', plateD: F.MASK, tip: F.GREEN, tipD: H.RED, chest: '#fbecc8',
      beak: '#94a3b8', beakD: '#4b5563', cere: '#facc15', hood: F.DARK, mask: F.MASK, throat: '#fef3c7',
      armD: '#4a2108', eye: H.EYE, glass: '#bae6fd', bars: F.BROWN,
      flame: '#4ade80', flameIn: '#ecfccb', claw: '#94a3b8', clawTip: '#334155', bronze: E.BRONZE };
  }

  // ---------- Primitivas (grosor compensado con K) ----------
  function rf(c, x, y, w, h, r, fill, lw) { P2.rf(c, x, y, w, h, r, fill, O, W(lw || 3)); }
  function circ(c, x, y, r, fill, lw) {
    c.beginPath(); c.arc(x, y, Math.abs(r), 0, PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (lw !== 0) { c.strokeStyle = O; c.lineWidth = W(lw || 3); c.stroke(); }
  }
  function elliPath(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, PI * 2); }
  function elli(c, x, y, rx, ry, rot, fill, lw) {
    elliPath(c, x, y, rx, ry, rot);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (lw !== 0) { c.strokeStyle = O; c.lineWidth = W(lw || 3); c.stroke(); }
  }
  function poly(c, pts, fill, lw) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (lw !== 0) { c.strokeStyle = O; c.lineWidth = W(lw || 3); c.lineJoin = 'round'; c.stroke(); }
  }
  // trazo grueso con contorno (patas, tubos)
  function tube(c, pts, col, w) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.strokeStyle = O; c.lineWidth = w + W(5); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.stroke();
    c.restore();
  }

  // Pluma-placa de metal: cápsula con la punta de color y la "varilla" marcada.
  function feather(c, x, y, ang, len, w, fill, tip, lw) {
    c.save(); c.translate(x, y); c.rotate(ang);
    P2.rr(c, 0, -w / 2, len, w, w / 2);
    c.fillStyle = fill; c.fill();
    c.save(); c.clip();
    c.fillStyle = tip; c.fillRect(len - w * 1.15, -w, w * 1.3, w * 2);
    c.restore();
    c.strokeStyle = 'rgba(26,26,46,0.35)'; c.lineWidth = W(1.6);
    c.beginPath(); c.moveTo(w * 0.55, 0); c.lineTo(len - w * 1.35, 0); c.stroke();
    P2.rr(c, 0, -w / 2, len, w, w / 2);
    c.strokeStyle = O; c.lineWidth = W(lw || 2.5); c.stroke();
    c.restore();
  }

  // Pluma-cuchilla (alas y cola del Gran halcón): base redonda, punta afilada y una muesca.
  function bladePath(c, len, w) {
    var h = w / 2;
    c.beginPath();
    c.moveTo(h, -h);
    c.lineTo(len - w * 1.5, -h);
    c.quadraticCurveTo(len - w * 0.35, -h, len, h * 0.45);   // punta
    c.lineTo(len - w * 0.8, h);
    c.lineTo(len - w * 1.1, h * 0.35);                       // muesca
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
    c.strokeStyle = 'rgba(26,26,46,0.35)'; c.lineWidth = W(1.6);
    c.beginPath(); c.moveTo(w * 0.55, 0); c.lineTo(len - w * 1.45, 0); c.stroke();
    bladePath(c, len, w);
    c.strokeStyle = O; c.lineWidth = W(lw || 2.5); c.stroke();
    c.restore();
  }

  // Pluma-dardo (Falcon es arquero: el mecha dispara plumas de metal como flechas).
  function dart(c, P, x, y, len) {
    c.save();
    c.lineCap = 'round';
    c.globalAlpha = 0.5; c.strokeStyle = P.eye; c.lineWidth = 7;
    c.beginPath(); c.moveTo(x - len * 0.55, y); c.lineTo(x - len * 1.9, y); c.stroke();
    c.globalAlpha = 0.8; c.strokeStyle = '#ffffff'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x - len * 0.6, y); c.lineTo(x - len * 1.4, y); c.stroke();
    c.globalAlpha = 1;
    var h = len * 0.17;
    function path() {
      c.beginPath();
      c.moveTo(x + len * 0.5, y);                       // punta
      c.quadraticCurveTo(x + len * 0.1, y - h * 1.1, x - len * 0.3, y - h);
      c.lineTo(x - len * 0.5, y - h * 1.7);             // aleta
      c.lineTo(x - len * 0.42, y);
      c.lineTo(x - len * 0.5, y + h * 1.7);
      c.lineTo(x - len * 0.3, y + h);
      c.quadraticCurveTo(x + len * 0.1, y + h * 1.1, x + len * 0.5, y);
      c.closePath();
    }
    path(); c.fillStyle = P.plate; c.fill();
    c.save(); c.clip(); c.fillStyle = P.tip; c.fillRect(x - len * 0.6, y - len, len * 0.38, len * 2); c.restore();
    path(); c.strokeStyle = O; c.lineWidth = W(2.2); c.lineJoin = 'round'; c.stroke();
    c.restore();
  }

  // Escamas de plumas (arcos) dentro de la zona recortada actual
  function scallops(c, x0, y0, cols, rows, dx, dy, r, col) {
    c.strokeStyle = col; c.lineWidth = W(1.8);
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = x0 + i * dx + (j % 2) * dx * 0.5, y = y0 + j * dy;
        c.beginPath(); c.arc(x, y, r, 0.15 * PI, 0.85 * PI); c.stroke();
      }
    }
  }

  function flame(c, x, y, len, h, P) {
    poly(c, [[x, y - h], [x - len * 0.55, y - h * 0.55], [x - len, y], [x - len * 0.55, y + h * 0.55], [x, y + h]], P.flame, 2.5);
    poly(c, [[x, y - h * 0.5], [x - len * 0.55, y], [x, y + h * 0.5]], P.flameIn, 0);
  }

  function emblem(c, P, x, y, s) {
    if (P.enemy) { P2.horns(c, x, y + 3 * s, 0.42 * s, P.bronze); return; }
    // la V de halcón del pecho de Lord Falcon
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x - 7 * s, y - 3 * s); c.lineTo(x, y + 4 * s); c.lineTo(x + 7 * s, y - 3 * s);
    c.strokeStyle = O; c.lineWidth = 3.4 * s + W(3); c.stroke();
    c.strokeStyle = '#facc15'; c.lineWidth = 3.4 * s; c.stroke();
    c.restore();
  }

  // ---------- Partes ----------
  // Ala de plumas: brazo desde el hombro (sx,sy) con ángulo ang; las plumas cuelgan hacia el borde de salida.
  // ps = factor de largo de las plumas (el ala lejana es algo más corta).
  function wing(c, P, sx, sy, ang, len, far, ps) {
    var plate = far ? P.plateD : P.plate, tip = far ? P.tipD : P.tip;
    var arm = far ? P.armD : P.arm, cover = far ? P.bodyD : P.body;
    ps = ps || 1;
    c.save(); c.translate(sx, sy); c.rotate(ang);
    // secundarias (cuelgan del brazo hacia el borde de salida)
    [[0.18, -1.55, 26], [0.38, -1.42, 30], [0.58, -1.27, 34], [0.78, -1.1, 38]].forEach(function (f) {
      blade(c, len * f[0], -4, f[1], f[2] * ps, 12, plate, tip);
    });
    // primarias: se abren HACIA FUERA en la punta, como los "dedos" de un águila
    [[-0.85, 40], [-0.6, 48], [-0.34, 55], [-0.08, 60], [0.18, 54]].forEach(function (f) {
      blade(c, len - 6, -2, f[0], f[1] * ps, 12.5, plate, tip);
    });
    // cobertoras (placa grande con escamas)
    c.save();
    P2.rr(c, -4, -24, len + 4, 30, 14); c.fillStyle = cover; c.fill();
    c.clip(); scallops(c, 4, -16, 7, 2, 9, 8, 4.5, 'rgba(26,26,46,0.35)');
    c.restore();
    rf(c, -4, -24, len + 4, 30, 14, null, 2.5);
    // brazo (borde de ataque), sin asomar por detrás del hombro
    rf(c, -2, -4, len + 4, 10, 5, arm, 2.5);
    circ(c, len - 1, 1, 3, plate, 2);
    // hombro
    circ(c, 0, 0, 6.5, plate, 2.5);
    circ(c, 0, 0, 2.2, arm, 0);
    c.restore();
  }

  // Cabina-burbuja; si hay piloto, se ve a Lord Falcon (capucha + máscara).
  function cockpit(c, P, cx, cy, rx, ry, pilot) {
    elli(c, cx, cy + 1, rx + 3.5, ry + 3.5, 0, P.arm, 3);
    c.save();
    elliPath(c, cx, cy, rx, ry); c.clip();
    c.fillStyle = P.glass; c.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
    if (pilot && P2.falcon) {
      var fs = ry * 0.06;
      P2.falcon(c, cx + rx * 0.05, cy + 47 * fs, { scale: fs, facing: 1 });
    } else if (P.enemy) {
      // cabina vacía: una lucecita roja de "piloto automático"
      c.globalAlpha = 0.5; circ(c, cx, cy + ry * 0.2, ry * 0.45, P.eye, 0); c.globalAlpha = 1;
      circ(c, cx, cy + ry * 0.2, ry * 0.2, P.eye, 1.5);
    }
    // reflejo del cristal
    c.globalAlpha = 0.18; c.fillStyle = '#ffffff'; c.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
    c.globalAlpha = 0.85; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1.5, ry * 0.16); c.lineCap = 'round';
    c.beginPath(); c.ellipse(cx, cy, rx * 0.72, ry * 0.7, 0, 1.12 * PI, 1.42 * PI); c.stroke();
    c.restore();
    elli(c, cx, cy, rx, ry, 0, null, 2.5);
  }

  // Pico corto de halcón (metal) con un ganchito y la cera de color en la base.
  function beak(c, P, bx, hy, r) {
    c.beginPath();
    c.moveTo(bx - r * 0.15, hy - r * 0.42);
    c.quadraticCurveTo(bx + r * 0.5, hy - r * 0.46, bx + r * 0.7, hy + r * 0.08);
    c.quadraticCurveTo(bx + r * 0.72, hy + r * 0.36, bx + r * 0.56, hy + r * 0.46);
    c.quadraticCurveTo(bx + r * 0.52, hy + r * 0.3, bx + r * 0.32, hy + r * 0.26);
    c.lineTo(bx - r * 0.15, hy + r * 0.28);
    c.closePath();
    c.fillStyle = P.beak; c.fill();
    c.save(); c.clip();
    c.fillStyle = P.beakD; c.fillRect(bx + r * 0.5, hy - r, r, r * 2);        // punta oscura
    c.fillStyle = P.cere; c.fillRect(bx - r * 0.3, hy - r, r * 0.38, r * 2);  // cera
    c.restore();
    c.strokeStyle = O; c.lineWidth = W(2.5); c.lineJoin = 'round'; c.stroke();
    poly(c, [[bx - r * 0.1, hy + r * 0.28], [bx + r * 0.36, hy + r * 0.28], [bx + r * 0.06, hy + r * 0.52]], P.beakD, 2.5);
    circ(c, bx + r * 0.02, hy - r * 0.12, r * 0.08, O, 0);
  }

  // Cabeza de halcón (mirando a la derecha) con capucha y máscara como Lord Falcon.
  // st = estirado horizontal (morro del jet).
  function head(c, P, hx, hy, r, st) {
    st = st || 1;
    var rx = r * st;
    feather(c, hx - r * 0.55 * st, hy - r * 0.55, PI + 0.5, r * 0.85, r * 0.45, P.hood, P.tipD);
    feather(c, hx - r * 0.7 * st, hy - r * 0.15, PI + 0.25, r * 0.8, r * 0.42, P.hood, P.tipD);
    elli(c, hx, hy, rx, r, 0, P.body, 3);
    c.save(); elliPath(c, hx, hy, rx, r, 0); c.clip();
    // garganta clara
    elli(c, hx + r * 0.25, hy + r * 0.95, rx * 0.85, r * 0.6, 0, P.throat, 2);
    // capucha (casco oscuro por arriba y por detrás)
    c.beginPath();
    c.moveTo(hx - rx * 1.2, hy + r * 0.9);
    c.lineTo(hx - rx * 0.25, hy + r * 0.25);
    c.quadraticCurveTo(hx + rx * 0.2, hy - r * 0.45, hx + rx * 1.2, hy - r * 0.42);
    c.lineTo(hx + rx * 1.2, hy - r * 1.2); c.lineTo(hx - rx * 1.2, hy - r * 1.2);
    c.closePath(); c.fillStyle = P.hood; c.fill();
    c.strokeStyle = O; c.lineWidth = W(2.5); c.stroke();
    // máscara (banda sobre el ojo, como la de Falcon)
    P2.rr(c, hx - rx * 0.15, hy - r * 0.45, rx * 1.3, r * 0.58, r * 0.28);
    c.fillStyle = P.mask; c.fill(); c.strokeStyle = O; c.lineWidth = W(2.5); c.stroke();
    // "bigote" de halcón peregrino bajo el ojo
    elli(c, hx + r * 0.22 * st, hy + r * 0.45, r * 0.17, r * 0.36, 0.15, P.hood, 2);
    c.restore();
    elli(c, hx, hy, rx, r, 0, null, 3);
    beak(c, P, hx + r * 0.8 * st, hy, r);
    var ex = hx + r * 0.32 * st, ey = hy - r * 0.16;
    P2.eyeLight(c, ex, ey, r * 0.27, P.eye);
    if (!P.enemy) {
      // anillo amarillo alrededor del ojo, como los halcones de verdad
      c.beginPath(); c.arc(ex, ey, r * 0.38, 0, PI * 2);
      c.strokeStyle = O; c.lineWidth = r * 0.13 + W(2.5); c.stroke();
      c.strokeStyle = '#facc15'; c.lineWidth = r * 0.13; c.stroke();
    }
    // ceja: enfadada (enemigo) o tranquila y valiente (hackeado)
    if (P.enemy) tube(c, [[ex - r * 0.45, ey - r * 0.5], [ex + r * 0.4, ey - r * 0.22]], P.hood, W(3));
    else tube(c, [[ex - r * 0.42, ey - r * 0.4], [ex + r * 0.4, ey - r * 0.46]], P.hood, W(3));
  }

  // Uña curva en forma de gancho al final de un dedo (s = 1 hacia delante, -1 hacia atrás).
  function hook(c, P, ex, ey, s) {
    c.beginPath();
    c.moveTo(ex - s * 1.5, ey - 2.6);
    c.quadraticCurveTo(ex + s * 6.5, ey - 3.2, ex + s * 5.5, ey + 3.2);
    c.quadraticCurveTo(ex + s * 3.2, ey + 0.2, ex - s * 1.5, ey + 2.4);
    c.closePath();
    c.fillStyle = P.clawTip; c.fill();
    c.strokeStyle = O; c.lineWidth = W(2); c.lineJoin = 'round'; c.stroke();
  }
  // Garra de metal: 3 dedos delante y 1 detrás, con uñas de gancho. (x, y) = suelo.
  function talon(c, P, x, y) {
    var w = 5;
    tube(c, [[x, y - 6], [x + 6, y - 3.5]], P.claw, w);      // dedo delantero lejano
    hook(c, P, x + 6, y - 3.5, 1);
    tube(c, [[x - 1, y - 6], [x - 10, y - 3.5]], P.claw, w); // dedo de atrás
    hook(c, P, x - 10, y - 3.5, -1);
    tube(c, [[x, y - 6], [x + 13, y - 3.5]], P.claw, w);     // dedo largo
    hook(c, P, x + 13, y - 3.5, 1);
    tube(c, [[x, y - 5], [x + 8, y - 2.5]], P.claw, w);      // dedo cercano
    hook(c, P, x + 8, y - 2.5, 1);
    circ(c, x, y - 7, 5, P.arm, 2.5);
  }

  // ---------- Variante A: Gran halcón ----------
  function bodyA(c, P, cx, cy, rx, ry, rot) {
    c.save();
    elliPath(c, cx, cy, rx, ry, rot); c.fillStyle = P.body; c.fill(); c.clip();
    c.translate(cx, cy); c.rotate(rot);
    elli(c, rx * 0.35, ry * 0.66, rx * 0.85, ry * 0.66, 0, P.chest, 0);
    scallops(c, -rx * 0.75, -ry * 0.55, 5, 2, rx * 0.32, ry * 0.32, rx * 0.11, 'rgba(26,26,46,0.3)');
    // barrado del pecho (rayas cortas, típicas del halcón)
    c.save(); c.lineCap = 'round'; c.strokeStyle = P.bars; c.lineWidth = Math.max(2.2, ry * 0.085);
    [[0.42, -0.25], [0.64, -0.05], [0.86, 0.1]].forEach(function (b) {
      for (var i = 0; i < 4; i++) {
        var x0 = rx * (b[1] + i * 0.26);
        c.beginPath(); c.moveTo(x0, ry * b[0]); c.lineTo(x0 + rx * 0.14, ry * (b[0] + 0.03)); c.stroke();
      }
    });
    c.restore();
    // franja de acento
    c.fillStyle = P.enemy ? P.tip : '#facc15';
    c.fillRect(-rx, ry * 0.08, rx * 2, Math.max(2, ry * 0.12));
    c.restore();
    elli(c, cx, cy, rx, ry, rot, null, 3);
  }

  // Alas en V abierta: la lejana casi vertical, la cercana hacia arriba y atrás.
  function drawAvuelo(c, P, pilot) {
    c.translate(0, 18);
    wing(c, P, -2, -12, -1.42, 40, true, 0.82);           // ala lejana
    blade(c, -30, 9, PI - 0.3, 38, 13, P.plateD, P.tipD);  // cola en abanico corto
    blade(c, -30, 3, PI + 0.2, 38, 13, P.plateD, P.tipD);
    blade(c, -30, 6, PI - 0.05, 46, 14, P.plate, P.tip);
    flame(c, -42, 25, 22, 6.5, P);                         // motor
    rf(c, -42, 17, 30, 16, 8, P.arm, 3);
    rf(c, -46, 19, 8, 12, 3, P.dark, 2.5);
    tube(c, [[2, 20], [-10, 31]], P.arm, 6);               // patas recogidas
    tube(c, [[-10, 31], [-18, 30]], P.claw, 3.5);
    tube(c, [[-10, 31], [-17, 35]], P.claw, 3.5);
    bodyA(c, P, -4, 6, 36, 21, 0);
    emblem(c, P, 20, 12, 1);
    head(c, P, 40, -8, 16);
    cockpit(c, P, 10, -19, 16, 15, pilot);
    wing(c, P, -12, -6, -2.32, 54, false, 1);             // ala cercana
  }

  function drawAposado(c, P, pilot) {
    // cola (larga y estrecha)
    blade(c, -12, -36, PI - 1.08, 40, 13, P.plateD, P.tipD);
    blade(c, -12, -34, PI - 0.72, 40, 13, P.plateD, P.tipD);
    blade(c, -12, -36, PI - 0.9, 50, 14, P.plate, P.tip);
    // pata lejana
    tube(c, [[-4, -40], [-8, -22], [-3, -7]], P.armD, 8);
    talon(c, P, -3, 0);
    bodyA(c, P, 3, -64, 22, 37, 0.4);
    emblem(c, P, 15, -68, 1.05);
    // pata cercana
    tube(c, [[8, -40], [4, -22], [11, -7]], P.arm, 8);
    talon(c, P, 11, 0);
    // ala plegada (cuelga por el costado; las puntas afiladas llegan al final de la cola)
    c.save(); c.translate(-10, -90); c.rotate(1.96);
    blade(c, 34, 10, 0.06, 46, 12, P.plateD, P.tipD);
    blade(c, 36, 2, 0.02, 58, 12, P.plate, P.tip);
    blade(c, 34, -6, -0.03, 50, 12, P.plate, P.tip);
    c.save();
    P2.rr(c, -6, -12, 50, 26, 13); c.fillStyle = P.bodyD; c.fill(); c.clip();
    scallops(c, 6, -2, 5, 2, 9, 8, 4.5, 'rgba(255,255,255,0.28)');
    c.restore();
    rf(c, -6, -12, 50, 26, 13, null, 2.5);
    rf(c, -2, -14, 38, 9, 4.5, P.arm, 2.5);
    circ(c, 0, -2, 8, P.plate, 2.5); circ(c, 0, -2, 3, P.arm, 0);
    c.restore();
    cockpit(c, P, -15, -104, 15, 14, pilot);
    head(c, P, 17, -108, 17);
  }

  // ---------- Variante B: Halcón-jet ----------
  function jetWing(c, P, far) {
    var plate = far ? P.plateD : P.plate, tip = far ? P.tipD : P.tip, fill = far ? P.dark : P.arm;
    var sy = far ? -1 : 1;
    [[-30, 9], [-38, 17], [-46, 25]].forEach(function (f) {
      feather(c, f[0], f[1] * sy, PI - 0.38 * sy, 20, 10, plate, tip);
    });
    poly(c, [[16, 3 * sy], [-30, 31 * sy], [-50, 31 * sy], [-26, 5 * sy]], fill, 3);
    // borde de ataque de color
    tube(c, [[10, 7 * sy], [-28, 28 * sy]], tip, W(2.5));
    circ(c, -36, 20 * sy, 2.2, plate, 1.5);
  }

  function jetBody(c, P, pilot, engineOn) {
    jetWing(c, P, true);
    feather(c, -40, -8, -2.5, 30, 12, P.plateD, P.tipD);   // aletas de cola
    feather(c, -34, -10, -2.2, 26, 11, P.plate, P.tip);
    if (engineOn) flame(c, -68, 1, 34, 9, P);
    else { c.globalAlpha = 0.6; circ(c, -70, 1, 5, P.flame, 0); c.globalAlpha = 1; }
    rf(c, -66, -11, 16, 24, 7, P.arm, 3);
    rf(c, -71, -7, 7, 16, 3, P.dark, 2.5);
    // fuselaje
    c.save();
    P2.rr(c, -58, -13, 96, 28, 14); c.fillStyle = P.body; c.fill(); c.clip();
    c.fillStyle = P.bodyD; c.fillRect(-60, 6, 100, 12);
    c.fillStyle = P.enemy ? P.tip : '#facc15'; c.fillRect(-60, 2, 100, 3.5);
    scallops(c, -46, -8, 4, 1, 9, 8, 4.5, 'rgba(26,26,46,0.3)');
    c.restore();
    rf(c, -58, -13, 96, 28, 14, null, 3);
    rf(c, 12, 4, 22, 10, 5, P.dark, 2.5);                   // toma de aire
    emblem(c, P, -24, -2, 0.8);
    cockpit(c, P, 3, -16, 19, 13, pilot);
    head(c, P, 42, -3, 15, 1.3);
    jetWing(c, P, false);
  }

  function drawBvuelo(c, P, pilot) {
    c.translate(4, 0);
    jetBody(c, P, pilot, true);
  }

  function drawBposado(c, P, pilot) {
    tube(c, [[-12, -38], [-2, -20], [-8, -7]], P.armD, 8);   // pata lejana
    talon(c, P, -8, 0);
    c.save(); c.translate(0, -50); c.rotate(-0.12);
    jetBody(c, P, pilot, false);
    c.restore();
    tube(c, [[0, -36], [10, -20], [4, -7]], P.arm, 8);       // pata cercana
    talon(c, P, 4, 0);
  }

  // ---------- Exportación ----------
  P2.fn.mechaHalcon = function (c, x, y, o) {
    o = o || {};
    var s = (typeof o.scale === 'number' && o.scale > 0) ? o.scale : 1;
    var facing = (o.facing === -1) ? -1 : 1;
    var enemy = !!o.enemy;
    var pilot = (typeof o.piloto === 'boolean') ? o.piloto : !enemy;
    var P = pal(enemy);
    var oldK = K;
    K = s > 1.6 ? 1.6 / s : 1;
    c.save();
    try {
      c.translate(x, y); c.scale(s * facing, s);
      c.lineJoin = 'round'; c.lineCap = 'round';
      var B = (o.variant === 'B' || o.variant === 'b');
      var posado = (o.modo === 'posado');
      if (posado) P2.shadow(c, 0, -1, B ? 52 : 46);
      if (!posado && o.disparo) {
        // plumas-dardo saliendo hacia delante desde el pico
        var nx = B ? 72 : 64, ny = B ? -3 : 10;
        [[24, -13, 22], [44, 1, 26], [18, 14, 22]].forEach(function (d) {
          c.save(); dart(c, P, nx + d[0], ny + d[1], d[2]); c.restore();
        });
      }
      if (B) { if (posado) drawBposado(c, P, pilot); else drawBvuelo(c, P, pilot); }
      else { if (posado) drawAposado(c, P, pilot); else drawAvuelo(c, P, pilot); }
    } catch (e) { /* un prototipo nunca debe romper la página */ }
    c.restore();
    K = oldK;
  };

  // ---------- Decorado de los paneles ----------
  function cloud(c, x, y, s, a) {
    c.save(); c.globalAlpha = a || 0.75; c.fillStyle = '#ffffff';
    [[0, 0, 18], [20, -8, 22], [42, 0, 17], [20, 6, 18]].forEach(function (p) {
      c.beginPath(); c.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, PI * 2); c.fill();
    });
    c.restore();
  }
  function speedLines(c, x, y, rows) {
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineCap = 'round'; c.lineWidth = 4;
    rows.forEach(function (r) { c.beginPath(); c.moveTo(x + r[0], y + r[1]); c.lineTo(x + r[0] - r[2], y + r[1]); c.stroke(); });
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
  function enemyInset(c, variant, bx, by, bw, bh, mx, my, ms) {
    P2.rf(c, bx, by, bw, bh, 12, 'rgba(226,232,240,0.92)', O, 3);
    c.save(); P2.rr(c, bx, by, bw, bh, 12); c.clip();
    c.globalAlpha = 0.85; c.fillStyle = '#7f1d1d'; c.fillRect(bx, by, bw, 24); c.globalAlpha = 1;
    P2.fn.mechaHalcon(c, mx, my, { variant: variant, modo: 'vuelo', enemy: true, disparo: true, scale: ms });
    c.restore();
    P2.rf(c, bx, by, bw, bh, 12, null, O, 3);
    P2.label(c, 'Antes: halcón enemigo', bx + bw / 2, by + 17, 12, '#fca5a5');
  }
  // Rótulo con línea: el punto se queda en el BORDE de lo que señala, sin taparlo.
  function callout(c, text, tx, ty, px, py, align) {
    c.save();
    P2.line(c, tx, ty, px, py, O, 5);
    P2.line(c, tx, ty, px, py, '#fef3c7', 2);
    P2.circ(c, px, py, 3.5, '#fef3c7', O, 2);
    c.restore();
    P2.label(c, text, tx, ty + (ty < py ? -4 : 14), 13, '#fef3c7', align);
  }
  function ground(c, y, top, side) {
    P2.rf(c, -10, y, 500, 80, 0, side, O, 3);
    P2.rf(c, -10, y, 500, 10, 0, top, O, 3);
    c.strokeStyle = 'rgba(26,26,46,0.35)'; c.lineWidth = 2;
    for (var i = 0; i < 9; i++) { c.beginPath(); c.moveTo(20 + i * 60, y + 10); c.lineTo(20 + i * 60, y + 80); c.stroke(); }
  }
  // Recuadro a escala de juego (scale 1): arriba, volando sobre Falcon; abajo, posado junto a él.
  // q = { vx, vy (centro del vuelo), mx (patas del posado), fx (pies de Falcon) }
  function scaleBox(c, variant, bx, by, bw, bh, q) {
    P2.rf(c, bx, by, bw, bh, 12, 'rgba(15,23,42,0.5)', O, 3);
    P2.label(c, 'A escala de juego', bx + bw / 2, by + 20, 13, '#fbbf24');
    P2.fn.mechaHalcon(c, q.vx, q.vy, { variant: variant, modo: 'vuelo', scale: 1 });
    P2.label(c, 'volando', q.lx, q.ly, 12, '#cbd5e1', q.la || 'left');
    var gy = by + bh - 16;
    P2.line(c, bx + 8, gy, bx + bw - 8, gy, 'rgba(254,243,199,0.6)', 2);
    P2.fn.mechaHalcon(c, q.mx, gy, { variant: variant, modo: 'posado', scale: 1 });
    P2.falcon(c, q.fx, gy, { scale: 1, facing: -1 });
    P2.label(c, 'Falcon', q.fx, gy + 13, 12, '#bbf7d0');
  }

  var SKY = ['#0369a1', '#7dd3fc'], DUSK = ['#1e3a8a', '#93c5fd'];

  P2.register({
    key: 'mechahalcon',
    title: 'Mecha-halcón (lo pilota Lord Falcon)',
    panels: [
      { title: 'A) Gran halcón — volando', subtitle: 'Alas enormes de plumas de metal · majestuoso', bg: SKY,
        render: function (c) {
          cloud(c, 360, 100, 1.0, 0.5); cloud(c, 390, 440, 0.9, 0.5);
          speedLines(c, 56, 300, [[0, 0, 40], [14, 24, 50]]);
          P2.fn.mechaHalcon(c, 222, 244, { variant: 'A', modo: 'vuelo', disparo: true, scale: 2.0 });
          enemyInset(c, 'A', 10, 356, 150, 112, 80, 424, 0.52);
          arrow(c, 164, 412, 222, 414, 230, 346, '#4ade80');
          P2.label(c, '¡hackeado!', 246, 420, 18, '#4ade80', 'left');
          callout(c, 'Plumas de metal', 62, 92, 92, 150, 'center');
          callout(c, 'Cabina: Lord Falcon', 330, 128, 270, 214, 'center');
          callout(c, 'Ojo-luz verde', 410, 330, 324, 276, 'center');
          P2.label(c, '¡Plumas-dardo!', 410, 206, 16, '#bbf7d0');
        } },
      { title: 'A) Gran halcón — posado', subtitle: 'Alas plegadas, listo para despegar', bg: DUSK,
        render: function (c) {
          ground(c, 430, '#94a3b8', '#475569');
          P2.fn.mechaHalcon(c, 154, 430, { variant: 'A', modo: 'posado', scale: 2.5 });
          scaleBox(c, 'A', 280, 74, 192, 350, { vx: 394, vy: 188, mx: 352, fx: 438, lx: 290, ly: 248 });
          callout(c, 'Alas plegadas', 84, 104, 102, 226, 'center');
          callout(c, 'Garras de metal', 236, 448, 200, 424, 'center');
        } },
      { title: 'B) Halcón-jet — volando', subtitle: 'Compacto y rápido: un caza con cara de halcón', bg: SKY,
        render: function (c) {
          cloud(c, 330, 120, 1.0, 0.5); cloud(c, 30, 420, 1.2, 0.6); cloud(c, 400, 430, 0.9, 0.5);
          speedLines(c, 50, 360, [[0, 0, 40], [24, 26, 50]]);
          P2.fn.mechaHalcon(c, 196, 278, { variant: 'B', modo: 'vuelo', disparo: true, scale: 1.85 });
          enemyInset(c, 'B', 10, 72, 150, 100, 88, 132, 0.6);
          arrow(c, 128, 176, 146, 206, 172, 224, '#4ade80');
          P2.label(c, '¡hackeado!', 62, 206, 18, '#4ade80');
          callout(c, 'Cabina: Lord Falcon', 250, 120, 214, 230, 'center');
          callout(c, 'Motor turbo', 70, 430, 90, 290, 'center');
          callout(c, 'Pico-morro', 330, 410, 318, 286, 'center');
          P2.label(c, '¡Plumas-dardo!', 404, 222, 16, '#bbf7d0');
        } },
      { title: 'B) Halcón-jet — posado', subtitle: 'Aterriza sobre sus garras de halcón', bg: DUSK,
        render: function (c) {
          cloud(c, 40, 110, 0.9, 0.45);
          ground(c, 430, '#94a3b8', '#475569');
          P2.fn.mechaHalcon(c, 172, 430, { variant: 'B', modo: 'posado', scale: 2.0 });
          scaleBox(c, 'B', 262, 70, 210, 222, { vx: 374, vy: 136, mx: 346, fx: 444, lx: 464, ly: 182, la: 'right' });
          callout(c, 'Motor apagado', 70, 196, 44, 318, 'center');
          callout(c, 'Garras de metal', 290, 450, 196, 424, 'center');
        } }
    ]
  });
})();
