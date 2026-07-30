<script setup lang="ts">
import TaskKanbanBoard from '~/features/tasks/components/kanban/TaskKanbanBoard.vue'
import TaskProjectMoveConfirmModal from '~/features/tasks/components/form/TaskProjectMoveConfirmModal.vue'
import type { KanbanCreateColumn, KanbanTaskMove, TaskListFilters } from '~/features/tasks/types/task.types'
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
  create: [column: KanbanCreateColumn]
}>()

const { projects, sections } = useProjectTasks(() => props.filters)
const columns = computed(() => sectionsToKanbanColumns(sections.value))

const {
  pendingTaskId,
  confirmModalOpen,
  targetProjectId,
  fromProjectName,
  toProjectName,
  requestMove,
  onMoveSuccess,
} = useKanbanProjectMove()

function columnTitle(columnId: string | number): string {
  const column = columns.value.find(item => item.id === columnId)
  return column?.title?.trim() || String(columnId)
}

function onMove(payload: KanbanTaskMove) {
  requestMove({
    ...payload,
    fromProjectName: columnTitle(payload.fromColumnId),
    toProjectName: columnTitle(payload.toColumnId),
  })
}
</script>

<template>
  <TaskKanbanBoard
    class="h-full"
    :columns="columns"
    :selected-task-id="selectedTaskId"
    :loading="projects.isPending.value"
    :error="projects.isError.value"
    confirm-before-move
    @select="emit('select', $event)"
    @create="emit('create', $event)"
    @move="onMove"
  />

  <TaskProjectMoveConfirmModal
    v-if="pendingTaskId != null && targetProjectId != null"
    v-model:open="confirmModalOpen"
    :task-id="pendingTaskId"
    :project-id="targetProjectId"
    :from-project-name="fromProjectName"
    :to-project-name="toProjectName"
    @success="onMoveSuccess"
  />
</template>
