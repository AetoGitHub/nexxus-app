import type { NotificationCounts } from '~/features/notifications/types/notification.types'

export const notificationCountsQueryKey = ['notifications', 'counts'] as const
export const notificationListQueryKey = ['notifications', 'list'] as const

export function notificationBadgeCount(
  counts?: NotificationCounts | null,
): number {
  if (!counts) {
    return 0
  }

  return counts.unread
    ?? counts.unread_count
    ?? counts.total
    ?? counts.count
    ?? 0
}

export function bumpUnreadNotificationCounts(
  current: NotificationCounts | undefined,
): NotificationCounts {
  if (!current) {
    return { unread: 1 }
  }

  const next: NotificationCounts = { ...current }
  let bumped = false

  if (typeof next.unread === 'number') {
    next.unread += 1
    bumped = true
  }
  if (typeof next.unread_count === 'number') {
    next.unread_count += 1
    bumped = true
  }
  if (typeof next.total === 'number') {
    next.total += 1
    bumped = true
  }
  if (typeof next.count === 'number') {
    next.count += 1
    bumped = true
  }

  if (!bumped) {
    next.unread = 1
  }

  return next
}
