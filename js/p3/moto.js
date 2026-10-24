// moto.js — PARTE 3, capítulo 2: "Túneles bajo tierra" (G.scenes.levelP3_2).
// Dueño: moto (contrato técnico de la Parte 3, §11.2, §6.1, §18.1).
//
// Persecución lateral con avance automático (≈ 95 s de recorrido a 340 px/s),
// basada en js/p2/carrera.js (desplazamiento del mundo, salto con búfer y coyote,
// huecos con muelle de rescate, barra de progreso, atajo saltarA) y en el K.O.
// en co-op de js/p2/vuelo.js (KO_TIME = 4, KO_RESPAWN_HP = 6, KO_INVULN = 2).
//
//  1) INTRO (3 s): "¡Robot-moto hackeada! ¡Arranca, Mikey!": la robot-moto pasa
//     de modo robot a modo moto (sfx transform).
//  2) CARRERA: Jugador 1 = Mikey en la ROBOT-MOTO (P2.fn.robotMoto, look.moto):
//       izquierda/derecha adelantan o frenan (x ∈ [110, 640]); jump/up = salto alto;
//       attack = disparar el lanzador; shoot = cambiar de lanzador (§6.1).
//     Jugador 2 (o IA) = el Director en su ROBOT TRANSFORMABLE (transformableCoche):
//       attack = TURBO (1,5 s invulnerable, rompe barricadas); shoot = cañón cian.
//     Obstáculos con aviso: barricadas, huecos (muelle de rescate), robots
//     boxeadores, rampas, corazones, rocas que caen (sombra 1,0 s), ondas de
//     mini-robots (2 ondas densas para la metralleta), 3 compuertas con diana
//     (solo el francotirador, desde lejos: premio) y Robovill excavando
//     (20, 45, 70 y 88 s: "!" 1,5 s en el suelo y se abre un hueco o caen rocas).
//     Puntos de control a los 32 y 64 s.
//  3) FINAL: frenan en una caverna enorme; la silueta de la Gran Excavadora y
//     "¡La Gran Excavadora! ¡Hay que fusionarse!" → levelP3_2f {nuevo: true}.
//
// Atajos de prueba (§18.1): enter({saltarA: s}), enter({nuevo: true}),
// G.p3.debugInvulnerable, y __debug = {phase(), route(), finalTime: 95, heroes()}.
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  G.scenes = G.scenes || {};

  // ---------------------------------------------------------------------------
  //  Constantes (contrato §11.2)
  // ---------------------------------------------------------------------------
  var W = 960, H = 540;
  var GROUND = 456;               // línea donde apoyan las ruedas
  var CEIL = 64;                  // techo del túnel
  var SPEED = 340;                // avance normal (px/s)
  var GOAL_AT = 95;               // segundos de recorrido hasta la caverna
  var GOAL_WX = GOAL_AT * SPEED;
  var CHECKPOINTS = [32, 64];
  var LOOK = W + 120;             // un obstáculo con `at` entra en pantalla en ese segundo
  var INTRO_TIME = 3.0;
  var FINAL_TEXT_AT = 0.7, FINAL_TEXT_TIME = 2.5;
  var GRAV = 1800, JUMP_V = -840, RAMP_V = -980, TURBO_RAMP_V = -1060;
  var JUMP_BUF = 0.14, COYOTE = 0.1;
  var MOTO_MIN_X = 110, MOTO_MAX_X = 640, CAR_MIN_X = 80, CAR_MAX_X = 600;
  var MOVE_V = 300;
  var INVULN = 1.2;
  var KO_TIME = 4, KO_RESPAWN_HP = 6, KO_INVULN = 2;
  var TURBO_TIME = 1.5, TURBO_CD = 3, TURBO_PUSH = 240;
  var CANNON_CD = 0.28, AI_CANNON_CD = 0.5, CANNON_V = 780, CANNON_RANGE = 620;
  var GAP_MARGIN = 26;            // el centro tiene que entrar 26 px en el hueco para caer
  var BOOST_TIME = 2.2, BOOST_MULT = 1.45;   // premio "rampa de turbo"
  var MOTO_ALTO = 84;             // alto deseado de la moto en pantalla (modo moto)
  var CAR_S = 0.95;
  var DRILL_DANO_H = 140;         // alto dañino del taladro del suelo (el salto llega a ~196)
  var ROBO_Y = 330;               // pies del Robovill de fondo (sobre su montón de escombros)
  var DIANA_LEJOS = 420;          // la diana vale desde más de 420 px (§11.2)...
  // ...pero con la moto adelantada la diana no se ve a 420 px (pantalla de 960):
  // la distancia pedida baja para que siempre haya ≈ DIANA_VENTANA px de recorrido
  // con la diana a la vista y el disparo válido (QA: con 420 fijos, moto.x ≥ 540
  // nunca podía). Nunca menos de DIANA_MIN: sigue siendo un tiro «de lejos».
  var DIANA_VENTANA = 380, DIANA_MIN = 150;
  function dianaLejos(mx) { return Math.max(DIANA_MIN, Math.min(DIANA_LEJOS, W - mx - DIANA_VENTANA)); }

  // Alto del arte a escala 1 (contrato §16.4) por si datos-arte3.js faltara.
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };

  // Los 3 lanzadores de Mikey (contrato §6.1; alcance en px de pantalla).
  var LANZ = {
    francotirador: { v: 900, alcance: 640, dmg: 2, cd: 0.9, max: 1, atraviesa: 2, nombre: '¡Francotirador!' },
    pistola: { v: 560, alcance: 420, dmg: 1, cd: 0.30, max: 3, atraviesa: 1, aturde: 0.2, nombre: '¡Pistola!' },
    metralleta: { v: 640, alcance: 300, dmg: 0.5, cd: 0.12, max: 6, atraviesa: 1, disp: 0.06, nombre: '¡Metralleta!' }
  };
  var ORDEN = ['francotirador', 'pistola', 'metralleta'];

  // ---------------------------------------------------------------------------
  //  Recorrido (pensado a mano). `at` = segundo de recorrido en que el objeto
  //  entra por la derecha; llega a la moto ≈ 2,3 s después.
  // ---------------------------------------------------------------------------
  var RUTA = [
    { k: 'barricada', at: 3 }, { k: 'hueco', at: 5.5, w: 160 }, { k: 'boxeador', at: 8 },
    { k: 'rampa', at: 11 }, { k: 'corazon', at: 11.9, h: 240 },
    // la 1.ª diana entra cuando la moto ya ha aterrizado de la rampa (enseña el francotirador)
    { k: 'compuerta', at: 14.8, premio: 'corazon' },
    { k: 'barricada', at: 16.4 },
    { k: 'boxeador', at: 22.6 }, { k: 'hueco', at: 24.5, w: 200 },
    { k: 'corazon', at: 29.5, h: 40 },
    { k: 'barricada', at: 33 }, { k: 'barricada', at: 34.3 },
    { k: 'compuerta', at: 42, premio: 'turbo' },
    { k: 'boxeador', at: 47.5 }, { k: 'hueco', at: 49.5, w: 220 },
    { k: 'rampa', at: 51.4 }, { k: 'corazon', at: 52.3, h: 250 },
    { k: 'barricada', at: 57.5 }, { k: 'hueco', at: 60, w: 180 }, { k: 'corazon', at: 62, h: 40 },
    { k: 'boxeador', at: 65.5 }, { k: 'barricada', at: 67 },
    { k: 'compuerta', at: 72, premio: 'rocas' },
    { k: 'hueco', at: 82.5, w: 240 }, { k: 'barricada', at: 84.5 },
    { k: 'rampa', at: 89.6 }, { k: 'corazon', at: 90.5, h: 250 }, { k: 'boxeador', at: 92 }
  ];
  // Sucesos por tiempo de recorrido (ondas de mini-robots, rocas y Robovill).
  var SUCESOS = [
    { k: 'onda', at: 10, n: 3 },
    { k: 'taladro', at: 20, tipo: 'hueco' },
    { k: 'rocas', at: 27, xs: [700, 860] },
    { k: 'onda', at: 29.5, n: 4 },
    { k: 'onda', at: 36, n: 7, densa: true },
    { k: 'taladro', at: 45, tipo: 'rocas' },
    { k: 'rocas', at: 54, xs: [640, 800, 960] },
    { k: 'onda', at: 56, n: 4 },
    { k: 'taladro', at: 68.5, tipo: 'hueco' },   // su hueco llega antes de la 3.ª diana
    { k: 'rocas', at: 75.5, xs: [600, 730, 860, 990, 1120], parable: true },
    { k: 'onda', at: 78.5, n: 8, densa: true },
    { k: 'taladro', at: 88, tipo: 'rocas' }
  ];
  var AVISOS = { barricada: '¡Barricada!', hueco: '¡Hueco!', rampa: '¡Rampa!', boxeador: '¡Robot!', compuerta: '¡Diana!' };
  var PREMIO_TXT = { corazon: '¡Un corazón!', turbo: '¡Rampa de turbo!', rocas: '¡Rocas paradas!' };

  // ---------------------------------------------------------------------------
  //  Utilidades seguras
  // ---------------------------------------------------------------------------
  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* nada */ } }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) { /* nada */ } }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function art() {
    var P2 = window.P2;
    if (!P2 || typeof P2.call !== 'function') return false;
    try { return P2.call.apply(P2, arguments); } catch (e) { return false; }
  }
  function gfx(name) {
    var g = G.gfx;
    if (!g || typeof g[name] !== 'function') return false;
    try { g[name].apply(g, Array.prototype.slice.call(arguments, 1)); return true; } catch (e) { return false; }
  }
  function altoArte(n) {
    var P2 = window.P2;
    var v = P2 && P2.P3ALTO && P2.P3ALTO[n];
    return (typeof v === 'number' && v > 0) ? v : (ALTO_POR_DEFECTO[n] || 100);
  }
  function lookOf(k) { var l = (G.p3 && G.p3.look) || {}; return l[k] === 'B' ? 'B' : 'A'; }
  function inv() { return !!(G.p3 && G.p3.debugInvulnerable); }
  function tk(texto, j) {
    try { if (typeof G.p3conTeclas === 'function') return G.p3conTeclas(texto, j); } catch (e) { /* nada */ }
    return String(texto).replace(/\{ataque\}/g, 'ATAQUE').replace(/\{disparo\}/g, 'DISPARO')
      .replace(/\{hack\}/g, 'HACK').replace(/\{cambio\}/g, 'CAMBIO').replace(/\{salto\}/g, 'SALTO');
  }
  function teclaIzq() { return coop ? 'A' : '←'; }   // Mikey es el jugador 1
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function circleRect(cx, cy, r, b) {
    var nx = clamp(cx, b.x, b.x + b.w), ny = clamp(cy, b.y, b.y + b.h);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }
  function rrect(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function label(c, txt, x, y, size, col, align) {
    c.save();
    c.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    c.textAlign = align || 'center'; c.textBaseline = 'alphabetic';
    c.lineJoin = 'round'; c.miterLimit = 2; c.lineWidth = Math.max(3, size * 0.28);
    c.strokeStyle = '#1a1a2e'; c.strokeText(txt, x, y);
    c.fillStyle = col || '#fef3c7'; c.fillText(txt, x, y);
    c.restore();
  }
  function bubble(c, text, x, y) {
    c.save();
    c.font = 'bold 17px system-ui, "Segoe UI", Arial, sans-serif';
    var w = c.measureText(text).width + 24, h = 32;
    var bx = clamp(x - w / 2, 8, W - w - 8), by = y - h - 12;
    c.fillStyle = '#fffbeb'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    rrect(c, bx, by, w, h, 12); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 7, by + h - 1); c.lineTo(x, by + h + 10); c.lineTo(x + 7, by + h - 1);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1a1a2e'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, bx + w / 2, by + h / 2 + 1);
    c.restore();
  }
  var NO_INPUT = { held: function () { return false; }, pressed: function () { return false; } };
  function inputOf(v) {
    if (!v || v.isAI) return NO_INPUT;
    if (v.jugador === 2) return (coop && G.input2) ? G.input2 : NO_INPUT;
    return G.input || NO_INPUT;
  }
  function wxAt(at) { return at * SPEED + LOOK; }
  function hash(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  // ---------------------------------------------------------------------------
  //  Estado de la escena
  // ---------------------------------------------------------------------------
  var memoria = null;            // reintento (sobrevive a exit(): §8.2, §9.6)
  var coop = false, motoS = 1, carVar = 'A';
  var phase = 'intro', t = 0, raceT = 0, phaseT = 0, scroll = 0, speedNow = 0;
  var moto, car, vehicles;
  var world = [], sucIdx = 0, lastCP = 0, cpDone = [];
  var balls = [], cannons = [], minis = [], waves = [], rocks = [], drills = [];
  var parts = [], texts = [], explos = [], says = [];
  var shake = 0, flash = 0, bannerT = 0, speedBoost = 0;
  var hint = null, seen = {}, dianaTipT = 0, notaT = 0;   // notaT: segundos de carrera (nota del co-op)
  var robo = null;               // Robovill excavando de fondo
  var finalT = 0, loseT = 0, endGo = false, exca = null;
  var introStage = 'robot';

  // ---------------------------------------------------------------------------
  //  Vehículos
  // ---------------------------------------------------------------------------
  function makeVeh(kind, jugador, isAI, x) {
    return {
      kind: kind, jugador: jugador, isAI: isAI, hpKey: jugador === 2 ? 'hp2' : 'hp',
      x: x, y: GROUND, vx: 0, vy: 0, onGround: true, coyote: 0, jumpBuf: 0, falling: false,
      tilt: 0, invuln: 0, bump: 0, ko: false, koT: 0,
      turbo: 0, turboCd: 0, cd: 0, aiCd: 0.6, flashT: 0,
      lanzador: 'pistola', swapT: 0, poseT: 0, sayT: 0, say: ''
    };
  }
  function carDims() {
    return carVar === 'B' ? { w: 104 * CAR_S, h: 92 * CAR_S, gun: 60 * CAR_S }
                          : { w: 104 * CAR_S, h: 46 * CAR_S, gun: 22 * CAR_S };
  }
  function vbox(v) {
    if (v.kind === 'moto') return { x: v.x - 50, y: v.y - 60, w: 100, h: 56 };
    var d = carDims();
    return { x: v.x - d.w * 0.42, y: v.y - d.h, w: d.w * 0.84, h: d.h };
  }
  function muzzle(v) {
    if (v.kind === 'moto') {
      var cs = Math.cos(v.tilt), sn = Math.sin(v.tilt);
      var lx = 58 * motoS, ly = -68 * motoS;
      return { x: v.x + lx * cs - ly * sn, y: v.y + lx * sn + ly * cs };
    }
    var d = carDims();
    return { x: v.x + d.w * 0.55, y: v.y - d.gun };
  }
  function front(v) { return v.kind === 'moto' ? v.x + 52 : v.x + carDims().w * 0.42; }

  // ---------------------------------------------------------------------------
  //  Construcción y reinicio
  // ---------------------------------------------------------------------------
  function buildWorld(fromScroll) {
    world = [];
    var nComp = 0;
    for (var i = 0; i < RUTA.length; i++) {
      var s = RUTA[i], wx = wxAt(s.at), o = null;
      if (s.k === 'barricada') o = { k: 'barricada', wx: wx, w: 54, h: 62, hp: 3 };
      else if (s.k === 'hueco') o = { k: 'hueco', wx: wx, w: s.w || 180 };
      else if (s.k === 'rampa') o = { k: 'rampa', wx: wx, w: 132, h: 46 };
      else if (s.k === 'boxeador') o = { k: 'boxeador', wx: wx, w: 40, hp: 2, st: 'walk', tm: 0, stun: 0 };
      else if (s.k === 'corazon') o = { k: 'corazon', wx: wx, h: s.h || 40, w: 30 };
      else if (s.k === 'compuerta') o = { k: 'compuerta', wx: wx, w: 66, h: 40, premio: s.premio, abierta: false, abT: 0, n: nComp++, clincT: 0 };
      if (!o) continue;
      o.alive = true;
      if (fromScroll > 0 && o.wx + (o.w || 0) < fromScroll + W * 0.8) continue;
      world.push(o);
    }
    for (var c = 0; c < CHECKPOINTS.length; c++) {
      var cwx = CHECKPOINTS[c] * SPEED + 320;
      if (cwx > fromScroll + 40) world.push({ k: 'control', wx: cwx, w: 20, alive: true, cp: c });
    }
  }

  function resetAll(params) {
    params = params || {};
    coop = !!(G.state && G.state.coop);
    carVar = (G.p2 && G.p2.vehicle && G.p2.vehicle.transformable === 'B') ? 'B' : 'A';
    motoS = MOTO_ALTO / altoArte('robotMotoMoto');
    if (!(motoS > 0.3 && motoS < 3)) motoS = 1;
    if (G.state) {
      G.state.hp = G.state.maxHp || 10;
      if (coop) { G.state.maxHp2 = G.state.maxHp2 || G.state.maxHp || 10; G.state.hp2 = G.state.maxHp2; }
    }
    t = 0; raceT = 0; phaseT = 0; scroll = 0; speedNow = 0;
    balls = []; cannons = []; minis = []; waves = []; rocks = []; drills = [];
    parts = []; texts = []; explos = []; says = [];
    shake = 0; flash = 0; bannerT = 0; speedBoost = 0;
    hint = null; seen = {}; dianaTipT = 0; notaT = 0;
    finalT = 0; loseT = 0; endGo = false; exca = null;
    moto = makeVeh('moto', 1, false, 320);
    car = makeVeh('coche', coop ? 2 : 0, !coop, 170);
    vehicles = [car, moto];          // el coche se dibuja detrás
    robo = { on: true, x: 880, y: 300, y0: 300, tm: 0, dur: 99, modo: 'intro', taladro: 0 };
    introStage = 'robot';

    var skip = (typeof params.saltarA === 'number' && isFinite(params.saltarA)) ? params.saltarA : null;
    if (skip === null && !params.nuevo && memoria) skip = memoria.at;
    memoria = null;
    lastCP = 0; cpDone = [];
    if (skip !== null) {
      skip = clamp(skip, 0, GOAL_AT - 1);
      phase = 'carrera';
      scroll = skip * SPEED;
      speedNow = SPEED;
      raceT = skip;
      bannerT = 2;
      robo = null;
      for (var c = 0; c < CHECKPOINTS.length; c++) if (CHECKPOINTS[c] <= skip + 0.01) { cpDone[c] = true; lastCP = CHECKPOINTS[c]; }
      showHint(tk('¡Salta con {salto}, dispara con {ataque} y cambia de lanzador con {disparo}!', 1), 3.5);
    } else {
      phase = 'intro';
    }
    buildWorld(scroll);
    sucIdx = 0;
    while (sucIdx < SUCESOS.length && SUCESOS[sucIdx].at * SPEED < scroll - 1) sucIdx++;
  }

  // ---------------------------------------------------------------------------
  //  Efectos
  // ---------------------------------------------------------------------------
  function addText(txt, x, y, col, life, size) {
    texts.push({ txt: txt, x: x, y: y, col: col || '#fde047', life: life || 1.1, max: life || 1.1, size: size || 22 });
  }
  function pop(x, y, big) {
    explos.push({ x: x, y: y, life: 0.45, max: 0.45, r: big ? 40 : 26 });
    for (var i = 0; i < (big ? 12 : 8); i++) {
      var a = rand(0, Math.PI * 2), v = rand(90, 260);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: rand(0.4, 0.8), max: 0.8,
                   kind: i % 3 === 0 ? 'bolt' : 'spark', col: i % 2 ? '#fde047' : '#fb923c', r: rand(2, 4) });
    }
    shake = Math.max(shake, big ? 7 : 4);
  }
  function sparkles(x, y, n, col) {
    for (var i = 0; i < n; i++) {
      parts.push({ x: x + rand(-20, 20), y: y + rand(-20, 20), vx: rand(-60, 60), vy: rand(-120, -20),
                   life: rand(0.5, 1), max: 1, kind: 'star', col: col || '#fde047', r: rand(2, 4) });
    }
  }
  function dust(x, y, n) {
    for (var i = 0; i < (n || 6); i++) {
      parts.push({ x: x + rand(-40, 40), y: y - 4, vx: rand(-140, 40), vy: rand(-90, -20), life: 0.55, max: 0.55, kind: 'smoke', col: '#a8957f', r: rand(5, 9) });
    }
  }
  function chip(x, y, col) {
    for (var i = 0; i < 4; i++) parts.push({ x: x, y: y, vx: rand(-160, 40), vy: rand(-160, -30), life: 0.35, max: 0.35, kind: 'spark', col: col || '#93c5fd', r: 2.5 });
  }
  function maybeHeart(sx, sy) {
    if (Math.random() < 0.25) world.push({ k: 'corazon', wx: scroll + sx, h: clamp(GROUND - sy, 34, 300), w: 30, alive: true, vy: 0, drop: true });
  }
  function showHint(txt, dur) { hint = { txt: txt, life: dur || 3.2 }; }
  function say(v, txt, dur) { v.say = txt; v.sayT = dur || 1.8; }

  // ---------------------------------------------------------------------------
  //  Daño, K.O. y curación (cada vehículo es de su jugador: §11.2)
  // ---------------------------------------------------------------------------
  function hurt(v, dmg) {
    if (phase !== 'carrera' || !v || v.ko) return false;
    if (v.invuln > 0 || v.turbo > 0 || speedBoost > 0) return false;
    if (v.isAI) { v.bump = 0.6; return false; }
    if (inv() || !G.state) { v.invuln = 0.3; return false; }
    G.state[v.hpKey] = Math.max(0, (G.state[v.hpKey] || 0) - (dmg || 1));
    v.invuln = INVULN;
    flash = 0.25; shake = Math.max(shake, 7);
    sfx('hurt');
    if ((G.state[v.hpKey] || 0) <= 0) {
      if (!coop) { startLose(); }
      else knockOut(v);
    }
    return true;
  }
  function knockOut(v) {
    v.ko = true; v.koT = KO_TIME; v.invuln = 0; v.turbo = 0; v.falling = false;
    pop(v.x, v.y - 30, true);
    sfx('explosion');
    shake = Math.max(shake, 6);
    if (moto.ko && car.ko) startLose();
  }
  function respawn(v) {
    v.ko = false; v.koT = 0;
    if (G.state) G.state[v.hpKey] = KO_RESPAWN_HP;
    v.invuln = KO_INVULN; v.falling = false; v.y = GROUND; v.vy = 0; v.onGround = true;
    sparkles(v.x, v.y - 40, 12, v.kind === 'moto' ? '#fdba74' : '#93c5fd');
    addText('¡De vuelta!', v.x, v.y - 100, '#86efac', 1.1);
    sfx('checkpoint');
  }
  function startLose() {
    if (phase === 'lose') return;
    phase = 'lose'; loseT = 0;
    memoria = { at: lastCP };
    sfx('explosion'); pop(moto.x, moto.y - 30, true);
  }
  function heal(v, n) {
    if (!G.state) return;
    var key = (v && !v.isAI) ? v.hpKey : 'hp';
    var mx = key === 'hp2' ? (G.state.maxHp2 || 10) : (G.state.maxHp || 10);
    G.state[key] = Math.min(mx, (G.state[key] || 0) + n);
  }

  // ---------------------------------------------------------------------------
  //  INTRO
  // ---------------------------------------------------------------------------
  function updateIntro(dt) {
    phaseT += dt;
    robo.tm += dt;
    robo.x += (760 - robo.x) * Math.min(1, dt * 0.8);
    robo.taladro = (robo.taladro + dt * 3) % 1;
    if (Math.random() < 0.3) dust(robo.x + rand(-30, 30), 330, 1);
    if (introStage === 'robot' && phaseT >= 1.0) {
      introStage = 'transform'; sfx('transform');
    }
    if (introStage === 'transform' && phaseT >= 1.35 && phaseT - dt < 1.35) {
      sparkles(moto.x, GROUND - 60, 18, '#fdba74'); shake = 5;
    }
    if (introStage === 'transform' && phaseT >= 1.7) {
      introStage = 'moto'; sfx('boost');
      say(car, '¡Te sigo, Mikey!', 1.6);
    }
    if (introStage === 'moto' && Math.random() < 0.5) {
      parts.push({ x: moto.x - 70, y: GROUND - rand(16, 34), vx: rand(-260, -160), vy: rand(-20, 10), life: 0.35, max: 0.35, kind: 'smoke', col: '#cbd5e1', r: rand(4, 7) });
    }
    if (phaseT >= INTRO_TIME) {
      phase = 'carrera'; phaseT = 0; raceT = 0; speedNow = SPEED; bannerT = 2.2;
      robo.modo = 'irse'; robo.tm = 0;
      showHint(tk('¡Salta con {salto}, dispara con {ataque} y cambia de lanzador con {disparo}!', 1), 4.5);
    }
  }

  // ---------------------------------------------------------------------------
  //  CARRERA: vehículos
  // ---------------------------------------------------------------------------
  function overGap(wxCenter) {
    for (var i = 0; i < world.length; i++) {
      var o = world[i];
      if (o.k === 'hueco' && wxCenter > o.wx + GAP_MARGIN && wxCenter < o.wx + o.w - GAP_MARGIN) return true;
    }
    return false;
  }
  function hazardAhead(v, from, to) {
    var f = front(v);
    for (var i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive) continue;
      if (o.k !== 'hueco' && o.k !== 'barricada' && o.k !== 'boxeador' && !(o.k === 'compuerta' && !o.abierta)) continue;
      var d = (o.wx - scroll) - f;
      if (d > from && d < to) return true;
    }
    for (var j = 0; j < drills.length; j++) {
      var dr = drills[j];
      if (dr.tipo !== 'hueco' || dr.st === 'hecho') continue;
      var dd = (dr.wx - dr.w / 2 - scroll) - f;
      if (dd > from && dd < to) return true;
    }
    return false;
  }

  function updateVehicle(v, dt) {
    var a = inputOf(v);
    if (v.sayT > 0) v.sayT -= dt;
    if (v.swapT > 0) v.swapT -= dt;
    if (v.poseT > 0) v.poseT -= dt;
    if (v.flashT > 0) v.flashT -= dt;
    if (v.bump > 0) v.bump -= dt;
    if (v.cd > 0) v.cd -= dt;
    if (v.invuln > 0) v.invuln -= dt;

    // --- averiado (co-op): rueda al fondo, parpadea y no dispara ---
    if (v.ko) {
      v.koT -= dt;
      v.x += ((v.kind === 'moto' ? 130 : 95) - v.x) * Math.min(1, dt * 2);
      v.y = GROUND; v.vy = 0; v.onGround = true; v.falling = false;
      v.tilt += (0 - v.tilt) * Math.min(1, dt * 8);
      if (Math.random() < 0.4) parts.push({ x: v.x + rand(-20, 20), y: v.y - 40, vx: rand(-80, -30), vy: rand(-70, -30), life: 0.7, max: 0.7, kind: 'smoke', col: '#64748b', r: rand(5, 9) });
      if (v.koT <= 0) respawn(v);
      return;
    }

    // --- horizontal ---
    var minX = v.kind === 'moto' ? MOTO_MIN_X : CAR_MIN_X, maxX = v.kind === 'moto' ? MOTO_MAX_X : CAR_MAX_X;
    var target = 0;
    if (v.isAI) {
      var lead = moto.ko ? 330 : moto.x - 150;
      target = clamp((clamp(lead, minX, maxX) - v.x) * 3, -MOVE_V, MOVE_V);
    } else {
      if (a.held('left')) target -= MOVE_V;
      if (a.held('right')) target += MOVE_V;
    }
    if (v.turbo > 0) target += TURBO_PUSH;
    v.vx += (target - v.vx) * Math.min(1, dt * 8);
    v.x = clamp(v.x + v.vx * dt, minX, maxX + (v.turbo > 0 ? 80 : 0));
    if (v.turbo <= 0 && v.x > maxX) v.x += (maxX - v.x) * Math.min(1, dt * 4);

    // --- salto (búfer y coyote generosos) ---
    if (v.isAI) {
      if (v.onGround && hazardAhead(v, -10, 70)) v.jumpBuf = JUMP_BUF;
    } else if (a.pressed('jump') || a.pressed('up')) v.jumpBuf = JUMP_BUF;
    if (v.jumpBuf > 0) v.jumpBuf -= dt;
    if (v.coyote > 0) v.coyote -= dt;
    if (v.jumpBuf > 0 && (v.onGround || v.coyote > 0) && !v.falling) {
      v.vy = JUMP_V; v.onGround = false; v.coyote = 0; v.jumpBuf = 0;
      sfx('jump');
    }

    // --- armas ---
    if (v.kind === 'moto') updateLaunchers(v, a);
    else updateCarWeapons(v, a, dt);

    // --- vertical, huecos y muelle de rescate (como carrera.js) ---
    var wasGround = v.onGround;
    v.vy += GRAV * dt;
    v.y += v.vy * dt;
    var bx = vbox(v);
    if (bx.y < CEIL + 6) { v.y += (CEIL + 6 - bx.y); if (v.vy < 0) v.vy = 40; }
    var gap = !v.isAI && overGap(scroll + v.x);
    if (!gap && !v.falling) {
      if (v.y >= GROUND) {
        if (!wasGround && v.vy > 300) { shake = Math.max(shake, 3); dust(v.x, GROUND, 5); }
        v.y = GROUND; v.vy = 0; v.onGround = true; v.coyote = COYOTE;
      } else v.onGround = false;
    } else {
      if (v.onGround && gap) { v.onGround = false; v.coyote = COYOTE; }
      if (v.y > GROUND + 4 && gap) v.falling = true;
      if (v.y > GROUND + 70) {
        v.vy = -980; v.falling = false;
        if (hurt(v, 1)) addText('¡Boing!', v.x, GROUND - 40, '#fca5a5', 0.9);
        else addText('¡Boing!', v.x, GROUND - 40, '#fde047', 0.9);
        sfx('jump');
      }
      if (!gap && v.y >= GROUND && v.vy >= 0) { v.falling = false; v.y = GROUND; v.vy = 0; v.onGround = true; }
    }
    var tilt = v.onGround ? 0 : clamp(v.vy * 0.00028, -0.22, 0.22);
    v.tilt += (tilt - v.tilt) * Math.min(1, dt * 10);
  }

  // --- Mikey: los 3 lanzadores (§6.1) ---
  function ballsOf(tipo) { var n = 0; for (var i = 0; i < balls.length; i++) if (balls[i].tipo === tipo) n++; return n; }
  function updateLaunchers(v, a) {
    if (a.pressed('shoot')) {
      var i = ORDEN.indexOf(v.lanzador);
      v.lanzador = ORDEN[(i + 1) % ORDEN.length];
      v.swapT = 0.6; v.cd = Math.min(v.cd, 0.1);
      sfx('launcherSwap');
    }
    var L = LANZ[v.lanzador] || LANZ.pistola;
    var quiere = v.lanzador === 'metralleta' ? a.held('attack') : a.pressed('attack');
    if (quiere && v.cd <= 0 && ballsOf(v.lanzador) < L.max) fireBall(v, L);
  }
  var lastMetraSfx = 0;
  function fireBall(v, L) {
    var m = muzzle(v);
    // siempre en horizontal (§11.2), aunque la moto vaya inclinada en un salto
    var ang = L.disp ? rand(-L.disp, L.disp) : 0;
    balls.push({ x: m.x, y: m.y, vx: Math.cos(ang) * L.v, vy: Math.sin(ang) * L.v, tipo: v.lanzador, dmg: L.dmg,
                 viaje: 0, alcance: L.alcance, quedan: L.atraviesa, golpes: [], scroll0: scroll, mx0: v.x, t0: t });
    v.cd = L.cd; v.poseT = 0.22; v.flashT = 0.08;
    if (v.lanzador === 'francotirador') sfx('sniper');
    else if (v.lanzador === 'pistola' || t - lastMetraSfx >= 0.1) { sfx('blaster'); lastMetraSfx = t; }
  }

  // --- El Director: TURBO y cañón cian ---
  function updateCarWeapons(v, a, dt) {
    if (v.turboCd > 0) v.turboCd -= dt;
    if (v.turbo > 0) {
      v.turbo -= dt;
      if (v.turbo <= 0) { v.turbo = 0; v.turboCd = TURBO_CD; }
      if (Math.random() < 0.6) parts.push({ x: v.x - 60, y: v.y - rand(8, 36), vx: rand(-420, -260), vy: rand(-20, 20), life: 0.3, max: 0.3, kind: 'line', col: '#a5f3fc', r: 2 });
    } else if (!v.isAI && a.pressed('attack') && v.turboCd <= 0) {
      v.turbo = TURBO_TIME;
      sfx('boost');
      addText('¡TURBO!', v.x, v.y - 80, '#67e8f9', 0.8);
    }
    if (v.isAI) {
      if (v.aiCd > 0) v.aiCd -= dt;
      if (v.aiCd <= 0) {
        if (aiTarget(v)) { fireCannon(v); v.aiCd = AI_CANNON_CD; }
        else v.aiCd = 0.15;
      }
    } else if (a.held('shoot') && v.cd <= 0) {
      fireCannon(v); v.cd = CANNON_CD;
    }
  }
  function fireCannon(v) {
    var m = muzzle(v);
    cannons.push({ x: m.x, y: m.y, vx: CANNON_V, viaje: 0 });
    v.flashT = 0.08;
    sfx('laser');
  }
  function aiTarget(v) {
    var m = muzzle(v), i;
    for (i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive || (o.k !== 'barricada' && o.k !== 'boxeador')) continue;
      var sx = o.wx - scroll;
      if (sx > m.x && sx - m.x < 560) return true;
    }
    for (i = 0; i < minis.length; i++) {
      var r = minis[i];
      // las ondas densas son el momento de la metralleta de Mikey (§11.2 (b)):
      // la IA no las persigue (si no, su cañón las limpiaba y daba igual el lanzador)
      if (r.alive && !r.w.densa && r.x > m.x && r.x - m.x < 560 && Math.abs(r.y - m.y) < 26) return true;
    }
    for (i = 0; i < rocks.length; i++) {
      var k = rocks[i];
      if (k.st === 'cae' && Math.abs((k.wx - scroll) - m.x - 120) < 140) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  //  CARRERA: sucesos (ondas, rocas, Robovill)
  // ---------------------------------------------------------------------------
  function runSucesos() {
    while (sucIdx < SUCESOS.length && scroll >= SUCESOS[sucIdx].at * SPEED) {
      var ev = SUCESOS[sucIdx++];
      if (ev.k === 'onda') spawnWave(ev.n || 3, !!ev.densa);
      else if (ev.k === 'rocas') spawnRocks(ev.xs || [760], !!ev.parable);
      else if (ev.k === 'taladro') startDrill(ev.tipo);
    }
  }
  function spawnWave(n, densa) {
    // La onda densa (§11.2 (b)) llega de golpe y se abre en abanico ALREDEDOR de
    // la línea del cañón de la moto (pies − 68·motoS, como muzzle()), por arriba
    // y por abajo, dentro del alcance de la metralleta (300 px). La bola recta de
    // la pistola solo
    // alcanza a los del medio; la ráfaga de la metralleta, que se abre y barre
    // más alto (hitFlying), llega a todos. Y se lanzan de dos en dos (uno de
    // arriba y otro de abajo): la pistola no da abasto (QA ronda 2: con la onda
    // plana, la pistola los derribaba a todos y la metralleta no ganaba nada).
    var w = { n: n, densa: densa, ax: W + 120, ay: densa ? GROUND - 68 * motoS : 372, t: 0, next: densa ? 1.5 : 1.8, vida: densa ? 12 : 10, sale: false };
    waves.push(w);
    for (var i = 0; i < n; i++) {
      var u = n > 1 ? i / (n - 1) : 0.5;
      var ang = (u - 0.5) * (densa ? 2.4 : 1.7);
      var sy = Math.sin(ang) * (densa ? 40 : 60);
      minis.push({ w: w, i: i, sx: densa ? 90 - 90 * Math.cos(ang) : 150 - 150 * Math.cos(ang), sy: sy,
                   // la densa entra en bloque, cada uno ya en su fila del abanico
                   x: densa ? W + 60 + i * 12 : W + 80 + i * 30, y: densa ? w.ay + sy : w.ay + rand(-40, 40),
                   st: 'llega', tm: 0, hp: 1, alive: true, stun: 0,
                   vx: 0, vy: 0, fase: rand(0, 6), facing: -1 });
    }
    sfx('miniRobot');
    if (densa && !seen.densa) {
      seen.densa = true;
      showHint(tk('¡La metralleta es perfecta para los grupos! Pulsa {disparo} hasta que salga «¡Metralleta!» y mantén {ataque}.', 1), 4.5);
    } else if (!seen.mini) {
      seen.mini = true;
      showHint('¡Mini-robots de Robovill! Hazlos «pop» antes de que se lancen.', 3);
    }
  }
  function spawnRocks(xs, parable) {
    var parada = parable && seen.rocasParadas;
    for (var i = 0; i < xs.length; i++) {
      rocks.push({ wx: scroll + xs[i], y: CEIL + 10, vy: 0, st: parada ? 'sujeta' : 'aviso', tm: -i * 0.12, r: 22 + (i % 2) * 4, rot: rand(0, 6), alive: true });
    }
    if (parada) { addText('¡La compuerta paró las rocas!', W / 2, 190, '#86efac', 2); sfx('hackOk'); return; }
    sfx('rumble'); shake = Math.max(shake, 4);
    if (!seen.rocas) { seen.rocas = true; showHint('¡Rocas! Mira la sombra del suelo: frena, acelera o rómpelas a disparos.', 3.6); }
  }
  function startDrill(tipo) {
    // El taladro del suelo nace lejos: al salir (tras 1,5 s de aviso) está a
    // ~830 px y su recorrido (0,9 s) nunca alcanza a la moto en su sitio; el
    // hueco se abre por delante con más de 1 s para saltarlo (§0.7).
    var wx = scroll + (tipo === 'hueco' ? W + 340 : W - 40);
    drills.push({ wx: wx, tipo: tipo, st: 'aviso', tm: 0, w: 190, alive: true });
    robo = { on: true, x: W + 160, y: ROBO_Y, y0: ROBO_Y, tm: 0, dur: 6, modo: 'excava', taladro: 0 };
    sfx('rumble'); sfx('drill'); shake = Math.max(shake, 6);
    if (tipo === 'hueco') {
      if (!seen.taladro) { seen.taladro = true; showHint('¡Robovill está excavando! Va a abrir un hueco delante: ¡prepárate para saltar!', 3.6); }
    } else if (!seen.taladroTecho) {
      seen.taladroTecho = true; showHint('¡Robovill taladra el techo! Van a caer rocas: mira sus sombras y frena o acelera.', 3.8);
    }
  }

  function updateDrills(dt) {
    for (var i = 0; i < drills.length; i++) {
      var d = drills[i];
      d.tm += dt;
      var sx = d.wx - scroll;
      if (d.st === 'aviso') {
        if (Math.random() < 0.25) dust(sx, GROUND, 1);
        if (d.tm >= 1.5) {
          d.st = 'taladro'; d.tm = 0;
          sfx('drill'); sfx('rumble'); shake = Math.max(shake, 9);
          if (d.tipo === 'hueco') {
            world.push({ k: 'hueco', wx: d.wx - d.w / 2, w: d.w, alive: true, delTaladro: true });
            for (var k = 0; k < 10; k++) parts.push({ x: sx + rand(-80, 80), y: GROUND, vx: rand(-200, 200), vy: rand(-420, -160), life: 0.9, max: 0.9, kind: 'rock', col: '#7c5c45', r: rand(4, 8) });
          } else {
            spawnRocks([sx + 150, sx + 300, sx + 450], false);
          }
        }
      } else if (d.st === 'taladro') {
        // la punta del taladro del suelo hace daño (la del techo no baja hasta
        // la moto: allí el peligro son las rocas, que avisan con su sombra)
        var box = d.tipo === 'hueco' ? drillBox(d, true) : null;
        for (var v = 0; v < vehicles.length; v++) {
          var veh = vehicles[v];
          if (!veh.ko && box && overlap(vbox(veh), box)) {
            if (hurt(veh, 1)) { veh.vy = -520; addText('¡Ay!', veh.x, veh.y - 90, '#fca5a5', 0.8); }
          }
        }
        if (d.tm >= 0.9) { d.st = 'hecho'; }
      }
      if (sx < -300) d.alive = false;
    }
    drills = drills.filter(function (q) { return q.alive; });
  }
  function drillBox(d, paraDano) {
    var p = d.tm / 0.9, h = Math.sin(clamp(p, 0, 1) * Math.PI) * 300;
    var sx = d.wx - scroll;
    if (d.tipo === 'hueco') {
      // se dibuja enorme, pero solo daña la parte baja: un salto la libra
      if (paraDano) h = Math.min(h, DRILL_DANO_H);
      return { x: sx - 26, y: GROUND - h, w: 52, h: h };
    }
    return { x: sx - 26, y: CEIL, w: 52, h: h * 0.5 };
  }

  function updateRocks(dt) {
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      if (!r.alive) continue;
      var sx = r.wx - scroll;
      r.tm += dt;
      if (r.st === 'aviso') {
        if (r.tm >= 1.0) { r.st = 'cae'; r.vy = 200; sfx('robot'); }
      } else if (r.st === 'cae') {
        r.vy += 2400 * dt; r.y += r.vy * dt; r.rot += dt * 6;
        for (var v = 0; v < vehicles.length; v++) {
          var veh = vehicles[v];
          if (!veh.ko && circleRect(sx, r.y, r.r - 4, vbox(veh))) {
            r.alive = false; pop(sx, r.y, false); sfx('explosion');
            if (!hurt(veh, 1) && veh.isAI) addText('¡Bonk!', veh.x, veh.y - 70, '#fde047', 0.7);
            break;
          }
        }
        if (r.alive && r.y + r.r >= GROUND) {
          r.alive = false; dust(sx, GROUND, 8); sfx('explosion'); shake = Math.max(shake, 4);
          for (var k = 0; k < 5; k++) parts.push({ x: sx, y: GROUND - 10, vx: rand(-180, 180), vy: rand(-300, -120), life: 0.7, max: 0.7, kind: 'rock', col: '#8b6b52', r: rand(3, 6) });
        }
      }
      if (sx < -120) r.alive = false;
    }
    rocks = rocks.filter(function (q) { return q.alive; });
  }

  function nearestVeh(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      if (v.ko) continue;
      var d = Math.abs(v.x - x) + Math.abs(v.y - 40 - y) * 0.5;
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  function updateMinis(dt) {
    var i;
    for (i = 0; i < waves.length; i++) {
      var w = waves[i];
      w.t += dt;
      var target = w.densa ? clamp(moto.x + 240, 470, 780) : clamp(moto.x + 330, 560, 820);
      if (!w.sale) w.ax += (target - w.ax) * Math.min(1, dt * (w.densa ? 2.4 : 1.3));
      else { w.ax += 220 * dt; w.ay -= 140 * dt; }
      if (!w.sale && w.t > w.next) {
        // la onda normal lanza de uno en uno; la densa, de dos en dos: el más
        // cercano de arriba y el más cercano de abajo a la vez
        var lados = w.densa ? [-1, 1] : [0], avisa = false;
        for (var s = 0; s < lados.length; s++) {
          var cand = null, cd = 1e9;
          for (var j = 0; j < minis.length; j++) {
            var m = minis[j];
            if (!m.alive || m.w !== w || m.st !== 'forma') continue;
            if (lados[s] < 0 && m.sy >= 0) continue;
            if (lados[s] > 0 && m.sy < 0) continue;
            var dd = Math.abs(m.x - moto.x); if (dd < cd) { cd = dd; cand = m; }
          }
          if (cand) { cand.st = 'aviso'; cand.tm = 0; avisa = true; }
        }
        if (avisa) sfx('zap');
        w.next = w.t + (w.densa ? 1.0 : 1.1);
      }
      if (w.t > w.vida) w.sale = true;
    }
    for (i = 0; i < minis.length; i++) {
      var r = minis[i];
      if (!r.alive) continue;
      r.tm += dt;
      if (r.stun > 0) { r.stun -= dt; continue; }
      var bob = Math.sin(t * 4 + r.fase) * 6;
      if (r.st === 'llega' || r.st === 'forma' || r.st === 'aviso') {
        var tx = r.w.ax + r.sx, ty = r.w.ay + r.sy + bob;
        r.x += (tx - r.x) * Math.min(1, dt * (r.st === 'aviso' ? 1.2 : 3));
        r.y += (ty - r.y) * Math.min(1, dt * 3);
        if (r.st === 'llega' && Math.abs(tx - r.x) < 30) r.st = 'forma';
        if (r.st === 'aviso' && r.tm >= 0.8) {
          r.st = 'lanza'; r.tm = 0;
          var tv = nearestVeh(r.x, r.y);
          var ttx = tv ? tv.x : moto.x, tty = tv ? tv.y - 32 : GROUND - 32;
          var dx = ttx - r.x, dy = tty - r.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
          r.vx = dx / L * 330; r.vy = dy / L * 330;
          if (Math.random() < 0.5) sfx('miniRobot');
        }
        if (r.w.sale) { r.st = 'vete'; }
      } else if (r.st === 'lanza') {
        r.x += r.vx * dt; r.y += r.vy * dt;
        if (r.y > GROUND - 14) { r.y = GROUND - 14; r.vy = 0; r.vx = -260; }
        if (r.x < -60 || r.tm > 4) r.alive = false;
      } else if (r.st === 'vete') {
        r.x += 200 * dt; r.y -= 160 * dt;
        if (r.y < -40 || r.x > W + 80) r.alive = false;
      }
      if (!r.alive) continue;
      for (var v = 0; v < vehicles.length; v++) {
        var veh = vehicles[v];
        if (veh.ko) continue;
        if (circleRect(r.x, r.y, 14, vbox(veh))) {
          if (veh.turbo > 0 || speedBoost > 0) { killMini(r, true); break; }
          if (hurt(veh, 1) || veh.isAI) {
            killMini(r, false);
            // si la onda densa le pilla sin la metralleta, Dark Secuaz se lo recuerda
            if (r.w.densa && veh === moto && moto.lanzador !== 'metralleta' && !seen.densaPilla) {
              seen.densaPilla = true;
              showHint(tk('¡Son demasiados para un solo disparo! Pulsa {disparo} hasta que salga «¡Metralleta!» y mantén {ataque}.', 1), 4);
            }
            break;
          }
        }
      }
    }
    minis = minis.filter(function (q) { return q.alive; });
    waves = waves.filter(function (w) {
      for (var k = 0; k < minis.length; k++) if (minis[k].w === w) return true;
      return false;
    });
  }
  function killMini(r, drop) {
    if (!r.alive) return;
    r.alive = false;
    pop(r.x, r.y, false); sfx('explosion');
    if (drop !== false) maybeHeart(r.x, r.y);
  }

  // ---------------------------------------------------------------------------
  //  CARRERA: obstáculos del mundo
  // ---------------------------------------------------------------------------
  function updateWorld(dt) {
    for (var i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive) continue;
      var sx = o.wx - scroll;
      if (sx + (o.w || 60) < -220) { o.alive = false; continue; }
      if (sx > W + 700) continue;
      if (o.k === 'control') {
        if (sx <= moto.x && !cpDone[o.cp]) {
          cpDone[o.cp] = true; lastCP = CHECKPOINTS[o.cp];
          sfx('checkpoint'); sparkles(sx, GROUND - 90, 16, '#86efac');
          addText('¡Punto de control!', W / 2, 170, '#86efac', 1.8, 30);
        }
        continue;
      }
      if (o.k === 'boxeador') { updateBoxer(o, sx, dt); continue; }
      if (o.k === 'compuerta') {
        if (o.abierta) o.abT += dt;
        if (o.clincT > 0) o.clincT -= dt;
      }
      for (var v = 0; v < vehicles.length; v++) {
        var veh = vehicles[v];
        if (veh.ko) continue;
        var box = vbox(veh);
        if (o.k === 'barricada') {
          if (o.alive && overlap(box, { x: sx, y: GROUND - o.h, w: o.w, h: o.h })) {
            o.alive = false; pop(sx + o.w / 2, GROUND - 30, true); sfx('explosion');
            if (veh.turbo > 0 || speedBoost > 0) addText('¡CRASH!', sx + o.w / 2, GROUND - 90, '#67e8f9', 0.8);
            else hurt(veh, 1);
          }
        } else if (o.k === 'rampa') {
          var cwx = scroll + veh.x;
          if (veh.onGround && cwx > o.wx + 40 && cwx < o.wx + o.w + 10) {
            veh.vy = o.turbo ? TURBO_RAMP_V : RAMP_V; veh.onGround = false; veh.coyote = 0;
            sfx('jump');
            if (o.turbo) {
              speedBoost = BOOST_TIME; sfx('boost');
              if (!o.dicho) { o.dicho = true; addText('¡SÚPER TURBO!', veh.x, veh.y - 110, '#67e8f9', 1.2, 28); }
            } else if (veh.kind === 'moto') addText('¡Despegue!', veh.x, veh.y - 100, '#fde047', 0.9);
          }
        } else if (o.k === 'corazon') {
          if (o.iman) {
            var tgt = moto.ko ? car : moto;
            o.wx += ((tgt.x + scroll) - o.wx) * Math.min(1, dt * 5);
            o.h += ((GROUND - tgt.y + 40) - o.h) * Math.min(1, dt * 5);
            // estela de destellos: el premio de la diana se ve volar hasta la moto
            if (v === 0 && Math.random() < 0.7) {
              parts.push({ x: o.wx - scroll + rand(-10, 10), y: GROUND - o.h + rand(-10, 10), vx: rand(-40, 40), vy: rand(-60, 0),
                           life: rand(0.35, 0.6), max: 0.6, kind: 'star', col: Math.random() < 0.5 ? '#fde047' : '#fda4af', r: rand(2.5, 4.5) });
            }
          } else if (o.drop && o.h > 34) { o.vy = (o.vy || 0) + 500 * dt; o.h = Math.max(34, o.h - o.vy * dt); }
          var hy = GROUND - o.h + Math.sin(t * 4 + o.wx) * 4;
          if (o.alive && circleRect(sx, hy, 22, box)) {
            o.alive = false; heal(veh, 2); sfx('pickup'); addText('+1 ♥', sx, hy - 20, '#fda4af', 1);
          }
        } else if (o.k === 'compuerta' && !o.abierta) {
          if (overlap(box, { x: sx, y: GROUND - 84, w: o.w, h: 84 }) && veh.onGround) {
            veh.vy = -720; veh.onGround = false; sfx('jump');
            if (!veh.isAI) addText('¡Hop!', veh.x, veh.y - 90, '#fde68a', 0.6);
          }
        }
      }
    }
    world = world.filter(function (q) { return q.alive; });
  }

  function updateBoxer(o, sx, dt) {
    if (o.stun > 0) o.stun -= dt;
    else if (o.st === 'walk') {
      o.wx -= 34 * dt;
      var tv = null;
      for (var i = 0; i < vehicles.length; i++) {
        var v = vehicles[i];
        if (!v.ko && sx > v.x && sx - v.x < 260 && v.y > GROUND - 80) tv = v;
      }
      if (tv) { o.st = 'aviso'; o.tm = 0.8; }
    } else if (o.st === 'aviso') {
      o.tm -= dt;
      if (o.tm <= 0) { o.st = 'golpe'; o.tm = 0.35; sfx('punch'); }
    } else if (o.st === 'golpe') {
      o.tm -= dt;
      for (var j = 0; j < vehicles.length; j++) {
        var vv = vehicles[j];
        if (!vv.ko && overlap(vbox(vv), { x: sx - 62, y: GROUND - 50, w: 52, h: 22 })) hurt(vv, 1);
      }
      if (o.tm <= 0) { o.st = 'descanso'; o.tm = 1.0; }
    } else if (o.st === 'descanso') {
      o.tm -= dt;
      if (o.tm <= 0) o.st = 'walk';
    }
    var body = { x: sx - 18, y: GROUND - 60, w: 36, h: 60 };
    for (var k = 0; k < vehicles.length; k++) {
      var veh = vehicles[k];
      if (veh.ko || !o.alive) continue;
      if (overlap(vbox(veh), body)) {
        if (veh.turbo > 0 || speedBoost > 0) { killBoxer(o, sx); addText('¡POP!', sx, GROUND - 90, '#67e8f9', 0.8); }
        else if (veh.vy > 0 && veh.y < body.y + 26) {
          killBoxer(o, sx); veh.vy = -620; sfx('punch'); addText('¡Chafado!', sx, GROUND - 90, '#fde047', 0.8);
        } else if (hurt(veh, 1) || veh.isAI) { o.wx += 40; }
      }
    }
  }
  function killBoxer(o, sx) {
    if (!o.alive) return;
    o.alive = false; pop(sx, GROUND - 30, false); sfx('explosion'); maybeHeart(sx, GROUND - 40);
  }

  // ---------------------------------------------------------------------------
  //  Disparos (bolas de Mikey y cañón del Director)
  // ---------------------------------------------------------------------------
  function hitWorld(p, r, dmg, kind, isBall) {
    // devuelve true si el disparo se detiene
    for (var j = 0; j < world.length; j++) {
      var o = world[j];
      if (!o.alive) continue;
      if (isBall && p.golpes.indexOf(o) >= 0) continue;
      var sx = o.wx - scroll;
      if (sx > W + 70) continue;
      if (o.k === 'boxeador' && circleRect(p.x, p.y, r, { x: sx - 18, y: GROUND - 60, w: 36, h: 60 })) {
        o.hp -= dmg; sfx('hit'); chip(p.x, p.y, '#93c5fd');
        if (kind === 'pistola') o.stun = Math.max(o.stun, 0.2);
        if (o.hp <= 0) killBoxer(o, sx);
        if (isBall) { p.golpes.push(o); p.quedan--; return p.quedan <= 0; }
        return true;
      }
      if (o.k === 'barricada' && circleRect(p.x, p.y, r, { x: sx, y: GROUND - o.h, w: o.w, h: o.h })) {
        o.hp -= dmg; sfx('hit'); chip(p.x, p.y, '#fde68a');
        if (o.hp <= 0) { o.alive = false; pop(sx + o.w / 2, GROUND - 30, true); sfx('explosion'); addText('¡Rota!', sx + o.w / 2, GROUND - 90, '#fde047', 0.7); }
        if (isBall) { p.golpes.push(o); p.quedan--; return p.quedan <= 0; }
        return true;
      }
      if (o.k === 'compuerta' && !o.abierta && isBall) {
        var dc = dianaPos(o);
        if (Math.abs(p.x - dc.x) < 22 + r && Math.abs(p.y - dc.y) < 22 + r) {
          var lejos = (o.wx + o.w / 2 - p.scroll0) - p.mx0 > dianaLejos(p.mx0);
          if (kind === 'francotirador' && lejos) openGate(o);
          else {
            sfx('clink'); chip(dc.x, dc.y, '#e2e8f0');
            if (o.clincT <= 0) {
              o.clincT = 1;
              addText('¡CLINC!', clamp(dc.x, 60, W - 60), dc.y - 34, '#e2e8f0', 0.8);
              if (kind === 'francotirador') showHint('¡Más de lejos! Frena con ' + teclaIzq() + ' y dispara en cuanto aparezca la diana.', 3);
              else showHint(tk('Solo el francotirador llega tan lejos. Pulsa {disparo} hasta que salga «¡Francotirador!».', 1), 3.2);
            }
          }
          return true;
        }
      }
    }
    return false;
  }
  function hitFlying(p, r, dmg, kind, isBall) {
    var k;
    for (k = 0; k < minis.length; k++) {
      var m = minis[k];
      if (!m.alive || (isBall && p.golpes.indexOf(m) >= 0)) continue;
      // la ráfaga «barre» más alto que una bola sola: así llega a los de arriba y
      // de abajo de la onda densa, que la pistola, recta, no alcanza (§11.2 (b))
      var rm = r + (kind === 'metralleta' ? 14 : 0);
      if (Math.abs(m.x - p.x) < 15 + rm && Math.abs(m.y - p.y) < 15 + rm) {
        // los mini-robots son de hojalata: una bola de la metralleta ya los hace
        // «pop» (con 0,5 hacían falta dos y la metralleta no ganaba a la pistola
        // en las ondas densas, que el GDD le reserva: §11.2 (b))
        m.hp -= (kind === 'metralleta') ? Math.max(dmg, 1) : dmg;
        if (kind === 'pistola') m.stun = Math.max(m.stun, 0.2);
        if (m.hp <= 0) killMini(m); else { sfx('hit'); chip(m.x, m.y); }
        if (isBall) { p.golpes.push(m); p.quedan--; return p.quedan <= 0; }
        return true;
      }
    }
    for (k = 0; k < rocks.length; k++) {
      var rk = rocks[k];
      if (!rk.alive || rk.st !== 'cae') continue;
      var rx = rk.wx - scroll;
      if (Math.abs(rx - p.x) < rk.r + r && Math.abs(rk.y - p.y) < rk.r + r) {
        rk.alive = false; pop(rx, rk.y, false); sfx('explosion'); addText('¡Bum!', rx, rk.y - 30, '#fde047', 0.6);
        return true;
      }
    }
    return false;
  }
  function updateShots(dt) {
    var i, p;
    for (i = 0; i < balls.length; i++) {
      p = balls[i];
      var st = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.viaje += st;
      if (p.viaje >= p.alcance || p.x > W + 80 || p.y < CEIL || p.y > GROUND) { p.dead = true; continue; }
      var r = p.tipo === 'francotirador' ? 7 : 6;
      if (hitWorld(p, r, p.dmg, p.tipo, true) || hitFlying(p, r, p.dmg, p.tipo, true)) { p.dead = true; chip(p.x, p.y, '#93c5fd'); }
    }
    balls = balls.filter(function (q) { return !q.dead; });
    for (i = 0; i < cannons.length; i++) {
      p = cannons[i];
      p.x += p.vx * dt; p.viaje += p.vx * dt;
      if (p.viaje > CANNON_RANGE || p.x > W + 40) { p.dead = true; continue; }
      if (hitWorld(p, 5, 1, 'canon', false) || hitFlying(p, 5, 1, 'canon', false)) { p.dead = true; chip(p.x, p.y, '#67e8f9'); }
    }
    cannons = cannons.filter(function (q) { return !q.dead; });
  }

  function dianaPos(o) { return { x: o.wx - scroll + o.w / 2, y: GROUND - 64 }; }
  function openGate(o) {
    o.abierta = true; o.abT = 0;
    var dc = dianaPos(o);
    sfx('hackOk'); sfx('door');
    sparkles(dc.x, dc.y, 18, '#fde047');
    // los textos, siempre dentro de la pantalla (la diana se abre lejos, cerca del borde)
    var tx = clamp(dc.x, 140, W - 260);   // y a la izquierda de los avisos «¡Barricada! ▶»
    addText('¡Diana!', tx, dc.y - 40, '#fde047', 1.3, 30);
    addText(PREMIO_TXT[o.premio] || '¡Premio!', tx, dc.y - 78, '#86efac', 1.8, 26);
    if (o.premio === 'corazon') {
      world.push({ k: 'corazon', wx: o.wx + o.w / 2, h: 70, w: 30, alive: true, iman: true });
    } else if (o.premio === 'turbo') {
      world.push({ k: 'rampa', wx: o.wx + o.w + 70, w: 132, h: 46, alive: true, turbo: true });
    } else if (o.premio === 'rocas') {
      seen.rocasParadas = true;
    }
  }

  // ---------------------------------------------------------------------------
  //  Pistas y fases
  // ---------------------------------------------------------------------------
  function contextualHints(dt) {
    if (dianaTipT > 0) dianaTipT -= dt;
    if (hint && hint.life > 0.6) return;
    for (var i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive) continue;
      var sx = o.wx - scroll;
      if (sx < W + 520 && sx > W + 60) {
        if (o.k === 'compuerta' && !seen.diana) { seen.diana = true; showHint(tk('Pulsa {disparo} hasta que salga «¡Francotirador!» y dale a la diana desde lejos: ¡tiene premio!', 1), 4.5); return; }
        if (o.k === 'hueco' && !seen.hueco) { seen.hueco = true; showHint(tk('¡Un hueco! Salta con {salto} para cruzarlo.', 1), 2.8); return; }
        if (o.k === 'barricada' && !seen.barricada) { seen.barricada = true; showHint('¡Barricada! Sáltala o rómpela a disparos.', 2.8); return; }
        if (o.k === 'boxeador' && !seen.boxeador) { seen.boxeador = true; showHint('¡Un robot de Robovill! Dispárale o cáele encima.', 2.8); return; }
        if (o.k === 'rampa' && !seen.rampa) { seen.rampa = true; showHint('¡Una rampa! Te lanzará por los aires.', 2.4); return; }
      }
    }
  }

  function updateRobo(dt) {
    if (!robo) return;
    robo.tm += dt;
    robo.taladro = (robo.taladro + dt * 4) % 1;
    if (robo.modo === 'irse') {
      robo.x += 120 * dt; robo.y += 30 * dt;
      if (robo.x > W + 240) robo = null;
      return;
    }
    if (robo.modo === 'excava') {
      if (robo.tm < 1.6) robo.x += (690 - robo.x) * Math.min(1, dt * 2);
      else robo.x -= 70 * dt;
      if (robo.tm > 3.2) robo.y += 90 * dt;     // se hunde excavando
      if (Math.random() < 0.4) dust(robo.x + rand(-30, 30), robo.y + 10, 1);
      if (robo.tm > robo.dur) robo = null;
    }
  }

  function startFinal() {
    phase = 'final'; finalT = 0;
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      if (v.ko) respawn(v);
      v.turbo = 0; v.invuln = 0;
    }
    minis.forEach(function (m) { pop(m.x, m.y, false); });
    minis = []; waves = []; rocks = []; balls = []; cannons = [];
    exca = { x: W + 260, sil: 1 };
    sfx('rumble');
  }

  function updateFinal(dt) {
    finalT += dt;
    speedNow = Math.max(0, speedNow - 320 * dt);
    scroll += speedNow * dt;
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      var tx = v.kind === 'moto' ? 300 : 175;
      v.x += (tx - v.x) * Math.min(1, dt * 2);
      v.vy += GRAV * dt; v.y = Math.min(GROUND, v.y + v.vy * dt);
      if (v.y >= GROUND) { v.vy = 0; v.onGround = true; }
      v.tilt *= 0.9;
      if (v.sayT > 0) v.sayT -= dt;
      if (speedNow > 40 && Math.random() < 0.6) parts.push({ x: v.x - 40, y: GROUND - 4, vx: rand(-60, 20), vy: rand(-60, -20), life: 0.5, max: 0.5, kind: 'smoke', col: '#cbd5e1', r: rand(4, 8) });
    }
    if (exca) {
      exca.x += (700 - exca.x) * Math.min(1, dt * 1.6);
      if (finalT > 1.5) exca.sil = Math.max(0, exca.sil - dt * 1.4);
      if (finalT > 0.5 && finalT - dt <= 0.5) { sfx('roar'); shake = 10; }
      if (finalT > 1.5 && finalT - dt <= 1.5) { sfx('drill'); flash = 0.15; }
    }
    if (finalT > 1.0 && finalT - dt <= 1.0) say(moto, '¡Vamos a fusionarnos!', 2);
    if (finalT >= FINAL_TEXT_AT + FINAL_TEXT_TIME && !endGo) {
      endGo = true;
      if (G.scenes.levelP3_2f) G.go('levelP3_2f', { nuevo: true });
      else if (G.scenes.levelDoneP3) G.go('levelDoneP3', { chapter: 2 });   // CONTRATO: respaldo si falta la fusión
      else G.go('title');
    }
  }

  // ---------------------------------------------------------------------------
  //  Bucle
  // ---------------------------------------------------------------------------
  function updateEffects(dt) {
    var i;
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'smoke') { p.vy *= 0.96; p.r += dt * 10; }
      else if (p.kind !== 'line') p.vy += 600 * dt;
    }
    parts = parts.filter(function (q) { return q.life > 0; });
    if (parts.length > 280) parts.splice(0, parts.length - 280);
    for (i = 0; i < texts.length; i++) { texts[i].life -= dt; texts[i].y -= 30 * dt; }
    texts = texts.filter(function (q) { return q.life > 0; });
    for (i = 0; i < explos.length; i++) explos[i].life -= dt;
    explos = explos.filter(function (q) { return q.life > 0; });
    if (shake > 0) shake = Math.max(0, shake - dt * 22);
    if (flash > 0) flash -= dt;
    if (bannerT > 0) bannerT -= dt;
    if (hint) { hint.life -= dt; if (hint.life <= 0) hint = null; }
  }

  function updateScene(dt) {
    t += dt;
    updateEffects(dt);
    if (phase === 'intro') { updateIntro(dt); return; }
    if (phase === 'lose') {
      loseT += dt;
      moto.tilt += dt * 5;
      moto.vy += GRAV * 0.5 * dt; moto.y = Math.min(GROUND, moto.y + moto.vy * dt);
      speedNow = Math.max(0, speedNow - 500 * dt); scroll += speedNow * dt;
      if (Math.random() < 0.5) parts.push({ x: moto.x + rand(-30, 30), y: moto.y - 40, vx: rand(-30, 30), vy: rand(-90, -40), life: 0.8, max: 0.8, kind: 'smoke', col: '#64748b', r: rand(6, 10) });
      if (loseT > 1.4 && !endGo) { endGo = true; G.go('gameover', { retry: 'levelP3_2' }); }
      return;
    }
    if (phase === 'final') { updateFinal(dt); updateRobo(dt); return; }

    // --- carrera ---
    notaT += dt;
    raceT = scroll / SPEED;
    if (speedBoost > 0) {
      speedBoost -= dt;
      if (Math.random() < 0.8) parts.push({ x: rand(W * 0.3, W), y: rand(CEIL + 20, GROUND - 10), vx: -900, vy: 0, life: 0.25, max: 0.25, kind: 'line', col: '#a5f3fc', r: 2 });
    }
    speedNow = SPEED * (speedBoost > 0 ? BOOST_MULT : 1);
    scroll += speedNow * dt;
    runSucesos();
    for (var i = 0; i < vehicles.length; i++) updateVehicle(vehicles[i], dt);
    if (phase !== 'carrera') return;
    updateWorld(dt);
    updateDrills(dt);
    updateRocks(dt);
    updateMinis(dt);
    updateShots(dt);
    updateRobo(dt);
    contextualHints(dt);
    if (phase === 'carrera' && scroll >= GOAL_WX) startFinal();
  }

  // ---------------------------------------------------------------------------
  //  Ruta para los bots (en px de pantalla, relativos al frente de la moto)
  // ---------------------------------------------------------------------------
  function route() {
    var out = [], f = moto ? front(moto) : 372, i;
    var back = moto ? moto.x - 52 : 268;
    for (i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive || o.k === 'control') continue;
      var sx = o.wx - scroll;
      if (sx + (o.w || 40) < back || sx > W + 300) continue;
      var peligro = o.k === 'hueco' || o.k === 'barricada' || o.k === 'boxeador';
      out.push({ x: Math.round(sx - f), tipo: o.k, peligro: peligro });
    }
    for (i = 0; i < drills.length; i++) {
      var d = drills[i];
      if (d.st === 'hecho') continue;
      var dx = d.wx - d.w / 2 - scroll;
      if (dx + d.w < back) continue;
      out.push({ x: Math.round(dx - f), tipo: 'taladro', peligro: d.tipo === 'hueco' });
    }
    for (i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      if (r.st === 'sujeta') continue;
      var rx = r.wx - scroll - r.r;
      if (rx + 2 * r.r < back) continue;
      out.push({ x: Math.round(rx - f), tipo: 'roca', peligro: true });
    }
    for (i = 0; i < minis.length; i++) {
      var m = minis[i];
      if (!m.alive) continue;
      out.push({ x: Math.round(m.x - 15 - f), tipo: 'miniRobot', peligro: m.st === 'lanza' || m.st === 'aviso' });
    }
    out.sort(function (a, b) { return a.x - b.x; });
    return out;
  }
  function heroesInfo() {
    if (!moto) return [];
    return [moto, car].map(function (v) {
      return { x: v.x, y: v.y, vx: v.vx, vy: v.vy, jugador: v.jugador, isAI: v.isAI, ko: v.ko,
               heroe: v.kind === 'moto' ? 'mikey' : 'director', vehiculo: v.kind,
               hp: (!v.isAI && G.state) ? G.state[v.hpKey] : null, lanzador: v.kind === 'moto' ? v.lanzador : null,
               invuln: v.invuln, onGround: v.onGround };
    });
  }

  // ---------------------------------------------------------------------------
  //  ESCENA
  // ---------------------------------------------------------------------------
  G.scenes.levelP3_2 = {
    enter: function (params) {
      try { resetAll(params); } catch (e) { if (window.console) console.warn('[moto] enter', e); }
      music('tunnels');
    },
    exit: function () {
      balls = []; cannons = []; minis = []; waves = []; rocks = []; drills = [];
      parts = []; texts = []; explos = []; world = [];
    },
    update: function (dt) {
      try { updateScene(dt); } catch (e) { if (window.console) console.warn('[moto] update', e); }
    },
    render: function (ctx) {
      var depth = 0;
      try { ctx.save(); depth = 1; renderScene(ctx); ctx.restore(); depth = 0; }
      catch (e) {
        if (depth) { try { ctx.restore(); } catch (e2) { /* nada */ } }
        if (window.console) console.warn('[moto] render', e);
      }
    },
    // la moto no usa HACK: sin botón muerto en el móvil (P3-8b)
    touchExtra: function () { return { ocultar: ['hack'] }; },
    __debug: {
      phase: function () { return phase === 'carrera' ? 'carrera' : phase; },
      route: function () { try { return route(); } catch (e) { return []; } },
      finalTime: GOAL_AT,
      heroes: function () { try { return heroesInfo(); } catch (e) { return []; } },
      raw: function () { return { scroll: scroll, raceT: raceT, balls: balls, cannons: cannons, lastCP: lastCP, moto: moto, car: car, world: world, minis: minis, rocks: rocks, drills: drills, speedBoost: speedBoost }; }
    }
  };

  // ---------------------------------------------------------------------------
  //  DIBUJO: fondo del túnel (con respaldo si falta arte-escenarios3.js)
  // ---------------------------------------------------------------------------
  function drawBackground(c) {
    // { silueta: false }: mientras sale nuestro Robovill, que el fondo no pinte
    // su silueta lejana (opción de bgTuneles en arte-escenarios3.js, que la respeta)
    if (!art('bgTuneles', c, scroll, t, { silueta: !(robo && robo.on) })) {
      var g = c.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, '#140f1f'); g.addColorStop(0.5, '#2a1c2e'); g.addColorStop(1, '#4a3324');
      c.fillStyle = g; c.fillRect(0, 0, W, GROUND + 2);
      // capa lejana: arcos de roca
      var off, x, k, bw;
      c.fillStyle = '#231a2c';
      bw = 260; off = -((scroll * 0.12) % bw);
      for (x = off - bw; x < W + bw; x += bw) {
        k = Math.floor((x - off) / bw + scroll * 0.12 / bw);
        var hh = 120 + hash(k) * 90;
        c.beginPath(); c.moveTo(x, GROUND); c.lineTo(x + 30, GROUND - hh); c.quadraticCurveTo(x + bw / 2, GROUND - hh - 80, x + bw - 30, GROUND - hh); c.lineTo(x + bw, GROUND); c.fill();
      }
      drawRoboBg(c);
      // cristales que brillan
      bw = 330; off = -((scroll * 0.3) % bw);
      for (x = off - bw; x < W + bw; x += bw) {
        k = Math.floor((x - off) / bw + scroll * 0.3 / bw);
        var cx = x + hash(k + 7) * 200, cy = 150 + hash(k + 3) * 200;
        var col = hash(k + 11) > 0.5 ? '#67e8f9' : '#f0abfc';
        c.save(); c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 2 + k);
        c.fillStyle = col; c.beginPath(); c.arc(cx, cy, 26, 0, Math.PI * 2); c.fill(); c.restore();
        c.fillStyle = col; c.strokeStyle = '#1a1a2e'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx - 8, cy + 10); c.lineTo(cx - 4, cy - 14); c.lineTo(cx + 2, cy + 10); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(cx, cy + 10); c.lineTo(cx + 7, cy - 6); c.lineTo(cx + 11, cy + 10); c.closePath(); c.fill(); c.stroke();
      }
      // vigas de la mina
      bw = 420; off = -((scroll * 0.6) % bw);
      for (x = off - bw; x < W + bw; x += bw) {
        c.fillStyle = '#5b3a24'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
        c.fillRect(x + 20, CEIL + 4, 18, GROUND - CEIL - 4); c.strokeRect(x + 20, CEIL + 4, 18, GROUND - CEIL - 4);
        c.fillRect(x + 20, CEIL + 4, 120, 16); c.strokeRect(x + 20, CEIL + 4, 120, 16);
        // farolillo
        c.save(); c.globalAlpha = 0.35; c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(x + 110, CEIL + 52, 30, 0, Math.PI * 2); c.fill(); c.restore();
        c.fillStyle = '#fde68a'; c.beginPath(); c.arc(x + 110, CEIL + 52, 8, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x + 110, CEIL + 20); c.lineTo(x + 110, CEIL + 44); c.stroke();
      }
    } else {
      drawRoboBg(c);
    }
    if (!art('techoTunel', c, scroll, CEIL, t)) {
      c.fillStyle = '#3b2a20'; c.fillRect(0, 0, W, CEIL);
      c.fillStyle = '#4e3829'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
      var o2 = -(scroll % 70);
      c.beginPath(); c.moveTo(-10, 0); c.lineTo(-10, CEIL);
      for (var x2 = o2 - 70; x2 < W + 70; x2 += 70) {
        var kk = Math.floor((x2 - o2) / 70 + scroll / 70);
        c.lineTo(x2 + 20, CEIL + 4); c.lineTo(x2 + 35, CEIL + 10 + hash(kk) * 22); c.lineTo(x2 + 50, CEIL + 4);
      }
      c.lineTo(W + 10, CEIL); c.lineTo(W + 10, 0); c.closePath(); c.fill(); c.stroke();
    }
    if (!art('sueloTunel', c, scroll, GROUND, t)) {
      c.fillStyle = '#5a4030'; c.fillRect(0, GROUND, W, H - GROUND);
      c.fillStyle = '#7a5a42'; c.fillRect(0, GROUND, W, 8);
      c.strokeStyle = '#1a1a2e'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, GROUND); c.lineTo(W, GROUND); c.stroke();
      c.fillStyle = '#3f2c20';
      var o3 = -(scroll % 90);
      for (var x3 = o3 - 90; x3 < W + 90; x3 += 90) {
        var k3 = Math.floor((x3 - o3) / 90 + scroll / 90);
        c.beginPath(); c.ellipse(x3 + 40, GROUND + 30 + hash(k3) * 30, 14 + hash(k3 + 1) * 10, 6, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }

  function drawRoboMonton(c, x, top) {
    c.save();
    c.globalAlpha = 0.95;
    var g = c.createLinearGradient(0, top, 0, GROUND);
    g.addColorStop(0, '#4a3529'); g.addColorStop(1, '#2a1d1c');
    c.fillStyle = g; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x - 175, GROUND + 2);
    c.lineTo(x - 140, top + 52); c.lineTo(x - 104, top + 30); c.lineTo(x - 62, top + 10);
    c.lineTo(x - 20, top + 2); c.lineTo(x + 24, top + 6); c.lineTo(x + 70, top + 18);
    c.lineTo(x + 116, top + 40); c.lineTo(x + 150, top + 66); c.lineTo(x + 180, GROUND + 2);
    c.closePath(); c.fill(); c.stroke();
    // piedras sueltas del montón
    c.fillStyle = '#5b4334';
    var pts = [[-110, 70, 12], [-58, 40, 10], [6, 30, 13], [62, 52, 11], [118, 88, 12], [-20, 84, 9]];
    for (var i = 0; i < pts.length; i++) {
      if (top + pts[i][1] > GROUND - 6) continue;
      c.beginPath(); c.arc(x + pts[i][0], top + pts[i][1], pts[i][2], 0, Math.PI * 2); c.fill(); c.stroke();
    }
    c.restore();
  }

  function drawRoboBg(c) {
    if (!robo || !robo.on) return;
    var s = 0.36;
    c.save();
    c.globalAlpha = 0.82;
    if (!art('robovill', c, robo.x, robo.y, { variant: lookOf('robovill'), scale: s, facing: -1, brazo: 'martillo', alas: 'cerradas', taladro: robo.taladro })) {
      c.fillStyle = '#7f1d1d'; c.beginPath(); c.ellipse(robo.x, robo.y - 50, 40, 50, 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    // bruma: está lejos, al otro lado de las rocas
    c.save();
    var bruma = c.createRadialGradient(robo.x, robo.y - 55, 10, robo.x, robo.y - 55, 150);
    bruma.addColorStop(0, 'rgba(28,20,38,0.30)'); bruma.addColorStop(1, 'rgba(28,20,38,0)');
    c.fillStyle = bruma;
    c.beginPath(); c.ellipse(robo.x, robo.y - 55, 150, 110, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // montón de escombros que va levantando al excavar: lo apoya en el suelo
    // del túnel (no flota) y le tapa los pies cuando se hunde
    drawRoboMonton(c, robo.x, robo.y0 || robo.y);
    if ((robo.y - (robo.y0 || robo.y)) < 20) {
      c.save(); c.fillStyle = 'rgba(20,12,10,0.65)';
      c.beginPath(); c.ellipse(robo.x - 10, (robo.y0 || robo.y) + 4, 56, 12, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    if (robo.modo === 'excava' && robo.tm < 3.4) label(c, '¡Robovill!', robo.x, robo.y - 120, 18, '#fca5a5');
  }

  // ---------------------------------------------------------------------------
  //  DIBUJO: obstáculos
  // ---------------------------------------------------------------------------
  function drawGap(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 10 || sx + o.w < -10) return;
    c.save();
    var g = c.createLinearGradient(0, GROUND, 0, H);
    g.addColorStop(0, '#0d0812'); g.addColorStop(1, '#000000');
    c.fillStyle = g;
    c.fillRect(sx, GROUND - 1, o.w, H - GROUND + 2);
    c.fillStyle = '#6b4c37'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    [[sx, 1], [sx + o.w, -1]].forEach(function (e) {
      c.beginPath(); c.moveTo(e[0], GROUND - 1);
      for (var yy = GROUND; yy <= H; yy += 14) c.lineTo(e[0] + e[1] * (((yy / 14) | 0) % 2 ? 10 : 2), yy);
      c.lineTo(e[0] - e[1] * 6, H); c.lineTo(e[0] - e[1] * 6, GROUND - 1); c.closePath(); c.fill(); c.stroke();
    });
    // brillo de cristal al fondo del hueco (no es de miedo: es un pozo de mina)
    c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3); c.fillStyle = '#7c3aed';
    c.beginPath(); c.ellipse(sx + o.w / 2, H - 10, o.w * 0.3, 10, 0, 0, Math.PI * 2); c.fill(); c.restore();
    cone(c, sx - 14, GROUND + 2); cone(c, sx + o.w + 14, GROUND + 2);
    c.restore();
  }
  function cone(c, x, y) {
    c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x, y - 24); c.lineTo(x + 9, y); c.closePath();
    c.fillStyle = '#f97316'; c.fill(); c.strokeStyle = '#1a1a2e'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#fff'; c.fillRect(x - 4.5, y - 13, 9, 4);
  }
  function drawRamp(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 10 || sx + o.w < -10) return;
    c.save();
    c.beginPath(); c.moveTo(sx, GROUND); c.lineTo(sx + o.w, GROUND - o.h); c.lineTo(sx + o.w, GROUND); c.closePath();
    c.fillStyle = o.turbo ? '#22d3ee' : '#a16207'; c.fill();
    c.save(); c.clip();
    c.fillStyle = o.turbo ? '#ecfeff' : '#78350f';
    for (var k = -2; k < 10; k++) {
      var bx = sx + k * 22;
      c.beginPath(); c.moveTo(bx, GROUND); c.lineTo(bx + 9, GROUND); c.lineTo(bx + 49, GROUND - 60); c.lineTo(bx + 40, GROUND - 60); c.closePath(); c.fill();
    }
    c.restore();
    c.beginPath(); c.moveTo(sx, GROUND); c.lineTo(sx + o.w, GROUND - o.h); c.lineTo(sx + o.w, GROUND); c.closePath();
    c.strokeStyle = '#1a1a2e'; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
    if (o.turbo) {
      c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 12);
      label(c, '»»', sx + o.w / 2, GROUND - 52, 26, '#ecfeff');
    }
    c.restore();
  }
  function drawBarricade(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 10 || sx + o.w < -10) return;
    var top = GROUND - o.h;
    c.save();
    c.fillStyle = '#334155'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    rrect(c, sx + 6, top + 18, 8, o.h - 18, 3); c.fill(); c.stroke();
    rrect(c, sx + o.w - 14, top + 18, 8, o.h - 18, 3); c.fill(); c.stroke();
    c.save(); rrect(c, sx - 4, top, o.w + 8, 30, 6); c.clip();
    c.fillStyle = '#f8fafc'; c.fillRect(sx - 4, top, o.w + 8, 30);
    c.fillStyle = '#dc2626';
    for (var k = -2; k < 6; k++) { var bx = sx + k * 18; c.beginPath(); c.moveTo(bx, top + 30); c.lineTo(bx + 9, top + 30); c.lineTo(bx + 27, top); c.lineTo(bx + 18, top); c.closePath(); c.fill(); }
    c.restore();
    rrect(c, sx - 4, top, o.w + 8, 30, 6); c.stroke();
    // marca de Robovill: una punta de taladro
    c.fillStyle = '#9ca3af';
    c.beginPath(); c.moveTo(sx + o.w / 2 - 9, top + 40); c.lineTo(sx + o.w / 2 + 9, top + 40); c.lineTo(sx + o.w / 2, top + 58); c.closePath(); c.fill(); c.stroke();
    // grietas según el daño
    if (o.hp < 3) { c.strokeStyle = '#1a1a2e'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + 10, top + 4); c.lineTo(sx + 22, top + 16); c.lineTo(sx + 16, top + 26); c.stroke(); }
    if (o.hp < 2) { c.beginPath(); c.moveTo(sx + o.w - 8, top + 3); c.lineTo(sx + o.w - 20, top + 14); c.lineTo(sx + o.w - 12, top + 27); c.stroke(); }
    c.restore();
  }
  function drawBoxer(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 60 || sx < -60) return;
    if (!art('boxeador', c, sx, GROUND, { scale: 1.05, facing: -1, pose: o.st === 'golpe' ? 'golpe' : 'guardia' })) {
      c.fillStyle = '#64748b'; c.fillRect(sx - 16, GROUND - 56, 32, 56);
    }
    if (o.st === 'aviso') gfx('drawExclamation', c, sx, GROUND - 86);
  }
  function drawHeartPick(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 30 || sx < -30) return;
    var hy = GROUND - o.h + Math.sin(t * 4 + o.wx) * 4;
    c.save(); c.globalAlpha = 0.3 + 0.15 * Math.sin(t * 6); c.fillStyle = '#fda4af';
    c.beginPath(); c.arc(sx, hy, 22, 0, Math.PI * 2); c.fill(); c.restore();
    if (!gfx('drawHeart', c, sx, hy, 26, 'full')) {
      c.fillStyle = '#ef4444'; c.beginPath(); c.arc(sx, hy, 11, 0, Math.PI * 2); c.fill();
    }
  }
  function drawGate(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 60 || sx + o.w < -60) return;
    var top = GROUND - o.h;
    c.save();
    c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    // postes
    c.fillStyle = '#475569';
    rrect(c, sx - 6, top - 50, 12, o.h + 50, 4); c.fill(); c.stroke();
    rrect(c, sx + o.w - 6, top - 50, 12, o.h + 50, 4); c.fill(); c.stroke();
    if (!o.abierta) {
      // compuerta baja (rejilla de acero y rojo)
      c.fillStyle = '#64748b'; rrect(c, sx, top, o.w, o.h, 5); c.fill(); c.stroke();
      c.fillStyle = '#b91c1c';
      for (var k = 0; k < 4; k++) c.fillRect(sx + 6 + k * 15, top + 6, 7, o.h - 12);
      c.strokeRect(sx, top + o.h / 2 - 3, o.w, 6);
      // brazo de la diana
      c.fillStyle = '#94a3b8'; c.fillRect(sx + o.w / 2 - 3, top - 22, 6, 22); c.strokeRect(sx + o.w / 2 - 3, top - 22, 6, 22);
    } else {
      // abierta: la reja se pliega hacia abajo
      var p = clamp(o.abT / 0.4, 0, 1);
      c.fillStyle = '#64748b'; rrect(c, sx, GROUND - o.h * (1 - p) - 6 * p, o.w, Math.max(6, o.h * (1 - p)), 4); c.fill(); c.stroke();
    }
    // la diana (centro a la altura del disparo)
    var dc = dianaPos(o), sc = o.abierta ? 1 + 0.4 * Math.sin(clamp(o.abT, 0, 0.6) * 10) : 1;
    if (!o.abierta || o.abT < 1.2) {
      c.save(); c.globalAlpha = o.abierta ? clamp(1 - (o.abT - 0.6) / 0.6, 0, 1) : 1;
      if (!art('diana', c, dc.x, dc.y, { hecha: o.abierta, t: t, scale: sc })) drawDianaFallback(c, dc.x, dc.y, 20 * sc, o.abierta);
      c.restore();
    }
    // el premio que hay detrás, para que el niño sepa qué gana
    if (!o.abierta) drawPrizeIcon(c, o.premio, sx + o.w / 2, top - 74);
    c.restore();
  }
  function drawDianaFallback(c, x, y, r, hecha) {
    var cols = hecha ? ['#86efac', '#ffffff', '#22c55e'] : ['#ef4444', '#ffffff', '#ef4444'];
    c.save(); c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    c.fillStyle = cols[0]; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = cols[1]; c.beginPath(); c.arc(x, y, r * 0.64, 0, Math.PI * 2); c.fill();
    c.fillStyle = cols[2]; c.beginPath(); c.arc(x, y, r * 0.3, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function drawPrizeIcon(c, premio, x, y) {
    var b = Math.sin(t * 4) * 3;
    c.save();
    c.fillStyle = 'rgba(15,10,30,0.7)'; c.strokeStyle = '#fde047'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(x, y + b, 17, 0, Math.PI * 2); c.fill(); c.stroke();
    if (premio === 'corazon') { if (!gfx('drawHeart', c, x, y + b, 20, 'full')) label(c, '♥', x, y + b + 7, 20, '#f87171'); }
    else if (premio === 'turbo') label(c, '»', x, y + b + 8, 26, '#67e8f9');
    else {
      c.fillStyle = '#8b6b52'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y + b, 8, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = '#86efac'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x - 10, y + b - 10); c.lineTo(x + 10, y + b + 10); c.stroke();
    }
    c.restore();
  }
  function drawControl(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 40 || sx < -40) return;
    var hecho = !!cpDone[o.cp];
    c.save();
    c.fillStyle = '#e5e7eb'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    c.fillRect(sx - 3, GROUND - 130, 6, 130); c.strokeRect(sx - 3, GROUND - 130, 6, 130);
    var wave = Math.sin(t * 6) * 4;
    c.fillStyle = hecho ? '#22c55e' : '#fbbf24';
    c.beginPath(); c.moveTo(sx + 3, GROUND - 128); c.lineTo(sx + 52, GROUND - 116 + wave); c.lineTo(sx + 3, GROUND - 100); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }

  function drawDrill(c, d) {
    var sx = d.wx - scroll;
    if (sx < -200 || sx > W + 420) return;
    if (d.st === 'aviso') {
      // grietas que crecen (1,5 s) donde va a salir: en el suelo (hueco) o en
      // el techo (rocas), con su «!»; si aún está fuera, el «!» espera en el borde
      var p = clamp(d.tm / 1.5, 0, 1), techo = d.tipo === 'rocas';
      var cy = techo ? CEIL - 2 : GROUND + 2, sg = techo ? -1 : 1;
      if (sx < W + 100) {
        c.save();
        c.strokeStyle = 'rgba(239,68,68,' + (0.5 + 0.4 * Math.sin(t * 14)) + ')'; c.lineWidth = 4;
        c.beginPath(); c.ellipse(sx, cy, 40 + 50 * p, 8 + 4 * p, 0, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = '#1a1a2e'; c.lineWidth = 2.5;
        for (var k = 0; k < 5; k++) {
          var a = -Math.PI + k * Math.PI / 4;
          c.beginPath(); c.moveTo(sx, cy - sg); c.lineTo(sx + Math.cos(a) * 80 * p, cy - sg + sg * Math.abs(Math.sin(a)) * 6 * p); c.stroke();
        }
        c.restore();
      }
      var ex = Math.min(sx, W - 40), ey = techo ? CEIL + 160 : GROUND - 52;   // bajo la caja de pistas
      if (techo) {
        c.save(); c.strokeStyle = 'rgba(239,68,68,0.8)'; c.lineWidth = 3; c.setLineDash([6, 6]);
        c.beginPath(); c.moveTo(ex, CEIL + 10); c.lineTo(ex, CEIL + 128); c.stroke(); c.restore();
      }
      if (!gfx('drawExclamation', c, ex, ey)) label(c, '!', ex, ey + 10, 34, '#ef4444');
      if (sx > W - 40) {
        // flecha: «viene de ahí delante»
        c.save(); c.fillStyle = '#ef4444'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 2.5;
        var ay = ey + (techo ? 40 : -40);
        c.beginPath(); c.moveTo(W - 14, ay); c.lineTo(W - 34, ay - 12); c.lineTo(W - 34, ay + 12); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
    } else if (d.st === 'taladro') {
      var box = drillBox(d);
      if (!box || box.h < 2) return;
      c.save();
      var up = d.tipo === 'hueco';
      var baseY = up ? GROUND : CEIL, tipY = up ? box.y : box.y + box.h;
      c.fillStyle = '#9ca3af'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(sx - 26, baseY); c.lineTo(sx + 26, baseY); c.lineTo(sx, tipY); c.closePath(); c.fill(); c.stroke();
      // espiral del taladro
      c.strokeStyle = '#475569'; c.lineWidth = 3;
      var n = 6;
      for (var i = 1; i < n; i++) {
        var f = i / n, yy = baseY + (tipY - baseY) * f, half = 26 * (1 - f);
        var ph = ((t * 6) % 1);
        c.beginPath(); c.moveTo(sx - half, yy + (up ? 6 : -6) * ph); c.lineTo(sx + half, yy - (up ? 6 : -6) * (1 - ph)); c.stroke();
      }
      c.fillStyle = '#ef4444'; c.beginPath(); c.arc(sx, tipY, 4, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  function drawRock(c, r) {
    var sx = r.wx - scroll;
    if (sx < -60 || sx > W + 60) return;
    if (r.st === 'aviso') {
      var p = clamp(r.tm / 1.0, 0, 1);
      if (r.tm >= 0 && !art('sombraAviso', c, sx, GROUND, { r: r.r + 10, t01: p })) {
        c.save();
        c.fillStyle = 'rgba(15,10,30,' + (0.25 + 0.4 * p) + ')';
        c.beginPath(); c.ellipse(sx, GROUND - 2, 12 + (r.r + 10) * p, 4 + 6 * p, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(239,68,68,' + (0.5 + 0.5 * Math.abs(Math.sin(t * 12))) + ')'; c.lineWidth = 2.5; c.stroke();
        c.restore();
      }
      var shakeX = Math.sin(t * 50 + r.wx) * 2 * p;
      drawRockShape(c, sx + shakeX, CEIL + 4 + 6 * p, r.r, r.rot);
    } else if (r.st === 'cae') {
      drawRockShape(c, sx, r.y, r.r, r.rot);
    } else if (r.st === 'sujeta') {
      drawRockShape(c, sx, CEIL + 8, r.r, r.rot);
      // la red verde de la compuerta las sujeta
      c.save(); c.strokeStyle = '#4ade80'; c.lineWidth = 2.5;
      for (var k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(sx - 30, CEIL + 8 + k * 7); c.lineTo(sx + 30, CEIL + 8 - k * 7); c.stroke(); }
      c.restore();
    }
  }
  function drawRockShape(c, x, y, r, rot) {
    if (art('roca', c, x, y, { r: r, t: t, rot: rot })) return;
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = '#8b6b52'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    c.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, rr = r * (0.82 + 0.18 * ((i * 7) % 3) / 2);
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#a3836a'; c.beginPath(); c.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawMini(c, m) {
    var tilt = m.st === 'lanza' ? Math.atan2(m.vy, Math.abs(m.vx) + 1) * 0.6 : 0;
    var s = 0.8 * 40 / altoArte('miniRobot');
    c.save(); c.translate(m.x, m.y); c.rotate(-tilt);
    if (!art('miniRobot', c, 0, 0, { scale: s, facing: -1, t: t + m.fase })) {
      c.fillStyle = '#94a3b8'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#ef4444'; c.beginPath(); c.arc(-4, -2, 4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    if (m.st === 'lanza' && Math.random() < 0.5) parts.push({ x: m.x + 10, y: m.y, vx: 60, vy: 0, life: 0.25, max: 0.25, kind: 'smoke', col: '#fca5a5', r: 3 });
    if (m.st === 'aviso') gfx('drawExclamation', c, m.x, m.y - 30);
    if (m.stun > 0) sparkleRing(c, m.x, m.y - 18);
  }
  function sparkleRing(c, x, y) {
    c.save(); c.fillStyle = '#fde047';
    for (var i = 0; i < 3; i++) { var a = t * 8 + i * 2.1; c.beginPath(); c.arc(x + Math.cos(a) * 10, y + Math.sin(a) * 3, 2.5, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }

  // ---------------------------------------------------------------------------
  //  DIBUJO: vehículos, disparos y efectos
  // ---------------------------------------------------------------------------
  function drawMotoArt(c, x, y, modo, opts) {
    var o = { variant: lookOf('moto'), modo: modo, enemy: false, scale: motoS, facing: 1, look: (G.p3 && G.p3.look) || {} };
    if (opts) for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    if (!art('robotMoto', c, x, y, o)) {
      c.save();
      c.fillStyle = '#f97316'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
      if (modo === 'moto') {
        rrect(c, x - 60, y - 52, 120, 26, 10); c.fill(); c.stroke();
        c.fillStyle = '#1f2937'; [-42, 46].forEach(function (dx) { c.beginPath(); c.arc(x + dx, y - 16, 16, 0, Math.PI * 2); c.fill(); c.stroke(); });
      } else { rrect(c, x - 22, y - 120, 44, 120, 12); c.fill(); c.stroke(); }
      c.restore();
    }
  }
  function drawVehicle(c, v) {
    var blink = (phase === 'carrera' && (v.invuln > 0 || v.bump > 0 || v.ko) && Math.floor(t * 18) % 2 === 0);
    c.save();
    c.globalAlpha = (v.ko ? 0.55 : 1) * (blink ? 0.35 : 1);
    c.translate(v.x, v.y);
    c.rotate(v.tilt + (v.ko ? Math.sin(t * 8) * 0.06 : 0));
    if (v.kind === 'moto') {
      if (speedBoost > 0) {
        c.save(); c.globalAlpha *= 0.3 + 0.15 * Math.sin(t * 30); c.fillStyle = '#67e8f9';
        c.beginPath(); c.ellipse(0, -40, 92, 52, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
      drawMotoArt(c, 0, 0, 'moto', { boost: speedBoost > 0 || phase === 'intro' });
      if (v.flashT > 0) {
        c.save(); c.fillStyle = '#bfdbfe'; c.globalAlpha = 0.9;
        c.beginPath(); c.arc(58 * motoS, -68 * motoS, 10, 0, Math.PI * 2); c.fill(); c.restore();
      }
    } else {
      if (v.turbo > 0) {
        var dd = carDims();
        c.save(); c.globalAlpha *= 0.35 + 0.15 * Math.sin(t * 30); c.fillStyle = '#67e8f9';
        c.beginPath(); c.ellipse(0, -dd.h / 2, 80, dd.h / 2 + 18, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
      if (!art('transformableCoche', c, 0, 0, { variant: carVar, enemy: false, scale: CAR_S, facing: 1, boost: v.turbo > 0 || speedBoost > 0 })) {
        c.fillStyle = '#3b82f6'; c.fillRect(-55, -40, 110, 34);
      }
      if (v.flashT > 0) {
        var d2 = carDims();
        c.save(); c.fillStyle = '#a5f3fc'; c.beginPath(); c.arc(d2.w * 0.55, -d2.gun, 9, 0, Math.PI * 2); c.fill(); c.restore();
      }
    }
    c.restore();
    if (v.kind === 'moto' && v.swapT > 0) {
      c.save(); c.globalAlpha = clamp(v.swapT / 0.25, 0, 1);
      label(c, (LANZ[v.lanzador] || LANZ.pistola).nombre, v.x, v.y - 104, 20, '#93c5fd');
      c.restore();
    }
    if (v.ko) label(c, '¡Averiado! ' + Math.max(1, Math.ceil(v.koT)), v.x, v.y - 96, 18, '#fca5a5');
    if (v.sayT > 0 && v.say) bubble(c, v.say, v.x + 10, v.y - (v.kind === 'moto' ? 92 : 64));
    if (coop && phase === 'carrera' && !v.ko) {
      var tag = v.jugador === 2 ? '2' : '1';
      c.save(); c.fillStyle = v.jugador === 2 ? '#22c55e' : '#fbbf24'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 2.5;
      var ty = v.y - (v.kind === 'moto' ? 98 : vbox(v).h + 20);
      c.beginPath(); c.arc(v.x, ty, 10, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
      label(c, tag, v.x, ty + 5, 14, '#1a1a2e');
    }
  }

  function drawIntro(c) {
    var p;
    // el Director espera en su coche, acelerando
    drawVehicle(c, car);
    if (introStage === 'robot') {
      var bob = Math.sin(t * 5) * 2;
      drawMotoArt(c, moto.x, GROUND + bob, 'robot', {});
    } else if (introStage === 'transform') {
      p = clamp((phaseT - 1.0) / 0.7, 0, 1);
      c.save();
      c.translate(moto.x, GROUND);
      if (p < 0.5) { c.scale(1 + p * 0.5, Math.max(0.25, 1 - p * 1.4)); drawMotoArt(c, 0, 0, 'robot', {}); }
      else { var sc = 0.5 + (p - 0.5); c.scale(1, sc); drawMotoArt(c, 0, 0, 'moto', {}); }
      c.restore();
      var fl = 1 - Math.abs(p - 0.5) / 0.5;
      c.save(); c.globalAlpha = clamp(fl, 0, 1) * 0.85;
      var rg = c.createRadialGradient(moto.x, GROUND - 60, 5, moto.x, GROUND - 60, 140);
      rg.addColorStop(0, '#ffffff'); rg.addColorStop(1, 'rgba(253,186,116,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(moto.x, GROUND - 60, 140, 0, Math.PI * 2); c.fill();
      c.restore();
    } else {
      drawVehicle(c, moto);
    }
    var a = clamp(phaseT / 0.3, 0, 1);
    c.save(); c.globalAlpha = a;
    label(c, '¡Robot-moto hackeada!', W / 2, 180, 40, '#86efac');
    if (phaseT > 0.8) label(c, '¡Arranca, Mikey!', W / 2, 228, 34, '#fdba74');
    c.restore();
  }

  function drawBall(c, b) {
    var ang = Math.atan2(b.vy, b.vx);
    if (art('bolaEnergiaJuego', c, b.x, b.y, { tipo: b.tipo, angle: ang, scale: 1, t: t })) return;
    c.save();
    c.translate(b.x, b.y); c.rotate(ang);
    var sn = b.tipo === 'francotirador';
    if (sn) {
      var g = c.createLinearGradient(-60, 0, 0, 0);
      g.addColorStop(0, 'rgba(96,165,250,0)'); g.addColorStop(1, 'rgba(147,197,253,0.8)');
      c.fillStyle = g; c.fillRect(-60, -4, 60, 8);
    }
    c.fillStyle = 'rgba(96,165,250,0.45)';
    c.beginPath(); c.ellipse(0, 0, sn ? 14 : 10, sn ? 7 : 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3b82f6'; c.strokeStyle = '#1e3a8a'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, 0, sn ? 9 : 6, sn ? 4 : 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#e0f2fe'; c.beginPath(); c.arc(sn ? 2 : 1, -1, 2.2, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawSight(c) {
    // mira del francotirador: una línea discontinua hacia la diana cuando vale
    if (phase !== 'carrera' || moto.ko) return;
    for (var i = 0; i < world.length; i++) {
      var o = world[i];
      if (o.k !== 'compuerta' || o.abierta || !o.alive) continue;
      var dc = dianaPos(o), dist = dc.x - moto.x;
      if (dc.x > W + 40 || dist <= dianaLejos(moto.x)) continue;
      var m = muzzle(moto);
      if (moto.lanzador === 'francotirador') {
        c.save(); c.strokeStyle = 'rgba(134,239,172,0.85)'; c.lineWidth = 2.5; c.setLineDash([8, 8]); c.lineDashOffset = -t * 60;
        c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(Math.min(dc.x, W), m.y); c.stroke(); c.restore();
        if (dc.x < W - 10) {
          c.save(); c.strokeStyle = '#86efac'; c.lineWidth = 3;
          c.beginPath(); c.arc(dc.x, dc.y, 28 + 3 * Math.sin(t * 10), 0, Math.PI * 2); c.stroke(); c.restore();
          label(c, '¡Ahora!', Math.min(dc.x, W - 60), dc.y - 40, 18, '#86efac');
        }
      } else if (dc.x < W) {
        // por debajo de la caja de pistas aunque la moto vaya por el aire
        label(c, tk('¡{disparo}: francotirador!', 1), moto.x + 20, Math.max(moto.y - 112, 200), 16, '#fde68a');
      }
      break;
    }
  }

  function drawWarnings(c) {
    var shown = 0;
    for (var i = 0; i < world.length && shown < 2; i++) {
      var o = world[i];
      if (!o.alive || !AVISOS[o.k] || (o.k === 'compuerta' && o.abierta)) continue;
      var sx = o.wx - scroll;
      if (sx > W - 10 && sx < W + 560) {
        var y = GROUND - 140 - shown * 60;
        var a = 0.65 + 0.35 * Math.sin(t * 10);
        c.save(); c.globalAlpha = a;
        c.fillStyle = o.k === 'compuerta' ? '#86efac' : '#fbbf24'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(W - 14, y); c.lineTo(W - 44, y - 22); c.lineTo(W - 44, y + 22); c.closePath(); c.fill(); c.stroke();
        c.restore();
        label(c, AVISOS[o.k], W - 52, y + 7, 18, o.k === 'compuerta' ? '#86efac' : '#fde047', 'right');
        shown++;
      }
    }
  }

  function drawParticles(c) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], a = clamp(p.life / p.max, 0, 1);
      c.save(); c.globalAlpha = a; c.fillStyle = p.col;
      if (p.kind === 'line') c.fillRect(p.x, p.y, 28, 3);
      else if (p.kind === 'bolt') {
        c.fillStyle = '#94a3b8'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 1.5;
        c.beginPath(); for (var k = 0; k < 6; k++) { var an = k * Math.PI / 3; c.lineTo(p.x + Math.cos(an) * p.r * 1.3, p.y + Math.sin(an) * p.r * 1.3); }
        c.closePath(); c.fill(); c.stroke();
      } else if (p.kind === 'star') gfx('drawSparkle', c, p.x, p.y, 1 - a);
      else if (p.kind === 'rock') { c.strokeStyle = '#1a1a2e'; c.lineWidth = 1.5; c.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); c.strokeRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); }
      else if (p.kind === 'conf') c.fillRect(p.x, p.y, p.r * 2, p.r);
      else { c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    for (i = 0; i < explos.length; i++) {
      var ex = explos[i], tt = 1 - ex.life / ex.max;
      if (!art('chispasPop', c, ex.x, ex.y, { t01: tt, scale: ex.r / 30 })) gfx('drawExplosion', c, ex.x, ex.y, tt, ex.r);
    }
  }

  // --- la caverna enorme y la Gran Excavadora ---
  function drawCavern(c) {
    var cx = GOAL_WX + 200 - scroll;     // borde izquierdo de la caverna en pantalla
    if (cx > W) return;
    c.save();
    c.beginPath(); c.rect(Math.max(0, cx), 0, W - Math.max(0, cx), GROUND); c.clip();
    if (!art('bgArenaGigantes', c, t, { lugar: 'caverna' })) {
      var g = c.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, '#0b0712'); g.addColorStop(1, '#3a2418');
      c.fillStyle = g; c.fillRect(0, 0, W, GROUND);
      c.fillStyle = '#1d1420';
      for (var i = 0; i < 9; i++) {
        var x = i * 120 + 20, hh = 60 + hash(i + 40) * 120;
        c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x, hh); c.lineTo(x + 30, 0); c.fill();
      }
      c.save(); c.globalAlpha = 0.3; c.fillStyle = '#f97316';
      c.beginPath(); c.ellipse(W * 0.72, GROUND, 320, 90, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    c.restore();
    if (cx > -40) {
      // borde de roca del final del túnel
      c.save(); c.fillStyle = '#3b2a20'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(cx - 40, 0); c.lineTo(cx + 30, 0); c.quadraticCurveTo(cx - 10, GROUND * 0.5, cx + 20, GROUND); c.lineTo(cx - 40, GROUND); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  }
  var silCanvas = null;
  function drawExcavadora(c) {
    if (!exca) return;
    var s = 220 / altoArte('granExcavadora');
    var x = exca.x, y = GROUND;
    var drawn = false;
    if (exca.sil > 0.02) {
      try {
        if (!silCanvas && typeof document !== 'undefined' && document.createElement) {
          silCanvas = document.createElement('canvas'); silCanvas.width = W; silCanvas.height = H;
        }
        var sc2 = silCanvas && silCanvas.getContext && silCanvas.getContext('2d');
        if (sc2 && c.drawImage) {
          sc2.setTransform(1, 0, 0, 1, 0, 0);
          sc2.clearRect(0, 0, W, H);
          sc2.globalCompositeOperation = 'source-over';
          if (art('granExcavadora', sc2, x, y, { scale: s, facing: -1, humo: true })) {
            sc2.save();
            sc2.globalCompositeOperation = 'source-atop';
            sc2.fillStyle = 'rgba(12,8,18,' + clamp(exca.sil, 0, 1) * 0.92 + ')';
            sc2.fillRect(0, 0, W, H);
            sc2.restore();
            sc2.globalCompositeOperation = 'source-over';
            c.drawImage(silCanvas, 0, 0);
            drawn = true;
          }
        }
      } catch (e) { drawn = false; }
    }
    if (!drawn) {
      if (!art('granExcavadora', c, x, y, { scale: s, facing: -1, humo: true })) {
        c.save(); c.fillStyle = '#334155'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 4;
        rrect(c, x - 150, y - 160, 300, 160, 20); c.fill(); c.stroke(); c.restore();
      }
    }
    // el ojo-luz rojo se ve en la oscuridad
    var ex = x - 22 * s, ey = y - 114.5 * s;
    c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6);
    var rg = c.createRadialGradient(ex, ey, 2, ex, ey, 34);
    rg.addColorStop(0, '#fecaca'); rg.addColorStop(1, 'rgba(239,68,68,0)');
    c.fillStyle = rg; c.beginPath(); c.arc(ex, ey, 34, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // ---------------------------------------------------------------------------
  //  HUD
  // ---------------------------------------------------------------------------
  function drawLauncherIcon(c, tipo, x, y, size, activo) {
    if (art('iconoLanzador', c, x, y, { tipo: tipo, size: size, activo: activo })) return;
    c.save();
    c.fillStyle = activo ? '#1e3a8a' : 'rgba(15,10,30,0.75)'; c.strokeStyle = activo ? '#fde047' : '#1a1a2e'; c.lineWidth = 3;
    c.beginPath(); c.arc(x, y, size / 2, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
    var s = size / 62;
    if (!art('lanzadorMikey', c, x - 15 * s, y + 6 * s, { tipo: tipo, scale: s, facing: 1 })) {
      label(c, tipo === 'francotirador' ? '1' : (tipo === 'pistola' ? '2' : '3'), x, y + 6, 16, '#93c5fd');
    }
  }
  function drawHud(c) {
    if (G.ui && G.ui.drawHearts) { try { G.ui.drawHearts(c); } catch (e) { /* nada */ } }
    // barra de progreso "¡Tras Robovill!"
    var bx = 262, bw = 380, by = 18, bh = 22;
    var prog = clamp(scroll / GOAL_WX, 0, 1);
    c.save();
    c.fillStyle = 'rgba(15,10,30,0.8)'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 4;
    rrect(c, bx - 3, by - 3, bw + 6, bh + 6, 10); c.fill(); c.stroke();
    var g = c.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#c2410c'); g.addColorStop(1, '#fb923c');
    c.fillStyle = g; rrect(c, bx, by, Math.max(10, bw * prog), bh, 8); c.fill();
    // puntos de control
    for (var i = 0; i < CHECKPOINTS.length; i++) {
      var fx = bx + bw * CHECKPOINTS[i] / GOAL_AT;
      c.fillStyle = cpDone[i] ? '#22c55e' : '#e5e7eb'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 2;
      c.fillRect(fx - 1.5, by - 6, 3, bh + 6);
      c.beginPath(); c.moveTo(fx + 1.5, by - 6); c.lineTo(fx + 12, by - 2); c.lineTo(fx + 1.5, by + 2); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
    // la moto debajo de la barra (avanza con el progreso) y Robovill al final
    c.save();
    var mx = bx + bw * prog;
    c.translate(mx, by + bh + 21); c.scale(0.24, 0.24);
    drawMotoArt(c, 0, 0, 'moto', { scale: 1 });
    c.restore();
    c.save(); c.fillStyle = '#ef4444'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(bx + bw + 4, by + bh / 2, 8, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
    label(c, '¡Tras Robovill!', bx + bw / 2, by + 17, 15, '#fef3c7');

    if (phase !== 'carrera') return;
    // lanzadores de Mikey (J1), debajo de los corazones
    // en co-op la burbuja de pistas es más ancha: los mandos van abajo (no hay botones táctiles)
    var y0 = coop ? 492 : 74;
    for (var k = 0; k < ORDEN.length; k++) {
      var on = moto.lanzador === ORDEN[k];
      drawLauncherIcon(c, ORDEN[k], 34 + k * 44, y0, on ? 38 : 30, on);
      if (on && moto.cd > 0) {
        var L = LANZ[ORDEN[k]];
        c.save(); c.globalAlpha = 0.55; c.fillStyle = '#0f0a1e';
        c.beginPath(); c.moveTo(34 + k * 44, y0);
        c.arc(34 + k * 44, y0, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(moto.cd / L.cd, 0, 1)); c.closePath(); c.fill(); c.restore();
      }
    }
    label(c, tk('{ataque} disparar · {disparo} cambiar', 1), coop ? 158 : 16, coop ? y0 + 28 : y0 + 38, 13, '#fef3c7', 'left');
    label(c, (LANZ[moto.lanzador] || LANZ.pistola).nombre.replace(/[¡!]/g, ''), 158, y0 + 6, 15, '#93c5fd', 'left');
    // el Director (J2 en co-op)
    if (coop) {
      var x2 = W - 196, ready = car.turbo <= 0 && car.turboCd <= 0 && !car.ko;
      c.save();
      c.fillStyle = car.turbo > 0 ? '#67e8f9' : (ready ? '#0e7490' : '#334155'); c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
      var yb = 480;
      rrect(c, x2, yb, 180, 26, 8); c.fill(); c.stroke();
      var frac = car.turbo > 0 ? car.turbo / TURBO_TIME : (car.turboCd > 0 ? 1 - car.turboCd / TURBO_CD : 1);
      c.fillStyle = 'rgba(255,255,255,0.25)'; rrect(c, x2 + 2, yb + 2, 176 * clamp(frac, 0, 1), 22, 6); c.fill();
      c.restore();
      label(c, 'J2 · el Director', x2 + 90, yb - 7, 13, '#86efac');
      label(c, tk('{ataque} TURBO · {disparo} Cañón', 2), x2 + 90, yb + 19, 14, ready || car.turbo > 0 ? '#fef3c7' : '#94a3b8');
    }
  }

  function drawHintBox(c) {
    if (!hint || !hint.txt || !G.ui || !G.ui.hint) return;
    // evitar: la moto (con Mikey encima y su cartel) y el coche, en px de pantalla;
    // si la burbuja los tapa (p. ej., al salir volando de una rampa), se aclara sola
    var opts = { cara: 'secuaz', evitar: [] };
    var vs = [moto, car];
    for (var i = 0; i < vs.length; i++) {
      var v = vs[i];
      if (!v || v.ko) continue;
      var b = vbox(v), arriba = v.kind === 'moto' ? 70 : 24;
      opts.evitar.push({ x: b.x - 6, y: b.y - arriba, w: b.w + 12, h: b.h + arriba + 6 });
    }
    // en co-op, el recordatorio de teclas de cada jugador, solo los primeros 6 s
    if (coop && notaT < 6) {
      opts.nota = tk('En 2J — J1 Mikey: {ataque} disparar · {disparo} lanzador · {salto} saltar', 1) + ' | ' +
                  tk('J2 Director: {ataque} TURBO · {disparo} cañón', 2);
    } else {
      opts.nota = false;
    }
    try { G.ui.hint(c, hint.txt, opts); } catch (e) { /* nada */ }
  }

  function renderScene(c) {
    c.save();
    if (shake > 0) c.translate(rand(-shake, shake), rand(-shake, shake));
    drawBackground(c);
    drawCavern(c);
    var i;
    for (i = 0; i < world.length; i++) if (world[i].k === 'hueco') drawGap(c, world[i]);
    for (i = 0; i < drills.length; i++) if (drills[i].tipo === 'hueco' || drills[i].st === 'aviso') drawDrill(c, drills[i]);
    for (i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive) continue;
      if (o.k === 'rampa') drawRamp(c, o);
      else if (o.k === 'barricada') drawBarricade(c, o);
      else if (o.k === 'control') drawControl(c, o);
      else if (o.k === 'compuerta') drawGate(c, o);
    }
    drawExcavadora(c);
    for (i = 0; i < world.length; i++) {
      var w2 = world[i];
      if (!w2.alive) continue;
      if (w2.k === 'boxeador') drawBoxer(c, w2);
      else if (w2.k === 'corazon') drawHeartPick(c, w2);
    }
    if (phase === 'intro') drawIntro(c);
    else { drawVehicle(c, car); drawVehicle(c, moto); }
    for (i = 0; i < rocks.length; i++) drawRock(c, rocks[i]);
    for (i = 0; i < drills.length; i++) if (drills[i].tipo === 'rocas' && drills[i].st === 'taladro') drawDrill(c, drills[i]);
    for (i = 0; i < minis.length; i++) drawMini(c, minis[i]);
    for (i = 0; i < balls.length; i++) drawBall(c, balls[i]);
    for (i = 0; i < cannons.length; i++) {
      if (!gfx('drawLaserBolt', c, cannons[i].x, cannons[i].y, 26, '#22d3ee')) { c.fillStyle = '#22d3ee'; c.fillRect(cannons[i].x - 12, cannons[i].y - 3, 24, 6); }
    }
    drawSight(c);
    drawParticles(c);
    for (i = 0; i < texts.length; i++) {
      var tx = texts[i];
      c.save(); c.globalAlpha = clamp(tx.life / tx.max * 2, 0, 1);
      label(c, tx.txt, tx.x, tx.y, tx.size || 22, tx.col);
      c.restore();
    }
    if (phase === 'carrera') drawWarnings(c);
    c.restore();

    if (flash > 0) {
      c.save(); c.globalAlpha = clamp(flash / 0.25, 0, 1) * 0.3; c.fillStyle = phase === 'final' ? '#ffffff' : '#ff4d4d'; c.fillRect(0, 0, W, H); c.restore();
    }
    drawHud(c);
    if (phase === 'carrera') drawHintBox(c);
    if (bannerT > 0 && phase === 'carrera') {
      c.save(); c.globalAlpha = clamp(bannerT / 0.4, 0, 1);
      var sc = 1 + Math.max(0, bannerT - 1.8) * 0.6;
      c.translate(W / 2, 250); c.scale(sc, sc);
      label(c, '¡Tras Robovill!', 0, 0, 52, '#fdba74');
      c.restore();
    }
    if (phase === 'final' && finalT >= FINAL_TEXT_AT) {
      var k2 = clamp((finalT - FINAL_TEXT_AT) / 0.3, 0, 1);
      c.save(); c.globalAlpha = k2;
      c.translate(W / 2, 150); c.scale(0.8 + 0.2 * k2, 0.8 + 0.2 * k2);
      label(c, '¡La Gran Excavadora!', 0, 0, 50, '#fca5a5');
      label(c, '¡Hay que fusionarse!', 0, 52, 36, '#fde047');
      c.restore();
    }
    if (phase === 'lose' && loseT > 0.4) label(c, '¡Ay, la robot-moto!', W / 2, 260, 36, '#fca5a5');
  }
})();
