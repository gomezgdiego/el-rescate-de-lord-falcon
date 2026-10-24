window.G = window.G || {};
// gigantes-jefes3.js — LOS TRES JEFES GIGANTES de la Parte 3 "We Are a Team" (dueño: jefes-gigantes).
// Contrato técnico de la Parte 3, §12.6 (interfaz de los plugins) y §12.7 (los tres jefes).
//
//   'excavadora'  La GRAN EXCAVADORA  (cap. 2, levelP3_2f, modo suelo, 40 de vida)
//   'nodriza'     El DRON NODRIZA      (cap. 3, levelP3_3f, modo aire,  44 de vida)
//   'robovill'    ROBOVILL GIGANTE     (cap. 5, levelP3_5f, modo suelo, 70 de vida; su derrota es SU HUIDA)
//
// Reglas comunes (§12.7, §13):
//   · Todo ataque avisa 1,0 s o más: debug().estado = 'aviso:<ataque>' mientras avisa y 'golpe:<ataque>' mientras golpea.
//   · REGLA DE RITMO: en cada fase el jefe recorre su tabla de ataques por turnos, sin repetir, hasta haberlos hecho
//     TODOS (y como mínimo 2 completos). Hasta entonces minHp no deja que la vida baje del umbral de la fase siguiente,
//     pero sin escalón fijo: el suelo baja en RAMPA con el tiempo de la fase y los ataques hechos, así la barra sigue
//     bajando con cada golpe. Además cada fase dura al menos FASE_MIN segundos, para que la pelea se vea (P3-10 pide
//     ≥ 8 s por fase). Con la ronda hecha, la vida baja como mucho 3 puntos por debajo del umbral antes del cambio de
//     fase. ATAQUE EN EQUIPO: en la Excavadora y el Nodriza (golpeEquipo) cuenta como la ronda hecha si el jefe ya ha
//     enseñado algún ataque de la fase (y en la última fase la remata si la fase ya ha durado lo suyo); si llega muy
//     pronto, pega fuerte hasta dejar un poco de vida que la rampa deja bajar. En Robovill gigante, lo que el ritmo
//     no deja aplicar se guarda (b.deuda) y se cobra con un "¡CRAC!" en cuanto el ritmo lo permite.
//   · Todo se esquiva de verdad (probado con bots): la embestida se salta (solo daña su parte delantera de abajo,
//     con el aviso "¡SALTA!"), las rocas y las bombas dejan un hueco libre, el rayo nunca va a la franja central,
//     y el círculo del taladro se deja a tiempo.
//   · Las zonas débiles salen de P2.P3PUNTOS × escala × facing (nunca alturas fijas); la débil a la vista va primera.
//   · Nada lanza: el motor envuelve las llamadas y aquí todo lee con respaldo.
// Solo DEFINE cosas al cargar: se registra en G.P3G (que crea si aún no existe, §1).
(function () {
  'use strict';
  var G = window.G;

  G.P3G = G.P3G || { bosses: {} };
  if (!G.P3G.bosses) G.P3G.bosses = {};
  G.P3G.register = G.P3G.register || function (nombre, def) { G.P3G.bosses[nombre] = def; };

  // ---------------------------------------------------------------------------
  //  Constantes y utilidades
  // ---------------------------------------------------------------------------
  var PI = Math.PI;
  var O = '#1a1a2e';
  var FONT = 'system-ui, "Segoe UI", Arial, sans-serif';
  var FASE_MIN = 9;          // segundos mínimos de cada fase (regla de ritmo ampliada)
  var AVISO = 1.05;          // aviso mínimo de todo ataque (≥ 1,0 s con margen por el paso fijo de 1/60)

  // Altos del arte a escala 1 (copia del contrato §16.4, por si datos-arte3.js faltara).
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };
  // Puntos de impacto de respaldo (contrato §16.4), por si datos-arte3.js faltara.
  var PUNTOS_POR_DEFECTO = {
    robovill: { A: { gema: [14, -110, 20] }, B: { gema: [0, -128, 20] } },
    granExcavadora: { motor: [-109, -75, 26] },
    dronNodriza: { compuerta: [25, 48, 32] }
  };
  // Caja visible de respaldo [izq, arriba, der, abajo] a escala 1 (para centrar las piezas ancladas en el centro).
  var CAJA_POR_DEFECTO = { dronNodriza: [-165, -111, 136, 87], granExcavadora: [-124, -167, 177, 2] };

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function altoArte(n) {
    var v = (window.P2 && P2.P3ALTO && P2.P3ALTO[n]) || ALTO_POR_DEFECTO[n];
    return (typeof v === 'number' && v > 0) ? v : 100;
  }
  function caja(n) {
    var c = window.P2 && P2.P3CAJA && P2.P3CAJA[n];
    if (c && c.length === 4) return c;
    return CAJA_POR_DEFECTO[n] || null;
  }
  // punto de impacto [dx, dy, r] del arte (con respaldo); variante opcional (Robovill)
  function punto(nombre, clave, variante) {
    var src = (window.P2 && P2.P3PUNTOS && P2.P3PUNTOS[nombre]) || PUNTOS_POR_DEFECTO[nombre];
    var p = null;
    try {
      if (src) p = variante ? (src[variante] && src[variante][clave]) : src[clave];
      if (!p && variante && PUNTOS_POR_DEFECTO[nombre]) p = PUNTOS_POR_DEFECTO[nombre][variante][clave];
      if (!p && !variante && PUNTOS_POR_DEFECTO[nombre]) p = PUNTOS_POR_DEFECTO[nombre][clave];
    } catch (e) { p = null; }
    if (!p || p.length < 3) return null;
    return [num(p[0], 0), num(p[1], 0), num(p[2], 20)];
  }
  function look() { return (G.p3 && G.p3.look) || {}; }
  function art() {
    try {
      if (window.P2 && typeof P2.call === 'function') return !!P2.call.apply(P2, arguments);
    } catch (e) { /* respaldo */ }
    return false;
  }
  function A_L(arena) { return num(arena && arena.L, -170); }
  function A_R(arena) { return num(arena && arena.R, 1130); }
  function GY(arena) { return num(arena && arena.GROUND_Y, 470); }
  function camDY(arena) {
    try { return (arena && typeof arena.camDY === 'function') ? num(arena.camDY(), 0) : 0; } catch (e) { return 0; }
  }
  function fus(arena) {
    var f = null;
    try { f = arena.fusion(); } catch (e) { f = null; }
    f = f || {};
    var y = num(f.y, 470), h = num(f.h, 330);
    return { x: num(f.x, 200), y: y, cy: num(f.cy, y - h / 2), w: num(f.w, 170), h: h, facing: f.facing === -1 ? -1 : 1,
      escudo: !!f.escudo, enSuelo: f.enSuelo !== false };
  }
  function fRect(arena) {
    var r = null;
    try { r = arena.fusionRect(); } catch (e) { r = null; }
    if (!r) { var f = fus(arena); r = { x: f.x - f.w / 2, y: f.y - f.h, w: f.w, h: f.h }; }
    return r;
  }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function call(arena, fn) {
    try { if (arena && typeof arena[fn] === 'function') return arena[fn].apply(arena, Array.prototype.slice.call(arguments, 2)); }
    catch (e) { /* nada */ }
    return null;
  }

  // ---- dibujo con primitivas ----
  function circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
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
  function star(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = O; ctx.lineWidth = 2; ctx.stroke();
  }
  function outlined(ctx, text, x, y, size, fill, stroke, lw) {
    ctx.font = 'bold ' + Math.round(size) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke || O; ctx.lineWidth = lw || Math.max(3, size * 0.16);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill || '#ffffff'; ctx.fillText(text, x, y);
  }
  // "!" de aviso, grande (el mundo de gigantes va con zoom 0,667)
  function exclam(ctx, x, y, k) {
    k = num(k, 2.2);
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    var hecho = false;
    if (G.gfx && typeof G.gfx.drawExclamation === 'function') {
      try { G.gfx.drawExclamation(ctx, 0, 0); hecho = true; } catch (e) { hecho = false; }
    }
    if (!hecho) {
      circle(ctx, 0, -6, 13, '#fbbf24', O, 3);
      outlined(ctx, '!', 0, -6, 20, '#ffffff', O, 3);
    }
    ctx.restore();
  }
  function halo(ctx, x, y, r, rgb, a) {
    ctx.save();
    var g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fill();
    ctx.restore();
  }
  function mareoStars(ctx, x, y, t, rx) {
    for (var s = 0; s < 3; s++) {
      var a = t * 5 + s * 2.1;
      star(ctx, x + Math.cos(a) * rx, y + Math.sin(a) * rx * 0.25, 14, '#fde047');
    }
  }

  // ---------------------------------------------------------------------------
  //  Transformación del dibujo: origen (T.x, T.y), giro T.rot, aplastamiento vertical T.sq,
  //  escala del arte T.s y orientación T.f. Las zonas usan EXACTAMENTE la misma cuenta que el dibujo.
  // ---------------------------------------------------------------------------
  function toWorld(T, dx, dy) {
    var lx = dx * T.s * T.f, ly = dy * T.s * T.sq;
    var c = Math.cos(T.rot), s = Math.sin(T.rot);
    return { x: T.x + lx * c - ly * s, y: T.y + lx * s + ly * c };
  }
  function aplicar(ctx, T) {
    ctx.translate(T.x, T.y);
    if (T.rot) ctx.rotate(T.rot);
    if (T.sx !== undefined && T.sx !== 1) ctx.scale(T.sx, 1);
    if (T.sq !== 1) ctx.scale(1, T.sq);
  }

  // ---------------------------------------------------------------------------
  //  Regla de ritmo (§13, común a los tres)
  // ---------------------------------------------------------------------------
  function ritmoReset(b) {
    b.ronda = []; b.hechos = {}; b.completos = 0; b.rondaOk = false; b.faseT = 0; b.ultimo = null;
    b.porEquipo = false; b.equipoHecho = false; b.rampaR = RAMPA; b.rampaT0 = 0;
  }
  function sacarAtaque(b, tabla) {
    var dist = {}, nd = 0;   // ataques distintos de la tabla (la del Nodriza repite la compuerta)
    for (var i = 0; i < tabla.length; i++) if (!dist[tabla[i]]) { dist[tabla[i]] = true; nd++; }
    b.nTabla = nd;
    if (!b.ronda.length) b.ronda = tabla.slice();
    var a = b.ronda.shift();
    // sin repetir el mismo ataque dos veces seguidas (si se puede)
    if (a === b.ultimo && b.ronda.length) { b.ronda.push(a); a = b.ronda.shift(); }
    b.ultimo = a;
    return a;
  }
  function finAtaque(b, tabla) {
    if (b.ataqueContado) return;
    b.ataqueContado = true;
    b.hechos[b.ataque] = true;
    b.completos++;
    var ok = b.completos >= 2;
    for (var i = 0; i < tabla.length; i++) if (!b.hechos[tabla[i]]) ok = false;
    if (ok) b.rondaOk = true;
  }
  // LB[k] = vida mínima de la fase k (la fase k cubre (LB[k], LB[k−1]]); LB[nF] = 0.
  function faseDe(hp, LB, nF) {
    for (var k = 1; k < nF; k++) if (hp > LB[k]) return k;
    return nF;
  }
  // vida mínima que dejan los golpes ahora mismo (regla de ritmo). Con la ronda hecha, la vida puede bajar del
  // umbral de la fase (y así cambia de fase en el siguiente descanso), pero como mucho PASO_FASE puntos: la fase
  // siguiente empieza casi entera y no clavada en su propio suelo.
  var PASO_FASE = 3;
  // RAMPA: mientras la ronda no está hecha, el suelo NO es un escalón fijo (la barra se quedaba clavada 8–14 s y los
  // golpes del niño no hacían nada): baja poco a poco desde RAMPA puntos por encima del umbral hasta el umbral, con
  // el tiempo de la fase (RAMPA_T s) y sin adelantarse a los ataques que faltan. Así la barra sigue bajando con
  // cada golpe y llega al umbral más o menos cuando el jefe ha enseñado su ronda.
  var RAMPA = 8, RAMPA_T = 12;
  function pisoOk(b) { return (b.rondaOk || b.equipoHecho) && (b.faseT >= FASE_MIN || b.porEquipo); }
  // suelo "duro" (sin rampa): el umbral de la fase mientras falta la ronda, o el de después con la ronda hecha
  function pisoDuro(b, LB, nF, pisoFinal, base) {
    var k = clamp(b.fase | 0, 1, nF);
    var ok = pisoOk(b);
    if (k < nF) {
      if (!ok) return LB[k] + 0.5;
      var sig = (k + 1 < nF) ? LB[k + 1] + 0.5 : pisoFinal;
      return Math.max(LB[k] - PASO_FASE, sig);
    }
    return ok ? base : pisoFinal;
  }
  // lo que aún queda de rampa por encima del suelo duro (0 con la ronda hecha)
  function rampaResto(b) {
    if (pisoOk(b)) return 0;
    var R = Math.max(0, num(b.rampaR, RAMPA)), t0 = num(b.rampaT0, 0);
    var pt = (num(b.faseT, 0) - t0) / Math.max(3, (b.equipoHecho ? FASE_MIN : RAMPA_T) - t0);
    var n = Math.max(1, num(b.nTabla, 3)), hechos = 0;
    for (var a in (b.hechos || {})) if (b.hechos[a]) hechos++;
    var pa = b.equipoHecho ? 1 : (hechos + 1) / n;   // no se adelanta a los ataques que faltan
    return R * (1 - clamp(Math.min(pt, pa), 0, 1));
  }
  // vida mínima que dejan los golpes normales (minHp): suelo duro + rampa
  function piso(b, LB, nF, pisoFinal, base) {
    return pisoDuro(b, LB, nF, pisoFinal, base) + rampaResto(b);
  }
  // ATAQUE EN EQUIPO de la Excavadora y el Nodriza (§12.4): pega FUERTE y nunca se queda en un "¡-0!".
  //  · Si el jefe ya ha enseñado al menos un ataque de la fase (y, en la última, la fase ya ha durado lo suyo),
  //    el ataque en equipo CUENTA COMO LA RONDA HECHA: puede cruzar el umbral y, en la última fase, REMATAR.
  //  · Si llega demasiado pronto, hace su daño hasta el umbral, pero en la última fase deja al jefe con un poco
  //    de vida (RESTO_EQ) que la rampa va dejando bajar con los golpes ("¡Resiste… por ahora!"); el ataque en
  //    equipo cuenta entonces como la ronda y el jefe cae en cuanto la fase cumple FASE_MIN.
  //  · Sin deudas ni "¡CRAC!" tardíos: lo que no cabe se pierde (el niño ve el "¡-N!" grande del motor).
  var RESTO_EQ = 3;
  function golpeEquipo(b, d, LB, nF, pisoFinal, base, arena, zona) {
    var k = clamp(b.fase | 0, 1, nF), ultima = k >= nF;
    var cuenta = b.completos >= 1 && (!ultima || b.faseT >= FASE_MIN - 1.5);
    if (cuenta) { b.rondaOk = true; b.porEquipo = true; }
    var p = pisoDuro(b, LB, nF, pisoFinal, base);
    // con la ronda contada, en una fase que no es la última puede entrar en la siguiente sin el tope de PASO_FASE
    if (cuenta && !ultima) p = (k + 1 < nF) ? LB[k + 1] + 0.5 : pisoFinal;
    if (!cuenta) p = Math.max(p, Math.min(b.hp - 1, p + RESTO_EQ));
    var ap = clamp(Math.min(d, b.hp - p), 0, d);
    if (!cuenta) {
      // la rampa vuelve a empezar desde la vida que queda: los golpes siguientes la siguen bajando poco a poco.
      // En la última fase el ataque en equipo cuenta como la ronda: el remate llega al cumplir FASE_MIN.
      if (ultima) b.equipoHecho = true;
      var duro = pisoDuro(b, LB, nF, pisoFinal, base);
      b.rampaR = Math.max(0, b.hp - ap - duro); b.rampaT0 = b.faseT;
      if (ap < d - 0.01) {
        var zx = num(zona && zona.x, b.x), zy = num(zona && zona.y, b.y - num(b.alto, 300) / 2);
        zx = clamp(zx, A_L(arena) + 230, A_R(arena) - 230);   // que el texto no se corte en el borde
        call(arena, 'text', zx, zy - 110, '¡Resiste… por ahora!', '#fde68a', 34);
      }
    }
    return Math.max(0.01, ap);
  }
  // al cambiar de fase: el daño guardado que sobra pasa a la fase nueva, pero como mucho 5 (un buen "¡CRAC!")
  function deudaNuevaFase(b) { b.deuda = Math.min(num(b.deuda, 0), 5); }
  // El ataque en equipo no pasa por minHp (§12.6): se recorta aquí para respetar el ritmo, pero NO se pierde:
  // lo que no cabe se guarda en b.deuda y se cobra (con su "¡CRAC!") en cuanto el ritmo deja bajar la vida.
  function recorteEquipo(b, d, p, arena, zona) {
    if (b.hp - d >= p) return d;
    var cabe = Math.max(0, b.hp - p);
    b.deuda = num(b.deuda, 0) + (d - cabe);
    var zx = num(zona && zona.x, b.x), zy = num(zona && zona.y, b.y - num(b.alto, 300) / 2);
    call(arena, 'text', zx, zy - 110, '¡Resiste… por ahora!', '#fde68a', 34);
    return Math.max(0.01, cabe);
  }
  // cobra el daño guardado del ataque en equipo cuando el suelo de vida baja (se llama en cada update)
  function cobrarDeuda(b, arena, p) {
    if (!(num(b.deuda, 0) > 0) || b.estado === 'intro' || b.estado === 'derrota' || b.hp <= 0) return;
    if (b.hp <= p + 0.01) return;
    var a = Math.min(b.deuda, b.hp - p);
    b.hp = Math.max(0, b.hp - a); b.deuda -= a;
    if (b.deuda < 0.01) b.deuda = 0;
    b.hitT = 0.3; b.tiembla = Math.max(num(b.tiembla, 0), 0.8);
    var cx = b.x, cy = b.y - num(b.alto, 300) * 0.6;
    call(arena, 'text', cx, cy - 60, '¡CRAC! ¡-' + Math.max(1, Math.round(a)) + '!', '#fde047', 52);
    call(arena, 'parts', cx, cy, '#fde68a', 22, 300, 'star');
    call(arena, 'parts', cx, cy, '#60a5fa', 12, 260, 'dot');
    call(arena, 'shake', 0.6); call(arena, 'flash', 0.3); call(arena, 'sfx', 'bigPunch'); call(arena, 'sfx', 'explosion');
  }
  // descanso entre ataques: si el jefe está clavado en el suelo de vida de la fase y aún le faltan
  // ataques de la ronda, descansa menos (así los golpes del niño vuelven a contar antes)
  function descansoDe(b, p) {
    var d = num(b.descanso, 1.2);
    if (!b.rondaOk && b.hp <= p + 0.05) d = Math.min(d, 0.5);
    return d;
  }
  function estadoDebug(b) {
    if (b.estado === 'aviso') return 'aviso:' + b.ataque;
    if (b.estado === 'golpe') return 'golpe:' + b.ataque;
    if (b.estado === 'intro' || b.estado === 'derrota' || b.estado === 'mareado' || b.estado === 'escudo') return b.estado;
    return 'descanso';
  }
  function empezarAviso(b, ataque) {
    b.ataque = ataque; b.estado = 'aviso'; b.st = 0; b.ataqueContado = false; b.golpeado = false; b.cue = false;
  }
  function empezarGolpe(b) { b.estado = 'golpe'; b.st = 0; }
  function descanso(b, seg) { b.estado = 'descanso'; b.st = 0; b.descanso = num(seg, 1.2); }

  // ===========================================================================
  //  1. LA GRAN EXCAVADORA  (§12.7)
  //  Embestida de taladro (se salta; si llega al borde se clava con el MOTOR al aire),
  //  lluvia de rocas (sombras) y onda de tierra (se salta). Punto débil: el motor de atrás.
  // ===========================================================================
  var EXC_TABLA = { 1: ['embestida', 'rocas', 'onda'], 2: ['embestida', 'rocas', 'onda'] };
  var EXC_LB = { 1: 20, 2: 0 };
  var EXC_ALTO = 360;
  function excS() { return EXC_ALTO / altoArte('granExcavadora'); }
  function excLim(arena) { return { min: A_L(arena) + 300, max: A_R(arena) - 300 }; }
  function excT(b) {
    var rot = num(b.lean, 0) + (b.estado === 'derrota' ? Math.sin(num(b.defT, 0) * 40) * 0.02 : 0);
    var shx = num(b.tiembla, 0) > 0 ? Math.sin(b.t * 70) * 5 * b.tiembla : 0;
    return { x: b.x + shx + num(b.introX, 0), y: b.y + num(b.hund, 0), rot: rot, sq: 1, s: excS(), f: b.facing, sx: num(b.giroSx, 1) };
  }
  function excZonas(b) {
    if (b.estado === 'intro' || b.estado === 'derrota' || b.hp <= 0) return [];
    var T = excT(b), s = T.s;
    var m = punto('granExcavadora', 'motor') || [-109, -75, 26];
    var pm = toWorld(T, m[0], m[1]);
    var pt = toWorld(T, 118, -67);
    var pc = toWorld(T, -20, -78);
    var pk = toWorld(T, 12, -118);
    return [
      { x: pm.x, y: pm.y, r: m[2] * s + 8, tipo: 'debil', id: 'motor' },
      { x: pt.x, y: pt.y, r: 34 * s, tipo: 'armadura', id: 'taladro' },
      { x: pc.x, y: pc.y, r: 68 * s, tipo: 'cuerpo', id: 'cuerpo' },
      { x: pk.x, y: pk.y, r: 32 * s, tipo: 'cuerpo', id: 'cupula' }
    ];
  }
  // Embestida: SOLO hace daño la parte delantera de abajo (punta del taladro y oruga delantera), así un salto a
  // tiempo la libra; cuando la punta pasa el centro de la fusión sin tocarla, el resto del cuerpo pasa por debajo
  // sin hacer daño (§12.1: el jefe puede atravesar a la fusión).
  var EXC_FRENTE_W = 140, EXC_FRENTE_H = 125;
  function excFrente(b) {
    var tip = excTip(b);
    var x0 = b.facing > 0 ? tip.x - EXC_FRENTE_W : tip.x;
    return { x: x0, y: b.y - EXC_FRENTE_H, w: EXC_FRENTE_W, h: EXC_FRENTE_H };
  }
  // parte baja de todo el cuerpo (solo para cuando la fusión está DENTRO de la excavadora al arrancar)
  function excBajo(b) {
    var s = excS(), cj = caja('granExcavadora') || [-124, -167, 177, 2];
    var izq = b.facing > 0 ? cj[0] * s : -cj[2] * s, der = b.facing > 0 ? cj[2] * s : -cj[0] * s;
    return { x: b.x + izq, y: b.y - EXC_FRENTE_H, w: der - izq, h: EXC_FRENTE_H };
  }
  function excTip(b) { return toWorld(excT(b), 156, -67); }
  // distancia (px) entre la punta del taladro y el borde de la fusión que tiene delante (negativa si ya la pisa)
  function excHueco(b, f) { return b.facing * ((f.x - b.facing * f.w / 2) - excTip(b).x); }
  // punto de descanso: a un hueco de ≈ 110 px delante de la fusión, para que el aviso del taladro se vea
  function excSitio(b, f, lim, hueco) {
    var off = Math.abs(excTip(b).x - b.x);
    return clamp(f.x - b.facing * (f.w / 2 + hueco + off), lim.min, lim.max);
  }

  var EXCAVADORA = {
    nombre: 'GRAN EXCAVADORA',
    hp: 40,
    create: function (arena, opts) {
      var b = { x: 760, y: GY(arena), alto: EXC_ALTO, hp: 40, maxHp: 40, facing: -1, fase: 1,
        estado: 'descanso', st: 0, t: 0, descanso: 1.6, ataque: null, ronda: [], hechos: {}, completos: 0,
        rondaOk: false, faseT: 0, lean: 0, tiembla: 0, hitT: 0, introX: 0, hund: 0, giroT: 0, giroSx: 1,
        detrasT: 0, pausa: 0, sub: '', vx: 0, rocas: [], ondaN: 0, golpeado: false, defT: 0, pops: 0 };
      var fz = opts && opts.fase;
      if (fz === 2 || fz === 3) { b.hp = EXC_LB[1]; b.fase = 2; }
      else if (fz === 'victoria') { b.hp = 0; b.fase = 2; b.estado = 'derrota'; }
      ritmoReset(b);
      return b;
    },
    intro: function (b, t, arena) {
      // entra desde la derecha rompiendo la pared de la caverna
      b.estado = 'intro';
      b.t += 1 / 60;
      var k = clamp(t / 1.8, 0, 1);
      b.introX = (1 - ease(k)) * 620;
      b.tiembla = k < 1 ? 0.6 : 0;
      if (t < 0.05) { call(arena, 'sfx', 'drill'); call(arena, 'sfx', 'rumble'); }
      if (k < 1 && Math.random() < 0.3) call(arena, 'parts', b.x + b.introX + 200, GY(arena) - rnd(20, 200), '#a8a29e', 2, 160, 'dot');
      if (t >= 1.8 && !b._introMsg) {
        b._introMsg = true; call(arena, 'shake', 0.5); call(arena, 'sfx', 'roar');
        call(arena, 'msg', '¡LA GRAN EXCAVADORA!', 1.6);
      }
      if (t >= 2.6) { b.introX = 0; b.tiembla = 0; descanso(b, 1.0); return true; }
      return false;
    },
    update: function (b, dt, arena) {
      var f = fus(arena), lim = excLim(arena), tabla = EXC_TABLA[b.fase] || EXC_TABLA[1];
      b.t += dt; b.st += dt; b.faseT += dt;
      if (b.hitT > 0) b.hitT -= dt;
      if (b.tiembla > 0) b.tiembla = Math.max(0, b.tiembla - dt * 2);
      if (b.giroT > 0) {   // media vuelta (visual: se aplasta en horizontal y se da la vuelta a la mitad)
        b.giroT -= dt;
        var gk = 1 - clamp(b.giroT / 0.45, 0, 1);
        if (gk >= 0.5 && !b.giroHecho) { b.giroHecho = true; b.facing = -b.facing; }
        b.giroSx = Math.max(0.15, Math.abs(Math.cos(gk * PI)));
      } else b.giroSx = 1;
      var rapido = b.fase >= 2;
      var pisoAhora = piso(b, EXC_LB, 2, 0.5, 0);

      if (b.estado === 'intro') { descanso(b, 1.0); return; }

      if (b.estado === 'descanso') {
        b.lean *= Math.pow(0.02, dt);
        // ¿cambio de fase? (solo entre ataques)
        var nf = faseDe(b.hp, EXC_LB, 2);
        if (nf > b.fase && b.faseT >= FASE_MIN - 0.5) {   // (tras un ataque en equipo, la fase aún dura lo suyo)
          b.fase = nf; ritmoReset(b); deudaNuevaFase(b); b.pausa = 1.2;
          call(arena, 'msg', '¡FASE 2: MÁS RÁPIDA!', 1.6); call(arena, 'sfx', 'roar'); call(arena, 'shake', 0.5);
          b.tiembla = 1;
          return;
        }
        if (b.pausa > 0) { b.pausa -= dt; return; }
        // se coloca despacio a un hueco de la fusión, con el taladro delante de ella (sin taparla);
        // si la fusión está detrás, se queda quieta: ¡es el rato de pegar al motor!
        if (sgn(f.x - b.x) === b.facing && b.giroT <= 0) {
          var home = excSitio(b, f, lim, 110);
          if (Math.abs(b.x - home) > 12) b.x += clamp(home - b.x, -150 * dt, 150 * dt);
        }
        // si la fusión se queda detrás, se da la vuelta (despacio: ¡hay ratos para pegar al motor!)
        if (sgn(f.x - b.x) !== b.facing && Math.abs(f.x - b.x) > 140) b.detrasT += dt; else b.detrasT = 0;
        if (b.detrasT > 1.6 && b.giroT <= 0) { b.detrasT = 0; b.giroT = 0.45; b.giroHecho = false; call(arena, 'sfx', 'robot'); }
        if (b.st >= descansoDe(b, pisoAhora) && b.giroT <= 0) {
          var at = sacarAtaque(b, tabla);
          empezarAviso(b, at);
          if (at === 'embestida' || at === 'onda') {
            var quiere = sgn(f.x - b.x);
            if (quiere !== b.facing) { b.facing = quiere; b.giroSx = 0.3; }
          }
          if (at === 'embestida') { call(arena, 'sfx', 'drill'); b.avisoLen = 1.15; }
          else if (at === 'rocas') {
            call(arena, 'sfx', 'rumble'); call(arena, 'shake', 0.35); b.avisoLen = AVISO;
            // las rocas caen sobre la fusión y a un lado, pero dejan un HUECO seguro (≥ 250 px) hacia el lado
            // con más sitio: apartándose a tiempo se esquivan (o con el escudo)
            var paso = rapido ? 130 : 160;
            var ks = rapido ? [-4, -3, -2, -1, 0, 4, 5, 6, 7] : [-2, -1, 0, 3, 4, 5, 6];   // los últimos, de reserva
            var nRocas = rapido ? 6 : 4;
            var cen = (A_L(arena) + A_R(arena)) / 2;
            var lado = Math.abs(f.x - cen) > 90 ? sgn(cen - f.x) : (Math.random() < 0.5 ? -1 : 1);
            var xs = [];
            for (var i = 0; i < ks.length && xs.length < nRocas; i++) {
              var rx = f.x + lado * ks[i] * paso + rnd(-14, 14);
              if (rx < A_L(arena) + 40 || rx > A_R(arena) - 40) continue;     // fuera de la caverna: usa una de reserva
              xs.push(rx);
              call(arena, 'warn', rx, { r: 62, life: AVISO + 0.85 + xs.length * 0.06, y: GY(arena) });
            }
            b.rocas = xs;
          } else if (at === 'onda') {
            call(arena, 'sfx', 'drill'); b.avisoLen = AVISO;
            var tp = excTip(b);
            call(arena, 'warn', tp.x, { r: 60, life: AVISO, y: GY(arena) });
          }
        }
        return;
      }

      if (b.estado === 'aviso') {
        if (b.ataque === 'embestida') {
          b.lean = -b.facing * 0.04 * Math.sin(b.st * 30); b.tiembla = 0.5;
          // coge carrerilla: marcha atrás los primeros 0,7 s si tiene la fusión demasiado cerca
          if (b.st < 0.7) {
            var atras = excSitio(b, f, lim, 230);
            if (b.facing * (atras - b.x) < 0) b.x += clamp(atras - b.x, -230 * dt, 230 * dt);
          }
          // "¡SALTA!" justo a tiempo: el salto la libra si los pies van altos cuando pasa la punta
          var v0 = rapido ? 720 : 600, g0 = Math.max(0, excHueco(b, f));
          // instante ideal del salto respecto al arranque: el centro de la ventana en la que los pies van por encima
          // de la caja delantera (de 0,14 a 0,74 s tras saltar) mientras la punta cruza la mitad delantera de la fusión
          var ideal = (g0 + f.w / 4) / v0 - 0.44;
          var cueT = Math.min(num(b.avisoLen, 1.15), num(b.avisoLen, 1.15) + ideal - 0.3);
          if (!b.cue && b.st >= Math.max(0.5, cueT)) {
            b.cue = true;
            var tc = excTip(b);
            call(arena, 'text', tc.x, b.y - 260, '¡SALTA!', '#fde047', 54);
            call(arena, 'sfx', 'select');
          }
        }
        if (b.ataque === 'onda') b.lean = b.facing * 0.07 * ease(b.st / 0.6);
        if (b.ataque === 'rocas') { b.lean = -b.facing * 0.06 * Math.sin(b.st * 14); call(arena, 'shake', 0.2); }
        if (b.st >= num(b.avisoLen, AVISO)) {
          empezarGolpe(b);
          if (b.ataque === 'embestida') {
            b.vx = b.facing * (rapido ? 720 : 600); call(arena, 'sfx', 'boost'); call(arena, 'sfx', 'drill');
            // ¿la fusión ya está DENTRO de la excavadora al arrancar? (la punta ya pasó su centro)
            b.dentro = b.facing * (f.x - excTip(b).x) < 0;
          }
          else if (b.ataque === 'rocas') {
            var top = -270 - camDY(arena);
            for (var r = 0; r < b.rocas.length; r++) {
              call(arena, 'spawnShot', { x: b.rocas[r], y: top - r * 40, vx: 0, vy: 600, r: 28, dmg: 1, life: 4, kind: 'roca', gravity: 600 });
            }
            call(arena, 'sfx', 'rumble'); call(arena, 'shake', 0.4);
          } else if (b.ataque === 'onda') {
            var tip = excTip(b);
            call(arena, 'spawnWave', { x: tip.x, dir: b.facing, vel: rapido ? 440 : 360, dmg: 1, alto: 40 });
            call(arena, 'shake', 0.45); call(arena, 'sfx', 'bigPunch');
            call(arena, 'parts', tip.x, GY(arena) - 10, '#a8a29e', 14, 240, 'dot');
            b.ondaN = rapido ? 1 : 0;
          }
        }
        return;
      }

      if (b.estado === 'golpe') {
        if (b.ataque === 'embestida') {
          b.lean = b.facing * 0.05;
          b.x += b.vx * dt;
          if (Math.random() < 0.5) call(arena, 'parts', b.x - b.facing * 200, GY(arena) - 8, '#a8a29e', 2, 140, 'dot');
          var fr0 = fRect(arena);
          var toca = b.dentro ? overlap(excBajo(b), fr0) : overlap(excFrente(b), fr0);
          if (b.dentro) b.dentro = false;                   // solo cuenta el primer fotograma
          // la punta ya pasó el centro de la fusión sin tocarla: el resto pasa por debajo (la ha saltado)
          if (!b.golpeado && !toca && b.facing * (excTip(b).x - f.x) > 0) {
            b.golpeado = true;
            if (!f.enSuelo) { call(arena, 'text', f.x - b.facing * 210, f.y - f.h * 0.55, '¡Por encima!', '#bbf7d0', 38); call(arena, 'sfx', 'select'); }
          }
          if (!b.golpeado && toca) {
            b.golpeado = true;
            var res = call(arena, 'hurtFusion', 2, b.x, { fisico: true, empuje: 120 });
            if (res === 'bloqueado') {
              // ¡CLANC! rebota y queda aturdida 2 s
              finAtaque(b, tabla);
              b.estado = 'mareado'; b.sub = 'aturdida'; b.st = 0; b.mareoLen = 2.0; b.vx = -b.facing * 300;
              call(arena, 'text', b.x, b.y - EXC_ALTO * 0.75, '¡CLANC!', '#fde68a', 46); call(arena, 'sfx', 'clink'); call(arena, 'shake', 0.4);
              return;
            }
          }
          var choca = (b.facing > 0 && b.x >= lim.max) || (b.facing < 0 && b.x <= lim.min);
          if (choca || b.st > 1.8) {
            b.x = clamp(b.x, lim.min, lim.max);
            finAtaque(b, tabla);
            b.estado = 'mareado'; b.st = 0; b.vx = 0;
            if (choca) {
              b.sub = 'clavada'; b.mareoLen = 2.5;
              call(arena, 'shake', 0.6); call(arena, 'sfx', 'bigPunch'); call(arena, 'sfx', 'rumble');
              var tp2 = excTip(b);
              call(arena, 'parts', tp2.x, tp2.y, '#a8a29e', 22, 280, 'dot');
              call(arena, 'text', b.x, b.y - EXC_ALTO * 0.8, '¡Clavada!', '#fde68a', 40);
            } else { b.sub = 'frena'; b.mareoLen = 0.6; }
          }
          return;
        }
        if (b.ataque === 'onda') {
          if (b.ondaN > 0 && b.st >= 0.7) {
            b.ondaN = 0;
            var tip2 = excTip(b);
            call(arena, 'spawnWave', { x: tip2.x, dir: b.facing, vel: 440, dmg: 1, alto: 40 });
            call(arena, 'shake', 0.35); call(arena, 'sfx', 'bigPunch');
          }
          if (b.st >= (b.fase >= 2 ? 1.1 : 0.7)) { finAtaque(b, tabla); descanso(b, rapido ? 0.9 : 1.4); }
          return;
        }
        if (b.ataque === 'rocas') {
          if (b.st >= 1.0) { finAtaque(b, tabla); descanso(b, rapido ? 0.9 : 1.4); }
          return;
        }
        descanso(b, 1.0);
        return;
      }

      if (b.estado === 'mareado') {
        if (b.sub === 'aturdida') { b.x += b.vx * dt; b.vx *= Math.pow(0.05, dt); b.x = clamp(b.x, lim.min, lim.max); b.lean = -b.facing * 0.05; }
        else if (b.sub === 'clavada') { b.lean = b.facing * 0.1; b.tiembla = 0.25; }
        else b.lean *= Math.pow(0.02, dt);
        if (b.st >= num(b.mareoLen, 2)) { b.sub = ''; descanso(b, rapido ? 0.8 : 1.2); }
        return;
      }
      descanso(b, 1.0);
    },
    draw: function (ctx, b, arena) {
      var t = num(arena && arena.t, 0), T = excT(b), s = T.s;
      var alpha = 1;
      if (b.estado === 'derrota') alpha = 1 - clamp((num(b.defT, 0) - 2.2) / 0.6, 0, 1);
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.save();
      aplicar(ctx, T);
      if (b.hitT > 0) ctx.translate(Math.sin(b.t * 90) * 4, 0);
      if (!art('granExcavadora', ctx, 0, 0, { scale: s, facing: T.f, humo: true })) {
        // respaldo: bloque con orugas, taladro y motor
        ctx.scale(s * T.f, s);
        rfill(ctx, -116, -40, 192, 40, 20, '#334155', O, 4);
        rfill(ctx, -104, -102, 166, 68, 20, '#94a3b8', O, 4);
        circle(ctx, 12, -110, 30, '#64748b', O, 4);
        circle(ctx, 22, -114, 10, '#f87171', O, 2);
        ctx.beginPath(); ctx.moveTo(80, -96); ctx.lineTo(156, -67); ctx.lineTo(80, -38); ctx.closePath();
        ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.stroke();
        rfill(ctx, -122, -98, 26, 46, 8, '#fde047', O, 3);
      }
      ctx.restore();
      // taladro girando a toda velocidad (aviso de la embestida)
      var tip = excTip(b);
      if ((b.estado === 'aviso' && b.ataque === 'embestida') || (b.estado === 'golpe' && b.ataque === 'embestida')) {
        ctx.save();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
        for (var i = 0; i < 3; i++) {
          var a0 = t * 22 + i * 2.1;
          ctx.beginPath(); ctx.arc(tip.x - b.facing * 40, tip.y, 46 + i * 12, a0, a0 + 1.1); ctx.stroke();
        }
        ctx.restore();
        halo(ctx, tip.x, tip.y, 90, '253,224,71', 0.35 + 0.2 * Math.sin(t * 20));
        if (b.estado === 'golpe') {
          // líneas de velocidad
          ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 6;
          for (var j = 0; j < 5; j++) {
            var ly = b.y - 40 - j * 60, lx = b.x - b.facing * (330 + (j % 2) * 60);
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - b.facing * (120 + j * 15), ly); ctx.stroke();
          }
          ctx.restore();
        }
      }
      // humo/polvo del techo (aviso de rocas)
      if (b.estado === 'aviso' && b.ataque === 'rocas') {
        ctx.save(); ctx.fillStyle = 'rgba(168,162,158,0.7)';
        var top = -230 - camDY(arena);
        for (var k = 0; k < 14; k++) {
          var px = (k * 97 + t * 40) % 1300 - 170, py = top + ((t * 260 + k * 53) % 160);
          circle(ctx, px, py, 5 + (k % 3) * 2, 'rgba(168,162,158,0.7)', null);
        }
        ctx.restore();
        // las rocas que se sueltan del techo, temblando justo encima de su sombra (se ven por encima del jefe)
        var rocas = b.rocas || [];
        for (var rq = 0; rq < rocas.length; rq++) {
          var rx0 = rocas[rq] + Math.sin(t * 40 + rq * 1.7) * 3, ry0 = top + 75 + Math.abs(Math.sin(t * 9 + rq)) * 6;
          if (!art('roca', ctx, rx0, ry0, { r: 28, t: t, rot: Math.sin(t * 12 + rq) * 0.2 })) {
            circle(ctx, rx0, ry0, 28, '#78716c', O, 3);
            circle(ctx, rx0 - 8, ry0 - 8, 7, '#a8a29e', null);
          }
          // polvillo que cae en la vertical de la roca
          for (var dq = 0; dq < 3; dq++) {
            var dy = ((t * 320 + dq * 90 + rq * 37) % 260);
            circle(ctx, rocas[rq] + Math.sin(dq * 2 + rq) * 12, ry0 + 36 + dy, 3 + (dq % 2), 'rgba(214,211,209,0.85)', null);
          }
        }
      }
      // clavada: piedras y estrellitas; aturdida: estrellas
      if (b.estado === 'mareado' && (b.sub === 'clavada' || b.sub === 'aturdida')) {
        mareoStars(ctx, b.x - b.facing * 20, b.y - 170 * s, t, 90);
      }
      // "!" encima de la cúpula durante el aviso
      if (b.estado === 'aviso') { var pe = toWorld(T, 40, -175); exclam(ctx, pe.x + b.facing * 40, pe.y, 2.4); }
      ctx.restore();
    },
    zones: function (b) { return excZonas(b); },
    onHit: function (b, dmg, kind, zona, fromX, arena) {
      if (b.estado === 'intro' || b.estado === 'derrota') return 0;
      var tipo = zona && zona.tipo;
      if (tipo === 'armadura' && kind !== 'equipo') {
        if (Math.random() < 0.2) call(arena, 'text', zona.x, zona.y - 40, '¡CLINC!', '#e5e7eb', 26);
        return 0;
      }
      var d = num(dmg, 1) * (tipo === 'debil' && kind !== 'equipo' ? 2 : 1);   // el ataque en equipo hace 10 justos (§12.4)
      b.hitT = 0.12;
      if (kind === 'equipo') d = golpeEquipo(b, d, EXC_LB, 2, 0.5, 0, arena, zona);
      return d;
    },
    minHp: function (b) { return piso(b, EXC_LB, 2, 0.5, 0); },
    defeat: function (b, t, arena) {
      b.estado = 'derrota'; b.defT = t; b.t += 1 / 60;
      b.tiembla = t < 2.2 ? 0.8 : 0;
      if (t > b.pops * 0.22 && b.pops < 10) {
        b.pops++;
        var px = b.x + rnd(-200, 200), py = b.y - rnd(30, 300);
        call(arena, 'parts', px, py, '#fb923c', 12, 240, 'dot');
        call(arena, 'parts', px, py, '#cbd5e1', 8, 220, 'tuerca');
        call(arena, 'sfx', 'explosion'); call(arena, 'shake', 0.3);
        if (b.pops === 1) call(arena, 'text', b.x, b.y - EXC_ALTO - 20, '¡POP!', '#fde047', 60);
      }
      if (t >= 2.2 && !b._desmonta) {
        b._desmonta = true;
        // ¡se desmonta! tuercas, engranajes y el taladro por los aires
        call(arena, 'parts', b.x, b.y - 150, '#cbd5e1', 30, 380, 'tuerca');
        call(arena, 'parts', b.x, b.y - 150, '#fde68a', 24, 340, 'star');
        call(arena, 'parts', b.x, b.y - 60, '#a8a29e', 24, 300, 'dot');
        call(arena, 'sfx', 'explosion'); call(arena, 'sfx', 'bigPunch'); call(arena, 'shake', 0.7); call(arena, 'flash', 0.5);
        call(arena, 'text', b.x, b.y - 260, '¡Se desmonta!', '#fde68a', 44);
      }
      return t >= 3.2;
    },
    hint: function (b, arena) {
      if (b.estado === 'aviso' && b.ataque === 'embestida') return '¡Va a embestir! Cuando salga «¡SALTA!», salta su taladro con {salto} (o mantén {disparo}: escudo de energía).';
      if (b.estado === 'aviso' && b.ataque === 'onda') return '¡Onda de tierra! ¡Salta con {salto}!';
      if ((b.estado === 'aviso' || b.estado === 'golpe') && b.ataque === 'rocas') return '¡Caen rocas! Corre al hueco sin sombras o mantén {disparo} para el escudo de energía.';
      if (b.estado === 'mareado' && b.sub === 'clavada') return '¡Se ha clavado! Ponte detrás y golpea el MOTOR con {ataque}.';
      if (b.estado === 'mareado' && b.sub === 'aturdida') return '¡La has parado! ¡Rápido, al motor de atrás!';
      return 'Su punto débil es el MOTOR brillante de atrás: ¡salta su embestida y golpéalo con {ataque}!';
    },
    debug: function (b) {
      var z = excZonas(b), d = null;
      for (var i = 0; i < z.length; i++) if (z[i].tipo === 'debil') { d = { x: z[i].x, y: z[i].y }; break; }
      var av = b.estado === 'aviso';
      return { fase: b.fase, estado: estadoDebug(b), aviso: av, ataque: (av || b.estado === 'golpe') ? b.ataque : null, debil: d };
    }
  };

  // ===========================================================================
  //  2. EL DRON NODRIZA  (§12.7)
  //  Flota a la derecha. Compuerta de la panza (abre 2,5 s cada 6 s —5 s en la fase 2—, suelta 3 mini-drones y es
  //  su punto débil), rayo barredor a la altura de la fusión y bombas que caen en vertical sobre su sombra.
  // ===========================================================================
  // OJO: la caja de pistas de gigantes3.js lee b.rayoY, b.ataque === 'rayo' y b.estado 'aviso'/'golpe' de la Nodriza
  // (para no tapar la franja roja del rayo): si cambian esos nombres, hay que avisar al dueño de gigantes3.js.
  // La compuerta sale dos veces por ronda, alternada con el rayo y las bombas: así se abre cada 6 s (5 s en la fase 2).
  var NOD_TABLA = { 1: ['compuerta', 'rayo', 'compuerta', 'bombas'], 2: ['compuerta', 'rayo', 'compuerta', 'bombas'] };
  var NOD_LB = { 1: 22, 2: 0 };
  var NOD_ALTO = 300;
  function nodS() { return NOD_ALTO / altoArte('dronNodriza'); }
  // origen del dibujo: el centro lógico (b.y − alto/2) desplazado para que la caja visible quede centrada
  function nodT(b) {
    var s = nodS(), cj = caja('dronNodriza'), off = 0;
    if (cj) off = -(cj[1] + cj[3]) / 2 * s;
    var cy = b.y - NOD_ALTO / 2;
    var rot = num(b.rot, 0);
    return { x: b.x, y: cy + off + num(b.introY, 0) + num(b.caida, 0), rot: rot, sq: 1, s: s, f: b.facing };
  }
  function nodZonas(b) {
    if (b.estado === 'intro' || b.estado === 'derrota' || b.hp <= 0) return [];
    var T = nodT(b), s = T.s, out = [];
    if (b.abierta) {
      var c = punto('dronNodriza', 'compuerta') || [25, 48, 32];
      var pc = toWorld(T, c[0], c[1]);
      out.push({ x: pc.x, y: pc.y, r: c[2] * s + 10, tipo: 'debil', id: 'compuerta' });
    }
    var po = toWorld(T, 101, -8);
    var pb = toWorld(T, 0, -3);
    var pq = toWorld(T, -105, -10);
    out.push({ x: po.x, y: po.y, r: 32 * s, tipo: 'cuerpo', id: 'ojo' });
    out.push({ x: pb.x, y: pb.y, r: 70 * s, tipo: 'cuerpo', id: 'cuerpo' });
    out.push({ x: pq.x, y: pq.y, r: 42 * s, tipo: 'cuerpo', id: 'cola' });
    return out;
  }
  function nodOjo(b) { return toWorld(nodT(b), 101, -8); }
  function nodPanza(b) { var c = punto('dronNodriza', 'compuerta') || [25, 48, 32]; return toWorld(nodT(b), c[0], c[1]); }

  var NOD_CADA = { 1: 6.0, 2: 5.0 };   // la compuerta se abre cada 6 s (cada 5 s en la fase 2)
  // altura del rayo: apunta a la fusión pero nunca a la franja central, donde no se podría esquivar
  // (la fusión voladora mide 300 y su centro va de y = 0 a 320): siempre hay hueco arriba o abajo
  function nodRayoY(f) { return f.cy < 160 ? Math.min(f.cy, 105) : Math.max(f.cy, 215); }
  function nodRayo(b, arena) {
    var o = nodOjo(b);
    call(arena, 'spawnBeam', { y: b.rayoY, x1: o.x, x2: b.facing < 0 ? A_L(arena) - 200 : A_R(arena) + 200, dmg: 1, life: 0.6, ancho: 26 });
    call(arena, 'sfx', 'laser'); call(arena, 'shake', 0.2);
    b.rayos--;
  }
  // descanso tras el rayo o las bombas, para que la compuerta vuelva a abrirse justo a su hora
  function nodHueco(b) {
    var cada = NOD_CADA[b.fase] || 6;
    return clamp(cada - AVISO - num(b.desdeApertura, 0), 0.3, 2.0);
  }
  function nodEmpezar(b, arena, f, tabla, rapido) {
    var at = sacarAtaque(b, tabla);
    empezarAviso(b, at);
    b.avisoLen = AVISO;
    if (at === 'compuerta') { call(arena, 'sfx', 'door'); }
    else if (at === 'rayo') { b.avisoLen = 1.2; b.rayoY = nodRayoY(f); b.rayos = rapido ? 2 : 1; call(arena, 'sfx', 'hack'); }
    else if (at === 'bombas') {
      // 3 bombas: una sobre la fusión y las otras hacia un lado; hacia el lado con más sitio no cae ninguna
      var cen = (A_L(arena) + A_R(arena)) / 2;
      var esc = Math.abs(f.x - cen) > 150 ? sgn(cen - f.x) : sgn(b.x - f.x);
      b.bombas = [];
      // posiciones (en pasos de 230 px): 0 = sobre la fusión; −1, −2 hacia un lado; si no caben, +2, +3 al otro
      // (más allá del hueco seguro hacia el que hay que escapar)
      var pasos = [0, -1, -2, 2, 3];
      for (var i = 0; i < pasos.length && b.bombas.length < 3; i++) {
        var bx = f.x + esc * pasos[i] * 230 + (i ? rnd(-15, 15) : 0);
        if (i > 0 && (bx < A_L(arena) + 60 || bx > A_R(arena) - 60)) continue;
        bx = clamp(bx, A_L(arena) + 60, A_R(arena) - 60);
        b.bombas.push({ x: bx, y: f.cy });
        call(arena, 'warn', bx, { r: 60, life: AVISO + 0.95, y: f.y });
      }
      call(arena, 'sfx', 'robot');
    }
  }

  var NODRIZA = {
    nombre: 'DRON NODRIZA',
    hp: 44,
    create: function (arena, opts) {
      var b = { x: 830, y: 150 + NOD_ALTO / 2, alto: NOD_ALTO, hp: 44, maxHp: 44, facing: -1, fase: 1,
        estado: 'descanso', st: 0, t: 0, descanso: 1.6, ataque: null, abierta: false, cria: 0,
        rayoY: 0, rayos: 0, bombas: [], baseCy: 150, homeX: 830, detrasT: 0, pausa: 0, hitT: 0,
        introY: 0, caida: 0, rot: 0, defT: 0, pops: 0, splash: false, abiertaE: 0, desdeApertura: 99, deuda: 0 };
      ritmoReset(b);
      var fz = opts && opts.fase;
      if (fz === 2 || fz === 3) { b.hp = NOD_LB[1]; b.fase = 2; }
      else if (fz === 'victoria') { b.hp = 0; b.fase = 2; b.estado = 'derrota'; }
      return b;
    },
    intro: function (b, t, arena) {
      b.estado = 'intro'; b.t += 1 / 60;
      var k = clamp(t / 1.6, 0, 1);
      b.introY = -(1 - ease(k)) * 520;
      if (t < 0.05) call(arena, 'sfx', 'jetpack');
      if (t >= 1.6 && !b._introMsg) { b._introMsg = true; call(arena, 'sfx', 'roar'); call(arena, 'shake', 0.4); call(arena, 'msg', '¡EL DRON NODRIZA!', 1.6); }
      if (t >= 2.4) { b.introY = 0; descanso(b, 1.0); return true; }
      return false;
    },
    update: function (b, dt, arena) {
      var f = fus(arena), tabla = NOD_TABLA[b.fase] || NOD_TABLA[1], rapido = b.fase >= 2;
      b.t += dt; b.st += dt; b.faseT += dt;
      if (b.hitT > 0) b.hitT -= dt;
      var pisoAhora = piso(b, NOD_LB, 2, 0.5, 0);
      // flota subiendo y bajando, con el centro dentro de los límites de §12.1
      var gy = GY(arena), cyMin = -150 + NOD_ALTO / 2, cyMax = gy - NOD_ALTO / 2 - 40;
      var objCy = clamp(b.baseCy + Math.sin(b.t * 0.8) * 70, cyMin, cyMax);
      var cy = b.y - NOD_ALTO / 2;
      cy += (objCy - cy) * Math.min(1, 2.5 * dt);
      b.y = clamp(cy, cyMin, cyMax) + NOD_ALTO / 2;
      var objX = b.homeX + Math.sin(b.t * 0.45) * 50;
      b.x += clamp(objX - b.x, -90 * dt, 90 * dt);
      b.rot = Math.sin(b.t * 1.3) * 0.03 + (b.hitT > 0 ? Math.sin(b.t * 80) * 0.02 : 0);
      // mira a la fusión (se gira si se le pone detrás un rato)
      if (sgn(f.x - b.x) !== b.facing && Math.abs(f.x - b.x) > 120) b.detrasT += dt; else b.detrasT = 0;
      if (b.detrasT > 1.4 && b.estado === 'descanso') { b.detrasT = 0; b.facing = -b.facing; call(arena, 'sfx', 'robot'); }

      // la COMPUERTA lleva su propio reloj: abierta 2,5 s (suelta 3 mini-drones) y vuelve a abrirse cada
      // NOD_CADA s (6 s; 5 s en la fase 2). En la fase 2 sigue abierta mientras empieza el aviso del ataque siguiente.
      b.desdeApertura = num(b.desdeApertura, 99) + dt;
      if (b.abierta) {
        b.abiertaE = num(b.abiertaE, 0) + dt;
        var tiempos = [0.25, 0.85, 1.45];
        if (b.cria < 3 && b.abiertaE >= tiempos[b.cria]) {
          var pz = nodPanza(b);
          call(arena, 'spawnMinion', { x: pz.x + rnd(-20, 20), y: pz.y + 30, kind: 'miniDron', hp: 1, persigue: 110 });
          call(arena, 'sfx', 'miniRobot');
          b.cria++;
        }
        if (b.abiertaE >= 2.5) { b.abierta = false; call(arena, 'sfx', 'door'); }
      }

      if (b.estado === 'intro') { descanso(b, 1.0); return; }

      if (b.estado === 'descanso') {
        var nf = faseDe(b.hp, NOD_LB, 2);
        if (nf > b.fase && !b.abierta && b.faseT >= FASE_MIN - 0.5) {
          b.fase = nf; ritmoReset(b); deudaNuevaFase(b); b.pausa = 1.2;
          call(arena, 'msg', '¡FASE 2: DOBLE RAYO!', 1.6); call(arena, 'sfx', 'roar'); call(arena, 'shake', 0.4);
          return;
        }
        if (b.pausa > 0) { b.pausa -= dt; return; }
        if (b.st >= descansoDe(b, pisoAhora) && !b.abierta) nodEmpezar(b, arena, f, tabla, rapido);
        return;
      }

      if (b.estado === 'aviso') {
        if (b.st >= num(b.avisoLen, AVISO)) {
          empezarGolpe(b);
          if (b.ataque === 'compuerta') {
            b.abierta = true; b.abiertaE = 0; b.cria = 0; b.desdeApertura = 0;
            call(arena, 'sfx', 'door'); call(arena, 'text', b.x, b.y + 30, '¡Compuerta abierta!', '#fde047', 34);
          } else if (b.ataque === 'rayo') {
            nodRayo(b, arena);
          } else if (b.ataque === 'bombas') {
            // cada bomba cae EN VERTICAL justo encima de su sombra (gravedad 900): solo esa columna es peligrosa
            var top = -250 - camDY(arena);
            for (var k = 0; k < b.bombas.length; k++) {
              call(arena, 'spawnShot', { x: b.bombas[k].x, y: top - k * 30, vx: 0, vy: 300, r: 22, dmg: 1, life: 4, kind: 'bomba', gravity: 900 });
            }
            call(arena, 'sfx', 'shieldThrow');
          }
        }
        return;
      }

      if (b.estado === 'golpe') {
        if (b.ataque === 'compuerta') {
          // fase 1: espera a que se cierre; fase 2: a los 1,2 s ya avisa el ataque siguiente (con la compuerta aún abierta)
          if (!b.abierta || (rapido && b.st >= 1.2)) {
            finAtaque(b, tabla);
            if (rapido && b.abierta) nodEmpezar(b, arena, f, tabla, rapido);
            else descanso(b, 0.3);
          }
          return;
        }
        if (b.ataque === 'rayo') {
          if (b.rayos > 0 && b.st >= 0.45) nodRayo(b, arena);          // fase 2: el segundo rayo, en la misma línea avisada
          if (b.st >= (rapido ? 1.1 : 0.65)) { finAtaque(b, tabla); descanso(b, nodHueco(b)); }
          return;
        }
        if (b.ataque === 'bombas') {
          if (b.st >= 0.7) { finAtaque(b, tabla); descanso(b, nodHueco(b)); }
          return;
        }
        descanso(b, 1.0);
        return;
      }
      descanso(b, 1.0);
    },
    draw: function (ctx, b, arena) {
      var t = num(arena && arena.t, 0), T = nodT(b), s = T.s;
      if (b.estado === 'derrota' && num(b.defT, 0) > 3.4) return;
      ctx.save();
      ctx.save();
      aplicar(ctx, T);
      var abierta = !!b.abierta;
      if (!art('dronNodriza', ctx, 0, 0, { scale: s, facing: T.f, abierta: abierta, cria: abierta })) {
        ctx.scale(s * T.f * 1.4, s * 1.4);
        ctx.beginPath(); ctx.ellipse(0, -2, 96, 44, 0, 0, PI * 2);
        ctx.fillStyle = '#94a3b8'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.stroke();
        circle(ctx, 68, -6, 20, '#1f2937', O, 3); circle(ctx, 72, -6, 9, '#f87171', null);
        ctx.beginPath(); ctx.ellipse(18, 34, 22, 7, 0, 0, PI * 2); ctx.fillStyle = abierta ? '#fde047' : '#0b1020'; ctx.fill();
      }
      ctx.restore();
      var ojo = nodOjo(b), panza = nodPanza(b);
      // aviso del rayo: el ojo brilla y una FRANJA roja del ancho del rayo (26) marca la altura peligrosa,
      // con una línea discontinua gruesa encima y un "!" en el otro extremo (lejos del jefe, que no lo tape)
      if ((b.estado === 'aviso' && b.ataque === 'rayo') || (b.estado === 'golpe' && b.ataque === 'rayo' && b.rayos > 0)) {
        var k = b.estado === 'golpe' ? 1 : clamp(b.st / 1.0, 0, 1);
        halo(ctx, ojo.x, ojo.y, 50 + 40 * k, '248,113,113', 0.5 + 0.4 * k);
        var x2 = b.facing < 0 ? A_L(arena) - 200 : A_R(arena) + 200;
        var xa = Math.min(ojo.x, x2), xb = Math.max(ojo.x, x2), RW = 26;
        var parp = Math.sin(t * 18) * 0.5 + 0.5;
        ctx.save();
        // franja translúcida que parpadea, con sus bordes marcados en rojo oscuro (se ve sobre el cielo claro)
        ctx.fillStyle = 'rgba(248,113,113,' + (0.22 + 0.16 * parp).toFixed(3) + ')';
        ctx.fillRect(xa, b.rayoY - RW / 2, xb - xa, RW);
        ctx.strokeStyle = 'rgba(153,27,27,0.75)'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xa, b.rayoY - RW / 2); ctx.lineTo(xb, b.rayoY - RW / 2);
        ctx.moveTo(xa, b.rayoY + RW / 2); ctx.lineTo(xb, b.rayoY + RW / 2);
        ctx.stroke();
        // línea discontinua gruesa que corre hacia la fusión
        ctx.globalAlpha = 0.6 + 0.4 * parp;
        ctx.setLineDash([26, 16]); ctx.lineDashOffset = -t * 120;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(ojo.x, b.rayoY); ctx.lineTo(x2, b.rayoY); ctx.stroke();
        ctx.restore();
        var xEx = b.facing < 0 ? A_L(arena) + 120 : A_R(arena) - 120;
        exclam(ctx, xEx, b.rayoY, 1.5);
      }
      // el rayo sale del ojo: un chorro rojo del ojo a la altura del rayo
      if (b.estado === 'golpe' && b.ataque === 'rayo' && (b.st < 0.6 || (b.st > 0.45 && b.st < 1.05 && b.fase >= 2))) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = 'rgba(248,113,113,0.55)'; ctx.lineWidth = 34;
        ctx.beginPath(); ctx.moveTo(ojo.x, ojo.y); ctx.lineTo(ojo.x, b.rayoY); ctx.stroke();
        ctx.strokeStyle = '#fee2e2'; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(ojo.x, ojo.y); ctx.lineTo(ojo.x, b.rayoY); ctx.stroke();
        ctx.restore();
        halo(ctx, ojo.x, ojo.y, 70, '254,202,202', 0.8);
      }
      // aviso de la compuerta: las puertas tiemblan y brillan
      if (b.estado === 'aviso' && b.ataque === 'compuerta') {
        halo(ctx, panza.x + Math.sin(t * 50) * 4, panza.y, 70, '253,224,71', 0.35 + 0.25 * Math.sin(t * 18));
      }
      // compuerta abierta: brillo extra (además del halo del motor)
      if (b.abierta) halo(ctx, panza.x, panza.y, 80, '253,224,71', 0.35 + 0.15 * Math.sin(t * 8));
      // aviso de las bombas: la panza brilla en naranja y las 3 bombas salen disparadas hacia arriba
      // (sin daño: luego caen en vertical sobre sus sombras)
      if (b.estado === 'aviso' && b.ataque === 'bombas') {
        halo(ctx, panza.x, panza.y, 80, '251,146,60', 0.4 + 0.2 * Math.sin(t * 20));
        var bk = clamp((b.st - 0.35) / 0.7, 0, 1);
        if (bk > 0 && bk < 1 && b.bombas) {
          var techo = -250 - camDY(arena);
          for (var q = 0; q < b.bombas.length; q++) {
            var qx = lerp(panza.x, b.bombas[q].x, ease(bk)), qy = lerp(panza.y, techo, bk) - Math.sin(bk * PI) * 80;
            circle(ctx, qx, qy, 20, '#334155', O, 3);
            circle(ctx, qx - 6, qy - 6, 5, 'rgba(255,255,255,0.5)', null);
            ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(qx, qy - 20); ctx.lineTo(qx + 6, qy - 30); ctx.stroke(); ctx.restore();
            circle(ctx, qx + 6, qy - 31, 4 + Math.abs(Math.sin(t * 30)) * 3, '#fde047', null);
          }
        }
      }
      if (b.estado === 'aviso') exclam(ctx, ojo.x + b.facing * 90, ojo.y - 20, 2.4);
      ctx.restore();
    },
    zones: function (b) { return nodZonas(b); },
    onHit: function (b, dmg, kind, zona, fromX, arena) {
      if (b.estado === 'intro' || b.estado === 'derrota') return 0;
      var tipo = zona && zona.tipo;
      if (tipo === 'armadura' && kind !== 'equipo') return 0;
      var d = num(dmg, 1) * (tipo === 'debil' && kind !== 'equipo' ? 2 : 1);   // el ataque en equipo hace 10 justos (§12.4)
      b.hitT = 0.12;
      if (kind === 'equipo') d = golpeEquipo(b, d, NOD_LB, 2, 0.5, 0, arena, zona);
      return d;
    },
    minHp: function (b) { return piso(b, NOD_LB, 2, 0.5, 0); },
    defeat: function (b, t, arena) {
      b.estado = 'derrota'; b.defT = t; b.t += 1 / 60; b.abierta = false;
      b.rot = Math.sin(t * 30) * 0.05 + (t > 2 ? (t - 2) * 0.5 * b.facing : 0);
      if (t < 2 && t > b.pops * 0.22 && b.pops < 9) {
        b.pops++;
        var T = nodT(b), px = b.x + rnd(-180, 180), py = T.y + rnd(-100, 80);
        call(arena, 'parts', px, py, '#fb923c', 12, 240, 'dot');
        call(arena, 'parts', px, py, '#cbd5e1', 8, 220, 'tuerca');
        call(arena, 'sfx', 'explosion'); call(arena, 'shake', 0.3);
        if (b.pops === 1) call(arena, 'text', b.x, T.y - 200, '¡POP!', '#fde047', 60);
      }
      if (t >= 2) {
        // se cae al río
        var k = t - 2;
        b.caida = 0.5 * 1100 * k * k;
        var T2 = nodT(b);
        if (!b.splash && T2.y > GY(arena) + 40) {
          b.splash = true;
          call(arena, 'parts', b.x, GY(arena) - 10, '#7dd3fc', 30, 380, 'dot');
          call(arena, 'parts', b.x, GY(arena) - 10, '#e0f2fe', 20, 300, 'star');
          call(arena, 'sfx', 'splash'); call(arena, 'shake', 0.6);
          call(arena, 'text', b.x, GY(arena) - 140, '¡AL RÍO!', '#e0f2fe', 50);
        }
      }
      return t >= 3.6;
    },
    hint: function (b, arena) {
      if (b.abierta) return '¡La compuerta está abierta! ¡Es su punto débil: dale con {ataque}!';
      if (b.estado === 'aviso' && b.ataque === 'compuerta') return '¡Va a abrir la compuerta de la panza! Prepárate…';
      if (b.estado === 'aviso' && b.ataque === 'rayo') return '¡Rayo! Sal de la línea roja volando arriba o abajo, o mantén {disparo} para el escudo.';
      if (b.ataque === 'bombas' && (b.estado === 'aviso' || b.estado === 'golpe')) return '¡Bombas! Vuela fuera de las sombras o mantén {disparo} para el escudo.';
      return 'Espera a que abra la compuerta de la panza: ¡ese es su punto débil!';
    },
    debug: function (b) {
      var z = nodZonas(b), d = null;
      for (var i = 0; i < z.length; i++) if (z[i].tipo === 'debil') { d = { x: z[i].x, y: z[i].y }; break; }
      var av = b.estado === 'aviso';
      return { fase: b.fase, estado: estadoDebug(b), aviso: av, ataque: (av || b.estado === 'golpe') ? b.ataque : null, debil: d };
    }
  };

  // ===========================================================================
  //  3. ROBOVILL GIGANTE  (§12.7)
  //  Fase 1: brazos cambiantes (martillo, sierra, cañón, pinza; el cambio de brazo es el aviso).
  //  Fase 2: taladro bajo tierra (sale debajo: el escudo NO lo para) y se queda mareado.
  //  Fase 3: alas, vuela, lluvia de mini-robots y cañón. minHp = 1: el golpe final es SIEMPRE
  //  el ATAQUE EN EQUIPO (pedirEquipo a ≤ 7). Derrota = SU HUIDA (no se destruye).
  // ===========================================================================
  var ROB_TABLA = { 1: ['martillo', 'sierra', 'canon', 'pinza'], 2: ['taladro'], 3: ['lluvia', 'canon'] };
  var ROB_LB = { 1: 46.2, 2: 23.1, 3: 0 };
  var ROB_ALTO = 480;
  // taladro de la fase 2: se hunde girando (0,45 s), el montón de tierra corre hacia la fusión (hasta 0,75 s) y la
  // marca dura 1,7 s (el contrato pide ≥ 1,2) con el círculo de ± 90 px; con media fusión final (110 px) basta
  // moverse ≈ 200 px a 190 px/s (≈ 1,05 s) para salir: se esquiva apartándose (con ≈ 0,6 s de reacción) o saltando.
  // Sin gema solo ≈ 2 s (antes 3,2 s): la vida no se queda congelada mientras el niño espera.
  var ROB_TAL_HUNDE = 0.45, ROB_TAL_BAJA = 0.75, ROB_TAL_MARCA = 1.7, ROB_TAL_R = 90;
  var ROB_NOMBRE_FASE = { 2: '¡FASE 2: EL TALADRO!', 3: '¡FASE 3: LAS ALAS!' };
  function robS() { return ROB_ALTO / altoArte('robovill'); }
  function robVar() { return look().robovill === 'B' ? 'B' : 'A'; }
  function robT(b) {
    var sq = num(b.sq, 1);
    var shx = num(b.tiembla, 0) > 0 ? Math.sin(b.t * 70) * 5 * b.tiembla : 0;
    return { x: b.x + shx, y: b.y + num(b.introY, 0) + num(b.hundir, 0) + num(b.escY, 0), rot: num(b.lean, 0), sq: sq, s: robS(), f: b.facing };
  }
  function robGema(b) {
    var v = robVar(), g = punto('robovill', 'gema', v) || (v === 'B' ? [0, -128, 20] : [14, -110, 20]);
    var p = toWorld(robT(b), g[0], g[1]);
    return { x: p.x, y: p.y, r: g[2] * robS() + 12 };
  }
  // muñeca del brazo cambiante (donde va la herramienta)
  function robBrazo(b) { return toWorld(robT(b), 114, robVar() === 'B' ? -116 : -104); }
  function robZonas(b) {
    if (b.estado === 'intro' || b.estado === 'derrota' || b.hp <= 0) return [];
    var T = robT(b), s = T.s;
    if (b.bajoTierra) {
      // bajo tierra: solo asoma el montón de tierra (no le afecta nada)
      return [{ x: b.x, y: num(b.sueloY, 470) - 30, r: 70, tipo: 'armadura', id: 'tierra' }];
    }
    var g = robGema(b), out = [{ x: g.x, y: g.y, r: g.r, tipo: 'debil', id: 'gema' }];
    if (robVar() === 'B') {
      var pb = toWorld(T, 0, -176), ph = toWorld(T, 40, -205), pd = toWorld(T, 0, -55);
      out.push({ x: pb.x, y: pb.y, r: 76 * s, tipo: 'cuerpo', id: 'cuerpo' });
      out.push({ x: ph.x, y: ph.y, r: 40 * s, tipo: 'cuerpo', id: 'cabeza' });
      out.push({ x: pd.x, y: pd.y, r: 42 * s, tipo: 'cuerpo', id: 'taladro' });
    } else {
      var pt = toWorld(T, 0, -118), pk = toWorld(T, 4, -205), pl = toWorld(T, 0, -40);
      out.push({ x: pt.x, y: pt.y, r: 72 * s, tipo: 'cuerpo', id: 'cuerpo' });
      out.push({ x: pk.x, y: pk.y, r: 44 * s, tipo: 'cuerpo', id: 'cabeza' });
      out.push({ x: pl.x, y: pl.y, r: 42 * s, tipo: 'cuerpo', id: 'piernas' });
    }
    return out;
  }
  function robLim(arena) { return { min: A_L(arena) + 260, max: A_R(arena) - 260 }; }
  var BRAZO_DE = { martillo: 'martillo', sierra: 'sierra', canon: 'canon', pinza: 'pinza', lluvia: 'canon' };

  function robFuego(b, arena, f) {
    // una bola del cañón hacia la fusión
    var m = toWorld(robT(b), 170, robVar() === 'B' ? -116 : -104);
    var dx = f.x - m.x, dy = f.cy - m.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    call(arena, 'spawnShot', { x: m.x, y: m.y, vx: dx / d * 520, vy: dy / d * 520, r: 18, dmg: 1, life: 3, kind: 'bola', gravity: 0 });
    call(arena, 'sfx', 'laser');
    call(arena, 'parts', m.x, m.y, '#fb923c', 6, 160, 'dot');
  }

  var ROBOVILL = {
    nombre: 'ROBOVILL GIGANTE',
    hp: 70,
    create: function (arena, opts) {
      var b = { x: 780, y: GY(arena), alto: ROB_ALTO, hp: 70, maxHp: 70, facing: -1, fase: 1,
        estado: 'descanso', st: 0, t: 0, descanso: 1.4, ataque: null, brazo: 'martillo', brazoPrev: 'martillo',
        alas: 'cerradas', taladro: 0.3, sq: 1, lean: 0, tiembla: 0, hitT: 0, introY: 0, hundir: 0, escY: 0,
        bajoTierra: false, salto: null, objX: 0, disparos: 0, pedido: false, pedidoT: 0, vuelaK: 0,
        detrasT: 0, pausa: 0, sub: '', defT: 0, homeX: 780, agarre: false, hopX: null, hopX0: 0, deuda: 0 };
      ritmoReset(b);
      var fz = opts && opts.fase;
      if (fz === 2) { b.hp = ROB_LB[1]; b.fase = 2; }
      else if (fz === 3) { b.hp = ROB_LB[2]; b.fase = 3; b.alas = 'abiertas'; b.vuelaK = 1; b.y = 290; }
      else if (fz === 'victoria') { b.hp = 0; b.fase = 3; b.estado = 'derrota'; }
      return b;
    },
    intro: function (b, t, arena) {
      // baja del cielo con las alas abiertas y aterriza de golpe
      b.estado = 'intro'; b.t += 1 / 60;
      b.alas = t < 1.6 ? 'abiertas' : 'cerradas';
      var k = clamp(t / 1.5, 0, 1);
      b.introY = -(1 - k * k) * 760;
      if (t < 0.05) call(arena, 'sfx', 'escape');
      if (t >= 1.5 && !b._aterriza) {
        b._aterriza = true;
        call(arena, 'shake', 0.8); call(arena, 'sfx', 'bigPunch'); call(arena, 'sfx', 'robot');
        call(arena, 'parts', b.x - 120, GY(arena) - 8, '#d6d3d1', 18, 280, 'dot');
        call(arena, 'parts', b.x + 120, GY(arena) - 8, '#d6d3d1', 18, 280, 'dot');
      }
      if (t >= 1.7 && !b._ruge) { b._ruge = true; call(arena, 'sfx', 'roar'); call(arena, 'msg', '¡ROBOVILL GIGANTE!', 1.8); }
      b.sq = t >= 1.5 && t < 1.8 ? 1 - 0.1 * Math.sin((t - 1.5) / 0.3 * PI) : 1;
      if (t >= 2.8) { b.introY = 0; b.sq = 1; descanso(b, 0.8); return true; }
      return false;
    },
    update: function (b, dt, arena) {
      var f = fus(arena), gy = GY(arena), lim = robLim(arena);
      b.sueloY = gy;
      var tabla = ROB_TABLA[b.fase] || ROB_TABLA[1];
      b.t += dt; b.st += dt; b.faseT += dt;
      if (b.hitT > 0) b.hitT -= dt;
      if (b.tiembla > 0) b.tiembla = Math.max(0, b.tiembla - dt * 2);
      if (b.pedidoT > 0) b.pedidoT -= dt;
      var pisoAhora = Math.max(1, piso(b, ROB_LB, 3, 7.5, 1));
      if (!b.bajoTierra) cobrarDeuda(b, arena, Math.max(1, pisoDuro(b, ROB_LB, 3, 7.5, 1)));
      b.taladro = (b.estado === 'aviso' && b.ataque === 'taladro') || b.bajoTierra ? 1 : 0.3;

      // ¡AHORA! el golpe final es el ataque en equipo (§12.7)
      if (b.fase >= 3 && b.hp <= 7 && b.rondaOk && b.faseT >= FASE_MIN && b.pedidoT <= 0) {
        b.pedidoT = 9;
        b.pedido = true;
        call(arena, 'pedirEquipo');
        call(arena, 'pista', '¡AHORA! ¡Pulsa {cambio} para el ATAQUE EN EQUIPO!', 5);
        call(arena, 'sfx', 'select');
      }

      // vuelo de la fase 3: los pies entre y = 260 y 320
      if (b.fase >= 3 && !b.bajoTierra) {
        b.alas = 'abiertas';
        b.vuelaK = Math.min(1, b.vuelaK + dt / 1.2);
        var vueloY = 290 + Math.sin(b.t * 1.6) * 30;
        b.y = lerp(gy, vueloY, ease(b.vuelaK));
        b.sq = 1;
      }

      if (b.estado === 'intro') { descanso(b, 0.8); return; }

      if (b.estado === 'descanso') {
        b.lean *= Math.pow(0.02, dt);
        if (b.fase < 3) { b.y = gy; b.sq = lerp(b.sq, 1, Math.min(1, 8 * dt)); }
        b.hundir = 0;
        var nf = faseDe(b.hp, ROB_LB, 3);
        if (nf > b.fase) {
          b.fase = nf; ritmoReset(b); deudaNuevaFase(b); b.pausa = 1.3;
          call(arena, 'msg', ROB_NOMBRE_FASE[nf] || '¡OTRA FASE!', 1.8); call(arena, 'sfx', 'roar'); call(arena, 'shake', 0.6);
          b.tiembla = 1;
          if (nf === 3) { b.alas = 'abiertas'; call(arena, 'sfx', 'escape'); }
          return;
        }
        if (b.pausa > 0) { b.pausa -= dt; return; }
        // se coloca: en el suelo vuelve despacio a su sitio; volando, se queda a un lado de la fusión
        if (b.fase >= 3) {
          var side = b.x >= f.x ? 1 : -1;
          var ox = clamp(f.x + side * 300, lim.min, lim.max);
          b.x += clamp(ox - b.x, -100 * dt, 100 * dt);
        } else {
          // guarda la distancia de pelea: ni encima de la fusión (se taparían) ni lejísimos
          var dxf = b.x - f.x, lejos = sgn(dxf);
          if (Math.abs(dxf) < 320 && b.x + lejos * 10 > lim.min - 60 && b.x + lejos * 10 < lim.max + 60) {
            b.x += lejos * 150 * dt;
            b.lean = Math.sin(b.t * 8) * 0.02;
          } else if (Math.abs(b.x - b.homeX) > 30 && Math.abs(dxf) > 420) {
            b.x += clamp(b.homeX - b.x, -110 * dt, 110 * dt);
            b.lean = Math.sin(b.t * 8) * 0.02;
          }
        }
        // mira a la fusión (se da la vuelta si se le pone detrás un rato)
        if (sgn(f.x - b.x) !== b.facing && Math.abs(f.x - b.x) > 60) b.detrasT += dt; else b.detrasT = 0;
        if (b.detrasT > 1.0) { b.detrasT = 0; b.facing = -b.facing; }
        if (b.st >= descansoDe(b, pisoAhora)) {
          var at = sacarAtaque(b, tabla);
          empezarAviso(b, at);
          b.facing = sgn(f.x - b.x);
          b.avisoLen = AVISO;
          if (BRAZO_DE[at] && at !== 'lluvia') {
            // el cambio de brazo ES el aviso (1,0 s)
            b.brazoPrev = b.brazo; b.brazo = BRAZO_DE[at];
            call(arena, 'sfx', 'transform');
          }
          if (at === 'martillo') {
            // aterriza a un brazo de distancia: la cabeza del martillo cae sobre la fusión
            b.objX = clamp(f.x - b.facing * 270, lim.min - 80, lim.max + 80);
            b.martX = b.objX + b.facing * 270;
            call(arena, 'warn', b.martX, { r: 150, life: AVISO + 0.75, y: gy });
          } else if (at === 'taladro') {
            b.avisoLen = ROB_TAL_BAJA + ROB_TAL_MARCA;   // 0,75 s hundiéndose y bajo tierra + 1,7 s de "!" y círculo
            b.sub = 'baja';
            call(arena, 'sfx', 'drill'); call(arena, 'sfx', 'rumble');
          } else if (at === 'lluvia') {
            call(arena, 'sfx', 'robot');
          }
        }
        return;
      }

      if (b.estado === 'aviso') {
        if (b.ataque === 'taladro') {
          if (b.st < ROB_TAL_HUNDE) {
            // se hunde girando como una peonza
            b.hundir = ease(b.st / ROB_TAL_HUNDE) * (ROB_ALTO + 40);
            b.tiembla = 0.6;
            if (Math.random() < 0.6) call(arena, 'parts', b.x + rnd(-120, 120), gy - 6, '#a8a29e', 2, 200, 'dot');
          } else {
            b.bajoTierra = true;
            b.hundir = ROB_ALTO + 40;
            if (b.st < ROB_TAL_BAJA) {
              // el montón de tierra corre hacia la fusión
              b.x += clamp(f.x - b.x, -1100 * dt, 1100 * dt);
              b.x = clamp(b.x, A_L(arena) + 120, A_R(arena) - 120);
              if (Math.random() < 0.3) call(arena, 'parts', b.x, gy - 6, '#a8a29e', 2, 140, 'dot');
              call(arena, 'shake', 0.12);
            } else if (b.sub !== 'marca') {
              b.sub = 'marca';
              b.objX = clamp(f.x, A_L(arena) + 120, A_R(arena) - 120);
              b.x = b.objX;
              call(arena, 'warn', b.objX, { r: ROB_TAL_R, life: ROB_TAL_MARCA, y: gy });
              call(arena, 'sfx', 'drill');
            }
          }
        } else if (b.ataque === 'pinza') {
          b.lean = -b.facing * 0.06 * ease(b.st);
        } else if (b.ataque === 'martillo') {
          b.sq = 1 - 0.06 * ease(b.st);       // se agacha para saltar
        } else if (b.ataque === 'lluvia') {
          b.lean = Math.sin(b.st * 20) * 0.03;
        }
        if (b.st >= num(b.avisoLen, AVISO)) {
          empezarGolpe(b);
          b.disparos = 0; b.golpeado = false;
          if (b.ataque === 'martillo') {
            b.salto = { x0: b.x, x1: b.objX, dur: 0.75 };
            call(arena, 'sfx', 'jump'); call(arena, 'sfx', 'escape');
          } else if (b.ataque === 'sierra') {
            var m = robBrazo(b);
            call(arena, 'spawnShot', { x: m.x + b.facing * 40, y: gy - 46, vx: b.facing * 560, vy: 0, r: 46, dmg: 1, life: 4, kind: 'sierra', vuelve: true });
            call(arena, 'sfx', 'shieldThrow'); call(arena, 'sfx', 'drill');
          } else if (b.ataque === 'pinza') {
            b.agarre = false;
            call(arena, 'sfx', 'boost');
          } else if (b.ataque === 'taladro') {
            b.bajoTierra = false;
            call(arena, 'sfx', 'drill'); call(arena, 'sfx', 'bigPunch'); call(arena, 'shake', 0.7);
            call(arena, 'parts', b.x, gy - 10, '#a8a29e', 30, 360, 'dot');
            call(arena, 'parts', b.x, gy - 10, '#78350f', 16, 300, 'dot');
            // ¡sale de golpe! (desde abajo: el escudo no lo para; hay que saltar o apartarse)
            var fr = fRect(arena), col = { x: b.x - ROB_TAL_R, y: gy - 300, w: ROB_TAL_R * 2, h: 300 };
            if (overlap(fr, col) && f.y > gy - 120) call(arena, 'hurtFusion', 2, b.x, { fisico: true, desdeAbajo: true, empuje: 220 });
          } else if (b.ataque === 'lluvia') {
            var n = 7;
            for (var i = 0; i < n; i++) {
              var mx = clamp(f.x + (i - (n - 1) / 2) * 125 + rnd(-20, 20), A_L(arena) + 60, A_R(arena) - 60);
              call(arena, 'spawnMinion', { x: mx, y: -220, kind: 'miniRobot', hp: 1, persigue: 110, cayendo: true });
            }
            call(arena, 'sfx', 'miniRobot'); call(arena, 'text', b.x, b.y - 120, '¡Lluvia de mini-robots!', '#fecaca', 36);
          }
        }
        return;
      }

      if (b.estado === 'golpe') {
        var ra = b.ataque;
        if (ra === 'martillo') {
          var sj = b.salto, k = clamp(b.st / sj.dur, 0, 1);
          b.x = lerp(sj.x0, sj.x1, k);
          b.y = gy - Math.sin(k * PI) * 240;
          b.sq = 1;
          b.lean = b.facing * 0.1 * Math.sin(k * PI);
          if (k >= 1 && !b.golpeado) {
            b.golpeado = true; b.y = gy;
            call(arena, 'shake', 0.8); call(arena, 'sfx', 'bigPunch'); call(arena, 'sfx', 'explosion');
            call(arena, 'parts', b.x, gy - 8, '#d6d3d1', 26, 320, 'dot');
            var mxx = b.x + b.facing * 270;
            call(arena, 'parts', mxx, gy - 8, '#fde68a', 16, 300, 'star');
            var fr2 = fRect(arena), zona = { x: mxx - 160, y: gy - ROB_ALTO, w: 320, h: ROB_ALTO };
            if (overlap(fr2, zona)) {
              var res = call(arena, 'hurtFusion', 2, b.x, { fisico: true, empuje: 220 });
              if (res === 'bloqueado') call(arena, 'text', b.x, gy - ROB_ALTO - 20, '¡CLANC!', '#fde68a', 44);
            }
            call(arena, 'spawnWave', { x: mxx + 140, dir: 1, vel: 360, dmg: 1, alto: 40 });
            call(arena, 'spawnWave', { x: mxx - 140, dir: -1, vel: 360, dmg: 1, alto: 40 });
          }
          if (b.st >= sj.dur + 0.25) {
            finAtaque(b, tabla);
            b.estado = 'mareado'; b.sub = 'clavado'; b.st = 0; b.mareoLen = 1.6; b.y = gy;
          }
          return;
        }
        if (ra === 'sierra') {
          b.lean = b.facing * 0.05;
          if (b.st >= 0.7) { finAtaque(b, tabla); descanso(b, 1.2); }
          return;
        }
        if (ra === 'canon') {
          var nb = b.fase >= 3 ? 3 : 4;
          if (b.disparos < nb && b.st >= b.disparos * 0.2) { robFuego(b, arena, f); b.disparos++; b.lean = -b.facing * 0.04; }
          if (b.st >= nb * 0.2 + 0.5) { finAtaque(b, tabla); descanso(b, b.fase >= 3 ? 1.0 : 1.2); }
          return;
        }
        if (ra === 'pinza') {
          // se lanza hacia la fusión con la pinza por delante
          if (b.st < 0.55 && !b.agarre) {
            b.x += b.facing * 560 * dt;
            b.x = clamp(b.x, lim.min - 120, lim.max + 120);
            b.lean = b.facing * 0.08;
            var claw = toWorld(robT(b), 200, robVar() === 'B' ? -116 : -104);
            var fr3 = fRect(arena);
            if (claw.x > fr3.x - 40 && claw.x < fr3.x + fr3.w + 40 && claw.y > fr3.y - 40 && claw.y < fr3.y + fr3.h + 40) {
              b.agarre = true;
              var r3 = call(arena, 'hurtFusion', 2, b.x, { fisico: true, empuje: 300 });
              if (r3 === 'bloqueado') {
                finAtaque(b, tabla);
                b.estado = 'mareado'; b.sub = 'aturdido'; b.st = 0; b.mareoLen = 1.2;
                call(arena, 'text', b.x, gy - ROB_ALTO - 20, '¡CLANC!', '#fde68a', 46); call(arena, 'sfx', 'clink');
                return;
              }
              if (r3 === 'hecho') { call(arena, 'text', claw.x, claw.y - 60, '¡Te agarró!', '#fecaca', 36); call(arena, 'sfx', 'clink'); }
            }
          }
          if (b.st >= 0.95) { finAtaque(b, tabla); descanso(b, 1.2); }
          return;
        }
        if (ra === 'taladro') {
          // sale de la tierra (0,35 s), da un salto mareado hacia atrás (0,6 s) para no quedar tapado
          // por la fusión, y se queda MAREADO y agachado 2,5 s
          if (b.st < 0.35) {
            var kk = clamp(b.st / 0.35, 0, 1);
            b.hundir = (1 - ease(kk)) * (ROB_ALTO + 40);
          } else {
            if (b.hopX === undefined || b.hopX === null) {
              var lado = b.objX < (A_L(arena) + A_R(arena)) / 2 ? 1 : -1;
              b.hopX0 = b.x;
              b.hopX = clamp(b.objX + lado * 330, lim.min - 60, lim.max + 60);
              call(arena, 'sfx', 'jump');
            }
            var hk = clamp((b.st - 0.35) / 0.6, 0, 1);
            b.hundir = 0;
            b.x = lerp(b.hopX0, b.hopX, ease(hk));
            b.y = gy - Math.sin(hk * PI) * 110;
            b.lean = Math.sin(b.t * 14) * 0.08;
            b.facing = sgn(f.x - b.x);
          }
          if (b.st >= 0.95) {
            b.hundir = 0; b.y = gy; b.hopX = null;
            call(arena, 'shake', 0.4); call(arena, 'sfx', 'robot');
            call(arena, 'parts', b.x, gy - 8, '#d6d3d1', 14, 220, 'dot');
            finAtaque(b, tabla);
            b.estado = 'mareado'; b.sub = 'agachado'; b.st = 0; b.mareoLen = 2.5;
            call(arena, 'text', b.x, gy - ROB_ALTO * 0.8, '¡Está mareado!', '#fde68a', 38);
          }
          return;
        }
        if (ra === 'lluvia') {
          if (b.st >= 0.8) { finAtaque(b, tabla); descanso(b, 1.1); }
          return;
        }
        descanso(b, 1.0);
        return;
      }

      if (b.estado === 'mareado') {
        // agachado (§13): más bajito, la gema más cerca del puñetazo de pie
        if (b.fase < 3) {
          b.y = gy;
          b.sq = lerp(b.sq, b.sub === 'aturdido' ? 0.95 : 0.84, Math.min(1, 10 * dt));
        }
        b.lean = Math.sin(b.t * 5) * 0.03;
        if (b.st >= num(b.mareoLen, 2)) { b.sub = ''; descanso(b, 1.0); }
        return;
      }
      descanso(b, 1.0);
    },
    draw: function (ctx, b, arena) {
      var t = num(arena && arena.t, 0), T = robT(b), s = T.s, v = robVar(), gy = GY(arena);
      ctx.save();
      // bajo tierra: un montón de tierra que avanza (y el taladro asomando)
      if (b.bajoTierra || (b.estado === 'aviso' && b.ataque === 'taladro')) {
        var mk = b.bajoTierra ? 1 : clamp(b.st / ROB_TAL_HUNDE, 0, 1);
        ctx.save();
        ctx.beginPath(); ctx.ellipse(b.x, gy, 110 * mk + 20, 34 * mk + 8, 0, PI, 0); ctx.closePath();
        ctx.fillStyle = '#78350f'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.stroke();
        for (var r = 0; r < 6; r++) circle(ctx, b.x - 80 + r * 32 + Math.sin(t * 9 + r) * 4, gy - 12 - (r % 2) * 10 * mk, 8, '#a16207', O, 2);
        ctx.restore();
      }
      if (!b.bajoTierra) {
        // recorta lo que queda bajo el suelo (cuando se hunde o sale de la tierra)
        var recorta = num(b.hundir, 0) > 1;
        if (recorta) { ctx.save(); ctx.beginPath(); ctx.rect(-2000, -3000, 6000, 3000 + gy); ctx.clip(); }
        ctx.save();
        aplicar(ctx, T);
        if (b.hitT > 0) ctx.translate(Math.sin(b.t * 90) * 4, 0);
        var ok = art('robovill', ctx, 0, 0, { variant: v, scale: s, facing: T.f, brazo: b.brazo, alas: b.alas, taladro: b.taladro });
        if (!ok) {
          ctx.scale(s * T.f, s);
          rfill(ctx, -74, -176, 148, 116, 38, '#94a3b8', O, 4);
          rfill(ctx, -46, -232, 96, 58, 22, '#cbd5e1', O, 4);
          circle(ctx, 32, -208, 9, '#f87171', O, 2);
          rfill(ctx, -40, -64, 80, 64, 10, '#475569', O, 4);
          circle(ctx, 14, -110, 18, '#e11d48', O, 3);
        }
        ctx.restore();
        if (recorta) ctx.restore();
        // el brazo nuevo brilla durante el cambio (aviso)
        if (b.estado === 'aviso' && BRAZO_DE[b.ataque] && b.ataque !== 'lluvia') {
          var m = robBrazo(b), k = clamp(b.st / 1.0, 0, 1);
          halo(ctx, m.x + b.facing * 40, m.y, 110 + 30 * Math.sin(t * 16), '253,224,71', 0.35 + 0.35 * k);
          ctx.save();
          ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 6;
          for (var i = 0; i < 6; i++) {
            var a = i * PI / 3 + t * 3, r0 = 70, r1 = 100 + 10 * Math.sin(t * 20 + i);
            ctx.beginPath(); ctx.moveTo(m.x + b.facing * 40 + Math.cos(a) * r0, m.y + Math.sin(a) * r0);
            ctx.lineTo(m.x + b.facing * 40 + Math.cos(a) * r1, m.y + Math.sin(a) * r1); ctx.stroke();
          }
          ctx.restore();
        }
        if (b.estado === 'aviso' && b.ataque === 'lluvia') {
          var hd = toWorld(T, 20, -150);
          halo(ctx, hd.x, hd.y, 150, '248,113,113', 0.35 + 0.2 * Math.sin(t * 14));
        }
        // gema copia: agrietada y apagada en la huida
        if (b.estado === 'derrota') {
          var gm = robGema(b), dk = clamp(num(b.defT, 0) / 1.0, 0, 1);
          ctx.save();
          ctx.globalAlpha = 0.65 * dk;
          circle(ctx, gm.x, gm.y, gm.r - 10, '#1f2937', null);
          ctx.restore();
          if (dk > 0.2) {
            ctx.save();
            ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 4; ctx.lineCap = 'round';
            var cr = (gm.r - 10) * Math.min(1, dk * 1.4);
            ctx.beginPath();
            ctx.moveTo(gm.x - cr * 0.1, gm.y - cr); ctx.lineTo(gm.x + cr * 0.15, gm.y - cr * 0.2); ctx.lineTo(gm.x - cr * 0.25, gm.y + cr * 0.3); ctx.lineTo(gm.x + cr * 0.1, gm.y + cr);
            ctx.moveTo(gm.x + cr * 0.15, gm.y - cr * 0.2); ctx.lineTo(gm.x + cr * 0.8, gm.y - cr * 0.05);
            ctx.moveTo(gm.x - cr * 0.25, gm.y + cr * 0.3); ctx.lineTo(gm.x - cr * 0.8, gm.y + cr * 0.15);
            ctx.stroke();
            ctx.restore();
          }
        }
        if ((b.estado === 'mareado' && (b.sub === 'agachado' || b.sub === 'clavado' || b.sub === 'aturdido')) ||
            (b.estado === 'derrota' && num(b.defT, 0) >= 1.1 && num(b.defT, 0) < 2.5)) {
          var hp = toWorld(T, 0, -250);
          mareoStars(ctx, hp.x, hp.y, t, 80);
        }
      }
      // "!" de aviso
      if (b.estado === 'aviso') {
        if (b.ataque === 'taladro') {
          if (b.sub === 'marca') {
            // ¡va a salir aquí! (los "!" a los dos lados, para que la fusión no los tape)
            var mk2 = clamp((b.st - ROB_TAL_BAJA) / ROB_TAL_MARCA, 0, 1);
            ctx.save();
            ctx.globalAlpha = 0.5 + 0.4 * Math.abs(Math.sin(t * 10));
            ctx.strokeStyle = '#fde047'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.ellipse(b.x, gy - 4, ROB_TAL_R + 6 * mk2, 30, 0, 0, PI * 2); ctx.stroke();
            ctx.restore();
            // los "!" fuera del ancho de la fusión (que se pone encima de la marca) para que siempre se vean
            var bote = Math.abs(Math.sin(t * 8)) * 12;
            exclam(ctx, b.x - ROB_TAL_R - 170, gy - 120 - bote, 2.8);
            exclam(ctx, b.x + ROB_TAL_R + 170, gy - 120 - bote, 2.8);
            // y un haz de luz de aviso que sube del suelo (asoma por encima de la fusión)
            ctx.save();
            var hz = ctx.createLinearGradient(0, gy, 0, gy - 560);
            hz.addColorStop(0, 'rgba(253,224,71,0.45)'); hz.addColorStop(1, 'rgba(253,224,71,0)');
            ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t * 10));
            ctx.fillStyle = hz; ctx.fillRect(b.x - ROB_TAL_R, gy - 560, ROB_TAL_R * 2, 560);
            ctx.restore();
            for (var c2 = 0; c2 < 4; c2++) {
              var cx2 = b.x + (c2 - 1.5) * 48;
              ctx.save(); ctx.strokeStyle = '#3f2a14'; ctx.lineWidth = 5;
              ctx.beginPath(); ctx.moveTo(cx2, gy); ctx.lineTo(cx2 + 12, gy - 12 - 18 * mk2); ctx.lineTo(cx2 - 4, gy - 24 - 26 * mk2); ctx.stroke();
              ctx.restore();
            }
          } else if (b.st > ROB_TAL_HUNDE) exclam(ctx, b.x, gy - 120, 2.0);
        } else {
          var hx = toWorld(T, 185, -160);
          exclam(ctx, hx.x, hx.y, 2.6);
        }
      }
      ctx.restore();
    },
    zones: function (b) { return robZonas(b); },
    onHit: function (b, dmg, kind, zona, fromX, arena) {
      if (b.estado === 'intro' || b.estado === 'derrota') return 0;
      var tipo = zona && zona.tipo;
      if (tipo === 'armadura' && kind !== 'equipo') return 0;
      var d = num(dmg, 1) * (tipo === 'debil' && kind !== 'equipo' ? 2 : 1);   // el ataque en equipo hace 10 justos (§12.4)
      b.hitT = 0.12;
      if (kind === 'equipo') {
        // el ataque en equipo respeta el ritmo de las fases; en la fase 3, con la ronda hecha, puede rematar
        var p = pisoDuro(b, ROB_LB, 3, 7.5, 1);
        if (p > 1) d = recorteEquipo(b, d, p, arena, zona);
      }
      return d;
    },
    minHp: function (b) { return Math.max(1, piso(b, ROB_LB, 3, 7.5, 1)); },
    defeat: function (b, t, arena) {
      // ROBOVILL SE ESCAPA (no se destruye): gema agrietada y apagada, de rodillas 1,5 s y huida por el techo roto
      var gy = GY(arena);
      b.estado = 'derrota'; b.defT = t; b.t += 1 / 60; b.bajoTierra = false;
      if (!b._d0) {
        b._d0 = true; b.yIni = num(b.y, gy); b.hundir = 0; b.escY = 0;
        call(arena, 'sfx', 'gemGrab'); call(arena, 'flash', 0.7); call(arena, 'shake', 0.5);
        var gm = robGema(b);
        call(arena, 'parts', gm.x, gm.y, '#f472b6', 18, 260, 'star');
        call(arena, 'parts', gm.x, gm.y, '#e5e7eb', 12, 220, 'clink');
        call(arena, 'text', gm.x, gm.y - 80, '¡CRAC!', '#fbcfe8', 50);
      }
      if (t < 1.0) {
        // la gema copia se agrieta y se apaga; si volaba, baja al suelo
        b.y = lerp(b.yIni, gy, ease(t / 0.8));
        b.tiembla = 0.6; b.alas = 'cerradas'; b.brazo = 'martillo';
        b.lean = Math.sin(t * 30) * 0.02;
      } else if (t < 2.5) {
        // de rodillas
        b.y = gy;
        var k = ease((t - 1.0) / 0.3);
        // cae DE RODILLAS: baja ≈ 70 px (lo de debajo del suelo se recorta), se encoge y agacha la cabeza
        b.sq = 1 - 0.12 * k; b.lean = -b.facing * 0.08 * k; b.tiembla = 0;
        b.hundir = 70 * k;
        if (!b._rodillas) {
          b._rodillas = true; call(arena, 'shake', 0.6); call(arena, 'sfx', 'robot'); call(arena, 'sfx', 'bigPunch');
          call(arena, 'parts', b.x - 130, gy - 8, '#d6d3d1', 16, 240, 'dot');
          call(arena, 'parts', b.x + 130, gy - 8, '#d6d3d1', 16, 240, 'dot');
        }
        if (t >= 1.3 && !b._uf) { b._uf = true; call(arena, 'text', b.x, gy - ROB_ALTO * 0.95, '¡Uf…!', '#e5e7eb', 44); }
      } else {
        // abre sus alas de metal y sale volando por el techo roto
        b.alas = 'abiertas'; b.sq = lerp(b.sq, 1, 0.2); b.lean = Math.sin(t * 6) * 0.04;
        b.hundir = lerp(num(b.hundir, 0), 0, 0.25);
        if (!b._escapa) {
          b._escapa = true;
          call(arena, 'sfx', 'escape'); call(arena, 'sfx', 'jetpack');
          call(arena, 'msg', '¡Robovill se escapa!', 2.4);
          call(arena, 'parts', b.x, gy - 8, '#d6d3d1', 22, 300, 'dot');
        }
        var e = t - 2.5;
        b.escY = -(120 * e + 420 * e * e);
        if (Math.random() < 0.4) call(arena, 'parts', b.x + rnd(-150, 150), -200 - camDY(arena), '#a8a29e', 2, 120, 'dot');
      }
      return t >= 5.0;
    },
    hint: function (b, arena) {
      if (b.estado === 'aviso') {
        if (b.ataque === 'martillo') return '¡Martillo! Apártate del círculo o salta la onda con {salto}.';
        if (b.ataque === 'sierra') return '¡Sierra! Sáltala con {salto} o mantén {disparo} para el escudo.';
        if (b.ataque === 'canon') return '¡Cañón! Mantén {disparo} para el escudo de Peter.';
        if (b.ataque === 'pinza') return '¡Pinza! Mantén {disparo}: con el escudo no te puede agarrar.';
        if (b.ataque === 'taladro') return '¡Taladro bajo tierra! El escudo no lo para: ¡salta con {salto} o apártate del círculo!';
        if (b.ataque === 'lluvia') return '¡Lluvia de mini-robots! ¡Puñetazos con {ataque}!';
      }
      if (b.estado === 'mareado') return '¡Está mareado! ¡Golpea la gema copia con {ataque}!';
      if (b.fase >= 3 && b.hp <= 7) return '¡AHORA! ¡Pulsa {cambio} para el ATAQUE EN EQUIPO!';
      if (b.fase >= 3) return '¡Vuela muy alto! Doble salto con {salto} y golpea la gema copia con {ataque}.';
      return 'Su punto débil es la GEMA COPIA del pecho: ¡golpéala con {ataque}!';
    },
    debug: function (b) {
      var z = robZonas(b), d = null;
      for (var i = 0; i < z.length; i++) if (z[i].tipo === 'debil') { d = { x: z[i].x, y: z[i].y }; break; }
      var av = b.estado === 'aviso';
      return { fase: b.fase, estado: estadoDebug(b), aviso: av, ataque: (av || b.estado === 'golpe') ? b.ataque : null, debil: d };
    }
  };

  // ---------------------------------------------------------------------------
  //  Registro (§12.6, §19.1)
  // ---------------------------------------------------------------------------
  G.P3G.register('excavadora', EXCAVADORA);
  G.P3G.register('nodriza', NODRIZA);
  G.P3G.register('robovill', ROBOVILL);
})();
