export const NOTIFICATION_FILTER_KEYS = [
  'task_created',
  'task_started',
  'task_message',
] as const

export type NotificationFilterKey = (typeof NOTIFICATION_FILTER_KEYS)[number]

const ICONS: Record<string, string> = {
  task_created: 'i-lucide-clipboard-check',
  task_started: 'i-lucide-play',
  task_message: 'i-lucide-message-circle',
}

export function notificationIcon(key: string): string {
  return ICONS[key] ?? 'i-lucide-bell'
}

export function notificationKeyLabelPath(key: string): string {
  if (NOTIFICATION_FILTER_KEYS.includes(key as NotificationFilterKey)) {
    return `taskSettings.notificationsPanel.keys.${key}`
  }
  return 'taskSettings.notificationsPanel.keys.generic'
}
