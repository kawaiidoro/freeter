/* Generated as sw.js by scripts/build-site.mjs. */
const RELEASE = 'a35a2483095e';
const CACHE = `dangi-alba-shell-${RELEASE}`;
const ASSETS = ["./","./index.html","./applications.html","./schedule.html","./calculator.html","./records.html","./stats.html","./guide.html","./privacy.html","./settings.html","./notes.html","./style.css?v=a35a2483095e","./brand.css?v=a35a2483095e","./vendor/quill.core.css?v=a35a2483095e","./site.js?v=a35a2483095e","./icon.svg?v=a35a2483095e","./manifest.webmanifest?v=a35a2483095e","./assets/freeter-192.png?v=a35a2483095e","./assets/freeter-512.png?v=a35a2483095e","./assets/freeter-wordmark.png?v=a35a2483095e","./assets/applications-icon.png?v=a35a2483095e","./assets/notes-icon.png?v=a35a2483095e","./assets/schedule-icon.png?v=a35a2483095e","./assets/calculator-icon.png?v=a35a2483095e","./assets/records-icon.png?v=a35a2483095e","./assets/stats-icon.png?v=a35a2483095e","./assets/settings-icon.png?v=a35a2483095e","./assets/guide-icon.png?v=a35a2483095e","./assets/gomssi-coffee-please.png?v=a35a2483095e","./assets/gomssi-coffee-drive.png?v=a35a2483095e","./assets/freeter-homescreen-180.png?v=a35a2483095e","./assets/freeter-homescreen-192.png?v=a35a2483095e","./assets/freeter-homescreen-512.png?v=a35a2483095e","./assets/freeter-homescreen-maskable.png?v=a35a2483095e","./icon.svg","./manifest.webmanifest","./assets/freeter-display.woff2","./assets/freeter-192.png","./assets/freeter-512.png","./assets/gomssi.png","./assets/applications-icon.png","./assets/notes-icon.png","./assets/schedule-icon.png","./assets/calculator-icon.png","./assets/records-icon.png","./assets/stats-icon.png","./assets/settings-icon.png","./assets/guide-icon.png","./assets/freeter-wordmark.png","./assets/weather-flat-icons.png","./assets/freeter-homescreen-192.png?v=0d25784aebca","./assets/freeter-homescreen-512.png?v=f4518a721c44","./assets/freeter-homescreen-maskable.png?v=f4518a721c44"];
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
