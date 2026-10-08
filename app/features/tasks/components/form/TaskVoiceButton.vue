<script setup lang="ts">
import { useVoiceTaskRecorder } from '~/features/tasks/composables/form/useVoiceTaskRecorder'
import type { VoiceTaskCatalogItem, VoiceTaskResponse } from '~/features/tasks/types/voice-task.types'

/**
 * Micrófono para dictar una tarea: un clic empieza a grabar, otro termina y manda el audio a la IA, que devuelve la
 * tarea entendida. No la crea: avisa con `result` para que el formulario se rellene y la persona la confirme.
 */
const props = withDefaults(
  defineProps<{
    userId: number | null | undefined
    users: VoiceTaskCatalogItem[]
    projects: VoiceTaskCatalogItem[]
    /** Proyecto que ya está elegido en el formulario; la IA solo cambia de proyecto si nombran otro. */
    defaultProjectId?: number | null
    disabled?: boolean
    /** Solo el ícono del micrófono (el atajo junto a «Nueva tarea»); grabando muestra además el cronómetro. */
    iconOnly?: boolean
    size?: 'xs' | 'sm'
  }>(),
  {
    defaultProjectId: null,
    disabled: false,
    iconOnly: false,
    size: 'xs',
  },
)

const emit = defineEmits<{
  result: [task: VoiceTaskResponse]
}>()

const { t } = useI18n()

const { status, elapsedSeconds, isSupported, start, finish, cancel } = useVoiceTaskRecorder({
  onLimit: () => void stopAndSend(),
})

const isRecording = computed(() => status.value === 'recording')
const isProcessing = computed(() => status.value === 'processing')

const elapsedLabel = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = String(elapsedSeconds.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

async function stopAndSend() {
  if (props.userId == null) {
    cancel()
    return
  }

  const task = await finish({
    userId: props.userId,
    users: props.users,
    projects: props.projects,
    defaultProjectId: props.defaultProjectId,
  })
  if (task) {
    emit('result', task)
  }
}

async function onClick() {
  if (isRecording.value) {
    await stopAndSend()
    return
  }
  await start()
}

// Si el formulario se bloquea o se cierra a media grabación, se descarta.
watch(() => props.disabled, (disabled) => {
  if (disabled && isRecording.value) {
    cancel()
  }
})
</script>

<template>
  <UButton
    v-if="isSupported"
    type="button"
    :size="size"
    :square="iconOnly && !isRecording"
    :class="iconOnly ? 'h-8 shrink-0' : ''"
    :title="isRecording ? t('tasks.form.voice.stop') : t('tasks.form.voice.start')"
    :color="isRecording ? 'error' : 'neutral'"
    :variant="isRecording ? 'soft' : 'ghost'"
    :icon="isRecording ? 'i-lucide-square' : 'i-lucide-mic'"
    :loading="isProcessing"
    :disabled="disabled || isProcessing || userId == null"
    :aria-label="isRecording ? t('tasks.form.voice.stop') : t('tasks.form.voice.start')"
    :aria-pressed="isRecording"
    @click="onClick"
  >
    <template v-if="isRecording">
      <span class="inline-flex items-center gap-1.5">
        <span class="size-1.5 animate-pulse rounded-full bg-error" />
        <span class="font-mono tabular-nums">{{ elapsedLabel }}</span>
        {{ t('tasks.form.voice.stopLabel') }}
      </span>
    </template>
    <template v-else-if="isProcessing">
      <template v-if="!iconOnly">
        {{ t('tasks.form.voice.processing') }}
      </template>
    </template>
    <template v-else-if="!iconOnly">
      {{ t('tasks.form.voice.label') }}
    </template>
  </UButton>
</template>
