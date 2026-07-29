import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { UserDropdown } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'

/**
 * Dropdown de usuarios vía GET /api/tools/dropdown/users/.
 * Si hay groupId, filtra con ?group={id}.
 */
export function useUsersDropdown(
  groupId: MaybeRefOrGetter<number | null | undefined> = null,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()

  const users = useQuery({
    queryKey: computed(() => [
      'tasks',
      'users',
      'dropdown',
      toValue(groupId) ?? null,
    ]),
    queryFn: () => {
      const group = toValue(groupId)
      return $api<PaginatedResponse<UserDropdown>>('/api/tools/dropdown/users/', {
        query: group != null ? { group } : undefined,
      })
    },
    enabled: computed(() => toValue(enabled)),
  })

  const items = computed(() =>
    extractResults(users.data.value).map(user => ({
      label: user.username,
      value: user.id,
    })),
  )

  return { users, items }
}
