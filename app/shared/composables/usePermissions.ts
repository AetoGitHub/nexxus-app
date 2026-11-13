import type {
  MePermissions,
  PermissionActions,
  PermissionModule,
  PermissionScreen,
} from '~/shared/types/auth.types'

const MODULES: PermissionModule[] = ['task', 'report', 'dashboard', 'settings', 'master']

/** Módulo que da el acceso a cada plataforma (como `SCREEN_ACCESS` del backend). */
const SCREEN_MODULE: Record<PermissionScreen, PermissionModule> = {
  task: 'task',
  config_admin: 'master',
}

/** Petición de /me/ en curso por plataforma (compartida para no repetirla si varios piden refrescar a la vez). */
const inFlight = new Map<PermissionScreen, Promise<MePermissions | null>>()
/** Cuándo terminó la última petición de cada plataforma: dos avisos seguidos hacen una sola. */
const lastFetchedAt = new Map<PermissionScreen, number>()
/** Ventana en la que una plataforma recién pedida no se vuelve a pedir (salvo `force`). */
const FRESH_MS = 2000

/**
 * Plataforma de una ruta: Nexxus Tasks (tareas, dashboard, reporte) o Configuración master. `null` = fuera de ellas (el
 * hub, login, cambio de contraseña): ahí no se piden permisos.
 */
export function screenForPath(path: string): PermissionScreen | null {
  if (path.startsWith('/configuration')) {
    return 'config_admin'
  }
  if (path.startsWith('/tasks') || path.startsWith('/dashboard') || path.startsWith('/reporte-ceo')) {
    return 'task'
  }
  return null
}

/**
 * Permisos del usuario en su COMPAÑÍA SELECCIONADA, por PLATAFORMA:
 * - el hub NO pide permisos: muestra cada tarjeta según `access` del login (`hasAccess`);
 * - al entrar a Nexxus Tasks se pide `me/?screen=task` (task, dashboard, report, settings);
 * - al entrar a Configuración master, `me/?screen=config_admin` (master).
 * Cada respuesta se guarda en la sesión bajo su plataforma y `can()` lee la de la plataforma activa (la fija el
 * middleware `permissions-screen`). Un módulo que no vino cuenta como «sin permiso». Quien bloquea de verdad es el
 * backend (403). Para sumar una plataforma basta con su `screen` y su entrada en `access`.
 *
 * Todo arranca negado (salvo el superuser, que lo ve todo). Si `me/` responde 404 (sin compañía seleccionada) se
 * guarda «sin permisos».
 */
export function usePermissions() {
  const session = useAuthSession()
  /** Plataforma en la que está el usuario; `null` en el hub y fuera de las plataformas. */
  const activeScreen = useState<PermissionScreen | null>('permissions-screen', () => null)

  /** Permisos guardados de una plataforma (una sesión con el formato anterior cuenta como no cargada). */
  function stored(screen: PermissionScreen | null): MePermissions | null {
    const all = session.value?.permissions as Record<string, unknown> | undefined
    if (!screen || !all || 'profile' in all) {
      return null
    }
    return (all[screen] as MePermissions | undefined) ?? null
  }

  const permissions = computed(() => stored(activeScreen.value))
  const isLoaded = computed(() => permissions.value != null)
  const isSuperuser = computed(() => permissions.value?.is_superuser === true || session.value?.user?.is_superuser === true)

  /**
   * `can('task', 'create')` → módulo encendido y esa acción permitida (en la plataforma activa).
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

  /** ¿Puede entrar a la plataforma? (`access` del login, actualizado cada vez que se piden sus permisos). */
  function hasAccess(screen: PermissionScreen): boolean {
    return isSuperuser.value || session.value?.access?.[screen] === true
  }

  /** Tiene al menos un módulo encendido en la plataforma activa. */
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

  /** Vacía los permisos de todas las plataformas (al cambiar de empresa, mientras llegan los de la nueva). */
  function clearPermissions() {
    lastFetchedAt.clear()
    if (session.value?.permissions) {
      const { permissions: _removed, ...rest } = session.value
      session.value = rest
    }
  }

  /**
   * Pide los permisos de una plataforma (por defecto, la activa) y los guarda bajo ella; de paso actualiza su `access`
   * (si le quitaron el módulo, la tarjeta del hub se oculta). Una sola petición a la vez por plataforma, y si se acaba
   * de pedir (< 2 s) usa lo guardado; `force` la pide de todos modos (cambio de empresa, 403, tras editar mis permisos).
   */
  async function refreshPermissions(
    screen: PermissionScreen | null = activeScreen.value,
    options: { force?: boolean } = {},
  ): Promise<MePermissions | null> {
    if (!screen || !session.value?.token) {
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
      if (session.value?.token !== token || !screen) {
        return
      }
      const current = session.value.permissions as Record<string, unknown> | undefined
      // El formato anterior (un solo objeto) se descarta.
      const byScreen = current && !('profile' in current) ? current : {}
      const module = data[SCREEN_MODULE[screen]] as { allow?: boolean } | undefined
      session.value = {
        ...session.value,
        permissions: { ...byScreen, [screen]: data },
        access: { ...session.value.access, [screen]: data.is_superuser || module?.allow === true },
      }
    }

    const request = $api<MePermissions>('/api/auth/permissions/me/', { query: { screen } })
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
    hasAccess,
    hasAnyPermission,
    hasStored: (screen: PermissionScreen) => stored(screen) != null,
    refreshPermissions,
    clearPermissions,
  }
}
