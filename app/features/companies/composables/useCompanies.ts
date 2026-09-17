import { useInfiniteQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { Company } from '~/features/companies/types/company.types'

const COMPANIES_ENDPOINT = '/api/enterprise/companies/'

function toRelativeApiUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.pathname}${parsedUrl.search}`
  }
  catch {
    return url
  }
}

export function useCompanies(
  options: {
    /** Filtra por organización (select del toolbar) vía `?organization=`. */
    organizationId?: MaybeRefOrGetter<number | null | undefined>
    /** Filtra por nombre (búsqueda del select de company) vía `?name=`. */
    name?: MaybeRefOrGetter<string | null | undefined>
  } = {},
) {
  const { $api } = useNuxtApp()

  const filters = computed(() => ({
    organizationId: toValue(options.organizationId) ?? null,
    name: toValue(options.name)?.trim() || null,
  }))

  const companiesQuery = useInfiniteQuery({
    queryKey: computed(() => ['enterprise-companies', filters.value]),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      if (pageParam) {
        return $api<PaginatedResponse<Company>>(pageParam)
      }
      const query: Record<string, string | number> = {}
      if (filters.value.organizationId != null) {
        query.organization = filters.value.organizationId
      }
      if (filters.value.name) {
        query.name = filters.value.name
      }
      return $api<PaginatedResponse<Company>>(COMPANIES_ENDPOINT, {
        query: Object.keys(query).length ? query : undefined,
      })
    },
    getNextPageParam: lastPage =>
      lastPage.next ? toRelativeApiUrl(lastPage.next) : undefined,
  })

  const companies = computed(() =>
    companiesQuery.data.value?.pages.flatMap(page => page.results) ?? [],
  )

  const errorMessage = computed(() =>
    companiesQuery.error.value
      ? parseFetchError(companiesQuery.error.value)
      : '',
  )

  return {
    ...companiesQuery,
    companies,
    errorMessage,
  }
}
