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
    /**
     * `true` → solo proyectos que admiten tareas en backlog (`?backlog=true`), para crear/editar en backlog. Usa su propia
     * caché: la llave base la comparten la lista, el calendario y el Kanban por proyecto y no deben verse afectados.
     */
    backlog?: MaybeRefOrGetter<boolean | undefined>
  } = {},
) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()
  const enabled = computed(() => companyId.value != null && toValue(options.enabled ?? true))
  const backlogOnly = computed(() => toValue(options.backlog) === true)
  /** Sufijo de la llave y params del filtro (vacíos sin filtro: misma caché de siempre). */
  const backlogKey = computed(() => (backlogOnly.value ? [{ backlog: true }] : []))
  const backlogQuery = computed(() => (backlogOnly.value ? { backlog: true } : {}))

  function toItem(project: ProjectDropdown) {
    return { label: project.name, value: project.id, backlog: project.backlog !== false }
  }

  const projects = useQuery({
    queryKey: computed(() => ['dropdowns', 'projects', companyId.value, ...backlogKey.value]),
    queryFn: () =>
      $api<PaginatedResponse<ProjectDropdown>>(
        `/api/tools/dropdown/projects/company/${companyId.value}/`,
        { query: backlogQuery.value },
      ),
    enabled,
  })

  const initialItems = computed(() => extractResults(projects.data.value).map(toItem))

  const inputTerm = computed(() => toValue(options.searchTerm) ?? '')
  const { filteredLocal, remoteSearch, isAwaitingRemote } = useLocalFirstSearch(
    inputTerm,
    initialItems,
  )

  const remoteProjects = useQuery({
    queryKey: computed(() => [
      'dropdowns',
      'projects',
      companyId.value,
      'search',
      remoteSearch.value,
      ...backlogKey.value,
    ]),
    queryFn: () =>
      $api<PaginatedResponse<ProjectDropdown>>(
        `/api/tools/dropdown/projects/company/${companyId.value}/`,
        { query: { name: remoteSearch.value, ...backlogQuery.value } },
      ),
    enabled: computed(() => enabled.value && !!remoteSearch.value),
  })

  const remoteItems = computed(() => extractResults(remoteProjects.data.value).map(toItem))

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
