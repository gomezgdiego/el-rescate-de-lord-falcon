// platformer.js — Framework de plataformas para "El Rescate de Lord Falcon".
// Registra G.makePlatformScene(def) que devuelve un objeto-escena.
// Sin dependencias, sin assets externos. Todo el estado se reconstruye limpio en enter().
window.G = window.G || {};

(function () {
  'use strict';

  var TILE = 48;              // tamanio de tile en pixeles
  var GRAV = 1800;           // gravedad px/s^2
  var JUMP_V = -640;          // velocidad de salto
  var PLAYER_W = 34;
  var PLAYER_H = 58;
  var COYOTE = 0.10;          // coyote time (s)
  var JUMP_BUFFER = 0.12;     // buffer de salto (s)
  var INVULN = 1.2;           // invulnerabilidad tras danio (s)
  var RESPAWN_INVULN = 1.5;   // invulnerabilidad tras reaparecer en checkpoint (s)
  var KO_TIME = 4.0;          // tiempo K.O. antes de reaparecer en co-op (s)
  var KO_RESPAWN_HP = 6;      // vida al reaparecer tras K.O. (3 corazones)
  var KO_INVULN = 1.5;        // invulnerabilidad tras reaparecer de K.O. (s)
  var HEART_DROP = 0.25;      // probabilidad de soltar corazon
  var HACK_TIME = 1.2;        // tiempo de hackeo mantenido (s)
  var HACK_RANGE = 70;        // alcance de hackeo (px)
  var HINT_RANGE = 130;       // proximidad para mostrar hints (px)

  // ---- Helpers locales seguros (no dependemos de APIs ajenas de otros modulos
  //      salvo lo que el contrato garantiza en G.* del core, gfx, audio, ui) ----
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function sfx(n) { if (G.audio && G.audio.sfx) { try { G.audio.sfx(n); } catch (e) {} } }
  function music(n) { if (G.audio && G.audio.music) { try { G.audio.music(n); } catch (e) {} } }
  function rectsOverlap(a, b) {
    if (G.rectsOverlap) return G.rectsOverlap(a, b);
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function dist(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function rnd() { return Math.random(); }

  // Devuelve el codigo de tile en (col,row) del mapa (o vacio fuera de rango).
  function tileAt(rows, col, row) {
    if (row < 0 || row >= rows.length) return '.';
    var line = rows[row];
    if (col < 0 || col >= line.length) return '.';
    return line.charAt(col);
  }

  // Un tile es SOLIDO para colision (bloquea por todos lados).
  function isSolidTile(ch) {
    return ch === '#' || ch === 'B' || ch === 'D';
  }
  // Un tile es plataforma UNA VIA (solo colisiona por arriba cayendo).
  function isOneWayTile(ch) {
    return ch === '=';
  }

  G.makePlatformScene = function (def) {
    // def = { nombre, tema, music, heroe, mapa:[...], hints:[...], nivel }
    var scene = {};

    // ---- Estado mutable de la escena (se REINICIA por completo en enter) ----
    var rows = null;          // copia fresca de las filas del mapa
    var mapCols = 0, mapRows = 0;
    var mapW = 0, mapH = 0;   // dimensiones del mundo en px

    var player = null;        // P1 (heroe del nivel, como en 1 jugador)
    var player2 = null;       // P2 (solo en co-op)
    var coop = false;         // copia local de G.state.coop en enter()
    var camX = 0, camY = 0;

    var enemies = [];
    var arrows = [];          // flechas de Falcon
    var pulses = [];          // pulsos electricos del Director
    var enemyShots = [];      // laseres de drones/torretas
    var allyShots = [];       // disparos de torretas hackeadas
    var pickups = [];         // corazones sueltos (dinamicos)
    var effects = [];         // efectos visuales temporales
    var consoles = [];        // consolas 'C'
    var doors = [];           // puertas 'D'
    var checkpoints = [];     // banderas 'K'
    var brokenBoxes = {};     // set de "col,row" de cajas rotas (para no re-dibujar)

    var spawnX = 0, spawnY = 0;     // inicio 'S'
    var lastCheckX = 0, lastCheckY = 0; // ultimo checkpoint

    var exitRect = null;      // portal de salida 'E'
    var levelDone = false;    // ya salio por E (evita re-disparar)

    // Cache de posiciones estaticas para dibujar tiles decorativos (h, K, E se manejan aparte)
    var staticTiles = [];     // {col,row,ch} de tiles a dibujar por drawTile

    // NOTA: cooldowns/efectos de ataque son POR JUGADOR (viven en cada hero:
    // attackTimer, shootTimer, swordFx, swordFacing, punchMode). En 1 jugador
    // el heroe unico los tiene igual que antes.

    // ---- Utilidades de mapa ----
    function centerOfTile(col, row) {
      return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
    }

    // Calcula un PUNTO DE REAPARICION SEGURO para un checkpoint en (col,row):
    // busca la columna mas cercana (propia, +-1, +-2, +-3) con suelo solido '#'
    // por debajo del checkpoint antes del fondo del mapa. Devuelve el centro de
    // esa columna, de pie sobre ese suelo. Si ninguna sirve, usa el inicio S.
    function safeRespawnForCheckpoint(col, row) {
      var offsets = [0, -1, 1, -2, 2, -3, 3];
      for (var i = 0; i < offsets.length; i++) {
        var c = col + offsets[i];
        if (c < 0 || c >= mapCols) continue;
        for (var r = row + 1; r < mapRows; r++) {
          if (tileAt(rows, c, r) === '#') {
            // Pies de pie sobre el borde superior de ese tile solido.
            return { x: c * TILE + TILE / 2, y: r * TILE };
          }
        }
      }
      // Sin suelo alcanzable: reaparecer en el inicio S.
      return { x: spawnX, y: spawnY };
    }

    // Empareja cada consola con la puerta D mas cercana (distancia euclidea, centros de tile).
    function linkConsolesToDoors() {
      for (var i = 0; i < consoles.length; i++) {
        var c = consoles[i];
        var best = -1, bestD = Infinity;
        for (var j = 0; j < doors.length; j++) {
          var d = doors[j];
          var dd = dist(c.cx, c.cy, d.cx, d.cy);
          if (dd < bestD) { bestD = dd; best = j; }
        }
        c.doorIndex = best; // puede ser -1 si no hay puertas
      }
    }

    // Reconstruye TODO el estado del nivel a partir de una copia fresca del mapa.
    function buildLevel() {
      // Copia fresca de las filas (nunca mutar def.mapa).
      rows = def.mapa.slice();
      mapRows = rows.length;
      mapCols = 0;
      for (var r = 0; r < rows.length; r++) {
        if (rows[r].length > mapCols) mapCols = rows[r].length;
      }
      mapW = mapCols * TILE;
      mapH = mapRows * TILE;

      enemies = [];
      arrows = [];
      pulses = [];
      enemyShots = [];
      allyShots = [];
      pickups = [];
      effects = [];
      consoles = [];
      doors = [];
      checkpoints = [];
      brokenBoxes = {};
      staticTiles = [];

      spawnX = TILE * 2;
      spawnY = TILE * 2;
      exitRect = null;
      levelDone = false;

      // Recorre el mapa colocando entidades e ubicaciones.
      for (var row = 0; row < mapRows; row++) {
        var line = rows[row];
        for (var col = 0; col < line.length; col++) {
          var ch = line.charAt(col);
          var c = centerOfTile(col, row);
          switch (ch) {
            case 'S':
              // inicio: pies en el centro-inferior del tile
              spawnX = c.x;
              spawnY = row * TILE + TILE; // pies en el borde inferior del tile
              break;
            case 'K':
              var safe = safeRespawnForCheckpoint(col, row);
              checkpoints.push({ col: col, row: row, cx: c.x, cy: c.y, x: col * TILE, y: row * TILE, taken: false, safeX: safe.x, safeY: safe.y });
              break;
            case 'h':
              pickups.push({ x: c.x, y: c.y, vy: 0, grounded: true, fromMap: true, t: 0 });
              break;
            case 'G':
              enemies.push(makeToroGuard(c.x, row * TILE + TILE));
              break;
            case 'd':
              enemies.push(makeDrone(c.x, c.y));
              break;
            case 'T':
              enemies.push(makeTurret(c.x, row * TILE + TILE));
              break;
            case 'C':
              consoles.push({ col: col, row: row, cx: c.x, cy: c.y, activated: false, progress: 0, doorIndex: -1 });
              break;
            case 'D':
              doors.push({ col: col, row: row, cx: c.x, cy: c.y, open: false });
              break;
            case 'E':
              exitRect = { x: col * TILE + 6, y: row * TILE + 2, w: TILE - 12, h: TILE - 4, cx: c.x, cy: c.y };
              break;
            case 'B':
            case '#':
            case '=':
            case '^':
              staticTiles.push({ col: col, row: row, ch: ch });
              break;
            default:
              break;
          }
        }
      }

      linkConsolesToDoors();

      lastCheckX = spawnX;
      lastCheckY = spawnY;

      // Modo co-op: solo si G.state.coop es true.
      coop = !!(G.state && G.state.coop);

      // P1 = heroe del nivel (identico a 1 jugador).
      player = makeHero(def.heroe, G.input, 'hp', spawnX, spawnY);

      // P2 = EL OTRO heroe, aparece junto a S. Solo en co-op.
      if (coop) {
        var heroe2 = otherHero(def.heroe);
        // Aparece un poco al lado del inicio (mismo suelo).
        var sx2 = spawnX + 40;
        if (sx2 > mapW - 20) sx2 = spawnX - 40;
        player2 = makeHero(heroe2, G.input2, 'hp2', sx2, spawnY);
      } else {
        player2 = null;
      }

      // Camara inicial centrada en el punto de referencia (clampeada).
      var focus = cameraFocus();
      camX = clampCamX(focus.x - G.W / 2);
      camY = clampCamY(focus.y - G.H / 2);
    }

    // El OTRO heroe (companiero de P2), segun el contrato:
    //   level1: P1=falcon -> P2=director (Director America)
    //   level2: P1=director -> P2=falcon (Lord Falcon)
    //   level4: P1=director -> P2=falcon (Lord Falcon)
    // El intercambio falcon<->director cubre exactamente los tres niveles.
    // (def.coHeroe permite forzarlo desde el nivel si algun dia hiciera falta.)
    function otherHero(h) {
      if (def.coHeroe) return def.coHeroe;
      return (h === 'director') ? 'falcon' : 'director';
    }

    // Fabrica de heroe: crea un jugador con su input y su clave de vida (hpKey).
    // Toda la fisica/ataques usan estos campos, identicos para P1 y P2.
    function makeHero(heroe, inputRef, hpKey, sx, sy) {
      return {
        heroe: heroe,
        input: inputRef || nullInput,
        hpKey: hpKey,             // 'hp' (P1) o 'hp2' (P2)
        maxKey: (hpKey === 'hp2') ? 'maxHp2' : 'maxHp',
        x: sx, y: sy,             // (x,y) = centro de los pies
        vx: 0, vy: 0,
        w: PLAYER_W, h: PLAYER_H,
        facing: 1,
        onGround: false,
        coyote: 0,
        jumpBuf: 0,
        jumpsLeft: 0,             // para doble salto de Falcon
        jumpHeldPrev: false,
        pose: 'idle',
        invuln: 0,
        blink: 0,
        hackTarget: null,
        hackProgress: 0,
        // cooldowns/efectos de ataque POR JUGADOR
        attackTimer: 0,
        shootTimer: 0,
        swordFx: 0,
        swordFacing: 1,
        punchMode: (heroe === 'director'),
        // estado K.O. (co-op)
        ko: false,
        koTimer: 0
      };
    }

    // Input nulo (por si G.input2 no existe en 1 jugador): siempre false.
    var nullInput = { held: function () { return false; }, pressed: function () { return false; } };

    // Vida de un heroe (lee/escribe en G.state segun su hpKey).
    function heroHp(h) { return G.state[h.hpKey] || 0; }
    function heroMaxHp(h) { var m = G.state[h.maxKey]; return (m === undefined) ? G.state.maxHp : m; }
    function setHeroHp(h, v) { G.state[h.hpKey] = v; }

    // Lista de heroes activos (P1 siempre; P2 solo en co-op).
    function heroes() { return player2 ? [player, player2] : [player]; }
    // Heroes VIVOS (no K.O.).
    function aliveHeroes() {
      var out = [];
      var hs = heroes();
      for (var i = 0; i < hs.length; i++) { if (!hs[i].ko) out.push(hs[i]); }
      return out;
    }
    // Heroe VIVO mas cercano a (x,y) (centro del cuerpo). Fallback: player.
    // Los enemigos apuntan/persiguen al vivo mas cercano.
    function nearestHero(x, y) {
      var hs = aliveHeroes();
      if (hs.length === 0) return player; // ambos K.O.: apunta a P1 (irrelevante, viene gameover)
      var best = hs[0], bestD = Infinity;
      for (var i = 0; i < hs.length; i++) {
        var h = hs[i];
        var d = dist(x, y, h.x, h.y - h.h / 2);
        if (d < bestD) { bestD = d; best = h; }
      }
      return best;
    }

    // Companiero (el otro heroe) de h, o null.
    function partnerOf(h) {
      if (!player2) return null;
      return (h === player) ? player2 : player;
    }

    // Punto de enfoque de la camara: medio de los vivos (o P1 si ninguno).
    function cameraFocus() {
      var hs = aliveHeroes();
      if (hs.length === 0) hs = [player];
      var sx = 0, sy = 0;
      for (var i = 0; i < hs.length; i++) { sx += hs[i].x; sy += (hs[i].y - hs[i].h / 2); }
      return { x: sx / hs.length, y: sy / hs.length };
    }

    function clampCamX(v) {
      var maxX = Math.max(0, mapW - G.W);
      return clamp(v, 0, maxX);
    }
    function clampCamY(v) {
      var maxY = Math.max(0, mapH - G.H);
      return clamp(v, 0, maxY);
    }

    // ---- Fabricas de enemigos ----
    function makeToroGuard(x, feetY) {
      return {
        type: 'guard',
        x: x, y: feetY,        // (x,y) = centro de los pies
        vx: 0, vy: 0,
        w: 40, h: 52,
        hp: 3,
        facing: -1,
        onGround: false,
        state: 'patrol',       // patrol | telegraph | charge
        telegraph: 0,
        chargeTime: 0,
        patrolDir: -1,
        patrolTimer: 0,
        hurtFlash: 0,
        alive: true,
        pose: 'idle'
      };
    }
    function makeDrone(x, y) {
      return {
        type: 'drone',
        x: x, y: y,            // (x,y) = centro
        baseY: y,
        w: 40, h: 32,
        hp: 2,
        phase: rnd() * Math.PI * 2,
        driftX: (rnd() < 0.5 ? -1 : 1) * 26,
        shootTimer: 1 + rnd() * 1.5,
        hurtFlash: 0,
        alive: true
      };
    }
    function makeTurret(x, feetY) {
      return {
        type: 'turret',
        x: x, y: feetY - 20,   // centro aprox del cuerpo de la torreta
        feetY: feetY,
        w: 40, h: 40,
        hp: 3,
        hacked: false,
        hackProgress: 0,
        shootTimer: 1 + rnd(),
        angle: Math.PI,        // apunta a la izquierda por defecto
        hurtFlash: 0,
        alive: true
      };
    }

    // ---- Colision AABB tile a tile (resuelve X, luego Y) ----
    // Recibe un rect en coordenadas de mundo con centro-pies (px,py) y devuelve
    // la resolucion aplicada. wasGoingDown se usa para plataformas una-via.
    function collideWorld(ent) {
      // ent con {x (centro), y (pies), w, h, vx, vy, onGround}
      ent.onGround = false;

      // --- Eje X ---
      var newX = ent.x + ent.vx * DT;
      var left = newX - ent.w / 2;
      var right = newX + ent.w / 2;
      var top = ent.y - ent.h;
      var bottom = ent.y - 0.001;

      var c0 = Math.floor(left / TILE);
      var c1 = Math.floor(right / TILE);
      var r0 = Math.floor(top / TILE);
      var r1 = Math.floor((bottom) / TILE);

      var col, row, ch;
      if (ent.vx > 0) {
        for (col = c0; col <= c1; col++) {
          for (row = r0; row <= r1; row++) {
            ch = tileAt(rows, col, row);
            if (solidBlocks(ch, col, row)) {
              newX = col * TILE - ent.w / 2 - 0.001;
              ent.vx = 0;
              col = c1 + 1; break;
            }
          }
        }
      } else if (ent.vx < 0) {
        for (col = c1; col >= c0; col--) {
          for (row = r0; row <= r1; row++) {
            ch = tileAt(rows, col, row);
            if (solidBlocks(ch, col, row)) {
              newX = (col + 1) * TILE + ent.w / 2 + 0.001;
              ent.vx = 0;
              col = c0 - 1; break;
            }
          }
        }
      }
      ent.x = newX;

      // --- Eje Y ---
      var goingDown = ent.vy >= 0;
      var newY = ent.y + ent.vy * DT;
      left = ent.x - ent.w / 2;
      right = ent.x + ent.w / 2;
      // recomputa columnas tras mover X
      c0 = Math.floor(left / TILE);
      c1 = Math.floor((right - 0.001) / TILE);

      if (ent.vy > 0) {
        // cayendo: mirar los tiles bajo los pies
        var feetTarget = newY;
        r0 = Math.floor((ent.y - 0.001) / TILE);
        r1 = Math.floor(feetTarget / TILE);
        var stop = false;
        for (row = r0; row <= r1 && !stop; row++) {
          for (col = c0; col <= c1; col++) {
            ch = tileAt(rows, col, row);
            var solid = solidBlocks(ch, col, row);
            var oneway = isOneWayTile(ch);
            if (solid || oneway) {
              var tileTop = row * TILE;
              // Para una-via: solo si los pies venian por encima del tile.
              if (oneway) {
                var prevFeet = ent.y;
                if (prevFeet > tileTop + 1) continue; // ya lo habiamos atravesado
              }
              if (feetTarget >= tileTop) {
                newY = tileTop;
                ent.vy = 0;
                ent.onGround = true;
                stop = true;
                break;
              }
            }
          }
        }
      } else if (ent.vy < 0) {
        // subiendo: mirar los tiles sobre la cabeza
        var headTarget = newY - ent.h;
        r1 = Math.floor((ent.y - ent.h) / TILE);
        r0 = Math.floor(headTarget / TILE);
        for (row = r0; row <= r1; row++) {
          for (col = c0; col <= c1; col++) {
            ch = tileAt(rows, col, row);
            if (solidBlocks(ch, col, row)) {
              var tileBottom = (row + 1) * TILE;
              if (headTarget <= tileBottom) {
                newY = tileBottom + ent.h;
                ent.vy = 0;
                row = r1 + 1; break;
              }
            }
          }
        }
      }
      ent.y = newY;
    }

    // Un tile bloquea? '#','B' (si no rota),'D' (si cerrada).
    function solidBlocks(ch, col, row) {
      if (ch === '#') return true;
      if (ch === 'B') {
        return !brokenBoxes[col + ',' + row];
      }
      if (ch === 'D') {
        var d = findDoorAt(col, row);
        return d ? !d.open : true;
      }
      return false;
    }
    function findDoorAt(col, row) {
      for (var i = 0; i < doors.length; i++) {
        if (doors[i].col === col && doors[i].row === row) return doors[i];
      }
      return null;
    }

    var DT = 1 / 60; // se sobrescribe en cada update con el dt real (fijo)

    // ---- Danio a un heroe (SIEMPRE 1 en niveles = medio corazon) ----
    // p = heroe golpeado (P1 o P2). En 1 jugador siempre es player.
    function hurtPlayer(p, fromX) {
      if (p.ko || p.invuln > 0) return;
      setHeroHp(p, Math.max(0, heroHp(p) - 1));
      p.invuln = INVULN;
      p.blink = 0;
      // knockback suave
      var dir = (fromX !== undefined && fromX > p.x) ? -1 : 1;
      p.vx = dir * 180;
      p.vy = -260;
      p.onGround = false;
      sfx('hurt');
      if (heroHp(p) <= 0) koOrGameover(p);
    }

    function killEnemy(e) {
      e.alive = false;
      effects.push({ kind: 'explosion', x: (e.type === 'guard' ? e.x : e.x), y: (e.type === 'guard' ? e.y - e.h / 2 : e.y), t: 0, dur: 0.4, r: 26 });
      sfx('explosion');
      if (rnd() < HEART_DROP) {
        var dropY = (e.type === 'guard') ? e.y - 30 : e.y;
        pickups.push({ x: e.x, y: dropY, vy: -160, grounded: false, fromMap: false, t: 0 });
      }
    }

    // ---- Escena: enter / exit / update / render ----
    scene.enter = function (params) {
      G.state.hp = G.state.maxHp;   // vida llena al empezar el nivel (P1)
      // En co-op rellena tambien la vida de P2 (maxHp2 puede no existir aun -> usa maxHp).
      if (G.state && G.state.coop) {
        if (G.state.maxHp2 === undefined) G.state.maxHp2 = G.state.maxHp;
        G.state.hp2 = G.state.maxHp2;
      }
      buildLevel();
      music(def.music);
    };

    scene.exit = function () {
      // Limpieza defensiva de estado temporal (evita fantasmas entre escenas).
      arrows = [];
      pulses = [];
      enemyShots = [];
      allyShots = [];
      effects = [];
      pickups = [];
    };

    scene.update = function (dt) {
      DT = dt;
      if (!player) return;

      updatePlayer(player, dt);
      if (player2) updatePlayer(player2, dt);
      if (levelDone) return;     // una salida ya disparo la transicion

      updateEnemies(dt);
      updateProjectiles(dt);
      updatePickups(dt);
      updateEffects(dt);
      updateCamera(dt);
      if (coop) clampPlayersToScreen();
    };

    // En co-op cada jugador queda limitado a los bordes visibles de la camara
    // (ademas de a los limites del mundo, que ya aplica collideWorld).
    function clampPlayersToScreen() {
      var hs = heroes();
      for (var i = 0; i < hs.length; i++) {
        var p = hs[i];
        if (p.ko) continue;
        var minX = camX + p.w / 2;
        var maxX = camX + G.W - p.w / 2;
        if (p.x < minX) { p.x = minX; if (p.vx < 0) p.vx = 0; }
        else if (p.x > maxX) { p.x = maxX; if (p.vx > 0) p.vx = 0; }
      }
    }

    // ---- Jugador ----
    // updatePlayer(p, dt): actualiza UN heroe p (P1 o P2). Toda la logica usa
    // p.input / p.heroe / p.hpKey, identica para ambos. En 1 jugador hay un solo
    // heroe (player) y el comportamiento es exactamente el de antes.
    function updatePlayer(p, dt) {
      // --- K.O. (co-op): cuenta atras y reaparicion ---
      if (p.ko) {
        p.koTimer -= dt;
        if (p.koTimer <= 0) reviveHero(p);
        return; // K.O.: no se mueve ni actua
      }

      var input = p.input;

      // Entrada horizontal
      var moveL = input.held('left');
      var moveR = input.held('right');
      var speed = (p.heroe === 'falcon') ? 290 : 260;
      if (moveL && !moveR) { p.vx = -speed; p.facing = -1; }
      else if (moveR && !moveL) { p.vx = speed; p.facing = 1; }
      else { p.vx = 0; }

      // Buffer y coyote
      if (input.pressed('jump')) p.jumpBuf = JUMP_BUFFER;
      else p.jumpBuf = Math.max(0, p.jumpBuf - dt);

      if (p.onGround) {
        p.coyote = COYOTE;
      } else {
        p.coyote = Math.max(0, p.coyote - dt);
      }

      // Salto (con coyote + buffer) y doble salto de Falcon.
      var canFirst = (p.coyote > 0);
      if (p.jumpBuf > 0) {
        if (canFirst) {
          p.vy = JUMP_V;
          p.onGround = false;
          p.coyote = 0;
          p.jumpBuf = 0;
          p.jumpsLeft = (p.heroe === 'falcon') ? 1 : 0; // salto extra disponible para Falcon
          sfx('jump');
        } else if (p.heroe === 'falcon' && p.jumpsLeft > 0) {
          p.vy = JUMP_V;
          p.jumpsLeft = 0;
          p.jumpBuf = 0;
          sfx('jump');
          effects.push({ kind: 'sparkle', x: p.x, y: p.y - p.h / 2, t: 0, dur: 0.3 });
        }
      }

      // Gravedad
      p.vy += GRAV * dt;
      if (p.vy > 1200) p.vy = 1200;

      // Movimiento + colision
      collideWorld(p);

      // Pinchos: tocar '^' = 1 danio + rebote
      checkSpikes(p);

      // Caer del vacio: 1 danio + reaparecer (co-op: junto al companiero vivo).
      if (p.y - p.h > mapH + 40) {
        if (p.invuln <= 0) {
          setHeroHp(p, Math.max(0, heroHp(p) - 1));
          sfx('hurt');
        }
        if (heroHp(p) <= 0) {
          // Se quedo sin vida al caer -> K.O. (co-op) o gameover (1 jugador).
          koOrGameover(p);
          return;
        }
        respawnFromFall(p);
      }

      // Invulnerabilidad
      if (p.invuln > 0) {
        p.invuln -= dt;
        p.blink += dt;
      }

      // Ataques y disparos (cooldowns POR JUGADOR)
      if (p.attackTimer > 0) p.attackTimer -= dt;
      if (p.shootTimer > 0) p.shootTimer -= dt;
      if (p.swordFx > 0) p.swordFx -= dt;

      handleAttack(p);
      handleShoot(p);
      handleHack(p, dt);

      // Recogida de checkpoints (compartido: cualquiera lo activa).
      for (var i = 0; i < checkpoints.length; i++) {
        var k = checkpoints[i];
        if (!k.taken) {
          var kr = { x: k.x, y: k.y, w: TILE, h: TILE };
          if (rectsOverlap(playerRect(p), kr)) {
            k.taken = true;
            // Usa el PUNTO DE REAPARICION SEGURO (no la casilla de la bandera,
            // que puede estar sobre un hueco). La bandera se sigue dibujando en 'K'.
            lastCheckX = k.safeX;
            lastCheckY = k.safeY;
            sfx('checkpoint');
            effects.push({ kind: 'sparkle', x: k.cx, y: k.cy - 20, t: 0, dur: 0.5 });
          }
        }
      }

      // Salida E: basta que UNO la toque.
      if (exitRect && !levelDone) {
        if (rectsOverlap(playerRect(p), exitRect)) {
          levelDone = true;
          sfx('victory');
          G.go('levelDone', { level: def.nivel });
          return;
        }
      }

      // Pose visual
      updatePlayerPose(p);
    }

    function playerRect(p) {
      return { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h };
    }

    function updatePlayerPose(p) {
      if (p.swordFx > 0) { p.pose = 'attack'; return; }
      if (p.invuln > 0 && p.blink < 0.4) { p.pose = 'hurt'; return; }
      if (!p.onGround) { p.pose = (p.vy < 0) ? 'jump' : 'fall'; return; }
      if (Math.abs(p.vx) > 5) { p.pose = 'run'; return; }
      p.pose = 'idle';
    }

    function checkSpikes(p) {
      if (p.invuln > 0) return;
      var pr = playerRect(p);
      var c0 = Math.floor(pr.x / TILE);
      var c1 = Math.floor((pr.x + pr.w - 0.001) / TILE);
      var r0 = Math.floor(pr.y / TILE);
      var r1 = Math.floor((pr.y + pr.h - 0.001) / TILE);
      for (var row = r0; row <= r1; row++) {
        for (var col = c0; col <= c1; col++) {
          if (tileAt(rows, col, row) === '^') {
            var sr = { x: col * TILE + 8, y: row * TILE + 14, w: TILE - 16, h: TILE - 14 };
            if (rectsOverlap(pr, sr)) {
              setHeroHp(p, Math.max(0, heroHp(p) - 1));
              p.invuln = INVULN;
              p.blink = 0;
              p.vy = -420;          // rebote
              p.onGround = false;
              sfx('hurt');
              if (heroHp(p) <= 0) koOrGameover(p);
              return;
            }
          }
        }
      }
    }

    // Reaparicion tras caer al vacio: en co-op junto al companiero vivo; si no,
    // en el ultimo checkpoint (1 jugador: siempre checkpoint, como antes).
    function respawnFromFall(p) {
      var spot = respawnSpot(p);
      p.x = spot.x;
      p.y = spot.y;
      p.vx = 0;
      p.vy = 0;
      p.onGround = false;
      p.invuln = RESPAWN_INVULN;   // 1.5s tras reaparecer
      p.blink = 0;
    }

    // Punto de reaparicion: junto al companiero vivo y en suelo (co-op) o el checkpoint.
    function respawnSpot(p) {
      var mate = partnerOf(p);
      if (mate && !mate.ko && mate.onGround) {
        var off = (mate.facing >= 0) ? -34 : 34;
        var rx = clamp(mate.x + off, p.w / 2, mapW - p.w / 2);
        return { x: rx, y: mate.y };
      }
      return { x: lastCheckX, y: lastCheckY };
    }

    // Decide K.O. (co-op) o gameover (1 jugador o ambos K.O.) cuando un heroe llega a 0.
    function koOrGameover(p) {
      if (!coop) {
        G.go('gameover', { retry: 'level' + def.nivel });
        return;
      }
      // Co-op: este heroe cae K.O.
      p.ko = true;
      p.koTimer = KO_TIME;
      p.vx = 0; p.vy = 0;
      p.hackTarget = null; p.hackProgress = 0;
      sfx('hurt');
      effects.push({ kind: 'sparkle', x: p.x, y: p.y - p.h / 2, t: 0, dur: 0.5 });
      // Si AMBOS estan K.O. a la vez -> gameover normal.
      if (aliveHeroes().length === 0) {
        G.go('gameover', { retry: 'level' + def.nivel });
      }
    }

    // Reaparicion tras K.O.: junto al companiero vivo (o checkpoint), 6 hp, 1.5s invuln.
    function reviveHero(p) {
      var spot = respawnSpot(p);
      p.ko = false;
      p.koTimer = 0;
      p.x = spot.x;
      p.y = spot.y;
      p.vx = 0; p.vy = 0;
      p.onGround = false;
      p.invuln = KO_INVULN;
      p.blink = 0;
      var maxh = heroMaxHp(p);
      setHeroHp(p, Math.min(maxh, KO_RESPAWN_HP));
      sfx('checkpoint');
      effects.push({ kind: 'sparkle', x: p.x, y: p.y - p.h / 2, t: 0, dur: 0.5 });
    }

    // ---- Ataque cuerpo a cuerpo ----
    function handleAttack(p) {
      if (!p.input.pressed('attack')) return;
      if (p.attackTimer > 0) return;

      if (p.heroe === 'falcon') {
        p.attackTimer = 0.35;
        p.swordFx = 0.2;
        p.swordFacing = p.facing;
        p.punchMode = false;
        sfx('sword');
        var reach = 56;
        var ar = meleeRect(p, reach);
        damageEnemiesInRect(ar, 1, false);
      } else {
        // Director: punietazo 2 danios, rompe cajas B.
        p.attackTimer = 0.5;
        p.swordFx = 0.2;
        p.swordFacing = p.facing;
        p.punchMode = true;
        sfx('punch');
        var reachD = 48;
        var pr = meleeRect(p, reachD);
        damageEnemiesInRect(pr, 2, false);
        breakBoxesInRect(pr);
      }
    }

    function meleeRect(p, reach) {
      var cy = p.y - p.h * 0.55;
      var x = (p.facing > 0) ? p.x : p.x - reach;
      return { x: x, y: cy - 22, w: reach, h: 44 };
    }

    function damageEnemiesInRect(rect, dmg, ally) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive) continue;
        if (e.type === 'turret' && e.hacked) continue; // aliada no recibe golpes del jugador
        var er = enemyRect(e);
        if (rectsOverlap(rect, er)) {
          hitEnemy(e, dmg);
        }
      }
    }

    function hitEnemy(e, dmg) {
      e.hp -= dmg;
      e.hurtFlash = 0.15;
      sfx('hit');
      if (e.hp <= 0) killEnemy(e);
    }

    function enemyRect(e) {
      if (e.type === 'guard') {
        return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
      }
      if (e.type === 'turret') {
        return { x: e.x - e.w / 2, y: e.feetY - e.h, w: e.w, h: e.h };
      }
      // drone: centro
      return { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h };
    }

    function breakBoxesInRect(rect) {
      // Rompe cajas B tocadas por el punietazo del Director.
      var c0 = Math.floor(rect.x / TILE);
      var c1 = Math.floor((rect.x + rect.w) / TILE);
      var r0 = Math.floor(rect.y / TILE);
      var r1 = Math.floor((rect.y + rect.h) / TILE);
      for (var row = r0; row <= r1; row++) {
        for (var col = c0; col <= c1; col++) {
          if (tileAt(rows, col, row) === 'B' && !brokenBoxes[col + ',' + row]) {
            brokenBoxes[col + ',' + row] = true;
            var cc = centerOfTile(col, row);
            effects.push({ kind: 'explosion', x: cc.x, y: cc.y, t: 0, dur: 0.35, r: 24 });
            sfx('explosion');
          }
        }
      }
    }

    // ---- Disparo ----
    function handleShoot(p) {
      if (!p.input.pressed('shoot')) return;
      if (p.shootTimer > 0) return;

      if (p.heroe === 'falcon') {
        // Max 3 flechas vivas (por jugador).
        var own = 0;
        for (var q = 0; q < arrows.length; q++) { if (arrows[q].owner === p) own++; }
        if (own >= 3) return;
        p.shootTimer = 0.28;
        sfx('arrow');
        var ax = p.x + p.facing * 20;
        var ay = p.y - p.h * 0.55;
        arrows.push({ x: ax, y: ay, vx: p.facing * 540, vy: -40, life: 2.2, owner: p });
      } else {
        // Director: pulso electrico, alcance 240px horizontal, cadencia 0.7s.
        p.shootTimer = 0.7;
        sfx('zap');
        var px = p.x;
        var py = p.y - p.h * 0.55;
        var dir = p.facing;
        // efecto visual
        effects.push({ kind: 'zap', x: px + dir * 30, y: py, facing: dir, t: 0, dur: 0.25 });
        // rect de alcance
        var zr = { x: (dir > 0 ? px : px - 240), y: py - 18, w: 240, h: 36 };
        damageEnemiesInRect(zr, 1, false);
      }
    }

    // ---- Hackeo (mantener H 1.2s cerca de consola/torreta) ----
    // Cualquiera de los dos jugadores puede hackear consolas/torretas.
    function handleHack(p, dt) {
      var held = p.input.held('hack');

      // Buscar objetivo mas cercano dentro de rango.
      var target = null, targetD = HACK_RANGE + 1;
      // consolas
      for (var i = 0; i < consoles.length; i++) {
        var c = consoles[i];
        if (c.activated) continue;
        var d = dist(p.x, p.y - p.h / 2, c.cx, c.cy);
        if (d < targetD) { targetD = d; target = { kind: 'console', ref: c }; }
      }
      // torretas hackeables (no ya hackeadas)
      for (var j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (e.type === 'turret' && e.alive && !e.hacked) {
          var de = dist(p.x, p.y - p.h / 2, e.x, e.y);
          if (de < targetD) { targetD = de; target = { kind: 'turret', ref: e }; }
        }
      }

      if (!target || !held) {
        // Reset del progreso si soltamos o no hay objetivo.
        if (p.hackTarget) {
          if (p.hackTarget.kind === 'console') p.hackTarget.ref.progress = 0;
          else p.hackTarget.ref.hackProgress = 0;
        }
        p.hackTarget = null;
        p.hackProgress = 0;
        return;
      }

      // Cambio de objetivo reinicia progreso.
      if (!p.hackTarget || p.hackTarget.ref !== target.ref) {
        if (p.hackTarget) {
          if (p.hackTarget.kind === 'console') p.hackTarget.ref.progress = 0;
          else p.hackTarget.ref.hackProgress = 0;
        }
        p.hackTarget = target;
        p.hackProgress = 0;
        sfx('hack');
      }

      // Avanza el progreso.
      p.hackProgress += dt;
      if (target.kind === 'console') target.ref.progress = p.hackProgress / HACK_TIME;
      else target.ref.hackProgress = p.hackProgress / HACK_TIME;

      if (p.hackProgress >= HACK_TIME) {
        completeHack(target);
        p.hackTarget = null;
        p.hackProgress = 0;
      }
    }

    function completeHack(target) {
      sfx('hackOk');
      if (target.kind === 'console') {
        var c = target.ref;
        c.activated = true;
        c.progress = 1;
        // Abre la puerta asociada.
        if (c.doorIndex >= 0 && c.doorIndex < doors.length) {
          if (!doors[c.doorIndex].open) {
            doors[c.doorIndex].open = true;
            sfx('door');
            var d = doors[c.doorIndex];
            effects.push({ kind: 'sparkle', x: d.cx, y: d.cy, t: 0, dur: 0.6 });
          }
        }
      } else {
        var e = target.ref;
        e.hacked = true;
        e.hackProgress = 1;
        e.shootTimer = 0.8;
        effects.push({ kind: 'sparkle', x: e.x, y: e.y, t: 0, dur: 0.6 });
      }
    }

    // ---- Enemigos ----
    function updateEnemies(dt) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive) continue;
        if (e.hurtFlash > 0) e.hurtFlash -= dt;
        if (e.type === 'guard') updateGuard(e, dt);
        else if (e.type === 'drone') updateDrone(e, dt);
        else if (e.type === 'turret') updateTurret(e, dt);
      }
      // Compactar muertos ocasionalmente (no obligatorio, pero mantiene arrays sanos)
      // (los dejamos y filtramos por .alive al iterar/dibujar)

      // Contacto enemigo-jugador (danio 1): comprueba cada heroe vivo.
      var hs = aliveHeroes();
      for (var k = 0; k < enemies.length; k++) {
        var en = enemies[k];
        if (!en.alive) continue;
        if (en.type === 'turret' && en.hacked) continue;
        var er = enemyRect(en);
        for (var h = 0; h < hs.length; h++) {
          if (rectsOverlap(playerRect(hs[h]), er)) {
            hurtPlayer(hs[h], en.x);
          }
        }
      }
    }

    function updateGuard(e, dt) {
      // Gravedad + suelo
      e.vy += GRAV * dt;
      // Persigue al jugador VIVO mas cercano.
      var tp = nearestHero(e.x, e.y - e.h / 2);
      var seeDist = dist(e.x, e.y - e.h / 2, tp.x, tp.y - tp.h / 2);
      var facingToPlayer = (tp.x < e.x) ? -1 : 1;

      if (e.state === 'patrol') {
        e.patrolTimer -= dt;
        if (e.patrolTimer <= 0) {
          e.patrolTimer = 1.4 + rnd();
        }
        // Patrulla CERCA DE CASA (max ~3 tiles de su punto de aparicion):
        // sin esto, los guardias derivan por todo el nivel y acampan el spawn.
        if (e.homeX === undefined) e.homeX = e.x;
        if (e.x < e.homeX - 150) e.patrolDir = 1;
        else if (e.x > e.homeX + 150) e.patrolDir = -1;
        // Patrulla; gira si hay pared o borde.
        e.vx = e.patrolDir * 70;
        e.facing = e.patrolDir;
        // Deteccion
        if (seeDist < 260 && Math.abs(tp.y - e.y) < 90) {
          e.state = 'telegraph';
          e.telegraph = 0.5;
          e.facing = facingToPlayer;
          e.patrolDir = facingToPlayer;
          e.vx = 0;
        }
      } else if (e.state === 'telegraph') {
        e.vx = 0;
        e.telegraph -= dt;
        e.pose = 'idle';
        if (e.telegraph <= 0) {
          e.state = 'charge';
          e.chargeTime = 0.9;
        }
      } else if (e.state === 'charge') {
        e.vx = e.facing * 190;
        e.chargeTime -= dt;
        if (e.chargeTime <= 0) {
          e.state = 'patrol';
          e.patrolTimer = 0.8;
          e.patrolDir = e.facing;
        }
      }

      // Mover con colision. Guardamos vx antes por si topa pared (para girar).
      var prevVX = e.vx;
      collideWorld(e);
      // Si topo pared (vx anulado) o borde delante -> girar en patrulla/charge.
      var hitWall = (e.vx === 0 && prevVX !== 0);
      var edge = atEdge(e);
      if (e.state === 'patrol' || e.state === 'charge') {
        if (hitWall || edge) {
          e.patrolDir = -Math.sign(prevVX) || (-e.patrolDir);
          e.facing = e.patrolDir;
          if (e.state === 'charge') {
            e.chargeTime = Math.min(e.chargeTime, 0.15);
          }
        }
      }

      // pose
      if (e.state === 'charge') e.pose = 'charge';
      else if (Math.abs(e.vx) > 5) e.pose = 'walk';
      else e.pose = 'idle';
    }

    // Comprueba si el enemigo esta al borde de una plataforma (no hay suelo delante).
    function atEdge(e) {
      if (!e.onGround) return false;
      var aheadX = e.x + Math.sign(e.vx || e.facing) * (e.w / 2 + 6);
      var footRow = Math.floor((e.y + 4) / TILE);
      var col = Math.floor(aheadX / TILE);
      var below = tileAt(rows, col, footRow);
      return !(isSolidTile(below) || isOneWayTile(below));
    }

    function updateDrone(e, dt) {
      e.phase += dt * 2.2;
      e.x += e.driftX * dt;
      // Rebote suave en limites del mapa
      if (e.x < 40) { e.x = 40; e.driftX = Math.abs(e.driftX); }
      if (e.x > mapW - 40) { e.x = mapW - 40; e.driftX = -Math.abs(e.driftX); }
      e.y = e.baseY + Math.sin(e.phase) * 26;

      // Disparo lento hacia el jugador VIVO mas cercano si esta a tiro.
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 2.5;
        var tp = nearestHero(e.x, e.y);
        var d = dist(e.x, e.y, tp.x, tp.y - tp.h / 2);
        if (d < 420) {
          var ang = Math.atan2((tp.y - tp.h / 2) - e.y, tp.x - e.x);
          enemyShots.push({
            x: e.x, y: e.y,
            vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200,
            life: 3, color: '#f87171'
          });
          sfx('laser');
        }
      }
    }

    function updateTurret(e, dt) {
      e.shootTimer -= dt;
      if (e.hacked) {
        // Aliada verde: dispara al enemigo mas cercano.
        e.angle = Math.PI; // por defecto
        var tgt = null, td = Infinity;
        for (var i = 0; i < enemies.length; i++) {
          var o = enemies[i];
          if (!o.alive || o === e) continue;
          if (o.type === 'turret' && o.hacked) continue;
          var dd = dist(e.x, e.y, o.x, (o.type === 'guard' ? o.y - o.h / 2 : o.y));
          if (dd < td && dd < 480) { td = dd; tgt = o; }
        }
        if (tgt && e.shootTimer <= 0) {
          e.shootTimer = 1.6;
          var oy = (tgt.type === 'guard') ? tgt.y - tgt.h / 2 : tgt.y;
          var ang = Math.atan2(oy - e.y, tgt.x - e.x);
          e.angle = ang;
          allyShots.push({
            x: e.x, y: e.y,
            vx: Math.cos(ang) * 380, vy: Math.sin(ang) * 380,
            life: 2, color: '#4ade80'
          });
          sfx('laser');
        } else if (tgt) {
          var oy2 = (tgt.type === 'guard') ? tgt.y - tgt.h / 2 : tgt.y;
          e.angle = Math.atan2(oy2 - e.y, tgt.x - e.x);
        }
      } else {
        // Hostil: dispara al jugador VIVO mas cercano cada 2s si esta en rango.
        var tp = nearestHero(e.x, e.y);
        var pd = dist(e.x, e.y, tp.x, tp.y - tp.h / 2);
        e.angle = Math.atan2((tp.y - tp.h / 2) - e.y, tp.x - e.x);
        if (e.shootTimer <= 0) {
          e.shootTimer = 2.0;
          if (pd < 460) {
            enemyShots.push({
              x: e.x, y: e.y,
              vx: Math.cos(e.angle) * 240, vy: Math.sin(e.angle) * 240,
              life: 3, color: '#f87171'
            });
            sfx('laser');
          }
        }
      }
    }

    // ---- Proyectiles ----
    function updateProjectiles(dt) {
      var i;
      // Flechas de Falcon
      for (i = arrows.length - 1; i >= 0; i--) {
        var a = arrows[i];
        a.vy += 300 * dt; // gravedad ligera
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.life -= dt;
        a.angle = Math.atan2(a.vy, a.vx);
        var hit = false;
        // colision con tiles solidos
        if (solidBlocks(tileAt(rows, Math.floor(a.x / TILE), Math.floor(a.y / TILE)), Math.floor(a.x / TILE), Math.floor(a.y / TILE))) {
          hit = true;
        }
        // colision con enemigos
        if (!hit) {
          var ar = { x: a.x - 4, y: a.y - 4, w: 8, h: 8 };
          for (var k = 0; k < enemies.length; k++) {
            var e = enemies[k];
            if (!e.alive) continue;
            if (e.type === 'turret' && e.hacked) continue;
            if (rectsOverlap(ar, enemyRect(e))) {
              hitEnemy(e, 1);
              hit = true;
              break;
            }
          }
        }
        if (hit || a.life <= 0 || a.x < -20 || a.x > mapW + 20 || a.y > mapH + 40) {
          arrows.splice(i, 1);
        }
      }

      // Laseres enemigos (danian al jugador)
      for (i = enemyShots.length - 1; i >= 0; i--) {
        var s = enemyShots[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        var remove = false;
        if (solidBlocks(tileAt(rows, Math.floor(s.x / TILE), Math.floor(s.y / TILE)), Math.floor(s.x / TILE), Math.floor(s.y / TILE))) remove = true;
        if (!remove) {
          var sr = { x: s.x - 5, y: s.y - 5, w: 10, h: 10 };
          var hsL = aliveHeroes();
          for (var hi = 0; hi < hsL.length; hi++) {
            if (rectsOverlap(sr, playerRect(hsL[hi]))) {
              hurtPlayer(hsL[hi], s.x);
              remove = true;
              break;
            }
          }
        }
        if (remove || s.life <= 0 || s.x < -30 || s.x > mapW + 30) enemyShots.splice(i, 1);
      }

      // Disparos aliados (torretas hackeadas -> danian enemigos)
      for (i = allyShots.length - 1; i >= 0; i--) {
        var as = allyShots[i];
        as.x += as.vx * dt;
        as.y += as.vy * dt;
        as.life -= dt;
        var rem = false;
        if (solidBlocks(tileAt(rows, Math.floor(as.x / TILE), Math.floor(as.y / TILE)), Math.floor(as.x / TILE), Math.floor(as.y / TILE))) rem = true;
        if (!rem) {
          var asr = { x: as.x - 5, y: as.y - 5, w: 10, h: 10 };
          for (var m = 0; m < enemies.length; m++) {
            var en = enemies[m];
            if (!en.alive) continue;
            if (en.type === 'turret' && en.hacked) continue;
            if (rectsOverlap(asr, enemyRect(en))) {
              hitEnemy(en, 1);
              rem = true;
              break;
            }
          }
        }
        if (rem || as.life <= 0 || as.x < -30 || as.x > mapW + 30) allyShots.splice(i, 1);
      }
    }

    // ---- Pickups (corazones) ----
    function updatePickups(dt) {
      for (var i = pickups.length - 1; i >= 0; i--) {
        var pk = pickups[i];
        pk.t += dt;
        if (!pk.grounded) {
          pk.vy += GRAV * dt;
          pk.y += pk.vy * dt;
          // aterrizar sobre suelo
          var col = Math.floor(pk.x / TILE);
          var row = Math.floor((pk.y + 12) / TILE);
          var ch = tileAt(rows, col, row);
          if (isSolidTile(ch) || isOneWayTile(ch)) {
            pk.y = row * TILE - 12;
            pk.vy = 0;
            pk.grounded = true;
          }
          if (pk.y > mapH + 40) { pickups.splice(i, 1); continue; }
        }
        // recoger: cura al heroe VIVO que lo toca (el mas cercano si ambos tocan).
        var pr = { x: pk.x - 16, y: pk.y - 16, w: 32, h: 32 };
        var taker = null, takerD = Infinity;
        var hs = aliveHeroes();
        for (var q = 0; q < hs.length; q++) {
          var hh = hs[q];
          if (rectsOverlap(pr, playerRect(hh))) {
            var dd = dist(pk.x, pk.y, hh.x, hh.y - hh.h / 2);
            if (dd < takerD) { takerD = dd; taker = hh; }
          }
        }
        if (taker) {
          if (heroHp(taker) < heroMaxHp(taker)) {
            setHeroHp(taker, Math.min(heroMaxHp(taker), heroHp(taker) + 2));
          }
          sfx('pickup');
          effects.push({ kind: 'sparkle', x: pk.x, y: pk.y, t: 0, dur: 0.4 });
          pickups.splice(i, 1);
        }
      }
    }

    // ---- Efectos ----
    function updateEffects(dt) {
      for (var i = effects.length - 1; i >= 0; i--) {
        var e = effects[i];
        e.t += dt;
        if (e.t >= e.dur) effects.splice(i, 1);
      }
    }

    // ---- Camara suavizada con limites ----
    function updateCamera(dt) {
      // Sigue el punto medio de los jugadores vivos (en 1 jugador = player).
      var focus = cameraFocus();
      var targetX = clampCamX(focus.x - G.W / 2);
      var targetY = clampCamY(focus.y - G.H / 2);
      var k = 1 - Math.pow(0.001, dt); // suavizado dependiente del dt
      camX += (targetX - camX) * clamp(k * 6, 0, 1);
      camY += (targetY - camY) * clamp(k * 6, 0, 1);
      camX = clampCamX(camX);
      camY = clampCamY(camY);
    }

    // ---- Render ----
    scene.render = function (ctx) {
      if (!player) return;

      // Fondo del tema (pinta todo 960x540 con parallax segun camX).
      drawBackground(ctx);

      ctx.save();
      ctx.translate(-Math.round(camX), -Math.round(camY));

      drawTiles(ctx);
      drawDoors(ctx);
      drawConsoles(ctx);
      drawCheckpointsFlags(ctx);
      drawPickups(ctx);
      drawEnemies(ctx);
      drawProjectiles(ctx);
      drawPlayer(player, ctx);
      if (player2) drawPlayer(player2, ctx);
      drawEffects(ctx);
      drawExit(ctx);

      ctx.restore();

      // HUD fijo en pantalla (drawHearts lee G.state.coop para P1/P2).
      if (G.ui && G.ui.drawHearts) G.ui.drawHearts(ctx);

      // Cartel(es) de K.O. "P vuelve en Ns" (co-op).
      if (coop) drawKoBanners(ctx);

      // Hints por proximidad (coordenadas de pantalla).
      drawHints(ctx);
    };

    // Carteles de K.O. en co-op: "P1/P2 vuelve en Ns".
    function drawKoBanners(ctx) {
      var hs = heroes();
      var shown = 0;
      for (var i = 0; i < hs.length; i++) {
        var p = hs[i];
        if (!p.ko) continue;
        var label = (p.hpKey === 'hp2') ? 'P2' : 'P1';
        var secs = Math.max(1, Math.ceil(p.koTimer));
        var txt = label + ' vuelve en ' + secs + 's';
        ctx.save();
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var tw = ctx.measureText(txt).width;
        var bw = tw + 28, bh = 34;
        var bx = G.W / 2, by = 92 + shown * 44;
        ctx.fillStyle = 'rgba(20,24,40,0.78)';
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 10); ctx.fill(); }
        else ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
        ctx.fillStyle = (label === 'P1') ? '#fbbf24' : '#4ade80';
        ctx.fillText(txt, bx, by);
        ctx.restore();
        shown++;
      }
    }

    function drawBackground(ctx) {
      var g = G.gfx;
      if (!g) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, G.W, G.H); return; }
      try {
        if (def.tema === 'canyon' && g.drawBgCanyon) g.drawBgCanyon(ctx, camX, G.T || 0);
        else if (def.tema === 'base' && g.drawBgBase) g.drawBgBase(ctx, camX, G.T || 0);
        else if (def.tema === 'ship' && g.drawBgMothership) g.drawBgMothership(ctx, camX, G.T || 0);
        else { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, G.W, G.H); }
      } catch (e) {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, G.W, G.H);
      }
    }

    function drawTiles(ctx) {
      var g = G.gfx;
      // Solo dibuja tiles visibles en el viewport para eficiencia.
      var c0 = Math.floor(camX / TILE) - 1;
      var c1 = Math.floor((camX + G.W) / TILE) + 1;
      var r0 = Math.floor(camY / TILE) - 1;
      var r1 = Math.floor((camY + G.H) / TILE) + 1;
      for (var row = r0; row <= r1; row++) {
        for (var col = c0; col <= c1; col++) {
          var ch = tileAt(rows, col, row);
          var x = col * TILE, y = row * TILE;
          var tipo = null;
          if (ch === '#') tipo = 'solid';
          else if (ch === '=') tipo = 'platform';
          else if (ch === '^') tipo = 'spike';
          else if (ch === 'B') {
            if (brokenBoxes[col + ',' + row]) continue;
            tipo = 'box';
          }
          if (tipo) {
            if (g && g.drawTile) { try { g.drawTile(ctx, x, y, TILE, tipo, def.tema); continue; } catch (e) {} }
            // fallback simple
            ctx.fillStyle = (tipo === 'spike') ? '#888' : '#5a4a3a';
            ctx.fillRect(x, y, TILE, TILE);
          }
        }
      }
    }

    function drawDoors(ctx) {
      var g = G.gfx;
      for (var i = 0; i < doors.length; i++) {
        var d = doors[i];
        if (d.open) continue;
        var x = d.col * TILE, y = d.row * TILE;
        if (g && g.drawTile) { try { g.drawTile(ctx, x, y, TILE, 'door', def.tema); continue; } catch (e) {} }
        ctx.fillStyle = '#7a2b2b'; ctx.fillRect(x, y, TILE, TILE);
      }
    }

    function drawConsoles(ctx) {
      var g = G.gfx;
      for (var i = 0; i < consoles.length; i++) {
        var c = consoles[i];
        var x = c.col * TILE, y = c.row * TILE;
        if (g && g.drawTile) { try { g.drawTile(ctx, x, y, TILE, 'console', def.tema); } catch (e) {} }
        else { ctx.fillStyle = c.activated ? '#4ade80' : '#22d3ee'; ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 16); }
        // Anillo de progreso si se esta hackeando.
        if (!c.activated && c.progress > 0) drawHackRing(ctx, c.cx, c.cy - 4, c.progress);
      }
    }

    function drawCheckpointsFlags(ctx) {
      var g = G.gfx;
      for (var i = 0; i < checkpoints.length; i++) {
        var k = checkpoints[i];
        var x = k.col * TILE, y = k.row * TILE;
        if (g && g.drawTile) { try { g.drawTile(ctx, x, y, TILE, 'checkpoint', def.tema); continue; } catch (e) {} }
        ctx.fillStyle = k.taken ? '#4ade80' : '#aaa';
        ctx.fillRect(x + TILE / 2 - 3, y, 6, TILE);
      }
    }

    function drawHackRing(ctx, cx, cy, frac) {
      ctx.save();
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(34,211,238,0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1));
      ctx.stroke();
      ctx.restore();
    }

    function drawPickups(ctx) {
      var g = G.gfx;
      for (var i = 0; i < pickups.length; i++) {
        var pk = pickups[i];
        var bob = Math.sin((pk.t || 0) * 4) * 3;
        if (g && g.drawHeart) { try { g.drawHeart(ctx, pk.x, pk.y + bob, 22, 'full'); continue; } catch (e) {} }
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(pk.x, pk.y + bob, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawEnemies(ctx) {
      var g = G.gfx;
      var t = G.T || 0;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive) continue;
        ctx.save();
        if (e.hurtFlash > 0) {
          // flash blanco al recibir golpe
          ctx.globalAlpha = 0.9;
        }
        try {
          if (e.type === 'guard' && g && g.drawToroGuard) {
            g.drawToroGuard(ctx, e.x, e.y, { t: t, facing: e.facing, pose: e.pose });
          } else if (e.type === 'drone' && g && g.drawDrone) {
            g.drawDrone(ctx, e.x, e.y, { t: t });
          } else if (e.type === 'turret' && g && g.drawTurret) {
            g.drawTurret(ctx, e.x, e.feetY - e.h / 2, { t: t, hacked: e.hacked, angle: e.angle });
          } else {
            // fallback
            var er = enemyRect(e);
            ctx.fillStyle = (e.type === 'turret' && e.hacked) ? '#4ade80' : '#c2803f';
            ctx.fillRect(er.x, er.y, er.w, er.h);
          }
        } catch (err) {}
        // flash de golpe (overlay)
        if (e.hurtFlash > 0) {
          var er2 = enemyRect(e);
          ctx.save();
          ctx.globalAlpha = clamp(e.hurtFlash / 0.15, 0, 1) * 0.6;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(er2.x, er2.y, er2.w, er2.h);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    function drawProjectiles(ctx) {
      var g = G.gfx;
      var i;
      for (i = 0; i < arrows.length; i++) {
        var a = arrows[i];
        if (g && g.drawArrowProj) { try { g.drawArrowProj(ctx, a.x, a.y, a.angle || 0); continue; } catch (e) {} }
        ctx.save(); ctx.fillStyle = '#eab308';
        ctx.fillRect(a.x - 6, a.y - 2, 12, 4); ctx.restore();
      }
      for (i = 0; i < enemyShots.length; i++) {
        var s = enemyShots[i];
        if (g && g.drawLaserBolt) { try { g.drawLaserBolt(ctx, s.x, s.y, 12, s.color); continue; } catch (e) {} }
        ctx.save(); ctx.fillStyle = s.color || '#f87171';
        ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (i = 0; i < allyShots.length; i++) {
        var as = allyShots[i];
        if (g && g.drawLaserBolt) { try { g.drawLaserBolt(ctx, as.x, as.y, 12, as.color); continue; } catch (e) {} }
        ctx.save(); ctx.fillStyle = as.color || '#4ade80';
        ctx.beginPath(); ctx.arc(as.x, as.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }

    function drawPlayer(p, ctx) {
      var g = G.gfx;
      // K.O.: el heroe desaparece (el cartel indica su vuelta).
      if (p.ko) return;
      // Parpadeo de invulnerabilidad.
      if (p.invuln > 0 && Math.floor(p.blink * 12) % 2 === 0) return;
      var t = G.T || 0;
      var o = { t: t, facing: p.facing, pose: p.pose };
      try {
        if (p.heroe === 'falcon' && g && g.drawFalcon) g.drawFalcon(ctx, p.x, p.y, o);
        else if (p.heroe === 'director' && g && g.drawDirector) g.drawDirector(ctx, p.x, p.y, o);
        else {
          ctx.fillStyle = (p.heroe === 'falcon') ? '#22c55e' : '#3b82f6';
          ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
        }
      } catch (e) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
      }

      // Anillo de progreso de hackeo del jugador (sobre torreta objetivo).
      if (p.hackTarget && p.hackTarget.kind === 'turret' && p.hackProgress > 0) {
        drawHackRing(ctx, p.hackTarget.ref.x, p.hackTarget.ref.y - 6, p.hackProgress / HACK_TIME);
      }

      // Efecto de espada/punietazo (POR JUGADOR).
      if (p.swordFx > 0) {
        var t01 = 1 - (p.swordFx / 0.2);
        var fx = p.x + p.swordFacing * 30;
        var fy = p.y - p.h * 0.55;
        try {
          if (p.punchMode && g && g.drawPunch) g.drawPunch(ctx, fx, fy, p.swordFacing, t01);
          else if (!p.punchMode && g && g.drawSlash) g.drawSlash(ctx, fx, fy, p.swordFacing, t01);
        } catch (e) {}
      }
    }

    function drawEffects(ctx) {
      var g = G.gfx;
      for (var i = 0; i < effects.length; i++) {
        var e = effects[i];
        var t01 = clamp(e.t / e.dur, 0, 1);
        try {
          if (e.kind === 'explosion' && g && g.drawExplosion) g.drawExplosion(ctx, e.x, e.y, t01, e.r || 24);
          else if (e.kind === 'sparkle' && g && g.drawSparkle) g.drawSparkle(ctx, e.x, e.y, t01);
          else if (e.kind === 'zap' && g && g.drawZap) g.drawZap(ctx, e.x, e.y, e.facing || 1, t01);
        } catch (err) {}
      }
    }

    function drawExit(ctx) {
      var g = G.gfx;
      if (!exitRect) return;
      var x = Math.floor(exitRect.cx / TILE) * TILE;
      var y = Math.floor(exitRect.cy / TILE) * TILE;
      if (g && g.drawTile) { try { g.drawTile(ctx, x, y, TILE, 'exit', def.tema); return; } catch (e) {} }
      ctx.save();
      ctx.fillStyle = 'rgba(140,220,255,0.7)';
      ctx.fillRect(x + 6, y + 2, TILE - 12, TILE - 4);
      ctx.restore();
    }

    // Distancia horizontal minima de cualquier heroe vivo a x (co-op: el mas cercano).
    function minHeroDX(x) {
      var hs = aliveHeroes();
      if (hs.length === 0) hs = [player];
      var m = Infinity;
      for (var i = 0; i < hs.length; i++) { var d = Math.abs(hs[i].x - x); if (d < m) m = d; }
      return m;
    }
    // Algun heroe vivo a menos de tol en Y de y.
    function anyHeroNearY(y, tol) {
      var hs = aliveHeroes();
      if (hs.length === 0) hs = [player];
      for (var i = 0; i < hs.length; i++) { if (Math.abs(hs[i].y - y) < tol) return true; }
      return false;
    }

    // ---- Hints por proximidad ----
    function drawHints(ctx) {
      if (!def.hints || !G.ui || !G.ui.hint) return;
      // Hint mas cercano a CUALQUIER jugador dentro de HINT_RANGE.
      var best = null, bestD = HINT_RANGE + 1;
      for (var i = 0; i < def.hints.length; i++) {
        var hn = def.hints[i];
        var hx = hn.x * TILE + TILE / 2;
        var d = minHeroDX(hx);
        if (d < bestD) { bestD = d; best = hn; }
      }
      // Hint dinamico: cerca de una puerta cerrada, sugerir buscar la consola.
      var doorHint = nearClosedDoorHint();
      if (doorHint) { try { G.ui.hint(ctx, doorHint); } catch (e) {} return; }

      if (best) { try { G.ui.hint(ctx, best.texto); } catch (e) {} }
    }

    function nearClosedDoorHint() {
      for (var i = 0; i < doors.length; i++) {
        var d = doors[i];
        if (d.open) continue;
        // Cualquier jugador cerca de la puerta cerrada.
        if (minHeroDX(d.cx) < HINT_RANGE && anyHeroNearY(d.cy, 160)) {
          // Direccion aproximada de su consola asociada.
          var c = consoleForDoor(i);
          if (c) {
            var dir = (c.cx < d.cx) ? 'a la izquierda' : (c.cx > d.cx ? 'a la derecha' : 'cerca');
            return 'Busca la consola ' + dir + ' y hackeala (manten H)';
          }
          return 'Puerta cerrada: busca una consola y hackeala (manten H)';
        }
      }
      return null;
    }

    function consoleForDoor(doorIndex) {
      for (var i = 0; i < consoles.length; i++) {
        if (consoles[i].doorIndex === doorIndex) return consoles[i];
      }
      return null;
    }

    return scene;
  };

})();
