<script setup lang="ts">
import TaskSection from '~/features/tasks/components/list/TaskSection.vue'
import { useKanbanTasks } from '~/features/tasks/composables/kanban/useKanbanTasks'
import type { KanbanCreateColumn, TaskListFilters } from '~/features/tasks/types/task.types'

/**
 * Lista de tareas agrupada por estado (Backlog/Pendiente/En progreso/En
 * revisión/Rechazada/Completado), en el mismo orden y datos que el Kanban
 * (groupBy = all) — reutiliza `useKanbanTasks` en vez de duplicar el fetch.
 */
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

const { t } = useI18n()
const { columns, loadMore } = useKanbanTasks(() => props.filters)

/** Solo Pendiente permite crear, igual que en el tablero Kanban. */
function canCreate(columnId: string | number): boolean {
  return columnId === 'pending'
}
</script>

<template>
  <div class="space-y-6">
    <TaskSection
      v-for="column in columns"
      :key="column.id"
      :title="column.labelKey ? t(column.labelKey) : (column.title ?? '')"
      :dot-color="column.color"
      :count="column.count"
      :tasks="column.tasks"
      :loading="column.loading"
      :error="column.error"
      :has-next-page="column.hasNextPage"
      :is-fetching-next-page="column.isFetchingNextPage"
      :selected-task-id="selectedTaskId"
      :default-open="column.id !== 'backlog'"
      show-status
      :show-create="canCreate(column.id)"
      @select="emit('select', $event)"
      @create="emit('create', { id: column.id, title: column.labelKey ? t(column.labelKey) : column.title })"
      @load-more="loadMore(column.id)"
    />
  </div>
</template>
