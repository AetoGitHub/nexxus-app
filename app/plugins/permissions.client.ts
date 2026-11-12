/**
 * Permisos del usuario en su compañía seleccionada:
 * - al abrir la app con sesión se vuelven a pedir (pudieron cambiar); mientras tanto se usan los guardados, así no
 *   parpadean botones ni menús;
 * - al cambiar de compañía se vacían (quedan negados) y se piden los de la nueva: pueden ser otros.
 */
export default defineNuxtPlugin(() => {
  const { selectedCompanyId } = useAuth()
  const { refreshPermissions, clearPermissions } = usePermissions()

  void refreshPermissions()

  watch(selectedCompanyId, (companyId, previous) => {
    if (companyId === previous) {
      return
    }
    clearPermissions()
    // Sin sesión (logout) no pide nada; en el login comparte la petición que ya lanzó `login()`.
    void refreshPermissions()
  })
})
