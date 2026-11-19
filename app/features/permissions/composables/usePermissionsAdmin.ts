import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PermissionBlocks, UserPermissions } from '~/shared/types/auth.types'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { AuthProfile } from '~/features/auth/types/profile.types'
import type { CursorPage, PermissionBlocksPatch, PermissionPreset } from '~/features/permissions/types/permissions.types'

const BASE = '/api/auth/permissions'
const PRESETS_KEY = ['permissions', 'presets'] as const

function profileKey(id: number | null | undefined, companyId: number | null | undefined) {
  return ['permissions', 'profile', id, companyId] as const
}

/** Ruta de los permisos de un perfil en una compañía (+ sufijo `update/` o `apply_preset/`). */
function profilePath(profileId: number, companyId: number, suffix = '') {
  return `${BASE}/profile/${profileId}/company/${companyId}/${suffix}`
}

/** Sigue `next` hasta el final (los listados vienen paginados). */
async function fetchAllPages<T>(
  $api: ReturnType<typeof useNuxtApp>['$api'],
  first: string,
  query?: Record<string, unknown>,
): Promise<T[]> {
  const items: T[] = []
  let page = await $api<CursorPage<T> | PaginatedResponse<T>>(first, { query })
  items.push(...page.results)
  // Tope de seguridad: un `next` que no avanza no debe colgar la pantalla.
  for (let guard = 0; page.next && guard < 50; guard++) {
    page = await $api<CursorPage<T> | PaginatedResponse<T>>(page.next)
    items.push(...page.results)
  }
  return items
}

/** Perfiles de la organización elegida (todas las páginas); sin organización no se pide nada. */
export function usePermissionProfiles(organizationId: MaybeRefOrGetter<number | null | undefined>) {
  const { $api } = useNuxtApp()
  return useQuery({
    queryKey: computed(() => ['permissions', 'profiles', toValue(organizationId) ?? null]),
    queryFn: () => fetchAllPages<AuthProfile>($api, '/api/auth/profiles/', { organization: toValue(organizationId) }),
    enabled: computed(() => toValue(organizationId) != null),
  })
}

/**
 * Permisos de un perfil en una compañía (misma forma que `me/`). Si no tenía permisos en esa compañía, el backend los
 * crea todos en false. Solo se pide con usuario y compañía.
 */
export function useProfilePermissions(
  profileId: MaybeRefOrGetter<number | null | undefined>,
  companyId: MaybeRefOrGetter<number | null | undefined>,
) {
  const { $api } = useNuxtApp()
  return useQuery({
    queryKey: computed(() => profileKey(toValue(profileId), toValue(companyId))),
    queryFn: () => $api<UserPermissions>(profilePath(toValue(profileId)!, toValue(companyId)!)),
    enabled: computed(() => toValue(profileId) != null && toValue(companyId) != null),
  })
}

/**
 * Plantillas. Con `companyId` trae solo las generales y las de esa compañía (las que se pueden aplicar ahí); sin él,
 * todas (pestaña Plantillas).
 */
export function usePermissionPresets(companyId?: MaybeRefOrGetter<number | null | undefined>) {
  const { $api } = useNuxtApp()
  const company = computed(() => (companyId === undefined ? undefined : toValue(companyId) ?? null))
  return useQuery({
    queryKey: computed(() => [...PRESETS_KEY, company.value ?? 'all']),
    queryFn: () => fetchAllPages<PermissionPreset>(
      $api,
      `${BASE}/presets/`,
      company.value != null ? { company: company.value } : undefined,
    ),
    // Para aplicar (con compañía) no se pide mientras no haya una elegida.
    enabled: computed(() => companyId === undefined || company.value != null),
  })
}

/** Toasts y refresco comunes a las mutaciones de esta pantalla. */
function useAdminMutationHelpers() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { user, selectedCompanyId } = useAuth()
  const { refreshPermissions } = usePermissions()

  function success(titleKey: string) {
    toast.add({ title: t(titleKey), color: 'success' })
  }

  function failure(error: unknown) {
    toast.add({ title: t('permissions.toasts.error'), description: parseFetchError(error), color: 'error' })
  }

  /**
   * Guarda en caché los permisos devueltos y, si son los del usuario logueado en su compañía seleccionada, refresca la
   * UI (en otra compañía no le cambian nada ahora mismo).
   */
  async function storeProfile(data: UserPermissions, companyId: number) {
    queryClient.setQueryData(profileKey(data.profile, companyId), data)
    if (data.profile === user.value?.id && companyId === selectedCompanyId.value) {
      await refreshPermissions(undefined, { force: true })
    }
  }

  return { queryClient, success, failure, storeProfile }
}

export function useUpdateProfilePermissions() {
  const { $api } = useNuxtApp()
  const { success, failure, storeProfile } = useAdminMutationHelpers()
  return useMutation({
    mutationFn: (payload: { profileId: number, companyId: number, patch: PermissionBlocksPatch }) =>
      $api<UserPermissions>(profilePath(payload.profileId, payload.companyId, 'update/'), {
        method: 'PATCH',
        body: payload.patch,
      }),
    onSuccess: async (data, variables) => {
      await storeProfile(data, variables.companyId)
      success('permissions.toasts.profileSaved')
    },
    onError: failure,
  })
}

export function useApplyPermissionPreset() {
  const { $api } = useNuxtApp()
  const { success, failure, storeProfile } = useAdminMutationHelpers()
  return useMutation({
    // `presetId: null` desliga la plantilla: el usuario conserva sus permisos y deja de recibir cambios del preset.
    mutationFn: (payload: { profileId: number, companyId: number, presetId: number | null }) =>
      $api<UserPermissions>(profilePath(payload.profileId, payload.companyId, 'apply_preset/'), {
        method: 'POST',
        body: { preset: payload.presetId },
      }),
    onSuccess: async (data, variables) => {
      await storeProfile(data, variables.companyId)
      success(variables.presetId == null ? 'permissions.toasts.presetRemoved' : 'permissions.toasts.presetApplied')
    },
    onError: failure,
  })
}

/**
 * Crear o editar una plantilla. Al editar, `propagate: true` aplica a los usuarios que la tienen SOLO las banderas que
 * cambiaron (sus demás permisos y ajustes manuales se conservan) y el PATCH responde `users_updated`; sin `propagate`
 * solo cambia la plantilla. Si se propagó, se recargan los perfiles abiertos en «Usuarios» y, si el usuario logueado
 * tiene esa plantilla, sus propios permisos (menús y botones).
 */
export function useSavePermissionPreset() {
  const { $api } = useNuxtApp()
  const { queryClient, failure } = useAdminMutationHelpers()
  const toast = useToast()
  const { t } = useI18n()
  const session = useAuthSession()
  const { refreshPermissions, refreshAllPermissions, activeScreen } = usePermissions()

  /** ¿El usuario logueado tiene esta plantilla aplicada (en lo que hay guardado de su compañía seleccionada)? */
  function iHavePreset(presetId: number): boolean {
    const stored = Object.values(session.value?.permissions ?? {}) as Array<{ preset?: { id: number } | null }>
    return stored.some(perms => perms?.preset?.id === presetId)
  }

  return useMutation({
    mutationFn: (payload: {
      id?: number
      body: Partial<PermissionBlocks> & { name?: string, company?: number | null, propagate?: boolean }
    }) =>
      payload.id != null
        ? $api<PermissionPreset & { users_updated?: number }>(`${BASE}/presets/${payload.id}/update/`, {
            method: 'PATCH',
            body: payload.body,
          })
        : $api<PermissionPreset>(`${BASE}/presets/create/`, { method: 'POST', body: payload.body }),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: PRESETS_KEY })

      if (variables.id == null) {
        toast.add({ title: t('permissions.toasts.presetCreated'), color: 'success' })
        return
      }

      const usersUpdated = (data as { users_updated?: number }).users_updated ?? 0
      // «Plantilla guardada» o «Plantilla guardada · se actualizaron N usuarios».
      toast.add({
        title: usersUpdated > 0
          ? t('permissions.toasts.presetSavedUsers', { count: usersUpdated }, usersUpdated)
          : t('permissions.toasts.presetSaved'),
        color: 'success',
      })
      if (!variables.body.propagate) {
        // Solo cambió la plantilla: los usuarios que la tienen no se tocaron, aunque su `custom` puede cambiar.
        await queryClient.invalidateQueries({ queryKey: ['permissions', 'profile'] })
        return
      }
      // Los usuarios abiertos en «Usuarios» con esta plantilla traen ahora otros permisos.
      await queryClient.invalidateQueries({ queryKey: ['permissions', 'profile'] })
      if (iHavePreset(variables.id)) {
        await (activeScreen.value
          ? refreshPermissions(activeScreen.value, { force: true })
          : refreshAllPermissions())
      }
    },
    onError: failure,
  })
}

export function useDeletePermissionPreset() {
  const { $api } = useNuxtApp()
  const { queryClient, success, failure } = useAdminMutationHelpers()
  return useMutation({
    mutationFn: (id: number) => $api(`${BASE}/presets/${id}/delete/`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRESETS_KEY })
      // El preset borrado deja de aparecer como «Basado en» en los perfiles abiertos.
      await queryClient.invalidateQueries({ queryKey: ['permissions', 'profile'] })
      success('permissions.toasts.presetDeleted')
    },
    onError: failure,
  })
}
