/**
 * Los permisos se piden por plataforma al entrar a ella (middleware `permissions-screen`). Aquí solo se cubre el cambio
 * REAL de compañía (no el login ni el logout): el login no se repite, así que se vacían los permisos (quedan negados,
 * para no mostrar ni un instante los de la empresa anterior) y se pide `GET /me/` sin screen. Con eso se actualizan el
 * acceso a cada plataforma (`task.allow` / `master.allow`) y los permisos de ambas, en una sola petición.
 */
export default defineNuxtPlugin(() => {
  const { selectedCompanyId } = useAuth()
  const { refreshAllPermissions, clearPermissions } = usePermissions()

  watch(selectedCompanyId, (companyId, previous) => {
    if (companyId == null || previous == null || companyId === previous) {
      return
    }
    clearPermissions()
    void refreshAllPermissions()
  })
})
