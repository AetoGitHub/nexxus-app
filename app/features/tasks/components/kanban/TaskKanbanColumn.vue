<script setup lang="ts">
import type { KanbanColumn, KanbanCreateColumn } from '~/features/tasks/types/task.types'
import TaskKanbanCard from '~/features/tasks/components/kanban/TaskKanbanCard.vue'
import TaskSectionBadgeFallback from '~/features/tasks/components/shared/TaskSectionBadgeFallback.vue'

const props = withDefaults(
  defineProps<{
    column: KanbanColumn
    selectedTaskId?: number | null
    draggingTaskId?: number | null
    dropTargetId?: string | number | null
    showCreate?: boolean
  }>(),
  {
    selectedTaskId: null,
    draggingTaskId: null,
    dropTargetId: null,
    showCreate: true,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  create: [column: KanbanCreateColumn]
  dragStart: [payload: { taskId: number, columnId: string | number }]
  dragEnd: []
  dragOverColumn: [columnId: string | number]
  dropTask: [payload: { taskId: number, fromColumnId: string | number, toColumnId: string | number }]
}>()

const { t } = useI18n()

const canDrop = computed(() => !props.column.loading && !props.column.error)
const isDropTarget = computed(() => props.dropTargetId === props.column.id)

function onDragOver(event: DragEvent) {
  if (!canDrop.value) {
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  emit('dragOverColumn', props.column.id)
}

function onDrop(event: DragEvent) {
  if (!canDrop.value) {
    return
  }
  event.preventDefault()

  const taskId = Number(event.dataTransfer?.getData('application/x-nexxus-task'))
  const fromColumnIdRaw = event.dataTransfer?.getData('application/x-nexxus-from-column')
  if (!Number.isFinite(taskId) || fromColumnIdRaw == null || fromColumnIdRaw === '') {
    return
  }

  const fromColumnId = Number.isNaN(Number(fromColumnIdRaw))
    ? fromColumnIdRaw
    : Number(fromColumnIdRaw)

  emit('dropTask', {
    taskId,
    fromColumnId,
    toColumnId: props.column.id,
  })
}
</script>

<template>
  <section class="flex h-full min-h-0 w-[min(280px,78vw)] sm:w-[280px] shrink-0 flex-col">
    <header class="flex items-center gap-2 mb-3 px-1 shrink-0">
      <UBadge
        v-if="column.count !== undefined"
        :label="column.count.toString()"
        size="md"
        class="text-white ring-0 shrink-0"
        :style="{ backgroundColor: column.color }"
      />
      <TaskSectionBadgeFallback v-else />
      <h3 class="text-sm font-semibold text-foreground flex-1 min-w-0 truncate">
        {{ column.title ?? (column.labelKey ? t(column.labelKey) : '') }}
      </h3>
    </header>

    <div
      class="flex flex-1 min-h-0 flex-col rounded-xl bg-kanban-column transition-colors"
      :class="isDropTarget
        ? 'ring-2 ring-aeto-teal/40'
        : ''"
      @dragover="onDragOver"
      @drop="onDrop"
    >
      <div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        <div v-if="column.loading" class="space-y-2">
          <USkeleton v-for="n in 3" :key="n" class="h-20 w-full rounded-lg" />
        </div>

        <p v-else-if="column.error" class="px-2 py-6 text-center text-sm text-error">
          {{ t('tasks.loadError') }}
        </p>

        <div
          v-else-if="column.comingSoon && !column.tasks.length"
          class="px-2 py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          <UIcon name="i-lucide-construction" class="h-6 w-6" />
          <p class="text-sm text-center">{{ t('tasks.comingSoon') }}</p>
          <p class="text-xs text-center">{{ t('tasks.kanban.dropHint') }}</p>
        </div>

        <p
          v-else-if="!column.tasks.length"
          class="px-2 py-6 text-center text-sm text-muted-foreground"
        >
          {{ isDropTarget ? t('tasks.kanban.dropHere') : t('tasks.empty') }}
        </p>

        <TransitionGroup
          v-else
          name="kanban-task"
          tag="div"
          class="space-y-2"
        >
          <TaskKanbanCard
            v-for="task in column.tasks"
            :key="task.id"
            :task="task"
            :column-id="column.id"
            :selected="selectedTaskId === task.id"
            :dragging="draggingTaskId === task.id"
            @select="emit('select', $event)"
            @drag-start="emit('dragStart', $event)"
            @drag-end="emit('dragEnd')"
          />
        </TransitionGroup>
      </div>

      <div
        v-if="showCreate && !column.loading && !column.error"
        class="shrink-0 border-t border-black/5 p-1.5 dark:border-white/5"
      >
        <UButton
          icon="i-lucide-plus"
          :label="t('tasks.kanban.createTask')"
          color="neutral"
          variant="ghost"
          block
          size="sm"
          class="justify-start text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
          @click="emit('create', { id: column.id, title: column.title })"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.kanban-task-enter-active {
  transition:
    opacity 320ms ease-out,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.kanban-task-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}

.kanban-task-move {
  transition: transform 250ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .kanban-task-enter-active,
  .kanban-task-move {
    transition: none;
  }
}
</style>
