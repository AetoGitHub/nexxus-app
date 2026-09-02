import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { UserProfileDetail } from '~/features/users/types/user.types'

export function useUserDetail(userId: MaybeRefOrGetter<number | null>) {
  const { $api } = useNuxtApp()

  const query = useQuery({
    queryKey: computed(() => ['auth-profiles', 'detail', toValue(userId)]),
    queryFn: () =>
      $api<UserProfileDetail>(`/api/auth/profiles/${toValue(userId)}/`),
    enabled: computed(() => {
      const id = toValue(userId)
      return id != null && id > 0
    }),
  })

  const errorMessage = computed(() =>
    query.error.value ? parseFetchError(query.error.value) : '',
  )

  return { ...query, errorMessage }
}
