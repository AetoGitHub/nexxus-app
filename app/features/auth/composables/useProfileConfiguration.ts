import { useQuery } from '@tanstack/vue-query'
import type { ProfileConfiguration } from '~/shared/types/auth.types'

export const profileConfigurationQueryKey = ['auth', 'profile-configuration'] as const

/** Configuración vigente del perfil autenticado. */
export function useProfileConfiguration() {
  const { $api } = useNuxtApp()
  const { isLoggedIn } = useAuth()
  const { configuration, setConfiguration } = useProfileConfigurationStore()

  const query = useQuery({
    queryKey: profileConfigurationQueryKey,
    queryFn: () =>
      $api<ProfileConfiguration>('/api/auth/profiles/config/'),
    enabled: computed(() => isLoggedIn.value),
  })

  watch(query.data, (value) => {
    if (value) {
      setConfiguration(value)
    }
  }, { immediate: true })

  const errorMessage = computed(() =>
    query.error.value ? parseFetchError(query.error.value) : '',
  )

  return {
    ...query,
    configuration,
    errorMessage,
  }
}
