import { parseStoredSession, writeStoredSession, AUTH_SESSION_STORAGE_KEY } from '~/shared/utils/auth-session.util'

/** `true` cuando la app corre instalada como PWA (no en una pestaña del navegador). */
function isInstalledPwa() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/**
 * Persistencia de la sesión.
 *
 * - Guarda en localStorage cada cambio de la sesión (login, perfil, logout).
 * - Sincroniza pestañas/ventanas: si otra cierra sesión, esta también sale.
 * - En la PWA instalada pide almacenamiento persistente para que el sistema
 *   no lo purgue cuando la app lleva días sin abrirse.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const session = useAuthSession()
  const router = useRouter()

  watch(session, (value) => {
    writeStoredSession(value)
  }, { flush: 'sync' })

  window.addEventListener('storage', (event) => {
    // `key === null` es `localStorage.clear()`.
    if (event.key !== null && event.key !== AUTH_SESSION_STORAGE_KEY) {
      return
    }

    const next = event.key === null ? null : parseStoredSession(event.newValue)
    const hadSession = session.value != null
    session.value = next

    if (hadSession && !next && router.currentRoute.value.path !== '/login') {
      void nuxtApp.runWithContext(() => navigateTo('/login'))
    }
  })

  if (isInstalledPwa()) {
    void navigator.storage?.persist?.().catch(() => {})
  }
})
