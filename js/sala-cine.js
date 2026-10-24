// sala-cine.js — SALA DE CINE: ver todas las historias animadas por aparte.
// La carga solo historias.html (no index.html): el juego normal no cambia.
//   - Lista las 30 historias de las Partes 1, 2 y 3 en el orden de la aventura.
//   - Enter sobre una historia: la reproduce (escena 'story') y vuelve aquí.
//   - Enter sobre "Ver todas" o "Parte n entera": las reproduce seguidas.
//   - ↑ ↓ elegir · ← → saltar de parte · Escape: volver a la portada del juego
//     (entre dos historias seguidas, Escape para el modo seguido).
// Se maneja solo con arriba / abajo / OK (móvil).
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var W = 960, H = 540;
  var FUENTE = 'system-ui, "Segoe UI", Arial, sans-serif';
  var OUTLINE = '#1a1a2e';
  var ESPERA = 1.4;                       // segundos de cartel entre historias seguidas
  var FILA = 30, LISTA_Y = 100, LISTA_FILAS = 14;
  var PX = 448, PY = 100, PW = 480, PH = 172; // vista previa (la zona animada 960x345 a la mitad)

  var PARTES = {
    1: { nombre: 'El Rescate de Lord Falcon', color: '#60a5fa' },
    2: { nombre: 'La Gema Robada', color: '#f87171' },
    3: { nombre: 'We Are a Team', color: '#4ade80' }
  };
  var NOMBRES_P1 = { 1: 'La Emboscada', 2: 'La Preparación', 3: 'Batalla Espacial', 4: 'La Nave Nodriza', 5: 'Dark Toros' };
  var TITULOS = {
    s_cap1: 'Dos amigos inseparables', s_captura: 'La captura de Falcon', s_cap2: 'La base del Director',
    s_despegue: '¡Despegue!', s_cap3: 'El cielo bloqueado', s_infiltracion: 'La infiltración',
    s_cap4: 'Dentro de la Nave Nodriza', s_confrontacion: 'Cara a cara con Dark Toros', s_cap5: 'La sala del trono',
    s_final: 'La amistad gana',
    s2_cap1: 'La gema robada', s2_tras1: '¡Las torretas eran su cabeza!', s2_cap2: 'El robot transformable',
    s2_tras2: 'La fábrica de robots', s2_cap3: 'Dentro de la fábrica', s2_tras3: 'Un bolsillo imposible de hackear',
    s2_cap4: 'El mecha-halcón', s2_tras4: 'La fortaleza en el cielo', s2_cap5: 'El plan contra Dark Secuaz',
    s2_final: 'Dark Secuaz se vuelve bueno',
    s3_cap1: 'Robovill y los nuevos héroes', s3_tras1: 'La gema copia', s3_cap2: 'Dos parejas, dos vehículos',
    s3_tras2: 'Rumbo a la fábrica oscura', s3_cap3: 'El río subterráneo', s3_tras3: '¡El equipo, otra vez junto!',
    s3_cap4: 'Puzles en equipo', s3_tras4: 'El corazón de la fábrica', s3_cap5: '¡We are a team!',
    s3_final: 'Robovill se escapa'
  };
  var NOMBRES_QUIEN = {
    narrador: 'Narrador', juanjo: 'Juanjo', papa: 'Papá', director: 'Director America', falcon: 'Lord Falcon',
    toros: 'Dark Toros', secuaz: 'Dark Secuaz', mikey: 'Mikey Stark', peter: 'Peter Rogers', robovill: 'Robovill'
  };

  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) {} }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) {} }
  function pulsado(a) {
    var p1 = G.input && G.input.pressed ? G.input.pressed(a) : false;
    var p2 = G.input2 && G.input2.pressed ? G.input2.pressed(a) : false;
    return !!p1 || !!p2;
  }

  // ---------------------------------------------------------------------------
  //  La lista: las historias en el orden de la aventura
  // ---------------------------------------------------------------------------
  function lista() {
    var datos = G.storyData || {};
    var out = [], vistos = {};
    function add(id, parte, cuando) {
      if (!id || vistos[id] || !datos[id] || !datos[id].length) return;
      vistos[id] = true;
      out.push({ id: id, parte: parte, cuando: cuando, titulo: TITULOS[id] || id, lineas: datos[id].length });
    }
    var flujos = [
      { parte: 1, flow: G.flow, nombres: NOMBRES_P1, menu: true },
      { parte: 2, flow: G.flow2, nombres: G.p2chapterNames || {} },
      { parte: 3, flow: G.flow3, nombres: G.p3chapterNames || {} }
    ];
    flujos.forEach(function (f) {
      if (!f.flow || !f.flow.chapters) return;
      for (var n = 1; n <= 5; n++) {
        var c = f.flow.chapters[n] || {}, a = (f.flow.after || {})[n] || {};
        var nombre = f.nombres[n] ? ' · ' + f.nombres[n] : '';
        // En la Parte 1, la historia de antes de los capítulos 2 a 5 solo sale al empezarlos desde el menú.
        add(c.story, f.parte, 'Antes del capítulo ' + n + nombre + (f.menu && n > 1 ? ' (si lo empiezas desde el menú)' : ''));
        add(a.story, f.parte, n === 5 ? 'El final de la Parte ' + f.parte : 'Después del capítulo ' + n);
      }
    });
    // Por si hubiera alguna historia más que no esté en los flujos.
    Object.keys(datos).forEach(function (id) {
      var m = /^s([23]?)_/.exec(id);
      if (m) add(id, m[1] ? +m[1] : 1, 'Historia extra');
    });
    out.sort(function (a, b) { return a.parte - b.parte; });   // estable: respeta el orden de cada parte
    return out;
  }

  // Filas: "Ver todas", y por cada parte su cabecera ("Parte n entera") y sus historias.
  function filas(hist) {
    var f = [{ tipo: 'todas', clave: 'todas', ids: hist.map(function (h) { return h.id; }) }];
    [1, 2, 3].forEach(function (p) {
      var hs = hist.filter(function (h) { return h.parte === p; });
      if (!hs.length) return;
      f.push({ tipo: 'parte', clave: 'parte' + p, parte: p, ids: hs.map(function (h) { return h.id; }) });
      hs.forEach(function (h, i) { f.push({ tipo: 'historia', clave: h.id, parte: p, h: h, num: i + 1 }); });
    });
    return f;
  }

  // ---------------------------------------------------------------------------
  //  Estado (sobrevive a exit(): la sala recuerda dónde estaba al volver)
  // ---------------------------------------------------------------------------
  var HIST = [], FILAS = [], sel = 0, scroll = 0, t = 0;
  var auto = null;            // { cola: [ids], i: siguiente, total }
  var espera = 0;             // > 0: cartel "Siguiente…" entre historias seguidas
  var aviso = null;           // { texto, t }
  var offscreen = null;

  function construir() {
    HIST = lista();
    FILAS = filas(HIST);
    if (sel >= FILAS.length) sel = 0;
  }
  function filaDe(clave) {
    for (var i = 0; i < FILAS.length; i++) if (FILAS[i].clave === clave) return i;
    return -1;
  }
  function historia(id) {
    for (var i = 0; i < HIST.length; i++) if (HIST[i].id === id) return HIST[i];
    return null;
  }
  function reproducir(id) {
    sfx('select');
    G.go('story', { id: id, next: 'salaCine' });
  }

  function enter() {
    construir();
    t = 0;
    if (auto) {
      if (auto.i < auto.cola.length) {
        espera = ESPERA;
        var k = filaDe(auto.cola[auto.i]);
        if (k >= 0) sel = k;
      } else {
        aviso = { texto: '¡Fin! Has visto ' + auto.cola.length + (auto.cola.length === 1 ? ' historia.' : ' historias seguidas.'), t: 0 };
        auto = null;
        espera = 0;
      }
    }
    if (!auto) music('title');
  }

  function activar() {
    var f = FILAS[sel];
    if (!f) return;
    if (f.tipo === 'historia') {
      // Al volver, queda elegida la siguiente historia (Enter para seguir viéndolas).
      var sig = sel + 1;
      while (sig < FILAS.length && FILAS[sig].tipo !== 'historia') sig++;
      if (sig < FILAS.length) sel = sig;
      reproducir(f.h.id);
    } else if (f.ids && f.ids.length) {
      auto = { cola: f.ids.slice(), i: 1 };
      var k = filaDe(f.ids[0]);
      if (k >= 0) sel = k;
      reproducir(f.ids[0]);
    }
  }

  function mover(d) {
    if (!FILAS.length) return;
    sel = (sel + d + FILAS.length) % FILAS.length;
    sfx('select');
  }
  function saltarParte(d) {
    var p = (FILAS[sel] && FILAS[sel].parte) || 0;
    var objetivo = Math.max(1, Math.min(3, p + d));
    if (p === 0 && d < 0) { sel = 0; return; }
    var k = filaDe('parte' + objetivo);
    if (k >= 0) { sel = k; sfx('select'); }
  }

  function update(dt) {
    t += dt;
    if (aviso) { aviso.t += dt; if (aviso.t > 3.5) aviso = null; }
    if (auto && espera > 0) {
      if (pulsado('pause')) {
        aviso = { texto: 'Parado. Te quedan ' + (auto.cola.length - auto.i) + ' historias por ver.', t: 0 };
        auto = null; espera = 0; sfx('select'); music('title');
        return;
      }
      if (pulsado('confirm')) espera = 0; else espera -= dt;
      if (espera <= 0) {
        var id = auto.cola[auto.i++];
        reproducir(id);
      }
      return;
    }
    if (pulsado('up')) mover(-1);
    else if (pulsado('down')) mover(1);
    else if (pulsado('left')) saltarParte(-1);
    else if (pulsado('right')) saltarParte(1);
    else if (pulsado('confirm')) activar();
    else if (pulsado('pause')) G.go('title');
  }

  // ---------------------------------------------------------------------------
  //  Dibujo
  // ---------------------------------------------------------------------------
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function recortar(c, txt, ancho) {
    txt = String(txt);
    if (c.measureText(txt).width <= ancho) return txt;
    while (txt.length > 3 && c.measureText(txt + '…').width > ancho) txt = txt.slice(0, -1);
    return txt + '…';
  }
  function partirLineas(c, txt, ancho, max) {
    var pal = String(txt).split(' '), out = [], cur = '';
    for (var i = 0; i < pal.length; i++) {
      var prueba = cur ? cur + ' ' + pal[i] : pal[i];
      if (c.measureText(prueba).width > ancho && cur) { out.push(cur); cur = pal[i]; } else cur = prueba;
    }
    if (cur) out.push(cur);
    if (out.length > max) { out = out.slice(0, max); out[max - 1] = recortar(c, out[max - 1] + '…', ancho); }
    return out;
  }

  function fondo(c) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#1e1b4b');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // telón rojo a los lados
    for (var lado = 0; lado < 2; lado++) {
      c.save();
      if (lado) { c.translate(W, 0); c.scale(-1, 1); }
      var gt = c.createLinearGradient(0, 0, 30, 0);
      gt.addColorStop(0, '#7f1d1d'); gt.addColorStop(1, '#b91c1c');
      c.fillStyle = gt; c.fillRect(0, 0, 24, H);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2;
      for (var k = 6; k < 24; k += 8) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 2, H); c.stroke(); }
      c.restore();
    }
    // bombillas de cine arriba
    for (var b = 0; b < 22; b++) {
      var on = (Math.floor(t * 3) + b) % 3 !== 0;
      c.fillStyle = on ? '#fde68a' : '#78350f';
      c.beginPath(); c.arc(60 + b * 40, 10, 3.5, 0, Math.PI * 2); c.fill();
    }
  }

  function cabecera(c) {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 30px ' + FUENTE;
    c.lineWidth = 6; c.strokeStyle = OUTLINE; c.strokeText('🎬 Sala de cine', W / 2, 40);
    c.fillStyle = '#fbbf24'; c.fillText('🎬 Sala de cine', W / 2, 40);
    c.font = 'bold 14px ' + FUENTE; c.fillStyle = '#cbd5e1';
    c.fillText('Las historias animadas de El Rescate de Lord Falcon · ' + HIST.length + ' historias', W / 2, 70);
  }

  function dibujarLista(c) {
    if (sel < scroll) scroll = sel;
    if (sel >= scroll + LISTA_FILAS) scroll = sel - LISTA_FILAS + 1;
    scroll = Math.max(0, Math.min(scroll, Math.max(0, FILAS.length - LISTA_FILAS)));
    c.save();
    rr(c, 32, LISTA_Y - 8, 400, LISTA_FILAS * FILA + 16, 14);
    c.fillStyle = 'rgba(15,23,42,0.85)'; c.fill();
    c.strokeStyle = '#334155'; c.lineWidth = 2; c.stroke();
    c.textBaseline = 'middle';
    for (var r = 0; r < LISTA_FILAS; r++) {
      var i = scroll + r, f = FILAS[i];
      if (!f) break;
      var y = LISTA_Y + r * FILA;
      if (i === sel) {
        rr(c, 40, y + 1, 384, FILA - 2, 8);
        c.fillStyle = 'rgba(251,191,36,0.18)'; c.fill();
        c.strokeStyle = '#fbbf24'; c.lineWidth = 2; c.stroke();
      }
      c.textAlign = 'left';
      if (f.tipo === 'todas') {
        c.font = 'bold 16px ' + FUENTE; c.fillStyle = '#fbbf24';
        c.fillText('▶ Ver TODAS seguidas (' + f.ids.length + ')', 52, y + FILA / 2);
      } else if (f.tipo === 'parte') {
        c.font = 'bold 15px ' + FUENTE; c.fillStyle = PARTES[f.parte].color;
        c.fillText(recortar(c, '▶ Parte ' + f.parte + ' entera · ' + PARTES[f.parte].nombre, 360), 52, y + FILA / 2);
      } else {
        c.font = 'bold 14px ' + FUENTE; c.fillStyle = i === sel ? '#fff7d6' : '#e2e8f0';
        c.fillText(f.num + '.', 66, y + FILA / 2);
        c.fillText(recortar(c, f.h.titulo, 280), 92, y + FILA / 2);
        c.textAlign = 'right'; c.font = '12px ' + FUENTE; c.fillStyle = '#94a3b8';
        c.fillText(f.h.lineas + ' esc.', 416, y + FILA / 2);
      }
    }
    // flechitas de "hay más"
    c.fillStyle = '#94a3b8'; c.textAlign = 'center'; c.font = 'bold 14px ' + FUENTE;
    if (scroll > 0) c.fillText('▲', 232, LISTA_Y - 1);
    if (scroll + LISTA_FILAS < FILAS.length) c.fillText('▼', 232, LISTA_Y + LISTA_FILAS * FILA + 2);
    c.restore();
  }

  // Vista previa: va pasando por las escenas de la historia elegida (o por el
  // principio de cada historia si está elegida una parte entera).
  function previa(c) {
    var f = FILAS[sel];
    if (!f) return;
    var id, linea, lt;
    if (f.tipo === 'historia') {
      id = f.h.id;
      var n = Math.max(1, f.h.lineas);
      linea = Math.floor(t / 3.2) % n; lt = t % 3.2 + 0.4;
    } else {
      var k = Math.floor(t / 2.6) % f.ids.length;
      id = f.ids[k]; linea = 0; lt = t % 2.6 + 0.8;
    }
    c.save();
    rr(c, PX - 6, PY - 6, PW + 12, PH + 12, 12);
    c.fillStyle = '#020617'; c.fill();
    c.strokeStyle = '#fbbf24'; c.lineWidth = 3; c.stroke();
    var ok = false;
    try {
      if (!offscreen && typeof document !== 'undefined' && document.createElement) {
        offscreen = document.createElement('canvas'); offscreen.width = W; offscreen.height = 345;
      }
      if (offscreen && G.cine && G.cine.has(id)) {
        var oc = offscreen.getContext('2d');
        oc.setTransform(1, 0, 0, 1, 0, 0);
        oc.fillStyle = '#0b1020'; oc.fillRect(0, 0, W, 345);
        ok = G.cine.draw(oc, id, linea, lt, t) !== false;
        if (ok) c.drawImage(offscreen, 0, 0, W, 345, PX, PY, PW, PH);
      }
    } catch (e) { ok = false; }
    if (!ok) {
      c.fillStyle = '#94a3b8'; c.font = 'bold 16px ' + FUENTE; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('(sin vista previa)', PX + PW / 2, PY + PH / 2);
    }
    // número de escena
    if (f.tipo === 'historia') {
      c.font = 'bold 12px ' + FUENTE; c.textAlign = 'right'; c.textBaseline = 'top';
      c.fillStyle = 'rgba(2,6,23,0.7)'; rr(c, PX + PW - 92, PY + 6, 86, 20, 6); c.fill();
      c.fillStyle = '#fde68a'; c.fillText('escena ' + (linea + 1) + ' de ' + f.h.lineas, PX + PW - 12, PY + 10);
    }
    c.restore();
  }

  function info(c) {
    var f = FILAS[sel];
    if (!f) return;
    var x = PX, y = PY + PH + 26;
    c.save();
    c.textAlign = 'left'; c.textBaseline = 'middle';
    if (f.tipo === 'historia') {
      var h = f.h, l0 = (G.storyData[h.id] || [])[0] || {};
      c.font = 'bold 22px ' + FUENTE; c.fillStyle = '#fff7d6';
      c.fillText(recortar(c, h.titulo, PW), x, y);
      c.font = 'bold 14px ' + FUENTE; c.fillStyle = PARTES[h.parte].color;
      c.fillText(recortar(c, 'Parte ' + h.parte + ' · ' + h.cuando, PW), x, y + 26);
      c.font = '13px ' + FUENTE; c.fillStyle = '#94a3b8';
      c.fillText(h.lineas + ' escenas · empieza ' + (NOMBRES_QUIEN[l0.who] || l0.who || ''), x, y + 48);
      c.font = 'italic 15px ' + FUENTE; c.fillStyle = '#cbd5e1';
      var ls = partirLineas(c, '«' + (l0.text || '') + '»', PW, 3);
      for (var i = 0; i < ls.length; i++) c.fillText(ls[i], x, y + 76 + i * 21);
    } else {
      var txt = f.tipo === 'todas' ? 'Todas las historias, seguidas' : 'Parte ' + f.parte + ': ' + PARTES[f.parte].nombre;
      c.font = 'bold 22px ' + FUENTE; c.fillStyle = f.tipo === 'todas' ? '#fbbf24' : PARTES[f.parte].color;
      c.fillText(recortar(c, txt, PW), x, y);
      c.font = '15px ' + FUENTE; c.fillStyle = '#cbd5e1';
      c.fillText(f.ids.length + ' historias, una detrás de otra, en el orden de la aventura.', x, y + 30);
      c.fillText('Entre historia e historia, Escape para parar.', x, y + 54);
    }
    c.restore();
  }

  function ayuda(c) {
    c.save();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 13px ' + FUENTE; c.fillStyle = '#e2e8f0';
    c.fillText('↑ ↓ elegir · Enter ver · ← → cambiar de parte · Escape volver al juego', PX + PW / 2, 496);
    c.font = '12px ' + FUENTE; c.fillStyle = '#94a3b8';
    c.fillText('Dentro de una historia: Enter avanza · mantén Enter 1 segundo para saltarla', PX + PW / 2, 516);
    c.restore();
  }

  function cartelSiguiente(c) {
    var id = auto.cola[auto.i], h = historia(id);
    c.save();
    c.fillStyle = 'rgba(2,6,23,0.78)'; c.fillRect(0, 0, W, H);
    rr(c, 230, 160, 500, 220, 22);
    c.fillStyle = '#0f172a'; c.fill();
    c.strokeStyle = '#fbbf24'; c.lineWidth = 4; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 16px ' + FUENTE; c.fillStyle = '#94a3b8';
    c.fillText('Siguiente historia · ' + (auto.i + 1) + ' de ' + auto.cola.length, W / 2, 196);
    c.font = 'bold 28px ' + FUENTE; c.fillStyle = '#fff7d6';
    c.fillText(recortar(c, h ? h.titulo : id, 460), W / 2, 240);
    if (h) {
      c.font = 'bold 15px ' + FUENTE; c.fillStyle = PARTES[h.parte].color;
      c.fillText(recortar(c, 'Parte ' + h.parte + ' · ' + h.cuando, 460), W / 2, 278);
    }
    // barrita de cuenta atrás
    var k = Math.max(0, Math.min(1, espera / ESPERA));
    c.fillStyle = '#334155'; rr(c, 330, 306, 300, 10, 5); c.fill();
    c.fillStyle = '#fbbf24'; rr(c, 330, 306, 300 * (1 - k), 10, 5); c.fill();
    c.font = '13px ' + FUENTE; c.fillStyle = '#cbd5e1';
    c.fillText('Enter: empezar ya · Escape: parar', W / 2, 346);
    c.restore();
  }

  function dibujarAviso(c) {
    if (!aviso) return;
    var a = Math.min(1, aviso.t * 4, (3.5 - aviso.t) * 2);
    c.save();
    c.globalAlpha = Math.max(0, a);
    c.font = 'bold 16px ' + FUENTE;
    var w = c.measureText(aviso.texto).width + 40;
    rr(c, W / 2 - w / 2, 452, w, 34, 12);
    c.fillStyle = '#14532d'; c.fill(); c.strokeStyle = '#4ade80'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#ecfdf5'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(aviso.texto, W / 2, 469);
    c.restore();
  }

  function render(ctx) {
    try {
      fondo(ctx);
      cabecera(ctx);
      dibujarLista(ctx);
      previa(ctx);
      info(ctx);
      ayuda(ctx);
      dibujarAviso(ctx);
      if (auto && espera > 0) cartelSiguiente(ctx);
    } catch (e) {
      try { console.error('[sala-cine] ' + (e && e.stack || e)); } catch (e2) {}
    }
  }

  G.scenes = G.scenes || {};
  G.scenes.salaCine = { enter: enter, update: update, render: render };

  // API pequeña para las pruebas (tests/smoke.js, CINE-8).
  G.salaCine = {
    lista: lista,
    seleccion: function () { return FILAS[sel] ? FILAS[sel].clave : null; },
    elegir: function (clave) { if (!FILAS.length) construir(); var k = filaDe(clave); if (k >= 0) sel = k; return k >= 0; },
    reproduciendo: function () { return !!auto; }
  };

  // En historias.html (window.SALA_CINE = true) la sala se abre sola al arrancar.
  if (window.SALA_CINE) {
    var abrir = function () { try { G.go('salaCine'); } catch (e) {} };
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', abrir, { once: true });
    } else {
      abrir();
    }
  }
})();
