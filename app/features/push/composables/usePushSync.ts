import { useMarkNotificationRead } from '~/features/notifications/composables/useMarkNotificationRead'
import { useNotificationState } from '~/features/notifications/composables/useNotificationState'
import { usePushNotifications } from '~/features/push/composables/usePushNotifications'

/** Suma 1 cada vez que el service worker avisa que la suscripción cambió (ver `plugins/service-worker.client.ts`). */
export const PUSH_RESYNC_STATE_KEY = 'push-resync-tick'

/**
 * Se monta una vez en el layout autenticado:
 * - mantiene la suscripción push sincronizada con el backend en cada arranque y cuando el service worker la renueva;
 * - abre/ marca como leída la notificación a la que se entró desde un push (`?notification=<pk>`);
 * - refleja el no leído en el badge del ícono de la app.
 */
export function usePushSync() {
  const { isLoggedIn } = useAuth()
  const push = usePushNotifications()
  const resyncTick = useState<number>(PUSH_RESYNC_STATE_KEY, () => 0)

  watch([isLoggedIn, resyncTick], ([loggedIn]) => {
    if (loggedIn) {
      void push.syncSubscription()
    }
  }, { immediate: true })

  // El permiso o el ajuste del navegador pueden cambiar mientras la app está en segundo plano: al volver se relee
  // y, si había un problema por resolver, se reintenta solo. `focus` cubre el cambio de ventana sin cambiar de pestaña.
  const onReturn = () => {
    if (isLoggedIn.value) {
      void push.retryAfterReturn()
    }
  }
  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      onReturn()
    }
  })
  useEventListener(window, 'focus', onReturn)

  useNotificationDeepLink()
  useAppBadge()
}

/**
 * `?notification=<pk>` (viene del push): la marca como leída (una sola vez) y quita el parámetro; la tarea
 * ya la abre `?task=`. Se revisa en cada cambio de ruta porque otra navegación de la página (p. ej. fijar la
 * vista por defecto) puede volver a poner el parámetro y pisar el `replace`.
 */
function useNotificationDeepLink() {
  const route = useRoute()
  const router = useRouter()
  const markRead = useMarkNotificationRead()
  const handled = new Set<number>()

  watch(() => route.fullPath, () => {
    const value = route.query.notification
    const raw = Array.isArray(value) ? value[0] : value
    const notificationId = Number(raw)
    if (!raw || !Number.isInteger(notificationId) || notificationId <= 0) {
      return
    }

    const { notification: _removed, ...rest } = route.query
    void router.replace({ query: rest })

    if (handled.has(notificationId)) {
      return
    }
    handled.add(notificationId)
    // Un aviso ya leído o ajeno no debe romper la navegación; el toast de error lo muestra la mutación.
    markRead.mutateAsync(notificationId).catch(() => {})
  }, { immediate: true })
}

/** Badge del ícono de la app con el conteo de no leídas (no todos los navegadores lo soportan). */
function useAppBadge() {
  const { unreadCount } = useNotificationState()

  watch(unreadCount, async (count) => {
    try {
      if (count > 0) {
        await navigator.setAppBadge?.(count)
      }
      else {
        await navigator.clearAppBadge?.()
      }
    }
    catch {
      // Sin soporte o sin permiso del sistema: el badge es solo una mejora.
    }
  }, { immediate: true })
}
