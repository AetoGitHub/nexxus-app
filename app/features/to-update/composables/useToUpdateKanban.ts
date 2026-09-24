import type { MaybeRefOrGetter } from 'vue'
import type { KanbanColumn, TaskListFilters } from '~/features/tasks/types/task.types'
import { sectionsToKanbanColumns } from '~/features/tasks/utils/kanban/kanban.util'
import { useKanbanCompleteDateFilter } from '~/features/tasks/composables/kanban/useKanbanCompleteDateFilter'

/**
 * Server state de Pending approval (vista Kanban).
 * Reutiliza los mismos endpoints close/* que la lista.
 */
export function useToUpdateKanban(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  /** Filtro semana/rango/todas de la columna Aceptadas, igual que Completado en el Kanban normal. */
  const acceptedFilter = useKanbanCompleteDateFilter()

  const { sections } = useToUpdateTasks(filters, acceptedFilter.query)

  const columns = computed<KanbanColumn[]>(() => sectionsToKanbanColumns(sections.value))

  return { columns, acceptedFilter }
}
