import type {
  VoiceRecorderStatus,
  VoiceTaskRequestContext,
  VoiceTaskResponse,
} from '~/features/tasks/types/voice-task.types'
import { VOICE_TIME_ZONE, formatMexicoNow, normalizeVoiceTask } from '~/features/tasks/utils/form/voice-task.util'

/** Tope de una grabación: el audio es para dictar una tarea, no una reunión. */
const MAX_RECORDING_SECONDS = 90

/** Menos que esto casi seguro fue un toque accidental: no vale la pena mandarlo a la IA. */
const MIN_RECORDING_MS = 800

/** Formatos que acepta el webhook (webm, m4a, mp3, wav, ogg), del preferido al último recurso. */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

function fileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) {
    return 'm4a'
  }
  if (mimeType.includes('ogg')) {
    return 'ogg'
  }
  return 'webm'
}

/**
 * Graba la voz del usuario con el micrófono y se la manda al webhook de voz de n8n (`nexxus-voz`), que devuelve la
 * tarea ya entendida (nombre, responsable, fecha...). No usa `$api`: el webhook es de otro servidor y solo acepta el
 * header `Content-Type`, así que no puede llevar el token ni `Accept-Language`.
 */
export function useVoiceTaskRecorder(options: { onLimit?: () => void } = {}) {
  const { public: { n8nVoiceUrl } } = useRuntimeConfig()
  const toast = useToast()
  const { t } = useI18n()

  const status = ref<VoiceRecorderStatus>('idle')
  const elapsedSeconds = ref(0)

  const isSupported = computed(() =>
    import.meta.client
    && typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined',
  )

  let stream: MediaStream | null = null
  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let startedAt = 0
  let timer: ReturnType<typeof setInterval> | undefined

  function releaseMicrophone() {
    clearInterval(timer)
    timer = undefined
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    recorder = null
    chunks = []
  }

  function notifyError(description: string) {
    toast.add({
      title: t('tasks.form.voice.errorTitle'),
      description,
      color: 'error',
    })
  }

  async function start(): Promise<boolean> {
    if (status.value !== 'idle' || !isSupported.value) {
      return false
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    }
    catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      notifyError(name === 'NotFoundError' || name === 'OverconstrainedError'
        ? t('tasks.form.voice.noMicrophone')
        : t('tasks.form.voice.permissionDenied'))
      return false
    }

    const mimeType = MIME_CANDIDATES.find(candidate => MediaRecorder.isTypeSupported(candidate))
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    chunks = []
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    })

    recorder.start()
    startedAt = Date.now()
    elapsedSeconds.value = 0
    status.value = 'recording'

    timer = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000)
      if (elapsedSeconds.value >= MAX_RECORDING_SECONDS) {
        options.onLimit?.()
      }
    }, 500)

    return true
  }

  /** Detiene la grabación y devuelve el audio, o `null` si no hay nada que mandar. */
  function stopRecording(): Promise<Blob | null> {
    const active = recorder
    if (!active || active.state === 'inactive') {
      return Promise.resolve(null)
    }

    const tooShort = Date.now() - startedAt < MIN_RECORDING_MS

    return new Promise((resolve) => {
      active.addEventListener('stop', () => {
        const blob = chunks.length ? new Blob(chunks, { type: active.mimeType || 'audio/webm' }) : null
        releaseMicrophone()
        resolve(tooShort ? null : blob)
      }, { once: true })
      active.stop()
    })
  }

  async function send(blob: Blob, context: VoiceTaskRequestContext): Promise<VoiceTaskResponse | null> {
    const body = new FormData()
    body.append('audio', blob, `voz.${fileExtension(blob.type)}`)
    body.append('user_id', String(context.userId))
    // Hora local de México con su desfase, no UTC: «hoy» y «el viernes» dependen de la fecha local.
    body.append('now', formatMexicoNow())
    body.append('timezone', VOICE_TIME_ZONE)
    body.append('users', JSON.stringify(context.users))
    body.append('projects', JSON.stringify(context.projects))
    if (context.defaultProjectId != null) {
      body.append('default_project_id', String(context.defaultProjectId))
    }

    const response = await $fetch<unknown>(n8nVoiceUrl as string, {
      method: 'POST',
      body,
      timeout: 60_000,
    })

    return normalizeVoiceTask(response)
  }

  /** Termina de grabar, manda el audio a la IA y devuelve la tarea entendida (`null` si no se pudo). */
  async function finish(context: VoiceTaskRequestContext): Promise<VoiceTaskResponse | null> {
    if (status.value !== 'recording') {
      return null
    }

    const blob = await stopRecording()
    if (!blob) {
      status.value = 'idle'
      notifyError(t('tasks.form.voice.tooShort'))
      return null
    }

    status.value = 'processing'
    try {
      const task = await send(blob, context)
      if (!task) {
        notifyError(t('tasks.form.voice.notUnderstood'))
      }
      return task
    }
    catch (error) {
      notifyError(parseFetchError(error) || t('tasks.form.voice.requestFailed'))
      return null
    }
    finally {
      status.value = 'idle'
    }
  }

  /** Descarta la grabación en curso (cerrar el formulario, desmontar el botón). */
  function cancel() {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    releaseMicrophone()
    status.value = 'idle'
  }

  onBeforeUnmount(cancel)

  return { status, elapsedSeconds, isSupported, start, finish, cancel }
}
