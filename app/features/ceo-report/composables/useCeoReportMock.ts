import { CEO_REPORT_MOCK } from '~/features/ceo-report/mocks/ceo-report.mock'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'

/**
 * Reporte CEO con datos de ejemplo.
 * TODO: reemplazar por la consulta a la API cuando el backend/IA esté listo.
 */
export function useCeoReportMock() {
  const report = computed<CeoReport>(() => CEO_REPORT_MOCK)
  return { report }
}
