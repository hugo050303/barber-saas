// Avisos al celular (se carga dentro del service worker de la app).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Filo', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Filo', {
    body: d.body || '', icon: '/icono-192.png', badge: '/icono-192.png', tag: d.tag, renotify: !!d.tag,
    vibrate: [80, 40, 80], data: { url: d.url || '/app' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/app', self.location.origin).href;
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const abierta = ventanas.find((w) => w.url.startsWith(self.location.origin));
    if (abierta) {
      try { await abierta.navigate(url); } catch { /* no controlada: solo se enfoca */ }
      return abierta.focus();
    }
    return self.clients.openWindow(url);
  })());
});
