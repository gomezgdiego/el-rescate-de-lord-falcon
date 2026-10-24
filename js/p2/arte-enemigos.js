// enemigos.js — PROTOTIPO Parte 2: robots enemigos del ejército de Dark Secuaz.
// Robot boxeador, robot con escudo, robot araña y mini-torreta con patitas.
// Todo dibujado con Canvas 2D, determinista (sin Math.random), estilo Kirby/LEGO.
// Exporta: P2.fn.boxeador, P2.fn.robotEscudo, P2.fn.robotArana, P2.fn.miniTorreta
(function () {
  'use strict';
  var OUT = P2.OUTLINE, LW = P2.LW;
  var GLOW = '#fde047', GLOW_D = '#f59e0b';   // punto débil (batería)

  // Paleta del ejército; lo hackeado se vuelve VERDE.
  function pal(h) {
    var E = P2.PAL.enemy, H = P2.PAL.hacked;
    return { STEEL: E.STEEL, STEEL_D: E.STEEL_D, STEEL_DD: E.STEEL_DD, DARK: E.DARK,
             RED: h ? H.RED : E.RED, RED_L: h ? H.RED_L : E.RED_L, EYE: h ? H.EYE : E.EYE,
             BRONZE: E.BRONZE };
  }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  // Envoltorio seguro: save/restore y nunca lanza excepciones.
  function safe(fn) {
    return function (c, x, y, o) {
      if (!c) return;
      c.save();
      try { fn(c, num(x, 0), num(y, 0), o || {}); } catch (e) { if (window.console) console.warn('enemigos.js', e); }
      c.restore();
    };
  }
  // Brazo / pata: trazo grueso con contorno
  function limb(c, pts, col, w) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    [[OUT, w + 4], [col, w]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    });
  }
  // Guante de boxeo visto de lado (puño hacia +x)
  function glove(c, gx, gy, r, P) {
    P2.rf(c, gx - r * 1.55, gy - r * 0.62, r * 0.75, r * 1.24, r * 0.3, '#f1f5f9', OUT, 2.5); // puño blanco
    P2.elli(c, gx, gy, r * 1.08, r, P.RED_L, OUT, LW);
    P2.elli(c, gx - r * 0.35, gy - r * 0.78, r * 0.55, r * 0.32, P.RED_L, OUT, 2);          // pulgar
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.arc(gx + r * 0.2, gy + r * 0.1, r * 0.55, -0.5 * Math.PI, 0.5 * Math.PI); c.stroke();
    c.globalAlpha = 0.55; P2.elli(c, gx + r * 0.35, gy - r * 0.4, r * 0.3, r * 0.18, '#ffffff', null); c.globalAlpha = 1;
  }
  // Cabeza de los soldados: como la torreta del jefe pero SIN cañón (solo la
  // mini-torreta dispara). En su lugar, una cresta/antenita roja corta.
  // (cx, by) = base de la cabeza; K = escala relativa.
  function cabezaMini(c, cx, by, K, P, h) {
    var oy = by - 16 * K, k = function (v) { return v * K; };
    // antenita-cresta
    limb(c, [[cx + k(2), oy + k(-9)], [cx + k(5), oy + k(-17)]], P.STEEL_DD, Math.max(2, k(2.6)));
    P2.circ(c, cx + k(5.5), oy + k(-18), k(3.4), P.RED_L, OUT, 2);
    c.globalAlpha = 0.6; P2.circ(c, cx + k(4.6), oy + k(-19), k(1.1), '#ffffff', null); c.globalAlpha = 1;
    P2.rf(c, cx + k(-16), oy + k(4), k(32), k(12), k(5), '#334155', OUT, LW);   // base
    P2.rf(c, cx + k(-12), oy + k(-4), k(24), k(12), k(6), P.RED, OUT, LW);      // anillo
    c.beginPath(); c.arc(cx, oy + k(-2), k(9), Math.PI, 0); c.closePath();      // cúpula
    c.fillStyle = P.RED; c.fill(); c.strokeStyle = OUT; c.lineWidth = LW; c.stroke();
    c.globalAlpha = 0.25; P2.elli(c, cx - k(3.5), oy + k(-6), k(3), k(1.6), '#ffffff', null); c.globalAlpha = 1;
    P2.eyeLight(c, cx, oy + k(2.5), k(3.2), P.EYE);
    if (h) {  // sonrisa clara y gruesa (se ve también a escala 1)
      var r = Math.max(k(5), 4);
      [[OUT, 4.5], ['#dcfce7', 2.2]].forEach(function (p) {
        c.strokeStyle = p[0]; c.lineWidth = p[1]; c.lineCap = 'round';
        c.beginPath(); c.arc(cx, oy + k(6.5), r, 0.18 * Math.PI, 0.82 * Math.PI); c.stroke();
      });
    }
  }
  // Líneas de velocidad con contorno
  function zas(c, lines) {
    c.lineCap = 'round';
    [[OUT, 4.2], ['#ffffff', 2]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      lines.forEach(function (l) { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); });
    });
  }
  // Estrellita de brillo
  function sparkle(c, x, y, r, col) {
    c.save(); c.translate(x, y);
    P2.poly(c, [[0, -r], [r * 0.28, -r * 0.28], [r, 0], [r * 0.28, r * 0.28], [0, r], [-r * 0.28, r * 0.28], [-r, 0], [-r * 0.28, -r * 0.28]], col || '#fffbeb', OUT, 1.5);
    c.restore();
  }

  // =====================================================================
  //  ROBOT BOXEADOR — (x, y) = pies. ~64 px a escala 1.
  //  o: {scale, facing, pose: 'guardia'|'golpe', hacked}
  // =====================================================================
  P2.fn.boxeador = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = (o.facing === -1) ? -1 : 1, h = !!o.hacked, P = pal(h);
    var golpe = (o.pose === 'golpe');
    var T = P2.T;
    c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';
    P2.elli(c, golpe ? 3 : 0, -1, golpe ? 26 : 21, 4, 'rgba(0,0,0,0.25)', null);

    // piernas cortas y rechonchas
    var bx = golpe ? -17 : -12, fx = golpe ? 7 : 4;
    P2.rf(c, bx, -18, 10, 15, 4, P.STEEL_DD, OUT, 2.5);
    P2.rf(c, fx, -18, 10, 15, 4, P.STEEL_DD, OUT, 2.5);
    P2.rf(c, bx - 2, -7, 14, 7, 3, P.DARK, OUT, 2.5);
    P2.rf(c, fx - 1, -7, 15, 7, 3, P.DARK, OUT, 2.5);

    var lean = golpe ? 4 : 0, bob = golpe ? 0 : Math.sin(T * 4) * 0.6;
    c.save(); c.translate(lean, bob);
    if (golpe) c.rotate(0.06);
    // brazo y guante del FONDO (detrás del cuerpo)
    if (golpe) { limb(c, [[-4, -36], [12, -44]], P.STEEL_DD, 5); glove(c, 15, -45, 7, P); }
    else { limb(c, [[-2, -38], [11, -50]], P.STEEL_DD, 5); glove(c, 15, -53, 7, P); }

    P2.rf(c, -14, -24, 28, 8, 4, P.STEEL_D, OUT, 2.5);              // cadera
    P2.rf(c, -17, -46, 34, 26, 10, P.STEEL, OUT, LW);              // torso
    P2.rf(c, -12, -43, 24, 12, 5, P.STEEL_D, OUT, 2);              // peto
    P2.rf(c, -17, -29, 34, 5, 2.5, P.RED, OUT, 2);                 // franja roja (cinturón)
    P2.horns(c, -6, -25.5, 0.32, P.BRONZE);                        // hebilla: marca de Dark Toros
    P2.circ(c, 12, -24.5, 1.4, '#94a3b8', null);
    P2.rf(c, -5, -50, 10, 6, 2, P.STEEL_DD, OUT, 2);               // cuello
    // cabeza = mini torreta del jefe, pero sin cañón (este no dispara: pega)
    cabezaMini(c, 0, -46, 0.8, P, h);

    // brazo y guante del FRENTE
    if (golpe) {
      limb(c, [[2, -35], [34, -36]], P.STEEL_DD, 5.5);
      P2.circ(c, 2, -35, 5.5, P.STEEL_D, OUT, 2.5);
      glove(c, 42, -36, 10, P);
      // líneas de velocidad «¡zas!»: separadas del brazo, por encima y por debajo
      zas(c, [[16, -55, 28, -55.5], [22, -50, 38, -51], [24, -25, 38, -25.5], [18, -20.5, 28, -21]]);
    } else {
      limb(c, [[2, -34], [10, -42], [17, -46]], P.STEEL_DD, 5.5);
      P2.circ(c, 2, -35, 5.5, P.STEEL_D, OUT, 2.5);
      glove(c, 20, -47, 8.5, P);
    }
    c.restore();
  });

  // =====================================================================
  //  ROBOT CON ESCUDO — (x, y) = pies. ~78 px a escala 1.
  //  Escudo delante (hacia facing), batería brillante (PUNTO DÉBIL) detrás.
  //  o: {scale, facing, hacked}
  // =====================================================================
  P2.fn.robotEscudo = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = (o.facing === -1) ? -1 : 1, h = !!o.hacked, P = pal(h);
    var T = P2.T, pulse = 0.5 + 0.5 * Math.sin(T * 5);
    c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';
    P2.elli(c, 2, -1, 30, 5, 'rgba(0,0,0,0.25)', null);

    // piernas robustas
    P2.rf(c, -17, -22, 13, 20, 5, P.STEEL_DD, OUT, 2.5);
    P2.rf(c, 1, -22, 13, 20, 5, P.STEEL_DD, OUT, 2.5);
    P2.rf(c, -20, -8, 18, 8, 3, P.DARK, OUT, 2.5);
    P2.rf(c, 0, -8, 19, 8, 3, P.DARK, OUT, 2.5);

    // --- PUNTO DÉBIL: batería en la espalda ---
    // halo brillante (degradado radial, aditivo) en vez de un disco opaco
    c.save();
    c.globalCompositeOperation = 'lighter';
    var hg = c.createRadialGradient(-32, -44, 2, -32, -44, 26);
    hg.addColorStop(0, 'rgba(253,224,71,' + (0.55 + 0.15 * pulse).toFixed(3) + ')');
    hg.addColorStop(0.55, 'rgba(253,224,71,0.22)');
    hg.addColorStop(1, 'rgba(253,224,71,0)');
    c.fillStyle = hg; c.beginPath(); c.ellipse(-32, -44, 26, 30, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    P2.rf(c, -40, -60, 16, 32, 5, P.STEEL_DD, OUT, 2.5);           // marco
    P2.rf(c, -37, -57, 10, 26, 4, GLOW, OUT, 2);                   // núcleo
    c.globalAlpha = 0.8; P2.rf(c, -35, -55, 3, 20, 1.5, '#ffffff', null); c.globalAlpha = 1;
    P2.poly(c, [[-31, -54], [-35, -44], [-32, -44], [-34, -35], [-29, -47], [-32, -47]], GLOW_D, OUT, 1.5); // rayo
    P2.rf(c, -38, -62, 12, 4, 2, P.DARK, OUT, 2);                  // tapas
    P2.rf(c, -38, -30, 12, 4, 2, P.DARK, OUT, 2);

    P2.rf(c, -20, -27, 38, 8, 4, P.STEEL_D, OUT, 2.5);             // cadera
    P2.rf(c, -24, -58, 42, 34, 12, P.STEEL, OUT, LW);              // torso
    P2.rf(c, -24, -38, 42, 6, 3, P.RED, OUT, 2);                   // franja roja
    [[-18, -52], [-18, -29]].forEach(function (b) { P2.circ(c, b[0], b[1], 1.6, '#94a3b8', null); });
    P2.rf(c, -7, -62, 12, 6, 2, P.STEEL_DD, OUT, 2);               // cuello
    cabezaMini(c, -1, -58, 0.9, P, h);

    // brazo que sujeta el escudo
    P2.circ(c, 4, -47, 6.5, P.STEEL_D, OUT, 2.5);
    limb(c, [[4, -47], [16, -38]], P.STEEL_DD, 5);

    // --- ESCUDO grande delante ---
    P2.rf(c, 12, -68, 28, 64, 11, P.STEEL_D, OUT, LW);
    P2.rf(c, 15.5, -64.5, 21, 57, 8, P.RED, OUT, 2.5);
    c.globalAlpha = 0.35; P2.rf(c, 18, -61, 4, 46, 2, '#ffffff', null); c.globalAlpha = 1;
    P2.horns(c, 26, -38, 0.42, P.BRONZE);
    [[16, -64], [36, -64], [16, -8], [36, -8]].forEach(function (b) { P2.circ(c, b[0], b[1], 1.7, '#cbd5e1', OUT, 1); });
  });

  // =====================================================================
  //  ROBOT ARAÑA — 6 patas, cuerpo redondo, ojo-luz. ~40 de alto, ~70 de ancho.
  //  En el suelo (x, y) = patas. Con o.techo, (x, y) = punto de anclaje en el techo
  //  y cuelga boca abajo. o: {scale, facing, techo, hacked}
  // =====================================================================
  P2.fn.robotArana = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), f = (o.facing === -1) ? -1 : 1, h = !!o.hacked, P = pal(h);
    var techo = !!o.techo, T = P2.T;
    c.translate(x, y); c.scale(s * f, techo ? -s : s); c.lineJoin = 'round'; c.lineCap = 'round';
    if (!techo) P2.elli(c, 0, -1, 36, 5, 'rgba(0,0,0,0.25)', null);

    function pata(p, col) {
      limb(c, [[p[0], p[1]], [p[2], p[3]], [p[4], 0]], col, 3.5);
      P2.circ(c, p[2], p[3], 2.8, col, OUT, 1.8);                  // rodilla
      P2.rf(c, p[4] - 3.5, -3, 7, 4, 2, P.DARK, OUT, 1.5);         // pie
    }
    var w = Math.sin(T * 6) * 1.2;
    // patas del lado lejano (más oscuras)
    pata([-5, -22, -17, -41 + w, -26], P.STEEL_DD);
    pata([5, -22, 17, -41 - w, 26], P.STEEL_DD);
    // patas del lado cercano
    pata([-3, -18, -8, -38 - w, -14], P.STEEL_D);
    pata([3, -18, 8, -38 + w, 14], P.STEEL_D);
    pata([-10, -17, -25, -33, -36], P.STEEL_D);
    pata([10, -17, 25, -33, 36], P.STEEL_D);

    // antena con lucecita
    limb(c, [[-7, -31], [-11, -40]], P.STEEL_DD, 2);
    P2.circ(c, -11, -41, 2.6, P.RED_L, OUT, 1.5);
    // cuerpo redondo
    P2.elli(c, 0, -20, 20, 14, P.STEEL, OUT, LW);
    c.save(); c.beginPath(); c.ellipse(0, -20, 20, 14, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = P.RED; c.fillRect(-22, -15, 44, 5);
    c.fillStyle = P.STEEL_D; c.fillRect(-22, -10, 44, 6);
    c.restore();
    P2.elli(c, 0, -20, 20, 14, null, OUT, LW);
    c.strokeStyle = OUT; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-19.5, -15); c.lineTo(19.5, -15); c.moveTo(-18, -10); c.lineTo(18, -10); c.stroke();
    c.globalAlpha = 0.45; P2.elli(c, -7, -28, 6, 3, '#ffffff', null); c.globalAlpha = 1;
    [-14, -4].forEach(function (rx) { P2.circ(c, rx, -12.5, 1.4, '#cbd5e1', null); }); // remaches (sobre la franja, no parecen ojos)
    // visera con el ojo-luz (como la torreta)
    P2.rf(c, 5, -28, 15, 12, 6, P.DARK, OUT, 2);
    P2.eyeLight(c, 13, -22, 3.6, P.EYE);
    if (h) {
      [[OUT, 4], ['#dcfce7', 2]].forEach(function (p) {
        c.strokeStyle = p[0]; c.lineWidth = p[1];
        c.beginPath(); c.arc(12, -12, 4, 0.18 * Math.PI, 0.82 * Math.PI); c.stroke();
      });
    }
  });

  // =====================================================================
  //  MINI-TORRETA con patitas (los «hijos» de Dark Secuaz). (x, y) = pies.
  //  o: {scale, hacked, angle}
  // =====================================================================
  P2.fn.miniTorreta = safe(function (c, x, y, o) {
    var s = num(o.scale, 1), h = !!o.hacked, ang = num(o.angle, h ? 0 : -0.3);
    c.translate(x, y); c.scale(s, s);
    P2.elli(c, 0, -1, 18, 3.5, 'rgba(0,0,0,0.25)', null);
    [-11, 0, 11].forEach(function (d) {
      P2.rf(c, d - 3, -16, 6, 14, 3, '#334155', OUT, 2);
      P2.rf(c, d - 5, -5, 10, 5, 2, '#1e293b', OUT, 1.5);
    });
    if (window.G && G.gfx && G.gfx.drawTurret) G.gfx.drawTurret(c, 0, -30, { t: P2.T, scale: 1, hacked: h, angle: ang });
  });

  // ---------------------------------------------------------------------
  //  Utilidades de panel
  // ---------------------------------------------------------------------
  function suelo(c, gy, col, top) {
    c.fillStyle = col || 'rgba(0,0,0,0.28)'; c.fillRect(0, gy, 480, 480 - gy);
    c.fillStyle = top || 'rgba(255,255,255,0.12)'; c.fillRect(0, gy, 480, 4);
    P2.line(c, 0, gy, 480, gy, OUT, 3);
  }
  function flecha(c, x1, y1, x2, y2, col) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    [[OUT, 7], [col, 3.5]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1]; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    });
    c.save(); c.translate(x2, y2); c.rotate(a);
    P2.poly(c, [[6, 0], [-7, -7], [-7, 7]], col, OUT, 2);
    c.restore();
  }
  // Flecha de Lord Falcon (palo marrón, punta de acero, plumas verdes). Apunta a +x.
  function flechaFalcon(c, x, y, ang, L) {
    var F = P2.PAL.falcon;
    c.save(); c.translate(x, y); c.rotate(ang);
    P2.rf(c, -L / 2, -2.5, L, 5, 2.5, F.BROWN, OUT, 2);
    P2.poly(c, [[L / 2 + 9, 0], [L / 2 - 1, -6], [L / 2 - 1, 6]], '#cbd5e1', OUT, 2);
    P2.poly(c, [[-L / 2 + 8, 0], [-L / 2 - 2, -8], [-L / 2 - 5, -8], [-L / 2 - 1, 0]], F.GREEN, OUT, 1.8);
    P2.poly(c, [[-L / 2 + 8, 0], [-L / 2 - 2, 8], [-L / 2 - 5, 8], [-L / 2 - 1, 0]], F.GREEN, OUT, 1.8);
    c.restore();
  }
  function pum(c, x, y, r, txt) {
    var pts = [];
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8, rr = (i % 2) ? r * 0.62 : r;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    P2.poly(c, pts, '#fbbf24', OUT, 2.5);
    P2.label(c, txt, x, y + 6, 17, '#fff7ed');
  }

  P2.register({
    key: 'enemigos',
    title: 'Robots enemigos del ejército de Dark Secuaz',
    panels: [
      // ---------------- 1) BOXEADOR ----------------
      {
        title: 'Robot boxeador',
        subtitle: 'Pequeño como un héroe, pero pega como su jefe',
        bg: ['#1e1238', '#4c1d95'],
        render: function (c) {
          suelo(c, 404);
          P2.label(c, 'Avisa con «!» y luego… ¡PUM! Salta para esquivarlo', 240, 130, 14, '#fde68a');
          P2.fn.boxeador(c, 118, 404, { scale: 2.6, pose: 'guardia' });
          P2.exclaim(c, 120, 210);
          pum(c, 440, 304, 30, '');
          P2.fn.boxeador(c, 300, 404, { scale: 2.6, pose: 'golpe' });
          P2.label(c, '¡PUM!', 424, 258, 22, '#fbbf24');
          P2.label(c, '1) En guardia', 118, 436, 15, '#fef3c7');
          P2.label(c, '«!» = va a pegar', 118, 456, 12, '#cbd5e1');
          P2.label(c, '2) ¡Puñetazo!', 320, 436, 15, '#fef3c7');
          P2.label(c, '¡el brazo se estira de golpe!', 320, 456, 12, '#cbd5e1');
        }
      },
      // ---------------- 2) ESCUDO ----------------
      {
        title: 'Robot con escudo',
        subtitle: 'De frente bloquea: atácalo por detrás o con el lanza-redes',
        bg: ['#0f172a', '#1e3a8a'],
        render: function (c) {
          suelo(c, 404);
          P2.fn.robotEscudo(c, 122, 404, { scale: 2.3, facing: -1 });
          P2.fn.robotEscudo(c, 358, 404, { scale: 2.3, facing: 1 });
          sparkle(c, 240, 262, 7); sparkle(c, 240, 340, 5);
          P2.label(c, '¡PUNTO DÉBIL!', 240, 110, 20, '#fde047');
          P2.label(c, 'la batería brilla', 240, 130, 13, '#fef3c7');
          flecha(c, 214, 140, 202, 236, '#fde047');
          flecha(c, 266, 140, 278, 236, '#fde047');
          // una flecha de Falcon rebota contra el escudo: ¡CLINC!
          c.save(); c.setLineDash([5, 6]); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2.5;
          c.beginPath(); c.moveTo(26, 268); c.quadraticCurveTo(18, 236, 34, 214); c.stroke(); c.restore();
          flechaFalcon(c, 46, 200, -2.5, 36);
          sparkle(c, 24, 270, 8, '#fde68a'); sparkle(c, 14, 252, 5); sparkle(c, 38, 286, 4.5);
          P2.label(c, '¡CLINC!', 72, 172, 18, '#fde047');
          P2.label(c, 'De frente: ¡bloquea!', 98, 434, 14, '#fecaca');
          P2.label(c, '← mira a la izquierda', 98, 454, 12, '#cbd5e1');
          P2.label(c, 'Por detrás o con red: ¡zas!', 368, 434, 14, '#bbf7d0');
          P2.label(c, 'mira a la derecha →', 382, 454, 12, '#cbd5e1');
        }
      },
      // ---------------- 3) ARAÑA ----------------
      {
        title: 'Robot araña',
        subtitle: 'Camina por paredes y techos y cae de sorpresa',
        bg: ['#082f49', '#0e7490'],
        render: function (c) {
          // techo
          c.fillStyle = '#334155'; c.fillRect(0, 66, 480, 26);
          c.fillStyle = '#475569'; c.fillRect(0, 66, 480, 6);
          P2.line(c, 0, 92, 480, 92, OUT, 3);
          for (var i = 0; i < 6; i++) P2.circ(c, 20 + i * 88, 79, 3, '#94a3b8', OUT, 1.5);
          // pared izquierda
          c.fillStyle = '#1e293b'; c.fillRect(0, 92, 26, 312);
          c.fillStyle = 'rgba(255,255,255,0.08)'; for (var k = 0; k < 6; k++) c.fillRect(0, 104 + k * 52, 26, 3);
          P2.line(c, 26, 92, 26, 404, OUT, 3);
          suelo(c, 404);
          // colgando del techo
          P2.fn.robotArana(c, 290, 92, { scale: 2.0, techo: true, facing: -1 });
          // trayectoria de caída
          c.save(); c.setLineDash([8, 8]); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(290, 214); c.lineTo(290, 290); c.stroke(); c.restore();
          P2.exclaim(c, 290, 190);                                  // aviso pegado a la araña
          P2.poly(c, [[290, 304], [280, 288], [300, 288]], '#ffffff', OUT, 2);
          P2.label(c, '¡Cae de sorpresa!', 380, 250, 15, '#fde68a');
          // en la pared
          c.save(); c.translate(26, 262); c.rotate(Math.PI / 2);
          P2.fn.robotArana(c, 0, 0, { scale: 1.45, facing: -1 });
          c.restore();
          P2.label(c, '¡y por la pared!', 36, 194, 13, '#cbd5e1', 'left');
          // en el suelo
          P2.fn.robotArana(c, 210, 404, { scale: 2.2, facing: 1 });
          P2.label(c, 'En el suelo', 210, 436, 15, '#fef3c7');
          P2.label(c, '6 patas · ojo de luz roja', 210, 456, 12, '#cbd5e1');
        }
      },
      // ---------------- 4) ESCALA ----------------
      {
        title: 'A escala de juego',
        subtitle: 'Todos a tamaño real junto a los héroes',
        bg: ['#1e1b4b', '#3730a3'],
        render: function (c) {
          var g1 = 262, g2 = 420;
          // «lupa»: el boxeador de cerca, normal y hackeado
          function lupa(cx, cy, hk) {
            P2.circ(c, cx, cy, 50, hk ? '#14532d' : '#3b0764', null);
            c.save(); c.beginPath(); c.arc(cx, cy, 50, 0, Math.PI * 2); c.clip();
            P2.fn.boxeador(c, cx - 4, cy + 96, { scale: 2.1, facing: 1, pose: 'guardia', hacked: hk });
            c.restore();
            P2.circ(c, cx, cy, 50, null, OUT, 5);
            P2.circ(c, cx, cy, 50, null, '#e2e8f0', 2.5);
          }
          lupa(96, 128, false); lupa(304, 128, true);
          flecha(c, 160, 128, 232, 128, '#86efac');
          P2.label(c, 'hackeo', 196, 116, 13, '#bbf7d0');
          P2.label(c, 'Normal', 96, 192, 13, '#fecaca');
          P2.label(c, '¡Hackeado:', 410, 120, 15, '#86efac');
          P2.label(c, 'sonríe!', 410, 140, 15, '#86efac');
          // fila 1: enemigos
          c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, g1, 480, 26);
          P2.line(c, 0, g1, 480, g1, OUT, 3);
          c.save(); c.setLineDash([5, 6]); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(12, g1 - 64); c.lineTo(468, g1 - 64); c.stroke(); c.restore();
          P2.label(c, 'altura de un héroe', 468, g1 - 70, 12, '#cbd5e1', 'right');
          P2.director(c, 38, g1, { facing: 1 });
          P2.falcon(c, 98, g1, { facing: 1 });
          P2.fn.boxeador(c, 176, g1, { facing: -1, pose: 'guardia' });
          P2.fn.robotEscudo(c, 254, g1, { facing: -1 });
          P2.fn.robotArana(c, 338, g1, { facing: -1 });
          P2.fn.miniTorreta(c, 428, g1, {});
          [['Director', 38], ['Falcon', 98], ['Boxeador', 176], ['Robot escudo', 254], ['Araña', 338], ['Mini-torreta', 428]]
            .forEach(function (l) { P2.label(c, l[0], l[1], g1 + 19, 12, '#fef3c7'); });

          // fila 2: hackeados (verdes)
          P2.label(c, 'Hackeados: ¡se vuelven VERDES!', 240, 318, 16, '#86efac');
          suelo(c, g2, 'rgba(0,0,0,0.25)');
          P2.director(c, 38, g2, { facing: 1 });
          P2.fn.boxeador(c, 118, g2, { facing: -1, pose: 'guardia', hacked: true });
          P2.fn.robotEscudo(c, 200, g2, { facing: -1, hacked: true });
          P2.fn.robotArana(c, 292, g2, { facing: -1, hacked: true });
          P2.fn.miniTorreta(c, 372, g2, { hacked: true });
          P2.falcon(c, 440, g2, { facing: -1 });
          P2.label(c, 'Ojo-luz verde = ¡ahora te ayudan!', 240, g2 + 34, 13, '#cbd5e1');
        }
      }
    ]
  });
})();
