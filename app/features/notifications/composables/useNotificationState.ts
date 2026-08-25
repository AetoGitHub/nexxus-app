import { useQueryClient } from '@tanstack/vue-query'
import { useNotificationCounts } from '~/features/notifications/composables/useNotificationCounts'
import {
  bumpUnreadNotificationCounts,
  notificationBadgeCount,
  notificationCountsQueryKey,
} from '~/features/notifications/utils/notification-counts.util'
import type { NotificationCounts } from '~/features/notifications/types/notification.types'

/** Contador de notificaciones: el total lo da el API; el canal solo lo actualiza. */
export function useNotificationState() {
  const queryClient = useQueryClient()
  const countsQuery = useNotificationCounts()
  const processedIds = useState<number[]>('notifications-processed-ids', () => [])

  const unreadCount = computed(() =>
    notificationBadgeCount(countsQuery.data.value),
  )

  const unreadCountLabel = computed(() =>
    unreadCount.value > 99 ? '99+' : String(unreadCount.value),
  )

  function hasProcessed(notificationId: number) {
    return processedIds.value.includes(notificationId)
  }

  function markProcessed(notificationId: number) {
    if (!hasProcessed(notificationId)) {
      processedIds.value = [...processedIds.value, notificationId]
    }
  }

  function incrementUnread() {
    queryClient.setQueryData<NotificationCounts>(
      notificationCountsQueryKey,
      current => bumpUnreadNotificationCounts(current),
    )
  }

  function refreshCounts() {
    void queryClient.invalidateQueries({ queryKey: notificationCountsQueryKey })
  }

  function resetNotifications() {
    processedIds.value = []
    queryClient.removeQueries({ queryKey: notificationCountsQueryKey })
  }

  return {
    unreadCount,
    unreadCountLabel,
    hasProcessed,
    markProcessed,
    incrementUnread,
    refreshCounts,
    resetNotifications,
  }
}
