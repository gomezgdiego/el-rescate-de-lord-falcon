/* ============================================================================
 * niveles3.js — Niveles de plataformas de la PARTE 3 ("We Are a Team").
 * Dueño: niveles (contrato técnico de la Parte 3, §9.1–§9.3, §7, §11.1, §11.4,
 * §11.5 y §19.1).
 *
 * Registra (de forma PEREZOSA) tres escenas de plataformas:
 *   G.scenes.levelP3_1 -> Capítulo 1 "Entrenamiento en el cielo" (tema cielo, música training)
 *   G.scenes.levelP3_4 -> Capítulo 4 "La fábrica oscura"          (tema fabricaOscura, música darkFactory)
 *   G.scenes.levelP3_5 -> Capítulo 5 "Robovill" (solo la arena)    (tema arena, música boss3)
 * y publica G.p3levelDefs = {levelP3_1: def, levelP3_4: def, levelP3_5: def}.
 *
 * El motor (G.makePlatformScene3, en plataformas3.js) se construye en paralelo:
 * cada escena es un "envoltorio" que crea la escena real la primera vez que se
 * usa y le reenvía enter, update, render, exit, __debug y touchExtra. Si el
 * motor no existe (o falla al crearse), enseña "Nivel en construcción" sin romper.
 *
 * Leyenda (contrato §9.2): . vacío  # sólido  = plataforma de una vía  ^ pinchos
 *   S inicio  K checkpoint  h corazón  B caja  C consola (solo el Director)
 *   D puerta  T diana (solo el francotirador de Mikey)  R palanca en repisa alta
 *   (solo llega Falcon)  L barrera láser (solo la cruza Peter cubriéndose)
 *   < > cintas  P prensa  { puerta de la arena  J jefe
 *   x q a A t w r p  ejército de Robovill (enemigos de la Parte 2)
 *   u v z k  robots de práctica de Dark Secuaz   m mini-robot   n taladrín
 *
 * Reglas de diseño (las comprueba tests/check_mapas3.js):
 *   - 13 filas; suelo normal en la fila 11 (pies en y = 528).
 *   - K cada 30–45 columnas y uno a 6 columnas del { (la arena de §9.3 al final).
 *   - Cada puerta D se abre con su activador C/T/R más cercano, que siempre está
 *     ANTES de la puerta y se alcanza sin abrirla.
 *   - Repisa R: 5 filas por encima del suelo, sobre una repisa de 3 tiles a 4
 *     filas: solo el doble salto de Falcon llega.
 *   - Diana T: en una pared, en la fila de un balcón que está a 12 tiles; entre
 *     medias, un foso más bajo (desde allí no hay línea de visión) con escalones
 *     a la izquierda para volver al balcón: ningún foso es una trampa.
 *   - Barrera L: un pasillo con techo; la L ocupa todo el alto, con suelo a los
 *     dos lados.
 *   - Puzles encadenados en el capítulo 4: L → C → D → R → D (la consola está
 *     detrás del láser: cruza Peter y, al cambiar al Director, ¡él aparece al
 *     otro lado!), L → T (el balcón de la diana está tras el láser) y R → C.
 * ========================================================================== */
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  /* ==========================================================================
   * CAPÍTULO 1 — "Entrenamiento en el cielo"  [198 x 13]
   *   0-32    Patio: moverse, saltar, CAMBIAR de héroe; robots u y drones v
   *   33-65   Estación del Director: consola C → puerta D (robots u)
   *   66-99   Estación de Falcon: palanca R en la repisa alta → puerta D
   *   100-135 Estación de Mikey: balcón, diana T a 12 tiles → puerta D;
   *           después, un enjambre de drones de práctica (¡metralleta!)
   *   136-171 Estación de Peter: torretas z de espuma, barrera láser L y el
   *           robot con escudo k (lanzar el escudo)
   *   172-197 K y la arena del gran Robot de práctica (una consola)
   * ======================================================================== */
  var mapaCap1 = [
    // <MAPA levelP3_1>
    '#............................................#....................................#......................................#......................#########.........................#..................#',
    '#............................................#....................................#......................................#......................#########.........................#..................#',
    '#............................................#....................................#......................................#......................#########.........................#..................#',
    '#............................................#....................................#......................................#......................#########.........................#..................#',
    '#............................................#....................................#......................................#......................#########.........................#..................#',
    '#............................................#....................................#......................................#......................#########.........................#..................#',
    '#.......................v....................#.............................Rh.....#......................................#....v.................#########.........................#..................#',
    '#.........h..................v...............#.........v..h...............###.....#........................h.............T.......v..................L..................v..........#..................#',
    '#........===.................................D...........===......................D.........v............#####...........D..v......v................L.............................#.===..........===.#',
    '#............B...........u...................D....................................D.....................######...........D.....v....................L.............................{...==........==...#',
    '#..S..h......B..u.....######..h..K...u.h..C..D...B..u.............K..u............D...u..^........u.K..########..........D...........h..K.h..z......L.......z..k..h..u...h..K.h...{C........J........#',
    '###################..########################################..###############################...###############.........#############################################################################',
    '###################..########################################..###############################...#####################################################################################################'
    // </MAPA levelP3_1>
  ];

  /* ==========================================================================
   * CAPÍTULO 4 — "La fábrica oscura"  [244 x 13]
   *   0-35    Entrada: cintas, boxeador, robot con escudo, mini-robot y la
   *           consola 1 → puerta
   *   36-71   Pasillo de prensas y diana 1 (balcón y foso con una araña)
   *   72-107  Cadena: mini-torreta hackeable, barrera láser 1 (con araña de
   *           techo) → consola 2 → puerta → palanca 1 → puerta
   *   108-145 Cinta en contra, dron de rayos, barrera láser 2 → balcón →
   *           diana 2 (foso con taladrín)
   *   146-183 Dron en picado, palanca 2 → puerta → consola 3 → puerta,
   *           mini-robots, escudo y enjambre
   *   184-223 Último tramo: cinta, prensas, taladrín, mini-robot y corazones
   *   224-243 La arena de los Guardianes de Robovill (una consola)
   * ======================================================================== */
  var mapaCap4 = [
    // <MAPA levelP3_4>
    '#################################################################################################################################################################################################################################..................#',
    '#################################################################################################################################################################################################################################..................#',
    '#................................#......###########..................#..........#######....#.........#................#######................#..................#............#......................###########.................#..................#',
    '#................................#......###########..................#..........#######....#.........#................#######................#..................#............#......................###########.................#..................#',
    '#................................#......###########..................#..........#######....#.........#................#######................#........p.........#............#......................###########.................#..................#',
    '#................................#......###########..................#..........#######....#.........#............r...#######................#..................#.....m......#......w...............###########.................#..................#',
    '#...................m............#......###########..................#..........#######....#...hR....#................#######................#.............R....#..m.........#......................###########......m..........#..................#',
    '#................................#......###########..................T...........A.L.......#...###...#...................L......h............T............###...#............#......................###########.................#..................#',
    '#......................h.........D........P..P..P......###...........D.............L.......D.........D...................L.....###...........D..................D............D........................P..P..P...................#.===..........===.#',
    '#.....................###........D....................####...........D.............L.......D.........D...................L....####...........D..................D............D..................................................{...==........==...#',
    '#..S.h..........x.....###..q..C..D..K...............h######..........D..K...t......L....C..D.........D..x.h.K............L...######..........D.h..K.............D.........C..D..q.h.....K.........................n....hh.K.....{C........J........#',
    '########>>>>>>##############################################...a.....##########################################<<<<<################...n.....###############################################>>>>>>##################################################',
    '####################################################################################################################################################################################################################################################'
    // </MAPA levelP3_4>
  ];

  /* ==========================================================================
   * CAPÍTULO 5 — "Robovill" (solo la arena, §9.3 y §11.5)  [20 x 13]
   *   Dos consolas (izquierda y derecha); la S dentro de la arena (fila 10,
   *   columna 3): el combate empieza enseguida. Sin K: se reintenta en la arena.
   * ======================================================================== */
  var mapaCap5 = [
    // <MAPA levelP3_5>
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#.===..........===.#',
    '{...==........==...#',
    '{C.S......J.......C#',
    '####################',
    '####################'
    // </MAPA levelP3_5>
  ];

  var DEFS = {
    levelP3_1: {
      nombre: 'Entrenamiento en el cielo',
      tema: 'cielo',
      music: 'training',
      chapter: 1,
      mapa: mapaCap1,
      jefe: 'robotPractica',
      musicaJefe: 'boss3',
      alGanar: 'nivel',
      retry: 'levelP3_1',
      hints: [
        { x: 2, texto: 'Pulsa {cambio} para cambiar de héroe, ¡como en los juegos de LEGO!' },
        { x: 8, texto: '¡Bienvenidos a mi base del cielo! Hoy es vuestro examen final. Salta con {salto}.' },
        { x: 14, texto: 'Mis robots de práctica llevan una diana: ¡pegan flojito, derrótalos!' },
        { x: 23, texto: 'Cuando un robot enseña «!», va a atacar: ¡apártate y luego contraataca!' },
        { x: 42, texto: 'Estación del Director: ponte junto a la consola y mantén {hack} para abrir la puerta.' },
        { x: 54, texto: 'Cada héroe tiene su truco: el Director hackea, Falcon salta doble, Mikey dispara lejos y Peter se protege.' },
        { x: 74, texto: 'Estación de Falcon: la palanca está arriba. Pulsa {salto} y otra vez {salto} en el aire: ¡doble salto!' },
        { x: 88, texto: '¡Cuidado con los pinchos y el hueco! Salta con calma.' },
        { x: 101, texto: 'Estación de Mikey: sube al balcón, pulsa {disparo} hasta que salga «¡Francotirador!» y dispara a la diana con {ataque}.' },
        { x: 115, texto: '¿Ya diste a la diana? ¡Sigue, la puerta está abierta! Si no, sube por los escalones de la izquierda y vuelve al balcón.' },
        { x: 123, texto: '¡Un enjambre de drones! La metralleta de Mikey es perfecta para los grupos: pulsa {disparo} hasta que salga «¡Metralleta!».' },
        { x: 137, texto: 'Mis torretas lanzan espuma. Con Peter, mantén {ataque} para cubrirte: ¡el escudo protege a los de detrás!' },
        { x: 147, texto: 'Estación de Peter: solo su escudo aguanta el láser. Mantén {ataque} para cubrirte y crúzalo despacito.' },
        { x: 155, texto: 'Ese robot lleva escudo: lanza el escudo de Peter con {disparo} o pégale con los guantes del Director para darle la vuelta.' },
        { x: 170, texto: '¡Último examen: mi gran Robot de práctica! Usad a los cuatro: ¡sois un equipo!' }
      ]
    },
    levelP3_4: {
      nombre: 'La fábrica oscura',
      tema: 'fabricaOscura',
      music: 'darkFactory',
      chapter: 4,
      mapa: mapaCap4,
      jefe: 'guardian',
      musicaJefe: 'boss3',
      alGanar: 'nivel',
      retry: 'levelP3_4',
      hints: [
        { x: 2, texto: 'La fábrica oscura… No todos mis robots se volvieron buenos: ¡estos son de Robovill!' },
        { x: 14, texto: 'Los boxeadores avisan con «!» antes de pegar: apártate y contraataca cuando bajen los puños.' },
        { x: 19, texto: 'Los mini-robots de Robovill vuelan hacia ti: ¡un disparo de Mikey y hacen pop!' },
        { x: 25, texto: 'El robot con escudo solo se protege por delante: ¡salta por encima y atácalo por la espalda!' },
        { x: 37, texto: 'Las prensas tiemblan y enseñan «!» antes de bajar: ¡espera y pasa cuando suban!' },
        { x: 53, texto: 'Otra diana en la pared: ¡el francotirador de Mikey, desde el balcón!' },
        { x: 61, texto: '¿Ya diste a la diana? ¡Sigue, la puerta está abierta! Si no, sube por los escalones de la izquierda y vuelve al balcón.' },
        { x: 65, texto: 'Las arañas-robot corretean y dan saltitos: ¡dales de lejos con las flechas de Falcon o los lanzadores de Mikey!' },
        { x: 74, texto: 'Esa mini-torreta es de Robovill: el Director puede hackearla con {hack} para que os ayude.' },
        { x: 79, texto: 'La consola está detrás del láser. Cruza con Peter cubriéndote y luego cambia al Director: ¡aparecerá a tu lado!' },
        { x: 92, texto: 'La puerta siguiente se abre con una palanca en lo alto: ¡Falcon, a por ella!' },
        { x: 110, texto: '¡Una cinta en contra! Y el dron de rayos brilla antes de disparar: Peter puede parar su rayo.' },
        { x: 117, texto: 'El balcón de la diana está tras el láser: Peter primero, y después ¡Mikey al balcón!' },
        { x: 133, texto: '¿Aún no diste a la diana? Para volver al balcón, sube por los escalones de la izquierda del foso.' },
        { x: 137, texto: 'Ese montoncito de tierra es un taladrín: sale de golpe con «!». ¡Apártate y pégale cuando esté fuera!' },
        { x: 148, texto: 'El dron en picado avisa con «!» y se lanza: ¡apártate y contraataca!' },
        { x: 158, texto: 'Palanca, puerta, consola, puerta… ¡Cada héroe hace su parte!' },
        { x: 178, texto: 'Un enjambre de drones: ¡la metralleta de Mikey los hace pop a todos!' },
        { x: 186, texto: 'Ya casi estáis en el corazón de la fábrica. ¡Coged corazones!' },
        { x: 219, texto: '¡Los Guardianes de Robovill! Cada héroe tiene su trabajo. Mikey: dispara desde las plataformas bajas y haz pop a sus minas. ¡Sois un equipo!' }
      ]
    },
    levelP3_5: {
      nombre: 'Robovill',
      tema: 'arena',
      music: 'boss3',
      chapter: 5,
      mapa: mapaCap5,
      jefe: 'robovillPie',
      musicaJefe: 'boss3',
      alGanar: 'fusionFinal',
      retry: 'levelP3_5',
      // Sin pistas propias: la S está dentro de la arena y el motor no enseña def.hints con la arena
      // activa; las pistas del combate las da el jefe (robovillPie.hint).
      hints: []
    }
  };

  G.p3levelDefs = G.p3levelDefs || {};
  for (var k in DEFS) {
    if (Object.prototype.hasOwnProperty.call(DEFS, k)) G.p3levelDefs[k] = DEFS[k];
  }

  /* --------------------------------------------------------------------------
   * Pantalla de respaldo "Nivel en construcción" (si el motor no está).
   * ------------------------------------------------------------------------ */
  function drawPlaceholder(ctx, def, t) {
    ctx.save();
    try {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, G.W || 960, G.H || 540);
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(def.nombre, (G.W || 960) / 2, 220);
      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('Nivel en construcción…', (G.W || 960) / 2, 270);
      ctx.fillStyle = 'rgba(226,232,240,' + (0.5 + 0.5 * Math.sin((t || 0) * 4)) + ')';
      ctx.fillText('Pulsa Enter para volver', (G.W || 960) / 2, 330);
    } catch (e) { /* nada */ }
    ctx.restore();
  }

  var DEBUG_VACIO = {
    heroes: function () { return []; },
    enemies: function () { return []; },
    boss: function () { return null; },
    teleport: function () {},
    setHero: function () { return false; },
    puzzles: function () { return []; },
    arena: function () { return null; },
    state: function () { return { t: 0, leaving: false, checkpoint: -1 }; }
  };

  /* --------------------------------------------------------------------------
   * Escena perezosa: delega en G.makePlatformScene3(def) cuando existe.
   * ------------------------------------------------------------------------ */
  function makeLazyScene(key) {
    var def = DEFS[key];
    var real = null;
    var t = 0;
    var avisos = 0;

    function aviso(donde, e) {
      if (avisos < 5) {
        avisos++;
        try { console.warn('[niveles3] ' + key + '.' + donde + ': ' + ((e && e.stack) || e)); } catch (e2) { /* nada */ }
      }
    }

    function ensure() {
      if (real) return real;
      if (typeof G.makePlatformScene3 !== 'function') return null;
      try {
        var s = G.makePlatformScene3(def);
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
          if (G.input && (G.input.pressed('confirm') || G.input.pressed('attack'))) G.go('title');
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
        drawPlaceholder(ctx, def, t);
      },
      exit: function () {
        var r = real;
        if (r && typeof r.exit === 'function') {
          try { r.exit(); } catch (e) { aviso('exit', e); }
        }
      },
      // Botones táctiles extra (§4): las plataformas piden CAMBIO.
      touchExtra: function () {
        var r = real || ensure();
        if (r && r.touchExtra != null) {
          try {
            var ex = (typeof r.touchExtra === 'function') ? r.touchExtra() : r.touchExtra;
            if (ex && typeof ex === 'object') return ex;
          } catch (e) { aviso('touchExtra', e); }
        }
        return { cambio: true };
      }
    };
    // __debug de la escena real (§9.8), leído en el momento de usarlo.
    try {
      Object.defineProperty(scene, '__debug', {
        enumerable: true,
        configurable: true,
        get: function () {
          var r = real || ensure();
          return (r && r.__debug) ? r.__debug : DEBUG_VACIO;
        }
      });
    } catch (e) {
      scene.__debug = DEBUG_VACIO;
    }
    return scene;
  }

  G.scenes = G.scenes || {};
  G.scenes.levelP3_1 = makeLazyScene('levelP3_1');
  G.scenes.levelP3_4 = makeLazyScene('levelP3_4');
  G.scenes.levelP3_5 = makeLazyScene('levelP3_5');
})();
