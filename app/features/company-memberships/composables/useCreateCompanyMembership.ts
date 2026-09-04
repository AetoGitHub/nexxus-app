import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CompanyMembership, CreateCompanyMembershipPayload } from '~/features/company-memberships/types/company-membership.types'

export function useCreateCompanyMembership() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateCompanyMembershipPayload) =>
      $api<CompanyMembership>('/api/auth/company_memberships/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['company-memberships', 'profile'] }),
      ])
      toast.add({
        title: t('configuration.user.membership.successTitle'),
        description: t('configuration.user.membership.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.user.membership.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
