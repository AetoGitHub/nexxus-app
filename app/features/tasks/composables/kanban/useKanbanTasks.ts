import type { MaybeRefOrGetter } from 'vue'
import type { KanbanColumn, KanbanCounts, TaskListFilters } from '~/features/tasks/types/task.types'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import { extractResults } from '~/shared/utils/paginated.util'
import { fetchTaskListNextPage } from '~/features/tasks/utils/task-infinite.util'

/**
 * Server state del Kanban (groupBy = all) vía TanStack Query.
 *
 * Rechazada: skeleton mientras cargan counts; se oculta solo si count === 0.
 */
export function useKanbanTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const api = createCompanyTasksApi(filters)
  const scope = ['kanban']

  const counts = api.countsQuery<KanbanCounts>(scope, '/kanban/counts/')
  const pending = api.listQuery([...scope, 'pending'], '/kanban/pending/')
  const wip = api.listQuery([...scope, 'wip'], '/kanban/wip/')
  const inReview = api.listQuery([...scope, 'in_review'], '/kanban/in_review/')
  const complete = api.listQuery([...scope, 'complete'], '/kanban/complete/')

  const rejectedCount = computed(() => counts.data.value?.rejected ?? 0)
  const countsReady = computed(() => counts.isFetched.value)
  const showRejected = computed(() => !countsReady.value || rejectedCount.value > 0)

  const rejected = api.listQuery([...scope, 'rejected'], '/kanban/rejected/', {
    enabled: () => countsReady.value && rejectedCount.value > 0,
  })

  const columns = computed<KanbanColumn[]>(() => {
    const totals = counts.data.value

    const allColumns: KanbanColumn[] = [
      {
        id: 'pending',
        labelKey: 'tasks.kanban.columns.pending',
        color: '#6b7280',
        count: totals?.pending,
        tasks: extractResults(pending.data.value),
        loading: pending.isPending.value,
        error: pending.isError.value,
        hasNextPage: pending.hasNextPage.value,
        isFetchingNextPage: pending.isFetchingNextPage.value,
      },
      {
        id: 'wip',
        labelKey: 'tasks.kanban.columns.wip',
        color: '#6366f1',
        count: totals?.wip,
        tasks: extractResults(wip.data.value),
        loading: wip.isPending.value,
        error: wip.isError.value,
        hasNextPage: wip.hasNextPage.value,
        isFetchingNextPage: wip.isFetchingNextPage.value,
      },
      {
        id: 'in_review',
        labelKey: 'tasks.kanban.columns.inReview',
        color: '#f97316',
        count: totals?.in_review,
        tasks: extractResults(inReview.data.value),
        loading: inReview.isPending.value,
        error: inReview.isError.value,
        hasNextPage: inReview.hasNextPage.value,
        isFetchingNextPage: inReview.isFetchingNextPage.value,
      },
      {
        id: 'rejected',
        labelKey: 'tasks.kanban.columns.rejected',
        color: '#dc2626',
        count: countsReady.value ? rejectedCount.value : undefined,
        tasks: extractResults(rejected.data.value),
        loading: !countsReady.value || rejected.isPending.value,
        error: rejected.isError.value,
        hasNextPage: rejected.hasNextPage.value,
        isFetchingNextPage: rejected.isFetchingNextPage.value,
      },
      {
        id: 'complete',
        labelKey: 'tasks.kanban.columns.complete',
        color: '#28ceab',
        count: totals?.complete,
        tasks: extractResults(complete.data.value),
        loading: complete.isPending.value,
        error: complete.isError.value,
        hasNextPage: complete.hasNextPage.value,
        isFetchingNextPage: complete.isFetchingNextPage.value,
      },
    ]

    return allColumns.filter(column => column.id !== 'rejected' || showRejected.value)
  })

  function loadMore(columnId: string | number) {
    const queries = {
      pending,
      wip,
      in_review: inReview,
      rejected,
      complete,
    } as const
    const query = queries[columnId as keyof typeof queries]
    if (query) {
      fetchTaskListNextPage(query)
    }
  }

  return { counts, pending, wip, inReview, rejected, complete, columns, loadMore }
}
