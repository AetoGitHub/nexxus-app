import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateUserContextVariables, UserContextResponse } from '~/features/user-context/types/user-context.types'

export function useUpdateUserContext() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, payload }: UpdateUserContextVariables) =>
      $api<UserContextResponse>(`/api/auth/context/${id}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth-profiles'] })
      toast.add({
        title: t('configuration.user.context.update.successTitle'),
        description: t('configuration.user.context.update.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.user.context.update.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
