import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { AuthProfile } from '~/features/auth/types/profile.types'

export interface UseProfilesParams {
  /** Solo perfiles sin grupo asignado. */
  no_group?: boolean
  /** Solo perfiles de esta organización. */
  organization?: number
}

/** Catálogo de perfiles para selectores (miembros de tema, grupos, etc.). */
export function useProfiles(
  enabled: MaybeRefOrGetter<boolean> = true,
  params: MaybeRefOrGetter<UseProfilesParams> = {},
) {
  const { $api } = useNuxtApp()

  const queryParams = computed(() => {
    const value = toValue(params)
    const query: Record<string, boolean | number> = {}
    if (value.no_group) {
      query.no_group = true
    }
    if (value.organization != null) {
      query.organization = value.organization
    }
    return Object.keys(query).length ? query : undefined
  })

  const profilesQuery = useQuery({
    queryKey: computed(() => ['auth', 'profiles', queryParams.value ?? {}]),
    queryFn: () =>
      $api<PaginatedResponse<AuthProfile>>('/api/auth/profiles/', {
        query: queryParams.value,
      }),
    enabled: computed(() => toValue(enabled)),
  })

  const profiles = computed(() => profilesQuery.data.value?.results ?? [])

  const items = computed(() =>
    profiles.value.map(profile => ({
      label: profile.username,
      value: profile.id,
    })),
  )

  return { profilesQuery, profiles, items }
}
