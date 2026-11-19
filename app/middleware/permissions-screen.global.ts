/** Dentro de una plataforma, al cambiar de página no se vuelven a pedir si lo guardado tiene menos de esto. */
const IN_SCREEN_MAX_AGE_MS = 5000

/**
 * Plataformas y sus permisos:
 * - En el hub (y fuera de las plataformas) no se pide nada: sus tarjetas salen de `access` del login.
 * - Al ENTRAR a una plataforma se valida el acceso y se ESPERAN sus permisos frescos: `me/?screen=task` en tareas/
 *   dashboard/reporte y `me/?screen=config_admin` en Configuración master. Sin acceso: aviso y de vuelta al hub.
 * - Al moverse DENTRO de la plataforma (otra página del menú) se vuelven a pedir en segundo plano (como mucho cada 5 s):
 *   si un admin cambió algo (p. ej. «Vista por proyecto»), el menú y los botones se actualizan sin cerrar sesión.
 * Corre antes que los middleware de cada página.
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn.value) {
    return
  }

  const screen = screenForPath(to.path)
  const { activeScreen, hasStored, hasAccess, refreshPermissions } = usePermissions()
  /** Última plataforma a la que se entró ('hub' = fuera de ellas; null = primera navegación o tras iniciar sesión). */
  const entered = useState<string | null>('permissions-entered', () => null)

  activeScreen.value = screen
  if (!screen) {
    entered.value = 'hub'
    return
  }
  if (entered.value === screen) {
    // Otra página de la misma plataforma (no solo un cambio de filtros en la URL): refresco en segundo plano.
    if (to.path !== from.path) {
      void refreshPermissions(screen, { maxAgeMs: IN_SCREEN_MAX_AGE_MS })
    }
    return
  }
  entered.value = screen

  // Al entrar se esperan los permisos frescos (una sola petición): así no se ve ni un instante lo que ya no tiene.
  await refreshPermissions(screen, { force: hasStored(screen) })

  if (!hasAccess(screen)) {
    entered.value = 'hub'
    activeScreen.value = null
    if (import.meta.client) {
      const t = useNuxtApp().$i18n.t
      useToast().add({
        title: t('permissions.denied.title'),
        description: t('permissions.denied.description', {
          module: t(screen === 'config_admin' ? 'permissions.modules.master' : 'permissions.modules.task'),
        }),
        color: 'error',
        icon: 'i-lucide-lock',
      })
    }
    return navigateTo('/')
  }
})
