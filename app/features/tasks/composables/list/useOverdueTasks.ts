import type { MaybeRefOrGetter } from 'vue'
import type { OverdueCounts, TaskBoardSection, TaskListFilters } from '~/features/tasks/types/task.types'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import { extractResults } from '~/shared/utils/paginated.util'
import { fetchTaskListNextPage } from '~/features/tasks/utils/task-infinite.util'

const OVERDUE_SECTIONS = [
  { id: 'today', path: '/overdue/today/', labelKey: 'tasks.overdueSections.today', color: '#dc2626', countKey: 'today' as const },
  { id: 'tomorrow', path: '/overdue/tomorrow/', labelKey: 'tasks.overdueSections.tomorrow', color: '#f97316', countKey: 'tomorrow' as const },
  { id: 'week', path: '/overdue/week/', labelKey: 'tasks.overdueSections.week', color: '#6366f1', countKey: 'week' as const },
  { id: 'month', path: '/overdue/month/', labelKey: 'tasks.overdueSections.month', color: '#8b5cf6', countKey: 'month' as const },
  { id: 'no_date', path: '/overdue/no_date/', labelKey: 'tasks.overdueSections.noDate', color: '#6b7280', countKey: 'no_date' as const },
] as const

/**
 * Server state de tareas agrupadas por vencimiento vía TanStack Query.
 */
export function useOverdueTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const api = createCompanyTasksApi(filters)
  const scope = ['overdue']

  const counts = api.countsQuery<OverdueCounts>(scope, '/overdue/counts/')
  const today = api.listQuery([...scope, 'today'], '/overdue/today/')
  const tomorrow = api.listQuery([...scope, 'tomorrow'], '/overdue/tomorrow/')
  const week = api.listQuery([...scope, 'week'], '/overdue/week/')
  const month = api.listQuery([...scope, 'month'], '/overdue/month/')
  const noDate = api.listQuery([...scope, 'no_date'], '/overdue/no_date/')

  const sliceQueries = {
    today,
    tomorrow,
    week,
    month,
    no_date: noDate,
  } as const

  const sections = computed<TaskBoardSection[]>(() => {
    const totals = counts.data.value

    return OVERDUE_SECTIONS.map((meta) => {
      const slice = sliceQueries[meta.countKey]
      return {
        id: meta.id,
        labelKey: meta.labelKey,
        color: meta.color,
        count: totals?.[meta.countKey],
        tasks: extractResults(slice.data.value),
        loading: slice.isPending.value,
        error: slice.isError.value,
        hasNextPage: slice.hasNextPage.value,
        isFetchingNextPage: slice.isFetchingNextPage.value,
      }
    })
  })

  function loadMore(sectionId: string | number) {
    const slice = sliceQueries[sectionId as keyof typeof sliceQueries]
    if (slice) {
      fetchTaskListNextPage(slice)
    }
  }

  return { counts, today, tomorrow, week, month, noDate, sections, loadMore }
}
