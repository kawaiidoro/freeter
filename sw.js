/* Generated as sw.js by scripts/build-site.mjs. */
const RELEASE = 'd81573c1ed0b';
const CACHE = `dangi-alba-shell-${RELEASE}`;
const ASSETS = ["./","./index.html","./schedule.html","./calculator.html","./records.html","./stats.html","./guide.html","./privacy.html","./settings.html","./notes.html","./style.css?v=d81573c1ed0b","./brand.css?v=d81573c1ed0b","./vendor/quill.core.css?v=d81573c1ed0b","./site.js?v=d81573c1ed0b","./icon.svg?v=d81573c1ed0b","./manifest.webmanifest?v=d81573c1ed0b","./assets/freeter-192.png?v=d81573c1ed0b","./assets/freeter-512.png?v=d81573c1ed0b","./assets/freeter-wordmark.png?v=d81573c1ed0b","./icon.svg","./manifest.webmanifest","./assets/freeter-display.woff2","./assets/freeter-192.png","./assets/freeter-512.png","./assets/gomssi.png","./assets/freeter-wordmark.png","./assets/weather-illustrations.png","./icon.svg?v=emerald-20261017","./assets/freeter-192.png?v=emerald-20261017","./assets/freeter-512.png?v=emerald-20261017"];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new Request(path, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('dangi-alba-shell-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then(clients => clients.forEach(client => client.postMessage({ type: 'FREETER_UPDATE_READY', version: RELEASE }))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Auth responses and private API requests must never enter the public shell cache.
  if (event.request.headers.has('authorization') || ['code','error','error_description','access_token','refresh_token'].some(key => url.searchParams.has(key))) return;
  const navigation = event.request.mode === 'navigate';
  const asset = ASSETS.map(path => new URL(path, self.registration.scope)).find(path => navigation ? path.pathname === url.pathname : path.href === url.href);
  if (!asset) return;
  event.respondWith(fetch(event.request, navigation ? { cache: 'no-cache' } : {}).then(response => {
    if (response.ok) { const saved = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(asset.href, saved))); }
    return response;
  }).catch(() => caches.match(asset.href)));
});
