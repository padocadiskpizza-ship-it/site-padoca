// Service Worker - Padoca Disk Pizzas
const CACHE_NAME = 'padoca-v1';
const OFFLINE_URLS = ['/', '/index.html', '/painel', '/clientes', '/config.js', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Network-first for API
  if (req.url.includes('/api/')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('/index.html')))
  );
});

self.addEventListener('push', (event) => {
  let data = { titulo: 'Padoca Disk Pizzas', corpo: 'Novo pedido recebido!' };
  try { if (event.data) data = event.data.json(); } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.titulo || 'Padoca', {
      body: data.corpo || '',
      icon: '/img/img1.jpg',
      badge: '/img/img1.jpg',
      tag: 'padoca-pedido',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: '/painel' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/painel') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('/painel');
    })
  );
});