// depuracion.js — SOLO herramientas de prueba (no cambian el juego normal).
// Se carga DESPUÉS de main.js (cuando el juego ya arrancó en la portada).
// Lee parámetros de la URL. Sin parámetros no hace NADA.
//   ?escena=<nombre>         salta directamente a esa escena (p. ej. levelP2_1)
//   &params=<json>           parámetros para G.go (p. ej. {"chapter":2})
//   &coop=1                  activa 2 jugadores (y marca a Falcon como rescatado)
//   &p2=1                    desbloquea la Parte 2 entera (sin guardar)
//   &heroe=director|falcon   héroe del Jugador 1 en la Parte 2
//   &avanzar=<segundos>      simula ese tiempo de juego sin pulsar teclas (para capturas)
// Ejemplo: index.html?escena=levelP2_1&heroe=falcon&avanzar=6
// Parte 3 (contrato §18.1, aditivo):
//   &p3=1                    (o una escena que contenga "P3" o empiece por "p3") desbloquea la
//                            Parte 3 entera y la deja elegida (sin guardar)
//   &heroe=director|falcon|mikey|peter   con la Parte 3: héroe inicial del Jugador 1 (G.p3.hero)
//   &look=B                  todos los diseños de Juanjo en B (o &look=mikey:B,moto:B …)
//   &inv=1                   G.p3.debugInvulnerable = true (nadie recibe daño)
// Ejemplo: index.html?escena=levelP3_1&heroe=peter&avanzar=6
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var q;
  try {
    if (typeof location === 'undefined' || !location.search) return;
    q = new URLSearchParams(location.search);
  } catch (e) { return; }
  var escena = q.get('escena');
  if (!escena) return;

  // G.boot() espera a DOMContentLoaded: nos colgamos DESPUÉS (este listener se
  // registra más tarde, así que corre después de que el juego vaya a la portada).
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  function run() {
  try {
    if (q.get('coop') === '1') { G.state.falconRescued = true; G.state.coop = true; }
    if (q.get('p2') === '1' || escena.indexOf('P2') >= 0 || escena.indexOf('p2') === 0) {
      G.state.falconRescued = true;
      if (G.p2) { G.p2.unlocked = 5; G.p2.part = 2; }
    }
    var heroe = q.get('heroe');
    if (G.p2 && (heroe === 'director' || heroe === 'falcon')) { G.p2.hero = heroe; }
    // ---- Parte 3 (aditivo; nada de esto guarda en localStorage) ----
    try { parte3(heroe); } catch (e3) { console.error('[depuracion] Parte 3: ' + (e3 && e3.stack || e3)); }
    var params;
    try { params = q.get('params') ? JSON.parse(q.get('params')) : undefined; } catch (e) { params = undefined; }
    if (!G.scenes || !G.scenes[escena]) {
      console.error('[depuracion] La escena "' + escena + '" no existe.');
      return;
    }
    G.go(escena, params);
    var seg = parseFloat(q.get('avanzar') || '0');
    if (seg > 0 && G.scenes[escena] && typeof G.scenes[escena].update === 'function') {
      var n = Math.min(Math.round(seg * 60), 60 * 120);
      for (var i = 0; i < n; i++) {
        var cur = G.scenes[G.sceneName];
        if (!cur || typeof cur.update !== 'function') break;
        cur.update(1 / 60);
        if (G.inputClearPressed) { G.inputClearPressed(); }
      }
    }
  } catch (e) {
    console.error('[depuracion] ' + (e && e.stack || e));
  }
  }

  // Atajos de la Parte 3 (contrato §18.1). Solo cambian el estado en memoria.
  function parte3(heroe) {
    var p3 = q.get('p3') === '1' || escena.indexOf('P3') >= 0 || escena.indexOf('p3') === 0;
    if (!G.p3) return;
    if (p3) {
      G.state.falconRescued = true;
      if (G.p2) { G.p2.unlocked = 5; G.p2.part = 2; }
      G.p3.unlocked = 5;
      G.p3.chosen = true;
      var HEROES = G.p3.HEROES || ['director', 'falcon', 'mikey', 'peter'];
      if (heroe && HEROES.indexOf(heroe) >= 0) {
        G.p3.hero = heroe;
        if (G.p3.hero2 === heroe || HEROES.indexOf(G.p3.hero2) < 0) {
          G.p3.hero2 = (heroe !== 'falcon') ? 'falcon' : 'director';
        }
      }
    }
    var look = q.get('look');
    if (look) {
      G.p3.look = G.p3.look || {};
      var CLAVES = ['mikey', 'peter', 'robovill', 'moto', 'sub'];
      if (look === 'A' || look === 'B') {
        for (var i = 0; i < CLAVES.length; i++) G.p3.look[CLAVES[i]] = look;
      } else {
        var partes = look.split(',');
        for (var j = 0; j < partes.length; j++) {
          var kv = partes[j].split(':');
          var k = (kv[0] || '').trim(), v = (kv[1] || '').trim().toUpperCase();
          if (CLAVES.indexOf(k) >= 0 && (v === 'A' || v === 'B')) G.p3.look[k] = v;
        }
      }
    }
    if (q.get('inv') === '1') G.p3.debugInvulnerable = true;
  }
})();
