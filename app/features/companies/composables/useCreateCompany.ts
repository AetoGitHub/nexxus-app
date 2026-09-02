import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Company, CreateCompanyPayload } from '~/features/companies/types/company.types'

export function useCreateCompany() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateCompanyPayload) =>
      $api<Company>('/api/enterprise/companies/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['enterprise-companies'],
      })
      toast.add({
        title: t('configuration.company.create.successTitle'),
        description: t('configuration.company.create.successDescription'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('configuration.company.create.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
