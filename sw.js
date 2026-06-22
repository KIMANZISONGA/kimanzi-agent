const CACHE = 'kimanzi-v15';
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

  const isHTML = e.request.mode === 'navigate' ||
                 e.request.destination === 'document' ||
                 e.request.url.endsWith('.html');

  if (isHTML) {
    // Network-first: altijd de nieuwste pagina-content; cache is alleen offline-fallback
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first voor statische assets: CSS, afbeeldingen, iconen, manifest
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
