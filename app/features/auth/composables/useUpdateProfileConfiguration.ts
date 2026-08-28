import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { profileConfigurationQueryKey } from '~/features/auth/composables/useProfileConfiguration'
import type {
  ProfileConfiguration,
  UpdateProfileConfigurationPayload,
} from '~/shared/types/auth.types'

/** Actualiza la configuración completa del perfil autenticado. */
export function useUpdateProfileConfiguration() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { configuration, setConfiguration } = useProfileConfigurationStore()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: UpdateProfileConfigurationPayload) =>
      $api<ProfileConfiguration>('/api/auth/profiles/config/update/', {
        method: 'PATCH',
        body: payload,
      }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: profileConfigurationQueryKey })

      const previous = configuration.value
      const optimistic: ProfileConfiguration = {
        id: previous?.id ?? 0,
        ...payload,
      }

      setConfiguration(optimistic)
      queryClient.setQueryData(profileConfigurationQueryKey, optimistic)

      return { previous }
    },
    onSuccess: (value) => {
      setConfiguration(value)
      queryClient.setQueryData(profileConfigurationQueryKey, value)
      toast.add({
        title: t('taskSettings.general.save.successTitle'),
        description: t('taskSettings.general.save.successDescription'),
        color: 'success',
      })
    },
    onError: (error, _payload, context) => {
      if (context?.previous) {
        setConfiguration(context.previous)
        queryClient.setQueryData(profileConfigurationQueryKey, context.previous)
      }

      toast.add({
        title: t('taskSettings.general.save.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
