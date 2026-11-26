import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { UserPermissions } from '~/shared/types/auth.types'
import type { PermissionBlocksPatch, PresetApp } from '~/features/permissions/types/permissions.types'
import { fetchAllPages } from '~/features/permissions/composables/usePermissionsAdmin'

const BASE = '/api/auth/permissions'
const PRESETS_APP_KEY = ['permissions', 'presets-app'] as const

/** Body de crear/editar: al editar todo es opcional y solo se manda lo que cambió. */
export type PresetAppBody = Pick<PermissionBlocksPatch, 'task' | 'settings'> & {
  name?: string
  company?: number
  /** Solo al editar: las banderas que cambiaron también se aplican a los usuarios que ya tienen este preset. */
  propagate?: boolean
}

/** Estado HTTP de un error de `$api` (403 = sin permiso, 400 = validación). */
export function fetchErrorStatus(error: unknown): number | undefined {
  const err = error as { statusCode?: number, status?: number } | null
  return err?.statusCode ?? err?.status
}

/** Mensaje de validación de un campo en un 400 de DRF (`{ name: ["..."] }`), o null. */
export function fieldError(error: unknown, field: string): string | null {
  if (fetchErrorStatus(error) !== 400) {
    return null
  }
  const value = (error as { data?: Record<string, unknown> }).data?.[field]
  const message = Array.isArray(value) ? value[0] : value
  return typeof message === 'string' ? message : null
}

/** Presets App visibles (las de compañías donde tengo membresía, o todas si soy superuser). Filtros opcionales. */
export function usePresetsApp(filters: MaybeRefOrGetter<{ company?: number | null, profile?: number | null }> = {}) {
  const { $api } = useNuxtApp()
  const query = computed(() => {
    const { company, profile } = toValue(filters)
    return {
      ...(company != null ? { company } : {}),
      ...(profile != null ? { profile } : {}),
    }
  })
  return useQuery({
    queryKey: computed(() => [...PRESETS_APP_KEY, query.value]),
    queryFn: () => fetchAllPages<PresetApp>($api, `${BASE}/presets_app/`, query.value),
    // Un 403 no se reintenta: significa que ya no tiene el permiso.
    retry: (count, error) => fetchErrorStatus(error) !== 403 && count < 2,
  })
}

/** Toast de error y, en un 403, se refrescan los permisos para que la sección/acción se oculte. */
function usePresetAppFailure() {
  const toast = useToast()
  const { t } = useI18n()
  const { refreshAllPermissions } = usePermissions()
  return (error: unknown) => {
    toast.add({ title: t('permissions.toasts.error'), description: parseFetchError(error), color: 'error' })
    if (fetchErrorStatus(error) === 403) {
      void refreshAllPermissions()
    }
  }
}

export function useSavePresetApp() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const failure = usePresetAppFailure()
  const { user, selectedCompanyId } = useAuth()
  const { refreshAllPermissions } = usePermissions()

  return useMutation({
    mutationFn: (payload: { id?: number, body: PresetAppBody }) =>
      payload.id != null
        ? $api<PresetApp & { users_updated?: number }>(`${BASE}/presets_app/${payload.id}/update/`, {
            method: 'PATCH',
            body: payload.body,
          })
        : $api<PresetApp>(`${BASE}/presets_app/create/`, { method: 'POST', body: payload.body }),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: PRESETS_APP_KEY })
      if (variables.id == null) {
        toast.add({ title: t('permissions.toasts.presetAppCreated'), color: 'success' })
        return
      }
      const usersUpdated = (data as { users_updated?: number }).users_updated ?? 0
      toast.add({
        title: variables.body.propagate
          ? t('permissions.toasts.presetAppSavedUsers', { count: usersUpdated }, usersUpdated)
          : t('permissions.toasts.presetAppSaved'),
        color: 'success',
      })
      if (variables.body.propagate && usersUpdated > 0) {
        // Los perfiles abiertos en «Usuarios» y, si me tocó a mí en mi compañía, mis propios menús y botones.
        await queryClient.invalidateQueries({ queryKey: ['permissions', 'profile'] })
        if (user.value?.id != null && data.company === selectedCompanyId.value) {
          await refreshAllPermissions()
        }
      }
    },
    onError: failure,
  })
}

export function useDeletePresetApp() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const failure = usePresetAppFailure()
  return useMutation({
    mutationFn: (id: number) => $api(`${BASE}/presets_app/${id}/delete/`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRESETS_APP_KEY })
      await queryClient.invalidateQueries({ queryKey: ['permissions', 'profile'] })
      toast.add({ title: t('permissions.toasts.presetAppDeleted'), color: 'success' })
    },
    onError: failure,
  })
}

/**
 * Aplica un Preset App a un usuario (solo copia `task` y `settings`) o lo desliga con `presetAppId: null` (el usuario
 * conserva sus permisos actuales). `companyId` debe ser la compañía del preset.
 */
export function useApplyPresetApp() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const failure = usePresetAppFailure()
  const { user, selectedCompanyId } = useAuth()
  const { refreshAllPermissions } = usePermissions()
  return useMutation({
    mutationFn: (payload: { profileId: number, companyId: number, presetAppId: number | null }) =>
      $api<UserPermissions>(
        `${BASE}/profile/${payload.profileId}/company/${payload.companyId}/apply_preset_app/`,
        { method: 'POST', body: { preset_app: payload.presetAppId } },
      ),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(['permissions', 'profile', data.profile, variables.companyId], data)
      toast.add({
        title: variables.presetAppId == null
          ? t('permissions.toasts.presetAppRemoved')
          : t('permissions.toasts.presetAppApplied'),
        color: 'success',
      })
      if (data.profile === user.value?.id && variables.companyId === selectedCompanyId.value) {
        await refreshAllPermissions()
      }
    },
    onError: failure,
  })
}
