const CACHE = 'kimanzi-v19';
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
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // NOOIT API-calls of externe live-data cachen.
  // Belangrijk: de API draait op api.urbanchill.org, dus we sluiten uit op
  // '/api/' én 'api.urbanchill.org' (de oude check 'urbanchill-api' matchte
  // het domein niet, waardoor host-berichten uit een oude cache kwamen).
  if (url.includes('/api/')) return;
  if (url.includes('api.urbanchill.org')) return;
  if (url.includes('urbanchill-api')) return;
  if (url.includes('fonts.')) return;
  if (url.includes('open-meteo') || url.includes('open.er-api') || url.includes('frankfurter')) return;

  const isHTML = e.request.mode === 'navigate' ||
                 e.request.destination === 'document' ||
                 url.endsWith('.html');
  const isPortalJS = url.includes('portal.js');

  // HTML en portal.js: network-first zodat updates direct live zijn;
  // cache dient alleen als offline-fallback.
  if (isHTML || isPortalJS) {
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

  // Statische assets (CSS, afbeeldingen, iconen, manifest): cache-first.
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
