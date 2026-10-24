// arte-poses3.js — POSES DE JUEGO de los héroes de la Parte 3 (contrato §16.3).
// Dueño: arte-poses. Parte 3 "We Are a Team" de "El Rescate de Lord Falcon".
//
// Construye las poses de juego ENCIMA de las funciones aprobadas de
// js/p3/arte-heroes.js (P2.fn.mikey y P2.fn.peter) SIN CAMBIAR su aspecto:
// solo transformaciones (balanceo, inclinación, estiramiento), partes
// recortadas que se desplazan (las piernas, solo al correr) y efectos encima
// (líneas de movimiento, polvo, destellos, estrellitas). Nunca redibuja a un
// personaje (al correr, la sombra del suelo se pinta aparte con la misma elipse
// del arte para que no se parta).
//
// Exporta (contrato §16.3):
//   P2.fn.mikeyJuego(c, x, piesY, {variant, scale, facing, pose, t, arma})
//        poses: idle, run, jump, fall, hurt, win, disparo
//   P2.fn.peterJuego(c, x, piesY, {variant, scale, facing, pose, t, escudo: 'mano'|'cubrir'|'fuera', anda})
//        poses: idle, run, jump, fall, hurt, win, bloquear, lanzar
//        (opción extra `anda: true` con 'bloquear': anda despacio cubierto, moviendo las botas)
//   P2.fn.heroeP3(c, quien, x, piesY, {scale, facing, pose, t, ...})
//        director / falcon → G.gfx.drawDirector / drawFalcon; mikey / peter → las de arriba (G.p3.look)
//   P2.fn.caraHeroe(c, x, y, {quien, size, apagado})      (x, y) = centro de la cara
//
// A escala 1 los dos miden ≈ 68 px, como drawDirector: la escala del dibujo
// aprobado se corrige con 68 / altoArte(nombre) (P2.P3ALTO, con respaldo).
// Solo DEFINE funciones al cargar. Nunca lanza: todo va con try/catch y
// save()/restore() emparejados.
window.G = window.G || {};
window.P2 = window.P2 || {};
(function () {
  'use strict';
  var G = window.G, P2 = window.P2;
  P2.fn = P2.fn || {};
  var OUT = P2.OUTLINE || '#1a1a2e';
  var ALTO_JUEGO = 68;   // alto de los héroes en el juego a escala 1 (como drawDirector)

  // Copia de ALTO_POR_DEFECTO (contrato §16.4), por si datos-arte3.js faltara.
  var ALTO_POR_DEFECTO = {
    mikey: 68, peter: 68, robovill: 290, robotMoto: 132, robotMotoMoto: 70, submarinoNave: 80,
    fusionTerrestre: 225, fusionVoladora: 230, fusionFinal: 330,
    robotPractica: 157, granExcavadora: 160, dronNodriza: 190, guardianRobovill: 195,
    gemaCopia: 33, miniRobot: 40, escudoPeter: 40
  };
  function altoArte(n) {
    var v = (P2.P3ALTO && P2.P3ALTO[n]) || ALTO_POR_DEFECTO[n];
    return (typeof v === 'number' && isFinite(v) && v > 0) ? v : 68;
  }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lookDe(quien) {
    var look = (G.p3 && G.p3.look) || {};
    return look[quien] === 'B' ? 'B' : 'A';
  }
  function variante(o, quien) {
    return (o.variant === 'A' || o.variant === 'B') ? o.variant : lookDe(quien);
  }
  function colorDe(quien, tono) {
    try {
      if (G.p3 && typeof G.p3.heroColor === 'function') return G.p3.heroColor(quien, tono);
    } catch (e) { /* respaldo */ }
    var base = { director: '#60a5fa', falcon: '#4ade80', mikey: '#f97316', peter: '#facc15' };
    return base[quien] || '#e5e7eb';
  }
  // Tono claro de identidad según la variante que se dibuja (tabla del contrato §3),
  // para que las líneas de movimiento combinen con el traje de ESA variante.
  var CLARO = { mikey: { A: '#fdba74', B: '#c4b5fd' }, peter: { A: '#fde047', B: '#f9a8d4' } };
  function claroDe(quien, V) { return (CLARO[quien] && CLARO[quien][V]) || '#e2e8f0'; }
  function tiempo(o) { return num(o.t, num(G.T, 0)); }

  // ---------------------------------------------------------------------------
  //  Geometría del arte aprobado (a escala 1, mirando a la derecha, pies en 0,0).
  //  BANDA = franja de las botas: al CORRER, cada pierna (pantalón + bota) se
  //  recorta con su propia silueta y se mueve sola. Lo demás que cae en la banda
  //  (mochila, faldón, guantes) se queda con el cuerpo, y la sombra del suelo
  //  se queda quieta y entera.
  //  OCULTA = partes del dibujo que tapan las piernas y deben quedarse con el
  //  cuerpo (el escudo en la mano de Peter, la punta del lanzador de Mikey).
  // ---------------------------------------------------------------------------
  var BANDA_Y = -7.5;     // borde de arriba de la banda (justo bajo el cinturón)
  var CORTE_X = 1;        // separación entre la pierna de atrás y la de delante
  var TORSO_Y = -6.6;     // borde de abajo del torso y del cinturón (con su contorno): lo de
                          // encima es del cuerpo, que se pinta sobre las piernas

  // Silueta de cada pierna (pantalón y bota con su contorno y 0,25 px de margen:
  // sin llevarse la sombra del suelo), medida sobre P2.fn.mikey / P2.fn.peter de arte-heroes.js.
  //   pL/pR: pantalón; bL/bR/bT/bB: bota (con la rodillera de Peter); r: esquinas de abajo
  function piernas(quien, artPose) {
    if (quien === 'peter') {
      var sp = artPose === 'idle' ? 0 : 3;   // en guardia (bloquear, lanzar) abre las piernas
      return [
        { pL: -11.5 - sp, pR: 0.5 - sp, bL: -12.5 - sp, bR: 2.5 - sp, bT: -8.5, bB: 1.5, r: 4.5 },
        { pL: -0.5 + sp, pR: 11.5 + sp, bL: -0.5 + sp, bR: 15.5 + sp, bT: -8.5, bB: 1.5, r: 4.5 }
      ];
    }
    return [
      { pL: -10.5, pR: 0.5, bL: -11.5, bR: 2.5, bT: -6.5, bB: 1.5, r: 4 },
      { pL: -0.5, pR: 10.5, bL: -0.5, bR: 14.5, bT: -6.5, bB: 1.5, r: 4 }
    ];
  }
  // Sombra del suelo del arte aprobado: P2.elli(c, 0, -1, rx, 4, 'rgba(0,0,0,0.22)')
  var SOMBRA_RX = { mikey: 16, peter: 17 };

  // ---------------------------------------------------------------------------
  //  Dibujo del arte aprobado (con su propia escala 1 en el marco local).
  // ---------------------------------------------------------------------------
  function arte(c, quien, opts) {
    var fn = P2.fn[quien];
    if (typeof fn !== 'function') return false;
    c.save();
    try { fn(c, 0, 0, opts); } catch (e) { /* el arte nunca debe romper el juego */ }
    c.restore();
    return true;
  }

  // Cápsula de respaldo (contrato §16.3): 22 × 58 px (× escala) del color del héroe con dos ojos.
  // Se dibuja en el marco local (escala del arte), así que se corrige con 1/k.
  function capsula(c, quien, k) {
    c.save();
    c.scale(1 / k, 1 / k);
    if (P2.rf) P2.rf(c, -11, -58, 22, 58, 10, colorDe(quien), OUT, 2.5);
    else { c.fillStyle = colorDe(quien); c.fillRect(-11, -58, 22, 58); }
    if (P2.circ) {
      P2.circ(c, -3, -44, 3.6, '#ffffff', OUT, 1.5); P2.circ(c, 6, -44, 3.6, '#ffffff', OUT, 1.5);
      P2.circ(c, -2.4, -44, 1.6, OUT, null); P2.circ(c, 6.6, -44, 1.6, OUT, null);
    }
    c.restore();
  }

  // Añade un rectángulo al trazado (sentido horario o antihorario).
  function rectSentido(c, x0, y0, x1, y1, horario) {
    if (horario) { c.moveTo(x0, y0); c.lineTo(x1, y0); c.lineTo(x1, y1); c.lineTo(x0, y1); }
    else { c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.lineTo(x1, y0); }
    c.closePath();
  }
  // Añade una elipse al trazado (sin ctx.ellipse, por los iPads viejos).
  function elipseSentido(c, cx, cy, rx, ry, horario) {
    c.save();
    c.translate(cx, cy); c.scale(rx, ry);
    c.moveTo(1, 0);
    c.arc(0, 0, 1, 0, Math.PI * 2, !horario);
    c.restore();
  }
  // Formas que tapan la banda de las botas. Cada una es una función (c, horario) que
  // añade su trazado: así el cuerpo las incluye y las botas las excluyen.
  function ocultaElipse(cx, cy, rx, ry) {
    return function (c, horario) { elipseSentido(c, cx, cy, rx, ry, horario); };
  }
  // Lanzador de Mikey en la mano (pose idle del arte: empuñadura en (12, -13), girado 0,55
  // y a escala 0,9 · wS). Rectángulos en el marco del lanzador (de drawLanzador del arte).
  var CAJAS_LANZADOR = {
    pistola: [[-9.5, -12.5, 22, 3.5], [-4.3, -2, 4.3, 9.5]],
    metralleta: [[-11.5, -17.5, 27.5, 1.5], [-6.7, -6.7, 10.7, 10.7], [-4.3, -2, 4.3, 9.5]],
    francotirador: [[-19.5, -21.5, 48.5, 1.5], [-4.3, -2, 4.3, 9.5]]
  };
  function ocultaLanzador(arma) {
    var cajas = CAJAS_LANZADOR[arma] || CAJAS_LANZADOR.pistola;
    var wS = arma === 'francotirador' ? 0.78 : (arma === 'metralleta' ? 0.88 : 1);
    return function (c, horario) {
      c.save();
      c.translate(12, -13); c.rotate(0.55); c.scale(wS * 0.9, wS * 0.9);
      for (var i = 0; i < cajas.length; i++) rectSentido(c, cajas[i][0], cajas[i][1], cajas[i][2], cajas[i][3], horario);
      c.restore();
    };
  }

  // Movimiento del cuerpo (desplazamiento y giro alrededor de la cadera).
  function moverCuerpo(c, cu) {
    c.translate(num(cu.dx, 0), num(cu.dy, 0));
    if (cu.rot) {
      var px = num(cu.px, 0), py = num(cu.py, -9);
      c.translate(px, py); c.rotate(cu.rot); c.translate(-px, -py);
    }
  }

  // Añade al trazado la silueta de una pierna (pantalón desde `arriba` + bota con
  // las esquinas de abajo redondeadas). `lado` = 0 (atrás: x ≤ CORTE_X) o 1 (delante: x ≥ CORTE_X).
  function piernaSentido(c, p, arriba, lado, horario) {
    var pL = p.pL, pR = p.pR, bL = p.bL, bR = p.bR, rl = p.r, rr = p.r;
    if (lado === 0) { if (pR > CORTE_X) pR = CORTE_X; if (bR > CORTE_X) { bR = CORTE_X; rr = 0; } }
    else { if (pL < CORTE_X) pL = CORTE_X; if (bL < CORTE_X) { bL = CORTE_X; rl = 0; } }
    var bT = Math.max(p.bT, arriba), bB = p.bB;
    rl = Math.min(rl, (bR - bL) / 2, bB - bT); rr = Math.min(rr, (bR - bL) / 2, bB - bT);
    if (rl < 0) rl = 0;
    if (rr < 0) rr = 0;
    if (horario) {
      c.moveTo(pL, arriba); c.lineTo(pR, arriba); c.lineTo(pR, bT); c.lineTo(bR, bT);
      c.arcTo(bR, bB, bL, bB, rr); c.arcTo(bL, bB, bL, bT, rl);
      c.lineTo(bL, bT); c.lineTo(pL, bT);
    } else {
      c.moveTo(pL, arriba); c.lineTo(pL, bT); c.lineTo(bL, bT);
      c.arcTo(bL, bB, bR, bB, rl); c.arcTo(bR, bB, bR, bT, rr);
      c.lineTo(bR, bT); c.lineTo(pR, bT); c.lineTo(pR, arriba);
    }
    c.closePath();
  }

  // Recorte "todo menos un hueco, salvo lo que tapa" (un clip por hueco: así los
  // huecos que se solapan no se anulan con la regla del trazado).
  function recortarHueco(c, hueco, ocultas) {
    c.beginPath();
    rectSentido(c, -120, -160, 120, 40, true);
    hueco(c);
    for (var i = 0; i < ocultas.length; i++) ocultas[i](c, true);
    c.clip();
  }

  // Sombra del suelo, quieta y entera (la misma elipse del arte aprobado, con su
  // ayudante P2.elli), para que no se parta en trozos con las botas al correr.
  function sombraSuelo(c, quien) {
    if (typeof P2.elli !== 'function') return;
    c.save();
    try { P2.elli(c, 0, -1, SOMBRA_RX[quien] || 16, 4, 'rgba(0,0,0,0.22)', null); } catch (e) { /* nada */ }
    c.restore();
  }

  // Dibuja el personaje en piezas (solo al correr): las dos piernas (se mueven) y el cuerpo.
  //   pz = { artPose, cuerpo: {dx, dy, rot, px, py}, atras: {dx, dy}, delante: {dx, dy},
  //          ocultas: [función (c, horario)], quitar: [[x0, y0, x1, y1]] (zonas que no se pintan) }
  // La sombra del arte no se pinta en ninguna pieza: la pone sombraSuelo() antes, quieta.
  function dibujarPiezas(c, quien, opts, pz) {
    var cu = pz.cuerpo || {};
    var bandaArriba = BANDA_Y + Math.min(0, num(cu.dy, 0)) - 0.5;
    var ocultas = pz.ocultas || [];
    var legs = piernas(quien, pz.artPose);
    var i;
    // ---- las dos piernas (debajo del cuerpo, como en el arte) ----
    var offs = [pz.atras || {}, pz.delante || {}];
    for (var b = 0; b < 2; b++) {
      var off = offs[b];
      c.save();
      // recorte fijo: la banda (y lo que asoma por el hueco del bote del cuerpo)
      c.beginPath();
      rectSentido(c, -60, bandaArriba, 60, 12, true);
      c.clip();
      // menos lo que tapa las piernas (escudo en la mano…), que viaja con el cuerpo.
      // (Si dos se solapan, ese trocito se cuela en la pierna, pero el cuerpo lo tapa después.)
      if (ocultas.length) {
        c.beginPath();
        rectSentido(c, -120, -160, 120, 40, true);
        c.save(); moverCuerpo(c, cu);
        for (i = 0; i < ocultas.length; i++) ocultas[i](c, false);
        c.restore();
        c.clip();
      }
      // la pierna se desplaza y se recorta a su propia silueta (sin sombra ni mochila)
      c.translate(num(off.dx, 0), num(off.dy, 0));
      c.beginPath();
      piernaSentido(c, legs[b], BANDA_Y - 8, b, true);
      c.clip();
      arte(c, quien, opts);
      c.restore();
    }
    // ---- el cuerpo: todo menos las piernas en la banda y la sombra (lo que las tapa, sí) ----
    c.save();
    moverCuerpo(c, cu);
    var rx = (SOMBRA_RX[quien] || 16) + 1.2;
    // (las dos piernas no se solapan: la de atrás acaba en CORTE_X y la de delante empieza ahí)
    recortarHueco(c, function (cc) {
      piernaSentido(cc, legs[0], TORSO_Y, 0, false); piernaSentido(cc, legs[1], TORSO_Y, 1, false);
    }, ocultas);
    recortarHueco(c, function (cc) { elipseSentido(cc, 0, -1, rx, 5.2, false); }, ocultas);
    if (pz.quitar && pz.quitar.length) quitarZonas(c, pz.quitar);
    arte(c, quien, opts);
    c.restore();
  }

  // Recorta fuera del dibujo unas zonas rectangulares (p. ej. las líneas de movimiento de "lanzar").
  function quitarZonas(c, quitar) {
    c.beginPath();
    rectSentido(c, -120, -160, 120, 40, true);
    for (var i = 0; i < quitar.length; i++) {
      var q = quitar[i];
      rectSentido(c, q[0], q[1], q[2], q[3], false);
    }
    c.clip();
  }
  // El dibujo entero (sin piezas), con zonas quitadas si hace falta.
  function arteEntero(c, quien, opts, quitar) {
    if (!quitar || !quitar.length) return arte(c, quien, opts);
    c.save();
    quitarZonas(c, quitar);
    arte(c, quien, opts);
    c.restore();
    return true;
  }

  // ---------------------------------------------------------------------------
  //  Efectos (todos en el marco local: escalan y se reflejan con el héroe)
  // ---------------------------------------------------------------------------
  function linea(c, x1, y1, x2, y2, col, lw) {
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function lineasVelocidad(c, t, col) {
    c.save();
    for (var i = 0; i < 3; i++) {
      var f = (t * 3.2 + i * 0.37) % 1;
      c.globalAlpha = 0.55 * (1 - f);
      var y = -44 + i * 13, x = -24 - f * 12;
      linea(c, x, y, x - 9 - (i === 1 ? 4 : 0), y, col, 2);
    }
    c.restore();
  }
  function polvo(c, t, ciclo) {
    // nubecitas de polvo detrás de los pies (dos por zancada)
    c.save();
    for (var i = 0; i < 2; i++) {
      var f = (t * ciclo / Math.PI + i * 0.5) % 1;
      var a = (1 - f) * 0.5;
      if (a <= 0.02) continue;
      c.globalAlpha = a;
      var r = 2 + f * 4;
      c.fillStyle = '#e2e8f0';
      c.beginPath(); c.arc(-12 - f * 12, -2 - f * 5, r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  function estrella(c, x, y, r, col, rot) {
    c.save();
    c.translate(x, y); c.rotate(rot || 0);
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = col; c.fill();
    c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
    c.restore();
  }
  function destello(c, x, y, r, col, alfa) {
    c.save();
    c.globalAlpha = clamp(alfa, 0, 1);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
    c.restore();
  }
  function estrellasMareo(c, t, cy) {
    // tres estrellitas que dan vueltas sobre la cabeza (sin sangre: solo mareo)
    for (var i = 0; i < 3; i++) {
      var a = t * 6 + i * Math.PI * 2 / 3;
      var x = Math.cos(a) * 14, y = cy + Math.sin(a) * 4;
      c.save();
      c.globalAlpha = Math.sin(a) > 0 ? 1 : 0.65;
      estrella(c, x, y, 3.6, '#fde047', a);
      c.restore();
    }
  }
  function silbidoSalto(c, t) {
    c.save();
    for (var i = 0; i < 3; i++) {
      var f = (t * 4 + i * 0.3) % 1;
      c.globalAlpha = 0.5 * (1 - f);
      var x = -8 + i * 8;
      linea(c, x, 3 + f * 6, x, 9 + f * 8, '#e2e8f0', 1.8);
    }
    c.restore();
  }
  function vientoCaida(c, t) {
    c.save();
    for (var i = 0; i < 3; i++) {
      var f = (t * 4 + i * 0.33) % 1;
      c.globalAlpha = 0.5 * (1 - f);
      var x = -12 + i * 12, y = -76 - f * 10;
      linea(c, x, y, x, y - 8, '#e2e8f0', 1.8);
    }
    c.restore();
  }
  function confeti(c, t, col) {
    var cols = ['#fde047', col, '#ffffff', '#93c5fd'];
    for (var i = 0; i < 5; i++) {
      var f = (t * 0.9 + i * 0.21) % 1;
      var x = Math.sin(i * 2.3 + t * 2) * 24, y = -70 - f * 22;
      if (i % 2) estrella(c, x, y, 2.6 + (i % 3), cols[i % 4], t * 3 + i);
      else destello(c, x, y, 3.5, cols[i % 4], 1 - f);
    }
  }

  // ---------------------------------------------------------------------------
  //  Movimiento común de una pose (todas las cifras en px del arte a escala 1)
  //   devuelve {ox, oy, rot, sx, sy, cuerpo, atras, delante, piezas}
  //   Solo 'run' se dibuja en piezas (piernas que se mueven): es donde se ve y
  //   así el arte se pinta 3 veces solo al correr (cuesta menos en móvil). Las
  //   demás poses mueven el dibujo entero.
  // ---------------------------------------------------------------------------
  function movimiento(mov, t, lento, salto) {
    var m = { ox: 0, oy: 0, rot: 0, sx: 1, sy: 1, cuerpo: { dx: 0, dy: 0, rot: 0 }, atras: null, delante: null, piezas: false };
    var s, cph;
    if (mov === 'run') {
      var vel = lento ? 8 : 12;               // misma cadencia que drawDirector (t · 12)
      var paso = lento ? 2.5 : 4.5;
      s = Math.sin(t * vel); cph = Math.cos(t * vel);
      m.rot = lento ? 0.05 : 0.11;
      // bote de todo el héroe (piernas incluidas): así el cuerpo nunca se separa de las piernas
      m.oy = -Math.abs(s) * (lento ? 1 : 2.2);
      m.delante = { dx: s * paso, dy: -Math.max(0, cph) * 3 };
      m.atras = { dx: -s * paso, dy: -Math.max(0, -cph) * 3 };
      m.sy = 1 + Math.abs(s) * 0.02; m.sx = 1 - Math.abs(s) * 0.015;
      m.ciclo = vel;
      m.piezas = true;
    } else if (mov === 'jump') {
      // estirado hacia arriba y un poco inclinado hacia delante
      m.rot = 0.08; m.sx = 0.93; m.sy = 1.08;
      m.oy = -1;
    } else if (mov === 'fall') {
      // un pelín ensanchado, con un vaivén suave mientras cae
      m.rot = -0.05 + Math.sin(t * 14) * 0.025; m.sx = 1.04; m.sy = 0.98;
    } else if (mov === 'hurt') {
      m.rot = -0.26 + Math.sin(t * 30) * 0.03;
      m.ox = -2;
    } else if (mov === 'win') {
      // saltitos de alegría, echado hacia atrás (el brazo queda en alto)
      // (`salto` = alto del saltito en px del arte; Mikey lo da más bajo, ver mikeyJuego)
      var h = (t * 2.2) % 1;
      var alto = Math.sin(h * Math.PI);
      m.oy = -alto * num(salto, 9);
      var aterriza = Math.max(0, 1 - Math.min(h, 1 - h) * 8);   // aplastado al tocar el suelo
      m.sy = 1 + alto * 0.04 - aterriza * 0.08; m.sx = 1 - alto * 0.03 + aterriza * 0.06;
      m.rot = -0.2;
    } else if (mov === 'shoot') {
      m.ox = -Math.abs(Math.sin(t * 26)) * 1.4;     // retroceso
      m.rot = -0.02;
    } else if (mov === 'block') {
      m.sy = 0.97 + Math.sin(t * 9) * 0.006; m.sx = 1.02;
      m.rot = 0.04;
    } else if (mov === 'throw') {
      m.ox = 1.5; m.rot = 0.09; m.sx = 1.03;
    } else {   // idle: respira
      var r = Math.sin(t * 3);
      m.sy = 1 + r * 0.014; m.sx = 1 - r * 0.008;
    }
    return m;
  }

  // Marco común: (x, piesY) → marco local del arte (pies en 0,0, mirando a la derecha)
  function conHeroe(c, quien, x, y, o, fnDentro) {
    if (!c || !c.save) return;
    var k = ALTO_JUEGO / altoArte(quien);
    var S = num(o.scale, 1) * k;
    var f = o.facing === -1 ? -1 : 1;
    c.save();
    try {
      c.translate(num(x, 0), num(y, 0));
      c.scale(S * f, S);
      c.lineJoin = 'round'; c.lineCap = 'round';
      fnDentro(k);
    } catch (e) { /* nunca romper update/render */ }
    c.restore();
  }

  function aplicarMov(c, m) {
    c.translate(m.ox, m.oy);
    if (m.rot) c.rotate(m.rot);
    if (m.sx !== 1 || m.sy !== 1) c.scale(m.sx, m.sy);
  }

  function hayPiezas(m) { return !!m.piezas; }

  // ---------------------------------------------------------------------------
  //  MIKEY STARK
  // ---------------------------------------------------------------------------
  var POSES_MIKEY = { idle: 1, run: 1, jump: 1, fall: 1, hurt: 1, win: 1, disparo: 1 };
  var ARMAS = { francotirador: 1, pistola: 1, metralleta: 1 };

  function mikeyJuego(c, x, y, o) {
    o = o || {};
    var pose = POSES_MIKEY[o.pose] ? o.pose : (o.pose === 'attack' || o.pose === 'shoot' ? 'disparo' : 'idle');
    var V = variante(o, 'mikey');
    var arma = ARMAS[o.arma] ? o.arma : 'pistola';
    var t = tiempo(o);
    conHeroe(c, 'mikey', x, y, o, function (k) {
      if (typeof P2.fn.mikey !== 'function') { capsula(c, 'mikey', k); return; }
      var artPose = (pose === 'disparo' || pose === 'win') ? 'disparo' : 'idle';
      var opts = { variant: V, scale: 1, facing: 1, pose: artPose, arma: arma };
      var mov = pose === 'disparo' ? 'shoot' : pose;
      var m = movimiento(mov, t, false, SALTO_WIN_MIKEY);

      // efectos de detrás
      if (pose === 'run') { lineasVelocidad(c, t, claroDe('mikey', V)); polvo(c, t, m.ciclo); }
      if (pose === 'jump') silbidoSalto(c, t);
      if (pose === 'fall') vientoCaida(c, t);
      if (hayPiezas(m)) sombraSuelo(c, 'mikey');   // sombra quieta y entera bajo las piernas

      // boca del lanzador en la pose 'disparo' del arte (marco del cuerpo)
      var wS = arma === 'francotirador' ? 0.78 : (arma === 'metralleta' ? 0.88 : 1);
      var largo = arma === 'francotirador' ? 46 : (arma === 'metralleta' ? 34 : 28);
      var bx = 24 + largo * wS + 6, by = -26;

      c.save();
      aplicarMov(c, m);
      // en idle el lanzador baja hasta la banda de las botas: su punta se queda quieta con el cuerpo
      // (y los dos guantes, que asoman un poquito por la banda)
      var ocultas = artPose === 'idle' ? [ocultaLanzador(arma), ocultaElipse(12, -12, 5.8, 5.8), ocultaElipse(-16, -12, 5.8, 5.8)] : [];
      if (hayPiezas(m)) dibujarPiezas(c, 'mikey', opts, { artPose: artPose, cuerpo: m.cuerpo, atras: m.atras, delante: m.delante, ocultas: ocultas });
      else if (pose === 'win') mikeyBrazoEnAlto(c, V, arma, wS, t);
      else arte(c, 'mikey', opts);

      // efectos de delante (en el marco del cuerpo)
      if (pose === 'disparo') destello(c, bx, by, 6 + Math.abs(Math.sin(t * 30)) * 3, '#e0f2fe', 0.85);
      c.restore();

      if (pose === 'hurt') estrellasMareo(c, t, -72);
      if (pose === 'win') {
        // fuegos artificiales que estallan en el cielo, por encima de la cabeza
        // (no salen del lanzador: así se ve que celebra, no que dispara)
        var ciclo = (t * 1.1) % 1;
        var cual = Math.floor(t * 1.1) % 2;
        var fx = cual ? 16 : -12, fy = cual ? -86 : -82;
        for (var i = 0; i < 8; i++) {
          var a = i * Math.PI / 4 + 0.2 + cual * 0.4;
          var e = Math.min(1, ciclo * 1.6);
          destello(c, fx + Math.cos(a) * e * 13, fy + Math.sin(a) * e * 13, 3.6, i % 2 ? '#93c5fd' : '#fde047', 1 - ciclo);
        }
        confeti(c, t, colorDe('mikey'));
      }
    });
  }

  // ---- 'win' de Mikey: el brazo del lanzador doblado por el codo y apuntando al cielo ----
  // Todo es el dibujo aprobado (pose 'disparo', sin cambiar su aspecto): el antebrazo, el
  // lanzador (P2.fn.lanzadorMikey, el del arte) y el guante giran alrededor del codo; el codo
  // es la punta redonda de la misma manga, reflejada; el resto del cuerpo se queda quieto.
  // El fogonazo del arte no se pinta: Mikey levanta el lanzador para celebrar, no dispara.
  var SALTO_WIN_MIKEY = 3;           // saltito de 'win' de Mikey (px del arte): a escala 2,8 son ≈ 8 px
  var CODO = { x: 19.5, y: -26 };    // codo: un poco fuera del torso (deja sitio a la cara), a media manga
  var GIRO_WIN = -0.8;               // giro del antebrazo (rad); con la inclinación de 'win', ≈ 57° hacia el cielo
  var CORTE_MANGA = 15;              // desde aquí la manga, el guante y el lanzador no son del cuerpo quieto
  // Manga (desde CORTE_MANGA), guante y lanzador de la pose 'disparo' con la pistola (marco del
  // cuerpo); deja fuera el torso, la cabeza, el pelo y los rizos de la variante B.
  var ANTEBRAZO = [[CORTE_MANGA, -31.4], [15, -41], [16.2, -43.6], [80, -43.6], [80, -10], [16.6, -10], [16.6, -20.6], [CORTE_MANGA, -20.6]];
  var MANGA = { y0: -31.4, y1: -20.6, limpia0: 9.6, limpia1: 14.7 };  // franja de la manga; x sin nada encima (con la pistola)
  var MANGA_PUNTA = { x: 9, y: -26, r: 5.3 };   // punta redonda (izquierda) de la manga de 'disparo', con su contorno
  var GUANTE = { x: 24, y: -24, r: 5.6 };       // guante delantero de 'disparo', con su contorno
  function poligonoSentido(c, pts, horario) {
    var n = pts.length, i;
    c.moveTo(pts[horario ? 0 : n - 1][0], pts[horario ? 0 : n - 1][1]);
    for (i = 1; i < n; i++) { var p = pts[horario ? i : n - 1 - i]; c.lineTo(p[0], p[1]); }
    c.closePath();
  }
  // Dibuja el arte recortado a un rectángulo.
  function arteEnRect(c, opts, x0, y0, x1, y1) {
    c.save();
    c.beginPath(); rectSentido(c, x0, y0, x1, y1, true); c.clip();
    arte(c, 'mikey', opts);
    c.restore();
  }
  // Pinta en [x0, x1] de la franja de la manga un trozo limpio de la manga del arte (sin lanzador
  // encima), corrido en horizontal. Como mucho mide lo que el trozo limpio (≈ 5 px).
  function trozoManga(c, base, x0, x1) {
    var w = Math.min(x1 - x0, MANGA.limpia1 - MANGA.limpia0);
    c.save();
    c.translate(x0 - MANGA.limpia0, 0);
    arteEnRect(c, base, MANGA.limpia0, MANGA.y0, MANGA.limpia0 + w, MANGA.y1);
    c.restore();
  }
  function mikeyBrazoEnAlto(c, V, arma, wS, t) {
    // El cuerpo quieto se pinta con la pistola: es la que cabe entera en ANTEBRAZO, así
    // ningún lanzador deja trozos en la manga (todo lo demás es igual con cualquier arma).
    var base = { variant: V, scale: 1, facing: 1, pose: 'disparo', arma: 'pistola' };
    // 1) el cuerpo sin el antebrazo
    c.save();
    c.beginPath();
    rectSentido(c, -120, -160, 120, 40, true);
    poligonoSentido(c, ANTEBRAZO, false);
    c.clip();
    arte(c, 'mikey', base);
    c.restore();
    // 2) la manga sigue recta hasta el codo (un trozo limpio de la misma manga, corrido;
    //    empieza un poco antes del corte para que no se vea costura)
    trozoManga(c, base, CORTE_MANGA - 0.4, CODO.x + 0.2);
    // 3) el codo: la punta redonda de la manga, reflejada
    c.save();
    c.translate(CODO.x + MANGA_PUNTA.x, 0); c.scale(-1, 1);
    c.beginPath();
    c.moveTo(MANGA_PUNTA.x, MANGA_PUNTA.y - MANGA_PUNTA.r);
    c.arc(MANGA_PUNTA.x, MANGA_PUNTA.y, MANGA_PUNTA.r, -Math.PI / 2, Math.PI / 2, true);
    c.closePath();
    c.clip();
    arte(c, 'mikey', base);
    c.restore();
    // 4) el antebrazo girado alrededor del codo (con un vaivén suave, como quien alza un trofeo):
    //    manga del codo al guante, el lanzador aprobado entero y el guante encima (orden del arte)
    var ang = GIRO_WIN + Math.sin(t * 4.4) * 0.07;
    c.save();
    c.translate(CODO.x, CODO.y); c.rotate(ang); c.translate(-CODO.x, -CODO.y);
    trozoManga(c, base, CODO.x, GUANTE.x + 0.6);
    if (P2.call) P2.call('lanzadorMikey', c, 24, -25, { tipo: arma, scale: wS, facing: 1 });
    c.save();
    c.beginPath(); elipseSentido(c, GUANTE.x, GUANTE.y, GUANTE.r, GUANTE.r, true); c.clip();
    arte(c, 'mikey', base);
    c.restore();
    c.restore();
  }

  // ---------------------------------------------------------------------------
  //  PETER ROGERS
  // ---------------------------------------------------------------------------
  var POSES_PETER = { idle: 1, run: 1, jump: 1, fall: 1, hurt: 1, win: 1, bloquear: 1, lanzar: 1 };

  function peterJuego(c, x, y, o) {
    o = o || {};
    var pose = POSES_PETER[o.pose] ? o.pose : (o.pose === 'attack' ? 'bloquear' : (o.pose === 'shoot' ? 'lanzar' : 'idle'));
    var V = variante(o, 'peter');
    var escudo = (o.escudo === 'cubrir' || o.escudo === 'fuera') ? o.escudo : 'mano';
    // cubierto y andando (opción extra `anda`, la pasa el motor): paso lento con el escudo delante
    if (o.anda && (pose === 'bloquear' || (pose === 'run' && escudo !== 'fuera'))) { pose = 'run'; escudo = 'cubrir'; }
    var t = tiempo(o);
    conHeroe(c, 'peter', x, y, o, function (k) {
      if (typeof P2.fn.peter !== 'function') { capsula(c, 'peter', k); return; }
      // pose del dibujo aprobado según el escudo (al ganar, la de "lanzar": brazo en alto)
      var artPose;
      if (escudo === 'fuera' || pose === 'lanzar' || pose === 'win') artPose = 'lanzar';
      else if (escudo === 'cubrir' || pose === 'bloquear') artPose = 'bloquear';
      else artPose = 'idle';
      var opts = { variant: V, scale: 1, facing: 1, pose: artPose };
      var mov = pose === 'bloquear' ? 'block' : (pose === 'lanzar' ? 'throw' : pose);
      var cubriendo = artPose === 'bloquear';
      var m = movimiento(mov, t, cubriendo && pose === 'run');

      if (pose === 'run') { lineasVelocidad(c, t, claroDe('peter', V)); polvo(c, t, m.ciclo); }
      if (pose === 'jump') silbidoSalto(c, t);
      if (pose === 'fall') vientoCaida(c, t);
      if (hayPiezas(m)) sombraSuelo(c, 'peter');   // sombra quieta y entera bajo las piernas

      // partes del dibujo que tapan las piernas (se quedan con el cuerpo)
      var ocultas = [];
      if (artPose === 'idle') {
        ocultas.push(ocultaElipse(15, -18, 13.8, 17.6));      // escudo en la mano
        ocultas.push(ocultaElipse(-17.5, -12, 6, 6));         // guante de atrás
      }
      if (artPose === 'bloquear') ocultas.push(ocultaElipse(24.5, -27, 21.5, 21.5)); // escudo delante
      // las líneas de movimiento del dibujo de "lanzar" solo se dejan al lanzar
      // (en la variante A; en la B pasan junto a la bufanda y parecen su ondear)
      var quitar = (artPose === 'lanzar' && pose !== 'lanzar' && V === 'A') ? [[-37, -42.5, -20, -31]] : null;

      c.save();
      aplicarMov(c, m);
      if (hayPiezas(m)) {
        dibujarPiezas(c, 'peter', opts, { artPose: artPose, cuerpo: m.cuerpo, atras: m.atras, delante: m.delante, ocultas: ocultas, quitar: quitar });
      } else arteEntero(c, 'peter', opts, quitar);

      if (cubriendo) {
        // ondas de fuerza delante del escudo: ¡protege a todos!
        var lean = 2.5, cx = 22 + lean, cy = -27;
        c.save();
        for (var i = 0; i < 2; i++) {
          var f = (t * 2.2 + i * 0.5) % 1;
          c.globalAlpha = 0.55 * (1 - f);
          c.strokeStyle = i ? '#fde68a' : '#fef3c7'; c.lineWidth = 2;
          c.beginPath(); c.arc(cx, cy, 25 + f * 9, -0.75, 0.75); c.stroke();
        }
        c.restore();
        destello(c, cx - 7, cy - 10, 3 + Math.abs(Math.sin(t * 5)) * 2, '#ffffff', 0.8);
      }
      if (pose === 'lanzar') {
        c.save();
        c.globalAlpha = 0.5;
        linea(c, 30, -38, 40, -40, '#fef3c7', 1.8);
        linea(c, 31, -31, 43, -31, '#fef3c7', 1.8);
        c.restore();
      }
      if (pose === 'win' && escudo !== 'fuera') {
        // ¡el escudo aprobado alzado en la mano, como un trofeo!
        var ex = ESCUDO_WIN.x, ey = ESCUDO_WIN.y;
        if (!P2.call || !P2.call('escudoPeter', c, ex, ey, { variant: V, scale: 0.8, angle: Math.sin(t * 4) * 0.3 })) {
          if (P2.circ) P2.circ(c, ex, ey, 15, colorDe('peter'), OUT, 2.5);
        }
        destello(c, ex - 7, ey - 8, 5 + Math.abs(Math.sin(t * 6)) * 3, '#fef9c3', 0.9);
      }
      c.restore();

      if (pose === 'hurt') estrellasMareo(c, t, -72);
      if (pose === 'win') confeti(c, t, colorDe('peter'));
    });
  }
  // centro del escudo alzado al ganar (marco del cuerpo; la mano de "lanzar" queda debajo)
  var ESCUDO_WIN = { x: 33, y: -53 };

  // ---------------------------------------------------------------------------
  //  heroeP3: despachador para los 4 héroes
  // ---------------------------------------------------------------------------
  function heroeP3(c, quien, x, y, o) {
    o = o || {};
    if (!c || !c.save) return;
    try {
      if (quien === 'director' || quien === 'falcon') {
        var gfx = G.gfx || {};
        var fn = quien === 'director' ? gfx.drawDirector : gfx.drawFalcon;
        var oo = { t: tiempo(o), facing: o.facing === -1 ? -1 : 1, pose: o.pose || 'idle', scale: num(o.scale, 1) };
        if (typeof fn === 'function') {
          c.save();
          try { fn(c, x, y, oo); } catch (e) { /* respaldo abajo no hace falta */ }
          c.restore();
        } else {
          conHeroe(c, quien, x, y, { scale: oo.scale, facing: oo.facing }, function (k) { capsula(c, quien, k); });
        }
        return;
      }
      var o2 = {};
      for (var key in o) { if (Object.prototype.hasOwnProperty.call(o, key)) o2[key] = o[key]; }
      if (quien === 'mikey') {
        o2.variant = variante(o, 'mikey');
        if (o2.pose === 'attack' || o2.pose === 'shoot') o2.pose = 'disparo';
        mikeyJuego(c, x, y, o2);
      } else if (quien === 'peter') {
        o2.variant = variante(o, 'peter');
        if (o2.pose === 'attack') o2.pose = 'bloquear';
        else if (o2.pose === 'shoot') o2.pose = 'lanzar';
        peterJuego(c, x, y, o2);
      } else {
        conHeroe(c, 'mikey', x, y, o, function (k) { capsula(c, quien, k); });
      }
    } catch (e) { /* nunca romper */ }
  }

  // ---------------------------------------------------------------------------
  //  caraHeroe: cara redonda para el HUD (centro en x, y; diámetro = size)
  // ---------------------------------------------------------------------------
  var INICIAL = { director: 'D', falcon: 'F', mikey: 'M', peter: 'P' };
  // centro de la cara en el dibujo (marco local a escala 1) y radio visible
  var CARA = {
    director: { cx: 0, cy: -49, r: 21 },
    falcon:   { cx: 1, cy: -49, r: 21 },
    mikey:    { cx: 1, cy: -51, r: 23 },
    peter:    { cx: 2, cy: -50, r: 22 }
  };

  function caraHeroe(c, x, y, o) {
    o = o || {};
    if (!c || !c.save) return;
    var quien = CARA[o.quien] ? o.quien : 'director';
    var size = Math.max(4, num(o.size, 34));
    var R = size / 2;
    var cf = CARA[quien];
    c.save();
    try {
      c.translate(num(x, 0), num(y, 0));
      // fondo del color del héroe
      c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2);
      c.fillStyle = colorDe(quien); c.fill();
      c.save();
      c.beginPath(); c.arc(0, 0, R - Math.max(0.5, size * 0.03), 0, Math.PI * 2); c.clip();
      // fondo un poco más oscuro que el color del héroe (para que el casco o el pelo resalten)
      c.fillStyle = 'rgba(15,23,42,0.3)';
      c.fillRect(-R, -R, size, size);
      // brillo suave arriba
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.arc(-R * 0.25, -R * 0.35, R * 0.7, 0, Math.PI * 2); c.fill();
      var s = R / cf.r;
      var dibujado = false;
      var px = -cf.cx * s, py = -cf.cy * s;
      if (quien === 'director' || quien === 'falcon') {
        var fn = G.gfx && (quien === 'director' ? G.gfx.drawDirector : G.gfx.drawFalcon);
        if (typeof fn === 'function') {
          c.save();
          try { fn(c, px, py, { t: 0, facing: 1, pose: 'idle', scale: s }); dibujado = true; } catch (e) { dibujado = false; }
          c.restore();
        }
      } else {
        var art = P2.fn[quien];
        if (typeof art === 'function') {
          var V = (o.variant === 'A' || o.variant === 'B') ? o.variant : lookDe(quien);
          c.save();
          try { art(c, px, py, { variant: V, scale: s, facing: 1, pose: 'idle', arma: 'pistola' }); dibujado = true; } catch (e) { dibujado = false; }
          c.restore();
        }
      }
      if (!dibujado) {
        // respaldo: la inicial en blanco
        c.fillStyle = colorDe(quien);
        c.fillRect(-R, -R, size, size);
        c.fillStyle = '#ffffff';
        c.font = 'bold ' + Math.round(size * 0.6) + 'px sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(INICIAL[quien], 0, size * 0.03);
      }
      if (o.apagado) {
        c.fillStyle = 'rgba(100,116,139,0.62)';
        c.fillRect(-R, -R, size, size);
      }
      c.restore();
      // aro de contorno (el HUD dibuja encima su borde de color)
      c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2);
      c.strokeStyle = OUT; c.lineWidth = Math.max(1, size * 0.06); c.stroke();
    } catch (e) { /* nunca romper */ }
    c.restore();
  }

  P2.fn.mikeyJuego = mikeyJuego;
  P2.fn.peterJuego = peterJuego;
  P2.fn.heroeP3 = heroeP3;
  P2.fn.caraHeroe = caraHeroe;
})();
