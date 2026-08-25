import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { parseFetchError } from '~/shared/utils/error-message.util'
import {
  notificationCountsQueryKey,
  notificationListQueryKey,
} from '~/features/notifications/utils/notification-counts.util'

/**
 * Marca una notificación como leída vía PATCH /api/notifications/:id/mark_read/.
 */
export function useMarkNotificationRead() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (notificationId: number) =>
      $api(`/api/notifications/${notificationId}/mark_read/`, {
        method: 'PATCH',
      }),
    onSuccess: async (_data, notificationId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationListQueryKey }),
        queryClient.invalidateQueries({ queryKey: notificationCountsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['notifications', 'detail', notificationId] }),
      ])
    },
    onError: (error) => {
      toast.add({
        title: t('taskSettings.notificationsPanel.markReadErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
