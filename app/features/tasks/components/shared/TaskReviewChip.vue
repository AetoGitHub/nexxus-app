<script setup lang="ts">
import { useTaskReview } from '~/features/tasks/composables/shared/useTaskReview'
import { useTaskReviewState } from '~/features/tasks/composables/shared/useTaskReviewState'

/**
 * Indicador "Revisada" para la fila de metadatos (junto a los chips de la ficha). No se dibuja si la tarea no está
 * revisada. En la ficha es compacto: "✓ 10:35" (y "Revisada · 10:35" desde 1280 px).
 * `full` (detalle) muestra el texto completo ("Revisada a las 10:35") y el botón «Quitar revisada», que es la única
 * forma de quitar la marca (el ojo de la ficha solo vuelve a marcarla). La marca no vence.
 */
const props = withDefaults(
  defineProps<{
    taskId: number
    reviewedAt?: string | null
    full?: boolean
    /** Ficha (Kanban / lista): el chip es un botón con ✕ que quita la marca. Backlog, archivadas y calendario no. */
    removable?: boolean
  }>(),
  {
    reviewedAt: null,
    full: false,
    removable: false,
  },
)

const { t } = useI18n()
const { reviewedAtOf, timeLabelOf } = useTaskReviewState()
const { unmarkReviewed, isPending } = useTaskReview()

const current = computed(() => reviewedAtOf(props.taskId, props.reviewedAt))
const time = computed(() => (current.value ? timeLabelOf(current.value) : ''))
const fullText = computed(() => t('tasks.review.tooltip', { time: time.value }))

function onUnmark() {
  if (isPending(props.taskId)) {
    return
  }
  void unmarkReviewed(props.taskId)
}
</script>

<template>
  <template v-if="current">
    <div
      v-if="full"
      class="flex items-center justify-between gap-3"
    >
      <p class="inline-flex min-w-0 items-center gap-1.5 text-xs text-aeto-teal">
        <UIcon
          name="i-lucide-check-check"
          class="size-3.5 shrink-0"
        />
        {{ fullText }}
      </p>
      <UButton
        :label="t('tasks.review.unmark')"
        icon="i-lucide-eye-off"
        color="neutral"
        variant="outline"
        size="xs"
        class="shrink-0"
        :loading="isPending(taskId)"
        @click="onUnmark"
      />
    </div>
    <!-- En la ficha: el chip también quita la marca (✕). Ni el clic ni el toque abren la ficha o la arrastran. -->
    <UTooltip
      v-else-if="removable"
      :text="t('tasks.review.removeTooltip', { time })"
    >
      <button
        type="button"
        draggable="false"
        data-no-drag
        class="group/review relative inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-aeto-teal/15 pl-1.5 pr-1 text-[11px] font-medium tabular-nums text-aeto-teal ring-1 ring-inset ring-aeto-teal/30 transition-colors before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-[''] hover:bg-error/10 hover:text-error hover:ring-error/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        :class="isPending(taskId) ? 'cursor-wait opacity-60' : ''"
        :aria-label="t('tasks.review.removeTooltip', { time })"
        @click.stop="onUnmark"
        @dblclick.stop
        @pointerdown.stop
        @mousedown.stop
        @touchstart.stop.passive
        @keydown.enter.stop
        @keydown.space.stop
      >
        <UIcon
          name="i-lucide-check-check"
          class="size-3 shrink-0"
        />
        <span class="hidden xl:inline">{{ t('tasks.review.label') }} ·</span>
        {{ time }}
        <UIcon
          name="i-lucide-x"
          class="size-3 shrink-0 opacity-60 group-hover/review:opacity-100"
        />
      </button>
    </UTooltip>
    <UTooltip
      v-else
      :text="fullText"
    >
      <span
        class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-aeto-teal/15 px-1.5 text-[11px] font-medium tabular-nums text-aeto-teal ring-1 ring-inset ring-aeto-teal/30"
        :aria-label="fullText"
      >
        <UIcon
          name="i-lucide-check-check"
          class="size-3 shrink-0"
        />
        <span class="hidden xl:inline">{{ t('tasks.review.label') }} ·</span>
        {{ time }}
      </span>
    </UTooltip>
  </template>
</template>
