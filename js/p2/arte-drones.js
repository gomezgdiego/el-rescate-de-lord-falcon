// drones.js — PROTOTIPO "Drones de Dark Secuaz" (Parte 2).
// Tres drones del mismo ejército (acero + rojo + ojo-luz de torreta) con
// siluetas muy distintas entre sí y distintas del dron rojo de la Parte 1:
//   · Dron de enjambre  -> "abejorro": huevo con alas zumbadoras y aguijón.
//   · Dron de rayos     -> "platillo": disco con cúpula, cuernos y cañón-lente.
//   · Dron en picado    -> "bicho-dardo": rechoncho, punta afilada, alitas y propulsor.
// Exporta P2.fn.dronEnjambre, P2.fn.dronRayo y P2.fn.dronPicado (anclados en el CENTRO).
(function () {
  'use strict';
  var O = P2.OUTLINE, LW = P2.LW;

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function pal(h) {
    var E = P2.PAL.enemy, H = P2.PAL.hacked;
    return { STEEL: E.STEEL, STEEL_D: E.STEEL_D, STEEL_DD: E.STEEL_DD, DARK: E.DARK, BRONZE: E.BRONZE,
             RED: h ? H.RED : E.RED, RED_L: h ? H.RED_L : E.RED_L, EYE: h ? H.EYE : E.EYE };
  }
  // Sonrisa de "hackeado": trazo claro con borde oscuro (se lee sobre acero y sobre visor).
  function smile(c, x, y, r) {
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, r, 0.12 * Math.PI, 0.88 * Math.PI);
    c.strokeStyle = O; c.lineWidth = 3.4; c.stroke();
    c.strokeStyle = '#dcfce7'; c.lineWidth = 1.8; c.stroke();
    c.restore();
  }
  // Ojo "mareado" (espiral) para un dron aturdido dentro de la red.
  function dizzyEye(c, x, y, r) {
    c.save(); c.lineCap = 'round';
    c.beginPath();
    for (var i = 0; i <= 40; i++) {
      var a = i / 40 * Math.PI * 3.5, rr = r * i / 40;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.strokeStyle = '#fde047'; c.lineWidth = 1.3; c.stroke();
    c.restore();
  }
  // Ejecuta fn de forma segura (las funciones de dibujo nunca lanzan).
  function safe(c, fn) {
    c.save();
    try { fn(); } catch (e) { if (window.console) console.warn('drones.js:', e); }
    c.restore();
  }

  // ---------------------------------------------------------------------------
  //  DRON DE ENJAMBRE ("abejorro")  ~28 x 26 px a escala 1. (x,y) = centro.
  //  o: {scale, facing, hacked}
  // ---------------------------------------------------------------------------
  P2.fn.dronEnjambre = function (c, x, y, o) {
    o = o || {};
    var s = num(o.scale, 1), f = (o.facing === -1) ? -1 : 1, h = !!o.hacked, P = pal(h);
    safe(c, function () {
      c.translate(x, y); c.scale(f * s, s); c.lineJoin = 'round'; c.lineCap = 'round';
      // alas zumbadoras (traslúcidas) con rayitas de vibración
      c.save(); c.globalAlpha = 0.85;
      c.save(); c.translate(-4, -9); c.rotate(-0.55);
      P2.elli(c, 0, -5, 4.5, 8, 'rgba(226,232,240,0.75)', O, 2); c.restore();
      c.save(); c.translate(1, -9); c.rotate(0.15);
      P2.elli(c, 0, -5, 4.5, 8, 'rgba(241,245,249,0.85)', O, 2); c.restore();
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-14, -18); c.lineTo(-17, -20); c.moveTo(-13, -14); c.lineTo(-17, -14);
      c.moveTo(6, -22); c.lineTo(9, -25); c.stroke();
      // patitas
      P2.rf(c, -6, 7, 4, 7, 2, P.DARK, O, 2); P2.rf(c, 1, 7, 4, 7, 2, P.DARK, O, 2);
      // aguijón trasero
      P2.poly(c, [[-11, -3], [-19, 1], [-11, 4]], P.RED_L, O, 2);
      // cuerpo: huevo de acero con barriga roja
      c.beginPath(); c.ellipse(0, 0, 13, 10.5, 0, 0, Math.PI * 2);
      c.save(); c.clip();
      c.fillStyle = P.STEEL; c.fillRect(-14, -12, 28, 24);
      c.fillStyle = P.RED; c.fillRect(-14, 3, 28, 10);
      c.fillStyle = P.STEEL_D; c.fillRect(-14, 1.5, 28, 2);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-4, -6, 5, 2.2, -0.2, 0, Math.PI * 2); c.fill();
      c.restore();
      P2.elli(c, 0, 0, 13, 10.5, null, O, LW);
      // antena con bolita
      P2.line(c, 2, -10, 5, -15, O, 2); P2.circ(c, 5.5, -16, 2, P.RED_L, O, 1.5);
      // visor + ojo-luz
      P2.circ(c, 6, -1, 5.6, P.DARK, O, 2);
      P2.eyeLight(c, 6.6, -1.2, 3.2, P.EYE);
      if (h) smile(c, 6, 5.2, 2.8);
    });
  };

  // ---------------------------------------------------------------------------
  //  DRON DE RAYOS ("platillo")  ~44 x 44 px a escala 1. (x,y) = centro.
  //  o: {scale, facing, cargando, hacked, aturdido}
  //  La lente del cañón está en (21, 10) * scale (en la dirección de facing).
  // ---------------------------------------------------------------------------
  P2.fn.dronRayo = function (c, x, y, o) {
    o = o || {};
    var s = num(o.scale, 1), f = (o.facing === -1) ? -1 : 1, h = !!o.hacked, P = pal(h), ch = !!o.cargando, dz = !!o.aturdido;
    safe(c, function () {
      c.translate(x, y); c.scale(f * s, s); c.lineJoin = 'round'; c.lineCap = 'round';
      // propulsores de levitación con llamita
      [-15, -7].forEach(function (nx) {
        c.fillStyle = '#fbbf24'; c.beginPath();
        c.moveTo(nx - 2.5, 9); c.quadraticCurveTo(nx, 18, nx + 2.5, 9); c.closePath(); c.fill();
        c.strokeStyle = '#f97316'; c.lineWidth = 1.5; c.stroke();
        P2.rf(c, nx - 3.5, 4, 7, 6, 2, P.STEEL_DD, O, 2);
      });
      // cañón-lente bajo el disco
      P2.rf(c, -4, 3, 15, 13, 5, P.DARK, O, 2.5);
      P2.rf(c, 8, 6, 12, 8, 3, P.RED, O, 2.5);
      if (ch) {
        c.save(); c.globalAlpha = 0.35; P2.circ(c, 21, 10, 10, P.EYE, null);
        c.globalAlpha = 0.55; P2.circ(c, 21, 10, 6.5, '#fde68a', null); c.restore();
      }
      P2.circ(c, 21, 10, 4.2, ch ? '#fff7ed' : P.RED_L, O, 2);
      P2.circ(c, 22, 8.6, 1.3, '#ffffff', null);
      // disco (primero, para que la cúpula y el ojo queden ENCIMA)
      P2.elli(c, 0, -1, 21, 6.5, P.STEEL, O, LW);
      c.save(); c.beginPath(); c.ellipse(0, -1, 21, 6.5, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = P.STEEL_DD; c.fillRect(-22, 2, 44, 6);
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-16, -5, 8, 1.8);
      c.restore();
      P2.elli(c, 0, -1, 21, 6.5, null, O, LW);
      // luces del borde (apagadas: el único punto rojo brillante es el ojo)
      [-14, -5, 5, 14].forEach(function (lx) {
        P2.circ(c, lx, 2, 1.5, ch ? P.RED_L : P.RED, O, 1);
      });
      // cuernos de bronce: la marca de Dark Toros (por encima de la visera)
      P2.horns(c, 0, -20, 0.33, P.BRONZE);
      // cúpula con visera, ojo-luz y (si está hackeado) sonrisa
      c.beginPath(); c.arc(0, -5, 12, Math.PI, 0); c.closePath();
      c.fillStyle = P.STEEL_D; c.fill(); c.strokeStyle = O; c.lineWidth = LW; c.stroke();
      P2.rf(c, -7.5, -15.5, 16, 9.5, 4.5, P.DARK, O, 2);
      if (dz) dizzyEye(c, 2.5, -10.8, 3.6);
      else P2.eyeLight(c, 2.5, -10.8, ch ? 3.8 : 3.4, P.EYE);
      if (h) smile(c, 1.5, -3.6, 3.2);
      // chispas de carga que se juntan en la lente
      if (ch) {
        c.strokeStyle = '#fde68a'; c.lineWidth = 1.6;
        [[34, 2, 29, 6], [33, 19, 28, 15], [27, 25, 24, 19], [37, 11, 31, 11]].forEach(function (k) {
          c.beginPath(); c.moveTo(k[0], k[1]); c.lineTo(k[2], k[3]); c.stroke();
        });
        P2.circ(c, 35, 3, 1.4, '#fff7ed', null); P2.circ(c, 31, 22, 1.2, '#fff7ed', null);
      }
    });
  };

  // ---------------------------------------------------------------------------
  //  DRON EN PICADO ("bicho-dardo")  ~47 px de largo con la llama. (x,y) = centro.
  //  o: {scale, angle, hacked}   angle = 0 apunta a la derecha (radianes).
  // ---------------------------------------------------------------------------
  P2.fn.dronPicado = function (c, x, y, o) {
    o = o || {};
    var s = num(o.scale, 1), a = num(o.angle, 0), h = !!o.hacked, P = pal(h);
    // si apunta hacia la izquierda, se voltea para no quedar boca abajo
    var flip = Math.cos(a) < 0;
    safe(c, function () {
      c.translate(x, y); c.rotate(a); c.scale(s, flip ? -s : s); c.lineJoin = 'round'; c.lineCap = 'round';
      // llama corta del propulsor
      c.fillStyle = '#f97316'; c.beginPath();
      c.moveTo(-14, -4.5); c.quadraticCurveTo(-36, 0, -14, 4.5); c.closePath(); c.fill();
      c.strokeStyle = O; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#fde047'; c.beginPath();
      c.moveTo(-14, -2.5); c.quadraticCurveTo(-27, 0, -14, 2.5); c.closePath(); c.fill();
      // aleta de arriba (detrás de las alitas)
      c.save(); c.lineJoin = 'round';
      P2.poly(c, [[-6, -6], [-14, -13], [-18, -12], [-13, -5]], P.RED_L, O, 2.5);
      c.restore();
      // alitas de avispa (traslúcidas)
      c.save(); c.globalAlpha = 0.85;
      c.save(); c.translate(-5, -9); c.rotate(-0.9);
      P2.elli(c, 0, -5, 3.6, 6.5, 'rgba(226,232,240,0.75)', O, 2); c.restore();
      c.save(); c.translate(-1, -10); c.rotate(-0.35);
      P2.elli(c, 0, -5, 3.6, 6.5, 'rgba(241,245,249,0.85)', O, 2); c.restore();
      c.restore();
      // aletas traseras cortas y redondeadas
      c.save(); c.lineJoin = 'round';
      P2.poly(c, [[-5, 6], [-13, 14], [-17, 13], [-12, 5]], P.RED_L, O, 2.5);
      c.restore();
      // tobera
      P2.rf(c, -16, -5, 5, 10, 2.5, P.STEEL_DD, O, 2);
      // cuerpo rechoncho con punta afilada
      var body = function () {
        c.beginPath(); c.moveTo(21, 0.5);
        c.quadraticCurveTo(16, -10, 4, -10.5); c.lineTo(-7, -10);
        c.quadraticCurveTo(-15, -9, -14, 0); c.quadraticCurveTo(-15, 9, -7, 10);
        c.lineTo(4, 10.5); c.quadraticCurveTo(16, 10, 21, 0.5); c.closePath();
      };
      body(); c.save(); c.clip();
      c.fillStyle = P.STEEL; c.fillRect(-16, -12, 40, 24);
      c.fillStyle = P.STEEL_D; c.fillRect(-16, 5, 40, 7);
      c.fillStyle = P.RED_L; c.fillRect(15, -12, 10, 24);       // punta roja
      c.fillStyle = P.BRONZE; c.fillRect(-8, -12, 3, 24);       // anillo de bronce
      c.restore();
      body(); c.strokeStyle = O; c.lineWidth = LW; c.lineJoin = 'round'; c.stroke();
      P2.line(c, 15, -6, 15, 6, O, 2);
      // visor GRANDE que asoma por arriba + ojo-luz
      P2.elli(c, 5, -5.5, 8, 6.8, P.DARK, O, 2.5);
      if (h) {
        P2.eyeLight(c, 6.5, -6, 3.8, P.EYE);
        smile(c, 6, 3, 3.2);
      } else {
        P2.eyeLight(c, 6.5, -5.4, 3.8, P.EYE);
        // ceño (ceja gruesa) y boquita de dientes cuadrados
        P2.line(c, -1, -13.5, 11, -10.5, O, 3);
        P2.rf(c, 1.5, 2.5, 10, 5, 1.8, '#f8fafc', O, 1.8);
        P2.line(c, 4.8, 2.8, 4.8, 7.2, O, 1.4); P2.line(c, 8.2, 2.8, 8.2, 7.2, O, 1.4);
      }
    });
  };

  // ---------------------------------------------------------------------------
  //  Utilidades de los paneles
  // ---------------------------------------------------------------------------
  function exclaim(c, x, y, sc) {
    c.save(); c.translate(x, y); c.scale(sc || 1, sc || 1); P2.exclaim(c, 0, 0); c.restore();
  }
  // flechita con línea fina para señalar partes
  function pointer(c, x1, y1, x2, y2) {
    c.save(); c.globalAlpha = 0.85;
    P2.line(c, x1, y1, x2, y2, '#fef3c7', 2);
    P2.circ(c, x2, y2, 2.6, '#fef3c7', O, 1.2);
    c.restore();
  }
  function dashed(c, pts, col, lw, dash) {
    c.save(); c.setLineDash(dash || [8, 8]); c.strokeStyle = col; c.lineWidth = lw || 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke(); c.restore();
  }
  function cloud(c, x, y, s, a) {
    c.save(); c.globalAlpha = a || 0.25; c.fillStyle = '#ffffff';
    [[0, 0, 18], [18, -8, 20], [38, 0, 16], [18, 6, 18]].forEach(function (p) {
      c.beginPath(); c.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, Math.PI * 2); c.fill();
    });
    c.restore();
  }
  function quad(p0, p1, p2, t) {
    var u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  }
  function quadTan(p0, p1, p2, t) {
    return Math.atan2(2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
                      2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]));
  }
  // Rayo láser lento: banda gruesa con núcleo blanco y una "bola" de frente.
  function beam(c, x1, y, x2, s, hacked) {
    var P = pal(hacked);
    c.save(); c.lineCap = 'round';
    c.globalAlpha = 0.3; P2.rf(c, x1, y - 11 * s, x2 - x1, 22 * s, 11 * s, P.RED_L, null); c.globalAlpha = 1;
    P2.rf(c, x1, y - 5.5 * s, x2 - x1, 11 * s, 5.5 * s, P.RED_L, O, 2.5);
    P2.rf(c, x1 + 4, y - 2 * s, x2 - x1 - 8, 4 * s, 2 * s, '#fff1f2', null);
    // pulsos (anillos) que muestran que avanza despacio
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
    for (var px = x1 + 30; px < x2 - 20; px += 34) {
      c.beginPath(); c.ellipse(px, y, 3 * s, 7 * s, 0, 0, Math.PI * 2); c.stroke();
    }
    // frente del rayo
    c.globalAlpha = 0.35; P2.circ(c, x2, y, 15 * s, P.RED_L, null); c.globalAlpha = 1;
    P2.circ(c, x2, y, 9 * s, P.RED_L, O, 2.5);
    P2.circ(c, x2, y, 4.5 * s, '#fff1f2', null);
    c.restore();
  }
  // Red del lanza-redes (verde y blanca) sobre una elipse.
  function net(c, cx, cy, rx, ry, gap, wr) {
    gap = gap || 20; wr = wr || 5;
    var R = rx + ry;
    c.save();
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.clip();
        c.lineCap = 'round';
    [[1, 1, '#22c55e'], [1, -1, '#f0fdf4']].forEach(function (dir) {
      for (var d = -R; d <= R; d += gap) {
        c.beginPath();
        c.moveTo(cx + d - R * dir[0], cy - R * dir[1]);
        c.lineTo(cx + d + R * dir[0], cy + R * dir[1]);
        c.strokeStyle = O; c.lineWidth = Math.min(3.4, Math.max(2.2, gap * 0.3)); c.stroke();
        c.strokeStyle = dir[2]; c.lineWidth = Math.min(2, Math.max(1.2, gap * 0.15)); c.stroke();
      }
    });
    c.restore();
    // borde de cuerda
    c.save();
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    c.strokeStyle = O; c.lineWidth = wr + 2; c.stroke();
    c.strokeStyle = '#22c55e'; c.lineWidth = wr * 0.8; c.stroke();
    c.setLineDash([wr, wr * 1.5]); c.strokeStyle = '#f0fdf4'; c.lineWidth = wr * 0.4; c.stroke();
    c.restore();
    // pesos de la red
    [0.35, 1.25, 2.05, 2.75, 3.55, 4.4, 5.3].forEach(function (an) {
      var px = cx + Math.cos(an) * rx, py = cy + Math.sin(an) * ry;
      P2.circ(c, px, py, wr, '#15803d', O, 2);
      P2.circ(c, px - wr * 0.3, py - wr * 0.3, wr * 0.3, '#bbf7d0', null);
    });
  }
  function star(c, x, y, r, col) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 === 0) ? r : r * 0.45;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    P2.poly(c, pts, col || '#fde047', O, 2);
  }

  // ---------------------------------------------------------------------------
  //  Paneles
  // ---------------------------------------------------------------------------
  P2.register({
    key: 'drones',
    title: 'Drones de Dark Secuaz',
    panels: [
      // 1) ENJAMBRE ----------------------------------------------------------
      {
        title: 'Dron de enjambre',
        subtitle: 'Pequeño y simpático... ¡pero nunca va solo!',
        bg: ['#1e3a8a', '#7dd3fc'],
        render: function (c, t) {
          cloud(c, 40, 280, 1.1, 0.18); cloud(c, 370, 300, 0.9, 0.18); cloud(c, 330, 90, 0.7, 0.15);
          // formación en flecha (9 drones)
          var F = [[366, 165], [322, 127], [278, 89], [322, 203], [278, 241], [292, 165], [236, 165], [180, 165], [124, 165]];
          dashed(c, [[278, 89], [366, 165], [278, 241]], 'rgba(255,255,255,0.45)', 2, [4, 7]);
          dashed(c, [[124, 165], [366, 165]], 'rgba(255,255,255,0.45)', 2, [4, 7]);
          F.forEach(function (p, i) {
            var bob = [0, 2, -2, 1, -1, 2, -2, 1, 0][i];
            P2.fn.dronEnjambre(c, p[0], p[1] + bob, { scale: 1.15, facing: 1 });
          });
          exclaim(c, 372, 124, 0.95);
          P2.label(c, '¡Forman una flecha', 110, 104, 14, '#fef3c7');
          P2.label(c, 'en el aire!', 110, 122, 14, '#fef3c7');
          P2.label(c, '9 drones en formación', 150, 220, 13, '#e0f2fe');
          // separación
          c.save(); c.globalAlpha = 0.25; P2.line(c, 24, 262, 456, 262, '#ffffff', 2); c.restore();
          // ampliado
          P2.fn.dronEnjambre(c, 150, 372, { scale: 3.5, facing: 1 });
          pointer(c, 96, 296, 128, 322); P2.label(c, 'alas zumbadoras', 80, 288, 13, '#fef3c7');
          pointer(c, 250, 330, 178, 368); P2.label(c, 'ojo-luz', 262, 324, 13, '#fef3c7');
          pointer(c, 50, 410, 88, 378); P2.label(c, 'aguijón', 50, 428, 13, '#fef3c7');
          P2.label(c, 'barriga roja', 196, 452, 13, '#fef3c7');
          pointer(c, 176, 438, 160, 404);
          // hackeado
          P2.fn.dronEnjambre(c, 384, 362, { scale: 2.3, facing: -1, hacked: true });
          P2.label(c, '¡Hackeado!', 384, 422, 15, '#86efac');
          P2.label(c, '¡verde y contento!', 384, 442, 12, '#dcfce7');
        }
      },
      // 2) RAYOS -------------------------------------------------------------
      {
        title: 'Dron de rayos',
        subtitle: 'Se para, carga... ¡y lanza un láser lento!',
        bg: ['#312e81', '#7c3aed'],
        render: function (c, t) {
          // 1. carga (ampliado)
          P2.label(c, '1. Se para y carga', 340, 120, 17, '#fef3c7');
          P2.label(c, 'la lente brilla y', 340, 146, 13, '#e9d5ff');
          P2.label(c, 'avisa con «!»', 340, 164, 13, '#e9d5ff');
          c.save(); c.globalAlpha = 0.18; P2.circ(c, 130, 190, 78, '#fca5a5', null); c.restore();
          P2.fn.dronRayo(c, 130, 190, { scale: 2.6, facing: 1, cargando: true });
          exclaim(c, 130, 98, 1.1);
          pointer(c, 280, 236, 192, 220); P2.label(c, 'cañón-lente', 320, 246, 13, '#fef3c7');
          pointer(c, 50, 138, 106, 132); P2.label(c, 'cuernos', 40, 130, 13, '#fbbf24');
          pointer(c, 236, 196, 142, 164); P2.label(c, 'ojo-luz', 262, 204, 13, '#fef3c7');
          c.save(); c.globalAlpha = 0.25; P2.line(c, 24, 282, 456, 282, '#ffffff', 2); c.restore();
          // 2. ¡rayo!
          P2.label(c, '2. ¡Rayo láser lento!', 140, 312, 17, '#fef3c7');
          // suelo
          P2.rf(c, -10, 452, 500, 40, 0, '#2e1065', null);
          P2.line(c, 0, 452, 480, 452, O, 3);
          P2.fn.dronRayo(c, 62, 410, { scale: 1.5, facing: 1 });
          beam(c, 96, 425, 290, 1.4, false);
          P2.poly(c, [[308, 417], [320, 425], [308, 433]], '#fde68a', O, 2);
          // arco del salto: del suelo, por encima de la bola del rayo, al suelo
          var J0 = [212, 452], J1 = [300, 338], J2 = [388, 452], jp = [];
          for (var k = 0; k <= 24; k++) jp.push(quad(J0, J1, J2, k / 24));
          dashed(c, jp, 'rgba(255,255,255,0.6)', 2, [4, 6]);
          P2.shadow(c, 300, 452, 18);
          P2.director(c, 300, 395, { scale: 1.2, facing: -1, pose: 'jump' });
          P2.label(c, '¡Sáltalo!', 402, 344, 16, '#fde68a');
          P2.label(c, 'Es lento: da tiempo a esquivarlo', 240, 473, 13, '#e9d5ff');
        }
      },
      // 3) PICADO ------------------------------------------------------------
      {
        title: 'Dron en picado',
        subtitle: 'Afilado como un dardo: ¡se lanza a toda velocidad!',
        bg: ['#0c4a6e', '#38bdf8'],
        render: function (c, t) {
          cloud(c, 40, 380, 1.2, 0.2); cloud(c, 300, 110, 0.8, 0.18);
          var P0 = [56, 134], P1 = [300, 84], P2p = [362, 372];
          P2.rf(c, -10, 446, 500, 50, 0, '#1e3a5f', null);
          P2.line(c, 0, 446, 480, 446, O, 3);
          var pts = [];
          for (var i = 0; i <= 30; i++) pts.push(quad(P0, P1, P2p, 0.08 + i / 30 * 0.82));
          dashed(c, pts, 'rgba(255,255,255,0.75)', 3, [10, 9]);
          // 1) se para y avisa
          c.save(); c.globalAlpha = 0.75;
          P2.fn.dronPicado(c, P0[0], P0[1], { scale: 1.1, angle: 0 });
          c.restore();
          exclaim(c, P0[0], P0[1] - 34, 0.8);
          // fantasmas del recorrido
          [0.2, 0.38].forEach(function (tt, k) {
            var p = quad(P0, P1, P2p, tt);
            c.save(); c.globalAlpha = 0.35 + k * 0.15;
            P2.fn.dronPicado(c, p[0], p[1], { scale: 1.2 + k * 0.25, angle: quadTan(P0, P1, P2p, tt) });
            c.restore();
          });
          // dron principal con líneas de velocidad
          var tm = 0.64, pm = quad(P0, P1, P2p, tm), am = quadTan(P0, P1, P2p, tm);
          c.save(); c.translate(pm[0], pm[1]); c.rotate(am);
          [[-66, -18, 40], [-78, -5, 52], [-74, 9, 46], [-60, 21, 32]].forEach(function (L) {
            P2.line(c, L[0], L[1], L[0] + L[2], L[1], '#ffffff', 3);
          });
          c.restore();
          P2.fn.dronPicado(c, pm[0], pm[1], { scale: 1.9, angle: am });
          P2.label(c, '¡ZUUUM!', 150, 250, 22, '#fde047');
          P2.label(c, 'Trayectoria en curva', 190, 104, 13, '#e0f2fe');
          // el héroe lo ve venir
          P2.shadow(c, 400, 446, 26);
          P2.director(c, 400, 446, { scale: 1.6, facing: -1, pose: 'idle' });
          exclaim(c, 404, 314, 1.1);
          P2.label(c, '¡Cuidado!', 404, 286, 14, '#fde68a');
          P2.label(c, 'Se para, avisa con «!»... ¡y se lanza en picado!', 196, 470, 12, '#e0f2fe');
        }
      },
      // 4) ESCALA + RED ------------------------------------------------------
      {
        title: 'A escala de juego + la red',
        subtitle: 'Tamaño real junto a los héroes y cómo se capturan',
        bg: ['#164e63', '#0e7490'],
        render: function (c, t) {
          // --- arriba izquierda: los hackeados (scale 1) ---
          P2.label(c, '¡Hackeados!', 104, 88, 15, '#86efac');
          P2.fn.dronRayo(c, 62, 120, { scale: 1, facing: 1, hacked: true });
          P2.fn.dronPicado(c, 148, 122, { scale: 1, angle: 0, hacked: true });
          P2.label(c, 'verdes y contentos', 104, 158, 12, '#dcfce7');
          // --- Falcon dispara el lanza-redes ---
          P2.rf(c, 8, 272, 96, 8, 4, '#0b3b4a', O, 2);
          P2.falcon(c, 48, 272, { scale: 1.1, facing: 1 });
          c.save(); c.translate(56, 238); c.rotate(-0.3);
          P2.rf(c, -4, -5, 28, 10, 4, '#15803d', O, 2.5);
          P2.rf(c, 22, -7, 7, 14, 2.5, '#22c55e', O, 2);
          c.restore();
          dashed(c, [[90, 228], [118, 218], [142, 208]], 'rgba(255,255,255,0.8)', 2, [4, 6]);
          c.save(); c.globalAlpha = 0.35;
          dashed(c, [[178, 194], [240, 182], [298, 176]], '#ffffff', 2, [3, 8]);
          c.restore();
          net(c, 160, 202, 17, 12, 8, 3);
          P2.label(c, '¡Fiuuu!', 160, 236, 13, '#cffafe');
          P2.label(c, 'Lanza-redes de Falcon', 190, 262, 13, '#fef3c7');
          // --- dron atrapado (aturdido) ---
          c.save(); c.translate(352, 182); c.rotate(-0.2);
          P2.fn.dronRayo(c, 0, 0, { scale: 2.2, facing: -1, aturdido: true });
          c.restore();
          net(c, 352, 190, 44, 46, 38, 4);
          P2.circ(c, 352, 144, 5, '#22c55e', O, 2);
          star(c, 300, 112, 8, '#fde047'); star(c, 406, 116, 7, '#fde047'); star(c, 420, 150, 5, '#fef08a');
          P2.label(c, '¡Atrapado!', 352, 262, 17, '#86efac');
          c.save(); c.globalAlpha = 0.25; P2.line(c, 24, 282, 456, 282, '#ffffff', 2); c.restore();
          // --- abajo: escala de juego ---
          P2.label(c, 'Escala de juego (tamaño real)', 240, 306, 15, '#fef3c7');
          P2.rf(c, -10, 446, 500, 50, 0, '#0b3b4a', null);
          P2.line(c, 0, 446, 480, 446, O, 3);
          P2.director(c, 42, 446, { scale: 1, facing: 1 });
          P2.falcon(c, 100, 446, { scale: 1, facing: 1 });
          c.save(); c.globalAlpha = 0.7;
          P2.line(c, 14, 446, 14, 382, '#fef3c7', 2); P2.line(c, 9, 382, 19, 382, '#fef3c7', 2);
          c.restore();
          P2.label(c, '64', 14, 374, 12, '#fef3c7');
          P2.fn.dronEnjambre(c, 182, 380, { scale: 1, facing: -1 });
          P2.fn.dronRayo(c, 262, 374, { scale: 1, facing: -1 });
          P2.fn.dronPicado(c, 352, 378, { scale: 1, angle: Math.PI - 0.5 });
          [[420, 368], [446, 352], [446, 386]].forEach(function (p) {
            P2.fn.dronEnjambre(c, p[0], p[1], { scale: 1, facing: -1 });
          });
          P2.label(c, 'enjambre', 182, 418, 12, '#fef3c7');
          P2.label(c, '~28 px', 182, 434, 12, '#a5f3fc');
          P2.label(c, 'rayos', 262, 418, 12, '#fef3c7');
          P2.label(c, '~44 px', 262, 434, 12, '#a5f3fc');
          P2.label(c, 'picado', 352, 418, 12, '#fef3c7');
          P2.label(c, '~47 px', 352, 434, 12, '#a5f3fc');
          P2.label(c, 'en grupo', 436, 418, 12, '#fef3c7');
        }
      }
    ]
  });
})();
