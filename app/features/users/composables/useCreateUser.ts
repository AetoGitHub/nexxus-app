import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateUserPayload, UserProfileDetail } from '~/features/users/types/user.types'

export function useCreateUser() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      $api<UserProfileDetail>('/api/auth/profiles/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'profiles'] }),
      ])
      toast.add({
        title: t('configuration.user.create.successTitle'),
        description: t('configuration.user.create.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.user.create.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
