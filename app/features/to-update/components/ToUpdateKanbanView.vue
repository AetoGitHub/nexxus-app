<script setup lang="ts">
import TaskKanbanBoard from '~/features/tasks/components/kanban/TaskKanbanBoard.vue'
import TaskKanbanCompleteFilter from '~/features/tasks/components/kanban/TaskKanbanCompleteFilter.vue'
import { useToUpdateKanbanMove } from '~/features/to-update/composables/useToUpdateKanbanMove'
import type { KanbanTaskMove, TaskListFilters } from '~/features/tasks/types/task.types'
import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'

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
  select: [taskId: number, sectionId: ToUpdateSectionId]
}>()

const { columns, acceptedFilter } = useToUpdateKanban(() => props.filters)
// Una tarea que exige evidencia no se autoriza al soltarla: se abre su detalle para subirla al chat.
const { requestMove } = useToUpdateKanbanMove({ onNeedsEvidence: taskId => onSelect(taskId) })

function onSelect(taskId: number) {
  const column = columns.value.find(item => item.tasks.some(task => task.id === taskId))
  const sectionId = column?.id
  if (sectionId == null) {
    return
  }
  emit('select', taskId, sectionId as ToUpdateSectionId)
}

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
    :show-create="false"
    :quick-advance="false"
    @select="onSelect"
    @move="onMove"
  >
    <template #column-header-extra="{ column }">
      <TaskKanbanCompleteFilter
        v-if="column.id === 'accepted'"
        v-model:mode="acceptedFilter.mode.value"
        v-model:range="acceptedFilter.range.value"
      />
    </template>
  </TaskKanbanBoard>
</template>
