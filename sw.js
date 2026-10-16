const CACHE = 'dangi-alba-shell-v4';
const ASSETS = ['./', './index.html', './schedule.html', './calculator.html', './records.html', './stats.html', './guide.html', './privacy.html', './settings.html', './notes.html', './style.css', './brand.css', './site.js', './icon.svg', './manifest.webmanifest', './assets/freeter-display.woff2', './assets/freeter-192.png', './assets/freeter-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('dangi-alba-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const allowed = ASSETS.map(asset => new URL(asset, self.registration.scope).href);
  if (!allowed.includes(url.href)) return;
  // Network first keeps updates fresh; fallback stores only static app files.
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); }
    return response;
  }).catch(() => caches.match(event.request)));
});
