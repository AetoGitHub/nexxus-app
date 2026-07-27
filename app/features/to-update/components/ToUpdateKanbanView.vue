<script setup lang="ts">
import TaskAuthorizeCloseModal from '~/features/tasks/components/form/TaskAuthorizeCloseModal.vue'
import TaskKanbanBoard from '~/features/tasks/components/kanban/TaskKanbanBoard.vue'
import { useToUpdateKanbanMove } from '~/features/to-update/composables/useToUpdateKanbanMove'
import type { KanbanTaskMove, TaskListFilters } from '~/features/tasks/types/task.types'

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
}>()

const { columns } = useToUpdateKanban(() => props.filters)
const {
  pendingApprovalId,
  authorizeModalOpen,
  requestMove,
  onAuthorizeSuccess,
} = useToUpdateKanbanMove()

function onMove(payload: KanbanTaskMove) {
  if (authorizeModalOpen.value) {
    return
  }

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
    @select="emit('select', $event)"
    @move="onMove"
  />

  <TaskAuthorizeCloseModal
    v-if="pendingApprovalId != null"
    v-model:open="authorizeModalOpen"
    :approval-id="pendingApprovalId"
    @success="onAuthorizeSuccess"
  />
</template>
