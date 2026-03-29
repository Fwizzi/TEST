/* ═══ SERVICE WORKER ═══════════════════════════════════════════════════════
   Stratégie :
   - network-first pour index.html, JS et CSS → toujours la dernière version
   - cache-first pour logo et assets statiques lourds
   - cache-first pour CDN (jsPDF)
   Version : incrémenter à chaque déploiement pour forcer le rechargement.
════════════════════════════════════════════════════════════════════════════ */
const V = 'arbitres-hb-v25';

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './theme-init.js',
  './logo.png',
  './manifest.json',
  './js/state.js',
  './js/utils.js',
  './js/timer.js',
  './js/score.js',
  './js/observations.js',
  './js/synthesis.js',
  './js/pdf.js',
  './js/storage.js',
  './js/ui.js',
  './js/match.js',
  './js/main.js',
  './js/logger.js',
  './js/version.js',
  './js/auth.js'
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

/* ── Assets servis en cache-first (logo, CDN) ── */
const CACHE_FIRST_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff2'];
function isCacheFirst(url) {
  return CDN_ASSETS.some(u => url.includes(u)) ||
         CACHE_FIRST_EXTS.some(ext => url.endsWith(ext));
}

/* ── Installation ── */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(V).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
        .then(() => cache.addAll(CDN_ASSETS).catch(() => {}))
    )
  );
});

/* ── Activation : suppression des vieux caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== V).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Cache-first pour images et CDN
  if (isCacheFirst(url)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (!response || !response.ok) return response;
          const clone = response.clone();
          caches.open(V).then(cache => cache.put(e.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first pour HTML, JS, CSS → toujours la version la plus récente
  e.respondWith(
    fetch(e.request).then(response => {
      if (!response || !response.ok) return response;
      const clone = response.clone();
      caches.open(V).then(cache => cache.put(e.request, clone));
      return response;
    }).catch(() => {
      // Hors ligne : fallback sur le cache
      return caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
