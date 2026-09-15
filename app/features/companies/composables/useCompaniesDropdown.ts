import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { Company } from '~/features/companies/types/company.types'
import { extractResults } from '~/shared/utils/paginated.util'

const COMPANIES_ENDPOINT = '/api/enterprise/companies/'

/**
 * Opciones {label, value} para el select de Company del toolbar (Master).
 * Si hay una organización seleccionada, se manda como `organization`; si el
 * usuario escribe, se manda como `name`.
 */
export function useCompaniesDropdown(
  options: {
    organizationId?: MaybeRefOrGetter<number | null | undefined>
    searchTerm?: MaybeRefOrGetter<string | undefined>
  } = {},
) {
  const { $api } = useNuxtApp()

  const query = computed(() => {
    const params: Record<string, string | number> = {}
    const organizationId = toValue(options.organizationId)
    const name = toValue(options.searchTerm)?.trim()
    if (organizationId != null) {
      params.organization = organizationId
    }
    if (name) {
      params.name = name
    }
    return params
  })

  const companiesQuery = useQuery({
    queryKey: computed(() => ['enterprise-companies', 'dropdown', query.value]),
    queryFn: () =>
      $api<PaginatedResponse<Company>>(COMPANIES_ENDPOINT, {
        query: Object.keys(query.value).length ? query.value : undefined,
      }),
  })

  const items = computed(() =>
    extractResults(companiesQuery.data.value).map(company => ({
      label: company.name,
      value: company.id,
    })),
  )

  return { ...companiesQuery, items }
}
