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
    mutationFn: (payload: { profileId: number, companyId: number, presetId: number }) =>
      $api<UserPermissions>(profilePath(payload.profileId, payload.companyId, 'apply_preset/'), {
        method: 'POST',
        body: { preset: payload.presetId },
      }),
    onSuccess: async (data, variables) => {
      await storeProfile(data, variables.companyId)
      success('permissions.toasts.presetApplied')
    },
    onError: failure,
  })
}

export function useSavePermissionPreset() {
  const { $api } = useNuxtApp()
  const { queryClient, success, failure } = useAdminMutationHelpers()
  return useMutation({
    mutationFn: (payload: { id?: number, body: Partial<PermissionBlocks> & { name?: string, company?: number | null } }) =>
      payload.id != null
        ? $api<PermissionPreset>(`${BASE}/presets/${payload.id}/update/`, { method: 'PATCH', body: payload.body })
        : $api<PermissionPreset>(`${BASE}/presets/create/`, { method: 'POST', body: payload.body }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: PRESETS_KEY })
      success(variables.id != null ? 'permissions.toasts.presetUpdated' : 'permissions.toasts.presetCreated')
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
