import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { CompanyDetail } from '~/features/companies/types/company.types'

export function useCompanyDetail(companyId: MaybeRefOrGetter<number | null>) {
  const { $api } = useNuxtApp()

  const query = useQuery({
    queryKey: computed(() => ['enterprise-companies', 'detail', toValue(companyId)]),
    queryFn: () => $api<CompanyDetail>(`/api/enterprise/companies/${toValue(companyId)}/`),
    enabled: computed(() => {
      const id = toValue(companyId)
      return id != null && id > 0
    }),
  })

  const errorMessage = computed(() =>
    query.error.value ? parseFetchError(query.error.value) : '',
  )

  return { ...query, errorMessage }
}
