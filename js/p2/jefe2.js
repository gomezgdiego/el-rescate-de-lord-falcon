// jefe2.js — El Rescate de Lord Falcon · PARTE 2 "La Gema Robada"
// Capítulo 5 "Fortaleza en el cielo": la pelea final contra DARK SECUAZ.
// Registra G.scenes.levelP2_5. Es una copia evolucionada de js/boss.js (Parte 1).
//
//   FASE 1 "Distraer y robar": la gema está en un bolsillo con candado y NO se
//     puede hackear. Los golpes hacen 0 de daño pero lo DISTRAEN (se gira 2.5 s
//     hacia quien le pegó). Si el OTRO héroe llega a su bolsillo y pulsa hackear,
//     da un "tirón" (3 tirones rompen el candado). Sin distraerlo: ¡manotazo!
//   FASE 2 "Flecha al bolsillo": tras su puñetazo al suelo se queda atascado 3 s y
//     el bolsillo brilla: Lord Falcon lanza la FLECHA CERTERA (hackear). La gema sale
//     volando y rebota: ¡hay que tocarla antes que él! (y un dron espía la escanea).
//   FASE 3 "Pelea de gigantes": Dark Secuaz GIGANTE contra el ROBOT FUSIÓN.
//   VICTORIA: cinemática → G.go('levelDoneP2', {chapter: 5}).
//
// Reglas de Juanjo: hp en MEDIOS corazones; puñetazos, onda y puños-cohete = 2;
// orbes y rayos de torreta = 1; 1.2 s de invulnerabilidad tras cada golpe.
// Atajos de prueba (contrato §11): enter({fase: 1|2|3|'victoria'}) o ?fase=… en la
// URL; G.p2.debugInvulnerable = true → los héroes no reciben daño.
// Coordenadas de MUNDO: en las fases 1 y 2 coinciden con la pantalla (960x540);
// en la fase 3 la cámara se aleja (zoom) alrededor del punto (480, suelo).

window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  // ============================================================
  //  CONSTANTES
  // ============================================================
  var W = 960, H = 540;
  var GROUND_Y = 470;                 // pies en el suelo de la arena
  var GRAV = 1800, JUMP_V = -640;     // física de la Parte 1
  var ARENA_L = 30, ARENA_R = 930;
  var PLATS = [{ x: 72, y: 350, w: 144 }, { x: 744, y: 350, w: 144 }];
  var SS = 1.65;                      // escala de Dark Secuaz (diseño aprobado ×1.65)
  var BOSS_MINX = 240, BOSS_MAXX = 720;
  var ZOOM3 = 0.667;                  // cámara alejada de la pelea de gigantes
  var A3_L = -170, A3_R = 1130;       // límites del mundo en la fase 3
  var FS = 1.15;                      // escala del robot fusión
  var GS = 1.55;                      // escala del gigante (secuazGigante ya multiplica ×1.2)
  var GR = GS / 1.3;                  // factor de tamaño del gigante para sus distancias
  var GKS = 1.2 * GS;                 // de coordenadas del dibujo del gigante a mundo
  var GIANT_HP = 44;
  var O = '#1a1a2e';
  var FONT = 'system-ui, "Segoe UI", Arial, sans-serif';
  var PI = Math.PI;
  var WEAPON_OK = { espada: 1, arco: 1, guantes: 1, pulso: 1, bumeran: 1, red: 1, jetpack: 1 };
  var RANGED_ORDER = ['arco', 'pulso', 'bumeran', 'red'];
  var WCD = { espada: 0.35, guantes: 0.5, arco: 0.28, pulso: 0.7, bumeran: 0.3, red: 1.2 };
  var KEYS_1P = ['J', 'K'], KEYS_P1 = ['F', 'G'], KEYS_P2 = ['K', 'L'];
  var EN = { STEEL: '#64748b', STEEL_D: '#475569', STEEL_DD: '#334155', DARK: '#1e293b',
             RED: '#7f1d1d', RED_L: '#ef4444', EYE: '#ff4d4d', BRONZE: '#b87333', GEM: '#e11d48' };
  var GOOD = { RED: '#15803d', RED_L: '#22c55e', EYE: '#86efac' };
  // Torretas del gigante (coordenadas del dibujo de P2.fn.secuazGigante, escala 1).
  var TURRET_DEF = [
    { lx: 58, ly: -147, r: 15 }, { lx: -58, ly: -147, r: 15 },   // hombros
    { lx: 88, ly: -94, r: 12 }, { lx: -88, ly: -94, r: 12 },     // brazos
    { lx: 94, ly: -58, r: 10 }, { lx: -94, ly: -58, r: 10 },     // puños
    { lx: 93, ly: -143, r: 12 }, { lx: -93, ly: -143, r: 12 },   // espalda
    { lx: 50, ly: -177, r: 12 }, { lx: -50, ly: -177, r: 12 }    // mástiles
  ];

  // ============================================================
  //  UTILIDADES
  // ============================================================
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function sign(v) { return v < 0 ? -1 : 1; }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function dist(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
  function angLerp(a, b, k) { var d = ((b - a) % (2 * PI) + 3 * PI) % (2 * PI) - PI; return a + d * k; }
  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* nada */ } }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) { /* nada */ } }
  function isCoop() { return !!(G.state && G.state.coop); }
  function debugInv() { return !!(G.p2 && G.p2.debugInvulnerable); }
  var NULL_INPUT = { held: function () { return false; }, pressed: function () { return false; } };
  function inp1() { return G.input || NULL_INPUT; }
  function inp2() { return (isCoop() && G.input2) ? G.input2 : NULL_INPUT; }
  var P1INPUT = { held: function (n) { return inp1().held(n); }, pressed: function (n) { return inp1().pressed(n); } };
  var P2INPUT = { held: function (n) { return inp2().held(n); }, pressed: function (n) { return inp2().pressed(n); } };
  function hasArt(name) { return !!(window.P2 && P2.fn && typeof P2.fn[name] === 'function'); }
  // P2.call seguro: devuelve true si la pieza de arte existía (y se dibujó).
  function art() {
    if (!window.P2 || typeof P2.call !== 'function') return false;
    try { return P2.call.apply(P2, arguments); } catch (e) { return false; }
  }
  function gfx(name, args) {
    if (G.gfx && typeof G.gfx[name] === 'function') {
      try { G.gfx[name].apply(G.gfx, args); return true; } catch (e) { /* nunca romper el render */ }
    }
    return false;
  }
  function pal() { return (window.P2 && P2.PAL && P2.PAL.enemy) ? P2.PAL.enemy : EN; }
  var warned = false;
  function warnOnce(e) {
    if (warned) return;
    warned = true;
    try { if (window.console && console.warn) console.warn('[jefe2] ', e); } catch (e2) { /* nada */ }
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function rfill(ctx, x, y, w, h, r, fill, stroke, lw) {
    rrect(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke(); }
  }
  function circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke(); }
  }
  function star(ctx, x, y, r, fill, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = (rot || 0) + i * PI / 5 - PI / 2, rr = (i % 2 === 0) ? r : r * 0.45;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = O; ctx.lineWidth = 1.8; ctx.stroke();
  }
  function outlined(ctx, text, x, y, size, fill) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(3, size * 0.26); ctx.strokeStyle = O; ctx.strokeText(text, x, y);
    ctx.fillStyle = fill || '#fef3c7'; ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ============================================================
  //  ESTADO DE LA ESCENA (se reinicia ENTERO en enter())
  // ============================================================
  var scene = {};
  var retryPhase = null;   // punto de control al reintentar tras perder (sobrevive a exit)

  var clock, mode, phase, checkpoint;
  var heroes, boss, projs, waves, orbs, parts, texts, msg;
  var camShake, flash, zoom, fade, hackMsgCd, loseGuard, doneGuard;
  var gem, gemSaved, spy, spyDone, cert;
  var t3, flyers, vehicles;
  var fusion, giant, bolts, shots, beam, p3T, p3intro;
  var vt, vic, escapees;

  // Solo lectura, para los tests (tests/smoke.js): el estado de la pelea.
  scene.__debug = {
    state: function () {
      var pk = null;
      try { if (boss && mode === 'p12') pk = pocketPos(true); } catch (e) { pk = null; }
      return {
        mode: mode, phase: phase,
        bossX: boss ? boss.x : null, bossState: boss ? boss.state : null,
        distractByAI: !!(boss && boss.distractBy && boss.distractBy.isAI),
        distractByPlayer: !!(boss && boss.distractBy && !boss.distractBy.isAI),
        lockCracks: boss ? boss.lockCracks : null,
        pocket: pk ? { x: pk.x, y: pk.y } : null,
        gem: gem ? { x: gem.x, y: gem.y, held: !!gem.held } : null,
        fusionX: fusion ? fusion.x : null, giantX: giant ? giant.x : null, giantHp: giant ? giant.hp : null
      };
    },
    heroes: function () { return heroes || []; }
  };

  function showMsg(text, t) { msg = { text: text, t: t || 2.4 }; }
  function addParts(x, y, color, n, spd, kind) {
    n = n || 8;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * PI * 2, s = (spd || 140) * (0.4 + Math.random() * 0.8);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.4, t: 0,
        color: color || '#ffd166', r: 3 + Math.random() * 3, kind: kind || 'dot' });
    }
    if (parts.length > 260) parts.splice(0, parts.length - 260);
  }
  function addText(x, y, text, color, size) {
    var m = mode === 'p12' ? 130 : 0;
    texts.push({ x: m ? clamp(x, m, W - m) : x, y: y, text: text, color: color || '#fde68a', size: size || 20, t: 0, life: 1.4 });
  }

  // ============================================================
  //  HÉROES
  // ============================================================
  function loadoutFor(heroe) {
    var def = heroe === 'falcon' ? ['espada', 'arco'] : ['guantes', 'pulso'];
    var L = G.p2 && G.p2.loadout && G.p2.loadout[heroe];
    if (!L || L.length < 2) return def.slice();
    var out = [WEAPON_OK[L[0]] ? L[0] : def[0], WEAPON_OK[L[1]] ? L[1] : def[1]];
    if (out[0] === out[1]) out = def.slice();
    return out;
  }
  function urlParam(name) {
    try {
      if (typeof location === 'undefined' || !location.search) return null;
      return new URLSearchParams(location.search).get(name);
    } catch (e) { return null; }
  }
  function makeAIInput(h) {
    return { held: function (n) { return !!h.ai.hold[n]; }, pressed: function (n) { return !!h.ai.press[n]; } };
  }
  function makeHero(heroe, ctrl, x) {
    var h = {
      heroe: heroe, ctrl: ctrl, isAI: ctrl === 'ai',
      x: x, y: GROUND_Y, vx: 0, vy: 0, w: 34, h: 58, facing: 1,
      onGround: true, coyote: 0, jumpBuf: 0, jumpsLeft: 0,
      inv: 0, hurtT: 0, pose: 'idle', weapons: loadoutFor(heroe), cd: [0, 0], cdMax: [1, 1],
      anim: null, fuel: 2.5, jetOn: false, jetSfx: 0, bumOut: false, ko: -1, actT: 0,
      hidden: false, holdGem: false,
      ai: { hold: {}, press: {}, t: 0, distractT: 3, pullT: 0, shotT: 0, react: 0 }
    };
    h.inp = ctrl === 'p1' ? P1INPUT : (ctrl === 'p2' ? P2INPUT : makeAIInput(h));
    return h;
  }
  function makeHeroes() {
    var h1;
    if (G.p2) h1 = (G.p2.hero === 'falcon') ? 'falcon' : 'director';
    else h1 = (urlParam('heroe') === 'falcon') ? 'falcon' : 'director';
    var h2 = h1 === 'falcon' ? 'director' : 'falcon';
    return [makeHero(h1, 'p1', 240), makeHero(h2, isCoop() ? 'p2' : 'ai', 150)];
  }
  function heroRect(h) { return { x: h.x - h.w / 2, y: h.y - h.h, w: h.w, h: h.h }; }
  function heroHp(h) { return h.ctrl === 'p2' ? (G.state.hp2 || 0) : (G.state.hp || 0); }
  function setHeroHp(h, v) { if (h.ctrl === 'p2') G.state.hp2 = v; else G.state.hp = v; }
  function maxHpOf(h) { return h.ctrl === 'p2' ? (G.state.maxHp2 || 10) : (G.state.maxHp || 10); }
  function otherHero(h) { return heroes[0] === h ? heroes[1] : heroes[0]; }
  function falconHero() { return heroes[0].heroe === 'falcon' ? heroes[0] : heroes[1]; }
  function keyHack(h) { return !isCoop() ? 'H' : (h.ctrl === 'p1' ? 'R' : 'Ñ'); }
  function heroAlive(h) { return h && h.ko < 0 && !h.hidden; }

  // ============================================================
  //  DARK SECUAZ (fases 1 y 2)
  // ============================================================
  function makeFist() { return { mode: 'home', x: 0, y: 0, vx: 0, ty: 0, dist: 0, ext: 0, tx: 0, tyy: 0 }; }
  function makeBoss() {
    return {
      x: 660, y: GROUND_Y, yOff: 0, vy: 0, bobY: 0, walkPh: 0, walking: false,
      facing: -1, vis: 1, lean: 0, leanT: 0, sy: 1, syT: 1, scale: 1,
      aimA: PI + 0.45, aimT: PI + 0.45,
      state: 'think', sub: '', st: 0, thinkT: 1.4, attackCount: 0, last: '', target: null, tele: 0,
      distractT: 0, distractBy: null, distractCd: 0, pending: null, emote: null,
      lockCracks: 0, lockShake: 0, pocketBroken: false, hasGem: true, forceSlam: false,
      fF: makeFist(), fB: makeFist(), stuckT: 0, slamTX: 660, landed: false,
      jabI: 0, jabN: 0, jabT: 0, orbI: 0, orbT: 0, second: false, firstLow: true, planTy: 0,
      swatTarget: null, swatHit: false, hitT: 0, good: false, hidden: false, alert: false
    };
  }
  // Coordenadas locales del dibujo aprobado (escala 1, pies en 0,0) → mundo.
  // El cuerpo está de frente: "mirar" a un lado es girar el cañón y reflejar el
  // dibujo, de modo que el bolsillo queda SIEMPRE en el lado contrario a su mirada.
  function bossL2W(lx, ly, logic) {
    var b = boss, m = logic ? -b.facing : b.vis, k = SS * b.scale;
    var X = lx * k * m, Y = ly * k * b.sy;
    var c = Math.cos(b.lean), s = Math.sin(b.lean);
    return { x: b.x + X * c - Y * s, y: b.y + b.yOff + b.bobY + X * s + Y * c };
  }
  function pocketPos(logic) { return bossL2W(28, -60, logic); }
  function homeF(front) { return bossL2W(front ? -63 : 63, -61, false); }
  function headPos() { return bossL2W(0, -173, false); }
  function muzzle() {
    var p = bossL2W(0, -173.2, false);
    return { x: p.x + Math.cos(boss.aimA) * 60 * SS, y: p.y + Math.sin(boss.aimA) * 60 * SS };
  }
  function bossRect() {
    return { x: boss.x - 52 * SS, y: boss.y + boss.yOff - 180 * SS, w: 104 * SS, h: 180 * SS };
  }
  function teleTime() { return phase === 1 ? 0.85 : 0.7; }
  function defaultAim(f) { return f > 0 ? -0.45 : PI + 0.45; }

  function pickTarget() {
    var alive = [];
    for (var i = 0; i < heroes.length; i++) if (heroAlive(heroes[i])) alive.push(heroes[i]);
    if (!alive.length) return null;
    if (!isCoop()) return heroAlive(heroes[0]) ? heroes[0] : alive[0];
    alive.sort(function (a, c) { return Math.abs(a.x - boss.x) - Math.abs(c.x - boss.x); });
    return alive[0];
  }
  function bossBusyActive() {
    var s = boss.state;
    if (s === 'slam') return boss.sub === 'air';
    return (s === 'rocket' || s === 'combo' || s === 'orbs') && boss.sub === 'act';
  }
  function abortAttack() {
    var b = boss;
    [b.fF, b.fB].forEach(function (F) {
      if (F.mode === 'fly') F.mode = 'back';
      else if (F.mode !== 'back') { F.mode = 'home'; F.ext = 0; }
    });
    b.tele = 0; b.sub = '';
  }
  function endAttack(thinkT) {
    var b = boss;
    [b.fF, b.fB].forEach(function (F) {
      if (F.mode === 'fly') F.mode = 'back';
      else if (F.mode !== 'back') { F.mode = 'home'; F.ext = 0; }
    });
    b.state = 'think'; b.st = 0; b.thinkT = thinkT; b.sub = ''; b.tele = 0; b.alert = false;
  }

  function chooseAttack() {
    var b = boss;
    b.st = 0; b.sub = 'tele'; b.attackCount++;
    b.target = pickTarget();
    var choice;
    if (phase === 2 && (b.forceSlam || b.attackCount % 2 === 1)) choice = 'slam';
    else {
      var opts = phase === 1 ? ['rocket', 'combo', 'orbs', 'slam'] : ['rocket', 'combo', 'orbs'];
      var pool = opts.filter(function (o) { return o !== b.last; });
      choice = pool[Math.floor(Math.random() * pool.length)] || 'orbs';
    }
    b.forceSlam = false; b.last = choice; b.state = choice;
    if (b.target) b.facing = sign(b.target.x - b.x);
    b.second = false; b.jabI = 0; b.orbI = 0;
    if (choice === 'rocket') planRocket(false);
  }
  function planRocket(second) {
    var b = boss, tg = b.target && heroAlive(b.target) ? b.target : pickTarget();
    var low = GROUND_Y - 34, high = GROUND_Y - 122;
    if (tg && tg.y < GROUND_Y - 40) b.planTy = clamp(tg.y - 32, 130, low);
    else b.planTy = (second && b.firstLow) ? high : low;
    if (!second) b.firstLow = (b.planTy === low);
  }

  function startDistract(h) {
    var b = boss;
    abortAttack();
    b.state = 'distracted'; b.st = 0; b.distractT = 2.5; b.distractBy = h; b.pending = null;
    b.facing = sign(h.x - b.x);
    sfx('hit');
    var hd = headPos();
    addParts(hd.x, hd.y, '#93c5fd', 6, 90, 'star');
  }
  function clink(x, y) {
    sfx('clink');
    addParts(x, y, '#bff7ff', 5, 110, 'clink');
    addParts(x, y, '#ffffff', 3, 80, 'clink');
  }
  // Un héroe golpea o dispara a Dark Secuaz (siempre 0 de daño).
  function onBossHit(h, x, y) {
    if (mode !== 'p12' || !h) return;
    var b = boss, s = b.state;
    if (s === 'intro' || s === 'trans2' || s === 'stagger' || s === 'chase' || s === 'regain' ||
        s === 'swat' || s === 'pulled' || phase !== 1 || b.lockCracks >= 3) { clink(x, y); return; }
    if (b.alert) {
      clink(x, y);
      if (!b.emote) b.emote = { text: '¡JA!', t: 0.7 };
      return;
    }
    if (s === 'distracted') {
      if (b.distractBy !== h) {
        b.distractBy = h; b.distractT = Math.max(b.distractT, 1.6); b.facing = sign(h.x - b.x);
      }
      sfx('hit'); addParts(x, y, '#93c5fd', 4, 90, 'dot');
      return;
    }
    if (b.distractCd > 0) { clink(x, y); return; }
    if (bossBusyActive()) {
      if (!b.pending) b.pending = h;
      sfx('hit'); addParts(x, y, '#93c5fd', 4, 90, 'dot');
      return;
    }
    startDistract(h);
  }

  // ---------- hackear / tirón / flecha certera ----------
  function inPocketReach(h) {
    if (!heroAlive(h) || boss.hidden) return false;
    var p = pocketPos(true);
    return Math.abs(h.x - p.x) < 64 && (h.y - h.h) < p.y + 62 && h.y > p.y - 30;
  }
  function nearBoss(h) { return Math.abs(h.x - boss.x) < 200 && h.y > GROUND_Y - 340; }
  function notHackable(h) {
    if (hackMsgCd > 0) return;
    hackMsgCd = 1.2;
    addText(h.x, h.y - 84, '¡No se puede hackear!', '#fca5a5', 22);
    sfx('hackFail');
  }
  function onHackPress(h) {
    if (mode !== 'p12' || !boss || boss.state === 'intro' || boss.state === 'trans2') return;
    if (phase === 1 && boss.lockCracks < 3) {
      if (inPocketReach(h)) { tryPull(h); return; }
      if (nearBoss(h)) notHackable(h);
      return;
    }
    if (phase === 2) {
      if (h.heroe === 'falcon') { tryCertera(h); return; }
      if (nearBoss(h) && !(gem && !gem.held)) notHackable(h);
    }
  }
  function tryPull(h) {
    var b = boss;
    if (b.state === 'swat' || b.state === 'pulled') return;
    h.actT = 0.3;
    if (b.state === 'distracted' && b.distractBy && b.distractBy !== h) {
      b.lockCracks++; b.lockShake = 0.4;
      sfx('clink'); sfx('hackOk');
      camShake = Math.max(camShake, 0.15);
      var p = pocketPos(true);
      addParts(p.x, p.y, '#fde047', 14, 180, 'star');
      addText(p.x, p.y - 34, '¡TIRÓN! ' + b.lockCracks + '/3', '#fde047', 26);
      b.facing = sign(h.x - b.x); b.distractBy = null; b.distractT = 0;
      h.vx = -sign(b.x - h.x) * 160; h.hurtT = 0;
      if (b.lockCracks >= 3) lockBreak();
      else { b.state = 'pulled'; b.st = 0; b.emote = { text: '¡¿EH?!', t: 1.0 }; }
    } else {
      startSwat(h);
    }
  }
  function startSwat(h) {
    var b = boss;
    abortAttack();
    b.state = 'swat'; b.st = 0; b.swatTarget = h; b.swatHit = false;
    b.facing = sign(h.x - b.x);
    b.fF.mode = 'jab'; b.fF.ext = 0; b.fF.tx = h.x; b.fF.tyy = h.y - 30;
    b.emote = { text: '¡GRRR!', t: 0.9 };
    sfx('punch');
  }
  function lockBreak() {
    var b = boss, p = pocketPos(true);
    addParts(p.x, p.y, '#fbbf24', 20, 240, 'dot');
    addParts(p.x, p.y, '#fde047', 12, 200, 'star');
    sfx('explosion'); sfx('hackOk');
    camShake = Math.max(camShake, 0.4); flash = Math.max(flash, 0.45);
    b.state = 'trans2'; b.st = 0; b.emote = { text: '¡GRRR!', t: 1.8 };
    showMsg('¡El candado se rompió! Ahora: ¡FLECHA AL BOLSILLO!', 3.4);
  }
  function windowOpen() {
    return mode === 'p12' && phase === 2 && boss.state === 'stuck' && boss.hasGem && !boss.pocketBroken;
  }
  function tryCertera(h) {
    if (cert) return;
    if (!windowOpen()) {
      if (hackMsgCd <= 0) { hackMsgCd = 1.2; addText(h.x, h.y - 84, '¡Espera a que brille el bolsillo!', '#fde68a', 20); }
      return;
    }
    var p = pocketPos(true);
    h.facing = sign(p.x - h.x);
    h.anim = { w: 'arco', t: 0, dur: 0.3, pose: 'shoot' };
    cert = { x: h.x + h.facing * 18, y: h.y - 36, t: 0, trail: [], angle: 0 };
    sfx('arrow');
    addText(h.x, h.y - 84, '¡FLECHA CERTERA!', '#fde047', 22);
  }
  function pocketBreak() {
    var b = boss, p = pocketPos(true);
    b.pocketBroken = true; b.hasGem = false;
    b.fF.mode = 'home'; b.fB.mode = 'home';
    b.state = 'stagger'; b.st = 0; b.emote = { text: '¡NOOO!', t: 1.2 };
    var dir = sign(p.x - b.x);
    gem = { x: p.x, y: p.y, vx: dir * rnd(190, 240), vy: -600, t: 0, held: null };
    sfx('explosion'); sfx('clink');
    camShake = Math.max(camShake, 0.35);
    addParts(p.x, p.y, '#e11d48', 16, 220, 'dot');
    addParts(p.x, p.y, '#fde68a', 10, 180, 'star');
    showMsg('¡Bolsillo roto! ¡Atrapa la gema antes que Dark Secuaz!', 3.0);
    if (!spyDone) { spyDone = true; spy = { x: W + 40, y: 30, st: 'wait', t: 0 }; }
  }
  function bossRegain() {
    var b = boss;
    gem = null;
    b.hasGem = true; b.pocketBroken = false;
    b.state = 'regain'; b.st = 0; b.emote = { text: '¡MÍA!', t: 1.1 };
    sfx('roar');
    showMsg('¡Dark Secuaz la ha vuelto a guardar! ¡Otra vez!', 2.6);
  }
  function heroGrabGem(h) {
    gem.held = h; h.holdGem = true;
    sfx('gemGrab'); sfx('pickup');
    addParts(h.x, h.y - 80, '#fde68a', 16, 200, 'star');
    startTrans3(h);
  }

  // ============================================================
  //  ENTER / EXIT
  // ============================================================
  function normFase(f) {
    if (f === 'victoria' || f === 'v' || f === 'win') return 'victoria';
    var n = parseInt(f, 10);
    return (n === 2 || n === 3) ? n : 1;
  }
  function resetAll() {
    clock = 0; mode = 'p12'; phase = 1; checkpoint = 1;
    projs = []; waves = []; orbs = []; parts = []; texts = []; msg = null;
    camShake = 0; flash = 0; zoom = 1; fade = 0.8; hackMsgCd = 0; loseGuard = false; doneGuard = false;
    gem = null; gemSaved = false; spy = null; spyDone = false; cert = null;
    t3 = null; flyers = []; vehicles = null;
    fusion = null; giant = null; bolts = []; shots = []; beam = null; p3T = 0; p3intro = 0;
    vt = 0; vic = null; escapees = [];
    heroes = makeHeroes();
    boss = makeBoss();
  }
  scene.enter = function (params) {
    params = params || {};
    var fase = params.fase;
    if (fase === undefined || fase === null) fase = urlParam('fase');
    if ((fase === undefined || fase === null) && retryPhase) fase = retryPhase;
    retryPhase = null;
    fase = normFase(fase);
    try {
      G.state.hp = G.state.maxHp || 10;
      if (isCoop()) {
        if (typeof G.state.maxHp2 !== 'number') G.state.maxHp2 = 10;
        G.state.hp2 = G.state.maxHp2;
      }
    } catch (e) { /* nada */ }
    resetAll();
    if (fase === 1) {
      boss.state = 'intro'; boss.st = 0; boss.yOff = -560; boss.vy = 0;
      music('boss2');
    } else if (fase === 2) {
      setupPhase2();
    } else if (fase === 3) {
      startPhase3(true);
    } else {
      startPhase3(true);
      startVictory();
    }
  };
  scene.exit = function () {
    projs = []; waves = []; orbs = []; parts = []; texts = []; bolts = []; shots = [];
    flyers = []; escapees = []; cert = null; spy = null; msg = null; camShake = 0; flash = 0;
  };
  function setupPhase2() {
    mode = 'p12'; phase = 2; checkpoint = 2;
    boss.lockCracks = 3; boss.state = 'think'; boss.st = 0; boss.thinkT = 1.2; boss.attackCount = 0;
    showMsg('¡El candado está roto! Espera su puñetazo al suelo…', 3.0);
    music('boss2');
  }
  function loseGame() {
    if (loseGuard) return;
    loseGuard = true;
    retryPhase = checkpoint >= 2 ? checkpoint : null;
    G.go('gameover', { retry: 'levelP2_5' });
  }

  // ============================================================
  //  UPDATE
  // ============================================================
  scene.update = function (dt) {
    try { step(dt); } catch (e) { warnOnce(e); }
  };
  function step(dt) {
    if (!heroes || !boss) return;
    clock += dt;
    if (fade > 0) fade = Math.max(0, fade - dt * 1.4);
    if (camShake > 0) camShake = Math.max(0, camShake - dt);
    if (flash > 0) flash = Math.max(0, flash - dt * 1.8);
    if (hackMsgCd > 0) hackMsgCd -= dt;
    if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
    updateParts(dt);
    if (mode === 'p12') updateP12(dt);
    else if (mode === 'trans3') updateTrans3(dt);
    else if (mode === 'p3') updateP3(dt);
    else if (mode === 'victory') updateVictory(dt);
  }
  function updateParts(dt) {
    var i;
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
      if (p.t >= p.life) parts.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) {
      var tx = texts[i];
      tx.t += dt; tx.y -= 34 * dt;
      if (tx.t >= tx.life) texts.splice(i, 1);
    }
  }

  // ---------------- FASES 1 Y 2 ----------------
  function updateP12(dt) {
    for (var i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (h.isAI) aiThink(h, dt);
      updateHero(h, dt);
    }
    updateBoss(dt);
    updateProjs(dt);
    updateOrbs(dt);
    updateWaves(dt);
    updateCert(dt);
    updateGem(dt);
    updateSpy(dt);
  }

  function updateHero(h, dt) {
    if (h.ko >= 0) {
      h.ko -= dt;
      if (h.ko <= 0) reviveHero(h);
      return;
    }
    var IN = h.inp;
    if (h.inv > 0) h.inv -= dt;
    if (h.hurtT > 0) h.hurtT -= dt;
    if (h.actT > 0) h.actT -= dt;
    if (h.cd[0] > 0) h.cd[0] -= dt;
    if (h.cd[1] > 0) h.cd[1] -= dt;
    if (h.anim) { h.anim.t += dt; if (h.anim.t >= h.anim.dur) h.anim = null; }
    var frozen = (boss.state === 'intro');
    var move = frozen ? 0 : ((IN.held('right') ? 1 : 0) - (IN.held('left') ? 1 : 0));
    if (move !== 0) h.facing = move;
    var spd = h.heroe === 'falcon' ? 290 : 260;
    if (h.hurtT > 0.2) h.vx *= 0.9;
    else h.vx = move * spd;
    // salto con coyote + buffer (y doble salto de Falcon)
    if (!frozen && IN.pressed('jump')) h.jumpBuf = 0.12; else h.jumpBuf = Math.max(0, h.jumpBuf - dt);
    h.coyote = h.onGround ? 0.1 : Math.max(0, h.coyote - dt);
    if (h.jumpBuf > 0) {
      if (h.coyote > 0) {
        h.vy = JUMP_V; h.onGround = false; h.coyote = 0; h.jumpBuf = 0;
        h.jumpsLeft = h.heroe === 'falcon' ? 1 : 0;
        sfx('jump');
      } else if (h.heroe === 'falcon' && h.jumpsLeft > 0) {
        h.vy = JUMP_V; h.jumpsLeft = 0; h.jumpBuf = 0;
        sfx('jump');
        addParts(h.x, h.y - 10, '#bbf7d0', 5, 80, 'star');
      }
    }
    // jetpack (mantener el botón de su ranura)
    var js = h.weapons.indexOf('jetpack');
    var jetBtn = js === 0 ? 'attack' : (js === 1 ? 'shoot' : null);
    h.jetOn = false;
    if (!frozen && jetBtn && IN.held(jetBtn) && h.fuel > 0) {
      h.jetOn = true;
      h.fuel = Math.max(0, h.fuel - dt);
      h.vy += -900 * dt;
      if (h.vy < -300) h.vy = -300;
      h.jetSfx -= dt;
      if (h.jetSfx <= 0) { h.jetSfx = 0.3; sfx('jetpack'); }
    } else {
      h.vy += GRAV * dt;
    }
    if (h.vy > 1200) h.vy = 1200;
    heroPhysics(h, dt, true);
    if (h.onGround && !h.jetOn) h.fuel = Math.min(2.5, h.fuel + dt);
    // armas
    if (!frozen && !h.holdGem) {
      if (IN.pressed('attack') && h.weapons[0] !== 'jetpack') useWeapon(h, 0);
      if (IN.pressed('shoot') && h.weapons[1] !== 'jetpack') useWeapon(h, 1);
      if (IN.pressed('hack')) onHackPress(h);
    }
    // pose
    if (h.holdGem) h.pose = 'win';
    else if (h.hurtT > 0) h.pose = 'hurt';
    else if (h.anim) h.pose = h.anim.pose;
    else if (h.actT > 0) h.pose = h.heroe === 'director' ? 'hack' : 'attack';
    else if (!h.onGround) h.pose = h.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(h.vx) > 20) h.pose = 'run';
    else h.pose = 'idle';
  }
  function heroPhysics(h, dt, platsOn) {
    h.x += h.vx * dt;
    var prevY = h.y;
    h.y += h.vy * dt;
    h.x = clamp(h.x, ARENA_L + h.w / 2, ARENA_R - h.w / 2);
    if (h.y - h.h < 16) { h.y = 16 + h.h; if (h.vy < 0) h.vy = 0; }
    h.onGround = false;
    if (h.y >= GROUND_Y) { h.y = GROUND_Y; if (h.vy > 0) h.vy = 0; h.onGround = true; }
    if (platsOn && h.vy >= 0) {
      for (var i = 0; i < PLATS.length; i++) {
        var pl = PLATS[i];
        if (h.x + h.w / 2 > pl.x && h.x - h.w / 2 < pl.x + pl.w && prevY <= pl.y + 2 && h.y >= pl.y) {
          h.y = pl.y; h.vy = 0; h.onGround = true;
        }
      }
    }
  }

  function useWeapon(h, slot) {
    var w = h.weapons[slot];
    if (!w || w === 'jetpack' || h.cd[slot] > 0 || h.hurtT > 0.2) return;
    var i, own;
    if (w === 'espada' || w === 'guantes') {
      var reach = w === 'espada' ? 56 : 48;
      h.cd[slot] = WCD[w]; h.cdMax[slot] = WCD[w];
      h.anim = { w: w, t: 0, dur: 0.26, pose: 'attack' };
      sfx(w === 'espada' ? 'sword' : 'punch');
      var r = { x: h.facing > 0 ? h.x + 4 : h.x - 4 - reach - 10, y: h.y - h.h - 6, w: reach + 10, h: h.h + 12 };
      if (mode === 'p12' && !boss.hidden && overlap(r, bossRect())) onBossHit(h, h.x + h.facing * reach * 0.8, h.y - 34);
      return;
    }
    if (w === 'arco') {
      own = 0;
      for (i = 0; i < projs.length; i++) if (projs[i].kind === 'arrow' && projs[i].owner === h) own++;
      if (own >= 3) return;
      h.cd[slot] = WCD.arco; h.cdMax[slot] = WCD.arco;
      h.anim = { w: w, t: 0, dur: 0.22, pose: 'shoot' };
      projs.push({ kind: 'arrow', x: h.x + h.facing * 20, y: h.y - 34, vx: h.facing * 540, vy: -40, owner: h, life: 2.2, angle: 0 });
      sfx('arrow');
      return;
    }
    if (w === 'pulso') {
      h.cd[slot] = WCD.pulso; h.cdMax[slot] = WCD.pulso;
      h.anim = { w: w, t: 0, dur: 0.28, pose: 'shoot' };
      sfx('zap');
      var zr = { x: h.facing > 0 ? h.x : h.x - 240, y: h.y - 54, w: 240, h: 44 };
      if (mode === 'p12' && !boss.hidden && overlap(zr, bossRect())) onBossHit(h, boss.x - h.facing * 70, h.y - 32);
      return;
    }
    if (w === 'bumeran') {
      if (h.bumOut) return;
      h.bumOut = true; h.cd[slot] = WCD.bumeran; h.cdMax[slot] = WCD.bumeran;
      h.anim = { w: w, t: 0, dur: 0.22, pose: 'shoot' };
      projs.push({ kind: 'bumeran', x: h.x + h.facing * 20, y: h.y - 32, dir: h.facing, out: true, d: 0, owner: h, hitPass: false, t: 0 });
      sfx('arrow');
      return;
    }
    if (w === 'red') {
      h.cd[slot] = WCD.red; h.cdMax[slot] = WCD.red;
      h.anim = { w: w, t: 0, dur: 0.26, pose: 'shoot' };
      projs.push({ kind: 'red', x: h.x + h.facing * 22, y: h.y - 34, vx: h.facing * 380, owner: h, life: 1.3 });
      sfx('net');
    }
  }
  function hitsBoss(x, y, r) {
    if (mode !== 'p12' || boss.hidden) return false;
    return overlap({ x: x - r, y: y - r, w: r * 2, h: r * 2 }, bossRect());
  }
  function updateProjs(dt) {
    for (var i = projs.length - 1; i >= 0; i--) {
      var p = projs[i], dead = false;
      if (p.kind === 'arrow') {
        p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        p.angle = Math.atan2(p.vy, p.vx);
        if (hitsBoss(p.x, p.y, 6)) { onBossHit(p.owner, p.x, p.y); dead = true; }
        if (p.y > GROUND_Y + 6 || p.life <= 0 || p.x < -40 || p.x > W + 40) dead = true;
      } else if (p.kind === 'red') {
        p.x += p.vx * dt; p.life -= dt;
        if (hitsBoss(p.x, p.y, 14)) { onBossHit(p.owner, p.x, p.y); addParts(p.x, p.y, '#f1f5f9', 6, 90, 'dot'); dead = true; }
        if (p.life <= 0 || p.x < -40 || p.x > W + 40) dead = true;
      } else if (p.kind === 'bumeran') {
        p.t += dt;
        var o = p.owner;
        if (p.out) {
          p.x += p.dir * 440 * dt; p.d += 440 * dt;
          if (p.d >= 260 || p.x < ARENA_L || p.x > ARENA_R) { p.out = false; p.hitPass = false; }
        } else {
          var tx = o.x, ty = o.y - 32, dx = tx - p.x, dy = ty - p.y, d = Math.sqrt(dx * dx + dy * dy), sp = 480 * dt;
          if (d <= sp + 10 || o.ko >= 0 || o.hidden) { dead = true; o.bumOut = false; }
          else { p.x += dx / d * sp; p.y += dy / d * sp; }
        }
        if (!dead && !p.hitPass && hitsBoss(p.x, p.y, 14)) { p.hitPass = true; onBossHit(o, p.x, p.y); }
      }
      if (dead) projs.splice(i, 1);
    }
  }
  function blocksWithShield(h, x, y) {
    if (!heroAlive(h) || h.weapons.indexOf('bumeran') < 0 || h.bumOut || h.anim) return false;
    return (x - h.x) * h.facing > 0 && Math.abs(x - h.x) < 42 && Math.abs(y - (h.y - 32)) < 38;
  }
  function updateOrbs(dt) {
    for (var i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i], dead = false;
      o.x += o.vx * dt; o.y += o.vy * dt; o.t += dt; o.life -= dt;
      var r = { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
      for (var k = 0; k < heroes.length && !dead; k++) {
        var h = heroes[k];
        if (!heroAlive(h)) continue;
        if (blocksWithShield(h, o.x, o.y)) {
          dead = true; sfx('shieldBlock'); sfx('clink'); addParts(o.x, o.y, '#bff7ff', 8, 130, 'clink');
        } else if (overlap(r, heroRect(h))) {
          dead = true; hurtHero(h, 1, o.x); addParts(o.x, o.y, '#ef4444', 8, 140, 'dot');
        }
      }
      if (o.life <= 0 || o.y > GROUND_Y + 4 || o.x < -40 || o.x > W + 40 || o.y < -60) dead = true;
      if (dead) orbs.splice(i, 1);
    }
  }
  function updateWaves(dt) {
    for (var i = waves.length - 1; i >= 0; i--) {
      var w = waves[i];
      w.t += dt; w.x += w.dir * w.speed * dt;
      for (var k = 0; k < heroes.length; k++) {
        var h = heroes[k];
        if (!heroAlive(h)) continue;
        if (h.onGround && h.y >= GROUND_Y - 4 && Math.abs(h.x - w.x) < 30) hurtHero(h, 2, w.x - w.dir * 20);
      }
      if (w.x < ARENA_L - 50 || w.x > ARENA_R + 50) waves.splice(i, 1);
    }
  }

  function hurtHero(h, dmg, fromX) {
    if (!heroAlive(h) || mode !== 'p12' || h.inv > 0) return;
    var dir = (typeof fromX === 'number') ? (h.x < fromX ? -1 : 1) : -h.facing;
    if (h.isAI) {
      h.inv = 0.8; h.vx = dir * 240; h.vy = -240; h.onGround = false; h.hurtT = 0.3;
      return;
    }
    if (debugInv()) { h.inv = 0.4; return; }
    setHeroHp(h, Math.max(0, heroHp(h) - dmg));
    h.inv = 1.2; h.hurtT = 0.35;
    h.vx = dir * 230; h.vy = -260; h.onGround = false;
    sfx('hurt');
    camShake = Math.max(camShake, 0.25);
    if (heroHp(h) <= 0) heroDown(h);
  }
  function heroDown(h) {
    if (!isCoop()) { loseGame(); return; }
    var other = otherHero(h);
    if (other.ko >= 0 || heroHp(other) <= 0) { loseGame(); return; }
    h.ko = 4.0; h.vx = 0; h.vy = 0; h.bumOut = false;
    addParts(h.x, h.y - 30, '#93c5fd', 12, 120, 'star');
    if (boss.distractBy === h) boss.distractT = Math.min(boss.distractT, 0.2);
  }
  function reviveHero(h) {
    h.ko = -1;
    setHeroHp(h, Math.min(maxHpOf(h), 6));
    var o = otherHero(h);
    if (heroAlive(o)) { h.x = clamp(o.x - o.facing * 44, ARENA_L + 20, ARENA_R - 20); h.y = o.onGround ? o.y : GROUND_Y; }
    else { h.x = 200; h.y = GROUND_Y; }
    h.vx = 0; h.vy = 0; h.onGround = true; h.inv = 1.5; h.hurtT = 0; h.pose = 'idle';
    addParts(h.x, h.y - 30, '#bae6fd', 14, 150, 'star');
    sfx('door');
  }

  // ---------- Dark Secuaz: máquina de estados ----------
  function updateBoss(dt) {
    var b = boss;
    b.st += dt;
    if (b.hitT > 0) b.hitT -= dt;
    if (b.distractCd > 0) b.distractCd -= dt;
    if (b.lockShake > 0) b.lockShake -= dt;
    if (b.emote) { b.emote.t -= dt; if (b.emote.t <= 0) b.emote = null; }
    b.vis += clamp(-b.facing - b.vis, -7 * dt, 7 * dt);       // giro animado
    b.leanT = 0; b.syT = 1; b.aimT = defaultAim(b.facing); b.tele = 0; b.walking = false;
    var tg, dx, F;

    switch (b.state) {
      case 'intro':
        b.vy += 1900 * dt; b.yOff += b.vy * dt;
        if (b.yOff >= 0) {
          b.yOff = 0; b.vy = 0;
          if (!b.landed) {
            b.landed = true; camShake = 0.5; sfx('explosion'); sfx('roar');
            addParts(b.x - 70, GROUND_Y, '#e2e8f0', 10, 160, 'dot');
            addParts(b.x + 70, GROUND_Y, '#e2e8f0', 10, 160, 'dot');
            b.emote = { text: '¡GRRR!', t: 1.4 };
          }
          b.syT = b.st < 1.2 ? 0.92 : 1;
        }
        tg = pickTarget(); if (tg) b.facing = sign(tg.x - b.x);
        if (b.st > 2.2) {
          b.state = 'think'; b.st = 0; b.thinkT = 1.0;
          showMsg('¡La gema está en un bolsillo con candado! ¡No se puede hackear!', 3.6);
        }
        break;

      case 'think':
        b.alert = false;
        tg = pickTarget();
        if (tg) {
          b.facing = sign(tg.x - b.x);
          dx = tg.x - b.x;
          if (Math.abs(dx) > 250) {
            var nx = clamp(b.x + sign(dx) * 70 * dt, BOSS_MINX, BOSS_MAXX);
            if (nx !== b.x) { b.x = nx; b.walking = true; }
          }
        }
        if (b.st >= b.thinkT) chooseAttack();
        break;

      case 'distracted':
        b.distractT -= dt;
        if (b.distractBy) b.facing = sign(b.distractBy.x - b.x);
        b.leanT = 0.07 * b.facing;
        if (b.distractT <= 0 || !heroAlive(b.distractBy)) {
          b.state = 'think'; b.st = 0; b.thinkT = 0.9; b.distractCd = 1.0; b.distractBy = null;
          b.emote = { text: '¡GRRR!', t: 0.7 };
        }
        break;

      case 'pulled':
        // tras un tirón se pone EN GUARDIA: ataca una vez antes de dejarse distraer
        b.syT = 1.05; b.leanT = -0.1 * b.facing;
        if (b.st >= 0.9) { chooseAttack(); b.alert = true; }
        break;

      case 'swat':
        F = b.fF;
        var k = b.st / 0.45;
        F.mode = 'jab';
        F.ext = k < 0.35 ? k / 0.35 : Math.max(0, 1 - (k - 0.35) / 0.65);
        if (!b.swatHit && k >= 0.3) {
          b.swatHit = true;
          var sh = b.swatTarget;
          if (heroAlive(sh) && Math.abs(sh.x - b.x) < 260) {
            hurtHero(sh, 2, b.x);
            addText(sh.x, sh.y - 74, '¡Manotazo!', '#fca5a5', 22);
          }
        }
        if (k >= 1) { F.mode = 'home'; F.ext = 0; b.state = 'think'; b.st = 0; b.thinkT = 1.0; }
        break;

      case 'slam':
        if (b.sub === 'tele') {
          b.syT = 0.9; b.tele = 1;
          if (b.st >= teleTime()) {
            b.sub = 'air'; b.st = 0; b.vy = -620;
            b.slamTX = clamp(b.target ? b.target.x : b.x, BOSS_MINX, BOSS_MAXX);
            sfx('jump');
          }
        } else if (b.sub === 'air') {
          b.syT = 1.05;
          b.vy += 2000 * dt; b.yOff += b.vy * dt;
          b.x += (b.slamTX - b.x) * Math.min(1, 3 * dt);
          if (b.yOff >= 0 && b.vy > 0) { b.yOff = 0; slamLand(); }
        }
        break;

      case 'stuck':
        b.syT = 0.93;
        if (!(cert && phase === 2)) b.stuckT -= dt;
        if (b.stuckT <= 0) { b.fF.mode = 'home'; b.fB.mode = 'home'; b.state = 'recover'; b.st = 0; }
        break;

      case 'recover':
        if (b.st >= 0.45) { b.state = 'think'; b.st = 0; b.thinkT = phase === 1 ? 1.4 : 1.1; }
        break;

      case 'rocket':
        if (b.sub === 'tele') {
          b.tele = 1;
          F = b.second ? b.fB : b.fF;
          F.mode = 'ready';
          if (b.st >= (b.second ? 0.45 : teleTime())) { launchFist(F); b.sub = 'act'; b.st = 0; }
        } else if (b.sub === 'act') {
          if (b.fF.mode === 'home' && b.fB.mode === 'home') {
            if (phase === 2 && !b.second) { b.second = true; b.sub = 'tele'; b.st = 0; planRocket(true); }
            else endAttack(1.3);
          }
        }
        break;

      case 'combo':
        if (b.sub === 'tele') {
          b.tele = 1; b.leanT = -0.08 * b.facing;
          if (b.st >= teleTime()) {
            b.sub = 'act'; b.st = 0; b.jabI = 0; b.jabT = 0; b.jabN = phase === 2 ? 5 : 4;
            startJab();
          }
        } else if (b.sub === 'act') {
          var dur = phase === 2 ? 0.27 : 0.32;
          b.jabT += dt;
          var kk = b.jabT / dur;
          F = (b.jabI % 2 === 0) ? b.fF : b.fB;
          F.ext = kk < 0.4 ? kk / 0.4 : (kk < 0.6 ? 1 : Math.max(0, 1 - (kk - 0.6) / 0.4));
          b.leanT = 0.1 * b.facing;
          if (kk >= 1) {
            F.mode = 'home'; F.ext = 0; b.jabI++;
            if (b.jabI >= b.jabN) endAttack(1.2);
            else { b.jabT = 0; startJab(); }
          }
        }
        break;

      case 'orbs':
        tg = (b.target && heroAlive(b.target)) ? b.target : pickTarget();
        if (tg) { var mz = muzzle(); b.aimT = Math.atan2((tg.y - 30) - mz.y, tg.x - mz.x); }
        if (b.sub === 'tele') {
          b.tele = 1;
          if (b.st >= teleTime()) { b.sub = 'act'; b.st = 0; b.orbI = 0; b.orbT = 0; }
        } else if (b.sub === 'act') {
          b.orbT -= dt;
          if (b.orbI < 3 && b.orbT <= 0) { fireOrb(tg); b.orbI++; b.orbT = 0.42; }
          if (b.orbI >= 3 && b.orbT <= 0) endAttack(1.2);
        }
        break;

      case 'trans2':
        b.syT = 1 + 0.04 * Math.sin(b.st * 30);
        camShake = Math.max(camShake, 0.08);
        if (b.st >= 2.0) {
          phase = 2; checkpoint = 2;
          b.state = 'think'; b.st = 0; b.thinkT = 1.0; b.attackCount = 0;
        }
        break;

      case 'stagger':
        b.leanT = -0.12 * b.facing * Math.sin(b.st * 9);
        if (b.st >= 1.0) { b.state = 'chase'; b.st = 0; }
        break;

      case 'chase':
        if (!gem || gem.held) { b.state = 'think'; b.st = 0; b.thinkT = 1.0; break; }
        b.facing = sign(gem.x - b.x);
        dx = gem.x - b.x;
        if (Math.abs(dx) > 26) {
          b.x = clamp(b.x + sign(dx) * 100 * dt, 130, 830);
          b.walking = true;
        }
        if (Math.abs(gem.x - b.x) < 50 && gem.y > GROUND_Y - 100 && gem.t > 0.6) bossRegain();
        break;

      case 'regain':
        b.syT = 1.04;
        if (b.st >= 1.1) { b.state = 'think'; b.st = 0; b.thinkT = 0.8; b.forceSlam = true; }
        break;
    }

    // distracción pendiente (le dieron mientras atacaba): en cuanto pueda, se gira
    if (b.pending && phase === 1 && b.lockCracks < 3 && b.distractCd <= 0 && !bossBusyActive() &&
        (b.state === 'think' || b.state === 'stuck' || b.state === 'recover' ||
         ((b.state === 'rocket' || b.state === 'combo' || b.state === 'orbs' || b.state === 'slam') && b.sub === 'tele'))) {
      if (heroAlive(b.pending)) startDistract(b.pending); else b.pending = null;
    }

    if (b.walking) { b.walkPh += dt * 9; b.bobY = -Math.abs(Math.sin(b.walkPh)) * 5; }
    else b.bobY *= 0.8;
    b.lean += (b.leanT - b.lean) * Math.min(1, 10 * dt);
    b.sy += (b.syT - b.sy) * Math.min(1, 12 * dt);
    b.aimA = angLerp(b.aimA, b.aimT, Math.min(1, 8 * dt));
    updateFist(b.fF, true, dt);
    updateFist(b.fB, false, dt);
  }

  function slamLand() {
    var b = boss;
    b.state = 'stuck'; b.st = 0; b.sub = ''; b.stuckT = phase === 2 ? 3.0 : 1.3;
    if (phase === 2) msg = null;     // la pista del bolsillo brillante manda
    camShake = Math.max(camShake, 0.45);
    sfx('bigPunch'); sfx('explosion');
    var sp = phase === 2 ? 330 : 290;
    var fx = clamp(b.x + b.facing * 100, ARENA_L + 20, ARENA_R - 20);
    var bx = clamp(b.x - b.facing * 100, ARENA_L + 20, ARENA_R - 20);
    b.fF.mode = 'ground'; b.fF.x = fx; b.fF.y = GROUND_Y - 24;
    b.fB.mode = 'ground'; b.fB.x = bx; b.fB.y = GROUND_Y - 24;
    waves.push({ x: fx, dir: b.facing, speed: sp, t: 0 });
    waves.push({ x: bx, dir: -b.facing, speed: sp, t: 0 });
    addParts(fx, GROUND_Y, '#fdba74', 10, 200, 'dot');
    addParts(bx, GROUND_Y, '#fdba74', 10, 200, 'dot');
  }
  function launchFist(F) {
    var b = boss, front = (F === b.fF), hp = homeF(front);
    var tg = (b.target && heroAlive(b.target)) ? b.target : pickTarget();
    var dir = tg ? sign(tg.x - b.x) : b.facing;
    b.facing = dir;
    F.mode = 'fly'; F.x = hp.x; F.y = hp.y; F.dist = 0;
    F.vx = dir * (phase === 2 ? 470 : 420);
    F.ty = b.planTy || (GROUND_Y - 34);
    sfx('boost'); sfx('punch');
  }
  function startJab() {
    var b = boss, F = (b.jabI % 2 === 0) ? b.fF : b.fB;
    var tg = (b.target && heroAlive(b.target)) ? b.target : pickTarget();
    if (tg && b.jabI === 0) b.facing = sign(tg.x - b.x);
    F.mode = 'jab'; F.ext = 0;
    b.x = clamp(b.x + b.facing * 30, BOSS_MINX, BOSS_MAXX);
    F.tx = b.x + b.facing * (178 + 8 * b.jabI);
    F.tyy = GROUND_Y - 40 - (b.jabI % 2) * 26;
    sfx('punch');
  }
  function fireOrb(tg) {
    var mz = muzzle();
    var tx = tg ? tg.x : boss.x + boss.facing * 200, ty = tg ? tg.y - 30 : GROUND_Y - 30;
    var ang = Math.atan2(ty - mz.y, tx - mz.x), sp = phase === 2 ? 195 : 170;
    orbs.push({ x: mz.x, y: mz.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 11, t: 0, life: 7 });
    sfx('laser');
    addParts(mz.x, mz.y, '#fca5a5', 5, 90, 'dot');
  }
  function fistDamage(F) {
    var r = { x: F.x - 25, y: F.y - 22, w: 50, h: 44 };
    for (var i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (heroAlive(h) && overlap(r, heroRect(h))) hurtHero(h, 2, F.x);
    }
  }
  function updateFist(F, front, dt) {
    var hp;
    if (F.mode === 'fly') {
      F.x += F.vx * dt; F.dist += Math.abs(F.vx) * dt;
      F.y += (F.ty - F.y) * Math.min(1, 8 * dt);
      if (F.dist > 620 || F.x < ARENA_L + 20 || F.x > ARENA_R - 20) {
        F.mode = 'back';
        addParts(F.x, F.y, '#fde68a', 5, 100, 'dot');
      }
      fistDamage(F);
    } else if (F.mode === 'back') {
      hp = homeF(front);
      var dx = hp.x - F.x, dy = hp.y - F.y, d = Math.sqrt(dx * dx + dy * dy), sp = 480 * dt;
      if (d <= sp + 2) F.mode = 'home';
      else { F.x += dx / d * sp; F.y += dy / d * sp; F.vx = dx / d * 480; fistDamage(F); }
    } else if (F.mode === 'ready') {
      hp = homeF(front);
      var k = Math.min(1, boss.st / 0.4);
      F.x = hp.x + boss.facing * 8 * k + rnd(-2, 2);
      F.y = lerp(hp.y, boss.planTy || hp.y, k) + rnd(-2, 2);
    } else if (F.mode === 'jab') {
      hp = homeF(front);
      F.x = lerp(hp.x, F.tx, F.ext); F.y = lerp(hp.y, F.tyy, F.ext);
      if (F.ext > 0.65) fistDamage(F);
    }
  }

  // ---------- flecha certera, gema y dron espía ----------
  function updateCert(dt) {
    if (!cert) return;
    cert.t += dt;
    var p = pocketPos(true), dx = p.x - cert.x, dy = p.y - cert.y, d = Math.sqrt(dx * dx + dy * dy), sp = 680 * dt;
    cert.trail.push({ x: cert.x, y: cert.y });
    if (cert.trail.length > 12) cert.trail.shift();
    cert.angle = Math.atan2(dy, dx);
    if (d <= sp + 6 || cert.t > 2.5) { cert = null; pocketBreak(); return; }
    cert.x += dx / d * sp; cert.y += dy / d * sp;
  }
  function updateGem(dt) {
    if (!gem) return;
    gem.t += dt;
    if (gem.held) { gem.x = gem.held.x; gem.y = gem.held.y - 84; return; }
    var R = 14, py = gem.y;
    gem.vy += 1500 * dt;
    gem.x += gem.vx * dt; gem.y += gem.vy * dt;
    if (gem.x < ARENA_L + R) { gem.x = ARENA_L + R; gem.vx = Math.abs(gem.vx) * 0.8; }
    if (gem.x > ARENA_R - R) { gem.x = ARENA_R - R; gem.vx = -Math.abs(gem.vx) * 0.8; }
    var landed = false;
    if (gem.vy > 0) {
      for (var i = 0; i < PLATS.length; i++) {
        var pl = PLATS[i];
        if (gem.x > pl.x && gem.x < pl.x + pl.w && py + R <= pl.y + 2 && gem.y + R >= pl.y) { gem.y = pl.y - R; landed = true; }
      }
    }
    if (gem.y + R >= GROUND_Y) { gem.y = GROUND_Y - R; landed = true; }
    if (landed) {
      if (gem.vy > 160) { gem.vy = -gem.vy * 0.5; gem.vx *= 0.85; sfx('clink'); }
      else { gem.vy = 0; gem.vx *= 0.9; }
    }
    if (gem.t > 0.35) {
      var gr = { x: gem.x - 18, y: gem.y - 18, w: 36, h: 36 };
      for (var k = 0; k < heroes.length; k++) {
        if (heroAlive(heroes[k]) && overlap(heroRect(heroes[k]), gr)) { heroGrabGem(heroes[k]); return; }
      }
    }
  }
  function updateSpy(dt) {
    if (!spy) return;
    spy.t += dt;
    var tx = spy.x, ty = spy.y;
    if (gem) { tx = gem.x; ty = gem.y - 62; }
    if (spy.st === 'wait') {
      if (spy.t > 0.5) { spy.st = 'in'; spy.t = 0; }
    } else if (spy.st === 'in') {
      var dx = tx - spy.x, dy = ty - spy.y, d = Math.sqrt(dx * dx + dy * dy), sp = 360 * dt;
      if (d > sp) { spy.x += dx / d * sp; spy.y += dy / d * sp; }
      if (d < 12 || spy.t > 2.4) { spy.st = 'scan'; spy.t = 0; }
    } else if (spy.st === 'scan') {
      spy.x += (tx - spy.x) * Math.min(1, 10 * dt);
      spy.y += (ty - spy.y) * Math.min(1, 10 * dt);
      if (spy.t >= 1.0 || !gem) { spy.st = 'out'; spy.t = 0; }
    } else {
      spy.x += 260 * dt; spy.y -= 300 * dt;
      if (spy.y < -80 || spy.x > W + 300) spy = null;
    }
  }

  // ---------- compañero automático (solo 1 jugador) ----------
  function rangedSlot(h) {
    for (var r = 0; r < RANGED_ORDER.length; r++) {
      var i = h.weapons.indexOf(RANGED_ORDER[r]);
      if (i >= 0) return i;
    }
    return -1;
  }
  function meleeSlot(h) {
    for (var i = 0; i < 2; i++) if (h.weapons[i] === 'espada' || h.weapons[i] === 'guantes') return i;
    return -1;
  }
  function aiDanger(h) {
    var i;
    for (i = 0; i < waves.length; i++) {
      var w = waves[i];
      if ((h.x - w.x) * w.dir > 0 && Math.abs(h.x - w.x) < 120) return true;
    }
    var fs = [boss.fF, boss.fB];
    for (i = 0; i < 2; i++) {
      var F = fs[i];
      if ((F.mode === 'fly' || F.mode === 'back') && F.y > GROUND_Y - 80 && Math.abs(F.x - h.x) < 150 &&
          (F.mode === 'back' || F.vx * (h.x - F.x) > 0)) return true;
    }
    return false;
  }
  function aiHitBoss(h) {
    var A = h.ai, dx = boss.x - h.x, slot = rangedSlot(h);
    if (slot >= 0 && h.weapons[slot] === 'pulso' && Math.abs(dx) > 300) slot = -1;
    if (slot >= 0 && h.weapons[slot] === 'bumeran' && h.bumOut) slot = -1;
    if (slot < 0) { var ms = meleeSlot(h); if (ms >= 0 && Math.abs(dx) < 150) slot = ms; }
    if (slot < 0) return;
    A.hold.left = false; A.hold.right = false;
    h.facing = sign(dx);
    A.press[slot === 0 ? 'attack' : 'shoot'] = true;
    A.shotT = 0.6;
  }
  function aiThink(h, dt) {
    var A = h.ai;
    A.hold = {}; A.press = {};
    if (h.ko >= 0 || mode !== 'p12') return;
    A.t += dt;
    if (A.shotT > 0) A.shotT -= dt;
    if (A.distractT > 0) A.distractT -= dt;
    var b = boss, pl = heroes[0];
    var side = (pl.x < b.x) ? 1 : -1;          // lado contrario al jugador
    var tx = h.x, wantHit = false, faceBoss = true;
    if (b.state === 'intro' || b.state === 'trans2') {
      tx = b.x + side * 260;
    } else if (gem && !gem.held) {
      tx = gem.t > 1.6 ? gem.x : h.x; faceBoss = false;
    } else if (phase === 1 && b.lockCracks < 3) {
      if (h.heroe === 'director') {
        // el Director (IA) da el tirón cuando el jugador (Falcon) lo distrae
        if (b.state === 'distracted' && b.distractBy === pl) {
          var pk = pocketPos(true);
          tx = pk.x; faceBoss = false;
          if (inPocketReach(h)) { A.pullT += dt; if (A.pullT > 0.15) { A.press.hack = true; A.pullT = 0; } }
          else A.pullT = 0;
        } else {
          tx = b.x + side * 230;
        }
      } else {
        // Falcon (IA) lo distrae disparando cuando el jugador se acerca (o de vez en cuando)
        var melee = rangedSlot(h) < 0;
        tx = b.x + side * (melee ? 120 : 250);
        var playerNear = Math.abs(pl.x - b.x) < 320;
        if (b.state !== 'distracted' && b.distractCd <= 0 && b.state !== 'pulled' && b.state !== 'swat' &&
            !b.alert && (playerNear || A.distractT <= 0)) A.react += dt;
        else A.react = 0;
        wantHit = A.react > 0.7;
        if (b.state === 'distracted') A.distractT = 6;
      }
    } else if (phase === 2) {
      tx = b.x + ((h.x < b.x) ? -1 : 1) * 260;
      if (h.heroe === 'falcon' && windowOpen() && b.st >= 1.0 && !cert) A.press.hack = true;
    }
    if (b.state === 'combo' && Math.abs(h.x - b.x) < 320) tx = b.x + sign(h.x - b.x) * 330;
    tx = clamp(tx, ARENA_L + 24, ARENA_R - 24);
    var dx = tx - h.x;
    if (Math.abs(dx) > 12) A.hold[dx > 0 ? 'right' : 'left'] = true;
    else if (faceBoss && !b.hidden) h.facing = sign(b.x - h.x);
    if (aiDanger(h)) {
      if (h.onGround) A.press.jump = true;
      else if (h.heroe === 'falcon' && h.jumpsLeft > 0 && h.vy > 0) A.press.jump = true;
    }
    if (wantHit && A.shotT <= 0) aiHitBoss(h);
  }

  // ---------------- TRANSICIÓN A LA FASE 3 ----------------
  function startTrans3(holder) {
    mode = 'trans3';
    t3 = { t: 0, holder: holder, m1: false, giant: false, veh: false, fused: false, inside: false };
    orbs = []; waves = []; projs = []; cert = null;
    heroes.forEach(function (h) { h.bumOut = false; h.anim = null; h.vx = 0; h.ko = -1; h.inv = 0; });
    var b = boss;
    b.fF.mode = 'home'; b.fB.mode = 'home'; b.state = 'furious'; b.st = 0; b.yOff = 0; b.tele = 0;
    showMsg('¡GEMA RECUPERADA!', 1.6);
    flyers = [];
    for (var i = 0; i < 8; i++) {
      var a = -PI * 0.95 + i * (PI * 0.9 / 7);
      flyers.push({ sx: 480 + Math.cos(a) * 900, sy: GROUND_Y - 260 + Math.sin(a) * 520,
        ex: rnd(-55, 55), ey: rnd(100, 260), delay: 1.35 + i * 0.2, dur: 0.85, arrived: false });
    }
  }
  function updateTrans3(dt) {
    var T = (t3.t += dt), b = boss;
    // héroes: bajan al suelo y se colocan a la izquierda
    heroes.forEach(function (h, i) {
      if (h.hidden) return;
      var slot = (h === t3.holder) ? 230 : 160;
      var dx = slot - h.x;
      h.vx = (T > 1.0 && Math.abs(dx) > 6) ? sign(dx) * 230 : 0;
      if (h.vx) h.facing = sign(h.vx); else h.facing = 1;
      h.vy += GRAV * dt;
      heroPhysics(h, dt, false);
      h.holdGem = (h === t3.holder) && T < 4.6;
      h.pose = h.holdGem ? 'win' : (!h.onGround ? 'fall' : (Math.abs(h.vx) > 20 ? 'run' : 'idle'));
      if (i === 0 && h.inv > 0) h.inv -= dt;
    });
    if (gem && gem.held) { gem.x = gem.held.x; gem.y = gem.held.y - 84; }
    updateSpy(dt);
    // Dark Secuaz, furioso
    b.st += dt;
    b.facing = sign((heroes[0].x + heroes[1].x) / 2 - b.x);
    b.vis += clamp(-b.facing - b.vis, -7 * dt, 7 * dt);
    b.aimA = angLerp(b.aimA, defaultAim(b.facing), Math.min(1, 8 * dt));
    if (T > 1.2 && T < 3.4) {
      camShake = Math.max(camShake, 0.12);
      b.emote = { text: '¡GRRRR!', t: 0.2 };
      b.sy = 1 + 0.03 * Math.sin(T * 28);
    }
    if (T >= 1.2 && !t3.m1) {
      t3.m1 = true;
      music('giants'); sfx('roar');
      showMsg('¡Dark Secuaz une todas sus torretas!', 2.2);
    }
    if (T > 1.2) zoom = lerp(1, ZOOM3, ease((T - 1.2) / 2.0));
    flyers.forEach(function (f) {
      if (!f.arrived && T >= f.delay + f.dur) {
        f.arrived = true;
        sfx('clink');
        addParts(b.x + f.ex * SS * 0.5, GROUND_Y - f.ey, '#fca5a5', 6, 120, 'dot');
        flash = Math.max(flash, 0.12);
      }
    });
    if (T >= 3.4 && !t3.giant) {
      t3.giant = true;
      flash = 1; camShake = 0.6;
      sfx('explosion'); sfx('roar');
      giant = makeGiant(clamp(b.x, 640, 880));
      giant.grow = 0;
      b.hidden = true; flyers = [];
    }
    if (giant) {
      giant.grow = Math.min(1, giant.grow + dt * 2.5);
      giant.x += (860 - giant.x) * Math.min(1, dt * 1.2);
      giant.facing = -1;
    }
    if (T >= 3.9 && !t3.veh) {
      t3.veh = true;
      vehicles = { t: 0, robot: false };
      sfx('boost');
      showMsg('¡Llegan el robot transformable y el mecha-halcón!', 1.8);
    }
    if (vehicles) {
      vehicles.t += dt;
      if (!vehicles.robot && vehicles.t >= 0.7) {
        vehicles.robot = true;
        addParts(110, GROUND_Y - 60, '#bae6fd', 10, 140, 'star');
        sfx('door');
      }
    }
    if (T >= 4.7 && !t3.inside) {
      t3.inside = true;
      heroes.forEach(function (h) { h.hidden = true; h.holdGem = false; addParts(h.x, h.y - 30, '#fde68a', 10, 140, 'star'); });
      if (gem) { gem = null; gemSaved = true; }
      sfx('jump');
    }
    if (T >= 5.4 && !t3.fused) {
      t3.fused = true;
      flash = 1; camShake = 0.4;
      sfx('transform');
      fusion = makeFusion(180); fusion.pop = 0;
      vehicles = null;
      showMsg('¡FUSIÓN GIGANTE! ¡ROBOT FUSIÓN!', 2.4);
    }
    if (fusion) fusion.pop = Math.min(1, fusion.pop + dt * 3);
    if (T >= 6.8) startPhase3(false);
  }

  // ---------------- FASE 3: PELEA DE GIGANTES ----------------
  function makeFusion(x) {
    return { x: x, vx: 0, facing: 1, punchT: 0, punchDur: 0.28, step: 0, comboT: 0, buf: false, hitDone: false,
      rayCd: 0, shield: false, shieldE: 1, shieldLock: false, inv: 0, hurtT: 0, pop: 1, walk: false,
      p2cdA: 0, p2cdB: 0, hidden: false, shieldHit: 0 };
  }
  function makeGiant(x) {
    return { x: x, facing: -1, hp: GIANT_HP, maxHp: GIANT_HP, state: 'think', st: 0, thinkT: 1.6,
      lean: 0, leanT: 0, hitT: 0, knock: 0, grow: 1, tele: 0, walkT: 0, punchHit: false, ext: 0,
      shooters: [], shotI: 0, shotT: 0,
      turrets: TURRET_DEF.map(function (d) { return { lx: d.lx, ly: d.ly, r: d.r, hp: 2, dead: false, glow: 0, flash: 0 }; }) };
  }
  function startPhase3(direct) {
    mode = 'p3'; phase = 3; checkpoint = 3; zoom = ZOOM3;
    if (!giant) giant = makeGiant(860);
    giant.grow = 1; giant.state = 'think'; giant.st = 0; giant.thinkT = 1.6;
    if (!fusion) fusion = makeFusion(200);
    fusion.pop = 1;
    boss.hidden = true;
    heroes.forEach(function (h) { h.hidden = true; h.holdGem = false; });
    if (direct) { gem = null; gemSaved = true; spy = null; }
    bolts = []; shots = []; beam = null; projs = []; orbs = []; waves = [];
    p3T = 0; p3intro = direct ? 2.2 : 1.0;
    // ¡robot nuevo! La fusión empieza con todos los corazones.
    try {
      G.state.hp = G.state.maxHp || 10;
      if (isCoop()) G.state.hp2 = G.state.hp;
    } catch (e) { /* nada */ }
    if (direct) showMsg('¡PELEA DE GIGANTES!', 2.0);
    music('giants');
  }
  function turretPos(T) {
    return { x: giant.x + T.lx * GKS * giant.facing, y: GROUND_Y + T.ly * GKS };
  }
  function aliveTurrets() { return giant.turrets.filter(function (T) { return !T.dead; }); }
  function giantRect() { return { x: giant.x - 95 * GR, y: GROUND_Y - 320 * GR, w: 190 * GR, h: 320 * GR }; }
  function minGap() { return 200 + 30 * (GR - 1) * 4; }
  function fusionRect() { return { x: fusion.x - 75, y: GROUND_Y - 290, w: 150, h: 290 }; }
  function fusionEye() { return { x: fusion.x + 17 * FS * fusion.facing, y: GROUND_Y - 248 * FS }; }

  function updateP3(dt) {
    p3T += dt;
    if (p3intro > 0) p3intro -= dt;
    updateFusion(dt);
    if (mode !== 'p3') return;
    updateGiant(dt);
    updateBolts(dt);
    updateShots(dt);
    if (beam) { beam.t += dt; if (beam.t > 0.35) beam = null; }
    if (isCoop()) G.state.hp2 = G.state.hp;
  }
  function updateFusion(dt) {
    var f = fusion, IN = inp1();
    if (f.inv > 0) f.inv -= dt;
    if (f.hurtT > 0) f.hurtT -= dt;
    if (f.rayCd > 0) f.rayCd -= dt;
    if (f.p2cdA > 0) f.p2cdA -= dt;
    if (f.p2cdB > 0) f.p2cdB -= dt;
    if (f.shieldHit > 0) f.shieldHit -= dt;
    f.facing = giant.x >= f.x ? 1 : -1;
    var canAct = p3intro <= 0;
    // escudo-ala (mantener salto)
    var want = canAct && IN.held('jump');
    if (!want && f.shieldE > 0.3) f.shieldLock = false;
    f.shield = want && !f.shieldLock && f.shieldE > 0 && f.punchT <= 0;
    if (f.shield) {
      f.shieldE -= dt * 0.3;
      if (f.shieldE <= 0) { f.shieldE = 0; f.shieldLock = true; f.shield = false; }
    } else {
      f.shieldE = Math.min(1, f.shieldE + dt * 0.6);
    }
    // movimiento
    var move = canAct ? ((IN.held('right') ? 1 : 0) - (IN.held('left') ? 1 : 0)) : 0;
    f.walk = false;
    if (f.hurtT > 0) { f.x += f.vx * dt; f.vx *= Math.pow(0.02, dt); }
    else if (!f.shield && f.punchT <= 0 && move !== 0) { f.x += move * 190 * dt; f.walk = true; }
    f.x = clamp(f.x, A3_L + 90, giant.x - minGap());
    // puñetazo con combo de 3
    if (f.punchT > 0) {
      f.punchT -= dt;
      if (canAct && IN.pressed('attack')) f.buf = true;
      if (!f.hitDone && f.punchT <= f.punchDur * 0.5) { f.hitDone = true; fusionPunchHit(); if (mode !== 'p3') return; }
      if (f.punchT <= 0) { f.punchT = 0; f.comboT = 0.5; }
    } else if (canAct && !f.shield && (IN.pressed('attack') || f.buf)) {
      f.buf = false;
      f.step = (f.comboT > 0 && f.step < 3) ? f.step + 1 : 1;
      f.punchDur = f.step === 3 ? 0.42 : 0.28;
      f.punchT = f.punchDur; f.hitDone = false; f.comboT = 0;
      sfx(f.step === 3 ? 'bigPunch' : 'punch');
      if (f.step === 3) sfx('punch');
    }
    if (f.comboT > 0) { f.comboT -= dt; if (f.comboT <= 0) f.step = 0; }
    // rayo de halcón
    if (canAct && IN.pressed('shoot') && f.rayCd <= 0 && !f.shield) fireRay();
    // co-op: el Jugador 2 dispara los cañones de las alas
    if (isCoop() && canAct) {
      var I2 = inp2();
      if (I2.pressed('attack') && f.p2cdA <= 0) { f.p2cdA = 0.5; fireWingShot(1); }
      if (I2.pressed('shoot') && f.p2cdB <= 0) { f.p2cdB = 1.4; fireWingShot(2); }
    }
  }
  function fusionPunchHit() {
    var f = fusion, s = f.step, d = f.facing;
    var r = { x: d > 0 ? f.x + 40 : f.x - 240, y: GROUND_Y - 300, w: 200, h: 250 };
    var fistX = f.x + d * 152, fistY = GROUND_Y - 186;
    var dmg = s === 3 ? 2 : 1, hit = false, best = null, bd = 1e9;
    giant.turrets.forEach(function (T) {
      if (T.dead) return;
      var p = turretPos(T), rr = T.r * GKS;
      if (p.x + rr > r.x && p.x - rr < r.x + r.w && p.y + rr > r.y && p.y - rr < r.y + r.h) {
        var dd = dist(p.x, p.y, fistX, fistY);
        if (dd < bd) { bd = dd; best = T; }
      }
    });
    if (best) { damageTurret(best, dmg); hit = true; }
    // ¡los puñetazos también desvían los rayos de las torretas!
    for (var i = bolts.length - 1; i >= 0; i--) {
      var bo = bolts[i];
      if (bo.x > r.x - 20 && bo.x < r.x + r.w + 20 && bo.y > r.y && bo.y < r.y + r.h) {
        addParts(bo.x, bo.y, '#bff7ff', 6, 120, 'clink');
        bolts.splice(i, 1);
        sfx('clink');
      }
    }
    if (mode === 'p3' && overlap(r, giantRect())) {
      damageGiant(dmg, fistX, fistY); hit = true;
      if (s === 3) giant.knock = 0.35;
    }
    if (hit) { camShake = Math.max(camShake, s === 3 ? 0.3 : 0.18); addParts(fistX, fistY, '#fde68a', 6, 160, 'star'); }
  }
  function fireRay() {
    var f = fusion;
    f.rayCd = 2.2;
    sfx('laser'); sfx('zap');
    var eye = fusionEye(), best = null, bd = 1e9;
    giant.turrets.forEach(function (T) {
      if (T.dead) return;
      var p = turretPos(T), dd = dist(eye.x, eye.y, p.x, p.y);
      if (dd < bd) { bd = dd; best = T; }
    });
    if (best) {
      var p = turretPos(best);
      beam = { x1: eye.x, y1: eye.y, x2: p.x, y2: p.y, t: 0 };
      damageTurret(best, 2);
    } else {
      beam = { x1: eye.x, y1: eye.y, x2: giant.x, y2: GROUND_Y - 200 * GR, t: 0 };
      damageGiant(2, giant.x, GROUND_Y - 200 * GR);
    }
  }
  function fireWingShot(power) {
    var f = fusion;
    var x = f.x + (power === 1 ? -60 : 50) * FS * f.facing, y = GROUND_Y - 262 * FS;
    var al = aliveTurrets();
    var target = al.length ? al[Math.floor(Math.random() * al.length)] : null;
    shots.push({ x: x, y: y, target: target, power: power, t: 0 });
    sfx('laser');
  }
  function updateShots(dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var s = shots[i];
      s.t += dt;
      if (s.target && s.target.dead) s.target = null;
      var p = s.target ? turretPos(s.target) : { x: giant.x, y: GROUND_Y - 200 * GR };
      var dx = p.x - s.x, dy = p.y - s.y, d = Math.sqrt(dx * dx + dy * dy), sp = 560 * dt;
      var hitR = s.target ? s.target.r * GKS + 6 : 60;
      if (d <= Math.max(sp, hitR) || s.t > 3) {
        if (s.target) damageTurret(s.target, s.power);
        else damageGiant(s.power, s.x, s.y);
        addParts(s.x, s.y, '#86efac', 6, 120, 'dot');
        shots.splice(i, 1);
        if (mode !== 'p3') return;
        continue;
      }
      s.x += dx / d * sp; s.y += dy / d * sp;
    }
  }
  function damageTurret(T, n) {
    if (!T || T.dead || mode !== 'p3') return;
    T.hp -= n; T.flash = 0.15;
    var p = turretPos(T);
    addParts(p.x, p.y, '#fde68a', 5, 120, 'dot');
    sfx('hit');
    if (T.hp <= 0) {
      T.dead = true; T.glow = 0;
      addParts(p.x, p.y, '#fb923c', 14, 200, 'dot');
      addParts(p.x, p.y, '#fde68a', 8, 160, 'star');
      sfx('explosion');
      addText(p.x, p.y - 40, '¡POP!', '#fde047', 30);
      giant.knock = Math.max(giant.knock, 0.3);
      damageGiant(3, p.x, p.y);
    }
  }
  function damageGiant(n, x, y) {
    if (mode !== 'p3') return;
    giant.hp = Math.max(0, giant.hp - n);
    giant.hitT = 0.15;
    addParts(x, y, '#ffd166', 8, 160, 'dot');
    sfx('hit');
    if (giant.hp <= 0) startVictory();
  }
  function updateGiant(dt) {
    var g = giant, f = fusion;
    g.st += dt;
    if (g.hitT > 0) g.hitT -= dt;
    if (g.knock > 0) g.knock -= dt;
    g.facing = f.x < g.x ? -1 : 1;
    g.turrets.forEach(function (T) { if (T.flash > 0) T.flash -= dt; });
    var gap = Math.abs(g.x - f.x);
    g.leanT = 0; g.tele = 0;
    if (p3intro > 0) { g.state = 'think'; g.st = 0; }
    switch (g.state) {
      case 'think':
        if (gap > 360) {
          g.x += g.facing * 55 * dt;
          g.walkT += dt;
          if (g.walkT > 0.7) { g.walkT = 0; camShake = Math.max(camShake, 0.08); sfx('robot'); }
        }
        if (g.st >= g.thinkT) chooseGiantAttack(gap);
        break;
      case 'punchTele':
        g.tele = 1; g.leanT = -g.facing * 0.1;
        if (g.st >= 1.1) { g.state = 'punch'; g.st = 0; g.punchHit = false; sfx('bigPunch'); sfx('punch'); }
        break;
      case 'punch':
        g.leanT = g.facing * 0.14;
        g.ext = Math.min(1, g.st / 0.12);
        if (g.st < 0.25) g.x += g.facing * 280 * dt;
        if (!g.punchHit && g.st >= 0.12) {
          g.punchHit = true;
          var zone = { x: g.facing < 0 ? g.x - 360 : g.x + 70, y: GROUND_Y - 340, w: 290, h: 340 };
          if (overlap(zone, fusionRect())) hurtFusion(2, g.x);
          camShake = Math.max(camShake, 0.3);
        }
        if (g.st >= 0.35) { g.state = 'punchBack'; g.st = 0; }
        break;
      case 'punchBack':
        g.ext = Math.max(0, 1 - g.st / 0.5);
        if (g.st >= 0.6) { g.state = 'think'; g.st = 0; g.thinkT = 1.7; g.ext = 0; }
        break;
      case 'rayTele':
        g.tele = 1;
        if (g.st >= 0.9) { g.state = 'rayFire'; g.st = 0; g.shotI = 0; g.shotT = 0; }
        break;
      case 'rayFire':
        g.shotT -= dt;
        if (g.shotT <= 0 && g.shotI < g.shooters.length) {
          fireGiantBolt(g.shooters[g.shotI]);
          g.shotI++; g.shotT = 0.16;
        }
        if (g.shotI >= g.shooters.length && g.shotT <= 0) {
          g.shooters.forEach(function (T) { if (T && T.glow !== undefined) T.glow = 0; });
          g.state = 'think'; g.st = 0; g.thinkT = 1.7;
        }
        break;
    }
    g.x = clamp(g.x, f.x + minGap(), A3_R - 110);
    var kn = g.knock > 0 ? -g.facing * 0.1 : 0;
    g.lean += (g.leanT + kn - g.lean) * Math.min(1, 8 * dt);
  }
  function chooseGiantAttack(gap) {
    var g = giant;
    g.st = 0;
    if (gap < 460 && Math.random() < 0.55) { g.state = 'punchTele'; return; }
    g.state = 'rayTele';
    var al = aliveTurrets();
    for (var i = al.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = al[i]; al[i] = al[j]; al[j] = tmp; }
    g.shooters = al.slice(0, 3);
    if (!g.shooters.length) g.shooters = [null, null];      // sin torretas: dispara la cabeza
    g.shooters.forEach(function (T) { if (T) T.glow = 1; });
  }
  function fireGiantBolt(T) {
    var g = giant, f = fusion;
    var p = (T && !T.dead) ? turretPos(T) : { x: g.x + g.facing * 20, y: GROUND_Y - 280 * GR };
    var tx = f.x, ty = GROUND_Y - 170, ang = Math.atan2(ty - p.y, tx - p.x);
    bolts.push({ x: p.x, y: p.y, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, r: 11, life: 5, t: 0 });
    sfx('laser');
  }
  function updateBolts(dt) {
    for (var i = bolts.length - 1; i >= 0; i--) {
      var b = bolts[i], dead = false;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.t += dt;
      if (overlap({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, fusionRect())) {
        dead = true; hurtFusion(1, b.x);
      }
      if (b.life <= 0 || b.y > GROUND_Y + 10 || b.x < A3_L - 300 || b.x > A3_R + 300) dead = true;
      if (dead) bolts.splice(i, 1);
      if (mode !== 'p3') return;
    }
  }
  function hurtFusion(dmg, fromX) {
    var f = fusion;
    if (mode !== 'p3' || f.inv > 0) return;
    if (f.shield) {
      sfx('shieldBlock'); sfx('clink');
      addParts(f.x + f.facing * 120, GROUND_Y - 170, '#bff7ff', 8, 140, 'clink');
      f.shieldHit = 0.2;
      return;
    }
    if (debugInv()) { f.inv = 0.4; return; }
    G.state.hp = Math.max(0, (G.state.hp || 0) - dmg);
    if (isCoop()) G.state.hp2 = G.state.hp;
    f.inv = 1.2; f.hurtT = 0.3; f.vx = -f.facing * 300;
    camShake = Math.max(camShake, 0.35);
    sfx('hurt');
    if (G.state.hp <= 0) loseGame();
  }

  // ---------------- VICTORIA ----------------
  function startVictory() {
    if (mode === 'victory') return;
    mode = 'victory'; vt = 0;
    bolts = []; shots = []; beam = null; msg = null;
    if (!giant) giant = makeGiant(860);
    if (!fusion) fusion = makeFusion(300);
    zoom = ZOOM3;
    music(null);
    sfx('roar');
    camShake = 0.5;
    showMsg('¡VICTORIA! El gigante se desarma…', 1.6);
    var pts = [];
    giant.turrets.forEach(function (T) { pts.push(T); });
    vic = { popT: 0, popI: 0, pts: pts, sx: clamp(giant.x, 600, 740), hx: clamp(fusion.x, 230, 400),
      flashDone: false, goodDone: false, gemShown: false, gemBurst: false, gemR: 0 };
    escapees = [
      { kind: 'dronEnjambre', x0: 780, y0: 300, vx: 70, vy: -58, d: 2.7, s: 0.3 },
      { kind: 'dronPicado', x0: 835, y0: 318, vx: 86, vy: -50, d: 3.1, s: 0.26 },
      { kind: 'dronRayo', x0: 735, y0: 312, vx: 58, vy: -66, d: 3.5, s: 0.24 },
      { kind: 'boxeador', x0: 870, y0: 334, vx: 74, vy: -54, d: 3.9, s: 0.2 }
    ];
  }
  function updateVictory(dt) {
    vt += dt;
    var b = boss;
    if (vt < 1.6) {
      camShake = Math.max(camShake, 0.15);
      vic.popT -= dt;
      if (vic.popT <= 0 && vic.pts.length) {
        vic.popT = 0.14;
        var T = vic.pts[vic.popI % vic.pts.length];
        vic.popI++;
        var p = turretPos(T);
        T.dead = true;
        addParts(p.x, p.y, '#fb923c', 10, 180, 'dot');
        addParts(p.x, p.y, '#fde68a', 5, 140, 'star');
        if (vic.popI % 2) sfx('explosion');
      }
    }
    if (vt >= 1.6 && !vic.flashDone) {
      vic.flashDone = true;
      flash = 1; sfx('explosion'); sfx('transform');
      b.hidden = false; b.x = vic.sx; b.y = GROUND_Y; b.yOff = 0; b.vy = 0; b.good = false;
      b.state = 'dizzy'; b.st = 0; b.facing = -1; b.vis = 1; b.lean = 0; b.sy = 1; b.bobY = 0;
      b.fF = makeFist(); b.fB = makeFist(); b.pocketBroken = true; b.hasGem = false; b.lockCracks = 3;
      b.aimA = defaultAim(-1); b.emote = null; b.tele = 0;
      fusion.hidden = true;
      heroes.forEach(function (h, i) {
        h.hidden = false; h.ko = -1; h.inv = 0; h.holdGem = false;
        h.x = vic.hx - i * 64; h.y = GROUND_Y; h.vx = 0; h.vy = 0; h.facing = 1; h.pose = 'win';
        addParts(h.x, h.y - 30, '#bae6fd', 10, 140, 'star');
      });
    }
    if (vt >= 1.6) zoom = lerp(ZOOM3, 1, ease((vt - 1.6) / 0.9));
    if (vic.flashDone) b.st += dt;
    if (vt >= 2.6 && !vic.goodDone) {
      vic.goodDone = true;
      b.good = true; b.state = 'friend';
      sfx('hackOk');
      var hd = headPos();
      addParts(hd.x, hd.y, '#86efac', 18, 180, 'star');
      showMsg('¡Dark Secuaz es libre y ahora es amigo de los héroes!', 1.8);
    }
    if (vt >= 3.3) {
      vic.gemShown = true;
      vic.gemR = clamp((vt - 3.6) / 1.2, 0, 1);
      if (vic.gemR >= 0.72 && !vic.gemBurst) {
        vic.gemBurst = true;
        var gp = victoryGemPos();
        addParts(gp.x, gp.y, '#fde68a', 18, 220, 'star');
        addParts(gp.x, gp.y, '#f9a8d4', 10, 180, 'star');
        sfx('explosion'); sfx('victory');
        showMsg('¡La Gema del Poder se rompe para siempre!', 2.0);
      }
    }
    if (vt >= 6.0 && !doneGuard) {
      doneGuard = true;
      sfx('victory');
      if (G.scenes && G.scenes.levelDoneP2) G.go('levelDoneP2', { chapter: 5 });
    }
  }
  function victoryGemPos() {
    return { x: (vic.hx + vic.sx) / 2 - 20, y: GROUND_Y - 200 + Math.sin(clock * 2.5) * 6 };
  }

  // ============================================================
  //  RENDER
  // ============================================================
  scene.render = function (ctx) {
    if (!heroes || !boss) return;
    ctx.save();
    try { draw(ctx); }
    catch (e) { warnOnce(e); try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (e2) { /* nada */ } }
    ctx.restore();
  };
  function draw(ctx) {
    var t = clock;
    drawBackground(ctx, t);
    if (mode === 'victory') drawEscapees(ctx, t);
    // mundo con cámara
    ctx.save();
    if (camShake > 0) {
      var s = Math.min(camShake, 0.6) * 34;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    ctx.translate(W / 2, GROUND_Y); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -GROUND_Y);
    drawFloor(ctx);
    var pa = clamp((zoom - ZOOM3) / (1 - ZOOM3), 0, 1);
    if (pa > 0.02) drawPlatforms(ctx, pa);
    if (mode === 'p12') drawP12(ctx, t);
    else if (mode === 'trans3') drawTrans3(ctx, t);
    else if (mode === 'p3') drawP3(ctx, t);
    else drawVictoryScene(ctx, t);
    drawParts(ctx);
    drawTexts(ctx);
    ctx.restore();
    if (flash > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, flash); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    drawHUD(ctx, t);
    if (fade > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, fade); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  // ---------- escenario ----------
  function drawBackground(ctx, t) {
    if (!art('bgFortaleza', ctx, t)) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3f3d8a'); g.addColorStop(0.6, '#7c62b2'); g.addColorStop(1, '#ffd2a6');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#a99cc6'; ctx.fillRect(0, 260, W, H - 260);
      for (var m = 0; m < 14; m++) rfill(ctx, m * 72 - 8, 236, 44, 30, 5, '#a99cc6', 'rgba(26,26,46,0.7)', 3);
      if (window.P2 && P2.horns) { try { P2.horns(ctx, 480, 200, 1.4, '#c7965f'); } catch (e) { /* nada */ } }
    }
    if (mode === 'p3' || mode === 'trans3') {
      var k = mode === 'p3' ? 1 : clamp((t3 ? t3.t : 0) - 1.2, 0, 1);
      ctx.save(); ctx.globalAlpha = 0.16 * k; ctx.fillStyle = '#7f1d1d'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }
  function drawFloor(ctx) {
    var wl = W / 2 - (W / 2) / zoom - 48, wr = W / 2 + (W / 2) / zoom + 48;
    var rows = Math.ceil(((H - GROUND_Y) / zoom) / 48) + 1;
    var useArt = hasArt('tile');
    for (var r = 0; r < rows; r++) {
      var y = GROUND_Y + r * 48;
      for (var x = Math.floor(wl / 48) * 48; x < wr; x += 48) {
        if (!useArt || !art('tile', ctx, x, y, 48, 'solid', 'fortaleza')) tileFallback(ctx, x, y, 'solid');
      }
    }
  }
  function drawPlatforms(ctx, alpha) {
    var useArt = hasArt('tile');
    ctx.save();
    ctx.globalAlpha = alpha;
    for (var i = 0; i < PLATS.length; i++) {
      var pl = PLATS[i];
      for (var x = pl.x; x < pl.x + pl.w - 1; x += 48) {
        if (!useArt || !art('tile', ctx, x, pl.y, 48, 'platform', 'fortaleza')) tileFallback(ctx, x, pl.y, 'platform');
      }
    }
    ctx.restore();
  }
  function tileFallback(ctx, x, y, kind) {
    if (kind === 'platform') {
      rfill(ctx, x, y, 48, 16, 5, '#8e82ad', O, 2.5);
      ctx.fillStyle = '#d2c8e8'; ctx.fillRect(x + 4, y + 3, 40, 4);
      return;
    }
    rfill(ctx, x, y, 48, 48, 5, '#7b6f9b', O, 2.5);
    ctx.fillStyle = '#c8bde0'; ctx.fillRect(x + 3, y + 3, 42, 11);
    ctx.fillStyle = '#e3b85c'; ctx.fillRect(x + 3, y + 3, 42, 3);
  }

  // ---------- fases 1 y 2 ----------
  function drawP12(ctx, t) {
    drawWaves(ctx, t);
    if (!boss.hidden) drawBoss(ctx, t);
    drawGem(ctx, t);
    drawCert(ctx);
    drawProjs(ctx, t);
    drawOrbs(ctx, t);
    for (var i = heroes.length - 1; i >= 0; i--) drawHero(ctx, heroes[i], t);
    drawSpy(ctx, t);
    if (!boss.hidden) drawBossOverlays(ctx, t);
  }
  function drawWaves(ctx, t) {
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      ctx.save();
      ctx.globalAlpha = 0.85;
      var g = ctx.createRadialGradient(w.x, GROUND_Y, 2, w.x, GROUND_Y, 34);
      g.addColorStop(0, 'rgba(254,240,138,0.9)'); g.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(w.x, GROUND_Y - 4, 34, 22, 0, 0, PI * 2); ctx.fill();
      ctx.restore();
      gfx('drawShockwave', [ctx, w.x, GROUND_Y - 2, 26 + Math.sin(t * 20 + i) * 4, 0.15]);
      // cresta de la onda (más visible)
      ctx.save();
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(w.x, GROUND_Y + 6, 22, PI * 1.15, PI * 1.85); ctx.stroke();
      ctx.restore();
    }
  }
  function palFor(good) {
    var E = pal();
    return good ? { RED: GOOD.RED, RED_L: GOOD.RED_L, STEEL_DD: E.STEEL_DD, DARK: E.DARK }
      : { RED: E.RED, RED_L: E.RED_L, STEEL_DD: E.STEEL_DD, DARK: E.DARK };
  }
  function drawSecuazArt(ctx, good, La) {
    if (hasArt('secuaz')) {
      try { P2.fn.secuaz(ctx, 0, 0, { scale: 1, good: good, angle: La }); return; } catch (e) { /* respaldo */ }
    }
    rfill(ctx, -50, -124, 100, 120, 18, '#64748b', O, 3);
    circle(ctx, 0, -150, 22, good ? GOOD.RED : EN.RED, O, 3);
    circle(ctx, 0, -146, 7, good ? GOOD.EYE : EN.EYE, O, 2);
  }
  function drawBoss(ctx, t) {
    var b = boss;
    // sombra en el suelo (también cuando salta)
    ctx.save();
    ctx.globalAlpha = 0.25 * clamp(1 + b.yOff / 500, 0.3, 1);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(b.x, GROUND_Y, 100 * clamp(1 + b.yOff / 800, 0.5, 1), 13, 0, 0, PI * 2); ctx.fill();
    ctx.restore();
    var jx = 0, jy = 0;
    if (b.state === 'furious' || b.state === 'trans2' || b.state === 'stagger') { jx = rnd(-3, 3); jy = rnd(-2, 2); }
    if (b.state === 'furious') {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 14);
      var hp = bossL2W(0, -95, false);
      var g = ctx.createRadialGradient(hp.x, hp.y, 20, hp.x, hp.y, 230);
      g.addColorStop(0, 'rgba(239,68,68,0.9)'); g.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hp.x, hp.y, 230, 0, PI * 2); ctx.fill();
      ctx.restore();
    }
    var m = b.vis;
    if (Math.abs(m) < 0.06) m = m < 0 ? -0.06 : 0.06;
    var k = SS * b.scale;
    ctx.save();
    ctx.translate(b.x + jx, b.y + b.yOff + b.bobY + jy);
    ctx.rotate(b.lean);
    ctx.scale(k * m, k * b.sy);
    var detF = b.fF.mode !== 'home', detB = b.fB.mode !== 'home';
    ctx.save();
    if (detF || detB) {
      ctx.beginPath();
      ctx.rect(-400, -500, 800, 520);
      if (detF) ctx.rect(-88, -84, 49, 46);
      if (detB) ctx.rect(39, -84, 49, 46);
      ctx.clip('evenodd');
    }
    var La = b.aimA - b.lean;
    if (m < 0) La = PI - La;
    drawSecuazArt(ctx, b.good, La);
    ctx.restore();
    drawPocketOverlay(ctx, b, t);
    var P = palFor(b.good);
    if (detF) circle(ctx, -61, -80, 6, P.DARK, O, 2);
    if (detB) circle(ctx, 61, -80, 6, P.DARK, O, 2);
    ctx.restore();
    drawLooseFist(ctx, b.fF, true, t);
    drawLooseFist(ctx, b.fB, false, t);
  }
  // Candado / bolsillo encima del dibujo aprobado (coordenadas locales del dibujo).
  function drawPocketOverlay(ctx, b, t) {
    if (b.good) return;
    var E = pal();
    if (b.lockCracks < 3) {
      var sh = b.lockShake > 0 ? Math.sin(t * 60) * 2 : 0;
      ctx.save();
      ctx.translate(sh, 0);
      ctx.lineCap = 'round';
      ctx.strokeStyle = O; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(28, -61, 5.5, PI, 0); ctx.stroke();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(28, -61, 5.5, PI, 0); ctx.stroke();
      rfill(ctx, 19, -62, 18, 15, 3, '#fbbf24', O, 1.8);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(21, -60, 3, 10);
      circle(ctx, 28, -56.5, 1.8, O, null);
      ctx.fillStyle = O; ctx.fillRect(27.3, -56, 1.4, 4);
      ctx.strokeStyle = O; ctx.lineWidth = 1.2;
      if (b.lockCracks >= 1) { ctx.beginPath(); ctx.moveTo(21, -60); ctx.lineTo(24, -56); ctx.lineTo(22, -52); ctx.lineTo(25, -49); ctx.stroke(); }
      if (b.lockCracks >= 2) { ctx.beginPath(); ctx.moveTo(35, -61); ctx.lineTo(32, -57); ctx.lineTo(34, -53); ctx.lineTo(31, -48); ctx.stroke(); }
      ctx.restore();
      return;
    }
    if (!b.pocketBroken) {
      // sin candado: se tapa el cierre y la gema asoma
      circle(ctx, 28, -59, 5.4, E.DARK, null);
      var open = windowOpen() || !!cert;
      var pulse = 0.5 + 0.5 * Math.sin(t * 10);
      if (open) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.35 * pulse;
        rfill(ctx, 5, -79, 46, 38, 11, '#fde047', null);
        ctx.restore();
        rfill(ctx, 10, -74, 36, 28, 8, null, '#fde047', 2.5);
      }
      ctx.save();
      ctx.globalAlpha = open ? 1 : 0.85;
      ctx.beginPath(); ctx.ellipse(28, -60, open ? 8 : 6, open ? 6 : 4.5, 0, 0, PI * 2);
      ctx.fillStyle = E.GEM; ctx.fill();
      ctx.strokeStyle = '#4c0519'; ctx.lineWidth = 1.2; ctx.stroke();
      circle(ctx, 26, -62, 1.5, '#ffffff', null);
      ctx.restore();
      return;
    }
    // bolsillo roto: se tapa el brillo de la gema y se ve el agujero
    ctx.fillStyle = E.RED; ctx.fillRect(13, -79, 30, 6);
    ctx.strokeStyle = O; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, -80); ctx.lineTo(44, -80); ctx.moveTo(12, -72); ctx.lineTo(44, -72); ctx.stroke();
    rfill(ctx, 12, -72, 32, 24, 6, E.DARK, O, 2.5);
    ctx.beginPath();
    ctx.moveTo(17, -68); ctx.lineTo(23, -64); ctx.lineTo(27, -69); ctx.lineTo(32, -63); ctx.lineTo(38, -68);
    ctx.lineTo(39, -56); ctx.lineTo(17, -56); ctx.closePath();
    ctx.fillStyle = '#05060f'; ctx.fill();
    ctx.save(); ctx.translate(20, -50); ctx.rotate(0.5);
    rfill(ctx, -5, 0, 14, 9, 2, E.STEEL_DD, O, 1.6);
    ctx.restore();
  }
  function drawFist(ctx, x, y, s, dir, good) {
    var P = palFor(good);
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    rfill(ctx, -19, -17, 38, 34, 12, P.RED, O, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-13, -13, 22, 4);
    ctx.strokeStyle = O; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var d = -8; d <= 8; d += 8) { ctx.beginPath(); ctx.moveTo(d + 3, -15); ctx.lineTo(d + 3, -6); ctx.stroke(); }
    ctx.restore();
  }
  function tube(ctx, x1, y1, x2, y2, w, col) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = O; ctx.lineWidth = w + 6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L;
    ctx.strokeStyle = 'rgba(26,26,46,0.45)'; ctx.lineWidth = 2;
    for (var k = 1; k <= 3; k++) {
      var px = x1 + dx * k / 4, py = y1 + dy * k / 4;
      ctx.beginPath(); ctx.moveTo(px + nx * w * 0.45, py + ny * w * 0.45); ctx.lineTo(px - nx * w * 0.45, py - ny * w * 0.45); ctx.stroke();
    }
    ctx.restore();
  }
  function drawFlame(ctx, x, y, dir, t, power) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(dir, 1);
    var L = (22 + 14 * Math.sin(t * 40)) * power;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-L - 10, 0); ctx.lineTo(0, 11); ctx.closePath();
    ctx.fillStyle = '#fb923c'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-L * 0.6, 0); ctx.lineTo(0, 6); ctx.closePath();
    ctx.fillStyle = '#fde047'; ctx.fill();
    ctx.restore();
  }
  function drawLooseFist(ctx, F, front, t) {
    if (F.mode === 'home') return;
    var b = boss, s = SS * b.scale, P = palFor(b.good);
    var wr = bossL2W(front ? -61 : 61, -80, false);
    var dir;
    if (F.mode === 'jab' || F.mode === 'ground') {
      tube(ctx, wr.x, wr.y, F.x, F.y, 16, P.STEEL_DD);
      dir = F.x >= wr.x ? 1 : -1;
    } else if (F.mode === 'back') {
      dir = F.x >= b.x ? 1 : -1;
      ctx.save(); ctx.globalAlpha = 0.5;
      circle(ctx, F.x + dir * 34, F.y, 7, '#e2e8f0', null);
      circle(ctx, F.x + dir * 52, F.y + 2, 5, '#e2e8f0', null);
      ctx.restore();
    } else {
      dir = F.mode === 'ready' ? b.facing : (F.vx >= 0 ? 1 : -1);
      drawFlame(ctx, F.x - dir * 28, F.y, dir, t, F.mode === 'ready' ? 0.45 : 1);
    }
    drawFist(ctx, F.x, F.y, s, dir, b.good);
    if (F.mode === 'ready' && b.sub === 'tele') gfx('drawExclamation', [ctx, F.x, F.y - 52]);
  }
  function drawBubble(ctx, x, y, text, col) {
    ctx.save();
    ctx.font = 'bold 22px ' + FONT;
    var w = ctx.measureText(text).width + 24, h = 36;
    ctx.beginPath();
    ctx.moveTo(x - 8, y + h / 2 - 2); ctx.lineTo(x, y + h / 2 + 12); ctx.lineTo(x + 8, y + h / 2 - 2); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.stroke();
    rfill(ctx, x - w / 2, y - h / 2, w, h, 12, '#ffffff', O, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y + h / 2 - 4, 12, 5);
    ctx.fillStyle = col || O;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }
  function drawKey(ctx, x, y, label) {
    var bob = Math.sin(clock * 8) * 3;
    ctx.save();
    rfill(ctx, x - 17, y - 17 + bob, 34, 34, 8, '#fef3c7', O, 3);
    ctx.fillStyle = 'rgba(26,26,46,0.15)'; ctx.fillRect(x - 13, y + 9 + bob, 26, 4);
    ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = O; ctx.fillText(label, x, y + bob);
    ctx.restore();
  }
  function drawBossOverlays(ctx, t) {
    var b = boss, hd = headPos();
    if (b.tele) gfx('drawExclamation', [ctx, hd.x + b.facing * 80, hd.y - 14]);
    var em = null, col = '#dc2626';
    if (b.state === 'distracted') { em = (b.st % 1.3 < 0.8) ? '¿?' : '¡GRRR!'; }
    else if (b.emote) em = b.emote.text;
    if (em === '¿?' || em === '¡¿EH?!') col = '#2563eb';
    if (em === '¡MÍA!') col = '#7c2d12';
    if (em) drawBubble(ctx, hd.x - b.facing * 112, hd.y + 2, em, col);
    if (b.state === 'stuck' || b.state === 'stagger' || b.state === 'dizzy') {
      for (var i = 0; i < 3; i++) {
        var a = t * 4 + i * 2.1;
        star(ctx, hd.x + Math.cos(a) * 46, hd.y - 50 + Math.sin(a) * 10, 8, '#fde047', t * 3 + i);
      }
    }
    if (b.state === 'friend') {
      var by = Math.sin(t * 3) * 6;
      if (window.P2 && P2.heart) { try { P2.heart(ctx, hd.x + 92, hd.y - 50 + by, 2.4); } catch (e) { /* nada */ } }
    }
    if (mode !== 'p12') return;
    if (phase === 1 && b.lockCracks < 3 && b.state === 'distracted') {
      for (var k = 0; k < heroes.length; k++) {
        var h = heroes[k];
        if (!h.isAI && h !== b.distractBy && inPocketReach(h)) {
          var p = pocketPos(false);
          drawKey(ctx, p.x, p.y - 50, keyHack(h));
          break;
        }
      }
    }
    if (windowOpen()) {
      var fal = falconHero();
      if (fal && !fal.isAI && heroAlive(fal)) drawKey(ctx, fal.x, fal.y - 96, keyHack(fal));
    }
  }
  function drawGemAt(ctx, x, y, t, scale, rota) {
    if (!art('gemaPoder', ctx, x, y, { scale: scale, t: t, rota: rota || 0 })) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale * 1.5, scale * 1.5);
      if (!gfx('drawGem', [ctx, 0, 0, t])) circle(ctx, 0, 0, 9, EN.GEM, O, 2);
      ctx.restore();
    }
  }
  function drawGem(ctx, t) {
    if (!gem) return;
    if (!gem.held) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 8);
      circle(ctx, gem.x, gem.y, 26, '#fde68a', null);
      ctx.restore();
      if (gem.y > GROUND_Y - 40) {
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(gem.x, GROUND_Y, 14, 4, 0, 0, PI * 2); ctx.fill(); ctx.restore();
      }
    }
    drawGemAt(ctx, gem.x, gem.y, t, 1, 0);
    if (spy && spy.st === 'scan' && Math.floor(t * 20) % 3 !== 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(110,231,183,0.7)'; ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(gem.x - 16, gem.y - 18, 32, 34);
      ctx.restore();
    }
  }
  function drawCert(ctx) {
    if (!cert) return;
    ctx.save();
    for (var i = 0; i < cert.trail.length; i++) {
      var p = cert.trail[i];
      ctx.globalAlpha = (i + 1) / cert.trail.length * 0.6;
      circle(ctx, p.x, p.y, 3 + i * 0.5, '#fde047', null);
    }
    ctx.restore();
    ctx.save();
    ctx.shadowColor = '#fde047'; ctx.shadowBlur = 16;
    ctx.translate(cert.x, cert.y); ctx.scale(1.5, 1.5);
    gfx('drawArrowProj', [ctx, 0, 0, cert.angle]);
    ctx.restore();
  }
  function drawProjs(ctx, t) {
    for (var i = 0; i < projs.length; i++) {
      var p = projs[i];
      if (p.kind === 'arrow') gfx('drawArrowProj', [ctx, p.x, p.y, p.angle]);
      else if (p.kind === 'bumeran') {
        if (!art('bumeran', ctx, p.x, p.y, { t: t, scale: 1 })) circle(ctx, p.x, p.y, 12, '#38bdf8', O, 2.5);
      } else if (p.kind === 'red') {
        if (!art('red', ctx, p.x, p.y, { scale: 1, abierta: true })) {
          ctx.save(); ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = 2; ctx.strokeRect(p.x - 16, p.y - 16, 32, 32); ctx.restore();
        }
      }
    }
  }
  function drawOrbs(ctx, t) {
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      var pulse = 1 + 0.12 * Math.sin(t * 10 + o.x);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16;
      var g = ctx.createRadialGradient(0, 0, 2, 0, 0, o.r * pulse);
      g.addColorStop(0, '#fff1f2'); g.addColorStop(0.5, '#ef4444'); g.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, o.r * pulse, 0, PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = O; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }
  function needsHandArt(heroe, w) {
    if (heroe === 'falcon') return !(w === 'espada' || w === 'arco');
    return w !== 'pulso';
  }
  function drawHero(ctx, h, t) {
    if (h.hidden || h.ko >= 0) return;
    if (h.inv > 0 && Math.floor(h.inv * 14) % 2 === 0) return;
    if (h.weapons.indexOf('jetpack') >= 0) art('jetpack', ctx, h.x, h.y, { facing: h.facing, scale: 1, llama: h.jetOn ? 1 : 0 });
    if (!gfx(h.heroe === 'falcon' ? 'drawFalcon' : 'drawDirector', [ctx, h.x, h.y, { t: t, facing: h.facing, pose: h.pose }])) {
      rfill(ctx, h.x - h.w / 2, h.y - h.h, h.w, h.h, 8, h.heroe === 'falcon' ? '#22c55e' : '#3b82f6', O, 3);
    }
    if (h.anim) {
      var a01 = clamp(h.anim.t / h.anim.dur, 0, 1), f = h.facing, w = h.anim.w;
      if (needsHandArt(h.heroe, w)) {
        var hx = h.x + f * (h.anim.pose === 'attack' ? 34 : 30), hy = h.y - (h.anim.pose === 'attack' ? 18 : 24);
        art('armaEnMano', ctx, hx, hy, { arma: w, facing: f, t01: a01, scale: 1 });
      }
      var fx = h.x + f * 30, fy = h.y - h.h * 0.55;
      if (w === 'espada') gfx('drawSlash', [ctx, fx, fy, f, a01]);
      else if (w === 'guantes') gfx('drawPunch', [ctx, fx + f * 6, fy, f, a01]);
      else if (w === 'pulso') {
        ctx.save(); ctx.translate(h.x + f * 24, fy); ctx.scale(2.2, 1);
        gfx('drawZap', [ctx, 0, 0, f, a01]);
        ctx.restore();
      }
    } else if (h.weapons.indexOf('bumeran') >= 0 && !h.bumOut) {
      art('bumeran', ctx, h.x + h.facing * 15, h.y - 30, { t: 0, scale: 0.55 });
    }
    if (isCoop()) outlined(ctx, h.ctrl === 'p1' ? 'P1' : 'P2', h.x, h.y - 76, 14, h.ctrl === 'p1' ? '#7dd3fc' : '#86efac');
  }
  function drawSpy(ctx, t) {
    if (!spy || spy.st === 'wait') return;
    var scanning = spy.st === 'scan';
    if (!art('dronEspia', ctx, spy.x, spy.y, { scale: 0.9, t: t, escaneando: scanning })) {
      circle(ctx, spy.x, spy.y, 6, '#3f4658', O, 1.8);
      circle(ctx, spy.x, spy.y + 1, 2.4, scanning ? '#6ee7b7' : '#94a3b8', null);
      if (scanning) {
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#a7f3d0';
        ctx.beginPath(); ctx.moveTo(spy.x, spy.y + 4); ctx.lineTo(spy.x - 18, spy.y + 62); ctx.lineTo(spy.x + 18, spy.y + 62); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }

  // ---------- transición a la fase 3 ----------
  function drawTrans3(ctx, t) {
    var T = t3 ? t3.t : 0;
    if (!boss.hidden) drawBoss(ctx, t);
    for (var i = 0; i < flyers.length; i++) {
      var f = flyers[i];
      var k = (T - f.delay) / f.dur;
      if (k < 0 || f.arrived) continue;
      var e = ease(k);
      var ex = boss.x + f.ex * SS * 0.5, ey = GROUND_Y - f.ey;
      var cx = (f.sx + ex) / 2, cy = Math.min(f.sy, ey) - 160;
      var x = (1 - e) * (1 - e) * f.sx + 2 * (1 - e) * e * cx + e * e * ex;
      var y = (1 - e) * (1 - e) * f.sy + 2 * (1 - e) * e * cy + e * e * ey;
      drawFlyingTurret(ctx, x, y, t, f.sx < ex ? 1 : -1);
    }
    if (giant) drawGiant(ctx, t);
    if (vehicles) drawVehicles(ctx, t);
    for (var j = heroes.length - 1; j >= 0; j--) drawHero(ctx, heroes[j], t);
    if (gem && gem.held && !gem.held.hidden) drawGemAt(ctx, gem.x, gem.y, t, 1.1, 0);
    if (fusion) drawFusion(ctx, t);
    drawSpy(ctx, t);
    if (!boss.hidden) drawBossOverlays(ctx, t);
  }
  function drawFlyingTurret(ctx, x, y, t, dir) {
    ctx.save();
    ctx.strokeStyle = 'rgba(254,202,202,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - dir * (26 + i * 6), y - 6 + i * 6); ctx.lineTo(x - dir * (50 + i * 6), y - 6 + i * 6); ctx.stroke(); }
    ctx.restore();
    if (hasArt('turretHead')) {
      try {
        ctx.save();
        P2.fn.turretHead(ctx, x, y + 20, 1.3, { RED: EN.RED, RED_L: EN.RED_L, EYE: EN.EYE }, dir > 0 ? -0.3 : PI + 0.3, false);
        ctx.restore();
        return;
      } catch (e) { ctx.restore(); }
    }
    gfx('drawTurret', [ctx, x, y + 14, { t: t, scale: 1 }]);
  }
  function drawVehicles(ctx, t) {
    var vT = (G.p2 && G.p2.vehicle && G.p2.vehicle.transformable === 'B') ? 'B' : 'A';
    var vM = (G.p2 && G.p2.vehicle && G.p2.vehicle.mechahalcon === 'B') ? 'B' : 'A';
    var k = vehicles.t;
    var e1 = ease(k / 0.7), em = ease(k / 0.8), merge = ease((k - 1.0) / 0.5);
    var cx = lerp(-420, 110, e1), mx = lerp(-320, 240, em), my = lerp(60, GROUND_Y - 190, em);
    var tx = 180, ty = GROUND_Y - 130;
    if (k >= 1.0) {
      ctx.save(); ctx.globalAlpha = 0.5 * merge;
      var g = ctx.createRadialGradient(tx, ty, 10, tx, ty, 200);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(165,243,252,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 200, 0, PI * 2); ctx.fill();
      ctx.restore();
    }
    if (!vehicles.robot) {
      art('transformableCoche', ctx, cx, GROUND_Y, { variant: vT, scale: 1.1, facing: 1, boost: true });
    } else {
      var rx = lerp(110, tx, merge), ry = lerp(GROUND_Y, ty + 70, merge);
      art('transformableRobot', ctx, rx, ry, { variant: vT, scale: 1.1 * (1 - 0.3 * merge), facing: 1 });
    }
    var hx = lerp(mx, tx, merge), hy = lerp(my, ty - 40, merge);
    art('mechaHalcon', ctx, hx, hy, { variant: vM, modo: 'vuelo', scale: 1.0 * (1 - 0.3 * merge), facing: 1, piloto: true });
  }

  // ---------- fase 3 ----------
  function drawP3(ctx, t) {
    drawGiant(ctx, t);
    drawBolts(ctx, t);
    drawFusion(ctx, t);
    drawShots(ctx, t);
    drawBeam(ctx);
    if (giant.tele) {
      ctx.save();
      ctx.translate(giant.x + giant.facing * 90 * GR, GROUND_Y - 360 * GR);
      ctx.scale(1.5, 1.5);
      gfx('drawExclamation', [ctx, 0, 0]);
      ctx.restore();
    }
  }
  function drawGiant(ctx, t) {
    var g = giant;
    var jx = (g.hitT > 0 || (mode === 'victory' && vt < 1.6)) ? rnd(-4, 4) : 0;
    var sc = GS * (0.45 + 0.55 * ease(g.grow));
    ctx.save();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(g.x, GROUND_Y, 130 * sc / GS, 16, 0, 0, PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(g.x + jx, GROUND_Y);
    ctx.rotate(g.lean);
    if (!art('secuazGigante', ctx, 0, 0, { scale: sc, facing: g.facing })) {
      ctx.save(); ctx.scale(sc * 1.2, sc * 1.2); drawSecuazArt(ctx, false, -0.4); ctx.restore();
    }
    var k = 1.2 * sc;
    for (var i = 0; i < g.turrets.length; i++) {
      var T = g.turrets[i];
      var px = T.lx * k * g.facing, py = T.ly * k, rr = T.r * k;
      if (T.dead) drawBrokenTurret(ctx, px, py, rr, t, i);
      else {
        if (T.glow > 0 && (g.state === 'rayTele' || g.state === 'rayFire')) {
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 16 + i);
          circle(ctx, px, py, rr * 1.7, '#f87171', null);
          ctx.restore();
        }
        if (T.flash > 0) { ctx.save(); ctx.globalAlpha = 0.7; circle(ctx, px, py, rr * 1.2, '#ffffff', null); ctx.restore(); }
      }
    }
    ctx.restore();
    if (g.state === 'punch' || g.state === 'punchBack') {
      var e = g.ext || 0;
      var sx = g.x + g.facing * 80 * GR, sy = GROUND_Y - 230 * GR;
      var fx = g.x + g.facing * (120 * GR + 200 * e), fy = GROUND_Y - 200 * GR;
      tube(ctx, sx, sy, fx, fy, 30, EN.STEEL_DD);
      drawFist(ctx, fx, fy, 2.6 * GR, g.facing, false);
      if (g.state === 'punch') {
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (var m = -1; m <= 1; m++) { ctx.beginPath(); ctx.moveTo(fx - g.facing * 70, fy + m * 22); ctx.lineTo(fx - g.facing * 130, fy + m * 22); ctx.stroke(); }
        ctx.restore();
      }
    }
    if (g.state === 'punchTele') {
      var gx = g.x + g.facing * 120 * GR, gy = GROUND_Y - 200 * GR;
      ctx.save(); ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 18);
      circle(ctx, gx, gy, 50, '#fca5a5', null);
      ctx.restore();
    }
  }
  function drawBrokenTurret(ctx, x, y, r, t, i) {
    ctx.save();
    circle(ctx, x, y, r * 1.05, '#374151', O, 2.5);
    ctx.strokeStyle = O; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.2); ctx.lineTo(x - r * 0.1, y + r * 0.1); ctx.lineTo(x + r * 0.2, y - r * 0.4); ctx.lineTo(x + r * 0.6, y); ctx.stroke();
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 4, y + r * 0.35 - 4); ctx.lineTo(x + 4, y + r * 0.35 + 4);
    ctx.moveTo(x + 4, y + r * 0.35 - 4); ctx.lineTo(x - 4, y + r * 0.35 + 4); ctx.stroke();
    for (var k = 0; k < 3; k++) {
      var ph = (t * 0.8 + k / 3 + i * 0.17) % 1;
      ctx.globalAlpha = 0.5 * (1 - ph);
      circle(ctx, x + Math.sin(ph * 6 + i) * 6, y - r - ph * 50, 5 + ph * 10, '#9ca3af', null);
    }
    ctx.restore();
  }
  function drawFusion(ctx, t) {
    var f = fusion;
    if (!f || f.hidden) return;
    if (f.inv > 0 && Math.floor(f.inv * 14) % 2 === 0) return;
    var pose = f.punchT > 0 ? 'puño' : 'guardia';
    var sc = FS * (0.4 + 0.6 * ease(f.pop));
    ctx.save();
    ctx.translate(f.x, GROUND_Y);
    if (f.walk) ctx.translate(0, -Math.abs(Math.sin(p3T * 8)) * 5);
    if (f.punchT > 0 && f.step === 3) {
      var k = 1 - f.punchT / f.punchDur;
      ctx.translate(0, -16 * Math.sin(k * PI));
      ctx.rotate(-0.1 * f.facing * Math.sin(k * PI));
    }
    if (!art('robotFusion', ctx, 0, 0, { scale: sc, facing: f.facing, pose: pose })) {
      rfill(ctx, -60 * sc, -250 * sc, 120 * sc, 250 * sc, 20, '#3b82f6', O, 3);
    }
    ctx.restore();
    if (f.punchT > 0 && f.hitDone && f.punchT > f.punchDur * 0.2) {
      ctx.save(); ctx.translate(f.x + f.facing * 165, GROUND_Y - 186); ctx.scale(2, 2);
      gfx('drawPunch', [ctx, 0, 0, f.facing, 1 - f.punchT / f.punchDur]);
      ctx.restore();
    }
    if (f.shield) drawWingShield(ctx, f.x + f.facing * 118, GROUND_Y - 165, f.facing, t);
  }
  function drawWingShield(ctx, x, y, dir, t) {
    var hitGlow = fusion && fusion.shieldHit > 0 ? 1 : 0;
    ctx.save();
    ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 10) + 0.3 * hitGlow;
    var g = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
    g.addColorStop(0, 'rgba(165,243,252,0.9)'); g.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(10, 0, 70, 160, 0, 0, PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    for (var i = -3; i <= 3; i++) {
      ctx.save();
      ctx.rotate(i * 0.22);
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.quadraticCurveTo(14, -10, 22, -130); ctx.quadraticCurveTo(30, -60, 10, 0); ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? '#22c55e' : '#d1d5db'; ctx.fill();
      ctx.strokeStyle = O; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, PI * 2);
    ctx.fillStyle = '#78350f'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  function drawBolts(ctx, t) {
    for (var i = 0; i < bolts.length; i++) {
      var b = bolts[i];
      ctx.save();
      ctx.globalAlpha = 0.4;
      circle(ctx, b.x - b.vx * 0.04, b.y - b.vy * 0.04, b.r * 0.8, '#f87171', null);
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14;
      var g = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r);
      g.addColorStop(0, '#fff1f2'); g.addColorStop(0.5, '#ef4444'); g.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = O; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }
  function drawShots(ctx, t) {
    for (var i = 0; i < shots.length; i++) {
      var s = shots[i], r = s.power === 2 ? 12 : 8;
      ctx.save();
      ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 12;
      circle(ctx, s.x, s.y, r, '#86efac', O, 2);
      circle(ctx, s.x, s.y, r * 0.45, '#ffffff', null);
      ctx.restore();
    }
  }
  function drawBeam(ctx) {
    if (!beam) return;
    var a = 1 - beam.t / 0.35;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
    ctx.globalAlpha = a; ctx.strokeStyle = '#a7f3d0'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
    circle(ctx, beam.x2, beam.y2, 22 * a + 6, 'rgba(167,243,208,0.8)', null);
    ctx.restore();
  }

  // ---------- victoria ----------
  function drawVictoryScene(ctx, t) {
    if (!vic) return;
    if (!vic.flashDone) {
      drawGiant(ctx, t);
      drawFusion(ctx, t);
      return;
    }
    drawBoss(ctx, t);
    for (var i = heroes.length - 1; i >= 0; i--) {
      var h = heroes[i];
      h.y = GROUND_Y - Math.abs(Math.sin(t * 5 + i * 1.3)) * 10;
      drawHero(ctx, h, t);
      h.y = GROUND_Y;
    }
    if (vic.gemShown && vic.gemR < 1) {
      var gp = victoryGemPos();
      drawGemAt(ctx, gp.x, gp.y, t, 1.6, vic.gemR);
    }
    drawBossOverlays(ctx, t);
  }
  function drawEscapees(ctx, t) {
    for (var i = 0; i < escapees.length; i++) {
      var e = escapees[i];
      if (vt < e.d) continue;
      var tt = vt - e.d, x = e.x0 + e.vx * tt, y = e.y0 + e.vy * tt + Math.sin(tt * 6 + i) * 2;
      if (y < -30 || x > W + 30) continue;
      ctx.save();
      ctx.globalAlpha = 0.8;
      var ok;
      if (e.kind === 'boxeador') {
        ok = art('boxeador', ctx, x, y, { scale: e.s, facing: 1, pose: 'guardia' });
        drawFlame(ctx, x - 2, y + 4, -1, t, 0.25);
      } else if (e.kind === 'dronPicado') ok = art('dronPicado', ctx, x, y, { scale: e.s, angle: -0.6 });
      else ok = art(e.kind, ctx, x, y, { scale: e.s, facing: 1 });
      if (!ok) { circle(ctx, x, y, 4, '#334155', O, 1.2); circle(ctx, x + 1, y, 1.5, '#ff4d4d', null); }
      ctx.restore();
    }
  }

  // ---------- partículas y textos ----------
  function drawParts(ctx) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], a = clamp(1 - p.t / p.life, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.kind === 'clink') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 2.5;
        var r = p.r * 2;
        ctx.beginPath(); ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r); ctx.stroke();
      } else if (p.kind === 'star') {
        if (!gfx('drawSparkle', [ctx, p.x, p.y, clamp(p.t / p.life, 0, 1)])) circle(ctx, p.x, p.y, p.r, p.color, null);
      } else {
        circle(ctx, p.x, p.y, p.r * a, p.color, null);
      }
      ctx.restore();
    }
  }
  function drawTexts(ctx) {
    for (var i = 0; i < texts.length; i++) {
      var tx = texts[i];
      ctx.save();
      ctx.globalAlpha = clamp(1.6 - (tx.t / tx.life) * 1.6, 0, 1);
      var s = 1 + Math.max(0, 0.25 - tx.t) * 1.2;
      ctx.translate(tx.x, tx.y); ctx.scale(s, s);
      outlined(ctx, tx.text, 0, 0, tx.size, tx.color);
      ctx.restore();
    }
  }

  // ============================================================
  //  HUD
  // ============================================================
  function drawHUD(ctx, t) {
    if (G.ui && G.ui.drawHearts) { try { G.ui.drawHearts(ctx); } catch (e) { /* nada */ } }
    if (mode === 'p12') {
      drawWeaponHud(ctx, heroes[0], false, isCoop() ? KEYS_P1 : KEYS_1P);
      if (isCoop()) drawWeaponHud(ctx, heroes[1], true, KEYS_P2);
      if (phase === 1 && boss.state !== 'intro' && G.ui && G.ui.drawBossBar) {
        try { G.ui.drawBossBar(ctx, (3 - boss.lockCracks) / 3, 'CANDADO DEL BOLSILLO · TIRONES ' + boss.lockCracks + '/3'); } catch (e) { /* nada */ }
      }
      if (isCoop()) drawKOBanners(ctx);
    } else if (mode === 'p3') {
      if (G.ui && G.ui.drawBossBar) { try { G.ui.drawBossBar(ctx, giant.hp / giant.maxHp, 'DARK SECUAZ GIGANTE'); } catch (e) { /* nada */ } }
      drawFusionHud(ctx, t);
    }
    var hint = currentHint();
    if (hint && G.ui && G.ui.hint) { try { G.ui.hint(ctx, hint); } catch (e) { /* nada */ } }
  }
  function slotCooldown(h, s) {
    var w = h.weapons[s];
    if (w === 'jetpack') return 1 - clamp(h.fuel / 2.5, 0, 1);
    if (w === 'bumeran' && h.bumOut) return 1;
    if (w === 'arco') {
      var own = 0;
      for (var i = 0; i < projs.length; i++) if (projs[i].kind === 'arrow' && projs[i].owner === h) own++;
      if (own >= 3) return 1;
    }
    return h.cd[s] > 0 ? clamp(h.cd[s] / (h.cdMax[s] || 1), 0, 1) : 0;
  }
  function drawWeaponHud(ctx, h, right, keys) {
    if (!h) return;
    var size = 36, gap = 8, cy = 31;
    ctx.save();
    if (h.ko >= 0) ctx.globalAlpha = 0.45;
    for (var s = 0; s < 2; s++) {
      var w = h.weapons[s];
      var cx = right ? (W - 216 - s * (size + gap)) : (216 + s * (size + gap));
      if (!art('iconoArma', ctx, cx, cy, { arma: w, size: size, ocupada: false })) {
        rfill(ctx, cx - size / 2, cy - size / 2, size, size, 9, 'rgba(20,16,40,0.82)', '#fbbf24', 2.5);
        outlined(ctx, (w || '?').charAt(0).toUpperCase(), cx, cy, 18, '#fef3c7');
      }
      var cdf = slotCooldown(h, s);
      if (cdf > 0) {
        ctx.save();
        rrect(ctx, cx - size / 2, cy - size / 2, size, size, 9); ctx.clip();
        ctx.fillStyle = 'rgba(8,8,20,0.62)';
        ctx.fillRect(cx - size / 2, cy - size / 2, size, size * cdf);
        ctx.restore();
      }
      circle(ctx, cx + 14, cy + 14, 8.5, '#1e293b', '#fde68a', 2);
      ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fef3c7'; ctx.fillText(keys[s] || '', cx + 14, cy + 14.5);
    }
    if (h.weapons.indexOf('jetpack') >= 0) {
      var bw = size * 2 + gap, bh = 8;
      var bx = right ? (W - 216 + size / 2 - bw) : (216 - size / 2), by = cy + size / 2 + 5;
      var fr = clamp(h.fuel / 2.5, 0, 1);
      rfill(ctx, bx, by, bw, bh, 4, 'rgba(20,16,40,0.85)', null);
      if (fr > 0) rfill(ctx, bx + 1, by + 1, Math.max(2, (bw - 2) * fr), bh - 2, 3, '#f97316', null);
      rfill(ctx, bx, by, bw, bh, 4, null, O, 2);
    }
    ctx.restore();
  }
  function drawFusionHud(ctx, t) {
    var f = fusion;
    var x = 16, y = isCoop() ? 70 : 58, bw = 176, bh = 18;
    function bar(yy, frac, col, label) {
      rfill(ctx, x, yy, bw, bh, 8, 'rgba(15,10,25,0.82)', null);
      if (frac > 0) rfill(ctx, x + 1, yy + 1, Math.max(2, (bw - 2) * frac), bh - 2, 7, col, null);
      rfill(ctx, x, yy, bw, bh, 8, null, O, 2);
      outlined(ctx, label, x + bw / 2, yy + bh / 2 + 1, 12, '#fef3c7');
    }
    var keys = isCoop() ? ['F', 'G'] : ['J', 'K'];
    bar(y, f.shieldE, f.shieldLock ? '#94a3b8' : '#0891b2', 'ESCUDO-ALA · SALTO');
    bar(y + 24, 1 - clamp(f.rayCd / 2.2, 0, 1), f.rayCd <= 0 ? '#16a34a' : '#166534', 'RAYO DE HALCÓN · ' + keys[1]);
    if (isCoop()) {
      var rx = W - 16 - bw;
      rfill(ctx, rx, y, bw, bh, 8, 'rgba(15,10,25,0.82)', null);
      var fr = 1 - clamp(f.p2cdB / 1.4, 0, 1);
      if (fr > 0) rfill(ctx, rx + 1, y + 1, Math.max(2, (bw - 2) * fr), bh - 2, 7, '#16a34a', null);
      rfill(ctx, rx, y, bw, bh, 8, null, O, 2);
      outlined(ctx, 'CAÑONES DE LAS ALAS · K L', rx + bw / 2, y + bh / 2 + 1, 12, '#fef3c7');
    }
  }
  function drawKOBanners(ctx) {
    for (var i = 0; i < heroes.length; i++) {
      var h = heroes[i];
      if (h.ko < 0) continue;
      var text = (h.ctrl === 'p1' ? 'P1' : 'P2') + ' vuelve en ' + Math.max(1, Math.ceil(h.ko)) + ' s';
      ctx.save();
      ctx.font = 'bold 22px ' + FONT;
      var w = ctx.measureText(text).width + 44, x = W / 2, y = H / 2 - 30 + i * 60;
      rfill(ctx, x - w / 2, y - 22, w, 44, 12, 'rgba(10,8,20,0.82)', h.ctrl === 'p1' ? '#7dd3fc' : '#86efac', 3);
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1);
      ctx.restore();
    }
  }
  function currentHint() {
    if (msg && msg.text) return msg.text;
    var coop = isCoop();
    if (mode === 'p12') {
      var b = boss;
      if (b.state === 'intro' || b.state === 'trans2') return null;
      var h1 = heroes[0], h2 = heroes[1];
      if (phase === 1 && b.lockCracks < 3) {
        var tag = '';
        if (b.state === 'distracted' && b.distractBy) {
          if (coop) return '¡Distraído! El otro héroe: ¡a su bolsillo y pulsa hackear!' + tag;
          if (b.distractBy === h1) return '¡Lo distraes! ' + (h2.heroe === 'director' ? 'El Director' : 'Lord Falcon') + ' va a por el candado…' + tag;
          return '¡Falcon lo distrae! Ve a su bolsillo y pulsa H.' + tag;
        }
        if (b.alert) return '¡Está en guardia! Esquiva su ataque y vuelve a intentarlo.' + tag;
        if (coop) return 'Uno lo distrae con un golpe y el otro tira del candado (hackear).' + tag;
        if (h1.heroe === 'falcon') return '¡Golpéalo o dispárale para distraerlo! No le hace daño.' + tag;
        return 'Acércate a su bolsillo: Falcon lo distraerá.' + tag;
      }
      if (phase === 2) {
        if (gem && !gem.held) return '¡Atrapa la gema antes que Dark Secuaz!';
        if (windowOpen() || cert) {
          var fal = falconHero();
          if (fal.isAI) return '¡Está atascado! Lord Falcon prepara su flecha certera…';
          return '¡El bolsillo brilla! Falcon: ¡pulsa ' + (coop ? 'hackear' : 'H') + ' para la FLECHA CERTERA!';
        }
        return 'Esquiva y espera su puñetazo al suelo: ¡se quedará atascado!';
      }
      return null;
    }
    if (mode === 'p3') {
      var k = coop ? ['F', 'G'] : ['J', 'K'];
      if (p3T < 7) return '←/→ moverse · ' + k[0] + ' puñetazo · ' + k[1] + ' rayo · mantén SALTO: escudo-ala' + (coop ? ' · P2: cañones de las alas' : '');
      if (giant.state === 'punchTele') return '¡Puñetazo gigante! Mantén SALTO para el escudo-ala o aléjate.';
      if (giant.state === 'rayTele') return '¡Rayo de torretas! ¡Escudo-ala!';
      return 'Rompe sus torretas: ¡cada una le quita mucha vida!';
    }
    return null;
  }

  // ---------- ayudas para pruebas (no cambian el juego normal) ----------
  // (se AÑADEN a scene.__debug, que ya tiene state() y heroes() arriba)
  scene.__debug = scene.__debug || {};
  Object.assign(scene.__debug, {
    info: function () {
      return { mode: mode, phase: phase, boss: boss && boss.state, cracks: boss && boss.lockCracks,
        giantHp: giant ? giant.hp : null, heroes: heroes ? heroes.map(function (h) { return h.heroe + ':' + h.ctrl; }) : [] };
    },
    raw: function () {
      return { mode: mode, phase: phase, boss: boss, heroes: heroes, giant: giant, fusion: fusion, gem: gem,
        waves: waves, orbs: orbs, bolts: bolts, spy: spy, pocket: boss ? pocketPos(true) : null, windowOpen: windowOpen() };
    }
  });

  G.scenes = G.scenes || {};
  G.scenes.levelP2_5 = scene;
})();
