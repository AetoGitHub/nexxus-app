<script setup lang="ts">
import TaskAssigneeAvatars from '~/features/tasks/components/shared/TaskAssigneeAvatars.vue'
import type { Task } from '~/features/tasks/types/task.types'

const props = withDefaults(
  defineProps<{
    task: Task
    columnId: string | number
    selected?: boolean
    dragging?: boolean
  }>(),
  {
    selected: false,
    dragging: false,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  dragStart: [payload: { taskId: number, columnId: string | number }]
  dragEnd: []
}>()

const { t } = useI18n()
const {
  typeMeta,
  priorityMeta,
  barColor,
  // requiresAttention, // oculto de momento: genera confusión
  closeApprovalsProgress,
  assignees,
  isOverdue,
  dueLabel,
} = useTaskCardPresentation(() => props.task)

const didDrag = ref(false)

function onSelect() {
  if (didDrag.value) {
    didDrag.value = false
    return
  }
  emit('select', props.task.id)
}

function onDragStart(event: DragEvent) {
  didDrag.value = true
  if (!event.dataTransfer) {
    return
  }
  event.dataTransfer.setData('application/x-nexxus-task', String(props.task.id))
  event.dataTransfer.setData('application/x-nexxus-from-column', String(props.columnId))
  event.dataTransfer.effectAllowed = 'move'
  emit('dragStart', { taskId: props.task.id, columnId: props.columnId })
}

function onDragEnd() {
  emit('dragEnd')
}
</script>

<template>
  <div
    draggable="true"
    class="cursor-grab active:cursor-grabbing"
    :class="dragging ? 'opacity-40' : ''"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <button
      type="button"
      class="relative w-full text-left rounded-lg border border-border bg-card p-3 shadow-sm hover:border-muted-foreground/50 hover:brightness-110 transition-[filter,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 space-y-2"
      :class="selected ? 'ring-2 ring-aeto-teal/50' : ''"
      :style="{ borderLeft: `3px solid ${barColor}` }"
      @click="onSelect"
    >
      <p class="text-sm font-medium text-foreground leading-snug line-clamp-2">
        {{ task.short_description }}
      </p>

      <div class="flex flex-wrap items-center gap-1.5">
        <UBadge
          :icon="typeMeta.icon"
          :label="t(typeMeta.labelKey)"
          :color="typeMeta.color"
          variant="soft"
          size="sm"
        />
        <UBadge
          v-if="priorityMeta"
          :label="t(priorityMeta.labelKey)"
          :color="priorityMeta.color"
          variant="soft"
          size="sm"
        />
        <UBadge
          v-if="closeApprovalsProgress"
          :label="`${closeApprovalsProgress.closed}/${closeApprovalsProgress.total}`"
          color="warning"
          variant="soft"
          size="sm"
          :aria-label="t('tasks.toUpdate.closeApprovalsProgress', {
            closed: closeApprovalsProgress.closed,
            total: closeApprovalsProgress.total,
          })"
        />
        <!-- Oculto de momento: genera confusión
        <UBadge
          v-if="requiresAttention"
          icon="i-lucide-triangle-alert"
          :label="t('tasks.requiresAttention')"
          color="error"
          variant="soft"
          size="sm"
        />
        -->
      </div>

      <div
        v-if="assignees.length || dueLabel"
        class="flex items-center justify-between gap-2 pt-1"
      >
        <TaskAssigneeAvatars :assignees="assignees" />
        <span
          v-if="dueLabel"
          class="text-[11px] font-mono tabular-nums ml-auto"
          :class="isOverdue ? 'text-error font-medium' : 'text-muted-foreground'"
        >
          {{ dueLabel }}
        </span>
      </div>
    </button>
  </div>
</template>
