// gigantes3.js — MOTOR DE GIGANTES de la Parte 3 "We Are a Team" (dueño: gigantes).
// Contrato técnico de la Parte 3, §12.1–§12.6, §8.4 y §18.1.
//
// UN motor común para las tres fusiones, con el jefe como PLUGIN (gigantes-jefes3.js):
//   levelP3_2f  fusión TERRESTRE (robot-moto de Mikey + transformable del Director) contra la Gran Excavadora
//   levelP3_3f  fusión VOLADORA  (submarino-nave de Peter + mecha-halcón de Falcon) contra el Dron Nodriza
//   levelP3_5f  fusión FINAL «WE ARE A TEAM» (los 4 vehículos + Dark Secuaz de cuerpo) contra Robovill gigante
//   levelP3test_gigantes  el motor con su JEFE DE PRUEBA propio (no lo lanza ningún menú)
//
// Exporta: G.makeGiantScene3(def), el registro G.P3G (bosses + register) y las cuatro escenas.
// La fase 3 de js/p2/jefe2.js (pelea de gigantes de la Parte 2) es solo REFERENCIA: aquí la
// fusión salta (o vuela), el escudo va con DISPARO y puede quedar delante, encima o detrás del jefe.
//
// Atajos de prueba (§18.1): enter({nuevo, fase: 1|2|3|'victoria', sinIntro: true, piloto}) y, en la
// URL, &fase=…, &sinIntro=1, &piloto=…, &fusion=terrestre|voladora|final (solo la escena de prueba).
// scene.__debug = { state(), raw() }.
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;

  // ---------------------------------------------------------------------------
  //  Registro de jefes gigantes (contrato §1 y §12.6): se crea si no existe y
  //  nunca se reasigna; los jefes se leen en el momento de usarlos.
  // ---------------------------------------------------------------------------
  G.P3G = G.P3G || { bosses: {} };
  if (!G.P3G.bosses) G.P3G.bosses = {};
  G.P3G.register = G.P3G.register || function (nombre, def) { G.P3G.bosses[nombre] = def; };

  // ---------------------------------------------------------------------------
  //  Constantes del mundo de gigantes (§12.1)
  // ---------------------------------------------------------------------------
  var W = 960, H = 540, PI = Math.PI;
  var GROUND_Y = 470, A_L = -170, A_R = 1130, ZOOM = 0.667;
  var SAFE_TOP = -150;                 // línea de seguridad en el mundo (≈ 56 px en pantalla)
  var O = '#1a1a2e';
  var FONT = 'system-ui, "Segoe UI", Arial, sans-serif';

  // Altos del arte a escala 1 (copia del contrato §16.4, por si datos-arte3.js faltara).
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };
  function altoArte(n) {
    var v = (window.P2 && P2.P3ALTO && P2.P3ALTO[n]) || ALTO_POR_DEFECTO[n];
    return (typeof v === 'number' && v > 0) ? v : 100;
  }
  function anclaArte(n) {
    var a = window.P2 && P2.P3ANCLA && P2.P3ANCLA[n];
    if (a) return a;
    return (n === 'fusionVoladora' || n === 'dronNodriza' || n === 'submarinoNave' || n === 'miniRobot') ? 'centro' : 'pies';
  }

  // Las tres fusiones (§12.2). Puntos de los cañones a escala 1 del arte, mirando a la
  // derecha y relativos a su anclaje (sacados de arte-fusiones.js: TERR_PTS × 0,83,
  // VOL_PTS y FIN_PTS). Si el arte cambia, solo se mueve el sitio del que salen los disparos.
  var FUS = {
    terrestre: {
      art: 'fusionTerrestre', alto: 330, ancho: 170, vel: 200, saltos: 1, aire: false,
      titulo: '¡FUSIÓN TERRESTRE!', pareja: 'Mikey y el Director',
      piezas: ['lanzadores', 'pulso'], escudo: 'energia',
      gun: { lanzadores: [131, -116], pulso: [95, -203] },
      artillero: { 1: 'lanzadores', 2: 'pulso' },          // cap. 2: J1 → robot-moto, J2 → transformable
      heroes: ['mikey', 'director']
    },
    voladora: {
      art: 'fusionVoladora', alto: 300, ancho: 170, vel: 240, saltos: 0, aire: true,
      titulo: '¡FUSIÓN VOLADORA!', pareja: 'Peter y Lord Falcon',
      piezas: ['escudo', 'plumas'], escudo: 'peter',
      gun: { escudo: [104, -24], plumas: [75, -88] },
      artillero: { 1: 'escudo', 2: 'plumas' },             // cap. 3: J1 → submarino-nave, J2 → mecha-halcón
      heroes: ['peter', 'falcon']
    },
    final: {
      art: 'fusionFinal', alto: 420, ancho: 220, vel: 190, saltos: 2, aire: false,
      titulo: '¡FUSIÓN FINAL!', pareja: 'Todo el equipo',
      piezas: ['lanzadores', 'pulso', 'escudo', 'plumas'], escudo: 'peter',
      gun: { lanzadores: [160, -212], pulso: [-78, -260], escudo: [154, -84], plumas: [141, -268] },
      artillero: null,
      heroes: ['director', 'falcon', 'mikey', 'peter']
    }
  };
  // Armas de las piezas (§12.2): cadencia de la IA y del artillero (co-op).
  var PIEZA = {
    lanzadores: { heroe: 'mikey', nombre: 'Lanzadores de Mikey', corto: 'LANZADORES', cadIA: 2.0, cadArt: 1.2, color: '#60a5fa', impactos: 2 },
    pulso:      { heroe: 'director', nombre: 'Pulso del Director', corto: 'PULSO', cadIA: 3.0, cadArt: 1.8, color: '#22d3ee', impactos: 1 },
    escudo:     { heroe: 'peter', nombre: 'Escudo de Peter', corto: 'ESCUDO', tiro: 'ESCUDO-BUMERÁN', cadIA: 3.5, cadArt: 2.1, color: '#facc15', impactos: 2 },
    plumas:     { heroe: 'falcon', nombre: 'Plumas de Falcon', corto: 'PLUMAS', cadIA: 2.5, cadArt: 1.5, color: '#4ade80', impactos: 3 }
  };
  var HEROE_PIEZA = { director: 'pulso', falcon: 'plumas', mikey: 'lanzadores', peter: 'escudo' };
  var NOMBRE_CORTO = { director: 'el Director', falcon: 'Falcon', mikey: 'Mikey', peter: 'Peter' };
  var ARMAS_SUELO = { embestida: 1, onda: 1, taladro: 1, martillo: 1, sierra: 1, puno: 1 };

  // Daño por impacto de las armas que disparan SOLAS: se ajusta para que todas las piezas IA
  // juntas hagan ≈ 1 de daño por segundo (§12.2, "objetivo de diseño"). El artillero hace 1 entero.
  // CONTRATO: la tabla fija "daño 1 por impacto"; con las cadencias de la tabla, 4 piezas IA harían
  // ≈ 3 por segundo y el piloto no pintaría nada. Gana el objetivo de diseño (≈ 1/s): cada impacto
  // IA vale 1 × factor (0,75 terrestre, 0,56 voladora, 0,32 final). Lo aviso en el informe.
  function factorIA(fd) {
    var dps = 0;
    for (var i = 0; i < fd.piezas.length; i++) { var p = PIEZA[fd.piezas[i]]; dps += p.impactos / p.cadIA; }
    return dps > 0 ? clamp(1 / dps, 0.25, 1) : 1;
  }

  // ---------------------------------------------------------------------------
  //  Utilidades
  // ---------------------------------------------------------------------------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
  function easeOut(k) { k = clamp(k, 0, 1); return 1 - (1 - k) * (1 - k); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* nada */ } }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) { /* nada */ } }
  function isCoop() { return !!(G.state && G.state.coop); }
  function look() { return (G.p3 && G.p3.look) || {}; }
  function veh() { return (G.p2 && G.p2.vehicle) || {}; }
  function debugInv() { return !!(G.p3 && G.p3.debugInvulnerable); }
  var NULL_INPUT = { held: function () { return false; }, pressed: function () { return false; } };
  function inputOf(j) {
    if (j === 2) return (isCoop() && G.input2) ? G.input2 : NULL_INPUT;
    return G.input || NULL_INPUT;
  }
  function art() {
    try {
      if (window.P2 && typeof P2.call === 'function') return !!P2.call.apply(P2, arguments);
    } catch (e) { /* respaldo */ }
    return false;
  }
  function gfx(name, args) {
    try {
      if (G.gfx && typeof G.gfx[name] === 'function') { G.gfx[name].apply(G.gfx, args); return true; }
    } catch (e) { /* respaldo */ }
    return false;
  }
  // En el móvil (1 jugador) el botón de CAMBIO de las fusiones se llama "¡EQUIPO!" (§4, touchExtra):
  // las pistas y la barra dicen ese nombre, no "CAMBIO" (que en las fusiones no existe).
  function tactilFusion() {
    try { return !isCoop() && typeof G.p3teclas === 'function' && G.p3teclas(1).cambio === 'CAMBIO'; } catch (e) { return false; }
  }
  function conTeclas(txt, j) {
    if (tactilFusion()) txt = String(txt == null ? '' : txt).replace(/\{cambio\}/g, '¡EQUIPO!');
    try { if (typeof G.p3conTeclas === 'function') return G.p3conTeclas(txt, j); } catch (e) { /* nada */ }
    return String(txt || '').replace(/\{[a-z]+\}/g, '');
  }
  var warned = {};
  function warnOnce(tag, e) {
    var k = tag + ':' + (e && e.message);
    if (warned[k]) return;
    warned[k] = true;
    try { console.warn('[gigantes3] ' + tag, e); } catch (e2) { /* nada */ }
  }
  function urlParam(n) {
    try {
      if (typeof location === 'undefined' || !location.search) return null;
      return new URLSearchParams(location.search).get(n);
    } catch (e) { return null; }
  }
  // dibujo
  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function rfill(ctx, x, y, w, h, r, fill, stroke, lw) {
    rrect(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function outlined(ctx, text, x, y, size, fill, stroke, lw) {
    ctx.font = 'bold ' + Math.round(size) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke || O; ctx.lineWidth = lw || Math.max(3, size * 0.16);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill || '#ffffff';
    ctx.fillText(text, x, y);
  }
  function star(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = O; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // geometría
  function circRect(cx, cy, r, R) {
    var nx = clamp(cx, R.x, R.x + R.w), ny = clamp(cy, R.y, R.y + R.h);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }
  function segCirc(x1, y1, x2, y2, cx, cy, r) {
    var dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
    var k = L2 > 0 ? clamp(((cx - x1) * dx + (cy - y1) * dy) / L2, 0, 1) : 0;
    var px = x1 + dx * k - cx, py = y1 + dy * k - cy;
    return px * px + py * py <= r * r;
  }

  // Memoria de reintento por escena (sobrevive a exit(), como retryPhase de jefe2.js).
  var RETRY = {};
  var URL_USADA = {};

  // ===========================================================================
  //  JEFE DE PRUEBA (§12.6): "un bloque con 20 de vida que da puñetazos con aviso de 1,0 s".
  //  Usa la misma interfaz que los plugins, así que sirve para probar todo el motor:
  //  puñetazo (físico, con empuje), onda, rayo, rocas y lluvia de mini-robots.
  // ===========================================================================
  var PRUEBA_FASES = { 1: ['puno', 'onda'], 2: ['rayo', 'rocas'], 3: ['lluvia', 'puno'] };
  var JEFE_PRUEBA = {
    nombre: 'ROBOT DE PRUEBA',
    hp: 20,
    create: function (arena, opts) {
      var aire = arena.modo === 'aire';
      var b = { x: 820, y: aire ? 360 : GROUND_Y, alto: 260, hp: 20, maxHp: 20, facing: -1, fase: 1,
        homeX: 820, baseY: aire ? 360 : GROUND_Y, aire: aire, estado: 'descanso', ataque: null, st: 0,
        descanso: 1.2, ronda: [], hechos: {}, mareo: 0, lunge: 0, golpeado: false, glow: 0, lean: 0,
        necesitaEquipo: !!(arena.chapter === 5 || arena.fusionKey === 'final'), pedido: false, introY: 0, rocks: 0,
        hechosF: { 1: {}, 2: {}, 3: {} }, rondaOk: {} };
      var f = opts && opts.fase;
      if (f === 2) { b.hp = 13; b.fase = 2; }
      else if (f === 3) { b.hp = 6; b.fase = 3; }
      else if (f === 'victoria') { b.hp = 0; b.fase = 3; }
      return b;
    },
    intro: function (b, t, arena) {
      b.introY = -700 * Math.pow(1 - clamp(t / 1.1, 0, 1), 2);
      if (t >= 1.1 && !b._aterrizo) { b._aterrizo = true; arena.shake(0.5); arena.sfx('robot'); arena.parts(b.x, GROUND_Y - 10, '#d6d3d1', 16, 220, 'dot'); }
      if (t > 1.15 && t < 1.25) arena.msg('¡Un robot de prueba!', 1.4);
      return t >= 2.0;
    },
    update: function (b, dt, arena) {
      var f = arena.fusion();
      b.st += dt;
      if (b.glow > 0) b.glow -= dt;
      if (!b.aire) b.facing = f.x < b.x ? -1 : 1;
      else { b.facing = f.x < b.x ? -1 : 1; b.y = b.baseY + Math.sin(arena.t * 1.4) * 40; }
      var nf = b.hp > 13 ? 1 : (b.hp > 6 ? 2 : 3);
      if (nf !== b.fase) { b.fase = nf; b.ronda = []; arena.msg('¡Fase ' + nf + '!', 1.2); arena.sfx('roar'); b.estado = 'descanso'; b.st = 0; b.descanso = 1.0; }
      if (b.necesitaEquipo && !b.pedido && b.hp <= 5) { b.pedido = true; arena.pedirEquipo(); arena.pista('¡AHORA! ¡Pulsa {cambio} para el ATAQUE EN EQUIPO!', 4); }
      if (b.estado === 'mareado') {
        if (b.st >= 1.0) { b.estado = 'descanso'; b.st = 0; b.descanso = 0.8; }
        return;
      }
      if (b.estado === 'descanso') {
        // vuelve despacio a su sitio
        b.x += clamp(b.homeX - b.x, -120 * dt, 120 * dt);
        if (b.st >= b.descanso) {
          if (!b.ronda.length) b.ronda = PRUEBA_FASES[b.fase].slice();
          b.ataque = b.ronda.shift();
          b.estado = 'aviso'; b.st = 0; b.glow = 1.0; b.golpeado = false;
          var wx = b.ataque === 'puno' ? f.x : (b.ataque === 'onda' ? b.x + b.facing * 140 : f.x);
          if (b.ataque === 'rocas') { b.rocks = []; for (var i = 0; i < 3; i++) { var rx = clamp(f.x + (i - 1) * 170, A_L + 60, A_R - 60); b.rocks.push(rx); arena.warn(rx, { r: 60, life: 1.0, y: arena.modo === 'aire' ? f.y : GROUND_Y }); } }
          else if (b.ataque !== 'lluvia') arena.warn(wx, { r: 60, life: 1.0, y: arena.modo === 'aire' ? f.y : GROUND_Y });
          if (b.ataque === 'lluvia') {
            for (var k = 0; k < 4; k++) arena.spawnMinion({ x: clamp(f.x + (k - 1.5) * 150, A_L + 60, A_R - 60), y: -200, kind: 'miniRobot', hp: 1, persigue: 110, cayendo: true });
          }
          arena.sfx('robot');
        }
        return;
      }
      if (b.estado === 'aviso') {
        if (b.st >= 1.0) {
          b.estado = 'golpe'; b.st = 0; b.hechos[b.ataque] = true; golpePrueba(b, arena);
          // regla de ritmo (§13): la fase no se acaba hasta haber enseñado todos sus ataques
          var hf = b.hechosF[b.fase] || (b.hechosF[b.fase] = {}), lista = PRUEBA_FASES[b.fase] || [], todos = true;
          hf[b.ataque] = true;
          for (var q = 0; q < lista.length; q++) if (!hf[lista[q]]) todos = false;
          if (todos) b.rondaOk[b.fase] = true;
        }
        return;
      }
      if (b.estado === 'golpe') {
        if (b.ataque === 'puno') {
          var dir = b.facing;
          if (b.st < 0.45) { b.x += dir * 520 * dt; b.lean = 0.12 * dir; }
          else b.lean = 0;
          b.x = clamp(b.x, A_L + 120, A_R - 120);
          if (!b.golpeado) {
            var fr = arena.fusionRect();
            var reach = { x: b.x + (dir > 0 ? 0 : -150), y: b.y - b.alto, w: 150, h: b.alto };
            if (fr.x < reach.x + reach.w && fr.x + fr.w > reach.x && fr.y < reach.y + reach.h && fr.y + fr.h > reach.y) {
              b.golpeado = true;
              var res = arena.hurtFusion(2, b.x, { fisico: true, empuje: 120 });
              if (res === 'bloqueado') { b.estado = 'mareado'; b.st = 0; arena.text(b.x, b.y - b.alto - 20, '¡CLANC!', '#fde68a', 40); arena.sfx('clink'); return; }
            }
          }
        }
        if (b.st >= 0.7) { b.estado = 'descanso'; b.st = 0; b.descanso = 1.3; b.lean = 0; }
      }
    },
    draw: function (ctx, b, arena) {
      var t = arena.t, y = b.y + (b.introY || 0);
      var bob = b.estado === 'mareado' ? 8 : 0;
      ctx.save();
      ctx.translate(b.x, y + bob);
      ctx.rotate(b.lean || 0);
      ctx.scale(b.facing, 1);
      var w = 180, h = b.alto;
      if (b.aire) {
        // hélices
        for (var i = -1; i <= 1; i += 2) {
          ctx.save(); ctx.translate(i * 70, -h - 12);
          ctx.scale(Math.cos(t * 30 + i), 1);
          rfill(ctx, -46, -5, 92, 10, 5, '#94a3b8', O, 2.5);
          ctx.restore();
          rfill(ctx, i * 70 - 5, -h - 14, 10, 18, 3, '#475569', O, 2);
        }
      } else {
        rfill(ctx, -70, -46, 52, 46, 10, '#475569', O, 4);
        rfill(ctx, 18, -46, 52, 46, 10, '#475569', O, 4);
      }
      rfill(ctx, -w / 2, -h, w, h - 40, 26, '#9f1239', O, 5);
      rfill(ctx, -w / 2 + 14, -h + 14, w - 28, 26, 10, '#be123c', null);
      // ojo-visor
      rfill(ctx, -40, -h + 30, 96, 30, 14, '#1f2937', O, 3);
      circle(ctx, 22, -h + 45, 10, b.estado === 'aviso' ? '#fde047' : '#f87171', O, 2);
      if (b.estado === 'mareado') {
        for (var s = 0; s < 3; s++) star(ctx, Math.cos(t * 5 + s * 2.1) * 50, -h - 24 + Math.sin(t * 5 + s * 2.1) * 10, 9, '#fde047');
      }
      // núcleo (punto débil)
      var gl = 0.6 + 0.4 * Math.sin(t * 6);
      ctx.save(); ctx.globalAlpha = 0.35 * gl; circle(ctx, 0, -h * 0.5, 44, '#fde047', null); ctx.restore();
      circle(ctx, 0, -h * 0.5, 26, '#facc15', O, 4);
      circle(ctx, -6, -h * 0.5 - 7, 8, '#fef9c3', null);
      // puño
      var fx = 104 + (b.estado === 'golpe' && b.ataque === 'puno' ? 40 : 0);
      rfill(ctx, 70, -h * 0.62, 34, 22, 8, '#64748b', O, 3);
      rfill(ctx, fx - 10, -h * 0.68, 54, 50, 14, b.estado === 'aviso' && b.ataque === 'puno' ? '#fbbf24' : '#e11d48', O, 4);
      ctx.restore();
      if (b.estado === 'aviso') {
        gfx('drawExclamation', [ctx, b.x, y - b.alto - 40]) || outlined(ctx, '!', b.x, y - b.alto - 40, 60, '#fde047');
      }
    },
    zones: function (b) {
      var y = b.y + (b.introY || 0) + (b.estado === 'mareado' ? 8 : 0);
      return [
        { x: b.x, y: y - b.alto * 0.5, r: 34, tipo: 'debil', id: 'nucleo' },
        { x: b.x, y: y - b.alto * 0.55, r: 110, tipo: 'cuerpo', id: 'cuerpo' }
      ];
    },
    onHit: function (b, dmg, kind, zona, fromX, arena) {
      var d = dmg * (zona && zona.tipo === 'debil' ? 2 : 1);
      if (kind === 'pulso' && b.estado === 'descanso') b.st = Math.max(0, b.st - 0.3);
      return d;
    },
    minHp: function (b) {
      var piso = b.necesitaEquipo ? 1 : 0;
      if (b.fase === 1 && !b.rondaOk[1]) piso = Math.max(piso, 13.5);
      if (b.fase === 2 && !b.rondaOk[2]) piso = Math.max(piso, 6.5);
      return piso;
    },
    defeat: function (b, t, arena) {
      b.lean = Math.sin(t * 30) * 0.05;
      if (!b._pops) b._pops = 0;
      if (t > b._pops * 0.25 && b._pops < 8) {
        b._pops++;
        var px = b.x + rnd(-80, 80), py = b.y - rnd(40, b.alto - 20);
        arena.parts(px, py, '#fb923c', 12, 220, 'dot');
        arena.parts(px, py, '#cbd5e1', 6, 200, 'tuerca');
        arena.sfx('explosion'); arena.shake(0.25);
        if (b._pops === 1) arena.text(b.x, b.y - b.alto - 30, '¡POP!', '#fde047', 54);
      }
      if (t > 2.0) b.introY = 2000;   // desaparece
      return t >= 2.3;
    },
    hint: function (b, arena) {
      if (b.estado === 'aviso' && b.ataque === 'puno') return '¡Puñetazo! Mantén {disparo} para el escudo o apártate.';
      if (b.estado === 'aviso' && b.ataque === 'onda') return '¡Una onda por el suelo! ¡Salta con {salto}!';
      if (b.estado === 'mareado') return '¡Está mareado! ¡Dale en el núcleo amarillo!';
      return '¡Golpea su núcleo amarillo con {ataque}!';
    },
    debug: function (b) {
      var est = b.estado === 'aviso' ? 'aviso:' + b.ataque : (b.estado === 'golpe' ? 'golpe:' + b.ataque : b.estado);
      var z = this.zones(b)[0];
      return { fase: b.fase, estado: est, aviso: b.estado === 'aviso', ataque: b.estado === 'aviso' || b.estado === 'golpe' ? b.ataque : null, debil: { x: z.x, y: z.y } };
    }
  };
  function golpePrueba(b, arena) {
    var f = arena.fusion();
    if (b.ataque === 'onda') {
      arena.spawnWave({ x: b.x + b.facing * 80, dir: b.facing, vel: 360, dmg: 1, alto: 40 });
      arena.shake(0.35); arena.sfx('bigPunch');
    } else if (b.ataque === 'rayo') {
      arena.spawnBeam({ y: f.cy, x1: b.x + b.facing * 60, x2: b.facing < 0 ? A_L : A_R, dmg: 1, life: 0.6, ancho: 26 });
      arena.sfx('laser');
    } else if (b.ataque === 'rocas') {
      var rs = b.rocks || [];
      for (var i = 0; i < rs.length; i++) arena.spawnShot({ x: rs[i], y: -320 - i * 40, vx: 0, vy: 520, r: 26, dmg: 1, life: 4, kind: 'roca', gravity: 600 });
      arena.sfx('rumble'); arena.shake(0.3);
    } else if (b.ataque === 'lluvia') {
      arena.sfx('miniRobot');
    } else if (b.ataque === 'puno') {
      arena.sfx('bigPunch');
    }
  }

  // ===========================================================================
  //  G.makeGiantScene3(def)
  //  def = {chapter, fusion: 'terrestre'|'voladora'|'final', jefe, modo: 'suelo'|'aire',
  //         lugar: 'caverna'|'cielo'|'fabrica', music, escena (nombre), prueba (bool)}
  // ===========================================================================
  G.makeGiantScene3 = function (def) {
    def = def || {};
    var NAME = def.escena || ('levelP3_' + (def.chapter || 0) + 'f');
    var scene = {};
    var S = null;          // estado de la partida en curso

    // -------------------------------------------------------------------------
    //  arena: lo que reciben los jefes plugin (§12.6)
    // -------------------------------------------------------------------------
    var arena = {
      t: 0, GROUND_Y: GROUND_Y, L: A_L, R: A_R, zoom: ZOOM, modo: def.modo || 'suelo',
      chapter: def.chapter || 0, fusionKey: def.fusion || 'terrestre',
      fusion: function () {
        if (!S) return { x: 200, y: GROUND_Y, cy: GROUND_Y - 165, w: 170, h: 330, facing: 1, escudo: false, enSuelo: true };
        var f = S.f;
        return { x: f.x, y: f.y, cy: f.y - S.fd.alto / 2, w: S.fd.ancho, h: S.fd.alto, facing: f.facing,
          escudo: !!f.shield, enSuelo: !!f.enSuelo };
      },
      fusionRect: function () { return fusionRect(); },
      hurtFusion: function (dmg, fromX, opts) { return hurtFusion(dmg, fromX, opts); },
      spawnShot: function (s) {
        if (!S || !s) return;
        S.shots.push({ x: num(s.x, 480), y: num(s.y, 0), vx: num(s.vx, 0), vy: num(s.vy, 0), r: num(s.r, 14),
          dmg: num(s.dmg, 1), life: num(s.life, 4), kind: s.kind || 'bola', gravity: num(s.gravity, 0),
          vuelve: !!s.vuelve, ret: false, t: 0, ox: num(s.x, 480), rot: 0 });
      },
      spawnWave: function (w) {
        if (!S || !w) return;
        S.waves.push({ x: num(w.x, 480), dir: w.dir < 0 ? -1 : 1, vel: num(w.vel, 360), dmg: num(w.dmg, 1),
          alto: num(w.alto, 40), hit: false, t: 0 });
      },
      spawnBeam: function (b) {
        if (!S || !b) return;
        S.beams.push({ y: num(b.y, 300), x1: num(b.x1, 900), x2: num(b.x2, A_L), dmg: num(b.dmg, 1),
          life: num(b.life, 0.6), ancho: num(b.ancho, 26), t: 0, hit: false, cut: null });
      },
      spawnMinion: function (m) {
        if (!S || !m) return;
        if (S.minions.length >= 16) return;
        var falling = !!m.cayendo;
        S.minions.push({ x: num(m.x, 480), y: num(m.y, 0), vx: 0, vy: 0, kind: m.kind === 'miniDron' ? 'miniDron' : 'miniRobot',
          hp: num(m.hp, 1), persigue: num(m.persigue, 120), fase: falling ? 'aviso' : 'vuela', t: 0, stun: 0,
          facing: -1, dead: false, landY: 0, warnY: S.fd.aire ? S.f.y : GROUND_Y, life: 14 });
        if (falling) {
          var mm = S.minions[S.minions.length - 1];
          mm.landY = S.fd.aire ? clamp(S.f.y - S.fd.alto * 0.5, 60, GROUND_Y - 60) : GROUND_Y - 70;
          arena.warn(mm.x, { r: 50, life: 1.0, y: mm.warnY });
        }
      },
      minions: function () { return S ? S.minions.filter(function (m) { return !m.dead; }) : []; },
      warn: function (x, opts) {
        if (!S) return;
        opts = opts || {};
        S.warns.push({ x: num(x, 480), y: num(opts.y, GROUND_Y), r: num(opts.r, 60), life: num(opts.life, 1.2), t: 0 });
      },
      shake: function (v) { if (S) S.shake = Math.max(S.shake, clamp(num(v, 0.2), 0, 1)); },
      flash: function (v) { if (S) S.flash = Math.max(S.flash, clamp(num(v, 0.5), 0, 1)); },
      sfx: function (n) { sfx(n); },
      text: function (x, y, txt, color, size) {
        if (!S) return;
        notePlugText(txt);
        S.texts.push({ x: num(x, 480), y: num(y, 300), text: String(txt), color: color || '#fde68a', size: num(size, 34), t: 0, life: 1.3 });
      },
      parts: function (x, y, color, n, vel, kind) { addParts(num(x, 480), num(y, 300), color || '#fde68a', num(n, 8), num(vel, 160), kind || 'dot'); },
      msg: function (texto, seg) { if (S) { notePlugText(texto); S.msg = { text: String(texto), t: 0, life: num(seg, 2) }; } },
      pista: function (texto, seg) { if (S) { notePlugText(texto); S.pista = { text: String(texto), life: num(seg, 3) }; } },
      pedirEquipo: function () {
        if (!S) return;
        S.barra = 1;
        S.pedido = true;
        avisarBarra();
      },
      // extras (no los exige el contrato; útiles para los plugins)
      boss: function () { return S ? S.b : null; },
      camDY: function () { return S ? S.camDY : 0; }
    };
    function notePlugText(t) { if (S) S.plugTexts += ' ' + String(t); }

    // -------------------------------------------------------------------------
    //  Entrar / salir
    // -------------------------------------------------------------------------
    scene.enter = function (params) {
      params = params || {};
      var retryMode = false;
      if (params.nuevo) delete RETRY[NAME];
      var fase = params.fase;
      // parámetros de la URL (solo la primera vez y solo si la URL pide esta escena)
      var urlOk = !URL_USADA[NAME] && urlParam('escena') === NAME;
      if (urlOk) URL_USADA[NAME] = true;
      if ((fase === undefined || fase === null) && urlOk) {
        var uf = urlParam('fase');
        if (uf === 'victoria') fase = 'victoria';
        else if (uf === '1' || uf === '2' || uf === '3') fase = parseInt(uf, 10);
      }
      if ((fase === undefined || fase === null) && !params.nuevo && RETRY[NAME]) {
        fase = RETRY[NAME].fase; retryMode = true;
      }
      delete RETRY[NAME];
      if (fase !== 1 && fase !== 2 && fase !== 3 && fase !== 'victoria') fase = null;
      var sinIntro = !!params.sinIntro || (urlOk && urlParam('sinIntro') === '1');
      var fk = def.fusion || 'terrestre';
      if (def.prueba) {
        var pf = params.fusion || (urlOk ? urlParam('fusion') : null);
        if (FUS[pf]) fk = pf;
      }
      var fd = FUS[fk] || FUS.terrestre;
      var modo = fd.aire ? 'aire' : 'suelo';
      arena.modo = modo;
      arena.fusionKey = fk;
      arena.chapter = def.chapter || 0;
      var capFus = def.chapter || (fk === 'terrestre' ? 2 : (fk === 'voladora' ? 3 : 5));
      var coop = isCoop();
      var pilotJ = 1;
      if (coop) { try { pilotJ = (typeof G.p3pilotoFusion === 'function') ? G.p3pilotoFusion(capFus) : 1; } catch (e) { pilotJ = 1; } }
      if (pilotJ !== 2) pilotJ = 1;
      // piloto de la fusión final (§8.4)
      var p3 = G.p3 || {};
      var piloto = params.piloto || (urlOk ? urlParam('piloto') : null);
      if (!HEROE_PIEZA[piloto]) {
        var run = p3.run || {};
        piloto = run['lastHero' + pilotJ];
        if (!HEROE_PIEZA[piloto]) piloto = pilotJ === 2 ? p3.hero2 : p3.hero;
        if (!HEROE_PIEZA[piloto]) piloto = pilotJ === 2 ? 'falcon' : 'director';
      }
      if (fk !== 'final') piloto = fd.heroes[pilotJ === 2 ? 1 : 0];   // en las parejas, el héroe de su vehículo
      var pilotPieza = fk === 'final' ? HEROE_PIEZA[piloto] : fd.artillero[pilotJ];

      S = {
        t: 0, fk: fk, fd: fd, modoAire: modo === 'aire', coop: coop, pilotJ: pilotJ, artJ: pilotJ === 1 ? 2 : 1,
        piloto: piloto, pilotPieza: pilotPieza, kIA: factorIA(fd),
        modo: 'intro', introKind: 'full', introT: 0, bossIntroT: 0, bossIntroOn: false, skipHold: 0,
        fightT: 0, b: null, bdef: null, bName: '', prueba: false,
        shots: [], waves: [], beams: [], minions: [], warns: [], ally: [], allyBeams: [], parts: [], texts: [],
        stuns: [], msg: null, pista: null, flash: 0, shake: 0, camDY: 0,
        barra: 0, barraAvisada: false, pedido: false, eq: null, vic: null, der: null, leaving: false,
        pilotHitT: 0, iaFrenoAvisado: false, skipArmed: false, hintSeen: {},
        plugTexts: '', primera: !retryMode, piezas: [], art: null, retry: retryMode
      };
      // corazones llenos y compartidos (§12.5)
      try {
        G.state.hp = G.state.maxHp || 10;
        if (coop) { G.state.maxHp2 = G.state.maxHp2 || 10; G.state.hp2 = G.state.hp; }
      } catch (e) { /* nada */ }
      // fusión
      S.f = makeFusion(fk === 'final' ? 230 : 240);
      // piezas que disparan solas (todas; la del artillero se salta mientras él la maneje)
      for (var i = 0; i < fd.piezas.length; i++) S.piezas.push({ arma: fd.piezas[i], cd: 1.2 + i * 0.6, flash: 0 });
      // artillero (co-op)
      if (coop) {
        var artArma;
        if (fk === 'final') {
          var lista = artList();
          var artHero = (p3.run && p3.run['lastHero' + S.artJ]) || (S.artJ === 2 ? p3.hero2 : p3.hero);
          artArma = HEROE_PIEZA[artHero];
          if (lista.indexOf(artArma) < 0) artArma = lista[0];
        } else {
          artArma = fd.artillero[S.artJ];
        }
        S.art = { arma: artArma, cd: 0.5, flash: 0, label: 0 };
      }
      // jefe (plugin o jefe de prueba)
      var bd = (!def.prueba && G.P3G && G.P3G.bosses) ? G.P3G.bosses[def.jefe] : null;
      if (!bd || typeof bd.create !== 'function') { bd = JEFE_PRUEBA; S.prueba = true; }
      S.bdef = bd;
      S.bName = bd.nombre || 'JEFE GIGANTE';
      var opts = {};
      if (fase !== null) opts.fase = fase;
      try { S.b = bd.create(arena, opts); } catch (e) { warnOnce('create', e); S.b = null; }
      if (!S.b || typeof S.b !== 'object') {
        // si el plugin falla al crear, usamos el jefe de prueba para que la escena funcione
        S.bdef = bd = JEFE_PRUEBA; S.prueba = true; S.bName = bd.nombre;
        S.b = bd.create(arena, opts);
      }
      normBoss(S.b);
      S.fase0 = fase;
      // intro
      if (fase === 'victoria') {
        S.introKind = 'none';
        S.f.pop = 1;
        startVictory();
      } else {
        if (sinIntro || (fase !== null && !retryMode)) S.introKind = 'none';
        else if (retryMode || !params.nuevo) S.introKind = 'short';
        else S.introKind = 'full';
        // la intro del jefe solo en una partida nueva, sin fase ni sinIntro
        S.bossIntroOn = S.introKind === 'full' && typeof bd.intro === 'function';
        if (S.introKind === 'none') {
          S.f.pop = 1;
          beginFight();
        } else {
          S.modo = 'intro';
          S.f.pop = 0;
        }
      }
      music(def.music || 'giants3');
    };
    scene.exit = function () {
      if (S) { S.shots = []; S.waves = []; S.beams = []; S.minions = []; S.ally = []; S.parts = []; S.texts = []; }
    };

    function makeFusion(x) {
      return { x: x, y: GROUND_Y, vx: 0, vy: 0, facing: 1, enSuelo: true, jumps: 0, airT: 0,
        punchT: 0, punchDur: 0.28, step: 0, comboT: 0, buf: false, hitDone: false,
        shield: false, shieldE: 1, shieldLock: false, shieldHit: 0, inv: 0, hurtT: 0,
        pushV: 0, pushT: 0, pop: 1, walk: 0, land: 0, lean: 0, fallT: 0, hidden: false, celebra: 0 };
    }
    function normBoss(b) {
      if (!b) return;
      b.x = num(b.x, 820); b.y = num(b.y, GROUND_Y);
      if (!(b.alto > 0)) b.alto = def.jefe === 'robovill' ? 480 : (def.jefe === 'nodriza' ? 300 : 360);
      if (typeof b.maxHp !== 'number' || !(b.maxHp > 0)) b.maxHp = num(S.bdef.hp, num(b.hp, 20)) || 20;
      if (typeof b.hp !== 'number' || b.hp !== b.hp) b.hp = b.maxHp;
      if (b.facing !== 1 && b.facing !== -1) b.facing = -1;
    }
    function artList() {
      var l = [];
      for (var i = 0; i < S.fd.piezas.length; i++) if (S.fd.piezas[i] !== S.pilotPieza) l.push(S.fd.piezas[i]);
      return l;
    }
    function beginFight() {
      S.modo = 'pelea';
      S.fightT = 0; S.pilotHitT = 0;
      S.f.pop = 1;
    }

    // -------------------------------------------------------------------------
    //  Geometría de la fusión
    // -------------------------------------------------------------------------
    function fScale() { return S.fd.alto / altoArte(S.fd.art); }
    function fusionRect() {
      if (!S) return { x: 115, y: GROUND_Y - 330, w: 170, h: 330 };
      var f = S.f, fd = S.fd;
      return { x: f.x - fd.ancho / 2, y: f.y - fd.alto, w: fd.ancho, h: fd.alto };
    }
    // punto de anclaje del dibujo del arte (pies, o el centro desplazado para que la caja visible
    // quede centrada en el centro lógico de la fusión voladora)
    function artAnchorY() {
      var f = S.f, fd = S.fd;
      if (anclaArte(fd.art) !== 'centro') return f.y;
      var cy = f.y - fd.alto / 2, off = 0;
      var caja = window.P2 && P2.P3CAJA && P2.P3CAJA[fd.art];
      if (caja && caja.length === 4) off = -(caja[1] + caja[3]) / 2 * fScale();
      return cy + num(off, 0);
    }
    function gunPos(arma) {
      var f = S.f, s = fScale(), p = S.fd.gun[arma] || [0, -S.fd.alto * 0.6 / s];
      return { x: f.x + p[0] * s * f.facing, y: artAnchorY() + p[1] * s };
    }
    function chestPos() { var f = S.f; return { x: f.x + f.facing * S.fd.ancho * 0.25, y: f.y - S.fd.alto * 0.55 }; }
    function shieldX() { return S.f.x + S.f.facing * (S.fd.ancho / 2 + 24); }

    // -------------------------------------------------------------------------
    //  Daño a la fusión (§12.6)
    // -------------------------------------------------------------------------
    function hurtFusion(dmg, fromX, opts) {
      if (!S || S.leaving) return 'nada';
      opts = opts || {};
      var f = S.f;
      if (S.modo !== 'pelea') return 'nada';       // intro, ataque en equipo (invulnerable), victoria, derrota
      if (f.shield && !opts.desdeAbajo) {
        sfx('shieldBlock');
        f.shieldHit = 0.25;
        var sx = shieldX();
        addParts(sx, f.y - S.fd.alto * 0.5, '#a5f3fc', 8, 160, 'clink');
        return 'bloqueado';
      }
      if (f.inv > 0) return 'nada';
      if (debugInv()) return 'nada';
      dmg = Math.max(0, num(dmg, 1));
      try {
        G.state.hp = Math.max(0, (G.state.hp || 0) - dmg);
        if (S.coop) G.state.hp2 = G.state.hp;
      } catch (e) { /* nada */ }
      f.inv = 1.2; f.hurtT = 0.3;
      var dir = (typeof fromX === 'number' && isFinite(fromX)) ? sgn(f.x - fromX) : -f.facing;
      var emp = num(opts.empuje, opts.fisico ? 60 : 24);
      f.pushV = dir * emp / 0.35; f.pushT = 0.35;
      S.shake = Math.max(S.shake, opts.fisico ? 0.45 : 0.25);
      addParts(f.x, f.y - S.fd.alto * 0.55, '#fde68a', 8, 180, 'star');
      sfx('hurt');
      if ((G.state.hp || 0) <= 0) startDerrota();
      return 'hecho';
    }

    // -------------------------------------------------------------------------
    //  Daño al jefe (una sola zona por impacto; §12.6)
    // -------------------------------------------------------------------------
    function zones() {
      var b = S.b, z = null;
      try { z = S.bdef.zones ? S.bdef.zones(b) : null; } catch (e) { warnOnce('zones', e); z = null; }
      if (!z || !z.length) z = [{ x: b.x, y: b.y - b.alto * 0.5, r: b.alto * 0.3, tipo: 'cuerpo', id: 'cuerpo' }];
      var out = [];
      for (var i = 0; i < z.length; i++) {
        var q = z[i];
        if (!q) continue;
        var x = num(q.x, NaN), y = num(q.y, NaN);
        if (x !== x || y !== y) continue;
        out.push({ x: x, y: y, r: Math.max(4, num(q.r, 30)), tipo: q.tipo || 'cuerpo', id: q.id !== undefined ? q.id : ('z' + i), raw: q });
      }
      return out;
    }
    function zoneById(id) {
      var z = zones();
      for (var i = 0; i < z.length; i++) if (z[i].id === id) return z[i];
      return null;
    }
    function bossActive() { return S && S.b && (S.modo === 'pelea' || S.modo === 'equipo') && !S.leaving; }
    // Las piezas IA solas no rematan al jefe (cap. 3: la voladora ganaba sin tocar el mando):
    // si el piloto (o el artillero del co-op) no ha golpeado en IA_SOLA s, su daño no baja la vida
    // del IA_PISO de la vida máxima. Hace falta el puño, el arma del artillero o el ATAQUE EN EQUIPO.
    var IA_SOLA = 8, IA_PISO = 0.25;
    function hitBoss(z, dmg, kind, fromX, porIA) {
      if (!bossActive() || !z) return 0;
      var b = S.b, ap = 0;
      if (!porIA) S.pilotHitT = S.fightT;
      try { ap = num(S.bdef.onHit ? S.bdef.onHit(b, dmg, kind, z.raw || z, fromX, arena) : dmg, 0); }
      catch (e) { warnOnce('onHit', e); ap = 0; }
      if (!(ap > 0)) {
        sfx('clink');
        addParts(z.x, z.y, '#e5e7eb', 6, 140, 'clink');
        return 0;
      }
      if (kind !== 'equipo' && typeof S.bdef.minHp === 'function') {
        var mh = 0;
        try { mh = num(S.bdef.minHp(b), 0); } catch (e) { mh = 0; }
        ap = Math.min(ap, Math.max(0, b.hp - mh));
      }
      if (porIA && kind !== 'equipo' && S.fightT - num(S.pilotHitT, 0) > IA_SOLA) {
        var pisoIA = num(b.maxHp, 0) * IA_PISO;
        if (b.hp - ap < pisoIA) {
          ap = Math.max(0, b.hp - pisoIA);
          if (!S.iaFrenoAvisado && !S.pista) {
            S.iaFrenoAvisado = true;
            S.pista = { text: '¡Las piezas solas no pueden! ¡Dale tú con {ataque}!', life: 4 };
          }
        }
      }
      b.hp = Math.max(0, b.hp - ap);
      // §12.4: la barra sube con el daño que DE VERDAD se hace (un golpe que el ritmo recorta a 0 no la carga)
      addBarra(ap);
      sfx('hit');
      addParts(z.x, z.y, z.tipo === 'debil' ? '#fde047' : '#ffd166', z.tipo === 'debil' ? 10 : 6, 180, z.tipo === 'debil' ? 'star' : 'dot');
      if (z.tipo === 'debil' && Math.random() < 0.35) S.texts.push({ x: z.x, y: z.y - 40, text: '¡×2!', color: '#fde047', size: 30, t: 0, life: 0.8 });
      return ap;
    }
    function addBarra(v) {
      if (!S || S.modo === 'equipo') return;
      var before = S.barra;
      S.barra = Math.min(1, S.barra + 0.035 * Math.max(0, num(v, 0)));
      if (before < 1 && S.barra >= 1) avisarBarra();
    }
    function avisarBarra() {
      if (S.barraAvisada) return;
      S.barraAvisada = true;
      sfx('select');
      var pre = S.coop ? ('J' + S.pilotJ + ': ') : '';
      S.barraPista = { text: pre + conTeclas('¡Barra de equipo llena! Pulsa {cambio} para el ATAQUE EN EQUIPO', S.pilotJ), life: 4 };
    }

    // -------------------------------------------------------------------------
    //  Actualizar
    // -------------------------------------------------------------------------
    scene.update = function (dt) {
      if (!S || S.leaving) return;
      try { step(dt); } catch (e) { warnOnce('update', e); }
    };
    function step(dt) {
      S.t += dt; arena.t = S.t;
      if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.2);
      if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 1.6);
      if (S.msg) { S.msg.t += dt; if (S.msg.t >= S.msg.life) S.msg = null; }
      if (S.pista) { S.pista.life -= dt; if (S.pista.life <= 0) S.pista = null; }
      if (S.barraPista) { S.barraPista.life -= dt; if (S.barraPista.life <= 0) S.barraPista = null; }
      if (S.coop) { try { G.state.hp2 = G.state.hp; } catch (e) { /* nada */ } }

      if (S.modo === 'intro') updateIntro(dt);
      else if (S.modo === 'pelea') updateFight(dt);
      else if (S.modo === 'equipo') updateEquipo(dt);
      else if (S.modo === 'victoria') updateVictory(dt);
      else if (S.modo === 'derrota') updateDerrota(dt);
      if (S.leaving) return;

      updateParts(dt);
      updateCamera(dt);
    }

    // ---------- intro ----------
    var FINAL_SALTA_A = 6.4, MOTTO_T = 7.1;
    function introLen() {
      if (S.introKind === 'short') return 2.0;
      return S.fk === 'final' ? 9.2 : 5.0;
    }
    function updateIntro(dt) {
      var f = S.f;
      // mantener confirm 1 s salta la intro de la fusión (§12.5). En el móvil no hay confirm en los
      // niveles: vale también SALTO del J1. Solo cuenta si la tecla se SOLTÓ después de empezar la intro
      // (si venía pulsada de saltar a la gema, no se salta sola) y solo el J1 o el confirm de los dos.
      var hold = inputOf(1).held('confirm') || inputOf(2).held('confirm') || (!S.coop && inputOf(1).held('jump'));
      if (!hold) S.skipArmed = true;
      S.skipHold = (hold && S.skipArmed) ? S.skipHold + dt : 0;
      if (S.introT < introLen()) {
        var prev = S.introT;
        S.introT += dt;
        if (S.skipHold >= 1.0 && S.introKind === 'full') {
          S.skipHold = 0; S.skipArmed = false;
          if (S.fk === 'final' && prev < FINAL_SALTA_A) {
            // la final nunca se salta el lema: va directa a "¡FUSIÓN FINAL!" y "WE ARE A TEAM"
            S.texts = []; S.introT = FINAL_SALTA_A; prev = FINAL_SALTA_A - 0.001; S.flash = 0.6;
          } else if (S.fk !== 'final' || prev >= MOTTO_T + 0.5) {
            S.introT = introLen(); S.flash = 0.6; sfx('fusion3'); S.msg = null;
          }
        }
        introEvents(prev, S.introT);
        f.pop = introPop();
        if (S.introT >= introLen()) {
          f.pop = 1;
          if (!S.bossIntroOn) beginFight();
        }
        updateFusionIdle(dt);
        return;
      }
      // intro del jefe (plugin)
      f.pop = 1;
      updateFusionIdle(dt);
      S.bossIntroT += dt;
      var done = true;
      try { done = !!S.bdef.intro(S.b, S.bossIntroT, arena); } catch (e) { warnOnce('intro', e); done = true; }
      updateHostiles(dt);
      if (done || S.bossIntroT > 9) beginFight();
    }
    function introPop() {
      var t = S.introT;
      if (S.introKind === 'short') return easeOut((t - 0.3) / 0.6);
      if (S.fk === 'final') return t < 6.8 ? 0 : easeOut((t - 6.8) / 0.7);
      return t < 3.0 ? 0 : easeOut((t - 3.0) / 0.7);
    }
    function crossed(a, b, x) { return a < x && b >= x; }
    function introEvents(a, b) {
      var f = S.f;
      if (S.introKind === 'short') {
        if (crossed(a, b, 0.3)) { S.flash = 0.8; sfx('fusion3'); S.msg = { text: S.fd.titulo, t: 0, life: 1.6 }; }
        return;
      }
      if (S.fk === 'final') {
        if (a === 0) { S.msg = null; }
        if (crossed(a, b, 0.2)) sfx('jetpack');
        if (crossed(a, b, 1.8)) { S.shake = 0.6; sfx('robot'); addParts(f.x, GROUND_Y - 8, '#d6d3d1', 22, 260, 'dot'); }
        if (crossed(a, b, 2.0)) S.texts.push({ x: f.x, y: GROUND_Y - 470, text: '¡Dark Secuaz es el cuerpo!', color: '#86efac', size: 40, t: 0, life: 1.6 });
        var V = finalVeh();
        for (var i = 0; i < V.length; i++) {
          var t0 = 2.0 + i * 1.1;
          if (crossed(a, b, t0)) sfx('boost');
          if (crossed(a, b, t0 + 0.75)) {
            sfx('transform');
            var sp = finalSpot(V[i]);
            addParts(sp.x, sp.y, V[i].color, 14, 200, 'star');
            S.texts.push({ x: sp.x, y: sp.y - 70, text: V[i].nombre, color: V[i].color, size: 36, t: 0, life: 1.3, veh: true });
            S.shake = Math.max(S.shake, 0.2);
          }
        }
        if (crossed(a, b, 6.4)) {
          // las etiquetas de los vehículos se van: "¡FUSIÓN FINAL!" entra solo, sin pisar a nadie
          for (var k = S.texts.length - 1; k >= 0; k--) if (S.texts[k] && S.texts[k].veh) S.texts.splice(k, 1);
          // se va (desvanecida) justo cuando entra el lema: no se montan
          S.msg = { text: '¡FUSIÓN FINAL!', t: 0, life: MOTTO_T - 6.4, big: true }; sfx('fusion3');
        }
        if (crossed(a, b, 6.8)) { S.flash = 1; S.shake = 0.7; sfx('explosion'); addParts(f.x, GROUND_Y - 210, '#fde68a', 30, 320, 'star'); }
        if (crossed(a, b, 7.2)) { sfx('victory'); }
        return;
      }
      // fusión de pareja
      if (crossed(a, b, 1.5)) { sfx('jump'); sfx('boost'); }
      if (crossed(a, b, 2.2)) { S.msg = { text: S.fd.titulo, t: 0, life: 2.2, big: true }; sfx('fusion3'); }
      if (crossed(a, b, 3.0)) { S.flash = 1; S.shake = 0.5; sfx('transform'); addParts(f.x, f.y - S.fd.alto * 0.5, '#fde68a', 26, 300, 'star'); }
      if (crossed(a, b, 3.8)) S.texts.push({ x: f.x, y: f.y - S.fd.alto - 40, text: S.fd.pareja, color: '#fef3c7', size: 36, t: 0, life: 1.4 });
    }
    // vehículos de la intro final: robot-moto, transformable, submarino-nave, mecha-halcón (en ese orden, §12.5)
    function finalVeh() {
      return [
        { kind: 'moto', nombre: '¡Robot-moto!', color: '#fdba74', from: [-420, 120], pt: [86, -212] },
        { kind: 'coche', nombre: '¡Robot transformable!', color: '#93c5fd', from: [1300, -60], pt: [-79, -221] },
        { kind: 'sub', nombre: '¡Submarino-nave!', color: '#fde047', from: [-420, 330], pt: [108, -86] },
        { kind: 'halcon', nombre: '¡Mecha-halcón!', color: '#86efac', from: [1300, -380], pt: [-118, -262] }
      ];
    }
    function finalSpot(v) {
      var s = FUS.final.alto / altoArte('fusionFinal');
      return { x: S.f.x + v.pt[0] * s, y: GROUND_Y + v.pt[1] * s };
    }

    // ---------- pelea ----------
    function updateFight(dt) {
      S.fightT += dt;
      var b = S.b;
      updateFusion(dt);
      if (S.leaving || S.modo !== 'pelea') return;
      if (!(S.primera && S.fightT < 6)) trackHint();
      // ¡ATAQUE EN EQUIPO! (CAMBIO del piloto con la barra llena)
      if (S.barra >= 1 && inputOf(S.pilotJ).pressed('switch')) { startEquipo(); return; }
      updatePieces(dt);
      // jefe
      try { if (S.bdef.update) S.bdef.update(b, dt, arena); } catch (e) { warnOnce('update del jefe', e); }
      if (S.leaving || S.modo !== 'pelea') return;
      updateHostiles(dt);
      updateAlly(dt);
      if (S.modo !== 'pelea') return;
      if (b.hp <= 0 || b.vencido === true) startVictory();
    }
    function updateFusionIdle(dt) {
      var f = S.f;
      if (S.b) f.facing = S.b.x >= f.x ? 1 : -1;
      if (f.inv > 0) f.inv -= dt;
      if (f.land > 0) f.land -= dt;
      f.shieldE = Math.min(1, f.shieldE + dt * 0.5);
      if (S.modoAire) f.y = clamp(f.y, SAFE_TOP + S.fd.alto, GROUND_Y);
    }
    function updateFusion(dt) {
      var f = S.f, fd = S.fd, IN = inputOf(S.pilotJ);
      if (f.inv > 0) f.inv -= dt;
      if (f.hurtT > 0) f.hurtT -= dt;
      if (f.shieldHit > 0) f.shieldHit -= dt;
      if (f.land > 0) f.land -= dt;
      if (S.b) f.facing = S.b.x >= f.x ? 1 : -1;
      // escudo: DISPARO mantenido
      var want = IN.held('shoot');
      if (!want && f.shieldE >= 0.3) f.shieldLock = false;
      f.shield = want && !f.shieldLock && f.shieldE > 0 && f.punchT <= 0;
      if (f.shield) {
        f.shieldE -= dt * 0.35;
        if (f.shieldE <= 0) { f.shieldE = 0; f.shieldLock = true; f.shield = false; }
      } else {
        f.shieldE = Math.min(1, f.shieldE + dt * 0.5);
      }
      // movimiento
      var mx = (IN.held('right') ? 1 : 0) - (IN.held('left') ? 1 : 0);
      var sp = fd.vel * (f.shield ? 0.4 : 1) * (f.punchT > 0 ? 0.35 : 1);
      f.vx += (mx * sp - f.vx) * Math.min(1, 14 * dt);
      f.walk = Math.abs(f.vx) > 20 ? f.walk + dt : 0;
      if (f.pushT > 0) { f.x += f.pushV * dt; f.pushT -= dt; }
      f.x += f.vx * dt;
      f.x = clamp(f.x, A_L + 90, A_R - 90);
      if (S.modoAire) {
        var my = (IN.held('down') ? 1 : 0) - (IN.held('up') || IN.held('jump') ? 1 : 0);
        f.vy += (my * sp - f.vy) * Math.min(1, 14 * dt);
        var cy = f.y - fd.alto / 2 + f.vy * dt;
        cy = clamp(cy, SAFE_TOP + fd.alto / 2, GROUND_Y - fd.alto / 2);
        f.y = cy + fd.alto / 2;
        f.enSuelo = f.y >= GROUND_Y - 4;
      } else {
        if (IN.pressed('jump')) {
          if (f.enSuelo) {
            f.vy = -1050; f.enSuelo = false; f.jumps = 1; sfx('jump');
            addParts(f.x, GROUND_Y - 6, '#d6d3d1', 10, 180, 'dot');
          } else if (fd.saltos >= 2 && f.jumps < 2) {
            f.vy = -850; f.jumps = 2; sfx('jetpack');
            addParts(f.x - f.facing * 100, f.y - fd.alto * 0.6, '#86efac', 12, 200, 'star');
          }
        }
        if (!f.enSuelo) {
          f.vy += 2400 * dt;
          f.y += f.vy * dt;
          f.airT += dt;
          if (f.y >= GROUND_Y) {
            f.y = GROUND_Y; f.vy = 0; f.enSuelo = true; f.jumps = 0; f.land = 0.22; f.airT = 0;
            S.shake = Math.max(S.shake, 0.25); sfx('robot');
            addParts(f.x - 60, GROUND_Y - 6, '#d6d3d1', 8, 160, 'dot');
            addParts(f.x + 60, GROUND_Y - 6, '#d6d3d1', 8, 160, 'dot');
          }
        }
      }
      // puñetazo en combo de 3 (0,28 / 0,28 / 0,42 s; daño 1 / 1 / 2)
      if (f.punchT > 0) {
        f.punchT -= dt;
        if (IN.pressed('attack')) f.buf = true;
        if (!f.hitDone && f.punchT <= f.punchDur * 0.5) { f.hitDone = true; punchHit(); if (S.leaving || S.modo !== 'pelea') return; }
        if (f.punchT <= 0) { f.punchT = 0; f.comboT = 0.5; }
      } else if (!f.shield && (IN.pressed('attack') || f.buf)) {
        f.buf = false;
        f.step = (f.comboT > 0 && f.step < 3) ? f.step + 1 : 1;
        f.punchDur = f.step === 3 ? 0.42 : 0.28;
        f.punchT = f.punchDur; f.hitDone = false; f.comboT = 0;
        sfx(f.step === 3 ? 'bigPunch' : 'punch');
      }
      if (f.comboT > 0) { f.comboT -= dt; if (f.comboT <= 0) f.step = 0; }
    }
    function punchRect() {
      var f = S.f, fd = S.fd, front = f.x + f.facing * fd.ancho / 2;
      return { x: f.facing > 0 ? front : front - 200, y: f.y - 0.75 * fd.alto, w: 200, h: 250 };
    }
    function punchHit() {
      var f = S.f, r = punchRect(), dmg = f.step === 3 ? 2 : 1, hit = false;
      // proyectiles y esbirros que toque
      for (var i = S.shots.length - 1; i >= 0; i--) {
        var s = S.shots[i];
        if (circRect(s.x, s.y, s.r, r)) { addParts(s.x, s.y, '#bff7ff', 8, 160, 'clink'); S.shots.splice(i, 1); sfx('clink'); hit = true; }
      }
      for (var j = 0; j < S.minions.length; j++) {
        var m = S.minions[j];
        if (!m.dead && m.fase !== 'aviso' && circRect(m.x, m.y, 22, r)) { popMinion(m); hit = true; addBarra(1); }
      }
      // el jefe: la PRIMERA zona del array que toque el golpe
      if (S.b) {
        var z = zones();
        for (var k = 0; k < z.length; k++) {
          if (circRect(z[k].x, z[k].y, z[k].r, r)) {
            hitBoss(z[k], dmg, 'puño', f.x);
            hit = true;
            break;
          }
        }
      }
      var fx = f.x + f.facing * (S.fd.ancho / 2 + 70), fy = f.y - S.fd.alto * 0.5;
      if (hit) {
        S.shake = Math.max(S.shake, f.step === 3 ? 0.35 : 0.2);
        addParts(fx, fy, '#fde68a', 8, 200, 'star');
        S.texts.push({ x: fx, y: fy - 60, text: f.step === 3 ? '¡PUM!' : '¡PAF!', color: '#fde68a', size: f.step === 3 ? 46 : 34, t: 0, life: 0.6 });
      }
    }

    // ---------- piezas: IA y artillero ----------
    function updatePieces(dt) {
      var artArma = S.coop && S.art ? S.art.arma : null;
      for (var i = 0; i < S.piezas.length; i++) {
        var p = S.piezas[i];
        if (p.flash > 0) p.flash -= dt;
        if (p.arma === artArma) continue;            // la maneja el artillero
        p.cd -= dt;
        if (p.cd <= 0) {
          if (fireWeapon(p.arma, S.kIA, false)) { p.cd = PIEZA[p.arma].cadIA; p.flash = 0.3; }
          else p.cd = 0.4;
        }
      }
      if (S.coop && S.art) {
        var A = S.art, IN = inputOf(S.artJ);
        if (A.flash > 0) A.flash -= dt;
        if (A.label > 0) A.label -= dt;
        if (A.cd > 0) A.cd -= dt;
        if (S.fk === 'final' && IN.pressed('switch')) {
          var l = artList(), ix = l.indexOf(A.arma);
          A.arma = l[(ix + 1) % l.length];
          A.label = 1.0; sfx('launcherSwap');
        }
        if ((IN.held('attack') || IN.held('shoot')) && A.cd <= 0) {
          if (fireWeapon(A.arma, 1, true)) { A.cd = PIEZA[A.arma].cadArt; A.flash = 0.3; }
        }
      }
    }
    // objetivo: esbirros a < 400 px, después zonas débiles y después el cuerpo (nunca la armadura)
    function pickTarget() {
      var f = S.f, cy = f.y - S.fd.alto / 2, best = null, bd = 400;
      for (var i = 0; i < S.minions.length; i++) {
        var m = S.minions[i];
        if (m.dead || m.fase === 'aviso' || m.fase === 'cae') continue;
        var d = Math.sqrt((m.x - f.x) * (m.x - f.x) + (m.y - cy) * (m.y - cy));
        if (d < bd) { bd = d; best = m; }
      }
      if (best) return { m: best };
      if (!S.b) return null;
      var z = zones(), deb = null, cue = null;
      for (var k = 0; k < z.length; k++) {
        if (!deb && z[k].tipo === 'debil') deb = z[k];
        if (!cue && z[k].tipo === 'cuerpo') cue = z[k];
      }
      var zz = deb || cue;
      return zz ? { zid: zz.id, x: zz.x, y: zz.y } : null;
    }
    function targetPos(tg) {
      if (!tg) return null;
      if (tg.m) return tg.m.dead ? null : { x: tg.m.x, y: tg.m.y };
      var z = zoneById(tg.zid);
      return z ? { x: z.x, y: z.y } : null;
    }
    function fireWeapon(arma, dmg, byPlayer) {
      var tg = pickTarget();
      if (!tg) return false;
      var g = gunPos(arma), tp = targetPos(tg) || { x: S.b.x, y: S.b.y - S.b.alto / 2 };
      var ang = Math.atan2(tp.y - g.y, tp.x - g.x);
      if (arma === 'lanzadores') {
        for (var i = 0; i < 2; i++) {
          var a = ang + (i ? 0.12 : -0.12);
          S.ally.push({ arma: arma, x: g.x, y: g.y + (i ? 10 : -10), vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, dmg: dmg, tg: tg, t: i * 0.05, life: 3, r: 12, by: byPlayer });
        }
        sfx('blaster');
      } else if (arma === 'plumas') {
        for (var j = -1; j <= 1; j++) {
          var a2 = ang + j * 0.32;
          S.ally.push({ arma: arma, x: g.x, y: g.y, vx: Math.cos(a2) * 560, vy: Math.sin(a2) * 560, dmg: dmg, tg: tg, t: 0, life: 3, r: 12, by: byPlayer });
        }
        sfx('arrow');
      } else if (arma === 'escudo') {
        S.ally.push({ arma: arma, x: g.x, y: g.y, vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560, dmg: dmg, tg: tg, t: 0, life: 4, r: 30, by: byPlayer, ida: true, spin: 0 });
        sfx('shieldThrow');
      } else if (arma === 'pulso') {
        firePulso(g, tg, dmg, byPlayer);
      }
      addParts(g.x, g.y, PIEZA[arma].color, 6, 140, 'dot');
      return true;
    }
    function firePulso(g, tg, dmg, byPlayer) {
      var tp = targetPos(tg);
      if (!tp) return;
      sfx('zap'); sfx('laser');
      var x2 = tp.x, y2 = tp.y;
      if (tg.m) {
        // aturde y hace pop a los esbirros del camino
        for (var i = 0; i < S.minions.length; i++) {
          var m = S.minions[i];
          if (!m.dead && m.fase !== 'aviso' && segCirc(g.x, g.y, x2, y2, m.x, m.y, 26)) { m.stun = 0.5; popMinion(m); }
        }
      } else if (S.b) {
        var z = zones();
        for (var k = 0; k < z.length; k++) {
          if (z[k].tipo === 'armadura' && !segCirc(g.x, g.y, x2, y2, z[k].x, z[k].y, z[k].r)) continue;
          if (segCirc(g.x, g.y, x2, y2, z[k].x, z[k].y, z[k].r)) {
            hitBoss(z[k], dmg, 'pulso', g.x, !byPlayer);
            S.stuns.push({ x: z[k].x, y: z[k].y, r: z[k].r, t: 0, life: 0.5, zid: z[k].id });
            x2 = z[k].x; y2 = z[k].y;
            break;
          }
        }
      }
      S.allyBeams.push({ x1: g.x, y1: g.y, x2: x2, y2: y2, t: 0, life: 0.32, col: '#22d3ee' });
    }
    function updateAlly(dt) {
      for (var i = S.ally.length - 1; i >= 0; i--) {
        var p = S.ally[i], dead = false;
        p.t += dt; p.life -= dt;
        if (p.spin !== undefined) p.spin += dt * 14;
        var tp;
        if (p.arma === 'escudo' && !p.ida) {
          tp = gunPos('escudo');
        } else {
          tp = targetPos(p.tg);
          if (!tp && !p.fx) { p.tg = pickTarget(); tp = targetPos(p.tg); }
        }
        var sp = 560;
        if (tp) {
          var dx = tp.x - p.x, dy = tp.y - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          var k = Math.min(1, (p.arma === 'plumas' ? 5 : 9) * dt);
          p.vx += (dx / d * sp - p.vx) * k; p.vy += (dy / d * sp - p.vy) * k;
          var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
          p.vx = p.vx / v * sp; p.vy = p.vy / v * sp;
          if (p.arma === 'escudo' && !p.ida && d < 40) { dead = true; sfx('shieldCatch'); }
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        // esbirros
        if (!dead && !p.fx) {
          for (var j = 0; j < S.minions.length; j++) {
            var m = S.minions[j];
            if (m.dead || m.fase === 'aviso') continue;
            if ((m.x - p.x) * (m.x - p.x) + (m.y - p.y) * (m.y - p.y) <= (p.r + 22) * (p.r + 22)) {
              popMinion(m); addBarra(1);
              if (p.arma === 'escudo') { if (p.ida) p.ida = false; }
              else dead = true;
              break;
            }
          }
        }
        // jefe: la primera zona que toque, una vez por proyectil (el escudo: una a la ida y otra a la vuelta)
        if (!dead && S.b && (S.modo === 'pelea' || S.modo === 'equipo')) {
          var hitKey = p.arma === 'escudo' ? (p.ida ? 'hIda' : 'hVuelta') : 'hit';
          if (!p[hitKey]) {
            var z = zones();
            for (var q = 0; q < z.length; q++) {
              var zz = z[q];
              if ((zz.x - p.x) * (zz.x - p.x) + (zz.y - p.y) * (zz.y - p.y) <= (zz.r + p.r) * (zz.r + p.r)) {
                p[hitKey] = true;
                if (p.fx) addParts(p.x, p.y, PIEZA[p.arma].color, 6, 160, 'star');
                else hitBoss(zz, p.dmg, p.arma, p.x - p.vx * 0.1, !p.by);
                if (p.arma === 'escudo') { if (p.ida) p.ida = false; }
                else dead = true;
                break;
              }
            }
          }
        }
        if (p.life <= 0 || p.x < A_L - 400 || p.x > A_R + 400 || p.y < -900 || p.y > GROUND_Y + 200) dead = true;
        if (dead) {
          if (p.arma !== 'escudo') addParts(p.x, p.y, PIEZA[p.arma].color, 5, 120, 'dot');
          S.ally.splice(i, 1);
        }
      }
      for (var b = S.allyBeams.length - 1; b >= 0; b--) { S.allyBeams[b].t += dt; if (S.allyBeams[b].t >= S.allyBeams[b].life) S.allyBeams.splice(b, 1); }
      for (var s = S.stuns.length - 1; s >= 0; s--) { S.stuns[s].t += dt; if (S.stuns[s].t >= S.stuns[s].life) S.stuns.splice(s, 1); }
    }

    // ---------- ataques del jefe: disparos, ondas, rayos, esbirros, avisos ----------
    function updateHostiles(dt) {
      var f = S.f, fr = fusionRect(), i;
      for (i = S.warns.length - 1; i >= 0; i--) { S.warns[i].t += dt; if (S.warns[i].t >= S.warns[i].life) S.warns.splice(i, 1); }
      // disparos
      for (i = S.shots.length - 1; i >= 0; i--) {
        var s = S.shots[i], dead = false;
        s.t += dt; s.life -= dt; s.rot += dt * 8;
        s.vy += s.gravity * dt;
        if (s.vuelve) {
          var bx = S.b ? S.b.x : s.ox;
          if (!s.ret && (s.x < A_L + 40 || s.x > A_R - 40 || s.t > 1.8)) {
            s.ret = true; s.vx = sgn(bx - s.x) * Math.max(240, Math.abs(s.vx));
          }
          if (s.ret && Math.abs(s.x - bx) < 50) dead = true;
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.kind === 'sierra' && s.y > GROUND_Y - s.r) { s.y = GROUND_Y - s.r; s.vy = 0; }
        if (!dead && circRect(s.x, s.y, s.r, fr)) {
          var res = hurtFusion(s.dmg, s.x - s.vx * 0.1, {});
          if (res !== 'nada' || f.inv <= 0) dead = true;
          if (res === 'bloqueado') addParts(s.x, s.y, '#a5f3fc', 6, 160, 'clink');
        }
        if (!dead && s.kind !== 'sierra' && s.y >= GROUND_Y - 4 && s.vy >= 0) {
          dead = true;
          addParts(s.x, GROUND_Y - 6, s.kind === 'roca' ? '#a8a29e' : '#fb923c', 10, 180, 'dot');
          if (s.kind === 'roca' || s.kind === 'bomba') { S.shake = Math.max(S.shake, 0.15); sfx(s.kind === 'bomba' ? 'explosion' : 'hit'); }
        }
        if (s.life <= 0 && !s.vuelve) dead = true;
        if (s.life < -6) dead = true;
        if (s.x < A_L - 300 || s.x > A_R + 300 || s.y > GROUND_Y + 300) dead = true;
        if (dead) S.shots.splice(i, 1);
        if (S.modo === 'derrota' || S.leaving) return;
      }
      // ondas por el suelo
      for (i = S.waves.length - 1; i >= 0; i--) {
        var w = S.waves[i], wdead = false;
        w.t += dt;
        w.x += w.dir * w.vel * dt;
        if (!w.hit && f.enSuelo && Math.abs(w.x - f.x) < S.fd.ancho / 2 + 18) {
          w.hit = true;
          var r2 = hurtFusion(w.dmg, w.x - w.dir * w.vel * 0.1, {});
          if (r2 === 'bloqueado') { wdead = true; addParts(w.x, GROUND_Y - 20, '#a5f3fc', 10, 180, 'clink'); }
        }
        if (w.x < A_L - 200 || w.x > A_R + 200 || w.t > 6) wdead = true;
        if (wdead) S.waves.splice(i, 1);
        if (S.modo === 'derrota' || S.leaving) return;
      }
      // rayos horizontales
      for (i = S.beams.length - 1; i >= 0; i--) {
        var bm = S.beams[i];
        bm.t += dt;
        var lo = Math.min(bm.x1, bm.x2), hi = Math.max(bm.x1, bm.x2);
        bm.cut = null;
        var crossesF = f.x + S.fd.ancho / 2 >= lo && f.x - S.fd.ancho / 2 <= hi && bm.y + bm.ancho / 2 >= fr.y && bm.y - bm.ancho / 2 <= fr.y + fr.h;
        if (crossesF && f.shield) bm.cut = shieldX();
        if (!bm.hit && crossesF && bm.t <= bm.life) {
          var r3 = hurtFusion(bm.dmg, bm.x1, {});
          if (r3 !== 'nada') bm.hit = true;
        }
        if (bm.t >= bm.life) S.beams.splice(i, 1);
        if (S.modo === 'derrota' || S.leaving) return;
      }
      // esbirros
      var cy = f.y - S.fd.alto / 2;
      for (i = S.minions.length - 1; i >= 0; i--) {
        var m = S.minions[i];
        if (m.dead) { m.t += dt; if (m.t > 0.4) S.minions.splice(i, 1); continue; }
        m.t += dt; m.life -= dt;
        if (m.fase === 'aviso') {
          if (m.t >= 1.0) { m.fase = 'cae'; m.t = 0; m.y = -260 - S.camDY - Math.random() * 60; m.vy = 760; sfx('miniRobot'); }
          continue;
        }
        if (m.stun > 0) { m.stun -= dt; continue; }
        if (m.fase === 'cae') {
          m.y += m.vy * dt;
          if (m.y >= m.landY) { m.y = m.landY; m.fase = 'vuela'; m.vx = 0; m.vy = 0; }
        } else {
          var dx = f.x - m.x, dy = cy - m.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          var k = Math.min(1, 2.5 * dt);
          m.vx += (dx / d * m.persigue - m.vx) * k;
          m.vy += (dy / d * m.persigue - m.vy) * k;
          m.x += m.vx * dt; m.y += m.vy * dt + Math.sin(S.t * 6 + i) * 0.4;
          m.facing = m.vx < 0 ? -1 : 1;
          if (m.y > GROUND_Y - 24) m.y = GROUND_Y - 24;
        }
        if (circRect(m.x, m.y, 20, fr)) {
          hurtFusion(1, m.x, {});
          popMinion(m);
          if (S.modo === 'derrota' || S.leaving) return;
          continue;
        }
        if (m.life <= 0) popMinion(m);
      }
    }
    function popMinion(m) {
      if (m.dead) return;
      m.dead = true; m.t = 0;
      addParts(m.x, m.y, '#fb923c', 8, 180, 'dot');
      addParts(m.x, m.y, '#cbd5e1', 4, 160, 'tuerca');
      sfx('explosion');
    }

    // ---------- ataque en equipo (§12.4) ----------
    function startEquipo() {
      S.modo = 'equipo';
      S.eq = { t: 0, hit: false, zona: null, volley: 0 };
      S.barra = 0; S.barraAvisada = false; S.barraPista = null; S.pedido = false;
      var f = S.f;
      f.shield = false; f.punchT = 0; f.vx = 0; f.pushT = 0;
      S.flash = 1; S.shake = 0.5;
      sfx('teamAttack');
      S.msg = { text: '¡ATAQUE EN EQUIPO!', t: 0, life: 1.8, big: true };
      addParts(f.x, f.y - S.fd.alto * 0.5, '#fde68a', 30, 320, 'star');
    }
    function updateEquipo(dt) {
      var e = S.eq, f = S.f;
      e.t += dt;
      if (S.b) f.facing = S.b.x >= f.x ? 1 : -1;
      if (f.inv > 0) f.inv -= dt;
      // en el aire, la fusión se queda flotando; en el suelo, cae si estaba saltando
      if (!S.modoAire && !f.enSuelo) {
        f.vy += 2400 * dt; f.y += f.vy * dt;
        if (f.y >= GROUND_Y) { f.y = GROUND_Y; f.vy = 0; f.enSuelo = true; f.jumps = 0; f.land = 0.2; }
      }
      // todas las piezas disparan a la vez (efecto)
      if (e.volley < 3 && e.t >= 0.15 + e.volley * 0.3) {
        e.volley++;
        for (var i = 0; i < S.fd.piezas.length; i++) {
          var arma = S.fd.piezas[i], g = gunPos(arma), tg = pickTarget();
          if (!tg) continue;
          if (arma === 'pulso') { var tp = targetPos(tg); if (tp) S.allyBeams.push({ x1: g.x, y1: g.y, x2: tp.x, y2: tp.y, t: 0, life: 0.3, col: '#22d3ee' }); continue; }
          var tp2 = targetPos(tg) || { x: S.b.x, y: S.b.y - S.b.alto / 2 };
          var a = Math.atan2(tp2.y - g.y, tp2.x - g.x);
          S.ally.push({ arma: arma, x: g.x, y: g.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, dmg: 0, tg: tg, t: 0, life: 2, r: arma === 'escudo' ? 30 : 12, fx: true, ida: true, spin: arma === 'escudo' ? 0 : undefined });
        }
        sfx('blaster');
      }
      // el gran rayo de colores: 10 de daño, atraviesa la armadura
      if (!e.hit && e.t >= 1.0 && S.b) {
        e.hit = true;
        var z = zones(), zz = null;
        for (var k = 0; k < z.length; k++) if (z[k].tipo !== 'armadura') { zz = z[k]; break; }
        if (!zz) zz = { x: S.b.x, y: S.b.y - S.b.alto / 2, r: 40, tipo: 'cuerpo', id: 'cuerpo' };
        e.zona = { x: zz.x, y: zz.y };
        var apE = hitBoss(zz, 10, 'equipo', f.x);
        S.shake = 0.8; S.flash = 0.7; sfx('explosion'); sfx('bigPunch');
        addParts(zz.x, zz.y, '#fde68a', 26, 320, 'star');
        addParts(zz.x, zz.y, '#60a5fa', 14, 260, 'dot');
        addParts(zz.x, zz.y, '#4ade80', 14, 260, 'dot');
        // si el jefe lo aguanta (el ritmo lo recorta y lo guarda: él dice "¡Resiste… por ahora!" encima),
        // NO es "¡CLANC!" (eso es "bloqueado"): un "¡BOOM!" más abajo, para que no se monten
        if (apE >= 1) S.texts.push({ x: Math.min(zz.x + 110, A_R - 70), y: zz.y + 10, text: '¡-' + Math.round(apE) + '!', color: '#fde047', size: 56, t: 0, life: 1.1 });
        else S.texts.push({ x: Math.min(zz.x + 130, A_R - 70), y: zz.y + 110, text: '¡BOOM!', color: '#fde047', size: 52, t: 0, life: 1.1 });
      }
      if (!e.zona && S.b) { var z0 = zones(); for (var q = 0; q < z0.length; q++) if (z0[q].tipo !== 'armadura') { e.aim = { x: z0[q].x, y: z0[q].y }; break; } }
      updateAlly(dt);
      for (var w = S.warns.length - 1; w >= 0; w--) S.warns[w].t = Math.min(S.warns[w].t, S.warns[w].life - 0.01);
      if (e.t >= 2.5) {
        S.eq = null;
        S.modo = 'pelea';
        f.inv = Math.max(f.inv, 0.6);
        if (S.b && (S.b.hp <= 0 || S.b.vencido === true)) startVictory();
      }
    }

    // ---------- victoria (§12.5) ----------
    function startVictory() {
      if (S.modo === 'victoria') return;
      S.modo = 'victoria';
      S.vic = { t: 0, defT: 0, defDone: false, celT: 0, wordsShown: false };
      S.shots = []; S.waves = []; S.beams = [];
      S.minions.forEach(function (m) { if (!m.dead) popMinion(m); });
      S.f.shield = false; S.f.punchT = 0;
      S.barraPista = null; S.pista = null;
    }
    function updateVictory(dt) {
      var v = S.vic, f = S.f;
      v.t += dt;
      // la fusión vuelve al suelo (o flota) y mira al jefe
      if (!S.modoAire && !f.enSuelo) {
        f.vy += 2400 * dt; f.y += f.vy * dt;
        if (f.y >= GROUND_Y) { f.y = GROUND_Y; f.vy = 0; f.enSuelo = true; f.jumps = 0; f.land = 0.2; }
      }
      if (!v.defDone) {
        v.defT += dt;
        var done = true;
        try { done = S.bdef.defeat ? !!S.bdef.defeat(S.b, v.defT, arena) : v.defT > 1.5; } catch (e) { warnOnce('defeat', e); done = true; }
        updateHostiles(dt);
        if (done || v.defT > 6.5) {
          v.defDone = true;
          sfx('victory');
          S.flash = 0.6;
          S.shots = []; S.waves = []; S.beams = [];
          if (S.fk === 'final') {
            if (S.plugTexts.indexOf('Robovill se escapa') < 0 && (def.jefe === 'robovill')) S.escapaTxt = true;
          }
          addParts(f.x, f.y - S.fd.alto * 0.6, '#fde68a', 30, 320, 'star');
          addParts(f.x, f.y - S.fd.alto * 0.6, '#f472b6', 16, 280, 'confeti');
          addParts(f.x, f.y - S.fd.alto * 0.6, '#60a5fa', 16, 280, 'confeti');
        }
        return;
      }
      v.celT += dt;
      f.celebra += dt;
      if (Math.random() < dt * 8) addParts(rnd(-150, 1110), -220 - S.camDY, ['#f472b6', '#60a5fa', '#4ade80', '#facc15'][Math.floor(Math.random() * 4)], 2, 80, 'confeti');
      if (v.celT >= (S.fk === 'final' ? 2.3 : 2.0)) {
        var cap = def.chapter || 0;
        if (def.prueba || !cap) goTo('title');
        else goTo('levelDoneP3', { chapter: cap });
      }
    }

    // ---------- derrota ----------
    function startDerrota() {
      if (S.modo === 'derrota' || S.modo === 'victoria') return;
      S.modo = 'derrota';
      S.der = { t: 0 };
      S.f.shield = false; S.f.punchT = 0;
      var fase = S.b ? S.b.fase : null;
      RETRY[NAME] = { fase: (fase === 1 || fase === 2 || fase === 3) ? fase : 1 };
      S.shake = 0.6; sfx('explosion');
      music(null);
    }
    function updateDerrota(dt) {
      var f = S.f;
      S.der.t += dt;
      f.fallT = S.der.t;
      if (S.modoAire && f.y < GROUND_Y) { f.vy += 1400 * dt; f.y = Math.min(GROUND_Y, f.y + f.vy * dt); }
      if (Math.random() < dt * 10) addParts(f.x + rnd(-60, 60), f.y - rnd(40, S.fd.alto * 0.8), '#fde68a', 2, 120, 'star');
      if (S.der.t >= 1.4) goTo('gameover', { retry: NAME });
    }

    function goTo(name, params) {
      if (S.leaving) return;
      S.leaving = true;
      if (name !== 'gameover' && name !== 'title' && !(G.scenes && G.scenes[name])) name = 'title';
      try { G.go(name, params); } catch (e) { warnOnce('go', e); }
    }

    // ---------- partículas, textos y cámara ----------
    function addParts(x, y, color, n, vel, kind) {
      if (!S) return;
      n = Math.min(40, n | 0);
      for (var i = 0; i < n; i++) {
        var a = Math.random() * PI * 2, v = vel * (0.4 + Math.random() * 0.8);
        S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - vel * 0.2, t: 0,
          life: 0.45 + Math.random() * 0.45, r: 3 + Math.random() * 4, color: color, kind: kind, rot: Math.random() * 6 });
      }
      if (S.parts.length > 420) S.parts.splice(0, S.parts.length - 420);
    }
    function updateParts(dt) {
      for (var i = S.parts.length - 1; i >= 0; i--) {
        var p = S.parts[i];
        p.t += dt;
        if (p.t >= p.life) { S.parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.kind === 'confeti' ? 260 : 520) * dt;
        p.vx *= Math.pow(p.kind === 'confeti' ? 0.5 : 0.2, dt);
        p.rot += dt * 8;
      }
      for (var j = S.texts.length - 1; j >= 0; j--) {
        var tx = S.texts[j];
        tx.t += dt; tx.y -= 30 * dt;
        if (tx.t >= tx.life) S.texts.splice(j, 1);
      }
    }
    function updateCamera(dt) {
      if (S.modoAire) { S.camDY = 0; return; }
      var tope = S.f.y - S.fd.alto;
      if (S.b && S.modo !== 'intro') tope = Math.min(tope, num(S.b.y, GROUND_Y) - num(S.b.alto, 300));
      if (S.modo === 'intro' && S.fk === 'final') tope = GROUND_Y - S.fd.alto;
      var obj = clamp(SAFE_TOP - tope, 0, 260);
      var k = obj > S.camDY ? 12 : 5;
      S.camDY += (obj - S.camDY) * Math.min(1, k * dt);
    }

    // -------------------------------------------------------------------------
    //  Dibujo
    // -------------------------------------------------------------------------
    scene.render = function (ctx) {
      if (!S) return;
      ctx.save();
      try { draw(ctx); }
      catch (e) { warnOnce('render', e); }
      ctx.restore();
    };
    function draw(ctx) {
      var t = S.t;
      drawBackground(ctx, t);
      drawIntroMood(ctx, t);
      // mundo con cámara (zoom 0,667 alrededor de (480, 470) y camDY)
      ctx.save();
      if (S.shake > 0) {
        var s = Math.min(S.shake, 0.8) * 30;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      ctx.translate(480, GROUND_Y); ctx.scale(ZOOM, ZOOM); ctx.translate(-480, -GROUND_Y + S.camDY);
      drawFloor(ctx, t);
      drawWarnsSuelo(ctx, t);
      drawWaves(ctx, t);
      var bossVisible = S.b && !(S.modo === 'intro' && S.introT < introLen());
      if (bossVisible) drawBoss(ctx, t);
      if (S.modo === 'intro' && S.introT < introLen()) drawIntroWorld(ctx, t);
      drawMinions(ctx, t);
      drawFusion(ctx, t);
      drawAllyBeams(ctx, t);
      drawAlly(ctx, t);
      drawWarnsMarcas(ctx, t);          // el borde y el "!" de los avisos, ENCIMA del jefe y de la fusión
      drawShots(ctx, t);
      drawBeams(ctx, t);
      if (S.modo === 'equipo') drawTeamBeam(ctx, t);
      drawParts(ctx);
      drawTexts(ctx);
      ctx.restore();
      if (S.flash > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, S.flash); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      drawHUD(ctx, t);
      drawOverlays(ctx, t);
    }

    // ---------- intro final: la sala se oscurece y un foco de luz cae sobre el equipo ----------
    function drawIntroMood(ctx, t) {
      if (!(S.modo === 'intro' && S.fk === 'final' && S.introKind === 'full' && S.introT < 7.1)) return;
      var it = S.introT;
      var a = clamp(it / 0.5, 0, 1) * clamp((7.1 - it) / 0.4, 0, 1);
      var sx = 480 + (S.f.x - 480) * ZOOM;
      ctx.save();
      ctx.globalAlpha = 0.45 * a; ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a * (0.55 + 0.1 * Math.sin(t * 4));
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(254,249,195,0.75)'); g.addColorStop(1, 'rgba(253,230,138,0.05)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx - 60, 0); ctx.lineTo(sx + 60, 0); ctx.lineTo(sx + 210, H); ctx.lineTo(sx - 210, H); ctx.closePath(); ctx.fill();
      // motas de luz que bajan por el foco
      ctx.fillStyle = '#fef9c3';
      for (var i = 0; i < 14; i++) {
        var py = ((i * 61 + t * 70) % H), px = sx + Math.sin(i * 2.3 + t) * (40 + py * 0.25);
        ctx.globalAlpha = a * 0.6; ctx.beginPath(); ctx.arc(px, py, 2 + (i % 3), 0, PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // ---------- escenario ----------
    function drawBackground(ctx, t) {
      var lugar = def.prueba ? (S.modoAire ? 'cielo' : (S.fk === 'final' ? 'fabrica' : 'caverna')) : (def.lugar || 'caverna');
      if (S.modoAire && lugar !== 'cielo' && !def.prueba) lugar = def.lugar;
      if (art('bgArenaGigantes', ctx, t, { lugar: lugar })) return;
      var g = ctx.createLinearGradient(0, 0, 0, H);
      if (lugar === 'cielo') {
        g.addColorStop(0, '#1e3a8a'); g.addColorStop(0.55, '#60a5fa'); g.addColorStop(1, '#bae6fd');
      } else if (lugar === 'fabrica') {
        g.addColorStop(0, '#1c0a12'); g.addColorStop(0.6, '#4c0519'); g.addColorStop(1, '#7f1d1d');
      } else {
        g.addColorStop(0, '#1c1917'); g.addColorStop(0.6, '#44403c'); g.addColorStop(1, '#78350f');
      }
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (lugar === 'cielo') {
        ctx.globalAlpha = 0.7; ctx.fillStyle = '#ffffff';
        for (var i = 0; i < 6; i++) {
          var cx = ((i * 190 - t * 18) % 1140 + 1140) % 1140 - 90, cy = 80 + (i % 3) * 70;
          circle(ctx, cx, cy, 30, '#ffffff', null); circle(ctx, cx + 34, cy - 10, 36, '#ffffff', null); circle(ctx, cx + 70, cy, 28, '#ffffff', null);
        }
      } else if (lugar === 'fabrica') {
        // agujero del techo con luz
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.moveTo(380, 0); ctx.lineTo(580, 0); ctx.lineTo(700, 470); ctx.lineTo(260, 470); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        for (var k = 0; k < 7; k++) rfill(ctx, k * 150 - 10, 120 + (k % 2) * 40, 40, 360, 6, '#2a0a14', O, 3);
        for (var r = 0; r < 7; r++) circle(ctx, 60 + r * 140, 90, 6, (Math.floor(t * 2 + r) % 2) ? '#ef4444' : '#7f1d1d', null);
      } else {
        ctx.globalAlpha = 0.5;
        for (var j = 0; j < 9; j++) {
          ctx.fillStyle = '#292524';
          ctx.beginPath(); ctx.moveTo(j * 120 - 20, 0); ctx.lineTo(j * 120 + 40, 90 + (j % 3) * 30); ctx.lineTo(j * 120 + 100, 0); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 0.8;
        for (var q = 0; q < 8; q++) circle(ctx, 70 + q * 120, 200 + (q % 3) * 60, 5, (q % 2) ? '#67e8f9' : '#c4b5fd', null);
      }
      ctx.restore();
    }
    function drawFloor(ctx, t) {
      var lugar = def.lugar || 'caverna';
      if (def.prueba) lugar = S.modoAire ? 'cielo' : (S.fk === 'final' ? 'fabrica' : 'caverna');
      var x0 = -420, x1 = 1380, y = GROUND_Y, h = 520;
      ctx.save();
      if (lugar === 'cielo') {
        // el río al pie de la salida de la cueva
        var g = ctx.createLinearGradient(0, y, 0, y + 300);
        g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#0c4a6e');
        ctx.fillStyle = g; ctx.fillRect(x0, y, x1 - x0, h);
        ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 6; ctx.beginPath();
        for (var xx = x0; xx <= x1; xx += 20) {
          var yy = y + Math.sin(xx * 0.03 + t * 3) * 6;
          if (xx === x0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      } else if (lugar === 'fabrica') {
        ctx.fillStyle = '#3f3f46'; ctx.fillRect(x0, y, x1 - x0, h);
        for (var px = x0; px < x1; px += 96) rfill(ctx, px + 3, y + 10, 90, 60, 6, '#52525b', O, 3);
        for (var sx = x0; sx < x1; sx += 48) {
          ctx.fillStyle = (Math.floor((sx - x0) / 48) % 2) ? '#facc15' : '#1f2937';
          ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 48, y); ctx.lineTo(sx + 36, y + 10); ctx.lineTo(sx - 12, y + 10); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      } else {
        ctx.fillStyle = '#57534e'; ctx.fillRect(x0, y, x1 - x0, h);
        ctx.fillStyle = '#78716c'; ctx.fillRect(x0, y, x1 - x0, 16);
        for (var rx = x0; rx < x1; rx += 70) circle(ctx, rx + ((rx * 7) % 30), y + 40 + ((rx * 13) % 50), 10 + (rx % 3) * 4, '#44403c', null);
        ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      }
      ctx.restore();
    }

    // ---------- jefe ----------
    function drawBoss(ctx, t) {
      var b = S.b;
      ctx.save();
      try { if (S.bdef.draw) S.bdef.draw(ctx, b, arena); }
      catch (e) { warnOnce('draw del jefe', e); }
      ctx.restore();
      if (S.modo === 'pelea' || S.modo === 'equipo') {
        // halo amarillo en las zonas débiles a la vista (respaldo de §2.5)
        var z = zones();
        for (var i = 0; i < z.length; i++) {
          if (z[i].tipo !== 'debil') continue;
          ctx.save();
          var pulse = 0.5 + 0.5 * Math.sin(t * 7);
          ctx.globalAlpha = 0.35 + 0.35 * pulse;
          ctx.strokeStyle = '#fde047'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(z[i].x, z[i].y, z[i].r + 8 + pulse * 6, 0, PI * 2); ctx.stroke();
          ctx.restore();
        }
        for (var s = 0; s < S.stuns.length; s++) {
          var st = S.stuns[s], a = 1 - st.t / st.life;
          ctx.save(); ctx.globalAlpha = a;
          ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r + 14, t * 6, t * 6 + PI * 1.4); ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ---------- fusión ----------
    function drawFusionArt(ctx, x, y, scale, facing) {
      var fd = S.fd;
      var o = { scale: scale, facing: facing, look: look() };
      if (art(fd.art, ctx, x, y, o)) return;
      // respaldo: un robot de bloques con los colores de sus pilotos
      var hgt = altoArte(fd.art) * scale, w = hgt * 0.5;
      var top = anclaArte(fd.art) === 'centro' ? y - hgt / 2 : y - hgt;
      ctx.save();
      rfill(ctx, x - w / 2, top + hgt * 0.25, w, hgt * 0.5, 18, '#3b82f6', O, 4);
      rfill(ctx, x - w * 0.3, top, w * 0.6, hgt * 0.25, 14, '#f97316', O, 4);
      rfill(ctx, x - w * 0.45, top + hgt * 0.75, w * 0.35, hgt * 0.25, 10, '#334155', O, 4);
      rfill(ctx, x + w * 0.1, top + hgt * 0.75, w * 0.35, hgt * 0.25, 10, '#334155', O, 4);
      circle(ctx, x + facing * w * 0.15, top + hgt * 0.12, 10, '#a5f3fc', O, 3);
      ctx.restore();
    }
    function drawFusion(ctx, t) {
      var f = S.f, fd = S.fd;
      if (f.hidden || f.pop <= 0.001) return;
      if (S.modo === 'pelea' && f.inv > 0 && f.hurtT <= 0 && Math.floor(f.inv * 14) % 2 === 0) return;
      var sc = fScale();
      var ay = artAnchorY();
      ctx.save();
      // transformaciones alrededor de los pies (las fusiones no tienen pose)
      ctx.translate(f.x, f.y);
      var sx = 1, sy = 1, rot = 0, ox = 0, oy = 0;
      if (S.modoAire) {
        oy += Math.sin(t * 2.4) * 8;
        rot += clamp(f.vx / 240, -1, 1) * 0.08 * f.facing;
      } else if (f.walk > 0 && f.enSuelo) {
        oy -= Math.abs(Math.sin(f.walk * 7)) * 8;
        rot += Math.sin(f.walk * 7) * 0.02;
      }
      if (!f.enSuelo && !S.modoAire) { sy = f.vy < 0 ? 1.06 : 1.0; sx = f.vy < 0 ? 0.95 : 1.0; }
      if (f.land > 0) { var k = f.land / 0.22; sy = 1 - 0.1 * k; sx = 1 + 0.08 * k; }
      if (f.punchT > 0) {
        var pk = 1 - f.punchT / f.punchDur, pw = Math.sin(pk * PI);
        ox += f.facing * (f.step === 3 ? 30 : 16) * pw;
        rot += f.facing * (f.step === 3 ? 0.1 : 0.05) * pw;
      }
      if (f.shield) rot -= f.facing * 0.04;
      if (S.modo === 'derrota') {
        var dk = clamp(f.fallT / 1.4, 0, 1);
        rot -= f.facing * 1.2 * ease(dk);
        oy += 20 * dk;
      }
      if (S.modo === 'victoria' && f.celebra > 0) oy -= Math.abs(Math.sin(f.celebra * 6)) * 26;
      var pop = f.pop;
      ctx.translate(ox, oy);
      ctx.rotate(rot);
      ctx.scale(sx * (0.3 + 0.7 * pop), sy * (0.3 + 0.7 * pop));
      if (S.modo === 'equipo' || (S.modo === 'intro' && pop < 1)) {
        ctx.save();
        ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 16);
        var g = ctx.createRadialGradient(0, -fd.alto * 0.5, 10, 0, -fd.alto * 0.5, fd.alto * 0.75);
        g.addColorStop(0, 'rgba(253,230,138,0.95)'); g.addColorStop(1, 'rgba(253,230,138,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -fd.alto * 0.5, fd.alto * 0.75, 0, PI * 2); ctx.fill();
        ctx.restore();
      }
      drawFusionArt(ctx, 0, ay - f.y, sc, f.facing);
      ctx.restore();
      // destellos de las piezas al disparar
      for (var i = 0; i < S.piezas.length; i++) {
        var p = S.piezas[i];
        if (p.flash > 0 || (S.art && S.art.arma === p.arma && S.art.flash > 0)) {
          var gp = gunPos(p.arma);
          ctx.save(); ctx.globalAlpha = 0.8;
          circle(ctx, gp.x, gp.y, 18, PIEZA[p.arma].color, null);
          circle(ctx, gp.x, gp.y, 8, '#ffffff', null);
          ctx.restore();
        }
      }
      // marca de la pieza del artillero (co-op)
      if (S.coop && S.art && (S.modo === 'pelea')) {
        var ap = gunPos(S.art.arma);
        ctx.save();
        ctx.strokeStyle = S.artJ === 2 ? '#86efac' : '#fde047'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(ap.x, ap.y, 24 + Math.sin(t * 6) * 3, 0, PI * 2); ctx.stroke();
        outlined(ctx, 'J' + S.artJ, ap.x, ap.y - 40, 26, S.artJ === 2 ? '#86efac' : '#fde047');
        if (S.art.label > 0) outlined(ctx, '¡' + PIEZA[S.art.arma].corto + '!', ap.x, ap.y - 76, 30, PIEZA[S.art.arma].color);
        ctx.restore();
      }
      // puñetazo (×2 delante del puño, como jefe2.js)
      if (f.punchT > 0 && f.hitDone && f.punchT > f.punchDur * 0.15) {
        ctx.save();
        var fx = f.x + f.facing * (fd.ancho / 2 + 60), fy = f.y - fd.alto * 0.5;
        ctx.translate(fx, fy); ctx.scale(fd.alto / 140, fd.alto / 140);
        if (!gfx('drawPunch', [ctx, 0, 0, f.facing, 1 - f.punchT / f.punchDur])) star(ctx, 0, 0, 20, '#fde68a');
        ctx.restore();
      }
      if (f.shield) drawShield(ctx, t);
    }
    function drawShield(ctx, t) {
      var f = S.f, fd = S.fd, x = shieldX(), y = f.y - fd.alto * 0.5;
      var hit = f.shieldHit > 0 ? 1 : 0;
      if (fd.escudo === 'peter') {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.3 * hit;
        circle(ctx, x, y, 110, 'rgba(253,224,71,0.35)', null);
        ctx.restore();
        if (art('escudoPeter', ctx, x, y, { variant: look().peter, scale: 2.5 * fd.alto / 330, angle: f.facing * 0.1 + Math.sin(t * 3) * 0.04 })) return;
      }
      // burbuja de energía cian del transformable (terrestre) o respaldo
      ctx.save();
      ctx.translate(x - f.facing * 30, y);
      ctx.scale(f.facing, 1);
      var R = fd.alto * 0.48;
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 10) + 0.3 * hit;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.arc(0, 0, R, -PI / 2, PI / 2); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(0, 0, R, -PI / 2, PI / 2); ctx.stroke();
      // celdas hexagonales suaves
      ctx.globalAlpha = 0.45; ctx.lineWidth = 2.5; ctx.strokeStyle = '#e0f2fe';
      for (var row = -3; row <= 3; row++) {
        for (var col = 0; col < 3; col++) {
          var hx = 22 + col * 34 + (row % 2 ? 17 : 0), hy = row * 30;
          if (hx * hx + hy * hy > (R - 18) * (R - 18)) continue;
          ctx.beginPath();
          for (var k = 0; k < 6; k++) {
            var a = k * PI / 3, px = hx + Math.cos(a) * 15, py = hy + Math.sin(a) * 15;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ---------- intro (dibujo en el mundo) ----------
    function drawVeh(ctx, kind, x, y, s, facing, extra) {
      var lk = look(), vv = veh(), ok = false;
      extra = extra || {};
      if (kind === 'moto') ok = art('robotMoto', ctx, x, y, { variant: lk.moto, modo: extra.modo || 'moto', scale: s, facing: facing, boost: true, look: lk });
      else if (kind === 'coche') ok = art('transformableCoche', ctx, x, y, { variant: vv.transformable, scale: s, facing: facing, boost: true });
      else if (kind === 'sub') ok = art('submarinoNave', ctx, x, y, { variant: lk.sub, modo: 'nave', scale: s, facing: facing, estela: true, look: lk });
      else if (kind === 'halcon') ok = art('mechaHalcon', ctx, x, y, { variant: vv.mechahalcon, modo: 'vuelo', scale: s, facing: facing });
      if (!ok) {
        var col = { moto: '#f97316', coche: '#3b82f6', sub: '#facc15', halcon: '#22c55e' }[kind] || '#94a3b8';
        rfill(ctx, x - 60 * s, y - 50 * s, 120 * s, 50 * s, 16 * s, col, O, 3);
      }
    }
    function drawIntroWorld(ctx, t) {
      var f = S.f, it = S.introT;
      if (S.introKind === 'short') return;
      if (S.fk === 'final') { drawIntroFinal(ctx, t, it); return; }
      // pareja: los dos vehículos llegan, saltan, brillan y se juntan
      if (it >= 3.05) return;
      var meetX = f.x, meetY = S.modoAire ? f.y - S.fd.alto * 0.5 : f.y - S.fd.alto * 0.45;
      var kinds = S.fk === 'terrestre' ? ['moto', 'coche'] : ['sub', 'halcon'];
      var names = S.fk === 'terrestre' ? ['¡Robot-moto!', '¡Robot transformable!'] : ['¡Submarino-nave!', '¡Mecha-halcón!'];
      for (var i = 0; i < 2; i++) {
        var dir = i === 0 ? 1 : -1;
        var sx = i === 0 ? -420 : 1300, gx = f.x + (i === 0 ? -170 : 220);
        var x, y, s = S.fk === 'terrestre' ? 1.7 : 1.5;
        var baseY = S.modoAire ? (i === 0 ? 320 : 180) : GROUND_Y;
        if (it < 1.5) { var k = easeOut(it / 1.5); x = lerp(sx, gx, k); y = baseY; }
        else {
          var k2 = ease((it - 1.5) / 1.4);
          x = lerp(gx, meetX, k2);
          y = lerp(baseY, meetY, k2) - Math.sin(k2 * PI) * 160;
        }
        var shrink = it > 2.4 ? 1 - 0.5 * ease((it - 2.4) / 0.6) : 1;
        ctx.save();
        if (it > 1.5) {
          ctx.globalAlpha = 0.6 * clamp((it - 1.5) / 1.0, 0, 1);
          var col = i === 0 ? '#fde68a' : '#a5f3fc';
          circle(ctx, x, S.modoAire || kinds[i] === 'sub' || kinds[i] === 'halcon' ? y : y - 50, 110 * shrink, col, null);
          ctx.globalAlpha = 1;
        }
        drawVeh(ctx, kinds[i], x, y, s * shrink, dir);
        ctx.restore();
        if (it > 0.5 && it < 2.2) {
          ctx.save();
          ctx.globalAlpha = clamp((it - 0.5) * 3, 0, 1) * clamp((2.2 - it) * 3, 0, 1);
          outlined(ctx, names[i], x, (S.modoAire ? y - 110 : y - 200), 34, i === 0 ? '#fdba74' : '#93c5fd');
          ctx.restore();
        }
      }
    }
    function drawIntroFinal(ctx, t, it) {
      var f = S.f;
      if (it >= 6.85) return;
      // Dark Secuaz bueno baja del cielo y se coloca como cuerpo
      var dk = easeOut(clamp(it / 1.8, 0, 1));
      var sy = lerp(-700, GROUND_Y, dk);
      var glow = it > 6.0 ? (it - 6.0) / 0.8 : 0;
      ctx.save();
      if (it < 1.8) {
        // chorros de los pies
        ctx.globalAlpha = 0.8;
        for (var j = -1; j <= 1; j += 2) {
          var fl = ctx.createLinearGradient(0, sy, 0, sy + 120);
          fl.addColorStop(0, '#fde68a'); fl.addColorStop(1, 'rgba(249,115,22,0)');
          ctx.fillStyle = fl;
          ctx.beginPath(); ctx.moveTo(f.x + j * 40 - 18, sy); ctx.lineTo(f.x + j * 40 + 18, sy); ctx.lineTo(f.x + j * 40, sy + 110 + Math.random() * 30); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (glow > 0) {
        ctx.globalAlpha = Math.min(0.85, glow);
        circle(ctx, f.x, GROUND_Y - 210, 240 * (0.6 + glow), 'rgba(253,230,138,0.6)', null);
        ctx.globalAlpha = 1;
      }
      if (!art('secuaz', ctx, f.x, sy, { scale: 1.75, good: true })) {
        rfill(ctx, f.x - 70, sy - 330, 140, 330, 30, '#16a34a', O, 4);
      }
      ctx.restore();
      // los 4 vehículos llegan volando uno a uno a su sitio
      var V = finalVeh();
      for (var i = 0; i < V.length; i++) {
        var t0 = 2.0 + i * 1.1;
        if (it < t0) continue;
        var k = ease(clamp((it - t0) / 0.75, 0, 1));
        var sp = finalSpot(V[i]);
        var x = lerp(V[i].from[0], sp.x, k), y = lerp(V[i].from[1], sp.y, k) - Math.sin(k * PI) * 120;
        var sc = { moto: 1.0, coche: 0.95, sub: 0.95, halcon: 0.9 }[V[i].kind];
        var yy = y;
        if (V[i].kind === 'moto' || V[i].kind === 'coche') yy = y + 40 * sc;   // se anclan en los pies
        ctx.save();
        if (k >= 1) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 10 + i); circle(ctx, sp.x, sp.y, 70, V[i].color, null); ctx.globalAlpha = 1; }
        drawVeh(ctx, V[i].kind, x, yy, sc, V[i].from[0] < 480 ? 1 : -1, { modo: 'moto' });
        ctx.restore();
        if (k < 1) {
          ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = V[i].color; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(x - (sp.x - V[i].from[0]) * 0.15, y - (sp.y - V[i].from[1]) * 0.15); ctx.lineTo(x, y); ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ---------- proyectiles y efectos ----------
    // Los avisos van en dos pasadas: la sombra en el suelo (debajo de todo) y, después del jefe y
    // de la fusión, el borde rojo y el "!" (si no, los cuerpos grandes tapan justo el aviso que importa).
    function drawWarnsSuelo(ctx, t) {
      for (var i = 0; i < S.warns.length; i++) {
        var w = S.warns[i], k = clamp(w.t / w.life, 0, 1);
        ctx.save();
        if (!art('sombraAviso', ctx, w.x, w.y, { r: w.r, t01: k })) {
          ctx.globalAlpha = 0.35 + 0.35 * (Math.floor(w.t * 8) % 2);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.ellipse(w.x, w.y - 2, w.r * (0.5 + 0.5 * k), w.r * 0.28 * (0.5 + 0.5 * k), 0, 0, PI * 2); ctx.fill();
          ctx.globalAlpha = 1; ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(w.x, w.y - 2, w.r, w.r * 0.28, 0, 0, PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
    }
    var WARN_MAX_SY = H - 95;           // en pantalla, por encima de la barra del jefe (nombre en y ≈ 472)
    function drawWarnsMarcas(ctx, t) {
      if (!S.warns.length) return;
      var f = S.f, fd = S.fd;
      // la y del mundo que cae en WARN_MAX_SY de la pantalla (cámara: zoom alrededor de (480, GROUND_Y) y camDY)
      var yMax = GROUND_Y + (WARN_MAX_SY - GROUND_Y) / ZOOM - S.camDY;
      for (var i = 0; i < S.warns.length; i++) {
        var w = S.warns[i];
        // solo se levanta si la barra del jefe (x ≈ 200–760 en pantalla) lo taparía
        var sx = 480 + (w.x - 480) * ZOOM, bajoBarra = sx > 200 - w.r * ZOOM && sx < 760 + w.r * ZOOM;
        var wy = bajoBarra ? Math.min(w.y, yMax) : w.y, alzado = wy < w.y - 1;
        // el borde, otra vez y encima (alfa 0,8): se ve aunque la sombra quede bajo un cuerpo o bajo la barra
        ctx.save();
        ctx.globalAlpha = 0.8 * (0.6 + 0.4 * Math.abs(Math.sin(t * 9)));
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = alzado ? 5 : 3;
        if (alzado) ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.ellipse(w.x, wy, w.r, w.r * 0.3, 0, 0, PI * 2); ctx.stroke();
        ctx.restore();
        // el "!": encima de la sombra; en el aire, si la fusión está encima, por encima de su cabeza
        var ey = wy - 60;
        if (S.modoAire && Math.abs(w.x - f.x) < fd.ancho * 0.5 + 70 && ey > f.y - fd.alto - 30 && ey < f.y + 30) {
          ey = f.y - fd.alto - 40;
          if (ey < SAFE_TOP + 10) ey = f.y + 70;        // la fusión toca el techo: el "!" va bajo sus pies
        }
        ctx.save();
        ctx.translate(w.x, ey - Math.abs(Math.sin(t * 8)) * 10);
        ctx.scale(1.6, 1.6);
        if (!gfx('drawExclamation', [ctx, 0, 0])) outlined(ctx, '!', 0, 0, 34, '#fde047');
        ctx.restore();
      }
    }
    function drawWaves(ctx, t) {
      for (var i = 0; i < S.waves.length; i++) {
        var w = S.waves[i];
        ctx.save();
        ctx.translate(w.x, GROUND_Y);
        ctx.scale(w.dir, 1);
        ctx.fillStyle = '#a16207';
        ctx.beginPath(); ctx.moveTo(-60, 0); ctx.quadraticCurveTo(-20, -w.alto * 1.6, 20, -w.alto * 1.2);
        ctx.quadraticCurveTo(40, -w.alto * 0.6, 50, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.stroke();
        for (var k = 0; k < 4; k++) circle(ctx, -30 + k * 18, -w.alto * (1.3 + 0.4 * Math.sin(t * 12 + k)), 6, '#78716c', O, 2);
        ctx.restore();
      }
    }
    function drawMinions(ctx, t) {
      for (var i = 0; i < S.minions.length; i++) {
        var m = S.minions[i];
        if (m.fase === 'aviso') continue;
        ctx.save();
        if (m.dead) {
          var k = clamp(m.t / 0.4, 0, 1);
          if (!art('chispasPop', ctx, m.x, m.y, { t01: k, scale: 1.2 })) gfx('drawExplosion', [ctx, m.x, m.y, k, 40]);
          ctx.restore();
          continue;
        }
        if (m.fase === 'cae') {
          ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(m.x, m.y - 30); ctx.lineTo(m.x, m.y - 110); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.translate(m.x, m.y); ctx.rotate(0.35); ctx.translate(-m.x, -m.y);
        }
        var ok = m.kind === 'miniDron'
          ? art('dronEnjambre', ctx, m.x, m.y, { scale: 1.0, facing: m.facing })
          : art('miniRobot', ctx, m.x, m.y, { scale: 1.0, facing: m.facing, t: t });
        if (!ok) { circle(ctx, m.x, m.y, 18, '#475569', O, 3); circle(ctx, m.x + 5 * m.facing, m.y - 3, 5, '#f87171', null); }
        if (m.stun > 0) { ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(m.x, m.y, 28, 0, PI * 2); ctx.stroke(); }
        ctx.restore();
      }
    }
    function drawShots(ctx, t) {
      for (var i = 0; i < S.shots.length; i++) {
        var s = S.shots[i];
        ctx.save();
        if (s.kind === 'roca') {
          if (!art('roca', ctx, s.x, s.y, { r: s.r, t: t, rot: s.rot })) {
            ctx.translate(s.x, s.y); ctx.rotate(s.rot);
            ctx.beginPath();
            for (var k = 0; k < 7; k++) { var a = k * PI * 2 / 7, rr = s.r * (0.8 + 0.25 * ((k * 37) % 3) / 2); if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
            ctx.closePath(); ctx.fillStyle = '#78716c'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.stroke();
          }
        } else if (s.kind === 'sierra') {
          ctx.translate(s.x, s.y); ctx.rotate(s.rot * 2);
          ctx.beginPath();
          var n = 14;
          for (var j = 0; j < n * 2; j++) { var aa = j * PI / n, r2 = j % 2 ? s.r * 0.78 : s.r; if (j === 0) ctx.moveTo(Math.cos(aa) * r2, Math.sin(aa) * r2); else ctx.lineTo(Math.cos(aa) * r2, Math.sin(aa) * r2); }
          ctx.closePath(); ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.stroke();
          circle(ctx, 0, 0, s.r * 0.3, '#64748b', O, 2);
        } else if (s.kind === 'bomba') {
          circle(ctx, s.x, s.y, s.r, '#1f2937', O, 3);
          circle(ctx, s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.25, '#6b7280', null);
          circle(ctx, s.x, s.y - s.r - 4, 5, (Math.floor(t * 10) % 2) ? '#fde047' : '#ef4444', null);
        } else {
          ctx.globalAlpha = 0.4;
          circle(ctx, s.x - s.vx * 0.03, s.y - s.vy * 0.03, s.r * 0.9, '#f87171', null);
          ctx.globalAlpha = 1;
          var g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r);
          g.addColorStop(0, '#fff1f2'); g.addColorStop(0.5, '#ef4444'); g.addColorStop(1, '#7f1d1d');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, PI * 2); ctx.fill();
          ctx.strokeStyle = O; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();
      }
    }
    function drawBeams(ctx, t) {
      for (var i = 0; i < S.beams.length; i++) {
        var b = S.beams[i], a = clamp(1 - b.t / b.life, 0, 1);
        var x2 = b.x2;
        if (b.cut !== null && b.cut !== undefined) x2 = b.cut;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = b.ancho * 2;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y); ctx.lineTo(x2, b.y); ctx.stroke();
        ctx.globalAlpha = a; ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = b.ancho;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y); ctx.lineTo(x2, b.y); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = b.ancho * 0.3;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y); ctx.lineTo(x2, b.y); ctx.stroke();
        if (b.cut !== null && b.cut !== undefined) circle(ctx, x2, b.y, b.ancho * 1.2, 'rgba(165,243,252,0.85)', null);
        ctx.restore();
      }
    }
    function drawAllyBeams(ctx, t) {
      for (var i = 0; i < S.allyBeams.length; i++) {
        var b = S.allyBeams[i], a = clamp(1 - b.t / b.life, 0, 1);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = b.col; ctx.lineWidth = 30;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.globalAlpha = a; ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        circle(ctx, b.x2, b.y2, 26 * a + 6, 'rgba(165,243,252,0.8)', null);
        ctx.restore();
      }
    }
    function drawAlly(ctx, t) {
      for (var i = 0; i < S.ally.length; i++) {
        var p = S.ally[i], ang = Math.atan2(p.vy, p.vx);
        ctx.save();
        if (p.arma === 'lanzadores') {
          if (!art('bolaEnergiaJuego', ctx, p.x, p.y, { tipo: 'pistola', angle: ang, scale: 1.9, t: t })) {
            ctx.globalAlpha = 0.4; circle(ctx, p.x, p.y, 20, '#60a5fa', null); ctx.globalAlpha = 1;
            circle(ctx, p.x, p.y, 11, '#3b82f6', O, 2); circle(ctx, p.x, p.y, 5, '#dbeafe', null);
          }
        } else if (p.arma === 'plumas') {
          ctx.translate(p.x, p.y); ctx.rotate(ang);
          ctx.fillStyle = '#4ade80';
          ctx.beginPath(); ctx.moveTo(22, 0); ctx.quadraticCurveTo(0, -12, -22, -4); ctx.lineTo(-16, 0); ctx.lineTo(-22, 4); ctx.quadraticCurveTo(0, 12, 22, 0); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = O; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.strokeStyle = '#f0fdf4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-18, 0); ctx.stroke();
        } else if (p.arma === 'escudo') {
          if (!art('escudoPeter', ctx, p.x, p.y, { variant: look().peter, scale: 1.5, angle: p.spin || 0 })) {
            circle(ctx, p.x, p.y, 28, '#22c55e', O, 3); circle(ctx, p.x, p.y, 10, '#1f2937', O, 2);
          }
        }
        ctx.restore();
      }
    }
    function drawTeamBeam(ctx, t) {
      var e = S.eq, f = S.f;
      if (!e || e.t < 0.5) return;
      var aim = e.zona || e.aim;
      if (!aim) return;
      var c = chestPos();
      var k = clamp((e.t - 0.5) / 0.3, 0, 1) * clamp((2.5 - e.t) / 0.5, 0, 1);
      var cols = S.fk === 'final' ? ['#3b82f6', '#22d3ee', '#4ade80', '#facc15', '#f97316'] : ['#3b82f6', '#22d3ee', '#4ade80', '#facc15'];
      var ang = Math.atan2(aim.y - c.y, aim.x - c.x), len = Math.sqrt((aim.x - c.x) * (aim.x - c.x) + (aim.y - c.y) * (aim.y - c.y));
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(ang);
      var wid = (90 + Math.sin(t * 30) * 8) * k;
      ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#ffffff';
      rfill(ctx, 0, -wid * 0.8, len + 40, wid * 1.6, wid * 0.8, '#fef9c3', null);
      ctx.globalAlpha = 0.95;
      for (var i = 0; i < cols.length; i++) {
        var bw = wid / cols.length, y0 = -wid / 2 + i * bw + Math.sin(t * 20 + i) * 3;
        ctx.fillStyle = cols[i]; ctx.fillRect(0, y0, len, bw + 1);
      }
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9 * k;
      ctx.fillRect(0, -wid * 0.08, len, wid * 0.16);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = k;
      circle(ctx, c.x, c.y, 50 * k + 10, 'rgba(255,255,255,0.85)', null);
      circle(ctx, aim.x, aim.y, 90 * k + 10, 'rgba(253,230,138,0.7)', null);
      for (var s = 0; s < 6; s++) star(ctx, aim.x + Math.cos(t * 5 + s) * 110 * k, aim.y + Math.sin(t * 5 + s) * 110 * k, 14, cols[s % cols.length]);
      ctx.restore();
    }
    function drawParts(ctx) {
      for (var i = 0; i < S.parts.length; i++) {
        var p = S.parts[i], a = clamp(1 - p.t / p.life, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        if (p.kind === 'clink') {
          ctx.strokeStyle = p.color; ctx.lineWidth = 4;
          var r = p.r * 2.5;
          ctx.beginPath(); ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r); ctx.stroke();
        } else if (p.kind === 'star') {
          star(ctx, p.x, p.y, p.r * 2.2, p.color);
        } else if (p.kind === 'tuerca') {
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color; ctx.beginPath();
          for (var k = 0; k < 6; k++) { var aa = k * PI / 3; if (k === 0) ctx.moveTo(Math.cos(aa) * 7, Math.sin(aa) * 7); else ctx.lineTo(Math.cos(aa) * 7, Math.sin(aa) * 7); }
          ctx.closePath(); ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 1.5; ctx.stroke();
          circle(ctx, 0, 0, 2.5, '#475569', null);
        } else if (p.kind === 'confeti') {
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color; ctx.fillRect(-6, -3, 12, 6);
        } else {
          circle(ctx, p.x, p.y, p.r * 1.5 * a + 0.5, p.color, null);
        }
        ctx.restore();
      }
    }
    function drawTexts(ctx) {
      for (var i = 0; i < S.texts.length; i++) {
        var tx = S.texts[i];
        ctx.save();
        ctx.globalAlpha = clamp(1.6 - (tx.t / tx.life) * 1.6, 0, 1);
        var s = 1 + Math.max(0, 0.25 - tx.t) * 1.2;
        ctx.translate(tx.x, tx.y); ctx.scale(s, s);
        outlined(ctx, tx.text, 0, 0, tx.size, tx.color);
        ctx.restore();
      }
    }

    // ---------- HUD ----------
    function drawHUD(ctx, t) {
      if (G.ui && G.ui.drawHearts) { try { G.ui.drawHearts(ctx); } catch (e) { /* nada */ } }
      var fighting = S.modo === 'pelea' || S.modo === 'equipo';
      if ((fighting || S.modo === 'derrota' || (S.modo === 'intro' && S.introT >= introLen())) && S.b && G.ui && G.ui.drawBossBar) {
        try { G.ui.drawBossBar(ctx, clamp(S.b.hp / (S.b.maxHp || 1), 0, 1), S.bName); } catch (e) { /* nada */ }
      }
      if (S.modo === 'intro' && S.introT < introLen()) return;
      drawTeamBar(ctx, t);
      drawPilotHud(ctx, t);
      if (S.coop && S.art) drawArtHud(ctx, t);
      hintAlpha = 1;
      var hint = currentHint();
      if (hint && G.ui && G.ui.hint && hintAlpha > 0.02) {
        var nota = coopNota(), pos = hintPlace(ctx, hint, !!nota);
        // la caja va en su sitio con opts.y (no con translate), para que opts.evitar se compare en
        // px de pantalla: si aun así tapa la cabeza de la fusión (o la del jefe mientras avisa),
        // G.ui.hint la aclara (alfa 0,35); si no, vale el 0,6 de hintPlace cuando tapa otras cosas
        // (sin juntar los dos, que a 0,21 no se leería)
        var ev = hintEvitar(), tapaCabeza = false;
        for (var i = 0; i < ev.length; i++) {
          var e = ev[i];
          if (e.x < pos.r.x1 && e.x + e.w > pos.r.x0 && e.y < pos.r.y1 && e.y + e.h > pos.r.y0) { tapaCabeza = true; break; }
        }
        S.hintEv = ev;
        ctx.save(); ctx.globalAlpha = hintAlpha * (tapaCabeza ? 1 : pos.alpha);
        try { S.hintBox = G.ui.hint(ctx, hint, { cara: 'secuaz', nota: nota, y: 64 + pos.dy, evitar: ev }) || null; } catch (e2) { S.hintBox = null; }
        ctx.restore();
      } else { S.hintDYv = null; S.hintBox = null; }
    }
    // ---------- dónde va la caja de pistas ----------
    // G.ui.hint la dibuja arriba (borde superior en y = 64). Cuando la fusión voladora, Robovill volando
    // o la línea del rayo pasan por ahí, se baja (como hintDY de rio.js) al hueco que menos tape:
    // al medio o justo encima de la barra del jefe. Las cabezas cuentan doble. Si todo tapa, se aclara.
    function toScreen(x, y) { return { x: 480 + (x - 480) * ZOOM, y: GROUND_Y + (y - GROUND_Y + S.camDY) * ZOOM }; }
    function scrRect(x0, y0, x1, y1) {
      var a = toScreen(x0, y0), b = toScreen(x1, y1);
      return { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) };
    }
    function areaInter(r, q) {
      var w = Math.min(r.x1, q.x1) - Math.max(r.x0, q.x0), h = Math.min(r.y1, q.y1) - Math.max(r.y0, q.y0);
      return (w > 0 && h > 0) ? w * h : 0;
    }
    function hintObstacles() {
      var L = [], f = S.f, fd = S.fd;
      if (f) {
        var fx0 = f.x - fd.ancho * 0.6, fx1 = f.x + fd.ancho * 0.6, top = f.y - fd.alto;
        L.push({ r: scrRect(fx0, top - 20, fx1, top + fd.alto * 0.4), w: 2 });          // cabeza (y lo de arriba)
        L.push({ r: scrRect(fx0, top + fd.alto * 0.4, fx1, f.y), w: 1 });
      }
      var b = S.b;
      if (b && S.modo !== 'victoria') {
        var bh = num(b.alto, 300), bw = bh * 0.4, bt = num(b.y, GROUND_Y) - bh;
        L.push({ r: scrRect(b.x - bw, bt - 20, b.x + bw, bt + bh * 0.4), w: 2 });
        L.push({ r: scrRect(b.x - bw, bt + bh * 0.4, b.x + bw, num(b.y, GROUND_Y)), w: 1 });
        // la línea del aviso del rayo (la Nodriza la guarda en b.rayoY)
        if (b.ataque === 'rayo' && (b.estado === 'aviso' || b.estado === 'golpe') && isFinite(b.rayoY)) {
          L.push({ r: scrRect(A_L - 300, b.rayoY - 40, A_R + 300, b.rayoY + 40), w: 3 });
        }
      }
      for (var i = 0; i < S.beams.length; i++) L.push({ r: scrRect(A_L - 300, S.beams[i].y - 40, A_R + 300, S.beams[i].y + 40), w: 3 });
      // los avisos del suelo (su borde y su "!", ya levantados sobre la barra del jefe): lo que MÁS importa ver
      var yMax = GROUND_Y + (WARN_MAX_SY - GROUND_Y) / ZOOM - S.camDY;
      for (var k = 0; k < S.warns.length; k++) {
        var w = S.warns[k], wy = Math.min(w.y, yMax);
        L.push({ r: scrRect(w.x - w.r, wy - 110, w.x + w.r, wy + w.r * 0.3), w: 4 });
      }
      return L;
    }
    function hintPlace(ctx, txt, conNota) {
      // tamaño de la caja, calculado como G.ui.hint (texto de 20 px envuelto a ≈ 372 px, 25 px por línea)
      var tw = 300;
      try { ctx.save(); ctx.font = 'bold 20px system-ui, "Segoe UI", Arial, sans-serif'; tw = ctx.measureText(String(txt)).width; ctx.restore(); } catch (e) { tw = 600; }
      var lines = Math.max(1, Math.ceil(tw / 330));
      var boxH = Math.max(64, lines * 25 + 28 + (conNota ? 21 : 0));
      var boxW = Math.min(460, (lines > 1 ? 372 : tw) + 88), bx0 = 480 - boxW / 2;
      var obs = hintObstacles();
      // candidatas: arriba (la de siempre), al medio y justo encima del nombre de la barra del jefe (y ≈ 462)
      var cands = [0, Math.max(0, 300 - 64 - boxH / 2), Math.max(0, 452 - boxH - 64)];
      var best = 0, bestS = Infinity;
      for (var c = 0; c < cands.length; c++) {
        var r = { x0: bx0, y0: 64 + cands[c], x1: bx0 + boxW, y1: 64 + cands[c] + boxH }, sc = 0;
        for (var i = 0; i < obs.length; i++) sc += areaInter(r, obs[i].r) * obs[i].w;
        // la de arriba gana los empates (y un poco más, para que no salte de sitio por nada)
        if (c > 0) sc = sc * 1.15 + 400;
        if (sc < bestS) { bestS = sc; best = cands[c]; }
      }
      // se mueve suave (sin saltos) hacia su sitio
      var cur = (S.hintDYv === null || S.hintDYv === undefined) ? best : S.hintDYv;
      cur += (best - cur) * 0.2;
      if (Math.abs(best - cur) < 0.5) cur = best;
      S.hintDYv = cur;
      return { dy: cur, alpha: bestS > 2500 ? 0.6 : 1, r: { x0: bx0, y0: 64 + cur, x1: bx0 + boxW, y1: 64 + cur + boxH } };
    }
    // lo que la burbuja NO debe tapar (opts.evitar de G.ui.hint, en px de pantalla): la cabeza de la
    // fusión siempre (salta hacia arriba con la onda y la embestida) y la del jefe mientras avisa o golpea
    function hintEvitar() {
      var L = [], f = S.f, fd = S.fd;
      if (f && fd) {
        var top = f.y - fd.alto;
        var r = scrRect(f.x - fd.ancho * 0.4, top - 10, f.x + fd.ancho * 0.4, top + fd.alto * 0.3);
        L.push({ x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0 });
      }
      var b = S.b;
      if (b && S.modo === 'pelea' && (b.estado === 'aviso' || b.estado === 'golpe')) {
        var bh = num(b.alto, 300), bw = bh * 0.3, bt = num(b.y, GROUND_Y) - bh;
        var q = scrRect(b.x - bw, bt - 10, b.x + bw, bt + bh * 0.3);
        L.push({ x: q.x0, y: q.y0, w: q.x1 - q.x0, h: q.y1 - q.y0 });
      }
      return L;
    }
    // la nota de teclas del co-op solo los primeros 6 s de la pelea; después, opts.nota = false
    // (la burbuja es más baja y tapa menos; las teclas ya están en el HUD de cada jugador)
    function coopNota() {
      if (!S.coop) return undefined;
      if (num(S.fightT, 0) >= 6) return false;
      var p = 'J' + S.pilotJ + ' (piloto): ' + conTeclas('{ataque} puño · {disparo} escudo · {cambio} equipo', S.pilotJ);
      var a = 'J' + S.artJ + ': ' + conTeclas(S.fk === 'final' ? '{ataque} disparar · {cambio} arma' : '{ataque} o {disparo} disparar', S.artJ);
      return p + ' | ' + a;
    }
    function drawTeamBar(ctx, t) {
      var x = 340, y = 12, w = 280, h = 22, full = S.barra >= 1;
      ctx.save();
      // caras del equipo (las piezas de la fusión) a la izquierda
      var hs = S.fd.heroes;
      for (var i = 0; i < hs.length; i++) {
        var cx = x - 16 - (hs.length - 1 - i) * 24, cy = y + h / 2;
        if (!art('caraHeroe', ctx, cx, cy, { quien: hs[i], size: 22 })) {
          var col = (G.p3 && G.p3.heroColor) ? G.p3.heroColor(hs[i]) : '#e5e7eb';
          circle(ctx, cx, cy, 11, col, O, 2);
          outlined(ctx, hs[i].charAt(0).toUpperCase(), cx, cy + 1, 12, '#ffffff', O, 2);
        }
      }
      if (S.fk === 'final') drawSecuazFace(ctx, x - 16 - hs.length * 24, y + h / 2, 11);
      if (full) {
        ctx.save(); ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 9);
        rfill(ctx, x - 6, y - 6, w + 12, h + 12, 14, '#fde68a', null);
        ctx.restore();
      }
      rfill(ctx, x, y, w, h, 10, 'rgba(15,10,25,0.85)', null);
      if (S.barra > 0) {
        var g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, '#3b82f6'); g.addColorStop(0.35, '#22d3ee'); g.addColorStop(0.7, '#4ade80'); g.addColorStop(1, '#facc15');
        ctx.fillStyle = g; rrect(ctx, x + 2, y + 2, Math.max(4, (w - 4) * S.barra), h - 4, 8); ctx.fill();
      }
      rfill(ctx, x, y, w, h, 10, null, full ? '#fde68a' : O, 3);
      var label = full ? (tactilFusion() ? '¡LISTO! · PULSA ¡EQUIPO!' : conTeclas('¡EQUIPO LISTO! · {cambio}', S.pilotJ)) : 'BARRA DE EQUIPO';
      outlined(ctx, label, x + w / 2, y + h / 2 + 1, 14, full ? '#fffbeb' : '#e0f2fe', O, 3);
      ctx.restore();
    }
    function drawPilotHud(ctx, t) {
      // el HUD de cada jugador va en SU lado, debajo de sus corazones: J1 a la izquierda, J2 a la derecha
      var bw = 176, bh = 16, der = S.coop && S.pilotJ === 2;
      var f = S.f, x = der ? W - 16 - bw : 16, y = S.coop ? 100 : 54;
      ctx.save();
      var pil = (NOMBRE_CORTO[S.piloto] || '');
      var who = S.coop ? ('PILOTO J' + S.pilotJ + (S.fk === 'final' && pil ? ' · ' + pil : '')) : (S.fk === 'final' && pil ? 'PILOTO: ' + pil : 'PILOTO');
      var tx = der ? x + bw : x;
      ctx.font = 'bold 12px ' + FONT; ctx.textAlign = der ? 'right' : 'left'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = O; ctx.strokeText(who, tx, y);
      ctx.fillStyle = '#fef3c7'; ctx.fillText(who, tx, y);
      var by = y + 9;
      rfill(ctx, x, by, bw, bh, 7, 'rgba(15,10,25,0.82)', null);
      if (f.shieldE > 0) rfill(ctx, x + 1, by + 1, Math.max(2, (bw - 2) * f.shieldE), bh - 2, 6, f.shieldLock ? '#94a3b8' : (S.fd.escudo === 'peter' ? '#eab308' : '#0891b2'), null);
      rfill(ctx, x, by, bw, bh, 7, null, O, 2);
      var nom = S.fd.escudo === 'peter' ? 'ESCUDO' : 'ESCUDO DE ENERGÍA';
      outlined(ctx, nom + ' · ' + conTeclas('{disparo}', S.pilotJ), x + bw / 2, by + bh / 2 + 1, 11, '#fef3c7', O, 3);
      ctx.restore();
    }
    function drawArtHud(ctx, t) {
      var bw = 176, bh = 16, der = S.artJ === 2;
      var A = S.art, x = der ? W - 16 - bw : 16, y = 100;
      var P = PIEZA[A.arma];
      ctx.save();
      // lo que DISPARA (el escudo-bumerán), para no confundirlo con el escudo del piloto ("ESCUDO · L")
      var who = 'ARTILLERO J' + S.artJ + ' · ' + (P.tiro || P.corto);
      var tx = der ? x + bw : x;
      ctx.font = 'bold 12px ' + FONT; ctx.textAlign = der ? 'right' : 'left'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = O; ctx.strokeText(who, tx, y);
      ctx.fillStyle = '#fef3c7'; ctx.fillText(who, tx, y);
      var by = y + 9, fr = 1 - clamp(A.cd / P.cadArt, 0, 1);
      rfill(ctx, x, by, bw, bh, 7, 'rgba(15,10,25,0.82)', null);
      if (fr > 0) rfill(ctx, x + 1, by + 1, Math.max(2, (bw - 2) * fr), bh - 2, 6, fr >= 1 ? P.color : '#475569', null);
      rfill(ctx, x, by, bw, bh, 7, null, O, 2);
      var keys = S.fk === 'final' ? conTeclas('{ataque} · {cambio} cambia', S.artJ) : conTeclas('{ataque} / {disparo}', S.artJ);
      outlined(ctx, keys, x + bw / 2, by + bh / 2 + 1, 11, '#fef3c7', O, 3);
      ctx.restore();
    }
    var hintAlpha = 1;
    // la pista del jefe se ve 5 s cada vez que cambia (y 3 s de recordatorio cada 20 s):
    // así no tapa la cabeza de la fusión ni la de Robovill durante toda la pelea.
    // Se sigue en update (y también en render, por si acaso) para que el tiempo cuente desde que cambia.
    function trackHint() {
      if (!S || !S.b || !S.bdef) return;
      var h = null;
      try { h = S.bdef.hint ? S.bdef.hint(S.b, arena) : null; } catch (e) { h = null; }
      if (!h) { S.hintTxt = null; return; }
      var ft = num(S.fightT, 0);
      if (h !== S.hintTxt || !(num(S.hintT0, ft) <= ft)) {
        // la primera vez que sale un texto, 5 s; si ya se vio (los avisos se repiten cada ronda), 2,5 s:
        // el "!" y el ataque ya avisan, y la caja no tapa al jefe toda la pelea
        S.hintTxt = h; S.hintT0 = ft;
        if (!S.hintSeen) S.hintSeen = {};
        S.hintDur = S.hintSeen[h] ? 2.5 : 5; S.hintSeen[h] = true;
      }
    }
    function currentHint() {
      if (S.modo === 'victoria' || S.modo === 'derrota' || S.modo === 'equipo') return null;
      if (S.pista && S.pista.text) return conTeclas(S.pista.text, S.pilotJ);
      if (S.barraPista && S.barraPista.text) return S.barraPista.text;
      if (S.modo !== 'pelea') return null;
      if (S.primera && S.fightT < 6) {
        if (S.modoAire) return conTeclas('Flechas: volar · {ataque}: puñetazo · mantén {disparo}: escudo · ¡llena la barra de equipo!', S.pilotJ);
        if (S.fk === 'final') return conTeclas('{ataque}: puñetazos de Dark Secuaz · {salto}: doble salto · mantén {disparo}: escudo de Peter', S.pilotJ);
        return conTeclas('{ataque}: puñetazo · {salto}: saltar · mantén {disparo}: escudo de energía · ¡las piezas disparan solas!', S.pilotJ);
      }
      trackHint();
      var h = S.hintTxt;
      if (!h) return null;
      var ft = num(S.fightT, 0);
      var el = Math.max(0, ft - num(S.hintT0, ft)), c, dur, d0 = num(S.hintDur, 5);
      if (el < d0) { c = el; dur = d0; }
      else { c = (el - d0) % 20 - 17; dur = 3; if (c < 0) return null; }
      hintAlpha = clamp(Math.min(c / 0.25, (dur - c) / 0.5), 0, 1);
      return conTeclas(h, S.pilotJ);
    }
    function drawOverlays(ctx, t) {
      // intro final: "WE ARE A TEAM" enorme en dorado con rayos de luz
      if (S.modo === 'intro' && S.fk === 'final' && S.introKind === 'full' && S.introT >= MOTTO_T && S.introT < introLen()) {
        drawMotto(ctx, t, clamp((S.introT - MOTTO_T) / 0.5, 0, 1) * clamp((introLen() - S.introT) / 0.5, 0, 1));
      }
      if (S.modo === 'victoria' && S.vic && S.vic.defDone) {
        if (S.fk === 'final') {
          drawMotto(ctx, t, clamp(S.vic.celT / 0.4, 0, 1));
          if (S.escapaTxt) outlined(ctx, '¡Robovill se escapa!', W / 2, 250, 30, '#fecaca', '#7f1d1d', 6);
        } else {
          var k = clamp(S.vic.celT / 0.3, 0, 1);
          ctx.save();
          ctx.translate(W / 2, 200); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
          outlined(ctx, '¡VICTORIA!', 0, 0, 84, '#fde68a', '#7c2d12', 10);
          outlined(ctx, '¡Gran trabajo en equipo!', 0, 70, 30, '#fef3c7', O, 5);
          ctx.restore();
        }
      }
      // mensaje grande centrado
      if (S.msg) {
        var m = S.msg, a = clamp(m.t / 0.15, 0, 1) * clamp((m.life - m.t) / 0.3, 0, 1);
        var sc = 1 + Math.max(0, 0.2 - m.t) * 2;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(W / 2, m.big ? 170 : 150);
        ctx.scale(sc, sc);
        outlined(ctx, m.text, 0, 0, m.big ? 64 : 40, m.big ? '#fde68a' : '#ffffff', m.big ? '#7c2d12' : O, m.big ? 9 : 6);
        ctx.restore();
      }
      if (S.modo === 'intro' && S.introKind === 'full' && S.introT < introLen()) {
        var al = clamp(S.introT - 0.5, 0, 1) * 0.85;
        ctx.save(); ctx.globalAlpha = al;
        ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = O; ctx.lineWidth = 3;
        var tx = S.coop ? 'Mantén Enter para saltar la intro' : 'Mantén ' + conTeclas('{salto}', 1) + ' o Enter para saltar la intro';
        ctx.strokeText(tx, W - 16, H - 16); ctx.fillText(tx, W - 16, H - 16);
        ctx.restore();
      }
    }
    // cara de Dark Secuaz (bueno) recortada en un círculo, como la de las pistas de ui.js
    function drawSecuazFace(ctx, cx, cy, r) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI * 2);
      ctx.fillStyle = '#14532d'; ctx.fill();
      ctx.save();
      ctx.clip();
      if (!art('secuaz', ctx, cx, cy + 22 * r / 18, { scale: 0.16 * r / 18, good: true })) {
        circle(ctx, cx, cy + 2, r * 0.78, '#22c55e', null);
        circle(ctx, cx - r * 0.33, cy - 2, r * 0.18, '#ffffff', null); circle(ctx, cx + r * 0.33, cy - 2, r * 0.18, '#ffffff', null);
      }
      ctx.restore();
      ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI * 2); ctx.stroke();
      ctx.restore();
    }
    function drawMotto(ctx, t, a) {
      if (a <= 0) return;
      var MY = 128;
      ctx.save();
      // la escena se oscurece un poco para que el dorado brille
      ctx.globalAlpha = 0.28 * a; ctx.fillStyle = '#0b0614'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a;
      // rayos de luz
      ctx.save();
      ctx.translate(W / 2, MY);
      ctx.rotate(t * 0.4);
      for (var i = 0; i < 16; i++) {
        ctx.rotate(PI / 8);
        ctx.fillStyle = i % 2 ? 'rgba(253,230,138,0.22)' : 'rgba(251,191,36,0.14)';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -720); ctx.lineTo(60, -720); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // el lema: entra "estampado" (grande → su tamaño) y late suave
      var k = (1.5 - 0.5 * easeOut(a)) * (1 + 0.025 * Math.sin(t * 5));
      ctx.save();
      ctx.translate(W / 2, MY); ctx.scale(k, k);
      ctx.font = 'bold 96px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 16; ctx.strokeText('WE ARE A TEAM', 0, 0);
      var g = ctx.createLinearGradient(0, -48, 0, 48);
      g.addColorStop(0, '#fffbeb'); g.addColorStop(0.45, '#fde047'); g.addColorStop(1, '#f59e0b');
      ctx.fillStyle = g; ctx.fillText('WE ARE A TEAM', 0, 0);
      ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 6));
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeText('WE ARE A TEAM', 0, 0);
      ctx.restore();
      ctx.globalAlpha = a;
      outlined(ctx, '¡Somos un equipo!', W / 2, MY + 76, 32, '#fef3c7', O, 6);
      // destellos alrededor del lema
      for (var s = 0; s < 6; s++) {
        var sa = t * 1.3 + s * PI / 3;
        star(ctx, W / 2 + Math.cos(sa) * 400, MY + Math.sin(sa) * 70, 9 + 4 * Math.sin(t * 7 + s), '#fde68a');
      }
      // el equipo al completo, abajo: los 4 héroes y Dark Secuaz
      var quien = ['director', 'falcon', 'secuaz', 'mikey', 'peter'];
      var cx0 = W / 2 - 2 * 58, fy = H - 34;
      rfill(ctx, cx0 - 40, fy - 30, 4 * 58 + 80, 60, 30, 'rgba(15,10,25,0.75)', '#fde68a', 3);
      for (var q = 0; q < quien.length; q++) {
        var fx = cx0 + q * 58, bob = Math.sin(t * 6 + q) * 3 * a;
        if (quien[q] === 'secuaz') {
          drawSecuazFace(ctx, fx, fy + bob, 21);
        } else if (!art('caraHeroe', ctx, fx, fy + bob, { quien: quien[q], size: 40 })) {
          var col = (G.p3 && G.p3.heroColor) ? G.p3.heroColor(quien[q]) : '#e5e7eb';
          circle(ctx, fx, fy + bob, 20, col, O, 2);
          outlined(ctx, quien[q].charAt(0).toUpperCase(), fx, fy + 1 + bob, 20, '#ffffff', O, 3);
        }
      }
      ctx.restore();
    }

    // -------------------------------------------------------------------------
    //  Botones táctiles extra (§4) y ayudas para pruebas (§18.1)
    // -------------------------------------------------------------------------
    scene.touchExtra = function () {
      var full = !!(S && S.barra >= 1 && S.modo === 'pelea');
      // las fusiones no leen HACK: sin botón muerto en el móvil (core.js, extra.ocultar)
      return { cambio: full ? '¡EQUIPO!' : false, vertical: !!(S && S.modoAire), ocultar: ['hack'] };
    };
    scene.__debug = {
      state: function () {
        if (!S) return null;
        var b = S.b, d = null;
        try { d = (b && S.bdef.debug) ? S.bdef.debug(b) : null; } catch (e) { d = null; }
        d = d || {};
        var deb = d.debil || null;
        if (!deb && b && (S.modo === 'pelea' || S.modo === 'equipo')) {
          var z = zones();
          for (var i = 0; i < z.length; i++) if (z[i].tipo === 'debil') { deb = { x: z[i].x, y: z[i].y }; break; }
        }
        var modo = S.modo === 'intro' ? 'intro' : S.modo;
        return {
          modo: modo, fase: d.fase !== undefined ? d.fase : (b ? b.fase : null), estado: d.estado || null, ataque: d.ataque || null,
          hp: b ? b.hp : 0, maxHp: b ? b.maxHp : 0, bossX: b ? b.x : 0, bossY: b ? b.y - (b.alto || 0) / 2 : 0,
          fusionX: S.f.x, fusionY: S.modoAire ? S.f.y - S.fd.alto / 2 : S.f.y, escudo: !!S.f.shield, barra: S.barra,
          aviso: !!d.aviso, debilX: deb ? deb.x : null, debilY: deb ? deb.y : null, camDY: S.camDY
        };
      },
      raw: function () { return S ? { S: S, arena: arena, fusion: S.f, boss: S.b, bdef: S.bdef, prueba: S.prueba } : null; }
    };
    return scene;
  };

  // ===========================================================================
  //  Registro de las escenas (§12, §19.1)
  // ===========================================================================
  G.scenes = G.scenes || {};
  G.scenes.levelP3_2f = G.makeGiantScene3({ escena: 'levelP3_2f', chapter: 2, fusion: 'terrestre', jefe: 'excavadora', modo: 'suelo', lugar: 'caverna', music: 'giants3' });
  G.scenes.levelP3_3f = G.makeGiantScene3({ escena: 'levelP3_3f', chapter: 3, fusion: 'voladora', jefe: 'nodriza', modo: 'aire', lugar: 'cielo', music: 'giants3' });
  G.scenes.levelP3_5f = G.makeGiantScene3({ escena: 'levelP3_5f', chapter: 5, fusion: 'final', jefe: 'robovill', modo: 'suelo', lugar: 'fabrica', music: 'teamFinal' });
  G.scenes.levelP3test_gigantes = G.makeGiantScene3({ escena: 'levelP3test_gigantes', chapter: 0, fusion: 'final', jefe: '__prueba', modo: 'suelo', lugar: 'fabrica', music: 'teamFinal', prueba: true });
})();
