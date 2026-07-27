<script setup lang="ts">
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
const { requestMove, isPending } = useToUpdateKanbanMove()

async function onMove(payload: KanbanTaskMove) {
  if (isPending.value) {
    return
  }

  const task = columns.value
    .flatMap(column => column.tasks)
    .find(item => item.id === payload.taskId)

  if (!task) {
    return
  }

  await requestMove({ ...payload, task })
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
</template>
