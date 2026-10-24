// core.js — Motor de "El Rescate de Lord Falcon"
// Creado por Juanjo (10 anios) y Papa.
// Sin dependencias, sin modulos ES, funciona con file://.
// Cada archivo comparte window.G y aniade lo suyo.
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  // ---------------------------------------------------------------------------
  // Dimensiones fijas del lienzo
  // ---------------------------------------------------------------------------
  G.W = 960;
  G.H = 540;

  // Se rellenan cuando el DOM esta listo.
  G.canvas = null;
  G.ctx = null;

  // ---------------------------------------------------------------------------
  // Utilidades matematicas / de rectangulos
  // ---------------------------------------------------------------------------
  G.clamp = function (v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  };

  G.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  // rects con forma {x, y, w, h}
  G.rectsOverlap = function (a, b) {
    if (!a || !b) return false;
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  };

  G.rand = function (a, b) {
    // Si se llama con un solo argumento -> [0, a)
    if (b === undefined) {
      b = a;
      a = 0;
    }
    return a + Math.random() * (b - a);
  };

  G.randInt = function (a, b) {
    // Entero en [a, b] inclusive.
    if (b === undefined) {
      b = a;
      a = 0;
    }
    return Math.floor(a + Math.random() * (b - a + 1));
  };

  G.dist = function (x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Tiempo en segundos desde el arranque del bucle. Se actualiza cada frame.
  G.T = 0;

  // ---------------------------------------------------------------------------
  // Estado del juego
  // ---------------------------------------------------------------------------
  // hp/maxHp en MEDIOS corazones (10 = 5 corazones).
  // hp2/maxHp2: vida del jugador 2 en modo cooperativo (misma escala).
  // coop: modo 2 jugadores locales (mismo teclado). Persistido.
  // falconRescued: true tras completar el capitulo 5 (rescatar a Lord Falcon).
  // Desbloquea el modo cooperativo. Persistido.
  G.state = { hp: 10, maxHp: 10, hp2: 10, maxHp2: 10, coop: false, unlocked: 1, muted: false, falconRescued: false };

  var SAVE_KEY = 'rescate-lord-falcon-v1';

  G.loadState = function () {
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          if (typeof data.unlocked === 'number' && isFinite(data.unlocked)) {
            G.state.unlocked = G.clamp(Math.floor(data.unlocked), 1, 5);
          }
          if (typeof data.muted === 'boolean') {
            G.state.muted = data.muted;
          }
          if (typeof data.coop === 'boolean') {
            G.state.coop = data.coop;
          }
          if (typeof data.falconRescued === 'boolean') {
            G.state.falconRescued = data.falconRescued;
          } else if (G.state.unlocked >= 5) {
            // MIGRACION: partidas antiguas sin este campo pero que ya se pasaron
            // el juego (unlocked>=5) conservan su co-op: Falcon ya fue rescatado.
            G.state.falconRescued = true;
          }
        }
      }
    } catch (e) {
      // localStorage bloqueado (file:// en algunos navegadores): seguimos sin persistencia.
    }
    // Sin rescatar a Falcon no puede quedar co-op activo (gating del contrato v1.2).
    if (!G.state.falconRescued) {
      G.state.coop = false;
    }
    // Reflejamos el estado de silencio en el audio si ya existe.
    if (G.audio && typeof G.audio.muted !== 'undefined') {
      G.audio.muted = G.state.muted;
    }
  };

  G.saveState = function () {
    try {
      var data = { unlocked: G.state.unlocked, muted: G.state.muted, coop: G.state.coop, falconRescued: G.state.falconRescued };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // Sin persistencia: no pasa nada, el juego sigue.
    }
  };

  // ---------------------------------------------------------------------------
  // Sistema de entrada (teclado). Un unico par de listeners en TODO el juego.
  // Soporta 1 jugador (G.input) y 2 jugadores (G.input + G.input2) con mapeo
  // dinamico segun G.state.coop en el momento del keydown/keyup.
  // ---------------------------------------------------------------------------
  // 'switch' (Parte 3): cambiar de héroe. En las Partes 1 y 2 nadie la lee.
  var ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'shoot', 'hack', 'pause', 'confirm', 'switch'];

  // --- Mapeo de 1 JUGADOR (comportamiento historico, sin cambios) ------------
  // Mapa de codigo de tecla -> nombre(s) logico(s) de accion.
  var KEY_MAP_1P = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    Space: 'jump',
    KeyJ: 'attack',
    KeyZ: 'attack',
    KeyK: 'shoot',
    KeyX: 'shoot',
    KeyH: 'hack',
    KeyC: 'hack',
    KeyP: 'pause',
    Escape: 'pause',
    Enter: 'confirm',
    KeyQ: 'switch',    // Parte 3: cambiar de héroe
    KeyE: 'switch'
  };
  // Algunas teclas mapean a varias acciones (Space -> jump y confirm; flechas
  // arriba/W -> up y jump). Estas se gestionan aparte para no perder ninguna.
  var MULTI_MAP_1P = {
    Space: ['jump', 'confirm'],
    ArrowUp: ['up', 'jump'],
    KeyW: ['up', 'jump']
  };

  // --- Mapeo de 2 JUGADORES (contrato v1.1) ----------------------------------
  // P1 (lado izquierdo/WASD). Nota: KeyW -> up + jump; Space -> jump + confirm.
  var MAP_2P_P1 = {
    KeyA: ['left'],
    KeyD: ['right'],
    KeyW: ['up', 'jump'],
    KeyS: ['down'],
    Space: ['jump', 'confirm'],
    KeyF: ['attack'],
    KeyG: ['shoot'],
    KeyR: ['hack'],
    KeyP: ['pause'],
    Escape: ['pause'],
    Enter: ['confirm'],
    KeyQ: ['switch']   // Parte 3: cambiar de héroe (E no se mapea en co-op)
  };
  // P2 (flechas). Nota: ArrowUp -> up + jump; Enter -> confirm (compartido con P1).
  var MAP_2P_P2 = {
    ArrowLeft: ['left'],
    ArrowRight: ['right'],
    ArrowUp: ['up', 'jump'],
    ArrowDown: ['down'],
    KeyK: ['attack'],
    KeyL: ['shoot'],
    Semicolon: ['hack'], // tecla Enie (Ñ) del teclado espanol
    KeyO: ['hack'],
    Enter: ['confirm'],
    KeyI: ['switch']   // Parte 3: cambiar de héroe
  };

  // Estado de acciones logicas por jugador.
  var held1 = {}, pressed1 = {};   // jugador 1
  var held2 = {}, pressed2 = {};   // jugador 2
  (function initInputMaps() {
    for (var i = 0; i < ACTIONS.length; i++) {
      held1[ACTIONS[i]] = false;
      pressed1[ACTIONS[i]] = false;
      held2[ACTIONS[i]] = false;
      pressed2[ACTIONS[i]] = false;
    }
  })();

  // Para evitar repeticion de keydown del sistema operativo: solo marcamos
  // pressed en el flanco (cuando la tecla pasa de suelta a pulsada).
  var physicalDown = {};

  // El primer keydown de toda la sesion arranca el audio (gesto de usuario).
  var audioKickstarted = false;

  // Devuelve las acciones que un codigo produce para un jugador (1 o 2) segun
  // el modo actual (G.state.coop). En 1 jugador todo va al jugador 1; el 2
  // no recibe nada. En co-op cada jugador usa su propio mapa.
  function actionsForCode(code, player) {
    if (G.state.coop) {
      if (player === 1) return MAP_2P_P1[code] || null;
      return MAP_2P_P2[code] || null;
    }
    // Modo 1 jugador: solo el jugador 1 recibe entrada.
    if (player !== 1) return null;
    if (MULTI_MAP_1P[code]) return MULTI_MAP_1P[code];
    if (KEY_MAP_1P[code]) return [KEY_MAP_1P[code]];
    return null;
  }

  // ¿Alguna tecla fisica pulsada sigue produciendo la accion a en el jugador p?
  function anyPhysicalHolds(a, player) {
    for (var code in physicalDown) {
      if (!physicalDown[code]) continue;
      var acts = actionsForCode(code, player);
      if (!acts) continue;
      for (var i = 0; i < acts.length; i++) {
        if (acts[i] === a) return true;
      }
    }
    return false;
  }

  // Marca held/pressed para un jugador dado un array de acciones.
  function applyDown(acts, wasDown, player) {
    if (!acts) return;
    var held = (player === 1) ? held1 : held2;
    var pressed = (player === 1) ? pressed1 : pressed2;
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      held[a] = true;
      if (!wasDown) pressed[a] = true;
    }
  }

  function onKeyDown(e) {
    var code = e.code;

    // Silencio con KeyM (no es una accion logica, es directo). Igual en ambos modos.
    if (code === 'KeyM') {
      if (!audioKickstarted) {
        audioKickstarted = true;
        if (G.audio && G.audio.init) { try { G.audio.init(); } catch (er) {} }
      }
      if (G.audio && G.audio.toggleMute) { try { G.audio.toggleMute(); } catch (er) {} }
      // Mantenemos coherente el estado persistente de silencio.
      if (G.audio && typeof G.audio.muted !== 'undefined') {
        G.state.muted = G.audio.muted;
      } else {
        G.state.muted = !G.state.muted;
      }
      G.saveState();
      e.preventDefault();
      return;
    }

    var acts1 = actionsForCode(code, 1);
    var acts2 = actionsForCode(code, 2);
    var acts = acts1 || acts2;

    // El primer keydown util arranca el audio (perezoso, tras gesto de usuario).
    if (!audioKickstarted) {
      audioKickstarted = true;
      if (G.audio && G.audio.init) { try { G.audio.init(); } catch (er) {} }
    }

    if (acts1 || acts2) {
      // Evitar que el auto-repeat del SO dispare pressed muchas veces.
      var wasDown = physicalDown[code];
      physicalDown[code] = true;
      applyDown(acts1, wasDown, 1);
      applyDown(acts2, wasDown, 2);
      // Evitar scroll de la pagina con flechas / espacio.
      if (
        code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        e.preventDefault();
      }
    }
  }

  function onKeyUp(e) {
    var code = e.code;
    physicalDown[code] = false;
    // Una accion puede estar sostenida por varias teclas fisicas. Solo la
    // soltamos si ninguna tecla que la produce (para ese jugador) sigue pulsada.
    var acts1 = actionsForCode(code, 1);
    if (acts1) {
      for (var i = 0; i < acts1.length; i++) {
        if (!anyPhysicalHolds(acts1[i], 1)) held1[acts1[i]] = false;
      }
    }
    var acts2 = actionsForCode(code, 2);
    if (acts2) {
      for (var j = 0; j < acts2.length; j++) {
        if (!anyPhysicalHolds(acts2[j], 2)) held2[acts2[j]] = false;
      }
    }
  }

  // Al perder el foco de la ventana soltamos todo para no quedarnos "pegados".
  function releaseAll() {
    for (var code in physicalDown) physicalDown[code] = false;
    for (var i = 0; i < ACTIONS.length; i++) {
      held1[ACTIONS[i]] = false;
      pressed1[ACTIONS[i]] = false;
      held2[ACTIONS[i]] = false;
      pressed2[ACTIONS[i]] = false;
    }
    // Tambien soltamos cualquier toque tactil pendiente.
    touch.resetHeld();
  }

  G.input = {
    held: function (n) {
      // La capa tactil (solo 1 jugador) alimenta al jugador 1.
      return !!held1[n] || !!touch.held[n];
    },
    pressed: function (n) {
      return !!pressed1[n] || !!touch.pressed[n];
    }
  };

  G.input2 = {
    held: function (n) {
      // En 1 jugador el jugador 2 no existe: siempre false.
      if (!G.state.coop) return false;
      return !!held2[n];
    },
    pressed: function (n) {
      if (!G.state.coop) return false;
      return !!pressed2[n];
    }
  };

  // Limpia los 'pressed' al final de cada update (flanco de un solo frame).
  function clearPressed() {
    for (var i = 0; i < ACTIONS.length; i++) {
      pressed1[ACTIONS[i]] = false;
      pressed2[ACTIONS[i]] = false;
      touch.pressed[ACTIONS[i]] = false;
    }
  }
  // Para el atajo de depuracion &avanzar (depuracion.js): limpia el flanco entre
  // fotogramas igual que el bucle principal.
  G.inputClearPressed = clearPressed;

  // ---------------------------------------------------------------------------
  // Capa tactil (SOLO modo 1 jugador). Botones semitransparentes dibujados en
  // el canvas tras el render de la escena. Multitouch por zonas.
  // ---------------------------------------------------------------------------
  var touch = {
    active: false,        // se activa con el primer touchstart o si 'ontouchstart' existe
    held: {},             // acciones sostenidas por dedos activos
    pressed: {},          // acciones en el flanco de touchstart (un frame)
    fingers: {},          // id de dedo -> nombre de boton pulsado (para touchend)
    resetHeld: function () {
      for (var i = 0; i < ACTIONS.length; i++) this.held[ACTIONS[i]] = false;
      this.fingers = {};
    }
  };
  (function initTouch() {
    for (var i = 0; i < ACTIONS.length; i++) {
      touch.held[ACTIONS[i]] = false;
      touch.pressed[ACTIONS[i]] = false;
    }
    // Deteccion perezosa: si el navegador anuncia soporte tactil, marcamos activo
    // (se confirma igualmente en el primer touchstart real).
    if ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0)) {
      touch.active = true;
    }
  })();

  // ¿Estamos en una escena de menu (no de nivel)? Determina el layout tactil.
  function isMenuScene() {
    return !isLevelScene();
  }

  // Parte 3 (contrato §4): una escena de nivel puede declarar scene.touchExtra
  // (funcion u objeto) → {cambio: false|true|'ETIQUETA', vertical: bool}.
  // Nunca lanza: si no existe o falla, {}.
  function sceneTouchExtra() {
    try {
      var sc = currentScene;
      if (!sc || sc.touchExtra == null) return {};
      var ex = (typeof sc.touchExtra === 'function') ? sc.touchExtra() : sc.touchExtra;
      return (ex && typeof ex === 'object') ? ex : {};
    } catch (e) {
      return {};
    }
  }

  // Geometria de los botones en coordenadas del canvas (960x540).
  // Se recalcula bajo demanda; es barata.
  function touchButtons() {
    var W = G.W, H = G.H;
    var PAD_X = PAD.x, PAD_Y = H - 100;
    var btns = [];
    if (isMenuScene()) {
      // En menus: navegacion arriba/abajo + confirmar grande.
      btns.push({ name: 'up',      shape: 'circle', x: W - 90,  y: H - 210, r: 46, label: '▲' });
      btns.push({ name: 'down',    shape: 'circle', x: W - 90,  y: H - 90,  r: 46, label: '▼' });
      btns.push({ name: 'confirm', shape: 'circle', x: 110,     y: H - 96,  r: 64, label: 'OK' });
    } else {
      // Parte 3: botones extra que pide la escena (scene.touchExtra). Las escenas
      // de las Partes 1 y 2 no lo definen: sus botones quedan idénticos.
      var extra = sceneTouchExtra();
      // extra.ocultar: acciones que la escena no usa (p. ej. ['hack', 'jump']);
      // sus botones no se dibujan ni se pueden pulsar (nada de botones muertos).
      var ocultar = (extra.ocultar && extra.ocultar.length) ? extra.ocultar : [];
      var visible = function (n) { return ocultar.indexOf(n) < 0; };
      if (extra.vertical === true) {
        // Cruceta abajo-izquierda (4 direcciones + diagonales al deslizar o
        // pulsar entre dos botones). Deja libre el centro de la pantalla.
        btns.push({ name: 'up',    shape: 'circle', x: PAD_X,      y: PAD_Y - 70, r: 40, label: '▲', pad: true });
        btns.push({ name: 'down',  shape: 'circle', x: PAD_X,      y: PAD_Y + 60, r: 40, label: '▼', pad: true });
        btns.push({ name: 'left',  shape: 'circle', x: PAD_X - 70, y: PAD_Y,      r: 40, label: '◀', pad: true });
        btns.push({ name: 'right', shape: 'circle', x: PAD_X + 70, y: PAD_Y,      r: 40, label: '▶', pad: true });
      } else {
        // En juego: izquierda/derecha abajo-izq.
        btns.push({ name: 'left',    shape: 'circle', x: 78,      y: H - 78,  r: 52, label: '◀' });
        btns.push({ name: 'right',   shape: 'circle', x: 198,     y: H - 78,  r: 52, label: '▶' });
      }
      // Cruz derecha: salto (grande, abajo), ataque (izq), disparo (der), hack (arriba).
      if (visible('jump'))   btns.push({ name: 'jump',    shape: 'circle', x: W - 96,  y: H - 70,  r: 58, label: 'SALTO' });
      if (visible('attack')) btns.push({ name: 'attack',  shape: 'circle', x: W - 196, y: H - 128, r: 44, label: 'ATAQ' });
      if (visible('shoot'))  btns.push({ name: 'shoot',   shape: 'circle', x: W - 66,  y: H - 190, r: 44, label: 'TIRO' });
      if (visible('hack'))   btns.push({ name: 'hack',    shape: 'circle', x: W - 176, y: H - 236, r: 44, label: 'HACK' });
      if (extra.cambio) {
        // Encima de la barra del jefe (y 485-518) y cerca del pulgar izquierdo.
        btns.push({ name: 'switch', shape: 'circle', x: 318, y: H - 130, r: 40,
          label: (typeof extra.cambio === 'string' && extra.cambio) ? extra.cambio : 'CAMBIO' });
      }
    }
    // Comunes arriba-derecha: pausa y silencio (pequenios).
    btns.push({ name: 'pause', shape: 'circle', x: W - 108, y: 40, r: 26, label: 'II' });
    btns.push({ name: 'mute',  shape: 'circle', x: W - 44,  y: 40, r: 26, label: G.state.muted ? '♪̸' : '♪' });
    return btns;
  }

  // Convierte coordenadas de un evento de toque a coordenadas internas del canvas
  // teniendo en cuenta el escalado CSS (getBoundingClientRect).
  function toCanvasCoords(clientX, clientY) {
    var c = G.canvas;
    if (!c) return { x: -1, y: -1 };
    var r = c.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return { x: -1, y: -1 };
    var x = (clientX - r.left) * (G.W / r.width);
    var y = (clientY - r.top) * (G.H / r.height);
    return { x: x, y: y };
  }

  // Cruceta de las escenas verticales (Parte 3): centro y radio de la zona.
  // Dentro de la zona, la direccion se decide por el angulo (8 sectores), asi
  // que se puede ir en diagonal con un solo pulgar ('up+right', etc.).
  var PAD = { x: 130, r: 112, muerto: 14 };
  var PAD_DIRS = ['right', 'down+right', 'down', 'down+left', 'left', 'up+left', 'up', 'up+right'];
  function padAt(px, py, btns) {
    var tiene = false;
    for (var i = 0; i < btns.length; i++) if (btns[i].pad) { tiene = true; break; }
    if (!tiene) return null;
    var cx = PAD.x, cy = G.H - 100;
    var dx = px - cx, dy = py - cy, d2 = dx * dx + dy * dy;
    if (d2 > PAD.r * PAD.r) return null;
    if (d2 < PAD.muerto * PAD.muerto) return { name: 'pad' };   // centro: dedo sin direccion
    var a = Math.atan2(dy, dx);                                  // 0 = derecha, +pi/2 = abajo
    var s = Math.round(a / (Math.PI / 4));
    s = ((s % 8) + 8) % 8;
    return { name: PAD_DIRS[s] };
  }

  // Devuelve el boton bajo un punto del canvas (o null).
  function buttonAt(px, py, btns) {
    var pd = padAt(px, py, btns);
    if (pd) return pd;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var dx = px - b.x, dy = py - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) return b;
    }
    return null;
  }

  // Acciona un boton tactil (held + pressed en el flanco). Maneja mute directamente.
  function pressButton(b) {
    if (b.name === 'mute') {
      if (G.audio && G.audio.toggleMute) { try { G.audio.toggleMute(); } catch (er) {} }
      if (G.audio && typeof G.audio.muted !== 'undefined') {
        G.state.muted = G.audio.muted;
      } else {
        G.state.muted = !G.state.muted;
      }
      G.saveState();
      return;
    }
    // Un nombre puede juntar varias acciones ('up+right' de la cruceta).
    var partes = String(b.name).split('+');
    for (var k = 0; k < partes.length; k++) {
      if (ACTIONS.indexOf(partes[k]) < 0) continue;
      touch.held[partes[k]] = true;
      touch.pressed[partes[k]] = true;
    }
  }

  // Recalcula los held tactiles a partir de los dedos activos y su boton.
  function recomputeTouchHeld(activeButtons) {
    for (var i = 0; i < ACTIONS.length; i++) touch.held[ACTIONS[i]] = false;
    for (var id in activeButtons) {
      var name = activeButtons[id];
      if (!name || name === 'mute') continue;
      var partes = String(name).split('+');
      for (var k = 0; k < partes.length; k++) {
        if (ACTIONS.indexOf(partes[k]) >= 0) touch.held[partes[k]] = true;
      }
    }
  }

  function onTouchStart(e) {
    // La capa tactil solo actua en modo 1 jugador.
    if (G.state.coop) return;
    touch.active = true;
    // Primer gesto: arrancar audio.
    if (!audioKickstarted) {
      audioKickstarted = true;
      if (G.audio && G.audio.init) { try { G.audio.init(); } catch (er) {} }
    }
    var btns = touchButtons();
    var handled = false;
    var touchedButton = false;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      var p = toCanvasCoords(t.clientX, t.clientY);
      var b = buttonAt(p.x, p.y, btns);
      if (b) {
        touch.fingers[t.identifier] = b.name;
        pressButton(b);
        touchedButton = true;
        handled = true;
      } else if (isMenuScene()) {
        // En menus, tocar fuera de los botones = confirmar (toque simple).
        // Tocar claramente arriba/abajo del centro navega.
        if (p.y < G.H * 0.38) {
          touch.pressed['up'] = true;
        } else if (p.y > G.H * 0.62) {
          touch.pressed['down'] = true;
        } else {
          touch.pressed['confirm'] = true;
        }
        touch.fingers[t.identifier] = null; // dedo sin boton sostenido
        handled = true;
      }
    }
    if (touchedButton) recomputeTouchHeld(touch.fingers);
    if (handled) e.preventDefault();
  }

  function onTouchMove(e) {
    if (G.state.coop) { return; }
    // Permitimos "deslizar" el dedo de un boton a otro (habitual en cruces de accion).
    var btns = touchButtons();
    var changed = false;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (!(t.identifier in touch.fingers)) continue; // dedo no nuestro
      var prev = touch.fingers[t.identifier];
      var p = toCanvasCoords(t.clientX, t.clientY);
      var b = buttonAt(p.x, p.y, btns);
      var name = (b && b.name !== 'mute') ? b.name : (b ? 'mute' : null);
      if (name !== prev) {
        touch.fingers[t.identifier] = name;
        changed = true;
      }
    }
    if (changed) recomputeTouchHeld(touch.fingers);
    // Evitamos scroll/zoom mientras el dedo esta sobre el canvas.
    e.preventDefault();
  }

  function onTouchEnd(e) {
    if (G.state.coop) { return; }
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier in touch.fingers) {
        delete touch.fingers[t.identifier];
      }
    }
    recomputeTouchHeld(touch.fingers);
    e.preventDefault();
  }

  // Dibuja la capa de botones tactiles (semitransparente) sobre el canvas.
  // Solo en modo 1 jugador y solo si hay entrada tactil.
  function drawTouchOverlay(ctx) {
    if (!touch.active || G.state.coop) return;
    var btns = touchButtons();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var down = (b.name !== 'mute') && touch.held[b.name];
      ctx.globalAlpha = down ? 0.5 : 0.35;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = down ? '#7dd3fc' : '#1e293b';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e2e8f0';
      ctx.globalAlpha = down ? 0.7 : 0.5;
      ctx.stroke();
      // Etiqueta.
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#f1f5f9';
      var fs = b.r >= 50 ? 18 : (b.r >= 40 ? 14 : 13);
      ctx.font = 'bold ' + fs + 'px -apple-system, "Segoe UI", Arial, sans-serif';
      ctx.fillText(b.label, b.x, b.y + 1);
    }
    ctx.restore();
  }
  G.drawTouchOverlay = drawTouchOverlay;
  // Para los tests (solo lectura): los botones táctiles de la escena actual.
  G.debugTouchButtons = function () { try { return touchButtons(); } catch (e) { return []; } };

  // ---------------------------------------------------------------------------
  // Escenas
  // ---------------------------------------------------------------------------
  G.scenes = {};
  G.sceneName = null;
  G.paused = false;

  // Escena de arranque de seguridad por si 'title' no existiese aun.
  var currentScene = null;

  G.go = function (nombre, params) {
    var next = G.scenes[nombre];
    if (!next) {
      console.warn('[core] Escena desconocida: "' + nombre + '". Se ignora G.go().');
      return;
    }
    // Salir de la escena actual.
    if (currentScene && typeof currentScene.exit === 'function') {
      try { currentScene.exit(); } catch (e) { console.warn('[core] error en exit() de escena', e); }
    }
    // Al cambiar de escena, la pausa se resetea siempre.
    G.paused = false;
    currentScene = next;
    G.sceneName = nombre;
    if (typeof currentScene.enter === 'function') {
      try { currentScene.enter(params); } catch (e) { console.warn('[core] error en enter() de escena', e); }
    }
  };

  // ---------------------------------------------------------------------------
  // Bucle principal: paso fijo 1/60 con acumulador y tope de dt.
  // ---------------------------------------------------------------------------
  var FIXED_DT = 1 / 60;
  var MAX_ACCUM = 0.25; // tope para pestanias en segundo plano (evita "espiral de la muerte")
  var accumulator = 0;
  var lastTime = 0;
  var loopStarted = false;

  function isLevelScene() {
    // "levelDone" y "levelDoneP2" también empiezan por "level", pero son pantallas
    // de menú: sin pausa y, en el móvil, con el botón OK (antes no se podía continuar).
    return typeof G.sceneName === 'string' && G.sceneName.indexOf('level') === 0 &&
      G.sceneName.indexOf('levelDone') !== 0;
  }

  function step(dt) {
    // Pausa global gestionada por core solo en escenas de nivel.
    // Cualquiera de los dos jugadores (o el boton tactil, via G.input) pausa.
    if (isLevelScene()) {
      if (G.input.pressed('pause') || G.input2.pressed('pause')) {
        G.paused = !G.paused;
      }
    }

    if (G.paused) {
      // En pausa NO se llama update. Aun asi limpiamos 'pressed' para que el
      // toggle de pausa no se repita y las teclas no se acumulen.
      clearPressed();
      return;
    }

    if (currentScene && typeof currentScene.update === 'function') {
      try { currentScene.update(dt); } catch (e) { console.warn('[core] error en update() de escena', e); }
    }

    // 'pressed' vive un unico frame de update.
    clearPressed();
  }

  function render() {
    var ctx = G.ctx;
    if (!ctx) return;
    // Limpieza base (las escenas suelen pintar su propio fondo encima).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, G.W, G.H);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, G.W, G.H);
    ctx.restore();

    if (currentScene && typeof currentScene.render === 'function') {
      try { currentScene.render(ctx); } catch (e) { console.warn('[core] error en render() de escena', e); }
    }

    // Overlay de pausa por encima del render de la escena.
    if (G.paused && G.ui && typeof G.ui.drawPause === 'function') {
      try { G.ui.drawPause(ctx); } catch (e) {}
    }

    // Capa tactil (solo 1 jugador) por encima de todo, para que sea visible y
    // tocable incluso en pausa y en los menus.
    try { drawTouchOverlay(ctx); } catch (e) {}
  }

  function frame(now) {
    // now llega en ms desde requestAnimationFrame.
    if (!lastTime) lastTime = now;
    var elapsed = (now - lastTime) / 1000;
    lastTime = now;

    // Tope de dt para pestanias en segundo plano / lag: evita saltos enormes.
    if (elapsed > MAX_ACCUM) elapsed = MAX_ACCUM;
    accumulator += elapsed;

    // Pasos de simulacion de tamanio fijo.
    var guard = 0;
    while (accumulator >= FIXED_DT) {
      step(FIXED_DT);
      G.T += FIXED_DT;
      accumulator -= FIXED_DT;
      guard++;
      if (guard > 8) {
        // Seguridad extra: no acumulamos infinitos pasos en un frame.
        accumulator = 0;
        break;
      }
    }

    // Render en cada frame de animacion.
    render();

    window.requestAnimationFrame(frame);
  }

  function startLoop() {
    if (loopStarted) return;
    loopStarted = true;
    lastTime = 0;
    accumulator = 0;
    window.requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Localizacion del canvas y contexto
  // ---------------------------------------------------------------------------
  function grabCanvas() {
    G.canvas = document.getElementById('game');
    if (G.canvas) {
      // Aseguramos la resolucion interna del lienzo.
      G.canvas.width = G.W;
      G.canvas.height = G.H;
      G.ctx = G.canvas.getContext('2d');
      if (G.ctx) {
        G.ctx.imageSmoothingEnabled = true;
      }
    } else {
      console.warn('[core] No se encontro el canvas #game.');
    }
  }

  // Registramos los listeners de teclado UNA sola vez (solo core.js lo hace).
  var listenersReady = false;
  function installListeners() {
    if (listenersReady) return;
    listenersReady = true;
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('blur', releaseAll, false);

    // Listeners tactiles sobre el canvas. passive:false para poder preventDefault
    // (evita scroll/zoom del navegador mientras se juega). Solo actuan en 1 jugador.
    if (G.canvas) {
      G.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      G.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      G.canvas.addEventListener('touchend', onTouchEnd, { passive: false });
      G.canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
      // Un pointerdown tambien arranca el audio (por si el navegador no emite touch).
      G.canvas.addEventListener('pointerdown', function () {
        if (!audioKickstarted) {
          audioKickstarted = true;
          if (G.audio && G.audio.init) { try { G.audio.init(); } catch (er) {} }
        }
      }, false);
    }
  }

  // ---------------------------------------------------------------------------
  // Boot: carga estado, prepara canvas/entrada, inicia bucle y va a 'title'.
  // La llama main.js al final de todos los <script>.
  // ---------------------------------------------------------------------------
  var booted = false;

  function doBoot() {
    if (booted) return;
    booted = true;

    grabCanvas();
    installListeners();
    G.loadState();

    // Arrancamos el bucle antes de entrar en la escena para que el primer
    // render ocurra siempre, aunque 'title' aun no exista.
    startLoop();

    if (G.scenes.title) {
      G.go('title');
    } else {
      console.warn('[core] G.scenes.title no esta definido en G.boot(). ¿Se cargo ui.js?');
    }
  }

  G.boot = function () {
    // El <script> puede ir en <head>: si el DOM no esta listo, esperamos.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doBoot, { once: true });
    } else {
      doBoot();
    }
  };
})();
