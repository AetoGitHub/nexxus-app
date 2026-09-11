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
const { columns, archivedBar, loadMore } = useKanbanTasks(() => props.filters)

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

    <TaskSection
      v-if="archivedBar.visible"
      :title="t('tasks.kanban.columns.archived')"
      dot-color="#9ca3af"
      :count="archivedBar.count"
      :tasks="archivedBar.tasks"
      :loading="archivedBar.loading"
      :error="archivedBar.error"
      :has-next-page="archivedBar.hasNextPage"
      :is-fetching-next-page="archivedBar.isFetchingNextPage"
      :selected-task-id="selectedTaskId"
      :default-open="false"
      minimal
      show-status
      @select="emit('select', $event)"
      @load-more="loadMore('archived')"
    />
  </div>
</template>
