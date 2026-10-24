// rio.js — PARTE 3, capítulo 3: "Río subterráneo y vuelo" (G.scenes.levelP3_3).
// Dueño: rio (contrato técnico de la Parte 3, §11.3, §6.2, §18.1).
//
// Escena de ≈ 100 s con desplazamiento automático y cámara fija. Todo se mide con
// un único reloj de recorrido `rt` (segundos desde el principio de la escena):
//
//  0–3 s    INTRO: "Capítulo 3: Río subterráneo y vuelo". Peter entra buceando en
//           su SUBMARINO-NAVE y Lord Falcon vuela por encima en el MECHA-HALCÓN.
//  3–46 s   TRAMO A, BAJO EL AGUA (superficie en y = NIVEL_AGUA = 200).
//           Jugador 1 = Peter en el submarino (P2.fn.submarinoNave, look.sub, modo
//           'submarino'): 2D con inercia (220 px/s, 900 px/s²) en x ∈ [60, 700],
//           y ∈ [232, 480]. attack mantenido = escudo de proa (bloquea de frente,
//           120 px/s); shoot = escudo-torpedo (320 px, 2 de daño, hasta 2 rebotes,
//           vuelve a la proa). Peces-robot, peces escupidores, minas, corrientes con
//           flechas de burbujas y estalactitas que caen del techo de la cueva.
//           Jugador 2 (o IA invulnerable) = Falcon en el mecha-halcón por ENCIMA del
//           agua (y ∈ [40, 176]): shoot mantenido = plumas; attack = embestida.
//           Las plumas no entran en el agua y el escudo-torpedo no sale de ella.
//  46–52 s  TRAMO B, ¡SALE Y DESPEGA! (guionizado): Peter sube solo, salta del agua
//           con un gran salpicón, gira en el aire a cámara lenta, "¡Modo nave!",
//           enciende los motores y la cueva queda abajo mientras se abre el cielo.
//  52–98 s  TRAMO C, VUELO (fork de js/p2/vuelo.js): Peter-nave 2D a 260 px/s con
//           escudo (attack) y escudo-bumerán (shoot); Falcon como en vuelo.js.
//           Enjambres en formación, drones de rayos con aviso, drones en picado y
//           mini-robots de Robovill.
//  98 s     FINAL: el Dron Nodriza tapa la salida: "¡El Dron Nodriza! ¡Fusión
//           voladora!" (2,5 s) → G.go('levelP3_3f', {nuevo: true}).
//
// Daño: Peter = G.state.hp (J1), Falcon = G.state.hp2 (J2). 1 de daño, 1,2 s de
// invulnerabilidad. 1 jugador: sin corazones → gameover {retry: 'levelP3_3'}.
// Co-op: K.O. 4 s y vuelve con 6 (los dos K.O. → gameover). Puntos de control a
// los 46 s (despegue) y 75 s, con el mismo mecanismo que saltarA.
//
// Atajos de prueba (§18.1): enter({saltarA: s}), enter({nuevo: true}),
// G.p3.debugInvulnerable y __debug = {phase(), route(), finalTime: 98, heroes()}.
// touchExtra = {vertical: true, ocultar: ['hack', 'jump']} (botones ▲ ▼ en el móvil; sin HACK ni SALTO).
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  G.scenes = G.scenes || {};

  // ---------------------------------------------------------------------------
  //  Constantes (contrato §11.3)
  // ---------------------------------------------------------------------------
  var W = 960, H = 540;
  var OUT = '#1a1a2e';
  var NIVEL_AGUA = 200;
  var INTRO_END = 3, DESPEGUE_AT = 46, VUELO_AT = 52, FINAL_AT = 98;
  var DESPEGUE_LEN = VUELO_AT - DESPEGUE_AT;   // 6 s
  var CHECKPOINTS = [46, 75];
  var FINAL_GO = 0.6 + 2.5;                    // la Nodriza llega (0,6 s) + el texto (2,5 s)
  var WATER_V = 130;                           // lo que flota en el río va hacia la izquierda
  var SKY_SPEED = 150;                         // scroll del cielo (px/s)
  var SKY_FROM = DESPEGUE_AT + 3.6;            // el cielo empieza a verse en el despegue

  var SUB_SPEED = 220, SUB_ACC = 900, SUB_SHIELD_SPEED = 120;
  var NAVE_SPEED = 260, NAVE_ACC = 1500, NAVE_SHIELD_SPEED = 150;
  var SUB_BOX = { x0: 60, x1: 700, y0: 232, y1: 480 };
  var NAVE_BOX = { x0: 60, x1: 700, y0: 56, y1: 488 };
  var AIR_BOX = { x0: 40, x1: 760, y0: 40, y1: 176 };     // Falcon sobre el agua
  var FLY_BOX = { x0: 40, x1: 760, y0: 44, y1: 496 };     // Falcon en el vuelo
  var SUB_ESCALA = 0.75;                                  // contrato: escala ≈ 0,75
  var PETER_W = 84, PETER_H = 40;                         // hitbox amable
  var MECHA_W = 80, MECHA_H = 46, MECHA_SC_A = 0.85, MECHA_SC_B = 0.95, MECHA_SPEED = 300;

  // Escudo-torpedo (§6.2 adaptado al submarino)
  var TORP_V = 560, TORP_RANGE = 320, TORP_DMG = 2, TORP_BACK_V = 640, TORP_BACK_DMG = 1;
  var TORP_BOUNCES = 2, TORP_BOUNCE_R = 180, TORP_MAX_T = 4, TORP_CATCH = 40, TORP_CD = 0.25, TORP_R = 15;
  var SHIELD_R = 36;

  // Falcon (como js/p2/vuelo.js)
  var FEATHER_CD = 0.15, FEATHER_V = 760, AI_FEATHER_CD = 0.32;
  var DASH_CD = 2.0, DASH_TIME = 0.34, DASH_VX = 640, DASH_VY = 300, DASH_DMG = 2;

  var INVULN = 1.2;
  var KO_TIME = 4, KO_RESPAWN_HP = 6, KO_INVULN = 2;

  // Alto del arte a escala 1 (contrato §16.4) por si datos-arte3.js faltara.
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };

  // ---------------------------------------------------------------------------
  //  Pistas (plantillas: pasan por G.p3conTeclas; nunca teclas escritas a mano)
  // ---------------------------------------------------------------------------
  var TXT = {
    peter: '¡A los mandos, Peter! Mantén {ataque} para el escudo de proa y pulsa {disparo} para lanzar el escudo-torpedo.',
    falconCoop: 'Falcon vuela sobre el agua: mantén {disparo} para lanzar plumas y pulsa {ataque} para la embestida.',
    falcon1: '¡Lord Falcon te cubre desde el aire! Tú, Peter, ocúpate de lo que hay bajo el agua.',
    minas: 'Las minas explotan si las tocas: ¡lánzales el escudo-torpedo con {disparo}!',
    corriente: '¡Corrientes! Las flechas de burbujas te empujan: ¡nada con fuerza!',
    escupe: 'Ese pez-robot escupe burbujas: ¡mantén {ataque} para pararlas con el escudo!',
    estal: '¡Estalactitas! Cuando veas el «!», apártate de su camino.',
    corrEstal: '¡Corrientes y estalactitas! Las flechas de burbujas te empujan; cuando veas el «!», apártate.',
    minasEscupe: 'Lanza el escudo-torpedo con {disparo} a las minas y mantén {ataque} para parar las burbujas.',
    salidaA: '¡Se ve la salida del río! ¡Prepárate para despegar!',
    nave: '¡Modo nave! Mantén {ataque} para el escudo y pulsa {disparo} para el escudo-bumerán.',
    rayo: 'El dron de rayos avisa con «!». ¡El escudo de Peter corta el rayo y protege a los de detrás!',
    minis: '¡Mini-robots de Robovill! Te persiguen: ¡el escudo-bumerán rebota entre ellos!',
    salidaC: '¡Mirad la salida de la cueva! Algo enorme se acerca…'
  };

  // ---------------------------------------------------------------------------
  //  Utilidades seguras
  // ---------------------------------------------------------------------------
  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* nada */ } }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) { /* nada */ } }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function easeOut(u) { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u); }
  function easeIn(u) { u = clamp(u, 0, 1); return u * u; }
  function easeInOut(u) { u = clamp(u, 0, 1); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
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
  function lookObj() { return (G.p3 && G.p3.look) || {}; }
  function inv() { return !!(G.p3 && G.p3.debugInvulnerable); }
  function heroColor(h, tono) {
    try { if (G.p3 && typeof G.p3.heroColor === 'function') return G.p3.heroColor(h, tono); } catch (e) { /* nada */ }
    return h === 'falcon' ? '#4ade80' : (lookOf('peter') === 'B' ? '#db2777' : '#facc15');
  }
  function tk(texto, j) {
    try { if (typeof G.p3conTeclas === 'function') return G.p3conTeclas(texto, j); } catch (e) { /* nada */ }
    return String(texto).replace(/\{ataque\}/g, 'ATAQUE').replace(/\{disparo\}/g, 'DISPARO')
      .replace(/\{hack\}/g, 'HACK').replace(/\{cambio\}/g, 'CAMBIO').replace(/\{salto\}/g, 'SALTO');
  }
  function circleHitsRect(cx, cy, cr, r) {
    var nx = clamp(cx, r.x, r.x + r.w), ny = clamp(cy, r.y, r.y + r.h);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= cr * cr;
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
    c.textAlign = align || 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.miterLimit = 2; c.lineWidth = Math.max(3, size * 0.26);
    c.strokeStyle = OUT; c.strokeText(txt, x, y);
    c.fillStyle = col || '#fef3c7'; c.fillText(txt, x, y);
    c.restore();
  }
  function bubble(c, text, x, y) {
    c.save();
    c.font = 'bold 16px system-ui, "Segoe UI", Arial, sans-serif';
    var w = c.measureText(text).width + 22, h = 30;
    var bx = clamp(x - w / 2, 8, W - w - 8), by = clamp(y - h - 12, 70, H - h - 8);
    c.fillStyle = '#fffbeb'; c.strokeStyle = OUT; c.lineWidth = 3;
    rrect(c, bx, by, w, h, 12); c.fill(); c.stroke();
    var tx = clamp(x, bx + 14, bx + w - 14);
    c.beginPath(); c.moveTo(tx - 7, by + h - 1); c.lineTo(tx, by + h + 9); c.lineTo(tx + 7, by + h - 1);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = OUT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, bx + w / 2, by + h / 2 + 1);
    c.restore();
  }
  function hash(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  var NO_INPUT = { held: function () { return false; }, pressed: function () { return false; } };
  function inputOf(h) {
    if (!h || h.isAI) return NO_INPUT;
    if (h.jugador === 2) return (coop && G.input2) ? G.input2 : NO_INPUT;
    return G.input || NO_INPUT;
  }

  // ---------------------------------------------------------------------------
  //  Estado de la escena
  // ---------------------------------------------------------------------------
  var memoria = null;            // reintento (sobrevive a exit(): §8.2, §9.6)
  var coop = false, subVar = 'A', peterVar = 'A', mechaVar = 'A';
  var phase = 'intro', t = 0, rt = 0, nivel = NIVEL_AGUA;
  var peter = null, falcon = null, heroes = [];
  var enemies = [], groups = [], eshots = [], beams = [], feathers = [], torp = null;
  var pickups = [], currents = [], parts = [], texts = [], rings = [], pops = [], splashes = [];
  var scriptIdx = 0, lastCP = 0, cpDone = [];
  var hint = null, shake = 0, flash = 0, flashCol = '#ffffff', banner = null;
  var finalT = 0, loseT = 0, endGo = false, nodriza = null, thanksT = 0, seen = {};
  var despStarted = false, despFx = {};

  // ---------------------------------------------------------------------------
  //  Héroes
  // ---------------------------------------------------------------------------
  function makeHero(kind, jugador, isAI, x, y) {
    return {
      kind: kind, jugador: jugador, isAI: isAI, hpKey: jugador === 2 ? 'hp2' : 'hp',
      x: x, y: y, vx: 0, vy: 0, tilt: 0, roll: 1, scaleMul: 1, modo: 'submarino',
      invuln: 0, bump: 0, ko: false, koT: 0,
      shield: false, shieldAnim: 0, catchCd: 0, throwT: 0,
      shootCd: 0, attackCd: 0, dashT: 0, dashVx: 0, dashVy: 0, dashHits: [],
      say: '', sayT: 0, aiSide: -1, aiSideT: 0
    };
  }
  function subScale() { return SUB_ESCALA * 80 / altoArte('submarinoNave'); }
  function peterRect(h) { return { x: h.x - PETER_W / 2, y: h.y - PETER_H / 2, w: PETER_W, h: PETER_H }; }
  function falconRect(h) { return { x: h.x - MECHA_W / 2, y: h.y - MECHA_H / 2, w: MECHA_W, h: MECHA_H }; }
  function heroRect(h) { return h.kind === 'peter' ? peterRect(h) : falconRect(h); }
  function noseX(h) { return h.x + 46 * (h.scaleMul || 1); }
  function shieldCenter(h) { return { x: h.x + 54 * (h.scaleMul || 1), y: h.y }; }
  function underwater() { return phase === 'intro' || phase === 'agua' || (phase === 'lose' && rt < DESPEGUE_AT); }
  function heroMedio(h) { return (h.kind === 'peter' && underwater()) ? 'agua' : 'aire'; }
  function players() {
    var out = [];
    for (var i = 0; i < heroes.length; i++) if (!heroes[i].isAI && !heroes[i].ko) out.push(heroes[i]);
    return out;
  }
  // El héroe vivo más cercano en el mismo medio (agua / aire). Con `soloJugadores`
  // no cuenta la IA; si no hay jugador en ese medio, devuelve la IA (que es invulnerable).
  function nearestHero(x, y, medio) {
    var best = null, bd = 1e9;
    for (var i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (h.ko || (medio && heroMedio(h) !== medio)) continue;
      var d = dist(x, y, h.x, h.y) + (h.isAI ? 400 : 0);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  //  Efectos
  // ---------------------------------------------------------------------------
  function addText(txt, x, y, col, life, size) {
    texts.push({ txt: txt, x: x, y: y, col: col || '#fde047', life: life || 1.1, max: life || 1.1, size: size || 20 });
  }
  function addPart(p) { if (parts.length < 520) parts.push(p); }
  function spark(x, y, n, col, v0, v1) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2), v = rand(v0 || 60, v1 || 180);
      addPart({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.55), max: 0.55, kind: 'dot', col: col || '#fde047', r: rand(1.6, 3.2) });
    }
  }
  function stars(x, y, n, col) {
    for (var i = 0; i < n; i++) {
      addPart({ x: x + rand(-20, 20), y: y + rand(-20, 20), vx: rand(-90, 90), vy: rand(-140, -20),
        life: rand(0.5, 1), max: 1, kind: 'star', col: col || '#fde047', r: rand(2.5, 4.5) });
    }
  }
  function bubbles(x, y, n, spread) {
    for (var i = 0; i < n; i++) {
      addPart({ x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-60, -10), vy: rand(-90, -40),
        life: rand(0.6, 1.2), max: 1.2, kind: 'bubble', col: '#e0f2fe', r: rand(2, 4.5) });
    }
  }
  function droplets(x, y, n, vmax) {
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + rand(-0.9, 0.9), v = rand(160, vmax || 520);
      addPart({ x: x + rand(-30, 30), y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.8, 1.5), max: 1.5,
        kind: 'drop', col: Math.random() < 0.5 ? '#bae6fd' : '#e0f2fe', r: rand(2.5, 5), grav: 900 });
    }
  }
  function pop(x, y, big, enAgua) {
    pops.push({ x: x, y: y, life: 0.6, max: 0.6, s: big ? 1.3 : 0.9 });
    for (var i = 0; i < (big ? 4 : 3); i++) {
      addPart({ x: x, y: y, vx: rand(-130, 130), vy: rand(-220, -60), life: 0.8, max: 0.8, kind: 'bolt', col: '#94a3b8', r: 3, grav: enAgua ? 160 : 520 });
    }
    spark(x, y, big ? 10 : 6, '#fde68a', 70, 230);
    if (enAgua) bubbles(x, y, 8, 14);
    shake = Math.max(shake, big ? 6 : 3);
  }
  function splash(x, big) {
    splashes.push({ x: x, life: big ? 1.3 : 0.6, max: big ? 1.3 : 0.6, big: !!big });
    droplets(x, nivel, big ? 46 : 10, big ? 620 : 300);
    sfx('splash');
  }
  function showHint(txt, j, dur) { hint = { txt: tk(txt, j || 0), life: dur || 4.5 }; }
  function say(h, txt, dur) { if (h) { h.say = txt; h.sayT = dur || 1.8; } }
  function maybeHeart(x, y, medio) {
    if (Math.random() >= 0.25) return;
    // 1 jugador bajo el agua: Falcon IA no recoge corazones y Peter no puede salir del
    // agua, así que el corazón que suelta un enemigo del aire cae al río («¡plof!»).
    if (medio === 'aire' && !coop && underwater()) {
      pickups.push({ x: x, y: y, medio: 'agua', t: 0, vx: -WATER_V * 0.6, cae: true, vy: 0 });
      return;
    }
    pickups.push({ x: x, y: y, medio: medio, t: 0, vx: medio === 'agua' ? -WATER_V * 0.6 : -70 });
  }

  // ---------------------------------------------------------------------------
  //  Daño, K.O. y curación (cada vehículo es de su jugador: §11.2, §11.3)
  // ---------------------------------------------------------------------------
  function hurt(h, dmg, fromX) {
    if (!h || h.ko || (phase !== 'agua' && phase !== 'vuelo')) return 'nada';
    if (h.invuln > 0 || h.dashT > 0) return 'nada';
    if (h.isAI) { if (h.bump <= 0) h.bump = 0.6; return 'nada'; }
    if (inv() || !G.state) { h.invuln = 0.3; return 'nada'; }
    G.state[h.hpKey] = Math.max(0, (G.state[h.hpKey] || 0) - (dmg || 1));
    h.invuln = INVULN;
    flash = 0.25; flashCol = '#ff4d4d'; shake = Math.max(shake, 6);
    sfx('hurt');
    if (typeof fromX === 'number') h.vx += (h.x < fromX ? -1 : 1) * 160;
    if ((G.state[h.hpKey] || 0) <= 0) {
      if (!coop) startLose(h);
      else knockOut(h);
    }
    return 'hecho';
  }
  function knockOut(h) {
    h.ko = true; h.koT = KO_TIME; h.invuln = 0; h.dashT = 0; h.shield = false;
    if (h.kind === 'peter') torp = null;
    pop(h.x, h.y, true, heroMedio(h) === 'agua');
    sfx('explosion');
    addText(h.kind === 'peter' ? '¡Peter, averiado!' : '¡Falcon, averiado!', h.x, h.y - 50, '#fca5a5', 1.4);
    if (players().length === 0) startLose(h);
  }
  function respawn(h) {
    h.ko = false; h.koT = 0;
    if (G.state) G.state[h.hpKey] = KO_RESPAWN_HP;
    h.invuln = KO_INVULN; h.vx = 0; h.vy = 0;
    var box = boxOf(h), mate = h === peter ? falcon : peter;
    h.x = clamp(mate && !mate.ko ? mate.x - 40 : 200, box.x0, box.x1);
    h.y = clamp(h.kind === 'peter' ? (box.y0 + box.y1) / 2 : (mate && !mate.ko ? mate.y - 70 : 120), box.y0, box.y1);
    stars(h.x, h.y, 12, heroColor(h.kind, 'claro'));
    addText('¡De vuelta!', h.x, h.y - 50, '#86efac', 1.1);
    sfx('checkpoint');
  }
  function startLose(h) {
    if (phase === 'lose') return;
    phase = 'lose'; loseT = 0;
    memoria = { at: lastCP };
    if (h) { h.loser = true; pop(h.x, h.y, true, heroMedio(h) === 'agua'); }
    sfx('explosion');
  }
  function heal(h, n) {
    if (!G.state) return;
    var key = (h && !h.isAI) ? h.hpKey : 'hp';
    var mx = key === 'hp2' ? (G.state.maxHp2 || 10) : (G.state.maxHp || 10);
    G.state[key] = Math.min(mx, (G.state[key] || 0) + n);
  }
  function boxOf(h) {
    if (h.kind === 'peter') return underwater() ? SUB_BOX : NAVE_BOX;
    return underwater() || phase === 'despegue' ? AIR_BOX : FLY_BOX;
  }

  // ---------------------------------------------------------------------------
  //  Enemigos: creación
  // ---------------------------------------------------------------------------
  function baseEnemy(type, medio, x, y, r, hp) {
    var e = { type: type, medio: medio, x: x, y: y, r: r, hp: hp, maxHp: hp, dead: false, gone: false,
      state: 'ir', st: 0, vx: 0, vy: 0, flash: 0, stun: 0, ph: Math.random() * 6.28, t: 0 };
    enemies.push(e);
    return e;
  }
  function spawnFish(y, n, forma) {
    for (var i = 0; i < n; i++) {
      var e = baseEnemy('pez', 'agua', W + 50 + i * 62, y, 18, 1);
      e.baseY = y + (forma === 'v' ? Math.abs(i - (n - 1) / 2) * 34 * (i % 2 ? 1 : -1) : 0);
      e.amp = forma === 'onda' ? 46 : 22; e.ph = i * 0.7; e.vx = -165;
      e.y = e.baseY;
    }
  }
  function spawnEscupe(y) {
    var e = baseEnemy('escupe', 'agua', W + 60, y, 24, 2);
    e.baseY = y; e.hoverX = rand(700, 820); e.fireT = 1.4; e.shots = 0;
  }
  function spawnMines(ys, dx) {
    for (var i = 0; i < ys.length; i++) {
      var e = baseEnemy('mina', 'agua', W + 40 + i * (dx || 0), ys[i], 18, 1);
      e.baseY = ys[i];
    }
  }
  function spawnStalactites(xs) {
    for (var i = 0; i < xs.length; i++) {
      var e = baseEnemy('estalactita', 'aire', xs[i], 30, 14, 1);
      e.state = 'aviso'; e.st = 0.9 + i * 0.35; e.len = rand(34, 46);
    }
    if (!seen.estal) { seen.estal = true; showHint(TXT.estal, 0, 3.6); }
  }
  function spawnCurrent(y0, y1, dir, w) {
    currents.push({ x: W + 20, w: w || 280, y0: y0, y1: y1, dir: dir, ph: Math.random() * 6 });
  }
  function spawnHeart(y, medio) {
    pickups.push({ x: W + 30, y: y, medio: medio, t: 0, vx: medio === 'agua' ? -WATER_V : -90, burbuja: medio === 'agua' });
  }
  // Enjambres en formación (fork de vuelo.js). En el tramo A vuelan sobre el agua.
  var FORMS = {
    V: [[0, 0], [38, -32], [38, 32], [76, -64], [76, 64], [114, -96], [114, 96]],
    flecha: [[0, 0], [36, -28], [36, 28], [72, 0], [108, 0], [72, -56], [72, 56]]
  };
  function spawnSwarm(kind, y, n) {
    var aguaTramo = phase === 'agua' || phase === 'intro';
    var g = { kind: kind, x: W + 70, y: y, baseY: y, t: 0, diveT: 2.0, members: [], n: n, amp: aguaTramo ? 0.45 : 1, low: aguaTramo };
    groups.push(g);
    for (var i = 0; i < n; i++) {
      var e = baseEnemy('enjambre', 'aire', W + 80 + i * 40, y, 16, 1);
      e.group = g; e.state = 'form';
      g.members.push(e);
    }
    placeSwarm(g);
    for (var k = 0; k < g.members.length; k++) { g.members[k].x = g.members[k].sx; g.members[k].y = g.members[k].sy; }
  }
  function placeSwarm(g) {
    for (var i = 0; i < g.members.length; i++) {
      var e = g.members[i], o;
      if (g.kind === 'circulo') {
        var a = (i / g.n) * 6.283 + g.t * 1.4;
        e.sx = g.x + Math.cos(a) * 58 * g.amp; e.sy = g.y + Math.sin(a) * 58 * g.amp;
      } else if (g.kind === 'serpiente') {
        e.sx = g.x + i * 44; e.sy = g.baseY + Math.sin(g.t * 2.4 - i * 0.6) * 70 * g.amp;
      } else {
        o = (FORMS[g.kind] || FORMS.V)[i % 7];
        e.sx = g.x + o[0]; e.sy = g.y + o[1] * g.amp;
      }
      if (g.low) e.sy = clamp(e.sy, 30, 178);
    }
  }
  function spawnRayo(y) {
    var e = baseEnemy('rayo', 'aire', W + 50, y, 24, 2);
    e.state = 'enter'; e.targetX = rand(660, 820); e.fireT = 1.4; e.life = 14; e.beamY = y;
  }
  function spawnPicado(dx) {
    var e = baseEnemy('picado', 'aire', W + 40 + (dx || 0), rand(90, 120), 18, 1);
    e.state = 'cruise'; e.vx = -125; e.angle = Math.PI; e.dives = 0;
  }
  function spawnMinis(n) {
    for (var i = 0; i < n; i++) {
      var e = baseEnemy('miniRobot', 'aire', W + 40 + i * 50, 100 + hash(i + rt) * 340, 20, 1);
      e.state = 'entra'; e.vx = -150; e.vy = 0; e.life = 13; e.facing = -1;
    }
    if (!seen.minis) { seen.minis = true; showHint(TXT.minis, 1, 3.4); }
    sfx('miniRobot');
  }

  // ---------------------------------------------------------------------------
  //  Guion del recorrido (segundos de `rt`)
  // ---------------------------------------------------------------------------
  var SCRIPT = [
    // ---- TRAMO A: bajo el agua ----
    [3.2, function () { showHint(TXT.peter, 1, 4.5); }],
    [5, function () { spawnFish(330, 3, 'onda'); }],
    [7.5, function () { spawnMines([290, 430]); }],
    [9.2, function () { if (coop) showHint(TXT.falconCoop, 2, 4); else showHint(TXT.falcon1, 0, 3.4); }],
    [9, function () { spawnSwarm('V', 110, 5); }],
    [11, function () { spawnFish(410, 4, 'linea'); }],
    [13, function () { spawnCurrent(300, 470, 'arriba', 300); }],
    [14.6, function () { seen.estal = true; showHint(TXT.corrEstal, 0, 3.8); }],
    [14.5, function () { spawnMines([262, 372, 462], 90); }],
    [17, function () { spawnStalactites([560, 720, 860]); }],
    [19, function () { spawnEscupe(350); }],
    [20.2, function () { showHint(TXT.minasEscupe, 1, 4); }],
    [21, function () { spawnSwarm('serpiente', 110, 5); }],
    [22, function () { spawnHeart(380, 'agua'); }],
    [23, function () { spawnFish(300, 5, 'v'); }],
    [25, function () { spawnCurrent(240, 380, 'abajo', 300); }],
    [26, function () { spawnMines([300, 440], 60); spawnFish(380, 2, 'onda'); }],
    [27.5, function () { spawnStalactites([520, 660, 800, 920]); }],
    [29, function () { spawnEscupe(280); spawnEscupe(440); }],
    [31, function () { spawnSwarm('circulo', 105, 5); }],
    [32, function () { spawnFish(360, 6, 'onda'); }],
    [34, function () { spawnMines([255, 330, 405, 475], 0); }],
    [35.5, function () { spawnCurrent(250, 470, 'atras', 340); }],
    [36.5, function () { spawnHeart(300, 'agua'); spawnHeart(coop ? 100 : 420, coop ? 'aire' : 'agua'); }],
    [37.5, function () { spawnEscupe(380); spawnFish(270, 3, 'linea'); }],
    [39.5, function () { spawnStalactites([600, 760, 900]); }],
    [41, function () { spawnSwarm('V', 112, 5); spawnFish(440, 4, 'v'); }],
    [42.5, function () { spawnMines([280, 360, 440], 120); }],
    [43.6, function () { showHint(TXT.salidaA, 0, 3); }],
    // ---- TRAMO C: vuelo ----
    [52.4, function () { showHint(TXT.nave, 1, 4.2); }],
    [54, function () { spawnSwarm('V', 200, 5); }],
    [56.5, function () { spawnSwarm('flecha', 390, 6); }],
    [58.4, function () { spawnRayo(300); showHint(TXT.rayo, 0, 3.6); }],
    [60.5, function () { spawnPicado(0); spawnPicado(110); }],
    [63.4, function () { spawnMinis(3); }],
    [65, function () { spawnSwarm('circulo', 250, 6); }],
    [66.5, function () { spawnHeart(330, 'aire'); }],
    [68, function () { spawnMinis(4); }],
    [70, function () { spawnRayo(160); spawnRayo(420); }],
    [72.5, function () { spawnSwarm('serpiente', 320, 7); }],
    [74, function () { spawnPicado(0); spawnPicado(90); spawnPicado(180); }],
    [76.5, function () { spawnSwarm('V', 150, 5); spawnSwarm('V', 400, 5); }],
    [79, function () { spawnMinis(5); }],
    [81, function () { spawnRayo(280); spawnPicado(40); }],
    [82.5, function () { spawnHeart(220, 'aire'); }],
    [84, function () { spawnSwarm('circulo', 200, 6); spawnSwarm('flecha', 400, 6); }],
    [87, function () { spawnMinis(4); spawnRayo(420); }],
    [89.5, function () { spawnPicado(0); spawnPicado(80); spawnPicado(160); }],
    [91, function () { spawnSwarm('serpiente', 300, 7); }],
    [92.5, function () { spawnHeart(300, 'aire'); }],
    [94.5, function () { showHint(TXT.salidaC, 0, 3.5); }]
  ];
  function runScript() {
    while (scriptIdx < SCRIPT.length && rt >= SCRIPT[scriptIdx][0]) {
      try { SCRIPT[scriptIdx][1](); } catch (e) { if (window.console) console.warn('[rio] guion', e); }
      scriptIdx++;
    }
  }

  // ---------------------------------------------------------------------------
  //  Construcción y reinicio (saltarA y puntos de control usan lo mismo)
  // ---------------------------------------------------------------------------
  function resetAll(params) {
    params = params || {};
    coop = !!(G.state && G.state.coop);
    subVar = lookOf('sub'); peterVar = lookOf('peter');
    mechaVar = (G.p2 && G.p2.vehicle && G.p2.vehicle.mechahalcon === 'B') ? 'B' : 'A';
    if (G.state) {
      G.state.hp = G.state.maxHp || 10;
      if (coop) { G.state.maxHp2 = G.state.maxHp2 || G.state.maxHp || 10; G.state.hp2 = G.state.maxHp2; }
    }
    t = 0; rt = 0; nivel = NIVEL_AGUA;
    enemies = []; groups = []; eshots = []; beams = []; feathers = []; torp = null;
    pickups = []; currents = []; parts = []; texts = []; rings = []; pops = []; splashes = [];
    hint = null; shake = 0; flash = 0; banner = null; finalT = 0; loseT = 0; endGo = false;
    nodriza = null; thanksT = 0; seen = {}; despStarted = false; despFx = {};
    peter = makeHero('peter', 1, false, 200, 350);
    falcon = makeHero('falcon', coop ? 2 : 0, !coop, 150, 110);
    falcon.modo = 'vuelo';
    heroes = [peter, falcon];

    var skip = (typeof params.saltarA === 'number' && isFinite(params.saltarA)) ? params.saltarA : null;
    if (skip === null && params.saltarA !== undefined && isFinite(Number(params.saltarA))) skip = Number(params.saltarA);
    if (skip === null && !params.nuevo && memoria) skip = Math.max(INTRO_END, memoria.at);
    memoria = null;
    lastCP = 0; cpDone = []; scriptIdx = 0;
    if (skip !== null && skip > 0) {
      skip = clamp(skip, INTRO_END, FINAL_AT);
      rt = skip;
      for (var c = 0; c < CHECKPOINTS.length; c++) if (CHECKPOINTS[c] <= skip + 0.01) { cpDone[c] = true; lastCP = CHECKPOINTS[c]; }
      while (scriptIdx < SCRIPT.length && SCRIPT[scriptIdx][0] < skip - 0.01) scriptIdx++;
      if (skip >= FINAL_AT) {
        phase = 'vuelo'; toNave(); startFinal();
      } else if (skip >= VUELO_AT) {
        phase = 'vuelo'; toNave();
        peter.x = 300; peter.y = 290; falcon.x = 160; falcon.y = 170;
        banner = { txt: '¡A volar!', sub: tk('{ataque}: escudo · {disparo}: escudo-bumerán', 1), life: 2, max: 2 };
      } else if (skip >= DESPEGUE_AT) {
        phase = 'despegue'; peter.x = 300; peter.y = 300; falcon.x = 520; falcon.y = 110;
      } else {
        phase = 'agua';
        banner = { txt: 'Río subterráneo', sub: '¡Peter al agua, Falcon al aire!', life: 2, max: 2 };
        if (skip > 3.3) showHint(TXT.peter, 1, 4);
      }
    } else {
      phase = 'intro';
      peter.x = -130; peter.y = 360; falcon.x = -170; falcon.y = 110;
    }
  }
  function toNave() {
    peter.modo = 'nave'; nivel = H + 200;
    peter.roll = 1; peter.scaleMul = 1; peter.tilt = 0;
  }

  // ---------------------------------------------------------------------------
  //  INTRO (0–3 s)
  // ---------------------------------------------------------------------------
  function updateIntro(dt) {
    rt += dt;
    peter.x = lerp(peter.x, 300, Math.min(1, dt * 2.0));
    peter.y = 360 + Math.sin(t * 2) * 6;
    falcon.x = lerp(falcon.x, 170, Math.min(1, dt * 1.9));
    falcon.y = 110 + Math.sin(t * 2.4) * 8;
    if (Math.random() < 0.6) bubbles(peter.x - 60, peter.y, 1, 6);
    mechaTrail(falcon);
    if (rt >= 1.4 && rt - dt < 1.4) say(falcon, '¡Te cubro desde arriba, Peter!', 1.6);
    if (rt >= INTRO_END) { phase = 'agua'; banner = null; }
  }

  // ---------------------------------------------------------------------------
  //  Controles de Peter (submarino y nave)
  // ---------------------------------------------------------------------------
  function updatePeter(h, dt) {
    var inp = inputOf(h);
    var nave = h.modo === 'nave';
    var box = boxOf(h);
    var ax = 0, ay = 0;
    if (inp.held('left')) ax -= 1;
    if (inp.held('right')) ax += 1;
    if (inp.held('up')) ay -= 1;
    if (inp.held('down')) ay += 1;
    if (ax !== 0 && ay !== 0) { ax *= 0.7071; ay *= 0.7071; }
    // escudo: mantener attack con el escudo en la proa (no mientras vuela el torpedo)
    h.shield = inp.held('attack') && !torp;
    var vmax = h.shield ? (nave ? NAVE_SHIELD_SPEED : SUB_SHIELD_SPEED) : (nave ? NAVE_SPEED : SUB_SPEED);
    var acc = nave ? NAVE_ACC : SUB_ACC;
    var tvx = ax * vmax, tvy = ay * vmax;
    h.vx += clamp(tvx - h.vx, -acc * dt, acc * dt);
    h.vy += clamp(tvy - h.vy, -acc * dt, acc * dt);
    // corrientes (solo bajo el agua)
    if (!nave) {
      for (var i = 0; i < currents.length; i++) {
        var cu = currents[i];
        if (h.x > cu.x && h.x < cu.x + cu.w && h.y > cu.y0 && h.y < cu.y1) {
          if (cu.dir === 'arriba') h.y -= 150 * dt;
          else if (cu.dir === 'abajo') h.y += 150 * dt;
          else h.x -= 130 * dt;
          if (Math.random() < 0.3) bubbles(h.x + rand(-30, 30), h.y + 20, 1, 4);
        }
      }
    }
    h.x = clamp(h.x + h.vx * dt, box.x0, box.x1);
    h.y = clamp(h.y + h.vy * dt, box.y0, box.y1);
    if (h.x <= box.x0 || h.x >= box.x1) h.vx = 0;
    if (h.y <= box.y0 || h.y >= box.y1) h.vy = 0;
    h.tilt = lerp(h.tilt, clamp(h.vy / 900, -0.22, 0.22), Math.min(1, dt * 8));
    h.shieldAnim = clamp(h.shieldAnim + (h.shield ? dt * 8 : -dt * 8), 0, 1);
    // escudo-torpedo / escudo-bumerán
    if (inp.pressed('shoot') && !torp && h.catchCd <= 0) throwTorpedo(h);
    // estela
    if (!nave) { if (Math.random() < 0.5) bubbles(h.x - 52, h.y + rand(-6, 6), 1, 3); }
    else naveTrail(h);
  }
  function naveTrail(h) {
    if (Math.random() < 0.8) {
      addPart({ x: h.x - 56 * h.scaleMul, y: h.y + rand(-5, 5), vx: -rand(180, 280), vy: rand(-20, 20), life: 0.28, max: 0.28,
        kind: 'dot', col: Math.random() < 0.5 ? '#fdba74' : '#fde68a', r: rand(2, 3.5) });
    }
  }
  function mechaTrail(h) {
    if (Math.random() < 0.8) {
      addPart({ x: h.x - 58, y: h.y + rand(-6, 9), vx: -rand(160, 240), vy: rand(-20, 20), life: 0.25, max: 0.25,
        kind: 'dot', col: mechaVar === 'B' ? '#4ade80' : '#bbf7d0', r: rand(1.5, 3) });
    }
  }

  // ---------------------------------------------------------------------------
  //  Escudo-torpedo (§6.2 adaptado): ida que frena, rebotes, vuelta a la proa
  // ---------------------------------------------------------------------------
  function throwTorpedo(h) {
    var medio = heroMedio(h);
    torp = { x: noseX(h) + 6, y: h.y, dx: 1, dy: 0, st: 'ida', d: 0, range: TORP_RANGE, t: 0,
      bounces: 0, hit: [], hitBack: [], medio: medio, ang: 0 };
    h.shield = false; h.throwT = 0.25;
    sfx('shieldThrow');
    if (medio === 'agua') bubbles(torp.x, torp.y, 5, 6);
  }
  function torpTargets() {
    var out = [];
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead || e.gone || e.medio !== torp.medio) continue;
      if (e.type === 'estalactita' && e.state === 'aviso') continue;
      out.push(e);
    }
    return out;
  }
  function updateTorpedo(dt) {
    if (!torp) return;
    var h = peter;
    if (!h || h.ko || (phase !== 'agua' && phase !== 'vuelo')) { torp = null; return; }
    torp.t += dt; torp.ang += dt * 16;
    var list = torpTargets(), i, e;
    if (torp.st === 'ida') {
      var sp = TORP_V * (1 - 0.45 * clamp(torp.d / torp.range, 0, 1));
      torp.x += torp.dx * sp * dt; torp.y += torp.dy * sp * dt; torp.d += sp * dt;
      for (i = 0; i < list.length; i++) {
        e = list[i];
        if (torp.hit.indexOf(e) >= 0) continue;
        if (dist(torp.x, torp.y, e.x, e.y) < e.r + TORP_R) {
          torp.hit.push(e);
          damageEnemy(e, TORP_DMG, 'escudo', torp.x - torp.dx * sp * 0.1);
          sfx('punch');
          // rebote hacia el enemigo vivo más cercano que aún no haya tocado
          var best = null, bd = TORP_BOUNCE_R;
          if (torp.bounces < TORP_BOUNCES) {
            for (var k = 0; k < list.length; k++) {
              var o = list[k];
              if (o.dead || torp.hit.indexOf(o) >= 0) continue;
              var d = dist(torp.x, torp.y, o.x, o.y);
              if (d < bd) { bd = d; best = o; }
            }
          }
          if (best) {
            var ddx = best.x - torp.x, ddy = best.y - torp.y, dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
            torp.dx = ddx / dl; torp.dy = ddy / dl; torp.d = 0; torp.range = TORP_BOUNCE_R + 30; torp.bounces++;
            addText('¡Rebote!', torp.x, torp.y - 26, heroColor('peter', 'claro'), 0.7, 16);
          } else torp.st = 'vuelta';
          break;
        }
      }
      if (torp.d >= torp.range || torp.x > W + 20 || torp.x < -20) torp.st = 'vuelta';
    } else {
      var tx = noseX(h), ty = h.y, ddx2 = tx - torp.x, ddy2 = ty - torp.y, dd = Math.sqrt(ddx2 * ddx2 + ddy2 * ddy2) || 1;
      if (dd < TORP_CATCH) { catchTorpedo(h); return; }
      var stp = Math.min(dd, TORP_BACK_V * dt);
      torp.x += ddx2 / dd * stp; torp.y += ddy2 / dd * stp;
      for (i = 0; i < list.length; i++) {
        e = list[i];
        if (torp.hitBack.indexOf(e) >= 0) continue;
        if (dist(torp.x, torp.y, e.x, e.y) < e.r + TORP_R) {
          torp.hitBack.push(e);
          damageEnemy(e, TORP_BACK_DMG, 'escudo', torp.x - ddx2 / dd * TORP_BACK_V * 0.1);
        }
      }
    }
    // el escudo-torpedo no sale del agua (y las plumas no entran)
    if (torp && torp.medio === 'agua') torp.y = Math.max(torp.y, nivel + 14);
    if (torp && torp.medio === 'agua' && Math.random() < 0.6) bubbles(torp.x, torp.y, 1, 4);
    if (torp && torp.medio === 'aire' && Math.random() < 0.5) addPart({ x: torp.x, y: torp.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.3, max: 0.3, kind: 'star', col: heroColor('peter', 'claro'), r: 2.5 });
    if (torp && torp.t > TORP_MAX_T) catchTorpedo(h, true);
  }
  function catchTorpedo(h, magia) {
    torp = null; h.catchCd = TORP_CD;
    sfx('shieldCatch');
    if (magia) stars(noseX(h), h.y, 6, heroColor('peter', 'claro'));
    else spark(noseX(h), h.y, 5, '#fde68a', 40, 120);
  }

  // ---------------------------------------------------------------------------
  //  Controles de Falcon (mecha-halcón, como vuelo.js)
  // ---------------------------------------------------------------------------
  function fireFeather(h, ang) {
    ang = ang || 0;
    feathers.push({ x: h.x + 60, y: h.y + 8, vx: Math.cos(ang) * FEATHER_V, vy: Math.sin(ang) * FEATHER_V, r: 7, life: 1.4, dmg: 1 });
    sfx('arrow');
  }
  function updateFalcon(h, dt) {
    var inp = inputOf(h), box = boxOf(h);
    if (h.dashT > 0) {
      h.dashT -= dt;
      h.x = clamp(h.x + h.dashVx * dt, box.x0, box.x1 + 60);
      h.y = clamp(h.y + h.dashVy * dt, box.y0, box.y1);
      h.tilt = lerp(h.tilt, Math.atan2(h.dashVy, h.dashVx) * 0.9, Math.min(1, dt * 14));
      addPart({ x: h.x - 46, y: h.y + rand(-14, 14), vx: -rand(200, 320), vy: 0, life: 0.25, max: 0.25, kind: 'dot', col: '#ecfccb', r: rand(2, 3.5) });
      dashHits(h);
    } else {
      var ax = 0, ay = 0;
      if (inp.held('left')) ax -= 1;
      if (inp.held('right')) ax += 1;
      if (inp.held('up')) ay -= 1;
      if (inp.held('down')) ay += 1;
      if (ax !== 0 && ay !== 0) { ax *= 0.7071; ay *= 0.7071; }
      h.vx = ax * MECHA_SPEED; h.vy = ay * MECHA_SPEED;
      h.x = clamp(h.x + h.vx * dt, box.x0, box.x1);
      h.y = clamp(h.y + h.vy * dt, box.y0, box.y1);
      h.tilt = lerp(h.tilt, ay * 0.3, Math.min(1, dt * 10));
    }
    if (inp.held('shoot') && h.shootCd <= 0) { fireFeather(h, 0); h.shootCd = FEATHER_CD; }
    if (inp.pressed('attack') && h.attackCd <= 0 && h.dashT <= 0) {
      var vy = DASH_VY;
      if (inp.held('up')) vy = -DASH_VY * 0.7;
      if (h.y > box.y1 - 30 && !inp.held('up')) vy = 0;
      h.dashT = DASH_TIME; h.dashVx = DASH_VX; h.dashVy = vy; h.dashHits = []; h.attackCd = DASH_CD;
      sfx('boost'); sfx('sword'); shake = Math.max(shake, 2);
    }
    mechaTrail(h);
  }
  function dashHits(h) {
    var r = falconRect(h);
    r.x -= 8; r.y -= 8; r.w += 22; r.h += 16;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead || e.gone || e.medio !== 'aire' || h.dashHits.indexOf(e) >= 0) continue;
      if (e.type === 'estalactita' && e.state === 'aviso') continue;
      if (circleHitsRect(e.x, e.y, e.r, r)) {
        h.dashHits.push(e);
        damageEnemy(e, DASH_DMG, 'embestida', h.x);
        sfx('punch');
      }
    }
  }
  // Falcon IA (1 jugador): invulnerable; dispara plumas a los enemigos de aire.
  function updateFalconAI(h, dt) {
    var tx, ty;
    if (phase === 'agua') {
      tx = clamp(peter.x + 30, 110, 600);
      ty = 108 + Math.sin(t * 1.7) * 34;
    } else {
      h.aiSideT -= dt;
      if (h.aiSideT <= 0) { h.aiSideT = 3; h.aiSide = peter.y > 260 ? -1 : 1; }
      tx = clamp(peter.x - 70, 60, W - 200);
      ty = clamp(peter.y + h.aiSide * 120 + Math.sin(t * 2.2) * 10, 60, 480);
    }
    var tg = aiTarget(h);
    if (tg && phase === 'agua') ty = clamp(lerp(ty, tg.y, 0.6), AIR_BOX.y0, AIR_BOX.y1);
    if (phase === 'agua') {
      // con la pista arriba (1 jugador), Falcon se queda a su izquierda para que se le vea
      if (hint && hintArriba()) tx = Math.min(tx, 205);
      // arriba a la izquierda están los corazones y los iconos de Peter: no pasar por detrás
      // (las alas del mecha-halcón suben ≈ 50 px sobre su centro; los iconos acaban en y≈75)
      if (Math.min(tx, h.x) < 320) ty = Math.max(ty, 125);
    }
    var dx = tx - h.x, dy = ty - h.y, d = Math.sqrt(dx * dx + dy * dy);
    var sp = Math.min(320, d * 4);
    if (d > 1) { h.x += dx / d * sp * dt; h.y += dy / d * sp * dt; }
    h.tilt = lerp(h.tilt, clamp(dy / 300, -0.25, 0.25), Math.min(1, dt * 6));
    if (h.shootCd <= 0) {
      if (tg) {
        fireFeather(h, clamp(Math.atan2(tg.y - (h.y + 8), tg.x - (h.x + 60)), -0.6, 0.6));
        h.shootCd = AI_FEATHER_CD;
      } else h.shootCd = 0.15;
    }
    mechaTrail(h);
  }
  function aiTarget(h) {
    var best = null, bd = 640;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead || e.gone || e.medio !== 'aire' || e.x < h.x + 20 || e.x > W - 10) continue;
      if (e.type === 'estalactita' && e.state === 'aviso') continue;
      if (Math.abs(e.y - h.y) > 220) continue;
      var d = dist(h.x, h.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  //  Enemigos: daño y comportamiento
  // ---------------------------------------------------------------------------
  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    var enAgua = e.medio === 'agua' && underwater();
    if (e.type === 'mina') {
      pop(e.x, e.y, false, enAgua);
      addText('¡Pum!', e.x, e.y - 24, '#fde68a', 0.7, 16);
    } else if (e.type === 'estalactita') {
      spark(e.x, e.y, 10, '#cbd5e1', 60, 200);
      addText('¡Crac!', e.x, e.y - 20, '#e2e8f0', 0.6, 15);
    } else {
      pop(e.x, e.y, e.type === 'rayo' || e.type === 'escupe', enAgua);
      sfx('explosion');
      maybeHeart(e.x, e.y, e.medio);
    }
  }
  function damageEnemy(e, dmg, kind, fromX) {
    if (!e || e.dead) return;
    if (e.type === 'mina' || e.type === 'estalactita') { killEnemy(e); sfx('clink'); return; }
    e.hp -= dmg;
    e.flash = 0.12;
    spark(e.x, e.y, 4, '#fef08a', 40, 120);
    if (kind === 'escudo') e.stun = Math.max(e.stun, 0.5);
    if (e.hp <= 0) killEnemy(e);
  }
  // Escudo de Peter: ¿para lo que viene desde (fx, fy) y toca el círculo del escudo?
  function shieldBlocks(fx, fy, r) {
    if (!peter || peter.ko || !peter.shield) return false;
    if (fx < peter.x - 6) return false;               // solo lo que llega de frente
    var s = shieldCenter(peter);
    return dist(fx, fy, s.x, s.y) < SHIELD_R + (r || 0);
  }
  function contactHeroes(e) {
    for (var j = 0; j < heroes.length; j++) {
      var h = heroes[j];
      if (h.ko) continue;
      if (h === peter && shieldBlocks(e.x, e.y, e.r * 0.8)) {
        shieldPush(e);
        return;
      }
      if (circleHitsRect(e.x, e.y, e.r * 0.8, heroRect(h))) {
        if (h.dashT > 0) continue;
        if (h.isAI) { if (h.bump <= 0) h.bump = 0.4; continue; }
        if (h.invuln > 0) continue;
        if (e.type === 'mina') { hurt(h, 1, e.x); killEnemy(e); sfx('explosion'); return; }
        if (e.type === 'estalactita') { hurt(h, 1, e.x); killEnemy(e); return; }
        hurt(h, 1, e.x);
      }
    }
  }
  function shieldPush(e) {
    if (e.type === 'mina' || e.type === 'estalactita') { killEnemy(e); sfx('shieldBlock'); return; }
    if (e.blockT > 0) return;
    e.blockT = 0.4;
    e.x += 24; e.stun = Math.max(e.stun, 0.6);
    if (e.state === 'dive') e.state = e.group ? 'return' : 'form';
    sfx('shieldBlock');
    spark(shieldCenter(peter).x + 10, e.y, 6, '#fde68a', 60, 160);
    addText('¡CLANC!', e.x, e.y - 26, '#fde68a', 0.6, 16);
  }

  function updateGroup(g, dt) {
    g.t += dt;
    g.x -= (g.low ? 120 : 105) * dt;
    if (g.kind !== 'serpiente') g.y = g.baseY + Math.sin(g.t * 0.9) * 28 * g.amp;
    for (var i = g.members.length - 1; i >= 0; i--) if (g.members[i].dead || g.members[i].gone) g.members.splice(i, 1);
    placeSwarm(g);
    g.diveT -= dt;
    if (g.diveT <= 0) {
      g.diveT = 2.4;
      var cand = [];
      for (var k = 0; k < g.members.length; k++) {
        var e = g.members[k];
        if (e.state === 'form' && e.x > 240 && e.x < 900) cand.push(e);
      }
      if (cand.length && players().length) {
        var c = cand[Math.floor(Math.random() * cand.length)];
        c.state = 'warn'; c.st = 0.8;
      }
    }
    return g.members.length > 0 && g.x > -260;
  }

  function updateEnemy(e, dt) {
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.blockT > 0) e.blockT -= dt;
    var stunned = e.stun > 0;
    if (stunned) e.stun -= dt;
    var tgt, a;
    if (e.type === 'pez') {
      if (!stunned) e.x += e.vx * dt;
      e.y = clamp(e.baseY + Math.sin(e.ph + e.t * 3) * e.amp, nivel + 26, H - 34);
      if (e.x < -60) e.gone = true;
    } else if (e.type === 'escupe') {
      if (e.state === 'ir') {
        e.x -= 200 * dt;
        if (e.x <= e.hoverX) { e.state = 'flota'; }
      } else if (e.state === 'flota' || e.state === 'aviso') {
        tgt = nearestHero(e.x, e.y, 'agua');
        if (tgt && !stunned) e.y += clamp(tgt.y - e.y, -50 * dt, 50 * dt);
        e.y = clamp(e.y, nivel + 40, H - 50);
        e.x = e.hoverX + Math.sin(e.t * 1.3) * 10;
        if (!stunned) e.fireT -= dt;
        if (e.state === 'flota' && e.fireT <= 0) { e.state = 'aviso'; e.st = 0.85; sfx('robot'); }
        if (e.state === 'aviso') {
          e.st -= dt;
          if (e.st <= 0) {
            var ty = tgt ? tgt.y : e.y, txx = tgt ? tgt.x : 0;
            a = Math.atan2(ty - e.y, txx - (e.x - 30));
            eshots.push({ x: e.x - 30, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 10, life: 6, kind: 'burbuja', medio: 'agua' });
            sfx('laser');
            e.shots++; e.fireT = 2.6; e.state = e.shots >= 3 ? 'vete' : 'flota';
          }
        }
      } else if (e.state === 'vete') {
        e.x -= 230 * dt;
        if (e.x < -60) e.gone = true;
      }
    } else if (e.type === 'mina') {
      e.x -= WATER_V * dt;
      e.y = e.baseY + Math.sin(e.t * 1.8 + e.ph) * 6;
      if (e.x < -40) e.gone = true;
    } else if (e.type === 'estalactita') {
      e.x -= WATER_V * dt;
      if (e.state === 'aviso') {
        e.st -= dt;
        if (e.st <= 0) { e.state = 'cae'; e.vy = 60; sfx('rumble'); }
      } else if (e.state === 'cae') {
        e.vy = Math.min(720, e.vy + 1100 * dt);
        e.y += e.vy * dt;
        if (e.y >= nivel) { e.medio = 'agua'; e.state = 'hunde'; e.vy = 150; splash(e.x, false); }
      } else if (e.state === 'hunde') {
        e.y += e.vy * dt;
        if (e.y > H + 40) e.gone = true;
      }
      if (e.x < -40) e.gone = true;
    } else if (e.type === 'enjambre') {
      if (e.state === 'form') {
        if (e.group) { e.x = e.sx; e.y = e.sy; } else e.x -= 105 * dt;
      } else if (e.state === 'warn') {
        if (e.group) { e.x = e.sx; e.y = e.sy; }
        e.st -= dt;
        if (e.st <= 0) {
          tgt = nearestHero(e.x, e.y, 'aire');
          a = tgt ? Math.atan2(tgt.y - e.y, tgt.x - e.x) : Math.PI;
          e.vx = Math.cos(a) * 280; e.vy = Math.sin(a) * 280;
          e.state = 'dive'; e.st = 1.1;
          sfx('robot');
        }
      } else if (e.state === 'dive') {
        if (!stunned) { e.x += e.vx * dt; e.y += e.vy * dt; }
        if (e.group && e.group.low) e.y = Math.min(e.y, 186);
        e.st -= dt;
        if (e.st <= 0) e.state = e.group ? 'return' : 'form';
      } else if (e.state === 'return') {
        var dx = e.sx - e.x, dy = e.sy - e.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 8 || !e.group) e.state = 'form';
        else { e.x += dx / d * 300 * dt; e.y += dy / d * 300 * dt; }
      }
      if (e.x < -80 || e.y < -80 || e.y > H + 80) e.gone = true;
    } else if (e.type === 'rayo') {
      if (stunned) { e.y += Math.sin(t * 9) * 10 * dt; return; }
      e.life -= dt;
      if (e.state === 'enter') {
        e.x -= 170 * dt;
        if (e.x <= e.targetX) { e.x = e.targetX; e.state = 'hover'; }
      } else if (e.state === 'hover') {
        tgt = nearestHero(e.x, e.y, 'aire');
        if (tgt) e.y += clamp(clamp(tgt.y, 70, H - 70) - e.y, -60 * dt, 60 * dt);
        e.x = e.targetX + Math.sin(t * 1.3 + e.ph) * 12;
        e.fireT -= dt;
        if (e.life <= 0) e.state = 'leave';
        else if (e.fireT <= 0 && tgt) { e.state = 'charge'; e.st = 1.0; e.beamY = e.y + 12; sfx('robot'); }
      } else if (e.state === 'charge') {
        e.st -= dt;
        if (e.st <= 0) {
          e.state = 'beam'; e.st = 0.4;
          beams.push({ x1: e.x - 25, y: e.beamY, half: 15, life: 0.4, max: 0.4, cut: null, hits: [] });
          sfx('laser'); shake = Math.max(shake, 2);
        }
      } else if (e.state === 'beam') {
        e.st -= dt;
        if (e.st <= 0) { e.state = 'hover'; e.fireT = 3.0; }
      } else if (e.state === 'leave') {
        e.x += 150 * dt;
        if (e.x > W + 60) e.gone = true;
      }
    } else if (e.type === 'picado') {
      if (e.state === 'cruise') {
        e.x += e.vx * dt; e.y += Math.sin(t * 3 + e.ph) * 20 * dt;
        e.angle = Math.PI;
        if (e.dives < 2) {
          var ps = players();
          if (!ps.length && falcon && !falcon.ko) ps = [falcon];
          for (var i = 0; i < ps.length; i++) {
            var ddx = e.x - ps[i].x;
            if (ddx > 40 && ddx < 360 && ps[i].y > e.y + 70 && e.x < W - 20) { e.state = 'warn'; e.st = 0.8; e.tgt = ps[i]; break; }
          }
        }
        if (e.x < -60) e.gone = true;
      } else if (e.state === 'warn') {
        e.st -= dt;
        if (e.tgt) e.angle = Math.atan2(e.tgt.y - e.y, e.tgt.x - e.x);
        if (e.st <= 0) {
          var tx2 = e.tgt ? e.tgt.x : e.x - 100, ty2 = e.tgt ? e.tgt.y : H;
          var an = Math.atan2(ty2 - e.y, tx2 - e.x);
          e.vx = Math.cos(an) * 360; e.vy = Math.sin(an) * 360;
          e.angle = an; e.state = 'dive'; e.st = dist(e.x, e.y, tx2, ty2) / 360 + 0.35;
          e.dives++;
          sfx('boost');
        }
      } else if (e.state === 'dive') {
        if (!stunned) { e.x += e.vx * dt; e.y += e.vy * dt; }
        e.st -= dt;
        if (e.st <= 0 || e.y > H - 30) e.state = 'rise';
      } else if (e.state === 'rise') {
        e.x -= 60 * dt; e.y -= 220 * dt;
        e.angle = lerp(e.angle, -Math.PI / 2, Math.min(1, dt * 5));
        if (e.y <= 110) { e.y = 110; e.state = 'cruise'; e.vx = -125; }
      }
      if (e.x < -70 || e.y > H + 70) e.gone = true;
    } else if (e.type === 'miniRobot') {
      e.life -= dt;
      if (e.state === 'entra') {
        e.x += e.vx * dt;
        if (e.x < W - 120) e.state = 'persigue';
      } else if (e.state === 'persigue') {
        tgt = nearestHero(e.x, e.y, 'aire');
        if (tgt && !stunned) {
          var want = Math.atan2(tgt.y - e.y, tgt.x - e.x);
          var cur = Math.atan2(e.vy, e.vx);
          var dd = want - cur;
          while (dd > Math.PI) dd -= 6.2832;
          while (dd < -Math.PI) dd += 6.2832;
          cur += clamp(dd, -2.2 * dt, 2.2 * dt);
          e.vx = Math.cos(cur) * 110; e.vy = Math.sin(cur) * 110;
        }
        if (!stunned) { e.x += (e.vx - 40) * dt; e.y += e.vy * dt; }
        e.facing = e.vx < 0 ? -1 : 1;
        if (e.life <= 0) e.state = 'vete';
        if (Math.random() < 0.004) sfx('miniRobot');
      } else {
        e.x -= 220 * dt; e.y -= 60 * dt;
        if (e.x < -60 || e.y < -60) e.gone = true;
      }
      e.y = clamp(e.y, 30, H - 30);
    }
    if (!e.dead && !e.gone && !(e.type === 'estalactita' && e.state === 'aviso')) contactHeroes(e);
  }

  // ---------------------------------------------------------------------------
  //  Proyectiles
  // ---------------------------------------------------------------------------
  function updateFeathers(dt) {
    for (var i = feathers.length - 1; i >= 0; i--) {
      var s = feathers[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      var hit = false;
      if (underwater() && s.y > nivel - 4) {           // las plumas no entran en el agua
        hit = true; addPart({ x: s.x, y: nivel, vx: 0, vy: -40, life: 0.3, max: 0.3, kind: 'bubble', col: '#e0f2fe', r: 3 });
      }
      for (var j = 0; j < enemies.length && !hit; j++) {
        var e = enemies[j];
        if (e.dead || e.gone || e.medio !== 'aire') continue;
        if (e.type === 'estalactita' && e.state === 'aviso') continue;
        if (dist(s.x, s.y, e.x, e.y) < e.r + s.r) { damageEnemy(e, s.dmg, 'plumas', s.x - s.vx * 0.1); hit = true; }
      }
      if (hit || s.life <= 0 || s.x > W + 40 || s.x < -40 || s.y < -40 || s.y > H + 40) feathers.splice(i, 1);
    }
  }
  function updateEnemyShots(dt) {
    for (var i = eshots.length - 1; i >= 0; i--) {
      var s = eshots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      var hit = false;
      if (shieldBlocks(s.x - s.vx * 0.1, s.y, s.r)) {
        hit = true; sfx('shieldBlock');
        spark(s.x, s.y, 6, '#fde68a', 60, 160);
        if (s.kind === 'burbuja') bubbles(s.x, s.y, 4, 6);
      }
      for (var j = 0; j < heroes.length && !hit; j++) {
        var h = heroes[j];
        if (h.ko) continue;
        if (circleHitsRect(s.x, s.y, s.r * 0.8, heroRect(h))) {
          if (h.isAI) { h.bump = 0.4; hit = true; break; }
          if (h.invuln > 0 || h.dashT > 0) continue;
          hurt(h, 1, s.x - s.vx * 0.1); hit = true;
        }
      }
      if (s.kind === 'burbuja' && underwater() && s.y < nivel + 8) hit = true;
      if (hit || s.life <= 0 || s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) eshots.splice(i, 1);
    }
  }
  // Rayos: el escudo de Peter los CORTA (lo que está detrás no recibe daño).
  function updateBeams(dt) {
    for (var i = beams.length - 1; i >= 0; i--) {
      var b = beams[i];
      b.life -= dt;
      b.cut = null;
      if (peter && !peter.ko && peter.shield && peter.x < b.x1 && Math.abs(peter.y - b.y) < b.half + 34) {
        b.cut = shieldCenter(peter).x + 8;
        if (Math.random() < 0.5) spark(b.cut, b.y, 2, '#fde68a', 60, 160);
        if (!b.blocked) { b.blocked = true; sfx('shieldBlock'); }
      }
      for (var j = 0; j < heroes.length; j++) {
        var h = heroes[j];
        if (h.ko) continue;
        var r = heroRect(h);
        if (!(r.x < b.x1 && r.y < b.y + b.half && r.y + r.h > b.y - b.half)) continue;
        if (b.cut !== null && r.x + r.w < b.cut + 4) {
          // protegido por Peter
          if (h !== peter && b.hits.indexOf(h) < 0 && thanksT <= 0) {
            b.hits.push(h); thanksT = 2;
            stars(h.x, h.y - 20, 8, '#fde047');
            addText(h.isAI ? '¡Gracias, Peter!' : '¡Gracias, Peter! — Falcon', h.x, h.y - 46, '#fde047', 0.9, 17);
          }
          continue;
        }
        if (b.cut !== null && h === peter) continue;
        if (h.isAI) { if (h.bump <= 0) h.bump = 0.4; continue; }
        hurt(h, 1, b.x1);
      }
      if (b.life <= 0) beams.splice(i, 1);
    }
  }
  function collectPickups() {
    if (!pickups.length) return;
    for (var i = 0; i < pickups.length; i++) stars(pickups[i].x, pickups[i].y, 6, '#fda4af');
    for (var j = 0; j < heroes.length; j++) {
      var h = heroes[j];
      if (!h || h.isAI) continue;
      heal(h, 2);
      addText('+1 ♥', h.x, h.y - 40, '#fda4af', 1.0, 18);
    }
    sfx('pickup');
    pickups = [];
  }
  function updatePickups(dt) {
    for (var i = pickups.length - 1; i >= 0; i--) {
      var p = pickups[i];
      p.t += dt; p.x += p.vx * dt;
      if (p.cae) {
        // cae desde el aire hasta el río; al tocar el agua, salpicón y burbuja
        p.vy = Math.min(420, p.vy + 700 * dt); p.y += p.vy * dt;
        if (p.y >= nivel + 40 || !underwater()) {
          p.cae = false; p.burbuja = true; p.y = Math.max(p.y, nivel + 40);
          if (underwater()) { splash(p.x, false); bubbles(p.x, nivel + 20, 6, 10); addText('¡Plof!', p.x, nivel - 14, '#bae6fd', 0.7, 14); }
        }
      } else p.y += Math.sin(p.t * 3) * 14 * dt;
      if (p.medio === 'agua' && underwater() && !p.cae) p.y = Math.max(p.y, nivel + 24);
      var taken = false;
      for (var j = 0; j < heroes.length; j++) {
        var h = heroes[j];
        if (h.ko || h.isAI) continue;
        if (dist(h.x, h.y, p.x, p.y) < 40) {
          heal(h, 2);
          sfx('pickup'); stars(p.x, p.y, 8, '#fda4af');
          if (p.burbuja) bubbles(p.x, p.y, 8, 10);
          addText('+1 ♥', p.x, p.y - 20, '#fda4af', 0.8, 16);
          taken = true; break;
        }
      }
      if (taken || p.x < -40 || p.t > 16) pickups.splice(i, 1);
    }
  }
  function updateEffects(dt) {
    var i, slow = (phase === 'despegue' && despT() >= 2.0 && despT() < 2.8) ? 0.35 : 1;
    var edt = dt * slow;
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx * edt; p.y += p.vy * edt;
      if (p.grav) p.vy += p.grav * edt;
      else if (p.kind === 'bubble') { p.vx *= 0.97; p.vy -= 30 * edt; }
      else { p.vx *= 0.96; p.vy *= 0.96; }
      if (p.kind === 'bubble' && underwater() && p.y < nivel) p.life = 0;
      p.life -= edt;
      if (p.life <= 0) parts.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].life -= dt; texts[i].y -= 28 * dt; if (texts[i].life <= 0) texts.splice(i, 1); }
    for (i = pops.length - 1; i >= 0; i--) { pops[i].life -= edt; if (pops[i].life <= 0) pops.splice(i, 1); }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].life -= edt; if (rings[i].life <= 0) rings.splice(i, 1); }
    for (i = splashes.length - 1; i >= 0; i--) { splashes[i].life -= edt; if (splashes[i].life <= 0) splashes.splice(i, 1); }
    for (i = currents.length - 1; i >= 0; i--) { currents[i].x -= WATER_V * dt; currents[i].ph += dt; if (currents[i].x + currents[i].w < -20) currents.splice(i, 1); }
    if (hint) { hint.life -= dt; if (hint.life <= 0) hint = null; }
    if (banner) { banner.life -= dt; if (banner.life <= 0) banner = null; }
    if (shake > 0) shake = Math.max(0, shake - dt * 22);
    if (flash > 0) flash -= dt;
    if (thanksT > 0) thanksT -= dt;
    for (i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (h.sayT > 0) h.sayT -= dt;
    }
  }

  // ---------------------------------------------------------------------------
  //  Puntos de control
  // ---------------------------------------------------------------------------
  function checkpoints() {
    for (var c = 0; c < CHECKPOINTS.length; c++) {
      if (!cpDone[c] && rt >= CHECKPOINTS[c]) {
        cpDone[c] = true; lastCP = CHECKPOINTS[c];
        sfx('checkpoint');
        addText('¡Punto de control!', W / 2, 150, '#86efac', 1.6, 24);
      }
    }
  }

  // ---------------------------------------------------------------------------
  //  TRAMO B: ¡sale y despega! (guionizado, 46–52 s)
  // ---------------------------------------------------------------------------
  function despT() { return rt - DESPEGUE_AT; }
  function startDespegue() {
    phase = 'despegue';
    despStarted = true; despFx = {};
    torp = null;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.dead && !e.gone && e.x > -20 && e.x < W + 20) { e.dead = true; pop(e.x, e.y, false, e.medio === 'agua'); }
    }
    enemies = []; groups = []; eshots = []; beams = []; feathers = []; currents = [];
    collectPickups();
    peter.shield = false; peter.shieldAnim = 0; peter.vx = 0; peter.vy = 0;
    for (var k = 0; k < heroes.length; k++) { heroes[k].ko = false; heroes[k].dashT = 0; }
    if (coop && G.state) { if ((G.state.hp || 0) <= 0) G.state.hp = KO_RESPAWN_HP; if ((G.state.hp2 || 0) <= 0) G.state.hp2 = KO_RESPAWN_HP; }
    say(peter, '¡Subo a la superficie!', 1.4);
    sfx('boost');
  }
  function updateDespegue(dt) {
    if (!despStarted) startDespegue();
    var d0 = despT();
    rt += dt;
    var d = despT(), u;
    // --- Peter ---
    if (d < 1.4) {
      peter.x = lerp(peter.x, 300, Math.min(1, dt * 3));
      peter.y = lerp(peter.y, 236, Math.min(1, dt * 3.2));
      peter.tilt = lerp(peter.tilt, -0.35, Math.min(1, dt * 4));
      if (Math.random() < 0.9) bubbles(peter.x - 40, peter.y + 10, 2, 8);
      shake = Math.max(shake, 1.2 * (d / 1.4));
      if (d0 < 0.9 && d >= 0.9) { addText('¡Sube, Peter!', 300, 300, heroColor('peter', 'claro'), 1.0, 22); }
    } else if (d < 2.0) {
      if (d0 < 1.4) {
        splash(300, true); shake = 9; flash = 0.12; flashCol = '#e0f2fe';
        banner = { txt: '¡SALE Y DESPEGA!', sub: '', life: 2.2, max: 2.2, big: true };
        rings.push({ x: 300, y: nivel, life: 0.8, max: 0.8, r0: 20, r1: 220, col: '#e0f2fe', flat: true });
      }
      u = (d - 1.4) / 0.6;
      peter.x = 300 + 40 * easeOut(u);
      peter.y = 236 + (132 - 236) * easeOut(u);
      peter.tilt = -0.7 * (1 - easeOut(u));
      if (Math.random() < 0.9) droplets(peter.x - 20, peter.y + 20, 1, 200);
    } else if (d < 2.8) {
      u = (d - 2.0) / 0.8;
      peter.x = 340;
      peter.y = 132 - 12 * Math.sin(Math.PI * u);
      // voltereta completa a cámara lenta (gira sobre sí mismo y crece)
      peter.tilt = -easeInOut(u) * Math.PI * 2;
      peter.roll = 1;
      peter.scaleMul = 1 + 0.7 * Math.sin(Math.PI * u);
      if (d0 < 2.4 && d >= 2.4) {
        peter.modo = 'nave';
        flash = 0.35; flashCol = '#ffffff'; shake = 8;
        sfx('transform');
        rings.push({ x: peter.x, y: peter.y, life: 0.7, max: 0.7, r0: 30, r1: 260, col: '#fde047' });
        rings.push({ x: peter.x, y: peter.y, life: 0.9, max: 0.9, r0: 10, r1: 180, col: heroColor('peter', 'claro') });
        stars(peter.x, peter.y, 26, '#fde047');
        addText('¡Modo nave!', peter.x, peter.y + 96, '#fde047', 1.6, 34);
      }
      if (Math.random() < 0.5) droplets(peter.x + rand(-30, 30), peter.y + 10, 1, 120);
    } else {
      peter.roll = 1; peter.scaleMul = lerp(peter.scaleMul, 1, Math.min(1, dt * 4));
      if (d0 < 2.8) { sfx('boost'); shake = 5; despFx.jet = true; }
      if (d < 3.6) {
        u = (d - 2.8) / 0.8;
        peter.x = 340 + 260 * easeOut(u);
        peter.y = 132 + 50 * easeInOut(u);
        peter.tilt = -0.12;
      } else {
        peter.x = lerp(peter.x, 300, Math.min(1, dt * 1.8));
        peter.y = lerp(peter.y, 290, Math.min(1, dt * 1.8));
        peter.tilt = lerp(peter.tilt, 0, Math.min(1, dt * 3));
      }
      naveTrail(peter); naveTrail(peter);
      if (Math.random() < 0.9) addPart({ x: rand(W * 0.2, W + 40), y: rand(30, H - 30), vx: -1100, vy: 0, life: 0.22, max: 0.22, kind: 'line', col: '#ffffff', r: 2 });
    }
    // --- nivel del agua: la cueva queda abajo ---
    if (d < 2.8) nivel = NIVEL_AGUA;
    else nivel = NIVEL_AGUA + (H + 120 - NIVEL_AGUA) * easeIn((d - 2.8) / 1.8);
    // --- Falcon: lo acompaña y hace un tirabuzón de alegría ---
    if (d < 2.8) {
      // espera arriba a la derecha (lejos de la columna de agua y de la voltereta)
      falcon.x = lerp(falcon.x, 740, Math.min(1, dt * 2)); falcon.y = lerp(falcon.y, 120, Math.min(1, dt * 2));
      falcon.tilt = lerp(falcon.tilt, 0, Math.min(1, dt * 4));
    } else if (d < 4.4) {
      // tirabuzón alto y a la derecha: empieza abajo y está arriba del todo
      // cuando la nave pasa por debajo (d ≈ 3,6), así no se amontonan.
      u = (d - 2.8) / 1.6;
      var la = Math.PI / 2 - u * Math.PI * 2;
      var cx = 740 - 60 * u, cy = 76;
      falcon.x = cx + Math.cos(la) * 44; falcon.y = cy + Math.sin(la) * 44;
      falcon.tilt = la - Math.PI / 2 + Math.PI;
      if (d0 < 3.2 && d >= 3.2) say(falcon, '¡Bien hecho, Peter! ¡Al cielo!', 1.8);
    } else {
      falcon.x = lerp(falcon.x, 160, Math.min(1, dt * 2)); falcon.y = lerp(falcon.y, 170, Math.min(1, dt * 2));
      falcon.tilt = lerp(falcon.tilt, 0, Math.min(1, dt * 4));
    }
    mechaTrail(falcon);
    if (d0 < 4.6 && d >= 4.6) {
      banner = { txt: '¡A VOLAR!', sub: '¡Hacia la salida de la cueva!', life: 1.6, max: 1.6, big: true };
      sfx('select');
    }
    if (rt >= VUELO_AT) {
      phase = 'vuelo';
      peter.modo = 'nave'; peter.roll = 1; peter.scaleMul = 1; nivel = H + 200;
      peter.vx = 0; peter.vy = 0;
    }
  }

  // ---------------------------------------------------------------------------
  //  FINAL (98 s): el Dron Nodriza tapa la salida
  // ---------------------------------------------------------------------------
  function startFinal() {
    phase = 'final'; finalT = 0; torp = null;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.dead && !e.gone && e.x > -20 && e.x < W + 20) pop(e.x, e.y, false, false);
    }
    enemies = []; groups = []; eshots = []; beams = []; feathers = [];
    for (var k = 0; k < heroes.length; k++) {
      var h = heroes[k];
      if (h.ko) { h.ko = false; h.koT = 0; h.x = 120; h.y = 300; if (G.state && !h.isAI) G.state[h.hpKey] = Math.max(G.state[h.hpKey] || 0, KO_RESPAWN_HP); }
      h.shield = false; h.dashT = 0; h.invuln = 0;
    }
    collectPickups();
    nodriza = { x: 1180, y: -160, tx: 735, ty: 250 };
    hint = null; banner = null;
    sfx('roar');
  }
  function updateFinal(dt) {
    finalT += dt;
    if (nodriza) {
      var k = Math.min(1, dt * 3.2);
      nodriza.x = lerp(nodriza.x, nodriza.tx, k);
      nodriza.y = lerp(nodriza.y, nodriza.ty + Math.sin(t * 1.6) * 8, k);
    }
    if (finalT >= 0.6 && finalT - dt < 0.6) { shake = 9; flash = 0.15; flashCol = '#fecaca'; sfx('explosion'); }
    peter.x = lerp(peter.x, 300, Math.min(1, dt * 2)); peter.y = lerp(peter.y, 400, Math.min(1, dt * 2));
    peter.tilt = lerp(peter.tilt, 0, Math.min(1, dt * 4));
    falcon.x = lerp(falcon.x, 250, Math.min(1, dt * 2)); falcon.y = lerp(falcon.y, 285, Math.min(1, dt * 2));
    falcon.tilt = lerp(falcon.tilt, 0, Math.min(1, dt * 4));
    naveTrail(peter); mechaTrail(falcon);
    if (finalT >= 1.4 && finalT - dt < 1.4) { say(peter, '¡Falcon, juntos!', 1.4); }
    if (finalT >= 2.0 && finalT - dt < 2.0) { say(falcon, '¡Vamos, Peter!', 1.2); sfx('select'); }
    if (finalT >= FINAL_GO && !endGo) {
      endGo = true;
      if (G.scenes.levelP3_3f) G.go('levelP3_3f', { nuevo: true });
      else if (G.scenes.levelDoneP3) G.go('levelDoneP3', { chapter: 3 });   // CONTRATO: respaldo si falta la fusión
      else G.go('title');
    }
  }

  // ---------------------------------------------------------------------------
  //  Paso de la escena
  // ---------------------------------------------------------------------------
  function updateHeroTimers(dt) {
    for (var i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (h.invuln > 0) h.invuln = Math.max(0, h.invuln - dt);
      if (h.bump > 0) h.bump -= dt;
      if (h.shootCd > 0) h.shootCd -= dt;
      if (h.attackCd > 0) h.attackCd = Math.max(0, h.attackCd - dt);
      if (h.catchCd > 0) h.catchCd -= dt;
      if (h.throwT > 0) h.throwT -= dt;
      if (h.ko && (phase === 'agua' || phase === 'vuelo')) { h.koT -= dt; if (h.koT <= 0) respawn(h); }
    }
  }
  function updateScene(dt) {
    t += dt;
    updateEffects(dt);
    updateHeroTimers(dt);
    if (phase === 'intro') { updateIntro(dt); return; }
    if (phase === 'lose') {
      loseT += dt;
      for (var l = 0; l < heroes.length; l++) {
        var hl = heroes[l];
        if (!hl.loser) continue;
        hl.tilt += dt * 4; hl.y += 60 * dt;
        if (Math.random() < 0.5) {
          if (heroMedio(hl) === 'agua') bubbles(hl.x, hl.y, 1, 10);
          else addPart({ x: hl.x + rand(-20, 20), y: hl.y, vx: rand(-30, 30), vy: rand(-90, -40), life: 0.8, max: 0.8, kind: 'smoke', col: '#64748b', r: rand(6, 10) });
        }
      }
      if (loseT > 1.4 && !endGo) { endGo = true; G.go('gameover', { retry: 'levelP3_3' }); }
      return;
    }
    if (phase === 'despegue') { updateDespegue(dt); return; }
    if (phase === 'final') { updateFinal(dt); return; }

    // --- agua / vuelo ---
    rt += dt;
    checkpoints();
    runScript();
    if (phase === 'agua' && rt >= DESPEGUE_AT) { startDespegue(); return; }
    if (phase === 'vuelo' && rt >= FINAL_AT) { startFinal(); return; }
    for (var i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (h.ko) continue;
      if (h.kind === 'peter') updatePeter(h, dt);
      else if (h.isAI) updateFalconAI(h, dt);
      else updateFalcon(h, dt);
    }
    if (phase === 'lose') return;
    for (i = groups.length - 1; i >= 0; i--) if (!updateGroup(groups[i], dt)) groups.splice(i, 1);
    for (i = 0; i < enemies.length; i++) if (!enemies[i].dead && !enemies[i].gone) updateEnemy(enemies[i], dt);
    for (i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead || enemies[i].gone) enemies.splice(i, 1);
    updateTorpedo(dt);
    updateFeathers(dt);
    updateEnemyShots(dt);
    updateBeams(dt);
    updatePickups(dt);
  }

  // ---------------------------------------------------------------------------
  //  Para los bots (§11.3, §18.2 P3-13)
  // ---------------------------------------------------------------------------
  function route() {
    var out = [], f = peter ? noseX(peter) : 260;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead || e.gone) continue;
      out.push({ x: Math.round(e.x - e.r - f), y: Math.round(e.y), tipo: e.type, medio: e.medio, peligro: true });
    }
    for (i = 0; i < eshots.length; i++) out.push({ x: Math.round(eshots[i].x - f), y: Math.round(eshots[i].y), tipo: 'burbuja', medio: 'agua', peligro: true });
    for (i = 0; i < beams.length; i++) out.push({ x: Math.round(beams[i].x1 - f), y: Math.round(beams[i].y), tipo: 'rayo', medio: 'aire', peligro: true });
    for (i = 0; i < pickups.length; i++) out.push({ x: Math.round(pickups[i].x - f), y: Math.round(pickups[i].y), tipo: 'corazon', medio: pickups[i].medio, peligro: false });
    for (i = 0; i < currents.length; i++) out.push({ x: Math.round(currents[i].x - f), y: Math.round((currents[i].y0 + currents[i].y1) / 2), tipo: 'corriente', medio: 'agua', peligro: false });
    out.sort(function (a, b) { return a.x - b.x; });
    return out;
  }
  function heroesInfo() {
    if (!peter) return [];
    return heroes.map(function (h) {
      var b = boxOf(h);
      return { x: h.x, y: h.y, vx: h.vx, vy: h.vy, jugador: h.jugador, isAI: h.isAI, ko: h.ko,
        heroe: h.kind, vehiculo: h.kind === 'peter' ? (h.modo === 'nave' ? 'nave' : 'submarino') : 'mechaHalcon',
        medio: heroMedio(h), hp: (!h.isAI && G.state) ? G.state[h.hpKey] : null, invuln: h.invuln,
        escudo: !!h.shield, torpedo: h.kind === 'peter' ? !!torp : false,
        zona: { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 } };
    });
  }

  // ---------------------------------------------------------------------------
  //  ESCENA
  // ---------------------------------------------------------------------------
  G.scenes.levelP3_3 = {
    enter: function (params) {
      try { resetAll(params); } catch (e) { if (window.console) console.warn('[rio] enter', e); }
      music('river');
    },
    exit: function () {
      enemies = []; groups = []; eshots = []; beams = []; feathers = []; torp = null;
      pickups = []; currents = []; parts = []; texts = []; rings = []; pops = []; splashes = [];
    },
    update: function (dt) {
      try { updateScene(dt); } catch (e) { if (window.console) console.warn('[rio] update', e); }
    },
    render: function (ctx) {
      var depth = 0;
      try { ctx.save(); depth = 1; renderScene(ctx); ctx.restore(); depth = 0; }
      catch (e) {
        if (depth) { try { ctx.restore(); } catch (e2) { /* nada */ } }
        if (window.console) console.warn('[rio] render', e);
      }
    },
    touchExtra: function () { return { vertical: true, ocultar: ['hack', 'jump'] }; },   // aquí no se salta ni se hackea (P3-8b)
    __debug: {
      phase: function () { return phase; },
      route: function () { try { return route(); } catch (e) { return []; } },
      finalTime: FINAL_AT,
      heroes: function () { try { return heroesInfo(); } catch (e) { return []; } },
      raw: function () { return { rt: rt, nivel: nivel, lastCP: lastCP, peter: peter, falcon: falcon, enemies: enemies, torp: torp, eshots: eshots, beams: beams, pickups: pickups, scriptIdx: scriptIdx }; }
    }
  };

  // ---------------------------------------------------------------------------
  //  DIBUJO: fondos (con respaldo si falta arte-escenarios3.js)
  // ---------------------------------------------------------------------------
  function waterScroll() { return rt * 120; }
  function skyScroll() { return Math.max(0, rt - SKY_FROM) * SKY_SPEED; }
  function drawRioFallback(c) {
    var g = c.createLinearGradient(0, 0, 0, Math.max(10, nivel));
    g.addColorStop(0, '#1b2238'); g.addColorStop(1, '#2c4560');
    c.fillStyle = g; c.fillRect(0, 0, W, Math.max(0, Math.min(H, nivel)));
    c.fillStyle = '#3b4a6b';
    var s = waterScroll() * 0.4;
    for (var i = -1; i < 7; i++) {
      var x = i * 170 - (s % 170);
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 40, 0); c.lineTo(x + 20, 30 + hash(i + Math.floor(s / 170)) * 50); c.closePath(); c.fill();
    }
    if (nivel < H) {
      var w = c.createLinearGradient(0, nivel, 0, H);
      w.addColorStop(0, '#2f8cc6'); w.addColorStop(1, '#173f75');
      c.fillStyle = w; c.fillRect(0, nivel, W, H - nivel);
    }
  }
  function drawSkyFallback(c) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3e8ad6'); g.addColorStop(0.6, '#8fcdf3'); g.addColorStop(1, '#ffe9c7');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    var s = skyScroll() * 0.3;
    for (var i = 0; i < 6; i++) {
      var x = ((i * 220 - s) % 1320 + 1320) % 1320 - 180, y = 80 + (i % 3) * 120;
      c.beginPath(); c.arc(x, y, 30, 0, 6.283); c.arc(x + 34, y - 12, 34, 0, 6.283); c.arc(x + 70, y, 28, 0, 6.283); c.fill();
    }
  }
  function drawBackground(c) {
    var skyA = 0;
    if (phase === 'vuelo' || phase === 'final') skyA = 1;
    else if (phase === 'despegue') skyA = clamp((despT() - 3.6) / 1.4, 0, 1);
    else if (phase === 'lose') skyA = rt >= VUELO_AT ? 1 : 0;
    if (skyA < 1) {
      if (!art('bgRio', c, waterScroll(), t, { nivelAgua: nivel })) drawRioFallback(c);
    }
    if (skyA > 0) {
      c.save(); c.globalAlpha = skyA;
      if (!art('bgSalidaCielo', c, skyScroll(), t)) drawSkyFallback(c);
      c.restore();
    }
    // luz de la boca de la cueva durante el despegue
    if (phase === 'despegue') {
      var la = clamp((despT() - 3.0) / 1.2, 0, 1) * (1 - clamp((despT() - 4.8) / 1.0, 0, 1));
      if (la > 0) {
        c.save(); c.globalAlpha = la;
        var rg = c.createRadialGradient(W + 40, 200, 20, W + 40, 200, 700);
        rg.addColorStop(0, 'rgba(255,251,235,1)'); rg.addColorStop(0.4, 'rgba(254,243,199,0.6)'); rg.addColorStop(1, 'rgba(254,243,199,0)');
        c.fillStyle = rg; c.fillRect(0, 0, W, H);
        c.restore();
      }
    }
  }
  function drawCurrent(c, cu) {
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = '#bae6fd';
    rrect(c, cu.x, cu.y0, cu.w, cu.y1 - cu.y0, 26); c.fill();
    c.globalAlpha = 0.8;
    var dir = cu.dir, n = Math.floor(cu.w / 70);
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < 3; j++) {
        var bx = cu.x + 35 + i * 70, by = cu.y0 + (cu.y1 - cu.y0) * (0.2 + j * 0.3);
        var ph = (cu.ph * 1.6 + i * 0.3 + j * 0.5) % 1;
        var ox = 0, oy = 0;
        if (dir === 'arriba') oy = -ph * 26 + 13; else if (dir === 'abajo') oy = ph * 26 - 13; else ox = -ph * 26 + 13;
        // flecha de burbujas
        var ang = dir === 'arriba' ? -Math.PI / 2 : (dir === 'abajo' ? Math.PI / 2 : Math.PI);
        for (var k = 0; k < 3; k++) {
          var bxx = bx + ox - Math.cos(ang) * k * 9, byy = by + oy - Math.sin(ang) * k * 9;
          c.beginPath(); c.arc(bxx, byy, 4.5 - k, 0, 6.283);
          c.fillStyle = 'rgba(224,242,254,0.35)'; c.fill();
          c.strokeStyle = '#e0f2fe'; c.lineWidth = 1.5; c.stroke();
        }
        c.save(); c.translate(bx + ox + Math.cos(ang) * 10, by + oy + Math.sin(ang) * 10); c.rotate(ang);
        c.beginPath(); c.moveTo(7, 0); c.lineTo(-3, -6); c.lineTo(-3, 6); c.closePath();
        c.fillStyle = '#f0f9ff'; c.fill(); c.strokeStyle = '#0c4a6e'; c.lineWidth = 1.5; c.stroke();
        c.restore();
      }
    }
    c.restore();
  }

  // ---------------------------------------------------------------------------
  //  DIBUJO: héroes
  // ---------------------------------------------------------------------------
  function drawSubFallback(c, modo, sc) {
    c.save(); c.scale(sc, sc);
    var col = heroColor('peter');
    c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 3;
    rrect(c, -60, -22, 110, 44, 22); c.fill(); c.stroke();
    c.fillStyle = '#bae6fd'; c.beginPath(); c.arc(-2, -30, 13, 0, 6.283); c.fill(); c.stroke();
    if (modo === 'nave') {
      c.fillStyle = col; c.beginPath(); c.moveTo(-6, 10); c.lineTo(-34, 44); c.lineTo(-52, 44); c.lineTo(-40, 10); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#22c55e'; c.beginPath(); c.arc(52, 0, 22, 0, 6.283); c.fill(); c.stroke();
    c.fillStyle = '#1f2937'; c.beginPath(); c.arc(52, 0, 7, 0, 6.283); c.fill();
    c.restore();
  }
  function drawPeter(c, h) {
    var sc = subScale() * (h.scaleMul || 1);
    // rayos dorados detrás durante el giro del despegue
    if (phase === 'despegue') {
      var d = despT(), ra = clamp((d - 1.9) / 0.3, 0, 1) * (1 - clamp((d - 3.0) / 0.6, 0, 1));
      if (ra > 0) {
        c.save(); c.translate(h.x, h.y); c.rotate(t * 1.2);
        c.globalAlpha = 0.45 * ra;
        for (var i = 0; i < 14; i++) {
          c.rotate(Math.PI * 2 / 14);
          c.beginPath(); c.moveTo(0, 0); c.lineTo(360, -22); c.lineTo(360, 22); c.closePath();
          c.fillStyle = i % 2 ? '#fde047' : '#fff7c2'; c.fill();
        }
        c.globalAlpha = 0.6 * ra;
        var rg = c.createRadialGradient(0, 0, 10, 0, 0, 140);
        rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(253,224,71,0)');
        c.fillStyle = rg; c.beginPath(); c.arc(0, 0, 140, 0, 6.283); c.fill();
        c.restore();
      }
    }
    c.save();
    c.translate(h.x, h.y); c.rotate(h.tilt); c.scale(1, h.roll || 1);
    var jet = h.modo === 'nave' && (phase !== 'despegue' || despT() >= 2.8);
    if (!art('submarinoNave', c, 0, 0, { variant: subVar, modo: h.modo, scale: sc, facing: 1, estela: h.modo === 'nave' ? jet : true, look: lookObj() })) {
      drawSubFallback(c, h.modo, sc);
    }
    // gran llama de despegue
    if (phase === 'despegue' && despFx.jet && despT() < 4.2) {
      var fl = 1 - clamp((despT() - 2.8) / 1.4, 0, 1);
      c.save(); c.globalAlpha = 0.9 * fl;
      c.beginPath(); c.moveTo(-70 * sc, -12 * sc); c.lineTo(-(70 + 120 * fl + Math.random() * 20) * sc, 0); c.lineTo(-70 * sc, 12 * sc); c.closePath();
      c.fillStyle = '#fb923c'; c.fill();
      c.beginPath(); c.moveTo(-70 * sc, -6 * sc); c.lineTo(-(70 + 70 * fl) * sc, 0); c.lineTo(-70 * sc, 6 * sc); c.closePath();
      c.fillStyle = '#fef9c3'; c.fill();
      c.restore();
    }
    c.restore();
    if (h.shieldAnim > 0) drawShield(c, h);
  }
  function drawShield(c, h) {
    var s = shieldCenter(h), k = h.shieldAnim;
    var col = heroColor('peter', 'claro');
    c.save();
    var rg = c.createRadialGradient(s.x - 14, s.y, 4, s.x - 14, s.y, SHIELD_R + 14);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.7, col); rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = (0.5 + 0.12 * Math.sin(t * 12)) * k;
    c.fillStyle = rg;
    c.beginPath(); c.arc(s.x - 14, s.y, SHIELD_R + 14, -1.3, 1.3); c.closePath(); c.fill();
    c.globalAlpha = 0.25 * k; c.strokeStyle = col; c.lineWidth = 12;
    c.beginPath(); c.arc(s.x - 14, s.y, SHIELD_R + 6, -1.15, 1.15); c.stroke();
    c.globalAlpha = 0.95 * k;
    c.strokeStyle = col; c.lineWidth = 4;
    c.beginPath(); c.arc(s.x - 14, s.y, SHIELD_R + 4, -1.2, 1.2); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(s.x - 14, s.y, SHIELD_R - 2, -0.9, 0.9); c.stroke();
    c.restore();
    c.save(); c.globalAlpha = k;
    if (!art('escudoPeter', c, s.x + 6, s.y, { variant: peterVar, scale: 1.0, angle: 0 })) {
      c.fillStyle = '#27272a'; c.strokeStyle = OUT; c.lineWidth = 2.5;
      c.beginPath(); c.arc(s.x, s.y, 18, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = '#22c55e'; c.beginPath(); c.arc(s.x, s.y, 13, 0, 6.283); c.fill();
    }
    c.restore();
  }
  function drawTorpedo(c) {
    if (!torp) return;
    c.save();
    c.globalAlpha = 0.35;
    c.fillStyle = heroColor('peter', 'claro');
    c.beginPath(); c.arc(torp.x, torp.y, TORP_R + 6, 0, 6.283); c.fill();
    c.restore();
    if (!art('escudoPeter', c, torp.x, torp.y, { variant: peterVar, scale: 0.75, angle: torp.ang })) {
      c.save(); c.translate(torp.x, torp.y); c.rotate(torp.ang);
      c.fillStyle = '#27272a'; c.strokeStyle = OUT; c.lineWidth = 2.5;
      c.beginPath(); c.arc(0, 0, 15, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = '#22c55e'; c.fillRect(-3, -15, 6, 30);
      c.restore();
    }
  }
  function drawFalcon(c, h) {
    c.save();
    c.translate(h.x, h.y);
    c.rotate(h.tilt);
    var sc = mechaVar === 'B' ? MECHA_SC_B : MECHA_SC_A;
    if (!art('mechaHalcon', c, 0, 0, { variant: mechaVar, modo: 'vuelo', scale: sc, facing: 1, piloto: true })) {
      c.scale(sc / 0.6, sc / 0.6);
      c.fillStyle = '#22c55e'; c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 0, 36, 16, 0, 0, 6.2832); c.fill(); c.stroke();
      c.fillStyle = '#d1d5db';
      c.beginPath(); c.moveTo(-10, -6); c.lineTo(-40, -34); c.lineTo(10, -10); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#facc15';
      c.beginPath(); c.moveTo(34, -4); c.lineTo(50, 2); c.lineTo(34, 8); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  }

  // ---------------------------------------------------------------------------
  //  DIBUJO: enemigos y proyectiles
  // ---------------------------------------------------------------------------
  function exclaim(c, x, y) {
    if (!gfx('drawExclamation', c, x, y)) label(c, '!', x, y, 26, '#fde047');
  }
  function miniBar(c, cx, y, w, frac) {
    c.save();
    c.fillStyle = 'rgba(15,23,42,0.8)'; c.fillRect(cx - w / 2 - 1, y - 1, w + 2, 6);
    c.fillStyle = '#f87171'; c.fillRect(cx - w / 2, y, w * clamp(frac, 0, 1), 4);
    c.restore();
  }
  function drawStalactite(c, e) {
    c.save();
    c.translate(e.x, e.y);
    if (e.state === 'aviso') c.translate(Math.sin(t * 40) * 2, 0);
    var L = e.len;
    c.beginPath(); c.moveTo(-14, -L * 0.45); c.lineTo(14, -L * 0.45); c.lineTo(3, L * 0.55); c.lineTo(-3, L * 0.5); c.closePath();
    c.fillStyle = '#64748b'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.moveTo(-9, -L * 0.45); c.lineTo(-3, -L * 0.45); c.lineTo(-1, L * 0.4); c.closePath(); c.fill();
    c.restore();
  }
  function drawEnemy(c, e) {
    var ok = true;
    if (e.type === 'pez') ok = art('pezRobot', c, e.x, e.y, { facing: -1, scale: 1.3, t: t + e.ph });
    else if (e.type === 'escupe') {
      ok = art('pezRobot', c, e.x, e.y, { facing: -1, scale: 1.85, t: t + e.ph });
      if (e.state === 'aviso') {
        c.save(); c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 30);
        c.fillStyle = '#f9a8d4'; c.beginPath(); c.arc(e.x - 34, e.y + 4, 9 + (0.85 - e.st) * 8, 0, 6.283); c.fill();
        c.restore();
      }
      if (e.hp < e.maxHp) miniBar(c, e.x, e.y - 36, 36, e.hp / e.maxHp);
    } else if (e.type === 'mina') ok = art('mina', c, e.x, e.y, { t: t + e.ph, scale: 1.2 });
    else if (e.type === 'estalactita') { drawStalactite(c, e); }
    else if (e.type === 'enjambre') ok = art('dronEnjambre', c, e.x, e.y, { scale: 1.15, facing: -1 });
    else if (e.type === 'rayo') {
      ok = art('dronRayo', c, e.x, e.y, { scale: 1.2, facing: -1, cargando: e.state === 'charge' || e.state === 'beam', aturdido: e.stun > 0 });
      if (e.hp < e.maxHp) miniBar(c, e.x, e.y - 40, 36, e.hp / e.maxHp);
    } else if (e.type === 'picado') ok = art('dronPicado', c, e.x, e.y, { scale: 1.2, angle: e.angle });
    else if (e.type === 'miniRobot') ok = art('miniRobot', c, e.x, e.y, { scale: 46 / altoArte('miniRobot'), facing: e.facing || -1, t: t + e.ph });
    if (!ok) {
      c.save();
      c.fillStyle = e.type === 'mina' ? '#3f4a5e' : '#64748b'; c.strokeStyle = OUT; c.lineWidth = 2.5;
      c.beginPath(); c.arc(e.x, e.y, e.r, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = '#ef4444'; c.beginPath(); c.arc(e.x - e.r * 0.35, e.y - 2, e.r * 0.28, 0, 6.283); c.fill();
      c.restore();
    }
    if (e.flash > 0) {
      c.save(); c.globalAlpha = 0.5; c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(e.x, e.y, e.r, 0, 6.283); c.fill(); c.restore();
    }
    if (e.stun > 0 && e.type !== 'rayo') {
      c.save(); c.fillStyle = '#fde047';
      for (var k = 0; k < 3; k++) { var a = t * 6 + k * 2.1; c.beginPath(); c.arc(e.x + Math.cos(a) * 16, e.y - e.r - 6 + Math.sin(a) * 4, 2.5, 0, 6.283); c.fill(); }
      c.restore();
    }
  }
  function drawWarnLine(c, x1, y, half) {
    c.save();
    c.globalAlpha = 0.45 + 0.3 * Math.sin(t * 28);
    c.setLineDash([16, 10]); c.lineDashOffset = t * 60;
    c.beginPath(); c.moveTo(x1, y - half); c.lineTo(0, y - half); c.moveTo(x1, y + half); c.lineTo(0, y + half);
    c.strokeStyle = OUT; c.lineWidth = 6; c.stroke();
    c.strokeStyle = '#fbbf24'; c.lineWidth = 3; c.stroke();
    c.globalAlpha *= 0.18; c.fillStyle = '#fbbf24'; c.fillRect(0, y - half, x1, half * 2);
    c.restore();
  }
  function drawTelegraphs(c) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead) continue;
      if (e.type === 'enjambre' && e.state === 'warn') exclaim(c, e.x, e.y - 30);
      else if (e.type === 'rayo' && e.state === 'charge') { drawWarnLine(c, e.x - 25, e.beamY, 15); exclaim(c, e.x, e.y - 46); }
      else if (e.type === 'picado' && e.state === 'warn') exclaim(c, e.x, e.y - 32);
      else if (e.type === 'escupe' && e.state === 'aviso') exclaim(c, e.x, e.y - 44);
      else if (e.type === 'estalactita') drawStalWarn(c, e);
    }
  }
  // Aviso de la estalactita. Bajo el agua sigue hundiéndose y hace daño a Peter, así que la
  // línea llega hasta el fondo y marca con una elipse el carril de Peter. El «!» va por
  // debajo del HUD (la barra de progreso acaba en y≈60 y los iconos de los héroes en y≈75)
  // y, si la pista está arriba, por debajo de su caja.
  function drawStalWarn(c, e) {
    var abajo = underwater() ? H - 20 : Math.min(H, nivel + 60);
    var aviso = e.state === 'aviso';
    var y0 = aviso ? 95 : e.y + (e.len || 40) * 0.6;
    if (!aviso && (!underwater() || y0 > abajo - 30)) return;
    c.save();
    c.globalAlpha = aviso ? 0.35 + 0.25 * Math.sin(t * 20) : 0.28;
    c.setLineDash([8, 8]); c.strokeStyle = '#fbbf24'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(e.x, y0); c.lineTo(e.x, abajo); c.stroke();
    c.setLineDash([]);
    c.strokeStyle = '#ef4444';
    if (aviso) { c.beginPath(); c.ellipse(e.x, nivel, 26, 7, 0, 0, 6.283); c.stroke(); }
    if (underwater() && peter && !peter.ko && e.y < peter.y) {
      c.beginPath(); c.ellipse(e.x, peter.y, 22, 6, 0, 0, 6.283); c.stroke();
    }
    c.restore();
    if (aviso) exclaim(c, e.x, stalExclY(c));
  }
  function stalExclY(c) {
    var y = 112;
    if (hint && hintArriba() && phase !== 'final' && phase !== 'lose') {
      var conNota = !!(G.state && G.state.coop);
      y = Math.max(y, hintRect(c, hint.txt, conNota, 0).y1 + 24);
    }
    return y;
  }
  function drawBeam(c, b) {
    var k = b.life / b.max, hw = b.half * (0.7 + 0.3 * Math.sin(t * 40));
    var x0 = b.cut !== null ? b.cut : 0;
    c.save();
    c.globalAlpha = 0.3 * Math.min(1, k * 3);
    c.fillStyle = '#ef4444';
    c.fillRect(x0, b.y - hw * 1.8, b.x1 - x0, hw * 3.6);
    c.globalAlpha = Math.min(1, k * 3);
    c.fillRect(x0, b.y - hw, b.x1 - x0, hw * 2);
    c.strokeStyle = OUT; c.lineWidth = 2.5;
    c.strokeRect(x0 - 2, b.y - hw, b.x1 - x0 + 2, hw * 2);
    c.fillStyle = '#fff1f2';
    c.fillRect(x0, b.y - hw * 0.35, b.x1 - x0, hw * 0.7);
    c.beginPath(); c.arc(b.x1, b.y, hw * 1.3, 0, 6.2832); c.fillStyle = '#ef4444'; c.fill(); c.stroke();
    if (b.cut !== null) {
      c.globalAlpha = 0.8; c.fillStyle = '#fde68a';
      c.beginPath(); c.arc(b.cut, b.y, hw * 1.4 + Math.random() * 4, 0, 6.283); c.fill();
    }
    c.restore();
  }
  function drawOrb(c, s) {
    var pulse = 1 + Math.sin(t * 14 + s.x * 0.05) * 0.12;
    c.save();
    c.globalAlpha = 0.35; c.fillStyle = '#f9a8d4';
    c.beginPath(); c.arc(s.x, s.y, s.r * 1.6 * pulse, 0, 6.2832); c.fill();
    c.globalAlpha = 1;
    c.beginPath(); c.arc(s.x, s.y, s.r * pulse, 0, 6.2832);
    c.fillStyle = 'rgba(236,72,153,0.55)'; c.fill();
    c.strokeStyle = '#fdf2f8'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(s.x - s.r * 0.35, s.y - s.r * 0.35, s.r * 0.28, 0, 6.2832); c.fill();
    c.restore();
  }
  function drawFeather(c, s) {
    c.save();
    c.translate(s.x, s.y);
    c.rotate(Math.atan2(s.vy, s.vx));
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(14, 0); c.quadraticCurveTo(4, -6, -10, -4); c.lineTo(-15, -1);
    c.lineTo(-15, 1); c.lineTo(-10, 4); c.quadraticCurveTo(4, 6, 14, 0); c.closePath();
    c.fillStyle = '#e5e7eb'; c.fill();
    c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#64748b'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-14, 0); c.lineTo(10, 0); c.stroke();
    c.fillStyle = '#22c55e';
    c.beginPath(); c.moveTo(14, 0); c.lineTo(7, -3); c.lineTo(7, 3); c.closePath(); c.fill();
    c.restore();
  }
  function drawPickup(c, p) {
    if (p.t > 13 && Math.floor(p.t * 8) % 2 === 0) return;
    if (!gfx('drawHeart', c, p.x, p.y, 24, 'full')) {
      c.save(); c.fillStyle = '#f43f5e'; c.beginPath(); c.arc(p.x - 5, p.y - 2, 7, 0, 6.283); c.arc(p.x + 5, p.y - 2, 7, 0, 6.283); c.fill();
      c.beginPath(); c.moveTo(p.x - 12, p.y); c.lineTo(p.x, p.y + 12); c.lineTo(p.x + 12, p.y); c.fill(); c.restore();
    }
    if (p.burbuja) {
      c.save(); c.strokeStyle = 'rgba(224,242,254,0.9)'; c.lineWidth = 2.5;
      c.fillStyle = 'rgba(224,242,254,0.15)';
      c.beginPath(); c.arc(p.x, p.y, 22 + Math.sin(p.t * 4) * 1.5, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(p.x - 8, p.y - 9, 3.5, 0, 6.283); c.fill();
      c.restore();
    }
  }
  function drawParticles(c) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], a = Math.max(0, p.life / p.max);
      c.save();
      c.globalAlpha = a;
      if (p.kind === 'bubble') {
        c.strokeStyle = p.col; c.lineWidth = 1.5; c.fillStyle = 'rgba(224,242,254,0.18)';
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); c.stroke();
      } else if (p.kind === 'bolt') {
        c.fillStyle = p.col; c.strokeStyle = OUT; c.lineWidth = 1;
        c.fillRect(p.x - 2.5, p.y - 2.5, 5, 5); c.strokeRect(p.x - 2.5, p.y - 2.5, 5, 5);
      } else if (p.kind === 'line') {
        c.strokeStyle = p.col; c.lineWidth = p.r;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 60, p.y); c.stroke();
      } else if (p.kind === 'star') {
        c.fillStyle = p.col; c.translate(p.x, p.y); c.rotate(p.life * 4);
        c.beginPath();
        for (var k = 0; k < 8; k++) {
          var rr = k % 2 ? p.r * 0.45 : p.r, an = k * Math.PI / 4;
          if (k === 0) c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); else c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
        }
        c.closePath(); c.fill();
      } else if (p.kind === 'drop') {
        c.fillStyle = p.col; c.strokeStyle = 'rgba(12,74,110,0.5)'; c.lineWidth = 1;
        c.beginPath(); c.ellipse(p.x, p.y, p.r * 0.75, p.r, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, 6.283); c.fill(); c.stroke();
      } else {
        c.fillStyle = p.col;
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
      }
      c.restore();
    }
    for (i = 0; i < pops.length; i++) {
      var q = pops[i], u = 1 - q.life / q.max;
      if (!art('chispasPop', c, q.x, q.y, { t01: u, scale: q.s })) gfx('drawExplosion', c, q.x, q.y, u, 26 * q.s);
    }
  }
  function drawSplashes(c) {
    for (var i = 0; i < splashes.length; i++) {
      var s = splashes[i], u = 1 - s.life / s.max;
      var hgt = (s.big ? 210 : 60) * Math.sin(Math.PI * Math.min(1, u * 1.1)), wd = s.big ? 70 : 24;
      c.save();
      c.globalAlpha = 0.85 * (1 - u * 0.6);
      c.fillStyle = '#e0f2fe'; c.strokeStyle = '#7dd3fc'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(s.x - wd, nivel + 4);
      c.quadraticCurveTo(s.x - wd * 0.5, nivel - hgt * 0.6, s.x - wd * 0.25, nivel - hgt);
      c.quadraticCurveTo(s.x, nivel - hgt * 1.12, s.x + wd * 0.25, nivel - hgt);
      c.quadraticCurveTo(s.x + wd * 0.5, nivel - hgt * 0.6, s.x + wd, nivel + 4);
      c.closePath(); c.fill(); c.stroke();
      // corona del salpicón
      for (var k = -3; k <= 3; k++) {
        c.beginPath(); c.arc(s.x + k * wd * 0.42, nivel - hgt * (0.9 - Math.abs(k) * 0.18) - 8, (s.big ? 9 : 4) * (1 - u * 0.5), 0, 6.283); c.fill();
      }
      c.restore();
    }
  }
  function drawRings(c) {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i], u = 1 - r.life / r.max, rad = lerp(r.r0, r.r1, easeOut(u));
      c.save();
      c.globalAlpha = (1 - u) * 0.9;
      c.strokeStyle = r.col; c.lineWidth = 8 * (1 - u) + 2;
      c.beginPath();
      if (r.flat) c.ellipse(r.x, r.y, rad, rad * 0.22, 0, 0, 6.283);
      else c.arc(r.x, r.y, rad, 0, 6.283);
      c.stroke();
      c.restore();
    }
  }
  function drawNodriza(c) {
    if (!nodriza) return;
    var alto = 250, s = alto / altoArte('dronNodriza');
    // sombra que tapa la salida
    c.save();
    var g = c.createLinearGradient(W - 420, 0, W, 0);
    g.addColorStop(0, 'rgba(15,23,42,0)'); g.addColorStop(1, 'rgba(15,23,42,' + (0.45 * clamp(finalT / 0.8, 0, 1)) + ')');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.restore();
    if (!art('dronNodriza', c, nodriza.x, nodriza.y, { scale: s, facing: -1, abierta: false, cria: false })) {
      c.save();
      c.fillStyle = '#475569'; c.strokeStyle = OUT; c.lineWidth = 4;
      c.beginPath(); c.ellipse(nodriza.x, nodriza.y, 200, 110, 0, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = '#ef4444'; c.beginPath(); c.arc(nodriza.x - 90, nodriza.y - 10, 26, 0, 6.283); c.fill(); c.stroke();
      c.restore();
    }
  }

  // ---------------------------------------------------------------------------
  //  HUD
  // ---------------------------------------------------------------------------
  function drawKeyCap(c, txt, x, y) {
    c.save();
    c.font = 'bold 11px system-ui, "Segoe UI", Arial, sans-serif';
    var w = Math.max(18, c.measureText(txt).width + 8);
    c.fillStyle = 'rgba(15,23,42,0.85)'; c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5;
    rrect(c, x - w / 2, y - 8, w, 16, 4); c.fill(); c.stroke();
    c.fillStyle = '#f8fafc'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(txt, x, y + 1);
    c.restore();
  }
  function iconFrame(c, x, y, r, col, frac) {
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, 6.283);
    c.fillStyle = 'rgba(15,23,42,0.75)'; c.fill();
    c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    if (frac < 1) {
      c.beginPath(); c.moveTo(x, y); c.arc(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + frac * 6.283); c.closePath();
      c.fillStyle = 'rgba(148,163,184,0.35)'; c.fill();
    } else {
      c.beginPath(); c.arc(x, y, r - 2, 0, 6.283); c.strokeStyle = col; c.lineWidth = 2; c.stroke();
    }
    c.restore();
  }
  function drawPeterIcons(c, x1, x2, j) {
    var y = 31, fuera = !!torp;
    if (!art('iconoEscudo', c, x1, y, { size: 36, modo: 'cubrir', fuera: fuera, variant: peterVar })) {
      iconFrame(c, x1, y, 18, '#facc15', fuera ? 0 : 1); label(c, 'E', x1, y, 14, '#fde047');
    }
    if (!art('iconoEscudo', c, x2, y, { size: 36, modo: 'lanzar', fuera: fuera, variant: peterVar })) {
      iconFrame(c, x2, y, 18, '#facc15', fuera ? 0 : 1); label(c, 'T', x2, y, 14, '#fde047');
    }
    drawKeyCap(c, tk('{ataque}', j), x1, y + 26);
    drawKeyCap(c, tk('{disparo}', j), x2, y + 26);
  }
  function drawFalconIcons(c, x1, x2, j) {
    var y = 31, h = falcon;
    // plumas
    iconFrame(c, x1, y, 18, '#86efac', 1);
    drawFeather(c, { x: x1, y: y, vx: 1, vy: -0.6 });
    // embestida
    var frac = h.attackCd > 0 ? 1 - h.attackCd / DASH_CD : 1;
    iconFrame(c, x2, y, 18, '#fbbf24', frac);
    c.save(); c.strokeStyle = frac >= 1 ? '#fde68a' : '#64748b'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x2 - 9, y - 7); c.lineTo(x2 + 7, y + 5); c.moveTo(x2 + 7, y + 5); c.lineTo(x2 + 7, y - 3); c.moveTo(x2 + 7, y + 5); c.lineTo(x2 - 1, y + 5); c.stroke();
    c.restore();
    drawKeyCap(c, tk('{disparo}', j), x1, y + 26);
    drawKeyCap(c, tk('{ataque}', j), x2, y + 26);
  }
  function drawProgress(c) {
    var bx = 360, bw = 240, by = 22, frac = clamp(rt / FINAL_AT, 0, 1);
    c.save();
    c.fillStyle = 'rgba(15,23,42,0.7)'; rrect(c, bx - 4, by - 5, bw + 8, 14, 7); c.fill();
    var g = c.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#38bdf8'); g.addColorStop(DESPEGUE_AT / FINAL_AT, '#22d3ee'); g.addColorStop(1, '#fde047');
    c.fillStyle = g; rrect(c, bx, by - 1, Math.max(6, bw * frac), 6, 3); c.fill();
    // agua / aire
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(bx + bw * DESPEGUE_AT / FINAL_AT - 1, by - 4, 2, 12);
    for (var k = 0; k < CHECKPOINTS.length; k++) {
      var fx = bx + bw * CHECKPOINTS[k] / FINAL_AT;
      c.fillStyle = cpDone[k] ? '#86efac' : '#94a3b8';
      c.fillRect(fx, by - 12, 2, 12);
      c.beginPath(); c.moveTo(fx + 2, by - 12); c.lineTo(fx + 10, by - 9); c.lineTo(fx + 2, by - 6); c.closePath(); c.fill();
    }
    // el submarino que avanza
    c.fillStyle = heroColor('peter'); c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.ellipse(bx + bw * frac, by + 2, 7, 5, 0, 0, 6.283); c.fill(); c.stroke();
    c.restore();
    label(c, rt < DESPEGUE_AT ? 'Río subterráneo' : '¡Hacia la salida!', W / 2, by + 20, 12, '#e0f2fe');
  }
  // Desplazamiento para que la caja de G.ui.hint (borde superior en y = 64, texto de 20 px
  // envuelto a ≈ 372 px, 25 px por línea, 28 de margen, +21 con la nota del co-op) acabe
  // justo encima del borde inferior. Se calcula por lo alto (mejor un poco más arriba que cortada).
  function hintBoxH(c, txt, conNota) {
    var lines = 2;
    try {
      c.save(); c.font = 'bold 20px system-ui, "Segoe UI", Arial, sans-serif';
      lines = Math.max(1, Math.ceil(c.measureText(String(txt)).width / 330));
      c.restore();
    } catch (e) { lines = 3; }
    return Math.max(64, lines * 25 + 28 + (conNota ? 21 : 0));
  }
  function hintDY(c, txt, conNota) {
    return Math.max(0, H - 8 - hintBoxH(c, txt, conNota) - 64);
  }
  // En 1 jugador bajo el agua la pista va ARRIBA (y = 64): esa franja es del aire, donde
  // solo vuela Falcon IA (invulnerable), y así no tapa minas ni peces a Peter.
  function hintArriba() { return !coop && underwater(); }
  // Rectángulo que ocupa la caja de la pista en pantalla (centrada en x = 480 como G.ui.hint:
  // texto envuelto a ≤ 372 px, la nota del co-op en 14 px, 44 de margen y 44 de la cara).
  function hintRect(c, txt, conNota, dy, nota) {
    var w = 460;
    try {
      c.save();
      c.font = 'bold 20px system-ui, "Segoe UI", Arial, sans-serif';
      var tw = Math.min(372, c.measureText(String(txt)).width);
      var nw = 0;
      if (nota) { c.font = 'bold 14px system-ui, "Segoe UI", Arial, sans-serif'; nw = c.measureText(String(nota)).width; }
      c.restore();
      w = Math.max(tw, nw) + 88;
    } catch (e) { /* 460 */ }
    w = Math.max(w, 460);
    return { x0: 480 - w / 2, x1: 480 + w / 2, y0: 64 + dy, y1: 64 + dy + hintBoxH(c, txt, conNota) };
  }
  // ¿Hay algo que importe detrás de la caja? (un héroe que juega, un enemigo o un disparo enemigo)
  function hintTapaAlgo(r) {
    var i;
    for (i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (!h || h.ko || h.isAI) continue;
      var hr = heroRect(h);
      if (hr.x < r.x1 && hr.x + hr.w > r.x0 && hr.y < r.y1 && hr.y + hr.h > r.y0) return true;
    }
    for (i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead || e.gone) continue;
      if (hintArriba() && e.medio === 'aire') continue;   // lo del aire es cosa de Falcon IA
      if (e.x + e.r > r.x0 && e.x - e.r < r.x1 && e.y + e.r > r.y0 && e.y - e.r < r.y1) return true;
    }
    for (i = 0; i < eshots.length; i++) {
      var s = eshots[i], sr = s.r || 8;
      if (hintArriba() && s.medio !== 'agua') continue;
      if (s.x + sr > r.x0 && s.x - sr < r.x1 && s.y + sr > r.y0 && s.y - sr < r.y1) return true;
    }
    return false;
  }
  function drawHud(c) {
    if (G.ui && typeof G.ui.drawHearts === 'function') { try { G.ui.drawHearts(c); } catch (e) { /* nada */ } }
    if (phase === 'agua' || phase === 'vuelo') {
      drawPeterIcons(c, 216, 260, 1);
      if (coop) drawFalconIcons(c, 744, 700, 2);
    }
    if (phase !== 'intro' && phase !== 'final') drawProgress(c);
    if (coop) {
      for (var i = 0; i < heroes.length; i++) {
        var h = heroes[i];
        if (h.ko) label(c, (h.jugador === 1 ? 'J1' : 'J2') + ' vuelve en ' + Math.max(0, Math.ceil(h.koT)) + ' s',
          h.jugador === 1 ? W * 0.3 : W * 0.7, H / 2, 22, heroColor(h.kind, 'claro'));
      }
    }
    if (hint && phase !== 'final' && phase !== 'lose' && G.ui && typeof G.ui.hint === 'function') {
      var nota;
      if (coop) nota = tk('En 2J — J1 Peter: {ataque} escudo · {disparo} torpedo', 1) + ' | ' + tk('J2 Falcon: {disparo} plumas · {ataque} embestida', 2);
      // §8.7: G.ui.hint dibuja arriba (y≈64), justo donde vuela Falcon. En co-op (y en el
      // vuelo) la bajamos al lecho del río / suelo (y≈484); en 1 jugador bajo el agua se
      // queda arriba, sobre el aire de Falcon IA. Se aclara si pasa algo importante detrás.
      var conNota = !!nota || !!(G.state && G.state.coop);
      var dy = hintArriba() ? 0 : hintDY(c, hint.txt, conNota);
      c.save();
      c.translate(0, dy);
      if (hintTapaAlgo(hintRect(c, hint.txt, conNota, dy, nota))) c.globalAlpha = 0.45;
      try { G.ui.hint(c, hint.txt, { cara: 'secuaz', nota: nota }); } catch (e) { /* nada */ }
      c.restore();
    }
  }
  function drawBanner(c) {
    if (phase === 'intro') {
      var a = clamp(rt < 0.3 ? rt / 0.3 : (INTRO_END - rt) / 0.5, 0, 1);
      c.save(); c.globalAlpha = a;
      label(c, 'Capítulo 3: Río subterráneo y vuelo', W / 2, H / 2 - 40, 40, '#fde047');
      label(c, '¡Peter al agua, Falcon al aire!', W / 2, H / 2 + 6, 22, '#e0f2fe');
      c.restore();
    }
    if (banner) {
      var u = 1 - banner.life / banner.max;
      var al = clamp(banner.life / 0.4, 0, 1) * clamp(u / 0.08, 0, 1);
      var sc = banner.big ? 1 + 0.25 * Math.max(0, 1 - u * 6) : 1;
      c.save(); c.globalAlpha = al;
      c.translate(W / 2, banner.big ? 330 : 170); c.scale(sc, sc);
      label(c, banner.txt, 0, 0, banner.big ? 54 : 34, '#fde047');
      if (banner.sub) label(c, banner.sub, 0, banner.big ? 44 : 34, 20, '#e0f2fe');
      c.restore();
    }
    if (phase === 'final' && finalT >= 0.6) {
      var f = finalT - 0.6, pulse = 1 + 0.06 * Math.sin(t * 8);
      c.save(); c.globalAlpha = clamp(f / 0.25, 0, 1);
      c.translate(W / 2 - 60, 120); c.scale(pulse, pulse);
      label(c, '¡El Dron Nodriza!', 0, 0, 44, '#fca5a5');
      c.restore();
      if (f >= 0.8) {
        c.save(); c.globalAlpha = clamp((f - 0.8) / 0.25, 0, 1);
        label(c, '¡Fusión voladora!', W / 2 - 60, 176, 36, '#fde047');
        c.restore();
      }
    }
  }
  function drawSays(c) {
    for (var i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (h.sayT > 0 && h.say && !h.ko) bubble(c, h.say, h.x, h.y - (h.kind === 'peter' ? 36 : 50));
    }
  }

  function renderScene(c) {
    var sx = 0, sy = 0;
    if (shake > 0) { sx = rand(-shake, shake); sy = rand(-shake, shake); }
    c.save();
    c.translate(sx, sy);
    drawBackground(c);
    var i;
    if (nivel < H) for (i = 0; i < currents.length; i++) drawCurrent(c, currents[i]);
    for (i = 0; i < pickups.length; i++) drawPickup(c, pickups[i]);
    for (i = 0; i < enemies.length; i++) if (!enemies[i].dead) drawEnemy(c, enemies[i]);
    drawNodriza(c);
    for (i = 0; i < beams.length; i++) drawBeam(c, beams[i]);
    for (i = 0; i < eshots.length; i++) drawOrb(c, eshots[i]);
    for (i = 0; i < feathers.length; i++) drawFeather(c, feathers[i]);
    drawTorpedo(c);
    drawSplashes(c);
    // héroes (Falcon detrás si está más alto, Peter delante)
    for (i = heroes.length - 1; i >= 0; i--) {
      var h = heroes[i];
      if (h.ko) continue;
      if ((h.invuln > 0 || h.bump > 0) && phase !== 'despegue' && Math.floor(t * 20) % 2 === 0) continue;
      if (h.kind === 'peter') drawPeter(c, h); else drawFalcon(c, h);
      if (coop && (phase === 'agua' || phase === 'vuelo')) {
        label(c, h.jugador === 1 ? 'J1' : 'J2', h.x, h.y - (h.kind === 'peter' ? 46 : (mechaVar === 'B' ? 54 : 70)), 12, heroColor(h.kind, 'claro'));
      }
    }
    // tinte azul de profundidad y superficie del agua por delante
    if (nivel < H) {
      c.save(); c.globalAlpha = 0.1; c.fillStyle = '#1e40af'; c.fillRect(0, nivel, W, H - nivel); c.restore();
      art('aguaFrente', c, waterScroll(), nivel, t);
    }
    drawRings(c);
    drawParticles(c);
    drawTelegraphs(c);
    for (i = 0; i < texts.length; i++) {
      var tx = texts[i];
      c.save(); c.globalAlpha = clamp(tx.life / 0.4, 0, 1);
      label(c, tx.txt, tx.x, tx.y, tx.size, tx.col);
      c.restore();
    }
    drawSays(c);
    c.restore();   // fin del temblor

    if (flash > 0) {
      c.save();
      c.globalAlpha = clamp(flash / 0.3, 0, 1) * (flashCol === '#ff4d4d' ? 0.3 : 0.75);
      c.fillStyle = flashCol; c.fillRect(0, 0, W, H);
      c.restore();
    }
    drawBanner(c);
    drawHud(c);
  }
})();
