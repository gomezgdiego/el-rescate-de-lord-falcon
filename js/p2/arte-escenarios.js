// arte-escenarios.js — Parte 2 "La Gema Robada": fondos, tiles, armas, medallas y props.
// Mismo estilo que el arte aprobado (arte-base.js): contornos #1a1a2e, formas
// rechonchas tipo Kirby/LEGO. Los FONDOS usan colores algo más apagados que los
// personajes (para que ellos destaquen) y pintan siempre los 960x540 completos.
//
// Exporta (contrato §10), todo en P2.fn:
//   bgCiudad(c, camX, t)          bgFabrica(c, camX, t)        bgCarretera(c, scroll, t)
//   carretera(c, scroll, sueloY, t)  bgCielo(c, scroll, t)      bgFortaleza(c, t)
//   tile(c, x, y, size, tipo, tema [, estado])   (x, y) = esquina superior izquierda
//   prensa(c, x, techoY, bajada01, size)          (x = borde IZQUIERDO de la columna)
//   medalla(c, x, y, {t, scale, apagada})         medallaGrande(c, x, y, {scale, nueva, apagada})
//   iconoArma(c, x, y, {arma, size, ocupada})     armaEnMano(c, manoX, manoY, {arma, facing, t01, scale})
//   bumeran(c, x, y, {t, scale})   red(c, x, y, {scale, abierta})   jetpack(c, x, piesY, {facing, scale, llama})
//   dronEspia(c, x, y, {scale, t, escaneando, angle})   gemaPoder(c, x, y, {scale, t, rota})
// Ninguna función lanza excepciones: todo va envuelto en safe().
window.G = window.G || {};
window.P2 = window.P2 || {};
(function () {
  'use strict';
  var P2 = window.P2;
  P2.fn = P2.fn || {};
  var O = P2.OUTLINE || '#1a1a2e';
  var W = 960, H = 540, PI = Math.PI, TAU = PI * 2;
  var SOFT = 'rgba(26,26,46,0.55)';   // contorno suavizado para capas lejanas

  // ---------------------------------------------------------------------------
  //  Utilidades
  // ---------------------------------------------------------------------------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function now() { return num(window.G && window.G.T, 0); }
  function hash(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function mod(a, m) { return ((a % m) + m) % m; }
  function safe(c, fn) {
    if (!c || !c.save) return;
    c.save();
    try { c.lineJoin = 'round'; c.lineCap = 'round'; fn(); }
    catch (e) { if (window.console && console.warn) console.warn('arte-escenarios:', e); }
    c.restore();
  }
  function vgrad(c, y0, y1, stops) {
    var g = c.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  // Recorre "huecos" de una capa de parallax infinita: fn(índice, xPantalla)
  function slots(offset, spacing, fn) {
    var i0 = Math.floor(offset / spacing) - 1, n = Math.ceil(W / spacing) + 2;
    for (var i = i0; i <= i0 + n; i++) fn(i, i * spacing - offset);
  }
  // Nube esponjosa: unión de círculos con contorno exterior. k = [[x, y, r], ...]
  function puff(c, k, fill, stroke, lw) {
    var i;
    if (stroke) {
      c.fillStyle = stroke;
      for (i = 0; i < k.length; i++) { c.beginPath(); c.arc(k[i][0], k[i][1], k[i][2] + (lw || 3), 0, TAU); c.fill(); }
    }
    c.fillStyle = fill;
    for (i = 0; i < k.length; i++) { c.beginPath(); c.arc(k[i][0], k[i][1], k[i][2], 0, TAU); c.fill(); }
  }
  function cloudK(x, y, s) {
    return [[x - 34 * s, y + 4 * s, 16 * s], [x - 14 * s, y - 10 * s, 22 * s], [x + 12 * s, y - 14 * s, 25 * s],
            [x + 36 * s, y - 2 * s, 18 * s], [x + 50 * s, y + 8 * s, 12 * s], [x, y + 8 * s, 22 * s], [x + 26 * s, y + 10 * s, 16 * s]];
  }
  function starPts(cx, cy, R, r, n, rot) {
    var pts = [], a0 = (rot || 0) - PI / 2;
    for (var i = 0; i < n * 2; i++) {
      var a = a0 + i * PI / n, rr = (i % 2) ? r : R;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
  }
  function sparkle(c, x, y, r, col, a) {
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, a));
    c.fillStyle = col || '#fff7c2';
    c.beginPath();
    c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
    c.fill(); c.restore();
  }
  // Rayas de peligro (amarillo/oscuro) dentro de un rectángulo
  function hazard(c, x, y, w, h, off) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = '#f2c230'; c.fillRect(x, y, w, h);
    c.fillStyle = '#2a2a3e';
    var st = h * 1.4;
    for (var sx = x - h * 2 + mod(off || 0, st * 2); sx < x + w + h; sx += st * 2) {
      c.beginPath(); c.moveTo(sx, y + h); c.lineTo(sx + h, y); c.lineTo(sx + h + st, y); c.lineTo(sx + st, y + h); c.closePath(); c.fill();
    }
    c.restore();
  }
  function bannerHorns(c, x, y, w, h, t, red, trim, phase) {
    // estandarte colgante con cola de golondrina y la marca de los cuernos
    var sw = Math.sin(t * 2.2 + (phase || 0)) * w * 0.08;
    P2.rf(c, x - w * 0.62, y - 6, w * 1.24, 9, 4, '#8a6a3a', O, 2.5);
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x + w / 2, y);
    c.quadraticCurveTo(x + w / 2 + sw, y + h * 0.5, x + w / 2 + sw * 1.6, y + h);
    c.lineTo(x + sw * 1.6, y + h * 0.8);
    c.lineTo(x - w / 2 + sw * 1.6, y + h);
    c.quadraticCurveTo(x - w / 2 + sw, y + h * 0.5, x - w / 2, y);
    c.closePath();
    c.fillStyle = red; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    c.strokeStyle = trim; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - w / 2 + 5, y + 4); c.lineTo(x - w / 2 + 5 + sw, y + h * 0.75);
    c.moveTo(x + w / 2 - 5, y + 4); c.lineTo(x + w / 2 - 5 + sw, y + h * 0.75); c.stroke();
    P2.horns(c, x + sw * 0.7, y + h * 0.42, w / 60, trim);
  }

  // ===========================================================================
  //  FONDO 1 — CIUDAD ATACADA  bgCiudad(c, camX, t)
  // ===========================================================================
  var CITY_COLS = ['#d99a8b', '#8fbfb4', '#e3c58a', '#9fb0dc', '#c4a3cc', '#a6c99a'];
  function cityBuilding(c, x, baseY, w, h, col, seed) {
    // edificio rechoncho tipo LEGO: tejado con "botones", ventanas redondeadas
    P2.rf(c, x, baseY - h, w, h + 20, 12, col, SOFT, 2.5);
    c.save(); c.globalAlpha = 0.18; P2.rf(c, x + w - 14, baseY - h + 6, 10, h, 5, '#1a1a2e', null); c.restore();
    var nStuds = Math.max(2, Math.floor(w / 26));
    for (var s = 0; s < nStuds; s++) {
      var sx = x + 10 + s * (w - 20) / nStuds + ((w - 20) / nStuds - 14) / 2;
      P2.rf(c, sx, baseY - h - 6, 14, 9, 3, col, SOFT, 2);
    }
    var cols = Math.max(2, Math.floor((w - 16) / 26)), rows = Math.max(2, Math.floor((h - 40) / 34));
    var cw = (w - 16) / cols;
    for (var r = 0; r < rows; r++) {
      for (var q = 0; q < cols; q++) {
        var lit = hash(seed * 31 + r * 7 + q) > 0.55;
        P2.rf(c, x + 8 + q * cw + cw * 0.18, baseY - h + 18 + r * 34, cw * 0.64, 20, 5,
          lit ? '#fbf1cf' : 'rgba(60,72,110,0.45)', SOFT, 1.5);
      }
    }
    if (hash(seed + 5) > 0.5) {   // toldo de tienda
      var ay = baseY - 34, aw = w - 12;
      for (var a = 0; a < 5; a++) {
        c.fillStyle = (a % 2) ? '#f4ecdc' : '#d98376';
        c.fillRect(x + 6 + a * aw / 5, ay, aw / 5 + 0.5, 12);
      }
      c.strokeStyle = SOFT; c.lineWidth = 2; c.strokeRect(x + 6, ay, aw, 12);
    }
  }
  function droneSil(c, x, y, s, t, i) {
    var bob = Math.sin(t * 3 + i) * 2 * s;
    c.save(); c.translate(x, y + bob); c.scale(s, s);
    c.fillStyle = 'rgba(92,104,140,0.75)';
    c.beginPath(); c.ellipse(0, 0, 9, 6, 0, 0, TAU); c.fill();
    c.globalAlpha = 0.5;
    c.beginPath(); c.ellipse(-5, -7, 3, 5, -0.5, 0, TAU); c.ellipse(4, -7, 3, 5, 0.4, 0, TAU); c.fill();
    c.globalAlpha = 1;
    c.fillStyle = '#f19a9a'; c.beginPath(); c.arc(4, 0, 2, 0, TAU); c.fill();
    c.restore();
  }
  function smoke(c, x, y, t, seed) {
    for (var k = 0; k < 5; k++) {
      var ph = mod(t * 0.12 + k / 5 + seed * 0.37, 1);
      var r = 8 + ph * 26;
      c.globalAlpha = 0.42 * (1 - ph);
      c.fillStyle = '#ece8f2';
      c.beginPath();
      c.arc(x + Math.sin(ph * 4 + seed) * 10 + ph * 30, y - ph * 130, r, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  P2.fn.bgCiudad = function (c, camX, t) {
    camX = num(camX, 0); t = num(t, 0);
    safe(c, function () {
      // cielo de mañana con bruma cálida
      c.fillStyle = vgrad(c, 0, H, [[0, '#86bde6'], [0.55, '#cfe0ee'], [1, '#f6dcc0']]);
      c.fillRect(0, 0, W, H);
      // sol suave
      var sx = 760 - camX * 0.01;
      c.save(); c.globalAlpha = 0.55;
      P2.circ(c, sx, 96, 70, 'rgba(255,240,200,0.6)', null);
      P2.circ(c, sx, 96, 42, '#fff4cf', null);
      c.restore();
      // nubes lejanas
      slots(camX * 0.04 - t * 6, 380, function (i, x) {
        var y = 60 + hash(i * 3) * 70, s = 0.7 + hash(i * 5) * 0.5;
        puff(c, cloudK(x + 60, y, s), 'rgba(255,255,255,0.75)', null);
      });
      // drones lejanos en formación (siluetas pequeñas)
      slots(camX * 0.07 + t * 14, 400, function (i, x) {
        if (hash(i * 11) < 0.2) return;
        var y = 120 + hash(i * 13) * 80, n = 3 + Math.floor(hash(i * 17) * 3);
        for (var d = 0; d < n; d++) {
          var row = Math.ceil(d / 2), side = (d % 2) ? -1 : 1;
          droneSil(c, x + 90 + row * 16, y + side * row * 12 * (d ? 1 : 0), 0.85, t, d + i);
        }
      });
      slots(camX * 0.1 - t * 10, 330, function (i, x) {
        if (hash(i * 19) < 0.3) return;
        var y = 60 + hash(i * 23) * 60;
        for (var d = 0; d < 3; d++) droneSil(c, x + 40 + d * 22, y + Math.abs(d - 1) * 10, 1.05, t, d * 2 + i);
      });
      // CAPA 1: rascacielos lejanos (sin contorno, color de bruma)
      var base1 = 420;
      slots(camX * 0.12, 74, function (i, x) {
        var w = 52 + hash(i) * 30, h = 110 + hash(i * 2.3) * 170;
        c.fillStyle = '#aab7d6';
        P2.rr(c, x, base1 - h, w, h + 200, 10); c.fill();
        c.fillStyle = '#c3cee8';
        for (var wy = base1 - h + 14; wy < base1 - 10; wy += 22) {
          for (var wx = x + 8; wx < x + w - 12; wx += 14) c.fillRect(wx, wy, 7, 10);
        }
        if (hash(i * 7) > 0.7) { c.fillStyle = '#9aa7c8'; c.fillRect(x + w / 2 - 2, base1 - h - 24, 4, 26); P2.circ(c, x + w / 2, base1 - h - 26, 4, '#e7a0a0', null); }
      });
      // humo suave (de los tejados lejanos)
      slots(camX * 0.12, 74, function (i, x) {
        if (hash(i * 9.1) < 0.82) return;
        var h = 110 + hash(i * 2.3) * 170;
        smoke(c, x + 30, 420 - h, t, i);
      });
      // CAPA 2: edificios LEGO de colores
      var base2 = 500;
      slots(camX * 0.32, 168, function (i, x) {
        var w = 104 + hash(i * 1.7) * 36, h = 150 + hash(i * 4.1) * 150;
        cityBuilding(c, x + 10, base2, w, h, CITY_COLS[Math.floor(hash(i * 2.9) * CITY_COLS.length)], i);
        if (hash(i * 6.3) > 0.6) {   // depósito de agua en el tejado
          var tx = x + 10 + w * 0.6;
          c.strokeStyle = SOFT; c.lineWidth = 2;
          c.beginPath(); c.moveTo(tx, base2 - h - 6); c.lineTo(tx + 4, base2 - h - 26); c.moveTo(tx + 26, base2 - h - 6); c.lineTo(tx + 22, base2 - h - 26); c.stroke();
          P2.rf(c, tx - 2, base2 - h - 50, 30, 26, 8, '#c9a27e', SOFT, 2);
        }
      });
      // bruma entre capas
      c.fillStyle = vgrad(c, 330, H, [[0, 'rgba(246,220,192,0)'], [1, 'rgba(246,220,192,0.55)']]);
      c.fillRect(0, 330, W, H - 330);
      // CAPA 3: árboles y farolas cercanos
      slots(camX * 0.6, 230, function (i, x) {
        var kind = hash(i * 3.7);
        if (kind < 0.55) {
          var tx = x + 40;
          P2.rf(c, tx - 6, H - 100, 12, 100, 4, '#9a7556', SOFT, 2.5);
          puff(c, [[tx - 22, H - 110, 24], [tx + 20, H - 112, 26], [tx, H - 136, 30], [tx, H - 102, 22]], '#86b48c', SOFT, 2.5);
          c.globalAlpha = 0.35; P2.circ(c, tx - 8, H - 144, 10, '#c8e6b8', null); c.globalAlpha = 1;
        } else if (kind < 0.85) {
          var lx = x + 60;
          P2.rf(c, lx - 4, H - 170, 8, 170, 3, '#6f7c9c', SOFT, 2.5);
          P2.rf(c, lx - 4, H - 172, 30, 7, 3, '#6f7c9c', SOFT, 2);
          P2.rf(c, lx + 16, H - 168, 16, 9, 4, '#fdf0c4', SOFT, 2);
        }
      });
    });
  };

  // ===========================================================================
  //  FONDO 2 — FÁBRICA DE ROBOTS  bgFabrica(c, camX, t)
  // ===========================================================================
  function gear(c, x, y, r, teeth, ang, fill, stroke) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.beginPath();
    for (var i = 0; i < teeth * 2; i++) {
      var a0 = i * PI / teeth, a1 = (i + 1) * PI / teeth;
      var rr = (i % 2) ? r * 0.84 : r;
      c.arc(0, 0, rr, a0 + 0.04, a1 - 0.04);
    }
    c.closePath();
    c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 2.5; c.stroke();
    P2.circ(c, 0, 0, r * 0.55, null, stroke, 2);
    for (var s = 0; s < 4; s++) {
      var a = s * PI / 2 + PI / 4;
      P2.circ(c, Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, r * 0.1, 'rgba(26,26,46,0.25)', null);
    }
    P2.circ(c, 0, 0, r * 0.18, '#4c5874', stroke, 2);
    c.restore();
  }
  // Robot a medio hacer sobre la cadena de montaje (stage 0..3)
  function halfRobot(c, x, y, stage, seed) {
    var st = '#8d97ad', sd = '#6c7690', red = '#b8636a';
    // piernas
    P2.rf(c, x - 14, y - 22, 11, 22, 4, sd, SOFT, 2); P2.rf(c, x + 3, y - 22, 11, 22, 4, sd, SOFT, 2);
    if (stage < 1) { P2.circ(c, x, y - 26, 4, '#c9cfdb', SOFT, 1.5); return; }
    // torso
    P2.rf(c, x - 20, y - 56, 40, 36, 9, st, SOFT, 2.2);
    P2.rf(c, x - 20, y - 36, 40, 6, 3, red, SOFT, 1.5);
    if (stage < 2) {   // cables al aire
      c.strokeStyle = '#e0a458'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - 4, y - 56); c.quadraticCurveTo(x - 10, y - 66, x - 2, y - 70); c.stroke();
      c.strokeStyle = '#7fb3d5'; c.beginPath(); c.moveTo(x + 4, y - 56); c.quadraticCurveTo(x + 12, y - 64, x + 6, y - 70); c.stroke();
      return;
    }
    // un brazo
    P2.rf(c, x + 18, y - 54, 9, 24, 4, sd, SOFT, 2);
    if (stage < 3) return;
    P2.rf(c, x - 27, y - 54, 9, 24, 4, sd, SOFT, 2);
    // cabeza (cúpula de torreta, ojo aún APAGADO)
    P2.rf(c, x - 13, y - 70, 26, 14, 6, red, SOFT, 2);
    P2.circ(c, x, y - 63, 4, '#4b5568', SOFT, 1.5);
    if (hash(seed) > 0.5) { P2.label(c, 'zzz', x + 18, y - 72, 9, '#e5e9f0'); }
  }
  function weldSpark(c, x, y, t, seed) {
    var on = mod(t * 1.3 + seed * 0.41, 1);
    if (on > 0.55) return;
    var a = 1 - on / 0.55;
    c.save(); c.globalAlpha = 0.5 * a; P2.circ(c, x, y, 10, '#fff2b0', null); c.restore();
    for (var k = 0; k < 6; k++) {
      var ang = -PI * 0.15 - hash(seed * 7 + k + Math.floor(t * 8)) * PI * 0.7;
      var d = 6 + on * 40 + k * 2;
      sparkle(c, x + Math.cos(ang) * d, y + Math.sin(ang) * d + on * on * 30, 3.2, k % 2 ? '#ffd166' : '#fff7c2', a);
    }
  }
  P2.fn.bgFabrica = function (c, camX, t) {
    camX = num(camX, 0); t = num(t, 0);
    safe(c, function () {
      // pared del fondo
      c.fillStyle = vgrad(c, 0, H, [[0, '#55627f'], [0.6, '#6b7896'], [1, '#7d86a2']]);
      c.fillRect(0, 0, W, H);
      // paneles de la pared con remaches + ventanales altos con luz
      slots(camX * 0.08, 240, function (i, x) {
        c.strokeStyle = 'rgba(26,26,46,0.18)'; c.lineWidth = 2;
        c.strokeRect(x + 4, 150, 232, 380);
        for (var r = 0; r < 4; r++) { P2.circ(c, x + 14, 164 + r * 110, 3, 'rgba(26,26,46,0.2)', null); P2.circ(c, x + 226, 164 + r * 110, 3, 'rgba(26,26,46,0.2)', null); }
        P2.rf(c, x + 40, 18, 160, 74, 10, '#a9c4dd', SOFT, 2.5);
        c.strokeStyle = SOFT; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + 93, 18); c.lineTo(x + 93, 92); c.moveTo(x + 147, 18); c.lineTo(x + 147, 92); c.moveTo(x + 40, 55); c.lineTo(x + 200, 55); c.stroke();
        c.save(); c.globalAlpha = 0.08; c.fillStyle = '#fff6d5';
        c.beginPath(); c.moveTo(x + 44, 92); c.lineTo(x + 196, 92); c.lineTo(x + 280, 540); c.lineTo(x + 90, 540); c.closePath(); c.fill();
        c.restore();
      });
      // CAPA 1: engranajes gigantes y tuberías
      slots(camX * 0.16, 300, function (i, x) {
        var r = 46 + hash(i * 2.1) * 40, gy = 190 + hash(i * 3.3) * 90, dir = (i % 2) ? 1 : -1;
        gear(c, x + 120, gy, r, 10, t * 0.35 * dir * 60 / r, '#66738f', 'rgba(26,26,46,0.45)');
        if (hash(i * 5.5) > 0.4) gear(c, x + 120 + r * 1.55, gy + r * 0.7, r * 0.6, 8, -t * 0.35 * dir * 100 / r + 0.2, '#6f7c97', 'rgba(26,26,46,0.45)');
      });
      var pOff = camX * 0.16;
      c.fillStyle = '#b0826a'; c.fillRect(0, 108, W, 16);
      c.strokeStyle = 'rgba(26,26,46,0.45)'; c.lineWidth = 2.5; c.strokeRect(-4, 108, W + 8, 16);
      slots(pOff, 150, function (i, x) {
        P2.rf(c, x, 103, 14, 26, 3, '#946652', SOFT, 2);
        if (hash(i * 4.4) > 0.55) {   // tubería que baja con válvula
          P2.rf(c, x + 60, 124, 14, 220, 4, '#7a9c8a', SOFT, 2);
          P2.rf(c, x + 55, 240, 24, 10, 3, '#5f8272', SOFT, 2);
          c.save(); c.translate(x + 67, 200); c.rotate(t * 0.5 + i);
          P2.circ(c, 0, 0, 11, null, '#c4706a', 4);
          P2.line(c, -11, 0, 11, 0, '#c4706a', 3); P2.line(c, 0, -11, 0, 11, '#c4706a', 3);
          c.restore();
        }
      });
      // CAPA 2: cadena de montaje (raíl con ganchos arriba y cinta abajo)
      var lineOff = camX * 0.38;
      var railY = 168;
      c.fillStyle = '#4d5873'; c.fillRect(0, railY - 6, W, 10);
      c.strokeStyle = SOFT; c.lineWidth = 2; c.strokeRect(-4, railY - 6, W + 8, 10);
      slots(lineOff - t * 26, 190, function (i, x) {   // piezas colgando que avanzan
        var hx = x + 60, kind = Math.floor(hash(i * 2.7) * 3);
        P2.line(c, hx, railY + 2, hx, railY + 40, '#3b4560', 2);
        c.strokeStyle = '#3b4560'; c.lineWidth = 3; c.beginPath(); c.arc(hx, railY + 46, 6, -PI * 0.1, PI * 1.1); c.stroke();
        if (kind === 0) { P2.rf(c, hx - 13, railY + 50, 26, 14, 6, '#b8636a', SOFT, 2); P2.circ(c, hx, railY + 57, 4, '#4b5568', SOFT, 1.5); }
        else if (kind === 1) { P2.rf(c, hx - 5, railY + 50, 10, 30, 4, '#6c7690', SOFT, 2); P2.circ(c, hx, railY + 84, 7, '#b8636a', SOFT, 2); }
        else { P2.rf(c, hx - 18, railY + 50, 36, 28, 8, '#8d97ad', SOFT, 2); P2.horns(c, hx, railY + 68, 0.45, '#b9895a'); }
      });
      var beltY = 404;
      // pilares + brazos robóticos de soldadura
      slots(lineOff, 380, function (i, x) {
        var px = x + 190;
        P2.rf(c, px - 12, beltY - 120, 24, 120, 5, '#5c6782', SOFT, 2);
        var a1 = -0.9 + Math.sin(t * 1.3 + i) * 0.15;
        var ex = px + Math.cos(a1) * 50, ey = beltY - 120 + Math.sin(a1) * 50;
        P2.line(c, px, beltY - 120, ex, ey, SOFT, 13); P2.line(c, px, beltY - 120, ex, ey, '#e0b04a', 9);
        var a2 = 0.95 + Math.sin(t * 1.3 + i) * 0.2;
        var tx = ex + Math.cos(a2) * 46, ty = ey + Math.sin(a2) * 46;
        P2.line(c, ex, ey, tx, ty, SOFT, 11); P2.line(c, ex, ey, tx, ty, '#e0b04a', 7);
        P2.circ(c, px, beltY - 120, 8, '#5c6782', SOFT, 2); P2.circ(c, ex, ey, 6, '#5c6782', SOFT, 2);
        P2.rf(c, tx - 4, ty - 2, 8, 12, 3, '#3b4560', SOFT, 1.5);
        weldSpark(c, tx, ty + 12, t, i);
      });
      // cinta transportadora larga
      P2.rf(c, -10, beltY, W + 20, 22, 10, '#454e66', SOFT, 2.5);
      c.fillStyle = '#5b6582';
      var bo = mod(lineOff + t * 26, 40);
      for (var bx = -bo; bx < W + 40; bx += 40) c.fillRect(bx, beltY + 4, 18, 3);
      slots(lineOff, 64, function (i, x) { P2.circ(c, x + 32, beltY + 15, 6, '#7d879f', SOFT, 1.5); });
      // robots a medio hacer que avanzan sobre la cinta
      slots(lineOff - t * 26, 200, function (i, x) {
        halfRobot(c, x + 100, beltY, Math.floor(hash(i * 3.1) * 4), i);
      });
      // patas de la cinta
      slots(lineOff, 160, function (i, x) { P2.rf(c, x + 70, beltY + 22, 12, 120, 3, '#4d5873', SOFT, 2); });
      // bruma del suelo
      c.fillStyle = vgrad(c, 380, H, [[0, 'rgba(125,134,162,0)'], [1, 'rgba(125,134,162,0.6)']]);
      c.fillRect(0, 380, W, H - 380);
      // CAPA 3: columnas cercanas con rayas de aviso y lámparas colgantes
      slots(camX * 0.65, 520, function (i, x) {
        var cx = x + 80;
        P2.rf(c, cx, -10, 46, H + 20, 6, '#56617c', SOFT, 3);
        c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(cx + 6, 0, 8, H);
        hazard(c, cx + 2, H - 70, 42, 22, 0);
        c.strokeStyle = SOFT; c.lineWidth = 2; c.strokeRect(cx + 2, H - 70, 42, 22);
        var lx = cx + 300;
        P2.line(c, lx, 0, lx, 56, '#3b4560', 2);
        c.save(); c.globalAlpha = 0.1; c.fillStyle = '#fff3c4';
        c.beginPath(); c.moveTo(lx - 12, 66); c.lineTo(lx + 12, 66); c.lineTo(lx + 90, 330); c.lineTo(lx - 90, 330); c.closePath(); c.fill(); c.restore();
        c.beginPath(); c.moveTo(lx - 20, 70); c.quadraticCurveTo(lx, 40, lx + 20, 70); c.closePath();
        c.fillStyle = '#c86b5a'; c.fill(); c.strokeStyle = SOFT; c.lineWidth = 2; c.stroke();
        P2.circ(c, lx, 71, 6, '#fff3c4', null);
      });
    });
  };

  // ===========================================================================
  //  FONDO 3 — CARRETERA AL ATARDECER  bgCarretera(c, scroll, t)
  //  carretera(c, scroll, sueloY, t)
  // ===========================================================================
  P2.fn.bgCarretera = function (c, scroll, t) {
    scroll = num(scroll, 0); t = num(t, 0);
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, H, [[0, '#4d4c90'], [0.38, '#b46a9c'], [0.62, '#f09a74'], [0.8, '#ffc98e'], [1, '#ffe1b0']]);
      c.fillRect(0, 0, W, H);
      // estrellitas tempranas
      for (var s = 0; s < 18; s++) {
        var a = 0.25 + 0.25 * Math.sin(t * 2 + s * 1.7);
        sparkle(c, hash(s) * W, hash(s * 3) * 120 + 10, 2.5, '#fff7e0', a);
      }
      // sol grande con rayas
      var sx = 640, sy = 318;
      c.save(); c.globalAlpha = 0.35; P2.circ(c, sx, sy, 120, '#ffd39a', null); c.restore();
      c.save(); c.beginPath(); c.arc(sx, sy, 84, 0, TAU); c.clip();
      c.fillStyle = vgrad(c, sy - 84, sy + 84, [[0, '#ffe9a8'], [1, '#ff9f6b']]);
      c.fillRect(sx - 90, sy - 90, 180, 180);
      c.fillStyle = '#f7a777';
      for (var b = 0; b < 5; b++) c.fillRect(sx - 90, sy + 6 + b * 14, 180, 3 + b * 1.4);
      c.restore();
      // nubes alargadas
      slots(scroll * 0.03 + t * 4, 420, function (i, x) {
        var y = 120 + hash(i * 2) * 110;
        c.fillStyle = 'rgba(255,214,190,0.55)';
        P2.rr(c, x, y, 140 + hash(i) * 120, 12, 6); c.fill();
        P2.rr(c, x + 40, y - 10, 80, 12, 6); c.fill();
      });
      // CAPA 1: ciudad lejana (silueta)
      var base1 = 372;
      slots(scroll * 0.06, 46, function (i, x) {
        var w = 34 + hash(i) * 22, h = 50 + hash(i * 1.9) * 110;
        c.fillStyle = '#7c5d9c';
        P2.rr(c, x, base1 - h, w, h + 90, 7); c.fill();
        c.fillStyle = '#ffd59e';
        for (var wy = base1 - h + 10; wy < base1 - 6; wy += 14) {
          for (var wx = x + 6; wx < x + w - 8; wx += 10) if (hash(i * 13 + wx * 0.7 + wy) > 0.6) c.fillRect(wx, wy, 4, 6);
        }
      });
      // CAPA 2: colinas + viaducto de la autopista
      c.fillStyle = '#8a5b8e';
      c.beginPath(); c.moveTo(0, H);
      for (var hx = 0; hx <= W + 20; hx += 20) {
        var wxp = hx + scroll * 0.18;
        c.lineTo(hx, 392 + Math.sin(wxp * 0.006) * 18 + Math.sin(wxp * 0.017) * 8);
      }
      c.lineTo(W, H); c.closePath(); c.fill();
      var vy = 352, vOff = scroll * 0.3;
      slots(vOff, 150, function (i, x) {
        P2.rf(c, x + 60, vy + 16, 18, 120, 3, '#9b6c95', SOFT, 2);
      });
      P2.rf(c, -10, vy, W + 20, 18, 4, '#a77aa0', SOFT, 2.5);
      c.fillStyle = '#c799b8'; c.fillRect(0, vy + 2, W, 4);
      slots(vOff - t * 120, 260, function (i, x) {   // cochecitos lejanos
        if (hash(i * 3) < 0.4) return;
        var col = ['#ffd39a', '#9fd3e6', '#f2a0a0'][i & 1 ? 1 : (hash(i) > 0.5 ? 0 : 2)];
        P2.rf(c, x, vy - 9, 26, 10, 4, col, SOFT, 1.5);
        P2.circ(c, x + 26, vy - 4, 2, '#fff3c4', null);
      });
      c.fillStyle = vgrad(c, 380, H, [[0, 'rgba(255,190,150,0)'], [1, 'rgba(255,190,150,0.45)']]);
      c.fillRect(0, 380, W, H - 380);
      // CAPA 3: farolas y señales junto a la carretera
      slots(scroll * 0.85, 300, function (i, x) {
        var lx = x + 40;
        P2.rf(c, lx - 4, 250, 8, 300, 3, '#5e4a72', SOFT, 2.5);
        P2.rf(c, lx - 4, 248, 40, 7, 3, '#5e4a72', SOFT, 2);
        c.save(); c.globalAlpha = 0.3; P2.circ(c, lx + 30, 262, 18, '#ffe7a8', null); c.restore();
        P2.rf(c, lx + 20, 252, 20, 9, 4, '#fff1c2', SOFT, 2);
        if (hash(i * 5.3) > 0.6) {   // señal verde con flecha
          var gx = x + 180;
          P2.rf(c, gx + 30, 330, 6, 200, 2, '#5e4a72', SOFT, 2);
          P2.rf(c, gx, 290, 66, 42, 6, '#3f8a68', SOFT, 2.5);
          P2.rf(c, gx + 4, 294, 58, 34, 4, null, 'rgba(255,255,255,0.7)', 1.5);
          P2.poly(c, [[gx + 16, 306], [gx + 40, 306], [gx + 40, 298], [gx + 54, 311], [gx + 40, 324], [gx + 40, 316], [gx + 16, 316]], '#f4f1e6', null);
        }
      });
    });
  };

  P2.fn.carretera = function (c, scroll, sueloY, t) {
    scroll = num(scroll, 0); t = num(t, 0); sueloY = num(sueloY, 440);
    if (sueloY >= H) return;
    safe(c, function () {
      var hgt = H - sueloY;
      // asfalto
      c.fillStyle = vgrad(c, sueloY, H, [[0, '#5a5670'], [1, '#3d3a52']]);
      c.fillRect(0, sueloY, W, hgt);
      // bordillo rojo y blanco que se desplaza
      var ch = Math.min(12, hgt * 0.2), off = mod(scroll, 64);
      for (var x = -off; x < W + 64; x += 64) {
        c.fillStyle = '#e26d6d'; c.fillRect(x, sueloY, 32, ch);
        c.fillStyle = '#f4efe6'; c.fillRect(x + 32, sueloY, 32, ch);
      }
      c.strokeStyle = O; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, sueloY); c.lineTo(W, sueloY); c.moveTo(0, sueloY + ch); c.lineTo(W, sueloY + ch); c.stroke();
      // línea blanca continua y discontinua amarilla
      c.fillStyle = 'rgba(244,239,230,0.75)'; c.fillRect(0, sueloY + ch + 6, W, 3);
      var dy = sueloY + ch + (hgt - ch) * 0.55, doff = mod(scroll, 120);
      for (var d = -doff; d < W + 120; d += 120) {
        P2.rf(c, d, dy - 3, 60, 7, 3, '#f7d774', 'rgba(26,26,46,0.5)', 1.5);
      }
      // gravilla que pasa
      c.fillStyle = 'rgba(255,255,255,0.12)';
      for (var g = 0; g < 26; g++) {
        var gx = mod(hash(g) * 1400 - scroll, 1400) - 200;
        var gy = sueloY + ch + 10 + hash(g * 7) * (hgt - ch - 14);
        c.fillRect(gx, gy, 6, 2);
      }
      c.fillStyle = 'rgba(26,26,46,0.35)'; c.fillRect(0, H - 6, W, 6);
    });
  };

  // ===========================================================================
  //  FORTALEZA (pieza compartida por bgCielo y bgFortaleza)
  // ===========================================================================
  function fortress(c, cx, baseY, s, P, t) {
    c.save(); c.translate(cx, baseY); c.scale(s, s);
    var L = P.line, lw = 3;
    // isla de roca flotante
    P2.poly(c, [[-200, 0], [200, 0], [160, 42], [80, 96], [0, 134], [-86, 92], [-160, 46]], P.rock, L, lw);
    c.fillStyle = P.rockD;
    c.beginPath(); c.moveTo(-60, 60); c.lineTo(0, 134); c.lineTo(30, 70); c.closePath(); c.fill();
    // muralla y almenas
    P2.rf(c, -168, -92, 336, 96, 8, P.stone, L, lw);
    for (var i = 0; i < 9; i++) P2.rf(c, -168 + i * 37.5 + 4, -110, 26, 22, 4, P.stone, L, lw);
    c.strokeStyle = P.mortar; c.lineWidth = 2;
    for (var r = 0; r < 3; r++) { c.beginPath(); c.moveTo(-160, -62 + r * 30); c.lineTo(160, -62 + r * 30); c.stroke(); }
    // torres laterales con tejados cónicos
    [-160, 160].forEach(function (tx, k) {
      P2.rf(c, tx - 30, -176, 60, 180, 12, P.stoneL, L, lw);
      P2.poly(c, [[tx - 40, -172], [tx, -236], [tx + 40, -172]], P.roof, L, lw);
      P2.line(c, tx, -236, tx, -262, L, 3);
      var wv = Math.sin(t * 3 + k) * 4;
      P2.poly(c, [[tx, -262], [tx + 28, -256 + wv], [tx, -246]], P.flag, L, 2);
      P2.rf(c, tx - 9, -140, 18, 26, 9, P.window, L, 2);
    });
    // torre central = ¡una cabeza-torreta gigante!
    P2.rf(c, -56, -196, 112, 120, 16, P.stoneL, L, lw);
    c.beginPath(); c.arc(0, -196, 50, PI, 0); c.closePath();
    c.fillStyle = P.roof; c.fill(); c.strokeStyle = L; c.lineWidth = lw; c.stroke();
    c.save(); c.translate(0, -214); c.rotate(-0.35);
    P2.rf(c, 20, -9, 66, 18, 6, P.roofL, L, lw);
    c.restore();
    c.save(); c.globalAlpha = 0.45; P2.circ(c, 0, -188, 18, P.eye, null); c.restore();
    P2.circ(c, 0, -188, 10, P.eye, L, 2.5);
    // puerta en arco con la marca de los cuernos
    c.beginPath(); c.moveTo(-30, 4); c.lineTo(-30, -44); c.arc(0, -44, 30, PI, 0); c.lineTo(30, 4); c.closePath();
    c.fillStyle = P.gate; c.fill(); c.strokeStyle = L; c.lineWidth = lw; c.stroke();
    P2.horns(c, 0, -100, 1.3, P.bronze);
    // estandartes
    bannerHorns(c, -96, -88, 34, 62, t, P.flag, P.bronze, 0);
    bannerHorns(c, 96, -88, 34, 62, t, P.flag, P.bronze, 1.3);
    c.restore();
  }

  // ===========================================================================
  //  FONDO 4 — CIELO (vuelo)  bgCielo(c, scroll, t)
  // ===========================================================================
  var FAR_FORT = { rock: '#9a94b8', rockD: '#878099', stone: '#b4b0cf', stoneL: '#c3bfdb', mortar: 'rgba(26,26,46,0.15)',
    roof: '#c98b98', roofL: '#d6a0aa', flag: '#cf7e8a', bronze: '#c7a07a', eye: '#f2a3a3', gate: '#8f88ad',
    window: '#8f88ad', line: 'rgba(60,62,100,0.6)' };
  P2.fn.bgCielo = function (c, scroll, t) {
    scroll = num(scroll, 0); t = num(t, 0);
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, H, [[0, '#4d9ce0'], [0.55, '#9fd2f3'], [1, '#e4f4fc']]);
      c.fillRect(0, 0, W, H);
      // sol con rayos lentos
      c.save(); c.translate(110, 80); c.rotate(t * 0.05);
      c.globalAlpha = 0.18; c.fillStyle = '#fffbe0';
      for (var r = 0; r < 10; r++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(0, 0); c.lineTo(220, -24); c.lineTo(220, 24); c.closePath(); c.fill(); }
      c.restore();
      P2.circ(c, 110, 80, 52, 'rgba(255,250,220,0.6)', null);
      P2.circ(c, 110, 80, 36, '#fff8d6', null);
      // nubes muy lejanas
      slots(scroll * 0.05 + t * 3, 260, function (i, x) {
        var y = 150 + hash(i * 3) * 160, s = 0.45 + hash(i * 5) * 0.3;
        puff(c, cloudK(x + 50, y, s), 'rgba(255,255,255,0.7)', null);
      });
      // la fortaleza a lo lejos (se acerca poco a poco)
      var near = 1 - Math.exp(-Math.max(0, scroll) / 9000);
      fortress(c, 790 - near * 230, 250 + Math.sin(t * 0.8) * 4, 0.42 + near * 0.2, FAR_FORT, t);
      c.fillStyle = 'rgba(214,236,250,0.25)'; c.fillRect(0, 0, W, H);   // bruma de distancia
      // CAPA 2: nubes medianas esponjosas
      slots(scroll * 0.28 + t * 8, 330, function (i, x) {
        var y = 90 + hash(i * 7) * 330, s = 0.8 + hash(i * 9) * 0.5;
        puff(c, cloudK(x + 80, y, s), '#f7fbff', 'rgba(130,160,205,0.55)', 3);
        c.save(); c.globalAlpha = 0.6; puff(c, [[x + 70, y - 12 * s, 12 * s]], '#ffffff', null); c.restore();
      });
      // rayas de viento
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
      slots(scroll * 1.3 + t * 160, 210, function (i, x) {
        var y = 60 + hash(i * 4.4) * 420;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60 + hash(i) * 60, y); c.stroke();
      });
      // CAPA 3: mar de nubes cercano abajo
      var off = scroll * 0.7 + t * 12;
      slots(off, 150, function (i, x) {
        var r = 46 + hash(i * 2.2) * 26;
        puff(c, [[x + 75, H - 20 + hash(i) * 14, r], [x + 20, H - 6, r * 0.8], [x + 130, H - 4, r * 0.7]], '#ffffff', 'rgba(130,160,205,0.6)', 3);
      });
      slots(off, 150, function (i, x) {
        c.save(); c.globalAlpha = 0.7; puff(c, [[x + 60, H - 40 + hash(i) * 14, 12]], '#ffffff', null); c.restore();
      });
    });
  };

  // ===========================================================================
  //  FONDO 5 — ARENA DEL JEFE: FORTALEZA EN EL CIELO  bgFortaleza(c, t)
  // ===========================================================================
  P2.fn.bgFortaleza = function (c, t) {
    t = num(t, 0);
    safe(c, function () {
      c.fillStyle = vgrad(c, 0, H, [[0, '#3f3d8a'], [0.42, '#7c62b2'], [0.75, '#e19bb0'], [1, '#ffd2a6']]);
      c.fillRect(0, 0, W, H);
      for (var s = 0; s < 26; s++) sparkle(c, hash(s * 1.3) * W, hash(s * 2.9) * 150, 2.6, '#fff8e8', 0.3 + 0.3 * Math.sin(t * 2.5 + s));
      // islotes flotantes lejanos
      [[150, 150, 0.5], [820, 120, 0.42], [600, 70, 0.3]].forEach(function (p, k) {
        var y = p[1] + Math.sin(t * 0.7 + k * 2) * 5, sc = p[2];
        c.save(); c.translate(p[0], y); c.scale(sc, sc);
        P2.poly(c, [[-70, 0], [70, 0], [40, 30], [0, 60], [-40, 28]], '#9b85c0', 'rgba(60,50,110,0.5)', 3);
        P2.rf(c, -20, -50, 40, 50, 8, '#b6a6d6', 'rgba(60,50,110,0.5)', 3);
        P2.poly(c, [[-26, -48], [0, -80], [26, -48]], '#c58aa2', 'rgba(60,50,110,0.5)', 3);
        c.restore();
      });
      // banco de nubes lejano
      slots(t * 6, 200, function (i, x) {
        puff(c, cloudK(x + 60, 300 + hash(i) * 20, 0.9 + hash(i * 3) * 0.4), 'rgba(250,215,225,0.85)', null);
      });
      // MURALLA DEL FONDO
      var wallY = 250, stone = '#a99cc6', stoneD = '#8f82ae', L = 'rgba(26,26,46,0.7)';
      c.fillStyle = stone; c.fillRect(0, wallY, W, H - wallY);
      for (var m = 0; m < 14; m++) P2.rf(c, m * 72 - 8, wallY - 24, 44, 30, 5, stone, L, 3);
      c.fillStyle = stone; c.fillRect(0, wallY, W, 8);
      c.strokeStyle = L; c.lineWidth = 3; c.beginPath(); c.moveTo(0, wallY); c.lineTo(W, wallY); c.stroke();
      c.strokeStyle = 'rgba(60,50,110,0.22)'; c.lineWidth = 2;
      for (var r = 0; r < 7; r++) {
        var by = wallY + 26 + r * 32;
        c.beginPath(); c.moveTo(0, by); c.lineTo(W, by); c.stroke();
        for (var bx = (r % 2) * 40; bx < W; bx += 80) { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by + 32); c.stroke(); }
      }
      // medallón central con los cuernos (sobre la muralla)
      P2.rf(c, 430, 150, 100, 110, 20, stoneD, L, 3);
      P2.circ(c, 480, 196, 38, '#7f2d3a', L, 3);
      P2.circ(c, 480, 196, 30, null, '#c7965f', 3);
      P2.horns(c, 480, 206, 1.25, '#c7965f');
      // torres a los lados
      [70, 890].forEach(function (tx, k) {
        P2.rf(c, tx - 66, 96, 132, H, 16, '#b8acd2', L, 3);
        for (var q = 0; q < 4; q++) P2.rf(c, tx - 66 + q * 36, 78, 24, 26, 4, '#b8acd2', L, 3);
        P2.poly(c, [[tx - 78, 82], [tx, -10], [tx + 78, 82]], '#b55a6b', L, 3);
        P2.poly(c, [[tx - 78, 82], [tx - 30, 82], [tx, -10]], 'rgba(255,255,255,0.12)', null);
        P2.circ(c, tx, -6, 8, '#e3b85c', L, 2.5);
        // ventanas con luz cálida (parpadeo suave)
        for (var v = 0; v < 2; v++) {
          var vy = 150 + v * 120;
          c.beginPath(); c.moveTo(tx - 15, vy + 40); c.lineTo(tx - 15, vy + 14); c.arc(tx, vy + 14, 15, PI, 0); c.lineTo(tx + 15, vy + 40); c.closePath();
          c.fillStyle = '#4a3f7a'; c.fill(); c.strokeStyle = L; c.lineWidth = 2.5; c.stroke();
          c.save(); c.globalAlpha = 0.55 + 0.2 * Math.sin(t * 3 + v + k); P2.circ(c, tx, vy + 26, 8, '#ffcf8a', null); c.restore();
        }
      });
      // estandartes con los cuernos
      [230, 345, 615, 730].forEach(function (bx, k) { bannerHorns(c, bx, wallY + 6, 56, 128, t, '#b23f50', '#d6a467', k * 1.1); });
      // zócalo + borde de la arena con nubes asomando
      c.fillStyle = stoneD; c.fillRect(0, 436, W, H - 436);
      c.strokeStyle = L; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 436); c.lineTo(W, 436); c.stroke();
      c.fillStyle = 'rgba(60,50,110,0.25)'; c.fillRect(0, 440, W, 10);
      slots(t * 10, 170, function (i, x) {
        puff(c, [[x + 50, H + 8, 40 + hash(i) * 16], [x + 110, H + 18, 34]], 'rgba(255,236,240,0.9)', null);
      });
    });
  };

  // ===========================================================================
  //  TILES  tile(c, x, y, size, tipo, tema [, estado])
  //  estado (opcional): consola true = hackeada (verde ✓); checkpoint true =
  //  activado (bandera arriba y brillante) / false = sin activar (gris).
  // ===========================================================================
  var TEMAS = {
    ciudad: { body: '#b6654f', bodyD: '#97503d', top: '#d9dde7', topD: '#9298ab', edge: '#f3f5fa', line: 'rgba(26,26,46,0.28)',
              plat: '#c98d4f', platT: '#ecb979', frame: '#7d879f', accent: '#f2c230' },
    fabrica: { body: '#5a6580', bodyD: '#48516a', top: '#a9b4c9', topD: '#7a849b', edge: '#f2c230', line: 'rgba(26,26,46,0.3)',
               plat: '#6d7891', platT: '#b4bfd2', frame: '#4d566e', accent: '#f2c230' },
    fortaleza: { body: '#7b6f9b', bodyD: '#665b85', top: '#c8bde0', topD: '#9a8fb8', edge: '#e3b85c', line: 'rgba(26,26,46,0.3)',
                 plat: '#8e82ad', platT: '#d2c8e8', frame: '#5d527e', accent: '#e3b85c' }
  };
  function tileSolid(c, s, k, P, tema, seed) {
    P2.rf(c, 0, 0, s, s, 5 * k, P.body, O, 2.5);
    var th = s * 0.3;
    if (tema === 'fabrica') {
      // placa de acero remachada
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.beginPath(); c.moveTo(4 * k, s - 4 * k); c.lineTo(s * 0.55, th + 2); c.lineTo(s * 0.7, th + 2); c.lineTo(s * 0.25, s - 4 * k); c.closePath(); c.fill();
      [[8, 0.62], [40, 0.62], [8, 0.88], [40, 0.88]].forEach(function (p) { P2.circ(c, p[0] * k, s * p[1], 2.4 * k, P.top, O, 1.2); });
    } else if (tema === 'fortaleza') {
      c.strokeStyle = P.line; c.lineWidth = 2;
      c.beginPath(); c.moveTo(2, s * 0.65); c.lineTo(s - 2, s * 0.65);
      c.moveTo(s * 0.5, th + 2); c.lineTo(s * 0.5, s * 0.65);
      c.moveTo(s * 0.22, s * 0.65); c.lineTo(s * 0.22, s - 2); c.moveTo(s * 0.78, s * 0.65); c.lineTo(s * 0.78, s - 2); c.stroke();
    } else {
      // ladrillos (ciudad)
      c.strokeStyle = P.line; c.lineWidth = 2;
      c.beginPath();
      c.moveTo(2, s * 0.56); c.lineTo(s - 2, s * 0.56); c.moveTo(2, s * 0.8); c.lineTo(s - 2, s * 0.8);
      c.moveTo(s * 0.5, th + 2); c.lineTo(s * 0.5, s * 0.56);
      c.moveTo(s * 0.25, s * 0.56); c.lineTo(s * 0.25, s * 0.8); c.moveTo(s * 0.75, s * 0.56); c.lineTo(s * 0.75, s * 0.8);
      c.moveTo(s * 0.5, s * 0.8); c.lineTo(s * 0.5, s - 2);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(4 * k, s * 0.6, s * 0.18, 3 * k);
    }
    // CARA SUPERIOR bien marcada (lo que se pisa)
    P2.rf(c, 0, 0, s, th, 5 * k, P.top, O, 2.5);
    c.fillStyle = P.edge; c.fillRect(4 * k, 2.5 * k, s - 8 * k, 3.2 * k);
    c.fillStyle = P.topD; c.fillRect(3 * k, th - 4.5 * k, s - 6 * k, 3 * k);
    if (tema === 'ciudad') {   // botones de LEGO
      P2.rf(c, s * 0.2, th * 0.38, s * 0.18, th * 0.34, 2 * k, '#eceff5', 'rgba(26,26,46,0.35)', 1.2);
      P2.rf(c, s * 0.62, th * 0.38, s * 0.18, th * 0.34, 2 * k, '#eceff5', 'rgba(26,26,46,0.35)', 1.2);
    } else if (tema === 'fortaleza') {
      P2.circ(c, s * 0.5, th * 0.55, 2 * k, P.edge, null);
    }
  }
  function tilePlatform(c, s, k, P, tema) {
    var ph = s * 0.34;
    if (tema === 'fabrica') {
      // pasarela de rejilla
      P2.line(c, s * 0.2, ph, s * 0.08, ph + 10 * k, O, 4); P2.line(c, s * 0.2, ph, s * 0.08, ph + 10 * k, P.frame, 2);
      P2.line(c, s * 0.8, ph, s * 0.92, ph + 10 * k, O, 4); P2.line(c, s * 0.8, ph, s * 0.92, ph + 10 * k, P.frame, 2);
      P2.rf(c, 0, 0, s, ph, 4 * k, P.plat, O, 2.5);
      c.fillStyle = 'rgba(26,26,46,0.45)';
      for (var gx = 5 * k; gx < s - 6 * k; gx += 7 * k) c.fillRect(gx, ph * 0.42, 4 * k, ph * 0.38);
      hazard(c, 1.5, 1.5, s - 3, 4 * k, 0);
    } else if (tema === 'fortaleza') {
      P2.poly(c, [[s * 0.15, ph], [s * 0.85, ph], [s * 0.6, ph + 10 * k], [s * 0.4, ph + 10 * k]], P.frame, O, 2);
      P2.rf(c, 0, 0, s, ph, 5 * k, P.plat, O, 2.5);
      P2.rf(c, 2, 2, s - 4, ph * 0.42, 3 * k, P.platT, null);
      c.fillStyle = P.accent; c.fillRect(4 * k, ph - 5 * k, s - 8 * k, 2.5 * k);
    } else {
      // tablón de madera con escuadras (ciudad)
      P2.poly(c, [[s * 0.12, ph], [s * 0.3, ph], [s * 0.12, ph + 12 * k]], '#7d879f', O, 2);
      P2.poly(c, [[s * 0.7, ph], [s * 0.88, ph], [s * 0.88, ph + 12 * k]], '#7d879f', O, 2);
      P2.rf(c, 0, 0, s, ph, 5 * k, P.plat, O, 2.5);
      P2.rf(c, 2, 2, s - 4, ph * 0.42, 3 * k, P.platT, null);
      c.strokeStyle = 'rgba(90,50,20,0.4)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(6 * k, ph * 0.7); c.lineTo(s * 0.45, ph * 0.7); c.moveTo(s * 0.55, ph * 0.62); c.lineTo(s - 8 * k, ph * 0.62); c.stroke();
      P2.circ(c, 5 * k, ph * 0.55, 1.6 * k, '#5b3a1e', null); P2.circ(c, s - 5 * k, ph * 0.55, 1.6 * k, '#5b3a1e', null);
    }
  }
  function tileSpike(c, s, k, P) {
    var n = 4, sw = s / n;
    for (var i = 0; i < n; i++) {
      P2.poly(c, [[i * sw + 1, s - 7 * k], [i * sw + sw / 2, s * 0.2], [(i + 1) * sw - 1, s - 7 * k]], '#dfe4ee', O, 2.2);
      c.fillStyle = '#a7b0c2';
      c.beginPath(); c.moveTo(i * sw + sw / 2, s * 0.2 + 3); c.lineTo((i + 1) * sw - 3, s - 8 * k); c.lineTo(i * sw + sw / 2, s - 8 * k); c.closePath(); c.fill();
      P2.circ(c, i * sw + sw / 2, s * 0.2 + 2, 1.6 * k, '#ffffff', null);
    }
    P2.rf(c, 0, s - 9 * k, s, 9 * k, 3 * k, P.bodyD, O, 2.2);
    c.fillStyle = '#e26d6d';
    for (var j = 0; j < 4; j++) c.fillRect(j * s / 4 + 3 * k, s - 6.5 * k, s / 8, 4 * k);
  }
  function tileDoor(c, s, k, P, t) {
    P2.rf(c, 1, 0, s - 2, s, 4 * k, P.frame, O, 2.5);
    P2.rf(c, 5 * k, 3 * k, s - 10 * k, s - 6 * k, 3 * k, '#6b7591', O, 2);
    hazard(c, 6 * k, 4 * k, s - 12 * k, 7 * k, 0);
    hazard(c, 6 * k, s - 11 * k, s - 12 * k, 7 * k, 0);
    c.strokeStyle = 'rgba(26,26,46,0.4)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(s / 2, 11 * k); c.lineTo(s / 2, s - 11 * k); c.stroke();
    // luz roja de "cerrada" + candado
    var pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 3));
    c.save(); c.globalAlpha = 0.35 * pulse; P2.circ(c, s / 2, s / 2, 13 * k, '#ff5a5a', null); c.restore();
    P2.circ(c, s / 2, s / 2, 9.5 * k, '#d83b3b', O, 2);
    c.strokeStyle = O; c.lineWidth = 3.4 * k;
    c.beginPath(); c.arc(s / 2, s / 2 - 1.5 * k, 3.4 * k, PI, 0); c.stroke();
    c.strokeStyle = '#fde68a'; c.lineWidth = 1.6 * k; c.stroke();
    P2.rf(c, s / 2 - 4.5 * k, s / 2 - 1.5 * k, 9 * k, 7 * k, 1.5 * k, '#fbbf24', O, 1.5);
  }
  function tileConsole(c, s, k, P, t, done) {
    var glow = done ? '#4ade80' : '#22d3ee', scr = done ? '#0f3b24' : '#082f49';
    // antena con luz
    P2.line(c, s * 0.72, s * 0.3, s * 0.82, s * 0.06, O, 2.5);
    P2.circ(c, s * 0.82, s * 0.06, 3 * k, (Math.sin(t * 6) > 0 || done) ? glow : '#0e7490', O, 1.5);
    // pedestal
    P2.rf(c, s * 0.3, s * 0.62, s * 0.4, s * 0.34, 3 * k, P.frame, O, 2.2);
    P2.rf(c, s * 0.18, s * 0.9, s * 0.64, s * 0.1, 2 * k, P.bodyD, O, 2);
    // cabezal con pantalla inclinada
    P2.poly(c, [[s * 0.1, s * 0.28], [s * 0.9, s * 0.22], [s * 0.86, s * 0.66], [s * 0.14, s * 0.66]], '#3d4660', O, 2.5);
    P2.poly(c, [[s * 0.17, s * 0.33], [s * 0.83, s * 0.28], [s * 0.8, s * 0.58], [s * 0.2, s * 0.58]], scr, glow, 2);
    c.save(); c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4);
    P2.circ(c, s / 2, s * 0.44, s * 0.3, glow, null); c.restore();
    if (done) {
      c.strokeStyle = glow; c.lineWidth = 3.5 * k;
      c.beginPath(); c.moveTo(s * 0.38, s * 0.44); c.lineTo(s * 0.47, s * 0.52); c.lineTo(s * 0.63, s * 0.36); c.stroke();
    } else {
      // símbolo de hackeo: ondas de señal que laten
      var ph = mod(t * 1.5, 1);
      P2.circ(c, s / 2, s * 0.53, 2.6 * k, glow, null);
      c.strokeStyle = glow; c.lineWidth = 2.2 * k;
      for (var a = 0; a < 3; a++) {
        c.globalAlpha = (ph * 3 > a) ? 1 : 0.3;
        c.beginPath(); c.arc(s / 2, s * 0.53, (5 + a * 4.5) * k, -PI * 0.78, -PI * 0.22); c.stroke();
      }
      c.globalAlpha = 1;
    }
    // botones
    P2.circ(c, s * 0.4, s * 0.76, 2.4 * k, '#f87171', O, 1.2);
    P2.circ(c, s * 0.6, s * 0.76, 2.4 * k, '#fbbf24', O, 1.2);
  }
  function tileExit(c, s, k, t) {
    var top = -s * 0.5, pulse = 1 + Math.sin(t * 4) * 0.06;
    // halo
    c.save(); c.globalAlpha = 0.45;
    var rg = c.createRadialGradient(s / 2, s * 0.3, 4, s / 2, s * 0.3, s * 0.95 * pulse);
    rg.addColorStop(0, '#fffbe0'); rg.addColorStop(0.5, 'rgba(134,239,172,0.7)'); rg.addColorStop(1, 'rgba(134,239,172,0)');
    c.fillStyle = rg; c.fillRect(-s * 0.5, top - s * 0.4, s * 2, s * 2);
    c.restore();
    // arco dorado
    function archPath(inset) {
      c.beginPath();
      c.moveTo(inset, s); c.lineTo(inset, top + s / 2);
      c.arc(s / 2, top + s / 2, s / 2 - inset, PI, 0);
      c.lineTo(s - inset, s); c.closePath();
    }
    archPath(1); c.fillStyle = '#f2c94c'; c.fill(); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
    archPath(7 * k);
    var ig = c.createLinearGradient(0, top, 0, s);
    ig.addColorStop(0, '#f0fff4'); ig.addColorStop(1, '#86efac');
    c.fillStyle = ig; c.fill(); c.strokeStyle = O; c.lineWidth = 2; c.stroke();
    // remolino interior
    c.save(); archPath(7 * k); c.clip();
    c.strokeStyle = 'rgba(34,197,94,0.55)'; c.lineWidth = 2.5 * k;
    c.beginPath();
    for (var a = 0; a < PI * 5; a += 0.25) {
      var rr = a * 1.9 * k;
      var px = s / 2 + Math.cos(a + t * 3) * rr, py = s * 0.28 + Math.sin(a + t * 3) * rr * 1.25;
      if (a === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
    c.restore();
    // flecha que invita a entrar
    var by = s * 0.25 + Math.sin(t * 5) * 3 * k;
    P2.poly(c, [[s * 0.38, by - 8 * k], [s * 0.62, by - 8 * k], [s * 0.62, by + 1 * k], [s * 0.72, by + 1 * k], [s / 2, by + 12 * k], [s * 0.28, by + 1 * k], [s * 0.38, by + 1 * k]], '#22c55e', O, 2);
    // estrella en lo alto
    P2.poly(c, starPts(s / 2, top + 1, 8 * k, 3.6 * k, 5, Math.sin(t * 2) * 0.2), '#fff3a3', O, 2);
    sparkle(c, s * 0.18, s * 0.1 + Math.sin(t * 3) * 4, 4 * k, '#ffffff', 0.5 + 0.5 * Math.sin(t * 4));
    sparkle(c, s * 0.84, -s * 0.12 + Math.cos(t * 3) * 4, 4 * k, '#ffffff', 0.5 + 0.5 * Math.cos(t * 4));
  }
  function tileBox(c, s, k, tema) {
    var p = 3 * k, w = s - 2 * p;
    var body = tema === 'fabrica' ? '#c08a47' : (tema === 'fortaleza' ? '#b98552' : '#c88f45');
    P2.rf(c, p, p, w, w, 4 * k, body, O, 2.5);
    c.strokeStyle = 'rgba(110,60,20,0.55)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(p + 4, s * 0.38); c.lineTo(s - p - 4, s * 0.38); c.moveTo(p + 4, s * 0.62); c.lineTo(s - p - 4, s * 0.62); c.stroke();
    P2.line(c, p + 5 * k, p + 5 * k, s - p - 5 * k, s - p - 5 * k, O, 6 * k);
    P2.line(c, p + 5 * k, p + 5 * k, s - p - 5 * k, s - p - 5 * k, '#a8702f', 3.5 * k);
    P2.rf(c, p, p, w, w, 4 * k, null, O, 2.5);
    [[p, p], [s - p - 9 * k, p], [p, s - p - 9 * k], [s - p - 9 * k, s - p - 9 * k]].forEach(function (q) {
      P2.rf(c, q[0], q[1], 9 * k, 9 * k, 2 * k, '#8b93a7', O, 1.5);
    });
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(p + 10 * k, p + 3 * k, s * 0.3, 2.5 * k);
  }
  function tileCheckpoint(c, s, k, t, estado) {
    var off = (estado === false);
    var on = (estado === true);
    // aro brillante en la base
    if (!off) { c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4); P2.elli(c, s / 2, s - 3 * k, 18 * k, 5 * k, '#86efac', null); c.restore(); }
    P2.rf(c, s / 2 - 3 * k, -s * 0.3, 6 * k, s * 1.28, 2 * k, '#cbd5e1', O, 2.2);
    P2.circ(c, s / 2, -s * 0.32, 4.5 * k, off ? '#94a3b8' : '#fbbf24', O, 2);
    var fy = off ? s * 0.42 : -s * 0.22;
    var wave = Math.sin(t * 6) * 3 * k;
    c.beginPath();
    c.moveTo(s / 2 + 3 * k, fy);
    c.quadraticCurveTo(s * 0.8, fy - 4 * k + wave, s * 1.02, fy + wave);
    c.lineTo(s * 0.9, fy + 10 * k + wave * 0.5);
    c.quadraticCurveTo(s * 1.0, fy + 18 * k, s * 1.02, fy + 22 * k + wave * 0.6);
    c.quadraticCurveTo(s * 0.78, fy + 18 * k - wave, s / 2 + 3 * k, fy + 22 * k);
    c.closePath();
    c.fillStyle = off ? '#9aa3b5' : '#22c55e'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.2; c.stroke();
    P2.poly(c, starPts(s * 0.74, fy + 11 * k + wave * 0.5, 6 * k, 2.6 * k, 5, 0), off ? '#cbd5e1' : '#fef9c3', O, 1.3);
    P2.rf(c, s / 2 - 10 * k, s - 7 * k, 20 * k, 7 * k, 2 * k, '#64748b', O, 2);
    if (on) {
      sparkle(c, s * 0.22, -s * 0.1 + Math.sin(t * 4) * 3, 4 * k, '#fef9c3', 0.6 + 0.4 * Math.sin(t * 5));
      sparkle(c, s * 0.95, s * 0.35 + Math.cos(t * 4) * 3, 3.5 * k, '#fef9c3', 0.6 + 0.4 * Math.cos(t * 5));
    }
  }
  function tileCinta(c, s, k, P, t, dir) {
    // armazón (sólido)
    P2.rf(c, 0, s * 0.3, s, s * 0.7, 4 * k, P.frame, O, 2.5);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(3 * k, s * 0.86, s - 6 * k, 4 * k);
    // rodillos que giran
    [s * 0.27, s * 0.73].forEach(function (rx) {
      P2.circ(c, rx, s * 0.64, 8.5 * k, '#9aa4b9', O, 2);
      c.save(); c.translate(rx, s * 0.64); c.rotate(dir * t * 90 / (8.5 * k));
      P2.line(c, -6 * k, 0, 6 * k, 0, '#4b5568', 2); P2.line(c, 0, -6 * k, 0, 6 * k, '#4b5568', 2);
      c.restore();
      P2.circ(c, rx, s * 0.64, 2.2 * k, '#4b5568', null);
    });
    // banda superior (la que se pisa) con flechas que avanzan a 90 px/s
    var bh = s * 0.38;
    P2.rf(c, 0, 0, s, bh, bh / 2, '#363c50', O, 2.8);
    c.save();
    P2.rr(c, 2, 2, s - 4, bh - 4, bh / 2 - 2); c.clip();
    var period = s / 2, off = mod(t * 90 * dir, period);
    c.fillStyle = '#f2c230';
    for (var ax = -period + off; ax < s + period; ax += period) {
      var cx = ax, cy = bh / 2, w = 7 * k, hh = bh * 0.32;
      c.beginPath();
      c.moveTo(cx - dir * w, cy - hh); c.lineTo(cx + dir * w * 0.4, cy - hh);
      c.lineTo(cx + dir * w * 1.4, cy); c.lineTo(cx + dir * w * 0.4, cy + hh);
      c.lineTo(cx - dir * w, cy + hh); c.lineTo(cx, cy);
      c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 2, s, 3 * k);
    c.restore();
  }

  P2.fn.tile = function (c, x, y, size, tipo, tema, estado) {
    safe(c, function () {
      var s = num(size, 48), k = s / 48, t = now();
      x = num(x, 0); y = num(y, 0);
      tema = TEMAS[tema] ? tema : 'ciudad';
      var P = TEMAS[tema];
      c.translate(x, y);
      switch (tipo) {
        case 'platform': tilePlatform(c, s, k, P, tema); break;
        case 'spike': tileSpike(c, s, k, P); break;
        case 'door': tileDoor(c, s, k, P, t); break;
        case 'console': tileConsole(c, s, k, P, t, estado === true); break;
        case 'exit': tileExit(c, s, k, t); break;
        case 'box': tileBox(c, s, k, tema); break;
        case 'checkpoint': tileCheckpoint(c, s, k, t, estado); break;
        case 'cintaIzq': tileCinta(c, s, k, P, t, -1); break;
        case 'cintaDer': tileCinta(c, s, k, P, t, 1); break;
        default: tileSolid(c, s, k, P, tema, hash(x * 0.37 + y * 0.71));
      }
    });
  };

  // ===========================================================================
  //  PRENSA  prensa(c, x, techoY, bajada01, size)  x = borde izquierdo de la columna
  // ===========================================================================
  P2.fn.prensa = function (c, x, techoY, bajada01, size) {
    safe(c, function () {
      var s = num(size, 48), k = s / 48, b = Math.max(0, Math.min(1, num(bajada01, 0)));
      x = num(x, 0); techoY = num(techoY, 0);
      var headH = s * 0.55;
      var bottom = techoY + s * 0.95 + (3 * s - s * 0.95) * b;
      var headTop = bottom - headH;
      // vástago
      P2.rf(c, x + s * 0.36, techoY + s * 0.2, s * 0.28, Math.max(2, headTop - techoY - s * 0.15), 3 * k, '#c3cbdb', O, 2.2);
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x + s * 0.4, techoY + s * 0.22, 2.5 * k, Math.max(0, headTop - techoY - s * 0.2));
      // soporte en el techo
      P2.rf(c, x + s * 0.08, techoY - 2, s * 0.84, s * 0.32, 4 * k, '#4a5469', O, 2.5);
      P2.circ(c, x + s * 0.2, techoY + s * 0.14, 2.4 * k, '#9aa6bd', null);
      P2.circ(c, x + s * 0.8, techoY + s * 0.14, 2.4 * k, '#9aa6bd', null);
      // cabezal pesado
      P2.rf(c, x - 3 * k, headTop, s + 6 * k, headH, 6 * k, '#5b6680', O, 2.8);
      P2.rf(c, x + 2 * k, headTop + 4 * k, s - 4 * k, headH * 0.36, 3 * k, '#7a859e', null);
      hazard(c, x - 1 * k, bottom - 11 * k, s + 2 * k, 9 * k, 0);
      c.strokeStyle = O; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 3 * k, bottom - 11 * k); c.lineTo(x + s + 3 * k, bottom - 11 * k); c.stroke();
      P2.rf(c, x - 3 * k, headTop, s + 6 * k, headH, 6 * k, null, O, 2.8);
      // lucecita de aviso
      var lit = Math.sin(now() * 10) > 0;
      P2.circ(c, x + s / 2, headTop + headH * 0.3, 4 * k, lit ? '#ff6b6b' : '#8b2c2c', O, 1.5);
    });
  };

  // ===========================================================================
  //  MEDALLAS
  // ===========================================================================
  function medalShape(c, R, t, apagada, rim) {
    var gold = apagada ? '#9aa3b5' : '#fbbf24', goldD = apagada ? '#6b7385' : '#d97706', goldL = apagada ? '#cbd2de' : '#fde68a';
    // cintas
    P2.poly(c, [[-R * 0.9, -R * 2.0], [-R * 0.15, -R * 2.0], [R * 0.25, -R * 0.4], [-R * 0.35, -R * 0.4]], apagada ? '#7d8597' : '#3b82f6', O, 2.2);
    P2.poly(c, [[R * 0.15, -R * 2.0], [R * 0.9, -R * 2.0], [R * 0.35, -R * 0.4], [-R * 0.25, -R * 0.4]], apagada ? '#8f97a8' : '#ef4444', O, 2.2);
    // disco
    if (rim) {
      c.beginPath();
      for (var i = 0; i < 32; i++) { var a = i * TAU / 32, rr = (i % 2) ? R * 1.04 : R * 1.12; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr + R * 0.15); }
      c.closePath(); c.fillStyle = goldD; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    }
    P2.circ(c, 0, R * 0.15, R, gold, O, 2.5);
    P2.circ(c, 0, R * 0.15, R * 0.74, null, goldD, Math.max(1.5, R * 0.1));
    P2.poly(c, starPts(0, R * 0.17, R * 0.56, R * 0.24, 5, 0), goldL, O, Math.max(1.2, R * 0.11));
    // brillo que pasa
    if (!apagada) {
      c.save(); c.beginPath(); c.arc(0, R * 0.15, R, 0, TAU); c.clip();
      var sx = -R * 1.6 + mod(t * 0.7, 2.2) * R * 1.5;
      c.globalAlpha = 0.45; c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(sx, -R); c.lineTo(sx + R * 0.35, -R); c.lineTo(sx - R * 0.15, R * 1.3); c.lineTo(sx - R * 0.5, R * 1.3); c.closePath(); c.fill();
      c.restore();
    }
  }
  P2.fn.medalla = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), t = num(o.t, now());
      c.translate(num(x, 0), num(y, 0)); c.scale(s, s);
      if (o.apagada) c.globalAlpha = 0.85;
      medalShape(c, 10, t, !!o.apagada, false);
      if (!o.apagada) sparkle(c, 8, -6, 3.5, '#ffffff', 0.5 + 0.5 * Math.sin(t * 5));
    });
  };
  P2.fn.medallaGrande = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), t = now(), nueva = !!o.nueva, ap = !!o.apagada;
      c.translate(num(x, 0), num(y, 0)); c.scale(s, s);
      if (nueva && !ap) {
        c.save(); c.translate(0, 6); c.rotate(t * 0.6);
        c.globalAlpha = 0.35; c.fillStyle = '#fde68a';
        for (var r = 0; r < 12; r++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(90, -12); c.lineTo(90, 12); c.closePath(); c.fill(); }
        c.restore();
        c.save(); c.globalAlpha = 0.4 + 0.15 * Math.sin(t * 4); P2.circ(c, 0, 6, 58, '#fff3c4', null); c.restore();
      }
      var bob = nueva ? Math.sin(t * 3) * 3 : 0;
      c.translate(0, bob);
      medalShape(c, 40, t, ap, true);
      if (nueva && !ap) {
        for (var k = 0; k < 4; k++) {
          var a = t * 1.5 + k * PI / 2;
          sparkle(c, Math.cos(a) * 62, 6 + Math.sin(a) * 56, 7, '#ffffff', 0.5 + 0.5 * Math.sin(t * 6 + k));
        }
      }
    });
  };

  // ===========================================================================
  //  ARMAS: glifos (espacio de 48 unidades centrado en 0,0, mirando a la derecha)
  // ===========================================================================
  var G_ = {};
  G_.espada = function (c) {
    c.save(); c.rotate(PI / 4);
    P2.poly(c, [[0, -24], [5, -17], [5, 5], [-5, 5], [-5, -17]], '#e8edf5', O, 2.5);
    P2.line(c, 0, -18, 0, 2, '#aab4c5', 2);
    P2.rf(c, -12, 4, 24, 6, 3, '#f2c230', O, 2.2);
    P2.rf(c, -3, 9, 6, 11, 2, '#7a4a24', O, 2);
    P2.circ(c, 0, 22, 4, '#f2c230', O, 2);
    c.restore();
  };
  G_.arco = function (c) {
    c.save(); c.translate(-6, 0);
    c.lineCap = 'round';
    c.beginPath(); c.arc(-14, 0, 22, -1.05, 1.05);
    c.strokeStyle = O; c.lineWidth = 8; c.stroke();
    c.strokeStyle = '#b0763c'; c.lineWidth = 4.5; c.stroke();
    var ex = -14 + Math.cos(1.05) * 22, ey = Math.sin(1.05) * 22;
    P2.line(c, ex, -ey, ex, ey, '#f4efe6', 1.8);
    // flecha
    P2.line(c, ex - 4, 0, 26, 0, O, 5); P2.line(c, ex - 4, 0, 26, 0, '#c9a46b', 2.5);
    P2.poly(c, [[30, 0], [21, -6], [23, 0], [21, 6]], '#dfe4ee', O, 2);
    P2.poly(c, [[ex - 4, 0], [ex - 10, -6], [ex, -6], [ex + 5, 0], [ex, 6], [ex - 10, 6]], '#22c55e', O, 1.8);
    c.restore();
  };
  function glovePath(c) {
    c.beginPath();
    c.moveTo(-13, 9); c.lineTo(-15, -4);
    c.quadraticCurveTo(-16, -20, 1, -20);
    c.quadraticCurveTo(19, -20, 19, -4);
    c.quadraticCurveTo(19, 11, 3, 11);
    c.closePath();
  }
  function glove(c) {
    // guante de boxeo azul (del Director): puño grande, pulgar y puño blanco
    P2.rf(c, -16, 6, 20, 13, 4, '#f1f5f9', O, 2.5);
    P2.line(c, -14, 12.5, 2, 12.5, '#22d3ee', 2.5);
    glovePath(c); c.fillStyle = '#3b82f6'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.8; c.stroke();
    c.strokeStyle = 'rgba(26,26,46,0.55)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(6, -19); c.quadraticCurveTo(13, -6, 8, 10); c.stroke();
    c.save(); c.translate(-1, 2); c.rotate(-0.25);
    P2.elli(c, 0, 0, 9, 5, '#2563eb', O, 2.2);
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.5)'; P2.rr(c, -10, -16, 12, 5, 2.5); c.fill();
  }
  G_.guantes = function (c) {
    glove(c);
    P2.line(c, 24, -12, 30, -14, O, 2.5); P2.line(c, 25, -4, 32, -4, O, 2.5); P2.line(c, 24, 4, 30, 6, O, 2.5);
  };
  G_.pulso = function (c, t) {
    t = num(t, 0);
    c.save(); c.globalAlpha = 0.3 + 0.1 * Math.sin(t * 8); P2.circ(c, 0, 0, 19, '#22d3ee', null); c.restore();
    P2.poly(c, [[5, -22], [-11, 3], [-1, 3], [-6, 22], [12, -5], [2, -5], [8, -22]], '#a5f3fc', O, 2.5);
    P2.poly(c, [[4, -15], [-5, 1], [1, 1]], '#ffffff', null);
    [[-16, -10], [16, 10], [-15, 13]].forEach(function (p, i) {
      sparkle(c, p[0], p[1], 3.5, '#fde047', 0.6 + 0.4 * Math.sin(t * 9 + i * 2));
    });
  };
  G_.bumeran = function (c) {
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, 21, -2.5, -0.6); c.strokeStyle = O; c.lineWidth = 5; c.stroke();
    c.strokeStyle = '#fef3c7'; c.lineWidth = 2.5; c.stroke();
    P2.poly(c, [[Math.cos(-0.6) * 21 + 5, Math.sin(-0.6) * 21 + 1], [Math.cos(-0.6) * 21 - 5, Math.sin(-0.6) * 21 - 5], [Math.cos(-0.6) * 21 - 3, Math.sin(-0.6) * 21 + 5]], '#fef3c7', O, 1.8);
    c.restore();
    shieldDisc(c, 0, 3, 15);
  };
  G_.red = function (c) {
    // lanzador verde + red redonda con pesas
    c.save(); c.beginPath(); c.arc(6, -5, 15, 0, TAU); c.clip();
    c.fillStyle = 'rgba(240,253,244,0.35)'; c.fillRect(-12, -22, 36, 36);
    c.strokeStyle = '#f4efe6'; c.lineWidth = 1.8;
    for (var g = -12; g <= 24; g += 6) { c.beginPath(); c.moveTo(g, -22); c.lineTo(g + 10, 12); c.stroke(); c.beginPath(); c.moveTo(-12, -22 + (g + 12)); c.lineTo(24, -26 + (g + 12)); c.stroke(); }
    c.restore();
    P2.circ(c, 6, -5, 15, null, O, 2.5);
    [0.8, 2.4, 3.9, 5.5].forEach(function (a) { P2.circ(c, 6 + Math.cos(a) * 15, -5 + Math.sin(a) * 15, 3.2, '#94a3b8', O, 1.5); });
    P2.line(c, -6, 9, 0, 3, '#f4efe6', 1.8);
    P2.rf(c, -22, 8, 22, 10, 4, '#16a34a', O, 2.2);
    P2.rf(c, -4, 6, 7, 14, 3, '#14532d', O, 2);
    P2.rf(c, -18, 15, 6, 9, 2, '#14532d', O, 2);
  };
  G_.jetpack = function (c, t) {
    t = num(t, 0);
    var fl = 0.85 + 0.15 * Math.sin(t * 20);
    [-8, 8].forEach(function (fx) {
      P2.poly(c, [[fx - 5, 13], [fx, 13 + 12 * fl], [fx + 5, 13]], '#fb923c', O, 1.5);
      P2.poly(c, [[fx - 2.5, 13], [fx, 13 + 7 * fl], [fx + 2.5, 13]], '#fde047', null);
      P2.rf(c, fx - 5, 8, 10, 6, 2, '#475569', O, 2);
      P2.rf(c, fx - 7, -18, 14, 28, 7, '#cbd5e1', O, 2.5);
      P2.rf(c, fx - 4, -14, 3, 18, 1.5, 'rgba(255,255,255,0.6)', null);
    });
    P2.rf(c, -18, -7, 36, 8, 3, '#3b82f6', O, 2.2);
    P2.circ(c, 0, -3, 3, '#22d3ee', O, 1.5);
  };
  function shieldDisc(c, x, y, r) {
    P2.circ(c, x, y, r, '#3b82f6', O, 2.5);
    P2.circ(c, x, y, r * 0.72, '#e2e8f0', O, 1.5);
    P2.circ(c, x, y, r * 0.46, '#3b82f6', O, 1.5);
    P2.poly(c, starPts(x, y, r * 0.38, r * 0.16, 5, 0), '#ffffff', null);
    c.save(); c.globalAlpha = 0.35; P2.elli(c, x - r * 0.35, y - r * 0.45, r * 0.35, r * 0.15, '#ffffff', null); c.restore();
  }
  var TIPO_ARMA = { espada: 'cuerpo', guantes: 'cuerpo', arco: 'distancia', pulso: 'distancia', bumeran: 'distancia', red: 'distancia', jetpack: 'movimiento' };
  var RIM = { cuerpo: '#f59e0b', distancia: '#38bdf8', movimiento: '#a78bfa' };

  P2.fn.iconoArma = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var size = num(o.size, 40), arma = G_[o.arma] ? o.arma : 'espada', k = size / 48, t = now();
      c.translate(num(x, 0), num(y, 0)); c.scale(k, k);
      var rim = RIM[TIPO_ARMA[arma]] || '#38bdf8';
      P2.rf(c, -23, -23, 46, 46, 12, '#26294a', O, 3);
      P2.rf(c, -20, -20, 40, 40, 10, null, rim, 2.5);
      c.save(); c.globalAlpha = 0.12; P2.rf(c, -18, -19, 36, 14, 8, '#ffffff', null); c.restore();
      if (o.ocupada) c.globalAlpha = 0.35;
      c.save(); c.scale(0.78, 0.78); G_[arma](c, t); c.restore();
      c.globalAlpha = 1;
      if (o.ocupada) {
        P2.rf(c, -23, -23, 46, 46, 12, 'rgba(15,15,35,0.45)', null);
        // candado pequeño
        c.strokeStyle = O; c.lineWidth = 4.5;
        c.beginPath(); c.arc(12, 9, 5, PI, 0); c.stroke();
        c.strokeStyle = '#cbd5e1'; c.lineWidth = 2.2; c.stroke();
        P2.rf(c, 5, 9, 14, 11, 2.5, '#94a3b8', O, 2);
        P2.circ(c, 12, 14, 1.8, O, null);
      }
    });
  };

  // ===========================================================================
  //  ARMA EN LA MANO  armaEnMano(c, manoX, manoY, {arma, facing, t01, scale})
  // ===========================================================================
  P2.fn.armaEnMano = function (c, manoX, manoY, o) {
    o = o || {};
    var arma = o.arma;
    if (arma === 'jetpack' || !arma) return;   // el jetpack no se lleva en la mano
    safe(c, function () {
      var s = num(o.scale, 1), f = (o.facing === -1) ? -1 : 1, p = Math.max(0, Math.min(1, num(o.t01, 0))), t = now();
      c.translate(num(manoX, 0), num(manoY, 0)); c.scale(f * s, s);
      if (arma === 'espada') {
        // tajo: de arriba-atrás a abajo-delante
        var ang = -2.0 + p * 2.6;
        if (p > 0.15 && p < 0.85) {   // estela
          c.save(); c.globalAlpha = 0.45 * Math.sin((p - 0.15) / 0.7 * PI);
          c.beginPath(); c.arc(0, 0, 30, ang - 1.1, ang); c.arc(0, 0, 14, ang, ang - 1.1, true); c.closePath();
          c.fillStyle = '#e0f2fe'; c.fill(); c.restore();
        }
        c.save(); c.rotate(ang);
        P2.poly(c, [[6, -4], [30, -4], [37, 0], [30, 4], [6, 4]], '#e8edf5', O, 2.2);
        P2.line(c, 8, 0, 30, 0, '#aab4c5', 1.5);
        P2.rf(c, 3, -9, 5, 18, 2.5, '#f2c230', O, 2);
        P2.rf(c, -6, -2.5, 10, 5, 2, '#7a4a24', O, 1.8);
        P2.circ(c, -7, 0, 3, '#f2c230', O, 1.5);
        c.restore();
      } else if (arma === 'guantes') {
        var thrust = Math.sin(p * PI) * 12;
        c.translate(thrust, 0);
        if (p > 0.2 && p < 0.8) {
          P2.line(c, -14, -7, -26, -7, 'rgba(255,255,255,0.8)', 2.5);
          P2.line(c, -12, 1, -28, 1, 'rgba(255,255,255,0.8)', 2.5);
          P2.line(c, -14, 8, -24, 8, 'rgba(255,255,255,0.8)', 2.5);
        }
        c.save(); c.translate(6, 0); c.scale(0.62, 0.62); glove(c); c.restore();
      } else if (arma === 'arco') {
        var pull = p < 0.5 ? p * 2 : 0;
        c.save(); c.translate(4, 0);
        c.beginPath(); c.arc(-14, 0, 20, -1.05, 1.05);
        c.strokeStyle = O; c.lineWidth = 7; c.stroke(); c.strokeStyle = '#b0763c'; c.lineWidth = 4; c.stroke();
        var ex = -14 + Math.cos(1.05) * 20, ey = Math.sin(1.05) * 20, sx = ex - pull * 12;
        c.strokeStyle = '#f4efe6'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(ex, -ey); c.lineTo(sx, 0); c.lineTo(ex, ey); c.stroke();
        if (p < 0.5) {
          P2.line(c, sx, 0, sx + 30, 0, O, 4.5); P2.line(c, sx, 0, sx + 30, 0, '#c9a46b', 2.2);
          P2.poly(c, [[sx + 35, 0], [sx + 27, -5], [sx + 29, 0], [sx + 27, 5]], '#dfe4ee', O, 1.8);
          P2.poly(c, [[sx, 0], [sx - 5, -4], [sx + 3, -4], [sx + 6, 0], [sx + 3, 4], [sx - 5, 4]], '#22c55e', O, 1.5);
        }
        c.restore();
        P2.circ(c, 0, 0, 4.5, '#f2c49b', O, 2);
      } else if (arma === 'pulso') {
        var r = 5 + p * 7 + Math.sin(t * 30) * 1.2;
        P2.rf(c, -7, -5, 9, 10, 3, '#0f172a', O, 2);
        P2.rf(c, -5, -3, 5, 6, 2, '#22d3ee', null);
        c.save(); c.globalAlpha = 0.35; P2.circ(c, 8, 0, r * 1.7, '#22d3ee', null); c.restore();
        P2.circ(c, 8, 0, r, '#a5f3fc', '#0ea5e9', 2);
        P2.circ(c, 8, 0, r * 0.45, '#ffffff', null);
        c.strokeStyle = '#e0faff'; c.lineWidth = 1.8;
        for (var z = 0; z < 4; z++) {
          var a = z * PI / 2 + t * 12, r1 = r + 2, r2 = r + 7 + p * 5;
          c.beginPath(); c.moveTo(8 + Math.cos(a) * r1, Math.sin(a) * r1);
          c.lineTo(8 + Math.cos(a + 0.3) * (r1 + r2) / 2, Math.sin(a + 0.3) * (r1 + r2) / 2);
          c.lineTo(8 + Math.cos(a) * r2, Math.sin(a) * r2); c.stroke();
        }
      } else if (arma === 'bumeran') {
        // escudo en el brazo; al lanzar se echa atrás y luego adelante
        var sw = p < 0.4 ? -p / 0.4 * 6 : (p - 0.4) / 0.6 * 10;
        c.save(); c.translate(6 + sw, 0); c.scale(0.55, 1);
        shieldDisc(c, 0, 0, 15);
        c.restore();
        P2.circ(c, 0, 0, 4.5, '#f2c49b', O, 2);
      } else if (arma === 'red') {
        var rec = Math.sin(p * PI) * -5;
        c.save(); c.translate(rec, 0);
        P2.rf(c, -2, -6, 30, 12, 5, '#16a34a', O, 2.2);
        P2.rf(c, 24, -8, 8, 16, 3, '#14532d', O, 2);
        P2.rf(c, 2, 2, 7, 11, 2.5, '#14532d', O, 2);
        P2.rf(c, 4, -4, 14, 3, 1.5, 'rgba(255,255,255,0.4)', null);
        c.restore();
        if (p > 0.05 && p < 0.5) {
          var a2 = 1 - p / 0.5;
          c.save(); c.globalAlpha = a2;
          puff(c, [[38, -2, 6 + p * 10], [42, 4, 5 + p * 8]], '#f1f5f9', null);
          c.restore();
        }
        P2.circ(c, 0, 0, 4.5, '#f2c49b', O, 2);
      }
    });
  };

  // ===========================================================================
  //  PROYECTILES Y EQUIPO
  // ===========================================================================
  P2.fn.bumeran = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), t = num(o.t, now());
      c.translate(num(x, 0), num(y, 0)); c.scale(s, s);
      // estela de giro
      c.save(); c.globalAlpha = 0.5; c.lineCap = 'round';
      for (var i = 0; i < 2; i++) {
        var a0 = t * 18 + i * PI;
        c.beginPath(); c.arc(0, 0, 19, a0, a0 + 1.4);
        c.strokeStyle = '#e0f2fe'; c.lineWidth = 3; c.stroke();
      }
      c.restore();
      var squish = 0.65 + 0.35 * Math.abs(Math.cos(t * 9));
      c.save(); c.rotate(t * 18); c.scale(1, squish);
      shieldDisc(c, 0, 0, 13);
      c.restore();
    });
  };

  P2.fn.red = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), abierta = (o.abierta !== false), t = now();
      c.translate(num(x, 0), num(y, 0)); c.scale(s, s);
      if (abierta) {
        // red desplegada en vuelo (cuadrada con pesas en las esquinas)
        var wob = Math.sin(t * 14) * 2;
        var pts = [[-20, -18 - wob], [20, -18 + wob], [20 + wob, 18], [-20, 18 + wob]];
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        c.quadraticCurveTo(0, -12, pts[1][0], pts[1][1]); c.quadraticCurveTo(14, 0, pts[2][0], pts[2][1]);
        c.quadraticCurveTo(0, 12, pts[3][0], pts[3][1]); c.quadraticCurveTo(-14, 0, pts[0][0], pts[0][1]);
        c.closePath();
        c.fillStyle = 'rgba(240,253,244,0.28)'; c.fill();
        c.save(); c.clip();
        c.strokeStyle = '#f4efe6'; c.lineWidth = 2;
        for (var g = -24; g <= 24; g += 8) {
          c.beginPath(); c.moveTo(g, -24); c.quadraticCurveTo(g + 3, 0, g, 24); c.stroke();
          c.beginPath(); c.moveTo(-24, g); c.quadraticCurveTo(0, g + 3, 24, g); c.stroke();
        }
        c.restore();
        c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
        pts.forEach(function (p) { P2.circ(c, p[0], p[1], 4, '#94a3b8', O, 1.8); });
      } else {
        // red cerrada atrapando (bolsa con nudo arriba; se ve lo de dentro)
        var sq = 1 + Math.sin(t * 18) * 0.04;
        c.scale(sq, 1 / sq);
        c.beginPath(); c.ellipse(0, 2, 24, 22, 0, 0, TAU);
        c.fillStyle = 'rgba(240,253,244,0.22)'; c.fill();
        c.save(); c.clip();
        c.strokeStyle = 'rgba(244,239,230,0.95)'; c.lineWidth = 2;
        for (var d = -48; d <= 48; d += 9) {
          c.beginPath(); c.moveTo(d - 24, -22); c.lineTo(d + 24, 26); c.stroke();
          c.beginPath(); c.moveTo(d + 24, -22); c.lineTo(d - 24, 26); c.stroke();
        }
        c.restore();
        P2.elli(c, 0, 2, 24, 22, null, O, 2.5);
        P2.poly(c, [[-6, -22], [6, -22], [3, -28], [-3, -28]], '#e7dcc4', O, 2);
        P2.circ(c, 0, -30, 4, '#e7dcc4', O, 2);
        [[-20, 14], [20, 14], [-12, 22], [12, 22]].forEach(function (p) { P2.circ(c, p[0], p[1], 3.5, '#94a3b8', O, 1.5); });
      }
    });
  };

  P2.fn.jetpack = function (c, x, piesY, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), f = (o.facing === -1) ? -1 : 1, fl = Math.max(0, Math.min(1, num(o.llama, 0))), t = now();
      c.translate(num(x, 0), num(piesY, 0)); c.scale(f * s, s);
      // a la espalda del héroe (torso de -30 a 0 en los pies; la espalda en x ≈ -15)
      var bx = -22, by = -44;
      if (fl > 0.01) {
        [bx - 5, bx + 6].forEach(function (fx, i) {
          var len = (12 + 22 * fl) * (0.85 + 0.15 * Math.sin(t * 30 + i * 2));
          c.save(); c.globalAlpha = 0.4; P2.elli(c, fx, by + 34 + len * 0.45, 7, len * 0.55, '#fdba74', null); c.restore();
          P2.poly(c, [[fx - 4.5, by + 31], [fx, by + 31 + len], [fx + 4.5, by + 31]], '#fb923c', O, 1.5);
          P2.poly(c, [[fx - 2.2, by + 31], [fx, by + 31 + len * 0.6], [fx + 2.2, by + 31]], '#fde047', null);
        });
      }
      [bx - 5, bx + 6].forEach(function (fx) {
        P2.rf(c, fx - 4, by + 26, 8, 6, 2, '#475569', O, 1.8);
        P2.rf(c, fx - 6, by, 12, 28, 6, '#cbd5e1', O, 2.2);
        P2.rf(c, fx - 3.5, by + 4, 2.5, 18, 1.2, 'rgba(255,255,255,0.65)', null);
      });
      P2.rf(c, bx - 12, by + 9, 24, 7, 3, '#3b82f6', O, 2);
      P2.circ(c, bx, by + 12.5, 2.5, '#22d3ee', O, 1.2);
      // correa sobre el hombro
      c.strokeStyle = O; c.lineWidth = 4.5; c.beginPath(); c.moveTo(bx + 8, by + 8); c.lineTo(-4, by + 16); c.stroke();
      c.strokeStyle = '#3b82f6'; c.lineWidth = 2.5; c.stroke();
    });
  };

  // ===========================================================================
  //  DRON ESPÍA (pista de la Parte 3)  dronEspia(c, x, y, {scale, t, escaneando, angle})
  //  angle (opcional): dirección del rayito de escaneo (por defecto, hacia abajo).
  // ===========================================================================
  P2.fn.dronEspia = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), t = num(o.t, now()), ang = num(o.angle, PI / 2);
      c.translate(num(x, 0), num(y, 0) + Math.sin(t * 5) * 1.5); c.scale(s, s);
      if (o.escaneando) {
        var fl = 0.5 + 0.5 * Math.sin(t * 25);
        c.save(); c.rotate(ang - PI / 2);
        c.globalAlpha = 0.18 + 0.12 * fl;
        c.fillStyle = '#a7f3d0';
        c.beginPath(); c.moveTo(0, 4); c.lineTo(-22, 70); c.lineTo(22, 70); c.closePath(); c.fill();
        c.globalAlpha = 0.6;
        var ly = 10 + mod(t * 90, 58);
        c.strokeStyle = '#6ee7b7'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(-ly * 0.33, ly + 4); c.lineTo(ly * 0.33, ly + 4); c.stroke();
        c.restore();
      }
      // hélice
      c.save(); c.globalAlpha = 0.55;
      P2.elli(c, 0, -8, 9 * Math.abs(Math.cos(t * 30)) + 2, 1.6, '#cbd5e1', null);
      c.restore();
      P2.line(c, 0, -4, 0, -8, O, 1.6);
      // cuerpecito
      P2.elli(c, 0, 0, 7, 5, '#3f4658', O, 1.8);
      P2.rf(c, -9, -1, 4, 2.5, 1, '#3f4658', O, 1);
      P2.rf(c, 5, -1, 4, 2.5, 1, '#3f4658', O, 1);
      P2.circ(c, 0, 1, 2.6, o.escaneando ? '#6ee7b7' : '#94a3b8', O, 1);
      P2.circ(c, 0.8, 0.3, 0.8, '#ffffff', null);
    });
  };

  // ===========================================================================
  //  GEMA DEL PODER  gemaPoder(c, x, y, {scale, t, rota})
  //  rota 0..1: se agrieta (0–0.6), tiembla (0.4–0.75) y estalla en estrellas (0.7–1).
  // ===========================================================================
  var GEM_PTS = [[0, -16], [11, -6], [8, 13], [-8, 13], [-11, -6]];
  var CRACKS = [[[0, -16], [-2, -8], [3, -2], [-1, 6]], [[11, -6], [4, -3], [5, 4], [1, 9]], [[-11, -6], [-4, -1], [-6, 7]], [[3, -2], [8, 1]], [[-2, -8], [-7, -9]]];
  P2.fn.gemaPoder = function (c, x, y, o) {
    o = o || {};
    safe(c, function () {
      var s = num(o.scale, 1), t = num(o.t, now()), rota = Math.max(0, Math.min(1, num(o.rota, 0)));
      c.translate(num(x, 0), num(y, 0)); c.scale(s, s);
      var gemA = (P2.PAL && P2.PAL.gem && P2.PAL.gem.A) || '#e11d48', gemB = (P2.PAL && P2.PAL.gem && P2.PAL.gem.B) || '#a21caf';
      var boom = rota > 0.7 ? (rota - 0.7) / 0.3 : 0;
      // estallido de estrellas
      if (boom > 0) {
        c.save(); c.globalAlpha = (1 - boom) * 0.55; P2.circ(c, 0, 0, 10 + boom * 34, '#ffd1e8', null);
        c.globalAlpha = (1 - boom) * 0.9; P2.circ(c, 0, 0, 6 + boom * 14, '#ffffff', null); c.restore();
        for (var i = 0; i < 10; i++) {
          var a = i * TAU / 10 + 0.3, d = 6 + boom * 58 * (0.7 + 0.3 * hash(i));
          c.save(); c.globalAlpha = 1 - boom * 0.85;
          P2.poly(c, starPts(Math.cos(a) * d, Math.sin(a) * d, 6 * (1 - boom * 0.4), 2.6, 5, boom * 3 + i), i % 2 ? '#fde68a' : '#fbcfe8', O, 1.5);
          c.restore();
        }
        for (var j = 0; j < 6; j++) {   // trocitos de cristal
          var a2 = j * TAU / 6, d2 = boom * 40;
          c.save(); c.globalAlpha = 1 - boom;
          c.translate(Math.cos(a2) * d2, Math.sin(a2) * d2 + boom * boom * 20); c.rotate(boom * 6 + j);
          P2.poly(c, [[0, -4], [3.5, 2], [-3, 3]], j % 2 ? gemA : gemB, O, 1.2);
          c.restore();
        }
        if (boom >= 1) return;
      }
      var shake = (rota > 0.4 && rota <= 0.75) ? Math.sin(t * 60) * 2 * (rota - 0.4) / 0.35 : 0;
      c.translate(shake, 0);
      var pulse = 1 + Math.sin(t * 4) * 0.05;
      var sc = pulse * (1 - boom);
      c.scale(sc, sc);
      // halo
      c.save(); c.globalAlpha = 0.35 + 0.1 * Math.sin(t * 4);
      var rg = c.createRadialGradient(0, 0, 2, 0, 0, 30);
      rg.addColorStop(0, 'rgba(251,113,133,0.9)'); rg.addColorStop(1, 'rgba(162,28,175,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill(); c.restore();
      // cuerpo facetado
      var g = c.createLinearGradient(-10, -16, 10, 13);
      g.addColorStop(0, gemA); g.addColorStop(1, gemB);
      P2.poly(c, GEM_PTS, g, '#4c0519', 2.5);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.moveTo(0, -16); c.lineTo(11, -6); c.lineTo(0, -4); c.closePath(); c.fill();
      c.fillStyle = 'rgba(60,0,40,0.2)';
      c.beginPath(); c.moveTo(0, -4); c.lineTo(8, 13); c.lineTo(-8, 13); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-11, -6); c.lineTo(0, -4); c.lineTo(11, -6); c.moveTo(0, -4); c.lineTo(0, 13); c.moveTo(0, -16); c.lineTo(0, -4); c.stroke();
      P2.poly(c, [[-4, -11], [-1, -11], [-5, -4]], 'rgba(255,255,255,0.85)', null);
      sparkle(c, 7, -12, 4, '#ffffff', 0.5 + 0.5 * Math.sin(t * 6));
      // grietas
      if (rota > 0) {
        var nC = Math.min(CRACKS.length, Math.ceil(rota / 0.6 * CRACKS.length));
        c.strokeStyle = '#fff7fb'; c.lineWidth = 1.6;
        for (var q = 0; q < nC; q++) {
          var cr = CRACKS[q];
          c.beginPath(); c.moveTo(cr[0][0], cr[0][1]);
          for (var m = 1; m < cr.length; m++) c.lineTo(cr[m][0], cr[m][1]);
          c.stroke();
        }
        if (rota > 0.45) {
          c.save(); c.globalAlpha = (rota - 0.45) * 1.6; P2.poly(c, GEM_PTS, '#fff1f2', null); c.restore();
        }
      }
    });
  };
})();
