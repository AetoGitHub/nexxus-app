import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { UserCompanyMembership } from '~/features/company-memberships/types/company-membership.types'
import { extractResults } from '~/shared/utils/paginated.util'

export function useProfileCompanyMemberships(profileId: MaybeRefOrGetter<number | null>) {
  const { $api } = useNuxtApp()

  const query = useQuery({
    queryKey: computed(() => ['company-memberships', 'profile', toValue(profileId)]),
    queryFn: () =>
      $api<PaginatedResponse<UserCompanyMembership>>(`/api/auth/company_memberships/profile/${toValue(profileId)}/`),
    enabled: computed(() => {
      const id = toValue(profileId)
      return id != null && id > 0
    }),
  })

  const memberships = computed(() => extractResults(query.data.value))

  const errorMessage = computed(() =>
    query.error.value ? parseFetchError(query.error.value) : '',
  )

  return { ...query, memberships, errorMessage }
}
