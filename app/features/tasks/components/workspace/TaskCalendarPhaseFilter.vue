<script setup lang="ts">
import type { TaskCalendarPhase } from '~/features/tasks/types/task.types'

const model = defineModel<TaskCalendarPhase>({ required: true })

withDefaults(
  defineProps<{
    /** Sin tarjeta ni alto forzado: para ir dentro de la cabecera del calendario. */
    compact?: boolean
  }>(),
  { compact: false },
)

const { t } = useI18n()

const options: { value: TaskCalendarPhase, labelKey: string }[] = [
  { value: 'start', labelKey: 'tasks.calendarPhases.start' },
  { value: 'process', labelKey: 'tasks.calendarPhases.process' },
  { value: 'close', labelKey: 'tasks.calendarPhases.close' },
]
</script>

<template>
  <div
    class="flex items-center gap-2 shrink-0"
    :class="compact ? '' : 'h-full rounded-lg border border-border bg-card px-3 py-2'"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="text-xs px-3 py-1 rounded-full border border-[0.5px] inline-flex items-center transition-colors"
      :class="model === option.value
        ? 'border-violet-600 bg-violet-600 text-white font-semibold'
        : 'border-border bg-transparent text-muted-foreground font-medium hover:text-foreground'"
      @click="model = option.value"
    >
      {{ t(option.labelKey) }}
    </button>
  </div>
</template>
