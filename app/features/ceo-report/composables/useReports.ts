import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { Report, ReportPeriodType } from '~/features/ceo-report/types/ceo-report-api.types'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { extractResults } from '~/shared/utils/paginated.util'

const REPORTS_ENDPOINT = '/api/reports/'

export const reportsQueryKey = ['reports'] as const

/**
 * Historial de reportes de una empresa (`GET /api/reports/`), del más reciente al más antiguo.
 * Trae la primera página (100 reportes), suficiente para el selector de períodos.
 * Sin `company` la consulta queda deshabilitada.
 */
export function useReports(
  options: {
    company: MaybeRefOrGetter<number | null | undefined>
    periodType?: MaybeRefOrGetter<ReportPeriodType | undefined>
  },
) {
  const { $api } = useNuxtApp()

  const filters = computed(() => ({
    company: toValue(options.company) ?? null,
    periodType: toValue(options.periodType) ?? null,
  }))

  const reportsQuery = useQuery({
    queryKey: computed(() => [...reportsQueryKey, 'list', filters.value]),
    queryFn: () => {
      const query: Record<string, string | number> = {}
      if (filters.value.company != null) {
        query.company = filters.value.company
      }
      if (filters.value.periodType) {
        query.period_type = filters.value.periodType
      }
      return $api<PaginatedResponse<Report>>(REPORTS_ENDPOINT, { query })
    },
    enabled: computed(() => filters.value.company != null),
  })

  const reports = computed(() => extractResults(reportsQuery.data.value))

  const errorMessage = computed(() =>
    reportsQuery.error.value ? parseFetchError(reportsQuery.error.value) : '',
  )

  return { ...reportsQuery, reports, errorMessage }
}
