import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { parseFetchError } from '~/shared/utils/error-message.util'

/**
 * Marca todas las notificaciones sin leer del usuario vía PATCH /api/notifications/mark_read/.
 * El backend interpreta `ids: []` como "todas las no leídas del usuario".
 */
export function useMarkAllNotificationsRead() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: () =>
      $api('/api/notifications/mark_read/', {
        method: 'PATCH',
        body: { ids: [] },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.add({
        title: t('taskSettings.notificationsPanel.markAllReadSuccessTitle'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('taskSettings.notificationsPanel.markAllReadErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
