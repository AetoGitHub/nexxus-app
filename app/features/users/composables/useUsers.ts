import { useInfiniteQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { UserProfile } from '~/features/users/types/user.types'

const USERS_ENDPOINT = '/api/auth/profiles/'

function toRelativeApiUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.pathname}${parsedUrl.search}`
  }
  catch {
    return url
  }
}

export function useUsers(
  options: {
    /** Filtra por organización (select del toolbar) vía `?organization=`. */
    organizationId?: MaybeRefOrGetter<number | null | undefined>
  } = {},
) {
  const { $api } = useNuxtApp()

  const organizationId = computed(() => toValue(options.organizationId) ?? null)

  const usersQuery = useInfiniteQuery({
    queryKey: computed(() => ['auth-profiles', 'management', organizationId.value]),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      if (pageParam) {
        return $api<PaginatedResponse<UserProfile>>(pageParam)
      }
      const query: Record<string, string | number> = { all: 'true' }
      if (organizationId.value != null) {
        query.organization = organizationId.value
      }
      return $api<PaginatedResponse<UserProfile>>(USERS_ENDPOINT, { query })
    },
    getNextPageParam: lastPage =>
      lastPage.next ? toRelativeApiUrl(lastPage.next) : undefined,
  })

  const users = computed(() =>
    usersQuery.data.value?.pages.flatMap(page => page.results) ?? [],
  )

  const errorMessage = computed(() =>
    usersQuery.error.value ? parseFetchError(usersQuery.error.value) : '',
  )

  return {
    ...usersQuery,
    users,
    errorMessage,
  }
}
