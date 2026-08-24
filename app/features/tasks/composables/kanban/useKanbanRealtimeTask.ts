import { useQueryClient } from '@tanstack/vue-query'
import { CURRENT_TASKS_COMPANY_ID } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import type { KanbanCounts, Task } from '~/features/tasks/types/task.types'
import type { PaginatedResponse } from '~/shared/types/api.types'

const REALTIME_KANBAN_COLUMNS = [
  { id: 'pending', path: '/kanban/pending/' },
  { id: 'wip', path: '/kanban/wip/' },
  { id: 'in_review', path: '/kanban/in_review/' },
  { id: 'complete', path: '/kanban/complete/' },
] as const

type RealtimeKanbanColumnId = typeof REALTIME_KANBAN_COLUMNS[number]['id']

/**
 * Localiza una tarea creada en las cuatro columnas del Kanban general y la
 * inserta en la caché activa sin recargar el tablero completo.
 */
export function useKanbanRealtimeTask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()

  async function insertCreatedTask(taskPk: number): Promise<boolean> {
    const responses = await Promise.all(
      REALTIME_KANBAN_COLUMNS.map(async column => ({
        columnId: column.id,
        data: await $api<PaginatedResponse<Task>>(
          `/api/tasks/company/${CURRENT_TASKS_COMPANY_ID}${column.path}`,
          { query: { pk: taskPk } },
        ),
      })),
    )

    const match = responses.find(response => response.data.results.length > 0)
    const task = match?.data.results[0]

    if (!match || !task) {
      return false
    }

    let inserted = false

    queryClient.setQueriesData<PaginatedResponse<Task>>(
      {
        queryKey: ['tasks', CURRENT_TASKS_COMPANY_ID, 'kanban', match.columnId],
        type: 'active',
      },
      (current) => {
        if (!current || current.results.some(item => item.id === task.id)) {
          return current
        }

        inserted = true
        return {
          ...current,
          count: current.count == null ? undefined : current.count + 1,
          results: [task, ...current.results],
        }
      },
    )

    if (inserted) {
      incrementKanbanCounts(match.columnId)
    }

    return true
  }

  function incrementKanbanCounts(columnId: RealtimeKanbanColumnId) {
    queryClient.setQueriesData<KanbanCounts>(
      {
        queryKey: ['tasks', CURRENT_TASKS_COMPANY_ID, 'kanban', 'counts'],
        type: 'active',
      },
      current => current
        ? {
            ...current,
            [columnId]: current[columnId] + 1,
            total: current.total == null ? undefined : current.total + 1,
          }
        : current,
    )
  }

  return { insertCreatedTask }
}
