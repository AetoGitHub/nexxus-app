import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { BulkCreateUsersPayload } from '~/features/users/types/user.types'

export function useBulkCreateUsers() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: BulkCreateUsersPayload) =>
      $api('/api/tools/user/bulk_create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'profiles'] }),
      ])
      toast.add({
        title: t('configuration.user.bulkCreate.successTitle'),
        description: t('configuration.user.bulkCreate.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.user.bulkCreate.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
