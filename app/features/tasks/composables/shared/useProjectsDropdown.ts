import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { ProjectDropdown } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'
import { useLocalFirstSearch } from '~/features/tasks/composables/shared/useLocalFirstSearch'

/** Dropdown de proyectos de la empresa seleccionada en sesión. */
export function useProjectsDropdown(
  options: {
    enabled?: MaybeRefOrGetter<boolean>
    /** Término crudo del input: primero filtra local, luego API. */
    searchTerm?: MaybeRefOrGetter<string>
  } = {},
) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()
  const enabled = computed(() => companyId.value != null && toValue(options.enabled ?? true))

  const projects = useQuery({
    queryKey: computed(() => ['tasks', companyId.value, 'projects', 'dropdown']),
    queryFn: () =>
      $api<PaginatedResponse<ProjectDropdown>>(
        `/api/tools/dropdown/projects/company/${companyId.value}/`,
      ),
    enabled,
  })

  const initialItems = computed(() =>
    extractResults(projects.data.value).map(project => ({
      label: project.name,
      value: project.id,
    })),
  )

  const inputTerm = computed(() => toValue(options.searchTerm) ?? '')
  const { filteredLocal, remoteSearch, isAwaitingRemote } = useLocalFirstSearch(
    inputTerm,
    initialItems,
  )

  const remoteProjects = useQuery({
    queryKey: computed(() => [
      'tasks',
      companyId.value,
      'projects',
      'dropdown',
      'search',
      remoteSearch.value,
    ]),
    queryFn: () =>
      $api<PaginatedResponse<ProjectDropdown>>(
        `/api/tools/dropdown/projects/company/${companyId.value}/`,
        { query: { name: remoteSearch.value } },
      ),
    enabled: computed(() => enabled.value && !!remoteSearch.value),
  })

  const remoteItems = computed(() =>
    extractResults(remoteProjects.data.value).map(project => ({
      label: project.name,
      value: project.id,
    })),
  )

  const allItems = computed(() => {
    const byId = new Map(initialItems.value.map(item => [item.value, item]))
    for (const item of remoteItems.value) {
      byId.set(item.value, item)
    }
    return [...byId.values()]
  })

  const items = computed(() =>
    remoteSearch.value ? remoteItems.value : filteredLocal.value,
  )

  const isSearching = computed(() =>
    isAwaitingRemote.value || (!!remoteSearch.value && remoteProjects.isFetching.value),
  )

  return { projects, items, allItems, isSearching }
}
