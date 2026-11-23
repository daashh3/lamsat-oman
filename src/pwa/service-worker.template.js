// Replaced by the build plugin. Every cache represents one complete app version.
const VERSION = __CACHE_VERSION__;
const FILES = __PRECACHE_FILES__;
const SCOPE = new URL(self.registration.scope);
const PREFIX = `lamsat-oman:${SCOPE.pathname}:`;
const CACHE = PREFIX + VERSION;
const URLS = FILES.map((file) => new URL(file, SCOPE).href);
const ALLOWED = new Set(URLS);
const INDEX = new URL('index.html', SCOPE).href;

self.addEventListener('install', (event) => {
  // addAll is atomic: an incomplete download never replaces a working version.
  // No skipWaiting: do not replace code or assets during an active VR session.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  url.search = '';
  url.hash = '';
  const navigation = event.request.mode === 'navigate' &&
    (url.pathname === SCOPE.pathname || url.href === INDEX);
  const key = navigation ? INDEX : url.href;
  if (!ALLOWED.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // HTML and hashed modules come from the same completed installation.
    return (await cache.match(key)) || fetch(event.request);
  })());
});
