import { NOTIFICATION_TYPES, notificationTypeMeta } from '~/features/notifications/utils/notification-types.util'

/** Claves por las que se puede filtrar la lista de notificaciones: todas las del catálogo. */
export const NOTIFICATION_FILTER_KEYS: readonly string[] = NOTIFICATION_TYPES.map(type => type.key)

export function notificationIcon(key: string): string {
  return notificationTypeMeta(key)?.icon ?? 'i-lucide-bell'
}

export function notificationIconClass(key: string): string {
  return notificationTypeMeta(key)?.iconClass ?? ''
}

export function notificationKeyLabelPath(key: string): string {
  return notificationTypeMeta(key)
    ? `notificationTypes.labels.${key}`
    : 'taskSettings.notificationsPanel.keys.generic'
}
