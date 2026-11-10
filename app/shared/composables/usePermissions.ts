import type { PermissionActions, PermissionModule, UserPermissions } from '~/shared/types/auth.types'

/** Petición de /me/ en curso (compartida para no repetirla si varios piden refrescar a la vez). */
let inFlight: Promise<UserPermissions | null> | null = null

/**
 * Permisos del usuario logueado (GET /api/auth/permissions/me/). Viven dentro de la sesión, así se persisten, se
 * sincronizan entre pestañas y se borran al cerrar sesión. Quien bloquea de verdad es el backend (403): esto solo
 * decide qué mostrar.
 *
 * Mientras no haya permisos guardados (sesión previa a este cambio) `can()` devuelve true: se ve lo de siempre y el
 * primer `refreshPermissions()` lo corrige.
 */
export function usePermissions() {
  const session = useAuthSession()

  const permissions = computed(() => session.value?.permissions ?? null)
  const isLoaded = computed(() => permissions.value != null)
  const isSuperuser = computed(() => permissions.value?.is_superuser === true || session.value?.user?.is_superuser === true)

  function can<M extends PermissionModule>(module: M, action: PermissionActions[M]): boolean {
    if (isSuperuser.value) {
      return true
    }
    const perms = permissions.value
    if (!perms) {
      return true
    }
    const block = perms[module] as unknown as Record<string, boolean> | undefined
    return block?.allow === true && block[`can_${action}`] === true
  }

  /** El módulo está encendido y tiene al menos una acción permitida (para mostrar su entrada del menú). */
  function canModule(module: PermissionModule): boolean {
    if (isSuperuser.value) {
      return true
    }
    const perms = permissions.value
    if (!perms) {
      return true
    }
    const block = perms[module] as unknown as Record<string, boolean> | undefined
    return block?.allow === true && Object.entries(block).some(([key, value]) => key.startsWith('can_') && value === true)
  }

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

  return { permissions, isLoaded, isSuperuser, can, canModule, refreshPermissions }
}
