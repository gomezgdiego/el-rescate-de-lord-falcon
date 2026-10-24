// =============================================================================
// parte1-a.js — Historias animadas de la Parte 1 (primera mitad):
//   s_cap1 (6 líneas) · s_cap2 (5) · s_despegue (4) · s_cap3 (4)
// Manual: docs/cine-api.md. Motor: js/cine.js. Ejemplo: js/cine/s_captura.js.
//
// Un plano por cada línea de G.storyData (js/main.js), en el mismo orden.
//   · La ACCIÓN va en y = 0…345 (el panel de diálogo tapa lo de abajo).
//   · Pies en y = 330 (el suelo). x va de 0 a 960.
//   · Mismo fondo + 'corte' = CONTINUIDAD (mismos nombres = se deslizan).
//   · Para nombrar actores, SIEMPRE "alias" (nunca la clave "id").
//   · Sin sangre: solo los robots y las naves hacen "pop".
// =============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  if (!G.cine || typeof G.cine.register !== 'function') return;

  // ===========================================================================
  //  CAPÍTULO 1 · LA EMBOSCADA
  //  Presentación de los dos amigos + Falcon decide emboscar a Dark Toros solo.
  // ===========================================================================
  G.cine.register('s_cap1', { planos: [

    // ---- 0 · Narrador: "Había una vez dos amigos inseparables..." -----------
    // Como un cuento: el atardecer de la portada. Entran los dos amigos, cada
    // uno con su "presentación": el Director (el más listo, gafas brillando)
    // y Lord Falcon (el más valiente, con su arco). Al final, ¡juntos!
    {
      fondo: 'menu',
      suelo: 'arena',
      transicion: 'fundido',
      camara: { zoom: 1.25, x: 480, y: 215, hasta: { zoom: 1.05 }, t: 2.4, dur: 2.2 },
      actores: [
        { quien: 'director', x: 360, pose: 'hack',
          acciones: [
            { accion: 'entrar', t: 0.1, desde: 'izquierda', dur: 0.9 },
            { accion: 'brillar', t: 1.0, color: 'rgba(56,189,248,0.75)' },
            { accion: 'celebrar', t: 3.0, altura: 12 }
          ] },
        { quien: 'falcon', x: 600, facing: -1, pose: 'shoot',
          acciones: [
            { accion: 'entrar', t: 1.3, desde: 'derecha', arco: 120, dur: 0.9 },
            { accion: 'brillar', t: 2.2, color: 'rgba(74,222,128,0.75)' },
            { accion: 'celebrar', t: 3.1, altura: 12 }
          ] }
      ],
      efectos: [
        { tipo: 'destellos', a: 'director', en: 'cabeza', t: 1.0, radio: 34, cantidad: 4 },
        { tipo: 'destellos', x: 480, y: 160, t: 3.0, radio: 200, cantidad: 9 },
        { tipo: 'corazones', x: 480, y: 210, t: 3.2, cantidad: 4, alto: 100 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Había una vez...', t: 0.3 },
        { estilo: 'titulo', texto: 'EL MÁS LISTO', x: 360, y: 92, t: 0.9, dur: 2.0, tam: 26, color: '#7dd3fc', borde: '#1e3a8a' },
        { estilo: 'titulo', texto: 'EL MÁS VALIENTE', x: 600, y: 92, t: 2.1, dur: 1.4, tam: 26, color: '#86efac', borde: '#14532d' },
        { estilo: 'titulo', texto: '¡AMIGOS INSEPARABLES!', x: 480, y: 70, t: 3.3, tam: 34, pantalla: true }
      ],
      sonido: [{ nombre: 'select', t: 1.0 }, { nombre: 'select', t: 2.2 }, { nombre: 'victory', t: 3.2 }]
    },

    // ---- 1 · Narrador: "Juntos protegían su ciudad de cualquier peligro..." --
    // En la ciudad, un dron travieso: Falcon lo hace "pop" con una flecha y el
    // Director hackea una torreta, que se vuelve verde y amiga. ¡Equipo!
    {
      fondo: 'ciudad',
      transicion: 'pagina',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.15, x: 470, y: 225 }, t: 2.8, dur: 1.8 },
      actores: [
        { quien: 'dron', x: 720, y: 160, facing: -1,
          acciones: [{ accion: 'pop', t: 1.05 }] },
        { quien: 'torreta', x: 820, facing: -1 },
        { quien: 'falcon', x: 380,
          acciones: [
            { accion: 'disparar', t: 0.5, a: 'dron', proyectil: 'flecha' },
            { accion: 'celebrar', t: 3.2, altura: 10 }
          ] },
        { quien: 'director', x: 250,
          acciones: [
            { accion: 'hackear', t: 1.5, a: 'torreta', dur: 1.4, convierte: true },
            { accion: 'celebrar', t: 3.2, altura: 10 }
          ] }
      ],
      efectos: [
        { tipo: 'destellos', a: 'torreta', t: 2.9, radio: 50, cantidad: 5 },
        { tipo: 'destellos', x: 320, y: 180, t: 3.2, radio: 110, cantidad: 7 }
      ],
      textos: [
        { texto: '¡POP!', x: 720, y: 95, t: 1.05, dur: 1.2, tam: 50, estallido: true },
        { texto: '¡BZZT!', x: 690, y: 210, t: 1.7, dur: 1.2, tam: 36, color: '#bbf7d0', borde: '#15803d' },
        { estilo: 'titulo', texto: '¡EQUIPO!', x: 315, y: 120, t: 3.3, tam: 40 }
      ],
      sonido: [{ nombre: 'victory', t: 3.2 }]
    },

    // ---- 2 · Falcon: "¡He encontrado el escondite de Dark Toros!..." -------
    // En la base del Director. Falcon llega corriendo, emocionado, y piensa en
    // Dark Toros en el cañón. El Director, que trabajaba, se da la vuelta.
    {
      fondo: 'base',
      transicion: 'pagina',
      camara: { zoom: 1.2, x: 460, y: 220, hasta: { zoom: 1.4, a: 'falcon', dx: 60, dy: -20 }, t: 1.4, dur: 2.0 },
      actores: [
        { quien: 'director', x: 690, facing: 1, pose: 'hack',
          acciones: [
            { accion: 'mirar', t: 1.0, mirar: 'izquierda' },
            { accion: 'cambiar', t: 1.0, cambia: { pose: 'idle' } }
          ],
          bocadillo: '?', bocadilloT: 1.1 },
        { quien: 'falcon', x: 420,
          acciones: [
            { accion: 'entrar', t: 0, desde: 'izquierda', dur: 0.8 },
            { accion: 'saltar', t: 0.9, veces: 2, altura: 50, dur: 0.45 },
            { accion: 'senalar', t: 2.0, hasta: { x: 900, y: 120 } }
          ] }
      ],
      efectos: [
        { tipo: 'polvo', x: 420, y: 330, t: 0.8 },
        { tipo: 'velocidad', t: 0, dur: 0.8, dir: 1 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'falcon', dibujo: 'toros', t: 2.2, lado: 'izquierda' }
      ],
      sonido: [{ nombre: 'pickup', t: 2.0 }]
    },

    // ---- 3 · Director: "Espera, Falcon. Dark Toros tiene la Gema del Poder..."
    // Primer plano del Director, preocupado: piensa en la Gema del Poder (¡muy
    // peligrosa!) y después en los dos juntos, haciendo un plan.
    {
      fondo: 'base',
      camara: { zoom: 1.4, a: 'director', dx: -70, dy: -50 },
      actores: [
        { quien: 'falcon', x: 470, pose: 'idle',
          acciones: [{ accion: 'temblar', t: 0, fuerza: 0.35 }] },     // impaciente
        { quien: 'director', x: 610, facing: -1,
          acciones: [
            { accion: 'caminar', t: 0.1, hasta: { x: 590 }, dur: 0.4, mirar: 'izquierda' },
            { accion: 'cambiar', t: 3.0, cambia: { pose: 'win' } }
          ] }
      ],
      efectos: [
        { tipo: 'brillo', x: 540, y: 110, t: 0.5, dur: 2.5, radio: 70, color: 'rgba(225,29,72,0.6)' }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: ['toros', 'gema'], t: 0.5, dur: 2.5, lado: 'izquierda' },
        { texto: '¡PELIGRO!', x: 330, y: 150, t: 0.9, dur: 2.1, tam: 30, color: '#fecaca', borde: '#b91c1c' },
        { estilo: 'pensamiento', a: 'director', dibujo: ['director', 'falcon'], t: 3.0, lado: 'izquierda' }
      ]
    },

    // ---- 4 · Falcon: "No hay tiempo, amigo... ¡Confía en mí!" -------------
    // Falcon, con la pose de victoria ("¡confía en mí!"), da un salto ágil por
    // encima del Director y sale disparado como el viento. El Director se gira
    // con la mano estirada: "¡Falcon!".
    {
      fondo: 'base',
      camara: { zoom: 1.35, x: 540, y: 200, hasta: { zoom: 1.1, x: 600, y: 190 }, t: 2.0, dur: 1.4 },
      actores: [
        { quien: 'director', x: 610, facing: -1,
          acciones: [
            { accion: 'asustarse', t: 2.2 },
            { accion: 'mirar', t: 2.7, mirar: 'derecha' },
            { accion: 'senalar', t: 2.8, hasta: { x: 940, y: 250 } }
          ],
          bocadillo: '¡Falcon!', bocadilloT: 2.6 },
        { quien: 'falcon', x: 470, facing: 1,
          acciones: [
            { accion: 'celebrar', t: 0.3, dur: 1.4, altura: 14 },
            { accion: 'salir', t: 1.9, hacia: 'derecha', arco: 170, dur: 0.8 }
          ] }
      ],
      efectos: [
        { tipo: 'destellos', a: 'falcon', en: 'cabeza', t: 0.3, dur: 1.6, radio: 40, cantidad: 4 },
        { tipo: 'estela', a: 'falcon', t: 1.9, dur: 1.0, color: '#86efac', tam: 16 },
        { tipo: 'polvo', x: 480, y: 330, t: 1.95 },
        { tipo: 'viento', t: 2.0, dur: 1.8 }
      ],
      textos: [
        { estilo: 'bocadillo', texto: '¡Confía en mí!', a: 'falcon', t: 0.4, dur: 1.5, lado: 'izquierda' },
        { texto: '¡FIUUU!', x: 800, y: 130, t: 2.3, dur: 1.4, tam: 46, color: '#bbf7d0', borde: '#15803d' }
      ],
      sonido: [{ nombre: 'jump', t: 1.9 }]
    },

    // ---- 5 · Narrador: "...ágil como el viento, Lord Falcon saltó entre las
    //          rocas doradas del cañón... directo hacia el peligro." ---------
    // ¡Página! El cañón al atardecer. Falcon cruza saltando con estela verde;
    // la cámara lo sigue y descubre a Dark Toros, de espaldas, al fondo.
    {
      fondo: 'canyon',
      transicion: 'pagina',
      camara: { zoom: 1.2, x: 300, y: 215, hasta: { zoom: 1.1, x: 600 }, t: 0.8, dur: 2.6 },
      actores: [
        { quien: 'toros', x: 830, facing: 1, escala: 0.9,
          acciones: [{ accion: 'brillar', t: 2.6, color: 'rgba(225,29,72,0.55)', fuerza: 0.8 }] },
        { quien: 'falcon', x: 150,
          acciones: [
            { accion: 'entrar', t: 0.2, desde: 'izquierda', arco: 90, dur: 0.6 },
            { accion: 'saltar', t: 0.9, hasta: { x: 330 }, altura: 120, dur: 0.6 },
            { accion: 'saltar', t: 1.55, hasta: { x: 470 }, altura: 130, dur: 0.6 },
            { accion: 'saltar', t: 2.2, hasta: { x: 590 }, altura: 110, dur: 0.6 },
            { accion: 'cambiar', t: 2.85, cambia: { pose: 'attack' } }
          ] }
      ],
      efectos: [
        { tipo: 'estela', a: 'falcon', t: 0.2, dur: 2.8, color: '#86efac', tam: 16 },
        { tipo: 'viento', t: 0.3, dur: 3.0, alpha: 0.7 },
        { tipo: 'polvo', x: 330, y: 330, t: 1.5 },
        { tipo: 'polvo', x: 470, y: 330, t: 2.15 },
        { tipo: 'polvo', x: 590, y: 330, t: 2.8 },
        { tipo: 'lineasAccion', a: 'toros', t: 2.9, radio: 230, alpha: 0.35 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'El cañón de las ruinas, al atardecer...', t: 0.35 },
        { texto: '¡HOP!', x: 400, y: 110, t: 1.6, dur: 0.6, tam: 36, color: '#bbf7d0', borde: '#15803d' },
        { texto: '¡HOP!', x: 530, y: 100, t: 2.25, dur: 0.6, tam: 36, color: '#bbf7d0', borde: '#15803d' },
        { estilo: 'bocadillo', texto: '¡Chsss...!', a: 'falcon', t: 3.1, lado: 'izquierda' }
      ]
    }
  ] });

  // ===========================================================================
  //  CAPÍTULO 2 · LA PREPARACIÓN
  //  La señal de auxilio llega a la base; el Director calcula y prepara gadgets.
  // ===========================================================================
  G.cine.register('s_cap2', { planos: [

    // ---- 0 · Narrador: "En su base tecnológica, rodeado de pantallas azules,
    //          el Director America recibió una señal de auxilio." ------------
    // Plano general de la base. El Director trabaja en sus pantallas... ¡y
    // salta la alarma de auxilio! Se gira de golpe.
    {
      fondo: 'base',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.3, a: 'director', dx: 60, dy: -30 }, t: 1.6, dur: 1.6 },
      actores: [
        { quien: 'director', x: 480, pose: 'hack',
          acciones: [
            { accion: 'asustarse', t: 1.5 },
            { accion: 'mirar', t: 2.0, mirar: 'derecha' }
          ],
          bocadillo: '!', bocadilloT: 1.6 }
      ],
      efectos: [
        { tipo: 'alarma', t: 1.4, dur: 2.2, alpha: 0.6 },
        { tipo: 'senal', x: 700, y: 200, t: 1.4, color: '#f87171', radio: 70 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'En la base del Director...', t: 0.3 },
        { texto: '¡SOS!', x: 720, y: 140, t: 1.45, dur: 2.5, tam: 46, color: '#fecaca', borde: '#b91c1c', estallido: '#fef3c7', pantalla: true },
        { texto: '¡BIIIP!', x: 280, y: 150, t: 1.6, dur: 1.4, tam: 34, color: '#fde68a', borde: '#b45309', pantalla: true }
      ],
      sonido: [{ nombre: 'hackFail', t: 1.4 }, { nombre: 'checkpoint', t: 1.9 }]
    },

    // ---- 1 · Director: "¡Es el reloj de Falcon! Su señal parpadea..." -----
    // Plano detalle del smartwatch: el punto de FALCON parpadea en rojo. La
    // cámara se aleja y vemos al Director, preocupado.
    {
      fondo: 'base',
      camara: { zoom: 2.0, a: 'reloj', dy: -10, hasta: { zoom: 1.3, x: 470, y: 220 }, t: 1.6, dur: 1.8 },
      actores: [
        { quien: 'director', x: 330, pose: 'hurt',
          acciones: [{ accion: 'temblar', t: 2.6, fuerza: 0.4 }] },
        { quien: 'reloj', x: 600, y: 300, escala: 1.1, color: '#ef4444', senalX: 22, senalY: -16,
          acciones: [
            { accion: 'flotar', altura: 5 },
            { accion: 'brillar', color: 'rgba(239,68,68,0.7)' }
          ] }
      ],
      efectos: [
        { tipo: 'senal', x: 631, y: 197, color: '#f87171', radio: 50 }
      ],
      textos: [
        { texto: '¡BIP! ¡BIP!', x: 470, y: 90, t: 0.3, dur: 1.4, tam: 34, color: '#fecaca', borde: '#b91c1c' },
        { estilo: 'bocadillo', texto: '¡Falcon!', a: 'director', t: 2.6, lado: 'izquierda' }
      ],
      sonido: [{ nombre: 'checkpoint', t: 0.3 }, { nombre: 'checkpoint', t: 1.0 }]
    },

    // ---- 2 · Director: "Mi smartwatch calcula las probabilidades... son
    //          bajísimas. Pero un héroe no abandona a su mejor amigo." ------
    // El reloj hace sus cálculos: ¡ERROR, 1 %! El Director lo aparta... y
    // levanta el puño, decidido, con rayos de héroe.
    {
      fondo: 'base',
      camara: { zoom: 1.4, x: 470, y: 225, hasta: { zoom: 1.55, a: 'director', dx: 20, dy: -25 }, t: 2.4, dur: 1.4 },
      actores: [
        { quien: 'director', x: 380, pose: 'hurt',
          acciones: [
            { accion: 'cambiar', t: 2.4, cambia: { pose: 'win' }, destello: '#fde68a' },
            { accion: 'brillar', t: 2.4, color: 'rgba(253,224,71,0.8)' }
          ] },
        { quien: 'reloj', x: 600, y: 300, escala: 1.1, error: true, texto: 'ÉXITO: 1 %',
          acciones: [
            { accion: 'flotar', altura: 5 },
            { accion: 'desaparecer', t: 2.3 }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', a: 'director', t: 2.4, color: '#fde68a' },
        { tipo: 'destellos', a: 'director', en: 'cabeza', t: 2.5, radio: 46, cantidad: 5 }
      ],
      textos: [
        { texto: '¡PIIIU...!', x: 650, y: 80, t: 0.4, dur: 1.8, tam: 32, color: '#fecaca', borde: '#7f1d1d' },
        { estilo: 'titulo', texto: '¡NUNCA ME RINDO!', x: 600, y: 105, t: 2.7, tam: 34 }
      ],
      sonido: [{ nombre: 'hackFail', t: 0.4 }, { nombre: 'pickup', t: 2.4 }]
    },

    // ---- 3 · Director: "Cargaré el puño de fuerza, el pulso eléctrico y mi
    //          mejor arma: el hackeo. Puertas, torretas, consolas..." -------
    // ¡Entrenamiento! ¡PUM! (puño de fuerza), ¡BZZT! (pulso eléctrico) contra
    // una torreta de prácticas... y el hackeo: la torreta se vuelve amiga y la
    // puerta se abre sola.
    {
      fondo: 'base',
      transicion: 'pagina',
      camara: { zoom: 1.1, x: 500, hasta: { zoom: 1.2, x: 560, y: 215 }, t: 2.2, dur: 1.6 },
      actores: [
        { quien: 'puerta', x: 800, estilo: 'base', escala: 1.1, z: -1,
          acciones: [{ accion: 'abrir', t: 3.6, dur: 0.9 }] },
        { quien: 'torreta', x: 600, facing: -1 },
        { quien: 'director', x: 300,
          acciones: [
            { accion: 'atacar', t: 0.3, veces: 2, cada: 0.3 },
            { accion: 'disparar', t: 1.2, a: 'torreta', proyectil: 'pulso' },
            { accion: 'hackear', t: 2.1, a: 'torreta', dur: 1.3, convierte: true },
            { accion: 'celebrar', t: 3.7, altura: 10 }
          ] }
      ],
      efectos: [
        { tipo: 'onda', x: 350, y: 270, t: 0.32, radio: 70 },
        { tipo: 'chispas', x: 600, y: 300, t: 1.45, color: '#67e8f9' },
        { tipo: 'destellos', x: 800, y: 200, t: 3.8, radio: 80, cantidad: 6 }
      ],
      textos: [
        { texto: '¡PUM!', x: 380, y: 160, t: 0.32, dur: 0.8, tam: 46 },
        { texto: '¡BZZT!', x: 600, y: 170, t: 1.45, dur: 0.8, tam: 42, color: '#cffafe', borde: '#0891b2' },
        { texto: '¡HACKEADA!', x: 560, y: 110, t: 3.45, dur: 1.4, tam: 36, color: '#bbf7d0', borde: '#15803d' }
      ],
      sonido: [{ nombre: 'bigPunch', t: 0.3 }, { nombre: 'zap', t: 1.2 }, { nombre: 'door', t: 3.6 }]
    },

    // ---- 4 · Narrador: "Con el chaleco puesto y las gafas brillando, el
    //          Director se preparó... Tenía que llegar hasta el hangar." ----
    // Primer plano: ¡las gafas brillan! La cámara se aleja y el Director sale
    // corriendo por la puerta abierta, rumbo al hangar.
    {
      fondo: 'base',
      camara: { zoom: 2.0, a: 'director', dy: -30, hasta: { zoom: 1.1, x: 560, y: 210 }, t: 1.6, dur: 1.4 },
      actores: [
        { quien: 'puerta', x: 800, estilo: 'base', escala: 1.1, z: -1, abierta: 1 },
        { quien: 'torreta', x: 600, facing: -1, hacked: true },
        { quien: 'director', x: 420, pose: 'win',
          acciones: [
            { accion: 'brillar', t: 0.4, dur: 1.6, color: 'rgba(56,189,248,0.8)' },
            { accion: 'correr', t: 2.3, hasta: { x: 800 }, dur: 0.9 },
            { accion: 'desaparecer', t: 3.2, color: '#67e8f9' }
          ] }
      ],
      efectos: [
        { tipo: 'destellos', a: 'director', en: 'cabeza', dy: 14, t: 0.4, dur: 1.8, radio: 26, cantidad: 4, tam: 2 },
        { tipo: 'velocidad', t: 2.3, dur: 1.2 },
        { tipo: 'brillo', x: 800, y: 210, radio: 110, color: 'rgba(34,211,238,0.5)', t: 2.3 }
      ],
      textos: [
        { texto: '¡TING!', x: 470, y: 150, t: 0.5, dur: 1.2, tam: 36, color: '#e0f2fe', borde: '#0284c7' },
        { estilo: 'titulo', texto: '¡AL HANGAR!', x: 480, y: 70, t: 2.4, tam: 42, pantalla: true }
      ],
      sonido: [{ nombre: 'select', t: 0.5 }, { nombre: 'boost', t: 2.3 }]
    }
  ] });

  // ===========================================================================
  //  EL DESPEGUE (tras el capítulo 2)
  //  El Director despega rumbo al bloqueo espacial.
  // ===========================================================================
  G.cine.register('s_despegue', { planos: [

    // ---- 0 · Narrador: "En el hangar de la base, las compuertas se abrieron
    //          con un rugido. La nave del Director brillaba..." -------------
    // Las compuertas gigantes se abren temblando (¡BRRROOOM!) y la luz cae
    // sobre la nave azul, que brilla. El Director la mira, orgulloso.
    {
      fondo: 'base',
      transicion: 'fundido',
      camara: { zoom: 1.2, x: 560, y: 210, hasta: { zoom: 1, x: 480 }, t: 1.6, dur: 2.2 },
      actores: [
        { quien: 'puerta', x: 640, estilo: 'base', luz: '#e0f2fe', escala: 1.35, z: -2,
          acciones: [{ accion: 'abrir', t: 0.3, dur: 1.6 }] },
        { quien: 'nave', x: 600, y: 300, escala: 1.15,
          acciones: [{ accion: 'brillar', t: 1.7, color: 'rgba(96,165,250,0.9)' }] },
        { quien: 'director', x: 260, pose: 'idle',
          acciones: [{ accion: 'cambiar', t: 2.2, cambia: { pose: 'win' } }] }
      ],
      efectos: [
        { tipo: 'temblor', t: 0.3, dur: 1.5, fuerza: 0.5 },
        { tipo: 'rayos', x: 640, y: 210, t: 1.5, color: '#bae6fd' },
        { tipo: 'destellos', x: 600, y: 250, t: 1.9, radio: 90, cantidad: 6 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'En el hangar...', t: 0.2 },
        { texto: '¡BRRROOOM!', x: 400, y: 140, t: 0.35, dur: 1.6, tam: 44, color: '#e0f2fe', borde: '#1d4ed8' },
        { texto: '¡TING!', x: 720, y: 190, t: 2.0, dur: 1.2, tam: 34, color: '#fef9c3', borde: '#ca8a04' }
      ],
      sonido: [{ nombre: 'door', t: 0.3 }, { nombre: 'roar', t: 0.4 }, { nombre: 'pickup', t: 1.9 }]
    },

    // ---- 1 · Director: "Motores al máximo. Escudos preparados. Rumbo: el
    //          espacio, donde retienen a Falcon." ---------------------------
    // El Director salta a la cabina. Se encienden los escudos (burbuja azul) y
    // los motores rugen con humo.
    {
      fondo: 'base',
      habla: 'nave',
      camara: { zoom: 1.5, a: 'nave', dx: -60, dy: -20 },
      actores: [
        { quien: 'puerta', x: 640, estilo: 'base', luz: '#e0f2fe', escala: 1.35, z: -2, abierta: 1 },
        { quien: 'nave', x: 600, y: 300, escala: 1.15,
          acciones: [
            { accion: 'cambiar', t: 1.9, cambia: { escudo: '#60a5fa' }, destello: '#bfdbfe' },
            { accion: 'temblar', t: 1.0, fuerza: 0.5 }
          ] },
        { quien: 'director', x: 460,
          acciones: [
            { accion: 'saltar', t: 0.2, hasta: { x: 600 }, altura: 90, dur: 0.6 },
            { accion: 'desaparecer', t: 0.75, color: '#93c5fd' }
          ] }
      ],
      efectos: [
        { tipo: 'humo', x: 500, y: 320, t: 1.0, cantidad: 6, alto: 90, color: 'rgba(203,213,225,0.7)' },
        { tipo: 'lineasAccion', a: 'nave', t: 1.9, radio: 190, alpha: 0.3 }
      ],
      textos: [
        { texto: '¡BRUUUM!', x: 470, y: 145, t: 1.0, dur: 1.4, tam: 40, color: '#fde68a', borde: '#c2410c' },
        { texto: '¡ESCUDOS!', x: 650, y: 105, t: 2.0, tam: 36, color: '#dbeafe', borde: '#1d4ed8' }
      ],
      sonido: [{ nombre: 'jump', t: 0.2 }, { nombre: 'boost', t: 1.0 }, { nombre: 'shieldBlock', t: 1.9 }]
    },

    // ---- 2 · Director: "Aguanta un poco más, amigo. Ya voy de camino." ----
    // La nave se eleva despacio por la compuerta. El Director piensa en Falcon,
    // encerrado en la celda de energía.
    {
      fondo: 'base',
      habla: 'nave',
      camara: { zoom: 1.2, x: 600, y: 210, hasta: { zoom: 1.3, a: 'nave', dx: -40, dy: 20 }, t: 0.3, dur: 2.4 },
      actores: [
        { quien: 'puerta', x: 640, estilo: 'base', luz: '#e0f2fe', escala: 1.35, z: -2, abierta: 1 },
        { quien: 'nave', x: 600, y: 300, escala: 1.15, escudo: '#60a5fa',
          acciones: [
            { accion: 'volar', t: 0.3, hasta: { x: 640, y: 175 }, dur: 2.2 },
            { accion: 'cambiar', t: 2.5, cambia: { tilt: -0.6 } },
            { accion: 'flotar', t: 2.5, altura: 6 }
          ] }
      ],
      efectos: [
        { tipo: 'humo', x: 600, y: 325, t: 0.2, cantidad: 7, alto: 110, color: 'rgba(203,213,225,0.7)' },
        { tipo: 'polvo', x: 600, y: 330, t: 0.3, repetir: 0.5, dur: 2.0 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'nave', dibujo: 'celda', t: 1.0, lado: 'izquierda' },
        { texto: '¡FIUUU...!', x: 790, y: 300, t: 0.4, dur: 2.0, tam: 32, color: '#fde68a', borde: '#c2410c' }
      ],
      sonido: [{ nombre: 'jetpack', t: 0.3 }]
    },

    // ---- 3 · Narrador: "La nave azul salió disparada hacia las estrellas,
    //          dejando atrás una estela de luz." ----------------------------
    // ¡Al espacio! La nave cruza la pantalla a toda velocidad con una estela de
    // luz azul y se pierde entre las estrellas.
    {
      fondo: 'espacio',
      transicion: 'pagina',
      fondoVel: 260,
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'nave', x: 520, y: 220, escala: 1,
          acciones: [
            { accion: 'entrar', t: 0.1, desde: 'izquierda', dur: 0.9 },
            { accion: 'flotar', t: 1.0, altura: 10, dur: 1.6 },
            { accion: 'volar', t: 2.6, hasta: { x: 1100, y: 90 }, dur: 0.8 }
          ] }
      ],
      efectos: [
        { tipo: 'estela', a: 'nave', t: 0.1, color: '#60a5fa', tam: 18 },
        { tipo: 'velocidad', t: 0.1 },
        { tipo: 'destellos', x: 820, y: 110, t: 3.4, cantidad: 3, radio: 20, tam: 2.4 },
        { tipo: 'lluviaEstrellas', t: 2.6 }
      ],
      textos: [
        { texto: '¡ZIUUUM!', x: 330, y: 110, t: 0.3, dur: 2.0, tam: 50, color: '#bfdbfe', borde: '#1d4ed8' },
        { estilo: 'titulo', texto: '¡RUMBO A LAS ESTRELLAS!', x: 480, y: 290, t: 3.0, tam: 34, pantalla: true }
      ],
      sonido: [{ nombre: 'boost', t: 0.1 }, { nombre: 'boost', t: 2.6 }]
    }
  ] });

  // ===========================================================================
  //  CAPÍTULO 3 · BATALLA ESPACIAL
  //  El espacio está bloqueado por la flota; hackea algunas, destruye las demás.
  // ===========================================================================
  G.cine.register('s_cap3', { planos: [

    // ---- 0 · Narrador: "Al salir de la atmósfera, el Director descubrió la
    //          verdad: el cielo estaba bloqueado." --------------------------
    // La nave llega tranquila... la cámara se desliza a la derecha y ¡zas!:
    // aparecen tres Naves Guardianas cortando el paso.
    {
      fondo: 'espacio',
      transicion: 'fundido',
      camara: { zoom: 1.3, x: 330, y: 200, hasta: { zoom: 1, x: 480 }, t: 1.3, dur: 1.4 },
      actores: [
        { quien: 'nave', x: 250, y: 220,
          acciones: [
            { accion: 'entrar', t: 0, desde: 'izquierda', dur: 1.0 },
            { accion: 'asustarse', t: 2.0 },
            { accion: 'flotar', t: 2.4, altura: 6 }
          ],
          bocadillo: '!', bocadilloT: 2.0 },
        { quien: 'naveEnemiga', alias: 'g1', x: 680, y: 170, tipo: 'guardian', facing: -1,
          acciones: [{ accion: 'aparecer', t: 1.5, color: '#fca5a5' }] },
        { quien: 'naveEnemiga', alias: 'g2', x: 790, y: 250, tipo: 'guardian', facing: -1,
          acciones: [{ accion: 'aparecer', t: 1.75, color: '#fca5a5' }] },
        { quien: 'naveEnemiga', alias: 'g3', x: 630, y: 320, tipo: 'guardian', facing: -1,
          acciones: [{ accion: 'aparecer', t: 2.0, color: '#fca5a5' }] }
      ],
      efectos: [
        { tipo: 'lineasAccion', x: 700, y: 210, t: 2.0, radio: 220, alpha: 0.35, color: '#fecaca' }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Al salir de la atmósfera...', t: 0.2 },
        { estilo: 'titulo', texto: '¡BLOQUEADO!', x: 480, y: 62, t: 2.2, tam: 38, color: '#fecaca', borde: '#7f1d1d', pantalla: true }
      ],
      sonido: [{ nombre: 'boost', t: 0 }, { nombre: 'robot', t: 1.5 }, { nombre: 'hurt', t: 2.0 }]
    },

    // ---- 1 · Director: "Una flota entera de Naves Guardianas... custodian la
    //          fortaleza de Dark Toros. Es casi imposible pasar." -----------
    // Travelling: detrás de las Naves Guardianas, enorme y oscura, la fortaleza
    // de Dark Toros (la Nave Nodriza). La nave del Director, pequeñita.
    {
      fondo: 'espacio',
      habla: 'nave',
      camara: { zoom: 1.15, x: 380, y: 200, hasta: { zoom: 1, x: 520 }, t: 0.3, dur: 2.8 },
      actores: [
        { quien: 'naveNodriza', x: 730, y: 250, escala: 0.75, z: -2,
          acciones: [
            { accion: 'aparecer', t: 0.6, color: '#fca5a5' },
            { accion: 'brillar', t: 1.2, color: 'rgba(239,68,68,0.45)', fuerza: 1.2 }
          ] },
        { quien: 'naveEnemiga', alias: 'g1', x: 520, y: 150, tipo: 'guardian', facing: -1 },
        { quien: 'naveEnemiga', alias: 'g2', x: 560, y: 320, tipo: 'guardian', facing: -1 },
        { quien: 'nave', x: 200, y: 220, escala: 0.85,
          acciones: [{ accion: 'temblar', t: 2.0, fuerza: 0.4 }] }
      ],
      efectos: [
        { tipo: 'senal', a: 'g1', t: 0.4, color: '#f87171', radio: 60 },
        { tipo: 'senal', a: 'g2', t: 0.7, color: '#f87171', radio: 60 }
      ],
      textos: [
        { estilo: 'bocadillo', texto: '¡Glups!', a: 'nave', t: 2.0, lado: 'izquierda' },
        { estilo: 'titulo', texto: 'LA FORTALEZA DE DARK TOROS', x: 700, y: 62, t: 1.2, tam: 20, color: '#fecaca', borde: '#7f1d1d' }
      ],
      sonido: [{ nombre: 'robot', t: 0.6 }]
    },

    // ---- 2 · Director: "Casi imposible... no significa imposible. Hackearé
    //          algunas naves para que luchen de mi lado y destruiré las demás."
    // Primer plano de la nave: el Director tiene un plan. En su pensamiento,
    // una Nave Guardiana hackeada (¡verde y amiga!). Rayos de valor.
    {
      fondo: 'espacio',
      habla: 'nave',
      camara: { zoom: 1.7, a: 'nave', dx: 110, dy: -45 },
      actores: [
        { quien: 'nave', x: 300, y: 290, escala: 1.1,
          acciones: [
            { accion: 'flotar', altura: 6 },
            { accion: 'brillar', t: 2.3, color: 'rgba(253,224,71,0.85)' }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', a: 'nave', t: 2.3, color: '#fde68a' },
        { tipo: 'destellos', a: 'nave', t: 2.4, radio: 70, cantidad: 6 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'nave', dibujo: 'naveEnemiga', opciones: { tipo: 'guardian', hacked: true }, t: 0.5, lado: 'derecha' },
        { estilo: 'titulo', texto: '¡NO ES IMPOSIBLE!', x: 700, y: 290, t: 2.4, tam: 34, pantalla: true }
      ],
      sonido: [{ nombre: 'hackOk', t: 0.6 }, { nombre: 'pickup', t: 2.3 }]
    },

    // ---- 3 · Narrador: "Rayo láser en una mano, rayo de hackeo en la otra.
    //          La batalla espacial estaba a punto de comenzar." -------------
    // ¡Acción! Láser contra una Guardiana (¡POP! con tuercas y tornillos) y
    // rayo de hackeo a la otra, que se vuelve verde y se pone de su lado.
    {
      fondo: 'espacio',
      fondoVel: 80,
      camara: { zoom: 1.05, x: 500, hasta: { zoom: 1.15, x: 520, y: 200 }, t: 2.8, dur: 1.8 },
      actores: [
        { quien: 'nave', x: 230, y: 230,
          acciones: [
            { accion: 'disparar', t: 0.4, a: 'g1', proyectil: 'laser', veces: 2, cada: 0.3 },
            { accion: 'hackear', t: 1.7, a: 'g2', dur: 1.3, convierte: true },
            { accion: 'flotar', t: 3.0, altura: 8 }
          ] },
        { quien: 'naveEnemiga', alias: 'g1', x: 660, y: 165, tipo: 'guardian', facing: -1,
          acciones: [{ accion: 'pop', t: 1.05 }] },
        { quien: 'naveEnemiga', alias: 'g2', x: 700, y: 300, tipo: 'guardian', facing: -1,
          acciones: [
            { accion: 'mirar', t: 3.2, mirar: 'derecha' },
            { accion: 'flotar', t: 3.2, altura: 8 }
          ] }
      ],
      efectos: [
        { tipo: 'chispas', x: 660, y: 140, t: 0.75, color: '#fca5a5' },
        { tipo: 'destellos', a: 'g2', t: 3.0, radio: 60, cantidad: 6 },
        { tipo: 'lluviaEstrellas', t: 3.2, alpha: 0.6 }
      ],
      textos: [
        { texto: '¡PIU! ¡PIU!', x: 430, y: 120, t: 0.4, dur: 0.9, tam: 38, color: '#fecaca', borde: '#dc2626' },
        { texto: '¡POP!', x: 610, y: 105, t: 1.05, dur: 1.3, tam: 48, estallido: true },
        { texto: '¡BZZZT!', x: 470, y: 300, t: 1.8, dur: 1.2, tam: 36, color: '#bbf7d0', borde: '#15803d' },
        { estilo: 'titulo', texto: '¡A LA BATALLA!', x: 480, y: 70, t: 3.2, tam: 44, pantalla: true }
      ]
    }
  ] });
})();
