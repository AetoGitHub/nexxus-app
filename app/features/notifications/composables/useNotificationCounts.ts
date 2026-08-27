import { useQuery } from '@tanstack/vue-query'
import type { NotificationCounts } from '~/features/notifications/types/notification.types'
import { notificationCountsQueryKey } from '~/features/notifications/utils/notification-counts.util'

/** Total de notificaciones del usuario vía GET /api/notifications/counts/. */
export function useNotificationCounts() {
  const { $api } = useNuxtApp()
  const { isLoggedIn } = useAuth()

  const query = useQuery({
    queryKey: notificationCountsQueryKey,
    queryFn: () => $api<NotificationCounts>('/api/notifications/counts/'),
    enabled: computed(() => isLoggedIn.value),
  })

  const errorMessage = computed(() =>
    query.error.value ? parseFetchError(query.error.value) : '',
  )

  return { ...query, errorMessage }
}
