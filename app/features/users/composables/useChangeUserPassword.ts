import { useMutation } from '@tanstack/vue-query'
import type { ChangePasswordVariables } from '~/features/users/types/user.types'

export function useChangeUserPassword() {
  const { $api } = useNuxtApp()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, payload }: ChangePasswordVariables) =>
      $api(`/api/auth/change_password/${id}/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: () => {
      toast.add({
        title: t('configuration.user.password.successTitle'),
        description: t('configuration.user.password.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.user.password.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
