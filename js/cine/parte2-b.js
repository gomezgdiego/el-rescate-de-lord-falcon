// =============================================================================
// parte2-b.js — Historias animadas de la Parte 2 (segunda mitad):
//   s2_tras3 (8 líneas) · s2_cap4 (6) · s2_tras4 (5) · s2_cap5 (7) · s2_final (8)
// Un plano por línea, en el mismo orden. Manual: docs/cine-api.md.
// La acción va en y = 0…345 (el panel de diálogo tapa lo de abajo).
// Para nombrar actores, "alias" (nunca la clave "id").
// =============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  if (!G.cine || typeof G.cine.register !== 'function') return;

  // Dark Secuaz mirando a la izquierda en x = SX (escala 1): su bolsillo con la
  // gema queda en (SX − 31, 265).
  var SX = 720, BOLX = SX - 31, BOLY = 265;
  var GEMA = 'rgba(225,29,72,0.85)';
  var VERDE = 'rgba(74,222,128,0.85)';

  // ===========================================================================
  //  s2_tras3 — En la fábrica: el bolsillo blindado y el plan secreto
  // ===========================================================================
  G.cine.register('s2_tras3', { planos: [

    // 0 · Juanjo: "Al fondo de la fábrica, por fin lo alcanzaron. La gema
    //     brillaba en su barriga, en un bolsillo con candado."
    // Los héroes llegan corriendo; la cámara viaja hasta el bolsillo blindado.
    {
      fondo: 'fabrica',
      transicion: 'fundido',
      camara: { zoom: 1.05, x: 480, hasta: { zoom: 2.1, x: BOLX, y: BOLY - 10 }, t: 1.7, dur: 1.5 },
      actores: [
        { quien: 'secuaz', x: SX, facing: -1, bocadillo: '!', bocadilloT: 1.0 },
        { quien: 'director', x: 300, accion: 'entrar', desde: 'izquierda', dur: 0.8 },
        { quien: 'falcon', x: 410, accion: 'entrar', desde: 'izquierda', dur: 1.0, arco: 60 }
      ],
      efectos: [
        { tipo: 'brillo', x: BOLX, y: BOLY, radio: 34, color: GEMA, t: 1.6, delante: true, alpha: 0.75 },
        { tipo: 'destellos', x: BOLX, y: BOLY - 6, radio: 46, cantidad: 5, tam: 0.9, t: 2.6 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Al fondo de la fábrica...', t: 0.3 }
      ],
      sonido: [{ nombre: 'robot', t: 0.6 }, { nombre: 'gemGrab', t: 2.6 }]
    },

    // 1 · Director: "La hackearé como el martillo... ¿Qué? ¡Mi reloj dice ERROR!"
    // Lanza el rayo de hackeo al bolsillo... ¡BZZT! y el reloj se pone en rojo.
    {
      fondo: 'fabrica',
      camara: { zoom: 1.15, x: 500, hasta: { zoom: 1.75, a: 'reloj', dy: 10 }, t: 1.6, dur: 0.5 },
      actores: [
        { quien: 'secuaz', x: SX, facing: -1 },
        { quien: 'falcon', x: 480, facing: 1 },
        { quien: 'director', x: 300, pose: 'hack',
          acciones: [
            { accion: 'hackear', t: 0.2, dur: 1.2, hasta: { x: BOLX, y: BOLY } },
            { accion: 'asustarse', t: 1.7 }
          ],
          bocadillo: '¿Qué?', bocadilloT: 2.0 },
        { quien: 'reloj', x: 392, y: 296, escala: 0.7, z: 3, error: true,
          acciones: [
            { accion: 'aparecer', t: 1.5, color: '#fecaca' },
            { accion: 'temblar', t: 1.6, fuerza: 0.6 }
          ] }
      ],
      efectos: [
        { tipo: 'chispas', x: BOLX, y: BOLY, t: 0.9, color: '#fca5a5' },
        { tipo: 'chispas', x: BOLX, y: BOLY, t: 1.3, color: '#fca5a5' },
        { tipo: 'lineasAccion', a: 'reloj', radio: 120, alpha: 0.35, t: 1.7, color: '#fecaca' }
      ],
      textos: [
        { texto: '¡BZZT!', x: 690, y: 160, t: 0.9, dur: 0.8, tam: 42, color: '#bbf7d0', borde: '#15803d' }
      ],
      sonido: [{ nombre: 'hackFail', t: 1.5 }]
    },

    // 2 · Dark Secuaz: "¡JA! Ya no está en un martillo. Mi bolsillo está
    //     blindado: ¡no se puede hackear!"
    // Primer plano de Secuaz riéndose; el rayo rebota en el bolsillo: ¡CLINC!
    {
      fondo: 'fabrica',
      camara: { zoom: 1.5, a: 'secuaz', dx: -40, dy: -10 },
      actores: [
        { quien: 'director', x: 300, pose: 'hack',
          acciones: [{ accion: 'hackear', t: 0.9, dur: 0.9, hasta: { x: BOLX, y: BOLY } }] },
        { quien: 'secuaz', x: SX, facing: -1,
          acciones: [
            { accion: 'reir', t: 0.3, texto: '¡JA!' },
            { accion: 'temblar', t: 0.3, fuerza: 0.3 }
          ] }
      ],
      efectos: [
        { tipo: 'brillo', x: BOLX, y: BOLY, radio: 40, color: 'rgba(251,191,36,0.8)' },
        { tipo: 'chispas', x: BOLX, y: BOLY, t: 1.4, cantidad: 14 },
        { tipo: 'destellos', x: BOLX, y: BOLY, radio: 26, cantidad: 4, tam: 1, t: 2.0 }
      ],
      textos: [
        { texto: '¡CLINC!', x: 600, y: 200, t: 1.4, dur: 0.9, tam: 38 }
      ],
      sonido: [{ nombre: 'shieldBlock', t: 1.4 }]
    },

    // 3 · Papá: "Y con la fuerza de sus puños, quitársela iba a ser casi imposible."
    // Falcon se lanza a por la gema... ¡PUM! un puñetazo lo manda de vuelta.
    {
      fondo: 'fabrica',
      camara: { zoom: 1.1, x: 530 },
      actores: [
        { quien: 'director', x: 260, acciones: [{ accion: 'asustarse', t: 1.3 }] },
        { quien: 'falcon', x: 410,
          acciones: [
            { accion: 'correr', t: 0.25, hasta: { x: 590 } },
            { accion: 'retroceder', t: 1.15, distancia: 190, dur: 0.5 }
          ] },
        { quien: 'secuaz', x: SX, facing: -1,
          acciones: [{ accion: 'atacar', t: 0.95, a: 'falcon' }] }
      ],
      efectos: [
        { tipo: 'onda', x: 610, y: 260, t: 1.1, radio: 90 },
        { tipo: 'temblor', t: 1.1, fuerza: 0.7 },
        { tipo: 'estrellas', a: 'falcon', en: 'cabeza', dy: -8, t: 1.8 }
      ],
      textos: [
        { texto: '¡PUM!', x: 600, y: 120, t: 1.1, tam: 56, estallido: true }
      ],
      sonido: [{ nombre: 'bigPunch', t: 1.05 }, { nombre: 'hurt', t: 1.2 }]
    },

    // 4 · Falcon: "Si no podemos hackearla, habrá que quitársela. Pero...
    //     ¿cómo? Necesitamos un plan."
    // Primer plano de Falcon, mareado y pensativo: piensa en la gema.
    {
      fondo: 'fabrica',
      camara: { zoom: 1.5, a: 'falcon', dx: 70, dy: -30, hasta: { zoom: 1.6, dx: 80 }, t: 0.5, dur: 3 },
      actores: [
        { quien: 'director', x: 260 },
        { quien: 'falcon', x: 330,
          acciones: [{ accion: 'mirar', t: 0.2, mirar: 'derecha' }] },
        { quien: 'secuaz', x: SX, facing: -1 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'falcon', dibujo: 'gemaPoder', texto: '¿Cómo?', t: 0.7, lado: 'derecha' }
      ]
    },

    // 5 · Director: "Tengo una idea, Falcon. Acércate, que te lo cuento en secreto..."
    // ¡Idea! El Director se acerca y le cuchichea. Secuaz no se entera de nada.
    {
      fondo: 'fabrica',
      camara: { zoom: 1.3, x: 420 },
      actores: [
        { quien: 'director', x: 260,
          acciones: [
            { accion: 'saltar', t: 0.2, altura: 30, dur: 0.5 },
            { accion: 'caminar', t: 1.0, hasta: { x: 360 }, mirar: 'derecha' },
            { accion: 'hablar', t: 1.8 }
          ] },
        { quien: 'falcon', x: 420, facing: -1 },
        { quien: 'secuaz', x: SX, facing: -1, bocadillo: '¿?', bocadilloT: 2.6 }
      ],
      efectos: [
        { tipo: 'destellos', a: 'director', en: 'cabeza', dy: -20, radio: 34, cantidad: 5, tam: 1.2, dur: 1.4 }
      ],
      textos: [
        { estilo: 'bocadillo', texto: '!', a: 'director', t: 0.2, dur: 1.3 },
        { estilo: 'bocadillo', texto: 'Psss, psss...', a: 'director', tam: 22, t: 1.9, lado: 'izquierda' }
      ]
    },

    // 6 · Dark Secuaz: "¡Planead lo que queráis! ¡Os espero en mi fortaleza
    //     del cielo, donde nadie puede llegar!"
    // Secuaz se ríe y señala hacia arriba, hacia el cielo.
    {
      fondo: 'fabrica',
      camara: { zoom: 1.35, a: 'secuaz', dx: -60, dy: -30, hasta: { zoom: 1.12, x: 560 }, t: 1.6, dur: 2.2 },
      actores: [
        { quien: 'director', x: 330, facing: 1 },
        { quien: 'falcon', x: 420, facing: 1 },
        { quien: 'secuaz', x: SX, facing: -1,
          acciones: [
            { accion: 'reir', t: 0.2, texto: '¡JA!' },
            { accion: 'senalar', t: 1.4, hasta: { x: 800, y: 0 } }
          ] }
      ],
      efectos: [
        { tipo: 'lineasAccion', x: 800, y: 0, t: 1.5, alpha: 0.25, radio: 260 }
      ]
    },

    // 7 · Juanjo: "Dark Secuaz encendió sus propulsores y despegó hacia las
    //     nubes. ¡Tocaba volar!"
    // ¡FIUUUM! Secuaz despega con fuego en los pies. Los héroes lo miran subir.
    {
      fondo: 'fabrica',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'director', x: 330, facing: 1,
          acciones: [{ accion: 'senalar', t: 2.3, hasta: { x: 720, y: 0 } }] },
        { quien: 'falcon', x: 420, facing: 1,
          acciones: [{ accion: 'saltar', t: 2.6, veces: 2, altura: 40, dur: 0.5 }] },
        { quien: 'secuaz', x: SX, facing: -1,
          acciones: [
            { accion: 'temblar', t: 0, dur: 1.1, fuerza: 0.6 },
            { accion: 'volar', t: 1.1, hasta: { y: -320 }, dur: 2.2 }
          ] }
      ],
      efectos: [
        { tipo: 'humo', x: SX, y: 330, t: 0.1, cantidad: 8, alto: 160 },
        { tipo: 'chispas', x: SX, y: 325, t: 0.2, repetir: 0.3, dur: 1.2, color: '#fb923c' },
        { tipo: 'brillo', a: 'secuaz', en: 'pies', radio: 55, color: 'rgba(251,146,60,0.9)', t: 0.3 },
        { tipo: 'estela', a: 'secuaz', t: 1.1, tam: 30, color: '#fb923c' },
        { tipo: 'temblor', t: 1.1, fuerza: 0.5 }
      ],
      textos: [
        { texto: '¡FIUUUM!', x: 560, y: 110, t: 1.2, dur: 1.9, tam: 54 },
        { texto: '¡A VOLAR!', x: 380, y: 120, t: 3.2, tam: 44, color: '#bae6fd', borde: '#0369a1' }
      ],
      sonido: [{ nombre: 'jetpack', t: 0.2 }, { nombre: 'boost', t: 0.9 }]
    }
  ] });

  // ===========================================================================
  //  s2_cap4 — Vuelo al cielo: el mecha-halcón y el jetpack
  // ===========================================================================
  G.cine.register('s2_cap4', { planos: [

    // 0 · Papá: "La fortaleza flotaba sobre las nubes. ¿Cómo iban a llegar
    //     hasta allí arriba?"
    {
      fondo: 'cielo',
      transicion: 'fundido',
      camara: { zoom: 1.0, x: 480, hasta: { zoom: 1.15, x: 600 }, t: 0.6, dur: 3 },
      actores: [
        { quien: 'director', x: 260, facing: 1, bocadillo: '¿?', bocadilloT: 2.4 },
        { quien: 'falcon', x: 360, facing: 1,
          acciones: [{ accion: 'senalar', t: 1.0, hasta: { x: 840, y: 150 } }] }
      ],
      efectos: [
        { tipo: 'destellos', x: 860, y: 140, radio: 90, cantidad: 6, t: 0.8 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Muy por encima de las nubes...', t: 0.3 }
      ]
    },

    // 1 · Falcon: "¡Mira, un robot halcón! Esta vez me toca a mí hackear.
    //     ¡Me enseñaste bien, amigo!"
    {
      fondo: 'cielo',
      camara: { zoom: 1.25, x: 520 },
      actores: [
        { quien: 'director', x: 260, facing: 1,
          acciones: [{ accion: 'celebrar', t: 2.2, altura: 10 }] },
        { quien: 'falcon', x: 360, facing: 1, bocadillo: '¡Mira!', bocadilloT: 0.3,
          acciones: [{ accion: 'senalar', t: 0.3, a: 'mechaHalcon' }] },
        { quien: 'mechaHalcon', x: 680, modo: 'posado', enemigo: true, facing: -1,
          acciones: [{ accion: 'entrar', desde: 'derecha', dur: 0.8 }] }
      ],
      efectos: [
        { tipo: 'polvo', x: 680, y: 330, t: 0.8 }
      ]
    },

    // 2 · Juanjo: "Bip, bip, ¡CLIC! El mecha-halcón abrió sus alas de metal con
    //     un brillo verde. Falcon saltó a los mandos."
    {
      fondo: 'cielo',
      camara: { zoom: 1.2, x: 540 },
      actores: [
        { quien: 'director', x: 260, facing: 1 },
        { quien: 'falcon', x: 360, facing: 1, pose: 'shoot',
          acciones: [
            { accion: 'hackear', t: 0.2, dur: 1.2, a: 'mechaHalcon' },
            { accion: 'saltar', t: 2.0, hasta: { x: 660 }, altura: 140, dur: 0.7 },
            { accion: 'desaparecer', t: 2.7, dur: 0.2 }
          ] },
        { quien: 'mechaHalcon', x: 680, modo: 'posado', enemigo: true, facing: -1,
          acciones: [
            { accion: 'cambiar', t: 1.4, cambia: { enemigo: false, piloto: false }, destello: '#4ade80' },
            { accion: 'cambiar', t: 2.7, cambia: { piloto: true, modo: 'vuelo', y: 290, facing: 1 }, destello: '#bbf7d0' },
            { accion: 'flotar', t: 2.8, altura: 8 },
            { accion: 'brillar', t: 1.4, color: VERDE }
          ] }
      ],
      textos: [
        { texto: '¡BIP, BIP!', x: 560, y: 90, t: 0.3, dur: 1.1, tam: 36, color: '#bbf7d0', borde: '#15803d' },
        { texto: '¡CLIC!', x: 780, y: 100, t: 1.4, dur: 1.4, tam: 48, color: '#bbf7d0', borde: '#15803d' },
        { texto: '¡FLAP!', x: 560, y: 110, t: 2.8, tam: 40 }
      ],
      sonido: [{ nombre: 'jump', t: 2.0 }, { nombre: 'transform', t: 2.7 }]
    },

    // 3 · Director: "¡Y yo me pongo el jetpack! Volaré a tu lado."
    {
      fondo: 'cielo',
      camara: { zoom: 1.35, a: 'director', dx: 80, dy: -30, hasta: { zoom: 1.1, x: 480 }, t: 1.6, dur: 2 },
      actores: [
        { quien: 'jetpack', x: 330, llama: 0.3,
          acciones: [{ accion: 'desaparecer', t: 0.8, dur: 0.3 }] },
        { quien: 'director', x: 260, facing: 1,
          acciones: [
            { accion: 'cambiar', t: 0.8, cambia: { jetpack: true }, destello: '#fde68a' },
            { accion: 'volar', t: 1.4, hasta: { x: 400, y: 220 }, dur: 1.2 },
            { accion: 'flotar', t: 2.6, altura: 8 }
          ] },
        { quien: 'mechaHalcon', x: 680, y: 290, facing: 1,
          acciones: [{ accion: 'flotar', altura: 8 }] }
      ],
      textos: [
        { texto: '¡CLAC!', x: 330, y: 150, t: 0.8, dur: 0.8, tam: 40 },
        { texto: '¡FSSSH!', x: 150, y: 260, t: 1.4, dur: 1.4, tam: 36, color: '#fed7aa', borde: '#ea580c' }
      ],
      sonido: [{ nombre: 'jetpack', t: 1.4 }]
    },

    // 4 · Falcon: "¡Ojo con los drones! Avisan con un «!» antes de atacar."
    {
      fondo: 'cielo',
      fondoVel: 160,
      habla: 'mechaHalcon',
      camara: { zoom: 1.05, x: 480 },
      actores: [
        { quien: 'director', x: 230, y: 170, jetpack: true, llama: 1,
          acciones: [{ accion: 'flotar', altura: 10 }] },
        { quien: 'mechaHalcon', x: 360, y: 300, facing: 1,
          acciones: [{ accion: 'flotar', altura: 8 }] },
        { quien: 'dronEnjambre', alias: 'd1', x: 720, y: 140, facing: -1, bocadillo: '!', bocadilloT: 1.0,
          acciones: [{ accion: 'entrar', desde: 'derecha', dur: 0.8 }, { accion: 'flotar', t: 0.8 }] },
        { quien: 'dronEnjambre', alias: 'd2', x: 800, y: 230, facing: -1, bocadillo: '!', bocadilloT: 1.4,
          acciones: [{ accion: 'entrar', t: 0.2, desde: 'derecha', dur: 0.8 }, { accion: 'flotar', t: 1.0 }] },
        { quien: 'dronRayo', alias: 'd3', x: 660, y: 300, facing: -1, cargando: true, bocadillo: '!', bocadilloT: 1.8,
          acciones: [{ accion: 'entrar', t: 0.4, desde: 'derecha', dur: 0.8 }, { accion: 'flotar', t: 1.2 }] }
      ],
      efectos: [
        { tipo: 'viento', dir: -1, cantidad: 10 }
      ],
      sonido: [{ nombre: 'robot', t: 0.5 }]
    },

    // 5 · Papá: "¡Arriba, más arriba! ¡Rumbo a la fortaleza en el cielo!"
    {
      fondo: 'cielo',
      fondoVel: 260,
      camara: { zoom: 1.1, x: 420, hasta: { zoom: 1, x: 520 }, t: 0.4, dur: 2.5 },
      actores: [
        { quien: 'director', x: 230, y: 230, jetpack: true, llama: 1,
          acciones: [{ accion: 'volar', t: 0.4, hasta: { x: 430, y: 170 }, dur: 2.2 }, { accion: 'flotar', t: 2.6 }] },
        { quien: 'mechaHalcon', x: 330, y: 330, facing: 1,
          acciones: [{ accion: 'volar', t: 0.2, hasta: { x: 690, y: 290 }, dur: 2.2 }, { accion: 'flotar', t: 2.4 }] }
      ],
      efectos: [
        { tipo: 'velocidad', dir: -1 },
        { tipo: 'estela', a: 'mechaHalcon', t: 0.2, tam: 18, color: '#86efac' },
        { tipo: 'estela', a: 'director', t: 0.4, tam: 12, color: '#fdba74' }
      ],
      textos: [
        { texto: '¡ZUUUM!', x: 330, y: 110, t: 0.6, dur: 2.0, tam: 50 }
      ],
      sonido: [{ nombre: 'boost', t: 0.3 }]
    }
  ] });

  // ===========================================================================
  //  s2_tras4 — Llegada a la fortaleza
  // ===========================================================================
  G.cine.register('s2_tras4', { planos: [

    // 0 · Juanjo: "Entre nubes doradas apareció la fortaleza, con estandartes
    //     que llevaban los cuernos de Dark Toros."
    {
      fondo: 'cielo',
      transicion: 'fundido',
      fondoVel: 60,
      tinte: 'rgba(251,191,36,0.22)',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.3, x: 640, y: 175 }, t: 0.4, dur: 3.2 },
      actores: [
        { quien: 'mechaHalcon', x: 470, y: 290, facing: 1,
          acciones: [{ accion: 'entrar', t: 0.2, desde: 'izquierda', dur: 1.6 }, { accion: 'flotar', t: 1.8 }] },
        { quien: 'director', x: 330, y: 190, jetpack: true, llama: 1,
          acciones: [{ accion: 'entrar', t: 0.5, desde: 'izquierda', dur: 1.6 }, { accion: 'flotar', t: 2.1 }] }
      ],
      efectos: [
        { tipo: 'rayos', x: 860, y: 150, color: '#fde68a', cantidad: 10 },
        { tipo: 'brillo', x: 860, y: 160, radio: 160, color: 'rgba(253,224,71,0.6)' },
        { tipo: 'destellos', x: 850, y: 150, radio: 110, cantidad: 8, t: 1.2 }
      ],
      textos: [
        { texto: '¡OOOH!', x: 560, y: 90, t: 2.2, tam: 40, color: '#fef3c7', borde: '#b45309' }
      ]
    },

    // 1 · Papá: "El mecha-halcón aterrizó con suavidad y el Director apagó su jetpack."
    {
      fondo: 'fortaleza',
      transicion: 'fundido',
      camara: { zoom: 1.15, x: 420 },
      actores: [
        { quien: 'mechaHalcon', x: 300, y: 200, facing: 1,
          acciones: [
            { accion: 'volar', t: 0.2, hasta: { x: 300, y: 330 }, dur: 1.2 },
            { accion: 'cambiar', t: 1.4, cambia: { modo: 'posado' } }
          ] },
        { quien: 'director', x: 520, y: 150, jetpack: true, llama: 1,
          acciones: [
            { accion: 'volar', t: 0.6, hasta: { x: 520, y: 330 }, dur: 1.4 },
            { accion: 'cambiar', t: 2.1, cambia: { llama: 0 } },
            { accion: 'cambiar', t: 2.9, cambia: { jetpack: false }, destello: true }
          ] }
      ],
      efectos: [
        { tipo: 'polvo', x: 300, y: 330, t: 1.4, cantidad: 12 },
        { tipo: 'polvo', x: 520, y: 330, t: 2.0, cantidad: 7 },
        { tipo: 'humo', x: 520, y: 300, t: 2.1, cantidad: 3, alto: 70, dur: 2, color: 'rgba(226,232,240,0.6)' }
      ],
      textos: [
        { texto: '¡PLOF!', x: 300, y: 150, t: 1.4, dur: 1.2, tam: 40, color: '#e0f2fe', borde: '#0284c7' },
        { texto: 'clic', x: 600, y: 210, t: 2.1, dur: 1.2, tam: 28, color: '#fef3c7', borde: '#92400e' }
      ],
      sonido: [{ nombre: 'jump', t: 1.4 }]
    },

    // 2 · Director: "Ya estamos aquí. ¿Te acuerdas del plan?"
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.45, a: 'director', dx: -60, dy: -30 },
      actores: [
        { quien: 'mechaHalcon', x: 300, modo: 'posado', piloto: false },
        { quien: 'falcon', x: 380, facing: 1, accion: 'entrar', desde: 'izquierda', arco: 90, dur: 0.7 },
        { quien: 'director', x: 520, facing: -1 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: ['falcon', 'secuaz', 'director'], t: 1.0, lado: 'derecha' }
      ]
    },

    // 3 · Falcon: "¡Como si lo hubiera inventado yo! Vamos a recuperar esa gema."
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.5, a: 'falcon', dx: 40, dy: -30 },
      actores: [
        { quien: 'mechaHalcon', x: 300, modo: 'posado', piloto: false },
        { quien: 'director', x: 520, facing: -1 },
        { quien: 'falcon', x: 400, facing: 1,
          acciones: [
            { accion: 'saltar', t: 0.2, altura: 40, dur: 0.6 },
            { accion: 'celebrar', t: 0.8, altura: 10 }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', a: 'falcon', t: 0.3, color: '#bbf7d0', cantidad: 10 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'falcon', dibujo: 'gemaPoder', t: 0.9, lado: 'izquierda' }
      ]
    },

    // 4 · Juanjo: "Las puertas se abrieron despacio. Al fondo, un ojo rojo
    //     brillaba en la oscuridad."
    {
      fondo: 'fortaleza',
      continuidad: false,
      tinte: 'rgba(40,10,70,0.12)',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.22, x: 540, y: 185 }, t: 0.6, dur: 3 },
      actores: [
        { quien: 'puerta', x: 620, estilo: 'fortaleza', ojo: true, abierta: 0,
          acciones: [{ accion: 'abrir', t: 0.4, dur: 2.6 }] },
        { quien: 'falcon', x: 330, facing: 1, bocadillo: '!', bocadilloT: 2.8 },
        { quien: 'director', x: 420, facing: 1 }
      ],
      textos: [
        { texto: '¡ÑIIIC!', x: 760, y: 80, t: 0.5, dur: 2.2, tam: 40, color: '#e9d5ff', borde: '#6b21a8' }
      ]
    }
  ] });

  // ===========================================================================
  //  s2_cap5 — La fortaleza en el cielo: el plan
  // ===========================================================================
  G.cine.register('s2_cap5', { planos: [

    // 0 · Papá: "En lo más alto de la fortaleza los esperaba Dark Secuaz, más
    //     grande y fuerte que nunca."
    {
      fondo: 'fortaleza',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.15, x: 560 }, t: 1.4, dur: 2.2 },
      actores: [
        { quien: 'director', x: 230, facing: 1 },
        { quien: 'falcon', x: 320, facing: 1, acciones: [{ accion: 'asustarse', t: 1.6 }] },
        { quien: 'secuaz', x: 700, facing: -1,
          acciones: [{ accion: 'crecer', t: 0.8, factor: 1.3, dur: 0.9 }, { accion: 'brillar', t: 0.8, color: 'rgba(239,68,68,0.6)' }] }
      ],
      efectos: [
        { tipo: 'temblor', t: 0.9, fuerza: 0.6 },
        { tipo: 'lineasAccion', a: 'secuaz', t: 0.8, alpha: 0.3, radio: 230 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'En lo más alto de la fortaleza...', t: 0.3 }
      ],
      sonido: [{ nombre: 'robot', t: 0.8 }]
    },

    // 1 · Dark Secuaz: "¿Otra vez vosotros? ¡Mis puños aplastan montañas!
    //     ¡Nunca me quitaréis la gema!"
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.35, a: 'secuaz', dx: -80, dy: -30 },
      actores: [
        { quien: 'director', x: 230, facing: 1 },
        { quien: 'falcon', x: 320, facing: 1 },
        { quien: 'secuaz', x: 700, facing: -1, escala: 1.3,
          acciones: [
            { accion: 'atacar', t: 0.6, veces: 2, cada: 0.4 },
            { accion: 'rugir', t: 1.6, dur: 1.2 }
          ] }
      ],
      efectos: [
        { tipo: 'onda', x: 580, y: 320, t: 0.7, radio: 110 },
        { tipo: 'polvo', x: 580, y: 330, t: 0.7 },
        { tipo: 'temblor', t: 0.7, fuerza: 0.7 },
        { tipo: 'brillo', x: 700 - 31 * 1.3, y: 330 - 65 * 1.3, radio: 40, color: GEMA, t: 1.6 }
      ],
      textos: [
        { texto: '¡CATAPUM!', x: 420, y: 140, t: 0.7, dur: 1.4, tam: 46, estallido: true }
      ],
      sonido: [{ nombre: 'bigPunch', t: 0.7 }]
    },

    // 2 · Director: "Falcon, es la hora. Como lo planeamos."
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.6, x: 285, y: 240 },
      actores: [
        { quien: 'director', x: 230, facing: 1, acciones: [{ accion: 'mirar', t: 0.2, mirar: 'falcon' }] },
        { quien: 'falcon', x: 330, facing: -1,
          acciones: [{ accion: 'saltar', t: 1.6, altura: 18, dur: 0.4, veces: 2 }] },
        { quien: 'secuaz', x: 700, facing: -1, escala: 1.3 }
      ],
      textos: [
        { estilo: 'bocadillo', texto: '¡Sí!', a: 'falcon', t: 1.8, tam: 26, lado: 'derecha' }
      ]
    },

    // 3 · Falcon: "¡Eh, cabeza de torreta! ¡A que no me pillas!"
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.2, x: 520 },
      actores: [
        { quien: 'director', x: 230, facing: 1 },
        { quien: 'falcon', x: 330,
          acciones: [
            { accion: 'correr', t: 0.1, hasta: { x: 480 }, mirar: 'secuaz' },
            { accion: 'saltar', t: 0.8, veces: 3, altura: 50, dur: 0.5 },
            { accion: 'reir', t: 2.3, texto: '¡JI, JI!' }
          ] },
        { quien: 'secuaz', x: 700, facing: -1, escala: 1.3,
          bocadillo: '!', bocadilloT: 1.2,
          acciones: [{ accion: 'temblar', t: 1.3, fuerza: 0.5, dur: 1.5 }] }
      ],
      efectos: [
        { tipo: 'humo', a: 'secuaz', en: 'cabeza', dy: 10, t: 1.6, cantidad: 4, alto: 70, color: 'rgba(248,113,113,0.5)' }
      ]
    },

    // 4 · Juanjo: "Ese era el plan: Falcon lo distraería y el Director se
    //     acercaría a escondidas para quitarle la gema."
    {
      fondo: 'fortaleza',
      continuidad: false,
      camara: { zoom: 1.05, x: 480 },
      actores: [
        { quien: 'falcon', x: 480, facing: 1,
          acciones: [{ accion: 'correr', t: 0.2, hasta: { x: 260 }, mirar: 'derecha' }, { accion: 'saltar', t: 1.2, veces: 4, altura: 40, dur: 0.5 }] },
        { quien: 'secuaz', x: 700, facing: -1, escala: 1.3,
          acciones: [{ accion: 'caminar', t: 0.4, hasta: { x: 520 }, dur: 1.6, mirar: 'izquierda' }] },
        { quien: 'director', x: 760, facing: -1,
          acciones: [{ accion: 'entrar', t: 1.0, desde: 'derecha', dur: 2.0 }] }
      ],
      efectos: [
        { tipo: 'foco', a: 'director', t: 1.4, radio: 120, fuerza: 0.35 }
      ],
      textos: [
        { texto: 'tip, tip...', x: 800, y: 230, t: 1.6, tam: 24, color: '#e0f2fe', borde: '#334155' }
      ]
    },

    // 5 · Dark Secuaz: "¡JA, JA, JA! ¿Ese es vuestro gran plan? ¡Qué plan más ridículo!"
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.3, a: 'secuaz', dx: 60, dy: -10 },
      actores: [
        { quien: 'falcon', x: 260, facing: 1 },
        { quien: 'secuaz', x: 520, facing: -1, escala: 1.3,
          acciones: [
            { accion: 'mirar', t: 0.3, mirar: 'derecha' },
            { accion: 'reir', t: 0.5, texto: '¡JA!' }
          ] },
        { quien: 'director', x: 720, facing: -1, acciones: [{ accion: 'asustarse', t: 0.4 }] }
      ]
    },

    // 6 · Papá: "Cuidado con sus puñetazos, héroes. ¡Que empiece la batalla final!"
    {
      fondo: 'fortaleza',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'falcon', x: 260, facing: 1, pose: 'attack' },
        { quien: 'secuaz', x: 520, facing: -1, escala: 1.3,
          acciones: [{ accion: 'atacar', t: 0.5, veces: 2, cada: 0.5 }] },
        { quien: 'director', x: 760, facing: -1,
          acciones: [{ accion: 'saltar', t: 0.6, hasta: { x: 780 }, altura: 90, dur: 0.6 }, { accion: 'cambiar', t: 1.3, cambia: { pose: 'attack' } }] }
      ],
      efectos: [
        { tipo: 'temblor', t: 0.6, fuerza: 0.6 },
        { tipo: 'rayos', x: 480, y: 160, t: 1.5, color: '#fca5a5', cantidad: 12 }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡BATALLA FINAL!', x: 480, y: 70, t: 1.5, pantalla: true, tam: 54 }
      ],
      sonido: [{ nombre: 'roar', t: 1.4 }]
    }
  ] });

  // ===========================================================================
  //  s2_final — Dark Secuaz se vuelve bueno, la gema estalla y... ¿fin?
  // ===========================================================================
  G.cine.register('s2_final', { planos: [

    // 0 · Papá: "¡PUM! El Titán Halcón ganó la pelea de gigantes y las torretas
    //     de Dark Secuaz se desarmaron una a una."
    {
      fondo: 'fortaleza',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'robotFusion', x: 270, facing: 1, escala: 0.95,
          acciones: [{ accion: 'atacar', t: 0.3 }, { accion: 'cambiar', t: 0.9, cambia: { pose: 'win' } }] },
        { quien: 'secuazGigante', x: 690, facing: -1, escala: 0.95,
          acciones: [
            { accion: 'retroceder', t: 0.55, distancia: 60 },
            { accion: 'transformar', t: 1.9, en: 'secuaz', cambia: { escala: 1 }, dur: 0.8 }
          ] },
        { quien: 'miniTorreta', alias: 't1', x: 600, y: 175, escala: 0.8, z: 2, accion: 'pop', t: 0.9 },
        { quien: 'miniTorreta', alias: 't2', x: 790, y: 170, escala: 0.8, z: 2, accion: 'pop', t: 1.25 },
        { quien: 'miniTorreta', alias: 't3', x: 700, y: 95, escala: 0.8, z: 2, accion: 'pop', t: 1.6 }
      ],
      efectos: [
        { tipo: 'flash', t: 0.5 },
        { tipo: 'temblor', t: 0.5, fuerza: 1 }
      ],
      textos: [
        { texto: '¡PUM!', x: 440, y: 130, t: 0.5, dur: 0.5, tam: 60, estallido: true },
        { texto: '¡POP!', x: 560, y: 110, t: 0.95, dur: 0.5, tam: 32 },
        { texto: '¡POP!', x: 860, y: 110, t: 1.3, dur: 0.5, tam: 32 },
        { texto: '¡POP!', x: 760, y: 60, t: 1.65, dur: 0.5, tam: 32 }
      ],
      sonido: [{ nombre: 'bigPunch', t: 0.5 }]
    },

    // 1 · Juanjo: "Sin la gema y sin sus torretas, el ojo de Dark Secuaz pasó
    //     de rojo a verde. Y, por primera vez, sonrió."
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.9, a: 'secuaz', dy: -70 },
      actores: [
        { quien: 'secuaz', x: 690, facing: -1,
          acciones: [
            { accion: 'cambiar', t: 1.2, cambia: { bueno: true }, destello: '#4ade80' },
            { accion: 'brillar', t: 1.2, color: VERDE }
          ] }
      ],
      efectos: [
        { tipo: 'destellos', a: 'secuaz', en: 'cabeza', radio: 60, t: 1.2 }
      ],
      textos: [
        { texto: '¡PLIN!', x: 600, y: 90, t: 1.25, tam: 40, color: '#bbf7d0', borde: '#15803d' }
      ],
      sonido: [{ nombre: 'hackOk', t: 1.2 }]
    },

    // 2 · Dark Secuaz: "Gracias, amigos. Yo nunca quise ser malo: me obligaron
    //     a obedecer. ¡Por fin soy libre!"
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.2, x: 560 },
      actores: [
        { quien: 'director', x: 300, facing: 1 },
        { quien: 'falcon', x: 400, facing: 1 },
        { quien: 'secuaz', x: 690, facing: -1, bueno: true,
          acciones: [{ accion: 'celebrar', t: 1.6, altura: 14 }] }
      ],
      efectos: [
        { tipo: 'rayos', a: 'secuaz', t: 1.6, color: '#bbf7d0' },
        { tipo: 'corazones', a: 'secuaz', en: 'cabeza', t: 1.8, cantidad: 4 }
      ],
      textos: [
        { texto: '¡LIBRE!', x: 690, y: 70, t: 1.8, tam: 44, color: '#bbf7d0', borde: '#15803d' }
      ]
    },

    // 3 · Falcon: "Entonces ya no eres nuestro enemigo. ¡Bienvenido al equipo, amigo!"
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.3, x: 560 },
      actores: [
        { quien: 'director', x: 300, facing: 1, acciones: [{ accion: 'celebrar', t: 2.2 }] },
        { quien: 'falcon', x: 400, facing: 1,
          acciones: [{ accion: 'abrazar', t: 0.5, a: 'secuaz' }] },
        { quien: 'secuaz', x: 690, facing: -1, bueno: true }
      ],
      efectos: [
        { tipo: 'corazones', x: 620, y: 200, t: 1.4 }
      ]
    },

    // 4 · Papá: "Juntos, los héroes y su nuevo amigo rompieron la gema: ¡PUM!
    //     Estalló en mil estrellas. Destruida para siempre."
    {
      fondo: 'fortaleza',
      camara: { zoom: 1.2, x: 480, hasta: { zoom: 1, x: 480 }, t: 1.5, dur: 1.2 },
      actores: [
        { quien: 'director', x: 280, facing: 1,
          acciones: [
            { accion: 'correr', t: 0.1, hasta: { x: 365 } },
            { accion: 'atacar', t: 0.6, a: 'gema' }
          ] },
        { quien: 'falcon', x: 370, facing: 1, z: 1,
          acciones: [
            { accion: 'saltar', t: 0.1, hasta: { x: 425 }, altura: 60, dur: 0.5 },
            { accion: 'atacar', t: 0.65, a: 'gema' }
          ] },
        { quien: 'secuaz', x: 690, facing: -1, bueno: true,
          acciones: [
            { accion: 'caminar', t: 0.1, hasta: { x: 625 }, dur: 0.5 },
            { accion: 'atacar', t: 0.7, a: 'gema' }
          ] },
        { quien: 'gemaPoder', alias: 'gema', x: 495, y: 250, escala: 1.2, z: 2,
          acciones: [{ accion: 'flotar', altura: 6 }, { accion: 'romper', t: 0.75, dur: 1.4 }] }
      ],
      efectos: [
        { tipo: 'flash', t: 1.75 },
        { tipo: 'lluviaEstrellas', t: 1.85 },
        { tipo: 'destellos', x: 495, y: 200, radio: 140, cantidad: 10, t: 1.85 }
      ],
      textos: [
        { texto: '¡PUM!', x: 495, y: 90, t: 1.75, tam: 64, estallido: true }
      ]
    },

    // 5 · Juanjo: "Esa noche hubo fiesta en la ciudad: fuegos artificiales,
    //     música... ¡y un robot gigante bailando!"
    {
      fondo: 'ciudad',
      transicion: 'pagina',
      tinte: 'rgba(30,20,100,0.3)',
      camara: { zoom: 1.05, x: 480 },
      actores: [
        { quien: 'director', x: 260, facing: 1, acciones: [{ accion: 'celebrar', t: 0.3 }] },
        { quien: 'falcon', x: 360, facing: 1, acciones: [{ accion: 'celebrar', t: 0.5 }] },
        { quien: 'secuaz', x: 650, facing: -1, bueno: true, escala: 1.25,
          acciones: [
            { accion: 'saltar', t: 0.4, veces: 2, altura: 30, dur: 0.6 },
            { accion: 'girar', t: 1.6, veces: 1, dur: 0.8 },
            { accion: 'saltar', t: 2.4, veces: 8, altura: 20, dur: 0.6 }
          ] }
      ],
      efectos: [
        { tipo: 'fuegos', cantidad: 7 },
        { tipo: 'notas', x: 470, y: 260, cantidad: 7 },
        { tipo: 'confeti', t: 0.8, cantidad: 40 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Esa noche, en la ciudad...', t: 0.3 }
      ],
      sonido: [{ nombre: 'victory', t: 0.4 }]
    },

    // 6 · Papá: "Porque con amistad y trabajo en equipo no hay nada imposible.
    //     Y así terminó la aventura..."
    {
      fondo: 'ciudad',
      tinte: 'rgba(30,20,100,0.3)',
      camara: { zoom: 1.4, x: 470, y: 230, hasta: { zoom: 1, x: 480 }, t: 0.6, dur: 3 },
      actores: [
        { quien: 'director', x: 380, facing: 1, pose: 'win' },
        { quien: 'falcon', x: 470, facing: -1, pose: 'win' },
        { quien: 'secuaz', x: 600, facing: -1, bueno: true }
      ],
      efectos: [
        { tipo: 'rayos', x: 480, y: 220, color: '#fde68a' },
        { tipo: 'corazones', x: 480, y: 220, cantidad: 5 },
        { tipo: 'fuegos', cantidad: 3 }
      ]
    },

    // 7 · Juanjo: "…pero no todos sus robots se volvieron buenos."
    // Cielo de noche: unos drones y robots pequeños se escapan a lo lejos...
    {
      fondo: 'cielo',
      transicion: 'fundido',
      tinte: 'rgba(15,10,50,0.6)',
      vineta: 1.5,
      camara: { zoom: 1.12, x: 560, y: 190, hasta: { zoom: 1, x: 420 }, t: 0.4, dur: 4.5 },
      actores: [
        { quien: 'dronEnjambre', alias: 'e1', x: 760, y: 250, escala: 0.6, facing: -1,
          acciones: [{ accion: 'volar', t: 0.3, hasta: { x: -40, y: 30 }, dur: 4.5 }] },
        { quien: 'dronEnjambre', alias: 'e2', x: 860, y: 210, escala: 0.5, facing: -1,
          acciones: [{ accion: 'volar', t: 0.7, hasta: { x: 60, y: -30 }, dur: 4.8 }] },
        { quien: 'dronPicado', alias: 'e3', x: 700, y: 300, escala: 0.55, facing: -1,
          acciones: [{ accion: 'volar', t: 0.1, hasta: { x: -60, y: 80 }, dur: 4 }] },
        { quien: 'boxeador', alias: 'e4', x: 880, y: 320, escala: 0.5, facing: -1, jetpack: true, llama: 1,
          acciones: [{ accion: 'volar', t: 1.0, hasta: { x: 120, y: -40 }, dur: 5 }] },
        { quien: 'dronEspia', alias: 'e5', x: 470, y: 200, escala: 1, escaneando: true, facing: -1,
          acciones: [
            { accion: 'flotar', altura: 5, dur: 2.4 },
            { accion: 'mirar', t: 1.3, mirar: 'derecha' },
            { accion: 'mirar', t: 2.2, mirar: 'izquierda' },
            { accion: 'volar', t: 2.6, hasta: { x: -40, y: 40 }, dur: 2.2 }
          ] }
      ],
      efectos: [
        { tipo: 'destellos', x: 480, y: 120, radio: 400, cantidad: 10, tam: 1 }
      ],
      textos: [
        { estilo: 'bocadillo', texto: '...', a: 'e5', t: 1.4, dur: 1.1, tam: 20 }
      ]
    }
  ] });
})();
