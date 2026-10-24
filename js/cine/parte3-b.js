// =============================================================================
// parte3-b.js — Guiones animados de la PARTE 3 "We Are a Team" (segunda mitad):
//   s3_tras3 (6 líneas) · s3_cap4 (6) · s3_tras4 (5) · s3_cap5 (7) · s3_final (8)
// Dueño: cine-b (contrato técnico de la Parte 3, §15.2).
// Un plano por cada línea de js/p3/historia3.js (los textos NO se cambian aquí).
// Manual: docs/cine-api.md (§16 = lo nuevo de la Parte 3).
// Reglas: Dark Secuaz siempre BUENO; Robovill nunca hace pop (al final SE ESCAPA
// volando); las bolas de Mikey son de energía AZUL; sin sangre; nada que dé
// miedo de verdad. Para nombrar actores, "alias" (nunca la clave "id").
// =============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  if (!G.cine || typeof G.cine.register !== 'function') return;   // nunca romper si falta el motor

  // Colores de las onomatopeyas (los mismos que parte3-a.js)
  var VERDE = { color: '#bbf7d0', borde: '#15803d' };
  var AZUL = { color: '#bfdbfe', borde: '#1d4ed8' };
  var ROJO = { color: '#fecaca', borde: '#991b1b' };
  var CIAN = { color: '#cffafe', borde: '#0e7490' };
  var GRIS = { color: '#e2e8f0', borde: '#475569' };
  var ORO = { color: '#fde68a', borde: '#b45309' };
  function txt(o, estilo) { for (var k in estilo) if (Object.prototype.hasOwnProperty.call(estilo, k)) o[k] = estilo[k]; return o; }

  // ---------------------------------------------------------------------------
  // Atrezo de los puzles (palanca, diana, consola): solo se pone si el motor del
  // cine ya tiene ese actor (lo añade historia-cine-a en js/cine.js). Si no lo
  // tiene, cada plano deja su marca de respaldo (destellos, señal…) y nada se
  // rompe ni sale en G.cine.revisar().
  // ---------------------------------------------------------------------------
  var CATALOGO = (G.cine.catalogo && G.cine.catalogo.actores) || [];
  function hay(quien) { return CATALOGO.indexOf(quien) >= 0; }
  function si(quien, cosa, respaldo) {   // lista con "cosa" si existe el actor; si no, "respaldo" (o nada)
    if (hay(quien)) return [cosa];
    return respaldo ? [].concat(respaldo) : [];
  }

  // ---------------------------------------------------------------------------
  // La gema copia del PECHO de Robovill: se dibuja con la opción `gema` del actor
  // robovill (docs/cine-api.md §16.2), que sigue sola su escala, su vuelo y las
  // dos variantes de Juanjo. Para apuntar a ella (disparos, efectos) se usa el
  // punto medio de las dos variantes, [7, −119] (P2.P3PUNTOS: A [14, −110],
  // B [0, −128]), con la escala del dibujo = 0,9 × escala del actor.
  // ---------------------------------------------------------------------------
  function puntoGema(x, y, escala, facing) {
    var s = 0.9 * escala;
    return { x: x + 7 * s * (facing < 0 ? -1 : 1), y: y - 119 * s };
  }

  // ===========================================================================
  //  s3_tras3 — La fusión voladora vence al Dron Nodriza; el equipo se reúne
  //  ante la fábrica oscura (6 líneas)
  // ===========================================================================
  G.cine.register('s3_tras3', { planos: [

    // 0 · Papá: la fusión voladora vence al Dron Nodriza: ¡pop! y ¡CHOF! en el río.
    {
      fondo: 'rio',
      transicion: 'fundido',
      sueloY: 300,
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.1, x: 600 }, t: 1.5, dur: 2 },
      actores: [
        { quien: 'fusionVoladora', alias: 'fusion', x: 250, y: 250, escala: 0.8,
          acciones: [
            { accion: 'disparar', t: 0.3, a: 'nodriza', proyectil: 'pluma', veces: 4, cada: 0.13 },
            { accion: 'disparar', t: 0.75, a: 'nodriza', proyectil: 'escudo' },
            { accion: 'celebrar', t: 2.4, altura: 10 }
          ] },
        { quien: 'dronNodriza', alias: 'nodriza', x: 690, y: 230, escala: 0.8, facing: -1,
          acciones: [
            { accion: 'retroceder', t: 0.95, distancia: 30 },
            { accion: 'temblar', t: 1.1, dur: 0.6, fuerza: 1 },
            { accion: 'volar', t: 1.7, hasta: { x: 730, y: 300 }, dur: 0.5 },
            { accion: 'hundirse', t: 2.2, dur: 0.9 }
          ] }
      ],
      efectos: [
        { tipo: 'explosion', x: 680, y: 170, t: 1.2, tam: 1.3 },
        { tipo: 'chispas', x: 660, y: 180, t: 0.95 },
        { tipo: 'polvo', x: 730, y: 300, t: 2.2, cantidad: 14, tam: 1.8, color: '#e0f2fe' },
        { tipo: 'onda', x: 730, y: 300, t: 2.25, radio: 140 },
        { tipo: 'confeti', t: 2.4 }
      ],
      textos: [
        txt({ texto: '¡POP!', x: 640, y: 90, t: 1.2, dur: 1.0, tam: 58 }, { color: '#fde047', borde: '#ea580c' }),
        txt({ texto: '¡CHOF!', x: 760, y: 170, t: 2.25, tam: 56, estallido: '#e0f2fe' }, CIAN)
      ],
      sonido: [{ nombre: 'explosion', t: 1.2 }, { nombre: 'splash', t: 2.2 }, { nombre: 'victory', t: 2.6 }]
    },

    // 1 · Peter: ¡Lo hicimos, Falcon! ¡Mi escudo y tus plumas forman un gran equipo!
    // Ya fuera de la cueva: el submarino-nave da una voltereta y los dos lo celebran
    // lanzando el escudo y las plumas al cielo.
    {
      fondo: 'cielo',
      transicion: 'pagina',
      habla: 'sub',
      camara: { zoom: 1.12, x: 470, y: 190, hasta: { zoom: 1.05, x: 480 }, t: 1.4, dur: 2 },
      actores: [
        { quien: 'submarinoNave', alias: 'sub', modo: 'nave', x: 360, y: 220, escala: 0.9,
          acciones: [
            { accion: 'girar', t: 0.3, veces: 1, dur: 0.8 },
            { accion: 'disparar', t: 1.4, hasta: { x: 470, y: 30 }, proyectil: 'escudo' }
          ] },
        { quien: 'mechaHalcon', alias: 'mecha', x: 640, y: 200, escala: 0.7, facing: -1,
          acciones: [{ accion: 'disparar', t: 1.6, hasta: { x: 560, y: 20 }, proyectil: 'pluma', veces: 3, cada: 0.15 }] }
      ],
      efectos: [
        { tipo: 'fuegos', t: 1.9, cantidad: 3 },
        { tipo: 'destellos', x: 500, y: 140, t: 1.9, radio: 140, color: '#fde68a' }
      ],
      textos: [
        { estilo: 'cartel', texto: '¡Fuera de la cueva!', t: 0.3, dur: 1.8 },
        { estilo: 'bocadillo', a: 'sub', texto: '¡Lo hicimos!', t: 0.5, dur: 1.6 },
        { estilo: 'titulo', texto: '¡GRAN EQUIPO!', x: 480, y: 64, t: 2.2, tam: 50, pantalla: true }
      ],
      sonido: [{ nombre: 'jetpack', t: 0.3 }, { nombre: 'victory', t: 2.0 }]
    },

    // 2 · Juanjo: vuelan hasta la fábrica; allí esperan Mikey y el Director. ¡Juntos otra vez!
    {
      fondo: 'fabricaOscura',
      transicion: 'pagina',
      tinte: 'rgba(40,0,20,0.10)',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.08, x: 470, y: 185 }, t: 2.0, dur: 2 },
      actores: [
        { quien: 'puerta', alias: 'puerta', x: 480, estilo: 'fabrica', ojo: true, luz: '#ef4444', z: -2 },
        { quien: 'robotMoto', alias: 'moto', modo: 'moto', x: 830, escala: 0.8, facing: -1, z: -1 },
        { quien: 'mikey', x: 590, facing: -1,
          acciones: [{ accion: 'saltar', t: 1.6, veces: 2, altura: 40, dur: 0.45 }, { accion: 'celebrar', t: 2.6 }] },
        { quien: 'director', x: 690, facing: -1, acciones: [{ accion: 'celebrar', t: 1.8 }] },
        { quien: 'mechaHalcon', alias: 'mecha', x: 120, y: 170, escala: 0.45,
          acciones: [{ accion: 'entrar', t: 0.1, desde: 'izquierda', dur: 1.0 }] },
        { quien: 'submarinoNave', alias: 'sub', modo: 'nave', x: 190, y: 120, escala: 0.55,
          acciones: [{ accion: 'entrar', t: 0.25, desde: 'izquierda', dur: 1.0 }] },
        { quien: 'falcon', x: 280, acciones: [{ accion: 'caer', t: 1.0, dur: 0.5 }, { accion: 'celebrar', t: 2.0 }] },
        { quien: 'peter', x: 380, acciones: [{ accion: 'caer', t: 1.2, dur: 0.5 }, { accion: 'celebrar', t: 2.2 }] }
      ],
      efectos: [
        { tipo: 'corazones', x: 480, y: 230, t: 2.0, cantidad: 6, alto: 120 },
        { tipo: 'destellos', x: 480, y: 220, t: 2.0, radio: 170, color: '#fde68a' }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Ante la fábrica oscura...', t: 0.3, dur: 2.0 },
        { estilo: 'titulo', texto: '¡JUNTOS OTRA VEZ!', x: 480, y: 70, t: 2.3, tam: 48, pantalla: true }
      ],
      sonido: [{ nombre: 'jetpack', t: 0.2 }, { nombre: 'select', t: 2.3 }]
    },

    // 3 · Director: ¡Bien hecho, chicos! Ahí está: la fábrica oscura, la guarida de Robovill.
    {
      fondo: 'fabricaOscura',
      tinte: 'rgba(40,0,20,0.10)',
      camara: { zoom: 1.35, a: 'director', dy: -30, hasta: { zoom: 1.1, x: 520, y: 190 }, t: 1.3, dur: 1.8 },
      actores: [
        { quien: 'puerta', alias: 'puerta', x: 480, estilo: 'fabrica', ojo: true, luz: '#ef4444', z: -2,
          acciones: [{ accion: 'brillar', t: 1.4, color: 'rgba(239,68,68,0.55)' }] },
        { quien: 'robotMoto', alias: 'moto', modo: 'moto', x: 830, escala: 0.8, facing: -1, z: -1 },
        { quien: 'falcon', x: 280, acciones: [{ accion: 'mirar', t: 1.2, mirar: 'derecha' }] },
        { quien: 'peter', x: 380, acciones: [{ accion: 'mirar', t: 1.3, mirar: 'derecha' }] },
        { quien: 'mikey', x: 775, facing: -1 },   // se aparta detrás del Director: la mano señala la puerta, no a Mikey
        { quien: 'director', x: 680, facing: -1,
          acciones: [{ accion: 'celebrar', t: 0.1, dur: 0.9, altura: 10 }, { accion: 'senalar', t: 1.2, a: 'puerta' }] }
      ],
      textos: [
        txt({ texto: '¡BIEN HECHO!', x: 690, y: 80, t: 0.2, dur: 1.2, tam: 36 }, ORO),
        { estilo: 'titulo', texto: 'LA GUARIDA DE ROBOVILL', x: 480, y: 70, t: 1.8, tam: 32, color: '#fca5a5', borde: '#450a0a' }
      ],
      sonido: [{ nombre: 'select', t: 0.2 }, { nombre: 'robot', t: 1.8 }]
    },

    // 4 · Papá: la misma fábrica de antes... más grande, más oscura y mucho más peligrosa.
    {
      fondo: 'fabricaOscura',
      tinte: 'rgba(40,0,20,0.22)',
      vineta: 1.5,
      camara: { zoom: 1.25, x: 480, y: 160, hasta: { zoom: 1, x: 480 }, t: 0.2, dur: 2.2 },
      actores: [
        { quien: 'puerta', alias: 'puerta', x: 480, estilo: 'fabrica', ojo: true, luz: '#ef4444', z: -2,
          acciones: [{ accion: 'animar', t: 0.5, props: { abierta: [0, 0.2] }, dur: 1.2 }, { accion: 'brillar', t: 0.5, color: 'rgba(239,68,68,0.6)' }] },
        { quien: 'robotMoto', alias: 'moto', modo: 'moto', x: 830, escala: 0.8, facing: -1, z: -1 },
        { quien: 'falcon', x: 280 },
        { quien: 'peter', x: 380 },
        { quien: 'mikey', x: 590, facing: -1, acciones: [{ accion: 'asustarse', t: 1.7 }], bocadillo: '¡Glups!', bocadilloT: 2.0 },
        { quien: 'director', x: 690, facing: -1, acciones: [{ accion: 'mirar', t: 0.6, mirar: 'puerta' }] },
        { quien: 'miniRobot', alias: 'm1', x: 980, y: 100, facing: -1, acciones: [{ accion: 'volar', t: 0.8, hasta: { x: 620, y: 90 }, dur: 2.2 }] },
        { quien: 'miniRobot', alias: 'm2', x: -40, y: 130, acciones: [{ accion: 'volar', t: 1.2, hasta: { x: 330, y: 120 }, dur: 2.2 }] }
      ],
      efectos: [
        { tipo: 'humo', x: 480, y: 330, t: 0.7, color: '#64748b' },
        { tipo: 'brillo', x: 480, y: 220, t: 0.7, radio: 110, color: 'rgba(239,68,68,0.5)' }
      ],
      textos: [
        txt({ texto: '¡MÁS GRANDE!', x: 170, y: 40, t: 1.1, tam: 28, rot: -0.05 }, ROJO),
        txt({ texto: '¡MÁS OSCURA!', x: 170, y: 86, t: 1.7, tam: 28, rot: 0.04 }, ROJO),
        txt({ texto: '¡MÁS PELIGROSA!', x: 180, y: 132, t: 2.3, tam: 30, rot: -0.04 }, ROJO)
      ],
      sonido: [{ nombre: 'door', t: 0.5 }, { nombre: 'miniRobot', t: 1.0 }, { nombre: 'rumble', t: 1.7 }]
    },

    // 5 · Falcon: Juntos hemos llegado hasta aquí. ¡Y juntos entraremos!
    {
      fondo: 'fabricaOscura',
      tinte: 'rgba(40,0,20,0.10)',
      // Encuadre cerrado pero con los cuatro enteros (Falcon a la izquierda, el Director dentro a la derecha).
      camara: { zoom: 1.35, x: 400, y: 235, hasta: { zoom: 1.05, x: 480, y: 180 }, t: 1.4, dur: 2 },
      actores: [
        { quien: 'puerta', alias: 'puerta', x: 480, estilo: 'fabrica', luz: '#fde68a', z: -2,
          acciones: [{ accion: 'abrir', t: 2.0, dur: 1.4 }] },
        { quien: 'robotMoto', alias: 'moto', modo: 'moto', x: 830, escala: 0.8, facing: -1, z: -1 },
        { quien: 'falcon', x: 280, pose: 'win',
          acciones: [{ accion: 'celebrar', t: 0.2, dur: 1.0, altura: 14 }, { accion: 'caminar', t: 1.6, hasta: { x: 400 }, dur: 1.2 }, { accion: 'brillar', t: 0.2, color: 'rgba(253,230,138,0.7)' }] },
        { quien: 'peter', x: 380, acciones: [{ accion: 'caminar', t: 1.7, hasta: { x: 470 }, dur: 1.2 }] },
        { quien: 'mikey', x: 590, facing: -1, acciones: [{ accion: 'caminar', t: 1.7, hasta: { x: 560 }, dur: 1.0, mirar: 'izquierda' }] },
        { quien: 'director', x: 690, facing: -1, acciones: [{ accion: 'caminar', t: 1.6, hasta: { x: 640 }, dur: 1.0, mirar: 'izquierda' }] }
      ],
      efectos: [
        { tipo: 'rayos', a: 'falcon', t: 0.3, color: '#fde68a', dur: 1.4 },
        { tipo: 'brillo', x: 480, y: 220, t: 2.4, radio: 140, color: 'rgba(253,230,138,0.6)' }
      ],
      textos: [{ estilo: 'titulo', texto: '¡JUNTOS!', x: 480, y: 70, t: 0.5, tam: 60, estallido: '#fef9c3', pantalla: true }],
      sonido: [{ nombre: 'select', t: 0.5 }]
    }
  ] });

  // ===========================================================================
  //  s3_cap4 — La fábrica oscura: puzles de equipo (6 líneas)
  // ===========================================================================
  G.cine.register('s3_cap4', { planos: [

    // 0 · Juanjo: puertas cerradas, láseres, dianas y palancas por todas partes.
    {
      fondo: 'fabricaOscura',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.08, x: 500 }, t: 1.2, dur: 2.4 },
      actores: [
        { quien: 'director', x: 100, acciones: [{ accion: 'entrar', t: 0.2, desde: 'izquierda', dur: 0.8 }] },
        { quien: 'falcon', x: 180, acciones: [{ accion: 'entrar', t: 0.3, desde: 'izquierda', dur: 0.8 }] },
        { quien: 'mikey', x: 260, acciones: [{ accion: 'entrar', t: 0.4, desde: 'izquierda', dur: 0.8 }], bocadillo: '¡Uf!', bocadilloT: 2.4 },
        { quien: 'peter', x: 340, acciones: [{ accion: 'entrar', t: 0.5, desde: 'izquierda', dur: 0.8 }] },
        { quien: 'miniTorreta', alias: 'torreta', x: 600, facing: -1, angulo: 0,
          acciones: [{ accion: 'disparar', t: 0.6, hasta: { x: 430, y: 290 }, proyectil: 'laser', veces: 8, cada: 0.45 }] },
        { quien: 'puerta', alias: 'puerta', x: 820, estilo: 'fabrica', escala: 0.85, luz: '#ef4444', z: -1 }
      ].concat(
        // la palanca en la pared (pies en y = 150) y la diana sobre la puerta (placa de y 58 a 140):
        // se presentan con su propio arte (un halo y un temblor), sin círculos encima.
        si('palanca', { quien: 'palanca', alias: 'palanca', x: 470, y: 150, z: -1,
          acciones: [{ accion: 'brillar', t: 1.9, dur: 1.2, color: 'rgba(253,224,71,0.55)' }, { accion: 'temblar', t: 1.9, dur: 0.4, fuerza: 0.6 }] }),
        si('diana', { quien: 'diana', alias: 'diana', x: 720, y: 140, z: -1,
          acciones: [{ accion: 'brillar', t: 1.3, dur: 1.2, color: 'rgba(248,113,113,0.5)' }, { accion: 'temblar', t: 1.3, dur: 0.4, fuerza: 0.6 }] })
      ),
      // respaldo (motor sin los actores del puzle): señal sobre la diana y destellos en la palanca
      efectos: (hay('diana') ? [] : [
        { tipo: 'senal', x: 720, y: 99, t: 1.3, color: '#f87171', radio: 40 },
        { tipo: 'brillo', x: 720, y: 99, t: 1.3, radio: 40, color: 'rgba(248,113,113,0.6)' }
      ]).concat(hay('palanca') ? [] : [{ tipo: 'destellos', x: 470, y: 105, t: 1.9, radio: 30, cantidad: 4, color: '#fde047' }]),
      textos: [
        txt({ texto: 'LÁSER', x: 600, y: 200, t: 0.8, tam: 22, rot: 0 }, ROJO),
        txt({ texto: 'DIANA', x: 720, y: 162, t: 1.3, tam: 22, rot: 0 }, ROJO),
        txt({ texto: 'PALANCA', x: 470, y: 172, t: 1.9, tam: 22, rot: 0 }, ORO),
        // lejos de la pastilla "Mantén Enter para saltar" (arriba a la derecha)
        txt({ texto: 'PUERTA', x: 845, y: 112, t: 0.6, tam: 22, rot: 0 }, GRIS)
      ],
      sonido: [{ nombre: 'laserBarrier', t: 0.6 }]
    },

    // 1 · Dark Secuaz: Os ayudaré: conozco a estos robots y sus puntos débiles.
    {
      fondo: 'fabricaOscura',
      continuidad: false,
      camara: { zoom: 1.05, x: 500, hasta: { zoom: 1.2, x: 560, y: 190 }, t: 1.4, dur: 2 },
      actores: [
        { quien: 'director', x: 100 },
        { quien: 'falcon', x: 180 },
        { quien: 'mikey', x: 260 },
        { quien: 'peter', x: 340 },
        { quien: 'robotEscudo', alias: 'robot', x: 520, escala: 0.8, facing: -1, bocadillo: '?', bocadilloT: 1.9 },
        { quien: 'secuaz', x: 760, escala: 0.75, facing: -1, bueno: true,
          acciones: [
            { accion: 'entrar', t: 0.2, desde: 'derecha', dur: 1.0 },
            { accion: 'senalar', t: 1.3, a: 'robot', dur: 1.4 },
            { accion: 'brillar', t: 1.3, color: 'rgba(134,239,172,0.6)' }
          ] }
      ],
      efectos: [{ tipo: 'senal', a: 'robot', t: 1.4, color: '#86efac', radio: 60 }],
      textos: [
        { estilo: 'pensamiento', a: 'secuaz', lado: 'izquierda', dibujo: ['robotEscudo', 'boxeador'], texto: '¡Puntos débiles!', t: 2.0 }
      ],
      sonido: [{ nombre: 'robot', t: 0.3 }, { nombre: 'checkpoint', t: 1.4 }]
    },

    // 2 · Director: Las consolas son cosa mía: ¡yo las hackeo! (la puerta se abre)
    {
      fondo: 'fabricaOscura',
      continuidad: false,
      camara: { zoom: 1.3, a: 'director', dx: 60, dy: -30, hasta: { zoom: 1.12, x: 560, y: 190 }, t: 1.2, dur: 1.6 },
      actores: [
        { quien: 'falcon', x: 150 },
        { quien: 'mikey', x: 230 },
        { quien: 'peter', x: 310, acciones: [{ accion: 'celebrar', t: 2.6 }] },
        // Hackea la CONSOLA que hay junto a la puerta (si el motor aún no tiene
        // el actor consola, el rayo va al cierre de la puerta).
        { quien: 'director', x: 420, pose: 'hack',
          acciones: [
            hay('consola') ? { accion: 'hackear', t: 0.3, a: 'consola', dur: 1.4 } : { accion: 'hackear', t: 0.3, hasta: { x: 690, y: 210 }, dur: 1.4 },
            { accion: 'celebrar', t: 2.4 }
          ] },
        { quien: 'puerta', alias: 'puerta', x: 730, estilo: 'fabrica', escala: 0.9, luz: '#86efac', z: -1,
          acciones: [{ accion: 'abrir', t: 1.8, dur: 1.0 }] }
      ].concat(si('consola', { quien: 'consola', alias: 'consola', x: 575,
        acciones: [{ accion: 'cambiar', t: 1.7, cambia: { hackeada: true }, destello: '#86efac' }] })),
      efectos: [{ tipo: 'destellos', x: 730, y: 220, t: 1.8, radio: 80, color: '#86efac' }],
      textos: [
        txt({ texto: '¡BIP, BIP!', x: 560, y: 100, t: 0.4, dur: 1.2, tam: 34 }, CIAN),
        txt({ texto: '¡CLIC!', x: 730, y: 80, t: 1.75, tam: 50 }, VERDE)
      ],
      sonido: [{ nombre: 'hackOk', t: 1.75 }]
    },

    // 3 · Mikey: Las dianas lejanas, para mi francotirador. ¡Ni un fallo!
    {
      fondo: 'fabricaOscura',
      continuidad: false,
      camara: { zoom: 1.05, x: 500, y: 180, hasta: { zoom: 1.35, a: 'mikey', dx: 60, dy: -30 }, t: 2.0, dur: 1.2 },
      actores: [
        { quien: 'peter', x: 110 },
        { quien: 'mikey', x: 230, arma: 'francotirador',
          acciones: [
            hay('diana') ? { accion: 'disparar', t: 0.7, a: 'diana', proyectil: 'energia', lanzador: 'francotirador' }
                         : { accion: 'disparar', t: 0.7, hasta: { x: 800, y: 130 }, proyectil: 'energia', lanzador: 'francotirador' },
            { accion: 'celebrar', t: 2.0 }
          ] },
        { quien: 'puerta', alias: 'puerta', x: 800, estilo: 'fabrica', escala: 0.7, luz: '#93c5fd', z: -1,
          acciones: [{ accion: 'abrir', t: 1.5, dur: 1.0 }] }
      ].concat(si('diana', { quien: 'diana', alias: 'diana', x: 800, y: 170, z: -1,
        acciones: [{ accion: 'cambiar', t: 1.15, cambia: { rota: true }, destello: '#93c5fd' }] })),
      efectos: (hay('diana') ? [] : [   // respaldo sin el actor diana: señal roja donde estaría
        { tipo: 'senal', x: 800, y: 130, color: '#f87171', radio: 34, dur: 1.25 },
        { tipo: 'brillo', x: 800, y: 130, radio: 34, color: 'rgba(248,113,113,0.6)', dur: 1.25 }
      ]).concat([
        { tipo: 'chispas', x: 800, y: 130, t: 1.15, color: '#93c5fd' },
        { tipo: 'destellos', x: 800, y: 130, t: 1.15, radio: 50, color: '#93c5fd' }
      ]),
      textos: [
        txt({ texto: '¡DIANA!', x: 640, y: 80, t: 1.2, dur: 1.4, tam: 46 }, AZUL),
        { estilo: 'bocadillo', a: 'mikey', texto: '¡Ni un fallo!', t: 2.4 }
      ],
      sonido: [{ nombre: 'launcherSwap', t: 0.2 }, { nombre: 'checkpoint', t: 1.2 }]
    },

    // 4 · Peter: los láseres, para mi escudo. ¡Y Falcon salta a las palancas más altas!
    {
      fondo: 'fabricaOscura',
      continuidad: false,
      camara: { zoom: 1.12, x: 470, y: 190 },
      actores: [
        // Doble salto hasta la palanca de la pared (pies en y ≥ 200: la cabeza no se sale del cuadro).
        { quien: 'falcon', x: 210,
          acciones: [{ accion: 'saltar', t: 1.6, hasta: { x: 470, y: 205 }, altura: 50, dur: 0.7 }, { accion: 'atacar', t: 2.3 }, { accion: 'saltar', t: 2.6, hasta: { x: 560, y: 330 }, altura: 30, dur: 0.6 }] },
        { quien: 'peter', x: 330, pose: 'bloquear', acciones: [{ accion: 'brillar', t: 0.4, dur: 1.6, color: 'rgba(74,222,128,0.6)' }] },
        { quien: 'miniTorreta', alias: 'torreta', x: 720, escala: 1.3, facing: -1,
          acciones: [
            { accion: 'disparar', t: 0.3, a: 'peter', proyectil: 'laser', veces: 4, cada: 0.32, rebota: true },
            { accion: 'cambiar', t: 2.4, cambia: { hacked: true }, destello: '#86efac' }
          ] }
      ].concat(si('palanca', { quien: 'palanca', alias: 'palanca', x: 512, y: 190, z: -1,
        acciones: [{ accion: 'animar', t: 2.3, props: { abajo: [0, 1] }, dur: 0.3 }] })),
      efectos: (hay('palanca') ? [] : [   // respaldo sin el actor palanca: destellos donde estaría
        { tipo: 'destellos', x: 512, y: 165, radio: 26, cantidad: 4, color: '#fde047', dur: 2.3 }
      ]).concat([{ tipo: 'chispas', x: 512, y: 165, t: 2.4, color: '#fde047' }]),
      textos: [
        txt({ texto: '¡CLINC, CLINC!', x: 420, y: 150, t: 0.6, dur: 1.2, tam: 36 }, VERDE),
        txt({ texto: '¡CLAC!', x: 620, y: 80, t: 2.4, tam: 50 }, ORO)
      ],
      sonido: [{ nombre: 'press', t: 2.4 }, { nombre: 'hackOk', t: 2.5 }]
    },

    // 5 · Papá: al fondo, los guardianes de Robovill vigilan la puerta. ¡A trabajar en equipo!
    {
      fondo: 'fabricaOscura',
      transicion: 'pagina',
      tinte: 'rgba(40,0,20,0.12)',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.08, x: 520, y: 190 }, t: 1.0, dur: 2.2 },
      actores: [
        { quien: 'puerta', alias: 'granPuerta', x: 690, estilo: 'fabrica', escala: 1.3, ojo: true, luz: '#ef4444', z: -2 },
        { quien: 'robotEscudo', alias: 'g1', x: 560, escala: 0.8, facing: -1, z: -1 },
        { quien: 'robotEscudo', alias: 'g2', x: 830, escala: 0.8, facing: -1, z: -1 },
        { quien: 'guardianRobovill', alias: 'guardian', x: 690, facing: -1,
          acciones: [{ accion: 'brillar', t: 1.2, color: 'rgba(248,113,113,0.5)' }, { accion: 'temblar', t: 1.2, dur: 0.6, fuerza: 0.5 }] },
        { quien: 'director', x: 140, acciones: [{ accion: 'entrar', t: 0.2, desde: 'izquierda', dur: 0.8 }] },
        { quien: 'falcon', x: 220, acciones: [{ accion: 'entrar', t: 0.3, desde: 'izquierda', dur: 0.8 }], bocadillo: '!', bocadilloT: 1.4 },
        { quien: 'mikey', x: 300, acciones: [{ accion: 'entrar', t: 0.4, desde: 'izquierda', dur: 0.8 }] },
        { quien: 'peter', x: 380, acciones: [{ accion: 'entrar', t: 0.5, desde: 'izquierda', dur: 0.8 }] }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Al fondo de la fábrica...', t: 0.3, dur: 2.0 },
        txt({ texto: '¡GRRR!', x: 760, y: 70, t: 1.2, dur: 1.2, tam: 40 }, ROJO),
        { estilo: 'titulo', texto: '¡A TRABAJAR EN EQUIPO!', x: 480, y: 66, t: 2.4, tam: 42, pantalla: true }
      ],
      sonido: [{ nombre: 'robot', t: 1.2 }, { nombre: 'select', t: 2.4 }]
    }
  ] });

  // ===========================================================================
  //  s3_tras4 — El Guardián cae; Robovill espera en el corazón de la fábrica (5 líneas)
  // ===========================================================================
  // El Guardián mira a la izquierda en x = GX (escala 1): puntos de P2.P3PUNTOS.
  var GX = 540;
  G.cine.register('s3_tras4', { planos: [

    // 0 · Papá: el Guardián se tambalea, se le apaga el escudo y hace ¡pop!, con sus guardias.
    {
      fondo: 'fabricaOscura',
      transicion: 'fundido',
      tinte: 'rgba(40,0,20,0.10)',
      camara: { zoom: 1.05, x: 560 },
      actores: [
        { quien: 'puerta', alias: 'granPuerta', x: 690, estilo: 'fabrica', escala: 1.3, ojo: true, luz: '#ef4444', z: -2 },
        { quien: 'robotEscudo', alias: 'g1', x: 560, escala: 0.8, facing: -1, z: -1,
          acciones: [{ accion: 'temblar', t: 1.4, dur: 0.6 }, { accion: 'pop', t: 2.1 }] },
        { quien: 'robotEscudo', alias: 'g2', x: 830, escala: 0.8, facing: -1, z: -1,
          acciones: [{ accion: 'temblar', t: 1.5, dur: 0.6 }, { accion: 'pop', t: 2.25 }] },
        { quien: 'guardianRobovill', alias: 'guardian', x: 690, facing: -1,
          acciones: [
            { accion: 'cambiar', t: 0.4, cambia: { escudo: false }, destello: '#93c5fd' },
            { accion: 'temblar', t: 0.6, dur: 1.2, fuerza: 1 },
            { accion: 'pop', t: 1.9 }
          ] },
        { quien: 'director', x: 150, acciones: [{ accion: 'celebrar', t: 2.4 }] },
        { quien: 'falcon', x: 240, acciones: [{ accion: 'celebrar', t: 2.5 }] },
        { quien: 'mikey', x: 330, acciones: [{ accion: 'celebrar', t: 2.6 }] },
        { quien: 'peter', x: 420, acciones: [{ accion: 'celebrar', t: 2.7 }] }
      ],
      efectos: [
        { tipo: 'estrellas', x: 690, y: 120, t: 0.7, dur: 1.2 },
        { tipo: 'temblor', t: 1.9, fuerza: 0.8 },
        { tipo: 'confeti', t: 2.4 }
      ],
      textos: [
        txt({ texto: '¡BZZZT!', x: 600, y: 100, t: 0.4, dur: 1.0, tam: 40 }, CIAN),
        txt({ texto: '¡POP!', x: 700, y: 120, t: 1.95, tam: 64, estallido: true }, { color: '#fde047', borde: '#ea580c' })
      ],
      sonido: [{ nombre: 'hackOk', t: 0.4 }, { nombre: 'victory', t: 2.5 }]
    },

    // 1 · Falcon: Peter paró el puño, el Director hackeó el escudo, Mikey le dio a la batería...
    //     ¡y yo salté a su botón! (el recuerdo de la pelea, paso a paso)
    {
      fondo: 'fabricaOscura',
      transicion: 'pagina',
      tinte: 'rgba(120,80,20,0.14)',
      camara: { zoom: 1.05, x: 500, y: 180 },
      habla: 'falcon',
      actores: [
        { quien: 'guardianRobovill', alias: 'guardian', x: GX, facing: -1,
          acciones: [
            { accion: 'atacar', t: 0.2, a: 'peter' },
            { accion: 'cambiar', t: 1.2, cambia: { escudo: false, hackeado: true }, destello: '#86efac' },
            { accion: 'temblar', t: 1.7, dur: 0.4, fuerza: 0.6 },
            { accion: 'temblar', t: 2.75, dur: 0.6, fuerza: 1 }
          ] },
        { quien: 'peter', x: 400, pose: 'bloquear' },
        { quien: 'director', x: 150, pose: 'hack',
          acciones: [{ accion: 'hackear', t: 0.6, hasta: { x: GX - 60, y: 229 }, dur: 0.7 }] },
        { quien: 'mikey', x: 820, facing: -1, arma: 'pistola',
          acciones: [{ accion: 'disparar', t: 1.4, hasta: { x: GX + 46, y: 229 }, proyectil: 'energia', veces: 2, cada: 0.2 }] },
        { quien: 'falcon', x: 270, z: 3,
          acciones: [{ accion: 'saltar', t: 2.1, hasta: { x: GX, y: 146 }, altura: 120, dur: 0.65 }, { accion: 'celebrar', t: 3.0, altura: 8 }] }
      ],
      efectos: [
        { tipo: 'chispas', x: GX + 46, y: 229, t: 1.6, color: '#93c5fd' },
        { tipo: 'estrellas', x: GX, y: 120, t: 2.9 }
      ],
      textos: [
        { estilo: 'cartel', texto: '¡Así lo hicimos!', t: 0.1 },
        txt({ texto: '¡CLINC!', x: 400, y: 160, t: 0.35, dur: 0.7, tam: 38 }, VERDE),
        txt({ texto: '¡CLIC!', x: 380, y: 120, t: 1.2, dur: 0.7, tam: 38 }, CIAN),
        txt({ texto: '¡ZAP!', x: 700, y: 150, t: 1.6, dur: 0.8, tam: 40 }, AZUL),
        txt({ texto: '¡BOING!', x: 700, y: 80, t: 2.75, tam: 50, estallido: true }, ORO)
      ],
      sonido: [{ nombre: 'shieldBlock', t: 0.35 }, { nombre: 'hackOk', t: 1.2 }, { nombre: 'hit', t: 2.75 }]
    },

    // 2 · Juanjo: detrás, una puerta enorme. Al otro lado, algo gigante respiraba: ¡FSSSS!
    {
      fondo: 'fabricaOscura',
      continuidad: false,
      tinte: 'rgba(40,0,20,0.16)',
      vineta: 1.4,
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.2, x: 600, y: 180 }, t: 0.6, dur: 2.6 },
      actores: [
        { quien: 'puerta', alias: 'granPuerta', x: 640, estilo: 'fabrica', escala: 1.35, ojo: true, luz: '#ef4444', z: -2,
          acciones: [
            { accion: 'animar', t: 1.0, props: { abierta: [0, 0.12] }, dur: 0.8 },
            { accion: 'temblar', t: 1.0, fuerza: 0.25 }
          ] },
        { quien: 'director', x: 140, facing: 1 },
        { quien: 'falcon', x: 230, acciones: [{ accion: 'asustarse', t: 1.5 }] },
        { quien: 'mikey', x: 320, acciones: [{ accion: 'asustarse', t: 1.6 }] },
        { quien: 'peter', x: 410 }
      ],
      efectos: [
        { tipo: 'humo', x: 640, y: 330, t: 1.0, color: '#94a3b8', cantidad: 9, delante: true, alpha: 0.7 },
        { tipo: 'brillo', x: 640, y: 210, t: 1.0, radio: 60, color: 'rgba(239,68,68,0.55)', delante: true }
      ],
      textos: [txt({ texto: '¡FSSSS!', x: 640, y: 70, t: 1.2, tam: 56 }, GRIS)],
      sonido: [{ nombre: 'rumble', t: 1.0 }]
    },

    // 3 · Dark Secuaz: Es el corazón de la fábrica. Robovill os espera ahí dentro...
    {
      fondo: 'fabricaOscura',
      continuidad: false,
      tinte: 'rgba(40,0,20,0.12)',
      // Encuadre de x 120 a 860 (zoom 1,3): Peter y Dark Secuaz salen enteros.
      camara: { zoom: 1.3, a: 'secuaz', dx: -230, dy: -30, hasta: { zoom: 1.15, x: 540, y: 190 }, t: 1.8, dur: 1.8 },
      actores: [
        { quien: 'puerta', alias: 'granPuerta', x: 430, estilo: 'fabrica', escala: 1.2, ojo: true, luz: '#ef4444', abierta: 0.12, z: -2 },
        { quien: 'peter', x: 250, facing: 1, acciones: [{ accion: 'mirar', t: 0.8, mirar: 'secuaz' }] },
        { quien: 'secuaz', x: 720, escala: 0.8, facing: -1, bueno: true,
          acciones: [{ accion: 'brillar', color: 'rgba(134,239,172,0.5)' }, { accion: 'senalar', t: 1.6, a: 'granPuerta', dur: 1.6 }] }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'secuaz', lado: 'izquierda', dibujo: ['robovill'], texto: 'Robovill...', t: 0.8 }
      ],
      sonido: [{ nombre: 'robot', t: 0.4 }]
    },

    // 4 · Papá: los cuatro héroes se miran y asienten. Ha llegado la hora.
    {
      fondo: 'fabricaOscura',
      continuidad: false,
      tinte: 'rgba(40,0,20,0.10)',
      camara: { zoom: 1.25, x: 430, y: 200, hasta: { zoom: 1.05, x: 520, y: 180 }, t: 1.8, dur: 2 },
      actores: [
        { quien: 'puerta', alias: 'granPuerta', x: 790, estilo: 'fabrica', escala: 1.2, ojo: true, luz: '#fca5a5', z: -2,
          acciones: [{ accion: 'abrir', t: 2.2, dur: 1.4 }] },
        { quien: 'director', x: 270, acciones: [{ accion: 'mirar', t: 0.3, mirar: 'falcon' }, { accion: 'saltar', t: 1.0, altura: 12, dur: 0.35 }, { accion: 'mirar', t: 1.8, mirar: 'derecha' }] },
        { quien: 'falcon', x: 370, facing: -1, acciones: [{ accion: 'saltar', t: 1.05, altura: 12, dur: 0.35 }, { accion: 'mirar', t: 1.8, mirar: 'derecha' }] },
        { quien: 'mikey', x: 480, acciones: [{ accion: 'mirar', t: 0.3, mirar: 'peter' }, { accion: 'saltar', t: 1.1, altura: 12, dur: 0.35 }, { accion: 'mirar', t: 1.85, mirar: 'derecha' }] },
        { quien: 'peter', x: 580, facing: -1, acciones: [{ accion: 'saltar', t: 1.15, altura: 12, dur: 0.35 }, { accion: 'mirar', t: 1.85, mirar: 'derecha' }] }
      ],
      efectos: [
        { tipo: 'rayos', x: 430, y: 240, t: 2.3, color: '#fde68a' },
        { tipo: 'brillo', x: 790, y: 220, t: 2.4, radio: 120, color: 'rgba(248,113,113,0.5)' }
      ],
      textos: [
        txt({ texto: '¡SÍ!', x: 430, y: 110, t: 1.0, dur: 0.8, tam: 40 }, ORO),
        { estilo: 'titulo', texto: '¡HA LLEGADO LA HORA!', x: 480, y: 66, t: 2.4, tam: 46, pantalla: true }
      ],
      sonido: [{ nombre: 'select', t: 1.0 }, { nombre: 'checkpoint', t: 2.4 }]
    }
  ] });

  // ===========================================================================
  //  s3_cap5 — Robovill (7 líneas)
  // ===========================================================================
  // Robovill mirando a la izquierda en x = RX con escala 1.
  var RX = 690;
  G.cine.register('s3_cap5', { planos: [

    // 0 · Juanjo: en el corazón de la fábrica, bajo un techo enorme y roto, esperaba Robovill.
    {
      fondo: 'arenaRobovill',
      transicion: 'fundido',
      camara: { zoom: 1.3, x: 480, y: 120, hasta: { zoom: 1, x: 480 }, t: 0.6, dur: 2.4 },
      actores: [
        { quien: 'robovill', x: RX, facing: -1, alas: 'cerradas', taladro: 0.3,
          acciones: [{ accion: 'brillar', t: 2.4, color: 'rgba(248,113,113,0.55)' }] },
        { quien: 'director', x: 110, acciones: [{ accion: 'entrar', t: 1.4, desde: 'izquierda', dur: 0.8 }] },
        { quien: 'falcon', x: 200, acciones: [{ accion: 'entrar', t: 1.5, desde: 'izquierda', dur: 0.8 }] },
        { quien: 'mikey', x: 290, acciones: [{ accion: 'entrar', t: 1.6, desde: 'izquierda', dur: 0.8 }] },
        { quien: 'peter', x: 380, acciones: [{ accion: 'entrar', t: 1.7, desde: 'izquierda', dur: 0.8 }] }
      ],
      efectos: [
        { tipo: 'brillo', x: 480, y: 10, radio: 220, color: 'rgba(254,240,138,0.5)' },
        { tipo: 'polvo', x: 480, y: 330, t: 0.4, repetir: 1.2, dur: 6, cantidad: 4, color: '#a8a29e' }
      ],
      textos: [{ estilo: 'cartel', texto: 'En el corazón de la fábrica...', t: 0.3 }],
      sonido: [{ nombre: 'rumble', t: 0.4 }, { nombre: 'robot', t: 2.4 }]
    },

    // 1 · Robovill: ¡JA, JA! ¿CUATRO HEROECITOS? ¡Más armas de las que te imaginas:
    //     martillo, sierra, cañón y TALADRO!
    {
      fondo: 'arenaRobovill',
      camara: { zoom: 1.08, x: 520, y: 190 },
      actores: [
        { quien: 'robovill', x: RX, facing: -1, alas: 'cerradas', taladro: 0.3,
          acciones: [
            { accion: 'reir', t: 0, dur: 0.9, texto: '¡JA!' },
            { accion: 'cambiar', t: 0.9, cambia: { brazo: 'martillo' }, destello: '#fde047' },
            { accion: 'cambiar', t: 1.4, cambia: { brazo: 'sierra' }, destello: '#fde047' },
            { accion: 'cambiar', t: 1.9, cambia: { brazo: 'canon' }, destello: '#fde047' },
            { accion: 'cambiar', t: 2.4, cambia: { taladro: 1 }, destello: '#fde047' },
            { accion: 'temblar', t: 2.4, fuerza: 0.3 }
          ] },
        { quien: 'director', x: 120 },
        { quien: 'falcon', x: 205, bocadillo: '?', bocadilloT: 0.4 },
        { quien: 'mikey', x: 290 },
        { quien: 'peter', x: 375, bocadillo: '!', bocadilloT: 2.5 }
      ],
      textos: [
        txt({ texto: '¡MARTILLO!', x: 470, y: 120, t: 0.9, dur: 0.5, tam: 34 }, ROJO),
        txt({ texto: '¡SIERRA!', x: 470, y: 170, t: 1.4, dur: 0.5, tam: 34 }, ROJO),
        txt({ texto: '¡CAÑÓN!', x: 470, y: 120, t: 1.9, dur: 0.5, tam: 34 }, ROJO),
        txt({ texto: '¡TALADRO!', x: 700, y: 100, t: 2.4, dur: 0.6, tam: 44 }, ROJO),
        { estilo: 'titulo', texto: '¡MÁS ARMAS DE LAS QUE TE IMAGINAS!', x: 480, y: 56, t: 3.1, tam: 30, color: '#fca5a5', borde: '#450a0a', pantalla: true }
      ],
      sonido: [{ nombre: 'transform', t: 0.9 }, { nombre: 'transform', t: 1.4 }, { nombre: 'transform', t: 1.9 }, { nombre: 'drill', t: 2.4 }]
    },

    // 2 · Papá: la gema copia brillaba en su pecho; el taladro giraba y las alas se abrían: ¡CLANC!
    {
      fondo: 'arenaRobovill',
      continuidad: false,
      camara: { zoom: 2.3, a: 'robovill', dx: -6, dy: 26, hasta: { zoom: 1.12, x: 600, y: 185 }, t: 1.3, dur: 1.4 },
      actores: [
        { quien: 'robovill', x: RX, facing: -1, alas: 'cerradas', brazo: 'canon', taladro: 0.2,
          acciones: [
            { accion: 'brillar', color: 'rgba(244,63,94,0.45)' },
            { accion: 'animar', t: 1.3, props: { taladro: [0.2, 1] }, dur: 0.8 },
            { accion: 'cambiar', t: 2.4, cambia: { alas: 'abiertas' }, destello: '#fde047' }
          ] }
      ],
      efectos: [
        { tipo: 'destellos', x: RX - 6, y: 223, radio: 30, cantidad: 5, tam: 1.1, delante: true, dur: 1.4 },
        { tipo: 'temblor', t: 2.4, fuerza: 0.6 }
      ],
      textos: [
        txt({ texto: '¡BRRRRR!', x: 560, y: 260, t: 1.4, dur: 1.1, tam: 36 }, GRIS),
        txt({ texto: '¡CLANC!', x: 520, y: 110, t: 2.45, tam: 54, estallido: '#fde68a' }, ORO)
      ],
      sonido: [{ nombre: 'gemGrab', t: 0.3 }, { nombre: 'drill', t: 1.3 }, { nombre: 'press', t: 2.4 }]
    },

    // 3 · Director: el plan: Peter protege, Mikey dispara a la gema, yo hackeo y Falcon ataca.
    {
      fondo: 'arenaRobovill',
      continuidad: false,
      camara: { zoom: 1.2, x: 400, y: 195, hasta: { zoom: 1.25, x: 410 }, t: 1.0, dur: 2.4 },
      actores: [
        { quien: 'robovill', x: 880, escala: 0.8, facing: -1, z: -1, brazo: 'canon', taladro: 1 },
        { quien: 'peter', x: 200, acciones: [{ accion: 'cambiar', t: 0.3, cambia: { pose: 'bloquear' }, destello: '#86efac' }, { accion: 'brillar', t: 0.3, color: 'rgba(74,222,128,0.5)' }] },
        { quien: 'mikey', x: 320, arma: 'francotirador', acciones: [{ accion: 'cambiar', t: 0.9, cambia: { pose: 'attack' }, destello: '#93c5fd' }] },
        { quien: 'director', x: 440, acciones: [{ accion: 'cambiar', t: 1.5, cambia: { pose: 'hack' }, destello: '#67e8f9' }] },
        { quien: 'falcon', x: 560, acciones: [{ accion: 'atacar', t: 2.1, veces: 2, cada: 0.3 }, { accion: 'cambiar', t: 2.8, cambia: { pose: 'win' } }] }
      ],
      textos: [
        { estilo: 'titulo', texto: 'PROTEGE', x: 200, y: 160, t: 0.3, tam: 20, color: '#bbf7d0', borde: '#14532d' },
        { estilo: 'titulo', texto: 'DISPARA', x: 320, y: 140, t: 0.9, tam: 20, color: '#bfdbfe', borde: '#1e3a8a' },
        { estilo: 'titulo', texto: 'HACKEA', x: 440, y: 160, t: 1.5, tam: 20, color: '#cffafe', borde: '#0e7490' },
        { estilo: 'titulo', texto: 'ATACA', x: 560, y: 140, t: 2.1, tam: 20, color: '#fde68a', borde: '#92400e' }
      ],
      sonido: [{ nombre: 'shieldBlock', t: 0.3 }, { nombre: 'launcherSwap', t: 0.9 }, { nombre: 'hack', t: 1.5 }]
    },

    // 4 · Peter: ¡De mi escudo no pasa nadie! (el cañón de Robovill rebota: ¡CLINC, CLINC, CLINC!)
    {
      fondo: 'arenaRobovill',
      continuidad: false,
      camara: { zoom: 1.08, x: 560, y: 190, hasta: { zoom: 1.45, a: 'peter', dx: 40, dy: -35 }, t: 2.0, dur: 1.0 },
      actores: [
        { quien: 'mikey', x: 200, acciones: [{ accion: 'asustarse', t: 0.6 }] },
        { quien: 'peter', x: 330, pose: 'bloquear',
          acciones: [{ accion: 'brillar', t: 0.6, color: 'rgba(74,222,128,0.6)' }] },
        { quien: 'robovill', x: 800, escala: 0.85, facing: -1, brazo: 'canon', taladro: 1,
          acciones: [{ accion: 'disparar', t: 0.3, a: 'peter', proyectil: 'bola', veces: 3, cada: 0.4, rebota: true }] }
      ],
      textos: [
        txt({ texto: '¡CLINC!', x: 440, y: 150, t: 0.7, dur: 0.5, tam: 36 }, VERDE),
        txt({ texto: '¡CLINC!', x: 470, y: 110, t: 1.1, dur: 0.5, tam: 40 }, VERDE),
        txt({ texto: '¡CLINC!', x: 440, y: 130, t: 1.5, dur: 0.5, tam: 44 }, VERDE),
        { estilo: 'titulo', texto: '¡NO PASA NADIE!', x: 480, y: 66, t: 2.3, tam: 54, color: '#bbf7d0', borde: '#14532d', pantalla: true }
      ],
      sonido: [{ nombre: 'shieldBlock', t: 0.7 }, { nombre: 'shieldBlock', t: 1.1 }, { nombre: 'shieldBlock', t: 1.5 }]
    },

    // 5 · Mikey: ¡Francotirador listo! Apunto a la gema copia. (mira de francotirador)
    {
      fondo: 'arenaRobovill',
      continuidad: false,
      camara: { zoom: 1.4, a: 'mikey', dx: 40, dy: -35, hasta: { zoom: 1.15, x: 560, y: 195 }, t: 1.0, dur: 1.4 },
      actores: [
        { quien: 'mikey', x: 260, arma: 'pistola',
          acciones: [{ accion: 'cambiar', t: 0.3, cambia: { arma: 'francotirador', pose: 'attack' }, destello: '#93c5fd' }] },
        { quien: 'robovill', x: 760, escala: 0.9, facing: -1, brazo: 'martillo', taladro: 1 }
      ],
      efectos: [
        { tipo: 'senal', x: 760 - 7 * 0.81, y: 330 - 119 * 0.81, t: 1.6, color: '#f87171', radio: 44 },
        { tipo: 'lineasAccion', a: 'robovill', t: 2.2, dur: 0.6, cantidad: 30 }
      ],
      textos: [
        txt({ texto: '¡CLIC, CLAC!', x: 300, y: 110, t: 0.35, dur: 1.0, tam: 30 }, AZUL),
        { estilo: 'titulo', texto: 'GEMA COPIA', x: 754, y: 150, t: 1.8, tam: 22, color: '#fda4af', borde: '#881337' },
        { estilo: 'bocadillo', a: 'mikey', texto: '¡Listo!', t: 2.4 }
      ],
      sonido: [{ nombre: 'launcherSwap', t: 0.3 }, { nombre: 'checkpoint', t: 1.6 }]
    },

    // 6 · Falcon: ¡Todos juntos! ¡WE ARE A TEAM!
    {
      fondo: 'arenaRobovill',
      continuidad: false,
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.06, x: 490, y: 182 }, t: 1.4, dur: 2 },
      actores: [
        { quien: 'director', x: 130, acciones: [{ accion: 'saltar', t: 0.4, altura: 50, dur: 0.55 }, { accion: 'celebrar', t: 1.0 }] },
        { quien: 'mikey', x: 240, acciones: [{ accion: 'saltar', t: 0.5, altura: 50, dur: 0.55 }, { accion: 'celebrar', t: 1.1 }] },
        { quien: 'peter', x: 350, acciones: [{ accion: 'saltar', t: 0.6, altura: 50, dur: 0.55 }, { accion: 'celebrar', t: 1.2 }] },
        { quien: 'falcon', x: 470, pose: 'win',
          acciones: [{ accion: 'saltar', t: 0.3, altura: 70, dur: 0.6 }, { accion: 'celebrar', t: 0.9 }, { accion: 'brillar', t: 0.9, color: 'rgba(253,230,138,0.8)' }] },
        { quien: 'robovill', x: 820, escala: 0.85, facing: -1, brazo: 'martillo', taladro: 1,
          acciones: [{ accion: 'asustarse', t: 1.8 }], bocadillo: '¿¡QUÉ!?', bocadilloT: 2.0 }
      ],
      efectos: [
        { tipo: 'rayos', x: 300, y: 230, t: 0.8, color: '#fde68a' },
        { tipo: 'lluviaEstrellas', t: 1.0, cantidad: 18 }
      ],
      textos: [{ estilo: 'titulo', texto: '¡WE ARE A TEAM!', x: 400, y: 60, t: 0.8, tam: 58, pantalla: true }],
      sonido: [{ nombre: 'teamAttack', t: 0.8 }]
    }
  ] });

  // ===========================================================================
  //  s3_final — La fusión final gana, la gema copia se apaga y Robovill SE ESCAPA (8 líneas)
  // ===========================================================================
  // Robovill GIGANTE: mirando a la izquierda en x = FX, escala FE. En el capítulo 5
  // medía escala 1; aquí crece de 1 a FE = 1,3: con la cámara a zoom 1 (el mínimo
  // del motor) es lo más grande que cabe, la punta del taladro toca el techo roto.
  // La fusión final se queda en FU (≈ 190 px): Robovill le saca casi el doble.
  var FX = 740, FE = 1.3, FS = 0.9 * FE, FU = 0.64;
  var GEMA_F = puntoGema(FX, 330, FE, -1);                      // la gema de su pecho
  // "De rodillas": se encoge un poco (FK) y baja solo 6 px, así los pies no se meten
  // bajo la franja del suelo.
  var ROD = 6, FK = FE * 0.9;
  // Robovill lejano (último plano): escala RE.
  var RE = 0.45, RLX = 760, RLY = 190, RLX2 = 230, RLY2 = 120;

  G.cine.register('s3_final', { planos: [

    // 0 · Papá: Robovill se hace gigante... ¡pero los cuatro vehículos y Dark Secuaz se unen
    //     en la fusión final!
    {
      fondo: 'arenaRobovill',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'robovill', x: FX, escala: 1, facing: -1, alas: 'abiertas', brazo: 'martillo', taladro: 1,
          acciones: [
            // tras el fundido se le ve con su tamaño del capítulo 5... y entonces crece
            { accion: 'temblar', t: 0.5, dur: 1.6, fuerza: 0.7 },
            { accion: 'crecer', t: 0.7, factor: FE, dur: 1.3 },
            { accion: 'brillar', t: 0.6, color: 'rgba(244,63,94,0.5)' }
          ] },
        { quien: 'robotMoto', alias: 'moto', modo: 'moto', x: -80, escala: 0.7,
          acciones: [{ accion: 'conducir', t: 1.0, hasta: { x: 250 }, dur: 0.9 }, { accion: 'desaparecer', t: 2.2, color: '#fdba74' }] },
        { quien: 'cocheTransformable', alias: 'coche', x: -120, escala: 0.65,
          acciones: [{ accion: 'conducir', t: 1.1, hasta: { x: 160 }, dur: 0.9 }, { accion: 'desaparecer', t: 2.2, color: '#93c5fd' }] },
        { quien: 'submarinoNave', alias: 'sub', modo: 'nave', x: -100, y: 170, escala: 0.55,
          acciones: [{ accion: 'volar', t: 1.0, hasta: { x: 240, y: 180 }, dur: 1.0 }, { accion: 'desaparecer', t: 2.2, color: '#fde047' }] },
        { quien: 'mechaHalcon', alias: 'mecha', x: -100, y: 120, escala: 0.45,
          acciones: [{ accion: 'volar', t: 1.1, hasta: { x: 300, y: 125 }, dur: 1.0 }, { accion: 'desaparecer', t: 2.2, color: '#86efac' }] },
        { quien: 'secuaz', x: 300, escala: 0.6, bueno: true,
          acciones: [{ accion: 'entrar', t: 0.9, desde: 'izquierda', dur: 1.0 }, { accion: 'desaparecer', t: 2.2, color: '#86efac' }] },
        { quien: 'fusionFinal', alias: 'fusion', x: 250, escala: FU,
          acciones: [{ accion: 'aparecer', t: 2.35, color: '#fef9c3' }, { accion: 'celebrar', t: 3.0, altura: 6 }] }
      ],
      efectos: [
        { tipo: 'temblor', t: 0.6, fuerza: 0.9, dur: 1.6 },
        { tipo: 'polvo', x: FX, y: 330, t: 0.8, cantidad: 14, tam: 2 },
        { tipo: 'polvo', x: FX, y: 0, t: 1.5, cantidad: 10, tam: 1.4, color: '#a8a29e' },   // cascotes del techo roto
        { tipo: 'flash', t: 2.25, color: '#fef9c3' },
        { tipo: 'rayos', x: 250, y: 230, t: 2.35, color: '#a7f3d0' }
      ],
      textos: [
        txt({ texto: '¡GRRROOOAR!', x: 470, y: 120, t: 0.7, dur: 1.5, tam: 40 }, ROJO),
        { estilo: 'titulo', texto: '¡FUSIÓN FINAL!', x: 480, y: 34, t: 2.5, tam: 44, color: '#bbf7d0', borde: '#14532d', pantalla: true }
      ],
      sonido: [{ nombre: 'rumble', t: 0.6 }, { nombre: 'roar', t: 0.7 }, { nombre: 'boost', t: 1.0 }, { nombre: 'fusion3', t: 2.25 }]
    },

    // 1 · Juanjo: ¡ATAQUE EN EQUIPO! Un rayo de todos los colores da de lleno en la gema copia.
    {
      fondo: 'arenaRobovill',
      camara: { zoom: 1, x: 480, temblor: 0 },
      actores: [
        { quien: 'robovill', x: FX, escala: FE, facing: -1, alas: 'abiertas', brazo: 'martillo', taladro: 1,
          acciones: [{ accion: 'temblar', t: 1.2, dur: 1.4, fuerza: 0.8 }] },
        { quien: 'fusionFinal', alias: 'fusion', x: 250, escala: FU,
          acciones: [
            { accion: 'disparar', t: 0.4, hasta: { x: GEMA_F.x, y: GEMA_F.y }, proyectil: 'energia', veces: 3, cada: 0.12 },
            { accion: 'disparar', t: 0.46, hasta: { x: GEMA_F.x, y: GEMA_F.y - 6 }, proyectil: 'pluma', veces: 3, cada: 0.12 },
            { accion: 'disparar', t: 0.52, hasta: { x: GEMA_F.x, y: GEMA_F.y + 6 }, proyectil: 'pulso', veces: 3, cada: 0.12 },
            { accion: 'disparar', t: 0.58, hasta: { x: GEMA_F.x, y: GEMA_F.y }, proyectil: 'bola', veces: 3, cada: 0.12 },
            { accion: 'disparar', t: 0.64, hasta: { x: GEMA_F.x, y: GEMA_F.y }, proyectil: 'escudo' }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', x: 250, y: 220, t: 0.2, color: '#fef9c3' },
        { tipo: 'lineasAccion', x: GEMA_F.x, y: GEMA_F.y, t: 1.1, dur: 1.0 },
        { tipo: 'flash', t: 1.15, color: '#ffffff' },
        { tipo: 'onda', x: GEMA_F.x, y: GEMA_F.y, t: 1.15, radio: 160 },
        { tipo: 'destellos', x: GEMA_F.x, y: GEMA_F.y, t: 1.2, radio: 70, color: '#fde047', delante: true }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡ATAQUE EN EQUIPO!', x: 480, y: 34, t: 0.2, tam: 44, pantalla: true },
        txt({ texto: '¡ZAAAS!', x: 560, y: 300, t: 1.2, tam: 50 }, { color: '#fde047', borde: '#7c3aed' })
      ],
      sonido: [{ nombre: 'teamAttack', t: 0.3 }, { nombre: 'bigPunch', t: 1.15 }]
    },

    // 2 · Papá: la gema copia se agrieta... y se apaga. Robovill cae de rodillas.
    //     (primer plano de la gema de su pecho; luego la cámara se aleja)
    {
      fondo: 'arenaRobovill',
      continuidad: false,
      camara: { zoom: 2.4, x: GEMA_F.x, y: GEMA_F.y - 10, hasta: { zoom: 1.05, x: 600, y: 180 }, t: 1.9, dur: 1.4 },
      actores: [
        { quien: 'robovill', x: FX, escala: FE, facing: -1, alas: 'abiertas', brazo: 'martillo', taladro: 0,
          acciones: [
            { accion: 'temblar', t: 0.3, dur: 0.5, fuerza: 0.4 },
            { accion: 'cambiar', t: 0.6, cambia: { gema: 'grieta' }, destello: '#ffffff' },
            { accion: 'animar', t: 1.1, props: { gema: [0.02, 1] }, dur: 0.7 },
            { accion: 'cambiar', t: 2.3, cambia: { y: 330 + ROD, escala: FK } },
            { accion: 'temblar', t: 2.3, dur: 0.5, fuerza: 0.6 }
          ] }
      ],
      efectos: [
        { tipo: 'polvo', x: FX, y: 330, t: 2.3, cantidad: 12, tam: 1.6 },
        { tipo: 'temblor', t: 2.3, fuerza: 0.7 },
        { tipo: 'estrellas', x: FX + 10, y: 50, t: 2.5, radio: 44 }
      ],
      textos: [
        txt({ texto: '¡CRAC!', x: GEMA_F.x + 70, y: GEMA_F.y - 30, t: 0.6, dur: 0.9, tam: 44 }, GRIS),
        txt({ texto: 'pffff...', x: GEMA_F.x - 70, y: GEMA_F.y + 40, t: 1.2, dur: 1.0, tam: 30, rot: 0 }, GRIS),
        txt({ texto: '¡CLONK!', x: 560, y: 300, t: 2.35, tam: 48 }, ORO)
      ],
      sonido: [{ nombre: 'gemGrab', t: 0.6 }, { nombre: 'hit', t: 2.3 }]
    },

    // 3 · Robovill: ¡NOOO! ¡ESTO NO ACABA AQUÍ, HÉROES! (de rodillas, con la gema apagada)
    //     Zoom suave para que Robovill, tan grande, quepa entero; la fusión, pequeña y entera a la izquierda.
    {
      fondo: 'arenaRobovill',
      camara: { zoom: 1.1, x: 560, y: 172 },
      actores: [
        { quien: 'fusionFinal', alias: 'fusion', x: 260, escala: FU },
        { quien: 'robovill', x: FX, y: 330 + ROD, escala: FK, facing: -1, alas: 'cerradas', brazo: 'martillo', taladro: 0, gema: 'apagada',
          acciones: [{ accion: 'temblar', t: 0.2, dur: 1.4, fuerza: 0.7 }] }
      ],
      efectos: [{ tipo: 'onda', x: FX, y: 200, t: 0.3, radio: 150 }],
      textos: [txt({ texto: '¡NOOO!', x: 500, y: 90, t: 0.3, tam: 60, estallido: '#fecaca' }, ROJO)],
      sonido: [{ nombre: 'roar', t: 0.3 }]
    },

    // 4 · Juanjo: abre sus alas de metal y sale volando por el agujero del techo...
    {
      fondo: 'arenaRobovill',
      continuidad: false,
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'director', x: 120, acciones: [{ accion: 'mirar', t: 1.0, mirar: 'derecha' }] },
        { quien: 'falcon', x: 210, acciones: [{ accion: 'senalar', t: 1.4, hasta: { x: 560, y: 20 }, dur: 1.6 }] },
        { quien: 'mikey', x: 300, bocadillo: '¡Eh, vuelve!', bocadilloT: 2.4 },
        { quien: 'peter', x: 390 },
        { quien: 'robovill', x: FX, y: 330 + ROD, escala: FK, facing: -1, alas: 'cerradas', brazo: 'martillo', taladro: 0, gema: 'apagada',
          acciones: [
            { accion: 'cambiar', t: 0.3, cambia: { alas: 'abiertas' }, destello: '#fde047' },
            { accion: 'volar', t: 0.9, hasta: { x: 560, y: -60 }, dur: 2.6 }
          ] }
      ],
      efectos: [
        { tipo: 'polvo', x: FX, y: 330, t: 0.9, cantidad: 12, tam: 1.8 },
        { tipo: 'estela', a: 'robovill', t: 1.0, color: '#fca5a5', tam: 18 },
        { tipo: 'viento', t: 0.9, dir: -1, cantidad: 10 }
      ],
      textos: [
        txt({ texto: '¡CLANC!', x: 820, y: 120, t: 0.3, dur: 0.7, tam: 40 }, ORO),
        { estilo: 'titulo', texto: '¡ROBOVILL SE ESCAPA!', x: 480, y: 66, t: 2.3, tam: 44, color: '#fca5a5', borde: '#450a0a', pantalla: true }
      ],
      sonido: [{ nombre: 'transform', t: 0.3 }, { nombre: 'escape', t: 0.9 }]
    },

    // 5 · Falcon: Mikey, Peter: ya sois de nuestro equipo. ¡Para siempre!
    {
      fondo: 'arenaRobovill',
      continuidad: false,
      camara: { zoom: 1.05, x: 500, y: 185, hasta: { zoom: 1.15, x: 520, y: 190 }, t: 1.0, dur: 2.4 },
      actores: [
        { quien: 'director', x: 230, acciones: [{ accion: 'celebrar', t: 2.0 }] },
        { quien: 'falcon', x: 360, acciones: [{ accion: 'abrazar', t: 0.4, a: 'mikey' }] },
        { quien: 'mikey', x: 570, facing: -1, acciones: [{ accion: 'celebrar', t: 2.2 }] },
        { quien: 'peter', x: 720, facing: -1, acciones: [{ accion: 'celebrar', t: 2.3 }] },
        { quien: 'secuaz', x: 850, escala: 0.75, facing: -1, bueno: true, acciones: [{ accion: 'celebrar', t: 2.0, altura: 6 }] }
      ],
      efectos: [
        { tipo: 'brillo', x: 480, y: 10, radio: 220, color: 'rgba(254,240,138,0.5)' },
        { tipo: 'corazones', x: 560, y: 220, t: 1.3, cantidad: 6 }
      ],
      textos: [{ estilo: 'titulo', texto: '¡PARA SIEMPRE!', x: 480, y: 66, t: 1.8, tam: 52, pantalla: true }],
      sonido: [{ nombre: 'pickup', t: 1.3 }, { nombre: 'select', t: 1.8 }]
    },

    // 6 · Papá: esa noche hubo fiesta en la base del cielo. Y todos gritaron: ¡WE ARE A TEAM!
    {
      fondo: 'baseCielo',
      transicion: 'pagina',
      // De NOCHE: el fondo de la base (bgBaseCielo) solo existe de día, así que se
      // oscurece SOLO el fondo con un velo azul marino uniforme (un "brillo" enorme,
      // que se dibuja detrás de los actores), y encima va una luna llena donde
      // estaba el sol (x 830, y 84 del fondo). El tinte de toda la imagen es suave
      // para que los héroes se sigan viendo bien.
      tinte: 'rgba(10,14,52,0.15)',
      vineta: 1.4,
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.08, x: 470, y: 185 }, t: 1.4, dur: 2.4 },
      actores: [
        { quien: 'director', x: 170, acciones: [{ accion: 'saltar', t: 0.4, veces: 2, altura: 40, dur: 0.5 }, { accion: 'celebrar', t: 1.4 }] },
        { quien: 'falcon', x: 280, acciones: [{ accion: 'saltar', t: 0.5, veces: 2, altura: 40, dur: 0.5 }, { accion: 'celebrar', t: 1.5 }] },
        { quien: 'mikey', x: 390, acciones: [{ accion: 'saltar', t: 0.6, veces: 2, altura: 40, dur: 0.5 }, { accion: 'celebrar', t: 1.6 }] },
        { quien: 'peter', x: 500, acciones: [{ accion: 'saltar', t: 0.7, veces: 2, altura: 40, dur: 0.5 }, { accion: 'celebrar', t: 1.7 }] },
        { quien: 'robotPractica', alias: 'practica', x: 640, escala: 0.6, facing: -1, acciones: [{ accion: 'saltar', t: 0.3, veces: 4, altura: 20, dur: 0.45 }, { accion: 'celebrar', t: 2.1, altura: 8 }] },
        { quien: 'secuaz', x: 800, escala: 0.85, facing: -1, bueno: true, acciones: [{ accion: 'celebrar', t: 0.3, altura: 6 }] }
      ],
      efectos: [
        { tipo: 'brillo', x: 480, y: 170, radio: 8000, color: 'rgba(8,14,56,1)', fuerza: 1.05 },
        { tipo: 'brillo', x: 830, y: 84, radio: 150, color: 'rgba(6,10,40,1)', fuerza: 0.6 },
        { tipo: 'brillo', x: 830, y: 84, radio: 110, color: 'rgba(254,249,195,0.55)' },
        { tipo: 'lluviaEstrellas', t: 0.5, cantidad: 14 },
        { tipo: 'fuegos', t: 0.3, cantidad: 4 },
        { tipo: 'confeti', t: 2.4 },
        { tipo: 'notas', x: 640, y: 230, t: 0.5, cantidad: 5 }
      ],
      textos: [
        // la luna llena (un disco claro con borde, encima del sol del fondo)
        txt({ texto: '●', x: 830, y: 84, t: 0, tam: 96, rot: 0 }, { color: '#fef9c3', borde: '#fde68a' }),
        { estilo: 'cartel', texto: 'Esa noche, en la base del cielo...', t: 0.3, dur: 2.0 },
        { estilo: 'titulo', texto: '¡WE ARE A TEAM!', x: 480, y: 80, t: 2.4, tam: 60, pantalla: true }
      ],
      sonido: [{ nombre: 'victory', t: 0.4 }, { nombre: 'select', t: 2.4 }]
    },

    // 7 · Juanjo: …pero Robovill se escapó. ¿Volverá algún día?
    //     A lo lejos, en el cielo de la noche, Robovill vuela con su gema copia apagada.
    //     ("caminar" en vez de "volar": sin vaivén, así no se dibuja sombra en el cielo.)
    {
      fondo: 'menu',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'robovill', x: RLX, y: RLY, escala: RE, facing: -1, alas: 'abiertas', brazo: 'pinza', taladro: 0.4, gema: 'apagada',
          acciones: [{ accion: 'caminar', t: 0.3, hasta: { x: RLX2, y: RLY2 }, dur: 4.5 }] }
      ],
      efectos: [{ tipo: 'estela', a: 'robovill', t: 0.4, color: 'rgba(252,165,165,0.6)', tam: 8 }],
      textos: [
        { estilo: 'cartel', texto: 'Muy lejos de allí...', t: 0.3, dur: 2.0 },
        { estilo: 'titulo', texto: '¿VOLVERÁ ALGÚN DÍA?', x: 480, y: 260, t: 2.6, tam: 40, color: '#e9d5ff', borde: '#4c1d95', pantalla: true }
      ]
    }
  ] });
})();
