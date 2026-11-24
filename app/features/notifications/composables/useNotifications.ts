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
  if (filters.page_size != null) {
    query.page_size = filters.page_size
  }

  return query
}

/**
 * Listado de notificaciones vía GET /api/notifications/.
 */
export function useNotifications(
  filters: MaybeRefOrGetter<NotificationListFilters> = {},
  enabled: MaybeRefOrGetter<boolean> = true,
  /**
   * El panel de notificaciones (Configuración) muestra TODAS, también las de tipos apagados: el usuario las apagó para
   * que no le salten (aviso, sonido, push), no para perderlas. La campana sí las oculta.
   */
  options: { includeHidden?: boolean } = {},
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

  /** El backend sigue mandando las notificaciones apagadas por el usuario, con `show: false`: no se pintan (salvo `includeHidden`). */
  const notifications = computed(() => {
    const results = notificationsQuery.data.value?.results ?? []
    return options.includeHidden ? results : results.filter(notification => notification.show !== false)
  })

  const errorMessage = computed(() =>
    notificationsQuery.error.value ? parseFetchError(notificationsQuery.error.value) : '',
  )

  return { notificationsQuery, notifications, errorMessage }
}
