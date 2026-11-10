import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PermissionBlocks, UserPermissions } from '~/shared/types/auth.types'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { AuthProfile } from '~/features/auth/types/profile.types'
import type { CursorPage, PermissionBlocksPatch, PermissionPreset } from '~/features/permissions/types/permissions.types'

const BASE = '/api/auth/permissions'
const PRESETS_KEY = ['permissions', 'presets'] as const

function profileKey(id: number | null | undefined) {
  return ['permissions', 'profile', id] as const
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

/** Perfiles de la organización (todas las páginas) para elegir a quién editarle los permisos. */
export function usePermissionProfiles(organizationId: MaybeRefOrGetter<number | null | undefined>) {
  const { $api } = useNuxtApp()
  return useQuery({
    queryKey: computed(() => ['permissions', 'profiles', toValue(organizationId) ?? null]),
    queryFn: () => {
      const organization = toValue(organizationId)
      return fetchAllPages<AuthProfile>($api, '/api/auth/profiles/', organization != null ? { organization } : undefined)
    },
  })
}

/** Permisos de un perfil (misma forma que `me/`). */
export function useProfilePermissions(profileId: MaybeRefOrGetter<number | null | undefined>) {
  const { $api } = useNuxtApp()
  return useQuery({
    queryKey: computed(() => profileKey(toValue(profileId))),
    queryFn: () => $api<UserPermissions>(`${BASE}/profile/${toValue(profileId)}/`),
    enabled: computed(() => toValue(profileId) != null),
  })
}

export function usePermissionPresets() {
  const { $api } = useNuxtApp()
  return useQuery({
    queryKey: PRESETS_KEY,
    queryFn: () => fetchAllPages<PermissionPreset>($api, `${BASE}/presets/`),
  })
}

/** Toasts y refresco comunes a las mutaciones de esta pantalla. */
function useAdminMutationHelpers() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { user } = useAuth()
  const { refreshPermissions } = usePermissions()

  function success(titleKey: string) {
    toast.add({ title: t(titleKey), color: 'success' })
  }

  function failure(error: unknown) {
    toast.add({ title: t('permissions.toasts.error'), description: parseFetchError(error), color: 'error' })
  }

  /** Guarda en caché los permisos devueltos y, si son los del usuario logueado, refresca la UI. */
  async function storeProfile(data: UserPermissions) {
    queryClient.setQueryData(profileKey(data.profile), data)
    if (data.profile === user.value?.id) {
      await refreshPermissions()
    }
  }

  return { queryClient, success, failure, storeProfile }
}

export function useUpdateProfilePermissions() {
  const { $api } = useNuxtApp()
  const { success, failure, storeProfile } = useAdminMutationHelpers()
  return useMutation({
    mutationFn: (payload: { profileId: number, patch: PermissionBlocksPatch }) =>
      $api<UserPermissions>(`${BASE}/profile/${payload.profileId}/update/`, { method: 'PATCH', body: payload.patch }),
    onSuccess: async (data) => {
      await storeProfile(data)
      success('permissions.toasts.profileSaved')
    },
    onError: failure,
  })
}

export function useApplyPermissionPreset() {
  const { $api } = useNuxtApp()
  const { success, failure, storeProfile } = useAdminMutationHelpers()
  return useMutation({
    mutationFn: (payload: { profileId: number, presetId: number }) =>
      $api<UserPermissions>(`${BASE}/profile/${payload.profileId}/apply_preset/`, {
        method: 'POST',
        body: { preset: payload.presetId },
      }),
    onSuccess: async (data) => {
      await storeProfile(data)
      success('permissions.toasts.presetApplied')
    },
    onError: failure,
  })
}

export function useSavePermissionPreset() {
  const { $api } = useNuxtApp()
  const { queryClient, success, failure } = useAdminMutationHelpers()
  return useMutation({
    mutationFn: (payload: { id?: number, body: Partial<PermissionBlocks> & { name?: string } }) =>
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
