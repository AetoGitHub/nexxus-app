import { FetchError } from 'ofetch'
import { useQueryClient } from '@tanstack/vue-query'
import { useNotificationDetail } from '~/features/notifications/composables/useNotificationDetail'
import { useNotificationState } from '~/features/notifications/composables/useNotificationState'
import { notificationListQueryKey } from '~/features/notifications/utils/notification-counts.util'
import type {
  AppNotification,
  NotificationSocketEvent,
  NotificationToastKind,
} from '~/features/notifications/types/notification.types'
import { useWsTicket } from '~/shared/composables/useWsTicket'
import { useWsBaseUrl } from '~/shared/utils/api'

const pendingNotificationIds = new Set<number>()

function isNotificationSocketEvent(value: unknown): value is NotificationSocketEvent {
  if (typeof value !== 'object' || value == null) {
    return false
  }

  const event = value as Partial<NotificationSocketEvent>
  return (event.event === 'notification_message' || event.event === 'new_notification')
    && typeof event.notification_pk === 'number'
    && Number.isInteger(event.notification_pk)
    && event.notification_pk > 0
}

function resolveToastKind(
  notification: AppNotification,
  socketEvent: NotificationSocketEvent,
): NotificationToastKind {
  const key = notification.key.trim().toLowerCase()

  if (key.includes('message')) {
    return 'message'
  }
  if (key.includes('assign') || key.includes('created')) {
    return 'assigned'
  }
  if (key.includes('updated') || key.includes('update')) {
    return 'updated'
  }
  return socketEvent.event === 'notification_message' ? 'message' : 'generic'
}

/**
 * Canal global de notificaciones. Cada frame consulta su detalle, actualiza
 * el conteo del API y muestra un toast traducido según `notification.key`.
 */
export function useNotificationsSocket() {
  const wsBaseUrl = useWsBaseUrl()
  const { requestTicket } = useWsTicket()
  const { isLoggedIn } = useAuth()
  const queryClient = useQueryClient()
  const { fetchNotification } = useNotificationDetail()
  const {
    hasProcessed,
    markProcessed,
    incrementUnread,
    refreshCounts,
    resetNotifications,
  } = useNotificationState()
  const toast = useToast()
  const { t } = useI18n()

  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let stableTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let ticketAuthRetryUsed = false
  let generation = 0
  let disposed = false

  function clearTimers() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (stableTimer) {
      clearTimeout(stableTimer)
      stableTimer = null
    }
  }

  function closeCurrentSocket() {
    generation += 1
    clearTimers()

    if (
      socket
      && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close(1000)
    }
    socket = null
  }

  function scheduleReconnect(immediate = false) {
    if (disposed || !isLoggedIn.value) {
      return
    }

    reconnectAttempt += 1
    const baseDelay = immediate
      ? 0
      : Math.min(1000 * 2 ** (reconnectAttempt - 1), 30_000)
    const delay = immediate
      ? 0
      : Math.round(baseDelay * (0.75 + Math.random() * 0.5))

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, delay)
  }

  function showNotificationToast(
    notification: AppNotification,
    socketEvent: NotificationSocketEvent,
  ) {
    const kind = resolveToastKind(notification, socketEvent)
    const meta = {
      assigned: {
        title: 'notifications.assigned.title',
        description: 'notifications.assigned.description',
        icon: 'i-lucide-clipboard-check',
      },
      updated: {
        title: 'notifications.updated.title',
        description: 'notifications.updated.description',
        icon: 'i-lucide-refresh-cw',
      },
      message: {
        title: 'notifications.message.title',
        description: 'notifications.message.description',
        icon: 'i-lucide-message-circle',
      },
      generic: {
        title: 'notifications.generic.title',
        description: 'notifications.generic.description',
        icon: 'i-lucide-bell',
      },
    }[kind]

    toast.add({
      title: t(meta.title),
      description: notification.message.trim() || t(meta.description),
      icon: meta.icon,
      color: 'primary',
    })
  }

  async function handleNotification(socketEvent: NotificationSocketEvent) {
    const notificationId = socketEvent.notification_pk
    if (hasProcessed(notificationId) || pendingNotificationIds.has(notificationId)) {
      return
    }

    pendingNotificationIds.add(notificationId)
    try {
      const notification = await fetchNotification(notificationId)
      if (disposed || hasProcessed(notification.id)) {
        return
      }

      markProcessed(notification.id)
      if (!notification.read) {
        incrementUnread()
      }
      void queryClient.invalidateQueries({ queryKey: notificationListQueryKey })
      showNotificationToast(notification, socketEvent)
    }
    catch {
      // Un detalle fallido no debe romper el canal ni mostrar datos incompletos.
    }
    finally {
      pendingNotificationIds.delete(notificationId)
    }
  }

  async function connect() {
    const currentGeneration = ++generation

    let ticket: string
    try {
      ticket = (await requestTicket()).ticket
    }
    catch (error) {
      if (disposed || currentGeneration !== generation) {
        return
      }
      if (error instanceof FetchError && error.status === 401) {
        return
      }
      scheduleReconnect()
      return
    }

    if (disposed || currentGeneration !== generation) {
      return
    }

    const nextSocket = new WebSocket(
      `${wsBaseUrl}/ws/notifications/?ticket=${encodeURIComponent(ticket)}`,
    )
    socket = nextSocket

    nextSocket.onopen = () => {
      if (disposed || currentGeneration !== generation) {
        nextSocket.close(1000)
        return
      }

      refreshCounts()
      stableTimer = setTimeout(() => {
        reconnectAttempt = 0
        ticketAuthRetryUsed = false
        stableTimer = null
      }, 5000)
    }

    nextSocket.onmessage = (message) => {
      let event: unknown
      try {
        event = JSON.parse(String(message.data))
      }
      catch {
        return
      }

      if (isNotificationSocketEvent(event)) {
        void handleNotification(event)
      }
    }

    nextSocket.onclose = (event) => {
      if (socket === nextSocket) {
        socket = null
      }
      if (disposed || currentGeneration !== generation) {
        return
      }

      if (stableTimer) {
        clearTimeout(stableTimer)
        stableTimer = null
      }

      if (event.code === 1000 || event.code === 4403) {
        return
      }

      if (event.code === 4401) {
        if (ticketAuthRetryUsed) {
          return
        }
        ticketAuthRetryUsed = true
        scheduleReconnect(true)
        return
      }

      scheduleReconnect()
    }

    nextSocket.onerror = () => {
      // `onclose` centraliza la política de reconexión.
    }
  }

  watch(isLoggedIn, (loggedIn) => {
    if (!import.meta.client) {
      return
    }

    closeCurrentSocket()
    reconnectAttempt = 0
    ticketAuthRetryUsed = false

    if (loggedIn) {
      void connect()
      return
    }

    resetNotifications()
    pendingNotificationIds.clear()
  }, { immediate: true })

  onScopeDispose(() => {
    disposed = true
    closeCurrentSocket()
  })
}
