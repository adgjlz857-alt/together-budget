// Together Budget — Service Worker
const CACHE_NAME = 'together-budget-v1';
const OFFLINE_URLS = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
  }
});

// Push notification handler
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'Together Budget', {
      body: data.body || '',
      icon: data.icon || '/icon.png',
      badge: '/icon.png',
      tag: data.tag || 'together-budget',
      data: data.url ? { url: data.url } : {},
      actions: data.actions || []
    })
  );
});

// Notification click — open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Background sync for offline expenses
self.addEventListener('sync', e => {
  if (e.tag === 'sync-expenses') {
    e.waitUntil(syncOfflineExpenses());
  }
});

async function syncOfflineExpenses() {
  // Signal to the app that sync should happen
  const clientList = await clients.matchAll({ type: 'window' });
  for (const client of clientList) {
    client.postMessage({ type: 'SYNC_EXPENSES' });
  }
}
