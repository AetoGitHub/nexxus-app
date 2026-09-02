import { useInfiniteQuery } from '@tanstack/vue-query'
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

export function useUsers() {
  const { $api } = useNuxtApp()

  const usersQuery = useInfiniteQuery({
    queryKey: ['auth-profiles', 'management'],
    initialPageParam: USERS_ENDPOINT,
    queryFn: ({ pageParam }) =>
      $api<PaginatedResponse<UserProfile>>(pageParam),
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
