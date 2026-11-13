/**
 * Los permisos se piden por plataforma al entrar a ella (middleware `permissions-screen`). Aquí solo se cubre el cambio
 * REAL de compañía (no el login ni el logout): se vacían todos los permisos (quedan negados, para no mostrar ni un
 * instante los de la empresa anterior) y se vuelve a pedir la plataforma en la que está el usuario. Si está en el hub,
 * el `access` del login era de la empresa anterior: se consulta cada plataforma para actualizar sus tarjetas.
 */
export default defineNuxtPlugin(() => {
  const { selectedCompanyId } = useAuth()
  const { activeScreen, refreshPermissions, clearPermissions } = usePermissions()

  watch(selectedCompanyId, (companyId, previous) => {
    if (companyId == null || previous == null || companyId === previous) {
      return
    }
    clearPermissions()
    if (activeScreen.value) {
      void refreshPermissions(activeScreen.value, { force: true })
      return
    }
    void refreshPermissions('task', { force: true })
    void refreshPermissions('config_admin', { force: true })
  })
})
