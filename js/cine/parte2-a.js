// =============================================================================
// parte2-a.js — Historias animadas de la Parte 2 (primera mitad):
//   s2_cap1 (7 líneas) · s2_tras1 (8) · s2_cap2 (6) · s2_tras2 (6) · s2_cap3 (6)
// Manual: docs/cine-api.md · Ejemplo de calidad: js/cine/s_captura.js
//
// Un plano por cada línea de G.storyData (js/p2/historia2.js), en el mismo orden.
//   · La ACCIÓN va en y = 0…345 (el panel de diálogo tapa lo de abajo).
//   · Pies en y = 330. Mismo fondo + 'corte' = continuidad (mismos alias).
//   · Para nombrar actores, "alias" (nunca la clave "id").
//   · Sin sangre: los robots hacen "pop"; a los malos se les vence sin daño.
// =============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  if (!G.cine || typeof G.cine.register !== 'function') return;

  var ROJO = 'rgba(244,63,94,0.9)';

  // ===========================================================================
  // s2_cap1 — "La gema robada" (7 líneas). Sala del trono → la ciudad.
  // ===========================================================================
  G.cine.register('s2_cap1', { planos: [

    // ---- 0 · Juanjo: "Dark Toros había caído y la Gema del Poder se apagó..." --
    // La sala del trono tras la batalla: Toros derrotado y mareado, los héroes
    // celebran... y la cámara se acerca despacio a la gema, apagada en el suelo.
    {
      fondo: 'trono',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.35, x: 640, y: 220 }, t: 1.4, dur: 2.6 },
      actores: [
        { quien: 'toros', x: 460, facing: -1, pose: 'defeated' },
        { quien: 'director', x: 190, accion: 'celebrar', altura: 14 },
        { quien: 'falcon', x: 290, acciones: [{ accion: 'celebrar', t: 0.25, altura: 18 }] },
        { quien: 'gemaPoder', alias: 'gema', x: 760, escala: 0.75 }
      ],
      efectos: [
        { tipo: 'estrellas', a: 'toros', en: 'cabeza', dy: 10 },
        { tipo: 'confeti', dur: 2.4, cantidad: 40 }
      ],
      textos: [
        { texto: '¡HURRA!', x: 240, y: 110, t: 0.3, dur: 1.6, tam: 44 }
      ],
      sonido: [{ nombre: 'victory', t: 0.2 }]
    },

    // ---- 1 · Papá: "Pero la gema solo parecía apagada. Seguía viva..." ------
    // Plano detalle de la gema: todo se oscurece y un brillo rojo late despacito.
    {
      fondo: 'trono',
      tinte: 'rgba(20,0,30,0.35)',
      vineta: 1.6,
      camara: { zoom: 2.6, a: 'gema', dy: -10, hasta: { zoom: 2.2 }, t: 0.5, dur: 3 },
      actores: [
        { quien: 'toros', x: 460, facing: -1, pose: 'defeated' },
        { quien: 'director', x: 190 },
        { quien: 'falcon', x: 290 },
        { quien: 'gemaPoder', alias: 'gema', x: 760, escala: 0.75,
          acciones: [{ accion: 'brillar', t: 0.8, color: ROJO, fuerza: 1.1 }] }
      ],
      efectos: [
        { tipo: 'brillo', a: 'gema', t: 0.8, radio: 70, color: 'rgba(244,63,94,0.55)' },
        { tipo: 'onda', a: 'gema', t: 1.0, radio: 70, repetir: 1.2, dur: 30 }
      ],
      textos: [
        { texto: 'TUM... TUM...', x: 600, y: 238, t: 1.2, tam: 22, color: '#fecdd3', borde: '#9f1239', rot: 0.05 }
      ],
      sonido: [{ nombre: 'pickup', t: 1.0 }]
    },

    // ---- 2 · Juanjo: "Entonces, del suelo asomó un enorme puño de acero..." ----
    // ¡CRAAC! Junto a la gema sale del suelo un puño gigante (el robot sigue
    // escondido fuera de la imagen). Los héroes, del susto, dan un salto.
    {
      fondo: 'trono',
      camara: { zoom: 1.1, x: 524, hasta: { zoom: 1.3, x: 760, y: 230 }, t: 1.5, dur: 0.9 },   // ¡zoom al puño!
      actores: [
        { quien: 'toros', x: 460, facing: -1, pose: 'defeated' },
        { quien: 'director', x: 190, acciones: [{ accion: 'asustarse', t: 1.0 }] },
        { quien: 'falcon', x: 290, acciones: [{ accion: 'asustarse', t: 0.9 }] },
        { quien: 'gemaPoder', alias: 'gema', x: 760, escala: 0.75,
          acciones: [{ accion: 'brillar', color: ROJO }] },
        // el robot queda casi fuera de la imagen: solo se ve su PUÑO
        { quien: 'secuaz', alias: 'puno', x: 1000, y: 430, escala: 1.8, facing: -1, z: 1,
          acciones: [{ accion: 'levantarse', t: 0.3, dur: 1.6 }] }
      ],
      efectos: [
        { tipo: 'lineasAccion', a: 'puno', t: 0.6, alpha: 0.4 }
      ],
      textos: [
        { texto: '¡CRAAAC!', x: 420, y: 90, t: 0.35, dur: 1.6, tam: 52, estallido: true }
      ]
    },

    // ---- 3 · Papá: "Agarró la gema y se hundió bajo tierra... ¡rumbo a la ciudad!"
    {
      fondo: 'trono',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'toros', x: 460, facing: -1, pose: 'defeated' },
        { quien: 'director', x: 190, pose: 'hurt' },
        { quien: 'falcon', x: 290, pose: 'hurt' },
        { quien: 'gemaPoder', alias: 'gema', x: 760, escala: 0.75, z: 2,
          acciones: [
            { accion: 'brillar', color: ROJO },
            { accion: 'volar', t: 0.2, hasta: { x: 900, y: 292 }, dur: 0.45 },
            { accion: 'hundirse', t: 1.0, dur: 1.4 }
          ] },
        { quien: 'secuaz', alias: 'puno', x: 1000, y: 430, escala: 1.8, facing: -1, z: 1,
          acciones: [{ accion: 'hundirse', t: 1.0, dur: 1.4 }] }
      ],
      efectos: [
        { tipo: 'polvo', x: 880, y: 330, t: 2.4 },
        { tipo: 'humo', x: 880, y: 330, t: 2.4, alto: 90, cantidad: 4, alpha: 0.5 }
      ],
      textos: [
        { texto: '¡ZAS!', x: 780, y: 160, t: 0.3, dur: 0.8, tam: 44 },
        { texto: '¡BRRRUM!', x: 700, y: 110, t: 1.1, dur: 1.6, tam: 46 },
        { estilo: 'titulo', texto: '¡RUMBO A LA CIUDAD!', x: 480, y: 70, t: 2.6, tam: 40, pantalla: true }
      ]
    },

    // ---- 4 · Falcon: "¡Se ha llevado la gema! ¿Y ahora qué hacemos?" -------
    {
      fondo: 'trono',
      camara: { zoom: 1.6, a: 'falcon', dx: 60, dy: -20 },
      actores: [
        { quien: 'director', x: 190 },
        { quien: 'falcon', x: 290, facing: 1,
          acciones: [{ accion: 'temblar', t: 0, dur: 0.5, fuerza: 0.6 }],
          bocadillo: '?', bocadilloT: 0.6 }
      ],
      efectos: [
        { tipo: 'humo', x: 880, y: 330, alto: 90, cantidad: 4, alpha: 0.4 }
      ]
    },

    // ---- 5 · Director: "Lo que mejor sabemos hacer, amigo: recuperarla juntos..."
    {
      fondo: 'trono',
      camara: { zoom: 1.3, x: 330, y: 230, hasta: { zoom: 1.15, x: 420 }, t: 1.4, dur: 2 },
      actores: [
        { quien: 'director', x: 260, facing: 1,
          acciones: [
            { accion: 'senalar', t: 0.4, hasta: { x: 900, y: 220 }, dur: 2.2 },
            { accion: 'cambiar', t: 2.6, cambia: { pose: 'win' } }
          ] },
        { quien: 'falcon', x: 380, facing: -1,
          acciones: [
            { accion: 'mirar', t: 0.9, mirar: 'derecha' },
            { accion: 'celebrar', t: 2.6, altura: 14 }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', x: 320, y: 270, t: 2.6, color: '#fde68a' },
        { tipo: 'destellos', x: 320, y: 220, t: 2.6, radio: 120, cantidad: 8 }
      ],
      textos: [
        { texto: '¡VAMOS!', x: 520, y: 110, t: 2.7, tam: 48 }
      ],
      sonido: [{ nombre: 'checkpoint', t: 2.6 }]
    },

    // ---- 6 · Juanjo: "Pero al llegar, la ciudad estaba llena de robots..." ---
    {
      fondo: 'ciudad',
      transicion: 'pagina',
      camara: { zoom: 1.2, x: 640, hasta: { zoom: 1, x: 480 }, t: 0.6, dur: 2.4 },
      actores: [
        { quien: 'boxeador', x: 620, facing: -1, pose: 'attack' },
        { quien: 'robotEscudo', x: 780, facing: -1 },
        { quien: 'dronEnjambre', alias: 'dron1', x: 560, y: 150, facing: -1, accion: 'flotar' },
        { quien: 'dronEnjambre', alias: 'dron2', x: 660, y: 110, facing: -1 },
        { quien: 'dronRayo', x: 840, y: 170, facing: -1, cargando: true },
        { quien: 'director', x: 180, accion: 'entrar', desde: 'izquierda', t: 2.0, dur: 0.7, arco: 90 },
        { quien: 'falcon', x: 280, acciones: [{ accion: 'entrar', desde: 'izquierda', t: 2.2, dur: 0.7, arco: 110 }, { accion: 'cambiar', t: 3.0, cambia: { pose: 'shoot' } }] }
      ],
      efectos: [
        { tipo: 'alarma', dur: 2.0, alpha: 0.5 },
        { tipo: 'humo', x: 900, y: 330, alto: 160, alpha: 0.5 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'En la ciudad...', t: 0.35 },
        { texto: '¡BZZZ!', x: 610, y: 70, t: 0.6, dur: 1.5, tam: 36 },
        { estilo: 'titulo', texto: '¡AL RESCATE, HÉROES!', x: 480, y: 64, t: 2.6, tam: 42, pantalla: true }
      ],
      sonido: [{ nombre: 'robot', t: 0.4 }, { nombre: 'jump', t: 2.0 }]
    }
  ] });

  // ===========================================================================
  // s2_tras1 — "¡Era un robot gigante!" (8 líneas). La ciudad.
  // ===========================================================================
  G.cine.register('s2_tras1', { planos: [

    // ---- 0 · Papá: "Los robots de la ciudad hicieron ¡pop! uno tras otro..." ---
    {
      fondo: 'ciudad',
      transicion: 'fundido',
      camara: { zoom: 1.1, x: 520 },
      actores: [
        { quien: 'director', x: 200, pose: 'attack' },
        { quien: 'falcon', x: 300,
          acciones: [
            { accion: 'disparar', t: 0.2, a: 'boxeador', veces: 2, cada: 0.5 },
            { accion: 'asustarse', t: 2.6 }
          ] },
        { quien: 'boxeador', x: 560, facing: -1, accion: 'pop', t: 0.6 },
        { quien: 'robotEscudo', x: 700, facing: -1, accion: 'pop', t: 1.2 },
        { quien: 'dronEnjambre', x: 820, y: 160, facing: -1, accion: 'pop', t: 1.8 }
      ],
      efectos: [
        { tipo: 'temblor', t: 2.5, dur: 30, fuerza: 0.35 },
        { tipo: 'polvo', x: 600, y: 330, t: 2.5, repetir: 0.5, dur: 20 }
      ],
      textos: [
        { texto: '¡POP!', x: 560, y: 150, t: 0.65, dur: 0.6, tam: 44 },
        { texto: '¡POP!', x: 700, y: 120, t: 1.25, dur: 0.6, tam: 44 },
        { texto: '¡POP!', x: 820, y: 80, t: 1.85, dur: 0.6, tam: 44 },
        { texto: '¡BRRRR...!', x: 620, y: 110, t: 2.6, tam: 40, color: '#e2e8f0', borde: '#475569' }
      ],
      sonido: [{ nombre: 'press', t: 2.5 }]
    },

    // ---- 1 · Juanjo: "¡CRAAAC! Las viejas torretas de Dark Toros se movieron..."
    {
      fondo: 'ciudad',
      camara: { zoom: 1.25, x: 600, y: 240, temblor: 0.25 },
      actores: [
        { quien: 'director', x: 260, pose: 'hurt' },
        { quien: 'falcon', x: 340, pose: 'hurt' },
        { quien: 'torreta', alias: 'tor1', x: 520, facing: -1, angulo: -1.4,
          acciones: [{ accion: 'animar', t: 0.6, props: { angulo: [-1.4, 0.2] }, dur: 0.6 }, { accion: 'temblar', t: 0.6, fuerza: 0.5 }] },
        { quien: 'torreta', alias: 'tor2', x: 640, facing: -1, angulo: -1.4,
          acciones: [{ accion: 'animar', t: 0.6, props: { angulo: [-1.4, 0.2] }, dur: 0.6 }, { accion: 'temblar', t: 0.6, fuerza: 0.5 }] },
        { quien: 'torreta', alias: 'tor3', x: 760, facing: -1, angulo: -1.4,
          acciones: [{ accion: 'animar', t: 0.6, props: { angulo: [-1.4, 0.2] }, dur: 0.6 }, { accion: 'temblar', t: 0.6, fuerza: 0.5 }] }
      ],
      efectos: [
        { tipo: 'lineasAccion', x: 640, y: 300, t: 0.5, alpha: 0.35 },
        { tipo: 'polvo', x: 640, y: 330, t: 0.2, repetir: 0.7, dur: 20 }
      ],
      textos: [
        { texto: '¡CRAAAC!', x: 640, y: 120, t: 0.15, dur: 1.4, tam: 56, estallido: true },
        { texto: '¡CLIC, CLIC, CLIC!', x: 640, y: 160, t: 1.4, tam: 30, color: '#fecaca', borde: '#991b1b' }
      ],
      sonido: [{ nombre: 'robot', t: 0.6 }]
    },

    // ---- 2 · Papá: "¡No eran torretas normales! Eran la cabeza de un robot..." ---
    // LA REVELACIÓN: primer plano de la torreta central... que sube, y sube, y
    // sube: ¡es la cabeza de un robot gigante que se levanta del suelo! La
    // cámara se aleja para enseñarlo entero mientras los héroes se asustan.
    {
      fondo: 'ciudad',
      continuidad: false,
      camara: { zoom: 2.3, x: 640, y: 290, hasta: { zoom: 1, x: 480 }, t: 1.0, dur: 2.2 },
      actores: [
        { quien: 'director', x: 200, acciones: [{ accion: 'asustarse', t: 2.2 }] },
        { quien: 'falcon', x: 290, acciones: [{ accion: 'asustarse', t: 2.0 }] },
        { quien: 'secuaz', x: 640, escala: 1.2, facing: -1,
          acciones: [
            { accion: 'levantarse', t: 0.2, dur: 3.0 },
            { accion: 'brillar', t: 3.2, color: 'rgba(239,68,68,0.6)' }
          ] }
      ],
      efectos: [
        { tipo: 'lineasAccion', a: 'secuaz', t: 1.2, dur: 2.4, alpha: 0.45 },
        { tipo: 'flash', t: 3.2, color: '#fecaca' },
        { tipo: 'onda', x: 640, y: 330, t: 3.2, radio: 220 }
      ],
      textos: [
        { texto: '¡RRRUUUMMM!', x: 400, y: 150, t: 1.3, dur: 1.8, tam: 40, estallido: '#fee2e2', color: '#ef4444', borde: '#7f1d1d' },
        { texto: '¡¿QUÉÉÉ?!', x: 250, y: 120, t: 2.3, tam: 34, color: '#e0f2fe', borde: '#0369a1' }
      ]
    },

    // ---- 3 · Secuaz: "¡Soy DARK SECUAZ, el que se llevó la gema!..." -------
    {
      fondo: 'ciudad',
      camara: { zoom: 1.3, a: 'secuaz', dx: 110, dy: -20 },
      actores: [
        { quien: 'director', x: 200, pose: 'hurt' },
        { quien: 'falcon', x: 290, pose: 'hurt' },
        { quien: 'secuaz', x: 640, escala: 1.2, facing: -1,
          acciones: [
            { accion: 'rugir', t: 0.4, dur: 1.4 },
            { accion: 'brillar', color: 'rgba(239,68,68,0.7)', fuerza: 1.2 }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', a: 'secuaz', color: '#fca5a5', alpha: 0.7 }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡DARK SECUAZ!', x: 780, y: 110, t: 0.5, tam: 40, color: '#f87171', borde: '#450a0a', pantalla: true }
      ]
    },

    // ---- 4 · Falcon: "¡Es enorme! Mira esos puños... y en su barriga brilla algo rojo."
    {
      fondo: 'ciudad',
      camara: { zoom: 1.5, a: 'falcon', dx: 120, dy: -30, hasta: { zoom: 2, a: 'secuaz', dy: 10 }, t: 1.6, dur: 1.8 },
      actores: [
        { quien: 'director', x: 200, pose: 'hurt' },
        { quien: 'falcon', x: 330,
          acciones: [{ accion: 'senalar', t: 0.3, a: 'secuaz' }],
          bocadillo: '!', bocadilloT: 0.2 },
        { quien: 'secuaz', x: 640, escala: 1.2, facing: -1 }
      ],
      efectos: [
        { tipo: 'brillo', a: 'secuaz', dy: 72, t: 2.6, radio: 60, color: 'rgba(244,63,94,0.85)', fuerza: 1.4, delante: true },
        { tipo: 'destellos', a: 'secuaz', dy: 72, t: 2.8, radio: 40, cantidad: 5, color: '#fda4af' }
      ]
    },

    // ---- 5 · Secuaz: "¡Adiós, heroecitos! ¡Mis robots se encargarán...! ¡JA, JA, JA!"
    {
      fondo: 'ciudad',
      camara: { zoom: 1.15, x: 520 },
      actores: [
        { quien: 'director', x: 200, pose: 'hurt' },
        { quien: 'falcon', x: 300, pose: 'hurt' },
        { quien: 'secuaz', x: 700, escala: 1.2, facing: -1,
          acciones: [{ accion: 'reir', t: 0.3, texto: '¡JA!' }] },
        { quien: 'boxeador', x: 470, facing: -1, accion: 'aparecer', t: 1.2 },
        { quien: 'dronEnjambre', alias: 'dronA', x: 420, y: 160, facing: -1, accion: 'aparecer', t: 1.5 },
        { quien: 'dronEnjambre', alias: 'dronB', x: 530, y: 120, facing: -1, accion: 'aparecer', t: 1.8 }
      ]
    },

    // ---- 6 · Juanjo: "Y Dark Secuaz salió corriendo, haciendo temblar la carretera..."
    {
      fondo: 'ciudad',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'director', x: 160, pose: 'attack' },
        { quien: 'falcon', x: 250, pose: 'shoot' },
        { quien: 'secuaz', x: 600, escala: 1.2, facing: 1,
          acciones: [{ accion: 'correr', t: 0.2, hasta: { x: 1150 }, dur: 3.6 }] }
      ],
      efectos: [
        { tipo: 'temblor', t: 0.4, fuerza: 0.7 }, { tipo: 'polvo', x: 680, y: 330, t: 0.4 },
        { tipo: 'temblor', t: 1.2, fuerza: 0.7 }, { tipo: 'polvo', x: 820, y: 330, t: 1.2 },
        { tipo: 'temblor', t: 2.0, fuerza: 0.7 }, { tipo: 'polvo', x: 960, y: 330, t: 2.0 }
      ],
      textos: [
        { texto: '¡PUM!', x: 680, y: 120, t: 0.4, dur: 0.7, tam: 46 },
        { texto: '¡PUM!', x: 820, y: 90, t: 1.2, dur: 0.7, tam: 46 },
        { texto: '¡PUM!', x: 900, y: 140, t: 2.0, dur: 0.9, tam: 46 }
      ],
      sonido: [{ nombre: 'hit', t: 0.4 }, { nombre: 'hit', t: 1.2 }, { nombre: 'hit', t: 2.0 }]
    },

    // ---- 7 · Director: "¿Adónde vas tan deprisa? Mi reloj ya te ha localizado..."
    {
      fondo: 'ciudad',
      camara: { zoom: 1.8, a: 'reloj', hasta: { zoom: 1.2, x: 480, y: 215 }, t: 1.2, dur: 2 },
      actores: [
        { quien: 'director', x: 330, pose: 'hack',
          acciones: [{ accion: 'senalar', t: 3.0, hasta: { x: 960, y: 200 } }] },
        { quien: 'falcon', x: 210, pose: 'idle' },
        { quien: 'reloj', x: 650, y: 300, escala: 1.15, texto: 'AUTOPISTA', senalX: 34, senalY: -20, color: '#f87171',
          acciones: [{ accion: 'flotar', altura: 6 }, { accion: 'brillar', color: 'rgba(34,211,238,0.8)' }] }
      ],
      efectos: [
        { tipo: 'senal', x: 690, y: 210, radio: 70, color: '#f87171' }
      ],
      textos: [
        { texto: '¡BIP, BIP!', x: 760, y: 110, t: 0.4, dur: 2.2, tam: 34, color: '#a7f3d0', borde: '#059669' }
      ],
      sonido: [{ nombre: 'checkpoint', t: 0.4 }]
    }
  ] });

  // ===========================================================================
  // s2_cap2 — "La carrera" (6 líneas). La autopista.
  // ===========================================================================
  G.cine.register('s2_cap2', { planos: [

    // ---- 0 · Papá: "En la autopista, un robot gigantesco les cerró el paso..." -
    {
      fondo: 'carretera',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.2, x: 560 }, t: 1.4, dur: 2 },
      actores: [
        { quien: 'director', x: 220, acciones: [{ accion: 'asustarse', t: 0.9 }] },
        { quien: 'falcon', x: 320, acciones: [{ accion: 'asustarse', t: 1.0 }] },
        { quien: 'robotTransformable', alias: 'robot', x: 700, facing: -1, enemigo: true, escala: 1.4,
          acciones: [{ accion: 'caer', t: 0.4, dur: 0.6 }] }
      ],
      efectos: [
        { tipo: 'onda', x: 700, y: 330, t: 1.0, radio: 170 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'En la autopista...', t: 0.3 },
        { texto: '¡PATAPUM!', x: 470, y: 120, t: 1.0, dur: 1.8, tam: 48, estallido: true }
      ],
      sonido: [{ nombre: 'hit', t: 1.0 }]
    },

    // ---- 1 · Director: "Ese robot se convierte en coche... Si lo hackeo..." --
    {
      fondo: 'carretera',
      camara: { zoom: 1.35, a: 'director', dx: 170, dy: -30 },
      actores: [
        { quien: 'director', x: 260, pose: 'hack', acciones: [{ accion: 'senalar', t: 0.4, a: 'robot' }] },
        { quien: 'falcon', x: 160 },
        { quien: 'robotTransformable', alias: 'robot', x: 700, facing: -1, enemigo: true, escala: 1.4 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: ['cocheTransformable', 'secuaz'], t: 1.2, lado: 'derecha' }
      ]
    },

    // ---- 2 · Juanjo: "Bip, bip, ¡CLIC! El robot se plegó con un ¡clac, clac, clac!..."
    {
      fondo: 'carretera',
      camara: { zoom: 1.15, x: 500 },
      actores: [
        { quien: 'director', x: 260, pose: 'hack',
          acciones: [{ accion: 'hackear', t: 0.2, a: 'robot', dur: 1.4, convierte: true }] },
        { quien: 'falcon', x: 160, acciones: [{ accion: 'celebrar', t: 3.0 }] },
        { quien: 'robotTransformable', alias: 'robot', x: 700, facing: -1, enemigo: true, escala: 1.4,
          acciones: [
            { accion: 'cambiar', t: 1.65, cambia: { enemigo: false }, destello: '#86efac' },   // ¡hackeado! ya es amigo
            { accion: 'transformar', t: 2.0, dur: 0.9, en: 'cocheTransformable', cambia: { escala: 1.1, facing: 1 } }
          ] }
      ],
      textos: [
        { texto: 'BIP, BIP...', x: 470, y: 120, t: 0.3, dur: 1.3, tam: 30, color: '#a7f3d0', borde: '#059669' },
        { texto: '¡CLIC!', x: 560, y: 90, t: 1.6, dur: 0.8, tam: 46, color: '#bbf7d0', borde: '#15803d' },
        { texto: '¡CLAC, CLAC, CLAC!', x: 700, y: 140, t: 2.1, tam: 38 }
      ]
    },

    // ---- 3 · Falcon: "¡Yo me subo al techo! Tú conduce..." ------------------
    {
      fondo: 'carretera',
      camara: { zoom: 1.3, x: 560, y: 230 },
      actores: [
        { quien: 'director', x: 260, acciones: [{ accion: 'caminar', t: 0.3, hasta: { x: 640 }, dur: 1.4 }, { accion: 'desaparecer', t: 1.75, dur: 0.3 }] },
        { quien: 'falcon', x: 160, acciones: [
          { accion: 'saltar', t: 0.6, hasta: { x: 720, y: 282 }, altura: 120, dur: 1.0 },
          { accion: 'cambiar', t: 1.7, cambia: { pose: 'shoot' } }] },
        { quien: 'cocheTransformable', alias: 'robot', x: 700, escala: 1.1 }
      ],
      textos: [
        { texto: '¡HOP!', x: 520, y: 100, t: 0.9, dur: 0.8, tam: 40 }
      ]
    },

    // ---- 4 · Director: "¡Agárrate fuerte, amigo! ¡Turbo a tope!" ------------
    {
      fondo: 'carretera',
      fondoVel: 900,
      camara: { zoom: 1.35, a: 'robot', dy: -50 },
      actores: [
        { quien: 'cocheTransformable', alias: 'robot', x: 480, escala: 1.1, turbo: true, acciones: [{ accion: 'temblar', fuerza: 0.5 }] },
        { quien: 'falcon', x: 500, y: 282, pose: 'hurt', acciones: [{ accion: 'temblar', fuerza: 0.6 }] }
      ],
      efectos: [
        { tipo: 'velocidad', t: 0.3 },
        { tipo: 'flash', t: 0.3, color: '#e0f2fe' }
      ],
      textos: [
        { texto: '¡TURBO!', x: 380, y: 120, t: 0.4, tam: 52, estallido: '#bae6fd', color: '#38bdf8', borde: '#0c4a6e' }
      ],
      sonido: [{ nombre: 'boost', t: 0.3 }]
    },

    // ---- 5 · Papá: "¡A toda velocidad tras Dark Secuaz! Esquiva los obstáculos..."
    {
      fondo: 'carretera',
      fondoVel: 700,
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'cocheTransformable', alias: 'robot', x: 300, escala: 1.1, turbo: true,
          acciones: [{ accion: 'saltar', t: 1.3, altura: 110, dur: 0.8 }] },
        { quien: 'falcon', x: 320, y: 282, pose: 'shoot',
          acciones: [{ accion: 'saltar', t: 1.3, altura: 110, dur: 0.8 }, { accion: 'disparar', t: 2.4, a: 'dronPicado' }] },
        { quien: 'dronPicado', x: 760, y: 300, facing: -1, angulo: 0.3,
          acciones: [{ accion: 'volar', t: 0.3, hasta: { x: -100, y: 300 }, dur: 2.4 }] },
        { quien: 'secuaz', x: 880, escala: 0.45, accion: 'caminar', hasta: { x: 920 }, dur: 6 }
      ],
      efectos: [
        { tipo: 'velocidad', alpha: 0.6 }
      ],
      textos: [
        { texto: '¡ZUUUM!', x: 330, y: 110, t: 1.4, dur: 1.2, tam: 44 },
        { estilo: 'bocadillo', texto: '¡JA, JA!', a: 'secuaz', t: 2.6, tam: 20 }
      ]
    }
  ] });


  // ===========================================================================
  // s2_tras2 — "La fábrica" (6 líneas). Autopista → por fuera de la fábrica
  // (la ciudad, con humo de chimeneas y una puerta enorme).
  // ===========================================================================
  function humoFabrica() {   // lista nueva cada vez (cada plano tiene la suya)
    return [
    // dos "chimeneas" escondidas detrás del portón de la fábrica: el humo
    // (que se dibuja detrás de los actores) asoma por encima del marco
    { tipo: 'humo', x: 655, y: 120, alto: 170, cantidad: 14, alpha: 1, color: '#334155' },
    { tipo: 'humo', x: 785, y: 120, alto: 170, cantidad: 14, alpha: 1, color: '#334155' },
    { tipo: 'chispas', x: 655, y: 72, repetir: 0.7, dur: 60, color: '#fb923c' },
    { tipo: 'chispas', x: 785, y: 72, t: 0.35, repetir: 0.9, dur: 60, color: '#fde047' }
    ];
  }
  var TINTE_FABRICA = 'rgba(120,53,15,0.16)';

  G.cine.register('s2_tras2', { planos: [

    // ---- 0 · Juanjo: "Con un último acelerón, los héroes vieron a Dark Secuaz a lo lejos."
    {
      fondo: 'carretera',
      transicion: 'fundido',
      fondoVel: 800,
      camara: { zoom: 1.3, a: 'robot', dx: 60, dy: -50, hasta: { zoom: 1.6, a: 'secuaz', dy: -10 }, t: 1.6, dur: 1.8 },
      actores: [
        { quien: 'cocheTransformable', alias: 'robot', x: 300, escala: 1.1, turbo: true, acciones: [{ accion: 'temblar', fuerza: 0.4 }] },
        { quien: 'falcon', x: 320, y: 282, acciones: [{ accion: 'senalar', t: 0.6, a: 'secuaz' }] },
        { quien: 'secuaz', x: 860, escala: 0.5,
          acciones: [{ accion: 'caminar', hasta: { x: 900 }, dur: 6 }] }
      ],
      efectos: [
        { tipo: 'velocidad', alpha: 0.7 }
      ],
      textos: [
        { texto: '¡BRRRUUUM!', x: 330, y: 110, t: 0.2, dur: 1.4, tam: 44 },
        { estilo: 'bocadillo', texto: '¡Allí está!', a: 'falcon', t: 0.8, dur: 1.6, tam: 24 }
      ],
      sonido: [{ nombre: 'boost', t: 0.2 }]
    },

    // ---- 1 · Papá: "Iba directo a un edificio enorme, con chimeneas que echaban humo y chispas."
    // Se pasa la página: humo y chispas que suben de las chimeneas; la cámara
    // baja hasta la puerta gigante, adonde camina Dark Secuaz.
    {
      fondo: 'ciudad',
      transicion: 'pagina',
      tinte: TINTE_FABRICA,
      camara: { zoom: 1.15, x: 330, y: 185, hasta: { zoom: 1, x: 480, y: 172 }, t: 1.0, dur: 2.4 },
      actores: [
        { quien: 'puerta', x: 720, estilo: 'fabrica', escala: 1.1 },
        { quien: 'secuaz', x: 330, escala: 0.8, acciones: [{ accion: 'caminar', t: 0.6, hasta: { x: 560 }, dur: 3 }] }
      ],
      efectos: humoFabrica(),
      textos: [
        { estilo: 'cartel', texto: 'Un poco más adelante...', t: 0.3 },
        { estilo: 'titulo', texto: 'FÁBRICA DE ROBOTS', x: 720, y: 52, t: 1.2, tam: 28, color: '#fde68a', borde: '#334155' },
        { texto: '¡CHUF, CHUF!', x: 520, y: 110, t: 0.6, dur: 2.0, tam: 34, color: '#e2e8f0', borde: '#475569' }
      ]
    },

    // ---- 2 · Director: "Es una fábrica de robots. ¡Ahí construye a todo su ejército!"
    {
      fondo: 'ciudad',
      tinte: TINTE_FABRICA,
      continuidad: false,
      camara: { zoom: 1.45, a: 'director', dx: 90, dy: -30 },
      actores: [
        { quien: 'director', x: 300, acciones: [{ accion: 'senalar', t: 0.4, hasta: { x: 800, y: 200 } }] },
        { quien: 'falcon', x: 190, acciones: [{ accion: 'asustarse', t: 1.4 }] }
      ],
      efectos: humoFabrica(),
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: ['boxeador', 'robotEscudo', 'dronEnjambre'], t: 1.0, lado: 'derecha' }
      ]
    },

    // ---- 3 · Secuaz: "¡Bienvenidos a mi fábrica! Aquí dentro mis robots son súper fuertes..."
    {
      fondo: 'ciudad',
      tinte: TINTE_FABRICA,
      continuidad: false,
      camara: { zoom: 1.2, x: 640, hasta: { zoom: 1.3, x: 680 }, t: 0.5, dur: 3 },
      actores: [
        { quien: 'puerta', x: 720, estilo: 'fabrica', escala: 1.25, abierta: 1, z: -2, luz: '#f97316' },
        { quien: 'secuaz', x: 720, facing: -1, escala: 0.95, z: -1,
          acciones: [{ accion: 'reir', t: 0.3, texto: '¡JA!' }] },
        { quien: 'boxeador', x: 530, facing: -1, accion: 'saltar', t: 0.8, veces: 3, altura: 40 },
        { quien: 'robotEscudo', x: 900, facing: -1 }
      ],
      efectos: [
        { tipo: 'brillo', x: 720, y: 220, radio: 160, color: 'rgba(249,115,22,0.6)' }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡BIENVENIDOS!', x: 480, y: 56, t: 0.5, tam: 40, color: '#fca5a5', borde: '#450a0a', pantalla: true }
      ]
    },

    // ---- 4 · Juanjo: "Las enormes puertas se cerraron tras él con un ¡CLONC! metálico."
    // Dark Secuaz se mete dentro (se hace pequeño en la oscuridad) y las dos
    // hojas se cierran de golpe.
    {
      fondo: 'ciudad',
      tinte: TINTE_FABRICA,
      camara: { zoom: 1.15, x: 680, y: 190 },
      actores: [
        { quien: 'puerta', x: 720, estilo: 'fabrica', escala: 1.25, abierta: 1, z: -2, luz: '#f97316',
          acciones: [{ accion: 'cerrar', t: 1.3, dur: 0.9 }] },
        { quien: 'secuaz', x: 720, facing: -1, escala: 0.95, z: -1,
          acciones: [
            { accion: 'encoger', t: 0.2, factor: 0.55, dur: 1.0 },
            { accion: 'desaparecer', t: 1.1, dur: 0.3, color: '#f97316' }
          ] }
      ],
      efectos: [
        { tipo: 'temblor', t: 2.2, fuerza: 0.8 },
        { tipo: 'polvo', x: 640, y: 330, t: 2.2 },
        { tipo: 'polvo', x: 800, y: 330, t: 2.2 }
      ],
      textos: [
        { texto: '¡CLONC!', x: 470, y: 170, t: 2.2, tam: 54, estallido: true, color: '#e2e8f0', borde: '#334155' }
      ]
    },

    // ---- 5 · Falcon: "Pues habrá que entrar. ¡Juntos, como siempre!" ---------
    {
      fondo: 'ciudad',
      tinte: TINTE_FABRICA,
      camara: { zoom: 1.2, x: 440, y: 230, hasta: { zoom: 1.35, x: 400 }, t: 0.5, dur: 2.5 },
      actores: [
        { quien: 'puerta', x: 720, estilo: 'fabrica', escala: 1.25, abierta: 0, z: -2 },
        { quien: 'director', x: 300, facing: 1, acciones: [{ accion: 'mirar', t: 1.0, mirar: 'falcon' }, { accion: 'celebrar', t: 2.0 }] },
        { quien: 'falcon', x: 420, facing: -1, acciones: [{ accion: 'celebrar', t: 0.4, altura: 14 }] }
      ],
      efectos: [
        { tipo: 'rayos', x: 360, y: 260, t: 1.8, color: '#fde68a' },
        { tipo: 'destellos', x: 360, y: 220, t: 1.8, radio: 110, cantidad: 8 }
      ],
      textos: [
        { texto: '¡JUNTOS!', x: 360, y: 90, t: 2.0, tam: 50 }
      ]
    }
  ] });

  // ===========================================================================
  // s2_cap3 — "La fábrica de robots" (6 líneas). Dentro de la fábrica.
  // ===========================================================================
  G.cine.register('s2_cap3', { planos: [

    // ---- 0 · Papá: "Dentro de la fábrica todo se movía: cintas transportadoras..."
    // Los héroes entran boquiabiertos: robots a medio hacer pasan por la cinta,
    // las prensas golpean (¡CLANC!) y saltan chispas.
    {
      fondo: 'fabrica',
      transicion: 'fundido',
      camara: { zoom: 1.1, x: 520, hasta: { zoom: 1.15, x: 560 }, t: 1.0, dur: 3 },
      actores: [
        { quien: 'director', x: 200, accion: 'entrar', desde: 'izquierda', dur: 0.8 },
        { quien: 'falcon', x: 300, acciones: [{ accion: 'entrar', desde: 'izquierda', dur: 0.8 }], bocadillo: '!', bocadilloT: 1.0 },
        { quien: 'robotEscudo', alias: 'cinta1', x: 470, escala: 0.75, mudo: true, acciones: [{ accion: 'caminar', hasta: { x: 1200 }, dur: 14 }] },
        { quien: 'miniTorreta', alias: 'cinta2', x: 620, acciones: [{ accion: 'caminar', hasta: { x: 1390 }, dur: 14 }] },
        { quien: 'boxeador', alias: 'cinta3', x: 820, escala: 0.85, acciones: [{ accion: 'caminar', hasta: { x: 1590 }, dur: 14 }] }
      ],
      efectos: [
        { tipo: 'chispas', x: 300, y: 150, repetir: 0.8, dur: 40, color: '#fde047' },
        { tipo: 'chispas', x: 800, y: 120, t: 0.4, repetir: 1.0, dur: 40, color: '#fb923c' },
        { tipo: 'temblor', t: 1.0, fuerza: 0.4 },
        { tipo: 'temblor', t: 2.8, fuerza: 0.4 }
      ],
      textos: [
        { texto: '¡CLANC!', x: 760, y: 90, t: 1.0, dur: 0.9, tam: 42 },
        { texto: '¡ZZT!', x: 300, y: 100, t: 0.6, dur: 0.8, tam: 34, color: '#fef08a', borde: '#ca8a04' },
        { texto: '¡CLANC!', x: 520, y: 80, t: 2.8, dur: 0.9, tam: 42 }
      ],
      sonido: [{ nombre: 'press', t: 1.0 }, { nombre: 'press', t: 2.8 }]
    },

    // ---- 1 · Falcon: "¡Cuidado con las prensas! Cuando tiemblan y sale un «!»..."
    // La prensa está justo encima, fuera de la imagen: el techo tiembla, caen
    // chispas, sale el «!»... y ¡PAM!, el golpe levanta polvo justo delante de
    // los héroes, que dan un salto atrás. Falcon lo señala: ¡ahí no!
    {
      fondo: 'fabrica',
      camara: { zoom: 1.2, x: 520, y: 200, temblor: 0.12 },
      actores: [
        // La prensa: un bloque gris de fábrica con bandas amarillas que cuelga
        // del techo, tiembla, baja de golpe (¡PAM!) y vuelve a subir.
        { quien: 'puerta', alias: 'prensa', estilo: 'fabrica', x: 640, y: 175, escala: 0.65, z: -1, mudo: true,
          acciones: [
            { accion: 'temblar', t: 0.5, dur: 1.85, fuerza: 0.6 },
            { accion: 'volar', t: 2.35, hasta: { x: 640, y: 330 }, dur: 0.12 },
            { accion: 'volar', t: 3.4, hasta: { x: 640, y: 175 }, dur: 0.8 }
          ] },
        { quien: 'director', x: 280, acciones: [{ accion: 'asustarse', t: 2.5 }] },
        { quien: 'falcon', x: 380,
          acciones: [{ accion: 'senalar', t: 0.4, a: 'prensa', dur: 1.9 }, { accion: 'asustarse', t: 2.5 }] }
      ],
      efectos: [
        { tipo: 'chispas', x: 640, y: 60, t: 0.5, repetir: 0.35, dur: 1.8, color: '#fde047' },
        { tipo: 'temblor', t: 0.5, dur: 1.8, fuerza: 0.35 },
        { tipo: 'lineasAccion', x: 640, y: 300, t: 2.4, dur: 0.6 },
        { tipo: 'flash', t: 2.45, color: '#fef9c3' },
        { tipo: 'polvo', x: 640, y: 330, t: 2.45, cantidad: 16, tam: 1.6 },
        { tipo: 'onda', x: 640, y: 330, t: 2.45, radio: 160 },
        { tipo: 'temblor', t: 2.45, fuerza: 0.9 },
        { tipo: 'estrellas', x: 640, y: 300, t: 2.8, cantidad: 3, radio: 40 }
      ],
      textos: [
        { estilo: 'bocadillo', texto: '!', x: 520, y: 110, t: 0.6, dur: 1.8, tam: 44 },
        { texto: 'TRRR...', x: 790, y: 90, t: 0.6, dur: 1.8, tam: 30, color: '#e2e8f0', borde: '#475569' },
        { texto: '¡PAM!', x: 660, y: 230, t: 2.45, dur: 1.4, tam: 56, estallido: true }
      ],
      sonido: [{ nombre: 'press', t: 2.45 }]
    },

    // ---- 2 · Director: "Y esas mini-torretas con patitas son como hijas de Dark Secuaz..."
    {
      fondo: 'fabrica',
      camara: { zoom: 1.3, x: 520, y: 220 },
      actores: [
        { quien: 'director', x: 300, pose: 'hack',
          acciones: [{ accion: 'hackear', t: 1.4, a: 'mini1', dur: 1.4, convierte: true }] },
        { quien: 'falcon', x: 200 },
        { quien: 'miniTorreta', alias: 'mini1', x: 600, facing: -1,
          acciones: [{ accion: 'mirar', t: 3.0, mirar: 'derecha' }, { accion: 'saltar', t: 3.1, veces: 2, altura: 26, dur: 0.45 }] },
        { quien: 'miniTorreta', alias: 'mini2', x: 730, facing: -1 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'mini2', dibujo: 'secuaz', t: 0.2, dur: 1.6, lado: 'izquierda' },
        { texto: '¡CLIC!', x: 600, y: 170, t: 2.8, dur: 1.0, tam: 40, color: '#bbf7d0', borde: '#15803d' }
      ]
    },

    // ---- 3 · Juanjo: "Robots araña en el techo, robots con escudo, boxeadores..."
    {
      fondo: 'fabrica',
      camara: { zoom: 1.5, x: 420, y: 120, hasta: { zoom: 1, x: 480, y: 172 }, t: 0.5, dur: 1.6 },
      actores: [
        { quien: 'robotArana', x: 420, y: 90, techo: true, acciones: [{ accion: 'temblar', fuerza: 0.3 }] },
        { quien: 'robotEscudo', x: 600, facing: -1, accion: 'entrar', desde: 'derecha', t: 1.0, dur: 0.8 },
        { quien: 'boxeador', x: 780, facing: -1, acciones: [{ accion: 'entrar', desde: 'derecha', t: 1.5, dur: 0.7 }, { accion: 'cambiar', t: 2.4, cambia: { pose: 'attack' } }] },
        { quien: 'director', x: 170, pose: 'hurt' },
        { quien: 'falcon', x: 270, pose: 'hurt' }
      ],
      textos: [
        { texto: '¡TIC, TIC, TIC!', x: 300, y: 60, t: 0.4, dur: 1.4, tam: 28, color: '#e9d5ff', borde: '#6b21a8' },
        { texto: '¡GRRR!', x: 780, y: 130, t: 2.5, tam: 40 }
      ]
    },

    // ---- 4 · Director: "Esta vez no hay naves, sino robots. Da igual: paso a paso..."
    {
      fondo: 'fabrica',
      camara: { zoom: 1.3, a: 'director', dx: 40, dy: -30 },
      actores: [
        { quien: 'director', x: 300, facing: 1, acciones: [{ accion: 'caminar', t: 1.8, hasta: { x: 420 }, dur: 1.4 }] },
        { quien: 'falcon', x: 200, facing: 1, acciones: [{ accion: 'caminar', t: 1.8, hasta: { x: 320 }, dur: 1.4 }] }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: ['naveEnemiga', 'boxeador'], t: 0.3, dur: 1.8, lado: 'derecha' },
        { texto: '¡PASO A PASO!', x: 420, y: 90, t: 2.2, tam: 36, color: '#bae6fd', borde: '#0369a1' }
      ]
    },

    // ---- 5 · Papá: "¡Adelante, héroes! Dark Secuaz os espera al fondo de la fábrica."
    {
      fondo: 'fabrica',
      tinte: 'rgba(15,10,40,0.18)',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'secuaz', x: 830, y: 300, escala: 0.5, facing: -1, z: -1, acciones: [{ accion: 'brillar', color: 'rgba(239,68,68,0.6)' }] },
        { quien: 'director', x: 200, acciones: [{ accion: 'correr', t: 0.5, hasta: { x: 470 }, dur: 1.2 }] },
        { quien: 'falcon', x: 110, acciones: [{ accion: 'correr', t: 0.6, hasta: { x: 370 }, dur: 1.2 }, { accion: 'celebrar', t: 2.0 }] }
      ],
      efectos: [
        { tipo: 'foco', a: 'secuaz', radio: 110, fuerza: 0.4, t: 0.2 }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡ADELANTE, HÉROES!', x: 480, y: 64, t: 1.4, tam: 42, pantalla: true }
      ]
    }
  ] });
})();
