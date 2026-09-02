import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateOrganizationPayload, Organization } from '~/features/organizations/types/organization.types'

export function useCreateOrganization() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateOrganizationPayload) =>
      $api<Organization>('/api/enterprise/organizations/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['enterprise-organizations'],
      })
      toast.add({
        title: t('configuration.organization.create.successTitle'),
        description: t('configuration.organization.create.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.organization.create.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
