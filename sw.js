const CACHE = 'kimanzi-v5';
const PRECACHE = [
  '/portal.html',
  '/kimanzi.css',
  '/manifest.json',
  '/urbanchill-background-v10-6-6.webp',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Alleen GET, geen API-calls cachen
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('urbanchill-api')) return;
  if (e.request.url.includes('fonts.')) return;
  if (e.request.url.includes('open-meteo') || e.request.url.includes('open.er-api') || e.request.url.includes('frankfurter')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
