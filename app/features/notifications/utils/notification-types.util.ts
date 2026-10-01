/**
 * Catálogo único de tipos de notificación (las claves que existen en el backend). Lo usan el ícono de cada
 * notificación en la campana, el filtro por tipo y las preferencias de push (fase 2), para no mantener listas distintas.
 */
export type NotificationGroupId = 'tasks' | 'messages' | 'approval' | 'archive' | 'backlog' | 'touches'

export interface NotificationTypeMeta {
  key: string
  group: NotificationGroupId
  icon: string
  /** Clase extra del ícono (p. ej. girarlo). */
  iconClass?: string
}

export const NOTIFICATION_TYPES: readonly NotificationTypeMeta[] = [
  { key: 'task_created', group: 'tasks', icon: 'i-lucide-clipboard-check' },
  { key: 'task_updated', group: 'tasks', icon: 'i-lucide-refresh-cw' },
  { key: 'task_started', group: 'tasks', icon: 'i-lucide-play' },
  { key: 'task_sent_to_review', group: 'tasks', icon: 'i-lucide-send' },
  { key: 'task_closed', group: 'tasks', icon: 'i-lucide-circle-check' },
  { key: 'task_rejected', group: 'tasks', icon: 'i-lucide-circle-x' },
  { key: 'task_reopened', group: 'tasks', icon: 'i-lucide-rotate-ccw' },
  { key: 'task_deleted', group: 'tasks', icon: 'i-lucide-trash-2' },
  { key: 'task_undeleted', group: 'tasks', icon: 'i-lucide-undo-2' },
  { key: 'task_message', group: 'messages', icon: 'i-lucide-message-circle' },
  { key: 'close_approval_assigned', group: 'approval', icon: 'i-lucide-user-check' },
  { key: 'close_approval_approved', group: 'approval', icon: 'i-lucide-badge-check' },
  { key: 'task_archived', group: 'archive', icon: 'i-lucide-archive' },
  { key: 'task_unarchived', group: 'archive', icon: 'i-lucide-archive-restore' },
  { key: 'task_backlog_created', group: 'backlog', icon: 'i-lucide-inbox' },
  { key: 'task_backlog_completed', group: 'backlog', icon: 'i-lucide-list-checks' },
  // El dedo señalando de Lucide apunta hacia arriba: se gira para que apunte a la derecha (👉).
  { key: 'task_token_given', group: 'touches', icon: 'i-lucide-pointer', iconClass: 'rotate-90' },
]

export const NOTIFICATION_GROUPS: readonly NotificationGroupId[] = [
  'tasks',
  'messages',
  'approval',
  'archive',
  'backlog',
  'touches',
]

const TYPES_BY_KEY = new Map(NOTIFICATION_TYPES.map(type => [type.key, type]))

export function notificationTypeMeta(key: string): NotificationTypeMeta | undefined {
  return TYPES_BY_KEY.get(key)
}

export function notificationTypesByGroup(group: NotificationGroupId): NotificationTypeMeta[] {
  return NOTIFICATION_TYPES.filter(type => type.group === group)
}
