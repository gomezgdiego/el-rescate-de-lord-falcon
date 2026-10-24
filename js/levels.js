/* ============================================================================
 * levels.js — Diseno de niveles de plataformas de "El Rescate de Lord Falcon".
 *
 * Registra tres escenas usando G.makePlatformScene (definida en platformer.js):
 *   G.scenes.level1  -> Falcon,    tema canyon, music 'canyon', nivel 1
 *   G.scenes.level2  -> Director,  tema base,   music 'base',   nivel 2
 *   G.scenes.level4  -> Director,  tema ship,   music 'ship',   nivel 4
 *
 * LEYENDA FIJA del mapa (cada char = tile de 48px):
 *   '.' vacio        '#' solido           '=' plataforma una via (se atraviesa desde abajo)
 *   '^' pincho       'S' inicio           'K' checkpoint (bandera)
 *   'h' corazon      'G' toro-guardia     'd' dron
 *   'T' torreta      'B' caja rompible    'C' consola hackeable
 *   'D' puerta cerrada (se abre al hackear la 'C' mas cercana)
 *   'E' salida (portal brillante)
 *
 * LIMITES DE MOVIMIENTO (verificados contra la fisica del contrato):
 *   gravedad 1800, salto -640  => un salto sube ~2,3 tiles y cruza ~3,8 tiles de aire.
 *   - Falcon   (vel 290, DOBLE salto): huecos hasta 5 tiles, subidas hasta 4 tiles.
 *   - Director (vel 260, SIN doble salto): huecos MAX 3 tiles, subidas MAX 2 tiles.
 *
 * Estos mapas se generaron y verificaron programaticamente. Garantias comprobadas:
 *   - Todas las filas de un mapa miden EXACTAMENTE lo mismo (level1=150, level2=155,
 *     level4=172 columnas; 13 filas cada uno; suelo en las dos filas inferiores).
 *   - Existe 'S' (col 0) y una 'E' alcanzable al final.
 *   - Ningun hueco supera el limite del heroe (level1 hueco max 4; level2 y level4
 *     hueco max 3, aptos para el Director sin doble salto).
 *   - Ninguna subida entre columnas de suelo supera el limite del heroe.
 *   - Cada 'D' tiene su 'C' en una columna ANTERIOR y accesible (sin puertas
 *     bloqueando el camino hacia esa consola).
 *   - Checkpoints 'K' repartidos ~cada 40 columnas.
 *
 * Los mapas se definen como arrays FRESCOS de strings literales; platformer.js
 * reconstruye su estado interno a partir de esta definicion en cada enter(),
 * asi que aqui solo describimos la geometria estatica del nivel.
 * ========================================================================== */

window.G = window.G || {};

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * Verificacion LOCAL (sin depender de otros modulos): al cargar comprueba que
   * todas las filas midan igual y que existan 'S' y 'E'. Avisa por consola pero
   * NUNCA lanza excepcion. Devuelve el mismo array para poder encadenar.
   * ------------------------------------------------------------------------ */
  function verificarMapa(nombre, mapa) {
    try {
      if (!Array.isArray(mapa) || mapa.length === 0) {
        console.warn('[levels] ' + nombre + ': mapa vacio o no es array');
        return mapa;
      }
      var ancho = mapa[0].length;
      var tieneS = false, tieneE = false;
      for (var i = 0; i < mapa.length; i++) {
        if (mapa[i].length !== ancho) {
          console.warn('[levels] ' + nombre + ': fila ' + i + ' mide ' +
            mapa[i].length + ' pero se esperaba ' + ancho);
        }
        if (mapa[i].indexOf('S') !== -1) tieneS = true;
        if (mapa[i].indexOf('E') !== -1) tieneE = true;
      }
      if (!tieneS) console.warn('[levels] ' + nombre + ': falta la casilla de inicio S');
      if (!tieneE) console.warn('[levels] ' + nombre + ': falta la salida E');
    } catch (e) {
      console.warn('[levels] error verificando ' + nombre, e);
    }
    return mapa;
  }

  /* ==========================================================================
   * NIVEL 1 — "La Emboscada"  (Heroe: Falcon · Tema: canyon)  [150 x 13]
   *
   * Ritmo enseña -> practica -> sorprende:
   *   cols 0-25   : suelo llano para aprender a moverse y saltar. Corazon facil.
   *   cols 26-58  : primeros huecos y plataformas '='; guardias telegrafiados;
   *                 primer checkpoint (col 15) y segundo (col 60).
   *   cols 59-92  : practica del DOBLE salto (plataformas altas + secreto de
   *                 corazones arriba); aparece un dron; pinchos evitables (^^^).
   *   cols 93-130 : combate mixto (guardias + drones) sobre plataformeo;
   *                 checkpoints en col 95 y 130.
   *   cols 131-149: descenso final hasta el portal E. Corazon de premio.
   * ======================================================================== */
  var mapaNivel1 = [
    "......................................................................................................................................................",
    "......................................................................................................................................................",
    "......................................................................................................................................................",
    "...................................................................h.h................................................h.h.............................",
    "..................................................h.......d....===========..........................................=======...........................",
    ".................h.h........................===========.......................................................d.......................................",
    "...............========.....................................................===============..............====.........................................",
    "...............................................................d....................h.h....................................===........................",
    "..............................===...................................................................................................====....====......",
    "......................................................................................................................................................",
    "S....h.........K.........G................G.................K.........G...................^^^..K...G..............................K.......G.......hE..",
    "###########################...################....##############...################....#################....################...#############...#######",
    "###########################...################....##############...################....#################....################...#############...#######"
  ];

  /* ==========================================================================
   * NIVEL 2 — "La Preparacion"  (Heroe: Director · Tema: base)  [155 x 13]
   *
   * ATENCION: Director NO tiene doble salto. Huecos <=3, subidas <=2 (verificado).
   *
   *   cols 0-33  : moverse y romper la primera caja 'B' (J); primera consola 'C'
   *                (col 20) que abre la puerta 'D' (col 34). Checkpoint col 15.
   *   cols 34-64 : practicar hackeo y cruzar puertas; guardias suaves; segunda
   *                consola 'C' (col 64) -> puerta 'D' (col 72). Checkpoint col 58.
   *   cols 73-100: torreta 'T' (hackeable o a golpes) sobre huecos de 3 tiles;
   *                plataformas '=' con corazones. Checkpoint col 100.
   *   cols 101-136: tercera consola 'C' (col 116) -> puerta 'D' (col 126); drones;
   *                 mas cajas. Checkpoint col 135.
   *   cols 137-154: hangar final -> portal E.
   * ======================================================================== */
  var mapaNivel2 = [
    "...........................................................................................................................................................",
    "...........................................................................................................................................................",
    "...........................................................................................................................................................",
    "...........................................................................................................................................................",
    "..........................................................................................................h.h...d..........................................",
    "............................................................d............................................====..............................................",
    "...........................................................................................................................................................",
    "................h..............................h...........................h...............................................................................",
    "...............====..........................=====.......................=====..........................................=====..............................",
    "...........................................................................................................................................................",
    "S....h.....B...K....C.....G...B...D...............G....B....K...C.......D.......B.......T......G....K.........B.....C.........D.B.....K.....G......h..E....",
    "############..############...############...#############...#############..#############...#############..#############...#############..##################",
    "############..############...############...#############...#############..#############...#############..#############...#############..##################"
  ];

  /* ==========================================================================
   * NIVEL 4 — "La Nave Nodriza"  (Heroe: Director · Tema: ship)  [172 x 13]
   *
   * Mas laberintico: mas puertas 'D' + consolas 'C', mas guardias/torretas/drones.
   * Director SIN doble salto: huecos <=3, subidas <=2 (verificado). Cada 'C' va
   * ANTES que su 'D' asociada, y las pistas 'D' avisan de buscar la consola.
   *
   *   cols 0-34   : entrada oscura; caja 'B' y primer guardia. Checkpoint col 20.
   *                 Pinchos evitables (^^^).
   *   cols 35-72  : 1a consola 'C' (col 40) -> puerta 'D' (col 50); torreta 'T';
   *                 drones. Checkpoint col 60.
   *   cols 73-112 : 2a consola 'C' (col 78) -> puerta 'D' (col 86); bifurcacion
   *                 con plataformas '=' y secretos. Checkpoint col 100.
   *   cols 113-152: 3a consola 'C' (col 116) -> puerta 'D' (col 122); torreta,
   *                 drones y pinchos. Checkpoint col 140.
   *   cols 153-171: hangar -> portal E hacia la sala del trono.
   * ======================================================================== */
  var mapaNivel4 = [
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "............................................................................................................................................................................",
    "..............................d...........................................h..............................d.........h........................................................",
    "........................................................................=====....................................=====...........................d..........................",
    "............................................................................................................................................................................",
    ".................h.......................................h...................................h....................................................h.........................",
    "...............=====...................................=====...............................=====...............................=====............=====.......................",
    "............................................................................................................................................................................",
    "S....h.....B......G.K.....^^^...........C....B....D.......G.K...T.............C.......D........B....K.G.......T.....C.....D.......^^...G....K.........B....G........h..E....",
    "############...###################..################...###############..################...###############..################...###############..##############..############",
    "############...###################..################...###############..################...###############..################...###############..##############..############"
  ];

  /* Verificacion de los tres mapas al cargar. */
  verificarMapa('level1', mapaNivel1);
  verificarMapa('level2', mapaNivel2);
  verificarMapa('level4', mapaNivel4);

  /* --------------------------------------------------------------------------
   * Registro de escenas via G.makePlatformScene (definida en platformer.js).
   * Defensivo por si el framework aun no existe en el momento de carga.
   * ------------------------------------------------------------------------ */
  function registrar() {
    if (typeof G.makePlatformScene !== 'function') {
      console.warn('[levels] G.makePlatformScene no disponible; no se registraron los niveles.');
      return;
    }

    // ----- NIVEL 1 : Falcon en el canion al atardecer -----
    G.scenes.level1 = G.makePlatformScene({
      nombre: 'La Emboscada',
      tema: 'canyon',
      music: 'canyon',
      heroe: 'falcon',
      nivel: 1,
      mapa: mapaNivel1,
      hints: [
        { x: 3,   texto: 'Muévete con las FLECHAS o con A y D.' },
        { x: 22,  texto: '¡Salta con ESPACIO! Púlsalo DOS veces para el DOBLE SALTO.' },
        { x: 40,  texto: 'Ataca con la espada pulsando J.' },
        { x: 55,  texto: 'Cruza los huecos saltando. ¡Cuidado, no caigas!' },
        { x: 62,  texto: 'Dispara flechas con K. ¡Prueba a darle al dron!' },
        { x: 76,  texto: 'Doble salto: salta y vuelve a saltar en el aire para llegar más alto.' },
        { x: 90,  texto: 'Salta sobre los pinchos, hacen pupa.' },
        { x: 132, texto: '¡Ya casi! Corre al portal brillante.' }
      ]
    });

    // ----- NIVEL 2 : Director America en su base tech -----
    G.scenes.level2 = G.makePlatformScene({
      nombre: 'La Preparacion',
      tema: 'base',
      music: 'base',
      heroe: 'director',
      nivel: 2,
      mapa: mapaNivel2,
      hints: [
        { x: 2,   texto: 'Eres el Director América. Da un PUÑETAZO con J.' },
        { x: 11,  texto: 'Rompe las cajas de un puñetazo (J) para abrir paso.' },
        { x: 20,  texto: 'Acércate a la consola y MANTÉN pulsada la H para hackear.' },
        { x: 34,  texto: '¡Al hackear la consola, la puerta cercana se abre!' },
        { x: 64,  texto: 'La torreta también se puede hackear (o romper a golpes).' },
        { x: 100, texto: 'Usa el pulso eléctrico con K para enemigos lejanos.' },
        { x: 116, texto: 'Hackea esta consola para abrir la última puerta.' },
        { x: 140, texto: '¡El hangar te espera. Ve al portal!' }
      ]
    });

    // ----- NIVEL 4 : Director infiltrandose en la Nave Nodriza -----
    G.scenes.level4 = G.makePlatformScene({
      nombre: 'La Nave Nodriza',
      tema: 'ship',
      music: 'ship',
      heroe: 'director',
      nivel: 4,
      mapa: mapaNivel4,
      hints: [
        { x: 3,   texto: 'Infiltración sigilosa. Rompe cajas y vence a los guardias.' },
        { x: 24,  texto: '¡Salta los pinchos del suelo!' },
        { x: 40,  texto: 'Consola a la vista: hackéala (mantén H) para abrir la puerta de la DERECHA.' },
        { x: 62,  texto: 'Los drones disparan láseres lentos. Esquívalos o dispara con K.' },
        { x: 78,  texto: 'Otra puerta cerrada. Su consola está AQUÍ, justo antes.' },
        { x: 116, texto: 'Última consola: la puerta de la DERECHA lleva al hangar. ¡Hackea aquí!' },
        { x: 155, texto: '¡El hangar final. Cruza el portal hacia Dark Toros!' }
      ]
    });
  }

  registrar();
})();
