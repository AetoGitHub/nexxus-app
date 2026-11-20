<script setup lang="ts">
import { useTaskReview } from '~/features/tasks/composables/shared/useTaskReview'
import { useTaskReviewState } from '~/features/tasks/composables/shared/useTaskReviewState'

/**
 * Acción rápida "Revisada" de la fila de acciones de una ficha: ícono de 20 px con área de toque de 40×40 px
 * (sin crecer el alto de la fila). Sin marca: ojo → la tarea va al final de mis listas. Con marca: check relleno →
 * la quita y la tarea vuelve a su lugar. Siempre visible (no depende de hover). Ni el clic ni el toque abren la
 * ficha o arrastran la tarjeta (`data-no-drag`, ver `TaskKanbanCard`). La hora vive en el tooltip y en `TaskReviewChip`.
 */
const props = withDefaults(
  defineProps<{
    taskId: number
    /** `reviewed_at` que trae la tarea (lista, Kanban o detalle). */
    reviewedAt?: string | null
    /** Detalle: el botón también lleva texto ("Revisada" / "Quitar revisada"). */
    labeled?: boolean
  }>(),
  {
    reviewedAt: null,
    labeled: false,
  },
)

const { t } = useI18n()
const { reviewedAtOf, timeLabelOf } = useTaskReviewState()
const { toggleReview, isPending } = useTaskReview()

const current = computed(() => reviewedAtOf(props.taskId, props.reviewedAt))
const pending = computed(() => isPending(props.taskId))

const tooltip = computed(() => current.value
  ? `${t('tasks.review.tooltip', { time: timeLabelOf(current.value) })}. ${t('tasks.review.unmarkHint')}`
  : t('tasks.review.mark'),
)

function onToggle() {
  if (pending.value) {
    return
  }
  void toggleReview(props.taskId, props.reviewedAt)
}
</script>

<template>
  <UTooltip :text="tooltip">
    <button
      type="button"
      draggable="false"
      data-no-drag
      class="relative inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-md text-xs transition-colors before:absolute before:-inset-2 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      :class="[
        labeled ? 'w-6 sm:w-auto sm:px-2' : 'w-6',
        current
          ? 'bg-aeto-teal/15 font-medium text-aeto-teal hover:bg-aeto-teal/25'
          : 'text-muted-foreground hover:bg-muted hover:text-aeto-teal',
        pending ? 'cursor-wait opacity-60' : '',
      ]"
      :aria-pressed="current != null"
      :aria-label="current ? t('tasks.review.unmark') : t('tasks.review.mark')"
      @click.stop="onToggle"
      @dblclick.stop
      @pointerdown.stop
      @mousedown.stop
      @touchstart.stop.passive
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon
        :name="current ? 'i-lucide-check-check' : 'i-lucide-eye'"
        class="size-5 shrink-0"
      />
      <span
        v-if="labeled"
        class="max-sm:hidden"
      >{{ current ? t('tasks.review.unmark') : t('tasks.review.label') }}</span>
    </button>
  </UTooltip>
</template>
