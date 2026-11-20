<script setup lang="ts">
import { useTaskReviewState } from '~/features/tasks/composables/shared/useTaskReviewState'

/**
 * Indicador "Revisada" para la fila de metadatos (junto a los chips de la ficha). No se dibuja si la tarea no está
 * revisada o la marca ya venció. En la ficha es compacto: "✓ 10:35" (y "Revisada · 10:35" desde 1280 px).
 * `full` (detalle) muestra el texto completo: "Revisada a las 10:35 — vuelve a su lugar a las 10:35 de mañana".
 */
const props = withDefaults(
  defineProps<{
    taskId: number
    reviewedAt?: string | null
    full?: boolean
  }>(),
  {
    reviewedAt: null,
    full: false,
  },
)

const { t } = useI18n()
const { reviewedAtOf, timeLabelOf } = useTaskReviewState()

const current = computed(() => reviewedAtOf(props.taskId, props.reviewedAt))
const time = computed(() => (current.value ? timeLabelOf(current.value) : ''))
const fullText = computed(() => t('tasks.review.tooltip', { time: time.value }))
</script>

<template>
  <template v-if="current">
    <p
      v-if="full"
      class="inline-flex items-center gap-1.5 text-xs text-aeto-teal"
    >
      <UIcon
        name="i-lucide-check-check"
        class="size-3.5 shrink-0"
      />
      {{ fullText }}
    </p>
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
