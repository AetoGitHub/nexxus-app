import { PUSH_RESYNC_STATE_KEY } from '~/features/push/composables/usePushSync'

/**
 * Registra el service worker de la raíz (`/sw.js`, scope "/"), que atiende los push del sistema.
 * Requiere HTTPS (localhost es la excepción). Si el navegador renueva la suscripción push, el service worker
 * avisa por mensaje y la app la vuelve a registrar en el backend (el service worker no tiene el token de sesión).
 */
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    return
  }

  const resyncTick = useState<number>(PUSH_RESYNC_STATE_KEY, () => 0)

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'push-subscription-changed') {
      resyncTick.value += 1
    }
  })

  const register = () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }

  if (document.readyState === 'complete') {
    register()
  }
  else {
    window.addEventListener('load', register, { once: true })
  }
})
