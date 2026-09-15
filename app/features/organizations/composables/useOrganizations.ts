import { useInfiniteQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
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

export function useOrganizations(
  options: {
    /** Filtra a una sola organización (select del toolbar) vía `?pk=`. */
    organizationId?: MaybeRefOrGetter<number | null | undefined>
  } = {},
) {
  const { $api } = useNuxtApp()

  const organizationId = computed(() => toValue(options.organizationId) ?? null)

  const organizationsQuery = useInfiniteQuery({
    queryKey: computed(() => ['enterprise-organizations', organizationId.value]),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      if (pageParam) {
        return $api<PaginatedResponse<Organization>>(pageParam)
      }
      return $api<PaginatedResponse<Organization>>(ORGANIZATIONS_ENDPOINT, {
        query: organizationId.value != null ? { pk: organizationId.value } : undefined,
      })
    },
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
