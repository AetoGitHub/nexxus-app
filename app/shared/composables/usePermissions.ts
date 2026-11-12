import type { PermissionActions, PermissionModule, UserPermissions } from '~/shared/types/auth.types'

const MODULES: PermissionModule[] = ['task', 'report', 'dashboard', 'settings', 'master']

/** Petición de /me/ en curso (compartida para no repetirla si varios piden refrescar a la vez). */
let inFlight: Promise<UserPermissions | null> | null = null

/**
 * Permisos del usuario logueado en su COMPAÑÍA SELECCIONADA (GET /api/auth/permissions/me/). Viven dentro de la sesión,
 * así se persisten, se sincronizan entre pestañas y se borran al cerrar sesión. Quien bloquea de verdad es el backend
 * (403): esto solo decide qué mostrar.
 *
 * Todo arranca negado: sin permisos cargados (o sin `allow`) no se muestra nada, salvo al superuser, que lo ve todo.
 * Si `me/` responde 404 (sin compañía seleccionada) se guarda «sin permisos».
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

  /** Tiene al menos un módulo encendido (si no, se muestra «Aún no tienes permisos en esta empresa»). */
  const hasAnyPermission = computed(() => {
    if (isSuperuser.value) {
      return true
    }
    const perms = permissions.value
    if (!perms) {
      return false
    }
    return MODULES.some(module => (perms[module] as unknown as Record<string, boolean> | undefined)?.allow === true)
  })

  /** «Sin permisos» (me/ → 404: el usuario no tiene compañía seleccionada). */
  function noPermissions(): UserPermissions {
    const denied = Object.fromEntries(MODULES.map(module => [module, { allow: false }]))
    return {
      ...(denied as unknown as Omit<UserPermissions, 'profile' | 'is_superuser' | 'company' | 'preset'>),
      profile: session.value?.user?.id ?? 0,
      is_superuser: session.value?.user?.is_superuser === true,
      company: null,
      preset: null,
    }
  }

  /** Vacía los permisos guardados (al cambiar de empresa, mientras llegan los de la nueva). */
  function clearPermissions() {
    if (session.value?.permissions) {
      const { permissions: _removed, ...rest } = session.value
      session.value = rest
    }
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

    function store(data: UserPermissions) {
      // Solo si sigue siendo la misma sesión: una respuesta tardía no debe escribir en otra cuenta.
      if (session.value?.token === token) {
        session.value = { ...session.value, permissions: data }
      }
    }

    inFlight = $api<UserPermissions>('/api/auth/permissions/me/')
      .then((data) => {
        store(data)
        return data
      })
      .catch((error: { status?: number, statusCode?: number }) => {
        if ((error?.statusCode ?? error?.status) === 404) {
          const none = noPermissions()
          store(none)
          return none
        }
        return null
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  return { permissions, isLoaded, isSuperuser, can, hasAnyPermission, refreshPermissions, clearPermissions }
}
