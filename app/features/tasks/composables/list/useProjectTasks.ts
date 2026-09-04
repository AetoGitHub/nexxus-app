import { useQueries, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import { extractResults } from '~/shared/utils/paginated.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'
import { fetchTaskListNextPage, taskListInfiniteQueryOptions } from '~/features/tasks/utils/task-infinite.util'
import type {
  ProjectDropdown,
  ProjectTaskCount,
  ProjectTaskSection,
  TaskListFilters,
} from '~/features/tasks/types/task.types'

const PROJECT_SECTION_COLORS = ['#6366f1', '#28ceab', '#f97316', '#8b5cf6', '#dc2626', '#6b7280']

/**
 * Server state de tareas agrupadas por proyecto vía TanStack Query.
 */
export function useProjectTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()
  const hasCompany = computed(() => companyId.value != null)

  const projectsBase = computed(() => `/api/tools/dropdown/projects/company/${companyId.value}`)
  const tasksBase = computed(() => `/api/tasks/company/${companyId.value}/project`)
  const query = computed(() => toTaskListQuery(toValue(filters)))

  const projects = useQuery({
    queryKey: computed(() => ['tasks', companyId.value, 'projects', 'dropdown']),
    queryFn: () => $api<PaginatedResponse<ProjectDropdown>>(`${projectsBase.value}/`),
    enabled: hasCompany,
  })

  const counts = useQuery({
    queryKey: computed(() => ['tasks', companyId.value, 'project', 'counts', query.value]),
    queryFn: () => $api<ProjectTaskCount[]>(`${tasksBase.value}/counts/`, { query: query.value }),
    enabled: hasCompany,
  })

  const projectList = computed(() => {
    const list = extractResults(projects.data.value)
    const selected = toValue(filters).project
    if (!selected?.length) {
      return list
    }
    return list.filter(project => selected.includes(project.id))
  })

  const projectIds = computed(() => projectList.value.map(p => p.id))

  const taskQueries = useQueries({
    queries: computed(() => {
      const countsMap = new Map((counts.data.value ?? []).map(c => [c.id, c.total]))

      return projectIds.value.map((id) => {
        const total = countsMap.get(id) ?? 0
        return taskListInfiniteQueryOptions({
          $api,
          queryKey: ['tasks', companyId.value, 'project', id, query.value],
          url: `${tasksBase.value}/${id}/`,
          query: query.value,
          enabled: hasCompany.value && total > 0,
        })
      })
    }),
  })

  const sections = computed<ProjectTaskSection[]>(() => {
    const countsMap = new Map((counts.data.value ?? []).map(c => [c.id, c.total]))

    return projectList.value.map((project, index) => {
      const queryResult = taskQueries.value[index]
      const total = countsMap.get(project.id) ?? 0
      const tasks = total > 0 ? extractResults(queryResult?.data) : []

      return {
        id: project.id,
        name: project.name,
        count: total,
        dotColor: tasks[0]?.project_color?.trim()
          ? resolveThemeColor(tasks[0].project_color)
          : PROJECT_SECTION_COLORS[index % PROJECT_SECTION_COLORS.length]!,
        tasks,
        loading: total > 0 && (queryResult?.isPending ?? false),
        error: queryResult?.isError ?? false,
        hasNextPage: queryResult?.hasNextPage ?? false,
        isFetchingNextPage: queryResult?.isFetchingNextPage ?? false,
      }
    })
  })

  function loadMore(sectionId: string | number) {
    const index = projectIds.value.findIndex(id => id === Number(sectionId))
    const queryResult = taskQueries.value[index]
    if (queryResult) {
      fetchTaskListNextPage(queryResult)
    }
  }

  return { projects, counts, sections, loadMore }
}
