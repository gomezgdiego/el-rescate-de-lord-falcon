// transformable.js — PROTOTIPO Parte 2: Robot transformable (lo pilota el Director)
// Robot del ejército de Dark Secuaz que el Director HACKEA: pasa a azul/cian
// (colores del Director) con el ojo-luz VERDE (regla: lo hackeado se vuelve verde)
// y el Director se ve en la cabina. Se transforma en coche para "Carrera en robot".
//   Variante A "Bólido": robot delgado que corre inclinado; coche de carreras bajo
//     (rueda en el hombro y en el gemelo, alerón-aleta a la espalda, casco en punta).
//   Variante B "Todoterreno": robot ancho tipo gorila; monster truck levantado
//     (ruedas con tacos de hombreras, puño = parachoques, barra de luces, muelles cian).
//   Enemigo: ceja enfadada; hackeado: sonrisa.
// Exporta:
//   P2.fn.transformableRobot(c, x, piesY, {variant:'A'|'B', enemy, scale, facing})
//   P2.fn.transformableCoche(c, x, sueloY, {variant:'A'|'B', enemy, scale, facing, boost})
(function () {
  'use strict';
  var O = P2.OUTLINE;
  var E = P2.PAL.enemy, H = P2.PAL.hacked, D = P2.PAL.director;

  // ---------- Paleta: enemigo (acero + rojo) o hackeado (azul/cian + verde) ----------
  function pal(enemy) {
    if (enemy) {
      return { BODY: E.STEEL, BODY2: E.STEEL_D, DARK: E.STEEL_DD, DEEP: E.DARK,
               ACC: E.RED_L, ACC2: E.RED, EYE: E.EYE, MARK: E.BRONZE,
               GLASS0: '#334155', GLASS1: '#0f172a', LAMP: '#fca5a5', TIRE: '#1f2430' };
    }
    return { BODY: D.SUIT2, BODY2: D.SUIT, DARK: '#1e2b5c', DEEP: D.VEST,
             ACC: D.CYAN, ACC2: '#0891b2', EYE: H.EYE, MARK: H.RED_L,
             GLASS0: '#cffafe', GLASS1: '#67e8f9', LAMP: '#a5f3fc', TIRE: '#1f2430' };
  }

  // ---------- Piezas comunes (mismas en robot y en coche) ----------
  // Rueda: neumático, llanta de color de acento, buje y tornillos. knobs = tacos de monster truck.
  function wheel(c, x, y, r, P, knobs) {
    c.save();
    if (knobs) {
      var n = 10;
      for (var i = 0; i < n; i++) {
        c.save(); c.translate(x, y); c.rotate(i * Math.PI * 2 / n + 0.15);
        P2.rf(c, r - 4, -r * 0.2, r * 0.26 + 4, r * 0.4, 2, P.TIRE, O, 2);
        c.restore();
      }
    }
    P2.circ(c, x, y, r, P.TIRE, O, 3);
    // banda interior del neumático
    c.strokeStyle = '#3a4152'; c.lineWidth = Math.max(1.5, r * 0.08);
    c.beginPath(); c.arc(x, y, r * 0.8, 0, Math.PI * 2); c.stroke();
    P2.circ(c, x, y, r * 0.58, P.ACC, O, 2.5);
    P2.circ(c, x, y, r * 0.3, P.DEEP, O, 2);
    for (var b = 0; b < 5; b++) {
      var a = b * Math.PI * 2 / 5 - Math.PI / 2;
      P2.circ(c, x + Math.cos(a) * r * 0.44, y + Math.sin(a) * r * 0.44, Math.max(1.2, r * 0.07), '#e2e8f0', null);
    }
    P2.circ(c, x - r * 0.1, y - r * 0.1, r * 0.09, '#ffffff', null);
    c.restore();
  }

  // Cabina: cristal; si es el robot hackeado, dentro se ve al Director (busto y cabeza).
  function cockpit(c, x, y, w, h, r, P, enemy) {
    c.save();
    P2.rr(c, x, y, w, h, r);
    var g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, P.GLASS0); g.addColorStop(1, P.GLASS1);
    c.fillStyle = g; c.fill();
    c.clip();
    if (!enemy) {
      var k = h / 44;
      P2.director(c, x + w * 0.46, y + 3 + 64 * k, { scale: k, facing: 1 });
    } else {
      // cabina vacía y tintada, con un brillo rojo dentro
      c.globalAlpha = 0.55; P2.circ(c, x + w * 0.6, y + h * 0.6, h * 0.22, E.RED_L, null); c.globalAlpha = 1;
    }
    // reflejo del cristal
    c.globalAlpha = 0.5; c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x + w * 0.62, y); c.lineTo(x + w * 0.78, y); c.lineTo(x + w * 0.52, y + h); c.lineTo(x + w * 0.36, y + h);
    c.closePath(); c.fill();
    c.globalAlpha = 1;
    c.restore();
    P2.rr(c, x, y, w, h, r); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
  }

  // Marca de cuernos de Dark Toros: bronce en el enemigo, VERDE si está hackeado.
  function mark(c, x, y, s, P) { P2.horns(c, x, y, s, P.MARK); }

  // Rayo decorativo (puerta del Todoterreno)
  function bolt(c, x, y, s, col) {
    P2.poly(c, [[x - 10 * s, y - 7 * s], [x + 3 * s, y - 7 * s], [x - 1 * s, y - 1 * s], [x + 11 * s, y - 1 * s],
      [x - 6 * s, y + 9 * s], [x - 2 * s, y + 2 * s], [x - 13 * s, y + 2 * s]], col, O, 2);
  }

  // Tubos de escape cromados
  function stack(c, x, yTop, h) {
    P2.rf(c, x, yTop, 6, h, 3, '#cbd5e1', O, 2.5);
    P2.rf(c, x - 1.5, yTop - 2, 9, 5, 2, '#94a3b8', O, 2);
  }

  // Extremidad: rectángulo redondeado girado entre dos puntos (articulaciones).
  function limb(c, x1, y1, x2, y2, w, fill, lw) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy);
    c.save(); c.translate(x1, y1); c.rotate(Math.atan2(dy, dx));
    P2.rf(c, -w / 2, -w / 2, L + w, w, w / 2, fill, O, lw || 3);
    c.restore();
  }
  // Ceja enfadada (solo el enemigo) y sonrisa (solo el hackeado), sobre/bajo el visor.
  function face(c, P, enemy, vx, vy, vw, vh) {
    if (enemy) {
      P2.poly(c, [[vx - 3, vy - 9], [vx + vw + 3, vy - 3], [vx + vw + 3, vy + 1], [vx - 3, vy - 4]], E.DARK, O, 2.5);
    } else {
      c.strokeStyle = O; c.lineWidth = 2.5;
      c.beginPath(); c.arc(vx + vw * 0.55, vy + vh + 1.5, 3.6, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }
  }

  // =====================================================================
  //  VARIANTE A — BÓLIDO, modo robot (pies en 0,0; mira a la derecha).
  //  Delgado y alto, inclinado hacia delante como un corredor. ~126 px
  // =====================================================================
  var A_HIP = -58, A_LEAN = 0.17;
  function robotA(c, P, enemy) {
    P2.elli(c, -6, -1, 38, 6, 'rgba(0,0,0,0.25)', null);
    // pierna trasera estirada hacia atrás (en carrera), con la rueda trasera en el gemelo
    limb(c, -4, -54, -14, -31, 13, P.BODY2);
    limb(c, -14, -31, -29, -11, 13, P.BODY2);
    P2.rf(c, -42, -12, 22, 11, 5, P.DEEP, O, 3);
    wheel(c, -21, -21, 10.5, P, false);
    // caderas
    P2.rf(c, -13, -62, 26, 11, 5, P.DEEP, O, 3);
    // pierna delantera (rodilla adelantada)
    limb(c, 4, -54, 15, -34, 15, P.BODY);
    limb(c, 15, -34, 10, -10, 15, P.BODY);
    P2.circ(c, 15, -34, 5, P.ACC, O, 2);                  // rodillera
    P2.rf(c, 0, -12, 30, 12, 6, P.DEEP, O, 3);            // pie
    P2.rf(c, 22, -10, 7, 7, 3, P.ACC, O, 2);              // puntera
    // ---- tronco, cabeza y brazos inclinados hacia delante ----
    c.save(); c.translate(0, A_HIP); c.rotate(A_LEAN);
    // alerón de pie a la espalda, como una aleta (el del coche)
    P2.line(c, -15, -32, -28, -36, O, 6); P2.line(c, -15, -32, -28, -36, P.DARK, 3);
    P2.line(c, -15, -18, -28, -20, O, 6); P2.line(c, -15, -18, -28, -20, P.DARK, 3);
    P2.rf(c, -36, -50, 9, 36, 4, P.ACC, O, 3);
    // brazo trasero
    limb(c, -6, -30, -14, -8, 10, P.BODY2, 2.5);
    P2.circ(c, -14, -6, 6, P.BODY2, O, 2.5);
    // torso = capó + cabina del coche
    P2.rf(c, -18, -40, 36, 42, 12, P.BODY, O, 3);
    cockpit(c, -1, -37, 21, 20, 6, P, enemy);
    P2.rf(c, -18, -13, 36, 6, 3, P.ACC, O, 2.5);           // franja de carreras
    // hombro = rueda delantera del coche (asoma por detrás)
    wheel(c, -17, -32, 10.5, P, false);
    // cuello y casco de carreras en punta (con la aleta del coche)
    P2.rf(c, -5, -46, 10, 8, 3, P.DEEP, O, 2.5);
    P2.poly(c, [[-4, -63], [-25, -55], [-4, -44]], P.BODY, O, 3);   // punta trasera
    P2.poly(c, [[-12, -58], [-21, -71], [-3, -61]], P.ACC, O, 2.5); // aleta
    P2.rf(c, -9, -64, 26, 22, 10, P.BODY, O, 3);
    mark(c, 0, -64, 0.48, P);                                      // cuernos hacia el cielo
    P2.rf(c, 4, -58, 14, 10, 4, P.DEEP, O, 2.5);           // visor
    P2.eyeLight(c, 12, -53, 3.4, P.EYE);
    face(c, P, enemy, 4, -58, 14, 10);
    // brazo delantero: hombro hacia el centro, puño a la altura del pecho
    P2.circ(c, -7, -20, 6, P.BODY2, O, 2.5);
    limb(c, -7, -20, 8, -3, 10, P.BODY);
    limb(c, 8, -3, 23, -21, 10, P.BODY);
    P2.rf(c, 18, -31, 15, 15, 5, P.BODY, O, 3);           // puño
    P2.rf(c, 29, -29, 5, 11, 2, P.ACC, O, 2);             // nudillos
    c.restore();
  }
  // Punto del robot A en coordenadas de pies (para los rótulos de los paneles)
  function ptA(lx, ly) {
    var cs = Math.cos(A_LEAN), sn = Math.sin(A_LEAN);
    return [lx * cs - ly * sn, A_HIP + lx * sn + ly * cs];
  }

  // =====================================================================
  //  VARIANTE A — BÓLIDO, modo coche (suelo en 0, centro en x=0). ~124 px de largo
  // =====================================================================
  function cocheA(c, P, enemy, boost) {
    P2.elli(c, 0, -1, 64, 6, 'rgba(0,0,0,0.25)', null);
    if (boost) {
      c.save(); c.globalAlpha = 0.85;
      P2.poly(c, [[-60, -22], [-92, -18], [-60, -13]], enemy ? E.RED_L : D.CYAN, O, 2);
      P2.poly(c, [[-60, -20], [-78, -17.5], [-60, -15]], '#ffffff', null);
      c.restore();
    }
    // alerón (el que lleva el robot a la espalda)
    P2.line(c, -46, -28, -50, -42, O, 6); P2.line(c, -46, -28, -50, -42, P.DARK, 3);
    P2.line(c, -36, -28, -40, -42, O, 6); P2.line(c, -36, -28, -40, -42, P.DARK, 3);
    P2.rf(c, -64, -48, 30, 9, 4, P.ACC, O, 3);
    // casco del robot = cabina abombada (con la aleta detrás)
    P2.poly(c, [[-30, -32], [-26, -46], [-16, -34]], P.ACC, O, 2.5);
    cockpit(c, -22, -54, 34, 26, 12, P, enemy);
    // carrocería en cuña
    P2.poly(c, [[-62, -10], [-62, -27], [-50, -33], [-26, -35], [16, -33], [48, -25], [62, -18], [62, -10]], P.BODY, O, 3);
    P2.rf(c, -58, -25, 98, 6, 3, P.ACC, O, 2.5);           // franja de carreras
    P2.rf(c, -60, -16, 120, 9, 4, P.BODY2, O, 2.5);        // faldón
    // pasos de rueda
    P2.circ(c, -36, -12, 15, P.DEEP, null);
    P2.circ(c, 38, -12, 15, P.DEEP, null);
    // el ojo-luz del robot es ahora el faro delantero (dentro de la cuña)
    P2.eyeLight(c, 50, -21, 4.2, P.EYE);
    // cuernos como figura del capó, apuntando al cielo
    mark(c, 26, -31, 0.45, P);
    wheel(c, -36, -12, 12, P, false);
    wheel(c, 38, -12, 12, P, false);
  }

  // =====================================================================
  //  VARIANTE B — TODOTERRENO, modo robot (pies en 0,0). ~135 px
  // =====================================================================
  //  Ancho y bajo como un gorila: ruedas con tacos de hombreras y el
  //  puño-parachoques casi en el suelo. ~126 px
  function robotB(c, P, enemy) {
    P2.elli(c, 2, -1, 54, 7, 'rgba(0,0,0,0.25)', null);
    // tubos de escape a la espalda
    stack(c, -42, -122, 40); stack(c, -32, -118, 34);
    // brazo trasero colgando (nudillos al suelo)
    limb(c, -30, -88, -40, -56, 16, P.BODY2);
    limb(c, -40, -56, -46, -28, 16, P.BODY2);
    P2.rf(c, -57, -30, 22, 20, 7, P.BODY2, O, 3);
    // pierna trasera: corta y gorda
    P2.rf(c, -30, -48, 26, 38, 9, P.BODY2, O, 3);
    P2.rf(c, -36, -14, 36, 14, 6, P.DEEP, O, 3);
    // hombrera trasera = rueda del camión
    wheel(c, -30, -94, 17, P, true);
    // caderas
    P2.rf(c, -34, -56, 68, 12, 6, P.DEEP, O, 3);
    // pierna delantera con el rayo
    P2.rf(c, 2, -48, 28, 38, 9, P.BODY, O, 3);
    bolt(c, 16, -30, 0.8, P.ACC);
    P2.rf(c, -2, -14, 42, 14, 6, P.DEEP, O, 3);
    P2.rf(c, 32, -12, 8, 10, 3, P.ACC, O, 2);
    // torso ancho = cabina del camión
    P2.rf(c, -38, -108, 76, 58, 16, P.BODY, O, 3);
    cockpit(c, 10, -104, 26, 22, 6, P, enemy);
    P2.rf(c, -38, -76, 76, 6, 3, P.ACC, O, 2.5);           // franja
    // cabeza baja, hundida entre los hombros, con barra de luces
    P2.rf(c, 0, -126, 34, 22, 8, P.BODY, O, 3);
    P2.rf(c, 2, -132, 30, 8, 3, P.DEEP, O, 2.5);
    [9, 17, 25].forEach(function (lx) { P2.circ(c, lx, -128, 2.4, P.LAMP, O, 1.5); });
    P2.rf(c, 15, -120, 18, 10, 4, P.DEEP, O, 2.5);         // visor
    P2.eyeLight(c, 24, -115, 3.8, P.EYE);
    face(c, P, enemy, 15, -120, 18, 10);
    // brazo delantero colgando como un gorila
    limb(c, -8, -92, 24, -62, 17, P.BODY);
    P2.circ(c, 24, -62, 6, P.ACC, O, 2);                  // codo
    limb(c, 24, -62, 40, -32, 18, P.BODY);
    // hombrera delantera = la otra rueda, con guardabarros y cuernos
    wheel(c, -8, -94, 15, P, true);
    P2.rf(c, -30, -118, 40, 11, 5, P.BODY2, O, 3);
    mark(c, -10, -118, 0.5, P);
    // puño = parachoques de barras del camión, casi en el suelo
    P2.rf(c, 30, -40, 22, 28, 7, P.BODY, O, 3);
    P2.rf(c, 48, -42, 8, 32, 3, P.DEEP, O, 2.5);
    [-34, -26, -18].forEach(function (yy) { P2.line(c, 50, yy, 54, yy, '#cbd5e1', 2); });
  }

  // =====================================================================
  //  VARIANTE B — TODOTERRENO, modo coche (monster truck). ~124 px de largo
  // =====================================================================
  function cocheB(c, P, enemy, boost) {
    P2.elli(c, 0, -1, 66, 7, 'rgba(0,0,0,0.25)', null);
    // ruedas gigantes (abajo); la carrocería va LEVANTADA sobre la suspensión
    wheel(c, -36, -24, 23, P, true);
    wheel(c, 38, -24, 23, P, true);
    // suspensión: amortiguadores con muelle cian, del buje al chasis (se ven en el hueco)
    // (salen del borde de arriba del neumático para no tapar la llanta cian)
    [[-36, 22], [38, -22]].forEach(function (w) {
      var hx = w[0], by = -40, tx = w[0] + w[1] * 0.25, ty = -70;
      limb(c, hx, by, tx, ty, 7, P.DEEP, 2.5);
      [[O, 4.5], [P.ACC, 2.5]].forEach(function (st) {
        c.strokeStyle = st[0]; c.lineWidth = st[1]; c.beginPath();
        for (var i = 0; i <= 5; i++) { var u = 0.12 + i * 0.13; c.lineTo(hx + (tx - hx) * u + (i % 2 ? 5 : -5), by + (ty - by) * u); }
        c.stroke();
      });
    });
    c.save(); c.translate(0, -22);
    if (boost) {
      // humo hacia atrás, a la altura del tubo
      c.save(); c.globalAlpha = 0.8;
      P2.circ(c, -42, -98, 5, '#cbd5e1', null); P2.circ(c, -54, -100, 6.5, '#e2e8f0', null);
      c.restore();
    }
    // tubos de escape detrás de la cabina
    stack(c, -32, -94, 26);
    // carrocería de pick-up
    P2.poly(c, [[-60, -44], [-60, -66], [-28, -66], [-22, -92], [12, -92], [24, -68], [56, -64], [60, -56], [60, -44]], P.BODY, O, 3);
    cockpit(c, -16, -88, 30, 21, 6, P, enemy);
    P2.rf(c, -20, -98, 34, 8, 3, P.DEEP, O, 2.5);          // barra de luces
    [-12, -3, 6].forEach(function (lx) { P2.circ(c, lx, -94, 2.4, P.LAMP, O, 1.5); });
    bolt(c, -40, -55, 0.9, P.ACC);                         // rayo
    P2.rf(c, -62, -48, 124, 9, 4, P.BODY2, O, 2.5);         // faldón
    mark(c, 40, -66, 0.5, P);                              // cuernos en el capó
    // parachoques de barras (el puño del robot)
    P2.rf(c, 58, -66, 9, 24, 4, P.DEEP, O, 2.5);
    P2.line(c, 60, -60, 65, -60, '#cbd5e1', 2); P2.line(c, 60, -52, 65, -52, '#cbd5e1', 2);
    // el ojo-luz como faro
    P2.eyeLight(c, 52, -57, 3.8, P.EYE);
    c.restore();
  }

  // ---------- Exportadas ----------
  function draw(fn, c, x, y, o) {
    o = o || {};
    var s = (typeof o.scale === 'number' && o.scale > 0) ? o.scale : 1;
    var f = (o.facing === -1) ? -1 : 1;
    var enemy = !!o.enemy;
    c.save();
    try {
      c.translate(x, y); c.scale(s * f, s);
      c.lineJoin = 'round'; c.lineCap = 'round';
      fn(c, pal(enemy), enemy, !!o.boost);
    } catch (e) { /* nunca lanzar */ }
    c.restore();
  }
  P2.fn.transformableRobot = function (c, x, y, o) {
    draw((o && o.variant === 'B') ? robotB : robotA, c, x, y, o);
  };
  P2.fn.transformableCoche = function (c, x, y, o) {
    draw((o && o.variant === 'B') ? cocheB : cocheA, c, x, y, o);
  };

  // ---------- Utilidades de los paneles ----------
  function arrow(c, x1, y1, cx, cy, x2, y2, col) {
    c.save(); c.lineCap = 'round';
    [[O, 9], [col, 5]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.stroke();
    });
    var a = Math.atan2(y2 - cy, x2 - cx);
    c.translate(x2, y2); c.rotate(a);
    P2.poly(c, [[10, 0], [-6, -9], [-6, 9]], col, O, 2.5);
    c.restore();
  }
  function ground(c, y, col) {
    c.fillStyle = col || 'rgba(0,0,0,0.28)'; c.fillRect(0, y, 480, 480 - y);
    P2.line(c, 0, y, 480, y, 'rgba(255,255,255,0.18)', 2);
  }
  function pointer(c, x1, y1, x2, y2) {
    P2.line(c, x1, y1, x2, y2, O, 4); P2.line(c, x1, y1, x2, y2, '#fef3c7', 2);
    P2.circ(c, x2, y2, 3, '#fef3c7', O, 1.5);
  }
  function enemyInset(c, variant, sc) {
    P2.rf(c, 10, 72, 124, 162, 14, 'rgba(15,23,42,0.55)', 'rgba(239,68,68,0.7)', 2);
    P2.label(c, 'Enemigo', 72, 89, 13, '#fca5a5');
    P2.fn.transformableRobot(c, 78, 224, { variant: variant, enemy: true, scale: sc });
    arrow(c, 96, 242, 110, 290, 176, 302, '#22c55e');
    P2.label(c, '¡hackeado!', 72, 280, 17, '#86efac');
  }
  function speedLines(c, x, y, n) {
    c.save(); c.globalAlpha = 0.45;
    for (var i = 0; i < n; i++) {
      var len = 40 + (i * 37) % 50, yy = y + i * 18;
      P2.line(c, x - len - (i * 23) % 30, yy, x - (i * 23) % 30, yy, '#ffffff', 3);
    }
    c.restore();
  }

  P2.register({
    key: 'transformable',
    title: 'Robot transformable (lo pilota el Director)',
    panels: [
      {
        title: 'A) Bólido — modo robot',
        subtitle: 'Ruedas en hombros y piernas, alerón a la espalda',
        bg: ['#1e1238', '#86198f'],
        render: function (c) {
          var X = 300, Y = 458, S = 2.35;
          function at(p) { return [X + p[0] * S, Y + p[1] * S]; }
          ground(c, Y);
          P2.fn.transformableRobot(c, X, Y, { variant: 'A', scale: S });
          enemyInset(c, 'A', 0.84);
          // primero las líneas, después el texto (para que no tapen letras)
          var eye = at(ptA(12, -53)), cab = at(ptA(9.5, -30)), sh = at(ptA(-17, -32)), calf = at([-21, -21]);
          pointer(c, 398, 192, eye[0] + 4, eye[1]);
          pointer(c, 394, 236, cab[0] + 4, cab[1]);
          pointer(c, 142, 364, sh[0] - 6, sh[1] + 8);
          pointer(c, 142, 378, calf[0] - 8, calf[1]);
          P2.label(c, 'ojo verde', 436, 197, 14, '#86efac');
          P2.label(c, 'Director', 432, 234, 14, '#fef3c7'); P2.label(c, 'al volante', 432, 251, 14, '#fef3c7');
          P2.label(c, 'ruedas del coche', 76, 376, 14, '#fef3c7');
        }
      },
      {
        title: 'A) Bólido — modo coche',
        subtitle: 'Bajo y rapidísimo: las mismas piezas y colores',
        bg: ['#1e1238', '#86198f'],
        render: function (c) {
          ground(c, 262, 'rgba(0,0,0,0.22)');
          for (var i = 0; i < 6; i++) P2.rf(c, 10 + i * 84, 272, 46, 5, 2.5, 'rgba(254,243,199,0.45)', null);
          speedLines(c, 92, 170, 5);
          P2.fn.transformableCoche(c, 262, 258, { variant: 'A', scale: 2.5, boost: true });
          pointer(c, 384, 146, 262 + 50 * 2.5, 258 - 21 * 2.5); P2.label(c, 'el ojo verde es el faro', 372, 138, 14, '#86efac');
          // comparación a escala de juego (scale 1)
          P2.rf(c, 10, 290, 460, 180, 12, 'rgba(15,23,42,0.5)', null);
          P2.label(c, 'Escala de juego', 20, 310, 13, '#fbbf24', 'left');
          P2.line(c, 20, 460, 460, 460, 'rgba(255,255,255,0.25)', 2);
          P2.director(c, 52, 460, { scale: 1 });
          P2.fn.transformableRobot(c, 140, 460, { variant: 'A', scale: 1 });
          P2.fn.transformableCoche(c, 330, 460, { variant: 'A', scale: 1 });
        }
      },
      {
        title: 'B) Todoterreno — modo robot',
        subtitle: 'Ruedas gigantes con tacos, barra de luces y rayo',
        bg: ['#1c1206', '#9a5b13'],
        render: function (c) {
          var X = 300, Y = 458, S = 2.2;
          function at(p) { return [X + p[0] * S, Y + p[1] * S]; }
          ground(c, Y);
          P2.fn.transformableRobot(c, X, Y, { variant: 'B', scale: S });
          enemyInset(c, 'B', 0.8);
          var eye = at([24, -115]), cab = at([23, -95]), wb = at([-30, -94]), wf = at([-8, -94]);
          pointer(c, 404, 194, eye[0] + 4, eye[1]);
          pointer(c, 402, 240, cab[0] + 6, cab[1]);
          pointer(c, 142, 364, wb[0] - 4, wb[1] + 14);
          pointer(c, 142, 378, wf[0] - 2, wf[1] + 22);
          P2.label(c, 'ojo verde', 442, 199, 14, '#86efac');
          P2.label(c, 'Director', 438, 238, 14, '#fef3c7'); P2.label(c, 'al volante', 438, 255, 14, '#fef3c7');
          P2.label(c, 'ruedas gigantes', 76, 368, 14, '#fef3c7'); P2.label(c, 'en los hombros', 76, 385, 14, '#fef3c7');
        }
      },
      {
        title: 'B) Todoterreno — modo coche',
        subtitle: 'Monster truck: ¡salta por encima de todo!',
        bg: ['#1c1206', '#9a5b13'],
        render: function (c) {
          ground(c, 282, 'rgba(0,0,0,0.22)');
          P2.elli(c, 36, 282, 24, 11, '#78350f', O, 2.5); P2.elli(c, 450, 282, 18, 8, '#78350f', O, 2.5);
          P2.fn.transformableCoche(c, 250, 282, { variant: 'B', scale: 1.65, boost: true });
          // la suspensión levantada: rótulo con flecha (línea antes que el texto)
          pointer(c, 398, 222, 250 + 34 * 1.65, 282 - 52 * 1.65);
          P2.label(c, 'muelles', 432, 214, 14, '#a5f3fc'); P2.label(c, 'saltarines', 432, 231, 14, '#a5f3fc');
          // comparación a escala de juego (scale 1)
          P2.rf(c, 10, 296, 460, 174, 12, 'rgba(15,23,42,0.5)', null);
          P2.label(c, 'Escala de juego', 20, 316, 13, '#fbbf24', 'left');
          P2.line(c, 20, 460, 460, 460, 'rgba(255,255,255,0.25)', 2);
          P2.director(c, 52, 460, { scale: 1 });
          P2.fn.transformableRobot(c, 140, 460, { variant: 'B', scale: 1 });
          P2.fn.transformableCoche(c, 330, 460, { variant: 'B', scale: 1 });
        }
      }
    ]
  });
})();
