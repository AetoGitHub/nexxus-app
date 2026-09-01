export const NOTIFICATION_SOUND_IDS = ['chime', 'pop', 'tone'] as const

export type NotificationSoundId = (typeof NOTIFICATION_SOUND_IDS)[number]

export const DEFAULT_NOTIFICATION_SOUND: NotificationSoundId = 'chime'

export function isNotificationSoundId(value: unknown): value is NotificationSoundId {
  return typeof value === 'string'
    && (NOTIFICATION_SOUND_IDS as readonly string[]).includes(value)
}
