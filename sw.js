/* Service worker network-first: la app siempre intenta la red y solo cae al
   caché cuando no hay conexión. Así un despliegue nuevo se ve de inmediato. */
/* El nombre de la caché lleva el prefijo de campaña: lo define marca.js
   y lo aplica storage-ns.js. Si no cargan, cae al prefijo 'jp' original. */
try { importScripts('./marca.js'); } catch (e) {}
try { importScripts('./storage-ns.js'); } catch (e) {}
const NS_SW = (self.STORAGE_NS || 'jp');
const CACHE_PREFIJO = NS_SW + '-comercios-';
const CACHE = CACHE_PREFIJO + 'v1';

const BASICOS = ['./', './index.html', './style.css', './marca.js', './storage-ns.js', './app.js', './version.js', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf(CACHE_PREFIJO) === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // el backend y los CDN van directo
  e.respondWith(
    fetch(req).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
      return res;
    }).catch(() => caches.open(CACHE).then(c => c.match(req).then(r => r || c.match('./index.html'))))
  );
});
