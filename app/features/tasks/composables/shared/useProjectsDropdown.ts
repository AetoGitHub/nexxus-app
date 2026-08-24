import { useQuery } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { ProjectDropdown } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'

/** Dropdown de proyectos de la empresa seleccionada en sesión. */
export function useProjectsDropdown() {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()

  const projects = useQuery({
    queryKey: computed(() => ['tasks', companyId.value, 'projects', 'dropdown']),
    queryFn: () =>
      $api<PaginatedResponse<ProjectDropdown>>(
        `/api/tools/dropdown/projects/company/${companyId.value}/`,
      ),
    enabled: computed(() => companyId.value != null),
  })

  const items = computed(() =>
    extractResults(projects.data.value).map(project => ({
      label: project.name,
      value: project.id,
    })),
  )

  return { projects, items }
}
