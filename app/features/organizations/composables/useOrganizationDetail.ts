import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { OrganizationDetail } from '~/features/organizations/types/organization.types'

export function useOrganizationDetail(organizationId: MaybeRefOrGetter<number | null>) {
  const { $api } = useNuxtApp()

  const query = useQuery({
    queryKey: computed(() => ['enterprise-organizations', 'detail', toValue(organizationId)]),
    queryFn: () => $api<OrganizationDetail>(`/api/enterprise/organizations/${toValue(organizationId)}/`),
    enabled: computed(() => {
      const id = toValue(organizationId)
      return id != null && id > 0
    }),
  })

  const errorMessage = computed(() =>
    query.error.value ? parseFetchError(query.error.value) : '',
  )

  return { ...query, errorMessage }
}
