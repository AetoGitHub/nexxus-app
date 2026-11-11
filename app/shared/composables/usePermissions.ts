import type { PermissionActions, PermissionModule, UserPermissions } from '~/shared/types/auth.types'

/** Petición de /me/ en curso (compartida para no repetirla si varios piden refrescar a la vez). */
let inFlight: Promise<UserPermissions | null> | null = null

/**
 * Permisos del usuario logueado (GET /api/auth/permissions/me/). Viven dentro de la sesión, así se persisten, se
 * sincronizan entre pestañas y se borran al cerrar sesión. Quien bloquea de verdad es el backend (403): esto solo
 * decide qué mostrar.
 *
 * Todo arranca negado: sin permisos cargados (o sin `allow`) no se muestra nada, salvo al superuser, que lo ve todo.
 */
export function usePermissions() {
  const session = useAuthSession()

  const permissions = computed(() => session.value?.permissions ?? null)
  const isLoaded = computed(() => permissions.value != null)
  const isSuperuser = computed(() => permissions.value?.is_superuser === true || session.value?.user?.is_superuser === true)

  /**
   * `can('task', 'create')` → módulo encendido y esa acción permitida.
   * `can('master')` → solo que el módulo esté encendido (`allow`).
   */
  function can<M extends PermissionModule>(module: M, action?: PermissionActions[M]): boolean {
    if (isSuperuser.value) {
      return true
    }
    const block = permissions.value?.[module] as unknown as Record<string, boolean> | undefined
    if (block?.allow !== true) {
      return false
    }
    return action ? block[`can_${action}`] === true : true
  }

  /** Tiene al menos un módulo encendido (si no, se muestra «Aún no tienes permisos asignados»). */
  const hasAnyPermission = computed(() => {
    if (isSuperuser.value) {
      return true
    }
    const perms = permissions.value
    if (!perms) {
      return false
    }
    return (['task', 'report', 'dashboard', 'settings', 'master'] as PermissionModule[])
      .some(module => (perms[module] as unknown as Record<string, boolean> | undefined)?.allow === true)
  })

  async function refreshPermissions(): Promise<UserPermissions | null> {
    if (!session.value?.token) {
      return null
    }
    if (inFlight) {
      return inFlight
    }
    const token = session.value.token
    const { $api } = useNuxtApp()
    inFlight = $api<UserPermissions>('/api/auth/permissions/me/')
      .then((data) => {
        // Solo si sigue siendo la misma sesión: una respuesta tardía no debe escribir en otra cuenta.
        if (session.value?.token === token) {
          session.value = { ...session.value, permissions: data }
        }
        return data
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  return { permissions, isLoaded, isSuperuser, can, hasAnyPermission, refreshPermissions }
}
