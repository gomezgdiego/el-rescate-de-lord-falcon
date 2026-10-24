// ===========================================================================
//  El Rescate de Lord Falcon — PARTE 3 "We Are a Team" — enemigos3.js
//  Dueño: enemigos. Contrato técnico de la Parte 3, §10 (y §9.4).
//
//  Registra en G.P3E.types los 6 tipos de la Parte 3:
//    practicaBoxeador (u) · practicaDron (v) · practicaTorreta (z) ·
//    practicaEscudo (k)   · miniRobot (m)    · taladrin (n)
//  con la misma interfaz que G.P2E: create / update / draw / rect / onHit,
//  touchDamage, hackable, onHacked (y practica: true en los de práctica).
//
//  Reglas de la casa: comportamientos AMABLES, todo ataque avisa antes con "!"
//  (≥ 0,8 s; 1,0 s la lluvia de mini-robots, que es un ataque de jefe), daño 1,
//  proyectiles lentos. Los robots de práctica de Dark Secuaz se DIBUJAN verdes
//  (hacked: true en el arte) pero NO ponen e.hacked (siguen siendo rivales):
//  llevan encima una diana blanca y roja, guantes de espuma (el boxeador) y una
//  barrita de vida para que nadie los confunda con un amigo hackeado.
//  Nunca lanza excepciones: cada función del registro va envuelta en try/catch.
// ===========================================================================
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  // ---- Registro seguro sin orden de carga (§1, §10) --------------------------
  G.P3E = G.P3E || { types: {} };
  G.P3E.types = G.P3E.types || {};
  G.P3E.register = G.P3E.register || function (tipo, def) { G.P3E.types[tipo] = def; };

  // ---- Constantes ----------------------------------------------------------
  var GRAV = 1800, MAX_FALL = 900, TILE = 48;
  var OUT = '#1a1a2e';
  // Alto del arte a escala 1, por si datos-arte3.js faltara (§2.5, §16.4).
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };
  function altoArte(n) {
    var P2 = window.P2;
    var v = (P2 && P2.P3ALTO && typeof P2.P3ALTO[n] === 'number') ? P2.P3ALTO[n] : 0;
    return (v > 0) ? v : (ALTO_POR_DEFECTO[n] || 40);
  }

  // ---- Utilidades seguras --------------------------------------------------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function sign(v) { return v < 0 ? -1 : 1; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function overlap(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  var warned = {};
  function warn(where, e) {
    if (warned[where]) return;
    warned[where] = true;
    try { if (window.console && console.warn) console.warn('[enemigos3] ' + where, e); } catch (x) { /* nada */ }
  }
  function wt(world) { return num(world && world.t, num(G.T, 0)); }

  function sfx(world, n) {
    try {
      if (world && typeof world.sfx === 'function') world.sfx(n);
      else if (G.audio) G.audio.sfx(n);
    } catch (e) { /* sin sonido */ }
  }
  function effect(world, kind, x, y, opts) {
    try { if (world && typeof world.spawnEffect === 'function') world.spawnEffect(kind, x, y, opts || {}); } catch (e) { warn('effect', e); }
  }
  // Aviso en el suelo ("!" + círculo). El motor ya dibuja su propio "!" en
  // sueloY - 40; solo si no hay spawnWarning se pone un "!" de respaldo.
  function warning(world, x, sueloY, r, life) {
    try {
      if (world && typeof world.spawnWarning === 'function') { world.spawnWarning(x, sueloY, { r: r, life: life }); return; }
    } catch (e) { warn('warning', e); }
    effect(world, 'exclaim', x, sueloY - 40, { life: life });
  }
  // Aviso "!" encima del enemigo (SIEMPRE antes de un ataque). En los de suelo
  // va por encima de la barrita de vida (que está en e.y - e.h - 16), para que
  // el niño vea la vida que le queda al robot mientras decide.
  function exclaim(world, e, life) {
    var top = e.flying ? e.y - e.h / 2 - 22 : e.y - e.h - 38;
    effect(world, 'exclaim', e.x, top, { life: life });
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
        return (h && !h.ko) ? h : null;
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
  function solidAt(world, x, y) {
    try { return !!(world && typeof world.isSolidAt === 'function' && world.isSolidAt(x, y)); }
    catch (e) { return false; }
  }
  function hurt(world, h, dmg, fromX, opts) {
    try { if (world && typeof world.hurtHero === 'function') return world.hurtHero(h, dmg, fromX, opts); } catch (e) { warn('hurt', e); }
    return 'nada';
  }
  function onScreen(world, x, y, m) {
    if (!world) return true;
    var cx = num(world.camX, NaN), cy = num(world.camY, 0);
    if (isNaN(cx)) return true;
    var vw = num(world.viewW, 960), vh = num(world.viewH, 540);
    return x > cx - m && x < cx + vw + m && y > cy - m && y < cy + vh + m;
  }

  // ---- Física de suelo (x, y = pies) ---------------------------------------
  function groundStep(e, dt, world) {
    e.vy = Math.min(MAX_FALL, num(e.vy, 0) + GRAV * dt);
    var r = null;
    try { if (world && typeof world.collide === 'function') r = world.collide(e); } catch (x) { warn('collide', x); }
    if (!r) {   // sin motor: suelo plano en homeY (nunca se rompe)
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.y >= e.homeY) { e.y = e.homeY; e.vy = 0; r = { onGround: true }; } else r = { onGround: false };
    }
    e.onGround = !!r.onGround;
    if (e.onGround && e.vy > 0) e.vy = 0;
    if (r.hitCeiling && e.vy < 0) e.vy = 0;
    if (!isFinite(e.x) || !isFinite(e.y)) { e.x = e.homeX; e.y = e.homeY; e.vx = 0; e.vy = 0; }
    return r;
  }
  // ¿Se acaba el suelo delante? (no se caen de las plataformas: giran)
  function edgeAhead(e, world, dir) {
    if (!e.onGround || !world || typeof world.isSolidAt !== 'function') return false;
    if (!solidAt(world, e.x, e.y + 4)) return false;
    return !solidAt(world, e.x + dir * (e.w / 2 + 6), e.y + 4);
  }
  function wallAhead(e, world, dir) {
    var ax = e.x + dir * (e.w / 2 + 4);
    return solidAt(world, ax, e.y - e.h / 2) || solidAt(world, ax, e.y - 6);
  }
  function applyKnock(e, dt, world) {
    if (e.knockT > 0) {
      e.knockT -= dt;
      if (!e.flying && edgeAhead(e, world, sign(e.knockV))) { e.knockT = 0; return 0; }
      return e.knockV;
    }
    return 0;
  }
  function rectGround(e) { return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h }; }
  function rectFly(e) { return { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h }; }

  function base(tipo, x, y, w, h, hp, flying) {
    return {
      tipo: tipo, x: num(x, 0), y: num(y, 0), w: w, h: h, hp: hp, maxHp: hp,
      alive: true, facing: -1, flying: !!flying, stun: 0, hacked: false,
      vx: 0, vy: 0, onGround: false, homeX: num(x, 0), homeY: num(y, 0),
      state: 'idle', timer: 0, flash: 0, knockT: 0, knockV: 0, seed: Math.random() * 10
    };
  }
  function hitFx(e, kind, fromX) {
    e.flash = 0.18;
    var away = sign(e.x - num(fromX, e.x - e.facing));
    e.knockV = away * (kind === 'guantes' ? 220 : 120);
    e.knockT = 0.12;
  }

  // ---- Dibujo: primitivas con respaldo -------------------------------------
  function circ(ctx, x, y, r, fill, stroke, lw) {
    var P2 = window.P2;
    if (P2 && typeof P2.circ === 'function') { P2.circ(ctx, x, y, r, fill, stroke, lw); return; }
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function rf(ctx, x, y, w, h, r, fill, stroke, lw) {
    var P2 = window.P2;
    if (P2 && typeof P2.rf === 'function') { P2.rf(ctx, x, y, w, h, r, fill, stroke, lw); return; }
    ctx.beginPath(); ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, col, lw) {
    var P2 = window.P2;
    if (P2 && typeof P2.line === 'function') { P2.line(ctx, x1, y1, x2, y2, col, lw); return; }
    ctx.strokeStyle = col; ctx.lineWidth = lw || 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function poly(ctx, pts, fill, stroke, lw) {
    var P2 = window.P2;
    if (P2 && typeof P2.poly === 'function') { P2.poly(ctx, pts, fill, stroke, lw); return; }
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function eyeLight(ctx, x, y, r, col) {
    var P2 = window.P2;
    if (P2 && typeof P2.eyeLight === 'function') { P2.eyeLight(ctx, x, y, r, col); return; }
    circ(ctx, x, y, r, col, OUT, 1.5); circ(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, '#ffffff', null);
  }
  // Arte aprobado con respaldo: si falta, un robot redondo (verde si es de práctica).
  function drawArt(name, ctx, x, y, o, centro) {
    var P2 = window.P2;
    try { if (P2 && typeof P2.call === 'function' && P2.call(name, ctx, x, y, o)) return; } catch (e) { warn('art-' + name, e); }
    ctx.save();
    var cy = centro ? y : y - 18, r = centro ? 13 : 18;
    circ(ctx, x, cy, r, (o && o.hacked) ? '#22c55e' : '#64748b', OUT, 3);
    circ(ctx, x + 4 * num(o && o.facing, 1), cy - 3, 5, (o && o.hacked) ? '#bbf7d0' : '#ff4d4d', OUT, 1.5);
    ctx.restore();
  }

  // Diana de práctica: blanca y roja, con borde oscuro (centro x, y; radio r).
  function diana(ctx, x, y, r) {
    circ(ctx, x, y, r + 1.5, '#ffffff', OUT, 2);
    circ(ctx, x, y, r * 0.78, '#ef4444', null);
    circ(ctx, x, y, r * 0.52, '#ffffff', null);
    circ(ctx, x, y, r * 0.27, '#ef4444', null);
    circ(ctx, x - r * 0.35, y - r * 0.45, Math.max(1, r * 0.16), 'rgba(255,255,255,0.9)', null);
  }
  // Guante de espuma naranja (blandito, con puño blanco).
  function guanteEspuma(ctx, x, y, r, dir) {
    rf(ctx, x - dir * r * 0.95 - r * 0.25, y - r * 0.45, r * 0.5, r * 0.9, r * 0.2, '#fff7ed', OUT, 1.6);   // puño blanco
    circ(ctx, x, y, r, '#fb923c', OUT, 2.2);
    circ(ctx, x + dir * r * 0.15, y - r * 0.35, r * 0.42, '#fdba74', null);           // brillo esponjoso
    circ(ctx, x + dir * r * 0.55, y + r * 0.25, r * 0.38, '#f97316', OUT, 1.4);       // pulgar
  }
  // Barrita de vida encima de los robots de práctica (centro x, borde superior y).
  function barraVida(ctx, e, x, y) {
    if (!(e.maxHp > 1)) return;
    var w = 34, h = 6, f = clamp(e.hp / e.maxHp, 0, 1);
    rf(ctx, x - w / 2 - 1, y - 1, w + 2, h + 2, 3, '#0f172a', OUT, 1.5);
    if (f > 0) rf(ctx, x - w / 2 + 1, y + 1, Math.max(2, (w - 2) * f), h - 2, 2, f > 0.5 ? '#4ade80' : '#facc15', null);
    for (var i = 1; i < e.maxHp; i++) line(ctx, x - w / 2 + w * i / e.maxHp, y + 1, x - w / 2 + w * i / e.maxHp, y + h - 1, 'rgba(15,23,42,0.8)', 1);
  }
  // Estrellitas de mareo.
  function drawDizzy(ctx, x, y, t) {
    for (var i = 0; i < 3; i++) {
      var a = t * 5 + i * 2.094;
      var sx = x + Math.cos(a) * 14, sy = y + Math.sin(a) * 4;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
      ctx.fillStyle = '#fde047'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var r = (k % 2) ? 2.2 : 5, b = k * Math.PI / 5 - Math.PI / 2;
        if (k === 0) ctx.moveTo(Math.cos(b) * r, Math.sin(b) * r); else ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  function flashAlpha(ctx, e, t) {
    if (e.flash > 0) ctx.globalAlpha = (Math.floor(t * 30) % 2) ? 0.45 : 1;
  }

  // ---- Registro seguro: nada lanza hacia el motor ---------------------------
  function registerSafe(tipo, def) {
    var safe = {
      touchDamage: num(def.touchDamage, 1),
      hackable: false,
      capturable: false,
      practica: !!def.practica,
      create: function (world, x, y, opts) {
        try {
          var e = def.create(world, num(x, 0), num(y, 0), opts || {});
          if (e) return e;
        } catch (err) { warn('create-' + tipo, err); }
        var dead = base(tipo, x, y, 1, 1, 1, false); dead.alive = false; return dead;
      },
      update: function (e, dt, world) {
        if (!e || !e.alive) return;
        try {
          dt = clamp(num(dt, 1 / 60), 0, 0.1);
          if (e.flash > 0) e.flash -= dt;
          def.update(e, dt, world);
        } catch (err) { warn('update-' + tipo, err); }
      },
      draw: function (ctx, e, world) {
        if (!ctx || !e || !e.alive) return;
        ctx.save();
        try { def.draw(ctx, e, world); } catch (err) { warn('draw-' + tipo, err); }
        ctx.restore();
      },
      rect: function (e) {
        try { var r = def.rect(e); if (r) return r; } catch (err) { warn('rect-' + tipo, err); }
        return { x: -99999, y: -99999, w: 0, h: 0 };
      },
      onHit: function (e, dmg, kind, fromX, world) {
        try { return !!def.onHit(e, num(dmg, 1), kind, fromX, world); } catch (err) { warn('onHit-' + tipo, err); return true; }
      },
      onHacked: function () { /* ninguno de la Parte 3 se hackea (§10) */ }
    };
    try { G.P3E.register(tipo, safe); } catch (e) { G.P3E.types[tipo] = safe; }
  }

  // =========================================================================
  //  ROBOT BOXEADOR DE PRÁCTICA (u) — 2 de vida. Patrulla ±3 tiles; si ve a un
  //  héroe a < 200 px y a su altura, se acerca, avisa "!" 0,8 s y lanza un
  //  puñetazo de espuma de 56 px (1 de daño). Después descansa 1,2 s.
  // =========================================================================
  var BOX_PATROL = 3 * TILE, BOX_SEE = 200, BOX_REACH = 56, BOX_WARN = 0.8, BOX_REST = 1.2;
  registerSafe('practicaBoxeador', {
    practica: true, touchDamage: 1,
    create: function (world, x, y) {
      var e = base('practicaBoxeador', x, y, 34, 52, 2, false);
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
      e.cool = Math.max(0, e.cool - dt);
      var h = nearest(world, e.x, e.y);
      var dx = h ? h.x - e.x : 0, sameH = h ? Math.abs(h.y - e.y) < 40 : false;
      var speed = 0;
      if (e.state === 'patrol') {
        if (e.x > e.homeX + BOX_PATROL) e.dir = -1;
        if (e.x < e.homeX - BOX_PATROL) e.dir = 1;
        if (edgeAhead(e, world, e.dir) || wallAhead(e, world, e.dir)) e.dir = -e.dir;
        speed = 50; e.facing = e.dir;
        if (h && e.cool <= 0 && sameH && Math.abs(dx) < BOX_SEE) e.state = 'chase';
      } else if (e.state === 'chase') {
        e.facing = sign(dx);
        if (!h || !sameH || Math.abs(dx) > BOX_SEE + 50 || Math.abs(e.x - e.homeX) > BOX_PATROL + 80) {
          e.state = 'patrol'; e.cool = 0.8;
        } else if (Math.abs(dx) < BOX_REACH + 6) {
          e.state = 'warn'; e.timer = BOX_WARN; exclaim(world, e, BOX_WARN); sfx(world, 'robot');
        } else if (!edgeAhead(e, world, e.facing) && !wallAhead(e, world, e.facing)) {
          speed = 85; e.dir = e.facing;
        }
      } else if (e.state === 'warn') {
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'punch'; e.timer = 0.3; e.hitSet = []; sfx(world, 'punch'); }
      } else if (e.state === 'punch') {
        e.timer -= dt;
        if (e.timer < 0.26 && e.timer > 0.06) {
          var pr = { x: e.facing > 0 ? e.x : e.x - BOX_REACH, y: e.y - 48, w: BOX_REACH, h: 30 };
          var hs = heroesOf(world);
          for (var i = 0; i < hs.length; i++) {
            var o = hs[i];
            if (!o || o.ko || e.hitSet.indexOf(o) >= 0) continue;
            if (overlap(pr, heroRect(o))) {
              e.hitSet.push(o);
              if (hurt(world, o, 1, e.x) === 'bloqueado') {      // ¡el escudo de Peter le para el golpe!
                e.knockV = -e.facing * 200; e.knockT = 0.12;
              }
            }
          }
        }
        if (e.timer <= 0) { e.state = 'rest'; e.timer = BOX_REST; }
      } else if (e.state === 'rest') {
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'patrol'; e.cool = 0.5; }
      }
      e.vx = (speed ? e.facing * speed : 0) + kv;
      var r = groundStep(e, dt, world);
      if (r.hitWall && e.state === 'patrol') e.dir = -e.dir;
    },
    draw: function (ctx, e, world) {
      var t = wt(world);
      if (!onScreen(world, e.x, e.y, 120)) return;
      var S = 0.95, f = e.facing;
      flashAlpha(ctx, e, t);
      var moving = Math.abs(e.vx) > 5 && e.onGround;
      var bob = moving ? -Math.abs(Math.sin(t * 12 + e.seed)) * 2.5 : 0;
      var shake = e.state === 'warn' ? Math.sin(t * 60) * 1.5 : 0;
      var golpe = (e.state === 'punch');
      var x = e.x + shake, y = e.y + bob;
      drawArt('boxeador', ctx, x, y, { scale: S, facing: f, hacked: true, pose: golpe ? 'golpe' : 'guardia' });
      // Encima del arte: diana en el pecho y guantes de espuma naranjas.
      ctx.save();
      ctx.translate(x, y); ctx.scale(S * f, S);
      if (golpe) { ctx.translate(4, 0); ctx.rotate(0.06); }
      if (golpe) guanteEspuma(ctx, 16, -45, 8.5, 1); else guanteEspuma(ctx, 16, -54, 8.5, 1);
      diana(ctx, 0, -36, 7.5);
      if (golpe) guanteEspuma(ctx, 43, -36, 12, 1); else guanteEspuma(ctx, 21, -47, 10.5, 1);
      ctx.restore();
      ctx.globalAlpha = 1;
      barraVida(ctx, e, e.x, e.y - e.h - 16);
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - e.h - 24, t);
    },
    rect: rectGround,
    onHit: function (e, dmg, kind, fromX) {
      hitFx(e, kind, fromX);
      if (e.state === 'warn' || e.state === 'punch') { e.state = 'rest'; e.timer = 0.6; }   // un golpe interrumpe su ataque
      return true;
    }
  });

  // =========================================================================
  //  DRON DE PRÁCTICA (v) — 1 de vida. Vuela en ondas lentas (60 px/s) entre
  //  dos puntos a ±3 tiles. No dispara; tocarlo hace 1. (Para la metralleta.)
  // =========================================================================
  registerSafe('practicaDron', {
    practica: true, touchDamage: 1,
    create: function (world, x, y) {
      var e = base('practicaDron', x, y, 28, 24, 1, true);
      e.dir = Math.random() < 0.5 ? -1 : 1; e.facing = e.dir;
      e.phase = Math.random() * Math.PI * 2;
      return e;
    },
    update: function (e, dt, world) {
      if (e.knockT > 0) { e.knockT -= dt; e.x += e.knockV * dt * 0.5; }
      if (e.stun > 0) return;                              // aturdido: flota quieto
      e.phase += dt * 2.2;
      var nx = e.x + e.dir * 60 * dt;
      if (nx > e.homeX + 3 * TILE) e.dir = -1;
      else if (nx < e.homeX - 3 * TILE) e.dir = 1;
      else if (solidAt(world, nx + e.dir * (e.w / 2 + 2), e.y)) e.dir = -e.dir;
      else e.x = nx;
      e.facing = e.dir;
      var ny = e.homeY + Math.sin(e.phase) * 18;
      if (!solidAt(world, e.x, ny + sign(ny - e.y) * e.h / 2)) e.y = ny;
    },
    draw: function (ctx, e, world) {
      var t = wt(world);
      if (!onScreen(world, e.x, e.y, 120)) return;
      flashAlpha(ctx, e, t);
      var buzz = Math.sin(t * 30 + e.seed) * 0.8, S = 1.1;
      drawArt('dronEnjambre', ctx, e.x, e.y + buzz, { scale: S, facing: e.facing, hacked: true }, true);
      ctx.save();
      ctx.translate(e.x, e.y + buzz); ctx.scale(S * e.facing, S);
      diana(ctx, -4, 3, 5.2);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - e.h / 2 - 14, t);
    },
    rect: rectFly,
    onHit: function (e, dmg, kind, fromX) { hitFx(e, kind, fromX); return true; }
  });

  // =========================================================================
  //  TORRETA DE PRÁCTICA (z) — 3 de vida. Cada 2,6 s, si hay un héroe a
  //  < 420 px: "!" 0,8 s y una bola de ESPUMA (180 px/s, 1 de daño) hacia él.
  //  Para practicar el escudo de Peter. No se hackea.
  // =========================================================================
  var TUR_RANGE = 420, TUR_PERIOD = 2.6, TUR_WARN = 0.8, TUR_SPEED = 180;
  function turretMuzzle(e) {
    var a = e.angle, cy = e.y - 32;
    return { x: e.x + Math.cos(a) * 24, y: cy + Math.sin(a) * 24 };
  }
  registerSafe('practicaTorreta', {
    practica: true, touchDamage: 1,
    create: function (world, x, y) {
      var e = base('practicaTorreta', x, y, 36, 46, 3, false);
      e.angle = Math.PI; e.shootT = rnd(1.2, TUR_PERIOD); e.warned = false; e.charge = 0;
      return e;
    },
    update: function (e, dt, world) {
      e.vx = 0; groundStep(e, dt, world);
      if (e.charge > 0) e.charge -= dt;
      if (e.stun > 0) { if (e.warned) { e.warned = false; e.charge = 0; e.shootT = 1.0; } return; }
      var cx = e.x, cy = e.y - 32;
      var h = nearest(world, cx, cy), inRange = false;
      if (h) {
        var hy = h.y - num(h.h, 58) / 2, d = Math.sqrt((h.x - cx) * (h.x - cx) + (hy - cy) * (hy - cy));
        inRange = d < TUR_RANGE;
        if (inRange || e.warned) {
          var want = Math.atan2(hy - cy, h.x - cx), diff = Math.atan2(Math.sin(want - e.angle), Math.cos(want - e.angle));
          e.angle += clamp(diff, -3 * dt, 3 * dt);     // gira con suavidad
        }
      }
      e.shootT -= dt;
      if (!e.warned && e.shootT <= TUR_WARN) {
        if (inRange) { e.warned = true; e.charge = TUR_WARN; exclaim(world, e, TUR_WARN); sfx(world, 'robot'); }
        else e.shootT = TUR_WARN + 0.25;                 // espera a que alguien esté a tiro
      }
      if (e.warned && e.shootT <= 0) {
        e.warned = false; e.shootT = TUR_PERIOD;
        var m = turretMuzzle(e);
        try {
          world.spawnProjectile({ x: m.x, y: m.y, vx: Math.cos(e.angle) * TUR_SPEED, vy: Math.sin(e.angle) * TUR_SPEED,
            r: 9, dmg: 1, from: 'enemy', kind: 'espuma', life: 3.2, gravity: 0 });
        } catch (x) { warn('espuma', x); }
        sfx(world, 'laser');
      }
    },
    draw: function (ctx, e, world) {
      var t = wt(world);
      if (!onScreen(world, e.x, e.y, 120)) return;
      flashAlpha(ctx, e, t);
      var shake = e.charge > 0 ? Math.sin(t * 50) * 1.2 : 0;
      drawArt('miniTorreta', ctx, e.x + shake, e.y, { scale: 1, hacked: true, angle: e.angle });
      ctx.globalAlpha = 1;
      // diana en el pie de la torreta (lo que no gira)
      diana(ctx, e.x + shake, e.y - 12, 7);
      if (e.charge > 0) {   // la boca se llena de espuma antes de disparar
        var m = turretMuzzle(e), k = 1 - clamp(e.charge / TUR_WARN, 0, 1);
        circ(ctx, m.x, m.y, 3 + 6 * k, 'rgba(255,255,255,' + (0.45 + 0.5 * k).toFixed(2) + ')', 'rgba(26,26,46,0.6)', 1.2);
      }
      barraVida(ctx, e, e.x, e.y - e.h - 14);
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - e.h - 24, t);
    },
    rect: rectGround,
    onHit: function (e) { e.flash = 0.18; return true; }
  });

  // =========================================================================
  //  ROBOT CON ESCUDO DE PRÁCTICA (k) — 3 de vida. Como el escudo de la
  //  Parte 2: camina despacio hacia el héroe y BLOQUEA DE FRENTE. El escudo de
  //  Peter (lanzado o golpe) o los guantes del Director le dan la vuelta: queda
  //  de espaldas y aturdido 1,5 s. Por detrás, todo le da.
  // =========================================================================
  var ESC_FLIP = 1.5;
  registerSafe('practicaEscudo', {
    practica: true, touchDamage: 1,
    create: function (world, x, y) {
      var e = base('practicaEscudo', x, y, 40, 64, 3, false);
      e.turnT = 0; e.block = 0; e.flipT = 0;
      var h = nearest(world, x, y); e.facing = h ? sign(h.x - x) : -1;
      return e;
    },
    update: function (e, dt, world) {
      var kv = applyKnock(e, dt, world);
      if (e.block > 0) e.block -= dt;
      if (e.flipT > 0) e.flipT -= dt;
      if (e.stun > 0) { e.vx = kv; groundStep(e, dt, world); return; }
      var h = nearest(world, e.x, e.y), speed = 0;
      if (h && Math.abs(h.x - e.x) < 460 && Math.abs(h.y - e.y) < 140) {
        var dir = sign(h.x - e.x);
        if (dir !== e.facing && Math.abs(h.x - e.x) > 6) {
          e.turnT += dt;                                   // se gira despacito
          if (e.turnT > 0.8) { e.facing = dir; e.turnT = 0; sfx(world, 'robot'); }
        } else {
          e.turnT = 0;
          if (Math.abs(h.x - e.x) > 34 && !edgeAhead(e, world, e.facing) && !wallAhead(e, world, e.facing)) speed = 40;
        }
      } else e.turnT = 0;
      e.vx = e.facing * speed + kv;
      groundStep(e, dt, world);
    },
    draw: function (ctx, e, world) {
      var t = wt(world);
      if (!onScreen(world, e.x, e.y, 120)) return;
      var S = 0.9, f = e.facing;
      // punto débil: halo pulsante en la espalda (más fuerte si está de espaldas)
      var p = 0.5 + 0.5 * Math.sin(t * 6 + e.seed);
      ctx.save();
      ctx.globalAlpha = (e.flipT > 0 ? 0.45 : 0.22) + 0.3 * p;
      circ(ctx, e.x - f * 30, e.y - 42, 14 + 6 * p, '#fde047', null);
      ctx.restore();
      flashAlpha(ctx, e, t);
      var moving = Math.abs(e.vx) > 5 && e.onGround;
      var bob = moving ? -Math.abs(Math.sin(t * 8 + e.seed)) * 2 : 0;
      var wob = e.flipT > 0 ? Math.sin(t * 14) * 0.06 : 0;
      ctx.save();
      ctx.translate(e.x, e.y + bob); ctx.rotate(wob);
      drawArt('robotEscudo', ctx, 0, 0, { scale: S, facing: f, hacked: true });
      ctx.scale(S * f, S);
      diana(ctx, -8, -47, 7.5);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (e.block > 0) {   // chispa en el escudo al bloquear
        var sx = e.x + f * 26, sy = e.y - 38;
        ctx.save(); ctx.globalAlpha = clamp(e.block / 0.25, 0, 1);
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3 + t * 4;
          line(ctx, sx + Math.cos(a) * 6, sy + Math.sin(a) * 6, sx + Math.cos(a) * 16, sy + Math.sin(a) * 16, '#fff7ed', 3);
        }
        ctx.restore();
      }
      barraVida(ctx, e, e.x, e.y - e.h - 16);
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - e.h - 26, t);
    },
    rect: rectGround,
    onHit: function (e, dmg, kind, fromX, world) {
      var fx = num(fromX, e.x);
      var fromFront = (fx === e.x) ? true : (sign(fx - e.x) === e.facing);
      if (fromFront && e.flipT <= 0) {
        if (kind === 'escudo' || kind === 'guantes') {
          // ¡le da la vuelta! queda de espaldas al que le ha golpeado
          e.facing = -sign(fx - e.x);
          e.flipT = ESC_FLIP; e.stun = Math.max(num(e.stun, 0), ESC_FLIP); e.turnT = 0;
          e.flash = 0.18; e.knockV = e.facing * 160; e.knockT = 0.1;
          effect(world, 'texto', e.x, e.y - e.h - 30, { texto: '¡Media vuelta!', color: '#fde047', life: 0.9 });
          sfx(world, 'shieldBlock');
          return true;
        }
        e.block = 0.25;                                   // el motor pone el «clink» y la chispa
        return false;
      }
      hitFx(e, kind, fromX);
      return true;
    }
  });

  // =========================================================================
  //  MINI-ROBOT DE ROBOVILL (m) — 1 de vida. Vuela con su hélice; si un héroe
  //  está a < 420 px, lo persigue a 90 px/s con giros suaves (tras tocar a
  //  alguien, rebota y espera un poco). Con opts.cayendo es la LLUVIA de
  //  Robovill: primero un "!" de 1,0 s en el suelo donde caerá; luego baja en
  //  picado (inclinado, con estela) y después persigue como los demás.
  // =========================================================================
  var MINI_SEE = 420, MINI_SPEED = 90, MINI_TURN = 2.6, MINI_WARN = 1.0, MINI_SCALE = 1.15;
  // Primera superficie bajando desde (x, y), de 8 en 8 px (una plataforma "="
  // es sólida en sus 14 px de arriba, así que no se la salta). En la arena del
  // jefe, el suelo de la arena es el tope: si no hay plataforma encima, cae ahí.
  // Así el aviso sale SIEMPRE donde está el peligro (también en plataformas).
  function groundBelow(world, x, y) {
    var ar = world && world.arena;
    var enArena = !!(ar && typeof ar.sueloY === 'number' && isFinite(ar.sueloY) &&
      x >= num(ar.x0, -1e9) - 48 && x <= num(ar.x1, 1e9) + 48);
    var start = num(y, 0);
    if (!world || typeof world.isSolidAt !== 'function') return enArena ? ar.sueloY : start + 300;
    var k, yy;
    if (solidAt(world, x, start)) {
      if (enArena) {                                      // empieza dentro de algo: sale por debajo
        for (k = 0; k < 80 && solidAt(world, x, start) && start < ar.sueloY; k++) start += 8;
      } else {                                            // fuera de la arena: busca hacia arriba
        for (k = 0; k < 40 && solidAt(world, x, start); k++) start -= 12;
        return start + 12;
      }
    }
    for (k = 0; k < 160; k++) {
      yy = start + k * 8;
      if (enArena && yy >= ar.sueloY) return ar.sueloY;
      if (solidAt(world, x, yy)) {
        var top = Math.floor(yy / TILE) * TILE;
        return enArena ? Math.min(top, ar.sueloY) : top;
      }
    }
    return enArena ? ar.sueloY : start + 300;
  }
  registerSafe('miniRobot', {
    touchDamage: 1,
    create: function (world, x, y, opts) {
      var e = base('miniRobot', x, y, 26, 26, 1, true);
      e.state = 'hover'; e.vx = 0; e.vy = 0; e.buzzT = rnd(1.5, 4);
      e.bounceT = 0; e.tilt = 0;
      if (opts && opts.cayendo) {
        e.cayendo = true;
        e.landY = groundBelow(world, e.x, e.y);
        e.state = 'aviso'; e.timer = MINI_WARN; e.invisible = true;
        var camY = num(world && world.camY, e.landY - 500);
        e.y = Math.min(camY - 40, e.landY - 300);
        warning(world, e.x, e.landY, 30, MINI_WARN);
      }
      return e;
    },
    update: function (e, dt, world) {
      e.buzzT -= dt;
      if (e.state === 'aviso') {                           // todavía no está: solo el aviso en el suelo
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'cae'; e.vy = 260; e.tilt = 0.5; e.hitSet = []; sfx(world, 'miniRobot'); }
        return;
      }
      if (e.state === 'cae') {                             // picado: el escudo no lo para (viene de arriba)
        e.vy = Math.min(e.vy + 1400 * dt, 760);
        e.y += e.vy * dt;
        var r = rectFly(e), hs = heroesOf(world);
        for (var i = 0; i < hs.length; i++) {
          var o = hs[i];
          if (!o || o.ko || e.hitSet.indexOf(o) >= 0) continue;
          if (overlap(r, heroRect(o))) { e.hitSet.push(o); hurt(world, o, 1, e.x, { desdeArriba: true }); }
        }
        if (e.y >= e.landY - 22) {                          // aterriza, rebota y se pone a perseguir
          e.y = e.landY - 22; e.state = 'chase'; e.invisible = false;
          e.vy = -150; e.vx = 0; e.tilt = 0; e.bounceT = 0.5;
          effect(world, 'sparkle', e.x, e.landY - 6, { life: 0.4 });
          try { if (world && typeof world.shake === 'function') world.shake(0.12); } catch (x) { /* nada */ }
        }
        return;
      }
      if (e.knockT > 0) { e.knockT -= dt; e.x += e.knockV * dt; }
      if (e.stun > 0) { e.vx *= 0.9; e.vy *= 0.9; return; }
      var h = nearest(world, e.x, e.y);
      var tx = h ? h.x : e.homeX, ty = h ? h.y - 30 : e.homeY;
      var dist = h ? Math.sqrt((tx - e.x) * (tx - e.x) + (ty - e.y) * (ty - e.y)) : 1e9;
      if (e.state === 'hover' && h && dist < MINI_SEE) e.state = 'chase';
      if (e.state === 'chase' && (!h || dist > MINI_SEE + 160)) e.state = 'hover';
      if (e.bounceT > 0) {
        e.bounceT -= dt;
        e.vx *= 0.94; e.vy *= 0.94;
      } else if (e.state === 'chase') {
        // giro suave: la velocidad gira poco a poco hacia el héroe
        var want = Math.atan2(ty - e.y, tx - e.x);
        var cur = (Math.abs(e.vx) + Math.abs(e.vy) > 1) ? Math.atan2(e.vy, e.vx) : want;
        var diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        cur += clamp(diff, -MINI_TURN * dt, MINI_TURN * dt);
        var sp = Math.min(MINI_SPEED, Math.sqrt(e.vx * e.vx + e.vy * e.vy) + 200 * dt);
        e.vx = Math.cos(cur) * sp; e.vy = Math.sin(cur) * sp;
        if (h && e.buzzT <= 0 && onScreen(world, e.x, e.y, 0)) { sfx(world, 'miniRobot'); e.buzzT = rnd(3, 6); }
      } else {                                             // flota en su sitio
        e.vx += (e.homeX - e.x) * 0.8 * dt - e.vx * 2 * dt;
        e.vy += (e.homeY + Math.sin(wt(world) * 2 + e.seed) * 10 - e.y) * 1.2 * dt - e.vy * 2 * dt;
      }
      // moverse sin atravesar paredes
      var nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
      if (!solidAt(world, nx + sign(e.vx) * e.w / 2, e.y)) e.x = nx; else e.vx = -e.vx * 0.3;
      if (!solidAt(world, e.x, ny + sign(e.vy) * e.h / 2)) e.y = ny; else e.vy = -e.vy * 0.3;
      if (Math.abs(e.vx) > 4) e.facing = sign(e.vx);
      // tras tocar a un héroe, rebota y descansa un momento (no se queda pegado)
      if (e.bounceT <= 0) {
        var hs2 = heroesOf(world), rr = rectFly(e);
        for (var j = 0; j < hs2.length; j++) {
          var q = hs2[j];
          if (!q || q.ko || !overlap(rr, heroRect(q))) continue;
          var ax = e.x - q.x, ay = e.y - (q.y - 29), al = Math.sqrt(ax * ax + ay * ay) || 1;
          e.vx = ax / al * 170; e.vy = ay / al * 170 - 60; e.bounceT = 0.8;
          break;
        }
      }
    },
    draw: function (ctx, e, world) {
      var t = wt(world);
      if (e.state === 'aviso') return;                     // el aviso lo dibuja el motor (círculo + "!")
      if (!onScreen(world, e.x, e.y, 120)) return;
      var S = MINI_SCALE * 40 / altoArte('miniRobot');
      if (e.state === 'cae') {
        // estela de caída
        ctx.save();
        for (var k = 1; k <= 4; k++) {
          ctx.globalAlpha = 0.28 - k * 0.055;
          circ(ctx, e.x, e.y - k * 16, 11 - k * 1.5, '#fca5a5', null);
        }
        ctx.globalAlpha = 0.7;
        line(ctx, e.x - 9, e.y - 20, e.x - 9, e.y - 52, 'rgba(255,255,255,0.8)', 2);
        line(ctx, e.x + 9, e.y - 18, e.x + 9, e.y - 44, 'rgba(255,255,255,0.8)', 2);
        ctx.restore();
      }
      flashAlpha(ctx, e, t);
      var bob = e.state === 'cae' ? 0 : Math.sin(t * 5 + e.seed) * 2;
      var tilt = e.state === 'cae' ? e.tilt * e.facing : clamp(e.vx / 300, -0.25, 0.25);
      ctx.save();
      ctx.translate(e.x, e.y + bob); ctx.rotate(tilt);
      drawArt('miniRobot', ctx, 0, 0, { scale: S, facing: e.facing, t: t + e.seed }, true);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - 24, t);
    },
    rect: function (e) {
      if (e.state === 'aviso') return { x: -99999, y: -99999, w: 0, h: 0 };
      return rectFly(e);
    },
    onHit: function (e, dmg, kind, fromX) {
      if (e.state === 'aviso') return false;
      hitFx(e, kind, fromX);
      return true;
    }
  });

  // =========================================================================
  //  TALADRÍN (n) — 2 de vida. Bajo tierra solo se ve un montoncito de tierra
  //  que avanza hacia el héroe más cercano (70 px/s). Debajo de él: "!" 0,8 s y
  //  sale de golpe (1 de daño, desdeAbajo); se queda fuera 2 s (vulnerable) y
  //  vuelve a enterrarse. Enterrado no le afecta nada.
  // =========================================================================
  var TAL_SPEED = 70, TAL_SEE = 420, TAL_WARN = 0.8, TAL_OUT = 2.0, TAL_RISE = 0.18, TAL_DIG = 0.45;
  registerSafe('taladrin', {
    touchDamage: 1,
    create: function (world, x, y) {
      var e = base('taladrin', x, y, 34, 52, 2, false);
      e.state = 'bajo'; e.invisible = true; e.rest = 0.8; e.dir = -1;
      e.hitSet = []; e.dust = 0; e.rise = 0;
      return e;
    },
    update: function (e, dt, world) {
      var kv = applyKnock(e, dt, world);
      e.timer -= dt;
      if (e.state === 'bajo') {
        e.invisible = true; e.rise = 0;
        if (e.rest > 0) e.rest -= dt;
        var h = nearest(world, e.x, e.y), speed = 0;
        if (e.stun > 0) e.stun = 0;                           // enterrado no le afecta nada
        if (h && e.rest <= 0 && Math.abs(h.x - e.x) < TAL_SEE && Math.abs(h.y - e.y) < 30) {
          var dx = h.x - e.x;
          if (Math.abs(dx) < 12) {
            e.state = 'aviso'; e.timer = TAL_WARN;
            warning(world, e.x, e.y, 26, TAL_WARN);
            sfx(world, 'drill');
          } else {
            e.dir = sign(dx);
            if (!edgeAhead(e, world, e.dir) && !wallAhead(e, world, e.dir)) speed = TAL_SPEED;
          }
        }
        e.facing = e.dir;
        e.vx = speed * e.dir;
        e.dust = speed > 0 ? e.dust + dt : 0;
        groundStep(e, dt, world);
      } else if (e.state === 'aviso') {
        e.invisible = true; e.vx = 0; groundStep(e, dt, world);
        if (e.timer <= 0) {
          e.state = 'sale'; e.timer = TAL_RISE; e.invisible = false; e.hitSet = [];
          sfx(world, 'punch');
          effect(world, 'sparkle', e.x, e.y - 8, { life: 0.35 });
          try { if (world && typeof world.shake === 'function') world.shake(0.1); } catch (x) { /* nada */ }
        }
      } else if (e.state === 'sale') {
        e.invisible = false; e.vx = 0; groundStep(e, dt, world);
        e.rise = clamp(1 - e.timer / TAL_RISE, 0, 1);
        // el golpe de la salida: viene de abajo (el escudo no lo para)
        var br = { x: e.x - 20, y: e.y - 60, w: 40, h: 60 }, hs = heroesOf(world);
        for (var i = 0; i < hs.length; i++) {
          var o = hs[i];
          if (!o || o.ko || e.hitSet.indexOf(o) >= 0) continue;
          if (overlap(br, heroRect(o))) { e.hitSet.push(o); hurt(world, o, 1, e.x, { desdeAbajo: true }); }
        }
        if (e.timer <= 0) { e.state = 'fuera'; e.timer = TAL_OUT; e.rise = 1; }
      } else if (e.state === 'fuera') {
        e.invisible = false; e.rise = 1;
        e.vx = kv; groundStep(e, dt, world);
        var hh = nearest(world, e.x, e.y);
        if (hh && e.stun <= 0) e.facing = sign(hh.x - e.x);
        if (e.timer <= 0 && e.stun <= 0) { e.state = 'baja'; e.timer = TAL_DIG; sfx(world, 'drill'); }
      } else if (e.state === 'baja') {
        e.invisible = false; e.vx = 0; groundStep(e, dt, world);
        e.rise = clamp(e.timer / TAL_DIG, 0, 1);
        if (e.timer <= 0) { e.state = 'bajo'; e.invisible = true; e.rest = 1.0; e.rise = 0; }
      }
    },
    draw: function (ctx, e, world) {
      var t = wt(world);
      if (!onScreen(world, e.x, e.y, 120)) return;
      var buried = (e.state === 'bajo' || e.state === 'aviso');
      var shake = e.state === 'aviso' ? Math.sin(t * 60) * 2 : 0;
      // montoncito de tierra (siempre, más pequeño cuando está fuera)
      var mk = buried ? 1 : 0.75;
      drawMound(ctx, e.x + shake, e.y, mk, t, e, buried);
      if (buried) return;
      flashAlpha(ctx, e, t);
      ctx.save();
      // sale del suelo: se recorta por encima de los pies
      ctx.beginPath(); ctx.rect(e.x - 60, e.y - 120, 120, 120); ctx.clip();
      ctx.translate(e.x, e.y + (1 - e.rise) * 58);
      ctx.scale(e.facing, 1);
      drawTaladrin(ctx, t, e);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (e.stun > 0) drawDizzy(ctx, e.x, e.y - e.h - 22, t);
    },
    rect: function (e) {
      if (e.state === 'bajo' || e.state === 'aviso') return { x: -99999, y: -99999, w: 0, h: 0 };
      var hh = Math.max(14, e.h * (e.state === 'fuera' ? 1 : e.rise));
      return { x: e.x - e.w / 2, y: e.y - hh, w: e.w, h: hh };
    },
    onHit: function (e, dmg, kind, fromX) {
      if (e.state === 'bajo' || e.state === 'aviso') return false;   // enterrado no le afecta nada
      hitFx(e, kind, fromX);
      e.knockT = 0;                                                   // no se mueve del agujero
      return true;
    }
  });

  // Montoncito de tierra (pies en x, y). k = tamaño.
  function drawMound(ctx, x, y, k, t, e, buried) {
    ctx.save();
    ctx.translate(x, y);
    // polvo que levanta al avanzar
    if (buried && e.dust > 0) {
      for (var i = 0; i < 3; i++) {
        var ph = ((t * 2.2 + i / 3 + e.seed) % 1);
        ctx.globalAlpha = 0.5 * (1 - ph);
        circ(ctx, -e.dir * (14 + ph * 18), -4 - ph * 10, 3 + ph * 4, '#d6b98c', null);
      }
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.moveTo(-24 * k, 0);
    ctx.quadraticCurveTo(-18 * k, -15 * k, 0, -16 * k);
    ctx.quadraticCurveTo(18 * k, -15 * k, 24 * k, 0);
    ctx.closePath();
    ctx.fillStyle = '#92400e'; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    // terrones y piedrecitas
    circ(ctx, -9 * k, -7 * k, 4 * k, '#b45309', null);
    circ(ctx, 8 * k, -9 * k, 3.5 * k, '#a16207', null);
    circ(ctx, 14 * k, -3 * k, 2.5 * k, '#78716c', OUT, 1.2);
    circ(ctx, -15 * k, -3 * k, 2.2 * k, '#a8a29e', OUT, 1.2);
    if (buried) {
      // la puntita del taladro asoma y gira
      var tip = e.state === 'aviso' ? 10 : 4 + Math.sin(t * 6 + e.seed) * 1.5;
      poly(ctx, [[-5, -14], [5, -14], [0, -14 - tip]], '#ef4444', OUT, 2);
      var s = (t * 8) % 1;
      line(ctx, -3 + s * 4, -14, -1 + s * 2, -14 - tip * 0.6, '#cbd5e1', 1.4);
    }
    ctx.restore();
  }
  // El taladrín fuera de la tierra (pies en 0, 0; mira a la derecha).
  function drawTaladrin(ctx, t, e) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // orugas
    rf(ctx, -17, -9, 34, 9, 4.5, '#334155', OUT, 2.5);
    circ(ctx, -11, -4.5, 2.4, '#94a3b8', null); circ(ctx, 0, -4.5, 2.4, '#94a3b8', null); circ(ctx, 11, -4.5, 2.4, '#94a3b8', null);
    // brazos cortitos
    line(ctx, -14, -20, -21, -14, OUT, 5.5); line(ctx, -14, -20, -21, -14, '#64748b', 3);
    line(ctx, 14, -20, 21, -14, OUT, 5.5); line(ctx, 14, -20, 21, -14, '#64748b', 3);
    circ(ctx, -22, -13, 3.5, '#475569', OUT, 1.8); circ(ctx, 22, -13, 3.5, '#475569', OUT, 1.8);
    // cuerpo de acero con franja roja
    rf(ctx, -16, -32, 32, 25, 10, '#94a3b8', OUT, 3);
    rf(ctx, -16, -16, 32, 5, 2, '#dc2626', OUT, 2);
    circ(ctx, -11, -27, 1.4, '#e2e8f0', null); circ(ctx, 11, -27, 1.4, '#e2e8f0', null);
    // ojo-luz y ceja enfadada (pero mona)
    rf(ctx, -2, -29, 14, 11, 5, '#1e293b', OUT, 2);
    eyeLight(ctx, 6, -23.5, 3.8, '#ff4d4d');
    line(ctx, 0, -31, 11, -29, OUT, 2.2);
    // el TALADRO rojo apuntando arriba, con rosca de acero que gira
    var top = -58;
    poly(ctx, [[-13, -32], [13, -32], [0, top]], '#ef4444', OUT, 2.5);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-13, -32); ctx.lineTo(13, -32); ctx.lineTo(0, top); ctx.closePath(); ctx.clip();
    var sp = ((t * 3 + e.seed) % 1) * 9;
    for (var yy = -32 + sp; yy > top - 9; yy -= 9) line(ctx, -14, yy, 14, yy - 7, '#e2e8f0', 2.6);
    ctx.restore();
    poly(ctx, [[-13, -32], [13, -32], [0, top]], null, OUT, 2.5);
    circ(ctx, 0, top + 1, 2, '#fde68a', null);
  }
})();
