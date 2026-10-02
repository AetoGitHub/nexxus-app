import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { Report } from '~/features/ceo-report/types/ceo-report-api.types'
import { reportsQueryKey } from '~/features/ceo-report/composables/useReports'

/** Reporte completo (`GET /api/reports/<id>/`). Sin `id` la consulta queda deshabilitada. */
export function useReportDetail(id: MaybeRefOrGetter<number | null | undefined>) {
  const { $api } = useNuxtApp()

  const reportId = computed(() => toValue(id) ?? null)

  const detailQuery = useQuery({
    queryKey: computed(() => [...reportsQueryKey, 'detail', reportId.value]),
    queryFn: () => $api<Report>(`/api/reports/${reportId.value}/`),
    enabled: computed(() => reportId.value != null),
  })

  const errorMessage = computed(() =>
    detailQuery.error.value ? parseFetchError(detailQuery.error.value) : '',
  )

  return { ...detailQuery, errorMessage }
}
