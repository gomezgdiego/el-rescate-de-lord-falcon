// vuelo.js — Parte 2, Capítulo 4: "Vuelo al cielo"
// Shoot 'em up horizontal entre nubes, rumbo a la fortaleza de Dark Secuaz.
// Copia evolucionada de js/space.js (oleadas, aliados hackeados, mini-jefe y
// K.O. en co-op). Registra G.scenes.levelP2_4.
//
//  · Jugador 1 = Lord Falcon en el MECHA-HALCÓN (P2.fn.mechaHalcon, modo 'vuelo').
//      shoot  = plumas metálicas (manteniendo = ráfaga)
//      attack = embestida en picado (daña, 2 s de enfriamiento)
//      hack   = rayo de hackeo al dron más cercano (4 s): lucha a tu lado 8 s
//  · Jugador 2 (co-op) = el Director con JETPACK: pulsos cian, ráfaga triple y hackeo.
//    En 1 jugador, el Director vuela a tu lado como IA (invulnerable) y dispara.
//  · Enemigos: enjambres de dronEnjambre en formación, dronRayo, dronPicado y
//    mini-torretas sobre nubes-plataforma. Al final: "Puerta de la fortaleza".
//  · 3 medallas por el recorrido. Daño siempre 1, 1.5 s de invulnerabilidad.
//  · Atajos de prueba: enter({saltarA: s}) y G.p2.debugInvulnerable.
// Todo se cuenta en segundos dentro de update(dt): sin timers externos.
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;
  G.scenes = G.scenes || {};

  // --- Constantes -----------------------------------------------------------
  var W = 960, H = 540;
  var OUT = '#1a1a2e';

  var INTRO_TIME = 2.6;           // entrada de los héroes (se salta con saltarA)
  var ROUTE_END = 100;            // segundos de oleadas antes de la Puerta
  var FINAL_TIME = ROUTE_END + 20; // final nominal (recorrido + Puerta): solo para el atajo saltarA
  var BG_SPEED = 120;             // scroll del fondo (px/s)
  var WORLD_SPEED = 110;          // nubes-plataforma, medallas y corazones (px/s)

  var MECHA_SPEED = 300;
  var MECHA_W = 80, MECHA_H = 46; // hitbox amable (más pequeña que el dibujo)
  var MECHA_SC_A = 0.85, MECHA_SC_B = 0.95; // el mecha es claramente más grande que un héroe
  var MECHA_MARGIN = 42;          // margen vertical del mecha (su dibujo es grande)
  var DIR_SPEED = 290;
  var DIR_W = 28, DIR_H = 46;

  var FEATHER_CD = 0.15, FEATHER_SPEED = 760;
  var PULSE_CD = 0.24, PULSE_SPEED = 620;
  var DASH_CD = 2.0, DASH_TIME = 0.34, DASH_VX = 640, DASH_VY = 300, DASH_DMG = 2;
  var BURST_CD = 2.0;             // ráfaga triple del Director (attack en co-op)
  var HACK_CD = 4.0, HACK_RANGE = 640, HACK_ALLY_TIME = 8.0;
  var INVULN_TIME = 1.5;

  var KO_TIME = 4.0, KO_RESPAWN_HP = 6, KO_INVULN = 2.0;

  var BULLET_SPEED = 200;         // balas lentas de las torretas
  var ALLY_LASER_SPEED = 640;

  var GEN_HP = 10, TURRET_HP = 5, CORE_HP = 30;

  // --- Estado (se rellena entero en enter) ----------------------------------
  var t, rt, phase, phaseT, scroll, coop, variant;
  var heroes, p1;
  var enemies, groups, platforms, fgClouds, medals, pickups;
  var shots, eShots, beams, particles, explosions, texts, hackBeams;
  var gate, scriptIdx, hint, shake, flashTimer, endTimer, shieldHintT, sparkleT;
  var localRun = [false, false, false];

  // --- Helpers --------------------------------------------------------------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* nada */ } }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) { /* nada */ } }
  function addShake(v) { shake = Math.min(5, Math.max(shake, v)); }
  function hasP2() { return !!(P2 && P2.fn && typeof P2.rf === 'function'); }
  function art(name) { return hasP2() && typeof P2.fn[name] === 'function'; }
  function debugInv() { return !!(G.p2 && G.p2.debugInvulnerable); }

  function runMedals() {
    if (G.p2) {
      if (!G.p2.run || !G.p2.run.medals) G.p2.run = { medals: [false, false, false] };
      return G.p2.run.medals;
    }
    return localRun;
  }

  var NO_INPUT = { held: function () { return false; }, pressed: function () { return false; } };
  function inputFor(h) {
    if (h.isAI) return NO_INPUT;
    if (h.id === 'P2') return G.input2 || NO_INPUT;
    return G.input || NO_INPUT;
  }

  // Teclas para los textos de ayuda (P1 pilota el mecha-halcón).
  function keys() {
    return coop ? { shoot: 'G', attack: 'F', hack: 'R' } : { shoot: 'K', attack: 'J', hack: 'H' };
  }

  // Jugadores reales en juego (no IA, no K.O.).
  function players() {
    var out = [];
    for (var i = 0; i < heroes.length; i++) if (!heroes[i].isAI && !heroes[i].ko) out.push(heroes[i]);
    return out;
  }
  function nearestPlayer(x, y) {
    var best = null, bd = 1e9, ps = players();
    for (var i = 0; i < ps.length; i++) {
      var d = dist(x, y, ps[i].x, ps[i].y);
      if (d < bd) { bd = d; best = ps[i]; }
    }
    return best;
  }

  function heroRect(h) {
    var w = h.kind === 'falcon' ? MECHA_W : DIR_W, hh = h.kind === 'falcon' ? MECHA_H : DIR_H;
    return { x: h.x - w / 2, y: h.y - hh / 2, w: w, h: hh };
  }
  function circleHitsRect(cx, cy, cr, r) {
    var nx = clamp(cx, r.x, r.x + r.w), ny = clamp(cy, r.y, r.y + r.h);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= cr * cr;
  }

  // --- Efectos --------------------------------------------------------------
  function spark(x, y, n, col, spMin, spMax) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, 6.283), sp = rand(spMin || 50, spMax || 160);
      particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.25, 0.55), max: 0.55, col: col, r: rand(1.5, 3) });
    }
  }
  function addExplosion(x, y, r) {
    explosions.push({ x: x, y: y, r: r, life: 0.4, max: 0.4 });
    spark(x, y, 8, '#fde68a', 60, 220);
    // tornillos que saltan (sin sangre: solo chispas y tornillos)
    for (var i = 0; i < 3; i++) {
      particles.push({ x: x, y: y, vx: rand(-120, 120), vy: rand(-200, -60), life: 0.7, max: 0.7, col: '#94a3b8', r: 2.5, bolt: true });
    }
  }
  function addText(x, y, txt, col) { texts.push({ x: x, y: y, txt: txt, col: col || '#fde047', life: 1.2, max: 1.2 }); }
  function showHint(txt, dur) { hint = { txt: txt, life: dur || 4.5 }; }

  // --- Héroes ---------------------------------------------------------------
  function makeHero(id, kind, isAI, x, y) {
    return {
      id: id, kind: kind, isAI: isAI,
      hpKey: id === 'P2' ? 'hp2' : 'hp',
      x: x, y: y, vx: 0, vy: 0, tilt: 0, invuln: 0,
      shootT: 0, attackCd: 0, hackT: 0, hackReadyPrev: true,
      dashT: 0, dashVx: 0, dashVy: 0, dashHits: [],
      ko: false, koTimer: 0, bump: 0, aiSide: -1, aiSideT: 0,
      shotFlash: 0
    };
  }

  function hurtHero(h) {
    if (!h || h.ko) return;
    if (h.isAI) { h.bump = 0.5; return; }          // el compañero IA solo parpadea
    if (h.invuln > 0 || h.dashT > 0) return;        // la embestida protege
    if (phase !== 'route' && phase !== 'boss') return;
    if (debugInv()) { h.invuln = 0.3; return; }
    G.state[h.hpKey] = Math.max(0, (G.state[h.hpKey] | 0) - 1);  // SIEMPRE 1 (medio corazón)
    h.invuln = INVULN_TIME;
    flashTimer = 0.25;
    addShake(4);
    sfx('hurt');
    if ((G.state[h.hpKey] | 0) <= 0) {
      if (!coop) { phase = 'lose'; endTimer = 0.9; return; }
      knockOut(h);
    }
  }

  function knockOut(h) {
    h.ko = true; h.koTimer = KO_TIME; h.invuln = 0; h.dashT = 0;
    addExplosion(h.x, h.y, 28);
    sfx('hurt');
    if (players().length === 0) { phase = 'lose'; endTimer = 0.9; }
  }

  function respawnHero(h) {
    h.ko = false; h.koTimer = 0;
    G.state[h.hpKey] = KO_RESPAWN_HP;
    var mate = null;
    for (var i = 0; i < heroes.length; i++) if (heroes[i] !== h && !heroes[i].ko) mate = heroes[i];
    h.x = mate ? clamp(mate.x - 40, 60, 400) : 100;
    h.y = mate ? clamp(mate.y + (h.kind === 'falcon' ? -80 : 80), 40, H - 40) : H / 2;
    h.invuln = KO_INVULN; h.shootT = 0;
    spark(h.x, h.y, 10, h.kind === 'falcon' ? '#86efac' : '#67e8ff');
    sfx('checkpoint');
  }

  function fireFeather(h) {
    shots.push({ x: h.x + 60, y: h.y + 8, vx: FEATHER_SPEED, vy: 0, kind: 'pluma', dmg: 1, r: 7, life: 1.6 });
    h.shotFlash = 0.08;
    sfx('arrow');
  }
  function firePulse(h, ang) {
    ang = ang || 0;
    shots.push({ x: h.x + 18, y: h.y - 2, vx: Math.cos(ang) * PULSE_SPEED, vy: Math.sin(ang) * PULSE_SPEED, kind: 'pulso', dmg: 1, r: 8, life: 1.5 });
    sfx('zap');
  }

  function startDash(h, inp) {
    var vy = DASH_VY;                        // en picado (hacia abajo) por defecto
    if (inp.held('up')) vy = -DASH_VY * 0.7;  // si mantienes arriba, embiste subiendo
    if (h.y > H - 70 && !inp.held('up')) vy = 0;
    h.dashT = DASH_TIME; h.dashVx = DASH_VX; h.dashVy = vy; h.dashHits = [];
    h.attackCd = DASH_CD;
    sfx('boost'); sfx('sword');
    addShake(2);
  }

  function updatePlayer(h, dt) {
    var inp = inputFor(h);
    var maxX = (phase === 'boss' && gate) ? gate.x - 70 : W - 30;
    if (h.dashT > 0) {
      h.dashT -= dt;
      h.x += h.dashVx * dt; h.y += h.dashVy * dt;
      var dmax = (phase === 'boss' && gate) ? gate.x - 30 : W - 30;
      var my = h.kind === 'falcon' ? MECHA_MARGIN : 30;
      h.x = clamp(h.x, 30, dmax); h.y = clamp(h.y, my, H - my);
      h.tilt = lerp(h.tilt, Math.atan2(h.dashVy, h.dashVx) * 0.9, Math.min(1, dt * 14));
      if (Math.random() < 0.9) particles.push({ x: h.x - 46, y: h.y + rand(-14, 14), vx: -rand(200, 320), vy: 0, life: 0.25, max: 0.25, col: '#ecfccb', r: rand(2, 3.5) });
      dashHits(h);
    } else {
      var ax = 0, ay = 0;
      if (inp.held('left')) ax -= 1;
      if (inp.held('right')) ax += 1;
      if (inp.held('up')) ay -= 1;
      if (inp.held('down')) ay += 1;
      if (ax !== 0 && ay !== 0) { ax *= 0.7071; ay *= 0.7071; }
      var sp = h.kind === 'falcon' ? MECHA_SPEED : DIR_SPEED;
      h.vx = ax * sp; h.vy = ay * sp;
      h.x = clamp(h.x + h.vx * dt, 30, maxX);
      var myM = h.kind === 'falcon' ? MECHA_MARGIN : 30;
      h.y = clamp(h.y + h.vy * dt, myM, H - myM);
      h.tilt = lerp(h.tilt, ay * 0.3, Math.min(1, dt * 10));
    }

    // disparo mantenido
    h.shootT -= dt;
    if (inp.held('shoot') && h.shootT <= 0) {
      if (h.kind === 'falcon') { fireFeather(h); h.shootT = FEATHER_CD; }
      else { firePulse(h, 0); h.shootT = PULSE_CD; }
    }
    // attack
    if (inp.pressed('attack') && h.attackCd <= 0) {
      if (h.kind === 'falcon') startDash(h, inp);
      else {
        firePulse(h, -0.22); firePulse(h, 0); firePulse(h, 0.22);
        h.attackCd = BURST_CD;
      }
    }
    // hackeo
    if (inp.pressed('hack')) {
      if (h.hackT > 0) sfx('hackFail');
      else tryHack(h);
    }
    // propulsión
    if (h.kind === 'falcon') {
      particles.push({ x: h.x - 58, y: h.y + rand(-6, 9), vx: -rand(160, 240), vy: rand(-20, 20), life: 0.25, max: 0.25, col: variant === 'B' ? '#4ade80' : '#bbf7d0', r: rand(1.5, 3) });
    } else {
      jetFlame(h);
    }
  }

  function jetFlame(h) {
    particles.push({ x: h.x - 10, y: h.y + 16, vx: -rand(40, 90), vy: rand(80, 150), life: 0.25, max: 0.25, col: Math.random() < 0.5 ? '#fbbf24' : '#f97316', r: rand(1.5, 3) });
  }

  // El Director como compañero automático (solo 1 jugador). Invulnerable.
  function updateAI(h, dt) {
    if (!p1) return;
    h.aiSideT -= dt;
    if (h.aiSideT <= 0) {
      h.aiSideT = 3;
      h.aiSide = p1.y > 210 ? -1 : 1;           // se pone arriba o abajo del mecha
    }
    var tx = clamp(p1.x - 80, 50, W - 120), ty = clamp(p1.y + h.aiSide * 96 + Math.sin(t * 2.2) * 10, 40, H - 40);
    var dx = tx - h.x, dy = ty - h.y, d = Math.sqrt(dx * dx + dy * dy);
    var sp = Math.min(340, d * 4);
    if (d > 1) { h.x += dx / d * sp * dt; h.y += dy / d * sp * dt; }
    if (d > 520) { h.x = tx; h.y = ty; spark(h.x, h.y, 8, '#67e8ff'); }
    h.tilt = lerp(h.tilt, clamp(dy / 300, -0.25, 0.25), Math.min(1, dt * 6));
    // dispara pulsos al enemigo que tenga delante
    h.shootT -= dt;
    if (h.shootT <= 0 && (phase === 'route' || phase === 'boss')) {
      var tg = aiTarget(h);
      if (tg) {
        var ang = clamp(Math.atan2(tg.y - h.y, tg.x - h.x), -0.6, 0.6);
        firePulse(h, ang);
        shots[shots.length - 1].ai = true;   // ayuda, pero el protagonista eres tú
        h.shootT = phase === 'boss' ? 0.7 : 0.55;
      } else h.shootT = 0.2;
    }
    jetFlame(h);
  }

  function aiTarget(h) {
    var best = null, bd = 640;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hacked || e.x < h.x + 20 || e.x > W) continue;
      var cy = e.y + (e.hy || 0);
      if (Math.abs(cy - h.y) > 200) continue;
      var d = dist(h.x, h.y, e.x, cy);
      if (d < bd) { bd = d; best = { x: e.x, y: cy }; }
    }
    if (!best && gate && phase === 'boss' && !gate.entering) {
      var parts = bossTargets(true);
      for (var k = 0; k < parts.length; k++) {
        var dd = dist(h.x, h.y, parts[k].x, parts[k].y);
        if (dd < 900 && (!best || dd < bd)) { bd = dd; best = parts[k]; }
      }
    }
    return best;
  }

  // --- Enemigos -------------------------------------------------------------
  var FORMS = {
    V: [[0, 0], [38, -32], [38, 32], [76, -64], [76, 64], [114, -96], [114, 96]],
    flecha: [[0, 0], [36, -28], [36, 28], [72, 0], [108, 0], [72, -56], [72, 56]]
  };

  function spawnSwarm(kind, y, n) {
    var g = { kind: kind, x: W + 70, y: y, baseY: y, t: 0, diveT: 2.0, members: [], n: n };
    groups.push(g);
    for (var i = 0; i < n; i++) {
      var e = { type: 'enjambre', group: g, slot: i, x: W + 80 + i * 40, y: y, r: 16, hp: 1, maxHp: 1,
        hacked: false, allyTime: 0, state: 'form', st: 0, vx: 0, vy: 0, shootT: 0, hy: 0, flash: 0 };
      g.members.push(e);
      enemies.push(e);
    }
    placeSwarm(g);
    for (var k = 0; k < g.members.length; k++) { g.members[k].x = g.members[k].sx; g.members[k].y = g.members[k].sy; }
    return g;
  }

  // Calcula la posición de cada hueco de la formación (sx, sy).
  function placeSwarm(g) {
    for (var i = 0; i < g.members.length; i++) {
      var e = g.members[i], ox = 0, oy = 0;
      if (g.kind === 'circulo') {
        var a = (i / g.n) * 6.283 + g.t * 1.4;
        ox = Math.cos(a) * 58; oy = Math.sin(a) * 58;
        e.sx = g.x + ox; e.sy = g.y + oy;
      } else if (g.kind === 'serpiente') {
        e.sx = g.x + i * 44; e.sy = g.baseY + Math.sin(g.t * 2.4 - i * 0.6) * 70;
      } else {
        var f = FORMS[g.kind] || FORMS.V, o = f[i % f.length];
        e.sx = g.x + o[0]; e.sy = g.y + o[1];
      }
    }
  }

  function updateGroup(g, dt) {
    g.t += dt;
    g.x -= 105 * dt;
    if (g.kind !== 'serpiente') g.y = g.baseY + Math.sin(g.t * 0.9) * 28;
    // quitar a los que ya no están (muertos o hackeados)
    for (var i = g.members.length - 1; i >= 0; i--) {
      var m = g.members[i];
      if (m.dead || m.hacked) g.members.splice(i, 1);
    }
    placeSwarm(g);
    // por turnos, uno se lanza contra un héroe con aviso "!"
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
        c.state = 'warn'; c.st = 0.55;
      }
    }
    return g.members.length > 0 && g.x > -260;
  }

  function spawnRayo(y) {
    enemies.push({ type: 'rayo', x: W + 50, y: y, r: 24, hp: 2, maxHp: 2, hacked: false, allyTime: 0,
      state: 'enter', st: 0, targetX: rand(640, 820), fireT: 1.6, stun: 0, life: 15, hy: 0, beamY: y, shootT: 0, flash: 0 });
  }

  function spawnPicado(dx) {
    enemies.push({ type: 'picado', x: W + 40 + (dx || 0), y: rand(100, 130), r: 18, hp: 1, maxHp: 1, hacked: false, allyTime: 0,
      state: 'cruise', st: 0, vx: -125, vy: 0, angle: Math.PI, dives: 0, tx: 0, ty: 0, hy: 0, shootT: 0, flash: 0 });
  }

  function spawnTurretCloud(y, medalIdx) {
    var pl = { x: W + 110, y: y, w: 180, vx: -WORLD_SPEED, seed: Math.random() * 10 };
    platforms.push(pl);
    enemies.push({ type: 'torreta', plat: pl, ox: -16, x: pl.x - 16, y: y, r: 22, hp: 3, maxHp: 3, hacked: false,
      allyTime: 0, fireT: 1.6, warn: 0, angle: Math.PI, hy: -36, shootT: 0, flash: 0 });
    if (typeof medalIdx === 'number') spawnMedal(medalIdx, { plat: pl, ox: 52, oy: -38 });
  }

  function spawnFgCloud(y, s, vx) {
    fgClouds.push({ x: W + 160 * (s || 1), y: y, s: s || 1, vx: vx || -(WORLD_SPEED + 40), seed: Math.random() * 10 });
  }

  function spawnMedal(idx, opts) {
    if (runMedals()[idx]) return;               // ya cogida en este intento
    opts = opts || {};
    medals.push({ idx: idx, x: opts.x || W + 60, y: opts.y || H / 2, group: opts.group || null,
      plat: opts.plat || null, ox: opts.ox || 0, oy: opts.oy || 0, taken: false, bob: Math.random() * 6 });
  }

  function killEnemy(e) {
    e.dead = true;
    var cy = e.y + (e.hy || 0);
    addExplosion(e.x, cy, e.type === 'rayo' ? 30 : 22);
    sfx('explosion');
    addShake(2);
    var chance = e.type === 'enjambre' ? 0.1 : 0.25;
    if (Math.random() < chance) pickups.push({ x: e.x, y: cy, t: 0 });
  }

  function damageEnemy(e, dmg, kind) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 0.12;
    spark(e.x, e.y + (e.hy || 0), 4, '#fef08a', 40, 120);
    if (kind === 'pulso' && e.type === 'rayo') { e.stun = 1.0; if (e.state === 'charge') { e.state = 'hover'; e.fireT = 2.0; } }
    if (e.hp <= 0) killEnemy(e);
  }

  function enemyShoot(x, y, tx, ty, speed) {
    var a = Math.atan2(ty - y, tx - x);
    eShots.push({ x: x, y: y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, life: 7 });
    sfx('laser');
  }

  // Objetivo más cercano para un aliado (enemigos y partes de la Puerta).
  function allyTarget(x, y, range) {
    var best = null, bd = range || 900;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hacked || e.dead || e.x > W + 10 || e.x < -10) continue;
      var cy = e.y + (e.hy || 0), d = dist(x, y, e.x, cy);
      if (d < bd) { bd = d; best = { x: e.x, y: cy }; }
    }
    if (gate && phase === 'boss' && !gate.entering) {
      var parts = bossTargets(true);
      for (var k = 0; k < parts.length; k++) {
        var dd = dist(x, y, parts[k].x, parts[k].y);
        if (dd < bd) { bd = dd; best = parts[k]; }
      }
    }
    return best;
  }

  function allyFire(e) {
    var cy = e.y + (e.hy || 0);
    var tg = allyTarget(e.x, cy, 700);
    var a = tg ? Math.atan2(tg.y - cy, tg.x - e.x) : 0;
    shots.push({ x: e.x + Math.cos(a) * 20, y: cy + Math.sin(a) * 20, vx: Math.cos(a) * ALLY_LASER_SPEED, vy: Math.sin(a) * ALLY_LASER_SPEED,
      kind: 'verde', dmg: 1, r: 7, life: 1.6 });
    sfx('laser');
  }

  function updateAlly(e, dt) {
    e.allyTime -= dt;
    if (e.type !== 'torreta') {
      // vuela junto a quien lo hackeó, un poco por delante
      var h = (e.owner && !e.owner.ko) ? e.owner : (players()[0] || p1);
      if (h) {
        var tx = clamp(h.x + 95, 60, W - 60), ty = clamp(h.y + e.allyOff, 40, H - 40);
        e.x = lerp(e.x, tx, Math.min(1, dt * 2.5));
        e.y = lerp(e.y, ty, Math.min(1, dt * 2.5));
      }
    } else {
      e.x = e.plat.x + e.ox; e.y = e.plat.y;
      var tg = allyTarget(e.x, e.y - 30, 600);
      if (tg) e.angle = Math.atan2(tg.y - (e.y - 40), tg.x - e.x);
    }
    e.shootT -= dt;
    if (e.shootT <= 0) { allyFire(e); e.shootT = e.type === 'torreta' ? 0.9 : 0.7; }
    if (e.allyTime <= 0 || (e.type === 'torreta' && e.plat.x < -120)) {
      // se apaga contento: chispitas verdes y "pop"
      e.dead = true;
      spark(e.x, e.y + (e.hy || 0), 12, '#4ade80');
      sfx('pickup');
    }
  }

  function updateEnemy(e, dt) {
    if (e.flash > 0) e.flash -= dt;
    if (e.hacked) { updateAlly(e, dt); return; }
    var tgt;
    if (e.type === 'enjambre') {
      if (e.state === 'form') {
        if (e.group) { e.x = e.sx; e.y = e.sy; } else e.x -= 105 * dt;
      } else if (e.state === 'warn') {
        if (e.group) { e.x = e.sx; e.y = e.sy; }
        e.st -= dt;
        if (e.st <= 0) {
          tgt = nearestPlayer(e.x, e.y);
          var a = tgt ? Math.atan2(tgt.y - e.y, tgt.x - e.x) : Math.PI;
          e.vx = Math.cos(a) * 280; e.vy = Math.sin(a) * 280;
          e.state = 'dive'; e.st = 1.1;
          sfx('robot');
        }
      } else if (e.state === 'dive') {
        e.x += e.vx * dt; e.y += e.vy * dt; e.st -= dt;
        if (e.st <= 0) e.state = e.group ? 'return' : 'form';
      } else if (e.state === 'return') {
        var dx = e.sx - e.x, dy = e.sy - e.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 8 || !e.group) e.state = 'form';
        else { e.x += dx / d * 300 * dt; e.y += dy / d * 300 * dt; }
      }
      if (e.x < -80 || e.y < -80 || e.y > H + 80) e.gone = true;
    } else if (e.type === 'rayo') {
      if (e.stun > 0) { e.stun -= dt; e.y += Math.sin(t * 9) * 10 * dt; return; }
      e.life -= dt;
      if (e.state === 'enter') {
        e.x -= 170 * dt;
        if (e.x <= e.targetX) { e.x = e.targetX; e.state = 'hover'; }
      } else if (e.state === 'hover') {
        tgt = nearestPlayer(e.x, e.y);
        if (tgt) {
          var ty = clamp(tgt.y, 70, H - 70);
          e.y += clamp(ty - e.y, -60 * dt, 60 * dt);   // lo sigue despacio
        }
        e.x = e.targetX + Math.sin(t * 1.3 + e.r) * 12;
        e.fireT -= dt;
        if (e.life <= 0) e.state = 'leave';
        else if (e.fireT <= 0 && tgt) { e.state = 'charge'; e.st = 0.8; e.beamY = e.y + 12; sfx('robot'); }
      } else if (e.state === 'charge') {
        e.st -= dt;
        if (e.st <= 0) {
          e.state = 'beam'; e.st = 0.4;
          beams.push({ x1: e.x - 25, y: e.beamY, half: 15, life: 0.4, max: 0.4 });
          sfx('laser');
          addShake(2);
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
        e.x += e.vx * dt; e.y += Math.sin(t * 3 + e.r) * 20 * dt;
        e.angle = Math.PI;
        if (e.dives < 2) {
          var ps = players();
          for (var i = 0; i < ps.length; i++) {
            var ddx = e.x - ps[i].x;
            if (ddx > 40 && ddx < 360 && ps[i].y > e.y + 70 && e.x < W - 20) {
              e.state = 'warn'; e.st = 0.6; e.tgt = ps[i]; break;
            }
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
        e.x += e.vx * dt; e.y += e.vy * dt; e.st -= dt;
        if (e.st <= 0 || e.y > H - 30) e.state = 'rise';
      } else if (e.state === 'rise') {
        e.x -= 60 * dt; e.y -= 220 * dt;
        e.angle = lerp(e.angle, -Math.PI / 2, Math.min(1, dt * 5));
        if (e.y <= 110) { e.y = 110; e.state = 'cruise'; e.vx = -125; }
      }
      if (e.x < -70 || e.y > H + 70) e.gone = true;
    } else if (e.type === 'torreta') {
      e.x = e.plat.x + e.ox; e.y = e.plat.y;
      tgt = nearestPlayer(e.x, e.y - 40);
      var mx = e.x, my = e.y - 32 * 1.3;
      if (tgt) e.angle = lerpAngle(e.angle, Math.atan2(tgt.y - my, tgt.x - mx), Math.min(1, dt * 4));
      if (e.x < W - 20 && e.x > 30) {
        e.fireT -= dt;
        if (e.fireT <= 0.35 && e.fireT + dt > 0.35) e.warn = 0.35;
        if (e.fireT <= 0) {
          e.fireT = 2.2;
          if (tgt && dist(mx, my, tgt.x, tgt.y) < 460) {
            enemyShoot(mx + Math.cos(e.angle) * 32, my + Math.sin(e.angle) * 32, tgt.x, tgt.y, BULLET_SPEED);
          }
        }
      }
      if (e.warn > 0) e.warn -= dt;
      if (e.plat.x < -140) e.gone = true;
    }

    // contacto con los héroes
    if (!e.dead && !e.gone) {
      var cy = e.y + (e.hy || 0);
      for (var j = 0; j < heroes.length; j++) {
        var h = heroes[j];
        if (h.ko) continue;
        if (circleHitsRect(e.x, cy, e.r * 0.8, heroRect(h))) {
          if (h.dashT > 0) continue;            // la embestida gana (ver dashHits)
          if (h.isAI) { if (h.bump <= 0) h.bump = 0.4; continue; }
          hurtHero(h);
        }
      }
    }
  }

  function lerpAngle(a, b, k) {
    var d = b - a;
    while (d > Math.PI) d -= 6.2832;
    while (d < -Math.PI) d += 6.2832;
    return a + d * k;
  }

  // Embestida: daña a todo lo que toque (una vez por objetivo).
  function dashHits(h) {
    var r = heroRect(h);
    r.x -= 8; r.y -= 8; r.w += 22; r.h += 16;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead || e.hacked || h.dashHits.indexOf(e) >= 0) continue;
      if (circleHitsRect(e.x, e.y + (e.hy || 0), e.r, r)) {
        h.dashHits.push(e);
        damageEnemy(e, DASH_DMG, 'embestida');
        sfx('punch');
      }
    }
    if (gate && phase === 'boss' && !gate.entering) {
      var parts = bossParts();
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        if (h.dashHits.indexOf(p.ref) >= 0) continue;
        if (p.ref === gate.core && shieldOn() && circleHitsRect(p.x, p.y, gate.shieldR, r)) {
          h.dashHits.push(p.ref);
          sfx('shieldBlock'); sfx('clink');
          spark(p.x - gate.shieldR, h.y, 6, '#f0abfc');
          h.dashT = 0; h.x -= 30;
          continue;
        }
        if (circleHitsRect(p.x, p.y, p.r, r)) {
          h.dashHits.push(p.ref);
          damagePart(p.ref, DASH_DMG);
          sfx('punch');
        }
      }
    }
  }

  // --- Hackeo -----------------------------------------------------------------
  function tryHack(h) {
    var best = null, bd = HACK_RANGE, kind = null;
    var i;
    for (i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hacked || e.dead || e.x > W - 10 || e.x < 0) continue;
      var d = dist(h.x, h.y, e.x, e.y + (e.hy || 0));
      if (d < bd) { bd = d; best = e; kind = 'enemy'; }
    }
    if (gate && phase === 'boss' && !gate.entering) {
      for (i = 0; i < gate.turrets.length; i++) {
        var tu = gate.turrets[i];
        if (!tu.alive || tu.hacked) continue;
        var pt = turretPos(tu), dt2 = dist(h.x, h.y, pt.x, pt.y);
        if (dt2 < bd) { bd = dt2; best = tu; kind = 'turret'; }
      }
      if (gate.gen.alive && gate.gen.stun <= 0) {
        var gp = genPos(), dg = dist(h.x, h.y, gp.x, gp.y);
        if (dg < bd) { bd = dg; best = gate.gen; kind = 'gen'; }
      }
    }
    if (!best) { sfx('hackFail'); return; }
    h.hackT = HACK_CD; h.hackReadyPrev = false;
    var tx, ty;
    if (kind === 'enemy') {
      best.hacked = true; best.allyTime = HACK_ALLY_TIME; best.shootT = 0.4;
      best.owner = h; best.allyOff = rand(-70, 70); best.state = 'ally'; best.stun = 0;
      if (best.group) best.group = null;
      tx = best.x; ty = best.y + (best.hy || 0);
    } else if (kind === 'turret') {
      best.hacked = true; best.allyTime = HACK_ALLY_TIME; best.fireT = 0.4;
      var tp = turretPos(best); tx = tp.x; ty = tp.y;
    } else {
      best.stun = 4.0;                          // escudo apagado 4 s
      var gpp = genPos(); tx = gpp.x; ty = gpp.y;
      addText(tx, ty - 40, '¡Escudo apagado!', '#86efac');
    }
    hackBeams.push({ x1: h.x + 20, y1: h.y, x2: tx, y2: ty, life: 0.3 });
    sfx('hack'); sfx('hackOk');
    spark(tx, ty, 10, '#4ade80');
    addShake(2);
  }

  // --- La Puerta de la fortaleza (mini-jefe) --------------------------------
  function startBoss() {
    phase = 'boss'; phaseT = 0;
    gate = {
      x: W + 40, targetX: 680, entering: true, open: 0, flash: 0,
      shieldR: 68,
      turrets: [
        { oy: 150, hp: TURRET_HP, maxHp: TURRET_HP, alive: true, hacked: false, allyTime: 0, fireT: 1.2, angle: Math.PI, warn: 0, flash: 0 },
        { oy: 300, hp: TURRET_HP, maxHp: TURRET_HP, alive: true, hacked: false, allyTime: 0, fireT: 2.0, angle: Math.PI, warn: 0, flash: 0 },
        { oy: 440, hp: TURRET_HP, maxHp: TURRET_HP, alive: true, hacked: false, allyTime: 0, fireT: 2.8, angle: Math.PI, warn: 0, flash: 0 }
      ],
      gen: { hp: GEN_HP, maxHp: GEN_HP, alive: true, stun: 0, flash: 0 },
      core: { hp: CORE_HP, maxHp: CORE_HP, flash: 0 },
      atkT: 3.0, atkState: 'idle', atkKind: 0, beamT: 0, spawnT: 9
    };
    sfx('roar');
    addShake(3);
    showHint('¡La Puerta de la fortaleza! Rompe el generador de escudo y después la cerradura.', 5.5);
  }

  function turretPos(tu) { return { x: gate.x - 10, y: tu.oy - 30 * 1.3 }; }   // centro del cuerpo
  function genPos() { return { x: gate.x + 130, y: 182 }; }
  function corePos() { return { x: gate.x + 130, y: 322 }; }
  function shieldOn() { return gate && gate.gen.alive && gate.gen.stun <= 0; }

  // Partes golpeables: {x, y, r, ref}
  function bossParts() {
    var out = [];
    if (!gate) return out;
    for (var i = 0; i < gate.turrets.length; i++) {
      var tu = gate.turrets[i];
      if (tu.alive && !tu.hacked) { var p = turretPos(tu); out.push({ x: p.x, y: p.y, r: 24, ref: tu }); }
    }
    if (gate.gen.alive) { var g = genPos(); out.push({ x: g.x, y: g.y, r: 26, ref: gate.gen }); }
    var c = corePos(); out.push({ x: c.x, y: c.y, r: 42, ref: gate.core });
    return out;
  }
  // Objetivos para apuntar (sin la cerradura si tiene escudo).
  function bossTargets(skipShieldedCore) {
    var parts = bossParts(), out = [];
    for (var i = 0; i < parts.length; i++) {
      if (skipShieldedCore && parts[i].ref === gate.core && shieldOn()) continue;
      out.push(parts[i]);
    }
    return out;
  }

  function damagePart(ref, dmg) {
    if (!gate || phase !== 'boss') return;
    ref.hp = Math.max(0, ref.hp - dmg);
    ref.flash = 0.12;
    if (ref.hp > 0) return;
    if (ref === gate.core) { winBoss(); return; }
    ref.alive = false;
    var p = ref === gate.gen ? genPos() : turretPos(ref);
    addExplosion(p.x, p.y, ref === gate.gen ? 44 : 32);
    sfx('explosion');
    addShake(4);
    if (ref === gate.gen) { addText(p.x, p.y - 40, '¡Escudo roto!', '#fde047'); sfx('hackOk'); }
    if (Math.random() < 0.5) pickups.push({ x: p.x - 20, y: p.y, t: 0 });
  }

  function winBoss() {
    var c = corePos();
    addExplosion(c.x, c.y, 70);
    for (var i = 0; i < gate.turrets.length; i++) {
      if (gate.turrets[i].alive) { var p = turretPos(gate.turrets[i]); addExplosion(p.x, p.y, 30); gate.turrets[i].alive = false; }
    }
    if (gate.gen.alive) { var g = genPos(); addExplosion(g.x, g.y, 40); gate.gen.alive = false; }
    for (var k = 0; k < enemies.length; k++) if (!enemies[k].hacked && !enemies[k].dead) killEnemy(enemies[k]);
    eShots = []; beams = [];
    sfx('explosion'); sfx('door'); sfx('victory');
    addShake(5);
    phase = 'win'; endTimer = 3.4;
  }

  function updateBoss(dt) {
    gate.flash = Math.max(0, gate.flash - dt);
    gate.core.flash = Math.max(0, gate.core.flash - dt);
    gate.gen.flash = Math.max(0, gate.gen.flash - dt);
    if (gate.entering) {
      gate.x += (gate.targetX - gate.x) * Math.min(1, dt * 1.8);
      if (Math.abs(gate.x - gate.targetX) < 3) { gate.x = gate.targetX; gate.entering = false; addShake(3); sfx('bigPunch'); }
      return;
    }
    if (gate.gen.stun > 0) gate.gen.stun -= dt;
    var i, tu, p, tgt;
    // mini-torretas
    for (i = 0; i < gate.turrets.length; i++) {
      tu = gate.turrets[i];
      if (tu.flash > 0) tu.flash -= dt;
      if (!tu.alive) continue;
      p = turretPos(tu);
      var my = tu.oy - 32 * 1.3;
      if (tu.hacked) {
        tu.allyTime -= dt;
        var at = allyTarget(gate.x - 10, my, 1200);
        if (at) tu.angle = lerpAngle(tu.angle, Math.atan2(at.y - my, at.x - (gate.x - 10)), Math.min(1, dt * 5));
        tu.fireT -= dt;
        if (tu.fireT <= 0) {
          tu.fireT = 0.8;
          shots.push({ x: gate.x - 10 + Math.cos(tu.angle) * 32, y: my + Math.sin(tu.angle) * 32,
            vx: Math.cos(tu.angle) * ALLY_LASER_SPEED, vy: Math.sin(tu.angle) * ALLY_LASER_SPEED, kind: 'verde', dmg: 1, r: 7, life: 1.8 });
          sfx('laser');
        }
        if (tu.allyTime <= 0) {
          tu.alive = false; tu.hacked = false;
          spark(p.x, p.y, 14, '#4ade80');
          addText(p.x, p.y - 30, '¡Pop!', '#86efac');
          sfx('pickup');
        }
        continue;
      }
      tgt = nearestPlayer(p.x, p.y);
      if (tgt) tu.angle = lerpAngle(tu.angle, Math.atan2(tgt.y - my, tgt.x - (gate.x - 10)), Math.min(1, dt * 4));
      tu.fireT -= dt;
      if (tu.fireT <= 0.35 && tu.fireT + dt > 0.35) tu.warn = 0.35;
      if (tu.warn > 0) tu.warn -= dt;
      if (tu.fireT <= 0) {
        tu.fireT = 2.6;
        if (tgt) enemyShoot(gate.x - 10 + Math.cos(tu.angle) * 32, my + Math.sin(tu.angle) * 32, tgt.x, tgt.y, BULLET_SPEED);
      }
      // contacto
      for (var j = 0; j < heroes.length; j++) {
        if (!heroes[j].ko && heroes[j].dashT <= 0 && circleHitsRect(p.x, p.y, 20, heroRect(heroes[j]))) hurtHero(heroes[j]);
      }
    }

    // ataques de la cerradura (el ojo de la puerta)
    var c = corePos();
    gate.atkT -= dt;
    if (gate.atkState === 'idle') {
      if (gate.atkT <= 0) {
        gate.atkKind = (gate.atkKind + 1) % 2;
        if (gate.atkKind === 0) {
          // abanico de 3 orbes lentos hacia el héroe
          tgt = nearestPlayer(c.x, c.y);
          var base = tgt ? Math.atan2(tgt.y - c.y, tgt.x - c.x) : Math.PI;
          for (var k = -1; k <= 1; k++) {
            var a = base + k * 0.32;
            eShots.push({ x: c.x - 40, y: c.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 9, life: 7, orb: true });
          }
          sfx('laser');
          gate.atkT = 3.2;
        } else {
          gate.atkState = 'tele'; gate.beamT = 1.1;
          sfx('roar');
        }
      }
    } else if (gate.atkState === 'tele') {
      gate.beamT -= dt;
      if (gate.beamT <= 0) {
        gate.atkState = 'beam'; gate.beamT = 0.6;
        beams.push({ x1: c.x - 42, y: c.y, half: 24, life: 0.6, max: 0.6, big: true });
        sfx('laser'); addShake(4);
      }
    } else if (gate.atkState === 'beam') {
      gate.beamT -= dt;
      if (gate.beamT <= 0) { gate.atkState = 'idle'; gate.atkT = 2.6; }
    }

    // la escotilla suelta un pequeño enjambre de vez en cuando
    gate.spawnT -= dt;
    if (gate.spawnT <= 0) {
      gate.spawnT = 11;
      var alive = 0;
      for (i = 0; i < enemies.length; i++) if (!enemies[i].hacked && !enemies[i].dead) alive++;
      if (alive < 4) {
        var g = spawnSwarm('V', rand(140, 400), 4);
        g.x = gate.x - 40;
        placeSwarm(g);
        for (i = 0; i < g.members.length; i++) { g.members[i].x = gate.x + 60; g.members[i].y = 60; g.members[i].state = 'return'; }
        sfx('robot');
      }
    }
  }

  // --- Guion del recorrido (segundos de recorrido) ----------------------------
  var SCRIPT = [
    [0.4, function () { var k = keys(); showHint('¡Vuela con las flechas! Mantén ' + k.shoot + ' para lanzar plumas metálicas.'); }],
    [2, function () { spawnSwarm('V', 200, 5); }],
    [6, function () { spawnSwarm('flecha', 380, 6); }],
    [8.5, function () { var k = keys(); showHint('Pulsa ' + k.attack + ' para una embestida en picado. ¡Atraviesa a los drones!'); }],
    [11, function () { var g = spawnSwarm('circulo', 270, 6); spawnMedal(0, { group: g, x: g.x, y: g.y }); }],
    [15, function () { spawnPicado(0); spawnPicado(90); }],
    [18, function () { spawnTurretCloud(420); }],
    [18.6, function () { var k = keys(); showHint('Pulsa ' + k.hack + ' para hackear un dron: ¡se vuelve verde y lucha a tu lado!'); }],
    [22, function () { spawnSwarm('serpiente', 150, 7); }],
    [25, function () { spawnRayo(300); showHint('El dron de rayos avisa con «!» antes de disparar. ¡Apártate de la línea!', 4); }],
    [28, function () { spawnFgCloud(120, 1.1); }],
    [30, function () { spawnSwarm('V', 420, 5); spawnPicado(40); }],
    [34, function () { spawnTurretCloud(210); showHint('Hay medallas escondidas detrás de las nubes. ¡Búscalas!', 4); }],
    [36, function () { spawnFgCloud(300, 1.25, -WORLD_SPEED); spawnMedal(1, { x: W + 300, y: 296 }); }],
    [38, function () { spawnRayo(150); }],
    [39.5, function () { spawnRayo(410); }],
    [43, function () { spawnSwarm('circulo', 170, 6); spawnSwarm('V', 400, 5); }],
    [48, function () { spawnPicado(0); spawnPicado(80); spawnPicado(160); }],
    [52, function () { spawnTurretCloud(440); spawnRayo(200); }],
    [56, function () { spawnSwarm('serpiente', 330, 7); spawnFgCloud(90, 0.9); }],
    [60, function () { spawnSwarm('flecha', 220, 7); spawnRayo(420); }],
    [64, function () { spawnPicado(0); spawnPicado(100); spawnTurretCloud(170); }],
    [68, function () { spawnTurretCloud(390, 2); }],
    [72, function () { spawnSwarm('V', 150, 5); spawnSwarm('V', 400, 5); }],
    [76, function () { spawnRayo(160); spawnRayo(390); spawnPicado(60); }],
    [80, function () { spawnSwarm('circulo', 280, 6); spawnTurretCloud(440); }],
    [84, function () { spawnPicado(0); spawnPicado(80); spawnPicado(160); spawnFgCloud(430, 1); }],
    [88, function () { spawnSwarm('flecha', 300, 7); spawnRayo(140); }],
    [92, function () { spawnSwarm('serpiente', 420, 7); spawnPicado(20); spawnPicado(120); }],
    [97, function () { showHint('¡Ya se ve la Puerta de la fortaleza! ¡Prepárate!', 3.5); }]
  ];

  function updateScript() {
    while (scriptIdx < SCRIPT.length && rt >= SCRIPT[scriptIdx][0]) {
      try { SCRIPT[scriptIdx][1](); } catch (e) { if (window.console) console.warn('[vuelo] guion', e); }
      scriptIdx++;
    }
  }

  // --- Proyectiles, recogidas y efectos ---------------------------------------
  function updateShots(dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var s = shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      var hit = false;
      for (var j = 0; j < enemies.length && !hit; j++) {
        var e = enemies[j];
        if (e.hacked || e.dead || e.gone) continue;
        if (dist(s.x, s.y, e.x, e.y + (e.hy || 0)) < e.r + s.r) { damageEnemy(e, s.dmg, s.kind); hit = true; }
      }
      if (!hit && gate && phase === 'boss' && !gate.entering) hit = shotVsGate(s);
      if (hit || s.life <= 0 || s.x > W + 40 || s.x < -40 || s.y < -40 || s.y > H + 40) shots.splice(i, 1);
    }
  }

  function shotVsGate(s) {
    var parts = bossParts();
    for (var k = 0; k < parts.length; k++) {
      var p = parts[k];
      if (p.ref === gate.core && shieldOn()) {
        if (dist(s.x, s.y, p.x, p.y) < gate.shieldR + s.r) {
          spark(s.x, s.y, 3, '#f0abfc', 40, 100);
          sfx('clink');
          if (shieldHintT <= 0) { shieldHintT = 6; addText(p.x, p.y - gate.shieldR - 14, '¡Tiene escudo! Rompe el generador', '#f0abfc'); }
          return true;
        }
        continue;
      }
      if (dist(s.x, s.y, p.x, p.y) < p.r + s.r) { damagePart(p.ref, s.ai ? s.dmg * 0.5 : s.dmg); spark(s.x, s.y, 3, '#fef08a', 40, 120); return true; }
    }
    // el muro de la puerta para los disparos (detrás del generador y la cerradura)
    if (s.x > gate.x + 185 && s.y > 30) { spark(s.x, s.y, 2, '#cbd5e1', 30, 80); return true; }
    return false;
  }

  function updateEnemyShots(dt) {
    for (var i = eShots.length - 1; i >= 0; i--) {
      var s = eShots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      var hit = false;
      for (var j = 0; j < heroes.length; j++) {
        var h = heroes[j];
        if (h.ko) continue;
        if (circleHitsRect(s.x, s.y, s.r * 0.8, heroRect(h))) {
          if (h.isAI) { h.bump = 0.4; hit = true; spark(s.x, s.y, 4, '#67e8ff'); break; }
          if (h.invuln > 0 || h.dashT > 0) continue;
          hurtHero(h); hit = true; break;
        }
      }
      if (hit || s.life <= 0 || s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) eShots.splice(i, 1);
    }
  }

  function updateBeams(dt) {
    for (var i = beams.length - 1; i >= 0; i--) {
      var b = beams[i];
      b.life -= dt;
      for (var j = 0; j < heroes.length; j++) {
        var h = heroes[j];
        if (h.ko || h.isAI) continue;
        var r = heroRect(h);
        if (r.x < b.x1 && r.y < b.y + b.half && r.y + r.h > b.y - b.half) hurtHero(h);
      }
      if (b.life <= 0) beams.splice(i, 1);
    }
  }

  function updateMedals(dt) {
    var rm = runMedals();
    for (var i = medals.length - 1; i >= 0; i--) {
      var m = medals[i];
      m.bob += dt;
      if (m.group && m.group.members.length > 0 && !m.group.done) {
        m.x = lerp(m.x, m.group.kind === 'circulo' ? m.group.x : m.group.x + 60, Math.min(1, dt * 8));
        m.y = lerp(m.y, m.group.y, Math.min(1, dt * 8));
      } else if (m.plat) {
        m.x = m.plat.x + m.ox; m.y = m.plat.y + m.oy;
      } else {
        m.x -= WORLD_SPEED * dt;
      }
      for (var j = 0; j < heroes.length; j++) {
        var h = heroes[j];
        if (h.ko) continue;
        if (dist(h.x, h.y, m.x, m.y) < 40) {
          rm[m.idx] = true;
          sfx('medal'); sfx('pickup');
          spark(m.x, m.y, 14, '#fde047');
          addText(m.x, m.y - 26, '¡Medalla!', '#fde047');
          medals.splice(i, 1);
          break;
        }
      }
      if (medals[i] === m && m.x < -50) medals.splice(i, 1);
    }
  }

  function updatePickups(dt) {
    for (var i = pickups.length - 1; i >= 0; i--) {
      var p = pickups[i];
      p.t += dt; p.x -= 60 * dt; p.y += Math.sin(p.t * 3) * 14 * dt;
      var taken = false;
      for (var j = 0; j < heroes.length; j++) {
        var h = heroes[j];
        if (h.ko || h.isAI) continue;
        if (dist(h.x, h.y, p.x, p.y) < 36) {
          var mk = h.hpKey === 'hp2' ? 'maxHp2' : 'maxHp';
          G.state[h.hpKey] = Math.min(G.state[mk] || 10, (G.state[h.hpKey] | 0) + 2);
          sfx('pickup'); spark(p.x, p.y, 8, '#fda4af');
          taken = true; break;
        }
      }
      if (taken || p.x < -30 || p.t > 14) pickups.splice(i, 1);
    }
  }

  function updateEffects(dt) {
    var i;
    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.bolt) p.vy += 500 * dt; else { p.vx *= 0.96; p.vy *= 0.96; }
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (i = explosions.length - 1; i >= 0; i--) { explosions[i].life -= dt; if (explosions[i].life <= 0) explosions.splice(i, 1); }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].life -= dt; texts[i].y -= 30 * dt; if (texts[i].life <= 0) texts.splice(i, 1); }
    for (i = hackBeams.length - 1; i >= 0; i--) { hackBeams[i].life -= dt; if (hackBeams[i].life <= 0) hackBeams.splice(i, 1); }
    for (i = platforms.length - 1; i >= 0; i--) { platforms[i].x += platforms[i].vx * dt; if (platforms[i].x < -200) platforms.splice(i, 1); }
    for (i = fgClouds.length - 1; i >= 0; i--) { fgClouds[i].x += fgClouds[i].vx * dt; if (fgClouds[i].x < -260 * fgClouds[i].s) fgClouds.splice(i, 1); }
    if (hint) { hint.life -= dt; if (hint.life <= 0) hint = null; }
  }

  // ------------------------------------------------------------------------
  //  ESCENA
  // ------------------------------------------------------------------------
  var scene = {
    enter: function (params) {
      params = params || {};
      coop = !!(G.state && G.state.coop);
      G.state.hp = G.state.maxHp || 10;
      if (coop) G.state.hp2 = G.state.maxHp2 || 10;
      try { if (G.p2resetRun) G.p2resetRun(); else runMedals()[0] = runMedals()[1] = runMedals()[2] = false; } catch (e) { /* nada */ }
      variant = (G.p2 && G.p2.vehicle && G.p2.vehicle.mechahalcon === 'B') ? 'B' : 'A';
      music('sky');

      t = 0; rt = 0; scroll = 0; phaseT = 0;
      enemies = []; groups = []; platforms = []; fgClouds = []; medals = []; pickups = [];
      shots = []; eShots = []; beams = []; particles = []; explosions = []; texts = []; hackBeams = [];
      gate = null; scriptIdx = 0; hint = null; shake = 0; flashTimer = 0; endTimer = 0; shieldHintT = 0; sparkleT = 0;

      p1 = makeHero('P1', 'falcon', false, 170, coop ? H / 2 - 50 : H / 2);
      heroes = [p1];
      var d = makeHero(coop ? 'P2' : 'AI', 'director', !coop, 110, H / 2 + 80);
      heroes.push(d);

      var salto = Number(params.saltarA);
      if (isFinite(salto) && salto > 0) {
        rt = Math.min(salto, ROUTE_END);
        while (scriptIdx < SCRIPT.length && SCRIPT[scriptIdx][0] < rt) scriptIdx++;
        phase = 'route';
        if (salto >= ROUTE_END) startBoss();
        // Atajo de pruebas: saltar casi al final = la Puerta ya está rota.
        if (salto >= FINAL_TIME - 3.4) { gate.entering = false; gate.x = gate.targetX; winBoss(); endTimer = Math.max(0.5, FINAL_TIME - salto); }
      } else {
        phase = 'intro';
        p1.x = -90; d.x = -150;
      }
    },

    exit: function () {
      enemies = []; groups = []; platforms = []; fgClouds = []; medals = []; pickups = [];
      shots = []; eShots = []; beams = []; particles = []; explosions = []; texts = []; hackBeams = [];
      gate = null; shake = 0; phase = 'exit';
    },

    update: function (dt) {
      try { step(dt); } catch (e) { if (window.console) console.warn('[vuelo] update', e); }
    },

    render: function (ctx) {
      try { draw(ctx); } catch (e) {
        if (window.console) console.warn('[vuelo] render', e);
        try { ctx.restore(); } catch (e2) { /* nada */ }
      }
    }
  };
  G.scenes.levelP2_4 = scene;

  // Herramienta de pruebas (no cambia el juego).
  scene.__debug = {
    finalTime: FINAL_TIME,
    heroes: function () { return heroes; },
    enemies: function () { return enemies; },
    medals: function () { return medals; },
    phase: function () { return phase; },
    gate: function () { return gate; },
    routeTime: function () { return rt; },
    hurt: function (i) { if (heroes && heroes[i]) hurtHero(heroes[i]); }
  };

  function step(dt) {
    t += dt; phaseT += dt;
    scroll += (phase === 'boss' || phase === 'win' ? 45 : BG_SPEED) * dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 24);
    if (flashTimer > 0) flashTimer -= dt;
    if (shieldHintT > 0) shieldHintT -= dt;

    var i, h;
    for (i = 0; i < heroes.length; i++) {
      h = heroes[i];
      if (h.invuln > 0) h.invuln = Math.max(0, h.invuln - dt);
      if (h.bump > 0) h.bump -= dt;
      if (h.shotFlash > 0) h.shotFlash -= dt;
      if (h.attackCd > 0) h.attackCd = Math.max(0, h.attackCd - dt);
      if (h.hackT > 0) {
        h.hackT = Math.max(0, h.hackT - dt);
        if (h.hackT === 0 && !h.hackReadyPrev) { h.hackReadyPrev = true; if (!h.isAI) sfx('checkpoint'); }
      }
      if (h.ko) { h.koTimer -= dt; if (h.koTimer <= 0 && (phase === 'route' || phase === 'boss')) respawnHero(h); }
    }

    if (phase === 'intro') {
      p1.x = lerp(p1.x, 170, Math.min(1, dt * 2.2));
      var d = heroes[1];
      d.x = lerp(d.x, 100, Math.min(1, dt * 2.0));
      for (i = 0; i < heroes.length; i++) {
        if (heroes[i].kind === 'falcon') particles.push({ x: heroes[i].x - 58, y: heroes[i].y + rand(-6, 9), vx: -rand(160, 240), vy: 0, life: 0.25, max: 0.25, col: '#bbf7d0', r: 2.5 });
        else jetFlame(heroes[i]);
      }
      updateEffects(dt);
      if (phaseT >= INTRO_TIME) { phase = 'route'; phaseT = 0; }
      return;
    }
    if (phase === 'lose') {
      updateEffects(dt);
      endTimer -= dt;
      if (endTimer <= 0) { phase = 'exit'; G.go('gameover', { retry: 'levelP2_4' }); }
      return;
    }
    if (phase === 'win') {
      updateEffects(dt);
      if (gate) gate.open = Math.min(1, gate.open + dt * 0.6);
      if (Math.random() < 0.4) particles.push({ x: rand(0, W), y: rand(0, H), vx: rand(-40, 40), vy: rand(-90, -30), life: rand(0.4, 0.9), max: 0.9, col: '#fde047', r: rand(1.5, 3) });
      for (i = 0; i < heroes.length; i++) {
        h = heroes[i];
        if (h.ko) continue;
        h.x = lerp(h.x, i === 0 ? 420 : 330, Math.min(1, dt * 1.5));
        h.y = lerp(h.y, i === 0 ? 280 : 340, Math.min(1, dt * 1.5));
        if (h.kind === 'director') jetFlame(h);
      }
      endTimer -= dt;
      if (endTimer <= 0) {
        phase = 'exit';
        if (G.scenes.levelDoneP2) G.go('levelDoneP2', { chapter: 4 });
        else G.go('title');
      }
      return;
    }
    if (phase !== 'route' && phase !== 'boss') return;

    // héroes
    for (i = 0; i < heroes.length; i++) {
      h = heroes[i];
      if (h.ko) continue;
      if (h.isAI) updateAI(h, dt); else updatePlayer(h, dt);
    }

    if (phase === 'route') {
      rt += dt;
      updateScript();
      // brillo que delata la medalla escondida tras la nube
      sparkleT -= dt;
      if (rt >= ROUTE_END) {
        var alive = 0;
        for (i = 0; i < enemies.length; i++) if (!enemies[i].hacked && !enemies[i].dead && enemies[i].x < W) alive++;
        if (alive <= 1 || rt >= ROUTE_END + 6) startBoss();
      }
    } else if (phase === 'boss') {
      updateBoss(dt);
    }

    for (i = groups.length - 1; i >= 0; i--) { if (!updateGroup(groups[i], dt)) { groups[i].done = true; groups.splice(i, 1); } }
    for (i = 0; i < enemies.length; i++) if (!enemies[i].dead && !enemies[i].gone) updateEnemy(enemies[i], dt);
    for (i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead || enemies[i].gone) { enemies[i].dead = true; enemies.splice(i, 1); }

    updateShots(dt);
    updateEnemyShots(dt);
    updateBeams(dt);
    updateMedals(dt);
    updatePickups(dt);
    updateEffects(dt);
  }

  // ------------------------------------------------------------------------
  //  DIBUJO
  // ------------------------------------------------------------------------
  function puff(ctx, x, y, s, col, alpha, flat) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    var pts = [[0, 0, 26], [28, -14, 30], [60, -4, 26], [86, 6, 20], [-26, 8, 20], [30, 10, 26]];
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      ctx.moveTo(x + (pts[i][0] + pts[i][2]) * s, y + pts[i][1] * s);
      ctx.arc(x + pts[i][0] * s, y + pts[i][1] * s, pts[i][2] * s, 0, 6.2832);
    }
    ctx.fill();
    if (flat) ctx.fillRect(x - 40 * s, y + 6 * s, 140 * s, 22 * s);
    ctx.restore();
  }

  function drawFallbackSky(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1d4ed8'); g.addColorStop(0.55, '#60a5fa'); g.addColorStop(1, '#bfdbfe');
    ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
    // fortaleza lejana
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#334155';
    var fx = W - 160 - ((scroll * 0.02) % 40);
    ctx.fillRect(fx, 120, 90, 110); ctx.fillRect(fx - 30, 150, 30, 80); ctx.fillRect(fx + 90, 150, 30, 80);
    ctx.restore();
    var layers = [[0.15, 0.35, 0.8, 90], [0.4, 0.5, 1.0, 300], [0.8, 0.65, 1.3, 470]];
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l], span = 1400;
      for (var k = 0; k < 4; k++) {
        var x = ((k * 360 - scroll * L[0]) % span + span) % span - 200;
        puff(ctx, x, L[3] + (k % 2) * 40, L[2], '#ffffff', L[1], false);
      }
    }
  }

  function drawPlatform(ctx, pl) {
    // nube-plataforma: esponjosa con la parte de arriba plana
    var x = pl.x, y = pl.y;
    ctx.save();
    ctx.fillStyle = 'rgba(30,41,59,0.18)';
    ctx.beginPath(); ctx.ellipse(x, y + 34, 92, 12, 0, 0, 6.2832); ctx.fill();
    var blobs = [[-70, 14, 24], [-38, 20, 30], [0, 22, 32], [40, 20, 30], [72, 14, 24]];
    ctx.beginPath();
    for (var i = 0; i < blobs.length; i++) {
      ctx.moveTo(x + blobs[i][0] + blobs[i][2], y + blobs[i][1]);
      ctx.arc(x + blobs[i][0], y + blobs[i][1], blobs[i][2], 0, 6.2832);
    }
    ctx.rect(x - 86, y, 172, 16);
    ctx.fillStyle = '#f8fafc'; ctx.fill();
    ctx.strokeStyle = 'rgba(26,26,46,0.55)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath();
    for (i = 0; i < blobs.length; i++) {
      ctx.moveTo(x + blobs[i][0] + blobs[i][2], y + blobs[i][1]);
      ctx.arc(x + blobs[i][0], y + blobs[i][1], blobs[i][2], 0, 6.2832);
    }
    ctx.rect(x - 86, y, 172, 16);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x - 84, y, 168, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.ellipse(x, y + 40, 70, 8, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  function drawFeather(ctx, s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.atan2(s.vy, s.vx));
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.quadraticCurveTo(4, -6, -10, -4); ctx.lineTo(-15, -1);
    ctx.lineTo(-15, 1); ctx.lineTo(-10, 4); ctx.quadraticCurveTo(4, 6, 14, 0); ctx.closePath();
    ctx.fillStyle = '#e5e7eb'; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(7, -3); ctx.lineTo(7, 3); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-30, -2); ctx.moveTo(-18, 2); ctx.lineTo(-26, 2); ctx.stroke();
    ctx.restore();
  }

  function drawPulse(ctx, s) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(s.x, s.y, 13, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 6.2832);
    ctx.fillStyle = '#67e8f9'; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s.x + 1.5, s.y - 1.5, 2.5, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  function drawGreen(ctx, s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.atan2(s.vy, s.vx));
    if (G.gfx && G.gfx.drawLaserBolt) G.gfx.drawLaserBolt(ctx, 0, 0, 18, '#4ade80');
    ctx.restore();
  }

  function drawOrb(ctx, s) {
    var pulse = 1 + Math.sin(t * 14 + s.x * 0.05) * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = s.orb ? '#e879f9' : '#f87171';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 1.8 * pulse, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, 6.2832);
    ctx.fillStyle = s.orb ? '#c026d3' : '#ef4444'; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff1f2';
    ctx.beginPath(); ctx.arc(s.x - 2, s.y - 2, s.r * 0.35, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  function drawBeam(ctx, b) {
    var k = b.life / b.max, hw = b.half * (0.7 + 0.3 * Math.sin(t * 40));
    var col = b.big ? '#e879f9' : '#ef4444';
    ctx.save();
    ctx.globalAlpha = 0.3 * Math.min(1, k * 3);
    ctx.fillStyle = col;
    ctx.fillRect(0, b.y - hw * 1.8, b.x1, hw * 3.6);
    ctx.globalAlpha = Math.min(1, k * 3);
    ctx.fillStyle = col;
    ctx.fillRect(0, b.y - hw, b.x1, hw * 2);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    ctx.strokeRect(-4, b.y - hw, b.x1 + 4, hw * 2);
    ctx.fillStyle = '#fff1f2';
    ctx.fillRect(0, b.y - hw * 0.35, b.x1, hw * 0.7);
    ctx.beginPath(); ctx.arc(b.x1, b.y, hw * 1.3, 0, 6.2832); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawWarnLine(ctx, x1, y, half) {
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 28);
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = t * 60;
    ctx.beginPath(); ctx.moveTo(x1, y - half); ctx.lineTo(0, y - half); ctx.moveTo(x1, y + half); ctx.lineTo(0, y + half);
    ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha *= 0.18; ctx.fillStyle = '#fbbf24'; ctx.fillRect(0, y - half, x1, half * 2);
    ctx.restore();
  }

  function exclaim(ctx, x, y) { if (G.gfx && G.gfx.drawExclamation) G.gfx.drawExclamation(ctx, x, y); }

  function drawMedal(ctx, x, y, scale, off) {
    if (art('medalla')) { P2.call('medalla', ctx, x, y, { t: t, scale: scale, apagada: !!off }); return; }
    ctx.save();
    ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = off ? '#64748b' : '#ef4444';
    ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(-2, -10); ctx.lineTo(2, -10); ctx.lineTo(8, -26); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.2832);
    ctx.fillStyle = off ? '#94a3b8' : '#fbbf24'; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = off ? '#cbd5e1' : '#fef3c7';
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.5 : 8;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawMecha(ctx, h) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.tilt);
    var sc = variant === 'B' ? MECHA_SC_B : MECHA_SC_A;
    if (!P2.call('mechaHalcon', ctx, 0, 0, { variant: variant, modo: 'vuelo', scale: sc, facing: 1, piloto: true })) {
      // respaldo: halcón sencillo
      ctx.scale(sc / 0.6, sc / 0.6);
      ctx.fillStyle = '#22c55e'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 36, 16, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d1d5db';
      ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-40, -34); ctx.lineTo(10, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.moveTo(34, -4); ctx.lineTo(50, 2); ctx.lineTo(34, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawDirectorJet(ctx, h) {
    var feet = h.y + 26, sc = 0.9;
    var llama = 0.6 + 0.4 * Math.abs(Math.sin(t * 18));
    ctx.save();
    ctx.translate(h.x, feet); ctx.rotate(h.tilt); ctx.translate(-h.x, -feet);
    if (!P2.call('jetpack', ctx, h.x, feet, { facing: 1, scale: sc, llama: llama })) {
      // respaldo: mochila con dos toberas y llama
      ctx.save();
      ctx.translate(h.x - 12, feet - 34);
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.moveTo(-6, 16); ctx.quadraticCurveTo(-3, 16 + 22 * llama, 0, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.moveTo(-5, 16); ctx.quadraticCurveTo(-3, 16 + 12 * llama, -1, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#94a3b8'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(-9, -4, 12, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(-6, 0, 6, 4);
      ctx.restore();
    }
    if (G.gfx && G.gfx.drawDirector) G.gfx.drawDirector(ctx, h.x, feet, { t: t, facing: 1, pose: 'jump', scale: sc });
    ctx.restore();
  }

  function drawEnemy(ctx, e) {
    var flashOn = e.flash > 0;
    if (e.type === 'enjambre') {
      P2.call('dronEnjambre', ctx, e.x, e.y, { scale: 1.25, facing: e.hacked ? 1 : -1, hacked: e.hacked });
    } else if (e.type === 'rayo') {
      P2.call('dronRayo', ctx, e.x, e.y, { scale: 1.2, facing: e.hacked ? 1 : -1, hacked: e.hacked,
        cargando: e.state === 'charge' || e.state === 'beam', aturdido: e.stun > 0 });
      if (!e.hacked && e.hp < e.maxHp) miniBar(ctx, e.x, e.y - 40, 36, e.hp / e.maxHp);
    } else if (e.type === 'picado') {
      P2.call('dronPicado', ctx, e.x, e.y, { scale: 1.2, angle: e.hacked ? 0 : e.angle, hacked: e.hacked });
    } else if (e.type === 'torreta') {
      P2.call('miniTorreta', ctx, e.x, e.y, { scale: 1.3, hacked: e.hacked, angle: e.angle });
      if (!e.hacked && e.hp < e.maxHp) miniBar(ctx, e.x, e.y - 66, 36, e.hp / e.maxHp);
    }
    if (flashOn) {
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(e.x, e.y + (e.hy || 0), e.r, 0, 6.2832); ctx.fill(); ctx.restore();
    }
    if (e.hacked && e.allyTime < 2 && Math.floor(t * 8) % 2 === 0) {
      ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y + (e.hy || 0), e.r + 6, 0, 6.2832); ctx.stroke(); ctx.restore();
    }
  }

  // Avisos (siempre por encima de las nubes del frente para que se vean).
  function drawTelegraphs(ctx) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hacked) continue;
      if (e.type === 'enjambre' && e.state === 'warn') exclaim(ctx, e.x, e.y - 30);
      else if (e.type === 'rayo' && e.state === 'charge') { drawWarnLine(ctx, e.x - 25, e.beamY, 15); exclaim(ctx, e.x, e.y - 46); }
      else if (e.type === 'picado' && e.state === 'warn') exclaim(ctx, e.x, e.y - 32);
      else if (e.type === 'torreta' && e.warn > 0) exclaim(ctx, e.x, e.y - 80);
    }
    if (gate && phase === 'boss' && !gate.entering) {
      for (var k = 0; k < gate.turrets.length; k++) {
        var tu = gate.turrets[k];
        if (tu.alive && !tu.hacked && tu.warn > 0) exclaim(ctx, gate.x - 10, tu.oy - 80);
      }
      if (gate.atkState === 'tele') {
        var c = corePos();
        drawWarnLine(ctx, c.x - 42, c.y, 24);
        exclaim(ctx, c.x, c.y - 62);
      }
    }
  }

  function miniBar(ctx, cx, y, w, frac) {
    ctx.save();
    ctx.fillStyle = 'rgba(15,23,42,0.8)'; ctx.fillRect(cx - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = '#f87171'; ctx.fillRect(cx - w / 2, y, w * clamp(frac, 0, 1), 4);
    ctx.restore();
  }

  // --- Dibujo de la Puerta de la fortaleza ------------------------------------
  function drawGate(ctx) {
    if (!gate) return;
    var gx = gate.x, P = hasP2() ? P2 : null;
    var E = (P && P.PAL) ? P.PAL.enemy : { STEEL: '#64748b', STEEL_D: '#475569', STEEL_DD: '#334155', DARK: '#1e293b', RED: '#7f1d1d', RED_L: '#ef4444', EYE: '#ff4d4d', BRONZE: '#b87333' };
    ctx.save();
    ctx.lineJoin = 'round';
    // torre
    ctx.fillStyle = E.STEEL_D; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.fillRect(gx, 40, 330, 520); ctx.strokeRect(gx, 40, 330, 520);
    // bloques
    ctx.strokeStyle = 'rgba(26,26,46,0.35)'; ctx.lineWidth = 2;
    for (var row = 0; row < 12; row++) {
      var by = 40 + row * 42;
      ctx.beginPath(); ctx.moveTo(gx, by); ctx.lineTo(gx + 330, by); ctx.stroke();
      for (var col = 0; col < 6; col++) {
        var bx = gx + col * 60 + (row % 2 ? 30 : 0);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + 42); ctx.stroke();
      }
    }
    // almenas
    ctx.fillStyle = E.STEEL; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    for (var a = 0; a < 6; a++) { ctx.fillRect(gx + a * 60, 14, 36, 30); ctx.strokeRect(gx + a * 60, 14, 36, 30); }
    // estandartes rojos
    ctx.fillStyle = E.RED;
    [gx + 12, gx + 260].forEach(function (sx) {
      ctx.beginPath(); ctx.moveTo(sx, 60); ctx.lineTo(sx + 36, 60); ctx.lineTo(sx + 36, 150); ctx.lineTo(sx + 18, 136); ctx.lineTo(sx, 150); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (P) P.horns(ctx, sx + 18, 104, 0.55, E.BRONZE);
    });
    // puerta (dos hojas que se abren al ganar)
    var doorL = gx + 40, doorR = gx + 220, doorT = 140, doorB = 540, mid = (doorL + doorR) / 2;
    var open = gate.open * 80;
    // luz de dentro
    if (gate.open > 0) {
      var lg = ctx.createLinearGradient(mid - 80, 0, mid + 80, 0);
      lg.addColorStop(0, '#fde68a'); lg.addColorStop(0.5, '#fffbeb'); lg.addColorStop(1, '#fde68a');
      ctx.fillStyle = lg; ctx.fillRect(doorL, doorT, doorR - doorL, doorB - doorT);
    } else {
      ctx.fillStyle = '#0f172a'; ctx.fillRect(doorL, doorT, doorR - doorL, doorB - doorT);
    }
    [[doorL - open, mid - open], [mid + open, doorR + open]].forEach(function (lf) {
      ctx.fillStyle = E.STEEL; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      ctx.fillRect(lf[0], doorT, lf[1] - lf[0], doorB - doorT); ctx.strokeRect(lf[0], doorT, lf[1] - lf[0], doorB - doorT);
      ctx.fillStyle = E.BRONZE;
      [200, 290, 400, 480].forEach(function (yy) {
        ctx.fillRect(lf[0], yy, lf[1] - lf[0], 10); ctx.strokeRect(lf[0], yy, lf[1] - lf[0], 10);
        ctx.fillStyle = '#fde68a';
        for (var rx = lf[0] + 12; rx < lf[1] - 6; rx += 22) { ctx.beginPath(); ctx.arc(rx, yy + 5, 2, 0, 6.2832); ctx.fill(); }
        ctx.fillStyle = E.BRONZE;
      });
    });
    // arco sobre la puerta
    ctx.strokeStyle = OUT; ctx.lineWidth = 5;
    ctx.strokeRect(doorL, doorT, doorR - doorL, doorB - doorT);
    // gran marca de los cuernos de Dark Toros
    if (P) P.horns(ctx, mid, 118, 2.6, E.BRONZE);
    // repisas de las mini-torretas
    for (var i = 0; i < gate.turrets.length; i++) {
      var tu = gate.turrets[i];
      ctx.fillStyle = E.STEEL_DD; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      ctx.fillRect(gx - 40, tu.oy, 46, 14); ctx.strokeRect(gx - 40, tu.oy, 46, 14);
      ctx.beginPath(); ctx.moveTo(gx - 30, tu.oy + 14); ctx.lineTo(gx, tu.oy + 34); ctx.lineTo(gx, tu.oy + 14); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // nubes en la base
    puff(ctx, gx - 30, 520, 1.1, '#f8fafc', 0.95, false);
    puff(ctx, gx + 150, 528, 1.2, '#f8fafc', 0.95, false);

    if (gate.open <= 0) {
      drawCore(ctx, E);
      drawGenerator(ctx, E);
    }
    // mini-torretas
    for (i = 0; i < gate.turrets.length; i++) {
      tu = gate.turrets[i];
      if (!tu.alive) continue;
      P2.call('miniTorreta', ctx, gx - 10, tu.oy, { scale: 1.3, hacked: tu.hacked, angle: tu.angle });
      if (tu.flash > 0) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx - 10, tu.oy - 39, 22, 0, 6.2832); ctx.fill(); ctx.restore(); }
      if (!tu.hacked && tu.hp < tu.maxHp) miniBar(ctx, gx - 10, tu.oy - 72, 36, tu.hp / tu.maxHp);
    }
    ctx.restore();
  }

  function drawCore(ctx, E) {
    var c = corePos();
    // cerradura-ojo
    ctx.save();
    ctx.fillStyle = E.DARK; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(c.x, c.y, 44, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = E.RED;
    ctx.beginPath(); ctx.arc(c.x, c.y, 32, 0, 6.2832); ctx.fill(); ctx.stroke();
    var eye = gate.core.flash > 0 ? '#ffffff' : E.EYE;
    if (hasP2()) P2.eyeLight(ctx, c.x, c.y, 15 + Math.sin(t * 4) * 1.5, eye);
    else { ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(c.x, c.y, 15, 0, 6.2832); ctx.fill(); }
    // remaches
    ctx.fillStyle = '#94a3b8';
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * 38, c.y + Math.sin(a) * 38, 2.5, 0, 6.2832); ctx.fill(); }
    // escudo
    if (shieldOn()) {
      var g = genPos();
      ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 10);
      ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(g.x, g.y + 26); ctx.lineTo(c.x, c.y - gate.shieldR); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.22 + 0.06 * Math.sin(t * 6);
      ctx.fillStyle = '#e879f9';
      ctx.beginPath(); ctx.arc(c.x, c.y, gate.shieldR, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#f5d0fe'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(c.x, c.y, gate.shieldR, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
      for (var k = 0; k < 6; k++) {
        var aa = k * Math.PI / 3 + t * 0.6;
        ctx.beginPath(); ctx.arc(c.x + Math.cos(aa) * gate.shieldR * 0.55, c.y + Math.sin(aa) * gate.shieldR * 0.55, gate.shieldR * 0.3, 0, 6.2832); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawGenerator(ctx, E) {
    var g = genPos(), gen = gate.gen;
    ctx.save();
    if (!gen.alive) {
      // restos humeantes
      ctx.fillStyle = E.STEEL_DD; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      ctx.fillRect(g.x - 22, g.y + 10, 44, 16); ctx.strokeRect(g.x - 22, g.y + 10, 44, 16);
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.arc(g.x - 6 + Math.sin(t * 2) * 4, g.y - 6 - (t * 20) % 20, 7, 0, 6.2832); ctx.fill();
      ctx.restore();
      return;
    }
    var stunned = gen.stun > 0;
    // base
    ctx.fillStyle = E.STEEL_DD; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.fillRect(g.x - 26, g.y + 8, 52, 20); ctx.strokeRect(g.x - 26, g.y + 8, 52, 20);
    // antenas
    ctx.beginPath(); ctx.moveTo(g.x - 18, g.y + 8); ctx.lineTo(g.x - 24, g.y - 26); ctx.moveTo(g.x + 18, g.y + 8); ctx.lineTo(g.x + 24, g.y - 26); ctx.stroke();
    ctx.fillStyle = stunned ? '#64748b' : E.RED_L;
    ctx.beginPath(); ctx.arc(g.x - 24, g.y - 28, 4, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(g.x + 24, g.y - 28, 4, 0, 6.2832); ctx.fill(); ctx.stroke();
    // cristal que gira
    var col = gen.flash > 0 ? '#ffffff' : (stunned ? '#94a3b8' : '#e879f9');
    ctx.save();
    ctx.translate(g.x, g.y - 6);
    ctx.rotate(stunned ? 0 : Math.sin(t * 2) * 0.2);
    if (!stunned) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#f0abfc'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(13, 0); ctx.lineTo(0, 16); ctx.lineTo(-13, 0); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(3, -4); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
    // anillo orbital
    if (!stunned) {
      ctx.strokeStyle = '#f5d0fe'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(g.x, g.y - 6, 26, 7, 0, t * 3, t * 3 + 4.4); ctx.stroke();
    } else {
      spark(g.x + rand(-10, 10), g.y - 6, 1, '#fde047', 20, 60);
    }
    if (gen.hp < gen.maxHp) miniBar(ctx, g.x, g.y - 44, 44, gen.hp / gen.maxHp);
    ctx.restore();
  }

  // --- HUD ------------------------------------------------------------------
  function drawCdRing(ctx, cx, cy, frac, letter, label, accent) {
    var r = 20;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832);
    ctx.fillStyle = 'rgba(15,23,42,0.72)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r - 3, -Math.PI / 2, -Math.PI / 2 + clamp(frac, 0, 1) * 6.2832);
    ctx.closePath();
    ctx.fillStyle = frac >= 1 ? accent.ready : accent.fill; ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, cx, cy + 1);
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
    var lab = frac >= 1 ? label : 'CARGANDO';
    ctx.strokeText(lab, cx, cy + r + 11);
    ctx.fillStyle = frac >= 1 ? accent.lab : '#94a3b8';
    ctx.fillText(lab, cx, cy + r + 11);
    if (frac >= 1) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 6);
      ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, 6.2832);
      ctx.strokeStyle = accent.glow; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }

  var ACC_HACK = { ready: '#22c55e', fill: '#15803d', lab: '#86efac', glow: '#4ade80' };
  var ACC_DASH = { ready: '#f59e0b', fill: '#92400e', lab: '#fde68a', glow: '#fbbf24' };
  var ACC_DIR = { ready: '#22d3ee', fill: '#0e7490', lab: '#a5f3fc', glow: '#67e8ff' };

  function heroHud(ctx, h, x1, x2, y, kAtk, kHack) {
    if (!h) return;
    var atkFrac = h.attackCd > 0 ? 1 - h.attackCd / (h.kind === 'falcon' ? DASH_CD : BURST_CD) : 1;
    var hackFrac = h.hackT > 0 ? 1 - h.hackT / HACK_CD : 1;
    drawCdRing(ctx, x1, y, atkFrac, kAtk, h.kind === 'falcon' ? 'PICADO' : 'RÁFAGA', h.kind === 'falcon' ? ACC_DASH : ACC_DIR);
    drawCdRing(ctx, x2, y, hackFrac, kHack, 'HACKEO', ACC_HACK);
  }

  function label(ctx, txt, x, y, size, col) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.25); ctx.strokeStyle = OUT;
    ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function drawHud(ctx) {
    if (G.ui && G.ui.drawHearts) G.ui.drawHearts(ctx);
    if (!coop) heroHud(ctx, p1, W - 110, W - 50, 44, 'J', 'H');
    else {
      heroHud(ctx, p1, 34, 92, 108, 'F', 'R');
      heroHud(ctx, heroes[1], W - 92, W - 34, 108, 'K', 'Ñ');
      for (var i = 0; i < heroes.length; i++) {
        var h = heroes[i];
        if (h.ko) label(ctx, h.id + ' vuelve en ' + Math.max(0, Math.ceil(h.koTimer)) + ' s', i === 0 ? W * 0.3 : W * 0.7, H / 2, 20, h.kind === 'falcon' ? '#86efac' : '#67e8ff');
      }
    }
    // progreso del recorrido
    if (phase === 'route' || phase === 'intro') {
      var frac = clamp(rt / ROUTE_END, 0, 1), bw = 220, bx = W / 2 - bw / 2, by = 16;
      ctx.save();
      ctx.fillStyle = 'rgba(15,23,42,0.65)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(bx, by, bw * frac, 8);
      ctx.restore();
      label(ctx, frac >= 1 ? '¡La Puerta de la fortaleza!' : 'Rumbo a la fortaleza', W / 2, by - 6 + 0, 11, '#e0f2fe');
    }
    // medallas del intento
    var rm = runMedals();
    for (var m = 0; m < 3; m++) drawMedal(ctx, W / 2 - 26 + m * 26, 44, 0.5, !rm[m]);

    if (phase === 'boss' && gate && G.ui && G.ui.drawBossBar) {
      G.ui.drawBossBar(ctx, gate.core.hp / gate.core.maxHp, 'Puerta de la fortaleza');
    }
    if (hint && G.ui && G.ui.hint && phase !== 'win') G.ui.hint(ctx, hint.txt);

    if (phase === 'intro') {
      var a = clamp(phaseT < 0.3 ? phaseT / 0.3 : (INTRO_TIME - phaseT) / 0.5, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      label(ctx, 'Capítulo 4: Vuelo al cielo', W / 2, H / 2 - 30, 42, '#fde047');
      label(ctx, '¡Rumbo a la fortaleza de Dark Secuaz!', W / 2, H / 2 + 18, 22, '#e0f2fe');
      ctx.restore();
    }
    if (phase === 'win') {
      label(ctx, '¡La puerta está abierta!', W / 2, H / 2 - 120, 40, '#fde047');
      label(ctx, '¡Adelante, héroes!', W / 2, H / 2 - 76, 22, '#e0f2fe');
    }
  }

  function draw(ctx) {
    var sx = 0, sy = 0;
    if (shake > 0) { sx = rand(-shake, shake); sy = rand(-shake, shake); }
    ctx.save();
    ctx.translate(sx, sy);

    // fondo
    if (!P2.call('bgCielo', ctx, scroll, t)) drawFallbackSky(ctx);

    var i;
    for (i = 0; i < platforms.length; i++) drawPlatform(ctx, platforms[i]);
    drawGate(ctx);

    // medallas
    for (i = 0; i < medals.length; i++) {
      var md = medals[i];
      drawMedal(ctx, md.x, md.y + Math.sin(md.bob * 3) * 4, 1, false);
    }
    // corazones
    for (i = 0; i < pickups.length; i++) {
      var pk = pickups[i];
      if (pk.t > 11 && Math.floor(pk.t * 8) % 2 === 0) continue;
      if (G.gfx && G.gfx.drawHeart) G.gfx.drawHeart(ctx, pk.x, pk.y, 24, 'full');
    }
    // enemigos
    for (i = 0; i < enemies.length; i++) drawEnemy(ctx, enemies[i]);
    // rayos enemigos y balas
    for (i = 0; i < beams.length; i++) drawBeam(ctx, beams[i]);
    for (i = 0; i < eShots.length; i++) drawOrb(ctx, eShots[i]);
    // disparos aliados
    for (i = 0; i < shots.length; i++) {
      var s = shots[i];
      if (s.kind === 'pluma') drawFeather(ctx, s);
      else if (s.kind === 'pulso') drawPulse(ctx, s);
      else drawGreen(ctx, s);
    }
    // héroes (el Director detrás del mecha)
    for (i = heroes.length - 1; i >= 0; i--) {
      var h = heroes[i];
      if (h.ko) continue;
      if ((h.invuln > 0 || h.bump > 0) && Math.floor(t * 20) % 2 === 0) continue;
      if (h.kind === 'falcon') drawMecha(ctx, h); else drawDirectorJet(ctx, h);
      if (coop && phase !== 'intro') label(ctx, h.id, h.x, h.y - (h.kind === 'falcon' ? (variant === 'B' ? 54 : 78) : 50), 12, h.kind === 'falcon' ? '#86efac' : '#67e8ff');
    }
    // partículas
    for (i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.col;
      if (p.bolt) { ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5); ctx.strokeRect(p.x - 2.5, p.y - 2.5, 5, 5); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
      ctx.restore();
    }
    for (i = 0; i < explosions.length; i++) {
      var ex = explosions[i];
      if (G.gfx && G.gfx.drawExplosion) G.gfx.drawExplosion(ctx, ex.x, ex.y, 1 - ex.life / ex.max, ex.r);
    }
    for (i = 0; i < hackBeams.length; i++) {
      var hb = hackBeams[i];
      if (G.gfx && G.gfx.drawHackBeam) G.gfx.drawHackBeam(ctx, hb.x1, hb.y1, hb.x2, hb.y2, t);
    }
    // nubes del frente (algunas esconden medallas)
    for (i = 0; i < fgClouds.length; i++) {
      var fc = fgClouds[i];
      puff(ctx, fc.x, fc.y, fc.s * 1.6, '#ffffff', 0.92, false);
      puff(ctx, fc.x + 14 * fc.s, fc.y + 10 * fc.s, fc.s * 1.3, '#e2e8f0', 0.6, false);
    }
    // un brillo delata la medalla escondida
    for (i = 0; i < medals.length; i++) {
      if (medals[i].idx === 1 && G.gfx && G.gfx.drawSparkle) G.gfx.drawSparkle(ctx, medals[i].x + 30, medals[i].y - 46, (Math.sin(t * 5) + 1) / 2);
    }
    drawTelegraphs(ctx);
    for (i = 0; i < texts.length; i++) {
      var tx = texts[i];
      ctx.save(); ctx.globalAlpha = clamp(tx.life / 0.4, 0, 1);
      label(ctx, tx.txt, tx.x, tx.y, 18, tx.col);
      ctx.restore();
    }

    ctx.restore(); // fin del temblor

    if (flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(flashTimer / 0.25, 0, 1) * 0.3;
      ctx.fillStyle = '#ff4d4d'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    drawHud(ctx);
  }

  // P2 puede no existir en algún test: un P2.call vacío que nunca dibuja.
  var P2 = window.P2 && typeof window.P2.call === 'function' ? window.P2 : { call: function () { return false; }, fn: {} };
})();
