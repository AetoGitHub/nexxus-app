/** Al volver a la pestaña no se piden de nuevo si lo guardado tiene menos de esto (las consultas también se recargan). */
const FOCUS_MAX_AGE_MS = 30_000

/**
 * Los permisos se piden por plataforma al entrar a ella (middleware `permissions-screen`). Aquí se cubre:
 * - el cambio REAL de compañía (no el login ni el logout): el login no se repite, así que se vacían los permisos
 *   (quedan negados, para no mostrar ni un instante los de la empresa anterior) y se pide `GET /me/` sin screen. Con eso
 *   se actualizan el acceso a cada plataforma (`task.allow` / `master.allow`) y los permisos de ambas, en una sola
 *   petición;
 * - al volver a la pestaña (cuando las consultas se recargan solas) se vuelven a pedir los de la plataforma activa, así
 *   un cambio hecho por un admin (p. ej. «Vista por proyecto / por grupo») aparece o se oculta sin volver a entrar.
 *   Como mucho una vez cada 30 s.
 */
export default defineNuxtPlugin(() => {
  const { selectedCompanyId } = useAuth()
  const { activeScreen, refreshPermissions, refreshAllPermissions, clearPermissions } = usePermissions()

  watch(selectedCompanyId, (companyId, previous) => {
    if (companyId == null || previous == null || companyId === previous) {
      return
    }
    clearPermissions()
    void refreshAllPermissions()
  })

  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !activeScreen.value) {
      return
    }
    void refreshPermissions(activeScreen.value, { maxAgeMs: FOCUS_MAX_AGE_MS })
  })
})
