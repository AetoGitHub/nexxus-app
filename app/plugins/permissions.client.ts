/**
 * Los permisos se piden por pantalla al entrar a ella (middleware `permissions-screen`). Aquí solo se cubre el cambio de
 * compañía: se vacían todas las pantallas (quedan negados, para no mostrar ni un instante los de la empresa anterior) y
 * se vuelve a pedir la pantalla en la que está el usuario.
 */
export default defineNuxtPlugin(() => {
  const { selectedCompanyId } = useAuth()
  const { refreshPermissions, clearPermissions } = usePermissions()

  watch(selectedCompanyId, (companyId, previous) => {
    // Solo un cambio REAL de empresa: en el login (null → id) los pide el middleware al llegar al hub, y en el logout
    // (id → null) no hay nada que pedir. Si no, se duplicaba la petición del hub.
    if (companyId == null || previous == null || companyId === previous) {
      return
    }
    clearPermissions()
    void refreshPermissions(undefined, { force: true })
  })
})
