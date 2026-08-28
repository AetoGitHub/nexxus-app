import type { AuthSession, ProfileConfiguration } from '~/shared/types/auth.types'

/** Store persistente de la configuración del perfil incluida en la sesión. */
export function useProfileConfigurationStore() {
  const session = useCookie<AuthSession | null>('auth_session')

  const configuration = computed(() =>
    session.value?.profile_configurations ?? null,
  )

  function setConfiguration(value: ProfileConfiguration) {
    if (!session.value) {
      return
    }

    session.value = {
      ...session.value,
      profile_configurations: value,
    }
  }

  return {
    configuration,
    setConfiguration,
  }
}
