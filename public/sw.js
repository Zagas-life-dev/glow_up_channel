/* GlowUp PWA Service Worker – push notifications */
const CACHE_NAME = "glowup-sw-v1"

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  if (!event.data) return
  let payload = { title: "GlowUp", body: "", url: "/" }
  try {
    payload = { ...payload, ...event.data.json() }
  } catch {
    payload.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "GlowUp", {
      body: payload.body || "",
      icon: "/images/logo-icon-transparent.png",
      badge: "/images/logo-icon-transparent.png",
      tag: payload.tag || "glowup-push",
      data: { url: payload.url || "/" },
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0]
        client.focus();
        client.navigate(url)
      } else if (self.clients.openWindow) {
        self.clients.openWindow(self.location.origin + (url.startsWith("/") ? url : "/" + url))
      }
    })
  )
})
