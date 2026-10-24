// plataformas2.js — Motor de plataformas de la PARTE 2 "La Gema Robada".
// Copia EVOLUCIONADA de js/platformer.js (que NO se toca): misma física, colisiones
// AABB, cámara suavizada, co-op, K.O., checkpoints con reaparición segura, hints,
// hackeo con anillo y HUD. Añade (contrato §4 y §6):
//   - las 7 armas por ranuras desde G.p2.loadout (ranura 1 = attack, ranura 2 = shoot),
//   - jetpack con combustible, compañero automático en 1 jugador (invulnerable),
//   - medallas M, cintas < >, prensas P, cajas que rompe cualquier ataque,
//   - enemigos-plugin de G.P2E.types con el objeto `world` EXACTO del contrato.
// Registra G.makePlatformScene2(def) y la escena de pruebas G.scenes.p2test_plataformas.
// Regla de oro: nunca lanzar excepciones en update/render.
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  // ---- Constantes (las de la Parte 1 + las nuevas del contrato) ----
  var TILE = 48;
  var GRAV = 1800;
  var JUMP_V = -640;
  var MAX_FALL = 1200;
  var PLAYER_W = 34, PLAYER_H = 58;
  var COYOTE = 0.10, JUMP_BUFFER = 0.12;
  var INVULN = 1.2, RESPAWN_INVULN = 1.5;
  var KO_TIME = 4.0, KO_RESPAWN_HP = 6, KO_INVULN = 1.5;
  var HEART_DROP = 0.25;
  var HACK_TIME = 1.2, HACK_RANGE = 70;
  var HINT_RANGE = 130;
  var ACT_DUR = 0.22;                 // duración de la pose de ataque / disparo
  var BELT_SPEED = 90;                // cintas transportadoras (px/s)
  // Prensa: ciclo de 2.6 s = espera + aviso (temblor y "!") + bajada + aplastado + subida.
  var PRESS_WAIT = 1.0, PRESS_WARN = 0.6, PRESS_DOWN = 0.18, PRESS_HOLD = 0.32, PRESS_UP = 0.5;
  var PRESS_CYCLE = PRESS_WAIT + PRESS_WARN + PRESS_DOWN + PRESS_HOLD + PRESS_UP;
  var PRESS_MAX = 3 * TILE;           // el cabezal llega como mucho a 3 tiles bajo el techo
  var PRESS_REST = 0.95;              // borde inferior del cabezal en reposo (en tiles bajo el techo)
  var FUEL_MAX = 2.5, FUEL_REFILL = 1.0, JET_THRUST = 900, JET_MIN_VY = -300, JET_BRAKE = 2600;
  var CAPTURE_TIME = 0.8, STUN_TIME = 1.0;
  var AI_BEHIND = 70, AI_MELEE = 90, AI_RANGED = 320, AI_WARP = 600, AI_INVULN = 0.6;
  // Mini-torretas hackeables: el compañero las deja para el jugador mientras
  // este esté cerca (AI_SPARE_R), salvo que lleve AI_SPARE_T s sin hackearla.
  var AI_SPARE_R = 360, AI_SPARE_T = 6;
  var ARROW_SPEED = 540, ARROW_GRAV = 300, ARROW_MAX = 3;
  var PULSE_LEN = 240;
  var BOOM_RANGE = 260, BOOM_OUT_SPEED = 520, BOOM_BACK_SPEED = 600;
  var NET_SPEED = 380, NET_LIFE = 1.15;

  var WEAPON_STATS = {
    espada:  { tipo: 'cuerpo',     cd: 0.35, reach: 56, dmg: 1 },
    guantes: { tipo: 'cuerpo',     cd: 0.5,  reach: 48, dmg: 2 },
    arco:    { tipo: 'distancia',  cd: 0.28, dmg: 1 },
    pulso:   { tipo: 'distancia',  cd: 0.7,  dmg: 1 },
    bumeran: { tipo: 'distancia',  cd: 0.15, dmg: 1 },
    red:     { tipo: 'distancia',  cd: 1.2,  dmg: 1 },
    jetpack: { tipo: 'movimiento', cd: 0,    dmg: 0 }
  };
  var WEAPON_COLOR = { espada: '#e2e8f0', guantes: '#ef4444', arco: '#a16207', pulso: '#22d3ee', bumeran: '#3b82f6', red: '#a3e635', jetpack: '#f97316' };
  var DEFAULT_LOADOUT = { director: ['guantes', 'pulso'], falcon: ['espada', 'arco'] };
  var SLOT_BTN = ['attack', 'shoot'];
  var KEYS_1P = ['J', 'K'], KEYS_P1 = ['F', 'G'], KEYS_P2 = ['K', 'L'];
  var ENEMY_LETTERS = { x: 'boxeador', q: 'escudo', a: 'arana', A: 'arana', t: 'minitorreta', w: 'enjambre', r: 'dronRayo', p: 'dronPicado' };
  var GROUND_LETTERS = { x: true, q: true, a: true, t: true };
  var OUTLINE = '#1a1a2e';

  // ---- Utilidades seguras ----
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* sin sonido */ } }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) { /* sin música */ } }
  function overlap(a, b) { return !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function dist(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
  function rnd() { return Math.random(); }
  var warned = {};
  function warnOnce(key, e) {
    if (warned[key]) return;
    warned[key] = true;
    try { if (window.console && console.warn) console.warn('[plataformas2] ' + key, e); } catch (x) { /* nada */ }
  }
  // Arte aprobado: P2.call('nombre', ctx, ...) → true si existía (nunca rompe).
  function art() {
    var P = window.P2;
    if (!P || typeof P.call !== 'function') return false;
    try { return !!P.call.apply(P, Array.prototype.slice.call(arguments)); } catch (e) { return false; }
  }
  function gfx(name) { return (G.gfx && typeof G.gfx[name] === 'function') ? G.gfx[name] : null; }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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
    ctx.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
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

  // ---- Estado de la Parte 2 (G.p2, de estado2.js) con respaldo seguro ----
  var fallbackP2 = { hero: 'director', loadout: { director: ['guantes', 'pulso'], falcon: ['espada', 'arco'] }, run: { medals: [false, false, false] } };
  function p2s() { return (G.p2 && typeof G.p2 === 'object') ? G.p2 : fallbackP2; }
  function runMedals() {
    var s = p2s();
    if (!s.run || typeof s.run !== 'object') s.run = { medals: [false, false, false] };
    if (!Array.isArray(s.run.medals)) s.run.medals = [false, false, false];
    return s.run.medals;
  }
  function debugInv() { return !!(G.p2 && G.p2.debugInvulnerable); }
  function isWeapon(w) { return typeof w === 'string' && Object.prototype.hasOwnProperty.call(WEAPON_STATS, w); }
  // Las 2 armas de un héroe (validadas: conocidas y distintas; si no, las clásicas).
  function loadoutFor(heroe) {
    var def = DEFAULT_LOADOUT[heroe] || DEFAULT_LOADOUT.director;
    var lo = null;
    try { lo = p2s().loadout && p2s().loadout[heroe]; } catch (e) { lo = null; }
    var out = [];
    if (Array.isArray(lo)) {
      for (var i = 0; i < lo.length && out.length < 2; i++) {
        if (isWeapon(lo[i]) && out.indexOf(lo[i]) < 0) out.push(lo[i]);
      }
    }
    for (var j = 0; j < def.length && out.length < 2; j++) { if (out.indexOf(def[j]) < 0) out.push(def[j]); }
    return out;
  }
  function otherHero(h) { return (h === 'falcon') ? 'director' : 'falcon'; }

  function tileAt(rows, col, row) {
    if (!rows || row < 0 || row >= rows.length) return '.';
    var line = rows[row];
    if (typeof line !== 'string' || col < 0 || col >= line.length) return '.';
    return line.charAt(col);
  }
  function isOneWayTile(ch) { return ch === '='; }

  // Entrada nula (Jugador 2 inexistente) y entrada sintética del compañero.
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
  //  G.makePlatformScene2(def)
  //  def = { nombre, tema: 'ciudad'|'fabrica', music, chapter: 1|3, mapa: [strings], hints: [{x, texto}] }
  //  (opcionales, para pruebas: heroe = héroe del J1 si no hay G.p2; retry = escena a reintentar)
  // =========================================================================
  G.makePlatformScene2 = function (def) {
    def = def || {};
    var scene = {};

    // ---- Estado mutable (se REINICIA por completo en enter) ----
    var rows = null, mapCols = 0, mapRows = 0, mapW = 0, mapH = 0;
    var player = null;      // Jugador 1 (G.p2.hero)
    var player2 = null;     // Jugador 2 (solo co-op)
    var buddy = null;       // compañero automático (solo 1 jugador)
    var coop = false;
    var camX = 0, camY = 0;
    var tNow = 0;           // segundos desde que empezó el nivel
    var DT = 1 / 60;
    var leaving = false;    // ya se pidió cambiar de escena (gameover / salida)

    var enemies = [];
    var arrows = [], booms = [], nets = [], pulses = [];
    var shots = [];         // proyectiles de world.spawnProjectile (enemigos y aliados)
    var beams = [];         // rayos de world.spawnBeam
    var pickups = [], effects = [], hudFx = [];
    var updatingEnemy = null;      // enemigo cuyo update() se está ejecutando (dueño de sus "!")
    var consoles = [], doors = [], checkpoints = [], medals = [], presses = [];
    var brokenBoxes = {};
    var spawnX = 0, spawnY = 0, lastCheckX = 0, lastCheckY = 0;
    var exitRect = null, levelDone = false;
    var frameNo = 0;

    // ---------------------------------------------------------------------
    //  Mapa
    // ---------------------------------------------------------------------
    function solidBlocks(ch, col, row) {
      if (ch === '#' || ch === '<' || ch === '>') return true;
      if (ch === 'B') return !brokenBoxes[col + ',' + row];
      if (ch === 'D') { var d = findDoorAt(col, row); return d ? !d.open : true; }
      return false;
    }
    function solidPt(px, py) {
      var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
      return solidBlocks(tileAt(rows, col, row), col, row);
    }
    function groundPt(px, py) {
      var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
      var ch = tileAt(rows, col, row);
      return solidBlocks(ch, col, row) || isOneWayTile(ch);
    }
    function findDoorAt(col, row) {
      for (var i = 0; i < doors.length; i++) { if (doors[i].col === col && doors[i].row === row) return doors[i]; }
      return null;
    }
    function rectHitsSolid(cx, feetY, w, h) {
      var c0 = Math.floor((cx - w / 2) / TILE), c1 = Math.floor((cx + w / 2 - 0.001) / TILE);
      var r0 = Math.floor((feetY - h) / TILE), r1 = Math.floor((feetY - 0.001) / TILE);
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) { if (solidBlocks(tileAt(rows, c, r), c, r)) return true; }
      return false;
    }
    // Primera x (player.x + desplazamiento) sin pared y con suelo debajo (≤ 4 tiles).
    function safeSideX(px, feetY, offs, w) {
      for (var i = 0; i < offs.length; i++) {
        var x = clamp(px + offs[i], w / 2, Math.max(w / 2, mapW - w / 2));
        if (rectHitsSolid(x, feetY, w, PLAYER_H)) continue;
        if (tileAt(rows, Math.floor(x / TILE), Math.floor((feetY - 10) / TILE)) === '^') continue;   // pinchos
        for (var k = 0; k <= 4; k++) {
          if (groundPt(x, feetY + 2 + k * TILE)) return x;
        }
      }
      return clamp(px, w / 2, Math.max(w / 2, mapW - w / 2));
    }
    function centerOfTile(col, row) { return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 }; }

    // Punto de reaparición SEGURO de un checkpoint (como en la Parte 1).
    function safeRespawnForCheckpoint(col, row) {
      var offsets = [0, -1, 1, -2, 2, -3, 3];
      for (var i = 0; i < offsets.length; i++) {
        var c = col + offsets[i];
        if (c < 0 || c >= mapCols) continue;
        for (var r = row + 1; r < mapRows; r++) {
          var ch = tileAt(rows, c, r);
          if (ch === '#' || ch === '<' || ch === '>') return { x: c * TILE + TILE / 2, y: r * TILE };
          if (ch === '^') break;        // nunca encima de pinchos
        }
      }
      return { x: spawnX, y: spawnY };
    }

    // Grupos de puertas (tiles D pegados forman UNA puerta) y consolas → puerta más cercana.
    function groupDoors() {
      var gid = 0;
      for (var i = 0; i < doors.length; i++) {
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
      for (var c = 0; c < consoles.length; c++) {
        var con = consoles[c], best = -1, bestD = Infinity;
        for (var j = 0; j < doors.length; j++) {
          var dd = dist(con.cx, con.cy, doors[j].cx, doors[j].cy);
          if (dd < bestD) { bestD = dd; best = j; }
        }
        con.doorIndex = best;
        con.group = best >= 0 ? doors[best].group : -1;
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
      // El cabezal en reposo ocupa el primer tile bajo el techo (como P2.fn.prensa) y
      // baja hasta 3 tiles o hasta el suelo si está más cerca.
      var rest = techoY + PRESS_REST * TILE;
      return {
        col: col, row: row, x: col * TILE, cx: col * TILE + TILE / 2, techoY: techoY,
        rest: rest, maxBottom: clamp(floorY, rest + 8, techoY + PRESS_MAX), bottom: rest, ext: rest - techoY,
        state: 'up', prevState: 'up', shake: 0, offset: (presses.length * 0.85) % PRESS_CYCLE
      };
    }

    function buildLevel() {
      rows = (Array.isArray(def.mapa) && def.mapa.length) ? def.mapa.slice() : ['#####', '#S.E#', '#####'];
      for (var q = 0; q < rows.length; q++) { if (typeof rows[q] !== 'string') rows[q] = ''; }
      mapRows = rows.length;
      mapCols = 0;
      for (var r = 0; r < rows.length; r++) { if (rows[r].length > mapCols) mapCols = rows[r].length; }
      mapW = mapCols * TILE;
      mapH = mapRows * TILE;

      enemies = []; arrows = []; booms = []; nets = []; pulses = []; shots = []; beams = [];
      pickups = []; effects = []; hudFx = [];
      consoles = []; doors = []; checkpoints = []; medals = []; presses = [];
      brokenBoxes = {};
      spawnX = TILE * 2; spawnY = TILE * 2;
      exitRect = null; levelDone = false; leaving = false;
      tNow = 0; frameNo = 0;

      var pending = [];   // enemigos: se crean cuando el mapa ya está listo
      var pressCells = [];
      for (var row = 0; row < mapRows; row++) {
        var line = rows[row];
        for (var col = 0; col < line.length; col++) {
          var ch = line.charAt(col);
          var c = centerOfTile(col, row);
          switch (ch) {
            case 'S': spawnX = c.x; spawnY = row * TILE + TILE; break;
            case 'K': checkpoints.push({ col: col, row: row, cx: c.x, cy: c.y, x: col * TILE, y: row * TILE, taken: false, safeX: 0, safeY: 0 }); break;
            case 'h': pickups.push({ x: c.x, y: c.y, vy: 0, grounded: true, fromMap: true, t: rnd() * 3 }); break;
            case 'M': medals.push({ col: col, row: row, x: c.x, y: c.y, idx: -1, taken: false }); break;
            case 'C': consoles.push({ col: col, row: row, cx: c.x, cy: c.y, activated: false, progress: 0, doorIndex: -1, group: -1 }); break;
            case 'D': doors.push({ col: col, row: row, cx: c.x, cy: c.y, open: false, group: -1 }); break;
            case 'E': exitRect = { x: col * TILE + 6, y: row * TILE + 2, w: TILE - 12, h: TILE - 4, cx: c.x, cy: c.y }; break;
            case 'P': pressCells.push([col, row]); break;
            default:
              if (ENEMY_LETTERS[ch]) pending.push({ ch: ch, col: col, row: row });
              break;
          }
        }
      }
      for (var k = 0; k < checkpoints.length; k++) {
        var safe = safeRespawnForCheckpoint(checkpoints[k].col, checkpoints[k].row);
        checkpoints[k].safeX = safe.x; checkpoints[k].safeY = safe.y;
      }
      groupDoors();
      for (var p = 0; p < pressCells.length; p++) presses.push(makePress(pressCells[p][0], pressCells[p][1]));

      // Medallas: índice por orden de izquierda a derecha (y de arriba abajo si empatan).
      var sorted = medals.slice().sort(function (a, b) { return (a.col - b.col) || (a.row - b.row); });
      var got = runMedals();
      for (var m = 0; m < sorted.length; m++) {
        sorted[m].idx = m;
        // Reintento tras perder: la medalla que ya se cogió en este intento sigue cogida.
        if (m < 3 && got[m] === true) sorted[m].taken = true;
      }

      lastCheckX = spawnX; lastCheckY = spawnY;
      coop = !!(G.state && G.state.coop);

      // Héroes: J1 = G.p2.hero; el otro es el Jugador 2 (co-op) o el compañero (1 jugador).
      var h1 = p2s().hero;
      if (h1 !== 'director' && h1 !== 'falcon') h1 = (def.heroe === 'falcon') ? 'falcon' : 'director';
      player = makeHero(h1, G.input, 'hp', spawnX, spawnY, false);
      player2 = null; buddy = null;
      if (coop) {
        var sx2 = spawnX + 40;
        if (sx2 > mapW - 20) sx2 = spawnX - 40;
        player2 = makeHero(otherHero(h1), G.input2, 'hp2', sx2, spawnY, false);
      } else {
        var bx = Math.max(PLAYER_W, spawnX - 50);
        if (rectHitsSolid(bx, spawnY, PLAYER_W, PLAYER_H)) bx = spawnX;
        buddy = makeHero(otherHero(h1), makeAiInput(), null, bx, spawnY, true);
      }

      // Enemigos (plugins). Un tipo que falte se ignora sin romper.
      for (var e = 0; e < pending.length; e++) {
        var it = pending[e], tc = centerOfTile(it.col, it.row), ex = tc.x, ey = tc.y;
        var opts = { letra: it.ch, col: it.col, row: it.row };
        if (GROUND_LETTERS[it.ch]) ey = it.row * TILE + TILE;
        if (it.ch === 'a') opts.techo = false;
        if (it.ch === 'A') {
          opts.techo = true;
          ey = it.row * TILE;
          for (var rr = it.row - 1; rr >= 0; rr--) {
            if (solidBlocks(tileAt(rows, it.col, rr), it.col, rr)) { ey = (rr + 1) * TILE; break; }
          }
        }
        spawnEnemy(ENEMY_LETTERS[it.ch], ex, ey, opts);
      }

      var focus = cameraFocus();
      camX = clampCamX(focus.x - G.W / 2);
      camY = clampCamY(focus.y - G.H / 2);
      syncWorld();
    }

    function makeHero(heroe, inputRef, hpKey, sx, sy, isAI) {
      var lo = loadoutFor(heroe);
      return {
        heroe: heroe, input: inputRef || nullInput, isAI: !!isAI, ai: isAI ? inputRef : null,
        hpKey: hpKey, maxKey: (hpKey === 'hp2') ? 'maxHp2' : 'maxHp',
        x: sx, y: sy, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, facing: 1,
        onGround: false, coyote: 0, jumpBuf: 0, jumpsLeft: 0, moveDir: 0,
        pose: 'idle', invuln: 0, blink: 0, knockT: 0, knockV: 0,
        hackTarget: null, hackProgress: 0,
        weapons: lo, cd: [0, 0], cdMax: [1, 1],
        actFx: 0, actPose: null, actWeapon: null, actFacing: 1,
        fuel: FUEL_MAX, thrusting: false, jetSfx: 0, boomOut: false,
        ko: false, koTimer: 0,
        warpPending: false, aiFace: 0, aiStuck: 0, aiLastX: sx
      };
    }

    // ---- Vida (en G.state, medios corazones) ----
    function heroHp(h) { return (h && h.hpKey) ? num(G.state[h.hpKey], 0) : 10; }
    function heroMaxHp(h) { var m = G.state[h.maxKey]; return (typeof m === 'number') ? m : num(G.state.maxHp, 10); }
    function setHeroHp(h, v) { if (h && h.hpKey) G.state[h.hpKey] = v; }

    function humans() { return player2 ? [player, player2] : [player]; }
    function aliveHumans() {
      var out = [], hs = humans();
      for (var i = 0; i < hs.length; i++) { if (hs[i] && !hs[i].ko) out.push(hs[i]); }
      return out;
    }
    // Todos los héroes en juego (jugadores + compañero), sin el compañero escondido.
    function heroesAll() {
      var out = [player];
      if (player2) out.push(player2);
      if (buddy && !buddy.warpPending) out.push(buddy);
      return out;
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
    function partnerOf(h) {
      if (!player2) return null;
      return (h === player) ? player2 : player;
    }
    function heroRect(p) { return { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h }; }

    function cameraFocus() {
      var hs = aliveHumans();
      if (hs.length === 0) hs = [player];
      var sx = 0, sy = 0;
      for (var i = 0; i < hs.length; i++) { sx += hs[i].x; sy += (hs[i].y - hs[i].h / 2); }
      return { x: sx / hs.length, y: sy / hs.length };
    }
    function clampCamX(v) { return clamp(v, 0, Math.max(0, mapW - G.W)); }
    function clampCamY(v) { return clamp(v, 0, Math.max(0, mapH - G.H)); }

    // ---------------------------------------------------------------------
    //  Colisión AABB tile a tile (X y luego Y), igual que la Parte 1
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
            if (solidBlocks(tileAt(rows, col, row), col, row) && col * TILE >= ent.x + ent.w / 2 - 0.01 - 0.5) {
              newX = col * TILE - ent.w / 2 - 0.001;
              if (flags) flags.hitWall = true;
              col = c1 + 1; break;
            }
          }
        }
      } else if (dx < 0) {
        var d0 = Math.floor((ent.x - ent.w / 2) / TILE), d1 = Math.floor((newX - ent.w / 2) / TILE);
        for (col = d0; col >= d1; col--) {
          for (row = r0; row <= r1; row++) {
            if (solidBlocks(tileAt(rows, col, row), col, row) && (col + 1) * TILE <= ent.x - ent.w / 2 + 0.01 + 0.5) {
              newX = (col + 1) * TILE + ent.w / 2 + 0.001;
              if (flags) flags.hitWall = true;
              col = d1 - 1; break;
            }
          }
        }
      }
      ent.x = newX;
    }
    // Paso completo con colisión: devuelve {onGround, hitWall, hitCeiling}.
    function collideEnt(ent) {
      var flags = { onGround: false, hitWall: false, hitCeiling: false };
      if (!ent) return flags;
      if (!isFinite(ent.x) || !isFinite(ent.y)) return flags;
      ent.w = num(ent.w, 32); ent.h = num(ent.h, 32);
      ent.vx = num(ent.vx, 0); ent.vy = num(ent.vy, 0);
      ent.onGround = false;
      var dx = ent.vx * DT;
      if (dx !== 0) {
        moveX(ent, dx, flags);
        if (flags.hitWall) ent.vx = 0;
      }
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
            if (oneway && ent.y > tileTop + 1) continue;      // ya la habíamos atravesado
            if (!oneway && ent.y > tileTop + 1) continue;     // tile por encima de los pies (lo resuelve X)
            if (newY >= tileTop) {
              newY = tileTop; ent.vy = 0; ent.onGround = true; flags.onGround = true; stop = true; break;
            }
          }
        }
      } else if (ent.vy < 0) {
        var headTarget = newY - ent.h;
        var h1 = Math.floor((ent.y - ent.h) / TILE), h0 = Math.floor(headTarget / TILE);
        for (row = h1; row >= h0; row--) {
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
        // Quieto en vertical: ¿sigue apoyado?
        var fr = Math.floor((ent.y + 1) / TILE);
        for (col = c0; col <= c1; col++) {
          ch = tileAt(rows, col, fr);
          if ((solidBlocks(ch, col, fr) || isOneWayTile(ch)) && Math.abs(ent.y - fr * TILE) < 1.5) { ent.onGround = true; flags.onGround = true; break; }
        }
      }
      ent.y = newY;
      return flags;
    }
    // Empuja en horizontal respetando las paredes.
    function nudgeX(ent, dx) {
      var steps = Math.ceil(Math.abs(dx) / (TILE / 2)) || 1;
      for (var i = 0; i < steps; i++) moveX(ent, dx / steps, null);
    }

    // ---------------------------------------------------------------------
    //  El objeto world del contrato (§6) para los enemigos-plugin
    // ---------------------------------------------------------------------
    var world = {
      t: 0, TILE: TILE, camX: 0, camY: 0, viewW: 960, viewH: 540,
      heroes: function () { return heroesAll(); },
      nearestHero: function (x, y) { return nearestHero(num(x, 0), num(y, 0)); },
      hurtHero: function (h, dmg, fromX) { hurtHero(h, dmg, fromX); },
      isSolidAt: function (px, py) {
        if (!isFinite(px) || !isFinite(py)) return false;
        var col = Math.floor(px / TILE), row = Math.floor(py / TILE);
        var ch = tileAt(rows, col, row);
        if (solidBlocks(ch, col, row)) return true;
        // La plataforma de una vía cuenta como suelo en su franja superior (bordes de patrulla).
        return isOneWayTile(ch) && (py - row * TILE) < 14;
      },
      collide: function (ent) { return collideEnt(ent); },
      spawnProjectile: function (p) { spawnShot(p); },
      spawnBeam: function (b) { spawnBeam(b); },
      spawnEnemy: function (tipo, x, y, opts) { return spawnEnemy(tipo, x, y, opts); },
      spawnEffect: function (kind, x, y, opts) { spawnEffect(kind, x, y, opts); },
      enemies: function () { return liveEnemies(); },
      hitEnemy: function (e, dmg, kind, fromX) { return hitEnemy(e, num(dmg, 1), kind || 'aliado', fromX); },
      sfx: function (n) { sfx(n); }
    };
    function syncWorld() { world.t = tNow; world.camX = camX; world.camY = camY; world.viewW = G.W; world.viewH = G.H; }

    function spawnEnemy(tipo, x, y, opts) {
      var types = (G.P2E && G.P2E.types) ? G.P2E.types : null;
      var T = types ? types[tipo] : null;
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
      enemies.push(e);
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
    // ¿Se le puede golpear / apuntar? (vivo, no atrapado, no hackeado, visible)
    function targetable(e) { return e && e.alive && !e.captured && !e.hacked && !e.invisible && e.__tipo !== 'enjambre'; }

    // ---------------------------------------------------------------------
    //  Golpes a enemigos (contrato §6)
    // ---------------------------------------------------------------------
    function hitEnemy(e, dmg, kind, fromX) {
      if (!e || !e.alive || e.captured) return false;
      var T = e.__def || {};
      var c = rectCenter(enemyRect(e));
      if (kind === 'red') {
        if (T.capturable) {
          try { if (typeof T.onHit === 'function') T.onHit(e, dmg, kind, fromX, world); } catch (err) { warnOnce('onHit-' + e.__tipo, err); }
          if (!e.alive) return true;
          e.captured = true; e.__capT = CAPTURE_TIME; e.vx = 0; e.vy = 0; clearExclaims(e);
          sfx('net');
          spawnEffect('texto', c.x, c.y - 30, { texto: '¡Atrapado!', color: '#bef264', life: 0.8 });
          return true;
        }
        // Al jefe y a los robots grandes la red no les afecta.
        sfx('clink');
        spawnEffect('sparkle', c.x, c.y);
        return false;
      }
      var ok = true;
      if (typeof T.onHit === 'function') {
        try { ok = T.onHit(e, dmg, kind, fromX, world) !== false; } catch (err) { warnOnce('onHit-' + e.__tipo, err); ok = true; }
      }
      if (kind === 'pulso') e.stun = STUN_TIME;
      if (!ok) {
        sfx('clink');
        spawnEffect('sparkle', clamp(num(fromX, c.x), c.x - 20, c.x + 20), c.y);
        return false;
      }
      e.hp = num(e.hp, 1) - dmg;
      sfx('hit');
      if (e.hp <= 0) killEnemy(e);
      return true;
    }
    function killEnemy(e) {
      if (!e.alive) return;
      var c = rectCenter(enemyRect(e));
      e.alive = false; e.captured = false;
      clearExclaims(e);
      effects.push({ kind: 'explosion', x: c.x, y: c.y, t: 0, dur: 0.4, r: 26 });
      sfx('explosion');
      if (rnd() < HEART_DROP) pickups.push({ x: c.x, y: c.y - 6, vy: -160, grounded: false, fromMap: false, t: 0 });
    }
    // Borra los avisos "!" de un enemigo que ya no puede atacar (derrotado, atrapado, hackeado).
    function clearExclaims(e) {
      for (var i = effects.length - 1; i >= 0; i--) {
        if (effects[i].kind === 'exclaim' && effects[i].owner === e) effects.splice(i, 1);
      }
    }
    // Golpe en un rectángulo (armas cuerpo a cuerpo, pulso). Devuelve cuántos tocó.
    function damageEnemiesInRect(rect, dmg, kind, fromX, onlyOne) {
      var n = 0;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!targetable(e)) continue;
        if (overlap(rect, enemyRect(e))) { hitEnemy(e, dmg, kind, fromX); n++; if (onlyOne) break; }
      }
      return n;
    }
    function breakBoxAt(col, row) {
      if (tileAt(rows, col, row) !== 'B' || brokenBoxes[col + ',' + row]) return false;
      brokenBoxes[col + ',' + row] = true;
      var cc = centerOfTile(col, row);
      effects.push({ kind: 'explosion', x: cc.x, y: cc.y, t: 0, dur: 0.35, r: 24 });
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

    // ---------------------------------------------------------------------
    //  Daño a héroes (SIEMPRE 1 en plataformas = medio corazón)
    // ---------------------------------------------------------------------
    function hurtHero(h, dmg, fromX) {
      if (!h || h.ko || h.warpPending || leaving) return;
      if (num(dmg, 1) <= 0) return;
      if (h.invuln > 0) return;
      var dir = (typeof fromX === 'number' && isFinite(fromX) && fromX > h.x) ? -1 : 1;
      if (h.isAI) {
        // El compañero es invulnerable: parpadea y retrocede.
        h.invuln = AI_INVULN; h.blink = 0;
        h.knockT = 0.16; h.knockV = dir * 200; h.vy = Math.min(h.vy, -220); h.onGround = false;
        return;
      }
      if (debugInv()) return;
      setHeroHp(h, Math.max(0, heroHp(h) - 1));   // regla de Juanjo: daño normal = medio corazón
      h.invuln = INVULN; h.blink = 0;
      h.knockT = 0.18; h.knockV = dir * 180; h.vy = -260; h.onGround = false;
      sfx('hurt');
      if (heroHp(h) <= 0) koOrGameover(h);
    }

    function retryScene() { return def.retry || ('levelP2_' + (def.chapter || 1)); }
    function koOrGameover(p) {
      if (!coop) { leaving = true; G.go('gameover', { retry: retryScene() }); return; }
      p.ko = true; p.koTimer = KO_TIME; p.vx = 0; p.vy = 0;
      resetHack(p);
      sfx('hurt');
      effects.push({ kind: 'sparkle', x: p.x, y: p.y - p.h / 2, t: 0, dur: 0.5 });
      if (aliveHumans().length === 0) { leaving = true; G.go('gameover', { retry: retryScene() }); }
    }
    function respawnSpot(p) {
      var mate = partnerOf(p);
      if (mate && !mate.ko && mate.onGround) {
        var off = (mate.facing >= 0) ? -34 : 34;
        return { x: clamp(mate.x + off, p.w / 2, mapW - p.w / 2), y: mate.y };
      }
      return { x: lastCheckX, y: lastCheckY };
    }
    function respawnFromFall(p) {
      var s = respawnSpot(p);
      p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0; p.knockT = 0; p.onGround = false;
      p.invuln = RESPAWN_INVULN; p.blink = 0;
    }
    function reviveHero(p) {
      var s = respawnSpot(p);
      p.ko = false; p.koTimer = 0; p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0; p.knockT = 0;
      p.onGround = false; p.invuln = KO_INVULN; p.blink = 0;
      setHeroHp(p, Math.min(heroMaxHp(p), KO_RESPAWN_HP));
      sfx('checkpoint');
      effects.push({ kind: 'sparkle', x: p.x, y: p.y - p.h / 2, t: 0, dur: 0.5 });
    }

    // ---------------------------------------------------------------------
    //  Escena
    // ---------------------------------------------------------------------
    scene.enter = function (params) {
      try {
        G.state.hp = G.state.maxHp;                       // vida llena al empezar el nivel
        if (G.state.coop) {
          if (typeof G.state.maxHp2 !== 'number') G.state.maxHp2 = G.state.maxHp;
          G.state.hp2 = G.state.maxHp2;
        }
        buildLevel();
      } catch (e) {
        warnOnce('enter', e);
      }
      music(def.music);
    };
    scene.exit = function () {
      arrows = []; booms = []; nets = []; pulses = []; shots = []; beams = []; effects = []; hudFx = [];
    };

    scene.update = function (dt) {
      try {
        DT = num(dt, 1 / 60);
        if (!player || leaving) return;
        tNow += DT; frameNo++;
        syncWorld();

        updateHero(player, DT);
        if (leaving) return;
        if (player2) updateHero(player2, DT);
        if (leaving || levelDone) return;
        if (buddy) updateHero(buddy, DT);

        updatePresses(DT);
        if (leaving) return;
        updateEnemies(DT);
        if (leaving) return;
        updateHeroProjectiles(DT);
        updateShots(DT);
        updateBeams(DT);
        if (leaving) return;
        updatePickups(DT);
        updateEffects(DT);
        updateCamera(DT);
        if (coop) clampPlayersToScreen();
        syncWorld();
      } catch (e) {
        warnOnce('update', e);
      }
    };

    function clampPlayersToScreen() {
      var hs = humans();
      for (var i = 0; i < hs.length; i++) {
        var p = hs[i];
        if (p.ko) continue;
        var minX = camX + p.w / 2, maxX = camX + G.W - p.w / 2;
        if (p.x < minX) { p.x = minX; if (p.vx < 0) p.vx = 0; }
        else if (p.x > maxX) { p.x = maxX; if (p.vx > 0) p.vx = 0; }
      }
    }

    // ---------------------------------------------------------------------
    //  Héroes (jugadores y compañero comparten TODA la lógica)
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
      if (p.ko) {
        p.koTimer -= dt;
        if (p.koTimer <= 0) reviveHero(p);
        return;
      }
      if (p.warpPending) { tryWarp(p); if (p.warpPending) return; }
      if (p.isAI) {
        aiThink(p, dt);
        if (p.warpPending) return;
      }
      var input = p.input;

      // Movimiento horizontal
      var moveL = input.held('left'), moveR = input.held('right');
      var speed = (p.heroe === 'falcon') ? 290 : 260;
      p.moveDir = 0;
      if (moveL && !moveR) { p.moveDir = -1; p.facing = -1; }
      else if (moveR && !moveL) { p.moveDir = 1; p.facing = 1; }
      else if (p.isAI && p.aiFace) { p.facing = p.aiFace; }
      p.vx = p.moveDir * speed;
      if (p.knockT > 0) { p.knockT -= dt; p.vx = p.knockV; }
      if (p.onGround) p.vx += beltUnder(p) * BELT_SPEED;

      // Salto con coyote + buffer; doble salto de Falcon
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

      // Jetpack (mantener su botón) o gravedad
      var js = p.weapons.indexOf('jetpack');
      p.thrusting = false;
      if (js >= 0 && input.held(SLOT_BTN[js]) && p.fuel > 0) {
        p.thrusting = true;
        p.fuel = Math.max(0, p.fuel - dt);
        if (p.vy > 0) p.vy -= JET_BRAKE * dt;     // frena la caída rápido
        else p.vy -= JET_THRUST * dt;             // empuje de -900 px/s² contra la gravedad
        if (p.vy < JET_MIN_VY) p.vy = JET_MIN_VY;
        p.jetSfx -= dt;
        if (p.jetSfx <= 0) { sfx('jetpack'); p.jetSfx = 0.45; }
      } else {
        p.jetSfx = 0;
        p.vy += GRAV * dt;
        if (p.vy > MAX_FALL) p.vy = MAX_FALL;
      }

      collideEnt(p);
      if (p.x < p.w / 2) p.x = p.w / 2;
      else if (p.x > mapW - p.w / 2) p.x = mapW - p.w / 2;
      if (js >= 0 && p.onGround && !p.thrusting) p.fuel = Math.min(FUEL_MAX, p.fuel + FUEL_REFILL * dt);

      checkSpikes(p);
      if (leaving) return;

      // Caer al vacío
      if (p.y - p.h > mapH + 40) {
        if (p.isAI) { p.warpPending = true; p.vx = 0; p.vy = 0; return; }
        if (p.invuln <= 0 && !debugInv()) { setHeroHp(p, Math.max(0, heroHp(p) - 1)); sfx('hurt'); }
        if (heroHp(p) <= 0) { koOrGameover(p); return; }
        respawnFromFall(p);
      }

      if (p.invuln > 0) { p.invuln -= dt; p.blink += dt; }
      for (var s = 0; s < 2; s++) { if (p.cd[s] > 0) p.cd[s] -= dt; }
      if (p.actFx > 0) p.actFx -= dt;

      // Armas por ranuras: ranura 1 = attack, ranura 2 = shoot
      for (s = 0; s < 2; s++) {
        var w = p.weapons[s];
        if (!w || w === 'jetpack') continue;
        if (input.pressed(SLOT_BTN[s])) useWeapon(p, s);
      }

      if (!p.isAI) {
        handleHack(p, dt);
        // Checkpoints (los activa cualquier jugador)
        for (var i = 0; i < checkpoints.length; i++) {
          var k = checkpoints[i];
          if (!k.taken && overlap(heroRect(p), { x: k.x, y: k.y, w: TILE, h: TILE })) {
            k.taken = true;
            lastCheckX = k.safeX; lastCheckY = k.safeY;
            sfx('checkpoint');
            effects.push({ kind: 'sparkle', x: k.cx, y: k.cy - 20, t: 0, dur: 0.5 });
            spawnEffect('texto', k.cx, k.y - 14, { texto: '¡Punto de control!', color: '#86efac', life: 1.1 });
          }
        }
      }

      collectMedals(p);

      // Salida E: basta con que UN jugador la toque (el compañero no la pulsa)
      if (!p.isAI && exitRect && !levelDone && overlap(heroRect(p), exitRect)) {
        levelDone = true;
        sfx('victory');
        leaving = true;
        if (G.scenes && G.scenes.levelDoneP2) G.go('levelDoneP2', { chapter: def.chapter });
        else G.go('title');
        return;
      }

      updatePose(p);
    }

    function updatePose(p) {
      if (p.actFx > 0 && p.actPose) { p.pose = p.actPose; return; }
      if (p.hackProgress > 0) { p.pose = (p.heroe === 'director') ? 'hack' : 'idle'; return; }
      if (p.invuln > 0 && p.blink < 0.4 && !p.isAI) { p.pose = 'hurt'; return; }
      if (!p.onGround) { p.pose = (p.vy < 0) ? 'jump' : 'fall'; return; }
      p.pose = (p.moveDir !== 0) ? 'run' : 'idle';
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
          p.vy = -420; p.onGround = false;            // rebote
          if (p.isAI || debugInv()) { p.invuln = AI_INVULN; p.blink = 0; return; }
          setHeroHp(p, Math.max(0, heroHp(p) - 1));
          p.invuln = INVULN; p.blink = 0;
          sfx('hurt');
          if (heroHp(p) <= 0) koOrGameover(p);
          return;
        }
      }
    }

    function collectMedals(p) {
      var pr = heroRect(p);
      for (var i = 0; i < medals.length; i++) {
        var m = medals[i];
        if (m.taken) continue;
        if (!overlap(pr, { x: m.x - 18, y: m.y - 18, w: 36, h: 36 })) continue;
        m.taken = true;
        if (m.idx >= 0 && m.idx < 3) {
          try { runMedals()[m.idx] = true; } catch (e) { /* nada */ }
        }
        sfx('medal');
        effects.push({ kind: 'sparkle', x: m.x, y: m.y, t: 0, dur: 0.6 });
        spawnEffect('texto', m.x, m.y - 30, { texto: '¡Medalla!', color: '#fde047', life: 1.1 });
        if (m.idx >= 0 && m.idx < 3) {
          hudFx.push({ x0: m.x - camX, y0: m.y - camY, x1: G.W / 2 + (m.idx - 1) * 32, y1: 30, t: 0, dur: 0.7 });
        }
      }
    }

    // ---------------------------------------------------------------------
    //  Armas
    // ---------------------------------------------------------------------
    function actionPoseFor(heroe, w) {
      var tipo = WEAPON_STATS[w] ? WEAPON_STATS[w].tipo : 'cuerpo';
      if (heroe === 'falcon') {
        if (w === 'espada') return 'attack';
        if (w === 'arco') return 'shoot';
        return null;                 // sus poses traen espada/arco: con otras armas, pose normal + arma en la mano
      }
      return (tipo === 'cuerpo') ? 'attack' : 'shoot';
    }
    function startAction(p, w) {
      p.actFx = ACT_DUR; p.actPose = actionPoseFor(p.heroe, w); p.actWeapon = w; p.actFacing = p.facing;
    }
    function meleeRect(p, reach) {
      var cy = p.y - p.h * 0.55;
      var x = (p.facing > 0) ? p.x : p.x - reach;
      return { x: x, y: cy - 22, w: reach, h: 44 };
    }
    function ownCount(list, p) {
      var n = 0;
      for (var i = 0; i < list.length; i++) { if (list[i].owner === p) n++; }
      return n;
    }

    function useWeapon(p, slot) {
      var w = p.weapons[slot];
      var st = WEAPON_STATS[w];
      if (!st || w === 'jetpack' || p.cd[slot] > 0) return;
      var hy = p.y - p.h * 0.55, f = p.facing;
      switch (w) {
        case 'espada':
        case 'guantes': {
          p.cd[slot] = st.cd; p.cdMax[slot] = st.cd;
          startAction(p, w);
          sfx(w === 'espada' ? 'sword' : 'punch');
          var mr = meleeRect(p, st.reach);
          damageEnemiesInRect(mr, st.dmg, w, p.x, false);
          breakBoxesInRect(mr);
          break;
        }
        case 'arco': {
          if (ownCount(arrows, p) >= ARROW_MAX) return;
          p.cd[slot] = st.cd; p.cdMax[slot] = st.cd;
          startAction(p, w);
          sfx('arrow');
          arrows.push({ x: p.x + f * 20, y: hy, vx: f * ARROW_SPEED, vy: -40, life: 2.2, owner: p, angle: f > 0 ? 0 : Math.PI });
          break;
        }
        case 'pulso': {
          p.cd[slot] = st.cd; p.cdMax[slot] = st.cd;
          startAction(p, w);
          sfx('zap');
          // El rayo se corta en la primera pared (y rompe la caja que toque).
          var len = PULSE_LEN, x0 = p.x + f * 10;
          for (var s = 8; s <= PULSE_LEN; s += 8) {
            var px = x0 + f * s;
            var bx = boxAtPt(px, hy);
            if (bx) { breakBoxAt(bx.col, bx.row); len = s; break; }
            if (solidPt(px, hy)) { len = s; break; }
          }
          var zr = { x: (f > 0 ? x0 : x0 - len), y: hy - 18, w: len, h: 36 };
          damageEnemiesInRect(zr, st.dmg, 'pulso', p.x, false);
          pulses.push({ x: x0, y: hy, dir: f, len: len, t: 0, dur: 0.28, seed: rnd() * 10 });
          break;
        }
        case 'bumeran': {
          if (p.boomOut) return;
          p.cd[slot] = st.cd; p.cdMax[slot] = st.cd;
          startAction(p, w);
          sfx('sword');
          p.boomOut = true;
          booms.push({ owner: p, x: p.x + f * 18, y: hy, dir: f, phase: 'out', traveled: 0, life: 0, hitOut: [], hitBack: [] });
          break;
        }
        case 'red': {
          p.cd[slot] = st.cd; p.cdMax[slot] = st.cd;
          startAction(p, w);
          sfx('net');
          nets.push({ owner: p, x: p.x + f * 22, y: hy, vx: f * NET_SPEED, vy: -30, life: NET_LIFE, dir: f });
          break;
        }
        default: break;
      }
    }

    // ---- Hackeo (mantener H 1.2 s cerca de una consola o de un enemigo hackeable) ----
    function resetHack(p) {
      if (p.hackTarget) {
        if (p.hackTarget.kind === 'console') p.hackTarget.ref.progress = 0;
        else p.hackTarget.ref.__hackFrac = 0;
      }
      p.hackTarget = null; p.hackProgress = 0;
    }
    function handleHack(p, dt) {
      var held = p.input.held('hack');
      var hx = p.x, hy = p.y - p.h / 2;
      var target = null, td = HACK_RANGE + 1, i;
      for (i = 0; i < consoles.length; i++) {
        var c = consoles[i];
        if (c.activated) continue;
        var d = dist(hx, hy, c.cx, c.cy);
        if (d < td) { td = d; target = { kind: 'console', ref: c, x: c.cx, y: c.cy - 4 }; }
      }
      for (i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        var T = e.__def;
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
      if (target.kind === 'console') target.ref.progress = frac; else target.ref.__hackFrac = frac;
      if (p.hackProgress >= HACK_TIME) {
        completeHack(target);
        p.hackTarget = null; p.hackProgress = 0;
      }
    }
    function completeHack(target) {
      sfx('hackOk');
      if (target.kind === 'console') {
        var c = target.ref;
        c.activated = true; c.progress = 1;
        if (c.doorIndex >= 0) openDoorGroup(c.doorIndex);
        spawnEffect('texto', c.cx, c.cy - 40, { texto: '¡Puerta abierta!', color: '#67e8f9', life: 1.1 });
      } else {
        var e = target.ref, T = e.__def;
        e.hacked = true; e.__hackFrac = 0; clearExclaims(e);
        try { if (T && typeof T.onHacked === 'function') T.onHacked(e, world); } catch (err) { warnOnce('onHacked-' + e.__tipo, err); }
        effects.push({ kind: 'sparkle', x: target.x, y: target.y, t: 0, dur: 0.6 });
        spawnEffect('texto', target.x, target.y - 36, { texto: '¡Hackeado!', color: '#86efac', life: 1.0 });
      }
    }
    function openDoorGroup(idx) {
      var d0 = doors[idx];
      if (!d0) return;
      var any = false;
      for (var i = 0; i < doors.length; i++) {
        var d = doors[i];
        if (d.group === d0.group && !d.open) {
          d.open = true; any = true;
          effects.push({ kind: 'sparkle', x: d.cx, y: d.cy, t: 0, dur: 0.6 });
        }
      }
      if (any) sfx('door');
    }

    // ---------------------------------------------------------------------
    //  Compañero automático (solo 1 jugador)
    // ---------------------------------------------------------------------
    function slotOfType(p, tipo) {
      for (var s = 0; s < 2; s++) { var st = WEAPON_STATS[p.weapons[s]]; if (st && st.tipo === tipo) return s; }
      return -1;
    }
    function groundBelow(p, tiles) {
      for (var i = 0; i <= tiles; i++) { if (groundPt(p.x, p.y + 4 + i * TILE)) return true; }
      return false;
    }
    function rangedReady(c, slot, e) {
      var w = c.weapons[slot];
      if (w === 'red') return !!(e.__def && e.__def.capturable);
      if (w === 'bumeran') return !c.boomOut;
      if (w === 'arco') return ownCount(arrows, c) < ARROW_MAX;
      return true;
    }
    function aiThink(c, dt) {
      var ai = c.ai;
      if (!ai) return;
      ai.clear();
      c.aiFace = 0;
      var p = player;
      if (!p || p.ko) return;
      var dxp = p.x - c.x, dyp = p.y - c.y;
      if (dist(c.x, c.y, p.x, p.y) > AI_WARP) { requestWarp(c); return; }

      // Enemigo más cercano
      var best = null, bd = Infinity, bx = 0, by = 0, cy = c.y - c.h * 0.55, i, spared = [];
      for (i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!targetable(e) || e.__hackFrac > 0) continue;     // no estropea un hackeo del jugador
        var ec = rectCenter(enemyRect(e));
        if (e.__def && e.__def.hackable) {
          // Deja la mini-torreta al jugador para que pueda hackearla (los tutoriales lo piden);
          // solo la ataca si el jugador se aleja o lleva mucho rato cerca sin hackearla.
          if (dist(p.x, p.y - p.h / 2, ec.x, ec.y) < AI_SPARE_R) {
            e.__aiNearT = num(e.__aiNearT, 0) + dt;
            if (e.__aiNearT < AI_SPARE_T) { spared.push(ec); continue; }
          } else e.__aiNearT = 0;
        }
        var d = dist(c.x, cy, ec.x, ec.y);
        if (d < bd) { bd = d; best = e; bx = ec.x; by = ec.y; }
      }
      var fightDir = 0, fightSlot = -1;
      if (best) {
        var dir = (bx < c.x) ? -1 : 1;
        var ms = slotOfType(c, 'cuerpo'), rs = slotOfType(c, 'distancia');
        if (ms >= 0 && bd < AI_MELEE) { fightDir = dir; fightSlot = ms; }
        else if (rs >= 0 && Math.abs(bx - c.x) < AI_RANGED && Math.abs(by - cy) < 50 && rangedReady(c, rs, best) && !sparedInLine(spared, c.x, bx, cy)) { fightDir = dir; fightSlot = rs; }
      }

      // Seguir al jugador (unos 70 px detrás)
      var goalX = p.onGround ? safeSideX(p.x, p.y, [-p.facing * AI_BEHIND, p.facing * AI_BEHIND, -p.facing * 35, 0], c.w) : p.x - p.facing * AI_BEHIND;
      var gdx = goalX - c.x;
      var move = 0;
      if (Math.abs(gdx) > 16) move = (gdx > 0) ? 1 : -1;
      if (fightDir !== 0 && Math.abs(c.x - p.x) < 220) move = 0;      // se planta y lucha
      if (move < 0) ai.h.left = true; else if (move > 0) ai.h.right = true;
      if (fightDir !== 0) {
        c.aiFace = fightDir;
        if ((move === 0 || move === fightDir) && c.cd[fightSlot] <= 0) ai.pr[SLOT_BTN[fightSlot]] = true;
      }

      // Saltar: pared, hueco o jugador más alto
      if (c.onGround) {
        var need = false;
        if (move !== 0) {
          var ax = c.x + move * (c.w / 2 + 8);
          if (solidPt(ax, c.y - 10) || solidPt(ax, c.y - 40)) {
            need = true;
            // Una caja delante: la rompe con su arma de cuerpo a cuerpo.
            var ms2 = slotOfType(c, 'cuerpo');
            if ((boxAtPt(ax, c.y - 10) || boxAtPt(ax, c.y - 40)) && ms2 >= 0 && c.cd[ms2] <= 0) { ai.pr[SLOT_BTN[ms2]] = true; need = false; }
          } else {
            var fx = c.x + move * (c.w / 2 + 12);
            if (!groundPt(fx, c.y + 6)) need = true;                                         // hueco
            else if (tileAt(rows, Math.floor(fx / TILE), Math.floor((c.y - 10) / TILE)) === '^' ||
                     tileAt(rows, Math.floor((fx + move * TILE * 0.5) / TILE), Math.floor((c.y - 10) / TILE)) === '^') need = true;  // pinchos
          }
        }
        if (p.onGround && p.y < c.y - 40 && Math.abs(dxp) < 240) need = true;
        if (need) ai.pr.jump = true;
      } else if (c.heroe === 'falcon' && c.jumpsLeft > 0 && c.vy > 60 && (dyp < -30 || !groundBelow(c, 3))) {
        ai.pr.jump = true;
      }

      // Jetpack: subir hasta el jugador o salvarse de un hueco
      var js = c.weapons.indexOf('jetpack');
      if (js >= 0 && c.fuel > 0.1) {
        var wantUp = (dyp < -90 && Math.abs(dxp) < 320) || (!c.onGround && c.vy > 150 && !groundBelow(c, 4) && dyp <= 10);
        if (wantUp) ai.h[SLOT_BTN[js]] = true;
      }

      // Atascado mucho rato lejos de su sitio → reaparece junto al jugador
      if (move !== 0 && Math.abs(gdx) > 120 && Math.abs(c.x - c.aiLastX) < 0.5) c.aiStuck += dt;
      else c.aiStuck = Math.max(0, c.aiStuck - dt * 2);
      c.aiLastX = c.x;
      if (c.aiStuck > 1.6) requestWarp(c);
    }
    // ¿Hay una mini-torreta reservada para el jugador en la línea de tiro? (no la rompe "sin querer")
    function sparedInLine(list, x0, x1, y) {
      var a = Math.min(x0, x1), b = Math.max(x0, x1);
      for (var i = 0; i < list.length; i++) {
        if (list[i].x > a && list[i].x < b && Math.abs(list[i].y - y) < 60) return true;
      }
      return false;
    }
    function requestWarp(c) {
      c.aiStuck = 0;
      if (!c.warpPending && c.y - c.h < mapH) effects.push({ kind: 'sparkle', x: c.x, y: c.y - c.h / 2, t: 0, dur: 0.45 });
      c.warpPending = true;
      tryWarp(c);
    }
    function tryWarp(c) {
      var p = player;
      if (!p || p.ko || !p.onGround) return;
      var nx = safeSideX(p.x, p.y, [-p.facing * 50, p.facing * 50, -p.facing * 25, 0], c.w);
      c.x = nx; c.y = p.y; c.vx = 0; c.vy = 0; c.knockT = 0; c.onGround = false;
      c.warpPending = false; c.invuln = 0; c.aiStuck = 0; c.aiLastX = nx;
      effects.push({ kind: 'sparkle', x: c.x, y: c.y - c.h / 2, t: 0, dur: 0.5 });
      effects.push({ kind: 'sparkle', x: c.x + 12, y: c.y - c.h + 6, t: 0, dur: 0.6 });
    }

    // ---------------------------------------------------------------------
    //  Prensas
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
        else if (ph < PRESS_WAIT + PRESS_WARN + PRESS_DOWN) {
          k = (ph - PRESS_WAIT - PRESS_WARN) / PRESS_DOWN;
          pr.state = 'down'; k = k * k;
        } else if (ph < PRESS_WAIT + PRESS_WARN + PRESS_DOWN + PRESS_HOLD) { pr.state = 'hold'; k = 1; }
        else {
          pr.state = 'rise';
          k = 1 - clamp((ph - PRESS_WAIT - PRESS_WARN - PRESS_DOWN - PRESS_HOLD) / PRESS_UP, 0, 1);
        }
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
      if (Math.abs(h.x - target) > 4) {             // pared detrás: sale por el otro lado
        dir = -dir;
        nudgeX(h, (pr.cx + dir * (TILE / 2 + h.w / 2 + 2)) - h.x);
      }
      hurtHero(h, 1, pr.cx);                         // 1 de daño + empujón
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
        if (e.captured) {
          e.__capT = num(e.__capT, CAPTURE_TIME) - dt;
          if (e.__capT <= 0) killEnemy(e);      // "pop" dentro de la red: cuenta como derrotado
          continue;
        }
        var T = e.__def;
        if (e.x > x0 && e.x < x1 && T && typeof T.update === 'function' && (e.__err || 0) < 5) {
          updatingEnemy = e;
          try { T.update(e, dt, world); } catch (err) { e.__err = (e.__err || 0) + 1; warnOnce('update-' + e.__tipo, err); }
          updatingEnemy = null;
          if (!isFinite(e.x) || !isFinite(e.y)) { e.alive = false; continue; }
        }
        if (e.stun > 0) e.stun = Math.max(0, e.stun - dt);
        if (leaving) return;
      }
      if (frameNo % 30 === 0) {
        var keep = [];
        for (i = 0; i < enemies.length; i++) { if (enemies[i].alive) keep.push(enemies[i]); }
        enemies = keep;
      }
      // Contacto: touchDamage (por defecto 1) con enemigos vivos, no atrapados ni hackeados.
      var hs = heroesAll();
      for (i = 0; i < enemies.length; i++) {
        e = enemies[i];
        if (!e.alive || e.captured || e.hacked || e.invisible) continue;
        var td = (e.__def && typeof e.__def.touchDamage === 'number') ? e.__def.touchDamage : 1;
        if (td <= 0) continue;
        var r = enemyRect(e);
        for (var k = 0; k < hs.length; k++) {
          if (hs[k].ko) continue;
          if (overlap(heroRect(hs[k]), r)) hurtHero(hs[k], td, e.x);
          if (leaving) return;
        }
      }
    }

    // ---------------------------------------------------------------------
    //  Proyectiles de los héroes
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
      var i, hit, e;
      // Flechas
      for (i = arrows.length - 1; i >= 0; i--) {
        var a = arrows[i];
        a.vy += ARROW_GRAV * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
        a.angle = Math.atan2(a.vy, a.vx);
        hit = false;
        var bx = boxAtPt(a.x, a.y);
        if (bx) { breakBoxAt(bx.col, bx.row); hit = true; }
        else if (solidPt(a.x, a.y)) { hit = true; effects.push({ kind: 'sparkle', x: a.x, y: a.y, t: 0, dur: 0.25 }); }
        if (!hit) {
          e = enemyAtRect({ x: a.x - 5, y: a.y - 5, w: 10, h: 10 });
          if (e) { hitEnemy(e, 1, 'arco', a.owner ? a.owner.x : a.x - a.vx); hit = true; }
        }
        if (hit || a.life <= 0 || a.x < -40 || a.x > mapW + 40 || a.y > mapH + 40) arrows.splice(i, 1);
      }
      // Escudo bumerán: va 260 px y vuelve; 1 de daño en cada pasada
      for (i = booms.length - 1; i >= 0; i--) {
        var b = booms[i], o = b.owner;
        b.life += dt;
        if (!o || o.ko || b.life > 4) { if (o) o.boomOut = false; booms.splice(i, 1); continue; }
        var oy = o.y - o.h * 0.55;
        if (b.phase === 'out') {
          var step = BOOM_OUT_SPEED * dt * (1 - 0.45 * (b.traveled / BOOM_RANGE));
          b.x += b.dir * step; b.traveled += step;
          var bb = boxAtPt(b.x + b.dir * 12, b.y);
          if (bb) { breakBoxAt(bb.col, bb.row); b.phase = 'back'; }
          else if (solidPt(b.x + b.dir * 12, b.y)) { b.phase = 'back'; sfx('clink'); }
          if (b.traveled >= BOOM_RANGE) b.phase = 'back';
        } else {
          var dx = o.x - b.x, dy = oy - b.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          var sp = BOOM_BACK_SPEED * dt;
          if (d <= Math.max(26, sp)) { o.boomOut = false; booms.splice(i, 1); continue; }
          b.x += dx / d * sp; b.y += dy / d * sp;
        }
        var list = (b.phase === 'out') ? b.hitOut : b.hitBack;
        var hr = { x: b.x - 16, y: b.y - 16, w: 32, h: 32 };
        for (var k = 0; k < enemies.length; k++) {
          var en = enemies[k];
          if (!targetable(en) || list.indexOf(en) >= 0) continue;
          if (overlap(hr, enemyRect(en))) { list.push(en); hitEnemy(en, 1, 'bumeran', b.x - b.dir * 10); }
        }
      }
      // Redes
      for (i = nets.length - 1; i >= 0; i--) {
        var n = nets[i], caught = null;
        n.vy += 120 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.life -= dt;
        hit = false;
        var nb = boxAtPt(n.x, n.y);
        if (nb) { breakBoxAt(nb.col, nb.row); hit = true; }
        else if (solidPt(n.x, n.y)) hit = true;
        if (!hit) {
          caught = enemyAtRect({ x: n.x - 16, y: n.y - 16, w: 32, h: 32 });
          if (caught) { hitEnemy(caught, 1, 'red', n.owner ? n.owner.x : n.x - n.vx); hit = true; }
        }
        if (hit || n.life <= 0) {
          if (!caught) effects.push({ kind: 'sparkle', x: n.x, y: n.y, t: 0, dur: 0.3 });
          nets.splice(i, 1);
        }
      }
      // Pulsos (solo visual)
      for (i = pulses.length - 1; i >= 0; i--) {
        pulses[i].t += dt;
        if (pulses[i].t >= pulses[i].dur) pulses.splice(i, 1);
      }
    }

    // ---- ¿Bloquea el escudo bumerán (en la mano) un ataque que viene de fromX? ----
    function shieldBlocks(h, fromX) {
      if (!h || h.weapons.indexOf('bumeran') < 0 || h.boomOut) return false;
      return (num(fromX, h.x) - h.x) * h.facing > 0;
    }

    // ---------------------------------------------------------------------
    //  Proyectiles y rayos de los enemigos (y de las torretas aliadas)
    // ---------------------------------------------------------------------
    function spawnShot(p) {
      if (!p || typeof p !== 'object') return;
      var s = {
        x: num(p.x, 0), y: num(p.y, 0), vx: num(p.vx, 0), vy: num(p.vy, 0), r: num(p.r, 6),
        dmg: num(p.dmg, 1), from: (p.from === 'ally') ? 'ally' : 'enemy', kind: p.kind || 'laser',
        life: num(p.life, 3), gravity: num(p.gravity, 0)
      };
      if (shots.length < 200) shots.push(s);
    }
    function updateShots(dt) {
      for (var i = shots.length - 1; i >= 0; i--) {
        var s = shots[i];
        s.vy += s.gravity * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        var remove = false;
        if (solidPt(s.x, s.y)) { remove = true; effects.push({ kind: 'sparkle', x: s.x, y: s.y, t: 0, dur: 0.25 }); }
        var sr = { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
        if (!remove && s.from === 'enemy') {
          var hs = heroesAll();
          for (var k = 0; k < hs.length; k++) {
            var h = hs[k];
            if (h.ko || !overlap(sr, heroRect(h))) continue;
            if (shieldBlocks(h, s.x - s.vx * 0.05)) {
              sfx('shieldBlock');
              effects.push({ kind: 'sparkle', x: s.x, y: s.y, t: 0, dur: 0.35 });
            } else {
              hurtHero(h, s.dmg, s.x - s.vx * 0.05);
            }
            remove = true;
            break;
          }
          if (leaving) return;
        } else if (!remove) {
          var e = enemyAtRect(sr);
          if (e) { hitEnemy(e, s.dmg, 'aliado', s.x - s.vx * 0.05); remove = true; }
        }
        if (remove || s.life <= 0 || s.x < -60 || s.x > mapW + 60 || s.y > mapH + 60 || s.y < -200) shots.splice(i, 1);
      }
    }
    function spawnBeam(b) {
      if (!b || typeof b !== 'object') return;
      var life = num(b.life, 0.4);
      beams.push({
        x1: num(b.x1, 0), y1: num(b.y1, 0), x2: num(b.x2, 0), y2: num(b.y2, 0), dmg: num(b.dmg, 1),
        from: (b.from === 'ally') ? 'ally' : 'enemy', life: life, maxLife: life || 0.4, width: num(b.width, 10), hit: []
      });
    }
    function beamTouches(b, r) {
      var pad = b.width / 2;
      var rr = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
      var len = dist(b.x1, b.y1, b.x2, b.y2), n = Math.max(1, Math.ceil(len / 8));
      for (var i = 0; i <= n; i++) {
        var f = i / n, px = b.x1 + (b.x2 - b.x1) * f, py = b.y1 + (b.y2 - b.y1) * f;
        if (px >= rr.x && px <= rr.x + rr.w && py >= rr.y && py <= rr.y + rr.h) return true;
      }
      return false;
    }
    function updateBeams(dt) {
      for (var i = beams.length - 1; i >= 0; i--) {
        var b = beams[i];
        b.life -= dt;
        if (b.from === 'enemy') {
          var hs = heroesAll();
          for (var k = 0; k < hs.length; k++) {
            var h = hs[k];
            if (h.ko || !beamTouches(b, heroRect(h))) continue;
            if (shieldBlocks(h, b.x1)) {
              if (b.hit.indexOf(h) < 0) { b.hit.push(h); sfx('shieldBlock'); effects.push({ kind: 'sparkle', x: h.x + h.facing * 20, y: h.y - 34, t: 0, dur: 0.35 }); }
            } else {
              hurtHero(h, b.dmg, b.x1);
            }
            if (leaving) return;
          }
        } else {
          for (var j = 0; j < enemies.length; j++) {
            var e = enemies[j];
            if (!targetable(e) || b.hit.indexOf(e) >= 0) continue;
            if (beamTouches(b, enemyRect(e))) { b.hit.push(e); hitEnemy(e, b.dmg, 'aliado', b.x1); }
          }
        }
        if (b.life <= 0) beams.splice(i, 1);
      }
    }

    // ---- Efectos (world.spawnEffect) ----
    function spawnEffect(kind, x, y, opts) {
      opts = opts || {};
      x = num(x, 0); y = num(y, 0);
      if (effects.length > 300) return;
      if (kind === 'explosion') effects.push({ kind: 'explosion', x: x, y: y, t: 0, dur: num(opts.life, 0.4), r: num(opts.r, 26) });
      else if (kind === 'exclaim') effects.push({ kind: 'exclaim', x: x, y: y, t: 0, dur: num(opts.life, 0.6), owner: updatingEnemy });
      else if (kind === 'texto') effects.push({ kind: 'texto', x: x, y: y, t: 0, dur: num(opts.life, 1.0), texto: String(opts.texto || ''), color: opts.color || '#fef3c7' });
      else effects.push({ kind: 'sparkle', x: x, y: y, t: 0, dur: num(opts.life, 0.4) });
    }

    // ---- Corazones ----
    function updatePickups(dt) {
      for (var i = pickups.length - 1; i >= 0; i--) {
        var pk = pickups[i];
        pk.t += dt;
        if (!pk.grounded) {
          pk.vy += GRAV * dt; pk.y += pk.vy * dt;
          if (pk.vy > 0 && groundPt(pk.x, pk.y + 12)) {
            pk.y = Math.floor((pk.y + 12) / TILE) * TILE - 12; pk.vy = 0; pk.grounded = true;
          }
          if (pk.y > mapH + 40) { pickups.splice(i, 1); continue; }
        }
        var pr = { x: pk.x - 16, y: pk.y - 16, w: 32, h: 32 };
        var hs = heroesAll(), taker = null, td = Infinity;
        var p1Hurt = player && !player.ko && heroHp(player) < heroMaxHp(player);
        for (var q = 0; q < hs.length; q++) {
          var hh = hs[q];
          if (hh.ko || !overlap(pr, heroRect(hh))) continue;
          if (hh.isAI && !p1Hurt) continue;            // lo deja para cuando haga falta
          var d = dist(pk.x, pk.y, hh.x, hh.y - hh.h / 2);
          if (d < td) { td = d; taker = hh; }
        }
        if (!taker) continue;
        // El compañero no necesita corazones: el que coge es para el Jugador 1.
        var healed = taker.isAI ? player : taker;
        if (healed && !healed.ko && heroHp(healed) < heroMaxHp(healed)) setHeroHp(healed, Math.min(heroMaxHp(healed), heroHp(healed) + 2));
        sfx('pickup');
        effects.push({ kind: 'sparkle', x: pk.x, y: pk.y, t: 0, dur: 0.4 });
        if (taker.isAI && healed) effects.push({ kind: 'sparkle', x: healed.x, y: healed.y - healed.h, t: 0, dur: 0.5 });
        pickups.splice(i, 1);
      }
    }
    function updateEffects(dt) {
      var i;
      for (i = effects.length - 1; i >= 0; i--) { effects[i].t += dt; if (effects[i].t >= effects[i].dur) effects.splice(i, 1); }
      for (i = hudFx.length - 1; i >= 0; i--) { hudFx[i].t += dt; if (hudFx[i].t >= hudFx[i].dur) hudFx.splice(i, 1); }
    }

    function updateCamera(dt) {
      var focus = cameraFocus();
      var tx = clampCamX(focus.x - G.W / 2), ty = clampCamY(focus.y - G.H / 2);
      var k = clamp((1 - Math.pow(0.001, dt)) * 6, 0, 1);
      camX = clampCamX(camX + (tx - camX) * k);
      camY = clampCamY(camY + (ty - camY) * k);
    }

    // =====================================================================
    //  RENDER
    // =====================================================================
    scene.render = function (ctx) {
      if (!ctx) return;
      if (!player) { ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, G.W, G.H); return; }
      try { drawBackground(ctx); } catch (e) { warnOnce('bg', e); }
      ctx.save();
      ctx.translate(-Math.round(camX), -Math.round(camY));
      for (var i = 0; i < WORLD_LAYERS.length; i++) {
        ctx.save();
        try { WORLD_LAYERS[i](ctx); } catch (e) { warnOnce('render-' + i, e); }
        ctx.restore();
      }
      ctx.restore();
      try { drawHud(ctx); } catch (e2) { warnOnce('hud', e2); }
    };

    // ---- Fondo ----
    function drawBackground(ctx) {
      var ok = false;
      if (def.tema === 'fabrica') ok = art('bgFabrica', ctx, camX, tNow);
      else if (def.tema === 'fortaleza') ok = art('bgFortaleza', ctx, tNow);
      else ok = art('bgCiudad', ctx, camX, tNow);
      if (!ok) drawBgFallback(ctx);
    }
    function drawBgFallback(ctx) {
      var fab = (def.tema === 'fabrica');
      var g = ctx.createLinearGradient(0, 0, 0, G.H);
      if (fab) { g.addColorStop(0, '#1c1917'); g.addColorStop(1, '#44403c'); }
      else { g.addColorStop(0, '#312e81'); g.addColorStop(0.6, '#7c3aed'); g.addColorStop(1, '#f97316'); }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, G.W, G.H);
      var layers = fab ? [[0.2, '#292524', 300], [0.45, '#3f3a36', 360]] : [[0.2, '#3b1d6e', 250], [0.45, '#2a1450', 330]];
      for (var l = 0; l < layers.length; l++) {
        var par = layers[l][0], col = layers[l][1], base = layers[l][2];
        var off = -((camX * par) % 120) - 120;
        ctx.fillStyle = col;
        for (var x = off, n = Math.floor(camX * par / 120); x < G.W + 120; x += 120, n++) {
          var hgt = base + ((n * 37) % 5) * 28;
          if (fab) {
            ctx.fillRect(x + 10, G.H - hgt, 90, hgt);
            ctx.fillRect(x + 30, G.H - hgt - 60, 16, 60);                 // chimenea
          } else {
            ctx.fillRect(x + 8, G.H - hgt, 96, hgt);
            ctx.fillStyle = (l === 1) ? 'rgba(253,224,71,0.35)' : 'rgba(253,224,71,0.18)';
            for (var wy = G.H - hgt + 16; wy < G.H - 20; wy += 28) {
              for (var wx = x + 18; wx < x + 96; wx += 22) { if (((wx + wy + n) | 0) % 3 !== 0) ctx.fillRect(wx, wy, 9, 12); }
            }
            ctx.fillStyle = col;
          }
        }
      }
    }

    // ---- Tiles ----
    var P1_TILE_TEMA = { ciudad: 'base', fabrica: 'base', fortaleza: 'ship' };
    // Devuelve true si lo dibujó el arte aprobado (P2.fn.tile); false si usó el respaldo.
    function drawTileArt(ctx, x, y, tipo, estado) {
      if (art('tile', ctx, x, y, TILE, tipo, def.tema || 'ciudad', estado)) return true;
      if (tipo === 'cintaIzq' || tipo === 'cintaDer') { drawBeltFallback(ctx, x, y, tipo === 'cintaIzq' ? -1 : 1); return false; }
      var dt = gfx('drawTile');
      if (dt) { try { dt(ctx, x, y, TILE, tipo, P1_TILE_TEMA[def.tema] || 'base'); return false; } catch (e) { /* abajo */ } }
      ctx.fillStyle = (tipo === 'spike') ? '#94a3b8' : '#475569';
      ctx.fillRect(x, y, TILE, tipo === 'platform' ? 14 : TILE);
      return false;
    }
    function drawBeltFallback(ctx, x, y, dir) {
      ctx.save();
      roundRect(ctx, x + 1, y + 2, TILE - 2, TILE - 4, 8);
      ctx.fillStyle = '#334155'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      roundRect(ctx, x + 3, y + 4, TILE - 6, 12, 5);
      ctx.fillStyle = '#1e293b'; ctx.fill();
      ctx.beginPath(); ctx.rect(x + 3, y + 4, TILE - 6, 12); ctx.clip();
      var off = ((tNow * BELT_SPEED * dir) % 16 + 16) % 16;
      ctx.fillStyle = '#fbbf24';
      for (var sx = x - 16 + off; sx < x + TILE + 16; sx += 16) {
        ctx.beginPath();
        if (dir > 0) { ctx.moveTo(sx, y + 6); ctx.lineTo(sx + 6, y + 10); ctx.lineTo(sx, y + 14); }
        else { ctx.moveTo(sx + 6, y + 6); ctx.lineTo(sx, y + 10); ctx.lineTo(sx + 6, y + 14); }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.save();
      for (var r = 0; r < 2; r++) {
        var rx = x + 12 + r * 24, ry = y + 30;
        ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#64748b'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
        var ang = tNow * 8 * dir;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(ang) * 6, ry + Math.sin(ang) * 6); ctx.stroke();
      }
      ctx.restore();
    }
    function drawTiles(ctx) {
      var c0 = Math.floor(camX / TILE) - 1, c1 = Math.floor((camX + G.W) / TILE) + 1;
      var r0 = Math.floor(camY / TILE) - 1, r1 = Math.floor((camY + G.H) / TILE) + 1;
      for (var row = r0; row <= r1; row++) {
        for (var col = c0; col <= c1; col++) {
          var ch = tileAt(rows, col, row), tipo = null;
          if (ch === '#') tipo = 'solid';
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
      for (i = 0; i < consoles.length; i++) {
        var c = consoles[i];
        if (!onScreenX(c.cx, 80)) continue;
        var conArt = drawTileArt(ctx, c.col * TILE, c.row * TILE, 'console', c.activated);
        if (c.activated && !conArt) {
          ctx.save();
          ctx.globalAlpha = 0.55 + Math.sin(tNow * 4) * 0.15;
          ctx.fillStyle = '#4ade80';
          roundRect(ctx, c.col * TILE + 9, c.row * TILE + 15, TILE - 18, 13, 3); ctx.fill();
          ctx.restore();
          drawCheck(ctx, c.cx, c.row * TILE + 6);
        }
      }
      for (i = 0; i < checkpoints.length; i++) {
        var k = checkpoints[i];
        if (!onScreenX(k.cx, 80)) continue;
        if (!drawTileArt(ctx, k.x, k.y, 'checkpoint', k.taken) && k.taken) drawCheck(ctx, k.x + TILE - 8, k.y + TILE - 10);
      }
    }
    function drawCheck(ctx, x, y) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x - 3.5, y); ctx.lineTo(x - 1, y + 2.8); ctx.lineTo(x + 3.8, y - 2.6); ctx.stroke();
      ctx.restore();
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
    // Anillos de progreso del hackeo (encima de los héroes para que siempre se vean).
    function drawHackOverlays(ctx) {
      var i;
      for (i = 0; i < consoles.length; i++) {
        var c = consoles[i];
        if (!c.activated && c.progress > 0) drawHackRing(ctx, c.cx, c.cy - 4, c.progress);
      }
      for (i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.alive && !e.hacked && e.__hackFrac > 0) { var ec = rectCenter(enemyRect(e)); drawHackRing(ctx, ec.x, ec.y, e.__hackFrac); }
      }
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
      ctx.lineJoin = 'round';
      // carcasa
      roundRect(ctx, x + 2, y, TILE - 4, 18, 4);
      ctx.fillStyle = '#475569'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      // vástago
      if (ext > 4) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + TILE / 2 - 6, y + 16, 12, Math.max(0, ext - 16));
        ctx.strokeRect(x + TILE / 2 - 6, y + 16, 12, Math.max(0, ext - 16));
      }
      // cabeza con franjas de aviso
      var hy = y + Math.max(14, ext) - 14;
      roundRect(ctx, x + 1, hy, TILE - 2, 16, 3);
      ctx.fillStyle = '#facc15'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#1e293b';
      for (var s = -16; s < TILE; s += 12) {
        ctx.beginPath(); ctx.moveTo(x + s, hy + 16); ctx.lineTo(x + s + 6, hy + 16); ctx.lineTo(x + s + 14, hy); ctx.lineTo(x + s + 8, hy); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      roundRect(ctx, x + 1, hy, TILE - 2, 16, 3);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }

    // ---- Medallas y corazones ----
    function drawMedalFallback(ctx, x, y, scale, off) {
      ctx.save();
      ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = off ? '#64748b' : '#fbbf24'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var r = (i % 2) ? 3.5 : 8, a = i * Math.PI / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = off ? '#94a3b8' : '#fef9c3'; ctx.fill();
      ctx.restore();
    }
    function drawMedals(ctx) {
      for (var i = 0; i < medals.length; i++) {
        var m = medals[i];
        if (m.taken || !onScreenX(m.x, 60)) continue;
        var bob = Math.sin(tNow * 3 + i) * 4;
        // halo para que se vea bien
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(tNow * 4 + i) * 0.12;
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(m.x, m.y + bob, 22, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (!art('medalla', ctx, m.x, m.y + bob + 4, { t: tNow, scale: 1.3 })) drawMedalFallback(ctx, m.x, m.y + bob, 1, false);
      }
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

    // ---- Enemigos ----
    function drawEnemies(ctx) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive || !onScreenX(e.x, 160)) continue;
        var T = e.__def;
        ctx.save();
        try {
          if (e.captured) ctx.translate(Math.sin(tNow * 40) * 1.5, 0);
          if (T && typeof T.draw === 'function') T.draw(ctx, e, world);
          else if (!e.invisible) { var r0 = enemyRect(e); ctx.fillStyle = '#64748b'; ctx.fillRect(r0.x, r0.y, r0.w, r0.h); }
        } catch (err) { warnOnce('draw-' + e.__tipo, err); }
        ctx.restore();
        if (e.captured) drawCaptured(ctx, e);
      }
    }
    function drawNetFallback(ctx, x, y, s, open) {
      ctx.save();
      ctx.translate(x, y); ctx.scale(s, s);
      ctx.strokeStyle = '#d9f99d'; ctx.lineWidth = 2;
      var R = open ? 16 : 22;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      for (var k = -2; k <= 2; k++) {
        ctx.beginPath(); ctx.moveTo(k * 7, -R); ctx.lineTo(k * 7, R); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-R, k * 7); ctx.lineTo(R, k * 7); ctx.stroke();
      }
      ctx.fillStyle = '#65a30d';
      for (var a = 0; a < 6; a++) { ctx.beginPath(); ctx.arc(Math.cos(a) * R, Math.sin(a) * R, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    function drawCaptured(ctx, e) {
      var r = enemyRect(e), c = rectCenter(r);
      var s = clamp(Math.max(r.w, r.h) / 40, 0.6, 2);
      ctx.save();
      ctx.beginPath(); ctx.rect(c.x - 80, c.y - 80, 160, 160); ctx.clip();
      if (!art('red', ctx, c.x, c.y, { scale: s, abierta: false })) drawNetFallback(ctx, c.x, c.y, s, false);
      ctx.restore();
    }

    // ---- Proyectiles y rayos de enemigos ----
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
          } else {
            var r = Math.max(4, s.r);
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
            ctx.fillStyle = enemy ? (s.kind === 'orb' ? '#f472b6' : '#ef4444') : '#22c55e';
            ctx.fill();
            ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath(); ctx.arc(s.x - r * 0.3, s.y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
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
        ctx.save();
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.35 * a + 0.15;
        ctx.strokeStyle = col; ctx.lineWidth = b.width * 2;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.globalAlpha = 0.6 + 0.4 * a;
        ctx.lineWidth = b.width;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, b.width * 0.35);
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.restore();
      }
    }

    // ---- Héroes ----
    function needsHandArt(heroe, w) {
      if (heroe === 'falcon') return !(w === 'espada' || w === 'arco');
      return w !== 'pulso';
    }
    function handPos(p) {
      var f = p.actFacing || p.facing;
      if (p.actPose === 'attack') return { x: p.x + f * 34, y: p.y - 18 };
      if (p.actPose === 'shoot') return { x: p.x + f * 30, y: p.y - 24 };
      return { x: p.x + f * 18, y: p.y - 28 };
    }
    function drawWeaponFallback(ctx, x, y, w, f, s) {
      ctx.save();
      ctx.translate(x, y); ctx.scale(f * (s || 1), s || 1);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
      if (w === 'espada') {
        ctx.fillStyle = '#e5f2ff';
        ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(24, -2); ctx.lineTo(28, 0); ctx.lineTo(24, 2); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b8860b'; ctx.fillRect(-1, -6, 4, 12); ctx.strokeRect(-1, -6, 4, 12);
      } else if (w === 'guantes') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(2, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, -3, 2.5, 0, Math.PI * 2); ctx.fill();
      } else if (w === 'arco') {
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-2, 0, 13, -0.9, 0.9); ctx.stroke();
        ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-2 + 13 * Math.cos(0.9), -13 * Math.sin(0.9)); ctx.lineTo(-2 + 13 * Math.cos(0.9), 13 * Math.sin(0.9)); ctx.stroke();
      } else if (w === 'pulso') {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath(); ctx.arc(4, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (w === 'bumeran') {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath(); ctx.arc(4, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(4, 0, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(4, 0, 3, 0, Math.PI * 2); ctx.fill();
      } else if (w === 'red') {
        ctx.fillStyle = '#64748b';
        roundRect(ctx, -2, -5, 22, 10, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a3e635'; ctx.beginPath(); ctx.arc(20, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (w === 'jetpack') {
        ctx.fillStyle = '#94a3b8';
        roundRect(ctx, -8, -10, 16, 20, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-5, 10); ctx.lineTo(0, 18); ctx.lineTo(5, 10); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    function drawJetpack(ctx, p) {
      var llama = p.thrusting ? (0.7 + Math.sin(tNow * 40) * 0.3) : 0;
      if (art('jetpack', ctx, p.x, p.y, { facing: p.facing, scale: 1, llama: llama })) return;
      var bx = p.x - p.facing * 15, by = p.y - 40;
      ctx.save();
      ctx.lineJoin = 'round';
      roundRect(ctx, bx - 7, by - 12, 14, 24, 5);
      ctx.fillStyle = '#94a3b8'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#f97316'; ctx.fillRect(bx - 4, by - 6, 8, 4);
      if (llama > 0) {
        var L = 10 + llama * 14;
        ctx.fillStyle = '#fb923c';
        ctx.beginPath(); ctx.moveTo(bx - 6, by + 12); ctx.lineTo(bx, by + 12 + L); ctx.lineTo(bx + 6, by + 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.moveTo(bx - 3, by + 12); ctx.lineTo(bx, by + 12 + L * 0.6); ctx.lineTo(bx + 3, by + 12); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    function drawHero(ctx, p) {
      if (!p || p.ko || p.warpPending) return;
      if (p.invuln > 0 && Math.floor(p.blink * 12) % 2 === 0) return;     // parpadeo
      var hasJet = p.weapons.indexOf('jetpack') >= 0;
      if (hasJet) drawJetpack(ctx, p);
      var o = { t: tNow, facing: p.facing, pose: p.pose, scale: 1 };
      if (p.actFx > 0 && p.actPose) { o.t = ACT_DUR - p.actFx; o.facing = p.actFacing; }
      var fn = gfx(p.heroe === 'falcon' ? 'drawFalcon' : 'drawDirector');
      try {
        if (fn) fn(ctx, p.x, p.y, o);
        else { ctx.fillStyle = (p.heroe === 'falcon') ? '#22c55e' : '#3b82f6'; ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h); }
      } catch (e) {
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
      }
      // Arma en la mano (animación de ataque o disparo)
      if (p.actFx > 0 && p.actWeapon) {
        var t01 = clamp(1 - p.actFx / ACT_DUR, 0, 1);
        if (needsHandArt(p.heroe, p.actWeapon)) {
          var hp = handPos(p);
          if (!art('armaEnMano', ctx, hp.x, hp.y, { arma: p.actWeapon, facing: p.actFacing, t01: t01, scale: 1 })) {
            drawWeaponFallback(ctx, hp.x, hp.y, p.actWeapon, p.actFacing, 1);
          }
        }
        var fx = p.x + p.actFacing * 30, fy = p.y - p.h * 0.55;
        try {
          if (p.actWeapon === 'espada') { var sl = gfx('drawSlash'); if (sl) sl(ctx, fx, fy, p.actFacing, t01); }
          else if (p.actWeapon === 'guantes') { var pu = gfx('drawPunch'); if (pu) pu(ctx, fx + p.actFacing * 6, fy, p.actFacing, t01); }
        } catch (e2) { /* nada */ }
      } else if (p.weapons.indexOf('bumeran') >= 0 && !p.boomOut) {
        // Escudo en la mano: bloquea los disparos de frente.
        var sx = p.x + p.facing * 15, sy = p.y - 30;
        if (!art('bumeran', ctx, sx, sy, { t: 0, scale: 0.55 })) drawWeaponFallback(ctx, sx - p.facing * 4, sy, 'bumeran', p.facing, 0.8);
      }
      // Rayo y anillo de hackeo
      if (p.hackTarget && p.hackProgress > 0 && p.hackTarget.kind === 'enemy') {
        var hb = gfx('drawHackBeam');
        if (hb) { try { hb(ctx, p.x + p.facing * 12, p.y - 34, p.hackTarget.x, p.hackTarget.y, tNow); } catch (e3) { /* nada */ } }
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
      ctx.fillStyle = '#e0f7ff';
      ctx.beginPath(); ctx.arc(pu.x + pu.dir * pu.len, pu.y, 5 * (1 - t01) + 2, 0, Math.PI * 2); ctx.fill();
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
      for (i = 0; i < booms.length; i++) {
        var b = booms[i];
        if (!art('bumeran', ctx, b.x, b.y, { t: tNow, scale: 1 })) {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(tNow * 18);
          drawWeaponFallback(ctx, -4, 0, 'bumeran', 1, 1.3);
          ctx.restore();
        }
      }
      for (i = 0; i < nets.length; i++) {
        var n = nets[i];
        if (!art('red', ctx, n.x, n.y, { scale: 1, abierta: true })) drawNetFallback(ctx, n.x, n.y, 1, true);
      }
    }

    function drawEffects(ctx) {
      var ex = gfx('drawExplosion'), sp = gfx('drawSparkle'), xc = gfx('drawExclamation');
      for (var i = 0; i < effects.length; i++) {
        var e = effects[i];
        var t01 = clamp(e.t / e.dur, 0, 1);
        try {
          if (e.kind === 'explosion' && ex) ex(ctx, e.x, e.y, t01, e.r || 24);
          else if (e.kind === 'sparkle' && sp) sp(ctx, e.x, e.y, t01);
          else if (e.kind === 'exclaim' && xc) xc(ctx, e.x, e.y);
          else if (e.kind === 'texto') {
            ctx.save();
            ctx.globalAlpha = t01 < 0.7 ? 1 : (1 - t01) / 0.3;
            outlinedText(ctx, e.texto, e.x, e.y - t01 * 28, 18, e.color);
            ctx.restore();
          } else if (e.kind === 'dust') {
            ctx.save();
            ctx.globalAlpha = 1 - t01;
            ctx.fillStyle = '#e2e8f0';
            for (var k = -1; k <= 1; k += 2) {
              ctx.beginPath(); ctx.arc(e.x + k * (14 + t01 * 26), e.y - 6 - t01 * 6, 6 * (1 - t01) + 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
          }
        } catch (err) { /* nada */ }
      }
    }

    // ---- HUD ----
    function drawHud(ctx) {
      try { if (G.ui && G.ui.drawHearts) G.ui.drawHearts(ctx); } catch (e) { /* nada */ }
      drawWeaponHud(ctx, player, false, coop ? KEYS_P1 : KEYS_1P);
      if (player2) drawWeaponHud(ctx, player2, true, KEYS_P2);
      drawMedalHud(ctx);
      if (coop) drawKoBanners(ctx);
      drawHints(ctx);
      drawHudFx(ctx);
    }
    function slotCooldown(p, s) {
      var w = p.weapons[s];
      if (w === 'jetpack') return 1 - clamp(p.fuel / FUEL_MAX, 0, 1);
      if (w === 'bumeran' && p.boomOut) return 1;
      if (w === 'arco' && ownCount(arrows, p) >= ARROW_MAX) return 1;
      return (p.cd[s] > 0) ? clamp(p.cd[s] / (p.cdMax[s] || 1), 0, 1) : 0;
    }
    function drawWeaponHud(ctx, p, right, keys) {
      if (!p) return;
      var size = 36, gap = 8, cy = 31, s;
      ctx.save();
      if (p.ko) ctx.globalAlpha = 0.45;
      for (s = 0; s < 2; s++) {
        var w = p.weapons[s];
        var cx = right ? (G.W - 216 - s * (size + gap)) : (216 + s * (size + gap));
        if (!art('iconoArma', ctx, cx, cy, { arma: w, size: size, ocupada: false })) {
          roundRect(ctx, cx - size / 2, cy - size / 2, size, size, 9);
          ctx.fillStyle = 'rgba(20,16,40,0.82)'; ctx.fill();
          ctx.lineWidth = 2.5; ctx.strokeStyle = WEAPON_COLOR[w] || '#fbbf24'; ctx.stroke();
          drawWeaponFallback(ctx, cx - 6, cy, w, 1, 0.9);
        }
        var cdf = slotCooldown(p, s);
        if (cdf > 0) {
          ctx.save();
          roundRect(ctx, cx - size / 2, cy - size / 2, size, size, 9); ctx.clip();
          ctx.fillStyle = 'rgba(8,8,20,0.62)';
          ctx.fillRect(cx - size / 2, cy - size / 2, size, size * cdf);
          ctx.restore();
        }
        // tecla
        ctx.beginPath(); ctx.arc(cx + 14, cy + 14, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fde68a'; ctx.stroke();
        ctx.font = 'bold 11px system-ui, "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fef3c7';
        ctx.fillText(keys[s] || '', cx + 14, cy + 14.5);
      }
      // combustible del jetpack
      if (p.weapons.indexOf('jetpack') >= 0) {
        var bw = size * 2 + gap, bh = 8;
        var bx = right ? (G.W - 216 + size / 2 - bw) : (216 - size / 2), by = cy + size / 2 + 5;
        var f = clamp(p.fuel / FUEL_MAX, 0, 1);
        roundRect(ctx, bx, by, bw, bh, 4);
        ctx.fillStyle = 'rgba(20,16,40,0.85)'; ctx.fill();
        if (f > 0) {
          var low = f < 0.25 && Math.floor(tNow * 6) % 2 === 0;
          var g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
          g.addColorStop(0, low ? '#ef4444' : '#f97316'); g.addColorStop(1, low ? '#f87171' : '#fde047');
          ctx.fillStyle = g;
          roundRect(ctx, bx + 1, by + 1, Math.max(2, (bw - 2) * f), bh - 2, 3); ctx.fill();
        }
        roundRect(ctx, bx, by, bw, bh, 4);
        ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
      }
      ctx.restore();
    }
    function drawMedalHud(ctx) {
      if (!medals.length) return;
      var got = runMedals();
      ctx.save();
      roundRect(ctx, G.W / 2 - 54, 13, 108, 36, 14);
      ctx.fillStyle = 'rgba(20,16,40,0.6)'; ctx.fill();
      ctx.restore();
      for (var i = 0; i < 3; i++) {
        var x = G.W / 2 + (i - 1) * 32, y = 31, on = got[i] === true;
        if (!art('medalla', ctx, x, y + 5, { t: tNow, scale: 0.95, apagada: !on })) drawMedalFallback(ctx, x, y, 0.85, !on);
      }
    }
    function drawHudFx(ctx) {
      for (var i = 0; i < hudFx.length; i++) {
        var f = hudFx[i], k = clamp(f.t / f.dur, 0, 1), e = k * k * (3 - 2 * k);
        var x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 60;
        var sc = 1 - 0.3 * k;
        if (!art('medalla', ctx, x, y + 5, { t: tNow, scale: 1.3 * sc })) drawMedalFallback(ctx, x, y, sc, false);
      }
    }
    function drawKoBanners(ctx) {
      var hs = humans(), shown = 0;
      for (var i = 0; i < hs.length; i++) {
        var p = hs[i];
        if (!p.ko) continue;
        var label = (p.hpKey === 'hp2') ? 'P2' : 'P1';
        var txt = label + ' vuelve en ' + Math.max(1, Math.ceil(p.koTimer)) + ' s';
        ctx.save();
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var bw = ctx.measureText(txt).width + 28, bh = 34, bx = G.W / 2, by = G.H - 60 - shown * 44;
        ctx.fillStyle = 'rgba(20,24,40,0.78)';
        roundRect(ctx, bx - bw / 2, by - bh / 2, bw, bh, 10); ctx.fill();
        ctx.fillStyle = (label === 'P1') ? '#fbbf24' : '#4ade80';
        ctx.fillText(txt, bx, by);
        ctx.restore();
        shown++;
      }
    }
    function minHumanDX(x) {
      var hs = aliveHumans();
      if (!hs.length) hs = [player];
      var m = Infinity;
      for (var i = 0; i < hs.length; i++) { var d = Math.abs(hs[i].x - x); if (d < m) m = d; }
      return m;
    }
    function anyHumanNearY(y, tol) {
      var hs = aliveHumans();
      if (!hs.length) hs = [player];
      for (var i = 0; i < hs.length; i++) { if (Math.abs(hs[i].y - y) < tol) return true; }
      return false;
    }
    function drawHints(ctx) {
      if (!G.ui || !G.ui.hint) return;
      var doorHint = nearClosedDoorHint();
      if (doorHint) { try { G.ui.hint(ctx, doorHint); } catch (e) { /* nada */ } return; }
      if (!Array.isArray(def.hints)) return;
      var best = null, bd = HINT_RANGE + 1;
      for (var i = 0; i < def.hints.length; i++) {
        var hn = def.hints[i];
        if (!hn || typeof hn.texto !== 'string') continue;
        var d = minHumanDX(num(hn.x, -999) * TILE + TILE / 2);
        if (d < bd) { bd = d; best = hn; }
      }
      if (best) { try { G.ui.hint(ctx, best.texto); } catch (e2) { /* nada */ } }
    }
    function nearClosedDoorHint() {
      for (var i = 0; i < doors.length; i++) {
        var d = doors[i];
        if (d.open) continue;
        if (minHumanDX(d.cx) < HINT_RANGE && anyHumanNearY(d.cy, 160)) {
          var c = null;
          for (var k = 0; k < consoles.length; k++) { if (consoles[k].group === d.group && !consoles[k].activated) { c = consoles[k]; break; } }
          if (c) {
            var dir = (c.cx < d.cx) ? 'a la izquierda' : (c.cx > d.cx ? 'a la derecha' : 'cerca');
            return 'Puerta cerrada: busca la consola ' + dir + ' y hackéala (mantén H).';
          }
          return 'Puerta cerrada: busca una consola y hackéala (mantén H).';
        }
      }
      return null;
    }

    // Capas del mundo, de atrás hacia delante (cada una protegida por separado).
    var WORLD_LAYERS = [
      drawTiles, drawPresses, drawDoorsConsolesFlags, drawExit, drawMedals, drawPickups,
      drawEnemies, drawShots, drawBeams,
      function (ctx) { if (buddy) drawHero(ctx, buddy); },
      function (ctx) { if (player2) drawHero(ctx, player2); },
      function (ctx) { drawHero(ctx, player); },
      drawHeroProjectiles, drawHackOverlays, drawEffects
    ];

    // ---------------------------------------------------------------------
    //  Atajos de prueba (contrato §11)
    // ---------------------------------------------------------------------
    scene.__debug = {
      heroes: function () { return heroesAll().slice(); },
      enemies: function () { return liveEnemies(); },
      medals: function () {
        var out = [];
        for (var i = 0; i < medals.length; i++) out.push({ idx: medals[i].idx, x: medals[i].x, y: medals[i].y, taken: medals[i].taken });
        return out.sort(function (a, b) { return a.idx - b.idx; });
      },
      teleport: function (x, y) {
        try {
          if (!player) return;
          x = num(x, player.x); y = num(y, player.y);
          var mate = player2 || buddy;
          player.x = clamp(x, player.w / 2, Math.max(player.w / 2, mapW - player.w / 2)); player.y = y;
          player.vx = 0; player.vy = 0; player.knockT = 0; player.onGround = false;
          if (mate) {
            mate.x = safeSideX(player.x, y, [-40, 40, -80, 80, 0], mate.w); mate.y = y;
            mate.vx = 0; mate.vy = 0; mate.knockT = 0; mate.onGround = false; mate.warpPending = false; mate.ko = false;
          }
          var f = cameraFocus();
          camX = clampCamX(f.x - G.W / 2); camY = clampCamY(f.y - G.H / 2);
          syncWorld();
        } catch (e) { warnOnce('teleport', e); }
      }
    };

    return scene;
  };

  // =========================================================================
  //  Escena de pruebas del motor: p2test_plataformas (usa TODAS las letras)
  // =========================================================================
  var TEST_DEF = {
    nombre: 'Zona de pruebas',
    tema: 'ciudad',
    music: 'city',
    chapter: 1,
    retry: 'p2test_plataformas',
    mapa: [
      '#................................#..........#',
      '#................................#..........#',
      '#.............................p..#...#####..#',
      '#....................w...........#.......A..#',
      '#................................#..r.......#',
      '#...............t................#.....M....#',
      '#........M.....===........####...#....===...#',
      '#.......===................P.....D..........#',
      '#.....B..........................D..........#',
      '#.S.h.B.......^^..x.....K..M..Ch.D..q....a.E#',
      '###########..######>>>>#################<<<##',
      '###########..################################'
    ],
    hints: [
      { x: 2, texto: '¡Zona de pruebas! Ataca con J, dispara con K y salta con ESPACIO.' },
      { x: 9, texto: '¡Una medalla! En cada nivel hay 3 escondidas.' },
      { x: 20, texto: 'Las cintas te llevan: ¡mira hacia dónde van!' },
      { x: 24, texto: 'La bandera guarda tu avance.' },
      { x: 27, texto: 'Si la prensa tiembla y sale «!», ¡apártate!' }
    ]
  };
  try {
    G.scenes = G.scenes || {};
    var testScene = G.makePlatformScene2(TEST_DEF);
    var baseEnter = testScene.enter;
    testScene.enter = function (params) {
      // Sin estado2.js (G.p2) el héroe del Jugador 1 sale de la URL (&heroe=falcon).
      try {
        if (!G.p2 && typeof location !== 'undefined' && location.search) {
          var h = new URLSearchParams(location.search).get('heroe');
          if (h === 'falcon' || h === 'director') TEST_DEF.heroe = h;
        }
      } catch (e) { /* nada */ }
      baseEnter.call(testScene, params);
    };
    G.scenes.p2test_plataformas = testScene;
  } catch (e) {
    try { console.warn('[plataformas2] no se pudo registrar p2test_plataformas', e); } catch (x) { /* nada */ }
  }
})();
