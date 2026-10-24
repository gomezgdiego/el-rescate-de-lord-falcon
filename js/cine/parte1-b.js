// =============================================================================
// parte1-b.js — Historias animadas de la Parte 1 (segunda mitad):
//   s_infiltracion (4 líneas) · s_cap4 (4) · s_confrontacion (5) · s_cap5 (6) · s_final (7)
// Manual: docs/cine-api.md. Motor: js/cine.js. Ejemplo de calidad: js/cine/s_captura.js.
//
// Un plano por cada línea, en el mismo orden. Recuerda:
//   · La ACCIÓN va en y = 0…345 (el panel de diálogo tapa lo de abajo). Pies en y = 330.
//   · Mismo fondo + transición 'corte' = CONTINUIDAD (mismos nombres de actor).
//   · Para nombrar a un actor, "alias" (nunca la clave "id").
//   · Sin sangre: los robots y naves hacen "pop"; Dark Toros solo queda mareado/derrotado.
// =============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  if (!G.cine || typeof G.cine.register !== 'function') return;

  var ROJO_LUZ = 'rgba(248,113,113,0.55)';
  var GEMA_LUZ = 'rgba(244,63,94,0.9)';

  // ===========================================================================
  //  s_infiltracion — Tras la batalla espacial: la Nave Nodriza y la infiltración
  // ===========================================================================
  G.cine.register('s_infiltracion', { planos: [

    // ---- 0 · Narrador: "La flota estaba derrotada. Ante el Director se alzaba,
    //          gigantesca, la Nave Nodriza de Dark Toros."
    // Las dos últimas naves enemigas hacen ¡POP!... la cámara se aleja y revela,
    // enorme, la Nave Nodriza. La nave del Director, pequeñita, frente a ella.
    {
      fondo: 'espacio',
      transicion: 'fundido',
      camara: { zoom: 1.45, a: 'nave', dx: 60, hasta: { zoom: 1, x: 480, y: 172 }, t: 1.1, dur: 2.2 },
      actores: [
        { quien: 'naveNodriza', alias: 'nodriza', x: 680, y: 310, escala: 0.98, z: -1,
          acciones: [{ accion: 'flotar', altura: 5 }, { accion: 'brillar', t: 1.6, color: 'rgba(239,68,68,0.55)', fuerza: 1.2 }] },
        { quien: 'naveEnemiga', alias: 'ene1', x: 330, y: 130, tipo: 'small', accion: 'pop', t: 0.35 },
        { quien: 'naveEnemiga', alias: 'ene2', x: 430, y: 300, tipo: 'small', accion: 'pop', t: 0.75 },
        { quien: 'nave', x: 190, y: 240, escala: 0.75,
          acciones: [{ accion: 'flotar', altura: 6 }] }
      ],
      efectos: [
        { tipo: 'lineasAccion', a: 'nodriza', t: 2.4, radio: 260, alpha: 0.3 }
      ],
      textos: [
        { texto: '¡POP!', x: 330, y: 90, t: 0.4, dur: 0.8, tam: 40 },
        { texto: '¡POP!', x: 470, y: 240, t: 0.8, dur: 0.8, tam: 40, color: '#fef3c7', borde: '#f97316' },
        { estilo: 'titulo', texto: '¡GIGANTESCA!', x: 640, y: 50, t: 2.6, tam: 40, color: '#fca5a5', borde: '#7f1d1d' }
      ],
      sonido: [{ nombre: 'roar', t: 2.4 }]
    },

    // ---- 1 · Director: "Ahí dentro está Falcon. Aterrizaré en silencio y me
    //          infiltraré por los pasillos."
    // La nave del Director (él va dentro, a los mandos) se acerca despacito a
    // la Nodriza, apuntándola con su morro, y piensa en su amigo en la celda.
    {
      fondo: 'espacio',
      habla: 'nave',
      continuidad: false,
      vineta: 1.4,
      camara: { zoom: 1.3, x: 470, y: 205, hasta: { zoom: 1.4, x: 450 }, t: 0.5, dur: 3.0 },
      actores: [
        { quien: 'naveNodriza', alias: 'nodriza', x: 690, y: 230, escala: 0.42, z: -2,
          acciones: [{ accion: 'flotar', altura: 4 }] },
        { quien: 'nave', x: 300, y: 290, escala: 1.35,
          acciones: [
            { accion: 'volar', t: 0.2, hasta: { x: 340, y: 280 }, dur: 1.8 },
            { accion: 'flotar', t: 2.0, altura: 5 }
          ] }
      ],
      efectos: [
        { tipo: 'brillo', a: 'nave', radio: 110, color: 'rgba(34,211,238,0.3)' }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'nave', dibujo: 'celda', t: 2.0, lado: 'derecha' }
      ]
    },

    // ---- 2 · Director: "Un paso en falso y saltarán todas las alarmas.
    //          Tranquilo... esto es lo que mejor se me da."
    // Un dron vigila con su radar rojo. La nave se cuela por debajo, sin hacer
    // ruido... y para presumir, ¡una voltereta!
    {
      fondo: 'espacio',
      continuidad: false,
      camara: { zoom: 1.15, x: 520 },
      actores: [
        { quien: 'naveNodriza', alias: 'nodriza', x: 820, y: 330, escala: 0.72, z: -1 },
        { quien: 'dron', x: 700, y: 150,
          acciones: [
            { accion: 'volar', t: 0.2, hasta: { x: 470, y: 150 }, dur: 2.2 },
            { accion: 'mirar', t: 2.5, mirar: 'derecha' }
          ] },
        { quien: 'nave', x: 380, y: 300, escala: 0.85,
          acciones: [
            { accion: 'volar', t: 0.4, hasta: { x: 600, y: 320 }, dur: 2.0 },
            { accion: 'girar', t: 2.6, dur: 0.8 },
            { accion: 'flotar', t: 3.4, altura: 5 }
          ] }
      ],
      efectos: [
        { tipo: 'senal', a: 'dron', color: '#f87171', radio: 70 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'nave', texto: '¡UIU, UIU!', dibujo: 'guardia', t: 0.3, dur: 1.9, lado: 'izquierda' },
        { texto: '¡FIUUU!', x: 520, y: 230, t: 2.7, dur: 1.2, tam: 38, color: '#bae6fd', borde: '#2563eb' }
      ],
      sonido: [{ nombre: 'boost', t: 2.6 }]
    },

    // ---- 3 · Narrador: "Con el corazón latiendo fuerte, el Director se coló
    //          dentro de la fortaleza enemiga."
    // Ya dentro: el Director entra de puntillas por un pasillo rojo, se esconde
    // pegado a la pared... ¡BUM, BUM! hace su corazón mientras pasa un guardia.
    {
      fondo: 'nodriza',
      transicion: 'pagina',
      tinte: 'rgba(30,0,20,0.18)',
      vineta: 1.4,
      camara: { zoom: 1.2, x: 470, hasta: { zoom: 1.4, a: 'director', dx: 60, dy: -30 }, t: 1.4, dur: 2.0 },
      actores: [
        { quien: 'guardia', x: 860, escala: 0.8, z: -1, facing: -1,
          acciones: [
            { accion: 'caminar', t: 1.0, hasta: { x: 620 }, dur: 2.2, mirar: 'izquierda' },
            { accion: 'mirar', t: 3.6, mirar: 'derecha' }
          ] },
        { quien: 'director', x: 380,
          acciones: [
            { accion: 'entrar', desde: 'izquierda', t: 0.1, dur: 1.0 },
            { accion: 'cambiar', t: 1.2, cambia: { pose: 'hurt' } },
            { accion: 'temblar', t: 1.3, fuerza: 0.5 }
          ] },
        { quien: 'corazon', x: 385, y: 290, z: 2, escala: 0.6,
          acciones: [
            { accion: 'aparecer', t: 1.3, color: '#fecdd3' },
            { accion: 'crecer', t: 1.3, factor: 1.3, dur: 0.5 },
            { accion: 'brillar', t: 1.3, color: 'rgba(255,90,122,0.9)' },
            { accion: 'temblar', t: 1.8, fuerza: 1.2 }
          ] }
      ],
      efectos: [
        { tipo: 'foco', a: 'director', radio: 190, fuerza: 0.55, t: 0.2 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Dentro de la Nave Nodriza...', t: 0.3 },
        { texto: '¡BUM, BUM!', x: 470, y: 150, t: 1.5, tam: 34, color: '#fecdd3', borde: '#e11d48' }
      ],
      sonido: [{ nombre: 'pickup', t: 1.3 }]
    }
  ] });

  // ===========================================================================
  //  s_cap4 — Capítulo 4: La Nave Nodriza
  // ===========================================================================
  G.cine.register('s_cap4', { planos: [

    // ---- 0 · Narrador: "Tras cruzar la flota, el Director aterrizó en secreto
    //          dentro de la enorme Nave Nodriza."
    // La nave entra planeando en el hangar y se posa sin ruido. El Director
    // salta fuera de puntillas.
    {
      fondo: 'nodriza',
      transicion: 'fundido',
      camara: { zoom: 1.1, x: 450, hasta: { zoom: 1.25, x: 500 }, t: 1.4, dur: 2.0 },
      actores: [
        { quien: 'nave', x: -160, y: 120, escala: 0.9,
          acciones: [
            { accion: 'volar', t: 0.1, hasta: { x: 340, y: 322 }, dur: 1.2 }
          ] },
        { quien: 'director', x: 600, facing: 1,
          acciones: [
            { accion: 'entrar', desde: 'izquierda', t: 1.5, dur: 0.8, arco: 110 },
            { accion: 'mirar', t: 2.5, mirar: 'izquierda' },
            { accion: 'mirar', t: 3.2, mirar: 'derecha' }
          ] }
      ],
      efectos: [
        { tipo: 'polvo', x: 340, y: 330, t: 1.25, cantidad: 7 },
        { tipo: 'destellos', a: 'nave', t: 1.4, cantidad: 4, radio: 70 }
      ],
      textos: [
        { texto: 'tap', x: 690, y: 290, t: 2.3, dur: 0.9, tam: 24, color: '#e0f2fe', borde: '#1e3a8a' },
        { estilo: 'bocadillo', texto: 'Shhh...', a: 'director', t: 3.0, lado: 'derecha' }
      ]
    },

    // ---- 1 · Director: "Pasillos oscuros, luces rojas, guardias por todas
    //          partes... Falcon tiene que estar aquí dentro."
    // Travelling por el pasillo: guardias que patrullan y un dron; la cámara
    // llega hasta el Director, que se asoma muy serio.
    {
      fondo: 'nodriza',
      tinte: 'rgba(40,0,10,0.22)',
      vineta: 1.5,
      camara: { zoom: 1.35, x: 740, hasta: { zoom: 1.05, x: 470 }, t: 0.5, dur: 2.4 },
      actores: [
        { quien: 'guardia', alias: 'g1', x: 640, facing: 1,
          acciones: [
            { accion: 'caminar', t: 0.2, hasta: { x: 760 }, dur: 1.6 },
            { accion: 'caminar', t: 2.0, hasta: { x: 660 }, dur: 1.4 }
          ] },
        { quien: 'guardia', alias: 'g2', x: 880, facing: -1, escala: 0.9, z: -1 },
        { quien: 'dron', x: 820, y: 160,
          acciones: [{ accion: 'volar', t: 0.4, hasta: { x: 560, y: 150 }, dur: 3.0 }] },
        { quien: 'director', x: 230, facing: 1, pose: 'idle',
          acciones: [{ accion: 'cambiar', t: 2.9, cambia: { pose: 'hack' } }] }
      ],
      efectos: [
        { tipo: 'brillo', x: 330, y: 40, radio: 70, color: ROJO_LUZ },
        { tipo: 'brillo', x: 720, y: 40, radio: 70, color: ROJO_LUZ },
        { tipo: 'senal', a: 'dron', color: '#f87171', radio: 55 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: 'celda', t: 2.9, lado: 'derecha' }
      ]
    },

    // ---- 2 · Director: "Nada de ruido. Hackearé las puertas una a una y me
    //          colaré como una sombra. Aguanta, amigo, ya casi llego."
    // ¡Shhh! Rayo de hackeo a la primera puerta (se abre), unos pasos, y rayo a
    // la segunda (se abre también).
    {
      fondo: 'nodriza',
      continuidad: false,
      camara: { zoom: 1.2, x: 470, hasta: { x: 610 }, t: 1.8, dur: 1.8 },
      actores: [
        // las puertas se abren justo al terminar cada hackeo
        { quien: 'puerta', alias: 'p1', x: 470, escala: 0.62, estilo: 'nave', z: -1,
          acciones: [{ accion: 'abrir', t: 1.6, dur: 0.6 }] },
        { quien: 'puerta', alias: 'p2', x: 790, escala: 0.62, estilo: 'nave', z: -1,
          acciones: [{ accion: 'abrir', t: 3.9, dur: 0.6 }] },
        { quien: 'director', x: 250,
          acciones: [
            { accion: 'hackear', t: 0.6, a: 'p1', dur: 1.0 },
            { accion: 'caminar', t: 1.8, hasta: { x: 560 }, dur: 1.2 },
            { accion: 'hackear', t: 3.0, a: 'p2', dur: 0.9 }
          ] }
      ],
      efectos: [
        { tipo: 'chispas', a: 'p1', t: 1.55, color: '#67e8f9' },
        { tipo: 'chispas', a: 'p2', t: 3.85, color: '#67e8f9' }
      ],
      textos: [
        { estilo: 'bocadillo', texto: '¡Shhh!', a: 'director', t: 0.1, dur: 0.9, lado: 'derecha' },
        { texto: '¡BIP!', x: 470, y: 140, t: 1.55, dur: 0.9, tam: 34, color: '#a5f3fc', borde: '#0e7490' },
        { texto: '¡BIP!', x: 790, y: 140, t: 3.85, dur: 0.9, tam: 34, color: '#a5f3fc', borde: '#0e7490' },
        // "Aguanta, amigo, ya casi llego"
        { estilo: 'pensamiento', a: 'director', dibujo: 'celda', t: 4.5, lado: 'izquierda' }
      ]
    },

    // ---- 3 · Narrador: "Sigiloso y decidido, el Director se adentró en el
    //          corazón de la fortaleza enemiga."
    // Plano general: el Director avanza de puntillas, con un foco de luz sobre
    // él, hacia la puerta roja del fondo... y entra.
    {
      fondo: 'nodriza',
      fondoVel: 30,
      vineta: 1.4,
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.25, x: 640, y: 190 }, t: 0.5, dur: 3.0 },
      actores: [
        { quien: 'puerta', alias: 'p3', x: 760, escala: 0.8, estilo: 'nave', abierta: 1, luz: '#f87171', z: -1 },
        { quien: 'director', x: 160,
          acciones: [
            { accion: 'caminar', t: 0.2, hasta: { x: 760 }, dur: 3.2 },
            { accion: 'encoger', t: 3.0, factor: 0.75, dur: 0.6 }
          ] }
      ],
      efectos: [
        { tipo: 'foco', a: 'director', radio: 150, fuerza: 0.5 },
        { tipo: 'brillo', x: 760, y: 220, radio: 120, color: 'rgba(248,113,113,0.5)' }
      ],
      textos: [
        { texto: 'tip, tap...', x: 300, y: 200, t: 0.6, dur: 2.0, tam: 26, color: '#e0f2fe', borde: '#1e3a8a' }
      ]
    }
  ] });

  // ===========================================================================
  //  s_confrontacion — La sala del trono: Falcon en la celda y Dark Toros
  // ===========================================================================
  G.cine.register('s_confrontacion', { planos: [

    // ---- 0 · Narrador: "Al final de la fortaleza, el Director empujó una
    //          última puerta y entró en la sala del trono."
    // Desde dentro de la sala: la gran puerta del trono se abre con luz dorada
    // y aparece el Director, que entra y mira a su alrededor.
    {
      fondo: 'trono',
      transicion: 'fundido',
      camara: { zoom: 1.5, x: 480, y: 200, hasta: { zoom: 1.1, x: 450 }, t: 1.4, dur: 2.2 },
      actores: [
        { quien: 'puerta', alias: 'pt', x: 480, escala: 1, estilo: 'trono', luz: '#fde68a',
          acciones: [{ accion: 'abrir', t: 0.3, dur: 1.2 }] },
        { quien: 'director', x: 480, z: 2,
          acciones: [
            { accion: 'aparecer', t: 1.1, color: '#fde68a' },
            { accion: 'caminar', t: 1.7, hasta: { x: 350 }, dur: 1.1 },
            { accion: 'mirar', t: 3.0, mirar: 'derecha' }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', x: 480, y: 200, t: 0.8, color: '#fde68a', fuerza: 0.6 }
      ],
      textos: [
        { texto: '¡ÑIIIC!', x: 300, y: 90, t: 0.4, dur: 1.4, tam: 42, color: '#fde68a', borde: '#7c2d12' }
      ],
      sonido: [{ nombre: 'door', t: 0.3 }]
    },

    // ---- 1 · Falcon: "¡Director! ¡Estás aquí! Estoy atrapado en esta celda de
    //          energía... ¡ten cuidado!"
    // Primer plano de Falcon dentro de la celda naranja, que zumba. Grita de
    // alegría y luego avisa: ¡cuidado!
    {
      fondo: 'trono',
      camara: { zoom: 1.35, x: 640, y: 192 },
      actores: [
        { quien: 'director', x: 350, facing: 1 },
        { quien: 'falcon', x: 700,
          acciones: [{ accion: 'atrapado', t: -1 }] }
      ],
      efectos: [
        { tipo: 'brillo', a: 'falcon', radio: 110, color: 'rgba(251,146,60,0.6)' },
        { tipo: 'chispas', a: 'falcon', en: 'cabeza', t: 1.4, color: '#fb923c', cantidad: 8 }
      ],
      textos: [
        { estilo: 'bocadillo', texto: '¡Director!', a: 'falcon', t: 0.2, dur: 1.6, lado: 'izquierda' },
        { estilo: 'bocadillo', texto: '¡Cuidado!', a: 'falcon', t: 2.2, lado: 'izquierda', color: '#ef4444' }
      ]
    },

    // ---- 2 · Director: "Te veo, Falcon. Aguanta ahí. Voy a bajar ese escudo y
    //          a sacarte de esa jaula."
    // Los dos amigos, uno a cada lado. El Director señala la celda y aprieta el
    // puño, decidido.
    {
      fondo: 'trono',
      camara: { zoom: 1.25, a: 'director', dx: 120, dy: -20, hasta: { zoom: 1.15, x: 520 }, t: 1.8, dur: 2.0 },
      actores: [
        { quien: 'director', x: 350, facing: 1,
          acciones: [
            { accion: 'senalar', t: 0.3, a: 'falcon', dur: 1.4 },
            { accion: 'cambiar', t: 2.0, cambia: { pose: 'attack' }, destello: '#bae6fd' },
            { accion: 'brillar', t: 2.0, color: 'rgba(56,189,248,0.7)' }
          ] },
        { quien: 'falcon', x: 700,
          acciones: [{ accion: 'atrapado', t: -1 }] }
      ],
      efectos: [
        { tipo: 'destellos', a: 'director', t: 2.0, radio: 60, cantidad: 5 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: 'celda', opciones: { abierta: true }, t: 2.3, lado: 'izquierda' }
      ]
    },

    // ---- 3 · Dark Toros: "¡BIENVENIDO A TU FINAL, HÉROE! ¡Hoy caerán los dos!"
    // ¡BOOOM! Dark Toros cae desde arriba entre los dos amigos, con su Escudo de
    // Poder encendido. El Director se echa atrás; Toros se ríe.
    {
      fondo: 'trono',
      camara: { zoom: 1.1, x: 500, hasta: { zoom: 1.3, a: 'toros', dx: -40, dy: -30 }, t: 1.2, dur: 0.8 },
      actores: [
        { quien: 'director', x: 270, facing: 1,
          acciones: [{ accion: 'asustarse', t: 0.75 }] },
        { quien: 'falcon', x: 820, z: -1,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'toros', x: 590, facing: -1, escudo: true,
          acciones: [
            { accion: 'caer', t: 0.2, dur: 0.55 },
            { accion: 'reir', t: 1.6, texto: '¡JA!' }
          ] }
      ],
      efectos: [
        { tipo: 'onda', x: 590, y: 330, t: 0.75, radio: 200 },
        { tipo: 'lineasAccion', a: 'toros', t: 1.4, radio: 230, alpha: 0.35 }
      ],
      textos: [
        { texto: '¡BOOOM!', x: 470, y: 80, t: 0.78, dur: 1.0, tam: 52, estallido: true }
      ],
      sonido: [{ nombre: 'hit', t: 0.75 }]
    },

    // ---- 4 · Narrador: "El suelo tembló. Dark Toros levantó su martillo con la
    //          Gema del Poder brillando. La batalla final había comenzado."
    // Toros ruge con el martillo en alto; la Gema brilla roja. El Director se
    // pone en guardia. ¡LA BATALLA FINAL!
    {
      fondo: 'trono',
      camara: { zoom: 1.05, x: 500, temblor: 0.1, hasta: { zoom: 1.15, x: 470 }, t: 0.3, dur: 2.5 },
      actores: [
        { quien: 'director', x: 300, facing: 1,
          acciones: [{ accion: 'cambiar', t: 1.2, cambia: { pose: 'attack' } }] },
        { quien: 'falcon', x: 820, z: -1,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'toros', x: 590, facing: -1, escudo: true,
          acciones: [
            { accion: 'rugir', t: 0.2, dur: 1.4 },
            { accion: 'cambiar', t: 1.6, cambia: { pose: 'roar' } },
            { accion: 'brillar', t: 0.4, color: GEMA_LUZ, fuerza: 1.2 }
          ] }
      ],
      efectos: [
        { tipo: 'temblor', t: 0.1, fuerza: 0.9 },
        { tipo: 'polvo', x: 590, y: 330, t: 0.2 },
        { tipo: 'destellos', a: 'toros', en: 'cabeza', dx: -60, dy: -10, t: 0.6, radio: 40, cantidad: 5 }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡LA BATALLA FINAL!', x: 480, y: 64, t: 1.8, tam: 46, pantalla: true }
      ]
    }
  ] });

  // ===========================================================================
  //  s_cap5 — Capítulo 5: Dark Toros
  // ===========================================================================
  G.cine.register('s_cap5', { planos: [

    // ---- 0 · Narrador: "Al fondo de un largo pasillo se abrió la gran puerta
    //          de la sala del trono."
    // Travelling por el pasillo de la nodriza: el Director avanza y, al fondo,
    // la gran puerta dorada se abre de par en par.
    {
      fondo: 'nodriza',
      transicion: 'fundido',
      fondoVel: 40,
      camara: { zoom: 1.15, x: 380, hasta: { zoom: 1.3, x: 700 }, t: 0.6, dur: 2.6 },
      actores: [
        { quien: 'puerta', alias: 'pt', x: 800, escala: 0.95, estilo: 'trono', luz: '#fde68a',
          acciones: [{ accion: 'abrir', t: 1.8, dur: 1.4 }] },
        { quien: 'director', x: 180,
          acciones: [
            { accion: 'caminar', t: 0.2, hasta: { x: 580 }, dur: 2.2 },
            { accion: 'cambiar', t: 2.6, cambia: { pose: 'idle' } }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', x: 800, y: 210, t: 2.4, color: '#fde68a', fuerza: 0.6 }
      ],
      textos: [
        { texto: '¡CLONC!', x: 800, y: 70, t: 1.8, dur: 1.4, tam: 42, color: '#fde68a', borde: '#7c2d12' }
      ]
    },

    // ---- 1 · Dark Toros: "¡JA! Sabía que vendrías, héroe. Tu amigo es una
    //          carnada perfecta."
    // Dentro de la sala del trono: Toros, con su escudo, se ríe y señala la
    // celda donde está Falcon.
    {
      fondo: 'trono',
      transicion: 'pagina',
      camara: { zoom: 1.45, a: 'toros', dx: -20, dy: -20, hasta: { zoom: 1.2, x: 640 }, t: 1.6, dur: 1.8 },
      actores: [
        { quien: 'falcon', x: 820,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'toros', x: 590, facing: -1, escudo: true,
          acciones: [
            { accion: 'reir', t: 0.2, texto: '¡JA!', dur: 1.4 },
            { accion: 'senalar', t: 1.8, a: 'falcon' }
          ] }
      ],
      efectos: [
        { tipo: 'brillo', a: 'falcon', radio: 100, color: 'rgba(251,146,60,0.5)' }
      ]
    },

    // ---- 2 · Director: "Suéltalo, Dark Toros. Esto termina aquí."
    // Primer plano del Director, serio, señalando a Toros. Viento heroico.
    {
      fondo: 'trono',
      camara: { zoom: 1.7, a: 'director', dx: 60, dy: -16 },
      actores: [
        { quien: 'director', x: 300, facing: 1,
          acciones: [
            { accion: 'senalar', t: 0.4, a: 'toros', dur: 1.8 },
            { accion: 'cambiar', t: 2.3, cambia: { pose: 'attack' } }
          ] },
        { quien: 'falcon', x: 820,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'toros', x: 590, facing: -1, escudo: true }
      ],
      efectos: [
        { tipo: 'rayos', a: 'director', color: '#bae6fd' },
        { tipo: 'viento', t: 0.4, alpha: 0.7, dir: 1 }
      ]
    },

    // ---- 3 · Dark Toros: "¿Terminar? ¡Mi Escudo de Poder me hace invencible!
    //          Ningún golpe tuyo me tocará. ¡JA JA JA!"
    // El Director dispara su láser... ¡CLINC, CLINC! Rebota en el escudo.
    // Toros se carcajea.
    {
      fondo: 'trono',
      camara: { zoom: 1.15, x: 470 },
      actores: [
        { quien: 'director', x: 300, facing: 1,
          acciones: [{ accion: 'disparar', t: 0.3, veces: 2, cada: 0.5, proyectil: 'laser', rebota: true, hasta: { x: 500, y: 230 } }] },
        { quien: 'falcon', x: 820,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'toros', x: 590, facing: -1, escudo: true,
          acciones: [
            { accion: 'brillar', t: 0.5, color: 'rgba(251,146,60,0.9)', fuerza: 1.3 },
            { accion: 'reir', t: 1.5, texto: '¡JA!' }
          ] }
      ],
      efectos: [
        { tipo: 'chispas', x: 500, y: 230, t: 0.55 },
        { tipo: 'chispas', x: 500, y: 230, t: 1.05 }
      ],
      textos: [
        { texto: '¡CLINC!', x: 440, y: 150, t: 0.6, dur: 0.7, tam: 40 },
        { texto: '¡CLANC!', x: 400, y: 90, t: 1.1, dur: 0.7, tam: 40 }
      ],
      sonido: [{ nombre: 'shieldBlock', t: 0.6 }]
    },

    // ---- 4 · Director (pensando): "(La Gema está en su martillo... si consigo
    //          hackearla, su escudo caerá. Es mi única oportunidad.)"
    // Plano detalle de la Gema en el martillo (un foco la ilumina)... y la
    // cámara vuelve al Director, que tiene una idea.
    {
      fondo: 'trono',
      camara: { zoom: 2.3, a: 'toros', dx: -20, dy: 20, hasta: { zoom: 1.3, x: 450, y: 220 }, t: 1.6, dur: 1.6 },
      actores: [
        { quien: 'director', x: 300, facing: 1, pose: 'hack',
          acciones: [{ accion: 'cambiar', t: 3.2, cambia: { pose: 'win' } }] },
        { quien: 'falcon', x: 820,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'toros', x: 590, facing: -1, escudo: true }
      ],
      efectos: [
        { tipo: 'brillo', a: 'toros', dx: -55, dy: 20, radio: 60, color: GEMA_LUZ },
        { tipo: 'destellos', a: 'director', en: 'cabeza', t: 3.2, radio: 36, cantidad: 4 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: 'gema', texto: '¡Hackearla!', t: 2.0, lado: 'izquierda' },
        { texto: '¡BRILLA!', x: 470, y: 200, t: 0.3, dur: 1.3, tam: 30, color: '#fecdd3', borde: '#be123c' }
      ]
    },

    // ---- 5 · Narrador: "Esquiva el martillazo, hackea el martillo cuando quede
    //          clavado y, con el escudo apagado... ¡pégale, héroe!"
    // El tutorial en una sola jugada: ¡BAM! martillazo (el Director salta
    // hacia atrás), el martillo queda clavado, rayo de hackeo, el escudo se
    // apaga... ¡y POW!
    {
      fondo: 'trono',
      camara: { zoom: 1.1, x: 470 },
      actores: [
        { quien: 'falcon', x: 820, z: -1,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'martillo', x: 430, clavado: true, angulo: 0.2, z: 1,
          acciones: [{ accion: 'caer', t: 0.45, dur: 0.15, desde: { y: 220 } }] },
        { quien: 'toros', x: 590, facing: -1, escudo: true,
          acciones: [
            { accion: 'cambiar', t: 0.2, cambia: { pose: 'slam' } },
            { accion: 'cambiar', t: 0.5, cambia: { pose: 'charge', sinMartillo: true } },
            { accion: 'cambiar', t: 2.0, cambia: { escudo: false }, destello: '#fed7aa' },
            { accion: 'retroceder', t: 2.95, distancia: 60 },
            { accion: 'cambiar', t: 3.3, cambia: { pose: 'stunned' } }
          ] },
        { quien: 'director', x: 390, facing: 1,
          acciones: [
            { accion: 'saltar', t: 0.15, hasta: { x: 270 }, altura: 70, dur: 0.55, mirar: 'derecha' },
            { accion: 'hackear', t: 0.9, a: 'martillo', dur: 1.1 },
            { accion: 'correr', t: 2.2, hasta: { x: 505 }, dur: 0.4 },
            { accion: 'atacar', t: 2.65, a: 'toros', veces: 2, cada: 0.25 }
          ] }
      ],
      efectos: [
        { tipo: 'onda', x: 430, y: 330, t: 0.5, radio: 150 },
        { tipo: 'flash', t: 2.0, color: '#a5f3fc' },
        { tipo: 'estrellas', a: 'toros', en: 'cabeza', t: 3.1 }
      ],
      textos: [
        { texto: '¡BAM!', x: 430, y: 180, t: 0.5, dur: 0.8, tam: 48, estallido: true },
        { texto: '¡HACK!', x: 330, y: 120, t: 1.2, dur: 0.9, tam: 40, color: '#a5f3fc', borde: '#0e7490' },
        { texto: '¡POW!', x: 560, y: 110, t: 2.7, dur: 1.1, tam: 56, estallido: '#fef3c7' }
      ],
      sonido: [{ nombre: 'hit', t: 0.5 }, { nombre: 'shieldBlock', t: 2.0 }, { nombre: 'bigPunch', t: 2.9 }]
    }
  ] });

  // ===========================================================================
  //  s_final — La Gema se apaga, Falcon libre, el abrazo y la moraleja
  // ===========================================================================
  G.cine.register('s_final', { planos: [

    // ---- 0 · Narrador: "Con un último golpe, la Gema del Poder se apagó para
    //          siempre. Dark Toros cayó derrotado."
    // ¡POW! El último puñetazo. La Gema sale volando del martillo, parpadea...
    // y se apaga con un ¡FSSS! de humo. Toros, derrotado.
    {
      fondo: 'trono',
      transicion: 'fundido',
      camara: { zoom: 1.2, x: 500, hasta: { zoom: 1.5, a: 'gema', dy: 40 }, t: 1.0, dur: 1.2 },
      actores: [
        { quien: 'falcon', x: 820, z: -1,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'toros', x: 620, facing: -1, pose: 'stunned', sinMartillo: true,
          acciones: [
            { accion: 'retroceder', t: 0.5, distancia: 50 },
            { accion: 'cambiar', t: 0.9, cambia: { pose: 'defeated' } }
          ] },
        { quien: 'director', x: 470, facing: 1,
          acciones: [{ accion: 'atacar', t: 0.2, a: 'toros' }] },
        { quien: 'gema', x: 540, y: 230, escala: 1.4, z: 3,
          acciones: [
            { accion: 'aparecer', t: 0.6, color: '#fecdd3' },
            { accion: 'flotar', t: 0.6, altura: 6 },
            { accion: 'brillar', t: 0.6, color: GEMA_LUZ, dur: 1.4 },
            { accion: 'parpadear', t: 1.6, veces: 4, dur: 1.0 },
            { accion: 'desaparecer', t: 2.6, color: '#94a3b8', dur: 0.6 }
          ] }
      ],
      efectos: [
        { tipo: 'flash', t: 0.45 },
        { tipo: 'humo', x: 540, y: 230, t: 2.6, cantidad: 5, alto: 90, color: '#94a3b8' },
        { tipo: 'estrellas', a: 'toros', en: 'cabeza', t: 1.0 }
      ],
      textos: [
        { texto: '¡POW!', x: 560, y: 90, t: 0.45, dur: 0.9, tam: 54, estallido: true },
        { texto: '¡FSSSS...!', x: 420, y: 140, t: 2.7, tam: 38, color: '#e2e8f0', borde: '#475569' }
      ],
      sonido: [{ nombre: 'bigPunch', t: 0.45 }, { nombre: 'hackOk', t: 2.6 }]
    },

    // ---- 1 · Dark Toros: "Imposible... dos amigos... han podido conmigo..."
    // Primer plano de Toros, derrotado y mareado, pensando en los dos amigos.
    {
      fondo: 'trono',
      camara: { zoom: 1.45, a: 'toros', dx: -60, dy: -45 },
      actores: [
        { quien: 'falcon', x: 820, z: -1,
          acciones: [{ accion: 'atrapado', t: -1 }] },
        { quien: 'director', x: 470, facing: 1 },
        { quien: 'toros', x: 670, facing: -1, pose: 'defeated', sinMartillo: true,
          acciones: [{ accion: 'temblar', t: 0.2, fuerza: 0.4 }] }
      ],
      efectos: [
        { tipo: 'estrellas', a: 'toros', en: 'cabeza' }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'toros', dibujo: ['director', 'falcon'], t: 0.6, lado: 'izquierda' }
      ]
    },

    // ---- 2 · Narrador: "La celda de energía se abrió y Lord Falcon saltó libre,
    //          directo a abrazar a su mejor amigo."
    // ¡CLIC! La celda se apaga, Falcon salta libre... ¡y corre a abrazar al
    // Director!
    {
      fondo: 'trono',
      camara: { zoom: 1.2, x: 620, hasta: { zoom: 1.25, x: 520 }, t: 1.2, dur: 1.8 },
      actores: [
        { quien: 'toros', x: 670, facing: -1, pose: 'defeated', sinMartillo: true, z: -2 },
        { quien: 'director', x: 420, facing: 1 },
        { quien: 'falcon', x: 820,
          acciones: [
            { accion: 'atrapado', t: -1, dur: 1.9 },
            { accion: 'saltar', t: 0.95, altura: 90, dur: 0.6 },
            { accion: 'abrazar', t: 1.6, a: 'director', distancia: 60 }
          ] }
      ],
      efectos: [
        { tipo: 'flash', t: 0.9, color: '#fed7aa' },
        { tipo: 'destellos', x: 820, y: 260, t: 0.9, dur: 1.6, cantidad: 8, radio: 80 },
        { tipo: 'estrellas', a: 'toros', en: 'cabeza' }
      ],
      textos: [
        { texto: '¡CLIC!', x: 720, y: 110, t: 0.9, dur: 0.8, tam: 40, color: '#fef3c7', borde: '#f97316' },
        { estilo: 'titulo', texto: '¡LIBRE!', x: 600, y: 90, t: 1.7, dur: 1.6, tam: 44 }
      ],
      sonido: [{ nombre: 'door', t: 0.9 }, { nombre: 'victory', t: 2.2 }]
    },

    // ---- 3 · Falcon: "¡Sabía que vendrías! Perdona por ir solo... tenías
    //          razón, somos más fuertes juntos."
    // Plano medio de los dos amigos juntos. Falcon habla, con corazones.
    {
      fondo: 'trono',
      camara: { zoom: 1.6, x: 450, y: 250 },
      actores: [
        { quien: 'director', x: 410, facing: 1 },
        { quien: 'falcon', x: 495, facing: -1,
          acciones: [
            { accion: 'cambiar', t: 1.5, cambia: { pose: 'idle' } },
            { accion: 'cambiar', t: 2.8, cambia: { pose: 'win' } }
          ] }
      ],
      efectos: [
        { tipo: 'corazones', x: 452, y: 200, cantidad: 5, alto: 100, t: 2.8 },
        { tipo: 'brillo', x: 452, y: 270, radio: 130, color: 'rgba(253,224,71,0.45)' }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'falcon', dibujo: ['director', 'falcon'], t: 2.8, lado: 'derecha' }
      ]
    },

    // ---- 4 · Director: "Siempre, amigo. Un héroe nunca abandona a los suyos.
    //          En equipo no hay nada que no podamos lograr."
    // El Director levanta el puño, rayos dorados... ¡y los dos celebran juntos!
    {
      fondo: 'trono',
      camara: { zoom: 1.75, a: 'director', dx: 30, dy: -16, hasta: { zoom: 1.2, x: 460 }, t: 1.6, dur: 1.6 },
      actores: [
        { quien: 'director', x: 410, facing: 1,
          acciones: [
            { accion: 'cambiar', t: 0.3, cambia: { pose: 'win' }, destello: '#fde68a' },
            { accion: 'celebrar', t: 1.8, altura: 18 }
          ] },
        { quien: 'falcon', x: 500, facing: -1,
          acciones: [{ accion: 'celebrar', t: 2.0, altura: 18 }] }
      ],
      efectos: [
        { tipo: 'rayos', x: 460, y: 250, color: '#fde68a' },
        { tipo: 'destellos', x: 460, y: 210, t: 1.8, radio: 120, cantidad: 8 }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡EN EQUIPO!', x: 480, y: 64, t: 2.0, tam: 46, pantalla: true }
      ],
      sonido: [{ nombre: 'victory', t: 1.8 }]
    },

    // ---- 5 · Narrador: "Y así, mientras el sol volvía a brillar, los dos amigos
    //          regresaron a casa sonriendo, listos para su próxima aventura."
    // De vuelta en el cañón, con el sol brillando: la nave cruza el cielo y los
    // dos amigos caminan juntos, felices.
    {
      fondo: 'canyon',
      transicion: 'pagina',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.15, x: 520 }, t: 1.0, dur: 3.0 },
      actores: [
        { quien: 'nave', x: 760, y: 120, escala: 0.55, z: -1,
          acciones: [{ accion: 'entrar', desde: 'izquierda', t: 0.2, dur: 2.4 }, { accion: 'flotar', t: 2.6 }] },
        { quien: 'director', x: 440,
          acciones: [
            { accion: 'entrar', desde: 'izquierda', t: 0.4, dur: 2.0 },
            { accion: 'celebrar', t: 2.6, altura: 12 }
          ] },
        { quien: 'falcon', x: 540,
          acciones: [
            { accion: 'entrar', desde: 'izquierda', t: 0.5, dur: 2.0 },
            { accion: 'celebrar', t: 2.7, altura: 12 }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', x: 690, y: 200, color: '#fef08a', fuerza: 0.7 },
        { tipo: 'notas', x: 490, y: 200, t: 2.6, cantidad: 5 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'De vuelta a casa...', t: 0.3 }
      ]
    },

    // ---- 6 · Narrador: "Porque la mayor fuerza del mundo no es un puño ni una
    //          gema... es la amistad."
    // La moraleja: la gema aparece... y se esfuma. En su lugar, un gran corazón
    // sobre los dos amigos abrazados. ¡LA AMISTAD!
    {
      fondo: 'menu',
      transicion: 'fundido',
      camara: { zoom: 1.15, x: 480, y: 210, hasta: { zoom: 1 }, t: 2.0, dur: 2.0 },
      actores: [
        { quien: 'gema', x: 230, y: 250, escala: 1.4,
          acciones: [
            { accion: 'aparecer', t: 0.2 },
            { accion: 'flotar', t: 0.2 },
            { accion: 'brillar', t: 0.2, color: GEMA_LUZ, dur: 1.2 },
            { accion: 'desaparecer', t: 1.4, color: '#e9d5ff' }
          ] },
        // "no es un puño...": el Director enseña el puño (hacia la gema) y lo baja
        { quien: 'director', x: 400, y: 330, facing: -1, pose: 'attack',
          acciones: [
            { accion: 'cambiar', t: 1.3, cambia: { pose: 'idle', facing: 1 } },
            { accion: 'abrazar', t: 1.6, a: 'falcon', distancia: 60 }
          ] },
        { quien: 'falcon', x: 560, y: 330, facing: -1 },
        { quien: 'corazon', x: 490, y: 205, escala: 1.6,
          acciones: [
            { accion: 'aparecer', t: 1.9, color: '#fecdd3' },
            { accion: 'crecer', t: 1.9, factor: 1.5, dur: 0.7 },
            { accion: 'flotar', t: 2.6, altura: 6 },
            { accion: 'brillar', t: 1.9, color: 'rgba(255,90,122,0.85)' }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', x: 490, y: 160, t: 1.9, color: '#fbcfe8' },
        { tipo: 'fuegos', t: 2.6, cantidad: 3 },
        { tipo: 'lluviaEstrellas', t: 2.4, cantidad: 18 }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡LA AMISTAD!', x: 480, y: 60, t: 2.6, tam: 52, pantalla: true, color: '#fbcfe8', borde: '#9d174d' }
      ],
      sonido: [{ nombre: 'victory', t: 2.6 }]
    }
  ] });
})();
