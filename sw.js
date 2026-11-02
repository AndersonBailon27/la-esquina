// Service worker: guarda los archivos de la app para que abra rápido.
// Los datos (carta y pedidos) siempre vienen en vivo de Firebase.
const VERSION = "la-esquina-v3";
const ARCHIVOS = ["./", "./index.html", "./css/estilos.css", "./js/cliente.js", "./js/firebase.js", "./js/firebase-config.js", "./img/logo.svg", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero (para ver siempre la última versión); si no hay señal, usa lo guardado
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request))
  );
});
