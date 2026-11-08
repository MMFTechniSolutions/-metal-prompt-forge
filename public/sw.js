// Service worker MetalPrompt (PWA) — volontairement minimal :
// - jamais de cache pour /api, la radio (MP3), Supabase ou tout autre domaine;
// - fichiers /assets/* (noms hachés par Vite) et /pwa/* : cache d'abord;
// - pages : réseau d'abord, dernière version en cache si hors ligne.
const V = 'mp-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(['/', '/pwa/icon-192.png']))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.startsWith('/api') || u.pathname.startsWith('/radio/') || u.pathname.startsWith('/oauth') || u.pathname.startsWith('/discord') || u.pathname.startsWith('/mcp')) return;
  if (u.pathname.startsWith('/assets/') || u.pathname.startsWith('/pwa/')) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
    return;
  }
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok && u.pathname === '/') { const cp = res.clone(); caches.open(V).then(c => c.put('/', cp)); } return res; }).catch(() => caches.match('/')));
  }
});
