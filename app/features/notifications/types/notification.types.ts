export type NotificationSocketEventName =
  | 'notification_message'
  | 'new_notification'
  | 'notification_mention'

export interface NotificationSocketEvent {
  event: NotificationSocketEventName
  notification_pk: number
  /** false = el usuario apagó este tipo en su configuración: no se muestra (ni toast ni sonido). Ausente = se muestra. */
  show?: boolean
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
  /** false = el usuario apagó este tipo en su configuración. Ausente = se muestra. */
  show?: boolean
}

/** Respuesta de GET /api/notifications/counts/. */
export interface NotificationCounts {
  unread?: number
  unread_count?: number
  total?: number
  count?: number
}

export type NotificationToastKind =
  | 'mention'
  | 'assigned'
  | 'updated'
  | 'message'
  | 'token'
  | 'generic'

/** Filtros de GET /api/notifications/. */
export interface NotificationListFilters {
  read?: boolean
  key?: string
  task?: number
  page_size?: number
}

export type NotificationReadTab = 'all' | 'unread' | 'read'
