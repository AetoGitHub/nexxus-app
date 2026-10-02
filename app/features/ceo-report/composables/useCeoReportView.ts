import type { MaybeRefOrGetter } from 'vue'
import type { Report } from '~/features/ceo-report/types/ceo-report-api.types'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'
import { buildCeoReport, type Translate } from '~/features/ceo-report/utils/ceo-report-adapter.util'

/** Adapta la respuesta de la API al modelo que dibujan las hojas del reporte. */
export function useCeoReportView(report: MaybeRefOrGetter<Report | null | undefined>) {
  const { t, locale } = useI18n()
  const { organization } = useAuth()

  const translate: Translate = (key, named) => (named ? t(key, named) : t(key))

  const view = computed<CeoReport | null>(() => {
    const current = toValue(report)
    if (!current) {
      return null
    }

    const company = organization.value?.companies.find(item => item.id === current.company)
    return buildCeoReport(current, {
      t: translate,
      locale: locale.value,
      scopeLabel: company?.name ?? t('ceoReport.scope.company'),
    })
  })

  return { view }
}
