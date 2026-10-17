/* Generated as sw.js by scripts/build-site.mjs. */
const RELEASE = '054cebf97fb4';
const CACHE = `dangi-alba-shell-${RELEASE}`;
const ASSETS = ["./","./index.html","./applications.html","./schedule.html","./calculator.html","./records.html","./stats.html","./guide.html","./privacy.html","./settings.html","./notes.html","./style.css?v=054cebf97fb4","./brand.css?v=054cebf97fb4","./vendor/quill.core.css?v=054cebf97fb4","./site.js?v=054cebf97fb4","./icon.svg?v=054cebf97fb4","./manifest.webmanifest?v=054cebf97fb4","./assets/freeter-192.png?v=054cebf97fb4","./assets/freeter-512.png?v=054cebf97fb4","./assets/freeter-wordmark.png?v=054cebf97fb4","./assets/applications-icon.png?v=054cebf97fb4","./assets/notes-icon.png?v=054cebf97fb4","./assets/schedule-icon.png?v=054cebf97fb4","./assets/calculator-icon.png?v=054cebf97fb4","./assets/records-icon.png?v=054cebf97fb4","./assets/stats-icon.png?v=054cebf97fb4","./assets/settings-icon.png?v=054cebf97fb4","./assets/guide-icon.png?v=054cebf97fb4","./icon.svg","./manifest.webmanifest","./assets/freeter-display.woff2","./assets/freeter-192.png","./assets/freeter-512.png","./assets/gomssi.png","./assets/applications-icon.png","./assets/notes-icon.png","./assets/schedule-icon.png","./assets/calculator-icon.png","./assets/records-icon.png","./assets/stats-icon.png","./assets/settings-icon.png","./assets/guide-icon.png","./assets/freeter-wordmark.png","./assets/weather-flat-icons.png","./icon.svg?v=spotify-20261017","./assets/freeter-192.png?v=spotify-20261017","./assets/freeter-512.png?v=spotify-20261017"];
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
