import { useQuery } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { Organization } from '~/features/organizations/types/organization.types'
import { extractResults } from '~/shared/utils/paginated.util'

const ORGANIZATIONS_ENDPOINT = '/api/enterprise/organizations/'

/** Opciones {label, value} para el select de Organization del toolbar (Master). */
export function useOrganizationsDropdown() {
  const { $api } = useNuxtApp()

  const organizationsQuery = useQuery({
    queryKey: ['enterprise-organizations', 'dropdown'],
    queryFn: () => $api<PaginatedResponse<Organization>>(ORGANIZATIONS_ENDPOINT),
  })

  const items = computed(() =>
    extractResults(organizationsQuery.data.value).map(organization => ({
      label: organization.name,
      value: organization.id,
    })),
  )

  return { ...organizationsQuery, items }
}
