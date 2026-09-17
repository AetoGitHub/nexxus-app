import type { MaybeRefOrGetter } from 'vue'
import type { ArchivedCounts, TaskListFilters } from '~/features/tasks/types/task.types'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import { extractResults } from '~/shared/utils/paginated.util'
import { fetchTaskListNextPage } from '~/features/tasks/utils/task-infinite.util'

/** Server state de la vista independiente de tareas archivadas. */
export function useArchivedTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const api = createCompanyTasksApi(filters)

  const counts = api.countsQuery<ArchivedCounts>(['archived'], '/archived/counts/')
  const archived = api.listQuery(['archived'], '/archived/')
  const tasks = computed(() => extractResults(archived.data.value))

  function loadMore() {
    fetchTaskListNextPage(archived)
  }

  return { counts, archived, tasks, loadMore }
}
