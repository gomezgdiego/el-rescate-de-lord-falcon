// movil.js — mejoras para jugar en el móvil (versión 3.1). No cambia nada en el ordenador.
//  - En un móvil o tablet Android, el primer toque pone el juego a PANTALLA COMPLETA y en
//    horizontal (en iPhone no se puede: allí se usa "Añadir a pantalla de inicio").
//  - Activa el modo SIN CONEXIÓN (sw.js) solo cuando el juego está en una web https
//    (nunca con doble clic en index.html ni en el servidor de desarrollo, para no
//    quedarse con archivos viejos mientras se programa).
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;

  function debeRegistrarSW(href) {
    // (sin new URL: así también funciona en navegadores viejos y en las pruebas)
    var m = /^([a-z][a-z0-9+.-]*:)\/\/(\[[^\]]*\]|[^\/:?#]*)/i.exec(String(href || ''));
    if (!m || m[1].toLowerCase() !== 'https:') return false;
    var host = m[2].toLowerCase();
    return host !== '' && host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]';
  }

  function esTactil() {
    try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  }

  // Pantalla completa al primer toque (solo una vez por partida, para no molestar).
  var pedida = false;
  function pantallaCompleta() {
    if (pedida || !esTactil()) return;
    pedida = true;
    try {
      var d = document, el = d.documentElement;
      if (!d.fullscreenEnabled || d.fullscreenElement || !el.requestFullscreen) return;
      var p = el.requestFullscreen({ navigationUI: 'hide' });
      if (p && p.then) {
        p.then(function () {
          try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {}
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function iniciar() {
    try {
      var cv = document.getElementById('game');
      if (cv && cv.addEventListener) cv.addEventListener('touchend', pantallaCompleta, { passive: true });
    } catch (e) {}
    try {
      if (typeof navigator !== 'undefined' && navigator.serviceWorker && debeRegistrarSW(location.href)) {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      }
    } catch (e) {}
  }

  G.movil = { debeRegistrarSW: debeRegistrarSW, esTactil: esTactil };

  try {
    if (typeof document !== 'undefined' && document.addEventListener) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
      else iniciar();
    }
  } catch (e) {}
})();
