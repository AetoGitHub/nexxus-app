<script setup lang="ts">
import TaskKanbanBoard from '~/features/tasks/components/kanban/TaskKanbanBoard.vue'
import type { KanbanCreateColumn, TaskListFilters } from '~/features/tasks/types/task.types'
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

const { groups, sections } = useGroupTasks(() => props.filters)

const columns = computed(() => sectionsToKanbanColumns(sections.value))
</script>

<template>
  <TaskKanbanBoard
    class="h-full"
    :columns="columns"
    :selected-task-id="selectedTaskId"
    :loading="groups.isPending.value"
    :error="groups.isError.value"
    @select="emit('select', $event)"
    @create="emit('create', $event)"
  />
</template>
