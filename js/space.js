// space.js — Capitulo 3: "Batalla Espacial"
// Shoot em up horizontal con la nave del Director America.
// Registra G.scenes.level3. Depende SOLO del contrato de core/audio/gfx/ui.
// Todo el estado de nivel se reinicia en enter(); ningun timer externo
// (setTimeout/setInterval/rAF): todo se cuenta en segundos dentro de update(dt).
//
// CO-OP (2 jugadores locales): si G.state.coop es true, aparece una segunda
// nave (P2, esquema verde halcon) controlada por G.input2 y con vida propia
// (G.state.hp2). En 1 jugador TODO queda EXACTAMENTE igual que antes: P2 no
// existe, no se dibuja su HUD y toda la logica recorre una sola nave.
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  // --- Constantes de nivel ------------------------------------------------
  var W = 960, H = 540;

  var PLAYER_SPEED = 320;          // px/s en las 4 direcciones
  var PLAYER_W = 46, PLAYER_H = 30; // hitbox de la nave (mundo == pantalla aqui)
  var SHOOT_CD = 0.16;             // cadencia de laser manteniendo shoot
  var LASER_SPEED = 720;           // px/s laser del jugador
  var HACK_CD = 4.0;               // cooldown del rayo de hackeo
  var HACK_RANGE = 620;            // alcance del rayo de hackeo
  var HACK_ALLY_TIME = 8.0;        // segundos que una nave hackeada es aliada
  var INVULN_TIME = 1.5;           // invulnerabilidad del jugador tras danio
  var WAVES_END = 110;             // duracion de la fase de oleadas

  var ALLY_LASER_SPEED = 640;      // laser de naves aliadas (hacia +x)
  var ENEMY_LASER_SPEED = 240;     // laser lento de naves medianas/jefe

  var BOSS_HP = 20;

  // Co-op: K.O. amable de una nave.
  var KO_TIME = 4.0;               // segundos K.O. antes de reaparecer
  var KO_RESPAWN_HP = 6;           // vida al reaparecer (3 corazones)
  var KO_INVULN = 2.0;             // invulnerabilidad tras reaparecer de K.O.

  // --- Estado (se rellena entero en enter, aqui solo declaraciones) --------
  var t;                 // tiempo de escena en segundos
  var phase;             // 'waves' | 'boss' | 'win' | 'lose'
  var waveTimer;         // reloj de oleadas
  var spawnAcc;          // acumuladores de spawn por tipo
  var spawnAstAcc;
  var scroll;            // scroll del fondo de estrellas

  var coop;              // copia local de G.state.coop en enter()
  var ships;             // [P1] o [P1, P2]: cada nave lleva su propio estado
  var player;            // alias de ships[0] (P1, compatibilidad interna)

  var hackBeam;          // {x1,y1,x2,y2,life} efecto visual momentaneo (compartido)

  var pLasers;           // lasers del jugador y aliados
  var eLasers;           // lasers enemigos (danian al jugador)
  var enemies;           // naves enemigas / aliadas
  var asteroids;         // asteroides que cruzan
  var particles;         // chispas/propulsor
  var explosions;        // {x,y,r,life,max}

  var boss;              // objeto del jefe o null
  var shake;             // magnitud de screen-shake (max 4)
  var flashTimer;        // destello suave al recibir danio
  var winTimer;          // temporizador de celebracion antes de salir
  var medTimerAcc;       // contador de spawn de naves medianas

  // --- Helpers locales -----------------------------------------------------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function sfx(n) { if (G.audio && G.audio.sfx) G.audio.sfx(n); }

  function addShake(v) { shake = Math.min(4, Math.max(shake, v)); }

  // Entrada de una nave concreta (P1 => G.input, P2 => G.input2). Se protege
  // contra la ausencia de G.input2 (por si el nucleo aun no lo expone): en ese
  // caso la nave no recibe entrada, pero nunca rompe el juego 1 jugador.
  var NO_INPUT = { held: function () { return false; }, pressed: function () { return false; } };
  function inputFor(sh) {
    if (sh.id === 'P2') return G.input2 || NO_INPUT;
    return G.input || NO_INPUT;
  }

  // Naves vivas (no K.O.). En 1 jugador siempre devuelve [player].
  function aliveShips() {
    var out = [];
    for (var i = 0; i < ships.length; i++) if (!ships[i].ko) out.push(ships[i]);
    return out;
  }

  // Nave viva mas cercana a (x,y). null si no hay ninguna viva.
  function nearestAliveShip(x, y) {
    var best = null, bestD = 1e9;
    for (var i = 0; i < ships.length; i++) {
      var s = ships[i];
      if (s.ko) continue;
      var d = G.dist(x, y, s.x, s.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  function addExplosion(x, y, r) {
    explosions.push({ x: x, y: y, r: r, life: 0.35, max: 0.35 });
    // chispas de la explosion
    for (var i = 0; i < 8; i++) {
      var a = rand(0, Math.PI * 2), sp = rand(60, 220);
      particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.25, 0.5), max: 0.5, col: '#fca5a5', r: rand(1.5, 3)
      });
    }
  }

  function addThruster(sh) {
    // pequenio penacho de propulsor detras de la nave indicada
    particles.push({
      x: sh.x - 26, y: sh.y + rand(-4, 4),
      vx: -rand(180, 260), vy: rand(-24, 24),
      life: 0.28, max: 0.28, col: sh.esquema === 'falcon' ? '#86efac' : '#67e8ff', r: rand(1.5, 3)
    });
  }

  function dropHeartChance(x, y) {
    // Las naves de la batalla espacial no sueltan corazones (contrato: la
    // recuperacion viene por hp lleno al empezar el nivel). Mantengo el
    // hook por si se quisiera activar; por ahora, no-op.
  }

  // --- Danio a una nave ----------------------------------------------------
  function hurtShip(sh) {
    if (sh.ko) return;
    if (sh.invuln > 0) return;
    if (phase !== 'waves' && phase !== 'boss') return;
    G.state[sh.hpKey] = Math.max(0, (G.state[sh.hpKey] | 0) - 1); // SIEMPRE 1 (medio corazon)
    sh.invuln = INVULN_TIME;
    flashTimer = 0.25;
    addShake(4);
    sfx('hurt');
    if ((G.state[sh.hpKey] | 0) <= 0) {
      if (!coop) {
        // 1 jugador: derrota directa (identico a hoy).
        phase = 'lose';
        winTimer = 0.6;
        return;
      }
      // Co-op: K.O. amable de esta nave.
      knockOut(sh);
    }
  }

  // K.O. de una nave (solo co-op). Pop suave y cuenta atras de reaparicion.
  function knockOut(sh) {
    sh.ko = true;
    sh.koTimer = KO_TIME;
    sh.invuln = 0;
    // pop suave de la nave al caer
    addExplosion(sh.x, sh.y, 26);
    sfx('hurt');
    // Si AMBAS naves estan K.O. a la vez -> gameover normal.
    if (aliveShips().length === 0) {
      phase = 'lose';
      winTimer = 0.6;
    }
  }

  // Reaparicion tras K.O.: entra por la izquierda con 6 hp e invuln 2s.
  function respawnShip(sh) {
    sh.ko = false;
    sh.koTimer = 0;
    G.state[sh.hpKey] = KO_RESPAWN_HP;
    sh.x = 90;
    sh.y = clamp(sh.y, 30, H - 30);
    sh.vx = 0; sh.vy = 0; sh.tilt = 0;
    sh.invuln = KO_INVULN;
    sh.shootTimer = 0;
    // chispitas de reentrada
    for (var k = 0; k < 8; k++) {
      var a = rand(0, 6.28), sp = rand(60, 160);
      particles.push({ x: sh.x, y: sh.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.6), max: 0.6, col: sh.esquema === 'falcon' ? '#86efac' : '#67e8ff', r: rand(1.5, 3) });
    }
    sfx('checkpoint');
  }

  // --- Spawns --------------------------------------------------------------
  function spawnSmall() {
    var y = rand(70, H - 70);
    var pattern = Math.random() < 0.5 ? 'line' : 'sine';
    enemies.push({
      type: 'small', hp: 1, maxHp: 1,
      x: W + 40, y: y, baseY: y,
      vx: -rand(180, 240), t: rand(0, 6.28),
      sineAmp: rand(30, 70), sineFreq: rand(2, 3.4),
      pattern: pattern, hacked: false, allyTime: 0,
      shootTimer: 999, r: 20
    });
  }

  function spawnMedium() {
    var y = rand(90, H - 90);
    enemies.push({
      type: 'medium', hp: 3, maxHp: 3,
      x: W + 50, y: y, baseY: y,
      vx: -rand(90, 130), t: rand(0, 6.28),
      sineAmp: rand(20, 46), sineFreq: rand(1.2, 2.0),
      pattern: 'sine', hacked: false, allyTime: 0,
      shootTimer: rand(1.0, 2.2), r: 26
    });
  }

  function spawnAsteroid() {
    var y = rand(40, H - 40);
    var r = rand(16, 34);
    asteroids.push({
      x: W + r + 20, y: y, r: r,
      vx: -rand(120, 210), vy: rand(-30, 30),
      spin: rand(-1.5, 1.5), ang: 0, seed: Math.floor(rand(1, 9999))
    });
  }

  function startBoss() {
    phase = 'boss';
    boss = {
      hp: BOSS_HP, maxHp: BOSS_HP,
      x: W + 120, y: H / 2,
      targetX: W - 190,
      entering: true,
      bobT: 0,
      stun: 0,                 // aturdido tras hackeo (4s)
      doubleDmg: 0,            // ventana de danio doble tras hackeo
      hackCdIndicatorPrev: false,
      // ciclo de ataques
      attackTimer: 2.2,
      attackState: 'idle',     // 'idle' | 'telegraph' | 'beam'
      beamTimer: 0,
      beamY: H / 2,
      r: 60
    };
  }

  function enemyFan(cx, cy, count, speed, spread) {
    // abanico de balas lentas dirigidas hacia -x (hacia el jugador)
    var base = Math.PI; // apunta a la izquierda
    var start = base - spread / 2;
    var step = count > 1 ? spread / (count - 1) : 0;
    for (var i = 0; i < count; i++) {
      var a = start + step * i;
      eLasers.push({
        x: cx, y: cy,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        w: 16, life: 6, col: '#f0a', gem: true
      });
    }
  }

  // --- Disparo del jugador -------------------------------------------------
  function firePlayerLaser(sh) {
    pLasers.push({
      x: sh.x + 26, y: sh.y,
      vx: LASER_SPEED, vy: 0, w: 22, ally: false, life: 2.2,
      col: sh.esquema === 'falcon' ? '#4ade80' : '#38bdf8'
    });
    sfx('laser');
    addShake(1);
  }

  function allyFireAt(e) {
    // una nave aliada dispara hacia el enemigo mas cercano (a la derecha)
    var tgt = null, best = 1e9;
    for (var i = 0; i < enemies.length; i++) {
      var o = enemies[i];
      if (o === e || o.hacked) continue;
      if (o.x > e.x - 30) {
        var d = G.dist(e.x, e.y, o.x, o.y);
        if (d < best) { best = d; tgt = o; }
      }
    }
    if (boss && phase === 'boss') {
      var db = G.dist(e.x, e.y, boss.x, boss.y);
      if (db < best) { best = db; tgt = boss; }
    }
    var vx = ALLY_LASER_SPEED, vy = 0;
    if (tgt) {
      var a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
      vx = Math.cos(a) * ALLY_LASER_SPEED;
      vy = Math.sin(a) * ALLY_LASER_SPEED;
    }
    pLasers.push({ x: e.x + 20, y: e.y, vx: vx, vy: vy, w: 18, ally: true, life: 2.0, col: '#4ade80' });
  }

  // --- Rayo de hackeo (por nave) -------------------------------------------
  function tryHack(sh) {
    if (sh.hackTimer > 0) return;
    // buscar la nave enemiga (no aliada) mas cercana dentro de alcance
    var tgt = null, best = HACK_RANGE;
    var i, e;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (e.hacked) continue;
      var d = G.dist(sh.x, sh.y, e.x, e.y);
      if (d < best) { best = d; tgt = e; }
    }
    // el jefe tambien es hackeable (lo aturde y le duplica el danio)
    var bossTarget = false;
    if (boss && phase === 'boss' && !boss.entering) {
      var db = G.dist(sh.x, sh.y, boss.x, boss.y);
      if (db < best) { best = db; tgt = boss; bossTarget = true; }
    }
    if (!tgt) { sfx('hackFail'); return; }

    sh.hackTimer = HACK_CD;
    hackBeam = { x1: sh.x + 24, y1: sh.y, x2: tgt.x, y2: tgt.y, life: 0.3 };
    sfx('hack');

    if (bossTarget) {
      boss.stun = 4.0;           // aturdido 4s
      boss.doubleDmg = 4.0;      // recibe danio doble mientras dura
      boss.attackState = 'idle';
      boss.attackTimer = Math.max(boss.attackTimer, 1.0);
      sfx('hackOk');
      addShake(3);
    } else {
      tgt.hacked = true;
      tgt.allyTime = HACK_ALLY_TIME;
      tgt.shootTimer = 0.4;
      sfx('hackOk');
      // chispitas verdes de conversion
      for (var k = 0; k < 10; k++) {
        var a = rand(0, 6.28), sp = rand(60, 160);
        particles.push({ x: tgt.x, y: tgt.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.6), max: 0.6, col: '#4ade80', r: rand(1.5, 3) });
      }
    }
  }

  // --- Colisiones auxiliares ----------------------------------------------
  function shipRect(sh) {
    return { x: sh.x - PLAYER_W / 2, y: sh.y - PLAYER_H / 2, w: PLAYER_W, h: PLAYER_H };
  }

  function circleHitsRect(cx, cy, cr, r) {
    var nx = clamp(cx, r.x, r.x + r.w);
    var ny = clamp(cy, r.y, r.y + r.h);
    var dx = cx - nx, dy = cy - ny;
    return (dx * dx + dy * dy) <= cr * cr;
  }

  // Crea una nave con su estado propio. hpKey/maxHpKey apuntan a G.state.
  function makeShip(id, x, esquema) {
    return {
      id: id, esquema: esquema,
      hpKey: id === 'P2' ? 'hp2' : 'hp',
      maxHpKey: id === 'P2' ? 'maxHp2' : 'maxHp',
      x: x, y: H / 2, vx: 0, vy: 0, invuln: 0, tilt: 0,
      shootTimer: 0, hackTimer: 0, hackReadyPrev: true,
      ko: false, koTimer: 0
    };
  }

  // ------------------------------------------------------------------------
  //  ESCENA
  // ------------------------------------------------------------------------
  G.scenes.level3 = {
    enter: function () {
      // Reinicio EXPLICITO de TODO el estado mutable (evita bugs fantasma
      // al reintentar tras gameover o volver desde el selector).
      coop = !!(G.state && G.state.coop);

      G.state.hp = G.state.maxHp;
      if (coop) G.state.hp2 = G.state.maxHp2;
      if (G.audio && G.audio.music) G.audio.music('space');

      t = 0;
      phase = 'waves';
      waveTimer = 0;
      spawnAcc = 0;
      spawnAstAcc = 0;
      medTimerAcc = 0;
      scroll = 0;

      // P1 (Director, azul). En co-op ademas P2 (Lord Falcon, esquema verde).
      player = makeShip('P1', 140, 'director');
      ships = [player];
      if (coop) {
        player.y = H / 2 - 40;
        var p2 = makeShip('P2', 140, 'falcon');
        p2.y = H / 2 + 40;
        ships.push(p2);
      }

      hackBeam = null;

      pLasers = [];
      eLasers = [];
      enemies = [];
      asteroids = [];
      particles = [];
      explosions = [];

      boss = null;
      shake = 0;
      flashTimer = 0;
      winTimer = 0;
    },

    exit: function () {
      // Limpieza de estado/temporizadores para no arrastrar nada a otra escena.
      pLasers = [];
      eLasers = [];
      enemies = [];
      asteroids = [];
      particles = [];
      explosions = [];
      boss = null;
      hackBeam = null;
      shake = 0;
      phase = 'lose';
    },

    update: function (dt) {
      t += dt;
      scroll += 90 * dt; // scroll del fondo

      // decaimiento de efectos globales
      if (shake > 0) shake = Math.max(0, shake - dt * 24);
      if (flashTimer > 0) flashTimer -= dt;
      if (hackBeam) { hackBeam.life -= dt; if (hackBeam.life <= 0) hackBeam = null; }

      // cooldown de hackeo + aviso "listo" por nave
      for (var s = 0; s < ships.length; s++) {
        var sh = ships[s];
        if (sh.hackTimer > 0) {
          sh.hackTimer = Math.max(0, sh.hackTimer - dt);
          if (sh.hackTimer === 0 && !sh.hackReadyPrev) {
            sh.hackReadyPrev = true;
            sfx('checkpoint'); // pitido sutil de "rayo listo"
          }
        }
        // temporizador de K.O. -> reaparecer
        if (sh.ko) {
          sh.koTimer -= dt;
          if (sh.koTimer <= 0) respawnShip(sh);
        }
      }

      // --- Fase perdida / victoria: solo animar y transicionar -----------
      if (phase === 'lose') {
        updateEffects(dt);
        winTimer -= dt;
        if (winTimer <= 0) { G.go('gameover', { retry: 'level3' }); }
        return;
      }
      if (phase === 'win') {
        updateEffects(dt);
        winTimer -= dt;
        // burbujeo de celebracion
        if (Math.random() < 0.4) {
          particles.push({ x: rand(0, W), y: rand(0, H), vx: rand(-40, 40), vy: rand(-90, -30), life: rand(0.4, 0.9), max: 0.9, col: '#fde047', r: rand(1.5, 3) });
        }
        if (winTimer <= 0) { G.go('levelDone', { level: 3 }); }
        return;
      }

      // --- Input + disparo + hackeo POR NAVE VIVA ------------------------
      for (var i = 0; i < ships.length; i++) {
        var sh2 = ships[i];
        if (sh2.ko) continue;
        var inp = inputFor(sh2);

        updateShip(sh2, inp, dt);

        // disparo mantenido
        sh2.shootTimer -= dt;
        if (inp.held('shoot') && sh2.shootTimer <= 0) {
          firePlayerLaser(sh2);
          sh2.shootTimer = SHOOT_CD;
        }

        // hackeo (pressed)
        if (inp.pressed('hack')) {
          if (sh2.hackTimer > 0) { sfx('hackFail'); }
          else { sh2.hackReadyPrev = false; tryHack(sh2); }
        }
      }

      // --- Oleadas o jefe -------------------------------------------------
      if (phase === 'waves') {
        updateWaves(dt);
      } else if (phase === 'boss') {
        updateBoss(dt);
      }

      // --- Entidades ------------------------------------------------------
      updateEnemies(dt);
      updateAsteroids(dt);
      updatePlayerLasers(dt);
      updateEnemyLasers(dt);
      updateEffects(dt);
    },

    render: function (ctx) {
      var sx = 0, sy = 0;
      if (shake > 0) { sx = rand(-shake, shake); sy = rand(-shake, shake); }
      ctx.save();
      ctx.translate(sx, sy);

      // Fondo con scroll parallax
      if (G.gfx && G.gfx.drawBgSpace) G.gfx.drawBgSpace(ctx, scroll, t);
      else { ctx.fillStyle = '#0a0a1e'; ctx.fillRect(-8, -8, W + 16, H + 16); }

      // Asteroides
      var i;
      for (i = 0; i < asteroids.length; i++) {
        var a = asteroids[i];
        if (G.gfx && G.gfx.drawAsteroid) G.gfx.drawAsteroid(ctx, a.x, a.y, a.r, a.seed);
      }

      // Naves enemigas / aliadas
      for (i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        var tp = (e.type === 'small') ? 'small' : 'medium';
        if (G.gfx && G.gfx.drawEnemyShip) {
          G.gfx.drawEnemyShip(ctx, e.x, e.y, { type: tp, hacked: e.hacked, t: t });
        }
        // barrita de vida de las medianas no hackeadas
        if (e.type === 'medium' && !e.hacked && e.hp < e.maxHp) {
          drawMiniBar(ctx, e.x, e.y - e.r - 10, 42, e.hp / e.maxHp, '#f87171');
        }
      }

      // Jefe
      if (boss) {
        if (G.gfx && G.gfx.drawEnemyShip) {
          G.gfx.drawEnemyShip(ctx, boss.x, boss.y, { type: 'guardian', hacked: false, t: t });
        }
        // telegrafia del rayo
        if (boss.attackState === 'telegraph') {
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 30);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.setLineDash([12, 10]);
          ctx.beginPath();
          ctx.moveTo(boss.x - boss.r, boss.beamY);
          ctx.lineTo(0, boss.beamY);
          ctx.stroke();
          ctx.restore();
          if (G.gfx && G.gfx.drawExclamation) G.gfx.drawExclamation(ctx, boss.x, boss.y - boss.r - 26);
        } else if (boss.attackState === 'beam') {
          ctx.save();
          var bw = 26 + 8 * Math.sin(t * 40);
          var grad = ctx.createLinearGradient(0, boss.beamY - bw, 0, boss.beamY + bw);
          grad.addColorStop(0, 'rgba(251,191,36,0)');
          grad.addColorStop(0.5, 'rgba(253,224,71,0.9)');
          grad.addColorStop(1, 'rgba(251,191,36,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, boss.beamY - bw, boss.x, bw * 2);
          ctx.restore();
        }
        if (boss.stun > 0 && G.gfx && G.gfx.drawSparkle) {
          G.gfx.drawSparkle(ctx, boss.x, boss.y - 20, (Math.sin(t * 8) + 1) / 2);
        }
      }

      // Lasers del jugador / aliados
      for (i = 0; i < pLasers.length; i++) {
        var pl = pLasers[i];
        if (G.gfx && G.gfx.drawLaserBolt) G.gfx.drawLaserBolt(ctx, pl.x, pl.y, pl.w, pl.col);
      }
      // Lasers enemigos
      for (i = 0; i < eLasers.length; i++) {
        var el = eLasers[i];
        if (el.gem && G.gfx && G.gfx.drawGem) {
          // orbe de gema del jefe
          G.gfx.drawGem(ctx, el.x, el.y, t);
        } else if (G.gfx && G.gfx.drawLaserBolt) {
          G.gfx.drawLaserBolt(ctx, el.x, el.y, el.w, el.col);
        }
      }

      // Particulas (propulsor, chispas)
      for (i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }

      // Explosiones
      for (i = 0; i < explosions.length; i++) {
        var ex = explosions[i];
        var t01 = 1 - (ex.life / ex.max);
        if (G.gfx && G.gfx.drawExplosion) G.gfx.drawExplosion(ctx, ex.x, ex.y, t01, ex.r);
      }

      // Rayo de hackeo (efecto momentaneo)
      if (hackBeam && G.gfx && G.gfx.drawHackBeam) {
        G.gfx.drawHackBeam(ctx, hackBeam.x1, hackBeam.y1, hackBeam.x2, hackBeam.y2, t);
      }

      // Naves de los jugadores (parpadean si invulnerables; ocultas si K.O.)
      for (i = 0; i < ships.length; i++) {
        var shp = ships[i];
        if (shp.ko) continue;
        var drawShip = true;
        if (shp.invuln > 0 && Math.floor(t * 20) % 2 === 0) drawShip = false;
        if (drawShip && G.gfx && G.gfx.drawPlayerShip) {
          G.gfx.drawPlayerShip(ctx, shp.x, shp.y, { tilt: shp.tilt, t: t, esquema: shp.esquema });
        }
      }

      ctx.restore(); // fin del shake

      // Destello de danio (encima de todo, sin shake)
      if (flashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(flashTimer / 0.25, 0, 1) * 0.35;
        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // --- HUD (fijo en pantalla) ----------------------------------------
      // Corazones: los pinta ui.drawHearts (P1 izq; en co-op ademas P2 der,
      // con etiquetas P1/P2). Aqui solo anadimos los indicadores de hackeo.
      if (G.ui && G.ui.drawHearts) G.ui.drawHearts(ctx);
      if (!coop) {
        // 1 jugador: circulo de hackeo arriba-derecha, EXACTAMENTE como hoy.
        drawHackHud(ctx, player, W - 46, 46);
      } else {
        // Co-op: el indicador de hackeo de cada nave va bajo SUS corazones.
        // P1 abajo-izquierda de su banco; P2 abajo-derecha del suyo.
        drawHackHud(ctx, player, 38, 108);
        if (player.ko) drawKoBanner(ctx, player, W * 0.30);
        var p2 = ships[1];
        drawHackHud(ctx, p2, W - 38, 108);
        if (p2 && p2.ko) drawKoBanner(ctx, p2, W * 0.70);
      }
      if (phase === 'boss' && boss) {
        if (G.ui && G.ui.drawBossBar) G.ui.drawBossBar(ctx, boss.hp / boss.maxHp, 'Nave Guardiana');
      }
      // aviso de progreso durante oleadas
      if (phase === 'waves') {
        drawWaveProgress(ctx);
      }
      if (phase === 'win') {
        drawWinBanner(ctx);
      }
    }
  };

  // ------------------------------------------------------------------------
  //  Sub-updates
  // ------------------------------------------------------------------------
  function updateShip(sh, inp, dt) {
    var ax = 0, ay = 0;
    if (inp.held('left')) ax -= 1;
    if (inp.held('right')) ax += 1;
    if (inp.held('up')) ay -= 1;
    if (inp.held('down')) ay += 1;
    // normalizar diagonal
    if (ax !== 0 && ay !== 0) { var inv = 0.7071; ax *= inv; ay *= inv; }
    sh.vx = ax * PLAYER_SPEED;
    sh.vy = ay * PLAYER_SPEED;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    // limites de pantalla (la nave ocupa toda la pantalla, no hay camara)
    sh.x = clamp(sh.x, 30, W - 30);
    sh.y = clamp(sh.y, 30, H - 30);
    // inclinacion visual segun movimiento vertical
    var targetTilt = ay * 0.35;
    sh.tilt = G.lerp(sh.tilt, targetTilt, Math.min(1, dt * 10));

    if (sh.invuln > 0) sh.invuln = Math.max(0, sh.invuln - dt);

    // penacho de propulsor
    addThruster(sh);
  }

  function updateWaves(dt) {
    waveTimer += dt;

    // Dificultad creciente: la cadencia de spawn baja con el tiempo.
    var prog = clamp(waveTimer / WAVES_END, 0, 1);
    var smallEvery = G.lerp(1.4, 0.7, prog);
    var medEvery = G.lerp(6.5, 3.2, prog);
    var astEvery = G.lerp(3.2, 1.6, prog);

    // Solo generamos enemigos DURANTE la fase de oleadas. Tras WAVES_END
    // dejamos de spawnear para que la pantalla se despeje y entre el jefe.
    if (waveTimer < WAVES_END) {
      spawnAcc += dt;
      if (spawnAcc >= smallEvery) {
        spawnAcc = 0;
        // rafaga: a veces 2-3 naves pequenias juntas segun progreso
        var n = 1 + (Math.random() < prog * 0.6 ? 1 : 0) + (Math.random() < prog * 0.3 ? 1 : 0);
        for (var i = 0; i < n; i++) spawnSmall();
      }

      // naves medianas a partir de ~10s
      if (waveTimer > 10) {
        // reutilizo spawnAstAcc-like local con un contador propio en el objeto? usamos t global
        medTimerAcc += dt;
        if (medTimerAcc >= medEvery) { medTimerAcc = 0; spawnMedium(); }
      }

      // asteroides desde el principio
      spawnAstAcc += dt;
      if (spawnAstAcc >= astEvery) { spawnAstAcc = 0; spawnAsteroid(); }
    }

    // fin de oleadas -> jefe (esperar a que la pantalla se despeje un poco)
    if (waveTimer >= WAVES_END) {
      // no arranca el jefe hasta que no queden demasiados enemigos activos
      var alive = 0;
      for (var k = 0; k < enemies.length; k++) if (!enemies[k].hacked) alive++;
      // margen extra: forzamos al jefe si tarda demasiado en despejarse.
      if (alive <= 1 || waveTimer >= WAVES_END + 8) {
        startBoss();
      }
    }
  }

  function updateBoss(dt) {
    // entrada del jefe
    if (boss.entering) {
      boss.x += (boss.targetX - boss.x) * Math.min(1, dt * 2.2);
      if (Math.abs(boss.x - boss.targetX) < 4) { boss.x = boss.targetX; boss.entering = false; }
      return;
    }

    boss.bobT += dt;
    boss.y = H / 2 + Math.sin(boss.bobT * 1.1) * 90;

    if (boss.doubleDmg > 0) boss.doubleDmg = Math.max(0, boss.doubleDmg - dt);

    if (boss.stun > 0) {
      boss.stun -= dt;
      // aturdido: no ataca
      return;
    }

    // Ciclo de ataques del jefe: abanico de balas lentas + rayo telegrafiado
    boss.attackTimer -= dt;

    if (boss.attackState === 'idle') {
      if (boss.attackTimer <= 0) {
        // elegir ataque
        if (Math.random() < 0.55) {
          // abanico de balas lentas
          enemyFan(boss.x - boss.r, boss.y, 5, ENEMY_LASER_SPEED, 1.1);
          sfx('laser');
          boss.attackTimer = 2.0;
        } else {
          // rayo telegrafiado: apunta a la nave viva mas cercana
          boss.attackState = 'telegraph';
          var tgt = nearestAliveShip(boss.x, boss.y);
          boss.beamY = tgt ? tgt.y : H / 2;
          boss.beamTimer = 0.9;  // aviso
          sfx('roar');
        }
      }
    } else if (boss.attackState === 'telegraph') {
      boss.beamTimer -= dt;
      if (boss.beamTimer <= 0) {
        boss.attackState = 'beam';
        boss.beamTimer = 0.7; // duracion del rayo
        sfx('laser');
        addShake(3);
      }
    } else if (boss.attackState === 'beam') {
      boss.beamTimer -= dt;
      // danio a cualquier nave viva en la franja del rayo
      for (var i = 0; i < ships.length; i++) {
        var sh = ships[i];
        if (sh.ko) continue;
        if (Math.abs(sh.y - boss.beamY) < 30 && sh.x < boss.x) {
          hurtShip(sh);
        }
      }
      if (boss.beamTimer <= 0) {
        boss.attackState = 'idle';
        boss.attackTimer = 1.8;
      }
    }
  }

  function updateEnemies(dt) {
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      e.t += dt;

      if (e.hacked) {
        // aliada: va hacia la derecha, se marcha, dispara a enemigos
        e.allyTime -= dt;
        e.x += Math.abs(e.vx) * 0.7 * dt; // avanza hacia +x
        e.y += Math.sin(e.t * 2) * 12 * dt;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          allyFireAt(e);
          e.shootTimer = 0.9;
          sfx('laser');
        }
        if (e.allyTime <= 0 || e.x > W + 60) {
          enemies.splice(i, 1);
          continue;
        }
      } else {
        // enemiga: se mueve hacia -x segun patron
        e.x += e.vx * dt;
        if (e.pattern === 'sine') {
          e.y = e.baseY + Math.sin(e.t * e.sineFreq) * e.sineAmp;
        }
        // disparo de las medianas: apunta a la nave viva mas cercana
        if (e.type === 'medium') {
          e.shootTimer -= dt;
          if (e.shootTimer <= 0 && e.x < W - 20 && e.x > 40) {
            var tgt = nearestAliveShip(e.x, e.y);
            if (tgt) {
              var a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
              eLasers.push({
                x: e.x - e.r, y: e.y,
                vx: Math.cos(a) * ENEMY_LASER_SPEED, vy: Math.sin(a) * ENEMY_LASER_SPEED,
                w: 16, life: 6, col: '#fb7185', gem: false
              });
              sfx('laser');
            }
            e.shootTimer = rand(1.8, 2.8);
          }
        }
        // colision con cualquier nave viva (contacto)
        for (var j = 0; j < ships.length; j++) {
          var sh = ships[j];
          if (sh.ko || sh.invuln > 0) continue;
          if (circleHitsRect(e.x, e.y, e.r * 0.8, shipRect(sh))) {
            hurtShip(sh);
          }
        }
        // fuera de pantalla por la izquierda
        if (e.x < -60) { enemies.splice(i, 1); continue; }
      }
    }
  }

  function updateAsteroids(dt) {
    for (var i = asteroids.length - 1; i >= 0; i--) {
      var a = asteroids[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.ang += a.spin * dt;
      // rebote suave arriba/abajo
      if (a.y < a.r) { a.y = a.r; a.vy = Math.abs(a.vy); }
      if (a.y > H - a.r) { a.y = H - a.r; a.vy = -Math.abs(a.vy); }
      // colision con cualquier nave viva
      for (var j = 0; j < ships.length; j++) {
        var sh = ships[j];
        if (sh.ko || sh.invuln > 0) continue;
        if (circleHitsRect(a.x, a.y, a.r * 0.85, shipRect(sh))) {
          hurtShip(sh);
        }
      }
      if (a.x < -a.r - 40) { asteroids.splice(i, 1); }
    }
  }

  function damageEnemy(e, dmg) {
    e.hp -= dmg;
    // flash de contacto
    for (var k = 0; k < 4; k++) {
      var a = rand(0, 6.28), sp = rand(40, 120);
      particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.15, 0.3), max: 0.3, col: '#fef08a', r: rand(1, 2.5) });
    }
    if (e.hp <= 0) {
      addExplosion(e.x, e.y, e.r + 6);
      sfx('explosion');
      addShake(2);
      return true;
    }
    return false;
  }

  function damageBoss(dmg) {
    var real = dmg * (boss.doubleDmg > 0 ? 2 : 1);
    boss.hp = Math.max(0, boss.hp - real);
    for (var k = 0; k < 5; k++) {
      var a = rand(0, 6.28), sp = rand(50, 140);
      particles.push({ x: boss.x - 20, y: boss.y + rand(-20, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.2, 0.4), max: 0.4, col: '#fca5a5', r: rand(1.5, 3) });
    }
    addShake(2);
    if (boss.hp <= 0) {
      // victoria
      addExplosion(boss.x, boss.y, 70);
      addExplosion(boss.x - 30, boss.y - 20, 40);
      addExplosion(boss.x + 20, boss.y + 25, 40);
      sfx('explosion');
      sfx('victory');
      addShake(4);
      boss = null;
      phase = 'win';
      winTimer = 2.4;
    }
  }

  function updatePlayerLasers(dt) {
    for (var i = pLasers.length - 1; i >= 0; i--) {
      var l = pLasers[i];
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.life -= dt;
      var removed = false;

      // los lasers aliados danian a enemigos y al jefe; los del jugador igual
      // (ambos estan en pLasers). No danian al jugador.
      // vs enemigos no hackeados
      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        if (e.hacked) continue;
        if (circleHitsRect(l.x, l.y, l.w * 0.4, { x: e.x - e.r, y: e.y - e.r, w: e.r * 2, h: e.r * 2 })) {
          var dead = damageEnemy(e, 1);
          if (dead) enemies.splice(j, 1);
          removed = true;
          break;
        }
      }
      if (removed) { pLasers.splice(i, 1); continue; }

      // vs jefe
      if (boss && !boss.entering) {
        if (circleHitsRect(l.x, l.y, l.w * 0.4, { x: boss.x - boss.r, y: boss.y - boss.r, w: boss.r * 2, h: boss.r * 2 })) {
          damageBoss(1);
          removed = true;
        }
      }
      if (removed) { pLasers.splice(i, 1); continue; }

      // fuera de pantalla o vida agotada
      if (l.life <= 0 || l.x < -30 || l.x > W + 30 || l.y < -30 || l.y > H + 30) {
        pLasers.splice(i, 1);
      }
    }
  }

  function updateEnemyLasers(dt) {
    for (var i = eLasers.length - 1; i >= 0; i--) {
      var l = eLasers[i];
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.life -= dt;
      // danio a la primera nave viva golpeada (todos los lasers enemigos = 1)
      var hit = false;
      for (var j = 0; j < ships.length; j++) {
        var sh = ships[j];
        if (sh.ko || sh.invuln > 0) continue;
        if (circleHitsRect(l.x, l.y, l.w * 0.4, shipRect(sh))) {
          hurtShip(sh);
          hit = true;
          break;
        }
      }
      if (hit) { eLasers.splice(i, 1); continue; }
      if (l.life <= 0 || l.x < -40 || l.x > W + 40 || l.y < -40 || l.y > H + 40) {
        eLasers.splice(i, 1);
      }
    }
  }

  function updateEffects(dt) {
    var i;
    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (i = explosions.length - 1; i >= 0; i--) {
      explosions[i].life -= dt;
      if (explosions[i].life <= 0) explosions.splice(i, 1);
    }
  }

  // ------------------------------------------------------------------------
  //  HUD helpers (fijos en pantalla)
  // ------------------------------------------------------------------------
  // Circulo de cooldown de hackeo de una nave, centrado en (cx,cy).
  function drawHackHud(ctx, sh, cx, cy) {
    if (!sh) return;
    var r = 22;
    var frac = sh.hackTimer > 0 ? 1 - (sh.hackTimer / HACK_CD) : 1;
    var accent = sh.esquema === 'falcon'
      ? { ready: '#22c55e', fill: '#15803d', icon: '#ecfdf5', lab: '#86efac', glow: '#4ade80' }
      : { ready: '#22d3ee', fill: '#0e7490', icon: '#e0f2fe', lab: '#a5f3fc', glow: '#67e8ff' };
    ctx.save();
    // fondo
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.2832);
    ctx.fillStyle = 'rgba(15,23,42,0.72)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a1a2e';
    ctx.stroke();
    // arco de relleno
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r - 3, -Math.PI / 2, -Math.PI / 2 + frac * 6.2832);
    ctx.closePath();
    ctx.fillStyle = frac >= 1 ? accent.ready : accent.fill;
    ctx.fill();
    // icono 'H'
    ctx.fillStyle = accent.icon;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', cx, cy + 1);
    // etiqueta
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = frac >= 1 ? accent.lab : '#64748b';
    ctx.fillText(frac >= 1 ? 'HACKEO' : 'CARGANDO', cx, cy + r + 12);
    // brillo cuando esta listo
    if (frac >= 1) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(G.T * 6);
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, 0, 6.2832);
      ctx.strokeStyle = accent.glow;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Cartel de K.O. "P1/P2 vuelve en Ns" (solo co-op).
  function drawKoBanner(ctx, sh, cx) {
    var secs = Math.max(0, Math.ceil(sh.koTimer));
    var txt = sh.id + ' vuelve en ' + secs + 's';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1a1a2e';
    ctx.strokeText(txt, cx, H / 2);
    ctx.fillStyle = sh.esquema === 'falcon' ? '#86efac' : '#67e8ff';
    ctx.fillText(txt, cx, H / 2);
    ctx.restore();
  }

  function drawMiniBar(ctx, cx, y, w, frac, col) {
    ctx.save();
    var x = cx - w / 2;
    ctx.fillStyle = 'rgba(15,23,42,0.8)';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w * clamp(frac, 0, 1), 4);
    ctx.restore();
  }

  function drawWaveProgress(ctx) {
    // barra fina superior que indica cuanto falta para el jefe
    var frac = clamp(waveTimer / WAVES_END, 0, 1);
    ctx.save();
    var bw = 220, bx = W / 2 - bw / 2, by = 16;
    ctx.fillStyle = 'rgba(15,23,42,0.65)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.fillStyle = '#a21caf';
    ctx.fillRect(bx, by, bw * frac, 8);
    ctx.fillStyle = '#f5d0fe';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(frac >= 1 ? '¡Se acerca la Nave Guardiana!' : 'Avance del sector', W / 2, by - 3);
    ctx.restore();
  }

  function drawWinBanner(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1a1a2e';
    ctx.strokeText('¡Sector despejado!', W / 2, H / 2 - 20);
    ctx.fillStyle = '#fde047';
    ctx.fillText('¡Sector despejado!', W / 2, H / 2 - 20);
    ctx.restore();
  }

})();
