const CACHE = 'tiles-v1';
const tilePattern = /arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  if (!tilePattern.test(e.request.url)) return;
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        });
      })
    )
  );
});
