import { useInfiniteQuery } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { Organization } from '~/features/organizations/types/organization.types'

const ORGANIZATIONS_ENDPOINT = '/api/enterprise/organizations/'

function toRelativeApiUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.pathname}${parsedUrl.search}`
  }
  catch {
    return url
  }
}

export function useOrganizations() {
  const { $api } = useNuxtApp()

  const organizationsQuery = useInfiniteQuery({
    queryKey: ['enterprise-organizations'],
    initialPageParam: ORGANIZATIONS_ENDPOINT,
    queryFn: ({ pageParam }) =>
      $api<PaginatedResponse<Organization>>(pageParam),
    getNextPageParam: lastPage =>
      lastPage.next ? toRelativeApiUrl(lastPage.next) : undefined,
  })

  const organizations = computed(() =>
    organizationsQuery.data.value?.pages.flatMap(page => page.results) ?? [],
  )

  const errorMessage = computed(() =>
    organizationsQuery.error.value
      ? parseFetchError(organizationsQuery.error.value)
      : '',
  )

  return {
    ...organizationsQuery,
    organizations,
    errorMessage,
  }
}
