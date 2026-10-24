/* ============================================================================
 * niveles2.js — Niveles de plataformas de la PARTE 2 ("La Gema Robada").
 *
 * Registra (de forma PEREZOSA) dos escenas de plataformas:
 *   G.scenes.levelP2_1 -> Capítulo 1 "Ciudad atacada"    (tema ciudad,  música city)
 *   G.scenes.levelP2_3 -> Capítulo 3 "Fábrica de robots" (tema fabrica, música factory)
 *
 * El motor (G.makePlatformScene2, en plataformas2.js) se construye en paralelo,
 * así que cada escena es un objeto "envoltorio": la primera vez que se entra,
 * crea la escena real con G.makePlatformScene2(def) y le delega enter, update,
 * render, exit y __debug. Si el motor no existe (o falla al crearse), muestra
 * una pantalla "Nivel en construcción" sin romper nada.
 *
 * Leyenda (contrato §6): . vacío  # sólido  = plataforma de una vía  ^ pinchos
 *   S inicio  K checkpoint  h corazón  M medalla  B caja  C consola  D puerta
 *   E salida  < > cintas  P prensa  x boxeador  q escudo  a/A araña (suelo/techo)
 *   t mini-torreta  w enjambre  r dron de rayos  p dron en picado
 *
 * Límites de diseño (verificados con un BFS de saltos del Director, que NO tiene
 * doble salto ni necesita jetpack): huecos de 3 tiles como máximo, subidas de 2
 * tiles como máximo por salto, ninguna dependencia de un arma concreta, cada
 * puerta D con su consola C antes y accesible, 3 medallas por nivel y
 * checkpoints cada 35-45 columnas.
 *
 * Las puertas son de UNA sola D a ras de suelo con un muro que baja del techo
 * hasta dejar un hueco de 1 tile encima: el héroe (58 px) no cabe por encima,
 * así que la puerta solo se cruza cuando su consola la abre. Así cada consola
 * abre exactamente "la D más cercana".
 * ========================================================================== */
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  /* ==========================================================================
   * CAPÍTULO 1 — "Ciudad atacada"  [210 x 13]
   *   0-31    azoteas: moverse, saltar, armas (J/K) con una caja y 1.er boxeador
   *   32-73   la calle: coches, andamio, mini-torreta (hackeo con H), boxeadores
   *   74-122  andamios y azoteas: el enjambre de drones y saltos entre edificios
   *   123-163 avenida: dron de rayos, autobús, dron en picado, ruta alta
   *   167-209 tramo final y zona tranquila con una mini-torreta antes de la E
   * Medallas: fácil (encima de un coche, col 37), media (en el aire entre dos
   * edificios, col 101) y difícil (salto desde lo alto de los andamios, col 156).
   * ======================================================================== */
  // <MAPA levelP2_1>
  var mapaCiudad = [
    "............................................................................................................................................................M.....................................................",
    "....................................................................................................................................................p.............................................................",
    "..................................................................................................................................................................................................................",
    "................................................................................................w....M...................................................==.......................................................",
    "..................................................................................................................................................................................................................",
    "............................................................................................................x........................................==............................r..............................",
    ".................................................................................................h....##########..................r...............................................................................",
    ".S.......B.........h...x.......................h....................................===.############..##########....K............................==...............................................................",
    "##############..############.........M........====......................................############..#################.............................................................===...........................",
    "##############..##############..................................................===.....############..###################...................####..................................................................",
    "##############..################....##....K.........x...##....t.....x.........K.........############..#####################...........##..h.####..............K..x..........x...##......x.h.......K....t..h...E...",
    "##############..########################################################..##########################..##############################################################...###########################################",
    "##############..########################################################..##########################..##############################################################...###########################################"
  ];
  // </MAPA levelP2_1>

  /* ==========================================================================
   * CAPÍTULO 3 — "Fábrica de robots"  [215 x 13]
   *   0-43    entrada: cinta a favor, boxeador y el primer robot con escudo
   *   44-80   pasillo de prensas (huecos seguros entre ellas) y cintas flotantes
   *   81-125  puerta 1 (consola en la pasarela de arriba), dron de rayos, escudo
   *   121-165 techo bajo con arañas, dron en picado y puerta 2 (consola en un bloque)
   *   166-214 segundo pasillo de prensas, ruta alta de la medalla y salida
   * Medallas: fácil (sobre la primera cinta, col 13), media (junto al muro de la
   * puerta 2, col 158) y difícil (cinta en contra y salto final, col 197).
   * ======================================================================== */
  // <MAPA levelP2_3>
  var mapaFabrica = [
    "#######################################################################################################################################################################################################################",
    "#######################################################################################################################################################################################################################",
    "............................................#######################............................#.............................###############....................#......###############.................................",
    "............................................#######################............................#.............................###############.....p..............#......###############...........p...M.................",
    "............................................#######################............................#.............................###############..................M.#......###############.................................",
    "............................................#######################............................#.................r...........###############....................#......###############....r.........==.................",
    "............................................#######################.........................C..#........h........................A.....A........................#......###############.................................",
    "............................................#######################.....................######.#.....######................................................===..#......###############.........<<<.....................",
    ".............M...............=====..............P....P....P....P........h.................A....#.........................................................C......#..........P....P......................................",
    ".......................................................................<<<..........===...........==....................................................##..................................==.........................",
    ".S.................x...........q......K................h......................K................D............B.q.........K.......................h...x...##......D.K....................q................K..h......E....",
    "########>>>>>>>#######..#############################################.......####################################>>>>>>>######################..#########################################>>>############################",
    "######################..#############################################.......#################################################################..########################################################################"
  ];
  // </MAPA levelP2_3>

  var DEFS = {
    levelP2_1: {
      nombre: 'Ciudad atacada',
      tema: 'ciudad',
      music: 'city',
      chapter: 1,
      mapa: mapaCiudad,
      hints: [
        { x: 1,   texto: '¡La ciudad está en peligro! Muévete con las flechas y salta con ESPACIO.' },
        { x: 6,   texto: 'Ataca con J y dispara con K. ¡Prueba a romper esa caja!' },
        { x: 17,  texto: '¡Un robot boxeador! Cuando veas «!», apártate y luego contraataca.' },
        { x: 33,  texto: 'Sube al coche: ¡hay una medalla! En cada nivel se esconden 3.' },
        { x: 58,  texto: 'Mantén H cerca de una mini-torreta para que te ayude.' },
        { x: 75,  texto: 'Sube por los andamios para llegar a las azoteas.' },
        { x: 89,  texto: '¡Un enjambre de drones! Esquiva al que baje con «!» y golpéalo.' },
        { x: 98,  texto: 'Salta entre los edificios… ¿alcanzarás la medalla del aire?' },
        { x: 124, texto: 'El dron de rayos se para y brilla antes de disparar: ¡salta su rayo!' },
        { x: 143, texto: '¡Cuidado arriba! El dron en picado avisa con «!» y se lanza. ¡Apártate!' },
        { x: 162, texto: 'Una grieta en la calle: ¡coge carrerilla y salta!' },
        { x: 193, texto: 'Zona tranquila. Mantén H junto a la mini-torreta y hazla tu amiga.' },
        { x: 204, texto: '¡Lo lograste! Entra en el portal brillante.' }
      ]
    },
    levelP2_3: {
      nombre: 'Fábrica de robots',
      tema: 'fabrica',
      music: 'factory',
      chapter: 3,
      mapa: mapaFabrica,
      hints: [
        { x: 1,   texto: 'La fábrica de robots de Dark Secuaz. ¡Aquí todo se mueve!' },
        { x: 6,   texto: 'Las cintas transportadoras te empujan. Camina o salta para ir a tu ritmo.' },
        { x: 26,  texto: '¡Robot con escudo! Atácalo por detrás o atrápalo con la red.' },
        { x: 42,  texto: '¡Prensas! Tiemblan y muestran «!» antes de bajar. Pasa cuando suban.' },
        { x: 67,  texto: 'Esas cintas flotantes te llevan hacia atrás: ¡salta rápido!' },
        { x: 84,  texto: 'La puerta está cerrada. Sube a la pasarela y mantén H en la consola.' },
        { x: 102, texto: 'El dron de rayos se para y brilla antes de disparar: ¡salta su rayo!' },
        { x: 123, texto: '¡Arañas en el techo! Si ves «!», apártate: caen de sorpresa.' },
        { x: 144, texto: '¡Dron en picado! Cuando grite «!», muévete a un lado.' },
        { x: 150, texto: 'Otra puerta cerrada. Sube al bloque y mantén H en la consola.' },
        { x: 166, texto: 'Más prensas. Mira su ritmo y pasa de una en una.' },
        { x: 187, texto: '¿Ves la medalla allá arriba? La cinta te empuja: ¡corre y salta!' },
        { x: 205, texto: '¡La salida! Dark Secuaz no puede andar lejos.' }
      ]
    }
  };

  /* --------------------------------------------------------------------------
   * Comprobación ligera al cargar: avisa por consola, NUNCA lanza.
   * ------------------------------------------------------------------------ */
  function verificar(nombre, mapa) {
    try {
      if (!mapa || !mapa.length) { console.warn('[niveles2] ' + nombre + ': mapa vacío'); return; }
      var ancho = mapa[0].length, s = 0, e = 0, m = 0;
      for (var i = 0; i < mapa.length; i++) {
        if (mapa[i].length !== ancho) console.warn('[niveles2] ' + nombre + ': la fila ' + i + ' mide ' + mapa[i].length + ' (se esperaba ' + ancho + ')');
        for (var j = 0; j < mapa[i].length; j++) {
          var ch = mapa[i].charAt(j);
          if (ch === 'S') s++; else if (ch === 'E') e++; else if (ch === 'M') m++;
        }
      }
      if (s !== 1 || e !== 1 || m !== 3) console.warn('[niveles2] ' + nombre + ': S=' + s + ' E=' + e + ' M=' + m);
    } catch (err) { /* nunca romper la carga */ }
  }

  /* --------------------------------------------------------------------------
   * Pantalla de reserva "Nivel en construcción" (si el motor aún no existe).
   * ------------------------------------------------------------------------ */
  function drawConstruccion(ctx, def, t) {
    var W = G.W || 960, H = G.H || 540;
    ctx.save();
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, def.tema === 'fabrica' ? '#1f2937' : '#1e3a5f');
    grd.addColorStop(1, def.tema === 'fabrica' ? '#111827' : '#0f172a');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    // franjas de obra amarillas y negras
    for (var i = -2; i < 26; i++) {
      ctx.fillStyle = (i % 2 === 0) ? '#facc15' : '#1f2937';
      ctx.beginPath();
      var x0 = i * 44 + ((t * 30) % 88);
      ctx.moveTo(x0, H - 60); ctx.lineTo(x0 + 44, H - 60); ctx.lineTo(x0 + 20, H - 20); ctx.lineTo(x0 - 24, H - 20);
      ctx.closePath(); ctx.fill();
    }
    try {
      if (G.gfx && G.gfx.drawDirector) {
        G.gfx.drawDirector(ctx, W / 2, H - 70, { t: t, facing: 1, pose: 'idle', scale: 1.4 });
      }
    } catch (e) { /* sin dibujo */ }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Capítulo ' + def.chapter + ': ' + def.nombre, W / 2, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('Nivel en construcción', W / 2, 180);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText('¡Los ingenieros robot están terminando este nivel!', W / 2, 230);
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = '#fde68a';
      ctx.fillText('Pulsa Enter para volver a la portada', W / 2, 280);
    }
    ctx.restore();
  }

  var DEBUG_VACIO = {
    heroes: function () { return []; },
    enemies: function () { return []; },
    medals: function () { return []; },
    teleport: function () {}
  };

  /* --------------------------------------------------------------------------
   * Escena perezosa: delega en G.makePlatformScene2(def) cuando existe.
   * ------------------------------------------------------------------------ */
  function makeLazyScene(key) {
    var def = DEFS[key];
    var real = null;
    var t = 0;
    var avisos = 0;

    function aviso(donde, e) {
      if (avisos < 5) {
        avisos++;
        try { console.warn('[niveles2] ' + key + '.' + donde + ': ' + (e && e.stack || e)); } catch (e2) { /* nada */ }
      }
    }

    function ensure() {
      if (real) return real;
      if (typeof G.makePlatformScene2 !== 'function') return null;
      try {
        var s = G.makePlatformScene2(def);
        if (s && typeof s === 'object') real = s;
      } catch (e) { aviso('crear', e); real = null; }
      return real;
    }

    var scene = {
      def: def,
      enter: function (params) {
        t = 0;
        var r = ensure();
        if (r && typeof r.enter === 'function') {
          try { r.enter(params); } catch (e) { aviso('enter', e); }
        }
      },
      update: function (dt) {
        t += dt || 0;
        var r = real;
        if (r) {
          if (typeof r.update === 'function') {
            try { r.update(dt); } catch (e) { aviso('update', e); }
          }
          return;
        }
        try {
          if (G.input && (G.input.pressed('confirm') || G.input.pressed('attack'))) {
            G.go('title');
          }
        } catch (e) { /* nada */ }
      },
      render: function (ctx) {
        var r = real;
        if (r) {
          if (typeof r.render === 'function') {
            try { r.render(ctx); } catch (e) { aviso('render', e); }
          }
          return;
        }
        try { drawConstruccion(ctx, def, t); } catch (e) { /* nada */ }
      },
      exit: function () {
        var r = real;
        if (r && typeof r.exit === 'function') {
          try { r.exit(); } catch (e) { aviso('exit', e); }
        }
      }
    };

    // __debug (contrato §11): siempre el de la escena real si existe.
    try {
      Object.defineProperty(scene, '__debug', {
        enumerable: true,
        configurable: true,
        get: function () {
          var r = real || ensure();
          return (r && r.__debug) ? r.__debug : DEBUG_VACIO;
        }
      });
    } catch (e) { scene.__debug = DEBUG_VACIO; }

    return scene;
  }

  verificar('levelP2_1', mapaCiudad);
  verificar('levelP2_3', mapaFabrica);

  G.scenes = G.scenes || {};
  G.scenes.levelP2_1 = makeLazyScene('levelP2_1');
  G.scenes.levelP2_3 = makeLazyScene('levelP2_3');

  // Para pruebas y verificadores (solo lectura).
  G.p2levelDefs = DEFS;
})();
