import type { NotificationSoundId } from '~/features/notifications/types/notification-sound.types'
import chimeSrc from '~/assets/audio/soundshelfstudio-ui-app-notification-524745.mp3'
import popSrc from '~/assets/audio/soundshelfstudio-ui-error-pop-515668.mp3'
import toneSrc from '~/assets/audio/47313572-ui-sound-270349.mp3'

export interface NotificationSoundOption {
  id: NotificationSoundId
  src: string
  labelKey: string
}

export const NOTIFICATION_SOUNDS: NotificationSoundOption[] = [
  {
    id: 'chime',
    src: chimeSrc,
    labelKey: 'taskSettings.general.notificationSound.options.chime',
  },
  {
    id: 'pop',
    src: popSrc,
    labelKey: 'taskSettings.general.notificationSound.options.pop',
  },
  {
    id: 'tone',
    src: toneSrc,
    labelKey: 'taskSettings.general.notificationSound.options.tone',
  },
]

export function notificationSoundSrc(id: NotificationSoundId): string {
  return NOTIFICATION_SOUNDS.find(sound => sound.id === id)?.src ?? chimeSrc
}
