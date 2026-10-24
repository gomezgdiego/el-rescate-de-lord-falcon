// ============================================================================
// ui.js — Interfaz de "El Rescate de Lord Falcon"
// Escenas: title, story, levelDone, gameover, credits
// Helpers de HUD: drawHearts, drawBossBar, hint, drawPause
// Sin dependencias, sin assets externos. Todo dibujado por codigo (Canvas 2D).
// Cumple el CONTRATO TECNICO congelado. Solo asigna a window.G en carga;
// ninguna llamada entre-modulos fuera de funciones que corren tras el boot.
// ============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;

  // ---- Constantes visuales locales (no dependemos de nada externo) ----
  var W = 960, H = 540;
  var OUTLINE = '#1a1a2e';
  var CREAM = '#fef3c7';
  var GOLD = '#fbbf24';
  var GOLD_DARK = '#d97706';
  var CYAN = '#22d3ee';

  // ---- Helpers de dibujo locales (privados de este archivo) ----

  // Rectangulo redondeado (fallback propio, no asumimos ctx.roundRect).
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Texto con contorno grueso (estilo cartoon) centrado en (x,y).
  function outlinedText(ctx, txt, x, y, size, fill, outline, lineW, align) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = lineW || Math.max(3, size * 0.14);
    ctx.strokeStyle = outline || OUTLINE;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill || '#ffffff';
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  // Texto simple centrado (sin contorno) para lineas menores.
  function plainText(ctx, txt, x, y, size, fill, align, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fill || '#ffffff';
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  // Envuelve un texto largo en varias lineas segun ancho maximo (px).
  function wrapText(ctx, txt, maxWidth, size, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    var words = String(txt).split(' ');
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = words[i];
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }

  // Fondo de menu bonito (degradado atardecer + estrellas suaves) para
  // title / story / etc cuando no hay un fondo de gfx especifico.
  function drawMenuBackdrop(ctx, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1a4a');
    g.addColorStop(0.5, '#5b21b6');
    g.addColorStop(1, '#7c2d12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Estrellitas deterministas (parpadeo suave con t).
    ctx.save();
    for (var i = 0; i < 60; i++) {
      var sx = (i * 137.5) % W;
      var sy = (i * 79.3) % (H * 0.7);
      var tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      ctx.globalAlpha = 0.25 + 0.55 * tw;
      ctx.fillStyle = '#fef9c3';
      var r = 1 + (i % 3) * 0.6;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Llamadas seguras a G.gfx (por si el modulo aun no cargo en algun caso raro).
  function gfxCall(name) {
    var fn = G.gfx && G.gfx[name];
    if (typeof fn !== 'function') return false;
    try {
      fn.apply(G.gfx, Array.prototype.slice.call(arguments, 1));
    } catch (e) { /* nunca romper el render */ }
    return true;
  }

  // Sonido seguro.
  function sfx(name) { if (G.audio && G.audio.sfx) { try { G.audio.sfx(name); } catch (e) {} } }
  function music(name) { if (G.audio && G.audio.music) { try { G.audio.music(name); } catch (e) {} } }

  // Tiempo global seguro.
  function now() { return (typeof G.T === 'number') ? G.T : (Date.now() / 1000); }

  // Entrada de MENU/DIALOGO: un menu lo maneja UNA sola persona, aunque el
  // juego este en modo 2 jugadores. En co-op las flechas son del Jugador 2,
  // asi que si el menu solo leyera al Jugador 1 (WASD) se quedaria "congelado"
  // para quien navega con flechas. Combinamos ambos mandos. G.input2.pressed
  // devuelve false en 1 jugador, por lo que esto es identico a como fue siempre.
  function menuPressed(action) {
    var a = (G.input && G.input.pressed) ? G.input.pressed(action) : false;
    var b = (G.input2 && G.input2.pressed) ? G.input2.pressed(action) : false;
    return !!a || !!b;
  }
  // Igual que menuPressed, pero "mantenido" (cualquiera de los dos jugadores o el OK tactil).
  function menuHeld(action) {
    var a = (G.input && G.input.held) ? G.input.held(action) : false;
    var b = (G.input2 && G.input2.held) ? G.input2.held(action) : false;
    return !!a || !!b;
  }

  // ==========================================================================
  // HELPERS DE HUD (G.ui.*)
  // ==========================================================================
  G.ui = G.ui || {};

  // Mensaje de Juanjo (lo escribió él mismo el 13-oct-2026). Texto EXACTO: no se
  // cambia. Sale al final de los créditos de la Parte 1 y de la Parte 2.
  G.MENSAJE_JUANJO = {
    texto: 'Hola, papi y hermanos: muchas gracias por enseñarme a usar la IA, a que me guste el deporte y a jugar con mis hermanos. Los adoro. Espero que puedas enseñarles a mis hermanos como a mí. Te amo.',
    lineas: ['Hola, papi y hermanos:', 'muchas gracias por enseñarme a usar la IA,', 'a que me guste el deporte',
      'y a jugar con mis hermanos.', 'Los adoro.', 'Espero que puedas enseñarles a mis hermanos', 'como a mí.', 'Te amo.'],
    firma: '— Juanjo (10 años)'
  };
  // Líneas de créditos con el mensaje (las usan las dos escenas de créditos).
  G.ui.lineasMensajeJuanjo = function (gold, texto, firmaCol, gapFinal) {
    var M = G.MENSAJE_JUANJO, out = [{ t: '- Un mensaje de Juanjo -', size: 24, color: gold, gap: 22 }];
    for (var i = 0; i < M.lineas.length; i++) {
      out.push({ t: M.lineas[i], size: 24, color: texto, gap: i === M.lineas.length - 1 ? 16 : 8 });
    }
    out.push({ t: M.firma, size: 24, color: firmaCol, gap: (typeof gapFinal === 'number') ? gapFinal : 60 });
    return out;
  };

  // Dibuja UN banco de corazones (medios corazones) en la fila superior.
  // hp/maxHp: valores en medios corazones. rightAlign: si true, se ancla
  // a la esquina superior-derecha y los corazones se ordenan de forma
  // espejada (el corazon 0, primero en vaciarse, queda mas hacia el centro).
  // label: etiqueta pequenia (P1/P2) que se dibuja junto al banco (o null).
  function drawHeartBank(ctx, hp, maxHp, rightAlign, label) {
    hp = Math.max(0, hp | 0);
    maxHp = Math.max(2, maxHp | 0);
    var total = Math.ceil(maxHp / 2); // numero de corazones enteros (5)
    var size = 30;
    var gap = 6;
    var y0 = 16;
    var cy = y0 + size / 2;
    for (var i = 0; i < total; i++) {
      // Posicion del corazon i. En modo derecha se cuenta desde el borde
      // derecho hacia dentro, manteniendo la logica de vaciado (i=0 primero).
      var cx;
      if (rightAlign) {
        cx = W - 16 - i * (size + gap) - size / 2;
      } else {
        cx = 16 + i * (size + gap) + size / 2;
      }
      // Cada corazon vale 2 medios. Determina fill.
      var val = hp - i * 2; // 2 = full, 1 = half, <=0 = empty
      var fill = val >= 2 ? 'full' : (val === 1 ? 'half' : 'empty');
      if (!gfxCall('drawHeart', ctx, cx, cy, size, fill)) {
        // Fallback minimal si gfx no existe.
        ctx.save();
        ctx.fillStyle = fill === 'empty' ? '#4b5563' : '#ef4444';
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 3;
        roundRect(ctx, cx - size / 2, cy - size / 2, size, size, 6);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
    // Etiqueta pequenia P1/P2 debajo del banco (solo en co-op).
    if (label) {
      var lblY = y0 + size + 12;
      if (rightAlign) {
        outlinedText(ctx, label, W - 16, lblY, 15, CREAM, OUTLINE, 3, 'right');
      } else {
        outlinedText(ctx, label, 16, lblY, 15, CREAM, OUTLINE, 3, 'left');
      }
    }
  }

  // Corazones arriba-izquierda usando G.state.hp/maxHp (medios corazones).
  // En co-op tambien dibuja los de P2 arriba-derecha (espejados) con
  // etiquetas pequenias P1/P2. En 1 jugador es identico a como fue siempre.
  G.ui.drawHearts = function (ctx) {
    var st = G.state || { hp: 10, maxHp: 10 };
    var coop = !!st.coop;
    // P1: arriba-izquierda (con etiqueta solo en co-op).
    drawHeartBank(ctx, st.hp, st.maxHp, false, coop ? 'P1' : null);
    // P2: arriba-derecha espejado (solo en co-op).
    if (coop) {
      var hp2 = (typeof st.hp2 === 'number') ? st.hp2 : 0;
      var maxHp2 = (typeof st.maxHp2 === 'number') ? st.maxHp2 : 10;
      drawHeartBank(ctx, hp2, maxHp2, true, 'P2');
    }
  };

  // Barra del jefe segmentada, abajo-centro. frac 0..1, nombre = etiqueta.
  G.ui.drawBossBar = function (ctx, frac, nombre) {
    frac = Math.max(0, Math.min(1, frac || 0));
    var barW = 560, barH = 26;
    var x = (W - barW) / 2;
    var y = H - 52;
    ctx.save();
    // Nombre encima.
    if (nombre) {
      outlinedText(ctx, nombre, W / 2, y - 16, 20, '#fecaca', '#7f1d1d', 4, 'center');
    }
    // Marco.
    ctx.fillStyle = 'rgba(15,10,25,0.82)';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 4, y - 4, barW + 8, barH + 8, 10);
    ctx.fill(); ctx.stroke();
    // Relleno con degradado rojo.
    var fillW = barW * frac;
    if (fillW > 0) {
      var g = ctx.createLinearGradient(x, y, x + barW, y);
      g.addColorStop(0, '#f97316');
      g.addColorStop(0.5, '#ef4444');
      g.addColorStop(1, '#b91c1c');
      ctx.fillStyle = g;
      roundRect(ctx, x, y, fillW, barH, 6);
      ctx.fill();
    }
    // Segmentos (12 divisiones para el jefe final).
    var segs = 12;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for (var i = 1; i < segs; i++) {
      var sx = x + (barW / segs) * i;
      ctx.beginPath();
      ctx.moveTo(sx, y + 2);
      ctx.lineTo(sx, y + barH - 2);
      ctx.stroke();
    }
    // Brillo superior.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, x, y + 2, barW, barH * 0.4, 5);
    ctx.fill();
    ctx.restore();
  };

  // Burbuja de pista (hint) arriba-centro con texto.
  // Se dibuja en la PARTE SUPERIOR para no tapar la zona baja donde se juega.
  // Mismo estilo visual; solo cambia la posicion.
  // Cabeza de Dark Secuaz BUENO dentro de un circulo de 18 px (pistas de la Parte 3).
  function drawHintSecuaz(ctx, cx, cy) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#14532d';
    ctx.fill();
    ctx.save();
    ctx.clip();
    var ok = false;
    try {
      if (window.P2 && typeof window.P2.call === 'function') {
        // CONTRATO: §8.7 dice scale 0.16, pero a esa escala se ve el cuerpo entero diminuto;
        // con 0.3 y los pies más abajo, la CABEZA llena el círculo (que es lo que pide el contrato).
        ok = !!window.P2.call('secuaz', ctx, cx, cy + 46, { scale: 0.3, good: true });
      }
    } catch (e) { ok = false; }
    if (!ok) {
      // Respaldo: carita verde con dos ojos.
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.arc(cx, cy + 2, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx - 5, cy - 1, 3.4, 0, Math.PI * 2); ctx.arc(cx + 5, cy - 1, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = OUTLINE;
      ctx.beginPath(); ctx.arc(cx - 4.5, cy - 1, 1.6, 0, Math.PI * 2); ctx.arc(cx + 5.5, cy - 1, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Parte 3 (contrato §8.7): tercer parametro opcional opts.
  //   opts.cara === 'secuaz' → deja 44 px mas a la izquierda y dibuja dentro la
  //   cabeza de Dark Secuaz bueno; opts.nota (texto) sustituye a la nota del co-op
  //   (opts.nota === false la quita). Ampliado en la QA: opts.y (número o 'abajo') y
  //   opts.evitar ({x, y, w, h} o lista: si se cruza, fondo a alfa 0,5 —u opts.alfa— y
  //   texto a 0,9). Devuelve la caja {x, y, w, h, tapa}.
  //   Sin opts, todo queda IDENTICO.
  G.ui.hint = function (ctx, texto, opts) {
    if (!texto) return;
    var cara = !!(opts && opts.cara === 'secuaz');
    var faceW = cara ? 44 : 0;
    ctx.save();
    var size = 20;
    ctx.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    // Zona util centrada entre x=250 y x=710 para no tapar los corazones
    // (arriba-izquierda). El ancho de envoltura se limita a esa banda.
    var zoneL = 250, zoneR = 710;
    var zoneCx = (zoneL + zoneR) / 2;
    var maxLineW = (zoneR - zoneL) - 44 - faceW; // deja hueco para el padding (y la cara)
    var lines = wrapText(ctx, texto, maxLineW, size);
    var lineH = size * 1.25;
    var padX = 22, padY = 14;
    var textW = 0;
    for (var i = 0; i < lines.length; i++) {
      textW = Math.max(textW, ctx.measureText(lines[i]).width);
    }
    // En co-op los hints mencionan las teclas de 1 jugador (J/K/H); recordamos
    // debajo el mapeo de cada jugador para no confundir a nadie.
    var coopNote = (G.state && G.state.coop) ? 'En 2J — P1: F ataque · G disparo · R hackear | P2: K · L · Ñ' : null;
    if (opts && typeof opts.nota === 'string' && opts.nota) { coopNote = opts.nota; }
    if (opts && opts.nota === false) { coopNote = null; }   // la escena ya no quiere la nota (p. ej., pasados unos segundos)
    var noteSize = 14;
    var noteW = 0;
    if (coopNote) {
      ctx.font = 'bold ' + noteSize + 'px system-ui, "Segoe UI", Arial, sans-serif';
      noteW = ctx.measureText(coopNote).width;
      ctx.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
    }
    var boxW = Math.max(textW, noteW) + padX * 2 + faceW;
    var boxH = lines.length * lineH + padY * 2 + (coopNote ? noteSize * 1.5 : 0);
    // Centrada en la banda segura; borde superior a y~64 (debajo de los corazones).
    var bx = zoneCx - boxW / 2;
    var by = 64;
    if (cara) {
      boxH = Math.max(boxH, 64);
      // El texto se centra en lo que queda a la derecha de la cara.
      zoneCx = bx + faceW + (boxW - faceW) / 2;
    }
    // Parte 3 (QA ronda 1): opts.y = número (borde superior) o 'abajo' (sobre el borde
    // inferior); opts.evitar = {x, y, w, h} (o una lista) en px de pantalla: si toca la
    // burbuja, la burbuja se vuelve casi transparente para que se vea lo que hay detrás.
    if (opts && typeof opts.y === 'number' && isFinite(opts.y)) {
      by = Math.max(0, Math.min(H - boxH - 4, opts.y));
    } else if (opts && opts.y === 'abajo') {
      by = H - boxH - 18;
    }
    var tapa = false;
    if (opts && opts.evitar) {
      var ev = Array.isArray(opts.evitar) ? opts.evitar : [opts.evitar];
      for (var e = 0; e < ev.length; e++) {
        var r = ev[e];
        if (!r || !isFinite(r.x) || !isFinite(r.y) || !isFinite(r.w) || !isFinite(r.h)) continue;
        if (r.x < bx + boxW && r.x + r.w > bx && r.y < by + boxH && r.y + r.h > by) { tapa = true; break; }
      }
    }
    // QA ronda 2 (pedido de motor): con 0,35 todo, el texto casi no se leía. Ahora el fondo
    // baja a 0,5 (se ve lo que hay detrás) y el texto se queda en 0,9 (se sigue leyendo).
    // opts.alfa (0..1) cambia el alfa del fondo. El contrato de la API no cambia.
    var alfa0 = ctx.globalAlpha;
    var alfaFondo = (opts && typeof opts.alfa === 'number' && isFinite(opts.alfa)) ? Math.max(0, Math.min(1, opts.alfa)) : 0.5;
    if (tapa) { ctx.globalAlpha = alfa0 * alfaFondo; }
    // Sombra suave.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, bx + 3, by + 4, boxW, boxH, 14);
    ctx.fill();
    // Cuerpo.
    ctx.fillStyle = 'rgba(30,20,55,0.92)';
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    roundRect(ctx, bx, by, boxW, boxH, 14);
    ctx.fill(); ctx.stroke();
    if (tapa) { ctx.globalAlpha = alfa0 * 0.9; }
    if (cara) { drawHintSecuaz(ctx, bx + 32, by + boxH / 2); }
    // Texto (centrado en la banda segura, mismo centro que la caja).
    ctx.fillStyle = CREAM;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], zoneCx, by + padY + lineH / 2 + j * lineH);
    }
    if (coopNote) {
      ctx.font = 'bold ' + noteSize + 'px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = CYAN;
      ctx.fillText(coopNote, zoneCx, by + padY + lines.length * lineH + noteSize * 0.75);
    }
    ctx.restore();
    return { x: bx, y: by, w: boxW, h: boxH, tapa: tapa };
  };

  // Overlay de pausa (lo pinta core tras el render de la escena si G.paused).
  G.ui.drawPause = function (ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,20,0.62)';
    ctx.fillRect(0, 0, W, H);
    outlinedText(ctx, 'PAUSA', W / 2, H / 2 - 24, 72, GOLD, OUTLINE, 8, 'center');
    plainText(ctx, 'P para seguir  ·  M silencio', W / 2, H / 2 + 44, 24, CREAM);
    ctx.restore();
  };

  // ==========================================================================
  // ESCENA: title (portada + menu navegable)
  // ==========================================================================
  (function () {
    // Estructura del menu principal.
    var MAIN = [
      { key: 'play', label: 'Jugar' },
      { key: 'part', label: 'Aventura: Parte 1' },   // Parte 2 (contrato §9)
      { key: 'players', label: 'Jugadores: 1' },
      { key: 'chapters', label: 'Elegir capítulo' },
      { key: 'howto', label: 'Cómo jugar' },
      { key: 'erase', label: 'Borrar progreso' },
      { key: 'disenos', label: 'Diseños de Juanjo' }   // Parte 3 (contrato §8.7): solo visible con la Parte 3
    ];

    // ¿Se puede usar el modo cooperativo? Solo tras rescatar a Falcon.
    function coopUnlocked() {
      return !!(G.state && G.state.falconRescued);
    }

    // Alterna el modo cooperativo (1<->2 jugadores) y lo persiste.
    // Si Falcon aun no ha sido rescatado, no permite activarlo y da una pista.
    function togglePlayers() {
      if (!coopUnlocked()) {
        // Bloqueado: forzar 1 jugador y mostrar pista motivadora.
        if (G.state) { G.state.coop = false; }
        if (G.saveState) { try { G.saveState(); } catch (e) {} }
        sfx('clink');
        coopHint = 'Rescata a Lord Falcon para jugar en equipo';
        coopHintT = now();
        return;
      }
      if (G.state) { G.state.coop = !G.state.coop; }
      if (G.saveState) { try { G.saveState(); } catch (e) {} }
      sfx('select');
    }

    // Etiqueta dinamica del item "Jugadores" segun G.state.coop / bloqueo.
    function playersLabel() {
      if (!coopUnlocked()) { return 'Jugadores: 1  🔒'; }
      return 'Jugadores: ' + ((G.state && G.state.coop) ? '2' : '1');
    }

    // --- Parte 2 (añadido, contrato §9): elegir Parte 1 / Parte 2 ---
    // ¿Está la Parte 2 desbloqueada? (al rescatar a Falcon o con su código)
    function p2ok() {
      try { return !!(G.p2 && G.p2available && G.p2available()); } catch (e) { return false; }
    }
    // --- Parte 3 (añadido, contrato §8.7). Toda llamada a la Parte 3 va
    // comprobada y envuelta: un fallo aquí no puede romper la portada. ---
    function p3ok() {
      try { return !!(G.p3 && typeof G.p3available === 'function' && G.p3available()); } catch (e) { return false; }
    }
    function isPart3() { return p3ok() && !!G.p3 && G.p3.chosen === true; }
    function p3save() { if (typeof G.p3save === 'function') { try { G.p3save(); } catch (e) {} } }
    // ¿Está elegida la Parte 2? (solo si además está desbloqueada y no está elegida la 3)
    function isPart2() { return p2ok() && G.p2.part === 2 && !isPart3(); }
    function p2save() { try { if (G.p2save) G.p2save(); } catch (e) {} }
    function currentPart() { return isPart3() ? 3 : (isPart2() ? 2 : 1); }
    function partLabel() {
      if (!p2ok()) { return 'Aventura: Parte 1  🔒'; }
      return 'Aventura: Parte ' + currentPart();
    }
    // Elige la Parte n (1, 2 o 3) y guarda las dos (contrato §8.7).
    function setPart(n) {
      if (G.p2) { G.p2.part = (n === 1) ? 1 : 2; }
      if (G.p3) {
        try { G.p3.chosen = (n === 3); } catch (e) {}
      }
      p2save();
      p3save();
    }
    // Cicla Parte 1 → 2 → 3 → 1 (dir = +1) o al revés (dir = -1), solo por las
    // disponibles (bloqueado con pista si no hay otra).
    function togglePart(dir) {
      if (!p2ok()) {
        sfx('clink');
        coopHint = 'Termina la Parte 1 para desbloquear la Parte 2';
        coopHintT = now();
        return;
      }
      var parts = p3ok() ? [1, 2, 3] : [1, 2];
      var i = parts.indexOf(currentPart());
      if (i < 0) { i = 0; }
      var n = parts[(i + (dir === -1 ? parts.length - 1 : 1)) % parts.length];
      setPart(n);
      sfx('select');
      // Pista si la Parte 3 aún está bloqueada (al dar la vuelta 2 → 1).
      if (!p3ok() && dir !== -1 && n === 1) {
        coopHint = 'Termina la Parte 2 para desbloquear la Parte 3';
        coopHintT = now();
      }
    }
    // El ítem "Diseños de Juanjo" solo existe con la Parte 3 elegida.
    function itemVisible(i) {
      return !!MAIN[i] && (MAIN[i].key !== 'disenos' || isPart3());
    }
    function p3unlocked() {
      var u = 1;
      try { u = (G.p3 && G.p3.unlocked) ? (G.p3.unlocked | 0) : 1; } catch (e) { u = 1; }
      return Math.max(1, Math.min(5, u));
    }
    function p3launch(n) {
      sfx('select');
      if (typeof G.p3launch === 'function') { try { G.p3launch(n); } catch (e) {} }
    }
    // Índice de un ítem del menú principal por su clave.
    function keyIndex(k) {
      for (var i = 0; i < MAIN.length; i++) { if (MAIN[i].key === k) return i; }
      return 0;
    }
    function p2unlocked() {
      var u = (G.p2 && G.p2.unlocked) ? (G.p2.unlocked | 0) : 1;
      return Math.max(1, Math.min(5, u));
    }
    function p2launch(n) {
      sfx('select');
      if (typeof G.p2launch === 'function') { G.p2launch(n); }
    }
    var howtoPage = 0;   // "Cómo jugar": 0 = controles, 1 = armas de la Parte 2

    // Estado de la escena (todo se reinicia en enter()).
    var view = 'main';   // 'main' | 'chapters' | 'howto' | 'erase'
    var sel = 0;         // indice seleccionado en la vista actual
    var t0 = 0;          // tiempo de entrada (para animaciones)
    var coopHint = '';   // pista temporal al intentar activar 2J bloqueado
    var coopHintT = -99; // tiempo en que se mostro la pista

    // --- Codigo secreto "HACKER" (Rule 2) ---
    // Secuencia de 7 direcciones: abajo, arriba, arriba, abajo, arriba, arriba, arriba.
    var SECRET = ['down', 'up', 'up', 'down', 'up', 'up', 'up'];
    var secretBuf = [];        // buffer rodante de las ultimas direcciones
    var secretMsg = false;     // ¿mostrando el overlay del mensaje de Papa?
    var secretMsgT = 0;        // tiempo de aparicion del overlay

    function enter() {
      view = 'main';
      sel = 0;
      t0 = now();
      secretBuf = [];
      secretMsg = false;
      howtoPage = 0;
      coopHint = '';
      coopHintT = -99;
      music('title');
    }

    // Registra una direccion en el buffer y comprueba si se completo el codigo.
    function pushSecret(dir) {
      secretBuf.push(dir);
      if (secretBuf.length > SECRET.length) { secretBuf.shift(); }
      if (secretBuf.length === SECRET.length) {
        for (var i = 0; i < SECRET.length; i++) {
          if (secretBuf[i] !== SECRET[i]) { return; }
        }
        activarHackeo();
      }
    }

    // Activa el codigo secreto: desbloquea TODO (Parte 1, co-op y Parte 2; el
    // unico codigo del juego, decision de Papa) y muestra el mensaje de Papa.
    function activarHackeo() {
      if (G.state) {
        G.state.unlocked = 5;
        G.state.falconRescued = true;
      }
      if (G.saveState) { try { G.saveState(); } catch (e) {} }
      if (G.p2) {
        G.p2.unlocked = 5;
        if (typeof G.p2save === 'function') { try { G.p2save(); } catch (e) {} }
      }
      // Parte 3 (contrato §8.7): el mismo código también la desbloquea entera.
      if (typeof G.p3secretUnlock === 'function') { try { G.p3secretUnlock(); } catch (e) {} }
      sfx('victory');
      secretMsg = true;
      secretMsgT = now();
      secretBuf = [];
    }

    function launchChapter(n) {
      var flow = G.flow || {};
      var chapters = flow.chapters || {};
      var c = chapters[n];
      if (!c) { return; }
      sfx('select');
      if (c.story) {
        G.go('story', { id: c.story, next: c.scene });
      } else {
        G.go(c.scene || 'title');
      }
    }

    function update() {
      var up = menuPressed('up');
      var down = menuPressed('down');
      var left = menuPressed('left');
      var right = menuPressed('right');
      var confirm = menuPressed('confirm');
      var back = menuPressed('pause'); // Escape/P para volver de submenus

      // Codigo secreto: solo se escucha en la vista principal del titulo.
      // Alimentamos el buffer con cada flanco de arriba/abajo. La navegacion
      // normal del menu sigue funcionando igual (mas abajo).
      if (view === 'main' && !secretMsg) {
        if (down) { pushSecret('down'); }
        if (up) { pushSecret('up'); }
      }

      // Si el mensaje especial esta visible (incluido el frame en que se
      // acaba de activar el codigo), absorbe la entrada: se cierra con
      // confirmar (Enter) o toque, y volvemos al titulo normal.
      if (secretMsg) {
        if (confirm) { sfx('select'); secretMsg = false; }
        return;
      }

      if (view === 'main') {
        // Si el ítem elegido se ha ocultado (se cambió de Parte), vuelve a "Aventura".
        if (!itemVisible(sel)) { sel = keyIndex('part'); }
        // Arriba/abajo saltan los ítems ocultos ("Diseños de Juanjo" sin la Parte 3).
        if (up) {
          sel = (sel + MAIN.length - 1) % MAIN.length;
          while (!itemVisible(sel)) { sel = (sel + MAIN.length - 1) % MAIN.length; }
          sfx('select');
        }
        if (down) {
          sel = (sel + 1) % MAIN.length;
          while (!itemVisible(sel)) { sel = (sel + 1) % MAIN.length; }
          sfx('select');
        }
        // En el item "Jugadores", izquierda/derecha alterna 1<->2.
        if (MAIN[sel].key === 'players' && (left || right)) { togglePlayers(); }
        // En el item "Aventura", derecha = Parte siguiente, izquierda = anterior.
        if (MAIN[sel].key === 'part' && (left || right)) { togglePart(left ? -1 : 1); }
        if (confirm) {
          var opt = MAIN[sel];
          if (opt.key === 'play' && isPart3()) {
            p3launch(Math.min(p3unlocked(), 5));
          } else if (opt.key === 'disenos') {
            sfx('select');
            if (G.scenes && G.scenes.disenosJuanjo) { G.go('disenosJuanjo'); }
          } else if (opt.key === 'play' && isPart2()) {
            p2launch(Math.min(p2unlocked(), 5));
          } else if (opt.key === 'play') {
            var unlocked = (G.state && G.state.unlocked) ? G.state.unlocked : 1;
            var n = Math.min(unlocked, 5);
            launchChapter(n);
          } else if (opt.key === 'part') {
            togglePart();
          } else if (opt.key === 'players') {
            togglePlayers();
          } else if (opt.key === 'chapters') {
            view = 'chapters'; sel = 0; sfx('select');
          } else if (opt.key === 'howto') {
            view = 'howto'; sfx('select');
          } else if (opt.key === 'erase') {
            view = 'erase'; sel = 1; sfx('select'); // por defecto en "No"
          }
        }
      } else if (view === 'chapters') {
        if (up) { sel = (sel + 5 - 1) % 5; sfx('select'); }
        if (down) { sel = (sel + 1) % 5; sfx('select'); }
        if (confirm) {
          var chap = sel + 1;
          var unlocked2 = (G.state && G.state.unlocked) ? G.state.unlocked : 1;
          if (isPart2()) { unlocked2 = p2unlocked(); }
          if (isPart3()) { unlocked2 = p3unlocked(); }
          if (chap <= unlocked2) {
            if (isPart3()) { p3launch(chap); } else if (isPart2()) { p2launch(chap); } else { launchChapter(chap); }
          } else {
            sfx('clink'); // bloqueado
          }
        }
        if (back) { view = 'main'; sel = keyIndex('players'); sfx('select'); }
      } else if (view === 'howto') {
        // Con la Parte 2 elegida hay una segunda pagina (armas de la Parte 2);
        // con la Parte 3, la de sus 4 heroes (G.ui3.drawHowto3).
        var page2 = isPart2() || (isPart3() && !!G.ui3 && typeof G.ui3.drawHowto3 === 'function');
        if (page2 && howtoPage === 0 && confirm) {
          howtoPage = 1; sfx('select');
        } else if (page2 && (up || down || left || right)) {
          howtoPage = howtoPage ? 0 : 1; sfx('select');
        } else if (confirm || back) { view = 'main'; sel = keyIndex('chapters'); howtoPage = 0; sfx('select'); }
      } else if (view === 'erase') {
        // Menu de confirmacion: 0 = Si, 1 = No
        if (up || down) { sel = sel === 0 ? 1 : 0; sfx('select'); }
        if (confirm) {
          if (sel === 0) {
            if (G.state) { G.state.unlocked = 1; }
            if (G.saveState) { try { G.saveState(); } catch (e) {} }
            // Parte 2: tambien vuelve a sus valores por defecto.
            if (G.p2resetAll) { try { G.p2resetAll(); } catch (e) {} }
            // Parte 3 (contrato §3): tambien (conserva los Diseños de Juanjo).
            if (typeof G.p3resetAll === 'function') { try { G.p3resetAll(); } catch (e) {} }
            sfx('hackOk');
          } else {
            sfx('select');
          }
          view = 'main'; sel = keyIndex('howto');
        }
        if (back) { view = 'main'; sel = keyIndex('howto'); sfx('select'); }
      }
    }

    // --- Parte 3 en la portada (contrato §8.7): siempre con P2.call y respaldo ---
    function p3look(k) {
      try { return (G.p3 && G.p3.look && G.p3.look[k] === 'B') ? 'B' : 'A'; } catch (e) { return 'A'; }
    }
    function p2call() {
      try {
        if (!window.P2 || typeof window.P2.call !== 'function') { return false; }
        return !!window.P2.call.apply(window.P2, arguments);
      } catch (e) { return false; }
    }
    // Robovill (diseño de Juanjo, alas abiertas) en el centro-fondo.
    function drawTitleRobovill(ctx, t) {
      var B = p3look('robovill') === 'B';
      return p2call('robovill', ctx, W / 2 + (B ? 0 : 18), H - 40 + Math.sin(t * 1.3) * 3, {
        variant: p3look('robovill'), scale: 0.62, facing: -1, alas: 'abiertas',
        brazo: ['martillo', 'sierra', 'canon', 'pinza'][Math.floor(t / 2) % 4], t: t
      });
    }
    // Mikey o Peter (cadena de respaldo del contrato §16.3: heroeP3 → *Juego → arte → cápsula).
    function drawTitleHero3(ctx, h, x, y, facing, t) {
      var v = p3look(h);
      var o = { variant: v, scale: 1.2, facing: facing, pose: 'idle', t: t };
      if (p2call('heroeP3', ctx, h, x, y, o)) { return; }
      if (h === 'mikey' && p2call('mikeyJuego', ctx, x, y, o)) { return; }
      if (h === 'peter' && p2call('peterJuego', ctx, x, y, o)) { return; }
      var alto = 68;
      try { alto = (window.P2 && window.P2.P3ALTO && window.P2.P3ALTO[h]) || 68; } catch (e) { alto = 68; }
      if (p2call(h, ctx, x, y, { variant: v, scale: 1.2 * 68 / alto, facing: facing, pose: 'idle' })) { return; }
      var col = h === 'mikey' ? '#f97316' : '#facc15';
      if (G.p3 && typeof G.p3.heroColor === 'function') { try { col = G.p3.heroColor(h); } catch (e) {} }
      ctx.save();
      ctx.fillStyle = col; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      roundRect(ctx, x - 13, y - 70, 26, 70, 13);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // --- Render de la portada ---
    function renderTitle(ctx) {
      var t = now();
      drawMenuBackdrop(ctx, t);

      // Personajes animados de fondo (parte baja).
      var bob = Math.sin(t * 2) * 4;
      var bob2 = Math.sin(t * 2 + 1.2) * 4;
      // Director a la izquierda, Falcon a la derecha, Toros al centro-fondo grande.
      // Con la Parte 2 elegida, Dark Secuaz ocupa el lugar de Dark Toros.
      // Con la Parte 3, Robovill (con el diseño elegido por Juanjo).
      var part3 = isPart3();
      var robovillDrawn = part3 && drawTitleRobovill(ctx, t);
      var secuazDrawn = robovillDrawn || (isPart2() && window.P2 && typeof window.P2.call === 'function' &&
        window.P2.call('secuaz', ctx, W / 2, H - 40 + Math.sin(t * 1.3) * 3, { scale: 1.15, angle: -0.4 + Math.sin(t * 0.9) * 0.3 }));
      if (!secuazDrawn) {
        gfxCall('drawToros', ctx, W / 2, H - 40 + Math.sin(t * 1.3) * 3, { t: t, facing: -1, pose: 'idle', scale: 1.05, shield: true });
      }
      gfxCall('drawDirector', ctx, W * 0.24, H - 66 + bob, { t: t, facing: 1, pose: 'idle', scale: 1.2 });
      gfxCall('drawFalcon', ctx, W * 0.76, H - 66 + bob2, { t: t, facing: -1, pose: 'idle', scale: 1.2 });
      if (part3) {
        drawTitleHero3(ctx, 'mikey', W * 0.09, H - 66 + bob2, 1, t);
        drawTitleHero3(ctx, 'peter', W * 0.91, H - 66 + bob, -1, t);
      }

      // Panel oscurecedor detras del logo para legibilidad.
      ctx.save();
      ctx.fillStyle = 'rgba(15,10,30,0.28)';
      ctx.fillRect(0, 40, W, 200);
      ctx.restore();

      // LOGO grande con degradado + contorno.
      var logoY = 108;
      var pulse = 1 + Math.sin(t * 2.2) * 0.02;
      ctx.save();
      ctx.translate(W / 2, logoY);
      ctx.scale(pulse, pulse);
      // Titulo principal en dos lineas para que quepa grande.
      var g = ctx.createLinearGradient(0, -46, 0, 46);
      g.addColorStop(0, '#fde68a');
      g.addColorStop(0.5, GOLD);
      g.addColorStop(1, GOLD_DARK);
      // Linea 1
      ctx.font = 'bold 58px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 10;
      ctx.strokeStyle = OUTLINE;
      ctx.strokeText('El Rescate de', 0, -34);
      ctx.fillStyle = g;
      ctx.fillText('El Rescate de', 0, -34);
      // Linea 2 (mas grande, el nombre)
      ctx.font = 'bold 72px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.lineWidth = 12;
      ctx.strokeText('LORD FALCON', 0, 30);
      ctx.fillStyle = g;
      ctx.fillText('LORD FALCON', 0, 30);
      ctx.restore();

      // Parte 2: subtitulo bajo el logo y total de medallas (arriba a la izquierda).
      if (isPart2()) {
        outlinedText(ctx, 'Parte 2: La Gema Robada', W / 2, 206, 26, '#fda4af', OUTLINE, 5, 'center');
        var medTotal = 0;
        try { medTotal = G.p2medalTotal ? G.p2medalTotal() : 0; } catch (e) { medTotal = 0; }
        if (G.ui2 && G.ui2.drawMedal) { G.ui2.drawMedal(ctx, 34, 30, 30, false, t); }
        outlinedText(ctx, 'Medallas: ' + medTotal + '/12', 56, 30, 18, CREAM, OUTLINE, 4, 'left');
      }
      // Parte 3: subtitulo bajo el logo.
      if (part3) {
        outlinedText(ctx, 'Parte 3: We Are a Team', W / 2, 206, 26, '#93c5fd', OUTLINE, 5, 'center');
      }

      // Menu principal centrado (6 items: se compactan un poco para que quepan).
      // Con la Parte 3 hay 7 (con "Diseños de Juanjo") y se compacta un poco mas.
      var mx = W / 2;
      var my = part3 ? 246 : 254;
      var step = part3 ? 36 : 41;
      var row = 0;
      for (var i = 0; i < MAIN.length; i++) {
        if (!itemVisible(i)) { continue; }   // oculto: ni se navega ni se pinta
        var isSel = (i === sel);
        var y = my + row * step;
        row++;
        // El item de jugadores muestra su etiqueta dinamica (1/2).
        var lbl = (MAIN[i].key === 'players') ? playersLabel() : MAIN[i].label;
        if (MAIN[i].key === 'part') { lbl = partLabel(); }
        drawMenuItem(ctx, lbl, mx, y, isSel, t, false);
      }

      // Pie de creditos.
      plainText(ctx, 'Creado por Juanjo (10 años) y Papá', W / 2, H - 22, 18, '#fde68a');
      // Consejo de navegacion (menciona alternar jugadores con izq/der).
      var navTip;
      if (MAIN[sel] && MAIN[sel].key === 'players') {
        navTip = coopUnlocked()
          ? 'Izquierda / Derecha para 1 o 2 jugadores  ·  Enter alterna'
          : 'Rescata a Lord Falcon para desbloquear 2 jugadores';
      } else if (MAIN[sel] && MAIN[sel].key === 'part') {
        if (p3ok()) {
          navTip = 'Izquierda / Derecha para elegir la Parte 1, 2 o 3  ·  Enter cambia';
        } else {
          navTip = p2ok()
            ? 'Izquierda / Derecha para elegir la Parte 1 o la 2  ·  Enter alterna'
            : 'Rescata a Lord Falcon para desbloquear la Parte 2';
        }
      } else if (MAIN[sel] && MAIN[sel].key === 'disenos') {
        navTip = '¡Juanjo elige cómo son Mikey, Peter, Robovill y sus vehículos!';
      } else {
        navTip = 'Flechas para moverte  ·  Enter para elegir';
      }
      plainText(ctx, navTip, W / 2, H - 46, 15, 'rgba(255,255,255,0.75)');

      // Pista temporal al intentar activar el modo 2J estando bloqueado.
      if (coopHint) {
        var age = t - coopHintT;
        if (age >= 0 && age < 2.6) {
          var a = age < 2 ? 1 : (2.6 - age) / 0.6; // desvanecido al final
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, a));
          var hw = 520, hh = 40;
          var hx = W / 2 - hw / 2, hy = H - 96;
          ctx.fillStyle = 'rgba(20,14,40,0.92)';
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 3;
          roundRect(ctx, hx, hy, hw, hh, 12);
          ctx.fill(); ctx.stroke();
          plainText(ctx, coopHint, W / 2, hy + hh / 2, 18, CREAM);
          ctx.restore();
        } else {
          coopHint = '';
        }
      }

      // Overlay del codigo secreto (mensaje de Papa). Se dibuja por encima.
      if (secretMsg) { drawSecretOverlay(ctx, t); }
    }

    // Overlay celestial con el mensaje personal de Papa (Rule 2).
    // Panel dorado centrado, con estrellas/destellos que SUBEN y una crucecita
    // de luz ascendente. Nunca rompe el render (todo dibujado por codigo).
    function drawSecretOverlay(ctx, t) {
      var el = Math.max(0, t - secretMsgT);
      var pop = Math.min(1, el * 3);
      var ease = 1 - Math.pow(1 - pop, 3);

      ctx.save();
      // Velo suave sobre el titulo.
      ctx.fillStyle = 'rgba(8,6,22,0.72)';
      ctx.fillRect(0, 0, W, H);

      // Destellos que ascienden (deterministas, en bucle hacia arriba).
      for (var i = 0; i < 40; i++) {
        var bx = (i * 137.5) % W;
        var phase = (t * 0.35 + i * 0.11) % 1;      // 0..1
        var by = H - phase * (H + 60) + 30;          // sube de abajo a arriba
        var tw = 0.4 + 0.6 * Math.sin(t * 3 + i * 1.3);
        ctx.globalAlpha = 0.25 + 0.5 * Math.max(0, tw);
        ctx.fillStyle = '#fff7d6';
        var rr = 1 + (i % 3) * 0.7;
        ctx.beginPath();
        ctx.arc(bx, by, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Panel dorado/celestial centrado.
      var pw = 640, ph = 360;
      var px = (W - pw) / 2;
      var py = (H - ph) / 2;
      ctx.save();
      ctx.translate(W / 2, py + ph / 2);
      ctx.scale(0.85 + 0.15 * ease, 0.85 + 0.15 * ease);
      ctx.translate(-(W / 2), -(py + ph / 2));

      // Resplandor detras del panel.
      var glow = ctx.createRadialGradient(W / 2, py + 60, 20, W / 2, py + 60, 360);
      glow.addColorStop(0, 'rgba(253,230,138,0.35)');
      glow.addColorStop(1, 'rgba(253,230,138,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(px - 60, py - 60, pw + 120, ph + 120);

      // Cuerpo del panel.
      var g = ctx.createLinearGradient(0, py, 0, py + ph);
      g.addColorStop(0, 'rgba(40,30,66,0.98)');
      g.addColorStop(1, 'rgba(26,20,48,0.98)');
      ctx.fillStyle = g;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 5;
      roundRect(ctx, px, py, pw, ph, 24);
      ctx.fill(); ctx.stroke();

      // Crucecita suave de luz ascendente sobre el titulo.
      var cy = py + 40;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#fde68a';
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      ctx.shadowColor = 'rgba(253,230,138,0.9)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(W / 2, cy - 18);
      ctx.lineTo(W / 2, cy + 16);
      ctx.moveTo(W / 2 - 12, cy - 4);
      ctx.lineTo(W / 2 + 12, cy - 4);
      ctx.stroke();
      ctx.restore();

      // Titulo.
      outlinedText(ctx, '¡HACKEO ACTIVADO!', W / 2, py + 92, 34, GOLD, OUTLINE, 5, 'center');

      // Cuerpo del mensaje (palabra por palabra, con "el Cielo" resaltado).
      var lines = [
        'Juanjo, escucha bien:',
        'cada vez que caemos (abajo), nos levantamos (arriba).',
        'Y pase lo que pase, nuestra meta final',
        '__CIELO__',
        '',
        'Has desbloqueado todos los capítulos.',
        'Te quiere, Papá.'
      ];
      var ly = py + 138;
      var lh = 26;
      ctx.font = '18px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var j = 0; j < lines.length; j++) {
        var yy = ly + j * lh;
        if (lines[j] === '__CIELO__') {
          // "siempre será el Cielo." con "el Cielo" en dorado brillante.
          var pre = 'siempre será ';
          var hl = 'el Cielo.';
          ctx.font = 'bold 20px system-ui, "Segoe UI", Arial, sans-serif';
          var preW = ctx.measureText(pre).width;
          var hlW = ctx.measureText(hl).width;
          var startX = W / 2 - (preW + hlW) / 2;
          ctx.textAlign = 'left';
          ctx.fillStyle = CREAM;
          ctx.fillText(pre, startX, yy);
          ctx.save();
          ctx.fillStyle = '#ffd54a';
          ctx.shadowColor = 'rgba(255,213,74,0.9)';
          ctx.shadowBlur = 12;
          ctx.fillText(hl, startX + preW, yy);
          ctx.restore();
          ctx.textAlign = 'center';
          ctx.font = '18px system-ui, "Segoe UI", Arial, sans-serif';
        } else if (lines[j]) {
          ctx.fillStyle = CREAM;
          ctx.fillText(lines[j], W / 2, yy);
        }
      }

      // Indicacion de cierre.
      var blink = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.globalAlpha = blink;
      plainText(ctx, 'Pulsa Enter para continuar', W / 2, py + ph - 30, 18, '#fde68a');
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Dibuja un item de menu con resaltado tipo carton.
    function drawMenuItem(ctx, label, cx, cy, isSel, t, locked) {
      ctx.save();
      var w = 300, h = 40;
      if (isSel) {
        var pulse = 1 + Math.sin(t * 6) * 0.03;
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);
        ctx.translate(-cx, -cy);
        ctx.fillStyle = GOLD;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 4;
        roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 12);
        ctx.fill(); ctx.stroke();
        // Flechita indicadora.
        ctx.fillStyle = OUTLINE;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2 - 18, cy - 8);
        ctx.lineTo(cx - w / 2 - 4, cy);
        ctx.lineTo(cx - w / 2 - 18, cy + 8);
        ctx.closePath();
        ctx.fill();
        // Texto oscuro sobre el dorado (mejor contraste que un contorno grueso).
        ctx.fillStyle = '#3b1f05';
        ctx.font = 'bold 26px system-ui, "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
      } else {
        outlinedText(ctx, label, cx, cy, 24, locked ? '#9ca3af' : '#fef3c7', OUTLINE, 4, 'center');
      }
      ctx.restore();
    }

    // --- Render del submenu de capitulos ---
    function renderChapters(ctx) {
      var t = now();
      drawMenuBackdrop(ctx, t);
      outlinedText(ctx, 'Elegir capítulo', W / 2, 70, 46, GOLD, OUTLINE, 7, 'center');

      var names = [
        'La Emboscada',
        'La Preparación',
        'Batalla Espacial',
        'La Nave Nodriza',
        'Dark Toros'
      ];
      var unlocked = (G.state && G.state.unlocked) ? G.state.unlocked : 1;
      // Parte 2: sus 5 capitulos, su desbloqueo y sus medallas.
      var part2 = isPart2();
      if (part2) {
        var n2 = G.p2chapterNames || {};
        var def2 = ['Ciudad atacada', 'Carrera en robot', 'Fábrica de robots', 'Vuelo al cielo', 'Fortaleza en el cielo'];
        names = [];
        for (var c2 = 1; c2 <= 5; c2++) { names.push(n2[c2] || def2[c2 - 1]); }
        unlocked = p2unlocked();
        plainText(ctx, 'Parte 2: La Gema Robada', W / 2, 104, 18, '#fda4af');
      }
      // Parte 3: sus 5 capitulos y su desbloqueo (sin medallas).
      if (isPart3()) {
        part2 = false;
        var n3 = G.p3chapterNames || {};
        var def3 = ['Entrenamiento en el cielo', 'Túneles bajo tierra', 'Río subterráneo y vuelo', 'La fábrica oscura', 'Robovill'];
        names = [];
        for (var c3 = 1; c3 <= 5; c3++) { names.push(n3[c3] || def3[c3 - 1]); }
        unlocked = p3unlocked();
        plainText(ctx, 'Parte 3: We Are a Team', W / 2, 104, 18, '#93c5fd');
      }
      var startY = 140;
      var step = 58;
      for (var i = 0; i < 5; i++) {
        var chap = i + 1;
        var locked = chap > unlocked;
        var y = startY + i * step;
        var isSel = (i === sel);
        var label = 'Cap. ' + chap + '  ·  ' + names[i];
        // Recuadro
        ctx.save();
        var w = 520, h = 46;
        var x = W / 2 - w / 2;
        if (isSel) {
          ctx.fillStyle = locked ? 'rgba(80,80,90,0.9)' : GOLD;
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 4;
          roundRect(ctx, x, y - h / 2, w, h, 12);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = locked ? '#e5e7eb' : '#3b1f05';
        } else {
          ctx.fillStyle = 'rgba(20,14,40,0.55)';
          roundRect(ctx, x, y - h / 2, w, h, 12);
          ctx.fill();
          ctx.fillStyle = locked ? '#9ca3af' : CREAM;
        }
        ctx.font = 'bold 24px system-ui, "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x + 24, y);
        // Candado si bloqueado.
        if (locked) {
          drawLock(ctx, x + w - 34, y);
        } else if (part2 && chap <= 4 && G.ui2 && G.ui2.drawMedal) {
          // Medallas guardadas de este capitulo (3 huecos).
          var md = (G.p2.medals && G.p2.medals[chap]) || [];
          for (var mi = 0; mi < 3; mi++) {
            G.ui2.drawMedal(ctx, x + w - 92 + mi * 30, y, 24, md[mi] !== true, t);
          }
        }
        ctx.restore();
      }
      plainText(ctx, 'Enter para entrar  ·  Escape para volver', W / 2, H - 26, 17, 'rgba(255,255,255,0.8)');
    }

    function drawLock(ctx, cx, cy) {
      ctx.save();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3;
      ctx.fillStyle = '#facc15';
      // Cuerpo
      roundRect(ctx, cx - 10, cy - 2, 20, 16, 4);
      ctx.fill(); ctx.stroke();
      // Arco
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 7, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dibuja un panel de controles con titulo y filas [accion, tecla].
    function drawControlsPanel(ctx, panelX, panelY, panelW, titulo, rows, rowH) {
      var headH = 34;
      var panelH = headH + rows.length * rowH + 16;
      ctx.save();
      ctx.fillStyle = 'rgba(15,10,35,0.85)';
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 4;
      roundRect(ctx, panelX, panelY, panelW, panelH, 16);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      // Titulo de la seccion.
      outlinedText(ctx, titulo, panelX + panelW / 2, panelY + headH / 2 + 6, 22, GOLD, OUTLINE, 4, 'center');
      for (var i = 0; i < rows.length; i++) {
        var ry = panelY + headH + i * rowH + rowH / 2;
        if (i % 2 === 0) {
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          roundRect(ctx, panelX + 10, ry - rowH / 2 + 2, panelW - 20, rowH - 4, 8);
          ctx.fill();
          ctx.restore();
        }
        plainText(ctx, rows[i][0], panelX + 20, ry, 17, CYAN, 'left');
        plainText(ctx, rows[i][1], panelX + panelW - 20, ry, 17, CREAM, 'right');
      }
      return panelH;
    }

    // --- Render de "Como jugar" ---
    function renderHowTo(ctx) {
      var t = now();
      // Parte 2: segunda pagina con sus armas (la dibuja ui2.js).
      if (isPart2() && howtoPage === 1 && G.ui2 && G.ui2.drawWeaponsHelp) {
        G.ui2.drawWeaponsHelp(ctx, t);
        return;
      }
      // Parte 3: segunda pagina con los 4 heroes y el cambio (la dibuja ui3.js).
      if (isPart3() && howtoPage === 1 && G.ui3 && typeof G.ui3.drawHowto3 === 'function') {
        try { G.ui3.drawHowto3(ctx, t); } catch (e) {}
        return;
      }
      drawMenuBackdrop(ctx, t);
      outlinedText(ctx, 'Cómo jugar', W / 2, 48, 42, GOLD, OUTLINE, 7, 'center');

      // Seccion 1 jugador (teclas actuales, sin cambios).
      var solo = [
        ['Mover', 'Flechas  o  A / D'],
        ['Saltar', 'Espacio  (Falcon: DOBLE)'],
        ['Espada / Puñetazo', 'J  o  Z'],
        ['Flecha / Pulso', 'K  o  X'],
        ['Hackear (mantén)', 'H  o  C'],
        ['Pausa · Silencio', 'P / Escape  ·  M'],
        ['Confirmar', 'Enter  o  Espacio']
      ];
      // Seccion 2 jugadores (mismo teclado).
      var p1 = [
        ['Mover · Saltar', 'W A S D  ·  W / Espacio'],
        ['Ataque · Disparo', 'F  ·  G'],
        ['Hackear (mantén)', 'R'],
        ['Pausa', 'P  o  Escape']
      ];
      var p2 = [
        ['Mover · Saltar', 'Flechas  ·  Flecha ↑'],
        ['Ataque · Disparo', 'K  ·  L'],
        ['Hackear (mantén)', 'Ñ  o  O'],
        ['Confirmar', 'Enter']
      ];
      // Parte 3: el cambio de héroe es LA mecánica nueva (teclas de G.p3teclas, nunca a mano).
      if (isPart3() && typeof G.p3teclas === 'function') {
        try {
          solo.splice(5, 0, ['Cambiar de héroe', G.p3teclas(1).cambio]);
          p1[2] = ['Hackear · Cambiar héroe', G.p3teclas(1, 'coop').hack + '  ·  ' + G.p3teclas(1, 'coop').cambio];
          p2[2] = ['Hackear · Cambiar héroe', 'Ñ/O  ·  ' + G.p3teclas(2, 'coop').cambio];
        } catch (e) {}
      }

      var top = 82;
      var rowH = 30;
      var gap = 22;
      var colW = (W - 130 * 2 - gap) / 2;
      var leftX = 130;
      var rightX = leftX + colW + gap;

      // Columna izquierda: 1 jugador (grande). Columna derecha: 2 jugadores
      // en dos sub-paneles apilados (P1 arriba, P2 abajo).
      drawControlsPanel(ctx, leftX, top, colW, '1 jugador', solo, rowH);
      var h1 = drawControlsPanel(ctx, rightX, top, colW, '2 jugadores — P1 (teclado izq.)', p1, rowH);
      drawControlsPanel(ctx, rightX, top + h1 + 14, colW, '2 jugadores — P2 (teclado der.)', p2, rowH);

      // Linea sobre controles tactiles (tablet/movil, solo 1 jugador).
      plainText(ctx, 'En tablet o móvil (1 jugador) aparecen botones táctiles en pantalla.', W / 2, H - 52, 17, '#fde68a');
      plainText(ctx, 'Consejo: los enemigos hacen POP y a veces sueltan corazones.', W / 2, H - 30, 16, 'rgba(255,255,255,0.8)');
      plainText(ctx, isPart2() ? 'Enter: armas de la Parte 2  ·  Escape para volver'
        : (isPart3() ? 'Enter: los 4 héroes de la Parte 3  ·  Escape para volver' : 'Enter o Escape para volver'),
        W / 2, H - 10, 15, 'rgba(255,255,255,0.75)');
    }

    // --- Render de confirmacion "Borrar progreso" ---
    function renderErase(ctx) {
      var t = now();
      drawMenuBackdrop(ctx, t);
      // Panel modal.
      ctx.save();
      ctx.fillStyle = 'rgba(10,8,20,0.55)';
      ctx.fillRect(0, 0, W, H);
      var pw = 560, ph = 240;
      var px = (W - pw) / 2, py = (H - ph) / 2;
      ctx.fillStyle = 'rgba(30,20,55,0.96)';
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 5;
      roundRect(ctx, px, py, pw, ph, 20);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      outlinedText(ctx, '¿Borrar progreso?', W / 2, py + 56, 34, '#fecaca', '#7f1d1d', 5, 'center');
      plainText(ctx, 'Se perderán todos los capítulos desbloqueados.', W / 2, py + 100, 19, CREAM);
      // Aviso extra solo si hay progreso de la Parte 2 que se perderia.
      var p2prog = false;
      try { p2prog = !!(G.p2 && ((G.p2.unlocked | 0) > 1 || (G.p2medalTotal && G.p2medalTotal() > 0))); } catch (e) { p2prog = false; }
      // Parte 3: aviso si tiene capitulos desbloqueados (los Diseños de Juanjo se conservan).
      var p3prog = false;
      try { p3prog = !!(G.p3 && (G.p3.unlocked | 0) > 1); } catch (e) { p3prog = false; }
      if (p2prog && p3prog) {
        plainText(ctx, '(También los de la Parte 2 y sus medallas, y los de la Parte 3.)', W / 2, py + 126, 15, '#fda4af');
      } else if (p2prog) {
        plainText(ctx, '(También los de la Parte 2 y sus medallas.)', W / 2, py + 126, 16, '#fda4af');
      } else if (p3prog) {
        plainText(ctx, '(También los de la Parte 3.)', W / 2, py + 126, 16, '#93c5fd');
      }

      // Botones Si / No.
      var by = py + 168;
      drawChoiceButton(ctx, 'Sí, borrar', W / 2 - 120, by, sel === 0, '#ef4444');
      drawChoiceButton(ctx, 'No', W / 2 + 120, by, sel === 1, '#22c55e');
      plainText(ctx, 'Flechas para elegir  ·  Enter confirma', W / 2, py + ph - 22, 15, 'rgba(255,255,255,0.75)');
    }

    function drawChoiceButton(ctx, label, cx, cy, isSel, color) {
      ctx.save();
      var w = 200, h = 48;
      ctx.fillStyle = isSel ? color : 'rgba(60,50,90,0.9)';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = isSel ? 5 : 3;
      if (isSel) {
        var pulse = 1 + Math.sin(now() * 6) * 0.03;
        ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
      }
      roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 12);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy);
      ctx.restore();
    }

    function render(ctx) {
      if (view === 'main') renderTitle(ctx);
      else if (view === 'chapters') renderChapters(ctx);
      else if (view === 'howto') renderHowTo(ctx);
      else if (view === 'erase') renderErase(ctx);
    }

    G.scenes = G.scenes || {};
    G.scenes.title = { enter: enter, update: update, render: render };
  })();

  // ==========================================================================
  // ESCENA: story (dialogos con retrato + maquina de escribir)
  // ==========================================================================
  (function () {
    var lines = [];      // array de {who, text}
    var idx = 0;         // linea actual
    var nextScene = null;// escena a la que ir al terminar
    var storyId = '';    // id de historia (para fondo)
    var reveal = 0;      // caracteres revelados (float)
    var done = false;    // linea completa mostrada
    var CPS = 42;        // caracteres por segundo
    // ---- Historias animadas (js/cine.js) y "mantener para saltar" ----
    var lineT = 0;           // segundos desde que empezo la linea actual
    var sonarDesde = -1;     // sonidos del plano ya tocados hasta este instante
    var holdT = 0;           // segundos manteniendo confirm
    var holdArmed = false;   // solo cuenta si confirm se pulso DENTRO de esta historia
    var HOLD_SKIP = 1.0;     // mantener 1 s salta la historia entera

    function enter(params) {
      params = params || {};
      storyId = params.id || '';
      nextScene = params.next || null;
      var data = (G.storyData && G.storyData[storyId]) ? G.storyData[storyId] : null;
      lines = Array.isArray(data) ? data.slice() : [{ who: 'narrador', text: '...' }];
      idx = 0;
      reveal = 0;
      done = false;
      lineT = 0;
      sonarDesde = -1;
      holdT = 0;
      holdArmed = false;
      // Para pruebas y capturas: empezar en una linea concreta.
      if (typeof params.linea === 'number' && isFinite(params.linea)) {
        idx = Math.max(0, Math.min(lines.length - 1, Math.floor(params.linea)));
      }
      // La musica la fija cada nivel/escena destino; aqui dejamos el tema
      // de titulo si veniamos de el, no forzamos nada para no cortar loops.
    }

    function finish() {
      if (nextScene) G.go(nextScene);
      else G.go('title');
    }

    function currentLine() {
      return lines[idx] || { who: 'narrador', text: '' };
    }

    function update(dt) {
      var confirm = menuPressed('confirm');
      // Mantener confirm 1 segundo salta la historia entera (un toque sigue igual que siempre).
      if (confirm) holdArmed = true;
      if (holdArmed && menuHeld('confirm')) {
        holdT += dt;
        if (holdT >= HOLD_SKIP - 1e-6) {
          sfx('select');
          finish();
          return;
        }
      } else {
        holdT = 0;
        holdArmed = false;
      }
      lineT += dt;
      var line = currentLine();
      var full = String(line.text || '');
      if (!done) {
        reveal += CPS * dt;
        if (reveal >= full.length) {
          reveal = full.length;
          done = true;
        }
        if (confirm) {
          // Completa la linea de golpe.
          reveal = full.length;
          done = true;
        }
      } else {
        if (confirm) {
          sfx('select');
          idx++;
          if (idx >= lines.length) {
            finish();
            return;
          }
          reveal = 0;
          done = false;
          lineT = 0;
          sonarDesde = -1;
        }
      }
      // Sonidos de la historia animada (los del plano con t en (sonarDesde, lineT]).
      if (G.cine && typeof G.cine.has === 'function' && G.cine.has(storyId)) {
        try { G.cine.sonar(storyId, idx, sonarDesde, lineT); } catch (e) { /* nunca romper */ }
      }
      sonarDesde = lineT;
    }

    // Indicador "Mantén Enter para saltar" arriba a la derecha, con un anillo que se llena.
    function drawSkipHint(ctx) {
      var tactil = false;
      try { tactil = ('ontouchstart' in window) || !!(navigator && navigator.maxTouchPoints > 0); } catch (e) { tactil = false; }
      var txt = tactil ? 'Mantén OK para saltar' : 'Mantén Enter para saltar';
      var p = Math.max(0, Math.min(1, holdT / HOLD_SKIP));
      var right = tactil ? W - 146 : W - 14;   // en el movil, a la izquierda de pausa/silencio
      var cy = tactil ? 40 : 24;
      ctx.save();
      ctx.font = 'bold 14px system-ui, "Segoe UI", Arial, sans-serif';
      var tw = ctx.measureText(txt).width;
      var pw = tw + 44, ph = 28, x0 = right - pw;
      ctx.globalAlpha = p > 0 ? 0.95 : 0.62;
      ctx.fillStyle = 'rgba(10,8,22,0.72)';
      roundRect(ctx, x0, cy - ph / 2, pw, ph, 14);
      ctx.fill();
      var rcx = x0 + 16;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.arc(rcx, cy, 7, 0, Math.PI * 2); ctx.stroke();
      if (p > 0) {
        ctx.strokeStyle = GOLD;
        ctx.beginPath(); ctx.arc(rcx, cy, 7, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = CREAM;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, rcx + 14, cy + 1);
      ctx.restore();
    }

    // Fondo estatico segun el id de historia (usa gfx de fondos si aplica).
    function drawStoryBackground(ctx, t) {
      var id = storyId;
      // Mapear cada historia a un fondo tematico coherente.
      if (id === 's_cap1' || id === 's_captura') {
        if (!gfxCall('drawBgCanyon', ctx, 0, t)) drawMenuBackdrop(ctx, t);
      } else if (id === 's_cap2' || id === 's_despegue') {
        if (!gfxCall('drawBgBase', ctx, 0, t)) drawMenuBackdrop(ctx, t);
      } else if (id === 's_cap3') {
        if (!gfxCall('drawBgSpace', ctx, t * 20, t)) drawMenuBackdrop(ctx, t);
      } else if (id === 's_cap4' || id === 's_infiltracion') {
        if (!gfxCall('drawBgMothership', ctx, 0, t)) drawMenuBackdrop(ctx, t);
      } else if (id === 's_cap5' || id === 's_confrontacion' || id === 's_final') {
        if (!gfxCall('drawBgThrone', ctx, t)) drawMenuBackdrop(ctx, t);
      } else if (id.indexOf('s2_') === 0 && window.P2 && P2.call) {
        // Historias de la Parte 2: el fondo del lugar donde ocurren.
        var p2bg = { s2_cap1: 'bgCiudad', s2_tras1: 'bgCiudad', s2_cap2: 'bgCarretera', s2_tras2: 'bgCarretera',
          s2_cap3: 'bgFabrica', s2_tras3: 'bgFabrica', s2_cap4: 'bgCielo', s2_tras4: 'bgCielo',
          s2_cap5: 'bgFortaleza', s2_final: 'bgFortaleza' }[id];
        var ok = false;
        if (p2bg === 'bgFortaleza') ok = P2.call(p2bg, ctx, t);
        else if (p2bg) ok = P2.call(p2bg, ctx, t * 20, t);
        if (!ok) drawMenuBackdrop(ctx, t);
      } else if (id.indexOf('s3_') === 0) {
        // Historias de la Parte 3 sin guion animado: el fondo del lugar (contrato §8.7).
        var ok3 = false;
        try {
          var p3bg = { s3_cap1: 'bgBaseCielo', s3_tras1: 'bgBaseCielo', s3_cap2: 'bgTuneles', s3_tras2: 'bgTuneles',
            s3_cap3: 'bgRio', s3_tras3: 'bgRio', s3_cap4: 'bgFabricaOscura', s3_tras4: 'bgFabricaOscura',
            s3_cap5: 'bgArenaRobovill', s3_final: 'bgArenaRobovill' }[id];
          if (window.P2 && typeof window.P2.call === 'function') {
            if (p3bg === 'bgArenaRobovill') ok3 = window.P2.call('bgArenaRobovill', ctx, t);
            else if (p3bg === 'bgRio') ok3 = window.P2.call('bgRio', ctx, t * 20, t, { nivelAgua: 300 });
            else if (p3bg) ok3 = window.P2.call(p3bg, ctx, t * 20, t);
          }
        } catch (e) { ok3 = false; }
        if (!ok3) drawMenuBackdrop(ctx, t);
      } else {
        drawMenuBackdrop(ctx, t);
      }
      // Oscurecer un poco para legibilidad del panel.
      ctx.save();
      ctx.fillStyle = 'rgba(6,4,15,0.30)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    function nameFor(who) {
      switch (who) {
        case 'director': return 'Director America';
        case 'falcon': return 'Lord Falcon';
        case 'toros': return 'Dark Toros';
        case 'narrador': return 'Narrador';
        case 'juanjo': return 'Juanjo';          // Parte 2
        case 'papa': return 'Papá';              // Parte 2
        case 'secuaz': return 'Dark Secuaz';     // Parte 2
        case 'mikey': return 'Mikey Stark';      // Parte 3
        case 'peter': return 'Peter Rogers';     // Parte 3
        case 'robovill': return 'Robovill';      // Parte 3
        default: return '';
      }
    }

    function colorFor(who) {
      switch (who) {
        case 'director': return '#60a5fa';
        case 'falcon': return '#4ade80';
        case 'toros': return '#f87171';
        case 'narrador': return '#fde68a';
        case 'juanjo': return '#7dd3fc';         // Parte 2
        case 'papa': return '#fbbf24';           // Parte 2
        case 'secuaz': return isP3Story() ? '#86efac' : '#f87171';   // Parte 2 (rojo) / Parte 3 (bueno, verde)
        case 'mikey': return p3HeroCol('mikey', '#fdba74');            // Parte 3
        case 'peter': return p3HeroCol('peter', '#fde047');            // Parte 3
        case 'robovill': return '#fb7185';                              // Parte 3
        default: return CREAM;
      }
    }

    // Parte 3 (contrato §8.7): en las historias s3_* Dark Secuaz es BUENO.
    function isP3Story() { return String(storyId || '').indexOf('s3_') === 0; }
    function p3HeroCol(h, respaldo) {
      if (G.p3 && typeof G.p3.heroColor === 'function') {
        try { var c = G.p3.heroColor(h, 'claro'); if (c) return c; } catch (e) {}
      }
      return respaldo;
    }
    function portraitFor(who) { return (who === 'secuaz' && isP3Story()) ? 'secuazBueno' : who; }

    function render(ctx) {
      var t = now();
      // Historia animada (js/cine.js): si esta historia tiene guion, se dibuja
      // en lugar del fondo fijo. Si no, el fondo de siempre.
      var conCine = false;
      if (G.cine && typeof G.cine.has === 'function' && G.cine.has(storyId)) {
        try { conCine = G.cine.draw(ctx, storyId, idx, lineT, t) !== false; } catch (e) { conCine = false; }
      }
      if (!conCine) drawStoryBackground(ctx, t);

      var line = currentLine();
      var who = line.who || 'narrador';
      var full = String(line.text || '');
      var shown = full.substring(0, Math.floor(reveal));

      // Panel inferior de dialogo.
      var panelH = 168;
      var py = H - panelH - 18;
      var px = 24;
      var pw = W - 48;
      ctx.save();
      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, px + 4, py + 5, pw, panelH, 20);
      ctx.fill();
      // Cuerpo
      ctx.fillStyle = 'rgba(20,14,40,0.94)';
      ctx.strokeStyle = colorFor(who);
      ctx.lineWidth = 5;
      roundRect(ctx, px, py, pw, panelH, 20);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      // Retrato (busto en marco) a la izquierda dentro del panel.
      var portraitSize = 120;
      var portX = px + 26 + portraitSize / 2;
      var portY = py + panelH / 2;
      // Marco del retrato.
      ctx.save();
      ctx.fillStyle = 'rgba(10,8,22,0.9)';
      ctx.strokeStyle = colorFor(who);
      ctx.lineWidth = 4;
      roundRect(ctx, portX - portraitSize / 2 - 6, portY - portraitSize / 2 - 6, portraitSize + 12, portraitSize + 12, 16);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      if (!gfxCall('drawPortrait', ctx, portraitFor(who), portX - portraitSize / 2, portY - portraitSize / 2, portraitSize)) {
        // Fallback: inicial.
        plainText(ctx, nameFor(who).charAt(0) || '?', portX, portY, 60, colorFor(who));
      }

      // Nombre de quien habla.
      var textLeft = portX + portraitSize / 2 + 28;
      var textW = px + pw - textLeft - 26;
      outlinedText(ctx, nameFor(who), textLeft, py + 30, 24, colorFor(who), OUTLINE, 4, 'left');

      // Texto con maquina de escribir, envuelto.
      ctx.save();
      var size = 22;
      var lineH = size * 1.3;
      var wrapped = wrapText(ctx, shown, textW, size);
      ctx.font = 'bold ' + size + 'px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = CREAM;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      var ty = py + 54;
      for (var i = 0; i < wrapped.length && i < 4; i++) {
        ctx.fillText(wrapped[i], textLeft, ty + i * lineH);
      }
      ctx.restore();

      // Indicador de "continuar" (parpadeante) cuando la linea esta completa.
      if (done) {
        var blink = 0.5 + 0.5 * Math.sin(t * 6);
        ctx.save();
        ctx.globalAlpha = blink;
        var arrX = px + pw - 34;
        var arrY = py + panelH - 26;
        ctx.fillStyle = colorFor(who);
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(arrX - 10, arrY - 6);
        ctx.lineTo(arrX + 10, arrY - 6);
        ctx.lineTo(arrX, arrY + 8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
        plainText(ctx, 'Enter', arrX - 60, arrY - 1, 16, 'rgba(255,255,255,0.7)', 'right');
      }

      // Contador de linea (discreto).
      plainText(ctx, (idx + 1) + ' / ' + lines.length, px + pw - 20, py + 26, 15, 'rgba(255,255,255,0.5)', 'right');

      // Mantener para saltar la historia.
      drawSkipHint(ctx);
    }

    G.scenes = G.scenes || {};
    G.scenes.story = { enter: enter, update: update, render: render };
  })();

  // ==========================================================================
  // ESCENA: levelDone (capitulo completado)
  // ==========================================================================
  (function () {
    var level = 1;
    var t0 = 0;
    var played = false;

    function enter(params) {
      params = params || {};
      level = params.level || 1;
      t0 = now();
      played = false;
      // Desbloquear siguiente capitulo.
      if (G.state) {
        G.state.unlocked = Math.min(5, Math.max(G.state.unlocked || 1, level + 1));
        // Al completar el capitulo 5 se ha rescatado a Lord Falcon: se
        // desbloquea el modo cooperativo de forma permanente.
        if (level === 5) { G.state.falconRescued = true; }
      }
      if (G.saveState) { try { G.saveState(); } catch (e) {} }
      sfx('victory');
    }

    function update() {
      if (menuPressed('confirm')) {
        var flow = G.flow || {};
        var after = (flow.after && flow.after[level]) ? flow.after[level] : null;
        sfx('select');
        if (after && after.story) {
          G.go('story', { id: after.story, next: after.next });
        } else {
          G.go((after && after.next) || 'title');
        }
      }
    }

    function render(ctx) {
      var t = now();
      var el = t - t0;
      drawMenuBackdrop(ctx, t);

      // Estrellitas festivas cayendo/subiendo.
      for (var i = 0; i < 24; i++) {
        var ang = (i / 24) * Math.PI * 2;
        var rr = 120 + Math.sin(t * 1.5 + i) * 20;
        var sx = W / 2 + Math.cos(ang + t * 0.4) * rr * 1.7;
        var sy = 200 + Math.sin(ang + t * 0.4) * rr * 0.7;
        gfxCall('drawSparkle', ctx, sx, sy, (Math.sin(t * 3 + i) + 1) / 2);
      }

      // Aparicion animada del cartel.
      var pop = Math.min(1, el * 3);
      var scale = 0.6 + 0.4 * (1 - Math.pow(1 - pop, 3));
      ctx.save();
      ctx.translate(W / 2, 210);
      ctx.scale(scale, scale);
      outlinedText(ctx, '¡Capítulo ' + level, 0, -34, 52, GOLD, OUTLINE, 8, 'center');
      outlinedText(ctx, 'completado!', 0, 30, 60, '#fef3c7', OUTLINE, 9, 'center');
      ctx.restore();

      // Vitor plural amable cuando juegan dos heroes.
      if (G.state && G.state.coop) {
        var vbob = Math.sin(t * 2.4) * 3;
        outlinedText(ctx, '¡Gran trabajo en equipo, héroes!', W / 2, 274 + vbob, 26, '#fde68a', OUTLINE, 4, 'center');
      }

      // Tres estrellas grandes.
      var starY = 320;
      for (var s = 0; s < 3; s++) {
        var sx2 = W / 2 + (s - 1) * 80;
        var appear = el * 2 - s * 0.25;
        if (appear > 0) {
          var sc = Math.min(1, appear);
          drawBigStar(ctx, sx2, starY + Math.sin(t * 3 + s) * 4, 30 * sc, t + s);
        }
      }

      // Personaje celebrando abajo.
      var heroe = (level === 1) ? 'drawFalcon' : 'drawDirector';
      gfxCall(heroe, ctx, W / 2, H - 60 + Math.sin(t * 4) * 6, { t: t, facing: 1, pose: 'win', scale: 1.3 });

      // Instruccion.
      var blink = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.save();
      ctx.globalAlpha = blink;
      plainText(ctx, 'Pulsa Enter para continuar', W / 2, H - 24, 22, CREAM);
      ctx.restore();
    }

    function drawBigStar(ctx, cx, cy, r, t) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(t) * 0.1);
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var ang = (Math.PI / 5) * i - Math.PI / 2;
        var rad = (i % 2 === 0) ? r : r * 0.45;
        var x = Math.cos(ang) * rad;
        var y = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = GOLD;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 4;
      ctx.fill(); ctx.stroke();
      // Brillo central.
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.15, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    G.scenes = G.scenes || {};
    G.scenes.levelDone = { enter: enter, update: update, render: render };
  })();

  // ==========================================================================
  // ESCENA: gameover (amable, reintentar nivel)
  // ==========================================================================
  (function () {
    var retry = 'level1';
    var tip = '';
    var t0 = 0;

    var TIPS = [
      'Consejo: los enemigos avisan con un signo ¡! antes de atacar. Salta o esquiva.',
      'Consejo: recoge los corazones que sueltan los enemigos para curarte.',
      'Consejo: puedes mantener H cerca de una consola o torreta para hackearla.',
      'Consejo: el escudo de Dark Toros suena CLINK: primero hackea su martillo.',
      'Consejo: Lord Falcon tiene doble salto; pulsa el salto dos veces.',
      'Consejo: tras recibir daño parpadeas un momento y no te pueden herir.',
      'Consejo: tómate tu tiempo, no hay prisa. ¡Tú puedes, héroe!'
    ];

    function enter(params) {
      params = params || {};
      retry = params.retry || 'level1';
      t0 = now();
      tip = TIPS[G.randInt ? G.randInt(0, TIPS.length - 1) : Math.floor(Math.random() * TIPS.length)];
      // Parte 3 (contrato §8.7): consejos propios, como plantillas con las teclas del jugador.
      if (String(retry).indexOf('levelP3') === 0) {
        try { tip = tipP3(retry); } catch (e) {}
      }
      music('title'); // musica suave amable
    }

    // Consejos de la Parte 3: plantillas que pasan por G.p3conTeclas (nunca teclas a mano).
    // Lista general (plataformas: levelP3_1, _4 y _5), la del contrato §8.7.
    var TIPS_P3 = [
      'Pulsa {cambio} para cambiar de héroe: ¡cada uno tiene su truco!',
      'Peter se cubre manteniendo {ataque}: ¡protege a los que están detrás!',
      'Las consolas son cosa del Director.',
      'El francotirador de Mikey llega muy lejos.',
      'Lord Falcon tiene doble salto.',
      'Escucha a Dark Secuaz: ¡conoce los puntos débiles de los robots!'
    ];
    // Respaldo sin teclas (si G.p3conTeclas no existiera).
    var TIPS_P3_SIN_TECLAS = [
      'Cambia de héroe cuando quieras: ¡cada uno tiene su truco!',
      'Peter se cubre con su escudo: ¡protege a los que están detrás!',
      'Las consolas son cosa del Director.',
      'El francotirador de Mikey llega muy lejos.',
      'Lord Falcon tiene doble salto.',
      'Escucha a Dark Secuaz: ¡conoce los puntos débiles de los robots!'
    ];
    // Consejos propios de cada escena que no es de plataformas: en la moto, el río y las
    // fusiones no se cambia de héroe, así que la lista general confundiría (QA ronda 1).
    // j: jugador cuyas teclas se nombran (la moto es de Mikey y el submarino de Peter: J1;
    // en las fusiones, 0 = las de los dos en co-op, porque cualquiera puede ser el piloto).
    var TIPS_P3_ESCENA = {
      levelP3_2: { j: 1, tips: [
        '¡Salta con {salto} los huecos y las barricadas!',
        'Pulsa {disparo} para cambiar de lanzador: el francotirador llega lejos y da a la diana.',
        'Mira las sombras del suelo: caen rocas. ¡Frena o acelera!',
        'Mantén {ataque} con la metralleta contra los grupos de robots.'
      ] },
      levelP3_3: { j: 1, tips: [
        'Mantén {ataque}: escudo de la proa. ¡Para las burbujas!',
        'Pulsa {disparo}: escudo-torpedo, que rebota y vuelve.',
        'Las minas explotan si las tocas: ¡lánzales el escudo-torpedo con {disparo}!',
        'Mira las flechas de burbujas: las corrientes te empujan.'
      ] },
      levelP3_2f: { j: 0, tips: [
        'Mantén {disparo} para el escudo de energía.',
        'El MOTOR brillante de atrás es su punto débil: ¡ponte detrás y golpéalo con {ataque}!',
        'Cuando veas «¡SALTA!», salta su embestida con {salto}.',
        'Llena la barra de equipo y pulsa {cambio} para el ATAQUE EN EQUIPO.',
        'Escucha a Dark Secuaz: te dice el punto débil.'
      ] },
      levelP3_3f: { j: 0, tips: [
        'Mantén {disparo} para el escudo.',
        '¡Rayo! Sal de la línea roja volando arriba o abajo.',
        'Espera a que abra la compuerta de la panza y dale con {ataque}.',
        'Llena la barra de equipo y pulsa {cambio} para el ATAQUE EN EQUIPO.',
        'Escucha a Dark Secuaz: te dice el punto débil.'
      ] },
      levelP3_5f: { j: 0, tips: [
        'Mira el aviso del suelo y apártate del círculo.',
        'El taladro sale por debajo: ¡salta con {salto}!',
        'Golpea la gema copia del pecho con {ataque}.',
        'Mantén {disparo} para el escudo de Peter.',
        'Llena la barra de equipo y pulsa {cambio} para el ATAQUE EN EQUIPO.'
      ] }
    };
    // Plantilla → texto sin marcas de tecla (respaldo sin G.p3conTeclas).
    function sinTeclas(txt) {
      return String(txt).replace(/\{(ataque|disparo|hack|cambio|salto)\}/g, 'su botón');
    }
    function tipP3(escena) {
      var esp = TIPS_P3_ESCENA[String(escena || '')];
      if (esp && esp.tips && esp.tips.length) {
        var tt = esp.tips[Math.floor(Math.random() * esp.tips.length)];
        var jj = (esp.j === 0 && G.state && G.state.coop) ? 0 : 1;
        if (typeof G.p3conTeclas === 'function') {
          try { return 'Consejo: ' + G.p3conTeclas(tt, jj); } catch (e) {}
        }
        return 'Consejo: ' + sinTeclas(tt);
      }
      var i = Math.floor(Math.random() * TIPS_P3.length);
      if (typeof G.p3conTeclas === 'function') {
        try { return 'Consejo: ' + G.p3conTeclas(TIPS_P3[i], (G.state && G.state.coop) ? 0 : 1); } catch (e) {}
      }
      return 'Consejo: ' + TIPS_P3_SIN_TECLAS[i];
    }

    function update() {
      if (menuPressed('confirm')) {
        sfx('select');
        G.go(retry);
      }
    }

    function render(ctx) {
      var t = now();
      // Fondo calido y amable (no rojo agresivo).
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1e3a5f');
      g.addColorStop(1, '#3b2a5c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      drawMenuBackdropStars(ctx, t);

      // Personaje animado (Director con animo; en la Parte 3, el héroe de esa escena).
      var gy = H - 90 + Math.sin(t * 2) * 5;
      if (!drawHeroP3(ctx, W / 2, gy, t)) {
        gfxCall('drawDirector', ctx, W / 2, gy, { t: t, facing: 1, pose: 'idle', scale: 1.35 });
      }

      // Mensaje principal (plural amable en co-op).
      var bob = Math.sin(t * 2) * 4;
      var msg = (G.state && G.state.coop) ? '¡Casi lo tienen, héroes!' : '¡Casi lo tienes, héroe!';
      outlinedText(ctx, msg, W / 2, 150 + bob, 56, GOLD, OUTLINE, 8, 'center');

      // Consejo en panel.
      ctx.save();
      var pw = 640, ph = 90, px = (W - pw) / 2, py = 210;
      ctx.fillStyle = 'rgba(15,10,35,0.85)';
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 3;
      roundRect(ctx, px, py, pw, ph, 16);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = 'bold 20px system-ui, "Segoe UI", Arial, sans-serif';
      var lines = wrapText(ctx, tip, pw - 44, 20);
      ctx.fillStyle = CREAM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var lineH = 26;
      var startY = 210 + 45 - ((lines.length - 1) * lineH) / 2;
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], W / 2, startY + i * lineH);
      }
      ctx.restore();

      // Instruccion de reintentar.
      var blink = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.save();
      ctx.globalAlpha = blink;
      plainText(ctx, 'Pulsa Enter para intentarlo otra vez', W / 2, 340, 24, '#fde68a');
      ctx.restore();
    }

    // Parte 3: héroe de la escena perdida (moto → Mikey, río → Peter; si no, el del J1).
    function heroP3() {
      var r = String(retry);
      if (r.indexOf('levelP3') !== 0) return null;
      if (r.indexOf('levelP3_2') === 0) return 'mikey';
      if (r.indexOf('levelP3_3') === 0) return 'peter';
      var h = null;
      try { h = (G.p3 && G.p3.run && G.p3.run.lastHero1) || (G.p3 && G.p3.hero) || null; } catch (e) { h = null; }
      return (h === 'mikey' || h === 'peter' || h === 'director' || h === 'falcon') ? h : null;
    }
    function drawHeroP3(ctx, x, y, t) {
      var h = heroP3();
      if (!h) return false;
      try {
        if (!window.P2 || typeof window.P2.call !== 'function') return false;
        var v = (G.p3 && G.p3.look && G.p3.look[h] === 'B') ? 'B' : 'A';
        return !!window.P2.call('heroeP3', ctx, h, x, y, { variant: v, scale: 1.35, facing: 1, pose: 'idle', t: t });
      } catch (e) { return false; }
    }

    function drawMenuBackdropStars(ctx, t) {
      ctx.save();
      for (var i = 0; i < 40; i++) {
        var sx = (i * 137.5) % W;
        var sy = (i * 91.7) % H;
        var tw = 0.5 + 0.5 * Math.sin(t * 1.5 + i);
        ctx.globalAlpha = 0.15 + 0.35 * tw;
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    G.scenes = G.scenes || {};
    G.scenes.gameover = { enter: enter, update: update, render: render };
  })();

  // ==========================================================================
  // ESCENA: credits (creditos que suben + desfile de personajes)
  // ==========================================================================
  (function () {
    var scroll = 0;      // desplazamiento vertical
    var speed = 34;      // px por segundo
    var lines = [];      // lineas de creditos
    var totalH = 0;
    var finished = false;

    function buildLines() {
      return [
        { t: 'EL RESCATE DE', size: 34, color: '#fde68a', gap: 8 },
        { t: 'LORD FALCON', size: 56, color: GOLD, gap: 46 },
        { t: '', size: 20, gap: 20 },
        { t: 'Diseñador Jefe', size: 22, color: CYAN, gap: 4 },
        { t: 'Juanjo (10 años)', size: 34, color: '#ffffff', gap: 40 },
        { t: 'Productor', size: 22, color: CYAN, gap: 4 },
        { t: 'Papá', size: 34, color: '#ffffff', gap: 46 },
        { t: '- Personajes -', size: 24, color: GOLD, gap: 30 },
        { t: 'Director America', size: 28, color: '#60a5fa', gap: 10, sprite: 'director' },
        { t: 'Lord Falcon', size: 28, color: '#4ade80', gap: 10, sprite: 'falcon' },
        { t: 'Dark Toros', size: 28, color: '#f87171', gap: 10, sprite: 'toros' },
        { t: '', size: 20, gap: 26 },
        { t: '- Los creadores -', size: 24, color: GOLD, gap: 28 },
        { t: 'Juanjo', size: 28, color: '#7dd3fc', gap: 16, sprite: 'juanjo', spriteScale: 0.72, spriteDY: 30 },
        { t: 'Papá', size: 28, color: '#fbbf24', gap: 16, sprite: 'papa', spriteScale: 0.66, spriteDY: 32 },
        { t: '', size: 20, gap: 30 },
        { t: '¡Gracias por jugar!', size: 32, color: GOLD, gap: 20 },
        { t: 'La amistad y el trabajo en equipo', size: 22, color: CREAM, gap: 6 },
        { t: 'siempre ganan.', size: 22, color: CREAM, gap: 50 }
      ].concat(G.ui.lineasMensajeJuanjo(GOLD, CREAM, '#7dd3fc'));
    }

    function enter() {
      lines = buildLines();
      scroll = 0;
      finished = false;
      // Calcular alto total para saber cuando termina el desfile.
      totalH = 0;
      for (var i = 0; i < lines.length; i++) {
        totalH += lines[i].size + (lines[i].gap || 12);
      }
      music('victory');
    }

    function update(dt) {
      // Avanzar el scroll salvo que ya llegara al final.
      var maxScroll = totalH + 80; // deja pasar todo por arriba
      if (scroll < maxScroll) {
        scroll += speed * dt;
      } else {
        finished = true;
      }
      // Los creditos NO se saltan con un Enter accidental: solo cuando ya han
      // terminado (aparece la escena final de Juanjo y Papa) se puede volver.
      if (finished && menuPressed('confirm')) {
        sfx('select');
        G.go('title');
      }
    }

    function render(ctx) {
      var t = now();
      // Fondo espacial bonito.
      if (!gfxCall('drawBgSpace', ctx, t * 24, t)) drawMenuBackdrop(ctx, t);
      ctx.save();
      ctx.fillStyle = 'rgba(6,4,18,0.35)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Dibujar lineas desplazandose hacia arriba.
      var y = H + 40 - scroll;
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        var lineTop = y;
        var centerY = lineTop + ln.size / 2;
        // Solo dibujar si esta visible (optimizacion + evita basura).
        if (centerY > -80 && centerY < H + 80) {
          if (ln.sprite) {
            // Mini desfile: personaje a la izquierda del texto.
            var spx = W / 2 - 150;
            var spScale = ln.spriteScale || (ln.sprite === 'toros' ? 0.55 : 0.85);
            var spDY = (typeof ln.spriteDY === 'number') ? ln.spriteDY : 34;
            gfxCall('draw' + ln.sprite.charAt(0).toUpperCase() + ln.sprite.slice(1),
              ctx, spx, centerY + spDY, { t: t, facing: 1, pose: 'idle', scale: spScale });
            outlinedText(ctx, ln.t, W / 2 + 40, centerY, ln.size, ln.color || '#fff', OUTLINE, Math.max(3, ln.size * 0.12), 'center');
          } else if (ln.t) {
            outlinedText(ctx, ln.t, W / 2, centerY, ln.size, ln.color || '#fff', OUTLINE, Math.max(3, ln.size * 0.12), 'center');
          }
        }
        y += ln.size + (ln.gap || 12);
      }

      // Cuando termina, la GRAN escena final: Juanjo y Papá juntos, como dos
      // amigos, con su corazoncito. Es el premio por ver todos los creditos.
      if (finished) {
        outlinedText(ctx, 'Creado con cariño por', W / 2, 88, 22, CREAM, OUTLINE, 4, 'center');
        outlinedText(ctx, 'Juanjo (10 años) y Papá', W / 2, 122, 28, '#fde68a', OUTLINE, 5, 'center');
        gfxCall('drawJuanjoPapaDuo', ctx, W / 2, H - 96, { t: t, scale: 1.7 });
        var blink = 0.6 + 0.4 * Math.sin(t * 5);
        ctx.save();
        ctx.globalAlpha = blink;
        plainText(ctx, 'Pulsa Enter para volver al inicio', W / 2, H - 26, 20, '#fde68a');
        ctx.restore();
      }
    }

    G.scenes = G.scenes || {};
    G.scenes.credits = { enter: enter, update: update, render: render };
  })();

})();
