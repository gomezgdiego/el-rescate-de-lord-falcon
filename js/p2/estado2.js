// estado2.js — Estado de la PARTE 2 "La Gema Robada" (contrato técnico §3).
// Creado por Juanjo (Diseñador Jefe, 10 años) y Papá (Productor).
// Define G.p2 y sus utilidades. NO toca G.state (la Parte 1 queda idéntica).
// Persistencia en localStorage (clave 'rescate-lord-falcon-p2-v1'), siempre con
// try/catch: en file:// o en modo privado puede fallar y el juego sigue igual.
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var KEY = 'rescate-lord-falcon-p2-v1';

  // ---- Armas de la armería (orden de la pantalla) ----
  var WEAPONS = ['espada', 'arco', 'guantes', 'pulso', 'bumeran', 'red', 'jetpack'];
  var WEAPON_INFO = {
    espada: { nombre: 'Espada', tipo: 'cuerpo', desc: 'Golpe rápido de cerca.' },
    arco: { nombre: 'Arco', tipo: 'distancia', desc: 'Flechas certeras desde lejos.' },
    guantes: { nombre: 'Guantes', tipo: 'cuerpo', desc: 'Puñetazo superfuerte: ¡quita el doble!' },
    pulso: { nombre: 'Pulso eléctrico', tipo: 'distancia', desc: 'Rayo corto que deja aturdidos a los robots.' },
    bumeran: { nombre: 'Escudo bumerán', tipo: 'distancia', desc: 'Para los disparos y vuelve a tu mano.' },
    red: { nombre: 'Lanza-redes', tipo: 'distancia', desc: 'Atrapa drones y robots pequeños.' },
    jetpack: { nombre: 'Jetpack', tipo: 'movimiento', desc: '¡Mantén el botón para volar! Gasta combustible.' }
  };
  // Armas clásicas de cada héroe (las de la Parte 1).
  var CLASSIC = { director: ['guantes', 'pulso'], falcon: ['espada', 'arco'] };

  function isWeapon(w) { return typeof w === 'string' && WEAPONS.indexOf(w) >= 0; }
  function otherHero(h) { return h === 'falcon' ? 'director' : 'falcon'; }

  function freshMedals() {
    return { 1: [false, false, false], 2: [false, false, false], 3: [false, false, false], 4: [false, false, false] };
  }

  // Valores por defecto de los campos persistidos y de los de ejecución.
  function applyDefaults(p) {
    p.part = 1;
    p.unlocked = 1;
    p.medals = freshMedals();
    p.hero = 'director';
    p.loadout = { director: CLASSIC.director.slice(), falcon: CLASSIC.falcon.slice() };
    p.vehicle = { transformable: 'A', mechahalcon: 'A' };
    p.pendingChapter = 1;
    p.run = { medals: [false, false, false] };
    return p;
  }

  // Deja a un héroe con exactamente 2 armas distintas, conocidas y que no lleve
  // el otro héroe ('ocupadas'). Rellena con sus clásicas y luego con las libres.
  function fixHero(list, hero, ocupadas) {
    var out = [];
    var i, w;
    list = Array.isArray(list) ? list : [];
    for (i = 0; i < list.length && out.length < 2; i++) {
      w = list[i];
      if (isWeapon(w) && out.indexOf(w) < 0 && ocupadas.indexOf(w) < 0) out.push(w);
    }
    var pref = (CLASSIC[hero] || []).concat(WEAPONS);
    for (i = 0; i < pref.length && out.length < 2; i++) {
      w = pref[i];
      if (out.indexOf(w) < 0 && ocupadas.indexOf(w) < 0) out.push(w);
    }
    return out;
  }

  // Valida una armería completa. 'first' = héroe que tiene prioridad si hay
  // choque (por defecto, el del Jugador 1). Nunca dos héroes con la misma arma.
  function fixLoadout(lo, first) {
    lo = (lo && typeof lo === 'object') ? lo : {};
    first = (first === 'falcon') ? 'falcon' : 'director';
    var second = otherHero(first);
    var res = {};
    res[first] = fixHero(lo[first], first, []);
    res[second] = fixHero(lo[second], second, res[first]);
    return { director: res.director, falcon: res.falcon };
  }

  // Valida todo G.p2 en el sitio (nunca lanza).
  function validate(p) {
    try {
      p.part = (p.part === 2) ? 2 : 1;
      var u = Math.floor(Number(p.unlocked));
      p.unlocked = (u >= 1 && u <= 5) ? u : 1;
      var m = (p.medals && typeof p.medals === 'object') ? p.medals : {};
      var nm = freshMedals();
      for (var c = 1; c <= 4; c++) {
        var arr = Array.isArray(m[c]) ? m[c] : [];
        for (var k = 0; k < 3; k++) nm[c][k] = arr[k] === true;
      }
      p.medals = nm;
      p.hero = (p.hero === 'falcon') ? 'falcon' : 'director';
      p.loadout = fixLoadout(p.loadout, p.hero);
      var v = (p.vehicle && typeof p.vehicle === 'object') ? p.vehicle : {};
      p.vehicle = {
        transformable: (v.transformable === 'B') ? 'B' : 'A',
        mechahalcon: (v.mechahalcon === 'B') ? 'B' : 'A'
      };
      var pc = Math.floor(Number(p.pendingChapter));
      p.pendingChapter = (pc >= 1 && pc <= 5) ? pc : 1;
      if (!p.run || !Array.isArray(p.run.medals) || p.run.medals.length !== 3) {
        p.run = { medals: [false, false, false] };
      }
    } catch (e) { applyDefaults(p); }
    return p;
  }

  // ---- G.p2 (contrato §3) ----
  G.p2 = applyDefaults({});
  G.p2.WEAPONS = WEAPONS;
  G.p2.WEAPON_INFO = WEAPON_INFO;
  G.p2.CLASSIC = CLASSIC;
  G.p2.debugInvulnerable = false; // atajo de pruebas (§11); no se guarda

  // Carga lo guardado (si lo hay) y lo valida.
  G.p2load = function () {
    var p = G.p2;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var d = JSON.parse(raw);
          if (d && typeof d === 'object') {
            if ('part' in d) p.part = d.part;
            if ('unlocked' in d) p.unlocked = d.unlocked;
            if ('medals' in d) p.medals = d.medals;
            if ('hero' in d) p.hero = d.hero;
            if ('loadout' in d) p.loadout = d.loadout;
            if ('vehicle' in d) p.vehicle = d.vehicle;
          }
        }
      }
    } catch (e) { /* datos corruptos o sin acceso: valores por defecto */ }
    validate(p);
  };

  // Guarda solo los campos persistidos.
  G.p2save = function () {
    var p = G.p2;
    try {
      validate(p);
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(KEY, JSON.stringify({
          part: p.part, unlocked: p.unlocked, medals: p.medals,
          hero: p.hero, loadout: p.loadout, vehicle: p.vehicle
        }));
      }
    } catch (e) { /* sin almacenamiento: el juego sigue */ }
  };

  // ¿Está desbloqueada la Parte 2? (al rescatar a Lord Falcon en la Parte 1)
  G.p2available = function () {
    return !!(G.state && G.state.falconRescued === true);
  };

  // Número de medallas guardadas (0..12).
  G.p2medalTotal = function () {
    var n = 0;
    try {
      var m = G.p2.medals || {};
      for (var c = 1; c <= 4; c++) {
        var arr = m[c] || [];
        for (var k = 0; k < 3; k++) if (arr[k] === true) n++;
      }
    } catch (e) { n = 0; }
    return n;
  };

  // Medallas del intento actual a cero.
  G.p2resetRun = function () {
    G.p2.run = { medals: [false, false, false] };
  };

  // --- Extras (interfaz) ---
  // Borrar progreso de la Parte 2: valores por defecto + guardar.
  G.p2resetAll = function () {
    applyDefaults(G.p2);
    G.p2save();
  };
  // Valida una armería {director:[..], falcon:[..]} (sin tocar G.p2).
  G.p2fixLoadout = function (lo, first) { return fixLoadout(lo, first); };

  G.p2load();
})();
