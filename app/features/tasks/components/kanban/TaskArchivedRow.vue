<script setup lang="ts">
import type { Task } from '~/features/tasks/types/task.types'

const props = withDefaults(
  defineProps<{
    task: Task
    selected?: boolean
  }>(),
  {
    selected: false,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
}>()

const {
  statusMeta,
  barColor,
  projectName,
  dueLabel,
  isOverdue,
} = useTaskCardPresentation(() => props.task)

const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="group relative flex w-full items-start gap-0 rounded-lg border border-border bg-card py-2 pl-3 pr-2.5 text-left transition-[filter,border-color] hover:border-muted-foreground/50 hover:brightness-110"
    :class="selected ? 'ring-2 ring-aeto-teal/50' : ''"
    @click="emit('select', task.id)"
  >
    <span
      class="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
      :style="{ backgroundColor: barColor }"
    />

    <div class="min-w-0 flex-1 space-y-1">
      <p class="truncate text-xs font-medium text-foreground">
        {{ task.short_description }}
      </p>
      <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <UBadge
          :label="t(statusMeta.labelKey)"
          :color="statusMeta.color"
          variant="soft"
          size="sm"
          class="shrink-0"
        />
        <span
          v-if="projectName"
          class="min-w-0 truncate"
        >
          {{ projectName }}
        </span>
        <span
          v-if="dueLabel"
          class="ml-auto shrink-0 font-mono tabular-nums"
          :class="isOverdue ? 'text-error font-medium' : ''"
        >
          {{ dueLabel }}
        </span>
      </div>
    </div>
  </button>
</template>
