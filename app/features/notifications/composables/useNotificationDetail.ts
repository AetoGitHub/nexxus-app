import { useQueryClient } from '@tanstack/vue-query'
import type { AppNotification } from '~/features/notifications/types/notification.types'

/** Consulta bajo demanda el cuerpo de una notificación recibida por socket. */
export function useNotificationDetail() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()

  function fetchNotification(notificationId: number) {
    return queryClient.fetchQuery({
      queryKey: ['notifications', 'detail', notificationId],
      queryFn: () =>
        $api<AppNotification>(`/api/notifications/${notificationId}/`),
      staleTime: Infinity,
    })
  }

  return { fetchNotification }
}
