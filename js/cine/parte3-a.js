// =============================================================================
// parte3-a.js — Guiones animados de la PARTE 3 "We Are a Team" (primera mitad):
//   s3_cap1, s3_tras1, s3_cap2, s3_tras2, s3_cap3.
// Dueño: historia-cine-a (contrato técnico de la Parte 3, §15.2).
// Un plano por cada línea de js/p3/historia3.js (los textos NO se cambian aquí).
// Manual: docs/cine-api.md (§16 = lo nuevo de la Parte 3).
// Reglas: Dark Secuaz siempre BUENO; Robovill nunca hace pop; las bolas de
// Mikey son de energía AZUL; sin sangre; nada que dé miedo de verdad.
// =============================================================================
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  if (!G.cine || typeof G.cine.register !== 'function') return;   // nunca romper si falta el motor

  // Colores de las onomatopeyas
  var VERDE = { color: '#bbf7d0', borde: '#15803d' };
  var AZUL = { color: '#bfdbfe', borde: '#1d4ed8' };
  var ROJO = { color: '#fecaca', borde: '#991b1b' };
  var CIAN = { color: '#cffafe', borde: '#0e7490' };
  function txt(o, estilo) { for (var k in estilo) if (Object.prototype.hasOwnProperty.call(estilo, k)) o[k] = estilo[k]; return o; }

  // ===========================================================================
  //  s3_cap1 — Entrenamiento en el cielo (8 líneas)
  // ===========================================================================
  G.cine.register('s3_cap1', { planos: [

    // 0 · Juanjo: muchos robots se volvieron buenos... pero otros no.
    // Dark Secuaz (verde) con sus robots buenos; tres robots rojos se dan la vuelta y se van.
    {
      fondo: 'baseCielo',
      transicion: 'fundido',
      camara: { zoom: 1.05, x: 470, hasta: { zoom: 1.12, x: 520 }, t: 0.6, dur: 3 },
      actores: [
        { quien: 'secuaz', x: 430, escala: 0.82, bueno: true,
          acciones: [{ accion: 'celebrar', t: 0.1, dur: 1.4, altura: 8 }, { accion: 'mirar', t: 1.6, mirar: 'derecha' }],
          bocadillo: '¿Eh?', bocadilloT: 2.3 },
        { quien: 'boxeador', alias: 'bueno1', x: 190, hacked: true, escala: 0.85, accion: 'celebrar', t: 0.2 },
        { quien: 'miniTorreta', alias: 'bueno2', x: 290, hacked: true, acciones: [{ accion: 'saltar', t: 0.4, veces: 3, altura: 30, dur: 0.5 }] },
        { quien: 'dronEnjambre', alias: 'bueno3', x: 230, y: 170, hacked: true },
        { quien: 'boxeador', alias: 'malo1', x: 650, escala: 0.85, facing: -1,
          acciones: [{ accion: 'mirar', t: 1.2, mirar: 'derecha' }, { accion: 'salir', t: 1.6, hacia: 'derecha', dur: 1.5 }],
          bocadillo: '¡BAH!', bocadilloT: 1.0 },
        { quien: 'robotEscudo', alias: 'malo2', x: 770, escala: 0.85, facing: -1,
          acciones: [{ accion: 'mirar', t: 1.4, mirar: 'derecha' }, { accion: 'salir', t: 1.8, hacia: 'derecha', dur: 1.5 }] },
        { quien: 'dronRayo', alias: 'malo3', x: 700, y: 140, facing: -1,
          acciones: [{ accion: 'salir', t: 2.0, hacia: 'derecha', dur: 1.3 }] }
      ],
      efectos: [
        { tipo: 'corazones', x: 240, y: 230, cantidad: 4, alto: 110 },
        { tipo: 'destellos', a: 'secuaz', radio: 90, color: '#86efac' }
      ],
      textos: [txt({ texto: '¡NO, GRACIAS!', x: 760, y: 70, t: 1.2, dur: 1.6, tam: 34 }, ROJO)],
      sonido: [{ nombre: 'robot', t: 1.2 }]
    },

    // 1 · Papá: en la fábrica crearon a ROBOVILL, ¡un robot MÁS GRANDE QUE DARK SECUAZ!
    // Robovill sale del suelo junto a una silueta de Dark Secuaz (cartel de medida) y le saca
    // la cabeza de sobra (≈ 1,5 veces): la raya de medida se queda por debajo de sus hombros.
    {
      fondo: 'fabricaOscura',
      transicion: 'pagina',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.06, x: 490, y: 185 }, t: 2.8, dur: 1.4 },
      actores: [
        { quien: 'siluetaSecuaz', alias: 'medida', x: 320, escala: 0.85, opacidad: 0.6, linea: 300, z: -1,
          acciones: [{ accion: 'aparecer', t: 0.5, color: '#86efac' }] },
        { quien: 'robovill', x: 600, taladro: 1,
          acciones: [{ accion: 'levantarse', t: 0.9, dur: 1.8 }, { accion: 'rugir', t: 3.4 }, { accion: 'brillar', t: 3.4, color: 'rgba(248,113,113,0.7)' }] },
        { quien: 'boxeador', alias: 'r1', x: 110, escala: 0.7, acciones: [{ accion: 'asustarse', t: 1.1 }, { accion: 'celebrar', t: 3.2 }] },
        { quien: 'robotArana', alias: 'r2', x: 195, escala: 0.75, acciones: [{ accion: 'saltar', t: 3.2, veces: 2, altura: 30, dur: 0.5 }] },
        { quien: 'boxeador', alias: 'r3', x: 870, escala: 0.7, facing: -1, acciones: [{ accion: 'asustarse', t: 1.2 }, { accion: 'celebrar', t: 3.3 }] },
        { quien: 'dronRayo', alias: 'r4', x: 830, y: 110, facing: -1 }
      ],
      efectos: [
        { tipo: 'chispas', x: 600, y: 330, t: 0.9, repetir: 0.35, dur: 1.8 },
        { tipo: 'humo', x: 600, y: 330, t: 0.9, color: '#94a3b8' },
        { tipo: 'flash', t: 3.4, color: '#fecaca' }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Mientras tanto, en la vieja fábrica...', t: 0.35, dur: 2.3 },
        txt({ texto: '¡MÁS GRANDE QUE DARK SECUAZ!', x: 330, y: 92, t: 2.2, dur: 1.4, tam: 26, rot: -0.04 }, VERDE),
        { estilo: 'titulo', texto: '¡ROBOVILL!', x: 480, y: 64, t: 3.6, tam: 62, color: '#fca5a5', borde: '#450a0a', pantalla: true }
      ],
      sonido: [{ nombre: 'rumble', t: 0.9 }, { nombre: 'drill', t: 1.2 }]
    },

    // 2 · Juanjo: volar, ir bajo tierra, destruir... más armas de las que te imaginas.
    // Cambia de brazo una y otra vez, y piensa en Dark Toros y Dark Secuaz: ¡de un golpe!
    {
      fondo: 'fabricaOscura',
      camara: { zoom: 1.05, x: 470, hasta: { zoom: 1, x: 480 }, t: 2.4, dur: 1.5 },
      actores: [
        { quien: 'robovill', x: 330, taladro: 1,
          acciones: [
            { accion: 'cambiar', t: 0.3, cambia: { brazo: 'sierra' }, destello: '#fde047' },
            { accion: 'cambiar', t: 0.9, cambia: { brazo: 'canon' }, destello: '#fde047' },
            { accion: 'cambiar', t: 1.5, cambia: { brazo: 'pinza' }, destello: '#fde047' },
            { accion: 'cambiar', t: 2.1, cambia: { brazo: 'martillo' }, destello: '#fde047' },
            { accion: 'reir', t: 2.6, texto: '¡JA!' }
          ] }
      ],
      textos: [
        txt({ texto: '¡CLANC!', x: 560, y: 120, t: 0.3, dur: 0.6, tam: 40 }, ROJO),
        txt({ texto: '¡ZAS!', x: 600, y: 210, t: 0.9, dur: 0.6, tam: 40 }, ROJO),
        txt({ texto: '¡CLIC!', x: 540, y: 160, t: 1.5, dur: 0.6, tam: 40 }, ROJO),
        txt({ texto: '¡BONK!', x: 600, y: 110, t: 2.1, dur: 0.6, tam: 40 }, ROJO),
        { estilo: 'pensamiento', a: 'robovill', lado: 'derecha', dx: 70, dibujo: ['toros', 'secuaz'], opciones: { bueno: true },
          texto: '¡DE UN GOLPE!', t: 2.8 }
      ],
      sonido: [{ nombre: 'transform', t: 0.3 }, { nombre: 'transform', t: 0.9 }, { nombre: 'transform', t: 1.5 }, { nombre: 'transform', t: 2.1 }]
    },

    // 3 · Papá: Falcon y el Director conocen a Mikey Stark y Peter Rogers.
    {
      fondo: 'baseCielo',
      transicion: 'pagina',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.12, x: 520 }, t: 1.8, dur: 2 },
      actores: [
        { quien: 'director', x: 240 },
        { quien: 'falcon', x: 360 },
        { quien: 'mikey', x: 640, facing: -1,
          acciones: [{ accion: 'entrar', t: 0.4, desde: 'derecha', arco: 110, dur: 0.9, mirar: 'izquierda' }, { accion: 'celebrar', t: 2.0, dur: 1.6 }],
          bocadillo: '¡Hola!', bocadilloT: 1.5 },
        { quien: 'peter', x: 770, facing: -1, modoEscudo: 'fuera',   // aún no tiene escudo: lo elige en el plano 6
          acciones: [{ accion: 'entrar', t: 0.8, desde: 'derecha', arco: 110, dur: 0.9, mirar: 'izquierda' }, { accion: 'celebrar', t: 2.2, dur: 1.6 }] }
      ],
      efectos: [{ tipo: 'destellos', x: 700, y: 250, t: 1.4, radio: 110, color: '#fde68a' }],
      textos: [{ estilo: 'cartel', texto: 'En la fortaleza del cielo...', t: 0.35 }],
      sonido: [{ nombre: 'jump', t: 0.4 }, { nombre: 'jump', t: 0.8 }, { nombre: 'select', t: 2.0 }]
    },

    // 4 · Falcon: ¡Yo os entrenaré! Dark Secuaz ayuda con sus robots de práctica (verdes, con diana).
    {
      fondo: 'baseCielo',
      camara: { zoom: 1.02, x: 480 },
      actores: [
        { quien: 'director', x: 130 },
        { quien: 'falcon', x: 260, acciones: [{ accion: 'atacar', t: 0.3, veces: 2, cada: 0.3 }, { accion: 'senalar', t: 1.4, a: 'practica', dur: 1.6 }] },
        { quien: 'mikey', x: 390, facing: -1, acciones: [{ accion: 'mirar', t: 1.8, mirar: 'derecha' }] },
        { quien: 'peter', x: 490, facing: -1, modoEscudo: 'fuera', acciones: [{ accion: 'mirar', t: 1.9, mirar: 'derecha' }] },
        { quien: 'robotPractica', alias: 'practica', x: 650, escala: 0.75, facing: -1,
          acciones: [{ accion: 'aparecer', t: 2.0, color: '#86efac' }, { accion: 'saltar', t: 2.6, veces: 2, altura: 22, dur: 0.45 }] },
        { quien: 'robotPractica', alias: 'practica2', x: 735, escala: 0.6, facing: -1, z: -1,
          acciones: [{ accion: 'aparecer', t: 2.2, color: '#86efac' }] },
        { quien: 'secuaz', x: 865, escala: 0.72, bueno: true,
          acciones: [{ accion: 'entrar', t: 1.0, desde: 'derecha', dur: 0.9 }, { accion: 'celebrar', t: 2.0, altura: 6 }] }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡ENTRENAMIENTO!', x: 480, y: 66, t: 2.3, tam: 48, pantalla: true },
        txt({ texto: '¡BIP, BIP!', x: 700, y: 140, t: 2.1, dur: 1.4, tam: 30 }, VERDE)
      ],
      sonido: [{ nombre: 'robot', t: 2.0 }, { nombre: 'select', t: 2.3 }]
    },

    // 5 · Juanjo: "Tres meses después..." ya estaban listos y se comprometieron a ayudar.
    // Todavía SIN armas (las eligen en el plano 6): esquivan de un salto las bolas del robot de práctica.
    {
      fondo: 'baseCielo',
      transicion: 'pagina',
      camara: { zoom: 1.08, x: 480, hasta: { zoom: 1.15, x: 470 }, t: 2.6, dur: 1.4 },
      actores: [
        { quien: 'falcon', x: 120, acciones: [{ accion: 'atacar', t: 1.6, veces: 2, cada: 0.6 }, { accion: 'celebrar', t: 2.9 }] },
        { quien: 'mikey', x: 270,
          acciones: [{ accion: 'saltar', t: 1.3, veces: 2, altura: 95, dur: 0.6 }, { accion: 'celebrar', t: 2.6 }] },
        { quien: 'peter', x: 420, modoEscudo: 'fuera',
          acciones: [{ accion: 'saltar', t: 1.15, veces: 2, altura: 95, dur: 0.6 }, { accion: 'celebrar', t: 2.75 }] },
        { quien: 'robotPractica', alias: 'practica', x: 740, escala: 0.8, facing: -1,
          acciones: [
            { accion: 'disparar', t: 1.2, hasta: { x: 155, y: 285 }, proyectil: 'bola', rebota: true, veces: 2, cada: 0.6 },   // pasan por debajo; Falcon las aparta con la espada
            { accion: 'asustarse', t: 2.5 }
          ] }
      ],
      efectos: [
        { tipo: 'rayos', x: 345, y: 220, t: 2.6, color: '#fde68a' }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Tres meses después...', t: 0.3 },
        { estilo: 'titulo', texto: '¡TRES MESES DESPUÉS!', x: 480, y: 120, t: 0.4, dur: 1.0, tam: 46, pantalla: true },
        txt({ texto: '¡HOP!', x: 420, y: 150, t: 1.35, dur: 0.6, tam: 36 }, VERDE),
        txt({ texto: '¡HOP!', x: 270, y: 150, t: 1.5, dur: 0.6, tam: 36 }, VERDE),
        txt({ texto: '¡FALLASTE!', x: 560, y: 120, t: 2.2, dur: 1.0, tam: 32 }, AZUL),
        { estilo: 'bocadillo', a: 'mikey', texto: '¡Listos!', t: 2.9 }
      ],
      sonido: [{ nombre: 'checkpoint', t: 0.35 }, { nombre: 'victory', t: 2.7 }]
    },

    // 6 · Papá: cada uno eligió su arma: Peter, un escudo; Mikey, 3 lanzadores de bolas de energía azul.
    // El escudo vuela al brazo de Peter y los 3 lanzadores a Mikey; DESPUÉS Mikey prueba la metralleta.
    {
      fondo: 'baseCielo',
      continuidad: false,
      camara: { zoom: 1.12, x: 480, hasta: { zoom: 1.2, x: 490, y: 190 }, t: 1.2, dur: 2.2 },
      actores: [
        { quien: 'peter', x: 300, modoEscudo: 'fuera',
          acciones: [{ accion: 'cambiar', t: 2.4, cambia: { modoEscudo: 'mano' }, destello: '#86efac' }, { accion: 'celebrar', t: 2.7, altura: 10 }] },
        { quien: 'mikey', x: 610, facing: -1, arma: 'metralleta',
          acciones: [
            { accion: 'cambiar', t: 2.65, cambia: {}, destello: '#93c5fd' },
            { accion: 'disparar', t: 3.0, hasta: { x: 900, y: 150 }, proyectil: 'energia', lanzador: 'metralleta', veces: 4, cada: 0.15 }
          ] },
        { quien: 'escudoPeter', alias: 'escudo1', x: 300, y: 180,
          acciones: [
            { accion: 'aparecer', t: 0.4, color: '#86efac' }, { accion: 'flotar', t: 0.4 }, { accion: 'brillar', t: 0.4, color: 'rgba(74,222,128,0.7)' },
            { accion: 'volar', t: 2.0, hasta: { x: 318, y: 300 }, dur: 0.4 },
            { accion: 'desaparecer', t: 2.4, dur: 0.25, color: '#86efac' }
          ] },
        { quien: 'lanzador', alias: 'l1', x: 530, y: 150, tipo: 'francotirador', escala: 0.8,
          acciones: [
            { accion: 'aparecer', t: 1.1, color: '#93c5fd' }, { accion: 'flotar', t: 1.1 }, { accion: 'brillar', t: 1.1, color: 'rgba(96,165,250,0.7)' },
            { accion: 'volar', t: 2.1, hasta: { x: 590, y: 335 }, dur: 0.4 }, { accion: 'desaparecer', t: 2.5, dur: 0.25, color: '#93c5fd' }
          ] },
        { quien: 'lanzador', alias: 'l2', x: 640, y: 130, tipo: 'pistola', escala: 0.8,
          acciones: [
            { accion: 'aparecer', t: 1.4, color: '#93c5fd' }, { accion: 'flotar', t: 1.4 }, { accion: 'brillar', t: 1.4, color: 'rgba(96,165,250,0.7)' },
            { accion: 'volar', t: 2.2, hasta: { x: 598, y: 340 }, dur: 0.4 }, { accion: 'desaparecer', t: 2.6, dur: 0.25, color: '#93c5fd' }
          ] },
        { quien: 'lanzador', alias: 'l3', x: 750, y: 150, tipo: 'metralleta', escala: 0.8,
          acciones: [
            { accion: 'aparecer', t: 1.7, color: '#93c5fd' }, { accion: 'flotar', t: 1.7 }, { accion: 'brillar', t: 1.7, color: 'rgba(96,165,250,0.7)' },
            { accion: 'volar', t: 2.3, hasta: { x: 606, y: 335 }, dur: 0.4 }, { accion: 'desaparecer', t: 2.7, dur: 0.25, color: '#93c5fd' }
          ] }
      ],
      textos: [
        { estilo: 'titulo', texto: 'ESCUDO', x: 300, y: 92, t: 0.6, dur: 1.5, tam: 24, color: '#bbf7d0', borde: '#14532d' },
        { estilo: 'titulo', texto: 'FRANCOTIRADOR', x: 520, y: 82, t: 1.2, dur: 1.0, tam: 18, color: '#bfdbfe', borde: '#1e3a8a' },
        { estilo: 'titulo', texto: 'PISTOLA', x: 640, y: 62, t: 1.5, dur: 0.8, tam: 18, color: '#bfdbfe', borde: '#1e3a8a' },
        { estilo: 'titulo', texto: 'METRALLETA', x: 760, y: 82, t: 1.8, dur: 0.6, tam: 18, color: '#bfdbfe', borde: '#1e3a8a' },
        txt({ texto: '¡MÍO!', x: 300, y: 130, t: 2.5, dur: 1.2, tam: 34 }, VERDE),
        txt({ texto: '¡ZAP, ZAP!', x: 820, y: 230, t: 3.1, dur: 1.4, tam: 36 }, AZUL)
      ],
      sonido: [{ nombre: 'pickup', t: 0.4 }, { nombre: 'launcherSwap', t: 1.1 }, { nombre: 'launcherSwap', t: 1.4 }, { nombre: 'launcherSwap', t: 1.7 },
        { nombre: 'shieldCatch', t: 2.4 }, { nombre: 'pickup', t: 2.65 }]
    },

    // 7 · Dark Secuaz: ¡examen final en la base del cielo!
    {
      fondo: 'baseCielo',
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'director', x: 120, acciones: [{ accion: 'celebrar', t: 1.4 }] },
        { quien: 'falcon', x: 225, acciones: [{ accion: 'celebrar', t: 1.55 }] },
        { quien: 'mikey', x: 330, acciones: [{ accion: 'celebrar', t: 1.7 }] },
        { quien: 'peter', x: 435, acciones: [{ accion: 'celebrar', t: 1.85 }] },
        { quien: 'robotPractica', alias: 'practica', x: 610, escala: 0.65, facing: -1, z: -1 },
        { quien: 'secuaz', x: 810, escala: 0.8, bueno: true, facing: -1,
          acciones: [{ accion: 'senalar', t: 0.3, a: 'practica', dur: 1.2 }, { accion: 'brillar', t: 0.3, color: 'rgba(134,239,172,0.7)' }] }
      ],
      efectos: [{ tipo: 'confeti', t: 1.4 }],
      textos: [{ estilo: 'titulo', texto: '¡EXAMEN FINAL!', x: 480, y: 70, t: 1.0, tam: 58, estallido: '#fef9c3', pantalla: true }],
      sonido: [{ nombre: 'select', t: 1.0 }]
    }
  ] });

  // ===========================================================================
  //  s3_tras1 — El dron espía y la gema copia (6 líneas)
  // ===========================================================================
  G.cine.register('s3_tras1', { planos: [

    // 0 · Papá: el robot de práctica se sienta, mareado, entre confeti. ¡Examen superado!
    {
      fondo: 'baseCielo',
      transicion: 'fundido',
      camara: { zoom: 1.05, x: 500 },
      actores: [
        { quien: 'robotPractica', alias: 'practica', x: 650, facing: -1,
          acciones: [
            { accion: 'retroceder', t: 0.3, distancia: 40 },
            { accion: 'encoger', t: 0.75, factor: 0.85, dur: 0.35 },
            { accion: 'temblar', t: 0.75, dur: 0.5, fuerza: 0.8 }
          ] },
        { quien: 'mikey', x: 230, acciones: [{ accion: 'celebrar', t: 1.2 }] },
        { quien: 'peter', x: 340, acciones: [{ accion: 'celebrar', t: 1.35 }] },
        { quien: 'falcon', x: 120, acciones: [{ accion: 'celebrar', t: 1.5 }] }
      ],
      efectos: [
        { tipo: 'estrellas', a: 'practica', en: 'cabeza', dy: -4, t: 0.9 },
        { tipo: 'confeti', t: 0.9 },
        { tipo: 'polvo', x: 610, y: 330, t: 0.75 }
      ],
      textos: [
        txt({ texto: '¡PLOF!', x: 660, y: 150, t: 0.8, dur: 1.0, tam: 46 }, VERDE),
        { estilo: 'titulo', texto: '¡EXAMEN SUPERADO!', x: 480, y: 70, t: 1.5, tam: 50, pantalla: true }
      ],
      sonido: [{ nombre: 'hit', t: 0.3 }, { nombre: 'victory', t: 1.4 }]
    },

    // 1 · Dark Secuaz: ¡Bravo! Pero tengo noticias...
    {
      fondo: 'baseCielo',
      // zoom 1,2 hacia Dark Secuaz: el borde izquierdo queda en x ≈ 160, así que los tres
      // héroes se acercan un poco (vienen del plano 0) y salen ENTEROS en el encuadre final.
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.2, a: 'secuaz', dy: -30 }, t: 1.6, dur: 1.6 },
      actores: [
        { quien: 'mikey', x: 315, acciones: [{ accion: 'mirar', t: 0.1, mirar: 'derecha' }] },
        { quien: 'peter', x: 420 },
        { quien: 'falcon', x: 215 },
        { quien: 'secuaz', x: 720, escala: 0.85, bueno: true, facing: -1,
          acciones: [{ accion: 'celebrar', t: 0.1, dur: 1.4, altura: 8 }, { accion: 'brillar', t: 1.8, color: 'rgba(134,239,172,0.6)' }],
          bocadillo: '!', bocadilloT: 2.0 }
      ],
      textos: [txt({ texto: '¡BRAVO!', x: 560, y: 90, t: 0.3, dur: 1.4, tam: 48 }, VERDE)],
      sonido: [{ nombre: 'select', t: 0.3 }]
    },

    // 2 · Juanjo: el dron espía escaneó la Gema del Poder... y fabricaron una gema copia.
    {
      fondo: 'negro',
      transicion: 'pagina',
      tinte: 'rgba(76,29,149,0.12)',
      camara: { zoom: 1.1, x: 520 },
      actores: [
        { quien: 'gemaPoder', x: 330, y: 300, acciones: [{ accion: 'flotar' }, { accion: 'brillar', color: 'rgba(251,113,133,0.8)' }] },
        { quien: 'dronEspia', alias: 'dron', x: 330, y: 150, escala: 1.7, escaneando: true,
          acciones: [
            { accion: 'entrar', t: 0.1, desde: 'derecha', dur: 0.8 },
            { accion: 'temblar', t: 0.9, dur: 1.3, fuerza: 0.25 },
            { accion: 'cambiar', t: 2.2, cambia: { escaneando: false } },
            { accion: 'volar', t: 2.2, hasta: { x: 560, y: 120 }, dur: 0.9 }
          ] },
        { quien: 'gemaCopia', alias: 'copia', x: 740, y: 290,
          acciones: [{ accion: 'aparecer', t: 2.3, color: '#fda4af' }, { accion: 'flotar', t: 2.3 }, { accion: 'brillar', t: 2.4, color: 'rgba(244,63,94,0.7)' }] }
      ],
      efectos: [
        { tipo: 'senal', a: 'dron', t: 0.9, dur: 1.4, color: '#22d3ee', radio: 60 },
        { tipo: 'estela', a: 'dron', t: 2.2, color: '#67e8f9', tam: 6 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Tiempo atrás, el dron espía...', t: 0.3 },
        txt({ texto: '¡ESCANEANDO!', x: 520, y: 200, t: 0.9, dur: 1.4, tam: 30 }, CIAN),
        { estilo: 'titulo', texto: '¡GEMA COPIA!', x: 740, y: 150, t: 2.5, tam: 36, color: '#fda4af', borde: '#881337' }
      ],
      sonido: [{ nombre: 'gemGrab', t: 2.3 }]
    },

    // 3 · Papá: una copia de máquina, con circuitos... ¡en el pecho de Robovill! (detalle de la gema → se aleja)
    {
      fondo: 'fabricaOscura',
      transicion: 'pagina',
      camara: { zoom: 2.4, a: 'robovill', dx: 12, dy: 30, hasta: { zoom: 1.05, x: 480, y: 172 }, t: 1.6, dur: 2.0 },
      actores: [
        { quien: 'robovill', x: 480, alas: 'abiertas',
          acciones: [{ accion: 'brillar', color: 'rgba(248,113,113,0.55)' }, { accion: 'reir', t: 3.0, texto: '¡JA, JA!' }] }
      ],
      efectos: [{ tipo: 'destellos', x: 492, y: 232, t: 0.2, radio: 26, cantidad: 5, tam: 1.1, delante: true }],
      textos: [txt({ texto: '¡BZZZ!', x: 640, y: 120, t: 0.4, dur: 1.4, tam: 40 }, ROJO)],
      sonido: [{ nombre: 'gemGrab', t: 0.3 }]
    },

    // 4 · Director: ¡temblores bajo tierra! Robovill excava hacia la ciudad.
    {
      fondo: 'baseCielo',
      transicion: 'pagina',
      camara: { zoom: 1.2, x: 470, y: 205 },
      actores: [
        { quien: 'director', x: 300, pose: 'hack' },
        { quien: 'mikey', x: 205, acciones: [{ accion: 'asustarse', t: 0.8 }] },
        { quien: 'reloj', x: 600, y: 310, escala: 1.0, texto: 'ROBOVILL', color: '#f87171',
          acciones: [{ accion: 'flotar', altura: 6 }, { accion: 'brillar', color: 'rgba(34,211,238,0.7)' }] }
      ],
      efectos: [
        { tipo: 'temblor', t: 0.6, fuerza: 0.6, dur: 1.2 },
        { tipo: 'polvo', x: 300, y: 330, t: 0.6, repetir: 0.6, dur: 2.2 },
        { tipo: 'senal', x: 615, y: 222, color: '#f87171', radio: 60 }
      ],
      textos: [txt({ texto: '¡RUMMMBLE!', x: 420, y: 92, t: 0.6, dur: 1.8, tam: 42 }, { color: '#fde68a', borde: '#78350f' })],
      sonido: [{ nombre: 'checkpoint', t: 0.2 }, { nombre: 'rumble', t: 0.6 }]
    },

    // 5 · Mikey: ¡Pues vamos tras él! ¡Nuestra primera misión de verdad!
    {
      fondo: 'baseCielo',
      continuidad: false,
      camara: { zoom: 1.12, x: 470, hasta: { zoom: 1.2, a: 'mikey', dy: -30 }, t: 1.8, dur: 1.6 },
      actores: [
        { quien: 'mikey', x: 360, acciones: [{ accion: 'saltar', t: 0.2, veces: 2, altura: 60, dur: 0.55 }, { accion: 'celebrar', t: 1.4 }] },
        { quien: 'peter', x: 480, acciones: [{ accion: 'celebrar', t: 0.9 }] },
        { quien: 'director', x: 640, facing: -1, pose: 'win' },
        { quien: 'falcon', x: 760, facing: -1, acciones: [{ accion: 'celebrar', t: 1.1, altura: 10 }] }
      ],
      efectos: [{ tipo: 'rayos', a: 'mikey', t: 1.2, color: '#fde68a' }],
      textos: [{ estilo: 'titulo', texto: '¡PRIMERA MISIÓN!', x: 480, y: 66, t: 1.2, tam: 50, pantalla: true }],
      sonido: [{ nombre: 'select', t: 1.2 }]
    }
  ] });

  // ===========================================================================
  //  s3_cap2 — Túneles bajo tierra (7 líneas)
  // ===========================================================================
  G.cine.register('s3_cap2', { planos: [

    // 0 · Juanjo: dos robots de Robovill a la entrada de los túneles: uno con ruedas y otro con aletas.
    {
      fondo: 'tuneles',
      transicion: 'fundido',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.1, x: 540 }, t: 1.4, dur: 2.2 },
      actores: [
        { quien: 'peter', x: 150, acciones: [{ accion: 'entrar', t: 0.5, desde: 'izquierda', dur: 0.9 }] },
        { quien: 'mikey', x: 235, acciones: [{ accion: 'entrar', t: 0.4, desde: 'izquierda', dur: 0.9 }] },
        { quien: 'falcon', x: 320, acciones: [{ accion: 'entrar', t: 0.3, desde: 'izquierda', dur: 0.9 }], bocadillo: '!', bocadilloT: 1.5 },
        { quien: 'director', x: 405, acciones: [{ accion: 'entrar', t: 0.2, desde: 'izquierda', dur: 0.9 }] },
        { quien: 'robotMoto', alias: 'moto', x: 640, enemigo: true, facing: -1, acciones: [{ accion: 'temblar', t: 1.3, dur: 0.6, fuerza: 0.5 }] },
        { quien: 'submarinoNave', alias: 'sub', x: 830, y: 325, enemigo: true, facing: -1, acciones: [{ accion: 'flotar', altura: 6 }] }
      ],
      textos: [txt({ texto: '¡GRRR!', x: 720, y: 110, t: 1.3, dur: 1.4, tam: 44 }, ROJO)],
      sonido: [{ nombre: 'robot', t: 1.3 }]
    },

    // 1 · Director: ¡se transforman, como mi coche! Si los hackeo, serán nuestros.
    {
      fondo: 'tuneles',
      camara: { zoom: 1.12, x: 520, y: 200 },
      actores: [
        { quien: 'peter', x: 150 },
        { quien: 'mikey', x: 235 },
        { quien: 'falcon', x: 320 },
        { quien: 'director', x: 405, acciones: [{ accion: 'senalar', t: 0.3, a: 'moto', dur: 1.6 }] },
        { quien: 'robotMoto', alias: 'moto', x: 640, enemigo: true, facing: -1 },
        { quien: 'submarinoNave', alias: 'sub', x: 830, y: 325, enemigo: true, facing: -1, acciones: [{ accion: 'flotar', altura: 6 }] }
      ],
      textos: [{ estilo: 'pensamiento', a: 'director', lado: 'derecha', dibujo: ['cocheTransformable'], texto: '¡Como mi coche!', t: 1.0 }]
    },

    // 2 · Papá: Bip, bip, ¡CLIC! el Director hackea la robot-moto (que se transforma) y el submarino-nave.
    // Mikey y Peter siguen DE PIE junto al equipo y lo celebran; los vehículos, ya del equipo,
    // esperan con la cabina vacía (piloto: false) hasta que cada uno salte dentro (planos 3 y 4).
    {
      fondo: 'tuneles',
      camara: { zoom: 1.04, x: 499, y: 200 },
      actores: [
        { quien: 'peter', x: 150, acciones: [{ accion: 'celebrar', t: 3.0, altura: 12 }] },
        { quien: 'mikey', x: 235, acciones: [{ accion: 'celebrar', t: 1.5, altura: 12 }] },
        { quien: 'falcon', x: 320 },
        { quien: 'director', x: 405, pose: 'hack',
          acciones: [{ accion: 'hackear', t: 0.2, a: 'moto', dur: 1.2 }, { accion: 'hackear', t: 1.6, a: 'sub', dur: 1.2 }] },
        { quien: 'robotMoto', alias: 'moto', x: 640, enemigo: true, piloto: false, facing: -1,
          acciones: [
            { accion: 'cambiar', t: 1.4, cambia: { enemigo: false }, destello: '#86efac' },
            { accion: 'transformar', t: 1.9, cambia: { modo: 'moto' }, color: '#fdba74' }
          ] },
        { quien: 'submarinoNave', alias: 'sub', x: 830, y: 325, enemigo: true, piloto: false, facing: -1,
          acciones: [{ accion: 'flotar', altura: 6 }, { accion: 'cambiar', t: 2.8, cambia: { enemigo: false }, destello: '#86efac' }] }
      ],
      textos: [
        txt({ texto: '¡BIP, BIP!', x: 520, y: 90, t: 0.3, dur: 1.0, tam: 34 }, CIAN),
        txt({ texto: '¡CLIC!', x: 650, y: 130, t: 1.4, dur: 1.2, tam: 46 }, VERDE),
        txt({ texto: '¡CLAC, CLAC!', x: 640, y: 210, t: 2.0, dur: 0.9, tam: 32 }, VERDE),
        txt({ texto: '¡CLIC!', x: 840, y: 150, t: 2.8, tam: 46 }, VERDE)
      ],
      sonido: [{ nombre: 'hackOk', t: 1.4 }, { nombre: 'hackOk', t: 2.8 }]
    },

    // 3 · Mikey: ¡La robot-moto es para mí! Salta por encima de todos, se mete en la cabina
    // (¡puf!: desde ahí lo dibuja el arte de la moto) y la moto arranca: ¡BRRRUM!
    {
      fondo: 'tuneles',
      camara: { zoom: 1.04, x: 499, y: 200, hasta: { zoom: 1.3, a: 'moto', dy: -40 }, t: 1.6, dur: 1.2 },
      actores: [
        { quien: 'peter', x: 150, acciones: [{ accion: 'mirar', t: 0.6, mirar: 'derecha' }] },
        { quien: 'mikey', x: 235, bocadillo: '¡Para mí!', bocadilloT: 0.2,
          acciones: [
            { accion: 'saltar', t: 0.7, hasta: { x: 620 }, altura: 150, dur: 0.75 },
            { accion: 'desaparecer', t: 1.45, dur: 0.25, color: '#fdba74' }
          ] },
        { quien: 'falcon', x: 320, acciones: [{ accion: 'mirar', t: 0.9, mirar: 'derecha' }] },
        { quien: 'director', x: 405, acciones: [{ accion: 'mirar', t: 0.9, mirar: 'derecha' }, { accion: 'celebrar', t: 2.0, altura: 8 }] },
        { quien: 'robotMoto', alias: 'moto', x: 640, modo: 'moto', piloto: false, facing: -1,
          acciones: [
            { accion: 'cambiar', t: 1.45, cambia: { piloto: true, facing: 1 }, destello: '#fdba74' },
            { accion: 'saltar', t: 1.6, altura: 26, dur: 0.4 },
            { accion: 'cambiar', t: 2.0, cambia: { boost: true } },
            { accion: 'temblar', t: 2.0, fuerza: 0.4 }
          ] },
        { quien: 'submarinoNave', alias: 'sub', x: 830, y: 325, piloto: false, facing: -1, acciones: [{ accion: 'flotar', altura: 6 }] }
      ],
      efectos: [{ tipo: 'polvo', x: 600, y: 330, t: 2.0, repetir: 0.4, dur: 2, color: '#d6c4a8' }],
      textos: [
        { estilo: 'bocadillo', a: 'moto', texto: '¡Agárrate!', t: 1.7, dur: 1.1 },
        txt({ texto: '¡BRRRUM!', x: 760, y: 160, t: 2.2, tam: 50, estallido: '#ffedd5' }, { color: '#fdba74', borde: '#9a3412' })
      ],
      sonido: [{ nombre: 'jump', t: 0.7 }, { nombre: 'boost', t: 2.0 }]
    },

    // 4 · Peter: ¡el submarino-nave para mí! Va bajo el agua y hasta puede volar.
    // Mikey ya va en su moto; Peter da un salto enorme y se mete en el ojo de buey.
    {
      fondo: 'tuneles',
      camara: { zoom: 1.04, x: 499, y: 200, hasta: { zoom: 1.3, a: 'sub', dy: -40 }, t: 1.95, dur: 1.2 },
      actores: [
        { quien: 'peter', x: 150, bocadillo: '¡Y este, para mí!', bocadilloT: 0.55,   // cuando la cámara ya ha vuelto del plano anterior
          acciones: [
            { accion: 'saltar', t: 1.0, hasta: { x: 815 }, altura: 190, dur: 0.85 },
            { accion: 'desaparecer', t: 1.85, dur: 0.25, color: '#fde047' }
          ] },
        { quien: 'falcon', x: 320, acciones: [{ accion: 'mirar', t: 1.2, mirar: 'derecha' }] },
        { quien: 'director', x: 405, acciones: [{ accion: 'mirar', t: 1.2, mirar: 'derecha' }] },
        { quien: 'robotMoto', alias: 'moto', x: 640, modo: 'moto', facing: 1 },
        { quien: 'submarinoNave', alias: 'sub', x: 830, y: 325, piloto: false, facing: -1,
          acciones: [
            { accion: 'flotar', altura: 6 },
            { accion: 'cambiar', t: 1.85, cambia: { piloto: true }, destello: '#fde047' },
            { accion: 'saltar', t: 2.0, altura: 40, dur: 0.5 },
            { accion: 'flotar', t: 2.5, altura: 14 }
          ] }
      ],
      efectos: [{ tipo: 'destellos', x: 830, y: 280, t: 2.1, radio: 60, color: '#bae6fd' }],
      textos: [txt({ texto: '¡BLUP, BLUP!', x: 760, y: 150, t: 2.4, tam: 38 }, CIAN)],
      sonido: [{ nombre: 'jump', t: 1.0 }, { nombre: 'splash', t: 2.0 }]
    },

    // 5 · Juanjo: el equipo se divide: Mikey y el Director por los túneles; Peter y Falcon por el río.
    {
      fondo: 'tuneles',
      continuidad: false,
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'mechaHalcon', alias: 'mecha', x: 400, y: 220, escala: 0.6, facing: -1,
          acciones: [{ accion: 'volar', t: 0.6, hasta: { x: 310, y: 210 }, dur: 1.4 }] },
        { quien: 'submarinoNave', alias: 'sub', x: 450, y: 325, facing: -1,
          acciones: [{ accion: 'conducir', t: 0.6, hasta: { x: 150 }, dur: 1.4 }, { accion: 'flotar', t: 2.0, altura: 6 }] },
        { quien: 'cocheTransformable', alias: 'coche', x: 520, escala: 0.9,
          acciones: [{ accion: 'conducir', t: 0.6, hasta: { x: 650 }, dur: 1.4 }] },
        { quien: 'robotMoto', alias: 'moto', x: 650, modo: 'moto',
          acciones: [{ accion: 'conducir', t: 0.6, hasta: { x: 820 }, dur: 1.4 }] }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡AL RÍO!', x: 220, y: 62, t: 1.4, tam: 40, color: '#bae6fd', borde: '#0c4a6e' },
        { estilo: 'titulo', texto: '¡A LOS TÚNELES!', x: 740, y: 62, t: 1.4, tam: 40, color: '#fdba74', borde: '#7c2d12' },
        txt({ texto: 'PETER + FALCON', x: 220, y: 112, t: 1.7, tam: 20, rot: 0 }, CIAN),
        txt({ texto: 'MIKEY + DIRECTOR', x: 740, y: 112, t: 1.7, tam: 20, rot: 0 }, { color: '#fed7aa', borde: '#9a3412' })
      ],
      sonido: [{ nombre: 'boost', t: 0.6 }]
    },

    // 6 · Papá: ¡Arranca, Mikey! Robovill excava ahí delante. ¡A toda velocidad!
    {
      fondo: 'tuneles',
      fondoVel: 600,
      continuidad: false,
      camara: { zoom: 1.12, x: 480, y: 200, hasta: { zoom: 1.2, x: 560 }, t: 1.2, dur: 2.4 },
      actores: [
        { quien: 'cocheTransformable', alias: 'coche', x: 210, escala: 0.9, turbo: true, acciones: [{ accion: 'temblar', fuerza: 0.4 }] },
        { quien: 'robotMoto', alias: 'moto', x: 400, modo: 'moto', boost: true, acciones: [{ accion: 'temblar', fuerza: 0.4 }] },
        { quien: 'robovill', x: 820, escala: 0.55, taladro: 1, z: -1,
          acciones: [{ accion: 'temblar', fuerza: 0.7 }, { accion: 'caminar', t: 0.2, hasta: { x: 870 }, dur: 6 }] }
      ],
      efectos: [
        { tipo: 'velocidad', alpha: 0.6 },
        { tipo: 'polvo', x: 820, y: 330, repetir: 0.4, dur: 99, color: '#d6c4a8' },
        { tipo: 'temblor', t: 0.8, fuerza: 0.3, dur: 1 }
      ],
      textos: [
        { estilo: 'titulo', texto: '¡A TODA VELOCIDAD!', x: 420, y: 70, t: 0.4, tam: 44, pantalla: true },
        txt({ texto: '¡RRRRR!', x: 800, y: 130, t: 0.8, tam: 36 }, { color: '#fde68a', borde: '#78350f' })
      ],
      sonido: [{ nombre: 'boost', t: 0.3 }, { nombre: 'drill', t: 0.8 }]
    }
  ] });

  // ===========================================================================
  //  s3_tras2 — La Gran Excavadora hace pop; la pista lleva a la fábrica (6 líneas)
  // ===========================================================================
  G.cine.register('s3_tras2', { planos: [

    // 0 · Papá: ¡PUM! final de la fusión terrestre: la Gran Excavadora hace ¡pop!
    {
      fondo: 'tuneles',
      transicion: 'fundido',
      camara: { zoom: 1.02, x: 480 },
      actores: [
        { quien: 'fusionTerrestre', alias: 'fusion', x: 300,
          acciones: [{ accion: 'atacar', t: 0.5, a: 'exc', veces: 2, cada: 0.35 }, { accion: 'celebrar', t: 2.4, altura: 10 }] },
        { quien: 'granExcavadora', alias: 'exc', x: 680, escala: 1.25, facing: -1,
          acciones: [{ accion: 'retroceder', t: 0.9, distancia: 50 }, { accion: 'temblar', t: 1.1, dur: 0.5, fuerza: 1 }, { accion: 'pop', t: 1.6 }] }
      ],
      efectos: [
        { tipo: 'lineasAccion', x: 560, y: 220, t: 0.75, dur: 0.6 },
        { tipo: 'chispas', x: 590, y: 230, t: 0.8 },
        { tipo: 'temblor', t: 0.8, fuerza: 0.8 },
        { tipo: 'confeti', t: 2.0 }
      ],
      textos: [
        { texto: '¡PUM!', x: 520, y: 110, t: 0.75, dur: 1.0, tam: 64, estallido: true },
        txt({ texto: '¡POP!', x: 700, y: 170, t: 1.7, tam: 58 }, { color: '#fde047', borde: '#ea580c' })
      ],
      sonido: [{ nombre: 'bigPunch', t: 0.75 }, { nombre: 'victory', t: 2.2 }]
    },

    // 1 · Mikey: ¡Lo hemos conseguido! ¡Juntos somos imparables!
    {
      fondo: 'tuneles',
      continuidad: false,
      camara: { zoom: 1.2, x: 470, y: 200 },
      actores: [
        { quien: 'mikey', x: 400, acciones: [{ accion: 'saltar', t: 0.2, altura: 70, dur: 0.6 }, { accion: 'celebrar', t: 0.9 }] },
        { quien: 'director', x: 550, facing: -1, acciones: [{ accion: 'celebrar', t: 0.5 }] }
      ],
      efectos: [{ tipo: 'destellos', x: 470, y: 230, radio: 120, color: '#fde68a' }, { tipo: 'confeti', t: 0.9 }],
      textos: [txt({ texto: '¡CHOCA ESOS CINCO!', x: 480, y: 80, t: 0.9, dur: 1.8, tam: 32 }, { color: '#fde68a', borde: '#b45309' })],
      sonido: [{ nombre: 'pickup', t: 0.9 }]
    },

    // 2 · Director: ¡Robovill se escapó por otro túnel y nos dejó a su Gran Excavadora! Sus marcas
    // de taladro... ¡vuelve a la fábrica! Al fondo, Robovill (pequeño, lejos) se mete taladrando
    // en un túnel nuevo y desaparece bajo tierra; luego el reloj del Director marca la FÁBRICA.
    {
      fondo: 'tuneles',
      camara: { zoom: 1.08, x: 560, y: 200, hasta: { zoom: 1.22, x: 500, y: 205 }, t: 2.2, dur: 1.2 },
      actores: [
        { quien: 'robovill', x: 830, escala: 0.5, taladro: 1, z: -2, facing: -1,
          acciones: [{ accion: 'temblar', dur: 0.5, fuerza: 0.6 }, { accion: 'hundirse', t: 0.5, dur: 1.5 }] },
        { quien: 'mikey', x: 300, acciones: [{ accion: 'mirar', t: 0.2, mirar: 'derecha' }, { accion: 'asustarse', t: 0.9 }, { accion: 'mirar', t: 3.3, mirar: 'derecha' }] },
        { quien: 'director', x: 450, acciones: [{ accion: 'senalar', t: 0.4, a: 'robovill', dur: 1.5 }, { accion: 'cambiar', t: 2.0, cambia: { pose: 'hack' } }] },
        { quien: 'reloj', x: 640, y: 300, texto: 'FÁBRICA', color: '#f87171',
          acciones: [{ accion: 'aparecer', t: 2.1, color: '#22d3ee' }, { accion: 'flotar', t: 2.1, altura: 6 }, { accion: 'brillar', t: 2.1, color: 'rgba(34,211,238,0.7)' }] }
      ],
      efectos: [
        { tipo: 'polvo', x: 830, y: 330, t: 0.3, repetir: 0.3, dur: 1.6, color: '#d6c4a8' },
        { tipo: 'temblor', t: 0.5, fuerza: 0.25, dur: 1.2 },
        { tipo: 'senal', x: 655, y: 212, t: 2.6, color: '#f87171', radio: 60 }
      ],
      textos: [
        txt({ texto: '¡RRRRR!', x: 830, y: 150, t: 0.5, dur: 1.4, tam: 34 }, { color: '#fde68a', borde: '#78350f' }),
        { estilo: 'bocadillo', a: 'mikey', texto: '¡Se escapa!', t: 1.0, dur: 1.3 },
        txt({ texto: '¡BIP!', x: 760, y: 110, t: 2.3, dur: 1.2, tam: 36 }, CIAN),
        { estilo: 'bocadillo', a: 'mikey', texto: '¿La fábrica?', t: 3.5 }
      ],
      sonido: [{ nombre: 'drill', t: 0.4 }, { nombre: 'checkpoint', t: 2.3 }]
    },

    // 3 · Juanjo: la vieja fábrica de robots, ahora guarida de Robovill.
    {
      fondo: 'fabricaOscura',
      transicion: 'pagina',
      tinte: 'rgba(40,0,12,0.12)',
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.15, x: 480, y: 190 }, t: 0.6, dur: 3 },
      actores: [
        { quien: 'puerta', x: 480, estilo: 'fabrica', ojo: true, luz: '#ef4444', acciones: [{ accion: 'abrir', t: 0.6, dur: 1.8 }] },
        { quien: 'miniRobot', alias: 'm1', x: 470, y: 230, z: 2, facing: -1,
          acciones: [{ accion: 'aparecer', t: 2.0, color: '#fca5a5' }, { accion: 'volar', t: 2.2, hasta: { x: 340, y: 200 }, dur: 0.9 }] },
        { quien: 'miniRobot', alias: 'm2', x: 480, y: 230, z: 2,
          acciones: [{ accion: 'aparecer', t: 2.3, color: '#fca5a5' }, { accion: 'volar', t: 2.5, hasta: { x: 480, y: 180 }, dur: 0.9 }] },
        { quien: 'miniRobot', alias: 'm3', x: 490, y: 230, z: 2,
          acciones: [{ accion: 'aparecer', t: 2.6, color: '#fca5a5' }, { accion: 'volar', t: 2.8, hasta: { x: 620, y: 200 }, dur: 0.9 }] }
      ],
      efectos: [{ tipo: 'humo', x: 480, y: 330, color: '#475569' }],
      textos: [
        { estilo: 'cartel', texto: 'La guarida de Robovill...', t: 0.35 },
        txt({ texto: '¡ÑIIIC!', x: 680, y: 100, t: 0.7, dur: 1.4, tam: 36 }, ROJO)
      ],
      sonido: [{ nombre: 'miniRobot', t: 2.0 }]
    },

    // 4 · Dark Secuaz: ¡conozco esa fábrica! Pero ahora es más grande y peligrosa.
    {
      fondo: 'baseCielo',
      transicion: 'pagina',
      camara: { zoom: 1.15, x: 560, y: 200 },
      actores: [
        { quien: 'secuaz', x: 620, escala: 0.9, bueno: true, facing: -1,
          acciones: [{ accion: 'brillar', color: 'rgba(134,239,172,0.5)' }] }
      ],
      efectos: [{ tipo: 'senal', a: 'secuaz', en: 'cabeza', dy: 20, color: '#86efac', radio: 70 }],
      textos: [
        { estilo: 'cartel', texto: 'Por la radio, desde la base...', t: 0.3 },
        { estilo: 'pensamiento', a: 'secuaz', lado: 'izquierda', dx: -45, dy: 40, dibujo: ['robovill'], texto: '¡Cuidado!', t: 1.0 }
      ],
      sonido: [{ nombre: 'checkpoint', t: 0.3 }]
    },

    // 5 · Papá: mientras tanto, Peter y Falcon seguían por el río subterráneo.
    {
      fondo: 'rio',
      transicion: 'pagina',
      sueloY: 150,
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'mechaHalcon', alias: 'mecha', x: 220, y: 118, escala: 0.55,
          acciones: [{ accion: 'volar', t: 0.4, hasta: { x: 620, y: 112 }, dur: 3.2 }] },
        { quien: 'submarinoNave', alias: 'sub', x: 180, y: 300, escala: 0.9,
          acciones: [{ accion: 'volar', t: 0.4, hasta: { x: 560, y: 290 }, dur: 3.2 }, { accion: 'flotar', t: 3.6, altura: 8 }] }
      ],
      efectos: [{ tipo: 'estela', a: 'sub', color: '#bae6fd', tam: 10 }],
      textos: [
        { estilo: 'cartel', texto: 'Mientras tanto...', t: 0.35 },
        txt({ texto: '¡BLUB!', x: 760, y: 250, t: 1.2, dur: 1.4, tam: 34 }, CIAN)
      ],
      sonido: [{ nombre: 'splash', t: 0.4 }]
    }
  ] });

  // ===========================================================================
  //  s3_cap3 — Río subterráneo y vuelo (6 líneas)
  // ===========================================================================
  G.cine.register('s3_cap3', { planos: [

    // 0 · Juanjo: bajo tierra corría un río oscuro lleno de cristales brillantes.
    {
      fondo: 'rio',
      transicion: 'fundido',
      sueloY: 300,
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.15, x: 560 }, t: 0.5, dur: 3 },
      actores: [
        { quien: 'submarinoNave', alias: 'sub', x: 330, y: 312, escala: 0.9,
          acciones: [{ accion: 'entrar', t: 0.3, desde: 'izquierda', dur: 1.6 }, { accion: 'flotar', t: 1.9, altura: 6 }] },
        { quien: 'mechaHalcon', alias: 'mecha', x: 520, y: 170, escala: 0.75,
          acciones: [{ accion: 'entrar', t: 0.6, desde: 'izquierda', dur: 1.6 }] }
      ],
      efectos: [{ tipo: 'destellos', x: 520, y: 110, radio: 300, cantidad: 12, color: '#a5f3fc' }],
      textos: [{ estilo: 'cartel', texto: 'Muy lejos de allí, bajo tierra...', t: 0.35 }],
      sonido: [{ nombre: 'splash', t: 0.4 }]
    },

    // 1 · Peter: ¡Submarino-nave, al agua! Yo voy por debajo.
    {
      fondo: 'rio',
      sueloY: 300,
      camara: { zoom: 1.25, a: 'sub', dy: -50 },
      actores: [
        { quien: 'submarinoNave', alias: 'sub', x: 480, y: 312, escala: 0.9,
          acciones: [{ accion: 'saltar', t: 0.3, altura: 50, dur: 0.7 }, { accion: 'volar', t: 1.05, hasta: { x: 560, y: 372 }, dur: 1.1 }, { accion: 'flotar', t: 2.2, altura: 5 }] },
        { quien: 'mechaHalcon', alias: 'mecha', x: 700, y: 170, escala: 0.75 }
      ],
      efectos: [
        { tipo: 'polvo', x: 480, y: 300, t: 1.1, cantidad: 12, color: '#e0f2fe', tam: 1.6 },
        { tipo: 'destellos', x: 480, y: 310, t: 1.6, radio: 50, color: '#bae6fd' }
      ],
      textos: [txt({ texto: '¡CHOF!', x: 470, y: 160, t: 1.15, tam: 52, estallido: '#e0f2fe' }, CIAN)],
      sonido: [{ nombre: 'splash', t: 1.1 }],
      habla: 'sub'
    },

    // 2 · Falcon: yo vuelo por encima con mi mecha-halcón. ¡Te cubro, Peter!
    {
      fondo: 'rio',
      continuidad: true,
      sueloY: 178,
      camara: { zoom: 1, x: 480 },
      habla: 'mecha',
      actores: [
        // el mecha vuela BAJO, justo sobre el agua (y = 172, superficie en 178): se le ve entero
        // y su bocadillo cabe por encima sin taparlo
        { quien: 'mechaHalcon', alias: 'mecha', x: 360, y: 172, escala: 0.66,
          acciones: [{ accion: 'volar', t: 0.3, hasta: { x: 600, y: 168 }, dur: 2.2 }] },
        { quien: 'submarinoNave', alias: 'sub', x: 330, y: 290, escala: 0.9,
          acciones: [{ accion: 'volar', t: 0.3, hasta: { x: 540, y: 295 }, dur: 2.2 }, { accion: 'flotar', t: 2.5, altura: 8 }] }
      ],
      efectos: [{ tipo: 'estela', a: 'sub', color: '#bae6fd', tam: 10 }],
      textos: [
        { estilo: 'bocadillo', a: 'mecha', texto: '¡Te cubro!', t: 0.8, lado: 'izquierda' },
        txt({ texto: '¡FIUUU!', x: 820, y: 70, t: 0.5, dur: 1.4, tam: 32 }, VERDE)
      ],
      sonido: [{ nombre: 'jetpack', t: 0.3 }]
    },

    // 3 · Papá: bajo el agua, peces-robot y minas; por arriba, los drones de Robovill.
    {
      fondo: 'rio',
      sueloY: 130,
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'mechaHalcon', alias: 'mecha', x: 420, y: 95, escala: 0.55 },
        { quien: 'submarinoNave', alias: 'sub', x: 260, y: 290, escala: 0.9, bocadillo: '!', bocadilloT: 1.2 },
        { quien: 'pezRobot', alias: 'pez1', x: 700, y: 230, facing: -1, acciones: [{ accion: 'volar', t: 0.2, hasta: { x: 540, y: 220 }, dur: 3 }] },
        { quien: 'pezRobot', alias: 'pez2', x: 860, y: 300, facing: -1, acciones: [{ accion: 'volar', t: 0.5, hasta: { x: 680, y: 310 }, dur: 3 }] },
        { quien: 'mina', alias: 'mina', x: 560, y: 320, acciones: [{ accion: 'flotar', altura: 10 }] },
        { quien: 'dronEnjambre', alias: 'dron1', x: 760, y: 80, facing: -1, escala: 0.8, acciones: [{ accion: 'volar', t: 0.3, hasta: { x: 620, y: 75 }, dur: 2.6 }] },
        { quien: 'dronEnjambre', alias: 'dron2', x: 900, y: 100, facing: -1, escala: 0.8, acciones: [{ accion: 'volar', t: 0.6, hasta: { x: 760, y: 95 }, dur: 2.6 }] }
      ],
      textos: [txt({ texto: '¡BZZZ!', x: 820, y: 40, t: 0.6, dur: 1.6, tam: 30 }, ROJO)],
      sonido: [{ nombre: 'robot', t: 0.6 }]
    },

    // 4 · Dark Secuaz (por la radio): las minas estallan con un disparo... ¡y al final, a despegar!
    {
      fondo: 'rio',
      sueloY: 130,
      camara: { zoom: 1, x: 480 },
      actores: [
        { quien: 'mechaHalcon', alias: 'mecha', x: 420, y: 95, escala: 0.55 },
        { quien: 'submarinoNave', alias: 'sub', x: 300, y: 290, escala: 0.9,
          acciones: [{ accion: 'disparar', t: 0.4, a: 'mina', proyectil: 'escudo' }, { accion: 'volar', t: 1.5, hasta: { x: 560, y: 250 }, dur: 1.6 }] },
        { quien: 'mina', alias: 'mina', x: 600, y: 320, acciones: [{ accion: 'flotar', altura: 10 }, { accion: 'pop', t: 0.75 }] }
      ],
      efectos: [
        { tipo: 'brillo', x: 900, y: 60, t: 1.6, radio: 160, color: 'rgba(253,230,138,0.85)' },
        { tipo: 'rayos', x: 900, y: 40, t: 1.6, color: '#fde68a', radio: 500 }
      ],
      textos: [
        { estilo: 'cartel', texto: 'Dark Secuaz, por la radio:', t: 0.1 },
        txt({ texto: '¡POP!', x: 600, y: 220, t: 0.8, dur: 1.2, tam: 48 }, { color: '#fde047', borde: '#ea580c' }),
        { estilo: 'titulo', texto: '¡LA SALIDA!', x: 780, y: 140, t: 1.9, tam: 34, color: '#fef3c7', borde: '#92400e' }
      ],
      sonido: [{ nombre: 'shieldCatch', t: 1.3 }]
    },

    // 5 · Juanjo: ¡Adelante! El río lleva a la salida... ¡y hasta el cielo! (¡Modo nave!)
    {
      fondo: 'rio',
      continuidad: false,
      sueloY: 300,
      camara: { zoom: 1, x: 480, hasta: { zoom: 1.08, x: 560, y: 160 }, t: 1.3, dur: 2 },
      actores: [
        { quien: 'submarinoNave', alias: 'sub', x: 380, y: 312, escala: 0.9,
          acciones: [
            { accion: 'transformar', t: 0.6, cambia: { modo: 'nave' }, color: '#fde047' },
            { accion: 'volar', t: 1.4, hasta: { x: 700, y: 170 }, dur: 1.6 }
          ] },
        { quien: 'mechaHalcon', alias: 'mecha', x: 220, y: 170, escala: 0.7,
          acciones: [{ accion: 'volar', t: 1.4, hasta: { x: 470, y: 215 }, dur: 1.6 }] }
      ],
      efectos: [
        { tipo: 'polvo', x: 380, y: 300, t: 0.5, cantidad: 12, color: '#e0f2fe', tam: 1.5 },
        { tipo: 'rayos', x: 880, y: 40, t: 1.6, color: '#fde68a', radio: 600 },
        { tipo: 'estela', a: 'sub', color: '#fde68a', tam: 12 }
      ],
      textos: [
        txt({ texto: '¡MODO NAVE!', x: 380, y: 110, t: 0.9, dur: 1.8, tam: 44 }, { color: '#fde047', borde: '#a16207' }),
        { estilo: 'titulo', texto: '¡HASTA EL CIELO!', x: 480, y: 66, t: 2.7, tam: 46, pantalla: true }
      ],
      sonido: [{ nombre: 'splash', t: 0.5 }, { nombre: 'jetpack', t: 1.4 }]
    }
  ] });
})();
