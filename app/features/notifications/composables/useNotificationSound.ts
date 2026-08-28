import {
  DEFAULT_NOTIFICATION_SOUND,
  isNotificationSoundId,
  type NotificationSoundId,
} from '~/features/notifications/types/notification-sound.types'
import {
  NOTIFICATION_SOUNDS,
  notificationSoundSrc,
} from '~/features/notifications/utils/notification-sound.util'

const SOUND_COOKIE = 'notification_sound'

let currentAudio: HTMLAudioElement | null = null
const playingSoundId = ref<NotificationSoundId | null>(null)

function stopNotificationAudio() {
  if (!currentAudio) {
    playingSoundId.value = null
    return
  }

  currentAudio.pause()
  currentAudio = null
  playingSoundId.value = null
}

function playAudio(id: NotificationSoundId) {
  if (!import.meta.client) {
    return
  }

  stopNotificationAudio()

  const audio = new Audio(notificationSoundSrc(id))
  audio.volume = 0.55
  currentAudio = audio
  playingSoundId.value = id

  audio.addEventListener('ended', () => {
    if (currentAudio === audio) {
      currentAudio = null
      playingSoundId.value = null
    }
  })

  void audio.play().catch(() => {
    if (currentAudio === audio) {
      stopNotificationAudio()
    }
  })
}

/** Reproduce y persiste el sonido de notificación elegido en este cliente. */
export function useNotificationSound() {
  const selectedSoundId = useCookie<NotificationSoundId>(SOUND_COOKIE, {
    default: () => DEFAULT_NOTIFICATION_SOUND,
    sameSite: 'lax',
  })

  const resolvedSoundId = computed<NotificationSoundId>(() =>
    isNotificationSoundId(selectedSoundId.value)
      ? selectedSoundId.value
      : DEFAULT_NOTIFICATION_SOUND,
  )

  function setNotificationSound(id: NotificationSoundId) {
    selectedSoundId.value = id
  }

  function playNotificationSound(id: NotificationSoundId = resolvedSoundId.value) {
    playAudio(id)
  }

  function toggleNotificationSoundPreview(id: NotificationSoundId) {
    if (playingSoundId.value === id) {
      stopNotificationAudio()
      return
    }
    playAudio(id)
  }

  return {
    sounds: NOTIFICATION_SOUNDS,
    selectedSoundId: resolvedSoundId,
    playingSoundId,
    setNotificationSound,
    playNotificationSound,
    toggleNotificationSoundPreview,
  }
}
