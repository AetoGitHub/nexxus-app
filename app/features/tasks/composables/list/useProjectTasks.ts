import { useQueries, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import { extractResults } from '~/shared/utils/paginated.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'
import type {
  ProjectDropdown,
  ProjectTaskCount,
  ProjectTaskSection,
  Task,
  TaskListFilters,
} from '~/features/tasks/types/task.types'

const PROJECT_SECTION_COLORS = ['#6366f1', '#28ceab', '#f97316', '#8b5cf6', '#dc2626', '#6b7280']

/**
 * Server state de tareas agrupadas por proyecto vía TanStack Query.
 *
 * NOTA: la empresa está fija en 1 por ahora (TODO: derivar de la empresa
 * seleccionada).
 */
export function useProjectTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const { $api } = useNuxtApp()
  const companyId = 1

  const projectsBase = `/api/tools/dropdown/projects/company/${companyId}`
  const tasksBase = `/api/tasks/company/${companyId}/project`
  const query = computed(() => toTaskListQuery(toValue(filters)))

  const projects = useQuery({
    queryKey: ['tasks', companyId, 'projects', 'dropdown'],
    queryFn: () => $api<PaginatedResponse<ProjectDropdown>>(`${projectsBase}/`),
  })

  const counts = useQuery({
    queryKey: computed(() => ['tasks', companyId, 'project', 'counts', query.value]),
    queryFn: () => $api<ProjectTaskCount[]>(`${tasksBase}/counts/`, { query: query.value }),
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

      return projectIds.value.map(id => {
        const total = countsMap.get(id) ?? 0
        return {
          queryKey: ['tasks', companyId, 'project', id, query.value],
          queryFn: () => $api<PaginatedResponse<Task>>(`${tasksBase}/${id}/`, { query: query.value }),
          enabled: total > 0,
        }
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
        loading: total > 0 && (queryResult?.isLoading ?? false),
        error: queryResult?.isError ?? false,
      }
    })
  })

  return { projects, counts, sections }
}
