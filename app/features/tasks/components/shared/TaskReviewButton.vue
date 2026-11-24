<script setup lang="ts">
import { useTaskReview } from '~/features/tasks/composables/shared/useTaskReview'
import { useTaskReviewState } from '~/features/tasks/composables/shared/useTaskReviewState'

/**
 * Ojo "Revisada" de la ficha y del detalle: ícono de 20 px con área de toque de 40×40 px (sin crecer el alto de la
 * fila). Nunca se apaga: cada toque vuelve a marcar la tarea con la hora actual y la manda hasta el final de mis
 * listas (la última tocada queda al final). Ya revisada, el ojo va en verde. Para quitar la marca está «Quitar
 * revisada» en el detalle. Ni el clic ni el toque abren la ficha o arrastran la tarjeta (`data-no-drag`).
 */
const props = withDefaults(
  defineProps<{
    taskId: number
    /** `reviewed_at` que trae la tarea (lista, Kanban o detalle). */
    reviewedAt?: string | null
  }>(),
  {
    reviewedAt: null,
  },
)

const { t } = useI18n()
const { reviewedAtOf, timeLabelOf } = useTaskReviewState()
const { markReviewed, isPending } = useTaskReview()

const current = computed(() => reviewedAtOf(props.taskId, props.reviewedAt))
const pending = computed(() => isPending(props.taskId))

const tooltip = computed(() => current.value
  ? t('tasks.review.activeTooltip', { time: timeLabelOf(current.value) })
  : t('tasks.review.mark'),
)

function onMark() {
  if (pending.value) {
    return
  }
  void markReviewed(props.taskId, props.reviewedAt)
}
</script>

<template>
  <UTooltip :text="tooltip">
    <button
      type="button"
      draggable="false"
      data-no-drag
      class="relative inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors before:absolute before:-inset-2 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      :class="[
        current
          ? 'bg-aeto-teal/15 text-aeto-teal hover:bg-aeto-teal/25'
          : 'text-muted-foreground hover:bg-muted hover:text-aeto-teal',
        pending ? 'cursor-wait opacity-60' : '',
      ]"
      :aria-label="tooltip"
      @click.stop="onMark"
      @dblclick.stop
      @pointerdown.stop
      @mousedown.stop
      @touchstart.stop.passive
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon
        name="i-lucide-eye"
        class="size-5 shrink-0"
      />
    </button>
  </UTooltip>
</template>
