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

const props = defineProps<{ report: CeoReport }>()

const emit = defineEmits<{ createTask: [decision: CeoDecision] }>()

// Cuántas filas caben en la primera hoja de una sección que continúa en otra.
const KPIS_FIRST_SHEET = 2
const TEAMS_FIRST_SHEET = 4

interface Sheet {
  key: string
  component: Component
  props: Record<string, unknown>
}

const sheets = computed<Sheet[]>(() => {
  const { report } = props
  const kpisTail = report.kpis.slice(KPIS_FIRST_SHEET)
  const teamsTail = report.teams.items.slice(TEAMS_FIRST_SHEET)

  return [
    { key: 'cover', component: CeoCoverPage, props: { report } },
    {
      key: 'kpis',
      component: CeoKpisPage,
      props: { report, rows: report.kpis.slice(0, KPIS_FIRST_SHEET), intro: true },
    },
    ...(kpisTail.length
      ? [{ key: 'kpis-2', component: CeoKpisPage, props: { report, rows: kpisTail, intro: false } }]
      : []),
    { key: 'insights', component: CeoInsightsPage, props: { report } },
    {
      key: 'teams',
      component: CeoTeamsPage,
      props: { report, items: report.teams.items.slice(0, TEAMS_FIRST_SHEET), intro: true },
    },
    ...(teamsTail.length
      ? [{ key: 'teams-2', component: CeoTeamsPage, props: { report, items: teamsTail, intro: false } }]
      : []),
    { key: 'categories', component: CeoCategoriesPage, props: { report } },
    { key: 'people', component: CeoPeoplePage, props: { report } },
    { key: 'nexxtep', component: CeoNexxtepPage, props: { report } },
    { key: 'closing', component: CeoClosingPage, props: { report, part: 'summary' } },
    {
      key: 'decisions',
      component: CeoClosingPage,
      props: {
        report,
        part: 'decisions',
        onCreateTask: (decision: CeoDecision) => emit('createTask', decision),
      },
    },
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
