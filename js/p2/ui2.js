// ============================================================================
// ui2.js — Interfaz de la PARTE 2 "La Gema Robada" (contrato técnico §9).
// Creado por Juanjo (Diseñador Jefe, 10 años) y Papá (Productor).
// Escenas: p2arsenal (armería / vehículo), levelDoneP2, p2next (puente),
//          creditsP2, mensajePapa, finalP2.
// Funciones: G.p2launch(n). Ayudas para ui.js: G.ui2.* (medalla, icono de
// arma, página de armas de "Cómo jugar" y overlay del código secreto).
// Mismo estilo visual que js/ui.js (helpers copiados aquí: no dependemos de
// sus funciones privadas). Todo menú se maneja SOLO con arriba/abajo/OK.
// Nunca lanza excepciones en update/render.
// ============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;

  // ---- Constantes visuales (las mismas que ui.js) ----
  var W = 960, H = 540;
  var OUTLINE = '#1a1a2e';
  var CREAM = '#fef3c7';
  var GOLD = '#fbbf24';
  var GOLD_DARK = '#d97706';
  var CYAN = '#22d3ee';
  var FONT = 'system-ui, "Segoe UI", Arial, sans-serif';

  // ==========================================================================
  // HELPERS (copiados del estilo de ui.js)
  // ==========================================================================
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
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

  function outlinedText(ctx, txt, x, y, size, fill, outline, lineW, align) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
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

  function plainText(ctx, txt, x, y, size, fill, align, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fill || '#ffffff';
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function wrapText(ctx, txt, maxWidth, size, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
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

  function drawMenuBackdrop(ctx, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1a4a');
    g.addColorStop(0.5, '#5b21b6');
    g.addColorStop(1, '#7c2d12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    for (var i = 0; i < 60; i++) {
      var sx = (i * 137.5) % W;
      var sy = (i * 79.3) % (H * 0.7);
      var tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      ctx.globalAlpha = 0.25 + 0.55 * tw;
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function gfxCall(name) {
    var fn = G.gfx && G.gfx[name];
    if (typeof fn !== 'function') return false;
    try { fn.apply(G.gfx, Array.prototype.slice.call(arguments, 1)); } catch (e) { /* nunca romper */ }
    return true;
  }

  // Arte de la Parte 2 (P2.call ya protege con try/catch y save/restore).
  function p2call() {
    try {
      if (!window.P2 || typeof window.P2.call !== 'function') return false;
      return !!window.P2.call.apply(window.P2, arguments);
    } catch (e) { return false; }
  }

  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) {} }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) {} }
  function now() { return (typeof G.T === 'number') ? G.T : (Date.now() / 1000); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  // Paso de tiempo seguro (las escenas cuentan su propio tiempo con dt, así
  // también funcionan cuando las pruebas simulan frames sin el bucle real).
  function stepDt(dt) { return (typeof dt === 'number' && dt > 0 && dt < 1) ? dt : 1 / 60; }

  function pressedOf(inp, action) {
    try { return !!(inp && inp.pressed && inp.pressed(action)); } catch (e) { return false; }
  }
  // Un menú lo puede manejar cualquiera de los dos mandos (como en ui.js).
  function menuPressed(action) { return pressedOf(G.input, action) || pressedOf(G.input2, action); }
  function isCoop() { return !!(G.state && G.state.coop); }

  // Protege update/render: nunca lanzar.
  function safe(fn) {
    return function (a) {
      try { return fn(a); } catch (e) {
        try { if (window.console && console.warn) console.warn('[ui2] ' + (e && e.message)); } catch (e2) {}
      }
    };
  }

  // Estrella de 5 puntas (rellena) centrada en (cx, cy).
  function starPath(ctx, cx, cy, r, inner) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = (Math.PI / 5) * i - Math.PI / 2;
      var rad = (i % 2 === 0) ? r : r * (inner || 0.45);
      var x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + 4 * s);
    ctx.bezierCurveTo(x - 7 * s, y - 4 * s, x - 14 * s, y + 3 * s, x, y + 14 * s);
    ctx.bezierCurveTo(x + 14 * s, y + 3 * s, x + 7 * s, y - 4 * s, x, y + 4 * s);
    ctx.closePath();
  }

  // ==========================================================================
  // DATOS DE LA PARTE 2 (con respaldo por si otro archivo aún no existe)
  // ==========================================================================
  var DEFAULT_FLOW2 = {
    chapters: {
      1: { story: 's2_cap1', scene: 'levelP2_1', arsenal: 'armas' },
      2: { story: 's2_cap2', scene: 'levelP2_2', arsenal: 'vehiculo', vehicle: 'transformable' },
      3: { story: 's2_cap3', scene: 'levelP2_3', arsenal: 'armas' },
      4: { story: 's2_cap4', scene: 'levelP2_4', arsenal: 'vehiculo', vehicle: 'mechahalcon' },
      5: { story: 's2_cap5', scene: 'levelP2_5', arsenal: 'armas' }
    },
    after: {
      1: { story: 's2_tras1' }, 2: { story: 's2_tras2' }, 3: { story: 's2_tras3' }, 4: { story: 's2_tras4' },
      5: { story: 's2_final', next: 'creditsP2' }
    }
  };
  var DEFAULT_NAMES = { 1: 'Ciudad atacada', 2: 'Carrera en robot', 3: 'Fábrica de robots', 4: 'Vuelo al cielo', 5: 'Fortaleza en el cielo' };
  var WEAPONS_DEF = ['espada', 'arco', 'guantes', 'pulso', 'bumeran', 'red', 'jetpack'];
  var INFO_DEF = {
    espada: { nombre: 'Espada', tipo: 'cuerpo', desc: 'Golpe rápido de cerca.' },
    arco: { nombre: 'Arco', tipo: 'distancia', desc: 'Flechas certeras desde lejos.' },
    guantes: { nombre: 'Guantes', tipo: 'cuerpo', desc: 'Puñetazo superfuerte: ¡quita el doble!' },
    pulso: { nombre: 'Pulso eléctrico', tipo: 'distancia', desc: 'Rayo corto que deja aturdidos a los robots.' },
    bumeran: { nombre: 'Escudo bumerán', tipo: 'distancia', desc: 'Para los disparos y vuelve a tu mano.' },
    red: { nombre: 'Lanza-redes', tipo: 'distancia', desc: 'Atrapa drones y robots pequeños.' },
    jetpack: { nombre: 'Jetpack', tipo: 'movimiento', desc: '¡Mantén el botón para volar! Gasta combustible.' }
  };
  var CLASSIC_DEF = { director: ['guantes', 'pulso'], falcon: ['espada', 'arco'] };

  function flow2() { return (G.flow2 && G.flow2.chapters) ? G.flow2 : DEFAULT_FLOW2; }
  function chapterName(n) {
    var names = G.p2chapterNames || DEFAULT_NAMES;
    return names[n] || DEFAULT_NAMES[n] || '';
  }
  function weapons() { return (G.p2 && Array.isArray(G.p2.WEAPONS)) ? G.p2.WEAPONS : WEAPONS_DEF; }
  function winfo(w) {
    var I = (G.p2 && G.p2.WEAPON_INFO) || INFO_DEF;
    return I[w] || INFO_DEF[w] || { nombre: String(w), tipo: 'cuerpo', desc: '' };
  }
  function classic(h) { return ((G.p2 && G.p2.CLASSIC) || CLASSIC_DEF)[h] || CLASSIC_DEF[h]; }
  function otherHero(h) { return h === 'falcon' ? 'director' : 'falcon'; }

  var HERO_INFO = {
    director: { nombre: 'Director America', color: '#60a5fa', frase: 'Listo y fuerte · salto simple' },
    falcon: { nombre: 'Lord Falcon', color: '#4ade80', frase: 'Ágil y veloz · ¡doble salto!' }
  };
  function heroName(h) { return (HERO_INFO[h] || HERO_INFO.director).nombre; }
  function heroShort(h) { return h === 'falcon' ? 'Falcon' : 'el Director'; }
  function drawHero(ctx, h, x, y, o) {
    gfxCall(h === 'falcon' ? 'drawFalcon' : 'drawDirector', ctx, x, y, o);
  }

  // Asegura que G.p2 existe (por si estado2.js faltara).
  function p2() {
    if (!G.p2) {
      G.p2 = { part: 1, unlocked: 1, medals: { 1: [false, false, false], 2: [false, false, false], 3: [false, false, false], 4: [false, false, false] },
        hero: 'director', loadout: { director: ['guantes', 'pulso'], falcon: ['espada', 'arco'] },
        vehicle: { transformable: 'A', mechahalcon: 'A' }, pendingChapter: 1, run: { medals: [false, false, false] } };
    }
    return G.p2;
  }
  function p2save() { try { if (G.p2save) G.p2save(); } catch (e) {} }

  // Valida una armería (usa la de estado2.js; respaldo local si no está).
  function fixLoadout(lo, first) {
    try { if (G.p2fixLoadout) return G.p2fixLoadout(lo, first); } catch (e) {}
    var list = weapons();
    var sec = otherHero(first);
    function fix(arr, h, busy) {
      var out = [];
      var src = (Array.isArray(arr) ? arr : []).concat(classic(h), list);
      for (var i = 0; i < src.length && out.length < 2; i++) {
        var w = src[i];
        if (list.indexOf(w) >= 0 && out.indexOf(w) < 0 && busy.indexOf(w) < 0) out.push(w);
      }
      return out;
    }
    var res = {};
    res[first] = fix(lo && lo[first], first, []);
    res[sec] = fix(lo && lo[sec], sec, res[first]);
    return { director: res.director, falcon: res.falcon };
  }

  // ==========================================================================
  // DIBUJOS PROPIOS (respaldo si falta el arte de arte-escenarios.js)
  // ==========================================================================
  var TIPO_COLOR = { cuerpo: '#f97316', distancia: '#0ea5e9', movimiento: '#a855f7' };

  function rf(ctx, x, y, w, h, r, fill, lw) {
    roundRect(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw || 2; ctx.stroke();
  }
  function circ(ctx, x, y, r, fill, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  // Dibujo del arma dentro de un círculo de radio 20 (se escala).
  function weaponGlyph(ctx, arma) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (arma === 'espada') {
      ctx.save(); ctx.rotate(-Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(-3, 5); ctx.lineTo(-3, -12); ctx.lineTo(0, -17); ctx.lineTo(3, -12); ctx.lineTo(3, 5); ctx.closePath();
      ctx.fillStyle = '#e5e7eb'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
      rf(ctx, -8, 4, 16, 4, 2, GOLD);
      rf(ctx, -2.2, 8, 4.4, 8, 2, '#78350f');
      circ(ctx, 0, 17, 2.4, GOLD, 1.5);
      ctx.restore();
    } else if (arma === 'arco') {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(-6, 0, 14, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.arc(-6, 0, 14, -1.15, 1.15); ctx.stroke();
      var ex = -6 + Math.cos(1.15) * 14, ey = Math.sin(1.15) * 14;
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(ex, -ey); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(13, 0); ctx.stroke();
      ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(13, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(11, -4.5); ctx.lineTo(11, 4.5); ctx.closePath();
      ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
    } else if (arma === 'guantes') {
      rf(ctx, -8, 6, 17, 7, 2.5, '#f8fafc');
      rf(ctx, -10, -12, 20, 20, 8, '#ef4444');
      rf(ctx, -13, -4, 8, 10, 4, '#dc2626');
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(-2, -7, 5, 2.4, -0.3, 0, Math.PI * 2); ctx.fill();
    } else if (arma === 'pulso') {
      ctx.beginPath();
      ctx.moveTo(4, -16); ctx.lineTo(-9, 2); ctx.lineTo(-1, 2); ctx.lineTo(-5, 16);
      ctx.lineTo(9, -3); ctx.lineTo(1, -3); ctx.lineTo(6, -16); ctx.closePath();
      ctx.fillStyle = '#fde047'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    } else if (arma === 'bumeran') {
      circ(ctx, 0, 0, 14, '#1d4ed8', 2.2);
      circ(ctx, 0, 0, 10, '#93c5fd', 1.5);
      circ(ctx, 0, 0, 6.5, '#1d4ed8', 1.5);
      starPath(ctx, 0, 0.5, 5, 0.45); ctx.fillStyle = GOLD; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 18, -2.6, -1.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 18, 0.5, 1.7); ctx.stroke();
    } else if (arma === 'red') {
      ctx.save();
      ctx.beginPath(); ctx.arc(-2, -3, 12, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
      ctx.clip();
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
      for (var i = -14; i <= 14; i += 6) {
        ctx.beginPath(); ctx.moveTo(-16 + i, -18); ctx.lineTo(12 + i, 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12 + i, -18); ctx.lineTo(-16 + i, 12); ctx.stroke();
      }
      ctx.restore();
      circ(ctx, -2, -3, 12, null, 2.4);
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(-2, -3, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(15, 15); ctx.stroke();
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(15, 15); ctx.stroke();
    } else if (arma === 'jetpack') {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath(); ctx.moveTo(-10, 7); ctx.lineTo(-6, 18); ctx.lineTo(-2, 7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, 7); ctx.lineTo(6, 18); ctx.lineTo(10, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.moveTo(-8, 7); ctx.lineTo(-6, 13); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(6, 13); ctx.lineTo(8, 7); ctx.closePath(); ctx.fill();
      rf(ctx, -12, -13, 10, 21, 5, '#cbd5e1');
      rf(ctx, 2, -13, 10, 21, 5, '#cbd5e1');
      rf(ctx, -4, -9, 8, 12, 2, '#ef4444');
      circ(ctx, -7, -8, 1.8, '#ffffff', 0);
      circ(ctx, 7, -8, 1.8, '#ffffff', 0);
    } else {
      plainText(ctx, '?', 0, 1, 22, CREAM);
    }
  }

  // Icono de arma: arte aprobado si existe; si no, el nuestro.
  function drawWeaponIcon(ctx, x, y, arma, size, ocupada) {
    size = size || 40;
    if (p2call('iconoArma', ctx, x, y, { arma: arma, size: size, ocupada: !!ocupada })) return;
    var r = size / 2;
    ctx.save();
    ctx.translate(x, y);
    var col = TIPO_COLOR[winfo(arma).tipo] || '#64748b';
    circ(ctx, 0, 0, r, ocupada ? '#475569' : col, Math.max(2, size * 0.07));
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.4, r * 0.5, r * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
    var k = r / 22;
    ctx.scale(k, k);
    if (ocupada) ctx.globalAlpha = 0.55;
    weaponGlyph(ctx, arma);
    ctx.restore();
  }

  // Medalla (HUD / listas). size = diámetro aproximado.
  function drawMedal(ctx, x, y, size, apagada, t) {
    size = size || 28;
    if (p2call('medalla', ctx, x, y, { t: (typeof t === 'number' ? t : now()), scale: size / 28, apagada: !!apagada })) return;
    var r = size / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    if (!apagada) {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 1.25); ctx.lineTo(-r * 0.15, -r * 0.4); ctx.lineTo(r * 0.15, -r * 0.4); ctx.lineTo(r * 0.7, -r * 1.25); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.stroke();
    }
    circ(ctx, 0, 0, r * 0.82, apagada ? '#4b5563' : GOLD, Math.max(1.5, r * 0.14));
    circ(ctx, 0, 0, r * 0.58, apagada ? '#374151' : GOLD_DARK, 0);
    starPath(ctx, 0, r * 0.04, r * 0.48, 0.45);
    ctx.fillStyle = apagada ? '#6b7280' : '#fef08a'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
    ctx.restore();
  }

  // Medalla grande (pantalla de capítulo completado). estado: 'nueva' | 'si' | 'guardada' | 'no'
  function drawBigMedal(ctx, x, y, estado, t) {
    var hasArt = !!(window.P2 && window.P2.fn && typeof window.P2.fn.medallaGrande === 'function');
    ctx.save();
    if (hasArt) {
      if (estado === 'guardada') ctx.globalAlpha = 0.55;
      p2call('medallaGrande', ctx, x, y - 4, { scale: 0.85, nueva: estado === 'nueva', apagada: estado === 'no' });
      ctx.restore();
      return;
    }
    if (estado === 'nueva') {
      // Halo que gira y late
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.8);
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 5);
      ctx.fillStyle = '#fde68a';
      for (var i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -78); ctx.lineTo(9, -78); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    if (estado === 'no') {
      // Hueco vacío
      if (ctx.setLineDash) ctx.setLineDash([7, 6]);
      ctx.strokeStyle = 'rgba(254,243,199,0.55)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([]);
      plainText(ctx, '?', x, y + 2, 40, 'rgba(254,243,199,0.6)');
      ctx.restore();
      return;
    }
    if (estado === 'guardada') ctx.globalAlpha = 0.5;
    drawMedal(ctx, x, y + 6, 84, false, t);
    ctx.restore();
  }

  // ==========================================================================
  // G.p2launch(n) — lanza el capítulo n de la Parte 2 (contrato §5)
  // ==========================================================================
  G.p2launch = function (n) {
    try {
      n = clamp(Math.floor(Number(n)) || 1, 1, 5);
      var P = p2();
      P.pendingChapter = n;
      if (G.p2resetRun) G.p2resetRun(); else P.run = { medals: [false, false, false] };
      var ch = flow2().chapters[n] || {};
      if (ch.story && G.storyData && G.storyData[ch.story]) {
        G.go('story', { id: ch.story, next: 'p2arsenal' });
      } else {
        G.go('p2arsenal');
      }
    } catch (e) {
      try { console.warn('[ui2] p2launch', e); } catch (e2) {}
    }
  };

  G.scenes = G.scenes || {};

  // ==========================================================================
  // ESCENA: p2arsenal — armería (cap. 1, 3, 5) o vehículo (cap. 2, 4)
  // ==========================================================================
  (function () {
    var chapter = 1;
    var mode = 'armas';        // 'armas' | 'vehiculo'
    var step = 'hero';         // 'hero' | 'p1' | 'p2' | 'ready' | 'vehiculo'
    var scene = 'levelP2_1';
    var hero = 'director';     // héroe del Jugador 1
    var work = null;           // armería en edición {director:[a,b], falcon:[a,b]}
    var slot = 0;              // ranura que se elige (0 = ataque, 1 = disparo)
    var cur = 0;               // cursor
    var vkey = 'transformable';
    var variant = 'A';
    var stepEl = 0;            // segundos desde que empezó el paso actual
    var msg = '', msgT = -99;

    var VEH = {
      transformable: {
        titulo: '¡Elige tu robot transformable!',
        A: { nombre: 'Bólido', frase: 'Bajo y rapidísimo: ¡pura velocidad!' },
        B: { nombre: 'Todoterreno', frase: 'Ruedas gigantes que saltan por encima de todo.' },
        piloto: 'Conduce: Director America',
        ayudaSolo: 'En el techo: Lord Falcon dispara flechas él solito.',
        ayudaCoop: 'En el techo: Lord Falcon (Jugador 2) con su arco.'
      },
      mechahalcon: {
        titulo: '¡Elige tu mecha-halcón!',
        A: { nombre: 'Gran halcón', frase: 'Alas enormes de plumas de metal: ¡majestuoso!' },
        B: { nombre: 'Halcón-jet', frase: 'Compacto y veloz como un avión a reacción.' },
        piloto: 'Pilota: Lord Falcon',
        ayudaSolo: 'A su lado: el Director vuela con su jetpack.',
        ayudaCoop: 'A su lado: el Director (Jugador 2) con jetpack.'
      }
    };

    function idx(w) { var i = weapons().indexOf(w); return i < 0 ? 0 : i; }
    function flash(t) { msg = t; msgT = now(); }

    // Armería de partida para el héroe h del Jugador 1. En 1 jugador, el
    // compañero automático prefiere sus armas clásicas; en 2 jugadores se
    // recuerda la última elección de cada uno.
    function buildWork(h) {
      var P = p2();
      var lo = P.loadout || {};
      var base = {};
      base[h] = (lo[h] || classic(h)).slice();
      base[otherHero(h)] = isCoop() ? (lo[otherHero(h)] || classic(otherHero(h))).slice() : classic(otherHero(h)).slice();
      return fixLoadout(base, h);
    }

    function enter(params) {
      params = params || {};
      var P = p2();
      var n = parseInt(params.chapter, 10);
      if (!(n >= 1 && n <= 5)) n = parseInt(P.pendingChapter, 10) || 1;
      chapter = clamp(n, 1, 5);
      P.pendingChapter = chapter;
      var ch = flow2().chapters[chapter] || {};
      scene = ch.scene || ('levelP2_' + chapter);
      mode = (ch.arsenal === 'vehiculo') ? 'vehiculo' : 'armas';
      if (mode === 'vehiculo') {
        vkey = (ch.vehicle === 'mechahalcon') ? 'mechahalcon' : 'transformable';
        variant = (P.vehicle && P.vehicle[vkey] === 'B') ? 'B' : 'A';
        cur = (variant === 'B') ? 1 : 0;
        step = 'vehiculo';
      } else {
        hero = (P.hero === 'falcon') ? 'falcon' : 'director';
        work = buildWork(hero);
        cur = (hero === 'falcon') ? 1 : 0;
        step = 'hero';
      }
      slot = 0;
      stepEl = 0;
      msg = ''; msgT = -99;
      music('title');
    }

    function goStep(s) { step = s; stepEl = 0; }

    function commitAndGo() {
      var P = p2();
      if (mode === 'vehiculo') {
        P.vehicle = P.vehicle || { transformable: 'A', mechahalcon: 'A' };
        P.vehicle[vkey] = variant;
      } else {
        P.hero = hero;
        P.loadout = { director: work.director.slice(), falcon: work.falcon.slice() };
      }
      p2save();
      sfx('select');
      if (G.scenes && G.scenes[scene]) {
        G.go(scene);
      } else {
        try { console.warn('[ui2] La escena "' + scene + '" aún no existe.'); } catch (e) {}
        G.go('title');
      }
    }

    // Elegir el arma w para la ranura actual del héroe hk.
    function choose(hk, w) {
      var oh = otherHero(hk);
      var mine = work[hk].slice();
      // En el turno del Jugador 2, las armas del Jugador 1 están ocupadas de verdad.
      if (step === 'p2' && work[oh].indexOf(w) >= 0) {
        sfx('clink');
        flash('¡Esa la lleva ' + heroShort(oh) + '! Elige otra.');
        return;
      }
      if (slot === 1 && mine[0] === w) {
        sfx('clink');
        flash('¡Esa ya la llevas en el otro botón! Elige otra.');
        return;
      }
      var prestada = work[oh].indexOf(w) >= 0;
      if (slot === 0 && mine[1] === w) mine[1] = mine[0];
      mine[slot] = w;
      var nw = {};
      nw[hk] = mine;
      nw[oh] = work[oh].slice();
      work = fixLoadout(nw, hk);
      if (prestada) {
        sfx('pickup');
        flash((oh === 'falcon' ? 'Lord Falcon' : 'El Director') + ' te presta: ' + winfo(w).nombre + '. ¡Así se ayudan los amigos!');
      } else {
        sfx('select');
      }
      if (slot === 0) {
        slot = 1;
        cur = idx(work[hk][1]);
      } else {
        finishPlayer();
      }
    }

    function finishPlayer() {
      if (step === 'p1') {
        if (isCoop()) {
          work = fixLoadout(work, hero);
          slot = 0;
          cur = idx(work[otherHero(hero)][0]);
          goStep('p2');
        } else {
          // Compañero automático: 2 armas libres, prefiere sus clásicas.
          var nw = {};
          nw[hero] = work[hero].slice();
          nw[otherHero(hero)] = classic(otherHero(hero)).slice();
          work = fixLoadout(nw, hero);
          goStep('ready');
        }
      } else {
        goStep('ready');
      }
    }

    function weaponStep(inp, hk) {
      var n = weapons().length;
      var up = pressedOf(inp, 'up') || pressedOf(inp, 'left');
      var down = pressedOf(inp, 'down') || pressedOf(inp, 'right');
      var pick = pressedOf(inp, 'confirm') || pressedOf(inp, 'attack');
      var back = menuPressed('pause');
      if (up) { cur = (cur + n - 1) % n; sfx('select'); }
      if (down) { cur = (cur + 1) % n; sfx('select'); }
      if (back) {
        sfx('select');
        if (slot === 1) { slot = 0; cur = idx(work[hk][0]); }
        else if (step === 'p2') { goStep('p1'); slot = 1; cur = idx(work[hero][1]); }
        else { goStep('hero'); cur = (hero === 'falcon') ? 1 : 0; }
        return;
      }
      if (pick) choose(hk, weapons()[cur]);
    }

    function update(dt) {
      stepEl += stepDt(dt);
      var coop = isCoop();
      var i1 = G.input;
      var i2 = coop ? G.input2 : G.input;
      if (step === 'hero') {
        var mv = pressedOf(i1, 'up') || pressedOf(i1, 'down') || pressedOf(i1, 'left') || pressedOf(i1, 'right');
        if (mv) {
          cur = cur ? 0 : 1;
          hero = cur ? 'falcon' : 'director';
          work = buildWork(hero);
          sfx('select');
        }
        if (pressedOf(i1, 'confirm') || pressedOf(i1, 'attack')) {
          sfx('select');
          slot = 0;
          cur = idx(work[hero][0]);
          goStep('p1');
        }
      } else if (step === 'p1') {
        weaponStep(i1, hero);
      } else if (step === 'p2') {
        weaponStep(i2, otherHero(hero));
      } else if (step === 'ready') {
        if (stepEl < 0.15) return;
        if (menuPressed('pause')) {
          sfx('select');
          if (coop) { goStep('p2'); slot = 1; cur = idx(work[otherHero(hero)][1]); }
          else { goStep('p1'); slot = 1; cur = idx(work[hero][1]); }
          return;
        }
        if (menuPressed('confirm') || pressedOf(G.input, 'attack')) commitAndGo();
      } else if (step === 'vehiculo') {
        var mv2 = pressedOf(i1, 'up') || pressedOf(i1, 'down') || pressedOf(i1, 'left') || pressedOf(i1, 'right');
        if (mv2) { cur = cur ? 0 : 1; variant = cur ? 'B' : 'A'; sfx('select'); }
        if (pressedOf(i1, 'confirm') || pressedOf(i1, 'attack')) commitAndGo();
      }
    }

    // ------------------------------------------------------------------ render
    function drawArmoryBackdrop(ctx, t) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f172a');
      g.addColorStop(0.55, '#312e81');
      g.addColorStop(1, '#4c1d95');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Rejilla tecnológica suave
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.strokeStyle = '#a5b4fc';
      ctx.lineWidth = 1;
      for (var x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 430); ctx.stroke(); }
      for (var y = 0; y <= 430; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
      // Estrellitas
      ctx.save();
      for (var i = 0; i < 36; i++) {
        var sx = (i * 137.5) % W, sy = (i * 61.7) % 380;
        ctx.globalAlpha = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3));
        ctx.fillStyle = '#e0e7ff';
        ctx.beginPath(); ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // Suelo
      var fg = ctx.createLinearGradient(0, 430, 0, H);
      fg.addColorStop(0, '#1e1b4b');
      fg.addColorStop(1, '#0b1020');
      ctx.fillStyle = fg;
      ctx.fillRect(0, 430, W, H - 430);
      ctx.save();
      ctx.strokeStyle = 'rgba(165,180,252,0.18)';
      ctx.lineWidth = 2;
      for (var k = -8; k <= 8; k++) {
        ctx.beginPath(); ctx.moveTo(W / 2 + k * 40, 430); ctx.lineTo(W / 2 + k * 140, H); ctx.stroke();
      }
      ctx.strokeStyle = '#818cf8';
      ctx.beginPath(); ctx.moveTo(0, 430); ctx.lineTo(W, 430); ctx.stroke();
      ctx.restore();
    }

    function spotlight(ctx, x, y, r, col) {
      ctx.save();
      var g = ctx.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, col || 'rgba(253,230,138,0.45)');
      g.addColorStop(1, 'rgba(253,230,138,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }

    function pedestal(ctx, x, y, w, active) {
      ctx.save();
      ctx.fillStyle = active ? GOLD : '#475569';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y + 6, w / 2, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? '#fde68a' : '#64748b';
      ctx.beginPath(); ctx.ellipse(x, y, w / 2, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    function header(ctx, titulo) {
      outlinedText(ctx, titulo, W / 2, 36, 36, GOLD, OUTLINE, 6, 'center');
      plainText(ctx, 'Capítulo ' + chapter + ' · ' + chapterName(chapter), W / 2, 70, 19, '#c7d2fe');
    }

    // Etiquetas de teclas de cada jugador.
    function slotKeys(player) {
      if (!isCoop()) return ['J', 'K'];
      return player === 2 ? ['K', 'L'] : ['F', 'G'];
    }

    // Barra de teclas de abajo.
    function keysBar(ctx, txt) {
      ctx.save();
      ctx.font = 'bold 16px ' + FONT;
      var w = ctx.measureText(txt).width + 40;
      ctx.fillStyle = 'rgba(10,8,25,0.78)';
      ctx.strokeStyle = 'rgba(251,191,36,0.75)'; ctx.lineWidth = 2;
      roundRect(ctx, W / 2 - w / 2, H - 38, w, 28, 14);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      plainText(ctx, txt, W / 2, H - 24, 16, CREAM);
    }

    function navKeys(player, cogerTxt) {
      if (!isCoop()) return '↑ ↓ elegir  ·  Enter ' + cogerTxt + '  ·  Esc atrás';
      if (player === 2) return 'Jugador 2:  ↑ ↓ elegir  ·  Enter o K ' + cogerTxt + '  ·  Esc atrás';
      return 'Jugador 1:  W S elegir  ·  Espacio o F ' + cogerTxt + '  ·  Esc atrás';
    }

    function drawFlash(ctx, y) {
      var age = now() - msgT;
      if (!msg || age > 2.6) return;
      var a = age < 2 ? 1 : (2.6 - age) / 0.6;
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = 'bold 17px ' + FONT;
      var w = ctx.measureText(msg).width + 36;
      ctx.fillStyle = 'rgba(20,14,40,0.95)';
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
      roundRect(ctx, W / 2 - w / 2, y - 17, w, 34, 12);
      ctx.fill(); ctx.stroke();
      plainText(ctx, msg, W / 2, y, 17, CREAM);
      ctx.restore();
    }

    // --- Paso 1: elegir héroe ---
    function renderHero(ctx, t) {
      header(ctx, 'Armería · ¿Con quién juegas?');
      var xs = { director: 250, falcon: 710 };
      var hs = ['director', 'falcon'];
      for (var i = 0; i < 2; i++) {
        var h = hs[i];
        var sel = (h === hero);
        var x = xs[h];
        var fy = 360;
        if (sel) spotlight(ctx, x, fy - 80, 190);
        pedestal(ctx, x, fy, 170, sel);
        ctx.save();
        if (!sel) ctx.globalAlpha = 0.55;
        drawHero(ctx, h, x, fy + (sel ? Math.sin(t * 4) * 3 : 0), {
          t: t, facing: h === 'director' ? 1 : -1, pose: sel ? 'win' : 'idle', scale: 2.6
        });
        ctx.restore();
        // Tarjeta con el nombre
        var cw = 300, ch = 66, cx = x - cw / 2, cy = 392;
        ctx.save();
        ctx.fillStyle = sel ? 'rgba(251,191,36,0.95)' : 'rgba(20,14,40,0.8)';
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = sel ? 4 : 2;
        roundRect(ctx, cx, cy, cw, ch, 14);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        plainText(ctx, HERO_INFO[h].nombre, x, cy + 22, 24, sel ? '#3b1f05' : CREAM);
        plainText(ctx, HERO_INFO[h].frase, x, cy + 48, 16, sel ? '#5b3410' : '#cbd5e1');
        // Quién lo lleva
        var tag = sel ? 'Jugador 1' : (isCoop() ? 'Jugador 2' : 'Compañero automático');
        outlinedText(ctx, tag, x, 112, 20, sel ? GOLD : '#a5b4fc', OUTLINE, 4, 'center');
      }
      // Flechas centrales
      var pulse = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.save();
      ctx.globalAlpha = pulse;
      outlinedText(ctx, '◀  ▶', W / 2, 270, 34, CREAM, OUTLINE, 5, 'center');
      ctx.restore();
      plainText(ctx, isCoop() ? 'El Jugador 2 llevará al otro héroe.' : 'El otro héroe te ayudará él solo.', W / 2, 318, 16, '#c7d2fe');
      keysBar(ctx, isCoop() ? 'Jugador 1:  W S cambiar  ·  Espacio o F elegir'
                            : '↑ ↓ cambiar de héroe  ·  Enter elegir');
    }

    // Caja de una ranura de arma (icono + tecla + nombre).
    function slotBox(ctx, x, y, w, key, arma, active, t) {
      ctx.save();
      var blink = active ? (0.65 + 0.35 * Math.sin(t * 7)) : 1;
      ctx.fillStyle = active ? 'rgba(251,191,36,0.22)' : 'rgba(15,10,35,0.78)';
      ctx.strokeStyle = active ? 'rgba(251,191,36,' + blink.toFixed(2) + ')' : 'rgba(165,180,252,0.5)';
      ctx.lineWidth = active ? 4 : 2;
      roundRect(ctx, x, y, w, 44, 12);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      // tecla (el compañero automático no tiene teclas)
      var off = 0;
      if (key) {
        ctx.save();
        ctx.fillStyle = CREAM; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
        roundRect(ctx, x + 8, y + 9, 26, 26, 6);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        plainText(ctx, key, x + 21, y + 23, 16, '#1e293b');
        off = 34;
      }
      drawWeaponIcon(ctx, x + 22 + off, y + 22, arma, 34, false);
      plainText(ctx, winfo(arma).nombre, x + 46 + off, y + 23, 16, CREAM, 'left');
    }

    // --- Paso 2/3: elegir armas ---
    function renderWeapons(ctx, t) {
      var player = (step === 'p2') ? 2 : 1;
      var hk = (player === 2) ? otherHero(hero) : hero;
      var oh = otherHero(hk);
      var keys = slotKeys(player);
      var okeys = (player === 1 && !isCoop()) ? ['', ''] : slotKeys(player === 2 ? 1 : 2);
      header(ctx, 'Armería');

      // Héroe que elige (izquierda) y el otro (derecha)
      spotlight(ctx, 130, 230, 150);
      pedestal(ctx, 130, 300, 140, true);
      drawHero(ctx, hk, 130, 300 + Math.sin(t * 3) * 2, { t: t, facing: 1, pose: 'idle', scale: 2.2 });
      outlinedText(ctx, heroName(hk), 130, 112, 19, HERO_INFO[hk].color, OUTLINE, 4, 'center');
      plainText(ctx, (player === 2) ? 'Jugador 2' : 'Jugador 1', 130, 136, 15, GOLD);
      slotBox(ctx, 16, 330, 230, keys[0], work[hk][0], slot === 0, t);
      slotBox(ctx, 16, 382, 230, keys[1], work[hk][1], slot === 1, t);

      pedestal(ctx, 830, 300, 120, false);
      ctx.save(); ctx.globalAlpha = 0.75;
      drawHero(ctx, oh, 830, 300, { t: t, facing: -1, pose: 'idle', scale: 1.9 });
      ctx.restore();
      outlinedText(ctx, heroName(oh), 830, 112, 19, HERO_INFO[oh].color, OUTLINE, 4, 'center');
      var otag = (player === 2) ? 'Jugador 1' : (isCoop() ? 'Jugador 2' : 'Compañero automático');
      plainText(ctx, otag, 830, 136, 15, '#a5b4fc');
      slotBox(ctx, 714, 330, 230, okeys[0], work[oh][0], false, t);
      slotBox(ctx, 714, 382, 230, okeys[1], work[oh][1], false, t);

      // Instrucción
      var accion = slot === 0 ? (keys[0] + ' (ataque)') : (keys[1] + ' (disparo)');
      outlinedText(ctx, 'Elige el arma para el botón ' + accion, W / 2, 104, 19, CREAM, OUTLINE, 4, 'center');

      // Lista de las 7 armas
      var list = weapons();
      var lx = 262, lw = 436, ly = 122, rowH = 44;
      for (var i = 0; i < list.length; i++) {
        var w = list[i];
        var y = ly + i * rowH;
        var sel = (i === cur);
        var mineSlot = work[hk].indexOf(w);
        var otherHas = work[oh].indexOf(w) >= 0;
        var locked = otherHas && step === 'p2';
        ctx.save();
        if (sel) {
          ctx.fillStyle = locked ? 'rgba(100,116,139,0.95)' : GOLD;
          ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
          roundRect(ctx, lx, y, lw, rowH - 4, 12);
          ctx.fill(); ctx.stroke();
          // flechita
          ctx.fillStyle = CREAM;
          ctx.beginPath(); ctx.moveTo(lx - 16, y + 12); ctx.lineTo(lx - 4, y + 20); ctx.lineTo(lx - 16, y + 28); ctx.closePath();
          ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
        } else {
          ctx.fillStyle = (i % 2 === 0) ? 'rgba(15,10,35,0.72)' : 'rgba(30,22,60,0.72)';
          roundRect(ctx, lx, y, lw, rowH - 4, 12);
          ctx.fill();
        }
        ctx.restore();
        var dim = otherHas;
        drawWeaponIcon(ctx, lx + 24, y + 20, w, 32, dim);
        var info = winfo(w);
        var nameCol = sel ? (locked ? '#e5e7eb' : '#3b1f05') : (dim ? '#94a3b8' : CREAM);
        var descCol = sel ? (locked ? '#e2e8f0' : '#5b3410') : (dim ? '#7c8aa0' : '#c7d2fe');
        plainText(ctx, info.nombre, lx + 48, y + 11, 17, nameCol, 'left');
        plainText(ctx, info.desc || '', lx + 48, y + 29, 13, descCol, 'left', '600');
        // Marca a la derecha
        var bx = lx + lw - 10;
        if (mineSlot >= 0) {
          ctx.save();
          ctx.fillStyle = '#22c55e'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
          roundRect(ctx, bx - 46, y + 8, 46, 24, 8);
          ctx.fill(); ctx.stroke();
          ctx.restore();
          plainText(ctx, '✔ ' + keys[mineSlot], bx - 23, y + 20, 14, '#ffffff');
        } else if (otherHas) {
          gfxCall('drawPortrait', ctx, oh, bx - 30, y + 5, 30);
          plainText(ctx, locked ? 'Ocupada' : 'La lleva ' + (oh === 'falcon' ? 'Falcon' : 'Director'),
            bx - 36, y + 20, 12, sel ? (locked ? '#f1f5f9' : '#7c2d12') : '#fca5a5', 'right');
        }
      }
      drawFlash(ctx, 470);
      keysBar(ctx, navKeys(player, 'coger'));
    }

    // --- Paso 4: ¡Listos! ---
    function renderReady(ctx, t) {
      var el = stepEl;
      var pop = Math.min(1, el * 3);
      var sc = 0.6 + 0.4 * (1 - Math.pow(1 - pop, 3));
      ctx.save();
      ctx.translate(W / 2, 54);
      ctx.scale(sc, sc);
      outlinedText(ctx, '¡Listos!', 0, 0, 54, GOLD, OUTLINE, 8, 'center');
      ctx.restore();
      plainText(ctx, 'Capítulo ' + chapter + ' · ' + chapterName(chapter), W / 2, 96, 19, '#c7d2fe');

      var hs = [hero, otherHero(hero)];
      var xs = [270, 690];
      for (var i = 0; i < 2; i++) {
        var h = hs[i];
        var x = xs[i];
        spotlight(ctx, x, 230, 170);
        pedestal(ctx, x, 320, 160, true);
        drawHero(ctx, h, x, 320 + Math.sin(t * 4 + i) * 3, { t: t + i, facing: i === 0 ? 1 : -1, pose: 'win', scale: 2.5 });
        outlinedText(ctx, heroName(h), x, 128, 22, HERO_INFO[h].color, OUTLINE, 4, 'center');
        var tag = i === 0 ? 'Jugador 1' : (isCoop() ? 'Jugador 2' : 'Compañero automático');
        plainText(ctx, tag, x, 152, 15, i === 0 ? GOLD : '#a5b4fc');
        var keys = slotKeys(i === 0 ? 1 : 2);
        if (!isCoop() && i === 1) keys = ['', ''];
        for (var s = 0; s < 2; s++) {
          var bx = x - 175 + s * 180;
          slotBoxReady(ctx, bx, 352, 170, keys[s], work[h][s]);
        }
      }
      plainText(ctx, 'Hackear: ' + (isCoop() ? 'R (Jugador 1) · Ñ u O (Jugador 2)' : 'H'), W / 2, 420, 16, CYAN);
      var blink = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.save(); ctx.globalAlpha = blink;
      outlinedText(ctx, '¡A la aventura!', W / 2, 462, 26, '#fde68a', OUTLINE, 4, 'center');
      ctx.restore();
      keysBar(ctx, 'Enter ¡a jugar!  ·  Esc cambiar las armas');
    }

    function slotBoxReady(ctx, x, y, w, key, arma) {
      ctx.save();
      ctx.fillStyle = 'rgba(15,10,35,0.82)';
      ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.lineWidth = 2;
      roundRect(ctx, x, y, w, 44, 12);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      var off = 0;
      if (key) {
        ctx.save();
        ctx.fillStyle = CREAM; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
        roundRect(ctx, x + 7, y + 9, 26, 26, 6);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        plainText(ctx, key, x + 20, y + 23, 16, '#1e293b');
        off = 30;
      }
      drawWeaponIcon(ctx, x + 26 + off, y + 22, arma, 32, false);
      ctx.save();
      ctx.font = 'bold 15px ' + FONT;
      var nm = winfo(arma).nombre;
      var maxW = w - (48 + off);
      if (ctx.measureText(nm).width > maxW) ctx.font = 'bold 12px ' + FONT;
      ctx.fillStyle = CREAM; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(nm, x + 46 + off, y + 23);
      ctx.restore();
    }

    // --- Vehículo (cap. 2 y 4) ---
    function drawVehicle(ctx, v, x, y, big, t) {
      if (vkey === 'transformable') {
        if (big) {
          p2call('transformableRobot', ctx, x - 130, y, { variant: v, scale: 1.75, facing: 1 });
          p2call('transformableCoche', ctx, x + 120, y, { variant: v, scale: v === 'B' ? 1.45 : 1.65, facing: 1, boost: Math.sin(t * 3) > 0 });
        } else {
          p2call('transformableCoche', ctx, x, y, { variant: v, scale: v === 'B' ? 0.5 : 0.62, facing: 1 });
        }
      } else {
        if (big) {
          p2call('mechaHalcon', ctx, x - 40, y - 150 + Math.sin(t * 2.2) * 8, { variant: v, modo: 'vuelo', scale: v === 'B' ? 1.85 : 1.6, facing: 1 });
          p2call('mechaHalcon', ctx, x + 190, y, { variant: v, modo: 'posado', scale: v === 'B' ? 1.15 : 0.95, facing: -1 });
        } else {
          p2call('mechaHalcon', ctx, x, y - 22, { variant: v, modo: 'vuelo', scale: v === 'B' ? 0.42 : 0.4, facing: 1 });
        }
      }
    }

    function renderVehicle(ctx, t) {
      var V = VEH[vkey];
      header(ctx, V.titulo);
      // Escenario del vehículo elegido
      var sx = 300, sy = 410;
      spotlight(ctx, sx, 300, 260);
      ctx.save();
      ctx.fillStyle = 'rgba(253,230,138,0.18)';
      ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(sx, sy + 8, 270, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      drawVehicle(ctx, variant, sx, sy, true, t);
      // Nombre grande
      outlinedText(ctx, V[variant].nombre, sx, 112, 40, GOLD, OUTLINE, 6, 'center');
      plainText(ctx, V[variant].frase, sx, 146, 17, CREAM);

      // Opciones A / B (derecha)
      var ox = 620, ow = 310;
      for (var i = 0; i < 2; i++) {
        var v = i ? 'B' : 'A';
        var sel = (v === variant);
        var oy = 110 + i * 130;
        ctx.save();
        if (sel) {
          var pulse = 1 + Math.sin(t * 6) * 0.015;
          ctx.translate(ox + ow / 2, oy + 55); ctx.scale(pulse, pulse); ctx.translate(-(ox + ow / 2), -(oy + 55));
        }
        ctx.fillStyle = sel ? GOLD : 'rgba(20,14,40,0.82)';
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = sel ? 4 : 2;
        roundRect(ctx, ox, oy, ow, 110, 16);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = sel ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.06)';
        roundRect(ctx, ox + 10, oy + 10, 110, 90, 12);
        ctx.fill();
        drawVehicle(ctx, v, ox + 65, oy + 86, false, t);
        ctx.restore();
        plainText(ctx, v + ' · ' + V[v].nombre, ox + 132, oy + 36, 22, sel ? '#3b1f05' : CREAM, 'left');
        var lines = wrapText(ctx, V[v].frase, ow - 145, 14, '600');
        for (var l = 0; l < lines.length && l < 3; l++) {
          plainText(ctx, lines[l], ox + 132, oy + 62 + l * 18, 14, sel ? '#5b3410' : '#c7d2fe', 'left', '600');
        }
      }
      // Quién va
      ctx.save();
      ctx.fillStyle = 'rgba(15,10,35,0.8)';
      ctx.strokeStyle = 'rgba(34,211,238,0.7)'; ctx.lineWidth = 2;
      roundRect(ctx, ox, 384, ow, 64, 14);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      plainText(ctx, V.piloto, ox + ow / 2, 404, 16, CYAN);
      ctx.save();
      var ayuda = isCoop() ? V.ayudaCoop : V.ayudaSolo;
      var al = wrapText(ctx, ayuda, ow - 20, 13, '600');
      for (var j = 0; j < al.length && j < 2; j++) plainText(ctx, al[j], ox + ow / 2, 424 + j * 16, 13, CREAM, 'center', '600');
      ctx.restore();
      keysBar(ctx, isCoop() ? 'Jugador 1:  W S cambiar  ·  Espacio o F ¡en marcha!'
                            : '↑ ↓ cambiar  ·  Enter ¡en marcha!');
    }

    function render(ctx) {
      var t = now();
      drawArmoryBackdrop(ctx, t);
      if (step === 'hero') renderHero(ctx, t);
      else if (step === 'p1' || step === 'p2') renderWeapons(ctx, t);
      else if (step === 'ready') renderReady(ctx, t);
      else renderVehicle(ctx, t);
    }

    G.scenes.p2arsenal = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: levelDoneP2 {chapter} — capítulo completado
  // ==========================================================================
  (function () {
    var chapter = 1;
    var el = 0;
    var estados = ['no', 'no', 'no'];   // por medalla: 'nueva' | 'si' | 'guardada' | 'no'
    var sonadas = [false, false, false];

    function enter(params) {
      params = params || {};
      var P = p2();
      var n = parseInt(params.chapter, 10);
      chapter = clamp((n >= 1 && n <= 5) ? n : (parseInt(P.pendingChapter, 10) || 1), 1, 5);
      P.pendingChapter = chapter;
      var run = (P.run && Array.isArray(P.run.medals)) ? P.run.medals : [false, false, false];
      estados = ['no', 'no', 'no'];
      if (chapter <= 4) {
        P.medals = P.medals || {};
        var saved = Array.isArray(P.medals[chapter]) ? P.medals[chapter].slice() : [false, false, false];
        var merged = [false, false, false];
        for (var i = 0; i < 3; i++) {
          var r = run[i] === true, s = saved[i] === true;
          estados[i] = r ? (s ? 'si' : 'nueva') : (s ? 'guardada' : 'no');
          merged[i] = r || s;
        }
        P.medals[chapter] = merged;
      }
      P.unlocked = Math.min(5, Math.max(parseInt(P.unlocked, 10) || 1, chapter + 1));
      p2save();
      if (chapter === 5 && typeof G.p3markP2Done === 'function') { try { G.p3markP2Done(); } catch (e) {} }   // Parte 3 (contrato §3)
      sonadas = [false, false, false];
      el = 0;
      sfx('victory');
    }

    function goNext() {
      var after = (flow2().after || {})[chapter] || {};
      var next = after.next || 'p2next';
      if (after.story && G.storyData && G.storyData[after.story]) {
        G.go('story', { id: after.story, next: next });
      } else {
        G.go(next);
      }
    }

    function update(dt) {
      el += stepDt(dt);
      // Un "¡clin!" por cada medalla conseguida cuando aparece.
      for (var i = 0; i < 3; i++) {
        if (!sonadas[i] && el > 0.3 + i * 0.25) {
          sonadas[i] = true;
          if (chapter <= 4 && (estados[i] === 'nueva' || estados[i] === 'si')) sfx('medal');
        }
      }
      // El nombre empieza por "level": en móvil se ven los botones de juego (sin OK),
      // así que SALTO o ATAQUE también sirven para continuar.
      if (el > 0.5 && (menuPressed('confirm') || pressedOf(G.input, 'jump') || pressedOf(G.input, 'attack'))) {
        sfx('select');
        goNext();
      }
    }

    function render(ctx) {
      var t = now();
      drawMenuBackdrop(ctx, t);
      for (var i = 0; i < 24; i++) {
        var ang = (i / 24) * Math.PI * 2;
        var rr = 120 + Math.sin(t * 1.5 + i) * 20;
        gfxCall('drawSparkle', ctx, W / 2 + Math.cos(ang + t * 0.4) * rr * 1.9, 240 + Math.sin(ang + t * 0.4) * rr * 0.8,
          (Math.sin(t * 3 + i) + 1) / 2);
      }
      var pop = Math.min(1, el * 3);
      var scale = 0.6 + 0.4 * (1 - Math.pow(1 - pop, 3));
      ctx.save();
      ctx.translate(W / 2, 74);
      ctx.scale(scale, scale);
      outlinedText(ctx, '¡Capítulo ' + chapter + ' completado!', 0, 0, 50, GOLD, OUTLINE, 8, 'center');
      ctx.restore();
      outlinedText(ctx, chapterName(chapter), W / 2, 126, 28, '#a5f3fc', OUTLINE, 5, 'center');
      if (isCoop()) {
        outlinedText(ctx, '¡Gran trabajo en equipo, héroes!', W / 2, 162 + Math.sin(t * 2.4) * 3, 22, '#fde68a', OUTLINE, 4, 'center');
      }

      if (chapter <= 4) {
        var labels = { nueva: '¡NUEVA!', si: '¡Conseguida!', guardada: 'Ya la tenías', no: 'Escondida' };
        for (var s = 0; s < 3; s++) {
          var mx = W / 2 + (s - 1) * 160;
          var my = 262;
          // Siempre visibles: aparecen con un pequeño "pop" escalonado.
          var appear = clamp(el * 3 - s * 0.35, 0, 1);
          var sc = 0.55 + 0.45 * (1 - Math.pow(1 - appear, 3));
          var bounce = appear < 1 ? (1 + Math.sin(appear * Math.PI) * 0.15) : 1;
          ctx.save();
          ctx.translate(mx, my + Math.sin(t * 3 + s) * 3);
          ctx.scale(sc * bounce, sc * bounce);
          drawBigMedal(ctx, 0, 0, estados[s], t + s);
          ctx.restore();
          var lc = estados[s] === 'nueva' ? '#fde047' : (estados[s] === 'no' ? 'rgba(254,243,199,0.6)' : CREAM);
          outlinedText(ctx, labels[estados[s]], mx, 334, estados[s] === 'nueva' ? 22 : 18, lc, OUTLINE, 4, 'center');
        }
      } else {
        // Capítulo 5: la gema se rompió y Dark Secuaz es libre (y bueno).
        // Trocitos de la gema rota flotando a los lados, apagándose.
        for (var f = 0; f < 6; f++) {
          var fa = f * Math.PI / 3 + t * 0.6;
          var fx = W / 2 + Math.cos(fa) * 128, fy = 262 + Math.sin(fa) * 30;
          ctx.save();
          ctx.translate(fx, fy); ctx.rotate(t * 1.5 + f); ctx.scale(1.5, 1.5);
          ctx.globalAlpha = 0.65 + 0.3 * Math.sin(t * 3 + f);
          ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 4); ctx.lineTo(-6, 6); ctx.closePath();
          ctx.fillStyle = f % 2 ? '#e11d48' : '#a21caf'; ctx.fill();
          ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        }
        if (!p2call('secuaz', ctx, W / 2, 314 + Math.sin(t * 3) * 3, { scale: 0.6, good: true })) {
          p2call('gemaPoder', ctx, W / 2, 262, { scale: 1.6, t: t, rota: 0.85 });
        }
        outlinedText(ctx, '¡Dark Secuaz es libre y la gema ya no hará daño!', W / 2, 342, 26, '#bbf7d0', OUTLINE, 5, 'center');
      }

      // Total de medallas
      var total = 0;
      try { total = G.p2medalTotal ? G.p2medalTotal() : 0; } catch (e) { total = 0; }
      drawMedal(ctx, W / 2 - 92, 384, 30, false, t);
      outlinedText(ctx, 'Medallas: ' + total + '/12', W / 2 + 14, 384, 26, CREAM, OUTLINE, 5, 'center');

      // Héroes celebrando
      gfxCall('drawDirector', ctx, 150, 470 + Math.sin(t * 4) * 5, { t: t, facing: 1, pose: 'win', scale: 1.8 });
      gfxCall('drawFalcon', ctx, 810, 470 + Math.sin(t * 4 + 1.5) * 5, { t: t + 1, facing: -1, pose: 'win', scale: 1.8 });

      var blink = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.save(); ctx.globalAlpha = blink;
      plainText(ctx, 'Pulsa Enter para continuar', W / 2, H - 24, 22, CREAM);
      ctx.restore();
    }

    G.scenes.levelDoneP2 = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: p2next — puente: lanza el siguiente capítulo
  // ==========================================================================
  (function () {
    var done = false;
    function launch() {
      if (done) return;
      done = true;
      var n = (parseInt(p2().pendingChapter, 10) || 0) + 1;
      if (n > 5) G.go('title');
      else G.p2launch(n);
    }
    G.scenes.p2next = {
      enter: safe(function () { done = false; launch(); }),
      update: safe(function () { launch(); }),
      render: safe(function (ctx) { ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H); })
    };
  })();

  // ==========================================================================
  // ESCENA: creditsP2 — créditos que suben (no se saltan hasta terminar)
  // ==========================================================================
  (function () {
    var scroll = 0;
    var speed = 38;
    var lines = [];
    var totalH = 0;
    var finished = false;
    var finEl = 0;

    // Sprites del desfile: (x, y) = posición junto al texto.
    function spHero(name, sc) {
      return function (ctx, x, y, t) { gfxCall(name, ctx, x, y + 34, { t: t, facing: 1, pose: 'idle', scale: sc || 0.85 }); };
    }
    function spP2(name, o, dy) {
      return function (ctx, x, y, t) {
        var opts = {}; for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) opts[k] = o[k]; }
        opts.t = t;
        p2call(name, ctx, x, y + (dy || 0), opts);
      };
    }

    function buildLines() {
      return [
        { t: 'EL RESCATE DE', size: 34, color: '#fde68a', gap: 8 },
        { t: 'LORD FALCON', size: 56, color: GOLD, gap: 12 },
        { t: 'Parte 2: La Gema Robada', size: 30, color: '#fca5a5', gap: 50 },
        { t: 'Diseñador Jefe', size: 22, color: CYAN, gap: 4 },
        { t: 'Juanjo (10 años)', size: 34, color: '#ffffff', gap: 40 },
        { t: 'Productor', size: 22, color: CYAN, gap: 4 },
        { t: 'Papá', size: 34, color: '#ffffff', gap: 40 },
        { t: 'Narradores', size: 22, color: CYAN, gap: 4 },
        { t: 'Juanjo y Papá', size: 34, color: '#ffffff', gap: 50 },
        { t: '- Las ideas -', size: 24, color: GOLD, gap: 18 },
        { t: 'La historia y el jetpack: Juanjo', size: 22, color: CREAM, gap: 10 },
        { t: 'El gran giro y los robots pilotables: Papá', size: 22, color: CREAM, gap: 50 },
        { t: '- Los héroes -', size: 24, color: GOLD, gap: 30 },
        { t: 'Director America', size: 28, color: '#60a5fa', gap: 34, sprite: spHero('drawDirector') },
        { t: 'Lord Falcon', size: 28, color: '#4ade80', gap: 56, sprite: spHero('drawFalcon') },
        { t: '- El villano que se hizo amigo -', size: 24, color: GOLD, gap: 70 },
        { t: 'Dark Secuaz', size: 30, color: '#86efac', gap: 64, sprite: spP2('secuaz', { scale: 0.48, good: true }, 46) },
        { t: '- El ejército de robots -', size: 24, color: GOLD, gap: 40 },
        { t: 'Robot boxeador', size: 26, color: '#fca5a5', gap: 44, sprite: spP2('boxeador', { scale: 0.9, facing: 1, pose: 'guardia' }, 34) },
        { t: 'Robot con escudo', size: 26, color: '#fca5a5', gap: 44, sprite: spP2('robotEscudo', { scale: 0.75, facing: 1 }, 36) },
        { t: 'Robot araña', size: 26, color: '#fca5a5', gap: 40, sprite: spP2('robotArana', { scale: 0.8, facing: 1 }, 26) },
        { t: 'Mini-torretas', size: 26, color: '#fca5a5', gap: 40, sprite: spP2('miniTorreta', { scale: 1, angle: -0.3 }, 28) },
        { t: 'Drones de enjambre', size: 26, color: '#fca5a5', gap: 36, sprite: spP2('dronEnjambre', { scale: 1, facing: 1 }, 0) },
        { t: 'Drones de rayos', size: 26, color: '#fca5a5', gap: 36, sprite: spP2('dronRayo', { scale: 0.8, facing: 1 }, 0) },
        { t: 'Drones en picado', size: 26, color: '#fca5a5', gap: 56, sprite: spP2('dronPicado', { scale: 0.9, angle: 0.5 }, 0) },
        { t: '- Robots pilotables -', size: 24, color: GOLD, gap: 40 },
        { t: 'Robot transformable', size: 26, color: '#93c5fd', gap: 48, sprite: spP2('transformableCoche', { variant: 'A', scale: 0.62, facing: 1 }, 26) },
        { t: 'Mecha-halcón', size: 26, color: '#86efac', gap: 80, sprite: spP2('mechaHalcon', { variant: 'A', modo: 'vuelo', scale: 0.5, facing: 1 }, 0) },
        { t: 'Titán Halcón', size: 28, color: GOLD, gap: 70, sprite: spP2('robotFusion', { scale: 0.32, facing: 1 }, 50) },
        { t: '- Los creadores -', size: 24, color: GOLD, gap: 28 },
        { t: 'Juanjo', size: 28, color: '#7dd3fc', gap: 56, sprite: function (ctx, x, y, t) { gfxCall('drawJuanjo', ctx, x, y + 30, { t: t, scale: 0.72 }); } },
        { t: 'Papá', size: 28, color: '#fbbf24', gap: 64, sprite: function (ctx, x, y, t) { gfxCall('drawPapa', ctx, x, y + 34, { t: t, scale: 0.66 }); } },
      ].concat(G.ui && G.ui.lineasMensajeJuanjo ? G.ui.lineasMensajeJuanjo(GOLD, CREAM, '#7dd3fc', 230) : []).concat([
        // Estas dos líneas quedan arriba al terminar, encima de "Fin de la Parte 2".
        { t: 'La amistad, el trabajo en equipo', size: 22, color: CREAM, gap: 6 },
        { t: 'y un buen plan siempre ganan.', size: 22, color: CREAM, gap: 50 }
      ]);
    }

    function enter() {
      lines = buildLines();
      scroll = 0;
      finished = false;
      finEl = 0;
      totalH = 0;
      for (var i = 0; i < lines.length; i++) totalH += lines[i].size + (lines[i].gap || 12);
      music('ending');
    }

    function update(dt) {
      dt = stepDt(dt);
      if (finished) finEl += dt;
      // Se para cuando la última línea queda arriba (deja sitio al "Fin").
      var maxScroll = totalH + H + 40 - 250;
      if (scroll < maxScroll) {
        scroll += speed * dt;
      } else if (!finished) {
        finished = true;
        finEl = 0;
      }
      // No se saltan con Enter hasta que terminan.
      if (finished && finEl > 0.4 && menuPressed('confirm')) {
        sfx('select');
        G.go('mensajePapa');
      }
    }

    function drawBackground(ctx, t) {
      if (!p2call('bgCielo', ctx, t * 24, t)) {
        if (!gfxCall('drawBgSpace', ctx, t * 24, t)) drawMenuBackdrop(ctx, t);
      }
      ctx.save();
      ctx.fillStyle = 'rgba(6,4,18,0.45)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    function render(ctx) {
      var t = now();
      drawBackground(ctx, t);
      var y = H + 40 - scroll;
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        var centerY = y + ln.size / 2;
        if (centerY > -120 && centerY < H + 120) {
          if (ln.sprite) {
            try { ln.sprite(ctx, W / 2 - 170, centerY, t); } catch (e) {}
            outlinedText(ctx, ln.t, W / 2 + 50, centerY, ln.size, ln.color || '#fff', OUTLINE, Math.max(3, ln.size * 0.12), 'center');
          } else if (ln.t) {
            outlinedText(ctx, ln.t, W / 2, centerY, ln.size, ln.color || '#fff', OUTLINE, Math.max(3, ln.size * 0.12), 'center');
          }
        }
        y += ln.size + (ln.gap || 12);
      }
      if (finished) {
        var a = clamp(finEl * 2 + 0.2, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        outlinedText(ctx, 'Fin de la Parte 2', W / 2, 300, 50, GOLD, OUTLINE, 8, 'center');
        outlinedText(ctx, 'Papá tiene un mensaje especial para ti...', W / 2, 352, 22, CREAM, OUTLINE, 4, 'center');
        heartPath(ctx, W / 2, 378 + Math.sin(t * 3) * 3, 1.4);
        ctx.fillStyle = '#ff5a7a'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
        var blink = 0.6 + 0.4 * Math.sin(t * 5);
        ctx.globalAlpha = a * blink;
        outlinedText(ctx, 'Pulsa Enter para continuar', W / 2, H - 30, 22, '#fde68a', OUTLINE, 4, 'center');
        ctx.restore();
      }
    }

    G.scenes.creditsP2 = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: mensajePapa — "Un mensaje de Papá" (texto EXACTO del contrato)
  // ==========================================================================
  var MENSAJE_PAPA = 'Hijo, detrás de los robots y la IA hay personas que tomaron decisiones. ' +
    'Hoy puedes crear videojuegos, pero un día podrás crear tecnología y potencIArte con ella para transformar vidas. ' +
    '¡Tu creatividad, prudencia y corazón serán claves para que puedas ayudar a los demás y tratar de llevar todo hacia el bien! ' +
    'Te quiere, Papá.';

  (function () {
    var el = 0;
    var FIRMA = 'Te quiere, Papá.';
    var IA_COL = '#2563eb';
    var TEXT_COL = '#3b1f05';
    var SIZE = 25;
    var LH = 38;
    var layout = null;   // líneas: [[{t, hl, x}...], ...]

    // Palabra en trozos: "potencIArte" → "potenc" + "IA" (resaltado) + "rte".
    function segmentsOf(word) {
      var k = word.indexOf('potencIArte');
      if (k >= 0) {
        var segs = [];
        if (k > 0) segs.push({ t: word.slice(0, k), hl: false });
        segs.push({ t: 'potenc', hl: false });
        segs.push({ t: 'IA', hl: true });
        segs.push({ t: 'rte' + word.slice(k + 11), hl: false });
        return segs;
      }
      return [{ t: word, hl: false }];
    }

    function buildLayout(ctx, maxW) {
      ctx.save();
      ctx.font = 'bold ' + SIZE + 'px ' + FONT;
      var body = MENSAJE_PAPA.slice(0, MENSAJE_PAPA.length - FIRMA.length).replace(/\s+$/, '');
      var words = body.split(' ');
      var spaceW = ctx.measureText(' ').width;
      var out = [];
      var line = [];
      var lineW = 0;
      for (var i = 0; i < words.length; i++) {
        var segs = segmentsOf(words[i]);
        var ww = 0;
        for (var s = 0; s < segs.length; s++) { segs[s].w = ctx.measureText(segs[s].t).width; ww += segs[s].w; }
        var need = line.length ? lineW + spaceW + ww : ww;
        if (need > maxW && line.length) {
          out.push({ segs: line, w: lineW });
          line = []; lineW = 0;
          need = ww;
        }
        if (line.length) line.push({ t: ' ', hl: false, w: spaceW });
        for (var q = 0; q < segs.length; q++) line.push(segs[q]);
        lineW = need;
      }
      if (line.length) out.push({ segs: line, w: lineW });
      ctx.restore();
      return out;
    }

    function enter() {
      el = 0;
      layout = null;
      music('ending');
    }

    function update(dt) {
      el += stepDt(dt);
      // Confirm solo funciona tras 4 s (para que no se salte por error).
      if (el >= 4 && menuPressed('confirm')) {
        sfx('select');
        G.go('finalP2');
      }
    }

    function warmBackground(ctx, t) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#4c1d3d');
      g.addColorStop(0.5, '#b45309');
      g.addColorStop(1, '#f59e0b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Sol suave
      var sg = ctx.createRadialGradient(150, 300, 10, 150, 300, 330);
      sg.addColorStop(0, 'rgba(255,237,180,0.55)');
      sg.addColorStop(1, 'rgba(255,237,180,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
      // Corazoncitos y lucecitas que suben
      ctx.save();
      for (var i = 0; i < 26; i++) {
        var bx = (i * 137.5 + 40) % W;
        var ph = (t * 0.06 + i * 0.13) % 1;
        var by = H + 30 - ph * (H + 80);
        ctx.globalAlpha = 0.18 + 0.22 * Math.sin(ph * Math.PI);
        if (i % 3 === 0) {
          heartPath(ctx, bx, by, 0.9 + (i % 4) * 0.2);
          ctx.fillStyle = '#fda4af'; ctx.fill();
        } else {
          ctx.fillStyle = '#fff7d6';
          ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    function render(ctx) {
      var t = now();
      warmBackground(ctx, t);

      outlinedText(ctx, 'Un mensaje de Papá', W / 2, 46, 40, '#fde68a', '#4a1d1d', 7, 'center');

      // Papá (muñequito) a la izquierda
      var px = 130, py = 470;
      gfxCall('drawPapa', ctx, px, py + Math.sin(t * 2) * 2, { t: t, scale: 2.2 });
      heartPath(ctx, px + 62, 238 + Math.sin(t * 3) * 4, 1.3);
      ctx.save(); ctx.fillStyle = '#ff5a7a'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

      // Carta (papel crema) con colita de bocadillo hacia Papá
      var cx = 262, cy = 88, cw = 672, ch = 400;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      roundRect(ctx, cx + 5, cy + 7, cw, ch, 22);
      ctx.fill();
      ctx.fillStyle = '#fff8e7';
      ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 4;
      roundRect(ctx, cx, cy, cw, ch, 22);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 2, 250); ctx.lineTo(cx - 34, 278); ctx.lineTo(cx + 2, 290);
      ctx.fillStyle = '#fff8e7'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, 250); ctx.lineTo(cx - 34, 278); ctx.lineTo(cx, 290);
      ctx.stroke();
      ctx.restore();

      if (!layout) layout = buildLayout(ctx, cw - 64);
      // Bloque de texto centrado en la carta (párrafo + firma).
      var nLines = layout.length;
      var blockH = nLines * LH + LH + 6;
      var tx = cx + 32;
      var ty0 = cy + Math.max(26, (ch - blockH) / 2) + LH / 2;
      // Líneas de cuaderno muy suaves bajo cada renglón
      ctx.save();
      ctx.strokeStyle = 'rgba(180,83,9,0.13)'; ctx.lineWidth = 1.5;
      for (var nl = 0; nl <= nLines; nl++) {
        var lyy = ty0 + nl * LH + (nl === nLines ? 6 : 0) + 17;
        if (lyy > cy + ch - 12) break;
        ctx.beginPath(); ctx.moveTo(cx + 24, lyy); ctx.lineTo(cx + cw - 24, lyy); ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.font = 'bold ' + SIZE + 'px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (var i = 0; i < nLines; i++) {
        var a = clamp((el - 0.3 - i * 0.32) / 0.5, 0, 1);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        var x = tx;
        var y = ty0 + i * LH;
        var segs = layout[i].segs;
        for (var s = 0; s < segs.length; s++) {
          var sg = segs[s];
          if (sg.hl) {
            ctx.save();
            ctx.fillStyle = IA_COL;
            ctx.shadowColor = 'rgba(37,99,235,0.55)';
            ctx.shadowBlur = 8;
            ctx.fillText(sg.t, x, y);
            ctx.restore();
          } else {
            ctx.fillStyle = TEXT_COL;
            ctx.fillText(sg.t, x, y);
          }
          x += sg.w;
        }
      }
      // Firma (a la derecha, como en una carta)
      var fa = clamp((el - 0.3 - nLines * 0.32) / 0.5, 0, 1);
      if (fa > 0) {
        ctx.globalAlpha = fa;
        ctx.font = 'italic bold 27px ' + FONT;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#9a3412';
        var fy = ty0 + nLines * LH + 6;
        ctx.fillText(FIRMA, cx + cw - 44, fy);
        heartPath(ctx, cx + cw - 28, fy - 9, 0.8);
        ctx.fillStyle = '#ff5a7a'; ctx.fill();
      }
      ctx.restore();

      if (el >= 4) {
        var blink = 0.6 + 0.4 * Math.sin(t * 5);
        ctx.save(); ctx.globalAlpha = blink;
        outlinedText(ctx, 'Pulsa Enter para continuar', W / 2 + 120, H - 24, 20, '#fff7d6', '#4a1d1d', 4, 'center');
        ctx.restore();
      }
    }

    G.scenes.mensajePapa = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // ESCENA: finalP2 — Juanjo y Papá juntos con los héroes y Dark Secuaz bueno
  // ==========================================================================
  (function () {
    var el = 0;

    function enter() {
      el = 0;
      music('ending');
    }

    function update(dt) {
      el += stepDt(dt);
      if (el > 1 && menuPressed('confirm')) {
        sfx('select');
        G.go('title');
      }
    }

    function cloud(ctx, x, y, s) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
      ctx.arc(x + 26 * s, y - 10 * s, 28 * s, 0, Math.PI * 2);
      ctx.arc(x + 56 * s, y, 22 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function render(ctx) {
      var t = now();
      // Cielo de amanecer
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#7dd3fc');
      g.addColorStop(0.6, '#fde68a');
      g.addColorStop(1, '#fdba74');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      var sg = ctx.createRadialGradient(W / 2, 300, 20, W / 2, 300, 420);
      sg.addColorStop(0, 'rgba(255,255,255,0.6)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
      for (var c = 0; c < 5; c++) {
        cloud(ctx, ((c * 230 + t * 12) % (W + 200)) - 120, 170 + (c % 2) * 50, 0.8 + (c % 3) * 0.2);
      }
      // Colina
      ctx.save();
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, 470);
      ctx.quadraticCurveTo(W / 2, 440, W + 10, 470);
      ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 500, W, H - 500);
      ctx.restore();

      // Personajes
      p2call('secuaz', ctx, 835, 474, { scale: 1.1, good: true, angle: 0.35 + Math.sin(t * 1.5) * 0.15 });
      gfxCall('drawDirector', ctx, 140, 470 + Math.sin(t * 4) * 4, { t: t, facing: 1, pose: 'win', scale: 1.9 });
      gfxCall('drawFalcon', ctx, 640, 468 + Math.sin(t * 4 + 1.4) * 4, { t: t + 1, facing: -1, pose: 'win', scale: 1.9 });
      gfxCall('drawJuanjoPapaDuo', ctx, 390, 470, { t: t, scale: 1.9 });

      // Confeti
      ctx.save();
      var cols = ['#ef4444', '#3b82f6', '#22c55e', '#fbbf24', '#a855f7', '#ec4899'];
      for (var i = 0; i < 46; i++) {
        var fx = (i * 97.3 + Math.sin(t + i) * 20) % W;
        var fy = ((t * (40 + (i % 5) * 12) + i * 53) % (H + 40)) - 20;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(t * 3 + i);
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
      ctx.restore();

      var pop = Math.min(1, el * 2.5);
      var sc = 0.6 + 0.4 * (1 - Math.pow(1 - pop, 3));
      ctx.save();
      ctx.translate(W / 2, 64);
      ctx.scale(sc, sc);
      outlinedText(ctx, '¡Gracias por jugar!', 0, 0, 58, GOLD, OUTLINE, 9, 'center');
      ctx.restore();
      outlinedText(ctx, 'Creado con cariño por Juanjo (10 años) y Papá', W / 2, 116, 24, '#ffffff', OUTLINE, 5, 'center');

      var blink = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.save(); ctx.globalAlpha = blink;
      outlinedText(ctx, 'Pulsa Enter para volver al inicio', W / 2, H - 20, 20, CREAM, OUTLINE, 4, 'center');
      ctx.restore();
    }

    G.scenes.finalP2 = { enter: safe(enter), update: safe(update), render: safe(render) };
  })();

  // ==========================================================================
  // G.ui2 — ayudas que usa ui.js (portada y "Cómo jugar")
  // ==========================================================================
  G.ui2 = G.ui2 || {};
  G.ui2.MENSAJE_PAPA = MENSAJE_PAPA;
  G.ui2.drawMedal = function (ctx, x, y, size, apagada, t) {
    try { drawMedal(ctx, x, y, size, apagada, t); } catch (e) {}
  };
  G.ui2.drawWeaponIcon = function (ctx, x, y, arma, size, ocupada) {
    try { drawWeaponIcon(ctx, x, y, arma, size, ocupada); } catch (e) {}
  };

  // Página "Armas de la Parte 2" de "Cómo jugar".
  G.ui2.drawWeaponsHelp = function (ctx, t) {
    try {
      t = (typeof t === 'number') ? t : now();
      drawMenuBackdrop(ctx, t);
      outlinedText(ctx, 'Armas de la Parte 2', W / 2, 42, 40, GOLD, OUTLINE, 7, 'center');
      plainText(ctx, 'Antes de cada nivel, cada héroe elige 2 armas. ¡Lo que coge uno, el otro ya no puede!', W / 2, 82, 17, '#fde68a');
      var list = weapons();
      var cw = 380, chh = 72, gx = 20;
      var x0 = (W - (cw * 2 + gx)) / 2;
      var y0 = 106, gy = 12;
      for (var i = 0; i < 8; i++) {
        var col = i < 4 ? 0 : 1;
        var row = i % 4;
        var x = x0 + col * (cw + gx);
        var y = y0 + row * (chh + gy);
        ctx.save();
        ctx.fillStyle = 'rgba(15,10,35,0.85)';
        ctx.strokeStyle = (i < list.length) ? 'rgba(251,191,36,0.85)' : CYAN;
        ctx.lineWidth = 3;
        roundRect(ctx, x, y, cw, chh, 14);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        if (i < list.length) {
          var w = list[i];
          var info = winfo(w);
          drawWeaponIcon(ctx, x + 38, y + chh / 2, w, 50, false);
          plainText(ctx, info.nombre, x + 74, y + 22, 20, GOLD, 'left');
          var dl = wrapText(ctx, info.desc || '', cw - 88, 15, '600');
          for (var k = 0; k < dl.length && k < 2; k++) plainText(ctx, dl[k], x + 74, y + 44 + k * 16, 15, CREAM, 'left', '600');
        } else {
          plainText(ctx, 'Teclas de las armas', x + cw / 2, y + 18, 18, CYAN);
          plainText(ctx, '1 jugador:  arma 1 = J  ·  arma 2 = K  ·  hackear = H', x + cw / 2, y + 41, 14, CREAM, 'center', '600');
          plainText(ctx, '2 jugadores:  P1 F · G · R   |   P2 K · L · Ñ', x + cw / 2, y + 59, 14, CREAM, 'center', '600');
        }
      }
      plainText(ctx, 'Las cajas se rompen con cualquier arma y las consolas se abren hackeando.', W / 2, H - 58, 16, '#fde68a');
      plainText(ctx, 'En la carrera conduce el Director y en el vuelo pilota Lord Falcon.', W / 2, H - 36, 15, 'rgba(255,255,255,0.85)');
      plainText(ctx, 'Enter o Escape para volver', W / 2, H - 12, 15, 'rgba(255,255,255,0.75)');
    } catch (e) { /* nunca romper */ }
  };

})();
