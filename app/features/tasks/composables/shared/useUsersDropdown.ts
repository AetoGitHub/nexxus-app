import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { UserDropdown } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'

/**
 * Dropdown de usuarios vía GET /api/tools/dropdown/users/.
 * Cada usuario puede traer group_id / group_name.
 */
export function useUsersDropdown(enabled: MaybeRefOrGetter<boolean> = true) {
  const { $api } = useNuxtApp()

  const users = useQuery({
    queryKey: ['tasks', 'users', 'dropdown'],
    queryFn: () =>
      $api<PaginatedResponse<UserDropdown>>('/api/tools/dropdown/users/'),
    enabled: computed(() => toValue(enabled)),
  })

  const list = computed(() => extractResults(users.data.value))

  const items = computed(() =>
    list.value.map(user => ({
      label: user.username,
      value: user.id,
    })),
  )

  return { users, list, items }
}
