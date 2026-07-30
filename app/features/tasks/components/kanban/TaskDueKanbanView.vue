<script setup lang="ts">
import TaskKanbanBoard from '~/features/tasks/components/kanban/TaskKanbanBoard.vue'
import TaskDueMoveConfirmModal from '~/features/tasks/components/form/TaskDueMoveConfirmModal.vue'
import TaskDueMoveDateModal from '~/features/tasks/components/form/TaskDueMoveDateModal.vue'
import type { KanbanTaskMove, TaskListFilters } from '~/features/tasks/types/task.types'
import { sectionsToKanbanColumns } from '~/features/tasks/utils/kanban/kanban.util'

const props = withDefaults(
  defineProps<{
    filters: TaskListFilters
    selectedTaskId?: number | null
  }>(),
  {
    selectedTaskId: null,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  create: [columnId: string | number]
}>()

const { sections } = useOverdueTasks(() => props.filters)
const columns = computed(() => sectionsToKanbanColumns(sections.value))

const {
  pendingTaskId,
  confirmModalOpen,
  confirmColumnId,
  confirmLimitDateInput,
  dateModalOpen,
  dateColumnId,
  dateMin,
  dateMax,
  requestMove,
  onMoveSuccess,
} = useKanbanDueMove()

function onMove(payload: KanbanTaskMove) {
  requestMove(payload)
}
</script>

<template>
  <TaskKanbanBoard
    class="h-full"
    :columns="columns"
    :selected-task-id="selectedTaskId"
    confirm-before-move
    @select="emit('select', $event)"
    @create="emit('create', $event)"
    @move="onMove"
  />

  <TaskDueMoveConfirmModal
    v-if="pendingTaskId != null"
    v-model:open="confirmModalOpen"
    :task-id="pendingTaskId"
    :column-id="confirmColumnId"
    :limit-date-input="confirmLimitDateInput"
    @success="onMoveSuccess"
  />

  <TaskDueMoveDateModal
    v-if="pendingTaskId != null"
    v-model:open="dateModalOpen"
    :task-id="pendingTaskId"
    :column-id="dateColumnId"
    :min-date="dateMin"
    :max-date="dateMax"
    @success="onMoveSuccess"
  />
</template>
