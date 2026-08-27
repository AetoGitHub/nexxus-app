export type NotificationSocketEventName =
  | 'notification_message'
  | 'new_notification'

export interface NotificationSocketEvent {
  event: NotificationSocketEventName
  notification_pk: number
}

export interface AppNotification {
  id: number
  task: number | null
  key: string
  message: string
  created_by: number | null
  read: boolean
  read_at: string | null
  created_at: string
}

/** Respuesta de GET /api/notifications/counts/. */
export interface NotificationCounts {
  unread?: number
  unread_count?: number
  total?: number
  count?: number
}

export type NotificationToastKind =
  | 'assigned'
  | 'updated'
  | 'message'
  | 'generic'

/** Filtros de GET /api/notifications/. */
export interface NotificationListFilters {
  read?: boolean
  key?: string
  task?: number
}

export type NotificationReadTab = 'all' | 'unread' | 'read'
