import { useQueries, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { extractResults } from '~/shared/utils/paginated.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'
import type {
  ProjectDropdown,
  Task,
  TaskListFilters,
} from '~/features/tasks/types/task.types'

/** Paleta fija: cada proyecto (por posición) recibe un color distinto. */
const PROJECT_COLORS = [
  '#6366f1', // indigo
  '#28ceab', // teal
  '#f97316', // orange
  '#8b5cf6', // violet
  '#dc2626', // red
  '#0ea5e9', // sky
  '#eab308', // amber
  '#ec4899', // pink
  '#22c55e', // green
  '#64748b', // slate
  '#14b8a6', // teal-2
  '#a855f7', // purple
] as const

export interface CalendarProject {
  id: number
  name: string
  color: string
  tasks: Task[]
  loading: boolean
  error: boolean
}

/**
 * Modo "por proyecto" del calendario: lista todos los proyectos de la empresa y
 * las tareas de cada uno, asignando un color distinto por proyecto.
 *
 * - Proyectos → GET /api/tools/dropdown/projects/company/:id/
 * - Tareas por proyecto → GET /api/tasks/company/:id/project/:projectId/
 *
 * NOTA: la empresa está fija en 1 por ahora (TODO: derivar de la empresa
 * seleccionada).
 */
export function useCalendarProjectTasks(
  filters: MaybeRefOrGetter<TaskListFilters> = {},
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()
  const companyId = 1

  const projectsBase = `/api/tools/dropdown/projects/company/${companyId}`
  const tasksBase = `/api/tasks/company/${companyId}/project`
  const query = computed(() => toTaskListQuery(toValue(filters)))
  const isEnabled = computed(() => toValue(enabled))

  const projects = useQuery({
    queryKey: ['tasks', companyId, 'projects', 'dropdown'],
    queryFn: () => $api<PaginatedResponse<ProjectDropdown>>(`${projectsBase}/`),
    enabled: isEnabled,
  })

  const projectList = computed(() => {
    const list = extractResults(projects.data.value)
    const projectId = toValue(filters).project
    if (projectId == null) {
      return list
    }
    return list.filter(project => project.id === projectId)
  })

  const projectIds = computed(() => projectList.value.map(p => p.id))

  const taskQueries = useQueries({
    queries: computed(() =>
      projectIds.value.map(id => ({
        queryKey: ['tasks', companyId, 'project', id, query.value],
        queryFn: () => $api<PaginatedResponse<Task>>(`${tasksBase}/${id}/`, { query: query.value }),
        enabled: isEnabled.value && projectIds.value.length > 0,
      })),
    ),
  })

  const projectData = computed<CalendarProject[]>(() =>
    projectList.value.map((project, index) => {
      const result = taskQueries.value[index]
      return {
        id: project.id,
        name: project.name,
        color: PROJECT_COLORS[index % PROJECT_COLORS.length]!,
        tasks: extractResults(result?.data),
        loading: result?.isPending ?? false,
        error: result?.isError ?? false,
      }
    }),
  )

  const isPending = computed(() =>
    projects.isPending.value || projectData.value.some(p => p.loading),
  )

  const isError = computed(() =>
    projects.isError.value || projectData.value.some(p => p.error),
  )

  return { projects: projectData, isPending, isError }
}
