// ============================================================================
// audio.js — "El Rescate de Lord Falcon"
// Motor de audio 100% sintetico con WebAudio: efectos de sonido cortos y
// musicas en loop generadas por secuenciador de osciladores. Sin archivos
// externos, sin dependencias. Todas las funciones son no-op seguras si
// WebAudio no esta disponible o si init() todavia no ha ocurrido.
// ============================================================================

window.G = window.G || {};

(function () {
  'use strict';

  // Estado interno del modulo (closures; nunca se expone salvo por G.audio).
  var ctxA = null;           // AudioContext
  var masterGain = null;     // ganancia maestra (~0.22)
  var musicGain = null;      // ganancia de musica (sub-mezcla bajo masterGain)
  var sfxGain = null;        // ganancia de efectos (sub-mezcla bajo masterGain)
  var ready = false;         // true tras init() con exito
  var currentMusicName = null;
  var musicStopFn = null;    // funcion para detener/objeto de la musica activa
  var musicSeq = null;       // referencia al generador de pasos activo (para scheduler)

  var MASTER_LEVEL = 0.22;

  // ---- utilidades internas -------------------------------------------------

  function now() {
    return ctxA ? ctxA.currentTime : 0;
  }

  function safeCall(fn) {
    // Ejecuta fn() atrapando cualquier excepcion de WebAudio; nunca propaga.
    try { fn(); } catch (e) { /* silencioso: audio nunca debe romper el juego */ }
  }

  // Crea un oscilador+ganancia con envolvente ADSR simple, lo conecta a un
  // destino dado y lo autolimpia al terminar. Devuelve nada relevante.
  function tone(opts) {
    if (!ready || !ctxA) return;
    opts = opts || {};
    var type = opts.type || 'sine';
    var freq = opts.freq || 440;
    var freqEnd = opts.freqEnd; // opcional: glide de frecuencia
    var start = opts.start !== undefined ? opts.start : now();
    var dur = opts.dur || 0.15;
    var vol = opts.vol !== undefined ? opts.vol : 0.5;
    var attack = opts.attack !== undefined ? opts.attack : 0.008;
    var release = opts.release !== undefined ? opts.release : Math.max(0.03, dur * 0.5);
    var dest = opts.dest || sfxGain;
    var detune = opts.detune || 0;

    var osc = ctxA.createOscillator();
    var gain = ctxA.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, start + dur);
    }
    if (detune) osc.detune.setValueAtTime(detune, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(vol, start + attack);
    var relStart = Math.max(start + attack, start + dur - release);
    gain.gain.setValueAtTime(Math.max(vol, 0.0001), relStart);
    gain.gain.linearRampToValueAtTime(0.0001, start + dur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.02);
    osc.onended = function () {
      safeCall(function () {
        osc.disconnect();
        gain.disconnect();
      });
    };
  }

  // Ruido blanco corto (para explosiones, hackFail, etc.)
  function noiseBurst(opts) {
    if (!ready || !ctxA) return;
    opts = opts || {};
    var start = opts.start !== undefined ? opts.start : now();
    var dur = opts.dur || 0.2;
    var vol = opts.vol !== undefined ? opts.vol : 0.4;
    var dest = opts.dest || sfxGain;
    var filterFreq = opts.filterFreq || 1200;
    var filterType = opts.filterType || 'bandpass';
    var filterFreqEnd = opts.filterFreqEnd;

    var bufferSize = Math.max(1, Math.floor(ctxA.sampleRate * dur));
    var buffer = ctxA.createBuffer(1, bufferSize, ctxA.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var src = ctxA.createBufferSource();
    src.buffer = buffer;

    var filter = ctxA.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, start);
    if (filterFreqEnd !== undefined) {
      filter.frequency.linearRampToValueAtTime(filterFreqEnd, start + dur);
    }
    filter.Q.value = opts.q !== undefined ? opts.q : 1.0;

    var gain = ctxA.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.linearRampToValueAtTime(0.0001, start + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(start);
    src.stop(start + dur + 0.02);
    src.onended = function () {
      safeCall(function () {
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      });
    };
  }

  // ---- catalogo de efectos de sonido ----------------------------------------
  // Cada funcion recibe tiempo "start" opcional para poder encadenar notas.
  var SFX = {
    jump: function () {
      tone({ type: 'square', freq: 380, freqEnd: 620, dur: 0.16, vol: 0.28, attack: 0.005 });
    },
    sword: function () {
      tone({ type: 'sawtooth', freq: 900, freqEnd: 300, dur: 0.12, vol: 0.22, attack: 0.002 });
      noiseBurst({ dur: 0.08, vol: 0.15, filterFreq: 2500, filterType: 'highpass' });
    },
    arrow: function () {
      tone({ type: 'triangle', freq: 700, freqEnd: 1100, dur: 0.14, vol: 0.22, attack: 0.003 });
    },
    punch: function () {
      tone({ type: 'square', freq: 160, freqEnd: 70, dur: 0.14, vol: 0.32, attack: 0.002 });
      noiseBurst({ dur: 0.06, vol: 0.2, filterFreq: 500, filterType: 'lowpass' });
    },
    laser: function () {
      tone({ type: 'sawtooth', freq: 1200, freqEnd: 450, dur: 0.1, vol: 0.18, attack: 0.002 });
    },
    zap: function () {
      tone({ type: 'square', freq: 520, freqEnd: 900, dur: 0.09, vol: 0.22, attack: 0.002 });
      tone({ type: 'square', freq: 1040, freqEnd: 1800, dur: 0.06, vol: 0.12, attack: 0.002, start: now() + 0.02 });
    },
    hit: function () {
      tone({ type: 'triangle', freq: 300, freqEnd: 150, dur: 0.1, vol: 0.25, attack: 0.002 });
    },
    clink: function () {
      // Escudo: sonido metalico brillante, muy distinto de "hit" (regla: 0 danio).
      tone({ type: 'square', freq: 1600, freqEnd: 2200, dur: 0.08, vol: 0.16, attack: 0.001 });
      tone({ type: 'sine', freq: 2400, dur: 0.14, vol: 0.1, attack: 0.001, start: now() + 0.005 });
    },
    hurt: function () {
      tone({ type: 'sawtooth', freq: 220, freqEnd: 110, dur: 0.22, vol: 0.28, attack: 0.002 });
    },
    pickup: function () {
      tone({ type: 'sine', freq: 700, dur: 0.09, vol: 0.22, attack: 0.004 });
      tone({ type: 'sine', freq: 1050, dur: 0.12, vol: 0.2, attack: 0.004, start: now() + 0.07 });
    },
    hack: function () {
      tone({ type: 'square', freq: 420, dur: 0.1, vol: 0.14, attack: 0.004 });
      tone({ type: 'square', freq: 520, dur: 0.1, vol: 0.12, attack: 0.004, start: now() + 0.09 });
    },
    hackOk: function () {
      tone({ type: 'sine', freq: 660, dur: 0.1, vol: 0.24, attack: 0.003, start: now() });
      tone({ type: 'sine', freq: 880, dur: 0.12, vol: 0.22, attack: 0.003, start: now() + 0.09 });
      tone({ type: 'sine', freq: 1320, dur: 0.16, vol: 0.2, attack: 0.003, start: now() + 0.18 });
    },
    hackFail: function () {
      tone({ type: 'square', freq: 260, freqEnd: 160, dur: 0.18, vol: 0.24, attack: 0.002 });
      noiseBurst({ dur: 0.12, vol: 0.12, filterFreq: 800, filterType: 'lowpass' });
    },
    explosion: function () {
      noiseBurst({ dur: 0.32, vol: 0.32, filterFreq: 1400, filterFreqEnd: 200, filterType: 'lowpass', q: 0.7 });
      tone({ type: 'sine', freq: 140, freqEnd: 50, dur: 0.28, vol: 0.22, attack: 0.002 });
    },
    roar: function () {
      tone({ type: 'sawtooth', freq: 130, freqEnd: 90, dur: 0.5, vol: 0.26, attack: 0.03, release: 0.25 });
      noiseBurst({ dur: 0.4, vol: 0.12, filterFreq: 500, filterType: 'lowpass' });
    },
    select: function () {
      tone({ type: 'sine', freq: 500, dur: 0.06, vol: 0.18, attack: 0.003 });
      tone({ type: 'sine', freq: 760, dur: 0.08, vol: 0.16, attack: 0.003, start: now() + 0.05 });
    },
    victory: function () {
      var t0 = now();
      var notes = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'triangle', freq: notes[i], dur: 0.22, vol: 0.24, attack: 0.004, start: t0 + i * 0.12 });
      }
    },
    door: function () {
      tone({ type: 'square', freq: 200, freqEnd: 340, dur: 0.28, vol: 0.18, attack: 0.02 });
    },
    checkpoint: function () {
      tone({ type: 'sine', freq: 600, dur: 0.09, vol: 0.2, attack: 0.004 });
      tone({ type: 'sine', freq: 900, dur: 0.14, vol: 0.2, attack: 0.004, start: now() + 0.08 });
      tone({ type: 'sine', freq: 1200, dur: 0.18, vol: 0.18, attack: 0.004, start: now() + 0.16 });
    },

    // ---- Parte 2 "La Gema Robada": efectos nuevos (aditivos) ----
    robot: function () {
      // Paso/zumbido metalico de robot: "clonc" grave + chasquido de chapa.
      tone({ type: 'square', freq: 150, freqEnd: 105, dur: 0.08, vol: 0.15, attack: 0.002 });
      tone({ type: 'square', freq: 620, freqEnd: 540, dur: 0.04, vol: 0.06, attack: 0.001, start: now() + 0.01 });
      noiseBurst({ dur: 0.05, vol: 0.07, filterFreq: 3200, filterType: 'bandpass', q: 3 });
    },
    boost: function () {
      // Turbo: motor que sube + soplido de aire.
      tone({ type: 'sawtooth', freq: 180, freqEnd: 820, dur: 0.38, vol: 0.17, attack: 0.01, release: 0.15 });
      tone({ type: 'square', freq: 90, freqEnd: 260, dur: 0.3, vol: 0.08, attack: 0.01 });
      noiseBurst({ dur: 0.34, vol: 0.12, filterFreq: 700, filterFreqEnd: 3200, filterType: 'bandpass', q: 1.2 });
    },
    net: function () {
      // Lanza-redes: "fiuuu" de la red abriendose + pequeno "thwip".
      tone({ type: 'triangle', freq: 520, freqEnd: 300, dur: 0.14, vol: 0.18, attack: 0.002 });
      noiseBurst({ dur: 0.2, vol: 0.13, filterFreq: 1800, filterFreqEnd: 600, filterType: 'bandpass', q: 1.5 });
      tone({ type: 'sine', freq: 900, freqEnd: 1300, dur: 0.07, vol: 0.1, attack: 0.002, start: now() + 0.12 });
    },
    shieldBlock: function () {
      // Escudo que para un golpe: "clang" metalico con cuerpo (mas grave que clink).
      tone({ type: 'square', freq: 880, freqEnd: 1250, dur: 0.07, vol: 0.15, attack: 0.001 });
      tone({ type: 'triangle', freq: 310, freqEnd: 260, dur: 0.14, vol: 0.18, attack: 0.001 });
      tone({ type: 'sine', freq: 1760, dur: 0.24, vol: 0.08, attack: 0.001, start: now() + 0.01 });
    },
    jetpack: function () {
      // Propulsor: rafaga de fuego suave.
      noiseBurst({ dur: 0.26, vol: 0.16, filterFreq: 1100, filterFreqEnd: 500, filterType: 'lowpass', q: 0.8 });
      tone({ type: 'sawtooth', freq: 95, freqEnd: 130, dur: 0.24, vol: 0.09, attack: 0.02 });
    },
    transform: function () {
      // Transformacion coche <-> robot: "chk-chk-chk" + arpegio que sube.
      var t0 = now();
      var notes = [330, 440, 554.37, 659.25, 880];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'square', freq: notes[i], dur: 0.07, vol: 0.12, attack: 0.002, start: t0 + i * 0.065 });
        noiseBurst({ dur: 0.03, vol: 0.08, filterFreq: 2600, filterType: 'highpass', start: t0 + i * 0.065 });
      }
      tone({ type: 'sawtooth', freq: 200, freqEnd: 500, dur: 0.34, vol: 0.08, attack: 0.02, start: t0 });
    },
    gemGrab: function () {
      // Coger la Gema del Poder: brillo magico que sube y se queda vibrando.
      var t0 = now();
      var notes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'sine', freq: notes[i], dur: 0.2, vol: 0.18, attack: 0.004, start: t0 + i * 0.07 });
      }
      tone({ type: 'triangle', freq: 1975.53, dur: 0.5, vol: 0.08, attack: 0.02, release: 0.35, start: t0 + 0.35, detune: 8 });
      tone({ type: 'triangle', freq: 1318.51, dur: 0.5, vol: 0.08, attack: 0.02, release: 0.35, start: t0 + 0.35, detune: -8 });
    },
    bigPunch: function () {
      // Punetazo gigante: impacto grave y contundente (sin estridencias).
      tone({ type: 'square', freq: 210, freqEnd: 55, dur: 0.24, vol: 0.3, attack: 0.002 });
      tone({ type: 'sine', freq: 75, freqEnd: 40, dur: 0.32, vol: 0.24, attack: 0.002 });
      noiseBurst({ dur: 0.18, vol: 0.26, filterFreq: 900, filterFreqEnd: 150, filterType: 'lowpass', q: 0.7 });
    },
    press: function () {
      // Prensa de la fabrica: golpe pesado de piston + chasquido metalico.
      noiseBurst({ dur: 0.28, vol: 0.26, filterFreq: 700, filterFreqEnd: 90, filterType: 'lowpass', q: 0.8 });
      tone({ type: 'sine', freq: 115, freqEnd: 45, dur: 0.3, vol: 0.24, attack: 0.002 });
      tone({ type: 'square', freq: 640, freqEnd: 560, dur: 0.05, vol: 0.07, attack: 0.001 });
    },
    medal: function () {
      // Medalla: fanfarria cortita y brillante.
      var t0 = now();
      tone({ type: 'triangle', freq: 783.99, dur: 0.1, vol: 0.2, attack: 0.003, start: t0 });
      tone({ type: 'triangle', freq: 987.77, dur: 0.1, vol: 0.2, attack: 0.003, start: t0 + 0.08 });
      tone({ type: 'triangle', freq: 1174.66, dur: 0.12, vol: 0.2, attack: 0.003, start: t0 + 0.16 });
      tone({ type: 'sine', freq: 1567.98, dur: 0.36, vol: 0.18, attack: 0.004, release: 0.25, start: t0 + 0.26 });
      tone({ type: 'sine', freq: 2349.32, dur: 0.2, vol: 0.06, attack: 0.004, start: t0 + 0.3 });
    },

    // ---- Parte 3 "We Are a Team": efectos nuevos (aditivos; contrato §17) ----
    switchHero: function () {
      // Cambio de heroe: "¡zas!" que sube + destellito.
      var t0 = now();
      tone({ type: 'square', freq: 300, freqEnd: 1200, dur: 0.12, vol: 0.15, attack: 0.002 });
      noiseBurst({ dur: 0.09, vol: 0.1, filterFreq: 2500, filterFreqEnd: 6000, filterType: 'highpass', start: t0 });
      tone({ type: 'sine', freq: 1568, dur: 0.12, vol: 0.12, attack: 0.002, start: t0 + 0.08 });
      tone({ type: 'sine', freq: 2093, dur: 0.1, vol: 0.07, attack: 0.002, start: t0 + 0.13 });
    },
    blaster: function () {
      // Lanzador de energia (pistola y metralleta): "piu" azul, corto y limpio.
      tone({ type: 'square', freq: 880, freqEnd: 440, dur: 0.09, vol: 0.14, attack: 0.002 });
      tone({ type: 'sine', freq: 1320, freqEnd: 700, dur: 0.07, vol: 0.08, attack: 0.002 });
    },
    sniper: function () {
      // Francotirador: se carga (sube) y sale el disparo largo con chasquido.
      var t0 = now();
      tone({ type: 'sine', freq: 400, freqEnd: 1600, dur: 0.11, vol: 0.12, attack: 0.004 });
      tone({ type: 'sawtooth', freq: 1800, freqEnd: 280, dur: 0.2, vol: 0.16, attack: 0.002, start: t0 + 0.1 });
      noiseBurst({ dur: 0.1, vol: 0.12, filterFreq: 3500, filterType: 'highpass', start: t0 + 0.1 });
      tone({ type: 'sine', freq: 2400, freqEnd: 1800, dur: 0.18, vol: 0.05, attack: 0.002, start: t0 + 0.12 });
    },
    launcherSwap: function () {
      // Cambio de lanzador: "clic-clac" mecanico.
      var t0 = now();
      tone({ type: 'square', freq: 1400, freqEnd: 1250, dur: 0.03, vol: 0.12, attack: 0.001 });
      noiseBurst({ dur: 0.025, vol: 0.1, filterFreq: 4000, filterType: 'highpass', start: t0 });
      tone({ type: 'square', freq: 900, freqEnd: 760, dur: 0.045, vol: 0.13, attack: 0.001, start: t0 + 0.08 });
      noiseBurst({ dur: 0.03, vol: 0.1, filterFreq: 2600, filterType: 'highpass', start: t0 + 0.08 });
    },
    shieldThrow: function () {
      // Escudo lanzado: "fiuuu" que gira y se aleja.
      tone({ type: 'triangle', freq: 900, freqEnd: 480, dur: 0.3, vol: 0.15, attack: 0.004 });
      tone({ type: 'sine', freq: 1300, freqEnd: 700, dur: 0.26, vol: 0.06, attack: 0.004, detune: 12 });
      noiseBurst({ dur: 0.28, vol: 0.12, filterFreq: 1600, filterFreqEnd: 650, filterType: 'bandpass', q: 1.4 });
    },
    shieldCatch: function () {
      // Escudo que vuelve a la mano: "¡clanc!" brillante y satisfecho.
      tone({ type: 'square', freq: 1000, freqEnd: 1320, dur: 0.06, vol: 0.13, attack: 0.001 });
      tone({ type: 'triangle', freq: 420, freqEnd: 380, dur: 0.13, vol: 0.17, attack: 0.001 });
      tone({ type: 'sine', freq: 2093, dur: 0.24, vol: 0.07, attack: 0.001, start: now() + 0.02 });
    },
    laserBarrier: function () {
      // Barrera laser: "bzzt" electrico.
      tone({ type: 'sawtooth', freq: 120, dur: 0.22, vol: 0.12, attack: 0.002, detune: 15 });
      tone({ type: 'square', freq: 241, freqEnd: 228, dur: 0.2, vol: 0.07, attack: 0.002 });
      noiseBurst({ dur: 0.2, vol: 0.09, filterFreq: 3200, filterType: 'bandpass', q: 4 });
    },
    drill: function () {
      // Taladro gigante de Robovill / la Gran Excavadora: zumbido que gira.
      tone({ type: 'sawtooth', freq: 210, freqEnd: 265, dur: 0.42, vol: 0.12, attack: 0.02, release: 0.12 });
      tone({ type: 'square', freq: 105, freqEnd: 132, dur: 0.42, vol: 0.08, attack: 0.02, release: 0.12 });
      noiseBurst({ dur: 0.42, vol: 0.1, filterFreq: 1800, filterFreqEnd: 2600, filterType: 'bandpass', q: 2 });
    },
    rumble: function () {
      // Temblor de excavacion: retumbar grave y polvo.
      noiseBurst({ dur: 0.65, vol: 0.28, filterFreq: 320, filterFreqEnd: 80, filterType: 'lowpass', q: 0.7 });
      tone({ type: 'sine', freq: 58, freqEnd: 40, dur: 0.6, vol: 0.2, attack: 0.03, release: 0.3 });
    },
    splash: function () {
      // Agua: "chof" + gotitas.
      var t0 = now();
      noiseBurst({ dur: 0.34, vol: 0.2, filterFreq: 1800, filterFreqEnd: 380, filterType: 'bandpass', q: 0.9 });
      tone({ type: 'sine', freq: 620, freqEnd: 190, dur: 0.15, vol: 0.12, attack: 0.002 });
      tone({ type: 'sine', freq: 1400, freqEnd: 1900, dur: 0.05, vol: 0.06, attack: 0.002, start: t0 + 0.14 });
      tone({ type: 'sine', freq: 1100, freqEnd: 1600, dur: 0.05, vol: 0.05, attack: 0.002, start: t0 + 0.22 });
    },
    teamAttack: function () {
      // ¡ATAQUE EN EQUIPO!: acorde que sube a toda velocidad + gran rayo + golpe final.
      var t0 = now();
      var notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'sawtooth', freq: notes[i], dur: 0.16, vol: 0.1, attack: 0.003, start: t0 + i * 0.05 });
      }
      noiseBurst({ dur: 0.7, vol: 0.18, filterFreq: 400, filterFreqEnd: 5000, filterType: 'bandpass', q: 1.1, start: t0 + 0.2 });
      tone({ type: 'square', freq: 523.25, dur: 0.6, vol: 0.09, attack: 0.01, release: 0.3, start: t0 + 0.35 });
      tone({ type: 'square', freq: 783.99, dur: 0.6, vol: 0.07, attack: 0.01, release: 0.3, start: t0 + 0.35 });
      tone({ type: 'sine', freq: 1046.50, dur: 0.6, vol: 0.08, attack: 0.01, release: 0.3, start: t0 + 0.35 });
      tone({ type: 'sine', freq: 90, freqEnd: 40, dur: 0.5, vol: 0.24, attack: 0.002, start: t0 + 0.85 });
      noiseBurst({ dur: 0.35, vol: 0.22, filterFreq: 900, filterFreqEnd: 150, filterType: 'lowpass', q: 0.7, start: t0 + 0.85 });
    },
    fusion3: function () {
      // Fusion gigante: larga y ascendente (de grave a brillante) con un destello final.
      var t0 = now();
      var notes = [130.81, 164.81, 196.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'triangle', freq: notes[i], dur: 0.26, vol: 0.13, attack: 0.01, start: t0 + i * 0.13 });
        tone({ type: 'square', freq: notes[i] * 2, dur: 0.08, vol: 0.04, attack: 0.002, start: t0 + i * 0.13 });
      }
      tone({ type: 'sawtooth', freq: 110, freqEnd: 440, dur: 1.3, vol: 0.07, attack: 0.05, release: 0.3, start: t0 });
      noiseBurst({ dur: 1.3, vol: 0.08, filterFreq: 200, filterFreqEnd: 4000, filterType: 'bandpass', q: 1.2, start: t0 });
      tone({ type: 'sine', freq: 1567.98, dur: 0.6, vol: 0.1, attack: 0.01, release: 0.45, start: t0 + 1.3, detune: 6 });
      tone({ type: 'sine', freq: 2093.00, dur: 0.6, vol: 0.07, attack: 0.01, release: 0.45, start: t0 + 1.3, detune: -6 });
    },
    miniRobot: function () {
      // Mini-robot de Robovill: zumbidito de helice, flojito.
      var t0 = now();
      tone({ type: 'square', freq: 520, freqEnd: 560, dur: 0.07, vol: 0.05, attack: 0.002 });
      tone({ type: 'square', freq: 540, freqEnd: 580, dur: 0.07, vol: 0.045, attack: 0.002, start: t0 + 0.075 });
      tone({ type: 'square', freq: 520, freqEnd: 600, dur: 0.07, vol: 0.04, attack: 0.002, start: t0 + 0.15 });
    },
    escape: function () {
      // Robovill huye: alas de metal que se abren (clinc-clanc) y un gran soplido que se aleja hacia arriba.
      var t0 = now();
      tone({ type: 'square', freq: 700, freqEnd: 640, dur: 0.06, vol: 0.1, attack: 0.001 });
      tone({ type: 'square', freq: 940, freqEnd: 880, dur: 0.06, vol: 0.09, attack: 0.001, start: t0 + 0.1 });
      tone({ type: 'sawtooth', freq: 180, freqEnd: 620, dur: 0.8, vol: 0.1, attack: 0.03, release: 0.4, start: t0 + 0.18 });
      noiseBurst({ dur: 0.85, vol: 0.18, filterFreq: 500, filterFreqEnd: 2600, filterType: 'bandpass', q: 1, start: t0 + 0.18 });
      tone({ type: 'sine', freq: 880, freqEnd: 1760, dur: 0.6, vol: 0.05, attack: 0.05, start: t0 + 0.4 });
    }
  };

  // ---- secuenciador simple para musicas --------------------------------------
  // Cada tema define un patron de pasos (arreglo de {freq|null, dur_en_pasos})
  // para 1-3 voces (bajo/acorde/melodia) mas un pulso de percusion opcional.
  // Se reproduce con lookahead scheduling manejado dentro de update(dt) del
  // propio juego? -> Este modulo NO posee su propio rAF/setInterval (regla del
  // equipo): en su lugar, cada llamada a music(...) programa TODO el patron
  // completo repetidas veces por adelantado usando el reloj de AudioContext
  // (que corre independientemente del hilo JS), y se reprograma automaticamente
  // llamando a un "topup" cada vez que se llama audio.sfx/audio.music, y ademas
  // desde un unico temporizador propio basado en AudioContext (no en JS timers)
  // mediante encadenamiento de nodos "onended" de notas silenciosas de control.
  // Esto evita setInterval/setTimeout y respeta la regla de no poseer timers
  // adicionales fuera del bucle de sonido nativo de WebAudio.

  var STEP = 0.145; // duracion base de un paso (segundos) ~ tempo medio

  function n(name) {
    // Notas -> frecuencia (octava media), C4=261.63
    var table = {
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51,
      'Cs3': 138.59, 'Ds3': 155.56, 'Fs3': 185.00, 'Gs3': 207.65, 'As3': 233.08,
      'Cs4': 277.18, 'Ds4': 311.13, 'Fs4': 369.99, 'Gs4': 415.30, 'As4': 466.16,
      'Cs5': 554.37, 'Ds5': 622.25, 'Fs5': 739.99, 'Gs5': 830.61, 'As5': 932.33,
      // Parte 2: notas graves extra para los bajos de las nuevas musicas.
      'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
      'Gs2': 103.83, 'As2': 116.54,
      // Parte 3: unas pocas notas mas (graves y agudas) para las musicas nuevas.
      'C2': 65.41, 'Ds2': 77.78, 'Fs2': 92.50, 'Cs6': 1108.73, 'F6': 1396.91, 'G6': 1567.98
    };
    return table[name] || null;
  }

  // Definicion de temas: cada uno con tempo propio, forma de onda por voz y
  // patrones (bajo / acorde-pad / melodia / percusion simple con ruido).
  function buildThemes() {
    return {
      title: {
        step: 0.155,
        bass: { type: 'triangle', vol: 0.16, pattern: ['C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'F3', 'F3'] },
        pad: { type: 'sine', vol: 0.07, pattern: ['C4', null, 'E4', null, 'A4', null, 'F4', null] },
        lead: {
          type: 'square', vol: 0.13,
          pattern: ['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'F5', 'E5', 'D5', null, 'G4', null, 'C5', null, null, null]
        },
        perc: true
      },
      canyon: {
        step: 0.16,
        bass: { type: 'triangle', vol: 0.15, pattern: ['G3', null, 'G3', 'D3', 'E3', null, 'E3', 'D3'] },
        pad: { type: 'sine', vol: 0.06, pattern: ['G4', null, null, null, 'C4', null, null, null] },
        lead: {
          type: 'triangle', vol: 0.14,
          pattern: ['D5', null, 'E5', 'G5', null, 'E5', 'D5', null, 'B4', null, 'D5', 'C5', null, 'B4', 'A4', null]
        },
        perc: true
      },
      base: {
        step: 0.135,
        bass: { type: 'square', vol: 0.12, pattern: ['C3', null, 'C3', null, 'As3', null, 'As3', null] },
        pad: { type: 'sine', vol: 0.08, pattern: ['E4', null, 'G4', null, 'Ds4', null, 'G4', null] },
        lead: {
          type: 'square', vol: 0.1,
          pattern: ['G4', 'A4', 'C5', null, 'As4', 'C5', 'Ds5', null, 'C5', 'A4', 'G4', null, 'F4', 'G4', 'As4', null]
        },
        perc: true
      },
      space: {
        step: 0.19,
        bass: { type: 'sine', vol: 0.13, pattern: ['C3', null, null, 'G3', null, null, 'A3', null] },
        pad: { type: 'triangle', vol: 0.09, pattern: ['E4', null, 'G4', null, 'B4', null, 'A4', null] },
        lead: {
          type: 'sine', vol: 0.12,
          pattern: [null, 'C5', null, 'E5', null, 'G5', null, null, null, 'A4', null, 'C5', null, 'B4', null, null]
        },
        perc: false
      },
      ship: {
        step: 0.115,
        bass: { type: 'sawtooth', vol: 0.13, pattern: ['C3', 'C3', 'Ds3', 'Ds3', 'As3', 'As3', 'Gs3', 'Gs3'] },
        pad: { type: 'square', vol: 0.05, pattern: ['G3', null, null, null, 'Fs3', null, null, null] },
        lead: {
          type: 'sawtooth', vol: 0.11,
          pattern: ['C5', 'Ds5', 'C5', 'Ds5', 'Fs4', null, 'Gs4', null, 'As4', 'Gs4', 'As4', null, 'Fs4', null, null, null]
        },
        perc: true
      },
      boss: {
        step: 0.125,
        bass: { type: 'sawtooth', vol: 0.18, pattern: ['C3', 'C3', 'C3', 'Ds3', 'C3', 'C3', 'As3', 'Gs3'] },
        pad: { type: 'square', vol: 0.07, pattern: ['Gs3', null, null, null, 'Fs3', null, null, null] },
        lead: {
          type: 'square', vol: 0.14,
          pattern: ['C5', null, 'Ds5', 'C5', 'Gs4', null, 'As4', 'C5', 'Ds5', null, 'F5', 'Ds5', 'C5', null, 'As4', null]
        },
        perc: true
      },
      victory: {
        step: 0.15,
        bass: { type: 'triangle', vol: 0.15, pattern: ['C3', null, 'F3', null, 'G3', null, 'C3', null] },
        pad: { type: 'sine', vol: 0.08, pattern: ['E4', null, 'A4', null, 'B4', null, 'C5', null] },
        lead: {
          type: 'triangle', vol: 0.16,
          pattern: ['C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', null, 'D5', 'E5', 'F5', 'A5', 'G5', 'E5', 'C5', null]
        },
        perc: true
      },

      // ---- Parte 2 "La Gema Robada": musicas nuevas (aditivas) ----
      // En todas, bajo, pad y melodia miden lo mismo para que el bucle cuadre.

      // Ciudad atacada: aventurera, en Sol mayor (G - Em - C - D).
      city: {
        step: 0.15,
        bass: { type: 'triangle', vol: 0.15, pattern: ['G3', null, 'D3', 'G3', 'E3', null, 'B3', 'E3', 'C3', null, 'G3', 'C3', 'D3', null, 'A3', 'Fs3'] },
        pad: { type: 'sine', vol: 0.065, pattern: ['B4', null, null, null, 'G4', null, null, null, 'E4', null, null, null, 'Fs4', null, null, null] },
        lead: {
          type: 'square', vol: 0.11,
          pattern: ['G4', 'B4', 'D5', null, 'E5', 'D5', 'B4', null, 'C5', 'E5', 'G5', 'E5', 'D5', null, 'A4', null]
        },
        perc: true
      },
      // Carrera: rapida y con energia, Mi menor con bajo galopante.
      race: {
        step: 0.105,
        bass: { type: 'sawtooth', vol: 0.11, pattern: ['E3', 'E3', 'B3', 'E3', 'C3', 'C3', 'G3', 'C3', 'D3', 'D3', 'A3', 'D3', 'B2', 'B2', 'Fs3', 'B2'] },
        pad: { type: 'triangle', vol: 0.06, pattern: ['G4', null, null, null, 'E4', null, null, null, 'Fs4', null, null, null, 'Ds4', null, null, null] },
        lead: {
          type: 'square', vol: 0.09,
          pattern: ['E5', 'G5', 'B5', 'G5', 'E5', 'G5', 'A5', 'G5', 'Fs5', 'D5', 'A5', 'Fs5', 'B4', 'Ds5', 'Fs5', 'B5']
        },
        perc: true
      },
      // Fabrica de robots: ritmica y metalica, La menor con golpes de chapa.
      factory: {
        step: 0.13,
        bass: { type: 'square', vol: 0.11, pattern: ['A2', null, 'A3', 'A2', null, 'A2', 'A3', null, 'F2', null, 'F3', 'F2', 'G2', null, 'G3', 'E3'] },
        pad: { type: 'square', vol: 0.045, pattern: ['E4', null, null, 'E4', null, null, 'E4', null, 'C4', null, null, 'C4', null, null, 'D4', 'B3'] },
        lead: {
          type: 'triangle', vol: 0.13,
          pattern: ['A5', null, 'E5', null, 'A5', 'G5', 'E5', null, 'F5', null, 'C5', null, 'D5', 'E5', null, null]
        },
        perc: true
      },
      // Vuelo: epica y aerea, Do mayor amplio (C - Am - F - G).
      sky: {
        step: 0.17,
        bass: { type: 'triangle', vol: 0.15, pattern: ['C3', null, null, 'G3', 'A3', null, null, 'E3', 'F3', null, null, 'C3', 'G3', null, 'D3', 'G3'] },
        pad: { type: 'sine', vol: 0.08, pattern: ['E4', null, 'G4', null, 'E4', null, 'C5', null, 'A4', null, 'F4', null, 'B4', null, 'D5', null] },
        lead: {
          type: 'triangle', vol: 0.14,
          pattern: ['G5', null, 'E5', 'G5', 'A5', null, 'G5', 'E5', 'F5', null, 'A5', 'C6', 'B5', null, 'G5', null]
        },
        perc: true
      },
      // Jefe Dark Secuaz: tensa, Re menor con bajo insistente.
      boss2: {
        step: 0.12,
        bass: { type: 'sawtooth', vol: 0.15, pattern: ['D3', 'D3', 'A3', 'D3', 'D3', 'D3', 'As3', 'A3', 'D3', 'D3', 'A3', 'D3', 'C3', 'C3', 'Cs3', 'Cs3'] },
        pad: { type: 'square', vol: 0.06, pattern: ['F4', null, null, null, 'E4', null, null, null, 'F4', null, null, null, 'E4', null, null, null] },
        lead: {
          type: 'square', vol: 0.12,
          pattern: ['D5', null, 'F5', 'E5', 'D5', null, 'A4', null, 'As4', null, 'A4', 'G4', 'A4', null, 'Cs5', null]
        },
        perc: true
      },
      // Pelea de gigantes: la mas epica, Do menor heroico (Cm - Ab - Bb - G).
      giants: {
        step: 0.135,
        bass: {
          type: 'sawtooth', vol: 0.14,
          pattern: ['C3', null, 'C3', 'G3', 'Gs2', null, 'Gs2', 'Ds3', 'As2', null, 'As2', 'F3', 'G2', null, 'G2', 'D3',
            'C3', null, 'C3', 'G3', 'Gs2', null, 'Gs2', 'Ds3', 'As2', null, 'As2', 'F3', 'G2', null, 'G2', 'D3']
        },
        pad: {
          type: 'triangle', vol: 0.08,
          pattern: ['G4', null, 'C5', null, 'Gs4', null, 'C5', null, 'As4', null, 'D5', null, 'B4', null, 'D5', null,
            'G4', null, 'C5', null, 'Gs4', null, 'C5', null, 'As4', null, 'D5', null, 'B4', null, 'D5', null]
        },
        lead: {
          type: 'sawtooth', vol: 0.1,
          pattern: ['C5', null, 'G5', null, 'Ds5', 'F5', 'G5', null, 'Gs5', null, 'G5', 'F5', 'D5', null, 'G5', null,
            'C6', null, 'As5', 'Gs5', 'G5', null, 'Ds5', 'F5', 'F5', null, 'D5', 'As4', 'B4', 'D5', 'G5', null]
        },
        perc: true
      },
      // Final: tierna y tranquila, Fa mayor (F - C - Dm - Bb), sin percusion.
      ending: {
        step: 0.2,
        bass: { type: 'sine', vol: 0.15, pattern: ['F3', null, 'C4', null, 'C3', null, 'G3', null, 'D3', null, 'A3', null, 'As3', null, 'F3', null] },
        pad: { type: 'triangle', vol: 0.07, pattern: ['A4', null, 'C5', null, 'G4', null, 'E4', null, 'F4', null, 'A4', null, 'D4', null, 'F4', null] },
        lead: {
          type: 'sine', vol: 0.15,
          pattern: ['C5', null, 'A4', 'C5', 'E5', null, 'D5', null, 'F5', 'E5', 'D5', null, 'D5', 'C5', 'As4', 'C5']
        },
        perc: false
      },

      // ---- Parte 3 "We Are a Team": musicas nuevas (aditivas; contrato §17) ----
      // Igual que en la Parte 2: bajo, pad y melodia de cada tema miden lo mismo.

      // Entrenamiento en la base del cielo: alegre y saltarina, Re mayor (D - G - A - D / Bm - G - A - D).
      training: {
        step: 0.13,
        bass: {
          type: 'triangle', vol: 0.15,
          pattern: ['D3', null, 'A3', 'D3', 'G3', null, 'D3', 'G3', 'A3', null, 'E3', 'A3', 'D3', 'A3', 'Fs3', 'A3',
            'B2', null, 'Fs3', 'B2', 'G3', null, 'D3', 'G3', 'A3', null, 'E3', 'A3', 'D3', null, 'A2', null]
        },
        pad: {
          type: 'sine', vol: 0.065,
          pattern: ['Fs4', null, null, null, 'G4', null, null, null, 'E4', null, null, null, 'Fs4', null, null, null,
            'D4', null, null, null, 'G4', null, null, null, 'Cs4', null, null, null, 'D4', null, null, null]
        },
        lead: {
          type: 'square', vol: 0.1,
          pattern: ['D5', 'Fs5', 'A5', null, 'B5', 'A5', 'G5', null, 'E5', 'Fs5', 'G5', 'A5', 'Fs5', null, 'D5', null,
            'B4', 'D5', 'Fs5', null, 'G5', 'Fs5', 'E5', null, 'Cs5', 'E5', 'A5', 'G5', 'Fs5', 'E5', 'D5', null]
        },
        perc: true
      },
      // Tuneles: persecucion rapida y grave, Mi menor con bajo al galope.
      tunnels: {
        step: 0.1,
        bass: {
          type: 'sawtooth', vol: 0.13,
          pattern: ['E2', 'E2', 'B2', 'E2', 'E2', 'E2', 'D3', 'E2', 'C3', 'C3', 'G2', 'C3', 'D3', 'D3', 'A2', 'D3',
            'E2', 'E2', 'B2', 'E2', 'E2', 'E2', 'G3', 'E2', 'C3', 'C3', 'G2', 'C3', 'B2', 'B2', 'Ds3', 'Fs3']
        },
        pad: {
          type: 'square', vol: 0.04,
          pattern: ['G3', null, null, null, 'B3', null, null, null, 'G3', null, null, null, 'A3', null, null, null,
            'G3', null, null, null, 'B3', null, null, null, 'E4', null, null, null, 'Ds4', null, null, null]
        },
        lead: {
          type: 'sawtooth', vol: 0.08,
          pattern: ['E5', null, 'E5', 'G5', 'Fs5', null, 'E5', 'D5', 'E5', null, 'B4', null, 'C5', 'D5', 'E5', null,
            'E5', null, 'E5', 'G5', 'A5', null, 'G5', 'Fs5', 'G5', null, 'E5', null, 'Fs5', 'Ds5', 'B4', null]
        },
        perc: true
      },
      // Rio subterraneo: agua y aventura que crece hacia el vuelo, Fa mayor (la segunda mitad sube).
      river: {
        step: 0.17,
        bass: {
          type: 'triangle', vol: 0.14,
          pattern: ['F3', null, 'C4', null, 'D3', null, 'A3', null, 'As2', null, 'F3', null, 'C3', null, 'G3', null,
            'F3', null, 'C4', null, 'D3', null, 'A3', null, 'As2', null, 'F3', null, 'C3', 'E3', 'G3', 'C4']
        },
        pad: {
          type: 'sine', vol: 0.075,
          pattern: ['A4', null, 'C5', null, 'F4', null, 'A4', null, 'D4', null, 'F4', null, 'E4', null, 'G4', null,
            'A4', null, 'C5', null, 'F4', null, 'A4', null, 'D5', null, 'F5', null, 'E5', null, 'G5', null]
        },
        lead: {
          type: 'triangle', vol: 0.13,
          pattern: ['C5', null, 'F5', null, 'E5', 'D5', 'C5', null, 'A4', null, 'D5', null, 'C5', null, 'G4', null,
            'C5', 'D5', 'F5', null, 'G5', 'A5', 'G5', null, 'F5', 'G5', 'As5', null, 'A5', null, 'C6', null]
        },
        perc: true
      },
      // Fabrica oscura: misteriosa y metalica, La menor con cromatismos y golpes de chapa.
      darkFactory: {
        step: 0.14,
        bass: {
          type: 'square', vol: 0.11,
          pattern: ['A2', null, null, 'A2', 'As2', null, 'A2', null, 'A2', null, null, 'A2', 'G2', null, 'Gs2', null,
            'F2', null, null, 'F2', 'E2', null, 'F2', null, 'D2', null, 'E2', null, 'Gs2', null, 'B2', null]
        },
        pad: {
          type: 'square', vol: 0.04,
          pattern: ['E4', null, null, null, 'F4', null, null, null, 'E4', null, null, null, 'Ds4', null, null, null,
            'C4', null, null, null, 'B3', null, null, null, 'A3', null, null, null, 'Gs3', null, null, null]
        },
        lead: {
          type: 'triangle', vol: 0.11,
          pattern: ['A4', null, null, 'C5', null, 'B4', null, null, 'E5', null, 'Ds5', null, null, null, null, null,
            'F5', null, null, 'E5', null, 'C5', null, 'B4', 'Gs4', null, null, null, 'E4', null, null, null]
        },
        perc: true
      },
      // Jefes a pie de la Parte 3: tension heroica, Sol menor con bajo insistente.
      boss3: {
        step: 0.122,
        bass: {
          type: 'sawtooth', vol: 0.15,
          pattern: ['G2', 'G2', 'D3', 'G2', 'G2', 'G2', 'F3', 'G2', 'Ds3', 'Ds3', 'As2', 'Ds3', 'F3', 'F3', 'C3', 'D3',
            'G2', 'G2', 'D3', 'G2', 'G2', 'G2', 'As2', 'C3', 'Ds3', 'Ds3', 'F3', 'Ds3', 'D3', 'D3', 'Fs3', 'D3']
        },
        pad: {
          type: 'square', vol: 0.06,
          pattern: ['As4', null, null, null, 'A4', null, null, null, 'G4', null, null, null, 'A4', null, null, null,
            'As4', null, null, null, 'D5', null, null, null, 'C5', null, null, null, 'A4', null, null, null]
        },
        lead: {
          type: 'square', vol: 0.12,
          pattern: ['G5', null, 'D5', 'G5', 'As5', null, 'A5', 'G5', 'F5', null, 'Ds5', 'F5', 'G5', null, 'D5', null,
            'G5', null, 'As5', 'C6', 'D6', null, 'C6', 'As5', 'A5', null, 'G5', 'A5', 'Fs5', null, 'D5', null]
        },
        perc: true
      },
      // Peleas de las fusiones de pareja: heroica, Re menor (Dm - Bb - C - A).
      giants3: {
        step: 0.13,
        bass: {
          type: 'sawtooth', vol: 0.14,
          pattern: ['D3', null, 'D3', 'A3', 'As2', null, 'As2', 'F3', 'C3', null, 'C3', 'G3', 'A2', null, 'A2', 'E3',
            'D3', null, 'D3', 'A3', 'As2', null, 'As2', 'F3', 'C3', null, 'C3', 'G3', 'A2', 'Cs3', 'E3', 'A3']
        },
        pad: {
          type: 'triangle', vol: 0.08,
          pattern: ['A4', null, 'D5', null, 'As4', null, 'D5', null, 'C5', null, 'E5', null, 'Cs5', null, 'E5', null,
            'A4', null, 'F5', null, 'As4', null, 'F5', null, 'C5', null, 'G5', null, 'Cs5', null, 'E5', null]
        },
        lead: {
          type: 'sawtooth', vol: 0.1,
          pattern: ['D5', null, 'A5', null, 'F5', 'G5', 'A5', null, 'As5', null, 'A5', 'G5', 'E5', null, 'A5', null,
            'D6', null, 'C6', 'As5', 'A5', null, 'F5', 'G5', 'G5', null, 'E5', 'C5', 'Cs5', 'E5', 'A5', null]
        },
        perc: true
      },
      // Fusion final "WE ARE A TEAM": la MAS epica del juego. Himno en Do mayor
      // (C - G - Am - F | C - G - F - G), bajo que empuja, arpegios y una melodia que vuela hasta el Fa agudo.
      teamFinal: {
        step: 0.128,
        bass: {
          type: 'sawtooth', vol: 0.15,
          pattern: ['C3', null, 'C3', 'G3', 'C3', null, 'C3', 'G3', 'G2', null, 'G2', 'D3', 'G2', null, 'G2', 'D3',
            'A2', null, 'A2', 'E3', 'A2', null, 'A2', 'E3', 'F2', null, 'F2', 'C3', 'F2', null, 'F2', 'C3',
            'C3', null, 'C3', 'G3', 'C3', null, 'C3', 'G3', 'G2', null, 'G2', 'D3', 'G2', null, 'G2', 'D3',
            'F2', null, 'F2', 'C3', 'F2', null, 'F2', 'C3', 'G2', null, 'G2', 'D3', 'G2', 'B2', 'D3', 'G3']
        },
        pad: {
          type: 'triangle', vol: 0.09,
          pattern: ['E4', null, 'G4', null, 'C5', null, 'G4', null, 'D4', null, 'G4', null, 'B4', null, 'G4', null,
            'E4', null, 'A4', null, 'C5', null, 'A4', null, 'F4', null, 'A4', null, 'C5', null, 'A4', null,
            'G4', null, 'C5', null, 'E5', null, 'C5', null, 'G4', null, 'B4', null, 'D5', null, 'B4', null,
            'A4', null, 'C5', null, 'F5', null, 'C5', null, 'B4', null, 'D5', null, 'G5', null, 'D5', null]
        },
        lead: {
          type: 'sawtooth', vol: 0.11,
          pattern: ['G4', null, 'C5', null, 'E5', null, 'G5', null, 'G5', null, 'F5', 'E5', 'D5', null, 'B4', null,
            'C5', null, 'E5', null, 'A5', null, 'G5', 'E5', 'F5', null, 'A5', null, 'C6', null, 'A5', null,
            'G5', null, 'C6', null, 'E6', null, 'D6', 'C6', 'B5', null, 'D6', null, 'G5', null, 'B5', null,
            'A5', 'C6', 'F6', null, 'E6', null, 'D6', null, 'D6', null, 'B5', null, 'G5', 'A5', 'B5', 'D6']
        },
        perc: true
      },
      // Final de la Parte 3: tierno (Fa mayor) con un toque de misterio al final (¿volvera Robovill?).
      ending3: {
        step: 0.21,
        bass: {
          type: 'sine', vol: 0.14,
          pattern: ['F3', null, 'C4', null, 'C3', null, 'G3', null, 'D3', null, 'A3', null, 'As2', null, 'F3', null,
            'F3', null, 'C4', null, 'A2', null, 'E3', null, 'D3', null, 'F3', null, 'E3', null, 'Gs2', null]
        },
        pad: {
          type: 'triangle', vol: 0.07,
          pattern: ['A4', null, 'C5', null, 'G4', null, 'E4', null, 'F4', null, 'A4', null, 'D4', null, 'F4', null,
            'A4', null, 'C5', null, 'Cs5', null, 'E4', null, 'D4', null, 'F4', null, 'E4', null, 'Gs4', null]
        },
        lead: {
          type: 'sine', vol: 0.14,
          pattern: ['A4', null, 'C5', 'F5', 'E5', null, 'D5', 'C5', 'D5', null, 'F5', 'A5', 'G5', null, 'F5', null,
            'F5', 'E5', 'C5', null, 'E5', 'D5', 'Cs5', null, 'D5', null, 'A4', null, 'B4', null, 'Gs4', null]
        },
        perc: false
      }
    };
  }

  var THEMES = null;

  // Programa un patron completo (loop de "cycles" repeticiones) a partir de
  // startTime, para una voz concreta. Devuelve el tiempo final programado.
  function scheduleVoice(voice, startTime, cycles, dest) {
    if (!voice || !voice.pattern) return startTime;
    var stepDur = musicStepDur;
    var t = startTime;
    for (var c = 0; c < cycles; c++) {
      for (var i = 0; i < voice.pattern.length; i++) {
        var note = voice.pattern[i];
        if (note) {
          var freq = n(note);
          if (freq) {
            tone({
              type: voice.type || 'sine',
              freq: freq,
              dur: stepDur * 0.92,
              vol: voice.vol !== undefined ? voice.vol : 0.12,
              attack: 0.01,
              release: stepDur * 0.5,
              start: t,
              dest: dest
            });
          }
        }
        t += stepDur;
      }
    }
    return t;
  }

  // Percusion simple: golpe grave en tiempos pares, "hi-hat" de ruido en impares.
  function schedulePerc(startTime, cycles, patternLen, dest) {
    var stepDur = musicStepDur;
    var t = startTime;
    for (var c = 0; c < cycles; c++) {
      for (var i = 0; i < patternLen; i++) {
        if (i % 4 === 0) {
          tone({ type: 'sine', freq: 90, dur: stepDur * 0.6, vol: 0.1, attack: 0.002, release: stepDur * 0.4, start: t, dest: dest });
        } else if (i % 2 === 0) {
          noiseBurst({ dur: stepDur * 0.35, vol: 0.045, filterFreq: 6000, filterType: 'highpass', start: t, dest: dest });
        }
        t += stepDur;
      }
    }
    return t;
  }

  var musicStepDur = STEP;
  var MUSIC_LOOKAHEAD_CYCLES = 2; // cuantos ciclos completos se programan de una vez
  var musicNextRefillTime = 0;    // AudioContext time en que hay que reprogramar mas
  var musicPatternLen = 8;
  var musicDest = null;
  var musicThemeKey = null;
  var musicRefillGuard = null; // nodo silencioso encadenado para autoprogramar el refill

  function stopMusicInternal() {
    // No hay nodos persistentes que detener explicitamente: los osciladores
    // se autodetienen solos. Simplemente invalidamos el estado para que el
    // mecanismo de refill dejе de programar mas ciclos.
    musicThemeKey = null;
    musicNextRefillTime = 0;
    currentMusicName = null;
    if (musicRefillGuard) {
      safeCall(function () { musicRefillGuard.disconnect(); });
      musicRefillGuard = null;
    }
  }

  // Arma un "guardian" silencioso: un oscilador de ganancia 0 cuyo evento
  // onended, al terminar justo cuando toca reprogramar, dispara el siguiente
  // lote de compases. Esto sustituye a setTimeout/setInterval sin usar rAF ni
  // temporizadores JS: se apoya por completo en el propio reloj de WebAudio.
  function armRefillGuard(theme, atTime) {
    if (!ready || !ctxA) return;
    var guard = ctxA.createOscillator();
    var g = ctxA.createGain();
    g.gain.value = 0.0001; // inaudible
    guard.frequency.value = 1;
    guard.connect(g);
    g.connect(sfxGain);
    var fireAt = Math.max(atTime - musicStepDur * musicPatternLen * 0.5, now() + 0.05);
    guard.start(now());
    guard.stop(fireAt);
    guard.onended = function () {
      safeCall(function () {
        guard.disconnect();
        g.disconnect();
      });
      // Solo continua si seguimos en el mismo tema (no se ha llamado a otro
      // music(...) ni a music(null) mientras tanto).
      if (musicThemeKey === theme.key && currentMusicName === theme.key) {
        refillMusic(theme);
      }
    };
    musicRefillGuard = guard;
  }

  function refillMusic(theme) {
    if (!ready || !ctxA) return;
    var startAt = Math.max(musicNextRefillTime, now() + 0.02);
    musicStepDur = theme.step || STEP;
    musicPatternLen = (theme.lead && theme.lead.pattern && theme.lead.pattern.length) ||
      (theme.bass && theme.bass.pattern && theme.bass.pattern.length) || 8;

    var endBass = scheduleVoice(theme.bass, startAt, MUSIC_LOOKAHEAD_CYCLES, musicGain);
    var endPad = scheduleVoice(theme.pad, startAt, MUSIC_LOOKAHEAD_CYCLES, musicGain);
    var endLead = scheduleVoice(theme.lead, startAt, MUSIC_LOOKAHEAD_CYCLES, musicGain);
    var endPerc = theme.perc ? schedulePerc(startAt, MUSIC_LOOKAHEAD_CYCLES, musicPatternLen, musicGain) : startAt;

    var end = Math.max(endBass, endPad, endLead, endPerc, startAt + musicStepDur * musicPatternLen);
    musicNextRefillTime = end;
    armRefillGuard(theme, end);
  }

  function startMusic(name) {
    if (!ready || !ctxA) return;
    if (!THEMES) THEMES = buildThemes();
    var theme = THEMES[name];
    if (!theme) return;
    theme.key = name;
    stopMusicInternal();
    currentMusicName = name;
    musicThemeKey = name;
    musicNextRefillTime = now() + 0.02;
    refillMusic(theme);
  }

  // ---- API publica ------------------------------------------------------

  var audioApi = {
    muted: false,

    init: function () {
      if (ready) return;
      safeCall(function () {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctxA = new AC();
        masterGain = ctxA.createGain();
        masterGain.gain.value = MASTER_LEVEL;
        masterGain.connect(ctxA.destination);

        musicGain = ctxA.createGain();
        musicGain.gain.value = 1.0;
        musicGain.connect(masterGain);

        sfxGain = ctxA.createGain();
        sfxGain.gain.value = 1.0;
        sfxGain.connect(masterGain);

        if (ctxA.state === 'suspended') {
          ctxA.resume();
        }

        ready = true;

        // Aplica estado de mute si ya se conocia (p.ej. cargado de localStorage
        // antes de que init() se haya podido ejecutar).
        applyMuteState();
      });
    },

    // Reanuda el AudioContext si esta suspendido. iOS suspende WebAudio hasta
    // que hay un gesto del usuario; llamar a esto en cada toque/tecla garantiza
    // que el contexto quede 'running' tras el primer gesto. No-op seguro si no
    // hay WebAudio o init() aun no ha corrido.
    resume: function () {
      if (!ctxA) return;
      safeCall(function () {
        if (ctxA.state === 'suspended') ctxA.resume();
      });
    },

    sfx: function (name) {
      if (!ready || !ctxA || audioApi.muted) return;
      safeCall(function () {
        if (ctxA.state === 'suspended') ctxA.resume();
        var fn = SFX[name];
        if (fn) fn();
      });
    },

    music: function (nameOrNull) {
      if (!ready || !ctxA) return;
      safeCall(function () {
        if (ctxA.state === 'suspended') ctxA.resume();
        if (nameOrNull === null || nameOrNull === undefined) {
          stopMusicInternal();
          return;
        }
        if (currentMusicName === nameOrNull) return; // no reiniciar el mismo tema
        startMusic(nameOrNull);
      });
    },

    toggleMute: function () {
      audioApi.muted = !audioApi.muted;
      if (window.G && window.G.state) {
        window.G.state.muted = audioApi.muted;
      }
      applyMuteState();
      return audioApi.muted;
    }
  };

  function applyMuteState() {
    if (!ready || !masterGain || !ctxA) return;
    safeCall(function () {
      var target = audioApi.muted ? 0.0001 : MASTER_LEVEL;
      masterGain.gain.setTargetAtTime(target, now(), 0.02);
    });
  }

  // Sincroniza estado inicial de mute si G.state ya existe (core puede haberlo
  // cargado desde localStorage antes de que audio.js corra su init()).
  if (window.G.state && typeof window.G.state.muted === 'boolean') {
    audioApi.muted = window.G.state.muted;
  }

  window.G.audio = audioApi;
})();
