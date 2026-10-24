// jefes3.js — Los JEFES A PIE de la Parte 3 "We Are a Team" (contrato §13, §9.5, §18.4).
// Dueño: jefes. Registra en G.P3B:
//   · 'robotPractica' (cap. 1): el gran robot de entrenamiento de Dark Secuaz (verde, con diana).
//   · 'guardian'      (cap. 4): el Guardián de Robovill y sus guardias (barra "GUARDIANES DE ROBOVILL").
//   · 'robovillPie'   (cap. 5): Robovill a pie; al derrotarlo se hace GIGANTE (el motor va a levelP3_5f).
// Reglas comunes (§13): todo ataque avisa 1,0 s o más ('aviso:<ataque>' → 'golpe:<ataque>'),
// golpes físicos = 2 (fisico, fromX = b.x), proyectiles/rayos/ondas = 1, "¡CLANC!" si Peter para un
// golpe físico, regla de ritmo (cada fase enseña TODOS sus ataques antes de poder pasar a la siguiente),
// puntos débiles de P2.P3PUNTOS × escala × facing, "agachado" (el punto débil baja a sueloY − 40),
// plan B automático en cada jefe y pistas de Dark Secuaz (plantillas con {cambio}, {ataque}…).
// Solo DEFINE cosas al cargar (§0.4). Nunca lanza en update/draw (try/catch).
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;

  // Registro sin orden de carga (§1, §9.5)
  G.P3B = G.P3B || { types: {} };
  if (!G.P3B.types || typeof G.P3B.types !== 'object') G.P3B.types = {};
  G.P3B.register = G.P3B.register || function (tipo, def) { G.P3B.types[tipo] = def; };

  // =========================================================================
  //  Utilidades
  // =========================================================================
  var OUTLINE = '#1a1a2e';
  // Copia de la tabla del contrato §16.4 (por si datos-arte3.js faltara)
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };
  var PUNTOS_POR_DEFECTO = {
    robovill: { A: { gema: [14, -110, 20] }, B: { gema: [0, -128, 20] } },
    robotPractica: { diana: [3, -88, 19] },
    guardianRobovill: { bateria: [-46, -101, 20, 46], boton: [1, -186, 8], generador: [62, -101, 12] }
  };
  var AVISO = 1.0;          // §0.7: 1,0 s en todo ataque de jefe
  var FASE_MIN = 10;        // cada fase dura como mínimo esto (P3-10 pide ≥ 8 s)

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function sign(v) { return v < 0 ? -1 : 1; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function overlap(a, b) { return a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function altoArte(n) {
    var P = window.P2;
    var v = (P && P.P3ALTO) ? P.P3ALTO[n] : undefined;
    return (typeof v === 'number' && isFinite(v) && v > 0) ? v : (ALTO_POR_DEFECTO[n] || 100);
  }
  function arr3(a) { return a && a.length >= 3 && isFinite(a[0]) && isFinite(a[1]) && isFinite(a[2]); }
  // Punto de impacto [dx, dy, tamaño…] de P2.P3PUNTOS (con respaldo; §16.4)
  function punto(nombre, clave, variante) {
    var src = null;
    try {
      var P = window.P2;
      src = P && P.P3PUNTOS ? P.P3PUNTOS[nombre] : null;
      if (src && variante && src[variante]) src = src[variante];
      src = src ? src[clave] : null;
    } catch (e) { src = null; }
    if (!arr3(src)) {
      var d = PUNTOS_POR_DEFECTO[nombre];
      if (d && variante && d[variante]) d = d[variante];
      src = d ? d[clave] : null;
    }
    return arr3(src) ? src : null;
  }
  function art(nombre, ctx) {
    var P = window.P2;
    if (!P || typeof P.call !== 'function') return false;
    try { return P.call.apply(P, Array.prototype.slice.call(arguments, 0)) === true; } catch (e) { return false; }
  }
  function gfx(n) { return (G.gfx && typeof G.gfx[n] === 'function') ? G.gfx[n] : null; }
  function look() { var l = (G.p3 && G.p3.look) || {}; return l; }
  function sfx(world, n) { try { if (world && typeof world.sfx === 'function') world.sfx(n); else if (G.audio) G.audio.sfx(n); } catch (e) { /* nada */ } }
  // Lo más alto de la pantalla (y < camY + 215) lo tapan la caja de pista de Dark Secuaz (y ≈ 64–190)
  // y los retratos del HUD: los textos y el "!" de los jefes nunca se ponen ahí.
  var Y_VISIBLE = 215;
  function yVis(world, y) {
    var cy = world ? world.camY : NaN;
    return (typeof cy === 'number' && isFinite(cy)) ? Math.max(y, cy + Y_VISIBLE) : y;
  }
  function txt(world, x, y, t, col, life) { try { if (world && typeof world.text === 'function') world.text(x, yVis(world, y), t, col || '#fef3c7', life || 1.0); } catch (e) { /* nada */ } }
  function fx(world, kind, x, y, opts) { try { if (world && typeof world.spawnEffect === 'function') world.spawnEffect(kind, x, y, opts || {}); } catch (e) { /* nada */ } }
  function warn(world, x, y, r, life) { try { if (world && typeof world.spawnWarning === 'function') world.spawnWarning(x, y, { r: r, life: life }); } catch (e) { /* nada */ } }
  function shake(world, v) { try { if (world && typeof world.shake === 'function') world.shake(v); } catch (e) { /* nada */ } }
  function heroes(world) {
    var hs = [];
    try { hs = (world && typeof world.heroes === 'function') ? (world.heroes() || []) : []; } catch (e) { hs = []; }
    var out = [];
    for (var i = 0; i < hs.length; i++) { var h = hs[i]; if (h && !h.ko && isFinite(h.x) && isFinite(h.y)) out.push(h); }
    return out;
  }
  function heroRect(h) { var w = num(h.w, 34), hh = num(h.h, 58); return { x: h.x - w / 2, y: h.y - hh, w: w, h: hh }; }
  // El héroe más cercano; con soloJugadores, prefiere a los jugadores (no IA)
  function cercano(world, x, soloJugadores) {
    var hs = heroes(world), best = null, bd = 1e9, i;
    for (i = 0; i < hs.length; i++) {
      if (soloJugadores && hs[i].isAI) continue;
      var d = Math.abs(hs[i].x - x);
      if (d < bd) { bd = d; best = hs[i]; }
    }
    if (!best && soloJugadores) return cercano(world, x, false);
    return best;
  }
  function hurt(world, h, dmg, fromX, opts) {
    try { if (world && typeof world.hurtHero === 'function') return world.hurtHero(h, dmg, fromX, opts || {}); } catch (e) { /* nada */ }
    return 'nada';
  }
  function arenaDe(world, x, y) {
    var a = world && world.arena;
    if (a && isFinite(a.x0) && isFinite(a.x1) && isFinite(a.sueloY) && a.x1 > a.x0 + 100) return { x0: a.x0, x1: a.x1, sueloY: a.sueloY };
    return { x0: x - 430, x1: x + 430, sueloY: y };
  }
  function excl(ctx, x, y, world) {
    y = yVis(world, y);
    var ex = gfx('drawExclamation');
    if (ex) { try { ex(ctx, x, y); return; } catch (e) { /* abajo */ } }
    ctx.save();
    ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUTLINE; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', x, y + 6);
    ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function estrella(ctx, x, y, r, col) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2) ? r * 0.45 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // =========================================================================
  //  "Agachado" (§13): el jefe se dibuja bajado y algo aplastado (0,9) y sus
  //  zonas bajan igual, de modo que su punto débil queda a sueloY − 40.
  //  Δ = 0,9·H − 40 (H = altura del punto débil sobre los pies), así el punto
  //  queda EXACTAMENTE en sueloY − 40 con el aplastamiento incluido.
  // =========================================================================
  function agDelta(b) { return Math.max(0, 0.9 * num(b.debilH, 100) - 40); }
  function tY(b, y) {   // posición en pantalla de un punto del dibujo de pie (y en el mundo)
    var k = clamp(num(b.agK, 0), 0, 1);
    return b.y + (y - b.y) * (1 - 0.1 * k) + agDelta(b) * k + num(b.sink, 0);
  }
  function tRect(b, r) {
    var y0 = tY(b, r.y), y1 = tY(b, r.y + r.h);
    return { x: r.x, y: y0, w: r.w, h: Math.max(1, y1 - y0), tipo: r.tipo, id: r.id };
  }
  // Aplica la transformación de postura al contexto (con recorte en el suelo si se hunde).
  function postura(ctx, b) {
    var k = clamp(num(b.agK, 0), 0, 1), sink = num(b.sink, 0), sq = num(b.sq, 1);
    if (k > 0.001 || sink > 0.5) {
      ctx.beginPath(); ctx.rect(b.x - 2000, -3000, 4000, b.sueloY + 3 + 3000); ctx.clip();
    }
    ctx.translate(0, agDelta(b) * k + sink);
    var sy = (1 - 0.1 * k) * sq;
    if (sy !== 1 || num(b.sx, 1) !== 1) { ctx.translate(b.x, b.y); ctx.scale(num(b.sx, 1) * (2 - sq), sy); ctx.translate(-b.x, -b.y); }
    if (b.tembl > 0) ctx.translate(Math.sin(b.t * 70) * 3 * Math.min(1, b.tembl), 0);
    if (b.hitT > 0) ctx.translate(Math.sin(b.t * 90) * 2, 0);
  }
  function polvo(ctx, b) {
    var k = clamp(num(b.agK, 0), 0, 1);
    if (k < 0.05 && num(b.sink, 0) < 1) return;
    ctx.save();
    ctx.globalAlpha = 0.55 * Math.max(k, 0.6);
    for (var i = 0; i < 7; i++) {
      var px = b.x + (i - 3) * 26 + Math.sin(b.t * 2 + i) * 4, r = 14 + (i % 3) * 5 + Math.sin(b.t * 3 + i * 1.7) * 2;
      ctx.fillStyle = (i % 2) ? '#a8a29e' : '#d6d3d1';
      ctx.beginPath(); ctx.arc(px, b.sueloY - 4, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function estrellasMareo(ctx, b, yCabeza) {
    if (b.st !== 'mareado') return;
    ctx.save();
    for (var i = 0; i < 3; i++) {
      var a = b.t * 4 + i * 2.09;
      estrella(ctx, b.x + Math.cos(a) * 34, yCabeza - 12 + Math.sin(a) * 9, 7, '#fde047');
    }
    ctx.restore();
  }
  // Halo amarillo en las zonas débiles (respaldo de §2.5: "halo amarillo en la zona débil abierta")
  function haloDebil(ctx, b, zs) {
    ctx.save();
    for (var i = 0; i < zs.length; i++) {
      var z = zs[i];
      if (z.tipo !== 'debil') continue;
      var cx = z.x + z.w / 2, cy = z.y + z.h / 2, r = Math.max(z.w, z.h) / 2 + 6;
      var a = 0.35 + 0.25 * Math.sin(b.t * 6) + (b.agK > 0.5 ? 0.25 : 0);
      ctx.globalAlpha = clamp(a, 0.1, 0.9);
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, r + 2 * Math.sin(b.t * 6), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha *= 0.4; ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  //  Objetos propios de los jefes: ondas de suelo, minas rodantes, sierras y
  //  (respaldo) caídas de mini-robots si enemigos3.js aún no existe.
  // =========================================================================
  var objId = 0;
  function addObj(b, o) { o.t = 0; o.id = 'o' + (++objId); o.hit = []; if (b.objs.length < 40) b.objs.push(o); return o; }
  function popObj(b, o, world, conPop) {
    o.dead = true;
    if (conPop) { fx(world, 'explosion', o.x, o.y, { r: 20 }); sfx(world, 'explosion'); }
    else fx(world, 'sparkle', o.x, o.y);
  }
  function updObjs(b, dt, world) {
    var ar = b.ar, hs = heroes(world), i, j;
    for (i = b.objs.length - 1; i >= 0; i--) {
      var o = b.objs[i];
      if (o.dead) { b.objs.splice(i, 1); continue; }
      o.t += dt;
      if (o.k === 'onda') {
        o.x += o.dir * o.vel * dt;
        o.y = ar.sueloY - 14;
        if (o.x < ar.x0 + 6 || o.x > ar.x1 - 6 || o.t > 4) { o.dead = true; continue; }
        var wr = { x: o.x - 16, y: ar.sueloY - 28, w: 32, h: 28 };
        for (j = 0; j < hs.length; j++) {
          var h = hs[j];
          if (o.hit.indexOf(h) >= 0 || !overlap(wr, heroRect(h))) continue;
          o.hit.push(h);
          if (hurt(world, h, o.dmg, o.x - o.dir * o.vel * 0.1) === 'bloqueado') { popObj(b, o, world, false); break; }
        }
      } else if (o.k === 'mina') {
        o.x += o.vx * dt; o.rot += o.vx * dt / 13;
        o.y = ar.sueloY - 13;
        if (o.x < ar.x0 + 14 || o.x > ar.x1 - 14 || o.t > 8) { popObj(b, o, world, true); continue; }
        var mr = { x: o.x - 13, y: o.y - 13, w: 26, h: 26 };
        for (j = 0; j < hs.length; j++) {
          if (!overlap(mr, heroRect(hs[j]))) continue;
          hurt(world, hs[j], 1, o.x - o.vx * 0.1);
          popObj(b, o, world, true);
          break;
        }
      } else if (o.k === 'sierra') {
        o.x += o.vx * dt; o.rot += o.vx * dt / 20;
        o.y = ar.sueloY - 24;
        if (o.fase === 'ida' && ((o.vx < 0 && o.x < ar.x0 + 26) || (o.vx > 0 && o.x > ar.x1 - 26))) {
          o.fase = 'vuelta'; o.vx = -o.vx; o.hit = []; sfx(world, 'clink'); fx(world, 'sparkle', o.x, o.y);
        }
        if (o.fase === 'vuelta' && (Math.abs(o.x - b.x) < 46 || o.t > 7)) { o.dead = true; sfx(world, 'shieldCatch'); continue; }
        var sr = { x: o.x - 22, y: o.y - 22, w: 44, h: 44 };
        for (j = 0; j < hs.length; j++) {
          var hh = hs[j];
          if (o.hit.indexOf(hh) >= 0 || !overlap(sr, heroRect(hh))) continue;
          o.hit.push(hh);
          if (hurt(world, hh, 1, o.x - o.vx * 0.1) === 'bloqueado' && o.fase === 'ida') {
            o.fase = 'vuelta'; o.vx = -o.vx; o.hit = []; fx(world, 'sparkle', o.x, o.y);
            break;
          }
        }
      } else if (o.k === 'espuma') {       // bolas de espuma del Robot de práctica (Peter las devuelve)
        if (o.vuelta) {
          // Rebotada en el escudo de Peter: vuelve volando a la cara del robot y le marea (fase 1)
          var tx = b.x, ty = tY(b, b.y - 130 * num(b.escala, 1));
          var dx = tx - o.x, dy = ty - o.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dd < 34 || o.t > 2.5) {
            o.dead = true; fx(world, 'sparkle', o.x, o.y); sfx(world, 'shieldBlock');
            if (o.rebota && b.hp > 0) { b.peterQ = true; txt(world, b.x, b.y - 210 * num(b.escala, 1), '¡PLOF!', '#f9a8d4', 0.8); }
            continue;
          }
          o.x += dx / dd * 340 * dt; o.y += dy / dd * 340 * dt;
          continue;
        }
        o.x += o.vx * dt; o.y += o.vy * dt;
        var choca = false;
        try { choca = !!(world && typeof world.isSolidAt === 'function' && world.isSolidAt(o.x, o.y)); } catch (e) { choca = false; }
        if (choca || o.x < ar.x0 - 40 || o.x > ar.x1 + 40 || o.y > ar.sueloY - 4 || o.t > 5) { popObj(b, o, world, false); continue; }
        var er = { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
        for (j = 0; j < hs.length; j++) {
          var he = hs[j], rr = heroRect(he);
          // El escudo de Peter (cubriéndose) asoma por delante: la espuma choca con él antes que con el cuerpo
          if (he.heroe === 'peter' && he.cubriendo) { if (num(he.facing, 1) > 0) rr.w += 22; else { rr.x -= 22; rr.w += 22; } }
          if (!overlap(er, rr)) continue;
          if (hurt(world, he, o.dmg, o.x - o.vx * 0.1) === 'bloqueado' && o.rebota) { o.vuelta = true; o.t = 0; fx(world, 'sparkle', o.x, o.y); }
          else popObj(b, o, world, false);
          break;
        }
      } else if (o.k === 'caida') {        // respaldo de la lluvia de mini-robots
        if (o.t < AVISO) continue;
        o.vy = Math.min(num(o.vy, 200) + 1400 * dt, 760); o.y += o.vy * dt;
        var cr = { x: o.x - 16, y: o.y - 16, w: 32, h: 32 };
        for (j = 0; j < hs.length; j++) {
          if (o.hit.indexOf(hs[j]) >= 0 || !overlap(cr, heroRect(hs[j]))) continue;
          o.hit.push(hs[j]); hurt(world, hs[j], 1, o.x, { desdeArriba: true });
        }
        if (o.y >= ar.sueloY - 16) { popObj(b, o, world, true); }
      }
    }
  }
  function drawObjs(ctx, b) {
    for (var i = 0; i < b.objs.length; i++) {
      var o = b.objs[i];
      if (o.dead) continue;
      ctx.save();
      try {
        if (o.k === 'onda') {
          var gy = b.sueloY, col = o.color || '#a16207', col2 = o.color2 || '#d97706';
          ctx.fillStyle = col; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(o.x - 26, gy);
          ctx.quadraticCurveTo(o.x - 10 * o.dir, gy - 40, o.x + 18 * o.dir, gy - 6);
          ctx.lineTo(o.x + 24 * o.dir, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = col2;
          for (var k = 0; k < 4; k++) {
            var px = o.x - o.dir * (6 + k * 9), py = gy - 30 - ((o.t * 9 + k * 7) % 14);
            ctx.beginPath(); ctx.arc(px, py, 3 + (k % 2), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        } else if (o.k === 'mina') {
          ctx.translate(o.x, o.y); ctx.rotate(o.rot);
          ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
          for (var p = 0; p < 6; p++) { var a = p * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.stroke(); }
          ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          var blink = (Math.floor(o.t * 6) % 2) ? '#ef4444' : '#fca5a5';
          ctx.fillStyle = blink; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        } else if (o.k === 'sierra') {
          ctx.translate(o.x, o.y); ctx.rotate(o.rot);
          ctx.fillStyle = '#cbd5e1'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (var d = 0; d < 24; d++) { var aa = d * Math.PI / 12, rr = (d % 2) ? 18 : 24; if (d === 0) ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); else ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (o.k === 'espuma') {      // mismo aspecto que la espuma del motor (rosa y blanca)
          var er2 = Math.max(6, o.r);
          ctx.fillStyle = 'rgba(253,242,248,0.95)'; ctx.strokeStyle = o.vuelta ? '#fde047' : '#f472b6'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(o.x, o.y, er2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fbcfe8';
          for (var q = 0; q < 3; q++) { var aq = o.t * 6 + q * 2.1; ctx.beginPath(); ctx.arc(o.x + Math.cos(aq) * er2 * 0.9, o.y + Math.sin(aq) * er2 * 0.9, er2 * 0.35, 0, Math.PI * 2); ctx.fill(); }
        } else if (o.k === 'caida' && o.t >= AVISO) {
          if (!art('miniRobot', ctx, o.x, o.y, { scale: 1.1, facing: 1 })) {
            ctx.fillStyle = '#ef4444'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(o.x, o.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
      } catch (e) { /* nada */ }
      ctx.restore();
    }
  }
  function zonasObjs(b) {
    var out = [];
    for (var i = 0; i < b.objs.length; i++) {
      var o = b.objs[i];
      if (o.k === 'mina' && !o.dead) out.push({ x: o.x - 16, y: o.y - 36, w: 32, h: 49, tipo: 'mina', id: o.id });   // sueloY − 49 … sueloY
    }
    return out;
  }
  function onda(b, x, dir, vel, dmg, color, color2) {
    addObj(b, { k: 'onda', x: x, y: b.sueloY - 14, dir: dir, vel: vel || 300, dmg: dmg || 1, color: color, color2: color2 });
  }

  // =========================================================================
  //  NÚCLEO COMÚN: máquina de estados, regla de ritmo, fases, mareo, hackeo
  //  st ∈ 'descanso' | 'aviso' | 'golpe' | 'mareado' | 'pausa'
  // =========================================================================
  function crearJefe(cfg, world, x, y, opts) {
    opts = opts || {};
    var ar = arenaDe(world, x, y);
    var b = {
      tipo: cfg.tipo, x: num(x, 480), y: num(y, ar.sueloY), sueloY: ar.sueloY, ar: ar, homeX: num(x, 480),
      hp: cfg.hp, maxHp: cfg.hp, facing: -1, fase: 1,
      st: 'descanso', stT: 0, restT: 1.0, ataque: null, avisoDur: AVISO, g: {},
      ronda: { hechos: {}, n: 0 }, faseT: 0, orden: [], ultimo: null,
      agK: 0, agachar: false, marT: 0, sink: 0, sq: 1, sx: 1, tembl: 0,
      hackQ: false, clanc: false, objs: [], hitT: 0, t: 0, enIntro: false, introT: 0,
      defT: 0, gone: false, escala: 1, debilH: 100, chapter: opts.chapter
    };
    var f = opts.fase;
    if (f === 2 || f === 3) { f = Math.min(f, cfg.fases); b.fase = f; b.hp = cfg.umbral[f - 1]; }
    if (f === 'victoria') b.hp = 0;
    try { cfg.init(b, world, opts); } catch (e) { /* nada */ }
    return b;
  }
  function umbralSig(cfg, b) { return b.fase < cfg.fases ? cfg.umbral[b.fase] : 0; }
  function rondaOk(cfg, b) {
    var l = cfg.ataques[b.fase] || [];
    if (b.faseT > (cfg.faseMax || 45)) return true;
    var rondas = cfg.rondas || 1;   // cuántas veces sale CADA ataque de la fase antes de poder pasar
    for (var i = 0; i < l.length; i++) if ((b.ronda.hechos[l[i]] || 0) < rondas) return false;
    return b.ronda.n >= 2 && b.faseT >= (cfg.faseMin || FASE_MIN);
  }
  function barajar(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function siguienteAtaque(cfg, b) {
    var lista = cfg.ataques[b.fase] || [];
    if (!lista.length) return null;
    if (!b.orden.length) {
      // Primero los que aún no han salido en esta fase (barajados); luego el resto. Sin repetir seguidos.
      var falta = [], resto = [], i;
      for (i = 0; i < lista.length; i++) { if (b.ronda.hechos[lista[i]]) resto.push(lista[i]); else falta.push(lista[i]); }
      var ord = barajar(falta).concat(barajar(resto));
      if (ord.length > 1 && ord[0] === b.ultimo) { var t0 = ord[0]; ord[0] = ord[1]; ord[1] = t0; }
      b.orden = ord;
    }
    return b.orden.shift();
  }
  function marear(b, seg, texto, agachar, world) {
    b.st = 'mareado'; b.marT = num(seg, 1); b.agachar = !!agachar; b.ataque = null; b.g = {}; b.sq = 1;
    if (texto && world) txt(world, b.x + b.facing * 30, b.y - num(b.altoVis, 200) * 0.5, texto, '#fde047', 1.0);
  }
  function cambiarFase(cfg, b, world) {
    b.fase++;
    b.faseT = 0; b.ronda = { hechos: {}, n: 0 }; b.orden = []; b.ataque = null; b.g = {};
    b.st = 'pausa'; b.pausaT = 1.0; b.agachar = false; b.marT = 0; b.hackQ = false;
    sfx(world, 'roar'); shake(world, 0.45);
    var nm = cfg.nombreFase ? cfg.nombreFase[b.fase] : null;
    if (nm) txt(world, b.x, b.y - b.altoVis - 40, nm, '#fca5a5', 1.8);
    if (cfg.alCambiarFase) { try { cfg.alCambiarFase(b, world); } catch (e) { /* nada */ } }
  }
  function empezarGolpe(cfg, b, world) {
    b.st = 'golpe'; b.stT = 0;          // b.g conserva lo preparado en el aviso (destino del salto…)
    b.ronda.hechos[b.ataque] = (b.ronda.hechos[b.ataque] || 0) + 1; b.ronda.n++;
    b.ultimo = b.ataque;
    if (cfg.golpeInicio) cfg.golpeInicio(b, b.ataque, world);
  }
  function terminarGolpe(cfg, b, world) {
    var nm = b.ataque;
    b.ataque = null; b.g = {};
    if (b.clanc) {
      b.clanc = false;
      marear(b, 1.0, null, false, world);
      if (cfg.trasGolpe) cfg.trasGolpe(b, nm, world, true);
      return;
    }
    if (cfg.trasGolpe && cfg.trasGolpe(b, nm, world, false)) return;   // el jefe decide (p. ej. clavado)
    b.st = 'descanso'; b.restT = cfg.descanso(b);
  }
  function coreUpdate(cfg, b, dt, world) {
    b.enIntro = false;
    b.ar = arenaDe(world, b.homeX, b.sueloY);
    b.t += dt; b.faseT += dt;
    if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt);
    if (b.tembl > 0) b.tembl = Math.max(0, b.tembl - dt);
    var want = (b.st === 'mareado' && b.agachar) ? 1 : 0;
    b.agK = clamp(b.agK + clamp(want - b.agK, -dt * 5, dt * 5), 0, 1);
    updObjs(b, dt, world);
    if (cfg.tick) cfg.tick(b, dt, world);
    if (!isFinite(b.x)) b.x = (b.ar.x0 + b.ar.x1) / 2;
    if (!isFinite(b.y)) b.y = b.sueloY;
    if (b.fase < cfg.fases && b.hp <= cfg.umbral[b.fase] && b.st !== 'golpe') { cambiarFase(cfg, b, world); return; }
    if (b.st === 'pausa') {
      b.pausaT -= dt;
      if (cfg.idle) cfg.idle(b, dt, world, true);
      if (b.pausaT <= 0) { b.st = 'descanso'; b.restT = 0.5; }
      return;
    }
    if (b.st === 'mareado') {
      b.marT -= dt;
      if (b.marT <= 0) {
        b.st = 'descanso'; b.restT = cfg.descansoTrasMareo || 0.7; b.agachar = false;
        if (cfg.finMareo) cfg.finMareo(b, world);
      }
      return;
    }
    if (b.st === 'descanso') {
      if (b.hackQ) { b.hackQ = false; if (cfg.aplicarHack) { cfg.aplicarHack(b, world); if (b.st !== 'descanso') return; } }
      if (cfg.idle) cfg.idle(b, dt, world, false);
      b.restT -= dt;
      if (b.restT <= 0 && (!cfg.puedeAtacar || cfg.puedeAtacar(b, world))) {
        var nm = siguienteAtaque(cfg, b);
        if (nm) {
          b.ataque = nm; b.st = 'aviso'; b.stT = 0; b.g = {};
          b.avisoDur = (cfg.avisoDur && cfg.avisoDur(b, nm)) || AVISO;
          if (cfg.avisoInicio) cfg.avisoInicio(b, nm, world);
        }
      }
      return;
    }
    if (b.st === 'aviso') {
      b.stT += dt;
      if (cfg.avisoTick) cfg.avisoTick(b, b.ataque, dt, world);
      if (b.st === 'aviso' && b.stT >= b.avisoDur - 1e-6) empezarGolpe(cfg, b, world);
      return;
    }
    if (b.st === 'golpe') {
      b.stT += dt;
      var done = true;
      try { done = cfg.golpe(b, b.ataque, dt, world) !== false; } catch (e) { done = true; }
      if (done) terminarGolpe(cfg, b, world);
    }
  }
  // Daño recibido: zona débil ×2, armadura = 0, y la regla de ritmo (recorte de la vida).
  function coreOnHit(cfg, b, dmg, kind, zona, fromX, world) {
    dmg = num(dmg, 0);
    if (!zona || dmg <= 0 || b.hp <= 0) return 0;
    if (zona.tipo === 'mina') {
      for (var i = 0; i < b.objs.length; i++) { if (b.objs[i].id === zona.id && !b.objs[i].dead) popObj(b, b.objs[i], world, true); }
      return 0.001;   // la mina hace "pop" (casi nada al jefe: el motor lo cuenta como acierto)
    }
    if (zona.tipo === 'armadura') {
      clinc(b, zona, world);
      return 0;
    }
    var mul = 1;
    if (cfg.filtro) { var f = cfg.filtro(b, dmg, kind, zona, fromX, world); if (f === 0) return 0; mul = clamp(num(f, 1), 0, 1); }
    if (mul < 1) (cfg.alFiltrar || clinc)(b, zona, world); else b.clincN = 0;   // "¡CLINC!" seguidos → pista (Guardián)
    var d = dmg * (zona.tipo === 'debil' ? 2 : 1) * mul * num(cfg.danoMul, 1);
    if (zona.tipo === 'debil' && (!b.debilTxtT || b.t - b.debilTxtT > 2.5)) {
      b.debilTxtT = b.t; txt(world, zona.x + zona.w / 2, zona.y - 14, '¡Punto débil!', '#fde047', 0.7);
    }
    if (cfg.alGolpear) cfg.alGolpear(b, zona, kind, world);
    b.hitT = 0.12;
    if (!rondaOk(cfg, b)) {
      var piso = (b.fase < cfg.fases) ? umbralSig(cfg, b) + 0.5 : 1;
      var max = b.hp - piso;
      if (d > max) d = Math.max(0.0005, max);
    }
    return d;
  }
  // Golpe que rebota en metal: texto "¡CLINC!" (como mucho cada 1,2 s) y cuenta de los seguidos.
  function clinc(b, zona, world) {
    if (!b.clincUlt || b.t - b.clincUlt > 5) b.clincN = 0;
    b.clincN = (b.clincN || 0) + 1; b.clincUlt = b.t;
    if (!b.clincT || b.t - b.clincT > 1.2) { b.clincT = b.t; txt(world, zona.x + zona.w / 2, zona.y + 20, '¡CLINC!', '#f9a8d4', 0.6); }
  }
  function coreDebug(cfg, b) {
    var est;
    if (b.enIntro) est = 'intro';
    else if (b.hp <= 0) est = 'derrota';
    else if (b.st === 'aviso') est = 'aviso:' + b.ataque;
    else if (b.st === 'golpe') est = 'golpe:' + b.ataque;
    else if (b.st === 'mareado') est = 'mareado';
    else est = (cfg.escudoActivo && cfg.escudoActivo(b)) ? 'escudo' : 'descanso';
    var deb = null;
    try { deb = cfg.debilPrincipal ? cfg.debilPrincipal(b) : null; } catch (e) { deb = null; }
    return {
      fase: b.fase, estado: est, aviso: b.st === 'aviso' && !b.enIntro, ataque: (b.st === 'aviso' || b.st === 'golpe') ? b.ataque : null,
      debil: deb
    };
  }
  function debilCentro(zs, id) {
    for (var i = 0; i < zs.length; i++) {
      if (zs[i].tipo === 'debil' && (!id || zs[i].id === id)) return { x: zs[i].x + zs[i].w / 2, y: zs[i].y + zs[i].h / 2 };
    }
    return null;
  }
  function pistaFase(b, textos) {
    var t = b.faseT;
    if (t < 7 || (t % 28) > 22) return textos[b.fase] || null;
    return null;
  }
  // Construye la def de G.P3B a partir de una configuración.
  function hacerDef(cfg) {
    return {
      nombre: cfg.nombre,
      touchDamage: 1,
      create: function (world, x, y, opts) { return crearJefe(cfg, world, x, y, opts); },
      intro: function (b, t, world) {
        try { b.enIntro = true; b.introT = t; return cfg.intro(b, t, world); } catch (e) { b.enIntro = false; return true; }
      },
      update: function (b, dt, world) { try { coreUpdate(cfg, b, num(dt, 1 / 60), world); } catch (e) { /* nunca lanza */ } },
      draw: function (ctx, b, world) {
        ctx.save();
        try { cfg.draw(ctx, b, world); } catch (e) { /* nada */ }
        ctx.restore();
        ctx.save();
        try { drawObjs(ctx, b); } catch (e2) { /* nada */ }
        ctx.restore();
      },
      zones: function (b) {
        try { if (b.gone || b.hp <= 0) return []; return zonasObjs(b).concat(cfg.zonas(b) || []); } catch (e) { return []; }
      },
      onHit: function (b, dmg, kind, zona, fromX, world) {
        try { return coreOnHit(cfg, b, dmg, kind, zona, fromX, world); } catch (e) { return num(dmg, 0); }
      },
      touchRect: function (b) { try { return (b.gone || b.hp <= 0) ? null : cfg.toque(b); } catch (e) { return null; } },
      onHack: function (b, world, consola) {
        try {
          if (b.hp <= 0) return;
          if (cfg.hackInmediato) cfg.hackInmediato(b, world, consola || {});
          // Los efectos que paran al jefe esperan a que termine el golpe en curso.
          if (b.st === 'golpe' || b.st === 'aviso') b.hackQ = true;
          else if (cfg.aplicarHack) cfg.aplicarHack(b, world, consola || {});
        } catch (e) { /* nada */ }
      },
      defeat: function (b, t, world) {
        try { if (t < 0.02) b.objs = []; return cfg.derrota(b, num(t, 0), world); } catch (e) { return t > 2; }
      },
      hint: function (b, world) { try { return cfg.pista ? cfg.pista(b, world) : null; } catch (e) { return null; } },
      debug: function (b) {
        try { return coreDebug(cfg, b); } catch (e) { return { fase: b.fase, estado: 'descanso', aviso: false, ataque: null, debil: null }; }
      }
    };
  }

  // =========================================================================
  //  13.1  ROBOT DE PRÁCTICA (cap. 1) — 24 de vida, ≈ 200 px, verde y amable
  //  F1 (24–16) ¡a cubrirse!: espuma en abanico.  F2 (16–8) ¡a hackear!: escudo
  //  de práctica delante (consola o por detrás).  F3 (8–0) ¡salto aplastante!:
  //  salta, onda y se queda sentado (diana ×2).
  //  Examen "para aprender a cambiar de héroe" (GDD): cada fase tiene SU héroe y
  //  sin él va mucho más lenta (el plan B de §13 sigue: nunca es obligatorio).
  //   · F1 → Peter: su cuerpo está ACOLCHADO (los golpes casi no quitan) hasta
  //     que Peter, cubriéndose, le devuelve una bola de espuma: ¡PLOF!, se marea
  //     3 s con la diana abajo. Plan B: se cansa solo si pasan 28 s sin marearse.
  //     La consola aún no hace nada (no hay escudo que apagar).
  //   · F2 → el Director: la consola le apaga el escudo 6 s (o por la espalda:
  //     doble salto de Falcon, vuelta del escudo de Peter). Plan B: 30 s.
  //   · F3 → Mikey (o Falcon): acolchado otra vez; solo cuenta de verdad la
  //     diana. Un acierto en la diana DE PIE (francotirador desde lejos, doble
  //     salto) le tira sentado. Sentado tras su salto, la diana está al alcance
  //     de todos (regla común del "agachado").
  // =========================================================================
  var PR_ALTO = 200;
  var PR_ACOLCHADO = 0.04;   // lo que quita un golpe al cuerpo acolchado (F1 sin marear, F3)
  var PR_CANSADO = 28;       // F1, plan B: se cansa solo tras estos segundos sin marearse
  var PR_PLANB_ESCUDO = 30;  // F2, plan B: el escudo se agota solo tras estos segundos encendido
  function prEsc() { return PR_ALTO / altoArte('robotPractica'); }
  function prDiana(b) {
    var p = punto('robotPractica', 'diana'), s = b.escala;
    if (!p) return { x: b.x, y: b.y - 110, r: 24 };
    return { x: b.x + p[0] * s * b.facing, y: b.y + p[1] * s, r: Math.max(18, p[2] * s) };
  }
  function prEscudo(b) { return b.fase === 2 && b.escOff <= 0 && b.hp > 0; }
  var CFG_PR = {
    tipo: 'robotPractica', nombre: 'ROBOT DE PRÁCTICA', hp: 24, fases: 3, umbral: [24, 16, 8],
    ataques: { 1: ['espuma'], 2: ['espuma'], 3: ['salto'] },
    nombreFase: { 2: '¡Fase 2: escudo de práctica!', 3: '¡Fase 3: salto aplastante!' },
    init: function (b) {
      b.escala = prEsc(); b.altoVis = PR_ALTO;
      var p = punto('robotPractica', 'diana');
      b.debilH = p ? -p[1] * b.escala : 110;
      b.escOff = 0; b.escOn = 0; b.alt = 0; b.restT = 1.4;
      b.cansT = 0; b.peterQ = false; b.blopT = -99; b.blopTxtT = -99; b.caidaT = -99;
    },
    descanso: function (b) { return b.fase === 3 ? 1.3 : 2.0; },
    idle: function (b, dt, world, pausa) {
      var h = cercano(world, b.x, true);
      if (!h) return;
      b.facing = h.x < b.x ? -1 : 1;
      if (!pausa && b.fase !== 3 && Math.abs(h.x - b.x) > 150) {
        b.x = clamp(b.x + b.facing * 35 * dt, b.ar.x0 + 70, b.ar.x1 - 70);
      }
    },
    tick: function (b, dt, world) {
      if (b.fase === 1 && b.hp > 0) {
        if (b.st === 'mareado' || b.st === 'pausa') b.cansT = 0; else b.cansT += dt;
        if (b.st === 'descanso' || b.st === 'aviso') {
          if (b.peterQ) {          // Peter le devolvió la espuma: ¡mareado!
            b.peterQ = false; b.cansT = 0;
            marear(b, 3.0, '¡Mareado con su espuma!', true, world); sfx(world, 'bigPunch');
          } else if (b.cansT >= PR_CANSADO) {   // PLAN B: se cansa solo
            b.cansT = 0;
            marear(b, 3.0, '¡Uf, qué cansado!', true, world);
          }
        }
      } else b.peterQ = false;
      if (b.fase === 2) {
        if (b.escOff > 0) {
          b.escOff -= dt;
          if (b.escOff <= 0) { b.escOn = 0; txt(world, b.x, b.y - 230, '¡Escudo otra vez!', '#86efac', 0.9); sfx(world, 'shieldBlock'); }
        } else {
          b.escOn += dt;
          if (b.escOn >= PR_PLANB_ESCUDO) {      // PLAN B: el escudo se apaga solo
            b.escOff = 6; b.escOn = 0;
            txt(world, b.x, b.y - 230, '¡Escudo agotado!', '#fde047', 1.0); sfx(world, 'hackFail');
          }
        }
      }
      b.y = b.sueloY - b.alt;
    },
    alCambiarFase: function (b, world) {
      if (b.fase === 2) { b.escOff = 0; b.escOn = 0; sfx(world, 'shieldBlock'); }
      b.alt = 0;
    },
    avisoInicio: function (b, nm, world) {
      sfx(world, 'robot');
      if (nm === 'salto') {
        var h = cercano(world, b.x, true);
        var tx = h ? h.x : b.x;
        b.g.tx = clamp(tx, b.ar.x0 + 70, b.ar.x1 - 70); b.g.x0 = b.x;
        b.facing = b.g.tx < b.x ? -1 : (b.g.tx > b.x ? 1 : b.facing);
        warn(world, b.g.tx, b.sueloY, 70, AVISO);
      }
    },
    avisoTick: function (b, nm) {
      b.sq = nm === 'salto' ? 1 - 0.12 * clamp(b.stT / AVISO, 0, 1) : 1;   // se encoge antes de saltar
    },
    golpeInicio: function (b, nm, world) {
      b.sq = 1;
      if (nm === 'espuma') {
        var h = cercano(world, b.x, true);
        var ox = b.x + b.facing * 50 * b.escala, oy = b.y - 118 * b.escala;
        var ang = h ? Math.atan2((h.y - 30) - oy, h.x - ox) : (b.facing > 0 ? 0 : Math.PI);
        if (Math.cos(ang) * b.facing < 0.3) ang = b.facing > 0 ? 0.2 : Math.PI - 0.2;
        var spread = b.fase === 1 ? [-0.26, 0, 0.26] : [0];
        for (var i = 0; i < spread.length; i++) {
          var a = ang + spread[i];
          // Bolas propias (no del motor) para saber cuándo las para Peter: en F1 rebotan y le marean
          addObj(b, { k: 'espuma', x: ox, y: oy, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, r: 10, dmg: 1, rebota: b.fase === 1 });
        }
        sfx(world, 'net');
      } else if (nm === 'salto') {
        sfx(world, 'jump');
      }
    },
    golpe: function (b, nm, dt, world) {
      if (nm === 'espuma') return b.stT >= 0.4;
      // salto aplastante: parábola de 0,7 s hasta la sombra
      var T = 0.7, k = clamp(b.stT / T, 0, 1);
      if (!isFinite(b.g.x0) || !isFinite(b.g.tx)) { b.g.x0 = b.x; b.g.tx = b.x; }
      b.x = b.g.x0 + (b.g.tx - b.g.x0) * k;
      b.alt = Math.sin(k * Math.PI) * 140;
      if (k >= 1 && !b.g.cayo) {
        b.g.cayo = true; b.alt = 0;
        shake(world, 0.5); sfx(world, 'bigPunch');
        var hs = heroes(world);
        for (var i = 0; i < hs.length; i++) {
          var h = hs[i];
          if (Math.abs(h.x - b.x) < 78 && h.y > b.sueloY - 70) hurt(world, h, 2, b.x, { fisico: true, desdeArriba: true });
        }
        onda(b, b.x - 60, -1, 300, 1, '#f9a8d4', '#fdf2f8');
        onda(b, b.x + 60, 1, 300, 1, '#f9a8d4', '#fdf2f8');
        txt(world, b.x, b.y - 150, '¡BOING!', '#86efac', 0.8);
      }
      return b.stT >= T + 0.15;
    },
    trasGolpe: function (b, nm, world, clanc) {
      if (nm === 'salto') { marear(b, 2.0, '¡Mareado!', true, world); return true; }
      return false;
    },
    hackInmediato: function (b, world) {
      if (b.fase === 2) {
        b.escOff = 6; b.escOn = 0;
        txt(world, b.x, b.y - 230, '¡Escudo apagado!', '#67e8f9', 1.2); sfx(world, 'hackOk');
        b.hackHecho = true;
      } else if (b.fase === 1) {
        // En la fase 1 aún no hay escudo que apagar: esta fase es de Peter
        txt(world, b.x, b.y - 230, '¡Aún no hay escudo! Esto es cosa de Peter', '#fde047', 1.4);
        b.hackHecho = true;
      } else b.hackHecho = false;
    },
    aplicarHack: function (b, world) {
      if (b.hackHecho) return;
      marear(b, 2.0, '¡Hackeado!', true, world);
    },
    escudoActivo: function (b) { return prEscudo(b); },
    filtro: function (b, dmg, kind, zona, fromX) {
      // Con el escudo encendido, lo que llega DE FRENTE no hace daño (por detrás, sí)
      if (prEscudo(b) && zona.tipo === 'cuerpo' && isFinite(fromX) && sign(fromX - b.x) === b.facing) return 0;
      // Cuerpo acolchado: en F1 mientras no esté mareado, y siempre en F3 (allí cuenta la diana)
      if (zona.tipo === 'cuerpo' && (b.fase === 3 || (b.fase === 1 && b.st !== 'mareado'))) return PR_ACOLCHADO;
      return 1;
    },
    // Golpe en el cuerpo acolchado: "¡BLOP!" (en vez de "¡CLINC!") y recuerdo para la pista
    alFiltrar: function (b, zona, world) {
      b.blopT = b.t;
      if (b.t - b.blopTxtT > 1.2) { b.blopTxtT = b.t; txt(world, zona.x + zona.w / 2, zona.y + 20, '¡BLOP! Acolchado', '#f9a8d4', 0.7); }
    },
    // F3: un acierto en la diana DE PIE (francotirador, doble salto…) le tira sentado
    alGolpear: function (b, zona, kind, world) {
      if (b.fase === 3 && zona.id === 'diana' && b.st === 'descanso' && b.agK < 0.5 && b.t - b.caidaT > 4 && b.hp > 0) {
        b.caidaT = b.t;
        marear(b, 2.0, '¡Diana! ¡Al suelo!', true, world);
      }
    },
    zonas: function (b) {
      var s = b.escala, out = [], f = b.facing;
      if (prEscudo(b)) out.push(tRect(b, { x: f > 0 ? b.x + 40 * s : b.x - 40 * s - 30, y: b.y - 150 * s, w: 30, h: 150 * s, tipo: 'armadura', id: 'escudo' }));
      var debil = b.fase === 3 || b.agK > 0.5;
      if (debil) {
        var d = prDiana(b);
        out.push(tRect(b, { x: d.x - d.r, y: d.y - d.r, w: d.r * 2, h: d.r * 2, tipo: 'debil', id: 'diana' }));
      }
      out.push(tRect(b, { x: b.x - 40 * s, y: b.y - 150 * s, w: 80 * s, h: 150 * s, tipo: 'cuerpo', id: 'cuerpo' }));
      return out;
    },
    // Es de práctica: sin daño por contacto (se puede pegar a la diana sin perder corazones).
    // Lo que hace daño son la espuma y el aplastamiento del salto, que siempre avisan (§0.7).
    toque: function () { return null; },
    debilPrincipal: function (b) {
      var zs = CFG_PR.zonas(b);
      return debilCentro(zs, 'diana');
    },
    intro: function (b, t, world) {
      // Cae del cielo sobre su muelle, rebota y saluda
      var T = 0.6;
      if (t < T) { b.alt = 420 * (1 - (t / T) * (t / T)); }
      else {
        if (!b.g.aterrizo) {
          b.g.aterrizo = true; b.alt = 0; shake(world, 0.4); sfx(world, 'bigPunch');
          txt(world, b.x, b.y - 240, '¡ROBOT DE PRÁCTICA!', '#86efac', 1.6);
        }
        var k = t - T;
        b.alt = Math.max(0, Math.sin(k * 9) * 40 * Math.exp(-k * 3));
      }
      b.y = b.sueloY - b.alt; b.t = t;
      if (t >= 2.2) { b.alt = 0; b.y = b.sueloY; b.g = {}; return true; }
      return false;
    },
    derrota: function (b, t, world) {
      b.st = 'descanso'; b.agK = Math.max(0, b.agK - 0.05); b.t += 1 / 60;
      if (!b.g.fin) {
        b.g = { fin: true }; b.alt = 0; b.y = b.sueloY;
        fx(world, 'confeti', b.x, b.y - 120, { life: 1.6 });
        fx(world, 'confeti', b.x - 50, b.y - 80, { life: 1.4 });
        fx(world, 'confeti', b.x + 50, b.y - 80, { life: 1.4 });
        txt(world, b.x, b.y - 240, '¡Bien!', '#86efac', 1.4);
        sfx(world, 'hackOk');
        try { if (world && typeof world.pista === 'function') world.pista('¡Bravo! ¡Ya sois un equipo!', 3.5); } catch (e) { /* nada */ }
      }
      b.alt = Math.abs(Math.sin(t * 7)) * 30 * Math.max(0, 1 - t / 2.6);
      b.y = b.sueloY - b.alt;
      if (t > 1.2 && !b.g.c2) { b.g.c2 = true; fx(world, 'confeti', b.x, b.y - 160, { life: 1.4 }); }
      return t >= 2.6;
    },
    pista: function (b, world) {
      // Las pistas siguen lo que pasa: qué héroe lleva el jugador, escudo apagado, golpes acolchados…
      if (b.fase === 2 && b.escOff > 0) return '¡Escudo apagado! ¡Ahora, todos a por él!';
      var lleva = {}, hs = heroes(world);
      for (var i = 0; i < hs.length; i++) if (!hs[i].isAI) lleva[hs[i].heroe] = true;
      var textos = {
        1: lleva.peter ? 'Mantén {ataque} mirando al robot: ¡la espuma rebota en tu escudo y le marea!'
                       : '¡Está acolchado! Cámbiate a Peter ({cambio}) y para su espuma con {ataque}: ¡se mareará!',
        2: lleva.director ? '¡Escudo de práctica! Ve a la consola y mantén {hack} para apagarlo.'
                          : '¡Escudo de práctica! Cámbiate al Director ({cambio}) y apágalo en la consola.',
        3: lleva.mikey ? '¡Dale en la diana del pecho! Con el francotirador llegas desde lejos.'
                       : '¡Apunta a la diana del pecho! El francotirador de Mikey llega desde lejos ({cambio}).'
      };
      // Si el jugador insiste en lo que no sirve (acolchado o escudo), se lo recordamos enseguida
      var insiste = (b.t - b.blopT < 1.5) || (b.fase === 2 && b.clincUlt && b.t - b.clincUlt < 1.5);
      if (insiste && b.st !== 'mareado') return textos[b.fase] || null;
      return pistaFase(b, textos);
    },
    draw: function (ctx, b, world) {
      var s = b.escala, f = b.facing;
      // sombra en el suelo (sobre todo al saltar)
      ctx.save();
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(b.x, b.sueloY - 2, 55 * (1 - b.alt / 500), 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save();
      postura(ctx, b);
      if (!art('robotPractica', ctx, b.x, b.y, { scale: s, facing: f, golpe: b.hitT > 0 })) {
        ctx.fillStyle = '#22c55e'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
        rrect(ctx, b.x - 45, b.y - 190, 90, 175, 18); ctx.fill(); ctx.stroke();
        var d0 = prDiana(b);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d0.x, d0.y, d0.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(d0.x, d0.y, d0.r * 0.55, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      polvo(ctx, b);
      // escudo de práctica (fase 2)
      if (b.fase === 2 && b.hp > 0) {
        var on = prEscudo(b), sx = b.x + f * 56 * s, top = tY(b, b.y - 155 * s), bot = tY(b, b.y - 4);
        ctx.save();
        ctx.globalAlpha = on ? 0.45 + 0.1 * Math.sin(b.t * 8) : 0.12;
        ctx.fillStyle = '#86efac'; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(sx, (top + bot) / 2, 18, (bot - top) / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = on ? 0.9 : 0.25; ctx.stroke();
        if (on) {
          ctx.strokeStyle = '#dcfce7'; ctx.lineWidth = 2;
          for (var i = 0; i < 4; i++) { var yy = top + (bot - top) * (0.2 + i * 0.2); ctx.beginPath(); ctx.moveTo(sx - 8, yy); ctx.lineTo(sx + 8, yy - 6); ctx.stroke(); }
        }
        ctx.restore();
      }
      var zs = CFG_PR.zonas(b);
      if (b.hp > 0) haloDebil(ctx, b, zs);
      var cabeza = tY(b, b.y - PR_ALTO);
      estrellasMareo(ctx, b, cabeza);
      if (b.st === 'aviso' && !b.enIntro) excl(ctx, b.x, cabeza - 22, world);
      if (b.st === 'aviso' && b.ataque === 'espuma') {
        ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(b.t * 20);
        ctx.fillStyle = '#f9a8d4';
        ctx.beginPath(); ctx.arc(b.x + f * 50 * s, tY(b, b.y - 118 * s), 12 + 10 * (b.stT / AVISO), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  };
  G.P3B.register('robotPractica', hacerDef(CFG_PR));

  // =========================================================================
  //  13.2  LOS GUARDIANES DE ROBOVILL (cap. 4) — 36 de vida, ≈ 230 px
  //  Escudo de energía delante (lo apaga el Director; plan B: 3 s cada 20 s),
  //  batería en la espalda (×2), botón en la cabeza (×2, ¡BOING!), se gira
  //  despacio. Ataques: rayo, puño-martillo y 3 minas. Guardias: 2 + 2.
  //  Trabajo en equipo del GDD: el CUERPO es de metal (×0,4) salvo hackeado o
  //  mareado (Director, ¡CLANC! de Peter, ¡BOING! de Falcon); la batería (Mikey,
  //  desde atrás) y el botón rinden ×2. Aporrear de frente no basta.
  // =========================================================================
  var GU_ALTO = 230;
  function guEsc() { return GU_ALTO / altoArte('guardianRobovill'); }
  function guEscudo(b) { return b.escOff <= 0 && b.hp > 0 && !b.enIntroSinEscudo; }
  function guPunto(b, clave) {
    var p = punto('guardianRobovill', clave), s = b.escala;
    if (!p) return null;
    return { x: b.x + p[0] * s * b.facing, y: b.y + p[1] * s, a: p[2] * s, h: (p.length > 3 ? p[3] : p[2]) * s };
  }
  function guGuardias(b, world, n) {
    var vivos = 0;
    try {
      var es = world.enemies() || [];
      // solo cuentan los guardias DENTRO de la arena (los robots-escudo del resto del nivel no)
      for (var i = 0; i < es.length; i++) {
        var e0 = es[i];
        if (e0 && e0.alive && e0.__tipo === 'escudo' && e0.x >= b.ar.x0 - 20 && e0.x <= b.ar.x1 + 20) vivos++;
      }
    } catch (e) { vivos = 0; }
    n = Math.min(n, Math.max(0, 4 - vivos));
    for (var k = 0; k < n; k++) {
      var x = b.ar.x1 - 50 - k * 70;
      b.guardQ.push({ x: x, t: AVISO });
      warn(world, x, b.sueloY, 40, AVISO);
    }
    if (n > 0) txt(world, b.ar.x1 - 90, b.sueloY - 140, '¡Guardias!', '#fca5a5', 1.0);
  }
  // Termina (cancela) un giro a medias: si se marea girando, no se queda como una tira fina.
  // Se deshace el giro para que la batería siga mirando a quien se puso a su espalda.
  function guFinGiro(b) {
    if (b.giroT > 0 && b.girado) b.facing = -b.facing;
    b.giroT = 0; b.sx = 1; b.girado = false;
  }
  var CFG_GU = {
    tipo: 'guardian', nombre: 'GUARDIANES DE ROBOVILL', hp: 36, fases: 2, umbral: [36, 18],
    ataques: { 1: ['rayo', 'puno', 'minas'], 2: ['rayo', 'puno', 'minas'] },
    nombreFase: { 2: '¡Fase 2: refuerzos!' },
    init: function (b) {
      b.escala = guEsc(); b.altoVis = GU_ALTO;
      var p = punto('guardianRobovill', 'bateria');
      b.debilH = p ? -p[1] * b.escala : 118;
      b.escOff = 0; b.escOn = 0; b.hackT = 0; b.giroT = 0; b.ultimoGiro = -10;
      b.guardQ = []; b.guardias1 = false; b.restT = 1.2;
    },
    descanso: function (b) { return b.fase === 2 ? 1.35 : 1.8; },
    descansoTrasMareo: 0.8,
    idle: function (b, dt, world, pausa) {
      if (b.giroT > 0) {             // se gira despacio (0,5 s)
        b.giroT -= dt;
        b.sx = Math.abs(Math.cos((1 - b.giroT / 0.5) * Math.PI));
        if (b.giroT <= 0.25 && !b.girado) { b.girado = true; b.facing = -b.facing; }
        if (b.giroT <= 0) { b.sx = 1; b.giroT = 0; b.girado = false; }
        return;
      }
      var h = cercano(world, b.x, false);
      if (!h) return;
      var want = h.x < b.x ? -1 : 1;
      if (want !== b.facing && b.t - b.ultimoGiro >= 3 && Math.abs(h.x - b.x) > 20) {
        b.giroT = 0.5; b.ultimoGiro = b.t; b.girado = false; sfx(world, 'robot');
        return;
      }
      if (!pausa && want === b.facing && Math.abs(h.x - b.x) > 180) {
        b.x = clamp(b.x + b.facing * (b.fase === 2 ? 40 : 32) * dt, b.ar.x0 + 80, b.ar.x1 - 80);
      }
    },
    puedeAtacar: function (b) { return b.giroT <= 0; },
    tick: function (b, dt, world) {
      if (!b.guardias1) { b.guardias1 = true; guGuardias(b, world, b.fase === 2 ? 4 : 2); }   // {fase: 2} trae los 2 + 2
      if (b.giroT > 0 && b.st === 'mareado') guFinGiro(b);
      for (var i = b.guardQ.length - 1; i >= 0; i--) {
        var q = b.guardQ[i];
        q.t -= dt;
        if (q.t <= 0) {
          b.guardQ.splice(i, 1);
          var e = null;
          try { e = world.spawnEnemy('escudo', q.x, b.sueloY, {}); } catch (err) { e = null; }
          if (e) e.facing = -1;
          fx(world, 'sparkle', q.x, b.sueloY - 40); sfx(world, 'door');
        }
      }
      if (b.hackT > 0) b.hackT -= dt;
      if (b.escOff > 0) {
        b.escOff -= dt;
        if (b.escOff <= 0) { b.escOn = 0; sfx(world, 'shieldBlock'); txt(world, b.x, b.y - 250, '¡Escudo encendido!', '#f9a8d4', 0.9); }
      } else {
        b.escOn += dt;
        if (b.escOn >= 20) {          // PLAN B: el escudo se apaga solo 3 s cada 20 s
          b.escOff = 3; b.escOn = 0;
          sfx(world, 'hackOk'); txt(world, b.x, b.y - 250, '¡Su escudo se ha apagado! ¡Atacad!', '#fde047', 1.4);
        }
      }
    },
    alCambiarFase: function (b, world) { guGuardias(b, world, 2); b.giroT = 0; b.sx = 1; },
    avisoInicio: function (b, nm, world) {
      var f = b.facing;
      if (nm === 'rayo') sfx(world, 'zap');
      else if (nm === 'puno') { sfx(world, 'robot'); warn(world, b.x + f * 80, b.sueloY, 62, AVISO); }
      else if (nm === 'minas') { sfx(world, 'robot'); warn(world, b.x + f * 80, b.sueloY, 40, AVISO); }
    },
    golpeInicio: function (b, nm, world) {
      var f = b.facing, ar = b.ar;
      if (nm === 'rayo') {
        world.spawnBeam({ x1: b.x + f * 48, y1: b.y - 40, x2: f > 0 ? ar.x1 : ar.x0, y2: b.y - 40, dmg: 1, from: 'enemy', life: 0.45, width: 18 });
        sfx(world, 'laser'); shake(world, 0.15);
      } else if (nm === 'puno') {
        b.g.pegado = false;
      } else if (nm === 'minas') {
        b.g.n = 0;
      }
    },
    golpe: function (b, nm, dt, world) {
      var f = b.facing, ar = b.ar;
      if (nm === 'rayo') {
        if (b.fase === 2 && !b.g.segundo && b.stT >= 0.6) {   // en la fase 2 barre dos veces
          b.g.segundo = true;
          world.spawnBeam({ x1: b.x + f * 48, y1: b.y - 40, x2: f > 0 ? ar.x1 : ar.x0, y2: b.y - 40, dmg: 1, from: 'enemy', life: 0.45, width: 18 });
          sfx(world, 'laser');
        }
        return b.stT >= (b.fase === 2 ? 1.1 : 0.5);
      }
      if (nm === 'puno') {
        if (!b.g.pegado) {
          b.g.pegado = true;
          sfx(world, 'bigPunch'); shake(world, 0.4);
          var r = { x: f > 0 ? b.x + 15 : b.x - 15 - 125, y: b.y - 120, w: 125, h: 120 }, hs = heroes(world);
          for (var i = 0; i < hs.length; i++) {
            if (!overlap(r, heroRect(hs[i]))) continue;
            if (hurt(world, hs[i], 2, b.x, { fisico: true }) === 'bloqueado' && !b.clanc) {
              b.clanc = true; txt(world, b.x + f * 60, b.y - 160, '¡CLANC!', '#fde047', 0.9);
            }
          }
        }
        return b.stT >= 0.45;
      }
      if (nm === 'minas') {
        while (b.g.n < 3 && b.stT >= b.g.n * 0.3) {
          addObj(b, { k: 'mina', x: b.x + f * 80, y: b.sueloY - 13, vx: f * 160, rot: 0 });
          b.g.n++; sfx(world, 'clink');
        }
        return b.stT >= 0.75;
      }
      return true;
    },
    hackInmediato: function (b, world) {
      b.escOff = Math.max(b.escOff, 8); b.escOn = 0; b.hackT = 8;
      txt(world, b.x, b.y - 250, '¡Escudo hackeado!', '#67e8f9', 1.2);
    },
    aplicarHack: function (b, world) { guFinGiro(b); marear(b, 1.5, '¡Se arrodilla!', true, world); },
    alGolpear: function (b, zona, kind, world) {
      if (zona.id === 'boton' && (!b.botonT || b.t - b.botonT > 1.5)) {
        b.botonT = b.t;
        txt(world, zona.x, zona.y - 20, '¡BOING!', '#fde047', 0.9); sfx(world, 'jump');
        b.escOff = Math.max(b.escOff, 3); b.escOn = 0;
        if (b.st === 'descanso') { guFinGiro(b); marear(b, 1.0, null, false, world); }
        else if (b.st === 'aviso' || b.st === 'golpe') b.clanc = true;   // se marea al terminar su ataque
      }
    },
    escudoActivo: function (b) { return guEscudo(b); },
    filtro: function (b, dmg, kind, zona, fromX) {
      if (guEscudo(b) && zona.tipo === 'cuerpo' && isFinite(fromX) && sign(fromX - b.x) === b.facing) return 0;
      // Cuerpo de metal: solo rinde de verdad si está hackeado o mareado (arrodillado, ¡CLANC!, ¡BOING!)
      if (zona.tipo === 'cuerpo' && b.hackT <= 0 && b.st !== 'mareado') return 0.4;
      return 1;
    },
    zonas: function (b) {
      var s = b.escala, f = b.facing, out = [];
      if (guEscudo(b)) out.push(tRect(b, { x: f > 0 ? b.x + 62 : b.x - 62 - 32, y: b.y - 235, w: 32, h: 235, tipo: 'armadura', id: 'escudo' }));
      var bo = guPunto(b, 'boton');
      if (bo) { var rb = Math.max(14, bo.a * 1.6); out.push(tRect(b, { x: bo.x - rb, y: bo.y - rb, w: rb * 2, h: rb * 2, tipo: 'debil', id: 'boton' })); }
      var ba = guPunto(b, 'bateria');
      if (ba) out.push(tRect(b, { x: ba.x - ba.a / 2 - 3, y: ba.y - ba.h / 2, w: ba.a + 6, h: ba.h, tipo: 'debil', id: 'bateria' }));
      out.push(tRect(b, { x: b.x - 55 * s, y: b.y - 190 * s, w: 110 * s, h: 190 * s, tipo: 'cuerpo', id: 'cuerpo' }));
      return out;
    },
    // Sin daño por contacto: hay que poder pasar a su espalda (batería) sin perder corazones;
    // lo peligroso son sus ataques, que siempre avisan (dificultad generosa, §0.7).
    toque: function () { return null; },
    debilPrincipal: function (b) { return debilCentro(CFG_GU.zonas(b), 'bateria'); },
    intro: function (b, t, world) {
      b.t = t;
      b.enIntroSinEscudo = t < 1.0;
      if (t > 0.3 && !b.g.ojos) { b.g.ojos = true; sfx(world, 'robot'); }
      if (t > 1.0 && !b.g.esc) { b.g.esc = true; sfx(world, 'shieldBlock'); txt(world, b.x, b.y - 270, '¡LOS GUARDIANES DE ROBOVILL!', '#fca5a5', 1.6); }
      if (t > 1.6 && !b.g.ruge) { b.g.ruge = true; sfx(world, 'roar'); shake(world, 0.3); }
      if (t >= 2.4) { b.g = {}; b.enIntroSinEscudo = false; return true; }
      return false;
    },
    derrota: function (b, t, world) {
      b.t += 1 / 60; b.st = 'descanso';
      if (!b.g.fin) { b.g = { fin: true, n: 0 }; sfx(world, 'robot'); b.escOff = 99; }
      if (t < 1.8) {
        b.tembl = 1;
        if (t >= b.g.n * 0.25) {
          b.g.n++;
          fx(world, 'explosion', b.x + rnd(-60, 60), b.y - rnd(30, 200), { r: 22 });
          if (b.g.n % 2) sfx(world, 'explosion');
          shake(world, 0.25);
        }
      } else if (!b.gone) {
        b.gone = true; b.popT = 0;
        fx(world, 'explosion', b.x, b.y - 110, { r: 60 }); fx(world, 'explosion', b.x - 40, b.y - 60, { r: 40 }); fx(world, 'explosion', b.x + 40, b.y - 160, { r: 40 });
        sfx(world, 'explosion'); shake(world, 0.7);
        txt(world, b.x, b.y - 200, '¡POP!', '#fde047', 1.2);
      }
      if (b.gone) b.popT = (b.popT || 0) + 1 / 60;
      return t >= 3.2;
    },
    pista: function (b) {
      if (b.clincN >= 6 && b.t - b.clincUlt < 4) return '¡De frente no! Ponte a su espalda, ¡su batería!';
      return pistaFase(b, {
        1: '¡Mikey, dispara a la batería de su espalda! Peter, para el puño; Director, hackea la consola; Falcon, ¡salta a su botón!',
        2: '¡Más guardias! Las minas hacen pop de un disparo: ¡la metralleta de Mikey es ideal! ({disparo} para elegirla)'
      });
    },
    draw: function (ctx, b, world) {
      var s = b.escala, f = b.facing;
      if (b.gone) {
        var t01 = clamp(num(b.popT, 0) / 1.0, 0, 1);
        if (t01 < 1 && !art('chispasPop', ctx, b.x, b.y - 110, { t01: t01, scale: 2.2 })) {
          ctx.save(); ctx.globalAlpha = 1 - t01; ctx.fillStyle = '#fde047';
          for (var q = 0; q < 10; q++) { var a = q * 0.63; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * 120 * t01, b.y - 110 + Math.sin(a) * 120 * t01, 6, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
        return;
      }
      var esc = guEscudo(b);
      ctx.save();
      postura(ctx, b);
      if (b.st === 'golpe' && b.ataque === 'puno') {   // se inclina hacia delante al golpear
        ctx.translate(b.x, b.y); ctx.rotate(0.1 * f * Math.sin(Math.min(1, b.stT / 0.2) * Math.PI / 2)); ctx.translate(-b.x, -b.y);
      }
      if (!art('guardianRobovill', ctx, b.x, b.y, { scale: s, facing: f, escudo: esc, hackeado: b.hackT > 0 })) {
        ctx.fillStyle = '#64748b'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
        rrect(ctx, b.x - 60, b.y - 220, 120, 215, 20); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      polvo(ctx, b);
      // Burbuja rosa del escudo encendido (respaldo de §2.5)
      if (esc && b.hp > 0) {
        var ex = b.x + f * 78, top = tY(b, b.y - 232), bot = tY(b, b.y - 2);
        ctx.save();
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(b.t * 7);
        ctx.fillStyle = '#ec4899';
        ctx.beginPath(); ctx.ellipse(ex, (top + bot) / 2, 20, (bot - top) / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.35; ctx.strokeStyle = '#f9a8d4'; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
      }
      var zs = CFG_GU.zonas(b);
      if (b.hp > 0) haloDebil(ctx, b, zs);
      var cabeza = tY(b, b.y - GU_ALTO);
      estrellasMareo(ctx, b, cabeza);
      if (b.st === 'aviso' && !b.enIntro) {
        // el "!" va a un lado de la cabeza (delante): así no tapa el botón de Falcon
        excl(ctx, b.x + f * 70, cabeza + 6, world);
        var k = clamp(b.stT / AVISO, 0, 1);
        ctx.save();
        if (b.ataque === 'rayo') {              // el ojo se carga
          ctx.globalAlpha = 0.4 + 0.5 * k; ctx.fillStyle = '#f87171';
          ctx.beginPath(); ctx.arc(b.x + f * 22 * s, tY(b, b.y - 158 * s), 8 + 10 * k, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.25 + 0.3 * k; ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
          ctx.beginPath(); ctx.moveTo(b.x + f * 48, b.y - 40); ctx.lineTo(f > 0 ? b.ar.x1 : b.ar.x0, b.y - 40); ctx.stroke();
        } else if (b.ataque === 'puno') {       // el puño-martillo brilla
          ctx.globalAlpha = 0.35 + 0.45 * k; ctx.fillStyle = '#fde047';
          ctx.beginPath(); ctx.arc(b.x - f * 44 * s, tY(b, b.y - 176 * s), 26 + 8 * Math.sin(b.t * 18), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      if (b.st === 'golpe' && b.ataque === 'rayo') {
        ctx.save(); ctx.strokeStyle = '#f87171'; ctx.lineWidth = 6; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(b.x + f * 22 * s, tY(b, b.y - 158 * s)); ctx.lineTo(b.x + f * 48, b.y - 40); ctx.stroke();
        ctx.restore();
      }
      if (b.st === 'golpe' && b.ataque === 'puno' && b.stT < 0.35) {
        var dp = gfx('drawPunch');
        ctx.save();
        if (dp) { ctx.translate(b.x + f * 85, b.y - 70); ctx.scale(2, 2); try { dp(ctx, 0, 0, f, clamp(b.stT / 0.35, 0, 1)); } catch (e) { /* nada */ } }
        ctx.restore();
        var sw = gfx('drawShockwave');
        if (sw) { ctx.save(); try { sw(ctx, b.x + f * 85, b.sueloY - 4, 80, clamp(b.stT / 0.35, 0, 1)); } catch (e2) { /* nada */ } ctx.restore(); }
      }
    }
  };
  G.P3B.register('guardian', hacerDef(CFG_GU));

  // =========================================================================
  //  13.3  ROBOVILL A PIE (cap. 5) — 60 de vida, ≈ 316 px, look.robovill
  //  F1 (60–40) brazos cambiantes: martillo (clavado 2 s), sierra, cañón.
  //  F2 (40–20) taladro: bajo tierra, sale debajo de un héroe y se marea 2,5 s.
  //  F3 (20–0) alas: vuela, lluvia de mini-robots y cañón. Consola → cadenas
  //  6 s; plan B: aterriza solo a los 10 s. Al llegar a 0 se hace GIGANTE.
  // =========================================================================
  var RV_ALTO = 316, RV_VUELO = 95;   // en vuelo, la gema queda por encima del salto simple (§13.3)
  function rvEsc() { return RV_ALTO / altoArte('robovill'); }
  function rvVar() { return look().robovill === 'B' ? 'B' : 'A'; }
  function rvGema(b) {
    var p = punto('robovill', 'gema', rvVar()), s = b.escala;
    if (!p) return { x: b.x, y: b.y - 120, r: 24 };
    return { x: b.x + p[0] * s * b.facing, y: b.y + p[1] * s, r: Math.max(20, p[2] * s) };
  }
  function rvBrazo(b) { return { x: b.x + b.facing * 112 * b.escala, y: b.y - 122 * b.escala }; }
  function rvSierraFuera(b) { for (var i = 0; i < b.objs.length; i++) if (b.objs[i].k === 'sierra' && !b.objs[i].dead) return true; return false; }
  function rvCanon(b, world, n) {
    var h = cercano(world, b.x, true), o = rvBrazo(b);
    var ang = h ? Math.atan2((h.y - 30) - o.y, h.x - o.x) : (b.facing > 0 ? 0.3 : Math.PI - 0.3);
    ang += (n - 1) * 0.08;
    world.spawnProjectile({ x: o.x, y: o.y, vx: Math.cos(ang) * 330, vy: Math.sin(ang) * 330, r: 10, dmg: 1, from: 'enemy', kind: 'bala', life: 3 });
    sfx(world, 'laser');
  }
  function rvLluvia(b, world) {
    var vivos = 0, i;
    try {
      var es = world.enemies() || [];
      for (i = 0; i < es.length; i++) if (es[i] && es[i].alive && es[i].__tipo === 'miniRobot' && es[i].x >= b.ar.x0 - 20 && es[i].x <= b.ar.x1 + 20) vivos++;
    } catch (e) { vivos = 0; }
    var n = Math.min(5 + Math.floor(Math.random() * 4), Math.max(0, 10 - vivos));
    var hs = heroes(world), ar = b.ar;
    for (i = 0; i < n; i++) {
      var x;
      if (i < hs.length && i < 2) x = hs[i].x + rnd(-40, 40);
      else x = ar.x0 + 60 + (ar.x1 - ar.x0 - 120) * ((i + 0.5) / n) + rnd(-25, 25);
      x = clamp(x, ar.x0 + 40, ar.x1 - 40);
      var e = null;
      try { e = world.spawnEnemy('miniRobot', x, ar.sueloY - 260, { cayendo: true }); } catch (err) { e = null; }
      if (!e) {   // respaldo propio si enemigos3.js aún no tiene el mini-robot
        addObj(b, { k: 'caida', x: x, y: ar.sueloY - 400, vy: 200 });
        warn(world, x, ar.sueloY, 30, AVISO);
      }
    }
    sfx(world, 'miniRobot');
    txt(world, b.x, b.y - RV_ALTO - 20, '¡Lluvia de mini-robots!', '#fca5a5', 1.2);
  }
  // El letrero grande de la derrota, en el centro de la PANTALLA (≥ 44 px, dorado con borde).
  function rvLetreroGigante(ctx, b, world) {
    var t = num(b.defT, 0);
    if (t < 0.5) return;
    var cx = num(world && world.camX, b.x - 480) + num(world && world.viewW, 960) / 2;
    var cy = num(world && world.camY, b.sueloY - 470) + num(world && world.viewH, 540) * 0.5;
    var pop = clamp((t - 0.5) / 0.25, 0, 1);
    var esc = (0.4 + 0.75 * pop - 0.15 * clamp((t - 0.75) / 0.2, 0, 1)) * (1 + 0.04 * Math.sin(t * 14));
    var FONT = 'system-ui, "Segoe UI", Arial, sans-serif';
    ctx.save();
    ctx.translate(cx + Math.sin(t * 37) * 3 * clamp(t - 1, 0, 1), cy);
    ctx.rotate(-0.04 + 0.02 * Math.sin(t * 9));
    ctx.scale(esc, esc);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    var lineas = ['¡ROBOVILL SE HACE', 'GIGANTE!'], tam = [46, 72], ys = [-40, 22];
    for (var i = 0; i < 2; i++) {
      ctx.font = 'bold ' + tam[i] + 'px ' + FONT;
      ctx.strokeStyle = '#450a0a'; ctx.lineWidth = i ? 14 : 11; ctx.strokeText(lineas[i], 0, ys[i] + 4);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = i ? 10 : 8; ctx.strokeText(lineas[i], 0, ys[i]);
      ctx.fillStyle = i ? '#fde047' : '#fca5a5'; ctx.fillText(lineas[i], 0, ys[i]);
    }
    ctx.restore();
  }
  var CFG_RV = {
    tipo: 'robovillPie', nombre: 'ROBOVILL', hp: 60, fases: 3, umbral: [60, 40, 20],
    ataques: { 1: ['martillo', 'sierra', 'canon'], 2: ['taladro'], 3: ['lluvia', 'canon'] },
    // Es el jefe final: pelea larga (§11.5, 2–3 min). Cada fase dura ≥ 22 s y enseña DOS veces cada
    // ataque; su armadura reduce el daño (×0,7) para que la barra baje sin quedarse parada.
    faseMin: 28, rondas: 2, faseMax: 70, danoMul: 0.35,
    nombreFase: { 2: '¡Fase 2: el taladro!', 3: '¡Fase 3: alas de metal!' },
    init: function (b, world, opts) {
      b.escala = rvEsc(); b.altoVis = RV_ALTO;
      var p = punto('robovill', 'gema', rvVar());
      b.debilH = p ? -p[1] * b.escala : 120;
      b.brazo = 'martillo'; b.alas = 'cerradas'; b.taladro = 0.3;
      b.alt = 0; b.altObj = 0; b.flyT = 0; b.cadenas = 0; b.cadPts = []; b.ultimoGiro = -10; b.restT = 1.0;
      if (b.fase === 2) b.brazo = 'pinza';     // creado ya en la fase 2 ({fase: 2}): igual que alCambiarFase
      if (b.fase === 3) { b.alas = 'abiertas'; b.altObj = RV_VUELO; b.alt = RV_VUELO; b.y = b.sueloY - b.alt; b.brazo = 'canon'; }
    },
    descanso: function (b) { return b.fase === 1 ? 1.5 : (b.fase === 2 ? 1.2 : 1.4); },
    descansoTrasMareo: 0.6,
    idle: function (b, dt, world, pausa) {
      var h = cercano(world, b.x, true);
      if (b.fase === 3) {
        if (b.alt >= RV_VUELO - 8) {     // vuela de lado a lado
          var mid = (b.ar.x0 + b.ar.x1) / 2, tx = mid + Math.sin(b.t * 0.45) * 260;
          b.x = clamp(b.x + clamp(tx - b.x, -70 * dt, 70 * dt), b.ar.x0 + 120, b.ar.x1 - 120);
        }
        if (h) b.facing = h.x < b.x ? -1 : 1;
        return;
      }
      if (!h) return;
      var want = h.x < b.x ? -1 : 1;
      if (want !== b.facing && b.t - b.ultimoGiro > 1.2) { b.facing = want; b.ultimoGiro = b.t; }
      if (!pausa && Math.abs(h.x - b.x) > 240 && want === b.facing) b.x = clamp(b.x + b.facing * 45 * dt, b.ar.x0 + 110, b.ar.x1 - 110);
    },
    puedeAtacar: function (b) {
      if (rvSierraFuera(b)) return false;
      if (b.fase === 3) return b.alt >= RV_VUELO - 4;
      return true;
    },
    tick: function (b, dt, world) {
      // altura (vuelo de la fase 3)
      var v = 260 * dt;
      b.alt = clamp(b.alt + clamp(b.altObj - b.alt, -v, v), 0, 400);
      b.y = b.sueloY - b.alt;
      b.taladro = (b.st === 'aviso' && b.ataque === 'taladro') || (b.st === 'golpe' && b.ataque === 'taladro') ? 1 : 0.3;
      if (b.cadenas > 0) b.cadenas -= dt;
      if (b.fase === 3) {
        if (b.alt >= RV_VUELO - 4 && b.st !== 'mareado') b.flyT += dt;
        // PLAN B: aterriza solo a los 10 s de vuelo
        if (b.flyT >= 10 && b.st === 'descanso') {
          b.flyT = 0; b.altObj = 0;
          marear(b, 4.0, '¡Aterriza cansado!', true, world);
          sfx(world, 'escape');
        }
      }
    },
    alCambiarFase: function (b, world) {
      b.sink = 0; b.sq = 1;
      if (b.fase === 2) { b.brazo = 'pinza'; }
      if (b.fase === 3) { b.alas = 'abiertas'; b.altObj = RV_VUELO; b.flyT = 0; sfx(world, 'escape'); b.brazo = 'canon'; }
    },
    finMareo: function (b, world) {
      if (b.fase === 3) { b.altObj = RV_VUELO; b.flyT = 0; sfx(world, 'escape'); }
    },
    avisoDur: function (b, nm) { return nm === 'taladro' ? 1.7 : AVISO; },
    avisoInicio: function (b, nm, world) {
      var f = b.facing;
      if (nm === 'martillo' || nm === 'sierra' || nm === 'canon') {
        b.brazo = nm; sfx(world, 'transform');     // el cambio de brazo ES el aviso (1,0 s)
        if (nm === 'martillo') warn(world, b.x + f * 130, b.sueloY, 80, AVISO);
      } else if (nm === 'taladro') {
        sfx(world, 'drill'); shake(world, 0.25);
        b.g.x0 = b.x;
      } else if (nm === 'lluvia') {
        sfx(world, 'robot');
      }
    },
    avisoTick: function (b, nm, dt, world) {
      if (nm !== 'taladro') return;
      // 0–0,5 s: se mete bajo tierra; luego el círculo con "!" debajo de un héroe 1,2 s
      if (b.stT < 0.5) { b.sink = (b.stT / 0.5) * (RV_ALTO + 20); b.tembl = 0.2; return; }
      b.sink = RV_ALTO + 20;
      if (!b.g.objetivo) {
        b.g.objetivo = true;
        var L = null;
        try { L = world.leader ? world.leader() : null; } catch (e) { L = null; }
        var h = L || cercano(world, b.x, true);
        var tx = clamp(h ? h.x : b.x, b.ar.x0 + 90, b.ar.x1 - 90);
        b.g.tx = tx; b.g.mx = b.x; b.x = tx;
        warn(world, tx, b.sueloY, 70, 1.2);
        sfx(world, 'rumble');
      }
      b.g.mx += clamp(b.g.tx - b.g.mx, -900 * dt, 900 * dt);
      shake(world, 0.08);
    },
    golpeInicio: function (b, nm, world) {
      var f = b.facing;
      if (nm === 'sierra') {
        addObj(b, { k: 'sierra', x: b.x + f * 90, y: b.sueloY - 24, vx: f * 340, rot: 0, fase: 'ida' });
        sfx(world, 'sword');
      } else if (nm === 'canon') {
        b.g.n = 0;
      } else if (nm === 'taladro') {
        b.sink = 0; b.agK = 1;                 // sale de golpe… y se queda medio enterrado (agachado)
        sfx(world, 'drill'); sfx(world, 'bigPunch'); shake(world, 0.7);
        var hs = heroes(world);
        for (var i = 0; i < hs.length; i++) {
          if (Math.abs(hs[i].x - b.x) < 80) hurt(world, hs[i], 2, b.x, { fisico: true, desdeAbajo: true });
        }
        for (var k = 0; k < 6; k++) fx(world, 'sparkle', b.x + rnd(-70, 70), b.sueloY - rnd(10, 90), { life: 0.5 });
        txt(world, b.x, b.sueloY - 200, '¡CRAC!', '#fca5a5', 0.8);
      } else if (nm === 'lluvia') {
        rvLluvia(b, world);
      } else if (nm === 'martillo') {
        b.g.slam = false;
      }
    },
    golpe: function (b, nm, dt, world) {
      var f = b.facing;
      if (nm === 'martillo') {
        if (!b.g.slam && b.stT >= 0.2) {
          b.g.slam = true;
          sfx(world, 'bigPunch'); shake(world, 0.6);
          var r = { x: f > 0 ? b.x + 40 : b.x - 40 - 180, y: b.y - 110, w: 180, h: 110 }, hs = heroes(world);
          for (var i = 0; i < hs.length; i++) {
            if (!overlap(r, heroRect(hs[i]))) continue;
            if (hurt(world, hs[i], 2, b.x, { fisico: true }) === 'bloqueado' && !b.clanc) { b.clanc = true; txt(world, b.x + f * 80, b.y - 180, '¡CLANC!', '#fde047', 0.9); }
          }
          var ix = b.x + f * 130;
          onda(b, ix - 30, -1, 320, 1); onda(b, ix + 30, 1, 320, 1);
        }
        return b.stT >= 0.45;
      }
      if (nm === 'sierra') return b.stT >= 0.45;
      if (nm === 'canon') {
        while (b.g.n < 3 && b.stT >= b.g.n * 0.25) { rvCanon(b, world, b.g.n); b.g.n++; }
        return b.stT >= 0.65;
      }
      if (nm === 'taladro') { b.agK = 1; return b.stT >= 0.35; }
      if (nm === 'lluvia') return b.stT >= 0.5;
      return true;
    },
    trasGolpe: function (b, nm, world, clanc) {
      if (nm === 'martillo') { marear(b, 2.0, '¡Clavado!', true, world); return true; }
      if (nm === 'taladro') { marear(b, 2.5, '¡Mareado!', true, world); b.agK = 1; return true; }
      return false;
    },
    aplicarHack: function (b, world, consola) {
      if (b.fase === 3) {
        // ¡Cadenas magnéticas! Lo bajan al suelo 6 s
        b.cadenas = 6; b.altObj = 0; b.flyT = 0;
        var c = consola && isFinite(consola.x) ? consola : null;
        b.cadPts = c ? [{ x: c.x, y: c.y }, { x: b.ar.x0 + b.ar.x1 - c.x, y: c.y }] : [{ x: b.ar.x0 + 30, y: b.sueloY - 24 }, { x: b.ar.x1 - 30, y: b.sueloY - 24 }];
        marear(b, 6.0, '¡Cadenas magnéticas!', true, world);
        sfx(world, 'hackOk'); shake(world, 0.4);
      } else {
        marear(b, 2.0, '¡Hackeado!', true, world);
        sfx(world, 'hackOk');
      }
    },
    escudoActivo: function () { return false; },
    zonas: function (b) {
      if (b.sink > 40) return [];          // bajo tierra no se le puede dar
      var s = b.escala, out = [], g = rvGema(b);
      out.push(tRect(b, { x: g.x - g.r, y: g.y - g.r, w: g.r * 2, h: g.r * 2, tipo: 'debil', id: 'gema' }));
      out.push(tRect(b, { x: b.x - 72 * s, y: b.y - 255 * s, w: 144 * s, h: 255 * s, tipo: 'cuerpo', id: 'cuerpo' }));
      return out;
    },
    toque: function (b) {
      // El contacto solo hace daño mientras ataca (y todo ataque avisa 1,0 s, §0.7). Quieto, clavado,
      // mareado, atado o bajo tierra no: es justo cuando hay que acercarse a pegarle en la gema.
      if (b.st !== 'golpe' || b.sink > 40 || b.agK > 0.3) return null;
      var s = b.escala;
      return tRect(b, { x: b.x - 55 * s, y: b.y - 230 * s, w: 110 * s, h: 225 * s });
    },
    debilPrincipal: function (b) { return debilCentro(CFG_RV.zonas(b), 'gema'); },
    intro: function (b, t, world) {
      b.t = t;
      // baja por el agujero del techo con las alas abiertas
      var T = 1.3;
      b.alas = t < T + 0.5 ? 'abiertas' : 'cerradas';
      if (t < T) { var k = t / T; b.alt = 520 * (1 - k) * (1 - k); }
      else {
        b.alt = 0;
        if (!b.g.tierra) { b.g.tierra = true; shake(world, 0.7); sfx(world, 'bigPunch'); sfx(world, 'roar'); txt(world, b.x, b.sueloY - 350, '¡SOY ROBOVILL!', '#fb7185', 0.9); }
        if (t > 2.25 && !b.g.armas) { b.g.armas = true; sfx(world, 'transform'); b.brazo = 'sierra'; txt(world, b.x, b.sueloY - 350, '¡TENGO MÁS ARMAS DE LAS QUE TE IMAGINAS!', '#fda4af', 1.6); }
        if (t > 2.9) b.brazo = 'canon';
      }
      b.y = b.sueloY - b.alt;
      if (t >= 3.6) { b.brazo = 'martillo'; b.g = {}; return true; }
      return false;
    },
    derrota: function (b, t, world) {
      // ≈ 3,6 s: ruge, la gema copia brilla muchísimo y CRECE hasta salirse por arriba de la
      // pantalla (×2,4), con temblor cada vez más fuerte y el letrero grande en el centro de la
      // pantalla "¡ROBOVILL SE HACE GIGANTE!" (lo dibuja draw); al final, destello blanco.
      b.t += 1 / 60; b.st = 'descanso'; b.sink = 0; b.defT = t;
      b.agK = Math.max(0, b.agK - 0.05); b.altObj = 0;
      b.alt = Math.max(0, b.alt - 8); b.y = b.sueloY - b.alt;
      if (!b.g.fin) { b.g = { fin: true }; sfx(world, 'roar'); shake(world, 0.6); b.alas = 'abiertas'; }
      if (t > 0.3 && !b.g.gema) { b.g.gema = true; sfx(world, 'gemGrab'); }
      if (t > 1.0 && !b.g.crece) { b.g.crece = true; sfx(world, 'transform'); sfx(world, 'roar'); }
      var k = clamp((t - 1.0) / 2.0, 0, 1);
      if (t > 0.6) shake(world, 0.15 + 0.55 * k);
      b.crece = 1 + 1.4 * k * k * (3 - 2 * k);
      b.destello = clamp((t - 2.9) / 0.6, 0, 1);
      return t >= 3.6;
    },
    pista: function (b) {
      if (b.fase === 3 && b.alt > RV_VUELO - 10 && b.st !== 'mareado' && b.faseT > 9 && (b.faseT % 20) < 5) {
        return '¡Está volando! Director: hackea una consola ({hack}) y las cadenas lo bajarán. Falcon: ¡doble salto a la gema!';
      }
      return pistaFase(b, {
        1: 'Peter protege con {ataque}, Mikey dispara a la gema copia, el Director hackea y Falcon ataca: ¡We are a team!',
        2: '¡Va bajo tierra! Cuando salga el «!», apártate… y cuando se maree, ¡a la gema copia!',
        3: '¡Alas de metal! Esquiva la lluvia de mini-robots. Director: ¡las consolas lo atan con cadenas!'
      });
    },
    draw: function (ctx, b, world) {
      var s = b.escala * num(b.crece, 1), f = b.facing, v = rvVar();
      // sombra (sobre todo al volar)
      ctx.save();
      ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(b.x, b.sueloY - 2, 90 * (1 - b.alt / 600), 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // cadenas magnéticas
      if (b.cadenas > 0 && b.cadPts.length) {
        ctx.save();
        var ancla = { x: b.x, y: tY(b, b.y - 150 * b.escala) };
        for (var c = 0; c < b.cadPts.length; c++) {
          var p0 = b.cadPts[c], dx = ancla.x - p0.x, dy = ancla.y - p0.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
          var n = Math.max(4, Math.floor(len / 15)), ang = Math.atan2(dy, dx);
          ctx.globalAlpha = 0.35; ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 12;   // brillo magnético
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(ancla.x, ancla.y); ctx.stroke();
          ctx.globalAlpha = 1;
          for (var i = 0; i <= n; i++) {
            var k = i / n, x = p0.x + dx * k, y = p0.y + dy * k;
            ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
            ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.ellipse(0, 0, 9, (i % 2) ? 2.5 : 5.5, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = (i % 2) ? '#cbd5e1' : '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.restore();
          }
          ctx.fillStyle = '#22d3ee'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(ancla.x + (c ? 8 : -8), ancla.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
      // montoncito de tierra que avanza mientras está bajo tierra
      if (b.sink > 40) {
        var mx = (b.g && isFinite(b.g.mx)) ? b.g.mx : b.x;
        ctx.save();
        ctx.fillStyle = '#78350f'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(mx, b.sueloY, 46, 16 + 3 * Math.sin(b.t * 30), 0, Math.PI, 0); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a16207';
        for (var q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(mx - 30 + q * 20, b.sueloY - 10 - ((b.t * 60 + q * 13) % 18), 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      ctx.save();
      postura(ctx, b);
      if (b.crece > 1) { ctx.translate(b.x, b.y); ctx.scale(b.crece, b.crece); ctx.translate(-b.x, -b.y); }
      if (b.st === 'golpe' && b.ataque === 'martillo') {
        var inc = 0.22 * Math.sin(clamp(b.stT / 0.2, 0, 1) * Math.PI / 2);
        ctx.translate(b.x, b.y); ctx.rotate(-inc * f); ctx.translate(-b.x, -b.y);
      }
      var o = { variant: v, scale: b.escala, facing: f, brazo: b.brazo, alas: b.alas, taladro: b.taladro, look: look() };
      if (b.alt > 2 && b.alas === 'abiertas') { ctx.translate(0, Math.sin(b.t * 3) * 5); }
      if (!art('robovill', ctx, b.x, b.y, o)) {
        ctx.fillStyle = '#475569'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
        rrect(ctx, b.x - 80, b.y - 300, 160, 290, 24); ctx.fill(); ctx.stroke();
        var g0 = rvGema(b);
        ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(g0.x, g0.y, g0.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      polvo(ctx, b);
      if (b.hp > 0 && b.sink < 40) haloDebil(ctx, b, CFG_RV.zonas(b));
      var cabeza = tY(b, b.y - RV_ALTO);
      if (b.sink < 40) estrellasMareo(ctx, b, cabeza);
      // aviso: el brazo nuevo brilla y sale un "!"
      if (b.st === 'aviso' && !b.enIntro && b.ataque !== 'taladro') {
        var br = rvBrazo(b), k2 = clamp(b.stT / AVISO, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.4 * k2 + 0.15 * Math.sin(b.t * 20);
        ctx.fillStyle = b.ataque === 'lluvia' ? '#fca5a5' : '#fde047';
        ctx.beginPath(); ctx.arc(br.x, tY(b, br.y), 30 + 10 * k2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // el "!" va encima del brazo que cambia, siempre por debajo de la caja de pista
        excl(ctx, clamp(br.x, b.ar.x0 + 16, b.ar.x1 - 16), tY(b, br.y) - 58, world);
      }
      if (b.st === 'golpe' && b.ataque === 'martillo' && b.stT >= 0.2) {
        var sw = gfx('drawShockwave');
        if (sw) { ctx.save(); try { sw(ctx, b.x + f * 130, b.sueloY - 4, 120, clamp((b.stT - 0.2) / 0.25, 0, 1)); } catch (e3) { /* nada */ } ctx.restore(); }
      }
      // la gema copia brilla muchísimo al hacerse gigante
      if (b.hp <= 0) {
        var gg = rvGema(b), gy = tY(b, gg.y), crec = num(b.crece, 1);
        var gx = b.x + (gg.x - b.x) * crec, gyy = b.y + (gy - b.y) * crec;
        ctx.save();
        var rad = 34 + 12 * Math.sin(b.t * 10) + 120 * clamp(crec - 1, 0, 1);
        ctx.globalAlpha = 0.55; ctx.fillStyle = '#f472b6';
        ctx.beginPath(); ctx.arc(gx, gyy, rad, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.8; ctx.fillStyle = '#fdf2f8';
        ctx.beginPath(); ctx.arc(gx, gyy, rad * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        rvLetreroGigante(ctx, b, world);
        if (b.destello > 0) {
          ctx.save(); ctx.globalAlpha = b.destello * 0.85; ctx.fillStyle = '#ffffff';
          ctx.fillRect(b.ar.x0 - 300, -400, b.ar.x1 - b.ar.x0 + 600, b.sueloY + 800);
          ctx.restore();
        }
      }
    }
  };
  G.P3B.register('robovillPie', hacerDef(CFG_RV));
})();
