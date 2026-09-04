<script setup lang="ts">
import TaskKanbanBoard from '~/features/tasks/components/kanban/TaskKanbanBoard.vue'
import TaskCloseProcessModal from '~/features/tasks/components/form/TaskCloseProcessModal.vue'
import TaskReopenProcessModal from '~/features/tasks/components/form/TaskReopenProcessModal.vue'
import TaskReviewDecisionModal from '~/features/tasks/components/form/TaskReviewDecisionModal.vue'
import TaskStartProcessModal from '~/features/tasks/components/form/TaskStartProcessModal.vue'
import type { KanbanCreateColumn, KanbanTaskMove, TaskListFilters } from '~/features/tasks/types/task.types'

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
  create: [column: KanbanCreateColumn]
}>()

const { columns, loadMore } = useKanbanTasks(() => props.filters)
const {
  pendingTaskId,
  startProcessModalOpen,
  closeProcessModalOpen,
  closeProcessStatus,
  reviewDecisionModalOpen,
  reviewDecisionStatus,
  reopenProcessModalOpen,
  requestMove,
  onProcessSuccess,
} = useKanbanProcessMove()

function onMove(payload: KanbanTaskMove) {
  const task = columns.value
    .flatMap(column => column.tasks)
    .find(item => item.id === payload.taskId)

  if (!task) {
    return
  }

  requestMove({ ...payload, task })
}
</script>

<template>
  <TaskKanbanBoard
    class="h-full"
    :columns="columns"
    :selected-task-id="selectedTaskId"
    confirm-before-move
    :create-column-ids="['pending']"
    @select="emit('select', $event)"
    @create="emit('create', $event)"
    @move="onMove"
    @load-more="loadMore"
  />

  <TaskStartProcessModal
    v-if="pendingTaskId != null"
    v-model:open="startProcessModalOpen"
    :task-id="pendingTaskId"
    @success="onProcessSuccess"
  />

  <TaskCloseProcessModal
    v-if="pendingTaskId != null"
    v-model:open="closeProcessModalOpen"
    :task-id="pendingTaskId"
    :target-status="closeProcessStatus"
    @success="onProcessSuccess"
  />

  <TaskReviewDecisionModal
    v-if="pendingTaskId != null"
    v-model:open="reviewDecisionModalOpen"
    :task-id="pendingTaskId"
    :target-status="reviewDecisionStatus"
    @success="onProcessSuccess"
  />

  <TaskReopenProcessModal
    v-if="pendingTaskId != null"
    v-model:open="reopenProcessModalOpen"
    :task-id="pendingTaskId"
    @success="onProcessSuccess"
  />
</template>
