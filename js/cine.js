// =============================================================================
// cine.js — Motor de HISTORIAS ANIMADAS (cinemáticas) de "El Rescate de Lord Falcon".
// Creado para Juanjo (10 años, Diseñador Jefe) y Papá.
//
// Cada historia de G.storyData (escena 'story') puede tener un GUION: una lista
// de PLANOS, uno por cada línea de texto. Un plano es una DESCRIPCIÓN (datos,
// no código) de lo que se ve mientras se lee esa línea: fondo, cámara, actores
// con acciones animadas, efectos, onomatopeyas de cómic, sonidos y transiciones.
//
//   G.cine.register('s_captura', { planos: [ { fondo: 'canyon', actores: [...] }, ... ] });
//
// Manual completo para los directores: docs/cine-api.md (ejemplo: js/cine/s_captura.js).
//
// API:  G.cine.register(id, def)   registra el guion de una historia
//       G.cine.has(id)             ¿tiene guion?          G.cine.planCount(id)
//       G.cine.draw(ctx, id, lineIdx, lineT, T)   dibuja el plano (devuelve true/false)
//       G.cine.sonar(id, lineIdx, t0, t1)         toca los sonidos del plano en (t0, t1]
//       G.cine.revisar(id)         lista de problemas del guion (nombres mal escritos…)
// Escena de revisión: G.scenes.cineHoja ({id}) = hoja de storyboard en miniatura.
//
// ESCENARIO: el panel de diálogo tapa la franja y = 354…522. Toda la ACCIÓN va
// en y = 0…345. Suelo por defecto: pies en y = 330. El fondo ocupa todo.
// Reglas: nunca lanza excepciones al dibujar; ES2020 sin dependencias; file://.
// =============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;

  var W = 960, H = 540;
  var SUELO = 330;            // pies de los personajes (línea de suelo por defecto)
  var ALTO_ESCENA = 345;      // la acción ocurre en y = 0…345
  var ANCLA_X = 480, ANCLA_Y = 172;   // centro de la zona de acción (la cámara mira aquí)
  var OUTLINE = '#1a1a2e';
  var TAU = Math.PI * 2;
  var FUENTE = 'system-ui, "Segoe UI", Arial, sans-serif';
  var FUENTE_COMIC = '"Arial Black", "Arial Rounded MT Bold", Impact, system-ui, sans-serif';
  var DESLIZ = 0.65;          // segundos de la continuidad (actores y cámara)
  var T_FUNDIDO = 0.45, T_PAGINA = 0.7;

  // ---------------------------------------------------------------------------
  //  Utilidades
  // ---------------------------------------------------------------------------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function c01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // Color del borde de un resplandor (brillo / brillar). Para colores CLAROS se mantiene el
  // aspecto aprobado (se funde hacia blanco transparente). Para colores OSCUROS (sombras,
  // noche) se funde hacia el MISMO color con alfa 0: si no, el borde aclara y parece niebla.
  function finBrillo(ctx, col) {
    var BLANCO0 = 'rgba(255,255,255,0)';
    if (typeof col !== 'string' || !col) return BLANCO0;
    var s = col.trim(), m, r, g, b;
    if (!/^(#|rgb)/i.test(s)) {   // nombres ('navy'…): que el lienzo lo traduzca
      try { var prev = ctx.fillStyle; ctx.fillStyle = '#000001'; ctx.fillStyle = s; s = String(ctx.fillStyle); ctx.fillStyle = prev; } catch (e) { return BLANCO0; }
    }
    if ((m = /^#([0-9a-f]{3,8})$/i.exec(s))) {
      var h = m[1];
      if (h.length === 3 || h.length === 4) { r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16); }
      else if (h.length === 6 || h.length === 8) { r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
      else return BLANCO0;
    } else if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s))) {
      r = +m[1]; g = +m[2]; b = +m[3];
    } else return BLANCO0;
    if (Math.max(r, g, b) >= 115) return BLANCO0;   // claro o saturado: como siempre
    return 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',0)';
  }
  function easeIn(t) { return t * t; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOutBack(t) { var a = 1.9, b = a + 1; return 1 + b * Math.pow(t - 1, 3) + a * Math.pow(t - 1, 2); }
  function hash(i, k) { var s = Math.sin(i * 127.1 + (k || 0) * 311.7 + 0.37) * 43758.5453; return s - Math.floor(s); }
  function esObj(o) { return o !== null && typeof o === 'object' && !Array.isArray(o); }
  function copia(o) {
    var r = {};
    if (esObj(o)) for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
    return r;
  }
  function lista(v) { return Array.isArray(v) ? v : (v === undefined || v === null ? [] : [v]); }
  function dist(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }

  // Errores: nunca se lanzan; se avisan UNA vez por consola (los tests los ven).
  var errores = [];
  function fallo(donde, e) {
    var msg = '[cine] ' + donde + ': ' + ((e && e.message) ? e.message : String(e));
    if (errores.indexOf(msg) >= 0) return;
    errores.push(msg);
    if (errores.length > 40) errores.shift();
    try { if (window.console && console.warn) console.warn(msg); } catch (x) { /* nada */ }
  }
  function seguro(ctx, donde, fn) {
    ctx.save();
    try { fn(); } catch (e) { fallo(donde, e); }
    ctx.restore();
  }

  // Arte disponible (siempre con comprobación: si falta, dibujo de respaldo).
  function gfx(nombre) { var f = G.gfx && G.gfx[nombre]; return (typeof f === 'function') ? f : null; }
  function hayP2(nombre) { var P = window.P2; return !!(P && P.fn && typeof P.fn[nombre] === 'function' && typeof P.call === 'function'); }
  function dibP2(nombre, c, a1, a2, a3, a4) {
    if (!hayP2(nombre)) return false;
    return window.P2.call(nombre, c, a1, a2, a3, a4);
  }
  function sfx(nombre) { try { if (G.audio && G.audio.sfx) G.audio.sfx(nombre); } catch (e) { /* nada */ } }

  // Formas básicas
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function circ(c, x, y, r, fill, stroke, lw) {
    c.beginPath(); c.arc(x, y, Math.abs(r), 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 3; c.stroke(); }
  }
  function estrella(c, x, y, r1, r2, puntas, rot) {
    c.beginPath();
    for (var i = 0; i < puntas * 2; i++) {
      var a = rot + i * Math.PI / puntas - Math.PI / 2, r = (i % 2) ? r2 : r1;
      if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  function lienzoNuevo(w, h) {
    try {
      if (typeof document === 'undefined' || !document.createElement) return null;
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      return cv;
    } catch (e) { return null; }
  }
  var lienzos = {};
  function lienzo(nombre, w, h) {
    var cv = lienzos[nombre];
    if (!cv) { cv = lienzoNuevo(w, h); if (!cv) return null; lienzos[nombre] = cv; }
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    return cv;
  }

  // ===========================================================================
  //  CATÁLOGO DE ACTORES ('quien')
  //  dib(c, s, o, t, pose) dibuja con los PIES en (0, 0), mirando a la DERECHA,
  //  a escala absoluta s. alto = alto a escala 1 (px). esc = escala por defecto
  //  en las cinemáticas (héroes ≈ 115 px). vuela = flota solo.
  // ===========================================================================
  function hk(o) { return !!(o.hacked || o.hackeado || o.good || o.bueno); }
  function variante(o, clave) {
    if (o.variant === 'A' || o.variant === 'B') return o.variant;
    if (o.variante === 'A' || o.variante === 'B') return o.variante;
    var v = G.p2 && G.p2.vehicle && G.p2.vehicle[clave];
    return v === 'B' ? 'B' : 'A';
  }
  function abierta(o) { return !!(o.abierta || o.open); }

  var CAT = {
    director: { alto: 68, ancho: 40, esc: 1.7, anima: true, color: '#3b82f6', poses: { walk: 'run', roar: 'win' },
      dib: function (c, s, o, t, pose) { var f = gfx('drawDirector'); if (!f) return false; f(c, 0, 0, { t: t, facing: 1, pose: pose, scale: s }); } },
    falcon: { alto: 67, ancho: 40, esc: 1.7, anima: true, color: '#22c55e', poses: { walk: 'run', hack: 'shoot', roar: 'win' },
      dib: function (c, s, o, t, pose) { var f = gfx('drawFalcon'); if (!f) return false; f(c, 0, 0, { t: t, facing: 1, pose: pose, scale: s, enCelda: !!o.enCelda }); } },
    toros: { alto: 183, ancho: 120, esc: 1.15, anima: true, color: '#b87333',
      poses: { run: 'walk', jump: 'charge', fall: 'charge', attack: 'slam', win: 'roar', hack: 'idle' },
      dib: function (c, s, o, t, pose) { var f = gfx('drawToros'); if (!f) return false; f(c, 0, 0, { t: t, facing: 1, pose: pose, scale: s, shield: !!(o.escudo || o.shield), sinMartillo: !!o.sinMartillo }); } },
    guardia: { alto: 67, ancho: 42, esc: 1.6, anima: true, color: '#92400e',
      poses: { run: 'walk', jump: 'walk', fall: 'walk', attack: 'charge', shoot: 'charge', win: 'idle', hack: 'idle', roar: 'charge' },
      dib: function (c, s, o, t, pose) { var f = gfx('drawToroGuard'); if (!f) return false; f(c, 0, 0, { t: t, facing: 1, pose: pose, scale: s }); } },
    dron: { alto: 27, ancho: 46, esc: 2.2, vuela: true, color: '#dc2626',
      dib: function (c, s, o, t) { var f = gfx('drawDrone'); if (!f) return false; f(c, 0, -13 * s, { t: t, scale: s }); } },
    torreta: { alto: 30, ancho: 42, esc: 2, color: '#7f1d1d',
      dib: function (c, s, o, t) { var f = gfx('drawTurret'); if (!f) return false; f(c, 0, -17 * s, { t: t, scale: s, hacked: hk(o), angle: num(o.angle, num(o.angulo, -0.25)) }); } },
    nave: { alto: 35, ancho: 72, esc: 2.4, vuela: true, color: '#3b82f6',
      dib: function (c, s, o, t) { var f = gfx('drawPlayerShip'); if (!f) return false; f(c, 0, -18 * s, { t: t, scale: s, tilt: num(o.tilt, 0), esquema: o.esquema }); } },
    naveEnemiga: { alto: 39, ancho: 56, esc: 2, vuela: true, mira: -1, color: '#991b1b',
      dib: function (c, s, o, t) {
        var f = gfx('drawEnemyShip'); if (!f) return false;
        var tipo = o.tipo || o.type || 'medium', h = tipo === 'guardian' ? 51 : (tipo === 'small' ? 15 : 39);
        f(c, 0, -h * 0.5 * s, { t: t, scale: s, type: tipo, hacked: hk(o) });
      } },
    naveNodriza: { alto: 51, ancho: 91, esc: 4.5, vuela: true, mira: -1, color: '#7f1d1d',
      dib: function (c, s, o, t) { var f = gfx('drawEnemyShip'); if (!f) return false; f(c, 0, -25 * s, { t: t, scale: s, type: 'guardian', hacked: hk(o) }); } },
    asteroide: { alto: 56, ancho: 56, esc: 1.4, vuela: true, color: '#78716c',
      dib: function (c, s, o) { var f = gfx('drawAsteroid'); if (!f) return false; f(c, 0, -28 * s, 28 * s, num(o.semilla, 3)); } },
    martillo: { alto: 76, ancho: 64, esc: 1.5, color: '#78350f',
      dib: function (c, s, o, t) { var f = gfx('drawHammer'); if (!f) return false; f(c, 0, -48 * s, { t: t, angle: num(o.angle, num(o.angulo, 0)), clavado: !!o.clavado, scale: s }); } },
    gema: { alto: 18, ancho: 14, esc: 3, color: '#e11d48',
      dib: function (c, s, o, t) { var f = gfx('drawGem'); if (!f) return false; c.translate(0, -9 * s); c.scale(s, s); f(c, 0, 0, t); } },
    celda: { alto: 119, ancho: 76, esc: 2.1, color: '#f97316',
      dib: function (c, s, o, t) { var f = gfx('drawEnergyCell'); if (!f) return false; f(c, 0, -59 * s, { t: t, open: abierta(o), scale: s }); } },
    juanjo: { alto: 96, ancho: 58, esc: 1.2, respira: true, color: '#2c4276',
      dib: function (c, s, o, t) { var f = gfx('drawJuanjo'); if (!f) return false; f(c, 0, 0, { t: t, scale: s }); } },
    papa: { alto: 115, ancho: 70, esc: 1.2, respira: true, color: '#20305a',
      dib: function (c, s, o, t) { var f = gfx('drawPapa'); if (!f) return false; f(c, 0, 0, { t: t, scale: s }); } },
    duo: { alto: 116, ancho: 124, esc: 1.2, respira: true, color: '#20305a',
      dib: function (c, s, o, t) { var f = gfx('drawJuanjoPapaDuo'); if (!f) return false; f(c, 0, 0, { t: t, scale: s }); } },
    corazon: { alto: 30, ancho: 30, esc: 1.5, color: '#ff5a7a',
      dib: function (c, s, o) { var f = gfx('drawHeart'); if (!f) return false; f(c, 0, -15 * s, 30 * s, o.vacio ? 'empty' : 'full'); } },
    flecha: { alto: 8, ancho: 40, esc: 1.6, color: '#78350f',
      dib: function (c, s, o) { var f = gfx('drawArrowProj'); if (!f) return false; c.translate(0, -4 * s); c.scale(s, s); f(c, 0, 0, num(o.angle, num(o.angulo, 0))); } },
    // ---- Parte 2 (P2.fn, siempre con P2.call) ----
    secuaz: { alto: 215, ancho: 166, esc: 1.1, respira: true, color: '#64748b',
      dib: function (c, s, o) { return dibP2('secuaz', c, 0, 0, { scale: s, good: hk(o), angle: (typeof o.angle === 'number') ? o.angle : undefined }); } },
    boxeador: { alto: 80, ancho: 50, esc: 1.5, respira: true, color: '#64748b',
      dib: function (c, s, o, t, pose) { return dibP2('boxeador', c, 0, 0, { scale: s, facing: 1, pose: (pose === 'attack' || pose === 'golpe' || pose === 'shoot') ? 'golpe' : 'guardia', hacked: hk(o) }); } },
    robotEscudo: { alto: 96, ancho: 90, esc: 1.4, respira: true, color: '#64748b',
      dib: function (c, s, o) { return dibP2('robotEscudo', c, 0, 0, { scale: s, facing: 1, hacked: hk(o) }); } },
    robotArana: { alto: 50, ancho: 80, esc: 1.6, respira: true, color: '#64748b',
      dib: function (c, s, o) { return dibP2('robotArana', c, 0, 0, { scale: s, facing: 1, techo: !!o.techo, hacked: hk(o) }); } },
    miniTorreta: { alto: 46, ancho: 42, esc: 1.6, respira: true, color: '#7f1d1d',
      dib: function (c, s, o) { return dibP2('miniTorreta', c, 0, 0, { scale: s, hacked: hk(o), angle: num(o.angle, num(o.angulo, -0.3)) }); } },
    dronEnjambre: { alto: 40, ancho: 34, esc: 1.8, vuela: true, color: '#64748b',
      dib: function (c, s, o) { return dibP2('dronEnjambre', c, 0, -14 * s, { scale: s, facing: 1, hacked: hk(o) }); } },
    dronRayo: { alto: 44, ancho: 48, esc: 1.8, vuela: true, color: '#64748b',
      dib: function (c, s, o) { return dibP2('dronRayo', c, 0, -17 * s, { scale: s, facing: 1, cargando: !!o.cargando, aturdido: !!o.aturdido, hacked: hk(o) }); } },
    dronPicado: { alto: 37, ancho: 48, esc: 1.8, vuela: true, color: '#64748b',
      dib: function (c, s, o) { return dibP2('dronPicado', c, 0, -15 * s, { scale: s, angle: num(o.angle, num(o.angulo, 0)), hacked: hk(o) }); } },
    robotTransformable: { alto: 137, ancho: 90, esc: 1.3, respira: true, color: '#2563eb',
      dib: function (c, s, o) { return dibP2('transformableRobot', c, 0, 0, { variant: variante(o, 'transformable'), enemy: !!(o.enemy || o.enemigo), scale: s, facing: 1 }); } },
    cocheTransformable: { alto: 60, ancho: 130, esc: 1.4, color: '#2563eb',
      dib: function (c, s, o) { return dibP2('transformableCoche', c, 0, 0, { variant: variante(o, 'transformable'), enemy: !!(o.enemy || o.enemigo), scale: s, facing: 1, boost: !!(o.boost || o.turbo) }); } },
    mechaHalcon: { alto: 134, ancho: 150, esc: 1.2, color: '#16a34a',
      vuela: function (o) { return o.modo !== 'posado'; },
      dib: function (c, s, o) {
        var v = variante(o, 'mechahalcon'), posado = (o.modo === 'posado');
        var dy = posado ? 0 : (v === 'B' ? -36 : -57) * s;
        return dibP2('mechaHalcon', c, 0, dy, { variant: v, modo: posado ? 'posado' : 'vuelo', enemy: !!(o.enemy || o.enemigo), piloto: (typeof o.piloto === 'boolean') ? o.piloto : !(o.enemy || o.enemigo), scale: s, facing: 1 });
      } },
    robotFusion: { alto: 323, ancho: 270, esc: 0.9, respira: true, color: '#2563eb',
      dib: function (c, s, o, t, pose) { return dibP2('robotFusion', c, 0, 0, { scale: s, facing: 1, pose: (pose === 'attack' || pose === 'shoot' || pose === 'puño' || pose === 'win') ? 'puño' : 'guardia' }); } },
    secuazGigante: { alto: 283, ancho: 278, esc: 1, respira: true, color: '#64748b',
      dib: function (c, s) { return dibP2('secuazGigante', c, 0, 0, { scale: s, facing: 1 }); } },
    gemaPoder: { alto: 33, ancho: 31, esc: 2.2, color: '#e11d48',
      dib: function (c, s, o, t) { return dibP2('gemaPoder', c, 0, -15 * s, { scale: s, t: t, rota: num(o.rota, 0) }); } },
    dronEspia: { alto: 15, ancho: 21, esc: 2.5, vuela: true, color: '#94a3b8',
      dib: function (c, s, o, t) { return dibP2('dronEspia', c, 0, -5 * s, { scale: s, t: t, escaneando: !!o.escaneando }); } },
    jetpack: { alto: 68, ancho: 34, esc: 1.7, color: '#475569',
      dib: function (c, s, o) { return dibP2('jetpack', c, 18 * s, -23 * s, { facing: 1, scale: s, llama: num(o.llama, 0) }); } },
    medalla: { alto: 33, ancho: 23, esc: 2, color: '#fbbf24',
      dib: function (c, s, o, t) { return dibP2('medalla', c, 0, -12 * s, { t: t, scale: s, apagada: !!o.apagada }); } },
    red: { alto: 49, ancho: 49, esc: 1.6, color: '#94a3b8',
      dib: function (c, s, o) { return dibP2('red', c, 0, -26 * s, { scale: s, abierta: o.abierta !== false }); } },
    bumeran: { alto: 39, ancho: 41, esc: 1.4, color: '#22c55e',
      dib: function (c, s, o, t) { return dibP2('bumeran', c, 0, -20 * s, { t: t, scale: s }); } },
    arma: { alto: 48, ancho: 48, esc: 1.4, vuela: true, color: '#26294a',
      dib: function (c, s, o) { return dibP2('iconoArma', c, 0, -24 * s, { arma: o.arma || 'espada', size: 48 * s, ocupada: !!o.ocupada }); } },
    // ---- Dibujados por el motor ----
    reloj: { alto: 112, ancho: 116, esc: 1.3, color: '#22d3ee', dib: function (c, s, o, t) { dibReloj(c, s, o, t); } },
    puerta: { alto: 232, ancho: 210, esc: 1, color: '#475569', dib: function (c, s, o, t) { dibPuerta(c, s, o, t); } }
  };
  // Otros nombres que también valen (el motor los traduce).
  var ALIAS_QUIEN = {
    toroGuard: 'guardia', toroGuardia: 'guardia', drone: 'dron', turret: 'torreta', playerShip: 'nave', naveDirector: 'nave',
    enemyShip: 'naveEnemiga', naveGuardiana: 'naveEnemiga', asteroid: 'asteroide', hammer: 'martillo', gem: 'gema',
    energyCell: 'celda', celdaEnergia: 'celda', heart: 'corazon', 'corazón': 'corazon', arrow: 'flecha',
    darkSecuaz: 'secuaz', transformableRobot: 'robotTransformable', transformableCoche: 'cocheTransformable',
    coche: 'cocheTransformable', mecha: 'mechaHalcon', titan: 'robotFusion', titanHalcon: 'robotFusion', fusion: 'robotFusion',
    gigante: 'secuazGigante', gemaDelPoder: 'gemaPoder', 'bumerán': 'bumeran', smartwatch: 'reloj', 'papá': 'papa',
    'araña': 'robotArana', robotAraña: 'robotArana', juanjoPapa: 'duo', nodriza: 'naveNodriza', mothership: 'naveNodriza',
    icono: 'arma', iconoArma: 'arma'
  };

  // ===========================================================================
  //  PARTE 3 "We Are a Team" (añadido; contrato técnico de la Parte 3, §15.1)
  //  Actores nuevos con el arte aprobado de js/p3/arte-*.js (siempre con P2.call
  //  y respaldo). Escalas con altoArte (P2.P3ALTO o la tabla por defecto) y los
  //  dibujos anclados en el CENTRO o la EMPUÑADURA se bajan para que el actor
  //  siga teniendo los PIES en (0, 0) (P2.P3CAJA si existe; si no, alto / 2).
  //  Variante por defecto: la de G.p3.look (Diseños de Juanjo).
  // ===========================================================================
  var ALTO_POR_DEFECTO_P3 = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40, lanzadorMikey: 30
  };
  function altoArte(n) {
    var P = window.P2, v = P && P.P3ALTO && P.P3ALTO[n];
    return (typeof v === 'number' && v > 0) ? v : (ALTO_POR_DEFECTO_P3[n] || 60);
  }
  // Distancia (a escala 1) del anclaje 'centro'/'empuñadura' al borde inferior del dibujo.
  function bajoAncla(n, cajaClave) {
    var P = window.P2, caja = P && P.P3CAJA && P.P3CAJA[cajaClave || n];
    if (Array.isArray(caja) && typeof caja[3] === 'number') return caja[3];
    return altoArte(n) / 2;
  }
  function lookP3(clave) {
    var l = (G.p3 && G.p3.look) || {};
    return l[clave] === 'B' ? 'B' : 'A';
  }
  function varP3(o, clave) {
    if (o.variant === 'A' || o.variant === 'B') return o.variant;
    if (o.variante === 'A' || o.variante === 'B') return o.variante;
    return lookP3(clave);
  }
  function colorHeroe(h, def) {
    try { if (G.p3 && typeof G.p3.heroColor === 'function') return G.p3.heroColor(h) || def; } catch (e) { /* nada */ }
    return def;
  }
  // Respaldo de Mikey y Peter (contrato §16.3): cápsula de su color con dos ojos.
  function capsulaHeroe(c, s, color) {
    var w = 22 * s, h = 58 * s;
    rr(c, -w / 2, -h, w, h, w / 2); c.fillStyle = color; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2.5; c.stroke();
    circ(c, -w * 0.2, -h * 0.78, Math.max(2, 3 * s), '#ffffff', OUTLINE, 1.5);
    circ(c, w * 0.2, -h * 0.78, Math.max(2, 3 * s), '#ffffff', OUTLINE, 1.5);
  }
  function dibMikey(c, s, o, t, pose) {
    var v = varP3(o, 'mikey'), arma = (typeof o.arma === 'string') ? o.arma : 'pistola';
    if (dibP2('mikeyJuego', c, 0, 0, { variant: v, scale: s, facing: 1, pose: pose, t: t, arma: arma })) return true;
    if (dibP2('mikey', c, 0, 0, { variant: v, scale: s * 68 / altoArte('mikey'), facing: 1, pose: pose === 'disparo' ? 'disparo' : 'idle', arma: arma })) return true;
    capsulaHeroe(c, s, colorHeroe('mikey', '#f97316'));
    return true;
  }
  function dibPeter(c, s, o, t, pose) {
    var v = varP3(o, 'peter');
    var modo = (o.modoEscudo === 'mano' || o.modoEscudo === 'cubrir' || o.modoEscudo === 'fuera') ? o.modoEscudo : (pose === 'bloquear' ? 'cubrir' : 'mano');
    if (dibP2('peterJuego', c, 0, 0, { variant: v, scale: s, facing: 1, pose: pose, t: t, escudo: modo })) return true;
    var p0 = (pose === 'bloquear' || modo === 'cubrir') ? 'bloquear' : (pose === 'lanzar' ? 'lanzar' : 'idle');
    if (dibP2('peter', c, 0, 0, { variant: v, scale: s * 68 / altoArte('peter'), facing: 1, pose: p0 })) return true;
    capsulaHeroe(c, s, colorHeroe('peter', '#facc15'));
    return true;
  }
  function dibJefeP3(nombre, extra) {
    return function (c, s, o) {
      var op = { scale: s, facing: 1 };
      var ex = extra ? extra(o) : null;
      if (ex) for (var k in ex) if (Object.prototype.hasOwnProperty.call(ex, k)) op[k] = ex[k];
      return dibP2(nombre, c, 0, 0, op);
    };
  }
  // La gema copia del PECHO de Robovill, agrietada (ap = 0) o apagada (ap 0…1), encima de su dibujo.
  // Sitio y tamaño: P2.P3PUNTOS.robovill[variante].gema = [dx, dy, radio] (escala 1, mirando a la derecha);
  // el arte dibuja ahí P2.fn.gemaCopia con escala radio / 19,2 (1,2 en la A, 1,15 en la B).
  var GEMA_PECHO = { A: [14, -110, 23], B: [0, -128, 22] };
  var GEMA_PTS = [[0, -16], [11, -6], [8, 13], [-8, 13], [-11, -6]];
  function gemaPechoRota(c, s, v, ap) {
    var P = window.P2, pt = P && P.P3PUNTOS && P.P3PUNTOS.robovill && P.P3PUNTOS.robovill[v] && P.P3PUNTOS.robovill[v].gema;
    if (!(Array.isArray(pt) && pt.length >= 3 && pt.every(function (n) { return typeof n === 'number' && isFinite(n); }))) pt = GEMA_PECHO[v] || GEMA_PECHO.A;
    var k = s * pt[2] / 19.2;
    function forma(esc, dy) { c.beginPath(); GEMA_PTS.forEach(function (q, i) { if (i) c.lineTo(q[0] * esc, q[1] * esc + dy); else c.moveTo(q[0] * esc, q[1] * esc + dy); }); c.closePath(); }
    c.save();
    c.translate(pt[0] * s, pt[1] * s); c.scale(k, k); c.lineJoin = 'round'; c.lineCap = 'round';
    if (ap > 0) {
      // el halo se apaga: una sombra suave encima del brillo
      var rg = c.createRadialGradient(0, 0, 4, 0, 0, 31);
      rg.addColorStop(0, 'rgba(15,23,42,' + (0.55 * ap) + ')'); rg.addColorStop(1, 'rgba(15,23,42,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(0, 0, 31, 0, TAU); c.fill();
      // la gema, gris y sin luz (se tapa del todo cuando ap = 1)
      forma(1, 0);
      var gg = c.createLinearGradient(-10, -16, 10, 13);
      gg.addColorStop(0, 'rgba(100,116,139,' + ap + ')'); gg.addColorStop(1, 'rgba(51,65,85,' + ap + ')');
      c.fillStyle = gg; c.fill();
      c.strokeStyle = 'rgba(15,23,42,' + ap + ')'; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,' + (0.12 * ap) + ')';
      c.beginPath(); c.moveTo(0, -16); c.lineTo(11, -6); c.lineTo(0, -4); c.closePath(); c.fill();
    }
    // la grieta (blanca con borde oscuro, como la de la gema suelta)
    c.beginPath(); c.moveTo(2, -16); c.lineTo(-2, -8); c.lineTo(4, -2); c.lineTo(-3, 5); c.lineTo(1, 13);
    c.moveTo(4, -2); c.lineTo(9, 1);
    c.strokeStyle = '#f8fafc'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#0f172a'; c.lineWidth = 0.9; c.stroke();
    c.restore();
  }
  // ---- Cabina VACÍA de un vehículo hackeado (piloto: false) -------------------
  // El arte de la robot-moto y del submarino-nave dibuja al piloto en la cabina en
  // cuanto el vehículo es del equipo (enemigo: false). Para el momento entre el
  // hackeo y el salto del héroe a su vehículo, el cine tapa la cabina con su cristal
  // vacío (mismos sitios y colores que js/p3/arte-vehiculos.js, que es arte aprobado
  // y no cambia). Escala 1, mirando a la derecha; los pies (moto) o el centro (sub) en (0, 0).
  var CABINA_MOTO = { robotA: [-6, -102, 23, 25, 8], motoA: [-26, -76, 36, 30, 13], robotB: [-12, -120, 30, 32, 11], motoB: [-32, -98, 36, 30, 13] };
  var OJO_SUB = { A: [-4, -37, 14], B: [14, -33, 14] };
  function brilloCristal(c, x, y, w, h) {
    c.globalAlpha = 0.45; c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(x + w * 0.84, y); c.lineTo(x + w * 0.96, y); c.lineTo(x + w * 0.9, y + h * 0.55); c.lineTo(x + w * 0.78, y + h * 0.55);
    c.closePath(); c.fill(); c.globalAlpha = 1;
  }
  function cabinaVaciaMoto(c, s, v, modo) {
    var q = CABINA_MOTO[(modo === 'moto' ? 'moto' : 'robot') + v] || CABINA_MOTO.robotA;
    var x = q[0], y = q[1], w = q[2], h = q[3];
    c.save(); c.scale(s, s); c.lineJoin = 'round';
    rr(c, x, y, w, h, q[4]);
    var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#e0f2fe'); g.addColorStop(1, '#7dd3fc');
    c.fillStyle = g; c.fill();
    c.save(); c.clip(); brilloCristal(c, x, y, w, h); c.restore();
    rr(c, x, y, w, h, q[4]); c.strokeStyle = OUTLINE; c.lineWidth = 2.5; c.stroke();
    c.restore();
  }
  function cabinaVaciaSub(c, s, v, dy) {
    var q = OJO_SUB[v] || OJO_SUB.A, x = q[0], y = q[1], r = q[2];
    c.save(); c.translate(0, dy); c.scale(s, s);
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    var g = c.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#ecfeff'); g.addColorStop(1, '#a5f3fc');
    c.fillStyle = g; c.fill();
    c.globalAlpha = 0.45; c.strokeStyle = '#ffffff'; c.lineCap = 'round'; c.lineWidth = Math.max(1.5, r * 0.16);
    c.beginPath(); c.arc(x, y, r * 0.78, -1.25, -0.35); c.stroke(); c.globalAlpha = 1;
    circ(c, x, y, r, null, OUTLINE, 2.5);
    c.restore();
  }
  function sinPiloto(o) { return o.piloto === false && !(o.enemy || o.enemigo); }

  // ---- Puzles de la fábrica oscura (s3_cap4): palanca, diana y consola ---------
  // Arte del juego (P2.fn.palanca, P2.fn.diana y P2.fn.tile3 'diana'/'console' de
  // js/p3/arte-escenarios3.js), a la escala de los héroes del cine (1,7). Con respaldo.
  // Estado: true/false o un número 0…1 (para 'animar': la palanca baja poco a poco).
  function estado01(o, claves) {
    for (var i = 0; i < claves.length; i++) {
      var v = o[claves[i]];
      if (v === true) return 1;
      if (typeof v === 'number' && isFinite(v)) return Math.max(0, Math.min(1, v));
    }
    return 0;
  }
  function dibPalanca(c, s, o, t) {
    var v = estado01(o, ['abajo', 'activada', 'hecha', 'on']);
    if (!hayP2('palanca')) {          // respaldo: base gris y brazo que gira
      rr(c, -17 * s, -13 * s, 34 * s, 13 * s, 4 * s); c.fillStyle = '#64748b'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2.4; c.stroke();
      c.save(); c.translate(0, -12 * s); c.rotate(-0.65 + 1.3 * v);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -26 * s); c.strokeStyle = OUTLINE; c.lineWidth = 7 * s; c.stroke();
      c.strokeStyle = '#cbd5e1'; c.lineWidth = 4 * s; c.stroke();
      circ(c, 0, -28 * s, 7 * s, v >= 0.5 ? '#22c55e' : '#ef4444', OUTLINE, 2);
      c.restore();
      return true;
    }
    if (v <= 0 || v >= 1) return dibP2('palanca', c, 0, 0, { scale: s, t: t, hecha: v >= 1 });
    // a medio camino: la posición de la que sale, entera, y la nueva apareciendo encima
    var nueva = v >= 0.5;
    dibP2('palanca', c, 0, 0, { scale: s, t: t, hecha: nueva });
    c.save(); c.globalAlpha *= nueva ? 1 - v : v;
    dibP2('palanca', c, 0, 0, { scale: s, t: t, hecha: !nueva });
    c.restore();
    return true;
  }
  function temaPuzle(o) { return (o.tema === 'cielo' || o.tema === 'arena') ? o.tema : 'fabricaOscura'; }
  // tile3(c, x, y, size, tipo, tema, estado) tiene 7 argumentos (dibP2 solo pasa 4 tras el lienzo).
  function dibTile3(c, x, y, L, tipo, tema, estado) {
    if (!hayP2('tile3')) return false;
    return window.P2.call('tile3', c, x, y, L, tipo, tema, estado);
  }
  function dibDiana(c, s, o, t) {
    var hecha = estado01(o, ['rota', 'acertada', 'hecha']) >= 0.5;
    var L = 48 * s;
    if (o.placa !== false && dibTile3(c, -L / 2, -L, L, 'diana', temaPuzle(o), hecha)) return true;
    if (dibP2('diana', c, 0, -L / 2, { scale: s, t: t, hecha: hecha })) return true;
    circ(c, 0, -L / 2, 19 * s, '#ffffff', OUTLINE, 2.4);
    circ(c, 0, -L / 2, 13 * s, hecha ? '#22c55e' : '#ef4444', null);
    circ(c, 0, -L / 2, 5 * s, hecha ? '#16a34a' : '#dc2626', null);
    return true;
  }
  function dibConsola(c, s, o, t) {
    var hk2 = estado01(o, ['hackeada', 'hackeado', 'hacked', 'hecha']) >= 0.5;
    var L = 48 * s;
    if (dibTile3(c, -L / 2, -L, L, 'console', temaPuzle(o), hk2)) return true;
    rr(c, -0.4 * L, -0.72 * L, 0.8 * L, 0.42 * L, 4 * s); c.fillStyle = '#3d4660'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2.5; c.stroke();
    rr(c, -0.33 * L, -0.66 * L, 0.66 * L, 0.3 * L, 3 * s); c.fillStyle = hk2 ? '#0f3b24' : '#082f49'; c.fill();
    rr(c, -0.2 * L, -0.34 * L, 0.4 * L, 0.34 * L, 3 * s); c.fillStyle = '#475569'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2.2; c.stroke();
    circ(c, 0, -0.51 * L, 5 * s, hk2 ? '#4ade80' : '#22d3ee', null);
    return true;
  }

  // ---- Silueta de Dark Secuaz para medir (s3_cap1: Robovill es MÁS GRANDE) ----
  // Dark Secuaz (bueno, verde) medio transparente, como un "cartel de medida", con
  // una raya discontinua a la altura de su cabeza que se alarga hacia delante
  // (`linea`, px de pantalla; 0 = sin raya). `opacidad` 0…1 (0,5).
  function dibSiluetaSecuaz(c, s, o, t) {
    var op = Math.max(0.1, Math.min(1, num(o.opacidad, 0.5)));
    c.save(); c.globalAlpha *= op;
    var ok = dibP2('secuaz', c, 0, 0, { scale: s, good: true });
    if (!ok) { rr(c, -60 * s, -215 * s, 120 * s, 215 * s, 20 * s); c.fillStyle = '#4ade80'; c.fill(); }
    c.restore();
    var L = num(o.linea, 0);
    if (L > 0) {
      var y = -188 * s;              // la punta de su cañón (el dibujo mide ≈ 188 de alto a escala 1)
      c.save();
      c.setLineDash([12, 9]); c.lineCap = 'butt';
      c.beginPath(); c.moveTo(-40 * s, y); c.lineTo(L, y);
      c.strokeStyle = OUTLINE; c.lineWidth = 6; c.stroke();
      c.strokeStyle = '#86efac'; c.lineWidth = 3; c.stroke();
      c.setLineDash([]);
      // flechitas de "altura" en el extremo
      c.beginPath(); c.moveTo(L, y - 14); c.lineTo(L, y + 14); c.strokeStyle = OUTLINE; c.lineWidth = 6; c.stroke();
      c.strokeStyle = '#86efac'; c.lineWidth = 3; c.stroke();
      c.restore();
    }
    return true;
  }

  var CAT_P3 = {
    mikey: { alto: 68, ancho: 40, esc: 1.7, color: '#f97316', poses: { walk: 'run', attack: 'disparo', shoot: 'disparo', hack: 'idle', roar: 'win' },
      dib: dibMikey },
    peter: { alto: 68, ancho: 40, esc: 1.7, color: '#facc15', poses: { walk: 'run', attack: 'bloquear', shoot: 'lanzar', hack: 'idle', roar: 'win' },
      dib: dibPeter },
    robovill: { alto: altoArte('robovill'), ancho: 330, esc: 0.9, respira: true, color: '#7f1d1d',
      dib: function (c, s, o) {
        var op = { variant: varP3(o, 'robovill'), scale: s, facing: 1, brazo: o.brazo || 'martillo', alas: o.alas === 'cerradas' ? 'cerradas' : 'abiertas' };
        if (typeof o.taladro === 'number') op.taladro = o.taladro;
        if (!dibP2('robovill', c, 0, 0, op)) return false;
        // gema: 'grieta' (agrietada, aún brilla) · 'apagada' / true / 0…1 (agrietada y sin brillo; vale con animar)
        var g = o.gema, ap = (g === 'apagada' || g === true) ? 1 : (typeof g === 'number' ? Math.max(0, Math.min(1, g)) : 0);
        if (ap > 0 || g === 'grieta') gemaPechoRota(c, s, op.variant, ap);
        return true;
      } },
    robotMoto: { alto: altoArte('robotMoto'), ancho: 150, esc: 1, color: '#f97316',
      // el alto cambia con el modo: de pie (robot) o tumbada (moto); lo usan bocadillos, efectos y revisar()
      altoPor: function (o) { return (o && o.modo === 'moto') ? altoArte('robotMotoMoto') : altoArte('robotMoto'); },
      dib: function (c, s, o) {
        var v = varP3(o, 'moto'), modo = o.modo === 'moto' ? 'moto' : 'robot';
        var ok = dibP2('robotMoto', c, 0, 0, { variant: v, modo: modo,
          enemy: !!(o.enemy || o.enemigo), scale: s, facing: 1, boost: !!(o.boost || o.turbo) });
        if (ok && sinPiloto(o)) cabinaVaciaMoto(c, s, v, modo);   // piloto: false → cabina vacía
        return ok;
      } },
    submarinoNave: { alto: altoArte('submarinoNave'), ancho: 210, esc: 1, color: '#facc15',
      vuela: function (o) { return o.modo === 'nave'; },
      dib: function (c, s, o) {
        var v = varP3(o, 'sub'), nave = o.modo === 'nave';
        var dy = -bajoAncla('submarinoNave', 'submarinoNave' + (nave ? 'Nave' : '') + (v === 'B' ? 'B' : '')) * s;
        var ok = dibP2('submarinoNave', c, 0, dy, { variant: v, modo: nave ? 'nave' : 'submarino', enemy: !!(o.enemy || o.enemigo),
          scale: s, facing: 1, estela: o.estela });
        if (ok && sinPiloto(o)) cabinaVaciaSub(c, s, v, dy);       // piloto: false → ojo de buey vacío
        return ok;
      } },
    fusionTerrestre: { alto: altoArte('fusionTerrestre'), ancho: 230, esc: 0.9, respira: true, color: '#2563eb',
      dib: function (c, s) { return dibP2('fusionTerrestre', c, 0, 0, { scale: s, facing: 1, look: (G.p3 && G.p3.look) || undefined }); } },
    fusionVoladora: { alto: altoArte('fusionVoladora'), ancho: 260, esc: 0.9, vuela: true, color: '#16a34a',
      dib: function (c, s) { return dibP2('fusionVoladora', c, 0, -bajoAncla('fusionVoladora') * s, { scale: s, facing: 1, look: (G.p3 && G.p3.look) || undefined }); } },
    fusionFinal: { alto: altoArte('fusionFinal'), ancho: 380, esc: 0.9, respira: true, color: '#16a34a',
      dib: function (c, s) { return dibP2('fusionFinal', c, 0, 0, { scale: s, facing: 1, look: (G.p3 && G.p3.look) || undefined }); } },
    robotPractica: { alto: altoArte('robotPractica'), ancho: 110, esc: 1, respira: true, color: '#22c55e',
      dib: dibJefeP3('robotPractica', function (o) { return { golpe: !!o.golpe }; }) },
    granExcavadora: { alto: altoArte('granExcavadora'), ancho: 300, esc: 1, respira: true, color: '#b45309',
      dib: dibJefeP3('granExcavadora', function (o) { return { humo: o.humo !== false }; }) },
    guardianRobovill: { alto: altoArte('guardianRobovill'), ancho: 170, esc: 1, respira: true, color: '#475569',
      dib: dibJefeP3('guardianRobovill', function (o) { return { escudo: o.escudo !== false, hackeado: !!(o.hackeado || o.hacked) }; }) },
    dronNodriza: { alto: altoArte('dronNodriza'), ancho: 300, esc: 1, vuela: true, color: '#7f1d1d',
      dib: function (c, s, o) {
        return dibP2('dronNodriza', c, 0, -bajoAncla('dronNodriza') * s, { scale: s, facing: 1, abierta: abierta(o), cria: o.cria !== false });
      } },
    gemaCopia: { alto: altoArte('gemaCopia'), ancho: 30, esc: 2.2, color: '#e11d48',
      dib: function (c, s, o, t) {
        // apagada (true o 0…1): la gema se agrieta y pierde el brillo (final de la Parte 3); grieta: solo la grieta.
        var ap = o.apagada === true ? 1 : Math.max(0, Math.min(1, num(o.apagada, 0)));
        var gr = !!(o.grieta || o.agrietada) || ap > 0, dy = -bajoAncla('gemaCopia') * s;
        c.save();
        if (ap > 0) c.globalAlpha *= 1 - 0.25 * ap;
        var ok = dibP2('gemaCopia', c, 0, dy, { scale: s, t: t });
        c.restore();
        if (!ok && !(ap > 0 || gr)) return false;
        c.save(); c.translate(0, dy); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
        var P = [[0, -16], [11, -6], [8, 13], [-8, 13], [-11, -6]];
        if (ok && ap > 0) {          // el marco y la gema, grises y sin brillo
          c.beginPath(); P.forEach(function (q, i) { var k = 1.24; if (i) c.lineTo(q[0] * k, q[1] * k + 0.29); else c.moveTo(q[0] * k, q[1] * k + 0.29); }); c.closePath();
          c.fillStyle = 'rgba(30,41,59,' + (0.45 * ap) + ')'; c.fill();
        }
        if (!ok || ap > 0) {
          c.beginPath(); P.forEach(function (q, i) { if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.closePath();
          c.fillStyle = ok ? 'rgba(71,85,105,' + (0.8 * ap) + ')' : '#be123c'; c.fill();
          if (!ok) { c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke(); }
        }
        if (gr) {
          c.beginPath(); c.moveTo(2, -16); c.lineTo(-2, -8); c.lineTo(4, -2); c.lineTo(-3, 5); c.lineTo(1, 13);
          c.moveTo(4, -2); c.lineTo(9, 1);
          c.strokeStyle = '#f8fafc'; c.lineWidth = 2; c.stroke();
          c.strokeStyle = '#0f172a'; c.lineWidth = 0.9; c.stroke();
        }
        c.restore();
        return true;
      } },
    miniRobot: { alto: altoArte('miniRobot'), ancho: 32, esc: 1.5, vuela: true, color: '#94a3b8',
      dib: function (c, s, o, t) { return dibP2('miniRobot', c, 0, -bajoAncla('miniRobot') * s, { scale: s, facing: 1, t: t }); } },
    escudoPeter: { alto: altoArte('escudoPeter'), ancho: 42, esc: 1.6, color: '#16a34a',
      dib: function (c, s, o) {
        return dibP2('escudoPeter', c, 0, -bajoAncla('escudoPeter') * s, { variant: varP3(o, 'peter'), scale: s, angle: num(o.angle, num(o.angulo, 0)) });
      } },
    // Enemigos del río (arte de arte-escenarios3.js, §16.2; con respaldo propio).
    pezRobot: { alto: 30, ancho: 46, esc: 1.6, vuela: true, color: '#64748b',
      dib: function (c, s, o, t) {
        if (dibP2('pezRobot', c, 0, -15 * s, { facing: 1, scale: s, t: t })) return true;
        c.save(); c.translate(0, -15 * s); c.scale(s, s);
        c.beginPath(); c.ellipse(0, 0, 18, 11, 0, 0, TAU); c.fillStyle = '#64748b'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2.5; c.stroke();
        c.beginPath(); c.moveTo(-16, 0); c.lineTo(-28, -10); c.lineTo(-28, 10); c.closePath(); c.fillStyle = '#ef4444'; c.fill(); c.stroke();
        circ(c, 8, -3, 4, '#fde047', OUTLINE, 1.5); circ(c, 9, -3, 1.6, '#ef4444', null);
        c.restore(); return true;
      } },
    mina: { alto: 34, ancho: 34, esc: 1.4, vuela: true, color: '#475569',
      dib: function (c, s, o, t) {
        if (dibP2('mina', c, 0, -17 * s, { t: t, scale: s })) return true;
        c.save(); c.translate(0, -17 * s); c.scale(s, s);
        for (var i = 0; i < 8; i++) { var a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); c.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); c.strokeStyle = OUTLINE; c.lineWidth = 3; c.stroke(); }
        circ(c, 0, 0, 12, '#475569', OUTLINE, 2.5); circ(c, 0, 0, 4, (Math.sin(num(t, 0) * 6) > 0) ? '#ef4444' : '#7f1d1d', null);
        c.restore(); return true;
      } },
    lanzador: { alto: altoArte('lanzadorMikey'), ancho: 68, esc: 2.2, color: '#60a5fa',
      dib: function (c, s, o) {
        return dibP2('lanzadorMikey', c, 0, -bajoAncla('lanzadorMikey') * s, { tipo: o.tipo || o.type || 'pistola', scale: s, facing: 1 });
      } },
    // Puzles de la fábrica (capítulo 4). Pies en el suelo; para una diana en la pared, ponle una y en el aire.
    palanca: { alto: 54, ancho: 40, esc: 1.7, color: '#facc15', dib: dibPalanca },
    diana: { alto: 48, ancho: 48, esc: 1.7, color: '#ef4444', dib: dibDiana },
    consola: { alto: 48, ancho: 48, esc: 1.7, color: '#22d3ee', dib: dibConsola },
    siluetaSecuaz: { alto: 215, ancho: 166, esc: 1.1, color: '#86efac', dib: dibSiluetaSecuaz }
  };
  // Mikey y Peter se animan solos (poses de juego) cuando existen mikeyJuego / peterJuego;
  // si no, el motor les da el bote de andar como a los demás.
  Object.defineProperty(CAT_P3.mikey, 'anima', { get: function () { return hayP2('mikeyJuego'); }, enumerable: true });
  Object.defineProperty(CAT_P3.peter, 'anima', { get: function () { return hayP2('peterJuego'); }, enumerable: true });
  Object.keys(CAT_P3).forEach(function (k) { if (!CAT[k]) CAT[k] = CAT_P3[k]; });
  var ALIAS_P3 = {
    moto: 'robotMoto', submarino: 'submarinoNave', excavadora: 'granExcavadora', guardian: 'guardianRobovill',
    'gema copia': 'gemaCopia', escudoDePeter: 'escudoPeter', 'guardián': 'guardianRobovill', robotDePractica: 'robotPractica',
    'robot de práctica': 'robotPractica', miniRobots: 'miniRobot', lanzadorMikey: 'lanzador', 'robot-moto': 'robotMoto',
    'submarino-nave': 'submarinoNave', pez: 'pezRobot', 'pez-robot': 'pezRobot', minaSubmarina: 'mina',
    lever: 'palanca', target: 'diana', console: 'consola', terminal: 'consola', silueta: 'siluetaSecuaz', siluetaDarkSecuaz: 'siluetaSecuaz'
  };
  Object.keys(ALIAS_P3).forEach(function (k) { if (!ALIAS_QUIEN[k] && !CAT[k]) ALIAS_QUIEN[k] = ALIAS_P3[k]; });

  function normQuien(q) {
    q = String(q || '');
    if (CAT[q]) return q;
    if (ALIAS_QUIEN[q]) return ALIAS_QUIEN[q];
    return q;   // desconocido: dibujo de respaldo (revisar() lo avisa)
  }
  function catDe(q) { return CAT[q] || { alto: 70, ancho: 50, esc: 1.5, color: '#94a3b8', respira: true, desconocido: true, dib: null }; }
  // Alto (a escala 1) de un actor con sus opciones: algunos cambian de alto según el modo (robot-moto).
  function altoCat(cat, o) {
    if (typeof cat.altoPor === 'function') { try { var a = cat.altoPor(o || {}); if (typeof a === 'number' && a > 0) return a; } catch (e) { /* nada */ } }
    return cat.alto;
  }
  function vuelaCat(cat, o) { return typeof cat.vuela === 'function' ? !!cat.vuela(o) : !!cat.vuela; }

  // Dibujo de respaldo: un muñeco LEGO amable (si falta un arte o el nombre no existe).
  function dibRespaldo(c, s, cat) {
    var h = (cat.alto || 70) * s, w = Math.max(24, (cat.ancho || 50) * s * 0.8);
    rr(c, -w / 2, -h, w, h, Math.min(16, w * 0.3));
    c.fillStyle = cat.color || '#94a3b8'; c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 3; c.stroke();
    rr(c, -w * 0.18, -h - 8, w * 0.36, 10, 4); c.fillStyle = cat.color || '#94a3b8'; c.fill(); c.stroke();
    circ(c, -w * 0.18, -h * 0.72, Math.max(3, w * 0.09), '#ffffff', OUTLINE, 2);
    circ(c, w * 0.18, -h * 0.72, Math.max(3, w * 0.09), '#ffffff', OUTLINE, 2);
    circ(c, -w * 0.16, -h * 0.71, Math.max(1.5, w * 0.045), OUTLINE, null);
    circ(c, w * 0.2, -h * 0.71, Math.max(1.5, w * 0.045), OUTLINE, null);
    c.beginPath(); c.arc(0, -h * 0.58, Math.max(3, w * 0.12), 0.15 * Math.PI, 0.85 * Math.PI);
    c.strokeStyle = OUTLINE; c.lineWidth = 2.5; c.stroke();
  }

  // Reloj inteligente del Director (primer plano). o: senal, error, texto, mapa.
  function dibReloj(c, s, o, t) {
    c.save();
    c.scale(s, s);
    c.lineJoin = 'round';
    // correa
    rr(c, -30, -112, 60, 112, 12); c.fillStyle = '#0f172a'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(148,163,184,0.35)'; c.lineWidth = 2;
    for (var i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-22, -104 + i * 6); c.lineTo(22, -104 + i * 6); c.stroke(); c.beginPath(); c.moveTo(-22, -24 + i * 6); c.lineTo(22, -24 + i * 6); c.stroke(); }
    // halo
    var brillo = 0.35 + 0.2 * Math.sin(t * 6);
    c.save(); c.globalAlpha = brillo; circ(c, 0, -56, 66, o.error ? 'rgba(239,68,68,0.45)' : 'rgba(34,211,238,0.4)', null); c.restore();
    // caja
    rr(c, -54, -100, 108, 88, 22); c.fillStyle = '#1e293b'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 4; c.stroke();
    rr(c, -46, -92, 92, 72, 16);
    var g = c.createLinearGradient(0, -92, 0, -20); g.addColorStop(0, '#082f49'); g.addColorStop(1, '#0c4a6e');
    c.fillStyle = g; c.fill(); c.strokeStyle = o.error ? '#ef4444' : '#22d3ee'; c.lineWidth = 2.5; c.stroke();
    // botón
    rr(c, 52, -66, 8, 18, 3); c.fillStyle = '#475569'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke();
    c.save();
    rr(c, -46, -92, 92, 72, 16); c.clip();
    if (o.error) {
      var on = Math.sin(t * 10) > -0.3;
      c.fillStyle = on ? '#ef4444' : '#7f1d1d';
      c.font = '900 22px ' + FUENTE_COMIC; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ERROR', 0, -62);
      c.font = 'bold 13px ' + FUENTE; c.fillStyle = '#fecaca';
      c.fillText(String(o.texto || '¡NO SE PUEDE!'), 0, -38);
    } else {
      // radar con la señal
      c.strokeStyle = 'rgba(34,211,238,0.35)'; c.lineWidth = 1.5;
      for (var r = 12; r <= 44; r += 14) { c.beginPath(); c.arc(0, -56, r, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(-46, -56); c.lineTo(46, -56); c.moveTo(0, -92); c.lineTo(0, -20); c.stroke();
      var ang = t * 2.4;
      c.save(); c.globalAlpha = 0.35; c.fillStyle = '#22d3ee';
      c.beginPath(); c.moveTo(0, -56); c.arc(0, -56, 46, ang - 0.6, ang); c.closePath(); c.fill(); c.restore();
      if (o.senal !== false) {
        var px = num(o.senalX, 18), py = -56 + num(o.senalY, -12);
        var bl = (Math.sin(t * 9) > 0);
        c.save(); c.globalAlpha = 0.5; circ(c, px, py, 9 + 4 * Math.sin(t * 9), o.color || '#4ade80', null); c.restore();
        circ(c, px, py, 5, bl ? (o.color || '#4ade80') : '#14532d', OUTLINE, 1.5);
      }
      c.font = 'bold 12px ' + FUENTE; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#a5f3fc';
      c.fillText(String(o.texto || 'FALCON'), 0, -28);
    }
    c.restore();
    c.restore();
  }

  // Puerta grande de dos hojas. o: abierta (0…1), estilo, ojo (ojo rojo al fondo), luz.
  var ESTILOS_PUERTA = {
    nave: { marco: '#3f1d1d', hoja: '#7f1d1d', hoja2: '#991b1b', raya: '#f97316', luz: '#f97316' },
    fortaleza: { marco: '#6b6894', hoja: '#8b87b5', hoja2: '#a5a1cf', raya: '#b87333', luz: '#fbbf24' },
    fabrica: { marco: '#334155', hoja: '#64748b', hoja2: '#94a3b8', raya: '#facc15', luz: '#facc15' },
    trono: { marco: '#3f0d12', hoja: '#7f1d1d', hoja2: '#b91c1c', raya: '#fbbf24', luz: '#fbbf24' },
    base: { marco: '#0f172a', hoja: '#1e3a8a', hoja2: '#3b82f6', raya: '#22d3ee', luz: '#22d3ee' }
  };
  function dibPuerta(c, s, o, t) {
    var E = ESTILOS_PUERTA[o.estilo] || ESTILOS_PUERTA.nave;
    var ab = c01(num(o.abierta, o.abierta === true ? 1 : 0));
    c.save(); c.scale(s, s); c.lineJoin = 'round';
    var w = 180, h = 220;
    // hueco oscuro detrás
    rr(c, -w / 2, -h, w, h, 14);
    var g = c.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, '#05030a'); g.addColorStop(1, '#1a1024');
    c.fillStyle = g; c.fill();
    if (o.ojo && ab > 0.1) {
      var a = c01((ab - 0.1) * 2) * (0.75 + 0.25 * Math.sin(t * 3));
      c.save(); c.globalAlpha = a * 0.5; circ(c, 0, -h * 0.62, 26, '#ff4d4d', null); c.restore();
      c.save(); c.globalAlpha = a; circ(c, 0, -h * 0.62, 10, '#ff4d4d', OUTLINE, 2); circ(c, 3, -h * 0.62 - 3, 3, '#ffffff', null); c.restore();
    } else if (ab > 0.05) {
      // luz que sale del hueco: degradado que se desvanece, recortado al hueco
      c.save(); rr(c, -w / 2, -h, w, h, 14); c.clip();
      c.globalAlpha = c01(ab * 0.55);
      var gl = c.createRadialGradient(0, -h * 0.4, 8, 0, -h * 0.4, w * 0.75);
      gl.addColorStop(0, o.luz || E.luz); gl.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gl; c.fillRect(-w / 2, -h, w, h); c.restore();
    }
    // hojas que se abren hacia los lados
    var hw = w / 2 * (1 - ab * 0.92);
    c.save(); rr(c, -w / 2, -h, w, h, 14); c.clip();
    [-1, 1].forEach(function (lado) {
      var x0 = lado < 0 ? -w / 2 : w / 2 - hw;
      rr(c, x0, -h, hw, h, 6); c.fillStyle = E.hoja; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 3; c.stroke();
      if (hw > 12) {
        rr(c, x0 + 8, -h + 14, hw - 16, h * 0.4, 5); c.fillStyle = E.hoja2; c.fill(); c.lineWidth = 2; c.stroke();
        c.fillStyle = E.raya; c.fillRect(x0 + 6, -h * 0.45, hw - 12, 8);
        circ(c, lado < 0 ? x0 + hw - 12 : x0 + 12, -h * 0.3, 5, E.raya, OUTLINE, 2);
      }
    });
    c.restore();
    // marco
    c.strokeStyle = OUTLINE; c.lineWidth = 16; rr(c, -w / 2 - 6, -h - 6, w + 12, h + 6, 18); c.stroke();
    c.strokeStyle = E.marco; c.lineWidth = 10; rr(c, -w / 2 - 6, -h - 6, w + 12, h + 6, 18); c.stroke();
    if (window.P2 && P2.horns && (o.estilo === 'fortaleza' || o.estilo === 'trono' || o.estilo === 'nave')) {
      try { P2.horns(c, 0, -h - 4, 1.1, '#b87333'); } catch (e) { /* nada */ }
    }
    c.restore();
  }

  // ===========================================================================
  //  FONDOS
  // ===========================================================================
  function fondoMenu(c, t) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1a4a'); g.addColorStop(0.5, '#5b21b6'); g.addColorStop(1, '#7c2d12');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 60; i++) {
      c.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7));
      circ(c, (i * 137.5) % W, (i * 79.3) % (H * 0.7), 1 + (i % 3) * 0.6, '#fef9c3', null);
    }
    c.globalAlpha = 1;
  }
  function fondoNegro(c, t) {
    c.fillStyle = '#05030a'; c.fillRect(0, 0, W, H);
    var g = c.createRadialGradient(480, 220, 20, 480, 220, 420);
    g.addColorStop(0, 'rgba(76,29,149,0.45)'); g.addColorStop(1, 'rgba(5,3,10,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 24; i++) {
      c.globalAlpha = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1));
      circ(c, (i * 211.7) % W, (i * 97.1) % 330, 1.2, '#c4b5fd', null);
    }
    c.globalAlpha = 1;
  }
  var FONDOS = {
    canyon: { suelo: 'arena', dib: function (c, x, t) { var f = gfx('drawBgCanyon'); if (!f) return false; f(c, x, t); } },
    base: { suelo: 'metal', dib: function (c, x, t) { var f = gfx('drawBgBase'); if (!f) return false; f(c, x, t); } },
    espacio: { suelo: 'ninguno', dib: function (c, x, t) { var f = gfx('drawBgSpace'); if (!f) return false; f(c, x, t); } },
    nodriza: { suelo: 'nave', dib: function (c, x, t) { var f = gfx('drawBgMothership'); if (!f) return false; f(c, x, t); } },
    trono: { suelo: 'trono', dib: function (c, x, t) { var f = gfx('drawBgThrone'); if (!f) return false; f(c, t); } },
    ciudad: { suelo: 'acera', dib: function (c, x, t) { return dibP2('bgCiudad', c, x, t); } },
    fabrica: { suelo: 'fabrica', dib: function (c, x, t) { return dibP2('bgFabrica', c, x, t); } },
    carretera: { suelo: 'carretera', dib: function (c, x, t) { return dibP2('bgCarretera', c, x, t); } },
    cielo: { suelo: 'nubes', dib: function (c, x, t) { return dibP2('bgCielo', c, x, t); } },
    fortaleza: { suelo: 'piedra', dib: function (c, x, t) { return dibP2('bgFortaleza', c, t); } },
    menu: { suelo: 'ninguno', dib: function (c, x, t) { fondoMenu(c, t); } },
    negro: { suelo: 'ninguno', dib: function (c, x, t) { fondoNegro(c, t); } }
  };
  var ALIAS_FONDO = {
    'cañon': 'canyon', 'cañón': 'canyon', canon: 'canyon', 'cañón de las ruinas': 'canyon', space: 'espacio',
    mothership: 'nodriza', naveNodriza: 'nodriza', throne: 'trono', salaTrono: 'trono', city: 'ciudad',
    factory: 'fabrica', 'fábrica': 'fabrica', autopista: 'carretera', sky: 'cielo', fortress: 'fortaleza',
    atardecer: 'menu', titulo: 'menu', black: 'negro', oscuro: 'negro'
  };
  // ---- Fondos de la Parte 3 (añadido, §15.1). El arte es de arte-escenarios3.js;
  //      si aún no existe, cada fondo tiene su propio dibujo de respaldo. ----
  function fondoTuneles(c, x, t) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1c1410'); g.addColorStop(0.55, '#3b2a1e'); g.addColorStop(1, '#22170f');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 14; i++) {          // rocas del fondo (paralaje)
      var px = ((i * 151 - x * 0.35) % 1160 + 1160) % 1160 - 100, py = 40 + hash(i, 3) * 230;
      c.globalAlpha = 0.5; circ(c, px, py, 40 + hash(i, 4) * 50, i % 2 ? '#4a3626' : '#3a2a1d', null);
    }
    c.globalAlpha = 1;
    for (var v = 0; v < 6; v++) {           // vigas de madera
      var vx = ((v * 220 - x * 0.6) % 1320 + 1320) % 1320 - 160;
      c.fillStyle = '#6b4423'; c.fillRect(vx, 30, 18, 320); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.strokeRect(vx, 30, 18, 320);
      c.fillRect(vx - 30, 30, 78, 16); c.strokeRect(vx - 30, 30, 78, 16);
    }
    for (var k = 0; k < 10; k++) {          // cristales que brillan
      var kx = ((k * 113 + 40 - x * 0.45) % 1100 + 1100) % 1100 - 70, ky = 60 + hash(k, 8) * 200;
      c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2 + k);
      estrella(c, kx, ky, 9, 4, 4, 0); c.fillStyle = k % 2 ? '#67e8f9' : '#c084fc'; c.fill();
    }
    c.globalAlpha = 1;
  }
  function fondoRio(c, x, t, nivel) {
    var g = c.createLinearGradient(0, 0, 0, nivel);
    g.addColorStop(0, '#0b1324'); g.addColorStop(1, '#1e3a4a');
    c.fillStyle = g; c.fillRect(0, 0, W, nivel);
    for (var i = 0; i < 9; i++) {           // estalactitas
      var sx = ((i * 131 - x * 0.4) % 1180 + 1180) % 1180 - 110;
      c.beginPath(); c.moveTo(sx - 26, 0); c.lineTo(sx + 26, 0); c.lineTo(sx, 50 + hash(i, 2) * 60); c.closePath();
      c.fillStyle = '#334155'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke();
    }
    var ga = c.createLinearGradient(0, nivel, 0, H);
    ga.addColorStop(0, '#0e7490'); ga.addColorStop(1, '#082f49');
    c.fillStyle = ga; c.fillRect(0, nivel, W, H - nivel);
    c.globalAlpha = 0.12; c.fillStyle = '#e0f2fe';
    for (var r = 0; r < 5; r++) {           // rayos de luz bajo el agua
      var rx = ((r * 230 - x * 0.2) % 1150 + 1150) % 1150 - 100;
      c.beginPath(); c.moveTo(rx, nivel); c.lineTo(rx + 50, nivel); c.lineTo(rx + 140, H); c.lineTo(rx + 60, H); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
    for (var b = 0; b < 16; b++) {          // burbujas
      var bq = (t * 0.25 + hash(b, 5)) % 1, by = H - bq * (H - nivel);
      c.globalAlpha = 0.5 * (1 - bq); circ(c, hash(b, 6) * W + Math.sin(t * 2 + b) * 6, by, 3 + hash(b, 7) * 4, null, '#bae6fd', 2);
    }
    c.globalAlpha = 1;
  }
  function fondoFabricaOscura(c, x, t) {
    if (!dibP2('bgFabrica', c, x, t)) { c.fillStyle = '#1e1b2e'; c.fillRect(0, 0, W, H); }
    c.fillStyle = 'rgba(20,6,12,0.55)'; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 5; i++) {           // luces rojas que parpadean
      var lx = 90 + i * 195, la = 0.25 + 0.2 * Math.sin(t * 3 + i * 1.7);
      var gl = c.createRadialGradient(lx, 60, 4, lx, 60, 140);
      gl.addColorStop(0, 'rgba(248,113,113,' + la + ')'); gl.addColorStop(1, 'rgba(248,113,113,0)');
      c.fillStyle = gl; c.fillRect(lx - 140, 0, 280, 220);
      circ(c, lx, 40, 9, '#ef4444', OUTLINE, 2);
    }
  }
  function fondoArenaRobovill(c, t) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a0f17'); g.addColorStop(1, '#0f0a14');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // el agujero del techo, con luz que entra
    c.fillStyle = '#7dd3fc'; c.beginPath(); c.ellipse(480, 0, 170, 70, 0, 0, Math.PI); c.fill();
    c.globalAlpha = 0.16; c.fillStyle = '#e0f2fe';
    c.beginPath(); c.moveTo(330, 0); c.lineTo(630, 0); c.lineTo(760, 340); c.lineTo(200, 340); c.closePath(); c.fill();
    c.globalAlpha = 1;
    for (var i = 0; i < 6; i++) {           // columnas y cadenas
      var cx = 40 + i * 176;
      c.fillStyle = '#3f2a33'; c.fillRect(cx, 20, 34, 330); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.strokeRect(cx, 20, 34, 330);
      circ(c, cx + 17, 120, 8, i % 2 ? '#ef4444' : '#f97316', OUTLINE, 2);
    }
  }
  var FONDOS_P3 = {
    baseCielo: { suelo: 'piedra', dib: function (c, x, t) {
      if (dibP2('bgBaseCielo', c, x, t)) return;
      if (!dibP2('bgFortaleza', c, t) && !dibP2('bgCielo', c, x, t)) fondoMenu(c, t);
    } },
    tuneles: { suelo: 'roca', dib: function (c, x, t) { if (!dibP2('bgTuneles', c, x, t)) fondoTuneles(c, x, t); } },
    rio: { suelo: 'agua', dib: function (c, x, t, plan) {
      var nivel = (plan && typeof plan.sueloY === 'number') ? plan.sueloY : SUELO;
      if (!dibP2('bgRio', c, x, t, { nivelAgua: nivel })) fondoRio(c, x, t, nivel);
    } },
    fabricaOscura: { suelo: 'fabrica', dib: function (c, x, t) { if (!dibP2('bgFabricaOscura', c, x, t)) fondoFabricaOscura(c, x, t); } },
    arenaRobovill: { suelo: 'fabrica', dib: function (c, x, t) { if (!dibP2('bgArenaRobovill', c, t)) fondoArenaRobovill(c, t); } }
  };
  Object.keys(FONDOS_P3).forEach(function (k) { if (!FONDOS[k]) FONDOS[k] = FONDOS_P3[k]; });
  var ALIAS_FONDO_P3 = { baseDelCielo: 'baseCielo', 'base del cielo': 'baseCielo', 'túneles': 'tuneles', tunel: 'tuneles', 'túnel': 'tuneles',
    'río': 'rio', river: 'rio', 'fábricaOscura': 'fabricaOscura', guarida: 'fabricaOscura', arenaDeRobovill: 'arenaRobovill' };
  Object.keys(ALIAS_FONDO_P3).forEach(function (k) { if (!ALIAS_FONDO[k]) ALIAS_FONDO[k] = ALIAS_FONDO_P3[k]; });

  function normFondo(f) { f = String(f || 'menu'); return FONDOS[f] ? f : (ALIAS_FONDO[f] || f); }

  // ---- Suelos (en el mundo, desde la línea de suelo hacia abajo) ----
  var SUELOS = {
    ninguno: null,
    arena: function (c, y, T) {
      var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#d97706'); g.addColorStop(0.25, '#b45309'); g.addColorStop(1, '#78350f');
      c.fillStyle = g; c.fillRect(-40, y, W + 80, H - y + 40);
      c.fillStyle = '#fcd34d'; c.fillRect(-40, y - 2, W + 80, 5);
      c.strokeStyle = OUTLINE; c.lineWidth = 2; c.beginPath(); c.moveTo(-40, y + 3); c.lineTo(W + 40, y + 3); c.stroke();
      for (var i = 0; i < 26; i++) { c.globalAlpha = 0.5; circ(c, hash(i, 1) * W, y + 12 + hash(i, 2) * 50, 2 + hash(i, 3) * 4, i % 2 ? '#92400e' : '#f59e0b', null); }
      c.globalAlpha = 1;
    },
    metal: function (c, y) {
      var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#1e3a5f'); g.addColorStop(1, '#0b1a30');
      c.fillStyle = g; c.fillRect(-40, y, W + 80, H - y + 40);
      c.fillStyle = '#22d3ee'; c.globalAlpha = 0.8; c.fillRect(-40, y - 1, W + 80, 3); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(148,197,255,0.18)'; c.lineWidth = 2;
      for (var x = 0; x <= W; x += 80) { c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x - 30, H); c.stroke(); }
    },
    nave: function (c, y, T) {
      var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#3b1d1d'); g.addColorStop(1, '#140606');
      c.fillStyle = g; c.fillRect(-40, y, W + 80, H - y + 40);
      c.fillStyle = '#f97316'; c.globalAlpha = 0.6 + 0.2 * Math.sin(T * 3); c.fillRect(-40, y - 1, W + 80, 4); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2;
      for (var x = 0; x <= W; x += 24) { c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x, y + 40); c.stroke(); }
    },
    trono: function (c, y) {
      var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#3f1d24'); g.addColorStop(1, '#14060a');
      c.fillStyle = g; c.fillRect(-40, y, W + 80, H - y + 40);
      c.beginPath(); c.moveTo(410, y); c.lineTo(550, y); c.lineTo(640, H); c.lineTo(320, H); c.closePath();
      c.fillStyle = '#b91c1c'; c.fill(); c.strokeStyle = '#fbbf24'; c.lineWidth = 3; c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-40, y - 1, W + 80, 3);
    },
    acera: function (c, y) {
      c.fillStyle = '#9ca3af'; c.fillRect(-40, y, W + 80, H - y + 40);
      c.fillStyle = '#d1d5db'; c.fillRect(-40, y - 2, W + 80, 9);
      c.strokeStyle = OUTLINE; c.lineWidth = 2; c.beginPath(); c.moveTo(-40, y + 7); c.lineTo(W + 40, y + 7); c.stroke();
      c.strokeStyle = 'rgba(55,65,81,0.35)';
      for (var x = 0; x <= W; x += 64) { c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x, y + 60); c.stroke(); }
      c.fillStyle = '#4b5563'; c.fillRect(-40, y + 60, W + 80, H);
    },
    fabrica: function (c, y) {
      var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#64748b'); g.addColorStop(1, '#1e293b');
      c.fillStyle = g; c.fillRect(-40, y, W + 80, H - y + 40);
      c.save(); c.beginPath(); c.rect(-40, y - 2, W + 80, 10); c.clip();
      c.fillStyle = '#facc15'; c.fillRect(-40, y - 2, W + 80, 10);
      c.fillStyle = OUTLINE;
      for (var x = -40; x < W + 40; x += 28) { c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + 14, y - 2); c.lineTo(x + 24, y - 2); c.lineTo(x + 10, y + 8); c.closePath(); c.fill(); }
      c.restore();
      c.strokeStyle = 'rgba(15,23,42,0.4)'; c.lineWidth = 2;
      for (var k = 0; k <= W; k += 96) { c.beginPath(); c.moveTo(k, y + 10); c.lineTo(k, H); c.stroke(); }
    },
    carretera: function (c, y, T, scroll) {
      if (!dibP2('carretera', c, scroll, y, T)) { c.fillStyle = '#374151'; c.fillRect(-40, y, W + 80, H - y + 40); }
    },
    nubes: function (c, y, T) {
      var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dbeafe');
      for (var i = 0; i < 16; i++) {
        var cx = i * 66 - 20 + Math.sin(T * 0.4 + i) * 6, r = 34 + hash(i, 4) * 22;
        circ(c, cx, y + 18 - hash(i, 5) * 14, r, null, '#bfdbfe', 4);
      }
      for (var j = 0; j < 16; j++) {
        var cx2 = j * 66 - 20 + Math.sin(T * 0.4 + j) * 6, r2 = 34 + hash(j, 4) * 22;
        circ(c, cx2, y + 18 - hash(j, 5) * 14, r2, '#ffffff', null);
      }
      c.fillStyle = g; c.fillRect(-40, y + 20, W + 80, H - y + 40);
    },
    piedra: function (c, y) {
      var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#8b87b5'); g.addColorStop(1, '#4c4878');
      c.fillStyle = g; c.fillRect(-40, y, W + 80, H - y + 40);
      c.fillStyle = '#c4c1e8'; c.fillRect(-40, y - 2, W + 80, 6);
      c.strokeStyle = OUTLINE; c.lineWidth = 2; c.beginPath(); c.moveTo(-40, y + 4); c.lineTo(W + 40, y + 4); c.stroke();
      c.strokeStyle = 'rgba(30,27,75,0.35)';
      for (var x = 0; x <= W; x += 72) { c.beginPath(); c.moveTo(x, y + 5); c.lineTo(x, y + 40); c.stroke(); c.beginPath(); c.moveTo(x + 36, y + 40); c.lineTo(x + 36, y + 80); c.stroke(); }
      c.beginPath(); c.moveTo(-40, y + 40); c.lineTo(W + 40, y + 40); c.stroke();
    }
  };
  var COLOR_POLVO = { arena: '#f5d9a8', metal: '#cbd5e1', nave: '#d6b4a4', trono: '#e7c9c9', acera: '#e5e7eb', fabrica: '#e2e8f0',
    carretera: '#e5e7eb', nubes: '#ffffff', piedra: '#e0dcf5', ninguno: '#e5e7eb' };
  // ---- Suelos de la Parte 3 (añadido, §15.1) ----
  SUELOS.roca = function (c, y, T) {
    var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#6b4f36'); g.addColorStop(1, '#2b1d13');
    c.fillStyle = g; c.fillRect(-40, y, W + 80, H - y + 40);
    c.fillStyle = '#8a6a4b'; c.fillRect(-40, y - 2, W + 80, 6);
    c.strokeStyle = OUTLINE; c.lineWidth = 2; c.beginPath(); c.moveTo(-40, y + 4); c.lineTo(W + 40, y + 4); c.stroke();
    for (var i = 0; i < 22; i++) {
      var px = hash(i, 11) * (W + 40) - 20, py = y + 10 + hash(i, 12) * 50, r = 3 + hash(i, 13) * 7;
      c.globalAlpha = 0.85; circ(c, px, py, r, i % 3 ? '#57412c' : '#a08262', OUTLINE, 1.5);
    }
    c.globalAlpha = 1;
  };
  SUELOS.agua = function (c, y, T) {
    // superficie del agua con olas en la línea de suelo; debajo, agua semitransparente
    c.save();
    c.beginPath(); c.moveTo(-40, H + 40);
    for (var x = -40; x <= W + 40; x += 20) c.lineTo(x, y + Math.sin(x * 0.035 + T * 2.2) * 4);
    c.lineTo(W + 40, H + 40); c.closePath();
    var g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, 'rgba(34,211,238,0.45)'); g.addColorStop(1, 'rgba(8,47,73,0.7)');
    c.fillStyle = g; c.fill();
    c.beginPath();
    for (var x2 = -40; x2 <= W + 40; x2 += 20) { var yy = y + Math.sin(x2 * 0.035 + T * 2.2) * 4; if (x2 === -40) c.moveTo(x2, yy); else c.lineTo(x2, yy); }
    c.strokeStyle = '#e0f2fe'; c.lineWidth = 3; c.stroke();
    c.globalAlpha = 0.6;
    for (var k = 0; k < 10; k++) { var fx = ((k * 101 + T * 30) % (W + 80)) - 40; circ(c, fx, y + 2 + Math.sin(T * 3 + k) * 2, 3, '#ffffff', null); }
    c.restore();
  };
  COLOR_POLVO.roca = '#d6c4a8';
  COLOR_POLVO.agua = '#e0f2fe';

  // ===========================================================================
  //  NORMALIZACIÓN DEL GUION (se hace una vez, al registrar)
  // ===========================================================================
  var ACCIONES_LISTA = ['entrar', 'salir', 'caminar', 'correr', 'volar', 'conducir', 'saltar', 'caer', 'levantarse',
    'hundirse', 'flotar', 'temblar', 'asustarse', 'celebrar', 'reir', 'rugir', 'senalar', 'girar', 'disparar', 'atacar',
    'hackear', 'abrazar', 'atrapado', 'encoger', 'crecer', 'desaparecer', 'aparecer', 'transformar', 'mirar', 'cambiar',
    'retroceder', 'brillar', 'parpadear', 'abrir', 'cerrar', 'romper', 'pop', 'animar', 'hablar', 'esperar'];
  var ALIAS_ACCION = { 'señalar': 'senalar', 'reír': 'reir', golpear: 'atacar', espadazo: 'atacar', 'puñetazo': 'atacar',
    andar: 'caminar', explotar: 'pop', reirse: 'reir', 'reírse': 'reir', saludar: 'celebrar', subir: 'levantarse',
    bajar: 'hundirse', huir: 'salir', ir: 'caminar', aterrizar: 'caer', 'convertir': 'transformar' };
  var EFECTOS_LISTA = ['temblor', 'polvo', 'destellos', 'estrellas', 'explosion', 'pop', 'chispas', 'humo', 'viento', 'rayos',
    'onda', 'lluviaEstrellas', 'corazones', 'confeti', 'velocidad', 'lineasAccion', 'brillo', 'flash', 'fuegos', 'notas',
    'foco', 'alarma', 'senal', 'estela', 'velo'];
  var ALIAS_EFECTO = { 'explosión': 'explosion', 'señal': 'senal', lluvia: 'lluviaEstrellas', corazon: 'corazones',
    'corazón': 'corazones', lineas: 'lineasAccion', fuegosArtificiales: 'fuegos', destello: 'destellos', estrella: 'estrellas' };
  var ESTILOS_TEXTO = ['onomatopeya', 'bocadillo', 'pensamiento', 'cartel', 'titulo'];
  var TRANSICIONES = ['corte', 'fundido', 'pagina'];
  var SONIDOS = ['jump', 'sword', 'arrow', 'punch', 'laser', 'zap', 'hit', 'clink', 'hurt', 'pickup', 'hack', 'hackOk', 'hackFail',
    'explosion', 'roar', 'select', 'victory', 'door', 'checkpoint', 'robot', 'boost', 'net', 'shieldBlock', 'jetpack',
    'transform', 'gemGrab', 'bigPunch', 'press', 'medal'];
  // Efectos de sonido nuevos de la Parte 3 (contrato §17; añadido, §15.1).
  ['switchHero', 'blaster', 'sniper', 'launcherSwap', 'shieldThrow', 'shieldCatch', 'laserBarrier', 'drill', 'rumble',
    'splash', 'teamAttack', 'fusion3', 'miniRobot', 'escape'].forEach(function (n) { if (SONIDOS.indexOf(n) < 0) SONIDOS.push(n); });
  // Claves del actor que NO son opciones de su dibujo.
  var RESERVADAS = { quien: 1, alias: 1, x: 1, y: 1, escala: 1, facing: 1, mira: 1, z: 1, pose: 1, accion: 1, acciones: 1,
    bocadillo: 1, bocadilloT: 1, t: 1, dur: 1, hasta: 1, desde: 1, hacia: 1, a: 1, veces: 1, cada: 1, altura: 1, arco: 1,
    proyectil: 1, rebota: 1, convierte: 1, en: 1, cambia: 1, props: 1, factor: 1, velocidad: 1, distancia: 1, mirar: 1,
    fuerza: 1, con: 1, mudo: 1, opciones: 1, destello: 1 };
  var PARAMS_ACCION = ['t', 'dur', 'hasta', 'desde', 'hacia', 'a', 'veces', 'cada', 'altura', 'arco', 'proyectil', 'rebota',
    'convierte', 'en', 'cambia', 'props', 'factor', 'velocidad', 'distancia', 'mirar', 'fuerza', 'con', 'color', 'destello', 'pose',
    'lanzador'];

  function normAccionNombre(n) { n = String(n || ''); return ACCIONES_LISTA.indexOf(n) >= 0 ? n : (ALIAS_ACCION[n] || n); }
  function normEfectoNombre(n) { n = String(n || ''); return EFECTOS_LISTA.indexOf(n) >= 0 ? n : (ALIAS_EFECTO[n] || n); }
  function normTrans(n) { n = String(n || 'corte'); if (n === 'página') n = 'pagina'; return TRANSICIONES.indexOf(n) >= 0 ? n : 'corte'; }
  function facingDe(o) {
    if (o.facing === -1 || o.mira === -1 || o.mira === 'izquierda') return -1;
    return 1;
  }

  function normAccion(raw, actorRaw) {
    var a;
    if (typeof raw === 'string') {
      a = { tipo: normAccionNombre(raw) };
      // Con "accion: 'nombre'", sus parámetros van en el propio actor.
      if (actorRaw) for (var i = 0; i < PARAMS_ACCION.length; i++) {
        var k = PARAMS_ACCION[i];
        if (k === 'pose' || k === 'color') continue;
        if (actorRaw[k] !== undefined) a[k] = actorRaw[k];
      }
    } else if (esObj(raw)) {
      a = copia(raw);
      a.tipo = normAccionNombre(raw.accion || raw.tipo);
    } else return null;
    a.t = num(a.t, 0);
    return a;
  }

  function normPlan(raw, i, auto) {
    raw = esObj(raw) ? raw : {};
    var fondo = normFondo(raw.fondo);
    var fdef = FONDOS[fondo];
    var p = {
      i: i, raw: raw, fondo: fondo,
      suelo: (raw.suelo === false) ? 'ninguno' : (typeof raw.suelo === 'string' ? raw.suelo : (fdef ? fdef.suelo : 'ninguno')),
      sueloY: num(raw.sueloY, SUELO),
      fondoVel: num(raw.fondoVel, 0), fondoX: num(raw.fondoX, 0),
      camara: esObj(raw.camara) ? raw.camara : {},
      transicion: normTrans(raw.transicion),
      continuidad: raw.continuidad,
      tinte: typeof raw.tinte === 'string' ? raw.tinte : null,
      vineta: num(raw.vineta, 1),
      habla: raw.habla,
      actores: [], efectos: [], textos: [], sonidos: [], conversiones: []
    };
    var cuenta = {};
    lista(raw.actores).forEach(function (ar, j) {
      if (!esObj(ar)) return;
      var quien = normQuien(ar.quien);
      var key = (typeof ar.alias === 'string' && ar.alias) ? ar.alias : quien;
      cuenta[key] = (cuenta[key] || 0) + 1;
      if (cuenta[key] > 1) key = key + '#' + cuenta[key];
      var opts = esObj(ar.opciones) ? copia(ar.opciones) : {};
      for (var k in ar) if (Object.prototype.hasOwnProperty.call(ar, k) && !RESERVADAS[k]) opts[k] = ar[k];
      var acts = [];
      if (ar.accion !== undefined) { var a0 = normAccion(ar.accion, ar); if (a0) acts.push(a0); }
      lista(ar.acciones).forEach(function (r) { var a1 = normAccion(r, null); if (a1) acts.push(a1); });
      acts.forEach(function (a, n) { a.n = n; });
      acts.sort(function (x, y) { return (x.t - y.t) || (x.n - y.n); });
      var act = {
        key: key, quien: quien, raw: ar, idx: j,
        x: num(ar.x, 480), y: num(ar.y, p.sueloY), escala: num(ar.escala, 1),
        facing: facingDe(ar), z: num(ar.z, 0), pose: typeof ar.pose === 'string' ? ar.pose : 'idle',
        opts: opts, acciones: acts, fase: (j * 1.37 + i * 0.61) % 10, mudo: !!ar.mudo
      };
      p.actores.push(act);
      if (typeof ar.bocadillo === 'string' && ar.bocadillo) {
        p.textos.push({ estilo: 'bocadillo', texto: ar.bocadillo, a: key, t: num(ar.bocadilloT, 0.3), dur: Infinity, tam: 30 });
      }
      // conversiones (hackear con convierte) y sonidos automáticos
      acts.forEach(function (a) {
        if (a.tipo === 'hackear' && a.convierte && typeof a.a === 'string') {
          p.conversiones.push({ key: a.a, t: a.t + num(a.dur, 1.6) });
        }
        if (auto && !act.mudo) sonidosAuto(p, act, a);
      });
    });
    lista(raw.efectos).forEach(function (e) {
      if (typeof e === 'string') e = { tipo: e };
      if (!esObj(e)) return;
      var ef = copia(e);
      ef.tipo = normEfectoNombre(e.tipo);
      ef.t = num(e.t, 0);
      p.efectos.push(ef);
    });
    lista(raw.textos).forEach(function (tx) {
      if (typeof tx === 'string') tx = { texto: tx };
      if (!esObj(tx)) return;
      var o = copia(tx);
      o.estilo = (ESTILOS_TEXTO.indexOf(tx.estilo) >= 0) ? tx.estilo : 'onomatopeya';
      o.t = num(tx.t, 0);
      o.dur = num(tx.dur, Infinity);
      p.textos.push(o);
    });
    lista(raw.sonido).concat(lista(raw.sonidos)).forEach(function (sd) {
      if (typeof sd === 'string') p.sonidos.push({ nombre: sd, t: 0 });
      else if (esObj(sd) && typeof sd.nombre === 'string') p.sonidos.push({ nombre: sd.nombre, t: num(sd.t, 0) });
    });
    p.sonidos.sort(function (a, b) { return a.t - b.t; });
    return p;
  }

  // Sonidos que ponen solas algunas acciones (se pueden quitar con sonidosAuto: false).
  function sonidosAuto(p, act, a) {
    var t = a.t, k, n;
    function add(nombre, tt) { p.sonidos.push({ nombre: nombre, t: tt, auto: true }); }
    switch (a.tipo) {
      case 'disparar':
        n = Math.max(1, Math.min(12, num(a.veces, 1)));
        var pr = a.proyectil || 'flecha';
        var snd = { flecha: 'arrow', laser: 'laser', rayo: 'laser', pulso: 'zap', bola: 'zap', pluma: 'arrow', red: 'net', bumeran: 'sword',
          energia: 'blaster', escudo: 'shieldThrow' }[pr] || 'arrow';
        if (pr === 'energia' && (a.lanzador || act.opts.arma) === 'francotirador') snd = 'sniper';   // Parte 3
        for (k = 0; k < n; k++) { add(snd, t + k * num(a.cada, 0.45)); if (a.rebota) add('clink', t + k * num(a.cada, 0.45) + 0.3); }
        break;
      case 'atacar':
        n = Math.max(1, Math.min(12, num(a.veces, 1)));
        for (k = 0; k < n; k++) add(act.quien === 'falcon' ? 'sword' : 'punch', t + k * num(a.cada, 0.35));
        break;
      case 'hackear': add('hack', t); if (a.convierte) add('hackOk', t + num(a.dur, 1.6)); break;
      case 'rugir': add('roar', t); break;
      case 'pop': add('explosion', t + 0.1); break;
      case 'romper': add(act.quien === 'gemaPoder' ? 'gemGrab' : 'explosion', t); if (act.quien === 'gemaPoder') add('explosion', t + num(a.dur, 1.4) * 0.72); break;
      case 'atrapado': add('zap', t); break;
      case 'transformar': add('transform', t); break;
      case 'saltar': n = Math.max(1, Math.min(8, num(a.veces, 1))); for (k = 0; k < n; k++) add('jump', t + k * num(a.dur, 0.7)); break;
      case 'abrir': add('door', t); break;
      case 'cerrar': add('door', t + num(a.dur, 0.6)); break;
      case 'levantarse': add('robot', t); break;
      default: break;
    }
  }

  // ===========================================================================
  //  REGISTRO
  // ===========================================================================
  var REG = {};
  var ultimoT = {};   // último lineT dibujado de cada plano (para las transiciones)

  function register(id, def) {
    try {
      id = String(id || '');
      if (!id) return false;
      var raw = Array.isArray(def) ? { planos: def } : (esObj(def) ? def : { planos: [] });
      var auto = raw.sonidosAuto !== false;
      var planos = lista(raw.planos).map(function (pl, i) { return normPlan(pl, i, auto && !(esObj(pl) && pl.sonidosAuto === false)); });
      // Parte 3: Dark Secuaz es SIEMPRE bueno (verde) en las historias s3_* (contrato §0.6 y §15.1).
      if (id.indexOf('s3_') === 0) planos.forEach(function (p) {
        p.actores.forEach(function (a) { if (a.quien === 'secuaz') a.opts.bueno = true; });
        // …y también cuando sale DIBUJADO en una nube de pensamiento o un cartel.
        p.textos.forEach(function (tx) {
          var dibs = lista(tx.dibujo || tx.quien), hay = false;
          for (var k = 0; k < dibs.length; k++) if (typeof dibs[k] === 'string' && normQuien(dibs[k]) === 'secuaz') hay = true;
          if (!hay) return;
          var op = {}, src = esObj(tx.opciones) ? tx.opciones : {};
          for (var c in src) if (Object.prototype.hasOwnProperty.call(src, c)) op[c] = src[c];
          op.bueno = true; tx.opciones = op;
        });
      });
      REG[id] = { id: id, raw: raw, planos: planos };
      return true;
    } catch (e) { fallo('register ' + id, e); return false; }
  }
  function has(id) { var r = REG[id]; return !!(r && r.planos.length); }
  function planCount(id) { var r = REG[id]; return r ? r.planos.length : 0; }

  // ===========================================================================
  //  EVALUACIÓN DE UN ACTOR EN UN INSTANTE (función pura: mismo t → mismo dibujo)
  // ===========================================================================
  function altoDe(s) { var c = catDe(s.quien); return altoCat(c, s.opts) * c.esc * s.escala * s.esc; }
  function anchoDe(s) { return catDe(s.quien).ancho * catDe(s.quien).esc * s.escala * s.esc; }
  // Punto de referencia de otro actor: centro, cabeza o pies.
  function refPunto(st, donde) {
    if (!st) return null;
    var h = altoDe(st), y = st.y + st.dy;
    if (donde === 'pies') return { x: st.x, y: y };
    if (donde === 'cabeza') return { x: st.x, y: y - h };
    return { x: st.x, y: y - h * 0.5 };
  }
  function fueraX(s, lado) { var w = anchoDe(s) * 0.6 + 60; return lado === 'derecha' ? W + w : -w; }

  function destino(a, s, X) {
    var hx = s.x, hy = s.y;
    if (typeof a.hasta === 'number') hx = a.hasta;
    else if (esObj(a.hasta)) {
      hx = num(a.hasta.x, s.x + num(a.hasta.dx, 0));
      hy = num(a.hasta.y, s.y + num(a.hasta.dy, 0));
    } else if (typeof a.a === 'string') {
      var o = X.ref(a.a);
      if (o) {
        var dir = o.x >= s.x ? 1 : -1;
        var gap = num(a.distancia, (anchoDe(s) + anchoDe(o)) * 0.42);
        hx = o.x - dir * gap; hy = o.y;
      }
    }
    return { x: hx, y: hy };
  }

  function mover(s, a, u, X, vel, poseMov, easing, arcoDef) {
    var fx = s.x, fy = s.y;
    var d = destino(a, s, X);
    var L = dist(fx, fy, d.x, d.y);
    var dur = num(a.dur, Math.max(0.35, L / num(a.velocidad, vel)));
    var p = c01(u / dur), e = easing(p);
    s.x = lerp(fx, d.x, e); s.y = lerp(fy, d.y, e);
    var arco = num(a.arco, arcoDef || 0);
    if (arco) s.dy -= 4 * arco * p * (1 - p);
    var dir = Math.abs(d.x - fx) > 2 ? (d.x > fx ? 1 : -1) : 0;
    if (p < 1 && L > 2) {
      s.mov = true; s.andar = u;
      if (poseMov) s.poseTemp = arco ? (p < 0.5 ? 'jump' : 'fall') : poseMov;
      if (dir) s.dirMov = dir;
    } else {
      if (dir) s.facing = dir;
      mirarFinal(s, a, X);
    }
    return { p: p, dur: dur, L: L };
  }
  function mirarFinal(s, a, X) {
    if (a.mirar === 1 || a.mirar === -1) s.facing = a.mirar;
    else if (a.mirar === 'izquierda') s.facing = -1;
    else if (a.mirar === 'derecha') s.facing = 1;
    else if (typeof a.mirar === 'string') { var o = X.ref(a.mirar); if (o) s.facing = o.x >= s.x ? 1 : -1; }
  }
  function objetivo(a, s, X) {
    if (typeof a.a === 'string') { var o = X.ref(a.a); if (o) return refPunto(o, a.punto || 'centro'); }
    if (typeof a.hasta === 'number') return { x: a.hasta, y: s.y - altoDe(s) * 0.5 };
    if (esObj(a.hasta)) return { x: num(a.hasta.x, s.x + s.facing * 300), y: num(a.hasta.y, s.y - altoDe(s) * 0.5) };
    return { x: s.x + s.facing * 320, y: s.y - altoDe(s) * 0.5 };
  }
  function mano(s) {
    var h = altoDe(s), w = anchoDe(s);
    var f = s.dirMov || s.facing;
    return { x: s.x + f * w * 0.42, y: s.y + s.dy - h * 0.5 };
  }

  // Lo que hace cada acción (s = estado, a = acción, u = segundos desde que empezó).
  var ACC = {
    entrar: {
      antes: function (s, a) {
        if (a.desde === 'arriba') { s.y = -altoDe(s) - 60; s.visible = false; }
        else if (a.desde === 'abajo') { s.visible = false; }
        else { s.x = fueraX(s, ladoEntrada(s, a)); s.visible = false; }
      },
      aplicar: function (s, a, u, X) {
        if (a.desde === 'arriba') { ACC.caer.aplicar(s, a, u, X); return; }
        if (a.desde === 'abajo') { ACC.levantarse.aplicar(s, a, u, X); return; }
        var tx = s.x, ty = s.y, fx = fueraX(s, ladoEntrada(s, a));
        var dur = num(a.dur, 0.9), p = c01(u / dur), e = easeOut(p);
        s.x = lerp(fx, tx, e); s.y = ty;
        var arco = num(a.arco, 0); if (arco) s.dy -= 4 * arco * p * (1 - p);
        if (p < 1) { s.mov = true; s.andar = u; s.poseTemp = arco ? (p < 0.5 ? 'jump' : 'fall') : 'run'; s.dirMov = tx > fx ? 1 : -1; }
        else mirarFinal(s, a, X);
        if (arco && p >= 1 && u - dur < 0.5) s.extras.push({ tipo: 'polvo', x: s.x, y: s.y, u: u - dur, n: 7 });
      }
    },
    salir: {
      aplicar: function (s, a, u, X) {
        var lado = a.hacia || (s.facing < 0 ? 'izquierda' : 'derecha');
        var fx = s.x, fy = s.y, dur = num(a.dur, 0.9), p = c01(u / dur), e = easeIn(p);
        if (lado === 'arriba') { s.y = lerp(fy, -altoDe(s) - 120, e); s.poseTemp = 'jump'; }
        else if (lado === 'abajo') { ACC.hundirse.aplicar(s, a, u, X); return; }
        else { var tx = fueraX(s, lado); s.x = lerp(fx, tx, e); s.dirMov = tx > fx ? 1 : -1; s.poseTemp = 'run'; s.mov = true; s.andar = u; }
        var arco = num(a.arco, 0); if (arco) s.dy -= 4 * arco * p * (1 - p);
        if (p >= 1) s.visible = false;
      }
    },
    caminar: { aplicar: function (s, a, u, X) { mover(s, a, u, X, 150, 'walk', easeInOut); } },
    correr: {
      aplicar: function (s, a, u, X) {
        var r = mover(s, a, u, X, 400, 'run', easeInOut);
        if (r.p < 1 && r.L > 2) {
          for (var k = 0; k < 3; k++) {
            var uk = (u + k * 0.12) % 0.36;
            s.extras.push({ tipo: 'polvito', x: s.x - (s.dirMov || s.facing) * (12 + uk * 60), y: s.y, q: uk / 0.36 });
          }
        }
      }
    },
    volar: {
      aplicar: function (s, a, u, X) {
        var r = mover(s, a, u, X, 320, 'jump', easeInOut);
        if (r.p < 1) { s.dy += Math.sin(u * 5) * 6; s.rot = (s.dirMov || 0) * 0.08; }
      }
    },
    conducir: {
      aplicar: function (s, a, u, X) {
        var r = mover(s, a, u, X, 520, null, easeInOut);
        if (r.p < 1 && r.L > 2) { s.dy -= Math.abs(Math.sin(u * 22)) * 3; s.extras.push({ tipo: 'velocidad', x: s.x, y: s.y, dir: s.dirMov || s.facing }); }
      }
    },
    saltar: {
      aplicar: function (s, a, u, X) {
        var n = Math.max(1, Math.min(8, num(a.veces, 1))), dj = num(a.dur, 0.7), h = num(a.altura, 100);
        var tot = n * dj, p = c01(u / tot);
        if (a.hasta !== undefined || typeof a.a === 'string') {
          var fx = s.x, fy = s.y, d = destino(a, s, X);
          s.x = lerp(fx, d.x, p); s.y = lerp(fy, d.y, p);
          var dir = Math.abs(d.x - fx) > 2 ? (d.x > fx ? 1 : -1) : 0;
          if (p < 1 && dir) s.dirMov = dir; else if (dir) s.facing = dir;
        }
        if (u < tot) {
          var k = Math.floor(u / dj), pk = (u - k * dj) / dj;
          s.dy -= 4 * h * pk * (1 - pk);
          s.poseTemp = pk < 0.5 ? 'jump' : 'fall';
          if (pk < 0.12) s.escY *= 1 - 0.15 * (1 - pk / 0.12);
          if (k > 0 && pk < 0.4) s.extras.push({ tipo: 'polvo', x: s.x, y: s.y, u: pk * dj, n: 5 });
        } else {
          if (u - tot < 0.45) s.extras.push({ tipo: 'polvo', x: s.x, y: s.y, u: u - tot, n: 6 });
          if (u - tot < 0.18) s.escY *= 1 - 0.18 * (1 - (u - tot) / 0.18);
          mirarFinal(s, a, X);
        }
      }
    },
    caer: {
      antes: function (s) { s.visible = false; },
      aplicar: function (s, a, u) {
        var dur = num(a.dur, 0.6), p = c01(u / dur);
        var desde = esObj(a.desde) ? num(a.desde.y, -altoDe(s) - 80) : -altoDe(s) - 80;
        if (p < 1) { s.dy += (desde - s.y) * (1 - easeIn(p)); s.poseTemp = 'fall'; }
        else {
          var q = u - dur;
          if (q < 0.25) { s.escY *= 1 - 0.25 * (1 - q / 0.25); s.temblorCam = Math.max(s.temblorCam, 0.7 * (1 - q / 0.25)); }
          if (q < 0.7) s.extras.push({ tipo: 'polvo', x: s.x, y: s.y, u: q, n: 9 });
        }
      }
    },
    levantarse: {
      antes: function (s) { s.visible = false; },
      aplicar: function (s, a, u, X) {
        var dur = num(a.dur, 1.6), p = c01(u / dur), h = altoDe(s) + 16;
        s.dy += h * (1 - easeOut(p));
        if (p < 1) {
          s.recorte = X.sueloY;
          s.sx += Math.sin(u * 60) * 2;
          s.temblorCam = Math.max(s.temblorCam, 0.55);
          s.extras.push({ tipo: 'polvoSuelo', x: s.x, y: X.sueloY, w: anchoDe(s), u: u });
        } else if (u - dur < 0.6) s.extras.push({ tipo: 'polvo', x: s.x, y: X.sueloY, u: u - dur, n: 10 });
      }
    },
    hundirse: {
      aplicar: function (s, a, u, X) {
        var dur = num(a.dur, 1.4), p = c01(u / dur), h = altoDe(s) + 16;
        s.dy += h * easeIn(p);
        s.recorte = X.sueloY;
        if (p < 1) {
          s.sx += Math.sin(u * 60) * 2;
          s.temblorCam = Math.max(s.temblorCam, 0.45);
          s.extras.push({ tipo: 'polvoSuelo', x: s.x, y: X.sueloY, w: anchoDe(s), u: u });
        } else s.visible = false;
      }
    },
    flotar: {
      aplicar: function (s, a, u, X) {
        var d = num(a.dur, Infinity);
        if (u <= d) s.dy += Math.sin(X.T * 2.4 + s.fase) * num(a.altura, 8) - num(a.altura, 8) * 0.5;
      }
    },
    temblar: {
      aplicar: function (s, a, u) {
        if (u <= num(a.dur, Infinity)) { var f = num(a.fuerza, 1) * 3; s.sx += Math.sin(u * 71) * f; s.sy += Math.sin(u * 53 + 1) * f * 0.5; }
      }
    },
    asustarse: {
      aplicar: function (s, a, u) {
        var p = c01(u / num(a.dur, 0.35));
        s.x -= s.facing * 22 * easeOut(p);
        s.dy -= Math.sin(p * Math.PI) * 20;
        s.pose = 'hurt';
        if (u < 1.6) s.extras.push({ tipo: 'excl', u: u });
        if (u < 2.4) s.extras.push({ tipo: 'gota', u: u });
      }
    },
    celebrar: {
      aplicar: function (s, a, u) {
        if (u > num(a.dur, Infinity)) return;
        s.poseTemp = 'win';
        var per = 0.6;
        s.dy -= Math.abs(Math.sin(u * Math.PI / per)) * num(a.altura, 16);
      }
    },
    reir: {
      aplicar: function (s, a, u) {
        if (u > num(a.dur, Infinity)) return;
        if (s.quien === 'toros') s.poseTemp = 'roar';
        s.dy -= Math.abs(Math.sin(u * 13)) * 3;
        s.escY *= 1 + 0.025 * Math.sin(u * 26);
        var k = Math.floor(u / 0.5);
        for (var j = Math.max(0, k - 1); j <= k; j++) {
          var uj = u - j * 0.5;
          if (uj >= 0 && uj < 1) s.extras.push({ tipo: 'ja', u: uj, lado: (j % 2) ? 1 : -1, texto: a.texto || '¡JA!' });
        }
      }
    },
    rugir: {
      aplicar: function (s, a, u) {
        var dur = num(a.dur, 1.4);
        if (u > dur) return;
        s.poseTemp = (s.quien === 'toros') ? 'roar' : 'attack';
        s.sx += Math.sin(u * 80) * 2;
        s.temblorCam = Math.max(s.temblorCam, 0.8 * (1 - u / dur));
        s.extras.push({ tipo: 'rugido', u: u });
      }
    },
    senalar: {
      aplicar: function (s, a, u, X) {
        if (u > num(a.dur, Infinity)) return;
        var o = objetivo(a, s, X);
        s.facing = o.x >= s.x ? 1 : -1;
        if (s.quien === 'director') s.poseTemp = 'shoot';
        s.extras.push({ tipo: 'dedo', u: u, ox: o.x, oy: o.y });
      }
    },
    girar: {
      aplicar: function (s, a, u) {
        var dur = num(a.dur, 0.7), p = c01(u / dur);
        s.rot += easeInOut(p) * TAU * num(a.veces, 1);
      }
    },
    disparar: {
      aplicar: function (s, a, u, X) {
        var n = Math.max(1, Math.min(12, num(a.veces, 1))), cada = num(a.cada, 0.45);
        var o = objetivo(a, s, X);
        s.facing = o.x >= s.x ? 1 : -1;
        var h = mano(s);
        var L = dist(h.x, h.y, o.x, o.y), fl = clamp(L / 1100, 0.14, 0.6);
        var clase = a.proyectil || 'flecha';
        for (var k = 0; k < n; k++) {
          var uk = u - k * cada;
          if (uk < 0) break;
          if (uk < 0.3) s.poseTemp = 'shoot';
          if (uk < fl) {
            var q = uk / fl;
            s.extras.push({ tipo: 'proyectil', clase: clase, x: lerp(h.x, o.x, q), y: lerp(h.y, o.y, q) - Math.sin(q * Math.PI) * L * 0.04, ang: Math.atan2(o.y - h.y, o.x - h.x), q: q, lanzador: a.lanzador || s.opts.arma });
          } else if (a.rebota) {
            var b = (uk - fl) / 0.6;
            if (b < 1) {
              var dx = (o.x >= h.x ? -1 : 1);
              s.extras.push({ tipo: 'proyectil', clase: clase, x: o.x + dx * 120 * b * (0.6 + hash(k, 7) * 0.6), y: o.y - 110 * b + 190 * b * b, ang: b * 14 + k, q: 1, alpha: 1 - b * 0.7 });
            }
            if (uk - fl < 0.3) s.extras.push({ tipo: 'impacto', x: o.x, y: o.y, q: (uk - fl) / 0.3, rebote: true });
          } else if (uk - fl < 0.3) s.extras.push({ tipo: 'impacto', x: o.x, y: o.y, q: (uk - fl) / 0.3 });
        }
      }
    },
    atacar: {
      aplicar: function (s, a, u, X) {
        var n = Math.max(1, Math.min(12, num(a.veces, 1))), cada = num(a.cada, 0.35);
        if (typeof a.a === 'string') { var o = X.ref(a.a); if (o) s.facing = o.x >= s.x ? 1 : -1; }
        for (var k = 0; k < n; k++) {
          var uk = u - k * cada;
          if (uk < 0) break;
          if (uk < 0.28) {
            s.poseTemp = 'attack';
            var m = mano(s);
            s.extras.push({ tipo: s.quien === 'falcon' ? 'espadazo' : 'punetazo', x: m.x, y: m.y, f: s.facing, q: uk / 0.28, esc: altoDe(s) / 110 });
          }
        }
      }
    },
    hackear: {
      aplicar: function (s, a, u, X) {
        var dur = num(a.dur, 1.6);
        if (u > dur) return;
        var o = objetivo(a, s, X);
        s.facing = o.x >= s.x ? 1 : -1;
        s.poseTemp = 'hack';
        var h = altoDe(s);
        s.extras.push({ tipo: 'rayoHack', x1: s.x + s.facing * h * 0.22, y1: s.y + s.dy - h * 0.62, x2: o.x, y2: o.y, u: u });
      }
    },
    abrazar: {
      aplicar: function (s, a, u, X) {
        var r = mover(s, a, u, X, 260, 'run', easeInOut);
        var o = typeof a.a === 'string' ? X.ref(a.a) : null;
        if (r.p >= 1) {
          if (o) s.facing = o.x >= s.x ? 1 : -1;
          s.poseTemp = 'win';
          var q = u - r.dur;
          s.escY *= 1 + 0.03 * Math.sin(q * 6);
          if (o) s.extras.push({ tipo: 'corazones', x: (s.x + o.x) / 2, y: s.y - Math.max(altoDe(s), altoDe(o)) - 6, u: q });
        }
      }
    },
    atrapado: {
      aplicar: function (s, a, u) {
        if (u > num(a.dur, Infinity)) return;
        s.atrapado = a.con || 'celda';
        s.pose = 'hurt';
        s.sx += Math.sin(u * 30) * 0.8;
        if (u < 0.5) s.extras.push({ tipo: 'puf', u: u, color: '#fb923c' });
      }
    },
    encoger: { aplicar: function (s, a, u) { s.esc *= lerp(1, num(a.factor, 0.5), easeInOut(c01(u / num(a.dur, 0.6)))); } },
    crecer: { aplicar: function (s, a, u) { s.esc *= lerp(1, num(a.factor, 1.5), easeOutBack(c01(u / num(a.dur, 0.8)))); } },
    desaparecer: {
      aplicar: function (s, a, u) {
        var dur = num(a.dur, 0.45), p = c01(u / dur);
        s.alpha *= 1 - p; s.esc *= 1 - 0.3 * p;
        if (u < 0.8) s.extras.push({ tipo: 'puf', u: u, color: a.color });
        if (p >= 1) s.visible = false;
      }
    },
    aparecer: {
      antes: function (s) { s.visible = false; },
      aplicar: function (s, a, u) {
        var dur = num(a.dur, 0.45), p = c01(u / dur);
        s.alpha *= p; s.esc *= lerp(0.6, 1, easeOutBack(p));
        if (u < 0.8) s.extras.push({ tipo: 'puf', u: u, color: a.color });
      }
    },
    transformar: {
      aplicar: function (s, a, u) {
        var dur = num(a.dur, 0.8), p = c01(u / dur);
        if (p >= 0.5) {
          if (typeof a.en === 'string') s.quien = normQuien(a.en);
          if (esObj(a.cambia)) aplicarCambios(s, a.cambia);
        }
        if (p < 1) { s.escY *= 1 - 0.22 * Math.sin(p * Math.PI); s.esc *= 1 + 0.1 * Math.sin(p * Math.PI); s.sx += Math.sin(u * 50) * 2; }
        if (u < 0.9 + dur * 0.5 && u > dur * 0.3) s.extras.push({ tipo: 'puf', u: u - dur * 0.3, color: a.color || '#a7f3d0' });
      }
    },
    mirar: { aplicar: function (s, a, u, X) { if (a.mirar === undefined && typeof a.a === 'string') a = { mirar: a.a }; mirarFinal(s, a.mirar !== undefined ? a : { mirar: a.facing }, X); } },
    cambiar: {
      aplicar: function (s, a, u) {
        if (esObj(a.cambia)) aplicarCambios(s, a.cambia);
        if (a.destello && u < 0.8) s.extras.push({ tipo: 'puf', u: u, color: typeof a.destello === 'string' ? a.destello : '#86efac' });
      }
    },
    retroceder: {
      aplicar: function (s, a, u) {
        var dur = num(a.dur, 0.4), p = c01(u / dur);
        s.x -= s.facing * num(a.distancia, 70) * easeOut(p);
        s.dy -= Math.sin(p * Math.PI) * 24;
        if (u < dur + 0.5) s.poseTemp = 'hurt';
        if (p >= 1 && u - dur < 0.4) s.extras.push({ tipo: 'polvo', x: s.x, y: s.y, u: u - dur, n: 5 });
      }
    },
    brillar: { aplicar: function (s, a, u) { if (u <= num(a.dur, Infinity)) s.brillo = { color: a.color || s.opts.color || '#fde047', fuerza: num(a.fuerza, 1) }; } },
    parpadear: { aplicar: function (s, a, u) { if (u <= num(a.dur, Infinity)) s.alpha *= (Math.sin(u * TAU * num(a.veces, 2)) > -0.3) ? 1 : 0.2; } },
    abrir: {
      aplicar: function (s, a, u) {
        var p = c01(u / num(a.dur, 0.8));
        s.opts.abierta = (s.quien === 'celda') ? (p >= 0.5) : easeInOut(p);
        if (s.quien === 'celda' && p >= 0.5 && u < num(a.dur, 0.8) * 0.5 + 0.8) s.extras.push({ tipo: 'puf', u: u - num(a.dur, 0.8) * 0.5, color: '#fde68a' });
      }
    },
    cerrar: { aplicar: function (s, a, u) { s.opts.abierta = (s.quien === 'celda') ? false : 1 - easeInOut(c01(u / num(a.dur, 0.6))); } },
    romper: {
      aplicar: function (s, a, u) {
        if (s.quien === 'gemaPoder') {
          // rota < 1: con rota = 1 el arte calcula un alpha negativo (redondeo) y queda un disco opaco
          var p = c01(u / num(a.dur, 1.4));
          s.opts.rota = Math.min(p, 0.999);
          if (p >= 1) s.visible = false;
          return;
        }
        ACC.pop.aplicar(s, a, u);
      }
    },
    pop: {
      aplicar: function (s, a, u) {
        if (u < 0.12) { s.escY *= 1 + 0.25 * (u / 0.12); s.esc *= 1 + 0.08 * (u / 0.12); }
        else s.visible = false;
        if (u < 1.4) s.extras.push({ tipo: 'pop', u: u, esc: altoDe(s) / 120 });
      }
    },
    animar: {
      aplicar: function (s, a, u) {
        if (!esObj(a.props)) return;
        var p = easeInOut(c01(u / num(a.dur, 1)));
        for (var k in a.props) {
          var v = a.props[k];
          if (Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number') s.opts[k] = lerp(v[0], v[1], p);
        }
      }
    },
    hablar: { aplicar: function (s, a, u) { if (u <= num(a.dur, Infinity)) s.hablar = true; } },
    esperar: { aplicar: function () { /* nada */ } }
  };
  function ladoEntrada(s, a) {
    if (a.desde === 'derecha' || a.desde === 'izquierda') return a.desde;
    return s.facing < 0 ? 'derecha' : 'izquierda';
  }
  function aplicarCambios(s, c) {
    for (var k in c) {
      if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
      var v = c[k];
      if (k === 'pose' && typeof v === 'string') s.pose = v;
      else if (k === 'quien' && typeof v === 'string') s.quien = normQuien(v);
      else if (k === 'facing' || k === 'mira') s.facing = (v === -1 || v === 'izquierda') ? -1 : 1;
      else if (k === 'escala' && typeof v === 'number') s.escala = v;
      else if (k === 'x' && typeof v === 'number') s.x = v;
      else if (k === 'y' && typeof v === 'number') s.y = v;
      else s.opts[k] = v;
    }
  }

  function estadoActor(plan, act, lineT, T, X) {
    var s = {
      key: act.key, quien: act.quien, escala: act.escala, fase: act.fase, z: act.z, idx: act.idx,
      x: act.x, y: act.y, dy: 0, sx: 0, sy: 0, esc: 1, escY: 1, rot: 0, alpha: 1, visible: true,
      facing: act.facing, dirMov: 0, pose: act.pose, poseTemp: null, mov: false, andar: 0,
      recorte: null, atrapado: null, brillo: null, hablar: false, opts: copia(act.opts), extras: [], temblorCam: 0
    };
    for (var i = 0; i < act.acciones.length; i++) {
      var a = act.acciones[i], def = ACC[a.tipo];
      if (!def) continue;
      if (lineT < a.t) { if (def.antes) def.antes(s, a, X); continue; }
      def.aplicar(s, a, lineT - a.t, X);
    }
    for (var j = 0; j < plan.conversiones.length; j++) {
      var cv = plan.conversiones[j];
      if (cv.key === act.key && lineT >= cv.t) {
        s.opts.hacked = true; s.opts.good = true;
        if (lineT - cv.t < 0.9) s.extras.push({ tipo: 'puf', u: lineT - cv.t, color: '#86efac' });
      }
    }
    return s;
  }

  // Evalúa TODOS los actores de un plano en un instante.
  function evaluar(plan, lineT, T) {
    var base = {}, i;
    for (i = 0; i < plan.actores.length; i++) {
      var a0 = plan.actores[i];
      base[a0.key] = { key: a0.key, quien: a0.quien, x: a0.x, y: a0.y, dy: 0, esc: 1, escala: a0.escala, facing: a0.facing };
    }
    var cache = {};
    var X = {
      T: T, lineT: lineT, sueloY: plan.sueloY, plan: plan,
      // referencia a otro actor (un nivel: sus propias referencias usan posiciones declaradas)
      ref: function (key) {
        if (cache[key]) return cache[key];
        var act = null;
        for (var k = 0; k < plan.actores.length; k++) if (plan.actores[k].key === key) { act = plan.actores[k]; break; }
        if (!act) return null;
        var X2 = { T: T, lineT: lineT, sueloY: plan.sueloY, plan: plan, ref: function (k2) { return base[k2] || null; } };
        cache[key] = estadoActor(plan, act, lineT, T, X2);
        return cache[key];
      }
    };
    var estados = {}, todos = [];
    for (i = 0; i < plan.actores.length; i++) {
      var s = estadoActor(plan, plan.actores[i], lineT, T, X);
      estados[s.key] = s; todos.push(s);
    }
    return { estados: estados, todos: todos };
  }

  // ===========================================================================
  //  CÁMARA
  // ===========================================================================
  // Zoom mínimo: por debajo de 1 es un plano ABIERTO (la cámara se aleja; añadido en la Parte 3).
  var ZOOM_MIN = 0.7, ZOOM_MAX = 3;
  function limitarCam(c, z) {
    var zz = z || c.z;
    if (zz < 1) {
      // Plano abierto: la cámara se centra en x y deja quieto el borde de abajo de la zona de
      // acción (y = 345), así el suelo no sube y lo que se abre es el cielo. A zoom 1 da (480, 172):
      // el paso entre zoom > 1 y zoom < 1 es continuo.
      c.x = ANCLA_X;
      c.y = ALTO_ESCENA - (ALTO_ESCENA - ANCLA_Y) / zz;
      return c;
    }
    c.x = clamp(c.x, ANCLA_X / zz, W - (W - ANCLA_X) / zz);
    c.y = clamp(c.y, ANCLA_Y / zz, H - (H - ANCLA_Y) / zz);
    return c;
  }
  function foco(cdef, ev, fallbackY) {
    var x = num(cdef.x, ANCLA_X), y = num(cdef.y, fallbackY);
    if (typeof cdef.a === 'string' && ev.estados[cdef.a]) {
      var st = ev.estados[cdef.a], p = refPunto(st, 'centro');
      x = p.x + num(cdef.dx, 0); y = p.y + num(cdef.dy, 0);
    }
    return { x: x, y: y };
  }
  function camaraDe(plan, ev, lineT) {
    var cd = plan.camara || {};
    var z = clamp(num(cd.zoom, 1), ZOOM_MIN, ZOOM_MAX);
    var f = foco(cd, ev, z > 1.01 ? 205 : ANCLA_Y);
    var cam = { z: z, x: f.x, y: f.y };
    if (esObj(cd.hasta)) {
      var hz = clamp(num(cd.hasta.zoom, z), ZOOM_MIN, ZOOM_MAX);
      var hf = foco(cd.hasta, ev, hz > 1.01 ? 205 : ANCLA_Y);
      if (cd.hasta.x === undefined && cd.hasta.a === undefined) hf.x = cam.x;
      if (cd.hasta.y === undefined && cd.hasta.a === undefined) hf.y = (hz > 1.01 || z <= 1.01) ? cam.y : ANCLA_Y;
      var p = easeInOut(c01((lineT - num(cd.t, 0)) / Math.max(0.05, num(cd.dur, 3))));
      cam.z = lerp(z, hz, p); cam.x = lerp(cam.x, hf.x, p); cam.y = lerp(cam.y, hf.y, p);
    }
    return limitarCam(cam);
  }

  // ===========================================================================
  //  DIBUJO DE UN ACTOR
  // ===========================================================================
  function poseFinal(s, cat) {
    var p = s.poseTemp || s.pose || 'idle';
    if (cat.poses && cat.poses[p]) p = cat.poses[p];
    return p;
  }
  function dibujarActor(ctx, s, T, X) {
    if (!s.visible || s.alpha <= 0.01) return;
    var cat = catDe(s.quien);
    var esc = cat.esc * s.escala * s.esc;
    var alto = altoCat(cat, s.opts) * esc;
    var facing = (s.mov && s.dirMov) ? s.dirMov : s.facing;
    var vuela = vuelaCat(cat, s.opts);
    var dy = s.dy, rot = s.rot, escY = s.escY;
    // vida: respirar, flotar, andar, hablar
    if (vuela && !s.mov) dy += Math.sin(T * 2.6 + s.fase) * 5;
    if (cat.respira) escY *= 1 + 0.014 * Math.sin(T * 2.4 + s.fase);
    if (s.mov && !cat.anima) { dy -= Math.abs(Math.sin(s.andar * 10)) * 5 * Math.min(1.5, esc); rot += Math.sin(s.andar * 10) * 0.05; }
    if (s.hablar && !s.mov) escY *= 1 + 0.022 * Math.abs(Math.sin(T * 9));
    var px = s.x + s.sx, py = s.y + dy + s.sy;

    ctx.save();
    ctx.globalAlpha *= c01(s.alpha);
    if (s.recorte !== null) { ctx.beginPath(); ctx.rect(-3000, -3000, 7000, s.recorte + 3000); ctx.clip(); }
    // brillo detrás
    if (s.brillo) {
      var r = Math.max(alto, cat.ancho * esc) * 0.75 * (1 + 0.08 * Math.sin(T * 5)) * s.brillo.fuerza;
      var g = ctx.createRadialGradient(px, py - alto * 0.5, 4, px, py - alto * 0.5, r);
      g.addColorStop(0, s.brillo.color); g.addColorStop(0.5, s.brillo.color); g.addColorStop(1, finBrillo(ctx, s.brillo.color));
      ctx.save(); ctx.globalAlpha *= 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py - alto * 0.5, r, 0, TAU); ctx.fill(); ctx.restore();
    }
    // sombra en el suelo cuando está en el aire
    if (dy < -6 && !vuela && s.recorte === null) {
      var k = clamp(1 + dy / 260, 0.35, 1);
      ctx.save(); ctx.globalAlpha *= 0.25 * k; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, cat.ancho * esc * 0.45 * k, 6 * k, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.translate(px, py);
    if (rot) { ctx.translate(0, -alto / 2); ctx.rotate(rot * facing); ctx.translate(0, alto / 2); }
    if (escY !== 1) ctx.scale(1 + (1 - escY) * 0.6, escY);
    ctx.scale(facing * (cat.mira || 1), 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var t = T + s.fase;
    var pose = poseFinal(s, cat);
    if (s.opts.jetpack) {
      dibP2('jetpack', ctx, 0, 0, { facing: 1, scale: esc, llama: num(s.opts.llama, (dy < -4 || s.mov) ? 1 : 0.3) });
    }
    if (s.atrapado === 'celda' && s.quien === 'falcon') {
      var fc = gfx('drawEnergyCell');
      if (fc) fc(ctx, 0, -59 * esc / 0.8, { t: t, open: false, scale: esc / 0.8 });
      else dibRespaldo(ctx, esc, cat);
    } else {
      var ok = false;
      if (cat.dib) {
        try { ok = cat.dib(ctx, esc, s.opts, t, pose) !== false; } catch (e) { fallo('arte ' + s.quien, e); ok = true; }
      }
      if (!ok) dibRespaldo(ctx, esc, cat);
      if (typeof s.opts.enMano === 'string') {
        // arma de la Parte 2 en la mano (guantes, bumeran, red…), como en el juego
        var hx = 18, hy = -28;
        if (pose === 'attack') { hx = 34; hy = -18; } else if (pose === 'shoot') { hx = 30; hy = -24; }
        dibP2('armaEnMano', ctx, hx * esc, hy * esc, { arma: s.opts.enMano, facing: 1, t01: num(s.opts.t01, 0.5), scale: esc });
      }
      if (s.opts.escudo) escudoBurbuja(ctx, alto, cat.ancho * esc, t, s.opts.escudo);
      if (s.atrapado === 'red') {
        if (!dibP2('red', ctx, 0, -alto * 0.5, { scale: Math.max(alto, cat.ancho * esc) / 44, abierta: false })) jaula(ctx, alto, cat.ancho * esc, t);
      } else if (s.atrapado) jaula(ctx, alto, cat.ancho * esc, t);
    }
    ctx.restore();
  }
  // ESCUDO DE PODER (escudo: true): burbuja de energía naranja alrededor del actor.
  // (escudo: '#color' para otro color.)
  function escudoBurbuja(c, alto, ancho, t, col) {
    var color = (typeof col === 'string') ? col : '#fb923c';
    var cy = -alto * 0.47, rx = Math.max(50, ancho * 0.8), ry = alto * 0.6;
    var parp = 0.85 + 0.15 * Math.sin(t * 7);
    c.save();
    c.beginPath(); c.ellipse(0, cy, rx, ry, 0, 0, TAU);
    var g = c.createRadialGradient(0, cy, Math.min(rx, ry) * 0.4, 0, cy, Math.max(rx, ry));
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha *= 0.28 * parp; c.fillStyle = g; c.fill();
    c.restore();
    c.save();
    c.beginPath(); c.ellipse(0, cy, rx, ry, 0, 0, TAU); c.clip();
    c.globalAlpha *= 0.16 * parp; c.strokeStyle = '#ffedd5'; c.lineWidth = 2;
    var hx = 26;
    for (var gy = cy - ry; gy < cy + ry; gy += hx * 0.87) {
      var fila = Math.round((gy - cy) / (hx * 0.87));
      for (var gx = -rx - hx + ((fila % 2) ? hx / 2 : 0); gx < rx + hx; gx += hx) {
        c.beginPath();
        for (var k = 0; k < 6; k++) { var a = k * TAU / 6 + Math.PI / 6; c.lineTo(gx + Math.cos(a) * hx * 0.5, gy + Math.sin(a) * hx * 0.5); }
        c.closePath(); c.stroke();
      }
    }
    c.restore();
    c.save();
    c.globalAlpha *= 0.8 * parp; c.strokeStyle = color; c.lineWidth = 4;
    c.beginPath(); c.ellipse(0, cy, rx, ry, 0, 0, TAU); c.stroke();
    c.globalAlpha = c.globalAlpha * 0.9; c.strokeStyle = '#fff7ed'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, cy, rx * 0.86, ry * 0.88, 0, Math.PI * 1.08, Math.PI * 1.38); c.stroke();
    c.restore();
  }
  // Burbuja de energía (atrapado) para cualquier actor que no sea Falcon.
  function jaula(c, alto, ancho, t) {
    var w = Math.max(60, ancho * 1.25), h = alto * 1.12;
    c.save();
    c.globalAlpha *= 0.35 + 0.1 * Math.sin(t * 4);
    rr(c, -w / 2, -h, w, h, 14);
    c.fillStyle = 'rgba(249,115,22,0.6)'; c.fill();
    c.restore();
    rr(c, -w / 2, -h, w, h, 14); c.strokeStyle = '#fb923c'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(255,200,120,0.6)'; c.lineWidth = 2;
    for (var i = 1; i < 4; i++) { var x = -w / 2 + w * i / 4; c.beginPath(); c.moveTo(x, -h + 4); c.lineTo(x, -4); c.stroke(); }
    rr(c, -w / 2 - 6, -h - 10, w + 12, 12, 4); c.fillStyle = '#334155'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2.5; c.stroke();
    rr(c, -w / 2 - 6, -4, w + 12, 12, 4); c.fillStyle = '#334155'; c.fill(); c.stroke();
  }

  // ---- Extras de los actores (proyectiles, rayos, polvo, "!"…) ----
  function dibujarExtra(ctx, e, s, T, X) {
    var cat = catDe(s.quien), h = altoDe(s), f;
    var cabeza = { x: s.x + s.sx, y: s.y + s.dy - h - 6 };
    switch (e.tipo) {
      case 'proyectil': {
        ctx.save(); ctx.globalAlpha *= num(e.alpha, 1);
        ctx.translate(e.x, e.y);
        var sc = clamp(altoDe(s) / 52, 1, 2.6);
        if (e.clase === 'flecha' || e.clase === 'pluma') {
          f = gfx('drawArrowProj');
          ctx.rotate(e.ang); ctx.scale(sc, sc);
          if (e.clase === 'pluma') { ctx.fillStyle = '#4ade80'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -6); ctx.lineTo(-6, 0); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
          else if (f) f(ctx, 0, 0, 0); else { ctx.fillStyle = '#78350f'; ctx.fillRect(-14, -2, 28, 4); }
        } else if (e.clase === 'laser' || e.clase === 'rayo') {
          f = gfx('drawLaserBolt'); ctx.rotate(e.ang);
          if (f) f(ctx, 0, 0, 34 * sc, e.clase === 'rayo' ? '#f87171' : '#67e8f9'); else { ctx.fillStyle = '#67e8f9'; ctx.fillRect(-17, -3, 34, 6); }
        } else if (e.clase === 'red') {
          if (!dibP2('red', ctx, 0, 0, { scale: sc * 0.8, abierta: true })) circ(ctx, 0, 0, 18, 'rgba(148,163,184,0.5)', OUTLINE, 2);
        } else if (e.clase === 'energia') {
          // Parte 3: bola de energía AZUL de Mikey (nunca balas)
          var lz = e.lanzador === 'francotirador' || e.lanzador === 'metralleta' ? e.lanzador : 'pistola';
          if (!dibP2('bolaEnergiaJuego', ctx, 0, 0, { tipo: lz, angle: e.ang, scale: sc * 0.85, t: T })) {
            ctx.rotate(e.ang);
            var largo = lz === 'francotirador' ? 1.8 : 1;
            ctx.save(); ctx.globalAlpha *= 0.35; ctx.scale(largo, 1); circ(ctx, -3 * sc, 0, 9 * sc, '#60a5fa', null); ctx.restore();
            if (lz === 'francotirador') { ctx.save(); ctx.globalAlpha *= 0.5; ctx.fillStyle = '#93c5fd'; ctx.fillRect(-34 * sc, -2 * sc, 28 * sc, 4 * sc); ctx.restore(); }
            ctx.save(); ctx.scale(largo, 1); circ(ctx, 0, 0, 4.5 * sc, '#3b82f6', '#1e3a8a', 2); ctx.restore();
            circ(ctx, -1 * sc, -1 * sc, 1.8 * sc, '#e0f2fe', null);
          }
        } else if (e.clase === 'escudo') {
          // Parte 3: el escudo de Peter, girando
          if (!dibP2('escudoPeter', ctx, 0, 0, { variant: lookP3('peter'), scale: sc * 0.6, angle: T * 14 })) {
            ctx.rotate(T * 14);
            circ(ctx, 0, 0, 13 * sc, '#16a34a', OUTLINE, 2); circ(ctx, 0, 0, 8 * sc, '#111827', null); circ(ctx, 0, 0, 3.5 * sc, '#4ade80', null);
          }
        } else if (e.clase === 'bumeran') {
          ctx.rotate(T * 14);
          if (!dibP2('bumeran', ctx, 0, 0, { t: T, scale: sc * 0.8 })) circ(ctx, 0, 0, 14, '#22c55e', OUTLINE, 2);
        } else {
          var col = e.clase === 'bola' ? '#fb923c' : '#67e8f9';
          ctx.save(); ctx.globalAlpha *= 0.4; circ(ctx, 0, 0, 16 * sc, col, null); ctx.restore();
          circ(ctx, 0, 0, 8 * sc, col, OUTLINE, 2); circ(ctx, -2 * sc, -2 * sc, 3 * sc, '#ffffff', null);
        }
        ctx.restore();
        break;
      }
      case 'impacto': {
        var q = c01(e.q);
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.globalAlpha *= 1 - q;
        estrella(ctx, 0, 0, 26 * (0.6 + q), 10 * (0.6 + q), 8, q * 2);
        ctx.fillStyle = e.rebote ? '#fef9c3' : '#fde047'; ctx.fill(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        for (var i = 0; i < 6; i++) { var an = i * TAU / 6 + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(an) * 20 * (0.5 + q), Math.sin(an) * 20 * (0.5 + q)); ctx.lineTo(Math.cos(an) * 40 * (0.5 + q), Math.sin(an) * 40 * (0.5 + q)); ctx.stroke(); }
        ctx.restore();
        break;
      }
      case 'rayoHack': {
        f = gfx('drawHackBeam');
        if (f) f(ctx, e.x1, e.y1, e.x2, e.y2, T);
        else { ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke(); }
        var pulso = (e.u * 2) % 1;
        ctx.save(); ctx.globalAlpha *= 1 - pulso; ctx.strokeStyle = '#86efac'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x2, e.y2, 10 + pulso * 40, 0, TAU); ctx.stroke(); ctx.restore();
        break;
      }
      case 'espadazo': {
        f = gfx('drawSlash');
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.esc * 1.3, e.esc * 1.3);
        if (f) f(ctx, 0, 0, e.f, e.q);
        ctx.restore();
        break;
      }
      case 'punetazo': {
        f = gfx('drawPunch');
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.esc * 1.3, e.esc * 1.3);
        if (f) f(ctx, 0, 0, e.f, e.q);
        ctx.restore();
        break;
      }
      case 'polvo': fxPolvo(ctx, e.x, e.y, e.u, 0.7, e.n || 7, X.colorPolvo, clamp(anchoDe(s) / 60, 0.7, 2.2)); break;
      case 'polvito': {
        ctx.save(); ctx.globalAlpha *= 0.5 * (1 - e.q);
        circ(ctx, e.x, e.y - 6 - e.q * 10, 6 + e.q * 10, X.colorPolvo, null);
        ctx.restore();
        break;
      }
      case 'polvoSuelo': {
        var w = e.w * 0.9;
        for (var k = 0; k < 9; k++) {
          var ph = (e.u * 1.6 + hash(k, 3)) % 1;
          ctx.save(); ctx.globalAlpha *= 0.55 * (1 - ph);
          circ(ctx, e.x - w / 2 + w * hash(k, 1) + (hash(k, 2) - 0.5) * ph * 40, e.y - 4 - ph * 34, 10 + ph * 18, X.colorPolvo, null);
          ctx.restore();
        }
        for (var r2 = 0; r2 < 6; r2++) {
          var pr = (e.u * 1.3 + hash(r2, 8)) % 1;
          ctx.save(); ctx.translate(e.x - w / 2 + w * hash(r2, 9), e.y - 2 - Math.sin(pr * Math.PI) * 50); ctx.rotate(pr * 6);
          ctx.fillStyle = '#78716c'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
          rr(ctx, -5, -4, 10, 8, 2); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'excl': {
        f = gfx('drawExclamation');
        var sc2 = easeOutBack(c01(e.u / 0.25));
        ctx.save(); ctx.translate(cabeza.x + s.facing * 8, cabeza.y - 18); ctx.scale(sc2 * 1.3, sc2 * 1.3);
        if (f) f(ctx, 0, 0); else { ctx.fillStyle = '#fbbf24'; ctx.fillRect(-3, -12, 6, 14); }
        ctx.restore();
        break;
      }
      case 'gota': {
        var gq = (e.u % 0.8) / 0.8;
        ctx.save(); ctx.globalAlpha *= 1 - gq;
        var gx = cabeza.x - s.facing * h * 0.22, gy = cabeza.y + h * 0.18 + gq * 18;
        ctx.beginPath(); ctx.moveTo(gx, gy - 9); ctx.quadraticCurveTo(gx + 6, gy, gx, gy + 4); ctx.quadraticCurveTo(gx - 6, gy, gx, gy - 9);
        ctx.fillStyle = '#7dd3fc'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        break;
      }
      case 'ja': {
        var jq = c01(e.u);
        ctx.save(); ctx.globalAlpha *= 1 - jq * jq;
        var jx = cabeza.x + e.lado * (anchoDe(s) * 0.45 + 22 + jq * 18), jy = cabeza.y + h * 0.16 - jq * 34;
        ctx.translate(jx, jy); ctx.rotate(e.lado * 0.18);
        var js = easeOutBack(c01(e.u / 0.2));
        ctx.scale(js, js);
        textoComic(ctx, e.texto, 0, 0, 26, '#fde047', '#ef4444');
        ctx.restore();
        break;
      }
      case 'rugido': {
        for (var rj = 0; rj < 3; rj++) {
          var rq = ((e.u * 1.8) + rj / 3) % 1;
          ctx.save(); ctx.globalAlpha *= (1 - rq) * 0.8; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(cabeza.x + s.facing * h * 0.15, cabeza.y + h * 0.2, 20 + rq * 120, s.facing > 0 ? -0.8 : Math.PI - 0.8, s.facing > 0 ? 0.8 : Math.PI + 0.8);
          ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'dedo': {
        var dx = e.ox - s.x, dy2 = e.oy - (s.y - h * 0.6), L = Math.sqrt(dx * dx + dy2 * dy2) || 1;
        var ux = dx / L, uy = dy2 / L, bob = Math.sin(e.u * 8) * 6;
        var ax = s.x + ux * (cat.ancho * cat.esc * s.escala * 0.6 + 26 + bob), ay = s.y + s.dy - h * 0.62 + uy * (26 + bob);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(uy, ux));
        ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(6, -6); ctx.lineTo(6, -14); ctx.lineTo(24, 0); ctx.lineTo(6, 14); ctx.lineTo(6, 6); ctx.lineTo(-16, 6); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        break;
      }
      case 'corazones': fxCorazones(ctx, e.x, e.y, e.u + 0.3, 5, 70, X.T); break;
      case 'puf': {
        var pq = c01(e.u / 0.8), cx = s.x + s.sx, cy = s.y + s.dy - h * 0.5;
        f = gfx('drawSparkle');
        for (var pi = 0; pi < 8; pi++) {
          var pa = pi * TAU / 8 + 0.4, pd = (20 + h * 0.45) * easeOut(pq);
          ctx.save(); ctx.translate(cx + Math.cos(pa) * pd, cy + Math.sin(pa) * pd); ctx.scale(1.6, 1.6);
          if (f) f(ctx, 0, 0, pq); ctx.restore();
        }
        ctx.save(); ctx.globalAlpha *= (1 - pq) * 0.6;
        circ(ctx, cx, cy, h * 0.35 + pq * h * 0.4, null, e.color || '#fef9c3', 5 * (1 - pq) + 1);
        ctx.restore();
        break;
      }
      case 'pop': fxPop(ctx, s.x, s.y - h * 0.5, e.u, 'pop' + s.key, e.esc); break;
      case 'velocidad': {
        for (var vi = 0; vi < 6; vi++) {
          var vy = s.y - 10 - hash(vi, 2) * h * 0.9, vl = 40 + hash(vi, 3) * 70, vx0 = s.x - e.dir * (anchoDe(s) * 0.5 + 10 + ((X.T * 900 + hash(vi, 4) * 200) % 120));
          ctx.save(); ctx.globalAlpha *= 0.55; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(vx0, vy); ctx.lineTo(vx0 - e.dir * vl, vy); ctx.stroke(); ctx.restore();
        }
        break;
      }
      default: break;
    }
  }

  // ===========================================================================
  //  EFECTOS (los del plano y los que usan las acciones)
  // ===========================================================================
  function fxPolvo(ctx, x, y, u, dur, n, color, esc) {
    var p = c01(u / dur);
    if (p >= 1) return;
    esc = esc || 1;
    for (var i = 0; i < n; i++) {
      var dir = (i % 2) ? 1 : -1, d = (20 + 70 * hash(i, 1)) * easeOut(p) * esc;
      var r = (8 + 10 * hash(i, 2)) * (0.6 + 0.9 * p) * esc;
      ctx.save(); ctx.globalAlpha *= 0.6 * (1 - p);
      circ(ctx, x + dir * d, y - 6 - 22 * hash(i, 3) * p * esc, r, color || '#e5e7eb', null);
      ctx.restore();
    }
  }
  function fxCorazones(ctx, x, y, u, n, alto, T) {
    var f = gfx('drawHeart');
    for (var i = 0; i < n; i++) {
      var ph = ((u * 0.55) + hash(i, 5)) % 1;
      if (u * 0.55 < hash(i, 5) * 0.2) continue;
      var px = x + Math.sin(ph * 6 + i) * 22 + (hash(i, 6) - 0.5) * 50, py = y - ph * (alto || 120);
      ctx.save(); ctx.globalAlpha *= ph < 0.15 ? ph / 0.15 : (1 - ph);
      var sz = 14 + hash(i, 7) * 10;
      if (f) f(ctx, px, py, sz, 'full'); else circ(ctx, px, py, sz / 2, '#ff5a7a', OUTLINE, 2);
      ctx.restore();
    }
  }
  function fxPop(ctx, x, y, u, semilla, esc) {
    esc = clamp(num(esc, 1), 0.5, 3);
    var f = gfx('drawExplosion');
    if (f && u < 0.6) f(ctx, x, y, u / 0.6, 46 * esc);
    if (u < 0.35) { ctx.save(); ctx.globalAlpha *= 1 - u / 0.35; circ(ctx, x, y, 20 * esc + u * 260 * esc, null, '#ffffff', 6); ctx.restore(); }
    // tornillos, tuercas y engranajes que salen volando (robots: "pop", nunca sangre)
    var sd = 0;
    for (var c = 0; c < semilla.length; c++) sd += semilla.charCodeAt(c);
    for (var i = 0; i < 9; i++) {
      var a = -Math.PI / 2 + (hash(i, sd) - 0.5) * 2.6, v = (180 + 160 * hash(i, sd + 1)) * esc;
      var px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u + 520 * u * u;
      if (u > 1.3) continue;
      ctx.save(); ctx.globalAlpha *= c01((1.3 - u) / 0.4); ctx.translate(px, py); ctx.rotate(u * (6 + i)); ctx.scale(esc, esc);
      ctx.lineJoin = 'round';
      if (i % 3 === 0) {          // tuerca
        ctx.beginPath(); for (var k = 0; k < 6; k++) { var aa = k * TAU / 6; ctx.lineTo(Math.cos(aa) * 7, Math.sin(aa) * 7); } ctx.closePath();
        ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); circ(ctx, 0, 0, 2.5, '#475569', null);
      } else if (i % 3 === 1) {   // tornillo
        rr(ctx, -2.5, -2, 5, 13, 1.5); ctx.fillStyle = '#94a3b8'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
        rr(ctx, -6, -6, 12, 5, 2); ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.stroke();
      } else {                    // engranaje
        estrella(ctx, 0, 0, 9, 6.5, 8, 0); ctx.fillStyle = '#fbbf24'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); circ(ctx, 0, 0, 2.5, OUTLINE, null);
      }
      ctx.restore();
    }
  }

  // Posición de un efecto: x, y del mundo o pegado a un actor (a, en: 'cabeza'|'pies'|'centro').
  function posEfecto(e, ev) {
    if (typeof e.a === 'string' && ev.estados[e.a]) {
      var p = refPunto(ev.estados[e.a], e.en || 'centro');
      return { x: p.x + num(e.dx, 0), y: p.y + num(e.dy, 0) };
    }
    return { x: num(e.x, 480), y: num(e.y, 200) };
  }
  var EFECTOS_DETRAS = { rayos: 1, brillo: 1, estela: 1, humo: 1, velo: 1 };
  var EFECTOS_PANTALLA = { viento: 1, velocidad: 1, lineasAccion: 1, flash: 1, lluviaEstrellas: 1, confeti: 1, foco: 1, alarma: 1, fuegos: 1 };
  var DUR_EFECTO = { polvo: 0.9, explosion: 1.3, pop: 1.3, chispas: 0.6, onda: 0.8, flash: 0.4, temblor: 0.6 };

  function dibujarEfecto(ctx, e, ev, X, cam) {
    var u = X.lineT - e.t;
    if (u < 0) return;
    var dur = num(e.dur, DUR_EFECTO[e.tipo] !== undefined ? DUR_EFECTO[e.tipo] : Infinity);
    var cada = num(e.repetir, 0);
    if (cada > 0) { if (u > num(e.dur, Infinity)) return; u = u % cada; dur = Math.min(dur, cada); }
    else if (u > dur) return;
    var fin = isFinite(dur) ? c01((dur - u) / 0.3) : 1;   // se apaga al final
    var pos = posEfecto(e, ev), T = X.T, n, i, f;
    var col = e.color;
    ctx.save();
    ctx.globalAlpha *= fin * num(e.alpha, 1);
    switch (e.tipo) {
      case 'polvo': fxPolvo(ctx, pos.x, pos.y, u, dur, num(e.cantidad, 9), col || X.colorPolvo, num(e.tam, 1.2)); break;
      case 'destellos': {
        n = num(e.cantidad, 7); f = gfx('drawSparkle');
        var R = num(e.radio, 70);
        for (i = 0; i < n; i++) {
          var ph = (T * 0.9 + hash(i, 11)) % 1;
          ctx.save(); ctx.translate(pos.x + (hash(i, 12) - 0.5) * 2 * R, pos.y + (hash(i, 13) - 0.5) * 2 * R * 0.8); ctx.scale(num(e.tam, 1.6), num(e.tam, 1.6));
          if (f) f(ctx, 0, 0, ph); ctx.restore();
        }
        break;
      }
      case 'estrellas': {
        n = num(e.cantidad, 4);
        for (i = 0; i < n; i++) {
          var an = T * 3 + i * TAU / n, rx = num(e.radio, 34);
          var sx = pos.x + Math.cos(an) * rx, sy = pos.y + Math.sin(an) * rx * 0.32;
          estrella(ctx, sx, sy, 8, 3.5, 5, T * 4 + i); ctx.fillStyle = '#fde047'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
        }
        break;
      }
      case 'explosion': case 'pop': fxPop(ctx, pos.x, pos.y, u, 'e' + e.t + pos.x, num(e.tam, 1)); break;
      case 'chispas': {
        n = num(e.cantidad, 12);
        var q = c01(u / dur);
        for (i = 0; i < n; i++) {
          var a2 = hash(i, 21) * TAU, v = 90 + 160 * hash(i, 22);
          var x1 = pos.x + Math.cos(a2) * v * q, y1 = pos.y + Math.sin(a2) * v * q + 120 * q * q;
          ctx.save(); ctx.globalAlpha *= 1 - q; ctx.strokeStyle = (i % 2) ? '#fde047' : (col || '#fb923c'); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a2) * 14, y1 - Math.sin(a2) * 14); ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'humo': {
        n = num(e.cantidad, 7);
        for (i = 0; i < n; i++) {
          var hp = (T * 0.3 + hash(i, 31)) % 1;
          ctx.save(); ctx.globalAlpha *= 0.32 * (1 - hp) * c01(hp * 6);
          circ(ctx, pos.x + Math.sin(hp * 3 + i) * 22, pos.y - hp * num(e.alto, 130), 12 + hp * 30, col || '#e2e8f0', null);
          ctx.restore();
        }
        break;
      }
      case 'rayos': {
        n = num(e.cantidad, 12);
        var L2 = num(e.radio, 700), rot = T * 0.25;
        ctx.globalAlpha *= num(e.fuerza, 1) * (col ? 0.25 : 1);
        for (i = 0; i < n; i++) {
          var a0 = rot + i * TAU / n, w2 = Math.PI / n * 0.55;
          ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x + Math.cos(a0 - w2) * L2, pos.y + Math.sin(a0 - w2) * L2);
          ctx.lineTo(pos.x + Math.cos(a0 + w2) * L2, pos.y + Math.sin(a0 + w2) * L2); ctx.closePath();
          ctx.fillStyle = col || 'rgba(254,240,138,0.22)'; ctx.fill();
        }
        var gr = ctx.createRadialGradient(pos.x, pos.y, 5, pos.x, pos.y, 160);
        gr.addColorStop(0, 'rgba(255,255,240,0.55)'); gr.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(pos.x, pos.y, 160, 0, TAU); ctx.fill();
        break;
      }
      case 'onda': {
        f = gfx('drawShockwave');
        if (f) f(ctx, pos.x, pos.y, num(e.radio, 120) * (0.3 + 0.7 * c01(u / dur)), c01(u / dur));
        break;
      }
      case 'corazones': fxCorazones(ctx, pos.x, pos.y, u + 0.4, num(e.cantidad, 6), num(e.alto, 130), T); break;
      case 'brillo': {
        var rb = num(e.radio, 120) * (1 + 0.08 * Math.sin(T * 4));
        var gb = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, rb);
        gb.addColorStop(0, col || 'rgba(253,224,71,0.85)'); gb.addColorStop(1, finBrillo(ctx, col));
        ctx.globalAlpha *= 0.75 * num(e.fuerza, 1); ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(pos.x, pos.y, rb, 0, TAU); ctx.fill();
        break;
      }
      case 'velo': {
        // Velo: relleno uniforme del mundo DETRÁS de los actores (oscurecer o teñir el fondo).
        // Entra suave (entrada, 0,4 s) y, como todos, se apaga en sus últimos 0,3 s.
        var ent = num(e.entrada, 0.4);
        ctx.globalAlpha *= (ent > 0 ? c01(u / ent) : 1) * c01(num(e.fuerza, 1));
        ctx.fillStyle = col || 'rgba(8,14,56,0.5)';
        ctx.fillRect(-4000, -4000, 8000, 8000);
        break;
      }
      case 'senal': {
        for (i = 0; i < 3; i++) {
          var sq = ((u * 1.2) + i / 3) % 1;
          ctx.save(); ctx.globalAlpha *= (1 - sq); ctx.strokeStyle = col || '#4ade80'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 14 + sq * num(e.radio, 90), 0, TAU); ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'estela': {
        if (typeof e.a !== 'string') break;
        for (i = 12; i >= 1; i--) {
          var tt = X.lineT - i * 0.035;
          var p2 = X.posEn(e.a, tt);
          if (!p2) continue;
          ctx.save(); ctx.globalAlpha *= 0.5 * (1 - i / 13);
          circ(ctx, p2.x, p2.y, num(e.tam, 14) * (1 - i / 16), col || '#93c5fd', null);
          ctx.restore();
        }
        break;
      }
      case 'notas': {
        n = num(e.cantidad, 6);
        for (i = 0; i < n; i++) {
          var np = ((T * 0.45) + hash(i, 41)) % 1;
          ctx.save(); ctx.globalAlpha *= np < 0.1 ? np * 10 : 1 - np;
          ctx.translate(pos.x + (hash(i, 42) - 0.5) * 160 + Math.sin(np * 7 + i) * 14, pos.y - np * 150);
          ctx.font = 'bold 30px ' + FUENTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.strokeText(i % 2 ? '♫' : '♪', 0, 0);
          ctx.fillStyle = ['#fde047', '#f472b6', '#60a5fa', '#4ade80'][i % 4]; ctx.fillText(i % 2 ? '♫' : '♪', 0, 0);
          ctx.restore();
        }
        break;
      }
      default: break;
    }
    ctx.restore();
  }

  // Efectos en coordenadas de PANTALLA (encima de todo el mundo).
  function dibujarEfectoPantalla(ctx, e, ev, X, cam) {
    var u = X.lineT - e.t;
    if (u < 0) return;
    var dur = num(e.dur, DUR_EFECTO[e.tipo] !== undefined ? DUR_EFECTO[e.tipo] : Infinity);
    if (u > dur) return;
    var fin = isFinite(dur) ? c01((dur - u) / 0.3) : 1;
    var T = X.T, i, n, col = e.color;
    ctx.save();
    ctx.globalAlpha *= num(e.alpha, 1) * (e.tipo === 'flash' ? 1 : fin);
    switch (e.tipo) {
      case 'viento': case 'velocidad': {
        var dir = (e.dir === -1 || e.dir === 'izquierda') ? -1 : 1, rapido = e.tipo === 'velocidad';
        n = num(e.cantidad, rapido ? 22 : 12);
        for (i = 0; i < n; i++) {
          var y = 14 + hash(i, 51) * 320, L = (rapido ? 90 : 60) + hash(i, 52) * (rapido ? 160 : 90);
          var sp = (rapido ? 1600 : 650) * (0.7 + 0.6 * hash(i, 53));
          var x = ((T * sp + hash(i, 54) * 1400) % 1400) - 220;
          if (dir < 0) x = W - x;
          ctx.save(); ctx.globalAlpha *= rapido ? 0.55 : 0.35; ctx.strokeStyle = col || '#ffffff'; ctx.lineWidth = rapido ? 3 : 2.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * L, y); ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'lineasAccion': {
        var c = aPantalla(cam, posEfecto(e, ev));
        if (e.x === undefined && e.a === undefined) c = { x: 480, y: 172 };
        var fr = Math.floor(T * 14);
        n = num(e.cantidad, 46);
        ctx.fillStyle = col || 'rgba(255,255,255,0.55)';
        for (i = 0; i < n; i++) {
          var a = (i + hash(i, fr % 7) * 0.6) * TAU / n, r0 = num(e.radio, 170) + hash(i, fr) * 60, w = 0.018 + hash(i, 61) * 0.02;
          ctx.beginPath();
          ctx.moveTo(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0 * 0.75);
          ctx.lineTo(c.x + Math.cos(a - w) * 900, c.y + Math.sin(a - w) * 900);
          ctx.lineTo(c.x + Math.cos(a + w) * 900, c.y + Math.sin(a + w) * 900);
          ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'flash': {
        ctx.globalAlpha *= 0.85 * (1 - c01(u / dur));
        ctx.fillStyle = col || '#ffffff'; ctx.fillRect(0, 0, W, H);
        break;
      }
      case 'lluviaEstrellas': {
        n = num(e.cantidad, 26);
        for (i = 0; i < n; i++) {
          var sy = ((T * (50 + 60 * hash(i, 71))) + hash(i, 72) * 420) % 420 - 40;
          var sx = hash(i, 73) * W + Math.sin(T + i) * 12;
          estrella(ctx, sx, sy, 7 + hash(i, 74) * 5, 3, 5, T * 2 + i);
          ctx.fillStyle = (i % 3) ? '#fde047' : '#ffffff'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
        }
        break;
      }
      case 'confeti': {
        n = num(e.cantidad, 60);
        var cols = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc', '#f472b6'];
        for (i = 0; i < n; i++) {
          var cy = ((T * (70 + 70 * hash(i, 81)) + hash(i, 82) * 420) % 420) - 40;
          var cx = hash(i, 83) * W + Math.sin(T * 2 + i) * 18;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(T * 3 + i); ctx.scale(1, Math.cos(T * 5 + i));
          ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-5, -3, 10, 6); ctx.restore();
        }
        break;
      }
      case 'foco': {
        var fc = aPantalla(cam, posEfecto(e, ev)), rf = num(e.radio, 150) * cam.z;
        var g = ctx.createRadialGradient(fc.x, fc.y, rf * 0.75, fc.x, fc.y, rf + 90);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,3,10,' + num(e.fuerza, 0.7) + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        break;
      }
      case 'alarma': {
        var al = 0.5 + 0.5 * Math.sin(T * 8);
        ctx.fillStyle = 'rgba(239,68,68,' + (0.16 * al) + ')'; ctx.fillRect(0, 0, W, H);
        var ga = ctx.createRadialGradient(480, 172, 200, 480, 172, 620);
        ga.addColorStop(0, 'rgba(239,68,68,0)'); ga.addColorStop(1, 'rgba(239,68,68,' + (0.45 * al) + ')');
        ctx.fillStyle = ga; ctx.fillRect(0, 0, W, H);
        break;
      }
      case 'fuegos': {
        n = num(e.cantidad, 4);
        var colsF = ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#fb923c'];
        for (i = 0; i < n; i++) {
          var per = 1.7 + hash(i, 91) * 0.8, ph = ((T + hash(i, 92) * per) % per) / per;
          var bx = 90 + hash(i, 93) * 780 + Math.floor((T + hash(i, 92) * per) / per) * 137 % 300 - 150, by = 50 + hash(i, 94) * 120;
          bx = clamp(bx, 60, 900);
          var fcol = colsF[(i + Math.floor(T / per)) % colsF.length];
          if (ph < 0.25) {
            var ry = lerp(360, by, ph / 0.25);
            circ(ctx, bx, ry, 3, '#fef9c3', null);
          } else {
            var q2 = (ph - 0.25) / 0.75;
            ctx.save(); ctx.globalAlpha *= 1 - q2;
            for (var k = 0; k < 14; k++) {
              var ak = k * TAU / 14, rk = 10 + q2 * 70;
              circ(ctx, bx + Math.cos(ak) * rk, by + Math.sin(ak) * rk + q2 * q2 * 30, 3.5 * (1 - q2 * 0.5), fcol, null);
            }
            ctx.restore();
          }
        }
        break;
      }
      default: break;
    }
    ctx.restore();
  }

  // ===========================================================================
  //  TEXTOS DE CÓMIC (en pantalla)
  // ===========================================================================
  function aPantalla(cam, p) {
    return { x: (p.x - cam.x) * cam.z + ANCLA_X + cam.ox, y: (p.y - cam.y) * cam.z + ANCLA_Y + cam.oy };
  }
  function textoComic(ctx, txt, x, y, tam, fill, borde) {
    ctx.font = '900 ' + tam + 'px ' + FUENTE_COMIC;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(5, tam * 0.3); ctx.strokeStyle = OUTLINE; ctx.strokeText(txt, x, y);
    ctx.lineWidth = Math.max(2, tam * 0.12); ctx.strokeStyle = borde || '#ef4444'; ctx.strokeText(txt, x, y);
    var g = ctx.createLinearGradient(0, y - tam / 2, 0, y + tam / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, fill || '#fde047'); g.addColorStop(1, oscurecer(fill || '#fde047'));
    ctx.fillStyle = g; ctx.fillText(txt, x, y);
  }
  function oscurecer(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(String(hex));
    if (!m) return hex;
    var v = parseInt(m[1], 16), r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    r = Math.round(r * 0.78); g = Math.round(g * 0.62); b = Math.round(b * 0.55);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function medir(ctx, txt, font) { ctx.save(); ctx.font = font; var w = ctx.measureText(String(txt)).width; ctx.restore(); return num(w, 10); }

  function dibujarTexto(ctx, tx, ev, X, cam) {
    var u = X.lineT - tx.t;
    if (u < 0 || u > tx.dur) return;
    var fin = isFinite(tx.dur) ? c01((tx.dur - u) / 0.25) : 1;
    var txt = String(tx.texto === undefined ? '' : tx.texto);
    var st = (typeof tx.a === 'string') ? ev.estados[tx.a] : null;
    if (typeof tx.a === 'string' && (!st || !st.visible) && tx.estilo !== 'cartel') return;
    var pop = easeOutBack(c01(u / 0.28));
    ctx.save();
    ctx.globalAlpha *= fin;
    if (tx.estilo === 'cartel') {
      var tamC = num(tx.tam, 21), fontC = 'italic bold ' + tamC + 'px ' + FUENTE;
      var wC = medir(ctx, txt, fontC) + 30, hC = tamC + 22;
      var xC = num(tx.x, 22), yC = num(tx.y, 18);
      var sl = easeOut(c01(u / 0.35));
      ctx.translate(lerp(-wC - 30, xC, sl), yC); ctx.rotate(-0.015);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, 5, 6, wC, hC, 6); ctx.fill();
      ctx.fillStyle = tx.color || '#fef3c7'; rr(ctx, 0, 0, wC, hC, 6); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = fontC; ctx.fillStyle = '#3b2412'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, 15, hC / 2 + 1);
      ctx.restore();
      return;
    }
    var p;
    if (st) {
      var h = altoDe(st);
      p = aPantalla(cam, { x: st.x + st.sx, y: st.y + st.dy - h });
    } else if (tx.pantalla) p = { x: num(tx.x, 480), y: num(tx.y, 120) };
    else p = aPantalla(cam, { x: num(tx.x, 480), y: num(tx.y, 120) });
    if (tx.estilo === 'onomatopeya' || tx.estilo === 'titulo') {
      var titulo = tx.estilo === 'titulo';
      var tam = num(tx.tam, titulo ? 50 : 54);
      var wT = medir(ctx, txt, '900 ' + tam + 'px ' + FUENTE_COMIC);
      if (st) p.y -= tam * 0.6 + 10;
      p.x = clamp(p.x + num(tx.dx, 0), wT / 2 + 14, W - wT / 2 - 14);
      p.y = clamp(p.y + num(tx.dy, 0), tam / 2 + 8, ALTO_ESCENA - tam / 2 - 4);
      p.y = libreArriba(p.x, p.y, wT, tam);
      var rot = num(tx.rot, titulo ? 0 : ((tx.t * 7.3) % 1 > 0.5 ? -0.09 : 0.08)) + Math.sin(X.T * 5 + tx.t) * 0.025;
      ctx.translate(p.x, p.y); ctx.rotate(rot); ctx.scale(pop, pop);
      if (!titulo) ctx.transform(1, 0, -0.12, 1, 0, 0);
      if (tx.estallido) {
        // "globo de explosión" de cómic: más ancho que alto, detrás de las letras
        ctx.save(); ctx.scale(1, 0.6);
        estrella(ctx, 0, 0, wT * 0.5 + 26, wT * 0.38 + 14, 13, 0.2);
        ctx.restore();
        ctx.fillStyle = typeof tx.estallido === 'string' ? tx.estallido : '#ffffff'; ctx.fill();
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4; ctx.stroke();
      }
      textoComic(ctx, txt, 0, 0, tam, tx.color || (titulo ? '#fbbf24' : '#fde047'), tx.borde || (titulo ? '#7c2d12' : '#ef4444'));
    } else if (tx.estilo === 'bocadillo') {
      var tamB = num(tx.tam, 30), fontB = '900 ' + tamB + 'px ' + FUENTE_COMIC;
      var wB = Math.max(46, medir(ctx, txt, fontB) + 30), hB = tamB + 22;
      var lado = tx.lado === 'izquierda' ? -1 : (tx.lado === 'derecha' ? 1 : (p.x > 480 ? -1 : 1));
      var bx = clamp(p.x + lado * (wB * 0.35 + 8) + num(tx.dx, 0), wB / 2 + 8, W - wB / 2 - 8);
      var by = libreArriba(bx, clamp(p.y - hB / 2 - 22 + num(tx.dy, 0), hB / 2 + 6, ALTO_ESCENA - hB / 2), wB, hB);
      ctx.translate(bx, by); ctx.scale(pop, pop);
      var tailX = clamp(p.x - bx, -wB / 2 + 8, wB / 2 - 8);
      ctx.beginPath();
      ctx.moveTo(tailX - 8, hB / 2 - 3); ctx.lineTo(clamp(p.x - bx, -wB, wB) * 1.0, hB / 2 + 18); ctx.lineTo(tailX + 8, hB / 2 - 3);
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      rr(ctx, -wB / 2, -hB / 2, wB, hB, hB / 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tailX - 7, hB / 2 - 1.5); ctx.lineTo(tailX + 7, hB / 2 - 1.5); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
      ctx.font = fontB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = tx.color || (txt.indexOf('!') >= 0 && txt.length <= 3 ? '#ef4444' : (txt.indexOf('?') >= 0 && txt.length <= 3 ? '#2563eb' : OUTLINE));
      ctx.fillText(txt, 0, 2);
    } else if (tx.estilo === 'pensamiento') {
      var dibs = lista(tx.dibujo || tx.quien);
      var tamP = num(tx.tam, 22);
      var anchoDib = 0, k;
      var ALTO_DIB = 96;
      for (k = 0; k < dibs.length; k++) { var cq = catDe(normQuien(dibs[k])); anchoDib += Math.min(120, cq.ancho * (ALTO_DIB / altoCat(cq, tx.opciones))) + 12; }
      var wTx = txt ? medir(ctx, txt, 'bold ' + tamP + 'px ' + FUENTE) : 0;
      var wP = Math.max(120, anchoDib + 50, wTx + 50), hP = (dibs.length ? ALTO_DIB + 20 : 0) + (txt ? tamP + 14 : 0) + 30;
      var ladoP = tx.lado === 'izquierda' ? -1 : (tx.lado === 'derecha' ? 1 : (p.x > 480 ? -1 : 1));
      var cxP = clamp(p.x + ladoP * (wP * 0.5 + 30) + num(tx.dx, 0), wP / 2 + 10, W - wP / 2 - 10);
      var cyP = libreArriba(cxP, clamp(p.y - hP / 2 - 30 + num(tx.dy, 0), hP / 2 + 8, ALTO_ESCENA - hP / 2), wP, hP);
      ctx.save();
      // bolitas hacia la cabeza
      for (k = 0; k < 3; k++) {
        var bq = (k + 1) / 4;
        var bxx = lerp(p.x, cxP - ladoP * wP * 0.3, bq), byy = lerp(p.y - 6, cyP + hP * 0.42, bq);
        if (pop > 0.3 + k * 0.15) circ(ctx, bxx, byy, 4 + k * 3, '#ffffff', OUTLINE, 2.5);
      }
      ctx.translate(cxP, cyP); ctx.scale(pop, pop);
      nube(ctx, wP, hP);
      var y0 = -hP / 2 + 16;
      if (dibs.length) {
        var xx = -anchoDib / 2;
        for (k = 0; k < dibs.length; k++) {
          var q = normQuien(dibs[k]), cc = catDe(q), escD = ALTO_DIB / altoCat(cc, tx.opciones), wd = Math.min(120, cc.ancho * escD);
          ctx.save(); ctx.translate(xx + wd / 2 + 6, y0 + ALTO_DIB + 8);
          var okD = false;
          try { okD = cc.dib ? cc.dib(ctx, escD, esObj(tx.opciones) ? tx.opciones : {}, X.T + k, 'idle') !== false : false; } catch (e) { okD = true; }
          if (!okD) dibRespaldo(ctx, escD, cc);
          ctx.restore();
          xx += wd + 12;
        }
        y0 += ALTO_DIB + 20;
      }
      if (txt) {
        ctx.font = 'bold ' + tamP + 'px ' + FUENTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = OUTLINE;
        ctx.fillText(txt, 0, y0 + tamP / 2 + 2);
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // Arriba a la derecha está el indicador "Mantén Enter para saltar": los textos no lo tapan.
  function libreArriba(x, y, w, h) {
    if (x + w / 2 > W - 250 && y - h / 2 < 46) return 46 + h / 2;
    return y;
  }
  function nube(c, w, h) {
    var bolas = [], n = Math.max(6, Math.round((w + h) / 34));
    for (var i = 0; i < n; i++) {
      var a = i * TAU / n;
      bolas.push([Math.cos(a) * (w / 2 - 14), Math.sin(a) * (h / 2 - 12), 20 + (i % 2) * 6]);
    }
    c.lineWidth = 6; c.strokeStyle = OUTLINE;
    bolas.forEach(function (b) { c.beginPath(); c.arc(b[0], b[1], b[2], 0, TAU); c.stroke(); });
    rr(c, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 26); c.stroke();
    c.fillStyle = '#ffffff';
    bolas.forEach(function (b) { c.beginPath(); c.arc(b[0], b[1], b[2], 0, TAU); c.fill(); });
    rr(c, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 26); c.fill();
  }

  // ===========================================================================
  //  RENDER DE UN PLANO COMPLETO
  // ===========================================================================
  function quienHabla(id, idx) {
    var arr = G.storyData && G.storyData[id];
    var l = arr && arr[idx];
    return l ? String(l.who || '') : '';
  }

  // info = { plan, lineT, T, prev: {plan, t} | null, continua, who }
  function renderPlano(ctx, info) {
    var plan = info.plan, lineT = info.lineT, T = info.T;
    var ev = evaluar(plan, lineT, T);
    var cam = camaraDe(plan, ev, lineT);
    var evPrev = null;
    // ---- continuidad con el plano anterior ----
    if (info.continua && info.prev && lineT < DESLIZ) {
      evPrev = evaluar(info.prev.plan, info.prev.t, T);
      var e = easeInOut(c01(lineT / DESLIZ));
      for (var i = 0; i < ev.todos.length; i++) {
        var s = ev.todos[i], sp = evPrev.estados[s.key];
        if (!sp || !sp.visible || !s.visible) continue;
        var escP = catDe(sp.quien).esc * sp.escala * sp.esc, escN = catDe(s.quien).esc * s.escala * s.esc;
        var nuevaX = s.x;
        s.x = lerp(sp.x, s.x, e); s.y = lerp(sp.y, s.y, e); s.dy = lerp(sp.dy, s.dy, e);
        if (sp.quien === s.quien && escN > 0) s.esc *= lerp(escP / escN, 1, e);
        // si se desplaza bastante, que se vea que camina (no que se desliza)
        if (e < 0.92 && !s.mov && Math.abs(nuevaX - sp.x) > 30) { s.mov = true; s.dirMov = nuevaX > sp.x ? 1 : -1; s.andar = lineT; s.poseTemp = s.poseTemp || 'run'; }
      }
      var camP = camaraDe(info.prev.plan, evPrev, info.prev.t);
      var ec = easeInOut(c01(lineT / (DESLIZ + 0.1)));
      cam = limitarCam({ z: lerp(camP.z, cam.z, ec), x: lerp(camP.x, cam.x, ec), y: lerp(camP.y, cam.y, ec) });
    }
    // ---- quién habla (se mueve un poquito al hablar) ----
    var habla = plan.habla;
    if (habla !== false) {
      var who = info.who, k;
      if (typeof habla === 'string' && ev.estados[habla]) ev.estados[habla].hablar = true;
      else if (who && who !== 'narrador') {
        if (ev.estados[who]) ev.estados[who].hablar = true;
        else for (k = 0; k < ev.todos.length; k++) {
          var q = ev.todos[k].quien;
          if (q === who || (who === 'secuaz' && q === 'secuazGigante')) { ev.todos[k].hablar = true; break; }
        }
      }
    }
    // ---- temblor de cámara ----
    var temb = num(plan.camara && plan.camara.temblor, 0);
    for (var j = 0; j < plan.efectos.length; j++) {
      var ef = plan.efectos[j];
      if (ef.tipo !== 'temblor') continue;
      var uu = lineT - ef.t, dd = num(ef.dur, 0.6);
      if (uu >= 0 && uu <= dd) temb = Math.max(temb, num(ef.fuerza, 1) * (1 - uu / dd));
    }
    for (var m = 0; m < ev.todos.length; m++) temb = Math.max(temb, ev.todos[m].temblorCam);
    var A = temb * 9;
    cam.ox = A * (Math.sin(T * 41) + Math.sin(T * 67 + 1)) * 0.5;
    cam.oy = A * (Math.sin(T * 53 + 2) + Math.sin(T * 31)) * 0.5;

    var X = {
      T: T, lineT: lineT, plan: plan, sueloY: plan.sueloY,
      colorPolvo: COLOR_POLVO[plan.suelo] || '#e5e7eb',
      posEn: function (key, tt) {
        if (tt < 0) return null;
        var e2 = evaluar(plan, tt, T).estados[key];
        if (!e2 || !e2.visible) return null;
        return refPunto(e2, 'centro');
      }
    };

    // ---- 1) FONDO (zoom más suave = profundidad) ----
    var fdef = FONDOS[plan.fondo] || FONDOS.menu;
    var zb = cam.z < 1 ? 1 : 1 + (cam.z - 1) * 0.5;   // con plano abierto el fondo no encoge (no deja huecos)
    var bc = limitarCam({ x: cam.x, y: cam.y }, zb);
    seguro(ctx, 'fondo ' + plan.fondo, function () {
      ctx.translate(ANCLA_X + cam.ox * 0.6, ANCLA_Y + cam.oy * 0.6);
      ctx.scale(zb * 1.025, zb * 1.025);
      ctx.translate(-bc.x, -bc.y);
      var camX = 100 + plan.fondoX + 30 * (1 - Math.cos(T * 0.12)) + (cam.x - ANCLA_X) * 0.3 + plan.fondoVel * T;
      if (fdef.dib(ctx, camX, T, plan) === false) fondoMenu(ctx, T);
    });

    // ---- 2) MUNDO (suelo, actores, efectos) con la cámara ----
    seguro(ctx, 'mundo', function () {
      ctx.translate(ANCLA_X + cam.ox, ANCLA_Y + cam.oy);
      ctx.scale(cam.z, cam.z);
      ctx.translate(-cam.x, -cam.y);
      var sf = SUELOS[plan.suelo];
      if (sf) seguro(ctx, 'suelo ' + plan.suelo, function () {
        // Plano abierto (zoom < 1): el suelo se dibuja a su tamaño de siempre, estirado desde la
        // línea de suelo, para que llegue a los bordes de la pantalla sin huecos.
        if (cam.z < 1) { ctx.translate(cam.x, plan.sueloY); ctx.scale(1 / cam.z, 1 / cam.z); ctx.translate(-ANCLA_X, -plan.sueloY); }
        sf(ctx, plan.sueloY, T, plan.fondoVel * T);
      });
      var i2;
      for (i2 = 0; i2 < plan.efectos.length; i2++) {
        var e1 = plan.efectos[i2];
        if (EFECTOS_DETRAS[e1.tipo] && !e1.delante) dibujarEfecto(ctx, e1, ev, X, cam);
      }
      var orden = ev.todos.slice().sort(function (a, b) { return (a.z - b.z) || (a.y - b.y) || (a.idx - b.idx); });
      for (i2 = 0; i2 < orden.length; i2++) {
        var st = orden[i2];
        seguro(ctx, 'actor ' + st.quien, function () { dibujarActor(ctx, st, T, X); });
      }
      for (i2 = 0; i2 < orden.length; i2++) {
        var st2 = orden[i2];
        for (var x2 = 0; x2 < st2.extras.length; x2++) {
          var ex = st2.extras[x2];
          seguro(ctx, 'extra ' + ex.tipo, function () { dibujarExtra(ctx, ex, st2, T, X); });
        }
      }
      for (i2 = 0; i2 < plan.efectos.length; i2++) {
        var e3 = plan.efectos[i2];
        if ((!EFECTOS_DETRAS[e3.tipo] || e3.delante) && !EFECTOS_PANTALLA[e3.tipo] && e3.tipo !== 'temblor') dibujarEfecto(ctx, e3, ev, X, cam);
      }
    });

    // ---- 3) PANTALLA: efectos, tinte, viñeta, textos ----
    seguro(ctx, 'pantalla', function () {
      for (var i3 = 0; i3 < plan.efectos.length; i3++) {
        var e4 = plan.efectos[i3];
        if (EFECTOS_PANTALLA[e4.tipo]) dibujarEfectoPantalla(ctx, e4, ev, X, cam);
      }
      if (plan.tinte) { ctx.fillStyle = plan.tinte; ctx.fillRect(0, 0, W, H); }
      if (plan.vineta > 0) {
        var g = ctx.createRadialGradient(480, 190, 250, 480, 190, 640);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (0.45 * plan.vineta) + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      for (var i4 = 0; i4 < plan.textos.length; i4++) {
        var tx = plan.textos[i4];
        seguro(ctx, 'texto', function () { dibujarTexto(ctx, tx, ev, X, cam); });
      }
    });
  }

  // ===========================================================================
  //  DRAW: el plano de la línea lineIdx en el instante lineT (+ transiciones)
  // ===========================================================================
  function draw(ctx, id, lineIdx, lineT, T) {
    var r = REG[id];
    if (!ctx || !r || !r.planos.length) return false;
    lineIdx = Math.max(0, Math.floor(num(lineIdx, 0)));
    lineT = Math.max(0, num(lineT, 0));
    T = num(T, lineT);
    var n = r.planos.length, pi = Math.min(lineIdx, n - 1);
    var plan = r.planos[pi];
    var extra = lineIdx > n - 1;     // más líneas que planos: se mantiene el último
    var tEf = extra ? lineT + 8 * (lineIdx - (n - 1)) : lineT;
    var info = { plan: plan, lineT: tEf, T: T, prev: null, continua: false, who: quienHabla(id, lineIdx) };
    ultimoT[id + '#' + lineIdx] = lineT;
    if (!extra && pi > 0) {
      var prevPlan = r.planos[pi - 1];
      var pt = ultimoT[id + '#' + (pi - 1)];
      info.prev = { plan: prevPlan, t: (typeof pt === 'number') ? pt : 5 };
      info.continua = plan.transicion === 'corte' && plan.continuidad !== false &&
        (plan.continuidad === true || prevPlan.fondo === plan.fondo);
    }
    ctx.save();
    try {
      renderPlano(ctx, info);
      if (!extra) transicion(ctx, info, plan, tEf, T);
    } catch (e) {
      fallo('draw ' + id + ' #' + lineIdx, e);
    }
    ctx.restore();
    return true;
  }

  function transicion(ctx, info, plan, lineT, T) {
    var tr = plan.transicion;
    if (tr === 'fundido' && lineT < T_FUNDIDO) {
      var p = easeInOut(c01(lineT / T_FUNDIDO));
      var cv = info.prev ? lienzo('transicion', W, H) : null;
      if (cv) {
        var c2 = cv.getContext('2d');
        c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, W, H);
        renderPlano(c2, { plan: info.prev.plan, lineT: info.prev.t, T: T, prev: null, continua: false, who: '' });
        ctx.save(); ctx.globalAlpha = 1 - p; ctx.drawImage(cv, 0, 0, W, H); ctx.restore();
      } else {
        ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
    } else if (tr === 'pagina' && lineT < T_PAGINA) {
      var q = easeInOut(c01(lineT / T_PAGINA));
      var ex = lerp(W + 80, -160, q), inc = 70;
      var cv2 = info.prev ? lienzo('transicion', W, H) : null;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex + inc, 0); ctx.lineTo(ex - inc, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
      if (cv2) {
        var c3 = cv2.getContext('2d');
        c3.setTransform(1, 0, 0, 1, 0, 0); c3.clearRect(0, 0, W, H);
        renderPlano(c3, { plan: info.prev.plan, lineT: info.prev.t, T: T, prev: null, continua: false, who: '' });
        ctx.drawImage(cv2, 0, 0, W, H);
      } else { ctx.fillStyle = '#fef3c7'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
      // la hoja que se da la vuelta (reverso del papel) + sombra
      var cw = Math.min(150, (W + 80 - ex) * 0.4);
      ctx.save();
      var gs = ctx.createLinearGradient(ex, 0, ex + cw + 60, 0);
      gs.addColorStop(0, 'rgba(0,0,0,0.35)'); gs.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gs;
      ctx.beginPath(); ctx.moveTo(ex + inc, 0); ctx.lineTo(ex + inc + cw + 60, 0); ctx.lineTo(ex - inc + cw + 60, H); ctx.lineTo(ex - inc, H); ctx.closePath(); ctx.fill();
      var gp = ctx.createLinearGradient(ex, 0, ex + cw, 0);
      gp.addColorStop(0, '#fffbeb'); gp.addColorStop(0.7, '#fde68a'); gp.addColorStop(1, '#d6a95a');
      ctx.fillStyle = gp;
      ctx.beginPath(); ctx.moveTo(ex + inc, 0); ctx.lineTo(ex + inc + cw, 0); ctx.lineTo(ex - inc + cw * 0.8, H); ctx.lineTo(ex - inc, H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
  }

  // ===========================================================================
  //  SONIDOS: los del plano con t en (t0, t1]
  // ===========================================================================
  function sonar(id, lineIdx, t0, t1) {
    try {
      var r = REG[id];
      if (!r || !r.planos.length) return;
      lineIdx = Math.floor(num(lineIdx, 0));
      if (lineIdx > r.planos.length - 1 || lineIdx < 0) return;
      var plan = r.planos[lineIdx];
      t0 = num(t0, -1); t1 = num(t1, 0);
      var tocados = 0;
      for (var i = 0; i < plan.sonidos.length; i++) {
        var s = plan.sonidos[i];
        // solo sonidos que existen (revisar() avisa de los que no) y como mucho 4 a la vez
        if (s.t > t0 && s.t <= t1 && tocados < 4 && SONIDOS.indexOf(s.nombre) >= 0) { sfx(s.nombre); tocados++; }
      }
    } catch (e) { fallo('sonar ' + id, e); }
  }

  // ===========================================================================
  //  REVISAR: lista de problemas de un guion (para los directores y los tests)
  // ===========================================================================
  function revisar(id) {
    var out = [];
    var r = REG[id];
    if (!r) { out.push(id + ': no hay guion registrado'); return out; }
    var lineas = (G.storyData && G.storyData[id]) ? G.storyData[id].length : -1;
    if (lineas < 0) out.push(id + ': la historia no existe en G.storyData');
    if (!r.planos.length) out.push(id + ': no tiene planos');
    if (lineas >= 0 && r.planos.length > lineas) out.push(id + ': tiene ' + r.planos.length + ' planos y solo ' + lineas + ' líneas (sobran planos)');
    r.planos.forEach(function (p, i) {
      var pre = id + ' plano ' + i + ': ';
      var raw = p.raw;
      if (raw.fondo !== undefined && !FONDOS[p.fondo]) out.push(pre + 'fondo desconocido "' + raw.fondo + '"');
      if (raw.suelo !== undefined && raw.suelo !== false && !(raw.suelo in SUELOS)) out.push(pre + 'suelo desconocido "' + raw.suelo + '"');
      if (raw.transicion !== undefined && TRANSICIONES.indexOf(raw.transicion === 'página' ? 'pagina' : raw.transicion) < 0) out.push(pre + 'transición desconocida "' + raw.transicion + '"');
      var keys = {};
      p.actores.forEach(function (a) { keys[a.key] = 1; });
      p.actores.forEach(function (a) {
        if (!CAT[a.quien]) out.push(pre + 'actor desconocido quien:"' + a.raw.quien + '"');
        a.acciones.forEach(function (ac) {
          if (!ACC[ac.tipo]) out.push(pre + a.key + ': acción desconocida "' + (ac.accion || ac.tipo) + '"');
          if (typeof ac.a === 'string' && !keys[ac.a]) out.push(pre + a.key + ': la acción ' + ac.tipo + ' apunta a "' + ac.a + '", que no está en el plano');
          if (typeof ac.en === 'string' && !CAT[normQuien(ac.en)]) out.push(pre + a.key + ': transformar en "' + ac.en + '" no existe');
          if (typeof ac.mirar === 'string' && ['izquierda', 'derecha'].indexOf(ac.mirar) < 0 && !keys[ac.mirar]) out.push(pre + a.key + ': mirar a "' + ac.mirar + '", que no está en el plano');
        });
      });
      if (typeof p.camara.a === 'string' && !keys[p.camara.a]) out.push(pre + 'la cámara sigue a "' + p.camara.a + '", que no está en el plano');
      if (esObj(p.camara.hasta) && typeof p.camara.hasta.a === 'string' && !keys[p.camara.hasta.a]) out.push(pre + 'la cámara (hasta) sigue a "' + p.camara.hasta.a + '", que no está');
      p.efectos.forEach(function (e) {
        if (EFECTOS_LISTA.indexOf(e.tipo) < 0) out.push(pre + 'efecto desconocido "' + e.tipo + '"');
        if (typeof e.a === 'string' && !keys[e.a]) out.push(pre + 'el efecto ' + e.tipo + ' va pegado a "' + e.a + '", que no está');
      });
      p.textos.forEach(function (tx) {
        if (typeof tx.a === 'string' && !keys[tx.a]) out.push(pre + 'el texto "' + tx.texto + '" va pegado a "' + tx.a + '", que no está');
        lista(tx.dibujo || tx.quien).forEach(function (q) { if (!CAT[normQuien(q)]) out.push(pre + 'pensamiento con "' + q + '", que no existe'); });
      });
      lista(raw.textos).forEach(function (tx) { if (esObj(tx) && tx.estilo !== undefined && ESTILOS_TEXTO.indexOf(tx.estilo) < 0) out.push(pre + 'estilo de texto desconocido "' + tx.estilo + '"'); });
      p.sonidos.forEach(function (s) { if (SONIDOS.indexOf(s.nombre) < 0) out.push(pre + 'sonido desconocido "' + s.nombre + '"'); });
    });
    return out;
  }

  G.cine = {
    version: 1,
    SUELO: SUELO, ALTO_ESCENA: ALTO_ESCENA,
    register: register, has: has, planCount: planCount, draw: draw, sonar: sonar, revisar: revisar,
    ids: function () { return Object.keys(REG); },
    errores: errores,
    catalogo: {
      actores: Object.keys(CAT), acciones: ACCIONES_LISTA.slice(), efectos: EFECTOS_LISTA.slice(),
      fondos: Object.keys(FONDOS), suelos: Object.keys(SUELOS), textos: ESTILOS_TEXTO.slice(),
      transiciones: TRANSICIONES.slice(), sonidos: SONIDOS.slice()
    }
  };

  // ===========================================================================
  //  ESCENA cineHoja: hoja de storyboard (todas las líneas en miniatura)
  //  index.html?escena=cineHoja&params={"id":"s_captura"}
  // ===========================================================================
  (function () {
    var id = '', hecha = false, altoHoja = H;
    var COLS = 3, TW = 300, TH = 169, GAP = 15, CAB = 60, PIE = 56, MARGEN = 15;
    var NOMBRES = { director: 'Director America', falcon: 'Lord Falcon', toros: 'Dark Toros', narrador: 'Narrador',
      juanjo: 'Juanjo', papa: 'Papá', secuaz: 'Dark Secuaz',
      mikey: 'Mikey Stark', peter: 'Peter Rogers', robovill: 'Robovill' };   // Parte 3
    function lineas() { var a = G.storyData && G.storyData[id]; return Array.isArray(a) ? a : []; }
    function enter(params) {
      params = params || {};
      id = String(params.id || '');
      hecha = false;
      var n = Math.max(1, lineas().length), filas = Math.ceil(n / COLS);
      altoHoja = Math.max(H, CAB + filas * (TH + PIE + GAP) + 10);
      try {
        if (G.canvas) {
          G.canvas.height = altoHoja;
          if (G.canvas.style) { G.canvas.style.aspectRatio = W + ' / ' + altoHoja; G.canvas.style.maxHeight = 'none'; }
        }
      } catch (e) { /* nada */ }
    }
    function exit() {
      try {
        if (G.canvas) {
          G.canvas.height = H;
          if (G.canvas.style) { G.canvas.style.aspectRatio = ''; G.canvas.style.maxHeight = ''; }
        }
      } catch (e) { /* nada */ }
    }
    function pulsado(a) {
      var p1 = G.input && G.input.pressed ? G.input.pressed(a) : false;
      var p2 = G.input2 && G.input2.pressed ? G.input2.pressed(a) : false;
      return !!p1 || !!p2;
    }
    function update() { if (pulsado('confirm') || pulsado('pause')) G.go('title'); }
    function recortar(ctx, txt, ancho) {
      txt = String(txt);
      if (ctx.measureText(txt).width <= ancho) return txt;
      while (txt.length > 4 && ctx.measureText(txt + '…').width > ancho) txt = txt.slice(0, -1);
      return txt + '…';
    }
    function dibujarHoja(ctx) {
      var ls = lineas();
      ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, altoHoja);
      ctx.font = 'bold 22px ' + FUENTE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fbbf24';
      ctx.fillText('Storyboard · ' + id, MARGEN, 24);
      ctx.font = 'bold 14px ' + FUENTE; ctx.fillStyle = '#94a3b8';
      ctx.fillText(ls.length + ' líneas · ' + planCount(id) + ' planos' + (has(id) ? ' · cada miniatura en lineT = 1,6 s' : ' · SIN guion animado (fondo de siempre)'), MARGEN, 46);
      var off = lienzo('hoja', W, H);
      for (var i = 0; i < ls.length; i++) {
        var col = i % COLS, fila = Math.floor(i / COLS);
        var x = MARGEN + col * (TW + GAP), y = CAB + fila * (TH + PIE + GAP);
        if (off) {
          var c = off.getContext('2d');
          c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
          c.fillStyle = '#0b1020'; c.fillRect(0, 0, W, H);
          var ok = draw(c, id, i, 1.6, 1.6);
          if (!ok) { fondoNegro(c, 1.6); c.font = 'bold 40px ' + FUENTE; c.textAlign = 'center'; c.fillStyle = '#94a3b8'; c.fillText('(sin guion animado)', 480, 172); }
          // el panel de diálogo (lo que tapa en el juego)
          c.fillStyle = 'rgba(20,14,40,0.82)'; rr(c, 24, 354, 912, 168, 20); c.fill();
          c.strokeStyle = 'rgba(253,230,138,0.5)'; c.lineWidth = 4; c.stroke();
          ctx.drawImage(off, x, y, TW, TH);
        }
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.strokeRect(x, y, TW, TH);
        var l = ls[i] || {};
        ctx.font = 'bold 14px ' + FUENTE; ctx.textAlign = 'left'; ctx.fillStyle = '#fde68a';
        ctx.fillText((i + 1) + ' · ' + (NOMBRES[l.who] || l.who || ''), x + 2, y + TH + 14);
        ctx.font = '13px ' + FUENTE; ctx.fillStyle = '#cbd5e1';
        var txt = String(l.text || ''), corte = recortar(ctx, txt, TW - 4);
        ctx.fillText(corte, x + 2, y + TH + 32);
        if (corte.length < txt.length) {
          var resto = txt.slice(Math.max(0, corte.length - 1));
          ctx.fillStyle = '#94a3b8'; ctx.fillText(recortar(ctx, resto, TW - 4), x + 2, y + TH + 48);
        }
      }
    }
    function render(ctx) {
      try {
        var hoja = lienzo('hojaCompleta', W, altoHoja);
        if (hoja) {
          if (!hecha) { var hc = hoja.getContext('2d'); hc.setTransform(1, 0, 0, 1, 0, 0); dibujarHoja(hc); hecha = true; }
          ctx.drawImage(hoja, 0, 0);
        } else dibujarHoja(ctx);
      } catch (e) { fallo('cineHoja', e); }
    }
    G.scenes = G.scenes || {};
    G.scenes.cineHoja = { enter: enter, exit: exit, update: update, render: render };
  })();
})();
