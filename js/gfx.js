// ===========================================================================
//  El Rescate de Lord Falcon  —  gfx.js
//  Todo el arte del juego dibujado por codigo (Canvas 2D).
//  Estilo cartoon rechoncho tipo Kirby / LEGO: cabezas grandes, cuerpos
//  redonditos, contornos gruesos, colores saturados y alegres.
//
//  Convencion de personajes: G.gfx.drawX(ctx, x, y, o)
//    (x, y) = CENTRO DE LOS PIES.  o = { t, facing, pose, scale, ...extras }
//  Props / vehiculos: (x, y) = CENTRO.   Tiles: (x, y) = esquina sup-izq.
//
//  NINGUNA funcion debe lanzar excepcion jamas: pose desconocida -> 'idle',
//  o indefinido -> valores por defecto.  Solo funciones puras de dibujo.
// ===========================================================================
window.G = window.G || {};

(function () {
  'use strict';

  // ---- Paleta compartida ---------------------------------------------------
  var OUTLINE = '#1a1a2e';   // contorno grueso comun
  var LW = 3;                // grosor de contorno base

  // Director America
  var DIR_SUIT = '#1e3a8a';
  var DIR_SUIT2 = '#3b82f6';
  var DIR_VEST = '#0f172a';
  var DIR_SKIN = '#f2c49b';
  var DIR_WATCH = '#22d3ee';

  // Lord Falcon
  var FAL_DARK = '#14532d';
  var FAL_GREEN = '#22c55e';
  var FAL_BROWN = '#78350f';
  var FAL_MASK = '#9ca3af';

  // Dark Toros
  var TOR_SKIN = '#c2803f';
  var TOR_LEATHER = '#3f2212';
  var TOR_BRONZE = '#b87333';
  var TOR_HORN = '#e7dbc5';
  var TOR_EYE = '#ef4444';

  // Gema del poder
  var GEM_A = '#e11d48';
  var GEM_B = '#a21caf';

  // ---- Helpers de dibujo (locales, no exportados) --------------------------

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  // Rectangulo redondeado -> path (no rellena ni traza)
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Rectangulo redondeado relleno + contorno
  function rrFill(ctx, x, y, w, h, r, fill, stroke, lw) {
    rr(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = (lw || LW); ctx.stroke(); }
  }

  // Circulo relleno + contorno
  function circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.arc(x, y, Math.abs(r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = (lw || LW); ctx.stroke(); }
  }

  // Elipse rellena + contorno
  function ellipse(ctx, x, y, rx, ry, fill, stroke, lw) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = (lw || LW); ctx.stroke(); }
  }

  // Ojo cartoon (blanco + pupila con brillo)
  function eye(ctx, x, y, r, look, blink) {
    look = look || 0;
    if (blink) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
      return;
    }
    circle(ctx, x, y, r, '#ffffff', OUTLINE, 2);
    circle(ctx, x + look, y + r * 0.2, r * 0.55, OUTLINE, null);
    circle(ctx, x + look + r * 0.18, y - r * 0.1, r * 0.22, '#ffffff', null);
  }

  // pseudo-random determinista a partir de una semilla
  function seeded(seed) {
    var s = (seed * 9301 + 49297) % 233280;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  // gradiente vertical rapido
  function vgrad(ctx, x, y0, y1, c0, c1) {
    var g = ctx.createLinearGradient(x, y0, x, y1);
    g.addColorStop(0, c0); g.addColorStop(1, c1); return g;
  }

  // Prepara el contexto para dibujar un personaje: traslada a los pies,
  // aplica escala y espejo segun facing. Devuelve nada; el llamador ya
  // trabaja en el sistema local (0,0)=pies, y hacia arriba = negativo.
  function beginChar(ctx, x, y, scale, facing) {
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.scale(facing, 1);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  // ==========================================================================
  //  G.gfx
  // ==========================================================================
  var gfx = {};

  // --------------------------------------------------------------------------
  //  DIRECTOR AMERICA  (~64px alto)
  //  poses: idle, run, jump, fall, attack, shoot, hack, hurt, win
  // --------------------------------------------------------------------------
  gfx.drawDirector = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, 0);
    var facing = (o.facing === -1) ? -1 : 1;
    var pose = o.pose || 'idle';
    var scale = num(o.scale, 1);

    ctx.save();
    beginChar(ctx, x, y, scale, facing);

    var breathe = Math.sin(t * 3) * 1.2;
    var runCycle = Math.sin(t * 12);
    var blink = (Math.sin(t * 2.3) > 0.985);
    var bodyY = -30;      // centro del torso
    var lean = 0;
    var armAngle = 0;

    if (pose === 'run') { bodyY += Math.abs(Math.sin(t * 12)) * -2; lean = 4; }
    if (pose === 'jump') { bodyY -= 3; lean = 3; }
    if (pose === 'fall') { bodyY += 2; lean = 2; }
    if (pose === 'hurt') { lean = -6; }
    if (pose === 'win') { bodyY += breathe * 0.3; }

    ctx.translate(lean, 0);

    // sombra
    ctx.save();
    ctx.setTransform(); // reset para sombra en mundo? -> no, mantener local
    ctx.restore();
    ellipse(ctx, 0, -1, 15, 4, 'rgba(0,0,0,0.20)', null);

    // ---- piernas ----
    var legSwing = (pose === 'run') ? runCycle * 7 : 0;
    var legLift = (pose === 'jump' || pose === 'fall') ? 5 : 0;
    // pierna trasera
    rrFill(ctx, -9, -18, 8, 18 - legLift, 4, DIR_VEST, OUTLINE, 2.5);
    // pierna delantera
    ctx.save();
    ctx.translate(legSwing, 0);
    rrFill(ctx, 1, -18, 8, 18, 4, DIR_SUIT, OUTLINE, 2.5);
    ctx.restore();
    // botas
    rrFill(ctx, -10, -4, 11, 5, 2.5, '#111827', OUTLINE, 2.5);
    rrFill(ctx, 1 + legSwing, -4, 11, 5, 2.5, '#111827', OUTLINE, 2.5);

    // ---- torso (chaleco tactico rechoncho) ----
    rrFill(ctx, -15, bodyY, 30, 30, 11, DIR_SUIT, OUTLINE, LW);
    // chaleco encima
    rrFill(ctx, -13, bodyY + 4, 26, 22, 8, DIR_VEST, OUTLINE, 2.5);
    // detalle azul brillante en el pecho
    rrFill(ctx, -5, bodyY + 8, 10, 8, 3, DIR_SUIT2, OUTLINE, 2);
    // cinturon
    rrFill(ctx, -15, bodyY + 26, 30, 5, 2, '#0b1020', OUTLINE, 2);

    // ---- brazos ----
    var backArmY = bodyY + 8;
    // brazo trasero
    ctx.save();
    if (pose === 'run') ctx.rotate(-runCycle * 0.3);
    rrFill(ctx, -20, backArmY, 8, 16, 4, DIR_SUIT2, OUTLINE, 2.5);
    circle(ctx, -16, backArmY + 17, 4.5, DIR_SKIN, OUTLINE, 2); // mano
    ctx.restore();

    // brazo delantero (varia por pose)
    ctx.save();
    if (pose === 'attack') {
      // punietazo hacia delante
      var pf = 0.5 + Math.sin(Math.min(t * 20, Math.PI)) * 0.5;
      ctx.translate(10, backArmY + 4);
      ctx.rotate(-0.2);
      rrFill(ctx, 0, -4, 18 + pf * 6, 8, 4, DIR_SUIT2, OUTLINE, 2.5);
      circle(ctx, 20 + pf * 6, 0, 6, DIR_SKIN, OUTLINE, 2.5); // punio
    } else if (pose === 'shoot') {
      // pulso electrico: brazo extendido, mano cian
      ctx.translate(12, backArmY + 2);
      rrFill(ctx, 0, -4, 16, 8, 4, DIR_SUIT2, OUTLINE, 2.5);
      circle(ctx, 18, 0, 5, DIR_SKIN, OUTLINE, 2);
      // chispa cian en la mano
      circle(ctx, 22, 0, 4 + Math.sin(t * 20) * 1.5, DIR_WATCH, '#0ea5e9', 1.5);
    } else if (pose === 'hack') {
      // brazo levantado mostrando el smartwatch holografico
      ctx.translate(10, backArmY - 2);
      ctx.rotate(-0.9);
      rrFill(ctx, 0, -4, 8, 15, 4, DIR_SUIT2, OUTLINE, 2.5);
      circle(ctx, 4, 16, 4.5, DIR_SKIN, OUTLINE, 2);
    } else {
      ctx.save();
      if (pose === 'run') ctx.rotate(runCycle * 0.3);
      rrFill(ctx, 8, backArmY, 8, 16, 4, DIR_SUIT2, OUTLINE, 2.5);
      circle(ctx, 12, backArmY + 17, 4.5, DIR_SKIN, OUTLINE, 2);
      ctx.restore();
    }
    ctx.restore();

    // ---- smartwatch holografico (muneca delantera) ----
    var wx = 12, wy = backArmY + 15;
    if (pose === 'hack') { wx = 14; wy = backArmY - 2 + 16; }
    ctx.save();
    ctx.globalAlpha = 0.9;
    rrFill(ctx, wx - 3, wy - 3, 6, 6, 2, '#0b1020', DIR_WATCH, 1.5);
    // brillo holografico cian
    ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.15;
    circle(ctx, wx, wy, 8, DIR_WATCH, null);
    ctx.globalAlpha = 1;
    ctx.restore();
    if (pose === 'hack') {
      // proyeccion holografica sobre el reloj
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(t * 10) * 0.2;
      for (var hi = 0; hi < 3; hi++) {
        rrFill(ctx, wx - 6, wy - 14 - hi * 4, 12, 2.5, 1, DIR_WATCH, null);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ---- cabeza (grande, rechoncha) ----
    var headY = bodyY - 18 + breathe * 0.4;
    if (pose === 'hurt') headY += 1;
    // cuello
    rrFill(ctx, -5, bodyY - 4, 10, 6, 3, DIR_SKIN, OUTLINE, 2);
    // cara
    circle(ctx, 0, headY, 15, DIR_SKIN, OUTLINE, LW);
    // pelo / gorro tactico
    ctx.save();
    rr(ctx, -15, headY - 16, 30, 14, 9);
    ctx.fillStyle = DIR_VEST; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    ctx.restore();

    // ---- gafas tecnologicas ----
    ctx.save();
    var glassY = headY - 1;
    // montura
    rrFill(ctx, -13, glassY - 5, 26, 9, 4, '#0b1020', OUTLINE, 2);
    // cristales brillo cian
    ctx.globalAlpha = 0.85;
    rrFill(ctx, -11, glassY - 3, 9, 5, 2, DIR_WATCH, null);
    rrFill(ctx, 2, glassY - 3, 9, 5, 2, DIR_WATCH, null);
    ctx.globalAlpha = 1;
    // reflejo
    ctx.strokeStyle = '#e0f7ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-9, glassY - 2); ctx.lineTo(-6, glassY + 1); ctx.stroke();
    ctx.restore();

    // boca segun pose
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (pose === 'attack' || pose === 'win') {
      ctx.arc(0, headY + 7, 4, 0.1 * Math.PI, 0.9 * Math.PI); // sonrisa amplia
    } else if (pose === 'hurt') {
      ctx.arc(0, headY + 9, 4, 1.1 * Math.PI, 1.9 * Math.PI); // mueca
    } else {
      ctx.moveTo(-4, headY + 8); ctx.lineTo(4, headY + 8);
    }
    ctx.stroke();

    // win: brazo levantado con destello ya cubierto; anadir chispita
    if (pose === 'win') {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.3;
      circle(ctx, 22, headY - 10, 3, '#fef08a', null);
      ctx.restore();
    }

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  LORD FALCON  (~64px alto)
  //  poses: idle, run, jump, fall, attack, shoot, hurt, win
  //  extra: o.enCelda (sentado, atrapado)
  // --------------------------------------------------------------------------
  gfx.drawFalcon = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, 0);
    var facing = (o.facing === -1) ? -1 : 1;
    var pose = o.pose || 'idle';
    var scale = num(o.scale, 1);
    var enCelda = !!o.enCelda;

    ctx.save();
    beginChar(ctx, x, y, scale, facing);

    var breathe = Math.sin(t * 3) * 1.1;
    var runCycle = Math.sin(t * 12);
    var bodyY = -30;
    var lean = 0;

    if (pose === 'run') lean = 5;
    if (pose === 'jump') { bodyY -= 3; lean = 4; }
    if (pose === 'fall') { bodyY += 2; lean = 2; }
    if (pose === 'hurt') lean = -6;

    if (enCelda) {
      // sentado y encogido dentro de la celda
      bodyY = -20; lean = 0;
    }

    ctx.translate(lean, 0);

    if (!enCelda) {
      ellipse(ctx, 0, -1, 14, 4, 'rgba(0,0,0,0.20)', null);
    }

    // ---- capa de plumas (detras) ----
    ctx.save();
    var flap = Math.sin(t * 5) * 4 + (pose === 'run' ? runCycle * 3 : 0);
    ctx.beginPath();
    ctx.moveTo(-6, bodyY - 6);
    ctx.quadraticCurveTo(-22 - flap, bodyY + 6, -18 - flap * 0.6, bodyY + 30);
    ctx.quadraticCurveTo(-8, bodyY + 26, -4, bodyY + 24);
    ctx.closePath();
    ctx.fillStyle = FAL_DARK; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    // textura de plumas (escamas)
    ctx.strokeStyle = 'rgba(20,60,30,0.9)'; ctx.lineWidth = 1.5;
    for (var f = 0; f < 3; f++) {
      var fy = bodyY + 6 + f * 7;
      ctx.beginPath();
      ctx.arc(-12 - flap * 0.4, fy, 4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();

    // ---- piernas ----
    if (!enCelda) {
      var legSwing = (pose === 'run') ? runCycle * 7 : 0;
      var legLift = (pose === 'jump' || pose === 'fall') ? 5 : 0;
      rrFill(ctx, -9, -18, 8, 18 - legLift, 4, FAL_BROWN, OUTLINE, 2.5);
      ctx.save();
      ctx.translate(legSwing, 0);
      rrFill(ctx, 1, -18, 8, 18, 4, FAL_BROWN, OUTLINE, 2.5);
      ctx.restore();
      // botas verdes
      rrFill(ctx, -10, -4, 11, 5, 2.5, FAL_DARK, OUTLINE, 2.5);
      rrFill(ctx, 1 + legSwing, -4, 11, 5, 2.5, FAL_DARK, OUTLINE, 2.5);
    } else {
      // piernas cruzadas / recogidas
      rrFill(ctx, -12, -8, 24, 8, 4, FAL_BROWN, OUTLINE, 2.5);
      rrFill(ctx, -14, -4, 10, 5, 2.5, FAL_DARK, OUTLINE, 2.5);
      rrFill(ctx, 4, -4, 10, 5, 2.5, FAL_DARK, OUTLINE, 2.5);
    }

    // ---- torso ----
    rrFill(ctx, -14, bodyY, 28, 28, 10, FAL_GREEN, OUTLINE, LW);
    // peto marron
    rrFill(ctx, -11, bodyY + 3, 22, 16, 7, FAL_BROWN, OUTLINE, 2.5);
    // emblema de halcon (V clara)
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, bodyY + 8); ctx.lineTo(0, bodyY + 13); ctx.lineTo(6, bodyY + 8);
    ctx.stroke();
    // cinturon
    rrFill(ctx, -14, bodyY + 24, 28, 4, 2, FAL_DARK, OUTLINE, 2);

    // ---- brazos ----
    var armY = bodyY + 6;
    // brazo trasero
    ctx.save();
    if (pose === 'run') ctx.rotate(-runCycle * 0.3);
    rrFill(ctx, -18, armY, 7, 15, 3.5, FAL_GREEN, OUTLINE, 2.5);
    circle(ctx, -14, armY + 16, 4, FAL_MASK, OUTLINE, 2);
    ctx.restore();

    // brazo delantero + arma
    ctx.save();
    if (pose === 'attack') {
      // espadazo: brazo cruzando
      ctx.translate(8, armY);
      var sw = Math.min(t * 18, Math.PI);
      ctx.rotate(-0.9 + Math.sin(sw) * 0.6);
      rrFill(ctx, 0, -4, 15, 7, 3, FAL_GREEN, OUTLINE, 2.5);
      circle(ctx, 15, 0, 4, FAL_MASK, OUTLINE, 2);
      // espada
      ctx.save();
      ctx.translate(15, 0);
      // hoja
      ctx.beginPath();
      ctx.moveTo(2, -3); ctx.lineTo(24, -2); ctx.lineTo(28, 0);
      ctx.lineTo(24, 2); ctx.lineTo(2, 3); ctx.closePath();
      ctx.fillStyle = '#e5f2ff'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
      // guarda
      rrFill(ctx, 0, -5, 3, 10, 1.5, '#b8860b', OUTLINE, 1.5);
      ctx.restore();
    } else if (pose === 'shoot') {
      // arco tensado
      ctx.translate(10, armY);
      rrFill(ctx, 0, -4, 14, 7, 3, FAL_GREEN, OUTLINE, 2.5);
      circle(ctx, 14, 0, 4, FAL_MASK, OUTLINE, 2);
      // arco
      ctx.save();
      ctx.translate(16, 0);
      ctx.strokeStyle = FAL_BROWN; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-2, 0, 14, -0.9, 0.9); ctx.stroke();
      // cuerda
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2 + 14 * Math.cos(-0.9), 14 * Math.sin(-0.9));
      ctx.lineTo(-8, 0);
      ctx.lineTo(-2 + 14 * Math.cos(0.9), 14 * Math.sin(0.9));
      ctx.stroke();
      // flecha lista
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(6, -3); ctx.moveTo(10, 0); ctx.lineTo(6, 3);
      ctx.strokeStyle = '#e5e7eb'; ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      if (pose === 'run') ctx.rotate(runCycle * 0.3);
      if (enCelda) ctx.rotate(-0.3);
      rrFill(ctx, 8, armY, 7, 15, 3.5, FAL_GREEN, OUTLINE, 2.5);
      circle(ctx, 12, armY + 16, 4, FAL_MASK, OUTLINE, 2);
      ctx.restore();
    }
    ctx.restore();

    // ---- cabeza con capucha y mascara ----
    var headY = bodyY - 16 + breathe * 0.4;
    rrFill(ctx, -5, bodyY - 4, 10, 5, 2.5, FAL_MASK, OUTLINE, 2);
    // capucha (verde oscuro, forma de pico de halcon)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-15, headY + 4);
    ctx.quadraticCurveTo(-16, headY - 16, 0, headY - 17);
    ctx.quadraticCurveTo(16, headY - 16, 15, headY + 4);
    // pico de la capucha hacia delante
    ctx.lineTo(20, headY - 2);
    ctx.lineTo(13, headY + 2);
    ctx.closePath();
    ctx.fillStyle = FAL_DARK; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    ctx.restore();

    // cara (parte inferior visible)
    ctx.save();
    rr(ctx, -11, headY - 4, 22, 16, 8);
    ctx.clip();
    ctx.fillStyle = FAL_SKIN_FALLBACK();
    ctx.fillRect(-13, headY - 6, 26, 20);
    ctx.restore();
    // contorno cara
    rrFill(ctx, -11, headY - 4, 22, 16, 8, null, OUTLINE, 2.5);

    // mascara gris (cubre media cara superior)
    rrFill(ctx, -12, headY - 5, 24, 9, 4, FAL_MASK, OUTLINE, 2.5);

    // ojos (sobre la mascara, decididos)
    var blink = (Math.sin(t * 2.7 + 1) > 0.985);
    var look = facing === 1 ? 1 : 1;
    eye(ctx, -5, headY - 1, 3, look, blink);
    eye(ctx, 5, headY - 1, 3, look, blink);

    // boca
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (pose === 'win' || pose === 'attack') {
      ctx.arc(0, headY + 6, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
    } else if (pose === 'hurt' || enCelda) {
      ctx.arc(0, headY + 9, 3.5, 1.15 * Math.PI, 1.85 * Math.PI);
    } else {
      ctx.moveTo(-3, headY + 7); ctx.lineTo(3, headY + 7);
    }
    ctx.stroke();

    ctx.restore();
  };
  // Falcon usa el mismo tono de piel que el director para la parte visible
  function FAL_SKIN_FALLBACK() { return DIR_SKIN; }

  // --------------------------------------------------------------------------
  //  DARK TOROS  (~150px alto) — jefe imponente
  //  poses: idle, walk, slam, charge, shoot, stunned, hurt, roar, defeated
  //  extras: o.shield=true (aura de distorsion), o.sinMartillo
  // --------------------------------------------------------------------------
  gfx.drawToros = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, 0);
    var facing = (o.facing === -1) ? -1 : 1;
    var pose = o.pose || 'idle';
    var scale = num(o.scale, 1);
    var shield = !!o.shield;
    var sinMartillo = !!o.sinMartillo;

    ctx.save();
    beginChar(ctx, x, y, scale, facing);

    var breathe = Math.sin(t * 2.5) * 2.5;
    var walkC = Math.sin(t * 7);
    var bodyY = -80;      // centro del torso masivo
    var lean = 0;
    var crouch = 0;

    if (pose === 'walk') bodyY += Math.abs(walkC) * -3;
    if (pose === 'charge') { lean = 12; bodyY += 4; }
    if (pose === 'slam') { crouch = 8; lean = 6; }
    if (pose === 'stunned') { lean = -8; bodyY += 4; }
    if (pose === 'hurt') lean = -6;
    if (pose === 'roar') { bodyY -= 4; }
    if (pose === 'defeated') { crouch = 30; lean = -4; }

    // ---- aura de fuego del Escudo de Poder (detras) ----
    if (shield && pose !== 'defeated') {
      ctx.save();
      var pulse = 1 + Math.sin(t * 5) * 0.06;
      ctx.globalAlpha = 0.28;
      var rg = ctx.createRadialGradient(0, bodyY, 20, 0, bodyY, 95 * pulse);
      rg.addColorStop(0, 'rgba(255,180,60,0.0)');
      rg.addColorStop(0.6, 'rgba(255,120,20,0.55)');
      rg.addColorStop(1, 'rgba(220,40,20,0.0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      // borde ondulado (distorsion)
      for (var a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 16) {
        var wob = 88 * pulse + Math.sin(a * 6 + t * 8) * 8;
        var px = Math.cos(a) * wob;
        var py = bodyY + Math.sin(a) * wob * 0.95;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // llamas naranjas girando
      ctx.globalAlpha = 0.5;
      for (var fi = 0; fi < 10; fi++) {
        var fa = (fi / 10) * Math.PI * 2 + t * 1.5;
        var fr = 80 + Math.sin(t * 6 + fi) * 6;
        var fx = Math.cos(fa) * fr, fy2 = bodyY + Math.sin(fa) * fr * 0.9;
        circle(ctx, fx, fy2, 6 + Math.sin(t * 8 + fi) * 3, 'rgba(255,140,30,0.8)', null);
      }
      ctx.restore();
    }

    ctx.translate(lean, crouch);

    ellipse(ctx, -lean * 0.5, -2, 40, 8, 'rgba(0,0,0,0.28)', null);

    // ---- piernas gruesas ----
    var legSwing = (pose === 'walk') ? walkC * 6 : 0;
    // pierna trasera
    rrFill(ctx, -26, -46, 20, 46, 9, TOR_SKIN, OUTLINE, LW);
    rrFill(ctx, -26, -46, 20, 20, 9, TOR_LEATHER, OUTLINE, 2.5); // muslera de cuero
    // pierna delantera
    ctx.save();
    ctx.translate(legSwing, 0);
    rrFill(ctx, 6, -46, 20, 46, 9, TOR_SKIN, OUTLINE, LW);
    rrFill(ctx, 6, -46, 20, 20, 9, TOR_LEATHER, OUTLINE, 2.5);
    ctx.restore();
    // pezunias
    rrFill(ctx, -27, -8, 22, 9, 4, '#2b1a0c', OUTLINE, 2.5);
    rrFill(ctx, 5 + legSwing, -8, 22, 9, 4, '#2b1a0c', OUTLINE, 2.5);

    // ---- torso hipermusculoso ----
    var tw = 66, th = 60;
    rrFill(ctx, -tw / 2, bodyY - th / 2, tw, th, 20, TOR_SKIN, OUTLINE, LW + 1);
    // pectorales
    circle(ctx, -14, bodyY - 8, 15, TOR_SKIN, 'rgba(120,70,30,0.7)', 2);
    circle(ctx, 14, bodyY - 8, 15, TOR_SKIN, 'rgba(120,70,30,0.7)', 2);
    // abdominales insinuados
    ctx.strokeStyle = 'rgba(120,70,30,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, bodyY + 4); ctx.lineTo(0, bodyY + 26); ctx.stroke();

    // ---- armadura de gladiador asimetrica (cuero + bronce) ----
    // hombrera grande (lado delantero, bronce con pinchos)
    ctx.save();
    ctx.translate(26, bodyY - 22 + breathe * 0.3);
    ellipse(ctx, 0, 0, 20, 16, TOR_BRONZE, OUTLINE, LW);
    ellipse(ctx, 0, 0, 20, 16, null, 'rgba(255,220,120,0.5)', 1.5);
    // pinchos
    for (var sp = -1; sp <= 1; sp++) {
      ctx.beginPath();
      ctx.moveTo(sp * 9 - 4, -12); ctx.lineTo(sp * 9, -22); ctx.lineTo(sp * 9 + 4, -12);
      ctx.closePath();
      ctx.fillStyle = TOR_HORN; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    // correa de cuero cruzada
    ctx.save();
    ctx.strokeStyle = TOR_LEATHER; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-26, bodyY - 24); ctx.lineTo(20, bodyY + 20); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-26, bodyY - 24); ctx.lineTo(20, bodyY + 20); ctx.stroke();
    ctx.restore();
    // hombrera trasera (cuero pequenio)
    ellipse(ctx, -30, bodyY - 18, 12, 11, TOR_LEATHER, OUTLINE, 2.5);
    // faldon de cuero
    rrFill(ctx, -tw / 2 + 4, bodyY + 22, tw - 8, 16, 5, TOR_LEATHER, OUTLINE, 2.5);
    // tachuelas de bronce
    for (var st = -2; st <= 2; st++) {
      circle(ctx, st * 11, bodyY + 30, 2.5, TOR_BRONZE, OUTLINE, 1.2);
    }

    // ---- brazos musculosos ----
    // brazo trasero
    ctx.save();
    ctx.translate(-30, bodyY - 6);
    if (pose === 'walk') ctx.rotate(-walkC * 0.2);
    rrFill(ctx, -8, 0, 16, 34, 8, TOR_SKIN, OUTLINE, LW);
    circle(ctx, 0, 36, 9, TOR_SKIN, OUTLINE, 2.5); // punio
    // brazalete de bronce
    rrFill(ctx, -9, 24, 18, 8, 3, TOR_BRONZE, OUTLINE, 2);
    ctx.restore();

    // brazo delantero (sostiene martillo o gesto)
    ctx.save();
    ctx.translate(30, bodyY - 6);
    var swingArm = 0;
    if (pose === 'slam') swingArm = -1.2 + Math.min(t * 12, Math.PI) * 0.0;
    if (pose === 'charge') swingArm = 0.4;
    if (pose === 'roar') swingArm = -0.5;
    if (pose === 'stunned') swingArm = 0.9;
    ctx.rotate(swingArm);
    rrFill(ctx, -8, 0, 16, 32, 8, TOR_SKIN, OUTLINE, LW);
    circle(ctx, 0, 34, 9, TOR_SKIN, OUTLINE, 2.5);
    rrFill(ctx, -9, 22, 18, 8, 3, TOR_BRONZE, OUTLINE, 2);
    ctx.restore();

    // ---- martillo con la Gema ----
    if (!sinMartillo && pose !== 'defeated') {
      ctx.save();
      var hx = 42, hy = bodyY + 26, hang = 0;
      if (pose === 'slam') { hy = bodyY - 4; hang = -0.6; }
      else if (pose === 'charge') { hx = 46; hy = bodyY + 10; hang = 0.5; }
      else if (pose === 'roar') { hx = 40; hy = bodyY - 20; hang = -1.1; }
      else { hang = 0.3 + Math.sin(t * 2) * 0.05; }
      gfx.drawHammer(ctx, hx, hy, { t: t, angle: hang, clavado: false, scale: 1 });
      ctx.restore();
    }

    // ---- cabeza de minotauro con casco y cuernos ----
    var headY = bodyY - th / 2 - 20 + breathe * 0.5;
    if (pose === 'roar') headY -= 4;
    // cuello grueso
    rrFill(ctx, -12, bodyY - th / 2 - 4, 24, 12, 6, TOR_SKIN, OUTLINE, LW);
    // craneo
    circle(ctx, 0, headY, 22, TOR_SKIN, OUTLINE, LW + 1);
    // hocico
    ellipse(ctx, 8, headY + 8, 16, 12, TOR_SKIN, OUTLINE, LW);
    // fosas nasales
    circle(ctx, 14, headY + 6, 2.5, '#4a2c14', null);
    circle(ctx, 14, headY + 12, 2.5, '#4a2c14', null);
    if (pose === 'charge' || pose === 'roar') {
      // vaho de furia
      ctx.save(); ctx.globalAlpha = 0.5;
      circle(ctx, 24 + Math.sin(t * 10) * 2, headY + 6, 4, '#e5e7eb', null);
      circle(ctx, 26 + Math.sin(t * 10) * 2, headY + 13, 4, '#e5e7eb', null);
      ctx.restore();
    }

    // casco de bronce
    ctx.save();
    rr(ctx, -22, headY - 20, 44, 20, 12);
    ctx.fillStyle = TOR_BRONZE; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,120,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    // cresta central
    rrFill(ctx, -3, headY - 28, 6, 12, 2, '#7a1a1a', OUTLINE, 2);
    ctx.restore();

    // cuernos enormes
    function horn(dir) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(dir * 16, headY - 12);
      ctx.quadraticCurveTo(dir * 44, headY - 26, dir * 40, headY - 46);
      ctx.quadraticCurveTo(dir * 34, headY - 30, dir * 22, headY - 16);
      ctx.closePath();
      ctx.fillStyle = TOR_HORN; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
      // anillos del cuerno
      ctx.strokeStyle = 'rgba(120,90,50,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(dir * 22, headY - 18); ctx.lineTo(dir * 30, headY - 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dir * 28, headY - 26); ctx.lineTo(dir * 36, headY - 30); ctx.stroke();
      ctx.restore();
    }
    horn(1); horn(-1);

    // ojos rojos brillantes
    var eyeR = 5;
    if (pose === 'stunned') {
      // ojos en espiral aturdido
      ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 2;
      for (var ei = -1; ei <= 1; ei += 2) {
        ctx.beginPath();
        for (var sa = 0; sa < Math.PI * 3; sa += 0.3) {
          var srr = sa * 0.9;
          var sx = ei * 9 + Math.cos(sa + t * 5) * srr;
          var sy = headY - 4 + Math.sin(sa + t * 5) * srr;
          if (sa === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
    } else if (pose === 'defeated') {
      // ojos cerrados (X apagada)
      ctx.strokeStyle = '#7a3b1a'; ctx.lineWidth = 2.5;
      for (var di = -1; di <= 1; di += 2) {
        ctx.beginPath();
        ctx.moveTo(di * 9 - 4, headY - 6); ctx.lineTo(di * 9 + 4, headY - 2);
        ctx.moveTo(di * 9 + 4, headY - 6); ctx.lineTo(di * 9 - 4, headY - 2);
        ctx.stroke();
      }
    } else {
      // ojos rojos con brillo (glow)
      ctx.save();
      ctx.shadowColor = TOR_EYE; ctx.shadowBlur = 10;
      circle(ctx, -9, headY - 4, eyeR, TOR_EYE, '#7a1010', 2);
      circle(ctx, 9, headY - 4, eyeR, TOR_EYE, '#7a1010', 2);
      ctx.restore();
      circle(ctx, -9 + 1.5, headY - 5, 1.5, '#fecaca', null);
      circle(ctx, 9 + 1.5, headY - 5, 1.5, '#fecaca', null);
      // cejas furiosas
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, headY - 11); ctx.lineTo(-3, headY - 7);
      ctx.moveTo(16, headY - 11); ctx.lineTo(3, headY - 7);
      ctx.stroke();
    }

    // boca / colmillos
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (pose === 'roar' || pose === 'charge') {
      // rugido: boca muy abierta
      ellipse(ctx, 6, headY + 12, 8, 6, '#5a1010', OUTLINE, 2.5);
    } else if (pose === 'defeated' || pose === 'hurt') {
      ctx.arc(6, headY + 14, 4, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
    } else {
      ctx.moveTo(-2, headY + 12); ctx.lineTo(14, headY + 12); ctx.stroke();
    }
    // colmillos
    ctx.beginPath();
    ctx.moveTo(-1, headY + 10); ctx.lineTo(-3, headY + 16); ctx.lineTo(1, headY + 12);
    ctx.closePath(); ctx.fillStyle = '#fffbe6'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, headY + 10); ctx.lineTo(14, headY + 16); ctx.lineTo(10, headY + 12);
    ctx.closePath(); ctx.fillStyle = '#fffbe6'; ctx.fill(); ctx.stroke();

    // aro nasal de bronce
    ctx.strokeStyle = TOR_BRONZE; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(12, headY + 15, 3, 0, Math.PI); ctx.stroke();

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  TORO-GUARDIA  (minotauro pequenio marron)
  //  poses: idle, walk, charge, hurt
  // --------------------------------------------------------------------------
  gfx.drawToroGuard = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, 0);
    var facing = (o.facing === -1) ? -1 : 1;
    var pose = o.pose || 'idle';
    var scale = num(o.scale, 1);

    ctx.save();
    beginChar(ctx, x, y, scale, facing);

    var breathe = Math.sin(t * 3) * 1;
    var walkC = Math.sin(t * 11);
    var bodyY = -26;
    var lean = 0;
    if (pose === 'walk') bodyY += Math.abs(walkC) * -1.5;
    if (pose === 'charge') lean = 8;
    if (pose === 'hurt') lean = -5;

    ctx.translate(lean, 0);
    ellipse(ctx, -lean * 0.4, -1, 15, 4, 'rgba(0,0,0,0.22)', null);

    // piernas
    var ls = (pose === 'walk') ? walkC * 5 : 0;
    rrFill(ctx, -10, -16, 9, 16, 4, '#6b3f1d', OUTLINE, 2.5);
    ctx.save(); ctx.translate(ls, 0);
    rrFill(ctx, 1, -16, 9, 16, 4, '#6b3f1d', OUTLINE, 2.5);
    ctx.restore();
    rrFill(ctx, -11, -3, 11, 5, 2, '#2b1a0c', OUTLINE, 2);
    rrFill(ctx, 1 + ls, -3, 11, 5, 2, '#2b1a0c', OUTLINE, 2);

    // torso
    rrFill(ctx, -14, bodyY, 28, 26, 10, '#8a5a2b', OUTLINE, LW);
    rrFill(ctx, -12, bodyY + 4, 24, 14, 6, TOR_LEATHER, OUTLINE, 2.5); // peto
    // tachuelas
    circle(ctx, -6, bodyY + 11, 2, TOR_BRONZE, OUTLINE, 1);
    circle(ctx, 6, bodyY + 11, 2, TOR_BRONZE, OUTLINE, 1);

    // brazos
    ctx.save();
    if (pose === 'run' || pose === 'walk') ctx.rotate(-walkC * 0.25);
    rrFill(ctx, -18, bodyY + 4, 7, 15, 3.5, '#8a5a2b', OUTLINE, 2.5);
    circle(ctx, -14, bodyY + 20, 4, '#8a5a2b', OUTLINE, 2);
    ctx.restore();
    ctx.save();
    if (pose === 'charge') ctx.rotate(0.4);
    rrFill(ctx, 11, bodyY + 4, 7, 15, 3.5, '#8a5a2b', OUTLINE, 2.5);
    circle(ctx, 15, bodyY + 20, 4, '#8a5a2b', OUTLINE, 2);
    ctx.restore();

    // cabeza
    var headY = bodyY - 14 + breathe * 0.4;
    circle(ctx, 0, headY, 14, '#8a5a2b', OUTLINE, LW);
    ellipse(ctx, 6, headY + 5, 9, 7, '#8a5a2b', OUTLINE, 2.5); // hocico
    circle(ctx, 10, headY + 3, 1.5, '#3a2410', null);
    circle(ctx, 10, headY + 7, 1.5, '#3a2410', null);
    // cuernos pequenios
    function ghorn(d) {
      ctx.beginPath();
      ctx.moveTo(d * 10, headY - 8);
      ctx.quadraticCurveTo(d * 22, headY - 14, d * 20, headY - 24);
      ctx.quadraticCurveTo(d * 16, headY - 14, d * 6, headY - 10);
      ctx.closePath();
      ctx.fillStyle = TOR_HORN; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    }
    ghorn(1); ghorn(-1);
    // ojos rojos
    var blink = (Math.sin(t * 2.9) > 0.98);
    if (pose === 'hurt') {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, headY - 4); ctx.lineTo(-4, headY - 1);
      ctx.moveTo(-4, headY - 4); ctx.lineTo(-8, headY - 1);
      ctx.stroke();
    } else {
      circle(ctx, -6, headY - 2, 2.6, TOR_EYE, '#7a1010', 1.5);
      if (!blink) circle(ctx, -5, headY - 3, 1, '#fecaca', null);
    }
    // ceja
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-11, headY - 6); ctx.lineTo(-2, headY - 3); ctx.stroke();

    if (pose === 'charge') {
      // signo de embestida arriba
      ctx.save(); ctx.scale(facing, 1);
      ctx.restore();
    }

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  DRON rojo volador  ((x,y) = CENTRO)
  // --------------------------------------------------------------------------
  gfx.drawDrone = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, 0);
    var scale = num(o.scale, 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';

    var bob = Math.sin(t * 6) * 1.5;
    // aspas girando
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    for (var s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.ellipse(s * 14, -8, 9, 3, t * 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // brazos a las aspas
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -2); ctx.lineTo(-14, -8);
    ctx.moveTo(8, -2); ctx.lineTo(14, -8);
    ctx.stroke();
    circle(ctx, -14, -8, 3, '#dc2626', OUTLINE, 2);
    circle(ctx, 14, -8, 3, '#dc2626', OUTLINE, 2);

    // cuerpo (esfera roja)
    circle(ctx, 0, bob, 12, '#dc2626', OUTLINE, LW);
    circle(ctx, 0, bob, 12, null, 'rgba(255,150,150,0.4)', 1.5);
    // ojo central (lente que escanea)
    circle(ctx, 0, bob + 1, 6, '#1a1a2e', OUTLINE, 2);
    var scan = Math.sin(t * 4) * 3;
    circle(ctx, scan, bob + 1, 3, '#f87171', null);
    circle(ctx, scan + 1, bob, 1.2, '#fff', null);
    // lucecita inferior
    circle(ctx, 0, bob + 12, 2, Math.sin(t * 8) > 0 ? '#fca5a5' : '#7f1d1d', null);

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  TORRETA  ((x,y) = CENTRO)  o.hacked (verde aliada), o.angle
  // --------------------------------------------------------------------------
  gfx.drawTurret = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, 0);
    var scale = num(o.scale, 1);
    var hacked = !!o.hacked;
    var angle = num(o.angle, 0);
    var base = hacked ? '#16a34a' : '#7f1d1d';
    var barrel = hacked ? '#22c55e' : '#ef4444';
    var acc = hacked ? '#86efac' : '#fca5a5';

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';

    // base
    rrFill(ctx, -16, 4, 32, 12, 5, '#334155', OUTLINE, LW);
    rrFill(ctx, -12, -4, 24, 12, 6, base, OUTLINE, LW);
    // luz de estado
    circle(ctx, 0, 0, 3, hacked ? '#bbf7d0' : (Math.sin(t * 6) > 0 ? acc : '#450a0a'), OUTLINE, 1.5);

    // canion giratorio
    ctx.save();
    ctx.translate(0, -2);
    ctx.rotate(angle);
    rrFill(ctx, 0, -4, 22, 8, 3, barrel, OUTLINE, 2.5);
    rrFill(ctx, 20, -5, 5, 10, 2, '#1e293b', OUTLINE, 2);
    // boca del canion
    circle(ctx, 24, 0, 2, '#0b1020', null);
    ctx.restore();

    // cupula superior
    ctx.beginPath();
    ctx.arc(0, -2, 9, Math.PI, 0);
    ctx.fillStyle = base; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  NAVE DEL DIRECTOR (azul)  ((x,y)=CENTRO)  o.tilt
  //  o.esquema==='falcon' -> recolorea alas/casco/cabina a verdes de Falcon
  //  (nave de P2 en co-op). Cualquier otro valor = nave azul del Director.
  // --------------------------------------------------------------------------
  gfx.drawPlayerShip = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, 0);
    var scale = num(o.scale, 1);
    var tilt = num(o.tilt, 0);
    var falcon = (o.esquema === 'falcon');

    // Paleta segun esquema (por defecto: Director, identico a hoy).
    var wingCol = falcon ? FAL_DARK : DIR_SUIT;    // alas
    var hullCol = falcon ? FAL_GREEN : DIR_SUIT2;  // fuselaje
    var stripeCol = falcon ? '#dcfce7' : '#e0f2fe'; // franja / brillo
    var glassCol = falcon ? '#86efac' : DIR_WATCH;  // cabina
    var noseCol = falcon ? '#dcfce7' : '#e0f2fe';   // punta frontal

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(tilt * 0.12);
    ctx.lineJoin = 'round';

    // llama del motor (detras, izquierda)
    var fl = 14 + Math.sin(t * 30) * 5;
    ctx.beginPath();
    ctx.moveTo(-24, -5); ctx.lineTo(-24 - fl, 0); ctx.lineTo(-24, 5); ctx.closePath();
    ctx.fillStyle = '#f59e0b'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-24, -3); ctx.lineTo(-24 - fl * 0.6, 0); ctx.lineTo(-24, 3); ctx.closePath();
    ctx.fillStyle = '#fde68a'; ctx.fill();

    // alas
    ctx.beginPath();
    ctx.moveTo(-6, 4); ctx.lineTo(-18, 16); ctx.lineTo(2, 12); ctx.closePath();
    ctx.fillStyle = wingCol; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(-18, -16); ctx.lineTo(2, -12); ctx.closePath();
    ctx.fillStyle = wingCol; ctx.fill(); ctx.stroke();

    // fuselaje (forma de halcon/flecha)
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.quadraticCurveTo(6, -12, -22, -8);
    ctx.quadraticCurveTo(-26, 0, -22, 8);
    ctx.quadraticCurveTo(6, 12, 28, 0);
    ctx.closePath();
    ctx.fillStyle = hullCol; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    // franja
    ctx.beginPath();
    ctx.moveTo(24, 0); ctx.quadraticCurveTo(0, -5, -18, -3);
    ctx.strokeStyle = stripeCol; ctx.lineWidth = 2; ctx.stroke();

    // cabina cian holografica
    ctx.beginPath();
    ctx.ellipse(6, -1, 8, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = glassCol; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    // brillo cabina
    ctx.globalAlpha = 0.6;
    circle(ctx, 4, -3, 2.5, '#fff', null);
    ctx.globalAlpha = 1;

    // punta / canion frontal
    rrFill(ctx, 26, -2, 8, 4, 1.5, noseCol, OUTLINE, 2);

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  NAVE ENEMIGA  ((x,y)=CENTRO)  o.type 'small'|'medium'|'guardian', o.hacked
  // --------------------------------------------------------------------------
  gfx.drawEnemyShip = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, 0);
    var scale = num(o.scale, 1);
    var type = o.type || 'small';
    var hacked = !!o.hacked;
    var main = hacked ? '#16a34a' : '#991b1b';
    var main2 = hacked ? '#22c55e' : '#dc2626';
    var glow = hacked ? '#86efac' : '#fca5a5';

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    // las enemigas miran a la izquierda (avanzan hacia el jugador)
    ctx.scale(-1, 1);

    if (type === 'guardian') {
      // mini-jefe grande
      // motores traseros
      var g = 10 + Math.sin(t * 25) * 4;
      for (var m = -1; m <= 1; m += 2) {
        ctx.beginPath();
        ctx.moveTo(-30, m * 14 - 4); ctx.lineTo(-30 - g, m * 14); ctx.lineTo(-30, m * 14 + 4);
        ctx.closePath();
        ctx.fillStyle = hacked ? '#4ade80' : '#f59e0b'; ctx.fill();
      }
      // casco
      ctx.beginPath();
      ctx.moveTo(42, 0);
      ctx.quadraticCurveTo(10, -26, -30, -20);
      ctx.lineTo(-34, 0);
      ctx.lineTo(-30, 20);
      ctx.quadraticCurveTo(10, 26, 42, 0);
      ctx.closePath();
      ctx.fillStyle = main; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW + 1; ctx.stroke();
      // placas
      rrFill(ctx, -20, -14, 34, 28, 6, main2, OUTLINE, 2.5);
      // torretas laterales
      circle(ctx, 4, -18, 6, main2, OUTLINE, 2.5);
      circle(ctx, 4, 18, 6, main2, OUTLINE, 2.5);
      // ojo/nucleo central
      ctx.save();
      ctx.shadowColor = glow; ctx.shadowBlur = 12;
      circle(ctx, 10, 0, 9, hacked ? '#22c55e' : '#ef4444', OUTLINE, 2.5);
      ctx.restore();
      circle(ctx, 10, 0, 4, '#fff', null);
      circle(ctx, 10, 0, 4, glow, null);
      // canion frontal
      rrFill(ctx, 38, -4, 12, 8, 2, '#1e293b', OUTLINE, 2.5);
    } else if (type === 'medium') {
      var gm = 8 + Math.sin(t * 22) * 3;
      ctx.beginPath();
      ctx.moveTo(-22, -3); ctx.lineTo(-22 - gm, 0); ctx.lineTo(-22, 3); ctx.closePath();
      ctx.fillStyle = hacked ? '#4ade80' : '#f59e0b'; ctx.fill();
      // alas angulosas
      ctx.beginPath();
      ctx.moveTo(-4, 6); ctx.lineTo(-16, 18); ctx.lineTo(6, 14); ctx.closePath();
      ctx.fillStyle = main; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -6); ctx.lineTo(-16, -18); ctx.lineTo(6, -14); ctx.closePath();
      ctx.fillStyle = main; ctx.fill(); ctx.stroke();
      // casco
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.quadraticCurveTo(2, -12, -20, -8);
      ctx.lineTo(-22, 0); ctx.lineTo(-20, 8);
      ctx.quadraticCurveTo(2, 12, 24, 0);
      ctx.closePath();
      ctx.fillStyle = main2; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
      // ojo
      circle(ctx, 8, 0, 5, hacked ? '#22c55e' : '#ef4444', OUTLINE, 2);
      circle(ctx, 8, 0, 2, glow, null);
      // canioncitos
      rrFill(ctx, 20, -5, 6, 3, 1, '#1e293b', OUTLINE, 1.5);
      rrFill(ctx, 20, 2, 6, 3, 1, '#1e293b', OUTLINE, 1.5);
    } else {
      // small: caza rapido
      var gs = 6 + Math.sin(t * 26) * 2;
      ctx.beginPath();
      ctx.moveTo(-14, -2); ctx.lineTo(-14 - gs, 0); ctx.lineTo(-14, 2); ctx.closePath();
      ctx.fillStyle = hacked ? '#4ade80' : '#f59e0b'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.quadraticCurveTo(-2, -9, -14, -5);
      ctx.lineTo(-15, 0); ctx.lineTo(-14, 5);
      ctx.quadraticCurveTo(-2, 9, 16, 0);
      ctx.closePath();
      ctx.fillStyle = main2; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
      circle(ctx, 4, 0, 4, hacked ? '#22c55e' : '#ef4444', OUTLINE, 2);
      circle(ctx, 5, -1, 1.5, glow, null);
    }

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  ASTEROIDE  drawAsteroid(ctx,x,y,r,seed)
  // --------------------------------------------------------------------------
  gfx.drawAsteroid = function (ctx, x, y, r, seed) {
    r = num(r, 20);
    var rnd = seeded(num(seed, 1) + 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    // rotacion lenta basada en semilla + tiempo global
    var t = num((window.G && window.G.T), 0);
    ctx.rotate((num(seed, 0) * 0.7 + t * 0.3) % (Math.PI * 2));

    var n = 9;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var rr2 = r * (0.75 + rnd() * 0.45);
      pts.push([Math.cos(a) * rr2, Math.sin(a) * rr2]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var j = 1; j < n; j++) ctx.lineTo(pts[j][0], pts[j][1]);
    ctx.closePath();
    ctx.fillStyle = '#6b7280'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    // sombreado
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, -r, r * 1.5, r * 2);
    ctx.restore();
    // crateres
    for (var c = 0; c < 3; c++) {
      var cx = (rnd() - 0.5) * r, cy = (rnd() - 0.5) * r;
      circle(ctx, cx, cy, r * (0.1 + rnd() * 0.12), '#4b5563', 'rgba(0,0,0,0.3)', 1);
    }
    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  MARTILLO con la Gema  drawHammer(ctx,x,y,o)  o.angle, o.clavado
  //  (x,y) = punto de agarre / centro del mango
  // --------------------------------------------------------------------------
  gfx.drawHammer = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, (window.G && window.G.T) || 0);
    var angle = num(o.angle, 0);
    var clavado = !!o.clavado;
    var scale = num(o.scale, 1);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(angle);
    ctx.lineJoin = 'round';

    // mango
    rrFill(ctx, -4, -6, 8, 46, 3, TOR_LEATHER, OUTLINE, LW);
    // vendaje del mango
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    for (var w = 0; w < 4; w++) {
      ctx.beginPath(); ctx.moveTo(-4, 4 + w * 8); ctx.lineTo(4, 8 + w * 8); ctx.stroke();
    }
    // pomo inferior
    circle(ctx, 0, 42, 5, TOR_BRONZE, OUTLINE, 2.5);

    // cabeza del martillo (bloque masivo de bronce/hierro)
    rrFill(ctx, -22, -26, 44, 26, 6, '#4b5563', OUTLINE, LW + 1);
    rrFill(ctx, -22, -26, 44, 8, 6, '#6b7280', null); // brillo superior
    // remaches de bronce
    for (var rv = -1; rv <= 1; rv++) {
      circle(ctx, rv * 14, -21, 2.5, TOR_BRONZE, OUTLINE, 1.2);
      circle(ctx, rv * 14, -5, 2.5, TOR_BRONZE, OUTLINE, 1.2);
    }
    // pinchos laterales
    ctx.beginPath();
    ctx.moveTo(-22, -20); ctx.lineTo(-32, -13); ctx.lineTo(-22, -8); ctx.closePath();
    ctx.fillStyle = TOR_HORN; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(22, -20); ctx.lineTo(32, -13); ctx.lineTo(22, -8); ctx.closePath();
    ctx.fillStyle = TOR_HORN; ctx.fill(); ctx.stroke();

    // Gema del Poder incrustada (pulsante)
    ctx.save();
    ctx.translate(0, -13);
    var gp = 1 + Math.sin(t * 4) * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.5;
    circle(ctx, 0, 0, 12 * gp, GEM_A, null); // halo
    ctx.restore();
    gfx.drawGem(ctx, 0, 0, t);
    ctx.restore();

    // efecto de clavado: destellos en la base al estar hincado
    if (clavado) {
      ctx.save();
      ctx.rotate(-angle); // los destellos en vertical mundo
      ctx.globalAlpha = 0.5 + Math.sin(t * 12) * 0.3;
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
      for (var d = -1; d <= 1; d += 2) {
        ctx.beginPath();
        ctx.moveTo(d * 8, 42); ctx.lineTo(d * 16, 50);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  GEMA  drawGem(ctx,x,y,t)  (x,y)=centro
  // --------------------------------------------------------------------------
  gfx.drawGem = function (ctx, x, y, t) {
    t = num(t, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    var pulse = 1 + Math.sin(t * 5) * 0.08;
    ctx.scale(pulse, pulse);

    // faceta (rombo alargado)
    var g = ctx.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, GEM_A);
    g.addColorStop(1, GEM_B);
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, -3);
    ctx.lineTo(4, 8);
    ctx.lineTo(-4, 8);
    ctx.lineTo(-6, -3);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#4c0519'; ctx.lineWidth = 2; ctx.stroke();
    // facetas internas
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(0, 8);
    ctx.moveTo(-6, -3); ctx.lineTo(6, -3);
    ctx.stroke();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(-2, -6); ctx.lineTo(1, -6); ctx.lineTo(-1, -1); ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  CELDA DE ENERGIA con Lord Falcon dentro  drawEnergyCell(ctx,x,y,o)  o.open
  //  (x,y) = CENTRO de la celda
  // --------------------------------------------------------------------------
  gfx.drawEnergyCell = function (ctx, x, y, o) {
    o = o || {};
    var t = num(o.t, (window.G && window.G.T) || 0);
    var open = !!o.open;
    var scale = num(o.scale, 1);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';

    var w = 60, h = 100;

    // base y tapa (emisores)
    rrFill(ctx, -w / 2 - 6, h / 2 - 6, w + 12, 14, 4, '#334155', OUTLINE, LW);
    rrFill(ctx, -w / 2 - 6, -h / 2 - 8, w + 12, 14, 4, '#334155', OUTLINE, LW);
    circle(ctx, -w / 2 + 4, -h / 2, 4, '#f59e0b', OUTLINE, 2);
    circle(ctx, w / 2 - 4, -h / 2, 4, '#f59e0b', OUTLINE, 2);

    if (!open) {
      // campo de energia naranja
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.1;
      var eg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      eg.addColorStop(0, 'rgba(251,146,60,0.6)');
      eg.addColorStop(0.5, 'rgba(249,115,22,0.35)');
      eg.addColorStop(1, 'rgba(251,146,60,0.6)');
      rrFill(ctx, -w / 2, -h / 2, w, h, 10, eg, null);
      ctx.restore();
      // rayas de energia
      ctx.save();
      rr(ctx, -w / 2, -h / 2, w, h, 10); ctx.clip();
      ctx.strokeStyle = 'rgba(255,200,120,0.5)'; ctx.lineWidth = 2;
      for (var r = 0; r < 6; r++) {
        var ry = -h / 2 + ((t * 40 + r * 20) % h);
        ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2 + ((t * 30 + r * 18) % h));
        ctx.lineTo(w / 2, -h / 2 + ((t * 30 + r * 18 + 10) % h)); ctx.stroke();
      }
      ctx.restore();
      // marco
      rrFill(ctx, -w / 2, -h / 2, w, h, 10, null, '#fb923c', 2.5);
    }

    // Lord Falcon dentro (sentado, atrapado)
    ctx.save();
    ctx.translate(0, h / 2 - 8);
    gfx.drawFalcon(ctx, 0, 0, { t: t, facing: 1, pose: 'idle', scale: 0.8, enCelda: !open });
    ctx.restore();

    if (open) {
      // sparkles de liberacion
      ctx.save();
      for (var s = 0; s < 6; s++) {
        var sa = (s / 6) * Math.PI * 2 + t;
        gfx.drawSparkle(ctx, Math.cos(sa) * 30, Math.sin(sa) * 40, (t + s * 0.16) % 1);
      }
      ctx.restore();
    }

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  CORAZON  drawHeart(ctx,x,y,size,fill)  fill:'full'|'half'|'empty'
  //  (x,y) = centro
  // --------------------------------------------------------------------------
  gfx.drawHeart = function (ctx, x, y, size, fill) {
    size = num(size, 20);
    fill = fill || 'full';
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    var s = size / 20;
    ctx.scale(s, s);

    function heartPath() {
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-12, -4, -10, -14, -4, -14);
      ctx.bezierCurveTo(-1, -14, 0, -11, 0, -9);
      ctx.bezierCurveTo(0, -11, 1, -14, 4, -14);
      ctx.bezierCurveTo(10, -14, 12, -4, 0, 8);
      ctx.closePath();
    }

    // fondo vacio siempre
    heartPath();
    ctx.fillStyle = '#3f3f52'; ctx.fill();

    if (fill === 'full') {
      heartPath();
      ctx.fillStyle = '#ef4444'; ctx.fill();
    } else if (fill === 'half') {
      ctx.save();
      heartPath(); ctx.clip();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-14, -16, 14, 32); // solo mitad izquierda
      ctx.restore();
    }
    // brillo
    if (fill !== 'empty') {
      ctx.save();
      heartPath(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(-4, -8, 3, 4, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // contorno
    heartPath();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.restore();
  };

  // --------------------------------------------------------------------------
  //  CAJA rompible  drawBox(ctx,x,y,size)  (x,y)=centro
  // --------------------------------------------------------------------------
  gfx.drawBox = function (ctx, x, y, size) {
    size = num(size, 44);
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    var h = size / 2;
    rrFill(ctx, -h, -h, size, size, 5, '#a16207', OUTLINE, LW);
    // vetas de madera
    rrFill(ctx, -h + 3, -h + 3, size - 6, size - 6, 3, null, 'rgba(120,53,15,0.6)', 2);
    ctx.strokeStyle = 'rgba(120,53,15,0.6)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-h, -h); ctx.lineTo(h, h);
    ctx.moveTo(h, -h); ctx.lineTo(-h, h);
    ctx.stroke();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    rrFill(ctx, -h + 4, -h + 4, size * 0.35, 4, 2, 'rgba(255,255,255,0.3)', null);
    ctx.restore();
  };

  // ==========================================================================
  //  EFECTOS
  // ==========================================================================

  // Espadazo  drawSlash(ctx,x,y,facing,t01)
  gfx.drawSlash = function (ctx, x, y, facing, t01) {
    facing = (facing === -1) ? -1 : 1;
    t01 = G.clamp ? G.clamp(num(t01, 0), 0, 1) : Math.max(0, Math.min(1, num(t01, 0)));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.globalAlpha = 1 - t01 * 0.8;
    var a0 = -1.1 + t01 * 2.2;   // barrido
    var r = 34;
    ctx.strokeStyle = '#e5f2ff'; ctx.lineWidth = 8 * (1 - t01 * 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r, a0 - 0.5, a0 + 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(180,220,255,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, a0 - 0.4, a0 + 0.4);
    ctx.stroke();
    ctx.restore();
  };

  // Punietazo  drawPunch(ctx,x,y,facing,t01)
  gfx.drawPunch = function (ctx, x, y, facing, t01) {
    facing = (facing === -1) ? -1 : 1;
    t01 = Math.max(0, Math.min(1, num(t01, 0)));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    var ext = Math.sin(t01 * Math.PI) * 12;
    ctx.globalAlpha = 1 - t01 * 0.7;
    // estrella de impacto
    ctx.save();
    ctx.translate(ext, 0);
    ctx.fillStyle = '#fde68a';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      var rr2 = (i % 2 === 0) ? 16 : 7;
      var px = Math.cos(a) * rr2, py = Math.sin(a) * rr2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // POW lineas
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
    for (var k = 0; k < 3; k++) {
      var ka = -0.4 + k * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ka) * 18, Math.sin(ka) * 18);
      ctx.lineTo(Math.cos(ka) * 26, Math.sin(ka) * 26);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  };

  // Flecha proyectil  drawArrowProj(ctx,x,y,angle)  (x,y)=centro
  gfx.drawArrowProj = function (ctx, x, y, angle) {
    angle = num(angle, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.lineJoin = 'round';
    // asta
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.stroke();
    // punta
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.closePath();
    ctx.fillStyle = '#cbd5e1'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
    // plumas
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(-16, -4);
    ctx.moveTo(-12, 0); ctx.lineTo(-16, 4);
    ctx.moveTo(-9, 0); ctx.lineTo(-13, -4);
    ctx.moveTo(-9, 0); ctx.lineTo(-13, 4);
    ctx.stroke();
    ctx.restore();
  };

  // Pulso electrico  drawZap(ctx,x,y,facing,t01)
  gfx.drawZap = function (ctx, x, y, facing, t01) {
    facing = (facing === -1) ? -1 : 1;
    t01 = Math.max(0, Math.min(1, num(t01, 0)));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.globalAlpha = 1 - t01;
    var len = 40 + t01 * 60;
    // rayo en zigzag
    ctx.strokeStyle = DIR_WATCH; ctx.lineWidth = 4;
    ctx.shadowColor = DIR_WATCH; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    var seg = 5;
    for (var i = 1; i <= seg; i++) {
      var px = (len / seg) * i;
      var py = (i % 2 === 0 ? -1 : 1) * (6 - t01 * 3) * (Math.random ? 1 : 1);
      py = (i % 2 === 0 ? -1 : 1) * 6;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    // nucleo blanco
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (var j = 1; j <= seg; j++) {
      ctx.lineTo((len / seg) * j, (j % 2 === 0 ? -1 : 1) * 6);
    }
    ctx.stroke();
    // chispitas en la punta
    circle(ctx, len, 0, 4 - t01 * 2, '#e0f7ff', null);
    ctx.restore();
  };

  // Laser  drawLaserBolt(ctx,x,y,w,color)  (x,y)=centro, w=largo
  gfx.drawLaserBolt = function (ctx, x, y, w, color) {
    w = num(w, 20);
    color = color || '#38bdf8';
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.shadowColor = color; ctx.shadowBlur = 8;
    rrFill(ctx, -w / 2, -3, w, 6, 3, color, null);
    ctx.shadowBlur = 0;
    rrFill(ctx, -w / 2 + 2, -1.5, w - 4, 3, 1.5, '#ffffff', null);
    ctx.restore();
  };

  // Explosion alegre  drawExplosion(ctx,x,y,t01,r)
  gfx.drawExplosion = function (ctx, x, y, t01, r) {
    t01 = Math.max(0, Math.min(1, num(t01, 0)));
    r = num(r, 24);
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    var rad = r * (0.3 + t01 * 0.9);
    ctx.globalAlpha = 1 - t01;
    // nube central
    var cols = ['#fde047', '#fb923c', '#f87171'];
    for (var c = 0; c < 3; c++) {
      circle(ctx, 0, 0, rad * (1 - c * 0.22), cols[c], null);
    }
    // "pop" estrellado
    ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 3;
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 + t01;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rad * 0.6, Math.sin(a) * rad * 0.6);
      ctx.lineTo(Math.cos(a) * rad * (1.2 + t01 * 0.4), Math.sin(a) * rad * (1.2 + t01 * 0.4));
      ctx.stroke();
    }
    // chispitas
    ctx.fillStyle = '#fef9c3';
    for (var s = 0; s < 6; s++) {
      var sa = (s / 6) * Math.PI * 2 - t01;
      var sr = rad * (1 + t01);
      circle(ctx, Math.cos(sa) * sr, Math.sin(sa) * sr, 2.5 * (1 - t01), '#fef9c3', null);
    }
    ctx.restore();
  };

  // Rayo de hackeo  drawHackBeam(ctx,x1,y1,x2,y2,t)
  gfx.drawHackBeam = function (ctx, x1, y1, x2, y2, t) {
    t = num(t, 0);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // haz principal verde/cian
    ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(34,211,238,0.85)'; ctx.lineWidth = 5;
    ctx.beginPath();
    // ligero zigzag digital
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var seg = 8;
    ctx.moveTo(x1, y1);
    for (var i = 1; i < seg; i++) {
      var f = i / seg;
      var off = Math.sin(f * Math.PI * 4 + t * 20) * 4 * (1 - Math.abs(f - 0.5) * 2 + 0.5);
      ctx.lineTo(x1 + dx * f + nx * off, y1 + dy * f + ny * off);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // nucleo blanco
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(224,247,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // "bits" viajando
    ctx.fillStyle = '#a5f3fc';
    for (var b = 0; b < 4; b++) {
      var bf = ((t * 1.5 + b * 0.25) % 1);
      var bx = x1 + dx * bf, by = y1 + dy * bf;
      ctx.fillRect(bx - 2, by - 2, 4, 4);
    }
    // impacto en destino
    circle(ctx, x2, y2, 6 + Math.sin(t * 20) * 2, 'rgba(134,239,172,0.7)', null);
    ctx.restore();
  };

  // Onda expansiva  drawShockwave(ctx,x,y,radio,t01)
  gfx.drawShockwave = function (ctx, x, y, radio, t01) {
    radio = num(radio, 40);
    t01 = Math.max(0, Math.min(1, num(t01, 0)));
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 1 - t01;
    // anillo de energia naranja pegado al suelo (elipse aplanada)
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 6 * (1 - t01 * 0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0, radio, radio * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, radio * 0.85, radio * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    // polvo levantandose
    ctx.fillStyle = 'rgba(251,146,60,0.5)';
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      var px = Math.cos(a) * radio * 0.9;
      circle(ctx, px, -t01 * 12, 4 * (1 - t01), 'rgba(253,224,71,0.6)', null);
    }
    ctx.restore();
  };

  // Destello / sparkle  drawSparkle(ctx,x,y,t01)
  gfx.drawSparkle = function (ctx, x, y, t01) {
    t01 = Math.max(0, Math.min(1, num(t01, 0)));
    ctx.save();
    ctx.translate(x, y);
    var s = Math.sin(t01 * Math.PI); // aparece y desaparece
    ctx.globalAlpha = s;
    ctx.rotate(t01 * 1.5);
    var r = 8 * s + 2;
    ctx.fillStyle = '#feffc9';
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = (i / 4) * Math.PI * 2;
      var a2 = a + Math.PI / 4;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.35, Math.sin(a2) * r * 0.35);
    }
    ctx.closePath();
    ctx.fill();
    circle(ctx, 0, 0, r * 0.3, '#ffffff', null);
    ctx.restore();
  };

  // Signo de exclamacion (telegrafia)  drawExclamation(ctx,x,y)
  gfx.drawExclamation = function (ctx, x, y) {
    var t = num((window.G && window.G.T), 0);
    ctx.save();
    ctx.translate(x, y);
    var bob = Math.sin(t * 12) * 2;
    ctx.translate(0, bob);
    var s = 1 + Math.sin(t * 12) * 0.08;
    ctx.scale(s, s);
    // burbuja
    ctx.beginPath();
    ctx.moveTo(0, 14); ctx.lineTo(-5, 6); ctx.lineTo(5, 6); ctx.closePath();
    circle(ctx, 0, -6, 13, '#fbbf24', OUTLINE, LW);
    ctx.beginPath();
    ctx.moveTo(0, 14); ctx.lineTo(-5, 4); ctx.lineTo(5, 4); ctx.closePath();
    ctx.fillStyle = '#fbbf24'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    // signo
    ctx.fillStyle = OUTLINE;
    rrFill(ctx, -2.5, -13, 5, 10, 2, OUTLINE, null);
    circle(ctx, 0, 1, 2.5, OUTLINE, null);
    ctx.restore();
  };

  // ==========================================================================
  //  JUANJO y PAPA (muñequitos frontales, estilo del juego) — (x,y)=pies
  //  Diseñados con Juanjo: Juanjo lleva gafas azules; Papa es "Juanjo grande"
  //  con barba y sin gafas. Se usan como narrador y en el final de creditos.
  // ==========================================================================
  function frontEye(ctx, x, y, r, blink) {
    if (blink) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
      return;
    }
    circle(ctx, x, y, r, '#ffffff', OUTLINE, 2);
    circle(ctx, x, y + r * 0.15, r * 0.55, OUTLINE, null);
    circle(ctx, x + r * 0.2, y - r * 0.15, r * 0.24, '#ffffff', null);
  }

  gfx.drawJuanjo = function (ctx, x, y, o) {
    o = o || {};
    var s = num(o.scale, 1), t = num(o.t, 0);
    var SKIN = '#f4c9a0', HAIR = '#4a2f1a', HOODIE = '#20305a', HOODIE2 = '#2c4276', GLASS = '#2f6bff';
    var blink = (Math.sin(t * 2.3) > 0.985);
    ctx.save();
    beginChar(ctx, x, y, s, 1);
    ellipse(ctx, 0, -1, 26, 6, 'rgba(0,0,0,0.22)', null);
    // piernas + zapatillas
    rrFill(ctx, -11, -20, 10, 20, 5, '#28324d', OUTLINE, 2.5);
    rrFill(ctx, 1, -20, 10, 20, 5, '#28324d', OUTLINE, 2.5);
    rrFill(ctx, -12, -4, 12, 6, 3, '#e2e8f0', OUTLINE, 2.5);
    rrFill(ctx, 0, -4, 12, 6, 3, '#e2e8f0', OUTLINE, 2.5);
    // sudadera con capucha
    rrFill(ctx, -19, -52, 38, 34, 13, HOODIE, OUTLINE, LW);
    rrFill(ctx, -19, -52, 38, 12, 10, HOODIE2, OUTLINE, 2.5);
    rrFill(ctx, -11, -34, 22, 12, 6, HOODIE2, OUTLINE, 2);
    circle(ctx, -4, -40, 1.8, '#e2e8f0', OUTLINE, 1.2);
    circle(ctx, 4, -40, 1.8, '#e2e8f0', OUTLINE, 1.2);
    // brazos
    rrFill(ctx, -28, -50, 10, 22, 5, HOODIE, OUTLINE, 2.5); circle(ctx, -23, -30, 4.5, SKIN, OUTLINE, 2);
    rrFill(ctx, 18, -50, 10, 22, 5, HOODIE, OUTLINE, 2.5); circle(ctx, 23, -30, 4.5, SKIN, OUTLINE, 2);
    // cabeza
    var hy = -70;
    rrFill(ctx, -6, -56, 12, 7, 3, SKIN, OUTLINE, 2);
    circle(ctx, 0, hy, 18, SKIN, OUTLINE, LW);
    // pelo castaño
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-18, hy - 2);
    ctx.quadraticCurveTo(-20, hy - 20, 0, hy - 20); ctx.quadraticCurveTo(20, hy - 20, 18, hy - 2);
    ctx.quadraticCurveTo(10, hy - 9, 4, hy - 3); ctx.quadraticCurveTo(0, hy - 10, -3, hy - 3);
    ctx.quadraticCurveTo(-9, hy - 9, -18, hy - 2); ctx.closePath();
    ctx.fillStyle = HAIR; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    ctx.restore();
    // ojos + gafas azules (su seña)
    frontEye(ctx, -6.5, hy + 1, 3.4, blink); frontEye(ctx, 6.5, hy + 1, 3.4, blink);
    circle(ctx, -6.5, hy + 1, 6, null, GLASS, 2.6); circle(ctx, 6.5, hy + 1, 6, null, GLASS, 2.6);
    ctx.strokeStyle = GLASS; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-0.5, hy + 1); ctx.lineTo(0.5, hy + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12.5, hy + 0.5); ctx.lineTo(-16, hy - 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12.5, hy + 0.5); ctx.lineTo(16, hy - 0.5); ctx.stroke();
    // sonrisa + mejillas
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, hy + 8, 5, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
    ctx.globalAlpha = 0.5;
    circle(ctx, -11, hy + 6, 2.5, '#f0a0a0', null); circle(ctx, 11, hy + 6, 2.5, '#f0a0a0', null);
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  gfx.drawPapa = function (ctx, x, y, o) {
    o = o || {};
    var s = num(o.scale, 1), t = num(o.t, 0);
    // Misma paleta que Juanjo (pelo y ropa); más grande, con barba, sin gafas.
    var SKIN = '#f4c9a0', HAIR = '#4a2f1a', BEARD = '#3a2413', HOODIE = '#20305a', HOODIE2 = '#2c4276';
    var blink = (Math.sin(t * 2.3 + 1) > 0.985);
    ctx.save();
    beginChar(ctx, x, y, s, 1);
    ellipse(ctx, 0, -1, 31, 7, 'rgba(0,0,0,0.22)', null);
    // piernas + zapatillas
    rrFill(ctx, -13, -24, 12, 24, 5, '#28324d', OUTLINE, 2.5);
    rrFill(ctx, 1, -24, 12, 24, 5, '#28324d', OUTLINE, 2.5);
    rrFill(ctx, -14, -5, 14, 7, 3, '#e2e8f0', OUTLINE, 2.5);
    rrFill(ctx, 0, -5, 14, 7, 3, '#e2e8f0', OUTLINE, 2.5);
    // sudadera navy (más grande)
    rrFill(ctx, -23, -62, 46, 40, 15, HOODIE, OUTLINE, LW);
    rrFill(ctx, -23, -62, 46, 14, 11, HOODIE2, OUTLINE, 2.5);
    rrFill(ctx, -13, -40, 26, 14, 7, HOODIE2, OUTLINE, 2);
    circle(ctx, -5, -48, 2, '#e2e8f0', OUTLINE, 1.2); circle(ctx, 5, -48, 2, '#e2e8f0', OUTLINE, 1.2);
    // brazos
    rrFill(ctx, -34, -60, 11, 26, 5, HOODIE, OUTLINE, 2.5); circle(ctx, -28, -36, 5, SKIN, OUTLINE, 2);
    rrFill(ctx, 23, -60, 11, 26, 5, HOODIE, OUTLINE, 2.5); circle(ctx, 29, -36, 5, SKIN, OUTLINE, 2);
    // cabeza (más grande)
    var hy = -84;
    rrFill(ctx, -7, -66, 14, 8, 3, SKIN, OUTLINE, 2);
    circle(ctx, 0, hy, 21, SKIN, OUTLINE, LW);
    // barba corta del mismo marrón que el pelo
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-20, hy + 1);
    ctx.quadraticCurveTo(-17, hy + 22, 0, hy + 23);
    ctx.quadraticCurveTo(17, hy + 22, 20, hy + 1);
    ctx.quadraticCurveTo(12, hy + 11, 0, hy + 12);
    ctx.quadraticCurveTo(-12, hy + 11, -20, hy + 1);
    ctx.closePath();
    ctx.fillStyle = BEARD; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // pelo castaño (igual que Juanjo, algo más ancho)
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-21, hy - 2);
    ctx.quadraticCurveTo(-23, hy - 24, 0, hy - 24); ctx.quadraticCurveTo(23, hy - 24, 21, hy - 2);
    ctx.quadraticCurveTo(12, hy - 10, 4, hy - 4); ctx.quadraticCurveTo(0, hy - 11, -4, hy - 4);
    ctx.quadraticCurveTo(-11, hy - 10, -21, hy - 2); ctx.closePath();
    ctx.fillStyle = HAIR; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = LW; ctx.stroke();
    ctx.restore();
    // ojos (sin gafas)
    frontEye(ctx, -7, hy - 1, 3.6, blink); frontEye(ctx, 7, hy - 1, 3.6, blink);
    ctx.strokeStyle = HAIR; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-11, hy - 6); ctx.lineTo(-3, hy - 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, hy - 7); ctx.lineTo(11, hy - 6); ctx.stroke();
    // sonrisa
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, hy + 6, 5, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
    ctx.restore();
  };

  // Escena final: Papa y Juanjo juntos, de frente, mano en el hombro del otro.
  // (cx, feetY) = centro-pies del par; escala general o.scale.
  gfx.drawJuanjoPapaDuo = function (ctx, cx, feetY, o) {
    o = o || {};
    var s = num(o.scale, 1), t = num(o.t, 0);
    var HOODIE = '#20305a', SKIN = '#f4c9a0';
    ctx.save();
    ctx.translate(cx, feetY);
    ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var bob = Math.sin(t * 2) * 1.5;
    gfx.drawPapa(ctx, -28, 2 + bob, { t: t, scale: 1 });        // Papa (izquierda, más grande)
    gfx.drawJuanjo(ctx, 32, 4 - bob, { t: t + 1, scale: 1 });   // Juanjo (derecha, más bajito)
    // Papá pasa el brazo por detrás, con la mano en el hombro de Juanjo.
    rrFill(ctx, 2, -60 + bob, 48, 9, 4, HOODIE, OUTLINE, 2.5);
    circle(ctx, 50, -57 + bob, 5.5, SKIN, OUTLINE, 2);          // mano de Papá en el hombro de Juanjo
    // Juanjo apoya su manita en el costado de Papá (brazo corto).
    rrFill(ctx, -2, -44 - bob, 18, 8, 4, HOODIE, OUTLINE, 2.5);
    circle(ctx, -3, -41 - bob, 4.5, SKIN, OUTLINE, 2);          // mano de Juanjo en Papá
    // corazoncito entre los dos
    ctx.save();
    ctx.translate(6, -84 + Math.sin(t * 3) * 2);
    ctx.fillStyle = '#ff5a7a'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 3);
    ctx.bezierCurveTo(-5, -3, -10, 2, 0, 10);
    ctx.bezierCurveTo(10, 2, 5, -3, 0, 3);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
  };

  // ==========================================================================
  //  RETRATOS para dialogos  drawPortrait(ctx, quien, x, y, size)
  //  (x,y) = esquina superior izquierda del marco
  // ==========================================================================
  // --- Parte 3 (contrato §8.8; solo para drawPortrait). Todo comprobado y envuelto. ---
  // Color de identidad (G.p3.heroColor) con respaldo.
  function p3FrameCol(h, respaldo, tono) {
    try {
      var G3 = window.G && window.G.p3;
      if (G3 && typeof G3.heroColor === 'function') {
        var c = G3.heroColor(h, tono || 'oscuro');
        if (typeof c === 'string' && c) return c;
      }
    } catch (e) {}
    return respaldo;
  }
  function p3Look(k) {
    try {
      var lk = window.G && window.G.p3 && window.G.p3.look;
      return (lk && lk[k] === 'B') ? 'B' : 'A';
    } catch (e) { return 'A'; }
  }
  // Llama a P2.fn[nombre] con su propio save/restore; true si existe y se dibujó.
  function p3art(nombre, ctx) {
    var P2r = window.P2;
    if (!P2r || !P2r.fn || typeof P2r.fn[nombre] !== 'function') return false;
    var args = Array.prototype.slice.call(arguments, 1);
    ctx.save();
    try { P2r.fn[nombre].apply(null, args); } catch (e) { ctx.restore(); return false; }
    ctx.restore();
    return true;
  }
  function p3alto(n, d) {
    try { var A = window.P2 && window.P2.P3ALTO; return (A && A[n]) || d; } catch (e) { return d; }
  }
  // Busto de Mikey, Peter, Robovill o Dark Secuaz bueno dentro del marco (ya recortado).
  function drawPortraitP3(ctx, quien, size, cx, feetY, sc, t) {
    if (quien === 'mikey' || quien === 'peter') {
      // Mismo encuadre que el Director (≈ 68 px de alto a escala 1).
      var s = sc * 68 / p3alto(quien, 68);
      return p3art(quien, ctx, cx, feetY, { variant: p3Look(quien), scale: s, facing: 1, pose: 'idle' });
    }
    if (quien === 'robovill') {
      // De pecho arriba, con la gema copia visible en la parte baja del marco.
      var v = p3Look('robovill');
      var rs = size / 215;
      var gemaDy = (v === 'B') ? -128 : -110;
      try {
        var pts = window.P2 && window.P2.P3PUNTOS && window.P2.P3PUNTOS.robovill;
        if (pts && pts[v] && pts[v].gema) gemaDy = pts[v].gema[1];
      } catch (e) {}
      var py = size * 0.76 - gemaDy * rs;
      return p3art('robovill', ctx, cx - size * 0.04, py, {
        variant: v, scale: rs, facing: 1, brazo: 'martillo', alas: 'cerradas', taladro: 0, t: t
      });
    }
    if (quien === 'secuazBueno') {
      // Como 'secuaz' de la Parte 2, pero BUENO (verde).
      return p3art('secuaz', ctx, cx, size * 1.36 + 4, { scale: size / 150, good: true, angle: -0.35 + Math.sin(t * 1.2) * 0.12 });
    }
    return false;
  }

  gfx.drawPortrait = function (ctx, quien, x, y, size) {
    size = num(size, 80);
    quien = quien || 'narrador';
    var t = num((window.G && window.G.T), 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';

    // marco redondeado
    var frameCol = '#1e293b';
    if (quien === 'director') frameCol = DIR_SUIT;
    else if (quien === 'falcon') frameCol = FAL_DARK;
    else if (quien === 'toros') frameCol = TOR_LEATHER;
    else if (quien === 'narrador') frameCol = '#20305a'; // Juanjo narrador (navy sudadera)
    else if (quien === 'juanjo') frameCol = '#20305a';   // Parte 2: Juanjo (igual que narrador)
    else if (quien === 'papa') frameCol = '#92400e';     // Parte 2: Papá
    else if (quien === 'secuaz') frameCol = '#7f1d1d';   // Parte 2: Dark Secuaz
    // Parte 3 (contrato §8.8): marcos con el color de identidad (Mikey y Peter según su diseño).
    else if (quien === 'mikey') frameCol = p3FrameCol('mikey', '#c2410c');
    else if (quien === 'peter') frameCol = p3FrameCol('peter', '#a16207');
    else if (quien === 'robovill') frameCol = '#7f1d1d';
    else if (quien === 'secuazBueno') frameCol = '#15803d';
    rrFill(ctx, 0, 0, size, size, 12, frameCol, OUTLINE, LW);
    // fondo interior
    ctx.save();
    rr(ctx, 4, 4, size - 8, size - 8, 9); ctx.clip();
    var bg = vgrad(ctx, 0, 4, size, '#334155', '#0f172a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);

    // busto centrado (los draw usan pies; posicionamos abajo del marco)
    var cx = size / 2;
    var feetY = size + size * 0.42; // pies fuera, para ver de cintura arriba
    var sc = size / 64 * 1.35;

    if (quien === 'director') {
      gfx.drawDirector(ctx, cx, feetY, { t: t, facing: 1, pose: 'idle', scale: sc });
    } else if (quien === 'falcon') {
      gfx.drawFalcon(ctx, cx, feetY, { t: t, facing: 1, pose: 'idle', scale: sc });
    } else if (quien === 'toros') {
      // Toros es enorme: escalar menos y bajar
      gfx.drawToros(ctx, cx, size + size * 0.65, { t: t, facing: -1, pose: 'idle', scale: size / 150 * 1.15, shield: false });
    } else if (quien === 'papa') {
      // Parte 2: Papá (busto). Su cabeza está en y local -84.
      gfx.drawPapa(ctx, cx, size * 1.81, { t: t, scale: size / 64 });
      gfx.drawSparkle(ctx, cx - size * 0.32, size * 0.22, (t * 0.7 + 0.25) % 1);
    } else if (quien === 'secuaz') {
      // Parte 2: Dark Secuaz, de pecho arriba (cabeza-torreta grande).
      var secOk = false;
      try {
        var P2r = window.P2;
        if (P2r && P2r.fn && typeof P2r.fn.secuaz === 'function') {
          ctx.save();
          try {
            P2r.fn.secuaz(ctx, cx, size * 1.36 + 4, { scale: size / 150, angle: -0.35 + Math.sin(t * 1.2) * 0.12 });
            secOk = true;
          } finally { ctx.restore(); }
        }
      } catch (e) { secOk = false; }
      if (!secOk) {
        circle(ctx, cx, size * 0.55, size * 0.34, '#b91c1c', OUTLINE, LW);
        circle(ctx, cx, size * 0.55, size * 0.12, '#ff4d4d', OUTLINE, 2);
        circle(ctx, cx + size * 0.03, size * 0.52, size * 0.04, '#ffffff', null);
      }
    } else if (quien === 'mikey' || quien === 'peter' || quien === 'robovill' || quien === 'secuazBueno') {
      // Parte 3 (contrato §8.8): siempre comprobado, envuelto y con respaldo.
      var p3ok = false;
      try { p3ok = drawPortraitP3(ctx, quien, size, cx, feetY, sc, t); } catch (e) { p3ok = false; }
      if (!p3ok) {
        var fbCol = quien === 'mikey' ? p3FrameCol('mikey', '#f97316', 'base')
          : quien === 'peter' ? p3FrameCol('peter', '#facc15', 'base')
          : quien === 'robovill' ? '#6b7280' : '#22c55e';
        circle(ctx, cx, size * 0.58, size * 0.32, fbCol, OUTLINE, LW);
        circle(ctx, cx - size * 0.11, size * 0.52, size * 0.07, '#ffffff', OUTLINE, 2);
        circle(ctx, cx + size * 0.11, size * 0.52, size * 0.07, '#ffffff', OUTLINE, 2);
        circle(ctx, cx - size * 0.10, size * 0.53, size * 0.03, OUTLINE, null);
        circle(ctx, cx + size * 0.12, size * 0.53, size * 0.03, OUTLINE, null);
      }
    } else {
      // narrador: es Juanjo (el diseñador jefe) quien cuenta la historia.
      // Su cabeza está en y local -70; posicionamos para ver bien la carita.
      gfx.drawJuanjo(ctx, cx, size * 1.8, { t: t, scale: size / 64 * 1.25 });
      gfx.drawSparkle(ctx, cx - size * 0.30, size * 0.20, (t * 0.7) % 1);
      gfx.drawSparkle(ctx, cx + size * 0.30, size * 0.66, (t * 0.7 + 0.5) % 1);
    }
    ctx.restore();

    // brillo del marco
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
    rr(ctx, 3, 3, size - 6, size - 6, 10); ctx.stroke();

    ctx.restore();
  };

  // ==========================================================================
  //  FONDOS  (pintan TODO 960x540 con parallax)
  // ==========================================================================
  var W = (window.G && window.G.W) || 960;
  var H = (window.G && window.G.H) || 540;

  // Cielo helper
  function skyGradient(ctx, c0, c1) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // -- CANYON: atardecer dorado + montanias + ruinas verdes --
  gfx.drawBgCanyon = function (ctx, camX, t) {
    camX = num(camX, 0); t = num(t, 0);
    ctx.save();
    // cielo atardecer
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#7c3aed');
    g.addColorStop(0.35, '#f97316');
    g.addColorStop(0.65, '#fbbf24');
    g.addColorStop(1, '#fde68a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // sol grande
    var sunX = W * 0.72 - camX * 0.02;
    ctx.save();
    ctx.globalAlpha = 0.9;
    var sg = ctx.createRadialGradient(sunX, H * 0.42, 10, sunX, H * 0.42, 90);
    sg.addColorStop(0, '#fff7cc'); sg.addColorStop(0.5, '#fde047'); sg.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, H * 0.42, 90, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // nubes suaves
    ctx.fillStyle = 'rgba(255,240,220,0.5)';
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 260 - camX * 0.05) % (W + 200)) - 100;
      var cy = 60 + c * 25;
      ellipse(ctx, cx, cy, 40, 14, 'rgba(255,240,220,0.45)', null);
      ellipse(ctx, cx + 30, cy + 4, 30, 11, 'rgba(255,240,220,0.45)', null);
    }

    // montanias lejanas (capa 1)
    function mountains(off, ampl, baseY, col, step) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-50, H);
      var x = -50;
      var i = 0;
      while (x < W + 50) {
        var mx = x;
        var my = baseY + Math.sin((x + off) * 0.008) * ampl + Math.sin((x + off) * 0.02) * (ampl * 0.3);
        ctx.lineTo(mx, my);
        x += step; i++;
      }
      ctx.lineTo(W + 50, H); ctx.closePath(); ctx.fill();
    }
    mountains(-camX * 0.1, 40, H * 0.55, '#b45309', 24);
    mountains(-camX * 0.2 + 300, 55, H * 0.62, '#92400e', 24);

    // mesetas de roca cercanas (capa 2)
    ctx.fillStyle = '#78350f';
    for (var m = 0; m < 6; m++) {
      var bx = ((m * 220 - camX * 0.4) % (W + 400)) - 200;
      var bw = 120, bh = 90 + (m % 3) * 30;
      rrFill(ctx, bx, H - bh - 40, bw, bh, 10, '#a16207', '#5c2e0a', 4);
      // ruinas verdes encima (columnas)
      ctx.save();
      ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 3;
      for (var col2 = 0; col2 < 2; col2++) {
        var rx = bx + 25 + col2 * 55;
        rrFill(ctx, rx, H - bh - 76, 14, 40, 3, '#4d7c0f', '#365314', 3);
        rrFill(ctx, rx - 4, H - bh - 80, 22, 8, 2, '#65a30d', '#365314', 3);
      }
      ctx.restore();
    }

    // niebla dorada al fondo
    ctx.fillStyle = 'rgba(253,224,71,0.15)';
    ctx.fillRect(0, H * 0.55, W, H * 0.2);
    ctx.restore();
  };

  // -- BASE: interior tech azul holografico --
  gfx.drawBgBase = function (ctx, camX, t) {
    camX = num(camX, 0); t = num(t, 0);
    ctx.save();
    skyGradient(ctx, '#0b1220', '#0f2547');

    // rejilla de perspectiva de fondo
    ctx.strokeStyle = 'rgba(34,211,238,0.12)'; ctx.lineWidth = 1;
    var gx0 = -((camX * 0.2) % 60);
    for (var vx = gx0; vx < W; vx += 60) {
      ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(vx, H); ctx.stroke();
    }
    for (var hy = 0; hy < H; hy += 60) {
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
    }

    // paneles holograficos flotantes (parallax medio)
    for (var p = 0; p < 5; p++) {
      var px = ((p * 240 - camX * 0.3) % (W + 300)) - 150;
      var py = 60 + (p % 3) * 90;
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(t * 2 + p) * 0.1;
      rrFill(ctx, px, py, 120, 70, 8, 'rgba(34,211,238,0.12)', '#22d3ee', 2);
      // graficas dentro
      ctx.strokeStyle = 'rgba(125,211,252,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var q = 0; q <= 6; q++) {
        var qx = px + 10 + q * 17;
        var qy = py + 45 + Math.sin(q + t * 3 + p) * 12;
        if (q === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
      }
      ctx.stroke();
      // barritas de datos
      for (var b = 0; b < 4; b++) {
        var bh2 = 6 + ((b + p) % 4) * 6;
        rrFill(ctx, px + 8 + b * 14, py + 20, 8, bh2, 2, 'rgba(56,189,248,0.6)', null);
      }
      ctx.restore();
    }

    // estructura cercana (vigas azules, parallax fuerte)
    ctx.fillStyle = '#1e293b';
    for (var v = 0; v < 5; v++) {
      var vX = ((v * 300 - camX * 0.6) % (W + 400)) - 200;
      rrFill(ctx, vX, 0, 30, H, 0, '#172033', '#0b1220', 3);
      rrFill(ctx, vX + 4, 40, 22, H - 80, 4, '#1e293b', null);
      // luces cian en la viga
      for (var l = 0; l < 6; l++) {
        circle(ctx, vX + 15, 60 + l * 70, 3, Math.sin(t * 3 + l + v) > 0 ? '#22d3ee' : '#0e7490', null);
      }
    }

    // suelo tech con brillo
    ctx.fillStyle = 'rgba(34,211,238,0.08)';
    ctx.fillRect(0, H - 40, W, 40);
    ctx.restore();
  };

  // -- SPACE: estrellas parallax + nebulosa morada  drawBgSpace(ctx,scroll,t) --
  gfx.drawBgSpace = function (ctx, scroll, t) {
    scroll = num(scroll, 0); t = num(t, 0);
    ctx.save();
    // espacio profundo
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0620'); g.addColorStop(0.5, '#170a33'); g.addColorStop(1, '#0a0620');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // nebulosa morada (varias manchas)
    ctx.save();
    var neb = ['rgba(126,34,206,0.25)', 'rgba(219,39,119,0.18)', 'rgba(37,99,235,0.18)'];
    for (var n = 0; n < 3; n++) {
      var nx = ((n * 380 - scroll * 0.08) % (W + 500)) - 200;
      var ny = 120 + n * 120;
      var rg = ctx.createRadialGradient(nx, ny, 20, nx, ny, 180);
      rg.addColorStop(0, neb[n]); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(nx, ny, 180, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 3 capas de estrellas parallax
    function stars(count, speed, size, seed, tw) {
      var rnd = seeded(seed);
      for (var i = 0; i < count; i++) {
        var baseX = rnd() * (W + 200);
        var y = rnd() * H;
        var sx = ((baseX - scroll * speed) % (W + 200));
        if (sx < 0) sx += (W + 200);
        sx -= 100;
        var a = tw ? (0.4 + Math.abs(Math.sin(t * 2 + i)) * 0.6) : 0.9;
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, y, size, size);
      }
      ctx.globalAlpha = 1;
    }
    stars(60, 0.15, 1, 11, false);
    stars(35, 0.35, 1.5, 23, true);
    stars(18, 0.6, 2.5, 37, true);

    // planeta lejano
    var plX = W * 0.82 - scroll * 0.04 % W;
    ctx.save();
    ctx.globalAlpha = 0.9;
    circle(ctx, plX, H * 0.28, 46, '#4338ca', null);
    ctx.save();
    ctx.beginPath(); ctx.arc(plX, H * 0.28, 46, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(plX, H * 0.28 - 46, 60, 92);
    ctx.fillStyle = 'rgba(129,140,248,0.5)';
    ellipse(ctx, plX - 12, H * 0.28 - 10, 20, 8, 'rgba(129,140,248,0.5)', null);
    ctx.restore();
    // anillo
    ctx.strokeStyle = 'rgba(196,181,253,0.6)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(plX, H * 0.28, 62, 16, -0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  // -- MOTHERSHIP: pasillos oscuros rojo/naranja --
  gfx.drawBgMothership = function (ctx, camX, t) {
    camX = num(camX, 0); t = num(t, 0);
    ctx.save();
    skyGradient(ctx, '#1a0505', '#2b0a0a');

    // pasillo en perspectiva (lineas de fuga)
    var vpX = W / 2, vpY = H * 0.5;
    ctx.strokeStyle = 'rgba(120,20,20,0.6)'; ctx.lineWidth = 2;
    for (var r = 0; r < 12; r++) {
      var d = r / 12;
      var rx = W * (0.5 - 0.5 * (1 - d));
      // rectangulos concentricos del tunel
      var rw = W * (1 - d), rh = H * (1 - d);
      rrFill(ctx, vpX - rw / 2, vpY - rh / 2, rw, rh, 8, null, 'rgba(150,30,20,' + (0.15 + d * 0.3) + ')', 2);
    }

    // paneles laterales oscuros (parallax fuerte)
    ctx.fillStyle = '#3b0a0a';
    for (var p = 0; p < 6; p++) {
      var px = ((p * 200 - camX * 0.5) % (W + 300)) - 150;
      rrFill(ctx, px, 0, 60, H, 0, '#2a0808', '#150404', 3);
      // tuberias naranjas
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(px + 20, 0); ctx.lineTo(px + 20, H); ctx.stroke();
      ctx.strokeStyle = 'rgba(251,146,60,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px + 20, 0); ctx.lineTo(px + 20, H); ctx.stroke();
      // luces de alarma
      for (var l = 0; l < 5; l++) {
        var on = (Math.sin(t * 4 + l + p) > 0.3);
        circle(ctx, px + 42, 50 + l * 100, 4, on ? '#ef4444' : '#450a0a', '#7f1d1d', 1.5);
        if (on) {
          ctx.save(); ctx.globalAlpha = 0.3;
          circle(ctx, px + 42, 50 + l * 100, 12, '#ef4444', null);
          ctx.restore();
        }
      }
    }

    // vapor / bruma roja al fondo
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (var f = 0; f < 4; f++) {
      var fx = ((f * 280 - camX * 0.15) % (W + 300)) - 150;
      var fy = H * 0.4 + Math.sin(t + f) * 20;
      var rg = ctx.createRadialGradient(fx, fy, 10, fx, fy, 120);
      rg.addColorStop(0, 'rgba(234,88,12,0.5)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(fx, fy, 120, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // estandartes del ejercito de Toros
    for (var s = 0; s < 3; s++) {
      var sx = ((s * 340 - camX * 0.35) % (W + 400)) - 150;
      rrFill(ctx, sx, -4, 40, 90, 3, '#450a0a', '#7f1d1d', 2.5);
      // simbolo de cuernos
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + 10, 40); ctx.quadraticCurveTo(sx + 6, 24, sx + 14, 20);
      ctx.moveTo(sx + 30, 40); ctx.quadraticCurveTo(sx + 34, 24, sx + 26, 20);
      ctx.stroke();
      // pico inferior del estandarte
      ctx.beginPath();
      ctx.moveTo(sx, 86); ctx.lineTo(sx + 20, 98); ctx.lineTo(sx + 40, 86);
      ctx.fillStyle = '#450a0a'; ctx.fill();
      ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
  };

  // -- THRONE: sala del trono con columnas y cielo carmesi  drawBgThrone(ctx,t) --
  gfx.drawBgThrone = function (ctx, t) {
    t = num(t, 0);
    ctx.save();
    // cielo carmesi a traves de ventanales
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#450a0a');
    g.addColorStop(0.5, '#7f1d1d');
    g.addColorStop(1, '#1a0505');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // luna/eclipse rojo al fondo
    ctx.save();
    var mg = ctx.createRadialGradient(W / 2, H * 0.3, 20, W / 2, H * 0.3, 110);
    mg.addColorStop(0, 'rgba(239,68,68,0.5)'); mg.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(W / 2, H * 0.3, 110, 0, Math.PI * 2); ctx.fill();
    circle(ctx, W / 2, H * 0.3, 55, '#991b1b', '#7f1d1d', 3);
    ctx.restore();

    // ventanales goticos detras
    ctx.save();
    for (var v = 0; v < 5; v++) {
      var vx = 90 + v * 190;
      ctx.beginPath();
      ctx.moveTo(vx, H * 0.75);
      ctx.lineTo(vx, H * 0.2);
      ctx.quadraticCurveTo(vx + 25, H * 0.06, vx + 50, H * 0.2);
      ctx.lineTo(vx + 50, H * 0.75);
      ctx.closePath();
      ctx.fillStyle = 'rgba(127,29,29,0.4)'; ctx.fill();
      ctx.strokeStyle = '#2a0808'; ctx.lineWidth = 3; ctx.stroke();
      // vidriera
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(vx + 25, H * 0.2); ctx.lineTo(vx + 25, H * 0.75); ctx.stroke();
    }
    ctx.restore();

    // columnas grandes (parallax cercano)
    for (var c = 0; c < 4; c++) {
      var cx = 120 + c * 240;
      rrFill(ctx, cx - 26, 0, 52, H, 6, '#2a0808', '#150404', 4);
      rrFill(ctx, cx - 20, 20, 40, H - 40, 4, '#3b0a0a', null);
      // estrias
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
      for (var s2 = -1; s2 <= 1; s2++) {
        ctx.beginPath(); ctx.moveTo(cx + s2 * 10, 20); ctx.lineTo(cx + s2 * 10, H - 20); ctx.stroke();
      }
      // capitel
      rrFill(ctx, cx - 30, 0, 60, 22, 4, '#450a0a', '#150404', 3);
      // antorcha
      var flick = 1 + Math.sin(t * 12 + c) * 0.2;
      ctx.save();
      ctx.globalAlpha = 0.9;
      circle(ctx, cx, H * 0.35, 10 * flick, '#f97316', null);
      circle(ctx, cx, H * 0.35 - 4, 6 * flick, '#fde047', null);
      ctx.globalAlpha = 0.25;
      circle(ctx, cx, H * 0.35, 26 * flick, '#f97316', null);
      ctx.restore();
    }

    // alfombra hacia el trono
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W / 2 - 20, H);
    ctx.lineTo(W / 2 - 70, H);
    ctx.lineTo(W / 2 - 45, H * 0.55);
    ctx.lineTo(W / 2 + 45, H * 0.55);
    ctx.lineTo(W / 2 + 70, H);
    ctx.lineTo(W / 2 + 20, H);
    ctx.closePath();
    ctx.fillStyle = '#7f1d1d'; ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  // ==========================================================================
  //  TILES  drawTile(ctx,x,y,size,tipo,tema)   (x,y)=esquina sup-izq
  //  tipo: solid, platform, spike, door, console, exit, box, checkpoint
  //  tema: canyon, base, ship
  // ==========================================================================
  gfx.drawTile = function (ctx, x, y, size, tipo, tema) {
    size = num(size, 48);
    tipo = tipo || 'solid';
    tema = tema || 'canyon';
    var t = num((window.G && window.G.T), 0);

    // paletas por tema
    var pal;
    if (tema === 'base') pal = { top: '#334155', body: '#1e293b', line: '#0b1220', edge: '#22d3ee' };
    else if (tema === 'ship') pal = { top: '#7f1d1d', body: '#3b0a0a', line: '#150404', edge: '#ea580c' };
    else pal = { top: '#a16207', body: '#78350f', line: '#5c2e0a', edge: '#4d7c0f' }; // canyon

    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';

    if (tipo === 'solid') {
      rrFill(ctx, 0, 0, size, size, 4, pal.body, pal.line, LW);
      // cara superior mas clara
      rrFill(ctx, 2, 2, size - 4, size * 0.35, 3, pal.top, null);
      // detalle segun tema
      if (tema === 'canyon') {
        // hierba/musgo verde en el borde superior
        ctx.fillStyle = pal.edge;
        ctx.beginPath();
        ctx.moveTo(0, 6);
        for (var gx = 0; gx <= size; gx += 8) {
          ctx.lineTo(gx, 2 + (gx % 16 === 0 ? -3 : 3));
        }
        ctx.lineTo(size, 6); ctx.lineTo(size, 0); ctx.lineTo(0, 0);
        ctx.closePath(); ctx.fill();
      } else if (tema === 'base') {
        // remaches y linea de luz
        for (var rvx = 0; rvx < 2; rvx++)
          for (var rvy = 0; rvy < 2; rvy++)
            circle(ctx, 8 + rvx * (size - 16), 8 + rvy * (size - 16), 2, '#0b1220', pal.edge, 1);
        ctx.strokeStyle = 'rgba(34,211,238,0.4)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(4, size - 5); ctx.lineTo(size - 4, size - 5); ctx.stroke();
      } else {
        // ship: rejilla metalica
        ctx.strokeStyle = pal.line; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
        ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
        ctx.stroke();
        // tornillos
        circle(ctx, 8, 8, 2, '#150404', pal.edge, 1);
        circle(ctx, size - 8, size - 8, 2, '#150404', pal.edge, 1);
      }
    } else if (tipo === 'platform') {
      // plataforma delgada (una via)
      rrFill(ctx, 0, 0, size, size * 0.4, 5, pal.body, pal.line, LW);
      rrFill(ctx, 2, 2, size - 4, size * 0.18, 3, pal.top, null);
      if (tema === 'canyon') {
        ctx.fillStyle = pal.edge;
        ctx.fillRect(0, 0, size, 3);
      }
    } else if (tipo === 'spike') {
      // pinchos
      var n = 4, sw = size / n;
      ctx.fillStyle = tema === 'ship' ? '#9ca3af' : (tema === 'base' ? '#94a3b8' : '#d6d3d1');
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(i * sw, size);
        ctx.lineTo(i * sw + sw / 2, size * 0.25);
        ctx.lineTo((i + 1) * sw, size);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      // base
      rrFill(ctx, 0, size - 8, size, 8, 2, pal.body, pal.line, 2);
    } else if (tipo === 'door') {
      // puerta cerrada
      rrFill(ctx, 3, 0, size - 6, size, 4, pal.body, pal.line, LW);
      rrFill(ctx, 6, 4, size - 12, size - 8, 3, '#1f2937', pal.line, 2);
      // barras horizontales de energia
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 3;
      for (var d = 0; d < 4; d++) {
        var dy = 10 + d * (size - 20) / 3;
        ctx.globalAlpha = 0.5 + Math.sin(t * 4 + d) * 0.3;
        ctx.beginPath(); ctx.moveTo(8, dy); ctx.lineTo(size - 8, dy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // candado
      circle(ctx, size / 2, size / 2, 5, '#fbbf24', OUTLINE, 2);
    } else if (tipo === 'console') {
      // consola hackeable
      rrFill(ctx, 4, size * 0.25, size - 8, size * 0.75, 4, pal.body, pal.line, LW);
      // pantalla
      rrFill(ctx, 8, size * 0.32, size - 16, size * 0.3, 3, '#082f49', '#22d3ee', 2);
      // codigo parpadeante
      ctx.fillStyle = '#22d3ee';
      for (var cy = 0; cy < 3; cy++) {
        var cw = (size - 22) * (0.4 + ((Math.floor(t * 3) + cy) % 3) * 0.25);
        ctx.globalAlpha = 0.6 + Math.sin(t * 5 + cy) * 0.3;
        ctx.fillRect(11, size * 0.35 + cy * 5, cw, 2.5);
      }
      ctx.globalAlpha = 1;
      // teclado
      rrFill(ctx, 8, size * 0.68, size - 16, size * 0.2, 2, '#334155', pal.line, 2);
      // luz de estado
      circle(ctx, size - 12, size * 0.75, 3, Math.sin(t * 6) > 0 ? '#22d3ee' : '#0e7490', null);
    } else if (tipo === 'exit') {
      // portal brillante de salida
      ctx.save();
      var pulse = 1 + Math.sin(t * 4) * 0.08;
      // halo
      ctx.globalAlpha = 0.4;
      var rg = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2 * pulse);
      rg.addColorStop(0, '#a5f3fc'); rg.addColorStop(0.6, '#22d3ee'); rg.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = rg; ctx.fillRect(-6, -6, size + 12, size + 12);
      ctx.globalAlpha = 1;
      // marco del portal
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(size / 2, size / 2, size * 0.3 * pulse, size * 0.42 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
      // interior brillante
      ctx.beginPath(); ctx.ellipse(size / 2, size / 2, size * 0.24, size * 0.36, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(224,247,255,0.85)'; ctx.fill();
      // remolino
      ctx.strokeStyle = 'rgba(34,211,238,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (var sa = 0; sa < Math.PI * 3; sa += 0.2) {
        var srr = sa * 2;
        var sx = size / 2 + Math.cos(sa + t * 3) * srr * 0.5;
        var sy = size / 2 + Math.sin(sa + t * 3) * srr * 0.7;
        if (sa === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      // estrellitas
      gfx.drawSparkle(ctx, size * 0.3, size * 0.3, (t * 0.8) % 1);
      gfx.drawSparkle(ctx, size * 0.7, size * 0.6, (t * 0.8 + 0.5) % 1);
      ctx.restore();
    } else if (tipo === 'box') {
      gfx.drawBox(ctx, size / 2, size / 2, size);
    } else if (tipo === 'checkpoint') {
      // bandera de checkpoint
      // poste
      rrFill(ctx, size / 2 - 3, 4, 6, size - 4, 2, '#94a3b8', OUTLINE, 2.5);
      // bandera ondeante
      ctx.save();
      ctx.translate(size / 2 + 3, 8);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      var wave = Math.sin(t * 6) * 3;
      ctx.lineTo(size * 0.5, wave);
      ctx.lineTo(size * 0.42, size * 0.18);
      ctx.lineTo(0, size * 0.22);
      ctx.closePath();
      ctx.fillStyle = '#22c55e'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
      // estrella en la bandera
      ctx.fillStyle = '#fef9c3';
      circle(ctx, size * 0.2, size * 0.1, 3, '#fef9c3', null);
      ctx.restore();
      // base
      rrFill(ctx, size / 2 - 8, size - 6, 16, 6, 2, '#64748b', OUTLINE, 2);
    } else {
      // fallback: solido
      rrFill(ctx, 0, 0, size, size, 4, pal.body, pal.line, LW);
    }

    ctx.restore();
  };

  // ==========================================================================
  window.G.gfx = gfx;
})();
