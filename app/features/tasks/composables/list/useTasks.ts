import type { MaybeRefOrGetter } from 'vue'
import type { ArchivedCounts, TaskCounts, TaskListFilters, TaskSectionKey } from '~/features/tasks/types/task.types'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import { fetchTaskListNextPage } from '~/features/tasks/utils/task-infinite.util'

/**
 * Server state del módulo de tareas (vista Lista) vía TanStack Query.
 */
export function useTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const api = createCompanyTasksApi(filters)

  const counts = api.countsQuery<TaskCounts>([], '/counts/')
  const urgent = api.listQuery(['urgent'], '/urgent/')
  const today = api.listQuery(['today'], '/due_today/')
  const upcoming = api.listQuery(['upcoming'], '/upcoming/')

  const archivedCounts = api.countsQuery<ArchivedCounts>(['archived'], '/archived/counts/')
  const archived = api.listQuery(['archived'], '/archived/')

  function loadMore(sectionId: TaskSectionKey) {
    const queries = { urgent, today, upcoming, archived } as const
    fetchTaskListNextPage(queries[sectionId])
  }

  return { counts, urgent, today, upcoming, archivedCounts, archived, loadMore }
}
