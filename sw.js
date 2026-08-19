/* DEADZONE service worker — offline-first.
   The game is a single self-contained HTML file with no external requests, so a plain
   precache of the shell is enough to make it fully playable with no signal at all.

   Bump CACHE when you change any precached file, or clients keep the old copy. */
const CACHE = 'deadzone-v10';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Individual adds rather than addAll: one 404 would otherwise abort the whole
    // install and leave the app with no offline copy at all.
    await Promise.all(ASSETS.map(async url => {
      try { await c.add(new Request(url, { cache: 'reload' })); }
      catch (err) { console.warn('[sw] precache miss', url, err); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // never touch cross-origin

  // Navigations: serve the cached shell first so launching offline is instant and
  // never shows the browser's dino page.
  if (req.mode === 'navigate'){
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      if (cached) {
        refresh(req);          // update in the background for next launch
        return cached;
      }
      try { return await fetch(req); }
      catch (err) { return new Response('Offline and no cached copy yet.', {
        status: 503, headers: { 'Content-Type': 'text/plain' } }); }
    })());
    return;
  }

  // Everything else: cache-first, falling back to network, then caching the result.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic'){
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return new Response('', { status: 504 });
    }
  })());
});

// Silent background refresh so an online launch picks up new builds.
async function refresh(req){
  try {
    const res = await fetch(req, { cache: 'reload' });
    if (res && res.ok){
      const c = await caches.open(CACHE);
      await c.put('./index.html', res.clone());
    }
  } catch (err) { /* offline — the cached copy stays authoritative */ }
}

// Lets the page trigger an immediate update.
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
