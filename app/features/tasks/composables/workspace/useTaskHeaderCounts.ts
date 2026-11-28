import type { MaybeRefOrGetter } from 'vue'
import type { KanbanCounts, TaskListFilters } from '~/features/tasks/types/task.types'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'

/**
 * Resumen del encabezado de Mis tareas (maqueta UX-04): «24 activas · 7 vencidas».
 * Usa `/kanban/counts/` con los mismos filtros (y modo admin / grupo / proyecto) que la vista:
 * - activas = pendiente + en progreso + en revisión + rechazada (sin backlog ni completadas);
 * - vencidas = las mismas con `overdue=true` (límite antes de hoy y sin completar).
 */
export function useTaskHeaderCounts(
  filters: MaybeRefOrGetter<TaskListFilters>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {},
) {
  const api = createCompanyTasksApi(filters)
  const scope = ['header']

  const allCounts = api.countsQuery<KanbanCounts>(scope, '/kanban/counts/', { enabled: options.enabled })
  const overdueCounts = api.countsQuery<KanbanCounts>([...scope, 'overdue'], '/kanban/counts/', {
    enabled: options.enabled,
    extraQuery: { overdue: 'true' },
  })

  function activeOf(counts: KanbanCounts | undefined): number | null {
    if (!counts) {
      return null
    }
    return counts.pending + counts.wip + counts.in_review + counts.rejected
  }

  const active = computed(() => activeOf(allCounts.data.value))
  const overdue = computed(() => activeOf(overdueCounts.data.value))

  return { active, overdue }
}
