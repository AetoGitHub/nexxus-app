<script setup lang="ts">
import type { KanbanColumn, KanbanTaskMove } from '~/features/tasks/types/task.types'
import TaskKanbanColumn from '~/features/tasks/components/kanban/TaskKanbanColumn.vue'

const props = withDefaults(
  defineProps<{
    columns: KanbanColumn[]
    selectedTaskId?: number | null
    loading?: boolean
    error?: boolean
    /**
     * true: no mueve en cliente; emite `move` para abrir modal (All/Due/Project).
     * false: move local cosmético (otras vistas).
     */
    confirmBeforeMove?: boolean
  }>(),
  {
    selectedTaskId: null,
    loading: false,
    error: false,
    confirmBeforeMove: false,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  /** Drop entre columnas; en All/Due/Project dispara el flujo de confirmación. */
  move: [payload: KanbanTaskMove]
}>()

const { t } = useI18n()
const { localColumns, moveTask } = useKanbanBoardState(() => props.columns)

const draggingTaskId = ref<number | null>(null)
const dropTargetId = ref<string | number | null>(null)

function onDragStart(payload: { taskId: number, columnId: string | number }) {
  draggingTaskId.value = payload.taskId
}

function onDragEnd() {
  draggingTaskId.value = null
  dropTargetId.value = null
}

function onDragOverColumn(columnId: string | number) {
  dropTargetId.value = columnId
}

function onDropTask(payload: KanbanTaskMove) {
  draggingTaskId.value = null
  dropTargetId.value = null

  if (props.confirmBeforeMove) {
    if (payload.fromColumnId === payload.toColumnId) {
      return
    }
    emit('move', payload)
    return
  }

  const moved = moveTask(payload)
  if (moved) {
    emit('move', payload)
  }
}
</script>

<template>
  <!--
    Tablero fijo a la altura del viewport disponible:
    scroll X en el board, scroll Y independiente por columna.
  -->
  <div class="h-full min-h-0 overflow-x-auto overflow-y-hidden">
    <div v-if="loading && !localColumns.length" class="flex h-full items-stretch gap-4">
      <USkeleton v-for="n in 3" :key="n" class="h-full w-72 shrink-0 rounded-xl" />
    </div>

    <p v-else-if="error" class="px-2 py-6 text-sm text-error">
      {{ t('tasks.loadError') }}
    </p>

    <p v-else-if="!localColumns.length" class="px-2 py-6 text-sm text-muted-foreground">
      {{ t('tasks.empty') }}
    </p>

    <div v-else class="flex h-full min-h-0 items-stretch gap-4 min-w-max">
      <TaskKanbanColumn
        v-for="column in localColumns"
        :key="column.id"
        :column="column"
        :selected-task-id="selectedTaskId"
        :dragging-task-id="draggingTaskId"
        :drop-target-id="dropTargetId"
        @select="emit('select', $event)"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @drag-over-column="onDragOverColumn"
        @drop-task="onDropTask"
      />
    </div>
  </div>
</template>
