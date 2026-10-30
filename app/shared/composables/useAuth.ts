import { clearStoredCatalog } from '~/features/auth/utils/profile-appearance.util'
import { removePushDeviceOnLogout } from '~/features/push/utils/push-device.util'
import type { AuthLoginRequest, AuthLoginResponse, AuthPasswordChangeRequest } from '~/shared/types/auth.types'

export type { AuthUser, AuthOrganization, AuthCompany, AuthSession, AuthManagedGroup, AuthProject } from '~/shared/types/auth.types'

/**
 * Borra todo rastro de la sesión que se cierra o se abre: la caché de consultas (tareas, proyectos privados, detalle y
 * chats) y el estado en memoria y en localStorage ligado a tareas, para que otra cuenta en el mismo navegador no vea
 * nada de la anterior.
 */
function clearSessionCaches() {
  useNuxtApp().$queryClient.clear()
  for (const key of ['task-tokens', 'task-token-cooldowns', 'backlog-mine', 'notifications-processed-ids', 'dashboard-task-detail-id', 'dashboard-task-detail-open']) {
    clearNuxtState(key)
  }
  clearStoredCatalog()
  try {
    localStorage.removeItem('nexxus-tasks-token-cooldowns')
  }
  catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

export function useAuth() {
  const apiBaseUrl = useApiBaseUrl()
  const { public: { apiAuthPath, apiAuthLogoutPath } } = useRuntimeConfig()

  const session = useAuthSession()
  const sessionClosing = useSessionClosing()

  const user = computed(() => session.value?.user ?? null)
  const organization = computed(() => session.value?.organization ?? null)
  const token = computed(() => session.value?.token ?? null)
  const isLoggedIn = computed(() => session.value?.token != null)
  const selectedCompanyId = computed(() => user.value?.selected_company?.id ?? null)
  const isSuperuser = computed(() => user.value?.is_superuser === true)
  const managedGroups = computed(() => user.value?.managed_groups ?? [])
  const isGroupManager = computed(() => managedGroups.value.length > 0)
  const userProjects = computed(() => user.value?.projects ?? [])
  const mustChangePassword = computed(() => isLoggedIn.value && user.value?.must_change_password === true)

  async function login(username: string, password: string) {
    const body: AuthLoginRequest = {
      username,
      password,
    }

    // Dejamos propagar el FetchError original: la UI lo formatea con parseFetchError.
    const data = await $fetch<AuthLoginResponse>(apiAuthPath as string, {
      baseURL: apiBaseUrl,
      method: 'POST',
      body,
    })

    // Cuenta nueva en el mismo navegador: nada de la sesión anterior (tareas privadas incluidas) debe quedar en memoria.
    clearSessionCaches()
    session.value = {
      token: data.token,
      user: data.user,
      organization: data.organization,
      profile_configurations: data.profile_configurations,
    }
  }

  /** Marca (o desmarca) en la sesión que el usuario debe cambiar su contraseña antes de usar la app. */
  function setMustChangePassword(value: boolean) {
    if (!session.value) {
      return
    }
    session.value = { ...session.value, user: { ...session.value.user, must_change_password: value } }
  }

  /** Cambia la contraseña del usuario en sesión; si era el cambio obligatorio, libera el acceso a la app. */
  async function changePassword(currentPassword: string, newPassword: string) {
    const { $api } = useNuxtApp()
    const body: AuthPasswordChangeRequest = {
      current_password: currentPassword,
      new_password: newPassword,
    }
    // El FetchError original (400 con el mensaje del backend) se deja propagar: la UI lo formatea con parseFetchError.
    await $api('/api/auth/password/change/', { method: 'POST', body })
    setMustChangePassword(false)
  }

  async function logout() {
    // Antes de llamar al backend: los sockets propios se cierran con 1000 y el 4403 que el backend manda al cerrar
    // sesión no se confunde con una revocación de acceso.
    sessionClosing.value = true
    try {
      if (token.value) {
        // Antes del logout: después el token ya no sirve. Si falla, el cierre de sesión continúa igual.
        await removePushDeviceOnLogout({ apiBaseUrl, token: token.value })
        await $fetch(apiAuthLogoutPath as string, {
          baseURL: apiBaseUrl,
          method: 'POST',
          headers: {
            Authorization: `Token ${token.value}`,
          },
        })
      }
    } catch {
      // Si el backend falla, igual cerramos la sesión local.
    } finally {
      session.value = null
      sessionClosing.value = false
      await navigateTo('/login')
      // Ya sin pantallas montadas: evita que el siguiente usuario vea datos en caché de esta sesión.
      clearSessionCaches()
    }
  }

  return {
    session,
    user,
    organization,
    token,
    isLoggedIn,
    selectedCompanyId,
    isSuperuser,
    managedGroups,
    isGroupManager,
    userProjects,
    mustChangePassword,
    setMustChangePassword,
    changePassword,
    login,
    logout,
  }
}
