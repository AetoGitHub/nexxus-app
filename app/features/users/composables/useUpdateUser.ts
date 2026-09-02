import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateUserVariables, UserProfileDetail } from '~/features/users/types/user.types'

export function useUpdateUser() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, payload }: UpdateUserVariables) =>
      $api<UserProfileDetail>(`/api/auth/profiles/${id}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'profiles'] }),
        queryClient.invalidateQueries({
          queryKey: ['auth-profiles', 'detail', id],
        }),
      ])
      toast.add({
        title: t('configuration.user.update.successTitle'),
        description: t('configuration.user.update.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.user.update.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
