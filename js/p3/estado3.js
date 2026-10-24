// ============================================================================
// estado3.js — Estado de la PARTE 3 "We Are a Team" (contrato técnico §3).
// Creado por Juanjo (Diseñador Jefe, 10 años) y Papá (Productor).
// Dueño: interfaz. Define G.p3 y sus utilidades. NO toca G.state ni G.p2.
// Persistencia en localStorage con su propia clave ('rescate-lord-falcon-p3-v1'),
// siempre con try/catch: en file:// o en modo privado puede fallar y el juego
// sigue igual. Al cargar solo LEE (G.p3load): nunca escribe.
// ============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var KEY = 'rescate-lord-falcon-p3-v1';

  var HEROES = ['director', 'falcon', 'mikey', 'peter'];   // ORDEN del cambio de héroe
  var LOOK_KEYS = ['mikey', 'peter', 'robovill', 'moto', 'sub'];

  var HERO_INFO = {     // color = el de la variante A; para dibujar, SIEMPRE G.p3.heroColor(h)
    director: { nombre: 'Director America', corto: 'el Director', color: '#60a5fa', habilidad: 'Hackea consolas · guantes y pulso' },
    falcon:   { nombre: 'Lord Falcon', corto: 'Falcon', color: '#4ade80', habilidad: 'Doble salto · espada y arco' },
    mikey:    { nombre: 'Mikey Stark', corto: 'Mikey', color: '#f97316', habilidad: '3 lanzadores de energía' },
    peter:    { nombre: 'Peter Rogers', corto: 'Peter', color: '#facc15', habilidad: 'Escudo: bloquea y se lanza' }
  };
  var LOOK_INFO_DEF = {
    mikey:    { titulo: 'Mikey Stark',    A: 'El científico', B: 'El hacker del taller' },
    peter:    { titulo: 'Peter Rogers',   A: 'El guardián de la rueda', B: 'El caballero tortuga' },
    robovill: { titulo: 'Robovill',       A: 'Taladro-casco', B: 'Peonza-taladro' },
    moto:     { titulo: 'Robot-moto',     A: 'Rayo', B: 'Bestia' },
    sub:      { titulo: 'Submarino-nave', A: 'Cápsula-escudo', B: 'Delfín-cohete' }
  };

  // Colores de identidad (contrato §3): base, claro (nombres) y oscuro (marcos).
  var COLORES = {
    director: { base: '#60a5fa', claro: '#93c5fd', oscuro: '#1e3a8a' },
    falcon:   { base: '#4ade80', claro: '#86efac', oscuro: '#15803d' },
    mikeyA:   { base: '#f97316', claro: '#fdba74', oscuro: '#c2410c' },
    mikeyB:   { base: '#8b5cf6', claro: '#c4b5fd', oscuro: '#4c1d95' },
    peterA:   { base: '#facc15', claro: '#fde047', oscuro: '#a16207' },
    peterB:   { base: '#db2777', claro: '#f9a8d4', oscuro: '#9d174d' }
  };

  function freshLook() { return { mikey: 'A', peter: 'A', robovill: 'A', moto: 'A', sub: 'A' }; }
  function freshRun() { return { lastHero1: null, lastHero2: null, pilotoFusion: null }; }
  function isHero(h) { return typeof h === 'string' && HEROES.indexOf(h) >= 0; }
  function isCoop() { try { return !!(G.state && G.state.coop); } catch (e) { return false; } }

  // Valida G.p3 en el sitio (contrato §3, "Validación"). Nunca lanza.
  function validate(p) {
    try {
      var u = Number(p.unlocked);
      p.unlocked = (Math.floor(u) === u && u >= 1 && u <= 5) ? u : 1;
      p.chosen = p.chosen === true;
      p.p2done = p.p2done === true;
      p.secret = p.secret === true;
      var lk = (p.look && typeof p.look === 'object') ? p.look : {};
      var nl = freshLook();
      for (var i = 0; i < LOOK_KEYS.length; i++) {
        var k = LOOK_KEYS[i];
        nl[k] = (lk[k] === 'A' || lk[k] === 'B') ? lk[k] : 'A';
      }
      p.look = nl;
      if (!isHero(p.hero)) p.hero = 'director';
      if (!isHero(p.hero2) || p.hero2 === p.hero) p.hero2 = (p.hero !== 'falcon') ? 'falcon' : 'director';
      var pc = Number(p.pendingChapter);
      p.pendingChapter = (Math.floor(pc) === pc && pc >= 1 && pc <= 5) ? pc : 1;
      if (!p.run || typeof p.run !== 'object' || Array.isArray(p.run)) p.run = freshRun();
      if (typeof p.debugInvulnerable !== 'boolean') p.debugInvulnerable = false;
    } catch (e) {
      try { applyDefaults(p); } catch (e2) {}
    }
    return p;
  }

  function applyDefaults(p) {
    p.unlocked = 1;
    p.chosen = false;
    p.p2done = false;
    p.secret = false;
    p.look = freshLook();
    p.hero = 'director';
    p.hero2 = 'falcon';
    p.pendingChapter = 1;
    p.run = freshRun();
    p.debugInvulnerable = false;
    return p;
  }

  // ---- G.p3 (contrato §3) ----
  G.p3 = applyDefaults({});
  G.p3.HEROES = HEROES;
  G.p3.HERO_INFO = HERO_INFO;
  G.p3.LOOK_INFO = G.P3LOOK_INFO || LOOK_INFO_DEF;

  // Color de identidad del héroe h (Mikey y Peter según su diseño elegido).
  G.p3.heroColor = function (h, tono) {
    try {
      var t = (tono === 'claro' || tono === 'oscuro') ? tono : 'base';
      var look = (G.p3 && G.p3.look) || {};
      var k = h;
      if (h === 'mikey') k = 'mikey' + (look.mikey === 'B' ? 'B' : 'A');
      if (h === 'peter') k = 'peter' + (look.peter === 'B' ? 'B' : 'A');
      return (COLORES[k] && COLORES[k][t]) || '#e5e7eb';
    } catch (e) { return '#e5e7eb'; }
  };

  // Lee lo guardado y lo valida. NO escribe nunca.
  G.p3load = function () {
    var p = G.p3;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var d = JSON.parse(raw);
          if (d && typeof d === 'object') {
            var campos = ['unlocked', 'chosen', 'p2done', 'secret', 'look', 'hero', 'hero2'];
            for (var i = 0; i < campos.length; i++) {
              if (Object.prototype.hasOwnProperty.call(d, campos[i])) p[campos[i]] = d[campos[i]];
            }
          }
        }
      }
    } catch (e) { /* datos corruptos o sin acceso: valores por defecto */ }
    validate(p);
  };

  // Valida y guarda SOLO los campos persistidos.
  G.p3save = function () {
    var p = G.p3;
    try {
      validate(p);
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(KEY, JSON.stringify({
          unlocked: p.unlocked, chosen: p.chosen, p2done: p.p2done, secret: p.secret,
          look: { mikey: p.look.mikey, peter: p.look.peter, robovill: p.look.robovill, moto: p.look.moto, sub: p.look.sub },
          hero: p.hero, hero2: p.hero2
        }));
      }
    } catch (e) { /* sin almacenamiento: el juego sigue */ }
  };

  // ¿Se puede jugar la Parte 3? (Parte 2 terminada, o compatibilidad, o código secreto)
  G.p3available = function () {
    try {
      if (G.p3 && G.p3.p2done === true) return true;
      if (G.p2 && (G.p2.unlocked | 0) >= 5) return true;
      return !!(G.p3 && G.p3.secret === true);
    } catch (e) { return false; }
  };

  // Marca "Parte 2 terminada" (la llama levelDoneP2 al ganar el capítulo 5).
  G.p3markP2Done = function () {
    try { G.p3.p2done = true; G.p3save(); } catch (e) {}
  };

  // Código secreto de la portada: todos los capítulos de la Parte 3.
  G.p3secretUnlock = function () {
    try { G.p3.unlocked = 5; G.p3.secret = true; G.p3save(); } catch (e) {}
  };

  G.p3resetRun = function () {
    try { G.p3.run = freshRun(); } catch (e) {}
  };

  // "Borrar progreso": reinicia la Parte 3 pero CONSERVA los diseños de Juanjo.
  G.p3resetAll = function () {
    try {
      var p = G.p3;
      p.unlocked = 1;
      p.chosen = false;
      p.p2done = false;
      p.secret = false;
      p.hero = 'director';
      p.hero2 = 'falcon';
      p.pendingChapter = 1;
      p.run = freshRun();
      G.p3save();
    } catch (e) {}
  };

  // Cambia una variante de los Diseños de Juanjo y guarda al momento.
  G.p3setLook = function (clave, v) {
    try {
      if (LOOK_KEYS.indexOf(clave) < 0 || (v !== 'A' && v !== 'B')) return false;
      G.p3.look = G.p3.look || freshLook();
      G.p3.look[clave] = v;
      G.p3save();
      return true;
    } catch (e) { return false; }
  };

  // ¿Hay pantalla táctil? (en el móvil las teclas se llaman como los botones)
  function tactil() {
    try {
      if (typeof window !== 'undefined' && ('ontouchstart' in window)) return true;
      return !!(typeof navigator !== 'undefined' && navigator && navigator.maxTouchPoints > 0);
    } catch (e) { return false; }
  }

  // Nombres de las teclas para el HUD y las pistas (contrato §3).
  // ÚNICO sitio de la Parte 3 donde se escriben las teclas a mano.
  // modo (opcional, añadido en la QA) = 'coop' → las teclas del co-op aunque ahora se juegue
  // solo (para la tabla de "Cómo jugar", que enseña las dos formas a la vez).
  G.p3teclas = function (jugador, modo) {
    try {
      if (isCoop() || modo === 'coop') {
        if (jugador === 2) return { ataque: 'K', disparo: 'L', hack: 'Ñ', cambio: 'I', salto: '↑' };
        return { ataque: 'F', disparo: 'G', hack: 'R', cambio: 'Q', salto: 'W / ESPACIO' };
      }
      if (tactil()) return { ataque: 'ATAQ', disparo: 'TIRO', hack: 'HACK', cambio: 'CAMBIO', salto: 'SALTO' };
    } catch (e) { /* respaldo: teclado de 1 jugador */ }
    return { ataque: 'J', disparo: 'K', hack: 'H', cambio: 'Q', salto: 'ESPACIO' };
  };

  // Sustituye {ataque} {disparo} {hack} {cambio} {salto} por las teclas del jugador j.
  // j = 0 (solo en co-op): las de los dos jugadores, "Q / I". En 1 jugador, j = 0 → j = 1.
  G.p3conTeclas = function (texto, j) {
    var s = String(texto == null ? '' : texto);
    try {
      var k;
      if (j === 0 && isCoop()) {
        var a = G.p3teclas(1), b = G.p3teclas(2);
        k = {};
        for (var n in a) {
          if (Object.prototype.hasOwnProperty.call(a, n)) k[n] = (a[n] === b[n]) ? a[n] : (a[n] + ' / ' + b[n]);
        }
      } else {
        k = G.p3teclas(j === 2 ? 2 : 1);
      }
      return s.replace(/\{ataque\}/g, k.ataque).replace(/\{disparo\}/g, k.disparo)
        .replace(/\{hack\}/g, k.hack).replace(/\{cambio\}/g, k.cambio).replace(/\{salto\}/g, k.salto);
    } catch (e) { return s; }
  };

  // Jugador (1 o 2) que pilota la fusión del capítulo (2, 3 o 5).
  G.p3pilotoFusion = function (chapter) {
    try {
      if (!isCoop()) return 1;
      var r = G.p3 && G.p3.run;
      if (r && (r.pilotoFusion === 1 || r.pilotoFusion === 2)) return r.pilotoFusion;
      return (Number(chapter) === 3) ? 2 : 1;
    } catch (e) { return 1; }
  };

  try { G.p3load(); } catch (e) {}
})();
