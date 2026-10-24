// sw.js — modo SIN CONEXIÓN de la versión web (solo funciona en una web https;
// js/movil.js no lo registra con doble clic ni en el servidor de desarrollo).
// La primera vez guarda el juego entero; después arranca aunque no haya internet.
// Estrategia: responde con lo guardado y, a la vez, lo actualiza desde la red,
// así una versión nueva llega en la siguiente visita.
// Al publicar una versión nueva, cambia CACHE (tests/empaquetar.js lo hace solo).
'use strict';
var CACHE = 'lord-falcon-v3.1';
var BASE = ['./', 'index.html', 'historias.html', 'js/sala-cine.js', 'manifest.webmanifest',
  'iconos/icono-192.png', 'iconos/icono-512.png', 'iconos/apple-touch-icon.png', 'iconos/favicon-32.png'];

// Lee los <script src="..."> de una página para guardarlos todos.
function scriptsDe(html) {
  var out = [], re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return fetch('index.html', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (html) {
        var lista = BASE.concat(scriptsDe(html));
        // Uno a uno: si falta alguno (por ejemplo historias.html), el resto se guarda igual.
        return Promise.all(lista.map(function (u) {
          return fetch(u, { cache: 'no-store' }).then(function (resp) { if (resp.ok) return cache.put(u, resp); }).catch(function () {});
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('lord-falcon-') === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (guardado) {
        var red = fetch(req).then(function (resp) {
          if (resp && resp.ok) cache.put(req, resp.clone());
          return resp;
        }).catch(function () { return guardado; });
        return guardado || red;
      });
    })
  );
});
