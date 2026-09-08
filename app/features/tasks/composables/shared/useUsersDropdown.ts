import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { UserDropdown } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'
import { useLocalFirstSearch } from '~/features/tasks/composables/shared/useLocalFirstSearch'

/**
 * Dropdown de usuarios vía GET /api/tools/dropdown/users/.
 * Cada usuario puede traer group_id / group_name.
 */
export function useUsersDropdown(
  enabled: MaybeRefOrGetter<boolean> = true,
  options: { searchTerm?: MaybeRefOrGetter<string> } = {},
) {
  const { $api } = useNuxtApp()
  const isEnabled = computed(() => toValue(enabled))

  const users = useQuery({
    queryKey: ['tasks', 'users', 'dropdown'],
    queryFn: () =>
      $api<PaginatedResponse<UserDropdown>>('/api/tools/dropdown/users/'),
    enabled: isEnabled,
  })

  const initialList = computed(() => extractResults(users.data.value))

  const initialItems = computed(() =>
    initialList.value.map(user => ({
      label: user.username,
      value: user.id,
    })),
  )

  const { filteredLocal, remoteSearch, isAwaitingRemote } = useLocalFirstSearch(
    () => toValue(options.searchTerm) ?? '',
    initialItems,
  )

  const remoteUsers = useQuery({
    queryKey: computed(() => ['tasks', 'users', 'dropdown', 'search', remoteSearch.value]),
    queryFn: () =>
      $api<PaginatedResponse<UserDropdown>>('/api/tools/dropdown/users/', {
        query: { username: remoteSearch.value },
      }),
    enabled: computed(() => isEnabled.value && !!remoteSearch.value),
  })

  const remoteList = computed(() => extractResults(remoteUsers.data.value))

  /**
   * Cache acumulado de todos los usuarios vistos en la sesión (página inicial +
   * cada búsqueda remota). `remoteList` solo refleja la última búsqueda, así que
   * sin acumular se perdía el label (y group_id/group_name) de un usuario ya
   * seleccionado en cuanto se hacía otra búsqueda que no lo incluyera.
   */
  const knownUsersById = ref(new Map<number, UserDropdown>())

  watch(initialList, (fetchedUsers) => {
    for (const fetchedUser of fetchedUsers) {
      knownUsersById.value.set(fetchedUser.id, fetchedUser)
    }
  }, { immediate: true })

  watch(remoteList, (fetchedUsers) => {
    for (const fetchedUser of fetchedUsers) {
      knownUsersById.value.set(fetchedUser.id, fetchedUser)
    }
  }, { immediate: true })

  const list = computed(() => [...knownUsersById.value.values()])

  const remoteItems = computed(() =>
    remoteList.value.map(user => ({
      label: user.username,
      value: user.id,
    })),
  )

  const allItems = computed(() =>
    list.value.map(user => ({
      label: user.username,
      value: user.id,
    })),
  )

  const items = computed(() =>
    remoteSearch.value ? remoteItems.value : filteredLocal.value,
  )

  const isSearching = computed(() =>
    isAwaitingRemote.value || (!!remoteSearch.value && remoteUsers.isFetching.value),
  )

  return { users, list, items, allItems, isSearching }
}
