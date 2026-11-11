const C = 'estudos-v2';
const A = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(C).then((c) => c.addAll(A)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((x) => x !== C).map((x) => caches.delete(x)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/__/') || u.pathname.startsWith('/@')) return;
  if (u.origin !== location.origin && !u.hostname.includes('gstatic.com') && !u.hostname.includes('firebase')) return;

  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.status === 200) {
          const cp = r.clone();
          caches.open(C).then((c) => c.put(e.request, cp));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('/index.html')))
  );
});
