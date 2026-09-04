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

  const list = computed(() => {
    const byId = new Map(initialList.value.map(user => [user.id, user]))
    for (const user of remoteList.value) {
      byId.set(user.id, user)
    }
    return [...byId.values()]
  })

  const remoteItems = computed(() =>
    remoteList.value.map(user => ({
      label: user.username,
      value: user.id,
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
    isAwaitingRemote.value || (!!remoteSearch.value && remoteUsers.isFetching.value),
  )

  return { users, list, items, allItems, isSearching }
}
