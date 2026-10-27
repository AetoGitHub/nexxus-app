<script setup lang="ts">
import type { QuickAdvanceStep } from '~/features/tasks/utils/task-quick-advance.util'

/**
 * Círculo de estado de una tarea. El anillo se va llenando con el flujo (vacío en pendiente, mitad en progreso, tres
 * cuartos en revisión, lleno con palomita al completar) y, cuando la tarea puede avanzar, es también el botón: al pasar el
 * cursor muestra el ícono del siguiente paso y el tooltip dice a qué estado la manda. Sin siguiente paso es solo el
 * indicador (no atrapa el clic: lo recibe la fila/tarjeta y abre el detalle).
 */
const props = withDefaults(
  defineProps<{
    status: string
    /** Siguiente paso del flujo; `null` si la tarea no se puede avanzar con un clic. */
    step?: QuickAdvanceStep | null
    /** Sin siguiente paso pero con aviso: el clic explica por qué no se puede (p. ej. cierre múltiple en revisión). */
    blocked?: boolean
    loading?: boolean
  }>(),
  {
    step: null,
    blocked: false,
    loading: false,
  },
)

const emit = defineEmits<{
  advance: []
}>()

const { t } = useI18n()

const RADIUS = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Fracción del anillo que lleva cada estado. */
const PROGRESS: Record<string, number> = { pending: 0, wip: 0.5, in_review: 0.75, complete: 1 }

const done = computed(() => props.status === 'complete')
const rejected = computed(() => props.status === 'rejected')
const backlog = computed(() => props.status === 'backlog')
const progress = computed(() => PROGRESS[props.status] ?? 0)
const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value))

/** El ámbar del «En revisión» es el mismo del chip de estado. */
const ringColor = computed(() => {
  if (rejected.value) {
    return 'var(--color-error, #dc2626)'
  }
  return props.status === 'in_review' ? '#f59e0b' : 'var(--aeto-teal)'
})

const statusLabel = computed(() => {
  const key = {
    backlog: 'tasks.kanban.columns.backlog',
    pending: 'tasks.kanban.columns.pending',
    wip: 'tasks.kanban.columns.wip',
    in_review: 'tasks.kanban.columns.inReview',
    rejected: 'tasks.kanban.columns.rejected',
    complete: 'tasks.kanban.columns.complete',
  }[props.status]
  return key ? t(key) : t('tasks.status.unknown')
})

/** Es botón cuando avanza la tarea o cuando avisa por qué no puede. */
const interactive = computed(() => props.step != null || props.blocked)

const tooltipText = computed(() => {
  if (props.step) {
    return t(props.step.tooltipKey)
  }
  return props.blocked ? t('tasks.quickAdvance.blockedInReview') : statusLabel.value
})

const ariaLabel = computed(() =>
  props.step || props.blocked
    ? tooltipText.value
    : t('tasks.quickAdvance.state', { status: statusLabel.value }),
)
</script>

<template>
  <UTooltip
    :text="tooltipText"
    :content="{ side: 'top' }"
    :delay-duration="250"
  >
    <component
      :is="interactive ? 'button' : 'span'"
      :type="interactive ? 'button' : undefined"
      class="task-status-circle group/circle relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      :class="step ? 'task-status-circle--action cursor-pointer' : blocked ? 'cursor-not-allowed' : ''"
      :disabled="step ? loading : undefined"
      :aria-disabled="blocked && !step ? true : undefined"
      :aria-label="ariaLabel"
      :role="interactive ? undefined : 'img'"
      @click="interactive && ($event.stopPropagation(), emit('advance'))"
    >
      <svg
        viewBox="0 0 20 20"
        class="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx="10"
          cy="10"
          :r="RADIUS"
          fill="none"
          stroke-width="2"
          class="task-status-circle__track"
          :class="backlog ? 'task-status-circle__track--dashed' : ''"
          :stroke-dasharray="backlog ? '3 3' : undefined"
        />
        <circle
          v-if="done"
          cx="10"
          cy="10"
          :r="RADIUS + 1"
          :fill="ringColor"
        />
        <circle
          v-else-if="progress > 0 || rejected"
          cx="10"
          cy="10"
          :r="RADIUS"
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
          :stroke="ringColor"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="rejected ? 0 : dashOffset"
          class="transition-[stroke-dashoffset] duration-300"
        />
      </svg>

      <UIcon
        v-if="loading"
        name="i-lucide-loader-circle"
        class="relative h-3 w-3 animate-spin text-muted-foreground"
      />
      <UIcon
        v-else-if="done"
        name="i-lucide-check"
        class="relative h-3 w-3 text-white"
      />
      <UIcon
        v-else-if="rejected"
        name="i-lucide-x"
        class="relative h-3 w-3"
        :style="{ color: ringColor }"
      />
      <UIcon
        v-if="step && !loading"
        :name="step.icon"
        class="task-status-circle__next relative h-3 w-3 opacity-0 transition-opacity group-hover/circle:opacity-100 group-focus-visible/circle:opacity-100"
      />
    </component>
  </UTooltip>
</template>

<style scoped>
.task-status-circle__track {
  stroke: color-mix(in oklab, var(--muted-foreground) 40%, transparent);
}

.task-status-circle__track--dashed {
  stroke: color-mix(in oklab, var(--muted-foreground) 55%, transparent);
}

/* Se puede mover: crece un poco y el anillo toma el acento al pasar el cursor. */
.task-status-circle--action {
  transition: transform 150ms ease;
}

.task-status-circle--action:hover:not(:disabled) {
  transform: scale(1.15);
}

.task-status-circle--action:hover .task-status-circle__track {
  stroke: var(--aeto-teal);
}

.task-status-circle--action:active:not(:disabled) {
  transform: scale(0.95);
}

.task-status-circle--action:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.task-status-circle--action:disabled {
  cursor: progress;
}

@media (prefers-reduced-motion: reduce) {
  .task-status-circle--action {
    transition: none;
  }
}
</style>
