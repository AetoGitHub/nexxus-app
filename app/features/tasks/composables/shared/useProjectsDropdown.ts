import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { ProjectDropdown } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'

/** Dropdown de proyectos de la empresa seleccionada en sesión. */
export function useProjectsDropdown(
  options: {
    enabled?: MaybeRefOrGetter<boolean>
    /** Búsqueda por nombre (query param `name`). */
    name?: MaybeRefOrGetter<string>
  } = {},
) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()

  const nameFilter = computed(() => toValue(options.name)?.trim() || undefined)

  const projects = useQuery({
    queryKey: computed(() => {
      const key: unknown[] = ['tasks', companyId.value, 'projects', 'dropdown']
      if (nameFilter.value) {
        key.push(nameFilter.value)
      }
      return key
    }),
    queryFn: () =>
      $api<PaginatedResponse<ProjectDropdown>>(
        `/api/tools/dropdown/projects/company/${companyId.value}/`,
        { query: nameFilter.value ? { name: nameFilter.value } : undefined },
      ),
    enabled: computed(() => companyId.value != null && toValue(options.enabled ?? true)),
  })

  const items = computed(() =>
    extractResults(projects.data.value).map(project => ({
      label: project.name,
      value: project.id,
    })),
  )

  return { projects, items }
}
