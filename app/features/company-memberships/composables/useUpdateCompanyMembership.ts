import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CompanyMembership, UpdateCompanyMembershipVariables } from '~/features/company-memberships/types/company-membership.types'

export function useUpdateCompanyMembership() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, payload }: UpdateCompanyMembershipVariables) =>
      $api<CompanyMembership>(`/api/auth/company_memberships/${id}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['company-memberships', 'profile'] }),
      ])
      toast.add({
        title: t('configuration.user.membership.update.successTitle'),
        description: t('configuration.user.membership.update.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.user.membership.update.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
