import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CompanyDetail, UpdateCompanyVariables } from '~/features/companies/types/company.types'

export function useUpdateCompany() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, payload }: UpdateCompanyVariables) =>
      $api<CompanyDetail>(`/api/enterprise/companies/${id}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-companies'] }),
        queryClient.invalidateQueries({
          queryKey: ['enterprise-companies', 'detail', id],
        }),
      ])
      toast.add({
        title: t('configuration.company.update.successTitle'),
        description: t('configuration.company.update.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.company.update.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
