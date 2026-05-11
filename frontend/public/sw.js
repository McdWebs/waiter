// Service Worker for push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'ההזמנה שלך מוכנה!'
  const options = {
    body: data.body || 'בוא לאסוף את ההזמנה שלך',
    icon: '/ai_waiter_app_icon.png',
    badge: '/ai_waiter_app_icon.png',
    vibrate: [200, 100, 200],
    data: data.url ? { url: data.url } : undefined,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  }
})
