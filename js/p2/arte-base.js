// helpers.js — Utilidades compartidas para los PROTOTIPOS de la Parte 2.
// Mismo estilo que el juego: contornos gruesos #1a1a2e, colores saturados,
// formas rechonchas tipo Kirby/LEGO. Cada módulo de prototipo se registra con
// P2.register({...}) y la página prototipo-parte2-robots.html los dibuja en
// una cuadrícula de paneles de 480x480.
window.P2 = window.P2 || {};
(function () {
  'use strict';
  var OUTLINE = '#1a1a2e', LW = 3;
  P2.OUTLINE = OUTLINE;
  P2.LW = LW;
  P2.T = 1.3;            // tiempo fijo (dibujos deterministas para revisarlos)
  P2.fn = P2.fn || {};   // funciones de dibujo exportadas por los módulos

  // ---- Primitivas ----
  P2.rr = function (c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  // rectángulo redondeado relleno + contorno
  P2.rf = function (c, x, y, w, h, r, fill, stroke, lw) {
    P2.rr(c, x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || LW; c.stroke(); }
  };
  P2.circ = function (c, x, y, r, fill, stroke, lw) {
    c.beginPath(); c.arc(x, y, Math.abs(r), 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || LW; c.stroke(); }
  };
  P2.elli = function (c, x, y, rx, ry, fill, stroke, lw) {
    c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || LW; c.stroke(); }
  };
  P2.line = function (c, x1, y1, x2, y2, col, lw) {
    c.strokeStyle = col || OUTLINE; c.lineWidth = lw || LW; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  };
  // Polígono relleno + contorno: pts = [[x,y],...]
  P2.poly = function (c, pts, fill, stroke, lw) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || LW; c.lineJoin = 'round'; c.stroke(); }
  };
  // Ojo-luz tipo torreta (el "ojo" del ejército de Dark Secuaz): halo + núcleo + brillo
  P2.eyeLight = function (c, x, y, r, col) {
    c.save();
    c.globalAlpha = 0.4; P2.circ(c, x, y, r * 1.8, col, null); c.globalAlpha = 1;
    P2.circ(c, x, y, r, col, OUTLINE, 2);
    P2.circ(c, x + r * 0.3, y - r * 0.3, r * 0.3, '#ffffff', null);
    c.restore();
  };
  // Marca de Dark Toros (cuernos de bronce). s = escala.
  P2.horns = function (c, cx, cy, s, col) {
    s = s || 1; col = col || '#b87333';
    c.save(); c.lineCap = 'round';
    [[OUTLINE, 8 * s], [col, 4.5 * s]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(cx - 5 * s, cy); c.quadraticCurveTo(cx - 20 * s, cy - 1 * s, cx - 22 * s, cy - 15 * s); c.stroke();
      c.beginPath(); c.moveTo(cx + 5 * s, cy); c.quadraticCurveTo(cx + 20 * s, cy - 1 * s, cx + 22 * s, cy - 15 * s); c.stroke();
    });
    P2.circ(c, cx, cy + 1 * s, 6 * s, col, OUTLINE, 2);
    c.restore();
  };
  P2.heart = function (c, x, y, s) {
    s = s || 1; c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#ff5a7a'; c.strokeStyle = OUTLINE; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-7, -4, -14, 3, 0, 14); c.bezierCurveTo(14, 3, 7, -4, 0, 4);
    c.fill(); c.stroke(); c.restore();
  };
  P2.exclaim = function (c, x, y) {
    if (window.G && G.gfx && G.gfx.drawExclamation) G.gfx.drawExclamation(c, x, y);
  };
  // Texto con contorno (rótulos). Siempre lineJoin round (evita picos en la M).
  P2.label = function (c, t, x, y, size, col, align) {
    c.save();
    c.font = 'bold ' + (size || 18) + 'px system-ui, "Segoe UI", Arial, sans-serif';
    c.textAlign = align || 'center'; c.textBaseline = 'alphabetic';
    c.lineJoin = 'round'; c.miterLimit = 2; c.lineWidth = Math.max(3, (size || 18) * 0.28);
    c.strokeStyle = OUTLINE; c.strokeText(t, x, y);
    c.fillStyle = col || '#fef3c7'; c.fillText(t, x, y);
    c.restore();
  };
  // Sombra en el suelo
  P2.shadow = function (c, x, y, rx) { P2.elli(c, x, y, rx, rx * 0.18, 'rgba(0,0,0,0.25)', null); };

  // ---- Paletas oficiales ----
  P2.PAL = {
    // Ejército de Dark Secuaz: acero + rojo, ojo-luz roja, marca de bronce
    enemy: { STEEL: '#64748b', STEEL_D: '#475569', STEEL_DD: '#334155', DARK: '#1e293b',
             RED: '#7f1d1d', RED_L: '#ef4444', EYE: '#ff4d4d', BRONZE: '#b87333', GEM: '#e11d48' },
    // Lo hackeado se vuelve VERDE (regla de la Parte 1: torretas hackeadas = verdes)
    hacked: { RED: '#15803d', RED_L: '#22c55e', EYE: '#86efac' },
    director: { SUIT: '#1e3a8a', SUIT2: '#3b82f6', VEST: '#0f172a', SKIN: '#f2c49b', CYAN: '#22d3ee' },
    falcon: { DARK: '#14532d', GREEN: '#22c55e', BROWN: '#78350f', MASK: '#9ca3af', SKIN: '#f2c49b' },
    gem: { A: '#e11d48', B: '#a21caf' }
  };

  // ---- DARK SECUAZ (diseño APROBADO por Juanjo: "Coloso", ojo = luz de torreta) ----
  // (x,y) = pies. o: {scale, good, angle}. Mide ~190 px de alto a escala 1.
  function secuazPalette(good) {
    var E = P2.PAL.enemy, H = P2.PAL.hacked;
    return { STEEL: E.STEEL, STEEL_D: E.STEEL_D, STEEL_DD: E.STEEL_DD, DARK: E.DARK,
             RED: good ? H.RED : E.RED, RED_L: good ? H.RED_L : E.RED_L, EYE: good ? H.EYE : E.EYE,
             BRONZE: E.BRONZE, GEM: E.GEM };
  }
  P2.fn.turretHead = function (c, cx, by, K, P, angle, good) {
    var oy = by - 16 * K, k = function (v) { return v * K; };
    P2.rf(c, cx + k(-16), oy + k(4), k(32), k(12), k(5), '#334155', OUTLINE, LW);
    P2.rf(c, cx + k(-12), oy + k(-4), k(24), k(12), k(6), P.RED, OUTLINE, LW);
    c.save(); c.translate(cx, oy + k(-2)); c.rotate(angle);
    P2.rf(c, 0, k(-4), k(22), k(8), k(3), P.RED_L, OUTLINE, 2.5);
    P2.rf(c, k(20), k(-5), k(5), k(10), k(2), '#1e293b', OUTLINE, 2);
    P2.circ(c, k(24), 0, k(2), '#0b1020', null);
    c.restore();
    c.beginPath(); c.arc(cx, oy + k(-2), k(9), Math.PI, 0); c.closePath();
    c.fillStyle = P.RED; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = LW; c.stroke();
    c.globalAlpha = 0.4; P2.circ(c, cx, oy + k(2.5), k(5.5), P.EYE, null); c.globalAlpha = 1;
    P2.circ(c, cx, oy + k(2.5), k(3), P.EYE, OUTLINE, 2);
    P2.circ(c, cx + k(0.9), oy + k(1.6), k(0.9), '#ffffff', null);
    if (good) { c.strokeStyle = OUTLINE; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, oy + k(5), k(3.5), 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  };
  P2.fn.secuaz = function (c, x, y, o) {
    o = o || {}; var s = o.scale || 1, good = !!o.good, P = secuazPalette(good);
    var angle = (typeof o.angle === 'number') ? o.angle : (good ? 0.35 : -0.4);
    c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
    P2.elli(c, 0, -1, 64, 10, 'rgba(0,0,0,0.25)', null);
    P2.rf(c, -34, -48, 24, 48, 8, P.STEEL_DD, OUTLINE, LW); P2.rf(c, 10, -48, 24, 48, 8, P.STEEL_DD, OUTLINE, LW);
    P2.circ(c, -22, -28, 4, '#94a3b8', OUTLINE, 1.5); P2.circ(c, 22, -28, 4, '#94a3b8', OUTLINE, 1.5);
    P2.rf(c, -42, -13, 36, 14, 6, P.DARK, OUTLINE, LW); P2.rf(c, 6, -13, 36, 14, 6, P.DARK, OUTLINE, LW);
    P2.rf(c, -42, -60, 84, 16, 8, P.STEEL_D, OUTLINE, LW);
    P2.rf(c, -50, -124, 100, 70, 18, P.STEEL, OUTLINE, LW);
    P2.rf(c, -36, -116, 72, 32, 12, P.STEEL_D, OUTLINE, 2.5);
    P2.horns(c, 0, -96, 1, P.BRONZE);
    P2.rf(c, -50, -80, 100, 8, 4, P.RED, OUTLINE, 2);
    // bolsillo blindado con la gema
    P2.rf(c, 12, -72, 32, 24, 6, P.DARK, OUTLINE, 2.5);
    [[17, -67], [39, -67], [17, -53], [39, -53]].forEach(function (b) { P2.circ(c, b[0], b[1], 1.8, '#94a3b8', null); });
    if (!good) {
      P2.circ(c, 28, -59, 4, '#fbbf24', OUTLINE, 1.5);
      c.globalAlpha = 0.7; P2.elli(c, 28, -73, 13, 4, P.GEM, null); c.globalAlpha = 1;
    }
    P2.circ(c, -58, -114, 15, P.STEEL_D, OUTLINE, LW); P2.circ(c, 58, -114, 15, P.STEEL_D, OUTLINE, LW);
    P2.rf(c, -72, -110, 22, 40, 10, P.STEEL_DD, OUTLINE, LW); P2.rf(c, 50, -110, 22, 40, 10, P.STEEL_DD, OUTLINE, LW);
    [-82, 44].forEach(function (fx) {
      P2.rf(c, fx, -78, 38, 34, 12, P.RED, OUTLINE, LW);
      c.strokeStyle = OUTLINE; c.lineWidth = 2;
      [8, 16, 24].forEach(function (d) { c.beginPath(); c.moveTo(fx + d + 3, -76); c.lineTo(fx + d + 3, -67); c.stroke(); });
    });
    P2.rf(c, -10, -136, 20, 14, 4, P.STEEL_DD, OUTLINE, 2.5);
    P2.fn.turretHead(c, 0, -130, 2.4, P, angle, good);
    c.restore();
  };

  // ---- Héroes de referencia (del juego) ----
  P2.director = function (c, x, feetY, o) {
    o = o || {};
    if (window.G && G.gfx && G.gfx.drawDirector) G.gfx.drawDirector(c, x, feetY, { t: P2.T, facing: o.facing || 1, pose: o.pose || 'idle', scale: o.scale || 1 });
  };
  P2.falcon = function (c, x, feetY, o) {
    o = o || {};
    if (window.G && G.gfx && G.gfx.drawFalcon) G.gfx.drawFalcon(c, x, feetY, { t: P2.T, facing: o.facing || 1, pose: o.pose || 'idle', scale: o.scale || 1 });
  };

  // ---- Llamada SEGURA a una función de arte (para el juego) ----
  // P2.call('bgCiudad', ctx, camX, t) → true si existía y se dibujó; false si no
  // existe (así una pieza de arte que falte nunca rompe una escena).
  P2.call = function (name) {
    var fn = P2.fn && P2.fn[name];
    if (typeof fn !== 'function') return false;
    var c = arguments[1];
    try {
      if (c && c.save) c.save();
      fn.apply(P2.fn, Array.prototype.slice.call(arguments, 1));
    } catch (e) {
      if (window.console && console.warn) console.warn('[P2.call] ' + name, e);
    } finally {
      try { if (c && c.restore) c.restore(); } catch (e2) { /* nada */ }
    }
    return true;
  };

  // ---- Registro y página ----
  P2.modules = P2.modules || [];
  // mod = { key, title, panels: [{ title, subtitle, bg: [c0, c1], render(ctx, t) }] }
  // render dibuja en coordenadas LOCALES del panel (0..480 x 0..480).
  // Deja libre la franja superior (y < 64) para el título y el subtítulo.
  P2.register = function (mod) {
    P2.modules = P2.modules.filter(function (m) { return m.key !== mod.key; });
    P2.modules.push(mod);
  };

  var HEADER = 50, PANEL = 480;
  P2.renderAll = function (canvas, only, order) {
    var mods = P2.modules.slice();
    if (order) mods.sort(function (a, b) { return order.indexOf(a.key) - order.indexOf(b.key); });
    if (only) {
      var keys = String(only).split(',');
      mods = mods.filter(function (m) { return keys.indexOf(m.key) >= 0; });
    }
    var h = 0;
    mods.forEach(function (m) { h += HEADER + Math.ceil(Math.max(1, m.panels.length) / 2) * PANEL; });
    canvas.width = 960; canvas.height = Math.max(h, 100);
    var c = canvas.getContext('2d');
    c.fillStyle = '#0b1020'; c.fillRect(0, 0, canvas.width, canvas.height);
    var y0 = 0;
    mods.forEach(function (m) {
      c.fillStyle = '#111733'; c.fillRect(0, y0, 960, HEADER);
      P2.label(c, m.title, 480, y0 + 34, 22, '#fbbf24');
      y0 += HEADER;
      m.panels.forEach(function (p, i) {
        var px = (i % 2) * PANEL, py = y0 + Math.floor(i / 2) * PANEL;
        var bg = p.bg || ['#1e1238', '#4c1d95'];
        var g = c.createLinearGradient(0, py, 0, py + PANEL); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
        c.fillStyle = g; c.fillRect(px, py, PANEL, PANEL);
        c.save();
        c.beginPath(); c.rect(px, py, PANEL, PANEL); c.clip();
        c.translate(px, py);
        c.lineJoin = 'round'; c.lineCap = 'round';
        try { p.render(c, P2.T); }
        catch (e) { c.restore(); c.save(); c.translate(px, py); P2.label(c, 'ERROR: ' + e.message, 240, 240, 14, '#fca5a5'); console.error(e); }
        c.restore();
        P2.label(c, p.title || '', px + 240, py + 32, 18, '#fef3c7');
        if (p.subtitle) P2.label(c, p.subtitle, px + 240, py + 54, 13, '#cbd5e1');
        c.strokeStyle = '#0b1020'; c.lineWidth = 4; c.strokeRect(px, py, PANEL, PANEL);
      });
      y0 += Math.ceil(Math.max(1, m.panels.length) / 2) * PANEL;
    });
    return canvas.height;
  };
})();
