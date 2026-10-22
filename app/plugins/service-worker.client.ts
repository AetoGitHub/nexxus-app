import { PUSH_RESYNC_STATE_KEY } from '~/features/push/composables/usePushSync'

/**
 * Registra el service worker de la raíz (`/sw.js`, scope "/"), que atiende los push del sistema.
 * Requiere HTTPS (localhost es la excepción). Si el navegador renueva la suscripción push, el service worker
 * avisa por mensaje y la app la vuelve a registrar en el backend (el service worker no tiene el token de sesión).
 * Al tocar una notificación con la app abierta, el service worker pide por mensaje abrir la tarea
 * (`notification-open`) y la app navega con su router, sin recargar.
 */
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    return
  }

  const router = useRouter()
  const resyncTick = useState<number>(PUSH_RESYNC_STATE_KEY, () => 0)

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'push-subscription-changed') {
      resyncTick.value += 1
      return
    }

    if (event.data?.type === 'notification-open' && typeof event.data.url === 'string') {
      const target = new URL(event.data.url, window.location.origin)
      // Solo rutas de la propia app: el mensaje viene del service worker, pero no se navega fuera de este origen.
      if (target.origin !== window.location.origin) {
        return
      }
      void router.push(`${target.pathname}${target.search}${target.hash}`)
      // Confirmación: sin ella el service worker recurre a recargar la ventana.
      event.ports[0]?.postMessage('ok')
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
