<script setup lang="ts">
import type { Component } from 'vue'
import '~/features/ceo-report/styles/ceo-report.css'
import CeoBackCoverPage from '~/features/ceo-report/components/pages/CeoBackCoverPage.vue'
import CeoCategoriesPage from '~/features/ceo-report/components/pages/CeoCategoriesPage.vue'
import CeoClosingPage from '~/features/ceo-report/components/pages/CeoClosingPage.vue'
import CeoCoverPage from '~/features/ceo-report/components/pages/CeoCoverPage.vue'
import CeoInsightsPage from '~/features/ceo-report/components/pages/CeoInsightsPage.vue'
import CeoKpisPage from '~/features/ceo-report/components/pages/CeoKpisPage.vue'
import CeoNexxtepPage from '~/features/ceo-report/components/pages/CeoNexxtepPage.vue'
import CeoPeoplePage from '~/features/ceo-report/components/pages/CeoPeoplePage.vue'
import CeoTeamsPage from '~/features/ceo-report/components/pages/CeoTeamsPage.vue'
import type { CeoDecision, CeoReport } from '~/features/ceo-report/types/ceo-report.types'
import { chunkItems } from '~/features/ceo-report/utils/ceo-report-adapter.util'

const props = defineProps<{ report: CeoReport }>()

const emit = defineEmits<{ createTask: [decision: CeoDecision] }>()

// Cuántas filas caben por hoja. Con textos de IA (motivo, qué pasó/significa) las filas son más altas.
const KPIS_FIRST_SHEET = 3
const KPIS_FIRST_SHEET_WITH_TEXT = 2
const TEAMS_PER_SHEET_WITH_TEXT = 4
const TEAMS_PER_SHEET = 7
const CATEGORIES_PER_SHEET_WITH_TEXT = 6
const CATEGORIES_PER_SHEET = 10
const INSIGHTS_PER_SHEET = 3

interface Sheet {
  key: string
  component: Component
  props: Record<string, unknown>
}

/**
 * Hojas del reporte. Una sección sin datos no genera hoja (p. ej. Nexxtep o el cierre cuando aún no hay
 * textos de IA); veredicto e insights sí, y se dibujan «en preparación». Las listas largas
 * continúan en hojas adicionales.
 */
const sheets = computed<Sheet[]>(() => {
  const { report } = props

  const kpisFirst = report.kpis.some(kpi => kpi.whatItMeans) ? KPIS_FIRST_SHEET_WITH_TEXT : KPIS_FIRST_SHEET
  const kpiChunks = chunkItems(report.kpis, kpisFirst, kpisFirst)

  const teamsSize = report.teams.items.some(team => team.reason) ? TEAMS_PER_SHEET_WITH_TEXT : TEAMS_PER_SHEET
  const teamChunks = chunkItems(report.teams.items, teamsSize, teamsSize)

  const categoriesSize = report.categories.items.some(cat => cat.reason)
    ? CATEGORIES_PER_SHEET_WITH_TEXT
    : CATEGORIES_PER_SHEET
  const categoryChunks = chunkItems(report.categories.items, categoriesSize, categoriesSize)

  // Sin insights de la IA hay una sola hoja con las tarjetas «en preparación» (items indefinido).
  const insights = report.narrative?.insights
  const insightChunks: Array<typeof insights> = insights?.length
    ? chunkItems(insights, INSIGHTS_PER_SHEET, INSIGHTS_PER_SHEET)
    : [undefined]

  return [
    { key: 'cover', component: CeoCoverPage, props: { report } },
    ...kpiChunks.map((rows, index) => ({
      key: `kpis-${index}`,
      component: CeoKpisPage,
      props: { report, rows, intro: index === 0 },
    })),
    ...insightChunks.map((items, index) => ({
      key: `insights-${index}`,
      component: CeoInsightsPage,
      props: { report, items, intro: index === 0, last: index === insightChunks.length - 1 },
    })),
    ...teamChunks.map((items, index) => ({
      key: `teams-${index}`,
      component: CeoTeamsPage,
      props: { report, items, intro: index === 0 },
    })),
    ...categoryChunks.map((items, index) => ({
      key: `categories-${index}`,
      component: CeoCategoriesPage,
      props: { report, items, intro: index === 0 },
    })),
    ...(report.people.top.length ? [{ key: 'people', component: CeoPeoplePage, props: { report } }] : []),
    ...(report.nexxtep ? [{ key: 'nexxtep', component: CeoNexxtepPage, props: { report } }] : []),
    ...(report.closing?.hasSummary
      ? [{ key: 'closing', component: CeoClosingPage, props: { report, part: 'summary' } }]
      : []),
    ...(report.closing?.decisions.length
      ? [{
          key: 'decisions',
          component: CeoClosingPage,
          props: {
            report,
            part: 'decisions',
            onCreateTask: (decision: CeoDecision) => emit('createTask', decision),
          },
        }]
      : []),
    { key: 'back', component: CeoBackCoverPage, props: { report } },
  ]
})
</script>

<template>
  <div class="cr-doc">
    <div class="cr-stage">
      <component
        :is="sheet.component"
        v-for="(sheet, index) in sheets"
        :key="sheet.key"
        v-bind="sheet.props"
        :page-number="index + 1"
      />
    </div>
  </div>
</template>
