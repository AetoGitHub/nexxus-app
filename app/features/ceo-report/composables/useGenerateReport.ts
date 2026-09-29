import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { GenerateReportPayload, Report } from '~/features/ceo-report/types/ceo-report-api.types'
import { reportsQueryKey } from '~/features/ceo-report/composables/useReports'

/**
 * Calcula (o recupera, si ya existe) el reporte de una empresa para un rango de fechas
 * (`POST /api/reports/generate/`). Con `force: true` recalcula el ya existente.
 */
export function useGenerateReport() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: GenerateReportPayload) =>
      $api<Report>('/api/reports/generate/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (report, payload) => {
      queryClient.setQueryData([...reportsQueryKey, 'detail', report.id], report)
      await queryClient.invalidateQueries({ queryKey: [...reportsQueryKey, 'list'] })
      toast.add({
        title: payload.force
          ? t('ceoReport.generate.recalculatedTitle')
          : t('ceoReport.generate.successTitle'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('ceoReport.generate.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
    },
  })
}
