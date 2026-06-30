self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Pass-through fetch (network-first/only for active database app)
});

// Listener per eventuali push notification server-side
self.addEventListener('push', (e) => {
  let data = { title: 'GM Turni', body: 'Nuovo promemoria' };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (_) {
      data = { title: 'GM Turni', body: e.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'active-session-reminder',
    requireInteraction: true
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
