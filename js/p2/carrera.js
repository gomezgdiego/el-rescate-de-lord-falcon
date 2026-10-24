// carrera.js — PARTE 2, capítulo 2: "Carrera en robot" (G.scenes.levelP2_2).
// Vista lateral con avance automático (~112 s de recorrido a velocidad normal).
//  1) INTRO: el robot transformable ENEMIGO bloquea la carretera. Se hackea
//     manteniendo H 1.2 s (si nadie lo hace en 10 s, el Director lo hace solo).
//     El Director sube a la cabina y el robot se transforma en coche.
//  2) CARRERA: el Director conduce (Jugador 1): izquierda/derecha adelantan o
//     frenan dentro de la pantalla, jump = salto alto, attack = TURBO
//     (invulnerable, rompe barricadas), shoot = cañón frontal cian.
//     Lord Falcon va de pie en el techo: en co-op lo maneja el Jugador 2
//     (shoot/attack = flechas, up/down = apuntar); en 1 jugador dispara solo a
//     los drones. Obstáculos avisados: barricadas, huecos, robots boxeadores,
//     drones con bombas lentas (con sombra), barriles de Dark Secuaz y rampas.
//  3) META: la entrada de la fábrica → celebración → levelDoneP2 {chapter: 2}.
// Atajos de prueba (contrato §11): enter({saltarA: s}) y G.p2.debugInvulnerable
// (también enter({debugInvulnerable: true}), solo para capturas).
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  G.scenes = G.scenes || {};

  // ---------------------------------------------------------------------------
  //  Constantes
  // ---------------------------------------------------------------------------
  var W = 960, H = 540;
  var SUELO = 440;            // borde superior de la carretera (para el arte)
  var GROUND = 456;           // línea donde apoyan las ruedas y los pies
  // Dark Secuaz es un robot GIGANTE: el arte mide ~195 px a escala 1.
  var SECUAZ_SCALE = 0.85;
  var SECUAZ_H = Math.round(195 * SECUAZ_SCALE);      // alto en pantalla (pies → cabeza)
  var SECUAZ_FIST_DX = -Math.round(63 * SECUAZ_SCALE); // puño delantero (respecto a sus pies)
  var SECUAZ_FIST_DY = -Math.round(62 * SECUAZ_SCALE);
  var SPEED = 320;            // avance normal (px/s)
  var TURBO_MULT = 1.6;       // avance con turbo
  var GOAL_AT = 112;          // segundos de recorrido hasta la fábrica
  var LOOK = W + 120;         // un obstáculo con `at` entra en pantalla en ese segundo
  var GRAV = 1800;
  var JUMP_V = -840;          // salto alto y generoso (~196 px)
  var RAMP_V = -980;          // las rampas lanzan muy alto (~267 px)
  var CAR_S = 1.0;            // escala del coche
  var CAR_MIN_X = 110, CAR_MAX_X = 640;
  var INVULN = 1.5;
  var TURBO_TIME = 1.5, TURBO_CD = 3;
  var CANNON_CD = 0.28;
  var ARROW_SPEED = 640;
  var HACK_TIME = 1.2;
  var AUTO_HACK = 10;
  var ROBOT_X = 400;          // donde bloquea la carretera el robot enemigo
  var DOOR_STOP_X = 760;      // la carrera termina cuando la puerta llega aquí
  var DOOR_WX = GOAL_AT * SPEED + DOOR_STOP_X;

  // ---------------------------------------------------------------------------
  //  Utilidades seguras
  // ---------------------------------------------------------------------------
  function sfx(n) { try { G.audio && G.audio.sfx(n); } catch (e) { /* nada */ } }
  function music(n) { try { G.audio && G.audio.music(n); } catch (e) { /* nada */ } }
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
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function circleRect(cx, cy, r, b) {
    var nx = clamp(cx, b.x, b.x + b.w), ny = clamp(cy, b.y, b.y + b.h);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }
  function rrect(c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function label(c, t, x, y, size, col, align) {
    c.save();
    c.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    c.textAlign = align || 'center'; c.textBaseline = 'alphabetic';
    c.lineJoin = 'round'; c.miterLimit = 2; c.lineWidth = Math.max(3, size * 0.28);
    c.strokeStyle = '#1a1a2e'; c.strokeText(t, x, y);
    c.fillStyle = col || '#fef3c7'; c.fillText(t, x, y);
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
  function in1() { return G.input || NO_INPUT; }
  function in2() { return (coop && G.input2) ? G.input2 : NO_INPUT; }
  function wxAt(at) { return at * SPEED + LOOK; }

  // ---------------------------------------------------------------------------
  //  Recorrido (fijo y pensado a mano). `at` = segundo de recorrido en que el
  //  obstáculo entra por la derecha (a velocidad normal).
  // ---------------------------------------------------------------------------
  var WORLD_SCRIPT = [
    { k: 'B', at: 5 }, { k: 'B', at: 9 },
    { k: 'G', at: 13, w: 180 },
    { k: 'R', at: 17, medal: { i: 0, dx: 244, h: 280 } },
    { k: 'X', at: 22 }, { k: 'B', at: 25 },
    { k: 'H', at: 34, h: 60 },
    { k: 'G', at: 42, w: 200 },
    { k: 'H', at: 45.5, h: 40 },
    { k: 'B', at: 47.5 }, { k: 'X', at: 50 },
    { k: 'R', at: 58 },
    { k: 'G', at: 61.5, w: 240, medal: { i: 1, dx: 120, h: 150 } },
    { k: 'X', at: 65 }, { k: 'X', at: 67.5 },
    { k: 'B', at: 82 }, { k: 'G', at: 84.5, w: 200 }, { k: 'B', at: 87 },
    { k: 'H', at: 89, h: 50 },
    { k: 'R', at: 91, medal: { i: 2, dx: 248, h: 335 } },
    { k: 'X', at: 98 }, { k: 'B', at: 102 }, { k: 'G', at: 104.5, w: 200 }
  ];
  var EVENT_SCRIPT = [
    { k: 'secuaz', at: 0.5, dur: 4, throws: [], say: '¡Ja, ja! ¡La gema es mía!' },
    { k: 'picado', at: 27 },
    { k: 'secuaz', at: 30, dur: 10.5, throws: [2.2, 5.6, 9], say: '¡Tomad, barriles!' },
    { k: 'swarm', at: 52, n: 3 },
    { k: 'picado', at: 56.5 },
    { k: 'secuaz', at: 70, dur: 10.5, throws: [2, 5, 7.6, 9.6], say: '¡No me atraparéis!' },
    { k: 'picado', at: 77 },
    { k: 'swarm', at: 94.5, n: 4 },
    { k: 'picado', at: 100 },
    { k: 'secuazFinal', at: 105.5 }
  ];
  var WARN_NAMES = { B: '¡Barricada!', G: '¡Hueco!', R: '¡Rampa!', X: '¡Robot!' };

  // ---------------------------------------------------------------------------
  //  Estado de la escena
  // ---------------------------------------------------------------------------
  var coop = false, variant = 'A', debugLocal = false;
  var phase = 'intro', t = 0, raceT = 0, phaseT = 0, scroll = 0, speedNow = SPEED;
  var car, falcon, robot;
  var intro;               // {stage, hack, auto, idle, sayT, dir:{x,y}, fal:{x,y}}
  var world = [];          // obstáculos y objetos fijos en el mundo (wx)
  var drones = [], bombs = [], barrels = [], blasts = [];
  var shots = [], arrows = [];
  var parts = [], texts = [], explos = [];
  var secuaz;              // {on, x, mode, dur, timer, throws, warn, say, sayT}
  var evIdx = 0;
  var shake = 0, flash = 0, bannerT = 0, hintT = 0, hintText = '';
  var runMedals = [false, false, false];
  var winT = 0, loseT = 0, endGo = false;

  function debugInv() { return debugLocal || !!(G.p2 && G.p2.debugInvulnerable); }

  function carDims() {
    return variant === 'B' ? { w: 104 * CAR_S, h: 92 * CAR_S, roof: 120 * CAR_S, roofX: -2 }
                           : { w: 104 * CAR_S, h: 46 * CAR_S, roof: 53 * CAR_S, roofX: -5 };
  }
  function carBox() {
    var d = carDims();
    return { x: car.x - d.w / 2, y: car.y - d.h, w: d.w, h: d.h };
  }
  function falconPos() {
    var d = carDims();
    var cs = Math.cos(car.tilt), sn = Math.sin(car.tilt);
    var lx = d.roofX, ly = -d.roof;
    return { x: car.x + lx * cs - ly * sn, y: car.y + lx * sn + ly * cs };
  }

  // ---------------------------------------------------------------------------
  //  Construcción
  // ---------------------------------------------------------------------------
  function buildWorld(fromScroll) {
    world = [];
    for (var i = 0; i < WORLD_SCRIPT.length; i++) {
      var s = WORLD_SCRIPT[i], wx = wxAt(s.at);
      var o = null;
      if (s.k === 'B') o = { k: 'B', wx: wx, w: 54, h: 62, alive: true };
      else if (s.k === 'G') o = { k: 'G', wx: wx, w: s.w, alive: true };
      else if (s.k === 'R') o = { k: 'R', wx: wx, w: 132, h: 46, alive: true };
      else if (s.k === 'X') o = { k: 'X', wx: wx, y: GROUND, hp: 2, st: 'walk', tm: 0, alive: true };
      else if (s.k === 'H') o = { k: 'H', wx: wx, h: s.h || 40, alive: true, vy: 0 };
      if (!o) continue;
      if (o.wx + (o.w || 0) < fromScroll + W * 0.8 && fromScroll > 0) continue;
      world.push(o);
      if (s.medal) {
        var mwx = wx + s.medal.dx;
        if (!(fromScroll > 0 && mwx < fromScroll + W * 0.8)) {
          world.push({ k: 'M', wx: mwx, h: s.medal.h, i: s.medal.i, alive: true });
        }
      }
    }
  }

  function resetAll(params) {
    params = params || {};
    coop = !!(G.state && G.state.coop);
    debugLocal = !!params.debugInvulnerable;
    variant = (G.p2 && G.p2.vehicle && G.p2.vehicle.transformable === 'B') ? 'B' : 'A';
    if (G.state) {
      G.state.hp = G.state.maxHp || 10;
      if (coop) { G.state.maxHp2 = G.state.maxHp || 10; G.state.hp2 = G.state.hp; }
    }
    try { if (typeof G.p2resetRun === 'function') G.p2resetRun(); } catch (e) { /* nada */ }
    runMedals = [false, false, false];

    t = 0; raceT = 0; phaseT = 0; scroll = 0; speedNow = SPEED;
    drones = []; bombs = []; barrels = []; blasts = []; shots = []; arrows = [];
    parts = []; texts = []; explos = [];
    shake = 0; flash = 0; bannerT = 0; hintT = 0; hintText = '';
    winT = 0; loseT = 0; endGo = false;
    car = { x: ROBOT_X, y: GROUND, vx: 0, vy: 0, onGround: true, coyote: 0, jumpBuf: 0,
            invuln: 0, turbo: 0, turboCd: 0, cannonCd: 0, tilt: 0, falling: false, fade: 1 };
    falcon = { aim: -0.55, cd: 0, poseT: 0, aiCd: 1 };
    robot = { x: ROBOT_X, enemy: true };
    secuaz = { on: false, x: W + 140, mode: 'off', dur: 0, timer: 0, throws: [], ti: 0, warn: 0, say: '', sayT: 0 };
    intro = { stage: 'hack', hack: 0, auto: false, idle: 0, sayT: 0, st: 0,
              dir: { x: 170, y: GROUND, show: true }, fal: { x: 110, y: GROUND } };

    var skip = (typeof params.saltarA === 'number' && isFinite(params.saltarA)) ? params.saltarA : null;
    if (skip !== null) {
      skip = clamp(skip, 0, GOAL_AT - 2);
      phase = 'race';
      scroll = skip * SPEED;
      robot.enemy = false;
      intro.stage = 'done';
      car.x = 320;
      bannerT = 2;
    } else {
      phase = 'intro';
    }
    buildWorld(scroll);
    evIdx = 0;
    while (evIdx < EVENT_SCRIPT.length && EVENT_SCRIPT[evIdx].at * SPEED < scroll - 1) evIdx++;
  }

  // ---------------------------------------------------------------------------
  //  Efectos
  // ---------------------------------------------------------------------------
  function addText(txt, x, y, col, life) {
    texts.push({ txt: txt, x: x, y: y, col: col || '#fde047', life: life || 1.2, max: life || 1.2 });
  }
  function pop(x, y, big) {
    explos.push({ x: x, y: y, life: 0.45, max: 0.45, r: big ? 40 : 28 });
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
  function maybeHeart(sx, sy) {
    if (Math.random() < 0.25) {
      world.push({ k: 'H', wx: scroll + sx, h: clamp(GROUND - sy, 30, 300), alive: true, vy: 0, drop: true });
    }
  }

  // ---------------------------------------------------------------------------
  //  Daño y curación (la vida es la del coche; en co-op hp2 = hp)
  // ---------------------------------------------------------------------------
  function hurtCar() {
    if (phase !== 'race') return false;
    if (car.invuln > 0 || car.turbo > 0 || debugInv()) return false;
    G.state.hp = Math.max(0, (G.state.hp | 0) - 1);
    if (coop) G.state.hp2 = G.state.hp;
    car.invuln = INVULN;
    flash = 0.25; shake = Math.max(shake, 8);
    sfx('hurt');
    if (G.state.hp <= 0) { phase = 'lose'; loseT = 0; sfx('explosion'); pop(car.x, car.y - 30, true); }
    return true;
  }
  function healCar(n) {
    G.state.hp = Math.min(G.state.maxHp || 10, (G.state.hp | 0) + n);
    if (coop) G.state.hp2 = G.state.hp;
  }
  function takeMedal(i, x, y, byFalcon) {
    if (i < 0 || i > 2) return;
    runMedals[i] = true;
    try { if (G.p2 && G.p2.run && G.p2.run.medals) G.p2.run.medals[i] = true; } catch (e) { /* nada */ }
    sfx('medal');
    sparkles(x, y, 14, '#fde047');
    addText(byFalcon ? '¡Medalla! ¡Buena, Falcon!' : '¡Medalla!', x, y - 30, '#fde047', 1.4);
  }

  // ---------------------------------------------------------------------------
  //  INTRO (hackeo + transformación)
  // ---------------------------------------------------------------------------
  function updateIntro(dt) {
    var I = intro;
    I.st += dt;
    if (I.sayT > 0) I.sayT -= dt;
    if (I.stage === 'hack') {
      var holding = in1().held('hack') || in2().held('hack');
      if (holding) {
        I.idle = 0;
        if (I.hack === 0) sfx('hack');
        I.hack = Math.min(1, I.hack + dt / HACK_TIME);
      } else if (I.auto) {
        I.hack = Math.min(1, I.hack + dt / 0.5);
      } else {
        I.idle += dt;
        I.hack = Math.max(0, I.hack - dt * 0.6);
        if (I.idle >= AUTO_HACK) { I.auto = true; I.sayT = 2.2; sfx('hack'); }
      }
      if (I.hack >= 1) {
        I.stage = 'board'; I.st = 0;
        robot.enemy = false;
        sfx('hackOk');
        addText('¡Hackeado!', ROBOT_X, GROUND - 150, '#86efac', 1.3);
        sparkles(ROBOT_X, GROUND - 70, 12, '#67e8f9');
      }
    } else if (I.stage === 'board') {
      var p = clamp(I.st / 0.55, 0, 1);
      I.dir.x = 170 + (ROBOT_X - 170) * p;
      I.dir.y = GROUND - (90 * p) - Math.sin(p * Math.PI) * 110;
      if (I.st > 0 && I.st - dt <= 0) sfx('jump');
      if (p >= 1) {
        I.dir.show = false;
        I.stage = 'transform'; I.st = 0;
        sfx('transform');
      }
    } else if (I.stage === 'transform') {
      if (I.st >= 0.33 && I.st - dt < 0.33) { sparkles(ROBOT_X, GROUND - 60, 18, '#a5f3fc'); shake = 5; }
      if (I.st >= 0.7) {
        I.stage = 'done';
        phase = 'race'; raceT = 0; bannerT = 2.2;
        hintText = coop ? '¡Salta con W, TURBO con F y cañón con G! Falcon dispara con L.'
                        : '¡Salta con ESPACIO, TURBO con J y cañón con K!';
        hintT = 5;
        sfx('boost');
      }
    }
    // Lord Falcon salta al techo durante la subida y la transformación
    if (I.stage === 'board' || I.stage === 'transform') {
      var tt = (I.stage === 'board' ? I.st : 0.55 + I.st) / 1.25;
      tt = clamp(tt, 0, 1);
      var d = carDims();
      var tx = ROBOT_X + d.roofX, ty = GROUND - d.roof;
      I.fal.x = 110 + (tx - 110) * tt;
      I.fal.y = GROUND + (ty - GROUND) * tt - Math.sin(tt * Math.PI) * 130;
    }
    // Dark Secuaz huye al fondo durante los primeros segundos
    updateSecuazIntro(dt);
  }
  function updateSecuazIntro(dt) {
    if (t < 0.05 && !secuaz.on) {
      secuaz.on = true; secuaz.mode = 'leave'; secuaz.x = 720; secuaz.say = '¡Ja, ja! ¡La gema es mía!'; secuaz.sayT = 2.4;
    }
    if (secuaz.on && secuaz.mode === 'leave') {
      if (secuaz.sayT > 0) secuaz.sayT -= dt;
      else secuaz.x += 260 * dt;
      if (secuaz.x > W + 160) { secuaz.on = false; secuaz.mode = 'off'; }
    }
  }

  // ---------------------------------------------------------------------------
  //  CARRERA
  // ---------------------------------------------------------------------------
  function overGap(wxCenter) {
    for (var i = 0; i < world.length; i++) {
      var o = world[i];
      if (o.k === 'G' && wxCenter > o.wx + 18 && wxCenter < o.wx + o.w - 18) return true;
    }
    return false;
  }

  function updateCar(dt) {
    var a = in1();
    // Horizontal: adelantar / frenar dentro de la pantalla
    var target = 0;
    if (a.held('left')) target -= 300;
    if (a.held('right')) target += 300;
    car.vx += (target - car.vx) * Math.min(1, dt * 8);
    car.x = clamp(car.x + car.vx * dt, CAR_MIN_X, CAR_MAX_X);

    // Salto (con margen y búfer generosos)
    if (a.pressed('jump') || a.pressed('up')) car.jumpBuf = 0.14;
    if (car.jumpBuf > 0) car.jumpBuf -= dt;
    if (car.coyote > 0) car.coyote -= dt;
    if (car.jumpBuf > 0 && (car.onGround || car.coyote > 0) && !car.falling) {
      car.vy = JUMP_V; car.onGround = false; car.coyote = 0; car.jumpBuf = 0;
      sfx('jump');
    }

    // Turbo
    if (car.turboCd > 0) car.turboCd -= dt;
    if (car.turbo > 0) {
      car.turbo -= dt;
      if (car.turbo <= 0) { car.turbo = 0; car.turboCd = TURBO_CD; }
      if (Math.random() < 0.6) parts.push({ x: car.x - 70, y: car.y - rand(10, 40), vx: rand(-400, -250), vy: rand(-20, 20), life: 0.3, max: 0.3, kind: 'line', col: '#a5f3fc', r: 2 });
    } else if (a.pressed('attack') && car.turboCd <= 0) {
      car.turbo = TURBO_TIME;
      sfx('boost');
      addText('¡TURBO!', car.x, car.y - 90, '#67e8f9', 0.8);
    }

    // Cañón frontal cian
    if (car.cannonCd > 0) car.cannonCd -= dt;
    if (a.held('shoot') && car.cannonCd <= 0) {
      car.cannonCd = CANNON_CD;
      shots.push({ x: car.x + 64, y: car.y - (variant === 'B' ? 60 : 22), vx: 780, life: 1.2 });
      sfx('laser');
    }

    // Vertical
    var wasGround = car.onGround;
    car.vy += GRAV * dt;
    car.y += car.vy * dt;
    var gap = overGap(scroll + car.x);
    if (!gap && !car.falling) {
      if (car.y >= GROUND) {
        if (!wasGround && car.vy > 300) { shake = Math.max(shake, 3); dust(car.x, GROUND); }
        car.y = GROUND; car.vy = 0; car.onGround = true; car.coyote = 0.1;
      } else {
        car.onGround = false;
      }
    } else {
      if (car.onGround && gap) { car.onGround = false; car.coyote = 0.1; }
      if (car.y > GROUND + 4 && gap) car.falling = true;
      // muelle de rescate: del hueco sale rebotando hacia arriba (con medio corazón)
      if (car.y > GROUND + 70) {
        car.vy = -980; car.falling = false;
        if (hurtCar()) addText('¡Boing!', car.x, GROUND - 40, '#fca5a5', 0.9);
        sfx('jump');
      }
      if (!gap && car.y >= GROUND && car.vy >= 0) { car.falling = false; car.y = GROUND; car.vy = 0; car.onGround = true; }
    }
    // inclinación en el aire
    var tilt = car.onGround ? 0 : clamp(car.vy * 0.00028, -0.22, 0.22);
    car.tilt += (tilt - car.tilt) * Math.min(1, dt * 10);
    if (car.invuln > 0) car.invuln -= dt;
  }
  function dust(x, y) {
    for (var i = 0; i < 6; i++) {
      parts.push({ x: x + rand(-50, 50), y: y - 4, vx: rand(-120, 40), vy: rand(-80, -20), life: 0.5, max: 0.5, kind: 'smoke', col: '#cbd5e1', r: rand(5, 9) });
    }
  }

  function updateFalcon(dt) {
    if (falcon.cd > 0) falcon.cd -= dt;
    if (falcon.poseT > 0) falcon.poseT -= dt;
    var fp = falconPos();
    var ox = fp.x + 8, oy = fp.y - 34;
    var live = arrows.length;
    if (coop) {
      var b = in2();
      if (b.held('up')) falcon.aim -= 1.7 * dt;
      if (b.held('down')) falcon.aim += 1.7 * dt;
      falcon.aim = clamp(falcon.aim, -1.45, 0.2);
      if ((b.held('shoot') || b.held('attack')) && falcon.cd <= 0 && live < 4) {
        fireArrow(ox, oy, falcon.aim);
      }
    } else {
      // IA: dispara sola a los drones que tiene delante
      if (falcon.aiCd > 0) falcon.aiCd -= dt;
      if (falcon.aiCd <= 0) {
        var best = null, bd = 1e9;
        for (var j = 0; j < drones.length; j++) {
          var d = drones[j];
          if (!d.alive || d.x < 20 || d.x > W - 20 || d.y < 10) continue;
          var dist = Math.abs(d.x - ox) + Math.abs(d.y - oy);
          if (dist < bd) { bd = dist; best = d; }
        }
        if (best) {
          var tt = Math.sqrt((best.x - ox) * (best.x - ox) + (best.y - oy) * (best.y - oy)) / ARROW_SPEED;
          var tx = best.x + (best.vx || 0) * tt, ty = best.y + (best.vy || 0) * tt - 110 * tt * tt;
          var ang = Math.atan2(ty - oy, tx - ox);
          falcon.aim = ang;
          fireArrow(ox, oy, ang);
          falcon.aiCd = 0.85;
        } else {
          falcon.aiCd = 0.2;
          falcon.aim += (-0.55 - falcon.aim) * Math.min(1, dt * 3);
        }
      }
    }
  }
  function fireArrow(x, y, ang) {
    arrows.push({ x: x, y: y, vx: Math.cos(ang) * ARROW_SPEED, vy: Math.sin(ang) * ARROW_SPEED, life: 1.6 });
    falcon.cd = 0.3; falcon.poseT = 0.25;
    sfx('arrow');
  }

  // --- Eventos por tiempo de recorrido (drones, Dark Secuaz) ---
  function runEvents() {
    while (evIdx < EVENT_SCRIPT.length && scroll >= EVENT_SCRIPT[evIdx].at * SPEED) {
      var ev = EVENT_SCRIPT[evIdx++];
      if (ev.k === 'picado') spawnPicado();
      else if (ev.k === 'swarm') spawnSwarm(ev.n || 3);
      else if (ev.k === 'secuaz') startSecuaz(ev);
      else if (ev.k === 'secuazFinal') startSecuaz({ dur: 99, throws: [], say: '¡A mi fábrica!', final: true });
    }
  }
  function spawnPicado() {
    drones.push({ k: 'picado', x: W + 50, y: 200, vx: -200, vy: 0, alive: true, st: 'enter', tm: 0, dives: 0,
                  maxDives: 2, ang: Math.PI, tx: 0, ty: 0 });
  }
  function spawnSwarm(n) {
    var grp = { cx: W + 120, cy: 215, t: 0, next: 1.2, left: n * 2, leaving: false };
    for (var i = 0; i < n; i++) {
      drones.push({ k: 'swarm', grp: grp, slot: i, n: n, x: W + 120, y: 215, vx: 0, vy: 0, alive: true, warn: 0 });
    }
  }
  function startSecuaz(ev) {
    secuaz.on = true; secuaz.mode = 'enter'; secuaz.x = W + 120; secuaz.dur = ev.dur || 8; secuaz.timer = 0;
    secuaz.throws = (ev.throws || []).slice(); secuaz.ti = 0; secuaz.warn = 0;
    secuaz.say = ev.say || ''; secuaz.sayT = ev.say ? 2.2 : 0; secuaz.final = !!ev.final;
  }

  function updateSecuaz(dt) {
    if (!secuaz.on) return;
    secuaz.timer += dt;
    if (secuaz.sayT > 0) secuaz.sayT -= dt;
    if (secuaz.mode === 'enter') {
      secuaz.x += (860 - secuaz.x) * Math.min(1, dt * 2.5);
      if (Math.abs(secuaz.x - 860) < 4) secuaz.mode = 'stay';
    }
    if (secuaz.final) {
      // entra corriendo en la fábrica (que va apareciendo por la derecha)
      var doorX = DOOR_WX - scroll;
      if (doorX < W + 200 && secuaz.mode !== 'gone') {
        secuaz.mode = 'final';
        secuaz.x += (doorX - secuaz.x) * Math.min(1, dt * 3);
        if (Math.abs(secuaz.x - doorX) < 18) { secuaz.mode = 'gone'; secuaz.on = false; sfx('door'); }
      }
      return;
    }
    if (secuaz.mode === 'stay' || secuaz.mode === 'enter') {
      if (secuaz.warn > 0) {
        secuaz.warn -= dt;
        if (secuaz.warn <= 0) {
          barrels.push({ x: secuaz.x + SECUAZ_FIST_DX, y: GROUND + SECUAZ_FIST_DY, vx: -330, vy: -180, r: 19, rot: 0, alive: true });
          sfx('punch');
        }
      } else if (secuaz.ti < secuaz.throws.length && secuaz.timer >= secuaz.throws[secuaz.ti]) {
        secuaz.ti++;
        secuaz.warn = 0.75;
      }
      if (secuaz.timer >= secuaz.dur && secuaz.warn <= 0) secuaz.mode = 'leave';
    }
    if (secuaz.mode === 'leave') {
      secuaz.x += 300 * dt;
      if (secuaz.x > W + 160) { secuaz.on = false; secuaz.mode = 'off'; }
    }
  }

  function updateDrones(dt) {
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i];
      if (!d.alive) continue;
      if (d.k === 'picado') {
        d.tm += dt;
        if (d.st === 'enter') {
          var hx = clamp(car.x + 90, 260, 760);
          d.x += (hx - d.x) * Math.min(1, dt * 2); d.y += (200 - d.y) * Math.min(1, dt * 2);
          d.vx = 0; d.vy = 0; d.ang = Math.PI * 0.5;
          if (d.tm > 1.6) { d.st = 'warn'; d.tm = 0; d.tx = car.x; d.ty = GROUND - 24; sfx('zap'); }
        } else if (d.st === 'warn') {
          d.ang = Math.atan2(d.ty - d.y, d.tx - d.x);
          if (d.tm > 0.7) { d.st = 'dive'; d.tm = 0; sfx('laser'); }
        } else if (d.st === 'dive') {
          var dx = d.tx - d.x, dy = d.ty - d.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
          d.vx = dx / L * 380; d.vy = dy / L * 380;
          d.x += d.vx * dt; d.y += d.vy * dt; d.ang = Math.atan2(d.vy, d.vx);
          if (L < 12 || d.y >= GROUND - 26) {
            d.dives++; d.st = d.dives >= d.maxDives ? 'away' : 'up'; d.tm = 0; dust(d.x, GROUND);
          }
        } else if (d.st === 'up') {
          d.vx = 40; d.vy = -260; d.x += d.vx * dt; d.y += d.vy * dt; d.ang = -Math.PI / 2;
          if (d.y < 200) { d.st = 'enter'; d.tm = 0.6; }
        } else {
          d.vx = -160; d.vy = -230; d.x += d.vx * dt; d.y += d.vy * dt; d.ang = Math.atan2(d.vy, d.vx);
          if (d.y < -60 || d.x < -60) d.alive = false;
        }
      } else {
        var g = d.grp;
        if (d.slot === firstAliveSlot(g)) {
          g.t += dt;
          if (!g.leaving) {
            var gx = clamp(car.x + 70, 300, 700);
            g.cx += (gx - g.cx) * Math.min(1, dt * 1.2);
            g.cy = 215 + Math.sin(g.t * 1.6) * 14;
            g.next -= dt;
            if (g.next <= 0 && g.left > 0) {
              var cand = aliveOf(g);
              if (cand.length) { var who = cand[(g.left) % cand.length]; who.warn = 0.65; sfx('zap'); }
              g.left--; g.next = 1.35;
            }
            if (g.left <= 0 && g.next < 0.2) g.leaving = true;
          } else {
            g.cx -= 220 * dt; g.cy -= 120 * dt;
          }
        }
        var ox = (d.slot - (d.n - 1) / 2) * 52, oy = Math.abs(d.slot - (d.n - 1) / 2) * -18;
        var nx = g.cx + ox, ny = g.cy + oy + Math.sin(g.t * 4 + d.slot) * 4;
        d.vx = (nx - d.x) * 6; d.vy = 0;
        d.x += (nx - d.x) * Math.min(1, dt * 6); d.y += (ny - d.y) * Math.min(1, dt * 6);
        if (d.warn > 0) {
          d.warn -= dt;
          if (d.warn <= 0) { bombs.push({ x: d.x, y: d.y + 14, vx: -20, vy: 115, r: 11, alive: true, y0: d.y + 14 }); sfx('clink'); }
        }
        if (g.leaving && (d.x < -60 || d.y < -60)) d.alive = false;
      }
      // contacto con el coche
      if (d.alive && phase === 'race' && circleRect(d.x, d.y, 16, carBox())) {
        if (car.turbo > 0) { killDrone(d); }
        else if (hurtCar()) { killDrone(d); }
      }
    }
    drones = drones.filter(function (q) { return q.alive; });
  }
  function firstAliveSlot(g) {
    for (var i = 0; i < drones.length; i++) if (drones[i].alive && drones[i].grp === g) return drones[i].slot;
    return -1;
  }
  function aliveOf(g) {
    var r = [];
    for (var i = 0; i < drones.length; i++) if (drones[i].alive && drones[i].grp === g) r.push(drones[i]);
    return r;
  }
  function killDrone(d) {
    if (!d.alive) return;
    d.alive = false; pop(d.x, d.y, false); sfx('explosion'); maybeHeart(d.x, d.y);
  }

  function updateBombs(dt) {
    for (var i = 0; i < bombs.length; i++) {
      var b = bombs[i];
      if (!b.alive) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y >= GROUND - 10) {
        b.alive = false;
        blasts.push({ x: b.x, y: GROUND - 18, r: 46, life: 0.3, max: 0.3, hit: false });
        explos.push({ x: b.x, y: GROUND - 18, life: 0.45, max: 0.45, r: 36 });
        sfx('explosion'); shake = Math.max(shake, 4);
      } else if (circleRect(b.x, b.y, b.r, carBox())) {
        b.alive = false; pop(b.x, b.y, false); sfx('explosion');
        if (car.turbo <= 0) hurtCar();
      }
    }
    bombs = bombs.filter(function (q) { return q.alive; });
    for (var j = 0; j < blasts.length; j++) {
      var bl = blasts[j];
      bl.life -= dt;
      if (!bl.hit && circleRect(bl.x, bl.y, bl.r, carBox())) { bl.hit = true; hurtCar(); }
    }
    blasts = blasts.filter(function (q) { return q.life > 0; });
  }

  function updateBarrels(dt) {
    for (var i = 0; i < barrels.length; i++) {
      var b = barrels[i];
      if (!b.alive) continue;
      b.vy += 900 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.rot += b.vx * dt / b.r;
      if (b.y >= GROUND - b.r) { b.y = GROUND - b.r; b.vy = b.vy > 200 ? -b.vy * 0.35 : 0; }
      if (b.x < -60) { b.alive = false; continue; }
      if (phase === 'race' && circleRect(b.x, b.y, b.r - 3, carBox())) {
        b.alive = false; pop(b.x, b.y, false); sfx('explosion');
        if (car.turbo <= 0) hurtCar();
      }
    }
    barrels = barrels.filter(function (q) { return q.alive; });
  }

  function updateWorld(dt) {
    var box = carBox();
    for (var i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive) continue;
      var sx = o.wx - scroll;
      if (sx + (o.w || 60) < -200) { o.alive = false; continue; }
      if (sx > W + 700) continue;
      if (o.k === 'B') {
        var bb = { x: sx, y: GROUND - o.h, w: o.w, h: o.h };
        if (overlap(box, bb)) {
          o.alive = false; pop(sx + o.w / 2, GROUND - 30, true); sfx('explosion');
          if (car.turbo > 0) addText('¡CRASH!', sx + o.w / 2, GROUND - 90, '#67e8f9', 0.8);
          else hurtCar();
        }
      } else if (o.k === 'R') {
        var cwx = scroll + car.x;
        if (car.onGround && cwx > o.wx + 50 && cwx < o.wx + o.w + 10) {
          car.vy = RAMP_V; car.onGround = false; car.coyote = 0;
          sfx('jump'); addText('¡Despegue!', car.x, car.y - 100, '#fde047', 0.9);
        }
      } else if (o.k === 'X') {
        updateBoxer(o, sx, dt, box);
      } else if (o.k === 'H') {
        if (o.drop && o.h > 34) { o.vy += 500 * dt; o.h = Math.max(34, o.h - o.vy * dt); }
        var hy = GROUND - o.h + Math.sin(t * 4 + o.wx) * 4;
        if (circleRect(sx, hy, 22, box) || (Math.abs(falconPos().x - sx) < 30 && Math.abs(falconPos().y - 30 - hy) < 40)) {
          o.alive = false; healCar(2); sfx('pickup'); addText('+1 ♥', sx, hy - 20, '#fda4af', 1);
        }
      } else if (o.k === 'M') {
        var my = GROUND - o.h + Math.sin(t * 3 + o.i) * 5;
        var fp = falconPos();
        var byCar = circleRect(sx, my, 26, box);
        var byFal = Math.abs(fp.x - sx) < 34 && my > fp.y - 80 && my < fp.y + 10;
        if (byCar || byFal) { o.alive = false; takeMedal(o.i, sx, my, byFal && !byCar); }
      }
    }
    world = world.filter(function (q) { return q.alive || q.k === 'G'; });
  }

  function updateBoxer(o, sx, dt, box) {
    if (o.st === 'walk') {
      o.wx -= 34 * dt;
      if (sx > car.x && sx - car.x < 250 && car.y > GROUND - 80) { o.st = 'warn'; o.tm = 0.5; }
    } else if (o.st === 'warn') {
      o.tm -= dt;
      if (o.tm <= 0) { o.st = 'punch'; o.tm = 0.35; sfx('punch'); }
    } else if (o.st === 'punch') {
      o.tm -= dt;
      if (overlap(box, { x: sx - 60, y: GROUND - 50, w: 50, h: 22 })) {
        if (car.turbo <= 0) hurtCar();
      }
      if (o.tm <= 0) { o.st = 'cool'; o.tm = 0.8; }
    } else if (o.st === 'cool') {
      o.tm -= dt;
      if (o.tm <= 0) o.st = 'walk';
    }
    var body = { x: sx - 18, y: GROUND - 58, w: 36, h: 58 };
    if (overlap(box, body)) {
      if (car.turbo > 0) { killBoxer(o, sx); addText('¡POP!', sx, GROUND - 90, '#67e8f9', 0.8); }
      else if (car.vy > 0 && car.y < body.y + 22) {
        killBoxer(o, sx); car.vy = -620; sfx('punch'); addText('¡Chafado!', sx, GROUND - 90, '#fde047', 0.8);
      } else if (hurtCar()) { o.wx += 40; }
    }
  }
  function killBoxer(o, sx) {
    if (!o.alive) return;
    o.alive = false; pop(sx, GROUND - 30, false); sfx('explosion'); maybeHeart(sx, GROUND - 40);
  }

  function updateShots(dt) {
    var i, j, s, o, sx;
    for (i = 0; i < shots.length; i++) {
      s = shots[i];
      s.x += s.vx * dt; s.life -= dt;
      if (s.x > W + 30) s.life = 0;
      if (s.life <= 0) continue;
      for (j = 0; j < world.length && s.life > 0; j++) {
        o = world[j];
        if (!o.alive) continue;
        sx = o.wx - scroll;
        if (o.k === 'X' && overlap({ x: s.x - 10, y: s.y - 4, w: 20, h: 8 }, { x: sx - 18, y: GROUND - 58, w: 36, h: 58 })) {
          s.life = 0; o.hp -= 1; sfx('hit'); sparkles(sx, GROUND - 40, 3, '#67e8f9');
          if (o.hp <= 0) killBoxer(o, sx);
        } else if (o.k === 'B' && overlap({ x: s.x - 10, y: s.y - 4, w: 20, h: 8 }, { x: sx, y: GROUND - o.h, w: o.w, h: o.h })) {
          s.life = 0; sfx('clink'); sparkles(sx, s.y, 2, '#e2e8f0');
        }
      }
      hitFlying(s, 12);
    }
    shots = shots.filter(function (q) { return q.life > 0; });
    for (i = 0; i < arrows.length; i++) {
      var a = arrows[i];
      a.vy += 220 * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
      if (a.x > W + 40 || a.x < -40 || a.y < -60 || a.y > GROUND) a.life = 0;
      if (a.life <= 0) continue;
      for (j = 0; j < world.length && a.life > 0; j++) {
        o = world[j];
        if (!o.alive || o.k !== 'X') continue;
        sx = o.wx - scroll;
        if (circleRect(a.x, a.y, 6, { x: sx - 18, y: GROUND - 58, w: 36, h: 58 })) {
          a.life = 0; o.hp -= 1; sfx('hit'); if (o.hp <= 0) killBoxer(o, sx);
        }
      }
      hitFlying(a, 10);
    }
    arrows = arrows.filter(function (q) { return q.life > 0; });
  }
  function hitFlying(p, r) {
    var k;
    if (p.life <= 0) return;
    for (k = 0; k < drones.length; k++) {
      var d = drones[k];
      if (d.alive && Math.abs(d.x - p.x) < 18 + r && Math.abs(d.y - p.y) < 16 + r) { p.life = 0; killDrone(d); return; }
    }
    for (k = 0; k < bombs.length; k++) {
      var b = bombs[k];
      if (b.alive && Math.abs(b.x - p.x) < b.r + r && Math.abs(b.y - p.y) < b.r + r) {
        p.life = 0; b.alive = false; pop(b.x, b.y, false); sfx('explosion'); return;
      }
    }
    for (k = 0; k < barrels.length; k++) {
      var br = barrels[k];
      if (br.alive && Math.abs(br.x - p.x) < br.r + r && Math.abs(br.y - p.y) < br.r + r) {
        p.life = 0; br.alive = false; pop(br.x, br.y, false); sfx('explosion'); return;
      }
    }
  }

  function updateEffects(dt) {
    var i;
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind !== 'line' && p.kind !== 'smoke') p.vy += 500 * dt;
      if (p.kind === 'smoke') { p.vy *= 0.96; p.r += dt * 10; }
    }
    parts = parts.filter(function (q) { return q.life > 0; });
    if (parts.length > 260) parts.splice(0, parts.length - 260);
    for (i = 0; i < texts.length; i++) { texts[i].life -= dt; texts[i].y -= 34 * dt; }
    texts = texts.filter(function (q) { return q.life > 0; });
    for (i = 0; i < explos.length; i++) explos[i].life -= dt;
    explos = explos.filter(function (q) { return q.life > 0; });
    if (shake > 0) shake = Math.max(0, shake - dt * 24);
    if (flash > 0) flash -= dt;
    if (bannerT > 0) bannerT -= dt;
    if (hintT > 0) hintT -= dt;
  }

  function contextualHints() {
    if (hintT > 0) return;
    for (var i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive || o.hinted) continue;
      var sx = o.wx - scroll;
      if (sx < W + 600 && sx > W + 120) {
        if (o.k === 'G' && !seen.G) { seen.G = true; o.hinted = true; hintText = coop ? '¡Un hueco! Salta con W para cruzarlo.' : '¡Un hueco! Salta con ESPACIO para cruzarlo.'; hintT = 2.6; return; }
        if (o.k === 'B' && !seen.B) { seen.B = true; o.hinted = true; hintText = '¡Barricada! Sáltala o rómpela con el TURBO (' + (coop ? 'F' : 'J') + ').'; hintT = 2.6; return; }
        if (o.k === 'R' && !seen.R) { seen.R = true; o.hinted = true; hintText = '¡Una rampa! Te lanzará por los aires.'; hintT = 2.4; return; }
      }
    }
    if (bombs.length && !seen.bomb) { seen.bomb = true; hintText = '¡Bombas! Mira su sombra en el suelo y apártate.'; hintT = 3.2; }
  }
  var seen = {};

  // ---------------------------------------------------------------------------
  //  ESCENA
  // ---------------------------------------------------------------------------
  G.scenes.levelP2_2 = {
    enter: function (params) {
      seen = {};
      resetAll(params);
      music('race');
    },
    exit: function () {
      drones = []; bombs = []; barrels = []; blasts = []; shots = []; arrows = [];
      parts = []; texts = []; explos = []; world = [];
    },
    update: function (dt) {
      try { updateScene(dt); } catch (e) { if (window.console) console.warn('[carrera] update', e); }
    },
    render: function (ctx) {
      try { renderScene(ctx); } catch (e) { if (window.console) console.warn('[carrera] render', e); }
    },
    // Ayudas para pruebas automáticas (no cambian el juego normal)
    __debug: {
      phase: function () { return phase; },
      route: function () { return scroll / SPEED; },
      car: function () { return car; },
      medals: function () { return runMedals.slice(); }
    }
  };

  function updateScene(dt) {
    t += dt; phaseT += dt;
    if (coop && G.state) G.state.hp2 = G.state.hp;
    updateEffects(dt);

    if (phase === 'intro') {
      updateIntro(dt);
      return;
    }
    if (phase === 'lose') {
      loseT += dt;
      car.tilt += dt * 6;
      car.vy += GRAV * 0.4 * dt; car.y = Math.min(GROUND, car.y + car.vy * dt);
      speedNow = Math.max(0, speedNow - 500 * dt); scroll += speedNow * dt;
      if (Math.random() < 0.5) parts.push({ x: car.x + rand(-30, 30), y: car.y - 40, vx: rand(-30, 30), vy: rand(-90, -40), life: 0.8, max: 0.8, kind: 'smoke', col: '#64748b', r: rand(6, 10) });
      if (loseT > 1.4 && !endGo) { endGo = true; G.go('gameover', { retry: 'levelP2_2' }); }
      return;
    }
    if (phase === 'win') {
      winT += dt;
      speedNow = Math.max(0, speedNow - 420 * dt); scroll += speedNow * dt;
      var doorX = DOOR_WX - scroll;
      car.vy += GRAV * dt; car.y = Math.min(GROUND, car.y + car.vy * dt); if (car.y >= GROUND) { car.vy = 0; car.onGround = true; }
      car.tilt *= 0.9;
      if (winT > 0.6) { car.x += (doorX - car.x) * Math.min(1, dt * 1.6); car.fade = Math.max(0, car.fade - dt * 0.7); }
      if (Math.random() < 0.5) parts.push({ x: rand(0, W), y: -10, vx: rand(-40, 40), vy: rand(60, 160), life: 2.5, max: 2.5, kind: 'conf', col: ['#fde047', '#67e8f9', '#86efac', '#f9a8d4'][Math.floor(rand(0, 4))], r: rand(3, 5) });
      if (winT > 3.6 && !endGo) {
        endGo = true;
        if (G.scenes.levelDoneP2) G.go('levelDoneP2', { chapter: 2 });
        else G.go('title');
      }
      return;
    }

    // --- phase === 'race' ---
    raceT += dt;
    speedNow = SPEED * (car.turbo > 0 ? TURBO_MULT : 1);
    scroll += speedNow * dt;
    runEvents();
    updateCar(dt);
    updateFalcon(dt);
    updateSecuaz(dt);
    updateDrones(dt);
    updateBombs(dt);
    updateBarrels(dt);
    updateWorld(dt);
    updateShots(dt);
    contextualHints();
    if (phase === 'race' && scroll >= DOOR_WX - DOOR_STOP_X) {
      phase = 'win'; winT = 0;
      car.invuln = 0; car.turbo = 0;
      bombs = []; barrels = []; blasts = [];
      drones.forEach(function (d) { pop(d.x, d.y, false); }); drones = [];
      sfx('victory');
      addText('¡Llegamos a la fábrica!', W / 2, 200, '#fde047', 2.5);
    }
  }

  // ---------------------------------------------------------------------------
  //  DIBUJO
  // ---------------------------------------------------------------------------
  function drawBackground(c) {
    if (!art('bgCarretera', c, scroll, t)) {
      var g = c.createLinearGradient(0, 0, 0, SUELO);
      g.addColorStop(0, '#3b1d6e'); g.addColorStop(0.55, '#c2410c'); g.addColorStop(1, '#fbbf24');
      c.fillStyle = g; c.fillRect(0, 0, W, SUELO + 2);
      c.fillStyle = '#fde68a'; c.beginPath(); c.arc(700, 300, 60, 0, Math.PI * 2); c.fill();
      var layers = [[0.15, '#4c1d95', 180, 90], [0.4, '#312e81', 120, 150]];
      for (var L = 0; L < layers.length; L++) {
        var f = layers[L][0], col = layers[L][1], bw = layers[L][2];
        c.fillStyle = col;
        var off = -((scroll * f) % bw);
        for (var x = off - bw; x < W + bw; x += bw) {
          var k = Math.abs(Math.floor((x - off) / bw + scroll * f / bw)) % 5;
          var hh = layers[L][3] + k * 22;
          c.fillRect(x + 10, SUELO - hh, bw - 30, hh);
        }
      }
    }
    if (!art('carretera', c, scroll, SUELO, t)) {
      c.fillStyle = '#374151'; c.fillRect(0, SUELO, W, H - SUELO);
      c.fillStyle = '#9ca3af'; c.fillRect(0, SUELO, W, 6);
      c.fillStyle = '#fde047';
      var o2 = -(scroll % 80);
      for (var x2 = o2; x2 < W; x2 += 80) c.fillRect(x2, SUELO + 50, 44, 6);
    }
  }

  function drawGap(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 10 || sx + o.w < -10) return;
    c.save();
    var g = c.createLinearGradient(0, SUELO, 0, H);
    g.addColorStop(0, '#0f0a1e'); g.addColorStop(1, '#000000');
    c.fillStyle = g;
    c.fillRect(sx, SUELO - 1, o.w, H - SUELO + 2);
    // bordes rotos del asfalto
    c.fillStyle = '#4b5563'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    [[sx, 1], [sx + o.w, -1]].forEach(function (e) {
      c.beginPath();
      c.moveTo(e[0], SUELO - 1);
      for (var yy = SUELO; yy <= H; yy += 16) c.lineTo(e[0] + e[1] * (((yy / 16) | 0) % 2 ? 10 : 2), yy);
      c.lineTo(e[0] - e[1] * 6, H); c.lineTo(e[0] - e[1] * 6, SUELO - 1); c.closePath();
      c.fill(); c.stroke();
    });
    // conos de aviso en el borde
    cone(c, sx - 14, SUELO + 4); cone(c, sx + o.w + 14, SUELO + 4);
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
    c.fillStyle = '#facc15'; c.fill();
    c.save(); c.clip();
    c.fillStyle = '#1a1a2e';
    for (var k = -2; k < 10; k++) {
      c.beginPath(); var bx = sx + k * 22;
      c.moveTo(bx, GROUND); c.lineTo(bx + 11, GROUND); c.lineTo(bx + 11 + 40, GROUND - 60); c.lineTo(bx + 40, GROUND - 60); c.closePath(); c.fill();
    }
    c.restore();
    c.beginPath(); c.moveTo(sx, GROUND); c.lineTo(sx + o.w, GROUND - o.h); c.lineTo(sx + o.w, GROUND); c.closePath();
    c.strokeStyle = '#1a1a2e'; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
    c.fillStyle = '#94a3b8'; c.fillRect(sx + o.w - 8, GROUND - o.h, 8, o.h);
    c.strokeRect(sx + o.w - 8, GROUND - o.h, 8, o.h);
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
    // tablón rayado rojo y blanco
    c.save(); rrect(c, sx - 4, top, o.w + 8, 30, 6); c.clip();
    c.fillStyle = '#f8fafc'; c.fillRect(sx - 4, top, o.w + 8, 30);
    c.fillStyle = '#dc2626';
    for (var k = -2; k < 6; k++) { c.beginPath(); var bx = sx + k * 18; c.moveTo(bx, top + 30); c.lineTo(bx + 9, top + 30); c.lineTo(bx + 27, top); c.lineTo(bx + 18, top); c.closePath(); c.fill(); }
    c.restore();
    rrect(c, sx - 4, top, o.w + 8, 30, 6); c.stroke();
    // marca de Dark Toros
    if (window.P2 && P2.horns) { try { P2.horns(c, sx + o.w / 2, top + 22, 0.45, '#b87333'); } catch (e) { /* nada */ } }
    c.fillStyle = '#fbbf24';
    c.beginPath(); c.arc(sx + 2, top - 3, 5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.arc(sx + o.w - 2, top - 3, 5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
  }
  function drawBoxer(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 60 || sx < -60) return;
    if (!art('boxeador', c, sx, GROUND, { scale: 1.1, facing: -1, pose: o.st === 'punch' ? 'golpe' : 'guardia' })) {
      c.fillStyle = '#64748b'; c.fillRect(sx - 16, GROUND - 56, 32, 56);
    }
    if (o.st === 'warn') gfx('drawExclamation', c, sx, GROUND - 84);
  }
  function drawHeartPick(c, o) {
    var sx = o.wx - scroll;
    if (sx > W + 30 || sx < -30) return;
    var hy = GROUND - o.h + Math.sin(t * 4 + o.wx) * 4;
    if (!gfx('drawHeart', c, sx, hy, 26, 'full')) {
      c.fillStyle = '#ef4444'; c.beginPath(); c.arc(sx, hy, 11, 0, Math.PI * 2); c.fill();
    }
  }
  function drawMedalAt(c, x, y, scale, off) {
    if (!art('medalla', c, x, y, { t: t, scale: scale, apagada: !!off })) {
      c.save();
      c.fillStyle = off ? '#6b7280' : '#fbbf24'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, y, 14 * scale, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = off ? '#9ca3af' : '#fffbeb';
      c.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 3.5 : 8) * scale;
        c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath(); c.fill();
      c.restore();
    }
  }
  function drawFactory(c) {
    var dx = DOOR_WX - scroll;
    if (dx - 260 > W || dx + 260 < 0) return;
    c.save();
    var bx = dx - 230, bw = 520, top = GROUND - 280;
    c.fillStyle = '#475569'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 4;
    c.fillRect(bx + 340, top - 70, 40, 90); c.strokeRect(bx + 340, top - 70, 40, 90);   // chimenea
    c.fillRect(bx + 400, top - 40, 34, 60); c.strokeRect(bx + 400, top - 40, 34, 60);
    rrect(c, bx, top, bw, GROUND - top, 10); c.fill(); c.stroke();
    // tejado en sierra
    c.fillStyle = '#334155';
    for (var k = 0; k < 5; k++) {
      c.beginPath(); c.moveTo(bx + k * 104, top); c.lineTo(bx + k * 104 + 104, top); c.lineTo(bx + k * 104 + 104, top - 40); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#7f1d1d'; c.fillRect(bx, top + 60, bw, 18); c.strokeRect(bx, top + 60, bw, 18);
    // rótulo
    c.fillStyle = '#1e293b'; rrect(c, dx - 120, top + 12, 240, 42, 8); c.fill(); c.stroke();
    label(c, 'FÁBRICA DE ROBOTS', dx, top + 41, 22, '#fca5a5');
    // ventanas con luz roja
    c.fillStyle = '#fca5a5';
    [bx + 30, bx + 100, bx + 400, bx + 460].forEach(function (wx) { c.fillRect(wx, top + 100, 36, 30); c.strokeRect(wx, top + 100, 36, 30); });
    // marca de cuernos
    if (window.P2 && P2.horns) { try { P2.horns(c, dx, top + 112, 1.4, '#b87333'); } catch (e) { /* nada */ } }
    // puerta abierta (la meta)
    var dw = 150, dh = 150;
    var g = c.createLinearGradient(0, GROUND - dh, 0, GROUND);
    g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#1e1b4b');
    c.fillStyle = g; rrect(c, dx - dw / 2, GROUND - dh, dw, dh, 12); c.fill(); c.stroke();
    c.fillStyle = '#fbbf24';
    for (var s = 0; s < 6; s++) { c.fillRect(dx - dw / 2 + s * 26, GROUND - dh - 12, 13, 10); }
    c.restore();
  }

  function drawWarnings(c) {
    var shown = 0;
    for (var i = 0; i < world.length && shown < 2; i++) {
      var o = world[i];
      if (!o.alive || !WARN_NAMES[o.k]) continue;
      var sx = o.wx - scroll;
      if (sx > W - 10 && sx < W + 560) {
        var y = GROUND - 120 - shown * 64;
        var a = 0.65 + 0.35 * Math.sin(t * 10);
        c.save(); c.globalAlpha = a;
        c.fillStyle = '#fbbf24'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(W - 14, y); c.lineTo(W - 44, y - 22); c.lineTo(W - 44, y + 22); c.closePath(); c.fill(); c.stroke();
        c.restore();
        label(c, WARN_NAMES[o.k], W - 52, y + 7, 18, '#fde047', 'right');
        shown++;
      }
    }
    var dx = DOOR_WX - scroll;
    if (dx > W && dx < W + 900 && phase === 'race') label(c, '¡La fábrica! ▶', W - 20, 200, 22, '#86efac', 'right');
  }

  function drawSecuaz(c) {
    if (!secuaz.on) return;
    var bob = Math.abs(Math.sin(t * 9)) * -6;
    var sx = secuaz.x, sy = GROUND + bob;
    var top = sy - SECUAZ_H;               // punta de la cabeza-torreta
    if (!art('secuaz', c, sx, sy, { scale: SECUAZ_SCALE, angle: secuaz.warn > 0 ? Math.PI - 0.3 : -0.4 })) {
      c.fillStyle = '#64748b'; c.fillRect(sx - 50, top, 100, SECUAZ_H);
    }
    if (secuaz.warn > 0) {
      // el barril va en su puño delantero, justo de donde sale lanzado
      drawBarrel(c, sx + SECUAZ_FIST_DX, GROUND + SECUAZ_FIST_DY + bob, 17, t * 3);
      gfx('drawExclamation', c, sx - 78, top + 24);
    }
    if (secuaz.sayT > 0 && secuaz.say) bubble(c, secuaz.say, sx - 20, top - 4);
    // polvareda al correr
    if (Math.random() < 0.3) parts.push({ x: sx - 20, y: GROUND - 4, vx: -120, vy: -30, life: 0.4, max: 0.4, kind: 'smoke', col: '#e2e8f0', r: 5 });
  }
  function drawBarrel(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = '#b45309'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = '#7f1d1d'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-r * 0.7, -r * 0.7); c.lineTo(r * 0.7, r * 0.7); c.stroke();
    c.beginPath(); c.moveTo(r * 0.7, -r * 0.7); c.lineTo(-r * 0.7, r * 0.7); c.stroke();
    c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(0, 0, r * 0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#1a1a2e'; c.lineWidth = 2; c.stroke();
    c.restore();
  }
  function drawDrone(c, d) {
    if (d.k === 'picado') {
      if (!art('dronPicado', c, d.x, d.y, { scale: 1.1, angle: d.ang })) { c.fillStyle = '#ef4444'; c.fillRect(d.x - 12, d.y - 8, 24, 16); }
      if (d.st === 'warn') {
        gfx('drawExclamation', c, d.x, d.y - 34);
        // diana en el suelo donde se lanzará
        c.save(); c.strokeStyle = 'rgba(239,68,68,0.9)'; c.lineWidth = 3;
        c.beginPath(); c.ellipse(d.tx, GROUND, 30, 7, 0, 0, Math.PI * 2); c.stroke(); c.restore();
      }
    } else {
      if (!art('dronEnjambre', c, d.x, d.y, { scale: 1.15, facing: -1 })) { c.fillStyle = '#ef4444'; c.fillRect(d.x - 10, d.y - 8, 20, 16); }
      if (d.warn > 0) gfx('drawExclamation', c, d.x, d.y - 30);
    }
  }
  function drawBomb(c, b) {
    // sombra que crece en el suelo antes de que caiga
    var p = clamp((b.y - b.y0) / Math.max(1, GROUND - b.y0), 0, 1);
    c.save();
    c.fillStyle = 'rgba(15,10,30,' + (0.25 + 0.4 * p) + ')';
    c.beginPath(); c.ellipse(b.x, GROUND - 2, 10 + 26 * p, 4 + 5 * p, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(239,68,68,' + (0.4 + 0.5 * p) + ')'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#1f2937'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = (Math.floor(t * 8) % 2) ? '#ef4444' : '#fca5a5';
    c.beginPath(); c.arc(b.x, b.y, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fde047'; c.beginPath(); c.arc(b.x + 4, b.y - b.r - 3, 3, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawCarAndFalcon(c) {
    var blink = phase === 'race' && car.invuln > 0 && Math.floor(t * 18) % 2 === 0;
    c.save();
    c.globalAlpha = clamp(car.fade, 0, 1) * (blink ? 0.3 : 1);
    c.translate(car.x, car.y);
    c.rotate(car.tilt);
    if (car.turbo > 0) {
      c.save(); c.globalAlpha *= 0.35 + 0.15 * Math.sin(t * 30);
      c.fillStyle = '#67e8f9';
      c.beginPath(); c.ellipse(0, -carDims().h / 2, 80, carDims().h / 2 + 18, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    if (!art('transformableCoche', c, 0, 0, { variant: variant, enemy: false, scale: CAR_S, facing: 1, boost: car.turbo > 0 })) {
      c.fillStyle = '#3b82f6'; c.fillRect(-60, -40, 120, 34);
    }
    // Lord Falcon de pie en el techo
    var d = carDims();
    var pose = falcon.poseT > 0 ? 'shoot' : (car.onGround ? 'idle' : 'jump');
    if (phase === 'win') pose = 'win';
    if (phase === 'lose') pose = 'hurt';
    gfx('drawFalcon', c, d.roofX, -d.roof, { t: t, facing: 1, pose: pose, scale: 0.72 });
    c.restore();
    // guía de puntería del Jugador 2
    if (coop && phase === 'race') {
      var fp = falconPos(), ox = fp.x + 8, oy = fp.y - 34;
      c.save(); c.strokeStyle = 'rgba(134,239,172,0.85)'; c.lineWidth = 3; c.setLineDash([6, 8]);
      c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(falcon.aim) * 70, oy + Math.sin(falcon.aim) * 70); c.stroke();
      c.restore();
    }
  }

  function drawIntro(c) {
    var I = intro;
    // Director y Falcon en la carretera
    if (I.dir.show) {
      var dpose = (I.stage === 'hack' && (I.hack > 0)) ? 'hack' : (I.stage === 'board' ? 'jump' : 'idle');
      var ds = I.stage === 'board' ? 1 - clamp((I.st - 0.42) / 0.13, 0, 1) * 0.6 : 1;
      gfx('drawDirector', c, I.dir.x, I.dir.y, { t: t, facing: 1, pose: dpose, scale: ds });
    }
    var fpose = (I.stage === 'board' || I.stage === 'transform') ? 'jump' : 'idle';
    // Robot transformable
    if (I.stage === 'hack' || I.stage === 'board') {
      var bob = robot.enemy ? Math.sin(t * 5) * 2 : 0;
      art('transformableRobot', c, ROBOT_X, GROUND + bob, { variant: variant, enemy: robot.enemy, scale: 1.05, facing: -1 });
      if (robot.enemy && I.stage === 'hack' && Math.floor(t * 2) % 2 === 0) gfx('drawExclamation', c, ROBOT_X, GROUND - 158);
    } else if (I.stage === 'transform') {
      var p = clamp(I.st / 0.7, 0, 1);
      c.save();
      if (p < 0.47) {
        var sy = 1 - p * 1.4;
        c.translate(ROBOT_X, GROUND); c.scale(1 + p * 0.5, Math.max(0.2, sy));
        art('transformableRobot', c, 0, 0, { variant: variant, enemy: false, scale: 1.05, facing: 1 });
      } else {
        var sc = 0.5 + (p - 0.47) / 0.53 * 0.5;
        c.translate(ROBOT_X, GROUND); c.scale(1 / sc > 1.6 ? 1.6 : 1, sc);
        art('transformableCoche', c, 0, 0, { variant: variant, enemy: false, scale: CAR_S, facing: 1 });
      }
      c.restore();
      var fl = 1 - Math.abs(p - 0.47) / 0.47;
      c.save(); c.globalAlpha = clamp(fl, 0, 1) * 0.85;
      var rg = c.createRadialGradient(ROBOT_X, GROUND - 60, 5, ROBOT_X, GROUND - 60, 140);
      rg.addColorStop(0, '#ffffff'); rg.addColorStop(1, 'rgba(165,243,252,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(ROBOT_X, GROUND - 60, 140, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    gfx('drawFalcon', c, I.fal.x, I.fal.y, { t: t, facing: 1, pose: fpose, scale: I.stage === 'hack' ? 1 : 1 - 0.28 * clamp((I.stage === 'board' ? I.st : 0.55 + I.st) / 1.25, 0, 1) });

    // Rayo y anillo de hackeo
    if (I.stage === 'hack' && I.hack > 0) {
      gfx('drawHackBeam', c, I.dir.x + 18, I.dir.y - 36, ROBOT_X - 10, GROUND - 70, t);
      c.save();
      c.lineWidth = 8; c.lineCap = 'round';
      c.strokeStyle = 'rgba(15,23,42,0.6)';
      c.beginPath(); c.arc(ROBOT_X, GROUND - 70, 56, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#22d3ee';
      c.beginPath(); c.arc(ROBOT_X, GROUND - 70, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * I.hack); c.stroke();
      c.restore();
    }
    if (I.sayT > 0 && I.dir.show) bubble(c, '¡Lo hago yo!', I.dir.x, I.dir.y - 70);
  }

  function drawHud(c) {
    if (G.ui && G.ui.drawHearts) { try { G.ui.drawHearts(c); } catch (e) { /* nada */ } }
    // barra de progreso
    var bx = 262, bw = 380, by = 18, bh = 22;
    var prog = clamp(scroll / (DOOR_WX - DOOR_STOP_X), 0, 1);
    c.save();
    c.fillStyle = 'rgba(15,10,30,0.8)'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 4;
    rrect(c, bx - 3, by - 3, bw + 6, bh + 6, 10); c.fill(); c.stroke();
    var g = c.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#0891b2'); g.addColorStop(1, '#22d3ee');
    c.fillStyle = g; rrect(c, bx, by, Math.max(10, bw * prog), bh, 8); c.fill();
    c.restore();
    label(c, '¡A por Dark Secuaz!', bx + bw / 2, by + 17, 15, '#fef3c7');
    // icono del coche y de la fábrica
    c.save(); c.fillStyle = '#3b82f6'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 2.5;
    var cx = bx + bw * prog;
    rrect(c, cx - 9, by + bh - 2, 18, 9, 3); c.fill(); c.stroke();
    c.fillStyle = '#ef4444'; c.beginPath(); c.arc(bx + bw + 2, by + bh / 2, 7, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
    // medallas del intento
    for (var i = 0; i < 3; i++) drawMedalAt(c, 672 + i * 24, by + bh / 2, 0.6, !runMedals[i]);

    if (phase !== 'race') return;
    // turbo y cañón (debajo de los corazones)
    var y0 = coop ? 84 : 66;
    var kT = coop ? 'F' : 'J', kC = coop ? 'G' : 'K';
    var ready = car.turbo <= 0 && car.turboCd <= 0;
    c.save();
    c.fillStyle = car.turbo > 0 ? '#67e8f9' : (ready ? '#0e7490' : '#334155');
    c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    rrect(c, 16, y0, 104, 26, 8); c.fill(); c.stroke();
    var frac = car.turbo > 0 ? car.turbo / TURBO_TIME : (car.turboCd > 0 ? 1 - car.turboCd / TURBO_CD : 1);
    c.fillStyle = 'rgba(255,255,255,0.25)'; rrect(c, 18, y0 + 2, 100 * clamp(frac, 0, 1), 22, 6); c.fill();
    c.restore();
    label(c, kT + ' · TURBO', 68, y0 + 19, 14, ready || car.turbo > 0 ? '#fef3c7' : '#94a3b8');
    c.save(); c.fillStyle = '#0e7490'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
    rrect(c, 126, y0, 82, 26, 8); c.fill(); c.stroke(); c.restore();
    label(c, kC + ' · Cañón', 167, y0 + 19, 14, '#fef3c7');
    if (coop) {
      c.save(); c.fillStyle = '#15803d'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 3;
      rrect(c, W - 196, y0, 180, 26, 8); c.fill(); c.stroke(); c.restore();
      label(c, 'L · Flechas  ↑↓ apuntar', W - 106, y0 + 19, 14, '#fef3c7');
    }
  }

  function renderScene(c) {
    c.save();
    if (shake > 0) c.translate(rand(-shake, shake), rand(-shake, shake));
    drawBackground(c);
    var i;
    for (i = 0; i < world.length; i++) if (world[i].k === 'G') drawGap(c, world[i]);
    drawFactory(c);
    for (i = 0; i < world.length; i++) {
      var o = world[i];
      if (!o.alive) continue;
      if (o.k === 'R') drawRamp(c, o);
      else if (o.k === 'B') drawBarricade(c, o);
    }
    drawSecuaz(c);
    for (i = 0; i < world.length; i++) {
      var w = world[i];
      if (!w.alive) continue;
      if (w.k === 'X') drawBoxer(c, w);
      else if (w.k === 'H') drawHeartPick(c, w);
      else if (w.k === 'M') {
        var sx = w.wx - scroll;
        if (sx > -40 && sx < W + 40) {
          var my = GROUND - w.h + Math.sin(t * 3 + w.i) * 5;
          c.save(); c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 5);
          c.fillStyle = '#fde68a'; c.beginPath(); c.arc(sx, my, 26, 0, Math.PI * 2); c.fill(); c.restore();
          drawMedalAt(c, sx, my, 1, false);
        }
      }
    }
    for (i = 0; i < barrels.length; i++) drawBarrel(c, barrels[i].x, barrels[i].y, barrels[i].r, barrels[i].rot);
    for (i = 0; i < bombs.length; i++) drawBomb(c, bombs[i]);

    if (phase === 'intro') drawIntro(c);
    else drawCarAndFalcon(c);

    for (i = 0; i < drones.length; i++) drawDrone(c, drones[i]);
    for (i = 0; i < shots.length; i++) {
      if (!gfx('drawLaserBolt', c, shots[i].x, shots[i].y, 26, '#22d3ee')) { c.fillStyle = '#22d3ee'; c.fillRect(shots[i].x - 12, shots[i].y - 3, 24, 6); }
    }
    for (i = 0; i < arrows.length; i++) gfx('drawArrowProj', c, arrows[i].x, arrows[i].y, Math.atan2(arrows[i].vy, arrows[i].vx));
    for (i = 0; i < explos.length; i++) {
      var ex = explos[i];
      gfx('drawExplosion', c, ex.x, ex.y, 1 - ex.life / ex.max, ex.r);
    }
    for (i = 0; i < parts.length; i++) {
      var p = parts[i], a = clamp(p.life / p.max, 0, 1);
      c.save(); c.globalAlpha = a; c.fillStyle = p.col;
      if (p.kind === 'line') { c.fillRect(p.x, p.y, 26, 3); }
      else if (p.kind === 'bolt') {
        c.fillStyle = '#94a3b8'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 1.5;
        c.beginPath(); for (var k = 0; k < 6; k++) { var an = k * Math.PI / 3; c.lineTo(p.x + Math.cos(an) * p.r * 1.3, p.y + Math.sin(an) * p.r * 1.3); }
        c.closePath(); c.fill(); c.stroke();
      } else if (p.kind === 'star') { gfx('drawSparkle', c, p.x, p.y, 1 - a); }
      else if (p.kind === 'conf') { c.fillRect(p.x, p.y, p.r * 2, p.r); }
      else { c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    for (i = 0; i < texts.length; i++) {
      var tx = texts[i];
      c.save(); c.globalAlpha = clamp(tx.life / tx.max * 2, 0, 1);
      label(c, tx.txt, tx.x, tx.y, 24, tx.col);
      c.restore();
    }
    if (phase === 'race') drawWarnings(c);
    c.restore();

    if (flash > 0) {
      c.save(); c.globalAlpha = clamp(flash / 0.25, 0, 1) * 0.3; c.fillStyle = '#ff4d4d'; c.fillRect(0, 0, W, H); c.restore();
    }

    drawHud(c);

    // ayudas y carteles
    if (phase === 'intro' && intro.stage === 'hack' && G.ui && G.ui.hint) {
      G.ui.hint(c, '¡Mantén H para hackearlo!');
    } else if (phase === 'race' && hintT > 0 && hintText && G.ui && G.ui.hint) {
      G.ui.hint(c, hintText);
    }
    if (bannerT > 0 && phase === 'race') {
      c.save(); c.globalAlpha = clamp(bannerT / 0.4, 0, 1);
      var sc = 1 + Math.max(0, bannerT - 1.8) * 0.6;
      c.translate(W / 2, 250); c.scale(sc, sc);
      label(c, '¡A por Dark Secuaz!', 0, 0, 52, '#fde047');
      c.restore();
    }
    if (phase === 'win' && winT > 1.2) {
      label(c, '¡Capítulo superado!', W / 2, 300, 40, '#86efac');
    }
  }
})();
