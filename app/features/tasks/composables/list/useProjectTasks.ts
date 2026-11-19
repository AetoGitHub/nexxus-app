import { useQueries, useQuery } from '@tanstack/vue-query'
import type { InfiniteData } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import { extractResults } from '~/shared/utils/paginated.util'
import { withoutPersonalTasks } from '~/features/tasks/utils/task-personal.util'
import { useTaskTokenState } from '~/features/tasks/composables/shared/useTaskTokenState'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'
import { fetchTaskListNextPage, taskListInfiniteQueryOptions } from '~/features/tasks/utils/task-infinite.util'
import { useTaskGroupByAccess } from '~/features/tasks/composables/shared/useTaskGroupByAccess'
import { usePrivateProjects } from '~/features/projects/composables/usePrivateProjects'
import type {
  Task,
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

  const { adminQuery } = useTaskAdminView()
  const projectsBase = computed(() => `/api/tools/dropdown/projects/company/${companyId.value}`)
  const tasksBase = computed(() => `/api/tasks/company/${companyId.value}/project`)
  const query = computed(() => ({
    ...toTaskListQuery(toValue(filters)),
    ...adminQuery.value,
  }))

  // Sin «Vista por proyecto» solo se agrupan sus proyectos privados (el backend también limita /project/… a esos).
  const { projectScope } = useTaskGroupByAccess()
  const isPrivateScope = computed(() => projectScope.value === 'private')
  const { projects: privateProjects } = usePrivateProjects({ enabled: isPrivateScope })

  const projects = useQuery({
    queryKey: computed(() => ['dropdowns', 'projects', companyId.value]),
    queryFn: () => $api<PaginatedResponse<ProjectDropdown>>(`${projectsBase.value}/`),
    enabled: computed(() => hasCompany.value && !isPrivateScope.value),
  })

  const counts = useQuery({
    queryKey: computed(() => ['tasks', companyId.value, 'project', 'counts', projectScope.value, query.value]),
    queryFn: () => $api<ProjectTaskCount[]>(`${tasksBase.value}/counts/`, { query: query.value }),
    enabled: hasCompany,
  })

  const projectList = computed(() => {
    const list: Array<{ id: number, name: string }> = isPrivateScope.value
      ? privateProjects.value.map(project => ({ id: project.id, name: project.name }))
      : extractResults(projects.data.value)
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
          queryKey: ['tasks', companyId.value, 'project', id, projectScope.value, query.value],
          url: `${tasksBase.value}/${id}/`,
          query: query.value,
          enabled: hasCompany.value && total > 0,
        })
      })
    }),
  })

  const { sortByTokens } = useTaskTokenState()

  const sections = computed<ProjectTaskSection[]>(() => {
    const countsMap = new Map((counts.data.value ?? []).map(c => [c.id, c.total]))

    return projectList.value.map((project, index) => {
      const queryResult = taskQueries.value[index]
      const total = countsMap.get(project.id) ?? 0
      const raw: Task[] = total > 0 ? extractResults<Task>(queryResult?.data as InfiniteData<PaginatedResponse<Task>>) : []
      // En la vista de sus privados las tareas personales son justo las que se muestran.
      const loadedTasks = isPrivateScope.value ? raw : withoutPersonalTasks(raw)
      const tasks = sortByTokens(loadedTasks)

      return {
        id: project.id,
        name: project.name,
        count: total,
        dotColor: loadedTasks[0]?.project_color?.trim()
          ? resolveThemeColor(loadedTasks[0].project_color)
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
