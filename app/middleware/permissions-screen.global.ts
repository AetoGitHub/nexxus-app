/**
 * Plataformas y sus permisos:
 * - En el hub (y fuera de las plataformas) no se pide nada: sus tarjetas salen de `access` del login.
 * - Al ENTRAR a una plataforma se valida el acceso y se piden sus permisos: `me/?screen=task` en tareas/dashboard/
 *   reporte y `me/?screen=config_admin` en Configuración master. Moverse dentro de la misma no vuelve a pedir nada.
 * - Si ya hay permisos guardados y acceso, se refrescan en segundo plano (sin bloquear ni parpadear); si no, se espera la
 *   respuesta para decidir con datos reales. Sin acceso: aviso y de vuelta al hub.
 * Corre antes que los middleware de cada página.
 */
export default defineNuxtRouteMiddleware(async (to) => {
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
    return
  }
  entered.value = screen

  if (hasStored(screen) && hasAccess(screen)) {
    void refreshPermissions(screen)
    return
  }
  // Sin permisos guardados, o el login dijo que no tiene acceso: se confirma con el backend antes de dejarlo pasar.
  await refreshPermissions(screen)

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
