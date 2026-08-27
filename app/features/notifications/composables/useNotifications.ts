import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type {
  AppNotification,
  NotificationListFilters,
} from '~/features/notifications/types/notification.types'
import { notificationListQueryKey } from '~/features/notifications/utils/notification-counts.util'
import { parseFetchError } from '~/shared/utils/error-message.util'

function toQueryParams(filters: NotificationListFilters) {
  const query: Record<string, boolean | string | number> = {}

  if (filters.read !== undefined) {
    query.read = filters.read
  }
  if (filters.key) {
    query.key = filters.key
  }
  if (filters.task != null) {
    query.task = filters.task
  }

  return query
}

/**
 * Listado de notificaciones vía GET /api/notifications/.
 */
export function useNotifications(
  filters: MaybeRefOrGetter<NotificationListFilters> = {},
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()
  const resolvedFilters = computed(() => toValue(filters))

  const notificationsQuery = useQuery({
    queryKey: computed(() => [...notificationListQueryKey, resolvedFilters.value]),
    queryFn: () =>
      $api<PaginatedResponse<AppNotification>>('/api/notifications/', {
        query: toQueryParams(resolvedFilters.value),
      }),
    enabled: computed(() => toValue(enabled)),
  })

  const notifications = computed(() => notificationsQuery.data.value?.results ?? [])

  const errorMessage = computed(() =>
    notificationsQuery.error.value ? parseFetchError(notificationsQuery.error.value) : '',
  )

  return { notificationsQuery, notifications, errorMessage }
}
