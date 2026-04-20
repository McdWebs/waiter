/**
 * Browser Push Notification utilities.
 * Used to notify the guest when their order status changes to "ready".
 */

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch {
    return null
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showLocalNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return
  // Use service worker notification if available, else fallback
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: '/ai_waiter_app_icon.png',
        // vibrate is a valid Web Notifications API property but missing from TS lib types
      } as NotificationOptions & { vibrate?: number[] })
    }).catch(() => {
      new Notification(title, { body, icon: '/ai_waiter_app_icon.png' })
    })
  } else {
    new Notification(title, { body, icon: '/ai_waiter_app_icon.png' })
  }
}
