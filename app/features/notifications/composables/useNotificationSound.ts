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

/** Reproduce el sonido de notificación elegido en este cliente y persiste cuál es; si suena o no lo manda la cuenta. */
export function useNotificationSound() {
  const { configuration } = useProfileConfigurationStore()

  const selectedSoundId = useCookie<NotificationSoundId>(SOUND_COOKIE, {
    default: () => DEFAULT_NOTIFICATION_SOUND,
    sameSite: 'lax',
  })

  const resolvedSoundId = computed<NotificationSoundId>(() =>
    isNotificationSoundId(selectedSoundId.value)
      ? selectedSoundId.value
      : DEFAULT_NOTIFICATION_SOUND,
  )

  /**
   * Preferencia «Sonido al recibir una notificación» de la cuenta (`enable_notification_sound`): apagada, lo que suena solo
   * al llegar una notificación se calla; la vista previa de la lista sigue sonando. Sin dato (sesión anterior) = encendido.
   */
  const soundEnabled = computed(() => configuration.value?.enable_notification_sound !== false)

  function setNotificationSound(id: NotificationSoundId) {
    selectedSoundId.value = id
  }

  function playNotificationSound(id: NotificationSoundId = resolvedSoundId.value) {
    if (!soundEnabled.value) {
      return
    }
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
    soundEnabled,
    setNotificationSound,
    playNotificationSound,
    toggleNotificationSoundPreview,
  }
}
