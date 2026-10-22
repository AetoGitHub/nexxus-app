/*
 * Service worker de Nexxus (registrado en la raíz, scope "/").
 *
 * Solo atiende Web Push: no cachea nada ni intercepta peticiones. El service worker no tiene el token
 * de sesión, así que nunca llama a la API: cuando hay que volver a registrar la suscripción avisa a la
 * app con postMessage y es ella quien hace el POST.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/** Ruta del front para abrir la tarea. El `url` del backend puede no coincidir con las rutas del front. */
function targetUrl(data) {
  const notificationParam = data.notification_pk != null ? `notification=${data.notification_pk}` : ''
  if (data.task_pk != null) {
    return `/tasks?task=${data.task_pk}${notificationParam ? `&${notificationParam}` : ''}`
  }
  return notificationParam ? `/tasks?${notificationParam}` : '/'
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  }
  catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil((async () => {
    // Siempre se muestra una notificación, aunque la app esté abierta: Chrome muestra un aviso genérico
    // si no se hace y Safari cancela la suscripción tras varios push sin notificación.
    await self.registration.showNotification(data.title || 'Nexxus', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.notification_pk != null ? `notification-${data.notification_pk}` : undefined,
      data: {
        url: targetUrl(data),
        notification_pk: data.notification_pk,
        key: data.key,
      },
    })

    if ('setAppBadge' in self.navigator && data.unread_count != null) {
      self.navigator.setAppBadge(data.unread_count).catch(() => {})
    }
  })())
})

/**
 * Le pide a la app abierta que vaya a `url` por su propio router (sin recargar) y espera su confirmación por un
 * canal de mensajes. `false` si no responde a tiempo (app sin la versión que escucha el mensaje, página congelada).
 */
function askAppToOpen(client, url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => resolve(false), timeoutMs)
    channel.port1.onmessage = () => {
      clearTimeout(timer)
      resolve(true)
    }
    try {
      client.postMessage({ type: 'notification-open', url }, [channel.port2])
    }
    catch {
      clearTimeout(timer)
      resolve(false)
    }
  })
}

/*
 * Al tocar la notificación: si la app ya está abierta se enfoca y se le pide abrir la tarea; `WindowClient.navigate()`
 * solo funciona con ventanas controladas por este service worker (y no en todos los navegadores móviles), así que en
 * el celular la app quedaba al frente pero sin ir a la tarea. Solo si la app no responde se intenta `navigate()` y,
 * como último recurso, una ventana nueva.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find(client => new URL(client.url).origin === self.location.origin)
    if (!open) {
      return self.clients.openWindow(url)
    }

    try {
      await open.focus()
    }
    catch {
      // Sin permiso para enfocar: igual se intenta llevar a la tarea.
    }

    if (await askAppToOpen(open, url)) {
      return undefined
    }
    try {
      if ('navigate' in open) {
        await open.navigate(url)
        return undefined
      }
    }
    catch {
      // Ventana no controlada: se abre una nueva.
    }
    return self.clients.openWindow(url)
  })())
})

// El navegador rotó o invalidó la suscripción: se vuelve a suscribir con la misma clave y se avisa a la app.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey
        ?? (await self.registration.pushManager.getSubscription())?.options?.applicationServerKey
      if (!applicationServerKey) {
        return
      }

      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        client.postMessage({ type: 'push-subscription-changed', subscription: subscription.toJSON() })
      }
    }
    catch {
      // Sin la clave o sin permiso no hay nada que hacer: la app vuelve a sincronizar en su próximo arranque.
    }
  })())
})
