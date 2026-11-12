import type {
  MePermissions,
  PermissionActions,
  PermissionModule,
  PermissionScreen,
} from '~/shared/types/auth.types'

const MODULES: PermissionModule[] = ['task', 'report', 'dashboard', 'settings', 'master']

/** Petición de /me/ en curso por pantalla (compartida para no repetirla si varios piden refrescar a la vez). */
const inFlight = new Map<PermissionScreen, Promise<MePermissions | null>>()
/** Cuándo terminó la última petición de cada pantalla: dos avisos seguidos (middleware + watcher) hacen una sola. */
const lastFetchedAt = new Map<PermissionScreen, number>()
/** Ventana en la que una pantalla recién pedida no se vuelve a pedir (salvo `force`). */
const FRESH_MS = 2000

/** Pantalla de una ruta: el hub, Nexxus Tasks (tareas, dashboard, reporte) o Configuración master; `null` = sin cambio. */
export function screenForPath(path: string): PermissionScreen | null {
  if (path === '/') {
    return 'hub'
  }
  if (path.startsWith('/configuration')) {
    return 'config_admin'
  }
  if (path.startsWith('/tasks') || path.startsWith('/dashboard') || path.startsWith('/reporte-ceo')) {
    return 'task'
  }
  return null
}

/**
 * Permisos del usuario en su COMPAÑÍA SELECCIONADA, por PANTALLA (GET /api/auth/permissions/me/?screen=…):
 * - hub («Selecciona un módulo»): `me/` sin screen → decide qué tarjetas mostrar;
 * - Nexxus Tasks: `screen=task` → task, dashboard, report, settings;
 * - Configuración master: `screen=config_admin` → master.
 * Cada respuesta se guarda en la sesión bajo su pantalla y `can()` lee la de la pantalla activa (la fija el middleware
 * `permissions-screen`). Un módulo que no vino cuenta como «sin permiso». Quien bloquea de verdad es el backend (403).
 *
 * Todo arranca negado (salvo el superuser, que lo ve todo). Si `me/` responde 404 (sin compañía seleccionada) se
 * guarda «sin permisos».
 */
export function usePermissions() {
  const session = useAuthSession()
  const activeScreen = useState<PermissionScreen>('permissions-screen', () => 'hub')

  /** Permisos guardados de una pantalla (una sesión con el formato anterior, sin pantallas, cuenta como no cargada). */
  function stored(screen: PermissionScreen): MePermissions | null {
    const all = session.value?.permissions as Record<string, unknown> | undefined
    if (!all || 'profile' in all) {
      return null
    }
    return (all[screen] as MePermissions | undefined) ?? null
  }

  const permissions = computed(() => stored(activeScreen.value))
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

  /** Tiene al menos un módulo encendido en la pantalla activa. */
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
  function noPermissions(): MePermissions {
    return {
      profile: session.value?.user?.id ?? 0,
      is_superuser: session.value?.user?.is_superuser === true,
      company: null,
      preset: null,
    }
  }

  /** Vacía los permisos de todas las pantallas (al cambiar de empresa, mientras llegan los de la nueva). */
  function clearPermissions() {
    lastFetchedAt.clear()
    if (session.value?.permissions) {
      const { permissions: _removed, ...rest } = session.value
      session.value = rest
    }
  }

  /**
   * Pide los permisos de una pantalla (por defecto, la activa) y los guarda bajo ella. Una sola petición a la vez por
   * pantalla, y si se acaba de pedir (< 2 s) usa lo guardado; `force` la pide de todos modos (cambio de empresa, 403,
   * «Volver a revisar», tras editar mis permisos).
   */
  async function refreshPermissions(
    screen: PermissionScreen = activeScreen.value,
    options: { force?: boolean } = {},
  ): Promise<MePermissions | null> {
    if (!session.value?.token) {
      return null
    }
    const pending = inFlight.get(screen)
    if (pending) {
      return pending
    }
    const fetchedAt = lastFetchedAt.get(screen)
    if (!options.force && fetchedAt != null && Date.now() - fetchedAt < FRESH_MS && stored(screen)) {
      return stored(screen)
    }
    const token = session.value.token
    const { $api } = useNuxtApp()

    function store(data: MePermissions) {
      // Solo si sigue siendo la misma sesión: una respuesta tardía no debe escribir en otra cuenta.
      if (session.value?.token !== token) {
        return
      }
      const current = session.value.permissions as Record<string, unknown> | undefined
      // El formato anterior (un solo objeto) se descarta.
      const byScreen = current && !('profile' in current) ? current : {}
      session.value = { ...session.value, permissions: { ...byScreen, [screen]: data } }
    }

    const request = $api<MePermissions>('/api/auth/permissions/me/', {
      query: screen === 'hub' ? undefined : { screen },
    })
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
        inFlight.delete(screen)
        lastFetchedAt.set(screen, Date.now())
      })
    inFlight.set(screen, request)
    return request
  }

  return {
    permissions,
    activeScreen,
    isLoaded,
    isSuperuser,
    can,
    hasAnyPermission,
    hasStored: (screen: PermissionScreen) => stored(screen) != null,
    refreshPermissions,
    clearPermissions,
  }
}
