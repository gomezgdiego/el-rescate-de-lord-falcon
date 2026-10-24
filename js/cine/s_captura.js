// =============================================================================
// s_captura.js — Historia animada de MUESTRA: "La captura" (Parte 1, entre el
// capítulo 1 y el 2). Es el EJEMPLO DE CALIDAD para los directores de cine.
// Manual: docs/cine-api.md. Motor: js/cine.js.
//
// Un plano por cada línea de G.storyData.s_captura (8 líneas). Recuerda:
//   · La ACCIÓN va en y = 0…345 (el panel de diálogo tapa lo de abajo).
//   · Pies en y = 330 (el suelo). x va de 0 a 960.
//   · Mismo fondo + transición 'corte' = CONTINUIDAD: los actores con el mismo
//     nombre se deslizan desde donde estaban y la cámara se mueve suave.
//   · Para nombrar a un actor usa "alias" (nunca la clave "id"): los tests de la
//     API leen id/story/scene/next/music con texto entre comillas como nombres
//     de historias, escenas o músicas.
// =============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  if (!G.cine || typeof G.cine.register !== 'function') return;

  G.cine.register('s_captura', { planos: [

    // ---- 0 · Falcon: "¡Te tengo, Dark Toros! ¡Prepárate..." -----------------
    // ¡Emboscada! Falcon salta desde las rocas del cañón. Dark Toros, de
    // espaldas, se da la vuelta... y su Escudo de Poder ya está encendido.
    {
      fondo: 'canyon',
      transicion: 'fundido',                       // entra suave desde la escena anterior
      camara: { zoom: 1.12, x: 470, hasta: { zoom: 1.3, x: 440 }, t: 0.9, dur: 2.8 },   // se acerca despacio
      actores: [
        { quien: 'toros', x: 715, facing: 1, escudo: true,          // de espaldas…
          acciones: [
            { accion: 'mirar', t: 1.25, mirar: 'falcon' },            // …se gira hacia Falcon…
            { accion: 'brillar', t: 1.6, color: 'rgba(251,146,60,0.9)' }   // …y el escudo se enciende
          ],
          bocadillo: '!', bocadilloT: 1.3 },
        { quien: 'falcon', x: 300, pose: 'attack',
          accion: 'entrar', desde: 'izquierda', arco: 150, dur: 1.0 }   // salto en arco desde fuera
      ],
      textos: [
        { texto: '¡HIYAAA!', x: 420, y: 110, t: 0.15, dur: 1.5, tam: 46 }   // fuera del arco del salto
      ],
      sonido: [{ nombre: 'jump', t: 0.1 }, { nombre: 'hit', t: 1.0 }]
    },

    // ---- 1 · Narrador: flechas y espadazos... todo rebota en el Escudo -------
    // Tres flechas que rebotan (¡CLINC!), una carrera, dos espadazos... y Falcon
    // sale despedido hacia atrás, mareado.
    {
      fondo: 'canyon',                             // mismo fondo + corte = continuidad
      camara: { zoom: 1.16, x: 505 },
      actores: [
        { quien: 'toros', x: 715, facing: -1, escudo: true },
        { quien: 'falcon', x: 300,
          acciones: [
            // el escudo empieza ~90 px antes que su cuerpo: apuntamos al borde del escudo
            { accion: 'disparar', t: 0.2, veces: 3, cada: 0.45, proyectil: 'flecha', rebota: true, hasta: { x: 610, y: 236 } },
            { accion: 'correr', t: 1.7, hasta: { x: 548 } },
            { accion: 'atacar', t: 2.2, veces: 2, cada: 0.3 },
            { accion: 'retroceder', t: 2.85, distancia: 120 }
          ] }
      ],
      efectos: [
        { tipo: 'chispas', x: 610, y: 236, t: 0.46 },
        { tipo: 'chispas', x: 610, y: 236, t: 0.91 },
        { tipo: 'chispas', x: 610, y: 236, t: 1.36 },
        { tipo: 'chispas', x: 612, y: 230, t: 2.25, cantidad: 16 },
        { tipo: 'temblor', t: 2.85, fuerza: 0.6 },
        { tipo: 'estrellas', a: 'falcon', en: 'cabeza', dy: -8, t: 3.25 }
      ],
      textos: [
        { texto: '¡CLINC!', x: 560, y: 150, t: 0.5, dur: 0.8, tam: 44 },
        { texto: '¡CLANC!', x: 760, y: 80, t: 0.95, dur: 0.8, tam: 44 },   // lejos del otro: no se pisan
        { texto: '¡CLINC!', x: 560, y: 150, t: 1.4, dur: 0.8, tam: 44 },
        { texto: '¡ZAS!', x: 560, y: 120, t: 2.25, dur: 0.6, tam: 50, color: '#e0f2fe', borde: '#0ea5e9' },
        { texto: '¡BOING!', x: 470, y: 115, t: 2.9, tam: 52, estallido: true }
      ],
      sonido: [{ nombre: 'shieldBlock', t: 2.3 }, { nombre: 'hurt', t: 2.9 }]
    },

    // ---- 2 · Dark Toros: "¿De verdad creíste...? ¡Tus flechas no son nada...!"
    // Primer plano de Dark Toros riéndose, con el escudo brillando. Las flechas,
    // tiradas y rotas a sus pies. Falcon, mareado, al fondo a la izquierda.
    {
      fondo: 'canyon',
      camara: { zoom: 1.55, a: 'toros', dx: -40, dy: -6 },
      actores: [
        // flechas clavadas en el suelo (la punta hacia abajo, dentro del suelo)
        { quien: 'flecha', alias: 'f1', x: 596, y: 322, angulo: 1.05, z: -1 },
        { quien: 'flecha', alias: 'f2', x: 640, y: 324, angulo: 2.25, z: -1 },
        { quien: 'flecha', alias: 'f3', x: 566, y: 326, angulo: 1.35, z: -1 },
        { quien: 'falcon', x: 430, pose: 'hurt' },
        { quien: 'toros', x: 715, facing: -1, escudo: true,
          acciones: [
            { accion: 'reir', t: 0.35, texto: '¡JA!' },
            { accion: 'brillar', color: 'rgba(251,146,60,0.95)', fuerza: 1.3 }
          ] }
      ],
      efectos: [
        { tipo: 'estrellas', a: 'falcon', en: 'cabeza', dy: -8 },
        { tipo: 'lineasAccion', a: 'toros', radio: 210, alpha: 0.35, t: 0.3 }
      ]
    },

    // ---- 3 · Dark Toros: "Te usaré de carnada. Tu amiguito el Director..." --
    // Toros avanza hacia Falcon (que se asusta) y "piensa" en su plan: el
    // Director vendrá a salvarlo... ¡y atrapará a los dos!
    {
      fondo: 'canyon',
      camara: { zoom: 1.28, x: 545 },
      actores: [
        { quien: 'falcon', x: 400,
          acciones: [{ accion: 'asustarse', t: 0.5 }] },
        { quien: 'toros', x: 715, facing: -1, escudo: true,
          acciones: [
            { accion: 'caminar', t: 0.15, hasta: { x: 640 }, dur: 1.1 },
            { accion: 'cambiar', t: 2.6, cambia: { pose: 'roar' } },   // ¡levanta el martillo!
            { accion: 'temblar', t: 2.6, fuerza: 0.6 }
          ] }
      ],
      efectos: [
        { tipo: 'brillo', a: 'toros', en: 'cabeza', dx: 40, dy: 10, t: 2.6, radio: 90, color: 'rgba(225,29,72,0.8)' }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'toros', dibujo: ['director', 'falcon'], t: 1.0, lado: 'izquierda' }
      ],
      sonido: [{ nombre: 'roar', t: 2.6 }]
    },

    // ---- 4 · Narrador: "Con un rugido, Dark Toros atrapó a Lord Falcon..." ---
    // ¡RUGIDO! ¡ZZZAP! Falcon queda encerrado en la celda de energía y Dark
    // Toros se lo lleva arrastrando hacia el cielo... rumbo a su fortaleza.
    {
      fondo: 'canyon',
      camara: { zoom: 1.2, x: 520, hasta: { zoom: 1.2, x: 640, y: 150 }, t: 2.2, dur: 2.2 },
      actores: [
        { quien: 'falcon', x: 420,
          acciones: [
            { accion: 'atrapado', t: 1.05 },
            { accion: 'volar', t: 2.3, hasta: { x: 1010, y: -70 }, dur: 2.6 }   // ¡al cielo!
          ] },
        { quien: 'toros', x: 640, facing: -1, escudo: true,
          acciones: [
            { accion: 'rugir', t: 0.1, dur: 1.2 },
            { accion: 'salir', t: 2.0, hacia: 'derecha', dur: 1.8 }
          ] }
      ],
      efectos: [
        { tipo: 'onda', a: 'toros', en: 'pies', t: 0.15, radio: 170 },
        { tipo: 'flash', t: 1.05, color: '#fed7aa' },
        { tipo: 'chispas', a: 'falcon', t: 1.05, cantidad: 16, color: '#fb923c' },
        { tipo: 'estela', a: 'falcon', t: 2.3, color: '#fdba74', tam: 22 },
        { tipo: 'destellos', x: 850, y: 78, t: 4.5, cantidad: 3, radio: 18, tam: 2.4 }   // ¡ting! se pierde en el cielo
      ],
      textos: [
        { texto: '¡GRRROAAAR!', x: 470, y: 92, t: 0.15, dur: 0.95, tam: 46, estallido: '#fef3c7', color: '#fb923c', borde: '#7c2d12' },
        { texto: '¡ZZZAP!', a: 'falcon', t: 1.1, dur: 1.2, tam: 46, color: '#fdba74', borde: '#c2410c' },
        { texto: '¡FIUUU!', x: 740, y: 120, t: 2.8, dur: 1.5, tam: 40, color: '#fef3c7', borde: '#f97316' }
      ]
    },

    // ---- 5 · Narrador: "Muy lejos de allí, el reloj del Director..." --------
    // Pasamos la página: la base del Director. Primero, el reloj parpadeando
    // con la señal de Falcon; la cámara se aleja y vemos al Director... cuyo
    // corazón se llena de valor.
    {
      fondo: 'base',
      transicion: 'pagina',
      camara: { zoom: 1.8, a: 'reloj', hasta: { zoom: 1.22, x: 480, y: 215 }, t: 1.0, dur: 2.0 },
      actores: [
        { quien: 'director', x: 330, pose: 'hack',
          acciones: [{ accion: 'cambiar', t: 2.9, cambia: { pose: 'win' } }] },
        { quien: 'reloj', x: 655, y: 300, escala: 1.15,
          acciones: [{ accion: 'flotar', altura: 6 }, { accion: 'brillar', color: 'rgba(34,211,238,0.8)' }] },
        { quien: 'corazon', x: 334, y: 318, z: 2, escala: 0.7,       // en el pecho, sin tapar la cara
          acciones: [
            { accion: 'aparecer', t: 2.7, color: '#fecdd3' },
            { accion: 'crecer', t: 2.7, factor: 1.25, dur: 0.6 },
            { accion: 'brillar', t: 2.7, color: 'rgba(255,90,122,0.9)' }
          ] }
      ],
      efectos: [
        { tipo: 'senal', x: 676, y: 214, color: '#4ade80', radio: 70 },
        { tipo: 'rayos', a: 'director', t: 2.7, color: '#fde68a' }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Muy lejos de allí...', t: 0.35 },
        { texto: '¡BIP, BIP!', x: 760, y: 120, t: 0.4, dur: 2.2, tam: 34, color: '#a7f3d0', borde: '#059669' },
        { texto: '¡BUM, BUM!', x: 410, y: 135, t: 3.0, tam: 36, color: '#fecdd3', borde: '#e11d48' }
      ],
      sonido: [{ nombre: 'checkpoint', t: 0.4 }, { nombre: 'pickup', t: 2.7 }]
    },

    // ---- 6 · Director: "Resiste, Falcon. Voy por ti." -------------------------
    // Primer plano del Director, decidido, pensando en su amigo atrapado.
    {
      fondo: 'base',
      camara: { zoom: 1.7, a: 'director', dx: 70, dy: -14 },
      actores: [
        { quien: 'director', x: 400, pose: 'win',
          acciones: [{ accion: 'cambiar', t: 0.9, cambia: { pose: 'attack' } }, { accion: 'temblar', t: 0.9, dur: 0.3 }] },
        { quien: 'reloj', x: 655, y: 300, escala: 1.15, accion: 'desaparecer', dur: 0.4 }
      ],
      efectos: [
        { tipo: 'rayos', a: 'director', color: '#bae6fd' },
        { tipo: 'viento', t: 0.9, alpha: 0.8 },
        { tipo: 'destellos', a: 'director', en: 'cabeza', radio: 40, cantidad: 4, t: 0.9 }
      ],
      textos: [
        { estilo: 'pensamiento', a: 'director', dibujo: 'celda', t: 0.4, lado: 'derecha' }
      ]
    },

    // ---- 7 · Narrador: "Y lo tuvo clarísimo: aunque fuera lo último..." -------
    // La frase de Juanjo. Pose de héroe con rayos dorados... ¡y sale corriendo
    // al rescate!
    {
      fondo: 'base',
      camara: { zoom: 1.3, a: 'director', dy: -20, hasta: { zoom: 1 }, t: 0.2, dur: 1.8 },
      actores: [
        { quien: 'director', x: 440, pose: 'win',
          acciones: [
            { accion: 'celebrar', t: 0.3, dur: 1.4, altura: 10 },
            { accion: 'salir', t: 2.4, hacia: 'derecha', dur: 0.8 }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', x: 440, y: 250, color: '#fde68a' },
        { tipo: 'destellos', x: 440, y: 200, radio: 130, cantidad: 9 },
        { tipo: 'velocidad', t: 2.4, dur: 1.2 },
        { tipo: 'polvo', x: 560, y: 330, t: 2.6 }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡AL RESCATE!', x: 480, y: 70, t: 1.2, pantalla: true }
      ],
      sonido: [{ nombre: 'boost', t: 2.4 }]
    }
  ] });
})();
