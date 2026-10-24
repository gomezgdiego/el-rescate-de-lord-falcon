// boss.js — El Rescate de Lord Falcon
// Capitulo 5: batalla final contra Dark Toros en la sala del trono.
// Registra G.scenes.level5. Depende del contrato congelado de core/audio/gfx/ui.
// Todo el input pasa por G.input; todos los temporizadores son contadores en
// segundos dentro de update(dt). Ningun addEventListener ni rAF/setTimeout propio.

window.G = window.G || {};

(function () {
  'use strict';

  // ---- Constantes de la arena (coordenadas de MUNDO = coordenadas de pantalla,
  // no hay scroll de camara en el jefe: la sala cabe en 960x540). ----
  var W = 960, H = 540;
  var GROUND_Y = 470;            // y del suelo (pies del jugador)
  var GRAV = 1800;               // px/s^2
  var JUMP_V = -640;             // px/s
  var RUN_SPEED = 260;           // px/s (Director, sin doble salto)

  // Plataformas laterales (rects de mundo, superficie superior donde se aterriza).
  var PLATS = [
    { x: 70, y: 360, w: 160, h: 18 },
    { x: W - 70 - 160, y: 360, w: 160, h: 18 }
  ];

  // Celda de energia con Lord Falcon (al fondo, arriba-centro).
  var CELL_X = W / 2, CELL_Y = 150;
  var CONSOLE_X = W / 2 + 110, CONSOLE_Y = 210; // consola junto a la celda

  // Limites horizontales de movimiento del jugador (paredes de la sala).
  var ARENA_L = 40, ARENA_R = W - 40;

  // ---- Helper local: clamp seguro (aunque G.clamp exista, lo dejamos local). ----
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // Helper local: rects overlap (por si acaso; preferimos G.rectsOverlap si existe).
  function overlap(a, b) {
    if (G.rectsOverlap) return G.rectsOverlap(a, b);
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function sfx(n) { if (G.audio && G.audio.sfx) G.audio.sfx(n); }
  function music(n) { if (G.audio && G.audio.music) G.audio.music(n); }

  // ---- Co-op helpers (contrato v1.1). En 1 jugador todo queda como hoy. ----
  function isCoop() { return !!(G.state && G.state.coop); }
  // Segundo input (P2). Interfaz identica held/pressed; si no existe, todo false.
  var NULL_INPUT = { held: function () { return false; }, pressed: function () { return false; } };
  function inp2() { return (isCoop() && G.input2) ? G.input2 : NULL_INPUT; }

  // Dibujo seguro: si una funcion de gfx no existe, no rompe.
  function gfx(name, args) {
    if (G.gfx && typeof G.gfx[name] === 'function') {
      try { G.gfx[name].apply(G.gfx, args); } catch (e) { /* nunca romper el render */ }
    }
  }

  // Secuencia de direcciones para el QTE: usamos inputs del contrato.
  var DIRS = ['left', 'right', 'up', 'down'];
  var DIR_LABEL = { left: 'IZQUIERDA', right: 'DERECHA', up: 'ARRIBA', down: 'ABAJO' };

  // ============================================================
  //  ESCENA level5
  // ============================================================
  var scene = {};

  // --- Estado (se reinicia ENTERO en enter()) ---
  var p;            // jugador (Director)
  var boss;         // Dark Toros
  var orbs;         // proyectiles de gema
  var shockwaves;   // ondas expansivas del martillazo
  var particles;    // pop / destellos / clink
  var falconArrows; // flechas de Falcon liberado
  var qte;          // estado del minijuego de hackeo del martillo
  var falconFreed;  // bool: Lord Falcon liberado
  var consoleHackT; // progreso de hackeo de la consola de la celda (segundos)
  var consoleActive;// la consola brilla y se puede hackear (jefe <=6 hp)
  var falconShotT;  // temporizador de disparo de Falcon liberado
  var winTimer;     // temporizador de la cinematica de victoria (-1 = no activa)
  var loseGuard;    // evita disparar gameover dos veces
  var camShake;     // sacudida de camara (segundos restantes)
  var msgTimer;     // mensaje flotante temporal {text, t}
  var enterFlash;   // pequeño fundido de entrada

  // --- Co-op: segundo jugador (Lord Falcon controlado por P2) ---
  var p2;           // jugador 2 (Falcon). Solo se usa/dibuja en co-op.
  var p2Ctrl;       // bool: P2 controla a Falcon (tras hackear la consola).
  var p1KO;         // temporizador de reaparicion de P1 (>0 = K.O.), -1 = vivo
  var p2KO;         // temporizador de reaparicion de P2 (>0 = K.O.), -1 = vivo
  var qteWho;       // quien inicio el QTE: 1 = P1, 2 = P2 (para direcciones/congelar)

  function resetPlayer() {
    p = {
      x: 220, y: GROUND_Y, vx: 0, vy: 0,
      w: 34, h: 58,
      facing: 1,
      onGround: true,
      coyote: 0, jumpBuf: 0,
      pose: 'idle',
      attackT: 0,      // animacion/cadencia punietazo
      punchCd: 0,      // cadencia punietazo 0.5s
      pulseT: 0,       // animacion pulso
      pulseCd: 0,      // cadencia pulso 0.7s
      inv: 0,          // invulnerabilidad 1.2s parpadeante
      hurtT: 0,        // animacion hurt
      hackHold: 0      // tiempo manteniendo H en la consola de la celda
    };
  }

  // P2 = Lord Falcon. Empieza DENTRO de la celda (esperando) hasta que se hackea.
  function resetP2() {
    p2 = {
      x: CELL_X, y: CELL_Y + 40,   // referencia mientras espera en la celda
      vx: 0, vy: 0,
      w: 32, h: 56,
      facing: -1,
      onGround: true,
      coyote: 0, jumpBuf: 0,
      pose: 'idle',
      attackT: 0, punchCd: 0,      // espada (attack)
      shootCd: 0, shootT: 0,       // flecha (shoot), cooldown 3s
      inv: 0, hurtT: 0
    };
  }

  function resetBoss() {
    boss = {
      x: W - 300, y: GROUND_Y,
      w: 110, h: 150,
      hp: 12, maxHp: 12,
      facing: -1,
      phase: 1,
      pose: 'idle',
      shield: true,       // Escudo de Poder activo (invulnerable)
      shieldOffT: 0,      // segundos restantes de escudo OFF
      stunT: 0,           // aturdido tras QTE exitoso (o flecha de Falcon)
      state: 'think',     // maquina de estados
      stateT: 0,          // tiempo en el estado actual
      thinkT: 1.2,        // pausa antes del proximo ataque
      // Martillazo
      slamPhase: 0,       // 0 nada, 1 subiendo/salto, 2 impacto, 3 martillo clavado
      hammerStuck: false,
      hammerStuckT: 0,    // segundos restantes del martillo clavado
      hammerX: 0, hammerY: 0,
      hasHammer: true,
      // Embestida
      chargeDir: -1,
      // Telegrafia
      telegraphT: 0,      // muestra "!" mientras >0
      recoverT: 0,        // recuperacion tras recuperar el martillo (pose roar)
      attackCount: 0      // para variar patrones
    };
  }

  function resetQTE() {
    qte = {
      active: false,
      seq: [],
      idx: 0,       // cuantas acertadas
      t: 0,         // tiempo restante (4s)
      fails: 0,     // fallos reales
      freeFailUsed: false, // primer fallo "gratis" (nota de diseño)
      shakeT: 0,    // temblor rojo al fallar
      flashT: 0     // destello verde al acertar
    };
  }

  scene.enter = function () {
    // Vida llena al empezar el nivel (regla del contrato).
    G.state.hp = G.state.maxHp;
    // Co-op: rellenar tambien la vida de P2 (5 corazones).
    if (isCoop()) {
      if (typeof G.state.maxHp2 !== 'number') G.state.maxHp2 = 10;
      G.state.hp2 = G.state.maxHp2;
    }

    resetPlayer();
    resetP2();
    resetBoss();
    resetQTE();

    p2Ctrl = false;
    p1KO = -1;
    p2KO = -1;
    qteWho = 1;

    orbs = [];
    shockwaves = [];
    particles = [];
    falconArrows = [];
    falconFreed = false;
    consoleHackT = 0;
    consoleActive = false;
    falconShotT = 0;
    winTimer = -1;
    loseGuard = false;
    camShake = 0;
    msgTimer = null;
    enterFlash = 0.7;

    music('boss');
  };

  scene.exit = function () {
    // Limpieza defensiva de todo el estado mutable/temporizadores.
    orbs = [];
    shockwaves = [];
    particles = [];
    falconArrows = [];
    resetQTE();
    winTimer = -1;
    camShake = 0;
    msgTimer = null;
    p2Ctrl = false;
    p1KO = -1;
    p2KO = -1;
  };

  // ---------- utilidades de estado ----------
  function showMsg(text, t) { msgTimer = { text: text, t: t || 2.2 }; }

  function addParticles(x, y, color, n, spd, kind) {
    n = n || 8;
    for (var i = 0; i < n; i++) {
      var a = G.rand ? G.rand(0, Math.PI * 2) : Math.random() * 6.28;
      var s = (spd || 140) * (0.4 + Math.random() * 0.8);
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0.5 + Math.random() * 0.35, t: 0,
        color: color || '#ffd166', r: 3 + Math.random() * 3,
        kind: kind || 'dot'
      });
    }
  }

  function playerRect() { return { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h }; }
  function p2Rect() { return { x: p2.x - p2.w / 2, y: p2.y - p2.h, w: p2.w, h: p2.h }; }
  function bossRect() { return { x: boss.x - boss.w / 2, y: boss.y - boss.h, w: boss.w, h: boss.h }; }

  // ¿P2 esta vivo y jugable? (co-op, controla a Falcon, no K.O.)
  function p2Alive() { return isCoop() && p2Ctrl && p2KO < 0; }
  function p1Alive() { return p1KO < 0; }

  // Jugador VIVO mas cercano a un punto (para que los enemigos apunten/persigan).
  // En 1 jugador (o P2 no jugable) siempre devuelve P1.
  function targetPlayer(fromX) {
    if (!p2Alive()) return p;
    if (!p1Alive()) return p2;
    fromX = (typeof fromX === 'number') ? fromX : boss.x;
    return Math.abs(p.x - fromX) <= Math.abs(p2.x - fromX) ? p : p2;
  }

  // Daño a P1 (Director). amount en MEDIOS corazones. Toros fisico = 2, orbe = 1.
  function damagePlayer(amount, fromX) {
    if (p.inv > 0 || winTimer >= 0 || p1KO >= 0) return;
    G.state.hp = Math.max(0, G.state.hp - amount);
    p.inv = 1.2;            // invulnerabilidad 1.2s (aplica a CUALQUIER golpe de Toros)
    p.hurtT = 0.35;
    p.pose = 'hurt';
    // knockback suave
    var dir = (fromX !== undefined) ? (p.x < fromX ? -1 : 1) : -p.facing;
    p.vx = dir * 220;
    p.vy = -260;
    p.onGround = false;
    sfx('hurt');
    camShake = Math.max(camShake, 0.25);
    if (G.state.hp <= 0) onPlayerZero(1);
  }

  // Daño a P2 (Falcon controlado). Solo en co-op y cuando P2 controla a Falcon.
  function damageP2(amount, fromX) {
    if (!p2Ctrl || p2.inv > 0 || winTimer >= 0 || p2KO >= 0) return;
    G.state.hp2 = Math.max(0, G.state.hp2 - amount);
    p2.inv = 1.2;
    p2.hurtT = 0.35;
    p2.pose = 'hurt';
    var dir = (fromX !== undefined) ? (p2.x < fromX ? -1 : 1) : -p2.facing;
    p2.vx = dir * 220;
    p2.vy = -260;
    p2.onGround = false;
    sfx('hurt');
    camShake = Math.max(camShake, 0.25);
    if (G.state.hp2 <= 0) onPlayerZero(2);
  }

  // Un jugador llega a 0 hp. En 1 jugador -> gameover. En co-op -> K.O. amable.
  function onPlayerZero(who) {
    if (!isCoop()) {
      if (!loseGuard) { loseGuard = true; G.go('gameover', { retry: 'level5' }); }
      return;
    }
    var p1down = (G.state.hp <= 0);
    var p2down = (!p2Ctrl) ? false : (G.state.hp2 <= 0);
    // Ambos a 0 a la vez -> gameover normal.
    if (p1down && p2down) {
      if (!loseGuard) { loseGuard = true; G.go('gameover', { retry: 'level5' }); }
      return;
    }
    // Solo uno cae -> K.O. con reaparicion.
    if (who === 1) {
      p1KO = 4.0;            // P1 reaparece a los 4s junto a P2
      sfx('hurt');
      addParticles(p.x, p.y - 30, '#8ecbff', 12, 120, 'star');
      showMsg('P1 vuelve en 4s', 3.6);
    } else {
      p2KO = 6.0;            // P2 vuelve a la celda 6s
      sfx('hurt');
      addParticles(p2.x, p2.y - 30, '#22c55e', 12, 120, 'star');
      showMsg('P2 vuelve en 6s', 5.6);
    }
    // Si el K.O. estaba en medio de un QTE que el habia iniciado, cancelarlo.
    if (qte.active && qteWho === who) { qte.active = false; recoverHammer(false); }
  }

  // Reaparicion junto al companiero vivo (si esta en suelo) o en la celda.
  function respawnP1() {
    p1KO = -1;
    G.state.hp = Math.min(G.state.maxHp, 6); // 3 corazones
    // junto a P2 si esta vivo y controlando; si no, en el suelo central.
    if (p2Ctrl && p2KO < 0) { p.x = clamp(p2.x + (p2.facing > 0 ? -40 : 40), ARENA_L + 20, ARENA_R - 20); p.y = p2.onGround ? p2.y : GROUND_Y; }
    else { p.x = 220; p.y = GROUND_Y; }
    p.vx = 0; p.vy = 0; p.onGround = true;
    p.inv = 1.5; p.hurtT = 0; p.pose = 'idle';
    addParticles(p.x, p.y - 30, '#8ecbff', 14, 150, 'star');
    sfx('door');
  }

  function respawnP2() {
    p2KO = -1;
    G.state.hp2 = Math.min(G.state.maxHp2, 6); // 3 corazones
    // P2 reaparece controlando a Falcon junto a P1 vivo, o en el centro.
    if (p1KO < 0) { p2.x = clamp(p.x + (p.facing > 0 ? -40 : 40), ARENA_L + 20, ARENA_R - 20); p2.y = p.onGround ? p.y : GROUND_Y; }
    else { p2.x = W / 2 + 60; p2.y = GROUND_Y; }
    p2.vx = 0; p2.vy = 0; p2.onGround = true;
    p2.inv = 1.5; p2.hurtT = 0; p2.pose = 'idle';
    addParticles(p2.x, p2.y - 30, '#22c55e', 14, 150, 'star');
    sfx('door');
  }

  // Daño real al jefe (SOLO cuando shield OFF). Contra el escudo -> clink 0 daño.
  function hitBoss(amount, hitX, hitY) {
    if (winTimer >= 0) return;
    if (boss.shield) {
      // Invencible: 0 daño, "clink" con destello distinto (color/forma).
      sfx('clink');
      // Particulas de escudo: chispas cian/blancas en forma de destello.
      addParticles(hitX, hitY, '#bff7ff', 6, 120, 'clink');
      addParticles(hitX, hitY, '#ffffff', 4, 90, 'clink');
      return;
    }
    boss.hp = Math.max(0, boss.hp - amount);
    sfx('hit');
    // Flash + shake de impacto en el jefe (feedback de contacto exitoso).
    boss.pose = 'hurt';
    boss.hurtFlash = 0.18;
    camShake = Math.max(camShake, 0.18);
    addParticles(hitX, hitY, '#ffd166', 8, 160, 'dot');

    // Fase por umbrales.
    updatePhase();

    // Libera a Lord Falcon al llegar a 6 hp.
    if (boss.hp <= 6 && !consoleActive && !falconFreed) {
      consoleActive = true;
      showMsg('¡La consola brilla! Libera a Lord Falcon', 3.0);
    }

    if (boss.hp <= 0) startVictory();
  }

  function updatePhase() {
    var np = boss.hp > 8 ? 1 : (boss.hp > 4 ? 2 : 3);
    if (np !== boss.phase) {
      boss.phase = np;
      if (np === 2) showMsg('¡Dark Toros se enfurece! (Fase 2)', 2.2);
      if (np === 3) showMsg('¡FASE FINAL! Dark Toros al maximo', 2.4);
      sfx('roar');
    }
  }

  function startVictory() {
    winTimer = 0;
    boss.pose = 'defeated';
    boss.shield = false;
    boss.state = 'defeated';
    qte.active = false;
    orbs = [];
    shockwaves = [];
    boss.hammerStuck = false;
    sfx('roar');
    showMsg('', 0);
    music(null);
  }

  // ============================================================
  //  UPDATE
  // ============================================================
  scene.update = function (dt) {
    if (enterFlash > 0) enterFlash = Math.max(0, enterFlash - dt);
    if (camShake > 0) camShake = Math.max(0, camShake - dt);
    if (msgTimer) { msgTimer.t -= dt; if (msgTimer.t <= 0) msgTimer = null; }

    // --- Cinematica de victoria ---
    if (winTimer >= 0) {
      winTimer += dt;
      // Sparkles alrededor del jefe y la gema apagandose.
      if (winTimer < 3.0 && Math.random() < 0.5) {
        addParticles(boss.x + G.rand(-40, 40), boss.y - 90 + G.rand(-40, 40), '#ffd166', 3, 90, 'star');
      }
      // Falcon celebra si estaba liberado.
      updateParticles(dt);
      if (winTimer > 3.4) {
        sfx('victory');
        G.go('levelDone', { level: 5 });
      }
      return;
    }

    // Temporizadores de reaparicion co-op.
    if (p1KO >= 0) { p1KO -= dt; if (p1KO <= 0) respawnP1(); }
    if (p2KO >= 0) { p2KO -= dt; if (p2KO <= 0) respawnP2(); }

    if (p1KO < 0) updatePlayer(dt);
    if (p2Ctrl && p2KO < 0) updateP2(dt);
    updateBoss(dt);
    updateQTE(dt);
    updateOrbs(dt);
    updateShockwaves(dt);
    updateFalcon(dt);
    updateParticles(dt);
  };

  // ---------- Jugador ----------
  function updatePlayer(dt) {
    if (p.inv > 0) p.inv -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.punchCd > 0) p.punchCd -= dt;
    if (p.pulseCd > 0) p.pulseCd -= dt;
    if (p.attackT > 0) p.attackT -= dt;
    if (p.pulseT > 0) p.pulseT -= dt;

    // Congelar movimiento de P1 si es quien responde el QTE (SOLO co-op; en 1
    // jugador todo queda como hoy: el heroe podia moverse durante el QTE).
    var qteFreeze = isCoop() && qte.active && qteWho === 1;
    if (qteFreeze) {
      p.vx = 0;
      if (p.onGround) p.pose = 'idle';
      return;
    }

    var left = G.input.held('left');
    var right = G.input.held('right');

    // Movimiento horizontal (bloqueado durante hurt fuerte breve).
    var move = 0;
    if (left) move -= 1;
    if (right) move += 1;
    if (move !== 0) { p.facing = move; }

    // Si esta recibiendo knockback (hurt reciente), no controlamos del todo.
    if (p.hurtT > 0.2) {
      // dejar que el knockback actue; friccion
      p.vx *= 0.9;
    } else {
      p.vx = move * RUN_SPEED;
    }

    // Salto con coyote + buffer.
    p.coyote = p.onGround ? 0.1 : Math.max(0, p.coyote - dt);
    if (G.input.pressed('jump')) p.jumpBuf = 0.12; else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = JUMP_V;
      p.onGround = false;
      p.coyote = 0; p.jumpBuf = 0;
      sfx('jump');
    }

    // Gravedad.
    p.vy += GRAV * dt;
    if (p.vy > 1200) p.vy = 1200;

    // Integrar.
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Paredes de la arena.
    p.x = clamp(p.x, ARENA_L + p.w / 2, ARENA_R - p.w / 2);

    // Colision con suelo y plataformas (solo cuando cae).
    var wasOn = p.onGround;
    p.onGround = false;

    // Suelo principal.
    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      if (p.vy >= 0) p.vy = 0;
      p.onGround = true;
    }

    // Plataformas laterales (una via: aterrizas por arriba al caer).
    if (p.vy >= 0) {
      var feet = p.y;
      var prevFeet = p.y - p.vy * dt;
      for (var i = 0; i < PLATS.length; i++) {
        var pl = PLATS[i];
        if (p.x + p.w / 2 > pl.x && p.x - p.w / 2 < pl.x + pl.w) {
          if (prevFeet <= pl.y + 2 && feet >= pl.y) {
            p.y = pl.y;
            p.vy = 0;
            p.onGround = true;
          }
        }
      }
    }

    // Ataques.
    // attack -> punietazo (2 daños), cadencia 0.5s.
    if (G.input.pressed('attack') && p.punchCd <= 0 && p.hurtT <= 0) {
      p.punchCd = 0.5;
      p.attackT = 0.28;
      p.pose = 'attack';
      sfx('punch');
      // Golpe cuerpo a cuerpo: rect delante del jugador (~48px).
      var hx = p.x + p.facing * 40;
      var hy = p.y - p.h * 0.55;
      var hitRect = { x: hx - 28, y: hy - 24, w: 56, h: 48 };
      if (overlap(hitRect, bossRect())) {
        hitBoss(2, hx, hy);
      }
    }

    // shoot -> pulso electrico (1 daño), alcance 240px horizontal, cadencia 0.7s.
    if (G.input.pressed('shoot') && p.pulseCd <= 0 && p.hurtT <= 0) {
      p.pulseCd = 0.7;
      p.pulseT = 0.3;
      p.pose = 'shoot';
      sfx('zap');
      var px = p.x + p.facing * 30;
      var py = p.y - p.h * 0.55;
      // Zona del pulso: 240px de alcance por delante, altura del cuerpo.
      var zone = {
        x: p.facing > 0 ? px : px - 240,
        y: py - 30, w: 240, h: 60
      };
      if (overlap(zone, bossRect())) {
        hitBoss(1, boss.x, py);
      }
    }

    // Hackeo de la consola de la celda (liberar a Falcon).
    p.hackHoldActive = false;
    if (consoleActive && !falconFreed) {
      var dConsole = G.dist ? G.dist(p.x, p.y - 30, CONSOLE_X, CONSOLE_Y) :
        Math.hypot(p.x - CONSOLE_X, (p.y - 30) - CONSOLE_Y);
      if (dConsole < 90 && G.input.held('hack')) {
        p.hackHoldActive = true;
        if (p.hackHold <= 0) sfx('hack');
        p.hackHold += dt;
        p.pose = 'hack';
        if (p.hackHold >= 1.2) {
          freeFalcon();
        }
      } else {
        p.hackHold = 0;
      }
    }

    // Pose por defecto (si no esta en accion).
    if (p.hurtT > 0) p.pose = 'hurt';
    else if (p.attackT > 0) p.pose = 'attack';
    else if (p.pulseT > 0) p.pose = 'shoot';
    else if (p.hackHoldActive) p.pose = 'hack';
    else if (!p.onGround) p.pose = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 20) p.pose = 'run';
    else p.pose = 'idle';
  }

  function freeFalcon() {
    falconFreed = true;
    consoleActive = false;
    p.hackHold = 0;
    sfx('hackOk');
    sfx('door');
    addParticles(CELL_X, CELL_Y, '#22c55e', 16, 160, 'star');
    if (isCoop()) {
      // Co-op: P2 toma el CONTROL de Lord Falcon. Sin flechas automaticas.
      p2Ctrl = true;
      p2.x = CELL_X;
      p2.y = GROUND_Y;
      p2.vx = 0; p2.vy = 0; p2.onGround = true;
      p2.inv = 1.2; p2.facing = -1; p2.pose = 'idle';
      showMsg('¡P2 controla a Lord Falcon! Espada y flechas', 3.0);
    } else {
      falconShotT = 6; // primera flecha a los ~6s (Falcon-IA)
      showMsg('¡Lord Falcon libre! Te ayudara con sus flechas', 3.0);
    }
  }

  // ---------- Jugador 2: Lord Falcon (co-op, control con G.input2) ----------
  function updateP2(dt) {
    var IN = inp2();
    if (p2.inv > 0) p2.inv -= dt;
    if (p2.hurtT > 0) p2.hurtT -= dt;
    if (p2.punchCd > 0) p2.punchCd -= dt;
    if (p2.shootCd > 0) p2.shootCd -= dt;
    if (p2.attackT > 0) p2.attackT -= dt;
    if (p2.shootT > 0) p2.shootT -= dt;

    // Congelar movimiento de P2 si es quien responde el QTE (contrato).
    var qteFreeze = qte.active && qteWho === 2;
    if (qteFreeze) {
      p2.vx = 0;
      if (p2.onGround) p2.pose = 'idle';
      return;
    }

    var move = 0;
    if (IN.held('left')) move -= 1;
    if (IN.held('right')) move += 1;
    if (move !== 0) p2.facing = move;

    if (p2.hurtT > 0.2) { p2.vx *= 0.9; }
    else { p2.vx = move * RUN_SPEED; }

    // Salto (misma fisica que el Director: coyote + buffer).
    p2.coyote = p2.onGround ? 0.1 : Math.max(0, p2.coyote - dt);
    if (IN.pressed('jump')) p2.jumpBuf = 0.12; else p2.jumpBuf = Math.max(0, p2.jumpBuf - dt);
    if (p2.jumpBuf > 0 && p2.coyote > 0) {
      p2.vy = JUMP_V; p2.onGround = false; p2.coyote = 0; p2.jumpBuf = 0; sfx('jump');
    }

    p2.vy += GRAV * dt;
    if (p2.vy > 1200) p2.vy = 1200;
    p2.x += p2.vx * dt;
    p2.y += p2.vy * dt;
    p2.x = clamp(p2.x, ARENA_L + p2.w / 2, ARENA_R - p2.w / 2);

    p2.onGround = false;
    if (p2.y >= GROUND_Y) { p2.y = GROUND_Y; if (p2.vy >= 0) p2.vy = 0; p2.onGround = true; }
    if (p2.vy >= 0) {
      var feet = p2.y, prevFeet = p2.y - p2.vy * dt;
      for (var i = 0; i < PLATS.length; i++) {
        var pl = PLATS[i];
        if (p2.x + p2.w / 2 > pl.x && p2.x - p2.w / 2 < pl.x + pl.w) {
          if (prevFeet <= pl.y + 2 && feet >= pl.y) { p2.y = pl.y; p2.vy = 0; p2.onGround = true; }
        }
      }
    }

    // Espada (attack): 1 daño SOLO con escudo caido. Cadencia 0.5s.
    if (IN.pressed('attack') && p2.punchCd <= 0 && p2.hurtT <= 0) {
      p2.punchCd = 0.5;
      p2.attackT = 0.28;
      p2.pose = 'attack';
      sfx('punch');
      var hx = p2.x + p2.facing * 40, hy = p2.y - p2.h * 0.55;
      var hitRect = { x: hx - 30, y: hy - 26, w: 60, h: 52 };
      if (overlap(hitRect, bossRect())) hitBoss(1, hx, hy); // hitBoss ignora si escudo ON
    }

    // Flecha (shoot): cooldown 3s. Aturde 1.0s + 1 daño si el escudo esta caido.
    if (IN.pressed('shoot') && p2.shootCd <= 0 && p2.hurtT <= 0) {
      p2.shootCd = 3.0;
      p2.shootT = 0.3;
      p2.pose = 'shoot';
      var ax = p2.x + p2.facing * 20, ay = p2.y - p2.h * 0.6;
      var ang = Math.atan2((boss.y - boss.h * 0.5) - ay, boss.x - ax);
      falconArrows.push({
        x: ax, y: ay,
        vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560,
        angle: ang, t: 0, life: 3, fromP2: true
      });
      sfx('arrow');
    }

    // Pose.
    if (p2.hurtT > 0) p2.pose = 'hurt';
    else if (p2.attackT > 0) p2.pose = 'attack';
    else if (p2.shootT > 0) p2.pose = 'shoot';
    else if (!p2.onGround) p2.pose = p2.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p2.vx) > 20) p2.pose = 'run';
    else p2.pose = 'idle';
  }

  // ---------- Dark Toros (maquina de estados) ----------
  function updateBoss(dt) {
    if (boss.hurtFlash > 0) boss.hurtFlash -= dt;

    // Aturdimiento (tras QTE o flecha de Falcon): vulnerable, no ataca.
    if (boss.stunT > 0) {
      boss.stunT -= dt;
      boss.pose = 'stunned';
      // sparkles de aturdimiento
      if (Math.random() < 0.3) addParticles(boss.x + G.rand(-30, 30), boss.y - 130, '#fde68a', 2, 60, 'star');
      // El escudo puede estar OFF durante este tiempo (se gestiona con shieldOffT).
      tickShield(dt);
      return;
    }

    tickShield(dt);

    // Recuperacion tras recuperar el martillo (pose roar, sin atacar ~1s).
    if (boss.recoverT > 0) {
      boss.recoverT -= dt;
      boss.pose = 'roar';
      return;
    }

    // Velocidad de fase (mas rapido en fases avanzadas).
    var speedMul = boss.phase === 1 ? 1.0 : (boss.phase === 2 ? 1.25 : 1.5);

    switch (boss.state) {
      case 'think':
        boss.pose = 'idle';
        var tgtThink = targetPlayer();
        boss.facing = tgtThink.x < boss.x ? -1 : 1;
        boss.stateT += dt;
        // caminar suavemente hacia el jugador VIVO mas cercano para posicionarse
        if (Math.abs(tgtThink.x - boss.x) > 160) {
          boss.x += (tgtThink.x < boss.x ? -1 : 1) * 60 * speedMul * dt;
          boss.x = clamp(boss.x, 180, W - 180);
          boss.pose = 'walk';
        }
        if (boss.stateT >= boss.thinkT / speedMul) {
          chooseAttack();
        }
        break;

      case 'slam':
        updateSlam(dt, speedMul);
        break;

      case 'charge':
        updateCharge(dt, speedMul);
        break;

      case 'orbs':
        updateOrbAttack(dt, speedMul);
        break;
    }
  }

  function tickShield(dt) {
    if (boss.shieldOffT > 0) {
      boss.shieldOffT -= dt;
      boss.shield = false;
      if (boss.shieldOffT <= 0) {
        boss.shield = true; // reactiva escudo
        showMsg('¡El Escudo de Poder vuelve!', 1.6);
      }
    }
  }

  function chooseAttack() {
    boss.stateT = 0;
    boss.attackCount++;
    // Repertorio: slam, charge, orbs. En fases altas mas slam/orbs.
    // Elegimos con pesos simples.
    var roll = Math.random();
    var choice;
    if (boss.phase === 1) {
      choice = roll < 0.45 ? 'slam' : (roll < 0.75 ? 'charge' : 'orbs');
    } else if (boss.phase === 2) {
      choice = roll < 0.4 ? 'slam' : (roll < 0.7 ? 'charge' : 'orbs');
    } else {
      choice = roll < 0.4 ? 'slam' : (roll < 0.65 ? 'charge' : 'orbs');
    }
    // Asegurar que el jugador tenga oportunidad de hackear el martillo:
    // si el escudo esta ON y no hemos hecho slam en un rato, forzar slam.
    if (boss.shield && boss.attackCount % 3 === 0) choice = 'slam';

    boss.state = choice;
    boss.slamPhase = 0;
    boss.telegraphT = 0;
    var tgtChoose = targetPlayer();
    boss.facing = tgtChoose.x < boss.x ? -1 : 1;
  }

  // --- Ataque 1: salto + martillazo -> onda por el suelo + martillo clavado ---
  function updateSlam(dt, speedMul) {
    boss.stateT += dt;
    if (boss.slamPhase === 0) {
      // Telegrafia breve + salto.
      boss.pose = 'slam';
      boss.telegraphT = 0.35;
      // salta hacia arriba
      boss.slamPhase = 1;
      boss.slamVy = -520;
      boss.slamBaseY = boss.y;
      // objetivo horizontal: cerca del jugador VIVO mas cercano
      boss.slamTargetX = clamp(targetPlayer().x, 220, W - 220);
      sfx('roar');
    } else if (boss.slamPhase === 1) {
      // En el aire.
      boss.slamVy += GRAV * 1.1 * dt;
      boss.y += boss.slamVy * dt;
      boss.x += (boss.slamTargetX - boss.x) * Math.min(1, 3 * dt);
      boss.pose = 'slam';
      if (boss.y >= boss.slamBaseY && boss.slamVy > 0) {
        // impacto
        boss.y = boss.slamBaseY;
        boss.slamPhase = 2;
        boss.stateT = 0;
        sfx('explosion');
        camShake = Math.max(camShake, 0.4);
        // Onda expansiva a ambos lados desde el punto de impacto.
        var wsSpeed = 360 * speedMul;
        shockwaves.push({ x: boss.x, y: GROUND_Y, dir: -1, r: 10, speed: wsSpeed, life: 2.0, t: 0 });
        shockwaves.push({ x: boss.x, y: GROUND_Y, dir: 1, r: 10, speed: wsSpeed, life: 2.0, t: 0 });
        // Martillo clavado.
        boss.hammerStuck = true;
        boss.hammerStuckT = 3.5;
        boss.hasHammer = true; // sigue siendo suyo, pero clavado
        boss.hammerX = boss.x + boss.facing * 60;
        boss.hammerY = GROUND_Y;
        addParticles(boss.x, GROUND_Y, '#ffb703', 14, 220, 'dot');
      }
    } else if (boss.slamPhase === 2) {
      // Martillo clavado: espera a que el jugador haga QTE o se acabe el tiempo.
      boss.pose = 'idle';
      boss.hammerStuckT -= dt;

      // Iniciar QTE: cualquiera de los dos que este cerca del martillo y pulse hack.
      if (!qte.active) {
        var dH1 = (p1KO < 0) ? Math.hypot(p.x - boss.hammerX, (p.y - 30) - (boss.hammerY - 40)) : Infinity;
        var dH2 = p2Alive() ? Math.hypot(p2.x - boss.hammerX, (p2.y - 30) - (boss.hammerY - 40)) : Infinity;
        if (dH1 < 80 && G.input.pressed('hack')) {
          startQTE(1);
        } else if (dH2 < 80 && inp2().pressed('hack')) {
          startQTE(2);
        }
      }

      if (boss.hammerStuckT <= 0 && !qte.active) {
        // Recupera el martillo (agotado el tiempo sin QTE completado).
        recoverHammer(false);
      }
    }
  }

  function recoverHammer(afterFails) {
    boss.hammerStuck = false;
    boss.slamPhase = 0;
    qte.active = false;
    // Recuperacion con pose roar ~1s (nota de diseño: sin castigo inmediato).
    boss.recoverT = 1.0;
    boss.state = 'think';
    boss.thinkT = 1.2;
    boss.stateT = 0;
    boss.pose = 'roar';
    if (afterFails) {
      sfx('roar');
      showMsg('¡Toros recupera su martillo! Vuelve a intentarlo', 2.0);
    }
  }

  // --- QTE de hackeo del martillo ---
  function startQTE(who) {
    qteWho = (who === 2) ? 2 : 1;
    qte.active = true;
    qte.seq = [];
    for (var i = 0; i < 4; i++) {
      qte.seq.push(DIRS[G.randInt ? G.randInt(0, 3) : Math.floor(Math.random() * 4)]);
    }
    qte.idx = 0;
    qte.t = 4.0;
    qte.fails = 0;
    qte.freeFailUsed = false;
    qte.shakeT = 0;
    qte.flashT = 0;
    sfx('hack');
  }

  function updateQTE(dt) {
    if (!qte.active) return;
    if (qte.shakeT > 0) qte.shakeT -= dt;
    if (qte.flashT > 0) qte.flashT -= dt;

    qte.t -= dt;
    if (qte.t <= 0) {
      // Se acabo el tiempo: cuenta como intento fallido -> recupera martillo.
      qte.active = false;
      recoverHammer(true);
      return;
    }

    // Leer una direccion pulsada este frame, del jugador QUE INICIO el QTE.
    var qteInput = (qteWho === 2) ? inp2() : G.input;
    var pressed = null;
    for (var i = 0; i < DIRS.length; i++) {
      if (qteInput.pressed(DIRS[i])) { pressed = DIRS[i]; break; }
    }
    if (!pressed) return;

    if (pressed === qte.seq[qte.idx]) {
      // Correcto: beep verde + ghosting.
      qte.idx++;
      qte.flashT = 0.22;
      sfx('hack');
      if (qte.idx >= qte.seq.length) {
        // Exito total.
        qteSuccess();
      }
    } else {
      // Fallo: primer fallo "gratis" (no cuenta) para un niño de 10 años.
      if (!qte.freeFailUsed) {
        qte.freeFailUsed = true;
        qte.shakeT = 0.3;
        qte.idx = 0; // reinicia la secuencia visible
        sfx('hackFail');
        showMsg('¡Ups! Empieza de nuevo (este no cuenta)', 1.4);
      } else {
        qte.fails++;
        qte.shakeT = 0.3;
        qte.idx = 0;
        sfx('hackFail');
        if (qte.fails >= 2) {
          // 2 fallos reales -> Toros recupera el martillo.
          qte.active = false;
          recoverHammer(true);
        }
      }
    }
  }

  function qteSuccess() {
    qte.active = false;
    boss.hammerStuck = false;
    boss.slamPhase = 0;
    sfx('hackOk');
    // Escudo OFF 8s + aturdido 3s.
    boss.shield = false;
    boss.shieldOffT = 8.0;
    boss.stunT = 3.0;
    boss.state = 'think';
    boss.thinkT = 1.2;
    boss.stateT = 0;
    boss.pose = 'stunned';
    showMsg('¡Escudo desactivado! ¡Pegale a Dark Toros!', 2.6);
    addParticles(boss.x, boss.y - 100, '#22d3ee', 18, 200, 'star');
    camShake = Math.max(camShake, 0.2);
  }

  // --- Ataque 2: embestida telegrafiada ---
  function updateCharge(dt, speedMul) {
    boss.stateT += dt;
    if (boss.telegraphT === 0 && boss.stateT < 0.05) {
      // iniciar telegrafia
      boss.telegraphT = 0.6;
      boss.chargeDir = targetPlayer().x < boss.x ? -1 : 1;
      boss.facing = boss.chargeDir;
      boss.pose = 'idle';
      boss.charging = false;
    }
    if (!boss.charging) {
      boss.telegraphT -= dt;
      boss.pose = 'idle';
      if (boss.telegraphT <= 0) {
        boss.charging = true;
        boss.chargeSpeed = 620 * speedMul;
        sfx('roar');
      }
    } else {
      boss.pose = 'charge';
      boss.x += boss.chargeDir * boss.chargeSpeed * dt;
      // Contacto con cualquier jugador -> 2 daños (golpe fisico de Toros).
      if (p1KO < 0 && overlap(bossRect(), playerRect())) damagePlayer(2, boss.x);
      if (p2Alive() && overlap(bossRect(), p2Rect())) damageP2(2, boss.x);
      // Fin al llegar a la pared.
      if (boss.x < 200 || boss.x > W - 200) {
        boss.x = clamp(boss.x, 200, W - 200);
        boss.charging = false;
        boss.state = 'think';
        boss.thinkT = 1.0;
        boss.stateT = 0;
        camShake = Math.max(camShake, 0.3);
        sfx('explosion');
      }
    }
  }

  // --- Ataque 3: orbes de gema en abanico ---
  function updateOrbAttack(dt, speedMul) {
    boss.stateT += dt;
    if (!boss.orbsFired) {
      boss.pose = 'shoot';
      boss.telegraphT = 0.4;
      boss.orbsFired = false;
      if (boss.stateT >= 0.4) {
        fireOrbs();
        boss.orbsFired = true;
        sfx('laser');
      }
    } else {
      boss.pose = 'idle';
      if (boss.stateT >= 0.9) {
        boss.orbsFired = false;
        boss.state = 'think';
        boss.thinkT = 1.0;
        boss.stateT = 0;
      }
    }
  }

  function fireOrbs() {
    var n = boss.phase === 3 ? 5 : 3; // fase 3: 5 orbes
    var ox = boss.x + boss.facing * 40;
    var oy = boss.y - boss.h * 0.6;
    var tgtOrb = targetPlayer();
    var toward = Math.atan2((tgtOrb.y - 30) - oy, tgtOrb.x - ox);
    var spread = 0.5; // radianes total del abanico
    var speed = 260;  // 260px/s
    for (var i = 0; i < n; i++) {
      var frac = n === 1 ? 0 : (i / (n - 1) - 0.5);
      var ang = toward + frac * spread;
      orbs.push({
        x: ox, y: oy,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        r: 12, t: 0, life: 5.0
      });
    }
  }

  function updateOrbs(dt) {
    for (var i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.t += dt;
      o.life -= dt;
      // Colision con jugador -> 1 daño (orbe). Cualquiera de los dos.
      var orbRect = { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
      if (p1KO < 0 && overlap(orbRect, playerRect())) {
        damagePlayer(1, o.x);
        addParticles(o.x, o.y, '#e11d48', 8, 140, 'dot');
        orbs.splice(i, 1);
        continue;
      }
      if (p2Alive() && overlap(orbRect, p2Rect())) {
        damageP2(1, o.x);
        addParticles(o.x, o.y, '#e11d48', 8, 140, 'dot');
        orbs.splice(i, 1);
        continue;
      }
      if (o.life <= 0 || o.x < -30 || o.x > W + 30 || o.y > H + 30 || o.y < -30) {
        orbs.splice(i, 1);
      }
    }
  }

  // --- Ondas expansivas del martillazo (se esquivan saltando) ---
  function updateShockwaves(dt) {
    for (var i = shockwaves.length - 1; i >= 0; i--) {
      var s = shockwaves[i];
      s.t += dt;
      s.life -= dt;
      s.x += s.dir * s.speed * dt;
      s.r += 30 * dt;
      // Golpea si un jugador esta en el suelo cerca de la onda (2 = fisico).
      if (p1KO < 0 && p.onGround && p.inv <= 0) {
        if (Math.abs(p.x - s.x) < 34 && (p.y >= GROUND_Y - 6)) damagePlayer(2, s.x);
      }
      if (p2Alive() && p2.onGround && p2.inv <= 0) {
        if (Math.abs(p2.x - s.x) < 34 && (p2.y >= GROUND_Y - 6)) damageP2(2, s.x);
      }
      if (s.life <= 0 || s.x < -60 || s.x > W + 60) {
        shockwaves.splice(i, 1);
      }
    }
  }

  // --- Lord Falcon: flechas que aturden a Toros ---
  // 1 jugador: Falcon-IA dispara solo cada 6s. Co-op con P2 al mando: NO hay
  // disparo automatico (las flechas las lanza P2 desde updateP2).
  function updateFalcon(dt) {
    // Disparo automatico solo del Falcon-IA (nunca cuando P2 lo controla).
    if (falconFreed && !p2Ctrl) {
      falconShotT -= dt;
      if (falconShotT <= 0) {
        falconShotT = 6.0;
        var fx = CELL_X, fy = CELL_Y + 20;
        var ang = Math.atan2((boss.y - boss.h * 0.5) - fy, boss.x - fx);
        falconArrows.push({
          x: fx, y: fy,
          vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520,
          angle: ang, t: 0, life: 3
        });
        sfx('arrow');
      }
    }
    // Movimiento y colision de TODAS las flechas (IA o P2).
    for (var i = falconArrows.length - 1; i >= 0; i--) {
      var a = falconArrows[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.vy += 200 * dt; // gravedad ligera
      a.angle = Math.atan2(a.vy, a.vx);
      a.t += dt; a.life -= dt;
      var ar = { x: a.x - 6, y: a.y - 6, w: 12, h: 12 };
      if (overlap(ar, bossRect())) {
        if (a.fromP2) {
          // Flecha de P2: aturde 1.0s y hace 1 daño si el escudo esta caido.
          boss.stunT = Math.max(boss.stunT, 1.0);
          if (!boss.shield) hitBoss(1, a.x, a.y);
          else { sfx('clink'); addParticles(a.x, a.y, '#bff7ff', 6, 120, 'clink'); }
        } else {
          // Flecha del Falcon-IA: aturde 1.5s (trabajo en equipo), sin daño directo.
          boss.stunT = Math.max(boss.stunT, 1.5);
          sfx('hit');
        }
        addParticles(a.x, a.y, '#22c55e', 8, 120, 'star');
        falconArrows.splice(i, 1);
        continue;
      }
      if (a.life <= 0 || a.x < -30 || a.x > W + 30 || a.y > H + 30) {
        falconArrows.splice(i, 1);
      }
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var pa = particles[i];
      pa.t += dt;
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
      pa.vy += 260 * dt;
      if (pa.t >= pa.life) particles.splice(i, 1);
    }
  }

  // ============================================================
  //  RENDER
  // ============================================================
  scene.render = function (ctx) {
    var t = G.T || 0;

    ctx.save();
    // Sacudida de camara.
    if (camShake > 0) {
      var s = camShake * 40;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    // Fondo: sala del trono.
    gfx('drawBgThrone', [ctx, t]);

    // Suelo (banda base por si el fondo no lo cubre del todo).
    ctx.fillStyle = 'rgba(30,10,20,0.35)';
    ctx.fillRect(-30, GROUND_Y, W + 60, H - GROUND_Y + 30);

    // Plataformas laterales.
    for (var i = 0; i < PLATS.length; i++) {
      var pl = PLATS[i];
      drawPlatform(ctx, pl);
    }

    // Celda de energia con Lord Falcon.
    gfx('drawEnergyCell', [ctx, CELL_X, CELL_Y, { open: falconFreed, t: t }]);

    // Consola de la celda (dibujo simple + brillo si activa).
    drawCellConsole(ctx, t);

    // Ondas expansivas.
    for (i = 0; i < shockwaves.length; i++) {
      var sw = shockwaves[i];
      var s01 = clamp(sw.t / sw.life, 0, 1);
      gfx('drawShockwave', [ctx, sw.x, sw.y, sw.r, s01]);
    }

    // Orbes de gema.
    for (i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      drawOrb(ctx, o, t);
    }

    // Flechas de Falcon.
    for (i = 0; i < falconArrows.length; i++) {
      gfx('drawArrowProj', [ctx, falconArrows[i].x, falconArrows[i].y, falconArrows[i].angle]);
    }

    // --- Dark Toros ---
    var bossOpts = {
      t: t, facing: boss.facing, pose: boss.pose,
      shield: boss.shield && winTimer < 0,
      sinMartillo: boss.hammerStuck // el martillo esta clavado en el suelo aparte
    };
    // Flash blanco de impacto.
    gfx('drawToros', [ctx, boss.x, boss.y, bossOpts]);
    if (boss.hurtFlash > 0) {
      ctx.save();
      ctx.globalAlpha = boss.hurtFlash * 2.5;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      var br = bossRect();
      ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.restore();
    }

    // Martillo clavado en el suelo (si aplica).
    if (boss.hammerStuck) {
      gfx('drawHammer', [ctx, boss.hammerX, boss.hammerY - 30, { angle: 0.2, clavado: true }]);
    }

    // Telegrafia de embestida / martillazo: signo "!".
    if (boss.telegraphT > 0 && winTimer < 0) {
      gfx('drawExclamation', [ctx, boss.x, boss.y - boss.h - 20]);
    }

    // --- Jugador P1 (Director) (parpadeo si invulnerable; oculto si K.O.) ---
    var drawPlayer = !(p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0);
    if ((p1KO < 0 && drawPlayer) || winTimer >= 0) {
      gfx('drawDirector', [ctx, p.x, p.y, { t: t, facing: p.facing, pose: p.pose }]);
    }

    // Efectos de ataque del jugador P1.
    if (p1KO < 0 && p.attackT > 0) {
      var a01 = 1 - clamp(p.attackT / 0.28, 0, 1);
      gfx('drawPunch', [ctx, p.x + p.facing * 30, p.y - p.h * 0.55, p.facing, a01]);
    }
    if (p1KO < 0 && p.pulseT > 0) {
      var z01 = 1 - clamp(p.pulseT / 0.3, 0, 1);
      gfx('drawZap', [ctx, p.x + p.facing * 30, p.y - p.h * 0.55, p.facing, z01]);
    }

    // --- Jugador P2 (Lord Falcon controlado). Solo cuando controla y no K.O. ---
    if (p2Ctrl && (p2KO < 0 || winTimer >= 0)) {
      var drawP2 = !(p2.inv > 0 && Math.floor(p2.inv * 12) % 2 === 0);
      if (drawP2 || winTimer >= 0) {
        gfx('drawFalcon', [ctx, p2.x, p2.y, { t: t, facing: p2.facing, pose: p2.pose }]);
      }
      if (p2.attackT > 0) {
        var pa01 = 1 - clamp(p2.attackT / 0.28, 0, 1);
        gfx('drawPunch', [ctx, p2.x + p2.facing * 30, p2.y - p2.h * 0.55, p2.facing, pa01]);
      }
    }

    // Anillo de progreso de hackeo de la consola.
    if (p.hackHoldActive && p.hackHold > 0) {
      drawHackRing(ctx, CONSOLE_X, CONSOLE_Y - 10, clamp(p.hackHold / 1.2, 0, 1));
    }

    // Particulas.
    for (i = 0; i < particles.length; i++) {
      drawParticle(ctx, particles[i]);
    }

    ctx.restore(); // fin sacudida

    // ====== HUD (fijo en pantalla, sin shake) ======
    if (G.ui && G.ui.drawHearts) G.ui.drawHearts(ctx);

    // Barra del jefe.
    if (winTimer < 0 && G.ui && G.ui.drawBossBar) {
      G.ui.drawBossBar(ctx, boss.hp / boss.maxHp, 'DARK TOROS');
    }

    // Pista contextual cerca del martillo clavado (cualquiera de los dos).
    if (boss.hammerStuck && !qte.active && winTimer < 0) {
      var dHammer = (p1KO < 0) ? Math.hypot(p.x - boss.hammerX, (p.y - 30) - (boss.hammerY - 40)) : Infinity;
      var dHammer2 = p2Alive() ? Math.hypot(p2.x - boss.hammerX, (p2.y - 30) - (boss.hammerY - 40)) : Infinity;
      if (dHammer < 80 || dHammer2 < 80) {
        if (G.ui && G.ui.hint) G.ui.hint(ctx, '¡PULSA H para hackear el martillo!');
      } else {
        if (G.ui && G.ui.hint) G.ui.hint(ctx, '¡Acercate al martillo clavado!');
      }
    }

    // Pista para liberar a Lord Falcon.
    if (consoleActive && !falconFreed && !qte.active && !boss.hammerStuck && winTimer < 0) {
      if (G.ui && G.ui.hint) G.ui.hint(ctx, '¡Libera a Lord Falcon! (manten H en la consola)');
    }

    // Co-op: cartel pequeño de que P2 espera atrapado en la celda.
    if (isCoop() && !p2Ctrl && winTimer < 0) {
      drawSmallLabel(ctx, CELL_X, CELL_Y - 58, 'P2 está atrapado — ¡libera la celda!');
    }

    // Co-op: carteles de reaparicion (K.O.).
    if (isCoop() && winTimer < 0) {
      if (p1KO >= 0) drawKOBanner(ctx, 'P1 vuelve en ' + Math.ceil(p1KO) + 's', '#8ecbff', H / 2 - 30);
      if (p2KO >= 0) drawKOBanner(ctx, 'P2 vuelve en ' + Math.ceil(p2KO) + 's', '#22c55e', H / 2 + 30);
    }

    // QTE overlay (encima de todo).
    if (qte.active) drawQTE(ctx);

    // Mensaje flotante.
    if (msgTimer && msgTimer.text) drawFloatingMsg(ctx, msgTimer.text);

    // Cinematica de victoria.
    if (winTimer >= 0) drawVictory(ctx, t);

    // Fundido de entrada.
    if (enterFlash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(enterFlash, 0, 1);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };

  // ---------- helpers de dibujo locales ----------
  function drawPlatform(ctx, pl) {
    ctx.save();
    ctx.fillStyle = '#3a1526';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 3;
    roundRect(ctx, pl.x, pl.y, pl.w, pl.h, 6);
    ctx.fill();
    ctx.stroke();
    // brillo superior
    ctx.fillStyle = 'rgba(225,29,72,0.35)';
    ctx.fillRect(pl.x + 4, pl.y + 3, pl.w - 8, 4);
    ctx.restore();
  }

  function drawCellConsole(ctx, t) {
    ctx.save();
    var glow = consoleActive ? (0.5 + 0.5 * Math.sin(t * 8)) : 0.15;
    // base
    ctx.fillStyle = '#22252e';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 3;
    roundRect(ctx, CONSOLE_X - 22, CONSOLE_Y - 26, 44, 52, 6);
    ctx.fill();
    ctx.stroke();
    // pantalla
    ctx.fillStyle = consoleActive ? 'rgba(34,197,94,' + (0.35 + glow * 0.6) + ')' : 'rgba(100,116,139,0.5)';
    roundRect(ctx, CONSOLE_X - 15, CONSOLE_Y - 20, 30, 22, 4);
    ctx.fill();
    if (consoleActive) {
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 18 * glow;
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      roundRect(ctx, CONSOLE_X - 15, CONSOLE_Y - 20, 30, 22, 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOrb(ctx, o, t) {
    ctx.save();
    ctx.translate(o.x, o.y);
    var pulse = 1 + 0.12 * Math.sin(t * 10 + o.x);
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 16;
    var g = ctx.createRadialGradient(0, 0, 2, 0, 0, o.r * pulse);
    g.addColorStop(0, '#ffd1e0');
    g.addColorStop(0.5, '#e11d48');
    g.addColorStop(1, '#a21caf');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, o.r * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawParticle(ctx, pa) {
    ctx.save();
    var a = clamp(1 - pa.t / pa.life, 0, 1);
    ctx.globalAlpha = a;
    if (pa.kind === 'clink') {
      // destello de escudo: cruz/estrella cian (distinto del golpe normal)
      ctx.strokeStyle = pa.color;
      ctx.lineWidth = 2.5;
      var r = pa.r * 2;
      ctx.beginPath();
      ctx.moveTo(pa.x - r, pa.y); ctx.lineTo(pa.x + r, pa.y);
      ctx.moveTo(pa.x, pa.y - r); ctx.lineTo(pa.x, pa.y + r);
      ctx.stroke();
    } else if (pa.kind === 'star') {
      gfx('drawSparkle', [ctx, pa.x, pa.y, clamp(pa.t / pa.life, 0, 1)]);
    } else {
      ctx.fillStyle = pa.color;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, pa.r * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHackRing(ctx, x, y, frac) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(34,211,238,0.3)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    ctx.restore();
  }

  // --- QTE grande y muy legible ---
  function drawQTE(ctx) {
    ctx.save();
    // Panel oscuro semitransparente en el centro.
    var panelW = 620, panelH = 220;
    var px = (W - panelW) / 2, py = (H - panelH) / 2 - 20;
    // temblor rojo al fallar
    var sx = 0, sy = 0;
    if (qte.shakeT > 0) { sx = (Math.random() - 0.5) * 12; sy = (Math.random() - 0.5) * 12; }
    ctx.translate(sx, sy);

    ctx.fillStyle = 'rgba(10,8,20,0.82)';
    roundRect(ctx, px, py, panelW, panelH, 18);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = qte.shakeT > 0 ? '#ef4444' : '#22d3ee';
    roundRect(ctx, px, py, panelW, panelH, 18);
    ctx.stroke();

    // Titulo.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¡HACKEA EL MARTILLO!', W / 2, py + 38);

    // Barra de tiempo.
    var barW = panelW - 80, barX = px + 40, barY = py + 60;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, barX, barY, barW, 12, 6); ctx.fill();
    var tf = clamp(qte.t / 4.0, 0, 1);
    ctx.fillStyle = tf > 0.35 ? '#22d3ee' : '#f59e0b';
    roundRect(ctx, barX, barY, barW * tf, 12, 6); ctx.fill();

    // 4 flechas gigantes.
    var n = qte.seq.length;
    var gap = 130;
    var startX = W / 2 - (n - 1) * gap / 2;
    var arrowY = py + 145;
    for (var i = 0; i < n; i++) {
      var ax = startX + i * gap;
      var state = i < qte.idx ? 'done' : (i === qte.idx ? 'active' : 'pending');
      drawBigArrow(ctx, ax, arrowY, qte.seq[i], state);
    }

    // En co-op: pista de que teclas usar segun quien inicio el QTE.
    if (isCoop()) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(qteWho === 2 ? '(P2: usa las flechas)' : '(P1: usa WASD)', W / 2, py + panelH - 20);
    }

    ctx.restore();
  }

  function drawBigArrow(ctx, x, y, dir, state) {
    ctx.save();
    ctx.translate(x, y);
    var R = 46;
    // color por estado
    var bg, edge, ico;
    if (state === 'done') { bg = '#16a34a'; edge = '#22c55e'; ico = '#eaffea'; }       // verde (ghosting)
    else if (state === 'active') { bg = '#0e7490'; edge = '#22d3ee'; ico = '#ffffff'; } // resaltada
    else { bg = '#2a2f3a'; edge = '#475569'; ico = '#94a3b8'; }                          // pendiente

    // pulso en la activa
    var pulse = state === 'active' ? (1 + 0.06 * Math.sin((G.T || 0) * 12)) : 1;
    ctx.scale(pulse, pulse);

    // recuadro redondeado
    ctx.fillStyle = bg;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 4;
    roundRect(ctx, -R, -R, R * 2, R * 2, 14);
    ctx.fill();
    ctx.stroke();

    if (state === 'active') {
      ctx.shadowColor = edge; ctx.shadowBlur = 22;
      roundRect(ctx, -R, -R, R * 2, R * 2, 14);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // flecha del icono
    ctx.fillStyle = ico;
    var rot = dir === 'up' ? 0 : dir === 'right' ? Math.PI / 2 : dir === 'down' ? Math.PI : -Math.PI / 2;
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(20, 4);
    ctx.lineTo(8, 4);
    ctx.lineTo(8, 26);
    ctx.lineTo(-8, 26);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-20, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFloatingMsg(ctx, text) {
    ctx.save();
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width + 40;
    var x = W / 2, y = 100;
    ctx.fillStyle = 'rgba(10,8,20,0.8)';
    roundRect(ctx, x - w / 2, y - 22, w, 44, 12); ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
    roundRect(ctx, x - w / 2, y - 22, w, 44, 12); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  // Etiqueta pequeña centrada en (x,y) (co-op: aviso de P2 atrapado).
  function drawSmallLabel(ctx, x, y, text) {
    ctx.save();
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width + 26;
    ctx.fillStyle = 'rgba(10,8,20,0.8)';
    roundRect(ctx, x - w / 2, y - 15, w, 30, 9); ctx.fill();
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
    roundRect(ctx, x - w / 2, y - 15, w, 30, 9); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  // Cartel de reaparicion K.O. (co-op).
  function drawKOBanner(ctx, text, color, y) {
    ctx.save();
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width + 44;
    var x = W / 2;
    ctx.fillStyle = 'rgba(10,8,20,0.82)';
    roundRect(ctx, x - w / 2, y - 22, w, 44, 12); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    roundRect(ctx, x - w / 2, y - 22, w, 44, 12); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  function drawVictory(ctx, t) {
    ctx.save();
    var a = clamp(winTimer / 0.6, 0, 1) * 0.5;
    ctx.fillStyle = 'rgba(10,8,20,' + a + ')';
    ctx.fillRect(0, 0, W, H);
    if (winTimer > 0.5) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡DARK TOROS VENCIDO!', W / 2, H / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('La Gema del Poder se apaga...', W / 2, H / 2 + 24);
    }
    ctx.restore();
  }

  // roundRect local (no depender de soporte nativo).
  function roundRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Registrar escena.
  G.scenes = G.scenes || {};
  G.scenes.level5 = scene;

})();
