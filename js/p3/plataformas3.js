// plataformas3.js — Motor de plataformas de la PARTE 3 "We Are a Team" (dueño: motor).
// FORK de js/p2/plataformas2.js (que NO se toca): misma física, colisiones AABB, cámara
// suavizada, checkpoints con reaparición segura, cintas, prensas, hackeo con anillo,
// K.O. en co-op y efectos. Se quitan medallas, jetpack, red y bumerán. Se añaden
// (contrato técnico de la Parte 3, §5, §6, §7, §9, §16.3 y §18.1):
//   - los 4 héroes (Director, Falcon, Mikey, Peter) y el cambio de héroe por INTERCAMBIO,
//   - compañeros IA (3 en 1 jugador, 2 en co-op), invulnerables,
//   - los 3 lanzadores de Mikey y el escudo de Peter (golpe, cubrirse, lanzar),
//   - puzles de equipo C / T / R / L / D con pistas de Dark Secuaz,
//   - la arena con el jefe a pie (G.P3B), la memoria de reintento, el HUD con la barra
//     del equipo, touchExtra y __debug.
// Registra G.makePlatformScene3(def), el registro G.P3B y la escena levelP3test_plataformas.
// Regla de oro: nunca lanzar excepciones en update/render.
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  // Registro de jefes a pie (contrato §1 y §9.5): se crea si no existe y NUNCA se reasigna.
  G.P3B = G.P3B || { types: {} };
  if (!G.P3B.types || typeof G.P3B.types !== 'object') G.P3B.types = {};
  G.P3B.register = G.P3B.register || function (tipo, def) { G.P3B.types[tipo] = def; };

  // ---- Constantes ----
  var TILE = 48;
  var GRAV = 1800, JUMP_V = -640, MAX_FALL = 1200;
  var PLAYER_W = 34, PLAYER_H = 58;
  var COYOTE = 0.10, JUMP_BUFFER = 0.12;
  var INVULN = 1.2, RESPAWN_INVULN = 1.5;
  var KO_TIME = 4.0, KO_RESPAWN_HP = 6, KO_INVULN = 1.5;
  var HEART_DROP = 0.25;
  var HACK_TIME = 1.2, HACK_RANGE = 70;
  var HINT_RANGE = 130;
  // Pistas del nivel: se quedan al menos max(4 s, palabras / 2,5) aunque el héroe siga andando.
  var HINT_MIN = 4, HINT_WPS = 2.5, HINT_MAX = 10;
  // Si otra pista espera en la cola, la que se ve se acorta hasta HINT_QUEUED s (nunca menos).
  // Las pistas que esperan NO se pierden por correr: solo se saltan las normales cuando el héroe
  // ya va más de HINT_STALE tiles lejos; las de seguridad (HINT_MUST: «!», «cuidado») nunca.
  var HINT_QUEUED = 3, HINT_STALE_TILES = 30, HINT_MUST = /«!»|cuidado/i;
  // Pistas del jefe en la arena: 5–7 s la primera vez, 4 s las repeticiones, y la misma
  // no vuelve hasta 20 s después de ocultarse.
  var BOSS_HINT_SHOW = 5, BOSS_HINT_GAP = 20;
  var PUZZLE_OK_HINT = 4;
  var ARENA_REARM = 6;   // las consolas de la arena se rearman a los 6 s (§9.3)
  var ACT_DUR = 0.22;
  var BELT_SPEED = 90;
  // Prensa: ciclo de 2,6 s con aviso de 0,8 s ("!", regla §0.7).
  var PRESS_WAIT = 0.8, PRESS_WARN = 0.8, PRESS_DOWN = 0.18, PRESS_HOLD = 0.32, PRESS_UP = 0.5;
  var PRESS_CYCLE = PRESS_WAIT + PRESS_WARN + PRESS_DOWN + PRESS_HOLD + PRESS_UP;
  var PRESS_MAX = 3 * TILE, PRESS_REST = 0.95;
  var STUN_PULSE = 1.0;
  var SWITCH_CD = 0.4, SWITCH_INV = 0.5, SWITCH_INV_EVERY = 1.5, NAME_TIME = 0.6;
  var AI_MELEE = 90, AI_RANGED = 320, AI_WARP = 600, AI_INVULN = 0.6, AI_STUCK = 1.6;
  var AI_BOSS_MULT = 0.35, AI_CD_MULT = 2;
  // Ronda de pruebas 1: "ayudan, pero el que gana es el jugador" (§5.3).
  //  - Las IA solo quitan vida al jefe si un jugador le ha acertado hace < AI_HELP_WINDOW s,
  //    y nunca lo bajan del AI_FINISH_FRAC de su vida (el remate es del jugador).
  //  - En el capítulo 1 (examen con el Robot de práctica) no le quitan vida.
  //  - No rematan robots de práctica ni enemigos hackeables (los deja para el jugador).
  //  - Si un enemigo les para el golpe AI_CLINKS veces seguidas, lo dejan AI_AVOID s y saltan.
  var AI_HELP_WINDOW = 4, AI_FINISH_FRAC = 0.1, AI_SPARE_RANGE = 700, AI_CLINKS = 3, AI_AVOID = 5;
  //  - Si ningún jugador le ha acertado hace poco, las IA siguen ayudando un poco: daño × AI_IDLE_MULT
  //    (sobre el × 0,35) y nunca lo bajan del AI_IDLE_FLOOR de su vida (el resto es del jugador).
  var AI_IDLE_MULT = 0.5, AI_IDLE_FLOOR = 0.6;
  var SPEED = { director: 260, falcon: 290, mikey: 270, peter: 250 };
  var COVER_SPEED = 130;
  var ARROW_SPEED = 540, ARROW_GRAV = 300, ARROW_MAX = 3;
  var PULSE_LEN = 240;
  var WEAPON = {
    guantes: { cd: 0.5, reach: 48, dmg: 2 },
    espada: { cd: 0.35, reach: 56, dmg: 1 },
    arco: { cd: 0.28, dmg: 1 },
    pulso: { cd: 0.7, dmg: 1 },
    golpeEscudo: { cd: 0.45, reach: 40, dmg: 1 }
  };
  // Lanzadores de Mikey (§6.1)
  var LAUNCHERS = {
    francotirador: { v: 900, range: 640, dmg: 2, cd: 0.9, max: 1, pierce: 2, r: 7, nombre: '¡Francotirador!' },
    pistola: { v: 560, range: 420, dmg: 1, cd: 0.30, max: 3, pierce: 1, r: 6, nombre: '¡Pistola!' },
    metralleta: { v: 640, range: 300, dmg: 0.5, cd: 0.12, max: 6, pierce: 1, r: 5, nombre: '¡Metralleta!', spread: 0.06 }
  };
  var LAUNCHER_ORDER = ['francotirador', 'pistola', 'metralleta'];
  // Escudo de Peter (§6.2)
  var SH_SPEED = 560, SH_END = 0.55, SH_RANGE = 300, SH_BACK = 640, SH_CATCH = 26, SH_MAXOUT = 4;
  var SH_CATCH_CD = 0.25, SH_REBOUND_R = 180, SH_REBOUNDS = 2, COVER_HOLD = 0.18;
  var THANKS_GAP = 2.0;
  var HEROES_DEF = ['director', 'falcon', 'mikey', 'peter'];
  var NOMBRE_CAMBIO = { director: '¡Director!', falcon: '¡Falcon!', mikey: '¡Mikey!', peter: '¡Peter!' };
  var NOMBRE_CORTO = { director: 'Director', falcon: 'Falcon', mikey: 'Mikey', peter: 'Peter' };
  var COLOR_RESPALDO = { director: '#60a5fa', falcon: '#4ade80', mikey: '#f97316', peter: '#facc15' };
  // Alto del arte a escala 1 (contrato §16.4), por si datos-arte3.js faltara.
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };
  var ENEMY_LETTERS = {
    x: 'boxeador', q: 'escudo', a: 'arana', A: 'arana', t: 'minitorreta', w: 'enjambre', r: 'dronRayo', p: 'dronPicado',
    u: 'practicaBoxeador', v: 'practicaDron', z: 'practicaTorreta', k: 'practicaEscudo', m: 'miniRobot', n: 'taladrin'
  };
  var GROUND_LETTERS = { x: true, q: true, a: true, t: true, u: true, z: true, k: true, n: true };
  var TEMA_P2 = { cielo: 'fortaleza', fabricaOscura: 'fabrica', arena: 'fabrica' };
  var TEMA_P1 = { cielo: 'ship', fabricaOscura: 'base', arena: 'base' };
  var OUTLINE = '#1a1a2e';
  var FONT = 'system-ui, "Segoe UI", Arial, sans-serif';

  // Pistas de los puzles (plantillas: pasan por G.p3conTeclas, §7.2)
  var PISTA = {
    C: 'Las consolas son cosa del Director: ¡pulsa {cambio} para cambiar!',
    T: 'Está muy lejos: solo llega el francotirador de Mikey. ¡{cambio} para cambiar y {disparo} hasta que salga «¡Francotirador!»!',
    Tmikey: '¡Pulsa {disparo} hasta que salga «¡Francotirador!» y dispara con {ataque}!',
    R: 'Esa repisa está muy alta: ¡Lord Falcon tiene doble salto! ({cambio} para cambiar)',
    L: 'Solo el escudo de Peter aguanta el láser: mantén {ataque} para cubrirte y crúzalo.',
    Lpeter: 'Mantén {ataque} para cubrirte y cruza.',
    // Con el héroe correcto, si tarda (≥ 4 s): cómo se hace.
    Cok: 'Ponte junto a la consola y MANTÉN {hack} hasta que se llene el círculo.',
    Rok: '¡La palanca está arriba! Pulsa {salto} y, en el aire, otra vez {salto}: ¡doble salto!',
    Tok: '¡Ya llevas el francotirador! Mira hacia la diana y dispara con {ataque}.',
    hack: 'Solo el Director sabe hackear: ¡pulsa {cambio} para cambiar!'
  };

  // ---- Utilidades seguras ----
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function sign(v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }
  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* sin sonido */ } }
  function music(n) { try { if (G.audio && G.audio.music && n) G.audio.music(n); } catch (e) { /* sin música */ } }
  function overlap(a, b) { return !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function dist(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
  function rnd() { return Math.random(); }
  var warned = {};
  function warnOnce(key, e) {
    if (warned[key]) return;
    warned[key] = true;
    try { if (window.console && console.warn) console.warn('[plataformas3] ' + key, e); } catch (x) { /* nada */ }
  }
  // Arte: P2.call('nombre', ctx, ...) → true si existía (nunca rompe).
  function art() {
    var P = window.P2;
    if (!P || typeof P.call !== 'function') return false;
    try { return !!P.call.apply(P, Array.prototype.slice.call(arguments)); } catch (e) { return false; }
  }
  function gfx(name) { return (G.gfx && typeof G.gfx[name] === 'function') ? G.gfx[name] : null; }
  function altoArte(n) {
    var P = window.P2;
    var v = (P && P.P3ALTO && typeof P.P3ALTO[n] === 'number') ? P.P3ALTO[n] : 0;
    return v > 0 ? v : (ALTO_POR_DEFECTO[n] || 68);
  }
  function p3() { return (G.p3 && typeof G.p3 === 'object') ? G.p3 : null; }
  function look() { var s = p3(); return (s && s.look) || {}; }
  function heroesOrder() {
    var s = p3();
    var h = (s && Array.isArray(s.HEROES) && s.HEROES.length === 4) ? s.HEROES : HEROES_DEF;
    return h;
  }
  function heroColor(h, tono) {
    try { var s = p3(); if (s && typeof s.heroColor === 'function') return s.heroColor(h, tono) || COLOR_RESPALDO[h] || '#e5e7eb'; } catch (e) { /* abajo */ }
    return COLOR_RESPALDO[h] || '#e5e7eb';
  }
  function debugInv() { var s = p3(); return !!(s && s.debugInvulnerable); }
  // Teclas: SIEMPRE con G.p3teclas / G.p3conTeclas (nunca letras a mano, contrato §3 y §18.2).
  var TECLAS_RESPALDO = 'JKHQ';
  function teclas(j) {
    try {
      if (typeof G.p3teclas === 'function') { var k = G.p3teclas(j === 2 ? 2 : 1); if (k && typeof k === 'object') return k; }
    } catch (e) { /* abajo */ }
    return { ataque: TECLAS_RESPALDO.charAt(0), disparo: TECLAS_RESPALDO.charAt(1), hack: TECLAS_RESPALDO.charAt(2), cambio: TECLAS_RESPALDO.charAt(3), salto: 'ESPACIO' };
  }
  function conTeclas(texto, j) {
    texto = String(texto == null ? '' : texto);
    try { if (typeof G.p3conTeclas === 'function') return String(G.p3conTeclas(texto, j)); } catch (e) { /* abajo */ }
    var k = teclas(j === 2 ? 2 : 1);
    return texto.replace(/\{ataque\}/g, k.ataque).replace(/\{disparo\}/g, k.disparo).replace(/\{hack\}/g, k.hack)
      .replace(/\{cambio\}/g, k.cambio).replace(/\{salto\}/g, k.salto);
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function outlinedText(ctx, txt, x, y, size, fill, align) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.25);
    ctx.strokeStyle = OUTLINE;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill || '#fef3c7';
    ctx.fillText(txt, x, y);
    ctx.restore();
  }
  function tileAt(rows, col, row) {
    if (!rows || row < 0 || row >= rows.length) return '.';
    var line = rows[row];
    if (typeof line !== 'string' || col < 0 || col >= line.length) return '.';
    return line.charAt(col);
  }
  function isOneWayTile(ch) { return ch === '='; }

  var nullInput = { held: function () { return false; }, pressed: function () { return false; } };
  function makeAiInput() {
    var h = {}, pr = {};
    return {
      h: h, pr: pr,
      held: function (n) { return !!h[n]; },
      pressed: function (n) { return !!pr[n]; },
      clear: function () { var k; for (k in h) h[k] = false; for (k in pr) pr[k] = false; }
    };
  }

  // =========================================================================
  //  Jefe de PRUEBA propio (§9.5.6): un bloque con 10 de vida, para que la escena
  //  funcione aunque jefes3.js aún no haya registrado el jefe del mapa.
  // =========================================================================
  var TEST_BOSS = {
    nombre: 'JEFE DE PRUEBA',
    touchDamage: 1,
    create: function (world, x, y, opts) {
      opts = opts || {};
      var b = { x: x, y: y, w: 92, h: 112, hp: 10, maxHp: 10, facing: -1, fase: 1, st: 'descanso', t: 0, ataque: null, stun: 0, turno: 0, flash: 0 };
      if (opts.fase === 2) { b.hp = 5; b.fase = 2; }
      if (opts.fase === 3) { b.hp = 3; b.fase = 2; }
      if (opts.fase === 'victoria') b.hp = 0;
      return b;
    },
    intro: function (b, t, world) {
      if (t < 0.05) world.text(b.x, b.y - 140, '¡Jefe de prueba!', '#fde68a', 1.2);
      return t > 1.0;
    },
    update: function (b, dt, world) {
      b.t += dt;
      if (b.flash > 0) b.flash -= dt;
      if (b.hp <= 5 && b.fase === 1) { b.fase = 2; world.text(b.x, b.y - 140, '¡Fase 2!', '#fca5a5', 1.0); }
      if (b.stun > 0) { b.stun -= dt; b.st = 'mareado'; if (b.stun <= 0) { b.st = 'descanso'; b.t = 0; } return; }
      var h = world.nearestHero(b.x, b.y - 50);
      if (b.st === 'descanso') {
        if (h) {
          b.facing = (h.x < b.x) ? -1 : 1;
          if (Math.abs(h.x - b.x) > 110) {
            b.x += b.facing * 50 * dt;
            var a = world.arena;
            if (a) b.x = clamp(b.x, a.x0 + 60, a.x1 - 60);
          }
        }
        if (b.t > 1.6) {
          b.ataque = (b.turno % 2 === 0) ? 'puno' : 'espuma'; b.turno++;
          b.st = 'aviso'; b.t = 0;
          world.spawnEffect('exclaim', b.x, b.y - 130, { life: 1.0 });
          if (b.ataque === 'puno') world.spawnWarning(b.x + b.facing * 70, b.y, { r: 50, life: 1.0 });
        }
      } else if (b.st === 'aviso') {
        if (b.t >= 1.0) {
          b.st = 'golpe'; b.t = 0;
          if (b.ataque === 'puno') {
            world.sfx('bigPunch'); world.shake(0.4);
            var hs = world.heroes();
            var r = { x: b.facing > 0 ? b.x : b.x - 120, y: b.y - 90, w: 120, h: 90 };
            for (var i = 0; i < hs.length; i++) {
              var hh = hs[i];
              if (hh.ko) continue;
              if (overlap(r, { x: hh.x - hh.w / 2, y: hh.y - hh.h, w: hh.w, h: hh.h })) {
                if (world.hurtHero(hh, 2, b.x, { fisico: true }) === 'bloqueado') {
                  b.stun = 1; world.text(b.x, b.y - 140, '¡CLANC!', '#fde047', 0.8);
                }
              }
            }
          } else {
            world.sfx('laser');
            for (var k = -1; k <= 1; k++) {
              world.spawnProjectile({ x: b.x + b.facing * 50, y: b.y - 60, vx: b.facing * 180, vy: k * 40, r: 9, dmg: 1, from: 'enemy', kind: 'espuma', life: 4 });
            }
          }
        }
      } else if (b.st === 'golpe') {
        if (b.t >= 0.35) { b.st = 'descanso'; b.t = 0; b.ataque = null; }
      }
    },
    draw: function (ctx, b) {
      var col = b.st === 'aviso' ? '#f59e0b' : (b.st === 'mareado' ? '#a78bfa' : '#64748b');
      ctx.save();
      var bob = Math.sin(b.t * 6) * 2;
      roundRect(ctx, b.x - b.w / 2, b.y - b.h + bob, b.w, b.h - bob, 16);
      ctx.fillStyle = b.flash > 0 ? '#ffffff' : col; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.stroke();
      // ojos
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath(); ctx.arc(b.x + b.facing * 14, b.y - b.h + 38 + bob, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x + b.facing * 34, b.y - b.h + 38 + bob, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = OUTLINE;
      ctx.beginPath(); ctx.arc(b.x + b.facing * 16, b.y - b.h + 38 + bob, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x + b.facing * 36, b.y - b.h + 38 + bob, 4, 0, Math.PI * 2); ctx.fill();
      // puño
      var ext = (b.st === 'golpe' && b.ataque === 'puno') ? 70 : 20;
      ctx.beginPath(); ctx.arc(b.x + b.facing * (b.w / 2 + ext - 10), b.y - 50, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    },
    zones: function (b) { return [{ x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h, tipo: 'cuerpo', id: "cuerpo" }]; },
    onHit: function (b, dmg) { b.flash = 0.08; return dmg; },
    touchRect: function (b) { return { x: b.x - b.w / 2 + 8, y: b.y - b.h + 10, w: b.w - 16, h: b.h - 10 }; },
    onHack: function (b, world) { b.stun = 2; b.st = 'mareado'; world.text(b.x, b.y - 140, '¡Hackeado!', '#67e8f9', 1.0); },
    defeat: function (b, t, world) {
      if (!b.__pop) { b.__pop = true; world.spawnEffect('confeti', b.x, b.y - 60, { life: 1.4 }); world.sfx('explosion'); }
      return t > 1.5;
    },
    hint: function () { return '¡Un jefe de prueba! Pulsa {cambio} para cambiar de héroe y probarlos todos.'; },
    debug: function (b) {
      var est = b.st === 'aviso' ? 'aviso:' + b.ataque : (b.st === 'golpe' ? 'golpe:' + b.ataque : (b.hp <= 0 ? 'derrota' : b.st));
      return { fase: b.fase, estado: est, aviso: b.st === 'aviso', ataque: b.ataque, debil: null };
    }
  };

  // =========================================================================
  //  G.makePlatformScene3(def)  (contrato §9.1)
  // =========================================================================
  G.makePlatformScene3 = function (def) {
    def = def || {};
    var scene = {};
    var retryMem = null;      // memoria de reintento (§9.6): sobrevive a exit()

    // ---- Estado mutable (se reinicia en enter) ----
    var rows = null, mapCols = 0, mapRows = 0, mapW = 0, mapH = 0;
    var heroes = [];          // los 4 héroes (objetos persistentes)
    var players = [];         // [J1, J2?]
    var coop = false;
    var camX = 0, camY = 0, shakeAmp = 0;
    var tNow = 0, DT = 1 / 60, frameNo = 0;
    var leaving = false;
    var enemies = [], arrows = [], balls = [], shields = [], pulses = [], shots = [], beams = [];
    var pickups = [], effects = [];
    var updatingEnemy = null;
    var consoles = [], doors = [], checkpoints = [], presses = [], activators = [], barriers = [], arenaConsoles = [];
    var brokenBoxes = {};
    var spawnX = 0, spawnY = 0, lastCheckX = 0, lastCheckY = 0, lastCheckIdx = -1;
    var exitRect = null, levelDone = false;
    var curEnt = null;        // entidad que se está moviendo (para las barreras láser)
    var thanksT = -99;
    var pistaWorld = null;    // {texto, until}
    var hackLinks = [];       // rayos consola → jefe tras un hackeo de arena
    // Arena y jefe
    var arena = null, arenaCol = -1, bossSpot = null;
    var boss = null, bossDef = null, bossTipo = null, bossPhase = 'none', bossT = 0, bossErr = 0;

    // ---------------------------------------------------------------------
    //  Mapa
    // ---------------------------------------------------------------------
    function findDoorAt(col, row) {
      for (var i = 0; i < doors.length; i++) { if (doors[i].col === col && doors[i].row === row) return doors[i]; }
      return null;
    }
    function barrierAt(col, row) {
      for (var i = 0; i < barriers.length; i++) {
        var b = barriers[i];
        if (b.col === col && row >= b.r0 && row <= b.r1) return b;
      }
      return null;
    }
    // ¿Puede esta entidad atravesar la barrera? Solo Peter (de un jugador) cubriéndose.
    function canPassBarrier(ent, b) {
      if (!ent || !ent.isHero || ent.isAI || ent.heroe !== 'peter' || !ent.cubriendo) return false;
      if (ent.lCross && ent.lCross.b === b) return true;
      return ((b.x0 + TILE / 2) - ent.x) * ent.facing > 0;
    }
    function solidBlocks(ch, col, row) {
      if (ch === '#' || ch === '<' || ch === '>' || ch === 'T') return true;
      if (ch === 'B') return !brokenBoxes[col + ',' + row];
      if (ch === 'D') { var d = findDoorAt(col, row); return d ? !d.open : true; }
      if (ch === '{') return !!(arena && arena.activa);
      if (ch === 'L') { var b = barrierAt(col, row); return !!(b && b.active && !canPassBarrier(curEnt, b)); }
      return false;
    }
    function solidPt(px, py) {
      var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
      return solidBlocks(tileAt(rows, col, row), col, row);
    }
    // Para proyectiles: las barreras láser se atraviesan (§7.1).
    function projSolid(px, py) {
      var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
      var ch = tileAt(rows, col, row);
      if (ch === 'L') return false;
      return solidBlocks(ch, col, row);
    }
    function groundPt(px, py) {
      var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
      var ch = tileAt(rows, col, row);
      return solidBlocks(ch, col, row) || isOneWayTile(ch);
    }
    function rectHitsSolid(cx, feetY, w, h) {
      var c0 = Math.floor((cx - w / 2) / TILE), c1 = Math.floor((cx + w / 2 - 0.001) / TILE);
      var r0 = Math.floor((feetY - h) / TILE), r1 = Math.floor((feetY - 0.001) / TILE);
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) { if (solidBlocks(tileAt(rows, c, r), c, r)) return true; }
      return false;
    }
    function safeSideX(px, feetY, offs, w) {
      var saved = curEnt; curEnt = null;
      try {
        for (var i = 0; i < offs.length; i++) {
          var x = clamp(px + offs[i], w / 2, Math.max(w / 2, mapW - w / 2));
          if (arena && arena.activa && (x < arena.x0 + w / 2 || x > arena.x1 - w / 2)) continue;
          if (rectHitsSolid(x, feetY, w, PLAYER_H)) continue;
          if (tileAt(rows, Math.floor(x / TILE), Math.floor((feetY - 10) / TILE)) === '^') continue;
          for (var k = 0; k <= 4; k++) { if (groundPt(x, feetY + 2 + k * TILE)) return x; }
        }
      } finally { curEnt = saved; }
      return clamp(px, w / 2, Math.max(w / 2, mapW - w / 2));
    }
    function centerOfTile(col, row) { return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 }; }
    function safeRespawnForCheckpoint(col, row) {
      var offsets = [0, -1, 1, -2, 2, -3, 3];
      for (var i = 0; i < offsets.length; i++) {
        var c = col + offsets[i];
        if (c < 0 || c >= mapCols) continue;
        for (var r = row + 1; r < mapRows; r++) {
          var ch = tileAt(rows, c, r);
          if (ch === '#' || ch === '<' || ch === '>') return { x: c * TILE + TILE / 2, y: r * TILE };
          if (ch === '^') break;
        }
      }
      return { x: spawnX, y: spawnY };
    }

    // Puertas: tiles D pegados = UNA puerta. Cada puerta se enlaza con el activador
    // C/T/R más cercano (sin las consolas de la arena); el activador abre su grupo (§7.1).
    function groupDoors() {
      var gid = 0, i, j;
      for (i = 0; i < doors.length; i++) {
        if (doors[i].group >= 0) continue;
        var stack = [doors[i]];
        doors[i].group = gid;
        while (stack.length) {
          var d = stack.pop();
          var nb = [findDoorAt(d.col + 1, d.row), findDoorAt(d.col - 1, d.row), findDoorAt(d.col, d.row + 1), findDoorAt(d.col, d.row - 1)];
          for (var k = 0; k < nb.length; k++) { if (nb[k] && nb[k].group < 0) { nb[k].group = gid; stack.push(nb[k]); } }
        }
        gid++;
      }
      for (j = 0; j < doors.length; j++) {
        var best = null, bd = Infinity;
        for (i = 0; i < activators.length; i++) {
          var a = activators[i];
          var dd = dist(a.cx, a.cy, doors[j].cx, doors[j].cy);
          if (dd < bd) { bd = dd; best = a; }
        }
        doors[j].act = best;
        if (best && best.groups.indexOf(doors[j].group) < 0) best.groups.push(doors[j].group);
      }
    }
    function makePress(col, row) {
      var techoY = row * TILE;
      for (var r = row - 1; r >= 0; r--) {
        if (solidBlocks(tileAt(rows, col, r), col, r)) { techoY = (r + 1) * TILE; break; }
      }
      var floorY = mapH;
      for (var r2 = row; r2 < mapRows; r2++) {
        var ch = tileAt(rows, col, r2);
        if ((r2 * TILE) > techoY && (solidBlocks(ch, col, r2) || isOneWayTile(ch))) { floorY = r2 * TILE; break; }
      }
      var rest = techoY + PRESS_REST * TILE;
      return {
        col: col, row: row, x: col * TILE, cx: col * TILE + TILE / 2, techoY: techoY,
        rest: rest, maxBottom: clamp(floorY, rest + 8, techoY + PRESS_MAX), bottom: rest, ext: rest - techoY,
        state: 'up', prevState: 'up', shake: 0, offset: (presses.length * 0.85) % PRESS_CYCLE
      };
    }

    // ---- Héroes ----
    function makeHero(heroe, x, y) {
      return {
        isHero: true, heroe: heroe, jugador: 0, isAI: true, input: nullInput, aiIn: makeAiInput(),
        x: x, y: y, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, facing: 1,
        onGround: false, coyote: 0, jumpBuf: 0, jumpsLeft: 0, moveDir: 0,
        pose: 'idle', invuln: 0, blink: 0, knockT: 0, knockV: 0,
        hackTarget: null, hackProgress: 0,
        cd: { attack: 0, shoot: 0 }, cdMax: { attack: 1, shoot: 1 }, bufA: 0, bufS: 0,
        actFx: 0, actPose: null, actKind: null, actFacing: 1,
        launcher: 'pistola', mgSfx: 0,
        shieldOut: false, cubriendo: false, atkHeld: 0, coverLock: false, lanzarFx: 0, bashFx: 0,
        ko: false, warpPending: false, aiFace: 0, aiStuck: 0, aiLastX: x, aiSlot: 0,
        lCross: null, bzztT: 0, nameT: 0, celebrate: false
      };
    }
    function heroByName(n) {
      for (var i = 0; i < heroes.length; i++) { if (heroes[i].heroe === n) return heroes[i]; }
      return null;
    }
    function playerOf(h) { return (h && h.jugador) ? players[h.jugador - 1] || null : null; }
    function bindHero(pl, h) {
      // El héroe h pasa a ser del jugador pl (y su anterior héroe queda como IA).
      h.jugador = pl.j; h.isAI = false; h.input = pl.input || nullInput; h.warpPending = false;
      pl.hero = h;
      var s = p3();
      try { if (s) { if (!s.run || typeof s.run !== 'object') s.run = { lastHero1: null, lastHero2: null, pilotoFusion: null }; s.run['lastHero' + pl.j] = h.heroe; } } catch (e) { /* nada */ }
    }
    function unbindHero(h) {
      h.jugador = 0; h.isAI = true; h.input = h.aiIn; h.cubriendo = false; h.atkHeld = 0;
    }
    function assignAiSlots() {
      var order = heroesOrder(), n = 0;
      for (var i = 0; i < order.length; i++) {
        var h = heroByName(order[i]);
        if (h && h.isAI) h.aiSlot = n++;
      }
    }

    // ---- Vida (en G.state, medios corazones; los corazones son del JUGADOR) ----
    function plHp(pl) { return pl ? num(G.state[pl.hpKey], 0) : 10; }
    function plMax(pl) { var m = pl ? G.state[pl.maxKey] : 10; return (typeof m === 'number') ? m : num(G.state.maxHp, 10); }
    function setPlHp(pl, v) { if (pl) G.state[pl.hpKey] = v; }

    function humanHeroes() { var out = []; for (var i = 0; i < players.length; i++) if (players[i] && players[i].hero) out.push(players[i].hero); return out; }
    function aliveHumanHeroes() { var out = []; for (var i = 0; i < players.length; i++) if (players[i] && !players[i].ko && players[i].hero) out.push(players[i].hero); return out; }
    // Todos los héroes en juego: primero los jugadores, luego las IA (orden de HEROES).
    function heroesAll() {
      var out = humanHeroes().slice();
      var order = heroesOrder();
      for (var i = 0; i < order.length; i++) {
        var h = heroByName(order[i]);
        if (h && h.isAI && !h.warpPending) out.push(h);
      }
      return out;
    }
    function leaderHero() {
      if (players[0] && !players[0].ko) return players[0].hero;
      if (players[1] && !players[1].ko) return players[1].hero;
      return players[0] ? players[0].hero : null;
    }
    function nearestHero(x, y) {
      var hs = heroesAll(), best = null, bd = Infinity;
      for (var i = 0; i < hs.length; i++) {
        var h = hs[i];
        if (!h || h.ko) continue;
        var d = dist(x, y, h.x, h.y - h.h / 2);
        if (d < bd) { bd = d; best = h; }
      }
      return best;
    }
    function heroRect(p) { return { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h }; }
    function shieldRect(p) { return { x: p.facing > 0 ? p.x + 10 : p.x - 26, y: p.y - 66, w: 16, h: 70 }; }

    function cameraFocus() {
      var hs = aliveHumanHeroes();
      if (!hs.length) hs = humanHeroes();
      if (!hs.length) return { x: spawnX, y: spawnY };
      var sx = 0, sy = 0;
      for (var i = 0; i < hs.length; i++) { sx += hs[i].x; sy += (hs[i].y - hs[i].h / 2); }
      var fx = sx / hs.length;
      // Con un solo jugador, la cámara se adelanta hacia una diana sin resolver que esté a
      // tiro (a 11–13 tiles): así el niño VE la diana a la que dispara.
      if (hs.length === 1) fx += dianaLook(hs[0]);
      return { x: fx, y: sy / hs.length };
    }
    var dianaOff = 0;
    function dianaLook(h) {
      var want = 0, best = Infinity;
      for (var i = 0; i < activators.length; i++) {
        var a = activators[i];
        if (a.tipo !== 'T' || (a.hecho && !(tNow - num(a.solvedT, -99) < 1.6))) continue;
        var dx = a.cx - h.x, dy = Math.abs(a.cy - (h.y - 32));
        if (Math.abs(dx) > 15 * TILE || Math.abs(dx) < 2 * TILE || dy > 2 * TILE) continue;
        if (Math.abs(dx) < best) { best = Math.abs(dx); want = clamp(dx * 0.5, -300, 300); }
      }
      dianaOff += (want - dianaOff) * 0.08;
      if (Math.abs(dianaOff) < 0.5) dianaOff = 0;
      return dianaOff;
    }
    function clampCamX(v) { return clamp(v, 0, Math.max(0, mapW - G.W)); }
    function clampCamY(v) { return clamp(v, 0, Math.max(0, mapH - G.H)); }

    // ---------------------------------------------------------------------
    //  Construcción del nivel
    // ---------------------------------------------------------------------
    function buildLevel() {
      rows = (Array.isArray(def.mapa) && def.mapa.length) ? def.mapa.slice() : ['#####', '#S..#', '#####'];
      for (var q = 0; q < rows.length; q++) { if (typeof rows[q] !== 'string') rows[q] = ''; }
      mapRows = rows.length; mapCols = 0;
      for (var r = 0; r < rows.length; r++) { if (rows[r].length > mapCols) mapCols = rows[r].length; }
      mapW = mapCols * TILE; mapH = mapRows * TILE;

      enemies = []; arrows = []; balls = []; shields = []; pulses = []; shots = []; beams = [];
      pickups = []; effects = []; hackLinks = [];
      consoles = []; doors = []; checkpoints = []; presses = []; activators = []; barriers = []; arenaConsoles = [];
      brokenBoxes = {};
      spawnX = TILE * 2; spawnY = TILE * 2;
      exitRect = null; levelDone = false; leaving = false;
      tNow = 0; frameNo = 0; shakeAmp = 0; thanksT = -99; pistaWorld = null;
      lastHumanBossHit = -99; hintStick = null; hintSeen = []; hintQueue = []; bossHintMem = {}; bossHintCur = null; hintNear = null; hintDX = 0; hintFade = 1;
      arena = null; arenaCol = -1; bossSpot = null;
      boss = null; bossDef = null; bossTipo = null; bossPhase = 'none'; bossT = 0; bossErr = 0;
      lastCheckIdx = -1; dianaOff = 0;

      // Columna de la puerta de la arena ({): la primera que aparezca.
      var row, col, ch;
      for (row = 0; row < mapRows; row++) {
        for (col = 0; col < rows[row].length; col++) {
          if (rows[row].charAt(col) === '{' && (arenaCol < 0 || col < arenaCol)) arenaCol = col;
        }
      }

      var pending = [], pressCells = [], lCells = [];
      for (row = 0; row < mapRows; row++) {
        var line = rows[row];
        for (col = 0; col < line.length; col++) {
          ch = line.charAt(col);
          var c = centerOfTile(col, row);
          switch (ch) {
            case 'S': spawnX = c.x; spawnY = row * TILE + TILE; break;
            case 'K': checkpoints.push({ col: col, row: row, cx: c.x, cy: c.y, x: col * TILE, y: row * TILE, taken: false, safeX: 0, safeY: 0 }); break;
            case 'h': pickups.push({ x: c.x, y: c.y, vy: 0, grounded: true, fromMap: true, t: rnd() * 3 }); break;
            case 'C':
              if (arenaCol >= 0 && col > arenaCol) arenaConsoles.push({ tipo: 'C', col: col, row: row, cx: c.x, cy: c.y, progress: 0, rearm: 0 });
              else activators.push({ tipo: 'C', col: col, row: row, cx: c.x, cy: c.y, hecho: false, progress: 0, groups: [], wrongT: [0, 0] });
              break;
            case 'T': activators.push({ tipo: 'T', col: col, row: row, cx: c.x, cy: c.y, hecho: false, groups: [], wrongT: [0, 0] }); break;
            case 'R': activators.push({ tipo: 'R', col: col, row: row, cx: c.x, cy: c.y, hecho: false, groups: [], wrongT: [0, 0] }); break;
            case 'L': lCells.push([col, row]); break;
            case 'D': doors.push({ col: col, row: row, cx: c.x, cy: c.y, open: false, group: -1, act: null }); break;
            case 'E': exitRect = { x: col * TILE + 6, y: row * TILE + 2, w: TILE - 12, h: TILE - 4, cx: c.x, cy: c.y }; break;
            case 'P': pressCells.push([col, row]); break;
            case 'J': bossSpot = { x: c.x, y: row * TILE + TILE, col: col, row: row }; break;
            default:
              if (ENEMY_LETTERS[ch]) pending.push({ ch: ch, col: col, row: row });
              break;
          }
        }
      }
      // Barreras láser: L seguidas en una columna = una barrera.
      lCells.sort(function (a, b) { return (a[0] - b[0]) || (a[1] - b[1]); });
      for (var li = 0; li < lCells.length; li++) {
        var lc = lCells[li], last = barriers[barriers.length - 1];
        if (last && last.col === lc[0] && last.r1 === lc[1] - 1) { last.r1 = lc[1]; last.y1 = (lc[1] + 1) * TILE; }
        else barriers.push({ tipo: 'L', col: lc[0], r0: lc[1], r1: lc[1], x0: lc[0] * TILE, x1: lc[0] * TILE + TILE, y0: lc[1] * TILE, y1: (lc[1] + 1) * TILE, active: true, cruzando: 0, wrongT: [0, 0] });
      }
      for (var b2 = 0; b2 < barriers.length; b2++) { barriers[b2].cx = barriers[b2].x0 + TILE / 2; barriers[b2].cy = (barriers[b2].y0 + barriers[b2].y1) / 2; barriers[b2].row = barriers[b2].r1; }
      checkpoints.sort(function (a, b) { return (a.col - b.col) || (a.row - b.row); });
      for (var k = 0; k < checkpoints.length; k++) {
        var safe = safeRespawnForCheckpoint(checkpoints[k].col, checkpoints[k].row);
        checkpoints[k].safeX = safe.x; checkpoints[k].safeY = safe.y;
      }
      groupDoors();
      for (var p = 0; p < pressCells.length; p++) presses.push(makePress(pressCells[p][0], pressCells[p][1]));
      if (arenaCol >= 0) {
        var sy = bossSpot ? bossSpot.y : 528;
        arena = { x0: (arenaCol + 1) * TILE, x1: (arenaCol + 19) * TILE, sueloY: sy, activa: false, col: arenaCol };
        if (!bossSpot) bossSpot = { x: (arenaCol + 10) * TILE + TILE / 2, y: sy, col: arenaCol + 10, row: Math.round(sy / TILE) - 1 };
      }
      lastCheckX = spawnX; lastCheckY = spawnY;
      coop = !!(G.state && G.state.coop);

      // Los 4 héroes. J1 = G.p3.hero; J2 = G.p3.hero2 (co-op). El resto, IA.
      var order = heroesOrder();
      var s3 = p3() || {};
      var h1 = (order.indexOf(s3.hero) >= 0) ? s3.hero : (order.indexOf(def.heroe) >= 0 ? def.heroe : 'director');
      var h2 = null;
      if (coop) {
        h2 = (order.indexOf(s3.hero2) >= 0 && s3.hero2 !== h1) ? s3.hero2 : (h1 !== 'falcon' ? 'falcon' : 'director');
      }
      heroes = [];
      for (var hi = 0; hi < order.length; hi++) heroes.push(makeHero(order[hi], spawnX, spawnY));
      players = [{ j: 1, input: G.input || nullInput, hpKey: 'hp', maxKey: 'maxHp', ko: false, koTimer: 0, switchCd: 0, lastSwitchInv: -99, hint: null, hero: null, hackFailT: 0 }];
      if (coop) players.push({ j: 2, input: G.input2 || nullInput, hpKey: 'hp2', maxKey: 'maxHp2', ko: false, koTimer: 0, switchCd: 0, lastSwitchInv: -99, hint: null, hero: null, hackFailT: 0 });
      for (var u = 0; u < heroes.length; u++) unbindHero(heroes[u]);
      bindHero(players[0], heroByName(h1));
      if (coop) bindHero(players[1], heroByName(h2));
      assignAiSlots();
      placeTeam(spawnX, spawnY);

      // Enemigos (plugins). Un tipo que falte se ignora sin romper.
      for (var e = 0; e < pending.length; e++) {
        var it = pending[e], tc = centerOfTile(it.col, it.row), ex = tc.x, ey = tc.y;
        var opts = { letra: it.ch, col: it.col, row: it.row };
        if (GROUND_LETTERS[it.ch]) ey = it.row * TILE + TILE;
        if (it.ch === 'a') opts.techo = false;
        if (it.ch === 'A') {
          opts.techo = true; ey = it.row * TILE;
          for (var rr = it.row - 1; rr >= 0; rr--) { if (solidBlocks(tileAt(rows, it.col, rr), it.col, rr)) { ey = (rr + 1) * TILE; break; } }
        }
        spawnEnemy(ENEMY_LETTERS[it.ch], ex, ey, opts);
      }
      snapCamera();
      syncWorld();
    }

    // Coloca a todo el equipo: J1 en (x, y), J2 a +40 px y las IA detrás.
    function placeTeam(x, y) {
      var h1 = players[0] && players[0].hero;
      if (!h1) return;
      resetMotion(h1, x, y);
      if (players[1] && players[1].hero) {
        var x2 = safeSideX(x, y, [40, -40, 80, 0], PLAYER_W);
        resetMotion(players[1].hero, x2, y);
      }
      for (var i = 0; i < heroes.length; i++) {
        var h = heroes[i];
        if (!h.isAI) continue;
        var off = 60 + 50 * h.aiSlot;
        resetMotion(h, safeSideX(x, y, [-off, -off + 30, off, 0], PLAYER_W), y);
        h.warpPending = false;
      }
    }
    function resetMotion(h, x, y) {
      h.x = x; h.y = y; h.vx = 0; h.vy = 0; h.knockT = 0; h.onGround = false; h.aiStuck = 0; h.aiLastX = x; h.lCross = null;
    }
    function snapCamera() {
      var f = cameraFocus();
      camX = clampCamX(f.x - G.W / 2); camY = clampCamY(f.y - G.H / 2);
      if (arena && arena.activa) camX = clampCamX(arena.col * TILE);
    }

    // ---------------------------------------------------------------------
    //  Colisión AABB tile a tile (X y luego Y)
    // ---------------------------------------------------------------------
    function moveX(ent, dx, flags) {
      var newX = ent.x + dx;
      var top = ent.y - ent.h, bottom = ent.y - 0.001;
      var r0 = Math.floor(top / TILE), r1 = Math.floor(bottom / TILE);
      var col, row;
      if (dx > 0) {
        var c0 = Math.floor((ent.x + ent.w / 2) / TILE), c1 = Math.floor((newX + ent.w / 2) / TILE);
        for (col = c0; col <= c1; col++) {
          for (row = r0; row <= r1; row++) {
            if (solidBlocks(tileAt(rows, col, row), col, row) && col * TILE >= ent.x + ent.w / 2 - 0.51) {
              newX = col * TILE - ent.w / 2 - 0.001;
              if (flags) { flags.hitWall = true; flags.wallCol = col; flags.wallRow = row; }
              col = c1 + 1; break;
            }
          }
        }
      } else if (dx < 0) {
        var d0 = Math.floor((ent.x - ent.w / 2) / TILE), d1 = Math.floor((newX - ent.w / 2) / TILE);
        for (col = d0; col >= d1; col--) {
          for (row = r0; row <= r1; row++) {
            if (solidBlocks(tileAt(rows, col, row), col, row) && (col + 1) * TILE <= ent.x - ent.w / 2 + 0.51) {
              newX = (col + 1) * TILE + ent.w / 2 + 0.001;
              if (flags) { flags.hitWall = true; flags.wallCol = col; flags.wallRow = row; }
              col = d1 - 1; break;
            }
          }
        }
      }
      ent.x = newX;
    }
    function collideEnt(ent) {
      var flags = { onGround: false, hitWall: false, hitCeiling: false, wallCol: -1, wallRow: -1 };
      if (!ent) return flags;
      if (!isFinite(ent.x) || !isFinite(ent.y)) return flags;
      var savedEnt = curEnt;
      curEnt = ent;
      try {
        ent.w = num(ent.w, 32); ent.h = num(ent.h, 32);
        ent.vx = num(ent.vx, 0); ent.vy = num(ent.vy, 0);
        ent.onGround = false;
        var dx = ent.vx * DT;
        if (dx !== 0) { moveX(ent, dx, flags); if (flags.hitWall) ent.vx = 0; }
        var newY = ent.y + ent.vy * DT;
        var c0 = Math.floor((ent.x - ent.w / 2) / TILE), c1 = Math.floor((ent.x + ent.w / 2 - 0.001) / TILE);
        var col, row, ch;
        if (ent.vy > 0) {
          var r0 = Math.floor((ent.y - 0.001) / TILE), r1 = Math.floor(newY / TILE), stop = false;
          for (row = r0; row <= r1 && !stop; row++) {
            for (col = c0; col <= c1; col++) {
              ch = tileAt(rows, col, row);
              var solid = solidBlocks(ch, col, row), oneway = isOneWayTile(ch);
              if (!solid && !oneway) continue;
              var tileTop = row * TILE;
              if (ent.y > tileTop + 1) continue;
              if (newY >= tileTop) { newY = tileTop; ent.vy = 0; ent.onGround = true; flags.onGround = true; stop = true; break; }
            }
          }
        } else if (ent.vy < 0) {
          var headTarget = newY - ent.h;
          var hh1 = Math.floor((ent.y - ent.h) / TILE), hh0 = Math.floor(headTarget / TILE);
          for (row = hh1; row >= hh0; row--) {
            var hit = false;
            for (col = c0; col <= c1; col++) {
              ch = tileAt(rows, col, row);
              if (solidBlocks(ch, col, row)) {
                var tileBottom = (row + 1) * TILE;
                if (headTarget <= tileBottom && (ent.y - ent.h) >= tileBottom - 1) {
                  newY = tileBottom + ent.h; ent.vy = 0; flags.hitCeiling = true; hit = true; break;
                }
              }
            }
            if (hit) break;
          }
        } else {
          var fr = Math.floor((ent.y + 1) / TILE);
          for (col = c0; col <= c1; col++) {
            ch = tileAt(rows, col, fr);
            if ((solidBlocks(ch, col, fr) || isOneWayTile(ch)) && Math.abs(ent.y - fr * TILE) < 1.5) { ent.onGround = true; flags.onGround = true; break; }
          }
        }
        ent.y = newY;
      } finally { curEnt = savedEnt; }
      return flags;
    }
    function nudgeX(ent, dx) {
      var saved = curEnt; curEnt = ent;
      try {
        var steps = Math.ceil(Math.abs(dx) / (TILE / 2)) || 1;
        for (var i = 0; i < steps; i++) moveX(ent, dx / steps, null);
      } finally { curEnt = saved; }
    }

    // ---------------------------------------------------------------------
    //  El objeto world (§9.4)
    // ---------------------------------------------------------------------
    var world = {
      t: 0, TILE: TILE, camX: 0, camY: 0, viewW: 960, viewH: 540,
      chapter: def.chapter || 1,
      arena: null,
      heroes: function () { return heroesAll(); },
      nearestHero: function (x, y) { return nearestHero(num(x, 0), num(y, 0)); },
      hurtHero: function (h, dmg, fromX, opts) { return hurtHero(h, dmg, fromX, opts); },
      isSolidAt: function (px, py) {
        if (!isFinite(px) || !isFinite(py)) return false;
        var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
        var ch = tileAt(rows, col, row);
        if (solidBlocks(ch, col, row)) return true;
        return isOneWayTile(ch) && (py - row * TILE) < 14;
      },
      collide: function (ent) { return collideEnt(ent); },
      spawnProjectile: function (p) { spawnShot(p); },
      spawnBeam: function (b) { spawnBeam(b); },
      spawnEnemy: function (tipo, x, y, opts) { return spawnEnemy(tipo, x, y, opts); },
      spawnEffect: function (kind, x, y, opts) { spawnEffect(kind, x, y, opts); },
      enemies: function () { return liveEnemies(); },
      hitEnemy: function (e, dmg, kind, fromX) { return hitEnemy(e, num(dmg, 1), kind || 'aliado', fromX, false); },
      sfx: function (n) { sfx(n); },
      leader: function () { return leaderHero(); },
      isCovered: function (h, fromX) { return !!coveringPeterFor(h, fromX); },
      boss: function () { return boss; },
      spawnWarning: function (x, sueloY, opts) {
        opts = opts || {};
        if (effects.length < 300) effects.push({ kind: 'warn', x: num(x, 0), y: num(sueloY, 528), r: num(opts.r, 40), t: 0, dur: num(opts.life, 1.0) });
      },
      shake: function (v) { shakeAmp = Math.max(shakeAmp, clamp(num(v, 0.3), 0, 1)); },
      text: function (x, y, texto, color, life) { spawnEffect('texto', x, y, { texto: texto, color: color, life: life }); },
      pista: function (texto, seg) { if (texto) pistaWorld = { texto: String(texto), until: tNow + num(seg, 3) }; }
    };
    function syncWorld() {
      world.t = tNow; world.camX = camX; world.camY = camY; world.viewW = G.W; world.viewH = G.H;
      world.arena = arena; world.chapter = def.chapter || 1;
    }

    // ---- Enemigos ----
    function spawnEnemy(tipo, x, y, opts) {
      var T = null;
      try {
        if (G.P3E && G.P3E.types && G.P3E.types[tipo]) T = G.P3E.types[tipo];
        else if (G.P2E && G.P2E.types && G.P2E.types[tipo]) T = G.P2E.types[tipo];
      } catch (e0) { T = null; }
      if (!T || typeof T.create !== 'function') return null;
      var e = null;
      try { e = T.create(world, num(x, 0), num(y, 0), opts || {}); } catch (err) { warnOnce('create-' + tipo, err); e = null; }
      if (!e || typeof e !== 'object') return null;
      e.__def = T; e.__tipo = tipo;
      if (e.alive === undefined) e.alive = true;
      e.hp = num(e.hp, 1); e.w = num(e.w, 32); e.h = num(e.h, 32);
      e.x = num(e.x, num(x, 0)); e.y = num(e.y, num(y, 0));
      e.stun = num(e.stun, 0);
      if (e.facing !== 1 && e.facing !== -1) e.facing = -1;
      if (enemies.length < 120) enemies.push(e);
      return e;
    }
    function liveEnemies() {
      var out = [];
      for (var i = 0; i < enemies.length; i++) { if (enemies[i].alive) out.push(enemies[i]); }
      return out;
    }
    function enemyRect(e) {
      var T = e.__def;
      if (T && typeof T.rect === 'function') {
        try {
          var r = T.rect(e);
          if (r && isFinite(r.x) && isFinite(r.y) && isFinite(r.w) && isFinite(r.h)) return r;
        } catch (err) { warnOnce('rect-' + e.__tipo, err); }
      }
      if (e.flying) return { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h };
      return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
    }
    function rectCenter(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
    function targetable(e) { return e && e.alive && !e.hacked && !e.invisible && e.__tipo !== 'enjambre'; }

    // Héroe IA que está golpeando ahora (lo ponen doMelee, doPulse y los proyectiles).
    var aiSrc = null;
    // La IA no remata robots de práctica ni enemigos hackeables con un jugador cerca:
    // los deja con media vida para que el golpe final (o el hackeo) sea del jugador.
    function aiSpare(e) {
      var T = e && e.__def;
      if (!T) return false;
      if (T.practica) return true;
      return !!(T.hackable && !e.hacked && minHumanDX(e.x) < AI_SPARE_RANGE);
    }
    // Golpe de una IA parado (clink): tras AI_CLINKS seguidos al mismo enemigo, lo deja
    // AI_AVOID s y salta por encima para atacarlo por la espalda.
    function aiClink(c, e) {
      if (c.aiClinkE !== e) { c.aiClinkE = e; c.aiClinkN = 0; }
      c.aiClinkN = num(c.aiClinkN, 0) + 1;
      if (c.aiClinkN < AI_CLINKS) return;
      c.aiClinkN = 0;
      c.aiAvoidE = e; c.aiAvoidUntil = tNow + AI_AVOID;
      c.aiHopDir = sign(e.x - c.x) || c.facing || 1; c.aiHopUntil = tNow + 1.4;
    }
    function hitEnemy(e, dmg, kind, fromX) {
      if (!e || !e.alive) return false;
      var T = e.__def || {};
      var c = rectCenter(enemyRect(e));
      var ok = true;
      var src = aiSrc;
      if (src && aiSpare(e)) dmg = Math.max(0, Math.min(dmg, num(e.hp, 1) - 0.5));
      if (typeof T.onHit === 'function') {
        try { ok = T.onHit(e, dmg, kind, fromX, world) !== false; } catch (err) { warnOnce('onHit-' + e.__tipo, err); ok = true; }
      }
      if (kind === 'pulso') e.stun = STUN_PULSE;
      if (!ok) {
        sfx('clink');
        spawnEffect('sparkle', clamp(num(fromX, c.x), c.x - 20, c.x + 20), c.y);
        if (src) aiClink(src, e);
        return false;
      }
      if (src && src.aiClinkE === e) src.aiClinkN = 0;
      if (kind === 'escudo') {
        e.stun = Math.max(num(e.stun, 0), 0.5);
        var dir = (num(fromX, c.x) < e.x) ? 1 : -1;
        if (!e.flying) nudgeX(e, dir * 30); else e.x += dir * 30;
      } else if (kind === 'pistola') e.stun = Math.max(num(e.stun, 0), 0.2);
      e.hp = num(e.hp, 1) - dmg;
      sfx('hit');
      if (e.hp <= 0) killEnemy(e);
      return true;
    }
    function killEnemy(e) {
      if (!e.alive) return;
      var c = rectCenter(enemyRect(e));
      e.alive = false;
      clearExclaims(e);
      if (e.__def && e.__def.practica) {
        effects.push({ kind: 'confeti', x: c.x, y: c.y, t: 0, dur: 1.0, seed: rnd() * 100 });
        spawnEffect('texto', c.x, c.y - 30, { texto: '¡Bien!', color: '#86efac', life: 0.9 });
        sfx('pickup');
      } else {
        effects.push({ kind: 'pop', x: c.x, y: c.y, t: 0, dur: 0.5, r: 26 });
        sfx('explosion');
      }
      if (rnd() < HEART_DROP) pickups.push({ x: c.x, y: c.y - 6, vy: -160, grounded: false, fromMap: false, t: 0 });
    }
    function clearExclaims(e) {
      for (var i = effects.length - 1; i >= 0; i--) {
        if (effects[i].kind === 'exclaim' && effects[i].owner === e) effects.splice(i, 1);
      }
    }
    function damageEnemiesInRect(rect, dmg, kind, fromX) {
      var n = 0;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!targetable(e)) continue;
        if (overlap(rect, enemyRect(e))) { hitEnemy(e, dmg, kind, fromX); n++; }
      }
      return n;
    }
    function breakBoxAt(col, row) {
      if (tileAt(rows, col, row) !== 'B' || brokenBoxes[col + ',' + row]) return false;
      brokenBoxes[col + ',' + row] = true;
      var cc = centerOfTile(col, row);
      effects.push({ kind: 'pop', x: cc.x, y: cc.y, t: 0, dur: 0.4, r: 24 });
      sfx('explosion');
      return true;
    }
    function breakBoxesInRect(rect) {
      var c0 = Math.floor(rect.x / TILE), c1 = Math.floor((rect.x + rect.w) / TILE);
      var r0 = Math.floor(rect.y / TILE), r1 = Math.floor((rect.y + rect.h) / TILE);
      var any = false;
      for (var row = r0; row <= r1; row++) for (var col = c0; col <= c1; col++) { if (breakBoxAt(col, row)) any = true; }
      return any;
    }
    function boxAtPt(px, py) {
      var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
      return (tileAt(rows, col, row) === 'B' && !brokenBoxes[col + ',' + row]) ? { col: col, row: row } : null;
    }
    function dianaAtPt(px, py) {
      var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
      if (tileAt(rows, col, row) !== 'T') return null;
      for (var i = 0; i < activators.length; i++) { if (activators[i].tipo === 'T' && activators[i].col === col && activators[i].row === row) return activators[i]; }
      return null;
    }

    // ---------------------------------------------------------------------
    //  Escudo de Peter: ¿quién protege a quién? (§6.2)
    // ---------------------------------------------------------------------
    function coveringPeterFor(h, fromX) {
      if (!h || typeof fromX !== 'number' || !isFinite(fromX)) return null;
      for (var i = 0; i < heroes.length; i++) {
        var p = heroes[i];
        if (p.heroe !== 'peter' || !p.cubriendo || p.ko || p.warpPending) continue;
        if (sign(fromX - p.x) !== p.facing) continue;
        if ((h.x - p.x) * p.facing > 20) continue;
        if (Math.abs(h.x - p.x) > 140 || Math.abs(h.y - p.y) > 70) continue;
        return p;
      }
      return null;
    }
    function sayThanks(h, p) {
      if (!h || !p || h === p) return;
      if (tNow - thanksT < THANKS_GAP) return;
      thanksT = tNow;
      effects.push({ kind: 'stars', x: h.x, y: h.y - h.h - 8, t: 0, dur: 0.8 });
      var txt = '¡Gracias, Peter!';
      if (NOMBRE_CORTO[h.heroe] && h.heroe !== 'peter') txt += ' — ' + NOMBRE_CORTO[h.heroe];
      spawnEffect('texto', h.x, h.y - h.h - 26, { texto: txt, color: '#fde047', life: 0.8 });
    }
    // Héroe (no Peter) protegido detrás de p, para el "¡Gracias, Peter!" de un bloqueo.
    function protectedBehind(p) {
      var best = null, bd = Infinity;
      for (var i = 0; i < heroes.length; i++) {
        var h = heroes[i];
        if (h === p || h.ko || h.warpPending) continue;
        if ((h.x - p.x) * p.facing > 20 || Math.abs(h.x - p.x) > 140 || Math.abs(h.y - p.y) > 70) continue;
        var d = Math.abs(h.x - p.x);
        if (d < bd) { bd = d; best = h; }
      }
      return best;
    }
    function shieldBlockFx(p, x, y) {
      sfx('shieldBlock');
      effects.push({ kind: 'sparkle', x: x, y: y, t: 0, dur: 0.35 });
      effects.push({ kind: 'shieldFlash', x: p.x + p.facing * 18, y: p.y - 32, f: p.facing, t: 0, dur: 0.25 });
    }

    // ---------------------------------------------------------------------
    //  Daño a héroes (§9.4)
    // ---------------------------------------------------------------------
    function sceneEnding() { return leaving || levelDone || bossPhase === 'defeat' || bossPhase === 'won'; }
    function hurtHero(h, dmg, fromX, opts) {
      opts = opts || {};
      if (!h || !h.isHero || h.ko || h.warpPending || sceneEnding()) return 'nada';
      dmg = num(dmg, 1);
      if (dmg <= 0) return 'nada';
      if (h.invuln > 0) return 'nada';
      if (!opts.desdeAbajo && !opts.desdeArriba && !opts.sinEscudo && typeof fromX === 'number' && isFinite(fromX)) {
        var pp = coveringPeterFor(h, fromX);
        if (pp) {
          shieldBlockFx(pp, pp.x + pp.facing * 20, pp.y - 34);
          if (h !== pp) sayThanks(h, pp);
          return 'bloqueado';
        }
      }
      var dir = (typeof fromX === 'number' && isFinite(fromX) && fromX > h.x) ? -1 : 1;
      if (h.isAI) {
        h.invuln = AI_INVULN; h.blink = 0;
        h.knockT = 0.16; h.knockV = dir * 200; h.vy = Math.min(h.vy, -220); h.onGround = false;
        return 'nada';
      }
      if (debugInv()) return 'nada';
      var pl = playerOf(h);
      if (!pl) return 'nada';
      setPlHp(pl, Math.max(0, plHp(pl) - dmg));
      h.invuln = INVULN; h.blink = 0;
      h.knockT = 0.18; h.knockV = dir * (dmg >= 2 ? 260 : 180); h.vy = -260; h.onGround = false;
      sfx('hurt');
      if (plHp(pl) <= 0) koOrGameover(pl);
      return 'hecho';
    }
    function retryScene() { return def.retry || ('levelP3_' + (def.chapter || 1)); }
    function goGameover() {
      leaving = true;
      retryMem = { k: lastCheckIdx, arena: !!(arena && arena.activa), fase: (boss && arena && arena.activa) ? boss.fase : undefined };
      G.go('gameover', { retry: retryScene() });
    }
    function koOrGameover(pl) {
      if (!coop) { goGameover(); return; }
      var h = pl.hero;
      pl.ko = true; pl.koTimer = KO_TIME;
      if (h) {
        h.ko = true; h.vx = 0; h.vy = 0; h.cubriendo = false; resetHack(h);
        effects.push({ kind: 'sparkle', x: h.x, y: h.y - h.h / 2, t: 0, dur: 0.5 });
        effects.push({ kind: 'sparkle', x: h.x + 10, y: h.y - h.h, t: 0, dur: 0.6 });
      }
      sfx('hurt');
      var alive = 0;
      for (var i = 0; i < players.length; i++) if (!players[i].ko) alive++;
      if (alive === 0) goGameover();
    }
    function respawnSpot(h) {
      var L = null;
      for (var i = 0; i < players.length; i++) { if (players[i].hero !== h && !players[i].ko) L = players[i].hero; }
      if (L && L.onGround) return { x: safeSideX(L.x, L.y, [-L.facing * 34, L.facing * 34, 0], h.w), y: L.y };
      if (arena && arena.activa) return { x: arena.x0 + 60, y: arena.sueloY };
      return { x: lastCheckX, y: lastCheckY };
    }
    function respawnFromFall(h) {
      var s = { x: lastCheckX, y: lastCheckY };
      if (arena && arena.activa) s = { x: arena.x0 + 60, y: arena.sueloY };
      resetMotion(h, s.x, s.y);
      h.invuln = RESPAWN_INVULN; h.blink = 0;
    }
    function revivePlayer(pl) {
      var h = pl.hero;
      if (!h) return;
      var s = respawnSpot(h);
      pl.ko = false; pl.koTimer = 0; h.ko = false;
      resetMotion(h, s.x, s.y);
      h.invuln = KO_INVULN; h.blink = 0;
      setPlHp(pl, Math.min(plMax(pl), KO_RESPAWN_HP));
      sfx('checkpoint');
      effects.push({ kind: 'sparkle', x: h.x, y: h.y - h.h / 2, t: 0, dur: 0.5 });
    }

    // ---------------------------------------------------------------------
    //  Puzles (§7)
    // ---------------------------------------------------------------------
    var ACT_TEXT = { C: '¡Puerta abierta!', T: '¡Diana!', R: '¡Palanca!' };
    function resolveActivator(a, silent) {
      if (!a || a.hecho) return;
      a.hecho = true; a.progress = 1; a.solvedT = silent ? -99 : tNow;
      for (var g = 0; g < a.groups.length; g++) openDoorGroup(a.groups[g], silent);
      if (!silent) {
        sfx(a.tipo === 'C' ? 'hackOk' : 'door');
        spawnEffect('texto', a.cx, a.cy - 40, { texto: ACT_TEXT[a.tipo] || '¡Hecho!', color: '#67e8f9', life: 1.2 });
        effects.push({ kind: 'sparkle', x: a.cx, y: a.cy, t: 0, dur: 0.6 });
        for (var i = 0; i < players.length; i++) players[i].hint = null;
      }
    }
    function openDoorGroup(gid, silent) {
      var any = false;
      for (var i = 0; i < doors.length; i++) {
        var d = doors[i];
        if (d.group === gid && !d.open) {
          d.open = true; any = true;
          if (!silent) effects.push({ kind: 'sparkle', x: d.cx, y: d.cy, t: 0, dur: 0.6 });
        }
      }
      if (any && !silent) sfx('door');
    }
    function barrierOff(b, silent) {
      if (!b || !b.active) return;
      b.active = false;
      if (!silent) {
        sfx('laserBarrier');
        spawnEffect('texto', b.cx, b.y0 - 10, { texto: '¡Láser apagado!', color: '#f9a8d4', life: 1.2 });
        for (var k = 0; k < 4; k++) effects.push({ kind: 'sparkle', x: b.cx, y: b.y0 + (b.y1 - b.y0) * (k + 0.5) / 4, t: 0, dur: 0.5 });
        for (var i = 0; i < players.length; i++) players[i].hint = null;
      }
    }
    // Todo lo que está a la izquierda de la columna `col` queda resuelto (§7.3.6).
    function resolveLeftOf(col) {
      var i;
      for (i = 0; i < activators.length; i++) if (activators[i].col < col) resolveActivator(activators[i], true);
      for (i = 0; i < barriers.length; i++) if (barriers[i].col < col) barrierOff(barriers[i], true);
    }
    function showPuzzleHint(pl, texto, seg) {
      if (!pl) return;
      pl.hint = { texto: texto, until: tNow + num(seg, 4) };
    }
    function hintForActivator(a, h) {
      if (a.tipo === 'C') return PISTA.C;
      if (a.tipo === 'T') return (h && h.heroe === 'mikey') ? PISTA.Tmikey : PISTA.T;
      if (a.tipo === 'R') return PISTA.R;
      if (a.tipo === 'L') return (h && h.heroe === 'peter') ? PISTA.Lpeter : PISTA.L;
      return null;
    }
    function howToHint(a) {
      if (a.tipo === 'C') return PISTA.Cok;
      if (a.tipo === 'R') return PISTA.Rok;
      if (a.tipo === 'T') return PISTA.Tok;
      return null;
    }
    function rightHero(a, h) {
      if (a.tipo === 'C') return h.heroe === 'director';
      if (a.tipo === 'T') return h.heroe === 'mikey' && h.launcher === 'francotirador';
      if (a.tipo === 'R') return h.heroe === 'falcon';
      if (a.tipo === 'L') return h.heroe === 'peter' && h.cubriendo;
      return true;
    }
    // ¿Está el héroe cerca del puzle? (< 3 tiles del activador o de sus puertas; la diana, también
    // desde su zona de tiro, a la misma altura y hasta 14 tiles).
    function nearPuzzle(a, h) {
      var hx = h.x, hy = h.y - h.h / 2, R = 3 * TILE;
      if (dist(hx, hy, a.cx, a.cy) < R) return true;
      // La palanca está en una repisa alta: cuenta estar debajo de ella (hasta 6 filas).
      if (a.tipo === 'R' && Math.abs(hx - a.cx) < R && h.y - a.cy > -TILE && h.y - a.cy < 6.5 * TILE) return true;
      if (a.tipo === 'T' && Math.abs(hy - a.cy) < 2 * TILE && Math.abs(hx - a.cx) < 14 * TILE) return true;
      if (a.groups) {
        for (var i = 0; i < doors.length; i++) {
          if (!doors[i].open && a.groups.indexOf(doors[i].group) >= 0 && dist(hx, hy, doors[i].cx, doors[i].cy) < R) return true;
        }
      }
      return false;
    }
    function updatePuzzleHints(dt) {
      var list = activators.concat(barriers);
      for (var p = 0; p < players.length; p++) {
        var pl = players[p], h = pl.hero;
        if (!h || pl.ko) continue;
        for (var i = 0; i < list.length; i++) {
          var a = list[i];
          var unsolved = (a.tipo === 'L') ? a.active : !a.hecho;
          if (!a.okT) a.okT = [0, 0];
          if (!unsolved || !nearPuzzle(a, h)) { a.wrongT[p] = 0; a.okT[p] = 0; continue; }
          if (rightHero(a, h)) {
            // Héroe correcto pero no sabe cómo: a los 4 s, Dark Secuaz explica la tecla.
            a.wrongT[p] = 0;
            var how = howToHint(a);
            if (!how) { a.okT[p] = 0; continue; }
            a.okT[p] += dt;
            if (a.okT[p] >= PUZZLE_OK_HINT) showPuzzleHint(pl, how, 0.5);
            continue;
          }
          a.okT[p] = 0;
          a.wrongT[p] += dt;
          if (a.wrongT[p] >= 3) showPuzzleHint(pl, hintForActivator(a, h), 0.5);
        }
      }
    }
    function nearestUnsolvedFor(h) {
      var list = activators.concat(barriers), best = null, bd = Infinity;
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        var unsolved = (a.tipo === 'L') ? a.active : !a.hecho;
        if (!unsolved || !nearPuzzle(a, h)) continue;
        var d = dist(h.x, h.y, a.cx, a.cy);
        if (d < bd) { bd = d; best = a; }
      }
      return best;
    }
    // Intento fallido con un activador (sin daño, con chispa y pista).
    function failAttempt(a, h, x, y, txt) {
      sfx('clink');
      effects.push({ kind: 'sparkle', x: x, y: y, t: 0, dur: 0.35 });
      if (txt) spawnEffect('texto', x, y - 26, { texto: txt, color: '#fca5a5', life: 0.8 });
      var pl = playerOf(h);
      if (pl && a) showPuzzleHint(pl, hintForActivator(a, h), 4);
    }
    // Disparo que llega a una diana T.
    function hitDiana(a, kind, owner, x, y) {
      if (!a || a.hecho) { effects.push({ kind: 'sparkle', x: x, y: y, t: 0, dur: 0.25 }); return; }
      if (kind === 'francotirador' && owner && !owner.isAI) { resolveActivator(a, false); return; }
      if (owner && owner.isAI) { effects.push({ kind: 'sparkle', x: x, y: y, t: 0, dur: 0.25 }); return; }
      failAttempt(a, owner, x, y, '¡CLINC!');
    }

    // ---------------------------------------------------------------------
    //  Escena
    // ---------------------------------------------------------------------
    scene.enter = function (params) {
      params = params || {};
      try {
        G.state.hp = G.state.maxHp;
        if (G.state.coop) {
          if (typeof G.state.maxHp2 !== 'number') G.state.maxHp2 = G.state.maxHp;
          G.state.hp2 = G.state.maxHp2;
        }
        if (params.nuevo) retryMem = null;
        var inicio = 'S', fase;
        if (params.fase !== undefined && params.fase !== null) { inicio = 'arena'; fase = params.fase; }
        else if (params.inicio !== undefined && params.inicio !== null) inicio = params.inicio;
        else if (!params.nuevo && retryMem) {
          if (retryMem.arena) { inicio = 'arena'; fase = (retryMem.fase !== undefined) ? retryMem.fase : 1; }
          else if (retryMem.k >= 0) inicio = retryMem.k;
        }
        retryMem = null;
        buildLevel();
        applyStart(inicio, fase);
      } catch (e) {
        warnOnce('enter', e);
      }
      music(def.music);
    };
    function applyStart(inicio, fase) {
      if (inicio === 'arena' && arena) {
        resolveLeftOf(arena.col);
        for (var k = 0; k < checkpoints.length; k++) { if (checkpoints[k].col < arena.col) { checkpoints[k].taken = true; lastCheckIdx = k; lastCheckX = checkpoints[k].safeX; lastCheckY = checkpoints[k].safeY; } }
        var x = arena.x0 + TILE / 2 + 8;
        placeTeam(x + 60, arena.sueloY);
        if (players[0] && players[0].hero) resetMotion(players[0].hero, x + 60, arena.sueloY);
        if (fase !== undefined) startFight(fase);
        else {
          // Sin fase: el equipo aparece justo dentro y el combate empieza al avanzar.
          placeTeam(x, arena.sueloY);
        }
      } else if (typeof inicio === 'number' && checkpoints.length) {
        var n = clamp(Math.floor(inicio), 0, checkpoints.length - 1);
        var kp = checkpoints[n];
        for (var j = 0; j <= n; j++) checkpoints[j].taken = true;
        lastCheckIdx = n; lastCheckX = kp.safeX; lastCheckY = kp.safeY;
        resolveLeftOf(kp.col);
        placeTeam(kp.safeX, kp.safeY);
      }
      snapCamera();
      syncWorld();
    }
    scene.exit = function () {
      arrows = []; balls = []; shields = []; pulses = []; shots = []; beams = []; effects = [];
    };

    scene.update = function (dt) {
      try {
        DT = num(dt, 1 / 60);
        if (!players.length || leaving) return;
        tNow += DT; frameNo++;
        syncWorld();
        var i;
        for (i = 0; i < players.length; i++) {
          var pl = players[i];
          if (pl.switchCd > 0) pl.switchCd -= DT;
          if (pl.ko) { pl.koTimer -= DT; if (pl.koTimer <= 0) revivePlayer(pl); continue; }
          if (pl.input && pl.input.pressed('switch')) doSwitch(pl, null, false);
        }
        // Héroes: primero los jugadores, después las IA.
        var hs = humanHeroes();
        for (i = 0; i < hs.length; i++) { if (!hs[i].ko) updateHero(hs[i], DT); if (leaving || levelDone) return; }
        for (i = 0; i < heroes.length; i++) { if (heroes[i].isAI) updateHero(heroes[i], DT); if (leaving) return; }

        checkArenaStart();
        updateBoss(DT);
        if (leaving) return;
        updatePresses(DT);
        if (leaving) return;
        updateEnemies(DT);
        if (leaving) return;
        updateHeroProjectiles(DT);
        updateShots(DT);
        updateBeams(DT);
        if (leaving) return;
        updatePickups(DT);
        updateArenaConsoles(DT);
        updatePuzzleHints(DT);
        updateHintState();
        updateEffects(DT);
        updateCamera(DT);
        if (coop) clampPlayersToScreen();
        if (shakeAmp > 0) shakeAmp = Math.max(0, shakeAmp - DT * 2.5);
        syncWorld();
      } catch (e) {
        warnOnce('update', e);
      }
    };

    function clampPlayersToScreen() {
      var hs = aliveHumanHeroes();
      for (var i = 0; i < hs.length; i++) {
        var p = hs[i];
        var minX = camX + p.w / 2, maxX = camX + G.W - p.w / 2;
        if (p.x < minX) { p.x = minX; if (p.vx < 0) p.vx = 0; }
        else if (p.x > maxX) { p.x = maxX; if (p.vx > 0) p.vx = 0; }
      }
    }

    // ---------------------------------------------------------------------
    //  Cambio de héroe (§5.2): INTERCAMBIO de posiciones
    // ---------------------------------------------------------------------
    function nextHeroFor(pl) {
      var order = heroesOrder();
      var cur = pl.hero ? order.indexOf(pl.hero.heroe) : -1;
      for (var k = 1; k <= order.length; k++) {
        var cand = heroByName(order[(cur + k) % order.length]);
        if (cand && cand.isAI) return cand;
      }
      return null;
    }
    function doSwitch(pl, target, forced) {
      if (!pl || pl.ko || !pl.hero) return false;
      if (!forced && pl.switchCd > 0) return false;
      if (sceneEnding()) return false;
      var A = pl.hero;
      var B = target || nextHeroFor(pl);
      if (!B || B === A || !B.isAI) return false;
      // Guardar posición de B (el compañero que pasa a ser el jugador).
      var bx = B.x, by = B.y, bWarp = B.warpPending;
      resetHack(A);
      // B ocupa EXACTAMENTE la posición, velocidad y dirección de A.
      B.x = A.x; B.y = A.y; B.vx = A.vx; B.vy = A.vy; B.facing = A.facing;
      B.onGround = A.onGround; B.coyote = A.coyote; B.jumpBuf = 0; B.knockT = A.knockT; B.knockV = A.knockV;
      B.jumpsLeft = (B.heroe === 'falcon' && !A.onGround) ? 1 : 0;
      // §5.2: invulnerabilidad de 0,5 s al cambiar, pero como mucho una vez cada
      // 1,5 s (si no, machacar el cambio daría invulnerabilidad sin fin).
      if (forced || tNow - (pl.lastSwitchInv == null ? -99 : pl.lastSwitchInv) >= SWITCH_INV_EVERY) {
        B.invuln = Math.max(A.invuln, SWITCH_INV); B.blink = 0.5;
        if (!forced) pl.lastSwitchInv = tNow;
      } else { B.invuln = A.invuln; B.blink = A.blink; }
      B.warpPending = false; B.aiStuck = 0; B.lCross = null; B.atkHeld = 0; B.coverLock = false; B.bufA = 0; B.bufS = 0;
      // A aparece donde estaba B y pasa a ser IA.
      if (bWarp) { A.warpPending = true; }
      else { A.x = bx; A.y = by; }
      A.vx = 0; A.vy = 0; A.knockT = 0; A.onGround = false; A.lCross = null; A.invuln = Math.max(A.invuln, 0);
      unbindHero(A);
      bindHero(pl, B);
      assignAiSlots();
      pl.switchCd = forced ? 0 : SWITCH_CD;
      pl.hint = null;
      B.nameT = NAME_TIME;
      effects.push({ kind: 'puf', x: B.x, y: B.y - B.h / 2, t: 0, dur: 0.5, color: heroColor(B.heroe) });
      sfx('switchHero');
      // Si el nuevo quedara dentro de una barrera láser activa, se le empuja fuera
      // hacia el lado por donde vino (donde estaba su compañero).
      for (var i = 0; i < barriers.length; i++) {
        var br = barriers[i];
        if (!br.active) continue;
        if (overlap(heroRect(B), { x: br.x0, y: br.y0, w: TILE, h: br.y1 - br.y0 }) && !canPassBarrier(B, br)) {
          var side = (bx < br.cx) ? -1 : 1;
          nudgeOutOfBarrier(B, br, side);
        }
        if (!A.warpPending && overlap(heroRect(A), { x: br.x0, y: br.y0, w: TILE, h: br.y1 - br.y0 })) nudgeOutOfBarrier(A, br, A.x < br.cx ? -1 : 1);
      }
      return true;
    }
    function nudgeOutOfBarrier(h, br, side) {
      h.x = (side < 0) ? br.x0 - h.w / 2 - 1 : br.x1 + h.w / 2 + 1;
      h.vx = 0; h.lCross = null;
    }

    // ---------------------------------------------------------------------
    //  Héroes (jugadores e IA comparten la lógica)
    // ---------------------------------------------------------------------
    function beltUnder(p) {
      var row = Math.floor((p.y + 2) / TILE);
      var xs = [p.x, p.x - p.w / 2 + 2, p.x + p.w / 2 - 2];
      for (var i = 0; i < xs.length; i++) {
        var ch = tileAt(rows, Math.floor(xs[i] / TILE), row);
        if (ch === '<') return -1;
        if (ch === '>') return 1;
        if (ch === '#' || ch === 'B' || ch === 'D' || ch === '=') return 0;
      }
      return 0;
    }

    function updateHero(p, dt) {
      if (p.ko) return;
      if (p.warpPending) { tryWarp(p); if (p.warpPending) return; }
      if (p.isAI) { aiThink(p, dt); if (p.warpPending) return; }
      var input = p.input || nullInput;
      var celebrating = (bossPhase === 'defeat' || bossPhase === 'won');

      // Escudo de Peter: cubrirse manteniendo el ataque (antes del movimiento: cambia la velocidad).
      if (p.heroe === 'peter') updatePeterCover(p, dt, input);

      var moveL = input.held('left'), moveR = input.held('right');
      var speed = SPEED[p.heroe] || 260;
      if (p.cubriendo) speed = COVER_SPEED;
      p.moveDir = 0;
      if (moveL && !moveR) { p.moveDir = -1; if (!p.cubriendo || !p.isAI) p.facing = -1; }
      else if (moveR && !moveL) { p.moveDir = 1; if (!p.cubriendo || !p.isAI) p.facing = 1; }
      if (p.isAI && p.aiFace) p.facing = p.aiFace;
      p.vx = p.moveDir * speed;
      if (p.knockT > 0) { p.knockT -= dt; p.vx = p.knockV; }
      if (p.onGround) p.vx += beltUnder(p) * BELT_SPEED;

      if (input.pressed('jump')) p.jumpBuf = JUMP_BUFFER;
      else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
      if (p.onGround) p.coyote = COYOTE; else p.coyote = Math.max(0, p.coyote - dt);
      if (p.jumpBuf > 0) {
        if (p.coyote > 0) {
          p.vy = JUMP_V; p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
          p.jumpsLeft = (p.heroe === 'falcon') ? 1 : 0;
          sfx('jump');
        } else if (p.heroe === 'falcon' && p.jumpsLeft > 0) {
          p.vy = JUMP_V; p.jumpsLeft = 0; p.jumpBuf = 0;
          sfx('jump');
          effects.push({ kind: 'sparkle', x: p.x, y: p.y - p.h / 2, t: 0, dur: 0.3 });
        }
      }
      p.vy += GRAV * dt;
      if (p.vy > MAX_FALL) p.vy = MAX_FALL;

      var prevX = p.x;
      var fl = collideEnt(p);
      if (p.x < p.w / 2) p.x = p.w / 2;
      else if (p.x > mapW - p.w / 2) p.x = mapW - p.w / 2;
      updateBarrierContact(p, fl, prevX, dt);

      checkSpikes(p);
      if (leaving) return;

      if (p.y - p.h > mapH + 40) {
        if (p.isAI) { p.warpPending = true; p.vx = 0; p.vy = 0; return; }
        var pl = playerOf(p);
        if (p.invuln <= 0 && !debugInv() && !sceneEnding()) { setPlHp(pl, Math.max(0, plHp(pl) - 1)); sfx('hurt'); }
        if (plHp(pl) <= 0) { koOrGameover(pl); return; }
        respawnFromFall(p);
      }

      if (p.invuln > 0) { p.invuln -= dt; p.blink += dt; }
      if (p.cd.attack > 0) p.cd.attack -= dt;
      if (p.cd.shoot > 0) p.cd.shoot -= dt;
      if (p.actFx > 0) p.actFx -= dt;
      if (p.lanzarFx > 0) p.lanzarFx -= dt;
      if (p.bashFx > 0) p.bashFx -= dt;
      if (p.nameT > 0) p.nameT -= dt;
      if (p.bzztT > 0) p.bzztT -= dt;
      if (p.mgSfx > 0) p.mgSfx -= dt;

      if (!celebrating) heroWeapons(p, dt, input);

      if (!p.isAI) {
        handleHack(p, dt);
        touchLevers(p);
        for (var i = 0; i < checkpoints.length; i++) {
          var k = checkpoints[i];
          if (!k.taken && overlap(heroRect(p), { x: k.x, y: k.y, w: TILE, h: TILE })) {
            k.taken = true;
            if (i > lastCheckIdx) { lastCheckIdx = i; lastCheckX = k.safeX; lastCheckY = k.safeY; }
            sfx('checkpoint');
            effects.push({ kind: 'sparkle', x: k.cx, y: k.cy - 20, t: 0, dur: 0.5 });
            spawnEffect('texto', k.cx, k.y - 14, { texto: '¡Punto de control!', color: '#86efac', life: 1.1 });
          }
        }
        if (exitRect && !levelDone && overlap(heroRect(p), exitRect)) {
          levelDone = true; leaving = true;
          sfx('victory');
          finishLevel();
          return;
        }
      }
      updatePose(p, celebrating);
    }

    // Robovill a pie, derrotado, se hace gigante (cap. 5): los héroes no celebran, lo miran
    // asombrados (de cara a él, echados un poco hacia atrás; drawHero).
    function heroesAsombro() { return !!(boss && bossTipo === 'robovillPie' && (bossPhase === 'defeat' || bossPhase === 'won')); }
    function updatePose(p, celebrating) {
      p.asombro = false;
      if (celebrating && heroesAsombro() && p.onGround && p.moveDir === 0) {
        p.pose = 'idle'; p.asombro = true;
        if (Math.abs(boss.x - p.x) > 8) p.facing = (boss.x > p.x) ? 1 : -1;
        return;
      }
      if (celebrating && p.onGround && p.moveDir === 0) { p.pose = 'win'; return; }
      // Peter cubriéndose: en el aire, salta/cae con el escudo delante (o.escudo = 'cubrir');
      // en el suelo, 'bloquear' y, si anda, heroOpts pasa `anda` para mover las botas.
      if (p.heroe === 'peter' && p.cubriendo) { p.pose = !p.onGround ? ((p.vy < 0) ? 'jump' : 'fall') : 'bloquear'; return; }
      if (p.heroe === 'peter' && p.lanzarFx > 0) { p.pose = 'lanzar'; return; }
      if (p.actFx > 0 && p.actPose) { p.pose = p.actPose; return; }
      if (p.hackProgress > 0) { p.pose = (p.heroe === 'director') ? 'hack' : 'idle'; return; }
      if (p.invuln > 0 && p.blink < 0.4 && !p.isAI && p.nameT <= 0) { p.pose = 'hurt'; return; }
      if (!p.onGround) { p.pose = (p.vy < 0) ? 'jump' : 'fall'; return; }
      p.pose = (p.moveDir !== 0) ? 'run' : 'idle';
    }

    // ---- Barreras láser ----
    function updateBarrierContact(p, fl, prevX, dt) {
      var hr = heroRect(p), i, br;
      // 1) Choque contra una barrera activa: empujón de 40 px hacia atrás, sin daño.
      if (fl && fl.hitWall && tileAt(rows, fl.wallCol, fl.wallRow) === 'L') {
        br = barrierAt(fl.wallCol, fl.wallRow);
        if (br && br.active) bzzt(p, br);
      }
      // 2) Peter cubriéndose: seguimiento del cruce.
      for (i = 0; i < barriers.length; i++) {
        br = barriers[i];
        if (!br.active) continue;
        var inside = overlap(hr, { x: br.x0, y: br.y0, w: TILE, h: br.y1 - br.y0 });
        if (inside) {
          if (canPassBarrier(p, br)) {
            if (!p.lCross || p.lCross.b !== br) p.lCross = { b: br, side: (prevX < br.cx) ? -1 : 1 };
            br.cruzando = 0.2;
          } else {
            // Dentro sin poder estar (dejó de cubrirse): fuera, por donde entró.
            var side = (p.lCross && p.lCross.b === br) ? p.lCross.side : ((prevX < br.cx) ? -1 : 1);
            nudgeOutOfBarrier(p, br, side);
            bzzt(p, br);
            p.lCross = null;
          }
        } else if (p.lCross && p.lCross.b === br) {
          var now = (p.x < br.cx) ? -1 : 1;
          if (now !== p.lCross.side) barrierOff(br, false);
          p.lCross = null;
        }
        if (br.cruzando > 0) br.cruzando -= dt;
      }
    }
    function bzzt(p, br) {
      var dir = (p.x < br.cx) ? -1 : 1;
      p.knockT = 0.14; p.knockV = dir * 290;
      if (p.bzztT > 0) return;
      p.bzztT = 0.7;
      sfx('laserBarrier');
      effects.push({ kind: 'sparkle', x: br.cx, y: p.y - 30, t: 0, dur: 0.35 });
      if (!p.isAI) {
        spawnEffect('texto', p.x, p.y - p.h - 14, { texto: '¡BZZT!', color: '#f9a8d4', life: 0.7 });
        var pl = playerOf(p);
        if (pl) showPuzzleHint(pl, hintForActivator(br, p), 4);
      }
    }
    function touchLevers(p) {
      var hr = heroRect(p);
      for (var i = 0; i < activators.length; i++) {
        var a = activators[i];
        if (a.tipo !== 'R' || a.hecho) continue;
        if (overlap(hr, { x: a.col * TILE, y: a.row * TILE, w: TILE, h: TILE })) resolveActivator(a, false);
      }
    }

    function checkSpikes(p) {
      if (p.invuln > 0) return;
      var pr = heroRect(p);
      var c0 = Math.floor(pr.x / TILE), c1 = Math.floor((pr.x + pr.w - 0.001) / TILE);
      var r0 = Math.floor(pr.y / TILE), r1 = Math.floor((pr.y + pr.h - 0.001) / TILE);
      for (var row = r0; row <= r1; row++) {
        for (var col = c0; col <= c1; col++) {
          if (tileAt(rows, col, row) !== '^') continue;
          var sr = { x: col * TILE + 8, y: row * TILE + 14, w: TILE - 16, h: TILE - 14 };
          if (!overlap(pr, sr)) continue;
          p.vy = -420; p.onGround = false;
          if (p.isAI || debugInv() || sceneEnding()) { p.invuln = AI_INVULN; p.blink = 0; return; }
          var pl = playerOf(p);
          setPlHp(pl, Math.max(0, plHp(pl) - 1));
          p.invuln = INVULN; p.blink = 0;
          sfx('hurt');
          if (plHp(pl) <= 0) koOrGameover(pl);
          return;
        }
      }
    }

    // ---------------------------------------------------------------------
    //  Armas de los 4 héroes (§5.1, §6)
    // ---------------------------------------------------------------------
    function cdOf(p, base) { return p.isAI ? base * AI_CD_MULT : base; }
    function setCd(p, slot, base) { var v = cdOf(p, base); p.cd[slot] = v; p.cdMax[slot] = v; }
    function startAction(p, pose, kind, dur) { p.actFx = dur || ACT_DUR; p.actPose = pose; p.actKind = kind; p.actFacing = p.facing; }
    function meleeRect(p, reach) {
      var x = (p.facing > 0) ? p.x : p.x - reach;
      return { x: x, y: p.y - 54, w: reach, h: 44 };
    }
    function ownCount(list, p) { var n = 0; for (var i = 0; i < list.length; i++) { if (list[i].owner === p) n++; } return n; }

    // Buffer de pulsación (0,15 s): un ataque pulsado justo antes de que acabe el
    // enfriamiento no se pierde (más generoso para un niño que machaca el botón).
    var ACT_BUFFER = 0.15;
    function heroWeapons(p, dt, input) {
      if (input.pressed('attack')) p.bufA = ACT_BUFFER; else p.bufA = Math.max(0, num(p.bufA, 0) - dt);
      if (input.pressed('shoot')) p.bufS = ACT_BUFFER; else p.bufS = Math.max(0, num(p.bufS, 0) - dt);
      var wantA = p.bufA > 0 && p.cd.attack <= 0, wantS = p.bufS > 0 && p.cd.shoot <= 0;
      switch (p.heroe) {
        case 'director':
          if (wantA) { p.bufA = 0; doMelee(p, 'guantes'); }
          if (wantS) { p.bufS = 0; doPulse(p); }
          break;
        case 'falcon':
          if (wantA) { p.bufA = 0; doMelee(p, 'espada'); }
          if (wantS && ownCount(arrows, p) < ARROW_MAX) { p.bufS = 0; doArrow(p); }
          break;
        case 'mikey': {
          var L = p.isAI ? 'pistola' : p.launcher;
          if (!LAUNCHERS[L]) L = p.launcher = 'pistola';
          var want = (L === 'metralleta') ? (input.held('attack') || p.bufA > 0) : p.bufA > 0;
          if (want && p.cd.attack <= 0 && fireLauncher(p, L)) p.bufA = 0;
          if (!p.isAI && input.pressed('shoot')) swapLauncher(p);
          p.bufS = 0;
          break;
        }
        case 'peter':
          p.bufA = 0;
          if (wantS && !p.shieldOut) { p.bufS = 0; throwShield(p); }
          break;
        default: break;
      }
    }
    // Golpe cuerpo a cuerpo (guantes, espada, golpe de escudo) contra enemigos, cajas y jefe.
    function doMelee(p, w) {
      var st = WEAPON[w];
      setCd(p, 'attack', st.cd);
      startAction(p, w === 'golpeEscudo' ? 'bloquear' : 'attack', w);
      sfx(w === 'espada' ? 'sword' : 'punch');
      var kind = (w === 'golpeEscudo') ? 'escudo' : w;
      var mr = meleeRect(p, st.reach);
      aiSrc = p.isAI ? p : null;
      damageEnemiesInRect(mr, st.dmg, kind, p.x);
      aiSrc = null;
      breakBoxesInRect(mr);
      hitBossRect(mr, st.dmg, kind, p.x, p.isAI);
      if (w === 'golpeEscudo') p.bashFx = 0.2;
    }
    function doPulse(p) {
      setCd(p, 'shoot', WEAPON.pulso.cd);
      startAction(p, 'shoot', 'pulso');
      sfx('zap');
      var f = p.facing, hy = p.y - 32, x0 = p.x, len = PULSE_LEN;
      for (var s = 8; s <= PULSE_LEN; s += 8) {
        var px = x0 + f * s;
        var bx = boxAtPt(px, hy);
        if (bx) { breakBoxAt(bx.col, bx.row); len = s; break; }
        var di = dianaAtPt(px, hy);
        if (di) { len = s; hitDiana(di, 'pulso', p, px, hy); break; }
        if (projSolid(px, hy)) { len = s; break; }
      }
      var zr = { x: (f > 0 ? x0 : x0 - len), y: hy - 8, w: len, h: 16 };
      aiSrc = p.isAI ? p : null;
      damageEnemiesInRect(zr, WEAPON.pulso.dmg, 'pulso', x0);
      aiSrc = null;
      hitBossRect(zr, WEAPON.pulso.dmg, 'pulso', x0, p.isAI);
      pulses.push({ x: x0 + f * 10, y: hy, dir: f, len: Math.max(0, len - 10), t: 0, dur: 0.28, seed: rnd() * 10 });
    }
    function doArrow(p) {
      if (ownCount(arrows, p) >= ARROW_MAX) return;
      setCd(p, 'shoot', WEAPON.arco.cd);
      startAction(p, 'shoot', 'arco');
      sfx('arrow');
      var f = p.facing;
      arrows.push({ x: p.x + f * 20, y: p.y - 32, vx: f * ARROW_SPEED, vy: -40, life: 2.2, owner: p, ai: p.isAI, angle: f > 0 ? 0 : Math.PI, bossHit: false });
    }
    function fireLauncher(p, L) {
      var st = LAUNCHERS[L];
      var mine = 0;
      for (var i = 0; i < balls.length; i++) { if (balls[i].owner === p && balls[i].tipo === L) mine++; }
      if (mine >= st.max) return false;
      setCd(p, 'attack', st.cd);
      startAction(p, 'disparo', L);
      var ang = 0;
      if (st.spread) ang = (rnd() * 2 - 1) * st.spread;
      var f = p.facing;
      balls.push({
        owner: p, tipo: L, x: p.x + 22 * f, y: p.y - 32, vx: Math.cos(ang) * st.v * f, vy: Math.sin(ang) * st.v,
        traveled: 0, range: st.range, dmg: st.dmg, pierce: st.pierce, hit: [], bossHit: false, ai: p.isAI, r: st.r, t: 0
      });
      if (L === 'francotirador') sfx('sniper');
      else if (L === 'pistola') sfx('blaster');
      else if (p.mgSfx <= 0) { sfx('blaster'); p.mgSfx = 0.1; }
      return true;
    }
    function swapLauncher(p) {
      var i = LAUNCHER_ORDER.indexOf(p.launcher);
      p.launcher = LAUNCHER_ORDER[(i + 1) % LAUNCHER_ORDER.length];
      sfx('launcherSwap');
      effects.push({ kind: 'texto', x: p.x, y: p.y - p.h - 22, t: 0, dur: NAME_TIME, texto: LAUNCHERS[p.launcher].nombre, color: '#93c5fd', follow: p, dy: -p.h - 22 });
    }

    // ---- Peter: golpe de escudo, cubrirse, lanzar (§6.2) ----
    function updatePeterCover(p, dt, input) {
      var held = input.held('attack');
      if (!held) { p.atkHeld = 0; p.coverLock = false; p.cubriendo = false; return; }
      if (p.shieldOut || p.coverLock) { p.cubriendo = false; return; }
      if (input.pressed('attack') && p.cd.attack <= 0 && !sceneEnding()) doMelee(p, 'golpeEscudo');
      p.atkHeld += dt;
      var was = p.cubriendo;
      p.cubriendo = p.atkHeld > COVER_HOLD;
      if (p.cubriendo && !was) p.actFx = 0;
    }
    function throwShield(p) {
      p.cubriendo = false; p.atkHeld = 0; p.coverLock = true;
      p.shieldOut = true;
      p.lanzarFx = 0.25;
      sfx('shieldThrow');
      shields.push({
        owner: p, x: p.x + 18 * p.facing, y: p.y - 32, dx: p.facing, dy: 0, phase: 'out', traveled: 0, limit: SH_RANGE,
        rebounds: 0, hitOut: [], hitBack: [], bossOut: false, bossBack: false, life: 0, angle: 0, ai: p.isAI, vx: p.facing * SH_SPEED, vy: 0
      });
    }
    function catchShield(s) {
      var o = s.owner;
      o.shieldOut = false;
      o.cd.shoot = SH_CATCH_CD; o.cdMax.shoot = SH_CATCH_CD;
      sfx('shieldCatch');
      effects.push({ kind: 'sparkle', x: o.x + o.facing * 14, y: o.y - 32, t: 0, dur: 0.3 });
    }

    // ---- Hackeo: SOLO el Director (§5.1, §7.1). Los demás reciben la pista. ----
    function resetHack(p) {
      if (p.hackTarget) {
        if (p.hackTarget.kind === 'console' || p.hackTarget.kind === 'arena') p.hackTarget.ref.progress = 0;
        else p.hackTarget.ref.__hackFrac = 0;
      }
      p.hackTarget = null; p.hackProgress = 0;
    }
    function handleHack(p, dt) {
      var held = p.input.held('hack');
      var hx = p.x, hy = p.y - p.h / 2;
      var pl = playerOf(p);
      if (p.heroe !== 'director') {
        resetHack(p);
        if (p.input.pressed('hack') && pl) {
          // Intento fallido: sin daño, con chispa y la pista adecuada.
          var near = nearestUnsolvedFor(p), con = null, i;
          for (i = 0; i < activators.length; i++) {
            if (activators[i].tipo === 'C' && !activators[i].hecho && dist(hx, hy, activators[i].cx, activators[i].cy) < HACK_RANGE + 20) con = activators[i];
          }
          for (i = 0; i < arenaConsoles.length && !con; i++) {
            if (dist(hx, hy, arenaConsoles[i].cx, arenaConsoles[i].cy) < HACK_RANGE + 20) con = arenaConsoles[i];
          }
          if (con) { sfx('hackFail'); effects.push({ kind: 'sparkle', x: con.cx, y: con.cy - 10, t: 0, dur: 0.35 }); showPuzzleHint(pl, PISTA.C, 4); }
          else if (near) showPuzzleHint(pl, hintForActivator(near, p), 4);
          else showPuzzleHint(pl, PISTA.hack, 2.5);
        }
        return;
      }
      if (sceneEnding()) { resetHack(p); return; }
      var target = null, td = HACK_RANGE + 1, j;
      for (j = 0; j < activators.length; j++) {
        var c = activators[j];
        if (c.tipo !== 'C' || c.hecho) continue;
        var d = dist(hx, hy, c.cx, c.cy);
        if (d < td) { td = d; target = { kind: 'console', ref: c, x: c.cx, y: c.cy - 4 }; }
      }
      if (bossPhase === 'fight') {
        for (j = 0; j < arenaConsoles.length; j++) {
          var ac = arenaConsoles[j];
          if (ac.rearm > 0) continue;
          var da = dist(hx, hy, ac.cx, ac.cy);
          if (da < td) { td = da; target = { kind: 'arena', ref: ac, x: ac.cx, y: ac.cy - 4 }; }
        }
      }
      for (j = 0; j < enemies.length; j++) {
        var e = enemies[j], T = e.__def;
        if (!T || !T.hackable || !targetable(e)) continue;
        var ec = rectCenter(enemyRect(e));
        var de = dist(hx, hy, ec.x, ec.y);
        if (de < td) { td = de; target = { kind: 'enemy', ref: e, x: ec.x, y: ec.y }; }
      }
      if (!target || !held) { resetHack(p); return; }
      if (!p.hackTarget || p.hackTarget.ref !== target.ref) {
        resetHack(p);
        p.hackTarget = target; p.hackProgress = 0;
        sfx('hack');
      }
      p.hackTarget.x = target.x; p.hackTarget.y = target.y;
      p.hackProgress += dt;
      var frac = p.hackProgress / HACK_TIME;
      if (target.kind === 'enemy') target.ref.__hackFrac = frac; else target.ref.progress = frac;
      if (p.hackProgress >= HACK_TIME) {
        completeHack(target);
        p.hackTarget = null; p.hackProgress = 0;
      }
    }
    function completeHack(target) {
      sfx('hackOk');
      if (target.kind === 'console') {
        resolveActivator(target.ref, false);
      } else if (target.kind === 'arena') {
        var ac = target.ref;
        ac.progress = 0; ac.rearm = ARENA_REARM;
        spawnEffect('texto', ac.cx, ac.cy - 40, { texto: '¡Hackeado!', color: '#67e8f9', life: 1.1 });
        hackLinks.push({ x1: ac.cx, y1: ac.cy - 10, t: 0, dur: 0.7 });
        if (boss && bossDef && typeof bossDef.onHack === 'function') {
          try { bossDef.onHack(boss, world, { x: ac.cx, y: ac.cy }); } catch (err) { warnOnce('boss-onHack', err); }
        }
      } else {
        var e = target.ref, T = e.__def;
        e.hacked = true; e.__hackFrac = 0; clearExclaims(e);
        try { if (T && typeof T.onHacked === 'function') T.onHacked(e, world); } catch (err2) { warnOnce('onHacked-' + e.__tipo, err2); }
        effects.push({ kind: 'sparkle', x: target.x, y: target.y, t: 0, dur: 0.6 });
        spawnEffect('texto', target.x, target.y - 36, { texto: '¡Hackeado!', color: '#86efac', life: 1.0 });
      }
    }
    function updateArenaConsoles(dt) {
      for (var i = 0; i < arenaConsoles.length; i++) { if (arenaConsoles[i].rearm > 0) arenaConsoles[i].rearm = Math.max(0, arenaConsoles[i].rearm - dt); }
      for (var k = hackLinks.length - 1; k >= 0; k--) { hackLinks[k].t += dt; if (hackLinks[k].t >= hackLinks[k].dur) hackLinks.splice(k, 1); }
    }

    // ---------------------------------------------------------------------
    //  Compañeros IA (§5.3)
    // ---------------------------------------------------------------------
    function groundBelow(p, tiles) {
      for (var i = 0; i <= tiles; i++) { if (groundPt(p.x, p.y + 4 + i * TILE)) return true; }
      return false;
    }
    // Objetivo de la IA en el jefe: el punto de una zona 'debil' o 'cuerpo' MÁS
    // CERCANO a la altura de disparo de la IA (pies − 32), no su centro; así un
    // jefe alto también recibe sus disparos. Prefiere una zona débil que corte
    // la franja de disparo; si no, la zona 'cuerpo' (o la débil) más cercana.
    function bossTargets(c) {
      var out = [];
      if (!boss || bossPhase !== 'fight' || !bossDef || typeof bossDef.zones !== 'function') return out;
      var zs = safeZones();
      var cy = c.y - 32, best = null, bestScore = Infinity;
      for (var i = 0; i < zs.length; i++) {
        var z = zs[i];
        if (z.tipo !== 'debil' && z.tipo !== 'cuerpo') continue;
        var px = clamp(c.x, z.x, z.x + z.w), py = clamp(cy, z.y, z.y + z.h);
        var score = Math.abs(px - c.x) + Math.abs(py - cy) * 3;
        if (z.tipo === 'debil' && Math.abs(py - cy) < 22) score -= 400;
        if (score < bestScore) { bestScore = score; best = { x: px, y: py, boss: true }; }
      }
      if (best) out.push(best);
      return out;
    }
    // ¿Viene un proyectil o rayo enemigo hacia el grupo, < 260 px por delante de Peter?
    function threatFor(c) {
      for (var i = 0; i < shots.length; i++) {
        var s = shots[i];
        if (s.from !== 'enemy') continue;
        var dx = s.x - c.x;
        if (Math.abs(dx) < 260 && Math.abs(s.y - (c.y - 32)) < 70 && sign(s.vx) === -sign(dx)) return sign(dx);
      }
      for (var j = 0; j < beams.length; j++) {
        var b = beams[j];
        if (b.from !== 'enemy') continue;
        var bx = b.x1 - c.x;
        if (Math.abs(bx) < 260 && Math.abs(b.y1 - (c.y - 32)) < 80) return sign(bx) || c.facing;
      }
      return 0;
    }
    function aiThink(c, dt) {
      var ai = c.aiIn;
      if (!ai) return;
      ai.clear();
      c.aiFace = 0;
      var L = leaderHero();
      if (!L || L.ko) return;
      var dxp = L.x - c.x, dyp = L.y - c.y;
      if (dist(c.x, c.y, L.x, L.y) > AI_WARP) { requestWarp(c); return; }
      var celebrating = (bossPhase === 'defeat' || bossPhase === 'won');

      // Objetivo más cercano (enemigos y zonas del jefe)
      var best = null, bd = Infinity, bx = 0, by = 0, cy = c.y - 32, i;
      if (!celebrating) {
        for (i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (!targetable(e) || e.__hackFrac > 0 || aiSpare(e)) continue;
          if (c.aiAvoidE === e && tNow < c.aiAvoidUntil) continue;
          var ec = rectCenter(enemyRect(e));
          var d = dist(c.x, cy, ec.x, ec.y);
          if (d < bd) { bd = d; best = e; bx = ec.x; by = ec.y; }
        }
        var bt = bossTargets(c);
        for (i = 0; i < bt.length; i++) {
          var db = dist(c.x, cy, bt[i].x, bt[i].y);
          if (db < bd) { bd = db; best = bt[i]; bx = bt[i].x; by = bt[i].y; }
        }
      }
      var fightDir = 0, btn = null, hold = false;
      if (best) {
        var dir = (bx < c.x) ? -1 : 1, adx = Math.abs(bx - c.x), ady = Math.abs(by - cy);
        if (c.heroe === 'director') {
          if (bd < AI_MELEE && ady < 60) { fightDir = dir; btn = 'attack'; }
          else if (adx < AI_RANGED && ady < 50) { fightDir = dir; btn = 'shoot'; }
        } else if (c.heroe === 'falcon') {
          if (bd < AI_MELEE && ady < 60) { fightDir = dir; btn = 'attack'; }
          else if (adx < AI_RANGED && ady < 50 && ownCount(arrows, c) < ARROW_MAX) { fightDir = dir; btn = 'shoot'; }
        } else if (c.heroe === 'mikey') {
          if (adx < AI_RANGED && ady < 50) { fightDir = dir; btn = 'attack'; }
        } else if (c.heroe === 'peter') {
          if (!c.shieldOut && adx >= 80 && adx <= 260 && ady < 50) { fightDir = dir; btn = 'shoot'; }
          else if (!c.shieldOut && bd < AI_MELEE && ady < 60) { fightDir = dir; btn = 'attack'; }
        }
      }
      // Peter IA se cubre ante un proyectil o rayo que viene hacia el grupo.
      if (c.heroe === 'peter' && !c.shieldOut && !celebrating) {
        var th = threatFor(c);
        if (th) { fightDir = th; btn = null; hold = true; }
      }

      // Seguir al líder (60, 110 o 160 px detrás, según su sitio)
      var behind = 60 + 50 * c.aiSlot;
      var goalX = L.onGround ? safeSideX(L.x, L.y, [-L.facing * behind, L.facing * behind, -L.facing * 35, 0], c.w) : L.x - L.facing * behind;
      // Pelea contra un jefe a pie: la IA se acerca a él hasta su distancia de
      // ataque (Peter, 80–260 px para lanzar el escudo; los demás, < 320 px),
      // en vez de quedarse detrás del líder. Cada IA a una distancia distinta.
      var bossFight = !!(best && best.boss && arena && arena.activa && bossPhase === 'fight');
      var bossGoal = false;
      if (bossFight && !hold) {
        var want = (c.heroe === 'peter') ? 150 : 175 + 55 * c.aiSlot;
        var bdx = bx - c.x, abx = Math.abs(bdx);
        if (abx > want + 25) { goalX = bx - sign(bdx) * want; bossGoal = true; }
        else if (abx < want - 90) { goalX = bx - sign(bdx || -1) * want; bossGoal = true; }
        else { goalX = c.x; bossGoal = true; }
      }
      // Objetivo en el suelo y la IA encima, en una plataforma: baja andando hacia él
      // (si no, se queda arriba sin poder pegarle).
      var dropping = false;
      if (best && !best.boss && !hold && c.onGround && by > cy + 50 && Math.abs(bx - c.x) < 400 && Math.abs(c.x - L.x) < 400) {
        goalX = bx; bossGoal = true; dropping = true;
        // Justo encima: hasta el borde más cercano de la plataforma, y abajo.
        if (Math.abs(bx - c.x) < 60) {
          var ed = 0;
          for (var st = 1; st <= 12 && !ed; st++) {
            if (!groundPt(c.x + st * 24, c.y + 6)) ed = st;
            else if (!groundPt(c.x - st * 24, c.y + 6)) ed = -st;
          }
          if (ed) goalX = c.x + ed * 24 + sign(ed) * 30;
        }
      }
      if (arena && arena.activa) goalX = clamp(goalX, arena.x0 + 30, arena.x1 - 30);
      var gdx = goalX - c.x;
      var move = 0;
      if (Math.abs(gdx) > 16) move = (gdx > 0) ? 1 : -1;
      if (!bossGoal && (fightDir !== 0 || hold) && Math.abs(c.x - L.x) < 220) move = 0;
      // Salto por encima de un enemigo que le para los golpes (guardias con escudo).
      var hopping = false;
      if (c.aiHopDir) {
        var he = c.aiAvoidE;
        var past = he && (c.aiHopDir > 0 ? c.x > he.x + 60 : c.x < he.x - 60);
        if (!he || !he.alive || past || tNow > c.aiHopUntil || celebrating) {
          if (past) c.aiAvoidUntil = 0;   // ya está detrás: puede volver a atacarlo
          c.aiHopDir = 0;
        } else { hopping = true; move = c.aiHopDir; btn = null; fightDir = 0; hold = false; }
      }
      if (move < 0) ai.h.left = true; else if (move > 0) ai.h.right = true;
      if (fightDir !== 0) {
        c.aiFace = fightDir;
        if (hold) ai.h.attack = true;
        else if (btn && (move === 0 || move === fightDir) && c.cd[btn] <= 0) { ai.pr[btn] = true; ai.h[btn] = true; }
      }

      // Saltar: pared, hueco o líder más alto
      if (c.onGround) {
        var need = false;
        if (move !== 0) {
          var ax = c.x + move * (c.w / 2 + 8);
          if (solidPt(ax, c.y - 10) || solidPt(ax, c.y - 40)) {
            need = true;
            if ((boxAtPt(ax, c.y - 10) || boxAtPt(ax, c.y - 40)) && c.cd.attack <= 0 && (c.heroe === 'director' || c.heroe === 'falcon')) { ai.pr.attack = true; need = false; }
          } else {
            var fx = c.x + move * (c.w / 2 + 12);
            if (!groundPt(fx, c.y + 6)) need = !dropping;   // bajando de una plataforma: se deja caer
            else if (tileAt(rows, Math.floor(fx / TILE), Math.floor((c.y - 10) / TILE)) === '^' ||
                     tileAt(rows, Math.floor((fx + move * TILE * 0.5) / TILE), Math.floor((c.y - 10) / TILE)) === '^') need = true;
          }
        }
        if (L.onGround && L.y < c.y - 40 && Math.abs(dxp) < 240) need = true;
        if (hopping) need = true;
        if (need) ai.pr.jump = true;
      } else if (hopping) {
        ai.h.jump = true;
        if (c.jumpsLeft > 0 && c.vy > 0) ai.pr.jump = true;
      } else if (c.heroe === 'falcon' && c.jumpsLeft > 0 && c.vy > 60 && (dyp < -30 || !groundBelow(c, 3))) {
        ai.pr.jump = true;
      }

      // Atascado (barrera, puerta…) → reaparece junto al líder
      if (move !== 0 && Math.abs(gdx) > 120 && Math.abs(c.x - c.aiLastX) < 0.5) c.aiStuck += dt;
      else c.aiStuck = Math.max(0, c.aiStuck - dt * 2);
      c.aiLastX = c.x;
      if (c.aiStuck > AI_STUCK) requestWarp(c);
    }
    function requestWarp(c) {
      c.aiStuck = 0;
      if (!c.warpPending && c.y - c.h < mapH) effects.push({ kind: 'sparkle', x: c.x, y: c.y - c.h / 2, t: 0, dur: 0.45 });
      c.warpPending = true;
      c.cubriendo = false;
      tryWarp(c);
    }
    function tryWarp(c) {
      var L = leaderHero();
      if (!L || L.ko || !L.onGround) return;
      var off = 50 + 30 * c.aiSlot;
      var nx = safeSideX(L.x, L.y, [-L.facing * off, L.facing * off, -L.facing * 25, 0], c.w);
      resetMotion(c, nx, L.y);
      c.warpPending = false; c.invuln = 0;
      effects.push({ kind: 'sparkle', x: c.x, y: c.y - c.h / 2, t: 0, dur: 0.5 });
      effects.push({ kind: 'sparkle', x: c.x + 12, y: c.y - c.h + 6, t: 0, dur: 0.6 });
    }

    // ---------------------------------------------------------------------
    //  Prensas (aviso de 0,8 s con "!")
    // ---------------------------------------------------------------------
    function updatePresses() {
      for (var i = 0; i < presses.length; i++) {
        var pr = presses[i];
        var ph = (tNow + pr.offset) % PRESS_CYCLE;
        pr.prevState = pr.state;
        pr.shake = 0;
        var k = 0;
        if (ph < PRESS_WAIT) pr.state = 'up';
        else if (ph < PRESS_WAIT + PRESS_WARN) { pr.state = 'warn'; pr.shake = Math.sin(tNow * 70) * 2; }
        else if (ph < PRESS_WAIT + PRESS_WARN + PRESS_DOWN) { k = (ph - PRESS_WAIT - PRESS_WARN) / PRESS_DOWN; pr.state = 'down'; k = k * k; }
        else if (ph < PRESS_WAIT + PRESS_WARN + PRESS_DOWN + PRESS_HOLD) { pr.state = 'hold'; k = 1; }
        else { pr.state = 'rise'; k = 1 - clamp((ph - PRESS_WAIT - PRESS_WARN - PRESS_DOWN - PRESS_HOLD) / PRESS_UP, 0, 1); }
        pr.bottom = pr.rest + (pr.maxBottom - pr.rest) * k;
        pr.ext = pr.bottom - pr.techoY;
        if (pr.state === 'hold' && pr.prevState === 'down') {
          if (pr.cx > camX - 200 && pr.cx < camX + G.W + 200) sfx('press');
          effects.push({ kind: 'dust', x: pr.cx, y: pr.bottom, t: 0, dur: 0.35 });
        }
        if ((pr.state === 'down' || pr.state === 'hold') && pr.bottom > pr.rest + 4) {
          var rect = { x: pr.x + 4, y: pr.techoY, w: TILE - 8, h: pr.ext };
          var hs = heroesAll();
          for (var j = 0; j < hs.length; j++) {
            var h = hs[j];
            if (h.ko || !overlap(heroRect(h), rect)) continue;
            crushHero(h, pr);
            if (leaving) return;
          }
        }
      }
    }
    function crushHero(h, pr) {
      var dir = (h.x < pr.cx) ? -1 : (h.x > pr.cx ? 1 : -h.facing);
      var target = pr.cx + dir * (TILE / 2 + h.w / 2 + 2);
      nudgeX(h, target - h.x);
      if (Math.abs(h.x - target) > 4) { dir = -dir; nudgeX(h, (pr.cx + dir * (TILE / 2 + h.w / 2 + 2)) - h.x); }
      hurtHero(h, 1, pr.cx, { desdeArriba: true });
      if (h.knockT <= 0) { h.knockT = 0.2; h.knockV = dir * 240; }
    }

    // ---------------------------------------------------------------------
    //  Enemigos (plugins)
    // ---------------------------------------------------------------------
    function updateEnemies(dt) {
      var x0 = camX - 700, x1 = camX + G.W + 700, i, e;
      for (i = 0; i < enemies.length; i++) {
        e = enemies[i];
        if (!e.alive) continue;
        var T = e.__def;
        if (e.x > x0 && e.x < x1 && T && typeof T.update === 'function' && (e.__err || 0) < 5) {
          updatingEnemy = e;
          try { T.update(e, dt, world); } catch (err) { e.__err = (e.__err || 0) + 1; warnOnce('update-' + e.__tipo, err); }
          updatingEnemy = null;
          if (!isFinite(e.x) || !isFinite(e.y)) { e.alive = false; continue; }
        }
        if (e.stun > 0) e.stun = Math.max(0, e.stun - dt);
        if (e.__push > 0) e.__push -= dt;
        if (leaving) return;
      }
      if (frameNo % 30 === 0) {
        var keep = [];
        for (i = 0; i < enemies.length; i++) { if (enemies[i].alive) keep.push(enemies[i]); }
        enemies = keep;
      }
      // Contacto: touchDamage (por defecto 1), salvo que el escudo de Peter lo pare.
      var hs = heroesAll();
      for (i = 0; i < enemies.length; i++) {
        e = enemies[i];
        if (!e.alive || e.hacked || e.invisible) continue;
        var td = (e.__def && typeof e.__def.touchDamage === 'number') ? e.__def.touchDamage : 1;
        if (td <= 0) continue;
        var r = enemyRect(e);
        for (var k = 0; k < hs.length; k++) {
          var h = hs[k];
          if (h.ko) continue;
          // Escudo de Peter de frente: no hace daño y se empuja al enemigo.
          if (h.heroe === 'peter' && h.cubriendo && sign(e.x - h.x) === h.facing && overlap(shieldRect(h), r)) { pushEnemy(e, h); continue; }
          if (overlap(heroRect(h), r)) {
            if (hurtHero(h, td, e.x) === 'bloqueado') pushEnemy(e, h);
          }
          if (leaving) return;
        }
      }
    }
    function pushEnemy(e, h) {
      if (e.__push > 0) return;
      e.__push = 0.25;
      var dir = (e.x >= h.x) ? 1 : -1;
      if (!e.flying) nudgeX(e, dir * 24); else e.x += dir * 24;
      sfx('shieldBlock');
      effects.push({ kind: 'sparkle', x: h.x + h.facing * 20, y: h.y - 34, t: 0, dur: 0.3 });
    }

    // ---------------------------------------------------------------------
    //  Proyectiles de los héroes: flechas, bolas de energía y escudo lanzado
    // ---------------------------------------------------------------------
    function enemyAtRect(rect, skip) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!targetable(e)) continue;
        if (skip && skip.indexOf(e) >= 0) continue;
        if (overlap(rect, enemyRect(e))) return e;
      }
      return null;
    }
    function updateHeroProjectiles(dt) {
      var i, e, di, bx;
      // Flechas de Falcon
      for (i = arrows.length - 1; i >= 0; i--) {
        var a = arrows[i], hit = false;
        a.vy += ARROW_GRAV * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
        a.angle = Math.atan2(a.vy, a.vx);
        bx = boxAtPt(a.x, a.y);
        di = dianaAtPt(a.x, a.y);
        if (bx) { breakBoxAt(bx.col, bx.row); hit = true; }
        else if (di) { hitDiana(di, 'arco', a.owner, a.x, a.y); hit = true; }
        else if (projSolid(a.x, a.y)) { hit = true; effects.push({ kind: 'sparkle', x: a.x, y: a.y, t: 0, dur: 0.25 }); }
        var fromA = a.x - a.vx * 0.1;
        if (!hit) {
          e = enemyAtRect({ x: a.x - 5, y: a.y - 5, w: 10, h: 10 });
          if (e) { aiSrc = a.ai ? a.owner : null; hitEnemy(e, 1, 'arco', fromA); aiSrc = null; hit = true; }
        }
        if (!hit && !a.bossHit && hitBossRect({ x: a.x - 5, y: a.y - 5, w: 10, h: 10 }, 1, 'arco', fromA, a.ai)) { a.bossHit = true; hit = true; }
        if (hit || a.life <= 0 || a.x < -40 || a.x > mapW + 40 || a.y > mapH + 40) arrows.splice(i, 1);
      }
      // Bolas de energía de Mikey
      for (i = balls.length - 1; i >= 0; i--) {
        var b = balls[i], gone = false;
        b.t += dt;
        var stepx = b.vx * dt, stepy = b.vy * dt;
        b.x += stepx; b.y += stepy; b.traveled += Math.sqrt(stepx * stepx + stepy * stepy);
        bx = boxAtPt(b.x, b.y);
        di = dianaAtPt(b.x, b.y);
        if (bx) { breakBoxAt(bx.col, bx.row); gone = true; }
        else if (di) { hitDiana(di, b.tipo, b.owner, b.x, b.y); gone = true; }
        else if (projSolid(b.x, b.y)) { gone = true; effects.push({ kind: 'bluespark', x: b.x, y: b.y, t: 0, dur: 0.3 }); }
        var fromB = b.x - b.vx * 0.1;
        var br = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
        if (b.tipo === 'francotirador') br = { x: b.x - 7, y: b.y - 3, w: 14, h: 6 };
        if (!gone) {
          e = enemyAtRect(br, b.hit);
          if (e) {
            b.hit.push(e);
            aiSrc = b.ai ? b.owner : null;
            hitEnemy(e, b.dmg, b.tipo, fromB);
            aiSrc = null;
            b.pierce--;
            if (b.pierce <= 0) gone = true;
            effects.push({ kind: 'bluespark', x: b.x, y: b.y, t: 0, dur: 0.25 });
          }
        }
        if (!gone && !b.bossHit && hitBossRect(br, b.dmg, b.tipo, fromB, b.ai)) {
          b.bossHit = true;
          if (b.tipo !== 'francotirador') gone = true;
        }
        if (b.traveled >= b.range) { gone = true; effects.push({ kind: 'bluespark', x: b.x, y: b.y, t: 0, dur: 0.2 }); }
        if (gone || b.x < -40 || b.x > mapW + 40) balls.splice(i, 1);
      }
      // Escudo lanzado de Peter
      for (i = shields.length - 1; i >= 0; i--) {
        var s = shields[i], o = s.owner;
        s.life += dt;
        s.angle += dt * 18 * (s.dx >= 0 ? 1 : -1);
        if (!o || o.ko || s.life > SH_MAXOUT) { if (o) o.shieldOut = false; shields.splice(i, 1); continue; }
        var oy = o.y - 32, px0 = s.x, py0 = s.y;
        if (s.phase === 'out') {
          var sp = SH_SPEED * (1 - (1 - SH_END) * clamp(s.traveled / s.limit, 0, 1));
          s.x += s.dx * sp * dt; s.y += s.dy * sp * dt; s.traveled += sp * dt;
          var fx = s.x + s.dx * 12, fy = s.y + s.dy * 12;
          var sb = boxAtPt(fx, fy), sd = dianaAtPt(fx, fy);
          if (sb) { breakBoxAt(sb.col, sb.row); s.phase = 'back'; }
          else if (sd) { hitDiana(sd, 'escudo', o, fx, fy); s.phase = 'back'; }
          else if (projSolid(fx, fy)) { s.phase = 'back'; sfx('clink'); effects.push({ kind: 'sparkle', x: fx, y: fy, t: 0, dur: 0.25 }); }
          if (s.traveled >= s.limit) s.phase = 'back';
        } else {
          var ddx = o.x - s.x, ddy = oy - s.y, dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          var spb = SH_BACK * dt;
          if (dd <= Math.max(SH_CATCH, spb)) { catchShield(s); shields.splice(i, 1); continue; }
          s.x += ddx / dd * spb; s.y += ddy / dd * spb;
        }
        s.vx = (s.x - px0) / Math.max(dt, 0.0001); s.vy = (s.y - py0) / Math.max(dt, 0.0001);
        var fromS = s.x - s.vx * 0.1;
        var hr = { x: s.x - 16, y: s.y - 16, w: 32, h: 32 };
        var list = (s.phase === 'out') ? s.hitOut : s.hitBack;
        for (var k = 0; k < enemies.length; k++) {
          var en = enemies[k];
          if (!targetable(en) || list.indexOf(en) >= 0) continue;
          if (!overlap(hr, enemyRect(en))) continue;
          list.push(en);
          aiSrc = s.ai ? o : null;
          hitEnemy(en, 1, 'escudo', fromS);
          aiSrc = null;
          if (s.phase === 'out') {
            // Rebota hacia el enemigo vivo más cercano que aún no haya tocado (< 180 px).
            var nb = null, nd = SH_REBOUND_R;
            if (s.rebounds < SH_REBOUNDS) {
              for (var m = 0; m < enemies.length; m++) {
                var e2 = enemies[m];
                if (!targetable(e2) || s.hitOut.indexOf(e2) >= 0) continue;
                var c2 = rectCenter(enemyRect(e2));
                var d2 = dist(s.x, s.y, c2.x, c2.y);
                if (d2 < nd) { nd = d2; nb = c2; }
              }
            }
            if (nb) {
              var vx2 = nb.x - s.x, vy2 = nb.y - s.y, l2 = Math.sqrt(vx2 * vx2 + vy2 * vy2) || 1;
              s.dx = vx2 / l2; s.dy = vy2 / l2; s.rebounds++;
              s.limit = s.traveled + nd + 30;
              sfx('clink');
            } else s.phase = 'back';
            break;
          }
        }
        if (s.phase === 'out' && !s.bossOut && hitBossRect(hr, 1, 'escudo', fromS, s.ai)) { s.bossOut = true; s.phase = 'back'; }
        else if (s.phase === 'back' && !s.bossBack && hitBossRect(hr, 1, 'escudo', fromS, s.ai)) { s.bossBack = true; }
      }
      // Pulsos (solo visual)
      for (i = pulses.length - 1; i >= 0; i--) { pulses[i].t += dt; if (pulses[i].t >= pulses[i].dur) pulses.splice(i, 1); }
    }

    // ---------------------------------------------------------------------
    //  Proyectiles y rayos de los enemigos (y aliados)
    // ---------------------------------------------------------------------
    function spawnShot(p) {
      if (!p || typeof p !== 'object') return;
      var s = {
        x: num(p.x, 0), y: num(p.y, 0), vx: num(p.vx, 0), vy: num(p.vy, 0), r: num(p.r, 6),
        dmg: num(p.dmg, 1), from: (p.from === 'ally') ? 'ally' : 'enemy', kind: p.kind || 'laser',
        life: num(p.life, 3), gravity: num(p.gravity, 0), t: 0
      };
      if (shots.length < 200) shots.push(s);
    }
    function updateShots(dt) {
      for (var i = shots.length - 1; i >= 0; i--) {
        var s = shots[i];
        s.t += dt;
        s.vy += s.gravity * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        var remove = false;
        if (projSolid(s.x, s.y)) { remove = true; effects.push({ kind: 'sparkle', x: s.x, y: s.y, t: 0, dur: 0.25 }); }
        var sr = { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
        var fromX = s.x - s.vx * 0.1;
        if (!remove && s.from === 'enemy') {
          // 1) El escudo de Peter (cubriéndose) destruye lo que le llega de frente.
          for (var q = 0; q < heroes.length && !remove; q++) {
            var pp = heroes[q];
            if (pp.heroe !== 'peter' || !pp.cubriendo || pp.ko || pp.warpPending) continue;
            if (sign(fromX - pp.x) !== pp.facing || !overlap(sr, shieldRect(pp))) continue;
            shieldBlockFx(pp, s.x, s.y);
            sayThanks(protectedBehind(pp), pp);
            remove = true;
          }
          // 2) Héroes
          if (!remove) {
            var hs = heroesAll();
            for (var k = 0; k < hs.length; k++) {
              var h = hs[k];
              if (h.ko || !overlap(sr, heroRect(h))) continue;
              hurtHero(h, s.dmg, fromX);
              remove = true;
              break;
            }
          }
          if (leaving) return;
        } else if (!remove) {
          var e = enemyAtRect(sr);
          if (e) { hitEnemy(e, s.dmg, 'aliado', fromX); remove = true; }
        }
        if (remove || s.life <= 0 || s.x < -60 || s.x > mapW + 60 || s.y > mapH + 60 || s.y < -200) shots.splice(i, 1);
      }
    }
    function spawnBeam(b) {
      if (!b || typeof b !== 'object') return;
      var life = num(b.life, 0.4);
      beams.push({
        x1: num(b.x1, 0), y1: num(b.y1, 0), x2: num(b.x2, 0), y2: num(b.y2, 0), dmg: num(b.dmg, 1),
        from: (b.from === 'ally') ? 'ally' : 'enemy', life: life, maxLife: life || 0.4, width: num(b.width, 10),
        hit: [], cut: 1, blocked: false
      });
    }
    function segTouches(b, r, f1) {
      var pad = b.width / 2;
      var rr = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
      var len = dist(b.x1, b.y1, b.x2, b.y2) * f1, n = Math.max(1, Math.ceil(len / 8));
      for (var i = 0; i <= n; i++) {
        var f = (i / n) * f1, px = b.x1 + (b.x2 - b.x1) * f, py = b.y1 + (b.y2 - b.y1) * f;
        if (px >= rr.x && px <= rr.x + rr.w && py >= rr.y && py <= rr.y + rr.h) return f;
      }
      return -1;
    }
    function updateBeams(dt) {
      for (var i = beams.length - 1; i >= 0; i--) {
        var b = beams[i];
        b.life -= dt;
        if (b.from === 'enemy') {
          // El escudo de Peter CORTA el rayo (lo de detrás no recibe daño).
          b.cut = 1;
          var cutBy = null;
          for (var q = 0; q < heroes.length; q++) {
            var pp = heroes[q];
            if (pp.heroe !== 'peter' || !pp.cubriendo || pp.ko || pp.warpPending) continue;
            if (sign(b.x1 - pp.x) !== pp.facing) continue;
            var f = segTouches(b, shieldRect(pp), 1);
            if (f >= 0 && f < b.cut) { b.cut = f; cutBy = pp; }
          }
          if (cutBy && !b.blocked) { b.blocked = true; shieldBlockFx(cutBy, cutBy.x + cutBy.facing * 20, cutBy.y - 34); sayThanks(protectedBehind(cutBy), cutBy); }
          var hs = heroesAll();
          for (var k = 0; k < hs.length; k++) {
            var h = hs[k];
            if (h.ko || segTouches(b, heroRect(h), b.cut) < 0) continue;
            hurtHero(h, b.dmg, b.x1);
            if (leaving) return;
          }
        } else {
          for (var j = 0; j < enemies.length; j++) {
            var e = enemies[j];
            if (!targetable(e) || b.hit.indexOf(e) >= 0) continue;
            if (segTouches(b, enemyRect(e), 1) >= 0) { b.hit.push(e); hitEnemy(e, b.dmg, 'aliado', b.x1); }
          }
        }
        if (b.life <= 0) beams.splice(i, 1);
      }
    }

    // ---- Efectos ----
    function spawnEffect(kind, x, y, opts) {
      opts = opts || {};
      x = num(x, 0); y = num(y, 0);
      if (effects.length > 300) return;
      if (kind === 'explosion') effects.push({ kind: 'pop', x: x, y: y, t: 0, dur: num(opts.life, 0.45), r: num(opts.r, 26) });
      else if (kind === 'exclaim') effects.push({ kind: 'exclaim', x: x, y: y, t: 0, dur: num(opts.life, 0.8), owner: updatingEnemy });
      else if (kind === 'texto') effects.push({ kind: 'texto', x: x, y: y, t: 0, dur: num(opts.life, 1.0), texto: String(opts.texto == null ? '' : opts.texto), color: opts.color || '#fef3c7' });
      else if (kind === 'confeti') effects.push({ kind: 'confeti', x: x, y: y, t: 0, dur: num(opts.life, 1.2), seed: rnd() * 100 });
      else effects.push({ kind: 'sparkle', x: x, y: y, t: 0, dur: num(opts.life, 0.4) });
    }

    // ---- Corazones: la IA solo los coge si algún jugador está herido ----
    function mostHurtPlayer() {
      var best = null, bd = 0;
      for (var i = 0; i < players.length; i++) {
        var pl = players[i];
        if (pl.ko) continue;
        var miss = plMax(pl) - plHp(pl);
        if (miss > bd) { bd = miss; best = pl; }
      }
      return best;
    }
    function updatePickups(dt) {
      for (var i = pickups.length - 1; i >= 0; i--) {
        var pk = pickups[i];
        pk.t += dt;
        if (!pk.grounded) {
          pk.vy += GRAV * dt; pk.y += pk.vy * dt;
          if (pk.vy > 0 && groundPt(pk.x, pk.y + 12)) { pk.y = Math.floor((pk.y + 12) / TILE) * TILE - 12; pk.vy = 0; pk.grounded = true; }
          if (pk.y > mapH + 40) { pickups.splice(i, 1); continue; }
        }
        var pr = { x: pk.x - 16, y: pk.y - 16, w: 32, h: 32 };
        var hs = heroesAll(), taker = null, td = Infinity;
        var hurt = mostHurtPlayer();
        for (var q = 0; q < hs.length; q++) {
          var hh = hs[q];
          if (hh.ko || !overlap(pr, heroRect(hh))) continue;
          if (hh.isAI && !hurt) continue;
          var d = dist(pk.x, pk.y, hh.x, hh.y - hh.h / 2);
          if (d < td) { td = d; taker = hh; }
        }
        if (!taker) continue;
        var healed = taker.isAI ? hurt : playerOf(taker);
        if (healed && !healed.ko && plHp(healed) < plMax(healed)) setPlHp(healed, Math.min(plMax(healed), plHp(healed) + 2));
        sfx('pickup');
        effects.push({ kind: 'sparkle', x: pk.x, y: pk.y, t: 0, dur: 0.4 });
        if (taker.isAI && healed && healed.hero) effects.push({ kind: 'sparkle', x: healed.hero.x, y: healed.hero.y - healed.hero.h, t: 0, dur: 0.5 });
        pickups.splice(i, 1);
      }
    }
    function updateEffects(dt) {
      for (var i = effects.length - 1; i >= 0; i--) {
        var ef = effects[i];
        ef.t += dt;
        if (ef.follow) { ef.x = ef.follow.x; ef.y = ef.follow.y + ef.dy; }
        if (ef.t >= ef.dur) effects.splice(i, 1);
      }
    }
    function updateCamera(dt) {
      var focus = cameraFocus();
      var tx = clampCamX(focus.x - G.W / 2), ty = clampCamY(focus.y - G.H / 2);
      if (arena && arena.activa) tx = clampCamX(arena.col * TILE);
      var k = clamp((1 - Math.pow(0.001, dt)) * 6, 0, 1);
      camX = clampCamX(camX + (tx - camX) * k);
      camY = clampCamY(camY + (ty - camY) * k);
    }

    // ---------------------------------------------------------------------
    //  ARENA y JEFE a pie (§9.5)
    // ---------------------------------------------------------------------
    function safeZones() {
      if (!boss || !bossDef || typeof bossDef.zones !== 'function') return [];
      var zs = null;
      try { zs = bossDef.zones(boss); } catch (e) { warnOnce('boss-zones', e); zs = null; }
      if (!Array.isArray(zs)) return [];
      var out = [];
      for (var i = 0; i < zs.length; i++) {
        var z = zs[i];
        if (z && isFinite(z.x) && isFinite(z.y) && isFinite(z.w) && isFinite(z.h)) out.push(z);
      }
      return out;
    }
    // Daño de una IA al jefe (§5.3, ×0,35): "ayudan, pero el que gana es el jugador".
    // 0 en el examen del capítulo 1. Si ningún jugador le ha acertado en los últimos 4 s, la
    // mitad, y solo hasta el 60 % de su vida (ver aiBossFloor).
    var lastHumanBossHit = -99;
    function aiHelpActive() { return tNow - lastHumanBossHit <= AI_HELP_WINDOW; }
    function aiBossDamage(dmg) {
      if (def.chapter === 1 || bossTipo === 'robotPractica') return 0;
      return dmg * AI_BOSS_MULT * (aiHelpActive() ? 1 : AI_IDLE_MULT);
    }
    // Vida por debajo de la cual solo pega el jugador (el remate siempre es suyo; y si el jugador
    // no está pegando, las IA no pasan del 60 %).
    function aiBossFloor() {
      var mx = num(boss.maxHp, 10);
      return Math.max(1, mx * (aiHelpActive() ? AI_FINISH_FRAC : AI_IDLE_FLOOR));
    }
    // Un golpe (rectángulo) contra el jefe: UNA zona por impacto (la primera del array).
    function hitBossRect(rect, dmg, kind, fromX, isAI) {
      if (!boss || bossPhase !== 'fight' || num(boss.hp, 0) <= 0) return false;
      var zs = safeZones();
      var zone = null;
      for (var i = 0; i < zs.length; i++) { if (overlap(rect, zs[i])) { zone = zs[i]; break; } }
      if (!zone) return false;
      var cx = clamp(num(fromX, zone.x + zone.w / 2), zone.x, zone.x + zone.w), cy = clamp(rect.y + rect.h / 2, zone.y, zone.y + zone.h);
      var d = dmg;
      if (isAI) {
        d = aiBossDamage(dmg);
        // Sin daño: chispita sin sonido (no se llama a onHit: la IA no activa mecánicas del jefe).
        if (d <= 0) { effects.push({ kind: 'sparkle', x: cx, y: cy, t: 0, dur: 0.2 }); return true; }
      } else lastHumanBossHit = tNow;
      var applied = d;
      if (typeof bossDef.onHit === 'function') {
        try { applied = num(bossDef.onHit(boss, d, kind, zone, fromX, world), 0); } catch (e) { warnOnce('boss-onHit', e); applied = d; }
      }
      if (isAI && applied > 0) {
        applied = Math.min(applied, Math.max(0, num(boss.hp, 0) - aiBossFloor()));
        if (applied <= 0) { effects.push({ kind: 'sparkle', x: cx, y: cy, t: 0, dur: 0.2 }); return true; }
      }
      if (applied > 0) {
        boss.hp = num(boss.hp, 0) - applied;
        sfx('hit');
        effects.push({ kind: zone.tipo === 'debil' ? 'stars' : 'sparkle', x: cx, y: cy, t: 0, dur: 0.35 });
      } else {
        sfx('clink');
        effects.push({ kind: 'sparkle', x: cx, y: cy, t: 0, dur: 0.3 });
      }
      return true;
    }
    function checkArenaStart() {
      if (!arena || arena.activa || bossPhase !== 'none') return;
      var hs = aliveHumanHeroes();
      for (var i = 0; i < hs.length; i++) {
        if (hs[i].x > (arena.col + 2) * TILE) { startFight(undefined); return; }
      }
    }
    function startFight(fase) {
      if (!arena) return;
      arena.activa = true;
      sfx('door');
      // Todos dentro: IA y jugadores (no K.O.) que sigan fuera reaparecen junto al líder.
      var L = leaderHero();
      for (var i = 0; i < heroes.length; i++) {
        var h = heroes[i];
        if (h.ko) continue;
        if (h.x - h.w / 2 < arena.x0 || h.warpPending || h.x > arena.x1) {
          var base = (L && L !== h && L.x > arena.x0 && !L.ko) ? L : null;
          var tx = base ? safeSideX(base.x, base.y, [-50, 50, -90, 90, 0], h.w) : arena.x0 + 40 + 30 * i;
          resetMotion(h, clamp(tx, arena.x0 + 20, arena.x1 - 20), base ? base.y : arena.sueloY);
          h.warpPending = false;
          h.invuln = Math.max(h.invuln, 0.5);
          effects.push({ kind: 'sparkle', x: h.x, y: h.y - h.h / 2, t: 0, dur: 0.5 });
        }
      }
      music(def.musicaJefe || 'boss3');
      // Crea el jefe (o el de prueba si falta su tipo).
      bossTipo = def.jefe || null;
      var T = null;
      try { T = (bossTipo && G.P3B && G.P3B.types) ? G.P3B.types[bossTipo] : null; } catch (e0) { T = null; }
      if (!T || typeof T.create !== 'function') T = TEST_BOSS;
      bossDef = T;
      var opts = { fase: fase, chapter: def.chapter || 1 };
      var bx = bossSpot ? bossSpot.x : (arena.x0 + arena.x1) / 2, by = bossSpot ? bossSpot.y : arena.sueloY;
      boss = null;
      try { boss = T.create(world, bx, by, opts); } catch (e1) { warnOnce('boss-create', e1); boss = null; }
      if (!boss || typeof boss !== 'object') {
        bossDef = T = TEST_BOSS;
        boss = TEST_BOSS.create(world, bx, by, opts);
      }
      boss.x = num(boss.x, bx); boss.y = num(boss.y, by);
      boss.hp = num(boss.hp, 10); boss.maxHp = num(boss.maxHp, Math.max(1, boss.hp));
      if (boss.facing !== 1 && boss.facing !== -1) boss.facing = -1;
      if (boss.fase === undefined) boss.fase = 1;
      bossT = 0; bossErr = 0;
      if (fase === 'victoria') { boss.hp = 0; bossPhase = 'defeat'; }
      else if (fase !== undefined || typeof T.intro !== 'function') bossPhase = 'fight';
      else bossPhase = 'intro';
      syncWorld();
    }
    function bossCall(name, a, b2) {
      if (!bossDef || typeof bossDef[name] !== 'function') return undefined;
      try { return bossDef[name](boss, a, b2); } catch (e) { bossErr++; warnOnce('boss-' + name, e); return undefined; }
    }
    function updateBoss(dt) {
      if (!boss || bossPhase === 'none' || bossPhase === 'won') return;
      bossT += dt;
      if (bossPhase === 'intro') {
        var done = bossCall('intro', bossT, world);
        if (done === true || done === undefined || bossT > 8) { bossPhase = 'fight'; bossT = 0; }
        return;
      }
      if (bossPhase === 'fight') {
        if (bossErr < 30) bossCall('update', dt, world);
        if (leaving) return;
        if (!isFinite(boss.x) || !isFinite(boss.y)) { boss.x = (arena.x0 + arena.x1) / 2; boss.y = arena.sueloY; }
        // Contacto con el cuerpo del jefe
        var tr = null;
        if (typeof bossDef.touchRect === 'function') { try { tr = bossDef.touchRect(boss); } catch (e) { tr = null; } }
        if (tr && isFinite(tr.x) && isFinite(tr.w)) {
          var td = (typeof bossDef.touchDamage === 'number') ? bossDef.touchDamage : 1;
          var hs = heroesAll();
          for (var i = 0; i < hs.length; i++) {
            if (hs[i].ko || !overlap(heroRect(hs[i]), tr)) continue;
            hurtHero(hs[i], td, boss.x);
            if (leaving) return;
          }
        }
        if (num(boss.hp, 0) <= 0) {
          boss.hp = 0; bossPhase = 'defeat'; bossT = 0;
          // Los guardias que queden hacen "pop" a la vez.
          for (var k = 0; k < enemies.length; k++) { if (enemies[k].alive && !enemies[k].hacked) killEnemy(enemies[k]); }
          shots = []; beams = [];
          // Fuera los avisos de suelo ("!" con anillo rojo) y los "!" que quedaran: ya no ataca nadie.
          for (var w = effects.length - 1; w >= 0; w--) { if (effects[w].kind === 'warn' || effects[w].kind === 'exclaim') effects.splice(w, 1); }
        }
        return;
      }
      if (bossPhase === 'defeat') {
        var fin = (typeof bossDef.defeat === 'function') ? bossCall('defeat', bossT, world) : (bossT > 1.5);
        if (fin === true || bossT > 9 || (fin === undefined && bossT > 2)) {
          bossPhase = 'won';
          finishLevel();
        }
      }
    }
    function finishLevel() {
      leaving = true;
      retryMem = null;
      try {
        if (def.alGanar === 'fusionFinal') {
          var j = 1;
          try { if (typeof G.p3pilotoFusion === 'function') j = G.p3pilotoFusion(5) === 2 ? 2 : 1; } catch (e0) { j = 1; }
          var pl = players[j - 1] || players[0];
          var piloto = (pl && pl.hero) ? pl.hero.heroe : 'director';
          if (G.scenes && G.scenes.levelP3_5f) { G.go('levelP3_5f', { nuevo: true, piloto: piloto }); return; }
          G.go('title');
          return;
        }
        sfx('victory');
        if (G.scenes && G.scenes.levelDoneP3) G.go('levelDoneP3', { chapter: def.chapter || 1 });
        else G.go('title');
      } catch (e) { warnOnce('finish', e); }
    }

    // =====================================================================
    //  RENDER
    // =====================================================================
    scene.render = function (ctx) {
      if (!ctx) return;
      if (!players.length) { ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, G.W, G.H); return; }
      ctx.save();
      try { drawBackground(ctx); } catch (e) { warnOnce('bg', e); }
      ctx.restore();
      var sx = 0, sy = 0;
      if (shakeAmp > 0) { sx = (rnd() * 2 - 1) * shakeAmp * 8; sy = (rnd() * 2 - 1) * shakeAmp * 6; }
      ctx.save();
      ctx.translate(-Math.round(camX) + sx, -Math.round(camY) + sy);
      for (var i = 0; i < WORLD_LAYERS.length; i++) {
        ctx.save();
        try { WORLD_LAYERS[i](ctx); } catch (e2) { warnOnce('render-' + i, e2); }
        ctx.restore();
      }
      ctx.restore();
      ctx.save();
      try { drawHud(ctx); } catch (e3) { warnOnce('hud', e3); }
      ctx.restore();
    };

    // ---- Fondo ----
    function drawBackground(ctx) {
      var ok = false, tema = def.tema || 'cielo';
      if (tema === 'fabricaOscura') ok = art('bgFabricaOscura', ctx, camX, tNow) || art('bgFabrica', ctx, camX, tNow);
      else if (tema === 'arena') ok = art('bgArenaRobovill', ctx, tNow) || art('bgFabrica', ctx, camX, tNow);
      else ok = art('bgBaseCielo', ctx, camX, tNow) || art('bgFortaleza', ctx, tNow);
      if (!ok) drawBgFallback(ctx, tema);
    }
    function drawBgFallback(ctx, tema) {
      var g = ctx.createLinearGradient(0, 0, 0, G.H);
      if (tema === 'cielo') { g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#bae6fd'); }
      else { g.addColorStop(0, '#111827'); g.addColorStop(1, '#3f1d2b'); }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.fillStyle = (tema === 'cielo') ? 'rgba(255,255,255,0.75)' : 'rgba(239,68,68,0.18)';
      for (var i = 0; i < 6; i++) {
        var x = ((i * 220 - camX * 0.2) % 1320 + 1320) % 1320 - 180, y = 80 + (i % 3) * 70;
        ctx.beginPath(); ctx.ellipse(x, y, 70, 22, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---- Tiles ----
    function drawTileArt(ctx, x, y, tipo, estado) {
      var tema = def.tema || 'cielo';
      if (art('tile3', ctx, x, y, TILE, tipo, tema, estado)) return true;
      if (tipo === 'cintaIzq' || tipo === 'cintaDer') { if (art('tile', ctx, x, y, TILE, tipo, TEMA_P2[tema] || 'fabrica', estado)) return true; drawBeltFallback(ctx, x, y, tipo === 'cintaIzq' ? -1 : 1); return false; }
      if (tipo === 'laserEmisor' || tipo === 'diana' || tipo === 'palanca' || tipo === 'puertaArena') return false;
      if (art('tile', ctx, x, y, TILE, tipo, TEMA_P2[tema] || 'fabrica', estado)) return true;
      var dt = gfx('drawTile');
      if (dt) { try { dt(ctx, x, y, TILE, tipo, TEMA_P1[tema] || 'base'); return false; } catch (e) { /* abajo */ } }
      ctx.fillStyle = (tipo === 'spike') ? '#94a3b8' : '#475569';
      ctx.fillRect(x, y, TILE, tipo === 'platform' ? 14 : TILE);
      return false;
    }
    function drawBeltFallback(ctx, x, y, dir) {
      ctx.save();
      roundRect(ctx, x + 1, y + 2, TILE - 2, TILE - 4, 8);
      ctx.fillStyle = '#334155'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      var off = ((tNow * BELT_SPEED * dir) % 16 + 16) % 16;
      ctx.beginPath(); ctx.rect(x + 3, y + 4, TILE - 6, 12); ctx.clip();
      for (var sx = x - 16 + off; sx < x + TILE + 16; sx += 16) {
        ctx.beginPath();
        if (dir > 0) { ctx.moveTo(sx, y + 6); ctx.lineTo(sx + 6, y + 10); ctx.lineTo(sx, y + 14); }
        else { ctx.moveTo(sx + 6, y + 6); ctx.lineTo(sx, y + 10); ctx.lineTo(sx + 6, y + 14); }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    function drawTiles(ctx) {
      var c0 = Math.floor(camX / TILE) - 1, c1 = Math.floor((camX + G.W) / TILE) + 1;
      var r0 = Math.floor(camY / TILE) - 1, r1 = Math.floor((camY + G.H) / TILE) + 1;
      for (var row = r0; row <= r1; row++) {
        for (var col = c0; col <= c1; col++) {
          var ch = tileAt(rows, col, row), tipo = null;
          if (ch === '#' || ch === 'T') tipo = 'solid';
          else if (ch === '=') tipo = 'platform';
          else if (ch === '^') tipo = 'spike';
          else if (ch === '<') tipo = 'cintaIzq';
          else if (ch === '>') tipo = 'cintaDer';
          else if (ch === 'B') { if (brokenBoxes[col + ',' + row]) continue; tipo = 'box'; }
          if (tipo) drawTileArt(ctx, col * TILE, row * TILE, tipo);
        }
      }
    }
    function onScreenX(x, m) { return x > camX - m && x < camX + G.W + m; }

    function drawDoorsConsolesFlags(ctx) {
      var i;
      for (i = 0; i < doors.length; i++) {
        var d = doors[i];
        if (d.open || !onScreenX(d.cx, 80)) continue;
        drawTileArt(ctx, d.col * TILE, d.row * TILE, 'door');
      }
      for (i = 0; i < activators.length; i++) {
        var a = activators[i];
        if (!onScreenX(a.cx, 80)) continue;
        if (a.tipo === 'C') {
          var conArt = drawTileArt(ctx, a.col * TILE, a.row * TILE, 'console', a.hecho);
          if (a.hecho && !conArt) drawCheck(ctx, a.cx, a.row * TILE + 6);
        } else if (a.tipo === 'T') drawDiana(ctx, a);
        else if (a.tipo === 'R') drawPalanca(ctx, a);
      }
      for (i = 0; i < arenaConsoles.length; i++) {
        var ac = arenaConsoles[i];
        if (!onScreenX(ac.cx, 80)) continue;
        if (ac.rearm > 0) {
          // Recargando: la consola apagada (NO "hecha": sin marca verde), un anillo grueso
          // amarillo que se va llenando y el texto "¡Recargando!".
          ctx.save();
          ctx.globalAlpha = 0.5;
          drawTileArt(ctx, ac.col * TILE, ac.row * TILE, 'console', false);
          ctx.globalAlpha = 1;
          var fr = clamp(1 - ac.rearm / ARENA_REARM, 0, 1);
          ctx.lineCap = 'round';
          ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(30,20,55,0.75)';
          ctx.beginPath(); ctx.arc(ac.cx, ac.cy - 4, 20, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 6; ctx.strokeStyle = '#facc15';
          if (fr > 0.01) { ctx.beginPath(); ctx.arc(ac.cx, ac.cy - 4, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr); ctx.stroke(); }
          ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.fillStyle = '#fde68a';
          // Que el texto no quede debajo de la pared de la arena.
          var rw = (ctx.measureText('¡Recargando!').width || 80) / 2 + 6, rx = ac.cx;
          if (arena) rx = clamp(rx, arena.x0 + rw, arena.x1 - rw);
          ctx.strokeText('¡Recargando!', rx, ac.row * TILE - 14); ctx.fillText('¡Recargando!', rx, ac.row * TILE - 14);
          ctx.restore();
        } else {
          drawTileArt(ctx, ac.col * TILE, ac.row * TILE, 'console', false);
          if (bossPhase === 'fight') {
            // Lista: parpadea en cian para invitar a hackearla.
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.sin(tNow * 5) * 0.2;
            ctx.fillStyle = '#22d3ee';
            ctx.beginPath(); ctx.arc(ac.cx, ac.cy - 4, 24, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        }
      }
      for (i = 0; i < checkpoints.length; i++) {
        var k = checkpoints[i];
        if (!onScreenX(k.cx, 80)) continue;
        if (!drawTileArt(ctx, k.x, k.y, 'checkpoint', k.taken) && k.taken) drawCheck(ctx, k.x + TILE - 8, k.y + TILE - 10);
      }
      // Puerta de la arena
      if (arena) {
        for (var r = 0; r < mapRows; r++) {
          if (tileAt(rows, arena.col, r) !== '{') continue;
          var x = arena.col * TILE, y = r * TILE;
          if (!onScreenX(x, 80)) continue;
          if (!drawTileArt(ctx, x, y, 'puertaArena', { cerrada: arena.activa })) drawArenaDoorFallback(ctx, x, y, arena.activa);
        }
      }
    }
    function drawArenaDoorFallback(ctx, x, y, closed) {
      ctx.save();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(x + 2, y, 8, TILE); ctx.strokeRect(x + 2, y, 8, TILE);
      ctx.fillRect(x + TILE - 10, y, 8, TILE); ctx.strokeRect(x + TILE - 10, y, 8, TILE);
      if (closed) {
        ctx.fillStyle = '#9ca3af';
        for (var i = 0; i < 4; i++) { ctx.fillRect(x + 12 + i * 7, y, 5, TILE); ctx.strokeRect(x + 12 + i * 7, y, 5, TILE); }
      } else {
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#fca5a5'; ctx.fillRect(x + 10, y, TILE - 20, TILE);
      }
      ctx.restore();
    }
    function drawCheck(ctx, x, y) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x - 3.5, y); ctx.lineTo(x - 1, y + 2.8); ctx.lineTo(x + 3.8, y - 2.6); ctx.stroke();
      ctx.restore();
    }
    function drawDiana(ctx, a) {
      if (art('diana', ctx, a.cx, a.cy, { hecha: a.hecho, t: tNow, scale: 1 })) return;
      ctx.save();
      var cols = a.hecho ? ['#22c55e', '#f0fdf4', '#22c55e'] : ['#ef4444', '#ffffff', '#ef4444'];
      var rs = [19, 13, 7];
      for (var i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(a.cx, a.cy, rs[i], 0, Math.PI * 2);
        ctx.fillStyle = cols[i]; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
      }
      if (a.hecho) drawCheck(ctx, a.cx + 14, a.cy - 14);
      ctx.restore();
    }
    function drawPalanca(ctx, a) {
      var py = a.row * TILE + TILE;
      if (art('palanca', ctx, a.cx, py, { hecha: a.hecho, t: tNow })) return;
      ctx.save();
      ctx.lineCap = 'round';
      roundRect(ctx, a.cx - 14, py - 10, 28, 10, 3);
      ctx.fillStyle = '#475569'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
      var ang = a.hecho ? 0.7 : -0.7;
      var tx = a.cx + Math.sin(ang) * 26, ty = py - 8 - Math.cos(ang) * 26;
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(a.cx, py - 8); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a.cx, py - 8); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2);
      ctx.fillStyle = a.hecho ? '#22c55e' : '#ef4444'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
      if (!a.hecho) {
        ctx.globalAlpha = 0.3 + Math.sin(tNow * 4) * 0.2;
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(a.cx, py - 20, 26, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    function drawBarriers(ctx) {
      for (var i = 0; i < barriers.length; i++) {
        var b = barriers[i];
        if (!onScreenX(b.cx, 80)) continue;
        if (art('barreraLaser', ctx, b.cx, b.y0, b.y1, { activa: b.active, t: tNow, cruzando: b.cruzando > 0 })) continue;
        ctx.save();
        // emisores arriba y abajo
        ctx.fillStyle = '#475569'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
        roundRect(ctx, b.cx - 12, b.y0, 24, 10, 3); ctx.fill(); ctx.stroke();
        roundRect(ctx, b.cx - 12, b.y1 - 10, 24, 10, 3); ctx.fill(); ctx.stroke();
        if (b.active) {
          var a = 0.6 + Math.sin(tNow * 20) * 0.2;
          ctx.globalAlpha = 0.3 * a; ctx.fillStyle = '#f472b6';
          ctx.fillRect(b.cx - 10, b.y0 + 10, 20, b.y1 - b.y0 - 20);
          ctx.globalAlpha = a; ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 3;
          for (var k = -1; k <= 1; k++) {
            ctx.beginPath(); ctx.moveTo(b.cx + k * 6, b.y0 + 10);
            for (var yy = b.y0 + 10; yy <= b.y1 - 10; yy += 12) ctx.lineTo(b.cx + k * 6 + Math.sin(yy * 0.2 + tNow * 30 + k) * 2, yy);
            ctx.stroke();
          }
          ctx.globalAlpha = 1; ctx.strokeStyle = '#fdf2f8'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(b.cx, b.y0 + 10); ctx.lineTo(b.cx, b.y1 - 10); ctx.stroke();
        } else {
          ctx.fillStyle = '#334155';
          ctx.beginPath(); ctx.arc(b.cx, b.y0 + 14, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
    function drawHackRing(ctx, cx, cy, frac) {
      ctx.save();
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(34,211,238,0.35)';
      ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#22d3ee';
      ctx.beginPath(); ctx.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1)); ctx.stroke();
      ctx.restore();
    }
    function drawHackOverlays(ctx) {
      var i;
      for (i = 0; i < activators.length; i++) {
        var c = activators[i];
        if (c.tipo === 'C' && !c.hecho && c.progress > 0) drawHackRing(ctx, c.cx, c.cy - 4, c.progress);
      }
      for (i = 0; i < arenaConsoles.length; i++) {
        var ac = arenaConsoles[i];
        if (ac.rearm <= 0 && ac.progress > 0) drawHackRing(ctx, ac.cx, ac.cy - 4, ac.progress);
      }
      for (i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.alive && !e.hacked && e.__hackFrac > 0) { var ec = rectCenter(enemyRect(e)); drawHackRing(ctx, ec.x, ec.y, e.__hackFrac); }
      }
      // Rayo de hackeo: del Director a lo que hackea, y de la consola de la arena al jefe.
      var hb = gfx('drawHackBeam');
      for (i = 0; i < heroes.length; i++) {
        var p = heroes[i];
        if (p.hackTarget && p.hackProgress > 0 && hb) { try { hb(ctx, p.x + p.facing * 12, p.y - 34, p.hackTarget.x, p.hackTarget.y, tNow); } catch (e1) { /* nada */ } }
      }
      if (boss && hb) {
        var tp = bossHackPoint();
        for (i = 0; i < hackLinks.length; i++) { try { hb(ctx, hackLinks[i].x1, hackLinks[i].y1, tp.x, tp.y, tNow); } catch (e2) { /* nada */ } }
      }
    }
    // Punto del jefe al que va el rayo de la consola (el generador del Guardián, §13.2).
    function bossHackPoint() {
      var P = window.P2;
      try {
        if (bossTipo === 'guardian' && P && P.P3PUNTOS && P.P3PUNTOS.guardianRobovill && P.P3PUNTOS.guardianRobovill.generador) {
          var g = P.P3PUNTOS.guardianRobovill.generador, s = 230 / altoArte('guardianRobovill');
          return { x: boss.x + g[0] * s * (boss.facing || 1), y: boss.y + g[1] * s };
        }
      } catch (e) { /* abajo */ }
      var zs = safeZones();
      if (zs.length) return { x: zs[zs.length - 1].x + zs[zs.length - 1].w / 2, y: zs[zs.length - 1].y + zs[zs.length - 1].h / 2 };
      return { x: boss.x, y: boss.y - 80 };
    }
    function drawExit(ctx) {
      if (!exitRect || !onScreenX(exitRect.cx, 80)) return;
      drawTileArt(ctx, Math.floor(exitRect.cx / TILE) * TILE, Math.floor(exitRect.cy / TILE) * TILE, 'exit');
    }

    // ---- Prensas ----
    function drawPresses(ctx) {
      for (var i = 0; i < presses.length; i++) {
        var pr = presses[i];
        if (!onScreenX(pr.cx, 80)) continue;
        ctx.save();
        if (pr.shake) ctx.translate(pr.shake, 0);
        var b01 = clamp((pr.bottom - pr.techoY - PRESS_REST * TILE) / (PRESS_MAX - PRESS_REST * TILE), 0, 1);
        if (!art('prensa', ctx, pr.x, pr.techoY, b01, TILE)) drawPressFallback(ctx, pr);
        ctx.restore();
        if (pr.state === 'warn') {
          var ex = gfx('drawExclamation');
          if (ex) { try { ex(ctx, pr.cx, pr.techoY + TILE + 22); } catch (e) { /* nada */ } }
        }
      }
    }
    function drawPressFallback(ctx, pr) {
      var x = pr.x, y = pr.techoY, ext = pr.bottom - pr.techoY;
      ctx.save();
      roundRect(ctx, x + 2, y, TILE - 4, 18, 4);
      ctx.fillStyle = '#475569'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      if (ext > 4) { ctx.fillStyle = '#94a3b8'; ctx.fillRect(x + TILE / 2 - 6, y + 16, 12, Math.max(0, ext - 16)); }
      var hy = y + Math.max(14, ext) - 14;
      roundRect(ctx, x + 1, hy, TILE - 2, 16, 3);
      ctx.fillStyle = '#facc15'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    function drawPickups(ctx) {
      var dh = gfx('drawHeart');
      for (var i = 0; i < pickups.length; i++) {
        var pk = pickups[i];
        if (!onScreenX(pk.x, 40)) continue;
        var bob = Math.sin((pk.t || 0) * 4) * 3;
        if (dh) { try { dh(ctx, pk.x, pk.y + bob, 22, 'full'); continue; } catch (e) { /* abajo */ } }
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 8, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---- Enemigos y jefe ----
    function drawEnemies(ctx) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive || !onScreenX(e.x, 160)) continue;
        var T = e.__def;
        ctx.save();
        try {
          if (T && typeof T.draw === 'function') T.draw(ctx, e, world);
          else if (!e.invisible) { var r0 = enemyRect(e); ctx.fillStyle = '#64748b'; ctx.fillRect(r0.x, r0.y, r0.w, r0.h); }
        } catch (err) { warnOnce('draw-' + e.__tipo, err); }
        ctx.restore();
      }
    }
    function drawBoss(ctx) {
      if (!boss || !bossDef || bossPhase === 'none') return;
      ctx.save();
      try { if (typeof bossDef.draw === 'function') bossDef.draw(ctx, boss, world); } catch (e) { warnOnce('boss-draw', e); }
      ctx.restore();
    }
    function drawShots(ctx) {
      var lb = gfx('drawLaserBolt');
      for (var i = 0; i < shots.length; i++) {
        var s = shots[i];
        if (!onScreenX(s.x, 40)) continue;
        var enemy = (s.from === 'enemy');
        var col = enemy ? '#f87171' : '#4ade80';
        ctx.save();
        try {
          if (s.kind === 'laser' || s.kind === 'rayo') {
            if (s.kind === 'rayo') col = enemy ? '#fb7185' : '#86efac';
            ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
            if (lb) lb(ctx, 0, 0, s.kind === 'rayo' ? 22 : 16, col);
            else { ctx.fillStyle = col; ctx.fillRect(-8, -3, 16, 6); }
          } else if (s.kind === 'espuma') {
            var r = Math.max(6, s.r);
            ctx.fillStyle = 'rgba(253,242,248,0.95)'; ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fbcfe8';
            for (var k = 0; k < 3; k++) { var a = s.t * 6 + k * 2.1; ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * r * 0.9, s.y + Math.sin(a) * r * 0.9, r * 0.35, 0, Math.PI * 2); ctx.fill(); }
          } else if (s.kind === 'roca') {
            if (!art('roca', ctx, s.x, s.y, { r: s.r, t: tNow, rot: s.t * 4 })) {
              ctx.fillStyle = '#78716c'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
              ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(6, s.r), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
          } else {
            var rr = Math.max(4, s.r);
            ctx.globalAlpha = 0.35; ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(s.x, s.y, rr * 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, Math.PI * 2);
            ctx.fillStyle = enemy ? (s.kind === 'orb' ? '#f472b6' : '#ef4444') : '#22c55e';
            ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
          }
        } catch (e) { /* nada */ }
        ctx.restore();
      }
    }
    function drawBeams(ctx) {
      for (var i = 0; i < beams.length; i++) {
        var b = beams[i];
        var a = clamp(b.life / b.maxLife, 0, 1);
        var col = (b.from === 'enemy') ? '#f87171' : '#4ade80';
        var f = (b.from === 'enemy') ? clamp(b.cut, 0, 1) : 1;
        var x2 = b.x1 + (b.x2 - b.x1) * f, y2 = b.y1 + (b.y2 - b.y1) * f;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.35 * a + 0.15; ctx.strokeStyle = col; ctx.lineWidth = b.width * 2;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = 0.6 + 0.4 * a; ctx.lineWidth = b.width;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, b.width * 0.35);
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.restore();
      }
    }

    // ---- Héroes (cadena de respaldo de §16.3) ----
    function heroOpts(p) {
      var o = { scale: 1, facing: p.facing, pose: p.pose, t: tNow };
      if (p.actFx > 0 && p.actPose && p.pose === p.actPose) { o.t = ACT_DUR - p.actFx; o.facing = p.actFacing; }
      var lk = look();
      if (p.heroe === 'mikey') { o.variant = (lk.mikey === 'B') ? 'B' : 'A'; o.arma = (p.actFx > 0 && LAUNCHERS[p.actKind]) ? p.actKind : p.launcher; }
      if (p.heroe === 'peter') {
        o.variant = (lk.peter === 'B') ? 'B' : 'A'; o.escudo = p.shieldOut ? 'fuera' : (p.cubriendo ? 'cubrir' : 'mano');
        if (p.cubriendo && p.onGround && p.moveDir !== 0) o.anda = true;
      }
      return o;
    }
    function drawCapsule(ctx, p, s) {
      ctx.save();
      roundRect(ctx, p.x - 11 * s, p.y - 58 * s, 22 * s, 58 * s, 11 * s);
      ctx.fillStyle = heroColor(p.heroe); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x + p.facing * 2 * s, p.y - 44 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x + p.facing * 9 * s, p.y - 44 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Mikey / Peter con el dibujo aprobado (sin poses): pequeñas transformaciones para animarlos.
    function drawApprovedPose(ctx, p, name, o) {
      var s = 68 / altoArte(name);
      var pose = o.pose;
      var fnPose = (name === 'mikey') ? (pose === 'disparo' ? 'disparo' : 'idle') : (pose === 'bloquear' ? 'bloquear' : (pose === 'lanzar' ? 'lanzar' : 'idle'));
      if (name === 'peter' && o.escudo === 'cubrir') fnPose = 'bloquear';
      ctx.save();
      ctx.translate(p.x, p.y);
      if (pose === 'run') { ctx.translate(0, -Math.abs(Math.sin(tNow * 14)) * 3); ctx.rotate(o.facing * 0.06); }
      else if (pose === 'bloquear' && o.anda) ctx.translate(0, -Math.abs(Math.sin(tNow * 9)) * 2.5);
      else if (pose === 'jump') ctx.scale(0.94, 1.06);
      else if (pose === 'fall') ctx.scale(1.04, 0.96);
      else if (pose === 'hurt') ctx.rotate(-o.facing * 0.15);
      else if (pose === 'win') ctx.translate(0, -Math.abs(Math.sin(tNow * 6)) * 6);
      else if (pose === 'idle') ctx.scale(1, 1 + Math.sin(tNow * 3) * 0.015);
      var ok = art(name, ctx, 0, 0, { variant: o.variant, scale: s, facing: o.facing, pose: fnPose, arma: o.arma });
      ctx.restore();
      return ok;
    }
    function drawHeroBody(ctx, p) {
      var o = heroOpts(p);
      if (art('heroeP3', ctx, p.heroe, p.x, p.y, o)) return;
      if (p.heroe === 'director' || p.heroe === 'falcon') {
        var fn = gfx(p.heroe === 'falcon' ? 'drawFalcon' : 'drawDirector');
        try { if (fn) { fn(ctx, p.x, p.y, { t: o.t, facing: o.facing, pose: o.pose, scale: 1 }); return; } } catch (e) { /* abajo */ }
        drawCapsule(ctx, p, 1);
        return;
      }
      var jName = (p.heroe === 'mikey') ? 'mikeyJuego' : 'peterJuego';
      if (art(jName, ctx, p.x, p.y, o)) return;
      if (drawApprovedPose(ctx, p, p.heroe, o)) return;
      drawCapsule(ctx, p, 1);
    }
    // Rayitas de sorpresa sobre la cabeza, del lado del jefe (líneas de movimiento, sin "!": el "!"
    // es el aviso de ataque de los robots).
    function drawAsombro(ctx, p, k) {
      var hx = p.x - p.facing * 6, hy = p.y - p.h - 6;
      ctx.save();
      ctx.globalAlpha = k * (0.75 + Math.sin(tNow * 9) * 0.25);
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (var i = -1; i <= 1; i++) {
        var a = -Math.PI / 2 + p.facing * 0.5 + i * 0.45;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10);
        ctx.lineTo(hx + Math.cos(a) * 20, hy + Math.sin(a) * 20);
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawHero(ctx, p) {
      if (!p || p.ko || p.warpPending) return;
      if (p.invuln > 0 && p.nameT <= 0 && Math.floor(p.blink * 12) % 2 === 0) return;
      // Marca del jugador (J1 dorado, J2 verde)
      ctx.save();
      if (p.isAI) ctx.globalAlpha = 0.92;
      // Asombro (Robovill crece): se echa un poco hacia atrás, girando sobre los pies, para mirar arriba.
      var asom = p.asombro ? clamp((bossPhase === 'defeat' ? bossT : 9) / 0.5, 0, 1) : 0;
      if (asom > 0) {
        ctx.translate(p.x, p.y);
        ctx.rotate(-p.facing * 0.16 * asom * (1 + Math.sin(tNow * 5) * 0.12));
        ctx.translate(-p.x, -p.y);
      }
      drawHeroBody(ctx, p);
      ctx.restore();
      if (asom > 0) drawAsombro(ctx, p, asom);
      // Escudo de Peter: brillo dorado al cubrirse (que se note que protege)
      if (p.heroe === 'peter' && p.cubriendo) {
        var sr = shieldRect(p);
        ctx.save();
        ctx.globalAlpha = 0.28 + Math.sin(tNow * 10) * 0.08;
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.ellipse(sr.x + sr.w / 2 + p.facing * 4, sr.y + sr.h / 2, 16, 40, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.7; ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y - 32, 40, p.facing > 0 ? -0.9 : Math.PI - 0.9, p.facing > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
        ctx.restore();
      }
      // Efectos de los ataques
      if (p.actFx > 0 && p.actKind) {
        var t01 = clamp(1 - p.actFx / ACT_DUR, 0, 1);
        var fx = p.x + p.actFacing * 30, fy = p.y - 32;
        try {
          if (p.actKind === 'espada') { var sl = gfx('drawSlash'); if (sl) sl(ctx, fx, fy, p.actFacing, t01); }
          else if (p.actKind === 'guantes') { var pu = gfx('drawPunch'); if (pu) pu(ctx, fx + p.actFacing * 6, fy, p.actFacing, t01); }
          else if (LAUNCHERS[p.actKind] && t01 < 0.5) {
            ctx.save();
            ctx.globalAlpha = 1 - t01 * 2;
            ctx.fillStyle = '#bfdbfe';
            ctx.beginPath(); ctx.arc(p.x + p.actFacing * 26, p.y - 32, 9 * (1 - t01), 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        } catch (e2) { /* nada */ }
      }
      if (p.bashFx > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(p.bashFx / 0.2, 0, 1);
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (var k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.moveTo(p.x + p.facing * (34 + k * 6), p.y - 50 + k * 14); ctx.lineTo(p.x + p.facing * (46 + k * 6), p.y - 50 + k * 14); ctx.stroke();
        }
        ctx.restore();
      }
      // Marca del jugador encima de la cabeza
      if (!p.isAI) {
        var mc = (p.jugador === 2) ? '#4ade80' : '#fbbf24';
        var my = p.y - p.h - 16 + Math.sin(tNow * 4) * 2;
        ctx.save();
        ctx.beginPath(); ctx.moveTo(p.x - 7, my - 6); ctx.lineTo(p.x + 7, my - 6); ctx.lineTo(p.x, my + 3); ctx.closePath();
        ctx.fillStyle = mc; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
        if (coop) outlinedText(ctx, String(p.jugador), p.x, my - 15, 13, mc);
        ctx.restore();
      }
      if (p.nameT > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(p.nameT / 0.2, 0, 1);
        outlinedText(ctx, NOMBRE_CAMBIO[p.heroe] || '', p.x, p.y - p.h - 36 - (NAME_TIME - p.nameT) * 20, 20, heroColor(p.heroe, 'claro'));
        ctx.restore();
      }
    }

    function drawPulse(ctx, pu) {
      var t01 = clamp(pu.t / pu.dur, 0, 1);
      ctx.save();
      ctx.globalAlpha = 1 - t01;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var seg = Math.max(4, Math.round(pu.len / 22));
      var pts = [];
      for (var i = 0; i <= seg; i++) {
        var f = i / seg;
        var jy = (i === 0 || i === seg) ? 0 : Math.sin(i * 2.7 + pu.seed + pu.t * 40) * 7;
        pts.push([pu.x + pu.dir * pu.len * f, pu.y + jy]);
      }
      var passes = [['rgba(34,211,238,0.35)', 12], ['#22d3ee', 5], ['#ffffff', 2]];
      for (var k = 0; k < passes.length; k++) {
        ctx.strokeStyle = passes[k][0]; ctx.lineWidth = passes[k][1];
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawBallFallback(ctx, b) {
      ctx.save();
      ctx.translate(b.x, b.y);
      var stretch = (b.tipo === 'francotirador') ? 1.8 : 1;
      if (b.vx < 0) ctx.scale(-1, 1);
      ctx.rotate(Math.atan2(b.vy, Math.abs(b.vx)));
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#60a5fa';
      ctx.beginPath(); ctx.ellipse(-b.r * stretch, 0, b.r * 2.6 * stretch, b.r * 1.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.2 * stretch, b.r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dbeafe';
      ctx.beginPath(); ctx.ellipse(b.r * 0.2, -b.r * 0.2, b.r * 0.6 * stretch, b.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function drawShieldFallback(ctx, x, y, s, ang) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      var cols = ['#22c55e', '#111827', '#22c55e'];
      var rs = [20 * s, 14 * s, 6 * s];
      for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, rs[i], 0, Math.PI * 2); ctx.fillStyle = cols[i]; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
      for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * Math.PI / 2) * 14 * s, Math.sin(k * Math.PI / 2) * 14 * s); ctx.stroke(); }
      ctx.restore();
    }
    function drawHeroProjectiles(ctx) {
      var i, ap = gfx('drawArrowProj');
      for (i = 0; i < arrows.length; i++) {
        var a = arrows[i];
        if (ap) { try { ap(ctx, a.x, a.y, a.angle || 0); continue; } catch (e) { /* abajo */ } }
        ctx.fillStyle = '#eab308'; ctx.fillRect(a.x - 6, a.y - 2, 12, 4);
      }
      for (i = 0; i < pulses.length; i++) drawPulse(ctx, pulses[i]);
      for (i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (!onScreenX(b.x, 40)) continue;
        if (!art('bolaEnergiaJuego', ctx, b.x, b.y, { tipo: b.tipo, angle: Math.atan2(b.vy, b.vx), scale: b.tipo === 'metralleta' ? 0.8 : 1, t: b.t })) drawBallFallback(ctx, b);
      }
      var lk = look();
      for (i = 0; i < shields.length; i++) {
        var s = shields[i];
        if (!art('escudoPeter', ctx, s.x, s.y, { variant: (lk.peter === 'B') ? 'B' : 'A', scale: 0.6, angle: s.angle })) drawShieldFallback(ctx, s.x, s.y, 0.6, s.angle);
      }
    }

    var CONFETI_COLS = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc', '#f472b6'];
    function drawEffects(ctx) {
      var ex = gfx('drawExplosion'), sp = gfx('drawSparkle'), xc = gfx('drawExclamation');
      for (var i = 0; i < effects.length; i++) {
        var e = effects[i];
        var t01 = clamp(e.t / e.dur, 0, 1);
        try {
          if (e.kind === 'pop') {
            if (!art('chispasPop', ctx, e.x, e.y, { t01: t01, scale: (e.r || 26) / 26 }) && ex) ex(ctx, e.x, e.y, t01, e.r || 24);
          } else if (e.kind === 'sparkle' && sp) sp(ctx, e.x, e.y, t01);
          else if (e.kind === 'exclaim' && xc) xc(ctx, e.x, e.y);
          else if (e.kind === 'texto') {
            ctx.save();
            ctx.globalAlpha = t01 < 0.7 ? 1 : (1 - t01) / 0.3;
            outlinedText(ctx, e.texto, e.x, e.y - t01 * 28, 18, e.color);
            ctx.restore();
          } else if (e.kind === 'dust') {
            ctx.save(); ctx.globalAlpha = 1 - t01; ctx.fillStyle = '#e2e8f0';
            for (var k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.arc(e.x + k * (14 + t01 * 26), e.y - 6 - t01 * 6, 6 * (1 - t01) + 2, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
          } else if (e.kind === 'bluespark') {
            ctx.save(); ctx.globalAlpha = 1 - t01; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            for (var q = 0; q < 6; q++) { var a = q * Math.PI / 3; var r1 = 4 + t01 * 10, r2 = 8 + t01 * 14; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1); ctx.lineTo(e.x + Math.cos(a) * r2, e.y + Math.sin(a) * r2); ctx.stroke(); }
            ctx.restore();
          } else if (e.kind === 'stars') {
            ctx.save(); ctx.globalAlpha = 1 - t01;
            for (var s2 = 0; s2 < 5; s2++) {
              var ang = s2 * 1.256 + tNow * 4, rr = 10 + t01 * 14;
              drawStar(ctx, e.x + Math.cos(ang) * rr, e.y + Math.sin(ang) * rr * 0.5 - t01 * 10, 5, '#fde047');
            }
            ctx.restore();
          } else if (e.kind === 'puf') {
            ctx.save(); ctx.globalAlpha = 1 - t01;
            ctx.strokeStyle = e.color || '#ffffff'; ctx.lineWidth = 5 * (1 - t01) + 1;
            ctx.beginPath(); ctx.arc(e.x, e.y, 14 + t01 * 34, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = e.color || '#ffffff';
            for (var z = 0; z < 8; z++) { var az = z * Math.PI / 4 + 0.3; var rz = 18 + t01 * 30; ctx.beginPath(); ctx.arc(e.x + Math.cos(az) * rz, e.y + Math.sin(az) * rz, 4 * (1 - t01) + 1, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
          } else if (e.kind === 'confeti') {
            ctx.save();
            for (var c = 0; c < 18; c++) {
              var sd = e.seed + c * 7.3;
              var vx = Math.sin(sd) * 140, vy = -220 - (c % 5) * 30;
              var tt = e.t;
              var cx = e.x + vx * tt, cy = e.y + vy * tt + 360 * tt * tt;
              ctx.globalAlpha = 1 - t01;
              ctx.fillStyle = CONFETI_COLS[c % CONFETI_COLS.length];
              ctx.save(); ctx.translate(cx, cy); ctx.rotate(tt * 8 + c); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
            }
            ctx.restore();
          } else if (e.kind === 'warn') {
            var t2 = clamp(e.t / e.dur, 0, 1);
            if (!art('sombraAviso', ctx, e.x, e.y, { r: e.r, t01: t2 })) {
              ctx.save();
              ctx.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(e.t * 10));
              ctx.fillStyle = '#ef4444';
              ctx.beginPath(); ctx.ellipse(e.x, e.y - 3, e.r * (0.6 + 0.4 * t2), e.r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
            }
            if (xc) xc(ctx, e.x, e.y - 40);
          } else if (e.kind === 'shieldFlash') {
            ctx.save(); ctx.globalAlpha = 1 - t01; ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(e.x, e.y, 20 + t01 * 16, e.f > 0 ? -1 : Math.PI - 1, e.f > 0 ? 1 : Math.PI + 1); ctx.stroke();
            ctx.restore();
          }
        } catch (err) { /* nada */ }
      }
    }
    function drawStar(ctx, x, y, r, col) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var rr = (i % 2) ? r * 0.45 : r, a = i * Math.PI / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke();
    }

    // ---- HUD (§5.6) ----
    function drawHud(ctx) {
      try { if (G.ui && G.ui.drawHearts) G.ui.drawHearts(ctx); } catch (e) { /* nada */ }
      for (var i = 0; i < players.length; i++) drawActionIcons(ctx, players[i]);
      drawTeamBar(ctx);
      if (coop) drawKoBanners(ctx);
      if (boss && bossDef && (bossPhase === 'intro' || bossPhase === 'fight' || bossPhase === 'defeat')) {
        try { if (G.ui && G.ui.drawBossBar) G.ui.drawBossBar(ctx, clamp(num(boss.hp, 0) / Math.max(1, num(boss.maxHp, 1)), 0, 1), bossDef.nombre || 'JEFE'); } catch (e2) { /* nada */ }
      }
      drawHints(ctx);
    }
    function cdFrac(p, slot) { return (p.cd[slot] > 0) ? clamp(p.cd[slot] / (p.cdMax[slot] || 1), 0, 1) : 0; }
    function iconBox(ctx, cx, cy, size, col) {
      roundRect(ctx, cx - size / 2, cy - size / 2, size, size, 9);
      ctx.fillStyle = 'rgba(20,16,40,0.82)'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = col || '#fbbf24'; ctx.stroke();
    }
    function drawIcon(ctx, p, slot, cx, cy, size) {
      var h = p.heroe, ok = false;
      if (h === 'director' || h === 'falcon') {
        var w = (h === 'director') ? (slot === 'attack' ? 'guantes' : 'pulso') : (slot === 'attack' ? 'espada' : 'arco');
        ok = art('iconoArma', ctx, cx, cy, { arma: w, size: size, ocupada: false });
        if (!ok) {
          iconBox(ctx, cx, cy, size, heroColor(h));
          ctx.save(); ctx.fillStyle = heroColor(h, 'claro');
          ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(w === 'guantes' ? 'PUÑO' : (w === 'pulso' ? 'PULSO' : (w === 'espada' ? 'ESPADA' : 'ARCO')), cx, cy - 2);
          ctx.restore();
        }
      } else if (h === 'mikey') {
        if (slot === 'attack') {
          ok = art('iconoLanzador', ctx, cx, cy, { tipo: p.launcher, size: size, activo: true });
          if (!ok) {
            iconBox(ctx, cx, cy, size, '#60a5fa');
            ctx.save(); ctx.fillStyle = '#3b82f6';
            ctx.beginPath(); ctx.arc(cx, cy, p.launcher === 'francotirador' ? 5 : (p.launcher === 'pistola' ? 7 : 4), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#bfdbfe'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center';
            ctx.fillText(p.launcher === 'francotirador' ? 'FRANCO' : (p.launcher === 'pistola' ? 'PISTOLA' : 'METRA'), cx, cy + 13);
            ctx.restore();
          }
        } else {
          ok = art('iconoCambio', ctx, cx, cy, { size: size });
          if (!ok) {
            iconBox(ctx, cx, cy, size, '#93c5fd');
            ctx.save(); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(cx, cy, 10, 0.3, Math.PI * 1.7); ctx.stroke(); ctx.restore();
          }
          var nxt = LAUNCHER_ORDER[(LAUNCHER_ORDER.indexOf(p.launcher) + 1) % 3];
          if (!art('iconoLanzador', ctx, cx - size / 2 + 6, cy - size / 2 + 6, { tipo: nxt, size: 14, activo: false })) {
            ctx.save(); ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx - size / 2 + 6, cy - size / 2 + 6, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }
      } else if (h === 'peter') {
        var modo = (slot === 'attack') ? 'cubrir' : 'lanzar';
        ok = art('iconoEscudo', ctx, cx, cy, { size: size, modo: modo, fuera: p.shieldOut });
        if (!ok) {
          iconBox(ctx, cx, cy, size, heroColor('peter'));
          drawShieldFallback(ctx, cx + (modo === 'lanzar' ? 4 : 0), cy, 0.6, 0);
          if (modo === 'lanzar') {
            ctx.save(); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 6, cy); ctx.stroke(); ctx.restore();
          }
        }
      }
    }
    function drawKey(ctx, cx, cy, label, small) {
      ctx.save();
      ctx.font = 'bold ' + (small ? 9 : 11) + 'px ' + FONT;
      var hh = small ? 13 : 17;
      var w = Math.max(hh, (ctx.measureText(label).width || 8) + (small ? 6 : 8));
      roundRect(ctx, cx - w / 2, cy - hh / 2, w, hh, hh / 2);
      ctx.fillStyle = '#1e293b'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fde68a'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fef3c7';
      ctx.fillText(label, cx, cy + 0.5);
      ctx.restore();
    }
    function drawActionIcons(ctx, pl) {
      var p = pl.hero;
      if (!p) return;
      var size = 36, cy = 31;
      var xs = (pl.j === 2) ? [744, 700] : [216, 260];
      var k = teclas(coop ? pl.j : 1);
      var slots = ['attack', 'shoot'], keys = [k.ataque, k.disparo];
      ctx.save();
      if (pl.ko) ctx.globalAlpha = 0.45;
      for (var s = 0; s < 2; s++) {
        var cx = xs[s];
        ctx.save();
        drawIcon(ctx, p, slots[s], cx, cy, size);
        ctx.restore();
        var f = cdFrac(p, slots[s]);
        if (p.heroe === 'peter' && p.shieldOut) f = 1;
        if (p.heroe === 'falcon' && slots[s] === 'shoot' && ownCount(arrows, p) >= ARROW_MAX) f = 1;
        if (p.heroe === 'mikey' && slots[s] === 'shoot') f = 0;
        if (f > 0) {
          ctx.save();
          roundRect(ctx, cx - size / 2, cy - size / 2, size, size, 9); ctx.clip();
          ctx.fillStyle = 'rgba(8,8,20,0.62)';
          ctx.fillRect(cx - size / 2, cy - size / 2, size, size * f);
          ctx.restore();
        }
        // Una letra: placa en la esquina. Etiqueta larga (móvil: «ATAQ», «TIRO»):
        // centrada debajo del icono y más pequeña, para no pisar el icono vecino.
        var lab = String(keys[s] || '');
        if (lab.length > 2) drawKey(ctx, cx, cy + size / 2 + 6, lab, true);
        else drawKey(ctx, cx + 14, cy + 16, lab);
      }
      ctx.restore();
    }
    function drawTeamBar(ctx) {
      var order = heroesOrder();
      var size = 34, gap = 8, x0 = 400, cy = 31;
      ctx.save();
      roundRect(ctx, x0 - 8, cy - size / 2 - 6, 4 * size + 3 * gap + 16, size + 12, 14);
      ctx.fillStyle = 'rgba(20,16,40,0.6)'; ctx.fill();
      ctx.restore();
      for (var i = 0; i < order.length; i++) {
        var h = heroByName(order[i]);
        if (!h) continue;
        var cx = x0 + size / 2 + i * (size + gap);
        var isP1 = (h.jugador === 1), isP2 = (h.jugador === 2);
        var pl = playerOf(h);
        ctx.save();
        if (h.isAI) ctx.globalAlpha = 0.6;
        var apagado = !!(pl && pl.ko);
        if (!art('caraHeroe', ctx, cx, cy, { quien: h.heroe, size: size, apagado: apagado })) {
          ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
          ctx.fillStyle = apagado ? '#64748b' : heroColor(h.heroe); ctx.fill();
          outlinedText(ctx, (NOMBRE_CORTO[h.heroe] || '?').charAt(0), cx, cy + 1, 16, '#ffffff');
        }
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 1, 0, Math.PI * 2);
        ctx.lineWidth = 2; ctx.strokeStyle = heroColor(h.heroe); ctx.stroke();
        if (isP1 || isP2) {
          var rc = isP1 ? '#fbbf24' : '#4ade80';
          ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
          ctx.lineWidth = 3; ctx.strokeStyle = rc; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx + size / 2 - 1, cy + size / 2 - 3, 7, 0, Math.PI * 2);
          ctx.fillStyle = rc; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
          ctx.fillStyle = OUTLINE; ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(isP1 ? '1' : '2', cx + size / 2 - 1, cy + size / 2 - 2.5);
        }
        ctx.restore();
      }
      // Tecla de cambio (a la derecha de la barra)
      var label = conTeclas('{cambio}', 0);
      ctx.save();
      ctx.font = 'bold 13px ' + FONT;
      var w = Math.max(26, (ctx.measureText(label).width || 10) + 14);
      var kx = 572;
      roundRect(ctx, kx, cy - 12, w, 24, 8);
      ctx.fillStyle = '#1e293b'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fde68a'; ctx.stroke();
      ctx.fillStyle = '#fef3c7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, kx + w / 2, cy + 0.5);
      ctx.restore();
    }
    function drawKoBanners(ctx) {
      var shown = 0;
      for (var i = 0; i < players.length; i++) {
        var pl = players[i];
        if (!pl.ko) continue;
        var label = 'P' + pl.j;
        var txt = label + ' vuelve en ' + Math.max(1, Math.ceil(pl.koTimer)) + ' s';
        ctx.save();
        ctx.font = 'bold 20px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var bw = (ctx.measureText(txt).width || 120) + 28, bh = 34, bx = G.W / 2, by = G.H - 100 - shown * 44;
        ctx.fillStyle = 'rgba(20,24,40,0.78)';
        roundRect(ctx, bx - bw / 2, by - bh / 2, bw, bh, 10); ctx.fill();
        ctx.fillStyle = (pl.j === 1) ? '#fbbf24' : '#4ade80';
        ctx.fillText(txt, bx, by);
        ctx.restore();
        shown++;
      }
    }
    function minHumanDX(x) {
      var hs = aliveHumanHeroes();
      if (!hs.length) hs = humanHeroes();
      var m = Infinity;
      for (var i = 0; i < hs.length; i++) { var d = Math.abs(hs[i].x - x); if (d < m) m = d; }
      return m;
    }
    // ---- Estado de las pistas (se calcula en update; drawHints solo lo lee) ----
    // hintStick: la pista del nivel que se ve ahora; se queda max(4 s, palabras / 2,5) aunque el
    //   héroe siga andando (un niño de 10 años necesita tiempo para leerla). Las pistas nuevas
    //   esperan en hintQueue (en orden); mientras alguna espera, la que se ve dura solo
    //   HINT_QUEUED s, para que el niño que corre las vea todas. Una pista que espera solo se
    //   salta si es normal y el héroe ya va más de HINT_STALE_TILES lejos (las de «!» nunca).
    //   hintSeen: las ya mostradas (no se repiten tras reaparecer).
    // bossHintCur: la pista del jefe que se ve ahora (5 s; la misma no vuelve hasta 20 s después).
    var HINT_STALE = HINT_STALE_TILES * TILE;
    var hintStick = null, hintSeen = [], hintQueue = [], bossHintMem = {}, bossHintCur = null, hintNear = null, hintDX = 0;
    function readTime(texto) {
      var words = String(texto || '').split(/\s+/).length;
      return clamp(words / HINT_WPS, HINT_MIN, HINT_MAX);
    }
    function updateHintState() {
      hintNear = null;
      // Pista del jefe (la escribe gigantes/jefes con bossDef.hint).
      if (boss && bossDef && bossPhase === 'fight' && typeof bossDef.hint === 'function') {
        var bh = null;
        try { bh = bossDef.hint(boss, world); } catch (e) { bh = null; }
        if (bh) {
          bh = String(bh);
          var showing = bossHintCur && bossHintCur.texto === bh && tNow < bossHintCur.until;
          var mem = bossHintMem[bh];
          if (!showing && (!mem || tNow - mem.end >= BOSS_HINT_GAP)) {
            // La primera vez, el tiempo de leerla (5–7 s); las repeticiones, 4 s.
            var dur = mem ? 4 : clamp(readTime(bh), BOSS_HINT_SHOW, BOSS_HINT_SHOW + 2);
            bossHintCur = { texto: bh, until: tNow + dur };
            bossHintMem[bh] = { end: tNow + dur };
          }
        }
      } else bossHintCur = null;
      // Pistas del nivel (def.hints), fuera de la arena.
      if (!Array.isArray(def.hints) || (arena && arena.activa)) { hintStick = null; hintQueue = []; return; }
      var best = null, bd = HINT_RANGE + 1;
      for (var k = 0; k < def.hints.length; k++) {
        var hn = def.hints[k];
        if (!hn || typeof hn.texto !== 'string') continue;
        var d = minHumanDX(num(hn.x, -999) * TILE + TILE / 2);
        if (d < bd) { bd = d; best = hn; }
      }
      hintNear = best;
      if (best && hintSeen.indexOf(best) < 0) { hintSeen.push(best); hintQueue.push(best); }
      // Tapada por una pista de más prioridad (consola, puzle, mundo): su reloj se para y la
      // cola espera, para que no se gaste sin verse.
      if (hintCovered()) { if (hintStick) { hintStick.from += DT; hintStick.until += DT; } return; }
      // Hay otra esperando: la que se ve se acorta (pero se lee al menos HINT_QUEUED s).
      if (hintStick && hintQueue.length) hintStick.until = Math.min(hintStick.until, hintStick.from + HINT_QUEUED);
      if (hintStick && tNow >= hintStick.until) hintStick = null;
      while (!hintStick && hintQueue.length) {
        var q = hintQueue.shift();
        if (!HINT_MUST.test(q.texto) && minHumanDX(num(q.x, -999) * TILE + TILE / 2) > HINT_STALE) continue;
        hintStick = { hn: q, from: tNow, until: tNow + readTime(q.texto) };
      }
    }
    // ¿Se ve ahora una pista que va por delante de las del nivel (world.pista o la de un jugador)?
    function hintCovered() {
      if (pistaWorld && tNow < pistaWorld.until) return true;
      for (var i = 0; i < players.length; i++) {
        var pl = players[i];
        if (pl.hint && tNow < pl.hint.until && !pl.ko) return true;
      }
      return false;
    }
    // Pista que toca ahora: world.pista > puzle > jefe > def.hints (§9.7). Devuelve {texto, j}.
    function currentHint() {
      if (pistaWorld && tNow < pistaWorld.until) return { texto: pistaWorld.texto, j: 0 };
      for (var i = 0; i < players.length; i++) {
        var pl = players[i];
        if (pl.hint && tNow < pl.hint.until && !pl.ko) return { texto: pl.hint.texto, j: coop ? pl.j : 1 };
      }
      if (bossHintCur && tNow < bossHintCur.until && bossPhase === 'fight') return { texto: bossHintCur.texto, j: 0, jefe: true };
      if (hintStick && tNow < hintStick.until) return { texto: hintStick.hn.texto, j: 0 };
      if (hintNear) return { texto: hintNear.texto, j: 0 };
      return null;
    }
    // Rectángulo del jefe en pantalla (zonas + contacto, con margen para la cabeza y las alas).
    function bossScreenRect() {
      if (!boss || !arena || !arena.activa) return null;
      var rs = safeZones(), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      if (typeof bossDef.touchRect === 'function') {
        try { var tr = bossDef.touchRect(boss); if (tr && isFinite(tr.x) && isFinite(tr.y) && isFinite(tr.w) && isFinite(tr.h)) rs = rs.concat([tr]); } catch (e) { /* nada */ }
      }
      for (var i = 0; i < rs.length; i++) {
        x0 = Math.min(x0, rs[i].x); y0 = Math.min(y0, rs[i].y);
        x1 = Math.max(x1, rs[i].x + rs[i].w); y1 = Math.max(y1, rs[i].y + rs[i].h);
      }
      if (!isFinite(x0)) return null;
      // Con margen (para apartar la caja) y sin él (raw: para decidir si de verdad lo tapa).
      return { x: x0 - camX - 24, y: y0 - camY - 30, w: x1 - x0 + 48, h: y1 - y0 + 30,
        raw: { x: x0 - camX, y: y0 - camY, w: x1 - x0, h: y1 - y0 } };
    }
    // Medidas aproximadas de la caja de G.ui.hint (borde superior en y = 64, centrada en x = 480,
    // texto de 20 px envuelto a ≈ 372 px, 25 px por línea, cara de 44 px).
    function hintBox(ctx, texto, nota) {
      var w = 300;
      try {
        ctx.save(); ctx.font = 'bold 20px system-ui, "Segoe UI", Arial, sans-serif';
        w = ctx.measureText(String(texto)).width || 300;
        var nw = 0;
        if (nota) { ctx.font = 'bold 14px system-ui, "Segoe UI", Arial, sans-serif'; nw = ctx.measureText(nota).width || 0; }
        ctx.restore();
        var lines = Math.max(1, Math.ceil(w / 340));
        var bw = Math.max(Math.min(w, 372), nw) + 44 + 44;
        var bh = Math.max(64, lines * 25 + 28 + (nota ? 21 : 0));
        return { x: 480 - bw / 2, y: 64, w: bw, h: bh };
      } catch (e) { return { x: 250, y: 64, w: 460, h: 110 }; }
    }
    // Nota del co-op: las teclas de los DOS jugadores con su nombre, en una línea corta.
    // Solo al principio del nivel y en las pistas que piden una tecla (el HUD ya las enseña).
    function coopNote(texto) {
      if (!coop) return undefined;
      if (tNow > 12 && String(texto).indexOf('{') < 0) return '';
      var a = teclas(1), b = teclas(2);
      return 'J1 / J2 — ataque ' + a.ataque + ' / ' + b.ataque + ' · disparo ' + a.disparo + ' / ' + b.disparo +
        ' · hackear ' + a.hack + ' / ' + b.hack + ' · cambiar ' + a.cambio + ' / ' + b.cambio;
    }
    var hintBoxSeen = null, hintFade = 1;
    function drawHints(ctx) {
      if (!G.ui || !G.ui.hint) return;
      var h = currentHint();
      if (!h) return;
      var opts = { cara: 'secuaz' };
      var nota = coopNote(h.texto);
      if (nota !== undefined) opts.nota = nota || false;   // false = sin nota (ui.js)
      var txt = conTeclas(h.texto, h.j);
      // En la arena, que la caja no tape al jefe: se aparta hacia el lado libre y, si aun así
      // lo tapa (p. ej., el Robot de práctica saltando en el centro), se vuelve muy transparente
      // (con un fundido suave) para que se le vea la cabeza.
      var br = bossScreenRect(), want = 0, cantFit = false, bx = null;
      if (br) {
        bx = (hintBoxSeen && hintBoxSeen.txt === txt) ? hintBoxSeen : hintBox(ctx, txt, nota || null);
        var vert = br.y < bx.y + bx.h && br.y + br.h > bx.y;
        if (vert && br.x < bx.x + bx.w && br.x + br.w > bx.x) {
          var dl = (br.x - 10) - (bx.x + bx.w), dr = (br.x + br.w + 10) - bx.x;
          var minDX = 8 - bx.x, maxDX = (G.W - 8) - (bx.x + bx.w);
          var okL = dl >= minDX, okR = dr <= maxDX;
          if (okL && okR) want = (-dl < dr) ? dl : dr;
          else if (okL) want = dl;
          else if (okR) want = dr;
          else {
            want = (br.x + br.w / 2 > G.W / 2) ? minDX : maxDX;
            cantFit = true;
          }
        }
      }
      hintDX += (want - hintDX) * 0.25;
      if (Math.abs(want - hintDX) < 0.5) hintDX = want;
      var dx = Math.round(hintDX);
      // Transparente solo si de verdad tapa al jefe (más de 16 px en común con sus zonas, contando
      // 30 px por encima para la cabeza y la antena). Si no cabe a ningún lado, aún más.
      var fadeTo = 1;
      if (br && bx) {
        var rr = br.raw, top = rr.y - 30;
        var ox = Math.min(bx.x + dx + bx.w, rr.x + rr.w) - Math.max(bx.x + dx, rr.x);
        var oy = Math.min(bx.y + bx.h, rr.y + rr.h) - Math.max(bx.y, top);
        if (ox > 16 && oy > 16) fadeTo = cantFit ? 0.18 : 0.35;
      }
      hintFade += (fadeTo - hintFade) * 0.3;
      if (Math.abs(fadeTo - hintFade) < 0.01) hintFade = fadeTo;
      ctx.save();
      if (dx) ctx.translate(dx, 0);
      if (hintFade < 1) ctx.globalAlpha = hintFade;
      try {
        var box = G.ui.hint(ctx, txt, opts);
        if (box && isFinite(box.w)) hintBoxSeen = { txt: txt, x: box.x, y: box.y, w: box.w, h: box.h };
      } catch (e) { /* nada */ }
      ctx.restore();
    }

    // Capas del mundo, de atrás hacia delante.
    var WORLD_LAYERS = [
      drawTiles, drawPresses, drawDoorsConsolesFlags, drawBarriers, drawExit, drawPickups,
      drawBoss, drawEnemies, drawShots, drawBeams,
      function (ctx) { for (var i = heroes.length - 1; i >= 0; i--) { if (heroes[i].isAI) drawHero(ctx, heroes[i]); } },
      function (ctx) { if (players[1]) drawHero(ctx, players[1].hero); },
      function (ctx) { if (players[0]) drawHero(ctx, players[0].hero); },
      drawHeroProjectiles, drawHackOverlays, drawEffects
    ];

    // ---------------------------------------------------------------------
    //  Botones táctiles extra y atajos de prueba (§4, §9.8)
    // ---------------------------------------------------------------------
    scene.touchExtra = function () { return { cambio: true }; };

    scene.__debug = {
      heroes: function () { return heroesAll().slice(); },
      enemies: function () { return liveEnemies(); },
      boss: function () {
        if (!boss || bossPhase === 'none') return null;
        var out = { tipo: bossTipo || 'prueba', hp: boss.hp, maxHp: boss.maxHp, fase: boss.fase, x: boss.x, y: boss.y, zones: safeZones() };
        var d = null;
        if (bossDef && typeof bossDef.debug === 'function') { try { d = bossDef.debug(boss); } catch (e) { d = null; } }
        if (d && typeof d === 'object') { for (var k in d) { if (Object.prototype.hasOwnProperty.call(d, k)) out[k] = d[k]; } }
        if (bossPhase === 'intro' && !out.estado) out.estado = 'intro';
        if (bossPhase === 'defeat' || bossPhase === 'won') out.estado = 'derrota';
        if (out.debil === undefined) out.debil = null;
        return out;
      },
      teleport: function (x, y) {
        try {
          var p = players[0] && players[0].hero;
          if (!p) return;
          x = num(x, p.x); y = num(y, p.y);
          x = clamp(x, p.w / 2, Math.max(p.w / 2, mapW - p.w / 2));
          resetMotion(p, x, y);
          for (var i = 0; i < heroes.length; i++) {
            var h = heroes[i];
            if (h === p || h.ko) continue;
            var off = h.isAI ? -(60 + 50 * h.aiSlot) * p.facing : 40;
            resetMotion(h, safeSideX(x, y, [off, -off, 40, -40, 0], h.w), y);
            h.warpPending = false;
          }
          snapCamera();
          syncWorld();
        } catch (e) { warnOnce('teleport', e); }
      },
      setHero: function (jugador, heroe) {
        try {
          var pl = players[(jugador === 2) ? 1 : 0];
          if (!pl || !pl.hero || pl.hero.heroe === heroe) return !!(pl && pl.hero && pl.hero.heroe === heroe);
          var t = heroByName(heroe);
          if (!t || !t.isAI) return false;
          var wasKo = pl.ko; pl.ko = false;
          var ok = doSwitch(pl, t, true);
          pl.ko = wasKo;
          return ok;
        } catch (e) { warnOnce('setHero', e); return false; }
      },
      puzzles: function () {
        var out = [], i;
        for (i = 0; i < activators.length; i++) out.push({ tipo: activators[i].tipo, col: activators[i].col, row: activators[i].row, hecho: !!activators[i].hecho });
        for (i = 0; i < barriers.length; i++) out.push({ tipo: 'L', col: barriers[i].col, row: barriers[i].r0, hecho: !barriers[i].active });
        for (i = 0; i < arenaConsoles.length; i++) out.push({ tipo: 'C', col: arenaConsoles[i].col, row: arenaConsoles[i].row, hecho: arenaConsoles[i].rearm > 0, arena: true });
        return out;
      },
      arena: function () { return arena ? { x0: arena.x0, x1: arena.x1, sueloY: arena.sueloY, activa: !!arena.activa } : null; },
      state: function () { return { t: tNow, leaving: leaving, checkpoint: lastCheckIdx, bossPhase: bossPhase, retry: retryMem }; },
      raw: function () { return { players: players, heroes: heroes, world: world, def: def, mapa: rows }; }
    };

    return scene;
  };

  // =========================================================================
  //  Escena de pruebas del motor: levelP3test_plataformas (§9.8)
  //  Un mapa corto con TODAS las letras de §9.2, una estación de cada puzle y la arena.
  // =========================================================================
  function buildTestMap() {
    var W = 130, H = 13, g = [], r, c;
    for (r = 0; r < H; r++) { g.push([]); for (c = 0; c < W; c++) g[r].push(r >= 11 ? '#' : '.'); }
    function set(col, row, ch) { if (row >= 0 && row < H && col >= 0 && col < W) g[row][col] = ch; }
    function fill(c0, c1, r0, r1, ch) { for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) set(cc, rr, ch); }
    fill(0, 0, 0, 10, '#');
    // Patio: salida de pruebas, inicio, corazones, cajas, plataformas, robots, pinchos, cintas y prensa
    set(1, 10, 'E'); set(3, 10, 'S'); set(5, 10, 'h'); set(8, 10, 'B'); set(8, 9, 'B');
    fill(10, 12, 8, 8, '='); set(11, 6, 'v');
    set(15, 10, 'u');
    set(18, 10, '^'); set(19, 10, '^');
    fill(21, 24, 11, 11, '>');
    fill(26, 28, 6, 6, '#'); set(27, 7, 'P');
    set(30, 10, 'x');
    // Estación del Director: consola C → puerta D
    set(33, 10, 'K'); set(36, 10, 'u'); set(38, 10, 'C'); set(39, 10, 'h');
    fill(41, 41, 0, 7, '#'); fill(41, 41, 8, 10, 'D');
    // Estación de Falcon: palanca R en una repisa alta → puerta D
    fill(46, 48, 7, 7, '#'); set(47, 6, 'R');
    fill(53, 53, 0, 7, '#'); fill(53, 53, 8, 10, 'D');
    // Estación de Mikey: diana T a 12 tiles del balcón → puerta D
    set(55, 10, 'K');
    fill(57, 58, 9, 9, '='); fill(59, 61, 7, 7, '=');
    set(64, 5, 'v'); set(66, 6, 'v'); set(68, 5, 'v');
    fill(73, 73, 0, 5, '#'); set(73, 6, 'T'); fill(73, 73, 7, 10, 'D');
    // Estación de Peter: torreta de espuma, barrera láser L, robot con escudo
    set(76, 10, 'K'); set(80, 10, 'z');
    fill(83, 88, 0, 6, '#'); set(84, 7, 'A'); fill(86, 86, 7, 10, 'L');
    set(90, 10, 'h'); set(92, 10, 'k');
    // El ejército de Robovill
    fill(94, 95, 11, 11, '<');
    set(96, 10, 'q'); set(97, 3, 'w'); set(98, 10, 'a'); set(100, 10, 't'); set(101, 5, 'r'); set(103, 4, 'p'); set(102, 10, 'n'); set(104, 6, 'm');
    set(105, 10, 'K');
    // ARENA (§9.3), columnas 110–129
    var A0 = 110;
    fill(A0, A0, 0, 8, '#'); set(A0, 9, '{'); set(A0, 10, '{');
    fill(A0 + 19, A0 + 19, 0, 10, '#');
    fill(A0 + 2, A0 + 4, 8, 8, '='); fill(A0 + 15, A0 + 17, 8, 8, '=');
    fill(A0 + 4, A0 + 5, 9, 9, '='); fill(A0 + 14, A0 + 15, 9, 9, '=');
    set(A0 + 1, 10, 'C'); set(A0 + 10, 10, 'J');
    var out = [];
    for (r = 0; r < H; r++) out.push(g[r].join(''));
    return out;
  }
  var TEST_DEF = {
    nombre: 'Zona de pruebas de la Parte 3',
    tema: 'cielo',
    music: 'training',
    chapter: 1,
    jefe: 'robotPractica',
    musicaJefe: 'boss3',
    alGanar: 'nivel',
    retry: 'levelP3test_plataformas',
    mapa: buildTestMap(),
    hints: [
      { x: 4, texto: '¡Zona de pruebas! Pulsa {cambio} para cambiar de héroe, ¡como en los juegos de LEGO!' },
      { x: 15, texto: 'Mis robots de práctica llevan una diana: ¡pegan flojito, derrótalos!' },
      { x: 27, texto: 'Si la prensa tiembla y sale «!», ¡apártate!' },
      { x: 34, texto: 'Estación del Director: mantén {hack} junto a la consola.' },
      { x: 45, texto: 'Estación de Falcon: ¡doble salto hasta la palanca!' },
      { x: 56, texto: 'Estación de Mikey: sube al balcón y elige el francotirador con {disparo}.' },
      { x: 77, texto: 'Estación de Peter: mantén {ataque} para cubrirte de la espuma.' },
      { x: 106, texto: '¡La arena! Cuando entres, empieza el combate.' }
    ]
  };
  try {
    G.scenes = G.scenes || {};
    G.scenes.levelP3test_plataformas = G.makePlatformScene3(TEST_DEF);
  } catch (e) {
    try { console.warn('[plataformas3] no se pudo registrar levelP3test_plataformas', e); } catch (x) { /* nada */ }
  }
})();
