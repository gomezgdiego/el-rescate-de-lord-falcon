// arte-escenarios3.js — Parte 3 "We Are a Team": fondos, tiles, puzles, iconos y props.
// Dueño: arte-escenarios (contrato técnico de la Parte 3, §16.2).
// Mismo estilo que js/p2/arte-escenarios.js: contornos #1a1a2e, formas rechonchas
// tipo Kirby/LEGO, parallax por capas. Los FONDOS usan colores algo más apagados que
// los personajes (para que los héroes destaquen) y pintan siempre los 960 × 540.
// La fábrica oscura da un poco de misterio, pero NO miedo: ojos redondos que
// parpadean, luces rojas suaves y carteles de Robovill.
//
// Exporta (contrato §16.2), todo en P2.fn:
//   bgBaseCielo(c, camX, t, {noche})     bgTuneles(c, scroll, t, {silueta})
//   sueloTunel(c, scroll, sueloY, t)     techoTunel(c, scroll, techoY, t)
//   bgRio(c, scroll, t, {nivelAgua})     aguaFrente(c, scroll, nivelAgua, t)
//   bgSalidaCielo(c, scroll, t)          bgFabricaOscura(c, camX, t)
//   bgArenaRobovill(c, t)                bgArenaGigantes(c, t, {lugar: 'caverna'|'cielo'|'fabrica'})
//   tile3(c, x, y, size, tipo, tema, estado)       (x, y) = esquina superior izquierda
//   barreraLaser(c, x, yArriba, yAbajo, {activa, t, cruzando})   (x = centro de la columna)
//   diana(c, x, y, {hecha, t, scale})    palanca(c, x, piesY, {hecha, t})
//   bolaEnergiaJuego(c, x, y, {tipo, angle, scale, t})
//   iconoLanzador(c, x, y, {tipo, size, activo})   iconoEscudo(c, x, y, {size, modo, fuera})
//   iconoCambio(c, x, y, {size})         roca(c, x, y, {r, t, rot})
//   sombraAviso(c, x, sueloY, {r, t01})  pezRobot(c, x, y, {facing, scale, t})
//   mina(c, x, y, {t, scale})            chispasPop(c, x, y, {t01, scale})
// Ninguna función lanza excepciones: todo va envuelto en safe() (save/restore emparejados).
// Solo DEFINE funciones al cargar (contrato §0.4).
window.G = window.G || {};
window.P2 = window.P2 || {};
(function () {
  'use strict';
  var P2 = window.P2, G = window.G;
  P2.fn = P2.fn || {};
  var O = P2.OUTLINE || '#1a1a2e';
  var W = 960, H = 540, PI = Math.PI, TAU = PI * 2;
  var SOFT = 'rgba(26,26,46,0.55)';   // contorno suavizado para capas lejanas

  // ---------------------------------------------------------------------------
  //  Primitivas de respaldo (por si arte-base.js faltara: nunca lanzar)
  // ---------------------------------------------------------------------------
  function rr(c, x, y, w, h, r) {
    if (P2.rr) { P2.rr(c, x, y, w, h, r); return; }
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function rf(c, x, y, w, h, r, fill, stroke, lw) {
    rr(c, x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  }
  function circ(c, x, y, r, fill, stroke, lw) {
    c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  }
  function elli(c, x, y, rx, ry, fill, stroke, lw) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  }
  function line(c, x1, y1, x2, y2, col, lw) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw || 2; c.stroke();
  }
  function poly(c, pts, fill, stroke, lw) {
    if (!pts || !pts.length) return;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  }
  function label(c, txt, x, y, size, col, align) {
    if (P2.label) { P2.label(c, txt, x, y, size, col, align); return; }
    c.font = 'bold ' + size + 'px sans-serif'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(2, size / 5); c.strokeStyle = O; c.strokeText(txt, x, y);
    c.fillStyle = col || '#fff'; c.fillText(txt, x, y);
  }

  // ---------------------------------------------------------------------------
  //  Utilidades
  // ---------------------------------------------------------------------------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function now() { return num(window.G && window.G.T, 0); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function hash(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function mod(a, m) { return ((a % m) + m) % m; }
  function safe(c, fn) {
    if (!c || !c.save) return;
    c.save();
    try { c.lineJoin = 'round'; c.lineCap = 'round'; fn(); }
    catch (e) { if (window.console && console.warn) console.warn('arte-escenarios3:', e); }
    c.restore();
  }
  function vgrad(c, y0, y1, stops) {
    var g = c.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  // Recorre "huecos" de una capa de parallax infinita: fn(índice, xPantalla)
  function slots(offset, spacing, fn) {
    var i0 = Math.floor(offset / spacing) - 1, n = Math.ceil(W / spacing) + 2;
    for (var i = i0; i <= i0 + n; i++) fn(i, i * spacing - offset);
  }
  function puff(c, k, fill, stroke, lw) {
    var i;
    if (stroke) {
      c.fillStyle = stroke;
      for (i = 0; i < k.length; i++) { c.beginPath(); c.arc(k[i][0], k[i][1], k[i][2] + (lw || 3), 0, TAU); c.fill(); }
    }
    c.fillStyle = fill;
    for (i = 0; i < k.length; i++) { c.beginPath(); c.arc(k[i][0], k[i][1], k[i][2], 0, TAU); c.fill(); }
  }
  function cloudK(x, y, s) {
    return [[x - 34 * s, y + 4 * s, 16 * s], [x - 14 * s, y - 10 * s, 22 * s], [x + 12 * s, y - 14 * s, 25 * s],
            [x + 36 * s, y - 2 * s, 18 * s], [x + 50 * s, y + 8 * s, 12 * s], [x, y + 8 * s, 22 * s], [x + 26 * s, y + 10 * s, 16 * s]];
  }
  function starPts(cx, cy, R, r, n, rot) {
    var pts = [], a0 = (rot || 0) - PI / 2;
    for (var i = 0; i < n * 2; i++) {
      var a = a0 + i * PI / n, rad = (i % 2) ? r : R;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    return pts;
  }
  function sparkle(c, x, y, r, col, a) {
    c.save(); c.globalAlpha = clamp(a, 0, 1);
    c.fillStyle = col || '#fff7c2';
    c.beginPath();
    c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
    c.fill(); c.restore();
  }
  function glow(c, x, y, r, col, a) {
    c.save(); c.globalAlpha = clamp(a, 0, 1);
    var g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
  }
  function hazard(c, x, y, w, h, off, colA, colB) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = colA || '#f2c230'; c.fillRect(x, y, w, h);
    c.fillStyle = colB || '#2a2a3e';
    var st = h * 1.4;
    for (var sx = x - h * 2 + mod(off || 0, st * 2); sx < x + w + h; sx += st * 2) {
      c.beginPath(); c.moveTo(sx, y + h); c.lineTo(sx + h, y); c.lineTo(sx + h + st, y); c.lineTo(sx + st, y + h); c.closePath(); c.fill();
    }
    c.restore();
  }
  function gear(c, x, y, r, teeth, ang, fill, stroke) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.beginPath();
    for (var i = 0; i < teeth * 2; i++) {
      var a0 = i * PI / teeth, a1 = (i + 1) * PI / teeth;
      c.arc(0, 0, (i % 2) ? r * 0.84 : r, a0 + 0.04, a1 - 0.04);
    }
    c.closePath();
    c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 2.5; c.stroke();
    circ(c, 0, 0, r * 0.55, null, stroke, 2);
    circ(c, 0, 0, r * 0.18, 'rgba(26,26,46,0.35)', stroke, 2);
    c.restore();
  }
  function look() { return (G.p3 && G.p3.look) || {}; }
  function heroCol(h, fb) {
    try { if (G.p3 && typeof G.p3.heroColor === 'function') return G.p3.heroColor(h) || fb; } catch (e) { /* respaldo */ }
    return fb;
  }
  function call(name) {   // P2.call con comprobación: true si el arte existe y dibujó
    try { if (typeof P2.call === 'function') return P2.call.apply(P2, arguments) === true; } catch (e) { /* respaldo */ }
    return false;
  }

  // ---- Piezas compartidas ----------------------------------------------------
  var GEM_PTS = [[0, -16], [11, -6], [8, 13], [-8, 13], [-11, -6]];
  // Marca de Robovill: la gema copia en su marco de acero con una estrella dorada.
  function marcaRobovill(c, x, y, s, t, halo) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (halo) glow(c, 0, 0, 34, 'rgba(244,63,94,0.55)', 0.6 + 0.25 * Math.sin(t * 2.4));
    poly(c, GEM_PTS.map(function (p) { return [p[0] * 1.32, p[1] * 1.32 + 0.4]; }), '#475569', O, 2.4);
    var g = c.createLinearGradient(-10, -16, 10, 13);
    g.addColorStop(0, '#e11d48'); g.addColorStop(1, '#a21caf');
    poly(c, GEM_PTS, g, '#4c0519', 2);
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath(); c.moveTo(0, -16); c.lineTo(11, -6); c.lineTo(0, -4); c.closePath(); c.fill();
    poly(c, starPts(0, -0.5, 6.2, 2.6, 5, 0), '#facc15', O, 1.3);
    c.restore();
  }
  // Cartel de Robovill (un poco despegado, pero simpático)
  function cartelRobovill(c, x, y, w, h, t, seed, sinHalo) {
    c.save(); c.translate(x, y); c.rotate((hash(seed) - 0.5) * 0.08);
    rf(c, -w / 2, -h / 2, w, h, 8, '#3b2442', O, 3);
    rf(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 5, null, '#be185d', 2);
    marcaRobovill(c, 0, -h * 0.12, h / 70, t, !sinHalo);
    label(c, 'ROBOVILL', 0, h * 0.32, Math.max(9, h * 0.15), '#fda4af', 'center');
    // esquina doblada
    poly(c, [[w / 2 - 14, h / 2], [w / 2, h / 2 - 14], [w / 2, h / 2]], '#24162a', O, 2);
    circ(c, -w / 2 + 9, -h / 2 + 9, 3, '#94a3b8', O, 1.2);
    circ(c, w / 2 - 9, -h / 2 + 9, 3, '#94a3b8', O, 1.2);
    c.restore();
  }
  // Ojos-luz en la sombra: redondos, con brillo y parpadeo (misterio, no miedo)
  function ojosSombra(c, x, y, s, t, seed, col) {
    var blink = mod(t * 0.5 + hash(seed) * 7, 3.2) < 0.14 ? 0.12 : 1;
    var lk = Math.sin(t * 0.6 + seed * 2) * 2 * s;
    col = col || '#fb7185';
    [-1, 1].forEach(function (sd) {
      var ex = x + sd * 9 * s;
      glow(c, ex, y, 14 * s, col, 0.45);
      c.save(); c.translate(ex, y); c.scale(1, blink);
      circ(c, 0, 0, 5 * s, col, null);
      circ(c, lk * 0.5, 0, 2.6 * s, '#fff1f2', null);
      c.restore();
    });
  }
  // Robot de práctica pequeñito (verde, con diana en el pecho), para el fondo
  function robotPracticaMini(c, x, piesY, s, t, seed) {
    c.save(); c.translate(x, piesY); c.scale(s, s);
    var bob = Math.abs(Math.sin(t * 4 + seed)) * 2;
    rf(c, -9, -10, 7, 10, 3, '#4b7a5c', SOFT, 2); rf(c, 2, -10, 7, 10, 3, '#4b7a5c', SOFT, 2);
    rf(c, -14, -36 - bob, 28, 28, 9, '#5fb37c', SOFT, 2.4);
    circ(c, 0, -22 - bob, 8, '#ffffff', SOFT, 1.5); circ(c, 0, -22 - bob, 5, '#e05a5a', null); circ(c, 0, -22 - bob, 2.2, '#ffffff', null);
    rf(c, -10, -50 - bob, 20, 14, 7, '#7ccf97', SOFT, 2);
    circ(c, 0, -44 - bob, 3.4, '#d9ffe6', null);
    rf(c, -21, -32 - bob, 8, 7, 3.5, '#f59e0b', SOFT, 1.5); rf(c, 13, -32 - bob, 8, 7, 3.5, '#f59e0b', SOFT, 1.5);
    c.restore();
  }
  // Estandarte del equipo: verde, estrella dorada y los 4 colores de los héroes
  function estandarteEquipo(c, x, y, w, h, t, phase, alpha) {
    c.save(); c.globalAlpha = alpha === undefined ? 1 : alpha;
    var sw = Math.sin(t * 2 + (phase || 0)) * w * 0.07;
    rf(c, x - w * 0.62, y - 6, w * 1.24, 9, 4, '#a07d4a', SOFT, 2.5);
    c.beginPath();
    c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y);
    c.quadraticCurveTo(x + w / 2 + sw, y + h * 0.5, x + w / 2 + sw * 1.6, y + h);
    c.lineTo(x + sw * 1.6, y + h * 0.82);
    c.lineTo(x - w / 2 + sw * 1.6, y + h);
    c.quadraticCurveTo(x - w / 2 + sw, y + h * 0.5, x - w / 2, y);
    c.closePath();
    c.fillStyle = '#2f9e5b'; c.fill(); c.strokeStyle = SOFT; c.lineWidth = 2.5; c.stroke();
    var cy = y + h * 0.38, cx = x + sw * 0.7, R = w * 0.3;
    poly(c, starPts(cx, cy, R * 0.75, R * 0.33, 5, 0), '#f6d365', SOFT, 1.5);
    var cols = [heroCol('director', '#60a5fa'), heroCol('falcon', '#4ade80'), heroCol('mikey', '#f97316'), heroCol('peter', '#facc15')];
    for (var i = 0; i < 4; i++) {
      var a = -PI / 2 + PI / 4 + i * PI / 2;
      circ(c, cx + Math.cos(a) * R * 1.1, cy + Math.sin(a) * R * 1.1, w * 0.07, cols[i], SOFT, 1.2);
    }
    c.restore();
  }
  // Fortaleza flotante (la de Dark Secuaz, ahora base del equipo: tejados verdes)
  function fortaleza(c, cx, baseY, s, P, t) {
    c.save(); c.translate(cx, baseY); c.scale(s, s);
    var L = P.line, lw = 3;
    poly(c, [[-200, 0], [200, 0], [160, 42], [80, 96], [0, 134], [-86, 92], [-160, 46]], P.rock, L, lw);
    c.fillStyle = P.rockD;
    c.beginPath(); c.moveTo(-60, 60); c.lineTo(0, 134); c.lineTo(30, 70); c.closePath(); c.fill();
    // cascadita de la isla
    c.fillStyle = P.cascada || 'rgba(190,230,255,0.7)'; c.fillRect(110, 20, 10, 60 + Math.sin(t * 3) * 2);
    rf(c, -168, -92, 336, 96, 8, P.stone, L, lw);
    for (var i = 0; i < 9; i++) rf(c, -168 + i * 37.5 + 4, -110, 26, 22, 4, P.stone, L, lw);
    c.strokeStyle = P.mortar; c.lineWidth = 2;
    for (var r = 0; r < 3; r++) { c.beginPath(); c.moveTo(-160, -62 + r * 30); c.lineTo(160, -62 + r * 30); c.stroke(); }
    [-160, 160].forEach(function (tx, k) {
      rf(c, tx - 30, -176, 60, 180, 12, P.stoneL, L, lw);
      poly(c, [[tx - 40, -172], [tx, -236], [tx + 40, -172]], P.roof, L, lw);
      line(c, tx, -236, tx, -262, L, 3);
      var wv = Math.sin(t * 3 + k) * 4;
      poly(c, [[tx, -262], [tx + 28, -256 + wv], [tx, -246]], P.flag, L, 2);
      if (P.luz) glow(c, tx, -127, 40, P.luz, 0.7 + 0.15 * Math.sin(t * 2 + k));
      rf(c, tx - 9, -140, 18, 26, 9, P.window, L, 2);
    });
    if (P.luz) {   // de noche: más ventanas encendidas en el torreón y la muralla
      [-30, 30].forEach(function (wx) { glow(c, wx, -150, 30, P.luz, 0.65); rf(c, wx - 8, -162, 16, 22, 8, P.window, L, 2); });
      [-55, 55].forEach(function (wx) { glow(c, wx, -50, 28, P.luz, 0.6); rf(c, wx - 8, -60, 16, 20, 8, P.window, L, 2); });
    }
    rf(c, -56, -196, 112, 120, 16, P.stoneL, L, lw);
    c.beginPath(); c.arc(0, -196, 50, PI, 0); c.closePath();
    c.fillStyle = P.roof; c.fill(); c.strokeStyle = L; c.lineWidth = lw; c.stroke();
    c.save(); c.globalAlpha = 0.45; circ(c, 0, -188, 18, P.eye, null); c.restore();
    circ(c, 0, -188, 10, P.eye, L, 2.5);
    c.beginPath(); c.moveTo(-30, 4); c.lineTo(-30, -44); c.arc(0, -44, 30, PI, 0); c.lineTo(30, 4); c.closePath();
    c.fillStyle = P.gate; c.fill(); c.strokeStyle = L; c.lineWidth = lw; c.stroke();
    poly(c, starPts(0, -112, 20, 8, 5, 0), P.bronze, L, 2);
    estandarteEquipo(c, -96, -88, 34, 62, t, 0, 1);
    estandarteEquipo(c, 96, -88, 34, 62, t, 1.3, 1);
    c.restore();
  }
  var BASE_FORT = { rock: '#a39dc2', rockD: '#8f88ad', stone: '#cdc8e6', stoneL: '#dad6ef', mortar: 'rgba(26,26,46,0.13)',
    roof: '#5aa877', flag: '#5fd08a', bronze: '#e7c36a', eye: '#a7f3c0', gate: '#9790ba', window: '#9790ba',
    line: 'rgba(60,62,100,0.6)' };

  // Versión de NOCHE de la base (fiesta final, s3_final): misma forma, otros colores.
  var BASE_FORT_NOCHE = { rock: '#4d4c80', rockD: '#3f3d6e', stone: '#6a6aa0', stoneL: '#7878ad', mortar: 'rgba(10,10,30,0.22)',
    roof: '#2f7350', flag: '#4fbf7a', bronze: '#e7c36a', eye: '#a7f3c0', gate: '#3a3868', window: '#fde68a',
    line: 'rgba(14,16,44,0.75)', luz: '#fde68a', cascada: 'rgba(150,180,240,0.55)' };
  var CIELO_DIA = { cielo: [[0, '#4f9be0'], [0.5, '#9ccff1'], [1, '#e4f4fc']], nubeLejos: 'rgba(255,255,255,0.72)',
    isla: '#a9a3c9', torre: '#c8c2e2', tejado: '#7bbf92', islaL: 'rgba(60,60,110,0.4)', fort: BASE_FORT,
    bruma: 'rgba(214,236,250,0.22)', nube: '#f7fbff', nubeL: 'rgba(130,160,205,0.45)', muro: '#c3bcdf',
    juntas: 'rgba(70,60,120,0.18)', brumaBaja: [[0, 'rgba(228,244,252,0)'], [1, 'rgba(228,244,252,0.6)']],
    mar: '#ffffff', marL: 'rgba(130,160,205,0.5)' };
  var CIELO_NOCHE = { cielo: [[0, '#0b1238'], [0.55, '#1c2560'], [1, '#34407e']], nubeLejos: 'rgba(70,82,140,0.55)',
    isla: '#45457a', torre: '#5c5c94', tejado: '#2f7350', islaL: 'rgba(14,16,44,0.6)', fort: BASE_FORT_NOCHE,
    bruma: 'rgba(20,28,80,0.12)', nube: '#4b5596', nubeL: 'rgba(16,20,56,0.55)', muro: '#565490',
    juntas: 'rgba(14,12,40,0.3)', brumaBaja: [[0, 'rgba(40,52,110,0)'], [1, 'rgba(40,52,110,0.55)']],
    mar: '#6d78b4', marL: 'rgba(20,24,64,0.6)', noche: true };

  // ===========================================================================
  //  FONDO 1 — BASE DEL CIELO DEL EQUIPO  bgBaseCielo(c, camX, t, {noche})
  //  o.noche === true → de noche: cielo azul marino con estrellas, luna llena donde
  //  estaba el sol, nubes oscuras, ventanas y farolillos encendidos (fiesta final).
  //  Sin el 4.º argumento es exactamente el fondo de día de siempre.
  // ===========================================================================
  P2.fn.bgBaseCielo = function (c, camX, t, o) {
    camX = num(camX, 0); t = num(t, now());
    var K = (o && o.noche === true) ? CIELO_NOCHE : CIELO_DIA;
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, H, K.cielo);
      c.fillRect(0, 0, W, H);
      if (K.noche) {
        // estrellas que parpadean (fijas en pantalla: están infinitamente lejos)
        for (var e = 0; e < 70; e++) {
          var ex = hash(e * 1.7) * W, ey = hash(e * 2.9) * 330, tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (1 + hash(e) * 2) + e));
          if (Math.abs(ex - 830) < 70 && Math.abs(ey - 84) < 70) continue;
          if (hash(e * 5.1) > 0.82) sparkle(c, ex, ey, 5 + hash(e * 3) * 3, '#fef9c3', tw);
          else { c.save(); c.globalAlpha = tw * 0.85; circ(c, ex, ey, 1.2 + hash(e * 4.4) * 1.3, '#fffbe8', null); c.restore(); }
        }
        // luna llena donde estaba el sol, con halo suave y cráteres
        glow(c, 830, 84, 120, 'rgba(254,249,195,0.9)', 0.22);
        circ(c, 830, 84, 50, 'rgba(254,249,195,0.25)', null);
        circ(c, 830, 84, 38, '#fef9c3', '#fde68a', 3);
        circ(c, 816, 74, 8, 'rgba(214,200,140,0.45)', null);
        circ(c, 844, 96, 6, 'rgba(214,200,140,0.45)', null);
        circ(c, 840, 70, 4, 'rgba(214,200,140,0.4)', null);
      } else {
        // sol con rayos lentos
        c.save(); c.translate(830, 84); c.rotate(t * 0.05);
        c.globalAlpha = 0.16; c.fillStyle = '#fffbe0';
        for (var r = 0; r < 10; r++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(0, 0); c.lineTo(220, -24); c.lineTo(220, 24); c.closePath(); c.fill(); }
        c.restore();
        circ(c, 830, 84, 52, 'rgba(255,250,220,0.6)', null);
        circ(c, 830, 84, 36, '#fff8d6', null);
      }
      // nubes lejanas
      slots(camX * 0.03 + t * 3, 300, function (i, x) {
        var y = 70 + hash(i * 3) * 120, s = 0.5 + hash(i * 5) * 0.4;
        puff(c, cloudK(x + 60, y, s), K.nubeLejos, null);
      });
      // islotes lejanos con torrecitas (y un dron amigo de vez en cuando)
      slots(camX * 0.06, 520, function (i, x) {
        if (hash(i * 9.3) < 0.35) return;
        var ix = x + 120 + hash(i) * 200, iy = 150 + hash(i * 2.2) * 90 + Math.sin(t * 0.7 + i) * 4, s = 0.35 + hash(i * 4) * 0.15;
        c.save(); c.translate(ix, iy); c.scale(s, s);
        poly(c, [[-70, 0], [70, 0], [40, 30], [0, 62], [-40, 28]], K.isla, K.islaL, 3);
        rf(c, -20, -52, 40, 52, 8, K.torre, K.islaL, 3);
        poly(c, [[-26, -50], [0, -84], [26, -50]], K.tejado, K.islaL, 3);
        if (K.noche) { glow(c, 0, -26, 30, 'rgba(253,230,138,0.9)', 0.35); rf(c, -6, -36, 12, 16, 6, '#fde68a', K.islaL, 2); }
        c.restore();
      });
      // la base del equipo (la fortaleza del cielo de Dark Secuaz)
      slots(camX * 0.09, 1500, function (i, x) {
        fortaleza(c, x + 760, 318 + Math.sin(t * 0.8 + i) * 4, 0.72, K.fort, t);
      });
      c.fillStyle = K.bruma; c.fillRect(0, 0, W, H);   // bruma de distancia
      // nubes medianas
      slots(camX * 0.16 + t * 6, 420, function (i, x) {
        var y = 120 + hash(i * 7) * 150, s = 0.7 + hash(i * 9) * 0.4;
        puff(c, cloudK(x + 80, y, s), K.nube, K.nubeL, 3);
      });
      // PATIO DE ENTRENAMIENTO: muralla con almenas, estandartes y robots de práctica
      var wallY = 392, off = camX * 0.26;
      c.fillStyle = K.muro; c.fillRect(0, wallY, W, H - wallY);
      slots(off, 64, function (i, x) { rf(c, x + 8, wallY - 22, 40, 28, 5, K.muro, SOFT, 2.5); });
      c.fillStyle = K.muro; c.fillRect(0, wallY, W, 8);
      line(c, 0, wallY, W, wallY, SOFT, 2.5);
      c.strokeStyle = K.juntas; c.lineWidth = 2;
      for (var rw = 0; rw < 5; rw++) {
        var by = wallY + 22 + rw * 30;
        c.beginPath(); c.moveTo(0, by); c.lineTo(W, by); c.stroke();
        slots(off, 80, function (i, x) { c.beginPath(); c.moveTo(x + (rw % 2) * 40, by); c.lineTo(x + (rw % 2) * 40, by + 30); c.stroke(); });
      }
      if (K.noche) {
        // guirnalda de farolillos de fiesta colgada sobre las almenas
        slots(off, 160, function (i, x) {
          c.strokeStyle = 'rgba(14,16,44,0.7)'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x, wallY - 26); c.quadraticCurveTo(x + 80, wallY - 4, x + 160, wallY - 26); c.stroke();
          var fc = ['#fde68a', '#fca5a5', '#86efac', '#93c5fd'];
          for (var k = 1; k < 4; k++) {
            var fx = x + k * 40, fy = wallY - 26 + Math.sin(k / 4 * PI) * 16 + 4, col = fc[(i + k) % 4];
            glow(c, fx, fy + 4, 18, col, 0.35 + 0.15 * Math.sin(t * 3 + k + i));
            rf(c, fx - 5, fy, 10, 12, 5, col, SOFT, 1.5);
          }
        });
      }
      slots(off, 330, function (i, x) {
        estandarteEquipo(c, x + 90, wallY + 18, 40, 76, t, i * 1.3, K.noche ? 0.8 : 0.9);
        // saco de entrenamiento colgado de su poste (NO es una diana: la única
        // diana roja y blanca del capítulo es la del puzle, P2.fn.diana)
        if (hash(i * 3.3) > 0.4) {
          var dx = x + 230, sw = Math.sin(t * 1.3 + i) * 0.06;
          c.save(); c.globalAlpha = K.noche ? 0.6 : 0.8;
          rf(c, dx - 3, wallY - 74, 6, 54, 2, '#a68a64', SOFT, 2);
          line(c, dx - 3, wallY - 72, dx + 14, wallY - 72, SOFT, 3);
          c.translate(dx + 12, wallY - 72); c.rotate(sw);
          line(c, 0, 0, 0, 6, SOFT, 1.5);
          rf(c, -7, 6, 14, 26, 6, '#cdb894', SOFT, 2);
          line(c, -6, 14, 6, 14, 'rgba(90,70,40,0.35)', 1.5);
          line(c, -6, 24, 6, 24, 'rgba(90,70,40,0.35)', 1.5);
          c.restore();
        }
      });
      // robots de práctica paseando por el adarve
      slots(off, 470, function (i, x) {
        if (hash(i * 5.7) < 0.3) return;
        var rx = x + 160 + Math.sin(t * 0.6 + i * 2) * 40;
        robotPracticaMini(c, rx, wallY - 20, 0.55, t, i);
      });
      // bruma baja + mar de nubes cercano
      c.fillStyle = vgrad(c, 400, H, K.brumaBaja);
      c.fillRect(0, 400, W, H - 400);
      var off3 = camX * 0.5 + t * 10;
      slots(off3, 170, function (i, x) {
        var rad = 40 + hash(i * 2.2) * 22;
        puff(c, [[x + 80, H - 8 + hash(i) * 12, rad], [x + 20, H + 6, rad * 0.8], [x + 140, H + 6, rad * 0.7]], K.mar, K.marL, 3);
      });
    });
  };

  // ===========================================================================
  //  FONDO 2 — TÚNELES BAJO TIERRA  bgTuneles(c, scroll, t)
  //  sueloTunel(c, scroll, sueloY, t)    techoTunel(c, scroll, techoY, t)
  // ===========================================================================
  function cristales(c, x, y, s, t, seed, dir) {
    var cols = [['#5eead4', '#99f6e4'], ['#c084fc', '#e9d5ff'], ['#f472b6', '#fbcfe8']][Math.floor(hash(seed) * 3)];
    glow(c, x, y - dir * 14 * s, 46 * s, cols[0], 0.28 + 0.12 * Math.sin(t * 2 + seed));
    for (var k = 0; k < 4; k++) {
      var a = (k - 1.5) * 0.36 + (hash(seed + k) - 0.5) * 0.2, len = (20 + hash(seed * 3 + k) * 22) * s, wd = (6 + hash(seed + k * 7) * 4) * s;
      c.save(); c.translate(x + (k - 1.5) * 8 * s, y); c.rotate(a + (dir < 0 ? PI : 0));
      poly(c, [[-wd, 0], [-wd, -len * 0.75], [0, -len], [wd, -len * 0.75], [wd, 0]], cols[0], SOFT, 2);
      poly(c, [[-wd * 0.3, -2], [-wd * 0.3, -len * 0.72], [wd * 0.3, -len * 0.85], [wd * 0.3, -2]], cols[1], null);
      c.restore();
    }
  }
  function siluetaRobovill(c, x, y, s, t) {
    // Robovill excavando a lo lejos: silueta con el taladro girando y el ojo-luz.
    c.save(); c.translate(x, y); c.scale(s, s);
    var col = '#2a1d31', colL = '#3d2c45';
    // polvo
    for (var k = 0; k < 6; k++) {
      var ph = mod(t * 0.5 + k / 6, 1);
      c.globalAlpha = 0.35 * (1 - ph); circ(c, 60 + ph * 70 * Math.cos(k), 30 - ph * 50 + k * 4, 14 + ph * 24, '#5a4550', null);
    }
    c.globalAlpha = 1;
    // alas plegadas
    poly(c, [[-40, -40], [-110, -70], [-96, -30], [-118, -10], [-60, 0]], col, null);
    // cuerpo
    circ(c, 0, 0, 62, col, null);
    rf(c, -36, 40, 26, 50, 8, col, null); rf(c, 10, 40, 26, 50, 8, col, null);
    // taladro (apunta abajo a la derecha) con rayas que giran
    c.save(); c.translate(48, 34); c.rotate(0.75);
    poly(c, [[-26, 0], [26, 0], [0, 88]], colL, null);
    c.beginPath(); c.moveTo(-26, 0); c.lineTo(26, 0); c.lineTo(0, 88); c.closePath(); c.clip();
    c.strokeStyle = col; c.lineWidth = 7;
    var sp = mod(t * 120, 22);
    for (var yy = -22 + sp; yy < 100; yy += 22) { c.beginPath(); c.moveTo(-30, yy); c.lineTo(30, yy + 12); c.stroke(); }
    c.restore();
    // ojo-luz y la gema copia, tenues
    glow(c, 22, -16, 22, 'rgba(248,113,113,0.9)', 0.5 + 0.2 * Math.sin(t * 3));
    circ(c, 22, -16, 6, '#f87171', null);
    glow(c, -6, 14, 18, 'rgba(236,72,153,0.9)', 0.35);
    c.restore();
  }
  // o.silueta === false → no pinta la silueta lejana de Robovill (moto.js la apaga
  // mientras el Robovill de verdad excava en primer plano: así no se ven dos).
  P2.fn.bgTuneles = function (c, scroll, t, o) {
    scroll = num(scroll, 0); t = num(t, now());
    var conSilueta = !(o && o.silueta === false);
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, H, [[0, '#231a2c'], [0.5, '#33263a'], [1, '#3f2e31']]);
      c.fillRect(0, 0, W, H);
      // pared de roca lejana con estratos
      slots(scroll * 0.06, 230, function (i, x) {
        var cy = 150 + hash(i * 2.1) * 260, r = 90 + hash(i) * 70;
        circ(c, x + 115, cy, r, '#3a2b40', null);
        c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 6;
        c.beginPath(); c.arc(x + 115, cy, r - 10, PI * 1.1, PI * 1.6); c.stroke();
      });
      c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 3;
      for (var s = 0; s < 6; s++) {
        var sy = 120 + s * 62;
        c.beginPath();
        for (var sx = 0; sx <= W; sx += 30) { var yy = sy + Math.sin((sx + scroll * 0.08) * 0.012 + s) * 10; if (sx === 0) c.moveTo(sx, yy); else c.lineTo(sx, yy); }
        c.stroke();
      }
      // galerías lejanas (agujeros oscuros con lucecitas)
      slots(scroll * 0.1, 520, function (i, x) {
        if (hash(i * 4.1) < 0.4) return;
        var hx = x + 200, hy = 230 + hash(i * 3) * 120;
        elli(c, hx, hy, 46, 36, '#170f1d', 'rgba(255,255,255,0.06)', 4);
        glow(c, hx, hy + 6, 22, 'rgba(253,224,71,0.8)', 0.25);
      });
      // a veces: la silueta de Robovill excavando a lo lejos
      if (conSilueta) slots(scroll * 0.12, 2300, function (i, x) {
        if (hash(i * 7.7) < 0.5) return;
        siluetaRobovill(c, x + 1150, 250 + Math.sin(t * 2.5) * 3, 0.9, t);
      });
      // cristales que brillan
      slots(scroll * 0.22, 260, function (i, x) {
        if (hash(i * 6.6) < 0.25) return;
        var arriba = hash(i * 8.8) > 0.5;
        cristales(c, x + 130, arriba ? 80 : 462, 0.9, t, i, arriba ? -1 : 1);
      });
      // vigas de madera con lámparas de minero
      slots(scroll * 0.45, 440, function (i, x) {
        var px = x + 120;
        rf(c, px - 9, 60, 18, 420, 4, '#7a5236', SOFT, 2.5);
        rf(c, px + 171, 60, 18, 420, 4, '#7a5236', SOFT, 2.5);
        rf(c, px - 20, 56, 220, 20, 5, '#8d6142', SOFT, 2.5);
        c.strokeStyle = 'rgba(60,30,10,0.4)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(px - 12, 66); c.lineTo(px + 190, 66); c.stroke();
        line(c, px + 10, 76, px + 60, 120, '#6b462e', 8);  // tornapuntas
        line(c, px + 170, 76, px + 120, 120, '#6b462e', 8);
        var lx = px + 90, sw = Math.sin(t * 1.4 + i) * 0.08;
        c.save(); c.translate(lx, 76); c.rotate(sw);
        line(c, 0, 0, 0, 34, '#2b1d1a', 2);
        glow(c, 0, 44, 90, 'rgba(255,214,140,0.7)', 0.35);
        rf(c, -9, 32, 18, 16, 5, '#f6c453', O, 2);
        rf(c, -11, 30, 22, 5, 2, '#5b4636', O, 1.5);
        c.restore();
      });
      // motas de polvo
      for (var m = 0; m < 22; m++) {
        var mx = mod(hash(m) * 1100 - scroll * 0.6 - t * 12, 1100) - 70, my = mod(hash(m * 3) * 500 + t * 9, 500) + 20;
        circ(c, mx, my, 1.6, 'rgba(255,235,200,0.25)', null);
      }
      c.fillStyle = vgrad(c, 360, H, [[0, 'rgba(90,60,50,0)'], [1, 'rgba(90,60,50,0.45)']]);
      c.fillRect(0, 360, W, H - 360);
    });
  };
  P2.fn.sueloTunel = function (c, scroll, sueloY, t) {
    scroll = num(scroll, 0); t = num(t, now()); sueloY = num(sueloY, 456);
    if (sueloY >= H) return;
    safe(c, function () {
      var hgt = H - sueloY;
      c.fillStyle = vgrad(c, sueloY, H, [[0, '#7a5640'], [1, '#3f2a22']]);
      c.fillRect(0, sueloY, W, hgt);
      // estratos
      c.strokeStyle = 'rgba(40,20,10,0.3)'; c.lineWidth = 3;
      for (var s = 1; s < 4; s++) {
        var y0 = sueloY + s * hgt / 4;
        c.beginPath();
        for (var x = 0; x <= W; x += 24) { var yy = y0 + Math.sin((x + scroll) * 0.02 + s * 2) * 3; if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy); }
        c.stroke();
      }
      // piedras incrustadas
      for (var g = 0; g < 18; g++) {
        var gx = mod(hash(g) * 1400 - scroll, 1400) - 200;
        var gy = sueloY + 18 + hash(g * 7) * Math.max(4, hgt - 26);
        elli(c, gx, gy, 9 + hash(g * 3) * 8, 5 + hash(g * 5) * 4, '#9a7a62', 'rgba(26,26,46,0.45)', 2);
      }
      // corteza de arriba con bultos (lo que se pisa)
      c.fillStyle = '#9b7353';
      c.fillRect(0, sueloY, W, 12);
      slots(scroll, 56, function (i, x) { elli(c, x + 28, sueloY + 2, 24, 7 + hash(i) * 3, '#9b7353', null); });
      line(c, 0, sueloY + 12, W, sueloY + 12, 'rgba(26,26,46,0.35)', 2);
      c.strokeStyle = O; c.lineWidth = 3;
      c.beginPath();
      for (var bx = 0; bx <= W; bx += 8) { var by = sueloY - 4 + Math.abs(Math.sin((bx + scroll) * PI / 56)) * -3; if (bx === 0) c.moveTo(bx, by + 4); else c.lineTo(bx, by + 4); }
      c.stroke();
      // cristalitos que asoman en el suelo
      slots(scroll, 380, function (i, x) {
        if (hash(i * 2.9) < 0.5) return;
        var cx = x + 100;
        poly(c, [[cx - 6, sueloY + 2], [cx - 2, sueloY - 12], [cx + 3, sueloY + 2]], '#5eead4', O, 1.5);
        poly(c, [[cx + 2, sueloY + 2], [cx + 7, sueloY - 7], [cx + 10, sueloY + 2]], '#a78bfa', O, 1.5);
      });
    });
  };
  P2.fn.techoTunel = function (c, scroll, techoY, t) {
    scroll = num(scroll, 0); t = num(t, now()); techoY = num(techoY, 64);
    if (techoY <= 0) return;
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, techoY, [[0, '#24181f'], [1, '#4a3432']]);
      c.fillRect(0, 0, W, techoY);
      // estalactitas que cuelgan (bajan hasta techoY + 10…30)
      slots(scroll, 92, function (i, x) {
        var len = 12 + hash(i * 1.7) * 22, wd = 16 + hash(i * 2.3) * 14, cx = x + 46;
        poly(c, [[cx - wd, techoY - 4], [cx + wd, techoY - 4], [cx + wd * 0.2, techoY + len * 0.7], [cx, techoY + len], [cx - wd * 0.3, techoY + len * 0.6]], '#5a403b', O, 2.5);
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.beginPath(); c.moveTo(cx - wd * 0.6, techoY - 2); c.lineTo(cx - wd * 0.15, techoY - 2); c.lineTo(cx - 2, techoY + len * 0.7); c.closePath(); c.fill();
        // gota que cae de vez en cuando
        if (hash(i * 4.4) > 0.6) {
          var ph = mod(t * 0.7 + hash(i) * 3, 1.6);
          if (ph < 1) circ(c, cx, techoY + len + ph * ph * 120, 2.4, 'rgba(160,210,240,0.8)', null);
        }
      });
      // raíces
      slots(scroll, 300, function (i, x) {
        if (hash(i * 9.1) < 0.5) return;
        var rx = x + 150;
        c.strokeStyle = '#6d4c35'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(rx, techoY - 6); c.quadraticCurveTo(rx + 8, techoY + 10, rx - 2, techoY + 24 + Math.sin(t + i) * 2); c.stroke();
      });
      c.fillStyle = '#5a403b'; c.fillRect(0, techoY - 10, W, 8);
      line(c, 0, techoY - 2, W, techoY - 2, 'rgba(26,26,46,0.5)', 2);
      // piedras del techo
      for (var g = 0; g < 14; g++) {
        var gx = mod(hash(g * 1.3) * 1300 - scroll, 1300) - 160, gy = 8 + hash(g * 5) * Math.max(4, techoY - 26);
        elli(c, gx, gy, 10 + hash(g) * 8, 6, '#5d443d', 'rgba(26,26,46,0.35)', 2);
      }
    });
  };

  // ===========================================================================
  //  FONDO 3 — RÍO SUBTERRÁNEO  bgRio(c, scroll, t, {nivelAgua})
  //  aguaFrente(c, scroll, nivelAgua, t)
  // ===========================================================================
  function pecesLejanos(c, x, y, s, t, seed) {
    for (var k = 0; k < 4; k++) {
      var fx = x + k * 18 * s + Math.sin(t * 2 + k) * 3, fy = y + ((k % 2) ? 8 : -6) * s;
      c.save(); c.translate(fx, fy); c.scale(s, s);
      elli(c, 0, 0, 8, 4, 'rgba(20,60,110,0.55)', null);
      poly(c, [[-7, 0], [-13, -5], [-13, 5]], 'rgba(20,60,110,0.55)', null);
      c.restore();
    }
  }
  P2.fn.bgRio = function (c, scroll, t, o) {
    scroll = num(scroll, 0); t = num(t, now());
    var nivel = num(o && o.nivelAgua, 200);
    safe(c, function () {
      // ---- aire de la caverna ----
      c.fillStyle = vgrad(c, 0, Math.max(10, nivel), [[0, '#1b2238'], [1, '#2c4560']]);
      c.fillRect(0, 0, W, Math.max(0, nivel));
      // bóveda lejana con estalactitas
      slots(scroll * 0.15, 120, function (i, x) {
        var len = 30 + hash(i * 1.9) * 60, wd = 26 + hash(i * 2.7) * 20, cx = x + 60;
        poly(c, [[cx - wd, -4], [cx + wd, -4], [cx + 3, len], [cx - 4, len * 0.9]], '#2a3653', null);
      });
      // aberturas con luz y hongos brillantes en las repisas
      slots(scroll * 0.25, 420, function (i, x) {
        var lx = x + 180, ly = nivel - 40 - hash(i * 3) * 50;
        if (ly < 30) return;
        rf(c, lx - 60, ly, 120, 16, 8, '#33405e', SOFT, 2);
        for (var m = 0; m < 3; m++) {
          var mx = lx - 30 + m * 26, mh = 10 + hash(i * 7 + m) * 8;
          glow(c, mx, ly - mh, 20, 'rgba(94,234,212,0.9)', 0.3 + 0.15 * Math.sin(t * 2 + m + i));
          line(c, mx, ly, mx, ly - mh, '#cbd5e1', 3);
          elli(c, mx, ly - mh, 8, 5, '#5eead4', SOFT, 1.5);
          circ(c, mx - 2, ly - mh - 1, 1.5, '#ecfeff', null);
        }
      });
      // estalactitas cercanas (más grandes)
      slots(scroll * 0.4, 230, function (i, x) {
        if (hash(i * 3.1) < 0.35) return;
        var len = 40 + hash(i * 1.3) * Math.max(10, nivel * 0.35), wd = 22 + hash(i * 2.1) * 14, cx = x + 110;
        poly(c, [[cx - wd, -4], [cx + wd, -4], [cx + 4, len], [cx - 3, len * 0.92]], '#3b4a6b', SOFT, 2.5);
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.beginPath(); c.moveTo(cx - wd * 0.7, 0); c.lineTo(cx - wd * 0.2, 0); c.lineTo(cx - 2, len * 0.85); c.closePath(); c.fill();
      });
      if (nivel >= H) return;
      // ---- agua ----
      var top = Math.max(0, nivel);
      c.fillStyle = vgrad(c, top, H, [[0, '#2f8cc6'], [0.45, '#1f62a0'], [1, '#173f75']]);
      c.fillRect(0, top, W, H - top);
      // rocas sumergidas lejanas
      slots(scroll * 0.15, 260, function (i, x) {
        var r = 60 + hash(i * 2.5) * 60;
        circ(c, x + 130, H - 20 + hash(i) * 30, r, 'rgba(18,58,104,0.75)', null);
      });
      // rayos de luz desde la superficie
      c.save();
      for (var rIdx = 0; rIdx < 6; rIdx++) {
        var rx = mod(rIdx * 190 - scroll * 0.2 + Math.sin(t * 0.4 + rIdx) * 20, W + 200) - 100;
        c.globalAlpha = 0.07 + 0.05 * Math.sin(t * 1.3 + rIdx * 1.7);
        c.fillStyle = '#d6f1ff';
        c.beginPath(); c.moveTo(rx, top); c.lineTo(rx + 50, top); c.lineTo(rx + 150, H); c.lineTo(rx + 60, H); c.closePath(); c.fill();
      }
      c.restore();
      // pececitos lejanos (amigos, no enemigos)
      slots(scroll * 0.12 - t * 20, 600, function (i, x) {
        if (hash(i * 5.5) < 0.4) return;
        pecesLejanos(c, x + 200, top + 80 + hash(i * 2) * Math.max(10, H - top - 160), 0.9, t, i);
      });
      // algas que se mecen
      slots(scroll * 0.55, 150, function (i, x) {
        if (hash(i * 4.7) < 0.3) return;
        var ax = x + 70, hgt = 50 + hash(i * 8) * 70;
        for (var k = 0; k < 3; k++) {
          var bx = ax + k * 10, sw = Math.sin(t * 1.6 + i + k) * 12;
          c.strokeStyle = SOFT; c.lineWidth = 9;
          c.beginPath(); c.moveTo(bx, H); c.quadraticCurveTo(bx + sw, H - hgt * 0.5, bx + sw * 1.4, H - hgt + k * 8); c.stroke();
          c.strokeStyle = k === 1 ? '#3fa37a' : '#2f8a66'; c.lineWidth = 6; c.stroke();
        }
      });
      // fondo de arena con piedrecitas
      c.fillStyle = '#365d7d'; c.beginPath(); c.moveTo(0, H);
      for (var sx = 0; sx <= W + 20; sx += 20) c.lineTo(sx, H - 20 + Math.sin((sx + scroll * 0.8) * 0.015) * 6);
      c.lineTo(W, H); c.closePath(); c.fill();
      // burbujas que suben
      for (var b = 0; b < 26; b++) {
        var period = 4 + hash(b * 3) * 3, ph = mod(t / period + hash(b), 1);
        var bxp = mod(hash(b * 7) * 1200 - scroll * 0.5, 1200) - 120 + Math.sin(t * 2 + b) * 4;
        var byp = H - ph * (H - top);
        if (byp < top + 4) continue;
        circ(c, bxp, byp, 2 + hash(b) * 3, 'rgba(220,245,255,0.18)', 'rgba(220,245,255,0.6)', 1.2);
      }
      // brillo de la superficie vista desde abajo
      c.fillStyle = 'rgba(190,235,255,0.35)'; c.fillRect(0, top, W, 5);
    });
  };
  P2.fn.aguaFrente = function (c, scroll, nivelAgua, t) {
    scroll = num(scroll, 0); t = num(t, now());
    var nivel = num(nivelAgua, 200);
    if (nivel >= H + 20 || nivel < -20) return;
    safe(c, function () {
      function waveY(x) { return nivel + Math.sin((x + scroll) * 0.03 + t * 2.2) * 3.5 + Math.sin((x + scroll * 1.3) * 0.071 - t * 3) * 1.6; }
      c.beginPath(); c.moveTo(0, waveY(0));
      for (var x = 8; x <= W; x += 8) c.lineTo(x, waveY(x));
      c.lineTo(W, nivel + 22); c.lineTo(0, nivel + 22); c.closePath();
      c.fillStyle = vgrad(c, nivel - 6, nivel + 22, [[0, 'rgba(160,220,250,0.55)'], [1, 'rgba(90,170,230,0)']]);
      c.fill();
      c.beginPath(); c.moveTo(0, waveY(0));
      for (var x2 = 8; x2 <= W; x2 += 8) c.lineTo(x2, waveY(x2));
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.5; c.stroke();
      // espuma
      for (var f = 0; f < 24; f++) {
        var fx = mod(hash(f) * 1100 - scroll, 1100) - 70;
        circ(c, fx, waveY(fx) - 1, 1.5 + hash(f * 3) * 2, 'rgba(255,255,255,0.7)', null);
      }
    });
  };

  // ===========================================================================
  //  FONDO 4 — LA SALIDA AL CIELO (vuelo)  bgSalidaCielo(c, scroll, t)
  //  scroll = px recorridos desde el despegue: en 0 se ve la boca de la cueva
  //  rodeándolo todo; hacia los 3000 px el cielo queda completamente abierto.
  // ===========================================================================
  P2.fn.bgSalidaCielo = function (c, scroll, t) {
    scroll = num(scroll, 0); t = num(t, now());
    var open = clamp(scroll / 3000, 0, 1), close = 1 - open;
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, H, [[0, '#3e8ad6'], [0.55, '#8fcdf3'], [1, '#ffe9c7']]);
      c.fillRect(0, 0, W, H);
      // sol grande que sube
      var sy = 330 - open * 120;
      c.save(); c.translate(700, sy); c.rotate(t * 0.04);
      c.globalAlpha = 0.18; c.fillStyle = '#fff6d0';
      for (var r = 0; r < 12; r++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(300, -26); c.lineTo(300, 26); c.closePath(); c.fill(); }
      c.restore();
      circ(c, 700, sy, 70, 'rgba(255,244,210,0.55)', null);
      circ(c, 700, sy, 46, '#fff6d6', null);
      // montañas lejanas con nieve
      slots(scroll * 0.04, 260, function (i, x) {
        var mh = 120 + hash(i * 3.7) * 110, mx = x + 130;
        poly(c, [[mx - 190, 450], [mx, 450 - mh], [mx + 190, 450]], '#8aa3cf', null);
        poly(c, [[mx - 42, 450 - mh + 46], [mx, 450 - mh], [mx + 42, 450 - mh + 46], [mx + 16, 450 - mh + 38], [mx, 450 - mh + 50], [mx - 18, 450 - mh + 38]], '#eef4ff', null);
      });
      // nubes
      slots(scroll * 0.12 + t * 5, 330, function (i, x) {
        var y = 70 + hash(i * 7) * 260, s = 0.6 + hash(i * 9) * 0.5;
        puff(c, cloudK(x + 80, y, s), '#f7fbff', 'rgba(130,160,205,0.45)', 3);
      });
      // colinas verdes y el río que sale de la cueva
      c.fillStyle = '#6fb27f'; c.beginPath(); c.moveTo(0, H);
      for (var hx = 0; hx <= W + 20; hx += 20) c.lineTo(hx, 460 + Math.sin((hx + scroll * 0.2) * 0.008) * 18 + Math.sin((hx + scroll * 0.2) * 0.021) * 8);
      c.lineTo(W, H); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(26,26,46,0.3)'; c.lineWidth = 2.5; c.stroke();
      c.strokeStyle = '#9fd8f5'; c.lineWidth = 14;
      c.beginPath();
      for (var rx = -20; rx <= W + 20; rx += 20) { var ry = 505 + Math.sin((rx + scroll * 0.2) * 0.01) * 14; if (rx === -20) c.moveTo(rx, ry); else c.lineTo(rx, ry); }
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3; c.stroke();
      // rayas de viento (¡velocidad!)
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
      slots(scroll * 1.2 + t * 160, 220, function (i, x) {
        var y = 50 + hash(i * 4.4) * 400;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60 + hash(i) * 50, y); c.stroke();
      });
      // la boca de la cueva (se abre al avanzar)
      if (close > 0.01) {
        var topT = 40 + 150 * close, botT = 30 + 120 * close;
        // interior oscuro a la izquierda que se aleja
        var archX = 380 - scroll * 0.32;
        if (archX > -120) {
          c.fillStyle = '#20263a';
          c.beginPath(); c.moveTo(-10, -10); c.lineTo(archX, -10);
          for (var ay = 0; ay <= H + 10; ay += 30) c.lineTo(archX - 40 * Math.sin(ay / H * PI) + hash(ay) * 18, ay);
          c.lineTo(-10, H + 10); c.closePath(); c.fill();
          c.strokeStyle = O; c.lineWidth = 3; c.stroke();
        }
        // techo de roca con estalactitas
        c.fillStyle = '#3a3550';
        c.beginPath(); c.moveTo(-10, -10); c.lineTo(W + 10, -10);
        for (var tx = W + 10; tx >= -10; tx -= 35) {
          var k = Math.floor((tx + scroll) / 35);
          c.lineTo(tx, topT * (0.75 + hash(k) * 0.5) + (k % 3 === 0 ? 26 * close : 0));
        }
        c.closePath(); c.fill(); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
        // suelo de roca de la boca
        c.fillStyle = '#433d5a';
        c.beginPath(); c.moveTo(-10, H + 10); c.lineTo(W + 10, H + 10);
        for (var gx = W + 10; gx >= -10; gx -= 40) {
          var kk = Math.floor((gx + scroll) / 40);
          c.lineTo(gx, H - botT * (0.7 + hash(kk * 3.3) * 0.5));
        }
        c.closePath(); c.fill(); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
        // cristales en el borde de la cueva
        c.save(); c.globalAlpha = close;
        slots(scroll, 240, function (i, x) { cristales(c, x + 90, H - botT * 0.6, 0.6, t, i, 1); });
        c.restore();
      }
    });
  };

  // ===========================================================================
  //  FONDO 5 — LA FÁBRICA OSCURA  bgFabricaOscura(c, camX, t)
  //  Guarida de Robovill: grande, oscura, luces rojas, cadenas, ojos en la sombra
  //  y carteles. Misterio sí, miedo no (colores violetas, ojos redondos, lámparas cálidas).
  // ===========================================================================
  function luzAlarma(c, x, y, t, seed) {
    var a = t * 1.6 + seed;
    rf(c, x - 14, y, 28, 10, 3, '#3b3550', SOFT, 2);
    c.save(); c.translate(x, y); c.rotate(a);
    c.globalAlpha = 0.12; c.fillStyle = '#ff6b6b';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(260, -40); c.lineTo(260, 40); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-260, -40); c.lineTo(-260, 40); c.closePath(); c.fill();
    c.restore();
    c.beginPath(); c.arc(x, y, 12, PI, 0); c.closePath();
    c.fillStyle = '#ef4444'; c.fill(); c.strokeStyle = SOFT; c.lineWidth = 2; c.stroke();
    circ(c, x - 4, y - 5, 3, '#fecaca', null);
    glow(c, x, y - 4, 30, 'rgba(248,113,113,0.9)', 0.35 + 0.2 * Math.sin(t * 3 + seed));
  }
  function cadena(c, x, y0, len, t, seed, gancho) {
    var sw = Math.sin(t * 0.9 + seed) * 0.05;
    c.save(); c.translate(x, y0); c.rotate(sw);
    for (var yy = 0; yy < len; yy += 13) {
      if ((yy / 13) % 2 === 0) elli(c, 0, yy, 4, 7.5, null, '#6b6585', 3);
      else rf(c, -1.5, yy - 7, 3, 14, 1.5, '#5a5474', null);
    }
    if (gancho) {
      c.strokeStyle = '#857fa0'; c.lineWidth = 4;
      c.beginPath(); c.arc(0, len + 9, 8, -PI * 0.5, PI * 0.95); c.stroke();
      if (gancho === 2) {
        // un mini-robot a medio hacer colgando (ojo apagado, "zzz")
        circ(c, 0, len + 30, 13, '#565071', SOFT, 2);
        rf(c, -13, len + 32, 26, 6, 3, '#6b2737', null);
        circ(c, 4, len + 26, 3.5, '#3f3a52', SOFT, 1.5);
        label(c, 'zzz', 18, len + 14, 9, '#c4b5fd', 'left');
      }
    }
    c.restore();
  }
  P2.fn.bgFabricaOscura = function (c, camX, t) {
    camX = num(camX, 0); t = num(t, now());
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, H, [[0, '#28223f'], [0.55, '#3a3152'], [1, '#4a3550']]);
      c.fillRect(0, 0, W, H);
      // pared del fondo: paneles enormes y ventanales con la luna
      slots(camX * 0.07, 300, function (i, x) {
        c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3;
        c.strokeRect(x + 6, 130, 288, 420);
        for (var r = 0; r < 4; r++) { circ(c, x + 18, 146 + r * 110, 3, 'rgba(0,0,0,0.25)', null); circ(c, x + 282, 146 + r * 110, 3, 'rgba(0,0,0,0.25)', null); }
        if (hash(i * 2.7) > 0.45) {
          var wx = x + 150;
          c.beginPath(); c.moveTo(wx - 46, 110); c.lineTo(wx - 46, 46); c.arc(wx, 46, 46, PI, 0); c.lineTo(wx + 46, 110); c.closePath();
          c.fillStyle = '#334a7a'; c.fill(); c.strokeStyle = SOFT; c.lineWidth = 3; c.stroke();
          c.save(); c.clip();
          for (var st = 0; st < 5; st++) sparkle(c, wx - 36 + hash(i + st) * 72, 10 + hash(i * 3 + st) * 80, 2.4, '#e0e7ff', 0.4 + 0.3 * Math.sin(t * 2 + st));
          if (hash(i * 5.3) > 0.5) { circ(c, wx + 18, 40, 13, '#fef3c7', null); circ(c, wx + 24, 36, 11, '#334a7a', null); }
          c.restore();
          line(c, wx, 0, wx, 110, SOFT, 3); line(c, wx - 46, 62, wx + 46, 62, SOFT, 3);
          c.save(); c.globalAlpha = 0.07; c.fillStyle = '#c7d2fe';
          c.beginPath(); c.moveTo(wx - 40, 110); c.lineTo(wx + 40, 110); c.lineTo(wx + 150, 540); c.lineTo(wx - 20, 540); c.closePath(); c.fill(); c.restore();
        }
      });
      // engranajes enormes en la sombra
      slots(camX * 0.12, 420, function (i, x) {
        var r = 60 + hash(i * 2.1) * 40, gy = 240 + hash(i * 3.3) * 120, dir = (i % 2) ? 1 : -1;
        gear(c, x + 160, gy, r, 11, t * 0.25 * dir * 60 / r, '#3a3150', 'rgba(0,0,0,0.35)');
      });
      // tubería alta con vapor
      var pOff = camX * 0.16;
      c.fillStyle = '#4b3f5e'; c.fillRect(0, 120, W, 16);
      line(c, 0, 120, W, 120, SOFT, 2.5); line(c, 0, 136, W, 136, SOFT, 2.5);
      slots(pOff, 170, function (i, x) {
        rf(c, x, 115, 14, 26, 3, '#5a4c70', SOFT, 2);
        if (hash(i * 4.4) > 0.6) {
          for (var k = 0; k < 4; k++) {
            var ph = mod(t * 0.35 + k / 4 + i * 0.3, 1);
            c.globalAlpha = 0.3 * (1 - ph); circ(c, x + 7 + ph * 20, 112 - ph * 70, 6 + ph * 16, '#c4b8d8', null);
          }
          c.globalAlpha = 1;
        }
      });
      // ojos que miran desde los rincones oscuros (parpadean, son curiosos)
      slots(camX * 0.22, 380, function (i, x) {
        if (hash(i * 6.1) < 0.3) return;
        var ax = x + 120, ay = 300 + hash(i * 1.9) * 80;
        c.beginPath(); c.moveTo(ax - 42, ay + 70); c.lineTo(ax - 42, ay); c.arc(ax, ay, 42, PI, 0); c.lineTo(ax + 42, ay + 70); c.closePath();
        c.fillStyle = '#16121f'; c.fill(); c.strokeStyle = 'rgba(160,140,200,0.25)'; c.lineWidth = 4; c.stroke();
        ojosSombra(c, ax, ay + 10, 1, t, i, hash(i * 2.2) > 0.5 ? '#fb7185' : '#fda4af');
        if (hash(i * 8.2) > 0.6) ojosSombra(c, ax + 20, ay + 40, 0.7, t + 1.3, i + 5, '#f9a8d4');
      });
      // carteles de Robovill
      slots(camX * 0.3, 520, function (i, x) {
        if (hash(i * 3.9) < 0.3) return;
        cartelRobovill(c, x + 300, 210 + hash(i * 2.4) * 40, 92, 112, t, i);
      });
      // cadenas que cuelgan (algunas con mini-robots a medio hacer)
      slots(camX * 0.36, 210, function (i, x) {
        if (hash(i * 5.1) < 0.35) return;
        cadena(c, x + 60, -6, 90 + hash(i * 2) * 120, t, i, hash(i * 7.3) > 0.5 ? 2 : 1);
      });
      // luces de alarma rojas (giran despacio)
      slots(camX * 0.36, 480, function (i, x) { luzAlarma(c, x + 380, 152, t, i * 1.7); });
      // bruma violeta del suelo con resplandor rojo
      c.fillStyle = vgrad(c, 330, H, [[0, 'rgba(90,50,90,0)'], [1, 'rgba(120,50,80,0.5)']]);
      c.fillRect(0, 330, W, H - 330);
      // columnas cercanas con rayas de aviso y lámpara cálida
      slots(camX * 0.62, 560, function (i, x) {
        var cx = x + 80;
        rf(c, cx, -10, 46, H + 20, 6, '#3f3656', SOFT, 3);
        c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(cx + 6, 0, 8, H);
        hazard(c, cx + 2, H - 76, 42, 22, 0, '#c2412d', '#2a2338');
        c.strokeStyle = SOFT; c.lineWidth = 2; c.strokeRect(cx + 2, H - 76, 42, 22);
        circ(c, cx + 23, 214, 6, '#ef4444', SOFT, 2);
        glow(c, cx + 23, 214, 22, 'rgba(248,113,113,0.9)', 0.3 + 0.25 * Math.sin(t * 2.5 + i));
        var lx = cx + 300;
        line(c, lx, 0, lx, 60, '#2a2338', 2);
        c.save(); c.globalAlpha = 0.09; c.fillStyle = '#ffd7a0';
        c.beginPath(); c.moveTo(lx - 12, 70); c.lineTo(lx + 12, 70); c.lineTo(lx + 90, 340); c.lineTo(lx - 90, 340); c.closePath(); c.fill(); c.restore();
        c.beginPath(); c.moveTo(lx - 20, 74); c.quadraticCurveTo(lx, 44, lx + 20, 74); c.closePath();
        c.fillStyle = '#6b4a7a'; c.fill(); c.strokeStyle = SOFT; c.lineWidth = 2; c.stroke();
        circ(c, lx, 75, 6, '#ffe4b5', null);
      });
    });
  };

  // ===========================================================================
  //  FONDO 6 — EL CORAZÓN DE LA FÁBRICA (arena de Robovill)  bgArenaRobovill(c, t)
  //  Sala enorme con un agujero en el techo (se ve el cielo) y la marca de Robovill.
  // ===========================================================================
  function circuitos(c, x0, y0, w, h, t, seed, col) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (var k = 0; k < 7; k++) {
      var sx = x0 + hash(seed + k) * w, sy = y0 + hash(seed * 2 + k) * h;
      var pts = [[sx, sy]];
      for (var j = 0; j < 3; j++) {
        var p = pts[pts.length - 1], d = 20 + hash(seed + k * 3 + j) * 40;
        pts.push(j % 2 ? [p[0], p[1] + (hash(k + j) > 0.5 ? d : -d)] : [p[0] + (hash(k * 2 + j) > 0.5 ? d : -d), p[1]]);
      }
      var a = 0.35 + 0.35 * Math.max(0, Math.sin(t * 2 - k * 0.8 + seed));
      c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 3;
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var q = 1; q < pts.length; q++) c.lineTo(pts[q][0], pts[q][1]);
      c.stroke();
      circ(c, pts[pts.length - 1][0], pts[pts.length - 1][1], 3.5, col, null);
    }
    c.restore();
  }
  function agujeroTecho(c, cx, cy, rx, ry, t, cielo) {
    // borde roto del techo con el cielo detrás
    var pts = [];
    for (var i = 0; i < 18; i++) {
      var a = i / 18 * TAU, j = 0.82 + hash(i * 3.3) * 0.3;
      pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
    }
    c.save();
    poly(c, pts, null, null);
    c.clip();
    c.fillStyle = vgrad(c, cy - ry, cy + ry, cielo || [[0, '#5aa2e4'], [1, '#bfe3f8']]);
    c.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
    puff(c, cloudK(cx - rx * 0.3 + Math.sin(t * 0.2) * 10, cy, 0.7), 'rgba(255,255,255,0.85)', null);
    c.restore();
    poly(c, pts, null, O, 4);
    // trozos de chapa doblados en el borde
    for (var k = 0; k < 6; k++) {
      var p = pts[(k * 3) % pts.length];
      poly(c, [[p[0] - 8, p[1]], [p[0] + 8, p[1]], [p[0] + (hash(k) - 0.5) * 20, p[1] + 18]], '#5b5276', O, 2);
    }
  }
  P2.fn.bgArenaRobovill = function (c, t) {
    t = num(t, now());
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, H, [[0, '#251f3a'], [0.6, '#3a3054'], [1, '#4d3a58']]);
      c.fillRect(0, 0, W, H);
      // cúpula: anillos de vigas
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 10;
      for (var a = 0; a < 3; a++) { c.beginPath(); c.ellipse(480, 40, 520 - a * 120, 150 - a * 34, 0, 0, PI); c.stroke(); }
      // agujero del techo con el cielo y el haz de luz
      agujeroTecho(c, 600, 36, 120, 54, t);
      c.save(); c.globalAlpha = 0.13 + 0.03 * Math.sin(t * 1.5);
      c.fillStyle = '#fff4d6';
      c.beginPath(); c.moveTo(510, 50); c.lineTo(690, 50); c.lineTo(620, 540); c.lineTo(320, 540); c.closePath(); c.fill();
      c.restore();
      for (var m = 0; m < 14; m++) {   // motas en el haz
        var my = mod(hash(m) * 480 + t * 14, 480) + 50, mx = 520 + (my - 50) * -0.35 + hash(m * 3) * 160;
        circ(c, mx, my, 1.6, 'rgba(255,248,220,0.5)', null);
      }
      // paredes laterales: placas con circuitos dorados
      [[0, 150], [810, 150]].forEach(function (p, k) {
        rf(c, p[0] - 10, 90, p[1] + 20, 470, 10, '#33294a', SOFT, 3);
        circuitos(c, p[0] + 10, 120, p[1] - 30, 300, t, k * 13 + 1, '#facc15');
        // pilar con luz de gema
        var px = k ? 830 : 130;
        rf(c, px - 20, 60, 40, 480, 8, '#463b60', SOFT, 3);
        for (var g = 0; g < 3; g++) {
          var gy = 150 + g * 110;
          glow(c, px, gy, 26, 'rgba(236,72,153,0.9)', 0.35 + 0.2 * Math.sin(t * 2 + g + k));
          poly(c, GEM_PTS.map(function (q) { return [px + q[0] * 0.55, gy + q[1] * 0.55]; }), '#db2777', O, 1.8);
        }
      });
      // la gran marca de Robovill en la pared del fondo (tenue, detrás del jefe)
      rf(c, 330, 120, 300, 230, 24, '#2c2442', SOFT, 3);
      circuitos(c, 350, 140, 260, 190, t, 7, 'rgba(250,204,21,0.8)');
      c.save(); c.globalAlpha = 0.85; marcaRobovill(c, 480, 222, 3.2, t, true); c.restore();
      // estandartes rojos de Robovill
      [250, 710].forEach(function (bx, k) {
        var sw = Math.sin(t * 1.6 + k) * 3;
        rf(c, bx - 40, 96, 80, 9, 4, '#6b5a40', SOFT, 2);
        poly(c, [[bx - 34, 104], [bx + 34, 104], [bx + 34 + sw, 290], [bx + sw, 266], [bx - 34 + sw, 290]], '#7f1d3a', SOFT, 2.5);
        marcaRobovill(c, bx + sw * 0.5, 170, 1.2, t, false);
      });
      // tuberías bajas y zócalo de la sala
      c.fillStyle = '#3d3254'; c.fillRect(0, 400, W, 140);
      line(c, 0, 400, W, 400, SOFT, 3);
      for (var p2 = 0; p2 < 3; p2++) {
        var py = 418 + p2 * 30;
        rf(c, -10, py, W + 20, 14, 7, p2 === 1 ? '#5a4c70' : '#4b3f5e', SOFT, 2);
        for (var v = 0; v < 6; v++) rf(c, 60 + v * 170 + p2 * 30, py - 3, 12, 20, 3, '#6b5c84', SOFT, 1.5);
      }
      // luces de alarma en lo alto
      luzAlarma(c, 300, 92, t, 0.4);
      luzAlarma(c, 820, 92, t, 2.1);
      // ojitos curiosos en las rejillas de los lados
      ojosSombra(c, 60, 330, 0.8, t, 3, '#fda4af');
      ojosSombra(c, 905, 300, 0.8, t + 0.7, 9, '#fb7185');
      c.fillStyle = vgrad(c, 360, H, [[0, 'rgba(120,50,80,0)'], [1, 'rgba(120,50,80,0.45)']]);
      c.fillRect(0, 360, W, H - 360);
    });
  };

  // ===========================================================================
  //  FONDO 7 — PELEAS DE GIGANTES  bgArenaGigantes(c, t, {lugar})
  //  Sin zoom; el suelo del mundo (y = 470) cae en y = 470 de la pantalla.
  // ===========================================================================
  var GROUND_Y = 470;
  function gigCaverna(c, t) {
    c.fillStyle = vgrad(c, 0, H, [[0, '#1f1828'], [0.5, '#33263a'], [1, '#4a3530']]);
    c.fillRect(0, 0, W, H);
    // bóveda enorme
    c.fillStyle = '#2a1f31';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, 120); c.quadraticCurveTo(480, -40, 0, 120); c.closePath(); c.fill();
    for (var s = 0; s < 14; s++) {
      var sx = 20 + s * 70, len = 40 + hash(s * 3) * 70, sy = 120 - Math.sin(sx / W * PI) * 92;
      poly(c, [[sx - 22, sy - 30], [sx + 22, sy - 30], [sx + 3, sy + len * 0.6], [sx - 2, sy + len * 0.7]], '#3b2d42', SOFT, 2);
    }
    // túneles excavados al fondo
    [[180, 300, 70], [520, 260, 90], [820, 320, 60]].forEach(function (h, k) {
      elli(c, h[0], h[1], h[2], h[2] * 0.8, '#150f1b', 'rgba(255,255,255,0.06)', 6);
      glow(c, h[0], h[1] + 10, h[2], 'rgba(253,186,116,0.8)', 0.18 + 0.06 * Math.sin(t * 2 + k));
    });
    // cristales gigantes
    cristales(c, 70, GROUND_Y, 2.1, t, 2, 1);
    cristales(c, 900, GROUND_Y, 1.8, t, 4, 1);
    cristales(c, 360, 70, 1.4, t, 5, -1);
    // guirnalda de lámparas de minero
    c.strokeStyle = '#2b1d1a'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(0, 150); c.quadraticCurveTo(480, 240, W, 150); c.stroke();
    for (var l = 0; l < 9; l++) {
      var lx = 60 + l * 105, tt = lx / W, ly = (1 - tt) * (1 - tt) * 150 + 2 * (1 - tt) * tt * 240 + tt * tt * 150;
      glow(c, lx, ly + 10, 40, 'rgba(255,214,140,0.8)', 0.4);
      rf(c, lx - 6, ly, 12, 12, 4, '#f6c453', O, 1.5);
    }
    // vigas rotas por el taladro
    rf(c, 250, 160, 18, 310, 4, '#6e4a31', SOFT, 2.5);
    c.save(); c.translate(700, 300); c.rotate(0.35); rf(c, -9, -160, 18, 260, 4, '#6e4a31', SOFT, 2.5); c.restore();
    // suelo de roca
    c.fillStyle = vgrad(c, GROUND_Y, H, [[0, '#7a5640'], [1, '#3f2a22']]);
    c.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    line(c, 0, GROUND_Y, W, GROUND_Y, O, 3);
    for (var g = 0; g < 12; g++) elli(c, hash(g) * W, GROUND_Y + 14 + hash(g * 7) * 46, 10 + hash(g * 3) * 8, 5, '#9a7a62', 'rgba(26,26,46,0.4)', 2);
  }
  function gigCielo(c, t) {
    c.fillStyle = vgrad(c, 0, H, [[0, '#3d86d4'], [0.6, '#93cff2'], [1, '#e9f6fc']]);
    c.fillRect(0, 0, W, H);
    c.save(); c.translate(140, 90); c.rotate(t * 0.05);
    c.globalAlpha = 0.16; c.fillStyle = '#fffbe0';
    for (var r = 0; r < 10; r++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(0, 0); c.lineTo(240, -26); c.lineTo(240, 26); c.closePath(); c.fill(); }
    c.restore();
    circ(c, 140, 90, 40, '#fff8d6', null);
    // montañas y la boca de la cueva del río abajo
    poly(c, [[-40, 470], [160, 300], [330, 470]], '#7f99c6', null);
    poly(c, [[260, 470], [520, 250], [780, 470]], '#8aa3cf', null);
    poly(c, [[640, 470], [860, 320], [1040, 470]], '#7f99c6', null);
    poly(c, [[480, 292], [520, 250], [560, 292], [536, 284], [520, 298], [504, 284]], '#eef4ff', null);
    slots(t * 6, 300, function (i, x) {
      var y = 140 + hash(i * 7) * 200, s = 0.7 + hash(i * 9) * 0.6;
      puff(c, cloudK(x + 80, y, s), '#f7fbff', 'rgba(130,160,205,0.45)', 3);
    });
    // colinas, la cueva y el río (donde caerá el Dron Nodriza)
    c.fillStyle = '#6fb27f'; c.beginPath(); c.moveTo(0, H);
    for (var hx = 0; hx <= W + 20; hx += 20) c.lineTo(hx, 455 + Math.sin(hx * 0.009) * 16);
    c.lineTo(W, H); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(26,26,46,0.3)'; c.lineWidth = 2.5; c.stroke();
    elli(c, 120, 470, 70, 46, '#2a2f45', O, 3);
    c.strokeStyle = '#9fd8f5'; c.lineWidth = 18;
    c.beginPath(); c.moveTo(140, 500); c.quadraticCurveTo(480, 540, 980, 505); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3; c.stroke();
    // mar de nubes cercano
    slots(t * 14, 170, function (i, x) {
      var rad = 34 + hash(i * 2.2) * 18;
      puff(c, [[x + 80, H + 4, rad], [x + 20, H + 12, rad * 0.8], [x + 140, H + 12, rad * 0.7]], '#ffffff', 'rgba(130,160,205,0.5)', 3);
    });
  }
  function gigFabrica(c, t) {
    c.fillStyle = vgrad(c, 0, H, [[0, '#231d38'], [0.6, '#3a3054'], [1, '#4d3a58']]);
    c.fillRect(0, 0, W, H);
    // techo roto enorme (por ahí escapará Robovill)
    agujeroTecho(c, 480, 10, 300, 90, t, [[0, '#ffb98a'], [1, '#ffe2b8']]);
    c.save(); c.globalAlpha = 0.12; c.fillStyle = '#fff1d0';
    c.beginPath(); c.moveTo(250, 30); c.lineTo(710, 30); c.lineTo(860, 470); c.lineTo(100, 470); c.closePath(); c.fill(); c.restore();
    // maquinaria gigante a los lados
    gear(c, 60, 250, 110, 14, t * 0.2, '#3a3150', 'rgba(0,0,0,0.4)');
    gear(c, 900, 220, 90, 12, -t * 0.25, '#3a3150', 'rgba(0,0,0,0.4)');
    [[150, 120], [810, 140]].forEach(function (p, k) {
      rf(c, p[0] - 26, p[1], 52, 360, 8, '#463b60', SOFT, 3);
      circuitos(c, p[0] - 60, p[1] + 30, 120, 260, t, 21 + k * 5, '#facc15');
      luzAlarma(c, p[0], p[1] - 4, t, k * 2.3);
    });
    // la marca de Robovill (tenue y ALTA, por encima de la línea de combate) y
    // carteles apagados en los lados: la única gema brillante en la zona de
    // pelea debe ser el punto débil del jefe.
    c.save(); c.globalAlpha = 0.22; marcaRobovill(c, 480, 150, 2.6, t, false); c.restore();
    c.save(); c.globalAlpha = 0.55;
    cartelRobovill(c, 238, 180, 64, 78, t, 3, true);
    cartelRobovill(c, 722, 186, 64, 78, t, 8, true);
    c.restore();
    cadena(c, 380, -6, 170, t, 1, 1);
    cadena(c, 600, -6, 140, t, 4, 2);
    // suelo metálico de la sala
    c.fillStyle = vgrad(c, GROUND_Y, H, [[0, '#5b5070'], [1, '#2f2742']]);
    c.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    line(c, 0, GROUND_Y, W, GROUND_Y, O, 3);
    hazard(c, 0, GROUND_Y + 2, W, 8, t * 10, '#c2412d', '#2a2338');
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2;
    for (var px = 0; px < W; px += 80) { c.beginPath(); c.moveTo(px, GROUND_Y + 10); c.lineTo(px, H); c.stroke(); }
    c.fillStyle = vgrad(c, 380, GROUND_Y, [[0, 'rgba(120,50,80,0)'], [1, 'rgba(120,50,80,0.4)']]);
    c.fillRect(0, 380, W, GROUND_Y - 380);
  }
  P2.fn.bgArenaGigantes = function (c, t, o) {
    t = num(t, now());
    var lugar = (o && o.lugar) || 'caverna';
    safe(c, function () {
      if (lugar === 'cielo') gigCielo(c, t);
      else if (lugar === 'fabrica') gigFabrica(c, t);
      else gigCaverna(c, t);
    });
  };

  // ===========================================================================
  //  TILES DE LA PARTE 3  tile3(c, x, y, size, tipo, tema, estado)
  //  Temas: cielo · fabricaOscura · arena.  estado (opcional) según el tipo:
  //   console: true / {hecha} = hackeada (✓ verde); {rearmando} = gris.
  //   checkpoint: true / {activo} = activado; false = sin activar.
  //   diana / palanca: {hecha}.  puertaArena: {cerrada}.  laserEmisor: {activa, lado: 'abajo'|'arriba'}.
  // ===========================================================================
  var TEMAS3 = {
    cielo: { body: '#9a90c2', bodyD: '#7f75a9', top: '#ece8fb', topD: '#b9afd9', edge: '#86efac', line: 'rgba(26,26,46,0.26)',
             plat: '#a99fd0', platT: '#efeafc', frame: '#6c62a0', accent: '#4ade80', door: '#7d74ad' },
    fabricaOscura: { body: '#423a5a', bodyD: '#2f2944', top: '#7b7399', topD: '#57507a', edge: '#f87171', line: 'rgba(0,0,0,0.3)',
             plat: '#4f4769', platT: '#8e86ad', frame: '#332c4a', accent: '#ef4444', door: '#4a4266' },
    arena: { body: '#4b4462', bodyD: '#383150', top: '#8f88ad', topD: '#665f86', edge: '#facc15', line: 'rgba(0,0,0,0.3)',
             plat: '#564e72', platT: '#9a93b8', frame: '#3a3354', accent: '#facc15', door: '#4f4770' }
  };
  function est(e, k) { return !!(e && typeof e === 'object' && e[k]); }
  function tSolid(c, s, k, P, tema, seed) {
    rf(c, 0, 0, s, s, 5 * k, P.body, O, 2.5);
    var th = s * 0.3;
    if (tema === 'cielo') {
      c.strokeStyle = P.line; c.lineWidth = 2;
      c.beginPath(); c.moveTo(2, s * 0.65); c.lineTo(s - 2, s * 0.65);
      c.moveTo(s * 0.5, th + 2); c.lineTo(s * 0.5, s * 0.65);
      c.moveTo(s * 0.22, s * 0.65); c.lineTo(s * 0.22, s - 2); c.moveTo(s * 0.78, s * 0.65); c.lineTo(s * 0.78, s - 2); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(4 * k, th + 4 * k, s * 0.3, 3 * k);
    } else {
      // placa de acero remachada (fábrica oscura) o con circuitos dorados (arena)
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.beginPath(); c.moveTo(4 * k, s - 4 * k); c.lineTo(s * 0.55, th + 2); c.lineTo(s * 0.7, th + 2); c.lineTo(s * 0.25, s - 4 * k); c.closePath(); c.fill();
      [[8, 0.62], [40, 0.62], [8, 0.88], [40, 0.88]].forEach(function (p) { circ(c, p[0] * k, s * p[1], 2.3 * k, P.topD, O, 1.2); });
      if (tema === 'arena') {
        c.strokeStyle = 'rgba(250,204,21,0.55)'; c.lineWidth = 2 * k;
        var o2 = seed > 0.5 ? 1 : -1;
        c.beginPath(); c.moveTo(s * 0.5 - 10 * k * o2, s - 3 * k); c.lineTo(s * 0.5 - 10 * k * o2, s * 0.72); c.lineTo(s * 0.5 + 8 * k * o2, s * 0.72); c.stroke();
        circ(c, s * 0.5 + 8 * k * o2, s * 0.72, 2.4 * k, '#facc15', null);
      } else if (seed > 0.7) {
        c.fillStyle = 'rgba(239,68,68,0.35)'; c.fillRect(s * 0.3, s * 0.74, s * 0.4, 3 * k);
      }
    }
    rf(c, 0, 0, s, th, 5 * k, P.top, O, 2.5);
    c.fillStyle = P.edge; c.fillRect(4 * k, 2.5 * k, s - 8 * k, 3 * k);
    c.fillStyle = P.topD; c.fillRect(3 * k, th - 4.5 * k, s - 6 * k, 3 * k);
    if (tema === 'cielo') {
      // botones LEGO (pisable y claro)
      rf(c, s * 0.2, th * 0.4, s * 0.18, th * 0.32, 2 * k, '#ffffff', 'rgba(26,26,46,0.3)', 1.2);
      rf(c, s * 0.62, th * 0.4, s * 0.18, th * 0.32, 2 * k, '#ffffff', 'rgba(26,26,46,0.3)', 1.2);
    }
  }
  function tPlatform(c, s, k, P, tema) {
    var ph = s * 0.34;
    if (tema === 'cielo') {
      poly(c, [[s * 0.15, ph], [s * 0.85, ph], [s * 0.6, ph + 10 * k], [s * 0.4, ph + 10 * k]], P.frame, O, 2);
      rf(c, 0, 0, s, ph, 5 * k, P.plat, O, 2.5);
      rf(c, 2, 2, s - 4, ph * 0.42, 3 * k, P.platT, null);
      c.fillStyle = P.accent; c.fillRect(4 * k, ph - 5 * k, s - 8 * k, 2.5 * k);
    } else {
      line(c, s * 0.2, ph, s * 0.08, ph + 10 * k, O, 4); line(c, s * 0.2, ph, s * 0.08, ph + 10 * k, P.frame, 2);
      line(c, s * 0.8, ph, s * 0.92, ph + 10 * k, O, 4); line(c, s * 0.8, ph, s * 0.92, ph + 10 * k, P.frame, 2);
      rf(c, 0, 0, s, ph, 4 * k, P.plat, O, 2.5);
      c.fillStyle = 'rgba(0,0,0,0.4)';
      for (var gx = 5 * k; gx < s - 6 * k; gx += 7 * k) c.fillRect(gx, ph * 0.45, 4 * k, ph * 0.36);
      if (tema === 'arena') { c.fillStyle = '#facc15'; c.fillRect(2, 2, s - 4, 3.5 * k); }
      else hazard(c, 1.5, 1.5, s - 3, 4 * k, 0, '#e2513f', '#2a2338');
    }
  }
  function tSpike(c, s, k, P) {
    var n = 4, sw = s / n;
    for (var i = 0; i < n; i++) {
      poly(c, [[i * sw + 1, s - 7 * k], [i * sw + sw / 2, s * 0.2], [(i + 1) * sw - 1, s - 7 * k]], '#dfe4ee', O, 2.2);
      c.fillStyle = '#a7b0c2';
      c.beginPath(); c.moveTo(i * sw + sw / 2, s * 0.2 + 3); c.lineTo((i + 1) * sw - 3, s - 8 * k); c.lineTo(i * sw + sw / 2, s - 8 * k); c.closePath(); c.fill();
      circ(c, i * sw + sw / 2, s * 0.2 + 2, 1.6 * k, '#ffffff', null);
    }
    rf(c, 0, s - 9 * k, s, 9 * k, 3 * k, P.bodyD, O, 2.2);
    c.fillStyle = '#e26d6d';
    for (var j = 0; j < 4; j++) c.fillRect(j * s / 4 + 3 * k, s - 6.5 * k, s / 8, 4 * k);
  }
  function tDoor(c, s, k, P, t) {
    rf(c, 1, 0, s - 2, s, 4 * k, P.frame, O, 2.5);
    rf(c, 5 * k, 3 * k, s - 10 * k, s - 6 * k, 3 * k, P.door, O, 2);
    hazard(c, 6 * k, 4 * k, s - 12 * k, 7 * k, 0);
    hazard(c, 6 * k, s - 11 * k, s - 12 * k, 7 * k, 0);
    line(c, s / 2, 11 * k, s / 2, s - 11 * k, 'rgba(26,26,46,0.4)', 2);
    var pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 3));
    c.save(); c.globalAlpha = 0.35 * pulse; circ(c, s / 2, s / 2, 13 * k, '#ff5a5a', null); c.restore();
    circ(c, s / 2, s / 2, 9.5 * k, '#d83b3b', O, 2);
    c.strokeStyle = O; c.lineWidth = 3.4 * k;
    c.beginPath(); c.arc(s / 2, s / 2 - 1.5 * k, 3.4 * k, PI, 0); c.stroke();
    c.strokeStyle = '#fde68a'; c.lineWidth = 1.6 * k; c.stroke();
    rf(c, s / 2 - 4.5 * k, s / 2 - 1.5 * k, 9 * k, 7 * k, 1.5 * k, '#fbbf24', O, 1.5);
  }
  function tConsole(c, s, k, P, t, done, gris) {
    var gl = done ? '#4ade80' : (gris ? '#94a3b8' : '#22d3ee'), scr = done ? '#0f3b24' : (gris ? '#334155' : '#082f49');
    line(c, s * 0.72, s * 0.3, s * 0.82, s * 0.06, O, 2.5);
    circ(c, s * 0.82, s * 0.06, 3 * k, (Math.sin(t * 6) > 0 || done) ? gl : '#0e7490', O, 1.5);
    rf(c, s * 0.3, s * 0.62, s * 0.4, s * 0.34, 3 * k, P.frame, O, 2.2);
    rf(c, s * 0.18, s * 0.9, s * 0.64, s * 0.1, 2 * k, P.bodyD, O, 2);
    poly(c, [[s * 0.1, s * 0.28], [s * 0.9, s * 0.22], [s * 0.86, s * 0.66], [s * 0.14, s * 0.66]], '#3d4660', O, 2.5);
    poly(c, [[s * 0.17, s * 0.33], [s * 0.83, s * 0.28], [s * 0.8, s * 0.58], [s * 0.2, s * 0.58]], scr, gl, 2);
    if (!gris) { c.save(); c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4); circ(c, s / 2, s * 0.44, s * 0.3, gl, null); c.restore(); }
    if (done) {
      c.strokeStyle = gl; c.lineWidth = 3.5 * k;
      c.beginPath(); c.moveTo(s * 0.38, s * 0.44); c.lineTo(s * 0.47, s * 0.52); c.lineTo(s * 0.63, s * 0.36); c.stroke();
    } else {
      var ph = mod(t * 1.5, 1);
      circ(c, s / 2, s * 0.53, 2.6 * k, gl, null);
      c.strokeStyle = gl; c.lineWidth = 2.2 * k;
      for (var a = 0; a < 3; a++) {
        c.globalAlpha = gris ? 0.4 : ((ph * 3 > a) ? 1 : 0.3);
        c.beginPath(); c.arc(s / 2, s * 0.53, (5 + a * 4.5) * k, -PI * 0.78, -PI * 0.22); c.stroke();
      }
      c.globalAlpha = 1;
    }
    circ(c, s * 0.4, s * 0.76, 2.4 * k, '#f87171', O, 1.2);
    circ(c, s * 0.6, s * 0.76, 2.4 * k, '#fbbf24', O, 1.2);
  }
  function tExit(c, s, k, t) {
    var top = -s * 0.5, pulse = 1 + Math.sin(t * 4) * 0.06;
    c.save(); c.globalAlpha = 0.45;
    var rg = c.createRadialGradient(s / 2, s * 0.3, 4, s / 2, s * 0.3, s * 0.95 * pulse);
    rg.addColorStop(0, '#fffbe0'); rg.addColorStop(0.5, 'rgba(134,239,172,0.7)'); rg.addColorStop(1, 'rgba(134,239,172,0)');
    c.fillStyle = rg; c.fillRect(-s * 0.5, top - s * 0.4, s * 2, s * 2);
    c.restore();
    function archPath(inset) {
      c.beginPath(); c.moveTo(inset, s); c.lineTo(inset, top + s / 2);
      c.arc(s / 2, top + s / 2, s / 2 - inset, PI, 0); c.lineTo(s - inset, s); c.closePath();
    }
    archPath(1); c.fillStyle = '#f2c94c'; c.fill(); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
    archPath(7 * k);
    var ig = c.createLinearGradient(0, top, 0, s);
    ig.addColorStop(0, '#f0fff4'); ig.addColorStop(1, '#86efac');
    c.fillStyle = ig; c.fill(); c.strokeStyle = O; c.lineWidth = 2; c.stroke();
    var by = s * 0.25 + Math.sin(t * 5) * 3 * k;
    poly(c, [[s * 0.38, by - 8 * k], [s * 0.62, by - 8 * k], [s * 0.62, by + 1 * k], [s * 0.72, by + 1 * k], [s / 2, by + 12 * k], [s * 0.28, by + 1 * k], [s * 0.38, by + 1 * k]], '#22c55e', O, 2);
    poly(c, starPts(s / 2, top + 1, 8 * k, 3.6 * k, 5, Math.sin(t * 2) * 0.2), '#fff3a3', O, 2);
  }
  function tBox(c, s, k, tema) {
    var p = 3 * k, w = s - 2 * p;
    var body = tema === 'cielo' ? '#c8955a' : '#a8753e';
    rf(c, p, p, w, w, 4 * k, body, O, 2.5);
    c.strokeStyle = 'rgba(110,60,20,0.55)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(p + 4, s * 0.38); c.lineTo(s - p - 4, s * 0.38); c.moveTo(p + 4, s * 0.62); c.lineTo(s - p - 4, s * 0.62); c.stroke();
    line(c, p + 5 * k, p + 5 * k, s - p - 5 * k, s - p - 5 * k, O, 6 * k);
    line(c, p + 5 * k, p + 5 * k, s - p - 5 * k, s - p - 5 * k, '#8a5a28', 3.5 * k);
    rf(c, p, p, w, w, 4 * k, null, O, 2.5);
    [[p, p], [s - p - 9 * k, p], [p, s - p - 9 * k], [s - p - 9 * k, s - p - 9 * k]].forEach(function (q) {
      rf(c, q[0], q[1], 9 * k, 9 * k, 2 * k, '#8b93a7', O, 1.5);
    });
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(p + 10 * k, p + 3 * k, s * 0.3, 2.5 * k);
  }
  function tCheckpoint(c, s, k, t, estado) {
    var off = (estado === false) || (estado && typeof estado === 'object' && estado.activo === false);
    var on = (estado === true) || est(estado, 'activo');
    if (!off) { c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4); elli(c, s / 2, s - 3 * k, 18 * k, 5 * k, '#86efac', null); c.restore(); }
    rf(c, s / 2 - 3 * k, -s * 0.3, 6 * k, s * 1.28, 2 * k, '#cbd5e1', O, 2.2);
    circ(c, s / 2, -s * 0.32, 4.5 * k, off ? '#94a3b8' : '#fbbf24', O, 2);
    var fy = off ? s * 0.42 : -s * 0.22, wave = Math.sin(t * 6) * 3 * k;
    c.beginPath();
    c.moveTo(s / 2 + 3 * k, fy);
    c.quadraticCurveTo(s * 0.8, fy - 4 * k + wave, s * 1.02, fy + wave);
    c.lineTo(s * 0.9, fy + 10 * k + wave * 0.5);
    c.quadraticCurveTo(s * 1.0, fy + 18 * k, s * 1.02, fy + 22 * k + wave * 0.6);
    c.quadraticCurveTo(s * 0.78, fy + 18 * k - wave, s / 2 + 3 * k, fy + 22 * k);
    c.closePath();
    c.fillStyle = off ? '#9aa3b5' : '#22c55e'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.2; c.stroke();
    poly(c, starPts(s * 0.74, fy + 11 * k + wave * 0.5, 6 * k, 2.6 * k, 5, 0), off ? '#cbd5e1' : '#fef9c3', O, 1.3);
    rf(c, s / 2 - 10 * k, s - 7 * k, 20 * k, 7 * k, 2 * k, '#64748b', O, 2);
    if (on) {
      sparkle(c, s * 0.22, -s * 0.1 + Math.sin(t * 4) * 3, 4 * k, '#fef9c3', 0.6 + 0.4 * Math.sin(t * 5));
      sparkle(c, s * 0.95, s * 0.35 + Math.cos(t * 4) * 3, 3.5 * k, '#fef9c3', 0.6 + 0.4 * Math.cos(t * 5));
    }
  }
  function tCinta(c, s, k, P, t, dir) {
    rf(c, 0, s * 0.3, s, s * 0.7, 4 * k, P.frame, O, 2.5);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(3 * k, s * 0.86, s - 6 * k, 4 * k);
    [s * 0.27, s * 0.73].forEach(function (rx) {
      circ(c, rx, s * 0.64, 8.5 * k, '#9aa4b9', O, 2);
      c.save(); c.translate(rx, s * 0.64); c.rotate(dir * t * 90 / (8.5 * k));
      line(c, -6 * k, 0, 6 * k, 0, '#4b5568', 2); line(c, 0, -6 * k, 0, 6 * k, '#4b5568', 2);
      c.restore();
    });
    var bh = s * 0.38;
    rf(c, 0, 0, s, bh, bh / 2, '#363c50', O, 2.8);
    c.save(); rr(c, 2, 2, s - 4, bh - 4, bh / 2 - 2); c.clip();
    var period = s / 2, off = mod(t * 90 * dir, period);
    c.fillStyle = '#f2c230';
    for (var ax = -period + off; ax < s + period; ax += period) {
      var cy = bh / 2, w = 7 * k, hh = bh * 0.32;
      c.beginPath();
      c.moveTo(ax - dir * w, cy - hh); c.lineTo(ax + dir * w * 0.4, cy - hh);
      c.lineTo(ax + dir * w * 1.4, cy); c.lineTo(ax + dir * w * 0.4, cy + hh);
      c.lineTo(ax - dir * w, cy + hh); c.lineTo(ax, cy); c.closePath(); c.fill();
    }
    c.restore();
  }
  function emisor(c, cx, y, k, activa, haciaAbajo, t) {
    // cajita del emisor: y = borde donde se monta (arriba = techo, abajo = suelo)
    var h = 14 * k, w = 26 * k, y0 = haciaAbajo ? y : y - h;
    rf(c, cx - w / 2, y0, w, h, 4 * k, '#475569', O, 2.2);
    hazard(c, cx - w / 2 + 3 * k, haciaAbajo ? y0 + 2 * k : y0 + h - 5 * k, w - 6 * k, 3 * k, 0);
    var ly = haciaAbajo ? y0 + h : y0;
    rf(c, cx - 7 * k, haciaAbajo ? ly - 2 * k : ly - 4 * k, 14 * k, 6 * k, 3 * k, activa ? '#fb7185' : '#64748b', O, 1.6);
    if (activa) glow(c, cx, ly, 16 * k, 'rgba(251,113,133,0.95)', 0.55 + 0.2 * Math.sin(t * 8));
  }
  function tLaserEmisor(c, s, k, t, estado) {
    var activa = !(estado && typeof estado === 'object' && estado.activa === false) && estado !== false;
    var arriba = est(estado, 'lado') && estado.lado === 'arriba';
    if (arriba) emisor(c, s / 2, 0, k, activa, true, t);
    else emisor(c, s / 2, s, k, activa, false, t);
  }
  function tPuertaArena(c, s, k, P, t, cerrada) {
    // marco de la puerta de la arena; cerrada = persiana de acero bajada con la marca
    rf(c, 0, 0, 7 * k, s, 2 * k, P.frame, O, 2);
    rf(c, s - 7 * k, 0, 7 * k, s, 2 * k, P.frame, O, 2);
    if (cerrada) {
      rf(c, 5 * k, 0, s - 10 * k, s, 2 * k, '#57507a', O, 2.2);
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2;
      for (var yy = 8 * k; yy < s; yy += 8 * k) { c.beginPath(); c.moveTo(7 * k, yy); c.lineTo(s - 7 * k, yy); c.stroke(); }
      marcaRobovill(c, s / 2, s / 2, 0.75 * k, t, false);
      circ(c, s / 2, 6 * k, 3 * k, Math.sin(t * 5) > 0 ? '#ef4444' : '#7f1d1d', O, 1.2);
    } else {
      // abierta: persiana recogida arriba y flechitas que invitan a pasar
      rf(c, 5 * k, 0, s - 10 * k, 10 * k, 2 * k, '#57507a', O, 2);
      c.save(); c.globalAlpha = 0.55 + 0.3 * Math.sin(t * 4);
      poly(c, [[s * 0.35, s * 0.45], [s * 0.6, s * 0.6], [s * 0.35, s * 0.75]], '#facc15', O, 1.5);
      c.restore();
    }
  }
  P2.fn.tile3 = function (c, x, y, size, tipo, tema, estado) {
    safe(c, function () {
      var s = num(size, 48), k = s / 48, t = now();
      x = num(x, 0); y = num(y, 0);
      tema = TEMAS3[tema] ? tema : 'cielo';
      var P = TEMAS3[tema];
      c.translate(x, y);
      switch (tipo) {
        case 'platform': tPlatform(c, s, k, P, tema); break;
        case 'spike': tSpike(c, s, k, P); break;
        case 'door': tDoor(c, s, k, P, t); break;
        case 'console': tConsole(c, s, k, P, t, estado === true || est(estado, 'hecha'), est(estado, 'rearmando') || est(estado, 'gris')); break;
        case 'exit': tExit(c, s, k, t); break;
        case 'box': tBox(c, s, k, tema); break;
        case 'checkpoint': tCheckpoint(c, s, k, t, estado); break;
        case 'cintaIzq': tCinta(c, s, k, P, t, -1); break;
        case 'cintaDer': tCinta(c, s, k, P, t, 1); break;
        case 'laserEmisor': tLaserEmisor(c, s, k, t, estado); break;
        case 'diana':
          rf(c, s * 0.1, s * 0.1, s * 0.8, s * 0.8, 8 * k, P.bodyD, O, 2.2);   // placa en la pared
          dianaDraw(c, s / 2, s / 2, k, t, est(estado, 'hecha') || estado === true);
          break;
        case 'palanca': palancaDraw(c, s / 2, s, k, t, est(estado, 'hecha') || estado === true); break;
        case 'puertaArena': tPuertaArena(c, s, k, P, t, est(estado, 'cerrada') || estado === true); break;
        default: tSolid(c, s, k, P, tema, hash(x * 0.37 + y * 0.71));
      }
    });
  };

  // ===========================================================================
  //  PUZLES: barrera láser, diana y palanca
  // ===========================================================================
  P2.fn.barreraLaser = function (c, x, yArriba, yAbajo, o) {
    o = o || {};
    safe(c, function () {
      x = num(x, 0); var y0 = num(yArriba, 0), y1 = num(yAbajo, y0 + 144), t = num(o.t, now());
      if (y1 < y0) { var tmp = y0; y0 = y1; y1 = tmp; }
      var activa = o.activa !== false;
      var a0 = y0 + 14, a1 = y1 - 14;
      if (activa && a1 > a0) {
        var cr = !!o.cruzando;
        // resplandor
        c.save(); c.globalAlpha = cr ? 0.35 : 0.22 + 0.06 * Math.sin(t * 9);
        c.fillStyle = cr ? '#fde68a' : '#fb7185'; c.fillRect(x - 16, a0, 32, a1 - a0);
        c.restore();
        // tres hilos de luz que tiemblan un poco
        [-7, 0, 7].forEach(function (dx, i) {
          c.beginPath();
          for (var yy = a0; yy <= a1; yy += 8) {
            var wob = Math.sin(yy * 0.09 + t * 14 + i * 2) * (cr ? 3.5 : 1.3);
            if (yy === a0) c.moveTo(x + dx + wob, yy); else c.lineTo(x + dx + wob, yy);
          }
          c.lineTo(x + dx, a1);
          c.strokeStyle = cr ? '#fef3c7' : (i === 1 ? '#ffe4e6' : '#fb7185'); c.lineWidth = i === 1 ? 3 : 2.5; c.stroke();
        });
        // chispitas que suben y bajan
        for (var p = 0; p < 4; p++) {
          var ph = mod(t * 0.9 + p * 0.25, 1);
          sparkle(c, x + (p % 2 ? 6 : -6), a0 + ph * (a1 - a0), 4, cr ? '#fff7c2' : '#ffe4e6', 0.8);
        }
        if (cr) for (var s = 0; s < 6; s++) sparkle(c, x + (hash(s + Math.floor(t * 12)) - 0.5) * 40, a0 + hash(s * 3 + Math.floor(t * 12)) * (a1 - a0), 5, '#fde047', 0.9);
      }
      emisor(c, x, y0, 1, activa, true, t);
      emisor(c, x, y1, 1, activa, false, t);
    });
  };
  function dianaDraw(c, x, y, s, t, hecha) {
    var R = 17 * s;
    if (!hecha) glow(c, x, y, R * 2, 'rgba(253,224,71,0.8)', 0.25 + 0.2 * Math.sin(t * 3));
    else glow(c, x, y, R * 2.2, 'rgba(74,222,128,0.9)', 0.45);
    circ(c, x, y, R + 2.5 * s, '#64748b', O, 2.4);
    var cols = hecha ? ['#ffffff', '#22c55e', '#ffffff', '#16a34a'] : ['#ffffff', '#ef4444', '#ffffff', '#dc2626'];
    circ(c, x, y, R, cols[0], O, 1.5);
    circ(c, x, y, R * 0.74, cols[1], null);
    circ(c, x, y, R * 0.48, cols[2], null);
    circ(c, x, y, R * 0.24, cols[3], null);
    for (var b = 0; b < 4; b++) { var a = b * PI / 2 + PI / 4; circ(c, x + Math.cos(a) * (R + 1), y + Math.sin(a) * (R + 1), 1.6 * s, '#cbd5e1', O, 0.8); }
    if (hecha) {
      c.strokeStyle = O; c.lineWidth = 6 * s;
      c.beginPath(); c.moveTo(x - 7 * s, y); c.lineTo(x - 2 * s, y + 5 * s); c.lineTo(x + 8 * s, y - 6 * s); c.stroke();
      c.strokeStyle = '#fef9c3'; c.lineWidth = 3 * s; c.stroke();
      sparkle(c, x + R, y - R, 5 * s, '#fef9c3', 0.6 + 0.4 * Math.sin(t * 5));
    } else {
      // brillo que pasa (invita a apuntar)
      c.save(); c.beginPath(); c.arc(x, y, R, 0, TAU); c.clip();
      var sx = x - R * 1.6 + mod(t * 0.8, 2.4) * R * 1.4;
      c.globalAlpha = 0.4; c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(sx, y - R); c.lineTo(sx + R * 0.3, y - R); c.lineTo(sx - R * 0.2, y + R); c.lineTo(sx - R * 0.5, y + R); c.closePath(); c.fill();
      c.restore();
    }
  }
  P2.fn.diana = function (c, x, y, o) {
    o = o || {};
    safe(c, function () { dianaDraw(c, num(x, 0), num(y, 0), num(o.scale, 1), num(o.t, now()), !!o.hecha); });
  };
  function palancaDraw(c, x, piesY, k, t, hecha) {
    // base atornillada en la repisa
    rf(c, x - 17 * k, piesY - 13 * k, 34 * k, 13 * k, 4 * k, '#64748b', O, 2.4);
    circ(c, x - 11 * k, piesY - 6 * k, 1.8 * k, '#cbd5e1', null); circ(c, x + 11 * k, piesY - 6 * k, 1.8 * k, '#cbd5e1', null);
    // brazo (izquierda = sin activar, derecha = activada)
    var ang = hecha ? 0.65 : -0.65 + Math.sin(t * 3) * 0.05;
    c.save(); c.translate(x, piesY - 12 * k); c.rotate(ang);
    line(c, 0, 0, 0, -26 * k, O, 7 * k); line(c, 0, 0, 0, -26 * k, '#cbd5e1', 4 * k);
    circ(c, 0, -28 * k, 7 * k, hecha ? '#22c55e' : '#ef4444', O, 2);
    circ(c, -2 * k, -30 * k, 2 * k, '#ffffff', null);
    c.restore();
    c.beginPath(); c.arc(x, piesY - 12 * k, 8 * k, PI, 0); c.closePath();
    c.fillStyle = '#475569'; c.fill(); c.strokeStyle = O; c.lineWidth = 2; c.stroke();
    // lucecita de estado
    circ(c, x, piesY - 6 * k, 3 * k, hecha ? '#4ade80' : (Math.sin(t * 5) > 0 ? '#fbbf24' : '#92400e'), O, 1.2);
    if (hecha) sparkle(c, x + 18 * k, piesY - 36 * k, 5 * k, '#fef9c3', 0.6 + 0.4 * Math.sin(t * 5));
    else { // flechita que invita a tocarla
      var by = piesY - 52 * k + Math.sin(t * 4) * 3 * k;
      c.save(); c.globalAlpha = 0.8;
      poly(c, [[x - 6 * k, by], [x + 6 * k, by], [x, by + 8 * k]], '#facc15', O, 1.5);
      c.restore();
    }
  }
  P2.fn.palanca = function (c, x, piesY, o) {
    o = o || {};
    safe(c, function () { palancaDraw(c, num(x, 0), num(piesY, 0), num(o.scale, 1), num(o.t, now()), !!o.hecha); });
  };

  // ===========================================================================
  //  BOLA DE ENERGÍA DE MIKEY (juego)  bolaEnergiaJuego(c, x, y, {tipo, angle, scale, t})
  //  Se apoya en la bola aprobada (P2.fn.bolaEnergia del arte) y no la pisa.
  // ===========================================================================
  function bolaPropia(c, r, t) {
    c.globalAlpha = 0.3; circ(c, 0, 0, r * 1.9, '#60a5fa', null);
    c.globalAlpha = 0.5; circ(c, 0, 0, r * 1.4, '#93c5fd', null); c.globalAlpha = 1;
    circ(c, 0, 0, r, '#3b82f6', O, Math.max(1.5, Math.min(3, r * 0.22)));
    circ(c, 0, 0, r * 0.62, '#93c5fd', null);
    circ(c, -r * 0.18, -r * 0.2, r * 0.32, '#ffffff', null);
  }
  P2.fn.bolaEnergiaJuego = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var tipo = o.tipo === 'francotirador' || o.tipo === 'metralleta' ? o.tipo : 'pistola';
      var s = num(o.scale, 1), t = num(o.t, now()), ang = num(o.angle, 0);
      var sc = tipo === 'metralleta' ? s : s * 1.2;      // radio 5 (metralleta) o 6 (pistola y francotirador)
      c.translate(num(x, 0), num(y, 0)); c.rotate(ang);
      if (tipo === 'francotirador') {
        // estela larga propia (por detrás) + bola estirada × 1,8
        var g = c.createLinearGradient(-46 * s, 0, 0, 0);
        g.addColorStop(0, 'rgba(96,165,250,0)'); g.addColorStop(1, 'rgba(191,219,254,0.85)');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(-46 * s, 0); c.quadraticCurveTo(-20 * s, -5 * s, 0, -5.5 * s); c.lineTo(0, 5.5 * s); c.quadraticCurveTo(-20 * s, 5 * s, -46 * s, 0); c.closePath(); c.fill();
        c.scale(1.8, 1);
      }
      if (!call('bolaEnergia', c, 0, 0, { scale: sc, facing: 1, trail: tipo === 'francotirador' ? 1 : 0 })) bolaPropia(c, 5 * sc, t);
      if (tipo === 'metralleta') sparkle(c, 3 * s, -4 * s, 2.5 * s, '#e0f2fe', 0.5 + 0.5 * Math.sin(t * 20));
    });
  };

  // ===========================================================================
  //  ICONOS DEL HUD (centro; marco igual que iconoArma de la Parte 2)
  // ===========================================================================
  function marcoIcono(c, rim, apagado) {
    rf(c, -23, -23, 46, 46, 12, '#26294a', O, 3);
    rf(c, -20, -20, 40, 40, 10, null, apagado ? '#64748b' : rim, 2.5);
    c.save(); c.globalAlpha = 0.12; rf(c, -18, -19, 36, 14, 8, '#ffffff', null); c.restore();
  }
  var LANZ = { // centro del dibujo (desde la empuñadura), escala y giro para que quepa en el marco (espacio de 48)
    pistola: { cx: 6, cy: -3.5, s: 1.05, rot: 0 }, metralleta: { cx: 9, cy: -3, s: 0.85, rot: 0 },
    francotirador: { cx: 15, cy: -6, s: 0.6, rot: -0.42 } };
  function dibLanzador(tipo, sMul) {   // dibuja el lanzador centrado en (0, 0); false si no existe el arte
    var L = LANZ[tipo], sc = L.s * (sMul || 1);
    c_.save(); c_.rotate(L.rot);
    var ok = call('lanzadorMikey', c_, -L.cx * sc, -L.cy * sc, { tipo: tipo, scale: sc, facing: 1 });
    c_.restore();
    return ok;
  }
  var c_ = null;
  var ORDEN_LANZ = ['francotirador', 'pistola', 'metralleta'];
  P2.fn.iconoLanzador = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var size = num(o.size, 40), k = size / 48, t = now();
      var tipo = LANZ[o.tipo] ? o.tipo : 'pistola', activo = o.activo !== false;
      c.translate(num(x, 0), num(y, 0)); c.scale(k, k);
      marcoIcono(c, '#60a5fa', !activo);
      if (activo) glow(c, 8, -2, 18, 'rgba(96,165,250,0.9)', 0.25 + 0.1 * Math.sin(t * 4));
      c.save(); if (!activo) c.globalAlpha = 0.35;
      c_ = c; c.translate(0, -3);
      if (!dibLanzador(tipo, 1)) {
        rf(c, -10, -6, 22, 10, 5, '#f97316', O, 2); rf(c, -6, 2, 6, 9, 2, '#c2410c', O, 1.8);
        bolaPropia(c, 0, t); c.translate(16, -1); bolaPropia(c, 3.5, t);
      }
      c.restore();
      // tres puntitos: cuál de los 3 lanzadores es
      var idx = ORDEN_LANZ.indexOf(tipo);
      for (var i = 0; i < 3; i++) circ(c, -7 + i * 7, 16, 2.2, i === idx ? '#93c5fd' : 'rgba(148,163,184,0.45)', O, 1);
    });
  };
  P2.fn.iconoEscudo = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var size = num(o.size, 40), k = size / 48, t = now(), fuera = !!o.fuera, modo = o.modo === 'lanzar' ? 'lanzar' : 'cubrir';
      var variant = o.variant === 'A' || o.variant === 'B' ? o.variant : (look().peter === 'B' ? 'B' : 'A');
      c.translate(num(x, 0), num(y, 0)); c.scale(k, k);
      marcoIcono(c, '#facc15', fuera);
      function escudo(cx, cy, sc, ang) {
        if (!call('escudoPeter', c, cx, cy, { variant: variant, scale: sc, angle: ang })) {
          circ(c, cx, cy, 20 * sc, '#27272a', O, 2.5); circ(c, cx, cy, 15 * sc, '#22c55e', O, 1.5); circ(c, cx, cy, 5 * sc, '#1f2937', null);
        }
      }
      if (fuera) {
        // el escudo está volando: hueco con borde punteado y flecha "vuelve"
        c.save(); c.setLineDash([4, 4]); circ(c, 0, 0, 13, null, '#94a3b8', 2); c.restore();
        c.save(); c.globalAlpha = 0.45; escudo(10, -9, 0.32, t * 8); c.restore();
        c.strokeStyle = '#94a3b8'; c.lineWidth = 2.5;
        c.beginPath(); c.arc(0, 0, 17, -PI * 0.15, PI * 0.55); c.stroke();
        return;
      }
      if (modo === 'cubrir') {
        escudo(2, 0, 0.72, 0);
        // arcos de "protejo"
        c.strokeStyle = '#fde68a'; c.lineWidth = 2.5;
        c.globalAlpha = 0.6 + 0.3 * Math.sin(t * 5);
        c.beginPath(); c.arc(-4, 0, 18, -0.9, 0.9); c.stroke();
        c.globalAlpha = 1;
      } else {
        // lanzar: escudo pequeño girando con líneas de movimiento
        line(c, -18, -6, -8, -6, '#fde68a', 2.5); line(c, -20, 2, -9, 2, '#fde68a', 2.5); line(c, -17, 10, -9, 10, '#fde68a', 2.5);
        escudo(5, 1, 0.55, t * 6);
      }
    });
  };
  P2.fn.iconoCambio = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var size = num(o.size, 40), k = size / 48, t = now();
      c.translate(num(x, 0), num(y, 0)); c.scale(k, k);
      circ(c, 0, 0, 22, '#facc15', O, 3);
      circ(c, 0, 0, 17, null, 'rgba(255,255,255,0.45)', 2);
      c.save(); c.rotate(Math.sin(t * 2) * 0.12);
      [0, PI].forEach(function (a0) {
        c.save(); c.rotate(a0);
        c.strokeStyle = O; c.lineWidth = 4.5; c.lineCap = 'round';
        c.beginPath(); c.arc(0, 0, 11, PI * 1.08, PI * 1.85); c.stroke();
        var ex = Math.cos(PI * 1.85) * 11, ey = Math.sin(PI * 1.85) * 11;
        poly(c, [[ex + 6, ey + 1], [ex - 3, ey - 6], [ex - 2, ey + 5]], O, null);
        c.restore();
      });
      c.restore();
      if (o.tipo && LANZ[o.tipo]) {   // extra opcional: el lanzador siguiente, en pequeño
        c.save(); c.translate(13, 14); c.scale(0.45, 0.45);
        rf(c, -18, -18, 36, 36, 9, '#26294a', O, 3);
        c_ = c; dibLanzador(o.tipo, 0.8);
        c.restore();
      }
    });
  };

  // ===========================================================================
  //  PROPS: roca, sombra de aviso, pez-robot, mina y el "pop" de chispas
  // ===========================================================================
  P2.fn.roca = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var r = num(o.r, 16), rot = num(o.rot, 0);
      c.translate(num(x, 0), num(y, 0)); c.rotate(rot);
      var pts = [];
      for (var i = 0; i < 9; i++) { var a = i / 9 * TAU, j = 0.82 + hash(i * 2.7 + 1) * 0.26; pts.push([Math.cos(a) * r * j, Math.sin(a) * r * j]); }
      poly(c, pts, '#8b7262', O, 2.6);
      c.fillStyle = '#6f594c';
      c.beginPath(); c.moveTo(pts[1][0] * 0.2, pts[1][1] * 0.2); c.lineTo(pts[2][0], pts[2][1]); c.lineTo(pts[3][0], pts[3][1]); c.lineTo(pts[4][0], pts[4][1]); c.closePath(); c.fill();
      poly(c, pts, null, O, 2.6);
      elli(c, -r * 0.32, -r * 0.38, r * 0.3, r * 0.16, 'rgba(255,255,255,0.35)', null);
      line(c, -r * 0.1, r * 0.1, r * 0.3, r * 0.35, 'rgba(26,26,46,0.45)', 2);
      line(c, r * 0.3, r * 0.35, r * 0.25, r * 0.6, 'rgba(26,26,46,0.45)', 2);
    });
  };
  P2.fn.sombraAviso = function (c, x, sueloY, o) {
    o = o || {};
    safe(c, function () {
      var r = num(o.r, 40), t01 = clamp(num(o.t01, 0.5), 0, 1), t = now();
      x = num(x, 0); sueloY = num(sueloY, 0);
      var rr2 = r * (0.35 + 0.65 * t01), blink = 0.55 + 0.45 * Math.abs(Math.sin(t * (8 + t01 * 10)));
      elli(c, x, sueloY, rr2, rr2 * 0.3, 'rgba(26,26,46,' + (0.18 + 0.27 * t01) + ')', null);
      c.save(); c.globalAlpha = blink;
      elli(c, x, sueloY, r, r * 0.3, null, '#ef4444', 3);
      c.setLineDash([6, 6]); c.lineDashOffset = -t * 30;
      elli(c, x, sueloY, r * 0.7, r * 0.21, null, '#fde047', 2);
      c.restore();
    });
  };
  P2.fn.pezRobot = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), f = o.facing === -1 ? -1 : 1, t = num(o.t, now());
      var E = (P2.PAL && P2.PAL.enemy) || { STEEL: '#64748b', STEEL_D: '#475569', RED: '#7f1d1d', RED_L: '#ef4444', EYE: '#ff4d4d' };
      c.translate(num(x, 0), num(y, 0) + Math.sin(t * 3) * 1.5 * s); c.scale(s * f, s);
      // hélice de la cola
      rf(c, -26, -3, 8, 6, 2, E.STEEL_D, O, 1.8);
      c.save(); c.translate(-28, 0); c.scale(1, Math.abs(Math.sin(t * 22)) * 0.9 + 0.1);
      elli(c, 0, 0, 3, 10, '#cbd5e1', O, 1.6); c.restore();
      // aletas
      poly(c, [[-4, -10], [6, -19], [10, -9]], E.RED_L, O, 2);
      poly(c, [[-2, 9], [6, 15], [8, 8]], E.RED_L, O, 2);
      // cuerpo
      elli(c, 0, 0, 20, 12, E.STEEL, O, 2.6);
      c.save(); c.beginPath(); c.ellipse(0, 0, 20, 12, 0, 0, TAU); c.clip();
      c.fillStyle = E.STEEL_D; c.fillRect(-22, 4, 44, 10);
      c.fillStyle = E.RED; c.fillRect(-22, 2, 44, 3);
      for (var r = 0; r < 3; r++) circ(c, -10 + r * 6, -5, 1.4, '#cbd5e1', null);
      c.restore();
      elli(c, 0, 0, 20, 12, null, O, 2.6);
      // boca de rejilla y ojo-luz
      line(c, 15, 4, 19, 3, O, 2); line(c, 14, 6, 18, 6, O, 1.5);
      if (P2.eyeLight) P2.eyeLight(c, 10, -3, 4, E.EYE);
      else { circ(c, 10, -3, 4, E.EYE, O, 1.5); circ(c, 9, -4, 1.4, '#fff', null); }
      line(c, 6, -9, 14, -7, O, 2);
      // burbujitas
      var ph = mod(t * 1.2, 1);
      circ(c, -30 - ph * 10, -4 - ph * 12, 2 + ph * 1.5, 'rgba(220,245,255,0.25)', 'rgba(220,245,255,0.7)', 1);
    });
  };
  P2.fn.mina = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), t = num(o.t, now());
      c.translate(num(x, 0), num(y, 0) + Math.sin(t * 1.8) * 2 * s); c.scale(s, s);
      // cadenita del ancla
      for (var l = 0; l < 3; l++) elli(c, 0, 18 + l * 7, 2.4, 3.6, null, '#64748b', 1.8);
      // pinchos redondeados
      for (var i = 0; i < 8; i++) {
        var a = i * PI / 4 + 0.2;
        c.save(); c.rotate(a);
        rf(c, 11, -2.6, 7, 5.2, 2.4, '#94a3b8', O, 1.8);
        circ(c, 18.5, 0, 3, '#fbbf24', O, 1.5);
        c.restore();
      }
      circ(c, 0, 0, 13, '#3f4a5e', O, 2.6);
      c.save(); c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.clip();
      c.fillStyle = '#7f1d1d'; c.fillRect(-14, -2, 28, 4);
      c.restore();
      circ(c, 0, 0, 13, null, O, 2.6);
      elli(c, -4, -6, 4, 2.4, 'rgba(255,255,255,0.35)', null);
      // luz que parpadea
      var on = Math.sin(t * 6) > 0;
      if (on) glow(c, 0, -5, 12, 'rgba(248,113,113,0.95)', 0.6);
      circ(c, 0, -5, 3.2, on ? '#ef4444' : '#7f1d1d', O, 1.3);
    });
  };
  function tuerca(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    var pts = [];
    for (var i = 0; i < 6; i++) pts.push([Math.cos(i * PI / 3) * r, Math.sin(i * PI / 3) * r]);
    poly(c, pts, '#cbd5e1', O, 1.8);
    circ(c, 0, 0, r * 0.4, '#475569', null);
    c.restore();
  }
  function tornillo(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    rf(c, -r * 0.35, -r * 0.2, r * 0.7, r * 1.6, r * 0.2, '#94a3b8', O, 1.5);
    rf(c, -r * 0.7, -r * 0.6, r * 1.4, r * 0.5, r * 0.2, '#cbd5e1', O, 1.5);
    c.restore();
  }
  P2.fn.chispasPop = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var p = clamp(num(o.t01, 0.3), 0, 1), s = num(o.scale, 1);
      c.translate(num(x, 0), num(y, 0)); c.scale(s, s);
      var fade = 1 - Math.max(0, (p - 0.55) / 0.45);
      // destello inicial
      if (p < 0.35) {
        var q = p / 0.35;
        c.save(); c.globalAlpha = 1 - q; circ(c, 0, 0, 10 + q * 34, '#fff7c2', null); c.restore();
        c.save(); c.globalAlpha = 1 - q; poly(c, starPts(0, 0, 18 + q * 22, 8 + q * 10, 8, q), '#fde047', O, 2.2); c.restore();
      }
      // anillo de humo suave (sin sangre: solo humo, chispas y piezas)
      c.save(); c.globalAlpha = 0.45 * fade;
      for (var h = 0; h < 6; h++) { var ha = h * PI / 3 + 0.4; circ(c, Math.cos(ha) * p * 30, Math.sin(ha) * p * 22 - p * 10, 7 + p * 10, '#e2e8f0', null); }
      c.restore();
      // chispas en estrella
      c.globalAlpha = fade;
      for (var i = 0; i < 10; i++) {
        var a = i / 10 * TAU + 0.3, d0 = 6 + p * 34, d1 = d0 + 10 * (1 - p) + 4;
        line(c, Math.cos(a) * d0, Math.sin(a) * d0, Math.cos(a) * d1, Math.sin(a) * d1, i % 2 ? '#fbbf24' : '#fff7c2', 3);
      }
      // tuercas y tornillos que saltan con gravedad
      for (var n = 0; n < 6; n++) {
        var an = -PI * 0.15 - hash(n * 3.1) * PI * 0.7, v = 70 + hash(n * 5.3) * 60;
        var px = Math.cos(an) * v * p * 0.9, py = Math.sin(an) * v * p * 0.9 + 140 * p * p;
        if (n % 2) tuerca(c, px, py, 4.2, p * 9 + n); else tornillo(c, px, py, 4.2, p * 11 + n);
      }
      // estrellitas
      for (var st = 0; st < 4; st++) {
        var sa = st * PI / 2 + 0.8;
        sparkle(c, Math.cos(sa) * (14 + p * 40), Math.sin(sa) * (10 + p * 30), 5, '#ffffff', fade);
      }
    });
  };
})();
