import { useInfiniteQuery } from '@tanstack/vue-query'
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

export function useCompanies() {
  const { $api } = useNuxtApp()

  const companiesQuery = useInfiniteQuery({
    queryKey: ['enterprise-companies'],
    initialPageParam: COMPANIES_ENDPOINT,
    queryFn: ({ pageParam }) =>
      $api<PaginatedResponse<Company>>(pageParam),
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
