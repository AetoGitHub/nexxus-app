import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { OrganizationDetail, UpdateOrganizationVariables } from '~/features/organizations/types/organization.types'

export function useUpdateOrganization() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, payload }: UpdateOrganizationVariables) =>
      $api<OrganizationDetail>(`/api/enterprise/organizations/${id}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-organizations'] }),
        queryClient.invalidateQueries({
          queryKey: ['enterprise-organizations', 'detail', id],
        }),
      ])
      toast.add({
        title: t('configuration.organization.update.successTitle'),
        description: t('configuration.organization.update.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.organization.update.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
