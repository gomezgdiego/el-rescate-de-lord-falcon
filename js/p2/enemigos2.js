// ===========================================================================
//  El Rescate de Lord Falcon — PARTE 2 "La Gema Robada" — enemigos2.js
//  El ejército de Dark Secuaz para los niveles de plataformas (contrato §6-§7).
//
//  Registra en G.P2E.types los 8 tipos: boxeador, escudo, arana, minitorreta,
//  dronEnjambre, enjambre, dronRayo y dronPicado. El motor (plataformas2.js)
//  traduce las letras del mapa y llama a create / update / draw / rect / onHit.
//
//  Reglas de la casa: comportamientos AMABLES, todo ataque avisa antes con "!"
//  (world.spawnEffect('exclaim', …)), daño 1, proyectiles lentos.
//  Nunca lanza excepciones: cada función del registro va envuelta en try/catch.
// ===========================================================================
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  G.P2E = G.P2E || {};
  G.P2E.types = G.P2E.types || {};
  if (typeof G.P2E.register !== 'function') {
    G.P2E.register = function (tipo, def) { G.P2E.types[tipo] = def; };
  }

  // ---- Constantes ----------------------------------------------------------
  var GRAV = 1800, MAX_FALL = 900, TILE = 48;

  // ---- Utilidades seguras --------------------------------------------------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function sign(v) { return v < 0 ? -1 : 1; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function overlap(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function warn(e) { try { if (window.console && console.warn) console.warn('[enemigos2]', e); } catch (x) { /* nada */ } }

  function sfx(world, n) {
    try {
      if (world && typeof world.sfx === 'function') world.sfx(n);
      else if (G.audio) G.audio.sfx(n);
    } catch (e) { /* sin sonido */ }
  }
  function effect(world, kind, x, y, opts) {
    try { if (world && typeof world.spawnEffect === 'function') world.spawnEffect(kind, x, y, opts || {}); } catch (e) { warn(e); }
  }
  // Aviso "!" encima del enemigo (SIEMPRE antes de un ataque).
  function exclaim(world, e, life) {
    var x = e.x, top = e.flying ? e.y - e.h / 2 - 20 : e.y - e.h - 18;
    if (e.tipo === 'arana' && e.techo) { x = e.x + 38; top = e.y + 16; }   // colgada: el "!" a su lado
    effect(world, 'exclaim', x, top, { life: life || 0.6 });
  }
  function heroesOf(world) {
    try {
      var hs = world && typeof world.heroes === 'function' ? world.heroes() : null;
      return Array.isArray(hs) ? hs : [];
    } catch (e) { return []; }
  }
  function nearest(world, x, y) {
    try {
      if (world && typeof world.nearestHero === 'function') {
        var h = world.nearestHero(x, y);
        if (h && !h.ko) return h;
        return null;
      }
    } catch (e) { /* abajo */ }
    var best = null, bd = Infinity, hs = heroesOf(world);
    for (var i = 0; i < hs.length; i++) {
      var o = hs[i]; if (!o || o.ko) continue;
      var d = Math.abs(o.x - x) + Math.abs(o.y - y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function heroRect(h) {
    var w = num(h.w, 34), hh = num(h.h, 58);
    return { x: h.x - w / 2, y: h.y - hh, w: w, h: hh };
  }
  function heroCY(h) { return h.y - num(h.h, 58) / 2; }
  function solidAt(world, x, y) {
    try { return !!(world && typeof world.isSolidAt === 'function' && world.isSolidAt(x, y)); }
    catch (e) { return false; }
  }
  function hurt(world, h, dmg, fromX) {
    try { if (world && typeof world.hurtHero === 'function') world.hurtHero(h, dmg, fromX); } catch (e) { warn(e); }
  }
  function onScreen(world, x, y, m) {
    if (!world) return true;
    var cx = num(world.camX, NaN), cy = num(world.camY, NaN);
    if (isNaN(cx)) return true;
    var vw = num(world.viewW, 960), vh = num(world.viewH, 540);
    if (isNaN(cy)) cy = 0;
    return x > cx - m && x < cx + vw + m && y > cy - m && y < cy + vh + m;
  }

  // ---- Física de suelo -----------------------------------------------------
  // Gravedad + world.collide. (x, y) = pies.
  function groundStep(e, dt, world) {
    e.vy = Math.min(MAX_FALL, num(e.vy, 0) + GRAV * dt);
    var r = null;
    try { if (world && typeof world.collide === 'function') r = world.collide(e); } catch (x) { warn(x); }
    if (!r) {   // sin motor: movimiento libre (nunca se rompe)
      e.x += e.vx * dt; e.y += e.vy * dt; r = { onGround: false, hitWall: false, hitCeiling: false };
    }
    e.onGround = !!r.onGround;
    if (e.onGround && e.vy > 0) e.vy = 0;
    if (r.hitCeiling && e.vy < 0) e.vy = 0;
    if (!isFinite(e.x) || !isFinite(e.y)) { e.x = e.homeX; e.y = e.homeY; e.vx = 0; e.vy = 0; }
    return r;
  }
  // ¿Hay suelo delante? Si el motor no informa del suelo bajo los pies (p. ej.
  // una plataforma de una vía), no se puede saber: se supone que sí.
  function edgeAhead(e, world, dir) {
    if (!e.onGround) return false;
    var under = solidAt(world, e.x, e.y + 4);
    if (!under) return false;
    var ax = e.x + dir * (e.w / 2 + 6);
    return !solidAt(world, ax, e.y + 4);
  }
  function wallAhead(e, world, dir) {
    var ax = e.x + dir * (e.w / 2 + 4);
    return solidAt(world, ax, e.y - e.h / 2) || solidAt(world, ax, e.y - 6);
  }
  // Empujón (retroceso) que se aplica durante unos instantes.
  function applyKnock(e, dt, world) {
    if (e.knockT > 0) {
      e.knockT -= dt;
      // los de suelo nunca se caen de la plataforma por un empujón
      if (!e.flying && world && edgeAhead(e, world, sign(e.knockV))) { e.knockT = 0; return 0; }
      return e.knockV;
    }
    return 0;
  }

  function rectGround(e) { return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h }; }
  function rectFly(e) { return { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h }; }

  // Base común de todos los enemigos.
  function base(tipo, x, y, w, h, hp, flying) {
    return {
      tipo: tipo, x: num(x, 0), y: num(y, 0), w: w, h: h, hp: hp, maxHp: hp,
      alive: true, facing: -1, flying: !!flying, stun: 0, hacked: false, captured: false,
      vx: 0, vy: 0, onGround: false, homeX: num(x, 0), homeY: num(y, 0),
      state: 'idle', timer: 0, flash: 0, knockT: 0, knockV: 0, seed: Math.random() * 10
    };
  }
  // onHit común: parpadeo + retroceso suave. Devuelve true (recibe el daño).
  function hitFx(e, dmg, kind, fromX) {
    e.flash = 0.18;
    var away = sign(e.x - num(fromX, e.x - e.facing));
    e.knockV = away * (kind === 'guantes' ? 220 : 120);
    e.knockT = 0.12;
  }

  // Estrellitas de mareo (aturdido por el pulso).
  function drawDizzy(ctx, x, y, t) {
    for (var i = 0; i < 3; i++) {
      var a = t * 5 + i * 2.094;
      var sx = x + Math.cos(a) * 14, sy = y + Math.sin(a) * 4;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
      ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var r = (k % 2) ? 2.2 : 5, b = k * Math.PI / 5 - Math.PI / 2;
        if (k === 0) ctx.moveTo(Math.cos(b) * r, Math.sin(b) * r); else ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  // Parpadeo al recibir un golpe (alpha) — se llama dentro de un save/restore.
  function flashAlpha(ctx, e, t) {
    if (e.flash > 0) ctx.globalAlpha = (Math.floor(t * 30) % 2) ? 0.45 : 1;
  }
  function drawArt(name, ctx, x, y, o) {
    var P2 = window.P2;
    if (P2 && typeof P2.call === 'function' && P2.call(name, ctx, x, y, o)) return;
    // Plan B si falta el arte: un robot redondo con ojo rojo (nunca rompe).
    ctx.save();
    ctx.fillStyle = o && o.hacked ? '#22c55e' : '#64748b';
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 16, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o && o.hacked ? '#86efac' : '#ff4d4d';
    ctx.beginPath(); ctx.arc(x, y - 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---- Registro seguro -----------------------------------------------------
  // Envuelve cada función para que NUNCA lance una excepción al motor.
  function registerSafe(tipo, def) {
    var safe = {
      touchDamage: num(def.touchDamage, 1),
      capturable: !!def.capturable,
      hackable: !!def.hackable,
      create: function (world, x, y, opts) {
        try {
          var e = def.create(world, x, y, opts || {});
          if (e) return e;
        } catch (err) { warn(err); }
        var dead = base(tipo, x, y, 1, 1, 1, false); dead.alive = false; return dead;
      },
      update: function (e, dt, world) {
        if (!e || !e.alive || e.captured) return;
        try {
          dt = num(dt, 1 / 60);
          if (e.flash > 0) e.flash -= dt;
          def.update(e, dt, world);
        } catch (err) { warn(err); }
      },
      draw: function (ctx, e, world) {
        if (!ctx || !e || !e.alive) return;
        ctx.save();
        try { def.draw(ctx, e, world); } catch (err) { warn(err); }
        ctx.restore();
      },
      rect: function (e) {
        try { var r = def.rect(e); if (r) return r; } catch (err) { warn(err); }
        return { x: -99999, y: -99999, w: 0, h: 0 };
      },
      onHit: function (e, dmg, kind, fromX, world) {
        try { return !!def.onHit(e, dmg, kind, fromX, world); } catch (err) { warn(err); return true; }
      },
      onHacked: function (e, world) {
        try { if (def.onHacked) def.onHacked(e, world); } catch (err) { warn(err); }
      }
    };
    G.P2E.register(tipo, safe);
  }

  // =========================================================================
  //  ROBOT BOXEADOR (x) — 2 de vida. Patrulla ±3 tiles; si ve a un héroe a
  //  < 220 px y a su altura, se acerca, avisa "!" 0.5 s y lanza un puñetazo de
  //  60 px (1 de daño). Después descansa un poco. Capturable.
  // =========================================================================
  var BOX_PATROL = 3 * TILE, BOX_SEE = 220, BOX_REACH = 62;
  registerSafe('boxeador', {
    touchDamage: 1, capturable: true, hackable: false,
    create: function (world, x, y) {
      var e = base('boxeador', x, y, 34, 52, 2, false);
      e.state = 'patrol'; e.dir = Math.random() < 0.5 ? -1 : 1; e.facing = e.dir;
      e.cool = 0.6; e.hitSet = [];
      return e;
    },
    update: function (e, dt, world) {
      var kv = applyKnock(e, dt, world);
      if (e.stun > 0) {                                   // aturdido: quieto y sin atacar
        if (e.state !== 'patrol') { e.state = 'patrol'; e.cool = 0.8; }
        e.vx = kv; groundStep(e, dt, world); return;
      }
      if (e.hacked) { e.vx = kv; groundStep(e, dt, world); return; }   // amigo: se queda tranquilo
      e.cool = Math.max(0, e.cool - dt);
      var h = nearest(world, e.x, e.y);
      var dx = h ? h.x - e.x : 0, sameH = h ? Math.abs(h.y - e.y) < 40 : false;
      var speed = 0;

      if (e.state === 'patrol') {
        if (e.x > e.homeX + BOX_PATROL) e.dir = -1;
        if (e.x < e.homeX - BOX_PATROL) e.dir = 1;
        if (edgeAhead(e, world, e.dir) || wallAhead(e, world, e.dir)) e.dir = -e.dir;
        speed = 55; e.facing = e.dir;
        if (h && e.cool <= 0 && sameH && Math.abs(dx) < BOX_SEE) { e.state = 'chase'; }
      } else if (e.state === 'chase') {
        e.facing = sign(dx);
        if (!h || !sameH || Math.abs(dx) > BOX_SEE + 50 || Math.abs(e.x - e.homeX) > BOX_PATROL + 80) {
          e.state = 'patrol'; e.cool = 0.8;
        } else if (Math.abs(dx) < BOX_REACH + 8) {
          e.state = 'warn'; e.timer = 0.5; exclaim(world, e, 0.5); sfx(world, 'robot');
        } else if (!edgeAhead(e, world, e.facing) && !wallAhead(e, world, e.facing)) {
          speed = 105; e.dir = e.facing;
        }
      } else if (e.state === 'warn') {
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'punch'; e.timer = 0.3; e.hitSet = []; sfx(world, 'punch'); }
      } else if (e.state === 'punch') {
        e.timer -= dt;
        // golpe activo en la parte central del puñetazo
        if (e.timer < 0.26 && e.timer > 0.06) {
          var pr = e.facing > 0 ? { x: e.x, y: e.y - 46, w: BOX_REACH, h: 26 } : { x: e.x - BOX_REACH, y: e.y - 46, w: BOX_REACH, h: 26 };
          var hs = heroesOf(world);
          for (var i = 0; i < hs.length; i++) {
            var o = hs[i];
            if (!o || o.ko || e.hitSet.indexOf(o) >= 0) continue;
            if (overlap(pr, heroRect(o))) { e.hitSet.push(o); hurt(world, o, 1, e.x); }
          }
        }
        if (e.timer <= 0) { e.state = 'rest'; e.timer = 0.7; }
      } else if (e.state === 'rest') {
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'patrol'; e.cool = 0.9; }
      }
      e.vx = (speed ? e.facing * speed : 0) + kv;
      var r = groundStep(e, dt, world);
      if (r.hitWall && e.state === 'patrol') e.dir = -e.dir;
    },
    draw: function (ctx, e, world) {
      var t = num(world && world.t, 0);
      if (!onScreen(world, e.x, e.y, 120)) return;
      flashAlpha(ctx, e, t);
      var moving = Math.abs(e.vx) > 5 && e.onGround;
      var bob = moving ? -Math.abs(Math.sin(t * 12 + e.seed)) * 2.5 : 0;
      var shake = e.state === 'warn' ? Math.sin(t * 60) * 1.5 : 0;
      drawArt('boxeador', ctx, e.x + shake, e.y + bob, {
        scale: 0.95, facing: e.facing, hacked: e.hacked,
        pose: (e.state === 'punch') ? 'golpe' : 'guardia'
      });
      ctx.globalAlpha = 1;
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - e.h - 10, t);
    },
    rect: rectGround,
    onHit: function (e, dmg, kind, fromX) {
      if (e.hacked) return false;
      hitFx(e, dmg, kind, fromX);
      if (e.state === 'warn' || e.state === 'punch') { e.state = 'rest'; e.timer = 0.5; }   // un golpe interrumpe su ataque
      return true;
    }
  });

  // =========================================================================
  //  ROBOT CON ESCUDO (q) — 3 de vida. Camina despacio hacia el héroe más
  //  cercano y BLOQUEA DE FRENTE. Tarda en darse la vuelta: ¡ataca por detrás!
  //  La red y los guantes le empujan 20 px y sí le hacen efecto. Capturable.
  // =========================================================================
  registerSafe('escudo', {
    touchDamage: 1, capturable: true, hackable: false,
    create: function (world, x, y) {
      var e = base('escudo', x, y, 40, 64, 3, false);
      e.state = 'walk'; e.turnT = 0; e.block = 0;
      var h = nearest(world, x, y); e.facing = h ? sign(h.x - x) : -1;
      return e;
    },
    update: function (e, dt, world) {
      var kv = applyKnock(e, dt, world);
      if (e.block > 0) e.block -= dt;
      if (e.stun > 0 || e.hacked) { e.vx = kv; groundStep(e, dt, world); return; }
      var h = nearest(world, e.x, e.y), speed = 0;
      if (h && Math.abs(h.x - e.x) < 460 && Math.abs(h.y - e.y) < 140) {
        var dir = sign(h.x - e.x);
        if (dir !== e.facing && Math.abs(h.x - e.x) > 6) {
          // se gira despacito (da tiempo a golpearle la batería de la espalda)
          e.turnT += dt;
          if (e.turnT > 0.8) { e.facing = dir; e.turnT = 0; sfx(world, 'robot'); }
        } else {
          e.turnT = 0;
          if (Math.abs(h.x - e.x) > 30 && !edgeAhead(e, world, e.facing) && !wallAhead(e, world, e.facing)) speed = 40;
        }
      } else {
        e.turnT = 0;
      }
      e.vx = e.facing * speed + kv;
      groundStep(e, dt, world);
    },
    draw: function (ctx, e, world) {
      var t = num(world && world.t, 0);
      if (!onScreen(world, e.x, e.y, 120)) return;
      // punto débil: halo pulsante detrás (la batería de la espalda)
      if (!e.hacked) {
        var p = 0.5 + 0.5 * Math.sin(t * 6 + e.seed);
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.3 * p;
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(e.x - e.facing * 30, e.y - 42, 14 + 6 * p, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      flashAlpha(ctx, e, t);
      var moving = Math.abs(e.vx) > 5 && e.onGround;
      var bob = moving ? -Math.abs(Math.sin(t * 8 + e.seed)) * 2 : 0;
      drawArt('robotEscudo', ctx, e.x, e.y + bob, { scale: 0.9, facing: e.facing, hacked: e.hacked });
      ctx.globalAlpha = 1;
      if (e.block > 0) {   // chispa en el escudo al bloquear
        var sx = e.x + e.facing * 26, sy = e.y - 38;
        ctx.save(); ctx.globalAlpha = clamp(e.block / 0.25, 0, 1);
        ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3 + t * 4;
          ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 6);
          ctx.lineTo(sx + Math.cos(a) * 16, sy + Math.sin(a) * 16); ctx.stroke();
        }
        ctx.restore();
      }
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - e.h - 12, t);
    },
    rect: rectGround,
    onHit: function (e, dmg, kind, fromX, world) {
      if (e.hacked) return false;
      var fx = num(fromX, e.x);
      var fromFront = (fx === e.x) ? true : (sign(fx - e.x) === e.facing);
      if (fromFront) {
        if (kind === 'red' || kind === 'guantes') {
          // empujón de 20 px hacia atrás (0.1 s a 200 px/s) y sí le afecta
          e.knockV = -e.facing * 200; e.knockT = 0.1; e.flash = 0.18;
          return true;
        }
        e.block = 0.25;              // el motor pone el «clink» y la chispa
        return false;
      }
      hitFx(e, dmg, kind, fromX);
      return true;
    }
  });

  // =========================================================================
  //  ROBOT ARAÑA (a / A) — 1 de vida. En el suelo corretea y da saltitos.
  //  En el techo espera colgada; si pasa un héroe por debajo (±60 px) avisa
  //  "!" 0.6 s y cae (luego corretea como la de suelo). Capturable.
  // =========================================================================
  registerSafe('arana', {
    touchDamage: 1, capturable: true, hackable: false,
    create: function (world, x, y, opts) {
      var e = base('arana', x, y, 44, 30, 1, false);
      var techo;
      if (opts.techo === true || opts.techo === false) techo = opts.techo;
      else if (opts.letra === 'A' || opts.letter === 'A' || opts.char === 'A' || opts.ch === 'A' || opts.ceiling === true) techo = true;
      else techo = solidAt(world, x, y - 4) && !solidAt(world, x, y + 4);   // auto: ¿hay techo encima y aire debajo?
      e.techo = !!techo;
      e.anchorY = e.y;
      e.state = e.techo ? 'hang' : 'run';
      e.dir = Math.random() < 0.5 ? -1 : 1; e.facing = e.dir;
      e.hopT = rnd(0.8, 1.8);
      return e;
    },
    update: function (e, dt, world) {
      var kv = applyKnock(e, dt, world);
      if (e.state === 'hang') {
        if (e.stun > 0 || e.hacked) return;
        var hs = heroesOf(world);
        for (var i = 0; i < hs.length; i++) {
          var o = hs[i];
          if (!o || o.ko) continue;
          if (Math.abs(o.x - e.x) <= 60 && o.y > e.y && o.y - e.y < 520) {
            e.state = 'warnDrop'; e.timer = 0.6; exclaim(world, e, 0.6); sfx(world, 'robot');
            e.facing = sign(o.x - e.x);
            break;
          }
        }
        return;
      }
      if (e.state === 'warnDrop') {
        if (e.stun > 0) return;
        e.timer -= dt;
        if (e.timer <= 0) {
          // se suelta: ahora sus pies están en la parte baja del cuerpo colgante
          e.techo = false; e.state = 'fall';
          e.y = e.anchorY + e.h + 2; e.vy = 60; e.vx = 0;
        }
        return;
      }
      if (e.state === 'fall') {
        e.vx = kv;
        groundStep(e, dt, world);
        if (e.onGround) { e.state = 'run'; e.dir = e.facing; e.hopT = rnd(0.6, 1.2); effect(world, 'sparkle', e.x, e.y - 4, {}); }
        return;
      }
      // --- en el suelo ---
      if (e.stun > 0 || e.hacked) { e.vx = kv; groundStep(e, dt, world); return; }
      if (e.onGround) {
        if (edgeAhead(e, world, e.dir) || wallAhead(e, world, e.dir)) e.dir = -e.dir;
        e.hopT -= dt;
        if (e.hopT <= 0) {
          e.hopT = rnd(1.0, 2.0);
          // saltito pequeño, solo si no hay un borde cerca (no se tira al vacío)
          var far = e.x + e.dir * (e.w / 2 + 50);
          if (solidAt(world, far, e.y + 4) || !solidAt(world, e.x, e.y + 4)) e.vy = -330;
        }
      }
      e.facing = e.dir;
      e.vx = e.dir * 115 + kv;
      var r = groundStep(e, dt, world);
      if (r.hitWall) e.dir = -e.dir;
    },
    draw: function (ctx, e, world) {
      var t = num(world && world.t, 0);
      if (!onScreen(world, e.x, e.y, 120)) return;
      flashAlpha(ctx, e, t);
      if (e.state === 'hang' || e.state === 'warnDrop') {
        var shake = e.state === 'warnDrop' ? Math.sin(t * 60) * 2 : 0;
        var sway = e.state === 'hang' ? Math.sin(t * 1.5 + e.seed) * 1.5 : 0;
        // hilo de seda metálica hasta el techo
        ctx.save(); ctx.strokeStyle = 'rgba(226,232,240,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(e.x, e.anchorY); ctx.lineTo(e.x + sway, e.anchorY + 6); ctx.stroke(); ctx.restore();
        drawArt('robotArana', ctx, e.x + shake + sway, e.anchorY, { scale: 0.75, facing: e.facing, techo: true, hacked: e.hacked });
      } else {
        var bob = e.onGround ? -Math.abs(Math.sin(t * 16 + e.seed)) * 1.5 : 0;
        drawArt('robotArana', ctx, e.x, e.y + bob, { scale: 0.75, facing: e.facing, techo: false, hacked: e.hacked });
      }
      ctx.globalAlpha = 1;
      if (e.stun > 0) drawDizzy(ctx, e.x, (e.techo ? e.anchorY + e.h : e.y - e.h) - 8, t);
    },
    rect: function (e) {
      if (e.state === 'hang' || e.state === 'warnDrop') return { x: e.x - e.w / 2, y: e.anchorY, w: e.w, h: e.h };
      return rectGround(e);
    },
    onHit: function (e, dmg, kind, fromX) {
      if (e.hacked) return false;
      e.flash = 0.18;
      if (e.state !== 'hang' && e.state !== 'warnDrop') { e.knockV = sign(e.x - num(fromX, e.x)) * 120; e.knockT = 0.1; }
      return true;
    }
  });

  // =========================================================================
  //  MINI-TORRETA (t) — 3 de vida. Cada 2.2 s avisa "!" y dispara una bala
  //  lenta (200 px/s) al héroe más cercano (rango 420 px). HACKEABLE: se vuelve
  //  verde y dispara balas 'ally' a los enemigos.
  // =========================================================================
  var TUR_RANGE = 420, TUR_PERIOD = 2.2, TUR_WARN = 0.55;
  function turretMuzzle(e) {
    var a = e.angle, cy = e.y - 30;
    return { x: e.x + Math.cos(a) * 24, y: cy + Math.sin(a) * 24 };
  }
  function allyTarget(e, world) {
    var list = [];
    try { list = (world && typeof world.enemies === 'function') ? (world.enemies() || []) : []; } catch (x) { list = []; }
    var best = null, bd = 480;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (!o || o === e || !o.alive || o.hacked || o.captured || o.invisible || o.tipo === 'enjambre') continue;
      var oy = o.flying ? o.y : o.y - num(o.h, 40) / 2;
      var d = Math.sqrt((o.x - e.x) * (o.x - e.x) + (oy - (e.y - 30)) * (oy - (e.y - 30)));
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  registerSafe('minitorreta', {
    touchDamage: 1, capturable: false, hackable: true,
    create: function (world, x, y) {
      var e = base('minitorreta', x, y, 36, 46, 3, false);
      e.angle = Math.PI; e.shootT = rnd(1.0, TUR_PERIOD); e.warned = false; e.charge = 0;
      return e;
    },
    update: function (e, dt, world) {
      e.vx = 0; groundStep(e, dt, world);
      if (e.charge > 0) e.charge -= dt;
      if (e.stun > 0) { e.warned = false; return; }
      var cx = e.x, cy = e.y - 30;
      if (e.hacked) {
        var tg = allyTarget(e, world);
        if (tg) {
          var ty = tg.flying ? tg.y : tg.y - num(tg.h, 40) / 2;
          e.angle = Math.atan2(ty - cy, tg.x - cx);
        }
        e.shootT -= dt;
        if (e.shootT <= 0) {
          e.shootT = tg ? 1.4 : 0.3;
          if (tg) {
            var m = turretMuzzle(e);
            try {
              world.spawnProjectile({ x: m.x, y: m.y, vx: Math.cos(e.angle) * 320, vy: Math.sin(e.angle) * 320,
                r: 6, dmg: 1, from: 'ally', kind: 'bala', life: 2 });
            } catch (x) { warn(x); }
            sfx(world, 'laser');
          }
        }
        return;
      }
      var h = nearest(world, cx, cy);
      var inRange = false;
      if (h) {
        var hy = heroCY(h), d = Math.sqrt((h.x - cx) * (h.x - cx) + (hy - cy) * (hy - cy));
        inRange = d < TUR_RANGE;
        if (inRange || e.warned) e.angle = Math.atan2(hy - cy, h.x - cx);
      }
      e.shootT -= dt;
      if (!e.warned && e.shootT <= TUR_WARN) {
        if (inRange) { e.warned = true; e.charge = TUR_WARN; exclaim(world, e, TUR_WARN); }
        else e.shootT = TUR_WARN + 0.25;            // espera a que alguien esté a tiro
      }
      if (e.warned && e.shootT <= 0) {
        e.warned = false; e.shootT = TUR_PERIOD;
        var mz = turretMuzzle(e);
        try {
          world.spawnProjectile({ x: mz.x, y: mz.y, vx: Math.cos(e.angle) * 200, vy: Math.sin(e.angle) * 200,
            r: 7, dmg: 1, from: 'enemy', kind: 'bala', life: 3.5 });
        } catch (x) { warn(x); }
        sfx(world, 'laser');
      }
    },
    draw: function (ctx, e, world) {
      var t = num(world && world.t, 0);
      if (!onScreen(world, e.x, e.y, 120)) return;
      flashAlpha(ctx, e, t);
      var shake = e.charge > 0 ? Math.sin(t * 50) * 1.2 : 0;
      drawArt('miniTorreta', ctx, e.x + shake, e.y, { scale: 1, hacked: e.hacked, angle: e.angle });
      ctx.globalAlpha = 1;
      if (e.charge > 0 && !e.hacked) {   // brillo en la boca del cañón antes de disparar
        var m = turretMuzzle(e), k = 1 - clamp(e.charge / TUR_WARN, 0, 1);
        ctx.save(); ctx.globalAlpha = 0.35 + 0.5 * k; ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.arc(m.x, m.y, 3 + 6 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - e.h - 8, t);
    },
    rect: rectGround,
    onHit: function (e, dmg, kind, fromX) {
      if (e.hacked) return false;        // las aliadas verdes no se rompen por error
      e.flash = 0.18;
      return true;
    },
    onHacked: function (e, world) {
      e.hacked = true; e.warned = false; e.charge = 0; e.shootT = 0.8; e.angle = 0;
      effect(world, 'sparkle', e.x, e.y - 30, {});
    }
  });

  // =========================================================================
  //  DRON DE ENJAMBRE — 1 de vida. Vuela en formación (V, flecha, círculo)
  //  siguiendo a un "líder" invisible. Por turnos, uno avisa "!" y baja hacia
  //  el héroe, y luego vuelve a su sitio. Capturable.
  // =========================================================================
  var SHAPES = ['V', 'flecha', 'circulo'];
  // Franja de vuelo en pantalla: por debajo de la burbuja de ayuda y de las
  // medallas (arriba, hasta y≈170 en co-op) y por encima de la cabeza del héroe.
  var SWARM_TOP = 182;      // centro del dron más alto, en px desde arriba de la cámara
  var SWARM_HEAD = 100;     // centro del dron más bajo, como mínimo, px por encima de los pies
  function makeFormation(x, y) {
    return { x: x, y: y, members: [], lastT: null, shapeI: 0, shapeT: 0, diveT: 1.6, turn: 0,
             diver: null, dir: 1, seed: Math.random() * 10, sy: 1 };
  }
  function slotOffset(f, i, n) {
    var shape = SHAPES[f.shapeI % SHAPES.length];
    if (i === 0 && shape !== 'circulo') return { x: 0, y: 0 };
    var k = Math.ceil(i / 2), side = (i % 2) ? -1 : 1;
    if (shape === 'V') return { x: side * k * 34, y: -k * 24 };
    // flecha: cada dron un poco más atrás (si la formación se aplana, no se solapan)
    if (shape === 'flecha') return { x: -f.dir * i * 26, y: side * k * 22 };
    var a = (i / Math.max(1, n)) * Math.PI * 2 + f.shapeT * 0.8;
    return { x: Math.cos(a) * 64, y: Math.sin(a) * 34 };
  }
  // Cuánto sube y baja la forma actual respecto al líder (sin aplanar).
  function shapeExtents(f, n) {
    var shape = SHAPES[f.shapeI % SHAPES.length];
    if (n <= 1) return { up: 0, down: 0 };
    if (shape === 'circulo') return { up: 34, down: 34 };
    var k = Math.ceil((n - 1) / 2);
    if (shape === 'V') return { up: k * 24, down: 0 };
    return { up: k * 22, down: Math.floor((n - 1) / 2) * 22 };   // flecha
  }
  // Altura objetivo del líder y aplanado vertical para que toda la formación
  // quepa entre el borde de la ayuda (arriba) y la cabeza del héroe (abajo).
  // Si no cabe ni aplanada, manda la seguridad del héroe (no bajar más).
  function formationTarget(f, h, world, wob) {
    var ext = shapeExtents(f, f.members.length);
    var want = h.y - 210 + wob;
    var bottom = h.y - SWARM_HEAD;
    var cy = num(world && world.camY, NaN);
    var top = isNaN(cy) ? -Infinity : cy + SWARM_TOP;
    var s = 1;
    var room = bottom - top, span = ext.up + ext.down;
    if (span > 0 && room < span) s = clamp(room / span, 0.2, 1);
    var y = Math.max(want, top + ext.up * s);
    y = Math.min(y, bottom - ext.down * s);
    return { y: y, s: s, top: top };
  }
  function updateFormation(f, dt, world) {
    var t = num(world && world.t, 0);
    if (f.lastT === t) return;          // solo una vez por frame (la mueven todos sus drones)
    f.lastT = t;
    // limpia los que ya no vuelan con ella
    f.members = f.members.filter(function (m) { return m && m.alive && !m.captured && !m.hacked; });
    if (f.diver && (!f.diver.alive || f.diver.captured || f.diver.state === 'form')) f.diver = null;
    var h = nearest(world, f.x, f.y);
    var settled = true;
    if (h) {
      var tx = h.x + Math.sin(t * 0.7 + f.seed) * 140;
      var ft = formationTarget(f, h, world, Math.sin(t * 1.3 + f.seed) * 12);
      var ty = ft.y;
      f.sy = num(f.sy, 1); f.sy += (ft.s - f.sy) * Math.min(1, dt * 3);
      var dx = tx - f.x, dy = ty - f.y;
      f.dir = dx < 0 ? -1 : 1;
      // si aún está por encima de su franja (recién salida), baja más deprisa
      settled = !(f.y < ft.top - 6);
      var sp = (settled ? 95 : 230) * dt;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > sp) { f.x += dx / d * sp; f.y += dy / d * sp; } else { f.x = tx; f.y = ty; }
      if (!isFinite(f.x) || !isFinite(f.y)) { f.x = h.x; f.y = h.y - 210; }
    }
    f.shapeT += dt;
    if (f.shapeT > 5) { f.shapeT = 0; f.shapeI = (f.shapeI + 1) % SHAPES.length; }
    // turnos de picado: de uno en uno (y solo cuando ya vuela en su franja,
    // para que el "!" se vea bien, debajo de la burbuja de ayuda)
    if (!f.diver && f.members.length && h && settled) {
      f.diveT -= dt;
      if (f.diveT <= 0) {
        f.diveT = 2.2;
        for (var k = 0; k < f.members.length; k++) {
          var m = f.members[(f.turn + k) % f.members.length];
          if (m.state === 'form' && m.stun <= 0) {
            f.turn = (f.turn + k + 1) % Math.max(1, f.members.length);
            f.diver = m; m.state = 'warn'; m.timer = 0.5; exclaim(world, m, 0.5); sfx(world, 'robot');
            break;
          }
        }
      }
    }
  }
  registerSafe('dronEnjambre', {
    touchDamage: 1, capturable: true, hackable: false,
    create: function (world, x, y, opts) {
      var e = base('dronEnjambre', x, y, 28, 24, 1, true);
      var f = opts.formacion || opts.formation || opts.lider || opts.leader;
      if (!f || !Array.isArray(f.members)) f = makeFormation(x, y);
      e.form = f; f.members.push(e);
      e.state = 'form'; e.timer = 0; e.tx = x; e.ty = y;
      return e;
    },
    update: function (e, dt, world) {
      var f = e.form, t = num(world && world.t, 0);
      if (e.hacked) { e.y += Math.sin(t * 3 + e.seed) * 0.3; return; }
      if (f) updateFormation(f, dt, world);
      if (e.stun > 0) { if (e.state === 'warn' || e.state === 'dive') e.state = 'back'; return; }
      var kv = applyKnock(e, dt, world); e.x += kv * dt;
      var idx = f ? f.members.indexOf(e) : 0;
      var slot = f ? slotOffset(f, Math.max(0, idx), f.members.length) : { x: 0, y: 0 };
      var sx = (f ? f.x : e.homeX) + slot.x;
      var sy = (f ? f.y : e.homeY) + slot.y * (f ? num(f.sy, 1) : 1) + Math.sin(t * 4 + e.seed) * 4;
      if (e.state === 'form') {
        e.x += (sx - e.x) * Math.min(1, dt * 4); e.y += (sy - e.y) * Math.min(1, dt * 4);
        e.facing = f ? f.dir : e.facing;
      } else if (e.state === 'warn') {
        e.timer -= dt;
        var h = nearest(world, e.x, e.y);
        if (h) e.facing = sign(h.x - e.x);
        if (e.timer <= 0) {
          if (h) { e.tx = h.x; e.ty = heroCY(h); e.state = 'dive'; e.timer = 1.4; }
          else e.state = 'back';
        }
      } else if (e.state === 'dive') {
        e.timer -= dt;
        var dx = e.tx - e.x, dy = e.ty - e.y, d = Math.sqrt(dx * dx + dy * dy), sp = 250 * dt;
        if (d <= sp || e.timer <= 0 || solidAt(world, e.x, e.y + e.h / 2 + 2)) { e.state = 'back'; }
        else { e.x += dx / d * sp; e.y += dy / d * sp; e.facing = sign(dx); }
      } else {   // 'back': vuelve a su sitio en la formación
        var bx = sx - e.x, by = sy - e.y, bd = Math.sqrt(bx * bx + by * by), bs = 190 * dt;
        if (bd <= bs + 2) { e.state = 'form'; if (f && f.diver === e) f.diver = null; }
        else { e.x += bx / bd * bs; e.y += by / bd * bs; e.facing = sign(bx); }
      }
    },
    draw: function (ctx, e, world) {
      var t = num(world && world.t, 0);
      if (!onScreen(world, e.x, e.y, 80)) return;
      flashAlpha(ctx, e, t);
      var shake = e.state === 'warn' ? Math.sin(t * 60) * 1.5 : 0;
      var buzz = Math.sin(t * 40 + e.seed) * 0.8;
      drawArt('dronEnjambre', ctx, e.x + shake, e.y + buzz, { scale: 1, facing: e.facing, hacked: e.hacked });
      ctx.globalAlpha = 1;
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - 20, t);
    },
    rect: rectFly,
    onHit: function (e, dmg, kind, fromX) {
      if (e.hacked) return false;
      hitFx(e, dmg, kind, fromX);
      if (e.state === 'warn' || e.state === 'dive') e.state = 'back';
      return true;
    }
  });

  // =========================================================================
  //  ENJAMBRE (w) — generador invisible: cuando un héroe se acerca (< 500 px)
  //  crea 5–7 drones de enjambre en formación y desaparece (una sola vez).
  // =========================================================================
  registerSafe('enjambre', {
    touchDamage: 0, capturable: false, hackable: false,
    create: function (world, x, y) {
      var e = base('enjambre', x, y, 1, 1, 1, true);
      e.invisible = true; e.spawned = false;
      return e;
    },
    update: function (e, dt, world) {
      if (e.spawned) { e.alive = false; return; }
      var h = nearest(world, e.x, e.y);
      if (!h) return;
      var dx = h.x - e.x, dy = heroCY(h) - e.y;
      if (dx * dx + dy * dy >= 500 * 500) return;
      e.spawned = true; e.alive = false;
      var f = makeFormation(e.x, e.y);
      f.dir = dx < 0 ? -1 : 1;
      var n = 5 + Math.floor(Math.random() * 3);
      exclaim(world, e, 0.8);
      sfx(world, 'robot');
      for (var i = 0; i < n; i++) {
        var o = slotOffset(f, i, n);
        try {
          if (world && typeof world.spawnEnemy === 'function') {
            world.spawnEnemy('dronEnjambre', e.x + o.x, e.y + o.y, { formacion: f, slot: i });
          }
        } catch (x) { warn(x); }
      }
    },
    draw: function () { /* invisible */ },
    rect: function () { return { x: -99999, y: -99999, w: 0, h: 0 }; },
    onHit: function () { return false; }
  });

  // =========================================================================
  //  DRON DE RAYOS (r) — 2 de vida. Flota a media altura siguiendo al héroe a
  //  distancia; cada 3 s se para, carga 0.8 s (brillo + "!") y lanza un rayo
  //  horizontal (1 de daño, 0.4 s). El pulso lo aturde. Capturable.
  // =========================================================================
  var RAY_KEEP = 230, RAY_LEN = 460;
  function rayLens(e) { return { x: e.x + e.facing * 21, y: e.y + 10 }; }
  registerSafe('dronRayo', {
    touchDamage: 1, capturable: true, hackable: false,
    create: function (world, x, y) {
      var e = base('dronRayo', x, y, 44, 34, 2, true);
      e.state = 'follow'; e.timer = rnd(2.0, 3.0);
      var h = nearest(world, x, y); e.facing = h ? sign(h.x - x) : -1;
      return e;
    },
    update: function (e, dt, world) {
      var t = num(world && world.t, 0);
      if (e.hacked) { e.y += Math.sin(t * 2 + e.seed) * 0.3; return; }
      if (e.stun > 0) {
        if (e.state !== 'follow') { e.state = 'follow'; e.timer = 1.5; }
        return;
      }
      var kv = applyKnock(e, dt, world); e.x += kv * dt;
      var h = nearest(world, e.x, e.y);
      if (e.state === 'follow') {
        if (h) {
          var side = sign(e.x - h.x);
          var tx = h.x + side * RAY_KEEP, ty = h.y - 39 + Math.sin(t * 2 + e.seed) * 6;
          var dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy), sp = 85 * dt;
          if (d > sp) { e.x += dx / d * sp; e.y += dy / d * sp; }
          e.facing = sign(h.x - e.x);
        }
        e.timer -= dt;
        if (e.timer <= 0) {
          if (h && Math.abs(h.x - e.x) < RAY_LEN && Math.abs(heroCY(h) - e.y) < 160) {
            e.state = 'charge'; e.timer = 0.8; exclaim(world, e, 0.8); sfx(world, 'zap');
          } else e.timer = 0.5;
        }
      } else if (e.state === 'charge') {
        e.timer -= dt;
        if (e.timer <= 0) {
          var L = rayLens(e), x2 = L.x;
          // el rayo se corta en la primera pared
          for (var s = 12; s <= RAY_LEN; s += 12) {
            x2 = L.x + e.facing * s;
            if (solidAt(world, x2, L.y)) break;
          }
          try {
            world.spawnBeam({ x1: L.x, y1: L.y, x2: x2, y2: L.y, dmg: 1, from: 'enemy', life: 0.4, width: 10 });
          } catch (x) { warn(x); }
          sfx(world, 'laser');
          e.state = 'fire'; e.timer = 0.4;
        }
      } else if (e.state === 'fire') {
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'cool'; e.timer = 0.5; }
      } else {
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'follow'; e.timer = 3; }
      }
    },
    draw: function (ctx, e, world) {
      var t = num(world && world.t, 0);
      if (!onScreen(world, e.x, e.y, 100)) return;
      flashAlpha(ctx, e, t);
      var bob = (e.state === 'follow') ? Math.sin(t * 3 + e.seed) * 1.5 : 0;
      var shake = (e.state === 'charge') ? Math.sin(t * 70) * 1.2 : 0;
      drawArt('dronRayo', ctx, e.x + shake, e.y + bob, {
        scale: 1, facing: e.facing, hacked: e.hacked,
        cargando: e.state === 'charge' || e.state === 'fire', aturdido: e.stun > 0
      });
      ctx.globalAlpha = 1;
      if (e.state === 'charge') {   // la lente se va llenando de luz
        var L = rayLens(e), k = 1 - clamp(e.timer / 0.8, 0, 1);
        ctx.save(); ctx.globalAlpha = 0.25 + 0.45 * k; ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.arc(L.x, L.y, 6 + 10 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - 26, t);
    },
    rect: rectFly,
    onHit: function (e, dmg, kind, fromX) {
      if (e.hacked) return false;
      hitFx(e, dmg, kind, fromX);
      return true;
    }
  });

  // =========================================================================
  //  DRON EN PICADO (p) — 1 de vida. Vuela alto; cuando hay un héroe debajo,
  //  se para, avisa "!" 0.6 s y se lanza en picado (360 px/s) hacia donde
  //  estaba el héroe. Si falla, sube y repite. Capturable.
  // =========================================================================
  registerSafe('dronPicado', {
    touchDamage: 1, capturable: true, hackable: false,
    create: function (world, x, y) {
      var e = base('dronPicado', x, y, 40, 24, 1, true);
      e.state = 'cruise'; e.timer = 0.8; e.angle = Math.PI; e.facing = -1;
      return e;
    },
    update: function (e, dt, world) {
      var t = num(world && world.t, 0);
      if (e.hacked) { e.y += Math.sin(t * 2 + e.seed) * 0.3; return; }
      if (e.stun > 0) {
        if (e.state === 'warn' || e.state === 'dive') { e.state = 'climb'; }
        return;
      }
      var kv = applyKnock(e, dt, world); e.x += kv * dt;
      var h = nearest(world, e.x, e.y);
      if (e.state === 'cruise') {
        e.timer -= dt;
        if (h) {
          var dx = h.x - e.x;
          if (Math.abs(dx) > 6) { e.facing = sign(dx); e.x += e.facing * Math.min(Math.abs(dx), 80 * dt); }
          e.y += (e.homeY + Math.sin(t * 2 + e.seed) * 8 - e.y) * Math.min(1, dt * 3);
          if (e.timer <= 0 && Math.abs(dx) < 40 && h.y > e.y + 40 && h.y - e.y < 560) {
            e.state = 'warn'; e.timer = 0.6; exclaim(world, e, 0.6); sfx(world, 'robot');
            e.tx = h.x; e.ty = heroCY(h);
          }
        }
        e.angle = e.facing > 0 ? 0 : Math.PI;
      } else if (e.state === 'warn') {
        e.timer -= dt;
        e.angle = Math.atan2(e.ty - e.y, e.tx - e.x);
        if (e.timer <= 0) { e.state = 'dive'; e.timer = 1.6; sfx(world, 'boost'); }
      } else if (e.state === 'dive') {
        e.timer -= dt;
        var ddx = e.tx - e.x, ddy = e.ty - e.y, d = Math.sqrt(ddx * ddx + ddy * ddy), sp = 360 * dt;
        e.angle = Math.atan2(ddy, ddx);
        var nx = e.x + (d > 0 ? ddx / d * sp : 0), ny = e.y + (d > 0 ? ddy / d * sp : 0);
        if (solidAt(world, nx, ny + e.h / 2)) { e.state = 'climb'; effect(world, 'sparkle', e.x, e.y + e.h / 2, {}); }
        else if (d <= sp || e.timer <= 0) { e.x = nx; e.y = ny; e.state = 'climb'; }
        else { e.x = nx; e.y = ny; }
      } else if (e.state === 'climb') {
        var cy = e.homeY - e.y, cs = 150 * dt;
        e.angle = -Math.PI / 2 + e.facing * 0.5;
        if (Math.abs(cy) <= cs) { e.y = e.homeY; e.state = 'cruise'; e.timer = 1.0; }
        else e.y += sign(cy) * cs;
      }
    },
    draw: function (ctx, e, world) {
      var t = num(world && world.t, 0);
      if (!onScreen(world, e.x, e.y, 100)) return;
      flashAlpha(ctx, e, t);
      var shake = e.state === 'warn' ? Math.sin(t * 60) * 1.5 : 0;
      drawArt('dronPicado', ctx, e.x + shake, e.y, { scale: 1, angle: e.angle, hacked: e.hacked });
      ctx.globalAlpha = 1;
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - 20, t);
    },
    rect: rectFly,
    onHit: function (e, dmg, kind, fromX) {
      if (e.hacked) return false;
      hitFx(e, dmg, kind, fromX);
      if (e.state === 'warn' || e.state === 'dive') e.state = 'climb';
      return true;
    }
  });
})();
