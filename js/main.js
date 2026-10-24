// main.js — Historia y arranque de "El Rescate de Lord Falcon"
// Creado por Juanjo (10 anios) y Papa.
// Sin dependencias, sin modulos ES, funciona con file://.
// Este archivo define la narrativa (G.storyData), el flujo de capitulos
// (G.flow), hace una comprobacion defensiva de escenas/historias y arranca
// el juego con G.boot(). Se carga el ULTIMO de todos los <script>.
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  // ===========================================================================
  // G.storyData — TODAS las escenas narrativas del juego, en espaniol.
  // Cada entrada es un array de lineas de dialogo: { who, text }.
  // who: 'director' | 'falcon' | 'toros' | 'narrador'.
  // El texto se muestra con efecto de maquina de escribir en la escena 'story'.
  // Tono: cuento de aventuras epico pero tierno, para un ninio de 10 anios.
  // Fiel a la historia manuscrita de Juanjo.
  // ===========================================================================
  G.storyData = Object.assign(G.storyData || {}, {   // se fusiona con las historias de la Parte 2 (js/p2/historia2.js)

    // ---- Capitulo 1: La Emboscada -------------------------------------------
    // Presentacion de los dos amigos + Falcon decide emboscar a Dark Toros.
    's_cap1': [
      { who: 'narrador', text: 'Había una vez dos amigos inseparables: el Director America, el héroe más listo del mundo, y Lord Falcon, el ranger más valiente del bosque.' },
      { who: 'narrador', text: 'Juntos protegían su ciudad de cualquier peligro. Nada podía con su amistad.' },
      { who: 'falcon', text: '¡He encontrado el escondite de Dark Toros! Está en el cañón de las ruinas, al atardecer.' },
      { who: 'director', text: 'Espera, Falcon. Dark Toros tiene la Gema del Poder. Es demasiado peligroso ir solo. Preparemos un plan juntos.' },
      { who: 'falcon', text: 'No hay tiempo, amigo. Si le tiendo una emboscada AHORA, lo pillaré por sorpresa. ¡Confía en mí!' },
      { who: 'narrador', text: 'Y así, ágil como el viento, Lord Falcon saltó entre las rocas doradas del cañón... directo hacia el peligro.' }
    ],

    // ---- Capitulo 2: La Preparacion -----------------------------------------
    // La senial de auxilio llega a la base; el Director calcula y prepara gadgets.
    's_cap2': [
      { who: 'narrador', text: 'En su base tecnológica, rodeado de pantallas azules, el Director America recibió una señal de auxilio.' },
      { who: 'director', text: '¡Es el reloj de Falcon! Su señal parpadea... ¡está en apuros!' },
      { who: 'director', text: 'Mi smartwatch calcula las probabilidades... son bajísimas. Pero un héroe no abandona a su mejor amigo.' },
      { who: 'director', text: 'Cargaré el puño de fuerza, el pulso eléctrico y mi mejor arma: el hackeo. Puertas, torretas, consolas... nada podrá frenarme.' },
      { who: 'narrador', text: 'Con el chaleco puesto y las gafas brillando, el Director se preparó para lo que fuera. Tenía que llegar hasta el hangar.' }
    ],

    // ---- Capitulo 3: Batalla Espacial ---------------------------------------
    // El espacio esta bloqueado por la flota; hackea algunas, destruye las demas.
    's_cap3': [
      { who: 'narrador', text: 'Al salir de la atmósfera, el Director descubrió la verdad: el cielo estaba bloqueado.' },
      { who: 'director', text: 'Una flota entera de Naves Guardianas... custodian la fortaleza de Dark Toros. Es casi imposible pasar.' },
      { who: 'director', text: 'Casi imposible... no significa imposible. Hackearé algunas naves para que luchen de mi lado y destruiré las demás.' },
      { who: 'narrador', text: 'Rayo láser en una mano, rayo de hackeo en la otra. La batalla espacial estaba a punto de comenzar.' }
    ],

    // ---- Capitulo 4: La Nave Nodriza ----------------------------------------
    // Infiltracion en la nave nodriza.
    's_cap4': [
      { who: 'narrador', text: 'Tras cruzar la flota, el Director aterrizó en secreto dentro de la enorme Nave Nodriza.' },
      { who: 'director', text: 'Pasillos oscuros, luces rojas, guardias por todas partes... Falcon tiene que estar aquí dentro.' },
      { who: 'director', text: 'Nada de ruido. Hackearé las puertas una a una y me colaré como una sombra. Aguanta, amigo, ya casi llego.' },
      { who: 'narrador', text: 'Sigiloso y decidido, el Director se adentró en el corazón de la fortaleza enemiga.' }
    ],

    // ---- Capitulo 5: Dark Toros ---------------------------------------------
    // Cara a cara: solo hackeando su martillo podras vencerlo.
    's_cap5': [
      { who: 'narrador', text: 'Al fondo de un largo pasillo se abrió la gran puerta de la sala del trono.' },
      { who: 'toros', text: '¡JA! Sabía que vendrías, héroe. Tu amigo es una carnada perfecta.' },
      { who: 'director', text: 'Suéltalo, Dark Toros. Esto termina aquí.' },
      { who: 'toros', text: '¿Terminar? ¡Mi Escudo de Poder me hace invencible! Ningún golpe tuyo me tocará. ¡JA JA JA!' },
      { who: 'director', text: '(La Gema está en su martillo... si consigo hackearla, su escudo caerá. Es mi única oportunidad.)' },
      { who: 'narrador', text: 'Esquiva el martillazo, hackea el martillo cuando quede clavado y, con el escudo apagado... ¡pégale, héroe!' }
    ],

    // ---- La captura (entre CAP.1 y CAP.2) -----------------------------------
    // Los ataques de Falcon rebotan en el Escudo; Dark Toros lo atrapa como carnada.
    // INCLUYE LITERALMENTE la frase manuscrita de Juanjo.
    's_captura': [
      { who: 'falcon', text: '¡Te tengo, Dark Toros! ¡Prepárate...' },
      { who: 'narrador', text: 'Falcon disparó sus flechas y lanzó sus espadazos con toda su fuerza. Pero uno tras otro, todos sus ataques rebotaron en el Escudo de Poder.' },
      { who: 'toros', text: '¿De verdad creíste que podrías vencerme tú solito? ¡Tus flechas no son nada frente a mi Escudo de Poder!' },
      { who: 'toros', text: 'Te usaré de carnada. Tu amiguito el Director vendrá a salvarte... ¡y así acabaré con los dos de una vez!' },
      { who: 'narrador', text: 'Con un rugido, Dark Toros atrapó a Lord Falcon en una celda de energía y lo arrastró a su fortaleza en el espacio.' },
      { who: 'narrador', text: 'Muy lejos de allí, el reloj del Director America comenzó a parpadear. Al ver la señal de su amigo, su corazón se llenó de valor.' },
      { who: 'director', text: 'Resiste, Falcon. Voy por ti.' },
      { who: 'narrador', text: 'Y lo tuvo clarísimo: aunque fuera lo último que haría, tenía que salvar a su amigo.' }
    ],

    // ---- El despegue (tras CAP.2, antes de CAP.3) ---------------------------
    // El Director despega rumbo al bloqueo espacial.
    's_despegue': [
      { who: 'narrador', text: 'En el hangar de la base, las compuertas se abrieron con un rugido. La nave del Director brillaba, lista para volar.' },
      { who: 'director', text: 'Motores al máximo. Escudos preparados. Rumbo: el espacio, donde retienen a Falcon.' },
      { who: 'director', text: 'Aguanta un poco más, amigo. Ya voy de camino.' },
      { who: 'narrador', text: 'La nave azul salió disparada hacia las estrellas, dejando atrás una estela de luz.' }
    ],

    // ---- La infiltracion (tras CAP.3, antes de CAP.4) -----------------------
    // Tras la batalla espacial, entra a la nave nodriza.
    's_infiltracion': [
      { who: 'narrador', text: 'La flota estaba derrotada. Ante el Director se alzaba, gigantesca, la Nave Nodriza de Dark Toros.' },
      { who: 'director', text: 'Ahí dentro está Falcon. Aterrizaré en silencio y me infiltraré por los pasillos.' },
      { who: 'director', text: 'Un paso en falso y saltarán todas las alarmas. Tranquilo... esto es lo que mejor se me da.' },
      { who: 'narrador', text: 'Con el corazón latiendo fuerte, el Director se coló dentro de la fortaleza enemiga.' }
    ],

    // ---- La confrontacion (tras CAP.4, antes de CAP.5) ----------------------
    // Llega a la sala del trono; Falcon esta en la celda.
    's_confrontacion': [
      { who: 'narrador', text: 'Al final de la fortaleza, el Director empujó una última puerta y entró en la sala del trono.' },
      { who: 'falcon', text: '¡Director! ¡Estás aquí! Estoy atrapado en esta celda de energía... ¡ten cuidado!' },
      { who: 'director', text: 'Te veo, Falcon. Aguanta ahí. Voy a bajar ese escudo y a sacarte de esa jaula.' },
      { who: 'toros', text: '¡BIENVENIDO A TU FINAL, HÉROE! ¡Hoy caerán los dos!' },
      { who: 'narrador', text: 'El suelo tembló. Dark Toros levantó su martillo con la Gema del Poder brillando. La batalla final había comenzado.' }
    ],

    // ---- El final (tras CAP.5) ----------------------------------------------
    // Toros vencido, la Gema apagada, rescate, abrazo de amigos, moraleja.
    's_final': [
      { who: 'narrador', text: 'Con un último golpe, la Gema del Poder se apagó para siempre. Dark Toros cayó derrotado.' },
      { who: 'toros', text: 'Imposible... dos amigos... han podido conmigo...' },
      { who: 'narrador', text: 'La celda de energía se abrió y Lord Falcon saltó libre, directo a abrazar a su mejor amigo.' },
      { who: 'falcon', text: '¡Sabía que vendrías! Perdona por ir solo... tenías razón, somos más fuertes juntos.' },
      { who: 'director', text: 'Siempre, amigo. Un héroe nunca abandona a los suyos. En equipo no hay nada que no podamos lograr.' },
      { who: 'narrador', text: 'Y así, mientras el sol volvía a brillar, los dos amigos regresaron a casa sonriendo, listos para su próxima aventura.' },
      { who: 'narrador', text: 'Porque la mayor fuerza del mundo no es un puño ni una gema... es la amistad.' }
    ]
  });

  // ===========================================================================
  // G.flow — Mapa exacto de capitulos y transiciones (segun el contrato).
  //   chapters[n] = { story, scene }  -> pantalla de historia + escena del nivel.
  //   after[n]    = { story?, next }  -> que pasa al completar el nivel n.
  // ===========================================================================
  G.flow = {
    chapters: {
      1: { story: 's_cap1', scene: 'level1' },
      2: { story: 's_cap2', scene: 'level2' },
      3: { story: 's_cap3', scene: 'level3' },
      4: { story: 's_cap4', scene: 'level4' },
      5: { story: 's_cap5', scene: 'level5' }
    },
    after: {
      1: { story: 's_captura', next: 'level2' },
      2: { story: 's_despegue', next: 'level3' },
      3: { story: 's_infiltracion', next: 'level4' },
      4: { story: 's_confrontacion', next: 'level5' },
      5: { story: 's_final', next: 'credits' }
    }
  };

  // ===========================================================================
  // Comprobacion defensiva: avisa por consola (sin romper el juego) si falta
  // alguna escena o id de historia referenciada por G.flow. Ayuda a detectar
  // que algun modulo no se cargo o que hay un typo, sin lanzar excepciones.
  // ===========================================================================
  function selfCheck() {
    var i, c, a;

    // 1) Escenas base que deben existir para que el flujo funcione.
    var escenasNecesarias = [
      'title', 'story', 'credits', 'gameover', 'levelDone',
      'level1', 'level2', 'level3', 'level4', 'level5'
    ];
    for (i = 0; i < escenasNecesarias.length; i++) {
      var nombre = escenasNecesarias[i];
      if (!G.scenes || !G.scenes[nombre]) {
        console.warn('[main] Falta la escena "' + nombre + '". ¿Se cargo su modulo?');
      }
    }

    // 2) Cada capitulo apunta a una historia valida y a una escena existente.
    for (var n in G.flow.chapters) {
      if (!Object.prototype.hasOwnProperty.call(G.flow.chapters, n)) continue;
      c = G.flow.chapters[n];
      if (!c.story || !G.storyData[c.story]) {
        console.warn('[main] Capitulo ' + n + ': historia "' + c.story + '" no existe en G.storyData.');
      }
      if (!c.scene || !G.scenes[c.scene]) {
        console.warn('[main] Capitulo ' + n + ': escena "' + c.scene + '" no esta registrada.');
      }
    }

    // 3) Cada transicion 'after' apunta a historia (si la hay) y escena validas.
    for (var m in G.flow.after) {
      if (!Object.prototype.hasOwnProperty.call(G.flow.after, m)) continue;
      a = G.flow.after[m];
      if (a.story && !G.storyData[a.story]) {
        console.warn('[main] after[' + m + ']: historia "' + a.story + '" no existe en G.storyData.');
      }
      if (a.next && a.next !== 'title' && a.next !== 'credits' && !G.scenes[a.next]) {
        console.warn('[main] after[' + m + ']: escena "' + a.next + '" no esta registrada.');
      }
    }

    // 4) Verificacion de que cada historia tiene al menos una linea con texto.
    for (var id in G.storyData) {
      if (!Object.prototype.hasOwnProperty.call(G.storyData, id)) continue;
      var arr = G.storyData[id];
      if (!arr || !arr.length) {
        console.warn('[main] La historia "' + id + '" esta vacia.');
      }
    }
  }

  // Ejecutamos la comprobacion en la carga (todos los <script> ya se ejecutaron
  // porque main.js va el ultimo). Nunca debe romper el arranque.
  try {
    selfCheck();
  } catch (e) {
    console.warn('[main] Error en la comprobacion defensiva (no bloquea el juego):', e);
  }

  // ===========================================================================
  // Arranque del juego. core.js se encarga de esperar a DOMContentLoaded si
  // hace falta, cargar el estado, iniciar el bucle y hacer G.go('title').
  // ===========================================================================
  if (typeof G.boot === 'function') {
    G.boot();
  } else {
    console.warn('[main] G.boot no esta definido. ¿Se cargo core.js antes que main.js?');
  }
})();
