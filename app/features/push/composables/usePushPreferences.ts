import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesPayload,
} from '~/features/push/types/push.types'

export const notificationPreferencesQueryKey = ['notifications', 'preferences'] as const

/**
 * Preferencias de notificaciones del usuario: GET /api/notifications/preferences/ y
 * PATCH /api/notifications/preferences/update/ (las `keys` se mezclan con lo guardado).
 */
export function usePushPreferences(enabled: MaybeRefOrGetter<boolean> = true) {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { isLoggedIn } = useAuth()
  const toast = useToast()
  const { t } = useI18n()

  const query = useQuery({
    queryKey: notificationPreferencesQueryKey,
    queryFn: () => $api<NotificationPreferences>('/api/notifications/preferences/'),
    enabled: computed(() => isLoggedIn.value && toValue(enabled)),
  })

  const update = useMutation({
    mutationFn: (payload: UpdateNotificationPreferencesPayload) =>
      $api<NotificationPreferences>('/api/notifications/preferences/update/', {
        method: 'PATCH',
        body: payload,
      }),
    // Actualización optimista: mezcla las claves igual que el backend y regresa al valor anterior si falla.
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: notificationPreferencesQueryKey })
      const previous = queryClient.getQueryData<NotificationPreferences>(notificationPreferencesQueryKey)
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(notificationPreferencesQueryKey, {
          ...previous,
          push_enabled: payload.push_enabled ?? previous.push_enabled,
          keys: { ...previous.keys, ...payload.keys },
        })
      }
      return { previous }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(notificationPreferencesQueryKey, saved)
    },
    onError: (error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationPreferencesQueryKey, context.previous)
      }
      toast.add({
        title: t('pushSettings.errors.preferencesTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })

  const preferences = computed(() => query.data.value ?? null)

  return { ...query, preferences, update }
}
