/* Service worker: оболочка и каталог — офлайн; обложки кэшируются по мере просмотра. */
const VERSION = 'v2';
const SHELL = `gdz-shell-${VERSION}`;
const COVERS = 'gdz-covers-v1';
const COVERS_MAX = 700;
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './data/catalog.json', './data/catalog.js', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gdz-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Обложки с reshak.ru: сначала кэш, затем сеть.
  if (url.hostname.endsWith('reshak.ru') && url.pathname.startsWith('/pic/')) {
    e.respondWith(
      caches.open(COVERS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') {
          cache.put(req, res.clone());
          trim(COVERS, COVERS_MAX);
        }
        return res;
      }).catch(() => Response.error())
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Свои файлы: сеть с обновлением кэша, при сбое — кэш.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone()));
        return res.clone();
      })
      .catch(async () => (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
