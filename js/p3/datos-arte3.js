// datos-arte3.js — Datos MEDIDOS sobre el arte aprobado de la Parte 3 (contrato §16.4).
// Dueño: integrador. Nadie más lo edita; todos lo leen CON RESPALDO
// (copia ALTO_POR_DEFECTO del contrato §16.4 en tu archivo).
//
// Medido el 14-oct-2026 sobre js/p3/arte-{heroes,robovill,vehiculos,fusiones,jefes}.js
// dibujando cada función en un lienzo de Chrome sin ventana (escala 1, mirando a la
// derecha, opciones por defecto) y calculando la caja de los píxeles con alfa ≥ 0,5
// (así no cuentan las sombras del suelo ni los halos suaves). Los puntos de impacto
// salen de las coordenadas del propio dibujo (con su contorno) y se comprobaron
// superponiéndolos al arte en una captura.
//
// Solo DEFINE datos al cargar (no llama a nada). Se carga justo después de los
// cinco arte-*.js (contrato §1).
window.G = window.G || {};
window.P2 = window.P2 || {};
(function () {
  'use strict';
  var P2 = window.P2, G = window.G;

  // Alto REAL en px a escala 1 (variante A / opciones por defecto).
  //  · Piezas ancladas en los PIES: del tope del dibujo a los pies.
  //  · Piezas ancladas en el CENTRO o la EMPUÑADURA: alto total de la caja.
  // La variante B usa la MISMA escala que la A (así el cuerpo mide lo mismo; la B
  // solo es más alta por su pelo, antena o ruedas): su caja está en P3CAJA.
  P2.P3ALTO = {
    mikey: 72, peter: 66, robovill: 292, robotMoto: 143, robotMotoMoto: 88, submarinoNave: 100,
    fusionTerrestre: 245, fusionVoladora: 257, fusionFinal: 331,
    robotPractica: 160, granExcavadora: 167, dronNodriza: 198, guardianRobovill: 196,
    gemaCopia: 38, miniRobot: 40, escudoPeter: 42, lanzadorMikey: 30
  };

  // Dónde está el (x, y) que recibe cada función.
  P2.P3ANCLA = {
    mikey: 'pies', peter: 'pies', robovill: 'pies' /* B: punta del taladro */, robotMoto: 'pies',
    submarinoNave: 'centro', fusionTerrestre: 'pies', fusionVoladora: 'centro', fusionFinal: 'pies',
    robotPractica: 'pies', granExcavadora: 'pies', dronNodriza: 'centro', guardianRobovill: 'pies',
    gemaCopia: 'centro', miniRobot: 'centro', escudoPeter: 'centro', lanzadorMikey: 'empuñadura'
  };

  // Puntos de impacto a escala 1, mirando a la derecha, relativos al anclaje.
  //   [dx, dy, radio]  o, en la batería, [dx, dy, ancho, alto] (rectángulo centrado en dx, dy).
  //   mundoX = x + dx · escala · facing ;  mundoY = anclaje + dy · escala.
  P2.P3PUNTOS = {
    robovill: {
      A: { gema: [14, -110, 23] },   // gema copia a escala 1,2 dentro del pecho
      B: { gema: [0, -128, 22] }     // relativo a la PUNTA del taladro (gema a escala 1,15)
    },
    robotPractica: { diana: [3, -88, 20] },
    guardianRobovill: {
      bateria: [-46, -101, 22, 48],  // batería de la espalda (rectángulo)
      boton: [1, -188, 9],           // botón rojo de la cabeza (cúpula + base)
      generador: [60, -101, 16]      // caja del generador + lente rosa del brazo del frente
    },
    granExcavadora: { motor: [-109, -75, 24] },     // motor brillante de atrás
    dronNodriza: { compuerta: [25, 48, 35] }        // agujero de la panza, relativo al CENTRO
  };

  // EXTRA (opcional, no lo exige el contrato): caja visible [izq, arriba, der, abajo]
  // a escala 1, mirando a la derecha, relativa al anclaje. Útil para colocar con
  // precisión las piezas ancladas en el centro, cuyo dibujo NO está centrado en su
  // caja (p. ej. fusionVoladora: 160 px por encima del centro y 97 por debajo).
  // Las claves acabadas en 'B' son la variante B.
  P2.P3CAJA = {
    mikey: [-26, -72, 30, 1], mikeyB: [-37, -79, 30, 1],
    peter: [-23, -66, 28, 1], peterB: [-31, -67, 29, 1],
    robovill: [-240, -292, 177, 2], robovillB: [-157, -290, 189, 0],
    robotMoto: [-47, -143, 66, 2], robotMotoB: [-43, -159, 78, 4],
    robotMotoMoto: [-75, -88, 74, 2], robotMotoMotoB: [-75, -113, 92, 4],
    submarinoNave: [-134, -63, 80, 37], submarinoNaveB: [-160, -52, 79, 35],
    submarinoNaveNave: [-113, -59, 80, 46], submarinoNaveNaveB: [-129, -63, 79, 47],
    fusionTerrestre: [-89, -245, 143, 1], fusionVoladora: [-123, -160, 140, 97], fusionFinal: [-190, -331, 191, 4],
    robotPractica: [-54, -160, 52, 1], granExcavadora: [-124, -167, 177, 2],
    dronNodriza: [-165, -111, 136, 87], guardianRobovill: [-66, -196, 101, 4],
    gemaCopia: [-15, -20, 15, 18], miniRobot: [-18, -21, 13, 19], escudoPeter: [-21, -21, 21, 21],
    lanzadorMikey: [-19, -21, 49, 9]
  };

  // Nombres de las variantes para "Diseños de Juanjo" (cabecera de cada archivo de arte).
  G.P3LOOK_INFO = {
    mikey:    { titulo: 'Mikey Stark',    A: 'El científico', B: 'El hacker del taller' },
    peter:    { titulo: 'Peter Rogers',   A: 'El guardián de la rueda', B: 'El caballero tortuga' },
    robovill: { titulo: 'Robovill',       A: 'Taladro-casco', B: 'Peonza-taladro' },
    moto:     { titulo: 'Robot-moto',     A: 'Rayo', B: 'Bestia' },
    sub:      { titulo: 'Submarino-nave', A: 'Cápsula-escudo', B: 'Delfín-cohete' }
  };
})();
