import { urlBase64ToUint8Array } from '~/shared/utils/push-support.util'

/**
 * Operaciones de bajo nivel sobre la suscripción push de ESTE navegador. No dependen del contexto de Vue
 * para poder usarse también al cerrar sesión.
 */

const OPT_OUT_PREFIX = 'nexxus:push-device-off:'
const REGISTRATION_TIMEOUT_MS = 4000

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/** Service worker activo, o `null` si no hay (contexto no seguro o aún no registrado) tras una espera corta. */
export async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }
  const ready = navigator.serviceWorker.ready
  const result = await Promise.race([ready, delay(REGISTRATION_TIMEOUT_MS).then(() => null)])
  return result ?? null
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await getPushRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** Suscribe este navegador con la clave VAPID del servidor (sin popup si el permiso ya está dado). */
export async function subscribeThisDevice(publicKey: string): Promise<PushSubscription> {
  const registration = await getPushRegistration()
  if (!registration) {
    throw new Error('service_worker_unavailable')
  }
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
}

/** El usuario apagó las notificaciones en este dispositivo: no se vuelve a registrar solo. */
export function readDeviceOptOut(userId: number | null | undefined): boolean {
  if (userId == null) {
    return false
  }
  try {
    return localStorage.getItem(`${OPT_OUT_PREFIX}${userId}`) === '1'
  }
  catch {
    return false
  }
}

export function writeDeviceOptOut(userId: number | null | undefined, optedOut: boolean) {
  if (userId == null) {
    return
  }
  try {
    if (optedOut) {
      localStorage.setItem(`${OPT_OUT_PREFIX}${userId}`, '1')
    }
    else {
      localStorage.removeItem(`${OPT_OUT_PREFIX}${userId}`)
    }
  }
  catch {
    // Sin almacenamiento disponible: se pierde solo la memoria de "apagado en este dispositivo".
  }
}

/**
 * Quita este dispositivo del backend y del navegador. Se usa al cerrar sesión, ANTES del logout (después
 * el token ya no sirve). Nunca lanza ni bloquea el cierre de sesión más de unos segundos.
 */
export async function removePushDeviceOnLogout(options: { apiBaseUrl: string, token: string }) {
  try {
    const task = (async () => {
      const subscription = await getCurrentSubscription()
      if (!subscription) {
        return
      }
      try {
        await $fetch('/api/notifications/push/subscriptions/delete/', {
          baseURL: options.apiBaseUrl,
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${options.token}`,
            'Content-Type': 'application/json',
          },
          body: { endpoint: subscription.endpoint },
        })
      }
      catch {
        // Si el DELETE falla se continúa con el logout igual.
      }
      await subscription.unsubscribe().catch(() => {})
    })()
    await Promise.race([task, delay(REGISTRATION_TIMEOUT_MS + 2000)])
  }
  catch {
    // El cierre de sesión no depende de esto.
  }
}
