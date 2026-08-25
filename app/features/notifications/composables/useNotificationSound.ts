/** Gestos que el navegador acepta para habilitar audio (política de autoplay). */
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

const PEAK_GAIN = 0.08
const FIRST_TONE_HZ = 880
const SECOND_TONE_HZ = 1318.5

let audioContext: AudioContext | null = null
let unlockBound = false

function resolveAudioContext(): AudioContext | null {
  if (!import.meta.client) {
    return null
  }
  if (audioContext) {
    return audioContext
  }

  const AudioContextCtor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) {
    return null
  }

  audioContext = new AudioContextCtor()
  return audioContext
}

/** Sin interacción previa el contexto queda suspendido y el tono no suena. */
function bindUnlock() {
  if (!import.meta.client || unlockBound) {
    return
  }
  unlockBound = true

  const unlock = () => {
    void resolveAudioContext()?.resume()
    for (const eventName of UNLOCK_EVENTS) {
      window.removeEventListener(eventName, unlock)
    }
  }

  for (const eventName of UNLOCK_EVENTS) {
    window.addEventListener(eventName, unlock, { passive: true })
  }
}

function playTone(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startAt)

  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(gain).connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

/** Tono corto de dos notas para acompañar el toast de notificación. */
export function useNotificationSound() {
  onMounted(bindUnlock)

  function playNotificationSound() {
    const context = resolveAudioContext()
    if (!context) {
      return
    }

    if (context.state === 'suspended') {
      void context.resume()
    }

    const startAt = context.currentTime + 0.01
    playTone(context, FIRST_TONE_HZ, startAt, 0.18)
    playTone(context, SECOND_TONE_HZ, startAt + 0.12, 0.22)
  }

  return { playNotificationSound }
}
