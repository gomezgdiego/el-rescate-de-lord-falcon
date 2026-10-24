// ============================================================================
// ui3.js — Interfaz de la PARTE 3 "We Are a Team" (contrato técnico §8.6).
// Creado por Juanjo (Diseñador Jefe, 10 años) y Papá (Productor).
// Dueño: interfaz.
// Escenas: p3prep (¿con quién empiezas? / vehículos), disenosJuanjo,
//          levelDoneP3, p3next (puente), creditsP3, mensajeJuanjo, finalP3.
// Funciones: G.p3launch(n) y G.ui3.drawHowto3(ctx, t) (página de "Cómo jugar").
// Mismo estilo visual que js/ui.js y js/p2/ui2.js (helpers copiados aquí: no
// dependemos de sus funciones privadas). Todo menú se maneja SOLO con
// arriba / abajo / OK. Nunca lanza excepciones en update/render.
// Todo el arte se dibuja con P2.call (y un dibujo de respaldo si falta).
// ============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;

  // ---- Constantes visuales (las mismas que ui.js) ----
  var W = 960, H = 540;
  var OUTLINE = '#1a1a2e';
  var CREAM = '#fef3c7';
  var GOLD = '#fbbf24';
  var GOLD_DARK = '#d97706';
  var CYAN = '#22d3ee';
  var FONT = 'system-ui, "Segoe UI", Arial, sans-serif';
  var SECUAZ_COL = '#86efac';
  var ROBOVILL_COL = '#fb7185';
  var JUANJO_COL = '#7dd3fc';

  // ==========================================================================
  // HELPERS (copiados del estilo de ui.js / ui2.js)
  // ==========================================================================
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function outlinedText(ctx, txt, x, y, size, fill, outline, lineW, align) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = lineW || Math.max(3, size * 0.14);
    ctx.strokeStyle = outline || OUTLINE;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill || '#ffffff';
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function plainText(ctx, txt, x, y, size, fill, align, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fill || '#ffffff';
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function wrapText(ctx, txt, maxWidth, size, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    var words = String(txt).split(' ');
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = words[i];
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }

  function drawMenuBackdrop(ctx, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1a4a');
    g.addColorStop(0.5, '#5b21b6');
    g.addColorStop(1, '#7c2d12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    for (var i = 0; i < 60; i++) {
      var sx = (i * 137.5) % W;
      var sy = (i * 79.3) % (H * 0.7);
      var tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      ctx.globalAlpha = 0.25 + 0.55 * tw;
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function gfxCall(name) {
    var fn = G.gfx && G.gfx[name];
    if (typeof fn !== 'function') return false;
    try { fn.apply(G.gfx, Array.prototype.slice.call(arguments, 1)); } catch (e) { /* nunca romper */ }
    return true;
  }

  // Arte de las Partes 2 y 3 (P2.call ya protege con try/catch y save/restore).
  function p2call() {
    try {
      if (!window.P2 || typeof window.P2.call !== 'function') return false;
      return !!window.P2.call.apply(window.P2, arguments);
    } catch (e) { return false; }
  }

  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) {} }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) {} }
  function now() { return (typeof G.T === 'number') ? G.T : (Date.now() / 1000); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function stepDt(dt) { return (typeof dt === 'number' && dt > 0 && dt < 1) ? dt : 1 / 60; }
  function easeOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }

  function pressedOf(inp, action) {
    try { return !!(inp && inp.pressed && inp.pressed(action)); } catch (e) { return false; }
  }
  function menuPressed(action) { return pressedOf(G.input, action) || pressedOf(G.input2, action); }
  function heldOf(inp, action) {
    try { return !!(inp && inp.held && inp.held(action)); } catch (e) { return false; }
  }
  function heldAny(action) { return heldOf(G.input, action) || heldOf(G.input2, action); }
  function isCoop() { return !!(G.state && G.state.coop); }

  function safe(fn) {
    return function (a) {
      try { return fn(a); } catch (e) {
        try { if (window.console && console.warn) console.warn('[ui3] ' + (e && e.message)); } catch (e2) {}
      }
    };
  }

  function starPath(ctx, cx, cy, r, inner) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = (Math.PI / 5) * i - Math.PI / 2;
      var rad = (i % 2 === 0) ? r : r * (inner || 0.45);
      var x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + 4 * s);
    ctx.bezierCurveTo(x - 7 * s, y - 4 * s, x - 14 * s, y + 3 * s, x, y + 14 * s);
    ctx.bezierCurveTo(x + 14 * s, y + 3 * s, x + 7 * s, y - 4 * s, x, y + 4 * s);
    ctx.closePath();
  }

  function blinkText(ctx, txt, y, size, col) {
    // Nunca baja de 0,55: la instrucción se lee siempre, también sobre fondos claros.
    var blink = 0.55 + 0.45 * Math.abs(Math.sin(now() * 2.5));
    ctx.save();
    ctx.globalAlpha = blink;
    outlinedText(ctx, txt, W / 2, y, size || 20, col || CREAM, OUTLINE, 4, 'center');
    ctx.restore();
  }

  // Franja oscura suave detrás de la última línea (para que se lea sobre nubes claras).
  function franjaAbajo(ctx, y) {
    ctx.save();
    var g = ctx.createLinearGradient(0, y - 24, 0, y + 24);
    g.addColorStop(0, 'rgba(8,10,30,0)');
    g.addColorStop(0.3, 'rgba(8,10,30,0.45)');
    g.addColorStop(0.7, 'rgba(8,10,30,0.45)');
    g.addColorStop(1, 'rgba(8,10,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 24, W, 48);
    ctx.restore();
  }

  // ¿Pantalla táctil? (para decir "OK" en vez de "Enter")
  function tactil() {
    try { return ('ontouchstart' in window) || !!(navigator && navigator.maxTouchPoints > 0); } catch (e) { return false; }
  }
  function okName() { return tactil() ? 'OK' : 'Enter'; }

  // ==========================================================================
  // DATOS DE LA PARTE 3 (con respaldo por si otro archivo aún no existe)
  // ==========================================================================
  var DEFAULT_FLOW3 = {
    chapters: {
      1: { story: 's3_cap1', scene: 'levelP3_1', prep: 'equipo' },
      2: { story: 's3_cap2', scene: 'levelP3_2', prep: 'moto' },
      3: { story: 's3_cap3', scene: 'levelP3_3', prep: 'submarino' },
      4: { story: 's3_cap4', scene: 'levelP3_4', prep: 'equipo' },
      5: { story: 's3_cap5', scene: 'levelP3_5', prep: 'equipo' }
    },
    after: {
      1: { story: 's3_tras1' }, 2: { story: 's3_tras2' }, 3: { story: 's3_tras3' }, 4: { story: 's3_tras4' },
      5: { story: 's3_final', next: 'creditsP3' }
    }
  };
  var DEFAULT_NAMES = { 1: 'Entrenamiento en el cielo', 2: 'Túneles bajo tierra', 3: 'Río subterráneo y vuelo',
    4: 'La fábrica oscura', 5: 'Robovill' };
  var HEROES_DEF = ['director', 'falcon', 'mikey', 'peter'];
  var HERO_INFO_DEF = {
    director: { nombre: 'Director America', corto: 'el Director', color: '#60a5fa', habilidad: 'Hackea consolas · guantes y pulso' },
    falcon:   { nombre: 'Lord Falcon', corto: 'Falcon', color: '#4ade80', habilidad: 'Doble salto · espada y arco' },
    mikey:    { nombre: 'Mikey Stark', corto: 'Mikey', color: '#f97316', habilidad: '3 lanzadores de energía' },
    peter:    { nombre: 'Peter Rogers', corto: 'Peter', color: '#facc15', habilidad: 'Escudo: bloquea y se lanza' }
  };
  var LOOK_INFO_DEF = {
    mikey:    { titulo: 'Mikey Stark',    A: 'El científico', B: 'El hacker del taller' },
    peter:    { titulo: 'Peter Rogers',   A: 'El guardián de la rueda', B: 'El caballero tortuga' },
    robovill: { titulo: 'Robovill',       A: 'Taladro-casco', B: 'Peonza-taladro' },
    moto:     { titulo: 'Robot-moto',     A: 'Rayo', B: 'Bestia' },
    sub:      { titulo: 'Submarino-nave', A: 'Cápsula-escudo', B: 'Delfín-cohete' }
  };
  // Alto del arte a escala 1 (contrato §2.5 / §16.4), por si datos-arte3.js faltara.
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };
  var COLOR_RESPALDO = {
    director: { base: '#60a5fa', claro: '#93c5fd', oscuro: '#1e3a8a' },
    falcon: { base: '#4ade80', claro: '#86efac', oscuro: '#15803d' },
    mikey: { base: '#f97316', claro: '#fdba74', oscuro: '#c2410c' },
    peter: { base: '#facc15', claro: '#fde047', oscuro: '#a16207' }
  };

  function p3() {
    if (!G.p3) {
      G.p3 = { unlocked: 1, chosen: false, p2done: false, secret: false,
        look: { mikey: 'A', peter: 'A', robovill: 'A', moto: 'A', sub: 'A' },
        hero: 'director', hero2: 'falcon', pendingChapter: 1,
        run: { lastHero1: null, lastHero2: null, pilotoFusion: null }, debugInvulnerable: false };
    }
    return G.p3;
  }
  function p3save() { try { if (typeof G.p3save === 'function') G.p3save(); } catch (e) {} }
  function flow3() { return (G.flow3 && G.flow3.chapters) ? G.flow3 : DEFAULT_FLOW3; }
  function chapterName(n) {
    var names = G.p3chapterNames || DEFAULT_NAMES;
    return names[n] || DEFAULT_NAMES[n] || '';
  }
  function heroes() { return (G.p3 && Array.isArray(G.p3.HEROES) && G.p3.HEROES.length === 4) ? G.p3.HEROES : HEROES_DEF; }
  // Orden para las fiestas: Mikey (que celebra disparando fuegos de energía) va el último.
  function ordenFiesta() {
    var HS = heroes(), out = [];
    for (var i = 0; i < HS.length; i++) if (HS[i] !== 'mikey') out.push(HS[i]);
    if (HS.indexOf('mikey') >= 0) out.push('mikey');
    return out;
  }
  function heroInfo(h) {
    var I = (G.p3 && G.p3.HERO_INFO) || HERO_INFO_DEF;
    return I[h] || HERO_INFO_DEF[h] || HERO_INFO_DEF.director;
  }
  function lookInfo(k) {
    var I = (G.p3 && G.p3.LOOK_INFO) || G.P3LOOK_INFO || LOOK_INFO_DEF;
    return I[k] || LOOK_INFO_DEF[k];
  }
  function lk(k) { var l = (G.p3 && G.p3.look) || {}; return l[k] === 'B' ? 'B' : 'A'; }
  function lookObj() { return (G.p3 && G.p3.look) || { mikey: 'A', peter: 'A', robovill: 'A', moto: 'A', sub: 'A' }; }
  function altoArte(n) {
    var A = window.P2 && window.P2.P3ALTO;
    return (A && A[n]) || ALTO_POR_DEFECTO[n] || 100;
  }
  function heroColor(h, tono) {
    try {
      if (G.p3 && typeof G.p3.heroColor === 'function') return G.p3.heroColor(h, tono);
    } catch (e) {}
    var c = COLOR_RESPALDO[h];
    return c ? (c[tono] || c.base) : '#e5e7eb';
  }
  function conTeclas(txt, j) {
    try { if (typeof G.p3conTeclas === 'function') return G.p3conTeclas(txt, j); } catch (e) {}
    return String(txt).replace(/\{[a-z]+\}/g, '?');
  }
  function vehP2(k) { var v = G.p2 && G.p2.vehicle; return (v && v[k] === 'B') ? 'B' : 'A'; }

  // ==========================================================================
  // DIBUJOS DE PERSONAJES (siempre con la cadena de respaldo del contrato §16.3)
  // ==========================================================================

  // Cápsula redondeada con dos ojos (último respaldo de Mikey / Peter).
  function capsula(ctx, x, y, sc, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    roundRect(ctx, -11, -58, 22, 58, 11);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-4, -44, 3.2, 0, Math.PI * 2); ctx.arc(5, -44, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = OUTLINE;
    ctx.beginPath(); ctx.arc(-3.4, -44, 1.6, 0, Math.PI * 2); ctx.arc(5.6, -44, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Un héroe de la Parte 3 (x, y = PIES). o = {scale, facing, pose, t, arma}
  // scale 1 ≈ 68 px de alto (como drawDirector).
  function drawHero(ctx, h, x, y, o) {
    o = o || {};
    var sc = (typeof o.scale === 'number') ? o.scale : 1;
    var f = o.facing === -1 ? -1 : 1;
    var pose = o.pose || 'idle';
    var t = (typeof o.t === 'number') ? o.t : now();
    var opts = { scale: sc, facing: f, pose: pose, t: t };
    if (h === 'mikey') { opts.variant = lk('mikey'); opts.arma = o.arma || 'pistola'; }
    if (h === 'peter') { opts.variant = lk('peter'); opts.escudo = o.escudo || 'mano'; }
    if (p2call('heroeP3', ctx, h, x, y, opts)) return;
    if (h === 'falcon') { gfxCall('drawFalcon', ctx, x, y, { t: t, facing: f, pose: pose, scale: sc }); return; }
    if (h === 'mikey') {
      if (p2call('mikeyJuego', ctx, x, y, opts)) return;
      if (p2call('mikey', ctx, x, y, { variant: lk('mikey'), scale: sc * 68 / altoArte('mikey'), facing: f,
        pose: (pose === 'disparo' ? 'disparo' : 'idle'), arma: opts.arma })) return;
      capsula(ctx, x, y, sc, heroColor('mikey'));
      return;
    }
    if (h === 'peter') {
      if (p2call('peterJuego', ctx, x, y, opts)) return;
      if (p2call('peter', ctx, x, y, { variant: lk('peter'), scale: sc * 68 / altoArte('peter'), facing: f,
        pose: (pose === 'bloquear' ? 'bloquear' : (pose === 'lanzar' ? 'lanzar' : 'idle')) })) return;
      capsula(ctx, x, y, sc, heroColor('peter'));
      return;
    }
    gfxCall('drawDirector', ctx, x, y, { t: t, facing: f, pose: pose, scale: sc });
  }

  // Cara redonda de un héroe (centro).
  function drawFace(ctx, h, x, y, size, apagado) {
    if (p2call('caraHeroe', ctx, x, y, { quien: h, size: size, apagado: !!apagado })) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = apagado ? '#6b7280' : heroColor(h); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    plainText(ctx, (heroInfo(h).nombre || '?').charAt(0), x, y + 1, size * 0.52, '#ffffff');
    ctx.restore();
  }

  // Dark Secuaz SIEMPRE bueno en la Parte 3 (x, y = pies).
  function drawSecuaz(ctx, x, y, sc, angle) {
    if (p2call('secuaz', ctx, x, y, { scale: sc, good: true, angle: angle || 0 })) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y - 95 * sc, 60 * sc, 0, Math.PI * 2);
    ctx.fillStyle = '#16a34a'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - 100 * sc, 18 * sc, 0, Math.PI * 2);
    ctx.fillStyle = '#bbf7d0'; ctx.fill();
    ctx.restore();
  }

  // Robovill con el diseño elegido (x, y = pies; en la B, la punta del taladro).
  function drawRobovill(ctx, x, y, o) {
    o = o || {};
    var opts = { variant: lk('robovill'), scale: o.scale || 1, facing: o.facing === -1 ? -1 : 1,
      brazo: o.brazo || 'martillo', alas: o.alas || 'abiertas', taladro: o.taladro || 0, t: now() };
    if (p2call('robovill', ctx, x, y, opts)) return;
    var s = opts.scale;
    ctx.save();
    ctx.translate(x, y);
    roundRect(ctx, -70 * s, -260 * s, 140 * s, 250 * s, 30 * s);
    ctx.fillStyle = '#4b5563'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -200 * s, 18 * s, 0, Math.PI * 2); ctx.fillStyle = '#ef4444'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -110 * s, 20 * s, 0, Math.PI * 2); ctx.fillStyle = '#e11d48'; ctx.fill();
    ctx.restore();
  }

  // Juanjo SALUDANDO: el muñequito de la Parte 1 con el brazo derecho levantado.
  // Se recorta su brazo colgando y se dibuja uno levantado que se mueve (sin
  // cambiar nada más de su dibujo).
  function drawJuanjoSaludando(ctx, x, y, s, t) {
    if (!(G.gfx && typeof G.gfx.drawJuanjo === 'function')) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 120 * s, y - 140 * s, 240 * s, 170 * s);
    ctx.rect(x + 19.4 * s, y - 52.5 * s, 13 * s, 29 * s);
    try { ctx.clip('evenodd'); } catch (e) { /* sin recorte: se ven los dos brazos */ }
    gfxCall('drawJuanjo', ctx, x, y, { t: t, scale: s });
    ctx.restore();
    // Brazo levantado (mismos colores que su sudadera) que se balancea.
    var ang = Math.PI + 0.55 + 0.32 * Math.sin(t * 7.5);
    ctx.save();
    ctx.translate(x + 23 * s, y - 46 * s);
    ctx.scale(s, s);
    ctx.rotate(ang);
    ctx.lineJoin = 'round';
    roundRect(ctx, -5, -4, 10, 25, 5);
    ctx.fillStyle = '#20305a'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 23, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f4c9a0'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    // Rayitas de "¡hola!" junto a la mano
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 23, 10, -0.3, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 23, 14, -0.2, 0.5); ctx.stroke();
    ctx.restore();
  }

  // Confeti de colores (decorativo, determinista).
  function confeti(ctx, t, n, alpha) {
    ctx.save();
    var cols = ['#ef4444', '#3b82f6', '#22c55e', '#fbbf24', '#a855f7', '#ec4899', '#f97316'];
    for (var i = 0; i < n; i++) {
      var fx = (i * 97.3 + Math.sin(t + i) * 20) % W;
      var fy = ((t * (40 + (i % 5) * 12) + i * 53) % (H + 40)) - 20;
      ctx.save();
      ctx.globalAlpha = alpha || 1;
      ctx.translate(fx, fy);
      ctx.rotate(t * 3 + i);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    }
    ctx.restore();
  }

  // Cielo de la base del equipo (respaldo propio si falta el fondo del arte).
  function drawTeamBackdrop(ctx, t, oscuro) {
    if (!p2call('bgBaseCielo', ctx, t * 18, t)) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1e3a8a');
      g.addColorStop(0.55, '#3b82f6');
      g.addColorStop(1, '#a5f3fc');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (var c = 0; c < 6; c++) {
        var cx = ((c * 210 + t * 10) % (W + 220)) - 110, cy = 90 + (c % 3) * 120;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.arc(cx + 26, cy - 10, 28, 0, Math.PI * 2); ctx.arc(cx + 56, cy, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,30,' + (typeof oscuro === 'number' ? oscuro : 0.45) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Panel redondeado oscuro.
  function panel(ctx, x, y, w, h, borde, alpha) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, x + 4, y + 5, w, h, 18); ctx.fill();
    ctx.fillStyle = 'rgba(15,12,38,' + (typeof alpha === 'number' ? alpha : 0.86) + ')';
    ctx.strokeStyle = borde || GOLD;
    ctx.lineWidth = 4;
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Insignia redonda "J1" (dorada) o "J2" (verde).
  function badge(ctx, x, y, j) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.fillStyle = j === 2 ? '#22c55e' : GOLD; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
    plainText(ctx, 'J' + j, x, y + 1, 15, '#1a1a2e');
    ctx.restore();
  }

  // ==========================================================================
  // G.p3launch(n) — lanza el capítulo n de la Parte 3 (contrato §8.2)
  // ==========================================================================
  G.p3launch = function (n) {
    try {
      n = clamp(Math.floor(Number(n)) || 1, 1, 5);
      var P = p3();
      P.pendingChapter = n;
      if (typeof G.p3resetRun === 'function') G.p3resetRun();
      else P.run = { lastHero1: null, lastHero2: null, pilotoFusion: null };
      var ch = flow3().chapters[n] || {};
      if (ch.story && G.storyData && G.storyData[ch.story]) {
        G.go('story', { id: ch.story, next: 'p3prep' });
      } else {
        G.go('p3prep');
      }
    } catch (e) {
      try { console.warn('[ui3] p3launch ' + (e && e.message)); } catch (e2) {}
    }
  };

  G.scenes = G.scenes || {};

  // ==========================================================================
  // ESCENA: p3prep — "¿Con quién empiezas?" (cap. 1, 4, 5) o los vehículos (2, 3)
  // ==========================================================================
  (function () {
    var chapter = 1;
    var mode = 'equipo';      // 'equipo' | 'moto' | 'submarino'
    var step = 'p1';          // 'p1' | 'p2' | 'ready' | 'veh'
    var scene = 'levelP3_1';
    var cur1 = 0, cur2 = 1;   // índices en HEROES
    var pilotRow = false;     // ¿se elige quién pilota el robot gigante? (solo co-op, cap. 2, 3 y 5)
    var piloto = 1;
    var stepEl = 0, el = 0;
    var pickT = -99;          // instante del último "¡elegido!" (para el destello)

    function goStep(s) { step = s; stepEl = 0; pickT = now(); }
    function idxOf(h) { var i = heroes().indexOf(h); return i < 0 ? 0 : i; }

    function enter(params) {
      params = params || {};
      var P = p3();
      var n = parseInt(params.chapter, 10);
      if (!(n >= 1 && n <= 5)) n = parseInt(P.pendingChapter, 10) || 1;
      chapter = clamp(n, 1, 5);
      P.pendingChapter = chapter;
      var ch = flow3().chapters[chapter] || DEFAULT_FLOW3.chapters[chapter] || {};
      scene = ch.scene || ('levelP3_' + chapter);
      mode = (ch.prep === 'moto' || ch.prep === 'submarino') ? ch.prep : 'equipo';
      var HS = heroes();
      cur1 = idxOf(HS.indexOf(P.hero) >= 0 ? P.hero : 'director');
      cur2 = idxOf(HS.indexOf(P.hero2) >= 0 ? P.hero2 : 'falcon');
      if (cur2 === cur1) cur2 = (cur1 + 1) % 4;
      pilotRow = isCoop() && (chapter === 2 || chapter === 3 || chapter === 5);
      piloto = 1;
      try { if (typeof G.p3pilotoFusion === 'function') piloto = G.p3pilotoFusion(chapter) === 2 ? 2 : 1; } catch (e) { piloto = 1; }
      step = (mode === 'equipo') ? 'p1' : 'veh';
      stepEl = 0; el = 0; pickT = -99;
      music('title');
    }

    function commitAndGo() {
      var P = p3();
      var HS = heroes();
      if (mode === 'equipo') {
        P.hero = HS[cur1];
        if (isCoop()) P.hero2 = HS[cur2];
        if (!P.run || typeof P.run !== 'object') P.run = { lastHero1: null, lastHero2: null, pilotoFusion: null };
        P.run.lastHero1 = P.hero;
        P.run.lastHero2 = isCoop() ? P.hero2 : null;
      }
      if (!P.run || typeof P.run !== 'object') P.run = { lastHero1: null, lastHero2: null, pilotoFusion: null };
      P.run.pilotoFusion = pilotRow ? piloto : null;
      p3save();
      sfx('select');
      if (G.scenes && G.scenes[scene]) {
        G.go(scene, { nuevo: true });
      } else {
        try { console.warn('[ui3] La escena "' + scene + '" aún no existe.'); } catch (e) {}
        G.go('title');
      }
    }

    function anyMove(inp) {
      return pressedOf(inp, 'up') || pressedOf(inp, 'down') || pressedOf(inp, 'left') || pressedOf(inp, 'right');
    }

    // Cada fotograma procesa COMO MUCHO un paso de la selección (contrato §8.6).
    function update(dt) {
      dt = stepDt(dt);
      el += dt; stepEl += dt;
      var coop = isCoop();
      var i1 = G.input, i2 = G.input2;
      if (step === 'p1') {
        var prev = pressedOf(i1, 'up') || pressedOf(i1, 'left');
        var next = pressedOf(i1, 'down') || pressedOf(i1, 'right');
        if (prev || next) { cur1 = (cur1 + (next ? 1 : 3)) % 4; sfx('select'); return; }
        if (menuPressed('pause')) { sfx('select'); G.go('title'); return; }   // volver a la portada
        if (pressedOf(i1, 'confirm') || pressedOf(i1, 'attack')) {
          sfx('select');
          if (coop) {
            if (cur2 === cur1) cur2 = (cur1 + 1) % 4;
            goStep('p2');
          } else {
            goStep('ready');
          }
          return;
        }
      } else if (step === 'p2') {
        var prev2 = pressedOf(i2, 'up') || pressedOf(i2, 'left');
        var next2 = pressedOf(i2, 'down') || pressedOf(i2, 'right');
        if (prev2 || next2) {
          var d = next2 ? 1 : 3;
          cur2 = (cur2 + d) % 4;
          if (cur2 === cur1) cur2 = (cur2 + d) % 4;   // el del Jugador 1 está ocupado
          sfx('select');
          return;
        }
        if (menuPressed('pause')) { sfx('select'); goStep('p1'); return; }
        if (pressedOf(i2, 'confirm') || pressedOf(i2, 'attack')) { sfx('select'); goStep('ready'); return; }
      } else if (step === 'ready' || step === 'veh') {
        if (pilotRow && (anyMove(i1) || anyMove(i2))) { piloto = 3 - piloto; sfx('select'); return; }
        if (step === 'ready' && menuPressed('pause')) { sfx('select'); goStep(coop ? 'p2' : 'p1'); return; }
        if (step === 'veh' && menuPressed('pause')) { sfx('select'); G.go('title'); return; }
        if (menuPressed('confirm') || pressedOf(i1, 'attack') || pressedOf(i2, 'attack')) { commitAndGo(); return; }
      }
    }

    // ------------------------------------------------------------------ render
    function drawCards(ctx, t) {
      var HS = heroes();
      // Táctil: las tarjetas dejan libres los botones OK (abajo a la izquierda) y ▲ ▼ (a la derecha).
      var T = tactil();
      var cw = T ? 150 : 210, ch = T ? 266 : 318, gap = T ? 10 : 16;
      var x0 = (W - (cw * 4 + gap * 3)) / 2;
      var y0 = 106;
      var hsc = T ? 1.75 : 2.2, hy = T ? 186 : 236;
      for (var i = 0; i < 4; i++) {
        var h = HS[i];
        var sel1 = (i === cur1), sel2 = (step === 'p2' && i === cur2);
        var focus = (step === 'p1' && sel1) || sel2;
        var ocupado = (step === 'p2' && sel1);
        var lift = focus ? -8 + Math.sin(t * 4) * 2 : 0;
        var x = x0 + i * (cw + gap), y = y0 + lift;
        var col = heroColor(h);
        ctx.save();
        if (focus) {
          ctx.shadowColor = col; ctx.shadowBlur = 24;
        }
        var g = ctx.createLinearGradient(0, y, 0, y + ch);
        g.addColorStop(0, ocupado ? 'rgba(40,40,60,0.95)' : 'rgba(30,27,75,0.95)');
        g.addColorStop(1, 'rgba(12,10,30,0.95)');
        ctx.fillStyle = g;
        ctx.strokeStyle = focus ? col : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = focus ? 5 : 2;
        roundRect(ctx, x, y, cw, ch, 18);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        // Franja de color arriba
        ctx.save();
        roundRect(ctx, x, y, cw, ch, 18); ctx.clip();
        ctx.globalAlpha = ocupado ? 0.35 : (focus ? 0.9 : 0.55);
        ctx.fillStyle = col;
        ctx.fillRect(x, y, cw, 10);
        // halo detrás del héroe
        var rg = ctx.createRadialGradient(x + cw / 2, y + 160, 10, x + cw / 2, y + 160, 120);
        rg.addColorStop(0, focus ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.10)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = rg;
        ctx.fillRect(x, y, cw, ch);
        ctx.restore();
        // Héroe
        ctx.save();
        if (ocupado) ctx.globalAlpha = 0.45;
        var bob = focus ? Math.sin(t * 5) * 3 : 0;
        drawHero(ctx, h, x + cw / 2, y + hy + bob, { scale: hsc, facing: 1, pose: focus ? 'win' : 'idle', t: t + i });
        ctx.restore();
        // Nombre y habilidad
        var info = heroInfo(h);
        var nsz = 21;
        if (T) {
          ctx.save(); ctx.font = 'bold 21px ' + FONT;
          var nw = ctx.measureText(info.nombre).width;
          ctx.restore();
          if (nw > cw - 14) nsz = Math.max(15, Math.floor(21 * (cw - 14) / nw));
        }
        outlinedText(ctx, info.nombre, x + cw / 2, y + hy + 26, nsz, heroColor(h, 'claro'), OUTLINE, 4, 'center');
        var hsz = T ? 14 : 15;
        var hl = wrapText(ctx, info.habilidad || '', cw - (T ? 14 : 24), hsz, '600');
        for (var k = 0; k < hl.length && k < (T ? 3 : 2); k++) {
          plainText(ctx, hl[k], x + cw / 2, y + hy + 50 + k * (hsz + 3), hsz, CREAM, 'center', '600');
        }
        // Insignias de jugador
        if (step === 'p1' && sel1) badge(ctx, x + 24, y + 30, 1);
        if (step === 'p2') {
          if (sel1) { badge(ctx, x + 24, y + 30, 1); outlinedText(ctx, '¡Lo lleva el J1!', x + cw / 2, y + 60, 16, '#fde68a', OUTLINE, 3, 'center'); }
          if (sel2) badge(ctx, x + cw - 24, y + 30, 2);
        }
      }
    }

    function drawReady(ctx, t) {
      var HS = heroes();
      var coop = isCoop();
      var pop = easeOut(stepEl * 3);
      ctx.save();
      ctx.translate(W / 2, 64);
      ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
      outlinedText(ctx, '¡Listos!', 0, 0, 60, GOLD, OUTLINE, 9, 'center');
      ctx.restore();
      outlinedText(ctx, 'Capítulo ' + chapter + ' · ' + chapterName(chapter), W / 2, 112, 22, '#a5f3fc', OUTLINE, 4, 'center');
      var h1 = HS[cur1], h2 = HS[cur2];
      var spots = coop ? [[W / 2 - 150, h1, 1], [W / 2 + 150, h2, 2]] : [[W / 2, h1, 1]];
      for (var s = 0; s < spots.length; s++) {
        var sx = spots[s][0], hh = spots[s][1], j = spots[s][2];
        var rg = ctx.createRadialGradient(sx, 260, 10, sx, 260, 130);
        rg.addColorStop(0, 'rgba(255,255,255,0.30)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(sx - 140, 120, 280, 260);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(sx, 336, 70, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Mikey celebra con su lanzador (pose 'win'): en co-op mira hacia fuera, nunca al compañero.
        var fac = (coop && hh === 'mikey') ? (s === 1 ? 1 : -1) : (s === 1 ? -1 : 1);
        // Mikey y Peter (pelo de punta, tupé) son más altos que su "68 px": la escala sale de
        // su alto de arte para que la cabeza quede por debajo del subtítulo (y ≈ 130).
        var hsc = (hh === 'mikey' || hh === 'peter') ? Math.min(2.8, 175 / altoArte(hh)) : 2.8;
        drawHero(ctx, hh, sx, 334 + Math.sin(t * 4 + s) * 3, { scale: hsc, facing: fac, pose: 'win', t: t + s });
        badge(ctx, sx - 90, 170, j);
        outlinedText(ctx, (coop ? 'Jugador ' + j + ': ' : '') + heroInfo(hh).nombre, sx, 362, 22, heroColor(hh, 'claro'), OUTLINE, 4, 'center');
      }
      // Los compañeros IA
      var others = [];
      for (var i = 0; i < 4; i++) { if (i !== cur1 && !(coop && i === cur2)) others.push(HS[i]); }
      plainText(ctx, 'Te ayudan:', W / 2 - 40 - others.length * 26, 404, 17, CREAM, 'right');
      for (var o = 0; o < others.length; o++) {
        drawFace(ctx, others[o], W / 2 - 14 - (others.length - 1) * 26 + o * 52, 404, 40, false);
      }
      plainText(ctx, conTeclas('Cambia de héroe cuando quieras con {cambio}', coop ? 0 : 1), W / 2 + 40 + (others.length) * 10, 404, 17, '#fde68a', 'left');
    }

    function drawPilotRow(ctx, y, t) {
      var w = 560, x = (W - w) / 2, h = 46;
      ctx.save();
      ctx.fillStyle = 'rgba(15,12,38,0.92)';
      ctx.strokeStyle = GOLD; ctx.lineWidth = 4;
      var pulse = 1 + Math.sin(t * 6) * 0.015;
      ctx.translate(W / 2, y); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -y);
      roundRect(ctx, x, y - h / 2, w, h, 14);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x + 32, y - 9); ctx.lineTo(x + 32, y + 9); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w - 20, y); ctx.lineTo(x + w - 32, y - 9); ctx.lineTo(x + w - 32, y + 9); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.font = 'bold 20px ' + FONT;
      ctx.textBaseline = 'middle';
      var a = 'Robot gigante: lo pilota el ';
      var b = 'Jugador ' + piloto;
      var wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
      var sx = W / 2 - (wa + wb) / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = CREAM; ctx.fillText(a, sx, y);
      ctx.fillStyle = piloto === 2 ? '#4ade80' : GOLD; ctx.fillText(b, sx + wa, y);
      ctx.restore();
      // Qué significa y cómo se cambia (QA: dos niños no sabían que podían elegir).
      var expl = (tactil() ? '◀ ▶' : '← → (o A / D)') + ' para cambiar · el otro jugador dispara las piezas del robot';
      if (chapter === 2 || chapter === 3) expl += ' (al final, en la pelea gigante)';
      plainText(ctx, expl, W / 2, y + h / 2 + 15, 15, '#fde68a', 'center', '600');
    }

    // Líneas de controles de un panel (j = 0: sin teclas). En táctil, más pequeñas y partidas.
    function lineasPanel(ctx, ls, j, cx, y0, pw, T) {
      var y = y0;
      for (var a = 0; a < ls.length; a++) {
        var txt = j ? conTeclas(ls[a], j) : ls[a];
        if (!T) { plainText(ctx, txt, cx, y, 16, CREAM, 'center', '600'); y += 22; continue; }
        var wl = wrapText(ctx, txt, pw - 22, 14, '600');
        for (var q = 0; q < wl.length; q++) { plainText(ctx, wl[q], cx, y, 14, CREAM, 'center', '600'); y += 18; }
      }
    }

    function drawVehicles(ctx, t) {
      var coop = isCoop();
      var moto = (mode === 'moto');
      outlinedText(ctx, chapterName(chapter), W / 2, 40, 38, GOLD, OUTLINE, 7, 'center');
      // La frase del contrato (§8.6), partida a mano en dos renglones bonitos.
      var fl = moto
        ? ['Túneles: Mikey en su robot-moto (Jugador 1)', 'y el Director en su robot transformable (Jugador 2 o IA)']
        : ['Río: Peter en su submarino-nave (Jugador 1)', 'y Lord Falcon en el mecha-halcón (Jugador 2 o IA)'];
      for (var i = 0; i < fl.length; i++) plainText(ctx, fl[i], W / 2, 78 + i * 22, 18, CREAM, 'center', '600');
      // Táctil: paneles más estrechos (x 184…796) para dejar libres OK y ▲ ▼; los dibujos, al 75 %.
      var T = tactil();
      var vs = T ? 0.75 : 1;
      var py = 126, ph = pilotRow ? 290 : 318, pw = T ? 300 : 420;
      var lx = T ? 184 : 40, rx = T ? 496 : W - 40 - pw;
      panel(ctx, lx, py, pw, ph, moto ? heroColor('mikey') : heroColor('peter'));
      panel(ctx, rx, py, pw, ph, moto ? heroColor('director') : heroColor('falcon'));
      var bob = Math.sin(t * 3) * 3;
      // Vehículo del Jugador 1
      ctx.save();
      roundRect(ctx, lx, py, pw, ph, 18); ctx.clip();
      if (moto) {
        var mScale = 1.45 * vs;
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(lx + pw / 2, py + 176, 120 * vs, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        if (!p2call('robotMoto', ctx, lx + pw / 2, py + 174 + bob * 0.3, { variant: lk('moto'), modo: 'moto', scale: mScale, facing: 1, boost: (t % 2) < 1, look: lookObj() })) {
          capsula(ctx, lx + pw / 2, py + 174, 1.6, heroColor('mikey'));
        }
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(14,116,144,0.55)';
        ctx.fillRect(lx, py + 40, pw, 170);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (var bb = 0; bb < 10; bb++) {
          var bx = lx + 20 + (bb * 47) % (pw - 40), byy = py + 200 - ((t * 30 + bb * 37) % 150);
          ctx.beginPath(); ctx.arc(bx, byy, 2 + bb % 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        if (!p2call('submarinoNave', ctx, lx + pw / 2 - 20 * vs, py + 120 + bob, { variant: lk('sub'), modo: 'submarino', scale: 1.15 * vs, facing: 1, estela: true, look: lookObj() })) {
          capsula(ctx, lx + pw / 2, py + 160, 1.6, heroColor('peter'));
        }
      }
      ctx.restore();
      // Vehículo del Jugador 2 / IA
      ctx.save();
      roundRect(ctx, rx, py, pw, ph, 18); ctx.clip();
      if (moto) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(rx + pw / 2, py + 176, 120 * vs, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        if (!p2call('transformableCoche', ctx, rx + pw / 2, py + 174, { variant: vehP2('transformable'), scale: 1.6 * vs, facing: 1, boost: (t % 2) < 1 })) {
          gfxCall('drawDirector', ctx, rx + pw / 2, py + 174, { t: t, facing: 1, pose: 'idle', scale: 1.6 });
        }
      } else {
        if (!p2call('mechaHalcon', ctx, rx + pw / 2, py + 110 + bob, { variant: vehP2('mechahalcon'), modo: 'vuelo', scale: 0.82 * vs, facing: 1 })) {
          gfxCall('drawFalcon', ctx, rx + pw / 2, py + 170, { t: t, facing: 1, pose: 'idle', scale: 1.6 });
        }
      }
      ctx.restore();
      // Textos y controles
      var ty = py + 206;
      var j1 = moto ? 'Jugador 1 · Mikey Stark' : 'Jugador 1 · Peter Rogers';
      outlinedText(ctx, j1, lx + pw / 2, ty, T ? 18 : 21, moto ? heroColor('mikey', 'claro') : heroColor('peter', 'claro'), OUTLINE, 4, 'center');
      var c1 = moto
        ? ['{ataque} disparar el lanzador · {disparo} cambiar de lanzador', '{salto} saltar', 'Izquierda / derecha: frenar o acelerar']
        : ['Muévete en todas direcciones: ¡nada y vuela!', 'Mantén {ataque}: escudo de la proa', 'Pulsa {disparo}: escudo-torpedo (¡rebota y vuelve!)'];
      lineasPanel(ctx, c1, 1, lx + pw / 2, ty + 28, pw, T);
      var j2 = (coop ? 'Jugador 2 · ' : 'Te acompaña · ') + (moto ? 'Director America' : 'Lord Falcon');
      outlinedText(ctx, j2, rx + pw / 2, ty, T ? 18 : 21, moto ? heroColor('director', 'claro') : heroColor('falcon', 'claro'), OUTLINE, 4, 'center');
      var c2;
      if (coop) {
        c2 = moto
          ? ['{ataque} ¡TURBO! (rompe barricadas)', '{disparo} cañón cian', '{salto} saltar']
          : ['Mantén {disparo}: plumas', 'Pulsa {ataque}: embestida', 'Vuela por encima del agua'];
        lineasPanel(ctx, c2, 2, rx + pw / 2, ty + 28, pw, T);
      } else {
        c2 = moto
          ? ['Conduce él solito a tu lado', 'y dispara a lo que tengas delante.', '¡No se cae nunca!']
          : ['Vuela él solito por encima del agua', 'y dispara plumas a los drones.', '¡Tú cuida del río!'];
        lineasPanel(ctx, c2, 0, rx + pw / 2, ty + 28, pw, T);
      }
    }

    function render(ctx) {
      var t = now();
      if (mode === 'moto') {
        if (!p2call('bgTuneles', ctx, t * 40, t)) drawMenuBackdrop(ctx, t);
        ctx.save(); ctx.fillStyle = 'rgba(8,6,20,0.5)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      } else if (mode === 'submarino') {
        if (!p2call('bgRio', ctx, t * 40, t, { nivelAgua: 300 })) drawMenuBackdrop(ctx, t);
        ctx.save(); ctx.fillStyle = 'rgba(8,6,20,0.5)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      } else {
        drawTeamBackdrop(ctx, t, 0.5);
      }
      var coop = isCoop();
      if (step === 'p1' || step === 'p2') {
        var titulo = (step === 'p2') ? 'Jugador 2: ¿con quién empiezas?' : (coop ? 'Jugador 1: ¿con quién empiezas?' : '¿Con quién empiezas?');
        outlinedText(ctx, titulo, W / 2, 42, 38, step === 'p2' ? '#86efac' : GOLD, OUTLINE, 7, 'center');
        outlinedText(ctx, 'Capítulo ' + chapter + ' · ' + chapterName(chapter), W / 2, 82, 20, '#a5f3fc', OUTLINE, 4, 'center');
        drawCards(ctx, t);
        plainText(ctx, conTeclas('En el juego cambias de héroe con {cambio}: ¡como en los juegos de LEGO!', coop ? 0 : 1),
          W / 2, tactil() ? 408 : 452, tactil() ? 16 : 18, '#fde68a');
        var ayuda;
        if (tactil() && !coop) {
          ayuda = 'Toca arriba / abajo para elegir · toca el centro para aceptar';
        } else if (step === 'p2') {
          ayuda = conTeclas('Jugador 2: flechas para elegir · {ataque}', 2) + ' o ' + okName() + ' para aceptar · Escape: atrás';
        } else if (coop) {
          // En co-op las flechas son del Jugador 2: el Jugador 1 elige con W / A / S / D.
          ayuda = 'Jugador 1: W / S (o A / D) para elegir · ' + conTeclas('{ataque}', 1) + ' o ' + okName() + ' para aceptar · Escape: volver';
        } else {
          ayuda = 'Flechas para elegir · ' + okName() + ' para aceptar · Escape: volver';
        }
        plainText(ctx, ayuda, W / 2, H - 22, 16, 'rgba(255,255,255,0.8)');
      } else if (step === 'ready') {
        drawReady(ctx, t);
        if (pilotRow) drawPilotRow(ctx, 446, t);
        franjaAbajo(ctx, H - 26);
        blinkText(ctx, 'Pulsa ' + okName() + ' para empezar', H - 26, 22, '#fde68a');
        if (!tactil()) plainText(ctx, 'Escape: atrás', W - 24, H - 26, 15, 'rgba(255,255,255,0.75)', 'right');
      } else {
        drawVehicles(ctx, t);
        if (pilotRow) drawPilotRow(ctx, 446, t);
        franjaAbajo(ctx, H - 26);
        blinkText(ctx, 'Pulsa ' + okName() + ' para empezar', H - 26, 22, '#fde68a');
        if (!tactil()) plainText(ctx, 'Escape: volver', W - 24, H - 26, 15, 'rgba(255,255,255,0.75)', 'right');
      }
      // Destello al elegir
      var fe = t - pickT;
      if (fe >= 0 && fe < 0.25) {
        ctx.save();
        ctx.globalAlpha = (0.25 - fe) * 1.6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    G.scenes.p3prep = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: disenosJuanjo — "¡Juanjo, elige tus diseños favoritos!"
  // ==========================================================================
  (function () {
    var ITEMS = ['mikey', 'peter', 'robovill', 'moto', 'sub', 'volver'];
    // Cómo es cada diseño (las palabras del GDD, para que Juanjo recuerde la diferencia).
    var DESC = {
      mikey: { A: 'Bata blanca, pelo de punta y gafas de inventor', B: 'Sudadera violeta, rizos y cascos con antena' },
      peter: { A: 'Casco y el escudo de Juanjo (rueda verde y negra)', B: 'Tupé, bufanda y el escudo «Caparazón»' },
      robovill: { A: 'El taladro es su casco; alas de plumas de metal', B: 'El taladro es su parte de abajo; alas de murciélago' },
      moto: { A: 'Rueda a la espalda: moto deportiva superrápida', B: 'Fortachón sobre ruedas: moto gorda que brilla' },
      sub: { A: 'La proa es el escudo de Peter', B: 'Su hélice es el escudo de Peter' }
    };
    var sel = 0;
    var el = 0;
    var swapT = -99;          // instante del último cambio A ↔ B (para el "¡pop!")

    function enter(params) {
      sel = 0; el = 0; swapT = -99;
      // Depuración/capturas: &params={"sel":"peter"} abre con esa fila elegida.
      var i0 = (params && typeof params.sel === 'string') ? ITEMS.indexOf(params.sel) : -1;
      if (i0 >= 0) sel = i0;
      music('title');
    }

    // Tamaño de letra (≤ size, ≥ 11) con el que txt cabe en maxW.
    function fitSize(ctx, txt, size, maxW, weight) {
      var s = size;
      ctx.save();
      for (; s > 11; s--) {
        ctx.font = (weight || 'bold') + ' ' + s + 'px ' + FONT;
        var w = ctx.measureText(txt).width;
        if (!(w > maxW)) break;
      }
      ctx.restore();
      return s;
    }

    function toggle(clave) {
      var nuevo = lk(clave) === 'B' ? 'A' : 'B';
      var ok = false;
      try { if (typeof G.p3setLook === 'function') ok = G.p3setLook(clave, nuevo) !== false; } catch (e) { ok = false; }
      if (!ok) { var P = p3(); P.look = P.look || {}; P.look[clave] = nuevo; p3save(); }
      swapT = now();
      sfx('transform');
    }

    function volver() { sfx('select'); G.go('title'); }

    function update(dt) {
      el += stepDt(dt);
      if (menuPressed('pause')) { volver(); return; }
      if (menuPressed('up')) { sel = (sel + ITEMS.length - 1) % ITEMS.length; sfx('select'); return; }
      if (menuPressed('down')) { sel = (sel + 1) % ITEMS.length; sfx('select'); return; }
      var k = ITEMS[sel];
      if (k === 'volver') {
        if (menuPressed('confirm')) volver();
        return;
      }
      if (menuPressed('confirm') || menuPressed('left') || menuPressed('right')) toggle(k);
    }

    // ------------------------------------------------------------------ render
    function drawRow(ctx, i, x, y, w, h, t) {
      var k = ITEMS[i];
      var isSel = (i === sel);
      ctx.save();
      if (isSel) {
        var pulse = 1 + Math.sin(t * 6) * 0.012;
        ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse); ctx.translate(-(x + w / 2), -(y + h / 2));
      }
      ctx.fillStyle = isSel ? 'rgba(251,191,36,0.22)' : 'rgba(15,12,38,0.78)';
      ctx.strokeStyle = isSel ? GOLD : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = isSel ? 4 : 2;
      roundRect(ctx, x, y, w, h, 14);
      ctx.fill(); ctx.stroke();
      if (isSel) {
        ctx.fillStyle = GOLD;
        ctx.beginPath(); ctx.moveTo(x - 16, y + h / 2 - 9); ctx.lineTo(x - 4, y + h / 2); ctx.lineTo(x - 16, y + h / 2 + 9); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      if (k === 'volver') {
        outlinedText(ctx, '← Volver', x + w / 2, y + h / 2, 22, isSel ? GOLD : CREAM, OUTLINE, 4, 'center');
        return;
      }
      var info = lookInfo(k);
      var v = lk(k);
      var comp = h < 56;   // filas bajas (táctil)
      plainText(ctx, info.titulo, x + 18, y + (comp ? 15 : 20), comp ? 18 : 20, isSel ? '#fde68a' : CREAM, 'left');
      plainText(ctx, '«' + info[v] + '»', x + 18, y + (comp ? 33 : 43), comp ? 14 : 16, '#a5f3fc', 'left', '600');
      // Pastillas A · B
      var pills = ['A', 'B'];
      for (var p = 0; p < 2; p++) {
        var on = (pills[p] === v);
        var cx = x + w - 92 + p * 50, cy = y + h / 2;
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, comp ? 16 : 18, 0, Math.PI * 2);
        ctx.fillStyle = on ? GOLD : 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.strokeStyle = on ? OUTLINE : 'rgba(255,255,255,0.35)'; ctx.lineWidth = on ? 3 : 2; ctx.stroke();
        ctx.restore();
        plainText(ctx, pills[p], cx, cy + 1, 20, on ? '#3b1f05' : 'rgba(255,255,255,0.55)');
        if (p === 0) plainText(ctx, '·', x + w - 67, cy, 20, 'rgba(255,255,255,0.5)');
      }
    }

    // El dibujo GRANDE y animado del elemento elegido (en su variante actual).
    function drawBig(ctx, k, cx, floorY, t, zoom) {
      var sp = t - swapT;
      var pop = (sp >= 0 && sp < 0.5) ? 1 + 0.14 * Math.sin(sp / 0.5 * Math.PI) : 1;
      if (typeof zoom === 'number' && zoom > 0) pop *= zoom;
      ctx.save();
      ctx.translate(cx, floorY); ctx.scale(pop, pop); ctx.translate(-cx, -floorY);
      var cyc = t % 2.6;
      if (k === 'mikey') {
        var armas = ['francotirador', 'pistola', 'metralleta'];
        var arma = armas[Math.floor(t / 2.6) % 3];
        var dispara = cyc > 1.7;
        if (!p2call('mikey', ctx, cx, floorY - Math.abs(Math.sin(t * 3)) * 4, { variant: lk('mikey'), scale: 3.3, facing: 1, pose: dispara ? 'disparo' : 'idle', arma: arma })) {
          capsula(ctx, cx, floorY, 3.6, heroColor('mikey'));
        }
        if (dispara) outlinedText(ctx, '¡' + arma.charAt(0).toUpperCase() + arma.slice(1) + '!', cx + 150, floorY - 250, 20, '#93c5fd', OUTLINE, 4, 'center');
      } else if (k === 'peter') {
        var poses = ['idle', 'bloquear', 'lanzar'];
        var pz = poses[Math.floor(t / 1.6) % 3];
        if (!p2call('peter', ctx, cx, floorY - Math.abs(Math.sin(t * 3)) * 4, { variant: lk('peter'), scale: 3.5, facing: 1, pose: pz })) {
          capsula(ctx, cx, floorY, 3.6, heroColor('peter'));
        }
        var lbl = { idle: '', bloquear: '¡Bloqueo!', lanzar: '¡Lo lanzo!' }[pz];
        if (lbl) outlinedText(ctx, lbl, cx + 150, floorY - 240, 20, '#fde68a', OUTLINE, 4, 'center');
      } else if (k === 'robovill') {
        var brazos = ['martillo', 'sierra', 'canon', 'pinza'];
        var B = lk('robovill') === 'B';
        drawRobovill(ctx, cx + (B ? -16 : 30), floorY - 6 + Math.sin(t * 2) * 5, { scale: 0.98, facing: -1 + 2 * 1, brazo: brazos[Math.floor(t / 1.5) % 4], alas: 'abiertas' });
      } else if (k === 'moto') {
        // La moto «Bestia» (B) es más ancha: la escala sale de su caja (P2.P3CAJA) para que
        // la rueda delantera y el cañón quepan en el escaparate (512 px) con 20 px de margen.
        var rs = 1.3, mx = cx + 110;
        try {
          var CJ = window.P2 && window.P2.P3CAJA;
          var cm = CJ && (CJ['robotMotoMoto' + (lk('moto') === 'B' ? 'B' : '')] || CJ.robotMotoMoto);
          if (cm && cm[2] > 0) rs = Math.min(1.3, (256 - 20 - 110) / cm[2]);
        } catch (e) { rs = 1.2; }
        if (!p2call('robotMoto', ctx, cx - 125, floorY - 8 - Math.abs(Math.sin(t * 3)) * 3, { variant: lk('moto'), modo: 'robot', scale: rs, facing: 1, look: lookObj() })) {
          capsula(ctx, cx - 125, floorY, 2.6, heroColor('mikey'));
        }
        if (!p2call('robotMoto', ctx, mx, floorY - 8, { variant: lk('moto'), modo: 'moto', scale: rs, facing: 1, boost: cyc > 1.3, look: lookObj() })) {
          capsula(ctx, mx, floorY, 2, heroColor('mikey'));
        }
        plainText(ctx, 'Modo robot', cx - 125, floorY + 12, 15, CREAM);
        plainText(ctx, 'Modo moto', mx, floorY + 12, 15, CREAM);
      } else if (k === 'sub') {
        // agua arriba, cielo abajo
        ctx.save();
        ctx.fillStyle = 'rgba(14,116,144,0.45)';
        roundRect(ctx, cx - 240, floorY - 274, 480, 126, 16); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (var bb = 0; bb < 10; bb++) {
          var bx = cx - 220 + (bb * 47) % 440, byy = floorY - 160 - ((t * 28 + bb * 31) % 105);
          ctx.beginPath(); ctx.arc(bx, byy, 2 + bb % 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(125,211,252,0.25)';
        roundRect(ctx, cx - 240, floorY - 140, 480, 150, 16); ctx.fill();
        ctx.restore();
        if (!p2call('submarinoNave', ctx, cx - 10, floorY - 212 + Math.sin(t * 2) * 4, { variant: lk('sub'), modo: 'submarino', scale: 1.15, facing: 1, estela: true, look: lookObj() })) {
          capsula(ctx, cx, floorY - 180, 1.6, heroColor('peter'));
        }
        if (!p2call('submarinoNave', ctx, cx - 10, floorY - 70 + Math.sin(t * 2 + 1) * 4, { variant: lk('sub'), modo: 'nave', scale: 1.15, facing: 1, estela: true, look: lookObj() })) {
          capsula(ctx, cx, floorY - 20, 1.6, heroColor('peter'));
        }
        plainText(ctx, 'Bajo el agua', cx + 228, floorY - 260, 15, CREAM, 'right');
        plainText(ctx, '¡Volando!', cx + 228, floorY - 126, 15, CREAM, 'right');
      } else {
        drawJuanjoSaludando(ctx, cx, floorY - 30, 2.6, t);
        outlinedText(ctx, '¡Gracias, Diseñador Jefe!', cx, floorY - 290, 26, JUANJO_COL, OUTLINE, 5, 'center');
      }
      ctx.restore();
      // Estrellitas del "¡pop!" al cambiar
      if (sp >= 0 && sp < 0.7) {
        for (var s = 0; s < 10; s++) {
          var ang = s / 10 * Math.PI * 2;
          var rr = 60 + sp * 260;
          gfxCall('drawSparkle', ctx, cx + Math.cos(ang) * rr, floorY - 150 + Math.sin(ang) * rr * 0.7, clamp(sp / 0.7, 0, 1));
        }
      }
    }

    function render(ctx) {
      var t = now();
      drawTeamBackdrop(ctx, t, 0.55);
      outlinedText(ctx, '¡Juanjo, elige tus diseños favoritos!', W / 2, 38, 34, GOLD, OUTLINE, 6, 'center');
      // Lista
      // Táctil: la lista acaba antes de y = 375 (botón OK abajo a la izquierda) y el escaparate
      // antes de x = 820 (botones ▲ ▼ a la derecha); el dibujo grande se ve al 76 %.
      var T = tactil();
      var lx = 34, lw = 370, ly = 78, rh = T ? 46 : 62, rg = T ? 5 : 8;
      for (var i = 0; i < ITEMS.length; i++) drawRow(ctx, i, lx, ly + i * (rh + rg), lw, rh, t);
      // Escaparate
      var px = 424, py = 72, pw = T ? 390 : 512, ph = 424;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRect(ctx, px + 4, py + 5, pw, ph, 22); ctx.fill();
      var g = ctx.createLinearGradient(0, py, 0, py + ph);
      g.addColorStop(0, 'rgba(30,27,75,0.95)');
      g.addColorStop(1, 'rgba(49,46,129,0.95)');
      ctx.fillStyle = g;
      ctx.strokeStyle = GOLD; ctx.lineWidth = 4;
      roundRect(ctx, px, py, pw, ph, 22);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.save();
      roundRect(ctx, px, py, pw, ph, 22); ctx.clip();
      // foco y suelo
      var rg2 = ctx.createRadialGradient(px + pw / 2, py + 250, 20, px + pw / 2, py + 250, 300);
      rg2.addColorStop(0, 'rgba(253,230,138,0.30)');
      rg2.addColorStop(1, 'rgba(253,230,138,0)');
      ctx.fillStyle = rg2;
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(px + pw / 2, py + ph - 52, 200, 18, 0, 0, Math.PI * 2); ctx.fill();
      var k = ITEMS[sel];
      drawBig(ctx, k, px + pw / 2, py + ph - 54, t, T ? 0.76 : 1);
      ctx.restore();
      // Cartel del diseño
      if (k !== 'volver') {
        var info = lookInfo(k), v = lk(k);
        outlinedText(ctx, info.titulo + ' · Diseño ' + v, px + pw / 2, py + 26, 22, '#fde68a', OUTLINE, 4, 'center');
        outlinedText(ctx, '«' + info[v] + '»', px + pw / 2, py + 54, 20, '#a5f3fc', OUTLINE, 4, 'center');
        if (DESC[k] && DESC[k][v]) {
          outlinedText(ctx, DESC[k][v], px + pw / 2, py + 80, fitSize(ctx, DESC[k][v], 15, pw - 28), CREAM, OUTLINE, 3, 'center');
        }
        // Pie: en una línea si cabe dentro del marco (pw − 28; así no pisa los rótulos «Modo robot /
        // Modo moto»); si no (nombres largos de Peter y de Mikey), en dos líneas:
        // «← → o Enter: probar el diseño B» / «nombre» · se guarda solo (cada una ajustada a pw − 28).
        var otro = (v === 'A' ? 'B' : 'A');
        var pie1 = (T ? '' : '← → o ') + okName() + ': probar el diseño ' + otro;
        var pie2 = (T ? '' : '«' + info[otro] + '» · ') + 'se guarda solo';
        var pieCol = 'rgba(255,255,255,0.85)', pieMax = pw - 28;
        var pie = pie1 + (T ? ' · ' : ' ') + pie2;
        if (fitSize(ctx, pie, 15, pieMax) >= 15) {
          plainText(ctx, pie, px + pw / 2, py + ph - 18, 15, pieCol);
        } else {
          plainText(ctx, pie1, px + pw / 2, py + ph - 34, fitSize(ctx, pie1, 15, pieMax), pieCol);
          plainText(ctx, pie2, px + pw / 2, py + ph - 15, fitSize(ctx, pie2, 15, pieMax), pieCol);
        }
      } else {
        plainText(ctx, 'Tus diseños salen en todo el juego.', px + pw / 2, py + ph - 18, 15, 'rgba(255,255,255,0.85)');
      }
      plainText(ctx, tactil()
        ? 'Toca arriba / abajo para elegir · toca el centro para cambiar A ↔ B · «Volver» para salir'
        : 'Arriba / Abajo para elegir · ← → o ' + okName() + ' cambia A ↔ B · Escape para volver', W / 2, H - 20, 15, 'rgba(255,255,255,0.8)');
    }

    G.scenes.disenosJuanjo = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: levelDoneP3 {chapter} — capítulo completado
  // ==========================================================================
  (function () {
    var chapter = 1;
    var el = 0;

    function enter(params) {
      params = params || {};
      var P = p3();
      var n = parseInt(params.chapter, 10);
      chapter = clamp((n >= 1 && n <= 5) ? n : (parseInt(P.pendingChapter, 10) || 1), 1, 5);
      P.pendingChapter = chapter;
      P.unlocked = Math.min(5, Math.max(parseInt(P.unlocked, 10) || 1, chapter + 1));
      p3save();
      el = 0;
      sfx('victory');
    }

    function goNext() {
      var after = (flow3().after || {})[chapter] || DEFAULT_FLOW3.after[chapter] || {};
      var next = after.next || (chapter >= 5 ? 'creditsP3' : 'p3next');
      if (after.story && G.storyData && G.storyData[after.story]) {
        G.go('story', { id: after.story, next: next });
      } else {
        G.go(next);
      }
    }

    function update(dt) {
      el += stepDt(dt);
      // Empieza por "level": en el móvil, SALTO o ATAQUE también continúan.
      if (el > 0.5 && (menuPressed('confirm') || pressedOf(G.input, 'jump') || pressedOf(G.input, 'attack'))) {
        sfx('select');
        goNext();
      }
    }

    // Fondo del capítulo que se acaba de jugar (QA: antes era siempre la base del cielo).
    function drawChapterBackdrop(ctx, t) {
      var ok = false;
      if (chapter === 2) ok = p2call('bgTuneles', ctx, t * 18, t);
      else if (chapter === 3) ok = p2call('bgRio', ctx, t * 18, t, { nivelAgua: 330 });
      else if (chapter === 4) ok = p2call('bgFabricaOscura', ctx, t * 18, t);
      else if (chapter === 5) ok = p2call('bgArenaRobovill', ctx, t);
      if (!ok) { drawTeamBackdrop(ctx, t, 0.4); return; }
      ctx.save();
      ctx.fillStyle = 'rgba(8,10,30,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Dibujito de lo que espera en el capítulo siguiente (centro en x, y).
    function drawNextIcon(ctx, n, x, pies, t) {
      var b = Math.sin(t * 3) * 2;
      if (n === 2) return p2call('robotMoto', ctx, x, pies + b, { variant: lk('moto'), modo: 'moto', scale: 0.62, facing: 1, look: lookObj(), t: t });
      if (n === 3) return p2call('submarinoNave', ctx, x, pies - 24 + b, { variant: lk('sub'), modo: 'submarino', scale: 0.5, facing: 1, look: lookObj(), t: t });
      if (n === 4) return p2call('guardianRobovill', ctx, x, pies + b, { scale: 0.34, facing: 1, t: t });
      if (n === 5) return p2call('robovill', ctx, x, pies + b, { variant: lk('robovill'), scale: 0.24, facing: 1, alas: 'abiertas', t: t });
      return false;
    }
    function drawNextChapter(ctx, t) {
      var n = chapter + 1;
      var txt = '¡Siguiente: Capítulo ' + n + ' · ' + chapterName(n) + '!';
      ctx.save();
      ctx.font = 'bold 21px ' + FONT;
      var tw = ctx.measureText(txt).width;
      ctx.restore();
      var iconW = 84, pw = tw + iconW + 40, ph = 50;
      var px = (W - pw) / 2, py = 206;
      ctx.save();
      ctx.fillStyle = 'rgba(15,12,38,0.8)';
      ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 3;
      roundRect(ctx, px, py, pw, ph, 16);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      // El dibujito asoma por encima del cartel (pies sobre su borde de abajo).
      drawNextIcon(ctx, n, px + 12 + iconW / 2, py + ph - 5, t);
      plainText(ctx, txt, px + iconW + 26, py + ph / 2, 21, '#a5f3fc', 'left');
    }

    function render(ctx) {
      var t = now();
      drawChapterBackdrop(ctx, t);
      // Rayos de luz dorados
      ctx.save();
      ctx.translate(W / 2, 250);
      ctx.rotate(t * 0.15);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#fde68a';
      for (var r = 0; r < 14; r++) {
        ctx.rotate(Math.PI / 7);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -560); ctx.lineTo(40, -560); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      confeti(ctx, t, 40, 0.85);
      var pop = easeOut(el * 3);
      ctx.save();
      ctx.translate(W / 2, 66);
      ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
      outlinedText(ctx, '¡Capítulo ' + chapter + ' completado!', 0, 0, 50, GOLD, OUTLINE, 8, 'center');
      ctx.restore();
      outlinedText(ctx, chapterName(chapter), W / 2, 116, 28, '#a5f3fc', OUTLINE, 5, 'center');
      outlinedText(ctx, '¡Gran trabajo en equipo!', W / 2, 156 + Math.sin(t * 2.4) * 3, 26, '#fde68a', OUTLINE, 5, 'center');
      // Dark Secuaz (bueno) en el centro y los 4 héroes celebrando
      drawSecuaz(ctx, W / 2, 452, 0.95, Math.sin(t * 1.5) * 0.25);
      // Mikey celebra con su lanzador (pose 'win'): va en el extremo derecho mirando al borde,
      // para que sus fuegos de energía no apunten a Dark Secuaz ni a sus amigos.
      var HS = ordenFiesta();
      var xs = [120, 285, 675, 840];
      for (var i = 0; i < 4; i++) {
        var hop = Math.abs(Math.sin(t * 4 + i * 0.9)) * 12;
        var fac = HS[i] === 'mikey' ? (i < 2 ? -1 : 1) : (i < 2 ? 1 : -1);
        drawHero(ctx, HS[i], xs[i], 452 - hop, { scale: 1.95, facing: fac, pose: 'win', t: t + i });
      }
      if (chapter === 5) {
        outlinedText(ctx, '¡La fusión final ganó! ¡We are a team!', W / 2, 196, 22, '#bbf7d0', OUTLINE, 4, 'center');
      } else {
        drawNextChapter(ctx, t);
      }
      franjaAbajo(ctx, H - 24);
      blinkText(ctx, 'Pulsa ' + okName() + ' para continuar', H - 24, 22, CREAM);
    }

    G.scenes.levelDoneP3 = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: p3next — puente: lanza el siguiente capítulo
  // ==========================================================================
  (function () {
    var done = false;
    function launch() {
      if (done) return;
      done = true;
      var n = (parseInt(p3().pendingChapter, 10) || 0) + 1;
      if (n > 5) G.go('title');
      else G.p3launch(n);
    }
    G.scenes.p3next = {
      enter: safe(function () { done = false; launch(); }),
      update: safe(function () { launch(); }),
      render: safe(function (ctx) { ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H); })
    };
  })();

  // ==========================================================================
  // ESCENA: creditsP3 — créditos que suben (no se saltan hasta terminar)
  // ==========================================================================
  (function () {
    var scroll = 0;
    var speed = 54;           // px/s (antes 42: unos 93 s, demasiado para un niño)
    var rapido = false;       // ¿se mantiene Enter / SALTO / ATAQUE? → ×4 (no se saltan, solo corren)
    var lines = [];
    var totalH = 0;
    var finished = false;
    var finEl = 0;

    // Sprites del desfile: (x, y) = centro de la línea de texto.
    // Cada sprite lleva .ext = [arriba, abajo]: lo que ocupa respecto al centro de su línea.
    // enter() lo usa para separar las líneas y que ningún dibujo pise al siguiente.
    function spHero(h, sc) {
      sc = sc || 1.15;
      var f = function (ctx, x, y, t) { drawHero(ctx, h, x, y + 38, { scale: sc, facing: 1, pose: 'idle', t: t }); };
      var alto = (h === 'mikey' || h === 'peter') ? altoArte(h) + 8 : 76;
      f.ext = [38 - alto * sc, 40];
      return f;
    }
    // Caja visible [izq, arriba, der, abajo] a escala 1 (P2.P3CAJA, con la variante y el modo).
    function cajaArte(name, o) {
      var C = window.P2 && window.P2.P3CAJA;
      if (!C) return null;
      var base = name;
      if (o && o.modo === 'moto' && name === 'robotMoto') base = 'robotMotoMoto';
      if (o && o.modo === 'nave' && name === 'submarinoNave') base = 'submarinoNaveNave';
      return C[base + (o && o.variant === 'B' ? 'B' : '')] || C[base] || null;
    }
    function extArte(name, o, dy) {
      var sc = (o && typeof o.scale === 'number') ? o.scale : 1;
      var cj = cajaArte(name, o);
      if (cj) return [dy + cj[1] * sc, dy + cj[3] * sc];
      var a = altoArte(name) * sc;
      return [dy - a / 2, dy + a / 2];
    }
    function spArt(name, o, dy, fallbackCol) {
      return function (ctx, x, y, t) {
        var opts = {};
        for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) opts[k] = o[k]; }
        opts.t = t;
        if (name === 'robotMoto') opts.variant = lk('moto');
        if (name === 'submarinoNave') opts.variant = lk('sub');
        if (!p2call(name, ctx, x, y + (dy || 0), opts) && fallbackCol) {
          ctx.save();
          ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2);
          ctx.fillStyle = fallbackCol; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        }
      };
    }
    function conExt(f, ext) { f.ext = ext; return f; }
    function spArtE(name, o, dy, fallbackCol) {
      var f = spArt(name, o, dy, fallbackCol);
      var oo = {};
      for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) oo[k] = o[k]; }
      if (name === 'robotMoto') oo.variant = lk('moto');
      if (name === 'submarinoNave') oo.variant = lk('sub');
      try { f.ext = extArte(name, oo, dy || 0); } catch (e) { f.ext = null; }
      return f;
    }
    function hc(h) { return heroColor(h, 'claro'); }

    function buildLines() {
      var L = lookObj();
      return [
        { t: 'EL RESCATE DE', size: 34, color: '#fde68a', gap: 8 },
        { t: 'LORD FALCON', size: 56, color: GOLD, gap: 12 },
        { t: 'Parte 3: We Are a Team', size: 30, color: '#93c5fd', gap: 50 },
        { t: 'Diseñador Jefe', size: 22, color: CYAN, gap: 4 },
        { t: 'Juanjo (10 años)', size: 34, color: '#ffffff', gap: 40 },
        { t: 'Productor', size: 22, color: CYAN, gap: 4 },
        { t: 'Papá', size: 34, color: '#ffffff', gap: 40 },
        { t: 'Narradores', size: 22, color: CYAN, gap: 4 },
        { t: 'Juanjo y Papá', size: 34, color: '#ffffff', gap: 50 },
        { t: '- Las ideas -', size: 24, color: GOLD, gap: 18 },
        { t: 'La historia, Mikey, Peter y Robovill: Juanjo', size: 22, color: CREAM, gap: 10 },
        { t: 'El lema «We are a team»: Juanjo', size: 22, color: CREAM, gap: 10 },
        { t: 'Las fusiones: Papá', size: 22, color: CREAM, gap: 50 },
        { t: '- El equipo -', size: 24, color: GOLD, gap: 30 },
        { t: 'Director America', size: 28, color: hc('director'), gap: 40, sprite: spHero('director') },
        { t: 'Lord Falcon', size: 28, color: hc('falcon'), gap: 40, sprite: spHero('falcon') },
        { t: 'Mikey Stark', size: 28, color: hc('mikey'), gap: 40, sprite: spHero('mikey') },
        { t: 'Peter Rogers', size: 28, color: hc('peter'), gap: 60, sprite: spHero('peter') },
        { t: '- El amigo -', size: 24, color: GOLD, gap: 70 },
        { t: 'Dark Secuaz', size: 30, color: SECUAZ_COL, gap: 66,
          sprite: function (ctx, x, y, t) { drawSecuaz(ctx, x, y + 46, 0.48, Math.sin(t) * 0.2); } },
        { t: '- El villano -', size: 24, color: GOLD, gap: 96 },
        { t: 'Robovill', size: 32, color: ROBOVILL_COL, gap: 70,
          sprite: conExt(function (ctx, x, y, t) { drawRobovill(ctx, x + 10, y + 66, { scale: 0.42, facing: 1, brazo: ['martillo', 'sierra', 'canon', 'pinza'][Math.floor(t / 1.5) % 4], alas: 'abiertas' }); },
            [66 - 300 * 0.42, 70]) },
        { t: 'Los mini-robots', size: 26, color: '#fca5a5', gap: 40,
          sprite: conExt(function (ctx, x, y, t) {
            for (var m = 0; m < 3; m++) p2call('miniRobot', ctx, x - 34 + m * 34, y + Math.sin(t * 4 + m) * 5, { scale: 0.8, facing: 1, t: t });
          }, [-23, 22]) },
        { t: 'La gema copia', size: 26, color: '#fca5a5', gap: 60, sprite: spArtE('gemaCopia', { scale: 1.3 }, 0, '#e11d48') },
        { t: '- Los jefes -', size: 24, color: GOLD, gap: 70 },
        { t: 'Robot de práctica', size: 26, color: '#bbf7d0', gap: 66, sprite: spArtE('robotPractica', { scale: 0.55, facing: 1 }, 44, '#22c55e') },
        { t: 'Gran Excavadora', size: 26, color: '#fca5a5', gap: 60, sprite: spArtE('granExcavadora', { scale: 0.5, facing: 1, humo: true }, 40, '#f59e0b') },
        { t: 'Dron Nodriza', size: 26, color: '#fca5a5', gap: 66, sprite: spArtE('dronNodriza', { scale: 0.42, facing: 1 }, 0, '#6b7280') },
        { t: 'Los Guardianes de Robovill', size: 26, color: '#fca5a5', gap: 70, sprite: spArtE('guardianRobovill', { scale: 0.5, facing: 1 }, 46, '#7c3aed') },
        { t: '- Los vehículos -', size: 24, color: GOLD, gap: 46 },
        { t: 'Robot-moto', size: 26, color: hc('mikey'), gap: 50, sprite: spArtE('robotMoto', { modo: 'moto', scale: 0.8, facing: 1, look: L }, 34, '#f97316') },
        { t: 'Robot transformable', size: 26, color: hc('director'), gap: 50, sprite: spArtE('transformableCoche', { variant: vehP2('transformable'), scale: 0.62, facing: 1 }, 26, '#60a5fa') },
        { t: 'Submarino-nave', size: 26, color: hc('peter'), gap: 50, sprite: spArtE('submarinoNave', { modo: 'submarino', scale: 0.6, facing: 1, look: L }, 0, '#facc15') },
        { t: 'Mecha-halcón', size: 26, color: hc('falcon'), gap: 80, sprite: spArtE('mechaHalcon', { variant: vehP2('mechahalcon'), modo: 'vuelo', scale: 0.5, facing: 1 }, 0, '#4ade80') },
        { t: '- Las fusiones -', size: 24, color: GOLD, gap: 76 },
        { t: 'Titán Turbo (fusión terrestre)', size: 26, color: '#93c5fd', gap: 86, tx: 110, sprite: spArtE('fusionTerrestre', { scale: 0.42, facing: 1, look: L }, 52, '#60a5fa') },
        { t: 'Titán Tormenta (fusión voladora)', size: 26, color: '#86efac', gap: 96, tx: 110, sprite: spArtE('fusionVoladora', { scale: 0.4, facing: 1, look: L }, 0, '#4ade80') },
        { t: 'Fusión final', size: 28, color: GOLD, gap: 8, sprite: spArtE('fusionFinal', { scale: 0.38, facing: 1, look: L }, 66, '#fbbf24') },
        { t: '«We Are a Team»', size: 26, color: '#fde68a', gap: 80 },
        { t: '- Los creadores -', size: 24, color: GOLD, gap: 28 },
        { t: 'Juanjo', size: 28, color: JUANJO_COL, gap: 56, sprite: function (ctx, x, y, t) { gfxCall('drawJuanjo', ctx, x, y + 30, { t: t, scale: 0.72 }); } },
        { t: 'Papá', size: 28, color: '#fbbf24', gap: 64, sprite: function (ctx, x, y, t) { gfxCall('drawPapa', ctx, x, y + 34, { t: t, scale: 0.66 }); } },
        { t: 'La amistad y el trabajo en equipo', size: 22, color: CREAM, gap: 6 },
        { t: 'siempre ganan. ¡We are a team!', size: 22, color: CREAM, gap: 50 }
      ];
    }

    // Lo que ocupa cada línea respecto a su centro (el texto y, si hay, su dibujo).
    function extLinea(ln) {
      var a = -ln.size / 2, b = ln.size / 2;
      var e = ln.sprite && ln.sprite.ext;
      if (e && isFinite(e[0]) && isFinite(e[1])) { a = Math.min(a, e[0]); b = Math.max(b, e[1]); }
      return [a, b];
    }
    // Si un dibujo no cabe en su hueco, la línea se separa más (nunca menos): así ningún
    // jefe, héroe o fusión se monta sobre el de la línea siguiente.
    function separaLineas(ls) {
      var MARGEN = 14;
      for (var i = 0; i + 1 < ls.length; i++) {
        var A = ls[i], B = ls[i + 1];
        if (!(A.sprite && A.sprite.ext) && !(B.sprite && B.sprite.ext)) continue;
        var ea = extLinea(A), eb = extLinea(B);
        var gap = (typeof A.gap === 'number') ? A.gap : 12;
        var dist = A.size / 2 + gap + B.size / 2;           // de centro a centro
        var hace = ea[1] - eb[0] + MARGEN;                    // lo que hace falta
        if (dist < hace) A.gap = Math.ceil(gap + hace - dist);
      }
    }

    function enter() {
      lines = buildLines();
      separaLineas(lines);
      scroll = 0;
      finished = false;
      finEl = 0;
      totalH = 0;
      for (var i = 0; i < lines.length; i++) totalH += lines[i].size + (lines[i].gap || 12);
      music('ending3');
    }

    function update(dt) {
      dt = stepDt(dt);
      if (finished) finEl += dt;
      // Se para cuando la última línea queda arriba (deja sitio al "Fin").
      var maxScroll = totalH + H + 40 - 230;
      rapido = heldAny('confirm') || heldAny('jump') || heldAny('attack');
      if (scroll < maxScroll) {
        scroll = Math.min(maxScroll, scroll + speed * (rapido ? 4 : 1) * dt);
      } else if (!finished) {
        finished = true;
        finEl = 0;
      }
      if (finished && finEl > 0.4 && menuPressed('confirm')) {
        sfx('select');
        G.go('mensajeJuanjo');
      }
    }

    function drawBackground(ctx, t) {
      if (!p2call('bgBaseCielo', ctx, t * 24, t)) {
        if (!p2call('bgCielo', ctx, t * 24, t)) drawMenuBackdrop(ctx, t);
      }
      ctx.save();
      ctx.fillStyle = 'rgba(6,4,18,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    function render(ctx) {
      var t = now();
      drawBackground(ctx, t);
      var y = H + 40 - scroll;
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        var centerY = y + ln.size / 2;
        if (centerY > -140 && centerY < H + 140) {
          if (ln.sprite) {
            try { ln.sprite(ctx, W / 2 - 190, centerY, t); } catch (e) {}
            outlinedText(ctx, ln.t, W / 2 + (typeof ln.tx === 'number' ? ln.tx : 60), centerY, ln.size, ln.color || '#fff', OUTLINE, Math.max(3, ln.size * 0.12), 'center');
          } else if (ln.t) {
            outlinedText(ctx, ln.t, W / 2, centerY, ln.size, ln.color || '#fff', OUTLINE, Math.max(3, ln.size * 0.12), 'center');
          }
        }
        y += ln.size + (ln.gap || 12);
      }
      if (!finished) {
        var aviso = rapido ? '¡Más rápido!  ▶▶' : 'Mantén ' + okName() + ' para ir más rápido';
        ctx.save();
        ctx.font = 'bold 15px ' + FONT;
        var aw = ctx.measureText(aviso).width + 24;
        ctx.globalAlpha = rapido ? 0.95 : 0.8;
        ctx.fillStyle = 'rgba(15,12,38,0.85)';
        roundRect(ctx, W - 14 - aw, H - 34, aw, 28, 14);
        ctx.fill();
        ctx.restore();
        plainText(ctx, aviso, W - 26, H - 20, 15, '#fde68a', 'right');
      }
      if (finished) {
        var a = clamp(finEl * 2 + 0.2, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        outlinedText(ctx, 'Fin de la Parte 3', W / 2, 300, 50, GOLD, OUTLINE, 8, 'center');
        outlinedText(ctx, 'Juanjo tiene un mensaje especial para ti...', W / 2, 352, 22, CREAM, OUTLINE, 4, 'center');
        heartPath(ctx, W / 2, 378 + Math.sin(t * 3) * 3, 1.4);
        ctx.fillStyle = '#7dd3fc'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = a;
        blinkText(ctx, 'Pulsa ' + okName() + ' para continuar', H - 30, 22, '#fde68a');
        ctx.restore();
      }
    }

    G.scenes.creditsP3 = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: mensajeJuanjo — "Un mensaje de Juanjo" (texto EXACTO de G.MENSAJE_JUANJO)
  // ==========================================================================
  (function () {
    var el = 0;
    // Respaldo (idéntico al de ui.js) por si G.MENSAJE_JUANJO faltara.
    var RESPALDO = {
      lineas: ['Hola, papi y hermanos:', 'muchas gracias por enseñarme a usar la IA,', 'a que me guste el deporte',
        'y a jugar con mis hermanos.', 'Los adoro.', 'Espero que puedas enseñarles a mis hermanos', 'como a mí.', 'Te amo.'],
      firma: '— Juanjo (10 años)'
    };
    var fontSize = 0;   // se calcula la primera vez para que las 8 líneas quepan en la carta

    function msg() {
      var M = G.MENSAJE_JUANJO;
      return (M && Array.isArray(M.lineas) && M.lineas.length && typeof M.firma === 'string') ? M : RESPALDO;
    }

    function enter() {
      el = 0;
      fontSize = 0;
      music('ending3');
    }

    function update(dt) {
      el += stepDt(dt);
      // Confirm solo funciona tras 4 s (para que no se salte por error).
      if (el >= 4 && menuPressed('confirm')) {
        sfx('select');
        G.go('finalP3');
      }
    }

    function background(ctx, t) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f1e4a');
      g.addColorStop(0.55, '#3b2a7a');
      g.addColorStop(1, '#be6fa8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Estrellas que titilan
      ctx.save();
      for (var i = 0; i < 70; i++) {
        var sx = (i * 137.5 + 13) % W, sy = (i * 61.7) % (H * 0.8);
        ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3));
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath(); ctx.arc(sx, sy, 0.8 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // Luz suave detrás de Juanjo
      var sg = ctx.createRadialGradient(160, 330, 10, 160, 330, 260);
      sg.addColorStop(0, 'rgba(186,230,253,0.55)');
      sg.addColorStop(1, 'rgba(186,230,253,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
      // Corazoncitos y estrellitas que suben despacio
      ctx.save();
      for (var k = 0; k < 28; k++) {
        var bx = (k * 137.5 + 40) % W;
        var ph = (t * 0.05 + k * 0.137) % 1;
        var by = H + 30 - ph * (H + 80);
        ctx.globalAlpha = 0.16 + 0.26 * Math.sin(ph * Math.PI);
        if (k % 3 === 0) {
          heartPath(ctx, bx, by, 0.9 + (k % 4) * 0.2);
          ctx.fillStyle = (k % 2) ? '#f9a8d4' : '#7dd3fc'; ctx.fill();
        } else if (k % 3 === 1) {
          starPath(ctx, bx, by, 4 + (k % 3), 0.45);
          ctx.fillStyle = '#fde68a'; ctx.fill();
        } else {
          ctx.fillStyle = '#fff7d6';
          ctx.beginPath(); ctx.arc(bx, by, 1.5 + (k % 3), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      // Nubecita donde está Juanjo
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeStyle = 'rgba(147,197,253,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(160, 490, 120, 26, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(100, 478, 30, 0, Math.PI * 2); ctx.arc(170, 470, 38, 0, Math.PI * 2); ctx.arc(232, 480, 28, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function render(ctx) {
      var t = now();
      var M = msg();
      background(ctx, t);

      var tPop = easeOut(el * 2);
      ctx.save();
      ctx.globalAlpha = clamp(el * 2, 0, 1);
      outlinedText(ctx, 'Un mensaje de Juanjo', W / 2 + 140, 44, 40, '#bae6fd', '#1e3a8a', 7, 'center');
      ctx.restore();

      // Juanjo (grande), saludando con un bote suave
      var jx = 162, jy = 474 - Math.abs(Math.sin(t * 2.2)) * 10;
      ctx.save();
      ctx.translate(jx, 474); ctx.scale(0.7 + 0.3 * tPop, 0.7 + 0.3 * tPop); ctx.translate(-jx, -474);
      drawJuanjoSaludando(ctx, jx, jy, 3.1, t);
      ctx.restore();
      // Corazón que late sobre Juanjo
      var hb = 1.6 + Math.max(0, Math.sin(t * 6)) * 0.35;
      heartPath(ctx, 228, 150 + Math.sin(t * 2) * 4, hb);
      ctx.save(); ctx.fillStyle = '#ff5a7a'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      gfxCall('drawSparkle', ctx, 70, 200, (t * 0.7) % 1);
      gfxCall('drawSparkle', ctx, 250, 260, (t * 0.7 + 0.5) % 1);

      // Carta (papel) con colita de bocadillo hacia Juanjo
      var cx = 300, cy = 80, cw = 640, ch = 412;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRect(ctx, cx + 5, cy + 7, cw, ch, 24); ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 4;
      roundRect(ctx, cx, cy, cw, ch, 24);
      ctx.fill(); ctx.stroke();
      // (la colita va por debajo de la mano que saluda, para que se vea entera)
      ctx.beginPath(); ctx.moveTo(cx + 2, 330); ctx.lineTo(cx - 40, 362); ctx.lineTo(cx + 2, 374);
      ctx.fillStyle = '#fffaf0'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, 330); ctx.lineTo(cx - 40, 362); ctx.lineTo(cx, 374); ctx.stroke();
      // Margen y renglones de cuaderno
      ctx.strokeStyle = 'rgba(244,114,182,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + 44, cy + 14); ctx.lineTo(cx + 44, cy + ch - 14); ctx.stroke();
      ctx.restore();

      var lineas = M.lineas;
      var n = lineas.length;
      var LH = 37;
      var tx = cx + 64, maxW = cw - 64 - 40;
      if (!fontSize) {
        ctx.save();
        fontSize = 27;
        for (var tries = 0; tries < 12; tries++) {
          ctx.font = 'bold ' + fontSize + 'px ' + FONT;
          var widest = 0;
          for (var q = 0; q < n; q++) widest = Math.max(widest, ctx.measureText(lineas[q]).width);
          if (widest <= maxW) break;
          fontSize -= 1;
        }
        ctx.restore();
      }
      var blockH = n * LH + 46;
      var ty0 = cy + Math.max(24, (ch - blockH) / 2) + LH / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(59,130,246,0.16)'; ctx.lineWidth = 1.5;
      for (var nl = 0; nl < n; nl++) {
        var lyy = ty0 + nl * LH + 16;
        ctx.beginPath(); ctx.moveTo(cx + 24, lyy); ctx.lineTo(cx + cw - 24, lyy); ctx.stroke();
      }
      ctx.restore();
      // Las 8 líneas EXACTAS, una a una (cada una con su propio fillText)
      ctx.save();
      ctx.font = 'bold ' + fontSize + 'px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1e293b';
      for (var i = 0; i < n; i++) {
        var a = clamp((el - 0.5 - i * 0.38) / 0.45, 0, 1);
        ctx.globalAlpha = Math.max(0.02, a);
        var dy = (1 - a) * 8;
        ctx.fillText(lineas[i], tx, ty0 + i * LH + dy);
      }
      // Firma (a la derecha, como en una carta), con un corazoncito
      var fa = clamp((el - 0.5 - n * 0.38) / 0.5, 0, 1);
      ctx.globalAlpha = Math.max(0.02, fa);
      ctx.font = 'italic bold ' + (fontSize + 2) + 'px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#2563eb';
      var fy = ty0 + n * LH + 10;
      ctx.fillText(M.firma, cx + cw - 58, fy);
      heartPath(ctx, cx + cw - 38, fy - 9, 0.85);
      ctx.fillStyle = '#ff5a7a'; ctx.fill();
      ctx.restore();
      // Dibujitos de la hoja de Juanjo en las esquinas (estrella y corazón)
      ctx.save();
      starPath(ctx, cx + cw - 36, cy + 34, 12, 0.45);
      ctx.fillStyle = '#fde047'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
      heartPath(ctx, cx + 22, cy + ch - 40, 0.9);
      ctx.fillStyle = '#7dd3fc'; ctx.fill(); ctx.stroke();
      ctx.restore();

      if (el >= 4) {
        var blink = 0.6 + 0.4 * Math.sin(t * 5);
        ctx.save(); ctx.globalAlpha = blink;
        outlinedText(ctx, 'Pulsa ' + okName() + ' para continuar', cx + cw / 2, H - 22, 20, '#fff7d6', '#1e3a8a', 4, 'center');
        ctx.restore();
      }
    }

    G.scenes.mensajeJuanjo = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: finalP3 — el equipo, Dark Secuaz, Juanjo y Papá… y Robovill que huye
  // ==========================================================================
  (function () {
    var el = 0;

    function enter() {
      el = 0;
      music('ending3');
    }

    function update(dt) {
      el += stepDt(dt);
      if (el > 1 && menuPressed('confirm')) {
        sfx('select');
        G.go('title');
      }
    }

    function cloud(ctx, x, y, s) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
      ctx.arc(x + 26 * s, y - 10 * s, 28 * s, 0, Math.PI * 2);
      ctx.arc(x + 56 * s, y, 22 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function render(ctx) {
      var t = now();
      // Cielo de atardecer
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#60a5fa');
      g.addColorStop(0.55, '#fcd34d');
      g.addColorStop(1, '#fb923c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      var sg = ctx.createRadialGradient(W / 2, 330, 20, W / 2, 330, 440);
      sg.addColorStop(0, 'rgba(255,255,255,0.6)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
      for (var c = 0; c < 5; c++) {
        cloud(ctx, ((c * 230 + t * 12) % (W + 200)) - 120, 190 + (c % 2) * 46, 0.8 + (c % 3) * 0.2);
      }
      // Robovill, pequeñito, se aleja volando con la gema apagada
      var per = 12;
      var p = (el % per) / per;
      var rx = 740 + p * 290, ry = 222 - p * 160, rs = 0.24 * (1 - p * 0.65);
      ctx.save();
      ctx.globalAlpha = p < 0.85 ? 1 : (1 - p) / 0.15;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (var tr = 1; tr <= 3; tr++) {
        ctx.beginPath(); ctx.moveTo(rx - 22 * tr * rs * 4, ry - 50 * rs + tr * 6 * rs * 4); ctx.lineTo(rx - 36 * tr * rs * 4, ry - 30 * rs + tr * 9 * rs * 4); ctx.stroke();
      }
      ctx.translate(rx, ry); ctx.rotate(-0.25); ctx.translate(-rx, -ry);
      drawRobovill(ctx, rx, ry, { scale: rs, facing: 1, brazo: 'martillo', alas: 'abiertas' });
      ctx.restore();
      // Colina
      ctx.save();
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, 470);
      ctx.quadraticCurveTo(W / 2, 440, W + 10, 470);
      ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 500, W, H - 500);
      ctx.restore();

      // Personajes: el equipo, Dark Secuaz bueno, y Juanjo y Papá juntos en el centro
      drawSecuaz(ctx, 868, 476, 0.95, 0.3 + Math.sin(t * 1.5) * 0.15);
      var HS = heroes();
      // Mikey celebra con su lanzador (pose 'win'): a la izquierda del todo y mirando al borde,
      // así sus fuegos de energía no apuntan a Juanjo y Papá.
      var pos = { mikey: 116, director: 214, falcon: 628, peter: 736 };
      for (var i = 0; i < 4; i++) {
        var h = HS[i];
        var hop = Math.abs(Math.sin(t * 4 + i * 0.8)) * 8;
        var hx = pos[h] || (120 + i * 160);
        var fac = (hx < W / 2 ? 1 : -1) * (h === 'mikey' ? -1 : 1);
        drawHero(ctx, h, hx, 468 - hop, { scale: 1.75, facing: fac, pose: 'win', t: t + i });
      }
      gfxCall('drawJuanjoPapaDuo', ctx, 412, 470, { t: t, scale: 1.75 });

      confeti(ctx, t, 46, 1);

      var pop = easeOut(el * 2.5);
      ctx.save();
      ctx.translate(W / 2, 52);
      ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
      outlinedText(ctx, '¡Gracias por jugar!', 0, 0, 52, GOLD, OUTLINE, 9, 'center');
      ctx.restore();
      // WE ARE A TEAM con rayos de luz
      ctx.save();
      ctx.translate(W / 2, 112);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#fff7d6';
      ctx.rotate(t * 0.3);
      for (var r = 0; r < 12; r++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -150); ctx.lineTo(14, -150); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      var wp = 1 + Math.sin(t * 3) * 0.03;
      ctx.save();
      ctx.translate(W / 2, 112); ctx.scale(wp, wp);
      outlinedText(ctx, 'WE ARE A TEAM', 0, 0, 46, '#fde047', '#7c2d12', 8, 'center');
      ctx.restore();
      outlinedText(ctx, 'Creado con cariño por Juanjo (10 años) y Papá', W / 2, 152, 20, '#ffffff', OUTLINE, 4, 'center');
      // Pista de la Parte 4
      outlinedText(ctx, 'Continuará… ¿Qué pasará en la Parte 4?', W / 2 + 150, 252, 20, '#fecaca', '#7f1d1d', 4, 'center');

      if (el > 1) blinkText(ctx, 'Pulsa ' + okName() + ' para volver al inicio', H - 18, 20, CREAM);
    }

    G.scenes.finalP3 = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // G.ui3 — página "Cómo jugar" de la Parte 3 (la usa ui.js)
  // ==========================================================================
  G.ui3 = G.ui3 || {};
  G.ui3.drawHowto3 = function (ctx, t) {
    try {
      t = (typeof t === 'number') ? t : now();
      drawTeamBackdrop(ctx, t, 0.6);
      var coop = isCoop();
      var j = coop ? 0 : 1;
      outlinedText(ctx, 'Cómo jugar · Parte 3', W / 2, 38, 38, GOLD, OUTLINE, 7, 'center');
      outlinedText(ctx, conTeclas('¡4 héroes! Cambia de héroe cuando quieras con {cambio}', j), W / 2, 78, 22, '#fde68a', OUTLINE, 4, 'center');
      var CTRL = {
        director: ['{ataque} guantes · {disparo} pulso (aturde)', 'Mantén {hack} junto a una consola: ¡hackea!'],
        falcon: ['{ataque} espada · {disparo} arco', '¡Doble salto! Llega a las repisas altas'],
        mikey: ['{ataque} dispara · {disparo} cambia de lanzador', 'Francotirador, pistola y metralleta'],
        peter: ['{ataque} golpe · mantén {ataque}: ¡cubrirse!', '{disparo} lanza el escudo: rebota y vuelve']
      };
      var HS = heroes();
      var cw = 430, chh = 140, gx = 20, gy = 14;
      var x0 = (W - (cw * 2 + gx)) / 2, y0 = 102;
      for (var i = 0; i < 4; i++) {
        var h = HS[i];
        var x = x0 + (i % 2) * (cw + gx), y = y0 + Math.floor(i / 2) * (chh + gy);
        panel(ctx, x, y, cw, chh, heroColor(h), 0.88);
        ctx.save();
        roundRect(ctx, x, y, cw, chh, 18); ctx.clip();
        // Mikey y Peter son más altos que su "68 px" (pelo de punta, casco): escala por su alto de arte.
        var hs = (h === 'mikey' || h === 'peter') ? Math.min(1.55, 1.55 * 66 / altoArte(h)) : 1.55;
        drawHero(ctx, h, x + 60, y + chh - (h === 'mikey' ? 6 : 12), { scale: hs, facing: 1, pose: 'idle', t: t + i });
        ctx.restore();
        outlinedText(ctx, heroInfo(h).nombre, x + 120, y + 28, 22, heroColor(h, 'claro'), OUTLINE, 4, 'left');
        var lines = CTRL[h] || [];
        for (var k = 0; k < lines.length; k++) {
          var tl = wrapText(ctx, conTeclas(lines[k], j), cw - 136, 16, '600');
          plainText(ctx, tl[0] || '', x + 120, y + 62 + k * 30, 16, CREAM, 'left', '600');
          if (tl[1]) plainText(ctx, tl[1], x + 120, y + 62 + k * 30 + 17, 14, CREAM, 'left', '600');
        }
      }
      var fy = y0 + 2 * (chh + gy) + 4;
      // Las fusiones van sobre una franja oscura (QA: en cian pequeño sobre el cielo claro no se leían).
      var fus = coop
        ? conTeclas('Fusiones: un jugador pilota (moverse, {salto} saltar, {ataque} puñetazo, mantén {disparo} escudo) y el otro dispara.', j)
        : conTeclas('Fusiones: tú pilotas (moverse, {salto} saltar, {ataque} puñetazo, mantén {disparo} escudo) y las demás piezas disparan solas.', 1);
      var fl = wrapText(ctx, fus, W - 120, 16, 'bold');
      var nfl = Math.min(2, fl.length);
      var stripH = 12 + nfl * 21 + 24 + (coop ? 20 : 0);
      ctx.save();
      ctx.fillStyle = 'rgba(15,12,38,0.85)';
      roundRect(ctx, 40, fy - 4, W - 80, stripH, 14);
      ctx.fill();
      ctx.restore();
      for (var q = 0; q < nfl; q++) plainText(ctx, fl[q], W / 2, fy + 10 + q * 21, 16, '#67e8f9', 'center', 'bold');
      var ey = fy + 10 + nfl * 21 + 2;
      plainText(ctx, conTeclas('¡Llena la barra de equipo y pulsa {cambio} para el ATAQUE EN EQUIPO!', j), W / 2, ey, 16, '#fde68a');
      if (coop) plainText(ctx, 'En 2 jugadores, cada tecla sale así: Jugador 1 / Jugador 2', W / 2, ey + 20, 14, 'rgba(255,255,255,0.85)', 'center', '600');
      plainText(ctx, tactil() ? 'Toca el centro para volver' : okName() + ' o Escape para volver', W / 2, H - 12, 15, 'rgba(255,255,255,0.75)');
    } catch (e) { /* nunca romper */ }
  };

})();
