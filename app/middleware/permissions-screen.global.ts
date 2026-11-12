/**
 * Fija la pantalla de permisos de la ruta (hub · Nexxus Tasks · Configuración master) y pide sus permisos al ENTRAR a
 * ella: `me/` en el hub, `me/?screen=task` en tareas/dashboard/reporte y `me/?screen=config_admin` en Configuración
 * master. Moverse dentro de la misma pantalla no vuelve a pedir nada.
 *
 * Si ya hay permisos guardados de esa pantalla se refrescan en segundo plano (sin bloquear ni parpadear); si no, se
 * espera la respuesta para que el middleware `permission` decida con datos reales. Corre antes que los de cada página.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn.value) {
    return
  }

  const screen = screenForPath(to.path)
  if (!screen) {
    return
  }

  const { activeScreen, hasStored, refreshPermissions } = usePermissions()
  /** Última pantalla a la que se entró (null = primera navegación de la app o tras iniciar sesión). */
  const entered = useState<string | null>('permissions-entered', () => null)

  activeScreen.value = screen
  if (entered.value === screen) {
    return
  }
  entered.value = screen

  if (hasStored(screen)) {
    void refreshPermissions(screen)
    return
  }
  await refreshPermissions(screen)
})
