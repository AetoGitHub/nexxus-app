<script setup lang="ts">
import { useVoiceTaskRecorder } from '~/features/tasks/composables/form/useVoiceTaskRecorder'
import type { VoiceTaskCatalogItem, VoiceTaskResponse } from '~/features/tasks/types/voice-task.types'

/**
 * Micrófono para dictar una tarea: un clic empieza a grabar y muestra una píldora con el visualizador de audio en vivo,
 * el cronómetro y un botón para detener; al detener se manda el audio a la IA, que devuelve la tarea entendida. No la
 * crea: avisa con `result` para que el formulario se rellene y la persona la confirme.
 */
const props = withDefaults(
  defineProps<{
    userId: number | null | undefined
    users: VoiceTaskCatalogItem[]
    projects: VoiceTaskCatalogItem[]
    /** Proyecto que ya está elegido en el formulario; la IA solo cambia de proyecto si nombran otro. */
    defaultProjectId?: number | null
    disabled?: boolean
    /** Solo el ícono del micrófono (el atajo junto a «Nueva tarea»); grabando muestra la píldora con el visualizador. */
    iconOnly?: boolean
    size?: 'xs' | 'sm'
    /** Grabando o procesando, la píldora ocupa todo el ancho disponible en vez de un ancho fijo. */
    fill?: boolean
    /**
     * Botón flotante del celular: círculo grande y, mientras graba, una tarjeta que además de la píldora dice qué
     * conviene dictar (en la barra de escritorio no hay espacio para esa indicación y va como tooltip).
     */
    fab?: boolean
  }>(),
  {
    defaultProjectId: null,
    disabled: false,
    iconOnly: false,
    size: 'xs',
    fill: false,
    fab: false,
  },
)

const emit = defineEmits<{
  result: [task: VoiceTaskResponse]
  /** `true` mientras graba o procesa: el contenedor puede hacerle espacio al visualizador. */
  'update:busy': [busy: boolean]
}>()

const { t } = useI18n()

const { status, elapsedSeconds, levels, hasVoice, isSupported, start, finish, cancel } = useVoiceTaskRecorder({
  onLimit: () => void stopAndSend(),
})

const isRecording = computed(() => status.value === 'recording')
const isProcessing = computed(() => status.value === 'processing')

const elapsedLabel = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = String(elapsedSeconds.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

/** Leyenda «Puedes empezar a hablar»: aparece al empezar y se va sola a los segundos o al detectar voz. */
const HINT_MS = 2800
const showHint = ref(false)
let hintTimer: ReturnType<typeof setTimeout> | undefined

const stopButton = useTemplateRef<{ $el: HTMLElement }>('stopButton')

watch(isRecording, (recording) => {
  clearTimeout(hintTimer)
  showHint.value = recording
  if (recording) {
    hintTimer = setTimeout(() => {
      showHint.value = false
    }, HINT_MS)
    // El micrófono desaparece al grabar: el foco pasa al botón de detener para quien usa teclado o lector.
    void nextTick(() => stopButton.value?.$el?.focus())
  }
})

watch(hasVoice, (detected) => {
  if (detected) {
    showHint.value = false
  }
})

watch(status, busyStatus => emit('update:busy', busyStatus !== 'idle'))

onBeforeUnmount(() => clearTimeout(hintTimer))

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

const pillHeight = computed(() => {
  if (props.fab) {
    return 'h-12'
  }
  return props.size === 'sm' ? 'h-8' : 'h-7'
})
const pillWidth = computed(() => (props.fill ? 'w-full' : 'w-60 max-w-full'))

/** Tooltip del micrófono en reposo: para qué sirve y qué conviene decir. */
const startTitle = computed(() => `${t('tasks.form.voice.start')}. ${t('tasks.form.voice.tip')}`)
</script>

<template>
  <!-- Grabando: visualizador en vivo + cronómetro + detener, como en WhatsApp. -->
  <div
    v-if="isSupported && isRecording"
    role="group"
    :aria-label="t('tasks.form.voice.recording')"
    class="voice-pill flex min-w-0 shrink"
    :class="fab
      ? 'w-full flex-col gap-2 rounded-2xl bg-elevated p-3 shadow-lg ring-1 ring-error/30'
      : ['items-center gap-2 rounded-full bg-error/10 pl-3 pr-1 ring-1 ring-error/30', pillHeight, pillWidth]"
  >
    <!-- Indicación breve de qué dictar, visible todo el tiempo que graba. -->
    <p
      v-if="fab"
      class="text-xs leading-snug text-muted"
    >
      {{ t('tasks.form.voice.tip') }}
    </p>

    <div
      class="flex min-w-0 items-center gap-2"
      :class="fab ? 'h-10 rounded-full bg-error/10 pl-3 pr-1' : 'h-full w-full'"
    >
      <span
        class="size-2 shrink-0 rounded-full bg-error motion-safe:animate-pulse"
        aria-hidden="true"
      />

      <!-- Anuncio para lectores de pantalla; lo visible es la leyenda y las barras. -->
      <span
        class="sr-only"
        aria-live="polite"
      >
        {{ showHint ? t('tasks.form.voice.recordingAnnounce') : '' }}
      </span>

      <div class="relative h-full min-w-0 flex-1 overflow-hidden">
        <Transition
          name="voice-swap"
          mode="out-in"
        >
          <p
            v-if="showHint"
            key="hint"
            class="absolute inset-0 flex items-center truncate text-xs font-medium text-error"
            aria-hidden="true"
          >
            {{ t('tasks.form.voice.hint') }}
          </p>
          <div
            v-else
            key="bars"
            class="absolute inset-0 flex items-center justify-end gap-[2px]"
            role="img"
            :aria-label="t('tasks.form.voice.meter')"
          >
            <span
              v-for="(level, index) in levels"
              :key="index"
              class="voice-bar w-[3px] shrink-0 rounded-full bg-error"
              :style="{ height: `${Math.max(12, Math.round(level * 100))}%` }"
            />
          </div>
        </Transition>
      </div>

      <span
        class="shrink-0 font-mono text-xs tabular-nums text-highlighted"
        role="timer"
        :aria-label="t('tasks.form.voice.elapsed')"
      >{{ elapsedLabel }}</span>

      <UButton
        ref="stopButton"
        type="button"
        color="error"
        variant="solid"
        size="xs"
        square
        class="shrink-0 rounded-full"
        :class="fab ? 'size-8' : 'size-6'"
        :ui="{ base: 'justify-center gap-0', leadingIcon: fab ? 'size-3.5 fill-current' : 'size-3 fill-current' }"
        icon="i-lucide-square"
        :title="t('tasks.form.voice.stop')"
        :aria-label="t('tasks.form.voice.stop')"
        @click="onClick"
      />
    </div>
  </div>

  <!-- Procesando: la IA está entendiendo el audio. -->
  <div
    v-else-if="isSupported && isProcessing"
    role="status"
    :aria-label="t('tasks.form.voice.processingStatus')"
    class="flex shrink-0 items-center gap-2 rounded-full bg-elevated px-3 text-xs font-medium text-muted ring-1 ring-default"
    :class="[pillHeight, fill ? 'w-full justify-center' : '', fab ? 'shadow-lg' : '']"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-4 shrink-0 animate-spin"
      aria-hidden="true"
    />
    <span class="truncate">{{ t('tasks.form.voice.processing') }}</span>
  </div>

  <!-- Reposo: solo el micrófono (o con la etiqueta «Dictar» dentro del formulario); en el celular, el botón flotante. -->
  <UButton
    v-else-if="isSupported"
    type="button"
    :size="fab ? 'xl' : size"
    :square="iconOnly || fab"
    :class="fab ? 'size-14 shrink-0 rounded-full p-0! shadow-lg' : (iconOnly ? 'h-8 shrink-0' : '')"
    :title="startTitle"
    color="neutral"
    :variant="fab ? 'subtle' : 'ghost'"
    icon="i-lucide-mic"
    :ui="fab ? { base: 'justify-center gap-0', leadingIcon: 'size-6 text-primary' } : undefined"
    :disabled="disabled || userId == null"
    :aria-label="t('tasks.form.voice.start')"
    @click="onClick"
  >
    <template v-if="!iconOnly && !fab">
      {{ t('tasks.form.voice.label') }}
    </template>
  </UButton>
</template>

<style scoped>
.voice-bar {
  min-height: 3px;
  transition: height 80ms linear;
}

.voice-swap-enter-active,
.voice-swap-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.voice-swap-enter-from,
.voice-swap-leave-to {
  opacity: 0;
  transform: translateY(0.25rem);
}

@media (prefers-reduced-motion: reduce) {
  .voice-bar,
  .voice-swap-enter-active,
  .voice-swap-leave-active {
    transition: none;
  }

  .voice-swap-enter-from,
  .voice-swap-leave-to {
    transform: none;
  }
}
</style>
