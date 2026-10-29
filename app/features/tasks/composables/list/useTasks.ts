import type { MaybeRefOrGetter } from 'vue'
import type { ArchivedCounts, TaskCounts, TaskListFilters, TaskSectionKey } from '~/features/tasks/types/task.types'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import { useBacklogMine } from '~/features/tasks/composables/shared/useBacklogMine'
import { fetchTaskListNextPage } from '~/features/tasks/utils/task-infinite.util'

/**
 * Server state del módulo de tareas (vista Lista) vía TanStack Query.
 */
export function useTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const api = createCompanyTasksApi(filters)

  const counts = api.countsQuery<TaskCounts>([], '/counts/')
  // «Asignadas a mí» solo afecta al backlog (lista y contador).
  const { extraQuery: backlogMineQuery } = useBacklogMine()
  const backlogCounts = api.countsQuery<ArchivedCounts>(['backlog'], '/backlog/counts/', { extraQuery: backlogMineQuery })
  const backlog = api.listQuery(['backlog'], '/backlog/', { extraQuery: backlogMineQuery })
  const urgent = api.listQuery(['urgent'], '/urgent/')
  const today = api.listQuery(['today'], '/due_today/')
  const upcoming = api.listQuery(['upcoming'], '/upcoming/')

  function loadMore(sectionId: TaskSectionKey) {
    const queries = { backlog, urgent, today, upcoming } as const
    fetchTaskListNextPage(queries[sectionId])
  }

  return { counts, backlogCounts, backlog, urgent, today, upcoming, loadMore }
}
