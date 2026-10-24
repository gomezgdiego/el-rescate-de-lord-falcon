// heroes.js — PROTOTIPOS Parte 3 "We Are a Team": los nuevos héroes.
// MIKEY STARK (genio de la tecnología, 3 lanzadores de energía) y
// PETER ROGERS (el defensor, escudo que bloquea y se lanza).
// Dos variantes de cada uno (A y B) para que Juanjo elija.
//
// Exporta:
//   P2.fn.mikey(c, x, piesY, {variant:'A'|'B', scale, facing, pose:'idle'|'disparo', arma:'francotirador'|'pistola'|'metralleta'})
//   P2.fn.peter(c, x, piesY, {variant:'A'|'B', scale, facing, pose:'idle'|'bloquear'|'lanzar'})
//   P2.fn.lanzadorMikey(c, x, y, {tipo, scale, facing})    (x,y) = empuñadura
//   P2.fn.escudoPeter(c, x, y, {variant, scale, angle})     (x,y) = centro
//   P2.fn.bolaEnergia(c, x, y, {scale, trail})              (x,y) = centro (bola azul de Mikey)
// Los héroes miden ~64-70 px a escala 1 (como el Director y Falcon) y se anclan en los pies.
(function () {
  'use strict';
  var O = P2.OUTLINE;

  function safe(fn) {
    return function (c, x, y, o) {
      if (!c || !c.save) return;
      c.save();
      try { fn(c, x || 0, y || 0, o || {}); }
      catch (e) { if (window.console && console.warn) console.warn('[heroes]', e); }
      c.restore();
    };
  }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  // ---------- pequeñas piezas ----------
  function eye(c, x, y, r, look) {
    P2.circ(c, x, y, r, '#ffffff', O, 2);
    P2.circ(c, x + look, y + r * 0.12, r * 0.56, O, null);
    P2.circ(c, x + look + r * 0.22, y - r * 0.12, r * 0.22, '#ffffff', null);
  }
  // núcleo de energía azul (brilla)
  function core(c, x, y, r) {
    c.save();
    c.globalAlpha = 0.4; P2.circ(c, x, y, r * 1.8, '#60a5fa', null); c.globalAlpha = 1;
    P2.circ(c, x, y, r, '#3b82f6', O, Math.max(1, r * 0.35));
    P2.circ(c, x, y, r * 0.55, '#bfdbfe', null);
    P2.circ(c, x - r * 0.2, y - r * 0.25, r * 0.25, '#ffffff', null);
    c.restore();
  }
  function bola(c, x, y, r, trail) {
    c.save();
    if (trail) {
      var g = c.createLinearGradient(x - trail, 0, x, 0);
      g.addColorStop(0, 'rgba(96,165,250,0)'); g.addColorStop(1, 'rgba(147,197,253,0.85)');
      c.fillStyle = g; c.beginPath();
      c.moveTo(x - trail, y); c.quadraticCurveTo(x - trail * 0.4, y - r * 0.95, x, y - r * 0.95);
      c.lineTo(x, y + r * 0.95); c.quadraticCurveTo(x - trail * 0.4, y + r * 0.95, x - trail, y);
      c.closePath(); c.fill();
    }
    c.globalAlpha = 0.3; P2.circ(c, x, y, r * 1.9, '#60a5fa', null);
    c.globalAlpha = 0.5; P2.circ(c, x, y, r * 1.4, '#93c5fd', null); c.globalAlpha = 1;
    P2.circ(c, x, y, r, '#3b82f6', O, Math.max(1.5, Math.min(3, r * 0.22)));
    P2.circ(c, x, y, r * 0.62, '#93c5fd', null);
    P2.circ(c, x - r * 0.18, y - r * 0.2, r * 0.32, '#ffffff', null);
    // chispitas (deterministas)
    c.strokeStyle = '#e0f2fe'; c.lineWidth = Math.max(1.5, r * 0.14); c.lineCap = 'round';
    [[1.5, -1.2], [1.7, 0.9], [0.4, -1.8]].forEach(function (p) {
      var sx = x + r * p[0], sy = y + r * p[1], d = r * 0.28;
      c.beginPath(); c.moveTo(sx - d, sy); c.lineTo(sx + d, sy); c.moveTo(sx, sy - d); c.lineTo(sx, sy + d); c.stroke();
    });
    c.restore();
  }
  // flecha con contorno (para los paneles)
  function arrowHead(c, x, y, ang, sz, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    P2.poly(c, [[sz, 0], [-sz * 0.7, -sz * 0.75], [-sz * 0.35, 0], [-sz * 0.7, sz * 0.75]], col, O, 2.5);
    c.restore();
  }
  function curveArrow(c, x0, y0, cx, cy, x1, y1, col, lw) {
    c.save(); c.lineCap = 'round';
    c.strokeStyle = O; c.lineWidth = lw + 4;
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();
    c.strokeStyle = col; c.lineWidth = lw;
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();
    arrowHead(c, x1, y1, Math.atan2(y1 - cy, x1 - cx), lw * 2.2, col);
    c.restore();
  }
  // rótulo con línea que apunta a un detalle
  function callout(c, txt, lx, ly, px, py, size, col, align) {
    var sy = ly + (py > ly ? 5 : -(size || 13) - 1);
    c.save();
    P2.line(c, lx, sy, px, py, O, 4.5);
    P2.line(c, lx, sy, px, py, '#fef3c7', 2);
    P2.circ(c, px, py, 3.5, '#fef3c7', O, 2);
    c.restore();
    P2.label(c, txt, lx, ly, size || 13, col || '#fef3c7', align);
  }
  function keycap(c, x, y, txt, col) {
    P2.rf(c, x - 15, y - 13, 30, 30, 7, '#475569', O, 3);
    P2.rf(c, x - 12, y - 13, 24, 24, 6, col || '#e2e8f0', O, 2);
    P2.label(c, txt, x, y + 6, 16, '#ffffff');
  }
  function ground(c, y, top, bottom) {
    c.fillStyle = bottom; c.fillRect(0, y, 480, 480 - y);
    c.fillStyle = top; c.fillRect(0, y, 480, 7);
    P2.line(c, 0, y, 480, y, O, 3);
  }
  // estrellita de impacto (amarilla, 4 puntas)
  function star(c, x, y, r) {
    P2.poly(c, [[x, y - r * 1.8], [x + r * 0.5, y - r * 0.5], [x + r * 1.8, y], [x + r * 0.5, y + r * 0.5],
      [x, y + r * 1.8], [x - r * 0.5, y + r * 0.5], [x - r * 1.8, y], [x - r * 0.5, y - r * 0.5]], '#fde047', O, 1.8);
  }
  function stars(c, pts) {
    c.save(); c.fillStyle = 'rgba(254,243,199,0.55)';
    pts.forEach(function (p) {
      c.beginPath(); c.arc(p[0], p[1], p[2] || 1.6, 0, Math.PI * 2); c.fill();
    });
    c.restore();
  }

  // =====================================================================
  //  LANZADORES DE MIKEY (juguetes de ciencia ficción, rechonchos)
  //  Unidades: escala 1 = tamaño en la mano del héroe. (0,0) = empuñadura.
  // =====================================================================
  var MUZZLE = { pistola: [16, -4.5], metralleta: [26, -6.5], francotirador: [44, -5.5] };

  function drawLanzador(c, tipo, k) {
    var L = function (w) { return w * k; };
    if (tipo === 'francotirador') {
      // culata
      P2.rf(c, -18, -9, 13, 9, 4, '#be123c', O, L(2.2));
      P2.rf(c, -16, -7, 4, 3, 1.5, '#fda4af', null);
      // empuñadura
      P2.rf(c, -3, -2, 6, 10, 2.5, '#9f1239', O, L(2));
      // patitas de la mira
      P2.rf(c, -2, -15, 3, 6, 1, '#334155', O, L(1.5));
      P2.rf(c, 8, -15, 3, 6, 1, '#334155', O, L(1.5));
      // cañón largo blanco con anillos de energía
      P2.rf(c, 13, -8.5, 28, 6, 3, '#f1f5f9', O, L(2.2));
      [21, 29].forEach(function (bx) {
        P2.rf(c, bx, -9.5, 3.5, 8, 1.5, '#60a5fa', O, L(1.5));
      });
      // cuerpo
      P2.rf(c, -8, -11, 23, 11, 5.5, '#f43f5e', O, L(2.2));
      P2.rf(c, -5, -9.3, 9, 2.4, 1.2, '#fecdd3', null);
      core(c, 7, -5.5, 2.8);
      // mira (tubo claro con ocular pegado y lente azul)
      P2.rf(c, -10, -19.2, 5, 5, 2, '#e2e8f0', O, L(1.6));
      P2.rf(c, -6, -20, 21, 6.5, 3.2, '#e2e8f0', O, L(2));
      P2.rf(c, -3, -18.8, 12, 1.8, 0.9, '#ffffff', null);
      P2.rf(c, 4, -20, 3, 6.5, 1, '#fb7185', O, L(1.2));
      P2.circ(c, 15, -16.7, 3.6, '#93c5fd', O, L(1.6));
      P2.circ(c, 14.2, -17.6, 1.1, '#ffffff', null);
      // boca del cañón
      P2.circ(c, 43, -5.5, 4.5, '#f43f5e', O, L(2.2));
      core(c, 43.6, -5.5, 2.2);
    } else if (tipo === 'metralleta') {
      // empuñadura
      P2.rf(c, -3, -2, 6, 10, 2.5, '#5b21b6', O, L(2));
      // tres cañoncitos
      [-10, -6.8, -3.6].forEach(function (by) {
        P2.rf(c, 14, by, 11, 3, 1.5, '#e2e8f0', O, L(1.5));
      });
      [-8.5, -5.3, -2.1].forEach(function (by) { P2.circ(c, 25.5, by, 1.4, '#60a5fa', O, L(1)); });
      // cuerpo
      P2.rf(c, -10, -12, 26, 12, 6, '#a855f7', O, L(2.2));
      P2.rf(c, -7, -10.4, 10, 2.4, 1.2, '#e9d5ff', null);
      // aleta de arriba
      P2.poly(c, [[-6, -11.5], [-2, -16], [6, -16], [8, -11.5]], '#fbbf24', O, L(1.8));
      // TAMBOR (rosa, con ventanitas de energía)
      P2.circ(c, 2, 2, 7.5, '#ec4899', O, L(2.2));
      P2.circ(c, 2, 2, 4.8, '#be185d', O, L(1.4));
      [0, 1, 2, 3, 4, 5].forEach(function (i) {
        var a = i * Math.PI / 3 + 0.3;
        P2.circ(c, 2 + Math.cos(a) * 6, 2 + Math.sin(a) * 6, 1.3, '#93c5fd', null);
      });
      core(c, 2, 2, 2.3);
    } else { // pistola
      // empuñadura
      P2.rf(c, -3, -2, 6, 10, 2.5, '#ea580c', O, L(2));
      // cuerpo rechoncho amarillo
      P2.rf(c, -8, -10, 19, 11, 5.5, '#facc15', O, L(2.2));
      P2.rf(c, -5, -8.4, 7, 2.4, 1.2, '#fef9c3', null);
      // antenita
      P2.line(c, -4, -10, -6, -14.5, O, L(1.6));
      P2.circ(c, -6, -15, 1.8, '#f97316', O, L(1.3));
      // boca de energía (anillo naranja)
      P2.rf(c, 10, -11, 6, 13, 3, '#f97316', O, L(2));
      core(c, 16, -4.5, 3);
    }
  }

  P2.fn.lanzadorMikey = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = o.facing === -1 ? -1 : 1;
    var tipo = MUZZLE[o.tipo] ? o.tipo : 'pistola';
    c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';
    drawLanzador(c, tipo, Math.min(1, 2.2 / s));
  });

  P2.fn.bolaEnergia = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = o.facing === -1 ? -1 : 1;
    c.translate(x, y); c.scale(f, 1);
    bola(c, 0, 0, 5 * s, num(o.trail, 0));
  });

  // =====================================================================
  //  ESCUDOS DE PETER — (x,y) = centro, radio 20 a escala 1
  //  A = la rueda de Juanjo (radios verdes y negros)
  //  B = "Caparazón": hexágonos como una tortuga, con núcleo amarillo
  // =====================================================================
  function drawEscudo(c, V, ang, k) {
    var L = function (w) { return w * k; };
    var R = 20;
    if (V === 'B') {
      // «Caparazón»: concha de tortuga con borde ondulado de placas pequeñas
      var JOINT = '#451a03';
      c.save(); c.rotate(ang);
      P2.circ(c, 0, 0, R - 0.5, '#92400e', O, L(3));
      // borde ondulado: 14 plaquitas que asoman un poco
      for (var j = 0; j < 14; j++) {
        var b = j * Math.PI * 2 / 14;
        P2.circ(c, Math.cos(b) * (R - 1.4), Math.sin(b) * (R - 1.4), 2.9, '#92400e', O, L(1.6));
      }
      // fondo de las juntas
      P2.circ(c, 0, 0, R - 4.6, JOINT, null);
      // 6 placas de concha alrededor
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + Math.PI / 6, d = 0.47;
        var pts = [
          [Math.cos(a - d) * 9.4, Math.sin(a - d) * 9.4],
          [Math.cos(a - 0.36) * 14.6, Math.sin(a - 0.36) * 14.6],
          [Math.cos(a) * 15.2, Math.sin(a) * 15.2],
          [Math.cos(a + 0.36) * 14.6, Math.sin(a + 0.36) * 14.6],
          [Math.cos(a + d) * 9.4, Math.sin(a + d) * 9.4]
        ];
        P2.poly(c, pts, i % 2 ? '#d97706' : '#b45309', JOINT, L(1.4));
        // vetas de concha
        c.strokeStyle = 'rgba(254,243,199,0.45)'; c.lineWidth = L(1);
        c.beginPath(); c.moveTo(Math.cos(a - 0.2) * 11, Math.sin(a - 0.2) * 11);
        c.lineTo(Math.cos(a + 0.2) * 11, Math.sin(a + 0.2) * 11); c.stroke();
      }
      // placa central grande (hexágono) con núcleo que brilla
      var hp = [];
      for (var q = 0; q < 6; q++) { var qa = q * Math.PI / 3; hp.push([Math.cos(qa) * 7.6, Math.sin(qa) * 7.6]); }
      P2.poly(c, hp, '#fbbf24', JOINT, L(1.8));
      c.restore();
      c.save(); c.globalAlpha = 0.5; P2.circ(c, 0, 0, 3.6, '#fff7ae', null); c.restore();
      P2.circ(c, 0, 0, 2, '#fef9c3', null);
      P2.circ(c, -1.6, -1.8, 1.3, '#ffffff', null);
    } else {
      // borde negro grueso
      P2.circ(c, 0, 0, R, '#27272a', O, L(3));
      // disco de metal claro
      P2.circ(c, 0, 0, R - 4, '#e5e7eb', O, L(1.8));
      // 8 radios: verde, negro, verde, negro...
      c.save(); c.rotate(ang);
      for (var r = 0; r < 8; r++) {
        c.save(); c.rotate(r * Math.PI / 4);
        P2.rf(c, 3, -1.9, R - 7.5, 3.8, 1.6, r % 2 ? '#1f2937' : '#22c55e', O, L(1.4));
        c.restore();
      }
      c.restore();
      // buje (centro)
      P2.circ(c, 0, 0, 5, '#1f2937', O, L(2));
      P2.circ(c, 0, 0, 2.3, '#4ade80', null);
      // tuercas en el borde
      for (var n = 0; n < 8; n++) {
        var bb = n * Math.PI / 4 + Math.PI / 8 + ang;
        P2.circ(c, Math.cos(bb) * (R - 2), Math.sin(bb) * (R - 2), 1.1, '#86efac', null);
      }
    }
    // brillo
    c.save(); c.globalAlpha = 0.45; c.strokeStyle = '#ffffff'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, R - 6.5, Math.PI * 1.08, Math.PI * 1.42); c.stroke(); c.restore();
  }

  var escudo = safe(function (c, x, y, o) {
    var s = num(o.scale, 1);
    c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
    drawEscudo(c, o.variant === 'B' ? 'B' : 'A', num(o.angle, 0), Math.min(1, 2.2 / s));
  });
  P2.fn.escudoPeter = escudo;
  P2.fn.escudoPeterHeroe = escudo; // alias estable (por si otro módulo reutiliza el nombre)

  // =====================================================================
  //  MIKEY STARK
  // =====================================================================
  var MIKEY = {
    A: { // "El científico": bata blanca + naranja, pelo negro de punta, gafas de inventor
      COAT: '#f8fafc', COAT2: '#cbd5e1', SHIRT: '#f97316', PANTS: '#334155', BOOT: '#1f2937', TOE: '#f97316',
      GLOVE: '#f97316', SKIN: '#f2c49b', HAIR: '#1f2433', PACK: '#475569'
    },
    B: { // "El hacker del taller": sudadera violeta + amarillo, rizos pelirrojos, cascos con antena
      COAT: '#8b5cf6', COAT2: '#6d28d9', SHIRT: '#fbbf24', PANTS: '#5b21b6', BOOT: '#1f2937', TOE: '#fbbf24',
      GLOVE: '#fbbf24', SKIN: '#d9a066', HAIR: '#ea580c', PACK: '#fbbf24'
    }
  };

  function mikeyHead(c, V, P, pose) {
    var hy = -48;
    if (V === 'B') {
      // capucha detrás del cuello
      P2.rf(c, -18, -40, 18, 11, 5, P.COAT2, O, 2.5);
    }
    // cuello + cara
    P2.rf(c, -5, -36, 10, 6, 3, P.SKIN, O, 2);
    P2.circ(c, 0, hy, 15, P.SKIN, O, 3);
    if (V === 'A') {
      // pelo negro de punta (científico despeinado)
      P2.poly(c, [[-15.5, -45], [-20, -55], [-13, -55.5], [-14, -66], [-5, -61], [-1, -71], [5, -62.5],
        [13, -68], [13.5, -58], [19.5, -58], [15.5, -50], [11, -55], [3, -56.5], [-6, -55.5], [-12, -51]], P.HAIR, O, 3);
      P2.line(c, -6, -61, -2, -57, '#475569', 1.5);
      P2.line(c, 6, -61, 8, -57, '#475569', 1.5);
      // patilla
      P2.rf(c, -15, -50, 5, 9, 2.5, P.HAIR, O, 2);
      // gafas de inventor sobre la frente
      P2.rf(c, -15.5, -60, 31, 4.5, 2, '#7c2d12', O, 2);
      P2.circ(c, -2.5, -59, 5, '#f97316', O, 2);
      P2.circ(c, 9, -59, 5, '#f97316', O, 2);
      P2.circ(c, -2.5, -59, 3, '#fde68a', null);
      P2.circ(c, 9, -59, 3, '#fde68a', null);
      P2.circ(c, -3.6, -60.2, 1, '#ffffff', null);
      P2.circ(c, 7.9, -60.2, 1, '#ffffff', null);
      // ojos y cejas
      eye(c, -3, -46, 3.4, 1.2);
      eye(c, 8, -46, 3.4, 1.2);
      P2.line(c, -6.5, -51.5, -0.5, -51, O, 2.2);
      P2.line(c, 5, -51, 11.5, -52, O, 2.2);
      // sonrisa de genio
      c.strokeStyle = O; c.lineWidth = 2.5; c.beginPath();
      if (pose === 'disparo') c.arc(3, -40.5, 4.2, 0.05 * Math.PI, 0.95 * Math.PI);
      else c.arc(3, -41, 3.6, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
      // pecas
      P2.circ(c, -7.5, -41.5, 0.9, '#c2410c', null); P2.circ(c, -5.5, -40.5, 0.9, '#c2410c', null);
    } else {
      // rizos pelirrojos (bultos que se funden)
      var curls = [[-14, -50, 5.5], [-12, -58, 6.5], [-4, -62.5, 7], [5, -62, 7], [12, -57, 6], [15, -50, 4.5], [-16, -44, 4]];
      curls.forEach(function (q) { P2.circ(c, q[0], q[1], q[2], P.HAIR, O, 3); });
      curls.forEach(function (q) { P2.circ(c, q[0], q[1], q[2] - 1.6, P.HAIR, null); });
      P2.rf(c, -12, -58, 24, 7, 3.5, P.HAIR, null);
      c.strokeStyle = '#9a3412'; c.lineWidth = 1.5;
      [[-6, -60], [3, -61], [10, -56]].forEach(function (q) { c.beginPath(); c.arc(q[0], q[1], 2.4, 0.2, Math.PI * 1.3); c.stroke(); });
      // cascos (diadema + auricular + micro + antena)
      c.strokeStyle = O; c.lineWidth = 5.5; c.beginPath(); c.arc(-2, -50, 15, Math.PI * 1.02, Math.PI * 1.62); c.stroke();
      c.strokeStyle = '#1f2937'; c.lineWidth = 3; c.beginPath(); c.arc(-2, -50, 15, Math.PI * 1.02, Math.PI * 1.62); c.stroke();
      P2.line(c, 2, -64, 0, -74, O, 4); P2.line(c, 2, -64, 0, -74, '#94a3b8', 2);
      c.save(); c.globalAlpha = 0.4; P2.circ(c, 0, -75, 4.5, '#f472b6', null); c.restore();
      P2.circ(c, 0, -75, 2.8, '#f472b6', O, 2);
      P2.rf(c, -19, -54, 9, 13, 4.5, '#fbbf24', O, 2.5);
      P2.circ(c, -14.5, -47.5, 2, '#f472b6', null);
      // micro hacia la boca
      c.strokeStyle = O; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-12, -43); c.quadraticCurveTo(-6, -36, 4, -37.5); c.stroke();
      c.strokeStyle = '#475569'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-12, -43); c.quadraticCurveTo(-6, -36, 4, -37.5); c.stroke();
      P2.circ(c, 5, -37.5, 2.2, '#f472b6', O, 1.5);
      // ojos; el de delante con monóculo-visor rosa
      eye(c, -2, -47, 3.4, 1.2);
      eye(c, 9, -47, 3.4, 1.2);
      c.save(); c.globalAlpha = 0.55; P2.circ(c, 9, -47, 5.6, '#f472b6', null); c.restore();
      P2.circ(c, 9, -47, 5.6, null, O, 2);
      P2.line(c, 14.5, -48, 16, -53, O, 2);
      P2.line(c, -5.5, -52, 0.5, -53, O, 2.2);
      // sonrisa de lado
      c.strokeStyle = O; c.lineWidth = 2.5; c.beginPath();
      if (pose === 'disparo') c.arc(3, -42, 3.5, 0.05 * Math.PI, 0.9 * Math.PI);
      else { c.moveTo(0, -41); c.quadraticCurveTo(4, -39, 7, -42); }
      c.stroke();
    }
  }

  P2.fn.mikey = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = o.facing === -1 ? -1 : 1;
    var V = o.variant === 'B' ? 'B' : 'A', P = MIKEY[V];
    var pose = o.pose === 'disparo' ? 'disparo' : 'idle';
    var arma = MUZZLE[o.arma] ? o.arma : 'pistola';
    var wS = arma === 'francotirador' ? 0.78 : (arma === 'metralleta' ? 0.88 : 1);
    c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';

    P2.elli(c, 0, -1, 16, 4, 'rgba(0,0,0,0.22)', null);

    // ---- mochila (detrás) ----
    if (V === 'A') {
      P2.rf(c, -25, -32, 12, 22, 4, P.PACK, O, 2.5);
      // pila de energía: ventana azul que brilla + rayito amarillo
      P2.rf(c, -23, -29.5, 8, 16, 3, '#1e3a8a', O, 1.5);
      core(c, -19, -21, 3.5);
      P2.poly(c, [[-18, -28.5], [-21, -24.5], [-19, -24.5], [-20.5, -21], [-16.5, -25.5], [-18.5, -25.5], [-17, -28.5]], '#fde047', O, 1);
      P2.circ(c, -19, -34, 2.2, '#f97316', O, 1.5);
    } else {
      // llave inglesa grande e inclinada asomando de la mochila (boca en U)
      c.save(); c.translate(-20, -30); c.rotate(-0.45);
      P2.rf(c, -2.6, -19, 5.2, 20, 2.6, '#cbd5e1', O, 2);
      P2.poly(c, [[-6, -17], [-6, -25], [-2.6, -28.5], [-1.8, -23.5], [1.8, -23.5], [2.6, -28.5], [6, -25], [6, -17]], '#cbd5e1', O, 2);
      P2.line(c, -1, -14, -1, -4, '#f8fafc', 1.4);
      c.restore();
      P2.rf(c, -26, -33, 13, 23, 5, P.PACK, O, 2.5);
      P2.rf(c, -24, -26, 9, 6, 2.5, '#1e293b', O, 1.5);
      P2.rf(c, -22.5, -25, 6, 4, 2, '#60a5fa', null);
    }

    // ---- faldón de la bata (A) ----
    if (V === 'A') P2.poly(c, [[-16, -20], [6, -20], [6, -6], [-12, -6], [-19, -9]], P.COAT2, O, 2.5);

    // ---- brazo trasero ----
    P2.rf(c, -20, -29, 8, 16, 4, P.COAT2, O, 2.5);
    P2.circ(c, -16, -12, 4.5, P.GLOVE, O, 2);

    // ---- piernas y botas ----
    P2.rf(c, -9, -14, 8, 12, 3, P.PANTS, O, 2.5);
    P2.rf(c, 1, -14, 8, 12, 3, P.PANTS, O, 2.5);
    P2.rf(c, -10, -5, 11, 5, 2.5, P.BOOT, O, 2.5);
    P2.rf(c, 1, -5, 12, 5, 2.5, P.BOOT, O, 2.5);
    P2.rf(c, 8, -4.5, 5, 4, 2, P.TOE, null);

    // ---- torso ----
    if (V === 'A') {
      P2.rf(c, -15, -32, 30, 24, 10, P.COAT, O, 3);
      // camiseta naranja en la abertura de la bata
      P2.poly(c, [[4, -31.5], [13, -30], [14.5, -12], [7, -9]], P.SHIRT, O, 2);
      P2.line(c, 4, -31, 1, -12, O, 2);
      // bolsillo con bolis
      P2.rf(c, -9, -20, 8, 7, 2, P.COAT2, O, 2);
      P2.line(c, -7, -20, -7.5, -24, '#3b82f6', 2.2);
      P2.line(c, -4, -20, -3.5, -24.5, '#ef4444', 2.2);
      // insignia de engranaje
      c.save(); c.translate(-6, -27);
      for (var g = 0; g < 6; g++) { c.save(); c.rotate(g * Math.PI / 3); P2.rf(c, -1.3, -4.6, 2.6, 3, 0.6, '#f97316', O, 1); c.restore(); }
      P2.circ(c, 0, 0, 3.2, '#f97316', O, 1.5); P2.circ(c, 0, 0, 1.2, '#7c2d12', null);
      c.restore();
    } else {
      P2.rf(c, -15, -32, 30, 24, 10, P.COAT, O, 3);
      // cremallera amarilla y bolsillo canguro
      P2.line(c, 6, -31, 6, -12, P.SHIRT, 2.2);
      P2.rf(c, -9, -18, 17, 8, 3, P.COAT2, O, 2);
      // parche con rayo
      P2.rf(c, -10, -29, 10, 9, 3, '#4c1d95', O, 2);
      P2.poly(c, [[-4, -28], [-7.5, -24], [-5, -24], [-6.5, -21], [-2.5, -25.5], [-5, -25.5]], P.SHIRT, null);
      // cordones de la sudadera
      P2.line(c, 9, -31, 9.5, -25, '#fbbf24', 1.6);
      P2.line(c, 12, -31, 12.5, -26, '#fbbf24', 1.6);
    }
    // cinturón
    P2.rf(c, -15, -12, 30, 4, 2, '#1f2937', O, 2);
    P2.rf(c, 3, -12.5, 6, 5, 1.5, P.SHIRT, O, 1.5);

    mikeyHead(c, V, P, pose);

    // ---- brazo delantero + lanzador ----
    var k = 1;
    if (pose === 'disparo') {
      P2.rf(c, 5, -30, 19, 8, 4, P.COAT2 === '#cbd5e1' ? P.COAT : P.COAT, O, 2.5);
      c.save(); c.translate(24, -25); c.scale(wS, wS); drawLanzador(c, arma, k); c.restore();
      P2.circ(c, 24, -24, 4.6, P.GLOVE, O, 2);
      // fogonazo en la boca del lanzador
      var m = MUZZLE[arma];
      var mx = 24 + m[0] * wS + 3, my = -25 + m[1] * wS;
      c.save(); c.globalAlpha = 0.6; P2.circ(c, mx, my, 5.5, '#bfdbfe', null); c.restore();
      c.strokeStyle = '#e0f2fe'; c.lineWidth = 1.8;
      [[-0.8, 8], [0, 9], [0.8, 8]].forEach(function (q) {
        c.beginPath(); c.moveTo(mx + Math.cos(q[0]) * 4, my + Math.sin(q[0]) * 4);
        c.lineTo(mx + Math.cos(q[0]) * q[1], my + Math.sin(q[0]) * q[1]); c.stroke();
      });
    } else {
      P2.rf(c, 8, -29, 8, 16, 4, P.COAT, O, 2.5);
      c.save(); c.translate(12, -13); c.rotate(0.55); c.scale(wS * 0.9, wS * 0.9); drawLanzador(c, arma, k); c.restore();
      P2.circ(c, 12, -12, 4.5, P.GLOVE, O, 2);
    }
  });

  // =====================================================================
  //  PETER ROGERS
  // =====================================================================
  var PETER = {
    A: { // "El guardián de la rueda": amarillo + negro + verde (a juego con el escudo de Juanjo)
      SUIT: '#facc15', SUIT2: '#eab308', ARMOR: '#1f2937', ACC: '#22c55e', PANTS: '#1f2937', BOOT: '#facc15',
      GLOVE: '#1f2937', SKIN: '#f2c49b'
    },
    B: { // "El caballero tortuga": frambuesa + crema + gris carbón, tupé y bufanda
      SUIT: '#db2777', SUIT2: '#9d174d', ARMOR: '#fef3c7', ACC: '#f59e0b', PANTS: '#3f3f46', BOOT: '#db2777',
      GLOVE: '#fef3c7', SKIN: '#c68a5a'
    }
  };

  function peterHead(c, V, P, pose) {
    var hy = -48;
    if (V === 'B') {
      // bufanda: cola ondeando hacia atrás
      P2.poly(c, [[-6, -37], [-22, -40], [-30, -35], [-24, -33], [-30, -28], [-18, -30], [-6, -31]], P.ACC, O, 2.5);
    }
    P2.rf(c, -5, -36, 10, 6, 3, P.SKIN, O, 2);
    P2.circ(c, 0, hy, 15, P.SKIN, O, 3);
    var fierce = pose === 'bloquear' || pose === 'lanzar';
    if (V === 'A') {
      // casco AMARILLO con raya verde y visera negra
      c.beginPath(); c.moveTo(-16.5, -44); c.arc(0, -48, 16.5, Math.PI * 1.03, Math.PI * 1.97);
      c.lineTo(22, -51); c.lineTo(15, -46.5); c.quadraticCurveTo(0, -55, -16.5, -44); c.closePath();
      c.fillStyle = P.SUIT; c.fill(); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
      c.save(); c.lineCap = 'butt';
      c.beginPath(); c.arc(0, -48, 15, Math.PI * 1.2, Math.PI * 1.8); c.strokeStyle = O; c.lineWidth = 6.5; c.stroke();
      c.beginPath(); c.arc(0, -48, 15, Math.PI * 1.2, Math.PI * 1.8); c.strokeStyle = P.ACC; c.lineWidth = 4; c.stroke(); c.restore();
      // visera negra
      c.beginPath(); c.moveTo(8, -52.5); c.lineTo(22, -51); c.lineTo(15, -46.5); c.quadraticCurveTo(10, -48.5, 6, -49.5); c.closePath();
      c.fillStyle = P.ARMOR; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
      // brillo del casco
      c.save(); c.globalAlpha = 0.55; c.strokeStyle = '#fef9c3'; c.lineWidth = 2;
      c.beginPath(); c.arc(0, -48, 12, Math.PI * 1.08, Math.PI * 1.18); c.stroke(); c.restore();
      P2.circ(c, -13, -45, 4.5, P.ARMOR, O, 2);
      P2.circ(c, -13, -45, 1.8, P.ACC, null);
      // correa de la barbilla
      c.strokeStyle = '#374151'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-10, -41); c.quadraticCurveTo(-4, -33.5, 6, -35); c.stroke();
      // mechón (castaño claro, para que se vea bajo el casco amarillo)
      P2.poly(c, [[1, -50.5], [7, -51.5], [4.5, -47.5]], '#b45309', O, 1.5);
      eye(c, -2.5, -45, 3.3, 1.2);
      eye(c, 8.5, -45, 3.3, 1.2);
      P2.line(c, -6, fierce ? -48.5 : -49.5, 0.5, -48.5, O, 2.4);
      P2.line(c, 5, -48.5, 12, fierce ? -48.5 : -49.5, O, 2.4);
      if (fierce) {
        // sonrisa valiente con dientes
        c.beginPath(); c.moveTo(-0.5, -41.5); c.lineTo(8, -42); c.quadraticCurveTo(5, -35, -0.5, -41.5); c.closePath();
        c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = O; c.lineWidth = 2; c.stroke();
      } else {
        c.strokeStyle = O; c.lineWidth = 2.5; c.beginPath();
        c.arc(3.5, -40.5, 3.4, 0.15 * Math.PI, 0.85 * Math.PI);
        c.stroke();
      }
    } else {
      // tupé castaño hacia delante
      P2.poly(c, [[-15, -45], [-16.5, -55], [-10, -62], [0, -65.5], [11, -66], [21, -61], [16, -58], [18, -53],
        [11, -55], [3, -54], [-7, -52.5], [-12, -48]], '#6b3f1d', O, 3);
      c.strokeStyle = '#a16207'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-6, -60); c.quadraticCurveTo(4, -64, 14, -61); c.stroke();
      c.beginPath(); c.moveTo(-9, -55); c.quadraticCurveTo(0, -59, 9, -57.5); c.stroke();
      // oreja
      P2.circ(c, -12, -46, 3.4, P.SKIN, O, 2);
      eye(c, -2, -46, 3.3, 1.2);
      eye(c, 8.5, -46, 3.3, 1.2);
      P2.line(c, -5.5, fierce ? -50 : -51, 0.5, -50.5, O, 2.6);
      P2.line(c, 5, -50.5, 12, fierce ? -50 : -51.5, O, 2.6);
      c.strokeStyle = O; c.lineWidth = 2.5; c.beginPath();
      if (fierce) c.arc(4, -40.5, 3.4, 0.1 * Math.PI, 0.9 * Math.PI);
      else c.arc(3.5, -41, 3.6, 0.1 * Math.PI, 0.9 * Math.PI);
      c.stroke();
      // nudo de la bufanda
      P2.rf(c, -9, -36, 18, 5.5, 2.75, P.ACC, O, 2.5);
    }
  }

  P2.fn.peter = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = o.facing === -1 ? -1 : 1;
    var V = o.variant === 'B' ? 'B' : 'A', P = PETER[V];
    var pose = (o.pose === 'bloquear' || o.pose === 'lanzar') ? o.pose : 'idle';
    c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';

    P2.elli(c, 0, -1, 17, 4, 'rgba(0,0,0,0.22)', null);

    var lean = pose === 'idle' ? 0 : 2.5;

    // ---- piernas (en guardia: abiertas) ----
    var sp = pose === 'idle' ? 0 : 3;
    P2.rf(c, -10 - sp, -14, 9, 12, 3, P.PANTS, O, 2.5);
    P2.rf(c, 1 + sp, -14, 9, 12, 3, P.PANTS, O, 2.5);
    P2.rf(c, -11 - sp, -6, 12, 6, 3, P.BOOT, O, 2.5);
    P2.rf(c, 1 + sp, -6, 13, 6, 3, P.BOOT, O, 2.5);
    P2.rf(c, -11 - sp, -7.5, 12, 3, 1.5, V === 'A' ? P.ARMOR : P.ARMOR, O, 1.5);
    P2.rf(c, 1 + sp, -7.5, 13, 3, 1.5, P.ARMOR, O, 1.5);

    c.save(); c.translate(lean, 0);
    // ---- brazo trasero ----
    if (pose === 'lanzar') {
      c.save(); c.translate(-14, -28); c.rotate(0.9);
      P2.rf(c, -4, 0, 8, 16, 4, P.SUIT2, O, 2.5); P2.circ(c, 0, 17, 4.8, P.GLOVE, O, 2);
      c.restore();
    } else if (pose === 'bloquear') {
      c.save(); c.translate(-13, -28); c.rotate(-0.7);
      P2.rf(c, -4, 0, 8, 16, 4, P.SUIT2, O, 2.5); P2.circ(c, 0, 17, 4.8, P.GLOVE, O, 2);
      c.restore();
    } else {
      P2.rf(c, -22, -29, 9, 16, 4.5, P.SUIT2, O, 2.5);
      P2.circ(c, -17.5, -12, 4.8, P.GLOVE, O, 2);
    }

    // ---- torso ancho de defensor ----
    P2.rf(c, -17, -33, 34, 25, 11, P.SUIT, O, 3);
    if (V === 'A') {
      // peto negro con rueda-emblema
      P2.rf(c, -12, -30, 24, 15, 6, P.ARMOR, O, 2.5);
      P2.circ(c, 2, -23, 5, '#e5e7eb', O, 1.8);
      for (var r = 0; r < 4; r++) {
        c.save(); c.translate(2, -23); c.rotate(r * Math.PI / 4);
        P2.line(c, -4, 0, 4, 0, r % 2 ? '#1f2937' : P.ACC, 1.8); c.restore();
      }
      P2.circ(c, 2, -23, 1.5, '#1f2937', null);
      P2.rf(c, -17, -15, 34, 3.5, 1.5, P.ACC, O, 1.5);
    } else {
      // peto crema con hexágono de tortuga
      P2.rf(c, -12, -31, 24, 17, 7, P.ARMOR, O, 2.5);
      var hp = [];
      for (var h = 0; h < 6; h++) { var ha = h * Math.PI / 3; hp.push([2 + Math.cos(ha) * 5, -23 + Math.sin(ha) * 5]); }
      P2.poly(c, hp, P.SUIT, O, 1.8);
      P2.circ(c, 2, -23, 1.6, P.ACC, null);
    }
    // hombrera delantera
    P2.circ(c, 12, -30, 6, P.ARMOR, O, 2.5);
    // cinturón
    P2.rf(c, -17, -12, 34, 4.5, 2, V === 'A' ? '#1f2937' : '#3f3f46', O, 2);
    P2.rf(c, 1, -12.5, 7, 5.5, 1.5, P.ACC, O, 1.5);

    peterHead(c, V, P, pose);

    // ---- brazo delantero + escudo ----
    if (pose === 'bloquear') {
      P2.rf(c, 6, -31, 14, 8, 4, P.SUIT2, O, 2.5);
      c.save(); c.translate(22, -27); drawEscudo(c, V, 0, 1); c.restore();
      // "remolinos" de fuerza delante del escudo
      c.save(); c.globalAlpha = 0.6; c.strokeStyle = '#fef3c7'; c.lineWidth = 1.8;
      c.beginPath(); c.arc(22, -27, 24, -0.6, 0.6); c.stroke(); c.restore();
    } else if (pose === 'lanzar') {
      c.save(); c.translate(8, -29); c.rotate(-0.35);
      P2.rf(c, 0, -4, 19, 8, 4, P.SUIT2, O, 2.5);
      // mano abierta (dedos)
      P2.circ(c, 21, 0, 4.8, P.GLOVE, O, 2);
      P2.rf(c, 22, -4, 6, 3, 1.5, P.GLOVE, O, 1.5);
      P2.rf(c, 23, -0.5, 6, 3, 1.5, P.GLOVE, O, 1.5);
      c.restore();
      // líneas de movimiento
      c.save(); c.globalAlpha = 0.6;
      P2.line(c, -24, -40, -32, -40, '#fef3c7', 1.8); P2.line(c, -24, -33, -34, -33, '#fef3c7', 1.8);
      c.restore();
    } else {
      P2.rf(c, 9, -29, 9, 15, 4.5, P.SUIT2, O, 2.5);
      c.save(); c.translate(15, -18); c.scale(0.62, 0.8); drawEscudo(c, V, 0, 1.1); c.restore();
    }
    c.restore();
  });

  // =====================================================================
  //  PANELES
  // =====================================================================
  function mikeyPanel(V) {
    var A = V === 'A';
    return function (c) {
      stars(c, [[40, 90], [120, 120], [200, 84], [250, 150], [60, 200], [470, 230], [285, 220]]);
      ground(c, 418, A ? '#94a3b8' : '#a78bfa', A ? '#334155' : '#3b1f63');
      // baldosas del laboratorio
      c.save(); c.globalAlpha = 0.35;
      for (var i = 0; i < 9; i++) P2.line(c, i * 60 + 10, 426, i * 60 - 20, 480, O, 2);
      c.restore();

      var S = 2.7, X = 135, Y = 418;
      var arma = A ? 'pistola' : 'metralleta';
      P2.fn.mikey(c, X, Y, { variant: V, scale: S, pose: 'disparo', arma: arma });
      // bola de energía saliendo
      var wS = A ? 1 : 0.88, m = MUZZLE[arma];
      var by = Y + (-25 + m[1] * wS) * S;
      if (A) {
        bola(c, 345, by, 17, 90);
      } else {
        bola(c, 316, by, 9, 40); bola(c, 370, by - 4, 9, 40); bola(c, 424, by + 3, 9, 40);
      }
      P2.label(c, A ? '¡ZAP!' : '¡RA-TA-TA!', A ? 360 : 380, by - 32, 22, '#93c5fd');

      // Rótulos
      if (A) {
        callout(c, 'gafas de inventor', 70, 196, X + 2 * S, Y - 60 * S, 14);
        callout(c, 'bata de laboratorio', 268, 400, X + 0.5 * S, Y - 24 * S, 14);
        callout(c, 'pila de energía', 74, 466, X - 21 * S, Y - 22 * S, 14);
        callout(c, 'pistola', 268, 290, X + 33 * S, Y - 33 * S, 14);
      } else {
        callout(c, 'cascos con antena', 72, 168, X - 3 * S, Y - 64 * S, 14);
        callout(c, 'llave inglesa', 50, 238, X - 30 * S, Y - 50 * S, 13);
        callout(c, 'visor rosa', 250, 214, X + 13 * S, Y - 50 * S, 14);
        callout(c, 'sudadera de taller', 90, 466, X - 4 * S, Y - 15 * S, 14);
        callout(c, 'metralleta', 300, 466, X + 28 * S, Y - 22 * S, 14);
      }

      // Escala de juego (arriba a la derecha)
      P2.rf(c, 318, 74, 154, 124, 12, 'rgba(11,16,32,0.55)', '#fef3c7', 2);
      P2.label(c, 'Escala de juego', 395, 94, 13, '#fbbf24');
      P2.line(c, 330, 182, 460, 182, '#94a3b8', 2);
      P2.director(c, 360, 182, { scale: 1 });
      P2.fn.mikey(c, 425, 182, { variant: V, scale: 1, arma: 'pistola' });
      P2.label(c, 'Director', 360, 194, 12, '#e2e8f0');
      P2.label(c, 'Mikey', 425, 194, 12, '#e2e8f0');
      // el arma NO depende de la variante: los dos llevan los 3 lanzadores
      P2.label(c, 'Lleva los 3 lanzadores', 395, 218, 12, '#93c5fd');
      P2.label(c, '(teclas 1, 2 y 3)', 395, 234, 12, '#93c5fd');
    };
  }

  function peterPanel(V) {
    var A = V === 'A';
    return function (c) {
      stars(c, [[30, 110], [250, 80], [210, 150], [460, 92], [300, 130]]);
      ground(c, 300, A ? '#a3e635' : '#fda4af', A ? '#14532d' : '#4a1730');
      P2.label(c, '1) ¡Bloquea todo!', 120, 92, 15, '#fef3c7');
      P2.label(c, '2) ¡Lo lanza!', 360, 92, 15, '#fef3c7');

      // separador entre las dos escenas
      c.save(); c.setLineDash([8, 7]); c.globalAlpha = 0.6;
      P2.line(c, 254, 102, 254, 294, '#fef3c7', 2.5); c.restore();

      // --- 1) BLOQUEAR, con un amigo detrás ---
      P2.director(c, 34, 300, { scale: 1.15 });
      P2.label(c, 'amigo', 36, 194, 12, '#86efac');
      P2.label(c, 'a salvo', 36, 210, 12, '#86efac');
      P2.fn.peter(c, 118, 300, { variant: V, scale: 2.05, pose: 'bloquear' });
      var shX = 118 + 24.5 * 2.05, shY = 300 - 27 * 2.05;
      // un dron malo dispara desde arriba a la derecha...
      var dX = 226, dY = 136;
      P2.call('dronEnjambre', c, dX, dY, { scale: 1.1, facing: -1 });
      // ...y su bola roja choca contra el escudo (estela hacia el dron)
      var ix = shX + Math.cos(-0.75) * 43, iy = shY + Math.sin(-0.75) * 43; // punto de impacto
      bolaRoja(c, ix + 5, iy - 6, 8, dX - 6, dY + 14);
      c.save(); c.globalAlpha = 0.9;
      c.strokeStyle = '#fde047'; c.lineWidth = 3;
      [[-1.9, 12, 20], [-1.2, 13, 23], [-0.2, 13, 23], [0.5, 12, 20]].forEach(function (q) {
        c.beginPath(); c.moveTo(ix + Math.cos(q[0]) * q[1], iy + Math.sin(q[0]) * q[1]);
        c.lineTo(ix + Math.cos(q[0]) * q[2], iy + Math.sin(q[0]) * q[2]); c.stroke();
      });
      c.restore();
      P2.label(c, '¡CLINC!', 214, 290, 18, '#fde047');

      // --- 2) LANZAR: ida (hasta el enemigo) y vuelta (a la mano) ---
      var PX = 312, S2 = 1.62;
      P2.fn.peter(c, PX, 300, { variant: V, scale: S2, pose: 'lanzar' });
      var hx = PX + (2.5 + 8 + 27) * S2, hy = 300 - 37 * S2;
      var ex = 446, ey = 142;           // dron enemigo
      var sx = 428, sy = 174;           // escudo cuando le da
      P2.call('dronEnjambre', c, ex, ey, { scale: 1.05, facing: -1 });
      // estela de giro
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#fef3c7'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(sx, sy, 32, Math.PI * 0.72, Math.PI * 1.2); c.stroke();
      c.beginPath(); c.arc(sx, sy, 38, Math.PI * 0.8, Math.PI * 1.12); c.stroke(); c.restore();
      escudo(c, sx, sy, { variant: V, scale: 1.25, angle: 0.4 });
      // estrellitas de impacto
      [[440, 150, 4.5], [458, 168, 3.5], [424, 138, 3.2]].forEach(function (p) { star(c, p[0], p[1], p[2]); });
      P2.label(c, '¡BONK!', 430, 118, 17, '#fde047');
      curveArrow(c, hx - 2, hy - 18, hx - 6, sy - 40, sx - 28, sy - 16, '#fbbf24', 4);
      curveArrow(c, sx + 8, sy + 30, sx + 10, hy + 40, hx + 16, hy + 14, '#86efac', 4);
      P2.label(c, 'ida', hx - 28, sy - 10, 14, '#fbbf24');
      P2.label(c, 'vuelta', 440, 290, 14, '#86efac');

      // --- Detalle del escudo + escala de juego ---
      P2.rf(c, 8, 316, 464, 156, 14, 'rgba(11,16,32,0.45)', '#fef3c7', 2);
      escudo(c, 92, 394, { variant: V, scale: 3.0 });
      P2.label(c, A ? 'Escudo A:' : 'Escudo B:', 168, 352, 15, '#fbbf24', 'left');
      if (A) {
        P2.label(c, '¡la rueda que', 168, 374, 14, '#fef3c7', 'left');
        P2.label(c, 'dibujó Juanjo!', 168, 392, 14, '#fef3c7', 'left');
        P2.label(c, 'radios verdes', 168, 418, 13, '#86efac', 'left');
        P2.label(c, 'y negros', 168, 436, 13, '#86efac', 'left');
      } else {
        P2.label(c, '«Caparazón»:', 168, 374, 14, '#fef3c7', 'left');
        P2.label(c, 'duro como una', 168, 392, 14, '#fef3c7', 'left');
        P2.label(c, 'tortuga', 168, 410, 14, '#fef3c7', 'left');
        P2.label(c, 'núcleo que brilla', 168, 436, 13, '#fde047', 'left');
      }
      P2.label(c, 'Escala de juego', 395, 340, 13, '#fbbf24');
      P2.line(c, 330, 452, 462, 452, '#94a3b8', 2);
      P2.falcon(c, 360, 452, { scale: 1 });
      P2.fn.peter(c, 428, 452, { variant: V, scale: 1 });
      P2.label(c, 'Falcon', 360, 466, 12, '#e2e8f0');
      P2.label(c, 'Peter', 428, 466, 12, '#e2e8f0');
    };
  }
  // disparo de un robot malo (rojo, del ejército) que choca con el escudo
  // (tx,ty) = de dónde viene (la estela apunta hacia allí)
  function bolaRoja(c, x, y, r, tx, ty) {
    c.save();
    if (typeof tx !== 'number') { tx = x + 50; ty = y; }
    var dx = tx - x, dy = ty - y, dl = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / dl, ny = dx / dl;
    var g = c.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, 'rgba(248,113,113,0.85)'); g.addColorStop(1, 'rgba(248,113,113,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x + nx * r * 0.9, y + ny * r * 0.9); c.lineTo(tx, ty);
    c.lineTo(x - nx * r * 0.9, y - ny * r * 0.9); c.closePath(); c.fill();
    c.globalAlpha = 0.4; P2.circ(c, x, y, r * 1.7, '#ff4d4d', null); c.globalAlpha = 1;
    P2.circ(c, x, y, r, '#ef4444', O, 2);
    P2.circ(c, x - r * 0.2, y - r * 0.2, r * 0.35, '#fecaca', null);
    c.restore();
  }

  function lanzadoresPanel(c) {
    var rows = [
      { tipo: 'francotirador', key: '1', name: 'Francotirador', d1: 'lejos y fuerte', col: '#fb7185', s: 3.4, gx: 232 },
      { tipo: 'pistola', key: '2', name: 'Pistola', d1: 'normal', col: '#facc15', s: 4.0, gx: 238 },
      { tipo: 'metralleta', key: '3', name: 'Metralleta', d1: 'rápida', col: '#c084fc', s: 3.5, gx: 238 }
    ];
    rows.forEach(function (r, i) {
      var top = 70 + i * 136, cy = top + 78;
      P2.rf(c, 8, top, 464, 128, 14, 'rgba(11,16,32,0.4)', 'rgba(254,243,199,0.6)', 2);
      keycap(c, 34, top + 30, r.key, r.col);
      P2.label(c, r.name, 58, top + 36, 18, r.col, 'left');
      P2.label(c, r.d1, 58, top + 58, 15, '#fef3c7', 'left');
      P2.fn.lanzadorMikey(c, r.gx, cy, { tipo: r.tipo, scale: r.s });
      var m = MUZZLE[r.tipo], mx = r.gx + m[0] * r.s, my = cy + m[1] * r.s;
      if (r.tipo === 'francotirador') {
        bola(c, 440, my, 13, 64);
      } else if (r.tipo === 'pistola') {
        bola(c, 380, my, 10, 40);
      } else {
        bola(c, 360, my, 6.5, 26); bola(c, 400, my - 3, 6.5, 26); bola(c, 440, my + 2, 6.5, 26);
      }
    });
    // medidores comparables: fuerza / rapidez / alcance en las 3 tarjetas
    function meter(x, y, lab, n, col) {
      P2.label(c, lab, x, y + 4, 12, '#cbd5e1', 'left');
      for (var j = 0; j < 3; j++) P2.rf(c, x + 60 + j * 14, y - 6, 11, 11, 3, j < n ? col : 'rgba(255,255,255,0.15)', O, 1.5);
    }
    var stats = [[3, 1, 3], [2, 2, 2], [1, 3, 1]];
    rows.forEach(function (r, i) {
      var top = 70 + i * 136;
      meter(24, top + 80, 'fuerza', stats[i][0], r.col);
      meter(24, top + 96, 'rapidez', stats[i][1], r.col);
      meter(24, top + 112, 'alcance', stats[i][2], r.col);
    });
    // la mira del francotirador
    callout(c, 'mira', 352, 102, 286, 88, 13, '#e2e8f0');
  }

  function teamPanel(c) {
    stars(c, [[30, 80], [90, 170], [160, 90], [330, 86], [440, 160], [410, 76], [470, 120], [20, 240]]);
    // rayos de fondo
    c.save(); c.globalAlpha = 0.12; c.fillStyle = '#fef3c7';
    for (var i = 0; i < 10; i++) {
      var a0 = Math.PI + i * Math.PI / 10, a1 = a0 + Math.PI / 20;
      c.beginPath(); c.moveTo(240, 330); c.lineTo(240 + Math.cos(a0) * 420, 330 + Math.sin(a0) * 420);
      c.lineTo(240 + Math.cos(a1) * 420, 330 + Math.sin(a1) * 420); c.closePath(); c.fill();
    }
    c.restore();
    ground(c, 432, '#86efac', '#14532d');
    // Dark Secuaz (bueno) detrás, ayudando, a la misma escala
    P2.fn.secuaz(c, 240, 432, { scale: 1.3, good: true });
    // los 4 héroes (fila abierta: los brazos de Secuaz quedan entre ellos)
    P2.director(c, 46, 432, { scale: 1.3 });
    P2.falcon(c, 114, 432, { scale: 1.3 });
    P2.fn.mikey(c, 378, 432, { variant: 'A', scale: 1.3, facing: -1, arma: 'pistola' });
    P2.fn.peter(c, 442, 432, { variant: 'A', scale: 1.3, facing: -1 });
    P2.label(c, 'Director', 46, 458, 13, '#fef3c7');
    P2.label(c, 'Falcon', 114, 458, 13, '#fef3c7');
    P2.label(c, 'Dark Secuaz', 240, 458, 13, '#86efac');
    P2.label(c, 'Mikey', 378, 458, 13, '#fef3c7');
    P2.label(c, 'Peter', 442, 458, 13, '#fef3c7');
    // lema
    P2.label(c, '¡WE ARE A TEAM!', 240, 120, 38, '#fbbf24');
    P2.label(c, '¡Somos un equipo!', 240, 146, 15, '#fef3c7');
    [[52, 108], [428, 108]].forEach(function (p) { P2.heart(c, p[0], p[1] - 4, 1.2); });
  }

  P2.register({
    key: 'heroes',
    title: 'Los nuevos héroes: Mikey Stark y Peter Rogers',
    panels: [
      { title: 'Mikey A', subtitle: 'El científico: bata blanca, pelo de punta y gafas de inventor',
        bg: ['#16163a', '#3f2d6e'], render: mikeyPanel('A') },
      { title: 'Mikey B', subtitle: 'El hacker del taller: sudadera violeta, rizos y cascos',
        bg: ['#200f38', '#5b1f6e'], render: mikeyPanel('B') },
      { title: 'Los 3 lanzadores de Mikey', subtitle: 'Juguetes de energía azul: se cambian con una tecla',
        bg: ['#0f1a36', '#24346e'], render: lanzadoresPanel },
      { title: 'Peter A', subtitle: 'El guardián de la rueda: casco y el escudo de Juanjo',
        bg: ['#1a1838', '#3b2a6b'], render: peterPanel('A') },
      { title: 'Peter B', subtitle: 'El caballero tortuga: tupé, bufanda y escudo «Caparazón»',
        bg: ['#24112e', '#5a1a45'], render: peterPanel('B') },
      { title: '¡We are a team!', subtitle: 'Los 4 héroes a escala de juego (y Dark Secuaz ayudando)',
        bg: ['#1e1b4b', '#c2410c'], render: teamPanel }
    ]
  });
})();
