import { useQueries, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { extractResults } from '~/shared/utils/paginated.util'
import { withoutPersonalTasks } from '~/features/tasks/utils/task-personal.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'
import { useTaskGroupByAccess } from '~/features/tasks/composables/shared/useTaskGroupByAccess'
import { usePrivateProjects } from '~/features/projects/composables/usePrivateProjects'
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
 */
export function useCalendarProjectTasks(
  filters: MaybeRefOrGetter<TaskListFilters> = {},
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()

  const { adminQuery } = useTaskAdminView()
  const projectsBase = computed(() => `/api/tools/dropdown/projects/company/${companyId.value}`)
  const tasksBase = computed(() => `/api/tasks/company/${companyId.value}/project`)
  const query = computed(() => ({
    ...toTaskListQuery(toValue(filters)),
    ...adminQuery.value,
  }))
  const isEnabled = computed(() => toValue(enabled) && companyId.value != null)

  // Sin «Vista por proyecto» solo se muestran sus proyectos privados (el backend también limita /project/… a esos).
  const { projectScope } = useTaskGroupByAccess()
  const isPrivateScope = computed(() => projectScope.value === 'private')
  const { projects: privateProjects, projectsQuery: privateProjectsQuery } = usePrivateProjects({
    enabled: computed(() => isEnabled.value && isPrivateScope.value),
  })

  const projects = useQuery({
    queryKey: computed(() => ['dropdowns', 'projects', companyId.value]),
    queryFn: () => $api<PaginatedResponse<ProjectDropdown>>(`${projectsBase.value}/`),
    enabled: computed(() => isEnabled.value && !isPrivateScope.value),
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
    queries: computed(() =>
      projectIds.value.map(id => ({
        queryKey: ['tasks', companyId.value, 'project', id, projectScope.value, query.value],
        queryFn: () => $api<PaginatedResponse<Task>>(`${tasksBase.value}/${id}/`, { query: query.value }),
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
        // En la vista de sus privados las tareas personales son justo las que se muestran.
        tasks: isPrivateScope.value ? extractResults(result?.data) : withoutPersonalTasks(extractResults(result?.data)),
        loading: result?.isPending ?? false,
        error: result?.isError ?? false,
      }
    }),
  )

  const projectsSource = computed(() => (isPrivateScope.value ? privateProjectsQuery : projects))

  const isPending = computed(() =>
    projectsSource.value.isPending.value || projectData.value.some(p => p.loading),
  )

  const isError = computed(() =>
    projectsSource.value.isError.value || projectData.value.some(p => p.error),
  )

  return { projects: projectData, isPending, isError }
}
